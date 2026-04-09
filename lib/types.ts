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
  seguroValor: number;
  tipoSeguro: InsuranceType;
}

export interface FixedCostResult {
  custoMensalTotal: number;
  custoAnualTotal: number;
  custoDiarioNecessario: number;
  custoDiarioAnual: number;
}

// ===== PERFIS DE VEÍCULO =====
export type VehicleType = "COMBUSTAO" | "ELETRICO";

/**
 * Perfil de veículo separado por tipo.
 * Combustão e Elétrico têm configurações independentes.
 */
export interface VehicleProfile {
  id: string;
  type: VehicleType;
  /** Preço por litro (combustão) ou por kWh (elétrico) */
  precoEnergia: number;
  /** km/L (combustão) ou km/kWh (elétrico) */
  autonomia: number;
  /** Margem de lucro desejada por KM */
  margemDesejada: number;
}

// ===== CUSTO OPERACIONAL =====
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
  custoPorKm: number;
  custoTotalDiaEstimado: number;
  custoTotalDiaReal: number;
  lucroPorKm: number;
  lucroDia: number;
  valorMinimoKm: number;
}

// ===== REGISTRO DIÁRIO (aprimorado) =====
export interface DailyRecord {
  /** UUID único do registro */
  id: string;
  /** Data no formato YYYY-MM-DD */
  date: string;
  kmRodado: number;
  ganho: number;
  custo: number;
  /** Timestamp de criação (ms) */
  createdAt: number;
  /** Timestamp da última atualização (ms) */
  updatedAt: number;
}

// ===== HISTÓRICO DE TRANSAÇÕES =====
export type TransactionType = "GANHO" | "CUSTO" | "AJUSTE";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  /** Timestamp (ms) */
  date: number;
  description: string;
}

// ===== RELATÓRIOS =====
export type PeriodFilter = "DAY" | "WEEK" | "MONTH";

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
