@echo off
REM Starts a local web server for the splat viewer and opens it in the browser.
start "" http://localhost:8765/index.html
python "%~dp0serve.py" 8765
