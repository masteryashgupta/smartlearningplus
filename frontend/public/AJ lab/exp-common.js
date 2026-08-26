/* ============================================================
   exp-common.js
   Shared logic for every AJ Lab experiment detail page.
   Each expN.html only needs to define `window.expConfig` before
   loading this script — everything else (DOM, tabs, fetch, copy,
   download) is handled here.

   Expected expConfig shape:
   {
     number: 1,                              // experiment number
     title: "AWT Checkboxes for Courses",    // shown as "Experiment N: <title>"
     files: {
       aim: "aim1.txt",
       code: "exp1.txt",
       output: "output1.txt",
       explanation: "explain1.txt"           // optional — omit to hide Explanation tab
     }
   }
   ============================================================ */

(function () {
  const cfg = window.expConfig;
  if (!cfg) {
    console.error("exp-common.js: window.expConfig is missing.");
    return;
  }

  const hasExplanation = !!(cfg.files && cfg.files.explanation);
  const metaParts = [cfg.files.aim, cfg.files.code, cfg.files.output].filter(Boolean);

  // ---- Build page DOM ----
  const root = document.getElementById('exp-root');
  root.innerHTML = `
    <div class="sl-mod">
      <div class="sl-mesh"><span></span><span></span><span></span></div>
      <div class="sl-grid-overlay"></div>

      <header class="sl-topbar">
        <div class="sl-topbar-inner">
          <a href="../index.html" class="sl-back">⬅ Back to Lab</a>
          <div class="sl-topbar-brand">
            Smart<span>Learning</span>+
            <span class="sub">// Experiment ${cfg.number}</span>
          </div>
        </div>
      </header>

      <main class="sl-shell">
        <div class="exp-card">
          <h1 class="exp-title">Experiment ${cfg.number}: ${cfg.title}</h1>
          <div class="exp-meta">FILE TARGETS: ${metaParts.join(' · ')}</div>

          <div class="sub-tab-nav">
            <button class="sub-tab-btn active" id="btn-aim" onclick="switchSubTab('aim')">Aim</button>
            <button class="sub-tab-btn" id="btn-code" onclick="switchSubTab('code')">Code</button>
            <button class="sub-tab-btn" id="btn-output" onclick="switchSubTab('output')">Output</button>
            <button class="sub-tab-btn" id="btn-explanation" onclick="switchSubTab('explanation')" style="${hasExplanation ? '' : 'display:none;'}">💡 Explanation</button>
          </div>

          <div class="exp-content">
            <div id="content-aim" class="tab-pane">
              <p class="exp-aim-text" id="aim-text">Loading Aim...</p>
            </div>

            <div id="content-code" class="tab-pane" style="display:none;">
              <div class="code-container">
                <button class="action-btn copy-btn" onclick="copyCode()">Copy Code</button>
                <button class="action-btn download-txt-btn" onclick="downloadCode('txt')">Download .txt</button>
                <button class="action-btn download-java-btn" onclick="downloadCode('java')">Download .java</button>
                <pre class="code-block" id="code-text">Loading Code...</pre>
              </div>
            </div>

            <div id="content-output" class="tab-pane" style="display:none;">
              <pre class="output-block" id="output-text">Loading Output...</pre>
            </div>

            <div id="content-explanation" class="tab-pane" style="display:none;">
              <pre class="output-block" id="explanation-text">Loading Explanation...</pre>
            </div>
          </div>
        </div>
      </main>
    </div>

    <div class="toast-copy" id="toast-copy">✓ Code copied to clipboard!</div>
  `;

  // ---- State ----
  let expCodeText = '';

  // ---- Load file contents ----
  async function loadData() {
    try {
      const aimRes = await fetch(cfg.files.aim);
      document.getElementById('aim-text').textContent = await aimRes.text();

      const codeRes = await fetch(cfg.files.code);
      expCodeText = await codeRes.text();
      document.getElementById('code-text').textContent = expCodeText;

      const outputRes = await fetch(cfg.files.output);
      document.getElementById('output-text').textContent = await outputRes.text();

      if (hasExplanation) {
        const explainRes = await fetch(cfg.files.explanation);
        document.getElementById('explanation-text').textContent = await explainRes.text();
      }
    } catch (err) {
      console.error("Error loading files:", err);
    }
  }

  // ---- Tab switching ----
  window.switchSubTab = function (tabId) {
    document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-${tabId}`).classList.add('active');

    document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
    document.getElementById(`content-${tabId}`).style.display = 'block';
  };

  // ---- Copy code ----
  window.copyCode = async function () {
    try {
      await navigator.clipboard.writeText(expCodeText);
      const btn = document.querySelector('.copy-btn');
      btn.textContent = 'Copied!';
      btn.classList.add('copied');

      const toast = document.getElementById('toast-copy');
      toast.textContent = '✓ Code copied to clipboard!';
      toast.style.display = 'block';

      setTimeout(() => {
        btn.textContent = 'Copy Code';
        btn.classList.remove('copied');
        toast.style.display = 'none';
      }, 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  // ---- Download code ----
  window.downloadCode = function (ext) {
    if (!expCodeText) return;

    const blob = new Blob([expCodeText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exp${cfg.number}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const btn = document.querySelector(`.download-${ext === 'java' ? 'java' : 'txt'}-btn`);
    const originalLabel = ext === 'java' ? 'Download .java' : 'Download .txt';
    btn.textContent = 'Downloaded!';
    btn.classList.add('downloaded');

    const toast = document.getElementById('toast-copy');
    toast.textContent = `✓ Code downloaded as exp${cfg.number}.${ext}`;
    toast.style.display = 'block';

    setTimeout(() => {
      btn.textContent = originalLabel;
      btn.classList.remove('downloaded');
      toast.style.display = 'none';
    }, 2000);
  };

  loadData();
})();
