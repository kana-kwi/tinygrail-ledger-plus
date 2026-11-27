/*
 * 组装「账本plus」独立组件。
 *
 * 抽取源：vendor/工具箱快照.js（本地快照，**不再读工具箱主文件**）
 *   - 账本Plus 是独立组件，由单独的会话维护，不参与工具箱制作。
 *   - 快照是一次性从工具箱原文抽出来固化的，工具箱改行号也不影响这里。
 *   - 需要重新同步原文：node make-vendor.js [工具箱路径]
 *
 * 用法：node build-lp.js
 * 输出：工具箱/账本plus/tinygrail-ledger-plus.component.js
 */
const fs = require('fs');
const path = require('path');

const OUT = 'D:/下载/CodeArts Agent HC/账本plus/tinygrail-ledger-plus.component.js';
const VENDOR = path.join(__dirname, 'vendor', '工具箱快照.js');

const { BLOCKS } = require(VENDOR);
// 取块（名字对应 make-vendor.js 里的 BLOCKS 表）
function seg(name) {
  const s = BLOCKS[name];
  if (s === undefined) throw new Error('快照里没有块：' + name + '（检查 make-vendor.js）');
  return s;
}

/*
 * 命名空间替换：把工具箱的前缀换成账本plus自己的，避免两个组件同时启用时
 * 样式 / DOM id / localStorage 键互相踩。只替换整词前缀，不碰 tinygrail / 中文。
 *   tgtk-  → tglp-     （CSS class / id）
 *   TGTK   → TGLP      （window 全局测试钩子）
 *   --tg-  → --tl-     （CSS 变量）
 *   tgtk:  → tglp:     （localStorage 键前缀，如 tgtk:names:v1）
 */
function ns(s) {
  return s
    .replace(/--tg-/g, '--tl-')
    .replace(/\btgtk-/g, 'tglp-')
    .replace(/\btgtk:/g, 'tglp:')
    .replace(/\bTGTK\b/g, 'TGLP');
}

/* ---------- 抽取的原文块 ---------- */

// 基础工具：h / num / fmt / sleep / mapLimit（1574-1610）
// v1.5.6 修复：原文 h() 里 onClick -> addEventListener('Click')，事件名首字母大写
// 在真实 DOM 里大小写敏感，导致所有 h() 绑定的 onClick（分页按钮/表头排序/明细行点击）
// 全部不触发。这里统一把事件名转小写。（测试夹具此前先 gotoPage(2) 再点，假阳性漏过。）
const BLOCK_BASE = ns(seg('BLOCK_BASE')).replace(
  "el.addEventListener(k.slice(2), v)",
  "el.addEventListener(k.slice(2).toLowerCase(), v)"
);
// num0 / nowMs（873-877）
const BLOCK_NUM0 = ns(seg('BLOCK_NUM0'));
// 分类常量：LOG_TYPE / FLOW_RULES / FLOW_LABEL / FUND_* / STOCK_* / FIXED_RULES（464-535）
// v1.4.0 起按用户要求改分类口径：印花税独立、股息→净股息、分红→萌王返利、大乐透/推荐奖励单列，
// v1.5.7 新增：祝福（献上祝福）、手续费（取消/修改竞拍收费）、精炼（增购消耗）。
// 收入和支出各自一套显示名。改动只作用于账本plus（工具箱原文不动）。
const CONST_RAW = ns(seg('CONST_RAW'));
const BLOCK_CONST = (function (s) {
  // ① Type 7 = 印花税（原文归进 other，等于把税混进「其他」）
  s = s.replace("    7: 'other',", "    7: 'stamp',");
  // ② FLOW_RULES 整段替换：新分类放前面（匹配是先具体后笼统），「分红/奖励」不再吃掉签到/推荐
  s = s.replace(
    /const FLOW_RULES = \[[\s\S]*?\n  \];/,
    [
      'const FLOW_RULES = [',
      "    { key: 'welfare', label: '福利', kw: ['福利'] },",
      "    { key: 'checkin', label: '签到', kw: ['bangumi每日登录奖励'] },",
      "    { key: 'aucbonus', label: '分红', kw: ['萌王投票返利', '竞拍分红', '竞拍分成', '拍卖分红', '分红', '萌王', '返利'] },",
      "    { key: 'lotto', label: '大乐透', kw: ['萌王大乐透', '大乐透'] },",
      "    { key: 'refer', label: '推荐', kw: ['被推荐奖励', '推荐奖励', '推荐有奖'] },",
      "    { key: 'stamp', label: '印花税', kw: ['印花税'] },",
      "    { key: 'bless', label: '祝福', kw: ['献上祝福', '祝福'] },",
      "    { key: 'fee', label: '手续费', kw: ['手续费'] },",
      "    { key: 'refine', label: '精炼', kw: ['增购', '精炼'] },",
      "    { key: 'scratch', label: '刮刮乐', kw: ['刮刮乐', '抽奖', '转盘'] },",
      '    {',
      "      key: 'item',",
      "      label: '道具',",
      "      kw: ['混沌魔方', '虚空道标', '星光碎片', '闪光结晶', '鲤鱼之眼', '道具', '转移'],",
      '    },',
      "    { key: 'ico', label: 'ICO', kw: ['ICO', 'ico', '中签', '配售', '申购'] },",
      "    { key: 'auction', label: '竞拍', kw: ['竞拍', '拍卖', '中标', '出价'] },",
      "    { key: 'packet', label: '红包', kw: ['红包'] },",
      "    { key: 'dividend', label: '股息', kw: ['股息'] },",
      "    { key: 'sacrifice', label: '献祭', kw: ['献祭', '资产重组', '融资'] },",
      "    { key: 'sell', label: '卖出', kw: ['卖出'] },",
      "    { key: 'buy', label: '买入', kw: ['买入'] },",
      '  ];',
    ].join('\n')
  );
  // ③ 方向各一套显示名
  s = s.replace(
    /const FLOW_LABEL = Object\.create\(null\);[\s\S]*?FLOW_LABEL\.tax = '[^']*';/,
    [
      'const FLOW_LABEL = Object.create(null);',
      '  FLOW_RULES.forEach((r) => (FLOW_LABEL[r.key] = r.label));',
      "  FLOW_LABEL.other = '其他';",
      "  FLOW_LABEL.tax = '股息税';",
      "  FLOW_LABEL.stamp = '印花税';",
      '  /* 收入和支出对同一个 key 的叫法不一样（用户指定口径） */',
      '  const FLOW_LABEL_IN = Object.assign({}, FLOW_LABEL, {',
      "    dividend: '股息',",
      "    aucbonus: '分红',",
      "    refer: '推荐',",
      "    buy: '买入',",
      "    other: '其他',",
      '  });',
      '  const FLOW_LABEL_OUT = Object.assign({}, FLOW_LABEL, {',
      "    other: '股息税',",
      "    tax: '个人所得税',",
      "    stamp: '印花税',",
      '  });',
      '  /** 按方向取来源名 */',
      '  function fundLabel(dir, key) {',
      '    const m = dir === \'in\' ? FLOW_LABEL_IN : FLOW_LABEL_OUT;',
      "    return m[key] || FLOW_LABEL[key] || '其他';",
      '  }',
    ].join('\n')
  );
  // ④ 各方向允许出现的来源（删掉不该出现在这一侧的，印花税单列）
  s = s.replace(
    /const FUND_IN_KINDS = \[[^\]]*\];/,
    "const FUND_IN_KINDS = ['sell', 'dividend', 'aucbonus', 'sacrifice', 'ico', 'packet', 'refer', 'welfare', 'checkin', 'other', 'lotto'];"
  );
  s = s.replace(
    /const FUND_OUT_KINDS = \[[^\]]*\];/,
    "const FUND_OUT_KINDS = ['buy', 'auction', 'ico', 'packet', 'bless', 'refine', 'fee', 'stamp', 'other', 'scratch'];"
  );
  return s;
})(CONST_RAW);
// api（2718-2768）
const BLOCK_API = ns(seg('BLOCK_API'));
// allDocs（2770-2800）
const BLOCK_ALLDOCS = ns(seg('BLOCK_ALLDOCS'));
// guessedUsername（2944-2964）
const BLOCK_GUESS = ns(seg('BLOCK_GUESS'));
// loadNames（2966-2992）
const BLOCK_LOADNAMES = ns(seg('BLOCK_LOADNAMES'));
// nameCache 落盘（821-844）
const BLOCK_NAMECACHE = ns(seg('BLOCK_NAMECACHE'));
// knownLvOf（1852-1861）
const BLOCK_KNOWNLV = ns(seg('BLOCK_KNOWNLV'));
// charaName / charaLink（3045-3061）
const BLOCK_CHARALINK = ns(seg('BLOCK_CHARALINK'));
// todayKey（3017-3027）/ recordSnapshot（3029-3043）
const BLOCK_SNAP = ns(seg('BLOCK_SNAP'));
// selfKey（5186-5199，selfKeyCache 声明已在骨架里）
const BLOCK_SELFKEY = ns(seg('BLOCK_SELFKEY'));
// fetchAllHoldings（4119-4162）
const BLOCK_HOLDINGS = ns(seg('BLOCK_HOLDINGS'));

// 账本纯逻辑与分类（7059-7713）：从 logTs 到 logKey（不含 scanLogs 7715+）
const LOGIC_RAW = ns(seg('LOGIC_RAW'));
const BLOCK_LOGIC = (function (s) {
  // 股息 / 税费是账号级的：站点日志里的 RelatedId 只是「顺带写的角色」，
  // 记在某个角色头上会误导（用户报「股息不该有角色」）。这里统一不返回角色。
  // 同时把印花税关键词提前判掉，别落到「其他」。
  const oldChara = /function logCharaId\(x\) \{[\s\S]*?\n  \}/;
  if (oldChara.test(s)) {
    s = s.replace(oldChara, [
      'function logCharaId(x) {',
      '    const desc = String(x.Description || \'\');',
      '    const t = num(x.Type);',
      '    // 股息 / 税费 / 签到 / 福利 / 推荐 / 大乐透 / 分红 不针对具体角色（刮刮乐获奖要保留角色，股数统计用）',
      '    if (/刮刮乐|彩票/.test(desc) && !(num(x.Amount) > 0)) return 0;',
      '    if (/股息|印花税|所得税|签到|每日登录|节日福利|福利|推荐奖励|大乐透|返利|投票返利|竞拍分红|竞拍分成|拍卖分红|红包/.test(desc) || t === 7 || t === 14) return 0;',
      '    const byDesc = descCharaId(desc);',
      '    if (byDesc) return byDesc;',
      '    return x.RelatedId === undefined || x.RelatedId === null ? 0 : num(x.RelatedId);',
      '  }',
    ].join('\n'));
  }
  // 签到 / 竞拍分红 / 大乐透 / 福利 / 推荐奖励：必须在 Type 和笼统关键词之前判断
  s = s.replace(
    "    if (TAX_RE.test(s)) return 'tax';",
    "    if (TAX_RE.test(s)) return 'tax';\n    if (/福利/.test(s)) return 'welfare';\n    if (/股权融资/.test(s)) return 'sacrifice';\n    if (/bangumi每日登录奖励/.test(s)) return 'checkin';\n    if (/绑定手机奖励|注册.*奖励/.test(s)) return 'refer';\n    if (/萌王投票返利/.test(s)) return 'aucbonus';\n    if (/大乐透/.test(s)) return 'lotto';\n    if (/被推荐奖励|推荐奖励|推荐有奖/.test(s)) return 'refer';\n    if (/印花税/.test(s)) return 'stamp';\n    if (/手续费/.test(s)) return 'fee';\n    if (/献上祝福|祝福/.test(s)) return 'bless';\n    if (/增购|精炼/.test(s)) return 'refine';"
  );
  return s;
})(LOGIC_RAW);
// copyLogs（8192-8253）：统计口径里的复制功能继续沿用原文。
// flowRow / flowBlock / renderLedger 不再抽取原文——UI 大改后在 _custom.js 里重写。
const BLOCK_RENDER = ns(seg('BLOCK_RENDER'));
// line / select / input（8256-8280）
const BLOCK_UIHELP = ns(seg('BLOCK_UIHELP'));
// setLogStatus / setButtonsDisabled（21674-21715）
const BLOCK_STATUS = ns(seg('BLOCK_STATUS'));
// copyText / fallback（21846-21868）
const BLOCK_COPY = ns(seg('BLOCK_COPY'));

// CSS（21913-22539）：整段样式，命名空间替换后账本部分必然包含
const CSS_RAW = seg('CSS_RAW');
const BLOCK_CSS = ns(CSS_RAW);

/* ---------- 组装 ---------- */
const out = [];
out.push(`/*!
 * 小圣杯账本2.0（tinygrail-ledger-plus）
 * 独立账本组件：全量读取资金日志（不设页数上限），IndexedDB 长期记忆。
 * 统计口径 / 界面沿用「小圣杯工具箱」账本，经命名空间隔离后抽离，二者可同时启用。
 * 版本 v1.6.6（自定义日期改为年/月/日下拉：年份只列 2019–2100，2019 年月份只列 7–12，不再出现更早日期）
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
        .filter((x) => x && /^\d{4}-\d{2}-\d{2}$/.test(String(x.d)))
        .map((x) => ({ d: String(x.d), cc: num0(x.cc), mv: num0(x.mv) }))
        .sort((a, b) => (a.d < b.d ? -1 : 1))
        .slice(-180);
    }
  } catch (e) {}
`);

out.push('\n  /* ============ 基础工具（原文抽取） ============ */\n' + BLOCK_NUM0 + '\n' + BLOCK_BASE);
out.push('\n  /* ============ 分类常量（原文抽取，统计口径一致） ============ */\n' + BLOCK_CONST);
out.push('\n  /* ============ 网络 / 环境（原文抽取） ============ */\n' + BLOCK_API);
out.push('\n' + BLOCK_ALLDOCS);
out.push('\n' + BLOCK_GUESS);
out.push('\n  /* ============ 角色名 / 快照（原文抽取） ============ */\n' + BLOCK_NAMECACHE);
out.push('\n' + BLOCK_KNOWNLV);
out.push('\n' + BLOCK_CHARALINK);
out.push('\n' + BLOCK_SNAP);
out.push('\n' + BLOCK_SELFKEY);
out.push('\n' + BLOCK_LOADNAMES);
out.push('\n  /* ============ 持仓（原文抽取，仅用于资产卡市值） ============ */\n' + BLOCK_HOLDINGS);
out.push('\n  /* ============ 账本统计逻辑（原文抽取） ============ */\n' + BLOCK_LOGIC);
out.push('\n  /* ============ 账本渲染（原文抽取） ============ */\n' + BLOCK_RENDER);
out.push('\n  /* ============ 界面小工具（原文抽取） ============ */\n' + BLOCK_UIHELP);
out.push('\n  /* ============ 状态 / 复制（原文抽取） ============ */\n' + BLOCK_STATUS);
out.push('\n' + BLOCK_COPY);
// CSS 必须在 boot() 之前定义（boot 里 style.textContent = CSS）
// 末尾补一条 --tl-text 兜底：工具箱原文里日期框用了 var(--tg-text) 却没定义，
// 这里显式指向前景色，避免账本plus 的日期输入框颜色异常。
out.push('\n  /* ============ 样式（原文抽取，命名空间已换） ============ */\n' + BLOCK_CSS.replace(
  '`;',
  '\n#tglp-panel{--tl-text:var(--tl-fg)}\n`;'
));

/* 自己写的：IndexedDB 层 + 全范围扫描 + 面板壳 + 启动 */
const CUSTOM = fs.readFileSync(path.join(path.dirname(OUT), '_custom.js'), 'utf8').replace(/\r\n/g, '\n');
out.push('\n' + CUSTOM);

out.push('\n})();\n');

fs.writeFileSync(OUT, out.join('\n'), 'utf8');
console.log('生成：' + OUT);
console.log('行数：' + fs.readFileSync(OUT, 'utf8').split('\n').length);
