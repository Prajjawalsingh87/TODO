import { getDb } from "./_lib/db.js"
import { createSyncHandler } from "./_lib/sync.js"

const handle = createSyncHandler({ getDb })

export const POST = handle
export const DELETE = handle
export const GET = handle // answers 405
