# 旅行照片与票根

照片只在所属旅行的 `photos.json` 中维护一份索引。全站相册从同一份内容自动汇总，城市档案关联到所属旅行，精选照片的原照片也会保留在全部照片列表中；票根是衍生展示文件，不重复计数。

## 一张照片的内容

```json
{
  "id": "river-evening",
  "src": "/images/trips/your-trip/photos/river-evening.webp",
  "thumbnail": "/images/trips/your-trip/photos/river-evening-thumb.webp",
  "alt": "傍晚河面上的小船与岸边灯光",
  "caption": "天快黑的时候，再沿河走一段。",
  "cityId": "your-city-id",
  "featured": true,
  "ticketSrc": "/images/trips/your-trip/tickets/river-evening.webp",
  "width": 1600,
  "height": 1067
}
```

- `id`、`src`、`alt` 为必填。`alt` 描述真实画面，不猜地点、人物身份或拍摄日期。
- `thumbnail` 是面向列表的压缩缩略图，未提供时使用 `src`。`width`、`height` 记录原照片实际尺寸。
- `caption` 是可选说明，未提供时显示 `alt`；`cityId` 可关联已有城市 ID。
- `featured: true` 表示精选，单次旅行最多选择 3 张。页面兼容没有精选、1 张、2 张和 3 张。
- `ticketSrc` 指向已经制作完成的票根图片。没有票根时，精选区正常显示原照片，后续补充路径即可。
- 精选区完整展示票根比例，点击可查看完整原照片；全部照片区使用缩略图，大图在打开后加载。
- `photos.json` 中的顺序就是相册的浏览顺序。全站聚合时可沿用旅行顺序，无需新建第二套索引。

## 图片制作与公开范围

网站只放允许公开的照片副本。相机原始文件可自行留存，不建议直接放进仓库。发布前按用户意愿移除定位和 EXIF 信息，压缩照片并生成缩略图；不要把现有目的地参考图当作用户旅行照片。

`public/` 中的静态资源可以被直接访问。旅行设置为未发布，并不保护已经放入公开目录的图片；未允许公开的素材不要提交到公开仓库。

使用 `dy-travel-ticket-poster` 制作票根属于内容制作步骤，按用户真实照片、地点和说明生成静态成品，再把路径写入 `ticketSrc`。网站本身不调用图片生成服务，也不会用自动猜测的数据填补票根文字。

## 组件接口与检查

`src/features/gallery/Gallery.astro` 接收 `photos` 数组，以及可选的 `title`、`description`。
列表没有照片时显示空状态；有照片时支持原生对话框查看、前后浏览、左右方向键和 Esc，关闭后焦点回到打开照片的链接。
关闭 JavaScript 或浏览器不支持原生对话框时，照片链接仍可直接打开原图。

导航索引的检查命令：

```text
node src/features/gallery/gallery.test.mjs
```

首次接入实际照片后，应再检查手机排版、横竖图比例、1/2/3 张精选、图片加载失败以及键盘浏览。
