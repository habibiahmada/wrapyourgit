/**
 * Gets a GitHub App user access token via the device flow, to check what a real sign-in token
 * can read (ADR-0006) without building the web auth first.
 *
 *   GITHUB_APP_CLIENT_ID=Iv23... bun scripts/github-app-token.ts
 *
 * The app needs "Enable Device Flow" checked. The token is written to .data/github-app-token
 * (gitignored, mode 600) and never printed.
 */
import { chmod } from "node:fs/promises";

const clientId = process.env.GITHUB_APP_CLIENT_ID;
if (!clientId) {
  console.error("GITHUB_APP_CLIENT_ID is not set (the GitHub App's Client ID, not its secret).");
  process.exit(1);
}

async function post<T>(url: string, params: Record<string, string>): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  if (!response.ok) throw new Error(`${url} → HTTP ${response.status}`);
  return (await response.json()) as T;
}

const device = await post<{
  device_code: string;
  user_code: string;
  verification_uri: string;
  interval: number;
  expires_in: number;
  error?: string;
}>("https://github.com/login/device/code", { client_id: clientId });
if (device.error) {
  console.error(
    `Device flow refused: ${device.error}. Is "Enable Device Flow" checked on the app?`,
  );
  process.exit(1);
}

console.log(`Open ${device.verification_uri} and enter the code: ${device.user_code}`);

let interval = device.interval;
const deadline = Date.now() + device.expires_in * 1000;
while (Date.now() < deadline) {
  await Bun.sleep(interval * 1000);
  const result = await post<{
    access_token?: string;
    expires_in?: number;
    error?: string;
    interval?: number;
  }>("https://github.com/login/oauth/access_token", {
    client_id: clientId,
    device_code: device.device_code,
    grant_type: "urn:ietf:params:oauth:grant-type:device_code",
  });
  if (result.access_token) {
    const path = ".data/github-app-token";
    await Bun.write(path, result.access_token);
    await chmod(path, 0o600);
    const hours = result.expires_in
      ? ` (expires in ${(result.expires_in / 3600).toFixed(0)} h)`
      : "";
    console.log(`Token saved to ${path}${hours}.`);
    process.exit(0);
  }
  if (result.error === "slow_down") interval = result.interval ?? interval + 5;
  else if (result.error !== "authorization_pending") {
    console.error(`Authorization failed: ${result.error}`);
    process.exit(1);
  }
}
console.error("The code expired before it was entered. Run the script again.");
process.exit(1);
