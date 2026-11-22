// 跑一组测试页 —— 每页一个全新 Chrome 档案（跑完即删）
//   node runclean.js a.html b.html ...
// 与 runall.js 的区别：runall 共用 --user-data-dir，上一个页面的 localStorage
// 会串给下一个页面（test73 / test78 的假失败就是这么来的）。
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const dir = __dirname;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const files = process.argv.slice(2);
let total = 0;
const fails = [];
const rows = [];

for (const f of files) {
  const abs = path.join(dir, f);
  if (!fs.existsSync(abs)) {
    rows.push(`SKIP  ${f} (not found)`);
    continue;
  }
  const profile = path.join(os.tmpdir(), 'tgtk-prof-' + process.pid + '-' + Math.random().toString(36).slice(2, 8));
  const out = path.join(dir, 'run_' + f);
  let fd = null;
  try {
    fd = fs.openSync(out, 'w');
    execFileSync(
      CHROME,
      [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-extensions',
        '--user-data-dir=' + profile,
        '--window-size=1280,900',
        '--virtual-time-budget=120000',
        '--dump-dom',
        'file:///' + abs.replace(/\\/g, '/'),
      ],
      { stdio: ['ignore', fd, 'ignore'], timeout: 120000 }
    );
  } catch (e) {
    rows.push(`ERROR ${f}: ${e.message.slice(0, 140)}`);
    try { fs.closeSync(fd); } catch (_) {}
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (_) {}
    continue;
  }
  try { fs.closeSync(fd); } catch (_) {}
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch (_) {}

  const s = fs.readFileSync(out, 'utf8');
  const m =
    s.match(/<pre id="out"[^>]*>([\s\S]*?)<\/pre>/) || s.match(/<div id="out"[^>]*>([\s\S]*?)<\/div>/);
  if (!m) {
    rows.push(`NOOUT ${f}`);
    continue;
  }
  const t = m[1]
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
  const items = t.split('~|~').filter((x) => x.trim() && x.trim() !== 'END');
  const bad = items.filter((x) => /^FAIL/.test(x));
  total += items.length;
  fails.push(...bad.map((x) => f + ' :: ' + x));
  rows.push(`${bad.length ? 'FAIL' : 'OK  '}  ${f}  (${items.length} 项${bad.length ? ', 失败 ' + bad.length : ''})`);
}

console.log(rows.join('\n'));
console.log('--- 合计断言 ' + total + ' 项，失败 ' + fails.length + ' 项');
if (fails.length) console.log(fails.join('\n'));