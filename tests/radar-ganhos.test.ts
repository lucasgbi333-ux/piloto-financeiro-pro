import { describe, it, expect } from "vitest";
import { getSemaforoCor, SEMAFORO_COLORS } from "../lib/radar-ganhos-context";

describe("Radar de Ganhos - Semáforo logic", () => {
  it("should return 'verde' when value is above 'bom' limit", () => {
    const limite = { ruim: 1.70, bom: 1.90 };
    expect(getSemaforoCor(2.00, limite)).toBe("verde");
    expect(getSemaforoCor(1.90, limite)).toBe("verde");
  });

  it("should return 'amarelo' when value is between 'ruim' and 'bom'", () => {
    const limite = { ruim: 1.70, bom: 1.90 };
    expect(getSemaforoCor(1.80, limite)).toBe("amarelo");
    expect(getSemaforoCor(1.70, limite)).toBe("amarelo");
  });

  it("should return 'vermelho' when value is below 'ruim' limit", () => {
    const limite = { ruim: 1.70, bom: 1.90 };
    expect(getSemaforoCor(1.50, limite)).toBe("vermelho");
    expect(getSemaforoCor(1.69, limite)).toBe("vermelho");
  });

  it("should handle nota do passageiro limits correctly", () => {
    const limite = { ruim: 4.80, bom: 4.90 };
    expect(getSemaforoCor(5.0, limite)).toBe("verde");
    expect(getSemaforoCor(4.90, limite)).toBe("verde");
    expect(getSemaforoCor(4.85, limite)).toBe("amarelo");
    expect(getSemaforoCor(4.80, limite)).toBe("amarelo");
    expect(getSemaforoCor(4.70, limite)).toBe("vermelho");
  });

  it("should handle ganhos por hora limits correctly", () => {
    const limite = { ruim: 40.0, bom: 50.0 };
    expect(getSemaforoCor(60.0, limite)).toBe("verde");
    expect(getSemaforoCor(50.0, limite)).toBe("verde");
    expect(getSemaforoCor(45.0, limite)).toBe("amarelo");
    expect(getSemaforoCor(40.0, limite)).toBe("amarelo");
    expect(getSemaforoCor(30.0, limite)).toBe("vermelho");
  });

  it("SEMAFORO_COLORS should have correct color values", () => {
    expect(SEMAFORO_COLORS.verde).toBe("#22C55E");
    expect(SEMAFORO_COLORS.amarelo).toBe("#FBBF24");
    expect(SEMAFORO_COLORS.vermelho).toBe("#EF4444");
  });

  it("should handle edge case where ruim equals bom", () => {
    const limite = { ruim: 2.0, bom: 2.0 };
    expect(getSemaforoCor(2.0, limite)).toBe("verde");
    expect(getSemaforoCor(1.99, limite)).toBe("vermelho");
  });

  it("should handle zero values", () => {
    const limite = { ruim: 1.0, bom: 2.0 };
    expect(getSemaforoCor(0, limite)).toBe("vermelho");
  });
});
