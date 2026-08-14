import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const place = await prisma.place.upsert({
    where: { id: "place_amsterdam_seed" },
    update: {},
    create: {
      id: "place_amsterdam_seed",
      label: "Amsterdam",
      cityOrAddress: "Amsterdam, Noord-Holland, Nederland",
      lat: 52.3730796,
      lng: 4.8924534,
      countryCode: "NL",
      radiusKm: 20,
    },
  });

  await prisma.userProfile.upsert({
    where: { id: "singleton" },
    update: { activePlaceId: place.id },
    create: {
      id: "singleton",
      activePlaceId: place.id,
      preferencesText: "",
      preferenceTags: "[]",
    },
  });

  const count = await prisma.event.count({ where: { placeId: place.id } });
  if (count === 0) {
    const now = new Date();
    const inHours = (h: number) => new Date(now.getTime() + h * 3600_000);

    await prisma.event.createMany({
      data: [
        {
          placeId: place.id,
          title: "Sunset Jazz on the Square",
          description:
            "As golden hour settles over City Square, a local jazz trio fills the plaza with warm brass and brushed drums. Bring a blanket, grab a drink from nearby cafés, and stay for the encore as the lights come up around the square. Free entry; tip the musicians if you can.",
          category: "Music",
          venue: "City Square",
          address: "City Square, Amsterdam",
          distanceKm: 1.2,
          startsAt: inHours(5),
          source: "llm",
          externalId: "seed-jazz-1",
          sourceUrl: "https://www.iamsterdam.com/en/see-and-do/whats-on",
        },
        {
          placeId: place.id,
          title: "Street Food Friday",
          description:
            "Street Food Friday turns Market Hall into a tasting tour — rotating stalls, regional specialties, and a live DJ set that keeps the energy up into the evening. Expect short queues for the popular trucks and plenty of seating upstairs. Perfect if you like wandering and sampling.",
          category: "Food",
          venue: "Market Hall",
          address: "Market Hall, Amsterdam",
          distanceKm: 2.4,
          startsAt: inHours(28),
          source: "llm",
          externalId: "seed-food-1",
          sourceUrl: "https://www.timeout.com/amsterdam/restaurants",
        },
        {
          placeId: place.id,
          title: "Gallery Night Walk",
          description:
            "Gallery Night Walk links indie spaces across the Arts District for one late evening of openings, short talks, and new work on the walls. Start at any participating gallery and follow the map between stops. Most venues are free; some offer a small donation bar.",
          category: "Arts",
          venue: "Arts District",
          address: "Arts District, Amsterdam",
          distanceKm: 3.1,
          startsAt: inHours(50),
          source: "ticketmaster",
          externalId: "seed-arts-1",
          sourceUrl: "https://www.ticketmaster.nl/",
        },
        {
          placeId: place.id,
          title: "Sunday Park Run",
          description:
            "Sunday Park Run is a friendly 5K along the riverside paths — no timing chips, no pressure, all paces welcome. Meet near the main fountain, warm up together, then loop the park. Dogs on leash are fine; water stations at the halfway mark.",
          category: "Sports",
          venue: "Riverside Park",
          address: "Riverside Park, Amsterdam",
          distanceKm: 4.0,
          startsAt: inHours(72),
          source: "eventbrite",
          externalId: "seed-sports-1",
          sourceUrl: "https://www.eventbrite.nl/d/netherlands--amsterdam/events/",
        },
      ],
    });
    console.log("Seeded sample events for Amsterdam");
  }

  console.log("Seeded place + profile");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
