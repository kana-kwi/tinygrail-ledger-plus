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
.tglp-firstrun{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 10px;
  padding:10px 12px;border:1px solid var(--tl-line-soft);border-radius:10px;background:var(--tl-surface)}
.tglp-firstrun[hidden]{display:none}
.tglp-firstrun-t{font-size:12px;font-weight:600;color:var(--tl-fg);white-space:nowrap}
.tglp-firstrun-d{font-size:11px;color:var(--tl-dim);flex:1 1 260px;line-height:1.5}
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

  // 「该账号已读到最后一页」的标记。存 localStorage 而不是 IDB meta：
  // IDB 不可用（file:// / 隐私模式）时 meta 读写会静默失效，标记必须跨环境可靠。
  const LS_ARCHIVE_FULL = 'tglp:archivefull:v1';
  function archiveFullGet() {
    try { return !!Store.accountKey && HWIN.localStorage.getItem(LS_ARCHIVE_FULL) === Store.accountKey; }
    catch (e) { return false; }
  }
  function archiveFullSet(on) {
    try {
      if (!Store.accountKey) return;
      if (on) HWIN.localStorage.setItem(LS_ARCHIVE_FULL, Store.accountKey);
      else if (HWIN.localStorage.getItem(LS_ARCHIVE_FULL) === Store.accountKey) HWIN.localStorage.removeItem(LS_ARCHIVE_FULL);
    } catch (e) {}
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
      // 旧版单库是「首次全量 + 之后增量」留下的，直接视为已全量
      archiveFullSet(true);
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
  async function scanLogs(opts) {
    if (busy) return;
    const mode = opts && opts.mode ? opts.mode : 'auto';
    busy = true;
    setButtonsDisabled(true);
    try {
      const tStart = performance.now();
      const range = logRange();
      logWindow = range;

      // 首次扫描可能发生在账号识别之前（例如直接点统计）：先确保已切到该账号的库，
      // 否则 archiveFull 这类按账号存的标记会写不进去。
      if (!Store.accountKey) { try { await checkAccount(); } catch (e) {} }

      setLogStatus('读取本地存档…');
      const base = logAllRaw.length ? logAllRaw : await Store.all();
      const seen = new Set(base.map((r) => r.k));
      const existingCount = base.length;
      const forceFull = !!(await Store.getMeta('fullScanNeeded', false));
      const archiveFull = archiveFullGet();
      const wantFull = mode === 'full' || !!range.all;
      // 目标范围起点：全量 → 0；按范围 → range.from。测试可传 opts.cutoff 精确控制。
      const cutoff = opts && opts.cutoff != null ? num(opts.cutoff) : (wantFull ? 0 : (range.from || 0));
      const earliest = base.length ? (base[base.length - 1].t || 0) : 0;
      // 已确认全量存档 → 不需要补；否则目标全量要补，目标范围要看本地是否覆盖到起点
      const needBackfill = archiveFull
        ? false
        : (wantFull ? true : (!!cutoff && (!base.length || earliest > cutoff)));
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
      let reachedCutoff = false;
      const take = (items) => {
        for (let i = 0; i < (items || []).length; i++) {
          const it = items[i];
          const ts = logTs(it.LogTime);
          // 按范围统计：日志按时间倒序，遇到早于范围起点的记录即可停
          if (cutoff && ts < cutoff) { reachedCutoff = true; return; }
          const k = logKey(it);
          if (seen.has(k)) {
            // 增量：撞上已存记录 = 后面都是老的，不用再读（本轮无失败页才可信）
            // 补历史：不能停，跳过已存记录继续往后读，直到范围起点或最后一页
            if (!failedPages.length && !forceFull && !needBackfill) { hitAnchor = true; return; }
            continue;
          }
          seen.add(k);
          pending.push({ k, t: ts, v: it });
        }
      };
      take(v1.Items || []);
      await flush();
      let scanned = 1;
      setLogStatus(`读取 1 / ${totalPages} 页…（本地已存 ${existingCount} 条）`);

      let next = 2;
      while (!hitAnchor && !reachedCutoff && next <= totalPages) {
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
        for (let i = 0; i < got.length && !hitAnchor && !reachedCutoff; i++) {
          if (got[i]) take(got[i].Items || []);
        }
        await flush();
        next += block.length;
        scanned = Math.min(next - 1, totalPages);
        setLogStatus(`读取 ${scanned} / ${totalPages} 页…（新 ${added + pending.length} 条）`);
        if (!hitAnchor && !reachedCutoff && next <= totalPages) await sleep(60);
      }

      await flush();
      await Store.setMeta('lastScan', Date.now());
      await Store.setMeta('totalPages', totalPages);
      // 读到了最后一页且没有失败页 → 本地存档已覆盖全部历史
      const fullCovered = !failedPages.length && (wantFull || scanned >= totalPages);
      if (fullCovered) archiveFullSet(true);
      // 有失败页 → 下轮强制全量重读补洞；否则清掉标记
      await Store.setMeta('fullScanNeeded', failedPages.length > 0);

      setLogStatus(`读取完成（新增 ${added} 条），整理本地存档…`);
      logAllRaw = (await Store.all()).slice().sort((a, b) => b.t - a.t);
      const storedCount = logAllRaw.length;
      if (storedCount < seen.size) {
        writeShort = seen.size - storedCount;
        await Store.setMeta('fullScanNeeded', true);
        archiveFullSet(false);
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
      syncFirstRunTip();
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

    /* 首次（该账号本地为空）提示：全量读取还是只读当前范围 */
    const firstRunFull = h('button', { class: 'tglp-btn tglp-primary', type: 'button' }, '读取全部历史');
    const firstRunRange = h('button', { class: 'tglp-btn', type: 'button' }, '只读当前范围');
    const firstRunTip = h('div', { class: 'tglp-firstrun', hidden: 'hidden' },
      h('div', { class: 'tglp-firstrun-t' }, '本地还没有这个账号的日志存档'),
      h('div', { class: 'tglp-firstrun-d' }, '读取全部历史会翻完整份日志，较慢；只读当前范围更快，之后切到更大范围会自动补齐。'),
      firstRunFull, firstRunRange);
    firstRunFull.addEventListener('click', () => { firstRunTip.hidden = true; scanLogs({ mode: 'full' }); });
    firstRunRange.addEventListener('click', () => { firstRunTip.hidden = true; scanLogs({ mode: 'range' }); });

    /* 主体：基础信息卡 → 图表卡片 → 详细数据表 */
    const main = h('div', { class: 'tglp-main' },
      firstRunTip,
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
      firstRunTip, firstRunFull, firstRunRange,
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
      // 防误触：本地不是全量存档时，切到「全部」会触发大范围补读，先确认
      if (lDays.value === 'all' && logAllRaw.length && !archiveFullGet()) {
        let ok = true;
        try { ok = HWIN.confirm('本地没有全部记录。\n切换到「全部」将读取全量历史数据，可能耗时较长，是否继续？'); } catch (e) {}
        if (!ok) { lDays.value = String(S.logDays); return; }
      }
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
      maybeBackfillHistory();
    });
    [lFrom, lTo].forEach((inp) => inp.addEventListener('change', () => {
      if (lFrom.value && lTo.value && lFrom.value > lTo.value) {
        const t = lFrom.value; lFrom.value = lTo.value; lTo.value = t;
      }
      S.logFrom = lFrom.value || ''; S.logTo = lTo.value || '';
      persist(); applyWindow();
      if (logAll.length) renderLedger();
      else setLogStatus('本地没有这段时间的数据，点「统计」补读');
      maybeBackfillHistory();
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
    lRun.addEventListener('click', () => {
    // 空存档时不让统计直接开始，先让用户选全量还是当前范围
    if (!logAllRaw.length && els && els.firstRunTip) {
      els.firstRunTip.hidden = false;
      syncFirstRunTip();
      return;
    }
    scanLogs();
  });
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

  /** 该账号本地为空时显示首次提示（全量 / 只读当前范围）。 */
  function syncFirstRunTip() {
    if (!els || !els.firstRunTip) return;
    const empty = !logAllRaw.length;
    els.firstRunTip.hidden = !empty;
    if (!empty) return;
    const r = logRange();
    if (els.firstRunRange) {
      els.firstRunRange.hidden = !!r.all;
      els.firstRunRange.textContent = '只读' + logRangeLabel(r);
    }
  }

  /** 切到更大范围（尤其「全部」）但本地存档不全时，自动补读更早的历史。 */
  function maybeBackfillHistory() {
    if (busy || !logAllRaw.length || archiveFullGet()) return;
    const r = logRange();
    const earliest = logAllRaw[logAllRaw.length - 1].t || 0;
    if (!r.all && !(r.from && earliest > r.from)) return;
    scanLogs();
  }

  async function openLedger() {
    if (!els) buildUI();
    els.panel.hidden = false;
    // 打开面板时才校验账号、读本地存档、拉持仓：平时不占 IO / 内存。
    const acc = await checkAccount();
    await ensureLocal();
    loadHoldings();
    renderLedger();
    syncFirstRunTip();
    // 换到有存档的账号才自动增量；换到空账号先让用户选全量还是当前范围
    if (acc && acc.switched && logAllRaw.length) setTimeout(() => scanLogs(), 300);
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
        syncFirstRunTip, archiveFullGet,
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
