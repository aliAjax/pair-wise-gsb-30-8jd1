// 本地台账模块：配送单与差异单独立存本地，重开页面后状态保留、可接着办
import { defineStore } from "pinia";
import { loadList, saveList } from "../utils/storage";
import { seedDeliveries } from "./seed";
import { useDriverStore } from "./drivers";
import { deviationPercent, detectDiscrepancyKinds } from "../config/receiptRules";
import type {
  Delivery,
  DeliveryStatus,
  Discrepancy,
  ReceiptReport
} from "../types";

const LEDGER_STORAGE_KEY = "hxwlfront-19-ledger-v2";
const LEGACY_STORAGE_KEY = "hxwlfront-19-oil-delivery";

type LedgerShape = {
  deliveries: Delivery[];
  discrepancies: Discrepancy[];
};

/** 兼容旧版本：旧台账没有司机和回单，迁移为新配送单 */
function migrateLegacy(): Delivery[] | null {
  const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (raw === null) return null;
  try {
    const old = JSON.parse(raw) as Array<Record<string, unknown> & { status?: string; id?: string }>;
    if (!Array.isArray(old)) return null;
    const fallbackDriver = { id: "legacy-driver", name: "未记录司机（旧数据）" };
    const statusMap: Record<string, DeliveryStatus> = {
      待发车: "待发车",
      运输中: "运输中",
      已到站: "已到站"
    };
    return old.map((item) => ({
      station: String(item.station ?? ""),
      fuel: String(item.fuel ?? ""),
      tons: Number(item.tons ?? 0),
      arriveAt: String(item.arriveAt ?? ""),
      status: statusMap[item.status ?? "待发车"] ?? "待发车",
      notes: String(item.notes ?? "旧台账迁移"),
      driverId: fallbackDriver.id,
      driverName: fallbackDriver.name,
      id: String(item.id ?? crypto.randomUUID()),
      createdAt: String(item.createdAt ?? new Date().toISOString())
    }));
  } catch {
    return null;
  }
}

function initialLedger(): LedgerShape {
  const saved = loadList<Delivery | Discrepancy>(LEDGER_STORAGE_KEY);
  if (saved !== null) {
    return {
      // 注意：差异单也含 station，按各自独有字段（arriveAt / kinds）判别
      deliveries: saved.filter((item): item is Delivery => "arriveAt" in item) as Delivery[],
      discrepancies: saved.filter((item): item is Discrepancy => "kinds" in item) as Discrepancy[]
    };
  }
  const migrated = migrateLegacy();
  if (migrated) {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return { deliveries: migrated, discrepancies: [] };
  }
  // 样例中 seed-d-5 为短装确认，补一笔未结差异用于演示挂账与暂停排班
  const seedDiscrepancy: Discrepancy = {
    id: "seed-x-1",
    deliveryId: "seed-d-5",
    driverId: "seed-driver-2",
    driverName: "李海涛",
    station: "机场站",
    fuel: "92号汽油",
    plannedTons: 16,
    actualTons: 15.55,
    deviationPercent: -2.81,
    kinds: ["短装"],
    status: "未结",
    createdAt: "2026-09-24T09:40:00.000Z",
    createdBy: "值班员赵敏"
  };
  return { deliveries: seedDeliveries, discrepancies: [seedDiscrepancy] };
}

export const useLedgerStore = defineStore("ledger", {
  state: () => {
    const initial = initialLedger();
    return {
      deliveries: initial.deliveries as Delivery[],
      discrepancies: initial.discrepancies as Discrepancy[]
    };
  },
  getters: {
    pendingReceipts: (state) =>
      state.deliveries.filter((item) => item.status === "待回单" || item.status === "已退回"),
    openDiscrepancies: (state) => state.discrepancies.filter((item) => item.status === "未结"),
    openDiscrepancyDriverIds(): Set<string> {
      return new Set(this.openDiscrepancies.map((item) => item.driverId));
    }
  },
  actions: {
    persist() {
      saveList<Delivery | Discrepancy>(LEDGER_STORAGE_KEY, [
        ...this.deliveries,
        ...this.discrepancies
      ]);
    },
    getDelivery(id: string) {
      return this.deliveries.find((item) => item.id === id);
    },
    /** 司机是否有资格排新配送：在聘且无未结差异 */
    isDriverSchedulable(driverId: string): boolean {
      const driverStore = useDriverStore();
      const driver = driverStore.getById(driverId);
      if (!driver || driver.status !== "在聘") return false;
      return !this.openDiscrepancyDriverIds.has(driverId);
    },
    /** 创建配送单（排新配送前校验司机资格） */
    addDelivery(data: {
      station: string;
      fuel: string;
      tons: number;
      arriveAt: string;
      notes: string;
      driverId: string;
    }) {
      const driverStore = useDriverStore();
      const driver = driverStore.getById(data.driverId);
      if (!driver) throw new Error("请选择司机");
      if (driver.status !== "在聘") throw new Error("该司机已停用，不能排班");
      if (this.openDiscrepancyDriverIds.has(data.driverId)) {
        throw new Error("该司机有未结差异单，结清前不能再排新配送");
      }
      this.deliveries.unshift({
        ...data,
        id: crypto.randomUUID(),
        driverName: driver.name,
        status: "待发车",
        createdAt: new Date().toISOString()
      });
      this.persist();
    },
    /** 待发车 → 运输中，同样受未结差异限制 */
    depart(id: string) {
      const delivery = this.getDelivery(id);
      if (!delivery || delivery.status !== "待发车") return;
      if (this.openDiscrepancyDriverIds.has(delivery.driverId)) {
        throw new Error("该司机有未结差异单，结清前不能发车");
      }
      delivery.status = "运输中";
      delivery.departedAt = new Date().toISOString();
      this.persist();
    },
    /** 司机到站上报回单：实际过磅吨数、油温、封签 → 待回单（重报覆盖旧数据） */
    submitReceipt(id: string, report: Omit<ReceiptReport, "reportedAt">) {
      const delivery = this.getDelivery(id);
      if (!delivery) return;
      if (delivery.status !== "运输中" && delivery.status !== "已退回") {
        throw new Error("当前状态不允许上报回单");
      }
      delivery.receipt = { ...report, reportedAt: new Date().toISOString() };
      delivery.returnedReason = undefined;
      delivery.status = "待回单";
      this.persist();
    },
    /** 值班员退回：司机可修改后重新上报 */
    returnReceipt(id: string, reason: string) {
      const delivery = this.getDelivery(id);
      if (!delivery || delivery.status !== "待回单") return;
      delivery.status = "已退回";
      delivery.returnedReason = reason || "请核对后重新上报";
      this.persist();
    },
    /** 值班员确认：超 2% 偏差或封签异常生成差异单挂司机，配送单到站 */
    confirmReceipt(id: string, officer: string, note: string) {
      const delivery = this.getDelivery(id);
      if (!delivery || delivery.status !== "待回单" || !delivery.receipt) return;
      const receipt = delivery.receipt;
      const kinds = detectDiscrepancyKinds(delivery.tons, receipt.actualTons, receipt.sealState);
      if (kinds.length) {
        const percent = deviationPercent(delivery.tons, receipt.actualTons);
        this.discrepancies.unshift({
          id: crypto.randomUUID(),
          deliveryId: delivery.id,
          driverId: delivery.driverId,
          driverName: delivery.driverName,
          station: delivery.station,
          fuel: delivery.fuel,
          plannedTons: delivery.tons,
          actualTons: receipt.actualTons,
          deviationPercent: percent,
          kinds,
          status: "未结",
          createdAt: new Date().toISOString(),
          createdBy: officer || "值班员"
        });
      }
      delivery.confirmation = {
        confirmedAt: new Date().toISOString(),
        officer: officer || "值班员",
        finalTons: receipt.actualTons,
        note
      };
      delivery.status = "已到站";
      this.persist();
    },
    /** 结清差异：司机自动恢复排班资格 */
    settleDiscrepancy(id: string, officer: string, note: string) {
      const discrepancy = this.discrepancies.find((item) => item.id === id);
      if (!discrepancy || discrepancy.status !== "未结") return;
      discrepancy.status = "已结";
      discrepancy.settledAt = new Date().toISOString();
      discrepancy.settledBy = officer || "值班员";
      discrepancy.settleNote = note || "差异已处理";
      this.persist();
    },
    removeDelivery(id: string) {
      if (this.discrepancies.some((item) => item.deliveryId === id && item.status === "未结")) {
        throw new Error("该配送单有未结差异，不能删除");
      }
      this.deliveries = this.deliveries.filter((item) => item.id !== id);
      this.persist();
    }
  }
});
