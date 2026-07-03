import { neon } from "@neondatabase/serverless";
import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// We type as 'any' here so TypeScript doesn't complain about the slight 
// internal typing differences between the two libraries. Both resolve to an array of rows.
let sql: any;

if (process.env.NODE_ENV === "development") {
  // Local Dev: Bypasses the blocked HTTP API and connects via standard TCP
  sql = postgres(process.env.DATABASE_URL);
} else {
  // Production (Vercel): Uses Neon's optimized serverless HTTP driver
  sql = neon(process.env.DATABASE_URL);
}

export { sql };