import { GoogleGenerativeAI } from "@google/generative-ai";

// Standardize Model Names
export const AI_MODELS = {
  PRIMARY: "gemini-1.5-flash",
  FALLBACK: "gemini-1.5-pro",
};

// Logging Types
export type AiTaskType = "LEGAL_ASSISTANT" | "DOCUMENT_GENERATION" | "COMPLAINT_ANALYSIS" | "HEALTH_CHECK";

interface AiTaskResult<T> {
  data?: T;
  error?: string;
  metadata: {
    model: string;
    duration: number;
    timestamp: string;
    task: AiTaskType;
  };
}

// Global Client Init
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("[AI_INITIALIZATION_ERROR] GEMINI_API_KEY is missing in environment variables.");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

/**
 * Centalized AI Task Runner with Fallback Logic
 */
export async function runAiTask(
  taskType: AiTaskType,
  prompt: string | any[],
  options: { json?: boolean } = {}
): Promise<AiTaskResult<string | any>> {
  const startTime = Date.now();
  let currentModelName = AI_MODELS.PRIMARY;
  
  try {
    // Attempt Primary
    const result = await attemptContentGeneration(currentModelName, prompt, taskType, options);
    return result;
  } catch (primaryError: any) {
    console.error(`[AI_PRIMARY_FAILURE] Task: ${taskType} | Model: ${currentModelName} | Error:`, primaryError.message);
    
    // Attempt Fallback
    currentModelName = AI_MODELS.FALLBACK;
    console.log(`[AI_FALLBACK_ATTEMPT] Switching to ${currentModelName} for task: ${taskType}`);
    
    try {
      const result = await attemptContentGeneration(currentModelName, prompt, taskType, options);
      return result;
    } catch (fallbackError: any) {
      const duration = Date.now() - startTime;
      console.error(`[AI_CRITICAL_FAILURE] Both models failed for ${taskType}. Error:`, fallbackError.message);
      
      return {
        error: "AI service temporarily unavailable. Please try again in a few moments.",
        metadata: {
          model: currentModelName,
          duration,
          timestamp: new Date().toISOString(),
          task: taskType
        }
      };
    }
  }
}

/**
 * Single Generation Attempt
 */
async function attemptContentGeneration(
  modelName: string, 
  prompt: string | any[], 
  taskType: AiTaskType,
  options: { json?: boolean }
): Promise<AiTaskResult<any>> {
  const innerStart = Date.now();
  const model = genAI.getGenerativeModel({ model: modelName });
  
  // Handle complex prompt arrays or simple strings
  const content = Array.isArray(prompt) ? prompt : [prompt];
  const result = await model.generateContent(content);
  const responseText = result.response.text();
  
  let data = responseText;
  if (options.json) {
    try {
      const jsonStr = responseText.replace(/```json|```/g, "").trim();
      data = JSON.parse(jsonStr);
    } catch (e) {
      console.warn(`[AI_SERIALIZATION_WARNING] Failed to parse JSON for task ${taskType}. Returning raw text.`);
    }
  }

  const duration = Date.now() - innerStart;
  console.log(`[AI_SUCCESS] Task: ${taskType} | Model: ${modelName} | Duration: ${duration}ms`);

  return {
    data,
    metadata: {
      model: modelName,
      duration,
      timestamp: new Date().toISOString(),
      task: taskType
    }
  };
}
