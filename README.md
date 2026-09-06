# Arcanum — Der Turm schweigt

Ein deutsches 3D-Escape-Adventure mit fünf verbundenen Kapiteln. Version 0.2.0.

## Starten

Node.js installieren, dann im Projektordner `npm run dev` ausführen und `http://localhost:8321` öffnen. Keine npm-Pakete müssen installiert werden. Das Spiel benötigt einen HTTP-Server; direktes Öffnen über `file://` ist wegen der ES-Module nicht unterstützt.

## Spielen

- WASD: bewegen. Standard: linke Maustaste halten und ziehen, um sich umzusehen.
- Klick auf ein nahes Objekt oder E auf das Fadenkreuz: interagieren.
- J: Journal. H: schrittweise Hinweise. Escape oder Pause: pausieren.
- Unter Einstellungen kann die klassische freie Maus mit Pointer Lock aktiviert werden.
- Touch: linker Stick bewegt, rechter Bereich dreht die Sicht; kurzes Antippen benutzt ein Objekt. Pause und Hinweise sind oben rechts erreichbar.
- Gelesene Hinweise, persönliche Notizen und Einstellungen werden lokal im Browser gespeichert.
- Checkpoints liegen an Kapitelanfängen. Nach Neuladen beginnt das aktuelle Kapitel von vorn; zuvor abgeschlossene Kapitel und deren aktive Zeit bleiben beim Fortsetzen erhalten. Der Titelbildschirm bietet ab Kapitel II „Weiter bei Kapitel …“.
- Neue Durchläufe und das Starten eines einzelnen Kapitels ersetzen den aktiven Kapitel-Checkpoint. Persönliche Notizen bleiben erhalten.

## Neue Spielversion

Eigene Titelillustration, neues Menü und Kapitelauswahl, neue Rahmengeschichte, ruhigere Benutzeroberfläche, Kapitelziele und Fortschrittsanzeigen, Journal, zweistufige kontextabhängige Hinweise, pausierende Gesamtzeit, atmosphärischer Klang, Lautstärke-, Helligkeits-, Grafik- und Steuerungsoptionen. Strukturierte Steinoberflächen und Schatten ersetzen flache Architekturmaterialien. Die einfache Grafikstufe deaktiviert Schatten.

Three.js und Schriften sind lokal eingebunden; das Spiel stellt keine Anfragen an CDNs oder Google Fonts. Ein lokaler HTTP-Server funktioniert daher auch ohne Internetverbindung. Es gibt keine Telemetrie und kein Konto.

## Prüfen und paketieren

`npm test` prüft Spielzeit, Speicherung, Kapiteldefinitionen, das Kerzen-Reset und die Lösungsketten aller fünf Räume mit echter Three.js-Geometrie und ersetzter Browser-Ein-/Ausgabe. Diese Tests ersetzen keinen vollständigen manuellen Durchlauf mit Bewegung und Raycasting.

`npm run build` erstellt `dist/` mit den benötigten Dateien und einem SHA-256-Manifest. Der Inhalt kann auf einem statischen HTTP-Host oder als HTML5-Spielpaket verwendet werden. Lizenzen mitliefern. Für ein ZIP unter PowerShell: `Compress-Archive -Path dist/* -DestinationPath arcanum-v0.2.0.zip -Force`.

## Vor einem Verkauf

Diese Version ist eine überarbeitete, spielbare Grundlage mit einem auslieferbaren HTML5-Paket. Eine Verkaufsplattform, Bezahlung und Zugangsschutz sind nicht implementiert. Vor einer bezahlten Veröffentlichung fehlen noch unabhängige vollständige Playtests, Schwierigkeits-/Spielzeitabstimmung und Tests auf echten iOS-/Android-Geräten. Das Titelmotiv ist atmosphärische Key Art; es ist kein Screenshot der bewusst einfacheren 3D-Räume. Die Bildherkunft und mitgelieferten Drittanbieter-Lizenzen stehen in `THIRD_PARTY.md`.
