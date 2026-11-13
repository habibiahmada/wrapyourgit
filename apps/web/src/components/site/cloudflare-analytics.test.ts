import { describe, expect, test } from "bun:test";
import { beaconConfig } from "./cloudflare-analytics";

describe("beaconConfig", () => {
  test("loads the beacon on the production deployment", () => {
    expect(beaconConfig({ VERCEL_ENV: "production" })).toBe(
      JSON.stringify({ token: "d1c5446ebb1e41f482fa4ef56d5f7a60" }),
    );
  });

  test("stays off on previews and local runs, so test visits never count", () => {
    expect(beaconConfig({ VERCEL_ENV: "preview" })).toBeNull();
    expect(beaconConfig({ VERCEL_ENV: "development" })).toBeNull();
    expect(beaconConfig({})).toBeNull();
  });
});
