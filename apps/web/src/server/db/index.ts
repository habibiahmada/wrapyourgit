import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { requireEnv } from "../env";
import * as schema from "./schema";

type Database = PostgresJsDatabase<typeof schema>;

// One pool per server process; in dev, reuse it across hot reloads instead of leaking connections.
const globalForDb = globalThis as unknown as { wygSql?: ReturnType<typeof postgres> };
let connected: Database | undefined;

function connect(): Database {
  if (connected) return connected;
  const sql = globalForDb.wygSql ?? postgres(requireEnv("DATABASE_URL"), { max: 5 });
  if (process.env.NODE_ENV !== "production") globalForDb.wygSql = sql;
  connected = drizzle(sql, { schema });
  return connected;
}

/**
 * The database, connected on first use rather than on import. Importing it must stay free: the
 * site header imports auth, which imports this, and a production build that renders the header
 * (the 404 page, for one) has no DATABASE_URL and needs none.
 */
export const db = new Proxy({} as Database, {
  get(_target, property) {
    const database = connect();
    const value = Reflect.get(database, property, database);
    return typeof value === "function" ? value.bind(database) : value;
  },
});

export * from "./schema";
