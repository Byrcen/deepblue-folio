// 全站双语文案（占位初稿，真实内容后续替换）
// 文本中的 \n 在渲染时转为 <br>

export type Lang = 'zh' | 'en'

type Dict = { [key: string]: string | Dict } | Array<{ [key: string]: string }>


export const SITE = {
  name: { zh: '杨涵淇', en: 'YANG HANQI' },
  logo: 'HANQI',
}

export const COPY: Record<Lang, Dict> = {
  zh: {
    meta: { title: '杨涵淇 · AI 产品经理' },
    ui: {
      menu: '菜单',
      close: '关闭',
      login: '简历',
      sound_on: '音效 开',
      sound_off: '音效 关',
      scroll: '滚动探索',
      contact: '与我联系',
      lang: 'EN',
      atlas_open: '打开作品星图',
      atlas_title: '作品星图',
      atlas_list: '打开项目列表',
      atlas_map: '返回星图',
      atlas_zoom: '缩放',
      atlas_count: '5 个项目',
      card_role: '角色',
      card_problem: '问题',
      card_approach: '方案',
      card_outcome: '成果',
      card_visit: '查看详情',
      back_to_top: '回到顶端',
    },
    nav: {
      vision: '愿景',
      method: '方法',
      collab: '协作',
      works: '作品',
      journey: '履历',
      contact: '邀约',
    },
    acts: {
      vision: {
        kicker: 'AI 产品经理 · 杨涵淇',
        title: '构建 AI 时代\n的产品',
        body: '五年间穿行于大模型、数据与人的需求之间，把不确定的技术，变成确定的产品价值。从草图到上线，负责产品的完整生命周期。',
        cta: '探索我的作品',
      },
      method: {
        kicker: '方法论',
        title: '从 0 到 1\n是一门手艺',
        body: '好的 AI 产品不是模型的堆砌，而是一次次假设、验证与取舍的结果。我的工作循环只有三步——',
        chips: [
          { k: '01 洞察', v: '在数据与访谈中找到真问题' },
          { k: '02 定义', v: '把模糊的可能收敛为清晰的方案' },
          { k: '03 验证', v: '用最小代价让市场给出答案' },
        ],
      },
      collab: {
        kicker: '协作方式',
        title: '与专家网络\n并肩工作',
        body: '我不只与需求打交道。算法工程师、设计师、数据科学家、增长与业务伙伴……我擅长把不同语言的人连成一张网，朝同一个方向发力。',
      },
      works: {
        kicker: '精选作品',
        title: '每个作品\n都是一次假设的验证',
        body: '五个跨越 AI 平台、多模态、数据与 Agent 的产品故事，正在星图中等待检阅。',
        cta: '打开作品星图',
      },
      journey: {
        kicker: '履历',
        title: '一条仍在延伸\n的轨迹',
        body: '从人机交互研究到大模型产品负责人，每一步都在向「让技术更懂人」靠近。',
        steps: [
          { year: '2019', title: '某大学 · 人机交互', desc: '研究方向：对话式界面（占位）' },
          { year: '2021', title: '某大厂 · AI 平台产品', desc: '负责 ML 平台产品化（占位）' },
          { year: '2023', title: '创业公司 · 大模型产品负责人', desc: '从 0 到 1 搭建 LLM 应用矩阵（占位）' },
          { year: '2026', title: '下一站', desc: '正在寻找同样相信 AI 的团队' },
        ],
      },
      contact: {
        kicker: '邀约',
        title: '共同定义\n下一件产品',
        body: '如果你正在打造 AI 时代的产品，并相信好的产品经理能让技术真正落地——我们应该聊聊。',
        cta: '发封邮件',
        email: 'hi@example.com',
        links: [
          { label: 'GitHub', href: '#' },
          { label: 'LinkedIn', href: '#' },
          { label: '简历 PDF', href: '#' },
        ],
        footer: '© 2026 杨涵淇 · 由 cry 设计与构建',
      },
    },
  },
  en: {
    meta: { title: 'YANG HANQI · AI Product Manager' },
    ui: {
      menu: 'MENU',
      close: 'CLOSE',
      login: 'RESUME',
      sound_on: 'SOUND ON',
      sound_off: 'SOUND OFF',
      scroll: 'SCROLL TO EXPLORE',
      contact: 'GET IN TOUCH',
      lang: '中',
      atlas_open: 'OPEN PROJECT ATLAS',
      atlas_title: 'PROJECT ATLAS',
      atlas_list: 'OPEN PROJECT LIST',
      atlas_map: 'BACK TO ATLAS',
      atlas_zoom: 'ZOOM',
      atlas_count: '5 PROJECTS',
      card_role: 'ROLE',
      card_problem: 'PROBLEM',
      card_approach: 'APPROACH',
      card_outcome: 'OUTCOME',
      card_visit: 'VIEW PROJECT',
      back_to_top: 'BACK TO TOP',
    },
    nav: {
      vision: 'VISION',
      method: 'METHOD',
      collab: 'COLLABORATION',
      works: 'WORKS',
      journey: 'JOURNEY',
      contact: 'CONTACT',
    },
    acts: {
      vision: {
        kicker: 'AI PRODUCT MANAGER · YANG HANQI',
        title: 'BUILDING PRODUCTS\nFOR THE AI ERA',
        body: 'Five years spent between large models, data and human needs — turning uncertain technology into certain product value, from first sketch to launch.',
        cta: 'EXPLORE MY WORK',
      },
      method: {
        kicker: 'METHOD',
        title: 'ZERO TO ONE\nIS A CRAFT',
        body: 'A good AI product is not a pile of models, but the residue of hypotheses, experiments and trade-offs. My loop has three moves —',
        chips: [
          { k: '01 INSIGHT', v: 'Find the real problem in data & interviews' },
          { k: '02 DEFINE', v: 'Converge fuzzy possibility into clear design' },
          { k: '03 VALIDATE', v: 'Let the market answer at minimum cost' },
        ],
      },
      collab: {
        kicker: 'HOW I WORK',
        title: 'A NETWORK\nOF EXPERTS',
        body: 'I do not only handle requirements. ML engineers, designers, data scientists, growth and business partners — I weave people who speak different languages into one net, pulling in the same direction.',
      },
      works: {
        kicker: 'SELECTED WORKS',
        title: 'EVERY PROJECT\nTESTS A HYPOTHESIS',
        body: 'Five product stories across AI platforms, multimodal, data and agents — waiting in the atlas.',
        cta: 'OPEN PROJECT ATLAS',
      },
      journey: {
        kicker: 'JOURNEY',
        title: 'A TRAJECTORY\nSTILL UNFOLDING',
        body: 'From HCI research to leading LLM products — every step moves toward technology that understands people.',
        steps: [
          { year: '2019', title: 'University · HCI', desc: 'Research: conversational interfaces (placeholder)' },
          { year: '2021', title: 'BigTech · AI Platform PM', desc: 'Productizing the ML platform (placeholder)' },
          { year: '2023', title: 'Startup · Head of LLM Product', desc: 'Built the LLM app matrix from zero (placeholder)' },
          { year: '2026', title: 'Next stop', desc: 'Looking for a team that believes in AI' },
        ],
      },
      contact: {
        kicker: 'CONTACT',
        title: "LET'S DEFINE\nWHAT COMES NEXT",
        body: 'If you are building products for the AI era, and believe a good PM makes technology land — we should talk.',
        cta: 'SEND AN EMAIL',
        email: 'hi@example.com',
        links: [
          { label: 'GitHub', href: '#' },
          { label: 'LinkedIn', href: '#' },
          { label: 'Resume PDF', href: '#' },
        ],
        footer: '© 2026 YANG HANQI · Designed & built by cry',
      },
    },
  },
}

// ---- 作品星图数据（占位项目） ----

export interface Project {
  id: string
  code: string // HUD 编号
  x: number // 星图坐标 0..1000
  y: number
  year: string
  name: { zh: string; en: string }
  tag: { zh: string; en: string }
  role: { zh: string; en: string }
  problem: { zh: string; en: string }
  approach: { zh: string; en: string }
  outcome: { zh: string; en: string }
  link: string
}

export const PROJECTS: Project[] = [
  {
    id: 'nebula',
    code: 'PRJ-01',
    x: 320, y: 300,
    year: '2024',
    name: { zh: 'NEBULA 知识引擎', en: 'NEBULA Knowledge Engine' },
    tag: { zh: 'AI 平台', en: 'AI PLATFORM' },
    role: { zh: '产品负责人（0→1）', en: 'Product Lead (0→1)' },
    problem: {
      zh: '企业内部知识分散在文档、IM 与工单里，新人上手平均要三周。（占位）',
      en: 'Company knowledge scattered across docs, IM and tickets; onboarding took 3 weeks. (placeholder)',
    },
    approach: {
      zh: '基于 RAG 的企业知识问答，先在客服团队灰度，两轮迭代后全员开放。（占位）',
      en: 'RAG-based knowledge Q&A, piloted with support team, opened company-wide after two iterations. (placeholder)',
    },
    outcome: {
      zh: '周活覆盖 78% 员工，新人上手周期缩短至 5 天。（占位数据）',
      en: 'Weekly active coverage 78% of staff; onboarding cut to 5 days. (placeholder)',
    },
    link: '#',
  },
  {
    id: 'echo',
    code: 'PRJ-02',
    x: 640, y: 210,
    year: '2023',
    name: { zh: 'ECHO 车载语音助手', en: 'ECHO In-car Voice Assistant' },
    tag: { zh: '多模态', en: 'MULTIMODAL' },
    role: { zh: '产品经理 · 交互定义', en: 'PM · Interaction Design' },
    problem: {
      zh: '传统车机语音唤醒率低、指令死板，用户宁愿低头点屏幕。（占位）',
      en: 'Legacy in-car voice was rigid; drivers preferred touching the screen. (placeholder)',
    },
    approach: {
      zh: '多模态大模型 + 场景化免唤醒指令集，定义 42 个高频驾驶场景。（占位）',
      en: 'Multimodal LLM + wake-free scenario commands across 42 driving scenes. (placeholder)',
    },
    outcome: {
      zh: '语音使用频次提升 2.6 倍，NPS +18。（占位数据）',
      en: 'Voice usage up 2.6×, NPS +18. (placeholder)',
    },
    link: '#',
  },
  {
    id: 'prism',
    code: 'PRJ-03',
    x: 500, y: 520,
    year: '2023',
    name: { zh: 'PRISM 数据洞察 Copilot', en: 'PRISM Insight Copilot' },
    tag: { zh: '数据产品', en: 'DATA PRODUCT' },
    role: { zh: '产品经理 · 增长方向', en: 'PM · Growth' },
    problem: {
      zh: '业务同学取数依赖分析师排期，一个问题平均等待两天。（占位）',
      en: 'Business teams waited ~2 days for analysts to pull data. (placeholder)',
    },
    approach: {
      zh: '自然语言查询 → SQL 生成 → 可视化推荐的一站式 Copilot。（占位）',
      en: 'NL query → SQL generation → chart recommendation, in one copilot. (placeholder)',
    },
    outcome: {
      zh: '自助取数占比从 12% 提升到 61%。（占位数据）',
      en: 'Self-serve queries grew from 12% to 61%. (placeholder)',
    },
    link: '#',
  },
  {
    id: 'orbit',
    code: 'PRJ-04',
    x: 790, y: 430,
    year: '2025',
    name: { zh: 'ORBIT Agent 编排', en: 'ORBIT Agent Orchestrator' },
    tag: { zh: 'AGENT', en: 'AGENT' },
    role: { zh: '产品负责人', en: 'Product Lead' },
    problem: {
      zh: '运营流程横跨五个系统，人工串联易错且不可追溯。（占位）',
      en: 'Ops workflows spanned five systems, glued by hand, error-prone. (placeholder)',
    },
    approach: {
      zh: '可视化 Agent 工作流编排，内置审批与回滚，人机各司其职。（占位）',
      en: 'Visual agent workflow orchestration with approval & rollback built in. (placeholder)',
    },
    outcome: {
      zh: '3 条核心流程全自动化，人力成本下降 40%。（占位数据）',
      en: '3 core workflows fully automated; labor cost −40%. (placeholder)',
    },
    link: '#',
  },
  {
    id: 'lumen',
    code: 'PRJ-05',
    x: 220, y: 620,
    year: '2022',
    name: { zh: 'LUMEN 创作套件', en: 'LUMEN Creation Suite' },
    tag: { zh: 'AIGC', en: 'AIGC' },
    role: { zh: '产品经理 · 创作工具', en: 'PM · Creation Tools' },
    problem: {
      zh: '内容团队产能瓶颈在初稿，而非创意本身。（占位）',
      en: 'Content bottleneck was first drafts, not ideas. (placeholder)',
    },
    approach: {
      zh: '模板化 AIGC 工作台：选题 → 草稿 → 润色 → 分发一条流水线。（占位）',
      en: 'Templated AIGC workbench: topic → draft → polish → distribute. (placeholder)',
    },
    outcome: {
      zh: '单篇产出时间从 4 小时降至 40 分钟。（占位数据）',
      en: 'Per-piece production time from 4h down to 40min. (placeholder)',
    },
    link: '#',
  },
]

export const ACT_IDS = ['vision', 'method', 'collab', 'works', 'journey', 'contact'] as const
export type ActId = (typeof ACT_IDS)[number]
