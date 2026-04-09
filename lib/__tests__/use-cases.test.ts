import { describe, it, expect } from "vitest";
import { calculateFixedCosts, calculateOperationalCost, groupReports } from "../use-cases";
import type { FixedCostInput, OperationalInput, DailyRecord } from "../types";

describe("calculateFixedCosts", () => {
  it("should calculate monthly, annual and daily costs correctly", () => {
    const input: FixedCostInput = {
      ipvaAnual: 1200,
      financiamentoMensal: 800,
      aluguelValor: 0,
      tipoAluguel: "MENSAL",
      internetMensal: 100,
      outrosCustos: 50,
    };
    const result = calculateFixedCosts(input);
    // ipvaMensal = 1200/12 = 100
    // veiculoCusto = 800 (financiamento > 0)
    // total = 100 + 800 + 100 + 50 = 1050
    expect(result.custoMensalTotal).toBeCloseTo(1050, 2);
    expect(result.custoAnualTotal).toBeCloseTo(12600, 2);
    expect(result.custoDiarioNecessario).toBeCloseTo(35, 2);
  });

  it("should use weekly rental when financiamento is 0", () => {
    const input: FixedCostInput = {
      ipvaAnual: 0,
      financiamentoMensal: 0,
      aluguelValor: 500,
      tipoAluguel: "SEMANAL",
      internetMensal: 0,
      outrosCustos: 0,
    };
    const result = calculateFixedCosts(input);
    // aluguelMensal = 500 * 4.33 = 2165
    expect(result.custoMensalTotal).toBeCloseTo(2165, 2);
  });

  it("should use monthly rental when financiamento is 0", () => {
    const input: FixedCostInput = {
      ipvaAnual: 0,
      financiamentoMensal: 0,
      aluguelValor: 2000,
      tipoAluguel: "MENSAL",
      internetMensal: 0,
      outrosCustos: 0,
    };
    const result = calculateFixedCosts(input);
    expect(result.custoMensalTotal).toBeCloseTo(2000, 2);
  });
});

describe("calculateOperationalCost", () => {
  it("should calculate combustion vehicle costs correctly", () => {
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
    // cok = 6/12 = 0.5
    expect(result.custoPorKm).toBeCloseTo(0.5, 3);
    // custoTotalDia = 0.5 * 200 = 100
    expect(result.custoTotalDia).toBeCloseTo(100, 2);
    // lucroPorKm = (300/200) - 0.5 = 1.5 - 0.5 = 1.0
    expect(result.lucroPorKm).toBeCloseTo(1.0, 3);
    // valorMinimoKm = 0.5 + 0.5 = 1.0
    expect(result.valorMinimoKm).toBeCloseTo(1.0, 3);
  });

  it("should calculate electric vehicle costs correctly", () => {
    const input: OperationalInput = {
      tipoVeiculo: "ELETRICO",
      precoCombustivel: 0.8,
      autonomia: 6,
      kmRodadoDia: 150,
      ganhoDia: 250,
      margemDesejadaPorKm: 0.3,
      gastoAbastecimento: 0,
    };
    const result = calculateOperationalCost(input);
    // cok = 0.8/6 = 0.1333
    expect(result.custoPorKm).toBeCloseTo(0.1333, 3);
    // custoTotalDia = 0.1333 * 150 = 20
    expect(result.custoTotalDia).toBeCloseTo(20, 1);
    // lucroPorKm = (250/150) - 0.1333 = 1.6667 - 0.1333 = 1.5333
    expect(result.lucroPorKm).toBeCloseTo(1.5333, 3);
    // valorMinimoKm = 0.1333 + 0.3 = 0.4333
    expect(result.valorMinimoKm).toBeCloseTo(0.4333, 3);
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
    expect(result.custoTotalDia).toBe(0);
  });
});

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
    // Jan: profit = (300-100) + (280-90) = 390
    const jan = result.find((r) => r.period.startsWith("Jan"));
    expect(jan).toBeDefined();
    expect(jan!.totalProfit).toBeCloseTo(390, 2);
  });

  it("should return empty array for empty records", () => {
    const result = groupReports([], "DAY");
    expect(result).toHaveLength(0);
  });
});
