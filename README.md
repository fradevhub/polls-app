# Polls App
### Creazione e gestione sondaggi di valutazione (single rating) con voto medio
Applicazione full-stack MVP/test

---

## Stack

**Backend**
- Node.js + Express + TypeScript
- Prisma ORM
- PostgreSQL
- JSON Web Token (JWT)

**Frontend**
- React + Vite + TypeScript
- Tailwind CSS
- React Router
- TanStack React Query

**Tooling / DevOps**
- pnpm
- Docker Compose (PostgreSQL)

**Deploy**
- Render.com (backend + frontend)
- PostgreSQL Database (Render free tier)

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
```
---

## Ambiente di sviluppo / test
Usare il template [.env.example](./backend/.env.example)

---

## URL locali

- **Backend API:** [http://localhost:8080/api](http://localhost:8080/api)
- **Frontend app:** [http://localhost:5173](http://localhost:5173)

---

## Script principali

**Backend (`./`)**
```bash
pnpm be:dev         # avvia il backend in modalità sviluppo dalla root

# Database locale (PostgreSQL via Docker)
pnpm db:start       # avvia DB sviluppo (porta 5432)
pnpm db:stop        # ferma DB sviluppo
pnpm db:psql        # avvia psql per DB sviluppo
pnpm db:logs        # log DB sviluppo
pnpm db:nuke        # ferma ed elimina volumi (nuke)
pnpm db:dump        # dump DB sviluppo (./.data/dump.sql)
pnpm db:restore     # restore DB sviluppo ()

pnpm db:test:start  # avvia DB test (porta 5433)
pnpm db:test:stop   # ferma DB test
pnpm db:test:psql   # avvia psql per DB test
pnpm db:test:logs   # log DB test

pnpm db:status      # stato servizi

# ORM (Prisma)
pnpm prisma:gen           # genera il client Prisma in base allo schema
pnpm prisma:migrate:init  # genera il file di migrazione SQL iniziale
pnpm prisma:migrate       # esegue le migrazioni Prisma in sviluppo
pnpm prisma:deploy        # applica le migrazioni Prisma in produzione
pnpm prisma:reset         # reset del database database di sviluppo
pnpm prisma:seed          # popola il database con dati di esempio (seed)
pnpm prisma:studio        # apre Prisma Studio (GUI per il database)

pnpm prisma:test:deploy   # applica le migrazioni Prisma in test
pnpm prisma:test:seed     # popola il database di test con dati di esempio (seed)
```

**Backend (`/backend`)**
```bash
pnpm dev      # avvia il server Express in modalità sviluppo con nodemon
pnpm build    # compila TypeScript in JavaScript
pnpm start    # avvia la build compilata in produzione
pnpm prisma   # mostra i comandi ORM (Prisma) disponibili
```

**Frontend (`./`)**
```bash
pnpm fe:dev   # avvia il frontend in modalità sviluppo dalla root
```

**Frontend (`/frontend`)**
```bash
pnpm dev      # avvia l’app React con Vite (porta 5173)
pnpm build    # genera i file statici di produzione
pnpm preview  # anteprima locale della build
```

---

## Backend API health check
```bash
curl http://localhost:8080/api/health
```
Risposta attesa
```json
{
     "ok": true,
     "env": "development"
}
```
---

## Test automatici (Supertest + Vitest)
Si includono test di conformità tra backend e contratto API.
Verifiche effettuate: autenticazione, accessi protetti e gestione dei sondaggi.

### Stack
- Vitest          - test runner e assertions
- Supertest       – richieste HTTP verso l’app Express
- Docker Compose  – database PostgreSQL isolato per i test (porta 5433)
- Prisma          – schema condiviso con l’ambiente di sviluppo

### Test inclusi
| File | Scopo principale | Test coperti |
|------|------------------|--------------|
| `tests/health.test.ts` | Verifica endpoint di salute | `GET /api/health` → 200 OK |
| `tests/auth.test.ts` | Flusso login | Login valido/errato, JWT payload |
| `tests/polls.test.ts` | Endpoint `/polls` | Lista, dettaglio, voto, creazione/chiusura poll (admin/user) |

### Script principali
```bash
pnpm db:test:start            # Avvia database test "usa e getta"
pnpm --dir backend test:e2e   # Esegue i test end-to-end (con .env.test)
pnpm db:test:stop             # Ferma e rimuove il container di test

```

### Output tipico
```bash
✓ tests/health.test.ts (1 test)
✓ tests/auth.test.ts (2 tests)
✓ tests/polls.test.ts (11 tests)

Test Files  3 passed (3)
     Tests  14 passed (14)
Duration  1.36s
```

### Note
- Deploy e seed necessari ad ogni riavvio del DB di test (DB effimero con tmpfs).
- Gli ID utente e poll provengono dal seed Prisma.
- Tutti i test usano JWT dinamici generati runtime.
- I test non dipendono dal frontend.

---

## Test manuali (Postman)
Per i test manuali delle API sono disponibili i file di importazione Postman nel folder:
`backend/postman/`

### File disponibili
- `polls-api-collection.json`
- `polls-env-local.json`

### Note
- Le richieste rispettano il contratto definito nel [Contratto API](./docs/API_CONTRACT.md)
- Gli utenti seed e i token JWT dei test automatici sono validi anche qui.

---

**Documentazione aggiuntiva**
- [Schema database (Prisma)](./backend/prisma/schema.prisma)
- [Contratto API](./docs/API_CONTRACT.md)
- [Sicurezza e autenticazione](./docs/SECURITY.md)
