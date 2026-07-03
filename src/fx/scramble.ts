// 乱码解算文字动效：字符从随机 HUD 字符逐个左→右解算为目标文本
// 多行文本（含 \n）按行处理，渲染为 <br> 分隔

import { reducedMotion } from './reveal'

const GLYPHS = '01▪▫/\\|<>-_=+*#@$%&アイウエオカキクケコ'

function randGlyph(): string {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
}

const running = new WeakMap<HTMLElement, number>()

export function scramble(el: HTMLElement, target: string, duration = 600): void {
  const prev = running.get(el)
  if (prev) cancelAnimationFrame(prev)

  if (reducedMotion) {
    el.innerHTML = target.split('\n').join('<br>')
    return
  }

  const lines = target.split('\n')
  const total = target.replace(/\n/g, '').length
  const start = performance.now()

  const tick = (now: number) => {
    const p = Math.min(1, (now - start) / duration)
    const resolved = Math.floor(p * total)
    let count = 0
    const out = lines
      .map((line) =>
        Array.from(line)
          .map((ch) => {
            count += 1
            if (ch === ' ') return ' '
            if (count <= resolved) return ch
            return randGlyph()
          })
          .join(''),
      )
      .join('<br>')
    el.innerHTML = out
    if (p < 1) {
      running.set(el, requestAnimationFrame(tick))
    } else {
      running.delete(el)
    }
  }
  running.set(el, requestAnimationFrame(tick))
}
