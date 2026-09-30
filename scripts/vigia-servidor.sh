#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# VIGIA DO SERVIDOR NODRI -- roda a cada 5 minutos (/etc/cron.d/nodri-vigia),
# instalado pelo scripts/publicar-servidor.sh em /usr/local/bin/nodri-vigia.sh.
#
# 30/09/2026: o servidor caiu, voltou, e o robô do Avec ficou o dia inteiro
# "ligado" sem ler o Avec -- sem aviso ao profissional, sem confirmação, sem
# feedback. Ninguém percebeu até a noite. Este vigia:
#   1) o site não responde 3 vezes seguidas (15 min) -> religa o nodri e o nginx;
#   2) pergunta ao NODRI (/api/cron/saude) o que está parado e religa:
#        robo  -> pm2 "robo-avec"      (robô do Avec)
#        ponte -> pm2 que começa com "ponte" (WhatsApp)
#      Os limites (1 vez a cada 20 min, 8 por dia) quem guarda é o NODRI.
# Tudo o que ele faz fica em /var/log/nodri-vigia.log.
# ─────────────────────────────────────────────────────────────────────────────

LOG=/var/log/nodri-vigia.log
ENVF=/home/nodri/nodri-novo/.env.production.local
SITE=https://www.nodri.com.br
CONT=/var/tmp/nodri-vigia-site

log() { echo "$(date '+%d/%m %H:%M') $*" >> "$LOG"; }
# Log curto: passou de 1 MB, fica só o fim.
[ -f "$LOG" ] && [ "$(stat -c %s "$LOG" 2>/dev/null || echo 0)" -gt 1048576 ] && tail -n 2000 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"

# Religa todo processo do pm2 cujo nome casa com o padrão -- procura no pm2
# do usuário nodri e no do root, porque cada serviço foi instalado por um.
reiniciar() {
  local padrao="$1" achou=0 u lista nomes n
  for u in nodri root; do
    if [ "$u" = root ]; then lista=$(pm2 jlist 2>/dev/null)
    else lista=$(su - nodri -c "pm2 jlist" 2>/dev/null); fi
    nomes=$(echo "$lista" | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | grep -E "$padrao" | sort -u)
    for n in $nomes; do
      if [ "$u" = root ]; then pm2 restart "$n" >/dev/null 2>&1
      else su - nodri -c "pm2 restart '$n'" >/dev/null 2>&1; fi
      log "religou $n (pm2 do $u)"
      achou=1
    done
  done
  [ "$achou" = 1 ] || log "não achou no pm2 nenhum processo '$padrao'"
}

# 1) O site
cod=$(curl -s -o /dev/null -m 20 -w '%{http_code}' "$SITE/api/health")
if [ "$cod" != "200" ]; then
  n=$(( $(cat "$CONT" 2>/dev/null || echo 0) + 1 ))
  echo "$n" > "$CONT"
  log "site respondeu $cod ($n seguidas)"
  if [ "$n" -ge 3 ]; then
    systemctl is-active --quiet nginx || { systemctl restart nginx; log "religou o nginx"; }
    reiniciar '^nodri$'
    echo 0 > "$CONT"
  fi
  exit 0
fi
echo 0 > "$CONT"

# 2) Robô do Avec e ponte do WhatsApp
SEG=$(grep -E '^CRON_SECRET=' "$ENVF" 2>/dev/null | head -1 | cut -d= -f2- | tr -d "\"'\r")
[ -n "$SEG" ] || { log "sem CRON_SECRET em $ENVF"; exit 0; }
resp=$(curl -s -m 60 -H "Authorization: Bearer $SEG" "$SITE/api/cron/saude")
linha=$(echo "$resp" | grep '^REINICIAR:' | head -1 | cut -d: -f2-)
for s in $linha; do
  case "$s" in
    robo)  log "$(echo "$resp" | grep -v '^REINICIAR' | grep -i 'robô' | head -1)"; reiniciar '^robo-avec$' ;;
    ponte) log "$(echo "$resp" | grep -v '^REINICIAR' | grep -i 'ponte' | head -1)"; reiniciar '^ponte' ;;
  esac
done
exit 0
