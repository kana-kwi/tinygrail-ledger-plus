/*!
 * 小圣杯账本2.0（tinygrail-ledger-plus）
 * 独立账本组件：全量读取资金日志（不设页数上限），IndexedDB 长期记忆。
 * 统计口径 / 界面沿用「小圣杯工具箱」账本，经命名空间隔离后抽离，二者可同时启用。
 * 版本 v1.6.1（启动懒加载：账本未打开时不读全量日志、不拉持仓；持仓快照跨页面复用 5 分钟）
 */
(function () {
  'use strict';

  /* ============ 环境探测（沿用工具箱：尽量挂在顶层 document） ============ */
  const HOST = (function () {
    try { return window.top && window.top.document ? window.top : window; }
    catch (e) { return window; }
  })();
  const HDOC = HOST.document || document;
  const HWIN = HOST;
  const API = 'https://tinygrail.com/api/';
  let pinApiDepth = 0; // api() 原文里用到（防 fetch 钩子改写自己请求），账本plus 保留以兼容原文

  /* localStorage 键（命名空间已换成 tglp:） */
  const LS_KEY = 'tglp:settings:v1';
  const LS_SNAP = 'tglp:snap:v1';
  const PAGE_SIZE = 100;
  const LOG_PAGE = 200;
  const LOG_BLOCK = 5;
  const TAX_RE = /个人所得税|所得税|股息税/;

  /* ---------- 设置（只保留账本需要的字段） ---------- */
  const DEFAULTS = {
    logDays: 7, logFrom: '', logTo: '', logSort: 'desc', logDir: 'gain',
    logKind: 'all', logTop: 20, ledgerView: 'fund',
    starMode: 'range', starFilter: 'all', starSort: 'desc',
    // v1.1.0 UI 改造新增
    fundMode: 'detail',   // 资金下钻：detail 逐笔 / role 按角色
    fundPeriod: 'month',  // 趋势图粒度：month 月度
    tableSize: 50,        // v1.2.0 数据表每页条数
    // v1.4.0 图表区：整体折叠 + 收入/支出各自的占比图样式（卡片上的小图标切换）
    chartAreaCollapsed: false,
    fundChartOut: 'bar',
    fundChartIn: 'bar',
    theme: 'dark',
  };
  const S = Object.assign({}, DEFAULTS);
  try {
    const saved = JSON.parse(HWIN.localStorage.getItem(LS_KEY) || '{}') || {};
    Object.keys(DEFAULTS).forEach((k) => {
      if (saved[k] !== undefined) S[k] = saved[k];
    });
  } catch (e) {}
  function persist() {
    try { HWIN.localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) {}
  }

  /* ---------- 全局状态 ---------- */
  let busy = false;
  let logAll = [];        // 当前窗口过滤后的日志（统计数据源）
  let logAllRaw = [];     // IndexedDB 里的全部记录（新→旧）
  let logWindow = null;
  let els = null;
  let selfKeyCache = '';
  let holdAll = [];       // 持仓（算持仓市值）
  let holdAt = 0;
  const nameIdsSeen = new Set();
  let snaps = [];         // 每日资产快照 [{d,cc,mv}]
  try {
    const arr = JSON.parse(HWIN.localStorage.getItem(LS_SNAP) || '[]');
    if (Array.isArray(arr)) {
      snaps = arr
        .filter((x) => x && /^d{4}-d{2}-d{2}$/.test(String(x.d)))
        .map((x) => ({ d: String(x.d), cc: num0(x.cc), mv: num0(x.mv) }))
        .sort((a, b) => (a.d < b.d ? -1 : 1))
        .slice(-180);
    }
  } catch (e) {}


  /* ============ 基础工具（原文抽取） ============ */
  function num0(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  const nowMs = () => Date.now();
  /* ------------------------------ 基础工具 ------------------------------ */

  function h(tag, attrs, ...kids) {
    const el = HDOC.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v === null || v === undefined || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else el.setAttribute(k, v);
      }
    }
    for (const kid of kids.flat()) {
      if (kid === null || kid === undefined || kid === false) continue;
      el.appendChild(typeof kid === 'string' || typeof kid === 'number' ? HDOC.createTextNode(String(kid)) : kid);
    }
    return el;
  }

  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);  const fmt = (v, d = 0) =>
    num(v).toLocaleString('zh-CN', d ? { minimumFractionDigits: d, maximumFractionDigits: d } : undefined);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /** 限并发执行：mapLimit(list, 3, async (item, i) => {...}) */
  async function mapLimit(list, limit, fn) {
    let i = 0;
    const n = Math.max(1, Math.min(limit, list.length));
    const workers = new Array(n).fill(0).map(async () => {
      while (i < list.length) {
        const idx = i++;
        await fn(list[idx], idx);
      }
    });
    await Promise.all(workers);
  }

  /* ============ 分类常量（原文抽取，统计口径一致） ============ */
  /**
   * 资金日志的 Type 字段（服务端给的类型码，比解析中文描述靠谱得多）。
   * 0 全部 / 1 刮刮乐 / 2 参与ICO / 3 ICO退款 / 4 买入委托 / 5 取消买入 / 6 卖出委托
   * 7 印花税 / 8 取消卖出 / 9 资产重组 / 10 参与竞拍 / 11 修改竞拍 / 12 竞拍结果
   * 13 ICO结果 / 14 个人所得税 / 15 系统修复 / 16 发出红包 / 17 收到红包 / 18 魔法道具
   */
  const LOG_TYPE = {
    1: 'scratch',
    2: 'ico',
    3: 'ico',
    4: 'buy',
    5: 'buy',
    6: 'sell',
    7: 'stamp',
    8: 'sell',
    9: 'sacrifice',
    10: 'auction',
    11: 'auction',
    12: 'auction',
    13: 'ico',
    14: 'tax',
    15: 'other',
    16: 'packet',
    17: 'packet',
    18: 'item',
  };

  /** 资金 / 股数变动来源分类。按数组顺序匹配描述，先具体后笼统 */
  const FLOW_RULES = [
    { key: 'welfare', label: '福利', kw: ['福利'] },
    { key: 'checkin', label: '签到', kw: ['bangumi每日登录奖励'] },
    { key: 'aucbonus', label: '分红', kw: ['萌王投票返利', '竞拍分红', '竞拍分成', '拍卖分红', '分红', '萌王', '返利'] },
    { key: 'lotto', label: '大乐透', kw: ['萌王大乐透', '大乐透'] },
    { key: 'refer', label: '推荐', kw: ['被推荐奖励', '推荐奖励', '推荐有奖'] },
    { key: 'stamp', label: '印花税', kw: ['印花税'] },
    { key: 'bless', label: '祝福', kw: ['献上祝福', '祝福'] },
    { key: 'fee', label: '手续费', kw: ['手续费'] },
    { key: 'refine', label: '精炼', kw: ['增购', '精炼'] },
    { key: 'scratch', label: '刮刮乐', kw: ['刮刮乐', '抽奖', '转盘'] },
    {
      key: 'item',
      label: '道具',
      kw: ['混沌魔方', '虚空道标', '星光碎片', '闪光结晶', '鲤鱼之眼', '道具', '转移'],
    },
    { key: 'ico', label: 'ICO', kw: ['ICO', 'ico', '中签', '配售', '申购'] },
    { key: 'auction', label: '竞拍', kw: ['竞拍', '拍卖', '中标', '出价'] },
    { key: 'packet', label: '红包', kw: ['红包'] },
    { key: 'dividend', label: '股息', kw: ['股息'] },
    { key: 'sacrifice', label: '献祭', kw: ['献祭', '资产重组', '融资'] },
    { key: 'sell', label: '卖出', kw: ['卖出'] },
    { key: 'buy', label: '买入', kw: ['买入'] },
  ];
  const FLOW_LABEL = Object.create(null);
  FLOW_RULES.forEach((r) => (FLOW_LABEL[r.key] = r.label));
  FLOW_LABEL.other = '其他';
  FLOW_LABEL.tax = '股息税';
  FLOW_LABEL.stamp = '印花税';
  /* 收入和支出对同一个 key 的叫法不一样（用户指定口径） */
  const FLOW_LABEL_IN = Object.assign({}, FLOW_LABEL, {
    dividend: '股息',
    aucbonus: '分红',
    refer: '推荐',
    buy: '买入',
    other: '其他',
  });
  const FLOW_LABEL_OUT = Object.assign({}, FLOW_LABEL, {
    other: '股息税',
    tax: '个人所得税',
    stamp: '印花税',
  });
  /** 按方向取来源名 */
  function fundLabel(dir, key) {
    const m = dir === 'in' ? FLOW_LABEL_IN : FLOW_LABEL_OUT;
    return m[key] || FLOW_LABEL[key] || '其他';
  }

  /** 资金收入 / 支出、股数获得 / 损失各自允许出现的来源（按用户指定的分类口径） */
  const FUND_IN_KINDS = ['sell', 'dividend', 'aucbonus', 'sacrifice', 'ico', 'packet', 'refer', 'welfare', 'checkin', 'other', 'lotto'];
  const FUND_OUT_KINDS = ['buy', 'auction', 'ico', 'packet', 'bless', 'refine', 'fee', 'stamp', 'other', 'scratch'];
  const STOCK_IN_KINDS = ['buy', 'auction', 'ico', 'item', 'scratch', 'other'];
  const STOCK_OUT_KINDS = ['sell', 'sacrifice', 'item', 'other'];

  /** 固定资产（圣殿）变动来源。日志只有文字描述，按关键词归类，数值从描述里抠 */
  const FIXED_RULES = [
    {
      key: 'guidepost',
      label: '被道标命中',
      // 「受到「虚空道标」攻击损失 #8539「杀生丸」83股」= 自己的塔被打掉固资。
      // 必须排除「使用「虚空道标」获得 …」那种：那是我打别人后掉落的股份，不是我的损失。
      test: (s) => s.includes('虚空道标') && !/获得/.test(s) && /受到|被|你的圣殿/.test(s),
    },
    { key: 'star', label: '转化星之力', test: (s) => s.includes('星之力') || s.includes('灌注') },
    {
      key: 'item',
      label: '使用道具',
      test: (s) => s.includes('使用') && /魔方|道标|碎片|结晶|鲤鱼|道具/.test(s),
    },
  ];

  /* ============ 网络 / 环境（原文抽取） ============ */
  async function api(path, opt = {}) {
    const ctl = new AbortController();
    // 默认 20 秒；拉上万座塔时由调用方放宽（opt.timeout）
    const timer = setTimeout(() => ctl.abort(), Math.max(5000, num(opt.timeout) || 20000));
    try {
      // 自己发的请求不能被「圣殿置顶」的 fetch 钩子改写：钩子在同步阶段读这个计数，
      // 所以只包住 fetch() 这一下，别把整个 await 包进来（否则期间站点的请求会被跳过）
      let pending;
      pinApiDepth++;
      try {
        pending = fetch(API + path, {
          /* 未登录时服务端会把接口 302 到 http://tinygrail.com/Account/Login…
             （Location 写死成 http）。bgm.tv 是 HTTPS 页面，浏览器按「混合内容」把这次
             跳转直接拦掉，fetch 只会抛一句 TypeError: Failed to fetch —— 玩家看到的
             「统计账本错误，Failed to fetch」就是这么来的。
             这里手动接管重定向：不跟随，拿到 opaqueredirect 就判成「未登录 / 会话过期」，
             好给玩家一句能照做的提示（去登录 / 放行第三方 Cookie）。 */
          redirect: 'manual',
          ...opt,
          credentials: 'include',
          signal: ctl.signal,
          headers: {
            Accept: 'application/json',
            ...(opt.body ? { 'Content-Type': 'application/json' } : {}),
            ...(opt.headers || {}),
          },
        });
      } finally {
        pinApiDepth--;
      }
      const res = await pending;
      /* redirect:'manual' 下，凡是服务端想跳转的请求都是 opaque（status 0 / type opaqueredirect）。
         正常 JSON 接口不会走重定向，所以这一支基本等于「被踢到登录页了」。 */
      if (res.type === 'opaqueredirect' || res.status === 0) {
        const err = new Error('未登录小圣杯或会话已过期');
        err.needLogin = true;
        throw err;
      }
      if (!res.ok) {
        if ([401, 403, 404].includes(res.status)) throw new Error('请求失败（HTTP ' + res.status + '），可能未登录小圣杯');
        throw new Error('HTTP ' + res.status);
      }
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('json')) throw new Error('未登录小圣杯或会话已过期（接口返回了网页）');
      const data = await res.json();
      if (data.State !== 0) throw new Error(data.Message || '接口返回 State=' + data.State);
      return data.Value;
    } finally {
      clearTimeout(timer);
    }
  }

  /** 顶层页面 + 所有同源 iframe 的 document（点开角色常会换 iframe，要动态找） */
  function allDocs() {
    const out = [];
    const push = (d) => { if (d && !out.includes(d)) out.push(d); };
    push(HDOC);
    push(document);
    const scan = (w, depth) => {
      if (!w || depth > 4) return;
      let fs;
      try { fs = w.frames; } catch (e) { return; }
      for (let i = 0; i < fs.length; i++) {
        try {
          const f = fs[i];
          push(f.document);
          scan(f, depth + 1);
        } catch (e) {}
      }
      // window.frames 偶尔枚举不到（跨域嵌套 / 动态插入），再从 iframe 元素补一次
      try {
        const ifr = w.document && w.document.querySelectorAll ? w.document.querySelectorAll('iframe') : [];
        for (let i = 0; i < ifr.length; i++) {
          const fd = ifr[i].contentDocument;
          if (!fd) continue;
          push(fd);
          try { scan(fd.defaultView, depth + 1); } catch (e) {}
        }
      } catch (e) {}
    };
    try { scan(HWIN, 0); scan(window, 0); } catch (e) {}
    return out;
  }


  /** 当前登录用户名：优先读小圣杯自己缓存的 assets */
  function guessedUsername() {
    try {
      const raw = localStorage.getItem('tinygrail:user-assets');
      if (raw) {
        const obj = JSON.parse(raw);
        if (obj && obj.name) return String(obj.name);
      }
    } catch (e) {}
    let a = null;
    for (const d of allDocs()) {
      a = d.querySelector('#badgeUserPanel a[href*="/user/"]');
      if (a) break;
    }
    if (a) {
      const m = (a.getAttribute('href') || '').match(/\/user\/([^/?#]+)/);
      if (m) return decodeURIComponent(m[1]);
    }
    return '';
  }

  /* ============ 角色名 / 快照（原文抽取） ============ */
  const nameCache = Object.create(null);
  /* 角色名缓存落盘：刷新后筛塔第一眼就是名字，不会先闪一下 #7998 再变回来。
     只存「ID → 名字」，1.5 秒合并写一次，别把 localStorage 写爆。 */
  const LS_NAMES = 'tglp:names:v1';
  try {
    const o = JSON.parse(localStorage.getItem(LS_NAMES) || 'null');
    if (o && typeof o === 'object') {
      Object.keys(o).forEach((k) => {
        if (/^\d+$/.test(k) && o[k] && typeof o[k] === 'string') nameCache[k] = o[k];
      });
    }
  } catch (e) {}
  let nameSaveTimer = 0;
  function nameCacheSave() {
    if (nameSaveTimer) return;
    nameSaveTimer = setTimeout(() => {
      nameSaveTimer = 0;
      try {
        localStorage.setItem(LS_NAMES, JSON.stringify(nameCache));
      } catch (e) {}
    }, 1500);
  }
  const totalCache = Object.create(null); // 角色ID -> 总股本（等级进度用）
  const metaTried = new Set(); // 已尝试拉过 meta 的角色ID，避免反复请求

  function knownLvOf(id) {
    const k = String(id || '');
    if (!/^\d+$/.test(k)) return null;
    if (charaLvCache[k] != null) return charaLvCache[k];
    try {
      if (favLvCache[k] != null) return num(favLvCache[k]);
    } catch (e) {}
    return null;
  }


  const charaName = (id) => nameCache[id] || '#' + id;

  function charaLink(id, fallback) {
    const nm = fallback || charaName(id) || '';
    return h(
      'a',
      {
        class: 'tglp-name',
        href: `https://bgm.tv/character/${id}`,
        target: '_blank',
        rel: 'noopener noreferrer',
        // 名字还没读到就先显示 #ID，别留一个点不动的空白
        title: nm ? `${nm}（#${id}）` : `#${id}`,
      },
      nm || `#${id}`
    );
  }

  const todayKey = () => {
    const d = new Date();
    return (
      d.getFullYear() +
      '-' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0')
    );
  };

  /** 记录当日资产快照（同一天覆盖，保留最近 180 天） */
  function recordSnapshot(cc, mv) {
    const d = todayKey();
    const c = num(cc);
    const m = num(mv);
    if (c <= 0 && m <= 0) return;
    const i = snaps.findIndex((x) => x.d === d);
    const rec = { d, cc: c || (i >= 0 ? snaps[i].cc : 0), mv: m || (i >= 0 ? snaps[i].mv : 0) };
    if (i >= 0) snaps[i] = rec;
    else snaps.push(rec);
    snaps.sort((a, b) => (a.d < b.d ? -1 : 1));
    if (snaps.length > 180) snaps = snaps.slice(-180);
    try {
      localStorage.setItem(LS_SNAP, JSON.stringify(snaps));
    } catch (e) {}
  }

  /** 自己的用户名：优先读页面缓存，读不到再问 account/recommend */
  async function selfKey() {
    if (selfKeyCache) return selfKeyCache;
    const g = guessedUsername();
    if (g) {
      selfKeyCache = g;
      return g;
    }
    try {
      const r = await api('account/recommend');
      if (r && r.Name) selfKeyCache = String(r.Name);
    } catch (e) {}
    return selfKeyCache;
  }

  async function loadNames(ids, force, opts) {
    const always = !!(opts && opts.always);
    const uniq = [...new Set(ids)].filter(Boolean);
    const todo = uniq.filter(
      (id) => force || !nameCache[id] || (!metaTried.has(String(id)) && totalCache[id] === undefined)
    );
    for (let i = 0; i < todo.length; i += 50) {
      if (!busy && !force && !always) return;
      const batch = todo.slice(i, i + 50);
      batch.forEach((id) => metaTried.add(String(id)));
      try {
        // chara/list 要的是数字数组：以前直接把 parseCharId 出来的字符串数组丢进去，
        // 接口返回空 → 道具页「预计消耗」里的角色名永远补不上，只能显示 #id。
        const arr = await api('chara/list', {
          method: 'POST', body: JSON.stringify(batch.map(Number)),
        });
        (arr || []).forEach((c) => {
          nameCache[String(c.Id)] = c.Name;
          nameCacheSave();
          if (c.Total !== undefined && c.Total !== null) totalCache[c.Id] = num(c.Total);
          // 顺便记下权威等级，联想框不用再为这些角色单独发一次反查
          if (c.Level != null) charaLvCache[String(c.Id)] = num(c.Level);
        });
      } catch (e) {}
      await sleep(120);
    }
  }

  /* ============ 持仓（原文抽取，仅用于资产卡市值） ============ */
  async function fetchAllHoldings(key, opt) {
    const alive = (opt && opt.alive) || (() => true);
    const onProgress = (opt && opt.onProgress) || (() => {});
    const K = encodeURIComponent(key);
    const failedPages = [];
    const first = await api(`chara/user/chara/${K}/1/${PAGE_SIZE}`);
    const got = ((first && first.Items) || []).slice();
    const total = num(first && first.TotalItems) || got.length;
    const pages = Math.max(1, num(first && first.TotalPages) || 1);
    onProgress(got.length, total);
    if (pages > 1) {
      const list = [];
      for (let p = 2; p <= pages; p++) list.push(p);
      await mapLimit(list, 5, async (p) => {
        if (!alive()) return;
        // 偶发 429 / 断流重试一次；仍失败就跳过这一页，不至于整轮白跑
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const v = await api(`chara/user/chara/${K}/${p}/${PAGE_SIZE}`);
            got.push(...((v && v.Items) || []));
            onProgress(got.length, total);
            return;
          } catch (e) {
            // 重试一次还是失败：记下页码，最后告诉调用方「这次没读全」
            if (attempt) { failedPages.push(p); return; }
            await sleep(250);
          }
        }
      });
    }
    // 并发完成顺序不定、重试也可能重复，按角色 ID 去重
    const seen = new Set();
    const items = [];
    for (let i = 0; i < got.length; i++) {
      const it = got[i];
      const id = String((it && it.CharacterId) || '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      items.push(it);
    }
    // 张数对不上也算不完整（页接口偶尔会少给几条）
    const complete = failedPages.length === 0 && items.length >= total;
    return { items, total, complete, failedPages };
  }

  /* ============ 账本统计逻辑（原文抽取） ============ */
  /** 日志时间 → 毫秒时间戳，解析失败返回 0 */
  function logTs(v) {
    if (!v) return 0;
    if (typeof v === 'number') return v;
    const s = String(v).trim();
    const t = Date.parse(s.replace(/(\.\d{3})\d+/, '$1'));
    return Number.isNaN(t) ? 0 : t;
  }

  /**
   * 「今天 0 点往前 offset 天」的毫秒时间戳（offset 可以为负，-1 = 明天 0 点）。
   * 账本按**自然日**统计：从第一天的 0:00 到最后一天的 24:00，
   * 而不是「现在往前推 N×24 小时」——后者会把首尾两天各切掉半截，
   * 隔着几个小时再看，同一批记录一会儿算进来一会儿算出去。
   */
  function dayStartMs(offset) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (offset || 0));
    return d.getTime();
  }

  /** 月/日两位显示（账本窗口用），如 11/03 */
  function fmtDay(ms) {
    const d = new Date(num(ms));
    return String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0');
  }

  /** 'YYYY-MM-DD' → 当天 0:00 的毫秒时间戳；格式不对返回 null */
  function parseDayMs(v) {
    const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  /** 毫秒时间戳 → 'YYYY-MM-DD'（本地时区），给日期输入框用 */
  function dayStr(ms) {
    const d = new Date(num(ms));
    return (
      d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    );
  }

  /** 当前统计窗口（自然日）：自定义优先，否则「今天 0 点往前 days-1 天 → 明天 0 点」 */
  function logRange() {
    if (String(S.logDays) === 'custom') {
      const f = parseDayMs(S.logFrom);
      const t = parseDayMs(S.logTo);
      if (f != null || t != null) {
        const from = f != null ? f : t - 6 * 86400000;
        let to = (t != null ? t : from) + 86400000;
        if (to <= from) to = from + 86400000; // 起止填反了也给一天
        return { from, to, days: Math.round((to - from) / 86400000), custom: true };
      }
      // 选了自定义但还没填日期：先按近 7 天
    }
    const days = Math.max(1, Math.min(90, Math.floor(num(S.logDays) || 7)));
    return { from: dayStartMs(days - 1), to: dayStartMs(-1), days, custom: false };
  }

  /** 窗口文字：近 7 天 / 11/01 ~ 11/09（9 天） */
  function logRangeLabel(r) {
    const g = r || logRange();
    return g.custom ? `${fmtDay(g.from)} ~ ${fmtDay(g.to - 1)}（${g.days} 天）` : `近 ${g.days} 天`;
  }

  /** 从描述里抠角色 ID（兜底，正常走 RelatedId） */
  function descCharaId(desc) {
    const m = String(desc || '').match(/#(\d+)/);
    return m ? num(m[1]) : 0;
  }

  /** 从描述里抠股数（兜底，正常走 Amount） */
  function descAmount(desc) {
    const m = String(desc || '').match(/([\d,]+(?:\.\d+)?)\s*股/);
    return m ? num(m[1].replace(/,/g, '')) : 0;
  }

  /**
   * 真正发生股数变化的角色 —— **一律以描述里的 #ID 为准，RelatedId 只做兜底**。
   * 真实账单（2026-11-16 用 200 条逐条核对）里 RelatedId 根本不是持股变动的人：
   *   · 「彩票刮刮乐获奖 #69699…」的 RelatedId 恒为 8（于是坂上智代凭空多出几千股）；
   *   · 「使用「虚空道标」获得 #6「伊吹风子」81股」的 RelatedId 是自己的炮塔；
   *   · 「受到「虚空道标」攻击损失 #35681「惠惠」90股固定资产」的 RelatedId 是炮手。
   * 只有「Ico / 买入 / 卖出 / 竞拍」这类 RelatedId 才是对的，但它们的描述里同样带 #ID。
   */
  function logCharaId(x) {
    const desc = String(x.Description || '');
    const t = num(x.Type);
    // 股息 / 税费 / 签到 / 福利 / 推荐 / 大乐透 / 分红 不针对具体角色（刮刮乐获奖要保留角色，股数统计用）
    if (/刮刮乐|彩票/.test(desc) && !(num(x.Amount) > 0)) return 0;
    if (/股息|印花税|所得税|签到|每日登录|节日福利|福利|推荐奖励|大乐透|返利|投票返利|竞拍分红|竞拍分成|拍卖分红|红包/.test(desc) || t === 7 || t === 14) return 0;
    const byDesc = descCharaId(desc);
    if (byDesc) return byDesc;
    return x.RelatedId === undefined || x.RelatedId === null ? 0 : num(x.RelatedId);
  }

  /** 道具类日志再细分：混沌魔方 / 虚空道标 … 各自单独统计（用户要求） */
  const ITEM_SUBS = [
    ['chaos', '混沌魔方', /混沌魔方/],
    ['guidepost', '虚空道标', /虚空道标/],
    ['fisheye', '鲤鱼之眼', /鲤鱼之眼/],
    ['shard', '星光碎片', /星光碎片/],
    ['crystal', '闪光结晶', /闪光结晶/],
    ['item', '其他道具', null],
  ];
  const ITEM_SUB_LABEL = Object.create(null);
  ITEM_SUBS.forEach((r) => (ITEM_SUB_LABEL[r[0]] = r[1]));

  function itemSub(desc) {
    const s = String(desc || '');
    for (let i = 0; i < ITEM_SUBS.length; i++) {
      if (ITEM_SUBS[i][2] && ITEM_SUBS[i][2].test(s)) return ITEM_SUBS[i][0];
    }
    return 'item';
  }

  /**
   * 「使用 #1「A」120股通过「星光碎片」为 #2「B」充能120股」——
   * Amount 是正数，但消耗的是 A 的股，方向是「失去」，得单独薅出那个股数。
   */
  function shardFuel(desc) {
    const m = String(desc || '').match(/使用\s*#\d+[^#]*?([\d,]+(?:\.\d+)?)\s*股/);
    return m ? num(String(m[1]).replace(/,/g, '')) : 0;
  }

  function fmtCc(v) {
    const n = num(v);
    if (Math.abs(n) >= 1e8) return (n / 1e8).toFixed(2) + ' 亿';
    if (Math.abs(n) >= 1e4) return (n / 1e4).toFixed(2) + ' 万';
    return n.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
  }

  /**
   * 角色维度的股数统计：一条记录只归一个方向、一个来源。
   * gainBy / lossBy 按来源细分（道具再拆混沌魔方 / 虚空道标 …），
   * 明细页的「获得 / 失去 → 类型」筛选直接读这两张表。
   */
  function logStats() {
    const map = new Map();

    logAll.forEach((x) => {
      const ds = String(x.Description || '');
      const ch = num(x.Change);
      const amt = x.Amount === undefined || x.Amount === null ? descAmount(ds) : num(x.Amount);
      if (!amt) return;

      const id = logCharaId(x);
      if (!id) return;

      const kind = classifyKind(ds, amt, ch, x.Type);
      // 星之力是固资转化（1 股固定资产 → 1 星之力），不算股数
      if (/星之力/.test(ds)) return;
      // 「N 股固定资产」写的是圣殿固资，不是活股（道标打塔常见），归圣殿口径
      if (/固定资产/.test(ds)) return;
      // 卖出只算真正成交的；「卖出委托 … 冻结 N 股」Change=0，那是冻结不是损失
      if (kind === 'sell' && ch <= 0) return;

      let rec = map.get(id);
      if (!rec) {
        rec = { id, gain: 0, loss: 0, gainBy: Object.create(null), lossBy: Object.create(null) };
        map.set(id, rec);
      }
      const bump = (dir, key, val) => {
        if (!(val > 0)) return;
        const bag = dir === 'loss' ? rec.lossBy : rec.gainBy;
        bag[key] = (bag[key] || 0) + val;
        if (dir === 'loss') rec.loss += val;
        else rec.gain += val;
      };

      const sub = kind === 'item' ? itemSub(ds) : kind;
      if (kind === 'sell' || kind === 'sacrifice') {
        // 献祭 / 资产重组在日志里股数是正数，但方向是消耗
        bump('loss', sub, Math.abs(amt));
      } else if (/星光碎片/.test(ds) && /充能/.test(ds)) {
        // 燃料股被吃掉，Amount 却是正的
        bump('loss', 'shard', shardFuel(ds) || Math.abs(amt));
      } else if (amt > 0) {
        bump('gain', sub, amt);
      } else {
        bump('loss', sub, -amt);
      }
    });

    return { chars: [...map.values()] };
  }

  /**
   * 日志 → 变动来源。先用文字里最没歧义的词兜住（服务端有部分记录的 Type 标成了「其他」），
   * 再信 Type 字段，最后退回中文关键词和「花钱买股 / 卖股收钱」的方向推断。
   */
  function classifyKind(desc, amt, ch, type) {
    const s = String(desc || '');
    if (TAX_RE.test(s)) return 'tax';
    if (/福利/.test(s)) return 'welfare';
    if (/股权融资/.test(s)) return 'sacrifice';
    if (/bangumi每日登录奖励/.test(s)) return 'checkin';
    if (/绑定手机奖励|注册.*奖励/.test(s)) return 'refer';
    if (/萌王投票返利/.test(s)) return 'aucbonus';
    if (/大乐透/.test(s)) return 'lotto';
    if (/被推荐奖励|推荐奖励|推荐有奖/.test(s)) return 'refer';
    if (/印花税/.test(s)) return 'stamp';
    if (/手续费/.test(s)) return 'fee';
    if (/献上祝福|祝福/.test(s)) return 'bless';
    if (/增购|精炼/.test(s)) return 'refine';
    // 竞拍分红要先判：它同时带「竞拍」和「分红」，不能算成竞拍返还
    if (/竞拍|拍卖/.test(s) && /分红|分成/.test(s)) return 'aucbonus';
    if (/股息/.test(s)) return 'dividend';
    if (/刮刮乐|彩票/.test(s)) return 'scratch';
    const t = LOG_TYPE[num(type)];
    if (t && t !== 'other') return t;
    if (!s) return 'other';
    for (let i = 0; i < FLOW_RULES.length; i++) {
      const r = FLOW_RULES[i];
      for (let j = 0; j < r.kw.length; j++) {
        if (s.includes(r.kw[j])) return r.key;
      }
    }
    if (/ico/i.test(s)) return 'ico';
    const a = num(amt);
    const c = num(ch);
    if (a > 0 && c < 0) return 'buy'; // 花 cc 换到股
    if (a < 0 && c > 0) return 'sell'; // 出股换回 cc
    return 'other';
  }

  /** 描述文案 → 固定资产变动来源；不是固资相关返回 null */
  function fixedKind(desc) {
    const s = String(desc || '');
    if (!s) return null;
    for (let i = 0; i < FIXED_RULES.length; i++) {
      if (FIXED_RULES[i].test(s)) return FIXED_RULES[i];
    }
    if (s.includes('固定资产') || s.includes('固资') || s.includes('圣殿')) return { key: 'other', label: '其他' };
    return null;
  }

  /** 从描述里抠固定资产变动数值，抠不到返回 0 */
  function parseFixed(desc) {
    const s = String(desc || '');
    // 「71股固定资产」「100 点固定资产」「固定资产 71」都按固资点算
    let m = s.match(/([\d,]+(?:\.\d+)?)\s*(?:股|点)?\s*固定资产/) || s.match(/固定资产[^\d\-−]{0,12}([\d,]+(?:\.\d+)?)/);
    if (m) return num(String(m[1]).replace(/,/g, ''));
    // 只写了「点」的，也算固资
    m = s.match(/([\d,]+(?:\.\d+)?)\s*点/);
    if (m) return num(String(m[1]).replace(/,/g, ''));
    return 0;
  }

  /** 同一条日志里被扣掉的活股数（没有「固定资产」字样时才算，避免把「71股固定资产」当成股） */
  function parseFixedShares(desc) {
    const s = String(desc || '');
    if (/固定资产/.test(s)) return 0;
    const m = s.match(/([\d,]+(?:\.\d+)?)\s*股/);
    return m ? num(String(m[1]).replace(/,/g, '')) : 0;
  }

  /**
   * 账本统计：资金按「收入 / 支出」、股数按「获得 / 损失」四象限聚合，
   * 每个象限内再按来源分类（卖出 / 股息 / 买入 / 献祭 …）。
   */
  function ledgerStats() {
    const buckets = {
      fundIn: new Map(),
      fundOut: new Map(),
      stockIn: new Map(),
      stockOut: new Map(),
      fixedIn: new Map(),
      fixedOut: new Map(),
    };
    let cc = 0;
    let ccTs = 0;
    const tax = { sum: 0, n: 0 };
    const hitMap = new Map();
    const auctionBack = { sum: 0, n: 0 }; // 竞拍失败返还，最后从「竞拍」支出里扣
    const buyBack = { sum: 0, n: 0 }; // 取消买入 / 冰山撤回的返还，最后从「买入」支出里扣
    let scratchBuys = 0; // 刮刮乐「购买」次数（每次 -1000 cc 一条），用来当次数，别用奖励行数

    const add = (map, key, label, val, desc) => {
      let r = map.get(key);
      if (!r) {
        r = { key, label, sum: 0, n: 0, samples: [] };
        map.set(key, r);
      }
      r.sum += Math.abs(val);
      r.n++;
      if (key === 'other' && r.samples.length < 4 && desc) {
        const s = String(desc).slice(0, 32);
        if (!r.samples.includes(s)) r.samples.push(s);
      }
    };

    logAll.forEach((x) => {
      const desc = x.Description;
      const ch = num(x.Change);
      const rawAmt = x.Amount === undefined || x.Amount === null ? descAmount(desc) : x.Amount;
      const amt = num(rawAmt);
      const kind = classifyKind(desc, amt, ch, x.Type);
      if (kind === 'scratch' && ch < 0) scratchBuys++;

      const put = (map, allowed, val) => {
        const k = allowed.includes(kind) ? kind : 'other';
        add(map, k, FLOW_LABEL[k] || '其他', val, desc);
      };

      if (ch > 0) {
        // 竞拍 / 买入的退款都是「挂单冻结又退回」，不算收入，改成冲减对应支出
        if (kind === 'auction') {
          auctionBack.sum += ch;
          auctionBack.n++;
        } else if (kind === 'buy') {
          buyBack.sum += ch;
          buyBack.n++;
        } else put(buckets.fundIn, FUND_IN_KINDS, ch);
      } else if (ch < 0) {
        // 个人所得税单拎出来，最后从股息里扣，避免"股息看着高、其实大半交税"
        if (kind === 'tax' || TAX_RE.test(String(desc || ''))) {
          tax.sum += -ch;
          tax.n++;
        } else put(buckets.fundOut, FUND_OUT_KINDS, -ch);
      }

      const ds = String(desc || '');
      // 自己的塔被道标打中：Change=0、Amount = -N。两种写法在真实账单里都有：
      //   「…损失 #7998「大道寺知世」97股固定资产」= 掉的是圣殿固资 → 只进圣殿口径
      //   「…损失 #111328「八奈见杏菜」49股」      = 掉的是活股     → 只进股数口径
      const isGuideHit = /虚空道标/.test(ds) && !/获得/.test(ds) && /受到|被|你的圣殿/.test(ds);
      const hitOnFixed = isGuideHit && /固定资产/.test(ds);

      if (/星之力/.test(ds)) {
        // 「N 股固定资产转化为星之力」算的是固资，已在圣殿口径里，不重复计入股数
      } else if (isGuideHit) {
        // 打掉固资的那条不算股数；只有「N股」才是活股
        if (!hitOnFixed) {
          const sh = Math.abs(num(x.Amount)) || parseFixedShares(ds);
          if (sh) put(buckets.stockOut, STOCK_OUT_KINDS, sh);
        }
      } else if (/星光碎片/.test(ds) && /充能/.test(ds)) {
        // 「使用 A「120股」通过星光碎片为 B 充能」：吃掉的是燃料角色的股，Amount 却是正的
        const sh = shardFuel(ds) || Math.abs(amt);
        if (sh) put(buckets.stockOut, STOCK_OUT_KINDS, sh);
      } else if (kind === 'sell') {
        // 卖出只算真正成交的（同时收到了 cc）；挂单冻结 / 取消卖出都不计
        if (ch > 0 && amt) put(buckets.stockOut, STOCK_OUT_KINDS, Math.abs(amt));
      } else if (kind === 'sacrifice' && amt) {
        // 献祭（资产重组）在日志里股数常记成正数，但语义是消耗，一律算损失
        put(buckets.stockOut, STOCK_OUT_KINDS, Math.abs(amt));
      } else if (amt > 0) put(buckets.stockIn, STOCK_IN_KINDS, amt);
      else if (amt < 0) put(buckets.stockOut, STOCK_OUT_KINDS, -amt);

      // 固定资产：日志里没有独立字段，只能靠描述归类 + 抠数值。
      // 道标命中只有「N股固定资产」那条才算固资；「N股」是活股，已经记进股数损失，别再算一遍。
      const fk = isGuideHit && !hitOnFixed ? null : fixedKind(desc);
      // 道标命中行的描述有两种写法：「…11股固定资产」和「…83股」（少了「固定资产」四个字），
      // 后者抠不出数值，所以这类行直接取 Amount（-N 就是掉的点数）。
      const fAmt = isGuideHit ? Math.abs(num(x.Amount)) || parseFixed(desc) : parseFixed(desc);
      // 没解析出固资数值的行不是固资变动，跳过（不能 return，后面还要读 Balance 更新账户余额）：
      // 「使用「虚空道标」获得 6「伊吹风子」48股」这类行写着「获得」+ 道具名，
      // 以前会被记成「固资获得 0 点」，于是面板上出现「固资获得 57 次」却一分没有的怪现象。
      if (fk && fAmt > 0) {
        const sAmt = isGuideHit ? 0 : parseFixedShares(desc);
        const gain = /获得|增加|补充|恢复|注入/.test(String(desc || ''));
        add(gain ? buckets.fixedIn : buckets.fixedOut, fk.key, fk.label, fAmt, desc);
        if (!gain && fk.key === 'guidepost') {
          // 分组只认描述里那个角色：RelatedId 存的不是被命中的塔
          //（真实数据里同一座塔的 RelatedId 各不相同，按它分组会冒出一堆没建过塔的角色）
          const hid = descCharaId(desc) || num(x.RelatedId);
          if (hid) {
            const rec = hitMap.get(hid) || { id: hid, sum: 0, shares: 0, n: 0 };
            rec.sum += fAmt;
            rec.shares += sAmt;
            rec.n++;
            hitMap.set(hid, rec);
          }
        }
      }

      const b = num(x.Balance);
      const ts = logTs(x.LogTime);
      if (b > 0 && ts >= ccTs) {
        cc = b;
        ccTs = ts;
      }
    });

    // 刮刮乐的「次数」按购买次数算（日志里每次 -1000 cc 一条），
    // 不是奖励行数：刮一次会掉好几条「彩票刮刮乐获奖」记录，行数会虚高两三倍。
    if (scratchBuys > 0) {
      const scRow = buckets.stockIn.get('scratch');
      if (scRow) {
        scRow.n = scratchBuys;
        scRow.countBy = 'buy';
      }
    }

    // 股息记税后：把个税从股息收入里扣掉，个税不再单独出现在支出里
    const div = buckets.fundIn.get('dividend');
    if (tax.sum > 0 && div) {
      div.gross = div.sum;
      div.tax = tax.sum;
      div.taxN = tax.n;
      div.sum = Math.max(0, div.sum - tax.sum);
    }

    // 竞拍记净额：支出里的竞拍扣掉失败返还
    if (auctionBack.sum > 0) {
      const r = buckets.fundOut.get('auction');
      if (r && r.sum > 0) {
        r.refund = auctionBack.sum;
        r.refundN = auctionBack.n;
        r.sum = Math.max(0, r.sum - auctionBack.sum);
      } else {
        // 这段时间只有返还、没有竞拍支出，那就别把钱吞掉，照旧记成收入
        add(buckets.fundIn, 'auction', FLOW_LABEL.auction, auctionBack.sum, '竞拍失败返还');
        const row = buckets.fundIn.get('auction');
        if (row) row.n = auctionBack.n;
      }
    }

    // 买入同样记净额：撤单 / 冰山退回的 cc 冲减买入支出
    if (buyBack.sum > 0) {
      const r = buckets.fundOut.get('buy');
      if (r && r.sum > 0) {
        r.refund = buyBack.sum;
        r.refundN = buyBack.n;
        r.sum = Math.max(0, r.sum - buyBack.sum);
      } else {
        add(buckets.fundIn, 'buy', FLOW_LABEL.buy, buyBack.sum, '买入退回');
        const row = buckets.fundIn.get('buy');
        if (row) row.n = buyBack.n;
      }
    }

    const pack = (map, keepZero) => {
      const rows = [...map.values()].filter((r) => (keepZero ? r.n > 0 : r.sum > 0 || r.tax > 0));
      rows.sort((a, b) => b.sum - a.sum);
      const total = rows.reduce((s, r) => s + r.sum, 0);
      rows.forEach((r) => {
        r.pct = total ? r.sum / total : 0;
        r.blind = r.sum <= 0; // 有次数但没抠出数值
      });
      return { rows, total, n: rows.reduce((s, r) => s + r.n, 0) };
    };

    return {
      fundIn: pack(buckets.fundIn),
      fundOut: pack(buckets.fundOut),
      stockIn: pack(buckets.stockIn),
      stockOut: pack(buckets.stockOut),
      fixedIn: pack(buckets.fixedIn, true),
      fixedOut: pack(buckets.fixedOut, true),
      hits: [...hitMap.values()]
        .filter((x) => x.sum > 0 || x.shares > 0)
        .sort((a, b) => b.sum - a.sum || b.shares - a.shares),
      tax,
      auctionBack,
      cc,
    };
  }

  /** 从日志的 Balance 字段还原每日余额曲线（同一天取最后一条） */
  function balanceSeries(days) {
    const cut = Date.now() - Math.max(1, num(days) || 30) * 86400000;
    const byDay = new Map();
    logAll.forEach((x) => {
      const ts = logTs(x.LogTime);
      const v = num(x.Balance);
      if (!ts || ts < cut || v <= 0) return;
      const d = new Date(ts);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      const prev = byDay.get(key);
      if (!prev || ts >= prev.t) byDay.set(key, { d: key, t: ts, v });
    });
    return [...byDay.values()].sort((a, b) => (a.d < b.d ? -1 : 1));
  }

  /** 取资产走势点：优先日志还原的余额（覆盖所选天数），其次本地每日快照 */
  function assetSeries() {
    const series = balanceSeries(9999);
    if (series.length >= 2) return { pts: series, label: '账户余额' };
    const pts = snaps.map((s) => ({ d: s.d, v: s.cc + (s.mv || 0) }));
    return { pts, label: '总资产' };
  }

  const SVG_NS = 'http://www.w3.org/2000/svg';

  function svgNode(tag, attrs) {
    const el = HDOC.createElementNS(SVG_NS, tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v === null || v === undefined) continue;
        el.setAttribute(k, v);
      }
    }
    return el;
  }

  /** 迷你折线图（viewBox 拉伸铺满，线宽用 non-scaling-stroke 保持） */
  function sparkline(pts, color) {
    const wrap = h('div', { class: 'tglp-sparkwrap' });
    if (!pts || !pts.length) {
      wrap.appendChild(h('div', { class: 'tglp-sparkempty' }, '暂无走势数据'));
      return wrap;
    }
    if (pts.length === 1) {
      wrap.appendChild(h('div', { class: 'tglp-sparkempty' }, `仅 1 天数据（${pts[0].d}）· 攒几天就能看趋势`));
      return wrap;
    }
    const W = 100;
    const H = 34;
    const PAD = 3;
    const vals = pts.map((p) => num(p.v));
    let min = Math.min(...vals);
    let max = Math.max(...vals);
    if (max - min < 1e-9) max = min + Math.max(1, Math.abs(min) * 0.01);
    const span = max - min;
    const step = W / (pts.length - 1);
    const xy = vals.map((v, i) => [i * step, H - PAD - ((v - min) / span) * (H - PAD * 2)]);
    const line = xy.map((c, i) => `${i ? 'L' : 'M'}${c[0].toFixed(2)},${c[1].toFixed(2)}`).join('');
    const svg = svgNode('svg', {
      class: 'tglp-spark',
      viewBox: `0 0 ${W} ${H}`,
      preserveAspectRatio: 'none',
    });
    svg.appendChild(svgNode('path', { d: `${line}L${W},${H}L0,${H}Z`, class: 'tglp-spark-area', fill: color }));
    svg.appendChild(
      svgNode('path', {
        d: line,
        class: 'tglp-spark-line',
        stroke: color,
        'vector-effect': 'non-scaling-stroke',
      })
    );
    wrap.appendChild(svg);
    return wrap;
  }

  /**
   * 股数明细的「获得 / 失去 → 类型」下拉项（用户指定的分类口径）。
   * 道具不再单列一项：混沌魔方 / 虚空道标 各自就是一项，再放个「道具」只会重复。
   */
  const STOCK_FILTERS = {
    gain: [
      ['all', '全部'],
      ['auction', '竞拍'],
      ['chaos', '混沌魔方'],
      ['guidepost', '虚空道标'],
      ['scratch', '刮刮乐'],
      ['ico', 'ICO'],
      ['buy', '买入'],
    ],
    loss: [
      ['all', '全部'],
      ['sacrifice', '献祭'],
      ['sell', '卖出'],
      ['chaos', '混沌魔方'],
      ['guidepost', '虚空道标'],
      ['shard', '星光碎片'],
    ],
  };

  function logCharVal(x, dir, kind) {
    if (kind === 'all') return dir === 'loss' ? x.loss : x.gain;
    const bag = dir === 'loss' ? x.lossBy : x.gainBy;
    return num(bag && bag[kind]);
  }

  /* ---- 星之力：时间范围 / 当前总量 ---- */

  /** 星之力的筛选档（用户指定；5~10 万这档是补上的，否则这一段会被漏掉） */
  const STAR_FILTERS = [
    ['all', '全部', () => true],
    ['lt1w', '0 ~ 1 万', (v) => v > 0 && v < 10000],
    ['1w5w', '1 万 ~ 5 万', (v) => v >= 10000 && v < 50000],
    ['5w10w', '5 万 ~ 10 万', (v) => v >= 50000 && v < 100000],
    ['gt10w', '> 10 万', (v) => v >= 100000],
  ];
  const starFilterFn = (k) => (STAR_FILTERS.filter((r) => r[0] === k)[0] || STAR_FILTERS[0])[2];

  /** 按日志时间范围统计：每条「将 #A「X」N股固定资产转化为「星之力」」记 N */
  function starRangeRows() {
    const map = new Map();
    logAll.forEach((x) => {
      const ds = String(x.Description || '');
      if (!/星之力|灌注/.test(ds)) return;
      const id = logCharaId(x);
      if (!id) return;
      const amt = Math.abs(num(x.Amount)) || descAmount(ds);
      if (!amt) return;
      const r = map.get(id) || { id, star: 0, n: 0 };
      r.star += amt;
      r.n++;
      map.set(id, r);
    });
    return [...map.values()];
  }

  // 「不限时间」用的当前快照（自己所有塔的 StarForces），2 分钟缓存
  let starNowRows = null;
  let starNowAt = 0;
  let starNowBusy = false;
  let starNameBusy = false; // 正在补星之力列表的角色名 / 等级，避免重绘循环

  async function loadStarNow(force) {
    if (!force && starNowRows && Date.now() - starNowAt < 120000) return starNowRows;
    if (starNowBusy) return starNowRows || [];
    starNowBusy = true;
    try {
      const u = await selfKey();
      if (!u) throw new Error('读不到自己的用户名');
      const out = [];
      let page = 1;
      let pages = 1;
      do {
        const v = await api(`chara/user/temple/${encodeURIComponent(u)}/${page}/100`, { timeout: 30000 });
        const items = (v && v.Items) || [];
        pages = num(v && v.TotalPages) || 1;
        items.forEach((t) => {
          const sf = num(t.StarForces);
          const cid = num(t.CharacterId);
          if (sf > 0 && cid) {
            out.push({ id: cid, star: sf, n: 0, cap: num(t.Sacrifices), assets: num(t.Assets) });
          }
        });
        page++;
        if (page <= pages && page <= 40) await sleep(120);
      } while (page <= pages && page <= 40);
      starNowRows = out;
      starNowAt = Date.now();
      // 塔接口只带 CharacterName（常常是 null），名字 / 等级统一走 chara/list 补一次，
      // 否则「当前总量」列表全是 #41849 这种 ID
      await loadNames(out.map((r) => r.id), false, { always: true });
      return out;
    } finally {
      starNowBusy = false;
    }
  }

  /** 星之力明细的行：筛选 + 排序（多 → 少 / 少 → 多） */
  function starRows(list) {
    const keep = starFilterFn(S.starFilter);
    const rows = (list || []).filter((r) => keep(r.star));
    const asc = S.starSort === 'asc';
    rows.sort((a, b) => (asc ? a.star - b.star : b.star - a.star));
    return rows;
  }

  function logCharRows(st) {
    const dir = S.logDir === 'loss' ? 'loss' : 'gain';
    const kind = S.logKind || 'all';
    const val = (x) => logCharVal(x, dir, kind);
    // 类型选了具体某一项时，只留这一项有数的角色
    const rows = st.chars.filter((x) => val(x) > 0);
    const asc = S.logSort === 'asc';
    rows.sort((a, b) => (asc ? val(a) - val(b) : val(b) - val(a)));
    const top = Math.max(1, Math.floor(num(S.logTop) || 20));
    return { rows: rows.slice(0, top), count: rows.length, dir, kind, val };
  }

  /** 一条资金日志的唯一身份：优先用服务端 id，没有就拼一个内容指纹（时间 + 类型 + 数额 + 描述） */
  function logKey(x) {
    if (!x) return '';
    const id = x.Id ?? x.LogId;
    if (id !== undefined && id !== null && id !== '') return 'i' + id;
    return [x.LogTime, x.Type, x.Change, x.Amount, x.RelatedId, x.Description].join('\u0001');
  }

  /* ============ 账本渲染（原文抽取） ============ */
  function copyLogs() {
    if (!logAll.length) return setLogStatus('没有可复制的数据');
    const st = ledgerStats();
    const view =
      S.ledgerView === 'stock' || S.ledgerView === 'fixed' || S.ledgerView === 'star' ? S.ledgerView : 'fund';
    const lines = [];

    if (view === 'fund') {
      lines.push(`资金收支（${logRangeLabel()}）`, '方向\t来源\t金额\t笔数');
      [
        ['收入', st.fundIn],
        ['支出', st.fundOut],
      ].forEach(([d, data]) => {
        lines.push([d, '合计', data.total.toFixed(2), data.n].join('\t'));
        data.rows.forEach((r) => lines.push([d, r.label, r.sum.toFixed(2), r.n].join('\t')));
      });
      const dv = st.fundIn.rows.find((r) => r.key === 'dividend');
      if (dv && dv.tax) lines.push('', `股息为税后值：税前 ${dv.gross.toFixed(2)}，个人所得税 ${dv.tax.toFixed(2)}（${dv.taxN} 笔）`);
      const ar = st.fundOut.rows.find((r) => r.key === 'auction' && r.refund);
      if (ar) lines.push(`竞拍为净额：已扣除失败返还 ${ar.refund.toFixed(2)}（${ar.refundN} 笔）`);
      const br = st.fundOut.rows.find((r) => r.key === 'buy' && r.refund);
      if (br) lines.push(`买入为净额：已扣除撤单 / 冰山退回 ${br.refund.toFixed(2)}（${br.refundN} 笔）`);
    } else if (view === 'stock') {
      lines.push(`股数增减（${logRangeLabel()}）`, '方向\t来源\t股数\t次数');
      [
        ['获得', st.stockIn],
        ['损失', st.stockOut],
      ].forEach(([d, data]) => {
        lines.push([d, '合计', data.total, data.n].join('\t'));
        data.rows.forEach((r) => lines.push([d, r.label, r.sum, r.n].join('\t')));
      });
      const fr = logCharRows(logStats());
      const dirName = fr.dir === 'loss' ? '失去' : '获得';
      const pick = STOCK_FILTERS[fr.dir].filter((r) => r[0] === fr.kind)[0];
      lines.push('', `角色\t${dirName}股\t净变化` + (fr.kind === 'all' ? '' : `（仅 ${pick ? pick[1] : ''}）`));
      fr.rows.forEach((x) => {
        lines.push([charaName(x.id) || '#' + x.id, fr.val(x), x.gain - x.loss].join('\t'));
      });
    } else if (view === 'star') {
      const now = S.starMode === 'now';
      const rows2 = starRows(now ? starNowRows || [] : starRangeRows());
      lines.push(
        now ? '星之力（当前总量）' : `星之力贡献（${logRangeLabel()}）`,
        now ? '角色\t星之力\t固资\t上限' : '角色\t星之力\t冲星次数'
      );
      rows2.forEach((x) => {
        const nm = charaName(x.id) || '#' + x.id;
        lines.push(now ? [nm, x.star, x.assets || 0, x.cap || 0].join('\t') : [nm, x.star, x.n].join('\t'));
      });
      lines.push(['合计', rows2.reduce((s2, r) => s2 + r.star, 0)].join('\t'));
    } else {
      // 圣殿只看损失：固资获得没有参考价值（补资 / 献祭都会涨，混在一起反而看不懂）
      lines.push(`圣殿固资损失（${logRangeLabel()}）`, '来源\t固资\t次数');
      lines.push(['合计', st.fixedOut.total, st.fixedOut.n].join('\t'));
      st.fixedOut.rows.forEach((r) => lines.push([r.label, r.sum, r.n].join('\t')));
      if (st.hits.length) {
        lines.push('', '被道标命中\t角色\t损失固资\t扣股\t次数');
        st.hits.forEach((x) => lines.push(['', charaName(x.id), x.sum, x.shares || 0, x.n].join('\t')));
      }
    }

    copyText(lines.join('\n'), (m) => setLogStatus(m + ' ' + (lines.length - 1) + ' 行'));  }

  /* ============ 界面小工具（原文抽取） ============ */
  /* ------------------------------ 界面 ------------------------------ */

  function line(label, ...nodes) {
    return h('div', { class: 'tglp-line' }, h('span', { class: 'tglp-label' }, label), ...nodes);
  }

  function input(id, value, attrs) {
    return h('input', {
      id,
      type: 'text',
      // 面板里同时存在 text / password 输入框时，Chrome 会把它们当成登录表单，
      // 把保存的 bangumi 账号填进第一个文本框。统一关掉自动填充并随机化 name，
      // 让所有输入框都不与常见登录字段名（username/email/password）重合。
      autocomplete: 'off',
      name: 'tglp-f-' + String(id).replace(/[^a-z0-9-]/gi, '') + '-' + HOST_TOKEN.slice(-6),
      value: value === undefined || value === null ? '' : String(value),
      ...(attrs || {}),
    });
  }

  function select(id, options, value) {
    const el = h('select', { id }, options.map(([v, t]) => h('option', { value: v }, t)));
    el.value = value;
    return el;
  }

  /* ============ 状态 / 复制（原文抽取） ============ */
  function setLogStatus(msg, action) {
    if (!els) return;
    els.logStat.textContent = msg;
    /* 未登录时给一个能直接点的入口；悬停说明第三方 Cookie 这个坑：
       Chrome 拦了第三方 Cookie 的话，就算在 tinygrail.com 登录过，这边也读不到。 */
    if (action === 'login') {
      els.logStat.appendChild(document.createTextNode(' · '));
      els.logStat.appendChild(h('a', {
        class: 'tglp-loginlink',
        href: 'https://tinygrail.com/',
        target: '_blank',
        rel: 'noopener',
        title: '在新标签打开小圣杯确认已登录；若已登录仍失败，请在浏览器里允许第三方 Cookie 后重试',
      }, '去小圣杯登录 →'));
    }
  }

  function setButtonsDisabled(v) {
    if (!els) return;
    (els.mModes || []).forEach((b) => {
      b.disabled = v;
      b.classList.toggle('tglp-off', v);
    });
    (els.sEndModes || []).forEach((b) => {
      b.disabled = v;
      b.classList.toggle('tglp-off', v);
    });
    if (els.mFill) els.mFill.disabled = v;
    if (els.mFillMax) els.mFillMax.disabled = v;
    [els.tRun, els.hRun, els.fRun, els.favRun, els.mRun, els.lRun, els.sRun, els.sdRun, els.sdLoad].forEach((b) => {
      if (!b) return;
      b.disabled = v;
      if (b === els.tRun) b.textContent = v ? '扫描中…' : '扫描';
      if (b === els.hRun) b.textContent = v ? '扫描中…' : '扫描';
      if (b === els.fRun) b.textContent = v ? '查询中…' : '查询';
      if (b === els.favRun) b.textContent = v ? '读取中…' : '刷新全部';
      if (b === els.mRun) b.textContent = v ? '执行中…' : '执行';
      if (b === els.lRun) b.textContent = v ? '统计中…' : '统计';
      if (b === els.sRun) b.textContent = v ? '冲星中…' : '一键冲星';
      if (b === els.sdRun) b.textContent = v ? '充能中…' : '充能';
    });
  }

  function copyText(text, statusFn) {
    const done = () => statusFn('已复制');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallback(text, done, statusFn));
    } else {
      fallback(text, done, statusFn);
    }
  }

  function fallback(text, done, statusFn) {
    const ta = HDOC.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;top:0;';
    HDOC.body.appendChild(ta);
    ta.select();
    try {
      HDOC.execCommand('copy');
      done();
    } catch (e) {
      statusFn('复制失败，请手动选择');
    }
    ta.remove();
  }

  /* ============ 样式（原文抽取，命名空间已换） ============ */
  const CSS = `
#tglp-panel,#tglp-fab,.tglp-sug,.tglp-favpop,#tglp-star,.tglp-starpop,.tglp-histpop,.tglp-movepop,.tglp-pintoast{
  --tl-bg:#20242e; --tl-sunken:#181b22; --tl-sunken2:#1b1f27;
  --tl-surface:#262b36; --tl-surface2:#2a2f3b; --tl-surface3:#333947;
  --tl-line:#3b4150; --tl-line-soft:rgba(255,255,255,.07); --tl-bar:rgba(255,255,255,.14);
  --tl-fg:#e6e8ee; --tl-fg2:#cfd4df; --tl-dim:#9aa3b5; --tl-mute:#727b8d;
  --tl-accent:#e46fa1; --tl-accent-fg:#ffd9e8; --tl-hl:#ffb3cf;
  --tl-up:#9fe0b0; --tl-down:#8fb8ff; --tl-link:#8fd3ff;
  --tl-hit:#2d2739; --tl-okbg:#1e2a23; --tl-badbg:#2b1f24;
  --tl-bad:#ff9aa8; --tl-warn:#ffd08a;
}
#tglp-panel[data-theme="light"],.tglp-sug[data-theme="light"],.tglp-favpop[data-theme="light"],#tglp-star[data-theme="light"],.tglp-starpop[data-theme="light"],.tglp-histpop[data-theme="light"],.tglp-movepop[data-theme="light"],.tglp-pintoast[data-theme="light"]{
  --tl-bg:#fcfafb; --tl-sunken:#f4eff3; --tl-sunken2:#f8f3f6;
  --tl-surface:#f4eef2; --tl-surface2:#ece4ea; --tl-surface3:#e2d7df;
  --tl-line:#d9cbd4; --tl-line-soft:rgba(96,64,84,.12); --tl-bar:rgba(96,64,84,.16);
  --tl-fg:#332b31; --tl-fg2:#4a4046; --tl-dim:#7b6d77; --tl-mute:#9b8d97;
  --tl-accent:#d4568e; --tl-accent-fg:#a8305f; --tl-hl:#bc4a7c;
  --tl-up:#2c8255; --tl-down:#2f66a8; --tl-link:#2f6bb0;
  --tl-hit:#f9e9f1; --tl-okbg:#e9f5ee; --tl-badbg:#fbeaee;
  --tl-bad:#b83b52; --tl-warn:#95651a;
}
#tglp-panel[data-theme="light"]{box-shadow:0 18px 50px rgba(90,58,78,.18)}
.tglp-sug[data-theme="light"]{box-shadow:0 10px 32px rgba(90,58,78,.22)}
.tglp-favpop[data-theme="light"],.tglp-starpop[data-theme="light"],.tglp-histpop[data-theme="light"],.tglp-movepop[data-theme="light"]{box-shadow:0 12px 36px rgba(90,58,78,.24)}
/* 挂到最外层页面时，避免主站全局样式干扰面板内部布局 */
#tglp-panel,#tglp-panel *{box-sizing:border-box}
#tglp-panel button,#tglp-fab{font-family:inherit}
.tglp-line .tglp-favbtn{margin-left:-2px}
/* 收藏夹快选按钮 + 浮层 */
.tglp-favbtn{flex:none;width:22px;height:22px;padding:0;line-height:1;border:1px solid var(--tl-line);
  border-radius:6px;background:var(--tl-sunken);color:var(--tl-accent);font:inherit;font-size:12px;cursor:pointer}
.tglp-favbtn:hover,.tglp-favbtn:focus{background:var(--tl-hit);border-color:var(--tl-accent);outline:none}
/* 多目标输入框最右边的「清空」：跟输入框同高，弱化成次级按钮 */
.tglp-clearbtn{flex:none;box-sizing:border-box;height:27px;padding:0 9px;border:1px solid var(--tl-line);
  border-radius:6px;background:var(--tl-sunken);color:var(--tl-mute);font:inherit;font-size:11px;
  line-height:1;cursor:pointer}
.tglp-clearbtn:hover,.tglp-clearbtn:focus{color:var(--tl-fg);border-color:var(--tl-accent);background:var(--tl-hit);outline:none}
.tglp-favpop{position:fixed;z-index:2147483006;width:250px;max-width:calc(100vw - 12px);box-sizing:border-box;
  padding:8px;display:flex;flex-direction:column;gap:6px;background:var(--tl-bg);color:var(--tl-fg);
  border:1px solid var(--tl-line);border-radius:9px;box-shadow:0 12px 36px rgba(0,0,0,.5);
  font:12px/1.5 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif}
.tglp-favhead{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:0 2px;
  color:var(--tl-accent-fg);font-size:11px;font-weight:600}
.tglp-favclose{border:0;background:transparent;color:var(--tl-mute);font-size:15px;line-height:1;cursor:pointer;padding:0 3px}
.tglp-favclose:hover{color:var(--tl-fg)}
.tglp-favpop input[type=text]{box-sizing:border-box;width:100%;padding:4px 7px;border-radius:6px;
  border:1px solid var(--tl-line);background:var(--tl-sunken);color:var(--tl-fg);font:inherit;font-size:12px;outline:none}
.tglp-favpop input[type=text]:focus{border-color:var(--tl-accent)}
.tglp-favpoplist{display:flex;flex-direction:column;gap:2px;max-height:230px;overflow-y:auto}
.tglp-favrow{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 8px 5px 10px;
  border-radius:5px;background:var(--tl-sunken2);border:1px solid transparent;cursor:pointer}
.tglp-favrow:hover{background:var(--tl-hit);border-color:var(--tl-line)}
.tglp-favrow.tglp-on{outline:1px solid var(--tl-accent);color:var(--tl-accent-fg);background:var(--tl-hit)}
.tglp-favname{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tglp-favid{flex:none;color:var(--tl-mute);font-size:10px;font-variant-numeric:tabular-nums}
.tglp-favempty{color:var(--tl-mute);font-size:11px;padding:10px 4px;text-align:center;line-height:1.6}
.tglp-favfoot{display:flex;align-items:center;justify-content:space-between;gap:6px;color:var(--tl-mute);
  font-size:10px;border-top:1px solid var(--tl-line-soft);padding-top:6px}
.tglp-favfoot span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tglp-favfoot .tglp-btn{flex:none}
/* 角色名候选：挂在 body 上的 fixed 浮层，避免被面板 overflow 裁掉 */
.tglp-sug{position:fixed;z-index:2147483005;width:236px;max-height:264px;overflow-y:auto;box-sizing:border-box;
  padding:4px;background:var(--tl-bg);color:var(--tl-fg);border:1px solid var(--tl-line);border-radius:8px;
  box-shadow:0 10px 32px rgba(0,0,0,.5);font:12px/1.5 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif}
.tglp-sughead{padding:3px 6px 5px;color:var(--tl-dim);font-size:10px;border-bottom:1px solid var(--tl-line-soft);margin-bottom:3px}
.tglp-sugrow{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:4px 6px;border-radius:5px;cursor:pointer}
.tglp-sugrow:hover,.tglp-sugrow.tglp-sugon{background:var(--tl-hit);color:var(--tl-accent-fg)}
.tglp-sugname{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tglp-sugid{flex:none;color:var(--tl-mute);font-size:10px;font-variant-numeric:tabular-nums}
/* 圣殿置顶 / 置底：这个角色你没有塔，选它不会生效 */
.tglp-sugtag{flex:none;padding:0 4px;border-radius:999px;background:var(--tl-sunken2);color:var(--tl-mute);
  font-size:9px;line-height:14px}
.tglp-sugmiss .tglp-sugname{color:var(--tl-mute)}
.tglp-sugempty{padding:6px;color:var(--tl-mute);font-size:11px;line-height:1.5}
/* 工具箱胶囊收进 bgm 右下角工具条（#dock）的开关：图标跟工具条文字色，收起时变淡。
   #dock ul 是 flex，所以 li 也照站点的写法用 flex，别用 float/block，否则和旁边的图标对不齐 */
#dock .tglp-dockitem{display:flex;align-items:center;margin:0;padding:0;list-style:none}
#tglp-docksw{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;
  background:none;border:0;color:inherit;opacity:.6;cursor:pointer;text-decoration:none;
  transition:opacity .15s,color .15s}
#tglp-docksw:hover{opacity:1}
#tglp-docksw.tglp-off{opacity:.3}
#tglp-docksw.tglp-on{opacity:1;color:var(--tl-accent)}
#tglp-fab{position:fixed;right:18px;bottom:86px;z-index:2147483000;padding:8px 14px;border:0;border-radius:999px;
  background:var(--tl-accent);color:#fff;font:600 13px/1.4 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;
  box-shadow:0 6px 18px rgba(228,111,161,.38);cursor:grab;opacity:.92;transition:transform .15s,opacity .15s;
  touch-action:none;user-select:none}
#tglp-fab.tglp-dragging{cursor:grabbing;opacity:1}
#tglp-fab:hover{transform:translateY(-2px);opacity:1}
/* 收起来时靠 !important 压过上面的 opacity / transition，别留个半透明的影子 */
#tglp-fab[hidden]{display:none!important}
#tglp-panel{position:fixed;right:18px;bottom:132px;z-index:2147483001;width:430px;max-width:calc(100vw - 24px);
  max-height:76vh;display:flex;flex-direction:column;background:var(--tl-bg);color:var(--tl-fg);border-radius:12px;
  box-shadow:0 18px 50px rgba(0,0,0,.45);font:13px/1.5 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;
  overflow:hidden;border:1px solid var(--tl-line-soft)}
#tglp-panel[hidden]{display:none}
#tglp-panel.tglp-dragging{box-shadow:0 24px 64px rgba(0,0,0,.6);cursor:grabbing}
.tglp-head{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;padding:10px 14px 6px;
  cursor:move;user-select:none;touch-action:none}
.tglp-title{font-size:13px;font-weight:600;color:var(--tl-accent-fg);letter-spacing:.02em}
.tglp-close{background:none;border:0;color:var(--tl-dim);font-size:18px;line-height:1;cursor:pointer;padding:0 2px}
.tglp-headtools{display:flex;align-items:center;gap:6px}
.tglp-ico{background:none;border:1px solid transparent;color:var(--tl-dim);font-size:14px;line-height:1;cursor:pointer;padding:2px 5px;border-radius:5px}
.tglp-ico:hover{background:var(--tl-surface);color:var(--tl-fg)}
.tglp-close:hover{color:#fff}
/* 标签栏可横向滑动：加了多少个功能都不撑大面板，窄屏也能左右滑到最后一个。
   flex:0 0 auto 很关键：面板高度到 max-height 时，默认 flex-shrink 会把标签栏
   一起压扁，选中标签的高亮块就会被裁掉半个（道具页内容一多就出现）。 */
.tglp-tabbar{flex:0 0 auto;display:flex;gap:4px;padding:0 12px 8px;border-bottom:1px solid var(--tl-line-soft);
  flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;scrollbar-width:thin;overscroll-behavior-x:contain}
.tglp-tabbar::-webkit-scrollbar{height:4px}
.tglp-tabbar::-webkit-scrollbar-thumb{background:var(--tl-line);border-radius:2px}
.tglp-tabbar::-webkit-scrollbar-track{background:transparent}
.tglp-tab{flex:0 0 auto;min-width:46px;padding:6px 5px;border-radius:6px;border:1px solid transparent;background:transparent;color:var(--tl-dim);
  font:inherit;font-size:12px;cursor:pointer;white-space:nowrap}
.tglp-tab:hover{color:var(--tl-fg)}
.tglp-tab.tglp-on{background:rgba(228,111,161,.16);border-color:rgba(228,111,161,.45);color:var(--tl-accent-fg);font-weight:600}
.tglp-subtab{flex:1;background:var(--tl-sunken);border:1px solid var(--tl-line);color:var(--tl-dim)}
.tglp-subtab.tglp-on{background:var(--tl-accent);border-color:var(--tl-accent);color:#fff;font-weight:600}
/* 一键冲星「结束补资」：补满 / 补到 250 / 不补 */
.tglp-endwrap{flex:1;min-width:0;max-width:230px}
.tglp-endwrap .tglp-subtab{display:inline-flex;align-items:center;justify-content:center;
  height:24px;padding:0 6px;border-radius:6px;font-size:11px;line-height:1}
/* 「圣殿」页：每行 4 / 5 / 6 个的分段按钮 */
.tglp-colname{color:var(--tl-accent-fg);font-size:12px;font-weight:600;white-space:nowrap}
.tglp-inline.tglp-cols{gap:5px;flex:none}
.tglp-inline.tglp-cols .tglp-subtab{flex:none;display:inline-flex;align-items:center;justify-content:center;
  width:44px;min-width:44px;height:24px;padding:0;border-radius:6px;font-size:11px;line-height:1}
.tglp-colunit{font-style:normal;color:var(--tl-mute);font-size:11px}
.tglp-body{flex:1 1 auto;min-height:0;padding:12px 14px 14px;overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;gap:9px}
.tglp-view{display:flex;flex-direction:column;gap:9px}
.tglp-view[hidden]{display:none}
.tglp-line{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
/* 账本明细的四个筛选挤在一行：不换行，下拉自己缩，标签不压缩 */
#tglp-panel .tglp-logfilter{flex-wrap:nowrap;gap:6px}
#tglp-panel .tglp-logfilter .tglp-label{flex:none;font-size:12px}
#tglp-panel .tglp-logfilter select{flex:1 1 auto;min-width:0;max-width:none;font-size:12px;padding:2px 4px}
.tglp-label{color:var(--tl-dim);font-size:12px;white-space:nowrap}
.tglp-dash{color:var(--tl-mute)}
#tglp-panel input[type=text],#tglp-panel input[type=search],#tglp-panel input[type=number],#tglp-panel select,#tglp-panel textarea{
  box-sizing:border-box;padding:5px 8px;border-radius:6px;border:1px solid var(--tl-line);background:var(--tl-sunken);color:var(--tl-fg);
  font:inherit;font-size:12px}
#tglp-panel input[type=number]{width:76px}
#tglp-thr{width:84px!important}
#tglp-user,#tglp-fchars,#tglp-holdsearch{flex:1;min-width:120px}
/* 用户名框挪到「塔图」那一行：整组靠右，和左边的勾选框拉开一点距离 */
.tglp-userwrap{display:flex;align-items:center;gap:6px;flex:1;min-width:150px;margin-left:10px}
#tglp-user{min-width:80px}
/* 筛选条件右边的勾选：没有文字，只占一个方框 */
.tglp-chkend{gap:0;margin-left:-2px}
#tglp-favadd{width:96px}
/* 手动添加：隐藏 type=search 自带的清除按钮；Chrome 一旦自动填充，用守卫动画立即清掉 */
#tglp-favadd::-webkit-search-cancel-button,#tglp-favadd::-webkit-search-decoration{-webkit-appearance:none;display:none}
#tglp-favadd:-webkit-autofill,#tglp-favadd:-webkit-autofill:hover,#tglp-favadd:-webkit-autofill:focus{
  box-shadow:0 0 0 1000px var(--tl-sunken) inset;-webkit-text-fill-color:var(--tl-fg);
  animation:tglp-autofill-guard .001s linear}
@keyframes tglp-autofill-guard{from{outline-color:transparent}to{outline-color:transparent}}
#tglp-lvmin,#tglp-lvmax,#tglp-minamt{width:64px!important}
#tglp-chars{width:100%;resize:vertical}
#tglp-panel select{max-width:150px}
.tglp-tabs{display:flex;gap:6px}
.tglp-ctx[hidden]{display:none}
/* 角色列表下面的「只筛自己圣殿」：贴着输入框，别跳出去 */
.tglp-ctxchk{margin-top:5px}
/* 筛塔行里的「定位」：自己的塔才有，小图钉贴在角色名右边 */
.tglp-locbtn{flex:none;width:16px;height:16px;padding:0;border:0;border-radius:4px;background:transparent;
  color:var(--tl-mute);display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
.tglp-locbtn svg{display:block}
.tglp-locbtn:hover,.tglp-locbtn:focus{color:var(--tl-accent);background:var(--tl-hit);outline:none}
/* 已定位的那几座：图钉变粉，再点一下取消 */
.tglp-locbtn.on{color:#e46fa1;background:rgba(228,111,161,.12)}
.tglp-locbtn.on:hover,.tglp-locbtn.on:focus{background:rgba(228,111,161,.22)}
.tglp-actions{justify-content:flex-start}
.tglp-btn{padding:6px 14px;border-radius:6px;border:1px solid var(--tl-line);background:var(--tl-surface2);color:var(--tl-fg2);font:inherit;
  font-size:12px;cursor:pointer}
.tglp-btn:disabled{opacity:.45;cursor:default}
.tglp-btn:hover{background:var(--tl-surface3)}
.tglp-primary{background:var(--tl-accent);border-color:var(--tl-accent);color:#fff;font-weight:600}
.tglp-primary:disabled{opacity:.55;cursor:default}
.tglp-chk{display:flex;align-items:center;gap:4px;color:var(--tl-dim);font-size:12px;cursor:pointer}
/* 一键每日任务：一行一项，勾选框 + 名称 + 灰色配置摘要 */
.tglp-dailyrow{width:100%;gap:8px}
.tglp-dailyrow b{flex:none;min-width:52px;font-weight:600;color:var(--tl-fg)}
.tglp-dailydesc{flex:1;min-width:0;color:var(--tl-dim);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tglp-subtab.tglp-off{opacity:.45;cursor:not-allowed}
/* 「导入小圣杯收藏」的粘贴兜底区 */
.tglp-importbox{display:flex;flex-direction:column;gap:6px;padding:7px 8px;
  border:1px dashed var(--tl-line);border-radius:8px;background:var(--tl-sunken)}
.tglp-importbox[hidden]{display:none}
.tglp-importbox textarea{width:100%;box-sizing:border-box;resize:vertical}
.tglp-importbox .tglp-actions{margin:0}
.tglp-chk input[type=checkbox]{width:13px;height:13px;accent-color:var(--tl-accent);cursor:pointer;margin:0}
.tglp-chkline{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
/* 两个勾选框并排靠左（不用 space-between 把后一个推到面板最右边） */
.tglp-chkline.tglp-chknear{justify-content:flex-start;gap:18px}
.tglp-inline{display:flex;align-items:center;gap:4px;color:var(--tl-mute);font-size:11px}
.tglp-inline[hidden]{display:none}
.tglp-inline input[type="date"]{font:inherit;color:var(--tl-text);background:var(--tl-sunken);
  border:1px solid var(--tl-line);border-radius:6px;padding:1px 4px;min-width:0;width:7.6em}
/* 一键冲星按钮右边的「预计消耗活股」：跟着按钮走，不许把按钮挤换行 */
.tglp-estimate{flex:1;min-width:0;justify-content:flex-start;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tglp-inline i{font-style:normal}
.tglp-inline input{width:62px;background:var(--tl-sunken2);border:1px solid var(--tl-line);color:var(--tl-fg);border-radius:5px;padding:3px 5px;font-size:12px;text-align:center;outline:none}
.tglp-inline input:focus{border-color:var(--tl-accent)}
.tglp-stat{color:var(--tl-dim);font-size:12px;min-height:18px}
.tglp-stat .tglp-loginlink{color:var(--tl-link);text-decoration:underline;text-underline-offset:2px;white-space:nowrap}
.tglp-list{display:flex;flex-direction:column;gap:2px}
.tglp-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 8px;border-radius:6px;
  background:var(--tl-surface)}
.tglp-row.tglp-hit{background:var(--tl-hit)}
.tglp-main{display:flex;flex-direction:column;min-width:0}
.tglp-name{color:var(--tl-link);text-decoration:none;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  /* 只让文字本身可点：不加这句，flex 列里的 <a> 会横向撑满，点行首空白也会跳角色页 */
  align-self:flex-start;max-width:100%}
.tglp-name:hover{text-decoration:underline}
.tglp-namerow{display:flex;align-items:center;gap:4px;min-width:0;max-width:100%}
.tglp-sub{color:var(--tl-dim);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tglp-val{font-variant-numeric:tabular-nums;color:var(--tl-fg2);white-space:nowrap;font-size:12px}
.tglp-val b{color:var(--tl-hl);font-weight:600}
.tglp-empty{color:var(--tl-dim);text-align:center;padding:18px 0;font-size:12px}
#tglp-panel [hidden]{display:none!important}
.tglp-kv{color:var(--tl-dim);font-size:11px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tglp-kv b{color:var(--tl-hl);font-weight:600;font-variant-numeric:tabular-nums}
.tglp-kv i{font-style:normal;color:var(--tl-mute)}
.tglp-x{border:0;background:transparent;color:var(--tl-mute);font-size:16px;line-height:1;cursor:pointer;padding:2px 6px;border-radius:4px}
.tglp-x:hover{background:var(--tl-line-soft);color:#ff9ab8}
.tglp-favpick{min-height:26px}
.tglp-favpick .tglp-btn{padding:3px 10px;font-size:12px}
.tglp-danger{background:#7a2d3a;border-color:#9c3a4a;color:#ffd7df}
.tglp-danger:hover{background:#8d3444}
.tglp-note{color:var(--tl-mute);font-size:11px;line-height:1.6;background:var(--tl-sunken2);border-radius:6px;padding:6px 8px}
.tglp-preview{color:var(--tl-dim);font-size:11px}
.tglp-sumwrap{display:flex;flex-direction:column;gap:6px}
.tglp-sum{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.tglp-sumcell{background:var(--tl-surface);border-radius:6px;padding:6px 8px;display:flex;flex-direction:column;gap:1px;min-width:0}
.tglp-sumcell i{font-style:normal;color:var(--tl-dim);font-size:11px}
.tglp-sumcell b{font-size:12px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tglp-sumcell span{color:var(--tl-mute);font-size:10px}
.tglp-up{color:var(--tl-up)}
.tglp-down{color:var(--tl-down)}
/* 星之力数值：≥1 万紫 / 有值黄 / 0 灰（和旧版圣殿卡上的三个档一致） */
.tglp-starhi{color:#c084fc}
.tglp-starmid{color:#e0a82e}
.tglp-starlow{color:var(--tl-dim)}
.tglp-dual{display:flex;gap:8px;justify-content:flex-end;min-width:104px}
.tglp-dual b{color:var(--tl-up);font-weight:600}
.tglp-dual span{color:var(--tl-down)}
/* 资产卡 */
.tglp-asset{background:var(--tl-surface);border-radius:8px;padding:8px 10px 6px;display:flex;flex-direction:column;gap:4px}
.tglp-assettop{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.tglp-assetcell{display:flex;flex-direction:column;gap:1px;min-width:0}
.tglp-assetcell i{font-style:normal;color:var(--tl-dim);font-size:10px}
.tglp-assetcell b{font-size:12px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tglp-sparkwrap{width:100%;height:38px;overflow:hidden}
.tglp-spark{width:100%;height:38px;display:block}
.tglp-spark-area{opacity:.13;stroke:none}
.tglp-spark-line{fill:none;stroke-width:1.6;stroke-linejoin:round;stroke-linecap:round}
.tglp-sparkempty{color:var(--tl-mute);font-size:11px;line-height:38px;text-align:center}
.tglp-assetfoot{display:flex;justify-content:space-between;align-items:center;color:var(--tl-dim);font-size:11px;gap:8px}
.tglp-assetfoot b{font-variant-numeric:tabular-nums;white-space:nowrap}
/* 资金 / 股数 / 圣殿 视角切换 */
.tglp-seg{display:flex;gap:4px;background:var(--tl-sunken);border-radius:7px;padding:3px}
.tglp-segbtn{flex:1;padding:5px 0;border:0;border-radius:5px;background:transparent;color:var(--tl-dim);font-size:12px;cursor:pointer}
.tglp-segbtn:hover{color:var(--tl-fg)}
.tglp-segbtn.tglp-on{background:rgba(228,111,161,.2);color:var(--tl-accent-fg);font-weight:600}
/* 四象限明细 */
.tglp-flowgrid{display:flex;flex-direction:column;gap:6px}
.tglp-flowblk{background:var(--tl-surface);border-radius:7px;padding:6px 8px;display:flex;flex-direction:column;gap:3px}
.tglp-flowhead{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--tl-dim);padding-bottom:3px;border-bottom:1px solid var(--tl-line-soft)}
.tglp-flowhead span{flex:1}
.tglp-flowhead b{font-size:12px;font-variant-numeric:tabular-nums}
.tglp-flowhead i{font-style:normal;color:var(--tl-mute);font-size:10px}
.tglp-flowrow{display:flex;align-items:center;gap:6px;font-size:11px;height:17px}
.tglp-flowrow.tglp-wide .tglp-flowname{width:104px}
.tglp-flowname{width:62px;flex:none;color:var(--tl-fg2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tglp-hasdetail{cursor:help;border-bottom:1px dotted var(--tl-mute)}
.tglp-flowbar{flex:1;height:5px;background:var(--tl-line-soft);border-radius:3px;overflow:hidden;min-width:20px}
.tglp-flowbar i{display:block;height:100%;border-radius:3px}
.tglp-flowbar i.up{background:#5fa878}
.tglp-flowbar i.down{background:#5f7fa8}
.tglp-flowval{width:62px;flex:none;text-align:right;font-variant-numeric:tabular-nums;color:var(--tl-fg);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tglp-flown{width:34px;flex:none;text-align:right;color:var(--tl-mute);font-size:10px}
.tglp-flowempty{color:var(--tl-mute);font-size:11px;padding:2px 0}
.tglp-flownote{color:var(--tl-mute);font-size:10px;line-height:1.5;padding-top:3px;border-top:1px dashed var(--tl-line-soft);margin-top:2px}
.tglp-blocktitle{color:var(--tl-dim);font-size:11px;font-weight:600;padding:2px 2px 0}
/* 一键冲星 */
.tglp-starbox{margin-top:10px;padding-top:10px;border-top:1px dashed var(--tl-line-soft);display:flex;flex-direction:column;gap:6px}
/* 星光碎片候选列表（按持股排序，不再按等级分组） */
.tglp-sdlist{display:flex;flex-direction:column;gap:2px;max-height:236px;overflow-y:auto;padding-right:2px}
.tglp-sdrow{display:flex;align-items:center;gap:8px;padding:5px 6px;border-radius:5px;background:var(--tl-sunken2);cursor:pointer}
.tglp-sdrow:hover{background:var(--tl-surface3)}
.tglp-sdrow.tglp-on{outline:1px solid var(--tl-accent);background:var(--tl-surface2)}
/* 已在燃料队列里：序号 + 移出，用粉色底和「无活股」区分开 */
.tglp-mini.tglp-picked{background:var(--tl-accent);border-color:var(--tl-accent);color:#fff;min-width:64px}
.tglp-mini.tglp-picked:hover{filter:brightness(1.1)}
.tglp-sdzero.tglp-on .tglp-mini.tglp-picked{opacity:1}
/* 0 活股的行：能搜到、能看清，但选不了（持股多半全挂了卖单） */
.tglp-sdrow.tglp-sdzero{opacity:.6;cursor:default}
.tglp-sdrow.tglp-sdzero:hover{background:var(--tl-sunken2)}
.tglp-sdmain{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.tglp-sdmain .tglp-name,.tglp-sdmain a{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tglp-mini{padding:3px 9px;font-size:11px;flex:none}
/* ICO：按剩余时间排列，每行一张小卡片 */
.tglp-icolist{display:flex;flex-direction:column;gap:4px;max-height:300px;overflow-y:auto;padding-right:2px}
.tglp-icorow{display:flex;flex-direction:column;gap:3px;padding:6px 8px;border-radius:6px;
  background:var(--tl-sunken2);border:1px solid transparent}
.tglp-icorow.tglp-on{border-color:rgba(228,111,161,.45);background:var(--tl-hit)}
.tglp-icotop{display:flex;align-items:center;justify-content:space-between;gap:8px}
.tglp-icotop .tglp-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}
.tglp-ico-left{flex:none;color:var(--tl-mute);font-size:11px;font-variant-numeric:tabular-nums}
.tglp-icosub{color:var(--tl-dim);font-size:10px;font-variant-numeric:tabular-nums;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* 上一次自动注资的结论（补款成功 / 人数不够 / 错过） */
.tglp-icores{color:var(--tl-mute);font-size:10px;line-height:1.45;word-break:break-all}
.tglp-icoline{display:flex;align-items:center;gap:6px;margin-top:1px}
.tglp-icoline .tglp-mute{color:var(--tl-mute);font-size:11px}
.tglp-icosel{width:74px;padding:3px 6px;font-size:11px}
.tglp-icohint{flex:none;font-size:11px;line-height:1.6;color:var(--tl-accent-fg);white-space:nowrap}
/* 旧版 ICO 页：发行价后面的「上市 LvN」小胶囊 */
.tglp-icolv{display:inline-block;margin-left:6px;padding:0 6px;border-radius:999px;
  background:rgba(228,111,161,.16);border:1px solid rgba(228,111,161,.45);
  color:#c9457d;font-size:11px;line-height:16px;vertical-align:1px;white-space:nowrap}
.tglp-icoline .tglp-btn{margin-left:auto}
.tglp-pick{color:var(--tl-dim);font-size:11px;line-height:1.5;padding:2px;word-break:break-all;
  max-height:96px;overflow-y:auto}
.tglp-picktxt{display:block}
/* 燃料队列：每只一个可取消的小标签（列表里筛不到它时也能移出） */
.tglp-sdpicks{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px;align-items:center}
.tglp-sdpick{display:inline-flex;align-items:center;gap:3px;max-width:100%;padding:1px 2px 1px 6px;
  border:1px solid var(--tl-line);border-radius:9px;background:var(--tl-surface2);color:var(--tl-fg2);font-size:10px;white-space:nowrap}
.tglp-sdpick>span{overflow:hidden;text-overflow:ellipsis;max-width:112px}
.tglp-sdpick-x{width:16px;height:16px;line-height:14px;text-align:center;border:0;border-radius:8px;
  background:transparent;color:var(--tl-mute);font-size:13px;cursor:pointer;padding:0}
.tglp-sdpick-x:hover{background:var(--tl-badbg);color:var(--tl-bad)}
.tglp-sdpick-clear{border:0;background:transparent;color:var(--tl-link);font-size:10px;cursor:pointer;padding:1px 3px}
.tglp-sdpick-clear:hover{text-decoration:underline}
/* 目标塔那一行：固定在燃料队列上方，替代原来空队列时的提示语 */
.tglp-picktxt.tglp-sdtline{color:var(--tl-fg);font-variant-numeric:tabular-nums}
.tglp-sdsort{min-width:52px;justify-content:center}
/* 「充能」右边的预计固资：跟着按钮一行，不换行、不挤压按钮 */
.tglp-sdest{flex:none;color:var(--tl-accent-fg);font-size:11px;font-variant-numeric:tabular-nums;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px}
/* 持股等级进度 */
.tglp-lv{display:flex;align-items:center;gap:6px;margin-top:3px}
.tglp-lvbar{flex:1;height:3px;background:var(--tl-bar);border-radius:2px;overflow:hidden;min-width:30px}
.tglp-lvbar i{display:block;height:100%;background:var(--tl-accent);border-radius:2px}
.tglp-lvtxt{flex:none;color:var(--tl-mute);font-size:10px;font-variant-numeric:tabular-nums}
.tglp-logbox{display:flex;flex-direction:column;gap:3px;max-height:190px;overflow-y:auto;font-size:12px;padding-right:2px}
.tglp-log{padding:3px 6px;border-radius:4px;background:var(--tl-sunken2)}
.tglp-log-info{color:var(--tl-dim)}
.tglp-log-ok{color:var(--tl-up);background:var(--tl-okbg)}
.tglp-log-fail{color:var(--tl-bad);background:var(--tl-badbg)}
.tglp-log-warn{color:var(--tl-warn)}
.tglp-log-sum{color:var(--tl-accent-fg);background:var(--tl-hit);font-weight:600}
@media (max-width:520px){
  #tglp-panel{right:12px;left:12px;width:calc(100vw - 24px);bottom:120px}
  .tglp-tabbar{gap:2px;padding:0 8px 8px}
  .tglp-tab{font-size:11px;padding:6px 2px;min-width:46px}
  #tglp-fab{right:12px;bottom:76px}
}
#tglp-panel[data-theme="light"] .tglp-btn:hover{background:var(--tl-surface3)}
#tglp-panel[data-theme="light"] .tglp-close:hover{color:var(--tl-fg)}
#tglp-panel[data-theme="light"] .tglp-danger{background:#f7dfe5;border-color:#e3b4c1;color:#a83349}
#tglp-panel[data-theme="light"] .tglp-danger:hover{background:#f2d2da}
/* ===== v2.0：收藏夹分组 / 同步 / 角色页星星（v2.2 改为全部同级） ===== */
.tglp-favfolder{box-sizing:border-box;width:100%;padding:4px 7px;border-radius:6px;
  border:1px solid var(--tl-line);background:var(--tl-sunken);color:var(--tl-fg);font:inherit;font-size:12px;outline:none}
.tglp-favfolder:focus{border-color:var(--tl-accent)}
/* 收藏夹分组条：左侧强调色竖条 + 更深底色 + 右侧计数，
   与角色行拉开层次，扫长列表时不会把「夹名」和「角色名」看混 */
.tglp-favgrp{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:6px;
  margin:6px 0 2px;padding:4px 8px 4px 7px;border-radius:5px;border-left:3px solid var(--tl-accent);
  background:var(--tl-surface2);color:var(--tl-accent-fg);
  font-size:11px;font-weight:700;letter-spacing:.02em;line-height:1.45}
.tglp-favgrp:first-child{margin-top:0}
.tglp-favgrp i{flex:none;font-style:normal;color:var(--tl-mute);font-size:10px;font-weight:400;
  font-variant-numeric:tabular-nums}
/* 收藏夹一律用标签列（每个标签可点开「移到别的收藏夹」，多夹时各带一个 ×） */
.tglp-fchips{display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-top:4px}
.tglp-fchips i{color:var(--tl-mute);font-style:normal;font-size:11px}
.tglp-fchip{display:inline-flex;align-items:center;gap:1px;padding:1px 2px 1px 1px;border:1px solid var(--tl-line);
  border-radius:999px;background:var(--tl-sunken);color:var(--tl-fg2);font-size:11px;line-height:1.55}
.tglp-fchipx{border:0;background:transparent;color:var(--tl-mute);font:inherit;font-size:12px;line-height:1;
  padding:0 3px;cursor:pointer;border-radius:50%}
.tglp-fchipx:hover{color:var(--tl-bad);background:var(--tl-badbg)}
/* 标签列末尾的「＋」：再收藏到别的收藏夹（虚线描边，和实体夹标签区分开） */
.tglp-fchipadd{flex:none;display:inline-flex;align-items:center;justify-content:center;height:20px;
  padding:0 7px;border:1px dashed var(--tl-line);border-radius:999px;background:transparent;
  color:var(--tl-mute);font:inherit;font-size:12px;line-height:1;cursor:pointer}
.tglp-fchipadd:hover,.tglp-fchipadd:focus{color:var(--tl-accent-fg);border-color:var(--tl-accent);
  background:var(--tl-hit);outline:none}
/* 标签文字本身是按钮：点开「移到别的收藏夹」小下拉 */
.tglp-fchiplabel{border:0;background:transparent;color:inherit;font:inherit;font-size:11px;line-height:1.55;
  max-width:128px;padding:0 3px 0 6px;cursor:pointer;border-radius:999px;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tglp-fchiplabel:hover{color:var(--tl-accent-fg)}
.tglp-fchiplabel:focus-visible{outline:1px solid var(--tl-accent);outline-offset:1px}
.tglp-movepop{position:fixed;z-index:2147483006;width:186px;max-width:calc(100vw - 12px);box-sizing:border-box;
  padding:6px;display:flex;flex-direction:column;gap:4px;background:var(--tl-bg);color:var(--tl-fg);
  border:1px solid var(--tl-line);border-radius:8px;box-shadow:0 12px 36px rgba(0,0,0,.5);
  font:12px/1.5 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif}
.tglp-movehead{padding:1px 4px 5px;color:var(--tl-dim);font-size:10px;line-height:1.5;
  border-bottom:1px solid var(--tl-line-soft)}
.tglp-movelist{display:flex;flex-direction:column;gap:2px;max-height:198px;overflow-y:auto}
.tglp-moverow{text-align:left;padding:4px 8px;border:0;border-radius:5px;background:var(--tl-sunken2);
  color:var(--tl-fg);font:inherit;font-size:12px;cursor:pointer;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tglp-moverow:hover,.tglp-moverow:focus{background:var(--tl-hit);color:var(--tl-accent-fg);outline:none}
.tglp-moveempty{padding:6px 4px;color:var(--tl-mute);font-size:11px;text-align:center;line-height:1.6}
/* 面板底部的小提示条：收藏成功之类的轻反馈，不放状态行里打扰读数 */
.tglp-toast{position:absolute;left:50%;bottom:16px;z-index:9;transform:translate(-50%,8px);
  padding:4px 12px;border-radius:999px;background:var(--tl-accent);color:#fff;font-size:11px;
  line-height:1.6;white-space:nowrap;box-shadow:0 6px 18px rgba(0,0,0,.35);
  opacity:0;pointer-events:none;transition:opacity .16s ease,transform .16s ease}
.tglp-toast.tglp-toast-on{opacity:1;transform:translate(-50%,0)}
/* 个人页圣殿置顶：开关、顺序列表、卡片上的悬浮胶囊、轻提示 */
.tglp-sep{height:1px;background:var(--tl-line);margin:1px 0}
.tglp-pinline{justify-content:space-between}
.tglp-pintoggle{flex:none;height:24px;padding:0 12px;border-radius:999px;border:1px solid var(--tl-accent);
  background:var(--tl-accent);color:#fff;font:inherit;font-size:11px;line-height:1;cursor:pointer}
.tglp-pintoggle.tglp-off{background:var(--tl-sunken);border-color:var(--tl-line);color:var(--tl-mute)}
.tglp-pinlist{display:flex;flex-direction:column;gap:3px;max-height:320px;overflow-y:auto}
.tglp-pinlist:empty{display:none}
.tglp-pinrow{display:flex;align-items:center;gap:5px;padding:1px 4px;border:1px solid var(--tl-line);
  border-radius:6px;background:var(--tl-surface);min-height:22px}
.tglp-pinrow.tglp-pindragging{opacity:.4}
.tglp-pinrow.tglp-drop-before{border-top-color:var(--tl-accent);box-shadow:inset 0 2px 0 var(--tl-accent)}
.tglp-pinrow.tglp-drop-after{border-bottom-color:var(--tl-accent);box-shadow:inset 0 -2px 0 var(--tl-accent)}
.tglp-pinno{flex:none;width:13px;text-align:center;color:var(--tl-mute);font-size:10px}
.tglp-pinmain{flex:1 1 auto;min-width:0;display:flex;align-items:center;overflow:hidden}
.tglp-pinmain .tglp-name{font-size:12px;line-height:1.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tglp-pinactions{flex:none;display:flex;align-items:center;gap:2px}
.tglp-grip{width:17px;height:17px;padding:0;display:inline-flex;align-items:center;justify-content:center;
  border:1px solid var(--tl-line);border-radius:4px;background:var(--tl-sunken);color:var(--tl-mute);
  font:10px/1 -apple-system,"Segoe UI",Arial,sans-serif;letter-spacing:-1px;
  cursor:grab;touch-action:none;-webkit-user-select:none;user-select:none}
.tglp-grip:hover{color:var(--tl-accent-fg);border-color:rgba(228,111,161,.6);background:rgba(228,111,161,.12)}
.tglp-grip:active{cursor:grabbing}
.tglp-pinactions .tglp-mini{width:17px;height:17px;padding:0;display:inline-flex;align-items:center;
  justify-content:center;font-size:11px;line-height:1;border-radius:4px;
  border:1px solid rgba(228,111,161,.45);background:rgba(228,111,161,.14);color:var(--tl-accent-fg)}
.tglp-pinactions .tglp-mini:hover:enabled{background:var(--tl-accent);border-color:var(--tl-accent);color:#fff}
.tglp-pinactions .tglp-mini:disabled{opacity:.38;border-color:var(--tl-line);background:var(--tl-sunken);color:var(--tl-mute)}
.tglp-pinactions .tglp-mini-x:hover:enabled{background:var(--tl-bad);border-color:var(--tl-bad);color:#fff}
.tglp-mini-x:hover{color:var(--tl-bad);background:var(--tl-badbg)}
/* 个人页圣殿置底：平时收成一行，点开才展开配置 */
.tglp-secthead{display:flex;align-items:center;gap:6px;width:100%;padding:2px 0;border:0;background:none;
  color:inherit;font:inherit;text-align:left;cursor:pointer}
.tglp-secthead:hover .tglp-caret,.tglp-secthead:focus-visible .tglp-caret{color:var(--tl-accent-fg)}
.tglp-secthead:focus{outline:none}
.tglp-caret{flex:none;width:12px;color:var(--tl-mute);font-size:10px;line-height:1;transition:transform .12s ease}
.tglp-sectcount{margin-left:auto;color:var(--tl-mute);font-size:11px;white-space:nowrap}
.tglp-sectbody{display:flex;flex-direction:column;gap:6px;padding:6px 0 2px}
.tglp-sectbody[hidden]{display:none}
.tglp-botrow{cursor:default}
.tglp-botx{flex:none;height:18px;padding:0 7px;border-radius:999px;border:1px solid rgba(228,111,161,.45);
  background:rgba(228,111,161,.12);color:var(--tl-accent-fg);font:inherit;font-size:10px;line-height:1;cursor:pointer}
.tglp-botx:hover{background:var(--tl-bad);border-color:var(--tl-bad);color:#fff}
/* 卡片上的置顶按钮：样式写在行内，并随卡片所在文档单独注入（见 PIN_CSS） */
.tglp-pintoast{position:fixed;left:50%;top:18px;z-index:2147483000;transform:translate(-50%,-6px);
  padding:5px 14px;border-radius:999px;background:var(--tl-accent);color:#fff;font-size:12px;
  line-height:1.7;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,.32);
  opacity:0;pointer-events:none;transition:opacity .16s ease,transform .16s ease}
.tglp-pintoast.tglp-toast-on{opacity:1;transform:translate(-50%,0)}
/* 随手记：标题栏的书本按钮 + 整页记事纸 */
.tglp-notebtn{display:inline-flex;align-items:center;justify-content:center}
.tglp-notebtn.tglp-on{background:rgba(228,111,161,.16);border-color:rgba(228,111,161,.45);color:var(--tl-accent-fg)}
.tglp-noteview{flex:1 1 auto;min-height:260px;display:flex;flex-direction:column;gap:6px;padding:10px 12px 12px}
.tglp-noteview[hidden]{display:none}
#tglp-panel .tglp-notebody{flex:1 1 auto;min-height:150px;width:100%;resize:none;padding:8px 10px;
  border:1px solid var(--tl-line);border-radius:8px;background:var(--tl-sunken);color:var(--tl-fg);
  font-size:13px;line-height:1.75;outline:none}
#tglp-panel .tglp-notebody:focus{border-color:var(--tl-accent)}
#tglp-panel .tglp-notebody::placeholder{color:var(--tl-mute)}
.tglp-notefoot{flex:0 0 auto;display:flex;align-items:center;gap:6px;color:var(--tl-mute);font-size:11px}
.tglp-notefoot .tglp-spacer{flex:1;min-width:2px}
.tglp-notefoot .tglp-btn{flex:none;font-size:11px;padding:3px 9px}
.tglp-syncbox{margin:4px 0;padding:6px 8px;border:1px solid var(--tl-line);border-radius:8px;background:var(--tl-sunken)}
.tglp-syncbox summary{cursor:pointer;color:var(--tl-accent-fg);font-size:12px;font-weight:500;outline:none}
.tglp-syncbox[open] summary{margin-bottom:6px}
.tglp-syncbox textarea{box-sizing:border-box;width:100%;resize:vertical;min-height:52px;margin-top:4px;
  padding:5px 7px;border-radius:6px;border:1px solid var(--tl-line);background:var(--tl-sunken);
  color:var(--tl-fg);font:11px/1.45 ui-monospace,Menlo,Consolas,monospace;outline:none}
.tglp-syncbox textarea:focus{border-color:var(--tl-accent)}
.tglp-syncbox .tglp-stat{margin:2px 0 6px}
.tglp-syncbox .tglp-line{margin:3px 0}
#tglp-star{position:fixed;right:12px;bottom:12px;z-index:2147483002;width:24px;height:24px;padding:0;
  border-radius:50%;border:1px solid var(--tl-line);background:var(--tl-bg);color:var(--tl-mute);
  font-size:14px;line-height:22px;text-align:center;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,.22)}
#tglp-star:hover{border-color:var(--tl-accent);color:var(--tl-accent)}
#tglp-star.tglp-star-on{color:#f5b73d;border-color:#e6a72c;background:#3a2c14;text-shadow:0 0 8px rgba(245,183,61,.6)}
#tglp-star[data-theme="light"].tglp-star-on{background:#fff3d6;color:#b8790d;border-color:#e0a938}
.tglp-starpop{position:fixed;z-index:2147483007;width:240px;max-width:calc(100vw - 12px);box-sizing:border-box;
  padding:8px;display:flex;flex-direction:column;gap:6px;background:var(--tl-bg);color:var(--tl-fg);
  border:1px solid var(--tl-line);border-radius:9px;box-shadow:0 12px 36px rgba(0,0,0,.5);
  font:12px/1.5 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif}
.tglp-starpop .tglp-favpoplist{max-height:210px}
.tglp-starpop,.tglp-favpop{max-height:calc(100vh - 12px);overflow-y:auto}
.tglp-starpop .tglp-line input,.tglp-starpop .tglp-line select{min-width:0;flex:1}
.tglp-startip{color:var(--tl-dim);font-size:11px}
.tglp-starcreate{padding-top:6px;border-top:1px solid var(--tl-line-soft);display:flex;flex-direction:column;gap:4px}
.tglp-starremove{width:100%;margin-top:4px}
/* 星标浮层：取消在最左、确定在最右，左右对称 */
.tglp-starpop .tglp-starfoot{justify-content:space-between;gap:6px;padding-top:6px;
  border-top:1px solid var(--tl-line-soft)}
.tglp-starpop .tglp-starfoot .tglp-btn{flex:none;min-width:56px}
.tglp-starpop .tglp-starcreate .tglp-line{gap:5px}
/* 收藏页：所有按钮同一规格、标签定宽，散落的操作收进整齐的工具行 */
#tglp-panel .tglp-favtools .tglp-line{gap:6px;flex-wrap:nowrap}
#tglp-panel .tglp-favtools .tglp-allowwrap{flex-wrap:wrap}
#tglp-panel .tglp-favtools .tglp-label{flex:none;min-width:48px}
#tglp-panel .tglp-favtools .tglp-spacer{flex:1;min-width:2px}
#tglp-panel .tglp-favtools .tglp-btn{
  flex:none;padding:4px 9px;min-height:26px;font-size:11px;font-weight:400;line-height:1.35;
  border:1px solid var(--tl-line);border-radius:6px;background:var(--tl-surface);color:var(--tl-fg2)}
#tglp-panel .tglp-favtools .tglp-btn:hover{border-color:var(--tl-accent);color:var(--tl-accent-fg);background:var(--tl-hit)}
#tglp-panel .tglp-favtools .tglp-btn.tglp-primary{
  font-weight:400;color:var(--tl-accent-fg);background:var(--tl-surface);border-color:rgba(228,111,161,.45)}
#tglp-panel .tglp-favtools .tglp-btn.tglp-danger,
#tglp-panel[data-theme="light"] .tglp-favtools .tglp-btn.tglp-danger{
  font-weight:400;color:var(--tl-bad);background:var(--tl-surface);border-color:var(--tl-line)}
#tglp-panel .tglp-favtools .tglp-btn.tglp-danger:hover{border-color:var(--tl-bad)}
#tglp-panel .tglp-favtools select{flex:1;min-width:0;max-width:none}
/* 收藏夹 / 排序两个下拉等宽，视觉上才对得齐（这两个 select 只有 id，没有 class） */
#tglp-panel .tglp-favtools #tglp-favfolder,
#tglp-panel .tglp-favtools #tglp-favsort{flex:0 0 138px;width:138px;max-width:138px}
/* 手动添加：输入框占大头，右边「加到哪个夹」收窄 */
#tglp-panel .tglp-favtools .tglp-favaddline input[type=text],
#tglp-panel .tglp-favtools .tglp-favaddline input[type=search]{flex:1 1 auto;min-width:0;width:auto}
#tglp-panel .tglp-favtools .tglp-favaddline #tglp-favaddfolder{flex:0 0 104px;width:104px;max-width:104px}
#tglp-panel .tglp-favtools input[type=text]{flex:1;min-width:0;width:auto}
#tglp-panel .tglp-favtools .tglp-syncbox .tglp-line{flex-wrap:wrap}
#tglp-panel .tglp-favtools .tglp-syncbox select{flex:none;width:auto;max-width:190px}
#tglp-panel .tglp-favtools .tglp-syncbox input[type=text]{flex:1;min-width:120px}
#tglp-panel .tglp-favtools .tglp-favpick .tglp-btn{padding:4px 9px;font-size:11px}
/* 角色收藏浮层：给 input/select 补组件样式消掉浏览器默认黑框，按钮不再实心加粗 */
.tglp-starpop input[type=text],.tglp-starpop select{
  box-sizing:border-box;min-width:0;flex:1;padding:4px 7px;border-radius:6px;
  border:1px solid var(--tl-line);background:var(--tl-sunken);color:var(--tl-fg);
  font:inherit;font-size:11px;outline:none}
.tglp-starpop input[type=text]:focus,.tglp-starpop select:focus{border-color:var(--tl-accent)}
.tglp-starpop .tglp-favhead{font-size:11px;font-weight:400;color:var(--tl-dim)}
.tglp-starpop .tglp-favhead span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tglp-starpop .tglp-favrow.tglp-on{outline:1px solid rgba(228,111,161,.4);background:var(--tl-surface3)}
.tglp-starpop .tglp-btn,.tglp-starpop .tglp-btn.tglp-primary,
.tglp-starpop .tglp-btn.tglp-danger,.tglp-starpop .tglp-btn.tglp-starremove{
  padding:5px 10px;font-size:11px;font-weight:400;border-radius:6px;
  border:1px solid var(--tl-line);background:var(--tl-surface);color:var(--tl-fg2)}
.tglp-starpop .tglp-btn:hover{border-color:var(--tl-accent);color:var(--tl-accent-fg);background:var(--tl-hit)}
.tglp-starpop .tglp-btn.tglp-primary{color:var(--tl-accent-fg);border-color:rgba(228,111,161,.45)}
.tglp-starpop .tglp-starremove,.tglp-starpop .tglp-starremove:hover{color:var(--tl-bad);background:transparent}
.tglp-starpop .tglp-starremove:hover{border-color:var(--tl-bad)}
/* 旧版角色页「$」历史交易浮层 */
.tglp-histpop{position:fixed;z-index:2147483007;width:432px;max-width:calc(100vw - 12px);box-sizing:border-box;
  padding:8px;display:flex;flex-direction:column;gap:6px;background:var(--tl-bg);color:var(--tl-fg);
  border:1px solid var(--tl-line);border-radius:9px;box-shadow:0 12px 36px rgba(0,0,0,.5);
  font:12px/1.5 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif}
.tglp-histpop .tglp-favhead{font-size:11px;font-weight:400;color:var(--tl-dim)}
.tglp-histpop .tglp-favhead span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tglp-histsum{color:var(--tl-dim);font-size:10px;font-variant-numeric:tabular-nums}
.tglp-histlist{display:flex;flex-direction:column;max-height:46vh;overflow-y:auto;box-sizing:border-box;
  border:1px solid var(--tl-line-soft);border-radius:6px}
.tglp-histrow{display:grid;grid-template-columns:86px 1fr 1fr 1fr;gap:6px;align-items:center;
  padding:4px 8px;border-bottom:1px solid var(--tl-line-soft);font-variant-numeric:tabular-nums}
.tglp-histrow:last-child{border-bottom:0}
.tglp-histrow i{font-style:normal;text-align:right;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tglp-histrow i:first-child{text-align:left;color:var(--tl-fg2)}
.tglp-histrow:not(.tglp-histhd):hover{background:var(--tl-hit)}
.tglp-histhd{position:sticky;top:0;z-index:1;background:var(--tl-sunken2);color:var(--tl-mute);
  font-size:10px;font-weight:600;border-bottom:1px solid var(--tl-line)}
.tglp-histempty{color:var(--tl-mute);font-size:11px;padding:16px 8px;text-align:center}
.tglp-histfoot{display:flex;align-items:center;justify-content:space-between;gap:8px;
  border-top:1px solid var(--tl-line-soft);padding-top:6px}
.tglp-histstat{color:var(--tl-mute);font-size:10px}
.tglp-histpop .tglp-btn{flex:none;padding:4px 10px;font-size:11px;font-weight:400;line-height:1.35;
  border:1px solid var(--tl-line);border-radius:6px;background:var(--tl-surface);color:var(--tl-fg2);cursor:pointer}
.tglp-histpop .tglp-btn:hover:enabled{border-color:var(--tl-accent);color:var(--tl-accent-fg);background:var(--tl-hit)}
.tglp-histpop .tglp-btn:disabled{opacity:.45;cursor:default}
/* 页面居中的弹窗（股权拍卖用大弹窗；往期拍卖用下面的紧凑居中版） */
.tglp-histpop.tglp-gxmodal{position:fixed !important;left:50% !important;top:50% !important;
  transform:translate(-50%,-50%);width:820px;max-width:calc(100vw - 32px);max-height:86vh;
  z-index:2147483010;padding:12px 14px;gap:8px;font-size:13px;border-radius:12px;
  overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.55)}
/* 往期拍卖：水平居中 + 顶部钉住，保持 432px 紧凑长度。
   不能用 translateY(-50%) 做垂直居中：那样浮层高度随每周数据量变化，
   标题栏、列头、「前一周 / 后一周」会跟着上下跑，翻周时得不停换地方点。
   现在顶部固定，数据变多只向下延长；列表吃到上限后自己内部滚动，
   列头是 sticky，永远停在原位。 */
.tglp-histpop.tglp-gxcenter{position:fixed !important;left:50% !important;
  top:calc(50% - 170px) !important;right:auto !important;bottom:auto !important;
  transform:translateX(-50%);
  z-index:2147483010;max-height:calc(50vh + 154px);
  display:flex;flex-direction:column;overflow:hidden;
  box-shadow:0 20px 52px rgba(0,0,0,.5)}
/* 标题栏 / 汇总 / 页脚高度恒定，不参与伸缩；汇总强制单行，长文案也不把列头挤下去 */
.tglp-histpop.tglp-gxcenter > :not(.tglp-histlist){flex:none}
.tglp-histpop.tglp-gxcenter .tglp-histsum{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* 列表按内容自然长高（数据少就短、数据多向下长），触到浮层上限后内部滚动 */
.tglp-histpop.tglp-gxcenter .tglp-histlist{flex:0 1 auto;min-height:120px;max-height:none;overflow-y:auto}
.tglp-histpop.tglp-gxmodal.tglp-gxbid{width:465px}
.tglp-gxmodal .tglp-favhead{font-size:13px;gap:10px;align-items:center;min-height:24px}
.tglp-gxmodal .tglp-gxheadtitle{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;
  white-space:nowrap;color:var(--tl-fg)}
.tglp-gxheadright{display:flex;align-items:center;gap:4px;flex:none}
.tglp-gxmodal .tglp-gxnav{padding:2px 8px !important;font-size:11px !important;line-height:1.4 !important}
.tglp-gxmodal .tglp-favclose{font-size:18px;padding:0 6px}
.tglp-gxmodal .tglp-histlist{max-height:56vh}
.tglp-gxmodal .tglp-histrow{padding:6px 10px;font-size:12.5px}
.tglp-gxmodal .tglp-histsum{font-size:12px;color:var(--tl-fg2)}
.tglp-gxmodal .tglp-gxfoot{justify-content:flex-start;gap:10px;border-top:0;padding-top:0}
/* 股权拍卖：标签行 + 输入行（大号输入框） */
.tglp-gxlabels{display:grid;grid-template-columns:1fr 1fr auto;gap:10px;color:var(--tl-mute);font-size:12px}
.tglp-gxlabels .tglp-gxsum{text-align:right;color:var(--tl-fg2);font-size:12px;font-variant-numeric:tabular-nums}
.tglp-gxrow{display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:center}
.tglp-gxrow input{width:100%;height:38px;box-sizing:border-box;padding:0 10px;font-size:15px;
  border:1px solid var(--tl-line);border-radius:8px;background:var(--tl-surface);color:var(--tl-fg);
  font-variant-numeric:tabular-nums}
.tglp-gxrow input:focus{outline:none;border-color:var(--tl-accent)}
.tglp-gxrow .tglp-gxok{height:38px;padding:0 26px;font-size:14px;font-weight:600}
.tglp-gxbid .tglp-gxquick{font-size:13px;gap:16px;padding:2px 2px 7px}
.tglp-gxbid .tglp-gxmsg{padding-top:2px}
/* 竞拍浮层底部：取消竞拍 / 提示 / 右下角「数量降低提醒」 */
.tglp-gxfoot .tglp-gxmsg{flex:1 1 auto;min-width:0}
.tglp-gxwarn{margin-left:auto;flex:none;display:inline-flex;align-items:center;gap:4px;
  color:var(--tl-mute);font-size:11px;line-height:1.4;cursor:pointer;user-select:none;white-space:nowrap}
.tglp-gxwarn input{margin:0;width:12px;height:12px;cursor:pointer;accent-color:#d4568e}

#tglp-panel{--tl-text:var(--tl-fg)}
`;

  /* ============ v1.3.0 覆盖样式：单行顶栏 / 基础信息卡 / 可拖动图表卡片 / 详细数据表 ============
   * 追加在原 CSS 之后。沿用 --tl-* 主题变量，日夜模式自动适配。
   */
  const CSS_EXTRA = `
/* ---- 个性化面板里的入口按钮 ---- */
.tglp-entry{padding:2px 0}
.tglp-entry-h{font-weight:600;font-size:14px;color:var(--tl-fg,#333);margin-bottom:4px}
.tglp-entry-d{font-size:12px;color:var(--tl-dim,#888);line-height:1.6;margin-bottom:12px}
.tglp-entry-btn{display:inline-block;padding:7px 20px;border:0;border-radius:6px;cursor:pointer;
  background:#2b8fd6;color:#fff;font-size:13px;font-weight:500}
.tglp-entry-btn:hover{background:#1f7cbd}
.tglp-entry-m{margin-top:10px;font-size:11px;color:var(--tl-mute,#999)}

/* ---- 全屏面板：顶栏 + 主体 ---- */
#tglp-panel{inset:0!important;right:0!important;bottom:0!important;left:0!important;top:0!important;
  width:100vw!important;max-width:none!important;height:100vh!important;max-height:none!important;
  border-radius:0!important;border:0!important;display:flex!important;flex-direction:column}
/* 关键：上面的 display:flex!important 会覆盖 [hidden] 的 display:none，面板「关着」时仍占满全屏挡点击 */
#tglp-panel[hidden]{display:none!important}
#tglp-panel .tglp-head{display:none!important}          /* 旧标题栏不再使用，标题并入顶栏 */
#tglp-panel .tglp-body{padding:0!important;flex:1 1 auto;min-height:0;overflow:hidden;
  display:flex;flex-direction:column}

/* ---- 顶栏：范围 / 统计 / 复制 / 视角 全在一行 ---- */
.tglp-topbar{flex:0 0 auto;display:flex;align-items:center;gap:8px;flex-wrap:wrap;
  padding:7px 14px;border-bottom:1px solid var(--tl-line-soft);background:var(--tl-surface)}
.tglp-brand{font-size:13px;font-weight:650;color:var(--tl-fg);white-space:nowrap;margin-right:2px}
.tglp-user{font-size:11px;color:var(--tl-dim);max-width:150px;overflow:hidden;text-overflow:ellipsis;
  white-space:nowrap;margin-right:4px}
.tglp-topbar{position:relative}
.tglp-acctbtn{height:24px;padding:0 8px;border:1px solid var(--tl-line-soft);border-radius:6px;
  background:var(--tl-surface);color:var(--tl-dim);font:inherit;font-size:11px;cursor:pointer}
.tglp-acctbtn:hover{color:var(--tl-accent)}
.tglp-acctmenu{position:absolute;top:calc(100% + 6px);left:8px;z-index:30;width:300px;
  background:var(--tl-surface);border:1px solid var(--tl-line-soft);border-radius:10px;
  box-shadow:0 10px 28px rgba(0,0,0,.2);padding:8px;color:var(--tl-fg2)}
.tglp-acctmenu[hidden]{display:none}
.tglp-acct-title{font-size:11px;color:var(--tl-dim);padding:4px 6px 6px;font-weight:600}
.tglp-acct-row{display:flex;align-items:center;gap:8px;padding:6px;border-radius:8px}
.tglp-acct-row.tglp-on{background:var(--tl-sunken2)}
.tglp-acct-name{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}
.tglp-acct-meta{font-size:11px;color:var(--tl-dim);white-space:nowrap}
.tglp-acct-del{flex:0 0 auto;border:1px solid var(--tl-line-soft);background:transparent;color:var(--tl-dim);
  border-radius:6px;font-size:11px;padding:2px 8px;cursor:pointer}
.tglp-acct-del:hover{color:var(--tl-down,#c0392b);border-color:var(--tl-down,#c0392b)}
.tglp-acct-empty,.tglp-acct-tip{font-size:11px;color:var(--tl-dim);padding:6px}
.tglp-acct-tip{border-top:1px solid var(--tl-line-soft);margin-top:6px}
.tglp-topbar .tglp-line{margin:0;gap:5px}
.tglp-topbar .tglp-label{font-size:11px;color:var(--tl-dim);white-space:nowrap}
.tglp-topbar select,.tglp-topbar input[type=date]{height:25px;padding:0 5px;font-size:12px;border-radius:5px}
.tglp-topbar .tglp-btn{height:27px;padding:0 12px;font-size:12px}
.tglp-topbar .tglp-inline{gap:4px}
.tglp-topbar .tglp-inline input[type=date]{width:118px}
/* 视角切换：紧凑分段控件 */
.tglp-topbar .tglp-seg{display:inline-flex;background:var(--tl-sunken2);border:1px solid var(--tl-line-soft);
  border-radius:7px;padding:2px;gap:2px;margin:0}
.tglp-topbar .tglp-segbtn{padding:3px 14px;font-size:12px;border:0;border-radius:5px;background:transparent;
  color:var(--tl-dim);cursor:pointer;font:inherit;font-size:12px;white-space:nowrap}
.tglp-topbar .tglp-segbtn:hover{color:var(--tl-fg)}
.tglp-topbar .tglp-segbtn.tglp-on{background:var(--tl-accent);color:var(--tl-accent-fg,#fff);font-weight:600}
.tglp-topbar .tglp-actions{margin-left:auto;gap:6px}

/* ---- 主体滚动区 ---- */
.tglp-main{flex:1 1 auto;min-height:0;overflow:auto;display:flex;flex-direction:column;
  gap:9px;padding:10px 14px 14px}

/* ---- 基础信息卡：一张卡装下所有基础数据 ---- */
.tglp-profile{flex:0 0 auto;display:flex;align-items:stretch;gap:0;
  background:var(--tl-surface);border:1px solid var(--tl-line-soft);border-radius:9px;padding:8px 2px}
.tglp-pcell{flex:1 1 0;min-width:0;padding:0 11px;border-left:1px solid var(--tl-line-soft)}
.tglp-pcell:first-child{border-left:0}
.tglp-plabel{font-size:10px;color:var(--tl-dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tglp-pval{font-size:15px;font-weight:650;line-height:1.35;color:var(--tl-fg);font-variant-numeric:tabular-nums;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tglp-psub{font-size:9px;color:var(--tl-mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

/* ---- 图表区：固定两列（左：基础数据 + 明细图 / 右：资产走势 + 月度趋势），整体可折叠 ---- */
.tglp-chartbar{position:relative;flex:0 0 auto;display:flex;align-items:center;height:15px;margin-bottom:1px}
.tglp-chartbar b{font-size:11px;font-weight:600;color:var(--tl-fg2)}
.tglp-chartbar .tglp-cbtns{margin-left:auto;display:flex;gap:6px}
.tglp-cbtn{height:15px;padding:0 7px;border:1px solid var(--tl-line);border-radius:4px;background:var(--tl-surface);
  color:var(--tl-dim);font:inherit;font-size:10px;line-height:1;cursor:pointer}
.tglp-cbtn:hover{border-color:var(--tl-accent);color:var(--tl-accent)}
/* 图表区总高固定：右列两张卡各占一半，加起来正好等于图表区高度 */
.tglp-charts{flex:0 0 auto;display:grid;grid-template-columns:minmax(320px,58%) 1fr;
  gap:9px;align-items:stretch;height:188px}
/* 卡片高度跟着内容走（用户参考图就是这种），不再统一拉成固定高度 */
.tglp-charts[hidden]{display:none!important}
/* 左列：基础数据卡（缩窄、按内容高）+ 资金支出/收入并排（固定高度，不拉高） */
.tglp-col-l{display:flex;flex-direction:column;gap:8px;min-height:0}
/* 基础数据卡：47px（= 右列 192 - 支出卡 137 - 间隙 8），8 项横排一行 */
.tglp-col-l > .tglp-card-profile{flex:0 0 auto;width:100%;height:47px;overflow:hidden}
.tglp-col-l .tglp-pair{flex:0 0 auto;display:flex;gap:8px}
.tglp-col-l .tglp-pair > .tglp-chartcard{flex:1 1 0;min-width:0;height:137px}
/* 右列：资产走势 + 月度收支趋势，各占一半 → 两卡总高 = 左列总高 */
.tglp-col-r{display:grid;grid-template-rows:80px 100px;gap:8px;min-height:0}
.tglp-col-r .tglp-chartcard{min-height:0}
/* 支出/收入卡：内容放不下就滚，但不显示滚动条 */
.tglp-chartcard .tglp-cc-body{overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none}
.tglp-chartcard .tglp-cc-body::-webkit-scrollbar{width:0;height:0;display:none}
/* 资产走势 / 月度趋势：不滚动，直接按卡片高度缩图 */
.tglp-col-r .tglp-cc-body{overflow:hidden}
/* 股数视图：删掉资产走势，右列两张排行卡并排拉满；左列股数卡填满剩余 */
.tglp-charts.tglp-stock-view .tglp-col-r{display:flex;flex-direction:column;min-height:0}
.tglp-charts.tglp-stock-view .tglp-col-r .tglp-pair{flex:1 1 auto;display:flex;gap:8px;min-height:0}
.tglp-charts.tglp-stock-view .tglp-col-r .tglp-pair > .tglp-chartcard{flex:1 1 0;min-width:0}
.tglp-charts.tglp-stock-view .tglp-col-r .tglp-cc-body{overflow-y:auto}
.tglp-charts.tglp-stock-view .tglp-col-l .tglp-pair{flex:1 1 0;min-height:0}
.tglp-charts.tglp-stock-view .tglp-col-l .tglp-pair > .tglp-chartcard{height:100%;min-height:0}
/* 圣殿视图：删掉资产走势，右列道标日志拉满 */
.tglp-charts.tglp-fixed-view .tglp-col-r{display:flex;flex-direction:column;min-height:0}
.tglp-charts.tglp-fixed-view .tglp-col-r > .tglp-chartcard{flex:1 1 auto;min-height:0}
.tglp-charts.tglp-star-view .tglp-col-r{display:flex;flex-direction:column;min-height:0}
.tglp-charts.tglp-star-view .tglp-col-r > .tglp-chartcard{flex:1 1 auto;min-height:0}
.tglp-charts.tglp-star-view .tglp-col-r .tglp-cc-body{overflow-y:auto}
.tglp-starwrap{display:inline-flex;align-items:center;gap:4px}
.tglp-starwrap[hidden]{display:none}
.tglp-starcustom{width:64px;height:24px;padding:0 6px;font-size:11px;border:1px solid var(--tl-line);border-radius:5px;background:var(--tl-surface);color:var(--tl-fg)}
.tglp-starsep{color:var(--tl-mute);font-size:11px}
.tglp-chartwrap.tglp-chartwrap-pair{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.tglp-charthead{display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:10px;color:var(--tl-dim);padding:0 0 3px}
.tglp-charthead b{color:var(--tl-fg2);font-weight:500}
.tglp-guidehits{display:flex;flex-direction:column;gap:0}
.tglp-guidehit{display:flex;align-items:flex-start;gap:8px;font-size:11px;color:var(--tl-dim);padding:4px 0;border-bottom:1px solid var(--tl-line-soft)}
.tglp-gh-time{width:62px;flex:none;color:var(--tl-mute);font-variant-numeric:tabular-nums;font-size:10px;padding-top:1px}
.tglp-gh-desc{flex:1;min-width:0;white-space:normal;line-height:1.4;color:var(--tl-fg2);word-break:break-all}
.tglp-gh-val{width:72px;flex:none;text-align:right;padding-right:24px;color:var(--tl-down);font-variant-numeric:tabular-nums}
.tglp-charts.tglp-fixed-view .tglp-col-r .tglp-cc-body{overflow-y:auto}
.tglp-cc-extra{flex:none;font-size:10px;color:var(--tl-mute);white-space:nowrap}
.tglp-pager .tglp-pagesize{height:28px;min-height:28px;line-height:1.2;padding:3px 20px 3px 7px;font-size:12px;box-sizing:border-box;vertical-align:middle}
.tglp-chartcard{background:var(--tl-surface);border:1px solid var(--tl-line-soft);border-radius:9px;
  display:flex;flex-direction:column;min-width:0;overflow:hidden}
.tglp-cc-head{display:flex;align-items:center;gap:5px;padding:5px 9px;
  border-bottom:1px solid var(--tl-line-soft);user-select:none;background:var(--tl-sunken2);flex:0 0 auto}
.tglp-cc-title{flex:1;min-width:0;font-size:11px;font-weight:600;color:var(--tl-fg);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tglp-cc-btn{width:19px;height:19px;flex:none;border:0;border-radius:4px;background:transparent;
  color:var(--tl-mute);cursor:pointer;font:inherit;font-size:12px;line-height:1;padding:0}
.tglp-cc-btn:hover{background:var(--tl-hit);color:var(--tl-accent)}
.tglp-cc-body{padding:5px 9px 7px;flex:1 1 auto;min-height:0;overflow:auto}
.tglp-cc-empty{color:var(--tl-mute);font-size:11px;text-align:center;padding:10px 0}
/* 基础数据小卡：2 列 × 4 行，别再撑满一整条 */
.tglp-card-profile .tglp-cc-body{overflow:hidden}
.tglp-chartcard .tglp-profile{display:grid;grid-template-columns:1fr 1fr;gap:3px 12px;
  padding:0;border:0;background:transparent;border-radius:0}
.tglp-chartcard .tglp-pcell{padding:0;border-left:0;min-width:0}
.tglp-chartcard .tglp-plabel{font-size:8.5px;margin-bottom:1px}
.tglp-chartcard .tglp-pval{font-size:12px;line-height:1.15}
.tglp-chartcard .tglp-psub{display:none}
.tglp-card-profile{flex:1 1 auto;min-height:0}
.tglp-card-profile .tglp-cc-head{display:none}
.tglp-card-profile .tglp-cc-body{padding:4px 9px;display:flex;align-items:center}
.tglp-card-profile .tglp-profile{grid-template-columns:repeat(8,1fr);gap:0 8px;width:100%;align-content:center}
/* 资产走势：折线撑满卡片高度 */
.tglp-chartcard[data-chart="asset"] .tglp-cc-body{display:flex;flex-direction:column}
.tglp-chartcard[data-chart="asset"] .tglp-sparkwrap{height:44px;min-height:0;flex:none}
.tglp-chartcard[data-chart="asset"] .tglp-spark{height:100%}
/* 月度趋势柱状图也尽量占满 */
.tglp-chartcard[data-chart="monthly"] .tglp-cc-body{display:flex;flex-direction:column}
.tglp-chartcard[data-chart="monthly"] .tglp-mbars{height:58px;min-height:0;flex:none}
/* 数值后面的次数 */
.tglp-chcnt{font-style:normal;color:var(--tl-mute);font-weight:400;font-size:10px}
/* ---- 图表内部（沿用原类，微调紧凑度） ---- */
.tglp-charthead{display:flex;align-items:baseline;justify-content:space-between;gap:8px;font-size:11px;
  color:var(--tl-fg2);padding-bottom:3px;border-bottom:1px solid var(--tl-line-soft)}
.tglp-charthead b{font-weight:600;color:var(--tl-fg)}
.tglp-charthead2{margin-top:6px}
.tglp-chartwrap{display:flex;flex-direction:column;gap:3px;padding:2px 0}
.tglp-chrow{display:flex;align-items:center;gap:6px;font-size:11px;min-height:17px}
.tglp-chlab{width:58px;flex:none;color:var(--tl-dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tglp-chtrack{flex:1;height:7px;background:var(--tl-line-soft);border-radius:4px;overflow:hidden;min-width:20px}
.tglp-chbar{display:block;height:100%;border-radius:4px;opacity:.85;transition:width .25s}
.tglp-chval{width:118px;flex:none;display:grid;grid-template-columns:62px 44px;column-gap:6px;align-items:baseline;white-space:nowrap;font-variant-numeric:tabular-nums;color:var(--tl-fg);font-weight:500;font-size:11px}
.tglp-chamt{text-align:right;overflow:hidden;text-overflow:ellipsis}
.tglp-chcnt{text-align:right;color:var(--tl-mute);font-style:normal;font-weight:400}
.tglp-chempty{color:var(--tl-mute);font-size:11px;text-align:center;padding:8px 0}
.tglp-donutwrap{display:flex;align-items:center;gap:12px;padding:4px 0;flex-wrap:wrap}
.tglp-donut{width:96px;height:96px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center}
.tglp-donuthole{width:58px;height:58px;border-radius:50%;background:var(--tl-surface);display:flex;
  flex-direction:column;align-items:center;justify-content:center;gap:1px}
.tglp-donuthole b{font-size:12px;font-variant-numeric:tabular-nums;color:var(--tl-fg)}
.tglp-donuthole i{font-style:normal;font-size:9px;color:var(--tl-mute)}
.tglp-legend{flex:1;min-width:120px;display:grid;grid-template-columns:1fr 1fr;gap:2px 9px}
.tglp-legendrow{display:flex;align-items:center;gap:4px;font-size:10px;color:var(--tl-dim);white-space:nowrap;overflow:hidden}
.tglp-legendrow i{width:7px;height:7px;border-radius:2px;flex:none}
.tglp-legendrow span{flex:1;overflow:hidden;text-overflow:ellipsis}
.tglp-legendrow b{font-variant-numeric:tabular-nums;color:var(--tl-fg2);font-weight:500}
.tglp-legendrow .tglp-lpct{width:38px;flex:none;text-align:right}
.tglp-legendrow .tglp-lcnt{width:42px;flex:none;text-align:right;color:var(--tl-mute);font-style:normal;font-weight:400}
.tglp-mbars{display:flex;align-items:flex-end;gap:3px;height:84px;padding-top:3px;overflow-x:auto;
  overflow-y:hidden;scrollbar-width:none;-ms-overflow-style:none}
.tglp-mbars::-webkit-scrollbar{height:0;display:none}
.tglp-mcol{flex:1 0 11px;min-width:11px;max-width:24px;height:100%;display:flex;flex-direction:column;
  justify-content:center;align-items:center;gap:1px}
.tglp-mup,.tglp-mdown{flex:1;width:100%;display:flex;align-items:flex-end;justify-content:center}
.tglp-mup i{width:100%;background:var(--tl-up);opacity:.8;border-radius:2px 2px 0 0;min-height:2px}
.tglp-mdown{flex-direction:column;justify-content:flex-start}
.tglp-mdown i{width:100%;background:#5f7fa8;opacity:.8;border-radius:0 0 2px 2px;min-height:2px}
.tglp-mlab{font-size:8px;color:var(--tl-mute);white-space:nowrap}
.tglp-mlegend{display:flex;gap:12px;justify-content:center;font-size:10px;color:var(--tl-dim);padding-top:3px}
.tglp-mlegend span{display:inline-flex;align-items:center;gap:3px}
.tglp-mlegend i{width:7px;height:7px;border-radius:2px}
.tglp-mlegend i.tglp-up{background:var(--tl-up)}
.tglp-mlegend i.tglp-down{background:#5f7fa8}
.tglp-mlegend i.tglp-netdown{background:#9aa0a6}
.tglp-mbars-net .tglp-mup i{background:var(--tl-up)}
.tglp-mbars-net .tglp-mdown i{background:#9aa0a6}
/* 四象限块（放进卡片后去掉外层留白） */
.tglp-chartcard .tglp-flowgrid{display:flex;flex-direction:column;gap:8px}
.tglp-chartcard .tglp-flowblk{background:transparent;border:0;padding:0}
.tglp-flowrow.tglp-clickable{cursor:pointer;border-radius:3px;padding:0 2px;margin:0 -2px}
.tglp-flowrow.tglp-clickable:hover{background:var(--tl-hit)}
.tglp-flowrow.tglp-picked{background:rgba(228,111,161,.16);box-shadow:inset 2px 0 0 var(--tl-accent)}

/* ---- 下方：详细数据表 ---- */
.tglp-tablewrap{flex:1 1 auto;display:flex;flex-direction:column;gap:6px;min-height:280px}
.tglp-tablebar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.tglp-tablebar .tglp-stat{font-size:11px}
.tglp-tablebar .tglp-line{margin:0;gap:5px}
.tglp-tablebar .tglp-label{font-size:11px}
.tglp-tablebar select{height:25px;padding:0 5px;font-size:12px;border-radius:5px}
.tglp-table{width:100%;border-collapse:collapse;font-size:12px;table-layout:fixed}
.tglp-table th,.tglp-table td{padding:6px 10px;text-align:left;border-bottom:1px solid var(--tl-line-soft)}
.tglp-table th{position:sticky;top:0;z-index:2;background:var(--tl-sunken2);color:var(--tl-dim);font-weight:600;
  font-size:11px;white-space:nowrap;cursor:pointer;user-select:none}
.tglp-table th.tglp-nosort{cursor:default}
.tglp-table th:hover:not(.tglp-nosort){color:var(--tl-accent)}
.tglp-table td{color:var(--tl-fg2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tglp-table th.tglp-num,.tglp-table td.tglp-num{text-align:right;font-variant-numeric:tabular-nums}
.tglp-up{color:var(--tl-up)}
.tglp-down{color:var(--tl-down)}
.tglp-table td.tglp-up{color:var(--tl-up)}
.tglp-table td.tglp-down{color:var(--tl-down)}
.tglp-table tbody tr:hover{background:var(--tl-hit)}
.tglp-table .tglp-split{border-left:1px solid var(--tl-line)}
.tglp-table .tglp-gap{padding-right:14px}
.tglp-table .tglp-gap-r{padding-right:18px}
.tglp-table .tglp-gap-l{padding-left:20px}
.tglp-table .tglp-gap-r2{padding-right:36px}
.tglp-table .tglp-rowlink,.tglp-table .tglp-name{color:var(--tl-accent);text-decoration:none}
.tglp-table .tglp-name:hover{text-decoration:underline}
.tglp-table .tglp-rowlink:hover{text-decoration:underline}
.tglp-tablescroll{flex:1 1 auto;min-height:160px;overflow:auto;scrollbar-gutter:stable;border:1px solid var(--tl-line-soft);border-radius:8px}
/* 分页器 */
.tglp-pager{flex:0 0 auto;display:flex;align-items:center;justify-content:center;gap:5px;flex-wrap:wrap;padding:4px 0}
.tglp-pager button{min-width:28px;height:26px;padding:0 7px;border:1px solid var(--tl-line);border-radius:5px;
  background:var(--tl-surface);color:var(--tl-fg);font:inherit;font-size:12px;cursor:pointer}
.tglp-pager button:hover:not(:disabled){border-color:var(--tl-accent);color:var(--tl-accent)}
.tglp-pager button:disabled{opacity:.4;cursor:default}
.tglp-pager button.tglp-on{background:var(--tl-accent);color:var(--tl-accent-fg,#fff);border-color:var(--tl-accent)}
.tglp-pager .tglp-pg-info{font-size:11px;color:var(--tl-dim);margin-left:6px}

/* ---- 窄屏回退 ---- */
@media(max-width:900px){
  .tglp-profile{flex-wrap:wrap;gap:6px}
  .tglp-pcell{flex:1 1 30%;border-left:0;padding:2px 8px}
  .tglp-charts{grid-template-columns:1fr}
  .tglp-chartcard.tglp-wide{grid-column:auto}
  .tglp-topbar{padding:6px 10px;gap:6px}
}
`;

  /** 账本窗口日期：带年份，如 2026/11/03 */
  function fmtDay(ms) {
    const d = new Date(num(ms));
    return d.getFullYear() + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' +
      String(d.getDate()).padStart(2, '0');
  }

  /* ============ IndexedDB 长期记忆层 ============
   * 资金日志只增不改，全部存本地数据库。下次打开组件直接从本地渲染（秒开），
   * 点「统计」时只读头部增量（撞上已存记录就停），不再整份重拉。
   * 老浏览器 / file:// 下 IndexedDB 不可用时，退回 localStorage（仅测试/兜底用）。
   */
  const charaLvCache = Object.create(null);
  const favLvCache = Object.create(null);
  const DB_BASE = 'tglp-ledger';
  const DB_VER = 1;
  const LS_FALLBACK = 'tglp:logdb:v1';
  const Store = {
    db: null,
    ready: false,
    dbName: DB_BASE,
    accountKey: '',
    _initP: null,
    _dbName(key) { return key ? DB_BASE + ':' + key : DB_BASE; },
    close() {
      try { if (this.db) this.db.close(); } catch (e) {}
      this.db = null;
      this.ready = false;
      this._initP = null;
    },
    /** 切到某个账号的独立存档库；账号之间互不覆盖，切回来直接复用。 */
    async use(key) {
      const k = String(key || '');
      if (k === this.accountKey) return;
      this.close();
      this.accountKey = k;
      this.dbName = this._dbName(k);
      await this.init();
    },
    async init() {
      if (this.ready) return;
      // 并发调用必须等同一个初始化 Promise。之前用 _initDone 标记，第二个调用者会
      // 立即返回（此时 ready 仍为 false），紧接着的 put 会静默落到 localStorage 回退，
      // 数据量一大就超配额丢掉——压测表现为「前 2000 条写不进去」。
      if (!this._initP) {
        this._initP = (async () => {
          try {
            if (!HWIN.indexedDB) throw new Error('no idb');
            this.db = await Promise.race([
              new Promise((res, rej) => {
                const q = HWIN.indexedDB.open(this.dbName, DB_VER);
                q.onupgradeneeded = () => {
                  const d = q.result;
                  if (!d.objectStoreNames.contains('logs')) d.createObjectStore('logs', { keyPath: 'k' });
                  if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'key' });
                };
                q.onsuccess = () => res(q.result);
                q.onerror = () => rej(q.error || new Error('idb open failed'));
                q.onblocked = () => rej(new Error('idb blocked'));
              }),
              // file:// / 某些隐私模式下 IndexedDB 的 open 既不成功也不失败，挂死 Promise。
              // 给个超时退回 localStorage，别让整个组件永远停在初始化。
              new Promise((_, rej) => setTimeout(() => rej(new Error('idb timeout')), 5000)),
            ]);
            this.ready = true;
          } catch (e) {
            this.db = null;
            this.ready = false;
          }
        })();
      }
      return this._initP;
    },
    _memKey(key) { return LS_FALLBACK + (key ? ':' + key : ''); },
    _memAllOf(key) {
      try { return JSON.parse(HWIN.localStorage.getItem(this._memKey(key)) || '[]') || []; }
      catch (e) { return []; }
    },
    _memAll() { return this._memAllOf(this.accountKey); },
    _memPut(list) {
      try {
        const cur = this._memAll();
        const map = new Map(cur.map((r) => [r.k, r]));
        list.forEach((r) => map.set(r.k, r));
        HWIN.localStorage.setItem(this._memKey(this.accountKey), JSON.stringify([...map.values()]));
      } catch (e) {}
    },
    _memClear() { try { HWIN.localStorage.removeItem(this._memKey(this.accountKey)); } catch (e) {} },
    async all() {
      await this.init();
      if (!this.ready) return this._memAll();
      return new Promise((res) => {
        try {
          const rq = this.db.transaction('logs', 'readonly').objectStore('logs').getAll();
          rq.onsuccess = () => res(rq.result || []);
          rq.onerror = () => res(this._memAll());
        } catch (e) { res(this._memAll()); }
      });
    },
    async put(list) {
      if (!list || !list.length) return;
      await this.init();
      if (!this.ready) return this._memPut(list);
      const CHUNK = 1000;
      for (let i = 0; i < list.length; i += CHUNK) {
        const part = list.slice(i, i + CHUNK);
        await new Promise((res, rej) => {
          try {
            const tx = this.db.transaction('logs', 'readwrite');
            const st = tx.objectStore('logs');
            part.forEach((r) => st.put(r));
            tx.oncomplete = () => res();
            tx.onerror = () => rej(tx.error || new Error('idb put failed'));
            tx.onabort = () => rej(tx.error || new Error('idb put aborted'));
          } catch (e) { rej(e); }
        });
      }
    },
    async clear() {
      await this.init();
      if (!this.ready) return this._memClear();
      // 事务必须同时 scope logs + meta（只开 logs 却访问 meta 会抛 NotFoundError），
      // 并且要等事务真正提交——否则「清空」还没落地，紧接着的写入会被它回滚掉。
      await new Promise((res) => {
        try {
          const tx = this.db.transaction(['logs', 'meta'], 'readwrite');
          tx.objectStore('logs').clear();
          tx.objectStore('meta').clear();
          tx.oncomplete = () => res();
          tx.onerror = () => res();
          tx.onabort = () => res();
        } catch (e) { res(); }
      });
      this._memClear();
    },
    /** 删除某个账号的存档（若删的是当前库，先关闭连接）。 */
    async destroy(key) {
      const k = String(key || '');
      const name = this._dbName(k);
      if (name === this.dbName) this.close();
      try { HWIN.localStorage.removeItem(this._memKey(k)); } catch (e) {}
      if (!HWIN.indexedDB) return true;
      return new Promise((res) => {
        try {
          const q = HWIN.indexedDB.deleteDatabase(name);
          q.onsuccess = () => res(true);
          q.onerror = () => res(false);
          q.onblocked = () => res(false);
        } catch (e) { res(false); }
      });
    },
    /** 某个账号存档的条数（账号管理面板用；打开后立即关闭，不切当前库）。 */
    async countOf(key) {
      const k = String(key || '');
      const mem = this._memAllOf(k).length;
      if (!HWIN.indexedDB) return mem;
      const name = this._dbName(k);
      return new Promise((res) => {
        try {
          const q = HWIN.indexedDB.open(name, DB_VER);
          q.onupgradeneeded = () => {
            const d = q.result;
            if (!d.objectStoreNames.contains('logs')) d.createObjectStore('logs', { keyPath: 'k' });
            if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'key' });
          };
          q.onsuccess = () => {
            const db = q.result;
            const done = (n) => { try { db.close(); } catch (e) {} res(Math.max(n, mem)); };
            try {
              const rq = db.transaction('logs', 'readonly').objectStore('logs').count();
              rq.onsuccess = () => done(Number(rq.result) || 0);
              rq.onerror = () => done(0);
            } catch (e) { done(0); }
          };
          q.onerror = () => res(mem);
          q.onblocked = () => res(mem);
        } catch (e) { res(mem); }
      });
    },
    async getMeta(key, def) {
      await this.init();
      if (!this.ready) return def;
      return new Promise((res) => {
        try {
          const rq = this.db.transaction('meta', 'readonly').objectStore('meta').get(key);
          rq.onsuccess = () => res(rq.result ? rq.result.v : def);
          rq.onerror = () => res(def);
        } catch (e) { res(def); }
      });
    },
    async setMeta(key, val) {
      await this.init();
      if (!this.ready) return;
      return new Promise((res) => {
        try {
          const tx = this.db.transaction('meta', 'readwrite');
          tx.objectStore('meta').put({ key, v: val });
          tx.oncomplete = () => res();
          tx.onerror = () => res();
        } catch (e) { res(); }
      });
    },
  };

  /** 按当前窗口从全量本地记录里筛出统计数据源 */
  /** 统计窗口：支持「全部」 */
  function logRange() {
    if (String(S.logDays) === 'all') return { from: 0, to: 0, days: 0, all: true };
    if (String(S.logDays) === 'custom') {
      const f = parseDayMs(S.logFrom);
      const t = parseDayMs(S.logTo);
      if (f != null || t != null) {
        const from = f != null ? f : t - 6 * 86400000;
        let to = (t != null ? t : from) + 86400000;
        if (to <= from) to = from + 86400000;
        return { from, to, days: Math.round((to - from) / 86400000), custom: true };
      }
    }
    const days = Math.max(1, Math.min(90, Math.floor(num(S.logDays) || 7)));
    return { from: dayStartMs(days - 1), to: dayStartMs(-1), days, custom: false };
  }

  function logRangeLabel(r) {
    const g = r || logRange();
    if (g.all) return '全部记录';
    return g.custom ? `${fmtDay(g.from)} ~ ${fmtDay(g.to - 1)}（${g.days} 天）` : `近 ${g.days} 天`;
  }

  function spanSafe() {
    const w = logWindow;
    if (!w || w.all) return '全部记录';
    return `${fmtDay(w.from)} ~ ${fmtDay(w.to - 1)}`;
  }

  /* ============ 角色名补全：持久化「已尝试」集合，避免每次统计重试退市角色 ============ */
  const META_TRIED_KEY = 'tglp-meta-tried';
  function loadMetaTried() {
    try {
      const raw = localStorage.getItem(META_TRIED_KEY);
      if (raw) (JSON.parse(raw) || []).forEach((id) => metaTried.add(String(id)));
    } catch (e) {}
  }
  function saveMetaTried() {
    try {
      localStorage.setItem(META_TRIED_KEY, JSON.stringify([...metaTried].slice(-20000)));
    } catch (e) {}
  }
  loadMetaTried();

  async function loadNames(ids, force, opts) {
    const always = !!(opts && opts.always);
    const uniq = [...new Set(ids)].filter(Boolean);
    const todo = uniq.filter(
      (id) => force || !nameCache[id] || (!metaTried.has(String(id)) && totalCache[id] === undefined)
    );
    for (let i = 0; i < todo.length; i += 50) {
      if (!busy && !force && !always) return;
      const batch = todo.slice(i, i + 50);
      batch.forEach((id) => metaTried.add(String(id)));
      try {
        const arr = await api('chara/list', {
          method: 'POST', body: JSON.stringify(batch.map(Number)),
        });
        (arr || []).forEach((c) => {
          nameCache[String(c.Id)] = c.Name;
          nameCacheSave();
          if (c.Total !== undefined && c.Total !== null) totalCache[c.Id] = num(c.Total);
          if (c.Level != null) charaLvCache[String(c.Id)] = num(c.Level);
        });
      } catch (e) {}
      saveMetaTried();
      await sleep(20);
    }
  }

  /* ============ 统计结果快照：同一窗口/同批日志不重复聚合 ============ */
  let stSnap = null;
  let clsSnap = null;
  function statsCacheKey() {
    return [
      logWindow ? logWindow.from : 0,
      logWindow ? logWindow.to : 0,
      logAllRaw.length,
      logAllRaw[0] ? logAllRaw[0].k : '',
    ].join('|');
  }
  function cachedLedgerStats() {
    const k = statsCacheKey();
    if (stSnap && stSnap.k === k) return stSnap.v;
    stSnap = { k, v: bucketStats() || ledgerStats() };
    return stSnap.v;
  }
  function cachedLogStats() {
    const k = statsCacheKey();
    if (clsSnap && clsSnap.k === k) return clsSnap.v;
    clsSnap = { k, v: logStats() };
    return clsSnap.v;
  }
  function invalidateStatsCache() { stSnap = null; clsSnap = null; }

  /* ============ 按日聚合桶：跨会话只算新增日志 ============ */
  let statBuckets = null;
  let statBucketsBusy = false;

  function emptyStatBucket() {
    return {
      fundIn: {}, fundOut: {}, stockIn: {}, stockOut: {}, fixedIn: {}, fixedOut: {},
      tax: { sum: 0, n: 0 }, auctionBack: { sum: 0, n: 0 }, buyBack: { sum: 0, n: 0 },
      scratchBuys: 0, hits: {}, cc: 0, ccTs: 0,
    };
  }

  function bucketAdd(map, key, label, val, desc) {
    let r = map[key];
    if (!r) r = map[key] = { key, label, sum: 0, n: 0, samples: [] };
    r.sum += Math.abs(val);
    r.n++;
    if (key === 'other' && r.samples.length < 4 && desc) {
      const s = String(desc).slice(0, 32);
      if (!r.samples.includes(s)) r.samples.push(s);
    }
  }

  function bucketLog(b, x) {
    const desc = x.Description;
    const ch = num(x.Change);
    const rawAmt = x.Amount === undefined || x.Amount === null ? descAmount(desc) : x.Amount;
    const amt = num(rawAmt);
    const kind = classifyKind(desc, amt, ch, x.Type);
    if (kind === 'scratch' && ch < 0) b.scratchBuys++;
    const put = (map, allowed, val) => {
      const k = allowed.includes(kind) ? kind : 'other';
      bucketAdd(map, k, FLOW_LABEL[k] || '其他', val, desc);
    };
    if (ch > 0) {
      if (kind === 'auction') { b.auctionBack.sum += ch; b.auctionBack.n++; }
      else if (kind === 'buy') { b.buyBack.sum += ch; b.buyBack.n++; }
      else put(b.fundIn, FUND_IN_KINDS, ch);
    } else if (ch < 0) {
      if (kind === 'tax' || TAX_RE.test(String(desc || ''))) { b.tax.sum += -ch; b.tax.n++; }
      else put(b.fundOut, FUND_OUT_KINDS, -ch);
    }
    const ds = String(desc || '');
    const isGuideHit = /虚空道标/.test(ds) && !/获得/.test(ds) && /受到|被|你的圣殿/.test(ds);
    const hitOnFixed = isGuideHit && /固定资产/.test(ds);
    const stockPut = (map, allowed, val) => {
      const k = allowed.includes(kind) ? kind : 'other';
      bucketAdd(map, k, FLOW_LABEL[k] || '其他', val, ds);
    };
    if (/星之力/.test(ds)) {
      // 星之力是固资转化，股票口不计
    } else if (isGuideHit) {
      if (!hitOnFixed) {
        const sh = Math.abs(num(x.Amount)) || parseFixedShares(ds);
        if (sh) stockPut(b.stockOut, STOCK_OUT_KINDS, sh);
      }
    } else if (/星光碎片/.test(ds) && /充能/.test(ds)) {
      const sh = shardFuel(ds) || Math.abs(amt);
      if (sh) stockPut(b.stockOut, STOCK_OUT_KINDS, sh);
    } else if (kind === 'sell') {
      if (ch > 0 && amt) stockPut(b.stockOut, STOCK_OUT_KINDS, Math.abs(amt));
    } else if (kind === 'sacrifice' && amt) {
      stockPut(b.stockOut, STOCK_OUT_KINDS, Math.abs(amt));
    } else if (amt > 0) stockPut(b.stockIn, STOCK_IN_KINDS, amt);
    else if (amt < 0) stockPut(b.stockOut, STOCK_OUT_KINDS, -amt);
    const fk = isGuideHit && !hitOnFixed ? null : fixedKind(desc);
    const fAmt = isGuideHit ? Math.abs(num(x.Amount)) || parseFixed(desc) : parseFixed(desc);
    if (fk && fAmt > 0) {
      const sAmt = isGuideHit ? 0 : parseFixedShares(desc);
      const gain = /获得|增加|补充|恢复|注入/.test(ds);
      bucketAdd(gain ? b.fixedIn : b.fixedOut, fk.key, fk.label, fAmt, desc);
      if (!gain && fk.key === 'guidepost') {
        const hid = descCharaId(desc) || num(x.RelatedId);
        if (hid) {
          const rec = b.hits[hid] || (b.hits[hid] = { id: hid, sum: 0, shares: 0, n: 0 });
          rec.sum += fAmt;
          rec.shares += sAmt;
          rec.n++;
        }
      }
    }
    const bal = num(x.Balance);
    const ts = logTs(x.LogTime);
    if (bal > 0 && ts >= b.ccTs) { b.cc = bal; b.ccTs = ts; }
  }

  function mergeStatBucket(dst, src) {
    ['fundIn', 'fundOut', 'stockIn', 'stockOut', 'fixedIn', 'fixedOut'].forEach((k) => {
      const bag = src[k] || {};
      Object.keys(bag).forEach((key) => {
        const s = bag[key];
        const d = dst[k][key] || (dst[k][key] = { key: s.key, label: s.label, sum: 0, n: 0, samples: [] });
        d.sum += s.sum;
        d.n += s.n;
        (s.samples || []).forEach((sample) => {
          if (d.samples.length < 4 && !d.samples.includes(sample)) d.samples.push(sample);
        });
      });
    });
    dst.tax.sum += src.tax.sum; dst.tax.n += src.tax.n;
    dst.auctionBack.sum += src.auctionBack.sum; dst.auctionBack.n += src.auctionBack.n;
    dst.buyBack.sum += src.buyBack.sum; dst.buyBack.n += src.buyBack.n;
    dst.scratchBuys += src.scratchBuys || 0;
    Object.keys(src.hits || {}).forEach((id) => {
      const s = src.hits[id];
      const d = dst.hits[id] || (dst.hits[id] = { id: s.id, sum: 0, shares: 0, n: 0 });
      d.sum += s.sum; d.shares += s.shares; d.n += s.n;
    });
    if ((src.ccTs || 0) >= dst.ccTs) { dst.cc = src.cc; dst.ccTs = src.ccTs; }
  }

  function statFromBucket(b) {
    if (b.scratchBuys > 0 && b.stockIn.scratch) {
      b.stockIn.scratch.n = b.scratchBuys;
      b.stockIn.scratch.countBy = 'buy';
    }
    const div = b.fundIn.dividend;
    if (b.tax.sum > 0 && div) {
      div.gross = div.sum;
      div.tax = b.tax.sum;
      div.taxN = b.tax.n;
      div.sum = Math.max(0, div.sum - b.tax.sum);
    }
    if (b.auctionBack.sum > 0) {
      const r = b.fundOut.auction;
      if (r && r.sum > 0) {
        r.refund = b.auctionBack.sum; r.refundN = b.auctionBack.n;
        r.sum = Math.max(0, r.sum - b.auctionBack.sum);
      } else {
        bucketAdd(b.fundIn, 'auction', FLOW_LABEL.auction, b.auctionBack.sum, '竞拍失败返还');
        const row = b.fundIn.auction;
        if (row) row.n = b.auctionBack.n;
      }
    }
    if (b.buyBack.sum > 0) {
      const r = b.fundOut.buy;
      if (r && r.sum > 0) {
        r.refund = b.buyBack.sum; r.refundN = b.buyBack.n;
        r.sum = Math.max(0, r.sum - b.buyBack.sum);
      } else {
        bucketAdd(b.fundIn, 'buy', FLOW_LABEL.buy, b.buyBack.sum, '买入退回');
        const row = b.fundIn.buy;
        if (row) row.n = b.buyBack.n;
      }
    }
    const pack = (map, keepZero) => {
      const rows = Object.values(map).filter((r) => (keepZero ? r.n > 0 : r.sum > 0 || r.tax > 0));
      rows.sort((a, c) => c.sum - a.sum);
      const total = rows.reduce((s, r) => s + r.sum, 0);
      rows.forEach((r) => { r.pct = total ? r.sum / total : 0; r.blind = r.sum <= 0; });
      return { rows, total, n: rows.reduce((s, r) => s + r.n, 0) };
    };
    return {
      fundIn: pack(b.fundIn), fundOut: pack(b.fundOut),
      stockIn: pack(b.stockIn), stockOut: pack(b.stockOut),
      fixedIn: pack(b.fixedIn, true), fixedOut: pack(b.fixedOut, true),
      hits: Object.values(b.hits).filter((x) => x.sum > 0 || x.shares > 0)
        .sort((a, c) => c.sum - a.sum || c.shares - a.shares),
      tax: b.tax, auctionBack: b.auctionBack, cc: b.cc,
    };
  }

  function bucketStats() {
    if (!statBuckets || !statBuckets.count) return null;
    const merged = emptyStatBucket();
    const from = logWindow ? logWindow.from : 0;
    const to = logWindow ? logWindow.to : 0;
    Object.keys(statBuckets.days).forEach((day) => {
      const start = parseDayMs(day);
      if (start == null) return;
      if (from && start + 86400000 <= from) return;
      if (to && start >= to) return;
      mergeStatBucket(merged, statBuckets.days[day]);
    });
    return statFromBucket(merged);
  }

  async function refreshStatBuckets() {
    if (statBucketsBusy || !logAllRaw.length) return;
    statBucketsBusy = true;
    try {
      const all = logAllRaw;
      let rebuild = !statBuckets || !statBuckets.v || all.length < statBuckets.count;
      if (!rebuild) {
        const freshN = all.filter((r) => (r.t || 0) > (statBuckets.anchorT || 0)).length;
        if (all.length - statBuckets.count !== freshN) rebuild = true;
      }
      if (rebuild) statBuckets = { v: 1, anchorT: 0, anchorK: '', count: 0, days: {} };
      const fresh = statBuckets.count === 0
        ? all.slice().sort((a, b) => (a.t || 0) - (b.t || 0))
        : all.filter((r) => (r.t || 0) > (statBuckets.anchorT || 0)).sort((a, b) => (a.t || 0) - (b.t || 0));
      fresh.forEach((r) => {
        const day = dayStr(r.t || 0);
        const b = statBuckets.days[day] || (statBuckets.days[day] = emptyStatBucket());
        bucketLog(b, r.v);
      });
      if (all[0]) { statBuckets.anchorT = all[0].t || 0; statBuckets.anchorK = all[0].k || ''; }
      statBuckets.count = all.length;
      await Store.setMeta('statBuckets', statBuckets);
      invalidateStatsCache();
    } finally { statBucketsBusy = false; }
  }

  async function initStatBuckets() {
    try {
      const saved = await Store.getMeta('statBuckets', null);
      if (saved && saved.v === 1) statBuckets = saved;
    } catch (e) {}
    await refreshStatBuckets();
  }

  function applyWindow() {
    const r = logRange();
    logWindow = r;
    logAll = logAllRaw
      .filter((rec) => {
        const ts = rec.t || logTs(rec.v && rec.v.LogTime);
        if (ts && ts < r.from) return false;
        if (ts && r.to && ts >= r.to) return false;
        return true;
      })
      .map((rec) => rec.v);
    // 退市角色在 chara/list 里查不到名字，用日志描述里的 #ID「名字」补缓存
    learnNamesFromDesc(logAll);
  }

  /** 从日志描述里补角色名：只填空缺，不覆盖 chara/list 的权威名字 */
  function learnNamesFromDesc(list) {
    let changed = false;
    (list || []).forEach((x) => {
      const s = String((x && x.Description) || '');
      if (!s || s.indexOf('#') < 0) return;
      const re = /#(\d+)\s*[「『]([^」』]+)[」』]/g;
      let m;
      while ((m = re.exec(s))) {
        const id = m[1];
        const nm = String(m[2] || '').trim();
        if (!nm || nameCache[id]) continue;
        nameCache[id] = nm;
        changed = true;
      }
    });
    if (changed) nameCacheSave();
    return changed;
  }

  /** 打开组件时先把本地记录铺上，秒开；后台再补增量 */
  async function loadLocal() {
    logAllRaw = (await Store.all()).slice().sort((a, b) => b.t - a.t);
    applyWindow();
    if (logAllRaw.length) {
      await initStatBuckets();
      renderLedger();
    }
  }

  const LS_HOLD = 'tglp:hold:v1';
  function holdShotLoad() {
    try {
      const o = JSON.parse(HWIN.localStorage.getItem(LS_HOLD) || 'null');
      if (o && o.key === Store.accountKey && o.at && Array.isArray(o.items) && o.items.length) {
        holdAll = o.items;
        holdAt = o.at;
        return true;
      }
    } catch (e) {}
    return false;
  }
  function holdShotSave() {
    try {
      HWIN.localStorage.setItem(LS_HOLD, JSON.stringify({ key: Store.accountKey, at: holdAt, items: holdAll }));
    } catch (e) {}
  }

  /** 后台补持仓市值（资产卡的「持仓市值 / 合计」两格用） */
  async function loadHoldings() {
    if (holdAll.length && Date.now() - holdAt < 5 * 60 * 1000) return;
    // 跨页面复用快照：同一账号 5 分钟内的持仓不再每个页面重新拉一遍
    if (!holdAll.length && holdShotLoad()) return;
    try {
      const me = guessedUsername();
      let key = me || '';
      try {
        const r = await api('account/recommend');
        if (r && r.Hash) key = r.Hash;
      } catch (e) {}
      if (!key) return;
      let r = await fetchAllHoldings(key);
      if (!r.items.length && me && key !== me) r = await fetchAllHoldings(me);
      if (!r.items.length) return;
      holdAll = r.items;
      holdAt = Date.now();
      holdShotSave();
      if (els) renderLedger();
    } catch (e) {}
  }

  /* ============ 账号身份：顶栏显示 + 每个账号独立存档 ============ */
  let accountName = '';
  let acctEl = null;
  let acctMenu = null;
  let acctChecked = false;
  let loadedKey = null;

  const LS_OWNER = 'tglp:owner:v1';
  const LS_ACCOUNTS = 'tglp:accounts:v1';

  function getOwner() {
    try { return String(HWIN.localStorage.getItem(LS_OWNER) || ''); } catch (e) { return ''; }
  }
  function setOwner(name) {
    try { HWIN.localStorage.setItem(LS_OWNER, String(name || '')); } catch (e) {}
  }

  function listAccounts() {
    try {
      const arr = JSON.parse(HWIN.localStorage.getItem(LS_ACCOUNTS) || '[]');
      return Array.isArray(arr) ? arr.filter((x) => x && x.key) : [];
    } catch (e) { return []; }
  }
  function saveAccounts(arr) {
    try { HWIN.localStorage.setItem(LS_ACCOUNTS, JSON.stringify(arr)); } catch (e) {}
  }
  function rememberAccount(key, name) {
    const list = listAccounts();
    const hit = list.find((x) => x.key === key);
    if (hit) { hit.name = name || hit.name || key; hit.last = Date.now(); }
    else list.push({ key, name: name || key, last: Date.now() });
    saveAccounts(list);
  }
  function forgetAccount(key) {
    saveAccounts(listAccounts().filter((x) => x.key !== key));
  }

  function setAcctLabel(name) {
    if (name !== undefined) accountName = String(name || '');
    if (!acctEl) return;
    acctEl.textContent = accountName ? '@' + accountName : '@未登录';
    acctEl.title = accountName
      ? '当前小圣杯账号：' + accountName + '（每个账号的本地存档分开保存）'
      : '未识别到登录账号';
  }

  async function resolveAccountName() {
    // 优先问接口（实时、准确）；拿不到再退回小圣杯自己的缓存 / 页面徽章。
    try {
      const r = await api('account/recommend');
      if (r && r.Hash) return String(r.Hash);
    } catch (e) {}
    return guessedUsername();
  }

  /** 升级迁移：旧版单库 tglp-ledger 的数据归给当前登录账号（只做一次，旧库保留不读）。 */
  async function migrateLegacy(key) {
    try {
      if (HWIN.localStorage.getItem('tglp:migrated:v1')) return 0;
      const legacy = await Store.all();
      if (!legacy.length) { HWIN.localStorage.setItem('tglp:migrated:v1', '1'); return 0; }
      await Store.use(key);
      if (!(await Store.all()).length) await Store.put(legacy);
      HWIN.localStorage.setItem('tglp:migrated:v1', '1');
      return legacy.length;
    } catch (e) { return 0; }
  }

  /**
   * 对齐到 nm 的独立存档：切库而不是清库。
   * 切回旧账号时直接复用它的日志与统计桶；只有该账号从未读过才需要全量扫描。
   */
  async function applyAccount(nm) {
    const name = String(nm || '').trim();
    if (!name) return { name: '', owner: '', switched: false, migrated: 0 };
    const key = name.toLowerCase();
    const prev = getOwner();
    const migrated = await migrateLegacy(key);
    await Store.use(key);
    rememberAccount(key, name);
    setOwner(key);
    if (prev && prev !== key) {
      // 只切库，不在这里读全量：真正的读取交给 ensureLocal（打开面板时一次完成）
      logAllRaw = [];
      logAll = [];
      statBuckets = null;
      holdAll = [];
      loadedKey = null;
      invalidateStatsCache();
      return { name, owner: prev, switched: true, migrated };
    }
    if (!prev) setOwner(key);
    return { name, owner: prev || key, switched: false, migrated };
  }

  async function checkAccount() {
    if (acctChecked) return { switched: false, name: accountName };
    acctChecked = true;
    const nm = await resolveAccountName();
    const r = await applyAccount(nm);
    setAcctLabel(r.name);
    renderAcctMenu();
    return r;
  }

  /** 打开面板时才把该账号的本地日志读进内存；同一账号只读一次。 */
  async function ensureLocal() {
    if (loadedKey === Store.accountKey && logAllRaw.length) return;
    await loadLocal();
    loadedKey = Store.accountKey;
  }

  /** 账号管理：删除某个账号的本地存档。 */
  async function deleteAccount(key) {
    const k = String(key || '');
    if (!k) return;
    const hit = listAccounts().find((x) => x.key === k);
    const label = (hit && hit.name) || k;
    const msg = '删除账号「' + label + '」的本地存档？\n下次登录该账号需要重新读取全部日志。';
    try { if (!HWIN.confirm(msg)) return; } catch (e) {}
    forgetAccount(k);
    if (k === Store.accountKey) {
      try { await Store.clear(); } catch (e) {}
      await Store.destroy(k);
      Store.accountKey = '';
      Store.dbName = Store._dbName('');
      Store.close();
      logAllRaw = [];
      logAll = [];
      statBuckets = null;
      holdAll = [];
      invalidateStatsCache();
      setOwner('');
      applyWindow();
      acctChecked = false;
      loadedKey = null;
      if (els) renderLedger();
      setLogStatus('已删除当前账号的本地存档，刷新页面后会重新读取');
    } else {
      await Store.destroy(k);
    }
    renderAcctMenu();
  }

  /** 账号管理下拉：列出所有本地存档，可逐条删除。 */
  async function renderAcctMenu() {
    if (!acctMenu) return;
    const list = listAccounts().slice().sort((a, b) => (b.last || 0) - (a.last || 0));
    const frag = HDOC.createDocumentFragment();
    const pending = [];
    frag.appendChild(h('div', { class: 'tglp-acct-title' }, '本地账号存档'));
    if (!list.length) frag.appendChild(h('div', { class: 'tglp-acct-empty' }, '还没有账号存档'));
    for (const rec of list) {
      const on = rec.key === Store.accountKey;
      const metaEl = h('span', { class: 'tglp-acct-meta' }, '—');
      const del = h('button', { class: 'tglp-acct-del', type: 'button', title: '删除该账号的本地存档' }, '删除');
      del.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        deleteAccount(rec.key);
      });
      frag.appendChild(h('div', { class: 'tglp-acct-row' + (on ? ' tglp-on' : '') },
        h('span', { class: 'tglp-acct-name', title: rec.name || rec.key }, (on ? '● ' : '') + (rec.name || rec.key)),
        metaEl,
        del));
      pending.push({ key: rec.key, metaEl });
    }
    frag.appendChild(h('div', { class: 'tglp-acct-tip' }, '切换账号请在小圣杯重新登录；这里只管理本地存档。'));
    acctMenu.textContent = '';
    acctMenu.appendChild(frag);
    for (const r of pending) {
      try { r.metaEl.textContent = String(await Store.countOf(r.key)) + ' 条'; } catch (e) {}
    }
  }

  /* ============ 全范围增量扫描 ============
   * 与工具箱账本的关键区别：**没有 150 页上限**，一路读到接口返回的 TotalPages。
   * 第一次读全量写入 IndexedDB；以后只读头部，撞上已存记录就停（append-only）。
   * 若本轮有页读取失败，置 fullScanNeeded，下一轮强制整份重读补洞（自愈）。
   */
  async function scanLogs() {
    if (busy) return;
    busy = true;
    setButtonsDisabled(true);
    try {
      const tStart = performance.now();
      const range = logRange();
      logWindow = range;

      setLogStatus('读取本地存档…');
      const base = logAllRaw.length ? logAllRaw : await Store.all();
      const seen = new Set(base.map((r) => r.k));
      const existingCount = base.length;
      const forceFull = !!(await Store.getMeta('fullScanNeeded', false));
      const pending = [];
      let added = 0;
      let writeShort = 0;
      const flush = async () => {
        if (!pending.length) return;
        const batch = pending.splice(0, pending.length);
        await Store.put(batch);
        added += batch.length;
      };
      const failedPages = [];
      let loginErr = null;

      // 单页读取失败重试 2 次（400/800ms）：偶发抖动不再触发下轮全量重读。
      // 登录失效不重试，直接中止本轮。
      const fetchPage = async (p) => {
        let lastErr = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try { return await api(`chara/user/balance/${p}/${LOG_PAGE}`); }
          catch (e) {
            lastErr = e;
            if (e && e.needLogin) throw e;
            if (attempt < 2) await sleep(400 * (attempt + 1));
          }
        }
        throw lastErr;
      };

      setLogStatus('读取第 1 页…');
      const v1 = await fetchPage(1);
      const totalPages = num(v1.TotalPages) || 1;
      let hitAnchor = false;
      const take = (items) => {
        for (let i = 0; i < (items || []).length; i++) {
          const it = items[i];
          const k = logKey(it);
          // 增量：撞上一条已存记录 = 后面都是老的，不用再读（本轮无失败页才可信）
          if (seen.has(k)) {
            if (!failedPages.length && !forceFull) hitAnchor = true;
            return;
          }
          seen.add(k);
          pending.push({ k, t: logTs(it.LogTime), v: it });
        }
      };
      take(v1.Items || []);
      await flush();
      let scanned = 1;
      setLogStatus(`读取 1 / ${totalPages} 页…（本地已存 ${existingCount} 条）`);

      let next = 2;
      while (!hitAnchor && next <= totalPages) {
        const block = [];
        for (let p = next; p < next + LOG_BLOCK && p <= totalPages; p++) block.push(p);
        const got = new Array(block.length);
        await mapLimit(block, LOG_BLOCK, async (p, idx) => {
          try { got[idx] = await fetchPage(p); }
          catch (e) {
            got[idx] = null;
            if (e && e.needLogin) loginErr = e;
            else failedPages.push(p);
          }
        });
        if (loginErr) throw loginErr;
        for (let i = 0; i < got.length && !hitAnchor; i++) {
          if (got[i]) take(got[i].Items || []);
        }
        await flush();
        next += block.length;
        scanned = Math.min(next - 1, totalPages);
        setLogStatus(`读取 ${scanned} / ${totalPages} 页…（新 ${added + pending.length} 条）`);
        if (!hitAnchor && next <= totalPages) await sleep(60);
      }

      await flush();
      await Store.setMeta('lastScan', Date.now());
      await Store.setMeta('totalPages', totalPages);
      // 有失败页 → 下轮强制全量重读补洞；否则清掉标记
      await Store.setMeta('fullScanNeeded', failedPages.length > 0);

      setLogStatus(`读取完成（新增 ${added} 条），整理本地存档…`);
      logAllRaw = (await Store.all()).slice().sort((a, b) => b.t - a.t);
      const storedCount = logAllRaw.length;
      if (storedCount < seen.size) {
        writeShort = seen.size - storedCount;
        await Store.setMeta('fullScanNeeded', true);
      }
      invalidateStatsCache();
      setLogStatus('生成统计存档…');
      await refreshStatBuckets();
      applyWindow();

      const nameIds = [];
      logAll.forEach((x) => {
        const id = logCharaId(x);
        if (id) nameIds.push(id);
      });
      const ids = [...new Set(nameIds)];
      const testPage = /testlp|perf\.html/.test(location.pathname);
      const bgNames = !!(ids.length && !testPage);
      if (bgNames) {
        setLogStatus(`统计完成，角色名后台补全中（${ids.length} 个）…`);
        loadNames(ids, false, { always: true }).then(() => {
          if (S.ledgerView && els) {
            const keep = els.logStat.textContent;
            renderLedger();
            if (els && keep) els.logStat.textContent = keep.replace('角色名后台补全中', '角色名已补全');
          }
        }).catch(() => {});
      }

      setLogStatus('生成图表与数据表…');
const st = cachedLedgerStats();
      if (st.cc > 0) recordSnapshot(st.cc, holdAll.reduce((s, x) => s + num(x.UserAmount) * num(x.Current), 0));
      renderLedger();

      /* renderLedger() 自己写「N 条记录 · 范围…」，这里只在后面追加，不覆盖 */
      const rich = els ? els.logStat.textContent : '';
      const failTip = failedPages.length ? ` · ${failedPages.length} 页读取失败，下轮会自动补` : '';
      const shortTip = writeShort ? ` · 写入校验少 ${writeShort} 条，下轮自动补` : '';
      const bgTip = bgNames ? ` · 角色名后台补全中（${ids.length}）` : '';
      const cost = ((performance.now() - tStart) / 1000).toFixed(1);
      if (!logAll.length) setLogStatus('这段时间没有资金日志' + failTip + shortTip);
      else if (added) setLogStatus(`${rich} · 新增 ${added} 条 · 本地共 ${logAllRaw.length} 条 · 耗时 ${cost}s${failTip}${shortTip}${bgTip}`);
      else setLogStatus(`${rich} · 沿用本地记录（无新增）· 共 ${logAllRaw.length} 条 · 耗时 ${cost}s${failTip}${shortTip}${bgTip}`);
    } catch (err) {
      if (err && err.needLogin) setLogStatus(err.message, 'login');
      else setLogStatus('出错：' + (err && err.message ? err.message : err));
    } finally {
      busy = false;
      setButtonsDisabled(false);
    }
  }

  /* ============ v1.1.0：数据下钻 + 原生 SVG 图表 ============
   * 统计口径沿用原文的 classifyKind / FLOW_LABEL，只把 logAll 按「来源 → 逐笔/角色」重新展开。
   */

  /** 某条记录归到资金收入的哪个来源（与 ledgerStats 的 put 口径一致） */
  function fundKindOf(x) {
    const desc = x.Description;
    const ch = num(x.Change);
    const amt = x.Amount === undefined || x.Amount === null ? descAmount(desc) : num(x.Amount);
    const kind = classifyKind(desc, amt, ch, x.Type);
    const allowed = ch > 0 ? FUND_IN_KINDS : FUND_OUT_KINDS;
    const key = allowed.includes(kind) ? kind : 'other';
    return { key, label: fundLabel(ch > 0 ? 'in' : 'out', key), kind, ch, amt, desc };
  }

  /** 汇总模式聚合对象：红包取描述里的「玩家名」，手续费/印花税取 #ID「角色名」 */
  function logRoleWho(x, kind) {
    const desc = String((x && x.Description) || '');
    if (kind === 'packet') {
      const m = desc.match(/「([^」]+)」/);
      return m && m[1].trim() ? { id: 0, name: m[1].trim() } : null;
    }
    if (kind === 'fee' || kind === 'stamp') {
      const m = desc.match(/#(\d+)\s*[「『]([^」』]+)[」』]/);
      if (m) return { id: num(m[1]), name: String(m[2] || '').trim() };
      const only = desc.match(/[「『]([^」』]+)[」』]/);
      if (only && only[1].trim()) return { id: 0, name: only[1].trim() };
    }
    const id = logCharaId(x);
    return id ? { id, name: '' } : null;
  }

  /** 按日统计股息与个税：净股息 = 同一天的股息 - 同一天的个税 */
  function dividendNetRatioByDay() {
    const gross = new Map();
    const tax = new Map();
    logAll.forEach((x) => {
      const ch = num(x.Change);
      if (!ch) return;
      const desc = String(x.Description || '');
      const rawAmt = x.Amount === undefined || x.Amount === null ? descAmount(desc) : x.Amount;
      const kind = classifyKind(desc, num(rawAmt), ch, x.Type);
      const day = dayStr(logTs(x.LogTime) || 0);
      if (kind === 'dividend' && ch > 0) gross.set(day, (gross.get(day) || 0) + ch);
      else if (kind === 'tax' && ch < 0) tax.set(day, (tax.get(day) || 0) - ch);
    });
    return { gross, tax };
  }

  /**
   * 资金下钻：把某方向（in/out）某来源的记录展开。
   * mode='detail' → 逐笔；mode='role' → 按角色聚合。
   * 与 ledgerStats 一致：收入里的 auction/buy/tax 不当作来源明细；支出里的 tax 仍进「股息税」合计。
   */
  function fundDrill(dir, key, mode) {
    const rows = [];
    const byRole = new Map();
    const flat = { sum: 0, n: 0 };
    const divDay = dividendNetRatioByDay();
    const flatRole = (dir === 'out' && (key === 'other' || key === 'scratch')) ||
      (dir === 'in' && ['dividend', 'aucbonus', 'lotto', 'refer', 'welfare', 'checkin'].includes(key));
    for (let i = 0; i < logAll.length; i++) {
      const x = logAll[i];
      const d = fundKindOf(x);
      if (dir === 'in' ? d.ch <= 0 : d.ch >= 0) continue;
      if (dir === 'in' && d.kind === 'tax') continue;
      if (dir === 'in' && d.kind === 'buy' && !/冰山|取消买入|解除冻结|退回|退款/.test(d.desc || '')) continue;
      if (key && key !== 'all' && d.key !== key) continue;
      let val = Math.abs(d.ch);
      if (d.kind === 'dividend') {
        const day = dayStr(logTs(x.LogTime) || 0);
        const g = divDay.gross.get(day) || 0;
        const t = divDay.tax.get(day) || 0;
        val *= g > 0 ? Math.max(0, (g - t) / g) : 1;
      }
      if (!(val > 0)) continue;
      const id = logCharaId(x);
      if (mode === 'role') {
        // 收入/支出的「合计型」来源：不按角色拆分，直接汇总成一笔
        if (flatRole) {
          flat.sum += val;
          flat.n++;
          continue;
        }
        const who = logRoleWho(x, d.kind);
        if (!who) continue;
        const rk = who.name ? 'n:' + who.name : 'i:' + who.id;
        const r = byRole.get(rk) || { id: who.id, name: who.name || '', sum: 0, n: 0 };
        r.sum += val;
        r.n++;
        byRole.set(rk, r);
      } else {
        if (rows.length >= DETAIL_LIMIT) break;
        rows.push({
          ts: logTs(x.LogTime), id, desc: String(d.desc || ''), val, shares: d.amt,
          key: d.key, label: d.label,
        });
      }
    }
    if (mode === 'role') {
      if (flatRole) {
        return flat.n ? [{ id: 0, name: '', sum: flat.sum, n: flat.n, pct: 1 }] : [];
      }
      const out = [...byRole.values()].sort((a, b) => b.sum - a.sum);
      const total = out.reduce((s, r) => s + r.sum, 0);
      out.forEach((r) => (r.pct = total ? r.sum / total : 0));
      return out;
    }
    rows.sort((a, b) => b.ts - a.ts);
    return rows;
  }

  /** 月度资金趋势：按 YYYY-MM 聚合收入/支出，净值优先用余额差（真实资产变化） */
  function monthlyFlow() {
    const map = new Map();
    const sorted = logAll.slice().sort((a, b) => (logTs(a.LogTime) || 0) - (logTs(b.LogTime) || 0));
    sorted.forEach((x) => {
      const ts = logTs(x.LogTime);
      if (!ts) return;
      const desc = String(x.Description || '');
      const ch = num(x.Change);
      if (!ch) return;
      const amt = x.Amount === undefined || x.Amount === null ? descAmount(desc) : x.Amount;
      const kind = classifyKind(desc, num(amt), ch, x.Type);
      // 个税、撤销买单的花费/退回、竞拍失败返还、冰山退回、ICO 失败退回都不计入趋势
      if (kind === 'tax') return;
      if (num(x.Type) === 5 || num(x.Type) === 8) return;
      if (ch > 0 && (kind === 'auction' || kind === 'ico' || kind === 'buy')) return;
      if (ch > 0 && kind === 'sell' && /取消|撤销|撤回|退回|退款/.test(desc)) return;
      if (/取消买入|取消卖出|撤销|撤回|退回|退款|失败解除冻结|ICO失败|冰山.*(解冻|退回|撤回|冻结-)/i.test(desc)) return;
      const d = new Date(ts);
      const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      const r = map.get(k) || { key: k, in: 0, out: 0, firstBal: null, lastBal: null };
      if (x.Balance !== undefined && x.Balance !== null) {
        const bal = num(x.Balance);
        if (r.firstBal === null) r.firstBal = bal;
        r.lastBal = bal;
      }
      if (ch > 0) r.in += ch;
      else r.out += -ch;
      map.set(k, r);
    });
    const arr = [...map.values()].sort((a, b) => (a.key < b.key ? -1 : 1));
    let prevBal = null;
    arr.forEach((m) => {
      // 净值：本月末余额 - 上月末余额（首月退化为月末 - 月初）；没有余额字段才退回毛额差
      if (m.lastBal !== null && prevBal !== null) m.net = m.lastBal - prevBal;
      else if (m.lastBal !== null && m.firstBal !== null) m.net = m.lastBal - m.firstBal;
      else m.net = m.in - m.out;
      if (m.lastBal !== null) prevBal = m.lastBal;
    });
    return arr;
  }

  const CHART_COLORS = ['#e46fa1', '#8fb8ff', '#9fe0b0', '#ffd08a', '#c9a0ff', '#7fd3d0', '#f0a07f', '#a0b4d0'];

  /** 通用：横向条形图（rows=[{label,sum}]），返回 SVG 节点 */
  function hbarSvg(rows, color) {
    const wrap = h('div', { class: 'tglp-chartwrap' });
    if (!rows.length) {
      wrap.appendChild(h('div', { class: 'tglp-chempty' }, '暂无数据'));
      return wrap;
    }
    const max = Math.max(...rows.map((r) => Math.abs(num(r.sum))), 1);
    const frag = HDOC.createDocumentFragment();
    rows.forEach((r, i) => {
      const w = Math.max(1, (Math.abs(num(r.sum)) / max) * 100);
      frag.appendChild(
        h(
          'div',
          { class: 'tglp-chrow', title: `${r.label}：${fmtCc(r.sum)}${r.n ? ' · ' + r.n + ' 次' : ''}` },
          h('span', { class: 'tglp-chlab' }, r.label || '—'),
          h('span', { class: 'tglp-chtrack' },
            h('i', { class: 'tglp-chbar', style: `width:${w}%;background:${color || CHART_COLORS[i % CHART_COLORS.length]}` })
          ),
          h('b', { class: 'tglp-chval' },
            h('span', { class: 'tglp-chamt' }, fmtCc(r.sum)),
            r.n ? h('i', { class: 'tglp-chcnt' }, fmt(r.n) + ' 次') : null)
        )
      );
    });
    wrap.appendChild(frag);
    return wrap;
  }

  /** 环形占比图：rows=[{label,sum}]，中心显示合计。用 conic-gradient，零 SVG 依赖 */
  function donutSvg(rows, totalLabel) {
    const wrap = h('div', { class: 'tglp-donutwrap' });
    const total = rows.reduce((s, r) => s + Math.abs(num(r.sum)), 0);
    if (!total) {
      wrap.appendChild(h('div', { class: 'tglp-chempty' }, '暂无数据'));
      return wrap;
    }
    let acc = 0;
    const parts = [];
    rows.forEach((r, i) => {
      const pct = (Math.abs(num(r.sum)) / total) * 100;
      const c = CHART_COLORS[i % CHART_COLORS.length];
      parts.push(`${c} ${acc}% ${acc + pct}%`);
      acc += pct;
    });
    const donut = h('div', { class: 'tglp-donut', style: `background:conic-gradient(${parts.join(',')})` },
      h('div', { class: 'tglp-donuthole' },
        h('b', null, fmtCc(total)),
        h('i', null, totalLabel || '合计')
      )
    );
    wrap.appendChild(donut);
    const legend = h('div', { class: 'tglp-legend' });
    rows.slice(0, 10).forEach((r, i) => {
      legend.appendChild(
        h('div', { class: 'tglp-legendrow', title: `${r.label}：${fmtCc(r.sum)}${r.n ? ' · ' + r.n + ' 次' : ''}` },
          h('i', { style: `background:${CHART_COLORS[i % CHART_COLORS.length]}` }),
          h('span', null, r.label || '—'),
          h('b', { class: 'tglp-lpct' }, ((Math.abs(num(r.sum)) / total) * 100).toFixed(1) + '%'),
          h('em', { class: 'tglp-lcnt' }, r.n ? fmt(r.n) + '次' : '')
        )
      );
    });
    wrap.appendChild(legend);
    return wrap;
  }

/** 角色维度股数统计（覆盖原文）：补每类次数，刮刮乐获奖保留角色 */
  function logStats() {
    const map = new Map();
    logAll.forEach((x) => {
      const ds = String(x.Description || '');
      const ch = num(x.Change);
      const amt = x.Amount === undefined || x.Amount === null ? descAmount(ds) : num(x.Amount);
      if (!amt) return;
      const id = logCharaId(x);
      if (!id) return;
      const kind = classifyKind(ds, amt, ch, x.Type);
      if (/星之力/.test(ds)) return;
      if (/固定资产/.test(ds)) return;
      if (kind === 'sell' && ch <= 0) return;
      let rec = map.get(id);
      if (!rec) {
        rec = {
          id, gain: 0, loss: 0,
          gainBy: Object.create(null), lossBy: Object.create(null),
          gainNBy: Object.create(null), lossNBy: Object.create(null),
        };
        map.set(id, rec);
      }
      const bump = (dir, key, val) => {
        if (!(val > 0)) return;
        const bag = dir === 'loss' ? rec.lossBy : rec.gainBy;
        const nbag = dir === 'loss' ? rec.lossNBy : rec.gainNBy;
        bag[key] = (bag[key] || 0) + val;
        nbag[key] = (nbag[key] || 0) + 1;
        if (dir === 'loss') rec.loss += val;
        else rec.gain += val;
      };
      const sub = kind === 'item' ? itemSub(ds) : kind;
      if (kind === 'sell' || kind === 'sacrifice') {
        bump('loss', sub, Math.abs(amt));
      } else if (/星光碎片/.test(ds) && /充能/.test(ds)) {
        bump('loss', 'shard', shardFuel(ds) || Math.abs(amt));
      } else if (amt > 0) {
        bump('gain', sub, amt);
      } else {
        bump('loss', sub, -amt);
      }
    });
    return { chars: [...map.values()] };
  }

  /** 股数角色列表（覆盖原文）：修复「显示全部」仍截断 20 条的问题 */
  function logCharRows(st) {
    const dir = S.logDir === 'loss' ? 'loss' : 'gain';
    const kind = S.logKind || 'all';
    const val = (x) => logCharVal(x, dir, kind);
    const rows = st.chars.filter((x) => val(x) > 0);
    const asc = S.logSort === 'asc';
    rows.sort((a, b) => (asc ? val(a) - val(b) : val(b) - val(a)));
    const raw = S.logTop;
    const cap = raw === 'all' || raw === undefined || raw === null
      ? rows.length
      : Math.max(1, Math.floor(num(raw) || rows.length));
    return {
      rows: cap >= rows.length ? rows : rows.slice(0, cap),
      count: rows.length, dir, kind, val,
    };
  }

  /** 股数来源汇总（卡片用）：按获得/损失方向 + 道具细分（魔方/道标/碎片） */
  function stockKindChartRows() {
    const gain = new Map();
    const loss = new Map();
    const bump = (map, key, label, val) => {
      if (!(val > 0)) return;
      const r = map.get(key) || { key, label, sum: 0, n: 0 };
      r.sum += val;
      r.n++;
      map.set(key, r);
    };
    logAll.forEach((x) => {
      const ds = String(x.Description || '');
      const ch = num(x.Change);
      const amt = x.Amount === undefined || x.Amount === null ? descAmount(ds) : num(x.Amount);
      if (!amt) return;
      if (!logCharaId(x)) return;
      const kind = classifyKind(ds, amt, ch, x.Type);
      if (/星之力/.test(ds) || /固定资产/.test(ds)) return;
      if (kind === 'sell' && ch <= 0) return;
      const sub = kind === 'item' ? itemSub(ds) : kind;
      const short = {
        chaos: '魔方', guidepost: '道标', shard: '碎片',
        auction: '竞拍', scratch: '刮刮乐', ico: 'ICO',
        buy: '买入', sell: '卖出', sacrifice: '献祭',
      };
      const label = short[sub] || ITEM_SUB_LABEL[sub] || '其他';
      if (kind === 'sell' || kind === 'sacrifice') {
        bump(loss, sub, label, Math.abs(amt));
      } else if (/星光碎片/.test(ds) && /充能/.test(ds)) {
        bump(loss, 'shard', '碎片', shardFuel(ds) || Math.abs(amt));
      } else if (amt > 0) {
        bump(gain, sub, label, amt);
      } else {
        bump(loss, sub, label, -amt);
      }
    });
    const packRows = (m) => [...m.values()].sort((a, b) => b.sum - a.sum);
    const GAIN_ORDER = ['buy', 'auction', 'chaos', 'guidepost', 'ico', 'scratch'];
    const gAll = packRows(gain);
    const gByKey = new Map(gAll.map((r) => [r.key, r]));
    const g = [];
    GAIN_ORDER.forEach((k) => { if (gByKey.has(k)) g.push(gByKey.get(k)); });
    gAll.forEach((r) => { if (GAIN_ORDER.indexOf(r.key) < 0) g.push(r); });
    const l = packRows(loss);
    return {
      gainRows: g, lossRows: l,
      gainTotal: g.reduce((s, r) => s + r.sum, 0),
      gainN: g.reduce((s, r) => s + r.n, 0),
      lossTotal: l.reduce((s, r) => s + r.sum, 0),
      lossN: l.reduce((s, r) => s + r.n, 0),
    };
  }

  /** 自己被道标命中、扣固定资产的日志（不含扣活股，也不含自己使用道标打别人） */
  function guideHitLogs() {
    const rows = [];
    logAll.forEach((x) => {
      const ds = String(x.Description || '');
      if (!/虚空道标/.test(ds) || /获得/.test(ds) || !/受到|被|你的圣殿/.test(ds)) return;
      if (!/固定资产/.test(ds)) return;
      const amt = Math.abs(num(x.Amount)) || parseFixed(ds);
      if (!(amt > 0)) return;
      rows.push({ ts: logTs(x.LogTime), id: descCharaId(ds), amt, desc: ds });
    });
    rows.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    return rows;
  }

  /** 星之力行：筛选（含自定义区间）+ 固定星之力降序（排序按钮已删） */
  function starRows(list) {
    const custom = S.starFilter === 'custom';
    const min = num(S.starMin) || 0;
    const max = num(S.starMax);
    const keep = custom
      ? (v) => v >= min && (!(max > 0) || v <= max)
      : starFilterFn(S.starFilter);
    const rows = (list || []).filter((r) => keep(r.star));
    rows.sort((a, b) => b.star - a.star);
    return rows;
  }

  /** 自己的星之力转化日志（固资 → 星之力） */
  function starGainLogs() {
    const rows = [];
    logAll.forEach((x) => {
      const ds = String(x.Description || '');
      if (!/星之力|灌注/.test(ds)) return;
      const amt = Math.abs(num(x.Amount)) || descAmount(ds);
      if (!amt) return;
      rows.push({ ts: logTs(x.LogTime), id: logCharaId(x), amt, desc: ds });
    });
    rows.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    return rows;
  }

  /** 双列条形卡：按排名奇偶交错分列，两列各自从高到低 */
  function hbarPairSvg(rows, color) {
    if (!rows.length) return h('div', { class: 'tglp-chempty' }, '暂无数据');
    const left = rows.filter((r, i) => i % 2 === 0);
    const right = rows.filter((r, i) => i % 2 === 1);
    return h('div', { class: 'tglp-chartwrap tglp-chartwrap-pair' },
      hbarSvg(left, color),
      hbarSvg(right, color));
  }

  /** 月度柱状图：flow=收入上绿/支出下蓝；net=净值上绿/下灰 */
  function monthlySvg(rows, mode) {
    const wrap = h('div', { class: 'tglp-chartwrap' });
    if (!rows.length) {
      wrap.appendChild(h('div', { class: 'tglp-chempty' }, '暂无数据'));
      return wrap;
    }
    const netMode = mode === 'net';
    const max = Math.max(...rows.map((r) => (netMode
      ? Math.abs(r.net !== undefined ? r.net : r.in - r.out)
      : Math.max(r.in, r.out))), 1);
    const bars = h('div', { class: 'tglp-mbars' + (netMode ? ' tglp-mbars-net' : '') });
    rows.forEach((r) => {
      const net = r.net !== undefined ? r.net : r.in - r.out;
      const upH = netMode ? (net > 0 ? Math.max(2, (net / max) * 100) : 0) : Math.max(2, (r.in / max) * 100);
      const downH = netMode ? (net < 0 ? Math.max(2, (-net / max) * 100) : 0) : Math.max(2, (r.out / max) * 100);
      const netTxt = (net >= 0 ? '+₵' : '-₵') + fmtCc(Math.abs(net));
      bars.appendChild(
        h('div', { class: 'tglp-mcol', title: `${r.key}　收入 ₵${fmtCc(r.in)}　支出 ₵${fmtCc(r.out)}　净值 ${netTxt}` },
          h('div', { class: 'tglp-mup' }, upH > 0 ? h('i', { style: `height:${upH}%` }) : null),
          h('span', { class: 'tglp-mlab' }, r.key.slice(2)),
          h('div', { class: 'tglp-mdown' },
            downH > 0 ? h('i', { style: `height:${downH}%${netMode ? ';background:#9aa0a6' : ''}` }) : null)
        )
      );
    });
    wrap.appendChild(bars);
    wrap.appendChild(h('div', { class: 'tglp-mlegend' },
      h('span', null, h('i', { class: netMode ? 'tglp-up' : 'tglp-up' }), netMode ? '净流入' : '收入'),
      h('span', null, h('i', { class: netMode ? 'tglp-netdown' : 'tglp-down' }), netMode ? '净流出' : '支出')
    ));
    return wrap;
  }


  /* ============ v1.1.0：全新渲染层（替代原文 renderLedger） ============ */

  /** 一个来源一行：名称 · 占比条 · 数值 · 笔数。可点击 → 右侧只看这个来源的明细 */
  function flowRow(r, unit, dir, picked) {
    const hasSamples = r.key === 'other' && r.samples && r.samples.length;
    const detail = hasSamples ? '其他明细：' + r.samples.join(' / ') : '';
    const val = unit === 'fx'
      ? (r.blind ? '—' : fmt(r.sum) + ' 点')
      : unit === 'cc' ? '₵' + fmtCc(r.sum) : fmt(r.sum);
    return h(
      'div',
      {
        class: 'tglp-flowrow' + (picked ? ' tglp-picked' : '') + (r.clickable === false ? '' : ' tglp-clickable'),
        title: (detail || r.label) + (r.clickable === false ? '' : '　（点这里只看这个来源）'),
        onClick: r.clickable === false ? null : () => {
          els.fundDir = dir === 'in' ? 'in' : 'out';
          els.fundKey = r.key;
          els.fDir.value = els.fundDir;
          syncFundKindsUI();
          renderLedger();
        },
      },
      h('span', { class: 'tglp-flowname' + (hasSamples ? ' tglp-hasdetail' : '') }, r.label),
      h('span', { class: 'tglp-flowbar' },
        h('i', { class: dir === 'in' ? 'up' : 'down', style: `width:${Math.max(3, Math.round((r.pct || 0) * 100))}%` })
      ),
      h('b', { class: 'tglp-flowval' }, val),
      h('span', { class: 'tglp-flown' }, r.n + ' 次')
    );
  }

  /** 一个象限：【标题 + 合计】 + 各来源明细 */
  function flowBlock(title, unit, dir, data, note, pickedKey, clickable) {
    const total = data.total > 0
      ? (unit === 'cc' ? '₵' + fmtCc(data.total) : fmt(data.total) + (unit === 'fx' ? ' 点' : ' 股'))
      : '—';
    const kids = [
      h('div', { class: 'tglp-flowhead' },
        h('span', null, title),
        data.total > 0 ? h('b', { class: dir === 'in' ? 'tglp-up' : 'tglp-down' }, (dir === 'in' ? '+' : '-') + total) : null,
        data.n > 0 ? h('i', null, data.n + ' 次') : null
      ),
    ];
    if (!data.rows.length) kids.push(h('div', { class: 'tglp-flowempty' }, '暂无'));
    else data.rows.forEach((r) => kids.push(flowRow({ ...r, clickable }, unit, dir, clickable && pickedKey === r.key)));
    if (note) kids.push(h('div', { class: 'tglp-flownote' }, note));
    return h('div', { class: 'tglp-flowblk' }, kids);
  }

  /** 让 fKind 下拉反映当前选中来源（点来源条时调用；UI 建好后才有意义） */
  function syncFundKindsUI() {
    if (!els || !els.fKind) return;
    els.fKind.value = els.fundKey || 'all';
  }

  /* ============ 统一数据表：排序 + 分页（v1.2.0 上图下表布局） ============ */
  const TABLE_SIZE_DEFAULT = 50;
  const DETAIL_LIMIT = 50000;
  let tableState = { page: 1, size: TABLE_SIZE_DEFAULT, sortCol: -1, sortDir: 1, rows: [], cols: [], pair: false, pairN: 1 };

  function cellText(t, extra) {
    return Object.assign({ t: String(t == null ? '' : t) }, extra || {});
  }
  function cellNum(v, disp, extra) {
    return Object.assign({ t: String(disp == null ? v : disp), num: num(v), align: 'right' }, extra || {});
  }
  function cellLink(id, name, extra) {
    const nm = name || charaName(id) || ('#' + id);
    // 只存轻量数据：<a> 节点推迟到当前页渲染时创建（前几万行不再预建 DOM）
    return Object.assign({
      linkId: id, t: nm, num: num(id),
    }, extra || {});
  }

  function sortTable() {
    const s = tableState;
    if (s.sortCol < 0 || !s.rows.length) return;
    const c = s.sortCol, dir = s.sortDir;
    s.rows.sort((a, b) => {
      const x = a[c] || {}, y = b[c] || {};
      const vx = x.num !== undefined ? x.num : x.t, vy = y.num !== undefined ? y.num : y.t;
      if (typeof vx === 'number' && typeof vy === 'number') return (vx - vy) * dir;
      return String(vx).localeCompare(String(vy), 'zh') * dir;
    });
  }

  function pageCount() {
    return Math.max(1, Math.ceil(tableState.rows.length / tableState.size));
  }

  function gotoPage(p) {
    tableState.page = Math.min(pageCount(), Math.max(1, p));
    renderTableBody();
  }

  function renderPager() {
    if (!els || !els.pager) return;
    const s = tableState;
    const pages = pageCount();
    if (s.page > pages) s.page = pages;
    const pager = els.pager;
    pager.textContent = '';
    const mk = (label, p, dis, on) => {
      const attrs = { type: 'button', onClick: () => gotoPage(p) };
      if (dis) attrs.disabled = 'disabled';
      if (on) attrs.class = 'tglp-on';
      return h('button', attrs, label);
    };
    pager.appendChild(mk('«', 1, s.page === 1, false));
    pager.appendChild(mk('‹', s.page - 1, s.page === 1, false));
    const lo = Math.max(1, s.page - 2), hi = Math.min(pages, s.page + 2);
    for (let i = lo; i <= hi; i++) pager.appendChild(mk(String(i), i, false, i === s.page));
    pager.appendChild(mk('›', s.page + 1, s.page === pages, false));
    pager.appendChild(mk('»', pages, s.page === pages, false));
    if (els.pageSizeSel && Number(els.pageSizeSel.value) !== s.size) els.pageSizeSel.value = String(s.size);
    const from = s.rows.length ? (s.page - 1) * s.size + 1 : 0;
    const to = Math.min(s.page * s.size, s.rows.length);
    pager.appendChild(h('span', { class: 'tglp-pg-info' }, `${pages} 页 / 共 ${s.rows.length} 条`));
  }

  function renderTableHead() {
    if (!els || !els.tableHead) return;
    const tr = h('tr');
    // 一行多组时只有第一组表头可排序：行数据里每条记录只存一组的 cells，
    // 后面组的列索引在 sortTable 里取不到值（点了没反应），所以统一锁死。
    const groupSize = tableState.pair
      ? Math.max(1, Math.floor(tableState.cols.length / (tableState.pairN || 2)))
      : 0;
    tableState.cols.forEach((c, i) => {
      const lockSort = c.nosort || (groupSize > 0 && i >= groupSize);
      const on = !lockSort && tableState.sortCol === i;
      const cls = [
        c.align === 'right' ? 'tglp-num' : '',
        lockSort ? 'tglp-nosort' : '',
        c.split ? 'tglp-split' : '',
        c.cls ? c.cls : '',
      ].filter(Boolean).join(' ');
      const attrs = {
        class: cls || null,
        title: lockSort ? '' : '点表头排序',
        onClick: lockSort ? null : () => {
          if (tableState.sortCol === i) tableState.sortDir *= -1;
          else { tableState.sortCol = i; tableState.sortDir = c.desc0 ? -1 : 1; }
          sortTable();
          tableState.page = 1;
          renderTableHead();
          renderTableBody();
        },
      };
      if (c.w) attrs.style = 'width:' + c.w + 'px';
      tr.appendChild(h('th', attrs, c.label + (on ? (tableState.sortDir === 1 ? ' ↑' : ' ↓') : '')));
    });
    els.tableHead.textContent = '';
    els.tableHead.appendChild(tr);
  }

  function renderTableBody() {
    if (!els || !els.tableBody) return;
    renderPager();
    const s = tableState;
    const pageRows = s.rows.slice((s.page - 1) * s.size, s.page * s.size);
    const frag = HDOC.createDocumentFragment();
    const mkTd = (c, col) => {
      const attrs = { title: c && c.title ? c.title : null };
      const cls = [
        c && c.align === 'right' ? 'tglp-num' : '',
        c && c.cls ? c.cls : '',
        col && col.split ? 'tglp-split' : '',
        col && col.cls ? col.cls : '',
      ].filter(Boolean).join(' ');
      if (cls) attrs.class = cls;
      const td = h('td', attrs);
      if (c && c.linkId != null) td.appendChild(charaLink(c.linkId, c.t));
      else if (c && c.node) td.appendChild(c.node);
      else if (c && c.html) td.innerHTML = c.html;
      else td.textContent = c ? c.t : '';
      return td;
    };
    if (!pageRows.length) {
      frag.appendChild(h('tr', null,
        h('td', { colspan: String(s.cols.length || 1), class: 'tglp-empty' }, '没有数据')));
    } else if (s.pair) {
      // 一行多组：pairN=2/4，每条记录 cells 数 = 总列数 / pairN
      const pn = s.pairN || 2;
      for (let i = 0; i < pageRows.length; i += pn) {
        let cells = [];
        for (let k = 0; k < pn; k++) cells = cells.concat(pageRows[i + k] || []);
        const tr = h('tr');
        for (let ci = 0; ci < s.cols.length; ci++) tr.appendChild(mkTd(cells[ci], s.cols[ci]));
        frag.appendChild(tr);
      }
    } else {
      pageRows.forEach((r) => {
        const tr = h('tr');
        r.forEach((c) => tr.appendChild(mkTd(c, null)));
        frag.appendChild(tr);
      });
    }
    els.tableBody.textContent = '';
    els.tableBody.appendChild(frag);
    // 翻页 / 排序 / 切分类后回到列表顶部
    if (els.tableScroll) els.tableScroll.scrollTop = 0;
  }

  function setTableData(cols, rows, desc0, pair) {
    tableState.cols = cols;
    tableState.rows = rows;
    tableState.pairN = pair === true ? 2 : Math.max(1, Math.floor(num(pair) || 1));
    tableState.pair = tableState.pairN > 1;
    tableState.page = 1;
    tableState.sortCol = -1;
    tableState.sortDir = 1;
    if (desc0 != null && cols[desc0]) {
      tableState.sortCol = desc0;
      tableState.sortDir = -1;
      sortTable();
    }
    renderTableHead();
    renderTableBody();
  }

  /** 单个 KPI 卡片 */
  /* ============ 图表卡片：可拖动排序 / 折叠 / 隐藏 ============ */
  let chartKeys = [];        // 当前视角可用的图表 key（含隐藏）
  let lastChartCtx = null;

  function profileCell(label, val, sub, cls) {
    // 副标题只在鼠标悬停时以 tooltip 形式出现（卡片很矮，放不下第三行字）
    return h('div', {
      class: 'tglp-pcell',
      title: sub ? label + '：' + sub : label,
    },
      h('div', { class: 'tglp-plabel' }, label),
      h('div', { class: 'tglp-pval' + (cls ? ' ' + cls : '') }, val),
      h('div', { class: 'tglp-psub' }, sub || ''));
  }

  /** 当前视角有哪些图表卡。col: 'l' 左列 / 'r' 右列（右列 = 资产走势 + 月度趋势，两者总高 = 图表区高） */
  function buildChartDefs(ctx) {
    const { st, cls, pts, diff, view } = ctx;
    const defs = {};
    const topN = (arr, dir, n) => arr
      .filter((x) => (dir === 'loss' ? x.loss : x.gain) > 0)
      .sort((a, b) => (dir === 'loss' ? b.loss - a.loss : b.gain - a.gain))
      .slice(0, n || 10)
      .map((x) => ({ label: charaName(x.id) || '#' + x.id, sum: dir === 'loss' ? x.loss : x.gain }));

    // 基础数据小卡：占左列第一格，内容由 renderLedger 提前填好
    defs.profile = { title: '基础数据', col: 'l', profile: true, body: () => els.profileBox };

    if (view !== 'stock' && view !== 'fixed' && view !== 'star') {
      defs.asset = {
        title: '资产走势', col: 'r',
        body: () => (pts.length
          ? sparkline(pts, diff >= 0 ? 'var(--tl-up)' : 'var(--tl-down)')
          : h('div', { class: 'tglp-cc-empty' }, '暂无走势数据')),
      };
    }

    if (view === 'fund') {
      const outRows = st.fundOut.rows.map((r) => ({ label: fundLabel('out', r.key), sum: r.sum, n: r.n }));
      const inRows = st.fundIn.rows.map((r) => ({ label: fundLabel('in', r.key), sum: r.sum, n: r.n }));
      defs.fundOutChart = {
        title: '资金支出 · 来源占比', col: 'l',
        chartKey: 'out',
        body: () => (outRows.length
          ? (S.fundChartOut === 'donut' ? donutSvg(outRows, '支出合计') : hbarSvg(outRows, null))
          : h('div', { class: 'tglp-cc-empty' }, '这段时间没有支出')),
      };
      defs.fundInChart = {
        title: '资金收入 · 来源占比', col: 'l',
        chartKey: 'in',
        body: () => (inRows.length
          ? (S.fundChartIn === 'donut' ? donutSvg(inRows, '收入合计') : hbarSvg(inRows, null))
          : h('div', { class: 'tglp-cc-empty' }, '这段时间没有收入')),
      };
      defs.monthly = {
        title: '月度收支趋势', col: 'r', monthlyMode: true,
        body: () => monthlySvg(monthlyFlow().slice(-24), S.monthlyMode || 'flow'),
      };
    } else if (view === 'stock') {
      const GAIN_CARD_ORDER = ['buy', 'auction', 'chaos', 'guidepost', 'ico', 'scratch'];
      const orderGainRows = (rows) => {
        const byKey = new Map(rows.map((r) => [r.key, r]));
        const out = [];
        GAIN_CARD_ORDER.forEach((k) => { if (byKey.has(k)) out.push(byKey.get(k)); });
        rows.forEach((r) => { if (GAIN_CARD_ORDER.indexOf(r.key) < 0) out.push(r); });
        return out;
      };
      defs.stockInChart = {
        title: '股数获得', col: 'l',
        body: () => {
          const rows = orderGainRows(stockKindChartRows().gainRows);
          return rows.length
            ? hbarSvg(rows, 'var(--tl-up)')
            : h('div', { class: 'tglp-chempty' }, '暂无股数获得');
        },
      };
      defs.stockOutChart = {
        title: '股数损失', col: 'l',
        body: () => {
          const rows = stockKindChartRows().lossRows;
          return rows.length
            ? hbarSvg(rows, 'var(--tl-down)')
            : h('div', { class: 'tglp-chempty' }, '暂无股数损失');
        },
      };
      defs.gainTop = {
        title: '角色获得排行 · Top 100', col: 'r', pair: true,
        body: () => hbarSvg(topN(cls.chars, 'gain', 100), 'var(--tl-up)'),
      };
      defs.lossTop = {
        title: '角色失去排行 · Top 100', col: 'r', pair: true,
        body: () => hbarSvg(topN(cls.chars, 'loss', 100), 'var(--tl-down)'),
      };
    } else if (view === 'fixed') {
      const hitRows = st.hits.slice().sort((a, b) => b.sum - a.sum).slice(0, 100)
        .map((x) => ({ label: charaName(x.id) || '#' + x.id, sum: x.sum, n: x.n }));
      defs.hitsTop = {
        title: '道标命中 · Top 100', col: 'l',
        body: () => hbarPairSvg(hitRows, null),
      };
      defs.guideLog = {
        title: '道标日志', col: 'r',
        headExtra: () => {
          const logs = guideHitLogs();
          if (!logs.length) return '';
          const total = logs.reduce((s, x) => s + x.amt, 0);
          return fmt(logs.length) + ' 次 · 扣除 ' + fmt(total) + ' 固资';
        },
        body: () => {
          const logs = guideHitLogs();
          if (!logs.length) return h('div', { class: 'tglp-cc-empty' }, '这段时间没有被道标命中');
          const list = h('div', { class: 'tglp-guidehits' });
          logs.forEach((x) => {
            list.appendChild(h('div', { class: 'tglp-guidehit', title: x.desc },
              h('span', { class: 'tglp-gh-time' }, dayStr(x.ts || 0)),
              h('span', { class: 'tglp-gh-desc' }, x.desc),
              h('span', { class: 'tglp-gh-val' }, '-' + fmt(x.amt))));
          });
          return list;
        },
      };
    } else if (view === 'star') {
      const list = S.starMode === 'now' ? (starNowRows || []) : starRangeRows();
      const topRows = starRows(list).slice(0, 100)
        .map((r) => ({ label: charaName(r.id) || '#' + r.id, sum: r.star, n: r.n }));
      defs.starTop = {
        title: '星之力排行 · Top 100', col: 'l',
        body: () => hbarPairSvg(topRows, null),
      };
      defs.starLog = {
        title: '星之力日志', col: 'r',
        headExtra: () => {
          const logs = starGainLogs();
          if (!logs.length) return '';
          const total = logs.reduce((s, x) => s + x.amt, 0);
          return fmt(logs.length) + ' 次 · 合计 ' + fmt(total) + ' 星之力';
        },
        body: () => {
          const logs = starGainLogs();
          if (!logs.length) return h('div', { class: 'tglp-cc-empty' }, '这段时间没有星之力日志');
          const list2 = h('div', { class: 'tglp-guidehits' });
          logs.forEach((x) => {
            list2.appendChild(h('div', { class: 'tglp-guidehit', title: x.desc },
              h('span', { class: 'tglp-gh-time' }, dayStr(x.ts || 0)),
              h('span', { class: 'tglp-gh-desc' }, x.desc),
              h('span', { class: 'tglp-gh-val tglp-starhi' }, '✦ ' + fmt(x.amt))));
          });
          return list2;
        },
      };
    }
    return defs;
  }

  /** 单张图表卡（标题栏只留标题；占比卡多一个「条形 / 环形」小图标） */
  function buildChartCard(key, def) {
    const head = h('div', { class: 'tglp-cc-head' },
      h('span', { class: 'tglp-cc-title', title: def.title }, def.title));
    if (def.headExtra) {
      const extra = def.headExtra();
      if (extra) head.appendChild(h('span', { class: 'tglp-cc-extra' }, extra));
    }
    if (def.chartKey) {
      const isDonut = (def.chartKey === 'out' ? S.fundChartOut : S.fundChartIn) === 'donut';
      const btn = h('button', {
        class: 'tglp-cc-btn', type: 'button',
        title: isDonut ? '当前环形图，点一下换成条形图' : '当前条形图，点一下换成环形图',
      }, isDonut ? '◎' : '☰');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (def.chartKey === 'out') S.fundChartOut = isDonut ? 'bar' : 'donut';
        else S.fundChartIn = isDonut ? 'bar' : 'donut';
        persist();
        if (lastChartCtx) renderCharts(lastChartCtx);
      });
      head.appendChild(btn);
    }
    if (def.monthlyMode) {
      const isNet = (S.monthlyMode || 'flow') === 'net';
      const btn = h('button', {
        class: 'tglp-cc-btn', type: 'button',
        title: isNet ? '当前净值图，点一下换回收支图' : '当前收支图，点一下换成净值图',
      }, isNet ? '净' : '收');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        S.monthlyMode = isNet ? 'flow' : 'net';
        persist();
        if (lastChartCtx) renderCharts(lastChartCtx);
      });
      head.appendChild(btn);
    }
    const body = h('div', { class: 'tglp-cc-body' });
    try { body.appendChild(def.body()); } catch (e) {
      body.appendChild(h('div', { class: 'tglp-cc-empty' }, '渲染失败：' + (e && e.message ? e.message : e)));
    }
    return h('div', {
      class: 'tglp-chartcard' + (def.profile ? ' tglp-card-profile' : ''),
      'data-chart': key,
    }, head, body);
  }

  /** 图表区：左列（基础数据 + 明细类图）/ 右列（资产走势 + 月度趋势，总高 = 图表区高） */
  function renderCharts(ctx) {
    if (!els || !els.chartBox) return;
    const defs = buildChartDefs(ctx);
    const keys = Object.keys(defs);
    chartKeys = keys;
    els.chartBox.textContent = '';
    els.chartBox.classList.toggle('tglp-stock-view', !!ctx && ctx.view === 'stock');
    els.chartBox.classList.toggle('tglp-fixed-view', !!ctx && ctx.view === 'fixed');
    els.chartBox.classList.toggle('tglp-star-view', !!ctx && ctx.view === 'star');
    const colL = h('div', { class: 'tglp-col-l' });
    const colR = h('div', { class: 'tglp-col-r' });
    const colRItems = [];
    let pair = null;
    keys.forEach((key) => {
      const def = defs[key];
      const card = buildChartCard(key, def);
      if (def.col === 'r') { colRItems.push(card); return; }
      if (def.profile) { colL.appendChild(card); return; }
      // 左列的明细类图并排（资金视角就是「支出 | 收入」两张）
      if (!pair) pair = h('div', { class: 'tglp-pair' });
      pair.appendChild(card);
    });
    if (pair) colL.appendChild(pair);
    if (ctx && ctx.view === 'stock' && colRItems.length) {
      const rp = h('div', { class: 'tglp-pair' });
      colRItems.forEach((c) => rp.appendChild(c));
      colR.appendChild(rp);
    } else {
      colRItems.forEach((c) => colR.appendChild(c));
    }
    els.chartBox.appendChild(colL);
    els.chartBox.appendChild(colR);
    if (els.chartCount) els.chartCount.textContent = keys.length + ' 张';
    // 图表区整体折叠态
    if (els.chartBox) els.chartBox.hidden = !!S.chartAreaCollapsed;
    if (els.chartToggle) {
      els.chartToggle.textContent = S.chartAreaCollapsed ? '▸ 图表' : '▾ 图表';
      els.chartToggle.title = S.chartAreaCollapsed ? '展开图表区' : '收起图表区，数据表自动上移';
    }
  }

  function toggleChartArea() {
    S.chartAreaCollapsed = !S.chartAreaCollapsed;
    persist();
    if (els && els.chartBox) els.chartBox.hidden = !!S.chartAreaCollapsed;
    if (els && els.chartToggle) {
      els.chartToggle.textContent = S.chartAreaCollapsed ? '▸ 图表' : '▾ 图表';
      els.chartToggle.title = S.chartAreaCollapsed ? '展开图表区' : '收起图表区，数据表自动上移';
    }
  }

  /* ============ 账本主渲染 ============ */
  function renderLedger() {
    if (!els) return;
    const st = cachedLedgerStats();
    // 收入 / 支出各用一套来源名（同一个 key 两侧叫法不同）
    st.fundIn.rows.forEach((r) => { r.label = fundLabel('in', r.key); });
    st.fundOut.rows.forEach((r) => { r.label = fundLabel('out', r.key); });
    const cls = cachedLogStats();
    const stockRows = logCharRows(cls);
    const view = S.ledgerView === 'stock' || S.ledgerView === 'fixed' || S.ledgerView === 'star' ? S.ledgerView : 'fund';
    const isFund = view === 'fund';
    const mv = holdAll.reduce((s, x) => s + num(x.UserAmount) * num(x.Current), 0);
    const cc = st.cc || (snaps.length ? snaps[snaps.length - 1].cc : 0);

    const win = logWindow;
    const span = win
      ? (win.all ? '全部记录' : `${fmtDay(win.from)} 0:00 ~ ${fmtDay(win.to - 1)} 24:00`)
      : (() => {
          const times = logAll.map((x) => logTs(x.LogTime)).filter(Boolean);
          return times.length ? `${fmtDay(Math.min(...times))} ~ ${fmtDay(Math.max(...times))}` : '';
        })();

    // 和「月度收支趋势」同源：直接按 Change 正负求和（毛额）。
    // 不能用 st.fundIn.total —— 那是扣掉「取消买入返还 / 竞拍失败返还」的净额，和趋势图对不上。
    let income = 0, expense = 0, incomeN = 0, expenseN = 0;
    logAll.forEach((x) => {
      const c = num(x.Change);
      if (c > 0) { income += c; incomeN += 1; }
      else if (c < 0) { expense += -c; expenseN += 1; }
    });
    const net = income - expense;
    const { pts } = assetSeries();
    const first = pts.length ? num(pts[0].v) : 0;
    const last = pts.length ? num(pts[pts.length - 1].v) : 0;
    const diff = last - first;
    const rate = first > 0 ? (diff / first) * 100 : 0;

    /* ---- 视角按钮 / 筛选行显隐 ---- */
    els.segBtns.forEach((b) => b.classList.toggle('tglp-on', b.dataset.view === view));
    els.fundBar.hidden = !isFund;
    els.sortWrap.hidden = view !== 'stock';
    els.starBar.hidden = view !== 'star';

    /* ---- 基础信息卡（一张卡装下所有基础数据） ---- */
    els.profileBox.textContent = '';
    els.profileBox.append(
      profileCell('账户余额', cc > 0 ? '₵' + fmtCc(cc) : '—', '日志推算的最新余额'),
      profileCell('持仓市值', mv > 0 ? '₵' + fmtCc(mv) : '—', holdAll.length ? holdAll.length + ' 只持仓' : '未读到持仓'),
      profileCell('资产合计', (cc || mv) ? '₵' + fmtCc(cc + mv) : '—', '余额 + 持仓市值'),
      profileCell('资金收入', income > 0 ? '+₵' + fmtCc(income) : '—', incomeN + ' 笔', 'tglp-up'),
      profileCell('资金支出', expense > 0 ? '-₵' + fmtCc(expense) : '—', expenseN + ' 笔', 'tglp-down'),
      profileCell('净流入', net ? (net > 0 ? '+' : '-') + '₵' + fmtCc(Math.abs(net)) : '—',
        '收入 − 支出', net >= 0 ? 'tglp-up' : 'tglp-down'),
      profileCell('区间涨幅', pts.length >= 2 ? (rate >= 0 ? '+' : '') + rate.toFixed(2) + '%' : '—',
        pts.length ? (diff >= 0 ? '+' : '-') + '₵' + fmtCc(Math.abs(diff)) : '—',
        diff >= 0 ? 'tglp-up' : 'tglp-down'),
      profileCell('日志记录', fmt(logAll.length) + ' 条',
        logAllRaw.length ? '本地共 ' + fmt(logAllRaw.length) + ' 条' : '点「统计」读取')
    );

    /* ---- 图表卡片 ---- */
    const ctx = { st, cls, stockRows, pts, diff, view, span };
    lastChartCtx = ctx;
    renderCharts(ctx);

    /* ---- 状态行 ---- */
    els.logStat.textContent =
      `${logAll.length} 条记录` + (span ? ` · ${span}` : '') +
      (view === 'stock' ? ` · ${stockRows.count} 个角色有股数变动` : '');

    /* ---- 详细数据表 ---- */
    buildLedgerTable(view, st, cls, stockRows);
  }

  /** 构建当前视角的表格列与行，交给统一分页器 */
  function buildLedgerTable(view, st, cls, stockRows) {
    let cols = [], rows = [], desc0 = -1, pairMode = false;
    if (view === 'fund') {
      const dir = els.fundDir === 'in' ? 'in' : 'out';
      const key = els.fundKey || 'all';
      const mode = S.fundMode === 'role' ? 'role' : 'detail';
      const data = fundDrill(dir, key, mode);
      const kindLabel = key === 'all' ? '全部来源' : fundLabel(dir, key);
      els.logStat.textContent += ` · ${dir === 'in' ? '收入' : '支出'} / ${kindLabel}` +
        (mode === 'role' ? ` · ${data.length} 个角色` : ` · ${data.length} 笔`);
      if (mode === 'detail' && data.length >= DETAIL_LIMIT) {
        els.logStat.textContent += ` · 明细仅显示最近 ${DETAIL_LIMIT / 10000} 万条（图表/汇总仍为全量）`;
      }
      const roleCell = (r) => (r.id
        ? cellLink(r.id, r.name || charaName(r.id))
        : cellText(r.name || '—'));
      const flatRole = (dir === 'out' && (key === 'other' || key === 'scratch')) ||
        (dir === 'in' && ['dividend', 'aucbonus', 'lotto', 'refer', 'welfare', 'checkin'].includes(key));
      const pairRoleIn = dir === 'in' && ['sell', 'sacrifice', 'ico', 'packet'].includes(key);
      if (mode === 'role') {
        // 合计型来源：只显示笔数、金额，合计成一笔
        if (flatRole) {
          cols = [
            { label: '笔数', w: 80, align: 'right' },
            { label: '金额', desc0: true, w: 140, align: 'right', cls: 'tglp-gap-r' },
            { label: '', nosort: true },
          ];
          rows = data.map((r) => [
            cellNum(r.n, fmt(r.n) + ' 笔'),
            cellNum(r.sum, (dir === 'in' ? '+₵' : '-₵') + fmtCc(r.sum),
              { cls: dir === 'in' ? 'tglp-up' : 'tglp-down' }),
            cellText(''),
          ]);
          desc0 = 1;
        } else if (dir === 'out' || pairRoleIn) {
        // 角色汇总：角色 / 笔数 / 占比 / 金额 ×2，默认按金额从高到低
          cols = [
            { label: '角色', w: 180, nosort: true, cls: 'tglp-gap' },
            { label: '笔数', w: 80, align: 'right' }, { label: '占比', w: 90, align: 'right' },
            { label: '金额', desc0: true, w: 140, align: 'right', cls: 'tglp-gap-r' },
            { label: '角色', w: 180, nosort: true, cls: 'tglp-gap', split: true },
            { label: '笔数', w: 80, align: 'right', nosort: true },
            { label: '占比', w: 90, align: 'right', nosort: true },
            { label: '金额', w: 140, align: 'right', nosort: true, cls: 'tglp-gap-r' },
          ];
          rows = data.map((r) => [
            roleCell(r),
            cellNum(r.n, fmt(r.n) + ' 笔'),
            cellNum((r.pct || 0) * 100, ((r.pct || 0) * 100).toFixed(1) + '%'),
            cellNum(r.sum, (dir === 'in' ? '+₵' : '-₵') + fmtCc(r.sum),
              { cls: dir === 'in' ? 'tglp-up' : 'tglp-down' }),
          ]);
          desc0 = 3;
          pairMode = true;
        } else {
          // 收入其他：单栏
          cols = [
            { label: '角色', w: 200, nosort: true, cls: 'tglp-gap' },
            { label: '笔数', w: 84, align: 'right' },
            { label: '占比', w: 88, align: 'right' }, { label: '金额', desc0: true, w: 140, align: 'right', cls: 'tglp-gap-r' },
          ];
          rows = data.map((r) => [
            roleCell(r),
            cellNum(r.n, fmt(r.n) + ' 笔'),
            cellNum((r.pct || 0) * 100, ((r.pct || 0) * 100).toFixed(1) + '%'),
            cellNum(r.sum, '+₵' + fmtCc(r.sum), { cls: 'tglp-up' }),
          ]);
          desc0 = 3;
        }
      } else if (dir === 'in') {
        const keepShares = key === 'all' || ['sell', 'sacrifice'].includes(key);
        const keepRole = key === 'all' || ['sell', 'sacrifice', 'ico'].includes(key);
        const descW = keepRole ? 532 : 662;
        cols = [
          { label: '时间', desc0: true, w: 90 },
          { label: '来源', w: 96, nosort: true },
          ...(keepRole ? [{ label: '角色', w: 130, nosort: true }] : []),
          { label: '描述', w: descW, nosort: true },
          { label: '金额', w: 112, align: 'right' },
          ...(keepShares ? [{ label: '', w: 30, nosort: true }, { label: '股数', w: 78, align: 'right' }] : []),
          { label: '', nosort: true },
        ];
        rows = data.map((r) => {
          const cells = [
            cellText(r.ts ? dayStr(r.ts) : '—', { num: r.ts }),
            cellText(r.label || fundLabel(dir, r.key)),
          ];
          if (keepRole) cells.push(r.id ? cellLink(r.id, charaName(r.id)) : cellText('—'));
          cells.push(cellText(r.desc || '', { title: r.desc || '' }));
          cells.push(cellNum(r.val, '+₵' + fmtCc(r.val), { cls: 'tglp-up' }));
          if (keepShares) { cells.push(cellText('')); cells.push(cellNum(r.shares, r.shares ? fmt(r.shares) : '—')); }
          cells.push(cellText(''));
          return cells;
        });
        desc0 = 0;
      } else {
        // 支出明细：金额在描述之后（表格右侧，对应右上角「方向」控件所在区域）；股数一律不要。
        // 红包 / 刮刮乐 / 印花税：没有角色，一行两组，每组「时间 / 金额 / 描述」。
        const noRole = ['scratch', 'other', 'packet', 'fee', 'stamp'].includes(key);
        const pairView = ['packet', 'scratch', 'stamp'].includes(key);
        if (pairView) {
          cols = [
            { label: '时间', w: 90, nosort: true }, { label: '描述', nosort: true },
            { label: '金额', w: 112, align: 'right', nosort: true, cls: 'tglp-gap-r2' },
            { label: '时间', w: 90, nosort: true, split: true }, { label: '描述', nosort: true },
            { label: '金额', w: 112, align: 'right', nosort: true, cls: 'tglp-gap-r2' },
          ];
          rows = data.map((r) => [
            cellText(r.ts ? dayStr(r.ts) : '—', { num: r.ts }),
            cellText(r.desc || '', { title: r.desc || '' }),
            cellNum(r.val, '-₵' + fmtCc(r.val), { cls: 'tglp-down' }),
          ]);
          desc0 = -1;
          pairMode = true;
        } else {
          const descW = noRole ? 662 : 532;
          cols = [
            { label: '时间', desc0: true, w: 90 },
            { label: '来源', w: 96, nosort: true },
            ...(noRole ? [] : [{ label: '角色', w: 130, nosort: true }]),
            { label: '描述', w: descW, nosort: true },
            { label: '金额', w: 112, align: 'right' },
            { label: '', nosort: true },
          ];
          rows = data.map((r) => {
            const cells = [
              cellText(r.ts ? dayStr(r.ts) : '—', { num: r.ts }),
              cellText(r.label || fundLabel(dir, r.key)),
              r.id ? cellLink(r.id, charaName(r.id)) : cellText('—'),
              cellText(r.desc || '', { title: r.desc || '' }),
              cellNum(r.val, '-₵' + fmtCc(r.val), { cls: 'tglp-down' }),
            ];
            if (noRole) cells.splice(2, 1);
            cells.push(cellText(''));
            return cells;
          });
          desc0 = 0;
        }
      }
    } else if (view === 'stock') {
      const dir = stockRows.dir;
      const kind = stockRows.kind || 'all';
      const list = STOCK_FILTERS[dir];
      const pick = list.filter((r) => r[0] === kind)[0];
      const isGain = dir === 'gain';
      if (kind === 'all') {
        // 全部：角色 / 获得 / 失去 / 净值 ×2，默认净值降序
        cols = [
          { label: '角色', w: 180, nosort: true, cls: 'tglp-gap' },
          { label: '获得', w: 80, align: 'right' },
          { label: '失去', w: 90, align: 'right' },
          { label: '净值', desc0: true, w: 140, align: 'right', cls: 'tglp-gap-r' },
          { label: '角色', w: 180, nosort: true, cls: 'tglp-gap', split: true },
          { label: '获得', w: 80, align: 'right', nosort: true },
          { label: '失去', w: 90, align: 'right', nosort: true },
          { label: '净值', w: 140, align: 'right', nosort: true, cls: 'tglp-gap-r' },
        ];
        rows = stockRows.rows.map((x) => {
          const net = x.gain - x.loss;
          return [
            cellLink(x.id, charaName(x.id)),
            cellNum(x.gain, x.gain ? fmt(x.gain) : '—'),
            cellNum(x.loss, x.loss ? fmt(x.loss) : '—'),
            cellNum(net, (net >= 0 ? '+' : '') + fmt(net), { cls: net >= 0 ? 'tglp-up' : 'tglp-down' }),
          ];
        });
        desc0 = 3;
        pairMode = 2;
      } else if (isGain && (kind === 'ico' || kind === 'buy')) {
        // ICO / 买入：角色 / 值 ×4，一行四组
        const label = kind === 'ico' ? 'ICO' : '买入';
        cols = [
          { label: '角色', nosort: true }, { label, desc0: true, w: 90, align: 'right' },
          { label: '角色', nosort: true }, { label, w: 90, align: 'right' },
          { label: '角色', nosort: true }, { label, w: 90, align: 'right' },
          { label: '角色', nosort: true }, { label, w: 90, align: 'right' },
        ];
        rows = stockRows.rows.map((x) => {
          const v = num(x.gainBy && x.gainBy[kind]);
          return [cellLink(x.id, charaName(x.id)), cellNum(v, v ? fmt(v) : '—')];
        });
        desc0 = 1;
        pairMode = 4;
      } else {
        // 获得 / 失去的具体分类：角色 / 次数 / 分类值 ×4，一行四组
        const label = pick ? pick[1] : '当前值';
        const vKey = isGain ? 'gainBy' : 'lossBy';
        const nKey = isGain ? 'gainNBy' : 'lossNBy';
        const gcol = (first) => [
          { label: '角色', nosort: true },
          { label: '次数', w: 104, align: 'right', cls: 'tglp-gap-r2' },
          { label, w: 110, align: 'right', cls: 'tglp-gap-l tglp-gap-r', desc0: first },
        ];
        cols = [...gcol(true), ...gcol(false), ...gcol(false), ...gcol(false)];
        rows = stockRows.rows.map((x) => {
          const v = num(x[vKey] && x[vKey][kind]);
          const n = num(x[nKey] && x[nKey][kind]);
          const signed = (isGain ? '+' : '-') + fmt(v);
          const signedKind = kind === 'chaos' || kind === 'guidepost';
          return [
            cellLink(x.id, charaName(x.id)),
            cellNum(n, n ? fmt(n) + ' 次' : '—'),
            cellNum(v, v ? (signedKind ? signed : fmt(v)) : '—',
              { cls: signedKind ? (isGain ? 'tglp-up' : 'tglp-down') : '' }),
          ];
        });
        desc0 = 2;
        pairMode = 4;
      }
    } else if (view === 'fixed') {
      const gcol = (first) => [
        { label: '角色', nosort: true },
        { label: '命中次数', w: 104, align: 'right', cls: 'tglp-gap-r2' },
        { label: '扣除固资', w: 110, align: 'right', cls: 'tglp-gap-l tglp-gap-r', desc0: first },
      ];
      cols = [...gcol(true), ...gcol(false), ...gcol(false), ...gcol(false)];
      rows = st.hits.map((x) => [
        cellLink(x.id, charaName(x.id)),
        cellNum(x.n, fmt(x.n) + ' 次'),
        cellNum(x.sum, x.sum > 0 ? '-₵' + fmtCc(x.sum) : '—', { cls: 'tglp-down' }),
      ]);
      desc0 = 2;
      pairMode = 4;
    } else if (view === 'star') {
      const now = S.starMode === 'now';
      const list = now ? (starNowRows || []) : starRangeRows();
      const rows2 = starRows(list);
      const flt = STAR_FILTERS.filter((r) => r[0] === S.starFilter)[0];
      const fltLabel = S.starFilter === 'custom'
        ? `自定义 ${num(S.starMin) || 0} ~ ${num(S.starMax) > 0 ? num(S.starMax) : '∞'}`
        : (flt ? flt[1] : '全部');
      const total = rows2.reduce((s, r) => s + r.star, 0);
      els.logStat.textContent = (now ? '当前所有塔的星之力' : `${logAll.length} 条记录 · ${spanSafe()}`) +
        ` · ${rows2.length} 个角色` + (S.starFilter === 'all' ? '' : ` · 只看「${fltLabel}」`) +
        ` · 合计 ${fmt(total)}`;
      const nMap = now ? new Map(starRangeRows().map((r) => [r.id, r.n])) : null;
      const gcol = (first) => [
        { label: '角色', nosort: true },
        { label: '次数', w: 104, align: 'right', cls: 'tglp-gap-r2' },
        { label: '星之力', w: 110, align: 'right', cls: 'tglp-gap-l tglp-gap-r', desc0: first },
      ];
      cols = [...gcol(true), ...gcol(false), ...gcol(false), ...gcol(false)];
      rows = rows2.map((x) => {
        const n = now ? (nMap.get(x.id) || 0) : x.n;
        return [
          cellLink(x.id, charaName(x.id)),
          cellNum(n, n ? fmt(n) + ' 次' : '—'),
          cellNum(x.star, '✦ ' + fmt(x.star), {
            cls: x.star >= 10000 ? 'tglp-starhi' : x.star > 0 ? 'tglp-starmid' : 'tglp-starlow',
          }),
        ];
      });
      desc0 = 2;
      pairMode = 4;
      // 名字缺失时补一次（沿用原文逻辑）
      if (!starNameBusy) {
        const miss = [...new Set(rows2.map((r) => r.id))].filter((id) => !nameCache[String(id)]);
        if (miss.length) {
          starNameBusy = true;
          loadNames(miss, false, { always: true })
            .then(() => { starNameBusy = false; if (S.ledgerView === 'star' && els) renderLedger(); })
            .catch(() => { starNameBusy = false; });
        }
      }
    }
    tableState.size = num(S.tableSize) || TABLE_SIZE_DEFAULT;
    setTableData(cols, rows, desc0, pairMode);
  }

  function spanSafe() {
    const w = logWindow;
    return w ? `${fmtDay(w.from)} ~ ${fmtDay(w.to - 1)}` : '';
  }

  /* ============ 面板壳（v1.1.0 大面板 + 两栏布局） ============ */
  function buildUI() {
    const lDays = select('tglp-ldays', [
      ['all', '全部'], ['3', '近 3 天'], ['7', '近 7 天'], ['14', '近 14 天'], ['30', '近 30 天'], ['custom', '自定义'],
    ], String(S.logDays));
    const lFrom = h('input', {
      id: 'tglp-lfrom', type: 'date',
      value: S.logFrom || dayStr(dayStartMs(6)), title: '起始日（含当天 0:00）',
    });
    const lTo = h('input', {
      id: 'tglp-lto', type: 'date',
      value: S.logTo || dayStr(dayStartMs(0)), title: '结束日（含当天 24:00）',
    });
    const lRangeWrap = h('span', { class: 'tglp-inline' }, lFrom, h('i', null, '~'), lTo);
    const syncRange = () => { lRangeWrap.hidden = String(S.logDays) !== 'custom'; };
    syncRange();

    const lDir = select('tglp-ldir', [['gain', '获得'], ['loss', '失去']], S.logDir === 'loss' ? 'loss' : 'gain');
    const lKind = h('select', { id: 'tglp-lkind' });
    const syncKindOpts = () => {
      const list = STOCK_FILTERS[S.logDir === 'loss' ? 'loss' : 'gain'];
      lKind.textContent = '';
      list.forEach((r) => lKind.appendChild(h('option', { value: r[0] }, r[1])));
      if (!list.some((r) => r[0] === S.logKind)) S.logKind = 'all';
      lKind.value = S.logKind;
    };
    syncKindOpts();

    // v1.1.0：显示数量放开到全部（含「全部」选项）
    const lTop = select('tglp-ltop', [
      ['10', '10 个'], ['20', '20 个'], ['50', '50 个'], ['100', '100 个'],
      ['200', '200 个'], ['500', '500 个'], ['1000', '1000 个'], ['all', '全部'],
    ], String(S.logTop));

    // 资金视角专用：方向 / 来源下钻 / 明细模式 / 图表切换
    const fDir = select('tglp-fdir', [['out', '支出'], ['in', '收入']], 'out');
    const fKind = select('tglp-fkind', [['all', '全部来源']], 'all');
    const fMode = select('tglp-fmode', [['detail', '逐笔明细'], ['role', '汇总']], S.fundMode || 'detail');
    // 「全部来源」不支持汇总：只能逐笔看
    const syncFundMode = () => {
      const all = (els.fundKey || 'all') === 'all';
      fMode.disabled = all;
      if (all && S.fundMode === 'role') {
        S.fundMode = 'detail';
        fMode.value = 'detail';
        persist();
      }
    };
    const fundBar = h('div', { class: 'tglp-line tglp-logfilter' },
      h('span', { class: 'tglp-label' }, '方向'), fDir,
      h('span', { class: 'tglp-label' }, '来源'), fKind,
      h('span', { class: 'tglp-label' }, '明细'), fMode);

    const starModeSel = select('tglp-starmode', [['range', '时间范围'], ['now', '当前总量']], S.starMode === 'now' ? 'now' : 'range');
    const starFilterSel = select('tglp-starfilter',
      STAR_FILTERS.map((r) => [r[0], r[1]]).concat([['custom', '自定义']]),
      S.starFilter || 'all');
    const starMinInp = h('input', {
      class: 'tglp-starcustom', type: 'number', min: '0', placeholder: '最小',
      value: S.starMin == null ? '' : String(S.starMin),
    });
    const starMaxInp = h('input', {
      class: 'tglp-starcustom', type: 'number', min: '0', placeholder: '最大',
      value: S.starMax == null ? '' : String(S.starMax),
    });
    const starCustomWrap = h('span', { class: 'tglp-starwrap' },
      starMinInp, h('span', { class: 'tglp-starsep' }, '~'), starMaxInp);
    starCustomWrap.hidden = (S.starFilter || 'all') !== 'custom';
    const starBar = h('div', { class: 'tglp-line tglp-logfilter' },
      h('span', { class: 'tglp-label' }, '统计'), starModeSel,
      h('span', { class: 'tglp-label' }, '筛选'), starFilterSel, starCustomWrap);

    const lRun = h('button', { class: 'tglp-btn tglp-primary', type: 'button' }, '统计');
    const lCopy = h('button', { class: 'tglp-btn', type: 'button' }, '复制');
    /* 基础信息卡：一张卡装下所有基础数据 */
    const profileBox = h('div', { class: 'tglp-profile' });
    /* 图表卡片区 */
    const chartBox = h('div', { class: 'tglp-charts' });
    const chartCount = h('span', { class: 'tglp-chartcount' });
    const chartToggle = h('button', {
      class: 'tglp-btn', type: 'button',
      title: '显示/隐藏图表区',
    }, '▾ 图表');
    const logStat = h('div', { class: 'tglp-stat' }, '读取自己的资金日志，按资金 / 股数 / 固资三个维度归类');
    const pageSizeSel = select('tglp-pagesize', [
      ['20', '20 / 页'], ['50', '50 / 页'], ['100', '100 / 页'], ['200', '200 / 页'], ['500', '500 / 页'],
    ], String(S.tableSize || TABLE_SIZE_DEFAULT));
    const pager = h('div', { class: 'tglp-pager' });
    const tableHead = h('thead');
    const tableBody = h('tbody');
    const tableEl = h('table', { class: 'tglp-table' }, tableHead, tableBody);
    const tableScroll = h('div', { class: 'tglp-tablescroll' }, tableEl);
    const segBtns = [['fund', '资金'], ['stock', '股数'], ['fixed', '圣殿'], ['star', '星之力']]
      .map(([k, t]) => h('button', { class: 'tglp-segbtn', type: 'button', 'data-view': k }, t));
    const segWrap = h('div', { class: 'tglp-seg' }, segBtns);
    const sortWrap = h('div', { class: 'tglp-line tglp-logfilter' },
      h('span', { class: 'tglp-label' }, '分类'), lDir,
      h('span', { class: 'tglp-label' }, '类型'), lKind,

      h('span', { class: 'tglp-label' }, '显示'), lTop);

    const themeBtn = h('button', { class: 'tglp-iconbtn', type: 'button', title: '切换日夜模式' }, S.theme === 'light' ? '☾' : '☀');
    const closeBtn = h('button', { class: 'tglp-close', type: 'button', title: '关闭' }, '×');

    /* 顶栏：范围 / 统计 / 复制 / 视角 全在一条线上，把竖向空间全部让给数据 */
    const acctEl0 = h('span', { class: 'tglp-user' });
    acctEl = acctEl0;
    setAcctLabel(accountName);

    const acctBtn = h('button', { class: 'tglp-iconbtn tglp-acctbtn', type: 'button', title: '账号管理' }, '账号');
    acctMenu = h('div', { class: 'tglp-acctmenu' });
    acctMenu.hidden = true;
    acctBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      acctMenu.hidden = !acctMenu.hidden;
      if (!acctMenu.hidden) renderAcctMenu();
    });
    HDOC.addEventListener('click', (e) => {
      if (!acctMenu || acctMenu.hidden) return;
      if (acctMenu.contains(e.target) || e.target === acctBtn) return;
      acctMenu.hidden = true;
    });

    const topbar = h('div', { class: 'tglp-topbar' },
      h('span', { class: 'tglp-brand' }, '小圣杯账本2.0'),
      acctEl0,
      acctBtn,
      acctMenu,
      line('范围', lDays, lRangeWrap),
      h('span', { class: 'tglp-line' }, lRun, lCopy, chartToggle),
      h('span', { style: 'flex:1 1 auto;min-width:0' }),
      segWrap,
      themeBtn, closeBtn);

    /* 详细数据表：筛选行 + 表头 + 分页 */
    const tableBar = h('div', { class: 'tglp-tablebar' },
      h('span', null, logStat),
      h('div', { class: 'tglp-line tglp-actions' },
        fundBar, sortWrap, starBar,
        h('span', { class: 'tglp-label' }, '每页'), pageSizeSel));
    const tableWrap = h('div', { class: 'tglp-tablewrap' },
      tableBar, tableScroll, pager);

    /* 主体：基础信息卡 → 图表卡片 → 详细数据表 */
    const main = h('div', { class: 'tglp-main' },
      chartBox,
      tableWrap,
      );

    const panel = h('section', { id: 'tglp-panel', hidden: 'hidden', 'data-theme': S.theme === 'light' ? 'light' : 'dark' },
      h('div', { class: 'tglp-body' }, topbar, main));
    HDOC.body.appendChild(panel);

    themeBtn.addEventListener('click', () => {
      S.theme = S.theme === 'light' ? 'dark' : 'light';
      panel.setAttribute('data-theme', S.theme);
      themeBtn.textContent = S.theme === 'light' ? '☾' : '☀';
      persist();
    });
    closeBtn.addEventListener('click', () => { panel.hidden = true; });

    els = {
      panel, lDays, lFrom, lTo, lRangeWrap, lDir, lKind, lTop,
      lRun, lCopy, profileBox, chartBox, chartCount, chartToggle,
      segBtns, sortWrap, starBar,
      starModeSel, starFilterSel, logStat,
      fundBar, fDir, fKind, fMode,
      pageSizeSel, pager, tableHead, tableBody, tableScroll,
      fundDir: 'out', fundKey: 'all', // 当前下钻方向与来源（点来源条会改）
    };

    /* 图表卡片工具条：已隐藏列表 / 恢复默认布局 */
    chartToggle.addEventListener('click', toggleChartArea);

    // 面板是点悬浮球才懒构建的：loadLocal() 在页面加载时就跑了，那会儿 els 还是空的，
    // 数据读进来却没处画。构建面板后若已有本地数据，立刻补一次渲染（秒开）。
    if (logAllRaw.length || logAll.length) {
      applyWindow();
      renderLedger();
      if (logAll.length) loadNames([...new Set(logAll.map(logCharaId).filter(Boolean))]);
    }

    /* ---- 交互（沿用工具箱账本） ---- */
    lDays.addEventListener('change', () => {
      if (lDays.value === 'custom') {
        S.logDays = 'custom';
        if (!S.logFrom) S.logFrom = dayStr(dayStartMs(6));
        if (!S.logTo) S.logTo = dayStr(dayStartMs(0));
        lFrom.value = S.logFrom; lTo.value = S.logTo;
      } else if (lDays.value === 'all') {
        S.logDays = 'all';
        S.logFrom = ''; S.logTo = '';
      } else S.logDays = num(lDays.value) || 7;
      syncRange();
      persist();
      applyWindow();
      if (logAll.length) renderLedger();
      else setLogStatus('本地没有这段时间的数据，点「统计」补读');
    });
    [lFrom, lTo].forEach((inp) => inp.addEventListener('change', () => {
      if (lFrom.value && lTo.value && lFrom.value > lTo.value) {
        const t = lFrom.value; lFrom.value = lTo.value; lTo.value = t;
      }
      S.logFrom = lFrom.value || ''; S.logTo = lTo.value || '';
      persist(); applyWindow();
      if (logAll.length) renderLedger();
      else setLogStatus('本地没有这段时间的数据，点「统计」补读');
    }));
    lDir.addEventListener('change', () => {
      S.logDir = lDir.value === 'loss' ? 'loss' : 'gain';
      syncKindOpts(); lKind.value = S.logKind; persist();
      if (logAll.length) renderLedger();
    });
    lKind.addEventListener('change', () => { S.logKind = lKind.value || 'all'; persist(); if (logAll.length) renderLedger(); });

    lTop.addEventListener('change', () => { S.logTop = lTop.value === 'all' ? 'all' : (num(lTop.value) || 20); persist(); if (logAll.length) renderLedger(); });
    pageSizeSel.addEventListener('change', () => {
      S.tableSize = num(pageSizeSel.value) || TABLE_SIZE_DEFAULT;
      tableState.size = S.tableSize;
      tableState.page = 1;
      persist();
      renderTableBody();
    });

    /* ---- 资金视角下钻 / 图表切换 ---- */
    const syncFundKinds = () => {
      const dir = els.fundDir;
      const allowed = dir === 'in' ? FUND_IN_KINDS : FUND_OUT_KINDS;
      fKind.textContent = '';
      fKind.appendChild(h('option', { value: 'all' }, '全部来源'));
      allowed.forEach((k) => fKind.appendChild(h('option', { value: k }, fundLabel(dir, k))));
      fKind.value = els.fundKey || 'all';
      syncFundMode();
    };
    syncFundKinds();
    fDir.addEventListener('change', () => {
      els.fundDir = fDir.value === 'in' ? 'in' : 'out';
      els.fundKey = 'all';
      syncFundKinds();
      if (logAll.length) renderLedger();
    });
    fKind.addEventListener('change', () => {
      els.fundKey = fKind.value || 'all';
      syncFundMode();
      if (logAll.length) renderLedger();
    });
    fMode.addEventListener('change', () => { S.fundMode = fMode.value === 'role' ? 'role' : 'detail'; persist(); if (logAll.length) renderLedger(); });

    const renderStar = () => {
      if (S.starMode === 'now' && !starNowRows) {
        els.logStat.textContent = '读取当前星之力…';
        loadStarNow(true).then(() => renderLedger()).catch((e) => {
          els.logStat.textContent = '读星之力失败：' + (e && e.message ? e.message : e);
        });
        return;
      }
      renderLedger();
    };
    starModeSel.addEventListener('change', () => { S.starMode = starModeSel.value === 'now' ? 'now' : 'range'; persist(); renderStar(); });
    starFilterSel.addEventListener('change', () => {
      S.starFilter = starFilterSel.value || 'all';
      starCustomWrap.hidden = S.starFilter !== 'custom';
      persist(); if (logAll.length || starNowRows) renderLedger();
    });
    const onStarRange = () => {
      S.starMin = num(starMinInp.value) || 0;
      S.starMax = num(starMaxInp.value) || 0;
      persist(); if (logAll.length || starNowRows) renderLedger();
    };
    starMinInp.addEventListener('change', onStarRange);
    starMaxInp.addEventListener('change', onStarRange);
    segBtns.forEach((b) => b.addEventListener('click', () => {
      S.ledgerView = b.dataset.view || 'fund';
      persist();
      if (S.ledgerView === 'star') renderStar();
      else if (logAll.length) renderLedger();
      else renderLedger(); // 没数据时也要按视角清屏 / 显示 fundBar
    }));
    lRun.addEventListener('click', scanLogs);
    lCopy.addEventListener('click', copyLogs);
  }

  function togglePanel() {
    if (!els) return;
    els.panel.hidden = !els.panel.hidden;
  }

  /* ============ 启动：入口挂在 bgm「个性化」面板，不再用悬浮胶囊 ============
   * 用 chiiLib.ukagaka.addPanelTab 注册一个专属 Tab（type:'custom'），
   * 里面放一个「打开账本」按钮；点它才构建面板（懒构建，省性能）。
   * 个性化面板的脚本可能比组件晚就绪 → 轮询等待 chiiLib.ukagaka。
   */
  const PANEL_TAB = 'tglp_ledger';
  async function openLedger() {
    if (!els) buildUI();
    els.panel.hidden = false;
    // 打开面板时才校验账号、读本地存档、拉持仓：平时不占 IO / 内存。
    const acc = await checkAccount();
    await ensureLocal();
    loadHoldings();
    renderLedger();
    if (acc && acc.switched) setTimeout(() => scanLogs(), 300);
  }

  function registerCustomizeTab(tries) {
    const uk = (function () {
      try { return HWIN.chiiLib && HWIN.chiiLib.ukagaka; } catch (e) { return null; }
    })();
    if (!uk || typeof uk.addPanelTab !== 'function') {
      // chiiLib 还没就绪，最多等约 10 秒（50 × 200ms）
      if ((tries || 0) < 50) HWIN.setTimeout(() => registerCustomizeTab((tries || 0) + 1), 200);
      return;
    }
    try {
      // 重复注册会累加 Tab：先按文档移除同名 Tab（幂等）
      if (typeof uk.removePanelTab === 'function') {
        try { uk.removePanelTab(PANEL_TAB); } catch (e) {}
      }
      uk.addPanelTab({
        tab: PANEL_TAB,
        label: '小圣杯账本2.0',
        type: 'custom',
        customContent: function () {
          return '<div class="tglp-entry">' +
            '<div class="tglp-entry-h">小圣杯账本2.0</div>' +
            '<div class="tglp-entry-d">全量资金日志 · 本地长期记忆 · 不设页数上限</div>' +
            '<button type="button" class="tglp-entry-btn" id="tglp-entry-open">打开账本</button>' +
            '<div class="tglp-entry-m" id="tglp-entry-meta"></div>' +
            '</div>';
        },
        onInit: function (tabSelector, $tabContent) {
          try {
            $tabContent.off('click', '#tglp-entry-open').on('click', '#tglp-entry-open', function (e) {
              e.preventDefault();
              openLedger();
            });
            const meta = $tabContent.find('#tglp-entry-meta');
            if (meta && meta.length) {
              const owner = getOwner();
              if (!owner) meta.text('还没有本地存档');
              else Store.countOf(owner).then((n) => {
                try {
                  if (meta && meta.length) meta.text(n ? `本地已存 ${n} 条记录（账号 ${owner}）` : '还没有本地存档');
                } catch (e) {}
              }).catch(() => {});
            }
          } catch (e) {}
        },
      });
    } catch (e) {}
  }

  let started = false;
  async function boot() {
    if (started) return;
    started = true;
    // 组件会被注入到顶层页和同源 iframe 各一次（乐园页就是这种结构）。
    // 面板只挂一份：顶层 window 抢全局令牌，后来的实例直接退出。
    try {
      const top = HWIN.top || HWIN;
      if (top.__TGLP_UI_OWNER__ && top.__TGLP_UI_OWNER__ !== HWIN) return;
      top.__TGLP_UI_OWNER__ = HWIN;
    } catch (e) {}

    const style = HDOC.createElement('style');
    style.id = 'tglp-style';
    style.textContent = CSS + '\n' + CSS_EXTRA;
    (HDOC.head || HDOC.documentElement).appendChild(style);

    // 启动只注册入口，不读全量日志、不拉持仓：账本没打开时不占 IO / 内存。
    // 入口上的条数用 count 查询；真正的 loadLocal + loadHoldings 放在 openLedger 里。
    registerCustomizeTab(0);

    // Alt+L 兜底唤出（入口失效时仍可打开）。不用 Alt+T：工具箱的悬浮胶囊也用 Alt+T，
    // 两个组件同时启用时按一下会同时弹出两个面板。
    HWIN.addEventListener('keydown', (e) => {
      if (e.altKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        openLedger();
      }
    });
  }

  /* ============ 测试钩子 ============ */
  try {
    if (location.protocol === 'file:' || /[?&]tglp-test=1/.test(location.search)) {
      HWIN.__TGLP_T__ = {
        boot, scanLogs, logRange, applyWindow, ledgerStats, logStats, logKey,
        buildUI, togglePanel, openLedger, registerCustomizeTab, loadLocal, renderLedger,
        fundDrill, monthlyFlow, fundKindOf, hbarSvg, donutSvg, monthlySvg,
        gotoPage, pageCount,
        storeAll: () => Store.all(), storeReady: () => Store.ready,
        storeClear: () => Store.clear(),
        storePut: (list) => Store.put(list),
        account: () => accountName,
        applyAccount, resolveAccountName, checkAccount, listAccounts, deleteAccount,
        storeAccount: () => Store.accountKey,
        getMeta: (k, d) => Store.getMeta(k, d),
        setMeta: (k, v) => Store.setMeta(k, v),
        table: () => ({
          cols: tableState.cols.length, rows: tableState.rows.length,
          page: tableState.page, size: tableState.size, pages: pageCount(),
          pair: !!tableState.pair, pairN: tableState.pairN || 1,
          bodyRows: els && els.tableBody ? els.tableBody.children.length : 0,
        }),
        tableRows: () => tableState.rows.map((r) => r.map((c) => (c && c.num !== undefined ? c.num : (c && c.t)))),
        profile: () => (els && els.profileBox ? els.profileBox.children.length : 0),
        charts: () => (els && els.chartBox ? Array.prototype.map.call(els.chartBox.children, (n) => n.getAttribute('data-chart')) : []),
        toggleChartArea, buildChartDefs, fundLabel, logCharaId, fundKindOf,
        learnNamesFromDesc, charaName, logRoleWho, monthlyFlow, stockKindChartRows, guideHitLogs, hbarPairSvg,
        cachedLedgerStats, invalidateStatsCache, bucketStats, refreshStatBuckets, initStatBuckets,
        statBucketsInfo: () => (statBuckets ? {
          count: statBuckets.count, days: Object.keys(statBuckets.days || {}).length,
          anchorT: statBuckets.anchorT,
        } : null),
        setView: (v) => { S.ledgerView = v; persist(); renderLedger(); },
        setStock: (dir, kind) => { S.logDir = dir; S.logKind = kind || 'all'; persist(); renderLedger(); },
        chartArea: () => ({
          collapsed: !!S.chartAreaCollapsed,
          hidden: !!(els && els.chartBox && els.chartBox.hidden),
          cols: els && els.chartBox ? els.chartBox.children.length : 0,
          keys: chartKeys.slice(),
        }),
        state: () => ({
          raw: logAllRaw.length, n: logAll.length,
          panel: !!(els && els.panel && !els.panel.hidden),
          status: els ? els.logStat.textContent : '',
        }),
        setRange: (from, to, days) => {
          S.logDays = days === undefined ? 'custom' : days;
          if (from !== undefined) S.logFrom = from;
          if (to !== undefined) S.logTo = to;
          applyWindow();
        },
        clearLocal: () => { logAllRaw = []; logAll = []; },
      };
    }
  } catch (e) {}

  if (HDOC.readyState === 'loading') HDOC.addEventListener('DOMContentLoaded', boot);
  else boot();
  /* 原文后部还有一份 spanSafe，最后再声明一次确保覆盖（全部范围显示「全部记录」） */
  function spanSafe() {
    const w = logWindow;
    if (!w || w.all) return '全部记录';
    return `${fmtDay(w.from)} ~ ${fmtDay(w.to - 1)}`;
  }


})();
