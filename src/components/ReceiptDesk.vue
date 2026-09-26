<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useLedgerStore } from "../store/ledger";
import { useUiStore } from "../store/ui";
import { receiptRules, deviationPercent, isDeviationOverLimit, isOilTempAbnormal } from "../config/receiptRules";
import { SEAL_STATES } from "../types";
import type { Delivery, SealState } from "../types";

const ledger = useLedgerStore();
const ui = useUiStore();

/** 可由司机上报回单的配送单：运输中 或 已退回 */
const reportable = computed(() =>
  ledger.deliveries.filter((item) => item.status === "运输中" || item.status === "已退回")
);
const waiting = computed(() => ledger.deliveries.filter((item) => item.status === "待回单"));

const reportForm = reactive({
  deliveryId: "",
  actualTons: 0,
  oilTemp: 20,
  sealState: "完整" as SealState,
  sealNo: ""
});

const returnReasons = reactive<Record<string, string>>({});
const confirmNotes = reactive<Record<string, string>>({});
const expandedReturn = ref<string>("");

const selectedDelivery = computed(() => ledger.getDelivery(reportForm.deliveryId));
const previewDeviation = computed(() => {
  if (!selectedDelivery.value || !reportForm.actualTons) return 0;
  return deviationPercent(selectedDelivery.value.tons, Number(reportForm.actualTons));
});
const previewOverLimit = computed(() => {
  if (!selectedDelivery.value || !reportForm.actualTons) return false;
  return isDeviationOverLimit(selectedDelivery.value.tons, Number(reportForm.actualTons));
});
const tempAbnormal = computed(() => isOilTempAbnormal(Number(reportForm.oilTemp)));

watch(
  () => ui.focusDeliveryId,
  (id) => {
    if (id) {
      const delivery = ledger.getDelivery(id);
      if (delivery && (delivery.status === "运输中" || delivery.status === "已退回")) {
        fillForm(delivery);
      }
    }
  },
  { immediate: true }
);

function fillForm(delivery: Delivery) {
  reportForm.deliveryId = delivery.id;
  reportForm.actualTons = delivery.receipt?.actualTons ?? 0;
  reportForm.oilTemp = delivery.receipt?.oilTemp ?? 20;
  reportForm.sealState = delivery.receipt?.sealState ?? "完整";
  reportForm.sealNo = delivery.receipt?.sealNo ?? "";
}

function submitReport() {
  try {
    if (!reportForm.deliveryId) throw new Error("请选择需要回单的配送单");
    if (!reportForm.actualTons || Number(reportForm.actualTons) <= 0) {
      throw new Error("请填写实际过磅吨数");
    }
    if (!reportForm.sealNo.trim()) throw new Error("请填写封签号");
    ledger.submitReceipt(reportForm.deliveryId, {
      actualTons: Number(reportForm.actualTons),
      oilTemp: Number(reportForm.oilTemp),
      sealState: reportForm.sealState,
      sealNo: reportForm.sealNo.trim()
    });
    ui.clearFocus();
    ui.notify("回单已上报，等待值班员确认");
  } catch (error) {
    ui.notify((error as Error).message, "error");
  }
}

function toggleReturn(id: string) {
  expandedReturn.value = expandedReturn.value === id ? "" : id;
}

function doReturn(delivery: Delivery) {
  const reason = returnReasons[delivery.id]?.trim();
  if (!reason) {
    ui.notify("请填写退回原因", "error");
    return;
  }
  ledger.returnReceipt(delivery.id, reason);
  returnReasons[delivery.id] = "";
  expandedReturn.value = "";
  ui.notify("已退回，司机可修改后重新上报");
}

function doConfirm(delivery: Delivery) {
  try {
    const officer = ui.officer.trim() || "值班员";
    ledger.confirmReceipt(delivery.id, officer, confirmNotes[delivery.id]?.trim() || "磅单、封签核对无误");
    confirmNotes[delivery.id] = "";
    ui.notify("回单已确认，配送单到站");
  } catch (error) {
    ui.notify((error as Error).message, "error");
  }
}

function deviationClass(delivery: Delivery): string {
  if (!delivery.receipt) return "";
  return isDeviationOverLimit(delivery.tons, delivery.receipt.actualTons) ? "chip-warn" : "chip-ok";
}
</script>

<template>
  <section class="receipt-desk">
    <div class="panel">
      <h2>司机到站上报</h2>
      <p class="panel-tip">配送到站后由司机上报实际过磅吨数、油温与封签；被退回的回单修改后可重新上报。</p>
      <div class="form-grid">
        <label>
          选择配送单
          <select v-model="reportForm.deliveryId">
            <option value="">请选择</option>
            <option v-for="item in reportable" :key="item.id" :value="item.id">
              {{ item.station }} / {{ item.fuel }} / {{ item.driverName }} / 计划 {{ item.tons }} 吨
              <template v-if="item.status === '已退回'">（已退回）</template>
            </option>
          </select>
        </label>
        <div v-if="selectedDelivery" class="hint-box">
          <p v-if="selectedDelivery.status === '已退回'" class="hint-warn">
            退回原因：{{ selectedDelivery.returnedReason }}
          </p>
          <p>计划（装车）吨数：{{ selectedDelivery.tons }} 吨</p>
          <p>
            当前偏差：
            <span :class="previewOverLimit ? 'text-warn' : 'text-ok'">
              {{ previewDeviation > 0 ? "+" : "" }}{{ previewDeviation }}%
            </span>
            <template v-if="previewOverLimit">（超过 ±{{ receiptRules.deviationLimit * 100 }}%，确认将生成差异单）</template>
          </p>
        </div>
        <label>
          实际过磅吨数
          <input v-model.number="reportForm.actualTons" type="number" min="0.01" step="0.01" />
        </label>
        <label>
          油温（℃，参考范围 {{ receiptRules.oilTempRange.min }} ~ {{ receiptRules.oilTempRange.max }}）
          <input v-model.number="reportForm.oilTemp" type="number" step="0.1" />
        </label>
        <p v-if="tempAbnormal" class="hint-warn">油温超出参考范围，请现场核实（仅提醒，不阻断回单）</p>
        <label>
          封签状态
          <select v-model="reportForm.sealState">
            <option v-for="state in SEAL_STATES" :key="state" :value="state">{{ state }}</option>
          </select>
        </label>
        <label>
          封签号
          <input v-model="reportForm.sealNo" placeholder="如 FY-778821" />
        </label>
        <p v-if="reportForm.sealState !== '完整'" class="hint-warn">
          封签{{ reportForm.sealState }}，确认时将生成“封签异常”差异单
        </p>
        <button type="button" @click="submitReport">提交回单上报</button>
      </div>
    </div>

    <div class="list-panel">
      <div class="toolbar">
        <h2>待确认回单（{{ waiting.length }}）</h2>
        <label class="officer-label">
          值班员
          <input v-model="ui.officer" placeholder="填写姓名" @change="ui.setOfficer(ui.officer)" />
        </label>
      </div>
      <div class="record-grid">
        <div v-if="waiting.length === 0" class="empty">暂无待确认回单</div>
        <article
          v-for="delivery in waiting"
          :key="delivery.id"
          class="record"
          :class="{ 'record-focus': ui.focusDeliveryId === delivery.id }"
        >
          <div class="record-head">
            <p class="record-title">{{ delivery.station }} / {{ delivery.fuel }}</p>
            <span class="status status-待回单">待确认</span>
          </div>
          <div class="details">
            <span>司机: {{ delivery.driverName }}</span>
            <span>计划吨数: {{ delivery.tons }} 吨</span>
            <span>实际过磅: {{ delivery.receipt?.actualTons }} 吨</span>
            <span>
              偏差:
              <b :class="deviationClass(delivery)">
                {{ deviationPercent(delivery.tons, delivery.receipt?.actualTons ?? delivery.tons) }}%
              </b>
            </span>
            <span>油温: {{ delivery.receipt?.oilTemp }} ℃</span>
            <span>
              封签: {{ delivery.receipt?.sealState }}（{{ delivery.receipt?.sealNo }}）
            </span>
          </div>
          <label class="confirm-note">
            确认备注
            <input v-model="confirmNotes[delivery.id]" placeholder="磅单、封签核对情况" />
          </label>
          <div class="actions">
            <button type="button" @click="doConfirm(delivery)">确认到站</button>
            <button class="secondary" type="button" @click="toggleReturn(delivery.id)">
              {{ expandedReturn === delivery.id ? "收起退回" : "退回" }}
            </button>
          </div>
          <div v-if="expandedReturn === delivery.id" class="return-box">
            <textarea
              v-model="returnReasons[delivery.id]"
              placeholder="填写退回原因（如封签号不符、磅单待核）"
            />
            <button class="danger" type="button" @click="doReturn(delivery)">确认退回司机重报</button>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
