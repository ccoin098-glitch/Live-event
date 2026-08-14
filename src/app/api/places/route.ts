import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ensureProfile,
  getActivePlace,
  listPlaces,
  upsertPlace,
} from "@/lib/db";
import { geocodeAddress } from "@/lib/geocode";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  cityOrAddress: z.string().min(1).max(200),
  radiusKm: z.number().min(1).max(200).optional().default(25),
  makeActive: z.boolean().optional().default(true),
});

export async function GET() {
  const [profile, places, active] = await Promise.all([
    ensureProfile(),
    listPlaces(),
    getActivePlace(),
  ]);

  return NextResponse.json({
    places,
    activePlaceId: active?.id ?? profile.activePlaceId,
    activePlace: active,
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { cityOrAddress, radiusKm, makeActive } = parsed.data;

  let lat: number | null = null;
  let lng: number | null = null;
  let countryCode = "NL";
  let resolvedAddress = cityOrAddress;

  try {
    const geo = await geocodeAddress(cityOrAddress);
    if (geo) {
      lat = geo.lat;
      lng = geo.lng;
      resolvedAddress = geo.displayName;
      if (geo.countryCode) countryCode = geo.countryCode;
    }
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Geocoding failed",
      },
      { status: 502 },
    );
  }

  if (lat == null || lng == null) {
    return NextResponse.json(
      { error: "Could not find that city or address. Try a clearer location." },
      { status: 400 },
    );
  }

  const place = await upsertPlace({
    cityOrAddress: resolvedAddress,
    lat,
    lng,
    countryCode,
    radiusKm,
    makeActive,
  });

  const places = await listPlaces();
  return NextResponse.json({ place, places, activePlaceId: place.id });
}
