import type {
  FixedCostInput,
  FixedCostResult,
  OperationalInput,
  OperationalResult,
  DailyRecord,
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

  // Financiamento OU aluguel (não ambos)
  const veiculoCusto =
    input.financiamentoMensal > 0
      ? input.financiamentoMensal
      : aluguelMensal;

  const custoMensalTotal =
    ipvaMensal + veiculoCusto + input.internetMensal + input.outrosCustos;

  const custoAnualTotal = custoMensalTotal * 12;
  const custoDiarioNecessario = custoMensalTotal / 30;

  return {
    custoMensalTotal,
    custoAnualTotal,
    custoDiarioNecessario,
  };
}

// ===== MÓDULO 2: CUSTO OPERACIONAL =====
export function calculateOperationalCost(input: OperationalInput): OperationalResult {
  // Custo por KM
  const custoPorKm =
    input.autonomia > 0 ? input.precoCombustivel / input.autonomia : 0;

  // Custo total do dia
  const custoTotalDia = custoPorKm * input.kmRodadoDia;

  // Lucro por KM
  const lucroPorKm =
    input.kmRodadoDia > 0
      ? input.ganhoDia / input.kmRodadoDia - custoPorKm
      : 0;

  // Valor mínimo por KM (COK + margem, SEM custos fixos)
  const valorMinimoKm = custoPorKm + input.margemDesejadaPorKm;

  return {
    custoPorKm,
    custoTotalDia,
    lucroPorKm,
    valorMinimoKm,
  };
}

// ===== MÓDULO 3: RELATÓRIOS =====
function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - startOfYear.getTime();
  const weekNum = Math.ceil((diff / 86400000 + startOfYear.getDay() + 1) / 7);
  return `Sem ${weekNum}/${d.getFullYear()}`;
}

function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const months = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];
  return `${months[d.getMonth()]}/${d.getFullYear()}`;
}

export function groupReports(
  records: DailyRecord[],
  filter: PeriodFilter
): ReportItem[] {
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
