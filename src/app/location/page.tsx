import { getProfilePayload } from "@/lib/data/profile";
import { LocationView } from "./LocationView";

export const dynamic = "force-dynamic";

export default async function LocationPage() {
  const initialData = await getProfilePayload();
  return <LocationView initialData={initialData} />;
}
