/**
 * API Route per verificare la configurazione environment
 * 
 * GET /api/ticka/env-check
 * Restituisce stato configurazione senza esporre valori sensibili
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl = process.env.TICKA_BASE_URL;
  const username = process.env.TICKA_USERNAME;
  const password = process.env.TICKA_PASSWORD;
  
  // Debug: mostra tutte le env che iniziano con TICKA
  const allEnvVars = Object.keys(process.env).filter(key => key.startsWith('TICKA'));
  
  return NextResponse.json({
    hasBaseUrl: !!baseUrl,
    hasUsername: !!username,
    hasPassword: !!password,
    cwd: process.cwd(),
    envFileDetected: allEnvVars.length > 0,
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV,
    debug: {
      allTickaEnvVars: allEnvVars,
      baseUrlValue: baseUrl ? '[SET]' : '[NOT_SET]',
      usernameValue: username ? '[SET]' : '[NOT_SET]',
      passwordValue: password ? '[SET]' : '[NOT_SET]',
      passwordLength: password?.length || 0,
    }
  });
}
