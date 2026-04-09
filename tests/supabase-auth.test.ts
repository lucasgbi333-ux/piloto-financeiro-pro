import { describe, expect, it } from "vitest";

describe("Supabase credentials", () => {
  it("EXPO_PUBLIC_SUPABASE_URL is set and looks like a valid URL", () => {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    expect(url).toBeDefined();
    expect(url).not.toBe("");
    expect(url).toMatch(/^https:\/\/.+\.supabase\.co/);
  });

  it("EXPO_PUBLIC_SUPABASE_ANON_KEY is set and looks like a JWT", () => {
    const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    expect(key).toBeDefined();
    expect(key).not.toBe("");
    // Supabase anon keys are JWTs with 3 dot-separated parts
    expect(key!.split(".").length).toBe(3);
  });

  it("can reach the Supabase REST endpoint", async () => {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    const res = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: key!,
        Authorization: `Bearer ${key}`,
      },
    });
    // 200 = OK, 401 = reachable but no RLS tables yet — both confirm valid credentials
    expect([200, 401]).toContain(res.status);
  });
});
