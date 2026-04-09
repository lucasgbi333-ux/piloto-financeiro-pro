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

  return { custoMensalTotal, custoAnualTotal, custoDiarioNecessario, custoDiarioAnual };
}

// ===== MÓDULO 2: CUSTO OPERACIONAL =====
/**
 * Calcula custo operacional. Aceita um VehicleProfile opcional para preencher
 * automaticamente preço e autonomia a partir do perfil ativo.
 */
export function calculateOperationalCost(
  input: OperationalInput,
  profile?: VehicleProfile
): OperationalResult {
  // Se perfil ativo fornecido, usa seus valores como base (input pode sobrescrever)
  const preco = input.precoCombustivel > 0 ? input.precoCombustivel : (profile?.precoEnergia ?? 0);
  const autonomia = input.autonomia > 0 ? input.autonomia : (profile?.autonomia ?? 0);
  const margem = input.margemDesejadaPorKm > 0 ? input.margemDesejadaPorKm : (profile?.margemDesejada ?? 0);

  const custoPorKm = autonomia > 0 ? preco / autonomia : 0;
  const custoTotalDiaEstimado = custoPorKm * input.kmRodadoDia;

  const custoTotalDiaReal =
    input.gastoAbastecimento > 0
      ? input.gastoAbastecimento
      : custoTotalDiaEstimado;

  const lucroDia = input.ganhoDia - custoTotalDiaReal;
  const lucroPorKm = input.kmRodadoDia > 0 ? lucroDia / input.kmRodadoDia : 0;
  const valorMinimoKm = custoPorKm + margem;

  return {
    custoPorKm,
    custoTotalDiaEstimado,
    custoTotalDiaReal,
    lucroPorKm,
    lucroDia,
    valorMinimoKm,
  };
}

// ===== MÓDULO 3: PERFIS DE VEÍCULO =====
/** Perfis padrão para cada tipo de veículo */
export function getDefaultVehicleProfile(type: "COMBUSTAO" | "ELETRICO"): VehicleProfile {
  if (type === "COMBUSTAO") {
    return { id: "combustao", type: "COMBUSTAO", precoEnergia: 0, autonomia: 0, margemDesejada: 0 };
  }
  return { id: "eletrico", type: "ELETRICO", precoEnergia: 0, autonomia: 0, margemDesejada: 0 };
}

// ===== MÓDULO 4: TRANSAÇÕES =====
/** Cria uma transação de ganho a partir de um registro diário */
export function createGanhoTransaction(record: DailyRecord): Transaction {
  return {
    id: `ganho-${record.date}-${Date.now()}`,
    type: "GANHO" as TransactionType,
    amount: record.ganho,
    date: Date.now(),
    description: `Ganho do dia ${record.date}`,
  };
}

/** Cria uma transação de custo a partir de um registro diário */
export function createCustoTransaction(record: DailyRecord): Transaction {
  return {
    id: `custo-${record.date}-${Date.now()}`,
    type: "CUSTO" as TransactionType,
    amount: record.custo,
    date: Date.now(),
    description: `Custo do dia ${record.date}`,
  };
}

/** Cria uma transação de ajuste de custo fixo */
export function createAjusteTransaction(amount: number, description: string): Transaction {
  return {
    id: `ajuste-${Date.now()}`,
    type: "AJUSTE" as TransactionType,
    amount,
    date: Date.now(),
    description,
  };
}

// ===== MÓDULO 5: RELATÓRIOS (baseados em dados reais do histórico) =====
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

/**
 * Agrupa registros diários reais por período.
 * Usa exclusivamente dados do histórico (DailyRecord[]) — não dados temporários de tela.
 */
export function groupReports(records: DailyRecord[], filter: PeriodFilter): ReportItem[] {
  if (records.length === 0) return [];

  const sorted = [...records].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  if (filter === "DAY") {
    return sorted.map((r) => ({
      period: r.date,
      totalProfit: r.ganho - r.custo,
      totalKm: r.kmRodado,
      totalCost: r.custo,
    }));
  }

  const groups = new Map<string, { profit: number; km: number; cost: number }>();

  for (const r of sorted) {
    const key = filter === "WEEK" ? getWeekKey(r.date) : getMonthKey(r.date);
    const existing = groups.get(key) || { profit: 0, km: 0, cost: 0 };
    existing.profit += r.ganho - r.custo;
    existing.km += r.kmRodado;
    existing.cost += r.custo;
    groups.set(key, existing);
  }

  return Array.from(groups.entries()).map(([period, data]) => ({
    period,
    totalProfit: data.profit,
    totalKm: data.km,
    totalCost: data.cost,
  }));
}
