// ===== CUSTOS FIXOS =====
export type RentalType = "SEMANAL" | "MENSAL";
export type InsuranceType = "MENSAL" | "ANUAL";

export interface FixedCostInput {
  ipvaAnual: number;
  financiamentoMensal: number;
  aluguelValor: number;
  tipoAluguel: RentalType;
  internetMensal: number;
  outrosCustos: number;
  /** Valor do seguro do veículo */
  seguroValor: number;
  /** Periodicidade do seguro: MENSAL ou ANUAL */
  tipoSeguro: InsuranceType;
}

export interface FixedCostResult {
  custoMensalTotal: number;
  custoAnualTotal: number;
  /** Necessário por dia para cobrir custos mensais (total_mensal / 30) */
  custoDiarioNecessario: number;
  /** Necessário por dia para cobrir custos anuais (total_anual / 365) */
  custoDiarioAnual: number;
}

// ===== CUSTO OPERACIONAL =====
export type VehicleType = "COMBUSTAO" | "ELETRICO";

/**
 * Modo de cálculo operacional:
 * - ESTIMATED: baseado em preço do combustível e autonomia (cálculo teórico)
 * - REAL: baseado no valor abastecido real e km rodados (cálculo real)
 */
export type CalculationMode = "ESTIMATED" | "REAL";

/** Inputs específicos do Modo Real */
export interface RealCostInput {
  /** KM rodados no período */
  kmRodado: number;
  /** Valor total gasto no abastecimento ou recarga elétrica */
  valorAbastecido: number;
  /** Valor recebido por KM rodado (ganho total / km) */
  valorPorKmRecebido: number;
}

/** Resultado do Modo Real */
export interface RealCostResult {
  /** Custo real por KM = valorAbastecido / kmRodado */
  custoPorKmReal: number;
  /** Lucro real por KM = valorPorKmRecebido - custoPorKmReal */
  lucroPorKmReal: number;
  /** Indica se os inputs são válidos para cálculo */
  isValid: boolean;
  /** Mensagem de erro se isValid = false */
  errorMessage?: string;
}

export interface OperationalInput {
  tipoVeiculo: VehicleType;
  /** Preço por litro (combustão) ou por kWh (elétrico) */
  precoCombustivel: number;
  /** km por litro (combustão) ou km por kWh (elétrico) */
  autonomia: number;
  kmRodadoDia: number;
  ganhoDia: number;
  margemDesejadaPorKm: number;
  /** Valor real gasto no abastecimento ou recarga elétrica do dia */
  gastoAbastecimento: number;
}

export interface OperationalResult {
  /** Custo estimado por KM (preço / autonomia) */
  custoPorKm: number;
  /** Custo total estimado do dia (custoPorKm × km) */
  custoTotalDiaEstimado: number;
  /** Custo total real do dia — usa gastoAbastecimento se informado, senão estimado */
  custoTotalDiaReal: number;
  /** Lucro por KM calculado com o custo REAL */
  lucroPorKm: number;
  /** Lucro líquido do dia (ganho - custo real) */
  lucroDia: number;
  /** Valor mínimo por KM para aceitar corrida (custoPorKm + margem) */
  valorMinimoKm: number;
}

// ===== RELATÓRIOS =====
export type PeriodFilter = "DAY" | "WEEK" | "MONTH";

export interface DailyRecord {
  date: string; // ISO date string YYYY-MM-DD
  kmRodado: number;
  ganho: number;
  custo: number;
}

export interface ReportItem {
  period: string;
  totalProfit: number;
  totalKm: number;
  totalCost: number;
}

// ===== DASHBOARD =====
export interface DashboardState {
  minPerKm: number;
  requiredDaily: number;
  dailyProfit: number;
}
