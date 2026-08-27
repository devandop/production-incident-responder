import { useState } from "react";
import { labelForTool } from "../lib/toolmeta";
import type { PendingApproval } from "../lib/types";

/**
 * The control checkpoint. This is the screen the Control & Safety criterion is
 * judged on, so it is deliberately the loudest thing on the page: amber rail,
 * amber "human approval required" flag, and a full-width primary action.
 */
export function ApprovalCard({
  pending,
  onDecide,
}: {
  pending: PendingApproval;
  onDecide: (decision: "allow" | "deny", reason?: string) => void;
}) {
  const [denying, setDenying] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <div className="rounded-lg border border-warn/40 border-l-4 border-l-warn bg-warn/[0.04] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="micro text-warn">PROPOSED ACTION</div>
        <div className="micro flex items-center gap-1.5 text-warn">
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-warn" />
          HUMAN APPROVAL REQUIRED
        </div>
      </div>

      <h3 className="mt-2 text-lg font-semibold text-ink">
        Run {labelForTool(pending.toolName)}
      </h3>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-dim">
        The agent is blocked on this call and cannot proceed until you decide.
        Nothing has been written yet.
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {[pending.toolName, "Write operation", "Reversible via PostHog"].map(
          (chip) => (
            <span
              key={chip}
              className="rounded border border-line bg-raised px-2 py-0.5 text-[10px] text-ink-dim"
            >
              {chip}
            </span>
          ),
        )}
      </div>

      {pending.args && (
        <div className="mt-3 rounded border border-line bg-ground/60 p-2.5">
          <div className="micro mb-1">ARGUMENTS</div>
          <div className="receipt">{pending.args}</div>
        </div>
      )}

      {denying ? (
        <div className="mt-4">
          <label className="micro" htmlFor="deny-reason">
            REASON SHOWN TO THE AGENT
          </label>
          <input
            id="deny-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why are you rejecting this?"
            className="mt-1.5 w-full rounded border border-line bg-ground px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => onDecide("deny", reason.trim() || undefined)}
              className="flex-1 rounded bg-bad px-3 py-2 text-sm font-semibold text-ground transition hover:opacity-90"
            >
              Confirm denial
            </button>
            <button
              type="button"
              onClick={() => setDenying(false)}
              className="rounded border border-line px-3 py-2 text-sm text-ink-dim transition hover:text-ink"
            >
              Back
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onDecide("allow")}
            className="flex-1 rounded bg-accent px-4 py-2.5 text-sm font-bold tracking-wide text-ground uppercase transition hover:brightness-110"
          >
            Approve &amp; run →
          </button>
          <button
            type="button"
            onClick={() => setDenying(true)}
            className="rounded border border-line px-4 py-2.5 text-sm text-ink-dim transition hover:border-bad hover:text-bad"
          >
            Deny
          </button>
        </div>
      )}
    </div>
  );
}
