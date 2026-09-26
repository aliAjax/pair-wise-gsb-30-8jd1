<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useLedgerStore } from "../store/ledger";
import { useUiStore } from "../store/ui";
import type { Discrepancy } from "../types";

const ledger = useLedgerStore();
const ui = useUiStore();

const filters = ["未结", "已结", "全部"] as const;
const filter = ref<(typeof filters)[number]>("未结");
const settleNotes = reactive<Record<string, string>>({});

const list = computed(() => {
  if (filter.value === "全部") return ledger.discrepancies;
  return ledger.discrepancies.filter((item) => item.status === filter.value);
});

function settle(item: Discrepancy) {
  const note = settleNotes[item.id]?.trim();
  if (!note) {
    ui.notify("请填写处理说明后再结清", "error");
    return;
  }
  ledger.settleDiscrepancy(item.id, ui.officer.trim() || "值班员", note);
  settleNotes[item.id] = "";
  ui.notify("差异已结清，该司机恢复排班");
}

function formatTime(value?: string) {
  return value ? new Date(value).toLocaleString("zh-CN", { hour12: false }) : "—";
}
</script>

<template>
  <section class="list-panel">
    <div class="toolbar">
      <h2>差异单台账</h2>
      <div class="toolbar-right">
        <span class="block-tip">未结 {{ ledger.openDiscrepancies.length }} 笔，相关司机暂停新配送</span>
        <label class="officer-label">
          值班员
          <input v-model="ui.officer" placeholder="填写姓名" @change="ui.setOfficer(ui.officer)" />
        </label>
        <select v-model="filter">
          <option v-for="item in filters" :key="item" :value="item">{{ item }}</option>
        </select>
      </div>
    </div>

    <div class="record-grid">
      <div v-if="list.length === 0" class="empty">暂无差异单</div>
      <article v-for="item in list" :key="item.id" class="record">
        <div class="record-head">
          <p class="record-title">{{ item.station }} / {{ item.fuel }} · {{ item.driverName }}</p>
          <span class="status" :class="item.status === '未结' ? 'status-已退回' : 'status-已到站'">
            {{ item.status }}
          </span>
        </div>
        <div class="kind-chips">
          <span v-for="kind in item.kinds" :key="kind" class="chip chip-warn">{{ kind }}</span>
        </div>
        <div class="details">
          <span>计划吨数: {{ item.plannedTons }} 吨</span>
          <span>实际过磅: {{ item.actualTons }} 吨</span>
          <span>
            偏差: <b :class="item.deviationPercent < 0 ? 'text-warn' : 'text-danger'">
              {{ item.deviationPercent > 0 ? "+" : "" }}{{ item.deviationPercent }}%
            </b>
          </span>
          <span>生成时间: {{ formatTime(item.createdAt) }}</span>
          <span>生成人: {{ item.createdBy }}</span>
          <span v-if="item.settledAt">结清时间: {{ formatTime(item.settledAt) }}（{{ item.settledBy }}）</span>
        </div>
        <p v-if="item.settleNote" class="note">处理说明：{{ item.settleNote }}</p>
        <div v-if="item.status === '未结'" class="return-box">
          <textarea v-model="settleNotes[item.id]" placeholder="填写差异处理说明（补发 / 冲减 / 责任认定）" />
          <button type="button" @click="settle(item)">结清差异并恢复排班</button>
        </div>
      </article>
    </div>
  </section>
</template>
