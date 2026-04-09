import type {
  FixedCostInput,
  FixedCostResult,
  OperationalInput,
  OperationalResult,
  VehicleProfile,
  DailyRecord,
  Transaction,
  TransactionType,
  ReportItem,
  PeriodFilter,
} from "./types";

// ===== MÓDULO 1: CUSTOS FIXOS =====
export function calculateFixedCosts(input: FixedCostInput): FixedCostResult {
  const ipvaMensal = input.ipvaAnual / 12;

  let aluguelMensal = 0;
  if (input.aluguelValor > 0) {
    aluguelMensal =
      input.tipoAluguel === "SEMANAL"
        ? input.aluguelValor * 4.33
        : input.aluguelValor;
  }

  let seguroMensal = 0;
  if (input.seguroValor > 0) {
    seguroMensal =
      input.tipoSeguro === "ANUAL"
        ? input.seguroValor / 12
        : input.seguroValor;
  }

  const veiculoCusto =
    input.financiamentoMensal > 0 ? input.financiamentoMensal : aluguelMensal;

  const custoMensalTotal =
    ipvaMensal +
    veiculoCusto +
    seguroMensal +
    input.internetMensal +
    input.outrosCustos;

  const custoAnualTotal = custoMensalTotal * 12;
  const custoDiarioNecessario = custoMensalTotal / 30;
  const custoDiarioAnual = custoAnualTotal / 365;

  /**
   * Custo fixo diluído por dia:
   * - Custos mensais: divididos por 30
   * - Custos anuais (IPVA, seguro anual): divididos por 12 e depois por 30
   * Fórmula simplificada: custoMensalTotal / 30 (já converte tudo para mensal antes)
   */
  const custoFixoDiario = custoMensalTotal / 30;

  return { custoMensalTotal, custoAnualTotal, custoDiarioNecessario, custoDiarioAnual, custoFixoDiario };
}

// ===== MÓDULO 2: CUSTO OPERACIONAL =====
/**
 * Calcula custo operacional incluindo fixos diluídos.
 * - custoPorKm = combustível/km
 * - custoPorKmTotal = combustível/km + fixos/km
 * - lucroDiaLiquido = ganho - custo combustível - custoFixoDiario
 */
export function calculateOperationalCost(
  input: OperationalInput,
  profile?: VehicleProfile,
  custoFixoDiario = 0
): OperationalResult {
  const preco = input.precoCombustivel > 0 ? input.precoCombustivel : (profile?.precoEnergia ?? 0);
  const autonomia = input.autonomia > 0 ? input.autonomia : (profile?.autonomia ?? 0);
  const margem = input.margemDesejadaPorKm > 0 ? input.margemDesejadaPorKm : (profile?.margemDesejada ?? 0);

  // Custo de combustível por km
  const custoPorKm = autonomia > 0 ? preco / autonomia : 0;

  // Custo fixo por km (fixos do dia ÷ km rodados)
  const custoFixoPorKm = input.kmRodadoDia > 0 ? custoFixoDiario / input.kmRodadoDia : 0;

  // Custo total por km = combustível + fixos
  const custoPorKmTotal = custoPorKm + custoFixoPorKm;

  const custoTotalDiaEstimado = custoPorKm * input.kmRodadoDia;

  const custoTotalDiaReal =
    input.gastoAbastecimento > 0
      ? input.gastoAbastecimento
      : custoTotalDiaEstimado;

  // Lucro bruto (sem descontar fixos)
  const lucroDia = input.ganhoDia - custoTotalDiaReal;

  // Lucro líquido = ganho - custo combustível - custo fixo diário
  const lucroDiaLiquido = input.ganhoDia - custoTotalDiaReal - custoFixoDiario;

  const lucroPorKm = input.kmRodadoDia > 0 ? lucroDiaLiquido / input.kmRodadoDia : 0;
  const valorMinimoKm = custoPorKmTotal + margem;

  return {
    custoPorKm,
    custoPorKmTotal,
    custoTotalDiaEstimado,
    custoTotalDiaReal,
    lucroPorKm,
    lucroDia,
    lucroDiaLiquido,
    valorMinimoKm,
  };
}

// ===== MÓDULO 3: PERFIS DE VEÍCULO =====
export function getDefaultVehicleProfile(type: "COMBUSTAO" | "ELETRICO"): VehicleProfile {
  if (type === "COMBUSTAO") {
    return { id: "combustao", type: "COMBUSTAO", precoEnergia: 0, autonomia: 0, margemDesejada: 0 };
  }
  return { id: "eletrico", type: "ELETRICO", precoEnergia: 0, autonomia: 0, margemDesejada: 0 };
}

// ===== MÓDULO 4: TRANSAÇÕES =====
export function createGanhoTransaction(record: DailyRecord): Transaction {
  return {
    id: `ganho-${record.date}-${Date.now()}`,
    type: "GANHO" as TransactionType,
    amount: record.ganho,
    date: Date.now(),
    description: `Ganho do dia ${record.date}`,
  };
}

export function createCustoTransaction(record: DailyRecord): Transaction {
  return {
    id: `custo-${record.date}-${Date.now()}`,
    type: "CUSTO" as TransactionType,
    amount: record.custo,
    date: Date.now(),
    description: `Custo do dia ${record.date}`,
  };
}

export function createAjusteTransaction(amount: number, description: string): Transaction {
  return {
    id: `ajuste-${Date.now()}`,
    type: "AJUSTE" as TransactionType,
    amount,
    date: Date.now(),
    description,
  };
}

// ===== MÓDULO 5: RELATÓRIOS =====
function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - startOfYear.getTime();
  const weekNum = Math.ceil((diff / 86400000 + startOfYear.getDay() + 1) / 7);
  return `Sem ${weekNum}/${d.getFullYear()}`;
}

function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[d.getMonth()]}/${d.getFullYear()}`;
}

export function groupReports(
  records: DailyRecord[],
  filter: PeriodFilter,
  custoFixoDiario = 0
): ReportItem[] {
  if (records.length === 0) return [];

  const sorted = [...records].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  if (filter === "DAY") {
    return sorted.map((r) => ({
      period: r.date,
      totalProfit: r.ganho - r.custo,
      totalLiquid: r.ganho - r.custo - custoFixoDiario,
      totalKm: r.kmRodado,
      totalCost: r.custo,
      totalGanho: r.ganho,
      count: 1,
    }));
  }

  const groups = new Map<string, { profit: number; liquid: number; km: number; cost: number; ganho: number; count: number }>();

  for (const r of sorted) {
    let key: string;
    if (filter === "WEEK") key = getWeekKey(r.date);
    else if (filter === "MONTH") key = getMonthKey(r.date);
    else key = String(new Date(r.date + "T12:00:00").getFullYear());
    const existing = groups.get(key) || { profit: 0, liquid: 0, km: 0, cost: 0, ganho: 0, count: 0 };
    existing.profit += r.ganho - r.custo;
    existing.liquid += r.ganho - r.custo - custoFixoDiario;
    existing.km += r.kmRodado;
    existing.cost += r.custo;
    existing.ganho += r.ganho;
    existing.count += 1;
    groups.set(key, existing);
  }

  return Array.from(groups.entries()).map(([period, data]) => ({
    period,
    totalProfit: data.profit,
    totalLiquid: data.liquid,
    totalKm: data.km,
    totalCost: data.cost,
    totalGanho: data.ganho,
    count: data.count,
  }));
}
