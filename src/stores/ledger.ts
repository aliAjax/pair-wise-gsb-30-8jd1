import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import { STORAGE_KEYS, uid } from "../config/oil";
import type {
  DeliveryOrder,
  DeliveryStatus,
  Discrepancy,
  DiscrepancyType,
  Driver
} from "../types";
import { checkReceipt, fmtPct, type ReceiptReport } from "../utils/receipt";
import { useDriversStore } from "./drivers";
import { useRulesStore } from "./rules";

// 本地台账：配送单 + 差异单，独立存储；回单规则、司机资格在各自模块维护

interface LedgerState {
  orders: DeliveryOrder[];
  discrepancies: Discrepancy[];
}

interface LegacyRecord {
  id?: string;
  status?: string;
  notes?: string;
  createdAt?: string;
  [key: string]: unknown;
}

function seedLedger(): LedgerState {
  const drivers = useDriversStore().drivers;
  const wang = drivers.find((d) => d.name === "王建国") ?? drivers[0];
  const li = drivers.find((d) => d.name === "李长顺") ?? drivers[1] ?? drivers[0];
  const now = Date.now();
  const iso = (offsetDays: number) => new Date(now + offsetDays * 86400000).toISOString();

  const orders: DeliveryOrder[] = [
    {
      id: uid(),
      station: "城东站",
      fuel: "92号汽油",
      tons: 18,
      arriveAt: "2026-09-28",
      sealNo: "FS-88001",
      driverId: wang.id,
      status: "运输中",
      notes: "车辆已出库",
      createdAt: iso(-1)
    },
    {
      id: uid(),
      station: "机场站",
      fuel: "柴油",
      tons: 12,
      arriveAt: "2026-09-27",
      sealNo: "FS-88002",
      driverId: li.id,
      status: "待回单",
      notes: "到站等待回单",
      createdAt: iso(-2)
    },
    {
      id: uid(),
      station: "新区站",
      fuel: "95号汽油",
      tons: 20,
      arriveAt: "2026-09-30",
      sealNo: "",
      driverId: wang.id,
      status: "待发车",
      notes: "等待装车",
      createdAt: iso(0)
    }
  ];

  // 演示用：李长顺名下有一笔未结短装差异，排新单时会被拦截
  const discrepancies: Discrepancy[] = [
    {
      id: uid(),
      orderId: orders[1].id,
      driverId: li.id,
      type: "短装",
      plannedTons: 12,
      actualTons: 11.6,
      deviation: -3.33,
      detail: "短装 3.33%（实际 11.6 吨 / 计划 12 吨）",
      status: "未结",
      createdAt: iso(-1)
    }
  ];
  orders[1].receipt = {
    actualTons: 11.6,
    oilTemp: 21.5,
    sealNo: "FS-88002",
    sealStatus: "正常",
    state: "待确认",
    submittedAt: iso(-1)
  };

  return { orders, discrepancies };
}

/** 旧版本只有配送单数组，迁移时补司机字段并保留原状态 */
function migrateLegacy(): LedgerState | null {
  const raw = localStorage.getItem(STORAGE_KEYS.legacyRecords);
  if (!raw) return null;
  try {
    const legacy = JSON.parse(raw) as LegacyRecord[];
    if (!Array.isArray(legacy)) return null;
    const drivers = useDriversStore().drivers;
    const fallback = drivers[0]?.id ?? "";
    const orders = legacy.map((record, index) => {
      const status: DeliveryStatus =
        record.status === "待发车" || record.status === "运输中" || record.status === "待回单" || record.status === "已到站"
          ? record.status
          : "待发车";
      return {
        id: typeof record.id === "string" ? record.id : uid(),
        station: String(record.station ?? ""),
        fuel: String(record.fuel ?? ""),
        tons: Number(record.tons ?? 0),
        arriveAt: String(record.arriveAt ?? ""),
        sealNo: String(record.sealNo ?? ""),
        driverId: typeof record.driverId === "string" && record.driverId ? record.driverId : fallback,
        status,
        notes: String(record.notes ?? "暂无备注"),
        createdAt: typeof record.createdAt === "string" ? record.createdAt : new Date(Date.now() - index * 86400000).toISOString()
      } satisfies DeliveryOrder;
    });
    return { orders, discrepancies: [] };
  } catch {
    return null;
  }
}

function load(): LedgerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ledger);
    if (raw) return JSON.parse(raw) as LedgerState;
  } catch {
    // 数据损坏时走迁移/初始化
  }
  const state = migrateLegacy() ?? seedLedger();
  localStorage.setItem(STORAGE_KEYS.ledger, JSON.stringify(state));
  return state;
}

export const useLedgerStore = defineStore("ledger", () => {
  const initial = load();
  const orders = ref<DeliveryOrder[]>(initial.orders);
  const discrepancies = ref<Discrepancy[]>(initial.discrepancies);

  watch(
    [orders, discrepancies],
    () =>
      localStorage.setItem(
        STORAGE_KEYS.ledger,
        JSON.stringify({ orders: orders.value, discrepancies: discrepancies.value })
      ),
    { deep: true }
  );

  // ---- 查询 ----

  const openDiscrepancies = computed(() => discrepancies.value.filter((d) => d.status === "未结"));
  const settledDiscrepancies = computed(() => discrepancies.value.filter((d) => d.status === "已结"));
  const pendingReceiptOrders = computed(() =>
    orders.value.filter(
      (o) => o.status === "待回单" && (!o.receipt || o.receipt.state === "已退回")
    )
  );
  const confirmQueue = computed(() =>
    orders.value.filter((o) => o.status === "待回单" && o.receipt?.state === "待确认")
  );

  function driverById(id: string): Driver | undefined {
    return useDriversStore().drivers.find((d) => d.id === id);
  }

  function driverName(id: string): string {
    return driverById(id)?.name ?? "未登记司机";
  }

  function hasOpenDiscrepancy(driverId: string): boolean {
    return discrepancies.value.some((d) => d.driverId === driverId && d.status === "未结");
  }

  function openCount(driverId: string): number {
    return discrepancies.value.filter((d) => d.driverId === driverId && d.status === "未结").length;
  }

  function discrepanciesOf(orderId: string): Discrepancy[] {
    return discrepancies.value.filter((d) => d.orderId === orderId);
  }

  function hasOpenForOrder(orderId: string): boolean {
    return discrepancies.value.some((d) => d.orderId === orderId && d.status === "未结");
  }

  // ---- 排单与流转 ----

  function addOrder(input: {
    station: string;
    fuel: string;
    tons: number;
    arriveAt: string;
    sealNo: string;
    driverId: string;
    notes: string;
  }): string | null {
    if (!(input.tons > 0)) return "配送吨数必须大于 0";
    const driver = driverById(input.driverId);
    if (!driver) return "请选择承运司机";
    if (!driver.qualified) return `司机「${driver.name}」资格不合格，不能排新配送`;
    if (hasOpenDiscrepancy(driver.id)) return `司机「${driver.name}」有未结差异，结清前不能排新配送`;
    orders.value.unshift({
      id: uid(),
      station: input.station,
      fuel: input.fuel,
      tons: input.tons,
      arriveAt: input.arriveAt,
      sealNo: input.sealNo.trim(),
      driverId: driver.id,
      status: "待发车",
      notes: input.notes.trim() || "暂无备注",
      createdAt: new Date().toISOString()
    });
    return null;
  }

  /** 原有流转：待发车 → 运输中 → 待回单；到站必须由回单确认触发 */
  function advance(id: string) {
    const order = orders.value.find((o) => o.id === id);
    if (!order) return;
    if (order.status === "待发车") order.status = "运输中";
    else if (order.status === "运输中") order.status = "待回单";
  }

  function removeOrder(id: string) {
    orders.value = orders.value.filter((o) => o.id !== id);
    discrepancies.value = discrepancies.value.filter((d) => d.orderId !== id);
  }

  // ---- 到站回单 ----

  function submitReceipt(orderId: string, report: ReceiptReport): string | null {
    const order = orders.value.find((o) => o.id === orderId);
    if (!order) return "配送单不存在";
    if (order.status !== "待回单") return "当前状态不能提交回单";
    const rules = useRulesStore().rules;
    if (!(report.actualTons > 0)) return "请填写实际过磅吨数";
    if (rules.requireTemp && report.oilTemp === null) return "按回单规则必须填写油温";
    if (rules.requireSeal && !report.sealNo.trim()) return "按回单规则必须填写封签号";

    const check = checkReceipt(order, report, rules);
    order.receipt = {
      actualTons: report.actualTons,
      oilTemp: report.oilTemp ?? 0,
      sealNo: report.sealNo.trim(),
      sealStatus: check.sealStatus,
      state: "待确认",
      submittedAt: new Date().toISOString()
    };

    // 重新提交时，作废上一轮回单生成的未结差异，按新数据重新生成
    discrepancies.value = discrepancies.value.filter(
      (d) => !(d.orderId === orderId && d.status === "未结")
    );
    const now = new Date().toISOString();
    for (const type of check.types) {
      discrepancies.value.unshift(buildDiscrepancy(order, type, check.deviationPct, check.sealStatus, now));
    }
    return null;
  }

  function buildDiscrepancy(
    order: DeliveryOrder,
    type: DiscrepancyType,
    deviation: number,
    sealStatus: string,
    now: string
  ): Discrepancy {
    const receipt = order.receipt!;
    const detail =
      type === "封签异常"
        ? `封签异常（${sealStatus}，到站封签 ${receipt.sealNo || "未填"}）`
        : `${type} ${fmtPct(Math.abs(deviation)).replace("+", "")}（实际 ${receipt.actualTons} 吨 / 计划 ${order.tons} 吨）`;
    return {
      id: uid(),
      orderId: order.id,
      driverId: order.driverId,
      type,
      plannedTons: order.tons,
      actualTons: receipt.actualTons,
      deviation,
      detail,
      status: "未结",
      createdAt: now
    };
  }

  function returnReceipt(orderId: string, reason: string, officer: string): string | null {
    const order = orders.value.find((o) => o.id === orderId);
    if (!order?.receipt || order.receipt.state !== "待确认") return "当前回单不能退回";
    if (!reason.trim()) return "请填写退回原因";
    order.receipt.state = "已退回";
    order.receipt.returnedReason = reason.trim();
    order.receipt.officer = officer.trim();
    return null;
  }

  /** 值班员确认回单：有未结差异必须先结清，确认后配送单才算到站 */
  function confirmReceipt(orderId: string, officer: string): string | null {
    const order = orders.value.find((o) => o.id === orderId);
    if (!order?.receipt || order.receipt.state !== "待确认") return "当前回单不能确认";
    if (!officer.trim()) return "请先填写值班员姓名";
    if (hasOpenForOrder(orderId)) return "存在未结差异，请先在「差异处理」结清后再确认";
    order.receipt.state = "已确认";
    order.receipt.confirmedAt = new Date().toISOString();
    order.receipt.officer = officer.trim();
    order.status = "已到站";
    return null;
  }

  // ---- 差异处理 ----

  function settleDiscrepancy(id: string, note: string, officer: string): string | null {
    const item = discrepancies.value.find((d) => d.id === id);
    if (!item || item.status !== "未结") return "差异单不存在或已结清";
    if (!note.trim()) return "请填写处理说明";
    if (!officer.trim()) return "请先填写值班员姓名";
    item.status = "已结";
    item.settleNote = note.trim();
    item.officer = officer.trim();
    item.settledAt = new Date().toISOString();
    return null;
  }

  return {
    orders,
    discrepancies,
    openDiscrepancies,
    settledDiscrepancies,
    pendingReceiptOrders,
    confirmQueue,
    driverById,
    driverName,
    hasOpenDiscrepancy,
    openCount,
    discrepanciesOf,
    hasOpenForOrder,
    addOrder,
    advance,
    removeOrder,
    submitReceipt,
    returnReceipt,
    confirmReceipt,
    settleDiscrepancy
  };
});
