<script setup lang="ts">
import { computed } from "vue";
import { useLedgerStore } from "./store/ledger";
import { useUiStore } from "./store/ui";
import type { TabKey } from "./store/ui";
import DeliveryPlanner from "./components/DeliveryPlanner.vue";
import ReceiptDesk from "./components/ReceiptDesk.vue";
import DiscrepancyDesk from "./components/DiscrepancyDesk.vue";
import DriverQualifications from "./components/DriverQualifications.vue";
import RulesBook from "./components/RulesBook.vue";

const stack = ["Vue3", "Vite", "TypeScript", "Pinia", "Element Plus"];

const ledger = useLedgerStore();
const ui = useUiStore();

const tabs: Array<{ key: TabKey; label: string; badge: () => number }> = [
  { key: "planner", label: "配送计划", badge: () => 0 },
  { key: "receipt", label: "待确认回单", badge: () => ledger.pendingReceipts.length },
  { key: "discrepancy", label: "未结差异", badge: () => ledger.openDiscrepancies.length },
  { key: "drivers", label: "司机资格", badge: () => 0 },
  { key: "rules", label: "规则手册", badge: () => 0 }
];

const metrics = computed(() => {
  const totalTons = ledger.deliveries.reduce((acc, item) => acc + Number(item.tons || 0), 0);
  return [
    { label: "配送单", value: ledger.deliveries.length },
    { label: "待确认回单", value: ledger.pendingReceipts.length },
    { label: "未结差异", value: ledger.openDiscrepancies.length },
    { label: "计划总吨数", value: totalTons }
  ];
});
</script>

<template>
  <main class="app">
    <div class="shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">石油行业前端最小闭环</p>
          <h1>油品配送计划</h1>
          <p class="subtitle">
            配送单记录司机，到站后司机上报过磅吨数、油温与封签，值班员确认或退回；
            偏差超 2% 或封签异常生成差异单挂司机，结清前不再排新配送。
          </p>
        </div>
        <div class="stack">
          <span v-for="item in stack" :key="item" class="tag">{{ item }}</span>
        </div>
      </header>

      <section class="metrics">
        <article v-for="metric in metrics" :key="metric.label" class="metric">
          <span>{{ metric.label }}</span>
          <strong>{{ metric.value }}</strong>
        </article>
      </section>

      <nav class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="tab"
          :class="{ active: ui.activeTab === tab.key }"
          @click="ui.setTab(tab.key)"
        >
          {{ tab.label }}
          <span v-if="tab.badge()" class="tab-badge">{{ tab.badge() }}</span>
        </button>
      </nav>

      <transition name="fade">
        <p v-if="ui.notice" class="notice" :class="ui.noticeKind">{{ ui.notice }}</p>
      </transition>

      <DeliveryPlanner v-if="ui.activeTab === 'planner'" />
      <ReceiptDesk v-else-if="ui.activeTab === 'receipt'" />
      <DiscrepancyDesk v-else-if="ui.activeTab === 'discrepancy'" />
      <DriverQualifications v-else-if="ui.activeTab === 'drivers'" />
      <RulesBook v-else />
    </div>
  </main>
</template>
