# Polls App

Applicazione full-stack test / MVP 
Creazione e gestione sondaggi di valutazione (single rating) con voto medio.

---

## Stack Tecnologico

**Frontend**
- React + Vite + TypeScript
- Tailwind CSS
- React Router
- TanStack React Query

**Backend**
- Node.js + Express
- Prisma ORM
- PostgreSQL
- JSON Web Token (JWT)

**Deploy**
- Render.com (backend + frontend)
- PostgreSQL Database (Render Free Tier)

---

## Script principali

**Backend (`/backend`):**
- `pnpm dev` → avvia il server Express in modalità sviluppo con nodemon  
- `pnpm build` → compila TypeScript in JavaScript  
- `pnpm start` → avvia la build compilata in produzione  

**Frontend (`/frontend`):**
- `pnpm dev` → avvia l’app React con Vite (porta 5173)  
- `pnpm build` → genera i file statici di produzione  
- `pnpm preview` → anteprima locale della build

---

## Installazione locale

```bash

# Clona la repo
git clone https://github.com/fradevhub/polls-app.git
cd polls-app

# Setup backend
cd backend
pnpm install
cp .env.example .env
pnpm dev

# Setup frontend
cd ../frontend
pnpm install
pnpm dev