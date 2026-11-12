Set-Location "C:\Users\Yash Gupta\Desktop\Projects\smartlearningplus\frontend\public\ajl"

$newScript = '<script>
document.querySelectorAll(''.block'').forEach(function(block){
  var btn = block.querySelector(''.copy'');
  var pre = block.querySelector(''pre'');
  var bar = block.querySelector(''.bar'');
  var labelSpan = bar ? bar.querySelector(''span'') : null;

  // Copy button logic
  btn.addEventListener(''click'', function(){
    var text = pre.textContent;
    function done(){
      btn.textContent = ''Copied'';
      btn.classList.add(''done'');
      setTimeout(function(){ btn.textContent = ''Copy''; btn.classList.remove(''done''); }, 1500);
    }
    function fallback(){
      var ta = document.createElement(''textarea'');
      ta.value = text;
      ta.style.position = ''fixed'';
      ta.style.opacity = ''0'';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand(''copy''); done(); } catch (e) { btn.textContent = ''Press Ctrl+C''; }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }
  });

  // Download button for named code files only
  if (labelSpan) {
    var raw = labelSpan.textContent.trim();
    var m = raw.match(/^([^\s(]+\.[a-zA-Z]{1,5})/);
    if (m) {
      var filename = m[1];
      var dlBtn = document.createElement(''button'');
      dlBtn.textContent = ''⬇ Download'';
      dlBtn.className = ''copy'';
      dlBtn.style.marginLeft = ''6px'';
      dlBtn.addEventListener(''click'', function(){
        var text = pre.textContent;
        var blob = new Blob([text], { type: ''text/plain'' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement(''a'');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function(){ URL.revokeObjectURL(url); document.body.removeChild(a); }, 500);
        dlBtn.textContent = ''✓ Saved'';
        dlBtn.classList.add(''done'');
        setTimeout(function(){ dlBtn.textContent = ''⬇ Download''; dlBtn.classList.remove(''done''); }, 1800);
      });
      btn.parentNode.insertBefore(dlBtn, btn.nextSibling);
    }
  }
});
</script>'

$oldScriptPattern = '<script>\r?\ndocument\.querySelectorAll\(''.block''\)\.forEach\(function\(block\)\{[\s\S]*?</script>'

1..10 | ForEach-Object {
    $file = "exp$_.html"
    if (Test-Path $file) {
        $content = [System.IO.File]::ReadAllText((Resolve-Path $file).Path, [System.Text.Encoding]::UTF8)
        $newContent = [regex]::Replace($content, $oldScriptPattern, $newScript)
        [System.IO.File]::WriteAllText((Resolve-Path $file).Path, $newContent, [System.Text.Encoding]::UTF8)
        Write-Host "Patched: $file"
    }
}

