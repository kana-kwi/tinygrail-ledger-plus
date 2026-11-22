// 跑 perf.html 并打印 PERF 结果
// node perf-run.js [n]
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const dir = __dirname;

const candidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  (process.env.LOCALAPPDATA || '') + '/Google/Chrome/Application/chrome.exe',
];
const chrome = candidates.find((p) => p && fs.existsSync(p));
if (!chrome) {
  console.error('找不到 chrome.exe');
  process.exit(1);
}

const n = String(process.argv[2] || 100000);
const page = path.join(dir, 'perf.html').replace(/\\/g, '/');
const url = 'file:///' + page + '?n=' + n;

const t0 = Date.now();
execFile(chrome, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
  '--allow-file-access-from-files', '--dump-dom',
  '--virtual-time-budget=900000', url,
], { maxBuffer: 64 * 1024 * 1024, timeout: 900000 }, (err, stdout, stderr) => {
  const ms = Date.now() - t0;
  if (err && !stdout) {
    console.error('chrome 失败:', err.message);
    if (stderr) console.error(String(stderr).slice(-2000));
    process.exit(1);
  }
  const m = String(stdout).match(/<pre id="out">([\s\S]*?)<\/pre>/);
  const text = m ? m[1] : '(no out)';
  console.log('wall=' + Math.round(ms / 1000) + 's');
  console.log(text.split('~|~').join('\n'));
});