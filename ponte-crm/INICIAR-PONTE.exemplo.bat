@echo off
REM ============================================================
REM  PONTE CRM NODRI
REM  Deixe esta janela ABERTA. Enquanto ela estiver aberta, o
REM  WhatsApp do salao fica conectado ao CRM. Se fechar, o CRM
REM  para de receber mensagem (o historico nao se perde).
REM ============================================================
title Ponte CRM NODRI - NAO FECHE ESTA JANELA
cd /d "%~dp0"

REM -- Trava: duas pontes no mesmo WhatsApp derrubam a sessao e
REM -- obrigam a escanear o QR de novo. Se ja tem uma rodando,
REM -- esta aqui sai sem fazer nada.
REM -- O node e chamado com o CAMINHO COMPLETO logo abaixo justamente
REM -- para esta busca achar: "node index.js" sozinho nao diz de qual
REM -- pasta veio, e a trava nunca pegaria.
powershell -NoProfile -Command "if (Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -like '*ponte-crm*' }) { exit 1 } else { exit 0 }"
if errorlevel 1 (
  echo.
  echo  A ponte JA ESTA RODANDO em outra janela.
  echo  Nao abri uma segunda: duas ao mesmo tempo derrubam a conexao.
  echo.
  timeout /t 10 /nobreak >nul
  exit /b
)

set CRM_PONTE_CHAVE=COLE-AQUI-A-MESMA-CHAVE-DO-VERCEL
set NODRI_URL=https://www.nodri.com.br

if not exist node_modules (
  echo Instalando dependencias pela primeira vez...
  call npm install
)

:laco
echo.
echo === Ponte ligando em %date% %time% ===
REM -- Sai na janela E grava em arquivo. Rodando sozinha com o Windows, a
REM -- janela fica minimizada e ninguem le: sem arquivo, quando algo da
REM -- errado nao ha o que olhar.
powershell -NoProfile -ExecutionPolicy Bypass -Command "& node '%~dp0index.js' 2>&1 | Tee-Object -FilePath '%~dp0ponte.log' -Append"
echo.
echo A ponte parou. Reabrindo em 5 segundos... (feche a janela para encerrar)
timeout /t 5 /nobreak >nul
goto laco
