<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useLedgerStore } from "../store/ledger";
import { useDriverStore } from "../store/drivers";
import { useUiStore } from "../store/ui";
import { DELIVERY_STATUSES } from "../types";
import type { Delivery } from "../types";

const STATIONS = ["全部油站", "城东站", "机场站", "新区站"];
const FUELS = ["92号汽油", "95号汽油", "柴油"];

const ledger = useLedgerStore();
const driverStore = useDriverStore();
const ui = useUiStore();

const form = reactive({
  station: "",
  fuel: "",
  tons: 0,
  arriveAt: "",
  driverId: "",
  notes: ""
});
const filter = ref(STATIONS[0]);

const filteredRecords = computed(() => {
  if (filter.value.startsWith("全部")) return ledger.deliveries;
  return ledger.deliveries.filter((record) => record.station === filter.value);
});

const chartRows = computed(() =>
  DELIVERY_STATUSES.map((status) => ({
    status,
    value: ledger.deliveries.filter((record) => record.status === status).length
  }))
);
const maxChart = computed(() => Math.max(1, ...chartRows.value.map((row) => row.value)));

function driverBlocked(driverId: string): boolean {
  return ledger.openDiscrepancyDriverIds.has(driverId);
}

function primaryText(record: Delivery) {
  return [record.station, record.fuel].filter(Boolean).join(" / ") || "配送单";
}

function submit() {
  try {
    if (!form.station || !form.fuel || !form.arriveAt || !form.driverId) {
      throw new Error("请完整填写油站、油品、计划到达和司机");
    }
    if (!form.tons || form.tons <= 0) throw new Error("配送吨数必须大于 0");
    ledger.addDelivery({
      station: form.station,
      fuel: form.fuel,
      tons: Number(form.tons),
      arriveAt: form.arriveAt,
      notes: form.notes || "暂无备注",
      driverId: form.driverId
    });
    Object.assign(form, { station: "", fuel: "", tons: 0, arriveAt: "", driverId: "", notes: "" });
    ui.notify("配送单已创建");
  } catch (error) {
    ui.notify((error as Error).message, "error");
  }
}

function depart(record: Delivery) {
  try {
    ledger.depart(record.id);
    ui.notify("已发车，运输中");
  } catch (error) {
    ui.notify((error as Error).message, "error");
  }
}

function remove(record: Delivery) {
  try {
    ledger.removeDelivery(record.id);
    ui.notify("配送单已删除");
  } catch (error) {
    ui.notify((error as Error).message, "error");
  }
}
</script>

<template>
  <section class="workspace">
    <form class="panel" @submit.prevent="submit">
      <h2>创建配送单</h2>
      <div class="form-grid">
        <label>
          目标油站
          <select v-model="form.station" required>
            <option value="">请选择</option>
            <option v-for="station in STATIONS.slice(1)" :key="station">{{ station }}</option>
          </select>
        </label>
        <label>
          油品
          <select v-model="form.fuel" required>
            <option value="">请选择</option>
            <option v-for="fuel in FUELS" :key="fuel">{{ fuel }}</option>
          </select>
        </label>
        <label>
          配送司机
          <select v-model="form.driverId" required>
            <option value="">请选择</option>
            <option
              v-for="driver in driverStore.drivers"
              :key="driver.id"
              :value="driver.id"
              :disabled="driver.status !== '在聘' || driverBlocked(driver.id)"
            >
              {{ driver.name }}
              <template v-if="driver.status !== '在聘'">（已停用）</template>
              <template v-else-if="driverBlocked(driver.id)">（有未结差异，暂停排班）</template>
            </option>
          </select>
        </label>
        <label>
          配送吨数
          <input v-model.number="form.tons" type="number" min="0.01" step="0.01" required />
        </label>
        <label>
          计划到达
          <input v-model="form.arriveAt" type="date" required />
        </label>
        <label>
          备注
          <textarea v-model="form.notes" placeholder="填写处理说明或现场备注" />
        </label>
        <button type="submit">保存配送单</button>
      </div>
    </form>

    <section class="list-panel">
      <div class="toolbar">
        <h2>配送单列表</h2>
        <select v-model="filter">
          <option v-for="item in STATIONS" :key="item">{{ item }}</option>
        </select>
      </div>

      <div class="record-grid">
        <div v-if="filteredRecords.length === 0" class="empty">暂无匹配数据</div>
        <article v-for="record in filteredRecords" :key="record.id" class="record">
          <div class="record-head">
            <p class="record-title">{{ primaryText(record) }}</p>
            <span class="status" :class="`status-${record.status}`">{{ record.status }}</span>
          </div>
          <div class="details">
            <span>目标油站: {{ record.station }}</span>
            <span>油品: {{ record.fuel }}</span>
            <span>配送吨数: {{ record.tons }}</span>
            <span>计划到达: {{ record.arriveAt }}</span>
            <span>司机: {{ record.driverName }}</span>
            <span v-if="record.receipt">实际过磅: {{ record.receipt.actualTons }} 吨</span>
          </div>
          <p v-if="record.status === '已退回' && record.returnedReason" class="note note-warn">
            退回原因：{{ record.returnedReason }}
          </p>
          <p v-else class="note">{{ record.notes }}</p>
          <div class="actions">
            <button v-if="record.status === '待发车'" type="button" @click="depart(record)">发车</button>
            <button
              v-if="record.status === '运输中' || record.status === '已退回'"
              type="button"
              @click="ui.goReceipt(record.id)"
            >
              {{ record.status === "已退回" ? "重新上报回单" : "到站回单" }}
            </button>
            <button
              v-if="record.status === '待回单'"
              class="secondary"
              type="button"
              @click="ui.goReceipt(record.id)"
            >
              查看待确认回单
            </button>
            <button
              class="secondary"
              type="button"
              @click="navigator.clipboard?.writeText(primaryText(record))"
            >
              复制摘要
            </button>
            <button class="danger" type="button" @click="remove(record)">删除</button>
          </div>
        </article>
      </div>

      <div class="mini-chart">
        <div v-for="row in chartRows" :key="row.status" class="bar">
          <span>{{ row.status }}</span>
          <div class="bar-track"><div class="bar-fill" :style="{ width: `${(row.value / maxChart) * 100}%` }" /></div>
          <strong>{{ row.value }}</strong>
        </div>
      </div>
    </section>
  </section>
</template>
