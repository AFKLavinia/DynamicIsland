@echo off
title Dynamic Island (Rust Engine)
cd /d "%~dp0tauri-island\src-tauri"

taskkill /f /im tauri-island.exe >nul 2>&1
timeout /t 1 /nobreak >nul

set "CARGO_BIN=%USERPROFILE%\.cargo\bin\cargo.exe"
if exist "%CARGO_BIN%" (
    echo [1/2] Guncel degisiklikler derleniyor...
    "%CARGO_BIN%" build --quiet
)

echo [2/2] Dynamic Island baslatiliyor...
start "" "target\debug\tauri-island.exe"
