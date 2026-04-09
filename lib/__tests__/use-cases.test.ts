import { describe, it, expect } from "vitest";
import {
  calculateFixedCosts,
  calculateOperationalCost,
  calculateRealCost,
  groupReports,
} from "../use-cases";
import type {
  FixedCostInput,
  OperationalInput,
  RealCostInput,
  DailyRecord,
} from "../types";

// ===== CUSTOS FIXOS =====
describe("calculateFixedCosts", () => {
  it("should calculate monthly, annual and daily costs with seguro anual", () => {
    const input: FixedCostInput = {
      ipvaAnual: 1200,
      financiamentoMensal: 800,
      aluguelValor: 0,
      tipoAluguel: "MENSAL",
      internetMensal: 100,
      outrosCustos: 50,
      seguroValor: 2400,
      tipoSeguro: "ANUAL",
    };
    const result = calculateFixedCosts(input);
    // ipvaMensal=100, financiamento=800, seguroMensal=200, internet=100, outros=50 → 1250
    expect(result.custoMensalTotal).toBeCloseTo(1250, 2);
    expect(result.custoAnualTotal).toBeCloseTo(15000, 2);
    expect(result.custoDiarioNecessario).toBeCloseTo(1250 / 30, 2);
    expect(result.custoDiarioAnual).toBeCloseTo(15000 / 365, 2);
  });

  it("should include seguro mensal correctly", () => {
    const input: FixedCostInput = {
      ipvaAnual: 0,
      financiamentoMensal: 0,
      aluguelValor: 0,
      tipoAluguel: "MENSAL",
      internetMensal: 0,
      outrosCustos: 0,
      seguroValor: 300,
      tipoSeguro: "MENSAL",
    };
    const result = calculateFixedCosts(input);
    expect(result.custoMensalTotal).toBeCloseTo(300, 2);
  });

  it("should use weekly rental when financiamento is 0", () => {
    const input: FixedCostInput = {
      ipvaAnual: 0,
      financiamentoMensal: 0,
      aluguelValor: 500,
      tipoAluguel: "SEMANAL",
      internetMensal: 0,
      outrosCustos: 0,
      seguroValor: 0,
      tipoSeguro: "ANUAL",
    };
    const result = calculateFixedCosts(input);
    expect(result.custoMensalTotal).toBeCloseTo(2165, 2);
  });
});

// ===== CUSTO OPERACIONAL (MODO ESTIMADO) =====
describe("calculateOperationalCost", () => {
  it("should use gasto real (abastecimento) when provided", () => {
    const input: OperationalInput = {
      tipoVeiculo: "COMBUSTAO",
      precoCombustivel: 6.0,
      autonomia: 12,
      kmRodadoDia: 200,
      ganhoDia: 300,
      margemDesejadaPorKm: 0.5,
      gastoAbastecimento: 70,
    };
    const result = calculateOperationalCost(input);
    expect(result.custoPorKm).toBeCloseTo(0.5, 3);
    expect(result.custoTotalDiaEstimado).toBeCloseTo(100, 2);
    expect(result.custoTotalDiaReal).toBeCloseTo(70, 2);
    expect(result.lucroDia).toBeCloseTo(230, 2);
    expect(result.lucroPorKm).toBeCloseTo(1.15, 3);
    expect(result.valorMinimoKm).toBeCloseTo(1.0, 3);
  });

  it("should use estimated cost when gastoAbastecimento is 0", () => {
    const input: OperationalInput = {
      tipoVeiculo: "COMBUSTAO",
      precoCombustivel: 6.0,
      autonomia: 12,
      kmRodadoDia: 200,
      ganhoDia: 300,
      margemDesejadaPorKm: 0.5,
      gastoAbastecimento: 0,
    };
    const result = calculateOperationalCost(input);
    expect(result.custoTotalDiaReal).toBeCloseTo(100, 2);
    expect(result.lucroDia).toBeCloseTo(200, 2);
    expect(result.lucroPorKm).toBeCloseTo(1.0, 3);
  });

  it("should handle zero autonomia gracefully", () => {
    const input: OperationalInput = {
      tipoVeiculo: "COMBUSTAO",
      precoCombustivel: 6.0,
      autonomia: 0,
      kmRodadoDia: 100,
      ganhoDia: 200,
      margemDesejadaPorKm: 0.5,
      gastoAbastecimento: 0,
    };
    const result = calculateOperationalCost(input);
    expect(result.custoPorKm).toBe(0);
    expect(result.custoTotalDiaEstimado).toBe(0);
    expect(result.custoTotalDiaReal).toBe(0);
  });
});

// ===== CUSTO REAL (RealCostUseCase) =====
describe("calculateRealCost", () => {
  it("should calculate custoPorKmReal and lucroPorKmReal correctly", () => {
    const input: RealCostInput = {
      kmRodado: 200,
      valorAbastecido: 70,
      valorPorKmRecebido: 1.5,
    };
    const result = calculateRealCost(input);
    // custoPorKmReal = 70 / 200 = 0.35
    expect(result.isValid).toBe(true);
    expect(result.custoPorKmReal).toBeCloseTo(0.35, 4);
    // lucroPorKmReal = 1.5 - 0.35 = 1.15
    expect(result.lucroPorKmReal).toBeCloseTo(1.15, 4);
    expect(result.errorMessage).toBeUndefined();
  });

  it("should return error when kmRodado <= 0", () => {
    const input: RealCostInput = {
      kmRodado: 0,
      valorAbastecido: 70,
      valorPorKmRecebido: 1.5,
    };
    const result = calculateRealCost(input);
    expect(result.isValid).toBe(false);
    expect(result.custoPorKmReal).toBe(0);
    expect(result.lucroPorKmReal).toBe(0);
    expect(result.errorMessage).toBeTruthy();
  });

  it("should return error when valorAbastecido <= 0", () => {
    const input: RealCostInput = {
      kmRodado: 200,
      valorAbastecido: 0,
      valorPorKmRecebido: 1.5,
    };
    const result = calculateRealCost(input);
    expect(result.isValid).toBe(false);
    expect(result.custoPorKmReal).toBe(0);
    expect(result.errorMessage).toBeTruthy();
  });

  it("should handle negative lucroPorKmReal (prejuízo)", () => {
    const input: RealCostInput = {
      kmRodado: 100,
      valorAbastecido: 200, // custo alto
      valorPorKmRecebido: 1.0,
    };
    const result = calculateRealCost(input);
    // custoPorKmReal = 200 / 100 = 2.0
    // lucroPorKmReal = 1.0 - 2.0 = -1.0 (prejuízo)
    expect(result.isValid).toBe(true);
    expect(result.custoPorKmReal).toBeCloseTo(2.0, 4);
    expect(result.lucroPorKmReal).toBeCloseTo(-1.0, 4);
  });

  it("should handle negative kmRodado as invalid", () => {
    const input: RealCostInput = {
      kmRodado: -50,
      valorAbastecido: 70,
      valorPorKmRecebido: 1.5,
    };
    const result = calculateRealCost(input);
    expect(result.isValid).toBe(false);
  });
});

// ===== RELATÓRIOS =====
describe("groupReports", () => {
  const records: DailyRecord[] = [
    { date: "2025-01-15", kmRodado: 200, ganho: 300, custo: 100 },
    { date: "2025-01-16", kmRodado: 180, ganho: 280, custo: 90 },
    { date: "2025-02-10", kmRodado: 220, ganho: 350, custo: 110 },
  ];

  it("should return individual days for DAY filter", () => {
    const result = groupReports(records, "DAY");
    expect(result).toHaveLength(3);
    expect(result[0].period).toBe("2025-01-15");
    expect(result[0].totalProfit).toBeCloseTo(200, 2);
    expect(result[0].totalKm).toBe(200);
    expect(result[0].totalCost).toBe(100);
  });

  it("should group by month for MONTH filter", () => {
    const result = groupReports(records, "MONTH");
    expect(result).toHaveLength(2);
    const jan = result.find((r) => r.period.startsWith("Jan"));
    expect(jan).toBeDefined();
    expect(jan!.totalProfit).toBeCloseTo(390, 2);
  });

  it("should return empty array for empty records", () => {
    const result = groupReports([], "DAY");
    expect(result).toHaveLength(0);
  });
});
