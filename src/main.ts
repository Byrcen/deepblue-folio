// 入口编排：i18n → 平滑滚动 → 3D 舞台 → 滚动时间线 → 星图 / UI → 开机序列

import './styles/main.css'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { applyI18n, toggleLang, t } from './core/i18n'
import { createScroll } from './core/scroll'
import { SoundEngine } from './core/sound'
import { runPreloader } from './core/preloader'
import { setupActReveals } from './fx/reveal'

import { createStage } from './three/stage'
import { createSky } from './three/sky'
import { createOcean } from './three/ocean'
import { createTerrain } from './three/terrain'
import { createCube } from './three/cube'
import { createThreads } from './three/threads'
import { createCityGrid } from './three/grid'
import { createStars } from './three/stars'
import { buildTimeline } from './three/timeline'

import { createAtlas } from './atlas/atlas'

gsap.registerPlugin(ScrollTrigger)

// ---- 文案与滚动 ----
applyI18n()
const scroll = createScroll()
const sound = new SoundEngine()

// ---- 开机序列：立即启动计数动画；揭幕前锁定滚动 ----
const booted = runPreloader()
scroll.stop()
void booted.then(() => scroll.start())

// ---- 3D 舞台 ----
const canvas = document.getElementById('stage') as HTMLCanvasElement
const stage = createStage(canvas)
const q = stage.quality

const ocean = createOcean(q)
const terrain = createTerrain(q)
const cube = createCube(q)
const threads = createThreads(q)
const grid = createCityGrid(q)
const stars = createStars(q)

stage.scene.add(createSky(), ocean.group, terrain.group, cube.group, threads.group, grid.group, stars.points)

stage.onFrame((t3) => {
  ocean.uniforms.uTime.value = t3
  cube.uniforms.uTime.value = t3
  cube.fallUniforms.uTime.value = t3
  threads.uniforms.uTime.value = t3
  grid.uniforms.uTime.value = t3
  stars.uniforms.uTime.value = t3
  terrain.seamUniforms.uTime.value = t3
  cube.update(t3)
})

// ---- 章节导航高亮 + 换幕音 ----
const navLinks = [...document.querySelectorAll<HTMLAnchorElement>('.chapter-nav a')]
let lastAct = -1

buildTimeline({ stage, ocean, terrain, cube, threads, grid, stars }, (i) => {
  navLinks.forEach((a, j) => a.classList.toggle('active', j === i))
  if (i !== lastAct) {
    if (lastAct >= 0) sound.blip(i)
    lastAct = i
  }
})

setupActReveals(booted)

// ---- 滚动提示：首次滚动后淡出 ----
const scrollHint = document.getElementById('scroll-hint')!
function hideHintOnScroll(): void {
  if (window.scrollY < 60) return
  scrollHint.classList.add('gone')
  window.removeEventListener('scroll', hideHintOnScroll)
}
window.addEventListener('scroll', hideHintOnScroll, { passive: true })

// ---- 星图（不透明全屏层：打开后暂停 3D 渲染，省 GPU）----
let atlasPauseTimer = 0
const atlas = createAtlas({
  onOpen: () => {
    scroll.stop()
    sound.tick()
    atlasPauseTimer = window.setTimeout(() => stage.pause(), 600) // 等淡入完成
  },
  onClose: () => {
    clearTimeout(atlasPauseTimer)
    stage.resume()
    scroll.start()
    sound.tick()
  },
  onInteract: () => sound.tick(),
})

document.querySelectorAll<HTMLElement>('[data-open-atlas]').forEach((btn) => {
  btn.addEventListener('click', () => atlas.open())
})

// ---- 菜单覆盖层 ----
const menu = document.getElementById('menu-overlay')!
const menuToggle = document.getElementById('menu-toggle')!
let menuOpen = false

function setMenu(open: boolean): void {
  menuOpen = open
  if (open) {
    menu.hidden = false
    requestAnimationFrame(() => menu.classList.add('visible'))
    scroll.stop()
  } else {
    menu.classList.remove('visible')
    setTimeout(() => {
      menu.hidden = true
    }, 400)
    scroll.start()
  }
  sound.tick()
}
menuToggle.addEventListener('click', () => setMenu(!menuOpen))

// ---- 章节跳转（左侧导航 + 菜单） ----
document.querySelectorAll<HTMLAnchorElement>('[data-act-link], .logo').forEach((a) => {
  a.addEventListener('click', (e) => {
    e.preventDefault()
    const id = a.dataset.actLink ?? a.dataset.navTo
    if (!id) return
    const section = document.getElementById(`act-${id}`)
    if (!section) return
    if (menuOpen) setMenu(false)
    if (atlas.isOpen()) atlas.close()
    scroll.scrollTo(section)
  })
})

// ---- 语言切换 ----
document.getElementById('lang-toggle')!.addEventListener('click', () => {
  toggleLang()
  sound.tick()
})

// ---- 声音开关 ----
const soundToggle = document.getElementById('sound-toggle')!
soundToggle.addEventListener('click', () => {
  const on = sound.toggle()
  soundToggle.setAttribute('aria-pressed', String(on))
  const label = soundToggle.querySelector<HTMLElement>('[data-i18n]')!
  label.dataset.i18n = on ? 'ui.sound_on' : 'ui.sound_off'
  label.textContent = t(label.dataset.i18n)
})

// ---- ESC 关菜单 ----
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menuOpen) setMenu(false)
})

// ---- 启动 ----
stage.start()

// 调试口（dev only，会被 tree-shake 掉? 保留亦无害）
if (import.meta.env.DEV) {
  ;(window as unknown as { __dbg: unknown }).__dbg = { stage, ocean, terrain, cube, threads, grid, stars }
}
