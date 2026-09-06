import { chapters, readStore, writeStore, formatTime, createActiveClock, validCheckpoint } from './campaign.js';

export function createExperience({ chapter, state, controls, touch, renderer, camera, keys, velocity, closeReading, sound }) {
  const meta = chapters[chapter - 1];
  const $ = id => document.getElementById(id);
  const previous = validCheckpoint(readStore('arcanum-campaign', null));
  const continuing = new URLSearchParams(location.search).get('autostart') === '1' && previous?.chapter === chapter && !previous.finished;
  const base = continuing ? Number(readStore('arcanum-elapsed-ms', 0)) || 0 : 0;
  const timer = createActiveClock(base);
  const prefs = { volume: 55, sensitivity: 1, brightness: 1.15, quality: 'balanced', inputMode: 'drag', reduced: false, ...readStore('arcanum-settings', {}) };
  let started = false, paused = true, finished = false;
  let journal = continuing ? readStore('arcanum-journal', []) : [];
  if (!Array.isArray(journal)) journal = [];
  let hintCount = continuing ? Number(readStore('arcanum-hints', 0)) || 0 : 0;
  let lastProgress = '', lastObjective = '', focusReturn = null;
  const hintLevels = {};
  const audioContexts = new Set();
  const gains = new Set();
  let ambience;

  $('title-screen').innerHTML = `
    <header class="brandbar"><a href="index.html" class="wordmark"><span class="brand-sigil">⟡</span> ARCANUM</a><span class="edition">EIN MYSTERY ESCAPE ADVENTURE</span><button class="text-button" data-panel="settings">Einstellungen</button></header>
    <div class="title-layout"><div class="title-copy"><p class="eyebrow">FÜNF KAPITEL. EIN VERBOTENES GEHEIMNIS.</p><h1>Der Turm<br>schweigt.<br><em>Noch.</em></h1><p class="title-description">Entschlüssle die Hinterlassenschaft des Erzmagiers. Folge dem Licht. Und entkomme, bevor sein Werk erwacht.</p><div class="title-actions"><button id="start-btn" class="primary">${chapter === 1 ? (previous && !previous.finished ? 'Neuen Durchlauf starten' : 'Das Geheimnis betreten') : 'Kapitel betreten'} <span>↗</span></button>${chapter === 1 && previous && previous.chapter > 1 && previous.chapter <= 5 && !previous.finished ? `<a class="continue-button" href="${chapters[previous.chapter - 1].file}?autostart=1">Weiter bei Kapitel ${previous.chapter} <span>↗</span></a>` : ''}<a class="chapter-link" href="rooms.html">Die fünf Kapitel entdecken <span>→</span></a></div><div class="title-facts"><span><b>3D</b> FREI ERKUNDEN</span><span><b>01–05</b> VERBUNDENE RÄUME</span><span><b>DE</b> AUF DEUTSCH</span></div></div><aside class="chapter-teaser"><span class="eyebrow">DEIN NÄCHSTES KAPITEL · ${String(chapter).padStart(2, '0')}</span><h2>${meta.name}</h2><p>${meta.subtitle}</p><span class="teaser-line"></span><small>Kopfhörer empfohlen · Mit Hinweissystem</small></aside></div>
    <footer class="title-footer"><span>BEOBACHTEN. KOMBINIEREN. ENTKOMMEN.</span><span>WASD bewegen &nbsp; · &nbsp; Maus ziehen: umsehen &nbsp; · &nbsp; E interagieren</span></footer>`;
  // Existing room listeners bind after this shared shell has been created.
  const tools = document.createElement('div');
  tools.id = 'game-tools';
  tools.innerHTML = '<button data-panel="journal" aria-label="Journal öffnen (J)">J <span>Journal</span></button><button data-panel="hints" aria-label="Hinweis öffnen (H)">H <span>Hinweis</span></button><button id="pause-game" aria-label="Spiel pausieren">Ⅱ <span>Pause</span></button>';
  $('hud').append(tools);
  const chapterLabel = document.createElement('div');
  chapterLabel.className = 'hud-chapter';
  chapterLabel.innerHTML = `<span>KAPITEL ${String(chapter).padStart(2, '0')} / 05</span>${meta.name}<div id="chapter-progress"></div>`;
  $('hud').append(chapterLabel);
  $('objective').querySelector('.objective-title').textContent = 'DEINE NÄCHSTE SPUR';
  $('toast').setAttribute('role', 'status');
  $('hover-label').setAttribute('aria-live', 'polite');
  $('timer').setAttribute('aria-label', 'Aktive Spielzeit');
  $('pause-screen').innerHTML = `<div class="pause-layout"><p class="eyebrow">ARCANUM · KAPITEL ${chapter}</p><h1 class="small">Ein Atemzug.</h1><p class="title-sub">Der Turm kann warten. Deine Spielzeit pausiert.</p><button id="resume-btn" class="primary">Zurück ins Geheimnis <span>→</span></button><div class="pause-links"><button class="text-button" data-panel="journal">Journal</button><button class="text-button" data-panel="hints">Hinweise</button><button class="text-button" data-panel="settings">Einstellungen</button></div><a class="chapter-link" href="index.html">Zum Titelbildschirm</a><p class="checkpoint-note">Checkpoint: Kapitelanfang. Rätsel im aktuellen Raum beginnen beim Neuladen erneut.</p></div>`;
  const panel = document.createElement('dialog');
  panel.id = 'codex-panel';
  panel.setAttribute('aria-label', 'Journal, Hinweise und Einstellungen');
  panel.innerHTML = '<div class="panel-top"><span class="eyebrow">DAS ARCHIV DES TURMS</span><button id="close-panel" class="icon-button" aria-label="Dialog schließen">×</button></div><div id="panel-content"></div>';
  document.body.append(panel);
  $('close-panel').onclick = () => panel.close();
  panel.addEventListener('close', () => { if (started && !finished) $('resume-btn').focus(); else if (focusReturn?.isConnected) focusReturn.focus(); });
  document.addEventListener('click', e => { const trigger = e.target.closest('[data-panel]'); if (trigger) openPanel(trigger.dataset.panel); });
  $('pause-game').onclick = pause;
  document.addEventListener('keydown', e => {
    if (e.repeat || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || panel.open) return;
    if (started && !finished && ['KeyJ', 'KeyH'].includes(e.code)) { e.preventDefault(); openPanel(e.code === 'KeyJ' ? 'journal' : 'hints'); }
    if (e.code === 'Escape' && touch.isActive()) pause();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && started && !finished) pause(); });
  window.addEventListener('blur', () => { if (started && !finished) pause(); });
  document.addEventListener('pointerlockerror', () => { if (started) { pause(); document.querySelector('#pause-screen .title-sub').textContent = 'Die Maus konnte nicht erfasst werden. Wähle unter Einstellungen die Steuerung „Ziehen zum Umsehen“.'; } });
  document.querySelector('.reading-hint').textContent = 'Klicken oder E drücken, um zu schließen · Im Journal gespeichert';
  $('reading').addEventListener('click', () => { if (!controls.isLocked) closeReading(); });
  const intro = document.createElement('div');
  intro.id = 'chapter-intro'; intro.className = 'hidden';
  intro.innerHTML = `<span class="eyebrow">KAPITEL ${String(chapter).padStart(2, '0')}</span><h2>${meta.name}</h2><p>${meta.story}</p>`;
  document.body.append(intro);

  function applyPrefs() {
    controls.pointerSpeed = Number(prefs.sensitivity);
    touch.setSensitivity(Number(prefs.sensitivity));
    renderer.shadowMap.enabled = prefs.quality !== 'low';
    renderer.toneMappingExposure = Number(prefs.brightness);
    renderer.setPixelRatio(Math.min(devicePixelRatio, prefs.quality === 'high' ? 2 : prefs.quality === 'low' ? 1 : 1.5));
    document.body.classList.toggle('reduced-motion', Boolean(prefs.reduced));
    for (const gain of gains) gain.gain.value = Number(prefs.volume) / 100;
    writeStore('arcanum-settings', prefs);
  }
  function routeAudio(context) {
    const gain = context.createGain(); gain.gain.value = Number(prefs.volume) / 100;
    gain.connect(context.destination); gains.add(gain); audioContexts.add(context); return gain;
  }
  function startAmbience() {
    if (ambience) { ambience.resume().catch(() => {}); return; }
    try {
      ambience = new (window.AudioContext || window.webkitAudioContext)();
      const master = routeAudio(ambience);
      [55, 82.41, 110.2].forEach((frequency, i) => {
        const oscillator = ambience.createOscillator(), gain = ambience.createGain();
        oscillator.frequency.value = frequency * (chapter === 2 ? 1.5 : 1);
        gain.gain.value = i === 0 ? 0.028 : 0.009;
        oscillator.connect(gain).connect(master); oscillator.start();
      });
    } catch { /* The adventure remains playable without WebAudio. */ }
  }
  function pause() {
    if (finished) return;
    paused = true; timer.pause(); touch.disable();
    intro.classList.add('hidden');
    for (const key of Object.keys(keys)) keys[key] = false;
    velocity.set(0, 0, 0);
    closeReading();
    if (controls.isLocked) controls.unlock();
    if (started) $('pause-screen').classList.remove('hidden');
    for (const context of audioContexts) context.suspend().catch(() => {});
  }
  function begin() {
    if (!started) {
      started = true;
      if (!continuing) { journal = []; hintCount = 0; writeStore('arcanum-journal', []); writeStore('arcanum-hints', 0); }
      const saved = writeStore('arcanum-campaign', { chapter, finished: false });
      writeStore('arcanum-elapsed-ms', base);
      intro.classList.remove('hidden'); setTimeout(() => intro.classList.add('hidden'), 8500);
      if (!saved) document.querySelector('.checkpoint-note').textContent = 'Speicherung ist in diesem Browser nicht verfügbar. Lass diesen Tab geöffnet.';
    }
    paused = false; timer.resume(); startAmbience();
    for (const context of audioContexts) context.resume().catch(() => {});
  }
  function openPanel(type) {
    focusReturn = document.activeElement;
    if (started) pause();
    if (type === 'settings') {
      $('panel-content').innerHTML = `<h2>Dein Spielerlebnis.</h2><p class="panel-lead">So fühlt sich der Turm für dich richtig an.</p><label class="setting">Lautstärke <output id="volume-value">${prefs.volume}%</output><input id="volume" type="range" min="0" max="100" value="${prefs.volume}"></label><label class="setting">Maussteuerung<select id="inputMode"><option value="drag">Ziehen zum Umsehen</option><option value="lock">Freie Maus (Ego-Steuerung)</option></select></label><label class="setting">Mausempfindlichkeit<input id="sensitivity" type="range" min="0.3" max="2" step="0.1" value="${prefs.sensitivity}"></label><label class="setting">Helligkeit<input id="brightness" type="range" min="0.8" max="1.9" step="0.05" value="${prefs.brightness}"></label><label class="setting">Grafikqualität<select id="quality"><option value="low">Leicht · Mobile Geräte</option><option value="balanced">Ausgewogen</option><option value="high">Hoch · Schärfere Darstellung</option></select></label><label class="check-setting"><input id="reduced" type="checkbox" ${prefs.reduced ? 'checked' : ''}> Weniger Bildschirmbewegung und Körnung</label><div class="controls-guide"><span><kbd>W A S D</kbd> Bewegen</span><span><kbd>E / Klick</kbd> Interagieren</span><span><kbd>J</kbd> Journal</span><span><kbd>H</kbd> Hinweise</span><span><kbd>Esc</kbd> Pause</span><span>Touch: links bewegen, rechts umsehen und tippen.</span></div>`;
      $('quality').value = prefs.quality;
      $('inputMode').value = prefs.inputMode;
      for (const key of ['volume', 'sensitivity', 'brightness', 'quality', 'inputMode', 'reduced']) $(key).oninput = e => { prefs[key] = key === 'reduced' ? e.target.checked : e.target.value; if (key === 'volume') $('volume-value').textContent = `${prefs.volume}%`; applyPrefs(); };
    } else if (type === 'journal') {
      $('panel-content').innerHTML = '<h2>Deine Entdeckungen.</h2><p class="panel-lead">Gelesene Hinweise bleiben hier erhalten. Auch über Kapitel hinweg.</p><div id="journal-entries"></div><label class="setting">Eigene Notizen<textarea id="player-notes" placeholder="Eine Zahlenfolge, ein Verdacht, ein Gedanke …" rows="4" maxlength="5000"></textarea></label>';
      const target = $('journal-entries');
      if (!journal.length) target.innerHTML = '<div class="empty-journal"><span>✧</span><h3>Jedes Geheimnis beginnt mit einer Spur.</h3><p>Untersuche Bücher und Tafeln im Raum. Was du liest, wird hier gesammelt.</p></div>';
      for (const entry of journal) { const details = document.createElement('details'), summary = document.createElement('summary'), body = document.createElement('p'); summary.textContent = `${String(entry.chapter).padStart(2, '0')} / ${entry.title}`; body.textContent = entry.text; details.append(summary, body); target.append(details); }
      $('player-notes').value = readStore('arcanum-notes', '');
      $('player-notes').oninput = e => writeStore('arcanum-notes', e.target.value);
    } else {
      const hint = meta.hints.find(([key]) => !state[key]);
      $('panel-content').innerHTML = `<h2>Ein kleiner Anstoß.</h2><p class="panel-lead">Erst eine Richtung. Dann konkretere Hilfe. Du entscheidest, wie viel du erfahren möchtest.</p><div id="hint-content"></div><p class="checkpoint-note">${hintCount} Hinweise in diesem Durchlauf aufgedeckt.</p>`;
      if (!hint) $('hint-content').innerHTML = '<h3>Der Weg ist frei.</h3><p>Benutze die Ausgangstür und gehe durch den Gang.</p>';
      else {
        const [key, title, steps] = hint;
        const heading = document.createElement('h3'); heading.textContent = title; $('hint-content').append(heading);
        const render = () => {
          $('hint-content').querySelectorAll('p,button').forEach(el => el.remove());
          const level = hintLevels[key] || 0;
          $('panel-content').querySelector('.checkpoint-note').textContent = `${hintCount} Hinweise in diesem Durchlauf aufgedeckt.`;
          steps.slice(0, level).forEach((text, index) => { const p = document.createElement('p'); p.className = 'hint-step'; p.textContent = `${index + 1}. ${text}`; $('hint-content').append(p); });
          if (level < steps.length) { const button = document.createElement('button'); button.className = 'primary'; button.textContent = level ? 'Konkreteren Hinweis aufdecken' : 'Ersten Hinweis aufdecken'; button.onclick = () => { hintLevels[key] = level + 1; hintCount++; writeStore('arcanum-hints', hintCount); render(); }; $('hint-content').append(button); }
        }; render();
      }
    }
    panel.showModal();
  }
  function record(title, html) {
    if (journal.some(entry => entry.title === title && entry.chapter === chapter)) return;
    const text = new DOMParser().parseFromString(html, 'text/html').body.textContent.trim();
    journal.push({ chapter, title, text }); writeStore('arcanum-journal', journal);
  }
  function tick() {
    $('timer').textContent = formatTime(timer.elapsed());
    const progress = meta.tasks.map(([key]) => Boolean(state[key]));
    const signature = progress.join();
    if (signature !== lastProgress) {
      lastProgress = signature;
      $('chapter-progress').innerHTML = meta.tasks.map(([key, label]) => `<span class="${state[key] ? 'done' : ''}" title="${label}" aria-label="${label}: ${state[key] ? 'gelöst' : 'offen'}"></span>`).join('');
    }
    const next = state.doorOpen ? 'Gehe durch die offene Tür in den nächsten Abschnitt.' : meta.tasks.find(([key]) => !state[key])?.[1] || 'Die Sicherungen sind gelöst. Öffne die Ausgangstür.';
    if (next !== lastObjective) { lastObjective = next; $('objective-text').textContent = next; }
  }
  function complete() {
    timer.pause(); finished = true; touch.disable();
    writeStore('arcanum-elapsed-ms', timer.elapsed());
    writeStore('arcanum-campaign', { chapter: Math.min(5, chapter + 1), finished: chapter === 5 });
    if (chapter === 5) {
      $('win-time').textContent = formatTime(timer.elapsed());
      document.querySelector('#win-screen .title-sub').textContent = 'Deine aktive Zeit auf diesem Weg durch den Turm';
      document.querySelector('#win-screen .title-story').textContent = `Das Herz verstummt. Zum ersten Mal seit einer Ewigkeit gehört die Stille dir. ${hintCount} Hinweise haben dich auf deinem Weg begleitet.`;
      writeStore('arcanum-last-result', { elapsed: timer.elapsed(), hints: hintCount, completedAt: new Date().toISOString() });
    }
  }
  applyPrefs();
  if (chapter > 1) {
    document.querySelector('.title-copy h1').innerHTML = `${meta.name.replace(' ', '<br>')}<em>.</em>`;
    document.querySelector('.title-description').textContent = meta.story;
    document.querySelector('.eyebrow + h1')?.classList.add('chapter-heading');
  }
  return { begin, pause, record, tick, complete, routeAudio, requestPlay() { if (prefs.inputMode === 'drag') touch.enable(); else controls.lock(); }, elapsed: () => timer.elapsed(), isPlaying: () => started && !paused && !finished && !panel.open };
}
