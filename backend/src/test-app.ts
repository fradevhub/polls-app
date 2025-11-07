/* Express */
import express from 'express';

/* CORS */
import cors from 'cors';

/* App modules */
import { env, assertEnv } from './config/env';
import authRouter from "./modules/auth/auth.routes";
import pollsRouter from "./routes/polls.routes";
import { requireAuth } from "./middlewares/auth.guard";
import { notFoundHandler, errorHandler } from "./middlewares/error.middleware";

/* Validate required env on import */
assertEnv();

/* Standalone Express app for testing (forSupertest no .listen() needed) */
export const app = express();

/* JSON body parsing */
app.use(express.json());

/* CORS (same as real app) */
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })
);


/* Public routes */
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);

/* Protected routes (need Bearer token) */
app.use("/api/polls", requireAuth, pollsRouter);

/* 404 + error handlers (same order as prod) */
app.use(notFoundHandler);
app.use(errorHandler);