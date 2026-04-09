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
  /** Custo fixo diluído por dia = (mensal÷30) + (anual÷12÷30) */
  custoFixoDiario: number;
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
  /** custoPorKm + custoFixoPorKm (fixos diluídos por km rodado) */
  custoPorKmTotal: number;
  custoTotalDiaEstimado: number;
  custoTotalDiaReal: number;
  lucroPorKm: number;
  /** Lucro já descontando custos fixos diluídos do dia */
  lucroDiaLiquido: number;
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
export type PeriodFilter = "DAY" | "WEEK" | "MONTH" | "YEAR";

export interface ReportItem {
  period: string;
  totalProfit: number;
  /** Lucro já descontando custos fixos diluídos */
  totalLiquid?: number;
  totalKm: number;
  totalCost: number;
  totalGanho?: number;
  count?: number;
}

// ===== CAIXINHA =====
export interface CaixinhaConfig {
  /** Percentual para manutenção (0-100), padrão 5 */
  percentualManutencao: number;
  /** Percentual para reserva de emergência (0-100), padrão 5 */
  percentualReserva: number;
}

export interface CaixinhaEntry {
  id: string;
  date: string; // YYYY-MM-DD
  ganhoBase: number; // valor bruto do dia
  manutencao: number; // % configurado do ganho bruto
  reserva: number; // % configurado do ganho bruto
  total: number; // soma dos dois
  percentualManutencao: number; // % usado no momento do lançamento
  percentualReserva: number; // % usado no momento do lançamento
}

export interface CaixinhaState {
  config: CaixinhaConfig;
  entries: CaixinhaEntry[];
  saldoManutencao: number;
  saldoReserva: number;
  saldoTotal: number;
}

// ===== DASHBOARD =====
export interface DashboardState {
  minPerKm: number;
  requiredDaily: number;
  dailyProfit: number;
  /** Desconto da caixinha do último dia lançado (10% do bruto) */
  caixinhaDesconto: number;
  /** Lucro líquido já descontando caixinha */
  lucroDiaLiquidoComCaixinha: number;
}
