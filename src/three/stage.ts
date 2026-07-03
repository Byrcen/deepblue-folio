// 渲染舞台：renderer / scene / camera / Bloom 后期 / 帧循环
// 移动端或粗指针设备走低质量路径（无后期、降 DPR）

import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { reducedMotion } from '../fx/reveal'

// 转场马赛克玻璃：画面裂成不规则玻璃块，每块带折射偏移与 RGB 色散
const MosaicGlassShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uAmount: { value: 0 },
    uTime: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uAmount;
    uniform float uTime;
    varying vec2 vUv;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    vec2 hash2(vec2 p) { return vec2(hash(p), hash(p + 19.19)); }

    void main() {
      vec3 base = texture2D(tDiffuse, vUv).rgb;
      if (uAmount < 0.004) {
        gl_FragColor = vec4(base, 1.0);
        return;
      }

      // 每行横向错位的网格：避免整齐棋盘，读作不规则玻璃拼块
      vec2 g = vec2(14.0, 5.0);
      float row = floor(vUv.y * g.y);
      float rowJitter = hash(vec2(row, 3.7)) * 0.9;
      vec2 cell = vec2(floor(vUv.x * g.x + rowJitter), row);
      vec2 f = vec2(fract(vUv.x * g.x + rowJitter), fract(vUv.y * g.y));
      float rnd = hash(cell);

      // 强度越高被激活的块越多；每块折射力度各异
      float act = step(rnd, clamp(uAmount * 1.2, 0.0, 0.95)) * (0.4 + 0.6 * hash(cell + 5.1));

      // 棱面接缝：接缝处折射剧烈增强，是彩虹色散最强的地方
      float eb = smoothstep(0.12, 0.0, min(min(f.x, 1.0 - f.x) * 0.45, min(f.y, 1.0 - f.y)));

      // 块级折射方向 + 轻微时变颤动 + 块内透镜弯折 + 接缝棱镜增幅
      vec2 dir = hash2(cell + 7.3) - 0.5;
      float wob = 0.85 + 0.3 * sin(uTime * 6.0 + rnd * 40.0);
      vec2 off = dir * 0.085 * uAmount * act * wob;
      off += (f - 0.5) * vec2(0.030, 0.042) * uAmount * act;
      off *= 1.0 + eb * 1.8;

      // RGB 色散：三通道折射率差拉大，玻璃缝隙出现彩虹；双距离采样叠加出拖影模糊
      vec3 col;
      col.r = texture2D(tDiffuse, vUv + off * 1.45).r * 0.62 + texture2D(tDiffuse, vUv + off * 0.80).r * 0.38;
      col.g = texture2D(tDiffuse, vUv + off).g * 0.62 + texture2D(tDiffuse, vUv + off * 0.55).g * 0.38;
      col.b = texture2D(tDiffuse, vUv + off * 0.62).b * 0.62 + texture2D(tDiffuse, vUv + off * 0.34).b * 0.38;

      // 接缝折射亮线（用场景自身色调制，避免发灰）
      col += col * eb * act * uAmount * 1.6;

      gl_FragColor = vec4(col, 1.0);
    }
  `,
}

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
  /** 转场马赛克玻璃强度 0..1（低质量路径无后期，写入无效果但安全） */
  mosaic: { value: number }
  onFrame(cb: (t: number, dt: number) => void): void
  start(): void
  pause(): void
  resume(): void
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
  let mosaicPass: ShaderPass | null = null
  const mosaic = { value: 0 }
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
    mosaicPass = new ShaderPass(MosaicGlassShader)
    mosaicPass.enabled = false
    composer.addPass(mosaicPass)
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality === 'high' ? 2 : 1.5))
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

  let running = false
  let rafId = 0
  let elapsed = 0 // 自累计时间：暂停/切后台不产生跳变

  function frame(): void {
    const dt = Math.min(clock.getDelta(), 0.05)
    elapsed += dt
    const t = elapsed
    for (const cb of callbacks) cb(t, dt)

    // 窄视口（竖构图）自动拉远，保证主体完整入画
    const aspect = window.innerWidth / window.innerHeight
    const distScale = aspect >= 1 ? 1 : Math.min(1.9, Math.pow(1 / aspect, 0.8))
    lookAt.set(cam.tx, cam.ty, cam.tz)
    // 视差缓动 + 极缓慢的呼吸漂移，让镜头「活」起来（reduced-motion 时保持静止）
    par.x += (mouse.x * 0.55 - par.x) * Math.min(dt * 2.5, 1)
    par.y += (-mouse.y * 0.3 - par.y) * Math.min(dt * 2.5, 1)
    const swayX = reducedMotion ? 0 : Math.sin(t * 0.11) * 0.14
    const swayY = reducedMotion ? 0 : Math.sin(t * 0.16 + 1.7) * 0.07
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

    if (mosaicPass) {
      mosaicPass.uniforms.uAmount.value = mosaic.value
      mosaicPass.uniforms.uTime.value = t
      mosaicPass.enabled = mosaic.value > 0.004 // 静止时跳过整个 pass
    }
    if (composer) composer.render()
    else renderer.render(scene, camera)
    rafId = requestAnimationFrame(frame)
  }

  // 全屏不透明覆盖层（如作品星图）打开时暂停渲染，省 GPU；canvas 保留最后一帧
  function resume(): void {
    if (running) return
    running = true
    clock.getDelta() // 吞掉暂停期间累积的 delta，避免恢复瞬间跳变
    rafId = requestAnimationFrame(frame)
  }

  function pause(): void {
    if (!running) return
    running = false
    cancelAnimationFrame(rafId)
  }

  return {
    renderer,
    scene,
    camera,
    quality,
    cam,
    mosaic,
    onFrame: (cb) => callbacks.push(cb),
    start: resume,
    pause,
    resume,
  }
}
