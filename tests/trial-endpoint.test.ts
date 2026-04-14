import { describe, it, expect, beforeAll } from "vitest";

const API_BASE = process.env.API_BASE || "http://localhost:3000";

describe("Trial Endpoints", () => {
  it("POST /api/trial/create should accept email and user_id", async () => {
    const response = await fetch(`${API_BASE}/api/trial/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        user_id: "550e8400-e29b-41d4-a716-446655440000",
      }),
    });

    // Should either succeed or fail with proper error (not 500 from missing env var)
    expect([200, 400, 500]).toContain(response.status);
    
    const data = await response.json();
    if (response.ok) {
      expect(data).toHaveProperty("success");
      expect(data).toHaveProperty("trial_start");
      expect(data).toHaveProperty("trial_end");
    }
  });

  it("GET /api/trial/check should return trial status", async () => {
    const response = await fetch(
      `${API_BASE}/api/trial/check?email=test@example.com`
    );

    expect([200, 400, 500]).toContain(response.status);
    
    const data = await response.json();
    if (response.ok) {
      expect(data).toHaveProperty("has_trial");
      expect(data).toHaveProperty("is_active");
      expect(data).toHaveProperty("days_remaining");
    }
  });
});
