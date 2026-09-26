<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useDriversStore } from "../stores/drivers";
import { useLedgerStore } from "../stores/ledger";
import { fmtDateTime } from "../utils/receipt";

// 司机资格台账：登记资格证号、设置合格状态、查看挂账与承运记录
const driversStore = useDriversStore();
const ledger = useLedgerStore();

const blank = () => ({ name: "", licenseNo: "", phone: "" });
const form = reactive(blank());
const error = ref("");

const rows = computed(() =>
  driversStore.drivers.map((d) => ({
    ...d,
    orderCount: ledger.orders.filter((o) => o.driverId === d.id).length,
    openCount: ledger.openCount(d.id)
  }))
);

function submit() {
  error.value = driversStore.add({ ...form }) ?? "";
  if (!error.value) Object.assign(form, blank());
}
</script>

<template>
  <div class="tab-grid" style="grid-template-columns:minmax(260px,340px) 1fr">
    <form class="panel" @submit.prevent="submit">
      <h2>登记司机</h2>
      <p v-if="error" class="banner banner-warn">{{ error }}</p>
      <div class="form-grid">
        <label>司机姓名
          <input v-model="form.name" required />
        </label>
        <label>从业资格证号
          <input v-model="form.licenseNo" required placeholder="如 YZ-2024-0118" />
        </label>
        <label>联系电话
          <input v-model="form.phone" />
        </label>
        <button type="submit">保存司机</button>
      </div>
      <p class="form-tip">新登记司机默认资格合格；停用或证号失效可在右侧取消合格。</p>
    </form>

    <section class="list-panel">
      <h2>司机资格台账</h2>
      <table class="ledger-table">
        <thead>
          <tr><th>姓名</th><th>资格证号</th><th>电话</th><th>资格状态</th><th>承运单数</th><th>未结差异</th><th>登记时间</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr v-for="d in rows" :key="d.id">
            <td>{{ d.name }}</td>
            <td>{{ d.licenseNo }}</td>
            <td>{{ d.phone || "—" }}</td>
            <td>
              <span class="status" :class="d.qualified ? 'status-合格' : 'status-不合格'">
                {{ d.qualified ? "合格" : "不合格" }}
              </span>
            </td>
            <td>{{ d.orderCount }}</td>
            <td :class="d.openCount ? 'text-danger' : ''">{{ d.openCount }}</td>
            <td>{{ fmtDateTime(d.createdAt) }}</td>
            <td>
              <div class="actions">
                <button class="secondary" type="button" @click="driversStore.setQualified(d.id, !d.qualified)">
                  {{ d.qualified ? "停用资格" : "恢复合格" }}
                </button>
                <button
                  class="danger"
                  type="button"
                  :disabled="d.orderCount > 0"
                  :title="d.orderCount > 0 ? '已有配送单记录，不可删除，请改为停用' : ''"
                  @click="driversStore.remove(d.id)"
                >
                  删除
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>
