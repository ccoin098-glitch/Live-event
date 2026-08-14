import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

import { PrismaClient } from "@prisma/client";
import { runDailyIngest } from "../src/lib/ingest";
import { upsertPlace, updatePreferences } from "../src/lib/db";

const prisma = new PrismaClient();

async function main() {
  const place = await upsertPlace({
    cityOrAddress: "Amsterdam, Noord-Holland, Nederland",
    lat: 52.3730796,
    lng: 4.8924534,
    countryCode: "NL",
    radiusKm: 20,
    makeActive: true,
  });
  await updatePreferences({
    preferencesText: "jazz food markets",
    preferenceTags: ["Music", "Food"],
  });
  console.log("Active place ready:", place.label, place.id);

  const result = await runDailyIngest();
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
