import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Types ───

export interface SemaforoLimite {
  ruim: number;
  bom: number;
}

export interface RadarGanhosState {
  // Semáforo de Valores
  semaforoEnabled: boolean;
  ganhosPorKm: SemaforoLimite;
  ganhosPorHora: SemaforoLimite;
  notaPassageiro: SemaforoLimite;

  // Ativação e Apps
  uberEnabled: boolean;
  app99Enabled: boolean;
  indriveEnabled: boolean;

  // Ferramentas
  capturaTelaEnabled: boolean;

  // Customização do Pop-up (Overlay)
  overlayGanhosPorKm: boolean;
  overlayGanhosPorHora: boolean;
  overlayGanhosPorMinuto: boolean;
  overlayNotaPassageiro: boolean;
  overlayFontSize: number; // 12-18
  overlayTransparencia: number; // 30-100
  overlayDuracao: number; // 3-10 (segundos)

  // Histórico de chamadas
  historicoChamadas: ChamadaRecord[];

  // Loading
  loaded: boolean;
}

export interface ChamadaRecord {
  id: string;
  app: "uber" | "99" | "indrive";
  valor: number;
  distanciaKm: number;
  tempoMin: number;
  notaPassageiro: number;
  ganhoPorKm: number;
  ganhoPorHora: number;
  corSemaforo: "verde" | "amarelo" | "vermelho";
  timestamp: number;
}

const DEFAULT_STATE: RadarGanhosState = {
  semaforoEnabled: true,
  ganhosPorKm: { ruim: 1.70, bom: 1.90 },
  ganhosPorHora: { ruim: 40.0, bom: 50.0 },
  notaPassageiro: { ruim: 4.80, bom: 4.90 },
  uberEnabled: false,
  app99Enabled: false,
  indriveEnabled: false,
  capturaTelaEnabled: false,
  overlayGanhosPorKm: true,
  overlayGanhosPorHora: true,
  overlayGanhosPorMinuto: true,
  overlayNotaPassageiro: true,
  overlayFontSize: 15,
  overlayTransparencia: 37,
  overlayDuracao: 7,
  historicoChamadas: [],
  loaded: false,
};

// ─── Actions ───

type Action =
  | { type: "LOAD"; payload: Partial<RadarGanhosState> }
  | { type: "SET_SEMAFORO_ENABLED"; payload: boolean }
  | { type: "SET_SEMAFORO_LIMITE"; payload: { metric: "ganhosPorKm" | "ganhosPorHora" | "notaPassageiro"; field: "ruim" | "bom"; value: number } }
  | { type: "SET_APP_ENABLED"; payload: { app: "uber" | "99" | "indrive"; enabled: boolean } }
  | { type: "SET_CAPTURA_TELA"; payload: boolean }
  | { type: "SET_OVERLAY_TOGGLE"; payload: { field: "overlayGanhosPorKm" | "overlayGanhosPorHora" | "overlayGanhosPorMinuto" | "overlayNotaPassageiro"; value: boolean } }
  | { type: "SET_OVERLAY_SLIDER"; payload: { field: "overlayFontSize" | "overlayTransparencia" | "overlayDuracao"; value: number } }
  | { type: "ADD_CHAMADA"; payload: ChamadaRecord }
  | { type: "CLEAR_HISTORICO" };

function reducer(state: RadarGanhosState, action: Action): RadarGanhosState {
  switch (action.type) {
    case "LOAD":
      return { ...state, ...action.payload, loaded: true };
    case "SET_SEMAFORO_ENABLED":
      return { ...state, semaforoEnabled: action.payload };
    case "SET_SEMAFORO_LIMITE":
      return {
        ...state,
        [action.payload.metric]: {
          ...state[action.payload.metric],
          [action.payload.field]: action.payload.value,
        },
      };
    case "SET_APP_ENABLED": {
      const key = action.payload.app === "uber" ? "uberEnabled" : action.payload.app === "99" ? "app99Enabled" : "indriveEnabled";
      return { ...state, [key]: action.payload.enabled };
    }
    case "SET_CAPTURA_TELA":
      return { ...state, capturaTelaEnabled: action.payload };
    case "SET_OVERLAY_TOGGLE":
      return { ...state, [action.payload.field]: action.payload.value };
    case "SET_OVERLAY_SLIDER":
      return { ...state, [action.payload.field]: action.payload.value };
    case "ADD_CHAMADA":
      return { ...state, historicoChamadas: [action.payload, ...state.historicoChamadas] };
    case "CLEAR_HISTORICO":
      return { ...state, historicoChamadas: [] };
    default:
      return state;
  }
}

// ─── Storage ───

const STORAGE_KEY = "@pfp:radar_ganhos";
const HISTORICO_KEY = "@pfp:radar_historico";

async function persistState(state: RadarGanhosState) {
  const { historicoChamadas, loaded, ...settings } = state;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  await AsyncStorage.setItem(HISTORICO_KEY, JSON.stringify(historicoChamadas));
}

async function loadState(): Promise<Partial<RadarGanhosState>> {
  const [settingsRaw, historicoRaw] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEY),
    AsyncStorage.getItem(HISTORICO_KEY),
  ]);
  const settings = settingsRaw ? JSON.parse(settingsRaw) : {};
  const historicoChamadas = historicoRaw ? JSON.parse(historicoRaw) : [];
  return { ...settings, historicoChamadas };
}

// ─── Semáforo helper ───

export function getSemaforoCor(
  value: number,
  limite: SemaforoLimite
): "verde" | "amarelo" | "vermelho" {
  if (value >= limite.bom) return "verde";
  if (value >= limite.ruim) return "amarelo";
  return "vermelho";
}

export const SEMAFORO_COLORS = {
  verde: "#22C55E",
  amarelo: "#FBBF24",
  vermelho: "#EF4444",
} as const;

// ─── Context ───

interface RadarGanhosContextValue {
  state: RadarGanhosState;
  dispatch: React.Dispatch<Action>;
  setSemaforoEnabled: (v: boolean) => void;
  setSemaforoLimite: (metric: "ganhosPorKm" | "ganhosPorHora" | "notaPassageiro", field: "ruim" | "bom", value: number) => void;
  setAppEnabled: (app: "uber" | "99" | "indrive", enabled: boolean) => void;
  setCapturaTelaEnabled: (v: boolean) => void;
  setOverlayToggle: (field: "overlayGanhosPorKm" | "overlayGanhosPorHora" | "overlayGanhosPorMinuto" | "overlayNotaPassageiro", value: boolean) => void;
  setOverlaySlider: (field: "overlayFontSize" | "overlayTransparencia" | "overlayDuracao", value: number) => void;
  addChamada: (record: ChamadaRecord) => void;
  clearHistorico: () => void;
}

const RadarGanhosContext = createContext<RadarGanhosContextValue | null>(null);

export function RadarGanhosProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, DEFAULT_STATE);

  // Load from AsyncStorage on mount
  useEffect(() => {
    loadState().then((data) => {
      dispatch({ type: "LOAD", payload: data });
    });
  }, []);

  // Persist on every state change (after initial load)
  useEffect(() => {
    if (state.loaded) {
      persistState(state);
    }
  }, [state]);

  const setSemaforoEnabled = useCallback((v: boolean) => {
    dispatch({ type: "SET_SEMAFORO_ENABLED", payload: v });
  }, []);

  const setSemaforoLimite = useCallback(
    (metric: "ganhosPorKm" | "ganhosPorHora" | "notaPassageiro", field: "ruim" | "bom", value: number) => {
      dispatch({ type: "SET_SEMAFORO_LIMITE", payload: { metric, field, value } });
    },
    []
  );

  const setAppEnabled = useCallback((app: "uber" | "99" | "indrive", enabled: boolean) => {
    dispatch({ type: "SET_APP_ENABLED", payload: { app, enabled } });
  }, []);

  const setCapturaTelaEnabled = useCallback((v: boolean) => {
    dispatch({ type: "SET_CAPTURA_TELA", payload: v });
  }, []);

  const setOverlayToggle = useCallback(
    (field: "overlayGanhosPorKm" | "overlayGanhosPorHora" | "overlayGanhosPorMinuto" | "overlayNotaPassageiro", value: boolean) => {
      dispatch({ type: "SET_OVERLAY_TOGGLE", payload: { field, value } });
    },
    []
  );

  const setOverlaySlider = useCallback(
    (field: "overlayFontSize" | "overlayTransparencia" | "overlayDuracao", value: number) => {
      dispatch({ type: "SET_OVERLAY_SLIDER", payload: { field, value } });
    },
    []
  );

  const addChamada = useCallback((record: ChamadaRecord) => {
    dispatch({ type: "ADD_CHAMADA", payload: record });
  }, []);

  const clearHistorico = useCallback(() => {
    dispatch({ type: "CLEAR_HISTORICO" });
  }, []);

  return (
    <RadarGanhosContext.Provider
      value={{
        state,
        dispatch,
        setSemaforoEnabled,
        setSemaforoLimite,
        setAppEnabled,
        setCapturaTelaEnabled,
        setOverlayToggle,
        setOverlaySlider,
        addChamada,
        clearHistorico,
      }}
    >
      {children}
    </RadarGanhosContext.Provider>
  );
}

export function useRadarGanhos() {
  const ctx = useContext(RadarGanhosContext);
  if (!ctx) throw new Error("useRadarGanhos must be used within RadarGanhosProvider");
  return ctx;
}
