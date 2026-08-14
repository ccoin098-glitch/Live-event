import { getEventsPayload } from "@/lib/data/events";
import { UpcomingView } from "./UpcomingView";

export const dynamic = "force-dynamic";

export default async function UpcomingPage() {
  const initialData = await getEventsPayload();
  return <UpcomingView initialData={initialData} />;
}
