/**
 * Modulo server-side per l'integrazione con TickaWS API.
 *
 * Centralizza autenticazione, fetch verso Ticka e tracing di debug
 * per confrontare le richieste della webapp con i path documentati.
 */

import "server-only";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import type {
  TickaDataset,
  TickaErrorResponse,
  TickaLoginResponse,
  TickaSyncMetadata,
} from "./ticka-types";

function readRuntimeEnv(name: "TICKA_BASE_URL" | "TICKA_USERNAME" | "TICKA_PASSWORD") {
  const directProcessEnvValue = typeof process !== "undefined" ? process.env?.[name] : undefined;
  if (typeof directProcessEnvValue === "string" && directProcessEnvValue.length > 0) {
    return directProcessEnvValue;
  }

  const globalProcessEnvValue = globalThis.process?.env?.[name];
  if (typeof globalProcessEnvValue === "string" && globalProcessEnvValue.length > 0) {
    return globalProcessEnvValue;
  }

  const workerEnv = (globalThis as Record<string, unknown>).__ENV__;
  if (workerEnv && typeof workerEnv === "object") {
    const workerEnvValue = (workerEnv as Record<string, unknown>)[name];
    if (typeof workerEnvValue === "string" && workerEnvValue.length > 0) {
      return workerEnvValue;
    }
  }

  const globalValue = (globalThis as Record<string, unknown>)[name];
  return typeof globalValue === "string" && globalValue.length > 0 ? globalValue : undefined;
}

const TICKA_BASE_URL = readRuntimeEnv("TICKA_BASE_URL") || "https://ws-duemondi.ticka.it";
const TICKA_USERNAME = readRuntimeEnv("TICKA_USERNAME") || "";
const TICKA_PASSWORD = readRuntimeEnv("TICKA_PASSWORD") || "";

let tokenCache: {
  token: string | null;
  expiresAt: number | null;
} = {
  token: null,
  expiresAt: null,
};

export type TickaEndpointName =
  | "auth.login"
  | "dashboard.emissioniByDate"
  | "dashboard.riepilogoByDate"
  | "dashboard.transazioniByDate"
  | "emissioni.byDate"
  | "kpi.emissioniByDate"
  | "kpi.riepilogoByDate"
  | "kpi.transazioniByDate"
  | "dateUtils.emissioniByDate"
  | "dateUtils.riepilogoByDate"
  | "unknown";

export type TickaRequestDebugEntry = {
  endpointName: TickaEndpointName;
  method: string;
  finalUrl: string;
  path: string;
  queryParams: Record<string, string>;
  headers: Record<string, string>;
  hasAuthorizationHeader: boolean;
  hasApiVersionHeader: boolean;
  body: unknown;
  statusCode: number | null;
  responsePreview: string | null;
  matchedSwaggerPath: string | null;
  expectedSwaggerPath: string | null;
  pathVerified: boolean;
  timestamp: string;
};

type TickaFetchOptions = RequestInit & {
  endpointName?: TickaEndpointName;
  swaggerPath?: string;
};

type TickaLoginEnvelope = {
  Success?: boolean;
  Data?: Partial<TickaLoginResponse> & {
    Id?: string;
    Token?: string;
    UserName?: string;
    ExpireDate?: string;
    Validity?: string;
  };
  Error?: {
    Code?: number;
    Message?: string;
  };
};

const swaggerExpectedPaths: Partial<Record<TickaEndpointName, string>> = {
  "auth.login": "/auth/login",
  "dashboard.emissioniByDate": "/ReportEmissioni/EmissioniPerData?data={data}",
  "dashboard.riepilogoByDate": "/riepilogogiornaliero/date/data/{data}",
  "dashboard.transazioniByDate": "/logtransazioni/date/data/{data}",
  "emissioni.byDate": "/ReportEmissioni/EmissioniPerData?data={data}",
  "kpi.emissioniByDate": "/ReportEmissioni/EmissioniPerData?data={data}",
  "kpi.riepilogoByDate": "/riepilogogiornaliero/date/data/{data}",
  "kpi.transazioniByDate": "/logtransazioni/date/data/{data}",
  "dateUtils.emissioniByDate": "/ReportEmissioni/EmissioniPerData?data={data}",
  "dateUtils.riepilogoByDate": "/riepilogogiornaliero/date/data/{data}",
};

const debugRouteStore = new Map<string, TickaRequestDebugEntry>();
const debugStoreDir = path.join(process.cwd(), ".next");
const debugStorePath = path.join(debugStoreDir, "ticka-debug-routes.json");

function validateTickaConfig(): void {
  if (!TICKA_USERNAME || !TICKA_PASSWORD) {
    throw new Error(
      "Credenziali TickaWS mancanti. Configura TICKA_USERNAME e TICKA_PASSWORD nelle environment variables."
    );
  }
}

function maskAuthorizationHeader(value: string | null): string {
  if (!value) {
    return "missing";
  }

  const [scheme, token] = value.split(" ");
  if (!token) {
    return value;
  }

  const prefix = token.slice(0, 6);
  const suffix = token.slice(-4);
  return `${scheme} ${prefix}...${suffix}`;
}

function sanitizeBody(body: BodyInit | null | undefined): unknown {
  if (!body) {
    return null;
  }

  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }

  if (body instanceof URLSearchParams) {
    return Object.fromEntries(body.entries());
  }

  return "[non-serializable body]";
}

function normalizeTickaLoginResponse(rawLoginData: unknown): TickaLoginResponse {
  const envelope = rawLoginData as TickaLoginEnvelope;

  if (typeof envelope.Success === "boolean") {
    if (!envelope.Success) {
      throw new Error(
        `Login TickaWS fallito: ${envelope.Error?.Message || "Errore sconosciuto"}`
      );
    }

    rawLoginData = envelope.Data ?? {};
  }

  const loginData = rawLoginData as Partial<TickaLoginResponse> & {
    Id?: string;
    Token?: string;
    UserName?: string;
    ExpireDate?: string;
    Validity?: string;
  };

  const token = loginData.token ?? loginData.Token;
  const userName = loginData.userName ?? loginData.UserName ?? TICKA_USERNAME;
  const expireDate = loginData.expireDate ?? loginData.ExpireDate ?? "";
  const validity = loginData.validity ?? loginData.Validity ?? "";
  const id = loginData.id ?? loginData.Id ?? userName;

  if (!token) {
    throw new Error("Login TickaWS fallito: token assente nella risposta.");
  }

  return {
    id: id ?? userName,
    token,
    userName,
    expireDate,
    validity,
  };
}

function getLoginExpiryMs(loginData: TickaLoginResponse): number {
  if (loginData.validity) {
    const [hours = 0, minutes = 0, seconds = 0] = loginData.validity.split(":").map(Number);
    if ([hours, minutes, seconds].every(Number.isFinite)) {
      return (hours * 3600 + minutes * 60 + seconds) * 1000;
    }
  }

  if (loginData.expireDate) {
    const expiresAt = Date.parse(loginData.expireDate);
    if (Number.isFinite(expiresAt)) {
      return Math.max(expiresAt - Date.now(), 0);
    }
  }

  return 60 * 60 * 1000;
}

function normalizeSwaggerComparablePath(pathname: string, searchParams: URLSearchParams): string {
  if (pathname === "/ReportEmissioni/EmissioniPerData") {
    return searchParams.has("data")
      ? "/ReportEmissioni/EmissioniPerData?data={data}"
      : pathname;
  }

  if (/^\/riepilogogiornaliero\/date\/data\/[^/]+$/i.test(pathname)) {
    return "/riepilogogiornaliero/date/data/{data}";
  }

  if (/^\/logtransazioni\/date\/data\/[^/]+$/i.test(pathname)) {
    return "/logtransazioni/date/data/{data}";
  }

  return pathname;
}

function recordDebugEntry(entry: TickaRequestDebugEntry) {
  debugRouteStore.set(entry.endpointName, entry);

  try {
    mkdirSync(debugStoreDir, { recursive: true });
    writeFileSync(
      debugStorePath,
      JSON.stringify(Array.from(debugRouteStore.values()), null, 2),
      "utf8"
    );
  } catch (error) {
    console.error("[ticka] Unable to persist debug route store:", error);
  }
}

export function getTickaDebugRoutes(): TickaRequestDebugEntry[] {
  if (debugRouteStore.size === 0 && existsSync(debugStorePath)) {
    try {
      const persistedEntries = JSON.parse(readFileSync(debugStorePath, "utf8")) as TickaRequestDebugEntry[];
      for (const entry of persistedEntries) {
        debugRouteStore.set(entry.endpointName, entry);
      }
    } catch (error) {
      console.error("[ticka] Unable to read persisted debug route store:", error);
    }
  }

  return Array.from(debugRouteStore.values()).sort((a, b) =>
    a.endpointName.localeCompare(b.endpointName)
  );
}

function createNotFoundError(endpointName: TickaEndpointName, path: string, statusCode: number) {
  const error = new Error(
    `Chiamata TickaWS fallita: ${statusCode} Not Found - path non verificato per ${endpointName} (${path})`
  );
  error.name = "TickaNotFoundError";
  return error;
}

export function isTickaNotFoundError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "TickaNotFoundError" ||
      error.message.includes("404") ||
      error.message.includes("path non verificato"))
  );
}

export async function getTickaToken(): Promise<TickaLoginResponse> {
  validateTickaConfig();

  const now = Date.now();
  if (tokenCache.token && tokenCache.expiresAt && now < tokenCache.expiresAt) {
    return {
      id: "cached",
      token: tokenCache.token,
      userName: TICKA_USERNAME,
      expireDate: new Date(tokenCache.expiresAt).toISOString(),
      validity: "cached",
    };
  }

  const requestUrl = `${TICKA_BASE_URL}/auth/login`;
  const requestHeaders = {
    "Content-Type": "application/json",
    "api-version": "1",
    Accept: "application/json",
  };
  const requestBody = {
    userName: TICKA_USERNAME,
    password: TICKA_PASSWORD,
  };
  const debugRequestBody = {
    userName: TICKA_USERNAME,
    password: "[set]",
  };

  try {
    const response = await fetch(requestUrl, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(requestBody),
      cache: "no-store",
    });

    const responseClone = response.clone();
    const responsePreview = await responseClone.text().catch(() => null);

    recordDebugEntry({
      endpointName: "auth.login",
      method: "POST",
      finalUrl: requestUrl,
      path: "/auth/login",
      queryParams: {},
      headers: {
        "content-type": "application/json",
        "api-version": "1",
        accept: "application/json",
        authorization: "missing",
      },
      hasAuthorizationHeader: false,
      hasApiVersionHeader: true,
      body: debugRequestBody,
      statusCode: response.status,
      responsePreview: responsePreview ? responsePreview.slice(0, 300) : null,
      matchedSwaggerPath: "/auth/login",
      expectedSwaggerPath: "/auth/login",
      pathVerified: response.ok,
      timestamp: new Date().toISOString(),
    });

    console.log("[ticka] OUTBOUND auth.login", {
      method: "POST",
      finalUrl: requestUrl,
      path: "/auth/login",
      queryParams: {},
      headers: {
        authorization: "missing",
        "api-version": "1",
        "content-type": "application/json",
      },
      body: debugRequestBody,
      statusCode: response.status,
    });

    if (!response.ok) {
      const errorData: TickaErrorResponse = await response.json().catch(() => ({}));
      throw new Error(
        `Login TickaWS fallito: ${response.status} ${response.statusText} - ${
          errorData.message || errorData.error || "Errore sconosciuto"
        }`
      );
    }

    const loginData = normalizeTickaLoginResponse(await response.json());
    const expiryMs = getLoginExpiryMs(loginData);
    const expiresAt = Date.now() + expiryMs;

    tokenCache = {
      token: loginData.token,
      expiresAt,
    };

    return loginData;
  } catch (error) {
    console.error("Errore durante login TickaWS:", error);
    throw error;
  }
}

export async function fetchTicka<T = unknown>(
  endpoint: string,
  options: TickaFetchOptions = {}
): Promise<T> {
  const method = options.method || "GET";
  const endpointName = options.endpointName || "unknown";

  try {
    const { token } = await getTickaToken();
    const url = endpoint.startsWith("http") ? endpoint : `${TICKA_BASE_URL}${endpoint}`;
    const parsedUrl = new URL(url);

    const headers = new Headers({
      "Content-Type": "application/json",
      "api-version": "1",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    });

    if (options.headers) {
      const incomingHeaders = new Headers(options.headers);
      incomingHeaders.forEach((value, key) => {
        headers.set(key, value);
      });
    }

    const queryParams = Object.fromEntries(parsedUrl.searchParams.entries());
    const maskedAuthorization = maskAuthorizationHeader(headers.get("authorization"));
    const sanitizedBody = sanitizeBody(options.body);
    const expectedSwaggerPath = options.swaggerPath || swaggerExpectedPaths[endpointName] || null;

    console.log("[ticka] OUTBOUND request", {
      endpointName,
      method,
      finalUrl: parsedUrl.toString(),
      path: parsedUrl.pathname,
      queryParams,
      headers: {
        authorization: maskedAuthorization,
        "api-version": headers.get("api-version") || "missing",
        accept: headers.get("accept") || "missing",
        "content-type": headers.get("content-type") || "missing",
      },
      body: sanitizedBody,
    });

    const response = await fetch(parsedUrl, {
      ...options,
      method,
      headers,
      cache: options.cache || "no-store",
    });

    const clonedResponse = response.clone();
    const contentType = response.headers.get("content-type") || "";
    const responsePreviewText = await clonedResponse.text().catch(() => null);
    const matchedSwaggerPath = normalizeSwaggerComparablePath(
      parsedUrl.pathname,
      parsedUrl.searchParams
    );
    const pathVerified = expectedSwaggerPath !== null && matchedSwaggerPath === expectedSwaggerPath;

    const debugEntry: TickaRequestDebugEntry = {
      endpointName,
      method,
      finalUrl: parsedUrl.toString(),
      path: parsedUrl.pathname,
      queryParams,
      headers: {
        authorization: maskedAuthorization,
        "api-version": headers.get("api-version") || "missing",
        accept: headers.get("accept") || "missing",
        "content-type": headers.get("content-type") || "missing",
      },
      hasAuthorizationHeader: headers.has("authorization"),
      hasApiVersionHeader: headers.has("api-version"),
      body: sanitizedBody,
      statusCode: response.status,
      responsePreview: responsePreviewText ? responsePreviewText.slice(0, 300) : null,
      matchedSwaggerPath,
      expectedSwaggerPath,
      pathVerified,
      timestamp: new Date().toISOString(),
    };

    recordDebugEntry(debugEntry);

    console.log("[ticka] INBOUND response", {
      endpointName,
      statusCode: response.status,
      expectedSwaggerPath,
      matchedSwaggerPath,
      pathVerified,
      responsePreview: responsePreviewText ? responsePreviewText.slice(0, 300) : null,
    });

    if (response.status === 404) {
      throw createNotFoundError(endpointName, parsedUrl.pathname, response.status);
    }

    if (!response.ok) {
      const errorData: TickaErrorResponse = await response.json().catch(() => ({}));
      throw new Error(
        `Chiamata TickaWS fallita: ${response.status} ${response.statusText} - ${
          errorData.message || errorData.error || "Errore sconosciuto"
        }`
      );
    }

    if (contentType.includes("application/json")) {
      return (await response.json()) as T;
    }

    return (await response.text()) as T;
  } catch (error) {
    console.error(`Errore durante chiamata TickaWS ${endpointName} (${endpoint}):`, error);
    throw error;
  }
}

export async function testTickaConnection(): Promise<{
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: TickaSyncMetadata;
}> {
  try {
    const loginData = await getTickaToken();

    const testData = null;
    const recordCount = { events: 0, orders: 0, venues: 0 };

    try {
      // Hook pronto per futuri endpoint di discovery.
    } catch {
      console.log("Endpoint dati non ancora disponibile, ci basiamo sul login");
    }

    return {
      success: true,
      data: {
        login: {
          userName: loginData.userName,
          expireDate: loginData.expireDate,
          validity: loginData.validity,
        },
        testData,
      },
      metadata: {
        syncDate: new Date().toISOString(),
        recordCount,
        apiVersion: "1",
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Errore sconosciuto durante test connessione TickaWS",
    };
  }
}

export function prepareTickaDataForSupabase(rawData: unknown): TickaDataset {
  void rawData;

  return {
    events: [],
    orders: [],
    venues: [],
    lastSync: new Date().toISOString(),
  };
}

export function invalidateTickaTokenCache(): void {
  tokenCache = { token: null, expiresAt: null };
}

export function isTokenValid(): boolean {
  if (!tokenCache.token || !tokenCache.expiresAt) {
    return false;
  }

  return Date.now() < tokenCache.expiresAt;
}
