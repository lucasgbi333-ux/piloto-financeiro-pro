import type {
  FixedCostInput,
  FixedCostResult,
  OperationalInput,
  OperationalResult,
  RealCostInput,
  RealCostResult,
  DailyRecord,
  ReportItem,
  PeriodFilter,
} from "./types";

// ===== MÓDULO 1: CUSTOS FIXOS =====
export function calculateFixedCosts(input: FixedCostInput): FixedCostResult {
  // IPVA: divide o valor anual em 12 parcelas mensais
  const ipvaMensal = input.ipvaAnual / 12;

  // Aluguel: converte para mensal conforme periodicidade
  let aluguelMensal = 0;
  if (input.aluguelValor > 0) {
    aluguelMensal =
      input.tipoAluguel === "SEMANAL"
        ? input.aluguelValor * 4.33
        : input.aluguelValor;
  }

  // Seguro: converte para mensal conforme periodicidade
  let seguroMensal = 0;
  if (input.seguroValor > 0) {
    seguroMensal =
      input.tipoSeguro === "ANUAL"
        ? input.seguroValor / 12
        : input.seguroValor;
  }

  // Veículo: financiamento tem prioridade sobre aluguel
  const veiculoCusto =
    input.financiamentoMensal > 0 ? input.financiamentoMensal : aluguelMensal;

  // Total mensal = IPVA + veículo + seguro + internet + outros
  const custoMensalTotal =
    ipvaMensal +
    veiculoCusto +
    seguroMensal +
    input.internetMensal +
    input.outrosCustos;

  const custoAnualTotal = custoMensalTotal * 12;

  // Necessário por dia para cobrir custos mensais (mês = 30 dias)
  const custoDiarioNecessario = custoMensalTotal / 30;

  // Necessário por dia para cobrir custos anuais (ano = 365 dias)
  const custoDiarioAnual = custoAnualTotal / 365;

  return {
    custoMensalTotal,
    custoAnualTotal,
    custoDiarioNecessario,
    custoDiarioAnual,
  };
}

// ===== MÓDULO 2: CUSTO OPERACIONAL =====
export function calculateOperationalCost(input: OperationalInput): OperationalResult {
  // Custo estimado por KM (baseado no preço e autonomia)
  const custoPorKm =
    input.autonomia > 0 ? input.precoCombustivel / input.autonomia : 0;

  // Custo total estimado do dia (sem gasto real)
  const custoTotalDiaEstimado = custoPorKm * input.kmRodadoDia;

  // Custo total REAL do dia:
  // Se o motorista informou o gasto real (abastecimento/recarga), usa esse valor.
  // Caso contrário, usa o estimado.
  const custoTotalDiaReal =
    input.gastoAbastecimento > 0
      ? input.gastoAbastecimento
      : custoTotalDiaEstimado;

  // Lucro líquido do dia = ganho - custo real
  const lucroDia = input.ganhoDia - custoTotalDiaReal;

  // Lucro por KM = lucro do dia / km rodados (usando custo real)
  const lucroPorKm =
    input.kmRodadoDia > 0
      ? lucroDia / input.kmRodadoDia
      : 0;

  // Valor mínimo por KM para aceitar corrida = custo estimado/km + margem desejada
  // (não inclui custos fixos, conforme especificação original)
  const valorMinimoKm = custoPorKm + input.margemDesejadaPorKm;

  return {
    custoPorKm,
    custoTotalDiaEstimado,
    custoTotalDiaReal,
    lucroPorKm,
    lucroDia,
    valorMinimoKm,
  };
}

// ===== MÓDULO 2B: CUSTO REAL (RealCostUseCase) =====
/**
 * Calcula o custo e lucro por KM com base em dados REAIS de abastecimento.
 * Regra: custoPorKmReal = valorAbastecido / kmRodado
 *        lucroPorKmReal = valorPorKmRecebido - custoPorKmReal
 *
 * Validações:
 * - kmRodado <= 0 → erro (evita divisão por zero)
 * - valorAbastecido <= 0 → erro (dados inválidos)
 */
export function calculateRealCost(input: RealCostInput): RealCostResult {
  if (input.kmRodado <= 0) {
    return {
      custoPorKmReal: 0,
      lucroPorKmReal: 0,
      isValid: false,
      errorMessage: "KM rodado deve ser maior que zero.",
    };
  }

  if (input.valorAbastecido <= 0) {
    return {
      custoPorKmReal: 0,
      lucroPorKmReal: 0,
      isValid: false,
      errorMessage: "Valor abastecido deve ser maior que zero.",
    };
  }

  const custoPorKmReal = input.valorAbastecido / input.kmRodado;
  const lucroPorKmReal = input.valorPorKmRecebido - custoPorKmReal;

  return {
    custoPorKmReal,
    lucroPorKmReal,
    isValid: true,
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
