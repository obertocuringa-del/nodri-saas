@echo off
REM ============================================================
REM  INSTALAR A PONTE CRM NODRI NUM COMPUTADOR NOVO
REM
REM  Rode este arquivo DEPOIS de copiar a pasta nodri-repo inteira
REM  para o computador novo (a pasta ponte-crm\sessoes\ tem que vir
REM  junto, senao vai pedir o QR de novo).
REM
REM  O que ele faz, nesta ordem:
REM   1. confere se o Node.js esta instalado
REM   2. instala as dependencias da ponte (npm install)
REM   3. ajusta a energia: nunca dormir, tampa nao faz nada,
REM      Wi-Fi em desempenho maximo (foi isso que derrubou o CRM
REM      em 15/09 e 18/09/2026)
REM   4. poe a ponte para iniciar junto com o Windows
REM   5. liga a ponte
REM
REM  IMPORTANTE: a ponte do computador VELHO tem que estar FECHADA
REM  antes de rodar isto. Duas pontes no mesmo WhatsApp derrubam a
REM  sessao e obrigam a escanear o QR de novo.
REM ============================================================
title Instalar Ponte CRM NODRI
cd /d "%~dp0"

echo.
echo === 1/5  Node.js ===
where node >nul 2>&1
if errorlevel 1 (
  echo   Node.js NAO encontrado. Instale em https://nodejs.org (versao LTS)
  echo   e rode este arquivo de novo.
  pause
  exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do echo   Node %%v ok

echo.
echo === 2/5  Dependencias da ponte ===
if not exist node_modules (
  call npm install --omit=dev
) else (
  echo   ja instaladas
)

echo.
echo === 3/5  Sessao do WhatsApp ===
if exist "sessoes\b0902527-1199-4b4c-ba3b-eecb51bc61c6\creds.json" (
  echo   sessao encontrada: NAO vai pedir QR
) else (
  echo   ATENCAO: pasta sessoes\ nao veio na copia. O CRM vai pedir o QR.
)
if not exist "INICIAR-PONTE.bat" (
  echo   ATENCAO: INICIAR-PONTE.bat nao veio na copia. Crie a partir do
  echo   INICIAR-PONTE.exemplo.bat com a mesma CRM_PONTE_CHAVE do antigo.
  pause
  exit /b 1
)

echo.
echo === 4/5  Energia do Windows ===
powercfg /change standby-timeout-ac 0
powercfg /change standby-timeout-dc 0
powercfg /change hibernate-timeout-ac 0
powercfg /change hibernate-timeout-dc 0
powercfg /setacvalueindex SCHEME_CURRENT SUB_BUTTONS LIDACTION 0
powercfg /setdcvalueindex SCHEME_CURRENT SUB_BUTTONS LIDACTION 0
powercfg /setacvalueindex SCHEME_CURRENT 19cbb8fa-5279-450e-9fac-8a3d5fedd0c1 12bbebe6-58d6-4636-95bb-3217ef867c1a 0
powercfg /setdcvalueindex SCHEME_CURRENT 19cbb8fa-5279-450e-9fac-8a3d5fedd0c1 12bbebe6-58d6-4636-95bb-3217ef867c1a 0
powercfg /setactive SCHEME_CURRENT
echo   nunca dormir, tampa nao faz nada, Wi-Fi em desempenho maximo

echo.
echo === 5/5  Iniciar junto com o Windows ===
set ATALHO=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Ponte CRM NODRI.lnk
powershell -NoProfile -Command "$w = New-Object -ComObject WScript.Shell; $a = $w.CreateShortcut('%ATALHO%'); $a.TargetPath = '%~dp0INICIAR-PONTE.bat'; $a.WorkingDirectory = '%~dp0'; $a.WindowStyle = 7; $a.Save()"
if exist "%ATALHO%" (echo   atalho criado no Inicializar) else (echo   nao consegui criar o atalho -- crie na mao: Win+R, shell:startup)

echo.
echo === Pronto. Ligando a ponte... ===
echo   (esta janela pode fechar; a ponte abre na janela dela)
start "" "%~dp0INICIAR-PONTE.bat"
echo.
echo Depois disto:
echo   - abra o CRM no NODRI: tem que mostrar "Conectado"
echo   - Chrome: chrome://extensions ^> Modo do desenvolvedor ^> Carregar sem
echo     compactacao ^> pasta extensao-feedback-avec (versao 1.3.1 ou mais nova)
echo   - Opcoes da extensao: colar a chave (NODRI ^> CRM ^> Configurar) e
echo     digitar e-mail e senha do Avec ^> Salvar ^> Rodar um ciclo agora
echo.
pause
