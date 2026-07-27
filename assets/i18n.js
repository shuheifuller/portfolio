// Bilingual support (English / 日本語).
// UI chrome lives in the dictionary below; project copy lives in
// data/projects.json under each item's `i18n.ja`. The chosen language is
// remembered per device and applied before first paint where possible.

(() => {
  const LS_KEY = "portfolio.lang";
  const DEFAULT = "en";

  const STRINGS = {
    en: {
      "nav.work": "Work",
      "nav.services": "Services",
      "nav.contact": "Contact",
      "nav.langToggle": "日本語",
      "nav.langToggleTitle": "日本語に切り替える",

      "hero.title": "I design and build apps, games, and automations.",
      "hero.lead": "A working portfolio of things I've shipped with Claude Code and Visual Studio — from bilingual web apps to browser games and quiet little automations. This list keeps itself up to date.",
      "hero.location": "Sydney, Australia",

      "cat.label": "the studio cat",

      "work.heading": "Selected work",
      "work.count": "{n} projects",
      "work.count_one": "{n} project",
      "work.viewDetails": "View details",
      "work.loading": "Loading projects…",
      "work.empty": "No projects yet.",

      "services.heading": "What I build",
      "services.1.title": "Web apps",
      "services.1.body": "Bilingual, mobile-first React and Next.js apps — portals, dashboards, and tools.",
      "services.2.title": "Browser games",
      "services.2.body": "Zero-install games in Three.js and canvas that the whole family can play on any device.",
      "services.3.title": "Automations",
      "services.3.body": "Python and userscript automations that quietly handle daily, repetitive work.",
      "services.4.title": "Learning tools",
      "services.4.body": "PWAs and quizzes for vocabulary and kanji practice, built to make study stick.",
      "services.5.title": "AI integration",
      "services.5.body": "Claude-powered features for analysis, summarisation, and content generation.",
      "services.6.title": "Static sites",
      "services.6.body": "Fast, framework-free pages — like this one — that deploy straight to GitHub Pages.",

      "contact.heading": "Contact",
      "contact.pitch": "Have something you'd like built? Let's talk.",
      "footer.private": "Shared privately with family & friends",

      "detail.back": "← All work",
      "detail.highlights": "Highlights",
      "detail.architecture": "Architecture",
      "detail.why": "Why it's useful — ",
      "detail.builtWith": "Built with",
      "detail.access": "Access",
      "detail.accessNote": "Shared privately with family and friends. Reach out if you'd like a look.",
      "detail.ownerLinks": "Owner links",
      "detail.unlock": "owner unlock",
      "detail.lock": "lock this device",
      "detail.notFound": "Project not found.",
      "detail.passPrompt": "Owner passphrase",
      "detail.passWrong": "That passphrase didn't work.",

      "type.app": "App",
      "type.html-page": "Web page",
      "type.ios-app": "iOS app",
      "type.automation": "Automation",
      "type.userscript": "Userscript",
      "type.project": "Project",
    },

    ja: {
      "nav.work": "制作物",
      "nav.services": "できること",
      "nav.contact": "お問い合わせ",
      "nav.langToggle": "EN",
      "nav.langToggleTitle": "Switch to English",

      "hero.title": "アプリ・ゲーム・自動化を、設計してつくっています。",
      "hero.lead": "Claude Code と Visual Studio でつくってきたものの記録です。二言語対応の Web アプリから、ブラウザゲーム、静かに動く小さな自動化まで。この一覧は自動で更新されます。",
      "hero.location": "オーストラリア・シドニー",

      "cat.label": "工房の黒猫",

      "work.heading": "制作物",
      "work.count": "{n}件",
      "work.count_one": "{n}件",
      "work.viewDetails": "詳細を見る",
      "work.loading": "読み込んでいます…",
      "work.empty": "まだ登録がありません。",

      "services.heading": "つくっているもの",
      "services.1.title": "Web アプリ",
      "services.1.body": "二言語・モバイル前提の React / Next.js アプリ。ポータル、ダッシュボード、業務ツールなど。",
      "services.2.title": "ブラウザゲーム",
      "services.2.body": "インストール不要。Three.js とキャンバスで、家族みんながどの端末でも遊べるように。",
      "services.3.title": "自動化",
      "services.3.body": "Python やユーザースクリプトで、毎日の繰り返し作業を静かに片づけます。",
      "services.4.title": "学習ツール",
      "services.4.body": "単語や漢字の練習が続くように設計した PWA とクイズ。",
      "services.5.title": "AI 連携",
      "services.5.body": "分析・要約・文章生成に Claude を組み込みます。",
      "services.6.title": "静的サイト",
      "services.6.body": "このページのように、速くてフレームワーク不要。GitHub Pages にそのまま公開できます。",

      "contact.heading": "お問い合わせ",
      "contact.pitch": "つくりたいものがあれば、お気軽にご連絡ください。",
      "footer.private": "家族と友人向けに限定公開",

      "detail.back": "← 一覧へ戻る",
      "detail.highlights": "特徴",
      "detail.architecture": "アーキテクチャ",
      "detail.why": "役に立つところ — ",
      "detail.builtWith": "使用技術",
      "detail.access": "公開範囲",
      "detail.accessNote": "家族と友人向けに限定公開しています。ご覧になりたい方はご連絡ください。",
      "detail.ownerLinks": "オーナー用リンク",
      "detail.unlock": "オーナー解錠",
      "detail.lock": "この端末をロック",
      "detail.notFound": "該当するプロジェクトが見つかりません。",
      "detail.passPrompt": "オーナーのパスフレーズ",
      "detail.passWrong": "パスフレーズが正しくありません。",

      "type.app": "アプリ",
      "type.html-page": "Web ページ",
      "type.ios-app": "iOS アプリ",
      "type.automation": "自動化",
      "type.userscript": "ユーザースクリプト",
      "type.project": "プロジェクト",
    },
  };

  let current = (() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved === "en" || saved === "ja") return saved;
    } catch { /* private mode */ }
    return (navigator.language || "").toLowerCase().startsWith("ja") ? "ja" : DEFAULT;
  })();

  const listeners = new Set();

  function t(key, vars) {
    let s = (STRINGS[current] && STRINGS[current][key]) ?? STRINGS.en[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
    return s;
  }

  // Swap every element tagged with data-i18n / data-i18n-title.
  function applyStatic(root = document) {
    for (const node of root.querySelectorAll("[data-i18n]")) {
      node.textContent = t(node.getAttribute("data-i18n"));
    }
    for (const node of root.querySelectorAll("[data-i18n-title]")) {
      node.title = t(node.getAttribute("data-i18n-title"));
    }
    document.documentElement.lang = current;
  }

  // Merge a project's Japanese copy over its English fields (deep, per key).
  function loc(p) {
    const ja = p && p.i18n && p.i18n.ja;
    if (current !== "ja" || !ja) return p;
    const out = { ...p, ...ja };
    out.detail = { ...(p.detail || {}), ...(ja.detail || {}) };
    if (p.detail && p.detail.architecture) {
      out.detail.architecture = { ...p.detail.architecture, ...((ja.detail || {}).architecture || {}) };
    }
    return out;
  }

  window.I18N = {
    get lang() { return current; },
    t,
    loc,
    applyStatic,
    onChange(fn) { listeners.add(fn); },
    set(lang) {
      if (lang !== "en" && lang !== "ja") return;
      current = lang;
      try { localStorage.setItem(LS_KEY, lang); } catch { /* private mode */ }
      applyStatic();
      for (const fn of listeners) fn(lang);
    },
    toggle() { this.set(current === "ja" ? "en" : "ja"); },
  };
})();
