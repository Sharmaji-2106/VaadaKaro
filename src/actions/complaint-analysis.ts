"use server";

import { auth } from "@/auth";
import { runAiTask } from "@/lib/ai";

/**
 * AI Complaint Categorization & Analysis Action
 */
export async function analyzeComplaint(title: string, description: string, department: string, category: string) {

  const prompt = `
    Analyze the following grievance for a civic-tech platform:
    Title: ${title}
    Department: ${department}
    Category: ${category}
    Description: ${description}

    Provide feedback in the following JSON format REQUIRED (no other text):
    {
      "reliabilityScore": number (0-100),
      "reliabilityLevel": "HIGH" | "MEDIUM" | "LOW",
      "feedback": "string",
      "suggestedCategory": "string",
      "missingDetails": ["string"]
    }

    Goal: Help the citizen make their complaint more actionable and detailed. 
    Assess reliability based on specific details provided (dates, locations, specific events).
  `;

  const result = await runAiTask("COMPLAINT_ANALYSIS", prompt, { json: true });

  if (result.data) {
    return result.data;
  }

  return { 
    error: result.error || "Complaint analysis service is temporarily unavailable.",
    reliabilityScore: 0,
    reliabilityLevel: "LOW",
    feedback: "Unable to analyze at this time.",
    missingDetails: []
  };
}
