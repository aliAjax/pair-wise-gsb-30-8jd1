import type { DeliveryOrder, DiscrepancyType, ReceiptRules, SealStatus } from "../types";

// 回单规则判定：偏差计算、封签核对、差异单生成，与台账读写解耦

export interface ReceiptReport {
  actualTons: number;
  oilTemp: number | null;
  sealNo: string;
  sealStatus: SealStatus;
}

export interface ReceiptCheck {
  /** 偏差百分比（实际 - 计划）/ 计划 × 100 */
  deviationPct: number;
  /** 是否超差（绝对值超过规则上限） */
  overLimit: boolean;
  /** 封签号与出厂封签不符时强制判为“封签号不符” */
  sealStatus: SealStatus;
  /** 本次回单需要生成的差异类型 */
  types: DiscrepancyType[];
}

export function deviationPct(plannedTons: number, actualTons: number): number {
  if (!plannedTons) return 0;
  return ((actualTons - plannedTons) / plannedTons) * 100;
}

export function checkReceipt(order: DeliveryOrder, report: ReceiptReport, rules: ReceiptRules): ReceiptCheck {
  const pct = deviationPct(order.tons, report.actualTons);
  const overLimit = Math.abs(pct) > rules.deviationLimitPct;
  const sealStatus: SealStatus =
    rules.requireSeal && order.sealNo && report.sealNo && report.sealNo !== order.sealNo
      ? "封签号不符"
      : report.sealStatus;
  const types: DiscrepancyType[] = [];
  if (overLimit) types.push(pct < 0 ? "短装" : "超装");
  if (sealStatus !== "正常") types.push("封签异常");
  return { deviationPct: pct, overLimit, sealStatus, types };
}

export function fmtDateTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtPct(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}
