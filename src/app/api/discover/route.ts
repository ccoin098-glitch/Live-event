import { NextResponse } from "next/server";
import { runDailyIngest } from "@/lib/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST() {
  try {
    const result = await runDailyIngest();
    const status =
      result.status === "failed" ? 500 : result.status === "skipped" ? 400 : 200;
    return NextResponse.json(result, { status });
  } catch (err) {
    return NextResponse.json(
      {
        status: "failed",
        eventsFound: 0,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
