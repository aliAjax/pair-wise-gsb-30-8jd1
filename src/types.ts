// 业务类型：配送单、到站回单、差异单、司机

export const DELIVERY_STATUSES = [
  "待发车",
  "运输中",
  "待回单",
  "已退回",
  "已到站"
] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const SEAL_STATES = ["完整", "破损", "缺失"] as const;
export type SealState = (typeof SEAL_STATES)[number];

/** 司机到站上报的回单数据：实际过磅吨数、油温、封签 */
export interface ReceiptReport {
  actualTons: number;
  oilTemp: number;
  sealState: SealState;
  sealNo: string;
  reportedAt: string;
}

/** 值班员确认后的留痕 */
export interface ReceiptConfirmation {
  confirmedAt: string;
  officer: string;
  finalTons: number;
  note: string;
}

export interface Delivery {
  id: string;
  station: string;
  fuel: string;
  /** 计划（装车）吨数 */
  tons: number;
  arriveAt: string;
  status: DeliveryStatus;
  notes: string;
  driverId: string;
  driverName: string;
  createdAt: string;
  departedAt?: string;
  /** 司机最近一次上报的回单 */
  receipt?: ReceiptReport;
  /** 值班员退回原因 */
  returnedReason?: string;
  /** 值班员确认记录；确认后配送单才算“已到站” */
  confirmation?: ReceiptConfirmation;
}

export const DISCREPANCY_KINDS = ["短装", "超装", "封签异常"] as const;
export type DiscrepancyKind = (typeof DISCREPANCY_KINDS)[number];

export type DiscrepancyStatus = "未结" | "已结";

/** 差异单：挂到司机名下，未结清前暂停其新配送 */
export interface Discrepancy {
  id: string;
  deliveryId: string;
  driverId: string;
  driverName: string;
  station: string;
  fuel: string;
  plannedTons: number;
  actualTons: number;
  /** 实际过磅相对计划吨数的偏差百分比，保留两位小数 */
  deviationPercent: number;
  kinds: DiscrepancyKind[];
  status: DiscrepancyStatus;
  createdAt: string;
  createdBy: string;
  settleNote?: string;
  settledAt?: string;
  settledBy?: string;
}

export interface Driver {
  id: string;
  name: string;
  /** 驾驶证号 */
  licenseNo: string;
  /** 危险品运输从业资格证号 */
  qualificationNo: string;
  phone: string;
  status: "在聘" | "停用";
  createdAt: string;
}
