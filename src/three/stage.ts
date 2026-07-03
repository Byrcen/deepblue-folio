// 渲染舞台：renderer / scene / camera / Bloom 后期 / 帧循环
// 移动端或粗指针设备走低质量路径（无后期、降 DPR）

import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

export type Quality = 'high' | 'low'

export interface CamState {
  px: number; py: number; pz: number
  tx: number; ty: number; tz: number
  fov: number
}

export interface Stage {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  quality: Quality
  cam: CamState
  onFrame(cb: (t: number, dt: number) => void): void
  start(): void
}

export function createStage(canvas: HTMLCanvasElement): Stage {
  const quality: Quality =
    window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 860 ? 'low' : 'high'

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: quality === 'low', // 高质量路径由 bloom 柔化锯齿
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality === 'high' ? 2 : 1.5))
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  // 着色器直接输出显示值（不走色调映射），色彩控制权完全在各 shader 手里

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x030610)
  scene.fog = new THREE.FogExp2(0x030610, 0.016)

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 400)

  const cam: CamState = { px: 0, py: 2.1, pz: 13.5, tx: 0, ty: 0.9, tz: 0, fov: 55 }

  let composer: EffectComposer | null = null
  if (quality === 'high') {
    composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.6, // strength：柔和光晕
      0.6, // radius：收小半径，避免全屏灰雾
      0.32, // threshold
    )
    composer.addPass(bloom)
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    composer?.setSize(window.innerWidth, window.innerHeight)
  })

  const callbacks: Array<(t: number, dt: number) => void> = []
  const clock = new THREE.Clock()
  const lookAt = new THREE.Vector3()

  // 鼠标视差（触屏设备不启用）
  const mouse = { x: 0, y: 0 }
  const par = { x: 0, y: 0 }
  if (!window.matchMedia('(pointer: coarse)').matches) {
    window.addEventListener('pointermove', (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.y = (e.clientY / window.innerHeight) * 2 - 1
    })
  }

  function frame(): void {
    const dt = Math.min(clock.getDelta(), 0.05)
    const t = clock.elapsedTime
    for (const cb of callbacks) cb(t, dt)

    // 窄视口（竖构图）自动拉远，保证主体完整入画
    const aspect = window.innerWidth / window.innerHeight
    const distScale = aspect >= 1 ? 1 : Math.min(1.9, Math.pow(1 / aspect, 0.8))
    lookAt.set(cam.tx, cam.ty, cam.tz)
    // 视差缓动 + 极缓慢的呼吸漂移，让镜头「活」起来
    par.x += (mouse.x * 0.55 - par.x) * Math.min(dt * 2.5, 1)
    par.y += (-mouse.y * 0.3 - par.y) * Math.min(dt * 2.5, 1)
    const swayX = Math.sin(t * 0.11) * 0.14
    const swayY = Math.sin(t * 0.16 + 1.7) * 0.07
    camera.position.set(
      cam.tx + (cam.px - cam.tx) * distScale + par.x + swayX,
      cam.ty + (cam.py - cam.ty) * distScale + par.y + swayY,
      cam.tz + (cam.pz - cam.tz) * distScale,
    )
    camera.lookAt(lookAt)
    if (camera.fov !== cam.fov) {
      camera.fov = cam.fov
      camera.updateProjectionMatrix()
    }

    if (composer) composer.render()
    else renderer.render(scene, camera)
    requestAnimationFrame(frame)
  }

  return {
    renderer,
    scene,
    camera,
    quality,
    cam,
    onFrame: (cb) => callbacks.push(cb),
    start: () => requestAnimationFrame(frame),
  }
}
