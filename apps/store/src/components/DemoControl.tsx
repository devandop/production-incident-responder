"use client";

import { useEffect, useState } from "react";
import {
  readChaosKind,
  writeChaosKind,
  type ChaosKind,
} from "@/lib/incident";

const OPTIONS: { kind: ChaosKind; label: string; hint: string }[] = [
  { kind: "off", label: "Healthy", hint: "Normal checkout" },
  { kind: "timeout", label: "Timeouts", hint: "Force TimeoutError (~90%)" },
  { kind: "slow", label: "Slow gateway", hint: "~3s latency, then success" },
];

export function DemoControl() {
  const [kind, setKind] = useState<ChaosKind>("off");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const refresh = () => setKind(readChaosKind());
    refresh();
    window.addEventListener("forge-chaos-changed", refresh);
    return () => window.removeEventListener("forge-chaos-changed", refresh);
  }, []);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`rounded-full px-3 py-1.5 text-xs font-medium ${
          kind === "off"
            ? "bg-white/10 text-white hover:bg-white/20"
            : kind === "timeout"
              ? "bg-red-500 text-white"
              : "bg-amber-400 text-ink"
        }`}
      >
        Demo{kind !== "off" ? ` · ${kind}` : ""}
      </button>
      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-72 rounded-xl bg-white p-3 text-ink shadow-xl ring-1 ring-slate-200">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Incident control
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Timeouts mimic <code className="font-mono">new-checkout-v2</code> locally.
            Also enable that flag in PostHog for the full agent demo.
          </p>
          <ul className="mt-3 space-y-1">
            {OPTIONS.map((opt) => (
              <li key={opt.kind}>
                <button
                  type="button"
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                    kind === opt.kind ? "bg-ink text-white" : "hover:bg-slate-50"
                  }`}
                  onClick={() => {
                    writeChaosKind(opt.kind);
                    setKind(opt.kind);
                    setOpen(false);
                  }}
                >
                  <span className="font-medium">{opt.label}</span>
                  <span className="mt-0.5 block text-xs opacity-80">{opt.hint}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
