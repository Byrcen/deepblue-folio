// 平滑滚动：Lenis 接管滚轮，驱动 ScrollTrigger 更新
// prefers-reduced-motion 时不启用平滑

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { reducedMotion } from '../fx/reveal'

export interface ScrollCtl {
  lenis: Lenis | null
  scrollTo(target: HTMLElement): void
  stop(): void
  start(): void
}

export function createScroll(): ScrollCtl {
  if (reducedMotion) {
    return {
      lenis: null,
      scrollTo: (el) => el.scrollIntoView(),
      stop: () => {},
      start: () => {},
    }
  }

  const lenis = new Lenis({ duration: 1.25, smoothWheel: true })
  ;(window as unknown as { __lenis: Lenis }).__lenis = lenis // 供调试/自动化
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((t) => lenis.raf(t * 1000))
  gsap.ticker.lagSmoothing(0)

  return {
    lenis,
    scrollTo: (el) => lenis.scrollTo(el, { duration: 1.6 }),
    stop: () => lenis.stop(),
    start: () => lenis.start(),
  }
}
