'use server';

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { runAiTask } from "@/lib/ai";

export interface GeneratedDocumentsResult {
  analysis: {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    recommendedAction: string;
    category: string;
    missingEvidence: string[];
  };
  documents: {
    type: string;
    title: string;
    content: string;
  }[];
}

/**
 * AI Legal Document Generation Action
 */
export async function generateLegalDrafts(data: {
  issue: string;
  description: string;
  category?: string;
  complaintId?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const prompt = `
    You are 'VaadaLegalAI', an expert legal document generator for the Indian civic-tech platform VaadaKaro.
    Analyze the following citizen issue and generate a structured set of legal-ready documents.

    Citizen Issue: ${data.issue}
    Detailed Description: ${data.description}
    Provided Category: ${data.category || 'Not specified'}

    OUTPUT RULES:
    1. You MUST respond with ONLY a valid JSON object. No other text.
    2. Analyze the situation for RiskLevel (LOW, MEDIUM, HIGH).
    3. Generate the following document types if relevant to the situation:
       - FORMAL_COMPLAINT: A professional grievance letter.
       - GOVERNMENT_EMAIL: A concise, authoritative email to the relevant department.
       - CONSUMER_DRAFT: Specialized for consumer court/disputes.
       - POLICE_DRAFT: A formal complaint for a police station (FIR request style).
       - RTI_DRAFT: If the user needs specific information from a public authority.
       - LEGAL_SUMMARY: Plain language summary of their rights and next steps.

    4. Documents should follow Indian legal formats, using professional terminology.
    5. Include placeholders like [Your Name], [Date], [Location] where necessary.

    JSON FORMAT:
    {
      "analysis": {
        "riskLevel": "LOW | MEDIUM | HIGH",
        "recommendedAction": "Immediate / Optional / Escalation Needed - with brief explanation",
        "category": "Detected Category Name",
        "missingEvidence": ["list of documents they should gather"]
      },
      "documents": [
        { "type": "TYPE_NAME", "title": "Document Title", "content": "Full markdown formatted document content" }
      ]
    }
  `;

  const result = await runAiTask("DOCUMENT_GENERATION", prompt, { json: true });

  if (result.data) {
    const parsed = result.data as GeneratedDocumentsResult;

    // Save each document to history
    const savedDocs = await Promise.all(parsed.documents.map(async (doc) => {
      return prisma.legalDocument.create({
        data: {
          userId: (session.user as any).id,
          complaintId: data.complaintId,
          title: doc.title,
          content: doc.content,
          type: doc.type,
          category: parsed.analysis.category,
          riskLevel: parsed.analysis.riskLevel,
          analysis: JSON.stringify({
            recommendedAction: parsed.analysis.recommendedAction,
            missingEvidence: parsed.analysis.missingEvidence
          })
        }
      });
    }));

    revalidatePath('/dashboard');
    return { success: true, analysis: parsed.analysis, documents: savedDocs };
  }

  return { success: false, error: result.error || "Unable to generate legal documents currently." };
}

export async function fetchUserLegalDocs() {
  const session = await auth();
  if (!session?.user) return [];

  return prisma.legalDocument.findMany({
    where: { userId: (session.user as any).id },
    orderBy: { createdAt: 'desc' }
  });
}

export async function deleteLegalDoc(id: string) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    await prisma.legalDocument.delete({
      where: { 
        id,
        userId: (session.user as any).id
      }
    });
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error("Deletion error:", error);
    return { success: false, error: "Deletion failed or unauthorized" };
  }
}

export async function updateLegalDoc(id: string, content: string) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    await prisma.legalDocument.update({
      where: { 
        id,
        userId: (session.user as any).id
      },
      data: { content }
    });
    return { success: true };
  } catch (error) {
    console.error("Update error:", error);
    return { success: false, error: "Update failed or unauthorized" };
  }
}
