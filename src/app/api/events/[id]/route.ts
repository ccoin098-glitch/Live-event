import { NextResponse } from "next/server";
import { z } from "zod";
import { setEventGoing } from "@/lib/db";
import { getEventDetailPayload, serializeEvent } from "@/lib/data/events";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const payload = await getEventDetailPayload(id);

  if (!payload) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json(payload);
}

const patchSchema = z.object({
  isGoing: z.boolean(),
});

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const event = await setEventGoing(id, parsed.data.isGoing);
    return NextResponse.json({ event: serializeEvent(event) });
  } catch {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
}
