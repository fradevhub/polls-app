/** Environment configuration loader. **/
// Read all required environment variables from process.env,
// apply safe defaults for development and expose them as typed object.
export const env = {
  // Port number for the Express server (default: 8080)
  PORT: Number(process.env.PORT ?? 8080),

  // Current environment (e.g. "development" | "production" | "test")
  NODE_ENV: process.env.NODE_ENV ?? 'development',

  // Allowed frontend origin for CORS (default: Vite dev server)
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:5173',

  // Secret key used to sign and verify JWT tokens
  JWT_SECRET: process.env.JWT_SECRET ?? '',
};

/* Critical environment variables checker */
// If any required variable is missing, throw an error and stop the app.
// Useful to catch misconfigurations early during startup.
export function assertEnv() {
  const missing: string[] = [];

  // Check for required variables
  if (!env.JWT_SECRET) missing.push('JWT_SECRET');
  if (!env.CORS_ORIGIN) missing.push('CORS_ORIGIN');

  // If any are missing, throw an explicit error
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}