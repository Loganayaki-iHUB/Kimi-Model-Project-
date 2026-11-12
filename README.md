# Kimo AI Studio

A conversational website builder for the local prototype user **loga**. Describe a website, discuss requirements, review a visual blueprint, explicitly approve the plan, then inspect the generated files and live preview.

## What works

- Persistent project sidebar, conversations, plans, generated files and version history in MongoDB.
- Requirement gathering through chat, followed by a detailed plan with pages, sections, exact colour hex codes, typography, features, responsive behaviour and proposed files.
- Stack selection: multi-page **HTML/CSS/JavaScript** or **React**. Changing the stack requires a new plan before approval.
- Explicit **Approve & build** gate enforced by the server. New requirements invalidate the previous approval.
- Actual per-file build progress: starting a file, saving its complete source, and recording its line count. Builds continue if the browser tab closes.
- Preview, read-only file inspector, copy source, desktop/tablet/mobile viewport controls and ZIP export.
- Version restoration and durable generation checkpoints. Interrupted or token-limited builds keep completed files and partial source, then offer Continue generation.
- Settings for **Gemini**, **Kimi / Moonshot**, **OpenRouter** and a no-key **Demo builder**.
- Live provider model discovery, searchable selection, manual model IDs, connection testing and saved model preferences per provider.
- Named provider/key/model connection cards, a green active indicator, AES-256-GCM encrypted storage, and an explicit eye-button reveal. Normal settings responses expose only the last four characters; the reveal endpoint returns the requested key with no-store headers. Revealed values hide after 30 seconds.

Demo mode exercises the full workflow with a deterministic starter. Connect an AI model for tailored conversations, design proposals and custom file generation.

## Local setup

Use Node.js 22+ and a running MongoDB instance.

In `backend/.env`, configure:

```env
PORT=5000
NODE_ENV=development
AI_PROVIDER=mock
MONGODB_URI=mongodb://localhost:27017/loga-kimi
FRONTEND_URL=http://localhost:3000
CREDENTIAL_ENCRYPTION_KEY=<64 hexadecimal characters>
```

Generate the encryption key once:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Keep that key stable and backed up with the database. Changing it makes previously saved credentials unreadable. A key has already been configured in this checkout's ignored `backend/.env`; existing environment values were preserved.

You can add provider keys through Settings. Environment keys (`GEMINI_API_KEY`, `KIMI_API_KEY`, `OPENROUTER_API_KEY`) are also supported. If using an environment provider as the initial default, set `AI_MODEL` or choose its model in Settings. Once settings are saved, MongoDB settings take precedence over the initial environment defaults.

Start the backend:

```powershell
cd backend
npm install
npm run dev
```

Start the frontend in another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The frontend uses `NEXT_PUBLIC_API_URL=http://localhost:5000` by default; set it in `frontend/.env.local` if needed.

## Using the builder

1. Describe your website, or choose an inspiration card and edit its prompt.
2. Answer the assistant's questions. Provide page names, features, visual preferences and colour hex codes. You can ask it to choose defaults.
3. Click **Review plan**. Review the pages, palette, layout, typography and file structure.
4. Select HTML/CSS/JavaScript or React. If you change the stack, click **Update plan for this stack**.
5. Click **Approve & build**. Follow saved file progress in Activity.
6. Explore the preview, inspect files or export the project ZIP.
7. Request changes in chat, review the revised plan, and approve the next build. Previous source is included in generation context.

Settings are available from the sidebar, top-right button or model pill in chat. Choose a provider, paste a key, fetch current models, select one, optionally test it, then save. Provider lists are fetched on provider selection when a saved key is available, and after entering a new key. No model catalogue is hardcoded.

## Architecture

```text
frontend/src/app/page.tsx              Workspace, conversation, project navigation
frontend/src/components/StudioPlan    Plan and explicit build approval
frontend/src/components/StudioPreview Multi-page HTML / React sandbox previews
frontend/src/components/StudioSettings Credentials and model selection
frontend/src/lib/studio-api.ts        Backend client
backend/src/studio/routes.ts          Workspace REST API
backend/src/studio/service.ts         Workflow, locks, builds and recovery
backend/src/studio/ai.ts              Provider calls, discovery and encryption
backend/src/studio/prompts.ts         Discovery, planning and file instructions
backend/src/studio/database.ts        MongoDB connection and initialization
backend/src/studio/demo.ts            Deterministic no-key demo
```

The backend is Express + TypeScript + MongoDB. The frontend uses Next.js 15, React 18, Tailwind/CSS, Lucide, Sandpack for React previews, and fflate for ZIP downloads. MongoDB collections are `users`, `settings` and `projects`; projects contain conversation, build events, plans, files and revisions.

Project lifecycle:

```text
discovery → planning → review → [explicit approval] → building → ready
    ↑                                                         |
    └──────────────── new requirements ───────────────────────┘
failed → review & retry → [explicit approval] → building
```

Main API routes under `/api/studio`:

| Route | Purpose |
| --- | --- |
| `GET /bootstrap` | User, database status, public settings and saved projects |
| `GET /settings`, `PUT /settings` | Read public configuration / save encrypted credentials |
| `POST /settings/models` | Fetch live models for a provider |
| `POST /settings/test` | Test the selected key and model with a short completion |
| `DELETE /settings/credentials/:provider` | Remove a saved provider key; environment keys remain available |
| `POST /projects` | Create a project |
| `GET /projects/:id` | Read saved project state and build progress |
| `POST /projects/:id/messages` | Discuss requirements |
| `POST /projects/:id/plan` | Generate a blueprint for the selected stack |
| `POST /projects/:id/build` | Begin generation; requires `{ "approved": true }` and a current reviewed plan |
| `POST /projects/:id/retry` | Return a failed build to review |
| `POST /projects/:id/restore/:version` | Restore saved source and its plan |

The old `POST /api/generation/generate` returns HTTP 410 so direct generation cannot bypass the approval workflow. Older foundation files remain for reference; the new UI uses the Studio API.

## Verification

```powershell
cd backend
npm test
npm run build
```

```powershell
cd frontend
npm run build
```

Integration tests require local MongoDB. They create and remove their own uniquely named `loga_kimi_test_*` database; they do not change `loga-kimi` or call paid models. Tests cover persistence, approval gating, input validation, concurrency locks, HTML and React builds, revisions, credential encryption, provider request contracts, interrupted work token-limit continuation, local file persistence and saved connection activation/reveal.

## Prototype scope

- This is a local, single-user prototype without passwords. The backend binds to `127.0.0.1`; authentication and deployment are separate work.
- Generated projects contain frontend source. Database-backed forms, authentication and payments inside generated websites need their own service integrations.
- HTML previews inline local styles/scripts and support navigation among generated pages inside a sandboxed iframe. React previews use Sandpack's browser bundler and require internet access.
- Build activity reports decisions and actual file operations; it does not expose private model reasoning. Progress is polled from persisted state, not simulated typing.
- Preview runtime failures are visible in the sandbox. The builder does not claim to run a full test suite against every AI-generated site.
- Live provider requests depend on model availability, key permissions, credits and connectivity. Connection testing may consume provider tokens.

Provider references: [Gemini model discovery](https://ai.google.dev/api/models), [OpenRouter model discovery](https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties), [Kimi API overview](https://www.kimi.ai/help/kimi-api/api-overview), [Sandpack](https://sandpack.codesandbox.io/docs/getting-started/usage).


## Local source files and continuation

Generated projects are written under `backend/projects/<project-heading>--<project-id>/`. The first approved heading becomes a stable folder name. Source files are atomically saved during streamed generation and mirrored in MongoDB. `PROJECT.md` describes the project; `.kimo/project.json` holds its checkpoint and `.kimo/versions/vN/` preserves completed versions. Credentials are never written into project folders. Existing generated projects are backfilled to disk on backend startup.

If generation reaches an output limit, loses its connection or the process restarts, completed files remain in place and the unfinished file is saved with `partial` status. **Continue generation** uses the approved plan, skips completed paths and asks for the missing suffix of the partial file. The provider still determines the returned continuation; inspect the result in Preview/Files as usual. You can activate another saved connection before continuing. Saved work is not rolled back when a provider fails.

New endpoints: `POST /projects/:id/continue` with `{ "approved": true }`, `POST /settings/profiles/:id/activate`, and `POST /settings/profiles/:id/reveal`. `PUT /settings` accepts an optional `name`, `profileId` for editing, and `activate: false` to save a card without switching the active model. Each key/model card is stored encrypted inside the user's MongoDB settings. Environment keys can be saved into a named encrypted card as well.

The local project folder is ignored by Git. Integration tests use a separate temporary project root and unique MongoDB test database, and remove only those test artifacts.
