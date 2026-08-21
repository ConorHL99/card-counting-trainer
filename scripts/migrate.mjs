// Applies any pending Drizzle migrations against DATABASE_URL — run
// automatically by docker-entrypoint.sh before the server starts (see
// DEPLOYMENT.md for how to re-run it by hand). Uses drizzle-orm's own
// migrator directly rather than the drizzle-kit CLI: drizzle-kit is a
// dev dependency, not present in the production image, and this
// migrator needs nothing beyond drizzle-orm/postgres (already
// production dependencies) plus the plain SQL files already committed
// in ./drizzle.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set — see DEPLOYMENT.md");
  process.exit(1);
}

// A single connection is deliberate here (not the app's normal pool)
// — migrations must apply strictly in order, one at a time.
const sql = postgres(connectionString, { max: 1 });
const db = drizzle(sql);

try {
  console.log("Applying database migrations...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations up to date.");
} finally {
  await sql.end();
}
