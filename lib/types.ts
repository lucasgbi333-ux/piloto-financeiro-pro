// ===== CUSTOS FIXOS =====
export type RentalType = "SEMANAL" | "MENSAL";

export interface FixedCostInput {
  ipvaAnual: number;
  financiamentoMensal: number;
  aluguelValor: number;
  tipoAluguel: RentalType;
  internetMensal: number;
  outrosCustos: number;
}

export interface FixedCostResult {
  custoMensalTotal: number;
  custoAnualTotal: number;
  custoDiarioNecessario: number;
}

// ===== CUSTO OPERACIONAL =====
export type VehicleType = "COMBUSTAO" | "ELETRICO";

export interface OperationalInput {
  tipoVeiculo: VehicleType;
  precoCombustivel: number; // ou precoKwh
  autonomia: number; // km/L ou km/kWh
  kmRodadoDia: number;
  ganhoDia: number;
  margemDesejadaPorKm: number;
  /** Valor gasto em abastecimento ou recarga elétrica no dia */
  gastoAbastecimento: number;
}

export interface OperationalResult {
  custoPorKm: number;
  custoTotalDia: number;
  lucroPorKm: number;
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
