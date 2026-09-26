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
ssh -i "$CHAVE" "$SERVIDOR" 'su - nodri -c "cd ~/nodri-novo && npm ci --no-audit --no-fund >/dev/null 2>&1 \
  && NODE_OPTIONS=--max-old-space-size=2560 npm run build 2>&1 | tail -3 \
  && pm2 restart nodri --update-env >/dev/null && echo NODRI reiniciado"'
sleep 6
curl -s -o /dev/null -w "site: %{http_code}\n" https://www.nodri.com.br/api/health
