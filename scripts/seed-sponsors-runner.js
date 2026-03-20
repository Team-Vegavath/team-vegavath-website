require("dotenv").config({ path: ".env.local" })
require("ts-node").register({ transpileOnly: true, esm: false })
require("./seed-sponsors.ts")