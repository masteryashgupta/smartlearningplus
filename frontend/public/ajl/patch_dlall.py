import os, re

BASE = os.path.dirname(os.path.abspath(__file__))

# ── JSZip CDN tag (inject before </head>) ────────────────────────────────────
JSZIP = '<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>\n'

# ── downloadAllCodes() function (inject before </body>) ──────────────────────
DL_ALL_FN = r"""
<script>
function downloadAllCodes(btnEl){
  var codes = [];
  document.querySelectorAll('.block').forEach(function(block){
    var bar = block.querySelector('.bar');
    var pre = block.querySelector('pre');
    var labelSpan = bar ? bar.querySelector('span') : null;
    if (labelSpan && pre) {
      var raw = labelSpan.textContent.trim();
      var m = raw.match(/^([^\s(]+\.[a-zA-Z]{1,5})/);
      if (m) codes.push({ name: m[1], code: pre.textContent });
    }
  });
  if (!codes.length) { alert('No code files found on this page.'); return; }
  if (typeof JSZip === 'undefined') { alert('JSZip not loaded — check your internet connection.'); return; }
  if (btnEl) { btnEl.textContent = '⏳ Zipping…'; btnEl.disabled = true; }
  var zip = new JSZip();
  codes.forEach(function(item){ zip.file(item.name, item.code); });
  zip.generateAsync({ type: 'blob' }).then(function(blob){
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    var zipName = (location.pathname.split('/').pop() || 'ajl').replace('.html','') + '_codes.zip';
    a.download = zipName;
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){ URL.revokeObjectURL(url); document.body.removeChild(a); }, 600);
    if (btnEl) { btnEl.textContent = '✓ Downloaded!'; setTimeout(function(){ btnEl.textContent = '📦 Download All Codes (.zip)'; btnEl.disabled = false; }, 2000); }
  });
}
</script>
"""

# ── The new "Download All Codes" button HTML ─────────────────────────────────
DL_ALL_BTN = '<button onclick="downloadAllCodes(this)" style="background:var(--ok);color:#fff;border:0;border-radius:6px;padding:6px 16px;font:700 13px \'Segoe UI\',sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;">📦 Download All Codes (.zip)</button>'


def patch_exp_file(path, exp_num):
    """Patch an exp1-exp10 file: add JSZip, the dl-all button, and the function."""
    content = open(path, encoding='utf-8').read()

    # 1. Inject JSZip before </head>
    if 'jszip' not in content.lower():
        content = content.replace('</head>', JSZIP + '</head>', 1)

    # 2. Add "Download All Codes" button inside the dl-bar (after the existing Download This File link)
    old_btn_end = '</a>\n</div>\n<script>(function(){var n=location.pathname'
    new_btn_end = '</a>\n  ' + DL_ALL_BTN + '\n</div>\n<script>(function(){var n=location.pathname'
    if '📦 Download All Codes' not in content:
        content = content.replace(old_btn_end, new_btn_end, 1)

    # 3. Inject downloadAllCodes() before </body>
    if 'downloadAllCodes' not in content.split('<script>')[0]:  # only add the fn once
        content = content.replace('</body>', DL_ALL_FN + '</body>', 1)

    open(path, 'w', encoding='utf-8').write(content)
    print(f'Patched: {os.path.basename(path)}')


def patch_all_file(path):
    """Patch all.html: add JSZip, the dl-all button, and the function."""
    content = open(path, encoding='utf-8').read()

    # 1. Inject JSZip before </head>
    if 'jszip' not in content.lower():
        content = content.replace('</head>', JSZIP + '</head>', 1)

    # 2. Add button inside the existing top bar in all.html
    # The bar contains: ...>⬇ Download All (Single File)</a>\n</div>
    old_end = '>⬇ Download All (Single File)</a>\n</div>'
    new_end = '>⬇ Download All (Single File)</a>\n  ' + DL_ALL_BTN + '\n</div>'
    if '📦 Download All Codes' not in content:
        content = content.replace(old_end, new_end, 1)

    # 3. Inject downloadAllCodes() before </body>
    if 'function downloadAllCodes' not in content:
        content = content.replace('</body>', DL_ALL_FN + '</body>', 1)

    open(path, 'w', encoding='utf-8').write(content)
    print(f'Patched: {os.path.basename(path)}')


# ── Run ───────────────────────────────────────────────────────────────────────
for i in range(1, 11):
    p = os.path.join(BASE, f'exp{i}.html')
    if os.path.exists(p):
        patch_exp_file(p, i)

all_path = os.path.join(BASE, 'all.html')
if os.path.exists(all_path):
    patch_all_file(all_path)

print('All done.')

