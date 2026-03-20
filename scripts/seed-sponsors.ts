import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
config({ path: ".env.local" })

const sql = neon(process.env.DATABASE_URL!)
const BASE = process.env.NEXT_PUBLIC_R2_PUBLIC_URL!

const sponsors = [
  {
    name: "Ather Energy",
    logo_url: `${BASE}/sponsors/ather-energy.png`,
    website_url: "https://www.atherenergy.com",
    description: "EV innovator and partner for Ignition 1.0, enabling students to explore product development, embedded systems, and IoT.",
    tier: "premium",
    display_order: 1,
  },
  {
    name: "Xylem",
    logo_url: `${BASE}/sponsors/xylem.svg`,
    website_url: "https://www.xylem.com",
    description: "Global leader in sensors and water solutions, partnering with us and Dept. of ECE for the EmbedX 2.0 hardware challenge.",
    tier: "premium",
    display_order: 2,
  },
  {
    name: "Mahindra",
    logo_url: `${BASE}/sponsors/mahindra.png`,
    website_url: "https://www.mahindra.com",
    description: "Presenting partner for Bootstrap, showcasing flagship EVs and supporting our seniors' SAE Baja journey.",
    tier: "community",
    display_order: 3,
  },
  {
    name: "BMW Motorrad",
    logo_url: `${BASE}/sponsors/bmw-motorrad.svg`,
    website_url: "https://www.bmw-motorrad.in",
    description: "Presenting partner for Bootstrap, featuring high-performance racing bikes and the BMW CE 02 electric bike with live ride experiences.",
    tier: "community",
    display_order: 4,
  },
  {
    name: "SOLIDWORKS",
    logo_url: `${BASE}/sponsors/solidworks.svg`,
    website_url: "https://www.solidworks.com",
    description: "Trusted partner supporting our SAE Baja participation with professional software licenses and technical backing.",
    tier: "community",
    display_order: 5,
  },
]

async function seed() {
  console.log(`Seeding ${sponsors.length} sponsors...`)
  let inserted = 0
  let skipped = 0

  for (const s of sponsors) {
    const existing = await sql`SELECT id FROM sponsors WHERE name = ${s.name} LIMIT 1`
    if (existing.length > 0) {
      console.log(`  SKIP  ${s.name}`)
      skipped++
      continue
    }
    await sql`
      INSERT INTO sponsors (name, logo_url, website_url, description, tier, is_active, display_order)
      VALUES (${s.name}, ${s.logo_url}, ${s.website_url}, ${s.description}, ${s.tier}, true, ${s.display_order})
    `
    console.log(`  OK    ${s.name} (${s.tier})`)
    inserted++
  }

  console.log(`\n✅ Done! Inserted: ${inserted}  Skipped: ${skipped}`)
}

seed().catch((e) => { console.error(e); process.exit(1) })