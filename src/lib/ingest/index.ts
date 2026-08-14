import {
  createIngestRun,
  ensureProfile,
  finishIngestRun,
  getActivePlace,
} from "@/lib/db";
import { discoverEventsWithLlm } from "@/lib/ingest/llm";
import { discoverEventsFromTicketmaster } from "@/lib/ingest/ticketmaster";
import { discoverEventsFromEventbrite } from "@/lib/ingest/eventbrite";
import { upsertDiscoveredEvents } from "@/lib/ingest/upsert";

export type IngestResult = {
  status: "success" | "failed" | "skipped";
  eventsFound: number;
  error?: string;
  runId: string;
};

export async function runDailyIngest(): Promise<IngestResult> {
  const runId = await createIngestRun();

  try {
    const [profile, place] = await Promise.all([
      ensureProfile(),
      getActivePlace(),
    ]);

    if (!place || !place.cityOrAddress.trim()) {
      await finishIngestRun(runId, {
        status: "skipped",
        error: "No active city — add a city on Location or Homepage",
      });
      return {
        status: "skipped",
        eventsFound: 0,
        error: "No active city",
        runId,
      };
    }

    const ctx = {
      placeId: place.id,
      cityOrAddress: place.cityOrAddress,
      lat: place.lat,
      lng: place.lng,
      radiusKm: place.radiusKm,
      preferencesText: profile.preferencesText,
      preferenceTags: profile.preferenceTags,
    };

    console.log(
      `[ingest] discovering near ${ctx.cityOrAddress} within ${ctx.radiusKm}km (place ${place.id})`,
    );

    const llmEvents = await discoverEventsWithLlm(ctx);
    let total = await upsertDiscoveredEvents(llmEvents, ctx);
    console.log(`[ingest] grok saved=${total}`);

    const tmEvents = await discoverEventsFromTicketmaster(ctx);
    const tmSaved = await upsertDiscoveredEvents(tmEvents, ctx);
    total += tmSaved;
    console.log(`[ingest] ticketmaster saved=${tmSaved}`);

    const ebEvents = await discoverEventsFromEventbrite(ctx);
    const ebSaved = await upsertDiscoveredEvents(ebEvents, ctx);
    total += ebSaved;
    console.log(`[ingest] eventbrite saved=${ebSaved}`);

    await finishIngestRun(runId, {
      status: "success",
      eventsFound: total,
    });

    return { status: "success", eventsFound: total, runId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await finishIngestRun(runId, {
      status: "failed",
      error: message,
    });
    return { status: "failed", eventsFound: 0, error: message, runId };
  }
}
