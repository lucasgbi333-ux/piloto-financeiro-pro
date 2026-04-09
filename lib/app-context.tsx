import React, { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from "react";
import type {
  FixedCostInput,
  FixedCostResult,
  OperationalInput,
  OperationalResult,
  RealCostInput,
  RealCostResult,
  CalculationMode,
  DailyRecord,
  ReportItem,
  PeriodFilter,
  DashboardState,
} from "./types";
import {
  calculateFixedCosts,
  calculateOperationalCost,
  calculateRealCost,
  groupReports,
} from "./use-cases";
import {
  saveFixedCosts,
  loadFixedCosts,
  saveOperational,
  loadOperational,
  saveDailyRecord,
  loadDailyRecords,
} from "./storage";

// ===== STATE =====
interface AppState {
  fixedCostInput: FixedCostInput;
  fixedCostResult: FixedCostResult;
  operationalInput: OperationalInput;
  operationalResult: OperationalResult;
  /** Modo de cálculo ativo: ESTIMATED (padrão) ou REAL */
  calculationMode: CalculationMode;
  /** Inputs do Modo Real */
  realCostInput: RealCostInput;
  /** Resultado do Modo Real */
  realCostResult: RealCostResult;
  dailyRecords: DailyRecord[];
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

const defaultRealCostInput: RealCostInput = {
  kmRodado: 0,
  valorAbastecido: 0,
  valorPorKmRecebido: 0,
};

function computeDashboard(
  fixedResult: FixedCostResult,
  opResult: OperationalResult,
  opInput: OperationalInput
): DashboardState {
  return {
    minPerKm: opResult.valorMinimoKm,
    requiredDaily: fixedResult.custoDiarioNecessario,
    dailyProfit: opResult.lucroDia,
  };
}

function buildInitialState(): AppState {
  const fixedResult = calculateFixedCosts(defaultFixedInput);
  const opResult = calculateOperationalCost(defaultOperationalInput);
  const realResult = calculateRealCost(defaultRealCostInput);
  return {
    fixedCostInput: defaultFixedInput,
    fixedCostResult: fixedResult,
    operationalInput: defaultOperationalInput,
    operationalResult: opResult,
    calculationMode: "ESTIMATED",
    realCostInput: defaultRealCostInput,
    realCostResult: realResult,
    dailyRecords: [],
    periodFilter: "DAY",
    reports: [],
    dashboard: computeDashboard(fixedResult, opResult, defaultOperationalInput),
    loaded: false,
  };
}

// ===== ACTIONS =====
type Action =
  | { type: "LOAD_ALL"; fixedInput: FixedCostInput; opInput: OperationalInput; records: DailyRecord[] }
  | { type: "SET_FIXED_COSTS"; input: FixedCostInput }
  | { type: "SET_OPERATIONAL"; input: OperationalInput }
  | { type: "SET_CALCULATION_MODE"; mode: CalculationMode }
  | { type: "SET_REAL_COST_INPUT"; input: RealCostInput }
  | { type: "ADD_DAILY_RECORD"; record: DailyRecord }
  | { type: "SET_PERIOD_FILTER"; filter: PeriodFilter };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "LOAD_ALL": {
      const fi = action.fixedInput;
      const oi = action.opInput;
      const fr = calculateFixedCosts(fi);
      const or2 = calculateOperationalCost(oi);
      const recs = action.records;
      return {
        ...state,
        fixedCostInput: fi,
        fixedCostResult: fr,
        operationalInput: oi,
        operationalResult: or2,
        dailyRecords: recs,
        reports: groupReports(recs, state.periodFilter),
        dashboard: computeDashboard(fr, or2, oi),
        loaded: true,
      };
    }
    case "SET_FIXED_COSTS": {
      const fr = calculateFixedCosts(action.input);
      return {
        ...state,
        fixedCostInput: action.input,
        fixedCostResult: fr,
        dashboard: computeDashboard(fr, state.operationalResult, state.operationalInput),
      };
    }
    case "SET_OPERATIONAL": {
      const or2 = calculateOperationalCost(action.input);
      return {
        ...state,
        operationalInput: action.input,
        operationalResult: or2,
        dashboard: computeDashboard(state.fixedCostResult, or2, action.input),
      };
    }
    case "SET_CALCULATION_MODE": {
      // Apenas altera o modo; os cálculos já estão disponíveis em ambos os states
      return {
        ...state,
        calculationMode: action.mode,
      };
    }
    case "SET_REAL_COST_INPUT": {
      const realResult = calculateRealCost(action.input);
      return {
        ...state,
        realCostInput: action.input,
        realCostResult: realResult,
      };
    }
    case "ADD_DAILY_RECORD": {
      const recs = [...state.dailyRecords];
      const idx = recs.findIndex((r) => r.date === action.record.date);
      if (idx >= 0) {
        recs[idx] = action.record;
      } else {
        recs.push(action.record);
      }
      return {
        ...state,
        dailyRecords: recs,
        reports: groupReports(recs, state.periodFilter),
      };
    }
    case "SET_PERIOD_FILTER": {
      return {
        ...state,
        periodFilter: action.filter,
        reports: groupReports(state.dailyRecords, action.filter),
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
  /** Alterna entre modo Estimado e modo Real */
  setCalculationMode: (mode: CalculationMode) => void;
  /** Atualiza os inputs do Modo Real e recalcula */
  setRealCostInput: (input: RealCostInput) => void;
  addDailyRecord: (record: DailyRecord) => void;
  setPeriodFilter: (filter: PeriodFilter) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialState);

  // Load from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      const [fi, oi, recs] = await Promise.all([
        loadFixedCosts(),
        loadOperational(),
        loadDailyRecords(),
      ]);
      dispatch({
        type: "LOAD_ALL",
        fixedInput: fi || defaultFixedInput,
        opInput: oi || defaultOperationalInput,
        records: recs,
      });
    })();
  }, []);

  const setFixedCosts = useCallback((input: FixedCostInput) => {
    dispatch({ type: "SET_FIXED_COSTS", input });
    saveFixedCosts(input);
  }, []);

  const setOperational = useCallback((input: OperationalInput) => {
    dispatch({ type: "SET_OPERATIONAL", input });
    saveOperational(input);
  }, []);

  const setCalculationMode = useCallback((mode: CalculationMode) => {
    dispatch({ type: "SET_CALCULATION_MODE", mode });
  }, []);

  const setRealCostInput = useCallback((input: RealCostInput) => {
    dispatch({ type: "SET_REAL_COST_INPUT", input });
  }, []);

  const addDailyRecord = useCallback((record: DailyRecord) => {
    dispatch({ type: "ADD_DAILY_RECORD", record });
    saveDailyRecord(record);
  }, []);

  const setPeriodFilter = useCallback((filter: PeriodFilter) => {
    dispatch({ type: "SET_PERIOD_FILTER", filter });
  }, []);

  return (
    <AppContext.Provider
      value={{
        state,
        setFixedCosts,
        setOperational,
        setCalculationMode,
        setRealCostInput,
        addDailyRecord,
        setPeriodFilter,
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
