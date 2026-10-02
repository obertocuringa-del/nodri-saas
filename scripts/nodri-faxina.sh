#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# FAXINA DIÁRIA DO SERVIDOR NODRI
#
# Nada aqui é urgente hoje: o disco está em 19% e sobram 39 GB. O problema é o
# que estes números viram com DEZ salões, que é para onde o sistema vai.
#
# Medido em 02/10/2026, com UM salão e 5 dias de robô no servidor:
#
#   /home/nodri/robo/relatorio/*/Downloads   163 MB   665 arquivos .xlsx
#   /home/nodri/.pm2/logs                     79 MB   (ponte-error.log: 38 MB)
#
# São ~160 planilhas por dia, por salão, e nenhuma delas serve para nada depois
# de ter sido importada. Com dez salões isso vira ~10 GB por mês e enche o
# disco em uns quatro meses -- e disco cheio não dá erro bonito: o Postgres
# para, o Chrome não abre, o build morre no meio.
#
# E não havia limpeza nenhuma: não existe logrotate para os logs do NODRI nem o
# pm2-logrotate instalado.
#
# Roda uma vez por dia pelo cron. Tudo aqui é conservador de propósito: o que
# some é o que não tem mais uso, e com folga de dias.
# ─────────────────────────────────────────────────────────────────────────────
set -u

LOG=/var/log/nodri-faxina.log
diz() { echo "$(date '+%d/%m %H:%M') $*" >> "$LOG"; }

# O próprio registro da faxina não pode virar o problema que ela resolve.
[ -f "$LOG" ] && [ "$(stat -c %s "$LOG" 2>/dev/null || echo 0)" -gt 524288 ] \
  && tail -n 500 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"

antes=$(df -m / | awk 'NR==2{print $4}')

# ── 1. Planilhas que o robô gera e já mandou ────────────────────────────────
#
# Depois de importada, a planilha em Downloads não serve mais para nada: quem
# guarda a cópia que a aprovação usa é /home/nodri/robo/coletas. Sete dias é
# tempo de sobra para alguém querer olhar uma que deu errado.
n=$(find /home/nodri/robo/relatorio/*/Downloads -name '*.xlsx' -mtime +7 2>/dev/null | wc -l)
if [ "${n:-0}" -gt 0 ]; then
  find /home/nodri/robo/relatorio/*/Downloads -name '*.xlsx' -mtime +7 -delete 2>/dev/null
  diz "apaguei $n planilha(s) do robô com mais de 7 dias"
fi

# ── 2. Planilhas guardadas das coletas ──────────────────────────────────────
#
# Estas são as que o botão "Aprovar" relê, então têm vida mais longa. Coleta de
# mais de 30 dias ninguém vai aprovar: ou já foi aplicada, ou já foi decidida.
n=$(find /home/nodri/robo/coletas -name '*.xlsx' -mtime +30 2>/dev/null | wc -l)
if [ "${n:-0}" -gt 0 ]; then
  find /home/nodri/robo/coletas -name '*.xlsx' -mtime +30 -delete 2>/dev/null
  diz "apaguei $n planilha(s) de coleta com mais de 30 dias"
fi

# ── 3. Registros do pm2 ─────────────────────────────────────────────────────
#
# Cortar pelo FIM, não apagar: o pedaço recente é justamente o que serve para
# investigar. Truncar o arquivo no lugar (> arquivo) em vez de criar outro
# mantém o descritor que o pm2 tem aberto -- renomear faria ele continuar
# escrevendo num arquivo que ninguém mais lê.
for f in /home/nodri/.pm2/logs/*.log; do
  [ -f "$f" ] || continue
  tam=$(stat -c %s "$f" 2>/dev/null || echo 0)
  if [ "$tam" -gt 20971520 ]; then          # 20 MB
    tail -c 5242880 "$f" > "$f.tmp" 2>/dev/null && cat "$f.tmp" > "$f" && rm -f "$f.tmp"
    diz "cortei $(basename "$f") (estava com $((tam / 1048576)) MB, ficou com 5)"
  fi
done

# ── 4. Registros do próprio NODRI em /var/log ───────────────────────────────
for f in /var/log/nodri-publicar.log /var/log/nodri-npm.log /var/log/pub.log; do
  [ -f "$f" ] || continue
  tam=$(stat -c %s "$f" 2>/dev/null || echo 0)
  if [ "$tam" -gt 10485760 ]; then          # 10 MB
    tail -c 2097152 "$f" > "$f.tmp" 2>/dev/null && cat "$f.tmp" > "$f" && rm -f "$f.tmp"
    diz "cortei $(basename "$f") (estava com $((tam / 1048576)) MB)"
  fi
done

# ── 5. Aviso quando o disco aperta ──────────────────────────────────────────
#
# Disco cheio não avisa com elegância: o Postgres para de escrever, o Chrome
# não abre e o build morre no meio, tudo ao mesmo tempo e sem dizer por quê.
livre=$(df -m / | awk 'NR==2{print $4}')
pct=$(df -h / | awk 'NR==2{print $5}' | tr -d '%')
if [ "${pct:-0}" -ge 80 ]; then
  diz "ATENÇÃO: disco em ${pct}% (livre: $((livre / 1024)) GB). Ver o que está crescendo com: du -sh /home/nodri/* /var/log"
fi

ganho=$((livre - antes))
[ "$ganho" -gt 0 ] && diz "faxina feita; liberou ${ganho} MB (livre: $((livre / 1024)) GB)"
exit 0
