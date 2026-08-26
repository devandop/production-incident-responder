# incident-responder skill

TrueForge loads git-backed `SKILL.md` packs on demand in the sandbox.

- Playbook: [`SKILL.md`](SKILL.md)
- Instructions for the agent spec: [`instructions.md`](instructions.md)
- Manifest: [`manifest.json`](manifest.json)
- Fixture bisect: [`fixtures/bisect_checkout.py`](fixtures/bisect_checkout.py)

Import this directory (or the GitHub repo pointing at `agent/SKILL.md`) under
**Settings → Skills**. The skill name must be `incident-responder` to match
the manifest.
