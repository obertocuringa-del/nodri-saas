#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# VIGIA DO SERVIDOR NODRI -- roda a cada minuto (/etc/cron.d/nodri-vigia),
# instalado pelo scripts/publicar-servidor.sh em /usr/local/bin/nodri-vigia.sh.
#
# 30/09/2026: o servidor caiu, voltou, e o robô do Avec ficou o dia inteiro
# "ligado" sem ler o Avec -- sem aviso ao profissional, sem confirmação, sem
# feedback. Ninguém percebeu até a noite. Este vigia:
#   1) o site não responde 3 vezes seguidas -> religa o nodri e o nginx;
#   2) manda ao NODRI o retrato do servidor (ligado desde, memória, disco,
#      processos do pm2 -- sem variáveis de ambiente) para a Central do
#      servidor (/admin/robo);
#   3) religa o que o NODRI mandar (/api/cron/saude): o que o vigia achou
#      parado e o que o dono pediu pelo botão "Reiniciar":
#        robo -> robo-avec   ponte -> ponte*   relatorio -> robo-relatorio
#        nodri -> nodri      servidor -> o servidor inteiro (em 1 minuto)
#      Os limites (1 vez a cada 20 min, 8 por dia) quem guarda é o NODRI.
# Durante o PUBLICAR (arquivo /var/tmp/nodri-publicando) ele não mexe em nada.
# Tudo o que ele faz fica em /var/log/nodri-vigia.log.
# ─────────────────────────────────────────────────────────────────────────────

LOG=/var/log/nodri-vigia.log
ENVF=/home/nodri/nodri-novo/.env.production.local
SITE=https://www.nodri.com.br
CONT=/var/tmp/nodri-vigia-site
TRAVA=/var/tmp/nodri-publicando

log() { echo "$(date '+%d/%m %H:%M') $*" >> "$LOG"; }
[ -f "$LOG" ] && [ "$(stat -c %s "$LOG" 2>/dev/null || echo 0)" -gt 1048576 ] && tail -n 2000 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"

# PUBLICAR montando o site: o site fica fora alguns minutos de propósito.
if [ -f "$TRAVA" ] && [ $(( $(date +%s) - $(stat -c %Y "$TRAVA") )) -lt 1200 ]; then exit 0; fi

pm2_de() { if [ "$1" = root ]; then pm2 jlist 2>/dev/null; else su - nodri -c "pm2 jlist" 2>/dev/null; fi; }

# Religa todo processo do pm2 cujo nome casa com o padrão -- procura no pm2
# do usuário nodri e no do root, porque cada serviço foi instalado por um.
reiniciar() {
  local padrao="$1" achou=0 u nomes n
  for u in nodri root; do
    nomes=$(pm2_de "$u" | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | grep -E "$padrao" | sort -u)
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

SEG=$(grep -E '^CRON_SECRET=' "$ENVF" 2>/dev/null | head -1 | cut -d= -f2- | tr -d "\"'\r")
[ -n "$SEG" ] || { log "sem CRON_SECRET em $ENVF"; exit 0; }

# 2) O retrato do servidor. Do pm2 só saem nome, situação e números: o jlist
#    traz também as variáveis de ambiente (com chaves) e elas NÃO saem daqui.
PROC=$( { pm2_de nodri | sed 's/^/nodri\t/'; echo; pm2_de root | sed 's/^/root\t/'; } | node -e '
  let t = ""; process.stdin.on("data", d => t += d).on("end", () => {
    const out = []
    for (const linha of t.split("\n")) {
      const i = linha.indexOf("\t"); if (i < 0) continue
      const usuario = linha.slice(0, i); let lista = []
      try { lista = JSON.parse(linha.slice(i + 1)) } catch { continue }
      for (const p of lista) out.push({ nome: p.name, usuario, status: p.pm2_env && p.pm2_env.status,
        reinicios: p.pm2_env && p.pm2_env.restart_time, desde: p.pm2_env && p.pm2_env.pm_uptime,
        mem: p.monit && p.monit.memory, cpu: p.monit && p.monit.cpu })
    }
    process.stdout.write(JSON.stringify(out))
  })' 2>/dev/null)
[ -n "$PROC" ] || PROC='[]'
BOOT=$(uptime -s 2>/dev/null)
CARGA=$(cut -d' ' -f1 /proc/loadavg 2>/dev/null)
read -r MT MU <<< "$(free -m | awk '/^Mem:/{print $2, $3}')"
read -r DT DU <<< "$(df -m / | awk 'NR==2{print $2, $3}')"
CORPO="{\"boot\":\"$BOOT\",\"carga\":${CARGA:-null},\"mem_total\":${MT:-null},\"mem_usada\":${MU:-null},\"disco_total\":${DT:-null},\"disco_usado\":${DU:-null},\"processos\":$PROC}"

# 3) O que religar
resp=$(curl -s -m 60 -X POST -H "Authorization: Bearer $SEG" -H 'Content-Type: application/json' --data "$CORPO" "$SITE/api/cron/saude")
linha=$(echo "$resp" | grep '^REINICIAR:' | head -1 | cut -d: -f2-)
for s in $linha; do
  log "pedido: $s $(echo "$resp" | grep -v '^REINICIAR' | head -2 | tr '\n' ' ')"
  case "$s" in
    robo)      reiniciar '^robo-avec$' ;;
    ponte)     reiniciar '^ponte' ;;
    relatorio) reiniciar '^robo-relatorio$' ;;
    nodri)     reiniciar '^nodri$' ;;
    servidor)  log "reiniciando o servidor inteiro em 1 minuto"; shutdown -r +1 >/dev/null 2>&1 ;;
  esac
done
exit 0
