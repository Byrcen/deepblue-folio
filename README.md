# deepblue-folio

杨涵淇的个人作品集 —— 一个 AI 产品经理的个人品牌 / 求职站点。

视觉与动效参照 [hubtown.co.in](https://hubtown.co.in)（Immersive Garden 出品）：
深蓝夜色、发光核心体、一镜到底的滚动叙事、HUD 科技感 UI。

## 体验

- **HUD 开机序列**：百分比计数掩盖 shader 编译与首帧渲染
- **六幕滚动长卷**：滚动驱动同一个 WebGL 场景连续变形——
  夜海立方体 → 裂解光瀑 → 协作丝线 → 数据网格升起 → 履历光缝 → 俯瞰灯火之城
- **作品星图**：全屏 HUD 项目地图（拖拽平移 / 滚轮缩放 / 列表视图 / 案例卡），
  移动端退化为纵向卡片
- **中英双语**：右上角切换，标题以乱码解算动效过渡，偏好存 localStorage
- **合成音效**：WebAudio 实时合成环境低鸣与换幕提示音，默认关闭
- **降级策略**：移动端减粒子、关 Bloom；`prefers-reduced-motion` 关闭平滑滚动与入场动效

## 技术栈

Vite + TypeScript（无 UI 框架）· Three.js · GSAP + ScrollTrigger · Lenis

全部 3D 元素为程序化生成（自定义 ShaderMaterial），无外部模型与贴图；
音效为 WebAudio 合成，无音频文件。

## 开发

```bash
npm install
npm run dev      # 开发服务器
npm run build    # 类型检查 + 生产构建
npm run preview  # 预览构建产物
```

## 结构

```
src/
  main.ts        入口编排：i18n → 滚动 → 3D 舞台 → 时间线 → 星图/UI → 开机序列
  content.ts     全站双语文案与项目数据（当前为占位内容）
  core/          i18n · scroll(Lenis) · preloader · sound(WebAudio)
  three/         stage(渲染/Bloom) · ocean · terrain(含光缝) · cube · threads · grid · stars · timeline
  atlas/         作品星图（SVG 地图 / 列表 / 案例卡 / 移动端卡片）
  fx/            scramble 乱码解算 · 滚动入场 reveal
  styles/        HUD 视觉系统
docs/superpowers/specs/   设计文档
```

## 状态

首版完成：六幕场景、星图、双语、音效、响应式与降级均已实现并通过本地验证。
**全站文案与五个项目均为占位内容**，待杨涵淇提供真实素材后替换 `src/content.ts` 即可。
未部署。
