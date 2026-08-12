@echo off
REM Set up Webtoapp from a source checkout. Requires Node.js 20 or newer.
REM Usage: install.bat [--global^|--portable]
setlocal EnableExtensions
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto :missing_node
where npm >nul 2>nul
if errorlevel 1 goto :missing_node

node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)"
if errorlevel 1 goto :old_node

echo Installing Webtoapp dependencies...
REM The CLI and TypeScript build do not need Electron's platform binary yet.
call npm ci --ignore-scripts
if errorlevel 1 goto :failed
call npm run build
if errorlevel 1 goto :failed

if "%~1"=="" goto :local
if /I "%~1"=="--global" goto :global
if /I "%~1"=="--portable" goto :portable

echo Unknown option: %~1
echo Usage: install.bat [--global^|--portable]
exit /b 2

:local
echo.
echo Webtoapp is ready. Try: npm run cli -- --help
exit /b 0

:global
call npm install --global "%CD%"
if errorlevel 1 goto :failed
echo.
echo Installed the webtoapp command. Try: webtoapp --help
exit /b 0

:portable
call npm run portable:win
if errorlevel 1 goto :failed
echo.
echo Created a portable Windows .exe in the release folder.
exit /b 0

:missing_node
echo Webtoapp requires Node.js 20+ and npm. Install Node from https://nodejs.org/ then try again.
exit /b 1

:old_node
echo Webtoapp requires Node.js 20 or newer.
exit /b 1

:failed
echo Installation failed. Review the output above.
exit /b 1
