import type { TraceKind } from "./types";

/**
 * Map a raw MCP tool name onto a trace category. The agent's connectors are
 * PostHog and Grafana (see agent/manifest.json), plus TrueForge's own sandbox.
 * Unknown tools still render — they just fall back to the neutral category.
 */
export function kindForTool(toolName: string): TraceKind {
  const n = toolName.toLowerCase();
  if (n.includes("posthog") || n.includes("flag") || n.includes("insight")) {
    return "posthog";
  }
  if (n.includes("grafana") || n.includes("prometheus") || n.includes("metric")) {
    return "grafana";
  }
  if (n.includes("sandbox") || n.includes("bash") || n.includes("exec") || n.includes("file")) {
    return "sandbox";
  }
  return "message";
}

/** `posthog__update-feature-flag` → `UPDATE_FEATURE_FLAG` */
export function labelForTool(toolName: string): string {
  const tail = toolName.split(/__|\./).pop() ?? toolName;
  return tail.replace(/[-\s]/g, "_").toUpperCase();
}

export const KIND_STYLE: Record<TraceKind, { dot: string; text: string }> = {
  posthog: { dot: "bg-[#f5a524]", text: "text-[#f5a524]" },
  grafana: { dot: "bg-[#38bdf8]", text: "text-[#38bdf8]" },
  sandbox: { dot: "bg-[#a78bfa]", text: "text-[#a78bfa]" },
  approval: { dot: "bg-[#f5a524]", text: "text-[#f5a524]" },
  message: { dot: "bg-[#6b7d8f]", text: "text-[#9bacbd]" },
  lifecycle: { dot: "bg-[#34d399]", text: "text-[#34d399]" },
};

/** Pretty-print a JSON payload, falling back to the raw string. */
export function receipt(value: unknown, max = 400): string {
  let s: string;
  if (typeof value === "string") {
    s = value;
  } else {
    try {
      s = JSON.stringify(value);
    } catch {
      s = String(value);
    }
  }
  return s.length > max ? `${s.slice(0, max)}…` : s;
}
