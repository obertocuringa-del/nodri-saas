#!/usr/bin/env bash
# Publica o NODRI no servidor (Hostinger, 2.25.250.201) -- desde 26/09/2026 o
# site NÃO está mais na Vercel. Leva o código do commit atual (HEAD), monta e
# reinicia. O .env.production.local do servidor não é tocado.
#
# Uso (na pasta nodri-repo, com tudo commitado):  bash scripts/publicar-servidor.sh
set -e
SERVIDOR="root@2.25.250.201"
CHAVE="$HOME/.ssh/nodri_servidor"
cd "$(dirname "$0")/.."
[ -z "$(git status --porcelain -- src public package.json package-lock.json next.config.mjs)" ] \
  || { echo "Há mudança não commitada em src/public/config -- commite antes."; exit 1; }
echo "Publicando $(git log --oneline -1)"
# UMA conexão só (30/09/2026). Eram três seguidas -- enviar, montar, agendar
# -- e no mesmo dia o servidor parou de responder para a internet do PC
# enquanto seguia no ar para o resto. Menos conexões, menos cara de ataque.
#
# O pacote entra pela entrada padrão (o tar consome tudo) e o resto roda na
# sequência, no mesmo acesso.
#
# Se a montagem falhar, mostra as últimas linhas do erro e reinicia assim
# mesmo (o pm2 precisa voltar a rodar alguma coisa), avisando em letras claras.
#
# Tarefas diárias que a Vercel chamava (licenças, testes grátis, lembrete de
# PIX, bloqueios e limpeza de compras) ficam num arquivo PRÓPRIO
# (/etc/cron.d/nodri-diarias), sem tocar no /etc/cron.d/nodri que já existe.
# Refeito a cada publicação. A chave sai do .env do servidor e nunca passa
# por aqui.
REMOTO=$(cat <<'FIM'
rm -rf /home/nodri/nodri-novo/src /home/nodri/nodri-novo/public \
  && tar -xf - -C /home/nodri/nodri-novo && chown -R nodri:nodri /home/nodri/nodri-novo \
  || { echo "ERRO ao copiar os arquivos para o servidor"; exit 1; }
su - nodri -c 'cd ~/nodri-novo \
  && (npm ci --no-audit --no-fund > /tmp/nodri-npm.log 2>&1 || { echo; echo ERRO AO INSTALAR PACOTES:; tail -20 /tmp/nodri-npm.log; }) \
  && if NODE_OPTIONS=--max-old-space-size=2560 npm run build > /tmp/nodri-build.log 2>&1; then tail -3 /tmp/nodri-build.log; \
     else echo; echo ======== ERRO NA MONTAGEM ========; tail -40 /tmp/nodri-build.log; echo ==================================; fi; \
  pm2 restart nodri --update-env >/dev/null && echo NODRI reiniciado; free -m | head -2'
SEG=$(grep -E "^CRON_SECRET=" /home/nodri/nodri-novo/.env.production.local | head -1 | cut -d= -f2- | tr -d "\"'\r")
if [ -n "$SEG" ]; then
  { echo "# NODRI -- tarefas diárias (gerado por scripts/publicar-servidor.sh)"
    echo "SHELL=/bin/sh"
    for t in "0 8 check-licencas" "0 9 check-trials" "0 10 lembretes-pix" "0 3 reprocessar-bloqueios" "0 4 limpar-compras"; do
      set -- $t; echo "$1 $2 * * * root curl -s -m 110 -H \"Authorization: Bearer $SEG\" https://www.nodri.com.br/api/cron/$3 >/dev/null 2>&1"
    done; } > /etc/cron.d/nodri-diarias && chmod 644 /etc/cron.d/nodri-diarias && echo "tarefas diárias agendadas"
else
  echo "AVISO: CRON_SECRET não achado no servidor -- tarefas diárias não agendadas"
fi
FIM
)
git archive HEAD src public package.json package-lock.json next.config.mjs tsconfig.json \
    tailwind.config.js postcss.config.js \
  | ssh -o ConnectTimeout=20 -i "$CHAVE" "$SERVIDOR" "$REMOTO"
sleep 10
curl -s -o /dev/null -w "site: %{http_code}\n" https://www.nodri.com.br/api/health
