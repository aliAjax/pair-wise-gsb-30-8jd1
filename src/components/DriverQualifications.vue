<script setup lang="ts">
import { computed, reactive } from "vue";
import { useDriverStore } from "../store/drivers";
import { useLedgerStore } from "../store/ledger";
import { useUiStore } from "../store/ui";
import { driverRules } from "../config/driverRules";
import type { Driver } from "../types";

const driverStore = useDriverStore();
const ledger = useLedgerStore();
const ui = useUiStore();

const blank = () => ({
  name: "",
  licenseNo: "",
  qualificationNo: "",
  phone: "",
  status: "在聘" as Driver["status"]
});
const form = reactive(blank());

function referencedCount(driverId: string): number {
  return ledger.deliveries.filter((item) => item.driverId === driverId).length;
}

const openCountByDriver = computed(() => {
  const map = new Map<string, number>();
  for (const item of ledger.openDiscrepancies) {
    map.set(item.driverId, (map.get(item.driverId) ?? 0) + 1);
  }
  return map;
});

function stateOf(driver: Driver): { text: string; cls: string } {
  if (driver.status !== "在聘") return { text: "资格停用", cls: "status-stopped" };
  const open = openCountByDriver.value.get(driver.id) ?? 0;
  if (open) return { text: `未结差异 ${open} 笔 · 暂停排班`, cls: "status-blocked" };
  return { text: "可排班", cls: "status-ok" };
}

function addDriver() {
  try {
    if (!form.name.trim() || !form.licenseNo.trim() || !form.qualificationNo.trim()) {
      throw new Error("请填写姓名、驾驶证号和从业资格证号");
    }
    driverStore.addDriver({
      name: form.name.trim(),
      licenseNo: form.licenseNo.trim(),
      qualificationNo: form.qualificationNo.trim(),
      phone: form.phone.trim(),
      status: form.status
    });
    Object.assign(form, blank());
    ui.notify("司机档案已建立");
  } catch (error) {
    ui.notify((error as Error).message, "error");
  }
}

function remove(driver: Driver) {
  try {
    driverStore.removeDriver(driver.id, referencedCount(driver.id) > 0);
    ui.notify("司机档案已删除");
  } catch (error) {
    ui.notify((error as Error).message, "error");
  }
}
</script>

<template>
  <section class="workspace">
    <form class="panel" @submit.prevent="addDriver">
      <h2>建立司机档案</h2>
      <p class="panel-tip">
        排班须同时满足：{{ driverRules.checkpoints.join("、") }}
      </p>
      <div class="form-grid">
        <label>
          姓名
          <input v-model="form.name" required />
        </label>
        <label>
          驾驶证号
          <input v-model="form.licenseNo" required />
        </label>
        <label>
          危险品运输从业资格证号
          <input v-model="form.qualificationNo" required />
        </label>
        <label>
          联系电话
          <input v-model="form.phone" />
        </label>
        <label>
          状态
          <select v-model="form.status">
            <option value="在聘">在聘</option>
            <option value="停用">停用</option>
          </select>
        </label>
        <button type="submit">保存司机档案</button>
      </div>
    </form>

    <section class="list-panel">
      <div class="toolbar">
        <h2>司机资格台账</h2>
        <span class="block-tip">名下未结差异会自动暂停排班，结清后自动恢复</span>
      </div>
      <div class="record-grid">
        <article v-for="driver in driverStore.drivers" :key="driver.id" class="record">
          <div class="record-head">
            <p class="record-title">{{ driver.name }}</p>
            <span class="status" :class="stateOf(driver).cls">{{ stateOf(driver).text }}</span>
          </div>
          <div class="details">
            <span>驾驶证号: {{ driver.licenseNo }}</span>
            <span>从业资格证号: {{ driver.qualificationNo }}</span>
            <span>电话: {{ driver.phone || "—" }}</span>
            <span>在册状态: {{ driver.status }}</span>
            <span>配送单: {{ referencedCount(driver.id) }} 笔</span>
            <span>
              未结差异: {{ openCountByDriver.get(driver.id) ?? 0 }} 笔
            </span>
          </div>
          <div class="actions">
            <button class="secondary" type="button" @click="driverStore.toggleStatus(driver.id)">
              {{ driver.status === "在聘" ? "停用资格" : "恢复在聘" }}
            </button>
            <button class="danger" type="button" @click="remove(driver)">删除档案</button>
          </div>
        </article>
      </div>
    </section>
  </section>
</template>
