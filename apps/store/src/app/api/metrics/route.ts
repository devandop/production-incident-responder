import { NextResponse } from "next/server";
import { drainRemoteWriteLines, prometheusText, recordCheckout } from "@/lib/metrics";
import { pushInfluxLines } from "@/lib/grafana";

export async function GET() {
  return new NextResponse(prometheusText() + "\n", {
    headers: { "Content-Type": "text/plain; version=0.0.4" },
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { ok?: boolean; latencyMs?: number };
  const ok = Boolean(body.ok);
  const latencyMs = Number(body.latencyMs ?? 0);
  recordCheckout({ ok, latencyMs });
  const pushed = await pushInfluxLines(drainRemoteWriteLines());
  return NextResponse.json({ recorded: true, ...pushed });
}
