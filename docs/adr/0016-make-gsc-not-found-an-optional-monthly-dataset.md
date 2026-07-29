# 404 候选数据作为月度数据中心的选填文件

服务方可以在现有 `data-center/` 结构中交付选填的 `gsc_not_found.csv`，并在 `manifest.json` 中记录来源、范围、导出时间、行数和字段。该文件通常来自 Search Console Page Indexing 的 Not found 示例，用于补充公开检查和客户手动提供的 URL；它不建立新的数据目录或客户 Google 授权流程。

缺少该文件不阻断 404 功能。候选数据可能不完整、过期或包含本来就应保持 404 的 URL，因此每个候选项都必须重新检查当前响应、来源价值和替代目标，不能把文件直接当成 Shopify 重定向写入清单。
