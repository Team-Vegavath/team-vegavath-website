import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createMembersBulk } from "@/lib/services/team";
import type { CreateMemberInput } from "@/types/member";

// Valid values — must match the team_members CHECK constraints in
// migrations/001_initial_schema.sql exactly.
const VALID_TIERS = ["core", "crew", "legacy"] as const;
const VALID_DOMAINS = [
  "Automotive",
  "Robotics",
  "Design",
  "Media",
  "Marketing",
  "Programming",
  "Operations",
] as const;

const EXPECTED_HEADER = [
  "name",
  "role",
  "tier",
  "domain",
  "quote",
  "linkedin_url",
  "display_order",
] as const;

const MAX_ROWS = 500;

type Tier = (typeof VALID_TIERS)[number];
type Domain = (typeof VALID_DOMAINS)[number];

function isTier(value: string): value is Tier {
  return (VALID_TIERS as readonly string[]).includes(value);
}

function isDomain(value: string): value is Domain {
  return (VALID_DOMAINS as readonly string[]).includes(value);
}

// Character-level state machine rather than line splitting so quoted fields
// can contain commas AND newlines (Google Sheets quotes multi-line cells).
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let fields: string[] = [];
  let field = "";
  let inQuotes = false;

  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(field.trim());
      field = "";
    } else if (ch === "\n") {
      fields.push(field.trim());
      if (fields.some((f) => f !== "")) rows.push(fields);
      fields = [];
      field = "";
    } else {
      field += ch;
    }
  }
  fields.push(field.trim());
  if (fields.some((f) => f !== "")) rows.push(fields);
  return rows;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const text = await req.text();
  if (!text.trim()) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  }

  const rows = parseCSV(text);
  if (rows.length < 2) {
    return NextResponse.json(
      { error: "File must have a header row and at least one data row" },
      { status: 400 }
    );
  }

  const header = (rows[0] ?? []).map((h) => h.toLowerCase());
  if (EXPECTED_HEADER.some((col, i) => header[i] !== col)) {
    return NextResponse.json(
      { error: `Header row must be exactly: ${EXPECTED_HEADER.join(",")}` },
      { status: 400 }
    );
  }

  if (rows.length - 1 > MAX_ROWS) {
    return NextResponse.json(
      { error: `Too many rows — max ${MAX_ROWS} per import` },
      { status: 400 }
    );
  }

  const errors: string[] = [];
  const inputs: CreateMemberInput[] = [];

  for (let i = 1; i < rows.length; i++) {
    const [
      name = "",
      role = "",
      tier = "",
      domain = "",
      quote = "",
      linkedin_url = "",
      display_order_raw = "",
    ] = rows[i] ?? [];
    const rowNum = i + 1; // 1-indexed for user-facing messages

    if (!name) {
      errors.push(`Row ${rowNum}: name is required`);
      continue;
    }
    if (!role) {
      errors.push(`Row ${rowNum}: role is required`);
      continue;
    }
    if (!isTier(tier)) {
      errors.push(`Row ${rowNum}: tier must be core/crew/legacy (got "${tier}")`);
      continue;
    }
    if (domain && !isDomain(domain)) {
      errors.push(`Row ${rowNum}: unknown domain "${domain}"`);
      continue;
    }

    inputs.push({
      name,
      role,
      tier,
      domain: domain ? (domain as Domain) : null,
      quote: quote || null,
      linkedin_url: linkedin_url || null,
      photo_url: null,
      display_order: display_order_raw ? parseInt(display_order_raw, 10) || 0 : 0,
      is_active: true,
    });
  }

  if (errors.length > 0 && inputs.length === 0) {
    return NextResponse.json(
      { error: "Validation failed", details: errors },
      { status: 422 }
    );
  }

  try {
    const result = await createMembersBulk(inputs);
    return NextResponse.json({
      inserted: result.inserted,
      skipped: result.skipped,
      validationErrors: errors, // rows rejected before import
    });
  } catch (error) {
    console.error("[POST /api/admin/import/team]", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
