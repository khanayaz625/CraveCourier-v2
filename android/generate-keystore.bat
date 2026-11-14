@echo off
REM ============================================================================
REM Crave Android Release Keystore Generator (Windows)
REM Generates a 2048-bit RSA production keystore and prints SHA-256 fingerprint
REM ============================================================================

set KEYSTORE_FILE=crave-release-key.keystore
set KEY_ALIAS=crave-key
set VALIDITY_DAYS=10000

echo ========================================================
echo   Crave Food ^& Grocery - Release Keystore Generator
echo ========================================================
echo.

if exist "%KEYSTORE_FILE%" (
    echo [WARNING] Keystore file "%KEYSTORE_FILE%" already exists!
    echo To avoid overwriting existing signing keys, rename or delete it first.
    goto print_fingerprint
)

echo Generating production keystore: %KEYSTORE_FILE%
echo You will be prompted to enter a Keystore Password and Certificate Details.
echo [IMPORTANT] Please record this password safely!
echo.

keytool -genkey -v ^
  -keystore %KEYSTORE_FILE% ^
  -alias %KEY_ALIAS% ^
  -keyalg RSA ^
  -keysize 2048 ^
  -validity %VALIDITY_DAYS%

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Keystore generation failed. Ensure JDK 17+ is installed and keytool is in your PATH.
    exit /b %ERRORLEVEL%
)

echo.
echo [SUCCESS] Keystore generated successfully: %KEYSTORE_FILE%
echo.

:print_fingerprint
echo ========================================================
echo   Extracting SHA-256 Fingerprint for Digital Asset Links
echo ========================================================
echo Enter the keystore password when prompted:
echo.

keytool -list -v -keystore %KEYSTORE_FILE% -alias %KEY_ALIAS% | findstr "SHA256:"

echo.
echo --------------------------------------------------------
echo Copy the SHA256 string above and paste it into:
echo   client/public/.well-known/assetlinks.json
echo --------------------------------------------------------
echo.
pause

