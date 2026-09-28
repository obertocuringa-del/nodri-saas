# -*- coding: utf-8 -*-
"""
Agendador do robô do relatório (pm2 "robo-relatorio", no servidor).

A cada 30 s pergunta ao NODRI quais salões têm coleta ligada, os horários de
cada um e se alguém pediu "Rodar agora". Chegou o horário -> entra na fila.
Roda no máximo ROBO_SIMULTANEAS coletas ao mesmo tempo (hoje 1): se uma
atrasar, a próxima espera. Cada coleta é um processo separado
(coleta_servidor.py) com HOME próprio do salão.
"""
import json
import os
import signal
import subprocess
import sys
import time
from datetime import datetime
from zoneinfo import ZoneInfo

import requests

AQUI = os.path.dirname(os.path.abspath(__file__))
PY = sys.executable
NODRI = os.environ.get("NODRI_URL", "http://127.0.0.1:3000").rstrip("/")
CHAVE = os.environ["CRM_PONTE_CHAVE"]
PERFIS = os.environ.get("ROBO_PERFIS", "/home/nodri/robo/perfis")
CASAS = os.environ.get("ROBO_CASAS", "/home/nodri/robo/relatorio")
TZ = ZoneInfo("America/Sao_Paulo")
# Uma coleta normal do Rouge leva 15-25 min; 90 dá folga para salão maior.
LIMITE_MIN = int(os.environ.get("ROBO_LIMITE_MIN", "90"))
H = {"x-crm-chave": CHAVE}

fila = []            # salões esperando a vez
rodando = {}         # salao_id -> (processo, coleta_id, nome)
ja_disparou = set()  # (salao_id, 'AAAA-MM-DD HH:MM') -- cada horário uma vez


def log(*a):
    print(datetime.now(TZ).strftime("%d/%m %H:%M:%S"), "[relatorio]", *a, flush=True)


def nodri_post(corpo):
    r = requests.post(f"{NODRI}/api/robo/relatorio", json=corpo, headers=H, timeout=600)
    try:
        return r.json()
    except Exception:
        return {"error": r.status_code}


def porta_do(salao_id):
    try:
        return int(open(os.path.join(PERFIS, salao_id, "porta")).read().strip())
    except Exception:
        return None


def iniciar(s, origem):
    porta = porta_do(s["salao_id"])
    if not porta:
        log(s["nome"], ": Chrome do salão sem porta (salão não está na nuvem?) -- pulando")
        return
    r = nodri_post({"acao": "inicio", "salao_id": s["salao_id"], "origem": origem})
    cid = r.get("id")
    casa = os.path.join(CASAS, s["salao_id"])
    os.makedirs(casa, exist_ok=True)
    env = {**os.environ, "HOME": casa, "SALAO_ID": s["salao_id"], "PORTA": str(porta),
           "AVEC_URL": s.get("url_login") or "", "AVEC_EMAIL": s.get("email") or "", "AVEC_SENHA": s.get("senha") or ""}
    env.pop("APPDATA", None)
    # Tudo que o robô escreve vai para um arquivo (o log do robô é longo; num
    # "pipe" ele enche e a coleta trava no meio). A resposta é a última linha JSON.
    arq_log = os.path.join(casa, "ultima_coleta.log")
    saida = open(arq_log, "w")
    # Sessão própria: se passar do tempo, derruba a coleta E o chromedriver dela
    # juntos (o Chrome do salão não é filho dela e continua aberto).
    p = subprocess.Popen([PY, "-u", os.path.join(AQUI, "coleta_servidor.py")], env=env, cwd=casa,
                         stdout=saida, stderr=subprocess.STDOUT, text=True, start_new_session=True)
    p.comecou = time.time()
    rodando[s["salao_id"]] = (p, cid, s["nome"], arq_log)
    log(s["nome"], f": coleta iniciada ({origem}), porta {porta}")


def terminar(salao_id, erro=None):
    p, cid, nome, arq_log = rodando.pop(salao_id)
    texto = open(arq_log, encoding="utf-8", errors="replace").read()
    linhas = [l for l in texto.splitlines() if l.strip().startswith('{"ok"')]
    res = json.loads(linhas[-1]) if linhas else {"ok": False, "erro": erro or f"a coleta saiu sem resposta (código {p.returncode})"}
    if not res.get("ok"):
        nodri_post({"acao": "erro", "id": cid, "motivo": res.get("erro")})
        log(nome, ": ERRO --", res.get("erro"))
        return
    r = nodri_post({"acao": "fim", "id": cid, "salao_id": salao_id, "arquivo": res["arquivo"],
                    "alertas": res.get("alertas") or []})
    log(nome, ":", r.get("situacao") or r.get("error"), "|", "; ".join(r.get("motivos") or []))


def volta():
    agora = datetime.now(TZ)
    hhmm = agora.strftime("%H:%M")
    dia = agora.strftime("%Y-%m-%d")
    d = requests.get(f"{NODRI}/api/robo/relatorio", headers=H, timeout=60).json()
    limite = int(d.get("simultaneas") or 1)
    for s in d.get("saloes", []):
        sid = s["salao_id"]
        na_fila = any(x[0]["salao_id"] == sid for x in fila) or sid in rodando
        if s.get("rodar_agora") and not na_fila:
            fila.append((s, "rodar_agora"))
            continue
        for h in s.get("horarios") or []:
            chave = (sid, f"{dia} {h}")
            if h <= hhmm and chave not in ja_disparou:
                # só dispara no minuto do horário ou até 10 min depois (servidor reiniciou)
                mins = int(hhmm[:2]) * 60 + int(hhmm[3:]) - (int(h[:2]) * 60 + int(h[3:]))
                ja_disparou.add(chave)
                if 0 <= mins <= 10 and not na_fila:
                    fila.append((s, "agenda"))
    for sid in [k for k, v in rodando.items() if v[0].poll() is not None]:
        terminar(sid)
    # Coleta travada não pode segurar a fila dos outros salões para sempre.
    for sid in [k for k, v in rodando.items() if time.time() - v[0].comecou > LIMITE_MIN * 60]:
        p = rodando[sid][0]
        try:
            os.killpg(p.pid, signal.SIGKILL)
        except Exception:
            p.kill()
        p.wait()
        log(rodando[sid][2], f": passou de {LIMITE_MIN} min -- coleta encerrada, fila segue")
        terminar(sid, f"A coleta passou de {LIMITE_MIN} minutos e foi encerrada para não segurar os outros salões.")
    while fila and len(rodando) < limite:
        s, origem = fila.pop(0)
        if s["salao_id"] not in rodando:
            iniciar(s, origem)


def principal():
    log("ligado; NODRI em", NODRI)
    while True:
        try:
            volta()
        except Exception as e:
            log("volta falhou:", e)
        time.sleep(30)


if __name__ == "__main__":
    principal()
