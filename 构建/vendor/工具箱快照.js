/*
 * 【自动生成，请勿手改】工具箱原文快照 —— 账本Plus 构建用的抽取源
 * 生成时间：2026-11-22T00:48:55.363Z
 * 来源文件：D:/下载/workbuddy HC/2026-11-04-13-39-41/工具箱/tinygrail-toolkit.component.js
 * 来源行数：22804 行
 *
 * 为什么要快照：账本Plus 是独立组件，不该在构建时依赖工具箱主文件
 * （工具箱一改行号，抽取就静默出错；且两边由不同会话/不同时间维护）。
 * 需要重新同步时：node make-vendor.js [工具箱路径]
 */
const BLOCKS = {
  // 基础工具 h/num/fmt/sleep/mapLimit（原文 1574-1610）
  BLOCK_BASE: `  /* ------------------------------ 基础工具 ------------------------------ */

  function h(tag, attrs, ...kids) {
    const el = HDOC.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v === null || v === undefined || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
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
  }`,
  // num0/nowMs（原文 873-877）
  BLOCK_NUM0: `  function num0(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  const nowMs = () => Date.now();`,
  // 分类常量 LOG_TYPE/FLOW_RULES/FLOW_LABEL/FUND_*（原文 464-535）
  CONST_RAW: `  /**
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
    7: 'other',
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
    { key: 'aucbonus', label: '竞拍分红', kw: ['竞拍分红', '竞拍分成', '拍卖分红'] },
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
    { key: 'bonus', label: '分红', kw: ['分红', '奖励'] },
    { key: 'sacrifice', label: '献祭', kw: ['献祭', '资产重组', '融资'] },
    { key: 'sell', label: '卖出', kw: ['卖出'] },
    { key: 'buy', label: '买入', kw: ['买入'] },
  ];
  const FLOW_LABEL = Object.create(null);
  FLOW_RULES.forEach((r) => (FLOW_LABEL[r.key] = r.label));
  FLOW_LABEL.other = '其他';
  FLOW_LABEL.tax = '股息税';

  /** 资金收入 / 支出、股数获得 / 损失各自允许出现的来源（按用户指定的分类口径） */
  const FUND_IN_KINDS = ['sell', 'dividend', 'bonus', 'aucbonus', 'sacrifice', 'ico', 'packet', 'other'];
  const FUND_OUT_KINDS = ['buy', 'auction', 'ico', 'packet', 'scratch', 'other'];
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
  ];`,
  // api() 网络层（原文 2718-2768）
  BLOCK_API: `  async function api(path, opt = {}) {
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
  }`,
  // allDocs()（原文 2770-2800）
  BLOCK_ALLDOCS: `  /** 顶层页面 + 所有同源 iframe 的 document（点开角色常会换 iframe，要动态找） */
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
  }`,
  // guess（原文 2944-2964）
  BLOCK_GUESS: `
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
      const m = (a.getAttribute('href') || '').match(/\\/user\\/([^/?#]+)/);
      if (m) return decodeURIComponent(m[1]);
    }
    return '';
  }`,
  // loadNames（原文 2966-2992）
  BLOCK_LOADNAMES: `  async function loadNames(ids, force, opts) {
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
  }`,
  // 角色名缓存（原文 821-844）
  BLOCK_NAMECACHE: `  const nameCache = Object.create(null);
  /* 角色名缓存落盘：刷新后筛塔第一眼就是名字，不会先闪一下 #7998 再变回来。
     只存「ID → 名字」，1.5 秒合并写一次，别把 localStorage 写爆。 */
  const LS_NAMES = 'tgtk:names:v1';
  try {
    const o = JSON.parse(localStorage.getItem(LS_NAMES) || 'null');
    if (o && typeof o === 'object') {
      Object.keys(o).forEach((k) => {
        if (/^\\d+$/.test(k) && o[k] && typeof o[k] === 'string') nameCache[k] = o[k];
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
  const metaTried = new Set(); // 已尝试拉过 meta 的角色ID，避免反复请求`,
  // knownLv（原文 1852-1861）
  BLOCK_KNOWNLV: `  function knownLvOf(id) {
    const k = String(id || '');
    if (!/^\\d+$/.test(k)) return null;
    if (charaLvCache[k] != null) return charaLvCache[k];
    try {
      if (favLvCache[k] != null) return num(favLvCache[k]);
    } catch (e) {}
    return null;
  }
`,
  // charaLink()（原文 3045-3061）
  BLOCK_CHARALINK: `  const charaName = (id) => nameCache[id] || '#' + id;

  function charaLink(id, fallback) {
    const nm = fallback || charaName(id) || '';
    return h(
      'a',
      {
        class: 'tgtk-name',
        href: \`https://bgm.tv/character/\${id}\`,
        target: '_blank',
        rel: 'noopener noreferrer',
        // 名字还没读到就先显示 #ID，别留一个点不动的空白
        title: nm ? \`\${nm}（#\${id}）\` : \`#\${id}\`,
      },
      nm || \`#\${id}\`
    );
  }`,
  // 快照（原文 3017-3043）
  BLOCK_SNAP: `  const todayKey = () => {
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
  }`,
  // selfKey（原文 5186-5199）
  BLOCK_SELFKEY: `  /** 自己的用户名：优先读页面缓存，读不到再问 account/recommend */
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
  }`,
  // 持仓（原文 4119-4162）
  BLOCK_HOLDINGS: `  async function fetchAllHoldings(key, opt) {
    const alive = (opt && opt.alive) || (() => true);
    const onProgress = (opt && opt.onProgress) || (() => {});
    const K = encodeURIComponent(key);
    const failedPages = [];
    const first = await api(\`chara/user/chara/\${K}/1/\${PAGE_SIZE}\`);
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
            const v = await api(\`chara/user/chara/\${K}/\${p}/\${PAGE_SIZE}\`);
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
  }`,
  // 账本统计纯逻辑（口径核心）（原文 7059-7713）
  LOGIC_RAW: `  /** 日志时间 → 毫秒时间戳，解析失败返回 0 */
  function logTs(v) {
    if (!v) return 0;
    if (typeof v === 'number') return v;
    const s = String(v).trim();
    const t = Date.parse(s.replace(/(\\.\\d{3})\\d+/, '$1'));
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
    const m = String(v || '').match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);
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
    return g.custom ? \`\${fmtDay(g.from)} ~ \${fmtDay(g.to - 1)}（\${g.days} 天）\` : \`近 \${g.days} 天\`;
  }

  /** 从描述里抠角色 ID（兜底，正常走 RelatedId） */
  function descCharaId(desc) {
    const m = String(desc || '').match(/#(\\d+)/);
    return m ? num(m[1]) : 0;
  }

  /** 从描述里抠股数（兜底，正常走 Amount） */
  function descAmount(desc) {
    const m = String(desc || '').match(/([\\d,]+(?:\\.\\d+)?)\\s*股/);
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
    const byDesc = descCharaId(x.Description);
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
    const m = String(desc || '').match(/使用\\s*#\\d+[^#]*?([\\d,]+(?:\\.\\d+)?)\\s*股/);
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
    let m = s.match(/([\\d,]+(?:\\.\\d+)?)\\s*(?:股|点)?\\s*固定资产/) || s.match(/固定资产[^\\d\\-−]{0,12}([\\d,]+(?:\\.\\d+)?)/);
    if (m) return num(String(m[1]).replace(/,/g, ''));
    // 只写了「点」的，也算固资
    m = s.match(/([\\d,]+(?:\\.\\d+)?)\\s*点/);
    if (m) return num(String(m[1]).replace(/,/g, ''));
    return 0;
  }

  /** 同一条日志里被扣掉的活股数（没有「固定资产」字样时才算，避免把「71股固定资产」当成股） */
  function parseFixedShares(desc) {
    const s = String(desc || '');
    if (/固定资产/.test(s)) return 0;
    const m = s.match(/([\\d,]+(?:\\.\\d+)?)\\s*股/);
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
    const wrap = h('div', { class: 'tgtk-sparkwrap' });
    if (!pts || !pts.length) {
      wrap.appendChild(h('div', { class: 'tgtk-sparkempty' }, '暂无走势数据'));
      return wrap;
    }
    if (pts.length === 1) {
      wrap.appendChild(h('div', { class: 'tgtk-sparkempty' }, \`仅 1 天数据（\${pts[0].d}）· 攒几天就能看趋势\`));
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
    const line = xy.map((c, i) => \`\${i ? 'L' : 'M'}\${c[0].toFixed(2)},\${c[1].toFixed(2)}\`).join('');
    const svg = svgNode('svg', {
      class: 'tgtk-spark',
      viewBox: \`0 0 \${W} \${H}\`,
      preserveAspectRatio: 'none',
    });
    svg.appendChild(svgNode('path', { d: \`\${line}L\${W},\${H}L0,\${H}Z\`, class: 'tgtk-spark-area', fill: color }));
    svg.appendChild(
      svgNode('path', {
        d: line,
        class: 'tgtk-spark-line',
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
        const v = await api(\`chara/user/temple/\${encodeURIComponent(u)}/\${page}/100\`, { timeout: 30000 });
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
    return [x.LogTime, x.Type, x.Change, x.Amount, x.RelatedId, x.Description].join('\\u0001');
  }`,
  // copyLogs()（原文 8192-8253）
  BLOCK_RENDER: `  function copyLogs() {
    if (!logAll.length) return setLogStatus('没有可复制的数据');
    const st = ledgerStats();
    const view =
      S.ledgerView === 'stock' || S.ledgerView === 'fixed' || S.ledgerView === 'star' ? S.ledgerView : 'fund';
    const lines = [];

    if (view === 'fund') {
      lines.push(\`资金收支（\${logRangeLabel()}）\`, '方向\\t来源\\t金额\\t笔数');
      [
        ['收入', st.fundIn],
        ['支出', st.fundOut],
      ].forEach(([d, data]) => {
        lines.push([d, '合计', data.total.toFixed(2), data.n].join('\\t'));
        data.rows.forEach((r) => lines.push([d, r.label, r.sum.toFixed(2), r.n].join('\\t')));
      });
      const dv = st.fundIn.rows.find((r) => r.key === 'dividend');
      if (dv && dv.tax) lines.push('', \`股息为税后值：税前 \${dv.gross.toFixed(2)}，个人所得税 \${dv.tax.toFixed(2)}（\${dv.taxN} 笔）\`);
      const ar = st.fundOut.rows.find((r) => r.key === 'auction' && r.refund);
      if (ar) lines.push(\`竞拍为净额：已扣除失败返还 \${ar.refund.toFixed(2)}（\${ar.refundN} 笔）\`);
      const br = st.fundOut.rows.find((r) => r.key === 'buy' && r.refund);
      if (br) lines.push(\`买入为净额：已扣除撤单 / 冰山退回 \${br.refund.toFixed(2)}（\${br.refundN} 笔）\`);
    } else if (view === 'stock') {
      lines.push(\`股数增减（\${logRangeLabel()}）\`, '方向\\t来源\\t股数\\t次数');
      [
        ['获得', st.stockIn],
        ['损失', st.stockOut],
      ].forEach(([d, data]) => {
        lines.push([d, '合计', data.total, data.n].join('\\t'));
        data.rows.forEach((r) => lines.push([d, r.label, r.sum, r.n].join('\\t')));
      });
      const fr = logCharRows(logStats());
      const dirName = fr.dir === 'loss' ? '失去' : '获得';
      const pick = STOCK_FILTERS[fr.dir].filter((r) => r[0] === fr.kind)[0];
      lines.push('', \`角色\\t\${dirName}股\\t净变化\` + (fr.kind === 'all' ? '' : \`（仅 \${pick ? pick[1] : ''}）\`));
      fr.rows.forEach((x) => {
        lines.push([charaName(x.id) || '#' + x.id, fr.val(x), x.gain - x.loss].join('\\t'));
      });
    } else if (view === 'star') {
      const now = S.starMode === 'now';
      const rows2 = starRows(now ? starNowRows || [] : starRangeRows());
      lines.push(
        now ? '星之力（当前总量）' : \`星之力贡献（\${logRangeLabel()}）\`,
        now ? '角色\\t星之力\\t固资\\t上限' : '角色\\t星之力\\t冲星次数'
      );
      rows2.forEach((x) => {
        const nm = charaName(x.id) || '#' + x.id;
        lines.push(now ? [nm, x.star, x.assets || 0, x.cap || 0].join('\\t') : [nm, x.star, x.n].join('\\t'));
      });
      lines.push(['合计', rows2.reduce((s2, r) => s2 + r.star, 0)].join('\\t'));
    } else {
      // 圣殿只看损失：固资获得没有参考价值（补资 / 献祭都会涨，混在一起反而看不懂）
      lines.push(\`圣殿固资损失（\${logRangeLabel()}）\`, '来源\\t固资\\t次数');
      lines.push(['合计', st.fixedOut.total, st.fixedOut.n].join('\\t'));
      st.fixedOut.rows.forEach((r) => lines.push([r.label, r.sum, r.n].join('\\t')));
      if (st.hits.length) {
        lines.push('', '被道标命中\\t角色\\t损失固资\\t扣股\\t次数');
        st.hits.forEach((x) => lines.push(['', charaName(x.id), x.sum, x.shares || 0, x.n].join('\\t')));
      }
    }

    copyText(lines.join('\\n'), (m) => setLogStatus(m + ' ' + (lines.length - 1) + ' 行'));  }`,
  // line/select/input（原文 8256-8280）
  BLOCK_UIHELP: `  /* ------------------------------ 界面 ------------------------------ */

  function line(label, ...nodes) {
    return h('div', { class: 'tgtk-line' }, h('span', { class: 'tgtk-label' }, label), ...nodes);
  }

  function input(id, value, attrs) {
    return h('input', {
      id,
      type: 'text',
      // 面板里同时存在 text / password 输入框时，Chrome 会把它们当成登录表单，
      // 把保存的 bangumi 账号填进第一个文本框。统一关掉自动填充并随机化 name，
      // 让所有输入框都不与常见登录字段名（username/email/password）重合。
      autocomplete: 'off',
      name: 'tgtk-f-' + String(id).replace(/[^a-z0-9-]/gi, '') + '-' + HOST_TOKEN.slice(-6),
      value: value === undefined || value === null ? '' : String(value),
      ...(attrs || {}),
    });
  }

  function select(id, options, value) {
    const el = h('select', { id }, options.map(([v, t]) => h('option', { value: v }, t)));
    el.value = value;
    return el;
  }`,
  // setLogStatus/setButtonsDisabled（原文 21674-21715）
  BLOCK_STATUS: `  function setLogStatus(msg, action) {
    if (!els) return;
    els.logStat.textContent = msg;
    /* 未登录时给一个能直接点的入口；悬停说明第三方 Cookie 这个坑：
       Chrome 拦了第三方 Cookie 的话，就算在 tinygrail.com 登录过，这边也读不到。 */
    if (action === 'login') {
      els.logStat.appendChild(document.createTextNode(' · '));
      els.logStat.appendChild(h('a', {
        class: 'tgtk-loginlink',
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
      b.classList.toggle('tgtk-off', v);
    });
    (els.sEndModes || []).forEach((b) => {
      b.disabled = v;
      b.classList.toggle('tgtk-off', v);
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
  }`,
  // copyText（原文 21846-21868）
  BLOCK_COPY: `  function copyText(text, statusFn) {
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
  }`,
  // 工具箱 CSS（原文 21913-22539）
  CSS_RAW: `  const CSS = \`
#tgtk-panel,#tgtk-fab,.tgtk-sug,.tgtk-favpop,#tgtk-star,.tgtk-starpop,.tgtk-histpop,.tgtk-movepop,.tgtk-pintoast{
  --tg-bg:#20242e; --tg-sunken:#181b22; --tg-sunken2:#1b1f27;
  --tg-surface:#262b36; --tg-surface2:#2a2f3b; --tg-surface3:#333947;
  --tg-line:#3b4150; --tg-line-soft:rgba(255,255,255,.07); --tg-bar:rgba(255,255,255,.14);
  --tg-fg:#e6e8ee; --tg-fg2:#cfd4df; --tg-dim:#9aa3b5; --tg-mute:#727b8d;
  --tg-accent:#e46fa1; --tg-accent-fg:#ffd9e8; --tg-hl:#ffb3cf;
  --tg-up:#9fe0b0; --tg-down:#8fb8ff; --tg-link:#8fd3ff;
  --tg-hit:#2d2739; --tg-okbg:#1e2a23; --tg-badbg:#2b1f24;
  --tg-bad:#ff9aa8; --tg-warn:#ffd08a;
}
#tgtk-panel[data-theme="light"],.tgtk-sug[data-theme="light"],.tgtk-favpop[data-theme="light"],#tgtk-star[data-theme="light"],.tgtk-starpop[data-theme="light"],.tgtk-histpop[data-theme="light"],.tgtk-movepop[data-theme="light"],.tgtk-pintoast[data-theme="light"]{
  --tg-bg:#fcfafb; --tg-sunken:#f4eff3; --tg-sunken2:#f8f3f6;
  --tg-surface:#f4eef2; --tg-surface2:#ece4ea; --tg-surface3:#e2d7df;
  --tg-line:#d9cbd4; --tg-line-soft:rgba(96,64,84,.12); --tg-bar:rgba(96,64,84,.16);
  --tg-fg:#332b31; --tg-fg2:#4a4046; --tg-dim:#7b6d77; --tg-mute:#9b8d97;
  --tg-accent:#d4568e; --tg-accent-fg:#a8305f; --tg-hl:#bc4a7c;
  --tg-up:#2c8255; --tg-down:#2f66a8; --tg-link:#2f6bb0;
  --tg-hit:#f9e9f1; --tg-okbg:#e9f5ee; --tg-badbg:#fbeaee;
  --tg-bad:#b83b52; --tg-warn:#95651a;
}
#tgtk-panel[data-theme="light"]{box-shadow:0 18px 50px rgba(90,58,78,.18)}
.tgtk-sug[data-theme="light"]{box-shadow:0 10px 32px rgba(90,58,78,.22)}
.tgtk-favpop[data-theme="light"],.tgtk-starpop[data-theme="light"],.tgtk-histpop[data-theme="light"],.tgtk-movepop[data-theme="light"]{box-shadow:0 12px 36px rgba(90,58,78,.24)}
/* 挂到最外层页面时，避免主站全局样式干扰面板内部布局 */
#tgtk-panel,#tgtk-panel *{box-sizing:border-box}
#tgtk-panel button,#tgtk-fab{font-family:inherit}
.tgtk-line .tgtk-favbtn{margin-left:-2px}
/* 收藏夹快选按钮 + 浮层 */
.tgtk-favbtn{flex:none;width:22px;height:22px;padding:0;line-height:1;border:1px solid var(--tg-line);
  border-radius:6px;background:var(--tg-sunken);color:var(--tg-accent);font:inherit;font-size:12px;cursor:pointer}
.tgtk-favbtn:hover,.tgtk-favbtn:focus{background:var(--tg-hit);border-color:var(--tg-accent);outline:none}
/* 多目标输入框最右边的「清空」：跟输入框同高，弱化成次级按钮 */
.tgtk-clearbtn{flex:none;box-sizing:border-box;height:27px;padding:0 9px;border:1px solid var(--tg-line);
  border-radius:6px;background:var(--tg-sunken);color:var(--tg-mute);font:inherit;font-size:11px;
  line-height:1;cursor:pointer}
.tgtk-clearbtn:hover,.tgtk-clearbtn:focus{color:var(--tg-fg);border-color:var(--tg-accent);background:var(--tg-hit);outline:none}
.tgtk-favpop{position:fixed;z-index:2147483006;width:250px;max-width:calc(100vw - 12px);box-sizing:border-box;
  padding:8px;display:flex;flex-direction:column;gap:6px;background:var(--tg-bg);color:var(--tg-fg);
  border:1px solid var(--tg-line);border-radius:9px;box-shadow:0 12px 36px rgba(0,0,0,.5);
  font:12px/1.5 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif}
.tgtk-favhead{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:0 2px;
  color:var(--tg-accent-fg);font-size:11px;font-weight:600}
.tgtk-favclose{border:0;background:transparent;color:var(--tg-mute);font-size:15px;line-height:1;cursor:pointer;padding:0 3px}
.tgtk-favclose:hover{color:var(--tg-fg)}
.tgtk-favpop input[type=text]{box-sizing:border-box;width:100%;padding:4px 7px;border-radius:6px;
  border:1px solid var(--tg-line);background:var(--tg-sunken);color:var(--tg-fg);font:inherit;font-size:12px;outline:none}
.tgtk-favpop input[type=text]:focus{border-color:var(--tg-accent)}
.tgtk-favpoplist{display:flex;flex-direction:column;gap:2px;max-height:230px;overflow-y:auto}
.tgtk-favrow{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 8px 5px 10px;
  border-radius:5px;background:var(--tg-sunken2);border:1px solid transparent;cursor:pointer}
.tgtk-favrow:hover{background:var(--tg-hit);border-color:var(--tg-line)}
.tgtk-favrow.tgtk-on{outline:1px solid var(--tg-accent);color:var(--tg-accent-fg);background:var(--tg-hit)}
.tgtk-favname{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tgtk-favid{flex:none;color:var(--tg-mute);font-size:10px;font-variant-numeric:tabular-nums}
.tgtk-favempty{color:var(--tg-mute);font-size:11px;padding:10px 4px;text-align:center;line-height:1.6}
.tgtk-favfoot{display:flex;align-items:center;justify-content:space-between;gap:6px;color:var(--tg-mute);
  font-size:10px;border-top:1px solid var(--tg-line-soft);padding-top:6px}
.tgtk-favfoot span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tgtk-favfoot .tgtk-btn{flex:none}
/* 角色名候选：挂在 body 上的 fixed 浮层，避免被面板 overflow 裁掉 */
.tgtk-sug{position:fixed;z-index:2147483005;width:236px;max-height:264px;overflow-y:auto;box-sizing:border-box;
  padding:4px;background:var(--tg-bg);color:var(--tg-fg);border:1px solid var(--tg-line);border-radius:8px;
  box-shadow:0 10px 32px rgba(0,0,0,.5);font:12px/1.5 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif}
.tgtk-sughead{padding:3px 6px 5px;color:var(--tg-dim);font-size:10px;border-bottom:1px solid var(--tg-line-soft);margin-bottom:3px}
.tgtk-sugrow{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:4px 6px;border-radius:5px;cursor:pointer}
.tgtk-sugrow:hover,.tgtk-sugrow.tgtk-sugon{background:var(--tg-hit);color:var(--tg-accent-fg)}
.tgtk-sugname{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tgtk-sugid{flex:none;color:var(--tg-mute);font-size:10px;font-variant-numeric:tabular-nums}
/* 圣殿置顶 / 置底：这个角色你没有塔，选它不会生效 */
.tgtk-sugtag{flex:none;padding:0 4px;border-radius:999px;background:var(--tg-sunken2);color:var(--tg-mute);
  font-size:9px;line-height:14px}
.tgtk-sugmiss .tgtk-sugname{color:var(--tg-mute)}
.tgtk-sugempty{padding:6px;color:var(--tg-mute);font-size:11px;line-height:1.5}
/* 工具箱胶囊收进 bgm 右下角工具条（#dock）的开关：图标跟工具条文字色，收起时变淡。
   #dock ul 是 flex，所以 li 也照站点的写法用 flex，别用 float/block，否则和旁边的图标对不齐 */
#dock .tgtk-dockitem{display:flex;align-items:center;margin:0;padding:0;list-style:none}
#tgtk-docksw{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;
  background:none;border:0;color:inherit;opacity:.6;cursor:pointer;text-decoration:none;
  transition:opacity .15s,color .15s}
#tgtk-docksw:hover{opacity:1}
#tgtk-docksw.tgtk-off{opacity:.3}
#tgtk-docksw.tgtk-on{opacity:1;color:var(--tg-accent)}
#tgtk-fab{position:fixed;right:18px;bottom:86px;z-index:2147483000;padding:8px 14px;border:0;border-radius:999px;
  background:var(--tg-accent);color:#fff;font:600 13px/1.4 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;
  box-shadow:0 6px 18px rgba(228,111,161,.38);cursor:grab;opacity:.92;transition:transform .15s,opacity .15s;
  touch-action:none;user-select:none}
#tgtk-fab.tgtk-dragging{cursor:grabbing;opacity:1}
#tgtk-fab:hover{transform:translateY(-2px);opacity:1}
/* 收起来时靠 !important 压过上面的 opacity / transition，别留个半透明的影子 */
#tgtk-fab[hidden]{display:none!important}
#tgtk-panel{position:fixed;right:18px;bottom:132px;z-index:2147483001;width:430px;max-width:calc(100vw - 24px);
  max-height:76vh;display:flex;flex-direction:column;background:var(--tg-bg);color:var(--tg-fg);border-radius:12px;
  box-shadow:0 18px 50px rgba(0,0,0,.45);font:13px/1.5 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;
  overflow:hidden;border:1px solid var(--tg-line-soft)}
#tgtk-panel[hidden]{display:none}
#tgtk-panel.tgtk-dragging{box-shadow:0 24px 64px rgba(0,0,0,.6);cursor:grabbing}
.tgtk-head{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;padding:10px 14px 6px;
  cursor:move;user-select:none;touch-action:none}
.tgtk-title{font-size:13px;font-weight:600;color:var(--tg-accent-fg);letter-spacing:.02em}
.tgtk-close{background:none;border:0;color:var(--tg-dim);font-size:18px;line-height:1;cursor:pointer;padding:0 2px}
.tgtk-headtools{display:flex;align-items:center;gap:6px}
.tgtk-ico{background:none;border:1px solid transparent;color:var(--tg-dim);font-size:14px;line-height:1;cursor:pointer;padding:2px 5px;border-radius:5px}
.tgtk-ico:hover{background:var(--tg-surface);color:var(--tg-fg)}
.tgtk-close:hover{color:#fff}
/* 标签栏可横向滑动：加了多少个功能都不撑大面板，窄屏也能左右滑到最后一个。
   flex:0 0 auto 很关键：面板高度到 max-height 时，默认 flex-shrink 会把标签栏
   一起压扁，选中标签的高亮块就会被裁掉半个（道具页内容一多就出现）。 */
.tgtk-tabbar{flex:0 0 auto;display:flex;gap:4px;padding:0 12px 8px;border-bottom:1px solid var(--tg-line-soft);
  flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;scrollbar-width:thin;overscroll-behavior-x:contain}
.tgtk-tabbar::-webkit-scrollbar{height:4px}
.tgtk-tabbar::-webkit-scrollbar-thumb{background:var(--tg-line);border-radius:2px}
.tgtk-tabbar::-webkit-scrollbar-track{background:transparent}
.tgtk-tab{flex:0 0 auto;min-width:46px;padding:6px 5px;border-radius:6px;border:1px solid transparent;background:transparent;color:var(--tg-dim);
  font:inherit;font-size:12px;cursor:pointer;white-space:nowrap}
.tgtk-tab:hover{color:var(--tg-fg)}
.tgtk-tab.tgtk-on{background:rgba(228,111,161,.16);border-color:rgba(228,111,161,.45);color:var(--tg-accent-fg);font-weight:600}
.tgtk-subtab{flex:1;background:var(--tg-sunken);border:1px solid var(--tg-line);color:var(--tg-dim)}
.tgtk-subtab.tgtk-on{background:var(--tg-accent);border-color:var(--tg-accent);color:#fff;font-weight:600}
/* 一键冲星「结束补资」：补满 / 补到 250 / 不补 */
.tgtk-endwrap{flex:1;min-width:0;max-width:230px}
.tgtk-endwrap .tgtk-subtab{display:inline-flex;align-items:center;justify-content:center;
  height:24px;padding:0 6px;border-radius:6px;font-size:11px;line-height:1}
/* 「圣殿」页：每行 4 / 5 / 6 个的分段按钮 */
.tgtk-colname{color:var(--tg-accent-fg);font-size:12px;font-weight:600;white-space:nowrap}
.tgtk-inline.tgtk-cols{gap:5px;flex:none}
.tgtk-inline.tgtk-cols .tgtk-subtab{flex:none;display:inline-flex;align-items:center;justify-content:center;
  width:44px;min-width:44px;height:24px;padding:0;border-radius:6px;font-size:11px;line-height:1}
.tgtk-colunit{font-style:normal;color:var(--tg-mute);font-size:11px}
.tgtk-body{flex:1 1 auto;min-height:0;padding:12px 14px 14px;overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;gap:9px}
.tgtk-view{display:flex;flex-direction:column;gap:9px}
.tgtk-view[hidden]{display:none}
.tgtk-line{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
/* 账本明细的四个筛选挤在一行：不换行，下拉自己缩，标签不压缩 */
#tgtk-panel .tgtk-logfilter{flex-wrap:nowrap;gap:6px}
#tgtk-panel .tgtk-logfilter .tgtk-label{flex:none;font-size:12px}
#tgtk-panel .tgtk-logfilter select{flex:1 1 auto;min-width:0;max-width:none;font-size:12px;padding:2px 4px}
.tgtk-label{color:var(--tg-dim);font-size:12px;white-space:nowrap}
.tgtk-dash{color:var(--tg-mute)}
#tgtk-panel input[type=text],#tgtk-panel input[type=search],#tgtk-panel input[type=number],#tgtk-panel select,#tgtk-panel textarea{
  box-sizing:border-box;padding:5px 8px;border-radius:6px;border:1px solid var(--tg-line);background:var(--tg-sunken);color:var(--tg-fg);
  font:inherit;font-size:12px}
#tgtk-panel input[type=number]{width:76px}
#tgtk-thr{width:84px!important}
#tgtk-user,#tgtk-fchars,#tgtk-holdsearch{flex:1;min-width:120px}
/* 用户名框挪到「塔图」那一行：整组靠右，和左边的勾选框拉开一点距离 */
.tgtk-userwrap{display:flex;align-items:center;gap:6px;flex:1;min-width:150px;margin-left:10px}
#tgtk-user{min-width:80px}
/* 筛选条件右边的勾选：没有文字，只占一个方框 */
.tgtk-chkend{gap:0;margin-left:-2px}
#tgtk-favadd{width:96px}
/* 手动添加：隐藏 type=search 自带的清除按钮；Chrome 一旦自动填充，用守卫动画立即清掉 */
#tgtk-favadd::-webkit-search-cancel-button,#tgtk-favadd::-webkit-search-decoration{-webkit-appearance:none;display:none}
#tgtk-favadd:-webkit-autofill,#tgtk-favadd:-webkit-autofill:hover,#tgtk-favadd:-webkit-autofill:focus{
  box-shadow:0 0 0 1000px var(--tg-sunken) inset;-webkit-text-fill-color:var(--tg-fg);
  animation:tgtk-autofill-guard .001s linear}
@keyframes tgtk-autofill-guard{from{outline-color:transparent}to{outline-color:transparent}}
#tgtk-lvmin,#tgtk-lvmax,#tgtk-minamt{width:64px!important}
#tgtk-chars{width:100%;resize:vertical}
#tgtk-panel select{max-width:150px}
.tgtk-tabs{display:flex;gap:6px}
.tgtk-ctx[hidden]{display:none}
/* 角色列表下面的「只筛自己圣殿」：贴着输入框，别跳出去 */
.tgtk-ctxchk{margin-top:5px}
/* 筛塔行里的「定位」：自己的塔才有，小图钉贴在角色名右边 */
.tgtk-locbtn{flex:none;width:16px;height:16px;padding:0;border:0;border-radius:4px;background:transparent;
  color:var(--tg-mute);display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
.tgtk-locbtn svg{display:block}
.tgtk-locbtn:hover,.tgtk-locbtn:focus{color:var(--tg-accent);background:var(--tg-hit);outline:none}
/* 已定位的那几座：图钉变粉，再点一下取消 */
.tgtk-locbtn.on{color:#e46fa1;background:rgba(228,111,161,.12)}
.tgtk-locbtn.on:hover,.tgtk-locbtn.on:focus{background:rgba(228,111,161,.22)}
.tgtk-actions{justify-content:flex-start}
.tgtk-btn{padding:6px 14px;border-radius:6px;border:1px solid var(--tg-line);background:var(--tg-surface2);color:var(--tg-fg2);font:inherit;
  font-size:12px;cursor:pointer}
.tgtk-btn:disabled{opacity:.45;cursor:default}
.tgtk-btn:hover{background:var(--tg-surface3)}
.tgtk-primary{background:var(--tg-accent);border-color:var(--tg-accent);color:#fff;font-weight:600}
.tgtk-primary:disabled{opacity:.55;cursor:default}
.tgtk-chk{display:flex;align-items:center;gap:4px;color:var(--tg-dim);font-size:12px;cursor:pointer}
/* 一键每日任务：一行一项，勾选框 + 名称 + 灰色配置摘要 */
.tgtk-dailyrow{width:100%;gap:8px}
.tgtk-dailyrow b{flex:none;min-width:52px;font-weight:600;color:var(--tg-fg)}
.tgtk-dailydesc{flex:1;min-width:0;color:var(--tg-dim);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tgtk-subtab.tgtk-off{opacity:.45;cursor:not-allowed}
/* 「导入小圣杯收藏」的粘贴兜底区 */
.tgtk-importbox{display:flex;flex-direction:column;gap:6px;padding:7px 8px;
  border:1px dashed var(--tg-line);border-radius:8px;background:var(--tg-sunken)}
.tgtk-importbox[hidden]{display:none}
.tgtk-importbox textarea{width:100%;box-sizing:border-box;resize:vertical}
.tgtk-importbox .tgtk-actions{margin:0}
.tgtk-chk input[type=checkbox]{width:13px;height:13px;accent-color:var(--tg-accent);cursor:pointer;margin:0}
.tgtk-chkline{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
/* 两个勾选框并排靠左（不用 space-between 把后一个推到面板最右边） */
.tgtk-chkline.tgtk-chknear{justify-content:flex-start;gap:18px}
.tgtk-inline{display:flex;align-items:center;gap:4px;color:var(--tg-mute);font-size:11px}
.tgtk-inline[hidden]{display:none}
.tgtk-inline input[type="date"]{font:inherit;color:var(--tg-text);background:var(--tg-sunken);
  border:1px solid var(--tg-line);border-radius:6px;padding:1px 4px;min-width:0;width:7.6em}
/* 一键冲星按钮右边的「预计消耗活股」：跟着按钮走，不许把按钮挤换行 */
.tgtk-estimate{flex:1;min-width:0;justify-content:flex-start;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tgtk-inline i{font-style:normal}
.tgtk-inline input{width:62px;background:var(--tg-sunken2);border:1px solid var(--tg-line);color:var(--tg-fg);border-radius:5px;padding:3px 5px;font-size:12px;text-align:center;outline:none}
.tgtk-inline input:focus{border-color:var(--tg-accent)}
.tgtk-stat{color:var(--tg-dim);font-size:12px;min-height:18px}
.tgtk-stat .tgtk-loginlink{color:var(--tg-link);text-decoration:underline;text-underline-offset:2px;white-space:nowrap}
.tgtk-list{display:flex;flex-direction:column;gap:2px}
.tgtk-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 8px;border-radius:6px;
  background:var(--tg-surface)}
.tgtk-row.tgtk-hit{background:var(--tg-hit)}
.tgtk-main{display:flex;flex-direction:column;min-width:0}
.tgtk-name{color:var(--tg-link);text-decoration:none;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  /* 只让文字本身可点：不加这句，flex 列里的 <a> 会横向撑满，点行首空白也会跳角色页 */
  align-self:flex-start;max-width:100%}
.tgtk-name:hover{text-decoration:underline}
.tgtk-namerow{display:flex;align-items:center;gap:4px;min-width:0;max-width:100%}
.tgtk-sub{color:var(--tg-dim);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tgtk-val{font-variant-numeric:tabular-nums;color:var(--tg-fg2);white-space:nowrap;font-size:12px}
.tgtk-val b{color:var(--tg-hl);font-weight:600}
.tgtk-empty{color:var(--tg-dim);text-align:center;padding:18px 0;font-size:12px}
#tgtk-panel [hidden]{display:none!important}
.tgtk-kv{color:var(--tg-dim);font-size:11px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tgtk-kv b{color:var(--tg-hl);font-weight:600;font-variant-numeric:tabular-nums}
.tgtk-kv i{font-style:normal;color:var(--tg-mute)}
.tgtk-x{border:0;background:transparent;color:var(--tg-mute);font-size:16px;line-height:1;cursor:pointer;padding:2px 6px;border-radius:4px}
.tgtk-x:hover{background:var(--tg-line-soft);color:#ff9ab8}
.tgtk-favpick{min-height:26px}
.tgtk-favpick .tgtk-btn{padding:3px 10px;font-size:12px}
.tgtk-danger{background:#7a2d3a;border-color:#9c3a4a;color:#ffd7df}
.tgtk-danger:hover{background:#8d3444}
.tgtk-note{color:var(--tg-mute);font-size:11px;line-height:1.6;background:var(--tg-sunken2);border-radius:6px;padding:6px 8px}
.tgtk-preview{color:var(--tg-dim);font-size:11px}
.tgtk-sumwrap{display:flex;flex-direction:column;gap:6px}
.tgtk-sum{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.tgtk-sumcell{background:var(--tg-surface);border-radius:6px;padding:6px 8px;display:flex;flex-direction:column;gap:1px;min-width:0}
.tgtk-sumcell i{font-style:normal;color:var(--tg-dim);font-size:11px}
.tgtk-sumcell b{font-size:12px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tgtk-sumcell span{color:var(--tg-mute);font-size:10px}
.tgtk-up{color:var(--tg-up)}
.tgtk-down{color:var(--tg-down)}
/* 星之力数值：≥1 万紫 / 有值黄 / 0 灰（和旧版圣殿卡上的三个档一致） */
.tgtk-starhi{color:#c084fc}
.tgtk-starmid{color:#e0a82e}
.tgtk-starlow{color:var(--tg-dim)}
.tgtk-dual{display:flex;gap:8px;justify-content:flex-end;min-width:104px}
.tgtk-dual b{color:var(--tg-up);font-weight:600}
.tgtk-dual span{color:var(--tg-down)}
/* 资产卡 */
.tgtk-asset{background:var(--tg-surface);border-radius:8px;padding:8px 10px 6px;display:flex;flex-direction:column;gap:4px}
.tgtk-assettop{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.tgtk-assetcell{display:flex;flex-direction:column;gap:1px;min-width:0}
.tgtk-assetcell i{font-style:normal;color:var(--tg-dim);font-size:10px}
.tgtk-assetcell b{font-size:12px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tgtk-sparkwrap{width:100%;height:38px;overflow:hidden}
.tgtk-spark{width:100%;height:38px;display:block}
.tgtk-spark-area{opacity:.13;stroke:none}
.tgtk-spark-line{fill:none;stroke-width:1.6;stroke-linejoin:round;stroke-linecap:round}
.tgtk-sparkempty{color:var(--tg-mute);font-size:11px;line-height:38px;text-align:center}
.tgtk-assetfoot{display:flex;justify-content:space-between;align-items:center;color:var(--tg-dim);font-size:11px;gap:8px}
.tgtk-assetfoot b{font-variant-numeric:tabular-nums;white-space:nowrap}
/* 资金 / 股数 / 圣殿 视角切换 */
.tgtk-seg{display:flex;gap:4px;background:var(--tg-sunken);border-radius:7px;padding:3px}
.tgtk-segbtn{flex:1;padding:5px 0;border:0;border-radius:5px;background:transparent;color:var(--tg-dim);font-size:12px;cursor:pointer}
.tgtk-segbtn:hover{color:var(--tg-fg)}
.tgtk-segbtn.tgtk-on{background:rgba(228,111,161,.2);color:var(--tg-accent-fg);font-weight:600}
/* 四象限明细 */
.tgtk-flowgrid{display:flex;flex-direction:column;gap:6px}
.tgtk-flowblk{background:var(--tg-surface);border-radius:7px;padding:6px 8px;display:flex;flex-direction:column;gap:3px}
.tgtk-flowhead{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--tg-dim);padding-bottom:3px;border-bottom:1px solid var(--tg-line-soft)}
.tgtk-flowhead span{flex:1}
.tgtk-flowhead b{font-size:12px;font-variant-numeric:tabular-nums}
.tgtk-flowhead i{font-style:normal;color:var(--tg-mute);font-size:10px}
.tgtk-flowrow{display:flex;align-items:center;gap:6px;font-size:11px;height:17px}
.tgtk-flowrow.tgtk-wide .tgtk-flowname{width:104px}
.tgtk-flowname{width:62px;flex:none;color:var(--tg-fg2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tgtk-hasdetail{cursor:help;border-bottom:1px dotted var(--tg-mute)}
.tgtk-flowbar{flex:1;height:5px;background:var(--tg-line-soft);border-radius:3px;overflow:hidden;min-width:20px}
.tgtk-flowbar i{display:block;height:100%;border-radius:3px}
.tgtk-flowbar i.up{background:#5fa878}
.tgtk-flowbar i.down{background:#5f7fa8}
.tgtk-flowval{width:62px;flex:none;text-align:right;font-variant-numeric:tabular-nums;color:var(--tg-fg);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tgtk-flown{width:34px;flex:none;text-align:right;color:var(--tg-mute);font-size:10px}
.tgtk-flowempty{color:var(--tg-mute);font-size:11px;padding:2px 0}
.tgtk-flownote{color:var(--tg-mute);font-size:10px;line-height:1.5;padding-top:3px;border-top:1px dashed var(--tg-line-soft);margin-top:2px}
.tgtk-blocktitle{color:var(--tg-dim);font-size:11px;font-weight:600;padding:2px 2px 0}
/* 一键冲星 */
.tgtk-starbox{margin-top:10px;padding-top:10px;border-top:1px dashed var(--tg-line-soft);display:flex;flex-direction:column;gap:6px}
/* 星光碎片候选列表（按持股排序，不再按等级分组） */
.tgtk-sdlist{display:flex;flex-direction:column;gap:2px;max-height:236px;overflow-y:auto;padding-right:2px}
.tgtk-sdrow{display:flex;align-items:center;gap:8px;padding:5px 6px;border-radius:5px;background:var(--tg-sunken2);cursor:pointer}
.tgtk-sdrow:hover{background:var(--tg-surface3)}
.tgtk-sdrow.tgtk-on{outline:1px solid var(--tg-accent);background:var(--tg-surface2)}
/* 已在燃料队列里：序号 + 移出，用粉色底和「无活股」区分开 */
.tgtk-mini.tgtk-picked{background:var(--tg-accent);border-color:var(--tg-accent);color:#fff;min-width:64px}
.tgtk-mini.tgtk-picked:hover{filter:brightness(1.1)}
.tgtk-sdzero.tgtk-on .tgtk-mini.tgtk-picked{opacity:1}
/* 0 活股的行：能搜到、能看清，但选不了（持股多半全挂了卖单） */
.tgtk-sdrow.tgtk-sdzero{opacity:.6;cursor:default}
.tgtk-sdrow.tgtk-sdzero:hover{background:var(--tg-sunken2)}
.tgtk-sdmain{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.tgtk-sdmain .tgtk-name,.tgtk-sdmain a{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tgtk-mini{padding:3px 9px;font-size:11px;flex:none}
/* ICO：按剩余时间排列，每行一张小卡片 */
.tgtk-icolist{display:flex;flex-direction:column;gap:4px;max-height:300px;overflow-y:auto;padding-right:2px}
.tgtk-icorow{display:flex;flex-direction:column;gap:3px;padding:6px 8px;border-radius:6px;
  background:var(--tg-sunken2);border:1px solid transparent}
.tgtk-icorow.tgtk-on{border-color:rgba(228,111,161,.45);background:var(--tg-hit)}
.tgtk-icotop{display:flex;align-items:center;justify-content:space-between;gap:8px}
.tgtk-icotop .tgtk-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}
.tgtk-ico-left{flex:none;color:var(--tg-mute);font-size:11px;font-variant-numeric:tabular-nums}
.tgtk-icosub{color:var(--tg-dim);font-size:10px;font-variant-numeric:tabular-nums;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* 上一次自动注资的结论（补款成功 / 人数不够 / 错过） */
.tgtk-icores{color:var(--tg-mute);font-size:10px;line-height:1.45;word-break:break-all}
.tgtk-icoline{display:flex;align-items:center;gap:6px;margin-top:1px}
.tgtk-icoline .tgtk-mute{color:var(--tg-mute);font-size:11px}
.tgtk-icosel{width:74px;padding:3px 6px;font-size:11px}
.tgtk-icohint{flex:none;font-size:11px;line-height:1.6;color:var(--tg-accent-fg);white-space:nowrap}
/* 旧版 ICO 页：发行价后面的「上市 LvN」小胶囊 */
.tgtk-icolv{display:inline-block;margin-left:6px;padding:0 6px;border-radius:999px;
  background:rgba(228,111,161,.16);border:1px solid rgba(228,111,161,.45);
  color:#c9457d;font-size:11px;line-height:16px;vertical-align:1px;white-space:nowrap}
.tgtk-icoline .tgtk-btn{margin-left:auto}
.tgtk-pick{color:var(--tg-dim);font-size:11px;line-height:1.5;padding:2px;word-break:break-all;
  max-height:96px;overflow-y:auto}
.tgtk-picktxt{display:block}
/* 燃料队列：每只一个可取消的小标签（列表里筛不到它时也能移出） */
.tgtk-sdpicks{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px;align-items:center}
.tgtk-sdpick{display:inline-flex;align-items:center;gap:3px;max-width:100%;padding:1px 2px 1px 6px;
  border:1px solid var(--tg-line);border-radius:9px;background:var(--tg-surface2);color:var(--tg-fg2);font-size:10px;white-space:nowrap}
.tgtk-sdpick>span{overflow:hidden;text-overflow:ellipsis;max-width:112px}
.tgtk-sdpick-x{width:16px;height:16px;line-height:14px;text-align:center;border:0;border-radius:8px;
  background:transparent;color:var(--tg-mute);font-size:13px;cursor:pointer;padding:0}
.tgtk-sdpick-x:hover{background:var(--tg-badbg);color:var(--tg-bad)}
.tgtk-sdpick-clear{border:0;background:transparent;color:var(--tg-link);font-size:10px;cursor:pointer;padding:1px 3px}
.tgtk-sdpick-clear:hover{text-decoration:underline}
/* 目标塔那一行：固定在燃料队列上方，替代原来空队列时的提示语 */
.tgtk-picktxt.tgtk-sdtline{color:var(--tg-fg);font-variant-numeric:tabular-nums}
.tgtk-sdsort{min-width:52px;justify-content:center}
/* 「充能」右边的预计固资：跟着按钮一行，不换行、不挤压按钮 */
.tgtk-sdest{flex:none;color:var(--tg-accent-fg);font-size:11px;font-variant-numeric:tabular-nums;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px}
/* 持股等级进度 */
.tgtk-lv{display:flex;align-items:center;gap:6px;margin-top:3px}
.tgtk-lvbar{flex:1;height:3px;background:var(--tg-bar);border-radius:2px;overflow:hidden;min-width:30px}
.tgtk-lvbar i{display:block;height:100%;background:var(--tg-accent);border-radius:2px}
.tgtk-lvtxt{flex:none;color:var(--tg-mute);font-size:10px;font-variant-numeric:tabular-nums}
.tgtk-logbox{display:flex;flex-direction:column;gap:3px;max-height:190px;overflow-y:auto;font-size:12px;padding-right:2px}
.tgtk-log{padding:3px 6px;border-radius:4px;background:var(--tg-sunken2)}
.tgtk-log-info{color:var(--tg-dim)}
.tgtk-log-ok{color:var(--tg-up);background:var(--tg-okbg)}
.tgtk-log-fail{color:var(--tg-bad);background:var(--tg-badbg)}
.tgtk-log-warn{color:var(--tg-warn)}
.tgtk-log-sum{color:var(--tg-accent-fg);background:var(--tg-hit);font-weight:600}
@media (max-width:520px){
  #tgtk-panel{right:12px;left:12px;width:calc(100vw - 24px);bottom:120px}
  .tgtk-tabbar{gap:2px;padding:0 8px 8px}
  .tgtk-tab{font-size:11px;padding:6px 2px;min-width:46px}
  #tgtk-fab{right:12px;bottom:76px}
}
#tgtk-panel[data-theme="light"] .tgtk-btn:hover{background:var(--tg-surface3)}
#tgtk-panel[data-theme="light"] .tgtk-close:hover{color:var(--tg-fg)}
#tgtk-panel[data-theme="light"] .tgtk-danger{background:#f7dfe5;border-color:#e3b4c1;color:#a83349}
#tgtk-panel[data-theme="light"] .tgtk-danger:hover{background:#f2d2da}
/* ===== v2.0：收藏夹分组 / 同步 / 角色页星星（v2.2 改为全部同级） ===== */
.tgtk-favfolder{box-sizing:border-box;width:100%;padding:4px 7px;border-radius:6px;
  border:1px solid var(--tg-line);background:var(--tg-sunken);color:var(--tg-fg);font:inherit;font-size:12px;outline:none}
.tgtk-favfolder:focus{border-color:var(--tg-accent)}
/* 收藏夹分组条：左侧强调色竖条 + 更深底色 + 右侧计数，
   与角色行拉开层次，扫长列表时不会把「夹名」和「角色名」看混 */
.tgtk-favgrp{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:6px;
  margin:6px 0 2px;padding:4px 8px 4px 7px;border-radius:5px;border-left:3px solid var(--tg-accent);
  background:var(--tg-surface2);color:var(--tg-accent-fg);
  font-size:11px;font-weight:700;letter-spacing:.02em;line-height:1.45}
.tgtk-favgrp:first-child{margin-top:0}
.tgtk-favgrp i{flex:none;font-style:normal;color:var(--tg-mute);font-size:10px;font-weight:400;
  font-variant-numeric:tabular-nums}
/* 收藏夹一律用标签列（每个标签可点开「移到别的收藏夹」，多夹时各带一个 ×） */
.tgtk-fchips{display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-top:4px}
.tgtk-fchips i{color:var(--tg-mute);font-style:normal;font-size:11px}
.tgtk-fchip{display:inline-flex;align-items:center;gap:1px;padding:1px 2px 1px 1px;border:1px solid var(--tg-line);
  border-radius:999px;background:var(--tg-sunken);color:var(--tg-fg2);font-size:11px;line-height:1.55}
.tgtk-fchipx{border:0;background:transparent;color:var(--tg-mute);font:inherit;font-size:12px;line-height:1;
  padding:0 3px;cursor:pointer;border-radius:50%}
.tgtk-fchipx:hover{color:var(--tg-bad);background:var(--tg-badbg)}
/* 标签列末尾的「＋」：再收藏到别的收藏夹（虚线描边，和实体夹标签区分开） */
.tgtk-fchipadd{flex:none;display:inline-flex;align-items:center;justify-content:center;height:20px;
  padding:0 7px;border:1px dashed var(--tg-line);border-radius:999px;background:transparent;
  color:var(--tg-mute);font:inherit;font-size:12px;line-height:1;cursor:pointer}
.tgtk-fchipadd:hover,.tgtk-fchipadd:focus{color:var(--tg-accent-fg);border-color:var(--tg-accent);
  background:var(--tg-hit);outline:none}
/* 标签文字本身是按钮：点开「移到别的收藏夹」小下拉 */
.tgtk-fchiplabel{border:0;background:transparent;color:inherit;font:inherit;font-size:11px;line-height:1.55;
  max-width:128px;padding:0 3px 0 6px;cursor:pointer;border-radius:999px;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tgtk-fchiplabel:hover{color:var(--tg-accent-fg)}
.tgtk-fchiplabel:focus-visible{outline:1px solid var(--tg-accent);outline-offset:1px}
.tgtk-movepop{position:fixed;z-index:2147483006;width:186px;max-width:calc(100vw - 12px);box-sizing:border-box;
  padding:6px;display:flex;flex-direction:column;gap:4px;background:var(--tg-bg);color:var(--tg-fg);
  border:1px solid var(--tg-line);border-radius:8px;box-shadow:0 12px 36px rgba(0,0,0,.5);
  font:12px/1.5 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif}
.tgtk-movehead{padding:1px 4px 5px;color:var(--tg-dim);font-size:10px;line-height:1.5;
  border-bottom:1px solid var(--tg-line-soft)}
.tgtk-movelist{display:flex;flex-direction:column;gap:2px;max-height:198px;overflow-y:auto}
.tgtk-moverow{text-align:left;padding:4px 8px;border:0;border-radius:5px;background:var(--tg-sunken2);
  color:var(--tg-fg);font:inherit;font-size:12px;cursor:pointer;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tgtk-moverow:hover,.tgtk-moverow:focus{background:var(--tg-hit);color:var(--tg-accent-fg);outline:none}
.tgtk-moveempty{padding:6px 4px;color:var(--tg-mute);font-size:11px;text-align:center;line-height:1.6}
/* 面板底部的小提示条：收藏成功之类的轻反馈，不放状态行里打扰读数 */
.tgtk-toast{position:absolute;left:50%;bottom:16px;z-index:9;transform:translate(-50%,8px);
  padding:4px 12px;border-radius:999px;background:var(--tg-accent);color:#fff;font-size:11px;
  line-height:1.6;white-space:nowrap;box-shadow:0 6px 18px rgba(0,0,0,.35);
  opacity:0;pointer-events:none;transition:opacity .16s ease,transform .16s ease}
.tgtk-toast.tgtk-toast-on{opacity:1;transform:translate(-50%,0)}
/* 个人页圣殿置顶：开关、顺序列表、卡片上的悬浮胶囊、轻提示 */
.tgtk-sep{height:1px;background:var(--tg-line);margin:1px 0}
.tgtk-pinline{justify-content:space-between}
.tgtk-pintoggle{flex:none;height:24px;padding:0 12px;border-radius:999px;border:1px solid var(--tg-accent);
  background:var(--tg-accent);color:#fff;font:inherit;font-size:11px;line-height:1;cursor:pointer}
.tgtk-pintoggle.tgtk-off{background:var(--tg-sunken);border-color:var(--tg-line);color:var(--tg-mute)}
.tgtk-pinlist{display:flex;flex-direction:column;gap:3px;max-height:320px;overflow-y:auto}
.tgtk-pinlist:empty{display:none}
.tgtk-pinrow{display:flex;align-items:center;gap:5px;padding:1px 4px;border:1px solid var(--tg-line);
  border-radius:6px;background:var(--tg-surface);min-height:22px}
.tgtk-pinrow.tgtk-pindragging{opacity:.4}
.tgtk-pinrow.tgtk-drop-before{border-top-color:var(--tg-accent);box-shadow:inset 0 2px 0 var(--tg-accent)}
.tgtk-pinrow.tgtk-drop-after{border-bottom-color:var(--tg-accent);box-shadow:inset 0 -2px 0 var(--tg-accent)}
.tgtk-pinno{flex:none;width:13px;text-align:center;color:var(--tg-mute);font-size:10px}
.tgtk-pinmain{flex:1 1 auto;min-width:0;display:flex;align-items:center;overflow:hidden}
.tgtk-pinmain .tgtk-name{font-size:12px;line-height:1.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tgtk-pinactions{flex:none;display:flex;align-items:center;gap:2px}
.tgtk-grip{width:17px;height:17px;padding:0;display:inline-flex;align-items:center;justify-content:center;
  border:1px solid var(--tg-line);border-radius:4px;background:var(--tg-sunken);color:var(--tg-mute);
  font:10px/1 -apple-system,"Segoe UI",Arial,sans-serif;letter-spacing:-1px;
  cursor:grab;touch-action:none;-webkit-user-select:none;user-select:none}
.tgtk-grip:hover{color:var(--tg-accent-fg);border-color:rgba(228,111,161,.6);background:rgba(228,111,161,.12)}
.tgtk-grip:active{cursor:grabbing}
.tgtk-pinactions .tgtk-mini{width:17px;height:17px;padding:0;display:inline-flex;align-items:center;
  justify-content:center;font-size:11px;line-height:1;border-radius:4px;
  border:1px solid rgba(228,111,161,.45);background:rgba(228,111,161,.14);color:var(--tg-accent-fg)}
.tgtk-pinactions .tgtk-mini:hover:enabled{background:var(--tg-accent);border-color:var(--tg-accent);color:#fff}
.tgtk-pinactions .tgtk-mini:disabled{opacity:.38;border-color:var(--tg-line);background:var(--tg-sunken);color:var(--tg-mute)}
.tgtk-pinactions .tgtk-mini-x:hover:enabled{background:var(--tg-bad);border-color:var(--tg-bad);color:#fff}
.tgtk-mini-x:hover{color:var(--tg-bad);background:var(--tg-badbg)}
/* 个人页圣殿置底：平时收成一行，点开才展开配置 */
.tgtk-secthead{display:flex;align-items:center;gap:6px;width:100%;padding:2px 0;border:0;background:none;
  color:inherit;font:inherit;text-align:left;cursor:pointer}
.tgtk-secthead:hover .tgtk-caret,.tgtk-secthead:focus-visible .tgtk-caret{color:var(--tg-accent-fg)}
.tgtk-secthead:focus{outline:none}
.tgtk-caret{flex:none;width:12px;color:var(--tg-mute);font-size:10px;line-height:1;transition:transform .12s ease}
.tgtk-sectcount{margin-left:auto;color:var(--tg-mute);font-size:11px;white-space:nowrap}
.tgtk-sectbody{display:flex;flex-direction:column;gap:6px;padding:6px 0 2px}
.tgtk-sectbody[hidden]{display:none}
.tgtk-botrow{cursor:default}
.tgtk-botx{flex:none;height:18px;padding:0 7px;border-radius:999px;border:1px solid rgba(228,111,161,.45);
  background:rgba(228,111,161,.12);color:var(--tg-accent-fg);font:inherit;font-size:10px;line-height:1;cursor:pointer}
.tgtk-botx:hover{background:var(--tg-bad);border-color:var(--tg-bad);color:#fff}
/* 卡片上的置顶按钮：样式写在行内，并随卡片所在文档单独注入（见 PIN_CSS） */
.tgtk-pintoast{position:fixed;left:50%;top:18px;z-index:2147483000;transform:translate(-50%,-6px);
  padding:5px 14px;border-radius:999px;background:var(--tg-accent);color:#fff;font-size:12px;
  line-height:1.7;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,.32);
  opacity:0;pointer-events:none;transition:opacity .16s ease,transform .16s ease}
.tgtk-pintoast.tgtk-toast-on{opacity:1;transform:translate(-50%,0)}
/* 随手记：标题栏的书本按钮 + 整页记事纸 */
.tgtk-notebtn{display:inline-flex;align-items:center;justify-content:center}
.tgtk-notebtn.tgtk-on{background:rgba(228,111,161,.16);border-color:rgba(228,111,161,.45);color:var(--tg-accent-fg)}
.tgtk-noteview{flex:1 1 auto;min-height:260px;display:flex;flex-direction:column;gap:6px;padding:10px 12px 12px}
.tgtk-noteview[hidden]{display:none}
#tgtk-panel .tgtk-notebody{flex:1 1 auto;min-height:150px;width:100%;resize:none;padding:8px 10px;
  border:1px solid var(--tg-line);border-radius:8px;background:var(--tg-sunken);color:var(--tg-fg);
  font-size:13px;line-height:1.75;outline:none}
#tgtk-panel .tgtk-notebody:focus{border-color:var(--tg-accent)}
#tgtk-panel .tgtk-notebody::placeholder{color:var(--tg-mute)}
.tgtk-notefoot{flex:0 0 auto;display:flex;align-items:center;gap:6px;color:var(--tg-mute);font-size:11px}
.tgtk-notefoot .tgtk-spacer{flex:1;min-width:2px}
.tgtk-notefoot .tgtk-btn{flex:none;font-size:11px;padding:3px 9px}
.tgtk-syncbox{margin:4px 0;padding:6px 8px;border:1px solid var(--tg-line);border-radius:8px;background:var(--tg-sunken)}
.tgtk-syncbox summary{cursor:pointer;color:var(--tg-accent-fg);font-size:12px;font-weight:500;outline:none}
.tgtk-syncbox[open] summary{margin-bottom:6px}
.tgtk-syncbox textarea{box-sizing:border-box;width:100%;resize:vertical;min-height:52px;margin-top:4px;
  padding:5px 7px;border-radius:6px;border:1px solid var(--tg-line);background:var(--tg-sunken);
  color:var(--tg-fg);font:11px/1.45 ui-monospace,Menlo,Consolas,monospace;outline:none}
.tgtk-syncbox textarea:focus{border-color:var(--tg-accent)}
.tgtk-syncbox .tgtk-stat{margin:2px 0 6px}
.tgtk-syncbox .tgtk-line{margin:3px 0}
#tgtk-star{position:fixed;right:12px;bottom:12px;z-index:2147483002;width:24px;height:24px;padding:0;
  border-radius:50%;border:1px solid var(--tg-line);background:var(--tg-bg);color:var(--tg-mute);
  font-size:14px;line-height:22px;text-align:center;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,.22)}
#tgtk-star:hover{border-color:var(--tg-accent);color:var(--tg-accent)}
#tgtk-star.tgtk-star-on{color:#f5b73d;border-color:#e6a72c;background:#3a2c14;text-shadow:0 0 8px rgba(245,183,61,.6)}
#tgtk-star[data-theme="light"].tgtk-star-on{background:#fff3d6;color:#b8790d;border-color:#e0a938}
.tgtk-starpop{position:fixed;z-index:2147483007;width:240px;max-width:calc(100vw - 12px);box-sizing:border-box;
  padding:8px;display:flex;flex-direction:column;gap:6px;background:var(--tg-bg);color:var(--tg-fg);
  border:1px solid var(--tg-line);border-radius:9px;box-shadow:0 12px 36px rgba(0,0,0,.5);
  font:12px/1.5 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif}
.tgtk-starpop .tgtk-favpoplist{max-height:210px}
.tgtk-starpop,.tgtk-favpop{max-height:calc(100vh - 12px);overflow-y:auto}
.tgtk-starpop .tgtk-line input,.tgtk-starpop .tgtk-line select{min-width:0;flex:1}
.tgtk-startip{color:var(--tg-dim);font-size:11px}
.tgtk-starcreate{padding-top:6px;border-top:1px solid var(--tg-line-soft);display:flex;flex-direction:column;gap:4px}
.tgtk-starremove{width:100%;margin-top:4px}
/* 星标浮层：取消在最左、确定在最右，左右对称 */
.tgtk-starpop .tgtk-starfoot{justify-content:space-between;gap:6px;padding-top:6px;
  border-top:1px solid var(--tg-line-soft)}
.tgtk-starpop .tgtk-starfoot .tgtk-btn{flex:none;min-width:56px}
.tgtk-starpop .tgtk-starcreate .tgtk-line{gap:5px}
/* 收藏页：所有按钮同一规格、标签定宽，散落的操作收进整齐的工具行 */
#tgtk-panel .tgtk-favtools .tgtk-line{gap:6px;flex-wrap:nowrap}
#tgtk-panel .tgtk-favtools .tgtk-allowwrap{flex-wrap:wrap}
#tgtk-panel .tgtk-favtools .tgtk-label{flex:none;min-width:48px}
#tgtk-panel .tgtk-favtools .tgtk-spacer{flex:1;min-width:2px}
#tgtk-panel .tgtk-favtools .tgtk-btn{
  flex:none;padding:4px 9px;min-height:26px;font-size:11px;font-weight:400;line-height:1.35;
  border:1px solid var(--tg-line);border-radius:6px;background:var(--tg-surface);color:var(--tg-fg2)}
#tgtk-panel .tgtk-favtools .tgtk-btn:hover{border-color:var(--tg-accent);color:var(--tg-accent-fg);background:var(--tg-hit)}
#tgtk-panel .tgtk-favtools .tgtk-btn.tgtk-primary{
  font-weight:400;color:var(--tg-accent-fg);background:var(--tg-surface);border-color:rgba(228,111,161,.45)}
#tgtk-panel .tgtk-favtools .tgtk-btn.tgtk-danger,
#tgtk-panel[data-theme="light"] .tgtk-favtools .tgtk-btn.tgtk-danger{
  font-weight:400;color:var(--tg-bad);background:var(--tg-surface);border-color:var(--tg-line)}
#tgtk-panel .tgtk-favtools .tgtk-btn.tgtk-danger:hover{border-color:var(--tg-bad)}
#tgtk-panel .tgtk-favtools select{flex:1;min-width:0;max-width:none}
/* 收藏夹 / 排序两个下拉等宽，视觉上才对得齐（这两个 select 只有 id，没有 class） */
#tgtk-panel .tgtk-favtools #tgtk-favfolder,
#tgtk-panel .tgtk-favtools #tgtk-favsort{flex:0 0 138px;width:138px;max-width:138px}
/* 手动添加：输入框占大头，右边「加到哪个夹」收窄 */
#tgtk-panel .tgtk-favtools .tgtk-favaddline input[type=text],
#tgtk-panel .tgtk-favtools .tgtk-favaddline input[type=search]{flex:1 1 auto;min-width:0;width:auto}
#tgtk-panel .tgtk-favtools .tgtk-favaddline #tgtk-favaddfolder{flex:0 0 104px;width:104px;max-width:104px}
#tgtk-panel .tgtk-favtools input[type=text]{flex:1;min-width:0;width:auto}
#tgtk-panel .tgtk-favtools .tgtk-syncbox .tgtk-line{flex-wrap:wrap}
#tgtk-panel .tgtk-favtools .tgtk-syncbox select{flex:none;width:auto;max-width:190px}
#tgtk-panel .tgtk-favtools .tgtk-syncbox input[type=text]{flex:1;min-width:120px}
#tgtk-panel .tgtk-favtools .tgtk-favpick .tgtk-btn{padding:4px 9px;font-size:11px}
/* 角色收藏浮层：给 input/select 补组件样式消掉浏览器默认黑框，按钮不再实心加粗 */
.tgtk-starpop input[type=text],.tgtk-starpop select{
  box-sizing:border-box;min-width:0;flex:1;padding:4px 7px;border-radius:6px;
  border:1px solid var(--tg-line);background:var(--tg-sunken);color:var(--tg-fg);
  font:inherit;font-size:11px;outline:none}
.tgtk-starpop input[type=text]:focus,.tgtk-starpop select:focus{border-color:var(--tg-accent)}
.tgtk-starpop .tgtk-favhead{font-size:11px;font-weight:400;color:var(--tg-dim)}
.tgtk-starpop .tgtk-favhead span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tgtk-starpop .tgtk-favrow.tgtk-on{outline:1px solid rgba(228,111,161,.4);background:var(--tg-surface3)}
.tgtk-starpop .tgtk-btn,.tgtk-starpop .tgtk-btn.tgtk-primary,
.tgtk-starpop .tgtk-btn.tgtk-danger,.tgtk-starpop .tgtk-btn.tgtk-starremove{
  padding:5px 10px;font-size:11px;font-weight:400;border-radius:6px;
  border:1px solid var(--tg-line);background:var(--tg-surface);color:var(--tg-fg2)}
.tgtk-starpop .tgtk-btn:hover{border-color:var(--tg-accent);color:var(--tg-accent-fg);background:var(--tg-hit)}
.tgtk-starpop .tgtk-btn.tgtk-primary{color:var(--tg-accent-fg);border-color:rgba(228,111,161,.45)}
.tgtk-starpop .tgtk-starremove,.tgtk-starpop .tgtk-starremove:hover{color:var(--tg-bad);background:transparent}
.tgtk-starpop .tgtk-starremove:hover{border-color:var(--tg-bad)}
/* 旧版角色页「$」历史交易浮层 */
.tgtk-histpop{position:fixed;z-index:2147483007;width:432px;max-width:calc(100vw - 12px);box-sizing:border-box;
  padding:8px;display:flex;flex-direction:column;gap:6px;background:var(--tg-bg);color:var(--tg-fg);
  border:1px solid var(--tg-line);border-radius:9px;box-shadow:0 12px 36px rgba(0,0,0,.5);
  font:12px/1.5 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif}
.tgtk-histpop .tgtk-favhead{font-size:11px;font-weight:400;color:var(--tg-dim)}
.tgtk-histpop .tgtk-favhead span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tgtk-histsum{color:var(--tg-dim);font-size:10px;font-variant-numeric:tabular-nums}
.tgtk-histlist{display:flex;flex-direction:column;max-height:46vh;overflow-y:auto;box-sizing:border-box;
  border:1px solid var(--tg-line-soft);border-radius:6px}
.tgtk-histrow{display:grid;grid-template-columns:86px 1fr 1fr 1fr;gap:6px;align-items:center;
  padding:4px 8px;border-bottom:1px solid var(--tg-line-soft);font-variant-numeric:tabular-nums}
.tgtk-histrow:last-child{border-bottom:0}
.tgtk-histrow i{font-style:normal;text-align:right;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tgtk-histrow i:first-child{text-align:left;color:var(--tg-fg2)}
.tgtk-histrow:not(.tgtk-histhd):hover{background:var(--tg-hit)}
.tgtk-histhd{position:sticky;top:0;z-index:1;background:var(--tg-sunken2);color:var(--tg-mute);
  font-size:10px;font-weight:600;border-bottom:1px solid var(--tg-line)}
.tgtk-histempty{color:var(--tg-mute);font-size:11px;padding:16px 8px;text-align:center}
.tgtk-histfoot{display:flex;align-items:center;justify-content:space-between;gap:8px;
  border-top:1px solid var(--tg-line-soft);padding-top:6px}
.tgtk-histstat{color:var(--tg-mute);font-size:10px}
.tgtk-histpop .tgtk-btn{flex:none;padding:4px 10px;font-size:11px;font-weight:400;line-height:1.35;
  border:1px solid var(--tg-line);border-radius:6px;background:var(--tg-surface);color:var(--tg-fg2);cursor:pointer}
.tgtk-histpop .tgtk-btn:hover:enabled{border-color:var(--tg-accent);color:var(--tg-accent-fg);background:var(--tg-hit)}
.tgtk-histpop .tgtk-btn:disabled{opacity:.45;cursor:default}
/* 页面居中的弹窗（股权拍卖用大弹窗；往期拍卖用下面的紧凑居中版） */
.tgtk-histpop.tgtk-gxmodal{position:fixed !important;left:50% !important;top:50% !important;
  transform:translate(-50%,-50%);width:820px;max-width:calc(100vw - 32px);max-height:86vh;
  z-index:2147483010;padding:12px 14px;gap:8px;font-size:13px;border-radius:12px;
  overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.55)}
/* 往期拍卖：水平居中 + 顶部钉住，保持 432px 紧凑长度。
   不能用 translateY(-50%) 做垂直居中：那样浮层高度随每周数据量变化，
   标题栏、列头、「前一周 / 后一周」会跟着上下跑，翻周时得不停换地方点。
   现在顶部固定，数据变多只向下延长；列表吃到上限后自己内部滚动，
   列头是 sticky，永远停在原位。 */
.tgtk-histpop.tgtk-gxcenter{position:fixed !important;left:50% !important;
  top:calc(50% - 170px) !important;right:auto !important;bottom:auto !important;
  transform:translateX(-50%);
  z-index:2147483010;max-height:calc(50vh + 154px);
  display:flex;flex-direction:column;overflow:hidden;
  box-shadow:0 20px 52px rgba(0,0,0,.5)}
/* 标题栏 / 汇总 / 页脚高度恒定，不参与伸缩；汇总强制单行，长文案也不把列头挤下去 */
.tgtk-histpop.tgtk-gxcenter > :not(.tgtk-histlist){flex:none}
.tgtk-histpop.tgtk-gxcenter .tgtk-histsum{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* 列表按内容自然长高（数据少就短、数据多向下长），触到浮层上限后内部滚动 */
.tgtk-histpop.tgtk-gxcenter .tgtk-histlist{flex:0 1 auto;min-height:120px;max-height:none;overflow-y:auto}
.tgtk-histpop.tgtk-gxmodal.tgtk-gxbid{width:465px}
.tgtk-gxmodal .tgtk-favhead{font-size:13px;gap:10px;align-items:center;min-height:24px}
.tgtk-gxmodal .tgtk-gxheadtitle{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;
  white-space:nowrap;color:var(--tg-fg)}
.tgtk-gxheadright{display:flex;align-items:center;gap:4px;flex:none}
.tgtk-gxmodal .tgtk-gxnav{padding:2px 8px !important;font-size:11px !important;line-height:1.4 !important}
.tgtk-gxmodal .tgtk-favclose{font-size:18px;padding:0 6px}
.tgtk-gxmodal .tgtk-histlist{max-height:56vh}
.tgtk-gxmodal .tgtk-histrow{padding:6px 10px;font-size:12.5px}
.tgtk-gxmodal .tgtk-histsum{font-size:12px;color:var(--tg-fg2)}
.tgtk-gxmodal .tgtk-gxfoot{justify-content:flex-start;gap:10px;border-top:0;padding-top:0}
/* 股权拍卖：标签行 + 输入行（大号输入框） */
.tgtk-gxlabels{display:grid;grid-template-columns:1fr 1fr auto;gap:10px;color:var(--tg-mute);font-size:12px}
.tgtk-gxlabels .tgtk-gxsum{text-align:right;color:var(--tg-fg2);font-size:12px;font-variant-numeric:tabular-nums}
.tgtk-gxrow{display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:center}
.tgtk-gxrow input{width:100%;height:38px;box-sizing:border-box;padding:0 10px;font-size:15px;
  border:1px solid var(--tg-line);border-radius:8px;background:var(--tg-surface);color:var(--tg-fg);
  font-variant-numeric:tabular-nums}
.tgtk-gxrow input:focus{outline:none;border-color:var(--tg-accent)}
.tgtk-gxrow .tgtk-gxok{height:38px;padding:0 26px;font-size:14px;font-weight:600}
.tgtk-gxbid .tgtk-gxquick{font-size:13px;gap:16px;padding:2px 2px 7px}
.tgtk-gxbid .tgtk-gxmsg{padding-top:2px}
/* 竞拍浮层底部：取消竞拍 / 提示 / 右下角「数量降低提醒」 */
.tgtk-gxfoot .tgtk-gxmsg{flex:1 1 auto;min-width:0}
.tgtk-gxwarn{margin-left:auto;flex:none;display:inline-flex;align-items:center;gap:4px;
  color:var(--tg-mute);font-size:11px;line-height:1.4;cursor:pointer;user-select:none;white-space:nowrap}
.tgtk-gxwarn input{margin:0;width:12px;height:12px;cursor:pointer;accent-color:#d4568e}
\`;`,
};

module.exports = { BLOCKS };
