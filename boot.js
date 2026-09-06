const status = document.createElement('div');
status.id = 'loading-status'; status.setAttribute('role', 'status');
status.innerHTML = '<span class="loading-sigil">⟡</span><span>DER TURM ERWACHT</span><small>Dein Kapitel wird vorbereitet …</small>';
document.body.append(status);
const file = location.pathname.split('/').pop();
const module = /^room[2-5]\.html$/.test(file) ? file.replace('.html', '.js') : 'main.js';
try {
  await Promise.all([
    document.fonts.load('500 16px "Cormorant Garamond"'),
    document.fonts.load('400 12px Manrope'),
  ]);
  await import(`./${module}`);
  status.remove();
} catch (error) {
  console.error('Arcanum konnte nicht starten:', error);
  status.innerHTML = '<span class="loading-sigil">⟡</span><h2>Der Turm bleibt noch verschlossen.</h2><p>Das Kapitel konnte nicht geladen werden. Prüfe deine Verbindung und ob dein Browser WebGL unterstützt.</p><button id="retry-load">Erneut versuchen</button><a href="rooms.html">Zur Kapitelübersicht</a>';
  document.getElementById('retry-load').onclick = () => location.reload();
}
