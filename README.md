# NueTab - 极简且强大的新标签页扩展

![Version](https://img.shields.io/badge/version-1.2.1-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Chrome](https://img.shields.io/badge/Chrome-supported-brightgreen.svg)
![Firefox](https://img.shields.io/badge/FireFox-supported-orange.svg)

**NueTab** 是一款专注于美观、性能与高度可定制化的新标签页扩展，同时支持 Chrome 与 Firefox。它摒弃了繁杂的信息流，还原标签页最纯粹的导航功能，同时提供强大的个性化配置。

![NueTab Screenshot](./sc.png)

> 此项目绝大部分内容由 AI 生成，本人仅做 bug 处理与部分功能添加修改。
>
> Co-Authored-By: [Claude](https://claude.ai) (Anthropic)

## 核心特性

- **高度可定制主题** — 支持纯色、渐变、必应每日壁纸、自定义图片甚至视频作为背景，支持毛玻璃特效
- **自由拖拽布局** — 主页图标支持任意拖拽排序，拖拽至顶部回收站区域即可快速删除，支持在主页与应用库之间移动
- **智能搜索** — 内置百度、Google、Bing 引擎，支持实时搜索建议与键盘快捷选择
- **应用抽屉** — 底部上滑或点击展开应用库，支持分类管理
- **侧边栏助手** — 右侧滑出侧边栏，快速访问历史记录与书签
- **实时天气** — 基于 Open-Meteo 的精准天气显示，自动定位或手动设置城市
- **数据管理** — 支持导入/导出配置 JSON，方便备份与迁移
- **隐私优先** — 所有数据仅存储在本地，不收集任何用户信息

## 安装

### Chrome

1. 下载代码并解压，或 `git clone https://github.com/wuko233/nuetab.git`
2. 地址栏输入 `chrome://extensions/`，开启右上角"开发者模式"
3. 点击"加载已解压的扩展程序"，选择 `nuetab` 文件夹

### Firefox

1. 前往 [AMO 页面](https://addons.mozilla.org/addon/nuetab) 安装（推荐）
2. 或下载 `dist/NueTab.zip`，在 `about:debugging` 中临时加载

## 配置说明

点击页面右下角的 **⚙ 设置** 按钮进入配置面板：

- **常规** — 链接打开方式、天气城市、分类管理
- **布局** — 图标大小、间距、圆角、网格列数
- **样式** — 深色/浅色/毛玻璃模式，自定义字体颜色
- **数据** — 导入/导出配置，清理缓存

## 更新日志

### v1.2.1

- 修复 popup 添加快捷方式后新标签页不显示的问题（localStorage 与 chrome.storage 按时间戳同步）
- 修复仅存在 chrome.storage 备份数据时启动崩溃/丢失配置的问题
- SVG 图标清洗改为 DOMParser 白名单机制，防 XSS 更可靠
- 导入配置 JSON 增加结构校验与数据清洗
- 搜索建议按当前搜索引擎请求（Baidu / Google / Bing）
- 收紧 host permissions 与 CSP，移除过宽的 `*://*/favicon.ico`
- 时钟改为每分钟更新，降低空闲资源占用

### v1.2.0

- 新增 Firefox 浏览器支持（Manifest V3 双浏览器兼容）
- 新增导入配置功能
- 新增搜索候选词键盘上下选择
- 修复颜色选择器设置值无法正确加载的问题
- 修复搜索引擎下拉菜单与搜索建议的层级遮挡问题
- 修复引擎图标和分类图标上传按钮无响应的问题
- 修复键盘导航候选词时未正确恢复原始输入的问题
- 修复背景图片 URL 潜在注入风险
- 全面修复 XSS 安全漏洞与稳定性问题

### v1.0.0

- 初始发布
- 修复 CSP 内容安全策略导致的搜索建议失效问题
- 新增拖拽删除交互
- 优化 UI 细节与性能

## 贡献与反馈

欢迎提交 Issue 反馈 Bug 或建议新功能。如果你喜欢这个项目，请点亮 Star！

## 许可证

[MIT License](./LICENSE)
