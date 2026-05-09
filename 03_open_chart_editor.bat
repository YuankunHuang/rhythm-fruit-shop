@echo off
setlocal
cd /d "%~dp0"

echo Opening chart editor...
start "" "%~dp0tools\chart_editor.html"
