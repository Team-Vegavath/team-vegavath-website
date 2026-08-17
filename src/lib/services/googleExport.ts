// S73K: on-demand export of an admin table into the team's Google Drive as a
// native Google Sheet.
//
// THIRD deliberate egress point (after f1.ts -> Jolpica and the Gemini summarise
// route), approved for this session. It copies f1.ts's shape rather than the
// Gemini route's: the outbound call lives in a service, every failure is caught
// and returned as data rather than thrown, and it reads as OFF when its config
// is missing. The difference from f1.ts is that the caller gets a REASON instead
// of a bare null, because an admin who just pressed a button needs to be told
// why nothing happened.
//
// The kill switch here is the absence of the env vars: no credential, no folder,
// no calls. Nothing else in the app depends on this module, so an outage or a
// revoked key degrades exactly one button and leaves the CSV download untouched.
//
// SECRET HANDLING: the service account key is read from
// GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 through process.env only, is never logged,
// and never leaves this module -- the error strings below are written by hand
// rather than derived from the Google client's exception, so a stack trace or a
// message quoting the credential can never reach an admin's screen.

import { google } from "googleapis";

import { toCsv, type ExportTable } from "@/lib/utils/exportTables";

export type GoogleExportResult =
  | { ok: true; url: string; name: string }
  | { ok: false; error: string };

// Narrowest scope that can create a file: drive.file grants access only to files
// this service account itself created, not to the rest of the Drive.
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

// Drive converts an uploaded file into a native Google editor format when the
// REQUESTED mimeType differs from the uploaded media's. Uploading text/csv and
// asking for this type is what makes the result a real Sheet rather than a .csv
// sitting unopened in the folder -- and it is why no spreadsheet-writing library
// is needed here at all.
const GOOGLE_SHEET_MIME = "application/vnd.google-apps.spreadsheet";

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
 * Upload one table to the configured Drive folder as a Google Sheet.
 *
 * Never throws. Every path returns a result the caller can render, so a Google
 * outage, a revoked key or an unshared folder cannot take down the route that
 * called it -- let alone the CSV export beside it.
 */
export async function exportTableToGoogleSheets(
  table: ExportTable
): Promise<GoogleExportResult> {
  const credentials = readCredentials();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!credentials) {
    return {
      ok: false,
      error:
        "Google Sheets export is not configured on this deployment (missing or unreadable service account credential). The CSV download still works.",
    };
  }
  if (!folderId) {
    return {
      ok: false,
      error:
        "Google Sheets export is not configured on this deployment (no target Drive folder set). The CSV download still works.",
    };
  }

  // Timestamped name, same reasoning as R2's immutable-key rule: every export is
  // a new file, so a fresh run never overwrites the one someone is already
  // working in.
  const name = `${table.name}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}`;

  try {
    const auth = new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
    const drive = google.drive({ version: "v3", auth });

    const res = await drive.files.create({
      requestBody: {
        name,
        mimeType: GOOGLE_SHEET_MIME, // target format -- triggers the conversion
        parents: [folderId],
      },
      media: {
        mimeType: "text/csv", // what is actually being uploaded
        body: toCsv(table),
      },
      fields: "id, webViewLink",
    });

    const url = res.data.webViewLink;
    if (!url) {
      return {
        ok: false,
        error: "Google accepted the upload but returned no link. Check the Drive folder directly.",
      };
    }
    return { ok: true, url, name };
  } catch (error) {
    // The message is logged for the operator but never returned to the browser,
    // and the returned copy is a fixed string: Google's own errors can echo
    // request context, and this request carries a signed credential.
    console.error("[googleExport] Drive upload failed", error);
    return {
      ok: false,
      error:
        "Google Drive rejected the upload. Check that the Drive API is enabled and that the target folder is shared with the service account. The CSV download still works.",
    };
  }
}
