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
    body = (await request.json()) as {
      ok?: boolean;
      latencyMs?: number;
    };
  } catch {
    return NextResponse.json(
      { error: "invalid JSON body" },
      { status: 400 }
    );
  }

  const ok = Boolean(body.ok);

  if (body.latencyMs === undefined || body.latencyMs === null) {
    return NextResponse.json(
      { error: "`latencyMs` is required" },
      { status: 400 }
    );
  }

  const latencyMs = Number(body.latencyMs);

  if (!Number.isFinite(latencyMs) || latencyMs < 0) {
    return NextResponse.json(
      {
        error: "`latencyMs` must be a finite, non-negative number",
      },
      { status: 400 }
    );
  }

  recordCheckout({ ok, latencyMs });

  const lines = drainRemoteWriteLines();
  const result = await pushInfluxLines(lines);

  if (!result.pushed && result.retryable) {
    restoreRemoteWriteLines(lines);
  }

  return NextResponse.json({ recorded: true, ...result });
}