# AI Website & Web Application Builder

An AI-driven platform that generates functional, responsive websites and web applications from natural-language prompts.

---

## Architecture Overview

```
kimi-project/
├── backend/                  # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── config/           # Environment validation (Zod + dotenv)
│   │   ├── controllers/      # Route controllers (Health & Generation)
│   │   ├── providers/        # AI Provider Interface & Factory (Mock, Gemini, Groq, Kimi)
│   │   ├── routes/           # Express API endpoints
│   │   ├── services/         # Generation orchestration & health checks
│   │   ├── types/            # TypeScript contracts (GeneratedProject, AIProvider)
│   │   ├── app.ts            # Express application configuration
│   │   └── server.ts         # Server entrypoint
│   ├── .env.example          # Environment variables template
│   └── package.json
│
├── frontend/                 # Next.js 14 + React + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── app/              # App Router (layout, page, global styles)
│   │   ├── components/       # UI Components (Navbar, live tabs, preview)
│   │   ├── lib/              # Backend API client
│   │   └── types/            # Shared generation types
│   ├── .env.example
│   └── package.json
└── README.md
```

---

## Phase 1 Status & Features

- **Backend Foundation**:
  - Express server with TypeScript and strict schema validation.
  - Endpoints:
    - `GET /api/generation/health`: Checks backend status and reports active AI provider health.
    - `POST /api/generation/generate`: Accepts user prompt and returns structured application code.
  - Pluggable AI provider factory pattern: Currently running in `mock` mode so development works immediately without external API keys.

- **Frontend Foundation**:
  - Next.js 14 + Tailwind CSS interface.
  - Real-time backend connectivity detection in Navbar.
  - Prompt input area with quick suggestion chips.
  - Dual-mode tabs: **Live Preview** (in an isolated sandbox) and **Code Inspector**.

---

## Quickstart

### 1. Run the Backend

```bash
cd backend
npm install
npm run dev
```

The backend starts at `http://localhost:5000`.
Health endpoint: `http://localhost:5000/api/generation/health`

### 2. Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend starts at `http://localhost:3000`.

---

## Environment Variables

### Backend (`backend/.env`)
```env
PORT=5000
NODE_ENV=development
AI_PROVIDER=mock          # Options: mock, gemini, groq, kimi
GEMINI_API_KEY=
GROQ_API_KEY=
KIMI_API_KEY=
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## Roadmap

- [x] **Phase 1: Project Foundation** (Complete)
- [ ] **Phase 2: AI Architecture & Real Providers** (Gemini & Groq integration)
- [ ] **Phase 3: Prompt Engineering & Structured JSON generation**
- [ ] **Phase 4: Multi-file project rendering & live responsive preview**
- [ ] **Phase 5: Kimi API integration**

