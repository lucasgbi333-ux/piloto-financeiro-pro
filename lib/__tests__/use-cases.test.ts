import { describe, it, expect } from "vitest";
import {
  calculateFixedCosts,
  calculateOperationalCost,
  groupReports,
  createGanhoTransaction,
  createCustoTransaction,
  getDefaultVehicleProfile,
} from "../use-cases";
import type {
  FixedCostInput,
  OperationalInput,
  DailyRecord,
  VehicleProfile,
} from "../types";

// Helper para criar DailyRecord completo
function makeDailyRecord(partial: { date: string; kmRodado: number; ganho: number; custo: number }): DailyRecord {
  const now = Date.now();
  return {
    id: `${partial.date}-test`,
    date: partial.date,
    kmRodado: partial.kmRodado,
    ganho: partial.ganho,
    custo: partial.custo,
    createdAt: now,
    updatedAt: now,
  };
}

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

// ===== CUSTO OPERACIONAL =====
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

  it("should use VehicleProfile values when input fields are 0", () => {
    const input: OperationalInput = {
      tipoVeiculo: "COMBUSTAO",
      precoCombustivel: 0,
      autonomia: 0,
      kmRodadoDia: 200,
      ganhoDia: 300,
      margemDesejadaPorKm: 0,
      gastoAbastecimento: 0,
    };
    const profile: VehicleProfile = {
      id: "combustao",
      type: "COMBUSTAO",
      precoEnergia: 6.0,
      autonomia: 12,
      margemDesejada: 0.5,
    };
    const result = calculateOperationalCost(input, profile);
    expect(result.custoPorKm).toBeCloseTo(0.5, 3);
    expect(result.valorMinimoKm).toBeCloseTo(1.0, 3);
  });
});

// ===== PERFIS DE VEÍCULO =====
describe("getDefaultVehicleProfile", () => {
  it("should return default COMBUSTAO profile", () => {
    const p = getDefaultVehicleProfile("COMBUSTAO");
    expect(p.type).toBe("COMBUSTAO");
    expect(p.precoEnergia).toBe(0);
    expect(p.autonomia).toBe(0);
  });

  it("should return default ELETRICO profile", () => {
    const p = getDefaultVehicleProfile("ELETRICO");
    expect(p.type).toBe("ELETRICO");
  });
});

// ===== TRANSAÇÕES =====
describe("createGanhoTransaction / createCustoTransaction", () => {
  it("should create GANHO transaction from DailyRecord", () => {
    const record = makeDailyRecord({ date: "2025-01-15", kmRodado: 200, ganho: 300, custo: 100 });
    const tx = createGanhoTransaction(record);
    expect(tx.type).toBe("GANHO");
    expect(tx.amount).toBe(300);
    expect(tx.description).toContain("2025-01-15");
  });

  it("should create CUSTO transaction from DailyRecord", () => {
    const record = makeDailyRecord({ date: "2025-01-15", kmRodado: 200, ganho: 300, custo: 100 });
    const tx = createCustoTransaction(record);
    expect(tx.type).toBe("CUSTO");
    expect(tx.amount).toBe(100);
  });
});

// ===== RELATÓRIOS =====
describe("groupReports", () => {
  const records: DailyRecord[] = [
    makeDailyRecord({ date: "2025-01-15", kmRodado: 200, ganho: 300, custo: 100 }),
    makeDailyRecord({ date: "2025-01-16", kmRodado: 180, ganho: 280, custo: 90 }),
    makeDailyRecord({ date: "2025-02-10", kmRodado: 220, ganho: 350, custo: 110 }),
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
