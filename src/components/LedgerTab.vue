<script setup lang="ts">
import { computed, ref } from "vue";
import { STORAGE_KEYS, STATUSES } from "../config/oil";
import { useLedgerStore } from "../stores/ledger";
import { useRulesStore } from "../stores/rules";
import type { DeliveryStatus } from "../types";
import { fmtDateTime, fmtPct } from "../utils/receipt";

// 本地台账：配送单全量记录 + 差异单全量记录，仅存浏览器本地
const ledger = useLedgerStore();
const rulesStore = useRulesStore();
const statusFilter = ref<DeliveryStatus | "全部">("全部");

const rows = computed(() =>
  statusFilter.value === "全部"
    ? ledger.orders
    : ledger.orders.filter((o) => o.status === statusFilter.value)
);

function receiptText(order: { status: DeliveryStatus; receipt?: { actualTons: number; state: string } }): string {
  if (!order.receipt) return order.status === "待回单" ? "未上报" : "—";
  return `${order.receipt.actualTons} 吨 / ${order.receipt.state}`;
}
</script>

<template>
  <div class="receipt-side" style="grid-template-columns:1fr">
    <section class="list-panel">
      <div class="toolbar">
        <h2>配送单台账（{{ ledger.orders.length }}）</h2>
        <select v-model="statusFilter">
          <option value="全部">全部状态</option>
          <option v-for="s in STATUSES" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
      <div class="table-scroll">
        <table class="ledger-table">
          <thead>
            <tr>
              <th>油站</th><th>油品</th><th>计划吨数</th><th>司机</th><th>出厂封签</th>
              <th>计划到达</th><th>状态</th><th>回单（实际/状态）</th><th>偏差</th><th>确认时间</th><th>创建时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in rows" :key="o.id">
              <td>{{ o.station }}</td>
              <td>{{ o.fuel }}</td>
              <td>{{ o.tons }}</td>
              <td>{{ ledger.driverName(o.driverId) }}</td>
              <td>{{ o.sealNo || "—" }}</td>
              <td>{{ o.arriveAt || "—" }}</td>
              <td><span class="status" :class="`status-${o.status}`">{{ o.status }}</span></td>
              <td>{{ receiptText(o) }}</td>
              <td v-if="o.receipt" :class="Math.abs(((o.receipt.actualTons - o.tons) / o.tons) * 100) > rulesStore.rules.deviationLimitPct ? 'text-danger' : ''">
                {{ fmtPct(((o.receipt.actualTons - o.tons) / o.tons) * 100) }}
              </td>
              <td v-else>—</td>
              <td>{{ fmtDateTime(o.receipt?.confirmedAt) }}</td>
              <td>{{ fmtDateTime(o.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="list-panel">
      <h2>差异单台账（{{ ledger.discrepancies.length }}）</h2>
      <div class="table-scroll">
        <table class="ledger-table">
          <thead>
            <tr><th>类型</th><th>油站/油品</th><th>司机</th><th>计划</th><th>实际</th><th>偏差</th><th>状态</th><th>说明/处理</th><th>时间</th></tr>
          </thead>
          <tbody>
            <tr v-for="d in ledger.discrepancies" :key="d.id">
              <td><span :class="`diff-tag diff-${d.type}`">{{ d.type }}</span></td>
              <td>
                {{ ledger.orders.find((o) => o.id === d.orderId)?.station ?? "—" }} /
                {{ ledger.orders.find((o) => o.id === d.orderId)?.fuel ?? "已删单" }}
              </td>
              <td>{{ ledger.driverName(d.driverId) }}</td>
              <td>{{ d.plannedTons }}</td>
              <td>{{ d.actualTons }}</td>
              <td :class="d.status === '未结' ? 'text-danger' : ''">{{ fmtPct(d.deviation) }}</td>
              <td><span class="status" :class="d.status === '未结' ? 'status-未结' : 'status-合格'">{{ d.status }}</span></td>
              <td>{{ d.status === "已结" ? d.settleNote : d.detail }}</td>
              <td>{{ fmtDateTime(d.settledAt ?? d.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="form-tip">
        本地存储键：台账 {{ STORAGE_KEYS.ledger }}，司机 {{ STORAGE_KEYS.drivers }}，规则 {{ STORAGE_KEYS.rules }}。
      </p>
    </section>
  </div>
</template>
