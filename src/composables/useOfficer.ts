import { ref, watch } from "vue";
import { STORAGE_KEYS } from "../config/oil";

// 值班员姓名：跨标签页共享，刷新后保留，不归属任何业务台账
const officer = ref(localStorage.getItem(STORAGE_KEYS.officer) ?? "");

watch(officer, (value) => localStorage.setItem(STORAGE_KEYS.officer, value));

export function useOfficer() {
  return { officer };
}
