import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const updates: Record<
  string,
  { description: string; address: string; sourceUrl: string }
> = {
  "seed-jazz-1": {
    description:
      "As golden hour settles over City Square, a local jazz trio fills the plaza with warm brass and brushed drums. Bring a blanket, grab a drink from nearby cafés, and stay for the encore as the lights come up around the square. Free entry; tip the musicians if you can.",
    address: "City Square, Amsterdam",
    sourceUrl: "https://www.iamsterdam.com/en/see-and-do/whats-on",
  },
  "seed-food-1": {
    description:
      "Street Food Friday turns Market Hall into a tasting tour — rotating stalls, regional specialties, and a live DJ set that keeps the energy up into the evening. Expect short queues for the popular trucks and plenty of seating upstairs. Perfect if you like wandering and sampling.",
    address: "Market Hall, Amsterdam",
    sourceUrl: "https://www.timeout.com/amsterdam/restaurants",
  },
  "seed-arts-1": {
    description:
      "Gallery Night Walk links indie spaces across the Arts District for one late evening of openings, short talks, and new work on the walls. Start at any participating gallery and follow the map between stops. Most venues are free; some offer a small donation bar.",
    address: "Arts District, Amsterdam",
    sourceUrl: "https://www.ticketmaster.nl/",
  },
  "seed-sports-1": {
    description:
      "Sunday Park Run is a friendly 5K along the riverside paths — no timing chips, no pressure, all paces welcome. Meet near the main fountain, warm up together, then loop the park. Dogs on leash are fine; water stations at the halfway mark.",
    address: "Riverside Park, Amsterdam",
    sourceUrl: "https://www.eventbrite.nl/d/netherlands--amsterdam/events/",
  },
};

async function main() {
  for (const [externalId, data] of Object.entries(updates)) {
    await prisma.event.updateMany({ where: { externalId }, data });
  }
  console.log("Updated source URLs");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
