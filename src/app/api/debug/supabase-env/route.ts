import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getUrlPreview(url: string | undefined) {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    return parsed.origin;
  } catch {
    return url.slice(0, 30);
  }
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return NextResponse.json({
    hasUrl: Boolean(url),
    hasAnonKey: Boolean(anonKey && anonKey.trim() && anonKey.trim() !== "..."),
    urlPreview: getUrlPreview(url),
    anonKeyLength: anonKey?.trim().length ?? 0,
  });
}
