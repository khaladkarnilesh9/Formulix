@echo off
setlocal
rem Use the installed npm CLI when the system npm.cmd launcher is missing.
set "NODE_DIR=%ProgramFiles%\nodejs"
if exist "%NODE_DIR%\node.exe" if exist "%NODE_DIR%\node_modules\npm\bin\npm-cli.js" goto run
echo Node.js or npm was not found in "%NODE_DIR%". Repair your Node.js installation. 1>&2
exit /b 1
:run
set "PATH=%NODE_DIR%;%PATH%"
"%NODE_DIR%\node.exe" "%NODE_DIR%\node_modules\npm\bin\npm-cli.js" %*
exit /b %errorlevel%
