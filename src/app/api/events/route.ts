import { NextResponse } from "next/server";
import { getEventsPayload } from "@/lib/data/events";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const payload = await getEventsPayload({
    day: searchParams.get("day"),
    category: searchParams.get("category"),
    month: searchParams.get("month"),
    placeId: searchParams.get("placeId"),
  });
  return NextResponse.json(payload);
}
