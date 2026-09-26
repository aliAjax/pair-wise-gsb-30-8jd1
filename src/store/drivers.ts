// 司机资格模块：司机档案独立存本地台账
import { defineStore } from "pinia";
import { loadList, saveList } from "../utils/storage";
import { seedDrivers } from "./seed";
import type { Driver } from "../types";

const DRIVER_STORAGE_KEY = "hxwlfront-19-drivers";

export const useDriverStore = defineStore("drivers", {
  state: () => ({
    drivers: (loadList<Driver>(DRIVER_STORAGE_KEY) ?? seedDrivers) as Driver[]
  }),
  getters: {
    getById: (state) => (id: string) => state.drivers.find((driver) => driver.id === id)
  },
  actions: {
    persist() {
      saveList(DRIVER_STORAGE_KEY, this.drivers);
    },
    addDriver(data: Omit<Driver, "id" | "createdAt">) {
      this.drivers.push({ ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
      this.persist();
    },
    updateDriver(id: string, patch: Partial<Omit<Driver, "id">>) {
      const driver = this.drivers.find((item) => item.id === id);
      if (driver) {
        Object.assign(driver, patch);
        this.persist();
      }
    },
    toggleStatus(id: string) {
      const driver = this.drivers.find((item) => item.id === id);
      if (driver) {
        driver.status = driver.status === "在聘" ? "停用" : "在聘";
        this.persist();
      }
    },
    /** 已被配送单引用的司机只停用，不删除 */
    removeDriver(id: string, referenced: boolean) {
      if (referenced) throw new Error("该司机名下有配送记录，不能删除，请改为停用");
      this.drivers = this.drivers.filter((driver) => driver.id !== id);
      this.persist();
    }
  }
});
