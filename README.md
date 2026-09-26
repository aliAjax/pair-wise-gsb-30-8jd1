# 油品配送计划

- 行业：石油
- 技术栈：Vue3、Vite、TypeScript、Pinia、Element Plus
- 启动：`npm install && npm run dev`
- 构建：`npm run build`

这是一个功能最小闭环前端项目，数据默认保存在浏览器 localStorage 中，方便后续扩展接口、权限、图表或地图能力。

## 功能模块

- **配送调度**：创建配送单（记录承运司机、出厂封签），保留原有油站筛选与状态流转（待发车 → 运输中 → 待回单）。
- **到站回单**：司机上报实际过磅吨数、油温、封签；值班员确认或退回（退回可重报）；确认后配送单才算已到站。
- **差异处理**：偏差超过规则上限（默认 2%）或封签异常自动生成差异单并挂到司机名下；未结清前该司机不能排新配送。
- **司机资格**：资格证号登记、合格/停用，独立于回单规则与台账维护。
- **本地台账**：配送单与差异单全量记录。

## 代码结构

- `src/types.ts`：配送单、回单、差异单、司机、规则的数据模型
- `src/config/oil.ts`：常量与本地存储键
- `src/utils/receipt.ts`：回单规则判定（偏差、封签核对、差异生成）
- `src/stores/rules.ts`：回单规则（独立存储键 `hxwlfront-19-rules`）
- `src/stores/drivers.ts`：司机资格台账（`hxwlfront-19-drivers`）
- `src/stores/ledger.ts`：配送单 + 差异单本地台账（`hxwlfront-19-ledger`，兼容迁移旧数据）
- `src/components/`：五个标签页视图
