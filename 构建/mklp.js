// 生成 testlp：账本plus 组件的核心验证
//   ① 全范围读取（造 160 页 > 工具箱 150 上限，验证能全部读进来）
//   ② IndexedDB 持久化：扫完后 store 里有数据，清空内存后 loadLocal 能恢复
//   ③ 增量：第二次 scan 只读头部 1 页（撞上已存记录就停）
//   ④ 统计口径：账本数据能算出正确的资金收入/支出
// node mklp.js <comp.js>
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const comp = fs.readFileSync(
  process.argv[2] || 'D:/下载/CodeArts Agent HC/账本plus/tinygrail-ledger-plus.component.js',
  'utf8'
);

const head = `<!doctype html><meta charset="utf-8"><title>testlp</title>
<style>body{font:13px/1.6 "Microsoft YaHei",sans-serif;margin:0;padding:12px}
#out{white-space:pre-wrap}</style>
<pre id="out"></pre>`;

const mock = `
<script>
(function () {
  window.__calls = [];
  window.__PAGES = 0;
  window.__PAGE_SIZE = 200;
  window.__extraHead = 0;   // 头部新增条数（模拟新记录）
  var BASE = Date.parse('2026-10-31T00:00:00');

  // 模拟 bgm 个性化面板 API
  window.__tabs = [];
  window.chiiLib = { ukagaka: {
    addPanelTab: function (cfg) { window.__tabs.push(cfg); },
    removePanelTab: function (key) {
      window.__tabs = window.__tabs.filter(function (t) { return t.tab !== key; });
    }
  } };

  function J(v) {
    return { ok: true, status: 200, type: 'cors',
      headers: { get: function (k) { return String(k).toLowerCase() === 'content-type' ? 'application/json' : null; } },
      json: function () { return Promise.resolve({ State: 0, Value: v }); } };
  }
  function mkItem(i, page, idx) {
    // 每秒一条，越往后越旧
    var ts = new Date(BASE - (page * 1000 + idx) * 1000).toISOString();
    var type = (i % 3 === 0) ? 6 : 4; // 6 卖出(+cc) / 4 买入(-cc)
    var ch = type === 6 ? 500 : -300;
    return { Id: 100000 + i, LogTime: ts, Type: type, Change: ch,
      Amount: (i % 7) + 1, RelatedId: 100 + (i % 3),
      Description: (type === 6 ? '卖出 #' : '买入 #') + (100 + (i % 3)) + ' ' + ((i % 7) + 1) + ' 股',
      Balance: 10000 + i };
  }
  function pageItems(p) {
    var arr = [];
    var start = (p - 1) * 200;
    for (var i = 0; i < 2; i++) arr.push(mkItem(p * 2 + i, p, i));
    // 第 1 页加 3 条刮刮乐，用于验证「一行两组」的双栏布局
    if (p === 1) {
      for (var s = 0; s < 3; s++) {
        arr.push({ Id: 950000 + s, LogTime: new Date(BASE - (3600 + s) * 1000).toISOString(),
          Type: 1, Change: -1000, Amount: 0, RelatedId: 999,
          Description: '购买刮刮乐彩票', Balance: 9000 + s });
      }
      // 红包 / 手续费 / 印花税各一条，用于验证汇总按描述「」名字聚合
      arr.push({ Id: 951001, LogTime: new Date(BASE - 4200 * 1000).toISOString(),
        Type: 15, Change: -500000, Amount: 0, RelatedId: 0,
        Description: '给「hang333」发送红包', Balance: 8000 });
      arr.push({ Id: 951002, LogTime: new Date(BASE - 4300 * 1000).toISOString(),
        Type: 15, Change: -390000, Amount: 0, RelatedId: 0,
        Description: '给「a90134z」发送红包', Balance: 8001 });
      arr.push({ Id: 951003, LogTime: new Date(BASE - 4400 * 1000).toISOString(),
        Type: 15, Change: -80, Amount: 0, RelatedId: 0,
        Description: '取消竞拍 #70888「八寻宁宁」 收取手续费80cc', Balance: 8002 });
      arr.push({ Id: 951004, LogTime: new Date(BASE - 4500 * 1000).toISOString(),
        Type: 7, Change: -100, Amount: 0, RelatedId: 0,
        Description: '交易印花税 #29282「黄前久美子」', Balance: 8003 });
      arr.push({ Id: 951005, LogTime: new Date(BASE - 4600 * 1000).toISOString(),
        Type: 15, Change: -200, Amount: 0, RelatedId: 0,
        Description: '其他支出一', Balance: 8004 });
      arr.push({ Id: 951006, LogTime: new Date(BASE - 4700 * 1000).toISOString(),
        Type: 15, Change: -300, Amount: 0, RelatedId: 0,
        Description: '其他支出二', Balance: 8005 });
      // 股息 + 个税：验证净股息按 (股息-个税)/股息 折算
      arr.push({ Id: 951007, LogTime: new Date(BASE - 4800 * 1000).toISOString(),
        Type: 15, Change: 1000, Amount: 0, RelatedId: 0,
        Description: '每周基础股息分红，共计100股。', Balance: 9005 });
      arr.push({ Id: 951008, LogTime: new Date(BASE - 4900 * 1000).toISOString(),
        Type: 14, Change: -100, Amount: 0, RelatedId: 0,
        Description: '个人所得税 100cc', Balance: 9004 });
      // 竞拍失败解除冻结：收入明细里应显示并归「其他」
      arr.push({ Id: 951009, LogTime: new Date(BASE - 5000 * 1000).toISOString(),
        Type: 10, Change: 400, Amount: 0, RelatedId: 0,
        Description: '竞拍 #46464「艾莉丝·格雷拉特」 失败解除冻结', Balance: 9006 });
      // 节日福利：独立 welfare 分类，必须出现在收入明细/汇总里
      arr.push({ Id: 951010, LogTime: new Date(BASE - 5100 * 1000).toISOString(),
        Type: 15, Change: 173700, Amount: 0, RelatedId: 0,
        Description: '国庆节福利', Balance: 9007 });
      // 取消买入退回 / 冰山买单退回：收入明细显示并归「其他」
      arr.push({ Id: 951011, LogTime: new Date(BASE - 5200 * 1000).toISOString(),
        Type: 5, Change: 85600, Amount: 0, RelatedId: 0,
        Description: '取消买入委托(1060319) #3881「峰岸绫乃」 解除冻结85600cc', Balance: 9008 });
      arr.push({ Id: 951012, LogTime: new Date(BASE - 5300 * 1000).toISOString(),
        Type: 4, Change: 13, Amount: 1, RelatedId: 0,
        Description: '冰山买入委托(1033346) #6「伊吹风子」 成交1股', Balance: 9009 });
      // 绑定手机 / 注册天数奖励：应归「推荐」
      arr.push({ Id: 951013, LogTime: new Date(BASE - 5400 * 1000).toISOString(),
        Type: 15, Change: 10000, Amount: 0, RelatedId: 0,
        Description: '绑定手机奖励', Balance: 9010 });
      arr.push({ Id: 951014, LogTime: new Date(BASE - 5500 * 1000).toISOString(),
        Type: 15, Change: 31300, Amount: 0, RelatedId: 0,
        Description: 'bangumi注册313天奖励', Balance: 9011 });
      // 竞拍成功退回：收入明细显示并归「其他」
      arr.push({ Id: 951015, LogTime: new Date(BASE - 5600 * 1000).toISOString(),
        Type: 11, Change: 4100, Amount: 480, RelatedId: 16703,
        Description: '竞拍 #16703「小野寺小咲」 成功获得480股', Balance: 9012 });
      // 股权融资：收入明细显示并归「献祭」
      arr.push({ Id: 951016, LogTime: new Date(BASE - 5700 * 1000).toISOString(),
        Type: 15, Change: 40.24, Amount: 1, RelatedId: 125986,
        Description: '股权融资 #125986「神木辉」 共1股', Balance: 9013 });
      // 道具股数：验证卡片把「道具」拆成魔方 / 道标 / 碎片
      arr.push({ Id: 951017, LogTime: new Date(BASE - 5800 * 1000).toISOString(),
        Type: 15, Change: 0, Amount: 10, RelatedId: 100,
        Description: '使用「混沌魔方」获得 #100「测试角色」10股', Balance: 9014 });
      arr.push({ Id: 951018, LogTime: new Date(BASE - 5900 * 1000).toISOString(),
        Type: 15, Change: 0, Amount: 5, RelatedId: 100,
        Description: '使用「虚空道标」获得 #100「测试角色」5股', Balance: 9015 });
      arr.push({ Id: 951019, LogTime: new Date(BASE - 6000 * 1000).toISOString(),
        Type: 15, Change: 0, Amount: -3, RelatedId: 100,
        Description: '使用「混沌魔方」消耗 #100「测试角色」3股', Balance: 9016 });
      arr.push({ Id: 951020, LogTime: new Date(BASE - 6100 * 1000).toISOString(),
        Type: 15, Change: 0, Amount: 4, RelatedId: 100,
        Description: '使用 #100「测试角色」4股通过「星光碎片」为 #101「测试角色2」充能4股', Balance: 9017 });
      // 多角色：验证「显示全部」不再截断 20 条、分页按角色数计算
      for (var ci = 0; ci < 22; ci++) {
        arr.push({ Id: 952000 + ci, LogTime: new Date(BASE - (7000 + ci) * 1000).toISOString(),
          Type: 4, Change: -10, Amount: 1, RelatedId: 300 + ci,
          Description: '买入 #' + (300 + ci) + ' 1 股', Balance: 10000 });
      }
      // 刮刮乐获奖：Amount>0 时保留角色，股数获得卡应出现刮刮乐
      arr.push({ Id: 951021, LogTime: new Date(BASE - 6200 * 1000).toISOString(),
        Type: 1, Change: 0, Amount: 5, RelatedId: 100,
        Description: '彩票刮刮乐获奖 #100「测试角色」5股', Balance: 9018 });
      // 圣殿：被道标命中扣固资 / 扣活股 / 自用道标（只第一条进道标日志）
      arr.push({ Id: 953001, LogTime: new Date(BASE - 6300 * 1000).toISOString(),
        Type: 15, Change: 0, Amount: -83, RelatedId: 200,
        Description: '受到「虚空道标」攻击损失 #100「测试角色」83股固定资产', Balance: 9019 });
      arr.push({ Id: 953002, LogTime: new Date(BASE - 6400 * 1000).toISOString(),
        Type: 15, Change: 0, Amount: -5, RelatedId: 200,
        Description: '受到「虚空道标」攻击损失 #100「测试角色」5股', Balance: 9020 });
      arr.push({ Id: 953003, LogTime: new Date(BASE - 6500 * 1000).toISOString(),
        Type: 15, Change: 0, Amount: 48, RelatedId: 100,
        Description: '使用「虚空道标」获得 #101「测试角色2」48股', Balance: 9021 });
      arr.push({ Id: 953004, LogTime: new Date(BASE - 6600 * 1000).toISOString(),
        Type: 15, Change: 0, Amount: -43, RelatedId: 201,
        Description: '受到「虚空道标」攻击损失 #101「测试角色2」43股固定资产', Balance: 9022 });
      // 星之力转化日志
      arr.push({ Id: 954001, LogTime: new Date(BASE - 6700 * 1000).toISOString(),
        Type: 15, Change: 0, Amount: 120, RelatedId: 100,
        Description: '将 #100「测试角色」120股固定资产转化为「星之力」', Balance: 9023 });
    }
    return arr;
  }

  window.fetch = function (url, opt) {
    var u = String(url);
    var api = u.replace('https://tinygrail.com/api/', '');
    var m = ((opt && opt.method) || 'GET');
    window.__calls.push(m + ' ' + api);

    if (api.indexOf('account/recommend') === 0) {
      return Promise.resolve(J({ Hash: 'HASH', Name: 'tester' }));
    }
    if (api.indexOf('chara/user/balance/') === 0) {
      var mm = /balance\\/(\\d+)\\/(\\d+)/.exec(api) || [];
      var p = Number(mm[1] || 1);
      var items = pageItems(p);
      if (p === 1 && window.__extraHead) {
        // 头部插入新记录（新时间），模拟增量
        for (var e = 0; e < window.__extraHead; e++) {
          var ts2 = new Date(BASE + (e + 1) * 1000).toISOString();
          items.unshift({ Id: 900000 + e, LogTime: ts2, Type: 6, Change: 777,
            Amount: 5, RelatedId: 555,
            Description: '卖出 #555 5 股', Balance: 99999 });
        }
      }
      return Promise.resolve(J({ Items: items, TotalPages: window.__PAGES, TotalItems: window.__PAGES * 200 }));
    }
    if (api.indexOf('chara/list') === 0) return Promise.resolve(J([]));
    if (api.indexOf('chara/user/temple/') === 0) return Promise.resolve(J({ Items: [], TotalPages: 1 }));
    if (api.indexOf('chara/user/chara/') === 0) return Promise.resolve(J({ Items: [], TotalPages: 1, TotalItems: 0 }));
    return Promise.resolve(J({}));
  };
})();
</script>
`;

// 组件本体
const compTag = '<script>\n' + comp + '\n</script>';

const test = `
<script>
(async function () {
  var out = document.getElementById('out');
  try {
  var lines = [];
  function ok(name, cond, detail) {
    lines.push((cond ? 'PASS ' : 'FAIL ') + name + (detail ? ' [' + detail + ']' : ''));
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  var T = window.__TGLP_T__;

  ok('测试钩子已暴露', !!T, T ? '' : 'no hook');
  if (!T) { out.textContent = lines.join('~|~') + '~|~END~|~'; return; }

  T.buildUI();

  /* ---------- ① 全范围读取：160 页 ---------- */
  await T.storeClear();
  T.clearLocal();
  window.__PAGES = 160;
  window.__extraHead = 0;
  window.__calls.length = 0;

  // 自定义窗口覆盖全部时间（2006 ~ 2036），确保 160 页都算进来
  T.setRange('2006-01-01', '2036-01-01', 'custom');
  await T.scanLogs();
  await wait(50);

  var st = T.state();
  ok('全范围读取：160 页全部读入本地（>工具箱 150 上限）',
    st.raw >= 320, 'raw=' + st.raw);
  var balanceCalls = window.__calls.filter(function (c) { return c.indexOf('balance/') >= 0; }).length;
  ok('确实翻了很多页（不是只读前 150 页）',
    balanceCalls > 150, 'calls=' + balanceCalls);

  /* ---------- ② IndexedDB 持久化 ---------- */
  var stored = await T.storeAll();
  ok('IndexedDB 存下了全部记录', stored.length >= 320, 'stored=' + stored.length);

  // 模拟重开：清空内存，从本地恢复
  T.clearLocal();
  ok('清空内存后 raw=0', T.state().raw === 0, 'raw=' + T.state().raw);
  await T.loadLocal();
  await wait(30);
  var st2 = T.state();
  ok('loadLocal 从本地数据库恢复了数据（秒开）',
    st2.raw >= 320, 'raw=' + st2.raw);

  /* ---------- ③ 增量：第二次 scan 只读头部 ---------- */
  window.__calls.length = 0;
  window.__extraHead = 3;
  await T.scanLogs();
  await wait(30);
  var balanceCalls2 = window.__calls.filter(function (c) { return c.indexOf('balance/') >= 0; }).length;
  ok('增量扫描只读头部（撞上已存记录就停，不是 160 页）',
    balanceCalls2 <= 3, 'calls=' + balanceCalls2);
  var st3 = T.state();
  ok('增量把 3 条新记录加了进去',
    st3.raw >= 323, 'raw=' + st3.raw);

  /* ---------- ④ 统计口径 ---------- */
  var stats = T.ledgerStats();
  ok('资金收入统计有数据', stats.fundIn.total > 0, 'in=' + stats.fundIn.total);
  ok('资金支出统计有数据', stats.fundOut.total > 0, 'out=' + stats.fundOut.total);
  var lstats = T.logStats();
  ok('角色股数统计有数据', lstats.chars.length > 0, 'chars=' + lstats.chars.length);

  /* ---------- ⑤ v1.1.0：大面板两栏 + 资金下钻 + 图表 ---------- */
  var doc = document;
  var panel = doc.getElementById('tglp-panel');
  ok('面板已构建', !!panel, '');
  var topRow = doc.querySelector('.tglp-toprow');
  var profile = doc.querySelector('.tglp-profile');
  var tableWrap = doc.querySelector('.tglp-tablewrap');
  ok('面板是基础信息卡 + 图表 + 数据表结构', !!profile && !!tableWrap, '');
  var chartBox = doc.querySelector('.tglp-charts');
  ok('有图表卡片区', !!chartBox, '');

  // 资金下钻：逐笔 & 按角色
  var drillDetail = T.fundDrill('out', 'all', 'detail');
  ok('资金逐笔下钻有记录', drillDetail.length > 0, 'n=' + drillDetail.length);
  ok('逐笔记录带时间/描述/金额',
    drillDetail.length > 0 && drillDetail[0].ts > 0 && typeof drillDetail[0].desc === 'string' && drillDetail[0].val > 0, '');
  var drillRole = T.fundDrill('out', 'all', 'role');
  ok('资金按角色下钻有数据', drillRole.length > 0, 'roles=' + drillRole.length);
  ok('按角色占比 pct 已算',
    drillRole.length > 0 && typeof drillRole[0].pct === 'number', '');
  // 按来源过滤
  var drillBuy = T.fundDrill('out', 'buy', 'detail');
  ok('按来源（买入）过滤生效',
    drillBuy.length > 0 && drillBuy.length <= drillDetail.length, 'buy=' + drillBuy.length + ' / all=' + drillDetail.length);

  // 月度趋势
  var monthly = T.monthlyFlow();
  ok('月度趋势有数据', monthly.length > 0, 'months=' + monthly.length);
  ok('月度记录含收入/支出字段',
    monthly.length > 0 && typeof monthly[0].in === 'number' && typeof monthly[0].out === 'number', '');

  // 图表函数返回 DOM
  var bar = T.hbarSvg([{ label: 'A', sum: 10 }, { label: 'B', sum: 5 }], null);
  ok('条形图生成 DOM', !!bar && bar.querySelectorAll('.tglp-chrow').length === 2, '');
  var donut = T.donutSvg([{ label: 'A', sum: 10 }, { label: 'B', sum: 5 }], '合计');
  ok('环形图生成 DOM', !!donut && !!donut.querySelector('.tglp-donut'), '');
  ok('环形图图例百分比/次数分列',
    !!donut.querySelector('.tglp-lpct') && !!donut.querySelector('.tglp-lcnt'), '');
  var mbars = T.monthlySvg([{ key: '2026-01', in: 10, out: 5 }, { key: '2026-02', in: 8, out: 6 }]);
  ok('月度柱状图生成 DOM', !!mbars && mbars.querySelectorAll('.tglp-mcol').length === 2, '');

  // 显示数量选项含「全部」
  var lTop = doc.getElementById('tglp-ltop');
  ok('股数显示数量含「全部」选项', !!lTop && !!lTop.querySelector('option[value="all"]'), '');
  var fundBar = doc.querySelector('.tglp-fdir') ? doc.querySelector('.tglp-line.tglp-logfilter') : null;
  ok('资金筛选行存在（方向/来源/明细，占比图已移到卡片上）',
    !!doc.querySelector('#tglp-fdir') && !!doc.querySelector('#tglp-fkind') && !doc.querySelector('#tglp-fchart'), '');

  /* ---------- ⑥ v1.2.0：个性化面板入口 / 全屏 / KPI / 数据表分页 ---------- */
  T.registerCustomizeTab(0);
  var myTab = window.__tabs.filter(function (t) { return t.tab === 'tglp_ledger'; })[0];
  ok('个性化面板注册了小圣杯账本2.0入口Tab',
    !!myTab && myTab.type === 'custom' && myTab.label === '小圣杯账本2.0', myTab ? myTab.label : 'none');
  var entryHtml = myTab && myTab.customContent ? myTab.customContent() : '';
  ok('入口含「打开账本」按钮', /打开账本/.test(entryHtml), '');
  // 幂等：重复注册不累加
  T.registerCustomizeTab(0);
  ok('重复注册不会累加多个Tab',
    window.__tabs.filter(function (t) { return t.tab === 'tglp_ledger'; }).length === 1, '');

  // 全屏面板
  ok('全屏面板存在', !!doc.getElementById('tglp-panel'), '');
  ok('不再有悬浮胶囊', !doc.getElementById('tglp-fab'), '');
  T.openLedger();
  ok('openLedger 能打开面板', T.state().panel, '');

  // KPI 卡片
  ok('基础信息卡集成 8 项基础数据', T.profile() === 8, 'cells=' + T.profile());

  // 数据表 + 分页
  var tb = T.table();
  ok('数据表有列定义', tb.cols >= 4, 'cols=' + tb.cols);
  ok('数据表行数=当前视角全部记录', tb.rows > 0, 'rows=' + tb.rows);
  ok('默认每页 50 条', tb.size === 50, 'size=' + tb.size);
  ok('分页页数正确', tb.pages === Math.ceil(tb.rows / tb.size), 'pages=' + tb.pages);
  ok('首屏只渲染当页行（不是全表）',
    tb.bodyRows <= 50 && tb.bodyRows === Math.min(50, tb.rows), 'bodyRows=' + tb.bodyRows + ' total=' + tb.rows);
  ok('表头有可排序列', !!doc.querySelector('.tglp-table th:not(.tglp-nosort)'), '');
  ok('分页器有按钮', doc.querySelectorAll('.tglp-pager button').length >= 3, '');

  // 翻页（v1.5.6：严格靠"点击"翻页，不先用 gotoPage 造状态，避免假阳性）
  if (tb.pages >= 2) {
    // 确保从第 1 页出发，记录首行文本
    T.gotoPage(1);
    var firstRow1 = (doc.querySelector('.tglp-table tbody tr') || {}).textContent || '';
    // 找「›」下一页按钮（按钮文本为 ›），纯点击
    var nextBtn = Array.prototype.find.call(doc.querySelectorAll('.tglp-pager button'), function (b) { return b.textContent === '›'; });
    ok('有下一页按钮', !!nextBtn, '');
    if (nextBtn) nextBtn.click();
    var onBtn = doc.querySelector('.tglp-pager button.tglp-on');
    ok('点下一页能真的翻页', T.table().page === 2 && !!onBtn && onBtn.textContent === '2',
       'page=' + T.table().page + ' on=' + (onBtn ? onBtn.textContent : 'none'));
    var firstRow2 = (doc.querySelector('.tglp-table tbody tr') || {}).textContent || '';
    ok('翻页后表格数据真的换了', firstRow1 !== firstRow2 && !!firstRow2, '');
    ok('第2页仍只渲染当页行', T.table().bodyRows <= 50, 'rows=' + T.table().bodyRows);
    // 点「‹」上一页回第 1 页
    var prevBtn = Array.prototype.find.call(doc.querySelectorAll('.tglp-pager button'), function (b) { return b.textContent === '‹'; });
    if (prevBtn) prevBtn.click();
    ok('点上一页能回到第1页', T.table().page === 1, 'page=' + T.table().page);
    T.gotoPage(1);
  }
  // 每页条数切换
  var ps = doc.getElementById('tglp-pagesize');
  ok('有每页条数选择器', !!ps && ps.querySelectorAll('option').length >= 4, '');

  /* ---------- ⑦ v1.3.x：顶栏单行 ---------- */
  var topbar = doc.querySelector('.tglp-topbar');
  ok('顶部工具栏单行（范围/统计/复制/视角都在顶栏里）',
    !!topbar && !!topbar.querySelector('#tglp-ldays') && !!topbar.querySelector('.tglp-segbtn'), '');

  /* ---------- ⑧ v1.4.0：固定两列图表区 / 整体折叠 / 分类口径 ---------- */
  var fundBtn = doc.querySelector('.tglp-segbtn[data-view="fund"]');
  fundBtn.click();
  await wait(40);

  var chartBox = doc.querySelector('.tglp-charts');
  var colL = chartBox && chartBox.querySelector('.tglp-col-l');
  var colR = chartBox && chartBox.querySelector('.tglp-col-r');
  ok('图表区是左右两列', !!colL && !!colR, '');
  ok('基础数据卡在图表区左上', !!(colL && colL.querySelector('.tglp-card-profile')),
    '');
  var infoCells = doc.querySelectorAll('.tglp-card-profile .tglp-pcell');
  ok('基础数据卡仍是 8 项（缩成小卡）', infoCells.length === 8, 'cells=' + infoCells.length);
  ok('副标题藏起来，改成悬停 tooltip',
    infoCells[0] && /：/.test(infoCells[0].getAttribute('title') || ''),
    infoCells[0] ? infoCells[0].getAttribute('title') : 'none');
  ok('右列 = 资产走势 + 月度收支趋势',
    !!(colR && colR.querySelector('[data-chart="asset"]') && colR.querySelector('[data-chart="monthly"]')), '');
  var ca = T.chartArea();
  ok('资金视角不再有「分类明细」两张卡',
    ca.keys.indexOf('flowOut') < 0 && ca.keys.indexOf('flowIn') < 0, 'keys=' + ca.keys.join(','));
  ok('分类明细已删除（图表总数 5）', ca.keys.length === 5, 'n=' + ca.keys.length);
  ok('卡片上只有占比图形切换 + 月度净值切换（3 个）',
    doc.querySelectorAll('.tglp-chartcard .tglp-cc-btn').length === 3,
    'btns=' + doc.querySelectorAll('.tglp-chartcard .tglp-cc-btn').length);

  // 次数跟在数值后面
  var cnt = doc.querySelector('.tglp-col-l [data-chart="fundOutChart"] .tglp-chcnt');
  ok('来源占比数值后带次数', !!cnt && /次/.test(cnt.textContent), cnt ? cnt.textContent : 'none');

  // 占比图：卡片上的图标独立切换
  var outCard = doc.querySelector('[data-chart="fundOutChart"]');
  var icon = outCard && outCard.querySelector('.tglp-cc-btn');
  // 高度对齐核查
  var pairCard = doc.querySelector('.tglp-pair .tglp-chartcard');
  var profCard = doc.querySelector('.tglp-card-profile');
  var assetCard = doc.querySelector('[data-chart="asset"]');
  var hp = pairCard ? Math.round(pairCard.getBoundingClientRect().height) : -1;
  var hf = profCard ? Math.round(profCard.getBoundingClientRect().height) : -1;
  var ha = assetCard ? Math.round(assetCard.getBoundingClientRect().height) : -1;
  ok('支出卡高度约 133', Math.abs(hp - 133) <= 4, 'h=' + hp);
  var monthCard = doc.querySelector('[data-chart="monthly"]');
  var hm = monthCard ? Math.round(monthCard.getBoundingClientRect().height) : -1;
  ok('基础数据卡压到 47px（右列 192 - 支出 137 - 间隙 8）', Math.abs(hf - 47) <= 3, 'h=' + hf);
  ok('左列总高 = 右列总高', Math.abs((hf + 8 + hp) - (ha + 8 + hm)) <= 8,
    'left=' + (hf + 8 + hp) + ' right=' + (ha + 8 + hm));
  ok('右列按 v1.3.2 比例：月度比资产走势高', hm > ha, 'asset=' + ha + ' monthly=' + hm);
  ok('条形图数值列定宽（所有条等长）',
    (function () {
      var vals = doc.querySelectorAll('.tglp-col-l .tglp-chval');
      if (vals.length < 2) return true;
      var w0 = Math.round(vals[0].getBoundingClientRect().width);
      for (var i = 1; i < vals.length; i++) {
        if (Math.abs(vals[i].getBoundingClientRect().width - w0) > 1) return false;
      }
      return true;
    })(), 'valwidth');
  ok('支出占比卡有图形切换图标', !!icon, '');
  var beforeIcon = icon ? icon.textContent : '';
  if (icon) icon.click();
  await wait(20);
  var outCard2 = doc.querySelector('[data-chart="fundOutChart"]');
  var icon2 = outCard2 && outCard2.querySelector('.tglp-cc-btn');
  ok('点图标只切换这一张卡（条形↔环形）',
    !!icon2 && icon2.textContent !== beforeIcon, (beforeIcon + '→' + (icon2 ? icon2.textContent : '')));
  var inCard = doc.querySelector('[data-chart="fundInChart"] .tglp-cc-btn');
  ok('另一张占比卡不受影响', !!inCard && inCard.textContent === beforeIcon,
    inCard ? inCard.textContent : 'none');
  if (icon2) icon2.click();
  await wait(20);

  // 图表区整体折叠
  var tb = doc.querySelector('.tglp-chartbar .tglp-cbtn');
  ok('图表开关在顶栏（不在独立工具条里）',
    !doc.querySelector('.tglp-chartbar') &&
    [].some.call(doc.querySelectorAll('.tglp-topbar button'), function (b) { return /图表/.test(b.textContent); }),
    'chartbar=' + !!doc.querySelector('.tglp-chartbar'));
  ok('底部说明已删除', !doc.querySelector('.tglp-note'), '');
  T.toggleChartArea();
  ok('折叠后图表区隐藏', T.chartArea().collapsed && T.chartArea().hidden, '');
  ok('折叠后数据表还在（分页只在数据区）',
    !!doc.querySelector('.tglp-tablewrap') && !!doc.querySelector('.tglp-pager'), '');
  T.toggleChartArea();
  ok('可再展开', !T.chartArea().collapsed && !T.chartArea().hidden, '');

  /* ---------- ⑨ 资金来源分类口径 ---------- */
  ok('支出·其它 = 股息税', T.fundLabel('out', 'other') === '股息税', T.fundLabel('out', 'other'));
  ok('支出·印花税 = 印花税', T.fundLabel('out', 'stamp') === '印花税', T.fundLabel('out', 'stamp'));
  ok('收入·其它 = 其他', T.fundLabel('in', 'other') === '其他', T.fundLabel('in', 'other'));
  ok('收入·福利 = 福利', T.fundLabel('in', 'welfare') === '福利', T.fundLabel('in', 'welfare'));
  ok('分红 = 分红', T.fundLabel('in', 'aucbonus') === '分红', T.fundLabel('in', 'aucbonus'));
  ok('股息 = 股息', T.fundLabel('in', 'dividend') === '股息', T.fundLabel('in', 'dividend'));
  ok('大乐透 / 推荐',
    T.fundLabel('in', 'lotto') === '大乐透' && T.fundLabel('in', 'refer') === '推荐', '');
  ok('股权融资 → 献祭',
    T.fundKindOf({ Description: '股权融资 #125986「神木辉」 共1股', Type: 15, Change: 40.24 }).label === '献祭',
    T.fundKindOf({ Description: '股权融资 #125986「神木辉」 共1股', Type: 15, Change: 40.24 }).label);
  // 股息不挂角色
  ok('股息记录不关联角色（用户报的错）',
    T.logCharaId({ Description: '每周基础股息分红，共计471199股。', Type: 15, Change: 26414400, RelatedId: 4508 }) === 0, '');
  ok('红包记录不关联角色（RelatedId 是对方用户 id）',
    T.logCharaId({ Description: '给「hang333」发送红包', Type: 15, Change: -500000, RelatedId: 2313 }) === 0,
    'id=' + T.logCharaId({ Description: '给「hang333」发送红包', Type: 15, Change: -500000, RelatedId: 2313 }));
  ok('萌王投票返利 → 分红',
    T.fundKindOf({ Description: '萌王投票返利', Type: 15, Change: 211300 }).label === '分红',
    T.fundKindOf({ Description: '萌王投票返利', Type: 15, Change: 211300 }).label);
  ok('只有 bangumi每日登录奖励 才算签到',
    T.fundKindOf({ Description: 'bangumi每日登录奖励', Type: 15, Change: 1000 }).label === '签到' &&
    T.fundKindOf({ Description: '每日签到奖励', Type: 15, Change: 1000 }).label === '其他',
    T.fundKindOf({ Description: '每日签到奖励', Type: 15, Change: 1000 }).label);
  ok('萌王大乐透中奖 → 大乐透',
    T.fundKindOf({ Description: '萌王大乐透中奖', Type: 15, Change: 1000 }).label === '大乐透',
    T.fundKindOf({ Description: '萌王大乐透中奖', Type: 15, Change: 1000 }).label);
  ok('国庆节福利 → 福利',
    T.fundKindOf({ Description: '国庆节福利', Type: 15, Change: 1000 }).label === '福利',
    T.fundKindOf({ Description: '国庆节福利', Type: 15, Change: 1000 }).label);
  ok('中秋节/元旦福利 → 福利',
    T.fundKindOf({ Description: '中秋节福利', Type: 15, Change: 1000 }).label === '福利' &&
    T.fundKindOf({ Description: '元旦福利', Type: 15, Change: 1000 }).label === '福利', '');
  ok('绑定手机/注册天数奖励 → 推荐',
    T.fundKindOf({ Description: '绑定手机奖励', Type: 15, Change: 10000 }).label === '推荐' &&
    T.fundKindOf({ Description: 'bangumi注册313天奖励', Type: 15, Change: 31300 }).label === '推荐', '');
  ok('被推荐奖励 → 推荐',
    T.fundKindOf({ Description: '被推荐奖励', Type: 15, Change: 1000 }).label === '推荐',
    T.fundKindOf({ Description: '被推荐奖励', Type: 15, Change: 1000 }).label);
  ok('推荐奖励 → 推荐',
    T.fundKindOf({ Description: '推荐奖励发放', Type: 15, Change: 1000 }).label === '推荐',
    T.fundKindOf({ Description: '推荐奖励发放', Type: 15, Change: 1000 }).label);
  ok('大乐透中奖 → 大乐透',
    T.fundKindOf({ Description: '大乐透中奖', Type: 15, Change: 1000 }).label === '大乐透',
    T.fundKindOf({ Description: '大乐透中奖', Type: 15, Change: 1000 }).label);
  ok('印花税 → 印花税',
    T.fundKindOf({ Description: '卖出 #123 交易印花税', Type: 7, Change: -100 }).label === '印花税',
    T.fundKindOf({ Description: '卖出 #123 交易印花税', Type: 7, Change: -100 }).label);
  ok('普通买入记录仍带角色',
    T.logCharaId({ Description: '买入 #123 10股', Type: 4, Change: -100, RelatedId: 0 }) === 123, '');

  /* ---------- ⑩ v1.5.7：新增支出分类 / 角色列 / 固定表头 ---------- */
  var bless1 = T.fundKindOf({ Description: '为萌王 #1152「春日野穹」的诞生献上祝福', Type: 15, Change: -100 });
  ok('献上祝福 → 祝福分类', bless1.label === '祝福', bless1.label);
  var fee1 = T.fundKindOf({ Description: '修改竞拍 #221554「埃莉诺」 收取手续费14759.684000000001cc', Type: 11, Change: -14759 });
  ok('修改竞拍手续费 → 手续费分类', fee1.label === '手续费', fee1.label);
  var fee2 = T.fundKindOf({ Description: '取消竞拍 #70888「八寻宁宁」 收取手续费80cc', Type: 11, Change: -80 });
  ok('取消竞拍手续费 → 手续费分类', fee2.label === '手续费', fee2.label);
  var ref1 = T.fundKindOf({ Description: '增购 「钞名」 +10消耗', Type: 15, Change: -106000 });
  ok('增购消耗 → 精炼分类', ref1.label === '精炼', ref1.label);
  ok('支出下拉含祝福 / 手续费 / 精炼',
    ['祝福', '手续费', '精炼'].every(function (x) {
      return [].some.call(doc.querySelectorAll('#tglp-fkind option'), function (o) { return o.textContent === x; });
    }), '');
  ok('刮刮乐购买不挂角色、获奖保留角色',
    T.logCharaId({ Description: '购买刮刮乐彩票', Type: 1, Change: -1000, Amount: 0, RelatedId: 123 }) === 0 &&
    T.logCharaId({ Description: '彩票刮刮乐获奖 #100「测试角色」5股', Type: 1, Change: 0, Amount: 5, RelatedId: 100 }) === 100, '');
  ok('股息税记录不关联角色',
    T.logCharaId({ Description: '个人所得税 100cc', Type: 14, Change: -100, RelatedId: 123 }) === 0, '');

  // 固定表头列宽：切换分类时金额列位置一致；数值表头与数值同侧
  var tableEl = doc.querySelector('.tglp-table');
  ok('数据表使用固定列宽（切分类表头不跳动）',
    getComputedStyle(tableEl).tableLayout === 'fixed', getComputedStyle(tableEl).tableLayout);
  function setFundKey(k) {
    var sel = doc.getElementById('tglp-fkind');
    sel.value = k;
    sel.dispatchEvent(new Event('change'));
  }
  function thByLabel(label) {
    var ths = doc.querySelectorAll('.tglp-table thead th');
    for (var i = 0; i < ths.length; i++) {
      if (ths[i].textContent.indexOf(label) === 0) return ths[i];
    }
    return null;
  }
  setFundKey('buy');
  var thAmtBuy = thByLabel('金额');
  var amtLeftBuy = thAmtBuy ? Math.round(thAmtBuy.getBoundingClientRect().left) : -1;
  ok('金额表头右对齐', !!thAmtBuy && getComputedStyle(thAmtBuy).textAlign === 'right',
    thAmtBuy ? getComputedStyle(thAmtBuy).textAlign : 'none');
  setFundKey('auction');
  var thAmtAuc = thByLabel('金额');
  var amtLeftAuc = thAmtAuc ? Math.round(thAmtAuc.getBoundingClientRect().left) : -1;
  ok('不同分类下金额表头位置一致', amtLeftBuy > 0 && amtLeftBuy === amtLeftAuc, amtLeftBuy + '/' + amtLeftAuc);
  setFundKey('scratch');
  var headsScratch = [].map.call(doc.querySelectorAll('.tglp-table thead th'), function (th) {
    return th.textContent.replace(/[ ↑↓]/g, '');
  });
  ok('刮刮乐分类不显示角色列', headsScratch.indexOf('角色') < 0 && headsScratch.indexOf('金额') >= 0,
    headsScratch.join(','));
  setFundKey('other');
  var headsOther = [].map.call(doc.querySelectorAll('.tglp-table thead th'), function (th) {
    return th.textContent.replace(/[ ↑↓]/g, '');
  });
  ok('股息税分类不显示角色列', headsOther.indexOf('角色') < 0 && headsOther.indexOf('金额') >= 0,
    headsOther.join(','));
  setFundKey('all');
  ok('切回全部来源恢复角色列', !!thByLabel('角色'), '');

  /* ---------- ⑪ v1.5.8：支出金额左移 / 删股数 / 红包刮刮乐印花税双栏 / 回顶 / 退市名 ---------- */
  function tableHeads() {
    return [].map.call(doc.querySelectorAll('.tglp-table thead th'), function (th) {
      return th.textContent.replace(/[ ↑↓]/g, '');
    });
  }
  setFundKey('all');
  var headsAll = tableHeads();
  ok('支出表金额列在描述之后',
    headsAll[0] === '时间' && headsAll[1] === '来源' && headsAll[2] === '角色' &&
    headsAll[3] === '描述' && headsAll[4] === '金额', headsAll.join(','));
  ok('支出表不显示股数列', headsAll.indexOf('股数') < 0, headsAll.join(','));
  var thSrc = thByLabel('来源');
  var thRole = thByLabel('角色');
  ok('支出来源表头不可排序', !!thSrc && thSrc.classList.contains('tglp-nosort'), thSrc ? thSrc.className : 'none');
  ok('支出角色表头不可排序', !!thRole && thRole.classList.contains('tglp-nosort'), thRole ? thRole.className : 'none');
  var amtThAll = thByLabel('金额');
  var amtLeftAll = amtThAll ? Math.round(amtThAll.getBoundingClientRect().left) : -1;
  setFundKey('fee');
  var headsFee = tableHeads();
  ok('手续费分类不显示角色列', headsFee.indexOf('角色') < 0 && headsFee.indexOf('金额') >= 0, headsFee.join(','));
  var amtThFee = thByLabel('金额');
  var amtLeftFee = amtThFee ? Math.round(amtThFee.getBoundingClientRect().left) : -1;
  ok('有无角色分类金额列位置一致',
    amtLeftAll > 0 && Math.abs(amtLeftAll - amtLeftFee) <= 1, amtLeftAll + '/' + amtLeftFee);
  setFundKey('stamp');
  var headsStamp = tableHeads();
  ok('印花税分类不显示角色列', headsStamp.indexOf('角色') < 0, headsStamp.join(','));
  ok('印花税一行两组（6 列表头）',
    headsStamp.length === 6 && headsStamp[1] === '描述' && headsStamp[2] === '金额' && headsStamp[3] === '时间',
    headsStamp.join(','));
  var thStampMoney = doc.querySelectorAll('.tglp-table thead th')[2];
  ok('双栏金额右距 36px',
    !!thStampMoney && getComputedStyle(thStampMoney).paddingRight === '36px',
    thStampMoney ? getComputedStyle(thStampMoney).paddingRight : 'none');
  setFundKey('packet');
  var headsPacket = tableHeads();
  ok('红包分类不显示角色列', headsPacket.indexOf('角色') < 0, headsPacket.join(','));
  ok('红包一行两组（6 列表头）',
    headsPacket.length === 6 && headsPacket[1] === '描述' && headsPacket[2] === '金额' && headsPacket[3] === '时间',
    headsPacket.join(','));
  setFundKey('scratch');
  var tbPair = T.table();
  var headsScratch2 = tableHeads();
  ok('刮刮乐一行两组（6 列表头）', tbPair.pair === true && headsScratch2.length === 6, 'cols=' + headsScratch2.length);
  ok('刮刮乐 3 条记录只占 2 行', tbPair.rows === 3 && tbPair.bodyRows === 2,
    'rows=' + tbPair.rows + ' body=' + tbPair.bodyRows);

  var fDirSel2 = doc.getElementById('tglp-fdir');
  fDirSel2.value = 'in'; fDirSel2.dispatchEvent(new Event('change'));
  setFundKey('sell');
  var headsIn = tableHeads();
  ok('收入表金额在描述后、股数前',
    headsIn[0] === '时间' && headsIn[3] === '描述' && headsIn[4] === '金额' &&
    headsIn[5] === '' && headsIn[6] === '股数', headsIn.join(','));
  var amtThIn = thByLabel('金额');
  var amtLeftIn = amtThIn ? Math.round(amtThIn.getBoundingClientRect().left) : -1;
  ok('收入金额列与支出位置一致',
    amtLeftAll > 0 && Math.abs(amtLeftIn - amtLeftAll) <= 1, amtLeftAll + '/' + amtLeftIn);
  setFundKey('ico');
  var headsIco = tableHeads();
  ok('ICO 收入有角色无股数',
    headsIco.indexOf('角色') >= 0 && headsIco.indexOf('股数') < 0, headsIco.join(','));
  setFundKey('dividend');
  var headsDiv = tableHeads();
  ok('股息收入无角色无股数',
    headsDiv.indexOf('角色') < 0 && headsDiv.indexOf('股数') < 0, headsDiv.join(','));
  var divDrill = T.fundDrill('in', 'dividend', 'detail');
  ok('净股息明细扣除个税',
    divDrill.length === 1 && Math.abs(divDrill[0].val - 900) < 0.01,
    divDrill.length ? String(divDrill[0].val) : 'rows=0');
  setFundKey('sell');
  fDirSel2.value = 'out'; fDirSel2.dispatchEvent(new Event('change'));
  setFundKey('all');
  var outOpts = [].map.call(doc.querySelectorAll('#tglp-fkind option'), function (o) { return o.textContent; });
  ok('刮刮乐排在支出来源最后', outOpts[outOpts.length - 1] === '刮刮乐', outOpts.join(','));

  var scrollEl = doc.querySelector('.tglp-tablescroll');
  T.gotoPage(1);
  scrollEl.scrollTop = 200;
  var nextBtn2 = Array.prototype.find.call(doc.querySelectorAll('.tglp-pager button'), function (b) { return b.textContent === '›'; });
  if (nextBtn2) nextBtn2.click();
  ok('翻页后自动回到列表顶部', scrollEl.scrollTop === 0, 'top=' + scrollEl.scrollTop);

  var sk = T.stockKindChartRows();
  ok('股数获得道具拆分为魔方/道标',
    sk.gainRows.some(function (r) { return r.key === 'chaos' && r.sum >= 10; }) &&
    sk.gainRows.some(function (r) { return r.key === 'guidepost' && r.sum >= 5; }),
    JSON.stringify(sk.gainRows.map(function (r) { return r.label + ':' + r.sum; })));
  ok('股数损失道具拆分为魔方/碎片',
    sk.lossRows.some(function (r) { return r.key === 'chaos' && r.sum >= 3; }) &&
    sk.lossRows.some(function (r) { return r.key === 'shard' && r.sum >= 4; }),
    JSON.stringify(sk.lossRows.map(function (r) { return r.label + ':' + r.sum; })));

  T.setView('stock');
  var caStock = T.chartArea();
  ok('股数视图不含资产走势', caStock.keys.indexOf('asset') < 0, caStock.keys.join(','));
  ok('股数视图四卡齐全',
    ['stockInChart', 'stockOutChart', 'gainTop', 'lossTop'].every(function (k) {
      return caStock.keys.indexOf(k) >= 0;
    }), caStock.keys.join(','));
  var topTitle = doc.querySelector('.tglp-chartcard[data-chart="gainTop"] .tglp-cc-title');
  ok('角色排行 Top 100', !!topTitle && topTitle.textContent.indexOf('Top 100') >= 0,
    topTitle ? topTitle.textContent : 'none');
  ok('股数排序按钮已删除', doc.getElementById('tglp-lsort') === null, '');
  var chCnt = doc.querySelector('.tglp-chcnt');
  ok('股数卡次数右对齐', !!chCnt && getComputedStyle(chCnt).textAlign === 'right',
    chCnt ? getComputedStyle(chCnt).textAlign : 'none');
  var gainBody = doc.querySelector('.tglp-chartcard[data-chart="gainTop"] .tglp-cc-body');
  ok('排行卡可上下滚动', !!gainBody && getComputedStyle(gainBody).overflowY === 'auto',
    gainBody ? getComputedStyle(gainBody).overflowY : 'none');

  var lTopSel = doc.getElementById('tglp-ltop');
  if (lTopSel) { lTopSel.value = 'all'; lTopSel.dispatchEvent(new Event('change')); }
  var tbStock = T.table();
  var stockCharCount = T.logStats().chars.filter(function (x) { return x.gain > 0; }).length;
  ok('股数显示全部角色（不再截断20）',
    tbStock.rows === stockCharCount && tbStock.rows > 20,
    'rows=' + tbStock.rows + ' gainChars=' + stockCharCount);
  ok('股数分页按角色数计算',
    tbStock.pages === Math.ceil(tbStock.rows / tbStock.size), 'pages=' + tbStock.pages);

  var stockInCard = doc.querySelector('.tglp-chartcard[data-chart="stockInChart"]');
  ok('股数获得卡不再显示总计行', !!stockInCard && !stockInCard.querySelector('.tglp-charthead'), '');
  var stockTopCard = doc.querySelector('.tglp-chartcard[data-chart="gainTop"]');
  ok('股数卡底边与排行卡平齐',
    !!stockInCard && !!stockTopCard &&
    Math.abs(stockInCard.getBoundingClientRect().bottom - stockTopCard.getBoundingClientRect().bottom) <= 1,
    stockInCard && stockTopCard
      ? Math.round(stockInCard.getBoundingClientRect().bottom) + '/' + Math.round(stockTopCard.getBoundingClientRect().bottom)
      : 'none');
  var sk2 = T.stockKindChartRows();
  var gainLabels = sk2.gainRows.map(function (r) { return r.label; });
  var expectOrder = ['买入', '竞拍', '魔方', '道标', 'ICO', '刮刮乐'].filter(function (x) {
    return gainLabels.indexOf(x) >= 0;
  });
  ok('股数获得卡分类顺序', gainLabels.join(',') === expectOrder.join(','), gainLabels.join(','));

  T.setStock('gain', 'all');
  var headsStockAll = tableHeads();
  ok('股数全部视图 角色/获得/失去/净值 ×2',
    headsStockAll.length === 8 && headsStockAll[0] === '角色' && headsStockAll[1] === '获得' &&
    headsStockAll[2] === '失去' && headsStockAll[3] === '净值' && headsStockAll[4] === '角色',
    headsStockAll.join(','));
  T.setStock('gain', 'auction');
  var headsAuction = tableHeads();
  ok('竞拍分类 角色/次数/竞拍 ×4',
    headsAuction.length === 12 && headsAuction[0] === '角色' && headsAuction[1] === '次数' &&
    headsAuction[2] === '竞拍' && headsAuction[3] === '角色' &&
    headsAuction[6] === '角色' && headsAuction[9] === '角色' && T.table().pairN === 4,
    'cols=' + headsAuction.length + ' pairN=' + T.table().pairN);
  T.setStock('gain', 'chaos');
  var headsChaos = tableHeads();
  ok('魔方分类 角色/次数/混沌魔方 ×4',
    headsChaos.length === 12 && headsChaos[0] === '角色' && headsChaos[1] === '次数' &&
    headsChaos[2] === '混沌魔方' && headsChaos[5] === '混沌魔方' && T.table().pairN === 4,
    'cols=' + headsChaos.length);
  T.setStock('gain', 'guidepost');
  var headsGuide = tableHeads();
  ok('道标分类 角色/次数/虚空道标 ×4',
    headsGuide.length === 12 && headsGuide[2] === '虚空道标' && headsGuide[5] === '虚空道标' &&
    T.table().pairN === 4, 'cols=' + headsGuide.length);
  T.setStock('gain', 'scratch');
  var tbScratchStock = T.table();
  ok('刮刮乐分类有数据',
    tbScratchStock.rows > 0 && tbScratchStock.pairN === 4,
    'rows=' + tbScratchStock.rows + ' pairN=' + tbScratchStock.pairN);
  T.setStock('gain', 'ico');
  ok('ICO 分类一行四组',
    T.table().pairN === 4 && tableHeads().length === 8, 'pairN=' + T.table().pairN);
  T.setStock('gain', 'buy');
  ok('买入分类一行四组',
    T.table().pairN === 4 && tableHeads().length === 8, 'pairN=' + T.table().pairN);
  T.setStock('gain', 'all');
  var roleLinks = doc.querySelectorAll('.tglp-table tbody tr td .tglp-name');
  var roleHref = roleLinks[0] ? String(roleLinks[0].getAttribute('href') || '') : '';
  ok('角色单元格仍是可点击的角色链接（延迟构建不影响渲染）',
    roleLinks.length > 0 && roleHref.indexOf('character/') >= 0,
    'links=' + roleLinks.length + ' href=' + roleHref);
  var thStockRole = doc.querySelectorAll('.tglp-table thead th')[0];
  var thStockNet = doc.querySelectorAll('.tglp-table thead th')[3];
  ok('股数全部视图按买入汇总间距',
    !!thStockRole && thStockRole.classList.contains('tglp-gap') &&
    !!thStockNet && thStockNet.classList.contains('tglp-gap-r'), '');
  T.setStock('gain', 'auction');
  var thAucTimes = doc.querySelectorAll('.tglp-table thead th')[1];
  var thAucValue = doc.querySelectorAll('.tglp-table thead th')[2];
  ok('竞拍次数列右距 36px',
    !!thAucTimes && thAucTimes.classList.contains('tglp-gap-r2'),
    thAucTimes ? thAucTimes.className : 'none');
  var timesCell = doc.querySelector('.tglp-table tbody tr td:nth-child(2)');
  ok('次数不显示省略号',
    !!timesCell && timesCell.scrollWidth <= timesCell.clientWidth + 1,
    timesCell ? timesCell.scrollWidth + '/' + timesCell.clientWidth : 'none');
  ok('竞拍列左移不贴中线',
    !!thAucValue && thAucValue.classList.contains('tglp-gap-l') &&
    thAucValue.classList.contains('tglp-gap-r'), thAucValue ? thAucValue.className : 'none');
  T.setStock('gain', 'chaos');
  var gainChaosCell = doc.querySelector('.tglp-table tbody tr td:nth-child(3)');
  var normalTd = doc.querySelector('.tglp-table tbody tr td:nth-child(2)');
  var normalColor = normalTd ? getComputedStyle(normalTd).color : '';
  ok('获得魔方 + 号且绿色',
    !!gainChaosCell && gainChaosCell.textContent.indexOf('+') === 0 &&
    gainChaosCell.classList.contains('tglp-up') &&
    getComputedStyle(gainChaosCell).color !== normalColor,
    gainChaosCell ? gainChaosCell.textContent + ' / ' + gainChaosCell.className + ' / ' + getComputedStyle(gainChaosCell).color : 'none');
  T.setStock('loss', 'chaos');
  var lossChaosCell = doc.querySelector('.tglp-table tbody tr td:nth-child(3)');
  var normalTd2 = doc.querySelector('.tglp-table tbody tr td:nth-child(2)');
  var normalColor2 = normalTd2 ? getComputedStyle(normalTd2).color : '';
  ok('失去魔方 - 号且灰色',
    !!lossChaosCell && lossChaosCell.textContent.indexOf('-') === 0 &&
    lossChaosCell.classList.contains('tglp-down') &&
    getComputedStyle(lossChaosCell).color !== normalColor2,
    lossChaosCell ? lossChaosCell.textContent + ' / ' + lossChaosCell.className + ' / ' + getComputedStyle(lossChaosCell).color : 'none');
  T.setStock('gain', 'all');
  T.setView('fund');

  T.setView('fixed');
  var guideLogs = T.guideHitLogs();
  ok('道标日志只显示扣固资的被命中记录',
    guideLogs.length === 2 &&
    guideLogs.some(function (x) { return x.amt === 83 && x.id === 100; }) &&
    guideLogs.some(function (x) { return x.amt === 43 && x.id === 101; }),
    'rows=' + guideLogs.length);
  var caFixed = T.chartArea();
  ok('圣殿视图删除资产走势', caFixed.keys.indexOf('asset') < 0, caFixed.keys.join(','));
  ok('圣殿视图有道标日志与道标命中排行',
    caFixed.keys.indexOf('guideLog') >= 0 && caFixed.keys.indexOf('hitsTop') >= 0,
    caFixed.keys.join(','));
  var guideLogCard = doc.querySelector('.tglp-chartcard[data-chart="guideLog"]');
  var guideExtra = guideLogCard ? guideLogCard.querySelector('.tglp-cc-extra') : null;
  ok('道标日志总计在标题行右上角',
    !!guideExtra && guideExtra.textContent.indexOf('2 次') >= 0 &&
    guideExtra.textContent.indexOf('126') >= 0,
    guideExtra ? guideExtra.textContent : 'none');
  var guideDesc = doc.querySelector('.tglp-chartcard[data-chart="guideLog"] .tglp-gh-desc');
  ok('道标日志显示完整描述',
    !!guideDesc && guideDesc.textContent.indexOf('固定资产') >= 0 && guideDesc.textContent.length > 12,
    guideDesc ? guideDesc.textContent : 'none');
  var guideHitRow = doc.querySelector('.tglp-chartcard[data-chart="guideLog"] .tglp-guidehit');
  ok('道标日志字体增大', !!guideHitRow && getComputedStyle(guideHitRow).fontSize === '11px',
    guideHitRow ? getComputedStyle(guideHitRow).fontSize : 'none');
  var guideBody = doc.querySelector('.tglp-chartcard[data-chart="guideLog"] .tglp-cc-body');
  ok('道标日志可上下滚动', !!guideBody && getComputedStyle(guideBody).overflowY === 'auto',
    guideBody ? getComputedStyle(guideBody).overflowY : 'none');
  var guideVal = doc.querySelector('.tglp-chartcard[data-chart="guideLog"] .tglp-gh-val');
  ok('道标日志固资不贴边',
    !!guideVal && getComputedStyle(guideVal).paddingRight === '24px',
    guideVal ? getComputedStyle(guideVal).paddingRight : 'none');
  var hitsTopTitle = doc.querySelector('.tglp-chartcard[data-chart="hitsTop"] .tglp-cc-title');
  ok('被道标命中卡改为 Top 100',
    !!hitsTopTitle && hitsTopTitle.textContent.indexOf('Top 100') >= 0,
    hitsTopTitle ? hitsTopTitle.textContent : 'none');
  var hitsPair = doc.querySelector('.tglp-chartcard[data-chart="hitsTop"] .tglp-chartwrap-pair');
  ok('道标命中排行双列生效',
    !!hitsPair && getComputedStyle(hitsPair).display === 'grid',
    hitsPair ? getComputedStyle(hitsPair).display : 'none');
  var hitsPairCols = doc.querySelectorAll('.tglp-chartcard[data-chart="hitsTop"] .tglp-chartwrap-pair > .tglp-chartwrap');
  ok('道标命中双列按排名交错',
    hitsPairCols.length === 2 &&
    hitsPairCols[0].textContent.indexOf('83') >= 0 &&
    hitsPairCols[1].textContent.indexOf('43') >= 0,
    hitsPairCols.length === 2
      ? hitsPairCols[0].textContent.slice(0, 24) + ' | ' + hitsPairCols[1].textContent.slice(0, 24)
      : 'cols=' + hitsPairCols.length);
  var pageSizeSel2 = doc.getElementById('tglp-pagesize');
  ok('每页选择字不裁切',
    !!pageSizeSel2 && parseFloat(getComputedStyle(pageSizeSel2).height) >= 22,
    pageSizeSel2 ? getComputedStyle(pageSizeSel2).height : 'none');
  var headsFixed = tableHeads();
  ok('圣殿明细 角色/命中次数/扣除固资 ×4',
    headsFixed.length === 12 && headsFixed[0] === '角色' && headsFixed[1] === '命中次数' &&
    headsFixed[2] === '扣除固资' && headsFixed[3] === '角色' && T.table().pairN === 4,
    'cols=' + headsFixed.length);
  ok('圣殿明细无另扣股数列', headsFixed.indexOf('另扣股数') < 0, headsFixed.join(','));
  T.setView('fund');

  T.setView('star');
  var caStar = T.chartArea();
  ok('星之力视图删除资产走势', caStar.keys.indexOf('asset') < 0, caStar.keys.join(','));
  ok('星之力视图有排行与日志',
    caStar.keys.indexOf('starTop') >= 0 && caStar.keys.indexOf('starLog') >= 0,
    caStar.keys.join(','));
  var starTopTitle = doc.querySelector('.tglp-chartcard[data-chart="starTop"] .tglp-cc-title');
  ok('星之力排行 Top 100',
    !!starTopTitle && starTopTitle.textContent.indexOf('Top 100') >= 0,
    starTopTitle ? starTopTitle.textContent : 'none');
  var starPair = doc.querySelector('.tglp-chartcard[data-chart="starTop"] .tglp-chartwrap-pair');
  ok('星之力排行双列生效',
    !!starPair && getComputedStyle(starPair).display === 'grid',
    starPair ? getComputedStyle(starPair).display : 'none');
  var starLogCard = doc.querySelector('.tglp-chartcard[data-chart="starLog"]');
  var starExtra = starLogCard ? starLogCard.querySelector('.tglp-cc-extra') : null;
  ok('星之力日志总计在标题行',
    !!starExtra && starExtra.textContent.indexOf('1 次') >= 0 &&
    starExtra.textContent.indexOf('120') >= 0,
    starExtra ? starExtra.textContent : 'none');
  var starDesc = doc.querySelector('.tglp-chartcard[data-chart="starLog"] .tglp-gh-desc');
  ok('星之力日志显示完整描述',
    !!starDesc && starDesc.textContent.indexOf('星之力') >= 0,
    starDesc ? starDesc.textContent : 'none');
  var headsStar = tableHeads();
  ok('星之力明细 角色/次数/星之力 ×4',
    headsStar.length === 12 && headsStar[0] === '角色' && headsStar[1] === '次数' &&
    headsStar[2] === '星之力' && headsStar[3] === '角色' && T.table().pairN === 4,
    'cols=' + headsStar.length);
  ok('星之力明细无等级/固资列',
    headsStar.indexOf('等级') < 0 && headsStar.indexOf('固资 / 上限') < 0, headsStar.join(','));
  ok('星之力排序按钮已删除', doc.getElementById('tglp-starsort') === null, '');
  var thsStar = doc.querySelectorAll('.tglp-table thead th');
  ok('一行四组只有第一组表头可排序',
    !!thsStar[2] && !thsStar[2].classList.contains('tglp-nosort') &&
    !!thsStar[5] && thsStar[5].classList.contains('tglp-nosort') &&
    !!thsStar[8] && thsStar[8].classList.contains('tglp-nosort') &&
    !!thsStar[11] && thsStar[11].classList.contains('tglp-nosort'),
    [2, 5, 8, 11].map(function (i) { return thsStar[i] ? thsStar[i].className : 'none'; }).join(' | '));
  var starFilter = doc.getElementById('tglp-starfilter');
  ok('星之力筛选有自定义选项',
    !!starFilter && !!starFilter.querySelector('option[value="custom"]'), '');
  var starInputs = doc.querySelectorAll('.tglp-starwrap input');
  ok('星之力自定义区间输入框存在', starInputs.length === 2, 'inputs=' + starInputs.length);
  if (starFilter && starInputs.length === 2) {
    starFilter.value = 'custom';
    starFilter.dispatchEvent(new Event('change'));
    starInputs[0].value = '200';
    starInputs[0].dispatchEvent(new Event('change'));
    ok('星之力自定义下限过滤', T.table().rows === 0, 'rows=' + T.table().rows);
    starInputs[0].value = '100';
    starInputs[0].dispatchEvent(new Event('change'));
    ok('星之力自定义区间命中', T.table().rows === 1, 'rows=' + T.table().rows);
  }
  if (starFilter) {
    starFilter.value = 'all';
    starFilter.dispatchEvent(new Event('change'));
  }
  T.setView('fund');

  var monthlyCard = doc.querySelector('.tglp-chartcard[data-chart="monthly"]');
  var monthlyBtn = monthlyCard ? monthlyCard.querySelector('.tglp-cc-btn') : null;
  var monthlyCol = monthlyCard ? monthlyCard.querySelector('.tglp-mcol') : null;
  ok('月度趋势有净值切换按钮', !!monthlyBtn, monthlyBtn ? monthlyBtn.textContent : 'none');
  ok('月度趋势悬停显示净值', !!monthlyCol && monthlyCol.title.indexOf('净值') >= 0,
    monthlyCol ? monthlyCol.title : 'none');
  if (monthlyBtn) monthlyBtn.click();
  ok('切到月度净值图', !!doc.querySelector('.tglp-mbars-net'), '');
  var monthlyCard2 = doc.querySelector('.tglp-chartcard[data-chart="monthly"]');
  var monthlyBtn2 = monthlyCard2 ? monthlyCard2.querySelector('.tglp-cc-btn') : null;
  if (monthlyBtn2) monthlyBtn2.click();

  var inOtherRows = T.fundDrill('in', 'other', 'detail');
  ok('竞拍失败退回显示在收入·其他',
    inOtherRows.some(function (r) { return r.val === 400 && r.key === 'other'; }),
    'rows=' + inOtherRows.length);
  ok('取消买入/冰山退回显示在收入·其他',
    inOtherRows.some(function (r) { return r.val === 85600; }) &&
    inOtherRows.some(function (r) { return r.val === 13; }), 'rows=' + inOtherRows.length);
  ok('竞拍成功退回显示在收入·其他',
    inOtherRows.some(function (r) { return r.val === 4100; }), 'rows=' + inOtherRows.length);
  var mf = T.monthlyFlow();
  ok('月度趋势净值字段存在', mf.length > 0 && typeof mf[0].net === 'number', 'm=' + mf.length);
  var spanText = T.state().status;
  ok('日期区间带年份', /\\d{4}\\/\\d{2}\\/\\d{2}/.test(spanText), spanText);
  var pgInfo = doc.querySelector('.tglp-pg-info');
  ok('分页显示页数在前且无 1-50',
    !!pgInfo && /^\\d+ 页 \\/ 共 \\d+ 条$/.test(pgInfo.textContent), pgInfo ? pgInfo.textContent : 'none');
  var chRow = doc.querySelector('.tglp-chrow');
  ok('来源占比金额与次数分列',
    !!chRow && !!chRow.querySelector('.tglp-chamt') && !!chRow.querySelector('.tglp-chcnt'),
    chRow ? chRow.textContent : 'none');

  T.learnNamesFromDesc([{ Description: '买入委托 #221152「缪亚」 冻结2cc' }]);
  ok('退市角色可从描述补齐名字', T.charaName(221152) === '缪亚', T.charaName(221152));

  /* ---------- ⑫ v1.5.9：明细「汇总」/ 汇总双栏 / 金额降序 / 角色来源不可排序 ---------- */
  var fModeSel = doc.getElementById('tglp-fmode');
  ok('明细下拉显示「汇总」',
    !!fModeSel && fModeSel.querySelector('option[value="role"]').textContent === '汇总', '');
  setFundKey('all');
  ok('全部来源禁用汇总', !!fModeSel && fModeSel.disabled === true, '');
  setFundKey('buy');
  ok('具体来源启用汇总', !!fModeSel && fModeSel.disabled === false, '');
  fModeSel.value = 'role'; fModeSel.dispatchEvent(new Event('change'));
  var tbRole = T.table();
  var headsRole = tableHeads();
  ok('买入汇总一行两组（8 列表头）',
    tbRole.pair === true && headsRole.length === 8 &&
    headsRole[0] === '角色' && headsRole[1] === '笔数' && headsRole[2] === '占比' && headsRole[3] === '金额' &&
    headsRole[4] === '角色', headsRole.join(','));
  var roleRows = T.tableRows();
  ok('买入汇总默认按金额从高到低',
    roleRows.length >= 2 && roleRows[0][3] >= roleRows[1][3],
    roleRows.length >= 2 ? (roleRows[0][3] + '/' + roleRows[1][3]) : 'rows=' + roleRows.length);
  var roleTh = doc.querySelectorAll('.tglp-table thead th')[0];
  ok('汇总角色表头不可排序', !!roleTh && roleTh.classList.contains('tglp-nosort'),
    roleTh ? roleTh.className : 'none');
  setFundKey('ico');
  ok('ICO 汇总同样一行两组', T.table().pair === true && tableHeads().length === 8, '');
  setFundKey('auction');
  ok('竞拍汇总同样一行两组', T.table().pair === true && tableHeads().length === 8, '');
  setFundKey('bless');
  ok('祝福汇总同样一行两组', T.table().pair === true && tableHeads().length === 8, '');
  setFundKey('refine');
  ok('精炼汇总同样一行两组', T.table().pair === true && tableHeads().length === 8, '');

  // 汇总按描述「」名字聚合：红包=玩家名，手续费/印花税=角色名
  var wPacket = T.logRoleWho({ Description: '给「hang333」发送红包' }, 'packet');
  ok('红包汇总取描述玩家名', !!wPacket && wPacket.name === 'hang333' && wPacket.id === 0, '');
  var wFee = T.logRoleWho({ Description: '取消竞拍 #70888「八寻宁宁」 收取手续费80cc' }, 'fee');
  ok('手续费汇总取描述角色名', !!wFee && wFee.name === '八寻宁宁' && wFee.id === 70888, '');
  var wStamp = T.logRoleWho({ Description: '交易印花税 #29282「黄前久美子」' }, 'stamp');
  ok('印花税汇总取描述角色名', !!wStamp && wStamp.name === '黄前久美子' && wStamp.id === 29282, '');
  setFundKey('packet');
  var packetTxt = doc.querySelector('.tglp-table tbody tr').textContent;
  ok('红包汇总显示玩家名', packetTxt.indexOf('hang333') >= 0 || packetTxt.indexOf('a90134z') >= 0,
    packetTxt.slice(0, 90));
  setFundKey('fee');
  var feeTxt = doc.querySelector('.tglp-table tbody tr').textContent;
  ok('手续费汇总显示角色名', feeTxt.indexOf('八寻宁宁') >= 0, feeTxt.slice(0, 90));
  setFundKey('stamp');
  var stampTxt = doc.querySelector('.tglp-table tbody tr').textContent;
  ok('印花税汇总显示角色名', stampTxt.indexOf('黄前久美子') >= 0, stampTxt.slice(0, 90));

  // 股息税 / 刮刮乐汇总：只保留笔数、金额，合计成一笔
  setFundKey('scratch');
  var headsScratchRole = tableHeads();
  var rowsScratchRole = T.tableRows();
  ok('刮刮乐汇总只显示笔数/金额',
    headsScratchRole.length === 3 && headsScratchRole[0] === '笔数' && headsScratchRole[1] === '金额',
    headsScratchRole.join(','));
  ok('刮刮乐汇总合计 3 笔 3000',
    rowsScratchRole.length === 1 && rowsScratchRole[0][0] === 3 && rowsScratchRole[0][1] === 3000,
    JSON.stringify(rowsScratchRole));
  setFundKey('other');
  var headsOtherRole = tableHeads();
  var rowsOtherRole = T.tableRows();
  ok('股息税汇总只显示笔数/金额',
    headsOtherRole.length === 3 && headsOtherRole[0] === '笔数' && headsOtherRole[1] === '金额',
    headsOtherRole.join(','));
  ok('股息税汇总合计 3 笔 600',
    rowsOtherRole.length === 1 && rowsOtherRole[0][0] === 3 && rowsOtherRole[0][1] === 600,
    JSON.stringify(rowsOtherRole));
  var thOtherMoney = thByLabel('金额');
  var tblRect = doc.querySelector('.tglp-table').getBoundingClientRect();
  var otherMoneyLeft = thOtherMoney ? thOtherMoney.getBoundingClientRect().left : -1;
  ok('股息税汇总笔数/金额在左半边',
    otherMoneyLeft > 0 && otherMoneyLeft < tblRect.left + tblRect.width / 2,
    Math.round(otherMoneyLeft) + '/' + Math.round(tblRect.width));

  // 收入汇总：卖出/献祭/ICO/红包 双栏；股息/分红/大乐透/推荐/福利/签到 合计
  var fDirSel3 = doc.getElementById('tglp-fdir');
  fDirSel3.value = 'in'; fDirSel3.dispatchEvent(new Event('change'));
  setFundKey('sell');
  fModeSel.value = 'role'; fModeSel.dispatchEvent(new Event('change'));
  ok('收入卖出汇总双栏 8 列',
    T.table().pair === true && tableHeads().length === 8 && tableHeads()[0] === '角色',
    tableHeads().join(','));
  var inOpts = [].map.call(doc.querySelectorAll('#tglp-fkind option'), function (o) { return o.textContent; });
  ok('收入来源不含萌王返利', inOpts.indexOf('萌王返利') < 0, inOpts.join(','));
  ok('收入下拉只有福利没有重复',
    inOpts.filter(function (x) { return x === '福利'; }).length === 1, inOpts.join(','));
  ok('大乐透排在收入来源最后', inOpts[inOpts.length - 1] === '大乐透', inOpts.join(','));
  setFundKey('ico');
  ok('收入 ICO 汇总双栏 8 列', T.table().pair === true && tableHeads().length === 8, '');
  setFundKey('packet');
  ok('收入红包汇总双栏 8 列', T.table().pair === true && tableHeads().length === 8, '');
  setFundKey('dividend');
  var headsDivRole = tableHeads();
  var rowsDivRole = T.tableRows();
  ok('收入股息汇总笔数/金额',
    headsDivRole.length === 3 && headsDivRole[0] === '笔数' && headsDivRole[1] === '金额',
    headsDivRole.join(','));
  ok('收入股息汇总合计 1 笔 900',
    rowsDivRole.length === 1 && rowsDivRole[0][0] === 1 && rowsDivRole[0][1] === 900,
    JSON.stringify(rowsDivRole));
  setFundKey('lotto');
  ok('收入大乐透汇总笔数/金额',
    tableHeads().length === 3 && tableHeads()[0] === '笔数', tableHeads().join(','));

  var welfareRows = T.fundDrill('in', 'welfare', 'detail');
  ok('福利条目进入收入明细',
    welfareRows.length === 1 && welfareRows[0].val === 173700, 'rows=' + welfareRows.length);
  setFundKey('welfare');
  var headsWelfareRole = tableHeads();
  var rowsWelfareRole = T.tableRows();
  ok('福利汇总笔数/金额',
    headsWelfareRole.length === 3 && headsWelfareRole[0] === '笔数' &&
    rowsWelfareRole.length === 1 && rowsWelfareRole[0][0] === 1 && rowsWelfareRole[0][1] === 173700,
    JSON.stringify(rowsWelfareRole));

  var sacRows = T.fundDrill('in', 'sacrifice', 'detail');
  ok('股权融资进入收入·献祭明细',
    sacRows.some(function (r) { return Math.abs(r.val - 40.24) < 0.01 && r.key === 'sacrifice'; }),
    'rows=' + sacRows.length);

  fModeSel.value = 'detail'; fModeSel.dispatchEvent(new Event('change'));
  fDirSel3.value = 'out'; fDirSel3.dispatchEvent(new Event('change'));
  setFundKey('all');

/* ---------- 统计范围「全部」与快照复用 ---------- */
  var lDaysSel = doc.getElementById('tglp-ldays');
  ok('统计范围含全部选项', !!lDaysSel && !!lDaysSel.querySelector('option[value="all"]'), '');
  if (lDaysSel) { lDaysSel.value = 'all'; lDaysSel.dispatchEvent(new Event('change')); }
  ok('全部范围显示全部记录', T.state().status.indexOf('全部记录') >= 0,
    T.state().status.slice(0, 90));
  var stA = T.cachedLedgerStats();
  var stB = T.cachedLedgerStats();
  ok('统计快照复用（无新日志不重复算）', stA === stB, '');
  T.invalidateStatsCache();
  var stC = T.cachedLedgerStats();
  ok('快照失效后重新统计', stC !== stA, '');

  await T.refreshStatBuckets();
  var bi = T.statBucketsInfo();
  ok('按日聚合桶已建立', !!bi && bi.count === T.state().raw && bi.days > 0,
    bi ? 'count=' + bi.count + ' days=' + bi.days : 'none');
  var bst = T.bucketStats();
  var rst = T.ledgerStats();
  ok('桶统计与全量统计一致',
    !!bst && !!rst &&
    Math.abs(bst.fundIn.total - rst.fundIn.total) < 0.01 &&
    Math.abs(bst.fundOut.total - rst.fundOut.total) < 0.01 &&
    Math.abs(bst.stockIn.total - rst.stockIn.total) < 0.01 &&
    Math.abs(bst.stockOut.total - rst.stockOut.total) < 0.01 &&
    Math.abs(bst.fixedOut.total - rst.fixedOut.total) < 0.01 &&
    Math.abs(bst.tax.sum - rst.tax.sum) < 0.01,
    bst && rst
      ? [bst.fundIn.total, rst.fundIn.total, bst.fundOut.total, rst.fundOut.total,
         bst.stockIn.total, rst.stockIn.total, bst.stockOut.total, rst.stockOut.total].join('/')
      : 'none');
  await T.refreshStatBuckets();
  ok('无新日志时桶不重建', T.statBucketsInfo().count === T.state().raw, '');

  out.textContent = lines.join('~|~') + '~|~END~|~';
  } catch (err) {
    out.textContent = lines.join('~|~') + '~|~FAIL 脚本异常 ' + (err && err.stack ? err.stack : err) + '~|~END~|~';
  }
})();
</script>
`;

const html = head + mock + compTag + test;
const out = path.join(dir, 'testlp.html');
fs.writeFileSync(out, html, 'utf8');
console.log('生成 ' + out + ' (' + html.length + ' bytes)');
