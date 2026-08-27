import { NextResponse } from "next/server";
import {
  drainRemoteWriteLines,
  prometheusText,
  recordCheckout,
  restoreRemoteWriteLines,
} from "@/lib/metrics";
import { pushInfluxLines } from "@/lib/grafana";

export async function GET() {
  return new NextResponse(prometheusText() + "\n", {
    headers: { "Content-Type": "text/plain; version=0.0.4" },
  });
}

export async function POST(request: Request) {
  let body: { ok?: boolean; latencyMs?: number };
  try {
    body = (await request.json()) as { ok?: boolean; latencyMs?: number };
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const ok = Boolean(body.ok);
  // A non-numeric latency would otherwise poison the running average with NaN
  // for the lifetime of the process.
  const parsedLatency = Number(body.latencyMs ?? 0);
  const latencyMs =
    Number.isFinite(parsedLatency) && parsedLatency >= 0 ? parsedLatency : 0;

  recordCheckout({ ok, latencyMs });

  const lines = drainRemoteWriteLines();
  const result = await pushInfluxLines(lines);
  if (!result.pushed && result.retryable) {
    restoreRemoteWriteLines(lines);
  }

  return NextResponse.json({ recorded: true, ...result });
}
