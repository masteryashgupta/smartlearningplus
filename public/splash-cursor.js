// Splash cursor disabled, using this script for global Dark Theme toggle on HTML pages.
(function() {
  // Create toggle button
  var btn = document.createElement('button');
  btn.innerHTML = document.documentElement.classList.contains('dark') ? '🌙' : '☀️';
  
  // Style it exactly like the React component
  Object.assign(btn.style, {
    position: 'fixed',
    bottom: '20px',
    left: '20px',
    zIndex: '9999',
    background: 'var(--surface, #ffffff)',
    color: 'var(--text, #0f172a)',
    border: '1.5px solid var(--border, #e2e8f0)',
    borderRadius: '50%',
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    fontSize: '20px',
    transition: 'transform 0.2s, box-shadow 0.2s'
  });

  btn.onmouseenter = function() {
    btn.style.transform = 'scale(1.1)';
    btn.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
  };
  btn.onmouseleave = function() {
    btn.style.transform = 'scale(1)';
    btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  };

  btn.onclick = function() {
    var isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.removeItem('theme');
      btn.innerHTML = '☀️';
      btn.title = 'Switch to Dark Mode';
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      btn.innerHTML = '🌙';
      btn.title = 'Switch to Light Mode';
    }
  };

  document.body.appendChild(btn);

  // Sync initial state if script ran late
  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.classList.add('dark');
    btn.innerHTML = '🌙';
  }
})();
