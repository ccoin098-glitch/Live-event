import { format, startOfMonth } from "date-fns";
import { getEventsPayload } from "@/lib/data/events";
import { AgendaView } from "./AgendaView";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const monthKey = format(startOfMonth(new Date()), "yyyy-MM");
  const initialData = await getEventsPayload({ month: monthKey });
  return <AgendaView initialData={initialData} initialMonthKey={monthKey} />;
}
