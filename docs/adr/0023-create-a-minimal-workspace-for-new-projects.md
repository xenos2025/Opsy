# 新建型项目创建最小运营工作区

新建型项目默认创建根定位文件 `shopify-ops.json` 和 `shopify-ops/` 工作区。工作区包含：客户 `README.md`、局部 `.gitignore`、`config/store-profile.json`、`data-center/manifest.json` 与 `archive/`、`inbox/products/`、`inbox/content/`、`inbox/data/`、`outputs/`、`ai-log/operations-log.md`、`backups/` 和 `tmp/`。功能输出子目录按需创建，不预生成大量空模板。

`outputs/`、`backups/`、`tmp/` 与 `inbox/` 默认不提交 Git；`config/`、`data-center/`、`ai-log/` 和说明文档可以进入 Git。Skill 保持安装在 Codex 或 WorkBuddy，不复制进客户工作区。仓库型 `_project/` 继续沿用原结构，不强制迁移到新布局。
