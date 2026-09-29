@echo off
REM ============================================================
REM  PUBLICAR O NODRI NO SERVIDOR - basta dar dois cliques.
REM  1) acha a pasta nodri-repo  2) puxa as novidades do GitHub
REM  3) roda scripts/publicar-servidor.sh (a chave SSH fica neste PC)
REM ============================================================
title Publicar NODRI
setlocal

set "BASH=C:\Program Files\Git\bin\bash.exe"
if not exist "%BASH%" set "BASH=C:\Program Files (x86)\Git\bin\bash.exe"
if not exist "%BASH%" (
  echo.
  echo  ERRO: nao achei o Git Bash neste computador.
  echo  Mande uma foto desta tela para o Claude.
  goto fim
)

REM Procura a pasta do NODRI: primeiro onde este arquivo esta, depois os lugares comuns.
set "PASTA="
if exist "%~dp0scripts\publicar-servidor.sh" set "PASTA=%~dp0"
for %%P in ("%USERPROFILE%\Desktop\nodri-repo" "%USERPROFILE%\OneDrive\Desktop\nodri-repo" "%USERPROFILE%\OneDrive\Area de Trabalho\nodri-repo" "%USERPROFILE%\nodri-repo" "%USERPROFILE%\Documents\nodri-repo" "%USERPROFILE%\Documentos\nodri-repo" "C:\nodri-repo" "D:\nodri-repo") do (
  if not defined PASTA if exist "%%~P\scripts\publicar-servidor.sh" set "PASTA=%%~P"
)
if not defined PASTA (
  echo.
  echo  ERRO: nao achei a pasta nodri-repo.
  echo  Coloque este arquivo DENTRO da pasta nodri-repo e de dois cliques de novo.
  goto fim
)

echo.
echo  Pasta do NODRI: %PASTA%
echo.
echo  [1/2] Puxando as novidades do GitHub...
cd /d "%PASTA%"
set CHERE_INVOKING=1
"%BASH%" -c "git pull"
if errorlevel 1 (
  echo.
  echo  ERRO ao puxar do GitHub. Mande uma foto desta tela para o Claude.
  goto fim
)

echo.
echo  [2/2] Publicando no servidor. Leva uns 5 minutos, NAO feche esta janela...
echo.
set CHERE_INVOKING=1
"%BASH%" scripts/publicar-servidor.sh

echo.
echo  ============================================================
echo   Se apareceu "site: 200" logo acima, deu certo.
echo   Abra o site e aperte Ctrl + F5.
echo   Se apareceu outra coisa, mande uma foto desta tela para o Claude.
echo  ============================================================

:fim
echo.
pause
