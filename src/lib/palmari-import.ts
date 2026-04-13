import * as XLSX from "xlsx";
import {
  normalizeDeviceStatus,
  normalizeIssuerEnabled,
  type PalmareImportRecord,
} from "@/lib/palmari";

type RawImportRow = Record<string, unknown>;

export type PalmariImportParseResult = {
  records: PalmareImportRecord[];
  failed: number;
};

function normalizeHeader(header: string) {
  return header.trim().toLowerCase();
}

function getFirstValue(row: RawImportRow, aliases: string[]) {
  const normalizedEntries = Object.entries(row).map(([key, value]) => [normalizeHeader(key), value] as const);
  for (const alias of aliases) {
    const match = normalizedEntries.find(([key]) => key === alias);
    if (match) {
      return match[1];
    }
  }

  return "";
}

function toStringValue(value: unknown) {
  return String(value ?? "").trim();
}

function mapRow(row: RawImportRow): PalmareImportRecord | null {
  const external_id = toStringValue(getFirstValue(row, ["external_id", "id"]));
  const device_name = toStringValue(getFirstValue(row, ["device_name", "descrizione"]));

  if (!external_id || !device_name) {
    return null;
  }

  return {
    external_id,
    device_name,
    default_location: toStringValue(getFirstValue(row, ["default_location", "locale"])),
    asset_code: toStringValue(getFirstValue(row, ["asset_code", "indirizzo"])),
    issuer_enabled: normalizeIssuerEnabled(
      getFirstValue(row, ["issuer_enabled", "emettitore"])
    ),
    assigned_gate: toStringValue(
      getFirstValue(row, ["assigned_gate", "varco assegnato", "varco_assegnato"])
    ),
    room: toStringValue(getFirstValue(row, ["room", "sala"])),
    status: normalizeDeviceStatus(getFirstValue(row, ["status", "stato"])),
    notes: toStringValue(getFirstValue(row, ["notes", "note"])),
  };
}

export async function parsePalmariImportFile(file: File): Promise<PalmariImportParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return { records: [], failed: 0 };
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<RawImportRow>(worksheet, { defval: "" });

  let failed = 0;
  const records: PalmareImportRecord[] = [];

  rows.forEach((row) => {
    const mapped = mapRow(row);
    if (!mapped) {
      failed += 1;
      return;
    }

    records.push(mapped);
  });

  return {
    records,
    failed,
  };
}
