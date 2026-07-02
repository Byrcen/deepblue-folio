# deepblue-folio 设计文档

日期：2026-07-02 · 状态：已获用户确认

## 定位

杨涵淇（AI 产品经理）的个人品牌 + 求职双用途作品集网站。视觉与动效参照
[hubtown.co.in](https://hubtown.co.in)：深蓝夜色、发光核心体、一镜到底的滚动叙事、HUD 科技感 UI。
中英双语，首版全部使用占位内容，真实作品与文案后续替换。

## 总体结构

全站 = 一段滚动长卷（六幕，600vh）+ 一个作品星图（全屏 HUD 覆盖层）。

### 六幕叙事

| 幕 | 章节 | 3D 场景演变 | 文案主题 |
|---|------|-------------|----------|
| 1 | 愿景 / VISION | 发光立方体悬浮夜海，群山夹峙 | 「构建 AI 时代的产品」+ 姓名身份 |
| 2 | 方法 / METHOD | 立方体裂解为碎块绕核心重组，光瀑倾泻 | 从 0 到 1 的方法论：洞察→定义→验证 |
| 3 | 协作 / COLLABORATION | 穿梭交织的发光丝线 | 与算法、设计、工程协作 |
| 4 | 作品 / WORKS | 丝线沉降为大地网格，作品节点升起 | 案例引言 +「打开作品星图」按钮 |
| 5 | 履历 / JOURNEY | 黑暗地形上一道光缝蜿蜒生长 | 关键经历沿光缝浮现 |
| 6 | 邀约 / CONTACT | 镜头拉高俯瞰发光城市网格与蓝色沙丘 | 「共同定义下一件产品」+ 联系 CTA |

镜头一镜到底：滚动（Lenis + ScrollTrigger scrub）驱动一条 GSAP 总时间线，
控制相机路径 + shader uniform 渐变 + 元素显隐交叉淡化，幕间无硬切。

### 作品星图（HUD 覆盖层）

- 入口：第 4 幕按钮 / 顶部导航「作品」
- 星图视图：深色数据地图 + 发光项目节点（占位 5 个），拖拽平移、滚轮缩放；
  ZOOM 指示、罗盘装饰
- 列表视图：底部「OPEN PROJECT LIST」切换
- 案例卡：封面占位 + 角色/问题/方案/成果/外链，双语
- ESC / 关闭按钮回到长卷原位置
- 移动端退化为纵向卡片列表

## UI 系统

- 配色：底色 `#050A18` 系深海军蓝；发光渐变 `#2E7CF6 → #4DE1FF`；正文白/蓝灰
- 字体：英文数字等宽宽字距（HUD 感），中文黑体细体加字距，标题全大写风格
- HUD 细节：细线边框、四角角标、标签方块、扫描线微动效
- 固定 UI：左上字标、右上语言切换 + MENU、左侧六幕导航、左下声音开关、
  底部中央 SCROLL TO EXPLORE、右下联系入口
- 音效：WebAudio 实时合成（环境低鸣 + 换幕提示音），默认关闭

## 双语

`content.ts` 集中管理 `{ zh, en }`；右上角切换，原地更新 + scramble 过渡动画；
偏好存 localStorage，默认中文。

## 技术架构

Vite + TypeScript + Three.js + GSAP/ScrollTrigger + Lenis（与 crt-folio 同栈）。

```
src/
  main.ts        编排：preloader → 长卷 → 星图
  content.ts     双语文案（占位）
  core/          scroll · preloader · sound · i18n
  three/         stage(渲染/相机/后期) · ocean · cube · threads · grid · terrain · timeline
  atlas/         星图视图 · 列表视图 · 案例卡
  fx/            文字 reveal / scramble · HUD 线条动效
  styles/
```

- 加载：HUD 开机序列（百分比 + 装饰文字）掩盖初始化
- 性能：DPR 上限 2；移动端减粒子、关 Bloom、降渲染分辨率；
  `prefers-reduced-motion` 退化为静态帧 + 淡入

## 验证

`npm run build`（含 tsc）通过 + 本地 preview 逐幕检查动效、双语、星图、移动端视口。
首版不部署，验收后再上 Vercel。
