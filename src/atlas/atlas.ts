// 作品星图：全屏 HUD 覆盖层
// 桌面端：SVG 数据星图（拖拽平移 / 滚轮缩放）+ 列表视图 + 案例卡
// 移动端：纵向卡片列表

import { PROJECTS, type Project } from '../content'
import { getLang, t, onLangChange } from '../core/i18n'

export interface Atlas {
  open(): void
  close(): void
  isOpen(): boolean
}

interface AtlasHooks {
  onOpen(): void
  onClose(): void
  onInteract(): void
}

const VB_W = 1000
const VB_H = 800

export function createAtlas(hooks: AtlasHooks): Atlas {
  const root = document.getElementById('atlas')!
  let openFlag = false
  const view = { x: 0, y: 0, k: 1 }

  root.innerHTML = `
    <div class="atlas-head hud">
      <div class="atlas-title"><span data-a="atlas_title"></span><span class="atlas-count" data-a="atlas_count"></span></div>
      <button class="atlas-close" data-a="close"></button>
    </div>
    <div class="atlas-svg-wrap">
      <svg viewBox="0 0 ${VB_W} ${VB_H}" preserveAspectRatio="xMidYMid slice" aria-label="project atlas">
        <defs>
          <pattern id="atlas-grid" width="46" height="46" patternUnits="userSpaceOnUse">
            <path d="M 46 0 L 0 0 0 46" fill="none" stroke="rgba(122,162,224,0.10)" stroke-width="1"/>
          </pattern>
          <radialGradient id="atlas-halo" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stop-color="rgba(46,124,246,0.14)"/>
            <stop offset="100%" stop-color="rgba(46,124,246,0)"/>
          </radialGradient>
        </defs>
        <g id="atlas-world"></g>
      </svg>
    </div>
    <div class="atlas-list" hidden></div>
    <div class="atlas-list-mobile"></div>
    <div class="atlas-foot">
      <div class="atlas-zoom">
        <span data-a="atlas_zoom"></span>
        <div class="atlas-zoom-bar"><i></i></div>
      </div>
      <button class="atlas-listbtn"></button>
      <div class="atlas-compass">
        <b>N</b>
        <span class="c-n">N</span><span class="c-s">S</span>
        <span class="c-w">W</span><span class="c-e">E</span>
      </div>
    </div>
    <aside class="atlas-card">
      <button class="card-close" data-a="close"></button>
      <div class="card-cover"></div>
      <span class="card-tag"></span>
      <h3 class="card-name"></h3>
      <p class="card-year"></p>
      <div class="card-fields"></div>
      <a class="card-visit" target="_blank" rel="noopener"></a>
    </aside>
  `

  const world = root.querySelector<SVGGElement>('#atlas-world')!
  const svgWrap = root.querySelector<HTMLElement>('.atlas-svg-wrap')!
  const listEl = root.querySelector<HTMLElement>('.atlas-list')!
  const mobileEl = root.querySelector<HTMLElement>('.atlas-list-mobile')!
  const listBtn = root.querySelector<HTMLButtonElement>('.atlas-listbtn')!
  const card = root.querySelector<HTMLElement>('.atlas-card')!
  const zoomDot = root.querySelector<HTMLElement>('.atlas-zoom-bar i')!
  let listMode = false
  let currentProject: Project | null = null

  // ---- 渲染（语言相关内容集中在此，切换语言时重跑） ----

  function renderTexts(): void {
    root.querySelectorAll<HTMLElement>('[data-a]').forEach((el) => {
      el.textContent = t(`ui.${el.dataset.a}`)
    })
    listBtn.textContent = listMode ? t('ui.atlas_map') : t('ui.atlas_list')
  }

  function renderWorld(): void {
    const lang = getLang()
    const ns = 'http://www.w3.org/2000/svg'
    world.innerHTML = ''

    const bg = document.createElementNS(ns, 'rect')
    bg.setAttribute('x', '-1500'); bg.setAttribute('y', '-1500')
    bg.setAttribute('width', '4000'); bg.setAttribute('height', '4000')
    bg.setAttribute('fill', 'url(#atlas-grid)')
    world.appendChild(bg)

    const halo = document.createElementNS(ns, 'rect')
    halo.setAttribute('x', '0'); halo.setAttribute('y', '0')
    halo.setAttribute('width', String(VB_W)); halo.setAttribute('height', String(VB_H))
    halo.setAttribute('fill', 'url(#atlas-halo)')
    world.appendChild(halo)

    // 星座连线（按顺序连接节点）
    const poly = document.createElementNS(ns, 'polyline')
    poly.setAttribute('points', PROJECTS.map((p) => `${p.x},${p.y}`).join(' '))
    poly.setAttribute('fill', 'none')
    poly.setAttribute('stroke', 'rgba(77,225,255,0.18)')
    poly.setAttribute('stroke-width', '1')
    poly.setAttribute('stroke-dasharray', '3 6')
    world.appendChild(poly)

    for (const p of PROJECTS) {
      const g = document.createElementNS(ns, 'g')
      g.setAttribute('class', 'atlas-node')
      g.setAttribute('transform', `translate(${p.x},${p.y})`)

      const ring = document.createElementNS(ns, 'circle')
      ring.setAttribute('class', 'node-ring')
      ring.setAttribute('r', '16')
      g.appendChild(ring)

      const diamond = document.createElementNS(ns, 'rect')
      diamond.setAttribute('class', 'node-diamond')
      diamond.setAttribute('x', '-6'); diamond.setAttribute('y', '-6')
      diamond.setAttribute('width', '12'); diamond.setAttribute('height', '12')
      diamond.setAttribute('transform', 'rotate(45)')
      g.appendChild(diamond)

      const core = document.createElementNS(ns, 'circle')
      core.setAttribute('class', 'node-core')
      core.setAttribute('r', '2.6')
      g.appendChild(core)

      // 类型小标签（8px 字号 + 2px 字距：CJK 全宽字符按 10px 估，拉丁按 7.5px）
      const tag = p.tag[lang]
      const tagW = [...tag].reduce((w, ch) => w + (/[⺀-鿿豈-﫿＀-￯]/.test(ch) ? 10 : 7.5), 16)
      const tagBg = document.createElementNS(ns, 'rect')
      tagBg.setAttribute('class', 'node-tag-bg')
      tagBg.setAttribute('x', String(-tagW / 2)); tagBg.setAttribute('y', '-38')
      tagBg.setAttribute('width', String(tagW)); tagBg.setAttribute('height', '15')
      g.appendChild(tagBg)
      const tagText = document.createElementNS(ns, 'text')
      tagText.setAttribute('class', 'node-tag')
      tagText.setAttribute('x', '0'); tagText.setAttribute('y', '-27')
      tagText.setAttribute('text-anchor', 'middle')
      tagText.textContent = tag
      g.appendChild(tagText)

      const label = document.createElementNS(ns, 'text')
      label.setAttribute('x', '0'); label.setAttribute('y', '34')
      label.setAttribute('text-anchor', 'middle')
      label.textContent = p.name[lang]
      g.appendChild(label)

      g.addEventListener('click', (ev) => {
        ev.stopPropagation()
        showCard(p)
      })
      world.appendChild(g)
    }
  }

  function renderList(): void {
    const lang = getLang()
    listEl.innerHTML = ''
    for (const p of PROJECTS) {
      const a = document.createElement('a')
      a.innerHTML = `
        <span class="li-code">${p.code}</span>
        <span class="li-name">${p.name[lang]}</span>
        <span class="li-tag">${p.tag[lang]}</span>
        <span class="li-year">${p.year}</span>
      `
      a.addEventListener('click', () => showCard(p))
      listEl.appendChild(a)
    }
  }

  function renderMobile(): void {
    const lang = getLang()
    mobileEl.innerHTML = ''
    for (const p of PROJECTS) {
      const div = document.createElement('div')
      div.className = 'm-card'
      div.innerHTML = `
        <div class="card-cover" data-code="${p.code}"></div>
        <span class="card-tag">${p.tag[lang]}</span>
        <h3 class="card-name">${p.name[lang]}</h3>
        <p class="card-year">${p.year} · ${p.role[lang]}</p>
        <div class="card-field"><b>${t('ui.card_problem')}</b><p>${p.problem[lang]}</p></div>
        <div class="card-field"><b>${t('ui.card_approach')}</b><p>${p.approach[lang]}</p></div>
        <div class="card-field"><b>${t('ui.card_outcome')}</b><p>${p.outcome[lang]}</p></div>
        <a class="card-visit" href="${p.link}" target="_blank" rel="noopener">${t('ui.card_visit')} ▸</a>
      `
      mobileEl.appendChild(div)
    }
  }

  function showCard(p: Project): void {
    currentProject = p
    const lang = getLang()
    card.querySelector<HTMLElement>('.card-cover')!.dataset.code = p.code
    card.querySelector<HTMLElement>('.card-tag')!.textContent = p.tag[lang]
    card.querySelector<HTMLElement>('.card-name')!.textContent = p.name[lang]
    card.querySelector<HTMLElement>('.card-year')!.textContent = `${p.year} · ${p.role[lang]}`
    card.querySelector<HTMLElement>('.card-fields')!.innerHTML = `
      <div class="card-field"><b>${t('ui.card_problem')}</b><p>${p.problem[lang]}</p></div>
      <div class="card-field"><b>${t('ui.card_approach')}</b><p>${p.approach[lang]}</p></div>
      <div class="card-field"><b>${t('ui.card_outcome')}</b><p>${p.outcome[lang]}</p></div>
    `
    const visit = card.querySelector<HTMLAnchorElement>('.card-visit')!
    visit.href = p.link
    visit.textContent = `${t('ui.card_visit')} ▸`
    card.classList.add('open')
    hooks.onInteract()
  }

  function hideCard(): void {
    currentProject = null
    card.classList.remove('open')
  }

  // ---- 平移 / 缩放 ----

  function applyView(): void {
    world.setAttribute('transform', `translate(${view.x},${view.y}) scale(${view.k})`)
    const kNorm = (view.k - 0.6) / (2.4 - 0.6)
    zoomDot.style.left = `${Math.round(kNorm * 85)}px`
  }

  let dragging = false
  let lastX = 0
  let lastY = 0

  svgWrap.addEventListener('pointerdown', (e) => {
    dragging = true
    lastX = e.clientX
    lastY = e.clientY
    svgWrap.classList.add('dragging')
    svgWrap.setPointerCapture(e.pointerId)
  })
  svgWrap.addEventListener('pointermove', (e) => {
    if (!dragging) return
    // 视口像素 → viewBox 单位（slice 模式按较大缩放比）
    const rect = svgWrap.getBoundingClientRect()
    const scale = Math.max(VB_W / rect.width, VB_H / rect.height)
    view.x += (e.clientX - lastX) * scale
    view.y += (e.clientY - lastY) * scale
    lastX = e.clientX
    lastY = e.clientY
    applyView()
  })
  svgWrap.addEventListener('pointerup', (e) => {
    dragging = false
    svgWrap.classList.remove('dragging')
    svgWrap.releasePointerCapture(e.pointerId)
  })
  svgWrap.addEventListener('wheel', (e) => {
    e.preventDefault()
    const prev = view.k
    view.k = Math.min(2.4, Math.max(0.6, view.k * Math.exp(-e.deltaY * 0.0012)))
    const f = view.k / prev
    // 围绕视口中心缩放
    const cx = VB_W / 2
    const cy = VB_H / 2
    view.x = cx - (cx - view.x) * f
    view.y = cy - (cy - view.y) * f
    applyView()
  }, { passive: false })

  // ---- 视图切换 / 开关 ----

  function setListMode(on: boolean): void {
    listMode = on
    listEl.hidden = !on
    listBtn.textContent = on ? t('ui.atlas_map') : t('ui.atlas_list')
    hooks.onInteract()
  }
  listBtn.addEventListener('click', () => setListMode(!listMode))

  function open(): void {
    if (openFlag) return
    openFlag = true
    root.hidden = false
    requestAnimationFrame(() => root.classList.add('visible'))
    hooks.onOpen()
  }

  function close(): void {
    if (!openFlag) return
    openFlag = false
    hideCard()
    root.classList.remove('visible')
    setTimeout(() => {
      root.hidden = true
    }, 500)
    hooks.onClose()
  }

  root.querySelectorAll('.atlas-close, .card-close').forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      if ((btn as HTMLElement).classList.contains('card-close')) {
        ev.stopPropagation()
        hideCard()
      } else {
        close()
      }
    })
  })

  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !openFlag) return
    if (card.classList.contains('open')) hideCard()
    else close()
  })

  onLangChange(() => {
    renderTexts()
    renderWorld()
    renderList()
    renderMobile()
    if (currentProject) showCard(currentProject)
  })

  renderTexts()
  renderWorld()
  renderList()
  renderMobile()
  applyView()

  return { open, close, isOpen: () => openFlag }
}
