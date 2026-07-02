// 滚动总时间线：把 0..5（六幕）映射到相机路径与各场景元素的 uniform
// scrub 由 ScrollTrigger 驱动，幕间交叉淡化，无硬切

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { Stage } from './stage'
import type { Ocean } from './ocean'
import type { Terrain } from './terrain'
import type { Cube } from './cube'
import type { Threads } from './threads'
import type { CityGrid } from './grid'
import type { Stars } from './stars'

export interface SceneRefs {
  stage: Stage
  ocean: Ocean
  terrain: Terrain
  cube: Cube
  threads: Threads
  grid: CityGrid
  stars: Stars
}

export function buildTimeline(refs: SceneRefs, onActChange: (index: number) => void): void {
  const { stage, ocean, terrain, cube, threads, grid, stars } = refs
  const cam = stage.cam

  const tl = gsap.timeline({
    defaults: { ease: 'power1.inOut' },
    scrollTrigger: {
      trigger: '#scroll-track',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.9,
    },
  })

  // ---- 相机路径（每段 1 单位 = 一幕过渡） ----
  tl.to(cam, { px: 4.6, py: 2.8, pz: 8.0, tx: 0, ty: 1.9, tz: 0, fov: 55, duration: 1 }, 0)
  tl.to(cam, { px: 0, py: 2.8, pz: 4.0, tx: 0, ty: 2.6, tz: -30, fov: 60, duration: 1 }, 1)
  tl.to(cam, { px: 0, py: 9.0, pz: 0.0, tx: 0, ty: 0, tz: -24, fov: 55, duration: 1 }, 2)
  tl.to(cam, { px: -4, py: 2.2, pz: 2.0, tx: 4, ty: 1, tz: -30, fov: 50, duration: 1 }, 3)
  tl.to(cam, { px: 0, py: 10.0, pz: 5.0, tx: 0, ty: -1, tz: -25, fov: 58, duration: 1 }, 4)

  // ---- 第二幕：立方体裂解 + 光瀑 ----
  tl.to(cube.state, { explode: 1, duration: 0.5 }, 0.5)
  tl.to(cube.uniforms.uEnergy, { value: 1.7, duration: 0.5 }, 0.5)
  tl.to(cube.fallUniforms.uOpacity, { value: 1, duration: 0.35 }, 0.6)
  tl.to(ocean.uniforms.uGlow, { value: 1.6, duration: 0.6 }, 0.5)

  // ---- 进入第三幕：海与立方体退场，丝线登场 ----
  tl.to(cube.uniforms.uOpacity, { value: 0, duration: 0.6 }, 1.5)
  tl.to(cube.fallUniforms.uOpacity, { value: 0, duration: 0.4 }, 1.5)
  tl.to(ocean.uniforms.uOpacity, { value: 0, duration: 0.6 }, 1.6)
  tl.to(terrain.uniforms.uOpacity, { value: 0, duration: 0.6 }, 1.7)
  tl.to(threads.uniforms.uOpacity, { value: 1, duration: 0.5 }, 1.6)

  // ---- 进入第四幕：丝线沉降，数据网格升起 ----
  tl.to(threads.uniforms.uOpacity, { value: 0, duration: 0.5 }, 2.6)
  tl.to(grid.uniforms.uOpacity, { value: 1, duration: 0.5 }, 2.5)
  tl.to(grid.uniforms.uRise, { value: 1, duration: 1.0, ease: 'power2.out' }, 2.6)

  // ---- 第五幕：地形回归，光缝生长 ----
  tl.to(terrain.uniforms.uOpacity, { value: 1, duration: 0.6 }, 3.1)
  tl.to(terrain.uniforms.uRim, { value: 1.3, duration: 0.8 }, 3.5)
  tl.to(terrain.seamUniforms.uOpacity, { value: 1, duration: 0.3 }, 3.5)
  tl.to(terrain.seamUniforms.uProgress, { value: 1, duration: 0.8, ease: 'none' }, 3.6)

  // ---- 第六幕：拉高俯瞰，城市与星空提亮，光缝退为背景 ----
  tl.to(terrain.seamUniforms.uOpacity, { value: 0.45, duration: 0.6 }, 4.3)
  tl.to(terrain.uniforms.uRim, { value: 2.0, duration: 0.8 }, 4.2)
  tl.to(grid.uniforms.uBoost, { value: 2.3, duration: 0.8 }, 4.2)
  tl.to(stars.uniforms.uOpacity, { value: 1, duration: 0.8 }, 4.2)

  // ---- 章节切换检测（导航高亮 + 音效） ----
  document.querySelectorAll<HTMLElement>('.act').forEach((sec, i) => {
    ScrollTrigger.create({
      trigger: sec,
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle: (self) => {
        if (self.isActive) onActChange(i)
      },
    })
  })

  // ---- 按透明度托管 visible，避免空跑 draw call ----
  stage.onFrame(() => {
    threads.group.visible = threads.uniforms.uOpacity.value > 0.01
    grid.group.visible = grid.uniforms.uOpacity.value > 0.01
    ocean.mesh.visible = ocean.uniforms.uOpacity.value > 0.01
    cube.group.visible =
      cube.uniforms.uOpacity.value > 0.01 || cube.fallUniforms.uOpacity.value > 0.01
    terrain.group.visible = terrain.uniforms.uOpacity.value > 0.01
  })
}
