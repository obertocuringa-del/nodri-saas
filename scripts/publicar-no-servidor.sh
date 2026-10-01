#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# PUBLICAR, RODANDO DENTRO DO SERVIDOR
#
# O `publicar-servidor.sh` empacota o código do PC e empurra por SSH. Isso
# amarra a atualização do salão a uma máquina que vive desligada, e foi o que
# o dono pediu para acabar em 01/10/2026: "não quero que fique no meu
# computador, quero fazer tudo direto no servidor, igual era antes".
#
# Aqui o servidor se atualiza sozinho: puxa do GitHub (o repositório é
# público, não precisa de senha), monta e reinicia. Dá para chamar de
# qualquer lugar -- por SSH, por um botão da Central do servidor, ou pelo
# console da Hostinger:
#
#     /usr/local/bin/nodri-publicar.sh
#
# O que ele NUNCA toca: `.env.production.local` (está no .gitignore, então o
# `git reset` não encosta) e a pasta da extensão do Avec, que tem o próprio
# ritmo de atualização (ver extensao-avec/ONDE-ISSO-RODA.md).
# ─────────────────────────────────────────────────────────────────────────────
set -u

PASTA=/home/nodri/nodri-novo
REPO=https://github.com/obertocuringa-del/nodri-saas.git
LOG=/var/log/nodri-publicar.log

diz() { echo "$(date '+%d/%m %H:%M') $*" | tee -a "$LOG"; }

# ── Uma por vez ──────────────────────────────────────────────────────────────
# Duas publicações ao mesmo tempo foi o que quebrou o node_modules em
# 01/10/2026 e deixou o site fora do ar: um `npm ci` apagando o que o outro
# estava escrevendo, erro "ENOTEMPTY", e o `next` sumiu da pasta.
exec 9>/var/lock/nodri-publicar.lock
if ! flock -n 9; then
  diz "JÁ TEM UMA PUBLICAÇÃO RODANDO -- não comecei outra."
  exit 1
fi

cd "$PASTA" || { diz "ERRO: não achei $PASTA"; exit 1; }

# O git recusa mexer num repositório de outro dono ("dubious ownership"): a
# pasta é do nodri e quem publica é o root. Autoriza uma vez, sem drama.
git config --global --add safe.directory "$PASTA" 2>/dev/null || true

# ── O vigia fica quieto durante a publicação ────────────────────────────────
# Senão ele vê o site fora do ar no meio da montagem e reinicia tudo.
touch /var/tmp/nodri-publicando
limpar() { rm -f /var/tmp/nodri-publicando; }
trap limpar EXIT

# ── 1. Puxar o código ────────────────────────────────────────────────────────
if [ ! -d .git ]; then
  diz "[1/4] primeira vez: ligando esta pasta ao GitHub"
  git init -q
  git remote add origin "$REPO"
fi
git remote set-url origin "$REPO"
diz "[1/4] puxando do GitHub"
if ! git fetch -q --depth 1 origin main 2>>"$LOG"; then
  diz "ERRO: não consegui falar com o GitHub. Nada foi mudado."
  exit 1
fi
ANTES=$(git rev-parse --short HEAD 2>/dev/null || echo nenhum)
git reset -q --hard origin/main || { diz "ERRO ao trocar o código"; exit 1; }
AGORA=$(git rev-parse --short HEAD)
diz "      $ANTES -> $AGORA  $(git log -1 --pretty=%s)"

# ── 2. Pacotes ───────────────────────────────────────────────────────────────
diz "[2/4] conferindo os pacotes"
if ! su nodri -c "cd $PASTA && npm ci --no-audit --no-fund" > /tmp/nodri-npm.log 2>&1; then
  diz "      npm ci falhou -- refazendo node_modules do zero"
  rm -rf "$PASTA/node_modules"
  if ! su nodri -c "cd $PASTA && npm ci --no-audit --no-fund" > /tmp/nodri-npm.log 2>&1; then
    diz "ERRO ao instalar os pacotes:"; tail -15 /tmp/nodri-npm.log | tee -a "$LOG"
    exit 1
  fi
fi
# A prova de que deu certo não é o código de saída: é o `next` estar lá. Em
# 01/10/2026 o npm devolveu sucesso com a pasta pela metade e o site caiu.
if [ ! -x "$PASTA/node_modules/.bin/next" ]; then
  diz "      o next não está lá -- refazendo node_modules do zero"
  rm -rf "$PASTA/node_modules"
  su nodri -c "cd $PASTA && npm ci --no-audit --no-fund" > /tmp/nodri-npm.log 2>&1
  [ -x "$PASTA/node_modules/.bin/next" ] || { diz "ERRO: o next continua faltando. Site NÃO foi reiniciado."; exit 1; }
fi

# ── 3. Montar ────────────────────────────────────────────────────────────────
diz "[3/4] montando (leva uns 8 minutos)"
if su nodri -c "cd $PASTA && NODE_OPTIONS=--max-old-space-size=2560 npm run build" > /tmp/nodri-build.log 2>&1; then
  diz "      montou"
else
  diz "ERRO NA MONTAGEM -- o site NÃO foi reiniciado, continua no ar com a versão anterior:"
  tail -25 /tmp/nodri-build.log | tee -a "$LOG"
  exit 1
fi
# Montagem que não deixou o manifesto é montagem pela metade: reiniciar aqui
# põe o site num laço de reinício (foi o que aconteceu, 4.085 vezes).
[ -f "$PASTA/.next/prerender-manifest.json" ] || { diz "ERRO: a montagem ficou pela metade. Site NÃO reiniciado."; exit 1; }

# ── 4. Reiniciar e conferir ──────────────────────────────────────────────────
diz "[4/4] reiniciando"
su nodri -c "pm2 restart nodri --update-env" >/dev/null 2>&1
for i in $(seq 1 20); do
  COD=$(curl -s -o /dev/null -m 10 -w '%{http_code}' http://127.0.0.1:3000/ || echo 000)
  [ "$COD" = "200" ] && break
  sleep 3
done
diz "      site respondeu $COD"

# Tarefas diárias e vigia, do jeito que o publicar antigo fazia.
if [ -f "$PASTA/scripts/vigia-servidor.sh" ]; then
  tr -d '\r' < "$PASTA/scripts/vigia-servidor.sh" > /usr/local/bin/nodri-vigia.sh
  chmod 755 /usr/local/bin/nodri-vigia.sh
  printf '# NODRI -- vigia\nSHELL=/bin/bash\n* * * * * root /usr/local/bin/nodri-vigia.sh\n' > /etc/cron.d/nodri-vigia
  chmod 644 /etc/cron.d/nodri-vigia
  diz "      vigia reinstalado"
fi
tr -d '\r' < "$PASTA/scripts/publicar-no-servidor.sh" > /usr/local/bin/nodri-publicar.sh.novo \
  && chmod 755 /usr/local/bin/nodri-publicar.sh.novo \
  && mv /usr/local/bin/nodri-publicar.sh.novo /usr/local/bin/nodri-publicar.sh \
  && diz "      publicador atualizado"

[ "$COD" = "200" ] && diz "PRONTO: $AGORA no ar." || diz "ATENÇÃO: o site respondeu $COD. Veja /tmp/nodri-build.log"
