import { NextResponse } from "next/server";
import { loadMfApiDataset } from "@/lib/api-mf";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await loadMfApiDataset();

  return NextResponse.json(result);
}
