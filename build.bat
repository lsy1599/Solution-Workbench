@echo off
setlocal enabledelayedexpansion

echo ============================================
echo   VSCODE-SOLUTION VSIX Build Script
echo ============================================
echo.

REM Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    exit /b 1
)
echo [OK] Node.js found: 
node --version

REM Check npm
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed or not in PATH.
    exit /b 1
)
echo [OK] npm found:
call npm --version

echo.
echo [STEP 1/4] Auto-incrementing patch version...
echo ----------------------------------------
for /f "usebackq delims=" %%V in (`node -e "console.log(require('./package.json').version)"`) do set "raw=%%V"
if "!raw!"=="" (
    echo [ERROR] Failed to read version from package.json.
    exit /b 1
)
for /f "tokens=1,2,3 delims=." %%x in ("!raw!") do (
    set "major=%%x"
    set "minor=%%y"
    set "patch=%%z"
)
set /a "patch=!patch!+1"
set "newver=!major!.!minor!.!patch!"
echo [OK] Version: !raw! -^> !newver!
call node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));p.version='!newver!';fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n');"
if %errorlevel% neq 0 (
    echo [ERROR] Version increment failed.
    exit /b 1
)

echo.
echo [STEP 2/4] Installing dependencies...
echo ----------------------------------------
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed.
    exit /b 1
)
echo [OK] Dependencies installed.

echo.
echo [STEP 3/4] Packaging VSIX (includes compilation via prepublish)...
echo ----------------------------------------
call npx vsce package --no-dependencies --allow-star-activation
if %errorlevel% neq 0 (
    echo [ERROR] VSIX packaging failed.
    exit /b 1
)
echo [OK] VSIX package created.

echo.
echo [STEP 4/4] Moving VSIX to vsix directory...
echo ----------------------------------------
if not exist "vsix" mkdir vsix
set "found="
for %%f in (*.vsix) do (
    move /Y "%%f" "vsix\%%f" >nul
    echo [OK] Generated: vsix\%%f
    set "found=1"
)
if not defined found (
    echo [ERROR] No .vsix file found after packaging.
    exit /b 1
)

echo.
echo ============================================
echo   Build completed successfully. v!newver!
echo ============================================
endlocal
exit /b 0
