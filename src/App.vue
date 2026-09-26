<script setup lang="ts">
import { computed, ref } from "vue";
import DispatchTab from "./components/DispatchTab.vue";
import ReceiptTab from "./components/ReceiptTab.vue";
import DiscrepancyTab from "./components/DiscrepancyTab.vue";
import DriversTab from "./components/DriversTab.vue";
import LedgerTab from "./components/LedgerTab.vue";
import { useLedgerStore } from "./stores/ledger";

const ledger = useLedgerStore();

const tabs = [
  { key: "dispatch", label: "配送调度" },
  { key: "receipt", label: "到站回单" },
  { key: "discrepancy", label: "差异处理" },
  { key: "drivers", label: "司机资格" },
  { key: "ledger", label: "本地台账" }
] as const;

type TabKey = (typeof tabs)[number]["key"];
const active = ref<TabKey>("dispatch");

// 顶部指标：待确认回单、未结差异始终可见，重开页面也不会丢待办
const metrics = computed(() => [
  { label: "配送单总数", value: ledger.orders.length },
  { label: "待确认回单", value: ledger.confirmQueue.length },
  { label: "未结差异", value: ledger.openDiscrepancies.length },
  {
    label: "已到站吨数",
    value: ledger.orders
      .filter((o) => o.status === "已到站")
      .reduce((sum, o) => sum + (o.receipt?.actualTons ?? o.tons), 0)
      .toFixed(2)
  }
]);

const badgeCount = computed<Record<TabKey, number>>(() => ({
  dispatch: 0,
  receipt: ledger.pendingReceiptOrders.length + ledger.confirmQueue.length,
  discrepancy: ledger.openDiscrepancies.length,
  drivers: 0,
  ledger: 0
}));
</script>

<template>
  <main class="app">
    <div class="shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">石油行业前端最小闭环</p>
          <h1>油品配送计划</h1>
          <p class="subtitle">
            创建配送单并在待发车、运输中、待回单之间流转；司机到站上报过磅吨数、油温和封签，值班员确认后才算已到站；
            偏差超过规则上限或封签异常生成差异单挂账司机，结清前不再排新配送。
          </p>
        </div>
        <div class="stack">
          <span class="tag">Vue3</span>
          <span class="tag">Pinia</span>
          <span class="tag">TypeScript</span>
          <span class="tag">Element Plus</span>
        </div>
      </header>

      <section class="metrics">
        <article v-for="item in metrics" :key="item.label" class="metric">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </article>
      </section>

      <nav class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="tab"
          :class="{ active: active === tab.key }"
          @click="active = tab.key"
        >
          {{ tab.label }}
          <span v-if="badgeCount[tab.key]" class="tab-badge">{{ badgeCount[tab.key] }}</span>
        </button>
      </nav>

      <DispatchTab v-show="active === 'dispatch'" />
      <ReceiptTab v-show="active === 'receipt'" />
      <DiscrepancyTab v-show="active === 'discrepancy'" />
      <DriversTab v-show="active === 'drivers'" />
      <LedgerTab v-show="active === 'ledger'" />
    </div>
  </main>
</template>
