// 业务数据模型：配送单、到站回单、差异单、司机资格、回单规则

export type DeliveryStatus = "待发车" | "运输中" | "待回单" | "已到站";

export type SealStatus = "正常" | "封签破损" | "封签号不符";

export type ReceiptState = "待确认" | "已退回" | "已确认";

export type DiscrepancyType = "短装" | "超装" | "封签异常";

/** 司机资格台账 */
export interface Driver {
  id: string;
  name: string;
  /** 从业资格证号 */
  licenseNo: string;
  phone: string;
  /** 资格是否合格（不合格/已停用不可排单） */
  qualified: boolean;
  createdAt: string;
}

/** 司机到站上报的回单数据 */
export interface Receipt {
  /** 实际过磅吨数 */
  actualTons: number;
  /** 油温（℃） */
  oilTemp: number;
  /** 到站封签号 */
  sealNo: string;
  /** 封签状态（封签号与出厂不符时由系统判定为“封签号不符”） */
  sealStatus: SealStatus;
  state: ReceiptState;
  submittedAt: string;
  returnedReason?: string;
  confirmedAt?: string;
  officer?: string;
}

/** 配送单（本地台账主记录） */
export interface DeliveryOrder {
  id: string;
  station: string;
  fuel: string;
  /** 计划（装车）吨数，回单偏差以此为基准 */
  tons: number;
  arriveAt: string;
  /** 出厂封签号（选填，用于到站核对） */
  sealNo: string;
  /** 承运司机 */
  driverId: string;
  status: DeliveryStatus;
  notes: string;
  createdAt: string;
  receipt?: Receipt;
}

/** 差异单：短装、超装或封签异常，挂到责任司机名下 */
export interface Discrepancy {
  id: string;
  orderId: string;
  driverId: string;
  type: DiscrepancyType;
  plannedTons: number;
  actualTons: number;
  /** 偏差百分比，如 -3.2 表示短装 3.2% */
  deviation: number;
  detail: string;
  status: "未结" | "已结";
  createdAt: string;
  settledAt?: string;
  settleNote?: string;
  officer?: string;
}

/** 回单规则（与司机资格、本地台账分开维护） */
export interface ReceiptRules {
  /** 允许偏差百分比，2 表示 2%，超过即生成差异单 */
  deviationLimitPct: number;
  requireTemp: boolean;
  requireSeal: boolean;
}
