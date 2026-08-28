import { useState } from "react";
import { AgentTrace } from "./components/AgentTrace";
import { EvidenceSummary } from "./components/EvidenceSummary";
import { PostIncidentReport } from "./components/PostIncidentReport";
import { StatusStrip } from "./components/StatusStrip";
import { TopBar } from "./components/TopBar";
import { Transcript } from "./components/Transcript";
import { useIncidentSession } from "./lib/session";

const agentName =
  import.meta.env.VITE_AGENT_NAME || "production-incident-responder";
const storeUrl = import.meta.env.VITE_STORE_URL || "http://localhost:3000";

export default function App() {
  const {
    connection,
    messages,
    trace,
    pending,
    staged,
    outcomes,
    notice,
    incidentId,
    send,
    decide,
    unstage,
    retry,
  } = useIncidentSession();
  const [reportOpen, setReportOpen] = useState(false);

  const lastAgentText =
    [...messages].reverse().find((m) => m.role === "agent")?.text ?? null;

  return (
    <div className="flex h-full flex-col">
      <TopBar
        connection={connection}
        storeUrl={storeUrl}
        onOpenReport={() => setReportOpen(true)}
        reportEnabled={trace.length > 0 || messages.length > 0}
      />
      <StatusStrip
        incidentId={incidentId}
        agentName={agentName}
        awaitingApproval={connection.status === "awaiting-approval"}
        toolCount={trace.length}
      />

      <main className="flex min-h-0 flex-1">
        <Transcript
          messages={messages}
          connection={connection}
          pending={pending}
          staged={staged}
          notice={notice}
          onSend={send}
          onDecide={decide}
          onUndo={unstage}
          onRetry={retry}
        />
        <aside className="flex w-[360px] flex-shrink-0 flex-col bg-panel">
          <AgentTrace trace={trace} />
          <EvidenceSummary
            trace={trace}
            outcomes={outcomes}
            lastAgentText={lastAgentText}
          />
        </aside>
      </main>

      {reportOpen && (
        <PostIncidentReport
          incidentId={incidentId}
          trace={trace}
          messages={messages}
          outcomes={outcomes}
          onClose={() => setReportOpen(false)}
        />
      )}
    </div>
  );
}
