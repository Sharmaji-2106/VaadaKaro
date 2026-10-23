"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { runAiTask } from "@/lib/ai";

export async function getLegalAdvice(userQuery: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const systemPrompt = `
    You are 'VaadaAI', a premium legal-tech assistant for the VaadaKaro platform.
    Your mission is to help Indian citizens understand their rights, navigate grievance procedures, 
    and provide basic legal guidance (not professional legal advice).
    
    Guidelines:
    1. Be professional, empathetic, and clear.
    2. Use simple language but maintain a premium, startup-grade tone.
    3. If asked about a grievance, guide them on how to file it on VaadaKaro.
    4. Always include a disclaimer: "This is AI-generated guidance and not a substitute for professional legal advice."
    5. Format your response with markdown for better readability.
  `;

  const result = await runAiTask("LEGAL_ASSISTANT", [systemPrompt, userQuery]);

  if (result.data) {
    // Save to history
    await prisma.aILegalHistory.create({
      data: {
        userId: (session.user as any).id,
        query: userQuery,
        response: result.data,
        legalCategory: "GENERAL_GUIDANCE",
      },
    });
    return { response: result.data };
  }

  return { error: result.error || "Failed to generate legal advice." };
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

export async function analyzeComplaint(title: string, description: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const prompt = `
    Analyze the following grievance for a civic-tech platform:
    Title: ${title}
    Description: ${description}

    Provide feedback in the following JSON format REQUIRED (no other text):
    {
      "qualityScore": number (1-10),
      "feedback": "string",
      "suggestedCategory": "string",
      "missingDetails": ["string"]
    }

    Goal: Help the citizen make their complaint more actionable and detailed.
  `;

  const result = await runAiTask("COMPLAINT_ANALYSIS", prompt, { json: true });

  if (result.data) {
    return result.data;
  }

  return { error: result.error || "Failed to analyze complaint." };
}
