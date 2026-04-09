import AsyncStorage from "@react-native-async-storage/async-storage";
import type { FixedCostInput, OperationalInput, DailyRecord } from "./types";

const KEYS = {
  FIXED_COSTS: "@piloto_fixed_costs",
  OPERATIONAL: "@piloto_operational",
  DAILY_RECORDS: "@piloto_daily_records",
};

// ===== CUSTOS FIXOS =====
export async function saveFixedCosts(data: FixedCostInput): Promise<void> {
  await AsyncStorage.setItem(KEYS.FIXED_COSTS, JSON.stringify(data));
}

export async function loadFixedCosts(): Promise<FixedCostInput | null> {
  const raw = await AsyncStorage.getItem(KEYS.FIXED_COSTS);
  return raw ? JSON.parse(raw) : null;
}

// ===== CUSTO OPERACIONAL =====
export async function saveOperational(data: OperationalInput): Promise<void> {
  await AsyncStorage.setItem(KEYS.OPERATIONAL, JSON.stringify(data));
}

export async function loadOperational(): Promise<OperationalInput | null> {
  const raw = await AsyncStorage.getItem(KEYS.OPERATIONAL);
  return raw ? JSON.parse(raw) : null;
}

// ===== REGISTROS DIÁRIOS =====
export async function saveDailyRecord(record: DailyRecord): Promise<void> {
  const records = await loadDailyRecords();
  // Replace if same date exists
  const idx = records.findIndex((r) => r.date === record.date);
  if (idx >= 0) {
    records[idx] = record;
  } else {
    records.push(record);
  }
  await AsyncStorage.setItem(KEYS.DAILY_RECORDS, JSON.stringify(records));
}

export async function loadDailyRecords(): Promise<DailyRecord[]> {
  const raw = await AsyncStorage.getItem(KEYS.DAILY_RECORDS);
  return raw ? JSON.parse(raw) : [];
}
