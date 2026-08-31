# -*- coding: utf-8 -*-
"""Generate Opsy terracotta diagram SVGs with UTF-8 Chinese text."""
from pathlib import Path

OUT = Path(__file__).resolve().parent

STYLE = """
.label { fill: #1F1E1D; font-family: Helvetica, Arial, "PingFang SC", "Microsoft YaHei", sans-serif; font-weight: 600; }
.label-sub { fill: #6B6560; font-family: Helvetica, Arial, "PingFang SC", "Microsoft YaHei", sans-serif; font-weight: 400; }
.label-tiny { fill: #8A8279; font-family: Helvetica, Arial, "PingFang SC", "Microsoft YaHei", sans-serif; font-weight: 400; }
.label-accent { fill: #C15F3C; font-family: Helvetica, Arial, "PingFang SC", "Microsoft YaHei", sans-serif; font-weight: 600; }
.mono { font-family: Consolas, Menlo, "Microsoft YaHei", monospace; }
"""


def header(path_label: str, w: int, h: int, aria: str, marker_ids=None) -> str:
    markers = marker_ids or [("a", "#C15F3C")]
    marker_xml = []
    for mid, color in markers:
        marker_xml.append(
            f'<marker id="{mid}" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">'
            f'<polygon points="0 0, 10 3.5, 0 7" fill="{color}"/></marker>'
        )
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-label="{aria}">
<defs>
{"".join(marker_xml)}
<style>{STYLE}</style>
</defs>
<rect width="{w}" height="{h}" rx="2" fill="#FAF7F2" stroke="#E5DFD6" stroke-width="1"/>
<rect x="0" y="0" width="4" height="48" fill="#C15F3C"/>
<line x1="0" y1="48" x2="{w}" y2="48" stroke="#C15F3C" stroke-width="1.5"/>
<text x="20" y="29" fill="#6B6560" font-size="13" class="mono">opsy / docs/diagrams / {path_label}</text>
<rect x="{w - 36}" y="18" width="16" height="12" fill="#C15F3C"/>
'''


def write(name: str, body: str) -> None:
    path = OUT / name
    path.write_text(body, encoding="utf-8", newline="\n")
    text = path.read_text(encoding="utf-8")
    cjk = sum(1 for c in text if "\u4e00" <= c <= "\u9fff")
    print(f"wrote {name} cjk={cjk} bytes={path.stat().st_size}")


def gen_01() -> None:
    w, h = 1580, 980
    body = header("01-entry-state-menu.svg", w, h, "Opsy entry state and main menu")
    body += f'''
<text x="790" y="84" text-anchor="middle" class="label" font-size="22">单入口 · 状态机 · 六项菜单</text>
<text x="790" y="108" text-anchor="middle" class="label-sub" font-size="14">$opsy → status → 横幅 → 仅展示当前可执行选项 · 不让运营者选内部 Agent</text>
<rect x="40" y="128" width="1500" height="44" rx="3" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.4"/>
<text x="60" y="155" class="label-accent" font-size="13">ENTRY · shopify-ops.json → opsy.mjs status --json → 状态横幅 → 菜单编号或自然语言目标</text>
<rect x="40" y="186" width="18" height="12" fill="#F3E6DF" stroke="#E5DFD6"/>
<text x="66" y="197" class="label-tiny" font-size="11">硬门 / Script 校验</text>
<rect x="220" y="186" width="18" height="12" fill="#FFFFFF" stroke="#E5DFD6"/>
<text x="246" y="197" class="label-tiny" font-size="11">Agent 引导执行</text>
<rect x="420" y="186" width="18" height="12" fill="#C15F3C"/>
<text x="446" y="197" class="label-tiny" font-size="11">关键路径高亮</text>
<rect x="600" y="186" width="18" height="12" fill="#FAF7F2" stroke="#E5DFD6"/>
<text x="626" y="197" class="label-tiny" font-size="11">工作区数据</text>

<rect x="40" y="214" width="240" height="420" rx="4" fill="#FFFFFF" stroke="#E5DFD6" stroke-width="1.2"/>
<rect x="40" y="214" width="240" height="52" fill="#F3E6DF"/>
<text x="160" y="236" text-anchor="middle" class="label-tiny" font-size="11">GATE 0</text>
<text x="160" y="256" text-anchor="middle" class="label" font-size="15">工作区定位</text>
<rect x="52" y="282" width="216" height="44" rx="2" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.6"/>
<text x="160" y="300" text-anchor="middle" class="label" font-size="12">shopify-ops.json</text>
<text x="160" y="318" text-anchor="middle" class="label-tiny" font-size="10">marker / workspace</text>
<rect x="52" y="334" width="216" height="44" rx="2" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.6"/>
<text x="160" y="352" text-anchor="middle" class="label" font-size="12">opsy.mjs status</text>
<text x="160" y="370" text-anchor="middle" class="label-tiny" font-size="10">--json 权威状态</text>
<rect x="52" y="386" width="216" height="44" rx="2" fill="#FFFFFF" stroke="#E5DFD6"/>
<text x="160" y="404" text-anchor="middle" class="label" font-size="12">读 AGENTS.md</text>
<text x="160" y="422" text-anchor="middle" class="label-tiny" font-size="10">永不覆盖</text>
<rect x="52" y="438" width="216" height="44" rx="2" fill="#FAF7F2" stroke="#E5DFD6"/>
<text x="160" y="456" text-anchor="middle" class="label" font-size="12">workspace_missing</text>
<text x="160" y="474" text-anchor="middle" class="label-tiny" font-size="10">先预览再创建</text>
<text x="160" y="620" text-anchor="middle" class="label-accent" font-size="11">→ 02</text>

<rect x="300" y="214" width="240" height="420" rx="4" fill="#FFFFFF" stroke="#E5DFD6" stroke-width="1.2"/>
<rect x="300" y="214" width="240" height="52" fill="#F3E6DF"/>
<text x="420" y="236" text-anchor="middle" class="label-tiny" font-size="11">STATE A</text>
<text x="420" y="256" text-anchor="middle" class="label" font-size="15">店铺连接未完成</text>
<rect x="312" y="282" width="216" height="44" rx="2" fill="#FFFFFF" stroke="#E5DFD6"/>
<text x="420" y="300" text-anchor="middle" class="label" font-size="12">企业画像问卷</text>
<text x="420" y="318" text-anchor="middle" class="label-tiny" font-size="10">买家 / 销售问题 / 审批人</text>
<rect x="312" y="334" width="216" height="44" rx="2" fill="#FFFFFF" stroke="#E5DFD6"/>
<text x="420" y="352" text-anchor="middle" class="label" font-size="12">整理 FAQ 资料</text>
<text x="420" y="370" text-anchor="middle" class="label-tiny" font-size="10">本地配置 · 冲突待确认</text>
<rect x="312" y="386" width="216" height="44" rx="2" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.6"/>
<text x="420" y="404" text-anchor="middle" class="label" font-size="12">doctor / CLI 连接</text>
<text x="420" y="422" text-anchor="middle" class="label-tiny" font-size="10">不装系统依赖</text>
<rect x="312" y="438" width="216" height="44" rx="2" fill="#FFFFFF" stroke="#E5DFD6"/>
<text x="420" y="456" text-anchor="middle" class="label" font-size="12">工作区预览</text>
<text x="420" y="474" text-anchor="middle" class="label-tiny" font-size="10">init 需确认</text>
<text x="420" y="540" text-anchor="middle" class="label-tiny" font-size="11">禁止 Admin 写入 / 技术报告</text>
<text x="420" y="620" text-anchor="middle" class="label-accent" font-size="11">→ 07</text>

<rect x="560" y="214" width="240" height="420" rx="4" fill="#FFFFFF" stroke="#C15F3C" stroke-width="1.8"/>
<rect x="560" y="214" width="240" height="52" fill="#C15F3C"/>
<text x="680" y="236" text-anchor="middle" class="label" font-size="11" fill="#FAF7F2">STATE B</text>
<text x="680" y="256" text-anchor="middle" class="label" font-size="15" fill="#FAF7F2">轻量建档未完成</text>
<rect x="572" y="282" width="216" height="44" rx="2" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.6"/>
<text x="680" y="300" text-anchor="middle" class="label" font-size="12">store-profile.json</text>
<text x="680" y="318" text-anchor="middle" class="label-tiny" font-size="10">必填证据校验</text>
<rect x="572" y="334" width="216" height="44" rx="2" fill="#FFFFFF" stroke="#E5DFD6"/>
<text x="680" y="352" text-anchor="middle" class="label" font-size="12">只读补齐档案</text>
<text x="680" y="370" text-anchor="middle" class="label-tiny" font-size="10">scope / Blog / 渠道</text>
<rect x="572" y="386" width="216" height="44" rx="2" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.6"/>
<text x="680" y="404" text-anchor="middle" class="label" font-size="12">write_capabilities</text>
<text x="680" y="422" text-anchor="middle" class="label-tiny" font-size="10">按工作流拆分</text>
<rect x="572" y="438" width="216" height="44" rx="2" fill="#FFFFFF" stroke="#E5DFD6"/>
<text x="680" y="456" text-anchor="middle" class="label" font-size="12">缺项补配置清单</text>
<text x="680" y="474" text-anchor="middle" class="label-tiny" font-size="10">FAQ 可继续本地整理</text>
<text x="680" y="540" text-anchor="middle" class="label-tiny" font-size="11">禁止运营写入 Shopify</text>
<text x="680" y="620" text-anchor="middle" class="label-accent" font-size="11">→ 07</text>

<rect x="820" y="214" width="720" height="420" rx="4" fill="#FFFFFF" stroke="#C15F3C" stroke-width="1.8"/>
<rect x="820" y="214" width="720" height="52" fill="#C15F3C"/>
<text x="1180" y="236" text-anchor="middle" class="label" font-size="11" fill="#FAF7F2">STATE C · write_ready</text>
<text x="1180" y="256" text-anchor="middle" class="label" font-size="15" fill="#FAF7F2">运营写入就绪 · 六项主菜单</text>
<rect x="840" y="286" width="210" height="70" rx="2" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.4"/>
<text x="945" y="314" text-anchor="middle" class="label" font-size="13">1 本周三件事</text>
<text x="945" y="336" text-anchor="middle" class="label-tiny" font-size="10">恰好 3 项可执行行动</text>
<rect x="1070" y="286" width="210" height="70" rx="2" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.4"/>
<text x="1175" y="314" text-anchor="middle" class="label" font-size="13">2 商品运营</text>
<text x="1175" y="336" text-anchor="middle" class="label-tiny" font-size="10">草稿 → 发布 · 04</text>
<rect x="1300" y="286" width="210" height="70" rx="2" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.4"/>
<text x="1405" y="314" text-anchor="middle" class="label" font-size="13">3 Blog 与内容</text>
<text x="1405" y="336" text-anchor="middle" class="label-tiny" font-size="10">craft + 决策简报 · 05</text>
<rect x="840" y="374" width="210" height="70" rx="2" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.4"/>
<text x="945" y="402" text-anchor="middle" class="label" font-size="13">4 404 处理</text>
<text x="945" y="424" text-anchor="middle" class="label-tiny" font-size="10">选中对才写跳转</text>
<rect x="1070" y="374" width="210" height="70" rx="2" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.4"/>
<text x="1175" y="402" text-anchor="middle" class="label" font-size="13">5 服务方数据</text>
<text x="1175" y="424" text-anchor="middle" class="label-tiny" font-size="10">本地交付 / 摘要 · 06</text>
<rect x="1300" y="374" width="210" height="70" rx="2" fill="#FFFFFF" stroke="#E5DFD6"/>
<text x="1405" y="402" text-anchor="middle" class="label" font-size="13">6 连接与企业画像</text>
<text x="1405" y="424" text-anchor="middle" class="label-tiny" font-size="10">刷新 readiness · 07</text>
<rect x="840" y="470" width="680" height="56" rx="2" fill="#FAF7F2" stroke="#E5DFD6"/>
<text x="1180" y="494" text-anchor="middle" class="label" font-size="13">写入前再查该工作流 write_capabilities.*.write_ready</text>
<text x="1180" y="514" text-anchor="middle" class="label-tiny" font-size="11">false → 只显示 missing，允许本地准备 · 详见 03-write-safety.svg</text>
<text x="1180" y="620" text-anchor="middle" class="label-accent" font-size="11">→ 03 / 04 / 05 / 06</text>

<rect x="40" y="660" width="1500" height="110" rx="4" fill="#FFFFFF" stroke="#E5DFD6"/>
<text x="60" y="688" class="label-accent" font-size="13">DATA RAIL（客户工作区，不进 Skill）</text>
<rect x="60" y="702" width="280" height="50" rx="2" fill="#FAF7F2" stroke="#E5DFD6"/>
<text x="200" y="722" text-anchor="middle" class="label" font-size="13">config/</text>
<text x="200" y="740" text-anchor="middle" class="label-tiny" font-size="10">store-profile · buyer FAQ</text>
<rect x="355" y="702" width="280" height="50" rx="2" fill="#FAF7F2" stroke="#E5DFD6"/>
<text x="495" y="722" text-anchor="middle" class="label" font-size="13">data-center/</text>
<text x="495" y="740" text-anchor="middle" class="label-tiny" font-size="10">manifest · GA4/GSC · archive</text>
<rect x="650" y="702" width="280" height="50" rx="2" fill="#FAF7F2" stroke="#E5DFD6"/>
<text x="790" y="722" text-anchor="middle" class="label" font-size="13">inbox/ · outputs/</text>
<text x="790" y="740" text-anchor="middle" class="label-tiny" font-size="10">商品 / 内容 / FAQ · 草稿</text>
<rect x="945" y="702" width="280" height="50" rx="2" fill="#FAF7F2" stroke="#E5DFD6"/>
<text x="1085" y="722" text-anchor="middle" class="label" font-size="13">ai-log/ · backups/</text>
<text x="1085" y="740" text-anchor="middle" class="label-tiny" font-size="10">操作记录 · 写前快照</text>
<rect x="1240" y="702" width="280" height="50" rx="2" fill="#FAF7F2" stroke="#E5DFD6"/>
<text x="1380" y="722" text-anchor="middle" class="label" font-size="13">tmp/opsy/</text>
<text x="1380" y="740" text-anchor="middle" class="label-tiny" font-size="10">query · variables · response</text>

<text x="790" y="820" text-anchor="middle" class="label-tiny" font-size="12">权威顺序：SKILL.md「Route by current state」+ references/state-machine.md</text>
<rect x="40" y="850" width="1500" height="90" rx="4" fill="#FFFFFF" stroke="#E5DFD6"/>
<text x="60" y="880" class="label-accent" font-size="13">与服务商多 Agent 套件的边界</text>
<text x="60" y="908" class="label-sub" font-size="13">Opsy = 企业主可执行操作面（三件事 / 商品 / Blog / 404 / 服务方数据 / 画像）· 技术验收与深度诊断仍归服务方</text>
<text x="{w - 20}" y="{h - 20}" text-anchor="end" class="label-tiny mono" font-size="11">01 / entry map / terracotta</text>
</svg>
'''
    write("01-entry-state-menu.svg", body)


def gen_02() -> None:
    w, h = 1200, 780
    body = header(
        "02-project-layout.svg",
        w,
        h,
        "Opsy skill versus workspace layout",
        [("arrow2", "#C15F3C")],
    )
    body += '''
<text x="600" y="84" text-anchor="middle" class="label" font-size="22">Skill 通用包 / 客户工作区</text>
<text x="600" y="108" text-anchor="middle" class="label-sub" font-size="14">升级 Skill 不动客户数据；永不把 skills/opsy 复制进客户仓库</text>

<rect x="60" y="130" width="480" height="430" rx="4" fill="#FFFFFF" stroke="#E5DFD6" stroke-width="1.4"/>
<rect x="60" y="130" width="480" height="44" fill="#F3E6DF"/>
<text x="300" y="158" text-anchor="middle" class="label" font-size="16">Skill 安装目录（只读通用）</text>
<text x="90" y="200" class="label-tiny mono" font-size="13">skills/opsy/</text>
<rect x="90" y="218" width="420" height="40" rx="2" fill="#FAF7F2" stroke="#E5DFD6"/>
<text x="300" y="244" text-anchor="middle" class="label" font-size="14">SKILL.md · references/ · scripts/</text>
<rect x="90" y="270" width="420" height="52" rx="2" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.6"/>
<text x="300" y="292" text-anchor="middle" class="label" font-size="14">scripts/opsy.mjs</text>
<text x="300" y="312" text-anchor="middle" class="label-tiny" font-size="11">status · init · guard · data · FAQ</text>
<rect x="90" y="336" width="420" height="40" rx="2" fill="#FAF7F2" stroke="#E5DFD6"/>
<text x="300" y="362" text-anchor="middle" class="label" font-size="14">assets/graphql · workspace 模板</text>
<rect x="90" y="388" width="420" height="40" rx="2" fill="#FAF7F2" stroke="#E5DFD6"/>
<text x="300" y="414" text-anchor="middle" class="label" font-size="14">assets/toolchain.json</text>
<text x="300" y="470" text-anchor="middle" class="label-sub" font-size="13">禁止写入客户数据、凭证、导出原文</text>
<text x="300" y="498" text-anchor="middle" class="label-tiny" font-size="12">install.ps1 / install.sh · Codex / WorkBuddy</text>
<text x="300" y="530" text-anchor="middle" class="label-tiny" font-size="12">升级：旧 Skill 归档 · 不动运营工作区</text>

<line x1="560" y1="296" x2="640" y2="296" stroke="#C15F3C" stroke-width="2.2" marker-end="url(#arrow2)"/>
<text x="600" y="278" text-anchor="middle" class="label-accent" font-size="12">init 模板</text>

<rect x="660" y="130" width="480" height="430" rx="4" fill="#FFFFFF" stroke="#C15F3C" stroke-width="1.8"/>
<rect x="660" y="130" width="480" height="44" fill="#C15F3C"/>
<text x="900" y="158" text-anchor="middle" class="label" font-size="16" fill="#FAF7F2">客户项目（每店一份）</text>
<text x="690" y="200" class="label-tiny mono" font-size="13">project/ · shopify-ops.json → workspace</text>

<rect x="690" y="218" width="200" height="78" rx="2" fill="#F3E6DF" stroke="#C15F3C"/>
<text x="790" y="246" text-anchor="middle" class="label" font-size="14">config/</text>
<text x="790" y="268" text-anchor="middle" class="label-tiny" font-size="11">store-profile.json</text>
<text x="790" y="286" text-anchor="middle" class="label-tiny" font-size="11">questionnaire · buyer_faq</text>

<rect x="910" y="218" width="200" height="78" rx="2" fill="#F3E6DF" stroke="#C15F3C"/>
<text x="1010" y="246" text-anchor="middle" class="label" font-size="14">data-center/</text>
<text x="1010" y="268" text-anchor="middle" class="label-tiny" font-size="11">manifest · snapshots</text>
<text x="1010" y="286" text-anchor="middle" class="label-tiny" font-size="11">archive/</text>

<rect x="690" y="314" width="200" height="70" rx="2" fill="#FAF7F2" stroke="#E5DFD6"/>
<text x="790" y="342" text-anchor="middle" class="label" font-size="14">inbox/</text>
<text x="790" y="364" text-anchor="middle" class="label-tiny" font-size="11">products · content · faq · data</text>

<rect x="910" y="314" width="200" height="70" rx="2" fill="#FAF7F2" stroke="#E5DFD6"/>
<text x="1010" y="342" text-anchor="middle" class="label" font-size="14">outputs/ · backups/</text>
<text x="1010" y="364" text-anchor="middle" class="label-tiny" font-size="11">草稿 · 写前快照</text>

<rect x="690" y="404" width="420" height="56" rx="2" fill="#FFFFFF" stroke="#B54A3A" stroke-dasharray="5 4"/>
<text x="900" y="429" text-anchor="middle" class="label" font-size="14" fill="#B54A3A">已有 AGENTS.md · 永不覆盖</text>
<text x="900" y="450" text-anchor="middle" class="label-tiny" font-size="11">已有 _project/ 可只补 shopify-ops.json</text>
<text x="900" y="530" text-anchor="middle" class="label-sub" font-size="13">gitignore：inbox / outputs / backups / tmp</text>

<rect x="60" y="590" width="1080" height="130" rx="4" fill="#FFFFFF" stroke="#C15F3C" stroke-width="1.6"/>
<text x="90" y="622" class="label-accent" font-size="14">SETUP · 进入运营菜单之前</text>
<text x="90" y="652" class="label" font-size="14">1. 定位或预览工作区</text>
<text x="360" y="652" class="label" font-size="14">2. init --apply（确认后）</text>
<text x="680" y="652" class="label" font-size="14">3. CLI 连接 + 建档</text>
<text x="940" y="652" class="label" font-size="14">4. write_ready</text>
<text x="90" y="688" class="label-tiny" font-size="12">opsy.mjs init 只补缺失文件 · doctor 检查 Node/Git/CLI · 连接与档案见 07-connection-profile.svg</text>

<text x="1180" y="760" text-anchor="end" class="label-tiny mono" font-size="11">02 / layout / terracotta</text>
</svg>
'''
    write("02-project-layout.svg", body)


def gen_03() -> None:
    w, h = 1320, 820
    body = header(
        "03-write-safety.svg",
        w,
        h,
        "Opsy write safety and approval ladder",
        [("arrow3", "#C15F3C"), ("arrowOk", "#4A6B54"), ("arrowFail", "#B54A3A")],
    )
    body += '''
<text x="660" y="84" text-anchor="middle" class="label" font-size="22">Shopify 写入安全阶梯</text>
<text x="660" y="108" text-anchor="middle" class="label-sub" font-size="14">预览 → 明确批准 → 执行 → 同通道回读 · CLI 退出码 0 不等于成功</text>

<rect x="480" y="130" width="360" height="52" rx="26" fill="#C15F3C"/>
<text x="660" y="162" text-anchor="middle" class="label" font-size="15" fill="#FAF7F2">准备一次确切写入</text>
<line x1="660" y1="182" x2="660" y2="214" stroke="#C15F3C" stroke-width="2" marker-end="url(#arrow3)"/>

<rect x="60" y="220" width="1200" height="200" rx="4" fill="#FFFFFF" stroke="#E5DFD6"/>
<text x="90" y="252" class="label-accent" font-size="13">HARD GATES · 批准前必须全部通过</text>
<rect x="90" y="270" width="210" height="64" rx="2" fill="#F3E6DF" stroke="#C15F3C"/>
<text x="195" y="298" text-anchor="middle" class="label" font-size="13">目标店域一致</text>
<text x="195" y="318" text-anchor="middle" class="label-tiny" font-size="11">myshopify.com</text>
<rect x="320" y="270" width="210" height="64" rx="2" fill="#F3E6DF" stroke="#C15F3C"/>
<text x="425" y="298" text-anchor="middle" class="label" font-size="13">capability ready</text>
<text x="425" y="318" text-anchor="middle" class="label-tiny" font-size="11">该工作流 write_ready</text>
<rect x="550" y="270" width="210" height="64" rx="2" fill="#F3E6DF" stroke="#C15F3C"/>
<text x="655" y="298" text-anchor="middle" class="label" font-size="13">同通道预读</text>
<text x="655" y="318" text-anchor="middle" class="label-tiny" font-size="11">CLI Store channel</text>
<rect x="780" y="270" width="210" height="64" rx="2" fill="#F3E6DF" stroke="#C15F3C"/>
<text x="885" y="298" text-anchor="middle" class="label" font-size="13">写前快照</text>
<text x="885" y="318" text-anchor="middle" class="label-tiny" font-size="11">backups/&lt;op-id&gt;/</text>
<rect x="1010" y="270" width="220" height="64" rx="2" fill="#F3E6DF" stroke="#C15F3C"/>
<text x="1120" y="298" text-anchor="middle" class="label" font-size="13">guard-mutation</text>
<text x="1120" y="318" text-anchor="middle" class="label-tiny" font-size="11">operation + variables</text>
<rect x="90" y="350" width="550" height="50" rx="2" fill="#FAF7F2" stroke="#E5DFD6"/>
<text x="365" y="380" text-anchor="middle" class="label" font-size="13">字段级预览 / diff · 期望效果 · 回读计划</text>
<rect x="660" y="350" width="570" height="50" rx="2" fill="#FAF7F2" stroke="#E5DFD6"/>
<text x="945" y="380" text-anchor="middle" class="label" font-size="13">tmp/opsy/&lt;op-id&gt;/ · query · variables · response</text>

<line x1="660" y1="420" x2="660" y2="456" stroke="#C15F3C" stroke-width="2" marker-end="url(#arrow3)"/>
<rect x="420" y="462" width="480" height="56" rx="4" fill="#FFFFFF" stroke="#C15F3C" stroke-width="1.8"/>
<text x="660" y="486" text-anchor="middle" class="label" font-size="15">明确批准 · 仅对已展示集合生效</text>
<text x="660" y="506" text-anchor="middle" class="label-tiny" font-size="11">目标/字段/值/发布时间变更 → 批准作废</text>
<line x1="660" y1="518" x2="660" y2="552" stroke="#C15F3C" stroke-width="2" marker-end="url(#arrow3)"/>

<rect x="60" y="558" width="1200" height="120" rx="4" fill="#FFFFFF" stroke="#E5DFD6"/>
<text x="90" y="588" class="label-accent" font-size="13">EXECUTE · 批准之后</text>
<rect x="90" y="604" width="250" height="52" rx="2" fill="#F3E6DF" stroke="#C15F3C"/>
<text x="215" y="626" text-anchor="middle" class="label" font-size="13">store execute</text>
<text x="215" y="644" text-anchor="middle" class="label-tiny" font-size="10">--allow-mutations</text>
<line x1="350" y1="630" x2="390" y2="630" stroke="#C15F3C" stroke-width="2" marker-end="url(#arrow3)"/>
<rect x="400" y="604" width="250" height="52" rx="2" fill="#F3E6DF" stroke="#C15F3C"/>
<text x="525" y="626" text-anchor="middle" class="label" font-size="13">check-response</text>
<text x="525" y="644" text-anchor="middle" class="label-tiny" font-size="10">同 operation name</text>
<line x1="660" y1="630" x2="700" y2="630" stroke="#C15F3C" stroke-width="2" marker-end="url(#arrow3)"/>
<rect x="710" y="604" width="250" height="52" rx="2" fill="#F3E6DF" stroke="#C15F3C"/>
<text x="835" y="626" text-anchor="middle" class="label" font-size="13">同通道回读</text>
<text x="835" y="644" text-anchor="middle" class="label-tiny" font-size="10">readback 模板</text>
<line x1="970" y1="630" x2="1010" y2="630" stroke="#C15F3C" stroke-width="2" marker-end="url(#arrow3)"/>
<rect x="1020" y="604" width="210" height="52" rx="2" fill="#E8F0EA" stroke="#4A6B54"/>
<text x="1125" y="626" text-anchor="middle" class="label" font-size="13" fill="#4A6B54">记入 operations-log</text>
<text x="1125" y="644" text-anchor="middle" class="label-tiny" font-size="10">无凭证</text>

<rect x="60" y="700" width="580" height="70" rx="4" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.4"/>
<text x="350" y="728" text-anchor="middle" class="label" font-size="14">新品 / 新文章：Approval A ≠ Approval B</text>
<text x="350" y="750" text-anchor="middle" class="label-tiny" font-size="11">A = 非公开草稿 · B = 激活/发布（回读成功后）</text>
<rect x="660" y="700" width="600" height="70" rx="4" fill="#F8E8E4" stroke="#B54A3A"/>
<text x="960" y="728" text-anchor="middle" class="label" font-size="14" fill="#B54A3A">停止条件</text>
<text x="960" y="750" text-anchor="middle" class="label-tiny" font-size="11">userErrors · 店域/scope 不一致 · 回读不匹配 · 盲目重试禁止</text>
<text x="1300" y="800" text-anchor="end" class="label-tiny mono" font-size="11">03 / write safety / terracotta</text>
</svg>
'''
    write("03-write-safety.svg", body)


def gen_04() -> None:
    w, h = 1480, 900
    body = header(
        "04-product-publish.svg",
        w,
        h,
        "Opsy product draft and publish flow",
        [("a04", "#C15F3C"), ("a04Ok", "#4A6B54")],
    )
    body += '''
<text x="740" y="84" text-anchor="middle" class="label" font-size="22">商品运营 · 双批准发布</text>
<text x="740" y="108" text-anchor="middle" class="label-sub" font-size="14">商家材料 → 商品包校验 → 买家决策简报 → Approval A 草稿 → 回读 → Approval B 发布</text>
<rect x="40" y="128" width="1400" height="40" rx="3" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.4"/>
<text x="60" y="153" class="label-accent" font-size="13">需求数据是买家兴趣证据，不能冒充产品事实 · 图片不能推断认证 / MOQ / 交期</text>

<rect x="40" y="188" width="220" height="520" rx="4" fill="#FFFFFF" stroke="#E5DFD6"/>
<rect x="40" y="188" width="220" height="48" fill="#F3E6DF"/>
<text x="150" y="208" text-anchor="middle" class="label-tiny" font-size="11">STEP 1</text>
<text x="150" y="226" text-anchor="middle" class="label" font-size="14">进料</text>
<rect x="52" y="252" width="196" height="48" rx="2" fill="#FFFFFF" stroke="#E5DFD6"/>
<text x="150" y="272" text-anchor="middle" class="label" font-size="12">聊天附件</text>
<text x="150" y="290" text-anchor="middle" class="label-tiny" font-size="10">先落 inbox</text>
<rect x="52" y="312" width="196" height="48" rx="2" fill="#FAF7F2" stroke="#E5DFD6"/>
<text x="150" y="332" text-anchor="middle" class="label" font-size="12">inbox/products/</text>
<text x="150" y="350" text-anchor="middle" class="label-tiny" font-size="10">batch / candidate</text>
<rect x="52" y="372" width="196" height="48" rx="2" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.4"/>
<text x="150" y="392" text-anchor="middle" class="label" font-size="12">suggest-keywords</text>
<text x="150" y="410" text-anchor="middle" class="label-tiny" font-size="10">route_hint=product</text>
<rect x="52" y="432" width="196" height="48" rx="2" fill="#FFFFFF" stroke="#E5DFD6"/>
<text x="150" y="452" text-anchor="middle" class="label" font-size="12">媒体分组确认</text>
<text x="150" y="470" text-anchor="middle" class="label-tiny" font-size="10">相似≠同商品</text>

<rect x="280" y="188" width="220" height="520" rx="4" fill="#FFFFFF" stroke="#E5DFD6"/>
<rect x="280" y="188" width="220" height="48" fill="#F3E6DF"/>
<text x="390" y="208" text-anchor="middle" class="label-tiny" font-size="11">STEP 2</text>
<text x="390" y="226" text-anchor="middle" class="label" font-size="14">逐项校验</text>
<rect x="292" y="252" width="196" height="48" rx="2" fill="#E8F0EA" stroke="#4A6B54"/>
<text x="390" y="280" text-anchor="middle" class="label" font-size="12" fill="#4A6B54">passed</text>
<rect x="292" y="312" width="196" height="48" rx="2" fill="#FAF7F2" stroke="#E5DFD6"/>
<text x="390" y="340" text-anchor="middle" class="label" font-size="12">needs_input</text>
<rect x="292" y="372" width="196" height="48" rx="2" fill="#F8E8E4" stroke="#B54A3A"/>
<text x="390" y="400" text-anchor="middle" class="label" font-size="12" fill="#B54A3A">blocked / excluded</text>
<rect x="292" y="432" width="196" height="64" rx="2" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.4"/>
<text x="390" y="458" text-anchor="middle" class="label" font-size="12">仅选 passed 建草稿</text>
<text x="390" y="478" text-anchor="middle" class="label-tiny" font-size="10">一项失败不拖累其他</text>

<rect x="520" y="188" width="220" height="520" rx="4" fill="#FFFFFF" stroke="#C15F3C" stroke-width="1.8"/>
<rect x="520" y="188" width="220" height="48" fill="#C15F3C"/>
<text x="630" y="208" text-anchor="middle" class="label" font-size="11" fill="#FAF7F2">STEP 3</text>
<text x="630" y="226" text-anchor="middle" class="label" font-size="14" fill="#FAF7F2">买家决策简报</text>
<rect x="532" y="252" width="196" height="48" rx="2" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.6"/>
<text x="630" y="272" text-anchor="middle" class="label" font-size="12">decision-brief.json</text>
<text x="630" y="290" text-anchor="middle" class="label-tiny" font-size="10">surface=pdp</text>
<rect x="532" y="312" width="196" height="48" rx="2" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.6"/>
<text x="630" y="332" text-anchor="middle" class="label" font-size="12">五检查 pass</text>
<text x="630" y="350" text-anchor="middle" class="label-tiny" font-size="10">validate-decision-brief</text>
<rect x="532" y="372" width="196" height="48" rx="2" fill="#FFFFFF" stroke="#E5DFD6"/>
<text x="630" y="392" text-anchor="middle" class="label" font-size="12">事实→买家价值</text>
<text x="630" y="410" text-anchor="middle" class="label-tiny" font-size="10">异议 / 适用边界</text>
<rect x="532" y="432" width="196" height="48" rx="2" fill="#FFFFFF" stroke="#E5DFD6"/>
<text x="630" y="452" text-anchor="middle" class="label" font-size="12">元字段匹配定义</text>
<text x="630" y="470" text-anchor="middle" class="label-tiny" font-size="10">不创建 definition</text>
<text x="630" y="540" text-anchor="middle" class="label-accent" font-size="11">未全 pass 不进 A</text>

<rect x="760" y="188" width="220" height="520" rx="4" fill="#FFFFFF" stroke="#C15F3C" stroke-width="1.8"/>
<rect x="760" y="188" width="220" height="48" fill="#C15F3C"/>
<text x="870" y="208" text-anchor="middle" class="label" font-size="11" fill="#FAF7F2">STEP 4</text>
<text x="870" y="226" text-anchor="middle" class="label" font-size="14" fill="#FAF7F2">Approval A</text>
<rect x="772" y="252" width="196" height="48" rx="2" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.6"/>
<text x="870" y="272" text-anchor="middle" class="label" font-size="12">status: DRAFT</text>
<text x="870" y="290" text-anchor="middle" class="label-tiny" font-size="10">product-create-draft</text>
<rect x="772" y="312" width="196" height="48" rx="2" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.6"/>
<text x="870" y="332" text-anchor="middle" class="label" font-size="12">guard-mutation</text>
<text x="870" y="350" text-anchor="middle" class="label-tiny" font-size="10">字段预览</text>
<rect x="772" y="372" width="196" height="48" rx="2" fill="#FFFFFF" stroke="#E5DFD6"/>
<text x="870" y="392" text-anchor="middle" class="label" font-size="12">execute + check</text>
<text x="870" y="410" text-anchor="middle" class="label-tiny" font-size="10">response 契约</text>
<rect x="772" y="432" width="196" height="48" rx="2" fill="#E8F0EA" stroke="#4A6B54"/>
<text x="870" y="452" text-anchor="middle" class="label" font-size="12" fill="#4A6B54">product-readback</text>
<text x="870" y="470" text-anchor="middle" class="label-tiny" font-size="10">+ media 异步态</text>

<rect x="1000" y="188" width="220" height="520" rx="4" fill="#FFFFFF" stroke="#E5DFD6"/>
<rect x="1000" y="188" width="220" height="48" fill="#F3E6DF"/>
<text x="1110" y="208" text-anchor="middle" class="label-tiny" font-size="11">STEP 5</text>
<text x="1110" y="226" text-anchor="middle" class="label" font-size="14">Approval B</text>
<rect x="1012" y="252" width="196" height="48" rx="2" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.6"/>
<text x="1110" y="272" text-anchor="middle" class="label" font-size="12">product-activate</text>
<text x="1110" y="290" text-anchor="middle" class="label-tiny" font-size="10">独立批准</text>
<rect x="1012" y="312" width="196" height="48" rx="2" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.6"/>
<text x="1110" y="332" text-anchor="middle" class="label" font-size="12">publishable-publish</text>
<text x="1110" y="350" text-anchor="middle" class="label-tiny" font-size="10">所选渠道</text>
<rect x="1012" y="372" width="196" height="48" rx="2" fill="#FFFFFF" stroke="#E5DFD6"/>
<text x="1110" y="392" text-anchor="middle" class="label" font-size="12">check + 回读</text>
<text x="1110" y="410" text-anchor="middle" class="label-tiny" font-size="10">status / pubs</text>
<rect x="1012" y="432" width="196" height="48" rx="2" fill="#FAF7F2" stroke="#E5DFD6"/>
<text x="1110" y="452" text-anchor="middle" class="label" font-size="12">handle 变更?</text>
<text x="1110" y="470" text-anchor="middle" class="label-tiny" font-size="10">→ 404 队列</text>

<rect x="1240" y="188" width="200" height="520" rx="4" fill="#FFFFFF" stroke="#E5DFD6"/>
<rect x="1240" y="188" width="200" height="48" fill="#F3E6DF"/>
<text x="1340" y="208" text-anchor="middle" class="label-tiny" font-size="11">DATA</text>
<text x="1340" y="226" text-anchor="middle" class="label" font-size="14">落盘</text>
<rect x="1252" y="252" width="176" height="64" rx="2" fill="#FAF7F2" stroke="#E5DFD6"/>
<text x="1340" y="278" text-anchor="middle" class="label" font-size="12">outputs/products/</text>
<text x="1340" y="298" text-anchor="middle" class="label-tiny" font-size="10">package + brief</text>
<rect x="1252" y="332" width="176" height="64" rx="2" fill="#FAF7F2" stroke="#E5DFD6"/>
<text x="1340" y="358" text-anchor="middle" class="label" font-size="12">ai-log/</text>
<text x="1340" y="378" text-anchor="middle" class="label-tiny" font-size="10">operations-log</text>
<rect x="1252" y="412" width="176" height="64" rx="2" fill="#FAF7F2" stroke="#E5DFD6"/>
<text x="1340" y="438" text-anchor="middle" class="label" font-size="12">backups/</text>
<text x="1340" y="458" text-anchor="middle" class="label-tiny" font-size="10">更新既有对象</text>

<line x1="260" y1="420" x2="278" y2="420" stroke="#C15F3C" stroke-width="2" marker-end="url(#a04)"/>
<line x1="500" y1="420" x2="518" y2="420" stroke="#C15F3C" stroke-width="2" marker-end="url(#a04)"/>
<line x1="740" y1="420" x2="758" y2="420" stroke="#C15F3C" stroke-width="2" marker-end="url(#a04)"/>
<line x1="980" y1="420" x2="998" y2="420" stroke="#C15F3C" stroke-width="2" marker-end="url(#a04)"/>
<line x1="1220" y1="420" x2="1238" y2="420" stroke="#4A6B54" stroke-width="2" marker-end="url(#a04Ok)"/>

<rect x="40" y="732" width="1400" height="110" rx="4" fill="#FFFFFF" stroke="#E5DFD6"/>
<text x="60" y="762" class="label-accent" font-size="13">元字段 · 只填值不改定义</text>
<text x="60" y="792" class="label" font-size="13">读现有 definition → 匹配 namespace/key/type → 更新带 compareDigest → guard metafields-set</text>
<text x="60" y="818" class="label-tiny" font-size="12">缺定义或类型不兼容：跳过并生成建站配置处理项 · 禁止创建 / 修改 / 删除 definition</text>
<text x="1460" y="880" text-anchor="end" class="label-tiny mono" font-size="11">04 / product / terracotta</text>
</svg>
'''
    write("04-product-publish.svg", body)


def gen_05() -> None:
    w, h = 1480, 880
    body = header(
        "05-blog-publish.svg",
        w,
        h,
        "Opsy blog draft and publish flow",
        [("a05", "#C15F3C")],
    )
    body += '''
<text x="740" y="84" text-anchor="middle" class="label" font-size="22">Blog 与内容 · 决策 + 工艺双门</text>
<text x="740" y="108" text-anchor="middle" class="label-sub" font-size="14">data-backed / FAQ-seeded 选题 · Blog 包校验 · 决策简报 · craft 门 · A 草稿 · B 发布/定时</text>
<rect x="40" y="128" width="1400" height="40" rx="3" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.4"/>
<text x="60" y="153" class="label-accent" font-size="13">百科式无场景稿、无商业目标稿、媒体未就绪稿：不进入 Approval A（若请求写 Shopify）</text>

<rect x="40" y="188" width="260" height="480" rx="4" fill="#FFFFFF" stroke="#E5DFD6"/>
<rect x="40" y="188" width="260" height="48" fill="#F3E6DF"/>
<text x="170" y="208" text-anchor="middle" class="label-tiny" font-size="11">STEP 1</text>
<text x="170" y="226" text-anchor="middle" class="label" font-size="14">选题与声音</text>
<rect x="52" y="254" width="236" height="52" rx="2" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.4"/>
<text x="170" y="276" text-anchor="middle" class="label" font-size="12">profile.content_voice</text>
<text x="170" y="294" text-anchor="middle" class="label-tiny" font-size="10">seller role · ready</text>
<rect x="52" y="318" width="236" height="52" rx="2" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.4"/>
<text x="170" y="340" text-anchor="middle" class="label" font-size="12">Blog topic sources</text>
<text x="170" y="358" text-anchor="middle" class="label-tiny" font-size="10">data + accepted FAQ questions</text>
<rect x="52" y="382" width="236" height="52" rx="2" fill="#FFFFFF" stroke="#E5DFD6"/>
<text x="170" y="404" text-anchor="middle" class="label" font-size="12">FAQ 影响记录</text>
<text x="170" y="422" text-anchor="middle" class="label-tiny" font-size="10">cluster · angle · route</text>
<rect x="52" y="446" width="236" height="52" rx="2" fill="#FAF7F2" stroke="#E5DFD6"/>
<text x="170" y="468" text-anchor="middle" class="label" font-size="12">inbox/content/</text>
<text x="170" y="486" text-anchor="middle" class="label-tiny" font-size="10">素材与提纲</text>

<rect x="320" y="188" width="260" height="480" rx="4" fill="#FFFFFF" stroke="#C15F3C" stroke-width="1.8"/>
<rect x="320" y="188" width="260" height="48" fill="#C15F3C"/>
<text x="450" y="208" text-anchor="middle" class="label" font-size="11" fill="#FAF7F2">STEP 2</text>
<text x="450" y="226" text-anchor="middle" class="label" font-size="14" fill="#FAF7F2">决策简报</text>
<rect x="332" y="254" width="236" height="52" rx="2" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.6"/>
<text x="450" y="276" text-anchor="middle" class="label" font-size="12">decision-brief.json</text>
<text x="450" y="294" text-anchor="middle" class="label-tiny" font-size="10">surface=blog</text>
<rect x="332" y="318" width="236" height="52" rx="2" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.6"/>
<text x="450" y="340" text-anchor="middle" class="label" font-size="12">五检查全 pass</text>
<text x="450" y="358" text-anchor="middle" class="label-tiny" font-size="10">与 PDP 同契约</text>
<rect x="332" y="382" width="236" height="52" rx="2" fill="#FFFFFF" stroke="#E5DFD6"/>
<text x="450" y="404" text-anchor="middle" class="label" font-size="12">主张需 claim 证据</text>
<text x="450" y="422" text-anchor="middle" class="label-tiny" font-size="10">需求≠产品能力</text>
<rect x="332" y="446" width="236" height="52" rx="2" fill="#FFFFFF" stroke="#E5DFD6"/>
<text x="450" y="468" text-anchor="middle" class="label" font-size="12">主 CTA / 下一步</text>
<text x="450" y="486" text-anchor="middle" class="label-tiny" font-size="10">档案确认值</text>

<rect x="600" y="188" width="260" height="480" rx="4" fill="#FFFFFF" stroke="#C15F3C" stroke-width="1.8"/>
<rect x="600" y="188" width="260" height="48" fill="#C15F3C"/>
<text x="730" y="208" text-anchor="middle" class="label" font-size="11" fill="#FAF7F2">STEP 3</text>
<text x="730" y="226" text-anchor="middle" class="label" font-size="14" fill="#FAF7F2">内容工艺记分卡</text>
<rect x="612" y="254" width="236" height="52" rx="2" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.6"/>
<text x="730" y="276" text-anchor="middle" class="label" font-size="12">writer role</text>
<text x="730" y="294" text-anchor="middle" class="label-tiny" font-size="10">content_voice</text>
<rect x="612" y="318" width="236" height="52" rx="2" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.6"/>
<text x="730" y="340" text-anchor="middle" class="label" font-size="12">topic · body</text>
<text x="730" y="358" text-anchor="middle" class="label-tiny" font-size="10">场景驱动</text>
<rect x="612" y="382" width="236" height="52" rx="2" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.6"/>
<text x="730" y="404" text-anchor="middle" class="label" font-size="12">images · table</text>
<text x="730" y="422" text-anchor="middle" class="label-tiny" font-size="10">写前媒体就绪</text>
<rect x="612" y="446" width="236" height="52" rx="2" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.6"/>
<text x="730" y="468" text-anchor="middle" class="label" font-size="12">内链 · CTA</text>
<text x="730" y="486" text-anchor="middle" class="label-tiny" font-size="10">workflow-blog-content</text>

<rect x="880" y="188" width="260" height="480" rx="4" fill="#FFFFFF" stroke="#E5DFD6"/>
<rect x="880" y="188" width="260" height="48" fill="#F3E6DF"/>
<text x="1010" y="208" text-anchor="middle" class="label-tiny" font-size="11">STEP 4</text>
<text x="1010" y="226" text-anchor="middle" class="label" font-size="14">Approval A</text>
<rect x="892" y="254" width="236" height="52" rx="2" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.6"/>
<text x="1010" y="276" text-anchor="middle" class="label" font-size="12">isPublished: false</text>
<text x="1010" y="294" text-anchor="middle" class="label-tiny" font-size="10">article-create-draft</text>
<rect x="892" y="318" width="236" height="52" rx="2" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.6"/>
<text x="1010" y="340" text-anchor="middle" class="label" font-size="12">guard → execute</text>
<text x="1010" y="358" text-anchor="middle" class="label-tiny" font-size="10">check-response</text>
<rect x="892" y="382" width="236" height="52" rx="2" fill="#E8F0EA" stroke="#4A6B54"/>
<text x="1010" y="404" text-anchor="middle" class="label" font-size="12" fill="#4A6B54">回读验证</text>
<text x="1010" y="422" text-anchor="middle" class="label-tiny" font-size="10">blog / title / body / tags</text>
<rect x="892" y="446" width="236" height="52" rx="2" fill="#FFFFFF" stroke="#E5DFD6"/>
<text x="1010" y="468" text-anchor="middle" class="label" font-size="12">已有文章修订</text>
<text x="1010" y="486" text-anchor="middle" class="label-tiny" font-size="10">快照 + 精确 diff</text>

<rect x="1160" y="188" width="280" height="480" rx="4" fill="#FFFFFF" stroke="#E5DFD6"/>
<rect x="1160" y="188" width="280" height="48" fill="#F3E6DF"/>
<text x="1300" y="208" text-anchor="middle" class="label-tiny" font-size="11">STEP 5</text>
<text x="1300" y="226" text-anchor="middle" class="label" font-size="14">Approval B</text>
<rect x="1172" y="254" width="256" height="64" rx="2" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.6"/>
<text x="1300" y="280" text-anchor="middle" class="label" font-size="13">立即发布</text>
<text x="1300" y="300" text-anchor="middle" class="label-tiny" font-size="10">或展示的精确定时</text>
<rect x="1172" y="334" width="256" height="64" rx="2" fill="#FFFFFF" stroke="#E5DFD6"/>
<text x="1300" y="360" text-anchor="middle" class="label" font-size="13">二次确认 ≠ 草稿批准</text>
<text x="1300" y="380" text-anchor="middle" class="label-tiny" font-size="10">A 永不隐含 B</text>
<rect x="1172" y="414" width="256" height="64" rx="2" fill="#E8F0EA" stroke="#4A6B54"/>
<text x="1300" y="440" text-anchor="middle" class="label" font-size="13" fill="#4A6B54">回读发表状态</text>
<text x="1300" y="460" text-anchor="middle" class="label-tiny" font-size="10">记入 operations-log</text>
<rect x="1172" y="494" width="256" height="64" rx="2" fill="#FAF7F2" stroke="#E5DFD6"/>
<text x="1300" y="520" text-anchor="middle" class="label" font-size="13">outputs/blog/&lt;handle&gt;/</text>
<text x="1300" y="540" text-anchor="middle" class="label-tiny" font-size="10">package · brief · craft</text>

<line x1="300" y1="400" x2="318" y2="400" stroke="#C15F3C" stroke-width="2" marker-end="url(#a05)"/>
<line x1="580" y1="400" x2="598" y2="400" stroke="#C15F3C" stroke-width="2" marker-end="url(#a05)"/>
<line x1="860" y1="400" x2="878" y2="400" stroke="#C15F3C" stroke-width="2" marker-end="url(#a05)"/>
<line x1="1140" y1="400" x2="1158" y2="400" stroke="#C15F3C" stroke-width="2" marker-end="url(#a05)"/>

<rect x="40" y="692" width="1400" height="130" rx="4" fill="#FFFFFF" stroke="#E5DFD6"/>
<text x="60" y="724" class="label-accent" font-size="13">与商品共用买家决策层 · 与服务商 Blog SEO/GEO Agent 分工</text>
<text x="60" y="754" class="label" font-size="13">Opsy：可执行的草稿/修订/发布菜单 + craft 门槛 · 深度评分队列与 GEO 诊断仍归客户仓库 monthly-loop</text>
<text x="60" y="784" class="label-tiny" font-size="12">权威：workflow-blog.md · workflow-blog-content.md · workflow-buyer-decision.md</text>
<text x="1460" y="860" text-anchor="end" class="label-tiny mono" font-size="11">05 / blog / terracotta</text>
</svg>
'''
    write("05-blog-publish.svg", body)


def gen_06() -> None:
    w, h = 1400, 860
    body = header(
        "06-monthly-data.svg",
        w,
        h,
        "Opsy monthly data and keyword suggestions",
        [("a06", "#C15F3C"), ("a06Ok", "#4A6B54")],
    )
    body += '''
<text x="700" y="84" text-anchor="middle" class="label" font-size="22">服务方数据 + FAQ · Blog 选题证据门</text>
<text x="700" y="108" text-anchor="middle" class="label-sub" font-size="14">企业主不连接 Google API · 数据优先 · 新站可用已接受 FAQ 问题冷启动</text>

<rect x="40" y="130" width="640" height="220" rx="4" fill="#FFFFFF" stroke="#E5DFD6"/>
<rect x="40" y="130" width="640" height="44" fill="#F3E6DF"/>
<text x="360" y="158" text-anchor="middle" class="label" font-size="15">路径 A · 新站 / 尚无搜索数据</text>
<rect x="60" y="192" width="180" height="56" rx="2" fill="#F3E6DF" stroke="#C15F3C"/>
<text x="150" y="216" text-anchor="middle" class="label" font-size="12">有效空 manifest</text>
<text x="150" y="234" text-anchor="middle" class="label-tiny" font-size="10">无 GSC / GA4</text>
<line x1="250" y1="220" x2="280" y2="220" stroke="#C15F3C" stroke-width="2" marker-end="url(#a06)"/>
<rect x="290" y="192" width="180" height="56" rx="2" fill="#F3E6DF" stroke="#C15F3C"/>
<text x="380" y="216" text-anchor="middle" class="label" font-size="12">suggest-faq-topics</text>
<text x="380" y="234" text-anchor="middle" class="label-tiny" font-size="10">approved · language · scope</text>
<line x1="480" y1="220" x2="510" y2="220" stroke="#C15F3C" stroke-width="2" marker-end="url(#a06)"/>
<rect x="520" y="192" width="140" height="56" rx="2" fill="#E8F0EA" stroke="#4A6B54"/>
<text x="590" y="216" text-anchor="middle" class="label" font-size="12" fill="#4A6B54">FAQ-seeded Blog</text>
<text x="590" y="234" text-anchor="middle" class="label-tiny" font-size="10">无 seed 才 blocked</text>
<text x="360" y="290" text-anchor="middle" class="label-tiny" font-size="12">无数字结论 · 无搜索量/KD 推断</text>
<text x="360" y="320" text-anchor="middle" class="label-tiny" font-size="12">企业主无需技术人员或 Google 凭证</text>

<rect x="720" y="130" width="640" height="220" rx="4" fill="#FFFFFF" stroke="#E5DFD6"/>
<rect x="720" y="130" width="640" height="44" fill="#F3E6DF"/>
<text x="1040" y="158" text-anchor="middle" class="label" font-size="15">路径 B · 服务方本地数据包</text>
<rect x="740" y="192" width="180" height="56" rx="2" fill="#F3E6DF" stroke="#C15F3C"/>
<text x="830" y="216" text-anchor="middle" class="label" font-size="12">检查 package</text>
<text x="830" y="234" text-anchor="middle" class="label-tiny" font-size="10">manifest 兼容</text>
<line x1="930" y1="220" x2="960" y2="220" stroke="#C15F3C" stroke-width="2" marker-end="url(#a06)"/>
<rect x="970" y="192" width="180" height="56" rx="2" fill="#F3E6DF" stroke="#C15F3C"/>
<text x="1060" y="216" text-anchor="middle" class="label" font-size="12">归档旧快照</text>
<text x="1060" y="234" text-anchor="middle" class="label-tiny" font-size="10">archive/YYYY-MM</text>
<line x1="1160" y1="220" x2="1190" y2="220" stroke="#C15F3C" stroke-width="2" marker-end="url(#a06)"/>
<rect x="1200" y="192" width="140" height="56" rx="2" fill="#E8F0EA" stroke="#4A6B54"/>
<text x="1270" y="216" text-anchor="middle" class="label" font-size="12" fill="#4A6B54">复制 + 校验</text>
<text x="1270" y="234" text-anchor="middle" class="label-tiny" font-size="10">失败保留证据</text>
<text x="1040" y="290" text-anchor="middle" class="label-tiny" font-size="12">只复制批准文件 · 永不从包中带入凭证</text>
<text x="1040" y="320" text-anchor="middle" class="label-tiny" font-size="12">客户可无 Google 密钥</text>

<rect x="40" y="380" width="1320" height="200" rx="4" fill="#FFFFFF" stroke="#C15F3C" stroke-width="1.6"/>
<text x="60" y="412" class="label-accent" font-size="13">HELPER 三连 · 默认只预览 · --apply 才落盘</text>
<rect x="60" y="432" width="380" height="120" rx="2" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.4"/>
<text x="250" y="468" text-anchor="middle" class="label" font-size="15">validate-data</text>
<text x="250" y="494" text-anchor="middle" class="label-tiny" font-size="12">manifest · 列 · 行数</text>
<text x="250" y="516" text-anchor="middle" class="label-tiny" font-size="12">日期范围 · 时区 · pulled_at</text>
<rect x="470" y="432" width="380" height="120" rx="2" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.4"/>
<text x="660" y="468" text-anchor="middle" class="label" font-size="15">summarize-data</text>
<text x="660" y="494" text-anchor="middle" class="label-tiny" font-size="12">一页摘要 · 可追溯指标</text>
<text x="660" y="516" text-anchor="middle" class="label-tiny" font-size="12">最多 3 条运营提示</text>
<rect x="880" y="432" width="450" height="120" rx="2" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.4"/>
<text x="1105" y="468" text-anchor="middle" class="label" font-size="15">topic suggestions</text>
<text x="1105" y="494" text-anchor="middle" class="label-tiny" font-size="12">suggest-keywords + suggest-faq-topics</text>
<text x="1105" y="516" text-anchor="middle" class="label-tiny" font-size="12">data_backed / faq_seeded</text>

<rect x="40" y="610" width="1320" height="180" rx="4" fill="#FFFFFF" stroke="#E5DFD6"/>
<text x="60" y="642" class="label-accent" font-size="13">建议队列 · 不是授权写稿</text>
<rect x="60" y="660" width="300" height="100" rx="2" fill="#FAF7F2" stroke="#E5DFD6"/>
<text x="210" y="700" text-anchor="middle" class="label" font-size="13">keyword-suggestions-YYYY-MM.csv</text>
<text x="210" y="724" text-anchor="middle" class="label-tiny" font-size="11">outputs/monthly/</text>
<text x="210" y="744" text-anchor="middle" class="label-tiny" font-size="11">selection_status=suggested</text>
<line x1="380" y1="710" x2="430" y2="710" stroke="#C15F3C" stroke-width="2" marker-end="url(#a06)"/>
<rect x="440" y="660" width="280" height="100" rx="2" fill="#FFFFFF" stroke="#E5DFD6"/>
<text x="580" y="700" text-anchor="middle" class="label" font-size="13">运营者确认适配</text>
<text x="580" y="724" text-anchor="middle" class="label-tiny" font-size="11">最多 3 个相关 query</text>
<text x="580" y="744" text-anchor="middle" class="label-tiny" font-size="11">记录 evidence_refs</text>
<line x1="740" y1="710" x2="790" y2="710" stroke="#C15F3C" stroke-width="2" marker-end="url(#a06)"/>
<rect x="800" y="660" width="250" height="100" rx="2" fill="#F3E6DF" stroke="#C15F3C"/>
<text x="925" y="700" text-anchor="middle" class="label" font-size="13">商品 / Blog 工作流</text>
<text x="925" y="724" text-anchor="middle" class="label-tiny" font-size="11">仍要决策简报</text>
<text x="925" y="744" text-anchor="middle" class="label-tiny" font-size="11">见 04 / 05</text>
<line x1="1070" y1="710" x2="1120" y2="710" stroke="#4A6B54" stroke-width="2" marker-end="url(#a06Ok)"/>
<rect x="1130" y="660" width="200" height="100" rx="2" fill="#F8E8E4" stroke="#B54A3A"/>
<text x="1230" y="700" text-anchor="middle" class="label" font-size="13" fill="#B54A3A">禁止</text>
<text x="1230" y="724" text-anchor="middle" class="label-tiny" font-size="11">无依据自动选题</text>
<text x="1230" y="744" text-anchor="middle" class="label-tiny" font-size="11">冒充产品事实</text>
<text x="1380" y="840" text-anchor="end" class="label-tiny mono" font-size="11">06 / monthly data / terracotta</text>
</svg>
'''
    write("06-monthly-data.svg", body)


def gen_07() -> None:
    w, h = 1400, 820
    body = header(
        "07-connection-profile.svg",
        w,
        h,
        "Opsy connection and store profile ladder",
        [("a07", "#C15F3C")],
    )
    body += '''
<text x="700" y="84" text-anchor="middle" class="label" font-size="22">连接与企业画像</text>
<text x="700" y="108" text-anchor="middle" class="label-sub" font-size="14">连接前可做画像与 FAQ 整理 · 不做技术报告 · 连接后拆分 write_ready</text>

<rect x="40" y="140" width="250" height="300" rx="4" fill="#FFFFFF" stroke="#E5DFD6"/>
<rect x="40" y="140" width="250" height="48" fill="#F3E6DF"/>
<text x="165" y="160" text-anchor="middle" class="label-tiny" font-size="11">LADDER 1</text>
<text x="165" y="178" text-anchor="middle" class="label" font-size="14">连接前</text>
<rect x="56" y="208" width="218" height="48" rx="2" fill="#FFFFFF" stroke="#E5DFD6"/>
<text x="165" y="236" text-anchor="middle" class="label" font-size="12">企业画像问卷</text>
<rect x="56" y="268" width="218" height="48" rx="2" fill="#FFFFFF" stroke="#E5DFD6"/>
<text x="165" y="296" text-anchor="middle" class="label" font-size="12">经营事实 / FAQ 整理</text>
<rect x="56" y="328" width="218" height="48" rx="2" fill="#F3E6DF" stroke="#C15F3C"/>
<text x="165" y="356" text-anchor="middle" class="label" font-size="12">opsy.mjs doctor</text>
<text x="165" y="420" text-anchor="middle" class="label-tiny" font-size="11">禁止 Admin 推断 / 写入</text>

<line x1="300" y1="290" x2="340" y2="290" stroke="#C15F3C" stroke-width="2" marker-end="url(#a07)"/>

<rect x="350" y="140" width="250" height="300" rx="4" fill="#FFFFFF" stroke="#C15F3C" stroke-width="1.8"/>
<rect x="350" y="140" width="250" height="48" fill="#C15F3C"/>
<text x="475" y="160" text-anchor="middle" class="label" font-size="11" fill="#FAF7F2">LADDER 2</text>
<text x="475" y="178" text-anchor="middle" class="label" font-size="14" fill="#FAF7F2">Shopify CLI 连接</text>
<rect x="366" y="208" width="218" height="48" rx="2" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.6"/>
<text x="475" y="228" text-anchor="middle" class="label" font-size="12">CLI 版本钉扎</text>
<text x="475" y="246" text-anchor="middle" class="label-tiny" font-size="10">toolchain.json</text>
<rect x="366" y="268" width="218" height="48" rx="2" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.6"/>
<text x="475" y="288" text-anchor="middle" class="label" font-size="12">store auth</text>
<text x="475" y="306" text-anchor="middle" class="label-tiny" font-size="10">不读凭证文件</text>
<rect x="366" y="328" width="218" height="48" rx="2" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.6"/>
<text x="475" y="348" text-anchor="middle" class="label" font-size="12">只读 smoke</text>
<text x="475" y="366" text-anchor="middle" class="label-tiny" font-size="10">scopes + 时间戳</text>
<text x="475" y="420" text-anchor="middle" class="label-tiny" font-size="11">店域必须一致</text>

<line x1="610" y1="290" x2="650" y2="290" stroke="#C15F3C" stroke-width="2" marker-end="url(#a07)"/>

<rect x="660" y="140" width="250" height="300" rx="4" fill="#FFFFFF" stroke="#C15F3C" stroke-width="1.8"/>
<rect x="660" y="140" width="250" height="48" fill="#C15F3C"/>
<text x="785" y="160" text-anchor="middle" class="label" font-size="11" fill="#FAF7F2">LADDER 3</text>
<text x="785" y="178" text-anchor="middle" class="label" font-size="14" fill="#FAF7F2">轻量档案</text>
<rect x="676" y="208" width="218" height="48" rx="2" fill="#F3E6DF" stroke="#C15F3C" stroke-width="1.6"/>
<text x="785" y="228" text-anchor="middle" class="label" font-size="12">store-profile.json</text>
<text x="785" y="246" text-anchor="middle" class="label-tiny" font-size="10">必填证据校验</text>
<rect x="676" y="268" width="218" height="48" rx="2" fill="#FFFFFF" stroke="#E5DFD6"/>
<text x="785" y="288" text-anchor="middle" class="label" font-size="12">Blog / 发布渠道</text>
<text x="785" y="306" text-anchor="middle" class="label-tiny" font-size="10">市场 · 语言 · CTA</text>
<rect x="676" y="328" width="218" height="48" rx="2" fill="#FFFFFF" stroke="#E5DFD6"/>
<text x="785" y="348" text-anchor="middle" class="label" font-size="12">content_voice</text>
<text x="785" y="366" text-anchor="middle" class="label-tiny" font-size="10">卖家角色</text>
<text x="785" y="420" text-anchor="middle" class="label-tiny" font-size="11">手填 complete 不算通过</text>

<line x1="920" y1="290" x2="960" y2="290" stroke="#C15F3C" stroke-width="2" marker-end="url(#a07)"/>

<rect x="970" y="140" width="390" height="300" rx="4" fill="#FFFFFF" stroke="#E5DFD6"/>
<rect x="970" y="140" width="390" height="48" fill="#F3E6DF"/>
<text x="1165" y="160" text-anchor="middle" class="label-tiny" font-size="11">LADDER 4</text>
<text x="1165" y="178" text-anchor="middle" class="label" font-size="14">按工作流能力拆分</text>
<rect x="990" y="208" width="160" height="70" rx="2" fill="#E8F0EA" stroke="#4A6B54"/>
<text x="1070" y="238" text-anchor="middle" class="label" font-size="12" fill="#4A6B54">products</text>
<text x="1070" y="258" text-anchor="middle" class="label-tiny" font-size="10">write_ready?</text>
<rect x="1170" y="208" width="160" height="70" rx="2" fill="#E8F0EA" stroke="#4A6B54"/>
<text x="1250" y="238" text-anchor="middle" class="label" font-size="12" fill="#4A6B54">blog</text>
<text x="1250" y="258" text-anchor="middle" class="label-tiny" font-size="10">write_ready?</text>
<rect x="990" y="294" width="160" height="70" rx="2" fill="#FAF7F2" stroke="#E5DFD6"/>
<text x="1070" y="324" text-anchor="middle" class="label" font-size="12">redirects</text>
<text x="1070" y="344" text-anchor="middle" class="label-tiny" font-size="10">missing → 清单</text>
<rect x="1170" y="294" width="160" height="70" rx="2" fill="#FAF7F2" stroke="#E5DFD6"/>
<text x="1250" y="324" text-anchor="middle" class="label" font-size="12">metafields</text>
<text x="1250" y="344" text-anchor="middle" class="label-tiny" font-size="10">定义须已存在</text>
<text x="1165" y="420" text-anchor="middle" class="label-tiny" font-size="11">缺能力只挡该工作流 · 本地准备仍可做</text>

<rect x="40" y="470" width="1320" height="140" rx="4" fill="#FFFFFF" stroke="#E5DFD6"/>
<text x="60" y="502" class="label-accent" font-size="13">连接证据 · 必须可验证</text>
<rect x="60" y="520" width="240" height="64" rx="2" fill="#F3E6DF" stroke="#C15F3C"/>
<text x="180" y="548" text-anchor="middle" class="label" font-size="13">store_domain 一致</text>
<text x="180" y="568" text-anchor="middle" class="label-tiny" font-size="10">profile ↔ connection</text>
<rect x="320" y="520" width="240" height="64" rx="2" fill="#F3E6DF" stroke="#C15F3C"/>
<text x="440" y="548" text-anchor="middle" class="label" font-size="13">timestamps</text>
<text x="440" y="568" text-anchor="middle" class="label-tiny" font-size="10">连接 / 档案新鲜度</text>
<rect x="580" y="520" width="240" height="64" rx="2" fill="#F3E6DF" stroke="#C15F3C"/>
<text x="700" y="548" text-anchor="middle" class="label" font-size="13">granted scopes</text>
<text x="700" y="568" text-anchor="middle" class="label-tiny" font-size="10">按写入能力映射</text>
<rect x="840" y="520" width="240" height="64" rx="2" fill="#F3E6DF" stroke="#C15F3C"/>
<text x="960" y="548" text-anchor="middle" class="label" font-size="13">read-only smoke</text>
<text x="960" y="568" text-anchor="middle" class="label-tiny" font-size="10">同通道证据</text>
<rect x="1100" y="520" width="240" height="64" rx="2" fill="#F8E8E4" stroke="#B54A3A"/>
<text x="1220" y="548" text-anchor="middle" class="label" font-size="13" fill="#B54A3A">凭证卫生</text>
<text x="1220" y="568" text-anchor="middle" class="label-tiny" font-size="10">永不读/记 token</text>

<rect x="40" y="640" width="1320" height="120" rx="4" fill="#FFFFFF" stroke="#E5DFD6"/>
<text x="60" y="674" class="label-accent" font-size="13">企业主版 Site Foundation 边界</text>
<text x="60" y="706" class="label" font-size="13">只保留画像问卷：产品线 · 买家角色 · 销售问题 · 异议 · 商业事实 · 受限主张 · 负责人</text>
<text x="60" y="736" class="label-tiny" font-size="12">不提供 Tracking · CWV · 结构化数据 · 索引抓取 · 主题代码或其他技术验收报告</text>
<text x="1380" y="800" text-anchor="end" class="label-tiny mono" font-size="11">07 / connection / terracotta</text>
</svg>
'''
    write("07-connection-profile.svg", body)


def gen_08() -> None:
    w, h = 1320, 780
    body = header(
        "08-404-redirect.svg",
        w,
        h,
        "Opsy 404 triage and selected redirects",
        [("a08", "#C15F3C"), ("a08Fail", "#B54A3A")],
    )
    body += '''
<text x="660" y="84" text-anchor="middle" class="label" font-size="22">404 分诊 · 选中跳转才写入</text>
<text x="660" y="108" text-anchor="middle" class="label-sub" font-size="14">refresh 只建本地队列 · 永不默认全量跳首页 · 批准集合外无写入</text>

<rect x="40" y="130" width="1240" height="100" rx="4" fill="#FFFFFF" stroke="#E5DFD6"/>
<text x="60" y="158" class="label-accent" font-size="13">队列来源</text>
<rect x="60" y="174" width="270" height="40" rx="2" fill="#FAF7F2" stroke="#E5DFD6"/>
<text x="195" y="198" text-anchor="middle" class="label" font-size="12">gsc_not_found.csv（选填）</text>
<rect x="350" y="174" width="270" height="40" rx="2" fill="#FAF7F2" stroke="#E5DFD6"/>
<text x="485" y="198" text-anchor="middle" class="label" font-size="12">历史未决队列</text>
<rect x="640" y="174" width="270" height="40" rx="2" fill="#FAF7F2" stroke="#E5DFD6"/>
<text x="775" y="198" text-anchor="middle" class="label" font-size="12">handle-changes.csv</text>
<rect x="930" y="174" width="320" height="40" rx="2" fill="#FAF7F2" stroke="#E5DFD6"/>
<text x="1090" y="198" text-anchor="middle" class="label" font-size="12">运营者显式提供的 URL</text>

<line x1="660" y1="230" x2="660" y2="260" stroke="#C15F3C" stroke-width="2" marker-end="url(#a08)"/>
<rect x="420" y="266" width="480" height="48" rx="24" fill="#C15F3C"/>
<text x="660" y="296" text-anchor="middle" class="label" font-size="15" fill="#FAF7F2">opsy.mjs refresh-404 · 默认预览</text>
<line x1="660" y1="314" x2="660" y2="344" stroke="#C15F3C" stroke-width="2" marker-end="url(#a08)"/>

<rect x="40" y="350" width="1240" height="160" rx="4" fill="#FFFFFF" stroke="#E5DFD6"/>
<text x="60" y="380" class="label-accent" font-size="13">逐条核实后分类</text>
<rect x="60" y="400" width="220" height="80" rx="2" fill="#E8F0EA" stroke="#4A6B54"/>
<text x="170" y="434" text-anchor="middle" class="label" font-size="14" fill="#4A6B54">redirect</text>
<text x="170" y="456" text-anchor="middle" class="label-tiny" font-size="11">等价替代存在</text>
<rect x="300" y="400" width="220" height="80" rx="2" fill="#F3E6DF" stroke="#C15F3C"/>
<text x="410" y="434" text-anchor="middle" class="label" font-size="14">fix_source</text>
<text x="410" y="456" text-anchor="middle" class="label-tiny" font-size="11">修内链 / sitemap</text>
<rect x="540" y="400" width="220" height="80" rx="2" fill="#FAF7F2" stroke="#E5DFD6"/>
<text x="650" y="434" text-anchor="middle" class="label" font-size="14">keep_gone</text>
<text x="650" y="456" text-anchor="middle" class="label-tiny" font-size="11">应保持 404/410</text>
<rect x="780" y="400" width="220" height="80" rx="2" fill="#FAF7F2" stroke="#E5DFD6"/>
<text x="890" y="434" text-anchor="middle" class="label" font-size="14">ignore_junk</text>
<text x="890" y="456" text-anchor="middle" class="label-tiny" font-size="11">探针 / 无业务价值</text>
<rect x="1020" y="400" width="240" height="80" rx="2" fill="#F8E8E4" stroke="#B54A3A"/>
<text x="1140" y="434" text-anchor="middle" class="label" font-size="14" fill="#B54A3A">needs_review</text>
<text x="1140" y="456" text-anchor="middle" class="label-tiny" font-size="11">证据不足 · 不写</text>

<rect x="40" y="540" width="800" height="160" rx="4" fill="#FFFFFF" stroke="#C15F3C" stroke-width="1.6"/>
<text x="60" y="572" class="label-accent" font-size="13">仅 redirect · 运营者勾选的 path → target</text>
<rect x="60" y="590" width="170" height="80" rx="2" fill="#F3E6DF" stroke="#C15F3C"/>
<text x="145" y="622" text-anchor="middle" class="label" font-size="12">精确对展示</text>
<text x="145" y="642" text-anchor="middle" class="label-tiny" font-size="10">逐对核实</text>
<line x1="240" y1="630" x2="270" y2="630" stroke="#C15F3C" stroke-width="2" marker-end="url(#a08)"/>
<rect x="280" y="590" width="170" height="80" rx="2" fill="#F3E6DF" stroke="#C15F3C"/>
<text x="365" y="622" text-anchor="middle" class="label" font-size="12">guard</text>
<text x="365" y="642" text-anchor="middle" class="label-tiny" font-size="10">url-redirect-create</text>
<line x1="460" y1="630" x2="490" y2="630" stroke="#C15F3C" stroke-width="2" marker-end="url(#a08)"/>
<rect x="500" y="590" width="150" height="80" rx="2" fill="#FFFFFF" stroke="#E5DFD6"/>
<text x="575" y="622" text-anchor="middle" class="label" font-size="12">明确批准</text>
<text x="575" y="642" text-anchor="middle" class="label-tiny" font-size="10">仅该集合</text>
<line x1="660" y1="630" x2="690" y2="630" stroke="#C15F3C" stroke-width="2" marker-end="url(#a08)"/>
<rect x="700" y="590" width="120" height="80" rx="2" fill="#E8F0EA" stroke="#4A6B54"/>
<text x="760" y="622" text-anchor="middle" class="label" font-size="12" fill="#4A6B54">执行</text>
<text x="760" y="642" text-anchor="middle" class="label-tiny" font-size="10">+ 回读</text>

<rect x="860" y="540" width="420" height="160" rx="4" fill="#F8E8E4" stroke="#B54A3A"/>
<text x="1070" y="580" text-anchor="middle" class="label" font-size="15" fill="#B54A3A">硬禁止</text>
<text x="1070" y="612" text-anchor="middle" class="label" font-size="13">把无关 404 一律跳首页</text>
<text x="1070" y="640" text-anchor="middle" class="label" font-size="13">批准队列外的自动写入</text>
<text x="1070" y="668" text-anchor="middle" class="label-tiny" font-size="11">一项失败 ≠ 其余成功</text>

<text x="660" y="740" text-anchor="middle" class="label-tiny" font-size="12">--apply 只保存本地队列 · Shopify 写入仍须 guard + 批准 + check-response + node-redirect-readback</text>
<text x="1300" y="760" text-anchor="end" class="label-tiny mono" font-size="11">08 / 404 / terracotta</text>
</svg>
'''
    write("08-404-redirect.svg", body)


if __name__ == "__main__":
    gen_01()
    gen_02()
    gen_03()
    gen_04()
    gen_05()
    gen_06()
    gen_07()
    gen_08()
    # clean probes
    for name in (
        "_utf8_probe.svg",
        "_utf8_probe2.svg",
        "_from_py_chinese.svg",
        "_utf8_probe.py",
        "_zh_in_py.py",
    ):
        p = OUT / name
        if p.exists():
            p.unlink()
            print(f"removed {name}")
