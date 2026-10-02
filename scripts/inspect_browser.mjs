import { spawn } from 'child_process';
import http from 'http';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const chrome = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9222',
  '--no-first-run',
  '--no-default-browser-check',
  '--user-data-dir=C:\\Users\\kamle\\.gemini\\antigravity-ide\\brain\\9e55b898-8f58-421b-86e8-5010574f8cfd\\scratch\\chrome-test-profile',
  'http://localhost:4321'
]);

await new Promise(r => setTimeout(r, 2000));

function getJSON(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

try {
  const targets = await getJSON('http://127.0.0.1:9222/json');
  console.log("Targets found:", targets.length);
  const pageTarget = targets.find(t => t.type === 'page');
  console.log("Page target:", pageTarget ? pageTarget.url : 'none');

  if (pageTarget && pageTarget.webSocketDebuggerUrl) {
    const ws = new globalThis.WebSocket(pageTarget.webSocketDebuggerUrl);
    ws.onopen = async () => {
      ws.send(JSON.stringify({ id: 1, method: 'Console.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));
      ws.send(JSON.stringify({ id: 3, method: 'Page.navigate', params: { url: 'http://localhost:4321' } }));
    };

    let evaluated = false;
    ws.onmessage = async (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Console.messageAdded') {
        console.log(`[Browser Console ${msg.params.message.level}] ${msg.params.message.text}`);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        console.log(`[Browser Exception]`, JSON.stringify(msg.params.exceptionDetails));
      } else if (msg.result && msg.id === 100) {
        console.log(`[Poll Check]`, JSON.stringify(msg.result));
      } else if (msg.result && msg.id === 101) {
        console.log(`[Click Result]`, JSON.stringify(msg.result));
      } else if (msg.result && msg.id === 102) {
        console.log(`[Status After 10s]`, JSON.stringify(msg.result));
      }
    };

    // Wait 3s after navigation, then start polling
    await new Promise(r => setTimeout(r, 4000));

    console.log("Waiting for document complete and loadPyodide...");
    ws.send(JSON.stringify({
      id: 101,
      method: 'Runtime.evaluate',
      params: {
        expression: `
          (async () => {
            console.log("Starting readiness check loop...");
            let count = 0;
            while (count < 60) {
              if (document.readyState === 'complete' && typeof window.loadPyodide === 'function') {
                break;
              }
              await new Promise(r => setTimeout(r, 500));
              count++;
            }
            console.log("ReadyState:", document.readyState);
            console.log("window.loadPyodide:", typeof window.loadPyodide);
            const btnReq = document.querySelector('.btn-quick-pkg[data-pkg="requests"]');
            console.log("Quick btn requests exists:", !!btnReq);
            if (btnReq) {
              console.log("Dispatching click on requests...");
              btnReq.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            }
          })()
        `,
        awaitPromise: true,
        returnByValue: true
      }
    }));

    // Wait 20s to see all console output and package installation progress
    await new Promise(r => setTimeout(r, 20000));

    ws.send(JSON.stringify({
      id: 102,
      method: 'Runtime.evaluate',
      params: {
        expression: `
          (() => {
            const toasts = Array.from(document.querySelectorAll('#sonner-toast-container > div')).map(d => d.innerText);
            const consoleText = document.getElementById('console-output')?.innerText;
            const statusText = document.getElementById('status-text')?.innerText;
            const activeCount = document.getElementById('active-pkg-count')?.innerText;
            const installedItems = Array.from(document.querySelectorAll('#installed-packages-list li')).map(li => li.innerText);
            return { toasts, consoleText, statusText, activeCount, installedItems };
          })()
        `,
        returnByValue: true
      }
    }));

    await new Promise(r => setTimeout(r, 3000));
    ws.close();
  }
} catch (e) {
  console.error("Error inspecting:", e.message);
} finally {
  chrome.kill();
}
