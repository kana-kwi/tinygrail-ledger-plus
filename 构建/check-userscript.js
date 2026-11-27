// 验证油猴版在没有 chiiLib 的页面会显示悬浮球入口
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const dir = __dirname;
const us = fs.readFileSync(path.join(dir, '..', 'tinygrail-ledger-plus.user.js'), 'utf8');
const page = path.join(dir, 'run_userscript.html');
fs.writeFileSync(page, '<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div><script>\n' + us + '\n</script></body></html>', 'utf8');
const profile = path.join(os.tmpdir(), 'tglp-us-' + process.pid);
try {
  const out = execFileSync('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--user-data-dir=' + profile, '--virtual-time-budget=12000', '--dump-dom',
    'file:///' + page.replace(/\\/g, '/'),
  ], { encoding: 'utf8', timeout: 60000 });
  console.log(out.includes('id="tglp-fab"') ? 'FAB OK' : 'FAB MISSING');
  console.log(out.includes('id="tglp-style"') ? 'STYLE OK' : 'STYLE MISSING');
} finally {
  try { fs.rmSync(page, { force: true }); } catch (e) {}
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {}
}