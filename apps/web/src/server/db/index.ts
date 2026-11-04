import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { requireEnv } from "../env";
import * as schema from "./schema";

// One pool per server process; in dev, reuse it across hot reloads instead of leaking connections.
const globalForDb = globalThis as unknown as { wygSql?: ReturnType<typeof postgres> };
const sql = globalForDb.wygSql ?? postgres(requireEnv("DATABASE_URL"), { max: 5 });
if (process.env.NODE_ENV !== "production") globalForDb.wygSql = sql;

export const db = drizzle(sql, { schema });
export * from "./schema";
