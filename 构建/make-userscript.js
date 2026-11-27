// 生成油猴脚本：component.js 外层包 userscript 头 + 防重复启动包装
//   node make-userscript.js   → ../tinygrail-ledger-plus.user.js
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const src = path.join(dir, '..', 'tinygrail-ledger-plus.component.js');
const out = path.join(dir, '..', 'tinygrail-ledger-plus.user.js');
const comp = fs.readFileSync(src, 'utf8');
const VERSION = '1.6.7';

const header = [
  '// ==UserScript==',
  '// @name         小圣杯账本2.0',
  '// @namespace    https://github.com/kana-kwi/tinygrail-ledger-plus',
  '// @version      ' + VERSION,
  '// @description  读取小圣杯资金日志并统计：资金 / 股数 / 圣殿 / 星之力四个板块，多账号本地存档，增量统计，不设页数上限。',
  '// @author       kana-kwi',
  '// @homepageURL  https://github.com/kana-kwi/tinygrail-ledger-plus',
  '// @supportURL   https://github.com/kana-kwi/tinygrail-ledger-plus/issues',
  '// @match        https://bgm.tv/*',
  '// @match        https://bangumi.tv/*',
  '// @match        https://chii.in/*',
  '// @grant        none',
  '// @run-at       document-idle',
  '// @license      MIT',
  '// ==/UserScript==',
  '',
  '(function () {',
  "  'use strict';",
  '  // 已装超合金组件时交给组件，避免两个面板同时启动',
  '  try { if (window.top && window.top.__TGLP_UI_OWNER__) return; } catch (e) {}',
  '',
].join('\n');

const footer = '\n})();\n';
const text = header + comp + footer;
fs.writeFileSync(out, text, 'utf8');
console.log('生成 ' + out + ' (' + Buffer.byteLength(text) + ' bytes)');