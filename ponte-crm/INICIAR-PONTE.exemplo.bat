@echo off
REM ============================================================
REM  PONTE CRM NODRI
REM  Deixe esta janela ABERTA. Enquanto ela estiver aberta, o
REM  WhatsApp do salao fica conectado ao CRM. Se fechar, o CRM
REM  para de receber mensagem (o historico nao se perde).
REM ============================================================
title Ponte CRM NODRI - NAO FECHE ESTA JANELA
cd /d "%~dp0"

set CRM_PONTE_CHAVE=COLE-AQUI-A-MESMA-CHAVE-DO-VERCEL
set NODRI_URL=https://www.nodri.com.br

if not exist node_modules (
  echo Instalando dependencias pela primeira vez...
  call npm install
)

:laco
echo.
echo === Ponte ligando em %date% %time% ===
node index.js
echo.
echo A ponte parou. Reabrindo em 5 segundos... (feche a janela para encerrar)
timeout /t 5 /nobreak >nul
goto laco
