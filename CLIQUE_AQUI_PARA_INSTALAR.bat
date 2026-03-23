@echo off
setlocal enabledelayedexpansion
title DentCare Elite V32 - Instalador de Elite para Windows 11

echo.
echo  ================================================================
echo   DENTCARE ELITE V32 - Orquestrador de Elite
echo  ================================================================
echo.
echo  A preparar o ambiente de instalacao resiliente...
echo.

REM Salvar o caminho do script
set "SCRIPT_PATH=%~dp0"
cd /d "%SCRIPT_PATH%"

REM Verificar se o PowerShell existe
where powershell >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] PowerShell nao encontrado no sistema.
    echo Por favor, instale o PowerShell para continuar.
    pause
    exit /b 1
)

REM Chamar o Orquestrador PowerShell com privilegios de Administrador
echo  A elevar privilegios e a iniciar Orquestrador de Elite...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_PATH%INSTALLER_ORCHESTRATOR.ps1"

if %errorlevel% neq 0 (
    echo.
    echo  [ERRO] O instalador falhou com o codigo: %errorlevel%
    echo  Consulte o ficheiro dentcare_install.log para detalhes.
    echo.
    pause
)

endlocal
exit /b 0
