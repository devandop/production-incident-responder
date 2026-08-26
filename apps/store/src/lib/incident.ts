export type ChaosKind = "off" | "timeout" | "slow";

const CHAOS_KEY = "forge-store-chaos";
const KIND_KEY = "forge-store-chaos-kind";

export function readChaosKind(): ChaosKind {
  if (typeof window === "undefined") return "off";
  const kind = localStorage.getItem(KIND_KEY);
  if (kind === "timeout" || kind === "slow" || kind === "off") return kind;
  return localStorage.getItem(CHAOS_KEY) === "1" ? "timeout" : "off";
}

/** True when the buggy timeout path should run (Chaos timeouts or legacy flag). */
export function readChaosMode(): boolean {
  return readChaosKind() === "timeout";
}

export function readSlowMode(): boolean {
  return readChaosKind() === "slow";
}

export function writeChaosKind(kind: ChaosKind) {
  localStorage.setItem(KIND_KEY, kind);
  localStorage.setItem(CHAOS_KEY, kind === "timeout" ? "1" : "0");
  window.dispatchEvent(new Event("forge-chaos-changed"));
}

export function writeChaosMode(enabled: boolean) {
  writeChaosKind(enabled ? "timeout" : "off");
}
