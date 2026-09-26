<script setup lang="ts">
import { receiptRules } from "../config/receiptRules";
import { driverRules } from "../config/driverRules";

const flow = [
  { stage: "配送单记录司机", desc: "创建配送单时选择在聘且无未结差异的司机" },
  { stage: "发车运输", desc: "待发车 → 运输中；发车时再次校验司机资格" },
  { stage: "司机到站上报", desc: "上报实际过磅吨数、油温、封签状态与封签号" },
  { stage: "值班员确认或退回", desc: "退回可重报；确认通过后配送单才算到站" },
  { stage: "差异挂账与结清", desc: "超偏差 / 封签异常挂司机，结清前不再排新配送" }
];
</script>

<template>
  <section class="rules-book">
    <article class="panel rule-panel">
      <h2>到站回单规则</h2>
      <ol class="rule-flow">
        <li v-for="(item, index) in flow" :key="item.stage">
          <span class="step">{{ index + 1 }}</span>
          <div>
            <strong>{{ item.stage }}</strong>
            <p>{{ item.desc }}</p>
          </div>
        </li>
      </ol>
      <div class="rule-grid">
        <div class="rule-item">
          <span>过磅偏差阈值</span>
          <strong>±{{ receiptRules.deviationLimit * 100 }}%</strong>
          <p>超过阈值按短装 / 超装生成差异单</p>
        </div>
        <div class="rule-item">
          <span>油温参考范围</span>
          <strong>{{ receiptRules.oilTempRange.min }}℃ ~ {{ receiptRules.oilTempRange.max }}℃</strong>
          <p>超范围仅提醒，不阻断回单</p>
        </div>
        <div class="rule-item">
          <span>封签要求</span>
          <strong>完整且封签号可核</strong>
          <p>破损 / 缺失生成“封签异常”差异单</p>
        </div>
        <div class="rule-item">
          <span>确认权限</span>
          <strong>值班员</strong>
          <p>确认或退回均留痕，退回后司机可重报</p>
        </div>
      </div>
    </article>

    <article class="panel rule-panel">
      <h2>司机资格规则</h2>
      <ul class="rule-list">
        <li v-for="item in driverRules.checkpoints" :key="item">
          <span class="dot" />{{ item }}
        </li>
      </ul>
      <div class="rule-grid">
        <div class="rule-item">
          <span>必备证件</span>
          <strong>{{ driverRules.requiredCredentials.join("、") }}</strong>
        </div>
        <div class="rule-item">
          <span>排班状态</span>
          <strong>{{ driverRules.schedulableStatus }}</strong>
        </div>
        <div class="rule-item">
          <span>暂停规则</span>
          <strong>{{ driverRules.blockRule }}</strong>
        </div>
      </div>
      <p class="panel-tip">
        回单规则维护在 <code>src/config/receiptRules.ts</code>，司机资格规则维护在
        <code>src/config/driverRules.ts</code>，业务台账独立保存在本地存储，三者分开整理。
      </p>
    </article>
  </section>
</template>
