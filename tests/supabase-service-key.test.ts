import { describe, expect, it } from "vitest";

describe("Supabase Service Role Key validation", () => {
  it("SUPABASE_SERVICE_ROLE_KEY is set", () => {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(key).toBeDefined();
    expect(key!.length).toBeGreaterThan(10);
  });

  it("Service Role Key can access Supabase REST API", async () => {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Missing env vars");

    // Try to access the REST API — even without tables, it should return 200
    const res = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });
    // 200 = success, 404 = no tables but key is valid
    expect([200, 404]).toContain(res.status);
  });
});
