# Polls App – Sicurezza e Autenticazione
Policy di sicurezza e autenticazione per il progetto Polls App (MVP/test).

Versione: 1.0.0  
Data: 03-11-2025   
Autore: fradevhub  

---

## 1. Autenticazione

### Metodo
L’applicazione utilizza autenticazione basata su token JWT (JSON Web Token).  
Non è previsto alcun refresh token o registrazione utente per MVP/test.

- **Login:**
`POST /api/auth/login`

- **Header richiesto:**  
Authorization: Bearer <token>

- **Formato token:**
JWT firmato con algoritmo HS256

- **Secret**
definito tramite variabile d’ambiente: JWT_SECRET=<strong_secret>

---

## 2. Struttura del token JWT

### Payload (claims)
```json
{
"sub": "u_123",
"role": "user",
"iat": 1710000000,
"exp": 1710003600
}
```

### Header
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

### Validità
- Durata: 60 minuti (richiede nuovo login alla scadenza)
- Clock skew: tolleranza di 30 secondi lato server
- Logout: il token scade naturalmente (nessuna blacklist prevista per MVP/test)

### Esempio
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

## 3. Ruoli e autorizzazioni
| Ruolo | Azioni consentite |
|--------|------------------|
| user   | Login, visualizzare poll, votare poll OPEN |
| admin  | Tutte le operazioni (creare e chiudere poll inclusi) |

Note: Le rotte protette validano il token e controllano il claim role prima di eseguire l’azione.

## 4. CORS
Origine consentita in sviluppo:
- CORS_ORIGIN=http://localhost:5173

Origine consigliata in produzione:
- CORS_ORIGIN=https://polls-app.example.com

Configurazione base (Express):
```js
import cors from "cors";

app.use(cors({
  origin: process.env.CORS_ORIGIN,
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false // no cookies; only Bearer token
}));
```

Note: Solo richieste autenticate con Authorization: Bearer sono ammesse alle rotte private.
Non vengono accettate chiamate cross-origin da domini non autorizzati.
Le rotte pubbliche (/auth/login) accettano le stesse origini consentite da CORS_ORIGIN.

## 5. Variabili d’ambiente correlate
| Nome          | Descrizione                           | Esempio                  |
|---------------|---------------------------------------|--------------------------|
| JWT_SECRET    | Chiave di firma HMAC per i token      | supersecret123!          |
| CORS_ORIGIN   | Origine consentita (frontend)         | http://localhost:5173    |
| PORT          | Porta server                          | 8080                     |
| NODE_ENV      | Ambiente (development o production)   | development              |

## 6. Considerazioni future (no MVP/test)
Possibile introduzione di refresh token con scadenza estesa.
Eventuale whitelist domini multipli in CORS per ambienti staging.
Rotte protette future (es. /admin/*) potranno richiedere anche claim aggiuntivi (es. permissions array).
Logging accessi e tentativi falliti potranno essere centralizzati.

Questo file definisce le regole ufficiali di sicurezza per questo MVP/test.
Ogni modifica a JWT o CORS deve essere documentata qui e riflessa nel file [API_CONTRACT.md](./API_CONTRACT.md).