<script setup lang="ts">
import { reactive, ref } from "vue";
import { SEAL_STATUSES } from "../config/oil";
import { useOfficer } from "../composables/useOfficer";
import { useLedgerStore } from "../stores/ledger";
import { useRulesStore } from "../stores/rules";
import type { DeliveryOrder, SealStatus } from "../types";
import { deviationPct, fmtDateTime, fmtPct } from "../utils/receipt";

// 到站回单：司机报实际过磅吨数、油温、封签；值班员确认或退回；重开可继续办理
const ledger = useLedgerStore();
const rulesStore = useRulesStore();
const { officer } = useOfficer();

interface Draft {
  actualTons: number | null;
  oilTemp: number | null;
  sealNo: string;
  sealStatus: SealStatus;
}

function freshDraft(order: DeliveryOrder): Draft {
  const r = order.receipt;
  return {
    actualTons: r ? r.actualTons : null,
    oilTemp: r ? r.oilTemp : null,
    sealNo: r?.sealNo ?? order.sealNo,
    sealStatus: r?.sealStatus ?? "正常"
  };
}

const drafts = reactive<Record<string, Draft>>({});
function draftOf(order: DeliveryOrder): Draft {
  if (!drafts[order.id]) drafts[order.id] = freshDraft(order);
  return drafts[order.id];
}

const submitError = ref<Record<string, string>>({});

function devPreview(order: DeliveryOrder): string {
  const d = draftOf(order);
  if (!d.actualTons) return "输入实际吨数后预览偏差";
  const pct = deviationPct(order.tons, d.actualTons);
  const over = Math.abs(pct) > rulesStore.rules.deviationLimitPct;
  return `偏差 ${fmtPct(pct)}（${over ? "超" + rulesStore.rules.deviationLimitPct + "%，将生成差异单" : "在允许范围内"}）`;
}

function previewClass(order: DeliveryOrder): string {
  const d = draftOf(order);
  if (!d.actualTons) return "form-tip";
  return Math.abs(deviationPct(order.tons, d.actualTons)) > rulesStore.rules.deviationLimitPct
    ? "form-tip text-danger"
    : "form-tip";
}

function submit(order: DeliveryOrder) {
  const d = draftOf(order);
  const err = ledger.submitReceipt(order.id, {
    actualTons: d.actualTons ?? 0,
    oilTemp: d.oilTemp,
    sealNo: d.sealNo,
    sealStatus: d.sealStatus
  });
  submitError.value[order.id] = err ?? "";
}

const returnReason = reactive<Record<string, string>>({});
const returnError = ref<Record<string, string>>({});

function returnReceipt(order: DeliveryOrder) {
  const err = ledger.returnReceipt(order.id, returnReason[order.id] ?? "", officer.value);
  returnError.value[order.id] = err ?? "";
  if (!err) returnReason[order.id] = "";
}

const confirmError = ref<Record<string, string>>({});
function confirm(order: DeliveryOrder) {
  const err = ledger.confirmReceipt(order.id, officer.value);
  confirmError.value[order.id] = err ?? "";
}

function orderDeviation(order: DeliveryOrder): number {
  if (!order.receipt) return 0;
  return deviationPct(order.tons, order.receipt.actualTons);
}
</script>

<template>
  <div class="receipt-layout">
    <section class="list-panel">
      <div class="toolbar">
        <h2>待确认回单</h2>
        <input class="officer-input" v-model="officer" placeholder="值班员姓名" />
      </div>

      <div v-if="ledger.confirmQueue.length === 0" class="empty">暂无待确认回单</div>
      <article v-for="order in ledger.confirmQueue" :key="order.id" class="record">
        <div class="record-head">
          <p class="record-title">{{ order.station }} / {{ order.fuel }}</p>
          <span class="status status-待回单">{{ order.receipt!.state }}</span>
        </div>
        <div class="details details-3">
          <span>司机: {{ ledger.driverName(order.driverId) }}</span>
          <span>计划吨数: {{ order.tons }}</span>
          <span>
            实际过磅: {{ order.receipt!.actualTons }}
            （<em :class="Math.abs(orderDeviation(order)) > rulesStore.rules.deviationLimitPct ? 'text-danger' : ''">
              {{ fmtPct(orderDeviation(order)) }}
            </em>）
          </span>
          <span>油温: {{ order.receipt!.oilTemp }} ℃</span>
          <span>出厂封签: {{ order.sealNo || "未记录" }}</span>
          <span>到站封签: {{ order.receipt!.sealNo || "未填" }}（{{ order.receipt!.sealStatus }}）</span>
          <span class="span-2">上报时间: {{ fmtDateTime(order.receipt!.submittedAt) }}</span>
        </div>

        <div v-if="ledger.discrepanciesOf(order.id).length" class="diff-box">
          <p v-for="d in ledger.discrepanciesOf(order.id)" :key="d.id" :class="d.status === '未结' ? 'diff-open' : 'diff-closed'">
            {{ d.status === "未结" ? "●" : "✓" }} {{ d.type }}：{{ d.detail }}（{{ d.status }}）
          </p>
          <p v-if="ledger.hasOpenForOrder(order.id)" class="form-tip">
            有未结差异挂在司机「{{ ledger.driverName(order.driverId) }}」名下，结清后才能确认到站。
          </p>
        </div>

        <p v-if="confirmError[order.id]" class="banner banner-warn">{{ confirmError[order.id] }}</p>
        <p v-if="returnError[order.id]" class="banner banner-warn">{{ returnError[order.id] }}</p>
        <label class="return-box">
          退回原因（退回后司机可修改重报）
          <textarea v-model="returnReason[order.id]" placeholder="如：过磅数据存疑，请重新核磅" />
        </label>
        <div class="actions">
          <button type="button" :disabled="ledger.hasOpenForOrder(order.id)" @click="confirm(order)">
            确认回单（配送到站）
          </button>
          <button class="secondary" type="button" @click="returnReceipt(order)">退回</button>
        </div>
      </article>
    </section>

    <div class="receipt-side">
      <section class="list-panel">
        <h2>司机到站上报 / 退回重报</h2>
        <div v-if="ledger.pendingReceiptOrders.length === 0" class="empty">暂无待回单配送单</div>
        <article v-for="order in ledger.pendingReceiptOrders" :key="order.id" class="record">
          <div class="record-head">
            <p class="record-title">{{ order.station }} / {{ order.fuel }}</p>
            <span class="status" :class="order.receipt ? 'status-退回' : 'status-待回单'">
              {{ order.receipt && order.receipt.state === "已退回" ? "已退回，待重报" : "待司机上报" }}
            </span>
          </div>
          <p class="form-tip">
            司机「{{ ledger.driverName(order.driverId) }}」｜计划 {{ order.tons }} 吨｜出厂封签 {{ order.sealNo || "未记录" }}
          </p>

          <div v-if="order.receipt && order.receipt.state === '已退回'" class="banner banner-warn">
            退回原因：{{ order.receipt.returnedReason }}（值班员 {{ order.receipt.officer }}）。请核对后重新上报。
          </div>

          <div class="form-grid">
            <label>实际过磅吨数
              <input v-model.number="draftOf(order).actualTons" type="number" min="0" step="0.01" />
            </label>
            <label>油温（℃）
              <input v-model.number="draftOf(order).oilTemp" type="number" step="0.1" />
            </label>
            <label>到站封签号
              <input v-model="draftOf(order).sealNo" placeholder="封签号" />
            </label>
            <label>封签状态
              <select v-model="draftOf(order).sealStatus">
                <option v-for="s in SEAL_STATUSES" :key="s" :value="s">{{ s }}</option>
              </select>
            </label>
          </div>
          <p :class="previewClass(order)">{{ devPreview(order) }}</p>
          <p v-if="submitError[order.id]" class="banner banner-warn">{{ submitError[order.id] }}</p>
          <div class="actions">
            <button type="button" @click="submit(order)">上报回单</button>
          </div>
        </article>
      </section>

      <section class="list-panel">
        <h2>回单规则</h2>
        <div class="form-grid">
          <label>允许偏差（%，超过即生成差异单）
            <input v-model.number="rulesStore.rules.deviationLimitPct" type="number" min="0" step="0.1" />
          </label>
          <div class="rule-checks">
            <label class="check-label">
              <input type="checkbox" v-model="rulesStore.rules.requireTemp" />
              上报必填油温
            </label>
            <label class="check-label">
              <input type="checkbox" v-model="rulesStore.rules.requireSeal" />
              上报必填封签号，到站封签与出厂不符判封签号不符
            </label>
          </div>
        </div>
        <p class="form-tip">规则修改即时保存；偏差超限时按短装/超装生成差异单并挂到承运司机。</p>
      </section>
    </div>
  </div>
</template>
