#!/usr/bin/env node
// 由账本plus主文件生成「提交组件审核用」的精简版
//   - 头部说明换成两行 banner
//   - 删整行注释，连续空行压成一行，代码不动
// 用法：node make-paste-lp.js <输入> <输出>
const fs = require('fs');
const { execFileSync } = require('child_process');

const inp = process.argv[2] || 'D:/下载/CodeArts Agent HC/账本plus/tinygrail-ledger-plus.component.js';
const out = process.argv[3] || 'D:/下载/CodeArts Agent HC/账本plus/tinygrail-ledger-plus.component.paste.js';

const s = fs.readFileSync(inp, 'utf8').replace(/\r\n/g, '\n');
const end = s.indexOf('*/');
if (s.indexOf('/*') !== 0 || end < 0) throw new Error('头部注释块没找到');

const banner = [
  '/**',
  ' * 小圣杯账本2.0 v1.6.0 —— 多账号存档 / 账号管理 / IDB 零丢失 / Alt+L',
  ' */',
].join('\n');

const lines = s.slice(end + 2).split('\n');
const kept = [];
let inBlock = false;
let blank = 0;
for (const raw of lines) {
  const t = raw.trim();
  if (inBlock) { if (t.indexOf('*/') >= 0) inBlock = false; continue; }
  if (t.indexOf('/*') === 0) { if (t.indexOf('*/') < 0) inBlock = true; continue; }
  if (t.indexOf('//') === 0) continue;
  if (t === '') { blank++; if (blank > 1) continue; kept.push(''); continue; }
  blank = 0;
  kept.push(raw);
}

const result = banner + kept.join('\n').replace(/^\n+/, '\n');
fs.writeFileSync(out, result, 'utf8');
execFileSync(process.execPath, ['--check', out], { stdio: 'inherit' });
console.log(out + '：' + result.split('\n').length + ' 行 / ' + Buffer.byteLength(result) + ' 字节');
