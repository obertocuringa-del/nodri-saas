@echo off
REM ============================================================
REM  ATUALIZAR A PONTE CRM NODRI (sem copiar pasta, sem git)
REM
REM  Baixa o index.js mais novo direto do GitHub, guarda o antigo
REM  como index.js.anterior, fecha a ponte que estiver rodando e
REM  liga de novo. A sessao do WhatsApp (pasta sessoes\) nao e
REM  tocada: nao pede QR.
REM
REM  Criado em 21/09/2026: ate aqui, atualizar a ponte no PC do
REM  salao exigia copiar a pasta inteira de novo.
REM ============================================================
title Atualizar Ponte CRM NODRI
cd /d "%~dp0"

set URL=https://raw.githubusercontent.com/obertocuringa-del/nodri-saas/main/ponte-crm/index.js

echo.
echo === 1/3  Baixando a versao nova ===
curl -sSL -o index.js.novo "%URL%"
if errorlevel 1 (
  echo   NAO consegui baixar. Confira a internet e rode de novo.
  pause
  exit /b 1
)
for %%A in (index.js.novo) do if %%~zA LSS 10000 (
  echo   O arquivo baixado veio pequeno demais; nao vou trocar nada.
  del index.js.novo
  pause
  exit /b 1
)

echo === 2/3  Fechando a ponte que esta rodando ===
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -like '*ponte-crm*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"
timeout /t 3 /nobreak >nul

if exist index.js.anterior del index.js.anterior
if exist index.js ren index.js index.js.anterior
ren index.js.novo index.js

echo === 3/3  Ligando a ponte nova ===
if exist INICIAR-PONTE.cmd (
  start "" "INICIAR-PONTE.cmd"
) else (
  start "" "INICIAR-PONTE.bat"
)
echo.
echo   Pronto. A janela da ponte deve mostrar "Conectado" em ate 1 minuto.
echo   Se algo der errado: renomeie index.js.anterior para index.js e ligue de novo.
echo.
pause
