import AsyncStorage from "@react-native-async-storage/async-storage";
import type { FixedCostInput, OperationalInput, DailyRecord, Transaction, VehicleProfile, VehicleType } from "./types";

const KEYS = {
  FIXED_COSTS: "@piloto_fixed_costs",
  OPERATIONAL: "@piloto_operational",
  DAILY_RECORDS: "@piloto_daily_records",
  TRANSACTIONS: "@piloto_transactions",
  VEHICLE_PROFILES: "@piloto_vehicle_profiles",
  ACTIVE_VEHICLE_TYPE: "@piloto_active_vehicle_type",
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

// ===== REGISTROS DIÁRIOS (upsert por data + migração) =====
export async function saveDailyRecord(record: DailyRecord): Promise<void> {
  const records = await loadDailyRecords();
  const idx = records.findIndex((r) => r.date === record.date);
  const now = Date.now();
  if (idx >= 0) {
    records[idx] = { ...record, updatedAt: now };
  } else {
    records.push(record);
  }
  await AsyncStorage.setItem(KEYS.DAILY_RECORDS, JSON.stringify(records));
}

export async function loadDailyRecords(): Promise<DailyRecord[]> {
  const raw = await AsyncStorage.getItem(KEYS.DAILY_RECORDS);
  if (!raw) return [];
  // Migração: adiciona campos ausentes em registros antigos (sem id/timestamps)
  const records = JSON.parse(raw) as Array<Partial<DailyRecord> & { date: string; kmRodado: number; ganho: number; custo: number }>;
  const now = Date.now();
  return records.map((r) => ({
    id: r.id ?? `${r.date}-${now}`,
    date: r.date,
    kmRodado: r.kmRodado,
    ganho: r.ganho,
    custo: r.custo,
    createdAt: r.createdAt ?? now,
    updatedAt: r.updatedAt ?? now,
  }));
}

export async function deleteDailyRecord(date: string): Promise<void> {
  const records = await loadDailyRecords();
  const filtered = records.filter((r) => r.date !== date);
  await AsyncStorage.setItem(KEYS.DAILY_RECORDS, JSON.stringify(filtered));
}

// ===== TRANSAÇÕES =====
export async function saveTransaction(tx: Transaction): Promise<void> {
  const all = await loadTransactions();
  all.push(tx);
  await AsyncStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(all));
}

export async function loadTransactions(): Promise<Transaction[]> {
  const raw = await AsyncStorage.getItem(KEYS.TRANSACTIONS);
  return raw ? JSON.parse(raw) : [];
}

// ===== PERFIS DE VEÍCULO =====
export async function saveVehicleProfile(profile: VehicleProfile): Promise<void> {
  const all = await loadVehicleProfiles();
  const idx = all.findIndex((p) => p.type === profile.type);
  if (idx >= 0) {
    all[idx] = profile;
  } else {
    all.push(profile);
  }
  await AsyncStorage.setItem(KEYS.VEHICLE_PROFILES, JSON.stringify(all));
}

export async function loadVehicleProfiles(): Promise<VehicleProfile[]> {
  const raw = await AsyncStorage.getItem(KEYS.VEHICLE_PROFILES);
  return raw ? JSON.parse(raw) : [];
}

export async function saveActiveVehicleType(type: VehicleType): Promise<void> {
  await AsyncStorage.setItem(KEYS.ACTIVE_VEHICLE_TYPE, type);
}

export async function loadActiveVehicleType(): Promise<VehicleType> {
  const raw = await AsyncStorage.getItem(KEYS.ACTIVE_VEHICLE_TYPE);
  return (raw as VehicleType) ?? "COMBUSTAO";
}
