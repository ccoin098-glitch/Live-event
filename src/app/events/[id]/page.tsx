import { notFound } from "next/navigation";
import { getEventDetailPayload } from "@/lib/data/events";
import { EventDetailView } from "./EventDetailView";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function EventDetailPage({ params }: Params) {
  const { id } = await params;
  const payload = await getEventDetailPayload(id);
  if (!payload) notFound();
  return <EventDetailView initialEvent={payload.event} />;
}
