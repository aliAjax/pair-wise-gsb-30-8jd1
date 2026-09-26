// 界面状态：当前页签、待办定位、值班员姓名持久化，重开还能接着办
import { defineStore } from "pinia";
import { loadValue, saveValue } from "../utils/storage";

export type TabKey = "planner" | "receipt" | "discrepancy" | "drivers" | "rules";

const UI_STORAGE_KEY = "hxwlfront-19-ui";

interface UiState {
  activeTab: TabKey;
  officer: string;
  focusDeliveryId: string;
}

export const useUiStore = defineStore("ui", {
  state: () => {
    const saved = loadValue<UiState>(UI_STORAGE_KEY);
    return {
      activeTab: (saved?.activeTab ?? "planner") as TabKey,
      officer: saved?.officer ?? "",
      focusDeliveryId: "" as string,
      notice: "" as string,
      noticeKind: "info" as "info" | "error",
      timer: 0 as ReturnType<typeof setTimeout> | number
    };
  },
  actions: {
    persistView() {
      saveValue<UiState>(UI_STORAGE_KEY, {
        activeTab: this.activeTab,
        officer: this.officer,
        focusDeliveryId: this.focusDeliveryId
      });
    },
    setTab(tab: TabKey) {
      this.activeTab = tab;
      this.persistView();
    },
    setOfficer(name: string) {
      this.officer = name;
      this.persistView();
    },
    /** 从配送单列表跳转到回单办理，并定位到指定单据 */
    goReceipt(deliveryId?: string) {
      this.focusDeliveryId = deliveryId ?? "";
      this.setTab("receipt");
      this.persistView();
    },
    clearFocus() {
      this.focusDeliveryId = "";
      this.persistView();
    },
    notify(message: string, kind: "info" | "error" = "info") {
      this.notice = message;
      this.noticeKind = kind;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.notice = "";
      }, 3000);
    }
  }
});
