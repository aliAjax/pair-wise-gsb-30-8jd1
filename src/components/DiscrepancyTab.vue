<script setup lang="ts">
import { reactive, ref } from "vue";
import { useOfficer } from "../composables/useOfficer";
import { useLedgerStore } from "../stores/ledger";
import { fmtDateTime, fmtPct } from "../utils/receipt";

// 差异处理：未结差异挂司机，结清前该司机不可排新配送
const ledger = useLedgerStore();
const { officer } = useOfficer();
const notes = reactive<Record<string, string>>({});
const errors = ref<Record<string, string>>({});

function settle(id: string) {
  const err = ledger.settleDiscrepancy(id, notes[id] ?? "", officer.value);
  errors.value[id] = err ?? "";
  if (!err) notes[id] = "";
}

function orderSummary(orderId: string): string {
  const o = ledger.orders.find((x) => x.id === orderId);
  return o ? `${o.station} / ${o.fuel}` : "配送单已删除";
}
</script>

<template>
  <div class="receipt-side" style="grid-template-columns:1fr">
    <section class="list-panel">
      <div class="toolbar">
        <h2>未结差异（{{ ledger.openDiscrepancies.length }}）</h2>
        <input class="officer-input" v-model="officer" placeholder="值班员姓名" />
      </div>
      <div v-if="ledger.openDiscrepancies.length === 0" class="empty">没有未结差异，挂账司机均可正常排单</div>
      <article v-for="d in ledger.openDiscrepancies" :key="d.id" class="record">
        <div class="record-head">
          <p class="record-title">
            <span :class="`diff-tag diff-${d.type}`">{{ d.type }}</span>
            {{ orderSummary(d.orderId) }}
          </p>
          <span class="status status-未结">未结 · 挂账司机 {{ ledger.driverName(d.driverId) }}</span>
        </div>
        <div class="details details-3">
          <span>计划吨数: {{ d.plannedTons }}</span>
          <span>实际过磅: {{ d.actualTons }}</span>
          <span>偏差: <em class="text-danger">{{ fmtPct(d.deviation) }}</em></span>
          <span class="span-2">差异说明: {{ d.detail }}</span>
          <span>生成时间: {{ fmtDateTime(d.createdAt) }}</span>
        </div>
        <label>处理说明
          <textarea v-model="notes[d.id]" placeholder="如：补量到账 / 损耗核实 / 封签补办" />
        </label>
        <p v-if="errors[d.id]" class="banner banner-warn">{{ errors[d.id] }}</p>
        <div class="actions">
          <button type="button" @click="settle(d.id)">结清差异</button>
        </div>
        <p class="form-tip">结清后解除该司机的排单限制；相关配送单仍需值班员确认回单才算到站。</p>
      </article>
    </section>

    <section class="list-panel">
      <h2>已结差异（{{ ledger.settledDiscrepancies.length }}）</h2>
      <table v-if="ledger.settledDiscrepancies.length" class="ledger-table">
        <thead>
          <tr><th>类型</th><th>配送单</th><th>司机</th><th>偏差</th><th>处理说明</th><th>结清时间</th><th>值班员</th></tr>
        </thead>
        <tbody>
          <tr v-for="d in ledger.settledDiscrepancies" :key="d.id">
            <td><span :class="`diff-tag diff-${d.type}`">{{ d.type }}</span></td>
            <td>{{ orderSummary(d.orderId) }}</td>
            <td>{{ ledger.driverName(d.driverId) }}</td>
            <td>{{ fmtPct(d.deviation) }}</td>
            <td>{{ d.settleNote }}</td>
            <td>{{ fmtDateTime(d.settledAt) }}</td>
            <td>{{ d.officer }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">暂无已结差异</div>
    </section>
  </div>
</template>
