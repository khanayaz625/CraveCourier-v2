@echo off
REM ============================================================================
REM Crave Trusted Web Activity (TWA) Builder (Windows)
REM Uses Google's @bubblewrap/cli to build the signed Android App Bundle (.aab)
REM ============================================================================

echo ========================================================
echo   Crave TWA Android App Bundle Builder
echo ========================================================
echo.

REM Verify Node.js
where npx >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npx is not installed or not in PATH. Please install Node.js.
    exit /b 1
)

REM Check if twa-manifest.json exists
if not exist "twa-manifest.json" (
    echo [ERROR] twa-manifest.json not found in current directory.
    echo Please make sure you run this script inside the Crave android/ directory.
    exit /b 1
)

REM Check if keystore exists
if not exist "crave-release-key.keystore" (
    echo [NOTICE] crave-release-key.keystore not found.
    echo Running generate-keystore.bat first...
    call generate-keystore.bat
)

echo.
echo Running Bubblewrap build...
echo If this is your first run, Bubblewrap will download Android SDK / Command Line Tools automatically.
echo.

npx @bubblewrap/cli build

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo [SUCCESS] Android App Bundle (.aab) built successfully!
    echo Look for: app-release-bundle.aab in the android directory.
    echo You can now upload this file to the Google Play Console!
    echo ========================================================
) else (
    echo.
    echo [ERROR] Bubblewrap build encountered an error. Check logs above.
)

pause

