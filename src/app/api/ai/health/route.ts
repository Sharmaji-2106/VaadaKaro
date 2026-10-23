import { NextResponse } from "next/server";
import { runAiTask, AI_MODELS } from "@/lib/ai";

export async function GET() {
  try {
    const startTime = Date.now();
    
    // Simple "ping" to verify connectivity and API key
    const result = await runAiTask("HEALTH_CHECK", "Respond with ONLY 'healthy' if you are working.");
    const duration = Date.now() - startTime;

    if (result.data && result.data.toLowerCase().includes("healthy")) {
      return NextResponse.json({
        status: "healthy",
        model: result.metadata.model,
        latency: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      status: "unhealthy",
      error: "AI service returned unexpected response",
      metadata: result.metadata
    }, { status: 503 });

  } catch (error: any) {
    return NextResponse.json({
      status: "error",
      error: error.message || "Internal health check failure"
    }, { status: 500 });
  }
}
