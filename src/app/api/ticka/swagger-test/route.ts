/**
 * API Route per testare accesso a Swagger e trovare endpoint
 */

import { NextResponse } from "next/server";
import { getTickaToken } from "@/lib/ticka";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Prima testiamo il login per avere un token valido
    const loginData = await getTickaToken();
    
    // URL Swagger comuni da testare
    const swaggerUrls = [
      `${process.env.TICKA_BASE_URL || "https://ws-duemondi.ticka.it"}/swagger`,
      `${process.env.TICKA_BASE_URL || "https://ws-duemondi.ticka.it"}/swagger-ui`,
      `${process.env.TICKA_BASE_URL || "https://ws-duemondi.ticka.it"}/api/docs`,
      `${process.env.TICKA_BASE_URL || "https://ws-duemondi.ticka.it"}/docs`,
      `${process.env.TICKA_BASE_URL || "https://ws-duemondi.ticka.it"}/swagger.json`,
      `${process.env.TICKA_BASE_URL || "https://ws-duemondi.ticka.it"}/openapi.json`,
      `${process.env.TICKA_BASE_URL || "https://ws-duemondi.ticka.it"}/swagger/v1/swagger.json`,
    ];

    const results = [];

    for (const url of swaggerUrls) {
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Accept": "text/html,application/json",
          },
        });

        const contentType = response.headers.get("content-type") || "";
        const isHtml = contentType.includes("text/html");
        const isJson = contentType.includes("application/json");

        results.push({
          url,
          status: response.status,
          success: response.ok,
          contentType,
          isHtml,
          isJson,
          isSwagger: isHtml || isJson,
        });
      } catch (error) {
        results.push({
          url,
          status: 0,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Testiamo anche se c'è una pagina root che mostra i percorsi
    try {
      const rootResponse = await fetch(process.env.TICKA_BASE_URL || "https://ws-duemondi.ticka.it", {
        method: "GET",
        headers: {
          "Accept": "text/html,application/json",
        },
      });

      results.push({
        url: process.env.TICKA_BASE_URL || "https://ws-duemondi.ticka.it",
        status: rootResponse.status,
        success: rootResponse.ok,
        contentType: rootResponse.headers.get("content-type") || "",
        isRoot: true,
      });
    } catch (error) {
      results.push({
        url: process.env.TICKA_BASE_URL || "https://ws-duemondi.ticka.it",
        status: 0,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        isRoot: true,
      });
    }

    return NextResponse.json({
      success: true,
      login: {
        userName: loginData.userName,
        tokenValid: !!loginData.token,
        expireDate: loginData.expireDate,
      },
      swaggerResults: results,
      workingSwaggerUrls: results.filter(r => r.success && (r.isHtml || r.isJson)),
      recommendations: {
        tryUrls: results.filter(r => r.success).map(r => r.url),
        checkScreenshots: [
          "Visita: https://ws-duemondi.ticka.it/swagger",
          "Visita: https://ws-duemondi.ticka.it/swagger-ui", 
          "Visita: https://ws-duemondi.ticka.it/docs",
          "Cerca sezioni: Events, Orders, Tickets, Reports, Statistics",
          "Cerca metodi: GET, POST con path come /events, /orders, /tickets",
        ]
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Errore durante test Swagger",
      },
      { status: 500 }
    );
  }
}
