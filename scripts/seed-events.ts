import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
config({ path: ".env.local" })

const sql = neon(process.env.DATABASE_URL!)

const events = [
  {
    title: "Ignition 1.0",
    slug: "ignition-1",
    category: "competitions",
    status: "past",
    event_date: "2025-11-07",
    registration_open: false,
    cover_image_url: null,
    description: `## Ignition 1.0

An 18-hour IoT overnight hackathon hosted by Team Vegavath in partnership with **Ather Energy**.

Teams of up to 4 members designed and demonstrated a wearable telemetry system mountable on a rider's gear ∙ capturing and visualising movement and ride data in real time using hardware sensors paired with a mobile or web application.

### Prize Pool
- 1st Prize: ₹16,000
- 2nd Prize: ₹12,000
- Innovation Challenge: ₹7,000

### Event Details
- **Duration:** 18 hours overnight
- **Venue:** PES University, Electronic City Campus
- **Open to:** All engineering students across EC and RR campuses

### What Teams Built
Prototypes combining motion sensing (accelerometer, gyroscope, IMU), GPS tracking, wireless data transfer (BLE/Wi-Fi), and live mobile or web dashboards ∙ all mounted on actual riding gear provided at the event.

Winners received cash prizes, certificates, and an opportunity to intern at Ather Energy.`,
  },
  {
    title: "IKC '20",
    slug: "ikc-20",
    category: "competitions",
    status: "past",
    event_date: "2020-02-01",
    registration_open: false,
    cover_image_url: null,
    description: `## IKC '20 ∙ India Kart Championship 2020

Team Vegavath's participation in the **India Kart Championship 2020** ∙ one of the team's earliest competitive outings on a national stage.

The team designed, built, and raced a go-kart, competing against teams from engineering colleges across India. IKC '20 marked a defining moment in Vegavath's identity as a hands-on, build-first technical club.

This event laid the foundation for the multi-domain club Vegavath has grown into today.`,
  },
  {
    title: "Bootstrap 2025",
    slug: "bootstrap-2025",
    category: "workshops",
    status: "past",
    event_date: "2025-08-01",
    registration_open: false,
    cover_image_url: null,
    description: `## Bootstrap 2025

Vegavath's flagship annual induction and orientation event, welcoming the incoming batch of students to PESU ECC.

Bootstrap 2025 featured live showcases from **BMW Motorrad** ∙ including the BMW CE 02 electric bike with live ride experiences ∙ and **Mahindra**, presenting their flagship EV lineup. The event gave freshers a first look at the club's domains: Automotive, Robotics, Design, Media, Marketing, Programming, and Operations.

An evening of demos, domain stalls, and hands-on interactions designed to inspire students to join and contribute to Team Vegavath.`,
  },
  {
    title: "Bootstrap 2024",
    slug: "bootstrap-2024",
    category: "workshops",
    status: "past",
    event_date: "2024-09-01",
    registration_open: false,
    cover_image_url: null,
    description: `## Bootstrap 2024

The 2024 edition of Vegavath's annual induction event for incoming students at PESU ECC.

Bootstrap 2024 introduced the new batch to the club's technical domains through live demos, domain stalls, and interactions with senior members. Industry partners joined the event to showcase real-world applications of the technologies the club works with.

The event set the tone for a year of projects, competitions, and workshops across all of Vegavath's domains.`,
  },
  {
    title: "Freshers Day 2025",
    slug: "freshers-day-2025",
    category: "talks",
    status: "past",
    event_date: "2025-09-17",
    registration_open: false,
    cover_image_url: null,
    description: `## Freshers Day 2025

Vegavath's contribution to PESU ECC's Freshers Day celebrations on 17th September 2025.

The team put together a showcase and stall as part of the campus-wide welcome event for the new academic year. A chance for freshers to meet the crew, see what the club is about, and sign up for the domains that interest them.`,
  },
  {
    title: "EmbedX 2.0",
    slug: "embedx-2",
    category: "competitions",
    status: "past",
    event_date: "2025-03-01",
    registration_open: false,
    cover_image_url: null,
    description: `## EmbedX 2.0

A hardware challenge hosted by Team Vegavath in partnership with **Xylem** and the **Department of ECE, PESU ECC**.

EmbedX 2.0 challenged teams to build embedded systems solutions addressing real-world sensor and IoT problems. The event was designed to bridge the gap between classroom electronics and industry-grade hardware development.

Teams competed across problem statements involving embedded firmware, sensor integration, and live hardware demonstrations.`,
  },
]

async function seed() {
  console.log(`Seeding ${events.length} events...`)
  let inserted = 0
  let skipped = 0

  for (const e of events) {
    const existing = await sql`SELECT id FROM events WHERE slug = ${e.slug} LIMIT 1`
    if (existing.length > 0) {
      console.log(`  SKIP  ${e.title}`)
      skipped++
      continue
    }
    await sql`
      INSERT INTO events (title, slug, category, status, event_date, registration_open, cover_image_url, description)
      VALUES (${e.title}, ${e.slug}, ${e.category}, ${e.status}, ${e.event_date}, ${e.registration_open}, ${e.cover_image_url}, ${e.description})
    `
    console.log(`  OK    ${e.title}`)
    inserted++
  }

  console.log(`\nDONE. Inserted: ${inserted}  Skipped: ${skipped}`)
}

seed().catch((e) => { console.error(e); process.exit(1) })