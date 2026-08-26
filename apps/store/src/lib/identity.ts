export type Identity = {
  id: string;
  name: string;
};

export const IDENTITIES: Identity[] = [
  { id: "guest", name: "Guest" },
  { id: "alice", name: "Alice" },
  { id: "bob", name: "Bob" },
];

const KEY = "forge-store-identity";

export function readIdentity(): Identity {
  if (typeof window === "undefined") return IDENTITIES[0];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return IDENTITIES[0];
    const parsed = JSON.parse(raw) as Identity;
    return IDENTITIES.find((i) => i.id === parsed.id) ?? IDENTITIES[0];
  } catch {
    return IDENTITIES[0];
  }
}

export function writeIdentity(identity: Identity) {
  localStorage.setItem(KEY, JSON.stringify(identity));
  window.dispatchEvent(new Event("forge-identity-changed"));
}
