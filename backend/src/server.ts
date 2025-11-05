import 'dotenv/config'; // load environment variables from .env into process.env
import express from 'express';
import cors from 'cors';
import { env, assertEnv } from './config/env';
import { AppError, notFoundHandler, errorHandler } from './middlewares/error.middleware';

// import morgan from 'morgan'; // optional HTTP request logger

/* Critical environment variables checker */
assertEnv();

/* Create the Express application */
const app = express();

// Parse incoming JSON request bodies.
// Needed for POST, PUT, PATCH requests with JSON payloads.
app.use(express.json());

/* Enable CORS (Cross-Origin Resource Sharing) */
// Allow requests from the frontend running on a different origin.
// The allowed origin is read from .env (CORS_ORIGIN).
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

/* Optional HTTP request logger */
// app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

/* Health-check route to verify the API is running */
// Example access: GET /api/health → { ok: true, env: "development" }
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, env: env.NODE_ENV });
});


/* PLACEHOLDER TO ADD API ROUTES */


/* Handling 404 (Not Found) routes */
app.use(notFoundHandler);

/* Global error handling */
app.use(errorHandler);

/* Start the Express server and log connection info in the console */
app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT} (env=${env.NODE_ENV})`);
  console.log(`CORS allowed origin: ${env.CORS_ORIGIN}`);
});