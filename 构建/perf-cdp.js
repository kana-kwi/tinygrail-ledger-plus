// 用 Chrome CDP 实时轮询 perf.html 的输出，直到 PERF END
// node perf-cdp.js [n]
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const dir = __dirname;

const candidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  (process.env.LOCALAPPDATA || '') + '/Google/Chrome/Application/chrome.exe',
];
const chrome = candidates.find((p) => p && fs.existsSync(p));
if (!chrome) { console.error('找不到 chrome.exe'); process.exit(1); }
if (typeof WebSocket !== 'function') { console.error('当前 Node 没有全局 WebSocket'); process.exit(1); }

const n = String(process.argv[2] || 10000);
const port = 9333;
const profile = path.join(dir, '.perf-profile');
try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {}
const page = path.join(dir, 'perf.html').replace(/\\/g, '/');
const url = 'file:///' + page + '?n=' + n;

const child = spawn(chrome, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
  '--remote-debugging-port=' + port, '--user-data-dir=' + profile, url,
], { stdio: 'ignore' });

function getJson() {
  return new Promise((res, rej) => {
    const req = http.get('http://127.0.0.1:' + port + '/json/list', (r) => {
      let b = '';
      r.on('data', (d) => (b += d));
      r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } });
    });
    req.on('error', rej);
    req.setTimeout(2000, () => { req.destroy(); rej(new Error('timeout')); });
  });
}
function killChrome() {
  try { spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); } catch (e) {}
}
async function main() {
  let target = null;
  for (let i = 0; i < 80; i++) {
    try {
      const list = await getJson();
      target = (list || []).find((t) => t.type === 'page' && String(t.url).indexOf('perf.html') >= 0);
      if (target) break;
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!target) throw new Error('page target not found');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let seq = 0;
  const evalText = () => new Promise((res, rej) => {
    const id = ++seq;
    const onMsg = (ev) => {
      let m;
      try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.id !== id) return;
      ws.removeEventListener('message', onMsg);
      const v = m.result && m.result.result && m.result.result.value;
      res(typeof v === 'string' ? v : '');
    };
    ws.addEventListener('message', onMsg);
    ws.send(JSON.stringify({
      id, method: 'Runtime.evaluate',
      params: { expression: "document.getElementById('out').textContent", returnByValue: true },
    }));
    setTimeout(() => { ws.removeEventListener('message', onMsg); rej(new Error('eval timeout')); }, 5000);
  });

  const t0 = Date.now();
  let text = '';
  for (let i = 0; i < 900; i++) {
    try { text = await evalText(); } catch (e) {}
    if (text && (text.indexOf('PERF END') >= 0 || text.indexOf('PERF FAIL') >= 0)) break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.log('wall=' + Math.round((Date.now() - t0) / 1000) + 's');
  console.log(String(text || '(no out)').split('~|~').join('\n'));
  ws.close();
  killChrome();
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {}
}
main().catch((e) => { console.error(e && e.stack ? e.stack : e); killChrome(); process.exit(1); });