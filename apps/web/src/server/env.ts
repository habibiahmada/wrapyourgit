import "server-only";

/** Reads a required server env var, failing loudly at first use instead of sending `undefined`. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value)
    throw new Error(`${name} is not set. See .env.example and docs/development/setup.md.`);
  return value;
}
