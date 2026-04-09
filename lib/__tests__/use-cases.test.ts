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
    // Com gastoAbastecimento=70 e kmRodado=200: custoPorKm REAL = 70/200 = 0.35
    expect(result.custoPorKm).toBeCloseTo(0.35, 3);
    expect(result.isUsingRealCost).toBe(true);
    expect(result.custoTotalDiaEstimado).toBeCloseTo(100, 2);
    expect(result.custoTotalDiaReal).toBeCloseTo(70, 2);
    // lucroDia = ganho - custoReal = 300 - 70 = 230
    expect(result.lucroDia).toBeCloseTo(230, 2);
    // lucroPorKm = (ganho - custoReal) / km = 230/200 = 1.15
    expect(result.lucroPorKm).toBeCloseTo(1.15, 3);
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

  // ===== TESTES ESPECÍFICOS PARA ELÉTRICO =====
  it("should calculate electric vehicle cost correctly with estimated values", () => {
    // Exemplo: R$ 0,80/kWh, autonomia 6 km/kWh
    // Custo estimado por km = 0.80 / 6 = 0.1333
    const input: OperationalInput = {
      tipoVeiculo: "ELETRICO",
      precoCombustivel: 0.80, // R$/kWh
      autonomia: 6,           // km/kWh
      kmRodadoDia: 150,
      ganhoDia: 250,
      margemDesejadaPorKm: 0.3,
      gastoAbastecimento: 0,
    };
    const result = calculateOperationalCost(input);
    expect(result.isUsingRealCost).toBe(false);
    expect(result.custoPorKm).toBeCloseTo(0.1333, 3);
    expect(result.custoTotalDiaEstimado).toBeCloseTo(20, 1); // 0.1333 * 150 = 20
    expect(result.custoTotalDiaReal).toBeCloseTo(20, 1);
    expect(result.lucroDia).toBeCloseTo(230, 1); // 250 - 20
  });

  it("should calculate electric vehicle cost correctly with REAL cost", () => {
    // Exemplo: gastou R$ 25 na recarga, rodou 150 km
    // Custo real por km = 25 / 150 = 0.1667
    const input: OperationalInput = {
      tipoVeiculo: "ELETRICO",
      precoCombustivel: 0.80,
      autonomia: 6,
      kmRodadoDia: 150,
      ganhoDia: 250,
      margemDesejadaPorKm: 0.3,
      gastoAbastecimento: 25, // Gasto real na recarga
    };
    const result = calculateOperationalCost(input);
    expect(result.isUsingRealCost).toBe(true);
    expect(result.custoPorKm).toBeCloseTo(0.1667, 3); // 25/150
    expect(result.custoTotalDiaReal).toBeCloseTo(25, 2);
    expect(result.lucroDia).toBeCloseTo(225, 1); // 250 - 25
  });

  it("should calculate electric vehicle lucro líquido with fixed costs", () => {
    const input: OperationalInput = {
      tipoVeiculo: "ELETRICO",
      precoCombustivel: 0.80,
      autonomia: 6,
      kmRodadoDia: 150,
      ganhoDia: 250,
      margemDesejadaPorKm: 0.3,
      gastoAbastecimento: 25,
    };
    const custoFixoDiario = 40; // R$ 40/dia de custos fixos
    const result = calculateOperationalCost(input, undefined, custoFixoDiario);
    // Lucro líquido = 250 - 25 - 40 = 185
    expect(result.lucroDiaLiquido).toBeCloseTo(185, 1);
    // Custo por km total = 25/150 + 40/150 = 0.1667 + 0.2667 = 0.4333
    expect(result.custoPorKmTotal).toBeCloseTo(0.4333, 3);
  });

  it("should keep electric and combustion profiles completely independent", () => {
    // Perfil Combustão: R$ 6/L, 12 km/L
    const combustaoInput: OperationalInput = {
      tipoVeiculo: "COMBUSTAO",
      precoCombustivel: 6.0,
      autonomia: 12,
      kmRodadoDia: 200,
      ganhoDia: 300,
      margemDesejadaPorKm: 0.5,
      gastoAbastecimento: 0,
    };
    const combustaoResult = calculateOperationalCost(combustaoInput);
    // Custo/km combustão = 6/12 = 0.50
    expect(combustaoResult.custoPorKm).toBeCloseTo(0.50, 3);

    // Perfil Elétrico: R$ 0.80/kWh, 6 km/kWh
    const eletricoInput: OperationalInput = {
      tipoVeiculo: "ELETRICO",
      precoCombustivel: 0.80,
      autonomia: 6,
      kmRodadoDia: 200,
      ganhoDia: 300,
      margemDesejadaPorKm: 0.3,
      gastoAbastecimento: 0,
    };
    const eletricoResult = calculateOperationalCost(eletricoInput);
    // Custo/km elétrico = 0.80/6 = 0.1333
    expect(eletricoResult.custoPorKm).toBeCloseTo(0.1333, 3);

    // Verifica que são completamente diferentes
    expect(combustaoResult.custoPorKm).not.toBeCloseTo(eletricoResult.custoPorKm, 2);
    expect(combustaoResult.custoTotalDiaEstimado).toBeCloseTo(100, 1); // 0.50 * 200
    expect(eletricoResult.custoTotalDiaEstimado).toBeCloseTo(26.67, 1); // 0.1333 * 200
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
