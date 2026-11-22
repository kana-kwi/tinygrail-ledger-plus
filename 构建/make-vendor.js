/*
 * 一次性脚本：把工具箱里账本用到的 19 段原文抽出来，固化成本地快照。
 * 目的：让账本Plus 的构建彻底不依赖工具箱主文件（新会话不参与工具箱制作，也不该被工具箱的行号变更影响）。
 *
 * 用法：node make-vendor.js [工具箱主文件路径]
 * 输出：vendor/工具箱快照.js
 *
 * 只在「需要从工具箱同步一次原文」时跑。平时构建用 build-lp.js 读快照即可。
 */
const fs = require('fs');
const path = require('path');

const SRC = process.argv[2] ||
  'D:/下载/workbuddy HC/2026-11-04-13-39-41/工具箱/tinygrail-toolkit.component.js';
const OUT = path.join(__dirname, 'vendor', '工具箱快照.js');

const lines = fs.readFileSync(SRC, 'utf8').replace(/\r\n/g, '\n').split('\n');
function seg(a, b) { return lines.slice(a - 1, b).join('\n'); }

/* 与 build-lp.js 里的 seg 调用一一对应，改这里也要改 build-lp.js 的 SEGS 表 */
const BLOCKS = [
  ['BLOCK_BASE',      1574, 1610, '基础工具 h/num/fmt/sleep/mapLimit'],
  ['BLOCK_NUM0',       873,  877, 'num0/nowMs'],
  ['CONST_RAW',        464,  535, '分类常量 LOG_TYPE/FLOW_RULES/FLOW_LABEL/FUND_*'],
  ['BLOCK_API',       2718, 2768, 'api() 网络层'],
  ['BLOCK_ALLDOCS',   2770, 2800, 'allDocs()'],
  ['BLOCK_GUESS',     2944, 2964, 'guess'],
  ['BLOCK_LOADNAMES', 2966, 2992, 'loadNames'],
  ['BLOCK_NAMECACHE',  821,  844, '角色名缓存'],
  ['BLOCK_KNOWNLV',   1852, 1861, 'knownLv'],
  ['BLOCK_CHARALINK', 3045, 3061, 'charaLink()'],
  ['BLOCK_SNAP',      3017, 3043, '快照'],
  ['BLOCK_SELFKEY',   5186, 5199, 'selfKey'],
  ['BLOCK_HOLDINGS',  4119, 4162, '持仓'],
  ['LOGIC_RAW',       7059, 7713, '账本统计纯逻辑（口径核心）'],
  ['BLOCK_RENDER',    8192, 8253, 'copyLogs()'],
  ['BLOCK_UIHELP',    8256, 8280, 'line/select/input'],
  ['BLOCK_STATUS',   21674, 21715, 'setLogStatus/setButtonsDisabled'],
  ['BLOCK_COPY',     21846, 21868, 'copyText'],
  ['CSS_RAW',        21913, 22539, '工具箱 CSS'],
];

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

const out = [];
out.push('/*');
out.push(' * 【自动生成，请勿手改】工具箱原文快照 —— 账本Plus 构建用的抽取源');
out.push(' * 生成时间：' + new Date().toISOString());
out.push(' * 来源文件：' + SRC);
out.push(' * 来源行数：' + lines.length + ' 行');
out.push(' *');
out.push(' * 为什么要快照：账本Plus 是独立组件，不该在构建时依赖工具箱主文件');
out.push(' * （工具箱一改行号，抽取就静默出错；且两边由不同会话/不同时间维护）。');
out.push(' * 需要重新同步时：node make-vendor.js [工具箱路径]');
out.push(' */');
out.push('const BLOCKS = {');
for (const [name, a, b, desc] of BLOCKS) {
  out.push('  // ' + desc + '（原文 ' + a + '-' + b + '）');
  out.push('  ' + name + ': `' + esc(seg(a, b)) + '`,');
}
out.push('};');
out.push('');
out.push('module.exports = { BLOCKS };');
out.push('');

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out.join('\n'), 'utf8');
console.log('生成快照：' + OUT);
console.log('块数：' + BLOCKS.length + ' / 字符：' + fs.readFileSync(OUT, 'utf8').length);