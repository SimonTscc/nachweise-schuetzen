@echo off
rem Startet "Nachweise fuer Schuetzen" lokal ueber http://localhost:8096
rem (Firebase-Anmeldung braucht http, nicht file://). Fenster offen lassen.
cd /d "%~dp0"
start "" "http://localhost:8096/index.html"
python -m http.server 8096 --bind 127.0.0.1
