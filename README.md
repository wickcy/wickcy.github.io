# 旅行记忆

个人旅行计划与记忆网站，沿用暖纸色、森林绿、陶土橙和中文衬线标题。使用 Astro 静态生成，发布到 GitHub Pages。

## 本地运行

使用 **Node.js 24 LTS**（最低要求 22.23.4）与 npm：

```sh
npm ci
npm run dev
```

打开终端输出的本地地址。构建与检查：

```sh
npm test
npm run build
npm run check:site
npm run preview
```

如果受限环境无法写入用户配置目录，可在运行命令前设置 `ASTRO_TELEMETRY_DISABLED=1`。
生产输出目录为 `dist/`；不要将工作目录直接作为网站发布。

## 内容目录

```text
content/places/cities.json                  城市 ID、国家、WGS84 中心坐标
content/trips/<旅行ID>/index.md             旅行元信息与正文，自动发现
content/trips/<旅行ID>/plans.json           可选：路线、景点、交通、预算与来源
content/trips/<旅行ID>/photos.json          可选：照片、顺序、精选和票根地址
public/images/trips/<旅行ID>/               允许公开的照片与票根
src/features/atlas/                        本地矢量世界足迹地图
src/features/trips/                        旅行计划工具
src/features/gallery/                      照片、精选票根与大图浏览
src/components/                            全站共享组件
src/styles/                                公共视觉变量与样式
src/pages/                                 由内容生成的静态页面
```

新增旅行只需新增该旅行的内容目录；首次涉及新城市时补充城市资料。列表、城市档案、世界足迹和相册自动关联，不维护第二份总清单。

旅行入口示例（以下只是字段示例，不是已发布旅行）：

```yaml
---
title: 旅行标题
summary: 这次旅行的公开概况。
status: planning
published: true
cityIds: [taian]
visitedCityIds: []
season: 深秋
updatedAt: '2026-11-03'
---

在这里写公开的计划或旅行记忆。
```

状态可用 `planning`、`completed`、`cancelled`；`published` 默认 false。旅行 ID 是文件夹名，确定后不要因改期而更名，避免已有链接失效。
实际到访由 `visitedCityIds` 明确记录，候选城市、日期过去、行前清单勾选均不会自动点亮地图。
同一城市可以关联多次旅行，一次旅行也可以到访多个城市。

新增简单旅行可以只有 Markdown，不必填写空路线、空预算或空相册。
普通的 `plans.json` 使用 `type: itinerary`，例如：

```json
{
  "type": "itinerary",
  "days": [{
    "title": "沿着老城慢慢走",
    "summary": "留出吃饭和休息的余量。",
    "stops": [{ "time": "上午", "name": "第一站", "note": "在这里写公开的游玩安排。" }]
  }],
  "budgetNote": "按实际选择补充参考预算。"
}
```

现有 `autumn-meet-2026` 使用 `type: comparison` 的完整双城比较工具，额外支持目的地选择、车次、地图和预算。不必为新增普通旅行复制整套双城配置。
照片维护、精选 1–3 张与票根制作说明见 [docs/photos.md](docs/photos.md)。

## 内容公开范围

仓库为公开仓库。具体出发日期、酒店、票据等不打算公开的信息，不应出现在源文件、Git 历史或发布产物中；隐藏页面元素不是保密。
当前“秋日碰头”公开目的地、相对日程与住宿片区，不输出具体出发日期和具体酒店。
`published: false` 会排除旅行页面与关联索引，但不构成仓库访问控制；`public/` 中的资源也可直接访问，只放可公开的文件。
照片使用公开展示副本，发布前检查定位信息及 EXIF。参考景点照片附来源，不能当作个人到访记忆。

当前已录入 2026 年北京国庆旅行与济南 10 月 24–25 日旅行，共 98 张个人照片和 2 张旅行票根。足迹为中国、北京与济南两座城市；泰安与绍兴仍只是计划候选。

景点补充使用独立的 `recommendations.json`：已确认到访与下次推荐分开标注，参考配图、官方资料来源、图片署名与许可随内容保存，不混入个人相册。

相机原件保留在被忽略的 `tmp_photo/`，不提交。公开大图保留原始分辨率，使用质量 94 的高质量 WebP（有损编码）并清除定位等元数据；照片墙使用独立缩略图，大图仅在点击后加载。具体处理记录见 [docs/photos.md](docs/photos.md)。

## 自动发布

`.github/workflows/deploy.yml` 在推送 main 时执行测试、构建和发布检查，通过后上传并部署 `dist/`。PR 只做检查，不发布。

首次启用需在仓库 **Settings → Pages → Source** 选择 **GitHub Actions**。网站地址为 `https://wickcy.github.io/`。
仓库权限与 Pages 设置需由具备管理权限的账户配置；仅写入工作流文件不代表远端设置已完成。

## 维护规则与原始资料

- Codex 约定：[AGENTS.md](AGENTS.md)。
- 页面与模块方案：[docs/project-plan.md](docs/project-plan.md)。
- 世界地图使用 Natural Earth 公共领域数据，来源见 [public/maps/LICENSE.md](public/maps/LICENSE.md)。
- 单次旅行地图沿用 Leaflet 与 OpenStreetMap，保留相应署名及许可证。
- 迁移前原始页面与资源已备份到本机 `.local/legacy/2026-11-03/`（不提交、不发布）；它们不是网站构建输入。
