import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type {
  FixedCostInput,
  FixedCostResult,
  OperationalInput,
  OperationalResult,
  VehicleProfile,
  VehicleType,
  DailyRecord,
  Transaction,
  ReportItem,
  PeriodFilter,
  DashboardState,
  CaixinhaEntry,
  CaixinhaState,
  CaixinhaConfig,
} from "./types";
import {
  calculateFixedCosts,
  calculateOperationalCost,
  getDefaultVehicleProfile,
  createGanhoTransaction,
  createCustoTransaction,
  createAjusteTransaction,
  groupReports,
} from "./use-cases";
import {
  saveFixedCosts,
  loadFixedCosts,
  saveOperational,
  loadOperational,
  saveDailyRecord,
  loadDailyRecords,
  deleteDailyRecord,
  saveTransaction,
  loadTransactions,
  saveVehicleProfile,
  loadVehicleProfiles,
  saveActiveVehicleType,
  loadActiveVehicleType,
} from "./storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CAIXINHA_KEY = "@pfp:caixinha_entries";
const CAIXINHA_CONFIG_KEY = "@pfp:caixinha_config";
const OP_PROFILES_KEY = "@pfp:op_profiles_v2";

const DEFAULT_CAIXINHA_CONFIG: CaixinhaConfig = {
  percentualManutencao: 5,
  percentualReserva: 5,
};

async function saveCaixinhaEntries(entries: CaixinhaEntry[]): Promise<void> {
  await AsyncStorage.setItem(CAIXINHA_KEY, JSON.stringify(entries));
}

async function loadCaixinhaEntries(): Promise<CaixinhaEntry[]> {
  const raw = await AsyncStorage.getItem(CAIXINHA_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function saveCaixinhaConfig(config: CaixinhaConfig): Promise<void> {
  await AsyncStorage.setItem(CAIXINHA_CONFIG_KEY, JSON.stringify(config));
}

async function loadCaixinhaConfig(): Promise<CaixinhaConfig> {
  const raw = await AsyncStorage.getItem(CAIXINHA_CONFIG_KEY);
  return raw ? JSON.parse(raw) : DEFAULT_CAIXINHA_CONFIG;
}

// ===== PERFIS OPERACIONAIS SEPARADOS =====
export interface OperationalProfiles {
  COMBUSTAO: OperationalInput;
  ELETRICO: OperationalInput;
}

const defaultCombustaoInput: OperationalInput = {
  tipoVeiculo: "COMBUSTAO",
  precoCombustivel: 0,
  autonomia: 0,
  kmRodadoDia: 0,
  ganhoDia: 0,
  margemDesejadaPorKm: 0,
  gastoAbastecimento: 0,
};

const defaultEletricoInput: OperationalInput = {
  tipoVeiculo: "ELETRICO",
  precoCombustivel: 0,
  autonomia: 0,
  kmRodadoDia: 0,
  ganhoDia: 0,
  margemDesejadaPorKm: 0,
  gastoAbastecimento: 0,
};

const defaultOperationalProfiles: OperationalProfiles = {
  COMBUSTAO: defaultCombustaoInput,
  ELETRICO: defaultEletricoInput,
};

async function saveOperationalProfiles(profiles: OperationalProfiles): Promise<void> {
  await AsyncStorage.setItem(OP_PROFILES_KEY, JSON.stringify(profiles));
}

async function loadOperationalProfiles(): Promise<OperationalProfiles | null> {
  const raw = await AsyncStorage.getItem(OP_PROFILES_KEY);
  return raw ? JSON.parse(raw) : null;
}

function buildCaixinhaState(entries: CaixinhaEntry[], config: CaixinhaConfig): CaixinhaState {
  const saldoManutencao = entries.reduce((s, e) => s + e.manutencao, 0);
  const saldoReserva = entries.reduce((s, e) => s + e.reserva, 0);
  return {
    config,
    entries,
    saldoManutencao,
    saldoReserva,
    saldoTotal: saldoManutencao + saldoReserva,
  };
}

function createCaixinhaEntry(record: DailyRecord, config: CaixinhaConfig): CaixinhaEntry {
  const manutencao = record.ganho * (config.percentualManutencao / 100);
  const reserva = record.ganho * (config.percentualReserva / 100);
  return {
    id: `caixinha-${record.date}-${Date.now()}`,
    date: record.date,
    ganhoBase: record.ganho,
    manutencao,
    reserva,
    total: manutencao + reserva,
    percentualManutencao: config.percentualManutencao,
    percentualReserva: config.percentualReserva,
  };
}

// ===== STATE =====
interface AppState {
  fixedCostInput: FixedCostInput;
  fixedCostResult: FixedCostResult;
  /** Input ativo (do tipo selecionado) */
  operationalInput: OperationalInput;
  operationalResult: OperationalResult;
  /** Perfis operacionais independentes por tipo */
  operationalProfiles: OperationalProfiles;
  vehicleProfiles: VehicleProfile[];
  activeVehicleType: VehicleType;
  activeProfile: VehicleProfile;
  /** Todos os registros diários (todos os perfis) */
  dailyRecords: DailyRecord[];
  /** Registros filtrados por perfil Combustão */
  dailyRecordsCombustao: DailyRecord[];
  /** Registros filtrados por perfil Elétrico */
  dailyRecordsEletrico: DailyRecord[];
  transactions: Transaction[];
  periodFilter: PeriodFilter;
  reports: ReportItem[];
  /** Relatórios separados por perfil */
  reportsCombustao: ReportItem[];
  reportsEletrico: ReportItem[];
  dashboard: DashboardState;
  caixinha: CaixinhaState;
  loaded: boolean;
}

const defaultFixedInput: FixedCostInput = {
  ipvaAnual: 0,
  financiamentoMensal: 0,
  aluguelValor: 0,
  tipoAluguel: "MENSAL",
  internetMensal: 0,
  outrosCustos: 0,
  seguroValor: 0,
  tipoSeguro: "ANUAL",
};

function getActiveVehicleProfile(profiles: VehicleProfile[], type: VehicleType): VehicleProfile {
  return profiles.find((p) => p.type === type) ?? getDefaultVehicleProfile(type);
}

function computeDashboard(
  fixedResult: FixedCostResult,
  opResult: OperationalResult,
  caixinha: CaixinhaState,
  lastRecord?: DailyRecord
): DashboardState {
  const pct = (caixinha.config.percentualManutencao + caixinha.config.percentualReserva) / 100;
  const caixinhaDesconto = lastRecord ? lastRecord.ganho * pct : 0;
  const lucroDiaLiquidoComCaixinha = opResult.lucroDiaLiquido - caixinhaDesconto;
  return {
    minPerKm: opResult.valorMinimoKm,
    requiredDaily: fixedResult.custoDiarioNecessario,
    dailyProfit: opResult.lucroDiaLiquido,
    caixinhaDesconto,
    lucroDiaLiquidoComCaixinha,
  };
}

function buildInitialState(): AppState {
  const fixedResult = calculateFixedCosts(defaultFixedInput);
  const defaultVehicleProfiles = [
    getDefaultVehicleProfile("COMBUSTAO"),
    getDefaultVehicleProfile("ELETRICO"),
  ];
  const activeType: VehicleType = "COMBUSTAO";
  const activeProfile = getActiveVehicleProfile(defaultVehicleProfiles, activeType);
  const opResult = calculateOperationalCost(defaultCombustaoInput, activeProfile, fixedResult.custoFixoDiario);
  const caixinha = buildCaixinhaState([], DEFAULT_CAIXINHA_CONFIG);
  return {
    fixedCostInput: defaultFixedInput,
    fixedCostResult: fixedResult,
    operationalInput: defaultCombustaoInput,
    operationalResult: opResult,
    operationalProfiles: defaultOperationalProfiles,
    vehicleProfiles: defaultVehicleProfiles,
    activeVehicleType: activeType,
    activeProfile,
    dailyRecords: [],
    dailyRecordsCombustao: [],
    dailyRecordsEletrico: [],
    transactions: [],
    periodFilter: "DAY",
    reports: [],
    reportsCombustao: [],
    reportsEletrico: [],
    dashboard: computeDashboard(fixedResult, opResult, caixinha),
    caixinha,
    loaded: false,
  };
}

// ===== ACTIONS =====
type Action =
  | {
      type: "LOAD_ALL";
      fixedInput: FixedCostInput;
      opProfiles: OperationalProfiles;
      records: DailyRecord[];
      transactions: Transaction[];
      vehicleProfiles: VehicleProfile[];
      activeVehicleType: VehicleType;
      caixinhaEntries: CaixinhaEntry[];
      caixinhaConfig: CaixinhaConfig;
    }
  | { type: "SET_FIXED_COSTS"; input: FixedCostInput }
  | { type: "SET_OPERATIONAL"; input: OperationalInput }
  | { type: "SET_ACTIVE_VEHICLE_TYPE"; vehicleType: VehicleType }
  | { type: "SAVE_VEHICLE_PROFILE"; profile: VehicleProfile }
  | { type: "ADD_DAILY_RECORD"; record: DailyRecord }
  | { type: "DELETE_DAILY_RECORD"; date: string; vehicleType: VehicleType }
  | { type: "ADD_TRANSACTION"; transaction: Transaction }
  | { type: "SET_PERIOD_FILTER"; filter: PeriodFilter }
  | { type: "RESET_OPERATIONAL" }
  | { type: "ADD_CAIXINHA_ENTRY"; entry: CaixinhaEntry }
  | { type: "DELETE_CAIXINHA_ENTRY"; date: string }
  | { type: "SET_CAIXINHA_CONFIG"; config: CaixinhaConfig };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "LOAD_ALL": {
      const fi = action.fixedInput;
      const fr = calculateFixedCosts(fi);
      const profiles = action.vehicleProfiles.length > 0
        ? action.vehicleProfiles
        : [getDefaultVehicleProfile("COMBUSTAO"), getDefaultVehicleProfile("ELETRICO")];
      const activeType = action.activeVehicleType;
      const activeProfile = getActiveVehicleProfile(profiles, activeType);
      const opProfiles = action.opProfiles;
      const activeOpInput = opProfiles[activeType];
      const or2 = calculateOperationalCost(activeOpInput, activeProfile, fr.custoFixoDiario);
      const recs = action.records;
      const recsCombustao = recs.filter((r) => r.vehicleType === "COMBUSTAO");
      const recsEletrico = recs.filter((r) => r.vehicleType === "ELETRICO");
      const caixinha = buildCaixinhaState(action.caixinhaEntries, action.caixinhaConfig);
      const lastRecord = recs.length > 0 ? recs[recs.length - 1] : undefined;
      return {
        ...state,
        fixedCostInput: fi,
        fixedCostResult: fr,
        operationalInput: activeOpInput,
        operationalResult: or2,
        operationalProfiles: opProfiles,
        vehicleProfiles: profiles,
        activeVehicleType: activeType,
        activeProfile,
        dailyRecords: recs,
        dailyRecordsCombustao: recsCombustao,
        dailyRecordsEletrico: recsEletrico,
        transactions: action.transactions,
        reports: groupReports(recs, state.periodFilter, fr.custoFixoDiario),
        reportsCombustao: groupReports(recsCombustao, state.periodFilter, fr.custoFixoDiario),
        reportsEletrico: groupReports(recsEletrico, state.periodFilter, fr.custoFixoDiario),
        dashboard: computeDashboard(fr, or2, caixinha, lastRecord),
        caixinha,
        loaded: true,
      };
    }
    case "SET_FIXED_COSTS": {
      const fr = calculateFixedCosts(action.input);
      const or2 = calculateOperationalCost(state.operationalInput, state.activeProfile, fr.custoFixoDiario);
      const lastRecord = state.dailyRecords.length > 0 ? state.dailyRecords[state.dailyRecords.length - 1] : undefined;
      return {
        ...state,
        fixedCostInput: action.input,
        fixedCostResult: fr,
        operationalResult: or2,
        dashboard: computeDashboard(fr, or2, state.caixinha, lastRecord),
      };
    }
    case "SET_OPERATIONAL": {
      const or2 = calculateOperationalCost(action.input, state.activeProfile, state.fixedCostResult.custoFixoDiario);
      const lastRecord = state.dailyRecords.length > 0 ? state.dailyRecords[state.dailyRecords.length - 1] : undefined;
      // Atualiza o perfil do tipo ativo nos operationalProfiles
      const updatedProfiles: OperationalProfiles = {
        ...state.operationalProfiles,
        [action.input.tipoVeiculo]: action.input,
      };
      return {
        ...state,
        operationalInput: action.input,
        operationalResult: or2,
        operationalProfiles: updatedProfiles,
        dashboard: computeDashboard(state.fixedCostResult, or2, state.caixinha, lastRecord),
      };
    }
    case "SET_ACTIVE_VEHICLE_TYPE": {
      const activeProfile = getActiveVehicleProfile(state.vehicleProfiles, action.vehicleType);
      // Carrega o perfil operacional do tipo selecionado
      const activeOpInput = state.operationalProfiles[action.vehicleType];
      const or2 = calculateOperationalCost(activeOpInput, activeProfile, state.fixedCostResult.custoFixoDiario);
      const lastRecord = state.dailyRecords.length > 0 ? state.dailyRecords[state.dailyRecords.length - 1] : undefined;
      return {
        ...state,
        activeVehicleType: action.vehicleType,
        activeProfile,
        operationalInput: activeOpInput,
        operationalResult: or2,
        dashboard: computeDashboard(state.fixedCostResult, or2, state.caixinha, lastRecord),
      };
    }
    case "SAVE_VEHICLE_PROFILE": {
      const profiles = [...state.vehicleProfiles];
      const idx = profiles.findIndex((p) => p.type === action.profile.type);
      if (idx >= 0) {
        profiles[idx] = action.profile;
      } else {
        profiles.push(action.profile);
      }
      const activeProfile = getActiveVehicleProfile(profiles, state.activeVehicleType);
      const or2 = calculateOperationalCost(state.operationalInput, activeProfile, state.fixedCostResult.custoFixoDiario);
      const lastRecord = state.dailyRecords.length > 0 ? state.dailyRecords[state.dailyRecords.length - 1] : undefined;
      return {
        ...state,
        vehicleProfiles: profiles,
        activeProfile,
        operationalResult: or2,
        dashboard: computeDashboard(state.fixedCostResult, or2, state.caixinha, lastRecord),
      };
    }
    case "ADD_DAILY_RECORD": {
      const recs = [...state.dailyRecords];
      // Upsert por data+vehicleType: cada perfil pode ter um registro por data
      const idx = recs.findIndex((r) => r.date === action.record.date && r.vehicleType === action.record.vehicleType);
      if (idx >= 0) {
        recs[idx] = { ...action.record, updatedAt: Date.now() };
      } else {
        recs.push(action.record);
      }
      const recsCombustao = recs.filter((r) => r.vehicleType === "COMBUSTAO");
      const recsEletrico = recs.filter((r) => r.vehicleType === "ELETRICO");
      const lastRecord = recs[recs.length - 1];
      return {
        ...state,
        dailyRecords: recs,
        dailyRecordsCombustao: recsCombustao,
        dailyRecordsEletrico: recsEletrico,
        reports: groupReports(recs, state.periodFilter, state.fixedCostResult.custoFixoDiario),
        reportsCombustao: groupReports(recsCombustao, state.periodFilter, state.fixedCostResult.custoFixoDiario),
        reportsEletrico: groupReports(recsEletrico, state.periodFilter, state.fixedCostResult.custoFixoDiario),
        dashboard: computeDashboard(state.fixedCostResult, state.operationalResult, state.caixinha, lastRecord),
      };
    }
    case "DELETE_DAILY_RECORD": {
      // Remove por data+vehicleType para não apagar o registro do outro perfil na mesma data
      const recs = state.dailyRecords.filter((r) => !(r.date === action.date && r.vehicleType === action.vehicleType));
      const recsCombustao = recs.filter((r) => r.vehicleType === "COMBUSTAO");
      const recsEletrico = recs.filter((r) => r.vehicleType === "ELETRICO");
      const newEntries = state.caixinha.entries.filter((e) => e.date !== action.date);
      const newCaixinha = buildCaixinhaState(newEntries, state.caixinha.config);
      const lastRecord = recs.length > 0 ? recs[recs.length - 1] : undefined;
      return {
        ...state,
        dailyRecords: recs,
        dailyRecordsCombustao: recsCombustao,
        dailyRecordsEletrico: recsEletrico,
        caixinha: newCaixinha,
        reports: groupReports(recs, state.periodFilter, state.fixedCostResult.custoFixoDiario),
        reportsCombustao: groupReports(recsCombustao, state.periodFilter, state.fixedCostResult.custoFixoDiario),
        reportsEletrico: groupReports(recsEletrico, state.periodFilter, state.fixedCostResult.custoFixoDiario),
        dashboard: computeDashboard(state.fixedCostResult, state.operationalResult, newCaixinha, lastRecord),
      };
    }
    case "ADD_TRANSACTION": {
      return {
        ...state,
        transactions: [...state.transactions, action.transaction],
      };
    }
    case "SET_PERIOD_FILTER": {
      return {
        ...state,
        periodFilter: action.filter,
        reports: groupReports(state.dailyRecords, action.filter, state.fixedCostResult.custoFixoDiario),
      };
    }
    case "RESET_OPERATIONAL": {
      const resetInput: OperationalInput = {
        ...(state.activeVehicleType === "COMBUSTAO" ? defaultCombustaoInput : defaultEletricoInput),
        tipoVeiculo: state.activeVehicleType,
      };
      const or2 = calculateOperationalCost(resetInput, state.activeProfile, state.fixedCostResult.custoFixoDiario);
      const lastRecord = state.dailyRecords.length > 0 ? state.dailyRecords[state.dailyRecords.length - 1] : undefined;
      const updatedProfiles: OperationalProfiles = {
        ...state.operationalProfiles,
        [state.activeVehicleType]: resetInput,
      };
      return {
        ...state,
        operationalInput: resetInput,
        operationalResult: or2,
        operationalProfiles: updatedProfiles,
        dashboard: computeDashboard(state.fixedCostResult, or2, state.caixinha, lastRecord),
      };
    }
    case "ADD_CAIXINHA_ENTRY": {
      const entries = [...state.caixinha.entries];
      const idx = entries.findIndex((e) => e.date === action.entry.date);
      if (idx >= 0) {
        entries[idx] = action.entry;
      } else {
        entries.push(action.entry);
      }
      const newCaixinha = buildCaixinhaState(entries, state.caixinha.config);
      const lastRecord = state.dailyRecords.length > 0 ? state.dailyRecords[state.dailyRecords.length - 1] : undefined;
      return {
        ...state,
        caixinha: newCaixinha,
        dashboard: computeDashboard(state.fixedCostResult, state.operationalResult, newCaixinha, lastRecord),
      };
    }
    case "DELETE_CAIXINHA_ENTRY": {
      const entries = state.caixinha.entries.filter((e) => e.date !== action.date);
      const newCaixinha = buildCaixinhaState(entries, state.caixinha.config);
      const lastRecord = state.dailyRecords.length > 0 ? state.dailyRecords[state.dailyRecords.length - 1] : undefined;
      return {
        ...state,
        caixinha: newCaixinha,
        dashboard: computeDashboard(state.fixedCostResult, state.operationalResult, newCaixinha, lastRecord),
      };
    }
    case "SET_CAIXINHA_CONFIG": {
      const newCaixinha = buildCaixinhaState(state.caixinha.entries, action.config);
      const lastRecord = state.dailyRecords.length > 0 ? state.dailyRecords[state.dailyRecords.length - 1] : undefined;
      return {
        ...state,
        caixinha: newCaixinha,
        dashboard: computeDashboard(state.fixedCostResult, state.operationalResult, newCaixinha, lastRecord),
      };
    }
    default:
      return state;
  }
}

// ===== CONTEXT =====
interface AppContextValue {
  state: AppState;
  setFixedCosts: (input: FixedCostInput) => void;
  setOperational: (input: OperationalInput) => void;
  resetOperational: () => void;
  setActiveVehicleType: (type: VehicleType) => void;
  saveVehicleProfileAction: (profile: VehicleProfile) => void;
  addDailyRecord: (record: DailyRecord) => void;
  removeDailyRecord: (date: string, vehicleType: VehicleType) => void;
  addTransaction: (tx: Transaction) => void;
  setPeriodFilter: (filter: PeriodFilter) => void;
  recordDayWithTransactions: (record: DailyRecord) => void;
  deleteCaixinhaEntry: (date: string) => void;
  setCaixinhaConfig: (config: CaixinhaConfig) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialState);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    (async () => {
      const [fi, recs, txs, vehicleProfiles, activeType, caixinhaEntries, caixinhaConfig, savedOpProfiles] =
        await Promise.all([
          loadFixedCosts(),
          loadDailyRecords(),
          loadTransactions(),
          loadVehicleProfiles(),
          loadActiveVehicleType(),
          loadCaixinhaEntries(),
          loadCaixinhaConfig(),
          loadOperationalProfiles(),
        ]);

      // Migração: se existir o input antigo mas não os novos perfis, usa-o para o tipo ativo
      let opProfiles = savedOpProfiles ?? defaultOperationalProfiles;
      if (!savedOpProfiles) {
        const legacyOp = await loadOperational();
        if (legacyOp) {
          opProfiles = {
            ...defaultOperationalProfiles,
            [legacyOp.tipoVeiculo]: legacyOp,
          };
        }
      }

      dispatch({
        type: "LOAD_ALL",
        fixedInput: fi || defaultFixedInput,
        opProfiles,
        records: recs,
        transactions: txs,
        vehicleProfiles,
        activeVehicleType: activeType,
        caixinhaEntries,
        caixinhaConfig,
      });
    })();
  }, []);

  const setFixedCosts = useCallback((input: FixedCostInput) => {
    dispatch({ type: "SET_FIXED_COSTS", input });
    saveFixedCosts(input);
    const fr = calculateFixedCosts(input);
    const tx = createAjusteTransaction(fr.custoMensalTotal, "Atualização de custos fixos");
    dispatch({ type: "ADD_TRANSACTION", transaction: tx });
    saveTransaction(tx);
  }, []);

  const setOperational = useCallback((input: OperationalInput) => {
    dispatch({ type: "SET_OPERATIONAL", input });
    // Salva o perfil atualizado nos perfis separados
    const current = stateRef.current;
    const updatedProfiles: OperationalProfiles = {
      ...current.operationalProfiles,
      [input.tipoVeiculo]: input,
    };
    saveOperationalProfiles(updatedProfiles);
    saveOperational(input); // mantém compatibilidade
  }, []);

  const resetOperational = useCallback(() => {
    dispatch({ type: "RESET_OPERATIONAL" });
    const current = stateRef.current;
    const resetInput: OperationalInput = {
      ...(current.activeVehicleType === "COMBUSTAO" ? defaultCombustaoInput : defaultEletricoInput),
      tipoVeiculo: current.activeVehicleType,
    };
    const updatedProfiles: OperationalProfiles = {
      ...current.operationalProfiles,
      [current.activeVehicleType]: resetInput,
    };
    saveOperationalProfiles(updatedProfiles);
    saveOperational(resetInput);
  }, []);

  const setActiveVehicleType = useCallback((type: VehicleType) => {
    dispatch({ type: "SET_ACTIVE_VEHICLE_TYPE", vehicleType: type });
    saveActiveVehicleType(type);
  }, []);

  const saveVehicleProfileAction = useCallback((profile: VehicleProfile) => {
    dispatch({ type: "SAVE_VEHICLE_PROFILE", profile });
    saveVehicleProfile(profile);
  }, []);

  const addDailyRecord = useCallback((record: DailyRecord) => {
    dispatch({ type: "ADD_DAILY_RECORD", record });
    saveDailyRecord(record);
  }, []);

  const removeDailyRecord = useCallback((date: string, vehicleType: VehicleType) => {
    dispatch({ type: "DELETE_DAILY_RECORD", date, vehicleType });
    // Remove apenas o registro do perfil correto no storage
    loadDailyRecords().then((recs) => {
      const filtered = recs.filter((r) => !(r.date === date && r.vehicleType === vehicleType));
      AsyncStorage.setItem("@piloto_daily_records", JSON.stringify(filtered));
    });
    loadCaixinhaEntries().then((entries) => {
      const updated = entries.filter((e) => e.date !== date);
      saveCaixinhaEntries(updated);
    });
  }, []);

  const addTransaction = useCallback((tx: Transaction) => {
    dispatch({ type: "ADD_TRANSACTION", transaction: tx });
    saveTransaction(tx);
  }, []);

  const setPeriodFilter = useCallback((filter: PeriodFilter) => {
    dispatch({ type: "SET_PERIOD_FILTER", filter });
  }, []);

  const recordDayWithTransactions = useCallback(
    (record: DailyRecord) => {
      dispatch({ type: "ADD_DAILY_RECORD", record });
      saveDailyRecord(record);
      const ganhoTx = createGanhoTransaction(record);
      const custoTx = createCustoTransaction(record);
      dispatch({ type: "ADD_TRANSACTION", transaction: ganhoTx });
      dispatch({ type: "ADD_TRANSACTION", transaction: custoTx });
      saveTransaction(ganhoTx);
      saveTransaction(custoTx);
      const config = stateRef.current.caixinha.config;
      const entry = createCaixinhaEntry(record, config);
      dispatch({ type: "ADD_CAIXINHA_ENTRY", entry });
      loadCaixinhaEntries().then((entries) => {
        const idx = entries.findIndex((e) => e.date === entry.date);
        if (idx >= 0) entries[idx] = entry; else entries.push(entry);
        saveCaixinhaEntries(entries);
      });
    },
    []
  );

  const deleteCaixinhaEntry = useCallback((date: string) => {
    dispatch({ type: "DELETE_CAIXINHA_ENTRY", date });
    loadCaixinhaEntries().then((entries) => {
      const updated = entries.filter((e) => e.date !== date);
      saveCaixinhaEntries(updated);
    });
  }, []);

  const setCaixinhaConfig = useCallback((config: CaixinhaConfig) => {
    dispatch({ type: "SET_CAIXINHA_CONFIG", config });
    saveCaixinhaConfig(config);
  }, []);

  return (
    <AppContext.Provider
      value={{
        state,
        setFixedCosts,
        setOperational,
        resetOperational,
        setActiveVehicleType,
        saveVehicleProfileAction,
        addDailyRecord,
        removeDailyRecord,
        addTransaction,
        setPeriodFilter,
        recordDayWithTransactions,
        deleteCaixinhaEntry,
        setCaixinhaConfig,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
