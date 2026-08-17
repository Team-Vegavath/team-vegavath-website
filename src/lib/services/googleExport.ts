// S73K / S74A: on-demand export of an admin table into the team's Google Sheet.
//
// THIRD deliberate egress point (after f1.ts -> Jolpica and the Gemini summarise
// route). It copies f1.ts's shape rather than the Gemini route's: the outbound
// call lives in a service, every failure is caught and returned as data rather
// than thrown, and it reads as OFF when its config is missing. The difference
// from f1.ts is that the caller gets a REASON instead of a bare null, because an
// admin who just pressed a button needs to be told why nothing happened.
//
// S74A -- WHY THIS NO LONGER CREATES A FILE. S73K uploaded a CSV to the Drive
// API asking for a Sheets mimeType so Drive would convert it. That can never
// work with a service account. Per Google's Drive documentation: "If the
// application authenticates using a Service Account, the Service Account is the
// file owner... Service accounts don't have storage quota and can't own any
// files." Every create returned 403 storageQuotaExceeded, on a .pes.edu
// Workspace account and a personal Gmail account alike, because the owner of the
// target FOLDER is irrelevant -- the would-be owner of the new FILE is the
// service account, and it cannot own one.
//
// So nothing is created any more. A human owns one spreadsheet
// ("Vegavath_Exports") and has shared it with the service account as Editor;
// this module only ever writes cells into a tab of that existing file. Editing a
// file you do not own is not subject to the storage-quota rule at all -- that
// rule fires on creation only.
//
// The kill switch is still the absence of the env vars: no credential, no
// spreadsheet id, no calls. Nothing else in the app depends on this module, so
// an outage or a revoked key degrades exactly one button and leaves the CSV
// download untouched -- the CSV routes do not import this file.
//
// SECRET HANDLING: the service account key is read from
// GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 through process.env only and is never
// logged. S74A DOES now return Google's own error text (see googleErrorText),
// reversing S73K's hand-written messages -- but only the structured
// error.code / .status / .message fields Google returns, never the raw
// exception, whose request config carries the signed credential.

import { google } from "googleapis";

import type { ExportTable } from "@/lib/utils/exportTables";

export type GoogleExportResult =
  | { ok: true; url: string; name: string }
  | { ok: false; error: string };

// S74A: was drive.file, which only ever grants access to files the service
// account itself created. The target sheet was created by a human and shared in,
// so that scope can never see it. This is the read/write scope for spreadsheets
// the account has been granted access to -- and it is Sheets-only: it confers no
// ability to browse, create or delete anything else in anyone's Drive.
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

function readCredentials(): { client_email: string; private_key: string } | null {
  const encoded = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;
  if (!encoded) return null;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"));
    if (!parsed?.client_email || !parsed?.private_key) return null;
    return { client_email: parsed.client_email, private_key: parsed.private_key };
  } catch {
    // Deliberately swallows the parse error rather than logging it: the input is
    // the secret, and a JSON parse failure message can quote the input.
    return null;
  }
}

/**
 * S74A: Google's own words about what went wrong, and nothing else.
 *
 * S73K returned a hand-written sentence on every failure. That is what hid
 * `403 storageQuotaExceeded` for an entire debugging session and sent the
 * investigation off to swap Google accounts, which was never going to help. The
 * real code and reason are worth far more to whoever is standing at the admin
 * panel than a reassuring generic line.
 *
 * Only the STRUCTURED fields are read. The raw GaxiosError also carries
 * `.config`, which includes the outgoing request's Authorization header, so the
 * exception itself must never be stringified into a response.
 */
function googleErrorText(error: unknown): string {
  const err = error as {
    message?: string;
    status?: number;
    response?: {
      data?: {
        error?: {
          code?: number;
          message?: string;
          status?: string;
          errors?: { reason?: string; message?: string }[];
        };
      };
    };
  };

  const api = err?.response?.data?.error;
  if (api?.message) {
    const code = api.code ?? err.status;
    // `reason` is where the actionable token lives (storageQuotaExceeded,
    // notFound, forbidden); `status` is the coarse enum (PERMISSION_DENIED).
    const reason = api.errors?.[0]?.reason ?? api.status;
    return [code ? `${code}` : null, reason, api.message]
      .filter(Boolean)
      .join(" ");
  }
  if (err?.message) return err.message;
  return "Unknown error from the Google API.";
}

// A1 notation: a bare tab name refers to the whole tab. Single quotes inside a
// title are escaped by doubling them.
const a1Tab = (title: string) => `'${title.replace(/'/g, "''")}'`;

/**
 * Overwrite one tab of the configured spreadsheet with one table.
 *
 * Never throws. Every path returns a result the caller can render, so a Google
 * outage, a revoked key or an unshared spreadsheet cannot take down the route
 * that called it -- let alone the CSV export beside it.
 *
 * Overwrite, not append: the CSV download is a complete current snapshot every
 * time it is pressed, and these two destinations are meant to agree.
 */
export async function exportTableToGoogleSheets(
  table: ExportTable
): Promise<GoogleExportResult> {
  const credentials = readCredentials();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!credentials) {
    return {
      ok: false,
      error:
        "Google Sheets export is not configured on this deployment (missing or unreadable service account credential). The CSV download still works.",
    };
  }
  if (!spreadsheetId) {
    return {
      ok: false,
      error:
        "Google Sheets export is not configured on this deployment (GOOGLE_SHEETS_SPREADSHEET_ID is not set). The CSV download still works.",
    };
  }

  const tab = table.tab;

  try {
    const auth = new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
    const sheets = google.sheets({ version: "v4", auth });

    // 1. Does the tab exist? A metadata read rather than a write-and-parse-the-
    //    error attempt: it is one cheap call, it answers deterministically
    //    instead of by string-matching a message Google may reword, and when the
    //    spreadsheet is missing or was never shared with the service account it
    //    fails HERE, with the real 404/403, before anything has been written.
    const meta = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "spreadsheetUrl,sheets.properties(sheetId,title)",
    });

    const existing = meta.data.sheets?.find((s) => s.properties?.title === tab);
    let sheetId = existing?.properties?.sheetId ?? null;

    // 2. First export of a dataset type: add the tab. Only reached once per
    //    dataset, ever.
    if (!existing) {
      const added = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: [{ addSheet: { properties: { title: tab } } }] },
      });
      sheetId = added.data.replies?.[0]?.addSheet?.properties?.sheetId ?? null;
    } else {
      // 3. Clear first. values.update only touches the cells inside the range it
      //    writes, so without this a run with fewer rows than the previous one
      //    leaves the old tail behind and the tab reads as a mix of two exports.
      //    A bare tab name in A1 notation clears the whole tab.
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: a1Tab(tab),
        requestBody: {},
      });
    }

    // 4. Write. RAW, not USER_ENTERED: USER_ENTERED parses each cell the way the
    //    Sheets UI would, so a field beginning with "=" or "+" becomes a live
    //    formula. These rows are applicant-supplied free text, so that is a
    //    formula-injection hole. RAW stores every cell as the literal string.
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${a1Tab(tab)}!A1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [
          table.headers,
          ...table.rows.map((row) => row.map((cell) => cell ?? "")),
        ],
      },
    });

    const base = meta.data.spreadsheetUrl ?? `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
    // Deep link straight to the tab that was just written, not the file's first
    // tab, so OPEN SHEET lands on what the admin actually exported.
    const url = sheetId === null ? base : `${base}#gid=${sheetId}`;

    return { ok: true, url, name: tab };
  } catch (error) {
    console.error("[googleExport] Sheets write failed", error);
    return {
      ok: false,
      error: `Google Sheets rejected the write: ${googleErrorText(error)} -- check that the Sheets API is enabled and that the spreadsheet is shared with the service account as an Editor. The CSV download still works.`,
    };
  }
}
