// HUD 开机序列：百分比计数 + 进度条，掩盖 shader 编译与首帧渲染

import gsap from 'gsap'

export function runPreloader(): Promise<void> {
  return new Promise((resolve) => {
    const root = document.getElementById('preloader')!
    const count = root.querySelector<HTMLElement>('.pl-count')!
    const bar = root.querySelector<HTMLElement>('.pl-bar i')!

    const state = { p: 0 }
    gsap.to(state, {
      p: 100,
      duration: 2.0,
      ease: 'power2.inOut',
      onUpdate: () => {
        const v = Math.floor(state.p)
        count.textContent = String(v).padStart(2, '0')
        bar.style.transform = `scaleX(${state.p / 100})`
      },
      onComplete: () => {
        root.classList.add('done')
        setTimeout(resolve, 350)
        // 过渡结束后彻底移除，避免遮挡
        setTimeout(() => root.remove(), 1200)
      },
    })
  })
}
