import { NextResponse } from "next/server";
import { deletePlace, getActivePlace, listPlaces, setActivePlace } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PUT(_request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const place = await setActivePlace(id);
    const places = await listPlaces();
    return NextResponse.json({
      place,
      places,
      activePlaceId: place.id,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not select place" },
      { status: 404 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  try {
    await deletePlace(id);
    const [places, active] = await Promise.all([listPlaces(), getActivePlace()]);
    return NextResponse.json({
      ok: true,
      places,
      activePlaceId: active?.id ?? null,
      activePlace: active,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not remove place" },
      { status: 400 },
    );
  }
}
