# Incident console

Custom chrome around the **running TrueForge chat** (`http://localhost:8790`).

`@truefoundry/trueforge-ui` 0.2.4 currently crashes under React 19
(`getSnapshot` / max update depth). Until that is fixed upstream, this app
**embeds** TrueForge’s own UI in an iframe so Approve / Connect / questions
still work.

This folder does **not** run the agent. TrueForge must be on **8790**.

## Run

1. `npx @truefoundry/trueforge` → `http://localhost:8790`
2. Save agent `production-incident-responder`
3. `cd apps/console && npm run dev` → **http://localhost:3001**

Customize the header in `src/App.tsx`. Change `VITE_TRUEFORGE_ORIGIN` if the harness is not on 8790.
