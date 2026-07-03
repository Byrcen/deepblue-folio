// 滚动入场动效：每一幕的文字块在进入视口时上移淡入（stagger）
// prefers-reduced-motion 时退化为直接淡入

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * @param ready 首幕入场动画等待该 Promise（preloader 揭幕）后才播放，
 *              否则会在加载遮罩后面白白播完
 */
export function setupActReveals(ready: Promise<void> = Promise.resolve()): void {
  document.querySelectorAll<HTMLElement>('.act').forEach((act, index) => {
    const items = act.querySelectorAll<HTMLElement>('.rv')
    if (!items.length) return

    if (reducedMotion) {
      gsap.set(items, { opacity: 1, y: 0 })
      return
    }

    const gate = index === 0 ? ready : Promise.resolve()

    gsap.set(items, { opacity: 0, y: 36 })
    ScrollTrigger.create({
      trigger: act,
      start: 'top 55%',
      end: 'bottom 40%',
      onEnter: () => void gate.then(() => gsap.to(items, { opacity: 1, y: 0, duration: 1, stagger: 0.09, ease: 'power3.out', overwrite: 'auto' })),
      onLeave: () => gsap.to(items, { opacity: 0, y: -24, duration: 0.5, stagger: 0.04, ease: 'power2.in', overwrite: 'auto' }),
      onEnterBack: () => gsap.to(items, { opacity: 1, y: 0, duration: 0.8, stagger: 0.06, ease: 'power3.out', overwrite: 'auto' }),
      onLeaveBack: () => gsap.to(items, { opacity: 0, y: 36, duration: 0.5, stagger: 0.04, ease: 'power2.in', overwrite: 'auto' }),
    })
  })
}
