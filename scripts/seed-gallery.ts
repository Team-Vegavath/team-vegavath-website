import { config } from "dotenv";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

// Validate environment variables
const requiredEnvVars = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "NEXT_PUBLIC_R2_PUBLIC_URL",
  "DATABASE_URL",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Environment variable ${envVar} is not set`);
  }
}

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const R2_BUCKET = process.env.R2_BUCKET_NAME!;
const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL!;

const sql = neon(process.env.DATABASE_URL!);

/**
 * Format a folder name to a readable event label
 * Example: "ignition-1" → "Ignition 1"
 */
function formatEventLabel(folderName: string): string {
  return folderName
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Check if a URL already exists in the gallery_items table
 */
async function urlExists(url: string): Promise<boolean> {
  const result = await sql`
    SELECT id FROM gallery_items WHERE url = ${url} LIMIT 1
  `;
  return result.length > 0;
}

/**
 * Main seed function
 */
async function seedGallery() {
  console.log("🎬 Starting gallery seed script...\n");

  try {
    let command = new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      Prefix: "gallery/",
    });

    const galleryItems: Record<
      string,
      { key: string; url: string; eventLabel: string }[]
    > = {};

    console.log("📦 Fetching objects from R2...");

    // Paginate through all objects
    let isTruncated = true;
    let continuationToken: string | undefined;

    while (isTruncated) {
      const response = await r2Client.send(command);

      if (response.Contents) {
        for (const obj of response.Contents) {
          // Skip folder markers
          if (obj.Key?.endsWith("/")) {
            continue;
          }

          // Extract folder name and file name
          const parts = obj.Key!.split("/");
          if (parts.length < 3) continue; // Must be at least gallery/folder/file

          const folderName = parts[1];
          if (!folderName) continue;
          const fileName = parts.slice(2).join("/");

          // Build the R2 public URL
          const url = `${R2_PUBLIC_URL}/${obj.Key}`;
          const eventLabel = formatEventLabel(folderName);

          if (!galleryItems[folderName]) {
            galleryItems[folderName] = [];
          }

          galleryItems[folderName].push({
            key: obj.Key!,
            url,
            eventLabel,
          });

          console.log(`  ✓ Found: ${obj.Key}`);
        }
      }

      isTruncated = response.IsTruncated ?? false;
      continuationToken = response.NextContinuationToken;

      if (isTruncated && continuationToken) {
        command = new ListObjectsV2Command({
          Bucket: R2_BUCKET,
          Prefix: "gallery/",
          ContinuationToken: continuationToken,
        });
      }
    }

    console.log(`\n✅ Found ${Object.keys(galleryItems).length} event folders\n`);

    // Insert items into database
    let insertedCount = 0;
    let skippedCount = 0;

    for (const [folderName, items] of Object.entries(galleryItems)) {
      console.log(`📝 Processing folder: ${folderName} (${items.length} items)`);

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item) continue;
        const { url, eventLabel } = item;

        // Check if URL already exists (idempotent)
        const exists = await urlExists(url);
        if (exists) {
          console.log(`  ⊘ Skipped (already exists): ${url}`);
          skippedCount++;
          continue;
        }

        // Insert into database
        try {
          await sql`
            INSERT INTO gallery_items (
              event_id, event_label, type, url, thumbnail_url, caption, display_order
            ) VALUES (
              NULL, ${eventLabel}, 'image', ${url}, ${url}, '', ${i}
            )
          `;
          console.log(`  ✓ Inserted: ${url}`);
          insertedCount++;
        } catch (error) {
          console.error(`  ✗ Failed to insert ${url}:`, error);
        }
      }

      console.log("");
    }

    console.log(`\n✅ Seed complete!`);
    console.log(`   Inserted: ${insertedCount}`);
    console.log(`   Skipped: ${skippedCount}`);
  } catch (error) {
    console.error("❌ Error during seed:", error);
    process.exit(1);
  }
}

seedGallery();
