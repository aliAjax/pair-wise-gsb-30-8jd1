import type { DeliveryStatus } from "../types";

// 回单规则、司机资格、本地台账分别使用独立的本地存储键，互不覆盖
export const STORAGE_KEYS = {
  rules: "hxwlfront-19-rules",
  drivers: "hxwlfront-19-drivers",
  ledger: "hxwlfront-19-ledger",
  officer: "hxwlfront-19-officer",
  // 旧版本配送单数据，首次打开时迁移到台账
  legacyRecords: "hxwlfront-19-oil-delivery"
} as const;

export const STATIONS = ["城东站", "机场站", "新区站"] as const;
export const FUELS = ["92号汽油", "95号汽油", "柴油"] as const;
export const SEAL_STATUSES = ["正常", "封签破损", "封签号不符"] as const;

export const STATUSES: DeliveryStatus[] = ["待发车", "运输中", "待回单", "已到站"];

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
