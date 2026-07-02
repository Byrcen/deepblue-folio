// 双语系统：data-i18n="acts.vision.title" → 从 COPY[lang] 取值
// 带 data-scramble 的元素在切换语言时做乱码过渡，其余直接替换

import { COPY, type Lang } from '../content'
import { scramble } from '../fx/scramble'

const STORAGE_KEY = 'deepblue-lang'
let current: Lang = (localStorage.getItem(STORAGE_KEY) as Lang) || 'zh'
const listeners: Array<(lang: Lang) => void> = []

export function getLang(): Lang {
  return current
}

export function t(path: string, lang: Lang = current): string {
  const parts = path.split('.')
  let node: unknown = COPY[lang]
  for (const p of parts) {
    if (node && typeof node === 'object') node = (node as Record<string, unknown>)[p]
    else return path
  }
  return typeof node === 'string' ? node : path
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** \n → <br>，用于多行标题 */
export function html(path: string, lang: Lang = current): string {
  return esc(t(path, lang)).replace(/\n/g, '<br>')
}

export function applyI18n(root: ParentNode = document, withScramble = false): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n!
    const value = t(key)
    if (el.dataset.scramble !== undefined && withScramble) {
      scramble(el, value)
    } else if (value.includes('\n')) {
      el.innerHTML = html(key)
    } else {
      el.textContent = value
    }
  })
  document.title = t('meta.title')
  document.documentElement.lang = current === 'zh' ? 'zh-CN' : 'en'
  document.documentElement.dataset.lang = current
}

export function setLang(lang: Lang): void {
  if (lang === current) return
  current = lang
  localStorage.setItem(STORAGE_KEY, lang)
  applyI18n(document, true)
  listeners.forEach((fn) => fn(lang))
}

export function toggleLang(): void {
  setLang(current === 'zh' ? 'en' : 'zh')
}

export function onLangChange(fn: (lang: Lang) => void): void {
  listeners.push(fn)
}
