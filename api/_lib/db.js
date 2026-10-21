import { neon } from "@neondatabase/serverless"

let db = null

/** Neon over HTTP: one round trip per query, no connection pool to manage. */
export function getDb() {
  if (!db) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error("DATABASE_URL is not set")
    const sql = neon(url)
    db = { query: (text, params = []) => sql.query(text, params) }
  }
  return db
}
