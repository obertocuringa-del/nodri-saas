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
git archive HEAD src public package.json package-lock.json next.config.mjs tsconfig.json \
    tailwind.config.js postcss.config.js \
  | ssh -i "$CHAVE" "$SERVIDOR" 'rm -rf /home/nodri/nodri-novo/src /home/nodri/nodri-novo/public \
      && tar -xf - -C /home/nodri/nodri-novo && chown -R nodri:nodri /home/nodri/nodri-novo'
# Antes o "| tail -3" escondia o erro da montagem: o pm2 reiniciava mesmo com
# a montagem quebrada e o site ficava em 502 sem dizer por quê. Agora, se a
# montagem falhar, mostra as últimas linhas do erro e reinicia assim mesmo
# (o pm2 precisa voltar a rodar alguma coisa), avisando em letras claras.
ssh -i "$CHAVE" "$SERVIDOR" 'su - nodri -c "cd ~/nodri-novo \
  && (npm ci --no-audit --no-fund > /tmp/nodri-npm.log 2>&1 || { echo; echo ERRO AO INSTALAR PACOTES:; tail -20 /tmp/nodri-npm.log; }) \
  && if NODE_OPTIONS=--max-old-space-size=2560 npm run build > /tmp/nodri-build.log 2>&1; then tail -3 /tmp/nodri-build.log; \
     else echo; echo ======== ERRO NA MONTAGEM ========; tail -40 /tmp/nodri-build.log; echo ==================================; fi; \
  pm2 restart nodri --update-env >/dev/null && echo NODRI reiniciado; free -m | head -2"'
sleep 10
curl -s -o /dev/null -w "site: %{http_code}\n" https://www.nodri.com.br/api/health
