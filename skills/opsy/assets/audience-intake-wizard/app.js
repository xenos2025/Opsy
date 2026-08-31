(() => {
  "use strict";

  const STORAGE_KEY = "opsy-audience-intake-v1";
  const VERSION = "1.1.0";
  const STEPS = ["store", "audiences", "evidence", "review"];
  const TITLES = {
    store: "基本业务",
    audiences: "客户与采购",
    evidence: "资料来源",
    review: "确认并保存",
  };
  const ROLE_TYPES = [
    ["user", "实际使用产品的人"],
    ["champion", "公司内部推动项目的人"],
    ["decision_maker", "最终拍板的人"],
    ["financial_buyer", "负责预算或付款的人"],
    ["technical_influencer", "负责技术评估的人"],
    ["procurement", "负责询价和采购的人"],
    ["other", "其他参与者"],
  ];
  const SOURCE_TYPES = [
    ["merchant_interview", "企业负责人确认"],
    ["sales_notes", "销售记录或跟进总结"],
    ["first_party_trade", "真实询盘、报价或成交记录"],
    ["buyer_faq", "已整理的常见问题资料"],
    ["provider_snapshot", "服务方交付的数据或报告"],
    ["shopify_store", "店铺已有商品或页面"],
    ["other", "其他资料"],
  ];
  const EVIDENCE_THEMES = [
    ["role", "客户是谁、负责什么"],
    ["jtbd", "客户想解决什么事情"],
    ["trigger", "客户通常什么时候来采购"],
    ["pain", "客户担心什么"],
    ["outcome", "客户想得到什么结果"],
    ["objection", "客户为什么暂不询盘或下单"],
    ["alternative", "客户现在怎样解决"],
    ["language", "客户原话"],
    ["route", "适合放在哪些内容里"],
    ["other", "其他"],
  ];
  const MATURITIES = ["none", "merchant_input", "proxy", "first_party", "mixed"];
  const REVIEW_STATUSES = [
    ["draft", "先保存，稍后再确认"],
    ["merchant_reviewed", "企业负责人或销售已确认"],
    ["data_revised", "已根据真实询盘或数据更新"],
  ];
  const ROUTES = [
    ["product", "商品详情页"],
    ["blog", "文章 / 知识内容"],
    ["provider_handoff", "交给服务方处理其他页面"],
  ];

  const localDate = () => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  };

  const els = {
    form: document.getElementById("wizard-form"),
    steps: document.getElementById("steps"),
    title: document.getElementById("section-title"),
    status: document.getElementById("status"),
    back: document.getElementById("btn-back"),
    next: document.getElementById("btn-next"),
    download: document.getElementById("btn-download"),
    importButton: document.getElementById("btn-import"),
    importFile: document.getElementById("file-import"),
    reset: document.getElementById("btn-reset"),
    help: document.getElementById("help-template"),
  };

  const blankAudience = () => ({
    audience_id: "",
    label: "",
    company_type: "",
    product_lines: "",
    market_scope: "",
    decision_roles: "",
    primary_job_to_be_done: "",
    buying_triggers: "",
    pain_points: "",
    desired_outcomes: "",
    objections: "",
    alternatives: "",
    customer_language: "",
    search_term_candidates: "",
    product_scope_keys: "",
    blog_theme_candidates: "",
    routes: ["product", "blog"],
    evidence_refs: "",
    evidence_maturity: "merchant_input",
  });

  const blankEvidence = () => ({
    evidence_id: "",
    source_type: "merchant_interview",
    source_ref: "",
    observed_at: localDate(),
    audience_ids: "",
    theme: "role",
    verbatim: "",
    context: "",
    prompted: true,
    bias_note: "",
  });

  const defaultState = () => ({
    step: "store",
    store: {
      business_model: "b2b_inquiry",
      industry: "",
      primary_markets: "",
      content_languages: "",
      product_families: "",
    },
    audiences: [blankAudience()],
    evidence_log: [],
    review: {
      status: "draft",
      reviewer: "",
      reviewed_at: "",
      notes: "",
    },
  });

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const splitList = (value) => String(value ?? "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  const joinList = (value) => Array.isArray(value) ? value.join("\n") : "";
  const slug = (value) => String(value ?? "").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const optionValue = (item) => Array.isArray(item) ? item[0] : item;
  const optionLabel = (item) => Array.isArray(item) ? item[1] : item;
  const audienceId = (audience, index) => audience.audience_id.trim() || `${slug(audience.label) || "buyer_group"}_${index + 1}`;
  const evidenceId = (row, index) => row.evidence_id.trim() || `evidence_${String(index + 1).padStart(3, "0")}`;
  const uniqueAudienceId = (label, index) => {
    const base = slug(label) || "buyer_group";
    const used = new Set(state.audiences.map((audience, audienceIndex) => audienceIndex === index ? "" : audienceId(audience, audienceIndex)));
    let suffix = index + 1;
    while (used.has(`${base}_${suffix}`)) suffix += 1;
    return `${base}_${suffix}`;
  };
  const nextEvidenceId = () => {
    const used = new Set(state.evidence_log.map(evidenceId));
    let number = 1;
    while (used.has(`evidence_${String(number).padStart(3, "0")}`)) number += 1;
    return `evidence_${String(number).padStart(3, "0")}`;
  };
  const normalizeLanguage = (value) => {
    const raw = String(value ?? "").trim();
    const key = raw.toLowerCase();
    const aliases = new Map([
      ["english", "en"], ["英文", "en"], ["英语", "en"],
      ["简体中文", "zh-CN"], ["中文", "zh-CN"], ["汉语", "zh-CN"],
      ["繁体中文", "zh-TW"], ["german", "de"], ["德语", "de"],
      ["french", "fr"], ["法语", "fr"], ["spanish", "es"], ["西班牙语", "es"],
      ["japanese", "ja"], ["日语", "ja"], ["korean", "ko"], ["韩语", "ko"],
    ]);
    return aliases.get(key) ?? raw;
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      if (!STEPS.includes(parsed.step) || !parsed.store || !Array.isArray(parsed.audiences)) return defaultState();
      return parsed;
    } catch {
      return defaultState();
    }
  }

  let state = loadState();

  function saveState(message = "草稿已自动保存在当前浏览器。") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setStatus(message, false);
    } catch {
      setStatus("浏览器没有允许自动保存；当前页面仍可继续填写并下载。", true);
    }
  }

  function setStatus(message, isError) {
    els.status.textContent = message;
    els.status.classList.toggle("is-error", Boolean(isError));
  }

  function field(label, name, value, options = {}) {
    const scope = options.scope ?? "store";
    const index = Number.isInteger(options.index) ? ` data-index="${options.index}"` : "";
    const required = options.required ? " required" : "";
    const requiredClass = options.required ? " required" : "";
    const placeholder = options.placeholder ? ` placeholder="${escapeHtml(options.placeholder)}"` : "";
    const help = options.help ? `<small>${escapeHtml(options.help)}</small>` : "";
    const full = options.full ? " field--full" : "";
    const attrs = `data-scope="${scope}" data-field="${name}"${index}`;
    const control = options.select
      ? `<select ${attrs}${required}>${options.select.map((item) => {
        const itemValue = optionValue(item);
        return `<option value="${escapeHtml(itemValue)}"${itemValue === value ? " selected" : ""}>${escapeHtml(optionLabel(item))}</option>`;
      }).join("")}</select>`
      : options.textarea
        ? `<textarea ${attrs}${required}${placeholder} rows="${options.rows ?? 4}">${escapeHtml(value)}</textarea>`
        : `<input ${attrs} type="${options.type ?? "text"}" value="${escapeHtml(value)}"${required}${placeholder}${options.readonly ? " readonly" : ""}>`;
    return `<div class="field${full}"><label class="${requiredClass.trim()}">${escapeHtml(label)}</label>${control}${help}</div>`;
  }

  function renderStore() {
    return `
      <p class="section-lead">先回答四个最基础的问题。这里没有市场规模、技术配置或数据分析，按销售平时的说法填写即可。</p>
      <div class="business-note"><strong>适用范围</strong><span>本工具只用于通过询盘、报价或样品推进成交的 B2B 店铺，系统会自动按该模式保存。</span></div>
      <div class="field-grid">
        ${field("你们主要卖什么？", "industry", state.store.industry, { required: true, placeholder: "例如：工业检修口、酒店家具、包装设备" })}
        ${field("客户主要来自哪些国家或地区？", "primary_markets", state.store.primary_markets, { required: true, textarea: true, placeholder: "美国\n德国", help: "一个国家或地区写一行。" })}
        ${field("网站内容主要用什么语言？", "content_languages", state.store.content_languages, { required: true, textarea: true, placeholder: "英文\n德语", help: "直接写语言名称，系统会自动整理。" })}
        ${field("你们有哪些主要产品线？", "product_families", state.store.product_families, { required: true, textarea: true, placeholder: "工业检修口\n防火检修门", help: "一个产品线写一行，使用销售团队平时的叫法。" })}
      </div>`;
  }

  function renderAudienceCard(audience, index) {
    const selectedRoles = new Set(splitList(audience.decision_roles).map((line) => line.split("|")[0].trim()));
    const roleChecks = ROLE_TYPES.map(([value, label]) => `
      <label class="check"><input type="checkbox" data-scope="audience-role" data-index="${index}" data-role="${value}"${selectedRoles.has(value) ? " checked" : ""}>${label}</label>`).join("");
    const routeChecks = ROUTES.map(([value, label]) => `
      <label class="check"><input type="checkbox" data-scope="audience-route" data-index="${index}" data-route="${value}"${audience.routes.includes(value) ? " checked" : ""}>${label}</label>`).join("");
    return `
      <article class="repeat-card">
        <header class="repeat-card__head">
          <div><span class="card-kicker">第 ${index + 1} 类客户</span><h3>${escapeHtml(audience.label || "还没有命名")}</h3></div>
          <button class="btn btn--danger" type="button" data-action="remove-audience" data-index="${index}"${state.audiences.length === 1 ? " disabled" : ""}>移除</button>
        </header>
        <div class="repeat-card__body">
          <h4 class="group-title">先识别这类客户</h4>
          <div class="field-grid">
            ${field("你们平时怎么称呼这类客户？", "label", audience.label, { scope: "audience", index, required: true, placeholder: "例如：采购负责人、酒店项目负责人" })}
            ${field("他们通常是什么类型的公司？", "company_type", audience.company_type, { scope: "audience", index, required: true, placeholder: "例如：生产厂家、经销商、工程公司" })}
            ${field("他们主要会看哪些产品？", "product_lines", audience.product_lines, { scope: "audience", index, required: true, textarea: true, placeholder: "工业检修口\n防火检修门", help: "一个产品或产品线写一行。" })}
            ${field("他们主要来自哪些国家或地区？", "market_scope", audience.market_scope, { scope: "audience", index, textarea: true, placeholder: "留空则沿用上一页的主要市场", help: "只有这类客户的市场不同才需要填写。" })}
          </div>
          <div class="field field--full section-field">
            <span class="field__label">他们在采购中通常负责什么？</span>
            <div class="check-grid">${roleChecks}</div>
            <small>可以多选；不知道时先留空，后续由销售负责人补充。</small>
          </div>

          <h4 class="group-title">再还原销售现场</h4>
          <div class="field-grid">
            ${field("他们现在最想解决什么问题？", "primary_job_to_be_done", audience.primary_job_to_be_done, { scope: "audience", index, required: true, textarea: true, placeholder: "例如：找到能按图纸稳定交付、可以配合打样的供应商" })}
            ${field("通常什么情况下会来找你们？", "buying_triggers", audience.buying_triggers, { scope: "audience", index, textarea: true, placeholder: "新项目立项\n现有供应商交期不稳定" })}
            ${field("采购时最担心什么？", "pain_points", audience.pain_points, { scope: "audience", index, textarea: true, placeholder: "规格不匹配\n交期不稳定\n无法提供证明资料" })}
            ${field("什么问题会让他们暂时不询盘或不下单？", "objections", audience.objections, { scope: "audience", index, textarea: true, placeholder: "最低起订量不清楚\n样品和量产差异无法确认" })}
          </div>

          <details class="optional-panel">
            <summary>进一步了解客户（选填）</summary>
            <p>这些内容有助于写得更像真实销售，但不知道可以留空。</p>
            <div class="field-grid">
              ${field("合作后，他们希望得到什么结果？", "desired_outcomes", audience.desired_outcomes, { scope: "audience", index, textarea: true })}
              ${field("如果不选你们，他们现在会怎么解决？", "alternatives", audience.alternatives, { scope: "audience", index, textarea: true })}
              ${field("客户通常会怎么问？", "customer_language", audience.customer_language, { scope: "audience", index, textarea: true, help: "只填写你确实见过或听过的说法。" })}
              ${field("客户可能会怎样搜索？", "search_term_candidates", audience.search_term_candidates, { scope: "audience", index, textarea: true, help: "不知道可留空；这里只是内容线索，不代表搜索量。" })}
              ${field("哪些问题值得写成文章？", "blog_theme_candidates", audience.blog_theme_candidates, { scope: "audience", index, textarea: true, full: true, help: "例如：如何比较供应商、询价前要准备什么。" })}
            </div>
          </details>

          <div class="field field--full section-field">
            <span class="field__label required">这些信息准备给哪里用？</span>
            <div class="check-grid">${routeChecks}</div>
            <small>不确定时保留“商品详情页”和“文章”；公司页、产品分类页或常见问题专区交给服务方处理。</small>
          </div>
          <div class="system-note">其余整理工作由系统自动完成，不需要业务人员填写。</div>
        </div>
      </article>`;
  }

  function renderAudiences() {
    return `
      <p class="section-lead">按销售团队真实接触的客户类型来填。可以记录多类客户；不知道的内容留空，不要为了“完整”而猜。</p>
      <div class="repeat-list">${state.audiences.map(renderAudienceCard).join("")}</div>
      <button class="btn add-row" type="button" data-action="add-audience">＋ 再添加一类客户</button>`;
  }

  function renderEvidenceCard(row, index) {
    const selectedAudiences = new Set(splitList(row.audience_ids));
    const audienceChecks = state.audiences.map((audience, audienceIndex) => {
      const id = audienceId(audience, audienceIndex);
      const label = audience.label || `第 ${audienceIndex + 1} 类客户`;
      return `<label class="check"><input type="checkbox" data-scope="evidence-audience" data-index="${index}" data-audience="${escapeHtml(id)}"${selectedAudiences.has(id) ? " checked" : ""}>${escapeHtml(label)}</label>`;
    }).join("");
    return `
      <article class="repeat-card">
        <header class="repeat-card__head">
          <div><span class="card-kicker">第 ${index + 1} 份资料</span><h3>${escapeHtml(optionLabel(SOURCE_TYPES.find((item) => optionValue(item) === row.source_type) ?? ["other", "其他资料"]))}</h3></div>
          <button class="btn btn--danger" type="button" data-action="remove-evidence" data-index="${index}">移除</button>
        </header>
        <div class="repeat-card__body">
          <div class="field-grid">
            ${field("这是什么资料？", "source_type", row.source_type, { scope: "evidence", index, select: SOURCE_TYPES })}
            ${field("这条信息是什么时候记录的？", "observed_at", row.observed_at, { scope: "evidence", index, required: true, type: "date" })}
            ${field("资料保存在哪里？", "source_ref", row.source_ref, { scope: "evidence", index, required: true, placeholder: "例如：8 月销售周会记录、客户询盘邮件、访谈记录文件", help: "写一个以后还能找到这份资料的位置或名称。" })}
            ${field("这份资料主要说明什么？", "theme", row.theme, { scope: "evidence", index, select: EVIDENCE_THEMES })}
          </div>
          <div class="field field--full section-field">
            <span class="field__label">这份资料对应哪类客户？</span>
            <div class="check-grid">${audienceChecks}</div>
          </div>
          <div class="field-grid">
            ${field("客户原话（如有）", "verbatim", row.verbatim, { scope: "evidence", index, textarea: true, help: "没有原话就留空，不要自己补写。" })}
            ${field("当时是什么情况？", "context", row.context, { scope: "evidence", index, textarea: true, placeholder: "例如：客户准备新项目，询问样品和交期" })}
            ${field("使用这份资料时要注意什么？", "bias_note", row.bias_note, { scope: "evidence", index, textarea: true, full: true, placeholder: "例如：只有一个客户案例，不能代表所有客户" })}
          </div>
          <label class="check section-field"><input type="checkbox" data-scope="evidence-prompted" data-index="${index}"${row.prompted ? " checked" : ""}>这是销售或负责人主动询问后得到的信息</label>
          <div class="system-note">其余整理工作由系统自动完成。</div>
        </div>
      </article>`;
  }

  function renderEvidence() {
    return `
      <p class="section-lead">告诉 Opsy：这些判断是从哪里来的。销售记录、真实询盘、客户常见问题、企业负责人确认都可以；没有资料也能先保存草稿。</p>
      <div class="repeat-list">${state.evidence_log.length ? state.evidence_log.map(renderEvidenceCard).join("") : '<div class="help-box"><strong>目前还没有添加资料。</strong><br>可以先保存草稿；但客户原话、采购习惯等内容需要有资料后才能作为已确认信息使用。</div>'}</div>
      <button class="btn add-row" type="button" data-action="add-evidence">＋ 添加一份资料来源</button>`;
  }

  function parsedRoles(value) {
    return splitList(value).map((line) => {
      const [roleType = "", ...title] = line.split("|");
      const role = ROLE_TYPES.find(([item]) => item === roleType.trim());
      return { role_type: roleType.trim(), title: title.join("|").trim() || optionLabel(role ?? ["other", "其他参与者"]) };
    }).filter((role) => ROLE_TYPES.some(([value]) => value === role.role_type));
  }

  function derivedMaturity(linkedEvidence, fallback) {
    if (linkedEvidence.length === 0) return fallback === "none" ? "none" : "merchant_input";
    const types = new Set(linkedEvidence.map((row) => row.source_type));
    if (types.has("first_party_trade")) return types.size === 1 ? "first_party" : "mixed";
    if (types.has("provider_snapshot") || types.has("shopify_store")) return "proxy";
    return "merchant_input";
  }

  function buildOutput() {
    const audienceIds = state.audiences.map(audienceId);
    const evidenceRows = state.evidence_log.map((row, index) => ({
      evidence_id: evidenceId(row, index),
      source_type: row.source_type,
      source_ref: row.source_ref.trim(),
      observed_at: row.observed_at,
      audience_ids: splitList(row.audience_ids).filter((id) => audienceIds.includes(id)),
      theme: row.theme,
      verbatim: row.verbatim.trim(),
      context: row.context.trim(),
      prompted: Boolean(row.prompted),
      bias_note: row.bias_note.trim(),
    }));
    const evidenceIds = new Set(evidenceRows.map((row) => row.evidence_id));
    return {
      schema_version: "opsy-audience-intake-v1",
      generated_at: new Date().toISOString(),
      origin: { method: "merchant_wizard", generator_version: VERSION },
      store: {
        business_model: "b2b_inquiry",
        industry: state.store.industry.trim(),
        primary_markets: splitList(state.store.primary_markets),
        content_languages: splitList(state.store.content_languages).map(normalizeLanguage),
        product_families: splitList(state.store.product_families),
      },
      audiences: state.audiences.map((audience, index) => {
        const id = audienceIds[index];
        const linkedEvidence = evidenceRows.filter((row) => row.audience_ids.includes(id));
        const importedRefs = splitList(audience.evidence_refs).filter((ref) => evidenceIds.has(ref));
        const refs = [...new Set([...importedRefs, ...linkedEvidence.map((row) => row.evidence_id)])];
        const productLines = splitList(audience.product_lines);
        return {
        audience_id: id,
        label: audience.label.trim(),
        company_type: audience.company_type.trim(),
        product_lines: productLines,
        market_scope: splitList(audience.market_scope).length ? splitList(audience.market_scope) : splitList(state.store.primary_markets),
        decision_roles: parsedRoles(audience.decision_roles),
        primary_job_to_be_done: audience.primary_job_to_be_done.trim(),
        buying_triggers: splitList(audience.buying_triggers),
        pain_points: splitList(audience.pain_points),
        desired_outcomes: splitList(audience.desired_outcomes),
        objections: splitList(audience.objections),
        alternatives: splitList(audience.alternatives),
        customer_language: splitList(audience.customer_language),
        search_term_candidates: splitList(audience.search_term_candidates),
        product_scope_keys: splitList(audience.product_scope_keys).length
          ? splitList(audience.product_scope_keys)
          : productLines.map((line) => slug(line) || line),
        blog_theme_candidates: splitList(audience.blog_theme_candidates),
        routes: audience.routes.filter((route) => ROUTES.some(([value]) => value === route)),
        evidence_refs: refs,
        evidence_maturity: derivedMaturity(linkedEvidence, audience.evidence_maturity),
      };
      }),
      evidence_log: evidenceRows,
      review: {
        status: state.review.status,
        reviewer: state.review.reviewer.trim(),
        reviewed_at: state.review.reviewed_at,
        notes: state.review.notes.trim(),
      },
    };
  }

  function browserChecks(output) {
    const checks = [];
    const add = (ok, label) => checks.push({ ok, label });
    add(Boolean(
      output.store.industry
      && output.store.primary_markets.length
      && output.store.content_languages.length
      && output.store.product_families.length
    ), "基本业务信息已填写");
    const audienceIdsValid = output.audiences.every((audience) => audience.audience_id && /^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(audience.audience_id));
    const audienceIdsUnique = new Set(output.audiences.map((audience) => audience.audience_id)).size === output.audiences.length;
    const audiencesComplete = output.audiences.every((audience) => (
      audience.label
      && audience.company_type
      && audience.primary_job_to_be_done
      && audience.product_lines.length
      && audience.routes.length
    ));
    add(Boolean(output.audiences.length && audienceIdsValid && audienceIdsUnique && audiencesComplete), "客户与采购信息已填写");
    const evidenceIds = new Set(output.evidence_log.map((row) => row.evidence_id));
    const evidenceComplete = output.evidence_log.every((row) => row.source_ref && row.observed_at && row.audience_ids.length > 0);
    const evidenceLinked = output.audiences.every((audience) => audience.evidence_refs.every((ref) => evidenceIds.has(ref)));
    add(evidenceComplete && evidenceLinked, "资料来源已填写并关联");
    if (["merchant_reviewed", "data_revised"].includes(output.review.status)) {
      add(Boolean(output.review.reviewer && output.review.reviewed_at), "已填写确认人和确认日期");
    }
    return checks;
  }

  function renderReview() {
    const output = buildOutput();
    const checks = browserChecks(output);
    const routeCounts = output.audiences.reduce((counts, audience) => {
      audience.routes.forEach((route) => { counts[route] += 1; });
      return counts;
    }, { product: 0, blog: 0, provider_handoff: 0 });
    return `
      <p class="section-lead">最后确认一下：哪些信息已经由企业负责人或销售确认。保存后，把文件发给 Opsy 即可继续使用。</p>
      <div class="summary-grid">
        <div class="summary-item"><strong>${output.audiences.length}</strong><span>客户类型</span></div>
        <div class="summary-item"><strong>${output.evidence_log.length}</strong><span>资料来源</span></div>
        <div class="summary-item"><strong>${routeCounts.product}/${routeCounts.blog}/${routeCounts.provider_handoff}</strong><span>商品页 / 文章 / 服务方</span></div>
      </div>
      <div class="field-grid">
        ${field("当前确认状态", "status", state.review.status, { scope: "review", select: REVIEW_STATUSES })}
        ${field("由谁确认？", "reviewer", state.review.reviewer, { scope: "review", placeholder: "例如：企业负责人、销售经理" })}
        ${field("确认日期", "reviewed_at", state.review.reviewed_at, { scope: "review", type: "date" })}
        ${field("补充说明", "notes", state.review.notes, { scope: "review", textarea: true })}
      </div>
      <h3>填写检查</h3>
      <ul class="validation-list" id="validation-list">${checks.map((check) => `<li class="${check.ok ? "is-good" : "is-bad"}">${check.ok ? "通过" : "待补"}：${escapeHtml(check.label)}</li>`).join("")}</ul>
      <div class="help-box">${els.help.innerHTML}</div>`;
  }

  function refreshReviewChecks() {
    if (state.step !== "review") return;
    const checks = browserChecks(buildOutput());
    const list = document.getElementById("validation-list");
    if (list) {
      list.innerHTML = checks.map((check) => `<li class="${check.ok ? "is-good" : "is-bad"}">${check.ok ? "通过" : "待补"}：${escapeHtml(check.label)}</li>`).join("");
    }
    els.download.disabled = checks.some((check) => !check.ok);
  }

  function render() {
    els.title.textContent = TITLES[state.step];
    els.form.innerHTML = state.step === "store" ? renderStore()
      : state.step === "audiences" ? renderAudiences()
        : state.step === "evidence" ? renderEvidence()
          : renderReview();
    [...els.steps.querySelectorAll(".step")].forEach((button) => button.classList.toggle("is-active", button.dataset.step === state.step));
    const index = STEPS.indexOf(state.step);
    els.back.disabled = index === 0;
    els.next.hidden = index === STEPS.length - 1;
    els.download.hidden = index !== STEPS.length - 1;
    if (state.step === "review") {
      refreshReviewChecks();
    }
  }

  function updateField(target) {
    const scope = target.dataset.scope;
    const fieldName = target.dataset.field;
    const index = Number(target.dataset.index);
    if (scope === "store") state.store[fieldName] = target.value;
    if (scope === "audience") {
      state.audiences[index][fieldName] = target.value;
      if (fieldName === "label" && !state.audiences[index].audience_id) {
        state.audiences[index].audience_id = uniqueAudienceId(target.value, index);
      }
    }
    if (scope === "evidence") state.evidence_log[index][fieldName] = target.value;
    if (scope === "review") state.review[fieldName] = target.value;
    if (scope === "audience-route") {
      const routes = new Set(state.audiences[index].routes);
      target.checked ? routes.add(target.dataset.route) : routes.delete(target.dataset.route);
      state.audiences[index].routes = [...routes];
    }
    if (scope === "audience-role") {
      const roles = new Map(parsedRoles(state.audiences[index].decision_roles).map((role) => [role.role_type, role.title]));
      if (target.checked) {
        const match = ROLE_TYPES.find(([value]) => value === target.dataset.role);
        roles.set(target.dataset.role, optionLabel(match ?? ["other", "其他参与者"]));
      } else {
        roles.delete(target.dataset.role);
      }
      state.audiences[index].decision_roles = [...roles].map(([roleType, title]) => `${roleType} | ${title}`).join("\n");
    }
    if (scope === "evidence-audience") {
      const audienceIds = new Set(splitList(state.evidence_log[index].audience_ids));
      target.checked ? audienceIds.add(target.dataset.audience) : audienceIds.delete(target.dataset.audience);
      state.evidence_log[index].audience_ids = [...audienceIds].join("\n");
    }
    if (scope === "evidence-prompted") state.evidence_log[index].prompted = target.checked;
    saveState();
    refreshReviewChecks();
  }

  els.form.addEventListener("input", (event) => {
    if (event.target.matches("input, textarea, select")) updateField(event.target);
  });
  els.form.addEventListener("change", (event) => {
    if (event.target.matches('input[type="checkbox"], select')) updateField(event.target);
  });
  els.form.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const index = Number(button.dataset.index);
    if (button.dataset.action === "add-audience") state.audiences.push(blankAudience());
    if (button.dataset.action === "remove-audience" && state.audiences.length > 1) state.audiences.splice(index, 1);
    if (button.dataset.action === "add-evidence") {
      const row = blankEvidence();
      row.evidence_id = nextEvidenceId();
      row.audience_ids = state.audiences.length ? audienceId(state.audiences[0], 0) : "";
      state.evidence_log.push(row);
    }
    if (button.dataset.action === "remove-evidence") state.evidence_log.splice(index, 1);
    saveState();
    render();
  });

  els.steps.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-step]");
    if (!button) return;
    state.step = button.dataset.step;
    saveState();
    render();
  });
  els.back.addEventListener("click", () => {
    state.step = STEPS[Math.max(0, STEPS.indexOf(state.step) - 1)];
    saveState();
    render();
  });
  els.next.addEventListener("click", () => {
    state.step = STEPS[Math.min(STEPS.length - 1, STEPS.indexOf(state.step) + 1)];
    saveState();
    render();
  });
  els.download.addEventListener("click", () => {
    const blob = new Blob([`${JSON.stringify(buildOutput(), null, 2)}\n`], { type: "application/json;charset=utf-8" });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = "audience-intake.json";
    anchor.click();
    URL.revokeObjectURL(anchor.href);
    setStatus("客户画像已下载。请把文件发回当前对话，Opsy 会继续检查和整理。", false);
  });
  els.importButton.addEventListener("click", () => els.importFile.click());
  els.importFile.addEventListener("change", async () => {
    const file = els.importFile.files?.[0];
    if (!file) return;
    try {
      const raw = JSON.parse(await file.text());
      if (raw.schema_version !== "opsy-audience-intake-v1") throw new Error("这不是 Opsy 客户画像文件");
      state = {
        step: "review",
        store: {
          business_model: "b2b_inquiry",
          industry: String(raw.store?.industry ?? ""),
          primary_markets: joinList(raw.store?.primary_markets),
          content_languages: joinList(raw.store?.content_languages),
          product_families: joinList(raw.store?.product_families),
        },
        audiences: (raw.audiences?.length ? raw.audiences : [blankAudience()]).map((audience) => ({
          audience_id: String(audience.audience_id ?? ""),
          label: String(audience.label ?? ""),
          company_type: String(audience.company_type ?? ""),
          product_lines: joinList(audience.product_lines),
          market_scope: joinList(audience.market_scope),
          decision_roles: (audience.decision_roles ?? []).map((role) => `${role.role_type ?? ""} | ${role.title ?? ""}`).join("\n"),
          primary_job_to_be_done: String(audience.primary_job_to_be_done ?? ""),
          buying_triggers: joinList(audience.buying_triggers),
          pain_points: joinList(audience.pain_points),
          desired_outcomes: joinList(audience.desired_outcomes),
          objections: joinList(audience.objections),
          alternatives: joinList(audience.alternatives),
          customer_language: joinList(audience.customer_language),
          search_term_candidates: joinList(audience.search_term_candidates),
          product_scope_keys: joinList(audience.product_scope_keys),
          blog_theme_candidates: joinList(audience.blog_theme_candidates),
          routes: Array.isArray(audience.routes) ? audience.routes : [],
          evidence_refs: joinList(audience.evidence_refs),
          evidence_maturity: MATURITIES.includes(audience.evidence_maturity) ? audience.evidence_maturity : "none",
        })),
        evidence_log: (raw.evidence_log ?? []).map((row) => ({
          evidence_id: String(row.evidence_id ?? ""),
          source_type: SOURCE_TYPES.some(([value]) => value === row.source_type) ? row.source_type : "other",
          source_ref: String(row.source_ref ?? ""),
          observed_at: String(row.observed_at ?? ""),
          audience_ids: joinList(row.audience_ids),
          theme: EVIDENCE_THEMES.some(([value]) => value === row.theme) ? row.theme : "other",
          verbatim: String(row.verbatim ?? ""),
          context: String(row.context ?? ""),
          prompted: Boolean(row.prompted),
          bias_note: String(row.bias_note ?? ""),
        })),
        review: {
          status: REVIEW_STATUSES.some(([value]) => value === raw.review?.status) ? raw.review.status : "draft",
          reviewer: String(raw.review?.reviewer ?? ""),
          reviewed_at: String(raw.review?.reviewed_at ?? ""),
          notes: String(raw.review?.notes ?? ""),
        },
      };
      saveState("已有客户画像已载入，请确认后重新下载。");
      render();
    } catch (error) {
      setStatus(`导入失败：${error.message}`, true);
    } finally {
      els.importFile.value = "";
    }
  });
  els.reset.addEventListener("click", () => {
    if (!window.confirm("重新填写会清空当前浏览器中的草稿，已经下载的文件不会受影响。继续吗？")) return;
    localStorage.removeItem(STORAGE_KEY);
    state = defaultState();
    render();
    setStatus("草稿已清空。", false);
  });

  render();
})();
