import { config as loadEnv } from "dotenv";
import { resolve } from "path";

// Prefer .env.local for local ingest scripts
loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv({ path: resolve(process.cwd(), ".env") });

import { runDailyIngest } from "../src/lib/ingest";

async function main() {
  console.log("Starting daily ingest (Grok + Supabase)…");
  const result = await runDailyIngest();
  console.log(JSON.stringify(result, null, 2));
  if (result.status === "failed") process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
