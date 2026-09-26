import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { STORAGE_KEYS } from "../config/oil";
import type { ReceiptRules } from "../types";

// 回单规则：偏差上限、必填项，独立存储、独立维护

const DEFAULT_RULES: ReceiptRules = {
  deviationLimitPct: 2,
  requireTemp: true,
  requireSeal: true
};

function load(): ReceiptRules {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.rules);
    if (raw) return { ...DEFAULT_RULES, ...(JSON.parse(raw) as Partial<ReceiptRules>) };
  } catch {
    // 数据损坏时回退默认规则
  }
  return { ...DEFAULT_RULES };
}

export const useRulesStore = defineStore("receipt-rules", () => {
  const rules = ref<ReceiptRules>(load());

  watch(
    rules,
    (value) => localStorage.setItem(STORAGE_KEYS.rules, JSON.stringify(value)),
    { deep: true }
  );

  return { rules };
});
