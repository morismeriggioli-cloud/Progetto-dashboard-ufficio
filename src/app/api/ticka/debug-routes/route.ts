import { NextResponse } from "next/server";
import { getTickaDebugRoutes } from "@/lib/ticka";

export const dynamic = "force-dynamic";

export async function GET() {
  const routes = getTickaDebugRoutes().map((entry) => ({
    endpointName: entry.endpointName,
    method: entry.method,
    finalUrl: entry.finalUrl,
    hasAuthorizationHeader: entry.hasAuthorizationHeader,
    hasApiVersionHeader: entry.hasApiVersionHeader,
    statusCode: entry.statusCode,
    responsePreview: entry.responsePreview,
  }));

  return NextResponse.json({
    success: true,
    routes,
    timestamp: new Date().toISOString(),
  });
}
