@echo off
rem Auto‑commit enhanced wrapper for Windows
rem Calls the PowerShell enhanced script

set "SCRIPT_DIR=%~dp0"
powershell -ExecutionPolicy Bypass -File "%SCRIPT_DIR%auto-commit-enhanced.ps1"
