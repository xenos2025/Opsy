# 买家决策层设计

Status: implemented for Opsy PDP and Blog adapters; Page contract reserved

Date: 2026-08-07

Timezone: Asia/Shanghai

Implementation: `skills/opsy/references/workflow-buyer-decision.md`,
`skills/opsy/assets/decision-brief.example.json`, and
`skills/opsy/scripts/lib/buyer-decision.mjs`.

## 1. 设计目标

Opsy 已有三类输入和控制：

- 关键词、GSC、GA4 与运营者材料帮助发现需求；
- 商品事实、店铺资料和公开页面提供内容来源；
- `content_voice`、内容工种和发布审批控制表达与写入。

缺少的共同能力，是把事实组织成目标买家能够理解、核验并据此行动的决策材料。本文把用户口语中的“让人接受”拆成两个可验证概念：

1. **决策准备度**：发布前检查内容是否具备支持买家决定的条件。
2. **买家响应证据**：发布后观察真实买家是否阅读、点击或询盘。

系统不保证说服或转化，也不根据发布前评分宣称买家已经接受。

## 2. 范围与非目标

### 本设计负责

- 为页面、PDP 与 Blog 生成同一种买家决策简报；
- 区分需求证据与主张证据；
- 把产品事实转换为对特定买家有意义的判断；
- 检查相关性、清晰度、可信度、风险边界与下一步；
- 让各内容工作流在共同门槛之后继续执行自己的工艺检查。

### 本设计不负责

- 保证排名、转化率或询盘；
- 生成不存在的案例、认证、测试、MOQ、价格或交期；
- 强迫三种内容使用相同段落或固定 AIDA 模板；
- 取代 `content_voice`、Blog 内容工种、SEO 字段或 Shopify 双批准；
- 在 Opsy V1 新增页面写入菜单或主题编辑能力；
- 第一版建立复杂的店铺级 buyer / offer / messaging 数据库。

## 3. 共享模块

建议模块名：**买家决策层**。建议 seam 位于新的
`skills/opsy/references/workflow-buyer-decision.md`。

模块只暴露两个接口：

### 3.1 准备买家决策简报

输入：

- 内容 surface：`page`、`pdp` 或 `blog`；
- 一个主要决策阶段：`discover`、`evaluate`、`validate` 或 `inquire`；
- 运营者目标与真实买家场景；
- 当前店铺档案、`content_voice` 和已批准 CTA；
- 商品、页面、文章、媒体与其他来源事实；
- 可选的关键词、GSC、GA4 或询盘需求证据。

输出：

- 一份 `decision_brief`；
- `ready`、`needs_input` 或 `blocked` 状态；
- 缺失事实、证据冲突和待商家确认项。

不变量：

- 一份简报只服务一个主要买家场景和一个主要决定；
- 一份简报只选择一个主要决策阶段，其他阶段不能改变主要 CTA；
- 一份简报只有一个主要回答；
- 每个店铺或商品特定主张必须引用主张证据，或留在待确认项中；
- 需求证据不得作为商品能力或商业承诺的证明；
- 下一步必须使用已批准 CTA，且承诺成本与买家阶段相称；
- 关键事实缺失时可以形成本地简报，但不能伪装成可写入文案。

### 3.2 检查决策准备度

输入：

- 已确认的 `decision_brief`；
- 页面、PDP 或 Blog 草稿；
- 对应 surface 的适配规则。

输出：

- 总状态：`pass`、`fix` 或 `blocked`；
- 五项检查结果；
- 未支持主张、事实冲突、遗漏异议和 CTA 问题；
- 可以直接修改的具体建议。

模块不发布内容、不修改 Shopify，也不自动改写来源事实。写入仍由现有工作流和批准机制拥有。

## 4. `decision_brief` V1

以下结构是内容包内部合同，不是第一版店铺档案扩展：

```json
{
  "schema_version": "opsy-decision-brief-v1",
  "surface": "page|pdp|blog",
  "decision_stage": "discover|evaluate|validate|inquire",
  "buyer": {
    "role": "",
    "situation": "",
    "decision": "",
    "desired_outcome": "",
    "constraints": [],
    "questions": []
  },
  "primary_answer": {
    "statement": "",
    "buyer_value": "",
    "reason": "",
    "scope": ""
  },
  "value_translations": [
    {
      "id": "",
      "source_fact": "",
      "buyer_requirement": "",
      "buyer_value": "",
      "evidence_refs": [],
      "priority": "primary|supporting"
    }
  ],
  "objections": [
    {
      "id": "",
      "question": "",
      "why_it_blocks": "",
      "response": "",
      "evidence_refs": [],
      "status": "answered|needs_confirmation"
    }
  ],
  "boundary": {
    "fit": [],
    "not_fit": [],
    "conditions": [],
    "needs_confirmation": []
  },
  "next_step": {
    "goal": "",
    "cta_label": "",
    "cta_url": "",
    "commitment": "",
    "buyer_inputs": [],
    "buyer_receives": ""
  },
  "evidence": [
    {
      "id": "",
      "kind": "demand|claim",
      "supports": [],
      "source_ref": "",
      "status": "verified|merchant_confirmed|general_context|unresolved",
      "verified_at": null
    }
  ],
  "unresolved": [
    {
      "field_ref": "",
      "question": "",
      "blocking": true
    }
  ]
}
```

### 字段原则

- `decision_stage` 只描述这份内容主要服务的当前阶段，不建立复杂漏斗模型。它用于约束内容深度和 CTA 承诺成本。
- `buyer.questions` 来自真实询盘、销售对话、搜索需求或运营者确认；不能从关键词列表机械改写。
- `primary_answer.statement` 是这份内容要帮助买家接受并用于决定的一句话，不是标题或口号。
- `primary_answer.buyer_value` 吸收“核心价值承诺”的有用部分，但必须绑定当前买家结果，不能写成脱离证据的品牌宣言。
- `reason` 说明为什么成立；`evidence_refs` 说明凭什么相信。两者不能互相替代。
- `value_translations` 把每项 `source_fact` 对应到一个真实 `buyer_requirement` 和明确 `buyer_value`。一个事实可以有多个证据，但一个转换项只服务一个主要买家意义。
- `objections.why_it_blocks` 记录顾虑为什么会阻止当前决定，避免把“痛点”写成情绪口号；`needs_confirmation` 项不得伪装成已经回答。
- `boundary.not_fit` 不是负面文案，而是防止错误询盘和夸大承诺。
- `next_step.buyer_inputs` 与 `buyer_receives` 必须同时明确，让询盘 CTA 表达双方下一步，而不是只有“联系我们”。
- `evidence.supports` 必须指向它实际支持的主要回答、价值转换或异议回应；不能用一项证据笼统支持整份内容。
- `unresolved` 必须指向具体字段和待问问题；`blocking: true` 的内容不得进入最终买家向主张。

## 5. 五项决策准备度

### 5.1 相关性

买家能识别“这是给我、用于我当前场景的内容”。必须出现具体角色、场景或决定，不能只重复关键词。
内容深度必须符合 `decision_stage`，不能对发现阶段买家直接要求高承诺询盘，也不能对验证阶段买家只讲入门概念。

### 5.2 清晰度

主要回答明确；重要产品事实已经转换为买家意义。读者无需自行猜测规格与结果之间的关系。

### 5.3 可信度

店铺或商品特定主张能够追溯到匹配的主张证据。一般行业背景必须与当前店铺事实分开，未知项明确待确认。

### 5.4 风险边界

内容回应最可能阻止当前决定的主要异议，并说明适合、不适合、限制或需要进一步确认的条件。

### 5.5 下一步

只提供一个主要 CTA；它与店铺档案一致，说明买家下一步要提供什么、会得到什么，不要求超出当前阶段的承诺。

### 状态规则

`blocked`：

- 没有目标买家场景、主要决定或主要回答；
- 无法确定主要决策阶段，导致内容深度或 CTA 承诺不明确；
- 存在与来源事实冲突的内容；
- 商品、认证、能力或商业承诺没有匹配证据；
- 用需求数据冒充主张证据；
- CTA 为猜测路径或与店铺已批准 CTA 冲突。

`fix`：

- 事实存在，但没有解释对买家的意义；
- 主要异议、适用边界或下一步说明不足；
- 内容次序和表达让主要回答难以识别。

`pass`：

- 五项均满足，且 surface 自己的工艺门槛也能继续执行。

## 6. Surface 适配规则

共享简报不规定页面顺序。每个 surface adapter 可以另外生成
`content_blocks`，但每个 block 只能服务一个决策任务：

```json
{
  "id": "",
  "decision_task": "answer|friction|value|scene|proof|boundary|action",
  "main_point": "",
  "brief_refs": [],
  "evidence_refs": [],
  "surface_hint": ""
}
```

“一个 block 一个决策任务”吸收了“一个卖点一屏”的信息聚焦原则，
但不要求固定屏数、固定顺序或所有 surface 使用同一结构。多个事实可以
共同支持一个 block；两个互相竞争的主要信息必须拆开或重新排序。

### 页面

页面负责帮助访客判断“这个供应方或方案是否值得继续了解”。适配规则至少要求：

- 首屏表达目标买家、场景和主要回答；
- 解释方案为何成立，而非只列品牌形容词；
- 证据靠近其支持的主张；
- 处理页面对应的主要异议；
- 给出到 PDP、解决方案页或询盘的单一路径。

页面结构、视觉层级和主题发布属于建站或页面模块，不属于当前 Opsy 写入范围。

### PDP

PDP 负责帮助买家判断“这个具体商品是否适合我的项目”。适配规则至少要求：

- 主要应用场景和明确的适合 / 不适合；
- 关键规格到使用、采购或项目意义的转换；
- 可核验的产品、过程或质量证据；
- MOQ、价格、交期、认证等未知项保持待确认；
- CTA 说明询价或打样前需要提供的关键输入。

媒体、变体、SEO、metafield 与发布状态继续由商品工作流校验。

### Blog

Blog 负责帮助买家完成一个真实判断，而不是先推销商品。适配规则至少要求：

- 开头直接回答主要买家问题；
- 正文用理由、证据、比较或边界推进判断；
- 商业链接只在内容已经完成决策帮助后出现；
- 商品或店铺特定主张仍需证据；
- 继续通过现有角色、正文、图片、表格、链接与 CTA 工艺门槛。

## 7. 与现有工作流组合

组合顺序：

1. 需求证据或运营者材料确定候选主题 / 商品 / 页面任务；
2. 加载店铺事实、`content_voice` 和批准 CTA；
3. 准备并确认买家决策简报；
4. surface 适配规则生成草稿；
5. 检查决策准备度；
6. 执行 Blog、商品或页面自己的工艺门槛；
7. 进入已有预览、批准、写入和回读流程；
8. 发布后有数据时再观察买家响应。

共享门槛与 surface 门槛不能合并成一个总分。前者检查买家决定，后者检查具体交付物和平台要求。

## 8. 发布后反馈

发布后可以按内容目标观察：

- 搜索展示、点击和落地页变化；
- 页面或正文内部链接点击；
- 主 CTA 点击；
- 询盘数量、询盘内容完整度或合格度；
- 有有效对照期时的变化。

没有对应事件、有效时间范围或可比基线时，状态为 `not_observed` 或 `insufficient_data`。响应数据只能提出下一次简报或文案修订建议，不能自动修改店铺事实和主张证据。

## 9. 边缘场景

1. **关键词丰富但没有产品证明**：可以形成需求简报；可信度 `blocked`，不能写成产品能力主张。
2. **PDP 规格齐全但没有买家意义**：清晰度 `fix`，商品数据可保存，买家向描述不能称为完成。
3. **Blog 很有用但 CTA 是猜测的 WhatsApp 链接**：下一步 `blocked`，必须使用已批准路径。
4. **内容明确说明某类项目不适合**：只要事实和证据成立，风险边界应判 `pass`，不因“不够营销”扣分。
5. **发布后没有 CTA 事件数据**：决策准备度可以通过，买家响应仍为 `not_observed`。
6. **一个页面同时想服务三个买家决定**：拆分页面或选一个主要决定；不能用一份简报掩盖多个互相竞争的任务。

## 10. 外部参考的吸收范围

参考 [`ecommerce-content-wireframe`](https://github.com/saibodafu/e-commerce-skill/blob/main/skills/ecommerce-content-wireframe/SKILL.md)
时，只吸收以下可迁移原则：

- 先确认产品事实，再生成买家向内容；
- 把产品功能或规格转换为购买理由；
- 用真实场景承载抽象价值；
- 一个内容 block 只完成一个主要信息任务；
- 先确认内容文档，再进入线框或视觉表达；
- 事实、适用边界与待核查内容必须显式存在。

以下内容不进入共享模块：

- “痛点 / 痒点 / 爽点”等 DTC 情绪框架；
- 固定输出十个选项、Top 4 场景或六层页面顺序；
- 天猫、小红书、手机长图等平台表达；
- 无证据时用体感或结果表达替代主张证据；
- HTML 和视觉线框字段。

参考仅用于重新设计 Opsy 自有字段和规则，不复制外部 Skill 的原文、
固定话术或完整模板。

## 11. 建议实施顺序

1. 评审本文的术语、V1 字段和五项门槛。
2. 新建 `workflow-buyer-decision.md`，把两个接口写成可执行引导。
3. 增加可选 `decision-brief.json` 模板及契约测试。
4. 让商品包和文章包引用该简报；更新 PDP 与 Blog 批准门槛。
5. 让页面模块通过同一合同接入，但不扩张 Opsy V1 菜单和写入权限。
6. 用三份真实素材分别跑页面、PDP、Blog 场景测试，再决定是否需要店铺级 messaging 档案。
