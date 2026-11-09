@echo off
setlocal
set "PATH=%~dp0.local-tools\node_modules\node\bin;%~dp0.local-tools\node_modules\.bin;%PATH%"
"%~dp0.local-tools\node_modules\node\bin\node.exe" "%~dp0.local-tools\node_modules\pnpm\bin\pnpm.cjs" %*
exit /b %errorlevel%
