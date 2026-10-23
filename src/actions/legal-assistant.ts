"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { runAiTask } from "@/lib/ai";

/**
 * AI Legal Consultation Action
 */
export async function getLegalAdvice(userQuery: string, isConstitutionMode: boolean = false) {
  const session = await auth();

  const systemPrompt = `
    You are VaadaKaro's AI Legal Assistant. You have deep knowledge of the Constitution of India, 
    Indian Penal Code, RTI Act, Consumer Protection Act, and state grievance laws. 
    For every legal query, cite the relevant Article or Section number.
    
    Guidelines:
    1. Be professional, empathetic, and clear.
    2. Use simple language but maintain a premium, startup-grade tone.
    3. If asked about a grievance, guide them on how to file it on VaadaKaro.
    4. Always include a disclaimer: "This is AI-generated guidance and not a substitute for professional legal advice."
    5. Format your response with markdown for better readability.
    ${isConstitutionMode ? '6. CONSTITUTION MODE IS ON: Prefix every response with the relevant constitutional articles that apply to the query.' : ''}
  `;

  const result = await runAiTask("LEGAL_ASSISTANT", [systemPrompt, userQuery]);

  if (result.data) {
    // Save to history only if logged in
    if (session?.user) {
      try {
        await prisma.aILegalHistory.create({
          data: {
            userId: (session.user as any).id,
            query: userQuery,
            response: result.data,
            legalCategory: isConstitutionMode ? "CONSTITUTIONAL" : "GENERAL_GUIDANCE",
          },
        });
      } catch (dbErr) {
        console.warn("Failed to save legal history:", dbErr);
      }
    }
    return { response: result.data };
  }

  return { error: result.error || "Unable to generate legal guidance at this time." };
}

export async function getChatHistory() {
  const session = await auth();
  if (!session?.user) return [];

  return await prisma.aILegalHistory.findMany({
    where: { userId: (session.user as any).id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
