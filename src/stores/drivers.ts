import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { STORAGE_KEYS, uid } from "../config/oil";
import type { Driver } from "../types";

// 司机资格台账：资格证号、合格状态，独立存储、独立维护

function seed(): Driver[] {
  const base = Date.now();
  return [
    { id: uid(), name: "王建国", licenseNo: "YZ-2024-0118", phone: "13800010001", qualified: true, createdAt: new Date(base - 86400000 * 30).toISOString() },
    { id: uid(), name: "李长顺", licenseNo: "YZ-2024-0237", phone: "13800010002", qualified: true, createdAt: new Date(base - 86400000 * 20).toISOString() },
    { id: uid(), name: "赵铁柱", licenseNo: "YZ-2023-0902", phone: "13800010003", qualified: false, createdAt: new Date(base - 86400000 * 10).toISOString() }
  ];
}

function load(): Driver[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.drivers);
    if (raw) return JSON.parse(raw) as Driver[];
  } catch {
    // 数据损坏时重新初始化
  }
  const drivers = seed();
  localStorage.setItem(STORAGE_KEYS.drivers, JSON.stringify(drivers));
  return drivers;
}

export const useDriversStore = defineStore("drivers", () => {
  const drivers = ref<Driver[]>(load());

  watch(
    drivers,
    (value) => localStorage.setItem(STORAGE_KEYS.drivers, JSON.stringify(value)),
    { deep: true }
  );

  function add(input: { name: string; licenseNo: string; phone: string }): string | null {
    const name = input.name.trim();
    const licenseNo = input.licenseNo.trim();
    if (!name || !licenseNo) return "司机姓名和资格证号必填";
    if (drivers.value.some((d) => d.licenseNo === licenseNo)) return "资格证号已存在，请勿重复登记";
    drivers.value.unshift({
      id: uid(),
      name,
      licenseNo,
      phone: input.phone.trim(),
      qualified: true,
      createdAt: new Date().toISOString()
    });
    return null;
  }

  function setQualified(id: string, qualified: boolean) {
    const driver = drivers.value.find((d) => d.id === id);
    if (driver) driver.qualified = qualified;
  }

  function remove(id: string) {
    drivers.value = drivers.value.filter((d) => d.id !== id);
  }

  return { drivers, add, setQualified, remove };
});
