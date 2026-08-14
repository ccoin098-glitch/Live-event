import { NextResponse } from "next/server";
import { runDailyIngest } from "@/lib/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runDailyIngest();
  const status = result.status === "failed" ? 500 : 200;
  return NextResponse.json(result, { status });
}

export async function POST(request: Request) {
  return GET(request);
}
