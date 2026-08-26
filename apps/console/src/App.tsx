const agentName =
  import.meta.env.VITE_AGENT_NAME || "production-incident-responder";
const storeUrl = import.meta.env.VITE_STORE_URL || "http://localhost:3000";
const trueforgeOrigin =
  import.meta.env.VITE_TRUEFORGE_ORIGIN || "http://localhost:8790";

export default function App() {
  return (
    <div className="shell">
      <header className="chrome">
        <div>
          <strong>Incident console</strong>
          <span className="muted">
            {" "}
            · agent <code>{agentName}</code>
          </span>
        </div>
        <nav>
          <a href={storeUrl} target="_blank" rel="noreferrer">
            Forge Store
          </a>
          <a href={trueforgeOrigin} target="_blank" rel="noreferrer">
            TrueForge :8790
          </a>
        </nav>
      </header>
      <iframe
        className="chat-frame"
        title="TrueForge chat"
        src={trueforgeOrigin}
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
