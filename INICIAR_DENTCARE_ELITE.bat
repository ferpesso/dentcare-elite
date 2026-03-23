@echo off
setlocal enabledelayedexpansion
title DentCare Elite V32 - Servidor

echo.
echo  ================================================================
echo   DENTCARE ELITE V32 - Iniciar Servidor
echo  ================================================================
echo.
echo  A verificar dependencias...
echo.

REM Salvar o caminho do script
set "SCRIPT_PATH=%~dp0"
cd /d "%SCRIPT_PATH%"

REM Verificar Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado. Por favor, execute o instalador primeiro.
    pause
    exit /b 1
)

REM Verificar PNPM
where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] PNPM nao encontrado. Por favor, execute o instalador primeiro.
    pause
    exit /b 1
)

REM Verificar .env
if not exist ".env" (
    echo [ERRO] Ficheiro .env nao encontrado. Por favor, execute o instalador primeiro.
    pause
    exit /b 1
)

echo  [ OK ] Dependencias confirmadas.
echo  [....] A iniciar o servidor DentCare Elite...
echo.
echo  URL: http://localhost:3000
echo.

REM Iniciar servidor
call pnpm run start

if %errorlevel% neq 0 (
    echo.
    echo  [ERRO] O servidor falhou ao iniciar.
    echo.
    pause
)

endlocal
exit /b 0
