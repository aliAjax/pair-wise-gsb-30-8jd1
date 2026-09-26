<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { FUELS, STATUSES, STATIONS } from "../config/oil";
import { useDriversStore } from "../stores/drivers";
import { useLedgerStore } from "../stores/ledger";
import { useRulesStore } from "../stores/rules";
import { fmtPct } from "../utils/receipt";

// 配送调度：保留原有创建、油站筛选、状态流转；排单校验司机资格与挂账
const ledger = useLedgerStore();
const driversStore = useDriversStore();
const rulesStore = useRulesStore();

const filters = ["全部油站", ...STATIONS] as const;

const blank = () => ({
  station: STATIONS[0],
  fuel: FUELS[0],
  tons: 0,
  arriveAt: "",
  driverId: "",
  sealNo: "",
  notes: ""
});
const form = reactive(blank());
const filter = ref<string>(filters[0]);
const error = ref("");

const filteredOrders = computed(() =>
  filter.value.startsWith("全部")
    ? ledger.orders
    : ledger.orders.filter((o) => o.station === filter.value)
);

const chartRows = computed(() =>
  STATUSES.map((status) => ({
    status,
    value: ledger.orders.filter((o) => o.status === status).length
  }))
);
const maxChart = computed(() => Math.max(1, ...chartRows.value.map((r) => r.value)));

const eligibleDrivers = computed(() =>
  driversStore.drivers.map((d) => ({
    ...d,
    blocked: !d.qualified || ledger.hasOpenDiscrepancy(d.id)
  }))
);

function driverHint(id: string): string {
  const d = driversStore.drivers.find((x) => x.id === id);
  if (!d) return "";
  if (!d.qualified) return "（资格不合格）";
  const count = ledger.openCount(d.id);
  return count ? `（未结差异 ${count} 笔）` : "";
}

function canAdvance(order: { status: string }): boolean {
  return order.status === "待发车" || order.status === "运输中";
}

function nextLabel(status: string): string {
  return status === "待发车" ? "发车" : "到站（待回单）";
}

function submit() {
  error.value =
    ledger.addOrder({
      station: form.station,
      fuel: form.fuel,
      tons: Number(form.tons),
      arriveAt: form.arriveAt,
      sealNo: form.sealNo,
      driverId: form.driverId,
      notes: form.notes
    }) ?? "";
  if (!error.value) Object.assign(form, blank());
}
</script>

<template>
  <div class="tab-grid">
    <form class="panel" @submit.prevent="submit">
      <h2>创建配送单</h2>
      <p v-if="error" class="banner banner-warn">{{ error }}</p>
      <div class="form-grid">
        <label>目标油站
          <select v-model="form.station" required>
            <option v-for="s in STATIONS" :key="s" :value="s">{{ s }}</option>
          </select>
        </label>
        <label>油品
          <select v-model="form.fuel" required>
            <option v-for="f in FUELS" :key="f" :value="f">{{ f }}</option>
          </select>
        </label>
        <label>配送吨数
          <input v-model.number="form.tons" type="number" min="0" step="0.01" required />
        </label>
        <label>计划到达
          <input v-model="form.arriveAt" type="date" required />
        </label>
        <label>承运司机
          <select v-model="form.driverId" required>
            <option value="" disabled>请选择司机</option>
            <option
              v-for="d in eligibleDrivers"
              :key="d.id"
              :value="d.id"
              :disabled="d.blocked"
            >
              {{ d.name }}{{ driverHint(d.id) }}
            </option>
          </select>
        </label>
        <label>出厂封签号（选填）
          <input v-model="form.sealNo" placeholder="如 FS-88001，用于到站核对" />
        </label>
        <label class="span-2">备注
          <textarea v-model="form.notes" placeholder="填写处理说明或现场备注" />
        </label>
        <button type="submit">保存配送单</button>
      </div>
      <p class="form-tip">司机资格不合格或名下有未结差异时不能排新配送。</p>
    </form>

    <section class="list-panel">
      <div class="toolbar">
        <h2>配送单列表</h2>
        <select v-model="filter">
          <option v-for="item in filters" :key="item">{{ item }}</option>
        </select>
      </div>

      <div class="record-grid">
        <div v-if="filteredOrders.length === 0" class="empty">暂无匹配数据</div>
        <article v-for="order in filteredOrders" :key="order.id" class="record">
          <div class="record-head">
            <p class="record-title">{{ order.station }} / {{ order.fuel }}</p>
            <span class="status" :class="`status-${order.status}`">{{ order.status }}</span>
          </div>
          <div class="details">
            <span>配送吨数: {{ order.tons }}</span>
            <span>计划到达: {{ order.arriveAt || "—" }}</span>
            <span>承运司机: {{ ledger.driverName(order.driverId) }}</span>
            <span>出厂封签: {{ order.sealNo || "未记录" }}</span>
          </div>
          <p class="note">{{ order.notes }}</p>
          <div class="actions">
            <button
              type="button"
              :disabled="!canAdvance(order)"
              :title="order.status === '待回单' ? '等待司机上报回单、值班员确认' : order.status === '已到站' ? '配送已完成' : ''"
              @click="ledger.advance(order.id)"
            >
              {{ canAdvance(order) ? `流转：${nextLabel(order.status)}` : "流转状态" }}
            </button>
            <button class="danger" type="button" @click="ledger.removeOrder(order.id)">删除</button>
          </div>
          <p v-if="order.status === '待回单'" class="form-tip">
            到站后请到「到站回单」处理，确认回单后才算已到站。
          </p>
          <p v-if="order.status === '已到站' && order.receipt" class="form-tip">
            实际过磅 {{ order.receipt.actualTons }} 吨，偏差
            <span :class="Math.abs(order.receipt.actualTons - order.tons) / order.tons * 100 > rulesStore.rules.deviationLimitPct ? 'text-danger' : ''">
              {{ fmtPct(((order.receipt.actualTons - order.tons) / order.tons) * 100) }}
            </span>
          </p>
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
  </div>
</template>
