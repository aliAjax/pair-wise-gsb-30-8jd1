// 回单规则（独立维护，与司机资格、本地台账分开整理）
//
// 1. 配送单记录司机；到站后由司机上报实际过磅吨数、油温、封签。
// 2. 值班员对回单进行确认或退回；退回后司机可修改重新上报。
// 3. 过磅吨数与计划吨数偏差超过 ±2%，或封签破损/缺失，自动生成差异单并挂到该司机。
// 4. 差异单未结清前，该司机不得再排新配送；正常确认后配送单才算“已到站”。

import type { DiscrepancyKind, SealState } from "../types";

export const receiptRules = {
  /** 允许的最大过磅偏差（±），0.02 即 2% */
  deviationLimit: 0.02,
  /** 油温参考范围（仅提醒，不阻断回单） */
  oilTempRange: { min: -10, max: 35 } as const,
  sealStates: ["完整", "破损", "缺失"] as const,
  stages: [
    { name: "司机到站上报", desc: "实际过磅吨数、油温、封签状态与封签号" },
    { name: "值班员审核", desc: "核对磅单与封签，确认或退回并注明原因" },
    { name: "差异处理", desc: "超偏差或封签异常生成差异单挂司机，结清前暂停排班" }
  ]
};

/** 偏差百分比（实际相对计划），如 -2.50 表示短装 2.50%，3.10 表示超装 3.10% */
export function deviationPercent(plannedTons: number, actualTons: number): number {
  if (!plannedTons) return 0;
  return Math.round(((actualTons - plannedTons) / plannedTons) * 10000) / 100;
}

/** 是否超过 ±2% 的允许偏差 */
export function isDeviationOverLimit(plannedTons: number, actualTons: number): boolean {
  return Math.abs(deviationPercent(plannedTons, actualTons)) > receiptRules.deviationLimit * 100;
}

/** 油温是否在参考范围外（仅提醒） */
export function isOilTempAbnormal(oilTemp: number): boolean {
  return oilTemp < receiptRules.oilTempRange.min || oilTemp > receiptRules.oilTempRange.max;
}

function deviationKind(plannedTons: number, actualTons: number): DiscrepancyKind {
  return actualTons < plannedTons ? "短装" : "超装";
}

/** 根据回单数据判定应生成的差异类型；无差异返回空数组 */
export function detectDiscrepancyKinds(
  plannedTons: number,
  actualTons: number,
  sealState: SealState
): DiscrepancyKind[] {
  const kinds: DiscrepancyKind[] = [];
  if (isDeviationOverLimit(plannedTons, actualTons)) {
    kinds.push(deviationKind(plannedTons, actualTons));
  }
  if (sealState !== "完整") {
    kinds.push("封签异常");
  }
  return kinds;
}
