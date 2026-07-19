// Nahtlose Raumübergänge: Fade-out beim Verlassen, Fade-in beim Betreten,
// dezenter Weiter-Hinweis statt Titelseite und ein Gesamt-Timer über alle Räume.

const ELAPSED_KEY = 'arcanum-elapsed-ms';

function ensureFadeElement() {
  let el = document.getElementById('room-fade');
  if (!el) {
    el = document.createElement('div');
    el.id = 'room-fade';
    document.body.appendChild(el);
  }
  return el;
}

// Beim Laden eines Folgeraums: schwarz starten und aufblenden.
// setTimeout statt requestAnimationFrame — rAF feuert in verborgenen Tabs nicht,
// und der Raum soll auch dann aufblenden, wenn der Tab kurz im Hintergrund war.
export function fadeInOnLoad() {
  const el = ensureFadeElement();
  el.classList.add('dark');
  el.getBoundingClientRect(); // Reflow erzwingen, damit die Transition greift
  setTimeout(() => el.classList.remove('dark'), 60);
}

// Beim Verlassen: abblenden, dann navigieren.
export function fadeOutAndGo(url) {
  const el = ensureFadeElement();
  el.getBoundingClientRect();
  el.classList.add('dark');
  setTimeout(() => { window.location.href = url; }, 650);
}

// Gesamt-Spielzeit über Raumgrenzen hinweg.
export function storedElapsedMs() {
  const v = Number(localStorage.getItem(ELAPSED_KEY));
  return Number.isFinite(v) && v > 0 ? v : 0;
}

export function saveElapsedMs(ms) {
  localStorage.setItem(ELAPSED_KEY, String(Math.max(0, Math.round(ms))));
}

export function clearElapsed() {
  localStorage.removeItem(ELAPSED_KEY);
}

// Pointer Lock braucht eine Nutzergeste — bis dahin einen pulsierenden Hinweis
// zeigen statt einer stummen Standbild-Szene. Gibt eine Aufräum-Funktion zurück.
export function showContinueHint(text = 'Klicken oder tippen, um weiterzugehen') {
  const el = document.createElement('div');
  el.id = 'continue-hint';
  el.textContent = text;
  document.body.appendChild(el);
  return () => el.remove();
}
