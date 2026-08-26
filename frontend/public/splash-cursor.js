// Dark Theme toggle for static HTML subject pages (all pages include this script).
(function() {
  // Apply saved theme immediately (backup for pages that don't have blocking script)
  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.classList.add('dark');
  }

  // Wait for DOM to be ready
  function init() {
    var btn = document.createElement('button');
    var dark = document.documentElement.classList.contains('dark');
    btn.innerHTML = dark ? '☀️' : '🌙';
    btn.title = dark ? 'Switch to Light Mode' : 'Switch to Dark Mode';

    // Position at bottom-right to avoid conflicting with any share buttons
    Object.assign(btn.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      left: 'auto',
      zIndex: '9999',
      background: 'var(--surface, #ffffff)',
      color: 'var(--text, #0f172a)',
      border: '1.5px solid var(--border, #e2e8f0)',
      borderRadius: '50%',
      width: '44px',
      height: '44px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
      fontSize: '18px',
      transition: 'transform 0.2s, box-shadow 0.2s',
      fontFamily: 'system-ui, sans-serif',
      lineHeight: '1',
    });

    btn.onmouseenter = function() {
      btn.style.transform = 'scale(1.12)';
      btn.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)';
    };
    btn.onmouseleave = function() {
      btn.style.transform = 'scale(1)';
      btn.style.boxShadow = '0 4px 14px rgba(0,0,0,0.15)';
    };

    btn.onclick = function() {
      var isDark = document.documentElement.classList.contains('dark');
      if (isDark) {
        document.documentElement.classList.remove('dark');
        localStorage.removeItem('theme');
        btn.innerHTML = '🌙';
        btn.title = 'Switch to Dark Mode';
      } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        btn.innerHTML = '☀️';
        btn.title = 'Switch to Light Mode';
      }
    };

    document.body.appendChild(btn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
