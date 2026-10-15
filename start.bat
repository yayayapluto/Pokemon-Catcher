@echo off
cd /d "%~dp0"

where bun >nul 2>nul
if errorlevel 1 (
  echo Bun tidak ditemukan. Pasang dulu: https://bun.sh
  pause
  exit /b 1
)

if not exist node_modules (
  call bun install
)

call bun run src/main.ts %*
