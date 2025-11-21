/* Express */
import express from 'express';

/* CORS */
import cors from 'cors';

/* App modules */
import { env, assertEnv } from './config/env';
import { requireAuth } from './middlewares/auth.guard';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware';

/* API Routes */
import authRouter from './modules/auth/auth.routes';
import pollsRouter from './routes/polls.routes';

// import morgan from 'morgan'; // optional HTTP request logger


/* Critical environment variables checker */
assertEnv();

/* Create the Express application */
const app = express();

/* Behind Cloudflare/Render proxies (trust X-Forwarded-* headers) */
app.set('trust proxy', 1);

/* Do not expose Express signature */
app.disable('x-powered-by');

/* Parse incoming JSON request bodies */
// Needed for POST, PUT, PATCH requests with JSON payloads.
app.use(express.json());

/* Enable CORS (Cross-Origin Resource Sharing) */
// Allow requests from the frontend running on a different origin.
// The allowed origin is read from .env (CORS_ORIGIN).
// Support CSV in CORS_ORIGIN (e.g., "https://fe1,https://fe2").
const allowedOrigins = (env.CORS_ORIGIN ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const corsMw = cors({
  origin: (origin, cb) => {
    // allow tools without Origin (curl/Postman/health)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true, // keep true for cookies; fine also with Bearer
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,    // 24h preflight cache
  optionsSuccessStatus: 204
});

app.use(corsMw);


/* Optional HTTP request logger */
// app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));


/* Health-check route to verify the API is running */
// Example access: GET /api/health → { ok: true, env: "development" }
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, env: env.NODE_ENV });
});


/* Auth route */
app.use('/api/auth', authRouter);

/* Polls routes (auth required) */
app.use('/api/polls', requireAuth, pollsRouter);

/* Handling 404 (Not Found) routes */
app.use(notFoundHandler);

/* Global error handling */
app.use(errorHandler);


/* Start the Express server and log connection info in the console */
app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT} (env=${env.NODE_ENV})`);
  console.log(`CORS allowed origins: ${allowedOrigins.join(', ') || '(none)'}`);
});