export const chapters = [
  { name: 'Die Studierkammer', subtitle: 'Das erste Siegel', file: 'index.html', symbol: 'ᚠ', story: 'Seit Mitternacht schweigt der Erzmagier. Nur sein Turm lebt weiter. Auf dem Schreibtisch liegt eine letzte Nachricht: „Wenn das Herz erwacht, darf niemand mehr hier sein.“', tasks: [['sealBroken', 'Das Runensiegel brechen'], ['candlesSolved', 'Die vier Flammen entzünden'], ['hasKey', 'Den Messingschlüssel finden']], hints: [
    ['sealBroken', 'Die Runen', ['Untersuche die Kammer auch abseits des Schreibtischs. Drei Runen gehören zu drei Sockeln.', 'Suche im Bücherregal, im Kessel und bei den Kisten. Die Symbole und Farben helfen bei der Zuordnung.']],
    ['candlesSolved', 'Die vier Flammen', ['Das Buch auf dem Schreibtisch verrät die Reihenfolge. Jeder Vers steht für eine Farbe.', 'Entzünde die Kerzen in dieser Reihenfolge: Gold, Rot, Blau, Grün. Bei einem Fehler erlöschen alle.']],
    ['hasKey', 'Die Schatulle', ['Die Kerzen wirken auf ein anderes Schloss im Raum.', 'Öffne nach dem Kerzenrätsel die Schatulle und nimm den Schlüssel. Benutze anschließend die Tür.']]
  ] },
  { name: 'Das Observatorium', subtitle: 'Was die Sterne verschweigen', file: 'room2.html', symbol: '☽', story: 'Über dir stehen Sterne, die es gestern noch nicht gab. Der Erzmagier hat den Himmel zu einem Schloss gemacht. Sein Licht kennt den Weg zum nächsten Stockwerk.', tasks: [['astroSolved', 'Das Astrolabium ausrichten'], ['lightSolved', 'Den Mondpfad schließen']], hints: [
    ['astroSolved', 'Das Astrolabium', ['Lies „Ruhende Gestirne“. Die drei Ringe lassen sich unabhängig drehen.', 'Richte außen die Krone, in der Mitte die Sonne und innen das Auge aus.']],
    ['lightSolved', 'Der Mondpfad', ['Beginne an der Lichtquelle und folge dem Strahl. Ein richtig gestellter Spiegel verlängert den Pfad.', 'Ab der Ausgangsstellung: erster Spiegel einmal, zweiter dreimal, dritter zweimal drehen. Danach das Tor benutzen.']]
  ] },
  { name: 'Die Uhrwerkkammer', subtitle: 'Eine gestohlene Stunde', file: 'room3.html', symbol: '◷', story: 'Hier schlägt keine Uhr dieselbe Stunde. Drei Mechanismen halten den Turm in einem einzigen Augenblick gefangen. Gib ihm seinen Rhythmus zurück.', tasks: [['bellSolved', 'Das Glockenlied wiederholen'], ['scaleSolved', 'Die Waage ins Gleichgewicht bringen'], ['clockSolved', 'Die Astraluhr stellen']], hints: [
    ['bellSolved', 'Das Glockenlied', ['Spiele zuerst die Vorlage ab. Achte auf die aufleuchtenden Glocken; du musst die Töne nicht allein nach Gehör erkennen.', 'Von links gezählt lautet die Folge: 3 → 1 → 4 → 2.']],
    ['scaleSolved', 'Die Waage', ['Die Zahl auf der Waage ist das Ziel. Gewichte lassen sich auch wieder entfernen.', 'Wähle 4 und 9. Alternativ ergeben auch 2, 4 und 7 zusammen 13.']],
    ['clockSolved', 'Die Astraluhr', ['Lies den Hinweis bei der Uhr und stelle beide Zeiger separat.', 'Stelle den Stundenzeiger auf 3 und den Minutenzeiger auf 6: halb vier.']]
  ] },
  { name: 'Der lange Flur', subtitle: 'Traue keiner Tür', file: 'room4.html', symbol: '⋈', story: 'Die Türen tragen vertraute Namen. Doch der Turm hat gelernt zu lügen. Folge den Spuren seines Bewohners — und suche am Ende nach dem, was fehlt.', tasks: [['codeSolved', 'Den Bildercode entschlüsseln'], ['uvSeen', 'Die verborgene Schrift beleuchten'], ['stepsSolved', 'Den sicheren Weg gehen'], ['doorOpen', 'Die richtige Tür öffnen']], hints: [
    ['codeSolved', 'Die Bilder', ['Die eingeritzte Nachricht beschreibt eine Runde durch den Turm. Die passenden Bilder tragen Zahlen.', 'Uhr → Schlüssel → Ventil → Tür ergibt 5284.']],
    ['uvSeen', 'Das Schwarzlicht', ['Nach dem Bildercode erhält eine Lampe Strom.', 'Schalte die UV-Lampe ein. An der gegenüberliegenden Wand erscheint eine Farbfolge.']],
    ['stepsSolved', 'Die Schritte', ['Betritt die Bodenfelder in der Reihenfolge der enthüllten Tafel.', 'Blau → Gelb → Rot → Grün. Umgehe die anderen Felder beim Wechsel.']],
    ['doorOpen', 'Die letzte Tür', ['Nicht der Name der Tür entscheidet. Gesucht ist ein leerer Raum.', 'Im Lager liegt nur Staub. Benutze die Lagertür.']]
  ] },
  { name: 'Die Dampfhalle', subtitle: 'Das Herz des Turms', file: 'room5.html', symbol: '♧', story: 'Unter Stein und Sternen schlägt ein Herz aus Messing. Vier Sicherungen schützen seinen Kern. Ein letzter Schatten trennt dich von der Welt draußen.', tasks: [['pipesSolved', 'Den Dampfweg verfolgen'], ['magnetSolved', 'Die Sicherheitssymbole ordnen'], ['leverSolved', 'Den richtigen Hebel finden'], ['numbersSolved', 'Die Schranknummern entschlüsseln'], ['shadowSolved', 'Das Schattenbild ausrichten']], hints: [
    ['pipesSolved', 'Der Dampfweg', ['Verfolge auf dem Plan nur die offene Leitung, vom Eingang zum Reaktor.', 'Die Ventilnummern entlang dieses Wegs ergeben 3719.']],
    ['magnetSolved', 'Die Symboltafel', ['Der Sicherheits-Aushang zeigt die gesuchte Reihenfolge.', 'Warnung → Schutzbrille → Handschuhe → Feuer → Ausrufezeichen.']],
    ['leverSolved', 'Die Hebel', ['Lies alle drei Schilder. Prüfe ihre Aussagen gemeinsam, bevor du einen Hebel ziehst.', 'Nur ein Schild sagt die Wahrheit. Das ist nur beim grünen Hebel möglich: Ziehe Grün.']],
    ['numbersSolved', 'Die Schränke', ['Das Feuerlöscher-Zeichen grenzt die relevanten Schränke ein.', 'Addiere die markierten Schranknummern: 112 + 230 + 51 = 393. Stelle 393 am Zahlenschloss ein.']],
    ['shadowSolved', 'Der Schatten', ['Erst wenn die vier Sicherungen gelöst sind, erhält die Lampe Strom.', 'Richte die Lampe über dem Reaktor schrittweise aus, bis die Schatten ein klares Bild ergeben.']]
  ] }
];
export function readStore(key, fallback) {
  try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch { return fallback; }
}
export function writeStore(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
export function formatTime(ms) {
  const seconds = Number.isFinite(ms) ? Math.max(0, Math.floor(ms / 1000)) : 0;
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
export function createActiveClock(base = 0, now = () => performance.now()) {
  let elapsed = Number.isFinite(base) ? Math.max(0, base) : 0, since = null;
  return {
    resume() { if (since === null) since = now(); },
    pause() { if (since !== null) { elapsed += now() - since; since = null; } },
    elapsed() { return elapsed + (since === null ? 0 : now() - since); }
  };
}

export function validCheckpoint(value) {
  return value && Number.isInteger(value.chapter) && value.chapter >= 1 && value.chapter <= 5 && typeof value.finished === 'boolean' ? value : null;
}
