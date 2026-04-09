import { describe, it, expect } from "vitest";
import { calculateFixedCosts, calculateOperationalCost, groupReports } from "../use-cases";
import type { FixedCostInput, OperationalInput, DailyRecord } from "../types";

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
    // ipvaMensal = 1200/12 = 100
    // veiculoCusto = 800 (financiamento)
    // seguroMensal = 2400/12 = 200
    // total = 100 + 800 + 200 + 100 + 50 = 1250
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
    // aluguelMensal = 500 * 4.33 = 2165
    expect(result.custoMensalTotal).toBeCloseTo(2165, 2);
  });
});

describe("calculateOperationalCost", () => {
  it("should use gasto real (abastecimento) when provided", () => {
    const input: OperationalInput = {
      tipoVeiculo: "COMBUSTAO",
      precoCombustivel: 6.0,
      autonomia: 12,
      kmRodadoDia: 200,
      ganhoDia: 300,
      margemDesejadaPorKm: 0.5,
      gastoAbastecimento: 70, // gasto real informado
    };
    const result = calculateOperationalCost(input);
    // custoPorKm = 6/12 = 0.5 (estimado)
    expect(result.custoPorKm).toBeCloseTo(0.5, 3);
    // custoTotalDiaEstimado = 0.5 * 200 = 100
    expect(result.custoTotalDiaEstimado).toBeCloseTo(100, 2);
    // custoTotalDiaReal = 70 (gasto real informado)
    expect(result.custoTotalDiaReal).toBeCloseTo(70, 2);
    // lucroDia = 300 - 70 = 230
    expect(result.lucroDia).toBeCloseTo(230, 2);
    // lucroPorKm = 230 / 200 = 1.15
    expect(result.lucroPorKm).toBeCloseTo(1.15, 3);
    // valorMinimoKm = 0.5 + 0.5 = 1.0
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
    // custoTotalDiaReal = estimado = 100
    expect(result.custoTotalDiaReal).toBeCloseTo(100, 2);
    // lucroDia = 300 - 100 = 200
    expect(result.lucroDia).toBeCloseTo(200, 2);
    // lucroPorKm = 200 / 200 = 1.0
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

  it("should calculate electric vehicle with real charge cost", () => {
    const input: OperationalInput = {
      tipoVeiculo: "ELETRICO",
      precoCombustivel: 0.8,
      autonomia: 6,
      kmRodadoDia: 150,
      ganhoDia: 250,
      margemDesejadaPorKm: 0.3,
      gastoAbastecimento: 50, // recarga real
    };
    const result = calculateOperationalCost(input);
    // custoTotalDiaReal = 50 (recarga real)
    expect(result.custoTotalDiaReal).toBeCloseTo(50, 2);
    // lucroDia = 250 - 50 = 200
    expect(result.lucroDia).toBeCloseTo(200, 2);
    // lucroPorKm = 200 / 150 = 1.333
    expect(result.lucroPorKm).toBeCloseTo(1.333, 3);
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
    const jan = result.find((r) => r.period.startsWith("Jan"));
    expect(jan).toBeDefined();
    // Jan: (300-100) + (280-90) = 200 + 190 = 390
    expect(jan!.totalProfit).toBeCloseTo(390, 2);
  });

  it("should return empty array for empty records", () => {
    const result = groupReports([], "DAY");
    expect(result).toHaveLength(0);
  });
});
