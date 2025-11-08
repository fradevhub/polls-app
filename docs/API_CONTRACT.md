# Polls App (MVP/test) – API Contract (v1)
**Stato:** Draft stabile
**Versione:** 1.0.2
**Data:** 03-11-2025 
**Autore:** fradevhub
**Scopo:** definire il contratto FE-BE per app di sondaggi con rating singolo (1–5).

---

## Base e Sicurezza
- **Base URL (dev):** `http://localhost:8080/api`
- **Auth:** JWT Bearer in `Authorization: Bearer <token>`
- **CORS (dev):** consentire `http://localhost:5173`
- **Ruoli:** `user`, `admin`
- **Rating valido:** intero `1-5`
- **HTTPS:** obbligatorio in ambienti pubblici
- **Date:** tutte le date sono in formato ISO 8601 (UTC).

- **Health Check:** `GET /health` → `{ "status": "ok" }`

## Variabili d'ambiente (backend)
- `PORT=8080`
- `DATABASE_URL=<postgres connection string>`
- `JWT_SECRET=<strong secret>`
- `CORS_ORIGIN=http://localhost:5173`
- `NODE_ENV=development|production|test`

---


## Modelli concettuali
Lo schema reale (Prisma) deve rispettare i vincoli sotto.

### User
```json
{
  "id": "u_123",
  "email": "user@example.com",
  "passwordHash": "$bcrypt_id$...",
  "role": "user"
}
```
- Nota: nessuna registrazione via API per MVP/test (utenti creati con seed).

### Poll
```json
{
  "id": "p_123",
  "title": "Lettura",
  "description": "Quanto spesso leggi libri durante l'anno?",
  "status": "OPEN",
  "createdBy": "u_admin",
  "createdAt": "2025-11-03T19:00:00Z"
}
```
- `description` è opzionale (nullable); se assente, il campo può non comparire nella risposta.
- `createdBy` deve appartenere a un utente con ruolo admin.

### Vote
```json
{
  "id": "v_123",
  "pollId": "p_123",
  "userId": "u_123",
  "rating": 4,
  "createdAt": "2025-11-03T19:00:00Z"
}
```
- Vincolo: unique (userId, pollId)
- Regola: si può creare/aggiornare un voto solo se Poll.status = OPEN.
- Range valido per rating: intero compreso tra 1 e 5 (validazione lato backend).

### Struttura errori (uniforme)
Tutte le risposte di errore seguono questo shape:
```json
{
  "error": {
    "code": "BAD_REQUEST|UNAUTHORIZED|FORBIDDEN|NOT_FOUND|VALIDATION_ERROR|CONFLICT|RATE_LIMITED|INTERNAL",
    "message": "Human readable message"
  }
}
```
- Nota: il server può restituire BAD_REQUEST o VALIDATION_ERROR per input non valido; il significato è equivalente.
- Caso issues: il server facoltativamente può restituire `error.details.issues` (array) per fornire informazioni dettagliate sui campi non validi nel caso di VALIDATION_ERROR (Zod).


### Autenticazione

POST /auth/login

Descrizione: autentica un utente seed, restituisce JWT (no refresh token in per MVP/test).

Body

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

200 OK

```json
{
  "token": "<jwt>",
  "user": {
    "id": "u_123",
    "email": "user@example.com",
    "role": "user"
  }
}
```

401 UNAUTHORIZED

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid credentials"}
}
```

JWT claims minimi

```json
{
  "sub": "u_123",
  "role": "user",
  "iat": 1710000000,
  "exp": 1710003600
}
```
- Nota: scadenza consigliata: 60 minuti.


### Polls – User Endpoints (autenticazione richiesta)

GET /polls

Descrizione: elenco dei sondaggi + metriche, senza paginazione (MVP/test).
Query: nessuna.

200 OK

```json
{
  "items": [
    {
      "id": "p_1",
      "title": "Lettura",
      "status": "OPEN",
      "avg": 4.2,
      "count": 98,
      "userHasVoted": true
    },
    {
      "id": "p_2",
      "title": "Musica",
      "status": "CLOSED",
      "avg": 3.6,
      "count": 124,
      "userHasVoted": true
    },
    {
      "id": "p_3",
      "title": "Cinema",
      "status": "OPEN",
      "avg": 4.0,
      "count": 87,
      "userHasVoted": false
      }
  ]
}
```
- Ordinamento: per `createdAt DESC` (più recenti in alto).
- `avg` arrotondato a 1 decimale.
- `userHasVoted` indica se l’utente corrente ha già espresso un voto per il sondaggio.


GET /polls/:id

Descrizione: dettaglio sondaggio + eventuale voto espresso dall'utente + metriche.

200 OK

```json
{
  "id": "p_1",
  "title": "Lettura",
  "description": "Quanto spesso leggi libri durante l'anno?",
  "status": "OPEN",
  "avg": 4.2,
  "count": 98,
  "distribution": [
    {
      "rating": 1,
      "count": 2
    },
    {
      "rating": 2,
      "count": 5
    },
    {
      "rating": 3,
      "count": 18
    },
    {
      "rating": 4,
      "count": 40
    },
    {
      "rating": 5,
      "count": 33
    }
  ],
  "userVote": 5
}
```
- `description` è opzionale (nullable); se assente, il campo può non comparire nella risposta;

404 NOT_FOUND
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Poll not found"
  }
}
```


POST /polls/:id/vote

Descrizione: crea/aggiorna (upsert) il voto dell’utente; permessa solo se OPEN.

Body

```json
{ "rating": 4 }
```

200 OK

```json
{
  "pollId": "p_1", 
  "userId": "u_123",
  "rating": 4
}
```

400 VALIDATION_ERROR (rating fuori range)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Rating must be an integer between 1 and 5"
  }
}
```

403 FORBIDDEN (poll chiuso)

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Poll is closed"
  }
}
```

404 NOT_FOUND (poll inesistente)

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Poll not found"
  }
}
```


### Polls – Admin Endpoints (autenticazione richiesta)

POST /polls

Descrizione: crea un nuovo sondaggio, di default status=OPEN.

Body

```json
{ 
  "title": "Lettura",
  "description": "Quanto spesso leggi libri durante l'anno?",
}
```
- `description` è opzionale (nullable); se omesso verrà salvato come null o stringa vuota.

201 CREATED
Header: `Location: /api/polls/{id}`

```json
{
  "id": "p_10",
  "title": "Lettura",
  "description": "Quanto spesso leggi libri durante l'anno?",
  "status": "OPEN",
  "createdBy": "u_123",
  "createdAt": "2025-11-03T19:00:00Z"
}
```

400 VALIDATION_ERROR

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title is required"
  }
}
```

403 FORBIDDEN (utente non admin)

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Admin role required"
  }
}
```


POST /polls/:id/close

Descrizione: chiude un sondaggio (operazione irreversibile in MVP/test).

200 OK

```json
{
  "id": "p_1",
  "status": "CLOSED"
}
```

409 CONFLICT (già chiuso)

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Poll already closed"
  }
}
```

404 NOT_FOUND

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Poll not found"
  }
}
```

### Regole di autorizzazione
- /auth/login: pubblico.
- GET /polls, GET /polls/:id: user o admin
- POST /polls/:id/vote: user o admin, solo se status=OPEN
- POST /polls, POST /polls/:id/close: solo admin

### Metriche & Comportamenti
- `avg`, `count` e `distribution` sono calcolati via codice (nessuna denormalizzazione).
- `distribution` è sempre ordinata per rating crescente 1→5 (rating senza voti ha count = 0).
- `userVote` presente in GET /polls/:id se l’utente ha già votato.

Per questo MVP/test:
- Sing Up via API non previsto (utenti creati con seed).
- Non è possibile revocare un voto esrpesso per un poll.
- Il voto può essere modificato fino a quando il poll è aperto (OPEN).
- La chiusura del poll è definitiva.
- Nessuna paginazione, no refresh token.
- Internazionalizzazione (i18n) non richiesta.

### Test
Test da effettuare:
- Login OK/KO
- GET /polls (autenticato)
- Vote flow (open:ok; closed:403)
- Admin create/close (403 se non admin)

### Versionamento & Evoluzione
- Header facoltativo: X-API-Version: 1
- Breaking changes → incrementare v2 nelle rotte o nei claim.
- Futuri extra (fuori MVP/test): paginazione, ricerca, refresh token, audit log, i18n errori.

### Changelog
2025-11-03 - v1.0.0 - Prima versione stabile del contratto per MVP/test.
2025-11-03 - v1.0.1 - Aggiunti dettagli su nuovo campo description, errori, formato date e range di rating.
2025-11-04 - v1.0.2 - Aggiunte metriche di distribuzione.