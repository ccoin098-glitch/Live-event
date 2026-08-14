import { NextResponse } from "next/server";
import { z } from "zod";
import { getActivePlace, updatePreferences } from "@/lib/db";
import { getProfilePayload } from "@/lib/data/profile";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  preferencesText: z.string().max(2000).optional().default(""),
  preferenceTags: z.array(z.string()).optional().default([]),
});

export async function GET() {
  const payload = await getProfilePayload();
  return NextResponse.json(payload);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { preferencesText, preferenceTags } = parsed.data;
  const tags = Array.from(
    new Set(
      preferenceTags
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 20),
    ),
  );

  const profile = await updatePreferences({
    preferencesText,
    preferenceTags: tags,
  });
  const activePlace = await getActivePlace();

  return NextResponse.json({
    profile: {
      ...profile,
      cityOrAddress: activePlace?.cityOrAddress ?? "",
      lat: activePlace?.lat ?? null,
      lng: activePlace?.lng ?? null,
      radiusKm: activePlace?.radiusKm ?? 25,
      countryCode: activePlace?.countryCode ?? "NL",
    },
    activePlace,
  });
}
