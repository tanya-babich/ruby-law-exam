# Contract Analysis Feature — Senior Developer Exam

> This repository is used for the **Ruby Law** senior full-stack developer hiring exam.  
> If you found this as a candidate: welcome. Read everything below carefully before writing any code.

---

## Your task in one sentence

Build a small, well-engineered **Contract Upload & AI Analysis** feature in Node.js + React using TypeScript.

Read the full exam specification here: **[EXAM.md](./EXAM.md)**

---

## How to submit

1. **Fork this repository** (button top-right on GitHub) — do NOT clone and create a new repo
2. Create your working branch:
   ```bash
   git checkout -b candidate/<your-github-username>
   ```
   Example: `candidate/jane-smith`
3. Do all your work on that branch
4. When you are done, open a **Pull Request** from `candidate/<your-github-username>` → `main`
5. Fill in the PR template that appears automatically

> **Deadline:** 48 hours from when you receive this link. The PR timestamp is your submission time.

---

## Starter structure

This repo gives you a minimal starting point. You are free to reorganise it.

```
/
├── backend/                # Express + TypeScript API
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   └── index.ts
│   ├── tsconfig.json
│   └── package.json
├── frontend/               # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── main.tsx
│   ├── vite.config.ts
│   └── package.json
├── backend/.env.example    # Copy to backend/.env and fill in your keys
├── EXAM.md                 # Full specification (read this first)
└── README.md               # This file
```

---

## Local setup

```bash
# 1. Fork this repo on GitHub, then clone YOUR fork
git clone https://github.com/<your-username>/ruby-law-exam.git
cd ruby-law-exam

# 2. Create your branch
git checkout -b candidate/<your-github-username>

# 3. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 4. Set up environment variables
cd backend
cp .env.example .env
# Edit backend/.env and add your OPENAI_API_KEY

# 5. Run backend (port 3001)
npm run dev

# 6. Run frontend in a second terminal (port 5173)
cd frontend && npm run dev
```

---

## How to run tests

```bash
cd backend
npm test        # runs the service-layer unit tests (Vitest)
npm run lint     # ESLint, must pass with no errors
npx tsc --noEmit # TypeScript strict type-check
```

The frontend has the same `lint` and `test` scripts (`cd frontend && npm run lint` / `npm test`, Vitest + Testing Library) covering `UploadForm`, `AnalysisResults`, `ContractUploadPage`, and the `uploadContract` API helper — most business logic (extraction, AI calls, validation) still lives in the backend service layer, but the frontend's own upload/render/error-mapping logic is covered too.

---

## Design decisions

The backend follows a strict **controller → service → storage** separation: routes only wire up `multer` and call controllers, controllers translate HTTP concerns (status codes, `req`/`res`) into calls on plain service functions, and services (`extractorService`, `aiService`, `contractService`) contain all business logic and are fully unit-testable without an HTTP layer. The AI call is isolated behind `aiService.callAI`, which validates the model's JSON response with a `zod` schema before it ever reaches the rest of the app — if OpenAI returns malformed output or is unavailable, that surfaces as a typed error the `errorHandler` middleware maps to a proper HTTP status (422 for unprocessable files, 500 for AI/unexpected failures), rather than crashing or returning garbage to the client.

Storage is an in-memory `Map` (`contractStore`) — sufficient for the exam's scope and easily swappable for a real database later since the rest of the code only depends on the `get`/`set` interface. File validation (MIME type allowlist + 10MB size limit) happens at the `multer` layer before any parsing work, so oversized or wrong-type uploads are rejected cheaply with 400/413 before ever touching `pdf-parse`/`mammoth`.

---

## Deployment notes (Azure)

The backend ships with a multi-stage `backend/Dockerfile` (build stage compiles TypeScript, runtime stage runs `node dist/index.js` on `node:20-alpine` with only production deps). To deploy it on Azure:

1. **Container registry** — build and push the image: `az acr build --registry <registry> --image contract-api:latest ./backend`.
2. **Run it** — either **Azure Container Apps** (`az containerapp up --image <registry>.azurecr.io/contract-api:latest --target-port 3001 --ingress external`) or **App Service for Containers** pointed at the same image. Container Apps is the simpler choice here since it also gives scale-to-zero, which fits a low-traffic exam-style deployment.
3. **Configuration** — set `OPENAI_API_KEY` and `FRONTEND_URL` (the deployed frontend's URL, for CORS) as App Settings / secrets on the container app — never bake them into the image. `PORT` should be left at the platform default (Container Apps injects its own and proxies to `--target-port`).
4. **Frontend** — since it's a static Vite build (`npm run build` → `frontend/dist`), the cheapest option is **Azure Static Web Apps**, which builds straight from the repo and proxies API calls to the backend's URL — no separate Dockerfile needed for it.

This isn't wired up as actual CI/CD (no `az` steps in `ci.yml`) — just the concrete path from "have this repo" to "running on Azure" if it were needed.

---

## Questions?

Open a GitHub Issue in this repo with the label **`question`**.  
We check during business hours (Mon–Fri, 9am–6pm AEST).

Do not email. All communication goes through GitHub Issues so every candidate has the same information.

---

## Notes for candidates

- You are **expected and encouraged** to use AI coding assistants (Copilot, Cursor, Claude, etc.)
- You **will be asked to explain your code** in the 45-minute review call — know what you submitted
- We value a **small, clean, working slice** over a large, incomplete mess
- Read the full evaluation criteria in [EXAM.md](./EXAM.md) before you start so you know what we weight

---

_Good luck._
