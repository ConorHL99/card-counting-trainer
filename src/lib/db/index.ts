import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set — see .env.example");
}

// Next.js dev's module hot-reloading re-runs this file on every edit
// to any file that (transitively) imports it, which would open a new
// postgres connection pool each time without ever closing the old one
// — quickly exhausting Postgres's connection limit. Caching the client
// on `globalThis` across reloads (dev only) avoids that.
declare global {
  var __dbClient: postgres.Sql | undefined;
}

const client = globalThis.__dbClient ?? postgres(connectionString);
if (process.env.NODE_ENV !== "production") {
  globalThis.__dbClient = client;
}

export const db = drizzle(client, { schema });
export * from "./schema";
