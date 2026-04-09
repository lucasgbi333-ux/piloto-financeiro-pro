import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
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

// ===== STATE =====
interface AppState {
  fixedCostInput: FixedCostInput;
  fixedCostResult: FixedCostResult;
  operationalInput: OperationalInput;
  operationalResult: OperationalResult;
  vehicleProfiles: VehicleProfile[];
  activeVehicleType: VehicleType;
  activeProfile: VehicleProfile;
  dailyRecords: DailyRecord[];
  transactions: Transaction[];
  periodFilter: PeriodFilter;
  reports: ReportItem[];
  dashboard: DashboardState;
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

const defaultOperationalInput: OperationalInput = {
  tipoVeiculo: "COMBUSTAO",
  precoCombustivel: 0,
  autonomia: 0,
  kmRodadoDia: 0,
  ganhoDia: 0,
  margemDesejadaPorKm: 0,
  gastoAbastecimento: 0,
};

function getActiveProfile(profiles: VehicleProfile[], type: VehicleType): VehicleProfile {
  return profiles.find((p) => p.type === type) ?? getDefaultVehicleProfile(type);
}

function computeDashboard(
  fixedResult: FixedCostResult,
  opResult: OperationalResult
): DashboardState {
  return {
    minPerKm: opResult.valorMinimoKm,
    requiredDaily: fixedResult.custoDiarioNecessario,
    // Lucro líquido já descontando os custos fixos diluídos do dia
    dailyProfit: opResult.lucroDiaLiquido,
  };
}

function buildInitialState(): AppState {
  const fixedResult = calculateFixedCosts(defaultFixedInput);
  const defaultProfiles = [
    getDefaultVehicleProfile("COMBUSTAO"),
    getDefaultVehicleProfile("ELETRICO"),
  ];
  const activeType: VehicleType = "COMBUSTAO";
  const activeProfile = getActiveProfile(defaultProfiles, activeType);
  const opResult = calculateOperationalCost(defaultOperationalInput, activeProfile, fixedResult.custoFixoDiario);
  return {
    fixedCostInput: defaultFixedInput,
    fixedCostResult: fixedResult,
    operationalInput: defaultOperationalInput,
    operationalResult: opResult,
    vehicleProfiles: defaultProfiles,
    activeVehicleType: activeType,
    activeProfile,
    dailyRecords: [],
    transactions: [],
    periodFilter: "DAY",
    reports: [],
    dashboard: computeDashboard(fixedResult, opResult),
    loaded: false,
  };
}

// ===== ACTIONS =====
type Action =
  | {
      type: "LOAD_ALL";
      fixedInput: FixedCostInput;
      opInput: OperationalInput;
      records: DailyRecord[];
      transactions: Transaction[];
      vehicleProfiles: VehicleProfile[];
      activeVehicleType: VehicleType;
    }
  | { type: "SET_FIXED_COSTS"; input: FixedCostInput }
  | { type: "SET_OPERATIONAL"; input: OperationalInput }
  | { type: "SET_ACTIVE_VEHICLE_TYPE"; vehicleType: VehicleType }
  | { type: "SAVE_VEHICLE_PROFILE"; profile: VehicleProfile }
  | { type: "ADD_DAILY_RECORD"; record: DailyRecord }
  | { type: "DELETE_DAILY_RECORD"; date: string }
  | { type: "ADD_TRANSACTION"; transaction: Transaction }
  | { type: "SET_PERIOD_FILTER"; filter: PeriodFilter }
  | { type: "RESET_OPERATIONAL" };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "LOAD_ALL": {
      const fi = action.fixedInput;
      const oi = action.opInput;
      const fr = calculateFixedCosts(fi);
      const profiles = action.vehicleProfiles.length > 0
        ? action.vehicleProfiles
        : [getDefaultVehicleProfile("COMBUSTAO"), getDefaultVehicleProfile("ELETRICO")];
      const activeType = action.activeVehicleType;
      const activeProfile = getActiveProfile(profiles, activeType);
      const or2 = calculateOperationalCost(oi, activeProfile, fr.custoFixoDiario);
      const recs = action.records;
      return {
        ...state,
        fixedCostInput: fi,
        fixedCostResult: fr,
        operationalInput: oi,
        operationalResult: or2,
        vehicleProfiles: profiles,
        activeVehicleType: activeType,
        activeProfile,
        dailyRecords: recs,
        transactions: action.transactions,
        reports: groupReports(recs, state.periodFilter, state.fixedCostResult.custoFixoDiario),
        dashboard: computeDashboard(fr, or2),
        loaded: true,
      };
    }
    case "SET_FIXED_COSTS": {
      const fr = calculateFixedCosts(action.input);
      const or2 = calculateOperationalCost(state.operationalInput, state.activeProfile, fr.custoFixoDiario);
      return {
        ...state,
        fixedCostInput: action.input,
        fixedCostResult: fr,
        operationalResult: or2,
        dashboard: computeDashboard(fr, or2),
      };
    }
    case "SET_OPERATIONAL": {
      const or2 = calculateOperationalCost(action.input, state.activeProfile, state.fixedCostResult.custoFixoDiario);
      return {
        ...state,
        operationalInput: action.input,
        operationalResult: or2,
        dashboard: computeDashboard(state.fixedCostResult, or2),
      };
    }
    case "SET_ACTIVE_VEHICLE_TYPE": {
      const activeProfile = getActiveProfile(state.vehicleProfiles, action.vehicleType);
      const or2 = calculateOperationalCost(
        { ...state.operationalInput, tipoVeiculo: action.vehicleType },
        activeProfile,
        state.fixedCostResult.custoFixoDiario
      );
      return {
        ...state,
        activeVehicleType: action.vehicleType,
        activeProfile,
        operationalInput: { ...state.operationalInput, tipoVeiculo: action.vehicleType },
        operationalResult: or2,
        dashboard: computeDashboard(state.fixedCostResult, or2),
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
      const activeProfile = getActiveProfile(profiles, state.activeVehicleType);
      const or2 = calculateOperationalCost(state.operationalInput, activeProfile, state.fixedCostResult.custoFixoDiario);
      return {
        ...state,
        vehicleProfiles: profiles,
        activeProfile,
        operationalResult: or2,
        dashboard: computeDashboard(state.fixedCostResult, or2),
      };
    }
    case "ADD_DAILY_RECORD": {
      const recs = [...state.dailyRecords];
      const idx = recs.findIndex((r) => r.date === action.record.date);
      if (idx >= 0) {
        recs[idx] = { ...action.record, updatedAt: Date.now() };
      } else {
        recs.push(action.record);
      }
      return {
        ...state,
        dailyRecords: recs,
        reports: groupReports(recs, state.periodFilter, state.fixedCostResult.custoFixoDiario),
      };
    }
    case "DELETE_DAILY_RECORD": {
      const recs = state.dailyRecords.filter((r) => r.date !== action.date);
      return {
        ...state,
        dailyRecords: recs,
        reports: groupReports(recs, state.periodFilter, state.fixedCostResult.custoFixoDiario),
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
      // Reseta os campos do dia operacional preservando o tipo de veículo ativo
      const resetInput = { ...defaultOperationalInput, tipoVeiculo: state.operationalInput.tipoVeiculo };
      const or2 = calculateOperationalCost(resetInput, state.activeProfile, state.fixedCostResult.custoFixoDiario);
      return {
        ...state,
        operationalInput: resetInput,
        operationalResult: or2,
        dashboard: computeDashboard(state.fixedCostResult, or2),
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
  removeDailyRecord: (date: string) => void;
  addTransaction: (tx: Transaction) => void;
  setPeriodFilter: (filter: PeriodFilter) => void;
  recordDayWithTransactions: (record: DailyRecord) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialState);

  useEffect(() => {
    (async () => {
      const [fi, oi, recs, txs, profiles, activeType] = await Promise.all([
        loadFixedCosts(),
        loadOperational(),
        loadDailyRecords(),
        loadTransactions(),
        loadVehicleProfiles(),
        loadActiveVehicleType(),
      ]);
      dispatch({
        type: "LOAD_ALL",
        fixedInput: fi || defaultFixedInput,
        opInput: oi || defaultOperationalInput,
        records: recs,
        transactions: txs,
        vehicleProfiles: profiles,
        activeVehicleType: activeType,
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
    saveOperational(input);
  }, []);

  const resetOperational = useCallback(() => {
    dispatch({ type: "RESET_OPERATIONAL" });
    // Persiste com tipoVeiculo atual (o reducer já preserva, mas salvamos após dispatch)
    // Usamos um timeout mínimo para pegar o estado atualizado
    saveOperational({ ...defaultOperationalInput });
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

  const removeDailyRecord = useCallback((date: string) => {
    dispatch({ type: "DELETE_DAILY_RECORD", date });
    deleteDailyRecord(date);
  }, []);

  const addTransaction = useCallback((tx: Transaction) => {
    dispatch({ type: "ADD_TRANSACTION", transaction: tx });
    saveTransaction(tx);
  }, []);

  const setPeriodFilter = useCallback((filter: PeriodFilter) => {
    dispatch({ type: "SET_PERIOD_FILTER", filter });
  }, []);

  const recordDayWithTransactions = useCallback((record: DailyRecord) => {
    dispatch({ type: "ADD_DAILY_RECORD", record });
    saveDailyRecord(record);
    const ganhoTx = createGanhoTransaction(record);
    const custoTx = createCustoTransaction(record);
    dispatch({ type: "ADD_TRANSACTION", transaction: ganhoTx });
    dispatch({ type: "ADD_TRANSACTION", transaction: custoTx });
    saveTransaction(ganhoTx);
    saveTransaction(custoTx);
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
