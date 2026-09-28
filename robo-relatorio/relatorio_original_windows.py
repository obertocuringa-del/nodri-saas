import tkinter as tk
from tkinter import ttk, messagebox, filedialog, scrolledtext, simpledialog
from tkcalendar import DateEntry
import json
import os
import locale
import threading
import time
from datetime import datetime, timedelta
import calendar
import glob
import shutil
import re
import sys
import logging
import webbrowser
import psutil
import pandas as pd
import numpy as np
from openpyxl import load_workbook
from openpyxl.styles import Font, Alignment, PatternFill
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from collections import defaultdict
from difflib import SequenceMatcher
from jinja2 import Template
import requests
from io import StringIO
import tkinter as tk
from tkinter import ttk, messagebox
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import webbrowser
from datetime import datetime
import os
import json
from calendar import month_name
from collections import defaultdict
import random

# ============================================================================
# CONFIGURAÇÕES INICIAIS
# ============================================================================

# Configurar encoding UTF-8 para Windows
if sys.platform == "win32":
    try:
        import io

        sys.stdout = io.TextIOWrapper(sys.__stdout__.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.__stderr__.buffer, encoding='utf-8', errors='replace')
    except:
        pass

# Configurar logging — o arquivo de log vai para o AppData (caminho ABSOLUTO).
# Se fosse relativo, quebrava quando o programa é aberto pelo Agendador do Windows
# (a pasta atual vira system32, onde não há permissão de escrita → PermissionError).
_handlers = [logging.StreamHandler(sys.stdout)]
try:
    _pasta_log = os.path.join(os.environ.get('APPDATA', os.path.expanduser('~')), 'NodriSistema')
    os.makedirs(_pasta_log, exist_ok=True)
    _handlers.insert(0, logging.FileHandler(os.path.join(_pasta_log, 'nodri_historico.log'), encoding='utf-8'))
except Exception:
    pass
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=_handlers
)

# ============================================================================
# CONSTANTES DO SISTEMA
# ============================================================================

# ============================================================================
# VARIÁVEIS DE SUPORTE (altere aqui para mudar em todo o sistema)
# ============================================================================
SUPORTE_TELEFONE = "(11) 99999-9999"
SUPORTE_EMAIL    = "suporte@nodri.com.br"
SALAO_NOME_PADRAO = "Meu Salão"

# Fonte com fallback automático
try:
    import tkinter as _tk_test
    _r = _tk_test.Tk(); _r.withdraw()
    _fontes_disponiveis = list(_tk_test.font.families(_r))
    _r.destroy()
    FONT_PRIMARY = "Segoe UI" if "Segoe UI" in _fontes_disponiveis else "Arial"
except Exception:
    FONT_PRIMARY = "Arial"

# ============================================================================
# CONSTANTES DO SISTEMA
# ============================================================================
_ts = datetime.now().strftime('%Y%m%d_%H%M%S')
# O Excel gerado (base de dados dos profissionais) vai direto para a pasta
# Downloads do usuario. Antes o nome era relativo e, como o launcher troca o
# diretorio de trabalho para o AppData, o arquivo acabava caindo la dentro.
_NOME_BASE_DADOS = f"NODRI_DADOS_{_ts}.xlsx"
_PASTA_DOWNLOADS = os.path.join(os.path.expanduser("~"), "Downloads")
os.makedirs(_PASTA_DOWNLOADS, exist_ok=True)
ARQUIVO_BASE_DADOS = os.path.join(_PASTA_DOWNLOADS, _NOME_BASE_DADOS)

# Config salvo no AppData (persiste entre versões, não precisa de admin)
_PASTA_APPDATA_NODRI = os.path.join(
    os.environ.get('APPDATA', os.path.expanduser('~')), 'NodriSistema'
)
os.makedirs(_PASTA_APPDATA_NODRI, exist_ok=True)
ARQUIVO_CONFIG = os.path.join(_PASTA_APPDATA_NODRI, 'config_nodri.json')
# Relatórios gerados vão para a pasta Downloads do usuário (mesmo método já usado
# em outro lugar deste arquivo pra achar Downloads) - funciona em qualquer PC/
# usuário Windows, sem depender de nome de login nem de onde o app está instalado.
PASTA_RELATORIOS = os.path.join(os.path.expanduser("~"), "Downloads", "relatorios_nodri")
PASTA_BACKUPS = "backups_nodri"
MESES_PT = {
    1: "Janeiro", 2: "Fevereiro", 3: "Março", 4: "Abril",
    5: "Maio", 6: "Junho", 7: "Julho", 8: "Agosto",
    9: "Setembro", 10: "Outubro", 11: "Novembro", 12: "Dezembro"
}

# URL da planilha do Google Sheets (CORRIGIDA)
GOOGLE_SHEETS_URL = "https://docs.google.com/spreadsheets/d/11RnD-EvoGY9TAUfCQQT-YyH36dWW3b9i_vX21kaHlXg/export?format=csv&gid=862963045"

# (planilha de feedback removida — não utilizada nesta versão)

# Pasta de dados do app em AppData (não requer admin)
ARQUIVO_CONFIG_GLOBAL = ARQUIVO_CONFIG   # mesmo arquivo — unificado
ARQUIVO_LICENCA       = os.path.join(_PASTA_APPDATA_NODRI, 'licenca.key')

# ============================================================================
# TELA DE BLOQUEIO DA COLETA (cobre a tela durante a coleta; fecha ao terminar)
# Liga/desliga protegido por senha de suporte.
# ============================================================================
SENHA_SUPORTE_BLOQUEIO = "nodri@suporte"

def _arquivo_cfg_bloqueio():
    return os.path.join(_PASTA_APPDATA_NODRI, "config_tela_bloqueio.json")

def tela_bloqueio_habilitada():
    import json
    try:
        with open(_arquivo_cfg_bloqueio(), "r", encoding="utf-8") as f:
            return bool(json.load(f).get("habilitada", True))
    except Exception:
        return True

def _definir_tela_bloqueio(habilitada):
    import json
    try:
        with open(_arquivo_cfg_bloqueio(), "w", encoding="utf-8") as f:
            json.dump({"habilitada": bool(habilitada)}, f, ensure_ascii=False, indent=2)
        return True
    except Exception:
        return False

def abrir_config_tela_bloqueio(parent=None):
    import tkinter as _tk
    from tkinter import messagebox as _mb
    win = _tk.Toplevel(parent) if parent else _tk.Tk()
    win.title("Configuração — Tela de Bloqueio")
    win.geometry("460x300"); win.resizable(False, False)
    try: win.configure(bg="#0f1117")
    except Exception: pass
    _tk.Label(win, text="Tela de Bloqueio (Coleta)", font=("Segoe UI", 15, "bold"), bg="#0f1117", fg="#ffffff").pack(pady=(18, 2))
    _tk.Label(win, text="Área de suporte (protegida por senha)", font=("Segoe UI", 9), bg="#0f1117", fg="#9aa3b8").pack()
    _tk.Label(win, text="Senha de suporte:", font=("Segoe UI", 10), bg="#0f1117", fg="#cbd5e1").pack(pady=(16, 2))
    ent = _tk.Entry(win, show="•", font=("Segoe UI", 12), justify="center"); ent.pack(ipady=4)
    estado = _tk.Label(win, text="", font=("Segoe UI", 10, "bold"), bg="#0f1117"); estado.pack(pady=10)

    def _mostrar_estado():
        on = tela_bloqueio_habilitada()
        estado.config(text=("🔒 LIGADA (cliente não vê a coleta)" if on else "👁 DESLIGADA (você acompanha a coleta)"),
                      fg=("#22c55e" if on else "#f59e0b"))

    def _aplicar(novo):
        if ent.get() != SENHA_SUPORTE_BLOQUEIO:
            _mb.showerror("Senha incorreta", "Senha de suporte inválida.", parent=win); return
        _definir_tela_bloqueio(novo); _mostrar_estado()
        _mb.showinfo("Pronto", "Tela de bloqueio " + ("LIGADA." if novo else "DESLIGADA.") + "\nVale na próxima coleta.", parent=win)

    _tk.Button(win, text="🔒 LIGAR tela", width=18, bg="#16a34a", fg="#fff", relief="flat",
               font=("Segoe UI", 10, "bold"), command=lambda: _aplicar(True)).pack(pady=4)
    _tk.Button(win, text="👁 DESLIGAR tela", width=18, bg="#f59e0b", fg="#fff", relief="flat",
               font=("Segoe UI", 10, "bold"), command=lambda: _aplicar(False)).pack(pady=4)
    _mostrar_estado()
    try: win.grab_set()
    except Exception: pass


# ============================================================================
# CONFIGURAÇÃO REMOTA (painel admin NODRI) — timeouts/xpaths/urls da coleta.
# Aplica EM MEMÓRIA por execução: 1) cache local (offline ok); 2) painel em
# 2º plano. Não escreve no arquivo de config do cliente (edições locais dele
# no CONFIG continuam valendo em disco).
# ============================================================================

def aplicar_config_remota_async(sistema):
    import threading
    MAPA = {
        'timeout_login': ('timeouts', 'login'), 'timeout_pagina': ('timeouts', 'pagina'),
        'timeout_elemento': ('timeouts', 'elemento'), 'timeout_download': ('timeouts', 'download'),
        'timeout_pausa_buscar': ('timeouts', 'pausa_buscar'),
        'xpath_login_email': ('xpaths', 'login', 'email'),
        'xpath_login_senha': ('xpaths', 'login', 'senha'),
        'xpath_login_botao': ('xpaths', 'login', 'btn_acessar'),
        'xpath_data_inicio': ('xpaths', 'relatorios', 'data_inicio'),
        'xpath_data_fim': ('xpaths', 'relatorios', 'data_fim'),
        'xpath_btn_buscar': ('xpaths', 'relatorios', 'btn_buscar'),
        'xpath_btn_buscar_0021': ('xpaths', 'relatorios', 'btn_buscar_0021'),
        'xpath_btn_buscar_0126': ('xpaths', 'relatorios', 'btn_buscar_0126'),
        'xpath_btn_excel': ('xpaths', 'relatorios', 'btn_excel'),
        'xpath_btn_excel_0021': ('xpaths', 'relatorios', 'btn_excel_0021'),
        'xpath_btn_excel_0126': ('xpaths', 'relatorios', 'btn_excel_0126'),
    }
    for _cod in ('0083', '0017', '0032', '0042', '0088', '0123',
                 '0021', '0326', '0126', '0031', '0041', '0051', '0033', 'comandas'):
        MAPA['url_' + _cod] = ('urls', 'relatorios', _cod)
    ARQ_CACHE = 'config_remota_relatorio.json'

    def _aplicar(cfg):
        for k, v in (cfg or {}).items():
            cam = MAPA.get(k)
            if not cam or v in (None, ''):
                continue
            alvo = sistema.configuracoes_editaveis
            for p in cam[:-1]:
                if not isinstance(alvo.get(p), dict):
                    alvo[p] = {}
                alvo = alvo[p]
            atual = alvo.get(cam[-1])
            if isinstance(atual, (int, float)) and not isinstance(atual, bool):
                try:
                    v = float(v)
                except Exception:
                    continue
                if v <= 0:
                    continue
            alvo[cam[-1]] = v

    try:
        with open(ARQ_CACHE, 'r', encoding='utf-8') as f:
            _aplicar(json.load(f))
    except Exception:
        pass

    def _rodar():
        try:
            import urllib.request
            req = urllib.request.Request('https://www.nodri.com.br/api/config/programas',
                                         headers={'User-Agent': 'SuiteNODRI'})
            with urllib.request.urlopen(req, timeout=6) as r:
                dados = json.loads(r.read().decode('utf-8'))
            cfg = (dados.get('config') or {}).get('relatorio') or {}
            _aplicar(cfg)
            try:
                with open(ARQ_CACHE, 'w', encoding='utf-8') as f:
                    json.dump(cfg, f, ensure_ascii=False, indent=2)
            except Exception:
                pass
        except Exception:
            pass  # sem internet / site fora: segue com cache/config local

    threading.Thread(target=_rodar, daemon=True).start()


class TelaBloqueioRelatorio:
    """Cobre a tela durante a coleta. Fecha quando a coleta termina."""
    def __init__(self, master=None):
        self.master = master
        self.window = None
        self.ativa = False

    def mostrar(self):
        if self.ativa or not tela_bloqueio_habilitada():
            return
        import tkinter as _tk
        self.window = _tk.Toplevel(self.master) if self.master else _tk.Tk()
        self.window.title("Coleta em andamento")
        self.window.overrideredirect(True)
        self.window.update_idletasks()
        try:
            import ctypes
            u = ctypes.windll.user32; u.SetProcessDPIAware()
            vx, vy, vw, vh = u.GetSystemMetrics(76), u.GetSystemMetrics(77), u.GetSystemMetrics(78), u.GetSystemMetrics(79)
        except Exception:
            vx, vy = 0, 0
            vw = self.window.winfo_screenwidth(); vh = self.window.winfo_screenheight()
        self.window.geometry(f"{vw}x{vh}+{vx}+{vy}")
        self.window.configure(bg="#0f1117")
        try:
            self.window.attributes('-topmost', True); self.window.lift()
        except Exception:
            pass
        _tk.Label(self.window, text="🔒 Coleta em andamento", font=("Segoe UI", 26, "bold"),
                  bg="#0f1117", fg="#ffffff").place(relx=0.5, rely=0.43, anchor="center")
        _tk.Label(self.window, text="Aguarde — esta tela fecha sozinha quando a coleta terminar.",
                  font=("Segoe UI", 13), bg="#0f1117", fg="#9aa3b8").place(relx=0.5, rely=0.51, anchor="center")

        def _emerg():
            import os as _os, subprocess as _sp
            for p in ('chrome.exe', 'chromedriver.exe'):
                try:
                    _sp.Popen(['taskkill', '/f', '/t', '/im', p], creationflags=0x08000000,
                              stdin=_sp.DEVNULL, stdout=_sp.DEVNULL, stderr=_sp.DEVNULL)
                except Exception:
                    pass
            _os._exit(0)

        _tk.Button(self.window, text="🚨 EMERGÊNCIA", command=_emerg, bg="#e24b4a", fg="#ffffff",
                   font=("Segoe UI", 11, "bold"), relief="flat", padx=16, pady=8).place(relx=0.98, rely=0.97, anchor="se")
        self.ativa = True
        try:
            self.window.update()
        except Exception:
            pass

    def fechar(self):
        if self.window and self.ativa:
            try: self.window.overrideredirect(False)
            except Exception: pass
            try: self.window.destroy()
            except Exception: pass
            self.ativa = False


# ============================================================================
# SISTEMA DE LICENÇA
# ============================================================================

class SistemaLicenca:
    """
    Licença simples baseada em hash local.
    Para ativar: o usuário digita a chave fornecida pelo revendedor.
    Chave = SHA256( CNPJ_ou_CPF + SALT_SECRETO )[:16].upper()
    """
    SALT = "NODRI2025#vendas"  # mude antes de distribuir

    def __init__(self):
        self.arquivo = ARQUIVO_LICENCA
        self._ativo = False
        self._titular = ""
        self._verificar()

    # ── API pública ──────────────────────────────────────────────────────────

    def esta_ativo(self) -> bool:
        return True

    def titular(self) -> str:
        return self._titular

    def ativar(self, documento: str, chave_digitada: str) -> tuple:
        """
        Tenta ativar com documento (CNPJ/CPF) e chave.
        Retorna (True, mensagem) ou (False, mensagem).
        """
        import hashlib
        doc = re.sub(r'\D', '', documento)
        chave_esperada = hashlib.sha256(
            f"{doc}{self.SALT}".encode()
        ).hexdigest()[:16].upper()

        if chave_digitada.upper().replace('-', '').replace(' ', '') == chave_esperada:
            dados = {'documento': doc, 'chave': chave_esperada,
                     'data_ativacao': datetime.now().isoformat(),
                     'titular': documento}
            with open(self.arquivo, 'w') as f:
                json.dump(dados, f)
            self._ativo = True
            self._titular = documento
            return True, f"✅ Licença ativada com sucesso!\nTitular: {documento}"
        return False, "❌ Chave inválida. Verifique e tente novamente."

    # ── Interno ──────────────────────────────────────────────────────────────

    def _verificar(self):
        try:
            if not os.path.exists(self.arquivo):
                return
            import hashlib
            with open(self.arquivo) as f:
                dados = json.load(f)
            doc   = dados.get('documento', '')
            chave = dados.get('chave', '')
            esperada = hashlib.sha256(
                f"{doc}{self.SALT}".encode()
            ).hexdigest()[:16].upper()
            if chave == esperada:
                self._ativo   = True
                self._titular = dados.get('titular', doc)
        except Exception:
            self._ativo = False


# ============================================================================
# TELA DE PRIMEIRO ACESSO / CONFIGURAÇÃO DO SALÃO
# ============================================================================

def _carregar_config_global() -> dict:
    """Carrega configurações globais salvas no AppData."""
    if os.path.exists(ARQUIVO_CONFIG_GLOBAL):
        try:
            with open(ARQUIVO_CONFIG_GLOBAL, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def _salvar_config_global(dados: dict):
    """Salva configurações globais no AppData."""
    try:
        cfg = _carregar_config_global()
        cfg.update(dados)
        with open(ARQUIVO_CONFIG_GLOBAL, 'w', encoding='utf-8') as f:
            json.dump(cfg, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logging.error(f"Erro ao salvar config global: {e}")


# ============================================================================
# MULTI-SALÃO — cadastro de vários salões + agendamento automático
# ----------------------------------------------------------------------------
# Cada salão guarda as credenciais do avec.beauty (coletar o relatório) e as do
# nodri (anexar o Excel). Tudo salvo em JSON no AppData; o Excel gerado continua
# indo para a pasta Downloads. Nada aqui altera o fluxo antigo de um salão só —
# se ainda não houver salões cadastrados, o salão único já configurado é migrado
# automaticamente para a lista, então nada é perdido.
# ============================================================================

# URL de login do seu sistema NODRI (onde o Excel é anexado)
NODRI_UPLOAD_LOGIN_URL = "https://nodri-saas-jsx4.vercel.app/login"

# XPaths do fluxo de anexar o Excel no NODRI (editáveis; valores enviados por você)
NODRI_UPLOAD_XPATHS_PADRAO = {
    "login":     "/html/body/div[1]/div[2]/div[2]/form/div[1]/input",
    "senha":     "/html/body/div[1]/div[2]/div[2]/form/div[2]/div/input",
    "entrar":    "/html/body/div[1]/div[2]/div[2]/form/button",
    "menu":      "/html/body/div[1]/div[1]/div/div[1]/button/svg",
    "relatorios":"/html/body/div[1]/div/main/div[3]/div/div[5]/div[3]/button",
    "importar":  "/html/body/div[2]/div[1]/div/button",
    "anexo":     "/html/body/div[2]/div[2]/div[2]/div/svg",
}

# Tempos (segundos) do processo do NODRI — editáveis pela tela, igual aos
# TIMEOUTS do avec. Se um passo falha por a página não ter carregado, é aqui
# que se dá mais folga.
NODRI_TEMPOS_PADRAO = {
    "timeout_elemento": 25,   # espera máxima para achar cada botão
    "apos_login":       6,    # espera depois de clicar em Entrar
    "entre_passos":     2,    # espera entre menu / relatórios / importar
    "apos_anexo":       30,   # espera DEPOIS de clicar em Importar, antes de fechar
                              # (arquivo grande pode demorar; suba p/ 120 = 2 min)
}

# Agendamento padrão (modo ciclo é o inicial; o usuário troca pela tela)
AGENDAMENTO_PADRAO = {
    "modo": "ciclo",                 # "ciclo" | "horario"
    "ciclo": {
        "intervalo_min": 5,          # espera entre um salão e o próximo
        "janela_inicio": "07:00",    # começa a rodar
        "janela_fim":    "22:00",    # para e só volta no dia seguinte
    },
    "nodri_tempos": dict(NODRI_TEMPOS_PADRAO),
}


def _arquivo_saloes() -> str:
    """Arquivo (no AppData) com a lista de salões e o agendamento."""
    return os.path.join(_PASTA_APPDATA_NODRI, "saloes.json")


def _novo_id_salao() -> str:
    import uuid
    return uuid.uuid4().hex[:12]


def _salao_vazio() -> dict:
    """Modelo de um salão novo, com todos os campos que a tela usa."""
    return {
        "id":          _novo_id_salao(),
        "nome":        "",
        "avec_url":    "https://admin.avec.beauty/SEU-SALAO/admin",
        "avec_email":  "",
        "avec_senha":  "",
        "nodri_login": "",
        "nodri_senha": "",
        "horario":     "06:00",   # usado no modo "horario"
        "ativo":       True,
    }


def carregar_saloes_cfg() -> dict:
    """Lê a config multi-salão do AppData, com defaults e migração do salão único.
    Estrutura: {'agendamento': {...}, 'saloes': [ {...}, ... ]}."""
    cfg = {"agendamento": json.loads(json.dumps(AGENDAMENTO_PADRAO)), "saloes": []}
    caminho = _arquivo_saloes()
    if os.path.exists(caminho):
        try:
            with open(caminho, "r", encoding="utf-8") as f:
                salvo = json.load(f) or {}
            if isinstance(salvo.get("agendamento"), dict):
                # mescla por cima do padrão pra nunca faltar chave
                ag = json.loads(json.dumps(AGENDAMENTO_PADRAO))
                ag.update(salvo["agendamento"])
                if isinstance(salvo["agendamento"].get("ciclo"), dict):
                    ag["ciclo"] = {**AGENDAMENTO_PADRAO["ciclo"], **salvo["agendamento"]["ciclo"]}
                if isinstance(salvo["agendamento"].get("nodri_tempos"), dict):
                    ag["nodri_tempos"] = {**NODRI_TEMPOS_PADRAO, **salvo["agendamento"]["nodri_tempos"]}
                cfg["agendamento"] = ag
            if isinstance(salvo.get("saloes"), list):
                cfg["saloes"] = salvo["saloes"]
        except Exception as e:
            logging.error(f"Erro ao ler saloes.json: {e}")

    # Migração: sem nenhum salão cadastrado, aproveita o salão único já configurado
    if not cfg["saloes"]:
        antigo = _carregar_config_global()
        if antigo.get("url_salao") and antigo.get("email_padrao"):
            s = _salao_vazio()
            s.update({
                "nome":       antigo.get("nome_salao", "Meu Salão"),
                "avec_url":   antigo.get("url_salao", ""),
                "avec_email": antigo.get("email_padrao", ""),
                "avec_senha": antigo.get("senha_padrao", ""),
            })
            cfg["saloes"] = [s]
            try:
                salvar_saloes_cfg(cfg)
            except Exception:
                pass
    return cfg


def salvar_saloes_cfg(cfg: dict):
    """Grava a config multi-salão no AppData."""
    try:
        with open(_arquivo_saloes(), "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logging.error(f"Erro ao salvar saloes.json: {e}")


def saloes_ativos(cfg: dict = None) -> list:
    """Lista apenas os salões marcados como ativos (na ordem cadastrada)."""
    if cfg is None:
        cfg = carregar_saloes_cfg()
    return [s for s in cfg.get("saloes", []) if s.get("ativo", True)]


def ultimo_excel_downloads() -> str:
    """Retorna o caminho do Excel (.xlsx) mais recente na pasta Downloads.
    É o arquivo que o próprio programa acabou de gerar (NODRI_DADOS_...)."""
    pasta = os.path.join(os.path.expanduser("~"), "Downloads")
    try:
        arquivos = glob.glob(os.path.join(pasta, "*.xlsx"))
        # prioriza os NODRI_DADOS; se não houver, pega o mais recente qualquer
        nodri = [a for a in arquivos if os.path.basename(a).upper().startswith("NODRI_DADOS")]
        alvo = nodri or arquivos
        if not alvo:
            return ""
        return max(alvo, key=os.path.getmtime)
    except Exception as e:
        logging.error(f"Erro ao localizar Excel em Downloads: {e}")
        return ""


def upload_excel_para_nodri(driver, nodri_login, nodri_senha, caminho_excel,
                            xpaths=None, xpath_confirmar="", log=None, tempos=None):
    """Anexa o Excel no seu sistema NODRI, seguindo a sequência de cliques:
    login -> senha -> entrar -> menu -> relatórios -> importar -> anexar arquivo.

    Recebe um `driver` Selenium já aberto (o mesmo usado na coleta é reaproveitado).
    O arquivo é entregue direto ao campo de upload do site (sem abrir a janela do
    Windows), pegando automaticamente o último Excel do Downloads.
    `tempos` = dict com os tempos configuráveis (timeout_elemento, apos_login,
    entre_passos, apos_anexo). Retorna True se conseguiu anexar; False caso contrário."""
    if log is None:
        log = lambda m: logging.info(m)
    xp = dict(NODRI_UPLOAD_XPATHS_PADRAO)
    if isinstance(xpaths, dict):
        xp.update({k: v for k, v in xpaths.items() if v})
    tp = dict(NODRI_TEMPOS_PADRAO)
    if isinstance(tempos, dict):
        tp.update({k: v for k, v in tempos.items() if v not in (None, "")})
    t_elem = max(3, int(tp["timeout_elemento"]))
    t_login = max(0, int(tp["apos_login"]))
    t_passo = max(0, float(tp["entre_passos"]))
    t_anexo = max(0, int(tp["apos_anexo"]))

    def esperar_clicar(xpath, segundos=20, descricao=""):
        el = WebDriverWait(driver, segundos).until(
            EC.presence_of_element_located((By.XPATH, xpath)))
        alvo = el
        # Se o xpath aponta para um <svg> (ícone), o clique tem que ir no BOTÃO
        # que o contém — svg não dispara o onClick do React.
        try:
            if (el.tag_name or "").lower() == "svg":
                anc = driver.execute_script(
                    "return arguments[0].closest('button,a,[role=button]') || arguments[0].parentElement;", el)
                if anc:
                    alvo = anc
        except Exception:
            pass
        try:
            driver.execute_script("arguments[0].scrollIntoView({block:'center'});", alvo)
        except Exception:
            pass
        try:
            alvo.click()
        except Exception:
            driver.execute_script("arguments[0].click();", alvo)
        if descricao:
            log(f"   ✔ {descricao}")
        return alvo

    try:
        if not caminho_excel or not os.path.exists(caminho_excel):
            log("   ❌ Excel não encontrado no Downloads para anexar.")
            return False

        log(f"🌐 Abrindo o NODRI para anexar: {os.path.basename(caminho_excel)}")
        driver.get(NODRI_UPLOAD_LOGIN_URL)
        time.sleep(4)

        # 1) login
        campo_login = WebDriverWait(driver, t_elem).until(
            EC.presence_of_element_located((By.XPATH, xp["login"])))
        campo_login.clear(); campo_login.send_keys(nodri_login)
        # 2) senha
        campo_senha = driver.find_element(By.XPATH, xp["senha"])
        campo_senha.clear(); campo_senha.send_keys(nodri_senha)
        # 3) entrar
        esperar_clicar(xp["entrar"], t_elem, "entrou no NODRI")
        time.sleep(t_login)

        # 4) vai DIRETO para a tela de importar. No desktop não existe o menu ☰,
        #    e ir pela URL evita depender da posição do card (que muda por salão).
        base = NODRI_UPLOAD_LOGIN_URL.rsplit("/login", 1)[0]
        url_import = base + "/salon/relatorios/importar-excel"
        log("   → abrindo a tela de importar")
        driver.get(url_import)
        time.sleep(t_passo)

        # 5) anexa o arquivo direto no campo de upload (sem janela do Windows)
        try:
            file_input = WebDriverWait(driver, t_elem).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='file']")))
        except Exception:
            # fallback: passa pela tela de Relatórios e clica em Importar (por texto)
            driver.get(base + "/salon/relatorios"); time.sleep(t_passo)
            try:
                esperar_clicar("//button[normalize-space()='Importar']", t_elem, "clicou em Importar")
                time.sleep(t_passo)
            except Exception:
                pass
            file_input = WebDriverWait(driver, t_elem).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='file']")))
        file_input.send_keys(os.path.abspath(caminho_excel))
        log("   ✔ arquivo anexado")
        time.sleep(t_passo)

        # 6) confirma clicando em "Importar Dados para o Sistema" (nunca nos botões
        #    de Limpar/Reconstruir — o seletor é por texto exato do botão certo).
        alvo_conf = xpath_confirmar or "//button[contains(normalize-space(.), 'Importar Dados')]"
        log("   → confirmando a importação")
        esperar_clicar(alvo_conf, t_elem, "importação enviada")
        time.sleep(t_anexo)

        log("✅ Excel importado no NODRI.")
        return True

    except Exception as e:
        log(f"❌ Falha ao anexar no NODRI: {e}")
        logging.error(f"upload_excel_para_nodri: {e}")
        return False


def _periodo_mes_atual():
    """Período do mês corrente: do dia 01 até o ÚLTIMO dia do mês (dd/mm/aaaa)."""
    hoje = datetime.now()
    ultimo_dia = calendar.monthrange(hoje.year, hoje.month)[1]
    di = f"01/{hoje.month:02d}/{hoje.year}"
    dfim = f"{ultimo_dia:02d}/{hoje.month:02d}/{hoje.year}"
    return hoje.year, hoje.month, di, dfim


def _impedir_suspensao(log=None):
    """Diz ao Windows para NÃO suspender/dormir enquanto o robô trabalha.
    Sem isso, o notebook na bateria dorme no meio da coleta e o navegador morre
    ('invalid session id'). Mantém o sistema acordado, mas deixa a tela apagar."""
    try:
        import ctypes
        ES_CONTINUOUS = 0x80000000
        ES_SYSTEM_REQUIRED = 0x00000001
        ctypes.windll.kernel32.SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED)
    except Exception as e:
        if log:
            log(f"⚠ não consegui impedir a suspensão: {e}")


def _liberar_suspensao():
    """Libera o sistema para dormir normalmente de novo (fim do trabalho)."""
    try:
        import ctypes
        ES_CONTINUOUS = 0x80000000
        ctypes.windll.kernel32.SetThreadExecutionState(ES_CONTINUOUS)
    except Exception:
        pass


def processar_salao(salao, log=None, xpath_confirmar_nodri="", so_coleta=False, tempos=None):
    """Roda o processo COMPLETO de um salão, do início ao fim:
      1) abre o Chrome e faz login no avec.beauty do salão;
      2) coleta o mês atual e gera o Excel na pasta Downloads;
      3) faz login no NODRI do salão e anexa esse Excel.
    Reaproveita o mesmo navegador entre a coleta e a implantação.
    `tempos` = tempos configuráveis do NODRI (se None, lê do agendamento salvo).
    Retorna True se chegou até o fim; False se falhou em algum passo."""
    if log is None:
        log = lambda m: logging.info(m)
    if tempos is None:
        tempos = carregar_saloes_cfg().get("agendamento", {}).get("nodri_tempos")
    nome = salao.get("nome") or "(sem nome)"
    log(f"\n========== SALÃO: {nome} ==========")
    _impedir_suspensao(log)   # não deixa o PC dormir durante o trabalho

    coleta = None
    try:
        # 1) base de dados (Excel novo em Downloads) + coletor
        base = BaseDadosNodri()
        coleta = SistemaColetaNodri()
        coleta.set_base_dados(base)
        if salao.get("avec_url"):
            coleta.configuracoes_editaveis["urls"]["login"] = salao["avec_url"]

        log("🔧 Abrindo o Chrome…")
        coleta.iniciar_driver()

        log("🔐 Login no avec.beauty…")
        if not coleta.fazer_login(salao.get("avec_email", ""), salao.get("avec_senha", "")):
            log("❌ Login no avec falhou.")
            return False

        # 2) coleta do mês atual + salva o Excel
        ano, mes, di, dfim = _periodo_mes_atual()
        log(f"📊 Coletando {MESES_PT[mes]}/{ano} ({di} a {dfim})…")
        dados = coleta.coletar_mes_completo(ano, mes, di, dfim)
        if dados:
            base.substituir_mes(ano, mes, dados)
        base.salvar()

        excel = base.arquivo if os.path.exists(base.arquivo) else ultimo_excel_downloads()
        if not excel or not os.path.exists(excel):
            log("❌ Excel não foi gerado; nada para implantar.")
            return False
        log(f"📁 Excel gerado: {os.path.basename(excel)}")

        if so_coleta:
            return True

        # 3) implanta o Excel no NODRI do salão (mesmo navegador)
        ok = upload_excel_para_nodri(
            coleta.driver,
            salao.get("nodri_login", ""),
            salao.get("nodri_senha", ""),
            excel,
            xpaths=salao.get("nodri_xpaths"),
            xpath_confirmar=xpath_confirmar_nodri,
            log=log,
            tempos=tempos,
        )
        return ok

    except Exception as e:
        log(f"❌ Erro no salão {nome}: {e}")
        logging.error(f"processar_salao {nome}: {e}")
        return False
    finally:
        try:
            if coleta is not None:
                coleta.fechar_driver()
        except Exception:
            pass
        _liberar_suspensao()   # libera o PC para dormir de novo


# ----------------------------------------------------------------------------
# ORQUESTRADOR — decide a ordem/ritmo (ciclo ou horário) e registra no Windows
# ----------------------------------------------------------------------------

def _log_auto(msg):
    """Log da execução automática: vai para o arquivo (AppData) e para o console."""
    try:
        with open(os.path.join(_PASTA_APPDATA_NODRI, "auto_execucao.log"), "a", encoding="utf-8") as f:
            f.write(f"[{datetime.now():%d/%m/%Y %H:%M:%S}] {msg}\n")
    except Exception:
        pass
    logging.info(msg)


def _hhmm_para_min(txt, padrao=0):
    try:
        h, m = str(txt).split(":")
        return int(h) * 60 + int(m)
    except Exception:
        return padrao


def _normalizar_hora(txt, padrao="06:00"):
    """Aceita '2:27', '02:27', '2h27' etc. e devolve sempre 'HH:MM' (dois dígitos),
    formato exigido pelo Agendador do Windows. Se for inválido, usa o padrão."""
    try:
        t = str(txt).strip().lower().replace("h", ":").replace(" ", "")
        h, m = t.split(":")[:2]
        h, m = int(h), int(m)
        if 0 <= h <= 23 and 0 <= m <= 59:
            return f"{h:02d}:{m:02d}"
    except Exception:
        pass
    return padrao


def dentro_da_janela(ag) -> bool:
    """True se o horário atual está dentro da janela de funcionamento do ciclo.
    Suporta janela normal (07:00–22:00) e virada de dia (22:00–06:00)."""
    ciclo = (ag or {}).get("ciclo", {})
    ini = _hhmm_para_min(ciclo.get("janela_inicio", "07:00"), 7 * 60)
    fim = _hhmm_para_min(ciclo.get("janela_fim", "22:00"), 22 * 60)
    agora = datetime.now().hour * 60 + datetime.now().minute
    if ini <= fim:
        return ini <= agora <= fim
    return agora >= ini or agora <= fim   # janela que vira o dia


def rodar_um_salao(salao_id, log=None, cfg=None):
    """Roda um único salão (pelo id). Usado pelo modo 'horário por salão'."""
    if log is None:
        log = _log_auto
    if cfg is None:
        cfg = carregar_saloes_cfg()
    alvo = next((s for s in cfg.get("saloes", []) if s.get("id") == salao_id), None)
    if not alvo:
        log(f"⚠ Salão id={salao_id} não encontrado.")
        return False
    if not alvo.get("ativo", True):
        log(f"⏸ Salão {alvo.get('nome')} está pausado; nada a fazer.")
        return False
    conf = cfg.get("agendamento", {}).get("xpath_confirmar_nodri", "")
    return processar_salao(alvo, log=log, xpath_confirmar_nodri=conf)


def rodar_todos(log=None, cfg=None):
    """Roda todos os salões ativos uma vez, em sequência (sem ciclo)."""
    if log is None:
        log = _log_auto
    if cfg is None:
        cfg = carregar_saloes_cfg()
    ativos = saloes_ativos(cfg)
    conf = cfg.get("agendamento", {}).get("xpath_confirmar_nodri", "")
    log(f"▶ Rodando {len(ativos)} salão(ões) ativos, um após o outro.")
    for s in ativos:
        processar_salao(s, log=log, xpath_confirmar_nodri=conf)
    log("■ Fim da rodada de todos os salões.")


def rodar_ciclo(log=None, cfg=None):
    """Modo CICLO: roda salão 1, espera X min, salão 2, … e recomeça, em loop,
    enquanto estiver dentro da janela (ex.: 07:00–22:00). Ao sair da janela,
    encerra (o Agendador do Windows reabre no dia seguinte)."""
    if log is None:
        log = _log_auto
    if cfg is None:
        cfg = carregar_saloes_cfg()
    ag = cfg.get("agendamento", {})
    intervalo = max(0, int(ag.get("ciclo", {}).get("intervalo_min", 5))) * 60
    conf = ag.get("xpath_confirmar_nodri", "")

    if not dentro_da_janela(ag):
        log("⏸ Fora da janela de funcionamento; encerrando.")
        return

    log("🔁 Iniciando o CICLO automático.")
    while dentro_da_janela(ag):
        cfg = carregar_saloes_cfg()          # relê a cada volta (pega mudanças da tela)
        ativos = saloes_ativos(cfg)
        if not ativos:
            log("⚠ Nenhum salão ativo cadastrado; encerrando o ciclo.")
            return
        for s in ativos:
            if not dentro_da_janela(ag):
                log("⏹ Janela encerrada no meio da volta; parando.")
                return
            processar_salao(s, log=log, xpath_confirmar_nodri=conf)
            # espera entre um salão e o próximo, checando a janela
            esperou = 0
            while esperou < intervalo and dentro_da_janela(ag):
                time.sleep(min(30, intervalo - esperou))
                esperou += 30
    log("🌙 Janela encerrada; ciclo finalizado até o próximo período.")


# ----------------------------------------------------------------------------
# AGENDADOR DO WINDOWS — cria/atualiza as tarefas para o programa abrir sozinho
# ----------------------------------------------------------------------------

_TASK_PREFIXO = "NODRI_AUTO_"


def _garantir_launcher_bat() -> str:
    """Cria (no AppData, caminho SEM espaços) um .bat que entra na pasta do
    programa e o executa. Assim o Agendador do Windows não precisa lidar com o
    caminho cheio de espaços ('roda todos os dias') — o .bat cuida das aspas."""
    pythonw = os.path.join(os.path.dirname(sys.executable), "pythonw.exe")
    if not os.path.exists(pythonw):
        pythonw = sys.executable
    script = os.path.abspath(__file__)
    pasta = os.path.dirname(script)
    bat = os.path.join(_PASTA_APPDATA_NODRI, "rodar_auto.bat")
    conteudo = (
        "@echo off\r\n"
        f'cd /d "{pasta}"\r\n'
        f'"{pythonw}" "{script}" %*\r\n'
    )
    try:
        with open(bat, "w", encoding="utf-8") as f:
            f.write(conteudo)
    except Exception as e:
        logging.error(f"Erro ao criar launcher .bat: {e}")
    return bat


def _comando_do_programa(flag) -> str:
    """Linha de comando que o Windows deve executar para relançar este programa
    em modo automático (com a flag dada)."""
    if getattr(sys, "frozen", False):
        return f'"{sys.executable}" {flag}'
    bat = _garantir_launcher_bat()
    return f'"{bat}" {flag}'


def _comando_e_args(flag):
    """Programa a executar + argumentos, separados (para a tarefa em XML)."""
    if getattr(sys, "frozen", False):
        return sys.executable, flag
    return _garantir_launcher_bat(), flag


def _registrar_tarefa_windows(nome, hora, flag, log=None) -> bool:
    """Cria a tarefa via XML — assim conseguimos LIBERAR a execução na bateria
    (DisallowStartIfOnBatteries=false), coisa que o schtasks /Create simples não
    permite. Sem isso, o Windows não roda a tarefa quando está sem carregador."""
    import subprocess, tempfile
    from xml.sax.saxutils import escape
    if log is None:
        log = _log_auto
    cmd, args = _comando_e_args(flag)
    hhmm = _normalizar_hora(hora)
    hoje = datetime.now().strftime("%Y-%m-%d")
    xml = (
        '<?xml version="1.0" encoding="UTF-16"?>\n'
        '<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">\n'
        '  <RegistrationInfo><Description>NODRI Robo</Description></RegistrationInfo>\n'
        '  <Triggers>\n'
        '    <CalendarTrigger>\n'
        f'      <StartBoundary>{hoje}T{hhmm}:00</StartBoundary>\n'
        '      <Enabled>true</Enabled>\n'
        '      <ScheduleByDay><DaysInterval>1</DaysInterval></ScheduleByDay>\n'
        '    </CalendarTrigger>\n'
        '  </Triggers>\n'
        '  <Principals>\n'
        '    <Principal id="Author"><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal>\n'
        '  </Principals>\n'
        '  <Settings>\n'
        '    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>\n'
        '    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>\n'
        '    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>\n'
        '    <StartWhenAvailable>true</StartWhenAvailable>\n'
        '    <AllowHardTerminate>true</AllowHardTerminate>\n'
        '    <Enabled>true</Enabled>\n'
        '    <ExecutionTimeLimit>PT2H</ExecutionTimeLimit>\n'
        '  </Settings>\n'
        '  <Actions Context="Author">\n'
        f'    <Exec><Command>{escape(cmd)}</Command><Arguments>{escape(args)}</Arguments></Exec>\n'
        '  </Actions>\n'
        '</Task>\n'
    )
    caminho = None
    try:
        fd, caminho = tempfile.mkstemp(suffix=".xml")
        os.close(fd)
        with open(caminho, "w", encoding="utf-16") as f:
            f.write(xml)
        r = subprocess.run(["schtasks", "/Create", "/F", "/TN", nome, "/XML", caminho],
                           capture_output=True, text=True)
        if r.returncode == 0:
            return True
        log(f"⚠ Falha ao criar '{nome}': {(r.stderr or r.stdout).strip()}")
        return False
    except Exception as e:
        log(f"⚠ Erro ao criar tarefa '{nome}': {e}")
        return False
    finally:
        if caminho:
            try:
                os.remove(caminho)
            except Exception:
                pass


def remover_tarefas_windows(log=None):
    """Apaga todas as tarefas NODRI_AUTO_* do Agendador do Windows."""
    import subprocess
    if log is None:
        log = _log_auto
    try:
        saida = subprocess.run(["schtasks", "/Query", "/FO", "CSV", "/NH"],
                               capture_output=True, text=True, shell=False)
        nomes = set()
        for linha in (saida.stdout or "").splitlines():
            campo = linha.split('","')[0].strip('"').lstrip("\\")
            if campo.startswith(_TASK_PREFIXO):
                nomes.add(campo)
        for nome in nomes:
            subprocess.run(["schtasks", "/Delete", "/TN", nome, "/F"],
                           capture_output=True, text=True)
        if nomes:
            log(f"🧹 Tarefas antigas removidas: {len(nomes)}")
    except Exception as e:
        log(f"⚠ Não consegui limpar tarefas antigas: {e}")


def atualizar_agendador_windows(cfg=None, log=None) -> bool:
    """Recria as tarefas do Windows conforme o modo escolhido:
      • ciclo  → 1 tarefa diária no início da janela, roda o ciclo e fecha;
      • horário → 1 tarefa diária por salão, cada uma no horário do salão.
    Retorna True se registrou com sucesso."""
    import subprocess
    if log is None:
        log = _log_auto
    if cfg is None:
        cfg = carregar_saloes_cfg()

    remover_tarefas_windows(log=log)
    ag = cfg.get("agendamento", {})
    modo = ag.get("modo", "ciclo")
    criadas = 0

    def criar(nome, hora, flag):
        # via XML para poder LIBERAR bateria (roda no carregador E na bateria)
        return _registrar_tarefa_windows(nome, hora, flag, log=log)

    try:
        if modo == "ciclo":
            hora = ag.get("ciclo", {}).get("janela_inicio", "07:00")
            if criar(f"{_TASK_PREFIXO}CICLO", hora, "--auto-ciclo"):
                criadas += 1
        else:
            for s in saloes_ativos(cfg):
                nome = f"{_TASK_PREFIXO}SALAO_{s.get('id')}"
                hora = s.get("horario", "06:00")
                if criar(nome, hora, f"--auto-salao {s.get('id')}"):
                    criadas += 1
        log(f"✅ Agendamento atualizado no Windows ({criadas} tarefa[s], modo {modo}).")
        return criadas > 0
    except Exception as e:
        log(f"❌ Erro ao atualizar o Agendador do Windows: {e}")
        return False


def tela_primeiro_acesso(root) -> bool:
    """
    Mostra wizard de configuração na primeira execução.
    Retorna True se configurado com sucesso, False se cancelado.
    Reabre se algum campo obrigatório estiver faltando.
    """
    cfg = _carregar_config_global()

    # Pula wizard só se todos os campos obrigatórios estiverem preenchidos
    if cfg.get('url_salao') and cfg.get('nome_salao') and cfg.get('email_padrao'):
        return True

    FP = FONT_PRIMARY
    resultado = {'ok': False}

    win = tk.Toplevel(root)
    win.title("NODRI — Configuração Inicial")
    win.configure(bg='#0f3460')
    win.resizable(False, False)
    win.grab_set()
    win.focus_force()

    try:
        import ctypes
        sw = ctypes.windll.user32.GetSystemMetrics(0)
        sh = ctypes.windll.user32.GetSystemMetrics(1)
        w, h = 620, 620
        win.geometry(f"{w}x{h}+{(sw-w)//2}+{(sh-h)//2}")
    except Exception:
        win.geometry("620x620")

    # ── Header ───────────────────────────────────────────────────────────────
    tk.Label(win, text="⚙️  CONFIGURAÇÃO INICIAL",
             font=(FP, 18, 'bold'), fg='white', bg='#0f3460').pack(pady=(25, 3))
    tk.Label(win, text="Preencha uma vez — salvo automaticamente no seu computador",
             font=(FP, 10), fg='#a0c4ff', bg='#0f3460').pack(pady=(0, 15))

    frame = tk.Frame(win, bg='white', padx=35, pady=20)
    frame.pack(fill='both', expand=True, padx=20, pady=(0, 15))
    frame.columnconfigure(0, weight=1)

    def rotulo(texto, row):
        tk.Label(frame, text=texto, font=(FP, 10, 'bold'),
                 fg='#0f3460', bg='white').grid(row=row, column=0, sticky='w', pady=(12, 0))

    def dica(texto, row):
        tk.Label(frame, text=texto, font=(FP, 8),
                 fg='#888', bg='white').grid(row=row, column=0, sticky='w', pady=(1, 0))

    # Campo 1 — Nome do salão
    rotulo("🏠  Nome do Salão", 0)
    e_nome = tk.Entry(frame, width=50, font=(FP, 11))
    e_nome.grid(row=1, column=0, sticky='ew', pady=(3, 0))
    e_nome.insert(0, cfg.get('nome_salao', ''))

    # Campo 2 — URL
    rotulo("🔗  URL do painel avec.beauty", 2)
    e_url = tk.Entry(frame, width=50, font=(FP, 11))
    e_url.grid(row=3, column=0, sticky='ew', pady=(3, 0))
    e_url.insert(0, cfg.get('url_salao', 'https://admin.avec.beauty/SEU-SALAO/admin'))
    dica("Ex: https://admin.avec.beauty/minhasalon/admin", 4)

    # Campo 3 — E-mail
    rotulo("📧  E-mail de acesso ao avec.beauty", 5)
    e_email = tk.Entry(frame, width=50, font=(FP, 11))
    e_email.grid(row=6, column=0, sticky='ew', pady=(3, 0))
    e_email.insert(0, cfg.get('email_padrao', ''))

    # Campo 4 — Senha
    rotulo("🔒  Senha de acesso ao avec.beauty", 7)
    senha_frame = tk.Frame(frame, bg='white')
    senha_frame.grid(row=8, column=0, sticky='ew', pady=(3, 0))
    senha_frame.columnconfigure(0, weight=1)

    e_senha = tk.Entry(senha_frame, width=42, font=(FP, 11), show='*')
    e_senha.grid(row=0, column=0, sticky='ew')
    e_senha.insert(0, cfg.get('senha_padrao', ''))

    mostrar_var = tk.BooleanVar(value=False)
    def toggle_senha():
        e_senha.config(show='' if mostrar_var.get() else '*')
    tk.Checkbutton(senha_frame, text="Mostrar", variable=mostrar_var,
                   command=toggle_senha, bg='white',
                   font=(FP, 9), fg='#555').grid(row=0, column=1, padx=(8, 0))

    dica("Mesmos dados que você usa para entrar no site do salão.", 9)

    # Status
    status = tk.Label(frame, text='', font=(FP, 9), fg='#dc3545', bg='white')
    status.grid(row=10, column=0, pady=(10, 0))

    def salvar():
        nome  = e_nome.get().strip()
        url   = e_url.get().strip()
        email = e_email.get().strip()
        senha = e_senha.get().strip()

        if not nome:
            status.config(text="⚠️  Digite o nome do salão."); return
        if 'avec.beauty' not in url or 'SEU-SALAO' in url:
            status.config(text="⚠️  URL inválida. Substitua SEU-SALAO pelo slug do seu salão."); return
        if not email or '@' not in email:
            status.config(text="⚠️  Digite um e-mail válido."); return
        if not senha:
            status.config(text="⚠️  Digite a senha de acesso."); return

        _salvar_config_global({
            'nome_salao':   nome,
            'url_salao':    url,
            'email_padrao': email,
            'senha_padrao': senha,
        })
        resultado['ok'] = True
        win.destroy()

    tk.Button(frame, text="✅  SALVAR E ENTRAR",
              command=salvar,
              bg='#28a745', fg='white',
              font=(FP, 13, 'bold'),
              padx=30, pady=12,
              relief='flat', cursor='hand2').grid(row=11, column=0, pady=20)

    root.wait_window(win)
    return resultado['ok']


def tela_ativacao_licenca(root, licenca: SistemaLicenca) -> bool:
    """
    Mostra tela de ativação de licença.
    Retorna True se ativado, False se o usuário fechou sem ativar.
    """
    FP = FONT_PRIMARY
    resultado = {'ok': False}

    win = tk.Toplevel(root)
    win.title("NODRI — Ativação de Licença")
    win.configure(bg='#0f3460')
    win.resizable(False, False)
    win.grab_set()
    win.focus_force()

    try:
        import ctypes
        sw = ctypes.windll.user32.GetSystemMetrics(0)
        sh = ctypes.windll.user32.GetSystemMetrics(1)
        w, h = 520, 400
        win.geometry(f"{w}x{h}+{(sw-w)//2}+{(sh-h)//2}")
    except Exception:
        win.geometry("520x400")

    tk.Label(win, text="🔐  ATIVAÇÃO DE LICENÇA",
             font=(FP, 18, 'bold'), fg='white', bg='#0f3460').pack(pady=(30, 5))
    tk.Label(win, text=f"Suporte: {SUPORTE_TELEFONE}  |  {SUPORTE_EMAIL}",
             font=(FP, 9), fg='#a0c4ff', bg='#0f3460').pack()

    frame = tk.Frame(win, bg='white', padx=30, pady=25)
    frame.pack(fill='both', expand=True, padx=20, pady=15)
    frame.columnconfigure(0, weight=1)

    tk.Label(frame, text="CNPJ ou CPF do titular:",
             font=(FP, 10, 'bold'), fg='#0f3460', bg='white').pack(anchor='w')
    e_doc = tk.Entry(frame, width=30, font=(FP, 11))
    e_doc.pack(fill='x', pady=(4, 14))

    tk.Label(frame, text="Chave de Licença:",
             font=(FP, 10, 'bold'), fg='#0f3460', bg='white').pack(anchor='w')
    e_chave = tk.Entry(frame, width=30, font=(FP, 11))
    e_chave.pack(fill='x', pady=(4, 4))
    tk.Label(frame, text="Fornecida pelo revendedor após o pagamento.",
             font=(FP, 8), fg='#888', bg='white').pack(anchor='w')

    status = tk.Label(frame, text='', font=(FP, 10), bg='white')
    status.pack(pady=12)

    def ativar():
        ok, msg = licenca.ativar(e_doc.get(), e_chave.get())
        cor = '#28a745' if ok else '#dc3545'
        status.config(text=msg, fg=cor)
        if ok:
            resultado['ok'] = True
            win.after(1500, win.destroy)

    tk.Button(frame, text="🔑  ATIVAR",
              command=ativar,
              bg='#0f3460', fg='white',
              font=(FP, 12, 'bold'),
              padx=20, pady=8, relief='flat', cursor='hand2').pack()

    root.wait_window(win)
    return resultado['ok']


# ============================================================================
# NOVA CLASSE: GERENCIADOR DE BACKUP
# ============================================================================

class GerenciadorBackup:
    """Gerencia backups automáticos e manuais da base de dados"""

    def __init__(self, arquivo_base=ARQUIVO_BASE_DADOS, pasta_backups=PASTA_BACKUPS):
        self.arquivo_base = arquivo_base
        self.pasta_backups = pasta_backups
        self.historico_backups = []
        self.criar_pasta_backups()
        self.carregar_historico()

    def criar_pasta_backups(self):
        """Cria pasta de backups se não existir"""
        if not os.path.exists(self.pasta_backups):
            os.makedirs(self.pasta_backups)
            logging.info(f"📁 Pasta de backups criada: {self.pasta_backups}")

    def procurar_base_em_todo_pc(self):
        """Procura a base de dados em todas as unidades do computador"""
        logging.info("🔍 Procurando base de dados em todo computador...")

        unidades = []
        # Detectar unidades no Windows
        if sys.platform == "win32":
            for letra in range(ord('C'), ord('Z') + 1):
                unidade = f"{chr(letra)}:\\"
                if os.path.exists(unidade):
                    unidades.append(unidade)
        else:
            # Linux/Mac - procurar a partir da raiz
            unidades = ['/']

        bases_encontradas = []

        for unidade in unidades:
            try:
                for root, dirs, files in os.walk(unidade):
                    # Ignorar pastas do sistema para não travar
                    if any(pasta in root.lower() for pasta in
                           ['windows', 'program files', 'system32', '$recycle.bin', 'temp']):
                        continue

                    if os.path.basename(self.arquivo_base) in files:
                        caminho_completo = os.path.join(root, os.path.basename(self.arquivo_base))
                        bases_encontradas.append(caminho_completo)
                        logging.info(f"✅ Base encontrada: {caminho_completo}")

            except Exception as e:
                continue  # Ignorar erros de permissão

        return bases_encontradas

    def carregar_historico(self):
        """Carrega histórico de backups existentes"""
        try:
            if os.path.exists(self.pasta_backups):
                backups = glob.glob(os.path.join(self.pasta_backups, "backup_*.zip"))
                backups.sort(key=os.path.getmtime, reverse=True)

                for backup in backups[:10]:  # Manter últimos 10 no histórico
                    nome = os.path.basename(backup)
                    # Formato: backup_YYYYMMDD_HHMMSS.zip
                    try:
                        data_str = nome.replace('backup_', '').replace('.zip', '')
                        data = datetime.strptime(data_str, '%Y%m%d_%H%M%S')
                        tamanho = os.path.getsize(backup) / (1024 * 1024)  # MB

                        self.historico_backups.append({
                            'arquivo': backup,
                            'data': data,
                            'tamanho_mb': round(tamanho, 2),
                            'nome': nome
                        })
                    except:
                        continue

            logging.info(f"📚 Histórico de backups carregado: {len(self.historico_backups)} backups")

        except Exception as e:
            logging.error(f"Erro ao carregar histórico de backups: {e}")

    def fazer_backup(self, tipo="manual"):
        """Faz backup da base de dados"""
        try:
            if not os.path.exists(self.arquivo_base):
                logging.error(f"❌ Base não encontrada: {self.arquivo_base}")
                return None

            # Criar nome do arquivo
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            nome_backup = f"backup_{timestamp}_{tipo}.zip"
            caminho_backup = os.path.join(self.pasta_backups, nome_backup)

            # Criar backup
            shutil.make_archive(
                caminho_backup.replace('.zip', ''),
                'zip',
                os.path.dirname(self.arquivo_base),
                os.path.basename(self.arquivo_base)
            )

            # Adicionar ao histórico
            info_backup = {
                'arquivo': caminho_backup,
                'data': datetime.now(),
                'tamanho_mb': round(os.path.getsize(caminho_backup) / (1024 * 1024), 2),
                'nome': nome_backup,
                'tipo': tipo
            }

            self.historico_backups.insert(0, info_backup)

            # Manter apenas últimos 10 backups
            if len(self.historico_backups) > 10:
                removidos = self.historico_backups[10:]
                self.historico_backups = self.historico_backups[:10]

                for backup in removidos:
                    try:
                        if os.path.exists(backup['arquivo']):
                            os.remove(backup['arquivo'])
                    except:
                        pass

            logging.info(f"✅ Backup criado: {nome_backup} ({info_backup['tamanho_mb']} MB)")
            return caminho_backup

        except Exception as e:
            logging.error(f"❌ Erro ao fazer backup: {e}")
            return None

    def restaurar_backup(self, arquivo_backup):
        """Restaura um backup específico"""
        try:
            if not os.path.exists(arquivo_backup):
                logging.error(f"❌ Backup não encontrado: {arquivo_backup}")
                return False

            # Fazer backup do atual antes de restaurar
            self.fazer_backup("pre_restauracao")

            # Remover base atual se existir
            if os.path.exists(self.arquivo_base):
                os.remove(self.arquivo_base)

            # Extrair backup
            import zipfile
            with zipfile.ZipFile(arquivo_backup, 'r') as zip_ref:
                zip_ref.extractall(os.path.dirname(self.arquivo_base))

            logging.info(f"✅ Backup restaurado: {arquivo_backup}")
            return True

        except Exception as e:
            logging.error(f"❌ Erro ao restaurar backup: {e}")
            return False

    def get_ultimos_backups(self, quantidade=3):
        """Retorna os últimos N backups"""
        return self.historico_backups[:quantidade]

    def verificar_integridade(self, arquivo_backup):
        """Verifica integridade de um arquivo de backup"""
        try:
            import zipfile
            with zipfile.ZipFile(arquivo_backup, 'r') as zip_ref:
                # Testar se o zip está íntegro
                test_result = zip_ref.testzip()
                if test_result is not None:
                    return False, f"Arquivo corrompido: {test_result}"

                # Verificar se contém a base
                if os.path.basename(self.arquivo_base) not in zip_ref.namelist():
                    return False, "Backup não contém a base de dados"

            return True, "Backup íntegro"

        except Exception as e:
            return False, f"Erro na verificação: {str(e)}"

    def backup_diario_automatico(self):
        """Executa backup automático diário (para ser chamado por agendador)"""
        ultimo_backup = None

        if self.historico_backups:
            ultimo_backup = self.historico_backups[0]['data']

        hoje = datetime.now().date()

        # Se não tem backup hoje, fazer
        if not ultimo_backup or ultimo_backup.date() < hoje:
            logging.info("⏰ Executando backup automático diário...")
            return self.fazer_backup("automatico")

        return None


# ============================================================================
# CLASSE BASE DE DADOS (ATUALIZADA COM NOVAS ABAS)
# ============================================================================

class BaseDadosNodri:
    """Gerencia a base de dados central em Excel"""

    def __init__(self, arquivo=ARQUIVO_BASE_DADOS):
        self.arquivo = arquivo
        self.df_geral = None
        # Sempre cria uma base nova (arquivo com timestamp único por sessão)
        logging.info(f"📄 Criando base de dados: {self.arquivo}")
        self.criar_base_nova()

    def limpar_todos_duplicados(self):
        """Remove TODOS os registros duplicados de todas as abas"""
        print("\n" + "=" * 60)
        print("🧹 LIMPANDO DADOS DUPLICADOS EM TODAS AS ABAS")
        print("=" * 60)

        abas = ['PERIODOS', 'RESUMO_MENSAL', 'FATURAMENTO_DIARIO',
                'SERVICOS', 'PRODUTOS', 'PROF_PAGAMENTOS', 'PROF_TICKET',
                'PROF_PREFERENCIA', 'PROF_OCUPACAO', 'PROF_SERVICOS',
                'PROF_PRODUTOS', 'SALAO_GERAL', 'TAXA_RETORNO_PROFISSIONAL',
                'TAXA_RETORNO_SALAO']

        for aba in abas:
            if aba in self.df_geral:
                df = self.df_geral[aba]
                if not df.empty and 'ano' in df.columns and 'mes' in df.columns:
                    antes = len(df)
                    # Manter apenas o primeiro registro de cada ano/mês
                    df = df.drop_duplicates(subset=['ano', 'mes'], keep='first')
                    depois = len(df)
                    self.df_geral[aba] = df
                    if antes != depois:
                        print(f"   ✅ {aba}: {antes} -> {depois} (removidos {antes - depois})")

        self.salvar()
        print("=" * 60)

    def _verificar_abas_existentes(self):
        """Verifica se abas obrigatórias existem, cria se não existirem (sem FEEDBACK)."""
        abas_extras = {
            'TAXA_RETORNO_PROFISSIONAL': pd.DataFrame(
                columns=['ano', 'mes', 'profissional', 'total_clientes', 'clientes_retornaram', 'taxa_retorno']),
            'TAXA_RETORNO_SALAO': pd.DataFrame(
                columns=['ano', 'mes', 'total_clientes', 'clientes_retornaram', 'taxa_retorno']),
            'CADASTRAR_PROFISSIONAL': pd.DataFrame(
                columns=['nome_completo', 'apelido', 'categoria', 'ativo']),
            # Base criada antes do 0033 nao tem esta aba. Nasce vazia aqui,
            # para a planilha ter sempre a mesma cara — a coleta do 0033
            # depois substitui o conteudo.
            'TABELA_PRECOS': pd.DataFrame(
                columns=['servico', 'categoria', 'preco', 'duracao', 'coletado_em']),
            'PRODUTOS_RAW': pd.DataFrame(
                columns=['ano', 'mes', 'profissional', 'data_venda', 'num_comanda',
                         'cliente', 'produto', 'marca', 'categoria', 'qtd', 'valor', 'total']),
            'COMANDAS_RAW': pd.DataFrame(
                columns=['ano', 'mes', 'num_comanda', 'data', 'cliente',
                         'caixa_responsavel', 'valor']),
        }
        for aba, df_vazio in abas_extras.items():
            if aba not in self.df_geral:
                self.df_geral[aba] = df_vazio
                logging.info(f"✅ Nova aba criada: {aba}")

    def substituir_mes(self, ano, mes, dados_novos):
        """
        SUBSTITUI COMPLETAMENTE os dados de um mês
        - Remove TODOS os dados antigos do mês
        - Insere os NOVOS dados (vindos do site)
        - Garante que não há mistura entre dados antigos e novos
        """
        try:
            logging.info(f"=" * 60)
            logging.info(f"🔄 SUBSTITUINDO MÊS {MESES_PT[mes]}/{ano}")
            logging.info(f"=" * 60)

            # ============================================================
            # LISTA DE TODAS AS ABAS QUE SERÃO SUBSTITUÍDAS
            # ============================================================
            abas_para_substituir = [
                'PERIODOS',
                'RESUMO_MENSAL',
                'FATURAMENTO_DIARIO',
                'SERVICOS',
                'PRODUTOS',
                'PROF_PAGAMENTOS',
                'PROF_TICKET',
                'PROF_PREFERENCIA',
                'PROF_OCUPACAO',
                'PROF_SERVICOS',
                'PROF_PRODUTOS',
                'SALAO_GERAL',
                'METAS',
                'FEEDBACK',
                'TAXA_RETORNO_SALAO',
                'TAXA_RETORNO_PROFISSIONAL',
                'ATENDIMENTOS_RAW',
                'AGENDAMENTOS_RAW',
                'PRODUTOS_RAW',
                'COMANDAS_RAW',
            ]

            # ============================================================
            # PASSO 1: REMOVER TODOS OS DADOS ANTIGOS DESTE MÊS
            # ============================================================
            logging.info("📤 REMOVENDO dados antigos...")

            for aba in abas_para_substituir:
                if aba in self.df_geral:
                    df = self.df_geral[aba]
                    if not df.empty and 'ano' in df.columns and 'mes' in df.columns:
                        antes = len(df)
                        # REMOVER registros deste mês/ano
                        df = df[~((df['ano'] == ano) & (df['mes'] == mes))]
                        depois = len(df)
                        if antes != depois:
                            logging.info(f"   🗑️ {aba}: removidos {antes - depois} registros antigos")
                        self.df_geral[aba] = df

            # ============================================================
            # PASSO 2: INSERIR OS NOVOS DADOS
            # ============================================================
            logging.info("📥 INSERINDO novos dados...")

            periodo = f"{MESES_PT[mes]}/{ano}"
            data_coleta = datetime.now().strftime('%d/%m/%Y %H:%M:%S')

            # 1. PERIODOS
            df_novo = pd.DataFrame([{
                'ano': ano,
                'mes': mes,
                'data_inicio': dados_novos.get('data_inicio', ''),
                'data_fim': dados_novos.get('data_fim', ''),
                'data_coleta': data_coleta,
                'status': 'COMPLETO'
            }])
            self.df_geral['PERIODOS'] = pd.concat([self.df_geral.get('PERIODOS', pd.DataFrame()), df_novo],
                                                  ignore_index=True)
            logging.info(f"   ✅ PERIODOS: 1 registro inserido")

            # 2. RESUMO_MENSAL
            if 'resumo' in dados_novos and dados_novos['resumo']:
                df_novo = pd.DataFrame([{
                    'ano': ano,
                    'mes': mes,
                    'periodo': periodo,
                    'faturamento_total': dados_novos['resumo'].get('faturamento_total', 0),
                    'ticket_medio': dados_novos['resumo'].get('ticket_medio', 0),
                    'clientes_atendidos': dados_novos['resumo'].get('clientes_atendidos', 0),
                    'clientes_novos': dados_novos['resumo'].get('clientes_novos', 0),
                    'faturamento_servicos': dados_novos['resumo'].get('faturamento_servicos', 0),
                    'faturamento_produtos': dados_novos['resumo'].get('faturamento_produtos', 0),
                    'percentual_servicos': dados_novos['resumo'].get('percentual_servicos', 0),
                    'percentual_produtos': dados_novos['resumo'].get('percentual_produtos', 0)
                }])
                self.df_geral['RESUMO_MENSAL'] = pd.concat(
                    [self.df_geral.get('RESUMO_MENSAL', pd.DataFrame()), df_novo], ignore_index=True)
                logging.info(f"   ✅ RESUMO_MENSAL: 1 registro inserido")

            # 3. FATURAMENTO_DIARIO
            if 'faturamento_diario' in dados_novos and dados_novos['faturamento_diario']:
                df_novo = pd.DataFrame([{
                    'ano': ano,
                    'mes': mes,
                    'data': item.get('data', ''),
                    'dia_semana': item.get('dia_semana', ''),
                    'valor': item.get('valor', 0)
                } for item in dados_novos['faturamento_diario']])
                self.df_geral['FATURAMENTO_DIARIO'] = pd.concat(
                    [self.df_geral.get('FATURAMENTO_DIARIO', pd.DataFrame()), df_novo], ignore_index=True)
                logging.info(f"   ✅ FATURAMENTO_DIARIO: {len(df_novo)} registros inseridos")

            # 4. SERVICOS
            if 'servicos' in dados_novos and dados_novos['servicos']:
                df_novo = pd.DataFrame([{
                    'ano': ano,
                    'mes': mes,
                    'servico': item.get('Serviço', item.get('servico', '')),
                    'quantidade': item.get('Quantidade', item.get('quantidade', 0))
                } for item in dados_novos['servicos']])
                self.df_geral['SERVICOS'] = pd.concat([self.df_geral.get('SERVICOS', pd.DataFrame()), df_novo],
                                                      ignore_index=True)
                logging.info(f"   ✅ SERVICOS: {len(df_novo)} registros inseridos")

            # 5. PRODUTOS
            if 'produtos' in dados_novos and dados_novos['produtos']:
                df_novo = pd.DataFrame([{
                    'ano': ano,
                    'mes': mes,
                    'produto': item.get('Produto', item.get('produto', '')),
                    'quantidade': item.get('Quantidade', item.get('quantidade', 0))
                } for item in dados_novos['produtos']])
                self.df_geral['PRODUTOS'] = pd.concat([self.df_geral.get('PRODUTOS', pd.DataFrame()), df_novo],
                                                      ignore_index=True)
                logging.info(f"   ✅ PRODUTOS: {len(df_novo)} registros inseridos")

            # 6. PROFISSIONAIS - TODAS AS SUB-ABAS
            if 'profissionais' in dados_novos:
                prof = dados_novos['profissionais']

                # 6.1 PROF_PAGAMENTOS
                if 'pagamentos' in prof and prof['pagamentos']:
                    df_novo = pd.DataFrame([{
                        'ano': ano,
                        'mes': mes,
                        'profissional': item.get('profissional', item.get('profissional_original', '')),
                        'categoria': item.get('categoria', ''),
                        'valor_a_pagar': item.get('valor_a_pagar', 0),
                        'desconto': item.get('desconto', 0)
                    } for item in prof['pagamentos']])
                    self.df_geral['PROF_PAGAMENTOS'] = pd.concat(
                        [self.df_geral.get('PROF_PAGAMENTOS', pd.DataFrame()), df_novo], ignore_index=True)
                    logging.info(f"   ✅ PROF_PAGAMENTOS: {len(df_novo)} registros inseridos")

                # 6.2 PROF_TICKET
                if 'ticket' in prof and prof['ticket']:
                    df_novo = pd.DataFrame([{
                        'ano': ano,
                        'mes': mes,
                        'profissional': item.get('profissional', item.get('profissional_original', '')),
                        'ticket_medio': item.get('ticket_medio', 0)
                    } for item in prof['ticket']])
                    self.df_geral['PROF_TICKET'] = pd.concat(
                        [self.df_geral.get('PROF_TICKET', pd.DataFrame()), df_novo], ignore_index=True)
                    logging.info(f"   ✅ PROF_TICKET: {len(df_novo)} registros inseridos")

                # 6.3 PROF_PREFERENCIA (A QUE ESTAVA DANDO PROBLEMA)
                if 'preferencia' in prof and prof['preferencia']:
                    df_novo = pd.DataFrame([{
                        'ano': ano,
                        'mes': mes,
                        'profissional': item.get('profissional', item.get('profissional_original', '')),
                        'clientes_preferencia': item.get('clientes_preferencia', 0),
                        'clientes_sem_preferencia': item.get('clientes_sem_preferencia', 0)
                    } for item in prof['preferencia']])
                    self.df_geral['PROF_PREFERENCIA'] = pd.concat(
                        [self.df_geral.get('PROF_PREFERENCIA', pd.DataFrame()), df_novo], ignore_index=True)
                    logging.info(f"   ✅ PROF_PREFERENCIA: {len(df_novo)} registros inseridos")
                    # Mostrar os valores para debug
                    for _, row in df_novo.iterrows():
                        logging.info(
                            f"      • {row['profissional']}: {row['clientes_preferencia']} pref / {row['clientes_sem_preferencia']} sem pref")

                # 6.4 PROF_OCUPACAO
                if 'ocupacao' in prof and prof['ocupacao']:
                    df_novo = pd.DataFrame([{
                        'ano': ano,
                        'mes': mes,
                        'profissional': item.get('profissional', item.get('profissional_original', '')),
                        'dias_trabalhados': item.get('dias_trabalhados', 0),
                        'taxa_ocupacao': item.get('taxa_ocupacao', 0)
                    } for item in prof['ocupacao']])
                    self.df_geral['PROF_OCUPACAO'] = pd.concat(
                        [self.df_geral.get('PROF_OCUPACAO', pd.DataFrame()), df_novo], ignore_index=True)
                    logging.info(f"   ✅ PROF_OCUPACAO: {len(df_novo)} registros inseridos")

                # 6.5 PROF_SERVICOS
                if 'servicos_detalhados' in prof and prof['servicos_detalhados']:
                    linhas = []
                    for item in prof['servicos_detalhados']:
                        profissional = item.get('profissional', '')
                        for servico, info in item.get('servicos', {}).items():
                            linhas.append({
                                'ano': ano,
                                'mes': mes,
                                'profissional': profissional,
                                'servico': servico,
                                'quantidade': info.get('quantidade', 0),
                                'valor': info.get('valor', 0)
                            })
                    if linhas:
                        df_novo = pd.DataFrame(linhas)
                        self.df_geral['PROF_SERVICOS'] = pd.concat(
                            [self.df_geral.get('PROF_SERVICOS', pd.DataFrame()), df_novo], ignore_index=True)
                        logging.info(f"   ✅ PROF_SERVICOS: {len(df_novo)} registros inseridos")

                # 6.6 PROF_PRODUTOS
                if 'produtos' in prof and prof['produtos']:
                    df_novo = pd.DataFrame([{
                        'ano': ano,
                        'mes': mes,
                        'profissional': item.get('profissional', item.get('profissional_original', '')),
                        'quantidade': item.get('total_produtos', 0)
                    } for item in prof['produtos']])
                    self.df_geral['PROF_PRODUTOS'] = pd.concat(
                        [self.df_geral.get('PROF_PRODUTOS', pd.DataFrame()), df_novo], ignore_index=True)
                    logging.info(f"   ✅ PROF_PRODUTOS: {len(df_novo)} registros inseridos")

            # 7. SALAO_GERAL
            if 'resumo' in dados_novos:
                df_novo = pd.DataFrame([{
                    'ano': ano,
                    'mes': mes,
                    'faturamento_total': dados_novos['resumo'].get('faturamento_total', 0),
                    'clientes_total': dados_novos['resumo'].get('clientes_atendidos', 0),
                    'servicos_total': len(dados_novos.get('servicos', [])),
                    'produtos_total': len(dados_novos.get('produtos', [])),
                    'taxa_conversao': (dados_novos['resumo'].get('clientes_novos', 0) / max(
                        dados_novos['resumo'].get('clientes_atendidos', 1), 1)) * 100,
                    'ticket_medio_geral': dados_novos['resumo'].get('ticket_medio', 0)
                }])
                self.df_geral['SALAO_GERAL'] = pd.concat([self.df_geral.get('SALAO_GERAL', pd.DataFrame()), df_novo],
                                                         ignore_index=True)
                logging.info(f"   ✅ SALAO_GERAL: 1 registro inserido")

            # 8. TAXA_RETORNO_SALAO
            if 'resumo' in dados_novos:
                total_clientes = dados_novos['resumo'].get('clientes_atendidos', 0)
                clientes_retornaram = int(total_clientes * 0.5)  # Exemplo, ajuste conforme sua regra
                taxa_retorno = (clientes_retornaram / max(total_clientes, 1)) * 100

                df_novo = pd.DataFrame([{
                    'ano': ano,
                    'mes': mes,
                    'total_clientes': total_clientes,
                    'clientes_retornaram': clientes_retornaram,
                    'taxa_retorno': round(taxa_retorno, 2)
                }])
                self.df_geral['TAXA_RETORNO_SALAO'] = pd.concat(
                    [self.df_geral.get('TAXA_RETORNO_SALAO', pd.DataFrame()), df_novo], ignore_index=True)
                logging.info(f"   ✅ TAXA_RETORNO_SALAO: 1 registro inserido")

            # 9. TAXA_RETORNO_PROFISSIONAL
            if 'profissionais' in dados_novos:
                linhas = []
                for prof_nome, prof_dados in dados_novos['profissionais'].items():
                    if prof_nome and isinstance(prof_dados, dict):
                        if 'preferencia' in prof_dados:
                            total = prof_dados['preferencia'].get('clientes_preferencia', 0) + prof_dados[
                                'preferencia'].get('clientes_sem_preferencia', 0)
                            retornaram = int(
                                prof_dados['preferencia'].get('clientes_preferencia', 0) * 0.7 + prof_dados[
                                    'preferencia'].get('clientes_sem_preferencia', 0) * 0.3)
                            taxa = (retornaram / max(total, 1)) * 100

                            linhas.append({
                                'ano': ano,
                                'mes': mes,
                                'profissional': prof_nome,
                                'total_clientes': total,
                                'clientes_retornaram': retornaram,
                                'taxa_retorno': round(taxa, 2)
                            })

                if linhas:
                    df_novo = pd.DataFrame(linhas)
                    self.df_geral['TAXA_RETORNO_PROFISSIONAL'] = pd.concat(
                        [self.df_geral.get('TAXA_RETORNO_PROFISSIONAL', pd.DataFrame()), df_novo], ignore_index=True)
                    logging.info(f"   ✅ TAXA_RETORNO_PROFISSIONAL: {len(df_novo)} registros inseridos")

            # 10. METAS (se houver)
            if 'metas' in dados_novos and dados_novos['metas']:
                df_novo = pd.DataFrame([{
                    'ano': ano,
                    'mes': mes,
                    **dados_novos['metas']
                }])
                self.df_geral['METAS'] = pd.concat([self.df_geral.get('METAS', pd.DataFrame()), df_novo],
                                                   ignore_index=True)
                logging.info(f"   ✅ METAS: 1 registro inserido")

            # 11. FEEDBACK
            if 'feedbacks' in dados_novos and dados_novos['feedbacks']:
                df_novo = pd.DataFrame(dados_novos['feedbacks'])
                if not df_novo.empty:
                    df_novo['ano'] = ano
                    df_novo['mes'] = mes
                    self.df_geral['FEEDBACK'] = pd.concat([self.df_geral.get('FEEDBACK', pd.DataFrame()), df_novo],
                                                          ignore_index=True)
                    logging.info(f"   ✅ FEEDBACK: {len(df_novo)} registros inseridos")

            # 12. ATENDIMENTOS_RAW
            if 'profissionais' in dados_novos:
                raw = dados_novos['profissionais'].get('atendimentos_raw', []) or []
                if raw:
                    df_novo = pd.DataFrame([{
                        'ano': ano, 'mes': mes,
                        'profissional': item.get('profissional', ''),
                        'data_comanda': item.get('data_comanda', ''),
                        'dia_semana': item.get('dia_semana', ''),
                        'num_comanda': item.get('num_comanda', ''),
                        'servico': item.get('servico', ''),
                        'categoria': item.get('categoria', ''),
                        'cliente': item.get('cliente', ''),
                        'cpf': item.get('cpf', ''),
                        'telefone': item.get('telefone', ''),
                        'celular': item.get('celular', ''),
                        'qtd': item.get('qtd', 0),
                        'valor': item.get('valor', 0),
                        'desconto': item.get('desconto', 0),
                        'total': item.get('total', 0),
                        'pacote': item.get('pacote', ''),
                    } for item in raw])
                    self.df_geral['ATENDIMENTOS_RAW'] = pd.concat(
                        [self.df_geral.get('ATENDIMENTOS_RAW', pd.DataFrame()), df_novo], ignore_index=True)
                    logging.info(f"   ✅ ATENDIMENTOS_RAW: {len(df_novo)} registros inseridos")

            # 13. AGENDAMENTOS_RAW (0051)
            if 'profissionais' in dados_novos:
                agend = dados_novos['profissionais'].get('agendamentos_raw', []) or []
                if agend:
                    df_novo = pd.DataFrame([{
                        'ano': ano, 'mes': mes,
                        'data_reserva':  item.get('data_reserva', ''),
                        'hora':          item.get('hora', ''),
                        'cliente':       item.get('cliente', ''),
                        'celular':       item.get('celular', ''),
                        'profissional':  item.get('profissional', ''),
                        'servico':       item.get('servico', ''),
                        'status':        item.get('status', ''),
                        'observacao':    item.get('observacao', ''),
                    } for item in agend])
                    self.df_geral['AGENDAMENTOS_RAW'] = pd.concat(
                        [self.df_geral.get('AGENDAMENTOS_RAW', pd.DataFrame()), df_novo], ignore_index=True)
                    logging.info(f"   ✅ AGENDAMENTOS_RAW: {len(df_novo)} registros inseridos")

            # 13b. PRODUTOS_RAW (0041)
            if 'profissionais' in dados_novos:
                prods = dados_novos['profissionais'].get('produtos_raw', []) or []
                if prods:
                    df_novo = pd.DataFrame([{
                        'ano': ano, 'mes': mes,
                        'profissional': item.get('profissional', ''),
                        'data_venda':   item.get('data_venda', ''),
                        'num_comanda':  item.get('num_comanda', ''),
                        'cliente':      item.get('cliente', ''),
                        'produto':      item.get('produto', ''),
                        'marca':        item.get('marca', ''),
                        'categoria':    item.get('categoria', ''),
                        'qtd':          item.get('qtd', 0),
                        'valor':        item.get('valor', 0),
                        'total':        item.get('total', 0),
                    } for item in prods])
                    self.df_geral['PRODUTOS_RAW'] = pd.concat(
                        [self.df_geral.get('PRODUTOS_RAW', pd.DataFrame()), df_novo], ignore_index=True)
                    logging.info(f"   OK PRODUTOS_RAW: {len(df_novo)} linhas inseridas")

            # 13c. COMANDAS_RAW (tela de Comandas Finalizadas)
            if 'profissionais' in dados_novos:
                cmds = dados_novos['profissionais'].get('comandas_raw', []) or []
                if cmds:
                    df_novo = pd.DataFrame([{
                        'ano': ano, 'mes': mes,
                        'num_comanda':       item.get('num_comanda', ''),
                        'data':              item.get('data', ''),
                        'cliente':           item.get('cliente', ''),
                        'caixa_responsavel': item.get('caixa_responsavel', ''),
                        'valor':             item.get('valor', 0),
                    } for item in cmds])
                    self.df_geral['COMANDAS_RAW'] = pd.concat(
                        [self.df_geral.get('COMANDAS_RAW', pd.DataFrame()), df_novo], ignore_index=True)
                    logging.info(f"   OK COMANDAS_RAW: {len(df_novo)} comandas inseridas")

            # 14. TABELA_PRECOS (0033)
            #
            # SUBSTITUI a aba inteira em vez de concatenar: a tabela de precos
            # e uma so, a vigente. Concatenar criaria o mesmo servico com dois
            # precos, e a regua da conferencia deixaria de valer justamente
            # onde ela mais serve.
            if 'profissionais' in dados_novos:
                precos = dados_novos['profissionais'].get('tabela_precos', []) or []
                if precos:
                    self.df_geral['TABELA_PRECOS'] = pd.DataFrame([{
                        'servico':     item.get('servico', ''),
                        'categoria':   item.get('categoria', ''),
                        'preco':       item.get('preco', 0),
                        'duracao':     item.get('duracao', ''),
                        'coletado_em': datetime.now().strftime('%d/%m/%Y %H:%M:%S'),
                    } for item in precos])
                    logging.info(f"   OK TABELA_PRECOS: {len(precos)} servicos (aba substituida)")

            # ============================================================
            # PASSO 3: VALIDAR INTEGRIDADE DOS DADOS COLETADOS
            # ============================================================
            resultados_validacao = self.validar_mes(ano, mes, dados_novos)

            # ============================================================
            # PASSO 4: SALVAR E ATUALIZAR METADADOS
            # ============================================================
            self.salvar()
            self._atualizar_metadados()

            logging.info(f"=" * 60)
            logging.info(f"✅ MÊS {MESES_PT[mes]}/{ano} SUBSTITUÍDO COM SUCESSO!")
            logging.info(f"   Antigos: removidos | Novos: {self._contar_registros_mes(ano, mes)} registros")
            logging.info(f"=" * 60)

            return resultados_validacao

        except Exception as e:
            logging.error(f"❌ Erro ao substituir mês: {e}")
            import traceback
            traceback.print_exc()
            return False

    # ================================================================
    # VALIDAÇÃO DE INTEGRIDADE DA COLETA
    # ================================================================

    def validar_mes(self, ano, mes, dados_brutos: dict) -> list:
        """
        Verifica se cada relatório coletado tem dados reais.
        Retorna lista de dicts com status de cada relatório.
        Status possíveis: OK | ZERO | FALHOU
        """
        agora = datetime.now().strftime('%d/%m/%Y %H:%M:%S')
        periodo = f"{MESES_PT[mes]}/{ano}"
        resultados = []

        def chk(codigo, nome, valor, registros=0):
            if valor is None and registros == 0:
                status = 'FALHOU'
            elif (valor == 0 or valor is None) and registros == 0:
                status = 'ZERO'
            elif registros == 0 and valor == 0:
                status = 'ZERO'
            else:
                status = 'OK'
            resultados.append({
                'ano': ano, 'mes': mes, 'periodo': periodo,
                'relatorio': codigo, 'nome_relatorio': nome,
                'status': status,
                'registros': registros,
                'valor_principal': round(float(valor or 0), 2),
                'data_verificacao': agora
            })

        resumo = dados_brutos.get('resumo', {})
        fat = resumo.get('faturamento_total', 0) or 0
        clientes = resumo.get('clientes_atendidos', 0) or 0
        novos = resumo.get('clientes_novos', 0) or 0

        chk('0083', 'Faturamento / Ticket',   fat,     1 if fat > 0 else 0)
        chk('0017', 'Clientes Novos',          novos,   1 if novos > 0 else 0)

        servicos = dados_brutos.get('servicos', []) or []
        chk('0032', 'Serviços do Salão',       len(servicos), len(servicos))

        produtos = dados_brutos.get('produtos', []) or []
        chk('0042', 'Produtos do Salão',       len(produtos), len(produtos))

        fat_diario = dados_brutos.get('faturamento_diario', []) or []
        total_fat_d = sum(i.get('valor', 0) or 0 for i in fat_diario)
        chk('0088', 'Faturamento Diário',      total_fat_d, len(fat_diario))

        prof = dados_brutos.get('profissionais', {}) or {}
        pagamentos = prof.get('pagamentos', []) or []
        chk('0123', 'Pagamentos Profissionais', len(pagamentos), len(pagamentos))

        ticket = prof.get('ticket', []) or []
        chk('0021', 'Ticket por Profissional',  len(ticket), len(ticket))

        pref = prof.get('preferencia', []) or []
        chk('0326', 'Preferência Profissional', len(pref), len(pref))

        ocup = prof.get('ocupacao', []) or []
        chk('0126', 'Ocupação Profissional',    len(ocup), len(ocup))

        serv_prof = prof.get('servicos_detalhados', []) or []
        chk('0031', 'Serviços por Profissional', len(serv_prof), len(serv_prof))

        prod_prof = prof.get('produtos', []) or []
        chk('0041', 'Produtos por Profissional', len(prod_prof), len(prod_prof))

        # Salva na aba VALIDACAO (remove entrada anterior do mesmo mês)
        df_val = self.df_geral.get('VALIDACAO', pd.DataFrame())
        if not df_val.empty and 'ano' in df_val.columns:
            df_val = df_val[~((df_val['ano'] == ano) & (df_val['mes'] == mes))]
        df_novos = pd.DataFrame(resultados)
        self.df_geral['VALIDACAO'] = pd.concat([df_val, df_novos], ignore_index=True)

        logging.info(f"🔍 Validação {periodo}: "
                     f"{sum(1 for r in resultados if r['status']=='OK')} OK | "
                     f"{sum(1 for r in resultados if r['status']=='ZERO')} ZERO | "
                     f"{sum(1 for r in resultados if r['status']=='FALHOU')} FALHOU")
        return resultados

    def obter_status_periodos(self) -> list:
        """
        Retorna resumo de status por período para exibição na interface.
        Cada item: {periodo, ano, mes, total, ok, zero, falhou, status_geral}
        status_geral: OK | PARCIAL | FALHOU
        """
        df = self.df_geral.get('VALIDACAO', pd.DataFrame())
        if df.empty or 'ano' not in df.columns:
            return []

        resumo = []
        for (ano, mes), grupo in df.groupby(['ano', 'mes']):
            total   = len(grupo)
            ok      = int((grupo['status'] == 'OK').sum())
            zero    = int((grupo['status'] == 'ZERO').sum())
            falhou  = int((grupo['status'] == 'FALHOU').sum())
            if falhou > 0:
                geral = 'FALHOU'
            elif zero > 0:
                geral = 'PARCIAL'
            else:
                geral = 'OK'
            resumo.append({
                'periodo':      f"{MESES_PT[int(mes)]}/{int(ano)}",
                'ano':          int(ano),
                'mes':          int(mes),
                'total':        total,
                'ok':           ok,
                'zero':         zero,
                'falhou':       falhou,
                'status_geral': geral,
                'data':         grupo['data_verificacao'].iloc[-1] if 'data_verificacao' in grupo.columns else ''
            })
        resumo.sort(key=lambda x: (x['ano'], x['mes']), reverse=True)
        return resumo

    def _contar_registros_mes(self, ano, mes):
        """Conta quantos registros existem para um mês (para debug)"""
        total = 0
        for aba, df in self.df_geral.items():
            if not df.empty and 'ano' in df.columns and 'mes' in df.columns:
                total += len(df[(df['ano'] == ano) & (df['mes'] == mes)])
        return total

    def _verificar_e_criar_novas_abas(self):
        """Verifica se as novas abas existem e cria se necessário (sem FEEDBACK)."""
        novas_abas = ['TAXA_RETORNO_PROFISSIONAL', 'TAXA_RETORNO_SALAO']
        for aba in novas_abas:
            if aba not in self.df_geral:
                if aba == 'TAXA_RETORNO_PROFISSIONAL':
                    df = pd.DataFrame(
                        columns=['ano', 'mes', 'profissional', 'total_clientes', 'clientes_retornaram', 'taxa_retorno'])
                else:
                    df = pd.DataFrame(columns=['ano', 'mes', 'total_clientes', 'clientes_retornaram', 'taxa_retorno'])
                self.df_geral[aba] = df
                logging.info(f"✅ Nova aba criada: {aba}")

    def criar_base_nova(self):
        """Cria uma nova base de dados em memória (sem perguntas, sem FEEDBACK)."""
        logging.info("📄 Criando estrutura da base de dados...")
        self.df_geral = {}
        # Aba de Atendimentos Raw (relatório 0031 completo — linha a linha)
        self._criar_aba_atendimentos_raw = True  # flag para adicionar após estrutura base

        # Aba de Metadados
        metadados = pd.DataFrame([{
            'versao': '4.0',
            'data_criacao': datetime.now().strftime('%d/%m/%Y %H:%M:%S'),
            'ultima_atualizacao': datetime.now().strftime('%d/%m/%Y %H:%M:%S'),
            'total_meses': 0
        }])
        self.df_geral['METADADOS'] = metadados

        # Aba de Períodos (controle dos meses coletados)
        periodos = pd.DataFrame(columns=['ano', 'mes', 'data_inicio', 'data_fim', 'data_coleta', 'status'])
        self.df_geral['PERIODOS'] = periodos

        # Aba de Resumo Mensal
        resumo = pd.DataFrame(columns=[
            'ano', 'mes', 'periodo',
            'faturamento_total', 'ticket_medio', 'clientes_atendidos', 'clientes_novos',
            'faturamento_servicos', 'faturamento_produtos', 'percentual_servicos', 'percentual_produtos'
        ])
        self.df_geral['RESUMO_MENSAL'] = resumo

        # Aba de Faturamento Diário
        fat_diario = pd.DataFrame(columns=['ano', 'mes', 'data', 'dia_semana', 'valor'])
        self.df_geral['FATURAMENTO_DIARIO'] = fat_diario

        # Aba de Serviços
        servicos = pd.DataFrame(columns=['ano', 'mes', 'servico', 'quantidade'])
        self.df_geral['SERVICOS'] = servicos

        # Aba de Produtos
        produtos = pd.DataFrame(columns=['ano', 'mes', 'produto', 'quantidade'])
        self.df_geral['PRODUTOS'] = produtos

        # Aba de Profissionais - Pagamentos
        prof_pagamentos = pd.DataFrame(columns=['ano', 'mes', 'profissional', 'categoria', 'valor_a_pagar', 'desconto'])
        self.df_geral['PROF_PAGAMENTOS'] = prof_pagamentos

        # Aba de Profissionais - Ticket Médio
        prof_ticket = pd.DataFrame(columns=['ano', 'mes', 'profissional', 'ticket_medio'])
        self.df_geral['PROF_TICKET'] = prof_ticket

        # Aba de Profissionais - Preferência
        prof_preferencia = pd.DataFrame(
            columns=['ano', 'mes', 'profissional', 'clientes_preferencia', 'clientes_sem_preferencia'])
        self.df_geral['PROF_PREFERENCIA'] = prof_preferencia

        # Aba de Profissionais - Ocupação
        prof_ocupacao = pd.DataFrame(columns=['ano', 'mes', 'profissional', 'dias_trabalhados', 'taxa_ocupacao'])
        self.df_geral['PROF_OCUPACAO'] = prof_ocupacao

        # Aba de Profissionais - Serviços
        prof_servicos = pd.DataFrame(columns=['ano', 'mes', 'profissional', 'servico', 'quantidade', 'valor'])
        self.df_geral['PROF_SERVICOS'] = prof_servicos

        # Aba de Profissionais - Produtos
        prof_produtos = pd.DataFrame(columns=['ano', 'mes', 'profissional', 'quantidade'])
        self.df_geral['PROF_PRODUTOS'] = prof_produtos

        # Aba de Salão - Visão Geral
        salao_geral = pd.DataFrame(columns=[
            'ano', 'mes', 'faturamento_total', 'clientes_total', 'servicos_total',
            'produtos_total', 'taxa_conversao', 'ticket_medio_geral'
        ])
        self.df_geral['SALAO_GERAL'] = salao_geral

        # Aba de Metas
        metas = pd.DataFrame(columns=[
            'ano', 'mes', 'meta_faturamento', 'meta_clientes', 'meta_ticket',
            'alcancado_faturamento', 'alcancado_clientes', 'alcancado_ticket'
        ])
        self.df_geral['METAS'] = metas

        # ===== NOVAS ABAS =====

        # Aba de Taxa de Retorno por Profissional
        taxa_retorno_prof = pd.DataFrame(
            columns=['ano', 'mes', 'profissional', 'total_clientes', 'clientes_retornaram', 'taxa_retorno'])
        self.df_geral['TAXA_RETORNO_PROFISSIONAL'] = taxa_retorno_prof

        # Aba de Taxa de Retorno do Salão
        taxa_retorno_salao = pd.DataFrame(
            columns=['ano', 'mes', 'total_clientes', 'clientes_retornaram', 'taxa_retorno'])
        self.df_geral['TAXA_RETORNO_SALAO'] = taxa_retorno_salao

        # Aba de Validação de coleta
        self.df_geral['VALIDACAO'] = pd.DataFrame(columns=[
            'ano', 'mes', 'periodo', 'relatorio', 'nome_relatorio',
            'status', 'registros', 'valor_principal', 'data_verificacao'
        ])

        # Aba de Atendimentos Raw (0031 — dados transacionais completos com cliente)
        self.df_geral['ATENDIMENTOS_RAW'] = pd.DataFrame(columns=[
            'ano', 'mes', 'profissional', 'data_comanda', 'dia_semana',
            'num_comanda', 'servico', 'categoria', 'cliente', 'cpf',
            'telefone', 'celular', 'qtd', 'valor', 'desconto', 'total', 'pacote'
        ])

        # Aba de Comandas Finalizadas (quem fechou e quanto entrou por comanda)
        #
        # Vem da tela do financeiro, nao de relatorio numerado. E dado de
        # periodo, como os atendimentos: entra na limpeza por mes.
        self.df_geral['COMANDAS_RAW'] = pd.DataFrame(columns=[
            'ano', 'mes', 'num_comanda', 'data', 'cliente', 'caixa_responsavel', 'valor'
        ])

        # Aba de Produtos Raw (0041 — produto vendido, linha a linha)
        #
        # E dado de periodo, como os atendimentos: entra na limpeza por mes.
        self.df_geral['PRODUTOS_RAW'] = pd.DataFrame(columns=[
            'ano', 'mes', 'profissional', 'data_venda', 'num_comanda', 'cliente',
            'produto', 'marca', 'categoria', 'qtd', 'valor', 'total'
        ])

        # Aba da Tabela de Precos (0033 — quanto cada servico DEVE custar)
        #
        # Nao tem ano/mes de proposito: nao e dado de periodo, e a tabela
        # vigente. Cada coleta SUBSTITUI a anterior, e por isso esta aba fica
        # de fora de `abas_para_substituir`, que apaga por mes.
        self.df_geral['TABELA_PRECOS'] = pd.DataFrame(columns=[
            'servico', 'categoria', 'preco', 'duracao', 'coletado_em'
        ])

        # Aba de Agendamentos Raw (0051 — reservas/agendamentos com cliente)
        self.df_geral['AGENDAMENTOS_RAW'] = pd.DataFrame(columns=[
            'ano', 'mes', 'data_reserva', 'hora', 'cliente', 'celular',
            'profissional', 'servico', 'status', 'observacao'
        ])

        self.salvar()
        logging.info(f"✅ Nova base de dados criada: {self.arquivo}")

    def salvar(self):
        """Salva todas as abas no arquivo Excel"""
        try:
            with pd.ExcelWriter(self.arquivo, engine='openpyxl') as writer:
                for nome_aba, df in self.df_geral.items():
                    df.to_excel(writer, sheet_name=nome_aba, index=False)

            # Aplicar formatação
            self._aplicar_formatacao()
            logging.info(f"✅ Base salva: {self.arquivo}")
        except Exception as e:
            logging.error(f"Erro ao salvar base: {e}")

    def _aplicar_formatacao(self):
        """Aplica formatação às abas do Excel"""
        try:
            wb = load_workbook(self.arquivo)

            for sheet_name in wb.sheetnames:
                ws = wb[sheet_name]

                # Formatar cabeçalhos
                for cell in ws[1]:
                    cell.font = Font(bold=True, color="FFFFFF", size=11)
                    cell.fill = PatternFill(start_color="0F3460", end_color="0F3460", fill_type="solid")
                    cell.alignment = Alignment(horizontal="center", vertical="center")

                # Ajustar largura das colunas
                for column in ws.columns:
                    max_length = 0
                    column_letter = column[0].column_letter
                    for cell in column:
                        try:
                            if len(str(cell.value)) > max_length:
                                max_length = len(str(cell.value))
                        except:
                            pass
                    adjusted_width = min(max_length + 2, 50)
                    ws.column_dimensions[column_letter].width = adjusted_width

            wb.save(self.arquivo)
        except Exception as e:
            logging.error(f"Erro na formatação: {e}")

    def mes_ja_coletado(self, ano, mes):
        """Verifica se um mês/ano já foi coletado"""
        try:
            df_periodos = self.df_geral.get('PERIODOS', pd.DataFrame())
            if df_periodos.empty:
                return False

            filtro = (df_periodos['ano'] == ano) & (df_periodos['mes'] == mes)
            return not df_periodos[filtro].empty
        except:
            return False

    def adicionar_mes(self, ano, mes, dados):
        """Adiciona dados de um mês à base (SUBSTITUINDO se já existir)"""
        try:
            periodo = f"{MESES_PT[mes]}/{ano}"
            data_coleta = datetime.now().strftime('%d/%m/%Y %H:%M:%S')

            # 1. ATUALIZAR PERIODOS - SUBSTITUINDO
            novo_periodo = pd.DataFrame([{
                'ano': ano,
                'mes': mes,
                'data_inicio': dados.get('data_inicio', ''),
                'data_fim': dados.get('data_fim', ''),
                'data_coleta': data_coleta,
                'status': 'COMPLETO'
            }])

            df_periodos = self.df_geral.get('PERIODOS', pd.DataFrame())
            if not df_periodos.empty:
                # Remover registro antigo se existir
                df_periodos = df_periodos[~((df_periodos['ano'] == ano) & (df_periodos['mes'] == mes))]

            # Adicionar novo registro
            self.df_geral['PERIODOS'] = pd.concat([df_periodos, novo_periodo], ignore_index=True)

            # 2. ATUALIZAR RESUMO_MENSAL - SUBSTITUINDO
            if 'resumo' in dados:
                novo_resumo = pd.DataFrame([{
                    'ano': ano,
                    'mes': mes,
                    'periodo': periodo,
                    'faturamento_total': dados['resumo'].get('faturamento_total', 0),
                    'ticket_medio': dados['resumo'].get('ticket_medio', 0),
                    'clientes_atendidos': dados['resumo'].get('clientes_atendidos', 0),
                    'clientes_novos': dados['resumo'].get('clientes_novos', 0),
                    'faturamento_servicos': dados['resumo'].get('faturamento_servicos', 0),
                    'faturamento_produtos': dados['resumo'].get('faturamento_produtos', 0),
                    'percentual_servicos': dados['resumo'].get('percentual_servicos', 0),
                    'percentual_produtos': dados['resumo'].get('percentual_produtos', 0)
                }])

                df_resumo = self.df_geral.get('RESUMO_MENSAL', pd.DataFrame())
                if not df_resumo.empty:
                    df_resumo = df_resumo[~((df_resumo['ano'] == ano) & (df_resumo['mes'] == mes))]
                self.df_geral['RESUMO_MENSAL'] = pd.concat([df_resumo, novo_resumo], ignore_index=True)

            # 3. ATUALIZAR FATURAMENTO_DIARIO - SUBSTITUINDO
            if 'faturamento_diario' in dados and dados['faturamento_diario']:
                df_fat_diario = pd.DataFrame([{
                    'ano': ano,
                    'mes': mes,
                    'data': item['data'],
                    'dia_semana': item['dia_semana'],
                    'valor': item['valor']
                } for item in dados['faturamento_diario']])

                df_existente = self.df_geral.get('FATURAMENTO_DIARIO', pd.DataFrame())
                if not df_existente.empty:
                    df_existente = df_existente[~((df_existente['ano'] == ano) & (df_existente['mes'] == mes))]
                self.df_geral['FATURAMENTO_DIARIO'] = pd.concat([df_existente, df_fat_diario], ignore_index=True)

            # 4. ATUALIZAR SERVICOS - SUBSTITUINDO
            if 'servicos' in dados and dados['servicos']:
                df_servicos = pd.DataFrame([{
                    'ano': ano,
                    'mes': mes,
                    'servico': item.get('Serviço', item.get('servico', '')),
                    'quantidade': item.get('Quantidade', item.get('quantidade', 0))
                } for item in dados['servicos']])

                df_existente = self.df_geral.get('SERVICOS', pd.DataFrame())
                if not df_existente.empty:
                    df_existente = df_existente[~((df_existente['ano'] == ano) & (df_existente['mes'] == mes))]
                self.df_geral['SERVICOS'] = pd.concat([df_existente, df_servicos], ignore_index=True)

            # 5. ATUALIZAR PRODUTOS - SUBSTITUINDO
            if 'produtos' in dados and dados['produtos']:
                df_produtos = pd.DataFrame([{
                    'ano': ano,
                    'mes': mes,
                    'produto': item.get('Produto', item.get('produto', '')),
                    'quantidade': item.get('Quantidade', item.get('quantidade', 0))
                } for item in dados['produtos']])

                df_existente = self.df_geral.get('PRODUTOS', pd.DataFrame())
                if not df_existente.empty:
                    df_existente = df_existente[~((df_existente['ano'] == ano) & (df_existente['mes'] == mes))]
                self.df_geral['PRODUTOS'] = pd.concat([df_existente, df_produtos], ignore_index=True)

            # 6. ATUALIZAR PROFISSIONAIS - TODAS AS SUB-ABAS
            if 'profissionais' in dados:
                prof = dados['profissionais']

                # Pagamentos
                if 'pagamentos' in prof and prof['pagamentos']:
                    df_pag = pd.DataFrame([{
                        'ano': ano,
                        'mes': mes,
                        'profissional': item.get('profissional', item.get('profissional_original', '')),
                        'categoria': item.get('categoria', ''),
                        'valor_a_pagar': item.get('valor_a_pagar', 0),
                        'desconto': item.get('desconto', 0)
                    } for item in prof['pagamentos']])

                    df_existente = self.df_geral.get('PROF_PAGAMENTOS', pd.DataFrame())
                    if not df_existente.empty:
                        df_existente = df_existente[~((df_existente['ano'] == ano) & (df_existente['mes'] == mes))]
                    self.df_geral['PROF_PAGAMENTOS'] = pd.concat([df_existente, df_pag], ignore_index=True)

                # Ticket Médio
                if 'ticket' in prof and prof['ticket']:
                    df_ticket = pd.DataFrame([{
                        'ano': ano,
                        'mes': mes,
                        'profissional': item.get('profissional', item.get('profissional_original', '')),
                        'ticket_medio': item.get('ticket_medio', 0)
                    } for item in prof['ticket']])

                    df_existente = self.df_geral.get('PROF_TICKET', pd.DataFrame())
                    if not df_existente.empty:
                        df_existente = df_existente[~((df_existente['ano'] == ano) & (df_existente['mes'] == mes))]
                    self.df_geral['PROF_TICKET'] = pd.concat([df_existente, df_ticket], ignore_index=True)

                # Preferência
                if 'preferencia' in prof and prof['preferencia']:
                    df_pref = pd.DataFrame([{
                        'ano': ano,
                        'mes': mes,
                        'profissional': item.get('profissional', item.get('profissional_original', '')),
                        'clientes_preferencia': item.get('clientes_preferencia', 0),
                        'clientes_sem_preferencia': item.get('clientes_sem_preferencia', 0)
                    } for item in prof['preferencia']])

                    df_existente = self.df_geral.get('PROF_PREFERENCIA', pd.DataFrame())
                    if not df_existente.empty:
                        df_existente = df_existente[~((df_existente['ano'] == ano) & (df_existente['mes'] == mes))]
                    self.df_geral['PROF_PREFERENCIA'] = pd.concat([df_existente, df_pref], ignore_index=True)

                # Ocupação
                if 'ocupacao' in prof and prof['ocupacao']:
                    df_ocup = pd.DataFrame([{
                        'ano': ano,
                        'mes': mes,
                        'profissional': item.get('profissional', item.get('profissional_original', '')),
                        'dias_trabalhados': item.get('dias_trabalhados', 0),
                        'taxa_ocupacao': item.get('taxa_ocupacao', 0)
                    } for item in prof['ocupacao']])

                    df_existente = self.df_geral.get('PROF_OCUPACAO', pd.DataFrame())
                    if not df_existente.empty:
                        df_existente = df_existente[~((df_existente['ano'] == ano) & (df_existente['mes'] == mes))]
                    self.df_geral['PROF_OCUPACAO'] = pd.concat([df_existente, df_ocup], ignore_index=True)

                # Serviços por profissional
                if 'servicos_detalhados' in prof and prof['servicos_detalhados']:
                    linhas_servicos = []
                    for item in prof['servicos_detalhados']:
                        profissional = item.get('profissional', '')
                        for servico, info in item.get('servicos', {}).items():
                            linhas_servicos.append({
                                'ano': ano,
                                'mes': mes,
                                'profissional': profissional,
                                'servico': servico,
                                'quantidade': info.get('quantidade', 0),
                                'valor': info.get('valor', 0)
                            })

                    if linhas_servicos:
                        df_serv = pd.DataFrame(linhas_servicos)
                        df_existente = self.df_geral.get('PROF_SERVICOS', pd.DataFrame())
                        if not df_existente.empty:
                            df_existente = df_existente[~((df_existente['ano'] == ano) & (df_existente['mes'] == mes))]
                        self.df_geral['PROF_SERVICOS'] = pd.concat([df_existente, df_serv], ignore_index=True)

                # Produtos por profissional
                if 'produtos' in prof and prof['produtos']:
                    df_prod = pd.DataFrame([{
                        'ano': ano,
                        'mes': mes,
                        'profissional': item.get('profissional', item.get('profissional_original', '')),
                        'quantidade': item.get('total_produtos', 0)
                    } for item in prof['produtos']])

                    df_existente = self.df_geral.get('PROF_PRODUTOS', pd.DataFrame())
                    if not df_existente.empty:
                        df_existente = df_existente[~((df_existente['ano'] == ano) & (df_existente['mes'] == mes))]
                    self.df_geral['PROF_PRODUTOS'] = pd.concat([df_existente, df_prod], ignore_index=True)

            # 7. ATUALIZAR SALAO_GERAL - SUBSTITUINDO
            if 'resumo' in dados:
                novo_salao = pd.DataFrame([{
                    'ano': ano,
                    'mes': mes,
                    'faturamento_total': dados['resumo'].get('faturamento_total', 0),
                    'clientes_total': dados['resumo'].get('clientes_atendidos', 0),
                    'servicos_total': len(dados.get('servicos', [])),
                    'produtos_total': len(dados.get('produtos', [])),
                    'taxa_conversao': (dados['resumo'].get('clientes_novos', 0) / dados['resumo'].get(
                        'clientes_atendidos', 1)) * 100 if dados['resumo'].get('clientes_atendidos', 0) > 0 else 0,
                    'ticket_medio_geral': dados['resumo'].get('ticket_medio', 0)
                }])

                df_salao = self.df_geral.get('SALAO_GERAL', pd.DataFrame())
                if not df_salao.empty:
                    df_salao = df_salao[~((df_salao['ano'] == ano) & (df_salao['mes'] == mes))]
                self.df_geral['SALAO_GERAL'] = pd.concat([df_salao, novo_salao], ignore_index=True)

            # 8. ATUALIZAR NOVAS ABAS
            self._atualizar_taxas_retorno(ano, mes, dados)

            # Salvar alterações
            self.salvar()

            # Atualizar metadados
            self._atualizar_metadados()

            logging.info(f"✅ Mês {MESES_PT[mes]}/{ano} atualizado na base (substituindo dados antigos)")
            return True

        except Exception as e:
            logging.error(f"Erro ao adicionar mês à base: {e}")
            return False

    def _atualizar_metadados(self):
        """Atualiza a aba de metadados"""
        try:
            df_periodos = self.df_geral.get('PERIODOS', pd.DataFrame())
            total_meses = len(df_periodos) if not df_periodos.empty else 0

            metadados = pd.DataFrame([{
                'versao': '4.0',
                'data_criacao': self.df_geral['METADADOS'].iloc[0]['data_criacao'] if not self.df_geral[
                    'METADADOS'].empty else datetime.now().strftime('%d/%m/%Y %H:%M:%S'),
                'ultima_atualizacao': datetime.now().strftime('%d/%m/%Y %H:%M:%S'),
                'total_meses': total_meses
            }])

            self.df_geral['METADADOS'] = metadados
            self.salvar()
        except Exception as e:
            logging.error(f"Erro ao atualizar metadados: {e}")

    def obter_meses_para_coletar(self, ano_inicio=2019, mes_inicio=1, ano_fim=2026, mes_fim=3):
        """Retorna lista de meses que ainda precisam ser coletados"""
        meses_para_coletar = []

        for ano in range(ano_inicio, ano_fim + 1):
            mes_ini = mes_inicio if ano == ano_inicio else 1
            mes_fim_mes = mes_fim if ano == ano_fim else 12

            for mes in range(mes_ini, mes_fim_mes + 1):
                if not self.mes_ja_coletado(ano, mes):
                    # Calcular último dia do mês
                    if mes == 12:
                        ultimo_dia = 31
                    else:
                        ultimo_dia = (datetime(ano, mes + 1, 1) - timedelta(days=1)).day

                    meses_para_coletar.append({
                        'ano': ano,
                        'mes': mes,
                        'data_inicio': f"01/{mes:02d}/{ano}",
                        'data_fim': f"{ultimo_dia:02d}/{mes:02d}/{ano}"
                    })

        return meses_para_coletar

    def carregar_dados_para_analise(self, periodo=None):
        """Carrega dados para análise (pode ser mês específico ou todos)"""
        dados_para_analise = {}

        try:
            if periodo:
                # Carregar apenas um período específico
                ano, mes = periodo
                dados_para_analise[(ano, mes)] = self._extrair_dados_periodo(ano, mes)
            else:
                # Carregar todos os períodos
                df_periodos = self.df_geral.get('PERIODOS', pd.DataFrame())
                if not df_periodos.empty:
                    for _, row in df_periodos.iterrows():
                        ano = row['ano']
                        mes = row['mes']
                        dados_para_analise[(ano, mes)] = self._extrair_dados_periodo(ano, mes)

            return dados_para_analise

        except Exception as e:
            logging.error(f"Erro ao carregar dados para análise: {e}")
            return {}

    def _extrair_dados_periodo(self, ano, mes):
        """Extrai todos os dados de um período específico - VERSÃO CORRIGIDA"""
        dados = {
            'ano': ano,
            'mes': mes,
            'resumo': {},
            'faturamento_diario': [],
            'servicos': [],
            'produtos': [],
            'profissionais': {},
            'metas': {},
            'feedbacks': [],
            'taxa_retorno_salao': 0,
            'taxa_retorno_profissionais': {}
        }

        try:
            # Resumo mensal
            df_resumo = self.df_geral.get('RESUMO_MENSAL', pd.DataFrame())
            if not df_resumo.empty:
                filtro = (df_resumo['ano'] == ano) & (df_resumo['mes'] == mes)
                resumo_rows = df_resumo[filtro]
                if not resumo_rows.empty:
                    dados['resumo'] = resumo_rows.iloc[0].to_dict()

            # Faturamento diário
            df_fat = self.df_geral.get('FATURAMENTO_DIARIO', pd.DataFrame())
            if not df_fat.empty:
                filtro = (df_fat['ano'] == ano) & (df_fat['mes'] == mes)
                dados['faturamento_diario'] = df_fat[filtro].to_dict('records')

            # Serviços (ordenados por quantidade)
            df_serv = self.df_geral.get('SERVICOS', pd.DataFrame())
            if not df_serv.empty:
                filtro = (df_serv['ano'] == ano) & (df_serv['mes'] == mes)
                servicos_df = df_serv[filtro]
                if not servicos_df.empty:
                    servicos_df = servicos_df.sort_values('quantidade', ascending=False)
                    dados['servicos'] = servicos_df.to_dict('records')

            # Produtos (ordenados por quantidade)
            df_prod = self.df_geral.get('PRODUTOS', pd.DataFrame())
            if not df_prod.empty:
                filtro = (df_prod['ano'] == ano) & (df_prod['mes'] == mes)
                produtos_df = df_prod[filtro]
                if not produtos_df.empty:
                    produtos_df = produtos_df.sort_values('quantidade', ascending=False)
                    dados['produtos'] = produtos_df.to_dict('records')

            # ===== DADOS DOS PROFISSIONAIS - CORRIGIDO =====
            profissionais = {}

            # Pagamentos
            # Pagamentos
            df_pag = self.df_geral.get('PROF_PAGAMENTOS', pd.DataFrame())
            if not df_pag.empty:
                filtro = (df_pag['ano'] == ano) & (df_pag['mes'] == mes)
                for _, row in df_pag[filtro].iterrows():
                    prof = row['profissional']
                    if prof not in profissionais:
                        profissionais[prof] = {
                            'categoria': row['categoria'],
                            'pagamentos': {'valor_a_pagar': 0, 'desconto': 0},

                        }

                    valor = float(row.get('valor_a_pagar', 0))
                    desconto = float(row.get('desconto', 0))

                    # ⭐ CORREÇÃO: Soma os dois campos para o faturamento REAL
                    faturamento_real = valor + desconto

                    profissionais[prof]['pagamentos']['valor_a_pagar'] += faturamento_real
                    profissionais[prof]['pagamentos']['desconto'] += desconto

            # Ticket médio
            df_ticket = self.df_geral.get('PROF_TICKET', pd.DataFrame())
            if not df_ticket.empty:
                filtro = (df_ticket['ano'] == ano) & (df_ticket['mes'] == mes)
                for _, row in df_ticket[filtro].iterrows():
                    prof = row['profissional']
                    if prof in profissionais:
                        profissionais[prof]['ticket'] = [{'ticket_medio': float(row.get('ticket_medio', 0))}]

            # PREFERÊNCIA - CORRIGIDO PARA CARREGAR DADOS REAIS
            df_pref = self.df_geral.get('PROF_PREFERENCIA', pd.DataFrame())
            if not df_pref.empty:
                filtro = (df_pref['ano'] == ano) & (df_pref['mes'] == mes)
                for _, row in df_pref[filtro].iterrows():
                    prof = row['profissional']
                    if prof in profissionais:
                        profissionais[prof]['preferencia'] = {
                            'clientes_preferencia': int(row.get('clientes_preferencia', 0)),
                            'clientes_sem_preferencia': int(row.get('clientes_sem_preferencia', 0))
                        }
                        logging.info(
                            f"✅ Carregada preferência para {prof}: {row.get('clientes_preferencia', 0)} / {row.get('clientes_sem_preferencia', 0)}")

            # OCUPAÇÃO - CORRIGIDO PARA CARREGAR DADOS REAIS
            df_ocup = self.df_geral.get('PROF_OCUPACAO', pd.DataFrame())
            if not df_ocup.empty:
                filtro = (df_ocup['ano'] == ano) & (df_ocup['mes'] == mes)
                for _, row in df_ocup[filtro].iterrows():
                    prof = row['profissional']
                    if prof in profissionais:
                        profissionais[prof]['ocupacao'] = {
                            'dias_trabalhados': int(row.get('dias_trabalhados', 0)),
                            'taxa_ocupacao': float(row.get('taxa_ocupacao', 0))
                        }
                        logging.info(
                            f"✅ Carregada ocupação para {prof}: {row.get('dias_trabalhados', 0)} dias / {row.get('taxa_ocupacao', 0)}%")

            # Serviços detalhados
            df_serv_prof = self.df_geral.get('PROF_SERVICOS', pd.DataFrame())
            if not df_serv_prof.empty:
                filtro = (df_serv_prof['ano'] == ano) & (df_serv_prof['mes'] == mes)
                for _, row in df_serv_prof[filtro].iterrows():
                    prof = row['profissional']
                    if prof in profissionais:
                        servico = row['servico']
                        if 'servicos_detalhados' not in profissionais[prof]:
                            profissionais[prof]['servicos_detalhados'] = {}
                        if servico not in profissionais[prof]['servicos_detalhados']:
                            profissionais[prof]['servicos_detalhados'][servico] = {
                                'quantidade': 0,
                                'valor': 0
                            }
                        profissionais[prof]['servicos_detalhados'][servico]['quantidade'] += int(
                            row.get('quantidade', 0))
                        profissionais[prof]['servicos_detalhados'][servico]['valor'] += float(row.get('valor', 0))

            # Produtos
            df_prod_prof = self.df_geral.get('PROF_PRODUTOS', pd.DataFrame())
            if not df_prod_prof.empty:
                filtro = (df_prod_prof['ano'] == ano) & (df_prod_prof['mes'] == mes)
                for _, row in df_prod_prof[filtro].iterrows():
                    prof = row['profissional']
                    if prof in profissionais:
                        if 'produtos' not in profissionais[prof]:
                            profissionais[prof]['produtos'] = 0
                        profissionais[prof]['produtos'] += int(row.get('quantidade', 0))

            dados['profissionais'] = profissionais

            return dados

        except Exception as e:
            logging.error(f"Erro ao extrair dados do período {mes}/{ano}: {e}")
            return dados

    def importar_dados_google_sheets(self):
        """Importa dados da planilha do Google Sheets SEM APAGAR a base existente"""
        try:
            logging.info("📥 Importando dados da planilha Google Sheets...")

            # FAZER BACKUP ANTES DE IMPORTAR (segurança)
            gerenciador_backup = GerenciadorBackup()
            gerenciador_backup.fazer_backup("pre_importacao")

            # Fazer download do CSV
            response = requests.get(GOOGLE_SHEETS_URL, timeout=10)
            response.raise_for_status()

            # Ler CSV
            df = pd.read_csv(StringIO(response.text))
            logging.info(f"✅ Planilha carregada: {len(df)} linhas")
            logging.info(f"Colunas encontradas: {df.columns.tolist()}")

            # Processar dados conforme estrutura da planilha
            if 'Data' in df.columns:
                df['Data'] = pd.to_datetime(df['Data'], errors='coerce')
                df['Ano'] = df['Data'].dt.year
                df['Mês'] = df['Data'].dt.month

            # Agrupar por mês/ano
            for (ano, mes), grupo in df.groupby(['Ano', 'Mês']):
                if pd.notna(ano) and pd.notna(mes):
                    ano = int(ano)
                    mes = int(mes)

                    # Verificar se já existe
                    if self.mes_ja_coletado(ano, mes):
                        logging.info(f"⚠️ Mês {MESES_PT[mes]}/{ano} já existe, ATUALIZANDO dados...")

                        # ⚠️ IMPORTANTE: Se quiser ATUALIZAR em vez de pular,
                        # você precisa implementar a lógica de atualização aqui
                        # Por enquanto, vamos pular para não duplicar
                        logging.info(f"⏭️ Pulando mês {MESES_PT[mes]}/{ano} para não duplicar")
                        continue
                    else:
                        logging.info(f"📊 Processando mês {MESES_PT[mes]}/{ano}...")
                        # Processar dados do grupo
                        dados_mes = self._processar_dados_google_sheets(grupo, ano, mes)

                        # Adicionar à base (SEM APAGAR)
                        if dados_mes:
                            self.adicionar_mes(ano, mes, dados_mes)
                            logging.info(f"✅ Mês {MESES_PT[mes]}/{ano} adicionado à base")

            logging.info("✅ Importação concluída com sucesso!")
            return True

        except Exception as e:
            logging.error(f"Erro ao importar Google Sheets: {e}")
            return False

    def _processar_dados_google_sheets(self, df, ano, mes):
        """Processa dados do Google Sheets para o formato da base"""
        dados = {
            'ano': ano,
            'mes': mes,
            'data_inicio': f"01/{mes:02d}/{ano}",
            'data_fim': f"{calendar.monthrange(ano, mes)[1]:02d}/{mes:02d}/{ano}",
            'resumo': {},
            'faturamento_diario': [],
            'servicos': [],
            'produtos': [],
            'profissionais': {}
        }

        try:
            # Calcular resumo
            if 'Valor' in df.columns:
                dados['resumo']['faturamento_total'] = df['Valor'].sum()

            if 'Cliente' in df.columns:
                dados['resumo']['clientes_atendidos'] = df['Cliente'].nunique()

            if 'Ticket Médio' in df.columns:
                dados['resumo']['ticket_medio'] = df['Ticket Médio'].mean()

            # Agrupar serviços
            if 'Serviço' in df.columns:
                servicos_agg = df.groupby('Serviço').size().reset_index()
                servicos_agg.columns = ['Serviço', 'Quantidade']
                dados['servicos'] = servicos_agg.to_dict('records')

            # Agrupar produtos
            if 'Produto' in df.columns:
                produtos_agg = df.groupby('Produto').size().reset_index()
                produtos_agg.columns = ['Produto', 'Quantidade']
                dados['produtos'] = produtos_agg.to_dict('records')

            # Faturamento diário
            if 'Data' in df.columns:
                fat_diario = df.groupby('Data')['Valor'].sum().reset_index()
                fat_diario['Dia Semana'] = pd.to_datetime(fat_diario['Data']).dt.day_name()
                dados['faturamento_diario'] = fat_diario.to_dict('records')

            return dados

        except Exception as e:
            logging.error(f"Erro ao processar dados: {e}")
            return dados

    def editar_excel_manualmente(self):
        """Abre o Excel para edição manual"""
        try:
            if sys.platform == "win32":
                os.startfile(self.arquivo)
            else:
                os.system(f'xdg-open "{self.arquivo}"')
            return True
        except Exception as e:
            logging.error(f"Erro ao abrir Excel: {e}")
            return False

    def recarregar_apos_edicao(self):
        """Recarrega a base após edição manual"""
        try:
            self.carregar_ou_criar_base()
            return True
        except Exception as e:
            logging.error(f"Erro ao recarregar base: {e}")
            return False


# ============================================================================
# GERENCIADOR DE PROFISSIONAIS (CADASTRO)
# ============================================================================

# ============================================================================
# APENAS A CLASSE GERENCIADOR DE PROFISSIONAIS MODIFICADA PARA USAR A PLANILHA
# ============================================================================

class GerenciadorProfissionais:
    """Gerencia o cadastro e unificação de profissionais"""

    def __init__(self, config_file, base_dados=None):  # ← ADICIONADO base_dados
        self.config_file = config_file
        self.base_dados = base_dados  # ← NOVO: referência à base de dados
        self.profissionais = []
        self.categorias = []
        self.cache_unificacao = {}  # Cache para evitar reprocessamento

        # Se tiver base_dados, carrega da planilha, senão carrega do config
        if self.base_dados:
            self.carregar_profissionais_da_planilha()
        else:
            self.carregar_profissionais()

    def carregar_profissionais_da_planilha(self):
        """Carrega profissionais da aba CADASTRAR_PROFISSIONAL"""
        try:
            # Verificar se a aba existe
            if 'CADASTRAR_PROFISSIONAL' in self.base_dados.df_geral:
                df = self.base_dados.df_geral['CADASTRAR_PROFISSIONAL']

                # Verificar se o DataFrame não está vazio
                if not df.empty:
                    # Limpar lista atual
                    self.profissionais = []

                    for _, row in df.iterrows():
                        nome = str(row.get('nome_completo', '')).strip() if pd.notna(row.get('nome_completo')) else ''
                        apelido = str(row.get('apelido', '')).strip().upper() if pd.notna(row.get('apelido')) else ''
                        categoria = str(row.get('categoria', '')).strip() if pd.notna(row.get('categoria')) else ''

                        if nome and nome.lower() != 'nan':
                            self.profissionais.append({
                                'nome_completo': nome,
                                'apelido': apelido,
                                'categoria': categoria,
                                'ativo': True
                            })

                    # Carregar categorias únicas
                    if 'categoria' in df.columns:
                        self.categorias = sorted([c for c in df['categoria'].dropna().unique().tolist() if c])

                    logging.info(f"✅ Carregados {len(self.profissionais)} profissionais da planilha")
                else:
                    logging.info("📋 Aba CADASTRAR_PROFISSIONAL está vazia")
            else:
                logging.warning("⚠️ Aba CADASTRAR_PROFISSIONAL não encontrada")

        except Exception as e:
            logging.error(f"Erro ao carregar da planilha: {e}")

    def salvar_profissionais_na_planilha(self):  # ← NOVO MÉTODO
        """Salva profissionais na aba CADASTRAR_PROFISSIONAL"""
        try:
            dados = []
            for prof in self.profissionais:
                dados.append({
                    'nome_completo': prof['nome_completo'],
                    'apelido': prof['apelido'],
                    'categoria': prof['categoria'],
                    'ativo': prof.get('ativo', True)
                })
            df_novo = pd.DataFrame(dados)
            self.base_dados.df_geral['CADASTRAR_PROFISSIONAL'] = df_novo
            self.base_dados.salvar()
            return True
        except Exception as e:
            logging.error(f"Erro ao salvar na planilha: {e}")
            return False

    def carregar_profissionais(self):
        """Carrega profissionais cadastrados (mantido igual)"""
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    self.profissionais = config.get("profissionais_cadastrados", [])
                    self.categorias = config.get("categorias", [])

                # Remover duplicatas na lista de profissionais (caso existam no arquivo)
                profissionais_unicos = {}
                for prof in self.profissionais:
                    nome = prof['nome_completo'].lower()
                    if nome not in profissionais_unicos:
                        profissionais_unicos[nome] = prof

                self.profissionais = list(profissionais_unicos.values())
                logging.info(f"✅ Carregados {len(self.profissionais)} profissionais únicos")
        except Exception as e:
            logging.error(f"Erro ao carregar profissionais: {e}")
            self.profissionais = []
            self.categorias = []

    def unificar_nome_avancado(self, nome_planilha):
        """Unifica nomes APENAS se estiver cadastrado (nome completo ou apelido)"""
        if not nome_planilha or pd.isna(nome_planilha):
            return nome_planilha

        # Converter para string e limpar
        nome_planilha = str(nome_planilha).strip()
        nome_planilha_lower = nome_planilha.lower()

        # Verificar cache
        if nome_planilha in self.cache_unificacao:
            return self.cache_unificacao[nome_planilha]

        # 1. Verificar correspondência exata com nome completo
        for prof in self.profissionais:
            if nome_planilha_lower == prof['nome_completo'].lower():
                self.cache_unificacao[nome_planilha] = prof['nome_completo']
                logging.info(f"✅ Unificado (nome completo): {nome_planilha} -> {prof['nome_completo']}")
                return prof['nome_completo']

        # 2. Verificar correspondência exata com apelido
        for prof in self.profissionais:
            if nome_planilha_lower == prof['apelido'].lower():
                self.cache_unificacao[nome_planilha] = prof['nome_completo']
                logging.info(f"✅ Unificado (apelido): {nome_planilha} -> {prof['nome_completo']}")
                return prof['nome_completo']

        # 3. Se não encontrou, retorna o nome original
        self.cache_unificacao[nome_planilha] = nome_planilha
        logging.info(f"ℹ️ Não unificado (sem cadastro): {nome_planilha}")
        return nome_planilha

    def unificar_nome(self, nome_planilha):
        """Método principal de unificação (usa a versão avançada)"""
        return self.unificar_nome_avancado(nome_planilha)

    def salvar_profissionais(self):
        """Salva profissionais no arquivo de configuração (mantido igual)"""
        try:
            if self.base_dados:  # ← SE TIVER BASE_DADOS, SALVA NA PLANILHA
                return self.salvar_profissionais_na_planilha()

            # SENÃO, SALVA NO ARQUIVO (COMPORTAMENTO ORIGINAL)
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)
            else:
                config = {}

            config["profissionais_cadastrados"] = self.profissionais
            config["categorias"] = self.categorias

            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=4, ensure_ascii=False)
            return True
        except Exception as e:
            logging.error(f"Erro ao salvar profissionais: {e}")
            return False

    def adicionar_profissional(self, nome_completo, apelido, categoria):
        """Adiciona novo profissional"""
        for prof in self.profissionais:
            if prof['nome_completo'].lower() == nome_completo.lower():
                return False, "Profissional já cadastrado!"

        # Se apelido estiver vazio, usar o primeiro nome do nome_completo
        if not apelido or apelido.strip() == "":
            primeiro_nome = nome_completo.split()[0].upper() if nome_completo else nome_completo
            apelido = primeiro_nome

        self.profissionais.append({
            'nome_completo': nome_completo.strip(),
            'apelido': apelido.strip().upper(),
            'categoria': categoria.strip(),
            'ativo': True
        })
        self.salvar_profissionais()
        return True, "Profissional adicionado com sucesso!"

    def editar_profissional(self, index, nome_completo, apelido, categoria):
        """Edita profissional existente"""
        if 0 <= index < len(self.profissionais):
            self.profissionais[index] = {
                'nome_completo': nome_completo.strip(),
                'apelido': apelido.strip().upper() if apelido else nome_completo.split()[0].upper(),
                'categoria': categoria.strip(),
                'ativo': True
            }
            self.salvar_profissionais()
            return True, "Profissional editado com sucesso!"
        return False, "Profissional não encontrado!"

    def excluir_profissional(self, index):
        """Exclui profissional"""
        if 0 <= index < len(self.profissionais):
            del self.profissionais[index]
            self.salvar_profissionais()
            return True, "Profissional excluído com sucesso!"
        return False, "Profissional não encontrado!"

    def adicionar_categoria(self, categoria):
        """Adiciona nova categoria"""
        if categoria and categoria not in self.categorias:
            self.categorias.append(categoria)
            self.categorias.sort()
            self.salvar_profissionais()
            return True, "Categoria adicionada com sucesso!"
        return False, "Categoria já existe ou inválida!"

    def excluir_categoria(self, categoria):
        """Exclui categoria"""
        if categoria in self.categorias:
            self.categorias.remove(categoria)
            self.salvar_profissionais()
            return True, "Categoria excluída com sucesso!"
        return False, "Categoria não encontrada!"

    def get_categoria_profissional(self, nome_completo):
        """Retorna categoria de um profissional"""
        for prof in self.profissionais:
            if prof['nome_completo'].lower() == nome_completo.lower():
                return prof['categoria']
        return "Não Definida"

    def importar_profissionais_detectados(self, nomes_detectados):
        """Importa profissionais detectados nos relatórios"""
        novos = 0
        for nome in nomes_detectados:
            if nome and not any(p['nome_completo'].lower() == nome.lower() for p in self.profissionais):
                nome_completo = nome.strip()
                apelido = nome.split()[0].upper() if nome else nome
                self.profissionais.append({
                    'nome_completo': nome_completo,
                    'apelido': apelido,
                    'categoria': "Não Definida",
                    'ativo': True
                })
                novos += 1
        if novos > 0:
            self.salvar_profissionais()
        return novos


# ============================================================================
# SISTEMA DE COLETA (UNIFICA OS DOIS SISTEMAS ORIGINAIS)
# ============================================================================

class SistemaColetaNodri:
    """Sistema de coleta unificado (Relatório Geral + Profissionais)"""

    def __init__(self):
        self.driver = None
        self.config_file = ARQUIVO_CONFIG
        self.download_dir = os.path.join(os.path.expanduser("~"), "Downloads")

        # Configurações editáveis
        self.configuracoes_editaveis = {
            "timeouts": {
                "login": 30,
                "pagina": 120,
                "elemento": 30,
                "download": 20,
                "pausa_buscar": 30
            },
            "xpaths": {
                "login": {
                    "email": "//*[@id='single-spa-application:@hyperlocal/auth']/div/div/div/div[2]/div[2]/div[1]/div[2]/div/input",
                    "senha": "//*[@id='single-spa-application:@hyperlocal/auth']/div/div/div/div[2]/div[2]/div[1]/div[3]/div/input",
                    "btn_acessar": "//*[@id='single-spa-application:@hyperlocal/auth']/div/div/div/div[2]/div[2]/div[2]/div/button[1]"
                },
                "relatorios": {
                    "data_inicio": "//*[@id='variaveis']/div[1]/span[1]/div/input",
                    "data_fim": "//*[@id='variaveis']/div[1]/span[2]/div/input",
                    "btn_buscar": "//*[@id='variaveis']/div[1]/span[3]/button",
                    "btn_buscar_0021": "//*[@id='variaveis']/div[1]/span[4]/button",
                    "btn_buscar_0126": "//*[@id='variaveis']/div[1]/span[4]/button",
                    "btn_excel": "//*[@id='tableFilter_wrapper']/div[3]/a[2]/span",
                    "btn_excel_0021": "//*[@id='tableFilter_wrapper']/div[3]/a[2]",
                    "btn_excel_0126": "//*[@id='tableFilter_wrapper']/div[3]/a[2]"
                }
            },
            "urls": {
                "login": "https://admin.avec.beauty/rougehair/admin",
                "relatorios": {
                    "0083": "https://admin.avec.beauty/admin/relatorio/0083",
                    "0017": "https://admin.avec.beauty/admin/relatorio/0017",
                    "0032": "https://admin.avec.beauty/admin/relatorio/0032",
                    "0042": "https://admin.avec.beauty/admin/relatorio/0042",
                    "0088": "https://admin.avec.beauty/admin/relatorio/0088",
                    "0123": "https://admin.avec.beauty/admin/relatorio/0123",
                    "0021": "https://admin.avec.beauty/admin/relatorio/0021",
                    "0326": "https://admin.avec.beauty/admin/relatorio/0326",
                    "0126": "https://admin.avec.beauty/admin/relatorio/0126",
                    "0031": "https://admin.avec.beauty/admin/relatorio/0031",
                    "0041": "https://admin.avec.beauty/admin/relatorio/0041",
                    "0051": "https://admin.avec.beauty/admin/relatorio/0051",
                    "0033": "https://admin.avec.beauty/admin/relatorio/0033",
                    "comandas": "https://admin.avec.beauty/admin/financeiro/comanda/historico"
                }
            },
            "caminhos": {
                "pasta_relatorios": PASTA_RELATORIOS
            }
        }

        self.carregar_configuracao()
        # ÚNICA MODIFICAÇÃO: passar self.base_dados quando tiver
        # Por enquanto, inicializa sem base_dados
        self.gerenciador_profissionais = GerenciadorProfissionais(self.config_file)

    def set_base_dados(self, base_dados):  # ← NOVO MÉTODO
        """Define a base de dados após a criação"""
        self.base_dados = base_dados
        # Recria o gerenciador com a base_dados
        self.gerenciador_profissionais = GerenciadorProfissionais(self.config_file, base_dados)

    # ... resto do código exatamente igual ...

    def carregar_configuracao(self):
        """Carrega configuração do arquivo"""
        if os.path.exists(self.config_file):
            with open(self.config_file, 'r', encoding='utf-8') as f:
                self.config = json.load(f)
                if "editaveis" in self.config:
                    editaveis_salvas = self.config["editaveis"]
                    for categoria in self.configuracoes_editaveis:
                        if categoria in editaveis_salvas:
                            if isinstance(self.configuracoes_editaveis[categoria], dict):
                                self.configuracoes_editaveis[categoria].update(editaveis_salvas[categoria])
                            else:
                                self.configuracoes_editaveis[categoria] = editaveis_salvas[categoria]
        else:
            self.config = {
                "email": "",
                "senha": "",
                "url_login": self.configuracoes_editaveis["urls"]["login"],
                "xpaths": self.configuracoes_editaveis["xpaths"]["login"],
                "salvar_senha": False,
                "profissionais_cadastrados": [],
                "categorias": [],
                "editaveis": self.configuracoes_editaveis
            }
            self.salvar_configuracao()

    def salvar_configuracao(self):
        """Salva configuração no arquivo"""
        self.config["editaveis"] = self.configuracoes_editaveis
        with open(self.config_file, 'w', encoding='utf-8') as f:
            json.dump(self.config, f, indent=4, ensure_ascii=False)

    # ------------------------------------------------------------------
    # UTILITÁRIOS: Chrome path e ChromeDriver robusto
    # ------------------------------------------------------------------

    def _encontrar_chrome_windows(self):
        """Busca o executável do Chrome via registro e caminhos padrão."""
        caminhos_padrao = [
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
            os.path.join(os.environ.get("LOCALAPPDATA", ""), r"Google\Chrome\Application\chrome.exe"),
            os.path.join(os.environ.get("PROGRAMFILES", ""), r"Google\Chrome\Application\chrome.exe"),
        ]
        # Busca pelo Registro do Windows
        try:
            import winreg
            for hive in (winreg.HKEY_LOCAL_MACHINE, winreg.HKEY_CURRENT_USER):
                for subkey in (
                    r"SOFTWARE\Google\Chrome\BLBeacon",
                    r"SOFTWARE\Wow6432Node\Google\Chrome\BLBeacon",
                    r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe",
                ):
                    try:
                        with winreg.OpenKey(hive, subkey) as k:
                            val, _ = winreg.QueryValueEx(k, "path" if "BLBeacon" in subkey else "")
                            if os.path.exists(val):
                                return val
                    except Exception:
                        pass
        except Exception:
            pass
        for p in caminhos_padrao:
            if os.path.exists(p):
                return p
        return None

    def _obter_versao_chrome(self, chrome_path):
        """Retorna a versão principal do Chrome (ex: 124)."""
        try:
            import subprocess
            resultado = subprocess.run(
                [chrome_path, "--version"], capture_output=True, text=True, timeout=5
            )
            versao_str = resultado.stdout.strip()  # "Google Chrome 124.0.6367.60"
            versao_num = versao_str.split()[-1].split(".")[0]
            return int(versao_num)
        except Exception:
            return None

    def _instalar_chromedriver(self, ssl_bypass=False):
        """
        Tenta instalar/atualizar o ChromeDriver via webdriver-manager.
        ssl_bypass=True desativa verificação SSL (redes corporativas / antivírus).
        """
        try:
            from webdriver_manager.chrome import ChromeDriverManager
            from webdriver_manager.core.http import WDMHttpClient
            import urllib3

            if ssl_bypass:
                urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
                os.environ["WDM_SSL_VERIFY"] = "0"

            return ChromeDriverManager().install()
        except Exception as e:
            logging.warning(f"webdriver-manager falhou: {e}")
            return None

    def _diagnosticar_erro_chromedriver(self, erro_str):
        """Retorna mensagem amigável baseada no tipo de erro."""
        erro_lower = erro_str.lower()
        if "ssl" in erro_lower or "certificate" in erro_lower:
            return (
                "❌ Bloqueio SSL detectado (possível antivírus ou rede corporativa).\n"
                "O sistema tentará o modo de bypass automático.\n"
                f"Suporte: {SUPORTE_TELEFONE}"
            )
        if "not found" in erro_lower or "executable" in erro_lower:
            return (
                "❌ ChromeDriver não encontrado.\n"
                "Certifique-se de ter o Google Chrome instalado.\n"
                f"Suporte: {SUPORTE_TELEFONE}"
            )
        if "antivir" in erro_lower or "permission" in erro_lower or "access" in erro_lower:
            return (
                "❌ Antivírus ou permissão bloqueando o ChromeDriver.\n"
                "Adicione o programa à lista de exceções do antivírus.\n"
                f"Suporte: {SUPORTE_TELEFONE}"
            )
        return (
            f"❌ Erro ao iniciar Chrome: {erro_str[:120]}\n"
            f"Suporte: {SUPORTE_TELEFONE}"
        )

    def _matar_chromedrivers_orfaos(self):
        """Elimina processos chromedriver que ficaram pendurados."""
        try:
            import subprocess
            subprocess.run(
                ["taskkill", "/F", "/IM", "chromedriver.exe"],
                capture_output=True, timeout=5
            )
        except Exception:
            pass

    def _montar_chrome_options(self):
        """Retorna ChromeOptions padronizadas."""
        chrome_options = Options()
        prefs = {
            "download.default_directory": self.download_dir,
            "download.prompt_for_download": False,
            "download.directory_upgrade": True,
        }
        chrome_options.add_experimental_option("prefs", prefs)
        chrome_options.add_argument("--start-maximized")
        # Tamanho FIXO grande: garante o layout DESKTOP do NODRI (sem o menu ☰ de
        # celular) mesmo quando a janela abre em segundo plano/minimizada pelo
        # Agendador — é o que mantém a automação confiável.
        chrome_options.add_argument("--window-size=1440,1000")
        chrome_options.add_argument("--window-position=0,0")
        chrome_options.add_argument("--disable-blink-features=AutomationControlled")
        chrome_options.add_argument("--ignore-certificate-errors")
        chrome_options.add_argument("--allow-insecure-localhost")
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option("useAutomationExtension", False)

        chrome_path = self._encontrar_chrome_windows()
        if chrome_path:
            chrome_options.binary_location = chrome_path
            logging.info(f"Chrome encontrado: {chrome_path}")

        return chrome_options

    def iniciar_driver(self):
        """
        Inicia o ChromeDriver com 3 tentativas:
          1ª — webdriver-manager normal
          2ª — webdriver-manager com SSL bypass
          3ª — selenium sem webdriver-manager (ChromeDriver no PATH)
        """
        self._matar_chromedrivers_orfaos()
        chrome_options = self._montar_chrome_options()
        ultimo_erro = ""

        for tentativa in range(1, 4):
            logging.info(f"🔧 Tentativa {tentativa}/3 de iniciar Chrome...")
            try:
                if tentativa <= 2:
                    ssl_bypass = (tentativa == 2)
                    driver_path = self._instalar_chromedriver(ssl_bypass=ssl_bypass)
                    if driver_path:
                        from selenium.webdriver.chrome.service import Service
                        service = Service(executable_path=driver_path)
                        self.driver = webdriver.Chrome(service=service, options=chrome_options)
                    else:
                        self.driver = webdriver.Chrome(options=chrome_options)
                else:
                    # Tentativa 3: confia no PATH do sistema
                    self.driver = webdriver.Chrome(options=chrome_options)

                self.driver.set_page_load_timeout(60)
                # Garante a janela visível e em tamanho desktop (não minimizada)
                try:
                    self.driver.set_window_position(0, 0)
                    self.driver.set_window_size(1440, 1000)
                    self.driver.maximize_window()
                except Exception:
                    pass
                time.sleep(2)

                chrome_pid = None
                for proc in psutil.process_iter(['pid', 'name']):
                    try:
                        if 'chrome' in proc.info['name'].lower():
                            chrome_pid = proc.info['pid']
                            break
                    except Exception:
                        continue

                logging.info(f"✅ Chrome iniciado (tentativa {tentativa}), PID: {chrome_pid}")
                return chrome_pid

            except Exception as e:
                ultimo_erro = str(e)
                logging.warning(f"Tentativa {tentativa} falhou: {ultimo_erro}")
                self._matar_chromedrivers_orfaos()
                time.sleep(2)

        # Todas as tentativas falharam
        msg = self._diagnosticar_erro_chromedriver(ultimo_erro)
        logging.error(f"❌ ChromeDriver falhou após 3 tentativas: {ultimo_erro}")
        raise RuntimeError(msg)

    def fazer_login(self, email, senha):
        """Faz login no sistema"""
        try:
            self.driver.get(self.configuracoes_editaveis["urls"]["login"])
            time.sleep(5)

            email_field = WebDriverWait(self.driver, self.configuracoes_editaveis["timeouts"]["login"]).until(
                EC.presence_of_element_located((By.XPATH, self.configuracoes_editaveis["xpaths"]["login"]["email"]))
            )
            email_field.clear()
            time.sleep(0.5)
            email_field.send_keys(email)

            senha_field = self.driver.find_element(By.XPATH, self.configuracoes_editaveis["xpaths"]["login"]["senha"])
            senha_field.clear()
            time.sleep(0.5)
            senha_field.send_keys(senha)

            btn_acessar = self.driver.find_element(By.XPATH,
                                                   self.configuracoes_editaveis["xpaths"]["login"]["btn_acessar"])
            btn_acessar.click()
            time.sleep(15)

            try:
                WebDriverWait(self.driver, 10).until(
                    EC.presence_of_element_located((By.TAG_NAME, "body"))
                )
                logging.info("Login realizado com sucesso")
                return True
            except:
                logging.warning("Possível problema no login, continuando...")
                return True

        except Exception as e:
            logging.error(f"Erro no login: {e}")
            return False

    def encontrar_ultimo_excel(self):
        """Encontra o último arquivo Excel baixado"""
        try:
            time.sleep(3)
            arquivos = glob.glob(os.path.join(self.download_dir, "*.xlsx"))
            if not arquivos:
                arquivos = glob.glob(os.path.join(self.download_dir, "*.xls"))

            if not arquivos:
                arquivos_temp = glob.glob(os.path.join(self.download_dir, "*.crdownload"))
                if arquivos_temp:
                    logging.info("Download em andamento, aguardando...")
                    time.sleep(3)
                    arquivos = glob.glob(os.path.join(self.download_dir, "*.xlsx"))
                    if not arquivos:
                        arquivos = glob.glob(os.path.join(self.download_dir, "*.xls"))

            if arquivos:
                arquivos_validos = []
                for arquivo in arquivos:
                    try:
                        with open(arquivo, 'rb'):
                            pass
                        arquivos_validos.append(arquivo)
                    except:
                        continue

                if arquivos_validos:
                    arquivos_validos.sort(key=os.path.getmtime, reverse=True)
                    logging.info(f"Arquivo Excel encontrado: {arquivos_validos[0]}")
                    return arquivos_validos[0]

            logging.warning("Nenhum arquivo Excel válido encontrado")
            return None
        except Exception as e:
            logging.error(f"Erro ao encontrar arquivo Excel: {e}")
            return None

    def converter_valor_monetario(self, valor_str):
        """Converte string para valor monetário"""
        try:
            if valor_str == "N/A" or valor_str == "" or valor_str is None:
                return 0.0

            valor_limpo = re.sub(r'[^\d,\.]', '', str(valor_str))

            if ',' in valor_limpo and '.' in valor_limpo:
                valor_limpo = valor_limpo.replace('.', '').replace(',', '.')
            elif ',' in valor_limpo:
                if valor_limpo.count(',') == 1 and len(valor_limpo.split(',')[1]) <= 2:
                    valor_limpo = valor_limpo.replace(',', '.')
                else:
                    valor_limpo = valor_limpo.replace(',', '')

            return float(valor_limpo)
        except:
            return 0.0

    def converter_valor_com_sinal(self, valor_str):
        """Igual a converter_valor_monetario, mas preserva o negativo.

        O converter_valor_monetario limpa a string com um regex que so aceita
        digito, virgula e ponto -- e isso apaga o sinal de menos junto com o
        "R$". Para faturamento, ticket e clientes isso nunca fez falta, porque
        nenhum deles e negativo. Mas no relatorio 0123 o negativo carrega
        informacao: e como a Avec diz que a profissional esta devendo.

        Por isso este conversor existe separado, usado so na leitura do 0123,
        em vez de mudar o de cima e mexer nas 14 chamadas dele.
        """
        if valor_str is None:
            return 0.0
        texto = str(valor_str).strip()
        if texto == "" or texto == "N/A":
            return 0.0
        # "(123,45)" e a outra forma de escrever negativo em relatorio financeiro
        # o menos pode vir em qualquer posicao dependendo de como o valor chega:
        # "-198,64", "R$ -198,64" ou "198,64-". Em coluna de dinheiro, menos em
        # qualquer lugar so pode significar negativo.
        negativo = "-" in texto or (texto.startswith("(") and texto.endswith(")"))
        valor = self.converter_valor_monetario(texto)
        return -valor if negativo else valor

    def _aplicar_cliques_padrao(self, xpath_buscar):
        """Aplica os dois cliques com pausa de 30 segundos e Enter"""
        try:
            import pyautogui
            btn_buscar = self.driver.find_element(By.XPATH, xpath_buscar)
            btn_buscar.click()
            logging.info(
                f"⏳ Primeiro clique - aguardando {self.configuracoes_editaveis['timeouts']['pausa_buscar']}s...")
            time.sleep(self.configuracoes_editaveis['timeouts']['pausa_buscar'])

            pyautogui.press('enter')
            time.sleep(2)

            btn_buscar = self.driver.find_element(By.XPATH, xpath_buscar)
            btn_buscar.click()
            logging.info(
                f"⏳ Segundo clique - aguardando {self.configuracoes_editaveis['timeouts']['pausa_buscar']}s...")
            time.sleep(self.configuracoes_editaveis['timeouts']['pausa_buscar'])

            return True
        except Exception as e:
            logging.error(f"Erro nos cliques padrão: {e}")
            return False

    # ============================================================================
    # MÉTODOS DE COLETA - RELATÓRIO GERAL (0083, 0017, 0032, 0042, 0088)
    # ============================================================================

    def coletar_relatorio_0083(self, data_inicio, data_fim):
        """Coleta dados do relatório 0083 (Faturamento e Ticket Médio)"""
        try:
            url = self.configuracoes_editaveis["urls"]["relatorios"]["0083"]
            self.driver.get(url)
            time.sleep(3)

            # Preencher datas
            data_inicio_field = WebDriverWait(self.driver, self.configuracoes_editaveis["timeouts"]["elemento"]).until(
                EC.presence_of_element_located(
                    (By.XPATH, self.configuracoes_editaveis["xpaths"]["relatorios"]["data_inicio"]))
            )
            data_inicio_field.click()
            time.sleep(0.5)
            data_inicio_field.send_keys(Keys.CONTROL + "a")
            time.sleep(0.5)
            data_inicio_field.send_keys(data_inicio)
            time.sleep(0.5)

            data_fim_field = self.driver.find_element(By.XPATH,
                                                      self.configuracoes_editaveis["xpaths"]["relatorios"]["data_fim"])
            data_fim_field.click()
            time.sleep(0.5)
            data_fim_field.send_keys(Keys.CONTROL + "a")
            time.sleep(0.5)
            data_fim_field.send_keys(data_fim)
            time.sleep(0.5)

            # Clicar em buscar
            self._aplicar_cliques_padrao(self.configuracoes_editaveis["xpaths"]["relatorios"]["btn_buscar"])

            # Aguardar carregamento
            WebDriverWait(self.driver, self.configuracoes_editaveis["timeouts"]["elemento"]).until(
                EC.presence_of_element_located((By.ID, "tableFilter"))
            )

            # Extrair valores
            dados = {}
            try:
                elemento_faturamento = self.driver.find_element(By.XPATH, '//*[@id="totalRelatorio"]/tbody/tr[1]/td[2]')
                dados['faturamento'] = elemento_faturamento.text
            except:
                dados['faturamento'] = "0"

            try:
                elemento_ticket = self.driver.find_element(By.XPATH, '//*[@id="totalRelatorio"]/tbody/tr[2]/td[2]')
                dados['ticket_medio'] = elemento_ticket.text
            except:
                dados['ticket_medio'] = "0"

            try:
                # tr[4]: o Avec inseriu uma linha no meio do quadro de totais, e o
                # tr[3] passou a apontar para ela. Como o erro nao levanta excecao,
                # o robo vinha gravando o numero errado calado.
                elemento_clientes = self.driver.find_element(By.XPATH, '//*[@id="totalRelatorio"]/tbody/tr[4]/td[2]')
                dados['clientes_atendidos'] = elemento_clientes.text
            except:
                dados['clientes_atendidos'] = "0"

            logging.info(f"✅ 0083 - Faturamento: {dados.get('faturamento', '0')}")
            return dados

        except Exception as e:
            logging.error(f"Erro ao coletar 0083: {e}")
            return {}

    def coletar_relatorio_0017(self, data_inicio, data_fim):
        """Coleta dados do relatório 0017 (Clientes Novos)"""
        try:
            url = self.configuracoes_editaveis["urls"]["relatorios"]["0017"]
            self.driver.get(url)
            time.sleep(3)

            # Preencher datas
            data_inicio_field = WebDriverWait(self.driver, self.configuracoes_editaveis["timeouts"]["elemento"]).until(
                EC.presence_of_element_located(
                    (By.XPATH, self.configuracoes_editaveis["xpaths"]["relatorios"]["data_inicio"]))
            )
            data_inicio_field.click()
            time.sleep(0.5)
            data_inicio_field.send_keys(Keys.CONTROL + "a")
            time.sleep(0.5)
            data_inicio_field.send_keys(data_inicio)
            time.sleep(0.5)

            data_fim_field = self.driver.find_element(By.XPATH,
                                                      self.configuracoes_editaveis["xpaths"]["relatorios"]["data_fim"])
            data_fim_field.click()
            time.sleep(0.5)
            data_fim_field.send_keys(Keys.CONTROL + "a")
            time.sleep(0.5)
            data_fim_field.send_keys(data_fim)
            time.sleep(0.5)

            # Clicar em buscar
            self._aplicar_cliques_padrao(self.configuracoes_editaveis["xpaths"]["relatorios"]["btn_buscar"])

            # Aguardar carregamento
            WebDriverWait(self.driver, self.configuracoes_editaveis["timeouts"]["elemento"]).until(
                EC.presence_of_element_located((By.ID, "tableFilter"))
            )

            # Extrair valores
            dados = {}
            try:
                elemento_clientes = self.driver.find_element(By.XPATH, '//*[@id="totalRelatorio"]/tbody/tr/td[2]')
                dados['clientes_novos'] = elemento_clientes.text
            except:
                dados['clientes_novos'] = "0"

            logging.info(f"✅ 0017 - Clientes Novos: {dados.get('clientes_novos', '0')}")
            return dados

        except Exception as e:
            logging.error(f"Erro ao coletar 0017: {e}")
            return {}

    def coletar_relatorio_0032(self, data_inicio, data_fim):
        """Coleta relatório 0032 (Serviços Mais Vendidos)"""
        try:
            url = self.configuracoes_editaveis["urls"]["relatorios"]["0032"]
            self.driver.get(url)
            time.sleep(3)

            # Preencher datas
            data_inicio_field = WebDriverWait(self.driver, self.configuracoes_editaveis["timeouts"]["elemento"]).until(
                EC.presence_of_element_located(
                    (By.XPATH, self.configuracoes_editaveis["xpaths"]["relatorios"]["data_inicio"]))
            )
            data_inicio_field.click()
            time.sleep(0.5)
            data_inicio_field.send_keys(Keys.CONTROL + "a")
            time.sleep(0.5)
            data_inicio_field.send_keys(data_inicio)
            time.sleep(0.5)

            data_fim_field = self.driver.find_element(By.XPATH,
                                                      self.configuracoes_editaveis["xpaths"]["relatorios"]["data_fim"])
            data_fim_field.click()
            time.sleep(0.5)
            data_fim_field.send_keys(Keys.CONTROL + "a")
            time.sleep(0.5)
            data_fim_field.send_keys(data_fim)
            time.sleep(0.5)

            # Clicar em buscar
            self._aplicar_cliques_padrao(self.configuracoes_editaveis["xpaths"]["relatorios"]["btn_buscar"])

            # Aguardar carregamento
            WebDriverWait(self.driver, self.configuracoes_editaveis["timeouts"]["elemento"]).until(
                EC.presence_of_element_located((By.ID, "tableFilter"))
            )

            # Clicar em Excel
            btn_excel = WebDriverWait(self.driver, 15).until(
                EC.element_to_be_clickable(
                    (By.XPATH, self.configuracoes_editaveis["xpaths"]["relatorios"]["btn_excel"]))
            )
            btn_excel.click()
            time.sleep(self.configuracoes_editaveis["timeouts"]["download"])

            arquivo_excel = self.encontrar_ultimo_excel()
            if arquivo_excel:
                time.sleep(3)
                dados_servicos = self._processar_excel_servicos(arquivo_excel)

                # Mover para pasta de relatórios
                relatorios_dir = self.configuracoes_editaveis["caminhos"]["pasta_relatorios"]
                if not os.path.exists(relatorios_dir):
                    os.makedirs(relatorios_dir)

                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                periodo = f"{data_inicio.replace('/', '')}_{data_fim.replace('/', '')}"
                novo_nome = f"{relatorios_dir}/Relatorio_0032_{periodo}_{timestamp}.xlsx"

                shutil.move(arquivo_excel, novo_nome)
                logging.info(f"✅ 0032 processado: {novo_nome}")

                return dados_servicos

            return []

        except Exception as e:
            logging.error(f"Erro ao coletar 0032: {e}")
            return []

    def _processar_excel_servicos(self, caminho_arquivo):
        """Processa Excel do relatório 0032"""
        try:
            df = pd.read_excel(caminho_arquivo)
            logging.info(f"Colunas 0032: {df.columns.tolist()}")

            coluna_servico = None
            coluna_quantidade = None

            for col in df.columns:
                col_lower = str(col).lower().strip()

                if coluna_servico is None:
                    if any(term in col_lower for term in
                           ['serviço', 'servico', 'descrição', 'descricao', 'nome', 'item']):
                        coluna_servico = col

                if coluna_quantidade is None:
                    if any(term in col_lower for term in ['quantidade', 'qtd', 'qtde', 'total', 'vendas']):
                        coluna_quantidade = col

            if coluna_servico is None and len(df.columns) >= 1:
                coluna_servico = df.columns[0]

            if coluna_quantidade is None and len(df.columns) >= 2:
                coluna_quantidade = df.columns[1]

            if coluna_servico and coluna_quantidade:
                df[coluna_quantidade] = pd.to_numeric(df[coluna_quantidade], errors='coerce')
                df = df.dropna(subset=[coluna_quantidade])
                df = df.sort_values(by=coluna_quantidade, ascending=False)

                resultados = []
                for _, row in df.iterrows():
                    resultados.append({
                        'Serviço': str(row[coluna_servico]),
                        'Quantidade': int(row[coluna_quantidade])
                    })

                return resultados

            return []

        except Exception as e:
            logging.error(f"Erro ao processar Excel 0032: {e}")
            return []

    def coletar_relatorio_0042(self, data_inicio, data_fim):
        """Coleta relatório 0042 (Produtos Mais Vendidos)"""
        try:
            url = self.configuracoes_editaveis["urls"]["relatorios"]["0042"]
            self.driver.get(url)
            time.sleep(3)

            # Preencher datas
            data_inicio_field = WebDriverWait(self.driver, self.configuracoes_editaveis["timeouts"]["elemento"]).until(
                EC.presence_of_element_located(
                    (By.XPATH, self.configuracoes_editaveis["xpaths"]["relatorios"]["data_inicio"]))
            )
            data_inicio_field.click()
            time.sleep(0.5)
            data_inicio_field.send_keys(Keys.CONTROL + "a")
            time.sleep(0.5)
            data_inicio_field.send_keys(data_inicio)
            time.sleep(0.5)

            data_fim_field = self.driver.find_element(By.XPATH,
                                                      self.configuracoes_editaveis["xpaths"]["relatorios"]["data_fim"])
            data_fim_field.click()
            time.sleep(0.5)
            data_fim_field.send_keys(Keys.CONTROL + "a")
            time.sleep(0.5)
            data_fim_field.send_keys(data_fim)
            time.sleep(0.5)

            # Clicar em buscar
            self._aplicar_cliques_padrao(self.configuracoes_editaveis["xpaths"]["relatorios"]["btn_buscar"])

            # Aguardar carregamento
            WebDriverWait(self.driver, self.configuracoes_editaveis["timeouts"]["elemento"]).until(
                EC.presence_of_element_located((By.ID, "tableFilter"))
            )

            # Extrair valor faturado
            valor_faturado = "0"
            try:
                elemento_valor = self.driver.find_element(By.XPATH, '//*[@id="totalRelatorio"]/tbody/tr[2]/td[2]')
                valor_faturado = elemento_valor.text
            except:
                pass

            # Clicar em Excel
            btn_excel = WebDriverWait(self.driver, 15).until(
                EC.element_to_be_clickable(
                    (By.XPATH, self.configuracoes_editaveis["xpaths"]["relatorios"]["btn_excel"]))
            )
            btn_excel.click()
            time.sleep(self.configuracoes_editaveis["timeouts"]["download"])

            arquivo_excel = self.encontrar_ultimo_excel()
            if arquivo_excel:
                time.sleep(3)
                dados_produtos = self._processar_excel_produtos(arquivo_excel)

                # Mover para pasta de relatórios
                relatorios_dir = self.configuracoes_editaveis["caminhos"]["pasta_relatorios"]
                if not os.path.exists(relatorios_dir):
                    os.makedirs(relatorios_dir)

                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                periodo = f"{data_inicio.replace('/', '')}_{data_fim.replace('/', '')}"
                novo_nome = f"{relatorios_dir}/Relatorio_0042_{periodo}_{timestamp}.xlsx"

                shutil.move(arquivo_excel, novo_nome)
                logging.info(f"✅ 0042 processado: {novo_nome}")

                return {
                    'produtos': dados_produtos,
                    'valor_faturado': self.converter_valor_monetario(valor_faturado)
                }

            return {'produtos': [], 'valor_faturado': 0}

        except Exception as e:
            logging.error(f"Erro ao coletar 0042: {e}")
            return {'produtos': [], 'valor_faturado': 0}

    def _processar_excel_produtos(self, caminho_arquivo):
        """Processa Excel do relatório 0042"""
        try:
            df = pd.read_excel(caminho_arquivo)
            logging.info(f"Colunas 0042: {df.columns.tolist()}")

            coluna_produto = None
            coluna_quantidade = None

            for col in df.columns:
                col_lower = str(col).lower().strip()

                if coluna_produto is None:
                    if any(term in col_lower for term in ['produto', 'descrição', 'descricao', 'nome', 'item', 'sku']):
                        coluna_produto = col

                if coluna_quantidade is None:
                    if any(term in col_lower for term in ['quantidade', 'qtd', 'qtde', 'total', 'vendas']):
                        coluna_quantidade = col

            if coluna_produto is None and len(df.columns) >= 1:
                coluna_produto = df.columns[0]

            if coluna_quantidade is None and len(df.columns) >= 2:
                coluna_quantidade = df.columns[1]

            if coluna_produto and coluna_quantidade:
                df[coluna_quantidade] = pd.to_numeric(df[coluna_quantidade], errors='coerce')
                df = df.dropna(subset=[coluna_quantidade])
                df = df.sort_values(by=coluna_quantidade, ascending=False)

                resultados = []
                for _, row in df.iterrows():
                    resultados.append({
                        'Produto': str(row[coluna_produto]),
                        'Quantidade': int(row[coluna_quantidade])
                    })

                return resultados

            return []

        except Exception as e:
            logging.error(f"Erro ao processar Excel 0042: {e}")
            return []

    def coletar_relatorio_0088(self, data_inicio, data_fim):
        """Coleta relatório 0088 (Faturamento Diário)"""
        try:
            url = self.configuracoes_editaveis["urls"]["relatorios"]["0088"]
            self.driver.get(url)
            time.sleep(3)

            # Preencher datas
            data_inicio_field = WebDriverWait(self.driver, self.configuracoes_editaveis["timeouts"]["elemento"]).until(
                EC.presence_of_element_located(
                    (By.XPATH, self.configuracoes_editaveis["xpaths"]["relatorios"]["data_inicio"]))
            )
            data_inicio_field.click()
            time.sleep(0.5)
            data_inicio_field.send_keys(Keys.CONTROL + "a")
            time.sleep(0.5)
            data_inicio_field.send_keys(data_inicio)
            time.sleep(0.5)

            data_fim_field = self.driver.find_element(By.XPATH,
                                                      self.configuracoes_editaveis["xpaths"]["relatorios"]["data_fim"])
            data_fim_field.click()
            time.sleep(0.5)
            data_fim_field.send_keys(Keys.CONTROL + "a")
            time.sleep(0.5)
            data_fim_field.send_keys(data_fim)
            time.sleep(0.5)

            # Clicar em buscar
            self._aplicar_cliques_padrao(self.configuracoes_editaveis["xpaths"]["relatorios"]["btn_buscar"])

            # Aguardar carregamento
            WebDriverWait(self.driver, self.configuracoes_editaveis["timeouts"]["elemento"]).until(
                EC.presence_of_element_located((By.ID, "tableFilter"))
            )

            # Clicar em Excel
            btn_excel = WebDriverWait(self.driver, 15).until(
                EC.element_to_be_clickable(
                    (By.XPATH, self.configuracoes_editaveis["xpaths"]["relatorios"]["btn_excel"]))
            )
            btn_excel.click()
            time.sleep(self.configuracoes_editaveis["timeouts"]["download"])

            arquivo_excel = self.encontrar_ultimo_excel()
            if arquivo_excel:
                time.sleep(3)
                dados_faturamento = self._processar_excel_faturamento_diario(arquivo_excel)

                # Mover para pasta de relatórios
                relatorios_dir = self.configuracoes_editaveis["caminhos"]["pasta_relatorios"]
                if not os.path.exists(relatorios_dir):
                    os.makedirs(relatorios_dir)

                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                periodo = f"{data_inicio.replace('/', '')}_{data_fim.replace('/', '')}"
                novo_nome = f"{relatorios_dir}/Relatorio_0088_{periodo}_{timestamp}.xlsx"

                shutil.move(arquivo_excel, novo_nome)
                logging.info(f"✅ 0088 processado: {novo_nome}")

                return dados_faturamento

            return []

        except Exception as e:
            logging.error(f"Erro ao coletar 0088: {e}")
            return []

    def _processar_excel_faturamento_diario(self, caminho_arquivo):
        """Processa Excel do relatório 0088"""
        try:
            df = pd.read_excel(caminho_arquivo)
            logging.info(f"Colunas 0088: {df.columns.tolist()}")

            coluna_data = None
            coluna_valor = None

            dias_semana_pt = {
                'Monday': 'Segunda-feira',
                'Tuesday': 'Terça-feira',
                'Wednesday': 'Quarta-feira',
                'Thursday': 'Quinta-feira',
                'Friday': 'Sexta-feira',
                'Saturday': 'Sábado',
                'Sunday': 'Domingo'
            }

            for col in df.columns:
                col_lower = str(col).lower().strip()

                if coluna_data is None:
                    if any(term in col_lower for term in ['data', 'dia', 'date']):
                        coluna_data = col

                if coluna_valor is None:
                    if any(term in col_lower for term in ['valor', 'faturamento', 'total', 'receita']):
                        coluna_valor = col

            if coluna_data is None and len(df.columns) >= 1:
                coluna_data = df.columns[0]

            if coluna_valor is None and len(df.columns) >= 2:
                coluna_valor = df.columns[1]

            if coluna_data and coluna_valor:
                resultados = []
                for _, row in df.iterrows():
                    try:
                        data_val = row[coluna_data]
                        valor_val = row[coluna_valor]

                        if isinstance(data_val, datetime):
                            data_str = data_val.strftime("%d/%m/%Y")
                        elif isinstance(data_val, str):
                            try:
                                data_obj = datetime.strptime(data_val, "%d/%m/%Y")
                                data_str = data_obj.strftime("%d/%m/%Y")
                            except:
                                data_str = data_val
                        else:
                            continue

                        if isinstance(valor_val, (int, float)):
                            valor_float = float(valor_val)
                        elif isinstance(valor_val, str):
                            valor_float = self.converter_valor_monetario(valor_val)
                        else:
                            valor_float = 0.0

                        try:
                            data_obj = datetime.strptime(data_str, "%d/%m/%Y")
                            dia_semana_en = data_obj.strftime("%A")
                            dia_semana_pt = dias_semana_pt.get(dia_semana_en, dia_semana_en)
                        except:
                            dia_semana_pt = "Desconhecido"

                        resultados.append({
                            'data': data_str,
                            'dia_semana': dia_semana_pt,
                            'valor': valor_float
                        })

                    except Exception as e:
                        continue

                return resultados

            return []

        except Exception as e:
            logging.error(f"Erro ao processar Excel 0088: {e}")
            return []

    # ============================================================================
    # MÉTODOS DE COLETA - PROFISSIONAIS
    # ============================================================================

    def coletar_relatorio_0123(self, data_inicio, data_fim):
        """Coleta relatório 0123 (Pagamentos por Profissional)"""
        try:
            url = self.configuracoes_editaveis["urls"]["relatorios"]["0123"]
            self.driver.get(url)
            time.sleep(3)

            # Preencher datas
            data_inicio_field = WebDriverWait(self.driver, self.configuracoes_editaveis["timeouts"]["elemento"]).until(
                EC.presence_of_element_located(
                    (By.XPATH, self.configuracoes_editaveis["xpaths"]["relatorios"]["data_inicio"]))
            )
            data_inicio_field.click()
            time.sleep(0.5)
            data_inicio_field.send_keys(Keys.CONTROL + "a")
            time.sleep(0.5)
            data_inicio_field.send_keys(data_inicio)
            time.sleep(0.5)

            data_fim_field = self.driver.find_element(By.XPATH,
                                                      self.configuracoes_editaveis["xpaths"]["relatorios"]["data_fim"])
            data_fim_field.click()
            time.sleep(0.5)
            data_fim_field.send_keys(Keys.CONTROL + "a")
            time.sleep(0.5)
            data_fim_field.send_keys(data_fim)
            time.sleep(0.5)

            # Clicar em buscar
            self._aplicar_cliques_padrao(self.configuracoes_editaveis["xpaths"]["relatorios"]["btn_buscar"])

            # Clicar em Excel
            btn_excel = WebDriverWait(self.driver, 15).until(
                EC.element_to_be_clickable(
                    (By.XPATH, self.configuracoes_editaveis["xpaths"]["relatorios"]["btn_excel"]))
            )
            btn_excel.click()
            time.sleep(self.configuracoes_editaveis["timeouts"]["download"])

            arquivo_excel = self.encontrar_ultimo_excel()
            if arquivo_excel:
                time.sleep(3)
                dados_pagamentos = self._processar_excel_0123(arquivo_excel)

                relatorios_dir = self.configuracoes_editaveis["caminhos"]["pasta_relatorios"]
                if not os.path.exists(relatorios_dir):
                    os.makedirs(relatorios_dir)

                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                periodo = f"{data_inicio.replace('/', '')}_{data_fim.replace('/', '')}"
                novo_nome = f"{relatorios_dir}/Relatorio_0123_{periodo}_{timestamp}.xlsx"

                shutil.move(arquivo_excel, novo_nome)
                logging.info(f"✅ 0123 processado: {novo_nome}")

                return dados_pagamentos

            return []

        except Exception as e:
            logging.error(f"Erro ao coletar 0123: {e}")
            return []

    def _processar_excel_0123(self, caminho_arquivo):
        """Processa Excel do relatório 0123"""
        try:
            df = pd.read_excel(caminho_arquivo)
            logging.info(f"Colunas 0123: {df.columns.tolist()}")

            coluna_profissional = None
            coluna_a_pagar = None
            coluna_desconto = None

            for col in df.columns:
                col_lower = str(col).lower().strip()

                if coluna_profissional is None:
                    if any(term in col_lower for term in ['profissional', 'funcionario', 'colaborador', 'nome']):
                        coluna_profissional = col

                if coluna_a_pagar is None:
                    if any(term in col_lower for term in ['a pagar', 'pagamento', 'valor', 'total']):
                        coluna_a_pagar = col

                if coluna_desconto is None:
                    if any(term in col_lower for term in ['desconto', 'descontos', 'abono']):
                        coluna_desconto = col

            if coluna_profissional is None and len(df.columns) >= 1:
                coluna_profissional = df.columns[0]

            if coluna_a_pagar is None and len(df.columns) >= 2:
                coluna_a_pagar = df.columns[1]

            resultados = []
            for _, row in df.iterrows():
                profissional = str(row[coluna_profissional]) if coluna_profissional else ""
                if not profissional:
                    continue

                profissional_unificado = self.gerenciador_profissionais.unificar_nome(profissional)
                categoria = self.gerenciador_profissionais.get_categoria_profissional(profissional_unificado)

                # A Avec manda "Descontos" e "A pagar" com sinal: negativo quer
                # dizer que a profissional esta devendo. E o "A pagar" ja vem
                # com o desconto abatido -- entao devolver o desconto reconstroi
                # o que ela produziu no mes, contando a divida uma vez so:
                #   produziu 100, deve 100, recebe    0  ->     0 - (-100) = 100
                #   produziu 200, deve 100, recebe  100  ->   100 - (-100) = 200
                #   produziu 100, deve 200, recebe -100  ->  -100 - (-200) = 100
                # Antes o sinal era apagado e o NODRI somava os dois modulos,
                # o que inflava quem estava no vermelho: 198,64 + 200 = 398,64
                # no lugar de 1,36. Sem o sinal isso e impossivel de recuperar,
                # porque 51,11 e 123,24 positivos tanto podem ser producao de
                # 174,35 quanto de 72,13.
                a_pagar = self.converter_valor_com_sinal(str(row[coluna_a_pagar]) if coluna_a_pagar else "0")
                descontos = self.converter_valor_com_sinal(str(row[coluna_desconto]) if coluna_desconto else "0")

                valor_a_pagar = round(a_pagar - descontos, 2)

                # desconto sai zerado de proposito. O valor acima ja e a producao
                # cheia, e o NODRI calcula valor_a_pagar + desconto -- mandar o
                # desconto de novo aqui contaria a divida duas vezes.
                resultados.append({
                    'profissional': profissional_unificado,
                    'profissional_original': profissional,
                    'categoria': categoria,
                    'valor_a_pagar': valor_a_pagar,
                    'desconto': 0,
                    'total_pagamento': valor_a_pagar
                })

            logging.info(f"0123: {len(resultados)} profissionais")
            return resultados

        except Exception as e:
            logging.error(f"Erro ao processar Excel 0123: {e}")
            return []

    def coletar_relatorio_0021(self, data_inicio, data_fim):
        """Coleta relatório 0021 (Ticket Médio por Profissional)"""
        try:
            url = self.configuracoes_editaveis["urls"]["relatorios"]["0021"]
            self.driver.get(url)
            time.sleep(3)

            # Preencher datas
            data_inicio_field = WebDriverWait(self.driver, self.configuracoes_editaveis["timeouts"]["elemento"]).until(
                EC.presence_of_element_located(
                    (By.XPATH, self.configuracoes_editaveis["xpaths"]["relatorios"]["data_inicio"]))
            )
            data_inicio_field.click()
            time.sleep(0.5)
            data_inicio_field.send_keys(Keys.CONTROL + "a")
            time.sleep(0.5)
            data_inicio_field.send_keys(data_inicio)
            time.sleep(0.5)

            data_fim_field = self.driver.find_element(By.XPATH,
                                                      self.configuracoes_editaveis["xpaths"]["relatorios"]["data_fim"])
            data_fim_field.click()
            time.sleep(0.5)
            data_fim_field.send_keys(Keys.CONTROL + "a")
            time.sleep(0.5)
            data_fim_field.send_keys(data_fim)
            time.sleep(0.5)

            # Clicar em buscar
            self._aplicar_cliques_padrao(self.configuracoes_editaveis["xpaths"]["relatorios"]["btn_buscar_0021"])

            # Clicar em Excel
            btn_excel = WebDriverWait(self.driver, 15).until(
                EC.element_to_be_clickable(
                    (By.XPATH, self.configuracoes_editaveis["xpaths"]["relatorios"]["btn_excel_0021"]))
            )
            btn_excel.click()
            time.sleep(self.configuracoes_editaveis["timeouts"]["download"])

            arquivo_excel = self.encontrar_ultimo_excel()
            if arquivo_excel:
                time.sleep(3)
                dados_ticket = self._processar_excel_0021(arquivo_excel)

                relatorios_dir = self.configuracoes_editaveis["caminhos"]["pasta_relatorios"]
                if not os.path.exists(relatorios_dir):
                    os.makedirs(relatorios_dir)

                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                periodo = f"{data_inicio.replace('/', '')}_{data_fim.replace('/', '')}"
                novo_nome = f"{relatorios_dir}/Relatorio_0021_{periodo}_{timestamp}.xlsx"

                shutil.move(arquivo_excel, novo_nome)
                logging.info(f"✅ 0021 processado: {novo_nome}")

                return dados_ticket

            return []

        except Exception as e:
            logging.error(f"Erro ao coletar 0021: {e}")
            return []

    def _processar_excel_0021(self, caminho_arquivo):
        """Processa Excel do relatório 0021"""
        try:
            df = pd.read_excel(caminho_arquivo)
            logging.info(f"Colunas 0021: {df.columns.tolist()}")

            coluna_profissional = None
            coluna_ticket = None

            for col in df.columns:
                col_lower = str(col).lower().strip()

                if coluna_profissional is None:
                    if any(term in col_lower for term in ['profissional', 'funcionario', 'colaborador', 'nome']):
                        coluna_profissional = col

                if coluna_ticket is None:
                    if any(term in col_lower for term in ['ticket', 'médio', 'medio', 'valor médio', 'média']):
                        coluna_ticket = col

            if coluna_profissional is None and len(df.columns) >= 1:
                coluna_profissional = df.columns[0]

            if coluna_ticket is None and len(df.columns) >= 2:
                coluna_ticket = df.columns[1]

            resultados = []
            for _, row in df.iterrows():
                profissional = str(row[coluna_profissional]) if coluna_profissional else ""
                if not profissional:
                    continue

                profissional_unificado = self.gerenciador_profissionais.unificar_nome(profissional)
                ticket_medio = self.converter_valor_monetario(str(row[coluna_ticket]) if coluna_ticket else "0")

                resultados.append({
                    'profissional': profissional_unificado,
                    'profissional_original': profissional,
                    'ticket_medio': ticket_medio
                })

            logging.info(f"0021: {len(resultados)} profissionais")
            return resultados

        except Exception as e:
            logging.error(f"Erro ao processar Excel 0021: {e}")
            return []

    def coletar_relatorio_0326(self, data_inicio, data_fim):
        """Coleta relatório 0326 (Preferência de Clientes)"""
        try:
            url = self.configuracoes_editaveis["urls"]["relatorios"]["0326"]
            self.driver.get(url)
            time.sleep(3)

            # Preencher datas
            data_inicio_field = WebDriverWait(self.driver, self.configuracoes_editaveis["timeouts"]["elemento"]).until(
                EC.presence_of_element_located(
                    (By.XPATH, self.configuracoes_editaveis["xpaths"]["relatorios"]["data_inicio"]))
            )
            data_inicio_field.click()
            time.sleep(0.5)
            data_inicio_field.send_keys(Keys.CONTROL + "a")
            time.sleep(0.5)
            data_inicio_field.send_keys(data_inicio)
            time.sleep(0.5)

            data_fim_field = self.driver.find_element(By.XPATH,
                                                      self.configuracoes_editaveis["xpaths"]["relatorios"]["data_fim"])
            data_fim_field.click()
            time.sleep(0.5)
            data_fim_field.send_keys(Keys.CONTROL + "a")
            time.sleep(0.5)
            data_fim_field.send_keys(data_fim)
            time.sleep(0.5)

            # Clicar em buscar
            self._aplicar_cliques_padrao(self.configuracoes_editaveis["xpaths"]["relatorios"]["btn_buscar"])

            # Clicar em Excel
            btn_excel = WebDriverWait(self.driver, 15).until(
                EC.element_to_be_clickable(
                    (By.XPATH, self.configuracoes_editaveis["xpaths"]["relatorios"]["btn_excel"]))
            )
            btn_excel.click()
            time.sleep(self.configuracoes_editaveis["timeouts"]["download"])

            arquivo_excel = self.encontrar_ultimo_excel()
            if arquivo_excel:
                time.sleep(3)
                dados_preferencia = self._processar_excel_0326(arquivo_excel)

                relatorios_dir = self.configuracoes_editaveis["caminhos"]["pasta_relatorios"]
                if not os.path.exists(relatorios_dir):
                    os.makedirs(relatorios_dir)

                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                periodo = f"{data_inicio.replace('/', '')}_{data_fim.replace('/', '')}"
                novo_nome = f"{relatorios_dir}/Relatorio_0326_{periodo}_{timestamp}.xlsx"

                shutil.move(arquivo_excel, novo_nome)
                logging.info(f"✅ 0326 processado: {novo_nome}")

                return dados_preferencia

            return []

        except Exception as e:
            logging.error(f"Erro ao coletar 0326: {e}")
            return []

    def _processar_excel_0326(self, caminho_arquivo):
        """Processa Excel do relatório 0326"""
        try:
            df = pd.read_excel(caminho_arquivo)
            logging.info(f"Colunas 0326: {df.columns.tolist()}")

            coluna_profissional = None
            coluna_preferencia = None
            coluna_sem_preferencia = None

            for col in df.columns:
                col_lower = str(col).lower().strip()

                if coluna_profissional is None:
                    if any(term in col_lower for term in ['profissional', 'funcionario', 'colaborador', 'nome']):
                        coluna_profissional = col

                if coluna_preferencia is None:
                    if any(term in col_lower for term in ['preferência', 'preferencia', 'com preferencia']):
                        coluna_preferencia = col

                if coluna_sem_preferencia is None:
                    if any(term in col_lower for term in ['sem preferencia', 'sem preferência', 'sem pref']):
                        coluna_sem_preferencia = col

            resultados = []
            for _, row in df.iterrows():
                profissional = str(row[coluna_profissional]) if coluna_profissional else ""
                if not profissional:
                    continue

                profissional_unificado = self.gerenciador_profissionais.unificar_nome(profissional)

                try:
                    preferencia = int(float(row[coluna_preferencia])) if coluna_preferencia and not pd.isna(
                        row[coluna_preferencia]) else 0
                except:
                    preferencia = 0

                try:
                    sem_preferencia = int(float(row[coluna_sem_preferencia])) if coluna_sem_preferencia and not pd.isna(
                        row[coluna_sem_preferencia]) else 0
                except:
                    sem_preferencia = 0

                resultados.append({
                    'profissional': profissional_unificado,
                    'profissional_original': profissional,
                    'clientes_preferencia': preferencia,
                    'clientes_sem_preferencia': sem_preferencia
                })

            logging.info(f"0326: {len(resultados)} profissionais")
            return resultados

        except Exception as e:
            logging.error(f"Erro ao processar Excel 0326: {e}")
            return []

    def coletar_relatorio_0126(self, data_inicio, data_fim):
        """Coleta relatório 0126 (Ocupação)"""
        try:
            url = self.configuracoes_editaveis["urls"]["relatorios"]["0126"]
            self.driver.get(url)
            time.sleep(3)

            # Preencher datas
            data_inicio_field = WebDriverWait(self.driver, self.configuracoes_editaveis["timeouts"]["elemento"]).until(
                EC.presence_of_element_located(
                    (By.XPATH, self.configuracoes_editaveis["xpaths"]["relatorios"]["data_inicio"]))
            )
            data_inicio_field.click()
            time.sleep(0.5)
            data_inicio_field.send_keys(Keys.CONTROL + "a")
            time.sleep(0.5)
            data_inicio_field.send_keys(data_inicio)
            time.sleep(0.5)

            data_fim_field = self.driver.find_element(By.XPATH,
                                                      self.configuracoes_editaveis["xpaths"]["relatorios"]["data_fim"])
            data_fim_field.click()
            time.sleep(0.5)
            data_fim_field.send_keys(Keys.CONTROL + "a")
            time.sleep(0.5)
            data_fim_field.send_keys(data_fim)
            time.sleep(0.5)

            # Clicar em buscar
            self._aplicar_cliques_padrao(self.configuracoes_editaveis["xpaths"]["relatorios"]["btn_buscar_0126"])

            # Clicar em Excel
            btn_excel = WebDriverWait(self.driver, 15).until(
                EC.element_to_be_clickable(
                    (By.XPATH, self.configuracoes_editaveis["xpaths"]["relatorios"]["btn_excel_0126"]))
            )
            btn_excel.click()
            time.sleep(self.configuracoes_editaveis["timeouts"]["download"])

            arquivo_excel = self.encontrar_ultimo_excel()
            if arquivo_excel:
                time.sleep(3)
                dados_ocupacao = self._processar_excel_0126(arquivo_excel)

                relatorios_dir = self.configuracoes_editaveis["caminhos"]["pasta_relatorios"]
                if not os.path.exists(relatorios_dir):
                    os.makedirs(relatorios_dir)

                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                periodo = f"{data_inicio.replace('/', '')}_{data_fim.replace('/', '')}"
                novo_nome = f"{relatorios_dir}/Relatorio_0126_{periodo}_{timestamp}.xlsx"

                shutil.move(arquivo_excel, novo_nome)
                logging.info(f"✅ 0126 processado: {novo_nome}")

                return dados_ocupacao

            return []

        except Exception as e:
            logging.error(f"Erro ao coletar 0126: {e}")
            return []

    def _processar_excel_0126(self, caminho_arquivo):
        """Processa Excel do relatório 0126"""
        try:
            df = pd.read_excel(caminho_arquivo)
            logging.info(f"Colunas 0126: {df.columns.tolist()}")

            coluna_profissional = None
            coluna_dias_trabalhados = None
            coluna_taxa_ocupacao = None

            for col in df.columns:
                col_lower = str(col).lower().strip()

                if coluna_profissional is None:
                    if any(term in col_lower for term in ['profissional', 'funcionario', 'colaborador', 'nome']):
                        coluna_profissional = col

                if coluna_dias_trabalhados is None:
                    if any(term in col_lower for term in ['dias', 'dias trabalhados', 'dias úteis']):
                        coluna_dias_trabalhados = col

                if coluna_taxa_ocupacao is None:
                    if any(term in col_lower for term in ['ocupação', 'ocupacao', 'taxa', '%']):
                        coluna_taxa_ocupacao = col

            resultados = []
            for _, row in df.iterrows():
                profissional = str(row[coluna_profissional]) if coluna_profissional else ""
                if not profissional:
                    continue

                profissional_unificado = self.gerenciador_profissionais.unificar_nome(profissional)

                try:
                    dias_trabalhados = int(
                        float(row[coluna_dias_trabalhados])) if coluna_dias_trabalhados and not pd.isna(
                        row[coluna_dias_trabalhados]) else 0
                except:
                    dias_trabalhados = 0

                try:
                    taxa_ocupacao = float(str(row[coluna_taxa_ocupacao]).replace('%', '').replace(',',
                                                                                                  '.')) if coluna_taxa_ocupacao and not pd.isna(
                        row[coluna_taxa_ocupacao]) else 0
                except:
                    taxa_ocupacao = 0

                resultados.append({
                    'profissional': profissional_unificado,
                    'profissional_original': profissional,
                    'dias_trabalhados': dias_trabalhados,
                    'taxa_ocupacao': taxa_ocupacao
                })

            logging.info(f"0126: {len(resultados)} profissionais")
            return resultados

        except Exception as e:
            logging.error(f"Erro ao processar Excel 0126: {e}")
            return []

    def coletar_relatorio_0031(self, data_inicio, data_fim):
        """Coleta relatório 0031 (Serviços por Profissional)"""
        try:
            url = self.configuracoes_editaveis["urls"]["relatorios"]["0031"]
            self.driver.get(url)
            time.sleep(3)

            # Preencher datas
            data_inicio_field = WebDriverWait(self.driver, self.configuracoes_editaveis["timeouts"]["elemento"]).until(
                EC.presence_of_element_located(
                    (By.XPATH, self.configuracoes_editaveis["xpaths"]["relatorios"]["data_inicio"]))
            )
            data_inicio_field.click()
            time.sleep(0.5)
            data_inicio_field.send_keys(Keys.CONTROL + "a")
            time.sleep(0.5)
            data_inicio_field.send_keys(data_inicio)
            time.sleep(0.5)

            data_fim_field = self.driver.find_element(By.XPATH,
                                                      self.configuracoes_editaveis["xpaths"]["relatorios"]["data_fim"])
            data_fim_field.click()
            time.sleep(0.5)
            data_fim_field.send_keys(Keys.CONTROL + "a")
            time.sleep(0.5)
            data_fim_field.send_keys(data_fim)
            time.sleep(0.5)

            # Clicar em buscar
            self._aplicar_cliques_padrao(self.configuracoes_editaveis["xpaths"]["relatorios"]["btn_buscar"])

            # Clicar em Excel
            btn_excel = WebDriverWait(self.driver, 15).until(
                EC.element_to_be_clickable(
                    (By.XPATH, self.configuracoes_editaveis["xpaths"]["relatorios"]["btn_excel"]))
            )
            btn_excel.click()
            time.sleep(self.configuracoes_editaveis["timeouts"]["download"])

            arquivo_excel = self.encontrar_ultimo_excel()
            if arquivo_excel:
                time.sleep(3)
                dados_servicos, raw_linhas = self._processar_excel_0031(arquivo_excel)

                relatorios_dir = self.configuracoes_editaveis["caminhos"]["pasta_relatorios"]
                if not os.path.exists(relatorios_dir):
                    os.makedirs(relatorios_dir)

                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                periodo = f"{data_inicio.replace('/', '')}_{data_fim.replace('/', '')}"
                novo_nome = f"{relatorios_dir}/Relatorio_0031_{periodo}_{timestamp}.xlsx"

                shutil.move(arquivo_excel, novo_nome)
                logging.info(f"✅ 0031 processado: {novo_nome}")

                return dados_servicos, raw_linhas

            return [], []

        except Exception as e:
            logging.error(f"Erro ao coletar 0031: {e}")
            return [], []

    def _processar_excel_0031(self, caminho_arquivo):
        """Processa Excel do relatório 0031 — retorna agregado (existente) + raw (novo)"""
        try:
            df = pd.read_excel(caminho_arquivo)
            logging.info(f"Colunas 0031: {df.columns.tolist()}")

            # ── Mapeamento de colunas ────────────────────────────────────────
            col_map = {}
            for col in df.columns:
                cl = str(col).lower().strip()
                if 'profissional' in cl or 'funcionario' in cl:   col_map.setdefault('profissional', col)
                if 'data' in cl and 'comanda' in cl:              col_map.setdefault('data_comanda', col)
                if 'dia' in cl and 'semana' in cl:                col_map.setdefault('dia_semana', col)
                if 'número' in cl or 'numero' in cl or cl == 'nº' or 'comanda' in cl and 'núm' in cl: col_map.setdefault('num_comanda', col)
                if 'serviço' in cl or 'servico' in cl or 'procedimento' in cl: col_map.setdefault('servico', col)
                if 'categoria' in cl:                              col_map.setdefault('categoria', col)
                if 'cliente' in cl:                                col_map.setdefault('cliente', col)
                if 'cpf' in cl:                                    col_map.setdefault('cpf', col)
                if 'telefone' in cl and 'cel' not in cl:          col_map.setdefault('telefone', col)
                if 'celular' in cl:                                col_map.setdefault('celular', col)
                if cl in ('qtd.', 'qtd', 'quantidade'):           col_map.setdefault('qtd', col)
                if cl == 'valor':                                  col_map.setdefault('valor', col)
                if 'desconto' in cl:                               col_map.setdefault('desconto', col)
                if cl == 'total':                                  col_map.setdefault('total', col)
                if 'pacote' in cl:                                 col_map.setdefault('pacote', col)

            def get(row, key, default=''):
                col = col_map.get(key)
                if col is None: return default
                v = row.get(col, default)
                return default if pd.isna(v) else v

            def num(row, key):
                try: return float(str(get(row, key, 0)).replace(',', '.').replace('R$', '').strip() or 0)
                except: return 0.0

            # ── Agregar (lógica original — não muda nada) ───────────────────
            profissionais = {}
            raw_linhas = []

            for _, row in df.iterrows():
                profissional_orig = str(get(row, 'profissional', '')).strip()
                # Servico SEM profissional entra no raw do mesmo jeito.
                #
                # Antes a linha era descartada aqui, e com ela sumia dinheiro
                # real: o COMPLEMENTO KEUNE de R$ 70 da comanda 2 estava
                # lancado no Avec e simplesmente nao existia no NODRI — nem no
                # faturamento, nem na conferencia, que entao acusava a comanda
                # de nao ter complemento. O item existia; quem nao existia era
                # o profissional.
                #
                # O AGREGADO (PROF_SERVICOS) continua ignorando estas linhas:
                # ele e por profissional, e sem profissional nao ha em qual
                # somar. So o raw passa a ve-las.
                sem_profissional = (not profissional_orig or profissional_orig.lower() == 'nan')

                profissional_unif = '' if sem_profissional else                     self.gerenciador_profissionais.unificar_nome(profissional_orig)
                servico = str(get(row, 'servico', 'Serviço não identificado')).strip()
                quantidade = int(num(row, 'qtd') or 1)
                valor = num(row, 'valor')

                # Agrupado (PROF_SERVICOS — igual ao anterior)
                if not sem_profissional:
                    if profissional_unif not in profissionais:
                        profissionais[profissional_unif] = {'profissional_original': profissional_orig, 'servicos_detalhados': {}}
                    if servico not in profissionais[profissional_unif]['servicos_detalhados']:
                        profissionais[profissional_unif]['servicos_detalhados'][servico] = {'quantidade': 0, 'valor': 0}
                    profissionais[profissional_unif]['servicos_detalhados'][servico]['quantidade'] += quantidade
                    profissionais[profissional_unif]['servicos_detalhados'][servico]['valor'] += valor

                # Raw (ATENDIMENTOS_RAW — novo)
                raw_linhas.append({
                    'profissional': profissional_unif,
                    'data_comanda': str(get(row, 'data_comanda', '')),
                    'dia_semana':   str(get(row, 'dia_semana', '')),
                    'num_comanda':  str(get(row, 'num_comanda', '')),
                    'servico':      servico,
                    'categoria':    str(get(row, 'categoria', '')),
                    'cliente':      str(get(row, 'cliente', '')),
                    'cpf':          str(get(row, 'cpf', '')),
                    'telefone':     str(get(row, 'telefone', '')),
                    'celular':      str(get(row, 'celular', '')),
                    'qtd':          quantidade,
                    'valor':        valor,
                    'desconto':     num(row, 'desconto'),
                    'total':        num(row, 'total') or valor,
                    'pacote':       str(get(row, 'pacote', '')),
                })

            resultados = []
            for prof, dados in profissionais.items():
                resultados.append({
                    'profissional': prof,
                    'profissional_original': dados['profissional_original'],
                    'servicos': dados['servicos_detalhados']
                })

            logging.info(f"0031: {len(resultados)} profissionais | {len(raw_linhas)} linhas raw")
            return resultados, raw_linhas

        except Exception as e:
            logging.error(f"Erro ao processar Excel 0031: {e}")
            return [], []

    def coletar_relatorio_0041(self, data_inicio, data_fim):
        """Coleta relatório 0041 (Produtos por Profissional)"""
        try:
            url = self.configuracoes_editaveis["urls"]["relatorios"]["0041"]
            self.driver.get(url)
            time.sleep(3)

            # Preencher datas
            data_inicio_field = WebDriverWait(self.driver, self.configuracoes_editaveis["timeouts"]["elemento"]).until(
                EC.presence_of_element_located(
                    (By.XPATH, self.configuracoes_editaveis["xpaths"]["relatorios"]["data_inicio"]))
            )
            data_inicio_field.click()
            time.sleep(0.5)
            data_inicio_field.send_keys(Keys.CONTROL + "a")
            time.sleep(0.5)
            data_inicio_field.send_keys(data_inicio)
            time.sleep(0.5)

            data_fim_field = self.driver.find_element(By.XPATH,
                                                      self.configuracoes_editaveis["xpaths"]["relatorios"]["data_fim"])
            data_fim_field.click()
            time.sleep(0.5)
            data_fim_field.send_keys(Keys.CONTROL + "a")
            time.sleep(0.5)
            data_fim_field.send_keys(data_fim)
            time.sleep(0.5)

            # Clicar em buscar
            self._aplicar_cliques_padrao(self.configuracoes_editaveis["xpaths"]["relatorios"]["btn_buscar"])

            # Clicar em Excel
            btn_excel = WebDriverWait(self.driver, 15).until(
                EC.element_to_be_clickable(
                    (By.XPATH, self.configuracoes_editaveis["xpaths"]["relatorios"]["btn_excel"]))
            )
            btn_excel.click()
            time.sleep(self.configuracoes_editaveis["timeouts"]["download"])

            arquivo_excel = self.encontrar_ultimo_excel()
            if arquivo_excel:
                time.sleep(3)
                dados_produtos, produtos_raw = self._processar_excel_0041(arquivo_excel)

                relatorios_dir = self.configuracoes_editaveis["caminhos"]["pasta_relatorios"]
                if not os.path.exists(relatorios_dir):
                    os.makedirs(relatorios_dir)

                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                periodo = f"{data_inicio.replace('/', '')}_{data_fim.replace('/', '')}"
                novo_nome = f"{relatorios_dir}/Relatorio_0041_{periodo}_{timestamp}.xlsx"

                shutil.move(arquivo_excel, novo_nome)
                logging.info(f"✅ 0041 processado: {novo_nome}")

                return dados_produtos, produtos_raw

            return [], []

        except Exception as e:
            logging.error(f"Erro ao coletar 0041: {e}")
            return [], []

    def _processar_excel_0041(self, caminho_arquivo):
        """Processa Excel do relatório 0041"""
        try:
            df = pd.read_excel(caminho_arquivo)
            logging.info(f"Colunas 0041: {df.columns.tolist()}")

            coluna_profissional = None
            coluna_produto = None
            coluna_quantidade = None

            for col in df.columns:
                col_lower = str(col).lower().strip()

                if coluna_profissional is None:
                    if any(term in col_lower for term in ['profissional', 'funcionario', 'colaborador', 'nome']):
                        coluna_profissional = col

                if coluna_produto is None:
                    if any(term in col_lower for term in ['produto', 'item', 'sku', 'descrição']):
                        coluna_produto = col

                if coluna_quantidade is None:
                    if any(term in col_lower for term in ['quantidade', 'qtd', 'total']):
                        coluna_quantidade = col

            # ── Colunas que so o RAW usa ────────────────────────────────
            # O 0041 traz Comanda, Data Venda e Valor, e ate hoje tudo isso era
            # jogado fora: so a quantidade por profissional sobrevivia. Sem a
            # comanda e o valor, a conferencia de caixa acusa como diferenca
            # toda comanda que vendeu produto — porque o dinheiro entra no
            # caixa e o produto nao aparece em lugar nenhum do NODRI.
            def _achar(*termos):
                for c in df.columns:
                    cl = str(c).lower().strip()
                    if any(t in cl for t in termos):
                        return c
                return None

            col_comanda = _achar('comanda')
            col_data = _achar('data venda', 'data')
            col_valor = _achar('valor')
            col_categoria = _achar('categoria')
            col_cliente = _achar('cliente')
            col_marca = _achar('marca')

            def _txt(row, col, padrao=''):
                if col is None:
                    return padrao
                v = row.get(col, padrao)
                return padrao if pd.isna(v) else str(v).strip()

            def _num(row, col):
                if col is None:
                    return 0.0
                v = row.get(col, 0)
                if pd.isna(v):
                    return 0.0
                if isinstance(v, (int, float)):
                    return float(v)
                t = str(v).replace('R$', '').strip().replace('.', '').replace(',', '.')
                try:
                    return float(t)
                except Exception:
                    return 0.0

            profissionais = {}
            raw_linhas = []
            for _, row in df.iterrows():
                profissional = str(row[coluna_profissional]) if coluna_profissional else ""
                if not profissional:
                    continue

                profissional_unificado = self.gerenciador_profissionais.unificar_nome(profissional)

                try:
                    quantidade = int(float(row[coluna_quantidade])) if coluna_quantidade and not pd.isna(
                        row[coluna_quantidade]) else 0
                except:
                    quantidade = 0

                if profissional_unificado not in profissionais:
                    profissionais[profissional_unificado] = 0

                profissionais[profissional_unificado] += quantidade

                # A linha crua, do jeito que a conferencia precisa dela.
                # So os digitos, e sem zero a esquerda. O Excel as vezes traz
                # "0072" como texto e as vezes como numero 72, e a conferencia
                # casa produto com servico pelo numero da comanda: se os dois
                # lados escreverem diferente, o produto nunca encontra o
                # atendimento e a conta nao fecha — em silencio.
                num_comanda = ''.join(ch for ch in _txt(row, col_comanda) if ch.isdigit()).lstrip('0')
                if num_comanda:
                    valor_unit = _num(row, col_valor)
                    qtd_item = quantidade if quantidade > 0 else 1
                    # Linha sem profissional entra do mesmo jeito: o dinheiro
                    # dela e real e a conferencia precisa dele. So o nome e
                    # limpado — o codigo antigo transformava vazio no literal
                    # "nan", que viraria um profissional chamado NAN na tela.
                    prof_limpo = profissional_unificado
                    if str(prof_limpo).strip().lower() in ('nan', 'none', ''):
                        prof_limpo = ''
                    raw_linhas.append({
                        'profissional': prof_limpo,
                        'data_venda': _txt(row, col_data)[:10],
                        'num_comanda': num_comanda,
                        'cliente': _txt(row, col_cliente),
                        'produto': _txt(row, coluna_produto),
                        'marca': _txt(row, col_marca),
                        'categoria': _txt(row, col_categoria),
                        'qtd': qtd_item,
                        'valor': valor_unit,
                        'total': round(valor_unit * qtd_item, 2),
                    })

            resultados = []
            for prof, total in profissionais.items():
                resultados.append({
                    'profissional': prof,
                    'total_produtos': total
                })

            logging.info(f"0041: {len(resultados)} profissionais | {len(raw_linhas)} linhas raw")
            return resultados, raw_linhas

        except Exception as e:
            logging.error(f"Erro ao processar Excel 0041: {e}")
            return [], []
            return []

    def coletar_mes_completo(self, ano, mes, data_inicio, data_fim, relatorios_selecionados=None):
        """Coleta todos os dados de um mês completo. Se relatorios_selecionados for passado,
        coleta apenas os relatórios da lista (ex: ['0031', '0041'])."""
        logging.info("=" * 80)
        logging.info(f"📅 COLETANDO MÊS: {MESES_PT[mes]}/{ano} ({data_inicio} a {data_fim})")
        if relatorios_selecionados:
            logging.info(f"📊 Apenas: {relatorios_selecionados}")
        logging.info("=" * 80)

        # Se não há filtro, coleta tudo
        sel = set(relatorios_selecionados) if relatorios_selecionados else None
        def coletar(cod): return sel is None or cod in sel

        dados_mes = {
            'ano': ano,
            'mes': mes,
            'data_inicio': data_inicio,
            'data_fim': data_fim,
            'resumo': {},
            'faturamento_diario': [],
            'servicos': [],
            'produtos': [],
            'profissionais': {}
        }

        # 1. COLETAR RELATÓRIO GERAL
        logging.info("\n📊 COLETANDO RELATÓRIOS GERAIS...")

        # 0083 - Faturamento e Ticket Médio
        if coletar('0083'):
            dados_0083 = self.coletar_relatorio_0083(data_inicio, data_fim)
            if dados_0083:
                dados_mes['resumo']['faturamento_total'] = self.converter_valor_monetario(
                    dados_0083.get('faturamento', '0'))
                dados_mes['resumo']['ticket_medio'] = self.converter_valor_monetario(dados_0083.get('ticket_medio', '0'))
                dados_mes['resumo']['clientes_atendidos'] = self.converter_valor_monetario(
                    dados_0083.get('clientes_atendidos', '0'))

        # 0017 - Clientes Novos
        if coletar('0017'):
            dados_0017 = self.coletar_relatorio_0017(data_inicio, data_fim)
            if dados_0017:
                dados_mes['resumo']['clientes_novos'] = self.converter_valor_monetario(
                    dados_0017.get('clientes_novos', '0'))

        # 0032 - Serviços Mais Vendidos
        if coletar('0032'):
            dados_0032 = self.coletar_relatorio_0032(data_inicio, data_fim)
            if dados_0032:
                dados_mes['servicos'] = dados_0032

        # 0042 - Produtos Mais Vendidos
        if coletar('0042'):
            dados_0042 = self.coletar_relatorio_0042(data_inicio, data_fim)
            if dados_0042:
                dados_mes['produtos'] = dados_0042.get('produtos', [])
                fat_produtos = dados_0042.get('valor_faturado', 0)
                fat_total = dados_mes['resumo'].get('faturamento_total', 0)
                if fat_total > 0:
                    fat_servicos = fat_total - fat_produtos
                    dados_mes['resumo']['faturamento_servicos'] = fat_servicos
                    dados_mes['resumo']['faturamento_produtos'] = fat_produtos
                    dados_mes['resumo']['percentual_servicos'] = (fat_servicos / fat_total) * 100
                    dados_mes['resumo']['percentual_produtos'] = (fat_produtos / fat_total) * 100

        # 0088 - Faturamento Diário
        if coletar('0088'):
            dados_0088 = self.coletar_relatorio_0088(data_inicio, data_fim)
            if dados_0088:
                dados_mes['faturamento_diario'] = dados_0088

        # 2. COLETAR DADOS DOS PROFISSIONAIS
        logging.info("\n👥 COLETANDO DADOS DOS PROFISSIONAIS...")

        profissionais = {}

        # 0123 - Pagamentos
        if coletar('0123'):
            pagamentos = self.coletar_relatorio_0123(data_inicio, data_fim)
            if pagamentos:
                profissionais['pagamentos'] = pagamentos

        # 0021 - Ticket Médio
        if coletar('0021'):
            ticket = self.coletar_relatorio_0021(data_inicio, data_fim)
            if ticket:
                profissionais['ticket'] = ticket

        # 0326 - Preferência
        if coletar('0326'):
            preferencia = self.coletar_relatorio_0326(data_inicio, data_fim)
            if preferencia:
                profissionais['preferencia'] = preferencia

        # 0126 - Ocupação
        if coletar('0126'):
            ocupacao = self.coletar_relatorio_0126(data_inicio, data_fim)
            if ocupacao:
                profissionais['ocupacao'] = ocupacao

        # 0031 - Servicos Detalhados + Raw
        if coletar('0031'):
            try:
                servicos_detalhados, raw_linhas_0031 = self.coletar_relatorio_0031(data_inicio, data_fim)
                if servicos_detalhados:
                    profissionais['servicos_detalhados'] = servicos_detalhados
                if raw_linhas_0031:
                    profissionais['atendimentos_raw'] = raw_linhas_0031
            except Exception as e_0031:
                logging.error(f"0031 falhou mas continuando: {e_0031}")

        # 0041 - Produtos por Profissional
        if coletar('0041'):
            try:
                produtos_prof, produtos_raw = self.coletar_relatorio_0041(data_inicio, data_fim)
                if produtos_prof:
                    profissionais['produtos'] = produtos_prof
                if produtos_raw:
                    profissionais['produtos_raw'] = produtos_raw
            except Exception as e_0041:
                logging.error(f"0041 falhou mas continuando: {e_0041}")

        # 0051 - Agendamentos
        if coletar('0051'):
            try:
                logging.info("Iniciando coleta 0051 (Agendamentos)...")
                agend_raw = self.coletar_relatorio_0051(data_inicio, data_fim)
                logging.info(f"0051 retornou {len(agend_raw) if agend_raw else 0} registros")
                if agend_raw:
                    profissionais['agendamentos_raw'] = agend_raw
            except Exception as e_0051:
                logging.error(f"0051 falhou mas continuando: {e_0051}", exc_info=True)

        # Comandas Finalizadas — quem fechou e quanto entrou por comanda
        if coletar('comandas'):
            try:
                logging.info("Iniciando coleta de Comandas Finalizadas...")
                cmds = self.coletar_comandas_finalizadas(data_inicio, data_fim)
                logging.info(f"Comandas Finalizadas: {len(cmds) if cmds else 0} registros")
                if cmds:
                    profissionais['comandas_raw'] = cmds
            except Exception as e_cmd:
                logging.error(f"Comandas Finalizadas falhou mas continuando: {e_cmd}", exc_info=True)

        # 0033 - Tabela de Precos (a regua da conferencia de caixa)
        if coletar('0033'):
            try:
                logging.info("Iniciando coleta 0033 (Tabela de Precos)...")
                precos_0033 = self.coletar_relatorio_0033()
                logging.info(f"0033 retornou {len(precos_0033) if precos_0033 else 0} servicos")
                if precos_0033:
                    profissionais['tabela_precos'] = precos_0033
            except Exception as e_0033:
                logging.error(f"0033 falhou mas continuando: {e_0033}", exc_info=True)

        dados_mes['profissionais'] = profissionais

        logging.info(f"\n✅ COLETA DO MÊS {MESES_PT[mes]}/{ano} CONCLUÍDA")
        return dados_mes

    def coletar_comandas_finalizadas(self, data_inicio, data_fim):
        """Baixa a tela Financeiro > Comandas Finalizadas pelo botao Excel.

        Nao e relatorio numerado: e uma listagem do financeiro, com os botoes
        do DataTables (Print / Excel / PDF). Dela vem o que nenhum relatorio
        numerado traz — QUEM fechou a comanda e QUANTO entrou por ela.

        A base tem de vir COMPLETA. O botao Excel do DataTables costuma
        exportar so o que esta carregado, entao a rotina poe o "por pagina" no
        maximo ANTES de clicar, e depois confere a contagem do arquivo contra o
        que a tela diz ter. Faltando linha, devolve vazio: meia base e pior que
        base nenhuma, porque as comandas ausentes viram "dinheiro que nao
        entrou" na conferencia.
        """
        try:
            url = self.configuracoes_editaveis.get("urls", {}).get("relatorios", {}).get(
                "comandas", "https://admin.avec.beauty/admin/financeiro/comanda/historico")
            self.driver.get(url)
            time.sleep(4)

            # Periodo: os campos desta tela tem id proprio (nao e o xpath dos
            # relatorios numerados).
            for campo_id, valor in (("dataini", data_inicio), ("datafim", data_fim)):
                try:
                    campo = self.driver.find_element(By.ID, campo_id)
                    self.driver.execute_script(
                        "arguments[0].value = arguments[1];"
                        "arguments[0].dispatchEvent(new Event('change', {bubbles:true}));",
                        campo, valor)
                except Exception as e_campo:
                    logging.warning("Comandas: nao consegui preencher %s (%s)" % (campo_id, e_campo))

            # Buscar
            try:
                botao = self.driver.find_element(
                    By.XPATH, "//button[contains(., 'Buscar')] | //a[contains(., 'Buscar')]")
                botao.click()
            except Exception as e_busca:
                logging.warning("Comandas: botao Buscar nao clicado (%s)" % e_busca)
            time.sleep(6)

            # Quantos registros a tela diz ter — e a regua da conferencia final.
            esperados = self._registros_da_listagem()

            # "Por pagina" no maximo, para o Excel levar tudo.
            try:
                sel = self.driver.find_element(By.CSS_SELECTOR, "select[name$='_length']")
                opcoes = [o.get_attribute("value") for o in sel.find_elements(By.TAG_NAME, "option")]
                maior = max((int(o) for o in opcoes if str(o).isdigit()), default=0)
                if maior:
                    self.driver.execute_script(
                        "arguments[0].value = arguments[1];"
                        "arguments[0].dispatchEvent(new Event('change', {bubbles:true}));",
                        sel, str(maior))
                    time.sleep(5)
            except Exception as e_sel:
                logging.warning("Comandas: nao ajustei o por-pagina (%s)" % e_sel)

            antes = set(self._arquivos_da_pasta_download())

            # O botao Excel do DataTables
            try:
                excel = self.driver.find_element(By.CSS_SELECTOR, "a.buttons-excel, button.buttons-excel")
                excel.click()
            except Exception:
                excel = self.driver.find_element(
                    By.XPATH, "//a[normalize-space(text())='Excel'] | //button[normalize-space(text())='Excel']")
                excel.click()
            time.sleep(self.configuracoes_editaveis["timeouts"]["download"])

            arquivo = self._esperar_download_novo(antes)
            if not arquivo:
                logging.error("Comandas: nenhum arquivo baixado")
                return []

            linhas = self._processar_excel_comandas(arquivo)

            relatorios_dir = self.configuracoes_editaveis["caminhos"]["pasta_relatorios"]
            if not os.path.exists(relatorios_dir):
                os.makedirs(relatorios_dir)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            novo_nome = relatorios_dir + "/ComandasFinalizadas_" + timestamp + os.path.splitext(arquivo)[1]
            shutil.move(arquivo, novo_nome)

            # A trava: o que a tela diz ter e o que veio no arquivo tem de bater.
            if esperados and len(linhas) < esperados:
                logging.error(
                    "Comandas: a tela diz %d registros e o arquivo trouxe %d. "
                    "Nada foi enviado — base incompleta e pior que base nenhuma."
                    % (esperados, len(linhas)))
                return []

            logging.info("Comandas Finalizadas: %d linhas (tela dizia %s) -> %s"
                         % (len(linhas), esperados if esperados else "?", novo_nome))
            return linhas

        except Exception as e:
            logging.error("Erro ao coletar Comandas Finalizadas: %s" % e, exc_info=True)
            return []

    def _registros_da_listagem(self):
        """Le o "Mostrando 1 a N de M Registros" da tela. Devolve M, ou 0."""
        try:
            import re as _re
            texto = self.driver.find_element(By.TAG_NAME, "body").text
            m = _re.search(r"de\s+([\d.,]+)\s+Registros", texto, _re.I)
            if m:
                return int(_re.sub(r"[.,]", "", m.group(1)))
        except Exception:
            pass
        return 0

    def _arquivos_da_pasta_download(self):
        """Nomes dos arquivos ja existentes na pasta de download."""
        try:
            pasta = os.path.join(os.path.expanduser("~"), "Downloads")
            return [os.path.join(pasta, f) for f in os.listdir(pasta)]
        except Exception:
            return []

    def _esperar_download_novo(self, antes, segundos=60):
        """Espera aparecer um arquivo NOVO e terminado (sem .crdownload)."""
        pasta = os.path.join(os.path.expanduser("~"), "Downloads")
        fim = time.time() + segundos
        while time.time() < fim:
            try:
                agora = set(os.path.join(pasta, f) for f in os.listdir(pasta))
                novos = [a for a in (agora - set(antes))
                         if not a.endswith(".crdownload") and not a.endswith(".tmp")]
                validos = [a for a in novos if os.path.splitext(a)[1].lower() in (".xlsx", ".xls", ".csv")]
                if validos:
                    # o mais recente, e so depois de parar de crescer
                    alvo = max(validos, key=os.path.getmtime)
                    t1 = os.path.getsize(alvo)
                    time.sleep(1.5)
                    if os.path.getsize(alvo) == t1:
                        return alvo
            except Exception:
                pass
            time.sleep(1)
        return None

    def _processar_excel_comandas(self, caminho):
        """Le o arquivo das Comandas Finalizadas.

        Colunas da tela: Comanda | Cliente | Caixa responsavel | Data de
        abertura | Valor | Acoes. Vem com sujeira previsivel:

          "N0072 (03/09/2026)"                -> comanda 72, data 03/09/2026
          "Raissa.Marques - 03/09/2026 10:33" -> Raissa.Marques
          "Nao utiliza um caixa."             -> Sem caixa

        Como no 0033: nada de inventar. Sem as colunas de comanda e valor,
        devolve vazio e registra QUAIS colunas vieram.
        """
        try:
            import unicodedata, re as _re

            def sem_acento(t):
                base = unicodedata.normalize("NFD", str(t))
                return "".join(c for c in base if unicodedata.category(c) != "Mn").lower().strip()

            if caminho.lower().endswith(".csv"):
                df = pd.read_csv(caminho, sep=None, engine="python")
            else:
                df = pd.read_excel(caminho)
            logging.info("Colunas Comandas: %s" % df.columns.tolist())

            col = {}
            for c in df.columns:
                cl = sem_acento(c)
                if "comanda" in cl and "comanda" not in col:      col["comanda"] = c
                if "cliente" in cl and "cliente" not in col:      col["cliente"] = c
                if "caixa" in cl or "responsavel" in cl:          col.setdefault("caixa", c)
                if "abertura" in cl or cl == "data":              col.setdefault("data", c)
                if "valor" in cl and "valor" not in col:          col["valor"] = c

            if "comanda" not in col or "valor" not in col:
                logging.error(
                    "Comandas: nao achei as colunas de comanda e/ou valor. "
                    "Colunas recebidas: %s. Nada foi enviado." % df.columns.tolist())
                return []

            def txt(row, k, padrao=""):
                c = col.get(k)
                if c is None:
                    return padrao
                v = row.get(c, padrao)
                return padrao if pd.isna(v) else str(v).strip()

            def dinheiro(v):
                if isinstance(v, (int, float)):
                    return float(v)
                t = str(v or "").replace("R$", "").strip()
                t = t.replace(".", "").replace(",", ".")
                try:
                    return float(t)
                except Exception:
                    return 0.0

            linhas = []
            for _, row in df.iterrows():
                bruto = txt(row, "comanda")
                # o numero, sem zero a esquerda: o 0031 grava sem ele, e a
                # conferencia casa os dois pelo numero. Escrever diferente faria
                # nada casar, em silencio.
                so_digitos = "".join(ch for ch in _re.sub(r"\(.*?\)", "", bruto) if ch.isdigit())
                num = so_digitos.lstrip("0") or so_digitos
                if not num:
                    continue

                mdata = _re.search(r"(\d{2}/\d{2}/\d{4})", bruto) or \
                        _re.search(r"(\d{2}/\d{2}/\d{4})", txt(row, "data"))
                caixa = txt(row, "caixa")
                caixa = _re.split(r"\s+-\s+\d{2}/", caixa)[0].strip()
                # Comparar SEM ACENTO: o Avec escreve "Nao utiliza um caixa."
                # com til, e a expressao com [ao] nao casava com "a" — a linha
                # entrava na tela como um caixa chamado "Nao utiliza um caixa.",
                # com cara de recepcionista.
                if "nao utiliza" in sem_acento(caixa):
                    caixa = "Sem caixa"

                valor = dinheiro(row.get(col["valor"]))
                linhas.append({
                    "num_comanda": num,
                    "data": mdata.group(1) if mdata else "",
                    "cliente": txt(row, "cliente"),
                    "caixa_responsavel": caixa,
                    "valor": round(valor, 2),
                })

            logging.info("Comandas: %d linhas lidas" % len(linhas))
            return linhas

        except Exception as e:
            logging.error("Erro ao processar arquivo de Comandas: %s" % e, exc_info=True)
            return []

    def coletar_relatorio_0033(self):
        """Coleta o relatorio 0033 (Tabela de Precos) — a regua da conferencia.

        Diferente dos outros: NAO tem periodo. A tabela de precos e a vigente,
        nao o movimento de um mes. Por isso a rotina nao recebe data e so
        preenche os campos de data se eles existirem na tela — se o Avec um dia
        passar a exigir periodo aqui, ela continua funcionando.

        Regra da casa: nada de inventar. Se a planilha nao trouxer servico e
        preco reconheciveis, devolve lista vazia e registra no log QUAIS colunas
        vieram. A conferencia entao segue pela regua do historico e diz na tela
        que esta sem a tabela — em vez de conferir com um preco chutado.
        """
        try:
            url = self.configuracoes_editaveis.get("urls", {}).get("relatorios", {}).get(
                "0033", "https://admin.avec.beauty/admin/relatorio/0033")
            self.driver.get(url)
            time.sleep(3)

            # Campos de data: opcionais aqui. Existindo, preenche com um periodo
            # largo, porque algumas telas do Avec so liberam o Buscar com data.
            try:
                hoje = datetime.now()
                campo_ini = self.driver.find_elements(
                    By.XPATH, self.configuracoes_editaveis["xpaths"]["relatorios"]["data_inicio"])
                if campo_ini:
                    campo_ini[0].click()
                    time.sleep(0.4)
                    campo_ini[0].send_keys(Keys.CONTROL + "a")
                    campo_ini[0].send_keys(hoje.replace(day=1).strftime("%d/%m/%Y"))
                    time.sleep(0.4)
                    campo_fim = self.driver.find_elements(
                        By.XPATH, self.configuracoes_editaveis["xpaths"]["relatorios"]["data_fim"])
                    if campo_fim:
                        campo_fim[0].click()
                        time.sleep(0.4)
                        campo_fim[0].send_keys(Keys.CONTROL + "a")
                        campo_fim[0].send_keys(hoje.strftime("%d/%m/%Y"))
                        time.sleep(0.4)
                else:
                    logging.info("0033: tela sem campos de data (esperado numa tabela de precos)")
            except Exception as e_data:
                logging.info("0033: nao preenchi datas (%s) — seguindo assim mesmo" % e_data)

            # Buscar: em algumas telas nao existe (a tabela ja vem carregada).
            try:
                self._aplicar_cliques_padrao(
                    self.configuracoes_editaveis["xpaths"]["relatorios"]["btn_buscar"])
            except Exception as e_busca:
                logging.info("0033: sem botao Buscar (%s) — a tabela pode ja vir pronta" % e_busca)

            btn_excel = WebDriverWait(self.driver, 20).until(
                EC.element_to_be_clickable(
                    (By.XPATH, self.configuracoes_editaveis["xpaths"]["relatorios"]["btn_excel"]))
            )
            btn_excel.click()
            time.sleep(self.configuracoes_editaveis["timeouts"]["download"])

            arquivo_excel = self.encontrar_ultimo_excel()
            if not arquivo_excel:
                logging.error("0033: nenhum Excel baixado")
                return []

            time.sleep(3)
            precos = self._processar_excel_0033(arquivo_excel)

            relatorios_dir = self.configuracoes_editaveis["caminhos"]["pasta_relatorios"]
            if not os.path.exists(relatorios_dir):
                os.makedirs(relatorios_dir)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            novo_nome = relatorios_dir + "/Relatorio_0033_TabelaPrecos_" + timestamp + ".xlsx"
            shutil.move(arquivo_excel, novo_nome)
            logging.info("0033 processado: %s (%d servicos)" % (novo_nome, len(precos)))

            return precos

        except Exception as e:
            logging.error("Erro ao coletar 0033: %s" % e, exc_info=True)
            return []

    def _processar_excel_0033(self, caminho_arquivo):
        """Le a planilha do 0033 e devolve [{servico, categoria, preco, duracao}]."""
        try:
            df = pd.read_excel(caminho_arquivo)
            logging.info("Colunas 0033: %s" % df.columns.tolist())

            # Tira o acento do titulo antes de comparar. Sem isso a regra do
            # preco viraria uma gambiarra ("pre" + "o") que casaria com
            # "presencial" e faria a regua apontar a coluna errada.
            def sem_acento(t):
                import unicodedata
                base = unicodedata.normalize("NFD", str(t))
                return "".join(c for c in base if unicodedata.category(c) != "Mn").lower().strip()

            col_map = {}
            for col in df.columns:
                cl = sem_acento(col)
                if "servi" in cl or "procedimento" in cl or cl in ("nome", "descricao"):
                    col_map.setdefault("servico", col)
                if "categoria" in cl or "grupo" in cl:
                    col_map.setdefault("categoria", col)
                # Preco de venda cheio. Custo e promocao ficam de fora: a regua
                # tem que ser o que o cliente deveria pagar.
                if ("preco" in cl or cl == "valor") and "custo" not in cl and "promo" not in cl:
                    col_map.setdefault("preco", col)
                if "dura" in cl or "tempo" in cl or "minuto" in cl:
                    col_map.setdefault("duracao", col)

            if "servico" not in col_map or "preco" not in col_map:
                logging.error(
                    "0033: nao achei as colunas de servico e/ou preco. "
                    "Colunas recebidas: %s. "
                    "Nada foi enviado — a conferencia segue pela regua do historico."
                    % df.columns.tolist())
                return []

            def txt(row, key, padrao=""):
                col = col_map.get(key)
                if col is None:
                    return padrao
                v = row.get(col, padrao)
                return padrao if pd.isna(v) else str(v).strip()

            def dinheiro(valor):
                if isinstance(valor, (int, float)):
                    return float(valor)
                t = str(valor or "").replace("R$", "").strip()
                t = t.replace(".", "").replace(",", ".")
                try:
                    return float(t)
                except Exception:
                    return 0.0

            precos = []
            for _, row in df.iterrows():
                servico = txt(row, "servico")
                if not servico or servico.lower() == "nan":
                    continue
                bruto = row.get(col_map["preco"])
                preco = 0.0 if pd.isna(bruto) else dinheiro(bruto)
                if preco <= 0:
                    continue
                precos.append({
                    "servico": servico,
                    "categoria": txt(row, "categoria"),
                    "preco": round(preco, 2),
                    "duracao": txt(row, "duracao"),
                })

            logging.info("0033: %d servicos com preco lidos" % len(precos))
            return precos

        except Exception as e:
            logging.error("Erro ao processar Excel 0033: %s" % e, exc_info=True)
            return []

    def coletar_relatorio_0051(self, data_inicio, data_fim):
        """Coleta relatório 0051 (Agendamentos) - USANDO XPATH CORRETO DO BUSCAR"""
        try:
            url = self.configuracoes_editaveis.get("urls", {}).get("relatorios", {}).get(
                "0051", "https://admin.avec.beauty/admin/relatorio/0051")
            self.driver.get(url)
            time.sleep(3)

            # Preencher datas
            data_inicio_field = WebDriverWait(self.driver, self.configuracoes_editaveis["timeouts"]["elemento"]).until(
                EC.presence_of_element_located(
                    (By.XPATH, self.configuracoes_editaveis["xpaths"]["relatorios"]["data_inicio"]))
            )
            data_inicio_field.click()
            time.sleep(0.5)
            data_inicio_field.send_keys(Keys.CONTROL + "a")
            time.sleep(0.5)
            data_inicio_field.send_keys(data_inicio)
            time.sleep(0.5)

            data_fim_field = self.driver.find_element(By.XPATH,
                                                      self.configuracoes_editaveis["xpaths"]["relatorios"]["data_fim"])
            data_fim_field.click()
            time.sleep(0.5)
            data_fim_field.send_keys(Keys.CONTROL + "a")
            time.sleep(0.5)
            data_fim_field.send_keys(data_fim)
            time.sleep(0.5)

            # ============================================================
            # 🔥 XPATH CORRETO DO BOTÃO BUSCAR DO 0051: span[5]
            # ============================================================
            import pyautogui

            # 1º CLIQUE EM BUSCAR (USANDO XPATH CORRETO DO 0051)
            btn_buscar = WebDriverWait(self.driver, self.configuracoes_editaveis["timeouts"]["elemento"]).until(
                EC.element_to_be_clickable(
                    (By.XPATH, "//*[@id='variaveis']/div[1]/span[5]/button"))
            )
            btn_buscar.click()
            logging.info(
                f"⏳ 0051 - 1º clique em Buscar - aguardando {self.configuracoes_editaveis['timeouts']['pausa_buscar']}s...")
            time.sleep(self.configuracoes_editaveis['timeouts']['pausa_buscar'])

            # ENTER (igual ao 0041)
            pyautogui.press('enter')
            time.sleep(2)

            # 2º CLIQUE EM BUSCAR (USANDO XPATH CORRETO DO 0051)
            btn_buscar = WebDriverWait(self.driver, self.configuracoes_editaveis["timeouts"]["elemento"]).until(
                EC.element_to_be_clickable(
                    (By.XPATH, "//*[@id='variaveis']/div[1]/span[5]/button"))
            )
            btn_buscar.click()
            logging.info(
                f"⏳ 0051 - 2º clique em Buscar - aguardando {self.configuracoes_editaveis['timeouts']['pausa_buscar']}s...")
            time.sleep(self.configuracoes_editaveis['timeouts']['pausa_buscar'])

            # ============================================================
            # AGUARDAR TABELA CARREGAR
            # ============================================================
            WebDriverWait(self.driver, self.configuracoes_editaveis["timeouts"]["elemento"]).until(
                EC.presence_of_element_located((By.ID, "tableFilter"))
            )

            # ============================================================
            # CLICAR NO EXCEL (USANDO MESMO XPATH DO 0041)
            # ============================================================
            btn_excel = WebDriverWait(self.driver, 15).until(
                EC.element_to_be_clickable(
                    (By.XPATH, self.configuracoes_editaveis["xpaths"]["relatorios"]["btn_excel"]))
            )
            btn_excel.click()
            time.sleep(self.configuracoes_editaveis["timeouts"]["download"])

            arquivo_excel = self.encontrar_ultimo_excel()
            if arquivo_excel:
                time.sleep(3)
                raw_linhas = self._processar_excel_0051(arquivo_excel)

                relatorios_dir = self.configuracoes_editaveis["caminhos"]["pasta_relatorios"]
                if not os.path.exists(relatorios_dir):
                    os.makedirs(relatorios_dir)

                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                periodo = f"{data_inicio.replace('/', '')}_{data_fim.replace('/', '')}"
                novo_nome = f"{relatorios_dir}/Relatorio_0051_{periodo}_{timestamp}.xlsx"

                shutil.move(arquivo_excel, novo_nome)
                logging.info(f"✅ 0051 processado: {novo_nome}")

                return raw_linhas

            return []

        except Exception as e:
            logging.error(f"Erro ao coletar 0051: {e}")
            return []

    def _processar_excel_0051(self, caminho_arquivo):
        """Le Excel do 0051 e retorna APENAS clientes com status permitidos"""
        # Colunas reais: Data Cadastro Reserva | Data Reserva | Hora | Cliente | Celular |
        # Data Cadastro Cliente | E-mail | Profissional | Servico | Origem |
        # Status | Observacao | Data Comanda | Numero | Quem Cadastrou
        try:
            df = pd.read_excel(caminho_arquivo)
            logging.info(f"0051: {len(df)} linhas | colunas: {df.columns.tolist()}")

            def v(row, col, default=''):
                val = row.get(col, default)
                return default if (val is None or (isinstance(val, float) and pd.isna(val))) else str(val).strip()

            # Mapear cada coluna pelo nome exato
            cols = {str(c).strip(): c for c in df.columns}

            def col(nome):
                return cols.get(nome)

            # 🔥 LISTA DE STATUS PERMITIDOS (SÓ ESTES VÃO PARA A PLANILHA)
            status_permitidos = [
                'AGENDADO',
                'CONFIRMADO',
                'AGUARDANDO',
                'EM ATENDIMENTO',
                'FINALIZADO',
                'PAGO'
            ]

            linhas = []
            for _, row in df.iterrows():
                row = row.to_dict()

                status = v(row, col('Status')).upper()

                # 🔥 FILTRO: SÓ ADICIONA SE O STATUS ESTIVER NA LISTA PERMITIDA
                if status not in status_permitidos:
                    logging.info(f"⏭️ Pulado (status não permitido): {status} - Cliente: {v(row, col('Cliente'))}")
                    continue  # PULA ESTA LINHA

                linhas.append({
                    'data_reserva': v(row, col('Data Reserva')),
                    'hora': v(row, col('Hora')),
                    'cliente': v(row, col('Cliente')),
                    'celular': v(row, col('Celular')),
                    'profissional': v(row, col('Profissional')),
                    'servico': v(row, col('Serviço') or col('Servico')),
                    'status': status,
                    'observacao': v(row, col('Observação') or col('Observacao')),
                })

            logging.info(f"✅ 0051: {len(linhas)} registros processados (removidos: {len(df) - len(linhas)})")
            return linhas

        except Exception as e:
            logging.error(f"0051 processar erro: {e}", exc_info=True)
            return []

    def fechar_driver(self):
        """Fecha o driver do Chrome; se falhar, usa taskkill."""
        if self.driver:
            try:
                self.driver.quit()
                logging.info("🔧 Driver do Chrome fechado")
            except Exception as e:
                logging.warning(f"driver.quit() falhou ({e}), forçando taskkill...")
                self._matar_chromedrivers_orfaos()
            self.driver = None


# ============================================================================
# GERADOR DE RELATÓRIOS HTML (DASHBOARD COMPLETO) - VERSÃO MELHORADA
# ============================================================================

# ============================================================================
# CLASSE COLETOR DE FEEDBACK PROFISSIONAL
# ============================================================================

# ============================================================================
# CLASSE COLETOR DE FEEDBACK PROFISSIONAL (ATUALIZADA PARA SUA PLANILHA)
# ============================================================================

# ============================================================================
# CLASSE COLETOR DE FEEDBACK PROFISSIONAL (VERSÃO SIMPLIFICADA - 5 COLUNAS)
# ============================================================================

class GeradorRelatorioUnico:
    """Gera um único relatório HTML com todos os dados e funcionalidade de pesquisa"""

    def __init__(self, base_dados):
        self.base_dados = base_dados
        self.sistema_coleta = SistemaColetaNodri()
        self.meses_pt = {
            1: "JANEIRO", 2: "FEVEREIRO", 3: "MARÇO", 4: "ABRIL",
            5: "MAIO", 6: "JUNHO", 7: "JULHO", 8: "AGOSTO",
            9: "SETEMBRO", 10: "OUTUBRO", 11: "NOVEMBRO", 12: "DEZEMBRO"
        }

    def calcular_taxa_crescimento(self, valor_atual, valor_anterior):
        """Calcula taxa de crescimento entre dois valores"""
        if valor_anterior and valor_anterior > 0:
            return ((valor_atual - valor_anterior) / valor_anterior) * 100
        return 0

    def gerar_relatorio_completo(self):
        """Gera um único relatório HTML com todos os dados e COMPARAÇÃO DE PERÍODOS"""

        # Carregar todos os dados da base
        dados_completos = self.base_dados.carregar_dados_para_analise()

        # ===== PROCESSAMENTO DOS FEEDBACKS (CORRIGIDO) =====
        print("\n" + "=" * 50)
        print("📊 DEBUG: CARREGANDO FEEDBACKS")
        print("=" * 50)

        df_feedback = self.base_dados.df_geral.get('FEEDBACK', pd.DataFrame())
        feedbacks_por_profissional = {}

        if not df_feedback.empty:
            print(f"📋 Colunas encontradas: {df_feedback.columns.tolist()}")
            print(f"📊 Total de feedbacks: {len(df_feedback)}")
            print(f"\n📋 Primeiros 5 registros:")
            print(df_feedback[['profissional', 'tipo', 'oque_houve', 'comentario']].head())
            print(f"\n📊 Valores únicos de 'oque_houve':")
            print(df_feedback['oque_houve'].unique())

            for _, row in df_feedback.iterrows():
                prof = str(row.get('profissional', '')).strip().upper()
                if prof and prof != 'NAN' and prof != '':
                    if prof not in feedbacks_por_profissional:
                        feedbacks_por_profissional[prof] = {
                            'positivos': [],
                            'negativos': [],
                            'todos': []
                        }

                    # PEGAR OS VALORES CORRETAMENTE
                    ano = int(row.get('ano', 0)) if pd.notna(row.get('ano')) else 0
                    mes = int(row.get('mes', 0)) if pd.notna(row.get('mes')) else 0
                    tipo = str(row.get('tipo', '')).strip().upper()
                    oque_houve = str(row.get('oque_houve', '')).strip()  # ← CAMPO CORRETO
                    comentario = str(row.get('comentario', '')).strip()
                    data = str(row.get('data', ''))

                    # Determinar tipo
                    if 'POSITIVO' in tipo:
                        tipo_final = 'POSITIVO'
                    elif 'NEGATIVO' in tipo:
                        tipo_final = 'NEGATIVO'
                    else:
                        tipo_final = tipo

                    feedback = {
                        'ano': ano,
                        'mes': mes,
                        'data': data,
                        'tipo': tipo_final,
                        'oque_houve': oque_houve if oque_houve else "NÃO ESPECIFICADO",  # ← VALOR PADRÃO
                        'comentario': comentario
                    }

                    feedbacks_por_profissional[prof]['todos'].append(feedback)

                    if tipo_final == 'POSITIVO':
                        feedbacks_por_profissional[prof]['positivos'].append(feedback)
                    elif tipo_final == 'NEGATIVO':
                        feedbacks_por_profissional[prof]['negativos'].append(feedback)

            print(f"\n✅ Feedbacks carregados para {len(feedbacks_por_profissional)} profissionais")
            print("=" * 50)
        else:
            print("⚠️ Nenhum feedback encontrado na base!")

        # ===== ESTRUTURA DE DADOS PARA O RELATÓRIO =====

        # 1. DADOS DO SALÃO (GERAL)
        dados_salao = {
            'periodos': [],
            'faturamento_anual': {},
            'clientes_anual': {},
            'ticket_anual': {},
            'servicos_anual': {},
            'produtos_anual': {},
            'taxa_retorno_anual': {}
        }

        # 2. DADOS DOS PROFISSIONAIS (INDIVIDUAL)
        profissionais = {}  # {nome: {dados_por_periodo, totais}}

        # 3. DADOS CONSOLIDADOS (TODOS PROFISSIONAIS)
        consolidado = {
            'anos': [],
            'faturamento_total_por_ano': {},
            'profissionais_por_ano': {},
            'servicos_por_ano': {},
            'produtos_por_ano': {},
            'top_profissionais': {}
        }

        # 4. DADOS DE SERVIÇOS E PRODUTOS
        todos_servicos = {}
        todos_produtos = {}
        todos_feedbacks = []

        # Processar todos os períodos
        for (ano, mes), dados in sorted(dados_completos.items()):
            periodo_str = f"{self.meses_pt[mes]}/{ano}"
            mes_num = mes

            # ===== DADOS DO SALÃO =====
            resumo = dados.get('resumo', {})
            faturamento = float(resumo.get('faturamento_total', 0))
            clientes = int(resumo.get('clientes_atendidos', 0))
            ticket = float(resumo.get('ticket_medio', 0))
            clientes_novos = int(resumo.get('clientes_novos', 0))

            dados_salao['periodos'].append({
                'ano': ano,
                'mes': mes_num,
                'periodo': periodo_str,
                'faturamento': faturamento,
                'clientes': clientes,
                'ticket': ticket,
                'clientes_novos': clientes_novos,
                'servicos': len(dados.get('servicos', [])),
                'produtos': len(dados.get('produtos', [])),
                'taxa_retorno': dados.get('taxa_retorno_salao', 0)
            })

            # Dados anuais do salão
            if ano not in dados_salao['faturamento_anual']:
                dados_salao['faturamento_anual'][ano] = 0
                dados_salao['clientes_anual'][ano] = 0
                dados_salao['ticket_anual'][ano] = 0
                dados_salao['servicos_anual'][ano] = 0
                dados_salao['produtos_anual'][ano] = 0
                dados_salao['taxa_retorno_anual'][ano] = 0

            dados_salao['faturamento_anual'][ano] += faturamento
            dados_salao['clientes_anual'][ano] += clientes
            dados_salao['ticket_anual'][ano] = (dados_salao['ticket_anual'][ano] + ticket) / 2  # Média
            dados_salao['servicos_anual'][ano] += len(dados.get('servicos', []))
            dados_salao['produtos_anual'][ano] += len(dados.get('produtos', []))
            dados_salao['taxa_retorno_anual'][ano] = (dados_salao['taxa_retorno_anual'][ano] + dados.get(
                'taxa_retorno_salao', 0)) / 2

            # ===== DADOS DOS PROFISSIONAIS =====
            for prof_nome, prof_dados in dados.get('profissionais', {}).items():
                if prof_nome not in profissionais:
                    profissionais[prof_nome] = {
                        'nome': prof_nome,
                        'categoria': prof_dados.get('categoria', 'N/A'),
                        'periodos': [],
                        'total_faturamento': 0,
                        'total_ticket': 0,
                        'total_preferencia': 0,
                        'total_sem_preferencia': 0,
                        'total_dias': 0,
                        'total_servicos': 0,
                        'total_produtos': 0,
                        'media_taxa_retorno': 0,
                        'qtd_periodos': 0,
                        'faturamento_por_ano': {},
                        'servicos_detalhados': {},
                        'feedbacks': feedbacks_por_profissional.get(prof_nome, [])
                    }

                # Dados do período
                pagamento = prof_dados.get('pagamentos', {})
                ticket_prof = prof_dados.get('ticket', [{}])[0].get('ticket_medio', 0) if prof_dados.get(
                    'ticket') else 0
                preferencia = prof_dados.get('preferencia', {})
                ocupacao = prof_dados.get('ocupacao', {})
                taxa_retorno = prof_dados.get('taxa_retorno', 0)

                profissionais[prof_nome]['periodos'].append({
                    'periodo': periodo_str,
                    'ano': ano,
                    'mes': mes_num,
                    'faturamento': pagamento.get('valor_a_pagar', 0),
                    'desconto': pagamento.get('desconto', 0),
                    'ticket': ticket_prof,
                    'preferencia': preferencia.get('clientes_preferencia', 0),
                    'sem_preferencia': preferencia.get('clientes_sem_preferencia', 0),
                    'dias': ocupacao.get('dias_trabalhados', 0),
                    'taxa_ocupacao': ocupacao.get('taxa_ocupacao', 0),
                    'taxa_retorno': taxa_retorno,
                    'servicos': len(prof_dados.get('servicos_detalhados', {})),
                    'produtos': prof_dados.get('produtos', 0)
                })

                # Totais
                profissionais[prof_nome]['total_faturamento'] += pagamento.get('valor_a_pagar', 0)
                profissionais[prof_nome]['total_ticket'] += ticket_prof
                profissionais[prof_nome]['total_preferencia'] += preferencia.get('clientes_preferencia', 0)
                profissionais[prof_nome]['total_sem_preferencia'] += preferencia.get('clientes_sem_preferencia', 0)
                profissionais[prof_nome]['total_dias'] += ocupacao.get('dias_trabalhados', 0)
                profissionais[prof_nome]['total_servicos'] += len(prof_dados.get('servicos_detalhados', {}))
                profissionais[prof_nome]['total_produtos'] += prof_dados.get('produtos', 0)
                profissionais[prof_nome]['media_taxa_retorno'] = (profissionais[prof_nome][
                                                                      'media_taxa_retorno'] + taxa_retorno) / 2
                profissionais[prof_nome]['qtd_periodos'] += 1

                # Faturamento por ano
                if ano not in profissionais[prof_nome]['faturamento_por_ano']:
                    profissionais[prof_nome]['faturamento_por_ano'][ano] = 0
                profissionais[prof_nome]['faturamento_por_ano'][ano] += pagamento.get('valor_a_pagar', 0)

                # Serviços detalhados
                for servico, info in prof_dados.get('servicos_detalhados', {}).items():
                    if servico not in profissionais[prof_nome]['servicos_detalhados']:
                        profissionais[prof_nome]['servicos_detalhados'][servico] = {'qtd': 0, 'valor': 0}
                    profissionais[prof_nome]['servicos_detalhados'][servico]['qtd'] += info.get('quantidade', 0)
                    profissionais[prof_nome]['servicos_detalhados'][servico]['valor'] += info.get('valor', 0)

            # ===== DADOS CONSOLIDADOS =====
            if ano not in consolidado['anos']:
                consolidado['anos'].append(ano)
                consolidado['faturamento_total_por_ano'][ano] = 0
                consolidado['profissionais_por_ano'][ano] = 0
                consolidado['servicos_por_ano'][ano] = 0
                consolidado['produtos_por_ano'][ano] = 0

            consolidado['faturamento_total_por_ano'][ano] += faturamento
            consolidado['profissionais_por_ano'][ano] = len(dados.get('profissionais', {}))
            consolidado['servicos_por_ano'][ano] += len(dados.get('servicos', []))
            consolidado['produtos_por_ano'][ano] += len(dados.get('produtos', []))

            # ===== SERVIÇOS E PRODUTOS =====
            for servico in dados.get('servicos', []):
                nome = servico.get('servico', '')
                qtd = servico.get('quantidade', 0)
                if nome not in todos_servicos:
                    todos_servicos[nome] = {'qtd': 0, 'periodos': []}
                todos_servicos[nome]['qtd'] += qtd
                todos_servicos[nome]['periodos'].append(periodo_str)

            for produto in dados.get('produtos', []):
                nome = produto.get('produto', '')
                qtd = produto.get('quantidade', 0)
                if nome not in todos_produtos:
                    todos_produtos[nome] = {'qtd': 0, 'periodos': []}
                todos_produtos[nome]['qtd'] += qtd
                todos_produtos[nome]['periodos'].append(periodo_str)

        # Ordenar anos
        consolidado['anos'].sort()

        # Top profissionais por faturamento
        top_profissionais = sorted(
            [{'nome': p['nome'], 'faturamento': p['total_faturamento']}
             for p in profissionais.values()],
            key=lambda x: x['faturamento'],
            reverse=True
        )[:10]

        # Top serviços
        top_servicos = sorted(
            [{'nome': s, 'qtd': d['qtd']} for s, d in todos_servicos.items()],
            key=lambda x: x['qtd'],
            reverse=True
        )[:10]

        # Top produtos
        top_produtos = sorted(
            [{'nome': p, 'qtd': d['qtd']} for p, d in todos_produtos.items()],
            key=lambda x: x['qtd'],
            reverse=True
        )[:10]

        # ===== CALCULAR ESTATÍSTICAS DE FEEDBACK (NOVO) =====
        total_feedbacks = sum(
            len(p['feedbacks']) if isinstance(p.get('feedbacks'), list) else 0 for p in profissionais.values())
        total_profissionais_feedback = sum(
            1 for p in profissionais.values() if p.get('feedbacks') and len(p['feedbacks']) > 0)
        total_positivos = sum(
            len([f for f in p.get('feedbacks', []) if 'positivo' in str(f.get('tipo', '')).lower()]) for p in
            profissionais.values())
        total_negativos = sum(
            len([f for f in p.get('feedbacks', []) if 'negativo' in str(f.get('tipo', '')).lower()]) for p in
            profissionais.values())

        # Preparar dados para o template
        anos_salao = sorted([int(a) for a in dados_salao['faturamento_anual'].keys()])
        faturamento_anual_list = [float(dados_salao['faturamento_anual'][a]) for a in anos_salao]
        clientes_anual_list = [int(dados_salao['clientes_anual'][a]) for a in anos_salao]
        ticket_anual_list = [float(dados_salao['ticket_anual'][a]) for a in anos_salao]
        taxa_retorno_anual_list = [float(dados_salao['taxa_retorno_anual'][a]) for a in anos_salao]

        # Consolidado
        consolidado_anos = sorted(consolidado['anos'])
        consolidado_faturamento_list = [float(consolidado['faturamento_total_por_ano'][a]) for a in consolidado_anos]
        consolidado_profissionais_list = [int(consolidado['profissionais_por_ano'][a]) for a in consolidado_anos]
        consolidado_servicos_list = [int(consolidado['servicos_por_ano'][a]) for a in consolidado_anos]
        consolidado_produtos_list = [int(consolidado['produtos_por_ano'][a]) for a in consolidado_anos]

        # Profissionais lista para template
        profissionais_lista = []
        for prof in profissionais.values():
            media_ticket = prof['total_ticket'] / prof['qtd_periodos'] if prof['qtd_periodos'] > 0 else 0
            profissionais_lista.append({
                'nome': prof['nome'],
                'categoria': prof['categoria'],
                'total_faturamento': prof['total_faturamento'],
                'media_ticket': media_ticket,
                'total_preferencia': prof['total_preferencia'],
                'total_dias': prof['total_dias'],
                'faturamento_por_ano': prof['faturamento_por_ano'],
                'servicos_detalhados': prof['servicos_detalhados'],
                'feedbacks': prof.get('feedbacks', [])
            })

        # Calcular totais gerais
        total_faturamento_geral = sum([p['faturamento'] for p in dados_salao['periodos']])
        total_clientes_geral = sum([p['clientes'] for p in dados_salao['periodos']])
        ticket_medio_geral = total_faturamento_geral / total_clientes_geral if total_clientes_geral > 0 else 0
        taxa_retorno_media = sum([p['taxa_retorno'] for p in dados_salao['periodos']]) / len(dados_salao['periodos']) if \
            dados_salao['periodos'] else 0

        # Calcular crescimentos
        if len(anos_salao) >= 2:
            ultimo_ano = anos_salao[-1]
            penultimo_ano = anos_salao[-2]

            crescimento_faturamento = ((dados_salao['faturamento_anual'][ultimo_ano] - dados_salao['faturamento_anual'][
                penultimo_ano]) / dados_salao['faturamento_anual'][penultimo_ano] * 100) if \
                dados_salao['faturamento_anual'][penultimo_ano] > 0 else 0
            crescimento_clientes = (
                    (dados_salao['clientes_anual'][ultimo_ano] - dados_salao['clientes_anual'][penultimo_ano]) /
                    dados_salao['clientes_anual'][penultimo_ano] * 100) if dados_salao['clientes_anual'][
                                                                               penultimo_ano] > 0 else 0
            crescimento_ticket = ((ticket_anual_list[-1] - ticket_anual_list[-2]) / ticket_anual_list[-2] * 100) if \
                ticket_anual_list[-2] > 0 else 0
        else:
            crescimento_faturamento = 0
            crescimento_clientes = 0
            crescimento_ticket = 0

        # Classes para crescimento
        crescimento_faturamento_class = 'growth-positive' if crescimento_faturamento >= 0 else 'growth-negative'
        crescimento_faturamento_icon = 'fa-arrow-up' if crescimento_faturamento >= 0 else 'fa-arrow-down'
        crescimento_clientes_class = 'growth-positive' if crescimento_clientes >= 0 else 'growth-negative'
        crescimento_clientes_icon = 'fa-arrow-up' if crescimento_clientes >= 0 else 'fa-arrow-down'
        crescimento_ticket_class = 'growth-positive' if crescimento_ticket >= 0 else 'growth-negative'
        crescimento_ticket_icon = 'fa-arrow-up' if crescimento_ticket >= 0 else 'fa-arrow-down'

        crescimento_periodos = ((len(dados_salao['periodos']) - 1) / 1 * 100) if len(dados_salao['periodos']) > 1 else 0

        # JSON para JavaScript
        dados_salao_json = json.dumps({
            'anos': anos_salao,
            'faturamento': faturamento_anual_list,
            'clientes': clientes_anual_list,
            'ticket': ticket_anual_list,
            'taxa_retorno': taxa_retorno_anual_list
        })

        dados_consolidado_json = json.dumps({
            'anos': consolidado_anos,
            'faturamento': consolidado_faturamento_list,
            'profissionais': consolidado_profissionais_list,
            'servicos': consolidado_servicos_list,
            'produtos': consolidado_produtos_list
        })

        periodos_json = json.dumps(dados_salao['periodos'], default=str)

        # ===== TEMPLATE HTML COM NOVA SEÇÃO DE FEEDBACK =====
        html_template = """<!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>NODRI - RELATÓRIO COMPLETO COM COMPARAÇÃO</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
            :root {
                --primary: #0f3460;
                --secondary: #1a1a2e;
                --success: #28a745;
                --warning: #ffc107;
                --danger: #dc3545;
                --info: #17a2b8;
                --light: #f8f9fa;
                --dark: #343a40;
            }

            body {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                padding: 20px;
                min-height: 100vh;
            }


            /* Modal expansível */
.modal-expandable .modal-container {
    max-width: 95%;
    width: auto;
    min-width: 600px;
    transition: all 0.3s ease;
}

#rankingPrincipal {
    transition: flex 0.3s ease;
}

#painelMeta {
    transition: width 0.3s ease, padding 0.3s ease;
}

#btnExpandirMeta {
    transition: all 0.3s ease;
}

#btnExpandirMeta:hover {
    transform: scale(1.05);
}

            /* Estilos para o modal de comparação */
.ranking-list {
    max-height: 400px;
    overflow-y: auto;
}

.ranking-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    border-bottom: 1px solid #e0e0e0;
    transition: all 0.2s;
}

.ranking-item:hover {
    background: #f5f5f5;
}

.ranking-position {
    font-weight: bold;
    color: #0f3460;
    width: 50px;
    font-size: 0.9rem;
}

.ranking-name {
    flex: 1;
    font-weight: 500;
    font-size: 0.85rem;
}

.ranking-value {
    font-weight: bold;
    font-family: 'Courier New', monospace;
    min-width: 100px;
    text-align: right;
    font-size: 0.85rem;
}

#metaArea select, #metaArea input {
    font-size: 0.85rem;
}

#aplicarMetaBtn:hover {
    background: #2a5298 !important;
    transform: scale(1.02);
}

            .dashboard-container {
                max-width: 1400px;
                margin: 0 auto;
            }

            /* ===== ESTILOS PARA TABELAS DE SERVIÇOS ===== */
            .table-responsive {
                overflow-x: auto;
                background: white;
                border-radius: 12px;
                padding: 5px;
            }

            .table-responsive table {
                width: 100%;
                border-collapse: collapse;
                background: white;
            }

            .table-responsive th {
                background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
                color: white !important;
                font-weight: 600;
                padding: 12px 8px;
                text-align: center;
                font-size: 0.85rem;
                border: 1px solid #dee2e6;
            }

            .table-responsive td {
                padding: 10px 8px;
                border: 1px solid #dee2e6;
                color: #333333 !important;
                background: white !important;
                font-size: 0.9rem;
            }

            .table-responsive tr:nth-child(even) td {
                background: #f8f9fa !important;
            }

            .table-responsive tr:hover td {
                background: #e9ecef !important;
            }

            .badge-success {
                background: #d4edda;
                color: #155724 !important;
                padding: 4px 8px;
                border-radius: 12px;
                font-weight: 600;
                font-size: 0.8rem;
                display: inline-block;
            }

            .badge-danger {
                background: #f8d7da;
                color: #721c24 !important;
                padding: 4px 8px;
                border-radius: 12px;
                font-weight: 600;
                font-size: 0.8rem;
                display: inline-block;
            }

            .badge-warning {
                background: #fff3cd;
                color: #856404 !important;
                padding: 4px 8px;
                border-radius: 12px;
                font-weight: 600;
                font-size: 0.8rem;
                display: inline-block;
            }

            .card {
                background: white;
                border-radius: 15px;
                padding: 20px;
                margin-bottom: 25px;
                box-shadow: 0 5px 20px rgba(0,0,0,0.1);
                border: 1px solid #e0e0e0;
            }

            .card-title {
                font-size: 1.2rem;
                font-weight: 600;
                color: var(--primary);
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 2px solid var(--primary);
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .table-responsive td:first-child {
                font-weight: 600;
                color: var(--primary) !important;
            }

            .table-responsive td:nth-child(4),
            .table-responsive td:nth-child(7) {
                text-align: center;
            }

            .table-responsive td:nth-child(5),
            .table-responsive td:nth-child(6) {
                font-family: 'Courier New', monospace;
                font-weight: 600;
                color: #0f3460 !important;
            }

            @media (max-width: 768px) {
                .table-responsive {
                    font-size: 0.8rem;
                }

                .table-responsive th,
                .table-responsive td {
                    padding: 8px 4px;
                    white-space: nowrap;
                }
            }

            .monospace {
                font-family: 'Courier New', monospace;
                font-weight: 600;
            }

            .status-up {
                color: #28a745 !important;
                font-weight: 600;
            }

            .status-down {
                color: #dc3545 !important;
                font-weight: 600;
            }

            .status-neutral {
                color: #ffc107 !important;
                font-weight: 600;
            }

            /* HEADER */
            .main-header {
                background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
                color: white;
                padding: 30px;
                border-radius: 15px;
                margin-bottom: 30px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }

            .main-header h1 {
                font-size: 2.5rem;
                font-weight: 700;
                margin-bottom: 10px;
            }

            .main-header .subtitle {
                font-size: 1.1rem;
                opacity: 0.9;
            }

            /* STATS CARDS */
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }

            .stat-card {
                background: white;
                padding: 25px;
                border-radius: 15px;
                box-shadow: 0 5px 20px rgba(0,0,0,0.1);
                border-bottom: 5px solid var(--primary);
                transition: all 0.3s;
            }

            .stat-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 15px 30px rgba(0,0,0,0.15);
            }

            .stat-title {
                color: #666;
                font-size: 0.9rem;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 10px;
            }

            .stat-value {
                font-size: 2rem;
                font-weight: 700;
                color: var(--primary);
                margin-bottom: 10px;
            }

            .stat-growth {
                font-size: 0.9rem;
                padding: 5px 10px;
                border-radius: 20px;
                display: inline-block;
            }

            .growth-positive {
                background: #d4edda;
                color: #155724;
            }

            .growth-negative {
                background: #f8d7da;
                color: #721c24;
            }

            /* SEÇÃO DE COMPARAÇÃO */
            .comparison-section {
                background: white;
                padding: 25px;
                border-radius: 15px;
                margin-bottom: 30px;
                box-shadow: 0 5px 20px rgba(0,0,0,0.1);
            }

            .comparison-title {
                font-size: 1.3rem;
                font-weight: 600;
                color: var(--primary);
                margin-bottom: 20px;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .comparison-grid {
                display: flex;
                gap: 30px;
                margin-bottom: 20px;
                flex-wrap: wrap;
            }

            .period-box {
                flex: 1;
                min-width: 250px;
                background: var(--light);
                padding: 20px;
                border-radius: 10px;
            }

            .period-box h4 {
                color: var(--primary);
                font-weight: 600;
                margin-bottom: 15px;
                font-size: 1.1rem;
            }

            .period-selectors {
                display: flex;
                gap: 10px;
                align-items: center;
                margin-bottom: 15px;
                flex-wrap: wrap;
            }

            .period-select {
                flex: 1;
                padding: 8px 12px;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                font-size: 0.9rem;
                min-width: 120px;
            }

            .period-select:focus {
                border-color: var(--primary);
                outline: none;
            }

            .apply-btn {
                background: var(--primary);
                color: white;
                border: none;
                padding: 12px 30px;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
            }

            .apply-btn:hover {
                background: var(--secondary);
                transform: scale(1.05);
            }

            /* CARDS DE COMPARAÇÃO */
            .comparison-cards {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
                margin: 30px 0;
            }

            .comparison-card {
                background: white;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            }

            .comparison-header {
                background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
                color: white;
                padding: 15px;
                font-weight: 600;
                text-align: center;
            }

            .comparison-body {
                padding: 20px;
                display: flex;
                justify-content: space-around;
            }

            .comparison-item {
                text-align: center;
            }

            .comparison-label {
                font-size: 0.8rem;
                color: #666;
                margin-bottom: 5px;
            }

            .comparison-value {
                font-size: 1.3rem;
                font-weight: 700;
                color: var(--primary);
            }

            .comparison-growth {
                text-align: center;
                padding: 10px;
                background: var(--light);
                margin: 10px;
                border-radius: 8px;
            }

            /* SEARCH BAR */
            .search-container {
                background: white;
                padding: 20px;
                border-radius: 15px;
                margin-bottom: 30px;
                box-shadow: 0 5px 20px rgba(0,0,0,0.1);
            }

            .search-box {
                display: flex;
                gap: 10px;
                margin-bottom: 15px;
            }

            .search-box input {
                flex: 1;
                padding: 15px;
                border: 2px solid #e0e0e0;
                border-radius: 10px;
                font-size: 1rem;
                transition: all 0.3s;
            }

            .search-box input:focus {
                border-color: var(--primary);
                outline: none;
                box-shadow: 0 0 0 3px rgba(15, 52, 96, 0.1);
            }

            .search-box button {
                padding: 15px 30px;
                background: var(--primary);
                color: white;
                border: none;
                border-radius: 10px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
            }

            .search-box button:hover {
                background: var(--secondary);
                transform: scale(1.05);
            }

            .filter-tags {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }

            .filter-tag {
                background: var(--light);
                padding: 8px 15px;
                border-radius: 20px;
                font-size: 0.9rem;
                cursor: pointer;
                transition: all 0.3s;
            }

            .filter-tag:hover {
                background: var(--primary);
                color: white;
            }

            .filter-tag.active {
                background: var(--primary);
                color: white;
            }

            /* SECTION TABS */
            .section-tabs {
                display: flex;
                gap: 10px;
                margin-bottom: 30px;
                background: white;
                padding: 10px;
                border-radius: 10px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            }

            .section-tab {
                flex: 1;
                padding: 15px;
                text-align: center;
                background: var(--light);
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.3s;
            }

            .section-tab:hover {
                background: var(--primary);
                color: white;
            }

            .section-tab.active {
                background: var(--primary);
                color: white;
            }

            /* SECTIONS */
            .section {
                display: none;
                animation: fadeIn 0.5s;
            }

            .section.active {
                display: block;
            }

            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }

            /* CARDS */
            .card {
                background: white;
                border-radius: 15px;
                padding: 25px;
                margin-bottom: 30px;
                box-shadow: 0 5px 20px rgba(0,0,0,0.1);
            }

            .card-title {
                font-size: 1.3rem;
                font-weight: 600;
                color: var(--primary);
                margin-bottom: 20px;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            /* CHARTS */
            .chart-container {
                height: 400px;
                margin-bottom: 30px;
            }

            /* TABLES */
            .table-responsive {
                overflow-x: auto;
            }

            table {
                width: 100%;
                border-collapse: collapse;
            }

            th {
                background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
                color: white;
                padding: 15px;
                font-weight: 600;
                text-align: center;
            }

            td {
                padding: 12px;
                border-bottom: 1px solid #e0e0e0;
                text-align: center;
            }

            tr:hover {
                background: var(--light);
            }

            /* PROFESSIONAL CARDS */
            .professionals-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }

            .professional-card {
                background: white;
                border-radius: 15px;
                overflow: hidden;
                box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                transition: all 0.3s;
            }

            .professional-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 15px 30px rgba(0,0,0,0.15);
            }

            .professional-header {
                background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
                color: white;
                padding: 20px;
                position: relative;
            }

            .professional-name {
                font-size: 1.3rem;
                font-weight: 700;
                margin-bottom: 5px;
            }

            .professional-category {
                font-size: 0.9rem;
                opacity: 0.9;
            }

            .professional-body {
                padding: 20px;
            }

            .professional-stats {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 15px;
                margin-bottom: 15px;
            }

            .professional-stat {
                text-align: center;
            }

            .professional-stat-value {
                font-size: 1.2rem;
                font-weight: 700;
                color: var(--primary);
            }

            .professional-stat-label {
                font-size: 0.8rem;
                color: #666;
            }

            .professional-growth {
                padding: 10px;
                border-radius: 8px;
                background: var(--light);
                text-align: center;
            }

            /* FEEDBACK CARDS - NOVO ESTILO */
            .feedback-section {
                background: white;
                border-radius: 15px;
                padding: 25px;
                margin: 30px 0;
                box-shadow: 0 5px 20px rgba(0,0,0,0.1);
            }

            .feedback-title {
                font-size: 1.5rem;
                font-weight: 700;
                color: var(--primary);
                margin-bottom: 25px;
                display: flex;
                align-items: center;
                gap: 10px;
                border-bottom: 3px solid var(--primary);
                padding-bottom: 10px;
            }

            .feedback-stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin-bottom: 30px;
            }

            .feedback-stat-card {
                background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
                color: white;
                padding: 20px;
                border-radius: 12px;
                text-align: center;
            }

            .feedback-stat-number {
                font-size: 2.2rem;
                font-weight: 700;
                margin-bottom: 5px;
            }

            .feedback-stat-label {
                font-size: 0.9rem;
                opacity: 0.9;
            }

            .feedback-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
                gap: 25px;
                margin-top: 20px;
            }

            .feedback-professional-card {
                background: white;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                border: 1px solid #e0e0e0;
            }

            .feedback-professional-header {
                background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
                color: white;
                padding: 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .feedback-professional-name {
                font-size: 1.2rem;
                font-weight: 700;
            }

            .feedback-count-badge {
                background: rgba(255,255,255,0.2);
                padding: 5px 10px;
                border-radius: 20px;
                font-size: 0.8rem;
            }

            .feedback-tabs {
                display: flex;
                border-bottom: 2px solid #e0e0e0;
            }

            .feedback-tab {
                flex: 1;
                padding: 10px;
                text-align: center;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.3s;
            }

            .feedback-tab.positivo:hover {
                background: #d4edda;
            }

            .feedback-tab.negativo:hover {
                background: #f8d7da;
            }

            .feedback-tab.active.positivo {
                background: #28a745;
                color: white;
            }

            .feedback-tab.active.negativo {
                background: #dc3545;
                color: white;
            }

            .feedback-content {
                padding: 15px;
                max-height: 300px;
                overflow-y: auto;
            }

            .feedback-item {
                padding: 12px;
                border-left: 4px solid;
                background: #f8f9fa;
                margin-bottom: 10px;
                border-radius: 0 8px 8px 0;
            }

            .feedback-item.positivo {
                border-left-color: #28a745;
            }

            .feedback-item.negativo {
                border-left-color: #dc3545;
            }

            .feedback-data {
                font-size: 0.7rem;
                color: #666;
                margin-bottom: 5px;
            }

            .feedback-texto {
                font-size: 0.85rem;
                margin-bottom: 5px;
                line-height: 1.4;
            }

            .feedback-tipo-badge {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 0.65rem;
                font-weight: 600;
            }

            .feedback-tipo-badge.positivo {
                background: #d4edda;
                color: #155724;
            }

            .feedback-tipo-badge.negativo {
                background: #f8d7da;
                color: #721c24;
            }

            .feedback-empty {
                text-align: center;
                padding: 30px;
                color: #999;
                font-style: italic;
            }

            /* BADGES */
            .badge {
                padding: 5px 10px;
                border-radius: 20px;
                font-size: 0.8rem;
                font-weight: 600;
            }

            .badge-success { background: #d4edda; color: #155724; }
            .badge-warning { background: #fff3cd; color: #856404; }
            .badge-danger { background: #f8d7da; color: #721c24; }
            .badge-info { background: #d1ecf1; color: #0c5460; }

            /* METRICS */
            .metrics-row {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin-bottom: 20px;
            }

            .metric-box {
                background: var(--light);
                padding: 15px;
                border-radius: 10px;
                text-align: center;
            }

            .metric-box .label {
                font-size: 0.9rem;
                color: #666;
                margin-bottom: 5px;
            }

            .metric-box .value {
                font-size: 1.5rem;
                font-weight: 700;
                color: var(--primary);
            }

            /* RESPONSIVE */
            @media (max-width: 768px) {
                .main-header h1 { font-size: 1.8rem; }
                .stat-value { font-size: 1.5rem; }
                .professionals-grid { grid-template-columns: 1fr; }
                .comparison-grid { flex-direction: column; }
                .feedback-grid { grid-template-columns: 1fr; }
            }
        </style>
    </head>
    <body>
        <div class="dashboard-container">
            <!-- HEADER PRINCIPAL -->
            <div class="main-header">
                <h1><i class="fas fa-chart-line"></i> NODRI - RELATÓRIO COMPLETO COM COMPARAÇÃO</h1>
                <div class="subtitle">
                    <i class="fas fa-calendar"></i> Dados consolidados de {{ total_periodos }} períodos | 
                    <i class="fas fa-users"></i> {{ total_profissionais }} profissionais |
                    <i class="fas fa-dollar-sign"></i> R$ {{ "%.2f"|format(total_faturamento_geral) }} |
                    <i class="fas fa-comment"></i> {{ total_feedbacks }} feedbacks
                </div>
            </div>

            <!-- STATS CARDS -->
            <div class="stats-grid" id="statsCards">
                <div class="stat-card">
                    <div class="stat-title"><i class="fas fa-calendar"></i> TOTAL PERÍODOS</div>
                    <div class="stat-value" id="totalPeriodos">{{ total_periodos }}</div>
                    <div class="stat-growth growth-positive" id="crescimentoPeriodos">
                        <i class="fas fa-arrow-up"></i> {{ "%.1f"|format(crescimento_periodos) }}%
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-title"><i class="fas fa-dollar-sign"></i> FATURAMENTO TOTAL</div>
                    <div class="stat-value" id="totalFaturamento">R$ {{ "%.2f"|format(total_faturamento_geral) }}</div>
                    <div class="stat-growth {{ crescimento_faturamento_class }}" id="crescimentoFaturamento">
                        <i class="fas {{ crescimento_faturamento_icon }}"></i> {{ "%.1f"|format(crescimento_faturamento) }}%
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-title"><i class="fas fa-users"></i> TOTAL CLIENTES</div>
                    <div class="stat-value" id="totalClientes">{{ total_clientes_geral }}</div>
                    <div class="stat-growth {{ crescimento_clientes_class }}" id="crescimentoClientes">
                        <i class="fas {{ crescimento_clientes_icon }}"></i> {{ "%.1f"|format(crescimento_clientes) }}%
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-title"><i class="fas fa-ticket-alt"></i> TICKET MÉDIO</div>
                    <div class="stat-value" id="ticketMedio">R$ {{ "%.2f"|format(ticket_medio_geral) }}</div>
                    <div class="stat-growth {{ crescimento_ticket_class }}" id="crescimentoTicket">
                        <i class="fas {{ crescimento_ticket_icon }}"></i> {{ "%.1f"|format(crescimento_ticket) }}%
                    </div>
                </div>
            </div>

            <!-- NOVA SEÇÃO DE COMPARAÇÃO DE PERÍODOS -->
            <!-- NOVA SEÇÃO DE COMPARAÇÃO DE PERÍODOS COM ANOS -->
<div class="comparison-section">
    <div class="comparison-title">
        <i class="fas fa-balance-scale"></i> COMPARAÇÃO DE PERÍODOS
    </div>

    <div class="comparison-grid">
        <div class="period-box">
            <h4><i class="fas fa-clock"></i> PRIMEIRO PERÍODO</h4>

            <!-- ANO DO PRIMEIRO PERÍODO -->
            <div class="period-selectors" style="margin-bottom: 10px;">
                <select id="periodo1Ano" class="period-select">
                    {% for ano in anos_salao %}
                    <option value="{{ ano }}" {% if loop.last %}selected{% endif %}>{{ ano }}</option>
                    {% endfor %}
                </select>
                <span style="margin: 0 5px;">-</span>
                <select id="periodo1Inicio" class="period-select">
                    <option value="1">Janeiro</option>
                    <option value="2">Fevereiro</option>
                    <option value="3">Março</option>
                    <option value="4">Abril</option>
                    <option value="5">Maio</option>
                    <option value="6">Junho</option>
                    <option value="7">Julho</option>
                    <option value="8">Agosto</option>
                    <option value="9">Setembro</option>
                    <option value="10">Outubro</option>
                    <option value="11">Novembro</option>
                    <option value="12">Dezembro</option>
                </select>
                <span>até</span>
                <select id="periodo1Fim" class="period-select">
                    <option value="1">Janeiro</option>
                    <option value="2">Fevereiro</option>
                    <option value="3">Março</option>
                    <option value="4">Abril</option>
                    <option value="5">Maio</option>
                    <option value="6">Junho</option>
                    <option value="7">Julho</option>
                    <option value="8">Agosto</option>
                    <option value="9">Setembro</option>
                    <option value="10">Outubro</option>
                    <option value="11">Novembro</option>
                    <option value="12">Dezembro</option>
                </select>
            </div>
        </div>

        <div class="period-box">
            <h4><i class="fas fa-clock"></i> SEGUNDO PERÍODO</h4>

            <!-- ANO DO SEGUNDO PERÍODO -->
            <div class="period-selectors" style="margin-bottom: 10px;">
                <select id="periodo2Ano" class="period-select">
                    {% for ano in anos_salao %}
                    <option value="{{ ano }}" {% if loop.last %}selected{% endif %}>{{ ano }}</option>
                    {% endfor %}
                </select>
                <span style="margin: 0 5px;">-</span>
                <select id="periodo2Inicio" class="period-select">
                    <option value="1">Janeiro</option>
                    <option value="2">Fevereiro</option>
                    <option value="3">Março</option>
                    <option value="4">Abril</option>
                    <option value="5">Maio</option>
                    <option value="6">Junho</option>
                    <option value="7">Julho</option>
                    <option value="8">Agosto</option>
                    <option value="9">Setembro</option>
                    <option value="10">Outubro</option>
                    <option value="11">Novembro</option>
                    <option value="12">Dezembro</option>
                </select>
                <span>até</span>
                <select id="periodo2Fim" class="period-select">
                    <option value="1">Janeiro</option>
                    <option value="2">Fevereiro</option>
                    <option value="3">Março</option>
                    <option value="4">Abril</option>
                    <option value="5">Maio</option>
                    <option value="6">Junho</option>
                    <option value="7">Julho</option>
                    <option value="8">Agosto</option>
                    <option value="9">Setembro</option>
                    <option value="10">Outubro</option>
                    <option value="11">Novembro</option>
                    <option value="12">Dezembro</option>
                </select>
            </div>
        </div>
    </div>

    <div class="text-center">
        <button class="apply-btn" onclick="aplicarComparacao()">
            <i class="fas fa-check"></i> APLICAR COMPARAÇÃO
        </button>
    </div>

    <!-- ÁREA DE RESULTADOS DA COMPARAÇÃO -->
    <div id="resultadoComparacao" style="display: none; margin-top: 30px;">
        <h4 style="color: var(--primary); margin-bottom: 20px;">
            <i class="fas fa-chart-simple"></i> RESULTADO DA COMPARAÇÃO
        </h4>
        <div id="cardsComparacao" class="comparison-cards"></div>
    </div>
</div>

            <!-- BARRA DE PESQUISA -->
            <div class="search-container">
                <div class="search-box">
                    <input type="text" id="searchInput" placeholder="Pesquisar profissional, serviço, período..." autocomplete="off">
                    <button onclick="filterData()"><i class="fas fa-search"></i> BUSCAR</button>
                </div>
                <div class="filter-tags" id="filterTags">
                    <span class="filter-tag active" onclick="setFilter('all')">TODOS</span>
                    <span class="filter-tag" onclick="setFilter('salao')">SALÃO</span>
                    <span class="filter-tag" onclick="setFilter('profissionais')">PROFISSIONAIS</span>
                    <span class="filter-tag" onclick="setFilter('consolidado')">CONSOLIDADO</span>
                    <span class="filter-tag" onclick="setFilter('servicos')">SERVIÇOS</span>
                    <span class="filter-tag" onclick="setFilter('produtos')">PRODUTOS</span>
                    <span class="filter-tag" onclick="setFilter('feedbacks')">FEEDBACKS</span>
                </div>
            </div>

            <!-- TABS DE SEÇÃO -->
            <div class="section-tabs">
                <div class="section-tab active" onclick="showSection('salao')">🏢 SALÃO</div>
                <div class="section-tab" onclick="showSection('profissionais')">👥 PROFISSIONAIS</div>
                <div class="section-tab" onclick="showSection('consolidado')">📊 CONSOLIDADO</div>
                <div class="section-tab" onclick="showSection('feedbacks')">💬 FEEDBACKS</div>
            </div>

            <!-- ===== SEÇÃO 1: SALÃO ===== -->
            <div id="section-salao" class="section active">
                <div class="card">
                    <div class="card-title">
                        <i class="fas fa-store"></i> DASHBOARD DO SALÃO
                    </div>

                    <!-- Métricas do Salão -->
                    <div class="metrics-row">
                        <div class="metric-box">
                            <div class="label">Faturamento Total</div>
                            <div class="value" id="salaoFaturamentoTotal">R$ {{ "%.2f"|format(total_faturamento_geral) }}</div>
                        </div>
                        <div class="metric-box">
                            <div class="label">Total Clientes</div>
                            <div class="value" id="salaoClientesTotal">{{ total_clientes_geral }}</div>
                        </div>
                        <div class="metric-box">
                            <div class="label">Ticket Médio</div>
                            <div class="value" id="salaoTicketMedio">R$ {{ "%.2f"|format(ticket_medio_geral) }}</div>
                        </div>
                        <div class="metric-box">
                            <div class="label">Taxa Retorno</div>
                            <div class="value" id="salaoTaxaRetorno">{{ "%.1f"|format(taxa_retorno_media) }}%</div>
                        </div>
                    </div>

                    <!-- Gráficos Anuais do Salão -->
                    <div class="row">
                        <div class="col-md-6">
                            <div class="chart-container">
                                <canvas id="graficoFaturamentoAnual"></canvas>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="chart-container">
                                <canvas id="graficoClientesAnual"></canvas>
                            </div>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-6">
                            <div class="chart-container">
                                <canvas id="graficoTicketAnual"></canvas>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="chart-container">
                                <canvas id="graficoTaxaRetornoAnual"></canvas>
                            </div>
                        </div>
                    </div>

                    <!-- Tabela de Períodos -->
                    <div class="table-responsive">
                        <table id="tabelaPeriodos">
                            <thead>
                                <tr>
                                    <th>PERÍODO</th>
                                    <th>FATURAMENTO</th>
                                    <th>CLIENTES</th>
                                    <th>TICKET MÉDIO</th>
                                    <th>SERVIÇOS</th>
                                    <th>PRODUTOS</th>
                                    <th>CRESCIMENTO</th>
                                </tr>
                            </thead>
                            <tbody>
                                {% for p in periodos %}
                                <tr class="periodo-row" data-periodo="{{ p.periodo }}" data-ano="{{ p.ano }}" data-mes="{{ p.mes }}">
                                    <td><strong>{{ p.periodo }}</strong></td>
                                    <td>R$ {{ "%.2f"|format(p.faturamento) }}</td>
                                    <td>{{ p.clientes }}</td>
                                    <td>R$ {{ "%.2f"|format(p.ticket) }}</td>
                                    <td>{{ p.servicos }}</td>
                                    <td>{{ p.produtos }}</td>
                                    <td>
                                        {% if loop.index0 > 0 %}
                                            {% set crescimento = ((p.faturamento - periodos[loop.index0-1].faturamento) / periodos[loop.index0-1].faturamento * 100) if periodos[loop.index0-1].faturamento > 0 else 0 %}
                                            {% if crescimento > 0 %}
                                                <span class="badge-success">+{{ "%.1f"|format(crescimento) }}%</span>
                                            {% elif crescimento < 0 %}
                                                <span class="badge-danger">{{ "%.1f"|format(crescimento) }}%</span>
                                            {% else %}
                                                <span class="badge-warning">0%</span>
                                            {% endif %}
                                        {% else %}
                                            <span class="badge-info">BASE</span>
                                        {% endif %}
                                    </td>
                                </tr>
                                {% endfor %}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- ===== SEÇÃO 2: PROFISSIONAIS ===== -->
            <div id="section-profissionais" class="section">
                <div class="card">
                    <div class="card-title">
                        <i class="fas fa-users"></i> PROFISSIONAIS
                    </div>

                    <!-- Busca de Profissionais -->
                    <div class="search-box" style="margin-bottom: 20px;">
                        <input type="text" id="searchProfissional" placeholder="Digite o nome do profissional..." onkeyup="filterProfissionais()">
                    </div>

                    <!-- Cards de Profissionais -->
                    <div class="professionals-grid" id="profissionaisGrid">
                        {% for prof in profissionais_lista %}
                        <div class="professional-card" data-nome="{{ prof.nome|lower }}" data-categoria="{{ prof.categoria|lower }}">
                            <div class="professional-header">
                                <div class="professional-name">{{ prof.nome }}</div>
                                <div class="professional-category">{{ prof.categoria }}</div>
                            </div>
                            <div class="professional-body">
                                <div class="professional-stats">
                                    <div class="professional-stat">
                                        <div class="professional-stat-value">R$ {{ "%.2f"|format(prof.total_faturamento) }}</div>
                                        <div class="professional-stat-label">Faturamento</div>
                                    </div>
                                    <div class="professional-stat">
                                        <div class="professional-stat-value">R$ {{ "%.2f"|format(prof.media_ticket) }}</div>
                                        <div class="professional-stat-label">Ticket Médio</div>
                                    </div>
                                    <div class="professional-stat">
                                        <div class="professional-stat-value">{{ prof.total_preferencia }}</div>
                                        <div class="professional-stat-label">Pref. Clientes</div>
                                    </div>
                                    <div class="professional-stat">
                                        <div class="professional-stat-value">{{ prof.total_dias }}</div>
                                        <div class="professional-stat-label">Dias Trab.</div>
                                    </div>
                                </div>

                                <!-- Crescimento Anual -->
                                <div class="professional-growth">
                                    {% set anos = prof.faturamento_por_ano.keys()|sort %}
                                    {% if anos|length > 1 %}
                                        {% set anos_list = anos|list %}
                                        {% set ultimo_ano = anos_list[-1] %}
                                        {% set penultimo_ano = anos_list[-2] %}
                                        {% set crescimento = ((prof.faturamento_por_ano[ultimo_ano] - prof.faturamento_por_ano[penultimo_ano]) / prof.faturamento_por_ano[penultimo_ano] * 100) if prof.faturamento_por_ano[penultimo_ano] > 0 else 0 %}
                                        {% if crescimento > 0 %}
                                            <span class="badge-success"><i class="fas fa-arrow-up"></i> Crescimento: +{{ "%.1f"|format(crescimento) }}%</span>
                                        {% elif crescimento < 0 %}
                                            <span class="badge-danger"><i class="fas fa-arrow-down"></i> Crescimento: {{ "%.1f"|format(crescimento) }}%</span>
                                        {% else %}
                                            <span class="badge-warning">Crescimento: 0%</span>
                                        {% endif %}
                                    {% else %}
                                        <span class="badge-info">Apenas 1 ano de dados</span>
                                    {% endif %}
                                </div>

                                <!-- Top Serviços -->
                                <div style="margin-top: 15px;">
                                    <small><strong>Top Serviços:</strong></small>
                                    <div>
                                        {% for servico, dados in prof.servicos_detalhados.items()|sort(attribute='1.qtd', reverse=True)|slice(3) %}
                                            <span class="badge badge-info">{{ servico }} ({{ dados.qtd }})</span>
                                        {% endfor %}
                                    </div>
                                </div>

                                <!-- Feedbacks do Profissional -->
                                {% if prof.feedbacks %}
                                <div style="margin-top: 15px; border-top: 1px dashed #ccc; padding-top: 10px;">
                                    <small><strong><i class="fas fa-comment"></i> Feedbacks:</strong></small>
                                    <div style="max-height: 100px; overflow-y: auto;">
                                        {% for fb in prof.feedbacks[:5] %}
                                        <div style="background: #f8f9fa; border-radius: 5px; padding: 5px; margin: 5px 0; font-size: 0.7rem;">
                                            <span style="color: {% if fb.nota >= 4 %}#28a745{% elif fb.nota >= 3 %}#ffc107{% else %}#dc3545{% endif %};">
                                                ⭐ {{ fb.nota }}
                                            </span>
                                            <span style="color: #333;">{{ fb.cliente[:30] }}{% if fb.cliente|length > 30 %}...{% endif %}</span>
                                            {% if fb.comentario %}
                                            <br><span style="color: #666; font-style: italic;">"{{ fb.comentario[:50] }}{% if fb.comentario|length > 50 %}...{% endif %}"</span>
                                            {% endif %}
                                        </div>
                                        {% endfor %}
                                    </div>
                                </div>
                                {% endif %}
                            </div>
                        </div>
                        {% endfor %}
                    </div>
                </div>
            </div>

            <!-- ===== SEÇÃO 3: CONSOLIDADO ANUAL ===== -->
            <div id="section-consolidado" class="section">
                <div class="card">
                    <div class="card-title">
                        <i class="fas fa-chart-bar"></i> DADOS CONSOLIDADOS POR ANO
                    </div>

                    <!-- Gráficos Consolidados -->
                    <div class="row">
                        <div class="col-md-6">
                            <div class="chart-container">
                                <canvas id="graficoConsolidadoFaturamento"></canvas>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="chart-container">
                                <canvas id="graficoConsolidadoProfissionais"></canvas>
                            </div>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-6">
                            <div class="chart-container">
                                <canvas id="graficoConsolidadoServicos"></canvas>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="chart-container">
                                <canvas id="graficoConsolidadoProdutos"></canvas>
                            </div>
                        </div>
                    </div>

                    <!-- Tabela Consolidada -->
                    <div class="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>ANO</th>
                                    <th>FATURAMENTO</th>
                                    <th>PROFISSIONAIS</th>
                                    <th>SERVIÇOS</th>
                                    <th>PRODUTOS</th>
                                    <th>CRESCIMENTO</th>
                                </tr>
                            </thead>
                            <tbody>
                                {% for ano in consolidado_anos %}
                                <tr>
                                    <td><strong>{{ ano }}</strong></td>
                                    <td>R$ {{ "%.2f"|format(consolidado_faturamento[ano]) }}</td>
                                    <td>{{ consolidado_profissionais[ano] }}</td>
                                    <td>{{ consolidado_servicos[ano] }}</td>
                                    <td>{{ consolidado_produtos[ano] }}</td>
                                    <td>
                                        {% if loop.index0 > 0 %}
                                            {% set ano_anterior = consolidado_anos[loop.index0-1] %}
                                            {% set crescimento = ((consolidado_faturamento[ano] - consolidado_faturamento[ano_anterior]) / consolidado_faturamento[ano_anterior] * 100) if consolidado_faturamento[ano_anterior] > 0 else 0 %}
                                            {% if crescimento > 0 %}
                                                <span class="badge-success">+{{ "%.1f"|format(crescimento) }}%</span>
                                            {% elif crescimento < 0 %}
                                                <span class="badge-danger">{{ "%.1f"|format(crescimento) }}%</span>
                                            {% else %}
                                                <span class="badge-warning">0%</span>
                                            {% endif %}
                                        {% else %}
                                            <span class="badge-info">BASE</span>
                                        {% endif %}
                                    </td>
                                </tr>
                                {% endfor %}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Top Rankings -->
                <div class="row">
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-title">
                                <i class="fas fa-trophy"></i> TOP PROFISSIONAIS
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>PROFISSIONAL</th>
                                        <th>FATURAMENTO</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {% for prof in top_profissionais %}
                                    <tr>
                                        <td><strong>{{ loop.index }}</strong></td>
                                        <td>{{ prof.nome }}</td>
                                        <td>R$ {{ "%.2f"|format(prof.faturamento) }}</td>
                                    </tr>
                                    {% endfor %}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-title">
                                <i class="fas fa-trophy"></i> TOP SERVIÇOS
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>SERVIÇO</th>
                                        <th>QUANTIDADE</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {% for servico in top_servicos %}
                                    <tr>
                                        <td><strong>{{ loop.index }}</strong></td>
                                        <td>{{ servico.nome }}</td>
                                        <td>{{ servico.qtd }}</td>
                                    </tr>
                                    {% endfor %}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-title">
                                <i class="fas fa-trophy"></i> TOP PRODUTOS
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>PRODUTO</th>
                                        <th>QUANTIDADE</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {% for produto in top_produtos %}
                                    <tr>
                                        <td><strong>{{ loop.index }}</strong></td>
                                        <td>{{ produto.nome }}</td>
                                        <td>{{ produto.qtd }}</td>
                                    </tr>
                                    {% endfor %}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ===== NOVA SEÇÃO 4: FEEDBACKS ===== -->
            <div id="section-feedbacks" class="section">
                <div class="feedback-section">
                    <div class="feedback-title">
                        <i class="fas fa-comment-dots"></i> FEEDBACKS DOS CLIENTES POR PROFISSIONAL
                    </div>

                    <!-- Estatísticas de Feedbacks -->
                    <div class="feedback-stats">
                        <div class="feedback-stat-card">
                            <div class="feedback-stat-number">{{ total_feedbacks }}</div>
                            <div class="feedback-stat-label">Total de Feedbacks</div>
                        </div>
                        <div class="feedback-stat-card">
                            <div class="feedback-stat-number">{{ total_profissionais_feedback }}</div>
                            <div class="feedback-stat-label">Profissionais com Feedback</div>
                        </div>
                        <div class="feedback-stat-card">
                            <div class="feedback-stat-number">{{ total_positivos }}</div>
                            <div class="feedback-stat-label">Feedbacks Positivos</div>
                        </div>
                        <div class="feedback-stat-card">
                            <div class="feedback-stat-number">{{ total_negativos }}</div>
                            <div class="feedback-stat-label">Feedbacks Negativos</div>
                        </div>
                    </div>

                    <!-- Grid de Feedbacks por Profissional -->
                    <div class="feedback-grid" id="feedbackGrid">
                        {% for prof_nome, prof_feedbacks in feedbacks_por_profissional.items() %}
                        <div class="feedback-professional-card" data-nome="{{ prof_nome|lower }}">
                            <div class="feedback-professional-header">
                                <span class="feedback-professional-name">{{ prof_nome }}</span>
                                <span class="feedback-count-badge">
                                    <i class="fas fa-comment"></i> {{ prof_feedbacks.todos|length }}
                                </span>
                            </div>

                            <div class="feedback-tabs">
                                <div class="feedback-tab positivo active" onclick="mostrarFeedbackTab(this, '{{ prof_nome|replace(' ', '_') }}', 'positivo')">
                                    <i class="fas fa-smile"></i> Positivos ({{ prof_feedbacks.positivos|length }})
                                </div>
                                <div class="feedback-tab negativo" onclick="mostrarFeedbackTab(this, '{{ prof_nome|replace(' ', '_') }}', 'negativo')">
                                    <i class="fas fa-frown"></i> Negativos ({{ prof_feedbacks.negativos|length }})
                                </div>
                            </div>

                            <!-- Conteúdo de Feedbacks Positivos -->
                            <div id="feedback-{{ prof_nome|replace(' ', '_') }}-positivo" class="feedback-content" style="display: block;">
                                {% if prof_feedbacks.positivos %}
                                    {% for fb in prof_feedbacks.positivos %}
                                    <div class="feedback-item positivo">
                                        <div class="feedback-data">
                                            <i class="fas fa-calendar-alt"></i> {{ fb.data }} | 
                                            <i class="fas fa-tag"></i> {{ fb.tipo }}
                                            {% if fb.oque_houve %}
                                            | <i class="fas fa-question-circle"></i> {{ fb.oque_houve }}
                                            {% endif %}
                                        </div>
                                        <div class="feedback-texto">
                                            <i class="fas fa-quote-left" style="color: #28a745; font-size: 0.7rem;"></i>
                                            {{ fb.comentario }}
                                            <i class="fas fa-quote-right" style="color: #28a745; font-size: 0.7rem;"></i>
                                        </div>
                                    </div>
                                    {% endfor %}
                                {% else %}
                                    <div class="feedback-empty">
                                        <i class="fas fa-smile-wink"></i> Nenhum feedback positivo
                                    </div>
                                {% endif %}
                            </div>

                            <!-- Conteúdo de Feedbacks Negativos -->
                            <div id="feedback-{{ prof_nome|replace(' ', '_') }}-negativo" class="feedback-content" style="display: none;">
                                {% if prof_feedbacks.negativos %}
                                    {% for fb in prof_feedbacks.negativos %}
                                    <div class="feedback-item negativo">
                                        <div class="feedback-data">
                                            <i class="fas fa-calendar-alt"></i> {{ fb.data }} | 
                                            <i class="fas fa-tag"></i> {{ fb.tipo }}
                                            {% if fb.oque_houve %}
                                            | <i class="fas fa-question-circle"></i> {{ fb.oque_houve }}
                                            {% endif %}
                                        </div>
                                        <div class="feedback-texto">
                                            <i class="fas fa-quote-left" style="color: #dc3545; font-size: 0.7rem;"></i>
                                            {{ fb.comentario }}
                                            <i class="fas fa-quote-right" style="color: #dc3545; font-size: 0.7rem;"></i>
                                        </div>
                                    </div>
                                    {% endfor %}
                                {% else %}
                                    <div class="feedback-empty">
                                        <i class="fas fa-smile"></i> Nenhum feedback negativo
                                    </div>
                                {% endif %}
                            </div>
                        </div>
                        {% endfor %}
                    </div>
                </div>
            </div>
        </div>

        <script>
            // ===== DADOS PARA GRÁFICOS =====
            const dadosSalao = {{ dados_salao_json|safe }};
            const dadosConsolidado = {{ dados_consolidado_json|safe }};

            // ===== DADOS DOS PERÍODOS PARA COMPARAÇÃO =====
            const periodos = {{ periodos_json|safe }};

            // ===== VARIÁVEIS GLOBAIS =====
            let currentFilter = 'all';
            let currentSection = 'salao';

            // ===== FUNÇÕES DE FILTRO =====
            function setFilter(filter) {
                currentFilter = filter;

                // Atualizar tags
                document.querySelectorAll('.filter-tag').forEach(tag => {
                    tag.classList.remove('active');
                });
                event.target.classList.add('active');

                // Filtrar dados
                filterData();
            }

            function filterData() {
                const searchTerm = document.getElementById('searchInput').value.toLowerCase();

                // Filtrar cards de profissionais
                filterProfissionais();

                // Filtrar tabela de períodos
                filterPeriodos(searchTerm);

                // Filtrar feedbacks
                filterFeedbacks(searchTerm);

                // Atualizar métricas baseado no filtro
                updateMetrics(searchTerm);
            }

            function filterProfissionais() {
                const searchTerm = document.getElementById('searchProfissional')?.value.toLowerCase() || '';

                document.querySelectorAll('.professional-card').forEach(card => {
                    const nome = card.dataset.nome;
                    const categoria = card.dataset.categoria;

                    if (nome.includes(searchTerm) || categoria.includes(searchTerm)) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                });
            }

            function filterFeedbacks(searchTerm) {
                document.querySelectorAll('.feedback-professional-card').forEach(card => {
                    const nome = card.dataset.nome;
                    if (nome.includes(searchTerm)) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                });
            }

            function filterPeriodos(searchTerm) {
                document.querySelectorAll('.periodo-row').forEach(row => {
                    const periodo = row.dataset.periodo.toLowerCase();
                    const ano = row.dataset.ano;

                    if (periodo.includes(searchTerm) || ano.includes(searchTerm)) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                });
            }

            function updateMetrics(searchTerm) {
                // Calcular métricas baseado nos dados filtrados
                let totalFaturamento = 0;
                let totalClientes = 0;
                let totalPeriodos = 0;

                document.querySelectorAll('.periodo-row:not([style*="display: none"])').forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length > 1) {
                        const faturamento = parseFloat(cells[1].innerText.replace('R$', '').replace(',', ''));
                        const clientes = parseInt(cells[2].innerText);

                        if (!isNaN(faturamento)) totalFaturamento += faturamento;
                        if (!isNaN(clientes)) totalClientes += clientes;
                        totalPeriodos++;
                    }
                });

                // Atualizar cards
                document.getElementById('totalPeriodos').innerText = totalPeriodos;
                document.getElementById('totalFaturamento').innerText = 'R$ ' + totalFaturamento.toFixed(2);
                document.getElementById('totalClientes').innerText = totalClientes;
            }

            // ===== NOVA FUNÇÃO DE COMPARAÇÃO DE PERÍODOS =====
            function aplicarComparacao() {
                // Obter valores dos selects
                const p1Inicio = parseInt(document.getElementById('periodo1Inicio').value);
                const p1Fim = parseInt(document.getElementById('periodo1Fim').value);
                const p2Inicio = parseInt(document.getElementById('periodo2Inicio').value);
                const p2Fim = parseInt(document.getElementById('periodo2Fim').value);

                // Validar períodos
                if (p1Inicio > p1Fim) {
                    alert('Período 1 inválido: mês inicial maior que mês final!');
                    return;
                }
                if (p2Inicio > p2Fim) {
                    alert('Período 2 inválido: mês inicial maior que mês final!');
                    return;
                }

                // Filtrar períodos
                const periodo1 = periodos.filter(p => p.mes >= p1Inicio && p.mes <= p1Fim);
                const periodo2 = periodos.filter(p => p.mes >= p2Inicio && p.mes <= p2Fim);

                // Calcular totais
                function calcularTotais(periodo) {
                    return {
                        faturamento: periodo.reduce((sum, p) => sum + p.faturamento, 0),
                        clientes: periodo.reduce((sum, p) => sum + p.clientes, 0),
                        ticket: periodo.reduce((sum, p) => sum + p.ticket, 0) / (periodo.length || 1),
                        servicos: periodo.reduce((sum, p) => sum + p.servicos, 0),
                        produtos: periodo.reduce((sum, p) => sum + p.produtos, 0)
                    };
                }

                const totais1 = calcularTotais(periodo1);
                const totais2 = calcularTotais(periodo2);

                // Calcular crescimento
                function calcularCrescimento(atual, anterior, campo) {
                    if (anterior[campo] === 0) return { valor: 0, classe: 'neutral', texto: 'N/A' };
                    const crescimento = ((atual[campo] - anterior[campo]) / anterior[campo]) * 100;
                    let classe = crescimento > 0 ? 'positive' : crescimento < 0 ? 'negative' : 'neutral';
                    let simbolo = crescimento > 0 ? '▲' : crescimento < 0 ? '▼' : '•';
                    return {
                        valor: Math.abs(crescimento),
                        classe: classe,
                        texto: `${simbolo} ${Math.abs(crescimento).toFixed(1)}%`
                    };
                }

                const crescimentoFaturamento = calcularCrescimento(totais2, totais1, 'faturamento');
                const crescimentoClientes = calcularCrescimento(totais2, totais1, 'clientes');
                const crescimentoTicket = calcularCrescimento(totais2, totais1, 'ticket');
                const crescimentosServicos = calcularCrescimento(totais2, totais1, 'servicos');
                const crescimentoProdutos = calcularCrescimento(totais2, totais1, 'produtos');

                // Gerar HTML dos cards
                const cardsHTML = `
                    <div class="comparison-card">
                        <div class="comparison-header">FATURAMENTO</div>
                        <div class="comparison-body">
                            <div class="comparison-item">
                                <div class="comparison-label">PERÍODO 1</div>
                                <div class="comparison-value">R$ ${totais1.faturamento.toFixed(2)}</div>
                            </div>
                            <div class="comparison-item">
                                <div class="comparison-label">PERÍODO 2</div>
                                <div class="comparison-value">R$ ${totais2.faturamento.toFixed(2)}</div>
                            </div>
                        </div>
                        <div class="comparison-growth">
                            <span class="growth-${crescimentoFaturamento.classe}" style="font-weight: 700;">
                                ${crescimentoFaturamento.texto}
                            </span>
                        </div>
                    </div>
                    <div class="comparison-card">
                        <div class="comparison-header">CLIENTES</div>
                        <div class="comparison-body">
                            <div class="comparison-item">
                                <div class="comparison-label">PERÍODO 1</div>
                                <div class="comparison-value">${totais1.clientes}</div>
                            </div>
                            <div class="comparison-item">
                                <div class="comparison-label">PERÍODO 2</div>
                                <div class="comparison-value">${totais2.clientes}</div>
                            </div>
                        </div>
                        <div class="comparison-growth">
                            <span class="growth-${crescimentoClientes.classe}" style="font-weight: 700;">
                                ${crescimentoClientes.texto}
                            </span>
                        </div>
                    </div>
                    <div class="comparison-card">
                        <div class="comparison-header">TICKET MÉDIO</div>
                        <div class="comparison-body">
                            <div class="comparison-item">
                                <div class="comparison-label">PERÍODO 1</div>
                                <div class="comparison-value">R$ ${totais1.ticket.toFixed(2)}</div>
                            </div>
                            <div class="comparison-item">
                                <div class="comparison-label">PERÍODO 2</div>
                                <div class="comparison-value">R$ ${totais2.ticket.toFixed(2)}</div>
                            </div>
                        </div>
                        <div class="comparison-growth">
                            <span class="growth-${crescimentoTicket.classe}" style="font-weight: 700;">
                                ${crescimentoTicket.texto}
                            </span>
                        </div>
                    </div>
                `;

                // Mostrar resultados
                document.getElementById('cardsComparacao').innerHTML = cardsHTML;
                document.getElementById('resultadoComparacao').style.display = 'block';

                // Scroll suave até os resultados
                document.getElementById('resultadoComparacao').scrollIntoView({ behavior: 'smooth' });
            }

            // ===== NOVA FUNÇÃO PARA MOSTRAR FEEDBACKS POR TIPO =====
            function mostrarFeedbackTab(element, profId, tipo) {
                // Remover active de todas as tabs deste card
                const card = element.closest('.feedback-professional-card');
                card.querySelectorAll('.feedback-tab').forEach(tab => {
                    tab.classList.remove('active');
                });

                // Adicionar active na tab clicada
                element.classList.add('active');

                // Esconder todos os conteúdos de feedback deste card
                card.querySelectorAll('.feedback-content').forEach(content => {
                    content.style.display = 'none';
                });

                // Mostrar o conteúdo correspondente
                const contentId = `feedback-${profId}-${tipo}`;
                document.getElementById(contentId).style.display = 'block';
            }

            // ===== FUNÇÕES DE SEÇÃO =====
            function showSection(section) {
                currentSection = section;

                // Atualizar tabs
                document.querySelectorAll('.section-tab').forEach(tab => {
                    tab.classList.remove('active');
                });
                event.target.classList.add('active');

                // Mostrar seção
                document.querySelectorAll('.section').forEach(sec => {
                    sec.classList.remove('active');
                });
                document.getElementById('section-' + section).classList.add('active');

                // Atualizar gráficos se necessário
                if (section === 'salao') {
                    // Gráficos já renderizados
                } else if (section === 'consolidado') {
                    renderGraficosConsolidado();
                }
            }

            // ===== GRÁFICOS DO SALÃO =====
            function renderGraficosSalao() {
                // Gráfico de Faturamento Anual
                new Chart(document.getElementById('graficoFaturamentoAnual'), {
                    type: 'bar',
                    data: {
                        labels: {{ anos_salao|safe }},
                        datasets: [{
                            label: 'Faturamento Anual',
                            data: {{ faturamento_anual_list|safe }},
                            backgroundColor: '#0f3460',
                            borderRadius: 5
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: { display: true, text: 'Faturamento por Ano' }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: { callback: v => 'R$ ' + v.toFixed(0) }
                            }
                        }
                    }
                });

                // Gráfico de Clientes Anual
                new Chart(document.getElementById('graficoClientesAnual'), {
                    type: 'line',
                    data: {
                        labels: {{ anos_salao|safe }},
                        datasets: [{
                            label: 'Clientes por Ano',
                            data: {{ clientes_anual_list|safe }},
                            borderColor: '#28a745',
                            tension: 0.1,
                            fill: false
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: { display: true, text: 'Clientes por Ano' }
                        }
                    }
                });

                // Gráfico de Ticket Médio
                new Chart(document.getElementById('graficoTicketAnual'), {
                    type: 'line',
                    data: {
                        labels: {{ anos_salao|safe }},
                        datasets: [{
                            label: 'Ticket Médio',
                            data: {{ ticket_anual_list|safe }},
                            borderColor: '#ffc107',
                            tension: 0.1,
                            fill: false
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: { display: true, text: 'Ticket Médio por Ano' }
                        },
                        scales: {
                            y: {
                                ticks: { callback: v => 'R$ ' + v.toFixed(0) }
                            }
                        }
                    }
                });

                // Gráfico de Taxa de Retorno
                new Chart(document.getElementById('graficoTaxaRetornoAnual'), {
                    type: 'line',
                    data: {
                        labels: {{ anos_salao|safe }},
                        datasets: [{
                            label: 'Taxa de Retorno',
                            data: {{ taxa_retorno_anual_list|safe }},
                            borderColor: '#dc3545',
                            tension: 0.1,
                            fill: false
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: { display: true, text: 'Taxa de Retorno por Ano' }
                        },
                        scales: {
                            y: {
                                ticks: { callback: v => v + '%' }
                            }
                        }
                    }
                });
            }

            // ===== GRÁFICOS CONSOLIDADOS =====
            function renderGraficosConsolidado() {
                // Gráfico de Faturamento Consolidado
                new Chart(document.getElementById('graficoConsolidadoFaturamento'), {
                    type: 'bar',
                    data: {
                        labels: {{ consolidado_anos|safe }},
                        datasets: [{
                            label: 'Faturamento Total',
                            data: {{ consolidado_faturamento_list|safe }},
                            backgroundColor: '#0f3460'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: { display: true, text: 'Faturamento Consolidado' }
                        }
                    }
                });

                // Gráfico de Profissionais
                new Chart(document.getElementById('graficoConsolidadoProfissionais'), {
                    type: 'line',
                    data: {
                        labels: {{ consolidado_anos|safe }},
                        datasets: [{
                            label: 'Profissionais',
                            data: {{ consolidado_profissionais_list|safe }},
                            borderColor: '#17a2b8',
                            tension: 0.1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: { display: true, text: 'Profissionais por Ano' }
                        }
                    }
                });

                // Gráfico de Serviços
                new Chart(document.getElementById('graficoConsolidadoServicos'), {
                    type: 'line',
                    data: {
                        labels: {{ consolidado_anos|safe }},
                        datasets: [{
                            label: 'Serviços',
                            data: {{ consolidado_servicos_list|safe }},
                            borderColor: '#28a745',
                            tension: 0.1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: { display: true, text: 'Serviços por Ano' }
                        }
                    }
                });

                // Gráfico de Produtos
                new Chart(document.getElementById('graficoConsolidadoProdutos'), {
                    type: 'line',
                    data: {
                        labels: {{ consolidado_anos|safe }},
                        datasets: [{
                            label: 'Produtos',
                            data: {{ consolidado_produtos_list|safe }},
                            borderColor: '#ffc107',
                            tension: 0.1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: { display: true, text: 'Produtos por Ano' }
                        }
                    }
                });
            }

            // ===== INICIALIZAÇÃO =====
            window.onload = function() {
                renderGraficosSalao();
                renderGraficosConsolidado();

                // Adicionar listener para busca em tempo real
                document.getElementById('searchInput').addEventListener('keyup', filterData);
            };
        </script>
    </body>
    </html>
        """

        from jinja2 import Template
        template = Template(html_template)

        # Carregar feedbacks da base
        # Carregar feedbacks da base
        df_feedback = self.base_dados.df_geral.get('FEEDBACK', pd.DataFrame())
        feedbacks_por_profissional = {}
        if not df_feedback.empty:
            for _, row in df_feedback.iterrows():
                # APLICAR A MESMA UNIFICAÇÃO QUE VOCÊ USA NOS OUTROS DADOS
                nome_original = str(row.get('profissional', '')).strip()
                if nome_original:
                    # Usar o mesmo unificador do sistema
                    prof_unificado = self.gerenciador_profissionais.unificar_nome(nome_original)
                    if prof_unificado:
                        prof = prof_unificado.upper()
                        if prof not in feedbacks_por_profissional:
                            feedbacks_por_profissional[prof] = []
                        feedbacks_por_profissional[prof].append({
                            'ano': int(row.get('ano', 0)) if pd.notna(row.get('ano')) else 0,
                            'mes': int(row.get('mes', 0)) if pd.notna(row.get('mes')) else 0,
                            'data': row.get('data', ''),
                            'tipo': row.get('tipo', ''),
                            'oque_houve': row.get('oque_houve', ''),
                            'comentario': row.get('comentario', '')
                        })

        html_content = template.render(
            total_periodos=len(dados_salao['periodos']),
            feedbacks_por_profissional_json=json.dumps(feedbacks_por_profissional, default=str),
            total_profissionais=len(profissionais),
            total_faturamento_geral=total_faturamento_geral,
            total_clientes_geral=total_clientes_geral,
            ticket_medio_geral=ticket_medio_geral,
            taxa_retorno_media=taxa_retorno_media,
            crescimento_faturamento=crescimento_faturamento,
            crescimento_faturamento_class=crescimento_faturamento_class,
            crescimento_faturamento_icon=crescimento_faturamento_icon,
            crescimento_clientes=crescimento_clientes,
            crescimento_clientes_class=crescimento_clientes_class,
            crescimento_clientes_icon=crescimento_clientes_icon,
            crescimento_ticket=crescimento_ticket,
            crescimento_ticket_class=crescimento_ticket_class,
            crescimento_ticket_icon=crescimento_ticket_icon,
            crescimento_periodos=crescimento_periodos,
            periodos=dados_salao['periodos'],
            profissionais_lista=profissionais_lista,
            anos_salao=json.dumps(anos_salao),
            faturamento_anual_list=json.dumps(faturamento_anual_list),
            clientes_anual_list=json.dumps(clientes_anual_list),
            ticket_anual_list=json.dumps(ticket_anual_list),
            taxa_retorno_anual_list=json.dumps(taxa_retorno_anual_list),
            consolidado_anos=json.dumps(consolidado_anos),
            consolidado_faturamento_list=json.dumps(consolidado_faturamento_list),
            consolidado_profissionais_list=json.dumps(consolidado_profissionais_list),
            consolidado_servicos_list=json.dumps(consolidado_servicos_list),
            consolidado_produtos_list=json.dumps(consolidado_produtos_list),
            consolidado_faturamento={str(a): v for a, v in consolidado['faturamento_total_por_ano'].items()},
            consolidado_profissionais={str(a): v for a, v in consolidado['profissionais_por_ano'].items()},
            consolidado_servicos={str(a): v for a, v in consolidado['servicos_por_ano'].items()},
            consolidado_produtos={str(a): v for a, v in consolidado['produtos_por_ano'].items()},
            top_profissionais=top_profissionais,
            top_servicos=top_servicos,
            top_produtos=top_produtos,
            dados_salao_json=dados_salao_json,
            dados_consolidado_json=dados_consolidado_json,
            periodos_json=periodos_json,
            # NOVAS VARIÁVEIS DE FEEDBACK
            total_feedbacks=total_feedbacks,
            total_profissionais_feedback=total_profissionais_feedback,
            total_positivos=total_positivos,
            total_negativos=total_negativos,
            feedbacks_por_profissional=feedbacks_por_profissional
        )

        # Salvar arquivo
        if not os.path.exists(PASTA_RELATORIOS):
            os.makedirs(PASTA_RELATORIOS)

        filename = f"{PASTA_RELATORIOS}/NODRI_RELATORIO_COMPLETO_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(html_content)

        return filename


class GeradorDashboardProfissionalMulti:
    """Gera dashboard profissional com seleção de múltiplos profissionais e períodos"""

    def __init__(self, base_dados, gerenciador_profissionais=None):
        self.base_dados = base_dados
        self.sistema_coleta = SistemaColetaNodri()
        self.gerenciador_profissionais = gerenciador_profissionais
        self.meses_pt = {
            1: "JAN", 2: "FEV", 3: "MAR", 4: "ABR",
            5: "MAI", 6: "JUN", 7: "JUL", 8: "AGO",
            9: "SET", 10: "OUT", 11: "NOV", 12: "DEZ"
        }

    def calcular_taxa_crescimento(self, valor_atual, valor_anterior):
        """Calcula taxa de crescimento entre dois valores"""
        if valor_anterior and valor_anterior > 0:
            return ((valor_atual - valor_anterior) / valor_anterior) * 100
        return 0

    def gerar_dashboard_completo(self, profissionais_selecionados=None, periodos_selecionados=None):
        """
        Gera dashboard completo com:
        - Seleção de anos múltiplos
        - Seleção de meses múltiplos
        - Comparação entre períodos
        - Cards com período atual vs anterior
        - Valores visíveis nas barras dos gráficos
        - Gráficos empilhados de 2 em 2
        """

        # ===== 1. CARREGAR APENAS OS DADOS NECESSÁRIOS =====
        df_pagamentos = self.base_dados.df_geral.get('PROF_PAGAMENTOS', pd.DataFrame())
        df_ticket = self.base_dados.df_geral.get('PROF_TICKET', pd.DataFrame())
        df_preferencia = self.base_dados.df_geral.get('PROF_PREFERENCIA', pd.DataFrame())
        df_ocupacao = self.base_dados.df_geral.get('PROF_OCUPACAO', pd.DataFrame())
        df_servicos = self.base_dados.df_geral.get('PROF_SERVICOS', pd.DataFrame())
        df_produtos = self.base_dados.df_geral.get('PROF_PRODUTOS', pd.DataFrame())
        df_periodos = self.base_dados.df_geral.get('PERIODOS', pd.DataFrame())
        df_feedback = self.base_dados.df_geral.get('FEEDBACK', pd.DataFrame())

        # ===== UNIFICAR NOMES DOS PROFISSIONAIS =====
        print("\n" + "=" * 80)
        print("🔗 UNIFICANDO NOMES DOS PROFISSIONAIS EM TODAS AS ABAS")
        print("=" * 80)

        if self.gerenciador_profissionais is None:
            from difflib import SequenceMatcher
            print("⚠️ Gerenciador de profissionais não fornecido, usando unificação básica")

            todos_nomes = set()
            for df in [df_pagamentos, df_ticket, df_preferencia, df_ocupacao, df_servicos, df_produtos]:
                if not df.empty and 'profissional' in df.columns:
                    todos_nomes.update(df['profissional'].dropna().unique())

            def unificar_nome_simples(nome):
                if not nome or pd.isna(nome):
                    return nome
                nome = str(nome).strip().upper()
                return ' '.join(nome.split())

            unificar_func = unificar_nome_simples
        else:
            print(
                f"✅ Usando gerenciador de profissionais com {len(self.gerenciador_profissionais.profissionais)} cadastrados")
            unificar_func = self.gerenciador_profissionais.unificar_nome

        def unificar_df(df, nome_df):
            if df.empty or 'profissional' not in df.columns:
                return df
            df = df.copy()
            antes = df['profissional'].nunique()
            df['profissional'] = df['profissional'].apply(lambda x: unificar_func(str(x)) if pd.notna(x) else x)
            depois = df['profissional'].nunique()
            print(f"📊 {nome_df}: {antes} nomes únicos → {depois} nomes únicos")
            return df

        if not df_pagamentos.empty:
            df_pagamentos = unificar_df(df_pagamentos, "Pagamentos (0123)")
        if not df_ticket.empty:
            df_ticket = unificar_df(df_ticket, "Ticket (0021)")
        if not df_preferencia.empty:
            df_preferencia = unificar_df(df_preferencia, "Preferência (0326)")
        if not df_ocupacao.empty:
            df_ocupacao = unificar_df(df_ocupacao, "Ocupação (0126)")
        if not df_servicos.empty:
            df_servicos = unificar_df(df_servicos, "Serviços (0031)")
        if not df_produtos.empty:
            df_produtos = unificar_df(df_produtos, "Produtos (0041)")

        print("=" * 80 + "\n")

        # ===== COLETAR TODOS OS PROFISSIONAIS ÚNICOS =====
        profissionais_set = set()
        for df in [df_pagamentos, df_ticket, df_preferencia, df_ocupacao, df_servicos, df_produtos]:
            if not df.empty and 'profissional' in df.columns:
                profissionais_set.update(df['profissional'].dropna().unique())

        todos_profissionais = sorted([
            p for p in profissionais_set
            if p and str(p).lower() not in ['nan', 'none', '']
        ])

        # ===== COLETAR TODOS OS ANOS =====
        anos_set = set()
        for df in [df_pagamentos, df_ticket, df_preferencia, df_ocupacao, df_servicos, df_produtos, df_periodos]:
            if not df.empty and 'ano' in df.columns:
                anos_set.update(df['ano'].dropna().unique())

        todos_anos = sorted([int(a) for a in anos_set if pd.notna(a)], reverse=True)

        # ===== ESTRUTURAR DADOS =====
        from collections import defaultdict
        dados_profissionais = defaultdict(lambda: defaultdict(dict))

        def criar_periodo_base(ano, mes):
            return {
                'ano': ano,
                'mes': mes,
                'periodo': f"{self.meses_pt[mes]}/{ano}",
                'faturamento': 0,
                'desconto': 0,
                'ticket_medio': 0,
                'clientes_preferencia': 0,
                'clientes_sem_preferencia': 0,
                'dias_trabalhados': 0,
                'taxa_ocupacao': 0.0,
                'servicos': [],
                'servicos_detalhados': {},
                'total_produtos': 0,
                'servicos_qtd': 0,
                'servicos_valor': 0
            }

        # PROCESSAR PAGAMENTOS
        if not df_pagamentos.empty:
            for _, row in df_pagamentos.iterrows():
                prof = str(row['profissional']).strip().upper()
                ano = int(row['ano']) if pd.notna(row['ano']) else 0
                mes = int(row['mes']) if pd.notna(row['mes']) else 0
                key = f"{ano}_{mes}"
                if key not in dados_profissionais[prof]:
                    dados_profissionais[prof][key] = criar_periodo_base(ano, mes)

                valor = float(row.get('valor_a_pagar', 0))
                desconto = float(row.get('desconto', 0))

                # SOMA DOS DOIS VALORES
                faturamento_total = valor + desconto

                dados_profissionais[prof][key]['faturamento'] += faturamento_total
                dados_profissionais[prof][key]['desconto'] += desconto

        # PROCESSAR TICKET
        if not df_ticket.empty:
            for _, row in df_ticket.iterrows():
                prof = str(row['profissional']).strip().upper()
                ano = int(row['ano']) if pd.notna(row['ano']) else 0
                mes = int(row['mes']) if pd.notna(row['mes']) else 0
                key = f"{ano}_{mes}"
                if key in dados_profissionais[prof]:
                    dados_profissionais[prof][key]['ticket_medio'] = float(row.get('ticket_medio', 0))

        # PROCESSAR PREFERÊNCIA
        if not df_preferencia.empty:
            for _, row in df_preferencia.iterrows():
                prof = str(row['profissional']).strip().upper()
                ano = int(row['ano']) if pd.notna(row['ano']) else 0
                mes = int(row['mes']) if pd.notna(row['mes']) else 0
                key = f"{ano}_{mes}"
                if key not in dados_profissionais[prof]:
                    dados_profissionais[prof][key] = criar_periodo_base(ano, mes)
                dados_profissionais[prof][key]['clientes_preferencia'] = int(row.get('clientes_preferencia', 0))
                dados_profissionais[prof][key]['clientes_sem_preferencia'] = int(row.get('clientes_sem_preferencia', 0))

        # PROCESSAR OCUPAÇÃO
        if not df_ocupacao.empty:
            for _, row in df_ocupacao.iterrows():
                prof = str(row['profissional']).strip().upper()
                ano = int(row['ano']) if pd.notna(row['ano']) else 0
                mes = int(row['mes']) if pd.notna(row['mes']) else 0
                key = f"{ano}_{mes}"
                if key not in dados_profissionais[prof]:
                    dados_profissionais[prof][key] = criar_periodo_base(ano, mes)
                dados_profissionais[prof][key]['dias_trabalhados'] = int(row.get('dias_trabalhados', 0))
                dados_profissionais[prof][key]['taxa_ocupacao'] = float(row.get('taxa_ocupacao', 0.0))

        # PROCESSAR SERVIÇOS
        if not df_servicos.empty:
            for _, row in df_servicos.iterrows():
                prof = str(row['profissional']).strip().upper()
                ano = int(row['ano']) if pd.notna(row['ano']) else 0
                mes = int(row['mes']) if pd.notna(row['mes']) else 0
                key = f"{ano}_{mes}"
                servico = row['servico']
                quantidade = int(row.get('quantidade', 0))
                valor = float(row.get('valor', 0))

                if key not in dados_profissionais[prof]:
                    dados_profissionais[prof][key] = criar_periodo_base(ano, mes)

                if key in dados_profissionais[prof]:
                    dados_profissionais[prof][key]['servicos'].append({
                        'servico': servico,
                        'quantidade': quantidade,
                        'valor': valor
                    })
                    if servico not in dados_profissionais[prof][key]['servicos_detalhados']:
                        dados_profissionais[prof][key]['servicos_detalhados'][servico] = {'quantidade': 0, 'valor': 0}
                    dados_profissionais[prof][key]['servicos_detalhados'][servico]['quantidade'] += quantidade
                    dados_profissionais[prof][key]['servicos_detalhados'][servico]['valor'] += valor
                    dados_profissionais[prof][key]['servicos_qtd'] += quantidade
                    dados_profissionais[prof][key]['servicos_valor'] += valor

        # PROCESSAR PRODUTOS
        if not df_produtos.empty:
            for _, row in df_produtos.iterrows():
                prof = str(row['profissional']).strip().upper()
                ano = int(row['ano']) if pd.notna(row['ano']) else 0
                mes = int(row['mes']) if pd.notna(row['mes']) else 0
                key = f"{ano}_{mes}"
                if key not in dados_profissionais[prof]:
                    dados_profissionais[prof][key] = criar_periodo_base(ano, mes)
                if key in dados_profissionais[prof]:
                    dados_profissionais[prof][key]['total_produtos'] += int(row.get('quantidade', 0))

        dados_profissionais_dict = {}
        for prof, periodos in dados_profissionais.items():
            dados_profissionais_dict[prof] = dict(periodos)

        # ===== PREPARAR DADOS PARA O TEMPLATE =====
        meses_nomes = [self.meses_pt[m] for m in range(1, 13)]

        if not profissionais_selecionados:
            profissionais_selecionados = todos_profissionais

        profissionais_com_categoria = []
        for p in todos_profissionais:
            if self.gerenciador_profissionais:
                categoria = self.gerenciador_profissionais.get_categoria_profissional(p)
            else:
                categoria = "Não Definida"
            profissionais_com_categoria.append({'nome': p, 'categoria': categoria})

        # Feedbacks desativados nesta versão (sem aba FEEDBACK)
        feedbacks_por_profissional = {}

        # Atualizar o JSON com categoria
        profissionais_disponiveis_json = json.dumps(profissionais_com_categoria)

        # Template HTML MELHORADO COM VALORES VISÍVEIS NOS GRÁFICOS E GRÁFICOS EMPILHADOS DE 2 EM 2
        html_template = """<!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
        <title>NODRI - DASHBOARD PROFISSIONAL COMPLETO</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
            :root {
                --primary: #1e3c72;
                --secondary: #2a5298;
                --success: #28a745;
                --warning: #ffc107;
                --danger: #dc3545;
                --info: #17a2b8;
                --light: #f8f9fa;
                --dark: #343a40;
                --purple: #6f42c1;
            }

            * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }
            /* ===== ESTILOS DO MODAL ===== */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    z-index: 9999;
    display: flex;
    justify-content: center;
    align-items: center;
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s ease;
}
.modal-overlay.active {
    opacity: 1;
    visibility: visible;
}
.modal-container {
    background: white;
    border-radius: 20px;
    width: 90%;
    max-width: 1000px;
    max-height: 95vh;
    overflow: hidden;
    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
    transform: scale(0.9);
    transition: transform 0.3s ease, width 0.3s ease, height 0.3s ease;
    display: flex;
    flex-direction: column;
}
.modal-overlay.active .modal-container {
    transform: scale(1);
}
.modal-header {
    background: linear-gradient(135deg, #0f3460 0%, #1a1a2e 100%);
    color: white;
    padding: 15px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
}
.modal-header h3 {
    margin: 0;
    font-size: 1.2rem;
}
.modal-close, .modal-maximizar {
    background: none;
    border: none;
    color: white;
    font-size: 1.3rem;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    justify-content: center;
}
.modal-close:hover, .modal-maximizar:hover {
    background: rgba(255,255,255,0.2);
}
.modal-close:hover {
    transform: rotate(90deg);
}
.modal-body {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
    max-height: 95vh; 
}

/* Ranking List */
.ranking-list {
    max-height: 500px;
    overflow-y: auto;
}
.ranking-item {
    transition: all 0.2s;
}
.ranking-item:hover {
    background: #f5f5f5;
}
.ranking-position {
    font-weight: bold;
    color: #0f3460;
}
.ranking-name {
    font-weight: 500;
}
.ranking-value {
    font-family: 'Courier New', monospace;
}
.ranking-value.faturamento { color: #1e3c72; }
.ranking-value.ticket { color: #28a745; }
.ranking-value.preferencia { color: #6f42c1; }
.ranking-value.semPref { color: #e83e8c; }
.ranking-value.dias { color: #fd7e14; }
.ranking-value.ocupacao { color: #ffc107; }
.ranking-value.servicos { color: #17a2b8; }
.ranking-value.produtos { color: #dc3545; }

/* Scrollbar personalizada */
.ranking-list::-webkit-scrollbar,
#rankingList::-webkit-scrollbar,
#metasList::-webkit-scrollbar {
    width: 6px;
}
.ranking-list::-webkit-scrollbar-track,
#rankingList::-webkit-scrollbar-track,
#metasList::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
}
.ranking-list::-webkit-scrollbar-thumb,
#rankingList::-webkit-scrollbar-thumb,
#metasList::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 3px;
}
.ranking-list::-webkit-scrollbar-thumb:hover,
#rankingList::-webkit-scrollbar-thumb:hover,
#metasList::-webkit-scrollbar-thumb:hover {
    background: #555;
}
            /* MODAL STYLES - ADICIONE AQUI */
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.7);
                z-index: 9999;
                display: flex;
                justify-content: center;
                align-items: center;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            }
            .modal-overlay.active {
                opacity: 1;
                visibility: visible;
            }
            .modal-container {
                background: white;
                border-radius: 20px;
                width: 95%;
                max-width: 1200px;
                max-height: 90vh;
                overflow: hidden;
                box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                transform: scale(0.9);
                transition: transform 0.3s ease;
            }
            .modal-overlay.active .modal-container {
                transform: scale(1);
            }
            .modal-header {
                background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
                color: white;
                padding: 15px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .modal-header h3 {
                margin: 0;
                font-size: 1.2rem;
            }
            .modal-close {
                background: none;
                border: none;
                color: white;
                font-size: 1.5rem;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                transition: all 0.3s;
            }
            .modal-close:hover {
                background: rgba(255,255,255,0.2);
                transform: rotate(90deg);
            }
            .modal-body {
                padding: 20px;
                max-height: 60vh;
                overflow-y: auto;
                max-height: 95vh; 
                
            }
            .ranking-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 15px;
                border-bottom: 1px solid #e0e0e0;
                transition: all 0.2s;
            }
            .ranking-item:hover {
                background: #f5f5f5;
            }
            .ranking-position {
                font-weight: bold;
                color: var(--primary);
                width: 40px;
            }
            .ranking-name {
                flex: 1;
                font-weight: 500;
            }
            .ranking-value {
                font-weight: bold;
                font-family: 'Courier New', monospace;
            }
            .ranking-value.faturamento { color: #1e3c72; }
            .ranking-value.ticket { color: #28a745; }
            .ranking-value.preferencia { color: #6f42c1; }
            .ranking-value.semPref { color: #e83e8c; }
            .ranking-value.dias { color: #fd7e14; }
            .ranking-value.ocupacao { color: #ffc107; }
            .ranking-value.servicos { color: #17a2b8; }
            .ranking-value.produtos { color: #dc3545; }
            .ranking-empty {
                text-align: center;
                padding: 30px;
                color: #999;
            }
            .metric-card {
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
            }
            .metric-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 10px 25px rgba(0,0,0,0.15);
            }
            .metric-card .metric-header {
                cursor: pointer;
            }

            body {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                padding: 10px;
                min-height: 100vh;
            }

            .dashboard-container {
                max-width: 1400px;
                margin: 0 auto;
                width: 100%;
            }

            /* HEADER */
            .main-header {
                background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
                color: white;
                padding: 15px;
                border-radius: 12px;
                margin-bottom: 15px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            }

            .main-header h1 {
                font-size: 1.4rem;
                font-weight: 700;
                margin-bottom: 5px;
                line-height: 1.2;
            }

            .main-header .subtitle {
                font-size: 0.85rem;
                opacity: 0.9;
            }

            /* SEÇÃO DE CONTROLE */
            .control-section {
                background: white;
                border-radius: 12px;
                padding: 12px;
                margin-bottom: 15px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            }

            .control-title {
                font-size: 1rem;
                font-weight: 600;
                color: var(--primary);
                margin-bottom: 10px;
                border-bottom: 2px solid var(--primary);
                padding-bottom: 5px;
            }

            /* BUSCA DE PROFISSIONAL */
            .search-profissional {
                margin-bottom: 12px;
            }

            .search-label {
                font-weight: 600;
                color: var(--primary);
                margin-bottom: 3px;
                font-size: 0.8rem;
            }

            .search-input-group {
                display: flex;
                gap: 8px;
                flex-direction: column;
            }

            .search-input-group input {
                width: 100%;
                padding: 8px 10px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 0.85rem;
                height: 38px;
            }

            .search-input-group select {
                width: 100%;
                padding: 8px 10px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 0.85rem;
                height: auto;
                min-height: 80px;
            }

            /* SELEÇÃO DE ANOS E MESES */
            .selection-grid {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                margin-bottom: 12px;
            }

            .selection-item {
                background: var(--light);
                padding: 5px 10px;
                border-radius: 16px;
                border: 1px solid transparent;
                transition: all 0.3s;
                cursor: pointer;
                font-size: 0.8rem;
                display: inline-flex;
                align-items: center;
            }

            .selection-item:hover {
                border-color: var(--primary);
                transform: translateY(-1px);
            }

            .selection-item.selected {
                background: var(--primary);
                color: white;
            }

            .selection-item input {
                margin-right: 4px;
                transform: scale(0.8);
            }

            /* SEÇÃO DE COMPARAÇÃO DE PERÍODOS */
            .comparison-section {
                background: #f0f4f8;
                border-radius: 10px;
                padding: 12px;
                margin-bottom: 15px;
                border-left: 4px solid var(--primary);
            }

            .comparison-title {
                font-weight: 600;
                color: var(--primary);
                margin-bottom: 10px;
                font-size: 0.9rem;
            }

            .periodos-row {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
                margin-bottom: 10px;
                flex-direction: column;
            }

            .periodo-box {
                flex: 1;
                min-width: 100%;
                background: white;
                padding: 10px;
                border-radius: 8px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.05);
            }

            .periodo-box label {
                font-weight: 600;
                color: var(--primary);
                font-size: 0.75rem;
                margin-bottom: 5px;
                display: block;
            }

            .periodo-selects {
                display: flex;
                gap: 5px;
                align-items: center;
                flex-wrap: wrap;
            }

            .periodo-selects select {
                flex: 1;
                padding: 5px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 0.75rem;
                min-width: 0;
            }

            .periodo-selects span {
                color: #666;
                font-size: 0.75rem;
            }

            /* BOTÕES */
            .action-buttons {
                display: flex;
                gap: 8px;
                margin-top: 10px;
                flex-wrap: wrap;
            }

            .btn-action {
                padding: 8px 12px;
                border: none;
                border-radius: 6px;
                font-weight: 600;
                font-size: 0.85rem;
                cursor: pointer;
                transition: all 0.3s;
                height: 38px;
                flex: 1;
                min-width: 100px;
            }

            .btn-action.primary {
                background: var(--primary);
                color: white;
            }

            .btn-action.primary:hover {
                background: var(--secondary);
                transform: translateY(-2px);
            }

            .btn-action.success {
                background: var(--success);
                color: white;
            }

            .btn-action.info {
                background: var(--info);
                color: white;
            }

            .btn-action.warning {
                background: var(--warning);
                color: black;
            }

            .btn-action.warning:hover {
                background: #e0a800;
                transform: translateY(-2px);
            }

            /* CARDS DE MÉTRICAS */
            .metrics-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 8px;
                margin-bottom: 15px;
            }

            .metric-card {
                background: white;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 3px 8px rgba(0,0,0,0.1);
                transition: all 0.3s;
            }

            .metric-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(0,0,0,0.15);
            }

            .metric-header {
                background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
                color: white;
                padding: 6px 8px;
                font-weight: 600;
                font-size: 0.75rem;
                text-align: center;
            }

            .metric-body {
                padding: 8px;
            }

            .period-comparison {
                display: flex;
                justify-content: space-between;
                margin-bottom: 6px;
                padding-bottom: 4px;
                border-bottom: 1px solid #eee;
                gap: 5px;
            }

            .period-box {
                text-align: center;
                flex: 1;
            }

            .period-label {
                font-size: 0.55rem;
                color: #666;
                text-transform: uppercase;
            }

            .period-value {
                font-size: 0.8rem;
                font-weight: 700;
                color: var(--primary);
                word-break: break-word;
            }

            .growth-box {
                text-align: center;
                padding: 4px;
                background: #f8f9fa;
                border-radius: 6px;
            }

            .growth-value {
                font-size: 0.8rem;
                font-weight: 700;
            }

            .growth-positive { color: #28a745; }
            .growth-negative { color: #dc3545; }
            .growth-neutral { color: #ffc107; }

            .growth-label {
                font-size: 0.55rem;
                color: #666;
            }

            /* GRÁFICOS */
            .chart-row {
                display: grid;
                grid-template-columns: 1fr;
                gap: 15px;
                margin-bottom: 15px;
            }

            .chart-card {
                background: white;
                border-radius: 12px;
                padding: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                transition: all 0.3s;
                width: 100%;
            }

            .chart-card:hover {
                transform: translateY(-3px);
                box-shadow: 0 8px 20px rgba(0,0,0,0.15);
            }

            .chart-title {
                font-size: 0.9rem;
                font-weight: 600;
                color: var(--primary);
                margin-bottom: 10px;
                border-bottom: 2px solid var(--primary);
                padding-bottom: 5px;
                text-align: center;
            }

            .chart-container {
                height: 200px;
                position: relative;
                width: 100%;
            }

            /* CARD DE FIDELIZAÇÃO */
            .fidelizacao-card {
                background: white;
                border-radius: 12px;
                padding: 12px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                border-left: 5px solid var(--primary);
                margin: 15px 0;
            }

            .fidelizacao-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
                flex-wrap: wrap;
                gap: 8px;
            }

            .fidelizacao-header h3 {
                margin: 0;
                color: var(--primary);
                font-weight: 700;
                font-size: 1rem;
            }

            .fidelizacao-tom {
                background: #28a745;
                color: white;
                padding: 3px 10px;
                border-radius: 16px;
                font-weight: 600;
                font-size: 0.75rem;
                white-space: nowrap;
            }

            .fidelizacao-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 8px;
                margin-bottom: 12px;
            }

            .fidelizacao-item {
                text-align: center;
            }

            .fidelizacao-numero {
                font-size: 1.2rem;
                font-weight: 700;
                color: var(--primary);
                line-height: 1.2;
            }

            .fidelizacao-label {
                color: #666;
                font-size: 0.6rem;
                text-transform: uppercase;
            }

            .fidelizacao-detalhe {
                font-size: 0.55rem;
                color: #999;
            }

            .fidelizacao-barras {
                background: #f8f9fa;
                padding: 10px;
                border-radius: 8px;
                margin-bottom: 10px;
            }

            .barra-container {
                flex: 1;
                min-width: 100%;
                margin-bottom: 8px;
            }

            .barra-label {
                font-size: 0.7rem;
                color: #666;
                margin-bottom: 2px;
                display: flex;
                justify-content: space-between;
            }

            .barra {
                height: 6px;
                background: #e0e0e0;
                border-radius: 3px;
                overflow: hidden;
            }

            .barra-fill {
                height: 100%;
                border-radius: 3px;
            }

            .barra-fill.success { background: #28a745; }
            .barra-fill.danger { background: #dc3545; }

            .barra-valor {
                font-size: 0.65rem;
                font-weight: 600;
                text-align: right;
            }

            .fidelizacao-analise {
                margin-top: 10px;
            }

            .analise-item {
                padding: 5px;
                background: white;
                border-radius: 5px;
                margin-bottom: 4px;
                font-size: 0.7rem;
                border-left: 3px solid var(--primary);
            }

            .analise-acoes {
                padding: 5px;
                border-radius: 5px;
                font-weight: bold;
                font-size: 0.7rem;
                margin-top: 5px;
            }

            /* TABELAS */
            .table-responsive {
                overflow-x: auto;
                margin-top: 10px;
                -webkit-overflow-scrolling: touch;
            }

            table {
                width: 100%;
                border-collapse: collapse;
                font-size: 0.7rem;
                min-width: 600px;
            }

            th {
                background: var(--primary);
                color: white;
                padding: 6px;
                font-size: 0.65rem;
                white-space: nowrap;
            }

            td {
                padding: 5px;
                border-bottom: 1px solid #eee;
                text-align: center;
            }

            .badge {
                padding: 2px 5px;
                border-radius: 10px;
                font-size: 0.6rem;
                font-weight: 600;
                display: inline-block;
            }

            .badge-success { background: #d4edda; color: #155724; }
            .badge-danger { background: #f8d7da; color: #721c24; }
            .badge-warning { background: #fff3cd; color: #856404; }
            .badge-info { background: #d1ecf1; color: #0c5460; }

            /* Responsividade */
            @media (max-width: 768px) {
                .main-header h1 {
                    font-size: 1.2rem;
                }

                .main-header .subtitle {
                    font-size: 0.75rem;
                }

                .metrics-grid {
                    grid-template-columns: repeat(2, 1fr);
                }

                .fidelizacao-grid {
                    grid-template-columns: repeat(2, 1fr);
                    gap: 10px;
                }

                .fidelizacao-item:nth-child(3),
                .fidelizacao-item:nth-child(4) {
                    grid-column: span 1;
                }

                .chart-container {
                    height: 180px;
                }
            }

            @media (max-width: 480px) {
                .fidelizacao-grid {
                    grid-template-columns: 1fr 1fr;
                }

                .fidelizacao-numero {
                    font-size: 1rem;
                }

                .metric-header {
                    font-size: 0.7rem;
                    padding: 4px;
                }

                .period-value {
                    font-size: 0.7rem;
                }

                .btn-action {
                    font-size: 0.75rem;
                    padding: 6px 8px;
                    height: 34px;
                }
            }

            /* Ajustes para touch */
            @media (hover: none) {
                .stat-card:hover,
                .professional-card:hover,
                .filter-tag:hover,
                .section-tab:hover,
                .apply-btn:hover,
                .search-box button:hover {
                    transform: none;
                }
            }

            /* Garantir que os gráficos sejam responsivos */
            canvas {
                max-width: 100%;
                height: auto !important;
            }
        </style>
    </head>
    <body>
        <div class="dashboard-container">
            <!-- HEADER -->
            <div class="main-header">
                <h1><i class="fas fa-chart-line"></i> RELATÓRIO PROFISSIONAL</h1>
                <div class="subtitle">
                    <i class="fas fa-users"></i> {{ total_profissionais }} profissionais |
                    <i class="fas fa-calendar"></i> Selecione os períodos
                </div>
            </div>

            <!-- SEÇÃO DE CONTROLE -->
            <div class="control-section">
                <div class="control-title">
                    <i class="fas fa-sliders-h"></i> SELECIONE PROFISSIONAL, ANOS E MESES
                </div>

                <!-- BUSCA DE PROFISSIONAL -->
                <div class="search-profissional">
                    <div class="search-label"><i class="fas fa-user"></i> PROFISSIONAL:</div>
                    <div class="search-input-group">
                        <input type="text" id="searchProfissionalInput" placeholder="Digite para buscar..." autocomplete="off">
                        <select id="selectProfissional" size="3">
                            {% for prof in profissionais_disponiveis %}
                            <option value="{{ prof.nome }}">{{ prof.nome }}</option>
                            {% endfor %}
                        </select>
                    </div>
                </div>

                <!-- SELEÇÃO DE ANOS -->
                <div style="margin-bottom: 10px;">
                    <div class="search-label"><i class="fas fa-calendar"></i> ANOS:</div>
                    <div class="selection-grid" id="anosGrid">
                        {% for ano in anos_disponiveis %}
                        <div class="selection-item {% if ano == 2025 or ano == 2024 %}selected{% endif %}" onclick="toggleAno(this, {{ ano }})">
                            <input type="checkbox" class="ano-checkbox" value="{{ ano }}" {% if ano == 2025 or ano == 2024 %}checked{% endif %}>
                            {{ ano }}
                        </div>
                        {% endfor %}
                    </div>
                </div>

                <!-- SELEÇÃO DE MESES -->
                <div style="margin-bottom: 10px;">
                    <div class="search-label"><i class="fas fa-calendar-alt"></i> MESES:</div>
                    <div class="selection-grid" id="mesesGrid">
                        {% for mes in meses_disponiveis %}
                        <div class="selection-item {% if loop.index <= 6 %}selected{% endif %}" onclick="toggleMes(this, {{ loop.index }})">
                            <input type="checkbox" class="mes-checkbox" value="{{ loop.index }}" {% if loop.index <= 6 %}checked{% endif %}>
                            {{ mes }}
                        </div>
                        {% endfor %}
                    </div>
                </div>

                <!-- BOTÃO DE COMPARAÇÃO DE PERÍODOS (MESMO ANO) -->
                <div style="margin-bottom: 10px;">
                    <button class="btn-action warning" onclick="ativarComparacaoPeriodos()" id="btnComparar" style="width: 100%;">
                        <i class="fas fa-balance-scale"></i> COMPARAR PERÍODOS
                    </button>
                </div>

                <!-- SELEÇÃO DE PERÍODOS PARA COMPARAÇÃO (INICIALMENTE OCULTO) -->
                <div id="comparacaoPeriodos" style="display: none;" class="comparison-section">
                    <div class="comparison-title">
                        <i class="fas fa-clock"></i> DEFINIR PERÍODOS
                    </div>

                    <div class="periodos-row">
                        <div class="periodo-box">
                            <label>PRIMEIRO PERÍODO</label>
                            <div class="periodo-selects">
                                <select id="periodo1Inicio" class="form-select">
                                    <option value="1">Jan</option>
                                    <option value="2">Fev</option>
                                    <option value="3">Mar</option>
                                    <option value="4">Abr</option>
                                    <option value="5">Mai</option>
                                    <option value="6">Jun</option>
                                    <option value="7">Jul</option>
                                    <option value="8">Ago</option>
                                    <option value="9">Set</option>
                                    <option value="10">Out</option>
                                    <option value="11">Nov</option>
                                    <option value="12">Dez</option>
                                </select>
                                <span>até</span>
                                <select id="periodo1Fim" class="form-select">
                                    <option value="1">Jan</option>
                                    <option value="2">Fev</option>
                                    <option value="3">Mar</option>
                                    <option value="4">Abr</option>
                                    <option value="5">Mai</option>
                                    <option value="6">Jun</option>
                                    <option value="7">Jul</option>
                                    <option value="8">Ago</option>
                                    <option value="9">Set</option>
                                    <option value="10">Out</option>
                                    <option value="11">Nov</option>
                                    <option value="12">Dez</option>
                                </select>
                            </div>
                        </div>

                        <div class="periodo-box">
                            <label>SEGUNDO PERÍODO</label>
                            <div class="periodo-selects">
                                <select id="periodo2Inicio" class="form-select">
                                    <option value="7">Jul</option>
                                    <option value="1">Jan</option>
                                    <option value="2">Fev</option>
                                    <option value="3">Mar</option>
                                    <option value="4">Abr</option>
                                    <option value="5">Mai</option>
                                    <option value="6">Jun</option>
                                    <option value="8">Ago</option>
                                    <option value="9">Set</option>
                                    <option value="10">Out</option>
                                    <option value="11">Nov</option>
                                    <option value="12">Dez</option>
                                </select>
                                <span>até</span>
                                <select id="periodo2Fim" class="form-select">
                                    <option value="12">Dez</option>
                                    <option value="1">Jan</option>
                                    <option value="2">Fev</option>
                                    <option value="3">Mar</option>
                                    <option value="4">Abr</option>
                                    <option value="5">Mai</option>
                                    <option value="6">Jun</option>
                                    <option value="7">Jul</option>
                                    <option value="8">Ago</option>
                                    <option value="9">Set</option>
                                    <option value="10">Out</option>
                                    <option value="11">Nov</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="text-center">
                        <button class="btn-action info" onclick="aplicarComparacaoPeriodos()" style="width: 100%;">
                            <i class="fas fa-check"></i> APLICAR
                        </button>
                    </div>
                </div>

                <!-- BOTÕES DE AÇÃO -->
                <div class="action-buttons">
                    <button class="btn-action primary" onclick="aplicarFiltros()">
                        <i class="fas fa-sync-alt"></i> APLICAR
                    </button>
                    <button class="btn-action info" onclick="selecionarTodosMeses()">
                        <i class="fas fa-check-double"></i> TODOS MESES
                    </button>
                    <button class="btn-action info" onclick="selecionarTodosAnos()">
                        <i class="fas fa-check-double"></i> TODOS ANOS
                    </button>
                </div>
            </div>

            <!-- CONTEÚDO PRINCIPAL -->
            <div id="conteudoDinamico">
                <!-- O conteúdo será inserido aqui via JavaScript -->
            </div>
        </div>

        <script>
            // Dados de feedback (importados da planilha)
            const feedbacksPorProfissional = {{ feedbacks_por_profissional_json|safe }};
            const dadosProfissionais = {{ dados_profissionais_json|safe }};
            const profissionaisDisponiveis = {{ profissionais_disponiveis_json|safe }};
            const anosDisponiveis = {{ anos_disponiveis|safe }};
            const mesesDisponiveis = {{ meses_disponiveis|safe }};

            let profissionalSelecionado = profissionaisDisponiveis.length > 0 ? profissionaisDisponiveis[0].nome : "";
            let anosSelecionados = [2025, 2024];
            let mesesSelecionados = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ,11 ,12];
            let modoComparacaoAtivo = false;
            let periodo1 = { inicio: 1, fim: 6 };
            let periodo2 = { inicio: 7, fim: 12 };

            function filtrarProfissionais() {
                const busca = document.getElementById('searchProfissionalInput').value.toLowerCase();
                const select = document.getElementById('selectProfissional');
                for (let i = 0; i < select.options.length; i++) {
                    select.options[i].style.display = select.options[i].value.toLowerCase().includes(busca) ? '' : 'none';
                }
            }

            function toggleAno(element, ano) {
                const checkbox = element.querySelector('input');
                checkbox.checked = !checkbox.checked;
                element.classList.toggle('selected', checkbox.checked);
                coletarSelecoes();
            }

            function toggleMes(element, mes) {
                const checkbox = element.querySelector('input');
                checkbox.checked = !checkbox.checked;
                element.classList.toggle('selected', checkbox.checked);
                coletarSelecoes();
            }

            function selecionarTodosAnos() {
                document.querySelectorAll('.ano-checkbox').forEach(cb => {
                    cb.checked = true;
                    cb.closest('.selection-item').classList.add('selected');
                });
                coletarSelecoes();
            }

            function selecionarTodosMeses() {
                document.querySelectorAll('.mes-checkbox').forEach(cb => {
                    cb.checked = true;
                    cb.closest('.selection-item').classList.add('selected');
                });
                coletarSelecoes();
            }

            function coletarSelecoes() {
                const select = document.getElementById('selectProfissional');
                profissionalSelecionado = select.value;

                anosSelecionados = [];
                document.querySelectorAll('.ano-checkbox:checked').forEach(cb => {
                    anosSelecionados.push(parseInt(cb.value));
                });

                mesesSelecionados = [];
                document.querySelectorAll('.mes-checkbox:checked').forEach(cb => {
                    mesesSelecionados.push(parseInt(cb.value));
                });
            }

            function ativarComparacaoPeriodos() {
                const div = document.getElementById('comparacaoPeriodos');
                const btn = document.getElementById('btnComparar');

                if (div.style.display === 'none') {
                    div.style.display = 'block';
                    btn.innerHTML = '<i class="fas fa-times"></i> DESATIVAR COMPARAÇÃO';
                    modoComparacaoAtivo = true;
                } else {
                    div.style.display = 'none';
                    btn.innerHTML = '<i class="fas fa-balance-scale"></i> COMPARAR PERÍODOS';
                    modoComparacaoAtivo = false;
                    aplicarFiltros();
                }
            }

            function aplicarComparacaoPeriodos() {
                periodo1.inicio = parseInt(document.getElementById('periodo1Inicio').value);
                periodo1.fim = parseInt(document.getElementById('periodo1Fim').value);
                periodo2.inicio = parseInt(document.getElementById('periodo2Inicio').value);
                periodo2.fim = parseInt(document.getElementById('periodo2Fim').value);

                if (periodo1.inicio > periodo1.fim) {
                    alert('Período 1 inválido!');
                    return;
                }

                if (periodo2.inicio > periodo2.fim) {
                    alert('Período 2 inválido!');
                    return;
                }

                document.querySelectorAll('.mes-checkbox').forEach(cb => {
                    cb.checked = false;
                    cb.closest('.selection-item').classList.remove('selected');
                });

                const mesesSelecionadosSet = new Set();

                for (let mes = periodo1.inicio; mes <= periodo1.fim; mes++) {
                    mesesSelecionadosSet.add(mes);
                }

                for (let mes = periodo2.inicio; mes <= periodo2.fim; mes++) {
                    mesesSelecionadosSet.add(mes);
                }

                mesesSelecionadosSet.forEach(mes => {
                    const elemento = document.querySelector(`.mes-checkbox[value="${mes}"]`);
                    if (elemento) {
                        elemento.checked = true;
                        elemento.closest('.selection-item').classList.add('selected');
                    }
                });

                coletarSelecoes();
                aplicarFiltros();
            }

            function aplicarFiltros() {
                coletarSelecoes();

                if (!profissionalSelecionado) {
                    alert('Selecione um profissional!');
                    return;
                }

                if (anosSelecionados.length === 0) {
                    alert('Selecione pelo menos um ano!');
                    return;
                }

                if (mesesSelecionados.length === 0) {
                    alert('Selecione pelo menos um mês!');
                    return;
                }

                gerarConteudoProfissional(profissionalSelecionado, anosSelecionados, mesesSelecionados);
            }

            function gerarConteudoProfissional(profissional, anos, meses) {
    profissional = profissional.toUpperCase().trim();

    if (!dadosProfissionais[profissional]) {
        document.getElementById('conteudoDinamico').innerHTML = `
            <div class="alert alert-warning">Nenhum dado encontrado para ${profissional}</div>`;
        return;
    }

    const dados = dadosProfissionais[profissional];
    const periodosDados = [];

    for (const ano of anos) {
        for (const mes of meses) {
            const periodoId = `${ano}_${mes}`;
            if (dados[periodoId]) {
                periodosDados.push(dados[periodoId]);
            }
        }
    }

    periodosDados.sort((a, b) => {
        if (a.ano !== b.ano) return a.ano - b.ano;
        return a.mes - b.mes;
    });

    if (periodosDados.length === 0) {
        document.getElementById('conteudoDinamico').innerHTML = `
            <div class="alert alert-warning">Nenhum dado para os períodos selecionados</div>`;
        return;
    }

    // ===== LÓGICA PARA SEPARAR PERÍODOS =====
    let periodoAtual = [];
    let periodoAnterior = [];

    if (modoComparacaoAtivo && anos.length === 1) {
        periodoAnterior = periodosDados.filter(p => {
            return p.mes >= periodo1.inicio && p.mes <= periodo1.fim;
        });

        periodoAtual = periodosDados.filter(p => {
            return p.mes >= periodo2.inicio && p.mes <= periodo2.fim;
        });
    } else {
        const periodosPorAno = {};
        anos.forEach(ano => {
            periodosPorAno[ano] = periodosDados.filter(p => p.ano === ano);
        });

        const anosOrdenados = [...anos].sort((a, b) => a - b);
        const anoAtual = anosOrdenados[anosOrdenados.length - 1];
        const anoAnterior = anosOrdenados.length > 1 ? anosOrdenados[anosOrdenados.length - 2] : null;

        periodoAtual = periodosPorAno[anoAtual] || [];
        periodoAnterior = anoAnterior ? (periodosPorAno[anoAnterior] || []) : [];
    }

    function calcularTotais(periodos) {
        if (periodos.length === 0) return {
            faturamento: 0, ticket: 0, preferencia: 0, semPreferencia: 0,
            dias: 0, ocupacao: 0, servicos: 0, produtos: 0, countTicket: 0
        };

        let totalFaturamento = 0, totalTicket = 0, totalPreferencia = 0;
        let totalSemPreferencia = 0, totalDias = 0, totalOcupacao = 0;
        let totalServicos = 0, totalProdutos = 0, countTicket = 0;

        periodos.forEach(p => {
            totalFaturamento += parseFloat(p.faturamento) || 0;
            if (p.ticket_medio) { totalTicket += parseFloat(p.ticket_medio); countTicket++; }
            totalPreferencia += parseInt(p.clientes_preferencia) || 0;
            totalSemPreferencia += parseInt(p.clientes_sem_preferencia) || 0;
            totalDias += parseInt(p.dias_trabalhados) || 0;
            totalOcupacao += parseFloat(p.taxa_ocupacao) || 0;
            totalServicos += parseInt(p.servicos_qtd) || 0;
            totalProdutos += parseInt(p.total_produtos) || 0;
        });

        return {
            faturamento: totalFaturamento,
            ticket: countTicket > 0 ? totalTicket / countTicket : 0,
            preferencia: totalPreferencia,
            semPreferencia: totalSemPreferencia,
            dias: periodos.length > 0 ? totalDias / periodos.length : 0,
            ocupacao: periodos.length > 0 ? totalOcupacao / periodos.length : 0,
            servicos: totalServicos,
            produtos: totalProdutos
        };
    }

    const totaisAtual = calcularTotais(periodoAtual);
    const totaisAnterior = calcularTotais(periodoAnterior);

    // ===== CÁLCULO DA FIDELIZAÇÃO =====
    const novos2024 = totaisAnterior.semPreferencia || 0;
    const novos2025 = totaisAtual.semPreferencia || 0;
    const pref2024 = totaisAnterior.preferencia || 0;
    const pref2025 = totaisAtual.preferencia || 0;

    const totalNovos = novos2024 + novos2025;
    const fidelizados = pref2025 - pref2024;
    const perdidos = totalNovos - fidelizados;

    const taxaFidelizacao = totalNovos > 0 ? ((fidelizados / totalNovos) * 100).toFixed(1) : 0;
    const taxaPerda = totalNovos > 0 ? ((perdidos / totalNovos) * 100).toFixed(1) : 0;

    const ticketMedioReal = totaisAtual.ticket || totaisAnterior.ticket || 150;

    let status = '';
    if (taxaPerda > 80) status = '🔴 CRÍTICO';
    else if (taxaPerda > 60) status = '🟡 ATENÇÃO';
    else if (taxaPerda > 40) status = '🟠 MODERADO';
    else if (taxaPerda > 20) status = '🟢 BOM';
    else status = '💚 EXCELENTE';

    const fidelizacao = {
        totalNovos,
        fidelizados,
        perdidos,
        taxaFidelizacao,
        taxaPerda,
        status,
        mensagem: `De cada 100 clientes novos, apenas ${Math.round(fidelizados/totalNovos*100)} viram fiéis`
    };

    const analise = {
        tom: fidelizacao.taxaPerda > 80 ? '🔴 CRÍTICO' : 
              fidelizacao.taxaPerda > 60 ? '🟡 ATENÇÃO' : 
              fidelizacao.taxaPerda > 40 ? '🟠 MODERADO' : 
              fidelizacao.taxaPerda > 20 ? '🟢 BOM' : '💚 EXCELENTE',

        panorama: `📊 De ${novos2024} novos em ${anos[0]} para ${novos2025} novos em ${anos[anos.length-1]}. Total: ${totalNovos} clientes novos.`,

        fidelizacao: `⭐ Apenas ${fidelizados} (${fidelizacao.taxaFidelizacao}%) viraram fiéis. ${perdidos} (${fidelizacao.taxaPerda}%) foram perdidos.`,

        impacto: `💰 Com base no seu ticket médio de R$ ${ticketMedioReal.toFixed(2)}, você PERDEU R$ ${(perdidos * ticketMedioReal).toFixed(2)} com os ${perdidos} clientes que não voltaram.`,

        acao: fidelizacao.taxaPerda > 80 ? '🔴 URGENTE: 87 de cada 100 clientes novos não voltam! Crie pós-venda imediato.' :
              fidelizacao.taxaPerda > 60 ? '🟡 ATENÇÃO: Mais da metade dos clientes novos são perdidos. Invista em relacionamento.' :
              fidelizacao.taxaPerda > 40 ? '🟠 OPORTUNIDADE: Taxa de perda média. Dá para melhorar com WhatsApp e promoções.' :
              fidelizacao.taxaPerda > 20 ? '🟢 BOM: Você retém bem os clientes. Continue assim!' :
              '💚 EXCELENTE: Você é referência em fidelização! Parabéns!',

        resumido: `${fidelizacao.mensagem} ${fidelizacao.taxaPerda > 60 ? '⚠️ Precisa melhorar!' : '✅ Bom trabalho!'}`
    };

    function calcularCrescimento(atual, anterior, campo) {
        if (anterior[campo] === 0) return { valor: 0, texto: '• 0%', classe: 'neutral' };
        const crescimento = ((atual[campo] - anterior[campo]) / anterior[campo]) * 100;
        let classe = crescimento > 0 ? 'positive' : crescimento < 0 ? 'negative' : 'neutral';
        let simbolo = crescimento > 0 ? '▲' : crescimento < 0 ? '▼' : '•';
        return { valor: Math.abs(crescimento), texto: `${simbolo} ${Math.abs(crescimento).toFixed(1)}%`, classe: classe };
    }

    const crescimentoFaturamento = calcularCrescimento(totaisAtual, totaisAnterior, 'faturamento');
    const crescimentoTicket = calcularCrescimento(totaisAtual, totaisAnterior, 'ticket');
    const crescimentoPreferencia = calcularCrescimento(totaisAtual, totaisAnterior, 'preferencia');
    const crescimentoSemPref = calcularCrescimento(totaisAtual, totaisAnterior, 'semPreferencia');
    const crescimentoDias = calcularCrescimento(totaisAtual, totaisAnterior, 'dias');
    const crescimentoOcupacao = calcularCrescimento(totaisAtual, totaisAnterior, 'ocupacao');
    const crescimentosServicos = calcularCrescimento(totaisAtual, totaisAnterior, 'servicos');
    const crescimentoProdutos = calcularCrescimento(totaisAtual, totaisAnterior, 'produtos');

    // Preparar dados para gráficos
    const dadosPorAno = {};
    anos.forEach(ano => {
        dadosPorAno[ano] = {
            faturamento: Array(12).fill(0),
            servicos: Array(12).fill(0),
            produtos: Array(12).fill(0),
            preferencia: Array(12).fill(0),
            semPreferencia: Array(12).fill(0),
            ticket: Array(12).fill(0),
            ocupacao: Array(12).fill(0),
            dias: Array(12).fill(0)
        };
    });

    periodosDados.forEach(p => {
        if (dadosPorAno[p.ano]) {
            const mesIndex = p.mes - 1;
            dadosPorAno[p.ano].faturamento[mesIndex] = parseFloat(p.faturamento) || 0;
            dadosPorAno[p.ano].servicos[mesIndex] = parseInt(p.servicos_qtd) || 0;
            dadosPorAno[p.ano].produtos[mesIndex] = parseInt(p.total_produtos) || 0;
            dadosPorAno[p.ano].preferencia[mesIndex] = parseInt(p.clientes_preferencia) || 0;
            dadosPorAno[p.ano].semPreferencia[mesIndex] = parseInt(p.clientes_sem_preferencia) || 0;
            dadosPorAno[p.ano].ticket[mesIndex] = parseFloat(p.ticket_medio) || 0;
            dadosPorAno[p.ano].ocupacao[mesIndex] = parseFloat(p.taxa_ocupacao) || 0;
            dadosPorAno[p.ano].dias[mesIndex] = parseInt(p.dias_trabalhados) || 0;
        }
    });

    // ===== FUNÇÃO PARA AGRUPAR SERVIÇOS =====
    function agruparServicosPorProfissional(periodos) {
        const servicosAgrupados = {};

        periodos.forEach(p => {
            if (p.servicos && p.servicos.length > 0) {
                p.servicos.forEach(servico => {
                    const nomeServico = servico.servico || 'Serviço não identificado';
                    const quantidade = parseInt(servico.quantidade) || 0;
                    const valor = parseFloat(servico.valor) || 0;

                    if (!servicosAgrupados[nomeServico]) {
                        servicosAgrupados[nomeServico] = {
                            quantidade: 0,
                            valor: 0,
                            periodos: []
                        };
                    }

                    servicosAgrupados[nomeServico].quantidade += quantidade;
                    servicosAgrupados[nomeServico].valor += valor;
                    servicosAgrupados[nomeServico].periodos.push(p.periodo);
                });
            }
        });

        return servicosAgrupados;
    }

    // Agrupar serviços do período atual e anterior
    const servicosAtual = agruparServicosPorProfissional(periodoAtual);
    const servicosAnterior = agruparServicosPorProfissional(periodoAnterior);

    // Calcular crescimento por serviço
    const servicosCrescimento = [];
    const todosServicos = new Set([...Object.keys(servicosAtual), ...Object.keys(servicosAnterior)]);

    todosServicos.forEach(servico => {
        const qtdAtual = servicosAtual[servico]?.quantidade || 0;
        const qtdAnterior = servicosAnterior[servico]?.quantidade || 0;
        const valorAtual = servicosAtual[servico]?.valor || 0;
        const valorAnterior = servicosAnterior[servico]?.valor || 0;

        let crescimentoQtd = 0;
        let crescimentoValor = 0;

        if (qtdAnterior > 0) {
            crescimentoQtd = ((qtdAtual - qtdAnterior) / qtdAnterior) * 100;
        } else if (qtdAtual > 0) {
            crescimentoQtd = 100; // Novo serviço
        }

        if (valorAnterior > 0) {
            crescimentoValor = ((valorAtual - valorAnterior) / valorAnterior) * 100;
        } else if (valorAtual > 0) {
            crescimentoValor = 100; // Novo serviço
        }

        servicosCrescimento.push({
            nome: servico,
            qtdAtual,
            qtdAnterior,
            valorAtual,
            valorAnterior,
            crescimentoQtd: crescimentoQtd.toFixed(1),
            crescimentoValor: crescimentoValor.toFixed(1)
        });
    });

    // Ordenar por quantidade atual (decrescente)
    servicosCrescimento.sort((a, b) => b.qtdAtual - a.qtdAtual);

    // Calcular dados para o card VARIEDADE
    const variedadeAtual = Object.keys(servicosAtual).length;
    const variedadeAnterior = Object.keys(servicosAnterior).length;
    const diferencaVariedade = variedadeAtual - variedadeAnterior;
    let variedadeTexto = '';
    let variedadeIcone = '';
    let variedadeClasse = '';

    if (diferencaVariedade > 0) {
        variedadeTexto = `📈 +${diferencaVariedade} novos serviços`;
        variedadeIcone = '📈';
        variedadeClasse = 'success';
    } else if (diferencaVariedade < 0) {
        variedadeTexto = `📉 ${diferencaVariedade} serviços a menos`;
        variedadeIcone = '📉';
        variedadeClasse = 'danger';
    } else {
        variedadeTexto = `⚖️ Mesma variedade`;
        variedadeIcone = '⚖️';
        variedadeClasse = 'warning';
    }

    // Calcular crescimento percentual da variedade
    let crescimentoVariedade = 0;
    if (variedadeAnterior > 0) {
        crescimentoVariedade = ((variedadeAtual - variedadeAnterior) / variedadeAnterior) * 100;
    }

    // ===== INÍCIO DA CONSTRUÇÃO DO HTML =====
    let html = `
        <div class="control-section">
            <div class="control-title"><i class="fas fa-user-circle"></i> ${profissional}</div>

            <!-- CARDS DE MÉTRICAS COM CORES DIFERENTES -->
            <div class="metrics-grid">
                <!-- FATURAMENTO (Azul Escuro) -->
                <div class="metric-card" style="border-top: 4px solid #1e3c72;">
                    <div class="metric-header" style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);">FATURAMENTO</div>
                    <div class="metric-body">
                        <div class="period-comparison">
                            <div class="period-box"><div class="period-label">ATUAL</div><div class="period-value">R$ ${totaisAtual.faturamento.toFixed(2)}</div></div>
                            <div class="period-box"><div class="period-label">ANTERIOR</div><div class="period-value">R$ ${totaisAnterior.faturamento.toFixed(2)}</div></div>
                        </div>
                        <div class="growth-box">
                            <div class="growth-value growth-${crescimentoFaturamento.classe}">${crescimentoFaturamento.texto}</div>
                        </div>
                    </div>
                </div>

                <!-- TICKET (Verde) -->
                <div class="metric-card" style="border-top: 4px solid #28a745;">
                    <div class="metric-header" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%);">TICKET</div>
                    <div class="metric-body">
                        <div class="period-comparison">
                            <div class="period-box"><div class="period-label">ATUAL</div><div class="period-value">R$ ${totaisAtual.ticket.toFixed(2)}</div></div>
                            <div class="period-box"><div class="period-label">ANTERIOR</div><div class="period-value">R$ ${totaisAnterior.ticket.toFixed(2)}</div></div>
                        </div>
                        <div class="growth-box">
                            <div class="growth-value growth-${crescimentoTicket.classe}">${crescimentoTicket.texto}</div>
                        </div>
                    </div>
                </div>

                <!-- PREFERÊNCIA (Roxo) -->
                <div class="metric-card" style="border-top: 4px solid #6f42c1;">
                    <div class="metric-header" style="background: linear-gradient(135deg, #6f42c1 0%, #9b59b6 100%);">PREFERÊNCIA</div>
                    <div class="metric-body">
                        <div class="period-comparison">
                            <div class="period-box"><div class="period-label">ATUAL</div><div class="period-value">${totaisAtual.preferencia}</div></div>
                            <div class="period-box"><div class="period-label">ANTERIOR</div><div class="period-value">${totaisAnterior.preferencia}</div></div>
                        </div>
                        <div class="growth-box">
                            <div class="growth-value growth-${crescimentoPreferencia.classe}">${crescimentoPreferencia.texto}</div>
                        </div>
                    </div>
                </div>

                <!-- SEM PREFERÊNCIA (Rosa) -->
                <div class="metric-card" style="border-top: 4px solid #e83e8c;">
                    <div class="metric-header" style="background: linear-gradient(135deg, #e83e8c 0%, #d63384 100%);">SEM PREF.</div>
                    <div class="metric-body">
                        <div class="period-comparison">
                            <div class="period-box"><div class="period-label">ATUAL</div><div class="period-value">${totaisAtual.semPreferencia}</div></div>
                            <div class="period-box"><div class="period-label">ANTERIOR</div><div class="period-value">${totaisAnterior.semPreferencia}</div></div>
                        </div>
                        <div class="growth-box">
                            <div class="growth-value growth-${crescimentoSemPref.classe}">${crescimentoSemPref.texto}</div>
                        </div>
                    </div>
                </div>

                <!-- DIAS (Laranja) -->
                <div class="metric-card" style="border-top: 4px solid #fd7e14;">
                    <div class="metric-header" style="background: linear-gradient(135deg, #fd7e14 0%, #ffc107 100%);">DIAS</div>
                    <div class="metric-body">
                        <div class="period-comparison">
                            <div class="period-box"><div class="period-label">ATUAL</div><div class="period-value">${totaisAtual.dias.toFixed(1)}</div></div>
                            <div class="period-box"><div class="period-label">ANTERIOR</div><div class="period-value">${totaisAnterior.dias.toFixed(1)}</div></div>
                        </div>
                        <div class="growth-box">
                            <div class="growth-value growth-${crescimentoDias.classe}">${crescimentoDias.texto}</div>
                        </div>
                    </div>
                </div>

                <!-- OCUPAÇÃO (Amarelo) -->
                <div class="metric-card" style="border-top: 4px solid #ffc107;">
                    <div class="metric-header" style="background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%);">OCUPAÇÃO</div>
                    <div class="metric-body">
                        <div class="period-comparison">
                            <div class="period-box"><div class="period-label">ATUAL</div><div class="period-value">${totaisAtual.ocupacao.toFixed(1)}%</div></div>
                            <div class="period-box"><div class="period-label">ANTERIOR</div><div class="period-value">${totaisAnterior.ocupacao.toFixed(1)}%</div></div>
                        </div>
                        <div class="growth-box">
                            <div class="growth-value growth-${crescimentoOcupacao.classe}">${crescimentoOcupacao.texto}</div>
                        </div>
                    </div>
                </div>

                <!-- SERVIÇOS (Azul Claro) -->
                <div class="metric-card" style="border-top: 4px solid #17a2b8;">
                    <div class="metric-header" style="background: linear-gradient(135deg, #17a2b8 0%, #0dcaf0 100%);">SERVIÇOS</div>
                    <div class="metric-body">
                        <div class="period-comparison">
                            <div class="period-box"><div class="period-label">ATUAL</div><div class="period-value">${totaisAtual.servicos}</div></div>
                            <div class="period-box"><div class="period-label">ANTERIOR</div><div class="period-value">${totaisAnterior.servicos}</div></div>
                        </div>
                        <div class="growth-box">
                            <div class="growth-value growth-${crescimentosServicos.classe}">${crescimentosServicos.texto}</div>
                        </div>
                    </div>
                </div>

                <!-- PRODUTOS (Vermelho) -->
                <div class="metric-card" style="border-top: 4px solid #dc3545;">
                    <div class="metric-header" style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);">PRODUTOS</div>
                    <div class="metric-body">
                        <div class="period-comparison">
                            <div class="period-box"><div class="period-label">ATUAL</div><div class="period-value">${totaisAtual.produtos}</div></div>
                            <div class="period-box"><div class="period-label">ANTERIOR</div><div class="period-value">${totaisAnterior.produtos}</div></div>
                        </div>
                        <div class="growth-box">
                            <div class="growth-value growth-${crescimentoProdutos.classe}">${crescimentoProdutos.texto}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- CARD DE ANÁLISE DE FIDELIZAÇÃO -->
            ${periodoAnterior.length > 0 ? `
            <div class="fidelizacao-card">
                <div class="fidelizacao-header">
                    <h3><i class="fas fa-chart-line"></i> ANÁLISE DE FIDELIZAÇÃO</h3>
                    <span class="fidelizacao-tom" style="background: ${fidelizacao.taxaPerda > 80 ? '#dc3545' : fidelizacao.taxaPerda > 60 ? '#ffc107' : fidelizacao.taxaPerda > 40 ? '#fd7e14' : fidelizacao.taxaPerda > 20 ? '#28a745' : '#20c997'}">
                        ${analise.tom}
                    </span>
                </div>

                <div class="fidelizacao-grid">
                    <div class="fidelizacao-item">
                        <div class="fidelizacao-numero">${fidelizacao.totalNovos}</div>
                        <div class="fidelizacao-label">TOTAL NOVOS</div>
                        <div class="fidelizacao-detalhe">${novos2024} (${anos[0]}) + ${novos2025} (${anos[anos.length-1]})</div>
                    </div>
                    <div class="fidelizacao-item">
                        <div class="fidelizacao-numero" style="color: #28a745;">${fidelizacao.fidelizados}</div>
                        <div class="fidelizacao-label">FIDELIZADOS</div>
                        <div class="fidelizacao-detalhe">+${fidelizados} na preferência</div>
                    </div>
                    <div class="fidelizacao-item">
                        <div class="fidelizacao-numero" style="color: #dc3545;">${fidelizacao.perdidos}</div>
                        <div class="fidelizacao-label">PERDIDOS</div>
                        <div class="fidelizacao-detalhe">não voltaram</div>
                    </div>
                    <div class="fidelizacao-item">
                        <div class="fidelizacao-numero" style="color: ${fidelizacao.taxaPerda > 80 ? '#dc3545' : fidelizacao.taxaPerda > 60 ? '#ffc107' : fidelizacao.taxaPerda > 40 ? '#fd7e14' : fidelizacao.taxaPerda > 20 ? '#28a745' : '#20c997'};">${fidelizacao.taxaPerda}%</div>
                        <div class="fidelizacao-label">TAXA PERDA</div>
                        <div class="fidelizacao-detalhe">Ticket: R$ ${ticketMedioReal.toFixed(2)}</div>
                    </div>
                </div>

                <div class="fidelizacao-barras">
                    <div class="barra-container">
                        <div class="barra-label">
                            <span>Fidelização</span>
                            <span class="barra-valor success">${fidelizacao.taxaFidelizacao}%</span>
                        </div>
                        <div class="barra">
                            <div class="barra-fill success" style="width: ${fidelizacao.taxaFidelizacao}%;"></div>
                        </div>
                    </div>
                    <div class="barra-container">
                        <div class="barra-label">
                            <span>Perda</span>
                            <span class="barra-valor danger">${fidelizacao.taxaPerda}%</span>
                        </div>
                        <div class="barra">
                            <div class="barra-fill danger" style="width: ${fidelizacao.taxaPerda}%;"></div>
                        </div>
                    </div>
                    <div style="text-align: center; margin-top: 5px; font-size: 0.7rem;">
                        <i class="fas fa-info-circle"></i> ${fidelizacao.mensagem}
                    </div>
                </div>

                <div class="fidelizacao-analise">
                    <div class="analise-item"><span style="font-weight: bold;">${analise.tom}</span> - ${analise.panorama}</div>
                    <div class="analise-item">${analise.fidelizacao}</div>
                    <div class="analise-item">${analise.impacto}</div>
                    <div class="analise-acoes" style="background: ${fidelizacao.taxaPerda > 80 ? '#ffebee' : fidelizacao.taxaPerda > 60 ? '#fff8e1' : '#e8f5e9'};">${analise.acao}</div>
                    <div style="text-align: center; font-size: 0.65rem; margin-top: 5px;">${analise.resumido}</div>
                </div>
            </div>
            ` : ''}
    `;

    // Buscar feedbacks específicos deste profissional
// Buscar feedbacks específicos deste profissional
const profissionalCompleto = profissional;
const apelido = profissionalCompleto.split(' ')[0]; // Pega a primeira palavra
let feedbacksProfissional = feedbacksPorProfissional[apelido] || [];

// Se não encontrar pelo apelido, tenta pelo nome completo
if (feedbacksProfissional.length === 0) {
    feedbacksProfissional = feedbacksPorProfissional[profissionalCompleto] || [];
}

// Log para debug (opcional - pode remover depois)
console.log('Profissional:', profissionalCompleto);
console.log('Apelido:', apelido);
console.log('Feedbacks encontrados:', feedbacksProfissional.length);

// ===== CONTAGEM AUTOMÁTICA DE TODOS OS TIPOS =====
const contagemTipos = {};

// Contar automaticamente cada tipo de ocorrência
feedbacksProfissional.forEach(fb => {
    const motivo = (fb.oque_houve || 'NÃO ESPECIFICADO').trim().toUpperCase();
    if (motivo) {
        contagemTipos[motivo] = (contagemTipos[motivo] || 0) + 1;
    }
});

// Ordenar do mais frequente para o menos frequente
const tiposOrdenados = Object.entries(contagemTipos)
    .sort((a, b) => b[1] - a[1]);

const totalOcorrencias = feedbacksProfissional.length;

if (feedbacksProfissional.length > 0) {
    html += `
        <div class="feedback-section" style="margin-top: 25px;">
            <div class="control-title" style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <i class="fas fa-chart-pie" style="color: #f5576c;"></i> 
                ESTATÍSTICAS DE OCORRÊNCIAS
                <span style="background: #f5576c; color: white; padding: 2px 10px; border-radius: 20px; font-size: 0.7rem;">
                    ${totalOcorrencias} total
                </span>
            </div>

            <!-- LEGENDA AUTOMÁTICA - CORES BASEADAS NO TIPO -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; margin: 15px 0;">
    `;

    // Cores pré-definidas para tipos comuns
    const cores = {
        'FALTA': '#f44336',
        'ATRASO': '#ff9800',
        'SAÍDA MAIS CEDO': '#2196f3',
        'SAIDA MAIS CEDO': '#2196f3',
        'NEGOU ATENDIMENTO': '#9c27b0',
        'RECLAMAÇÃO DE CLIENTE': '#d32f2f',
        'RECLAMACAO DE CLIENTE': '#d32f2f',
        'FEEDBACK GERENTE': '#4caf50',
        'FEEDBACK COORDENADOR': '#009688',
        'VIAGEM': '#00bcd4',
        'TREINAMENTO': '#3f51b5',
        'UNIFORME': '#795548',
        'IMAGEM PESSOAL': '#e91e63',
        'USO DE EPI': '#8bc34a',
        'PRODUÇÃO': '#ffc107',
        'PRODUCAO': '#ffc107',
        'REUNIÃO': '#607d8b',
        'REUNIAO': '#607d8b',
        'DEMORA': '#ff5722',
        'PASSOU CLIENTE': '#673ab7',
        'AUSENCIA': '#9e9e9e',
        'CURSO': '#03a9f4',
        'CAPACITAÇÃO': '#03a9f4',
        'CAPACITACAO': '#03a9f4'
    };

    // Função para gerar cor baseada no texto (se não tiver cor definida)
    function gerarCor(texto) {
        if (cores[texto]) return cores[texto];

        // Gerar cor hash-based se não tiver cor definida
        let hash = 0;
        for (let i = 0; i < texto.length; i++) {
            hash = texto.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash % 360);
        return `hsl(${hue}, 70%, 50%)`;
    }

    // Adicionar cards para cada tipo (exceto NÃO ESPECIFICADO)
    tiposOrdenados.forEach(([tipo, quantidade]) => {
        if (tipo === 'NÃO ESPECIFICADO' || tipo === 'NAO ESPECIFICADO') return;

        const cor = gerarCor(tipo);
        const corFundo = cor.replace('hsl', 'hsla').replace(')', ', 0.1)');

        html += `
            <div style="background: ${corFundo}; border-radius: 8px; padding: 8px; text-align: center; border-left: 4px solid ${cor};">
                <div style="font-size: 1.2rem; font-weight: 700; color: #000000;">${quantidade}</div>
                <div style="font-size: 0.65rem; color: #000000; word-break: break-word; font-weight: 500;">${tipo}</div>
            </div>
        `;
    });

    // Mostrar "NÃO ESPECIFICADO" se existir
    if (contagemTipos['NÃO ESPECIFICADO'] || contagemTipos['NAO ESPECIFICADO']) {
        const qtd = contagemTipos['NÃO ESPECIFICADO'] || contagemTipos['NAO ESPECIFICADO'];
        html += `
            <div style="background: #f5f5f5; border-radius: 8px; padding: 8px; text-align: center; border-left: 4px solid #9e9e9e;">
                <div style="font-size: 1.2rem; font-weight: 700; color: #9e9e9e;">${qtd}</div>
                <div style="font-size: 0.65rem; color: #666;">NÃO ESPECIFICADO</div>
            </div>
        `;
    }

    html += `
            </div>

            <div class="control-title" style="display: flex; align-items: center; gap: 10px; margin-top: 20px;">
                <i class="fas fa-comment-dots" style="color: #f5576c;"></i> 
                FEEDBACKS DO PROFISSIONAL
                <span style="background: #f5576c; color: white; padding: 2px 10px; border-radius: 20px; font-size: 0.7rem;">
                    ${feedbacksProfissional.length} feedbacks
                </span>
            </div>

            <div style="display: grid; gap: 15px; margin-top: 15px;">
        `;



        // Mostrar os 500 feedbacks mais recentes
        // Mostrar os 500 feedbacks mais recentes
// DENTRO DA FUNÇÃO gerarConteudoProfissional
// Localize este trecho (por volta da linha 11000-12000)

// Mostrar os 500 feedbacks mais recentes
const feedbacksRecentes = feedbacksProfissional.slice(-500).reverse();

html += `<div style="max-height: 300px; overflow-y: auto; padding-right: 10px;">`;

// No trecho que gera os cards de feedback
// No trecho que gera os cards de feedback
// No JavaScript, dentro de gerarConteudoProfissional
// Localize onde tem feedbacksRecentes.forEach

feedbacksRecentes.forEach(fb => {
    const tipoIcone = fb.tipo === 'POSITIVO' ? '✅' : '❌';

    html += `
        <div style="background: white; border-radius: 12px; padding: 15px; border-left: 5px solid ${fb.tipo === 'POSITIVO' ? '#28a745' : '#dc3545'}; box-shadow: 0 3px 10px rgba(0,0,0,0.1); margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                    <span style="background: ${fb.tipo === 'POSITIVO' ? '#d4edda' : '#f8d7da'}; color: ${fb.tipo === 'POSITIVO' ? '#155724' : '#721c24'}; padding: 4px 12px; border-radius: 20px; font-weight: 600; font-size: 0.8rem;">
                        ${tipoIcone} ${fb.tipo}
                    </span>
                    <span style="background: #e9ecef; color: #495057; padding: 4px 12px; border-radius: 20px; font-weight: 600; font-size: 0.8rem;">
                        📌 ${fb.oque_houve || "NÃO ESPECIFICADO"}
                    </span>
                </div>
                <div style="color: #666; font-size: 0.75rem;">
                    <i class="fas fa-calendar-alt"></i> ${fb.data || `${fb.mes}/${fb.ano}`}
                </div>
            </div>
            <div style="background: #f8f9fa; border-radius: 8px; padding: 12px; margin-top: 10px;">
                <div style="font-size: 0.7rem; color: #999; text-transform: uppercase; margin-bottom: 5px;">
                    <i class="fas fa-comment"></i> DESCREVA O OCORRIDO:
                </div>
                <div style="color: #333; font-size: 0.9rem; line-height: 1.4;">
                    "${fb.comentario}"
                </div>
            </div>
        </div>
    `;
});

html += `</div>`; // FECHA DIV COM SCROLL

if (feedbacksProfissional.length > 500) {
    html += `
        <div style="text-align: center; margin-top: 10px;">
            <span style="background: #f8f9fa; padding: 5px 15px; border-radius: 20px; font-size: 0.7rem; color: #666;">
                + ${feedbacksProfissional.length - 3} feedbacks antigos
            </span>
        </div>
    `;
}

html += `</div></div>`;
    } else {
        html += `
            <div class="feedback-section" style="margin-top: 25px;">
                <div class="control-title" style="color: #999;">
                    <i class="fas fa-comment-slash"></i> SEM FEEDBACKS PARA ${profissional}
                </div>
                <div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 12px;">
                    <i class="fas fa-smile" style="font-size: 2rem; color: #ccc; margin-bottom: 10px;"></i>
                    <p style="color: #999; font-size: 0.8rem;">Nenhum feedback registrado na planilha</p>
                </div>
            </div>
        `;
    }

    // ===== CONTINUAÇÃO DO HTML (GRÁFICOS E TABELAS) =====
    html += `
            <!-- GRÁFICOS -->
            <div class="chart-row">
            <div class="chart-row" style="margin-bottom: 70px;"> <!-- Aumentei de 15px para 30px -->
                <div class="chart-card">
                    <div class="chart-title">FATURAMENTO MENSAL</div>
                    <div class="chart-container">
                        <canvas id="graficoFaturamento"></canvas>
                    </div>
                </div>
            </div>

            <div class="chart-row">
            <div class="chart-row" style="margin-bottom: 70px;"> <!-- Aumentei de 15px para 30px -->
                <div class="chart-card">
                    <div class="chart-title">TICKET MÉDIO</div>
                    <div class="chart-container">
                        <canvas id="graficoTicket"></canvas>
                    </div>
                </div>
            </div>

            <div class="chart-row">
            <div class="chart-row" style="margin-bottom: 70px;"> <!-- Aumentei de 15px para 30px -->
                <div class="chart-card">
                    <div class="chart-title">TAXA DE OCUPAÇÃO</div>
                    <div class="chart-container">
                        <canvas id="graficoOcupacao"></canvas>
                    </div>
                </div>
            </div>

            <div class="chart-row">
            <div class="chart-row" style="margin-bottom: 70px;"> <!-- Aumentei de 15px para 30px -->
                <div class="chart-card">
                    <div class="chart-title">CLIENTES PREFERÊNCIA</div>
                    <div class="chart-container">
                        <canvas id="graficoPreferencia"></canvas>
                    </div>
                </div>
            </div>

            <div class="chart-row">
            <div class="chart-row" style="margin-bottom: 70px;"> <!-- Aumentei de 15px para 30px -->
                <div class="chart-card">
                    <div class="chart-title">CLIENTES SEM PREF.</div>
                    <div class="chart-container">
                        <canvas id="graficoSemPreferencia"></canvas>
                    </div>
                </div>
            </div>

            <div class="chart-row">
            <div class="chart-row" style="margin-bottom: 70px;"> <!-- Aumentei de 15px para 30px -->
                <div class="chart-card">
                    <div class="chart-title">DIAS TRABALHADOS</div>
                    <div class="chart-container">
                        <canvas id="graficoDias"></canvas>
                    </div>
                </div>
            </div>

            <div class="chart-row">
            <div class="chart-row" style="margin-bottom: 70px;"> <!-- Aumentei de 15px para 30px -->
                <div class="chart-card">
                    <div class="chart-title">SERVIÇOS REALIZADOS</div>
                    <div class="chart-container">
                        <canvas id="graficoServicos"></canvas>
                    </div>
                </div>
            </div>

            <div class="chart-row">
            <div class="chart-row" style="margin-bottom: 70px;"> <!-- Aumentei de 15px para 30px -->
                <div class="chart-card">
                    <div class="chart-title">PRODUTOS VENDIDOS</div>
                    <div class="chart-container">
                        <canvas id="graficoProdutos"></canvas>
                    </div>
                </div>
            </div>

            <!-- SEÇÃO: SERVIÇOS POR PROFISSIONAL -->
            <div class="control-section" style="margin-top: 15px;">
                <div class="control-title">
                    <i class="fas fa-clipboard-list"></i> SERVIÇOS REALIZADOS POR ${profissional}
                    <span style="font-size: 0.7rem; background: #f8f9fa; padding: 2px 8px; border-radius: 12px;">${servicosCrescimento.length} serviços</span>
                </div>

                <div style="max-height: 400px; overflow-y: auto; border: 1px solid #e0e0e0; border-radius: 8px;">
                    <div class="table-responsive" style="overflow-x: hidden;">
                        <table style="min-width: 100%;">
                            <thead>
                                <tr>
                                    <th>SERVIÇO</th>
                                    <th>QTD ATUAL</th>
                                    <th>QTD ANT.</th>
                                    <th>CRESC.</th>
                                </tr>
                            </thead>
                            <tbody>
    `;

    if (servicosCrescimento.length > 0) {
        servicosCrescimento.forEach(servico => {
            const crescimentoQtdClass = servico.crescimentoQtd > 0 ? 'badge-success' : 
                                         servico.crescimentoQtd < 0 ? 'badge-danger' : 'badge-warning';
            const crescimentoQtdIcon = servico.crescimentoQtd > 0 ? '▲' : 
                                        servico.crescimentoQtd < 0 ? '▼' : '•';

            html += `
                <tr>
                    <td><strong>${servico.nome}</strong></td>
                    <td>${servico.qtdAtual}</td>
                    <td>${servico.qtdAnterior}</td>
                    <td><span class="${crescimentoQtdClass}" style="display: inline-block; padding: 2px 6px; border-radius: 10px; font-size: 0.65rem;">${crescimentoQtdIcon} ${Math.abs(servico.crescimentoQtd)}%</span></td>
                </tr>
            `;
        });
    } else {
        html += `
                <tr>
                    <td colspan="4" style="padding: 20px; text-align: center;">Nenhum serviço registrado</td>
                </tr>
        `;
    }

    html += `
                            </tbody>
                        </table>
                    </div>
                </div>

                <div style="margin-top: 8px; display: flex; gap: 8px; justify-content: flex-end; font-size: 0.65rem; flex-wrap: wrap;">
                    <span><i class="fas fa-arrow-up" style="color: #28a745;"></i> ↑: ${servicosCrescimento.filter(s => s.qtdAtual > s.qtdAnterior).length}</span>
                    <span><i class="fas fa-arrow-down" style="color: #dc3545;"></i> ↓: ${servicosCrescimento.filter(s => s.qtdAtual < s.qtdAnterior).length}</span>
                    <span><i class="fas fa-minus" style="color: #ffc107;"></i> =: ${servicosCrescimento.filter(s => s.qtdAtual === s.qtdAnterior).length}</span>
                    <span><i class="fas fa-plus-circle" style="color: #17a2b8;"></i> +: ${servicosCrescimento.filter(s => s.qtdAnterior === 0 && s.qtdAtual > 0).length}</span>
                </div>
            </div>

            <!-- RESUMO COMPARATIVO DOS SERVIÇOS -->
            <div class="metrics-grid" style="grid-template-columns: repeat(3, 1fr); margin-top: 15px;">
                <!-- TOTAL DE SERVIÇOS -->
                <div class="metric-card">
                    <div class="metric-header">TOTAL SERVIÇOS</div>
                    <div class="metric-body">
                        <div style="display: flex; justify-content: space-around;">
                            <div><span style="font-size: 0.65rem;">ATUAL</span><br><span style="font-weight: bold;">${totaisAtual.servicos}</span></div>
                            <div><span style="font-size: 0.65rem;">ANT.</span><br><span style="font-weight: bold;">${totaisAnterior.servicos}</span></div>
                        </div>
                        <div class="growth-box" style="margin-top: 5px;">
                            <span class="growth-${crescimentosServicos.classe}" style="font-weight: bold;">${crescimentosServicos.texto}</span>
                        </div>
                    </div>
                </div>

                <!-- VARIEDADE DE SERVIÇOS -->
                <div class="metric-card">
                    <div class="metric-header">VARIEDADE</div>
                    <div class="metric-body">
                        <div style="display: flex; justify-content: space-around; margin-bottom: 8px;">
                            <div style="text-align: center;">
                                <div style="font-size: 0.65rem; color: #666;">ATUAL</div>
                                <div style="font-size: 1.2rem; font-weight: 700; color: var(--primary);">${variedadeAtual}</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 0.65rem; color: #666;">ANT.</div>
                                <div style="font-size: 1.2rem; font-weight: 700; color: #666;">${variedadeAnterior}</div>
                            </div>
                        </div>
                        <div class="growth-box" style="margin-top: 5px; padding: 4px;">
                            <span class="growth-${diferencaVariedade > 0 ? 'positive' : diferencaVariedade < 0 ? 'negative' : 'neutral'}" 
                                  style="font-weight: 700; font-size: 1rem;">
                                ${diferencaVariedade > 0 ? '+' : ''}${diferencaVariedade}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- TOP 3 SERVIÇOS -->
                <div class="metric-card">
                    <div class="metric-header">TOP 3 SERVIÇOS</div>
                    <div class="metric-body" style="font-size: 0.7rem;">
    `;

    // Adicionar top 3 serviços (nome em cima, quantidade embaixo)
    for (let i = 0; i < Math.min(3, servicosCrescimento.length); i++) {
        const s = servicosCrescimento[i];

        html += `
            <div style="text-align: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #eee;">
                <div style="color: var(--primary); font-weight: 700; font-size: 0.85rem; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${s.nome}
                </div>
                <div style="font-weight: 600; font-size: 0.8rem; color: #333;">
                    ${s.qtdAtual} unidades
                </div>
            </div>
        `;
    }

    // Se não houver 3 serviços, preencher com placeholders
    for (let i = servicosCrescimento.length; i < 3; i++) {
        html += `
            <div style="text-align: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #eee; color: #999;">
                <div style="font-weight: 700; font-size: 0.85rem; margin-bottom: 3px;">-</div>
                <div style="font-size: 0.8rem;">-</div>
            </div>
        `;
    }

    // FECHAMENTO DAS DIVs
    html += `
                    </div> <!-- FECHA metric-body -->
                </div> <!-- FECHA metric-card -->
            </div>
        </div> <!-- FECHA control-section -->
    `;

    // Injetar o HTML no DOM
    document.getElementById('conteudoDinamico').innerHTML = html;

    // Renderizar gráficos
    renderizarGraficos(dadosPorAno, anos);
}



function renderizarGraficos(dadosPorAno, anos) {
                const anosOrdenados = [...anos].sort();
                const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
                const cores = ['#1e3c72', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6f42c1', '#fd7e14', '#20c997'];

                function criarGrafico(id, campo, formatarValor = false) {
                    if (!document.getElementById(id)) return;

                    const datasets = anosOrdenados.map((ano, index) => ({
                        label: `${ano}`,
                        data: dadosPorAno[ano][campo],
                        backgroundColor: cores[index % cores.length] + '80',
                        borderColor: cores[index % cores.length],
                        borderWidth: 1
                    }));

                    new Chart(document.getElementById(id), {
                        type: 'bar',
                        data: { labels: meses, datasets: datasets },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { 
                                legend: { display: false },
                                tooltip: { enabled: true },
                                datalabels: {
                                    display: true,
                                    color: 'black',
                                    anchor: 'end',
                                    align: 'top',
                                    offset: 2,
                                    formatter: (value) => {
                                        if (value === 0 || value === null || value === undefined) return '';
                                        if (formatarValor) {
                                            return 'R$ ' + value.toFixed(0);
                                        }
                                        return value.toFixed(0);
                                    },
                                    font: {
                                        weight: 'bold',
                                        size: 8
                                    }
                                }
                            },
                            scales: { 
                                y: { 
                                    beginAtZero: true,
                                    ticks: {
                                        callback: (value) => {
                                            if (formatarValor) return 'R$ ' + value.toFixed(0);
                                            return value;
                                        },
                                        font: { size: 8 }
                                    }
                                },
                                x: {
                                    ticks: { font: { size: 8 } }
                                }
                            }
                        }
                    });
                }

                // Carregar plugin de datalabels se não existir
                if (typeof Chart !== 'undefined' && !Chart.registry.plugins.get('datalabels')) {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0/dist/chartjs-plugin-datalabels.min.js';
                    script.onload = () => {
                        Chart.register(ChartDataLabels);
                        criarGrafico('graficoFaturamento', 'faturamento', true);
                        criarGrafico('graficoTicket', 'ticket', true);
                        criarGrafico('graficoOcupacao', 'ocupacao', false);
                        criarGrafico('graficoPreferencia', 'preferencia', false);
                        criarGrafico('graficoSemPreferencia', 'semPreferencia', false);
                        criarGrafico('graficoDias', 'dias', false);
                        criarGrafico('graficoServicos', 'servicos', false);
                        criarGrafico('graficoProdutos', 'produtos', false);
                    };
                    document.head.appendChild(script);
                } else {
                    criarGrafico('graficoFaturamento', 'faturamento', true);
                    criarGrafico('graficoTicket', 'ticket', true);
                    criarGrafico('graficoOcupacao', 'ocupacao', false);
                    criarGrafico('graficoPreferencia', 'preferencia', false);
                    criarGrafico('graficoSemPreferencia', 'semPreferencia', false);
                    criarGrafico('graficoDias', 'dias', false);
                    criarGrafico('graficoServicos', 'servicos', false);
                    criarGrafico('graficoProdutos', 'produtos', false);
                }
            }

            document.getElementById('searchProfissionalInput').addEventListener('keyup', filtrarProfissionais);
            window.onload = function() {
                if (profissionaisDisponiveis.length > 0) {
                    document.getElementById('selectProfissional').value = profissionaisDisponiveis[0].nome;
                    aplicarFiltros();
                }
            };
        </script>
        <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0/dist/chartjs-plugin-datalabels.min.js"></script>

        <script>
        // ===== MODAL PARA COMPARAÇÃO POR CATEGORIA =====
        let modalAtivo = false;

        function criarModal() {
    if (document.getElementById('modalRanking')) return;

    const modalHTML = `
    <div id="modalRanking" class="modal-overlay">
        <div class="modal-container" style="width: 95%; max-width: 95%;">
            <div class="modal-header">
                <h3 id="modalTitle">Comparação por Categoria</h3>
                <div style="display: flex; gap: 10px;">
                    <button id="modalMaximizarBtn" class="modal-maximizar" style="background: none; border: none; color: white; font-size: 1.2rem; cursor: pointer; padding: 0 5px;">🗖</button>
                    <button class="modal-close" onclick="fecharModal()">×</button>
                </div>
            </div>
            <div class="modal-body" id="modalBody">
                <div class="ranking-empty">Carregando...</div>
            </div>
        </div>
    </div>
`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Configurar botão de maximizar
    const modalContainer = document.querySelector('#modalRanking .modal-container');
    const maximizarBtn = document.getElementById('modalMaximizarBtn');
    let isMaximized = false;

    // Dentro do botão de maximizar
maximizarBtn.onclick = function() {
    if (!isMaximized) {
        modalContainer.classList.add('maximized');
        
        // FORÇA A TABELA A AUMENTAR
        const tabela = document.querySelector('#rankingPrincipal');
        if (tabela) {
            tabela.style.flex = '1';
            tabela.style.minWidth = '800px';
        }
        
        maximizarBtn.innerHTML = '🗗';
        isMaximized = true;
    } else {
        modalContainer.classList.remove('maximized');
        
        // RESTAURA
        const tabela = document.querySelector('#rankingPrincipal');
        if (tabela) {
            tabela.style.flex = '';
            tabela.style.minWidth = '';
        }
        
        maximizarBtn.innerHTML = '🗖';
        isMaximized = false;
    }
};
}

        function fecharModal() {
    const modal = document.getElementById('modalRanking');
    if (modal) modal.classList.remove('active');
}

        // ===== FUNÇÃO MODAL CORRIGIDA =====
function abrirModal(metric, metricName, currentProfissional) {
    criarModal();

    const modal = document.getElementById('modalRanking');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    // Encontrar a categoria do profissional atual
    let categoriaAtual = '';

    for (const prof of profissionaisDisponiveis) {
        if (prof.nome.toUpperCase() === currentProfissional.toUpperCase()) {
            categoriaAtual = prof.categoria || '';
            break;
        }
    }

    if (!categoriaAtual) {
        modalBody.innerHTML = '<div class="ranking-empty">❌ Categoria não encontrada para este profissional</div>';
        modal.classList.add('active');
        return;
    }

    modalTitle.innerHTML = `🏷️ ${categoriaAtual} - ${metricName}`;

    // Coletar todos os profissionais da mesma categoria
    const profissionaisMesmaCategoria = [];

    for (const prof of profissionaisDisponiveis) {
        if (prof.categoria === categoriaAtual && dadosProfissionais[prof.nome.toUpperCase()]) {
            let valorMetrica = 0;
            const dadosProf = dadosProfissionais[prof.nome.toUpperCase()];

            // Somar todos os períodos selecionados
            let periodosParaMetrica = [];

            for (const ano of anosSelecionados) {
                for (const mes of mesesSelecionados) {
                    const periodoId = `${ano}_${mes}`;
                    if (dadosProf[periodoId]) {
                        periodosParaMetrica.push(dadosProf[periodoId]);
                    }
                }
            }

            if (periodosParaMetrica.length > 0) {
                switch(metric) {
                    case 'faturamento':
                        valorMetrica = periodosParaMetrica.reduce((sum, p) => sum + (parseFloat(p.faturamento) || 0), 0);
                        break;
                    case 'ticket':
                        let soma = 0, count = 0;
                        periodosParaMetrica.forEach(p => {
                            if (p.ticket_medio) { soma += parseFloat(p.ticket_medio); count++; }
                        });
                        valorMetrica = count > 0 ? soma / count : 0;
                        break;
                    case 'preferencia':
                        valorMetrica = periodosParaMetrica.reduce((sum, p) => sum + (parseInt(p.clientes_preferencia) || 0), 0);
                        break;
                    case 'semPref':
                        valorMetrica = periodosParaMetrica.reduce((sum, p) => sum + (parseInt(p.clientes_sem_preferencia) || 0), 0);
                        break;
                    case 'dias':
                        let somaDias = 0;
                        periodosParaMetrica.forEach(p => { somaDias += parseInt(p.dias_trabalhados) || 0; });
                        valorMetrica = periodosParaMetrica.length > 0 ? somaDias / periodosParaMetrica.length : 0;
                        break;
                    case 'ocupacao':
                        let somaOcup = 0;
                        periodosParaMetrica.forEach(p => { somaOcup += parseFloat(p.taxa_ocupacao) || 0; });
                        valorMetrica = periodosParaMetrica.length > 0 ? somaOcup / periodosParaMetrica.length : 0;
                        break;
                    case 'servicos':
                        valorMetrica = periodosParaMetrica.reduce((sum, p) => sum + (parseInt(p.servicos_qtd) || 0), 0);
                        break;
                    case 'produtos':
                        valorMetrica = periodosParaMetrica.reduce((sum, p) => sum + (parseInt(p.total_produtos) || 0), 0);
                        break;
                }
            }

            profissionaisMesmaCategoria.push({
                nome: prof.nome,
                valor: valorMetrica,
                isCurrent: prof.nome.toUpperCase() === currentProfissional.toUpperCase(),
                dados: dadosProf,
                periodos: periodosParaMetrica
            });
        }
    }

    // Ordenar do maior para o menor
    profissionaisMesmaCategoria.sort((a, b) => b.valor - a.valor);

    function formatarValor(valor, metric) {
        if (metric === 'faturamento' || metric === 'ticket') {
            return `R$ ${valor.toFixed(2)}`;
        } else if (metric === 'ocupacao') {
            return `${valor.toFixed(1)}%`;
        } else {
            return valor.toFixed(0);
        }
    }

    // Montar texto do período
    const mesesNomes = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    let periodoTexto = '';

    if (modoComparacaoAtivo) {
        if (anosSelecionados.length === 1) {
            const ano = anosSelecionados[0];
            const mesesOrdenados = [...mesesSelecionados].sort((a,b) => a - b);
            if (mesesOrdenados.length === 12) {
                periodoTexto = `Ano completo ${ano} (SOMA DE TODOS OS MESES)`;
            } else {
                periodoTexto = `${mesesNomes[mesesOrdenados[0]-1]} a ${mesesNomes[mesesOrdenados[mesesOrdenados.length-1]-1]}/${ano} (SOMA DE TODOS)`;
            }
        } else {
            periodoTexto = `${mesesSelecionados.length} meses em ${anosSelecionados.length} anos (SOMA TOTAL)`;
        }
    } else {
        if (anosSelecionados.length === 1) {
            const ano = anosSelecionados[0];
            if (mesesSelecionados.length === 12) {
                periodoTexto = `Ano completo ${ano}`;
            } else if (mesesSelecionados.length === 1) {
                periodoTexto = `${mesesNomes[mesesSelecionados[0]-1]}/${ano}`;
            } else {
                periodoTexto = `${mesesNomes[mesesSelecionados[0]-1]} a ${mesesNomes[mesesSelecionados[mesesSelecionados.length-1]-1]}/${ano}`;
            }
        } else {
            periodoTexto = `${mesesSelecionados.length} meses em ${anosSelecionados.length} anos`;
        }
    }

    // Calcular estatística apenas da métrica selecionada
    function calcularEstatisticaUnica(metric, valores) {
        let valoresFiltrados = valores;

        if (metric === 'faturamento') {
            valoresFiltrados = valores.filter(v => v.valor > 10);
        } else if (metric === 'ticket') {
            valoresFiltrados = valores.filter(v => v.valor > 10);
        } else if (metric === 'preferencia') {
            valoresFiltrados = valores.filter(v => v.valor > 10);
        } else if (metric === 'semPref') {
            valoresFiltrados = valores.filter(v => v.valor > 1);
        } else if (metric === 'dias') {
            valoresFiltrados = valores.filter(v => v.valor > 10);
        } else if (metric === 'ocupacao') {
            valoresFiltrados = valores.filter(v => v.valor > 10);
        } else if (metric === 'servicos') {
            valoresFiltrados = valores.filter(v => v.valor > 10);
        } else if (metric === 'produtos') {
            valoresFiltrados = valores.filter(v => v.valor > 10);
        }

        const total = valores.reduce((sum, v) => sum + v.valor, 0);
        const totalFiltrado = valoresFiltrados.reduce((sum, v) => sum + v.valor, 0);
        const media = valoresFiltrados.length > 0 ? totalFiltrado / valoresFiltrados.length : 0;

        return { total, media, count: valores.length, countFiltrado: valoresFiltrados.length };
    }

    let valoresMetrica = profissionaisMesmaCategoria.map(p => ({
        nome: p.nome,
        valor: p.valor,
        isCurrent: p.isCurrent
    }));

    const estatisticaUnica = calcularEstatisticaUnica(metric, valoresMetrica);

    let metricDisplayName = {
        'faturamento': 'FATURAMENTO',
        'ticket': 'TICKET MÉDIO',
        'preferencia': 'CLIENTES COM PREFERÊNCIA',
        'semPref': 'CLIENTES SEM PREFERÊNCIA',
        'dias': 'DIAS TRABALHADOS (MÉDIA)',
        'ocupacao': 'TAXA DE OCUPAÇÃO',
        'servicos': 'SERVIÇOS REALIZADOS',
        'produtos': 'PRODUTOS VENDIDOS'
    }[metric] || metric.toUpperCase();

    let metricIcon = {
        'faturamento': '💰',
        'ticket': '🎫',
        'preferencia': '⭐',
        'semPref': '👤',
        'dias': '📅',
        'ocupacao': '⏰',
        'servicos': '✂️',
        'produtos': '📦'
    }[metric] || '📊';

    let metricUnidade = '';
    if (metric === 'faturamento' || metric === 'ticket') {
        metricUnidade = 'R$ ';
    } else if (metric === 'ocupacao') {
        metricUnidade = '%';
    }

    if (profissionaisMesmaCategoria.length === 0) {
        modalBody.innerHTML = '<div class="ranking-empty">⚠️ Nenhum outro profissional encontrado nesta categoria</div>';
        modal.classList.add('active');
        return;
    }

    // ===== MONTAR HTML DO MODAL =====
    let rankingHTML = `
        <div style="margin-bottom: 15px; padding: 10px; background: #f0f4f8; border-radius: 10px;">
            <strong>📊 Total: ${profissionaisMesmaCategoria.length} profissionais</strong>
            | 🏷️ Categoria: ${categoriaAtual}
        </div>

        <div style="margin-bottom: 15px; padding: 8px; background: #e3f2fd; border-radius: 8px; font-size: 0.7rem; text-align: center;">
            <i class="fas fa-calculator"></i> ${periodoTexto}
            <span style="background: #ff980020; padding: 2px 8px; border-radius: 12px; margin-left: 8px;">📊 SOMA DE TODOS OS PERÍODOS</span>
        </div>

        <div style="background: linear-gradient(135deg, #0f3460 0%, #1a1a2e 100%); border-radius: 12px; padding: 15px; margin-bottom: 20px; color: white;">
            <div style="font-size: 1rem; font-weight: bold; margin-bottom: 12px; text-align: center;">
                ${metricIcon} RESUMO: ${metricDisplayName}
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                <div style="background: rgba(255,255,255,0.15); border-radius: 8px; padding: 8px;">
                    <div style="font-size: 0.7rem; opacity: 0.8;">📊 TOTAL</div>
                    <div style="font-size: 1rem; font-weight: bold;">${metricUnidade}${estatisticaUnica.total.toFixed(2)}</div>
                    <div style="font-size: 0.7rem;">Média: ${metricUnidade}${estatisticaUnica.media.toFixed(2)}</div>
                    <div style="font-size: 0.6rem; opacity: 0.7;">(${estatisticaUnica.countFiltrado}/${estatisticaUnica.count} profissionais)</div>
                </div>
            </div>
        </div>
    `;

    // ===== LAYOUT PRINCIPAL =====
    rankingHTML += `
        <div style="display: flex; gap: 15px; position: relative;">
            <!-- COLUNA PRINCIPAL (RANKING) -->
            <div id="rankingPrincipal" style="flex: 1; transition: all 0.3s ease; max-height: 80vh;">
                ${metric === 'faturamento' ? `
                <div style="text-align: right; margin-bottom: 10px;">
                    <button id="btnExpandirMeta" style="background: #0f3460; color: white; border: none; padding: 6px 15px; border-radius: 20px; cursor: pointer; font-size: 0.8rem; transition: all 0.3s;">
                        <i class="fas fa-chevron-left"></i> <span id="expandirTexto">EXPANDIR METAS INDIVIDUAIS</span> <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                ` : ''}

                <!-- CABEÇALHO DA TABELA -->
<div style="display: grid; grid-template-columns: 45px 1fr 120px ${metric === 'faturamento' ? '120px 120px' : ''}; background: #0f3460; color: white; font-weight: bold; border-radius: 8px; margin-bottom: 5px; padding: 10px 15px;">
    <div style="text-align: center;">#</div>
    <div style="text-align: left;">PROFISSIONAL</div>
    <div style="text-align: left;">ATUAL</div>
    ${metric === 'faturamento' ? `
    <div style="text-align: left;" id="headerMeta">META</div>
    <div style="text-align: left;" id="headerMetaDiaria">META DIÁRIA</div>
    ` : ''}
</div>

                <!-- LINHAS DA TABELA -->
                <div id="rankingList" style="max-height: 60vh; overflow-y: auto;">
    `;

    profissionaisMesmaCategoria.forEach((prof, idx) => {
        const destaque = prof.isCurrent ? 'style="background: #e3f2fd;"' : '';
        rankingHTML += `
            <div class="ranking-item" style="display: grid; grid-template-columns: 45px 1fr 120px ${metric === 'faturamento' ? '120px 120px' : ''}; padding: 10px 15px; border-bottom: 1px solid #e0e0e0; align-items: center;">
    <div class="ranking-position" style="font-weight: bold; color: #0f3460; text-align: center;">${idx + 1}º</div>
    <div class="ranking-name" style="font-weight: 500; text-align: left;">${prof.nome} ${prof.isCurrent ? '👈' : ''}</div>
    <div class="ranking-value ${metric}" style="text-align: left; font-family: monospace;">${formatarValor(prof.valor, metric)}</div>
    ${metric === 'faturamento' ? `
    <div id="metaValor_${idx}" style="text-align: left; color: #28a745; font-weight: bold; display: none; font-family: monospace;"></div>
    <div id="metaDiaria_${idx}" style="text-align: left; color: #17a2b8; font-weight: bold; display: none; font-family: monospace;"></div>
    ` : ''}
</div>
        `;
    });

    rankingHTML += `
                </div>
            </div>
    `;

    // ===== PAINEL DE METAS (APENAS PARA FATURAMENTO) =====
    if (metric === 'faturamento') {
        rankingHTML += `
            <div id="painelMeta" style="width: 0; overflow: hidden; transition: all 0.3s ease; background: #f8f9fa; border-radius: 10px; padding: 0;">
                <div style="padding: 15px; min-width: 340px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <span style="font-weight: bold; color: #0f3460;"><i class="fas fa-chart-line"></i> DEFINIR METAS INDIVIDUAIS</span>
                        <button id="btnFecharMeta" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #999;">&times;</button>
                    </div>

                    <div id="metasList" style="max-height: 380px; overflow-y: auto;">
        `;

        profissionaisMesmaCategoria.forEach((prof, idx) => {
            rankingHTML += `
                <div style="margin-bottom: 15px; padding: 12px; background: white; border-radius: 8px; border-left: 4px solid ${prof.isCurrent ? '#0f3460' : '#ccc'};">
                    <div style="font-weight: bold; font-size: 0.85rem; margin-bottom: 8px; color: #0f3460;">
                        ${prof.nome} ${prof.isCurrent ? '👈' : ''}
                        <span style="font-size: 0.7rem; color: #666;"> (Atual: ${formatarValor(prof.valor, metric)})</span>
                    </div>

                    <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                        <select id="metaTipo_${idx}" style="flex: 1; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 0.75rem;">
                            <option value="percentual">Percentual (%)</option>
                            <option value="valor">Valor Fixo (R$)</option>
                        </select>
                        <input type="number" id="metaValorInput_${idx}" placeholder="Ex: 20" style="flex: 1; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 0.75rem;">
                    </div>

                    <div style="display: flex; gap: 8px; align-items: center;">
                        <div style="flex: 1;">
                            <div style="font-size: 0.6rem; color: #666;">Dias trabalhados</div>
                            <input type="number" id="diasTrabalhadosInput_${idx}" value="23" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 0.7rem;">
                        </div>
                        <button class="aplicarMetaIndividual" data-idx="${idx}" style="background: #28a745; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; font-size: 0.7rem; margin-top: 12px;">
                            APLICAR
                        </button>
                    </div>
                </div>
            `;
        });

        rankingHTML += `
                    </div>

                    <button id="limparTodasMetasBtn" style="width: 100%; background: #6c757d; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; margin-top: 10px;">
                        LIMPAR TODAS METAS
                    </button>
                </div>
            </div>
        `;
    }

    rankingHTML += `
        </div>
    `;

    modalBody.innerHTML = rankingHTML;

    // ===== CONFIGURAR FUNCIONALIDADES =====
    if (metric === 'faturamento') {
        // Configurar botão expandir/recolher
        const btnExpandir = document.getElementById('btnExpandirMeta');
        const painelMeta = document.getElementById('painelMeta');
        const rankingPrincipal = document.getElementById('rankingPrincipal');
        const btnFecharMeta = document.getElementById('btnFecharMeta');
        let expandido = false;

        function expandirPainel() {
            expandido = true;
            painelMeta.style.width = '360px';
            painelMeta.style.padding = '0';
            rankingPrincipal.style.flex = '0.6';
            btnExpandir.innerHTML = '<i class="fas fa-chevron-right"></i> <span id="expandirTexto">RECOLHER METAS</span> <i class="fas fa-chevron-left"></i>';
            btnExpandir.style.background = '#dc3545';
        }

        function recolherPainel() {
            expandido = false;
            painelMeta.style.width = '0';
            painelMeta.style.padding = '0';
            rankingPrincipal.style.flex = '1';
            btnExpandir.innerHTML = '<i class="fas fa-chevron-left"></i> <span id="expandirTexto">EXPANDIR METAS INDIVIDUAIS</span> <i class="fas fa-chevron-right"></i>';
            btnExpandir.style.background = '#0f3460';
        }

        btnExpandir.onclick = function() {
            if (expandido) {
                recolherPainel();
            } else {
                expandirPainel();
            }
        };

        if (btnFecharMeta) {
            btnFecharMeta.onclick = recolherPainel;
        }

        // Função para mostrar colunas de meta
        function mostrarColunasMeta() {
            const headerMeta = document.getElementById('headerMeta');
            const headerMetaDiaria = document.getElementById('headerMetaDiaria');
            if (headerMeta) headerMeta.style.display = 'block';
            if (headerMetaDiaria) headerMetaDiaria.style.display = 'block';
        }

        // Aplicar meta individual
        function aplicarMetaIndividual(idx, valorAtual) {
            const metaTipo = document.getElementById(`metaTipo_${idx}`).value;
            const metaValor = parseFloat(document.getElementById(`metaValorInput_${idx}`).value);
            const diasTrabalhados = parseInt(document.getElementById(`diasTrabalhadosInput_${idx}`).value) || 23;

            if (isNaN(metaValor) || metaValor <= 0) {
                alert(`Digite um valor válido para ${profissionaisMesmaCategoria[idx].nome}!`);
                return false;
            }

            let meta = 0;
            if (metaTipo === 'percentual') {
                meta = valorAtual * (1 + metaValor / 100);
            } else {
                meta = valorAtual + metaValor;
            }

            const metaDiaria = meta / diasTrabalhados;

            const metaElement = document.getElementById(`metaValor_${idx}`);
            const metaDiariaElement = document.getElementById(`metaDiaria_${idx}`);

            if (metaElement) {
                metaElement.innerHTML = `R$ ${meta.toFixed(2)}`;
                metaElement.style.display = 'block';
            }
            if (metaDiariaElement) {
                metaDiariaElement.innerHTML = `R$ ${metaDiaria.toFixed(2)}`;
                metaDiariaElement.style.display = 'block';
            }

            return true;
        }

        // Adicionar eventos para cada botão
        document.querySelectorAll('.aplicarMetaIndividual').forEach(btn => {
            btn.onclick = function() {
                const idx = parseInt(this.getAttribute('data-idx'));
                const valorAtual = profissionaisMesmaCategoria[idx].valor;

                mostrarColunasMeta();
                aplicarMetaIndividual(idx, valorAtual);
            };
        });

        // Limpar todas as metas
        const limparBtn = document.getElementById('limparTodasMetasBtn');
        if (limparBtn) {
            limparBtn.onclick = function() {
                profissionaisMesmaCategoria.forEach((_, idx) => {
                    const tipoSelect = document.getElementById(`metaTipo_${idx}`);
                    const valorInput = document.getElementById(`metaValorInput_${idx}`);
                    const diasInput = document.getElementById(`diasTrabalhadosInput_${idx}`);

                    if (tipoSelect) tipoSelect.value = 'percentual';
                    if (valorInput) valorInput.value = '';
                    if (diasInput) diasInput.value = '23';

                    const metaElement = document.getElementById(`metaValor_${idx}`);
                    const metaDiariaElement = document.getElementById(`metaDiaria_${idx}`);
                    if (metaElement) metaElement.style.display = 'none';
                    if (metaDiariaElement) metaDiariaElement.style.display = 'none';
                });

                const headerMeta = document.getElementById('headerMeta');
                const headerMetaDiaria = document.getElementById('headerMetaDiaria');
                if (headerMeta) headerMeta.style.display = 'none';
                if (headerMetaDiaria) headerMetaDiaria.style.display = 'none';
            };
        }
    }

    modal.classList.add('active');

    modal.onclick = function(e) {
        if (e.target === modal) fecharModal();
    };
}

        function adicionarEventosMetricas() {
            const cards = document.querySelectorAll('.metric-card');
            cards.forEach(card => {
                const headerText = card.querySelector('.metric-header')?.innerText || '';
                card.style.cursor = 'pointer';

                if (headerText.includes('FATURAMENTO')) {
                    card.onclick = () => abrirModal('faturamento', 'FATURAMENTO', profissionalSelecionado);
                } else if (headerText.includes('TICKET')) {
                    card.onclick = () => abrirModal('ticket', 'TICKET MÉDIO', profissionalSelecionado);
                } else if (headerText.includes('PREFERÊNCIA')) {
                    card.onclick = () => abrirModal('preferencia', 'CLIENTES COM PREFERÊNCIA', profissionalSelecionado);
                } else if (headerText.includes('SEM PREF')) {
                    card.onclick = () => abrirModal('semPref', 'CLIENTES SEM PREFERÊNCIA', profissionalSelecionado);
                } else if (headerText.includes('DIAS')) {
                    card.onclick = () => abrirModal('dias', 'DIAS TRABALHADOS (MÉDIA)', profissionalSelecionado);
                } else if (headerText.includes('OCUPAÇÃO')) {
                    card.onclick = () => abrirModal('ocupacao', 'TAXA DE OCUPAÇÃO', profissionalSelecionado);
                } else if (headerText.includes('SERVIÇOS')) {
                    card.onclick = () => abrirModal('servicos', 'SERVIÇOS REALIZADOS', profissionalSelecionado);
                } else if (headerText.includes('PRODUTOS')) {
                    card.onclick = () => abrirModal('produtos', 'PRODUTOS VENDIDOS', profissionalSelecionado);
                }
            });
        }

        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    setTimeout(adicionarEventosMetricas, 100);
                }
            });
        });

        if (document.getElementById('conteudoDinamico')) {
            observer.observe(document.getElementById('conteudoDinamico'), { childList: true, subtree: true });
        }

        setTimeout(adicionarEventosMetricas, 500);
        </script>
    </body>
    </html>
            """

        dados_profissionais_json = json.dumps(dados_profissionais_dict, default=str)
        profissionais_disponiveis_json = json.dumps(profissionais_com_categoria)

        from jinja2 import Template
        template = Template(html_template)

        html_content = template.render(
            total_profissionais=len(todos_profissionais),
            profissionais_disponiveis=profissionais_com_categoria,
            anos_disponiveis=todos_anos,
            meses_disponiveis=meses_nomes,
            dados_profissionais_json=dados_profissionais_json,
            profissionais_disponiveis_json=profissionais_disponiveis_json,
            feedbacks_por_profissional_json=json.dumps(feedbacks_por_profissional, default=str)  # ← NOVA LINHA
        )

        if not os.path.exists(PASTA_RELATORIOS):
            os.makedirs(PASTA_RELATORIOS)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{PASTA_RELATORIOS}/NODRI_DASHBOARD_PROFISSIONAL_{timestamp}.html"

        with open(filename, 'w', encoding='utf-8') as f:
            f.write(html_content)

        print(f"\n✅ Dashboard gerado: {filename}")
        return filename


# ============================================================================
# CLASSE COLETOR DE FEEDBACK PROFISSIONAL (CORRIGIDA)
# ============================================================================


class ColetorFeedbackProfissional:
    """Coleta feedback da planilha do Google Sheets - Versão otimizada"""

    def __init__(self, base_dados):
        self.base_dados = base_dados
        self.url = FEEDBACK_PROFISSIONAL_URL

    def set_url(self, nova_url):
        self.url = nova_url

    def _corrigir_nome_profissional(self, nome):
        """Corrige especificamente os nomes dos profissionais"""
        if pd.isna(nome) or nome is None:
            return "NÃO IDENTIFICADO"

        nome = str(nome).strip()

        # Dicionário de correções para nomes específicos
        correcoes_nomes = {
            'CÃLIA': 'CÉLIA',
            'CÃ‰LIA': 'CÉLIA',
            'CÉLIA': 'CÉLIA',  # Já correto
            'CELIA': 'CÉLIA',  # Sem acento
            'MARIA': 'MARIA',
            'JOÃO': 'JOÃO',
            'JOAO': 'JOÃO',
            # Adicione mais nomes conforme necessário
        }

        # Aplicar correções específicas
        for errado, certo in correcoes_nomes.items():
            if errado in nome:
                nome = nome.replace(errado, certo)

        # Correções gerais de acentos
        nome = nome.replace('Ã¡', 'á').replace('Ã©', 'é').replace('Ã­', 'í')
        nome = nome.replace('Ã³', 'ó').replace('Ãº', 'ú')
        nome = nome.replace('Ã£', 'ã').replace('Ãµ', 'õ')
        nome = nome.replace('Ã§', 'ç')
        nome = nome.replace('Ã', 'Á').replace('Ã‰', 'É').replace('Ã', 'Í')
        nome = nome.replace('Ã“', 'Ó').replace('Ãš', 'Ú')
        nome = nome.replace('Ãƒ', 'Ã').replace('Ã•', 'Õ')
        nome = nome.replace('Ã‡', 'Ç')

        return nome.upper().strip()

    def _corrigir_texto_geral(self, texto):
        """Corrige textos gerais (comentários, descrições)"""
        if pd.isna(texto) or texto is None:
            return ""

        texto = str(texto)

        # Correções específicas para o exemplo que você deu
        texto = texto.replace('Ã¡s', 'ás')
        texto = texto.replace('Ã s', 'ás')
        texto = texto.replace('Ã s', 'ás')

        # Correções gerais
        texto = texto.replace('Ã¡', 'á').replace('Ã©', 'é').replace('Ã­', 'í')
        texto = texto.replace('Ã³', 'ó').replace('Ãº', 'ú')
        texto = texto.replace('Ã£', 'ã').replace('Ãµ', 'õ')
        texto = texto.replace('Ã¢', 'â').replace('Ãª', 'ê').replace('Ã´', 'ô')
        texto = texto.replace('Ã§', 'ç')

        # Remover aspas extras se houver
        texto = texto.strip('"').strip("'")

        return texto.strip()

    def coletar_e_salvar(self, sobrescrever=True):
        """
        Coleta feedback da planilha e salva na base
        Versão otimizada para sua planilha específica
        """
        try:
            import requests
            from io import StringIO
            import pandas as pd
            from datetime import datetime

            print("\n" + "=" * 60)
            print("📥 INICIANDO IMPORTAÇÃO DE FEEDBACK")
            print("=" * 60)

            # Fazer backup antes de importar
            gerenciador_backup = GerenciadorBackup()
            backup_path = gerenciador_backup.fazer_backup("pre_feedback")
            if backup_path:
                print(f"✅ Backup criado: {backup_path}")

            # Baixar a planilha
            print(f"📤 Baixando de: {self.url}")
            response = requests.get(self.url, timeout=10)
            response.raise_for_status()
            print(f"✅ Download concluído ({len(response.content)} bytes)")

            # Tentar diferentes encodings
            encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
            df = None

            for encoding in encodings:
                try:
                    content = response.content.decode(encoding)
                    df = pd.read_csv(StringIO(content))
                    print(f"✅ Sucesso com encoding: {encoding}")
                    break
                except Exception as e:
                    print(f"⚠️ Falha com {encoding}: {e}")
                    continue

            if df is None:
                # Último recurso
                content = response.content.decode('utf-8', errors='ignore')
                df = pd.read_csv(StringIO(content))
                print("⚠️ Usando fallback com ignore")

            print(f"✅ CSV carregado: {len(df)} linhas")
            print(f"📋 Colunas encontradas: {df.columns.tolist()}")

            # Verificar se as colunas esperadas existem
            colunas_esperadas = ['Carimbo de data/hora', 'PROFISSIONAL',
                                 'POSITIVO OU NEGATIVO ?', 'O QUE HOUVE ?',
                                 'DESCREVA O OCORRIDO!!']

            for coluna in colunas_esperadas:
                if coluna not in df.columns:
                    print(f"⚠️ Coluna '{coluna}' não encontrada!")
                    # Tentar encontrar coluna similar
                    for col in df.columns:
                        if coluna.lower() in col.lower():
                            print(f"   → Renomeando '{col}' para '{coluna}'")
                            df.rename(columns={col: coluna}, inplace=True)
                            break

            # Processar dados
            feedbacks = []
            erros = 0

            for idx, row in df.iterrows():
                try:
                    # 1. Processar data/hora
                    data_str = str(row.get('Carimbo de data/hora', ''))
                    ano = 0
                    mes = 0

                    # Tentar diferentes formatos de data
                    formatos = [
                        '%d/%m/%Y %H:%M:%S',  # 12/01/2025 10:40:37
                        '%d/%m/%Y %H:%M',  # 12/01/2025 10:40
                        '%d/%m/%Y',  # 12/01/2025
                        '%Y-%m-%d %H:%M:%S',  # 2025-01-12 10:40:37
                        '%Y-%m-%d'  # 2025-01-12
                    ]

                    for fmt in formatos:
                        try:
                            data_obj = datetime.strptime(data_str.strip(), fmt)
                            ano = data_obj.year
                            mes = data_obj.month
                            break
                        except:
                            continue

                    # 2. Processar profissional (COM CORREÇÃO DE ACENTOS)
                    profissional = self._corrigir_nome_profissional(
                        row.get('PROFISSIONAL', 'NÃO IDENTIFICADO')
                    )

                    # 3. Processar tipo (POSITIVO/NEGATIVO)
                    tipo = str(row.get('POSITIVO OU NEGATIVO ?', '')).strip().upper()
                    tipo = self._corrigir_texto_geral(tipo)
                    if 'POSITIVO' in tipo:
                        tipo = 'POSITIVO'
                    elif 'NEGATIVO' in tipo:
                        tipo = 'NEGATIVO'
                    else:
                        tipo = 'NÃO ESPECIFICADO'

                    # 4. Processar "O QUE HOUVE ?"
                    oque_houve = self._corrigir_texto_geral(
                        row.get('O QUE HOUVE ?', '')
                    )

                    # 5. Processar comentário (DESCREVA O OCORRIDO!!)
                    comentario = self._corrigir_texto_geral(
                        row.get('DESCREVA O OCORRIDO!!', '')
                    )

                    # Se comentário estiver vazio, usar oque_houve
                    if not comentario and oque_houve:
                        comentario = oque_houve

                    feedbacks.append({
                        'ano': ano,
                        'mes': mes,
                        'profissional': profissional,
                        'tipo': tipo,
                        'oque_houve': oque_houve,
                        'comentario': comentario,
                        'data': data_str
                    })

                    # Mostrar exemplo do primeiro feedback para debug
                    if idx == 0:
                        print(f"\n🔍 EXEMPLO DO PRIMEIRO FEEDBACK:")
                        print(f"   Data: {data_str} → Ano: {ano}, Mês: {mes}")
                        print(f"   Profissional: {profissional}")
                        print(f"   Tipo: {tipo}")
                        print(f"   O que houve: {oque_houve}")
                        print(f"   Comentário: {comentario}")
                        print("-" * 40)

                except Exception as e:
                    erros += 1
                    print(f"⚠️ Erro na linha {idx + 2}: {e}")
                    continue

            print(f"\n📊 Processados: {len(feedbacks)} feedbacks válidos")
            if erros > 0:
                print(f"⚠️ Linhas com erro: {erros}")

            if not feedbacks:
                print("❌ Nenhum feedback válido encontrado!")
                return False, 0

            # Criar DataFrame
            df_novo = pd.DataFrame(feedbacks)

            # Garantir ordem das colunas
            colunas = ['ano', 'mes', 'profissional', 'tipo', 'oque_houve', 'comentario', 'data']
            df_novo = df_novo[colunas]

            # Mostrar estatísticas
            print(f"\n📊 FEEDBACKS POR TIPO:")
            print(df_novo['tipo'].value_counts())
            print(f"\n📊 PROFISSIONAIS:")
            print(df_novo['profissional'].value_counts().head())

            # Salvar na base
            if sobrescrever:
                # Substituir completamente
                self.base_dados.df_geral['FEEDBACK'] = df_novo
                print("✅ Modo SOBRESCREVER: dados antigos substituídos")
            else:
                # Adicionar aos existentes
                if 'FEEDBACK' in self.base_dados.df_geral and not self.base_dados.df_geral['FEEDBACK'].empty:
                    df_existente = self.base_dados.df_geral['FEEDBACK']
                    df_combinado = pd.concat([df_existente, df_novo], ignore_index=True)
                    df_combinado = df_combinado.drop_duplicates()
                    self.base_dados.df_geral['FEEDBACK'] = df_combinado
                    print(f"✅ Modo APPEND: adicionados {len(df_novo)}, total: {len(df_combinado)}")
                else:
                    self.base_dados.df_geral['FEEDBACK'] = df_novo
                    print("✅ Primeira importação")

            # Salvar
            self.base_dados.salvar()

            # Estatísticas finais
            df_final = self.base_dados.df_geral['FEEDBACK']
            print(f"\n✅ TOTAL NA BASE: {len(df_final)} feedbacks")
            print(f"   Profissionais: {df_final['profissional'].nunique()}")
            print(f"   Período: {df_final['ano'].min()}-{df_final['ano'].max()}")

            return True, len(df_novo)

        except Exception as e:
            print(f"❌ Erro na importação: {e}")
            import traceback
            traceback.print_exc()
            return False, 0


# ============================================================================
# INTERFACE GRÁFICA PRINCIPAL (ATUALIZADA)
# ============================================================================

class InterfaceGraficaNodri:
    """Interface gráfica principal do sistema unificado"""

    def __init__(self, root):
        self.root = root
        self.base_dados = BaseDadosNodri()
        self.sistema_coleta = SistemaColetaNodri()
        self.sistema_coleta.set_base_dados(self.base_dados)
        self.gerenciador_backup = GerenciadorBackup()
        self.threads_ativas = []
        self.coleta_ativa = False
        self._historico_coletas = self._carregar_historico_coletas()
        self._agendamento_ativo = False
        self._agendamento_thread = None
        self._centralizar_janela()
        self.configurar_interface()

    def iniciar_importacao_automatica(self):
        """Inicia a importação automática de feedback ao abrir o programa"""

        # Desabilitar todas as abas durante a importação
        for i in range(self.notebook.index("end")):
            self.notebook.tab(i, state="disabled")

        # Ir para a aba de feedback
        self.notebook.select(self.aba_feedback)

        # Mostrar mensagem
        messagebox.showinfo("Importação Automática",
                            "O sistema iniciará a importação automática dos feedbacks.\n"
                            "Aguarde a conclusão para utilizar as outras funções.")

        # Iniciar importação em thread
        thread = threading.Thread(target=self.executar_importacao_automatica)
        thread.daemon = True
        thread.start()
        self.threads_ativas.append(thread)

    def executar_importacao_automatica(self):
        """Executa a importação automática em thread"""
        try:
            # Atualizar log na interface
            self.root.after(0, lambda: self.feedback_log.delete(1.0, tk.END))
            self.root.after(0, lambda: self.log_feedback("🚀 INICIANDO IMPORTAÇÃO AUTOMÁTICA DE FEEDBACK"))
            self.root.after(0, lambda: self.log_feedback(f"📤 URL: {self.coletor_feedback.url}"))

            # Atualizar status
            self.root.after(0, lambda: self.status_feedback_label.config(
                text="🔄 Importando feedbacks automaticamente...", fg='#17a2b8'))
            self.root.after(0, lambda: self.progresso_feedback.start())

            # Executar importação
            sucesso, qtd = self.coletor_feedback.coletar_e_salvar(sobrescrever=True)

            if sucesso and qtd > 0:
                self.root.after(0, lambda: self.log_feedback(f"✅ {qtd} feedbacks importados com sucesso!"))

                # Atualizar estatísticas
                self.root.after(0, self._atualizar_estatisticas_feedback)

                df_feedback = self.base_dados.df_geral.get('FEEDBACK', pd.DataFrame())
                total = len(df_feedback)
                profissionais = df_feedback['profissional'].nunique() if not df_feedback.empty else 0
                positivos = len(
                    df_feedback[df_feedback['tipo'].str.contains('POSITIVO', na=False)]) if not df_feedback.empty else 0
                negativos = len(
                    df_feedback[df_feedback['tipo'].str.contains('NEGATIVO', na=False)]) if not df_feedback.empty else 0

                self.root.after(0, lambda: self.status_feedback_label.config(
                    text=f"✅ Importação automática concluída! {qtd} feedbacks importados.", fg='#28a745'))

                self.root.after(0, lambda: messagebox.showinfo(
                    "Importação Automática Concluída",
                    f"✅ {qtd} feedbacks importados com sucesso!\n\n"
                    f"📊 TOTAL NA BASE:\n"
                    f"• Feedbacks: {total}\n"
                    f"• Profissionais: {profissionais}\n"
                    f"• Positivos: {positivos}\n"
                    f"• Negativos: {negativos}\n\n"
                    "Agora você pode utilizar todas as funções do sistema."
                ))

            elif sucesso and qtd == 0:
                self.root.after(0, lambda: self.log_feedback("⚠️ Nenhum feedback novo encontrado"))
                self.root.after(0, lambda: self.status_feedback_label.config(
                    text="⚠️ Nenhum feedback encontrado na planilha", fg='#ffc107'))
                self.root.after(0, lambda: messagebox.showwarning(
                    "Importação Automática",
                    "Nenhum feedback encontrado na planilha!\n\n"
                    "Você pode continuar usando o sistema normalmente."
                ))
            else:
                self.root.after(0, lambda: self.log_feedback("❌ Erro na importação automática"))
                self.root.after(0, lambda: self.status_feedback_label.config(
                    text="❌ Erro na importação automática", fg='#dc3545'))
                self.root.after(0, lambda: messagebox.showerror(
                    "Erro na Importação",
                    "Erro ao importar feedbacks automaticamente.\n\n"
                    "Verifique sua conexão com a internet e tente novamente mais tarde."
                ))

        except Exception as e:
            self.root.after(0, lambda: self.log_feedback(f"❌ Erro: {str(e)}"))
            import traceback
            self.root.after(0, lambda: self.log_feedback(traceback.format_exc()))
            self.root.after(0, lambda: self.status_feedback_label.config(
                text=f"❌ Erro: {str(e)[:50]}...", fg='#dc3545'))
            self.root.after(0, lambda: messagebox.showerror(
                "Erro",
                f"Erro na importação automática:\n{str(e)}"
            ))

        finally:
            # Marcar como concluído
            self.importacao_automatica_concluida = True

            # Parar progresso
            self.root.after(0, lambda: self.progresso_feedback.stop())

            # Reabilitar todas as abas
            for i in range(self.notebook.index("end")):
                self.root.after(0, lambda idx=i: self.notebook.tab(idx, state="normal"))

    def executar_importacao_feedback(self):
        """Executa importação de feedback em thread"""
        try:
            self.root.after(0, lambda: self.feedback_log.delete(1.0, tk.END))
            self.log_feedback("🚀 INICIANDO IMPORTAÇÃO DE FEEDBACK")
            self.log_feedback(f"📤 URL: {self.coletor_feedback.url}")

            # Usar o método coletar_e_salvar (agora corrigido)
            sucesso, qtd = self.coletor_feedback.coletar_e_salvar(sobrescrever=True)

            if sucesso and qtd > 0:
                self.log_feedback(f"✅ {qtd} feedbacks importados com sucesso!")

                # Atualizar estatísticas na interface
                df_feedback = self.base_dados.df_geral.get('FEEDBACK', pd.DataFrame())
                total = len(df_feedback)
                profissionais = df_feedback['profissional'].nunique() if not df_feedback.empty else 0

                # Contar positivos e negativos
                positivos = len(
                    df_feedback[df_feedback['tipo'].str.contains('POSITIVO', na=False)]) if not df_feedback.empty else 0
                negativos = len(
                    df_feedback[df_feedback['tipo'].str.contains('NEGATIVO', na=False)]) if not df_feedback.empty else 0

                self.root.after(0, lambda: messagebox.showinfo(
                    "Sucesso",
                    f"✅ {qtd} feedbacks importados com sucesso!\n\n"
                    f"📊 TOTAL NA BASE:\n"
                    f"• Feedbacks: {total}\n"
                    f"• Profissionais: {profissionais}\n"
                    f"• Positivos: {positivos}\n"
                    f"• Negativos: {negativos}"
                ))

                # Atualizar estatísticas na aba
                self._atualizar_estatisticas_feedback()

            elif sucesso and qtd == 0:
                self.log_feedback("⚠️ Nenhum feedback novo encontrado")
                self.root.after(0, lambda: messagebox.showwarning(
                    "Aviso",
                    "Nenhum feedback encontrado na planilha!"
                ))
            else:
                self.log_feedback("❌ Erro na importação")
                self.root.after(0, lambda: messagebox.showerror(
                    "Erro",
                    "Erro ao importar feedbacks. Verifique o log para detalhes."
                ))

        except Exception as e:
            self.log_feedback(f"❌ Erro: {str(e)}")
            self.root.after(0, lambda: messagebox.showerror("Erro", str(e)))

    def abrir_importador_profissionais(self):
        """Abre janela para importar múltiplos profissionais de uma vez"""

        # Coletar todos os nomes únicos do dashboard profissional
        todos_nomes = set()

        # Buscar em todas as abas de profissionais
        for aba in ['PROF_PAGAMENTOS', 'PROF_TICKET', 'PROF_PREFERENCIA',
                    'PROF_OCUPACAO', 'PROF_SERVICOS', 'PROF_PRODUTOS']:
            df = self.base_dados.df_geral.get(aba, pd.DataFrame())
            if not df.empty and 'profissional' in df.columns:
                todos_nomes.update(df['profissional'].dropna().unique())

        # Nomes já cadastrados (NÃO DEVEM APARECER NA LISTA)
        nomes_cadastrados = {p['nome_completo'].upper() for p in
                             self.sistema_coleta.gerenciador_profissionais.profissionais}
        apelidos_cadastrados = {p['apelido'].upper() for p in
                                self.sistema_coleta.gerenciador_profissionais.profissionais}

        # Nomes que já foram usados como apelido também não devem aparecer
        nomes_usados = nomes_cadastrados.union(apelidos_cadastrados)

        # Filtrar apenas nomes NÃO CADASTRADOS
        nomes_nao_cadastrados = sorted([n for n in todos_nomes
                                        if n and str(n).upper() not in nomes_usados])

        if not nomes_nao_cadastrados:
            messagebox.showinfo("Info", "Não há novos profissionais para importar!")
            return

        # Criar janela com tamanho OTIMIZADO (sem scroll)
        janela = tk.Toplevel(self.root)
        janela.title("📋 IMPORTAR PROFISSIONAIS EM MASSA")
        janela.geometry("1500x800")  # Aumentei largura, reduzi altura para caber na tela
        janela.configure(bg='#ffffff')
        janela.transient(self.root)

        # Frame principal SEM SCROLL
        main_frame = tk.Frame(janela, bg='#ffffff', padx=15, pady=15)
        main_frame.pack(fill='both', expand=True)

        # Título
        tk.Label(main_frame, text="📋 IMPORTAR PROFISSIONAIS EM MASSA",
                 font=('Segoe UI', 14, 'bold'),  # Fonte menor
                 fg='#0f3460', bg='#ffffff').pack(pady=(0, 10))

        # Frame de instruções (compacto)
        info_frame = tk.LabelFrame(main_frame, text="ℹ️ INSTRUÇÕES",
                                   font=('Segoe UI', 9, 'bold'),
                                   bg='#ffffff', fg='#0f3460',
                                   padx=8, pady=5)
        info_frame.pack(fill='x', pady=(0, 10))

        info_text = "1. Selecione um nome → NOME COMPLETO | 2. Selecione outro → APELIDO | 3. CRIAR PAR | 4. Escolha categoria | 5. IMPORTAR"
        tk.Label(info_frame, text=info_text,
                 bg='#ffffff', font=('Segoe UI', 8),
                 justify='center').pack()

        # Frame principal com três colunas (mais compacto)
        listas_frame = tk.Frame(main_frame, bg='#ffffff')
        listas_frame.pack(fill='both', expand=True, pady=5)

        # ===== COLUNA ESQUERDA (DISPONÍVEIS) =====
        left_frame = tk.LabelFrame(listas_frame, text="📋 PROFISSIONAIS DISPONÍVEIS",
                                   font=('Segoe UI', 9, 'bold'),
                                   bg='#ffffff', fg='#0f3460',
                                   padx=8, pady=5)
        left_frame.pack(side='left', fill='both', expand=True, padx=(0, 5))

        # Busca na esquerda (compacta)
        left_search_frame = tk.Frame(left_frame, bg='#ffffff')
        left_search_frame.pack(fill='x', pady=(0, 5))

        tk.Label(left_search_frame, text="🔍:", bg='#ffffff',
                 font=('Segoe UI', 8)).pack(side='left', padx=(0, 2))

        left_search_var = tk.StringVar()
        left_search_entry = tk.Entry(left_search_frame, textvariable=left_search_var,
                                     font=('Segoe UI', 8), width=15)
        left_search_entry.pack(side='left', fill='x', expand=True)

        # Listbox esquerda (menor altura)
        left_list_frame = tk.Frame(left_frame, bg='#ffffff')
        left_list_frame.pack(fill='both', expand=True)

        left_scrollbar = tk.Scrollbar(left_list_frame)
        left_scrollbar.pack(side='right', fill='y')

        self.left_listbox = tk.Listbox(left_list_frame,
                                       selectmode='single',
                                       yscrollcommand=left_scrollbar.set,
                                       font=('Segoe UI', 9),
                                       height=15)  # Altura reduzida
        self.left_listbox.pack(side='left', fill='both', expand=True)
        left_scrollbar.config(command=self.left_listbox.yview)

        # Preencher lista esquerda
        for nome in nomes_nao_cadastrados:
            self.left_listbox.insert(tk.END, nome)

        # Função de busca na esquerda
        def filtrar_esquerda(*args):
            busca = left_search_var.get().lower()
            self.left_listbox.delete(0, tk.END)
            for nome in nomes_nao_cadastrados:
                if busca in nome.lower():
                    self.left_listbox.insert(tk.END, nome)

        left_search_var.trace('w', filtrar_esquerda)

        # ===== COLUNA DO MEIO (BOTÕES) =====
        middle_frame = tk.Frame(listas_frame, bg='#ffffff', width=120)
        middle_frame.pack(side='left', fill='y', padx=5)
        middle_frame.pack_propagate(False)

        # Espaço superior
        tk.Label(middle_frame, text="", bg='#ffffff', height=2).pack()

        # Variáveis para armazenar as escolhas
        self.nome_completo_escolhido = None
        self.apelido_escolhido = None

        # Label Nome Completo (compacto)
        tk.Label(middle_frame, text="NOME:", bg='#ffffff', fg='#0f3460',
                 font=('Segoe UI', 8, 'bold')).pack(pady=(5, 0))

        self.label_nome_escolhido = tk.Label(middle_frame, text="(nenhum)",
                                             bg='#f0f0f0', fg='#333',
                                             font=('Segoe UI', 8),
                                             width=15, height=1,
                                             relief='solid', borderwidth=1)
        self.label_nome_escolhido.pack(pady=2)

        def escolher_nome_completo():
            selecionados = self.left_listbox.curselection()
            if not selecionados:
                messagebox.showerror("Erro", "Selecione um profissional!")
                return
            self.nome_completo_escolhido = self.left_listbox.get(selecionados[0])
            self.label_nome_escolhido.config(text=self.nome_completo_escolhido[:15] + "..." if len(
                self.nome_completo_escolhido) > 15 else self.nome_completo_escolhido,
                                             fg='#28a745')

        tk.Button(middle_frame, text="→ NOME", command=escolher_nome_completo,
                  bg='#0f3460', fg='white', font=('Segoe UI', 8, 'bold'),
                  width=10, pady=2, cursor='hand2').pack(pady=2)

        # Label Apelido (compacto)
        tk.Label(middle_frame, text="APELIDO:", bg='#ffffff', fg='#0f3460',
                 font=('Segoe UI', 8, 'bold')).pack(pady=(5, 0))

        self.label_apelido_escolhido = tk.Label(middle_frame, text="(nenhum)",
                                                bg='#f0f0f0', fg='#333',
                                                font=('Segoe UI', 8),
                                                width=15, height=1,
                                                relief='solid', borderwidth=1)
        self.label_apelido_escolhido.pack(pady=2)

        def escolher_apelido():
            selecionados = self.left_listbox.curselection()
            if not selecionados:
                messagebox.showerror("Erro", "Selecione um profissional!")
                return
            self.apelido_escolhido = self.left_listbox.get(selecionados[0])
            self.label_apelido_escolhido.config(text=self.apelido_escolhido[:15] + "..." if len(
                self.apelido_escolhido) > 15 else self.apelido_escolhido,
                                                fg='#dc3545')

        tk.Button(middle_frame, text="→ APELIDO", command=escolher_apelido,
                  bg='#dc3545', fg='white', font=('Segoe UI', 8, 'bold'),
                  width=10, pady=2, cursor='hand2').pack(pady=2)

        # Botão CRIAR PAR (compacto)
        def criar_par():
            if not self.nome_completo_escolhido or not self.apelido_escolhido:
                messagebox.showerror("Erro", "Escolha Nome Completo e Apelido!")
                return

            if self.nome_completo_escolhido == self.apelido_escolhido:
                messagebox.showerror("Erro", "Nome Completo e Apelido não podem ser iguais!")
                return

            # Verificar se já não existe um par igual
            if hasattr(self, 'pares_importacao') and self.pares_importacao:
                for par in self.pares_importacao:
                    if (par['nome_completo'] == self.nome_completo_escolhido and
                            par['apelido'] == self.apelido_escolhido):
                        messagebox.showerror("Erro", "Este par já foi criado!")
                        return

            # Adicionar como par na lista direita
            par_texto = f"{self.nome_completo_escolhido[:12]}... → {self.apelido_escolhido[:12]}..."
            self.right_listbox.insert(tk.END, par_texto)

            # Guardar os dados do par
            if not hasattr(self, 'pares_importacao'):
                self.pares_importacao = []

            self.pares_importacao.append({
                'nome_completo': self.nome_completo_escolhido,
                'apelido': self.apelido_escolhido,
                'display': par_texto
            })

            # Remover os dois nomes da lista esquerda
            nomes_para_remover = [self.nome_completo_escolhido, self.apelido_escolhido]

            # Atualizar lista global
            novos_nomes = []
            for nome in nomes_nao_cadastrados:
                if nome not in nomes_para_remover:
                    novos_nomes.append(nome)

            nomes_nao_cadastrados.clear()
            nomes_nao_cadastrados.extend(novos_nomes)

            # Recarregar listbox esquerda
            self.left_listbox.delete(0, tk.END)
            for nome in nomes_nao_cadastrados:
                self.left_listbox.insert(tk.END, nome)

            # Limpar escolhas
            self.nome_completo_escolhido = None
            self.apelido_escolhido = None
            self.label_nome_escolhido.config(text="(nenhum)", fg='#333')
            self.label_apelido_escolhido.config(text="(nenhum)", fg='#333')

        tk.Button(middle_frame, text="✅ CRIAR PAR", command=criar_par,
                  bg='#28a745', fg='white', font=('Segoe UI', 8, 'bold'),
                  width=10, pady=3, cursor='hand2').pack(pady=5)

        # ===== COLUNA DIREITA (PARES) =====
        right_frame = tk.LabelFrame(listas_frame, text="✅ PARES CRIADOS",
                                    font=('Segoe UI', 9, 'bold'),
                                    bg='#ffffff', fg='#0f3460',
                                    padx=8, pady=5)
        right_frame.pack(side='left', fill='both', expand=True, padx=(5, 0))

        # Listbox direita (menor altura)
        right_list_frame = tk.Frame(right_frame, bg='#ffffff')
        right_list_frame.pack(fill='both', expand=True)

        right_scrollbar = tk.Scrollbar(right_list_frame)
        right_scrollbar.pack(side='right', fill='y')

        self.right_listbox = tk.Listbox(right_list_frame,
                                        selectmode='extended',
                                        yscrollcommand=right_scrollbar.set,
                                        font=('Segoe UI', 9),
                                        height=15)  # Altura reduzida
        self.right_listbox.pack(side='left', fill='both', expand=True)
        right_scrollbar.config(command=self.right_listbox.yview)

        # Botão REMOVER PAR (compacto)
        def remover_par():
            selecionados = self.right_listbox.curselection()
            if not selecionados:
                messagebox.showerror("Erro", "Selecione um par para remover!")
                return

            for i in reversed(selecionados):
                par_texto = self.right_listbox.get(i)

                for j, par in enumerate(self.pares_importacao):
                    if par['display'] == par_texto:
                        # Devolver os nomes para a lista esquerda
                        nome1 = par['nome_completo']
                        nome2 = par['apelido']

                        if nome1 not in nomes_nao_cadastrados:
                            nomes_nao_cadastrados.append(nome1)
                        if nome2 not in nomes_nao_cadastrados:
                            nomes_nao_cadastrados.append(nome2)

                        del self.pares_importacao[j]
                        break

                self.right_listbox.delete(i)

            nomes_nao_cadastrados.sort()
            self.left_listbox.delete(0, tk.END)
            for nome in nomes_nao_cadastrados:
                self.left_listbox.insert(tk.END, nome)

        tk.Button(right_frame, text="🗑️ REMOVER PAR", command=remover_par,
                  bg='#dc3545', fg='white', font=('Segoe UI', 8, 'bold'),
                  cursor='hand2').pack(pady=5)

        # ===== FRAME DE CATEGORIA (compacto) =====
        categoria_frame = tk.LabelFrame(main_frame, text="🏷️ CATEGORIA",
                                        font=('Segoe UI', 9, 'bold'),
                                        bg='#ffffff', fg='#0f3460',
                                        padx=8, pady=5)
        categoria_frame.pack(fill='x', pady=5)

        # Frame horizontal para categoria
        cat_horizontal = tk.Frame(categoria_frame, bg='#ffffff')
        cat_horizontal.pack()

        # Opções de categoria
        opcoes_categoria = self.sistema_coleta.gerenciador_profissionais.categorias.copy()
        opcoes_categoria.append("Nova Categoria...")

        self.categoria_import_var = tk.StringVar()
        categoria_combo = ttk.Combobox(cat_horizontal,
                                       textvariable=self.categoria_import_var,
                                       values=opcoes_categoria,
                                       width=25)
        categoria_combo.pack(side='left', padx=(0, 5))

        # Entrada para nova categoria
        self.nova_categoria_import = tk.Entry(cat_horizontal, width=20,
                                              font=('Segoe UI', 8),
                                              state='disabled')
        self.nova_categoria_import.pack(side='left', padx=(0, 5))

        def on_categoria_change(*args):
            if self.categoria_import_var.get() == "Nova Categoria...":
                self.nova_categoria_import.config(state='normal')
            else:
                self.nova_categoria_import.config(state='disabled')
                self.nova_categoria_import.delete(0, tk.END)

        self.categoria_import_var.trace('w', on_categoria_change)

        # Botão adicionar categoria (compacto)
        tk.Button(cat_horizontal, text="➕", width=2,
                  command=lambda: self.adicionar_categoria_import(
                      self.nova_categoria_import.get().strip()),
                  bg='#17a2b8', fg='white',
                  font=('Segoe UI', 8, 'bold'),
                  cursor='hand2').pack(side='left')

        # ===== FRAME DE AÇÕES (compacto) =====
        action_frame = tk.LabelFrame(main_frame, text="⚡ AÇÕES",
                                     font=('Segoe UI', 9, 'bold'),
                                     bg='#ffffff', fg='#0f3460',
                                     padx=8, pady=5)
        action_frame.pack(fill='x', pady=5)

        # Label de status
        self.status_import = tk.Label(action_frame, text="",
                                      bg='#ffffff', fg='#28a745',
                                      font=('Segoe UI', 8, 'bold'))
        self.status_import.pack()

        # Frame para os botões (horizontal)
        btn_frame = tk.Frame(action_frame, bg='#ffffff')
        btn_frame.pack(pady=5)

        def importar_selecionados():
            # Verificar categoria
            categoria = self.categoria_import_var.get()
            if categoria == "Nova Categoria...":
                nova_cat = self.nova_categoria_import.get().strip()
                if not nova_cat:
                    messagebox.showerror("Erro", "Digite o nome da nova categoria!")
                    return
                categoria = nova_cat
                if categoria not in self.sistema_coleta.gerenciador_profissionais.categorias:
                    self.sistema_coleta.gerenciador_profissionais.adicionar_categoria(categoria)

            if not categoria:
                messagebox.showerror("Erro", "Selecione uma categoria!")
                return

            if not hasattr(self, 'pares_importacao') or not self.pares_importacao:
                messagebox.showerror("Erro", "Crie pelo menos um par!")
                return

            importados = 0
            for par in self.pares_importacao:
                sucesso, msg = self.sistema_coleta.gerenciador_profissionais.adicionar_profissional(
                    par['nome_completo'], par['apelido'], categoria
                )
                if sucesso:
                    importados += 1

            self.atualizar_lista_profissionais()
            self.status_import.config(text=f"✅ {importados} profissionais importados com sucesso!")

            if importados > 0:
                if messagebox.askyesno("Sucesso",
                                       f"{importados} profissionais importados!\n\n"
                                       "Deseja fechar o importador?"):
                    janela.destroy()
                else:
                    self.pares_importacao = []
                    self.right_listbox.delete(0, tk.END)

        # Botões de ação (compactos)
        tk.Button(btn_frame, text="✅ IMPORTAR", command=importar_selecionados,
                  bg='#28a745', fg='white', font=('Segoe UI', 9, 'bold'),
                  padx=15, pady=5, cursor='hand2').pack(side='left', padx=2)

        tk.Button(btn_frame, text="💾 SALVAR", command=self.salvar_pares_configuracao,
                  bg='#ffc107', fg='black', font=('Segoe UI', 9, 'bold'),
                  padx=15, pady=5, cursor='hand2').pack(side='left', padx=2)

        tk.Button(btn_frame, text="❌ FECHAR", command=janela.destroy,
                  bg='#6c757d', fg='white', font=('Segoe UI', 9, 'bold'),
                  padx=15, pady=5, cursor='hand2').pack(side='left', padx=2)

    def salvar_pares_configuracao(self):
        """Salva os pares selecionados no arquivo de configuração"""
        if not hasattr(self, 'pares_importacao') or not self.pares_importacao:
            messagebox.showerror("Erro", "Não há pares para salvar!")
            return

        # Carregar configuração existente
        config_file = ARQUIVO_CONFIG
        if os.path.exists(config_file):
            with open(config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
        else:
            config = {}

        # Adicionar pares à configuração
        config['pares_importacao_pendentes'] = [
            {
                'nome_completo': par['nome_completo'],
                'apelido': par['apelido']
            }
            for par in self.pares_importacao
        ]

        # Salvar arquivo
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=4, ensure_ascii=False)

        messagebox.showinfo("Sucesso", f"✅ {len(self.pares_importacao)} pares salvos com sucesso!\n\n"
                                       "Você pode fechar o programa e importar depois.")

    def adicionar_categoria_import(self, nova_categoria):
        """Adiciona categoria no importador"""
        if not nova_categoria:
            messagebox.showerror("Erro", "Digite uma categoria!")
            return

        sucesso, msg = self.sistema_coleta.gerenciador_profissionais.adicionar_categoria(nova_categoria)

        if sucesso:
            messagebox.showinfo("Sucesso", msg)
            self.nova_categoria_import.delete(0, tk.END)
            # Atualizar combobox
            opcoes = self.sistema_coleta.gerenciador_profissionais.categorias.copy()
            opcoes.append("Nova Categoria...")
            self.categoria_import_var.set(nova_categoria)
            # Encontrar o widget combobox e atualizar
            for widget in self.nova_categoria_import.master.winfo_children():
                if isinstance(widget, ttk.Combobox):
                    widget['values'] = opcoes
        else:
            messagebox.showerror("Erro", msg)

    def gerar_dashboard_todos_profissionais(self):
        """Gera dashboard com todos os profissionais e multi-seleção"""
        try:
            # Usar o novo gerador - PASSANDO O GERENCIADOR DE PROFISSIONAIS
            gerador = GeradorDashboardProfissionalMulti(
                self.base_dados,
                self.sistema_coleta.gerenciador_profissionais  # ← ADICIONE ESTE PARÂMETRO
            )
            filename = gerador.gerar_dashboard_completo()

            if filename and os.path.exists(filename):
                webbrowser.open(f'file://{os.path.abspath(filename)}')
                messagebox.showinfo("Sucesso",
                                    "✅ Dashboard de todos os profissionais gerado!\n\n"
                                    "O relatório contém:\n"
                                    "• Unificação automática de nomes\n"
                                    "• Busca em tempo real por profissionais\n"
                                    "• Seleção de múltiplos períodos (checkboxes)\n"
                                    "• TODOS os dados das abas (pagamentos, ticket, preferência, ocupação, serviços, produtos)\n"
                                    "• Taxas de crescimento para cada serviço e produto\n"
                                    "• Gráficos comparativos de Janeiro a Dezembro\n"
                                    "• Barras lado a lado para múltiplos anos\n"
                                    "• Tabelas detalhadas com todos os períodos")
            else:
                messagebox.showerror("Erro", "Erro ao gerar dashboard")
        except Exception as e:
            messagebox.showerror("Erro", f"Erro ao gerar dashboard: {str(e)}")
            logging.error(f"Erro no dashboard todos profissionais: {e}")

    def gerar_relatorio_unico(self):
        """Gera um único relatório HTML com todos os dados"""
        try:
            gerador = GeradorRelatorioUnico(self.base_dados)
            filename = gerador.gerar_relatorio_completo()

            if filename and os.path.exists(filename):
                webbrowser.open(f'file://{os.path.abspath(filename)}')
                messagebox.showinfo("Sucesso",
                                    f"✅ Relatório único gerado com sucesso!\n\n"
                                    f"Arquivo: {filename}\n\n"
                                    f"O relatório contém:\n"
                                    f"• Dashboard do Salão com gráficos anuais\n"
                                    f"• Todos os profissionais com busca por nome\n"
                                    f"• Dados consolidados de todos os profissionais\n"
                                    f"• Taxas de crescimento dinâmicas\n"
                                    f"• Filtros em tempo real")
            else:
                messagebox.showerror("Erro", "Erro ao gerar relatório")
        except Exception as e:
            messagebox.showerror("Erro", f"Erro ao gerar relatório: {str(e)}")

    def procurar_base_automaticamente(self):
        """Procura a base de dados em todo computador"""
        logging.info("🔍 Iniciando busca automática da base de dados...")
        bases_encontradas = self.gerenciador_backup.procurar_base_em_todo_pc()

        if bases_encontradas:
            if len(bases_encontradas) > 1:
                msg = "Múltiplas bases encontradas:\n\n"
                for i, base in enumerate(bases_encontradas, 1):
                    msg += f"{i}. {base}\n"
                msg += "\nDeseja usar a primeira encontrada?"

                if messagebox.askyesno("Bases Encontradas", msg):
                    self.base_dados.arquivo = bases_encontradas[0]
                    self.base_dados.carregar_ou_criar_base()
                    logging.info(f"✅ Usando base: {bases_encontradas[0]}")
            else:
                if messagebox.askyesno("Base Encontrada",
                                       f"Base de dados encontrada em:\n{bases_encontradas[0]}\n\nDeseja usar esta base?"):
                    self.base_dados.arquivo = bases_encontradas[0]
                    self.base_dados.carregar_ou_criar_base()
                    logging.info(f"✅ Usando base: {bases_encontradas[0]}")
        else:
            logging.info("⚠️ Nenhuma base encontrada. Usando base padrão.")

    def _centralizar_janela(self):
        """Centraliza a janela corretamente em qualquer monitor (multi-monitor)."""
        try:
            import ctypes
            user32 = ctypes.windll.user32
            sw = user32.GetSystemMetrics(0)
            sh = user32.GetSystemMetrics(1)
            # nunca maior que o monitor (desconta ~80px da barra de tarefas)
            w = min(1400, sw - 20)
            h = min(860, sh - 80)
            x = max(0, (sw - w) // 2)
            y = max(0, (sh - h) // 2)
            self.root.geometry(f"{w}x{h}+{x}+{y}")
        except Exception:
            self.root.geometry("1400x860")

    def configurar_interface(self):
        """Configura a interface gráfica — 2 abas: Histórica e Manual."""
        FP = FONT_PRIMARY

        self.root.title(f"NODRI v4.0 — Coleta de Dados  |  {SALAO_NOME_PADRAO}")
        self.root.configure(bg="#0f3460")

        try:
            self.root.state('zoomed')
        except Exception:
            pass

        # ── HEADER ─────────────────────────────────────────────────────────
        header = tk.Frame(self.root, bg='#0f3460', height=70)
        header.pack(fill='x')
        header.pack_propagate(False)

        tk.Label(header,
                 text="  NODRI v4.0",
                 font=(FP, 22, 'bold'), fg='#ffffff', bg='#0f3460',
                 anchor='w').pack(side='left', padx=20)

        tk.Label(header,
                 text="Coleta Automática de Dados do Salão",
                 font=(FP, 11), fg='#a0c4ff', bg='#0f3460').pack(side='left')

        # info do arquivo que será gerado
        self._label_arquivo = tk.Label(
            header,
            text=f"📄 {os.path.basename(self.base_dados.arquivo)}",
            font=(FP, 9), fg='#66ff99', bg='#0f3460', anchor='e')
        self._label_arquivo.pack(side='right', padx=20)

        tk.Button(header,
                  text="💾 Backup",
                  command=self.abrir_painel_backup,
                  bg='#28a745', fg='white',
                  font=(FP, 10, 'bold'),
                  padx=12, pady=4, relief='flat', cursor='hand2',
                  activebackground='#1e7e34').pack(side='right', padx=6, pady=16)

        tk.Button(header,
                  text="🔕 Bandeja",
                  command=self.ativar_modo_bandeja,
                  bg='#6c757d', fg='white',
                  font=(FP, 10, 'bold'),
                  padx=10, pady=4, relief='flat', cursor='hand2').pack(side='right', padx=4, pady=16)

        # ── LOGIN GLOBAL (OCULTO) ───────────────────────────────────────────
        # A barra de login de um salão só foi RETIRADA da tela: agora cada salão
        # tem seu próprio login em "Salões e Agendamento". Os campos continuam
        # sendo criados (mas não exibidos) para não quebrar nada que os usa.
        login_bar = tk.Frame(self.root, bg='#1a2a4a', height=40)
        login_bar.pack_propagate(False)

        tk.Label(login_bar, text='🔐 LOGIN:', bg='#1a2a4a', fg='#a0c4ff',
                 font=(FP, 10, 'bold')).pack(side='left', padx=(20, 6))
        self.email_global = tk.Entry(login_bar, width=28, font=(FP, 10),
                                     relief='flat', bg='#2a3a5a', fg='white',
                                     insertbackground='white')
        self.email_global.pack(side='left', padx=(0, 10), pady=6)
        _em = self.sistema_coleta.config.get('email', '')
        if _em:
            self.email_global.insert(0, _em)

        tk.Label(login_bar, text='Senha:', bg='#1a2a4a', fg='#a0c4ff',
                 font=(FP, 10, 'bold')).pack(side='left', padx=(0, 6))
        self.senha_global = tk.Entry(login_bar, width=18, show='*', font=(FP, 10),
                                     relief='flat', bg='#2a3a5a', fg='white',
                                     insertbackground='white')
        self.senha_global.pack(side='left', padx=(0, 8), pady=6)
        _se = self.sistema_coleta.config.get('senha', '')
        if _se:
            self.senha_global.insert(0, _se)

        self._ver_senha_global_var = tk.BooleanVar(value=False)
        def _toggle_ver():
            self.senha_global.config(show='' if self._ver_senha_global_var.get() else '*')
        ttk.Checkbutton(login_bar, text='Ver senha',
                        variable=self._ver_senha_global_var,
                        command=_toggle_ver).pack(side='left', padx=6)

        tk.Button(login_bar, text='💾 Salvar login',
                  command=self._salvar_login_global,
                  bg='#27ae60', fg='white', font=(FP, 9, 'bold'),
                  padx=10, pady=2, relief='flat', cursor='hand2').pack(side='left', padx=8)

        # ── NOTEBOOK ───────────────────────────────────────────────────────
        style = ttk.Style()
        style.theme_use('clam')
        style.configure('TNotebook',             background='#0f3460', borderwidth=0)
        style.configure('TNotebook.Tab',
                        font=(FP, 11, 'bold'),
                        padding=[22, 8],
                        background='#1a2a4a', foreground='#a0c4ff')
        style.map('TNotebook.Tab',
                  background=[('selected', '#ffffff')],
                  foreground=[('selected', '#0f3460')])

        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill='both', expand=True, padx=0, pady=0)

        # Abas de coleta MANUAL retiradas da tela. Os frames continuam sendo
        # criados e configurados (mais abaixo), mas NÃO são adicionados ao
        # notebook — então não aparecem, e nada que os referencia quebra.
        self.aba_historico = tk.Frame(self.notebook, bg='#f4f7fb')

        self.aba_manual = tk.Frame(self.notebook, bg='#f4f7fb')

        self.aba_agendamento = tk.Frame(self.notebook, bg='#f4f7fb')
        self.notebook.add(self.aba_agendamento, text='  ⏰  AGENDAMENTO  ')

        # COLETA HISTORICA de volta ao menu (pedido do dono, 25/08/2026). A tela
        # ja existia pronta e configurada por configurar_aba_historico(); estava
        # so fora do notebook. E por isso que trazer de volta e uma linha: nada
        # da logica de coleta foi tocado.
        self.notebook.add(self.aba_historico, text='  📅  COLETA HISTÓRICA  ')

        self.aba_saude = tk.Frame(self.notebook, bg='#f4f7fb')
        self.notebook.add(self.aba_saude, text='  📊  SAÚDE  ')

        self.aba_historico_coletas = tk.Frame(self.notebook, bg='#f4f7fb')
        self.notebook.add(self.aba_historico_coletas, text='  📈  HISTÓRICO  ')

        self.aba_exportar = tk.Frame(self.notebook, bg='#f4f7fb')
        self.notebook.add(self.aba_exportar, text='  📤  EXPORTAR  ')

        self.aba_config = tk.Frame(self.notebook, bg='#f4f7fb')
        self.notebook.add(self.aba_config, text='  ⚙️  CONFIG  ')

        self.aba_logs = tk.Frame(self.notebook, bg='#f4f7fb')
        self.notebook.add(self.aba_logs, text='  📋  LOGS  ')

        self.configurar_aba_historico()
        self.configurar_aba_manual()
        self.configurar_aba_agendamento()
        self.configurar_aba_saude_dados()
        self.configurar_aba_historico_coletas()
        self.configurar_aba_exportar()
        self.configurar_aba_configuracoes()
        self.configurar_aba_logs()

    def abrir_painel_backup(self):
        """Abre painel de backup e restauração"""
        janela = tk.Toplevel(self.root)
        janela.title("💾 BACKUP & RESTAURAÇÃO")
        janela.geometry("800x600")
        janela.configure(bg='#ffffff')

        container = tk.Frame(janela, bg='#ffffff', padx=20, pady=20)
        container.pack(fill='both', expand=True)

        tk.Label(container, text='💾 GERENCIADOR DE BACKUP',
                 font=('Segoe UI', 18, 'bold'),
                 fg='#0f3460', bg='#ffffff').pack(pady=(0, 20))

        # Frame de backup manual
        backup_frame = tk.LabelFrame(container, text='📤 FAZER BACKUP',
                                     font=('Segoe UI', 12, 'bold'),
                                     bg='#ffffff', fg='#0f3460',
                                     padx=15, pady=15)
        backup_frame.pack(fill='x', pady=(0, 20))

        tk.Label(backup_frame, text='Clique para fazer um backup manual da base de dados:',
                 bg='#ffffff', font=('Segoe UI', 10)).pack(anchor='w', pady=5)

        btn_frame = tk.Frame(backup_frame, bg='#ffffff')
        btn_frame.pack(pady=10)

        tk.Button(btn_frame,
                  text='💾 FAZER BACKUP AGORA',
                  command=self.fazer_backup_manual,
                  bg='#28a745',
                  fg='white',
                  font=('Segoe UI', 12, 'bold'),
                  padx=30,
                  pady=10,
                  cursor='hand2').pack()

        # Frame de restauração
        restaurar_frame = tk.LabelFrame(container, text='📥 RESTAURAR BACKUP',
                                        font=('Segoe UI', 12, 'bold'),
                                        bg='#ffffff', fg='#0f3460',
                                        padx=15, pady=15)
        restaurar_frame.pack(fill='both', expand=True)

        tk.Label(restaurar_frame, text='Selecione um backup para restaurar:',
                 bg='#ffffff', font=('Segoe UI', 10)).pack(anchor='w', pady=5)

        # Lista de backups
        self.backup_listbox = tk.Listbox(restaurar_frame, height=10, font=('Consolas', 10))
        self.backup_listbox.pack(fill='both', expand=True, pady=10)

        # Preencher lista com os 3 últimos backups
        ultimos_backups = self.gerenciador_backup.get_ultimos_backups(3)
        for backup in ultimos_backups:
            self.backup_listbox.insert(tk.END,
                                       f"{backup['data'].strftime('%d/%m/%Y %H:%M:%S')} - {backup['tamanho_mb']} MB - {backup['nome']}")

        # Botões de ação
        btn_frame2 = tk.Frame(restaurar_frame, bg='#ffffff')
        btn_frame2.pack(pady=10)

        tk.Button(btn_frame2,
                  text='🔄 VERIFICAR INTEGRIDADE',
                  command=self.verificar_backup_selecionado,
                  bg='#17a2b8',
                  fg='white',
                  font=('Segoe UI', 10),
                  padx=20,
                  pady=5,
                  cursor='hand2').pack(side='left', padx=5)

        tk.Button(btn_frame2,
                  text='📥 RESTAURAR BACKUP',
                  command=self.restaurar_backup_selecionado,
                  bg='#dc3545',
                  fg='white',
                  font=('Segoe UI', 10, 'bold'),
                  padx=20,
                  pady=5,
                  cursor='hand2').pack(side='left', padx=5)

        tk.Button(btn_frame2,
                  text='📁 ABRIR PASTA BACKUPS',
                  command=self.abrir_pasta_backups,
                  bg='#6c757d',
                  fg='white',
                  font=('Segoe UI', 10),
                  padx=20,
                  pady=5,
                  cursor='hand2').pack(side='left', padx=5)

    def fazer_backup_manual(self):
        """Faz backup manual"""
        caminho = self.gerenciador_backup.fazer_backup("manual")
        if caminho:
            messagebox.showinfo("Sucesso", f"Backup criado com sucesso!\n\n{caminho}")
            # Atualizar lista
            self.atualizar_lista_backups()
        else:
            messagebox.showerror("Erro", "Erro ao criar backup!")

    def verificar_backup_selecionado(self):
        """Verifica integridade do backup selecionado"""
        selecao = self.backup_listbox.curselection()
        if not selecao:
            messagebox.showerror("Erro", "Selecione um backup!")
            return

        ultimos_backups = self.gerenciador_backup.get_ultimos_backups(3)
        backup_info = ultimos_backups[selecao[0]]

        integro, msg = self.gerenciador_backup.verificar_integridade(backup_info['arquivo'])

        if integro:
            messagebox.showinfo("Backup Íntegro", f"✅ {msg}")
        else:
            messagebox.showerror("Backup Corrompido", f"❌ {msg}")

    def restaurar_backup_selecionado(self):
        """Restaura o backup selecionado"""
        selecao = self.backup_listbox.curselection()
        if not selecao:
            messagebox.showerror("Erro", "Selecione um backup!")
            return

        ultimos_backups = self.gerenciador_backup.get_ultimos_backups(3)
        backup_info = ultimos_backups[selecao[0]]

        if messagebox.askyesno("Confirmar Restauração",
                               f"Tem certeza que deseja restaurar o backup:\n\n"
                               f"{backup_info['data'].strftime('%d/%m/%Y %H:%M:%S')}\n"
                               f"Tamanho: {backup_info['tamanho_mb']} MB\n\n"
                               f"Um backup automático será feito antes da restauração."):

            sucesso = self.gerenciador_backup.restaurar_backup(backup_info['arquivo'])

            if sucesso:
                # Recarregar base
                self.base_dados.carregar_ou_criar_base()
                messagebox.showinfo("Sucesso", "Backup restaurado com sucesso!\n\nA base foi recarregada.")
            else:
                messagebox.showerror("Erro", "Erro ao restaurar backup!")

    def abrir_pasta_backups(self):
        """Abre a pasta de backups"""
        if not os.path.exists(PASTA_BACKUPS):
            os.makedirs(PASTA_BACKUPS)

        if sys.platform == "win32":
            os.startfile(PASTA_BACKUPS)
        else:
            os.system(f'xdg-open "{PASTA_BACKUPS}"')

    def atualizar_lista_backups(self):
        """Atualiza a lista de backups na interface"""
        self.backup_listbox.delete(0, tk.END)
        ultimos_backups = self.gerenciador_backup.get_ultimos_backups(3)
        for backup in ultimos_backups:
            self.backup_listbox.insert(tk.END,
                                       f"{backup['data'].strftime('%d/%m/%Y %H:%M:%S')} - {backup['tamanho_mb']} MB - {backup['nome']}")

    def configurar_aba_dashboard_salao(self):
        """Configura a aba do dashboard do salão"""
        container = tk.Frame(self.aba_dashboard_salao, bg='#ffffff', padx=20, pady=20)
        container.pack(fill='both', expand=True)

        tk.Label(container, text='🏢 DASHBOARD DO SALÃO',
                 font=('Segoe UI', 18, 'bold'),
                 fg='#0f3460', bg='#ffffff').pack(pady=(0, 20))

        # Informações
        info_frame = tk.LabelFrame(container, text='📊 VISÃO GERAL DO NEGÓCIO',
                                   font=('Segoe UI', 12, 'bold'),
                                   bg='#ffffff', fg='#0f3460',
                                   padx=15, pady=15)
        info_frame.pack(fill='x', pady=(0, 20))

        df_salao = self.base_dados.df_geral.get('SALAO_GERAL', pd.DataFrame())
        total_meses = len(df_salao) if not df_salao.empty else 0

        if not df_salao.empty:
            total_faturamento = df_salao['faturamento_total'].sum()
            media_faturamento = df_salao['faturamento_total'].mean()
            total_clientes = df_salao['clientes_total'].sum()

            info_text = f"""
            📅 Total de meses com dados: {total_meses}
            💰 Faturamento total: R$ {total_faturamento:,.2f}
            📊 Média mensal: R$ {media_faturamento:,.2f}
            👥 Total de clientes: {total_clientes:,.0f}
            """

            tk.Label(info_frame, text=info_text,
                     bg='#ffffff', font=('Segoe UI', 11),
                     justify='left').pack(anchor='w', pady=10)
        else:
            tk.Label(info_frame, text="Nenhum dado disponível para o salão ainda.",
                     bg='#ffffff', font=('Segoe UI', 11)).pack(pady=10)

        # Botões
        btn_frame = tk.Frame(container, bg='#ffffff')
        btn_frame.pack(pady=20)

        tk.Button(btn_frame,
                  text='📊 GERAR DASHBOARD DO SALÃO',
                  command=self.gerar_dashboard_salao,
                  bg='#0f3460',
                  fg='white',
                  font=('Segoe UI', 14, 'bold'),
                  padx=40,
                  pady=20,
                  relief='flat',
                  cursor='hand2').pack()

    def configurar_aba_dashboard_profissionais(self):
        """Configura a aba de dashboard por profissional"""
        container = tk.Frame(self.aba_dashboard_profissionais, bg='#ffffff', padx=20, pady=20)
        container.pack(fill='both', expand=True)

        tk.Label(container, text='👤 DASHBOARD POR PROFISSIONAL',
                 font=('Segoe UI', 18, 'bold'),
                 fg='#0f3460', bg='#ffffff').pack(pady=(0, 20))

        # Seleção de profissional
        frame_prof = tk.LabelFrame(container, text='🔍 SELECIONAR PROFISSIONAL',
                                   font=('Segoe UI', 12, 'bold'),
                                   bg='#ffffff', fg='#0f3460',
                                   padx=15, pady=15)
        frame_prof.pack(fill='x', pady=(0, 20))

        tk.Label(frame_prof, text='Profissional:', bg='#ffffff',
                 font=('Segoe UI', 10)).grid(row=0, column=0, sticky='w', pady=5)

        self.profissional_dashboard_var = tk.StringVar()
        self.profissional_dashboard_combo = ttk.Combobox(frame_prof,
                                                         textvariable=self.profissional_dashboard_var,
                                                         width=50)
        self.profissional_dashboard_combo.grid(row=0, column=1, padx=10, pady=5)

        # Atualizar lista de profissionais
        self.atualizar_lista_profissionais_dashboard()

        # Seleção de períodos
        frame_periodos = tk.LabelFrame(container, text='📅 SELECIONAR PERÍODOS',
                                       font=('Segoe UI', 12, 'bold'),
                                       bg='#ffffff', fg='#0f3460',
                                       padx=15, pady=15)
        frame_periodos.pack(fill='x', pady=(0, 20))

        self.tipo_periodo_var = tk.StringVar(value="todos")
        ttk.Radiobutton(frame_periodos, text="Todos os períodos",
                        variable=self.tipo_periodo_var, value="todos").grid(row=0, column=0, sticky='w', pady=5)
        ttk.Radiobutton(frame_periodos, text="Período atual",
                        variable=self.tipo_periodo_var, value="atual").grid(row=1, column=0, sticky='w', pady=5)
        ttk.Radiobutton(frame_periodos, text="Selecionar múltiplos",
                        variable=self.tipo_periodo_var, value="multiplos").grid(row=2, column=0, sticky='w', pady=5)

        # Lista de períodos para seleção múltipla
        self.periodos_listbox = tk.Listbox(frame_periodos, selectmode='multiple', height=6, width=50)
        self.periodos_listbox.grid(row=3, column=0, columnspan=2, pady=10)

        # Preencher períodos
        df_periodos = self.base_dados.df_geral.get('PERIODOS', pd.DataFrame())
        if not df_periodos.empty:
            for _, row in df_periodos.sort_values(['ano', 'mes'], ascending=False).iterrows():
                periodo = f"{MESES_PT[row['mes']]}/{row['ano']}"
                self.periodos_listbox.insert(tk.END, periodo)

        # Botões
        btn_frame = tk.Frame(container, bg='#ffffff')
        btn_frame.pack(pady=20)

        tk.Button(btn_frame,
                  text='📊 GERAR DASHBOARD DO PROFISSIONAL',
                  command=self.gerar_dashboard_profissional,
                  bg='#0f3460',
                  fg='white',
                  font=('Segoe UI', 14, 'bold'),
                  padx=40,
                  pady=20,
                  relief='flat',
                  cursor='hand2').pack()

        tk.Button(btn_frame,
                  text='👥 GERAR DASHBOARD DE TODOS OS PROFISSIONAIS',
                  command=self.gerar_dashboard_todos_profissionais,
                  bg='#28a745',
                  fg='white',
                  font=('Segoe UI', 14, 'bold'),
                  padx=40,
                  pady=20,
                  relief='flat',
                  cursor='hand2').pack(pady=10)

    def configurar_aba_dashboard_geral(self):
        """Configura a aba do dashboard geral"""
        container = tk.Frame(self.aba_dashboard_geral, bg='#ffffff', padx=20, pady=20)
        container.pack(fill='both', expand=True)

        tk.Label(container, text='📊 DASHBOARD GERAL',
                 font=('Segoe UI', 18, 'bold'),
                 fg='#0f3460', bg='#ffffff').pack(pady=(0, 20))

        info_frame = tk.LabelFrame(container, text='📈 VISÃO GERAL COMPLETA',
                                   font=('Segoe UI', 12, 'bold'),
                                   bg='#ffffff', fg='#0f3460',
                                   padx=15, pady=15)
        info_frame.pack(fill='x', pady=(0, 20))

        df_periodos = self.base_dados.df_geral.get('PERIODOS', pd.DataFrame())
        total_meses = len(df_periodos) if not df_periodos.empty else 0

        info_text = f"""
        📊 Este dashboard apresenta uma visão completa de todos os dados do sistema:

        • {total_meses} meses de dados coletados
        • Comparativos entre períodos
        • Análise de tendências
        • Rankings de profissionais
        • Indicadores de desempenho (faturamento, ticket médio, taxa retorno)
        • Gráficos interativos
        • Feedbacks dos clientes
        """

        tk.Label(info_frame, text=info_text,
                 bg='#ffffff', font=('Segoe UI', 11),
                 justify='left').pack(anchor='w', pady=10)

        btn_frame = tk.Frame(container, bg='#ffffff')
        btn_frame.pack(pady=20)

        tk.Button(btn_frame,
                  text='📊 GERAR DASHBOARD GERAL COMPLETO',
                  command=self.gerar_dashboard_geral,
                  bg='#0f3460',
                  fg='white',
                  font=('Segoe UI', 14, 'bold'),
                  padx=40,
                  pady=20,
                  relief='flat',
                  cursor='hand2').pack()

    def configurar_aba_google_sheets(self):
        """Configura a aba de importação do Google Sheets"""
        container = tk.Frame(self.aba_google_sheets, bg='#ffffff', padx=20, pady=20)
        container.pack(fill='both', expand=True)

        tk.Label(container, text='📥 IMPORTAR DADOS DO GOOGLE SHEETS',
                 font=('Segoe UI', 18, 'bold'),
                 fg='#0f3460', bg='#ffffff').pack(pady=(0, 20))

        info_frame = tk.LabelFrame(container, text='ℹ️ INFORMAÇÕES',
                                   font=('Segoe UI', 12, 'bold'),
                                   bg='#ffffff', fg='#0f3460',
                                   padx=15, pady=15)
        info_frame.pack(fill='x', pady=(0, 20))

        info_text = """
        Esta funcionalidade importa dados da planilha do Google Sheets:
        https://docs.google.com/spreadsheets/d/11RnD-EvoGY9TAUfCQQT-YyH36dWW3b9i_vX21kaHlXg/edit

        O sistema irá:
        1. Baixar os dados da planilha
        2. Processar as informações
        3. Atualizar a base de dados
        4. Manter o histórico completo
        """

        tk.Label(info_frame, text=info_text,
                 bg='#ffffff', font=('Segoe UI', 11),
                 justify='left', wraplength=800).pack(anchor='w', pady=10)

        btn_frame = tk.Frame(container, bg='#ffffff')
        btn_frame.pack(pady=20)

        tk.Button(btn_frame,
                  text='📥 IMPORTAR AGORA',
                  command=self.importar_google_sheets,
                  bg='#28a745',
                  fg='white',
                  font=('Segoe UI', 14, 'bold'),
                  padx=40,
                  pady=20,
                  relief='flat',
                  cursor='hand2').pack()

    def configurar_aba_excel(self):
        """Configura a aba de edição do Excel"""
        container = tk.Frame(self.aba_excel, bg='#ffffff', padx=20, pady=20)
        container.pack(fill='both', expand=True)

        tk.Label(container, text='📗 EDITAR BASE DE DADOS MANUALMENTE',
                 font=('Segoe UI', 18, 'bold'),
                 fg='#0f3460', bg='#ffffff').pack(pady=(0, 20))

        info_frame = tk.LabelFrame(container, text='ℹ️ INFORMAÇÕES',
                                   font=('Segoe UI', 12, 'bold'),
                                   bg='#ffffff', fg='#0f3460',
                                   padx=15, pady=15)
        info_frame.pack(fill='x', pady=(0, 20))

        info_text = f"""
        Arquivo da base de dados: {self.base_dados.arquivo}

        Você pode:
        1. Abrir o Excel para edição manual
        2. Fazer as alterações necessárias
        3. Salvar o arquivo
        4. Recarregar os dados no sistema

        ⚠️ Cuidado ao editar! Mantenha a estrutura das colunas.
        """

        tk.Label(info_frame, text=info_text,
                 bg='#ffffff', font=('Segoe UI', 11),
                 justify='left').pack(anchor='w', pady=10)

        btn_frame = tk.Frame(container, bg='#ffffff')
        btn_frame.pack(pady=20)

        tk.Button(btn_frame,
                  text='📗 ABRIR EXCEL PARA EDIÇÃO',
                  command=self.abrir_excel_edicao,
                  bg='#0f3460',
                  fg='white',
                  font=('Segoe UI', 14, 'bold'),
                  padx=40,
                  pady=20,
                  relief='flat',
                  cursor='hand2').pack()

        tk.Button(btn_frame,
                  text='🔄 RECARREGAR BASE APÓS EDIÇÃO',
                  command=self.recarregar_base,
                  bg='#28a745',
                  fg='white',
                  font=('Segoe UI', 14, 'bold'),
                  padx=40,
                  pady=20,
                  relief='flat',
                  cursor='hand2').pack(pady=10)

    # ============================================================================
    # MÉTODOS PARA DASHBOARDS
    # ============================================================================

    def atualizar_lista_profissionais_dashboard(self):
        """Atualiza a lista de profissionais no combobox"""
        profissionais = set()
        df_prof = self.base_dados.df_geral.get('PROF_PAGAMENTOS', pd.DataFrame())
        if not df_prof.empty:
            profissionais.update(df_prof['profissional'].unique())

        self.profissional_dashboard_combo['values'] = sorted(list(profissionais))

    def gerar_dashboard_salao(self):
        """Gera o dashboard do salão"""
        try:
            # Use o relatório único como fallback ou crie um método específico
            messagebox.showinfo("Info", "Use o relatório único para ver todos os dados")
            # Ou chame o relatório único:
            self.gerar_relatorio_unico()
        except Exception as e:
            messagebox.showerror("Erro", f"Erro: {str(e)}")

    def gerar_relatorio_unico(self):
        """Relatórios HTML desativados nesta versão (coleta pura)."""
        messagebox.showinfo("Info", "Geração de relatórios não disponível nesta versão.")

    def _gerar_relatorio_unico_legado(self):
        """(legado desativado)"""
        try:
            filename = None
            if filename and os.path.exists(filename):
                webbrowser.open(f'file://{os.path.abspath(filename)}')
                messagebox.showinfo("Sucesso",
                                    f"✅ Relatório único gerado com sucesso!\n\n"
                                    f"Arquivo: {filename}\n\n"
                                    f"O relatório contém:\n"
                                    f"• Dashboard do Salão com gráficos anuais\n"
                                    f"• Todos os profissionais com busca por nome\n"
                                    f"• Dados consolidados de todos os profissionais\n"
                                    f"• Taxas de crescimento dinâmicas\n"
                                    f"• Filtros em tempo real")
            else:
                messagebox.showerror("Erro", "Erro ao gerar relatório")
        except Exception as e:
            messagebox.showerror("Erro", f"Erro ao gerar relatório: {str(e)}")

    def gerar_dashboard_todos_profissionais(self):
        """Gera dashboard com todos os profissionais"""
        try:
            filename = self.gerador_relatorios.gerar_dashboard_profissional(None, None)
            if filename and os.path.exists(filename):
                webbrowser.open(f'file://{os.path.abspath(filename)}')
                messagebox.showinfo("Sucesso", f"Dashboard de todos os profissionais gerado:\n{filename}")
            else:
                messagebox.showerror("Erro", "Erro ao gerar dashboard")
        except Exception as e:
            messagebox.showerror("Erro", f"Erro ao gerar dashboard: {str(e)}")

    def gerar_dashboard_geral(self):
        """Gera o dashboard geral"""
        try:
            # Usar o dashboard do salão como geral
            filename = self.gerador_relatorios.gerar_dashboard_salao()
            if filename and os.path.exists(filename):
                webbrowser.open(f'file://{os.path.abspath(filename)}')
                messagebox.showinfo("Sucesso", f"Dashboard geral gerado:\n{filename}")
            else:
                messagebox.showerror("Erro", "Erro ao gerar dashboard geral")
        except Exception as e:
            messagebox.showerror("Erro", f"Erro ao gerar dashboard: {str(e)}")

    def importar_google_sheets(self):
        """Importa dados do Google Sheets"""
        if not messagebox.askyesno("Confirmar",
                                   "Isso irá importar dados da planilha do Google Sheets.\n\n"
                                   "Deseja continuar?"):
            return

        thread = threading.Thread(target=self.executar_importacao_google_sheets)
        thread.daemon = True
        thread.start()
        self.threads_ativas.append(thread)

    def executar_importacao_google_sheets(self):
        """Executa importação do Google Sheets em thread"""
        try:
            print("\n" + "=" * 80)
            print("📥 IMPORTANDO DADOS DO GOOGLE SHEETS")
            print("=" * 80)

            sucesso = self.base_dados.importar_dados_google_sheets()

            if sucesso:
                print("\n✅ Importação concluída com sucesso!")
                self.root.after(0, lambda: messagebox.showinfo(
                    "Sucesso",
                    "✅ Dados importados com sucesso!\n\n"
                    "A base de dados foi atualizada."
                ))
            else:
                print("\n❌ Erro na importação")
                self.root.after(0, lambda: messagebox.showerror(
                    "Erro",
                    "Erro ao importar dados do Google Sheets"
                ))

        except Exception as e:
            logging.error(f"Erro na importação: {e}")
            self.root.after(0, lambda: messagebox.showerror("Erro", f"❌ {str(e)}"))

    def abrir_excel_edicao(self):
        """Abre o Excel para edição manual"""
        if self.base_dados.editar_excel_manualmente():
            messagebox.showinfo("Info",
                                "Excel aberto para edição.\n\n"
                                "Após editar e salvar, clique em 'Recarregar Base' "
                                "para atualizar os dados no sistema.")
        else:
            messagebox.showerror("Erro", "Erro ao abrir o arquivo Excel")

    def recarregar_base(self):
        """Recarrega a base após edição manual"""
        if self.base_dados.recarregar_apos_edicao():
            # Atualizar listas
            self.atualizar_lista_profissionais_dashboard()
            messagebox.showinfo("Sucesso", "Base de dados recarregada com sucesso!")
        else:
            messagebox.showerror("Erro", "Erro ao recarregar a base de dados")

    # ============================================================================
    # MÉTODOS EXISTENTES (MANTIDOS)
    # ============================================================================

    def configurar_aba_principal(self):
        """Configura a aba principal"""
        container = tk.Frame(self.aba_principal, bg='#ffffff', padx=20, pady=20)
        container.pack(fill='both', expand=True)

        # Título
        tk.Label(container, text='🏠 PAINEL PRINCIPAL',
                 font=('Segoe UI', 24, 'bold'),
                 fg='#0f3460', bg='#ffffff').pack(pady=(0, 30))

        # Frame de boas-vindas
        welcome_frame = tk.LabelFrame(container, text='📋 BEM-VINDO AO SISTEMA NODRI',
                                      font=('Segoe UI', 14, 'bold'),
                                      bg='#ffffff', fg='#0f3460',
                                      padx=20, pady=20)
        welcome_frame.pack(fill='x', pady=(0, 20))

        welcome_text = """
        Este sistema unifica todas as funcionalidades de coleta e análise de dados:

        📅 COLETA HISTÓRICA - Coleta automática de todos os meses pendentes
        ➕ COLETA MANUAL - Coleta de um mês específico com seleção de relatórios
        👥 PROFISSIONAIS - Cadastro e gerenciamento de profissionais
        🏢 DASHBOARD SALÃO - Visualização completa dos dados do salão
        👤 DASHBOARD PROFISSIONAL - Análise individual por profissional
        📥 IMPORTAR GOOGLE SHEETS - Importação de dados da planilha online
        📗 EDITAR EXCEL - Edição manual da base de dados
        ⚙️ CONFIGURAÇÕES - Ajustes de timeouts, URLs e XPaths
        📋 LOGS - Visualização dos logs do sistema
        💾 BACKUP - Sistema automático de backup com restauração
        """

        tk.Label(welcome_frame, text=welcome_text,
                 bg='#ffffff', font=('Segoe UI', 11),
                 justify='left').pack(anchor='w')

        # Frame de estatísticas rápidas
        stats_frame = tk.LabelFrame(container, text='📊 ESTATÍSTICAS RÁPIDAS',
                                    font=('Segoe UI', 14, 'bold'),
                                    bg='#ffffff', fg='#0f3460',
                                    padx=20, pady=20)
        stats_frame.pack(fill='x', pady=(0, 20))

        # Calcular estatísticas
        df_periodos = self.base_dados.df_geral.get('PERIODOS', pd.DataFrame())
        total_meses = len(df_periodos) if not df_periodos.empty else 0

        df_salao = self.base_dados.df_geral.get('SALAO_GERAL', pd.DataFrame())
        if not df_salao.empty:
            total_faturamento = df_salao['faturamento_total'].sum()
            total_clientes = df_salao['clientes_total'].sum()
            media_faturamento = df_salao['faturamento_total'].mean()
        else:
            total_faturamento = 0
            total_clientes = 0
            media_faturamento = 0

        # Informações de backup
        ultimos_backups = self.gerenciador_backup.get_ultimos_backups(1)
        info_backup = f"Último backup: {ultimos_backups[0]['data'].strftime('%d/%m/%Y %H:%M') if ultimos_backups else 'Nenhum'}"

        # Criar grid de estatísticas
        stats_grid = tk.Frame(stats_frame, bg='#ffffff')
        stats_grid.pack()

        # Linha 1
        tk.Label(stats_grid, text='📅 Meses coletados:', bg='#ffffff',
                 font=('Segoe UI', 11, 'bold')).grid(row=0, column=0, sticky='w', padx=10, pady=5)
        tk.Label(stats_grid, text=str(total_meses), bg='#ffffff',
                 font=('Segoe UI', 11)).grid(row=0, column=1, sticky='w', padx=10, pady=5)

        tk.Label(stats_grid, text='💰 Faturamento total:', bg='#ffffff',
                 font=('Segoe UI', 11, 'bold')).grid(row=0, column=2, sticky='w', padx=10, pady=5)
        tk.Label(stats_grid, text=f'R$ {total_faturamento:,.2f}', bg='#ffffff',
                 font=('Segoe UI', 11)).grid(row=0, column=3, sticky='w', padx=10, pady=5)

        # Linha 2
        tk.Label(stats_grid, text='👥 Total de clientes:', bg='#ffffff',
                 font=('Segoe UI', 11, 'bold')).grid(row=1, column=0, sticky='w', padx=10, pady=5)
        tk.Label(stats_grid, text=f'{total_clientes:,.0f}', bg='#ffffff',
                 font=('Segoe UI', 11)).grid(row=1, column=1, sticky='w', padx=10, pady=5)

        tk.Label(stats_grid, text='💾 Último backup:', bg='#ffffff',
                 font=('Segoe UI', 11, 'bold')).grid(row=1, column=2, sticky='w', padx=10, pady=5)
        tk.Label(stats_grid, text=info_backup, bg='#ffffff',
                 font=('Segoe UI', 11)).grid(row=1, column=3, sticky='w', padx=10, pady=5)

        # Botões rápidos
        quick_frame = tk.LabelFrame(container, text='⚡ AÇÕES RÁPIDAS',
                                    font=('Segoe UI', 14, 'bold'),
                                    bg='#ffffff', fg='#0f3460',
                                    padx=20, pady=20)
        quick_frame.pack(fill='x', pady=(0, 20))

        btn_frame1 = tk.Frame(quick_frame, bg='#ffffff')
        btn_frame1.pack(pady=5)

        tk.Button(btn_frame1, text='📊 GERAR DASHBOARD SALÃO',
                  command=self.gerar_dashboard_salao,
                  bg='#0f3460', fg='white',
                  font=('Segoe UI', 11, 'bold'),
                  padx=20, pady=10, cursor='hand2').pack(side='left', padx=5)

        tk.Button(btn_frame1, text='📥 IMPORTAR GOOGLE SHEETS',
                  command=self.importar_google_sheets,
                  bg='#28a745', fg='white',
                  font=('Segoe UI', 11, 'bold'),
                  padx=20, pady=10, cursor='hand2').pack(side='left', padx=5)

        btn_frame2 = tk.Frame(quick_frame, bg='#ffffff')
        btn_frame2.pack(pady=5)

        tk.Button(btn_frame2, text='📗 ABRIR EXCEL',
                  command=self.abrir_excel_edicao,
                  bg='#ffc107', fg='black',
                  font=('Segoe UI', 11, 'bold'),
                  padx=20, pady=10, cursor='hand2').pack(side='left', padx=5)

        tk.Button(btn_frame2, text='🔄 RECARREGAR BASE',
                  command=self.recarregar_base,
                  bg='#17a2b8', fg='white',
                  font=('Segoe UI', 11, 'bold'),
                  padx=20, pady=10, cursor='hand2').pack(side='left', padx=5)

        # NOVO BOTÃO DO RELATÓRIO ÚNICO - AGORA NO LUGAR CERTO!
        tk.Button(btn_frame2,
                  text='📊 GERAR RELATÓRIO ÚNICO COMPLETO',
                  command=self.gerar_relatorio_unico,
                  bg='#6610f2',
                  fg='white',
                  font=('Segoe UI', 11, 'bold'),
                  padx=20,
                  pady=10,
                  cursor='hand2').pack(side='left', padx=5)

    # ============================================================================
    # MÉTODO ATUALIZADO: CONFIGURAR ABA HISTÓRICO COM DATAS DE INÍCIO E FIM
    # ============================================================================

    def configurar_aba_historico(self):
        """Configura a aba de coleta histórica — sem scrollbar, preenche tela"""
        FP = FONT_PRIMARY
        BG = '#f0f4f9'
        self.aba_historico.configure(bg=BG)

        # Layout: banner (topo) + barra de ações (rodapé) + corpo.
        # A barra de ações é empacotada ANTES do corpo: quando a tela é
        # pequena o pack encolhe o corpo, nunca o rodapé — botões sempre visíveis.

        # ── Banner superior ───────────────────────────────────────────────
        banner = tk.Frame(self.aba_historico, bg='#0f3460', pady=10)
        banner.pack(side='top', fill='x')

        # ── Barra de ações fixa no rodapé ────────────────────────────────
        acoes = tk.Frame(self.aba_historico, bg='#0f3460', pady=10)
        acoes.pack(side='bottom', fill='x')
        tk.Label(banner, text='📅  COLETA HISTÓRICA AUTOMÁTICA',
                 font=(FP, 16, 'bold'), fg='#ffffff', bg='#0f3460').pack(side='left', padx=20)
        tk.Label(banner, text='Coleta todos os períodos pendentes do intervalo selecionado',
                 font=(FP, 9), fg='#a0c4ff', bg='#0f3460').pack(side='left')

        # ── Corpo principal (grid, sem scroll) ───────────────────────────
        body = tk.Frame(self.aba_historico, bg=BG, padx=16, pady=10)
        body.pack(side='top', fill='both', expand=True)
        body.rowconfigure(1, weight=1)   # linha do progresso expande
        body.columnconfigure(0, weight=1)

        def card(parent, titulo, cor_topo='#0f3460'):
            outer = tk.Frame(parent, bg=BG)
            topo = tk.Frame(outer, bg=cor_topo, pady=5)
            topo.pack(fill='x')
            tk.Label(topo, text=titulo, font=(FP, 10, 'bold'),
                     fg='white', bg=cor_topo).pack(side='left', padx=12)
            corpo = tk.Frame(outer, bg='#ffffff', padx=12, pady=8,
                             relief='solid', bd=1)
            corpo.pack(fill='both', expand=True)
            return outer, corpo

        # ── Linha 0: Período ─────────────────────────────────────────────
        per_outer, per_inner = card(body, '📆  PERÍODO DE COLETA')
        per_outer.grid(row=0, column=0, sticky='ew', pady=(0, 8))

        tk.Label(per_inner, text='De:', bg='#ffffff', font=(FP, 10)).grid(
            row=0, column=0, sticky='w', pady=4)
        self.data_inicio_historico = DateEntry(per_inner, width=13, background='#0f3460',
            foreground='white', borderwidth=2, date_pattern='dd/mm/yyyy', font=(FP, 10))
        self.data_inicio_historico.grid(row=0, column=1, padx=8, pady=4)
        self.data_inicio_historico.set_date(datetime(2019, 1, 1))

        tk.Label(per_inner, text='Até:', bg='#ffffff', font=(FP, 10)).grid(
            row=0, column=2, sticky='w', pady=4, padx=(12, 0))
        self.data_fim_historico = DateEntry(per_inner, width=13, background='#0f3460',
            foreground='white', borderwidth=2, date_pattern='dd/mm/yyyy', font=(FP, 10))
        self.data_fim_historico.grid(row=0, column=3, padx=8, pady=4)
        self.data_fim_historico.set_date(datetime(2026, 3, 1))

        tk.Button(per_inner, text='📅 Usar padrão 2019–2026',
                  command=self.usar_periodo_padrao_historico,
                  bg='#e8edf5', fg='#0f3460', font=(FP, 9, 'bold'),
                  padx=12, pady=3, relief='flat', cursor='hand2').grid(
                  row=0, column=4, padx=16)

        self.info_meses_label = tk.Label(per_inner, text='',
            bg='#ffffff', font=(FP, 9), fg='#555', justify='left')
        self.info_meses_label.grid(row=0, column=5, padx=16, sticky='w')
        self.atualizar_info_meses_pendentes()

        # ── Compat: alias para o login global ────────────────────────────
        # iniciar_coleta_historica lê self.email_historico / self.senha_historico
        # apontamos para os campos globais do header
        self.email_historico = self.email_global
        self.senha_historico = self.senha_global
        self.salvar_senha_var = tk.BooleanVar(value=False)
        self.visualizar_senha_historico_var = tk.BooleanVar(value=False)

        # ── Linha 1 (esq): Relatórios | (dir): Progresso ─────────────────
        cols_frame = tk.Frame(body, bg=BG)
        cols_frame.grid(row=1, column=0, sticky='nsew')
        cols_frame.rowconfigure(0, weight=1)
        cols_frame.columnconfigure(0, weight=2)
        cols_frame.columnconfigure(1, weight=3)

        rel_outer, rel_inner = card(cols_frame, '📊  RELATÓRIOS PARA COLETAR', cor_topo='#145a32')
        rel_outer.grid(row=0, column=0, sticky='nsew', padx=(0, 8))

        self.relatorios_hist_var = {
            '0083': tk.BooleanVar(value=True),
            '0017': tk.BooleanVar(value=True),
            '0032': tk.BooleanVar(value=True),
            '0042': tk.BooleanVar(value=True),
            '0088': tk.BooleanVar(value=True),
            '0123': tk.BooleanVar(value=True),
            '0021': tk.BooleanVar(value=True),
            '0326': tk.BooleanVar(value=True),
            '0126': tk.BooleanVar(value=True),
            '0031': tk.BooleanVar(value=True),
            '0041': tk.BooleanVar(value=True),
            '0051': tk.BooleanVar(value=True),
            'comandas': tk.BooleanVar(value=True),
            # Desmarcado de proposito: a tabela de precos e a VIGENTE, nao a do
            # mes. Rodar 87 meses baixaria 87 vezes a mesma tabela, cada uma
            # apagando a anterior. Na coleta do dia ela continua ligada.
            '0033': tk.BooleanVar(value=False),
        }
        nomes_rel = {
            '0083': ('📈', 'Faturamento',    '#1a5276'),
            '0017': ('👤', 'Clientes Novos', '#145a32'),
            '0032': ('✂️', 'Serviços',       '#4a235a'),
            '0042': ('📦', 'Produtos',        '#7d6608'),
            '0088': ('📅', 'Fat. Diário',    '#1a5276'),
            '0123': ('💰', 'Pagamentos',     '#78281f'),
            '0021': ('🎫', 'Ticket Médio',   '#145a32'),
            '0326': ('⭐', 'Preferência',    '#4a235a'),
            '0126': ('⏰', 'Ocupação',        '#7d6608'),
            '0031': ('🔧', 'Serv. Prof.',    '#1a5276'),
            '0041': ('📦', 'Prod. Prof.',    '#78281f'),
            '0051': ('📅', 'Agendamentos',   '#0e6655'),
            'comandas': ('🧾', 'Comandas Final.', '#6c3483'),
            '0033': ('🏷️', 'Tabela Preços',  '#935116'),
        }
        chips_frame = tk.Frame(rel_inner, bg='#ffffff')
        chips_frame.pack(fill='x', pady=4)

        self._rel_hist_btns = {}
        col = 0
        for codigo, var in self.relatorios_hist_var.items():
            icone, nome, cor = nomes_rel.get(codigo, ('', codigo, '#0f3460'))
            def _toggle(c=codigo, v=var):
                v.set(not v.get())
                bg = nomes_rel[c][2] if v.get() else '#bdc3c7'
                self._rel_hist_btns[c].config(bg=bg)
            btn = tk.Button(chips_frame,
                            text=f'{icone} {nome}\n({codigo})',
                            command=_toggle,
                            bg=cor, fg='white',
                            font=(FP, 9, 'bold'),
                            width=13, height=2,
                            relief='flat', cursor='hand2',
                            wraplength=90)
            btn.grid(row=col // 4, column=col % 4, padx=6, pady=5, sticky='w')
            self._rel_hist_btns[codigo] = btn
            col += 1

        sel_f = tk.Frame(rel_inner, bg='#ffffff')
        sel_f.pack(anchor='w', pady=(6, 0))
        tk.Button(sel_f, text='✅ Marcar todos',
                  command=lambda: self._toggle_todos_rel_hist(True),
                  bg='#d5f5e3', fg='#145a32', font=(FP, 9, 'bold'),
                  padx=12, pady=4, relief='flat', cursor='hand2').pack(side='left', padx=4)
        tk.Button(sel_f, text='❌ Desmarcar todos',
                  command=lambda: self._toggle_todos_rel_hist(False),
                  bg='#fadbd8', fg='#78281f', font=(FP, 9, 'bold'),
                  padx=12, pady=4, relief='flat', cursor='hand2').pack(side='left', padx=4)

        # ── Card: Progresso (coluna direita de cols_frame) ───────────────
        prog_outer, prog_inner = card(cols_frame, '⚡  PROGRESSO DA COLETA', cor_topo='#1a3a5c')
        prog_outer.grid(row=0, column=1, sticky='nsew')
        prog_inner.rowconfigure(2, weight=1)
        prog_inner.columnconfigure(0, weight=1)

        self._hist_status_label = tk.Label(prog_inner, text='Aguardando início...',
            font=(FP, 10, 'bold'), fg='#555', bg='#ffffff')
        self._hist_status_label.grid(row=0, column=0, sticky='w', pady=(0, 4))

        style_pb = ttk.Style()
        style_pb.configure('Azul.Horizontal.TProgressbar',
                           troughcolor='#e0e7ef', background='#27ae60', thickness=18)
        self.progresso_historico = ttk.Progressbar(prog_inner,
            mode='determinate', style='Azul.Horizontal.TProgressbar')
        self.progresso_historico.grid(row=1, column=0, sticky='ew', pady=(0, 8))

        self.log_text = scrolledtext.ScrolledText(prog_inner,
            font=('Consolas', 9), bg='#0d1117', fg='#58d68d',
            insertbackground='white', relief='flat',
            width=40, height=6)  # mínimo pequeno: expande via grid, cabe em telas menores
        self.log_text.grid(row=2, column=0, sticky='nsew')
        self.log_text.tag_config('ok',    foreground='#58d68d')
        self.log_text.tag_config('erro',  foreground='#e74c3c')
        self.log_text.tag_config('aviso', foreground='#f39c12')
        self.log_text.tag_config('info',  foreground='#85c1e9')

        # ── Botões da barra de ações (frame criado no topo do método) ────
        def btn_acao(parent, texto, cmd, cor, cor_hover=None):
            b = tk.Button(parent, text=texto, command=cmd,
                          bg=cor, fg='white', font=(FP, 11, 'bold'),
                          padx=22, pady=10, relief='flat', cursor='hand2',
                          activebackground=cor_hover or cor)
            b.pack(side='left', padx=8, pady=4)
            return b

        self._btn_iniciar_hist = btn_acao(acoes, '▶  INICIAR COLETA',
                                          self.iniciar_coleta_historica, '#27ae60', '#1e8449')
        btn_acao(acoes, '⏹  PARAR', self.parar_coleta, '#e74c3c', '#c0392b')
        btn_acao(acoes, '🔍  INTEGRIDADE', self.abrir_painel_integridade, '#17a2b8', '#117a8b')
        btn_acao(acoes, '📊  SAÚDE DOS DADOS',
                 lambda: self.notebook.select(self.aba_saude), '#8e44ad', '#6c3483')

        self.coleta_ativa = False

    def _salvar_login_global(self):
        email = self.email_global.get().strip()
        senha = self.senha_global.get().strip()
        if not email:
            messagebox.showwarning('Atenção', 'Digite o email antes de salvar.')
            return
        self.sistema_coleta.config['email'] = email
        self.sistema_coleta.config['senha'] = senha
        self.sistema_coleta.salvar_configuracao()
        messagebox.showinfo('Login salvo', f'✅ Login salvo:\n{email}')

    def _toggle_todos_rel_hist(self, valor):
        for codigo, var in self.relatorios_hist_var.items():
            var.set(valor)
            cor = self._rel_hist_btns[codigo].cget('bg')
            info = {
                '0083': '#1a5276', '0017': '#145a32', '0032': '#4a235a',
                '0042': '#7d6608', '0088': '#1a5276', '0123': '#78281f',
                '0021': '#145a32', '0326': '#4a235a', '0126': '#7d6608',
                '0031': '#1a5276', '0041': '#78281f', '0051': '#0e6655',
                'comandas': '#6c3483', '0033': '#935116',
            }
            self._rel_hist_btns[codigo].config(
                bg=info.get(codigo, '#0f3460') if valor else '#bdc3c7')

    def usar_periodo_padrao_historico(self):
        """Define o período padrão 2019-2026"""
        self.data_inicio_historico.set_date(datetime(2019, 1, 1))
        self.data_fim_historico.set_date(datetime(2026, 3, 1))
        self.atualizar_info_meses_pendentes()

    def atualizar_info_meses_pendentes(self):
        """Atualiza a informação de meses pendentes baseado nas datas selecionadas"""
        try:
            data_inicio = self.data_inicio_historico.get_date()
            data_fim = self.data_fim_historico.get_date()

            ano_inicio = data_inicio.year
            mes_inicio = data_inicio.month
            ano_fim = data_fim.year
            mes_fim = data_fim.month

            meses_pendentes = self.base_dados.obter_meses_para_coletar(
                ano_inicio, mes_inicio, ano_fim, mes_fim
            )

            if meses_pendentes:
                info_text = f"📊 {len(meses_pendentes)} meses pendentes de coleta no período selecionado\n\n"
                for mes in meses_pendentes[:5]:
                    info_text += f"• {MESES_PT[mes['mes']]}/{mes['ano']}\n"
                if len(meses_pendentes) > 5:
                    info_text += f"... e mais {len(meses_pendentes) - 5} meses"
            else:
                info_text = "✅ Todos os meses do período selecionado já foram coletados!"

            if hasattr(self, 'info_meses_label'):
                self.info_meses_label.config(text=info_text)

            return meses_pendentes

        except Exception as e:
            logging.error(f"Erro ao atualizar info de meses: {e}")
            return []

    def toggle_visualizar_senha_historico(self):
        """Alterna visualização da senha na aba histórica"""
        if self.visualizar_senha_historico_var.get():
            self.senha_historico.config(show='')
        else:
            self.senha_historico.config(show='*')

    def iniciar_coleta_historica(self):
        """Inicia a coleta histórica com período selecionado"""
        email = self.email_historico.get().strip()
        senha = self.senha_historico.get().strip()

        if not email or not senha:
            messagebox.showerror("Erro", "Preencha email e senha!")
            return

        # Salvar configurações se solicitado
        if self.salvar_senha_var.get():
            self.sistema_coleta.config['email'] = email
            self.sistema_coleta.config['senha'] = senha
            self.sistema_coleta.config['salvar_senha'] = True
            self.sistema_coleta.salvar_configuracao()

        # Obter meses pendentes com base nas datas selecionadas
        try:
            data_inicio = self.data_inicio_historico.get_date()
            data_fim = self.data_fim_historico.get_date()

            ano_inicio = data_inicio.year
            mes_inicio = data_inicio.month
            ano_fim = data_fim.year
            mes_fim = data_fim.month

            meses_pendentes = self.base_dados.obter_meses_para_coletar(
                ano_inicio, mes_inicio, ano_fim, mes_fim
            )
        except Exception as e:
            messagebox.showerror("Erro", f"Erro nas datas: {str(e)}")
            return

        if not meses_pendentes:
            messagebox.showinfo("Info", "Não há meses pendentes para coleta no período selecionado!")
            return

        if not messagebox.askyesno("Confirmar",
                                   f"Serão coletados {len(meses_pendentes)} meses no período de "
                                   f"{mes_inicio}/{ano_inicio} a {mes_fim}/{ano_fim}.\n\n"
                                   "Isso pode levar várias horas.\n"
                                   "Deseja continuar?"):
            return

        # Fazer backup antes da coleta histórica
        self.gerenciador_backup.fazer_backup("pre_coleta_historica")

        # Relatórios selecionados
        relatorios_selecionados = [cod for cod, var in self.relatorios_hist_var.items() if var.get()]
        if not relatorios_selecionados:
            messagebox.showerror("Erro", "Selecione pelo menos um relatório para coletar!")
            return

        # Iniciar thread de coleta
        self.coleta_ativa = True
        thread = threading.Thread(target=self.executar_coleta_historica,
                                  args=(email, senha, meses_pendentes, relatorios_selecionados))
        thread.daemon = True
        thread.start()
        self.threads_ativas.append(thread)
        self._tb_abrir(thread)

    def _tb_abrir(self, thread):
        """Mostra a tela de bloqueio da coleta; fecha sozinha quando a thread terminar."""
        try:
            if not tela_bloqueio_habilitada():
                return
            self._tb_cover = TelaBloqueioRelatorio(self.root)
            self._tb_cover.mostrar()
            self._tb_vigia(thread)
        except Exception:
            pass

    def _tb_vigia(self, thread):
        try:
            if thread.is_alive():
                self.root.after(700, lambda: self._tb_vigia(thread))
            else:
                cover = getattr(self, "_tb_cover", None)
                if cover:
                    cover.fechar()
        except Exception:
            pass

    def executar_coleta_historica(self, email, senha, meses_pendentes, relatorios_selecionados=None):
        """Executa a coleta histórica em thread"""
        try:
            # Limpar log
            self.root.after(0, lambda: self.log_text.delete(1.0, tk.END))

            self.log("🚀 INICIANDO COLETA HISTÓRICA")
            self.log(f"📅 Total de meses: {len(meses_pendentes)}")
            if relatorios_selecionados:
                self.log(f"📊 Relatórios selecionados: {', '.join(relatorios_selecionados)}")

            # Iniciar driver
            self.log("🔧 Iniciando Chrome...")
            self.sistema_coleta.iniciar_driver()

            # Fazer login
            self.log("🔐 Fazendo login...")
            if not self.sistema_coleta.fazer_login(email, senha):
                self.log("❌ Erro no login!")
                self.root.after(0, lambda: messagebox.showerror("Erro", "Falha no login!"))
                return

            self.log("✅ Login realizado!")

            # Configurar progresso
            total = len(meses_pendentes)
            self.root.after(0, lambda: self.progresso_historico.configure(maximum=total))

            # Coletar cada mês
            for i, mes_info in enumerate(meses_pendentes, 1):
                if not self.coleta_ativa:
                    self.log("⏹️ Coleta interrompida pelo usuário")
                    break

                ano = mes_info['ano']
                mes = mes_info['mes']
                data_inicio = mes_info['data_inicio']
                data_fim = mes_info['data_fim']

                self.log(f"\n📅 [{i}/{total}] Coletando {MESES_PT[mes]}/{ano}...")

                # Coletar dados do mês (apenas relatórios selecionados)
                dados_mes = self.sistema_coleta.coletar_mes_completo(
                    ano, mes, data_inicio, data_fim, relatorios_selecionados=relatorios_selecionados
                )

                # Salvar na base + validar integridade
                if dados_mes:
                    validacao = self.base_dados.substituir_mes(ano, mes, dados_mes)
                    falhas = [r for r in (validacao or []) if r['status'] != 'OK']
                    if falhas:
                        nomes = ', '.join(r['relatorio'] for r in falhas)
                        self.log(f"⚠️ {MESES_PT[mes]}/{ano} salvo — atenção: {len(falhas)} relatório(s) zerado(s)/falhado(s): {nomes}")
                    else:
                        self.log(f"✅ Mês {MESES_PT[mes]}/{ano} salvo e validado (todos os relatórios OK)!")
                else:
                    self.log(f"⚠️ Falha na coleta do mês {MESES_PT[mes]}/{ano}")

                # Atualizar progresso
                self.root.after(0, lambda v=i: self.progresso_historico.configure(value=v))

            # Finalizar
            self.sistema_coleta.fechar_driver()

            if self.coleta_ativa:
                self.log("\n✅ COLETA HISTÓRICA CONCLUÍDA!")
                # Registrar no histórico de coletas
                resultados_finais = []
                for mes_info in meses_pendentes or []:
                    resultados_finais.append({'periodo': f"{mes_info.get('ano')}/{mes_info.get('mes')}", 'status': 'OK'})
                self.registrar_coleta_no_historico(
                    tipo='Histórica',
                    periodos=[f"{m.get('ano')}/{m.get('mes')}" for m in (meses_pendentes or [])],
                    resultados=resultados_finais)
                # Notificar
                total_f = sum(1 for r in resultados_finais if r['status'] != 'OK')
                self.root.after(0, lambda ok=len(resultados_finais)-total_f, fl=total_f:
                    self.notificar_fim_coleta(ok, fl))

        except Exception as e:
            self.log(f"❌ Erro: {str(e)}")
            logging.error(f"Erro na coleta histórica: {e}")
            self.root.after(0, lambda: messagebox.showerror("Erro", str(e)))
        finally:
            self.coleta_ativa = False

    # ================================================================
    # PAINEL DE INTEGRIDADE DA COLETA
    # ================================================================

    def abrir_painel_integridade(self):
        """Janela com status detalhado de cada período coletado."""
        FP = FONT_PRIMARY
        win = tk.Toplevel(self.root)
        win.title("🔍 Verificação de Integridade da Coleta")
        win.configure(bg='#f4f7fb')
        win.geometry("900x600")
        win.transient(self.root)

        # Header
        tk.Label(win, text="🔍  INTEGRIDADE DOS DADOS COLETADOS",
                 font=(FP, 16, 'bold'), fg='#0f3460', bg='#f4f7fb').pack(pady=(20, 4))
        tk.Label(win,
                 text="Verde = OK   |   Amarelo = Algum relatório zerado   |   Vermelho = Relatório não coletado",
                 font=(FP, 9), fg='#555', bg='#f4f7fb').pack(pady=(0, 12))

        periodos = self.base_dados.obter_status_periodos()

        if not periodos:
            tk.Label(win, text="Nenhuma coleta registrada ainda.",
                     font=(FP, 12), fg='#888', bg='#f4f7fb').pack(pady=40)
            return

        # Frame scrollável
        outer = tk.Frame(win, bg='#f4f7fb')
        outer.pack(fill='both', expand=True, padx=20, pady=5)

        canvas = tk.Canvas(outer, bg='#f4f7fb', highlightthickness=0)
        sb = ttk.Scrollbar(outer, orient='vertical', command=canvas.yview)
        inner = tk.Frame(canvas, bg='#f4f7fb')
        inner.bind('<Configure>', lambda e: canvas.configure(scrollregion=canvas.bbox('all')))
        canvas.create_window((0, 0), window=inner, anchor='nw')
        canvas.configure(yscrollcommand=sb.set)
        canvas.pack(side='left', fill='both', expand=True)
        sb.pack(side='right', fill='y')

        # Cabeçalho da tabela
        CORES_STATUS = {'OK': '#d4edda', 'PARCIAL': '#fff3cd', 'FALHOU': '#f8d7da'}
        ICONE_STATUS = {'OK': '✅', 'PARCIAL': '⚠️', 'FALHOU': '❌'}

        cabecalho = ['Período', 'Status Geral', 'OK', 'Zerado', 'Falhou', 'Última verificação']
        larguras  = [14,        14,              6,    8,        8,        22]
        for col, (cab, larg) in enumerate(zip(cabecalho, larguras)):
            tk.Label(inner, text=cab, font=(FP, 10, 'bold'),
                     fg='white', bg='#0f3460',
                     width=larg, anchor='center',
                     relief='flat', padx=4, pady=6).grid(row=0, column=col, padx=1, pady=1)

        for row, p in enumerate(periodos, start=1):
            bg = CORES_STATUS.get(p['status_geral'], '#ffffff')
            icone = ICONE_STATUS.get(p['status_geral'], '?')
            valores = [
                p['periodo'],
                f"{icone} {p['status_geral']}",
                str(p['ok']),
                str(p['zero']),
                str(p['falhou']),
                p['data']
            ]
            for col, (val, larg) in enumerate(zip(valores, larguras)):
                tk.Label(inner, text=val, font=(FP, 10),
                         fg='#333', bg=bg,
                         width=larg, anchor='center',
                         relief='flat', padx=4, pady=5).grid(row=row, column=col, padx=1, pady=1)

            # Botão "Ver detalhes" na última coluna
            def ver_detalhes(ano=p['ano'], mes=p['mes'], per=p['periodo']):
                self._mostrar_detalhes_periodo(ano, mes, per)

            tk.Button(inner, text="🔎 Detalhes",
                      command=ver_detalhes,
                      bg='#0f3460', fg='white',
                      font=(FP, 9), padx=6, pady=3,
                      relief='flat', cursor='hand2').grid(row=row, column=len(cabecalho), padx=6, pady=1)

        # Rodapé — resumo total
        total_ok     = sum(p['ok']     for p in periodos)
        total_zero   = sum(p['zero']   for p in periodos)
        total_falhou = sum(p['falhou'] for p in periodos)
        rodape = f"Total:  {total_ok} relatórios OK  |  {total_zero} zerados  |  {total_falhou} falharam"
        tk.Label(win, text=rodape, font=(FP, 10, 'bold'),
                 fg='#0f3460', bg='#f4f7fb').pack(pady=12)

    def _mostrar_detalhes_periodo(self, ano, mes, periodo_str):
        """Mostra detalhes de cada relatório de um período."""
        FP = FONT_PRIMARY
        df = self.base_dados.df_geral.get('VALIDACAO', pd.DataFrame())
        if df.empty:
            messagebox.showinfo("Sem dados", "Nenhuma validação registrada.")
            return

        registros = df[(df['ano'] == ano) & (df['mes'] == mes)]
        if registros.empty:
            messagebox.showinfo("Sem dados", f"Nenhuma validação para {periodo_str}.")
            return

        win = tk.Toplevel(self.root)
        win.title(f"🔎 Detalhes — {periodo_str}")
        win.configure(bg='#f4f7fb')
        win.geometry("700x420")
        win.transient(self.root)

        tk.Label(win, text=f"📋  {periodo_str} — Detalhes por Relatório",
                 font=(FP, 14, 'bold'), fg='#0f3460', bg='#f4f7fb').pack(pady=15)

        CORES = {'OK': '#d4edda', 'ZERO': '#fff3cd', 'FALHOU': '#f8d7da'}
        ICONES = {'OK': '✅', 'ZERO': '⚠️', 'FALHOU': '❌'}

        frame = tk.Frame(win, bg='#f4f7fb')
        frame.pack(padx=20, fill='x')

        for _, row in registros.iterrows():
            status = row.get('status', '')
            bg = CORES.get(status, '#fff')
            icone = ICONES.get(status, '?')
            linha = tk.Frame(frame, bg=bg, pady=4, padx=10)
            linha.pack(fill='x', pady=2)

            tk.Label(linha, text=f"{icone}  {row.get('relatorio','')}  —  {row.get('nome_relatorio','')}",
                     font=(FP, 10, 'bold'), fg='#333', bg=bg, anchor='w').pack(side='left')

            detalhe = f"  {row.get('registros',0)} reg.   Valor: {row.get('valor_principal',0)}"
            tk.Label(linha, text=detalhe,
                     font=(FP, 10), fg='#555', bg=bg, anchor='e').pack(side='right')

        # Mensagem de orientação se houver problemas
        tem_problema = any(registros['status'].isin(['ZERO', 'FALHOU']))
        if tem_problema:
            tk.Label(win,
                     text="⚠️  Relatórios ZERADOS ou FALHADOS podem indicar queda de internet durante a coleta.\n"
                          "Recomendado: colete novamente este período.",
                     font=(FP, 9), fg='#856404', bg='#fff3cd',
                     justify='center', padx=10, pady=8).pack(fill='x', padx=20, pady=10)

    def mostrar_resumo_pos_coleta(self, resultados: list, periodo_str: str):
        """Popup exibido automaticamente após cada coleta com resultado da validação."""
        FP = FONT_PRIMARY
        ok     = sum(1 for r in resultados if r['status'] == 'OK')
        zero   = sum(1 for r in resultados if r['status'] == 'ZERO')
        falhou = sum(1 for r in resultados if r['status'] == 'FALHOU')
        total  = len(resultados)

        if falhou == 0 and zero == 0:
            titulo = f"✅ Coleta {periodo_str} — Tudo OK!"
            cor    = '#28a745'
            msg    = f"Todos os {total} relatórios coletados com dados.\n\nNenhuma pendência."
        elif falhou > 0:
            titulo = f"⚠️ Coleta {periodo_str} — Atenção!"
            cor    = '#dc3545'
            msg    = (f"✅ OK: {ok}   ⚠️ Zerados: {zero}   ❌ Falharam: {falhou}\n\n"
                      f"Relatórios com falha podem ter tido queda de internet.\n"
                      f"Recomendado: colete este período novamente.")
        else:
            titulo = f"⚠️ Coleta {periodo_str} — Dados zerados"
            cor    = '#ffc107'
            msg    = (f"✅ OK: {ok}   ⚠️ Zerados: {zero}\n\n"
                      f"Alguns relatórios vieram zerados. Verifique se o período "
                      f"tinha movimento no salão ou colete novamente.")

        win = tk.Toplevel(self.root)
        win.title(titulo)
        win.configure(bg='#f4f7fb')
        win.transient(self.root)
        try:
            import ctypes
            sw = ctypes.windll.user32.GetSystemMetrics(0)
            sh = ctypes.windll.user32.GetSystemMetrics(1)
            w, h = 480, 300
            win.geometry(f"{w}x{h}+{(sw-w)//2}+{(sh-h)//2}")
        except Exception:
            win.geometry("480x300")

        tk.Label(win, text=titulo, font=(FP, 14, 'bold'), fg=cor, bg='#f4f7fb').pack(pady=(20, 8))
        tk.Label(win, text=msg, font=(FP, 11), fg='#333', bg='#f4f7fb',
                 justify='center', wraplength=420).pack(pady=8, padx=20)

        # Lista compacta dos com problema
        problemas = [r for r in resultados if r['status'] != 'OK']
        if problemas:
            tk.Label(win, text="Relatórios com problema:",
                     font=(FP, 9, 'bold'), fg='#555', bg='#f4f7fb').pack()
            for r in problemas:
                ic = '⚠️' if r['status'] == 'ZERO' else '❌'
                tk.Label(win, text=f"  {ic} {r['relatorio']} — {r['nome_relatorio']}",
                         font=(FP, 9), fg='#333', bg='#f4f7fb').pack(anchor='w', padx=40)

        tk.Button(win, text="OK, entendi",
                  command=win.destroy,
                  bg=cor, fg='white',
                  font=(FP, 11, 'bold'), padx=20, pady=6,
                  relief='flat', cursor='hand2').pack(pady=15)

    def parar_coleta(self):
        """Para a coleta em andamento"""
        if self.coleta_ativa:
            self.coleta_ativa = False
            self.log("⏹️ Solicitando parada...")
        else:
            messagebox.showinfo("Info", "Nenhuma coleta em andamento")

    def log(self, mensagem):
        """Adiciona mensagem ao log"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.root.after(0, lambda: self.log_text.insert(tk.END, f"[{timestamp}] {mensagem}\n"))
        self.root.after(0, lambda: self.log_text.see(tk.END))
        print(f"[{timestamp}] {mensagem}")

    # ============================================================================
    # MÉTODO ATUALIZADO: CONFIGURAR ABA MANUAL COM OPÇÃO DE VISUALIZAR SENHA
    # ============================================================================

    def configurar_aba_manual(self):
        """Configura a aba de coleta manual — sem scrollbar, preenche tela"""
        BG = '#f0f4f9'
        FP = FONT_PRIMARY

        self.aba_manual.configure(bg=BG)

        # Layout: banner (topo) + barra de ações (rodapé) + corpo.
        # A barra de ações é empacotada ANTES do corpo: quando a tela é
        # pequena o pack encolhe o corpo, nunca o rodapé — botões sempre visíveis.

        # ── Banner superior ───────────────────────────────────────────────
        banner = tk.Frame(self.aba_manual, bg='#1a3a5c', pady=10)
        banner.pack(side='top', fill='x')

        # ── Barra de ações fixa no rodapé ────────────────────────────────
        acoes_m = tk.Frame(self.aba_manual, bg='#1a3a5c', pady=10)
        acoes_m.pack(side='bottom', fill='x')
        tk.Label(banner, text='➕  COLETA MANUAL POR MÊS',
                 font=(FP, 16, 'bold'), fg='#ffffff', bg='#1a3a5c').pack(side='left', padx=20)
        tk.Label(banner, text='Selecione mês, período e relatórios desejados',
                 font=(FP, 9), fg='#a0c4ff', bg='#1a3a5c').pack(side='left')

        body = tk.Frame(self.aba_manual, bg=BG, padx=16, pady=10)
        body.pack(side='top', fill='both', expand=True)
        body.rowconfigure(1, weight=1)   # linha do progresso expande
        body.columnconfigure(0, weight=1)

        def card_m(parent, titulo, cor='#1a3a5c'):
            outer = tk.Frame(parent, bg=BG)
            topo = tk.Frame(outer, bg=cor, pady=7)
            topo.pack(fill='x')
            tk.Label(topo, text=titulo, font=(FP, 11, 'bold'),
                     fg='white', bg=cor).pack(side='left', padx=14)
            corpo = tk.Frame(outer, bg='#ffffff', padx=14, pady=12,
                             relief='solid', bd=1)
            corpo.pack(fill='both', expand=True)
            return outer, corpo

        # ── Linha 0: Período ─────────────────────────────────────────────
        per_outer, per_inner = card_m(body, '📅  SELECIONAR PERÍODO')
        per_outer.grid(row=0, column=0, sticky='ew', pady=(0, 8))

        tk.Label(per_inner, text='Ano:', bg='#ffffff', font=(FP, 10)).grid(
            row=0, column=0, sticky='w', pady=6)
        self.ano_manual = ttk.Combobox(per_inner,
            values=[str(a) for a in range(2019, datetime.now().year + 2)],
            width=10, font=(FP, 10))
        self.ano_manual.set(str(datetime.now().year))
        self.ano_manual.grid(row=0, column=1, padx=8, pady=6, sticky='w')

        tk.Label(per_inner, text='Mês:', bg='#ffffff', font=(FP, 10)).grid(
            row=0, column=2, sticky='w', pady=6, padx=(12, 0))
        self.mes_manual = ttk.Combobox(per_inner,
            values=['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
            width=14, font=(FP, 10))
        self.mes_manual.grid(row=0, column=3, padx=8, pady=6, sticky='w')

        tk.Label(per_inner, text='De:', bg='#ffffff', font=(FP, 10)).grid(
            row=1, column=0, sticky='w', pady=6)
        self.data_inicio_manual = DateEntry(per_inner, width=14, background='#1a3a5c',
            foreground='white', borderwidth=2, date_pattern='dd/mm/yyyy', font=(FP, 10))
        self.data_inicio_manual.grid(row=1, column=1, padx=8, pady=6)

        tk.Label(per_inner, text='Até:', bg='#ffffff', font=(FP, 10)).grid(
            row=1, column=2, sticky='w', pady=6, padx=(12, 0))
        self.data_fim_manual = DateEntry(per_inner, width=14, background='#1a3a5c',
            foreground='white', borderwidth=2, date_pattern='dd/mm/yyyy', font=(FP, 10))
        self.data_fim_manual.grid(row=1, column=3, padx=8, pady=6)

        tk.Button(per_inner, text='📅  Preencher mês inteiro',
                  command=self.preencher_datas_mes,
                  bg='#e8edf5', fg='#1a3a5c', font=(FP, 9, 'bold'),
                  padx=14, pady=5, relief='flat', cursor='hand2').grid(
                  row=2, column=0, columnspan=4, sticky='w', pady=(8, 0))

        # ── Compat: alias para o login global ────────────────────────────
        self.email_manual = self.email_global
        self.senha_manual = self.senha_global
        self.visualizar_senha_manual_var = tk.BooleanVar(value=False)

        # ── Linha 1 (esq): Relatórios | (dir): Progresso ─────────────────
        cols_m = tk.Frame(body, bg=BG)
        cols_m.grid(row=1, column=0, sticky='nsew')
        cols_m.rowconfigure(0, weight=1)
        cols_m.columnconfigure(0, weight=2)
        cols_m.columnconfigure(1, weight=3)

        rel_outer, rel_inner = card_m(cols_m, '📊  RELATÓRIOS PARA COLETAR', cor='#145a32')
        rel_outer.grid(row=0, column=0, sticky='nsew', padx=(0, 8))

        self.relatorios_var = {
            '0083': tk.BooleanVar(value=True), '0017': tk.BooleanVar(value=True),
            '0032': tk.BooleanVar(value=True), '0042': tk.BooleanVar(value=True),
            '0088': tk.BooleanVar(value=True), '0123': tk.BooleanVar(value=True),
            '0021': tk.BooleanVar(value=True), '0326': tk.BooleanVar(value=True),
            '0126': tk.BooleanVar(value=True), '0031': tk.BooleanVar(value=True),
            '0041': tk.BooleanVar(value=True), '0051': tk.BooleanVar(value=True),
            'comandas': tk.BooleanVar(value=True), '0033': tk.BooleanVar(value=True),
        }
        nomes_rel_m = {
            '0083': ('📈', 'Faturamento',    '#1a5276'),
            '0017': ('👤', 'Clientes Novos', '#145a32'),
            '0032': ('✂️', 'Serviços',       '#4a235a'),
            '0042': ('📦', 'Produtos',        '#7d6608'),
            '0088': ('📅', 'Fat. Diário',    '#1a5276'),
            '0123': ('💰', 'Pagamentos',     '#78281f'),
            '0021': ('🎫', 'Ticket Médio',   '#145a32'),
            '0326': ('⭐', 'Preferência',    '#4a235a'),
            '0126': ('⏰', 'Ocupação',        '#7d6608'),
            '0031': ('🔧', 'Serv. Prof.',    '#1a5276'),
            '0041': ('📦', 'Prod. Prof.',    '#78281f'),
            '0051': ('📅', 'Agendamentos',   '#0e6655'),
            'comandas': ('🧾', 'Comandas Final.', '#6c3483'),
            '0033': ('🏷️', 'Tabela Preços',  '#935116'),
        }
        chips_m = tk.Frame(rel_inner, bg='#ffffff')
        chips_m.pack(fill='x', pady=4)
        self._rel_man_btns = {}
        col_m = 0
        for codigo, var in self.relatorios_var.items():
            icone, nome, cor = nomes_rel_m.get(codigo, ('', codigo, '#0f3460'))
            def _tog_m(c=codigo, v=var):
                v.set(not v.get())
                self._rel_man_btns[c].config(
                    bg=nomes_rel_m[c][2] if v.get() else '#bdc3c7')
            btn = tk.Button(chips_m,
                            text=f'{icone} {nome}\n({codigo})',
                            command=_tog_m,
                            bg=cor, fg='white', font=(FP, 9, 'bold'),
                            width=13, height=2, relief='flat', cursor='hand2', wraplength=90)
            btn.grid(row=col_m // 4, column=col_m % 4, padx=6, pady=5, sticky='w')
            self._rel_man_btns[codigo] = btn
            col_m += 1

        sel_m = tk.Frame(rel_inner, bg='#ffffff')
        sel_m.pack(anchor='w', pady=(6, 0))
        tk.Button(sel_m, text='✅ Marcar todos',
                  command=lambda: self._toggle_todos_rel_man(True),
                  bg='#d5f5e3', fg='#145a32', font=(FP, 9, 'bold'),
                  padx=12, pady=4, relief='flat', cursor='hand2').pack(side='left', padx=4)
        tk.Button(sel_m, text='❌ Desmarcar todos',
                  command=lambda: self._toggle_todos_rel_man(False),
                  bg='#fadbd8', fg='#78281f', font=(FP, 9, 'bold'),
                  padx=12, pady=4, relief='flat', cursor='hand2').pack(side='left', padx=4)

        # ── Card: Progresso (coluna direita de cols_m) ───────────────────
        prog_outer_m, prog_inner_m = card_m(cols_m, '⚡  PROGRESSO DA COLETA', cor='#1a3a5c')
        prog_outer_m.grid(row=0, column=1, sticky='nsew')
        prog_inner_m.rowconfigure(2, weight=1)
        prog_inner_m.columnconfigure(0, weight=1)

        self._man_status_label = tk.Label(prog_inner_m, text='Aguardando início...',
            font=(FP, 10, 'bold'), fg='#555', bg='#ffffff')
        self._man_status_label.grid(row=0, column=0, sticky='w', pady=(0, 4))

        self.progresso_manual = ttk.Progressbar(prog_inner_m,
            mode='indeterminate', style='Azul.Horizontal.TProgressbar')
        self.progresso_manual.grid(row=1, column=0, sticky='ew', pady=(0, 8))

        self.log_manual = scrolledtext.ScrolledText(prog_inner_m,
            font=('Consolas', 9), bg='#0d1117', fg='#85c1e9',
            insertbackground='white', relief='flat',
            width=40, height=6)  # mínimo pequeno: expande via grid, cabe em telas menores
        self.log_manual.grid(row=2, column=0, sticky='nsew')
        self.log_manual.tag_config('ok',    foreground='#58d68d')
        self.log_manual.tag_config('erro',  foreground='#e74c3c')
        self.log_manual.tag_config('aviso', foreground='#f39c12')

        # ── Botões da barra de ações (frame criado no topo do método) ────
        def bm(txt, cmd, cor, hover=None):
            tk.Button(acoes_m, text=txt, command=cmd,
                      bg=cor, fg='white', font=(FP, 11, 'bold'),
                      padx=22, pady=10, relief='flat', cursor='hand2',
                      activebackground=hover or cor).pack(side='left', padx=8, pady=4)

        bm('▶  INICIAR COLETA', self.iniciar_coleta_manual, '#27ae60', '#1e8449')
        bm('⏹  PARAR',          self.parar_coleta_manual,   '#e74c3c', '#c0392b')
        bm('🔍  INTEGRIDADE',   self.abrir_painel_integridade, '#17a2b8', '#117a8b')

        self.coleta_manual_ativa = False

    def _toggle_todos_rel_man(self, valor):
        cores = {
            '0083': '#1a5276', '0017': '#145a32', '0032': '#4a235a',
            '0042': '#7d6608', '0088': '#1a5276', '0123': '#78281f',
            '0021': '#145a32', '0326': '#4a235a', '0126': '#7d6608',
            '0031': '#1a5276', '0041': '#78281f', '0051': '#0e6655',
            'comandas': '#6c3483', '0033': '#935116',
        }
        for codigo, var in self.relatorios_var.items():
            var.set(valor)
            self._rel_man_btns[codigo].config(
                bg=cores.get(codigo, '#0f3460') if valor else '#bdc3c7')

    def toggle_visualizar_senha_manual(self):
        """Alterna visualização da senha na aba manual"""
        if self.visualizar_senha_manual_var.get():
            self.senha_manual.config(show='')
        else:
            self.senha_manual.config(show='*')

    def preencher_datas_mes(self):
        """Preenche as datas com o mês inteiro selecionado"""
        try:
            mes_nome = self.mes_manual.get()
            ano = int(self.ano_manual.get())

            # Converter nome do mês para número
            meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                     'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
            mes_num = meses.index(mes_nome) + 1

            # Calcular último dia do mês
            if mes_num == 12:
                ultimo_dia = 31
            else:
                ultimo_dia = (datetime(ano, mes_num + 1, 1) - timedelta(days=1)).day

            # Preencher datas
            self.data_inicio_manual.set_date(datetime(ano, mes_num, 1))
            self.data_fim_manual.set_date(datetime(ano, mes_num, ultimo_dia))

        except Exception as e:
            messagebox.showerror("Erro", f"Erro ao preencher datas: {str(e)}")

    def iniciar_coleta_manual(self):
        """Inicia coleta manual para um mês específico"""
        email = self.email_manual.get().strip()
        senha = self.senha_manual.get().strip()

        if not email or not senha:
            messagebox.showerror("Erro", "Preencha email e senha!")
            return

        # Validar seleção de mês
        try:
            ano = int(self.ano_manual.get())
            mes_nome = self.mes_manual.get()
            meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                     'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
            mes = meses.index(mes_nome) + 1

            data_inicio = self.data_inicio_manual.get()
            data_fim = self.data_fim_manual.get()

            # Converter formato da data
            data_inicio_obj = datetime.strptime(data_inicio, '%d/%m/%Y')
            data_fim_obj = datetime.strptime(data_fim, '%d/%m/%Y')

            data_inicio_formatada = data_inicio_obj.strftime('%d/%m/%Y')
            data_fim_formatada = data_fim_obj.strftime('%d/%m/%Y')

        except Exception as e:
            messagebox.showerror("Erro", f"Erro nas datas: {str(e)}")
            return

        # Verificar se já foi coletado
        if self.base_dados.mes_ja_coletado(ano, mes):
            if not messagebox.askyesno("Aviso",
                                       f"O mês {mes_nome}/{ano} já foi coletado.\n"
                                       "Deseja sobrescrever?"):
                return

        # Fazer backup antes da coleta
        self.gerenciador_backup.fazer_backup("pre_coleta_manual")

        # Iniciar thread de coleta
        self.coleta_manual_ativa = True
        self.progresso_manual.start()  # Iniciar progresso indeterminado

        thread = threading.Thread(target=self.executar_coleta_manual,
                                  args=(email, senha, ano, mes,
                                        data_inicio_formatada, data_fim_formatada))
        thread.daemon = True
        thread.start()
        self.threads_ativas.append(thread)
        self._tb_abrir(thread)

    def executar_coleta_manual(self, email, senha, ano, mes, data_inicio, data_fim):
        """Executa a coleta manual em thread"""
        try:
            # Limpar log
            self.root.after(0, lambda: self.log_manual.delete(1.0, tk.END))

            self.log_manual_insert("🚀 INICIANDO COLETA MANUAL")
            self.log_manual_insert(f"📅 Período: {MESES_PT[mes]}/{ano}")
            self.log_manual_insert(f"📆 {data_inicio} a {data_fim}")

            # Iniciar driver
            self.log_manual_insert("🔧 Iniciando Chrome...")
            self.sistema_coleta.iniciar_driver()

            # Fazer login
            self.log_manual_insert("🔐 Fazendo login...")
            if not self.sistema_coleta.fazer_login(email, senha):
                self.log_manual_insert("❌ Erro no login!")
                self.root.after(0, lambda: messagebox.showerror("Erro", "Falha no login!"))
                return

            self.log_manual_insert("✅ Login realizado!")

            # Verificar quais relatórios coletar
            relatorios_para_coletar = []
            for codigo, var in self.relatorios_var.items():
                if var.get():
                    relatorios_para_coletar.append(codigo)

            self.log_manual_insert(f"📊 Coletando {len(relatorios_para_coletar)} relatórios...")

            # Dados do mês
            dados_mes = {
                'ano': ano,
                'mes': mes,
                'data_inicio': data_inicio,
                'data_fim': data_fim,
                'resumo': {},
                'faturamento_diario': [],
                'servicos': [],
                'produtos': [],
                'profissionais': {}
            }

            # Coletar cada relatório selecionado
            if '0083' in relatorios_para_coletar:
                self.log_manual_insert("📊 Coletando 0083 - Faturamento...")
                dados_0083 = self.sistema_coleta.coletar_relatorio_0083(data_inicio, data_fim)
                if dados_0083:
                    dados_mes['resumo']['faturamento_total'] = self.sistema_coleta.converter_valor_monetario(
                        dados_0083.get('faturamento', '0'))
                    dados_mes['resumo']['ticket_medio'] = self.sistema_coleta.converter_valor_monetario(
                        dados_0083.get('ticket_medio', '0'))
                    dados_mes['resumo']['clientes_atendidos'] = self.sistema_coleta.converter_valor_monetario(
                        dados_0083.get('clientes_atendidos', '0'))
                    self.log_manual_insert("✅ 0083 coletado")

            if '0017' in relatorios_para_coletar:
                self.log_manual_insert("📊 Coletando 0017 - Clientes Novos...")
                dados_0017 = self.sistema_coleta.coletar_relatorio_0017(data_inicio, data_fim)
                if dados_0017:
                    dados_mes['resumo']['clientes_novos'] = self.sistema_coleta.converter_valor_monetario(
                        dados_0017.get('clientes_novos', '0'))
                    self.log_manual_insert("✅ 0017 coletado")

            if '0032' in relatorios_para_coletar:
                self.log_manual_insert("📊 Coletando 0032 - Serviços...")
                dados_0032 = self.sistema_coleta.coletar_relatorio_0032(data_inicio, data_fim)
                if dados_0032:
                    dados_mes['servicos'] = dados_0032
                    self.log_manual_insert("✅ 0032 coletado")

            if '0042' in relatorios_para_coletar:
                self.log_manual_insert("📊 Coletando 0042 - Produtos...")
                dados_0042 = self.sistema_coleta.coletar_relatorio_0042(data_inicio, data_fim)
                if dados_0042:
                    dados_mes['produtos'] = dados_0042.get('produtos', [])
                    fat_produtos = dados_0042.get('valor_faturado', 0)

                    # Calcular percentuais
                    fat_total = dados_mes['resumo'].get('faturamento_total', 0)
                    if fat_total > 0:
                        fat_servicos = fat_total - fat_produtos
                        dados_mes['resumo']['faturamento_servicos'] = fat_servicos
                        dados_mes['resumo']['faturamento_produtos'] = fat_produtos
                        dados_mes['resumo']['percentual_servicos'] = (fat_servicos / fat_total) * 100
                        dados_mes['resumo']['percentual_produtos'] = (fat_produtos / fat_total) * 100
                    self.log_manual_insert("✅ 0042 coletado")

            if '0088' in relatorios_para_coletar:
                self.log_manual_insert("📊 Coletando 0088 - Faturamento Diário...")
                dados_0088 = self.sistema_coleta.coletar_relatorio_0088(data_inicio, data_fim)
                if dados_0088:
                    dados_mes['faturamento_diario'] = dados_0088
                    self.log_manual_insert("✅ 0088 coletado")

            # Profissionais
            profissionais = {}

            if '0123' in relatorios_para_coletar:
                self.log_manual_insert("👥 Coletando 0123 - Pagamentos...")
                pagamentos = self.sistema_coleta.coletar_relatorio_0123(data_inicio, data_fim)
                if pagamentos:
                    profissionais['pagamentos'] = pagamentos
                    self.log_manual_insert("✅ 0123 coletado")

            if '0021' in relatorios_para_coletar:
                self.log_manual_insert("👥 Coletando 0021 - Ticket Médio...")
                ticket = self.sistema_coleta.coletar_relatorio_0021(data_inicio, data_fim)
                if ticket:
                    profissionais['ticket'] = ticket
                    self.log_manual_insert("✅ 0021 coletado")

            if '0326' in relatorios_para_coletar:
                self.log_manual_insert("👥 Coletando 0326 - Preferência...")
                preferencia = self.sistema_coleta.coletar_relatorio_0326(data_inicio, data_fim)
                if preferencia:
                    profissionais['preferencia'] = preferencia
                    self.log_manual_insert("✅ 0326 coletado")

            if '0126' in relatorios_para_coletar:
                self.log_manual_insert("👥 Coletando 0126 - Ocupação...")
                ocupacao = self.sistema_coleta.coletar_relatorio_0126(data_inicio, data_fim)
                if ocupacao:
                    profissionais['ocupacao'] = ocupacao
                    self.log_manual_insert("✅ 0126 coletado")

            if '0031' in relatorios_para_coletar:
                self.log_manual_insert("👥 Coletando 0031 - Servicos por Profissional...")
                try:
                    servicos_detalhados, raw_linhas_0031 = self.sistema_coleta.coletar_relatorio_0031(data_inicio, data_fim)
                    if servicos_detalhados:
                        profissionais['servicos_detalhados'] = servicos_detalhados
                    if raw_linhas_0031:
                        profissionais['atendimentos_raw'] = raw_linhas_0031
                        self.log_manual_insert(f"✅ 0031 coletado ({len(raw_linhas_0031)} atendimentos raw)")
                except Exception as e:
                    self.log_manual_insert(f"⚠️ 0031 erro (continuando): {e}")
                    logging.error(f"0031 manual falhou: {e}", exc_info=True)

            if '0041' in relatorios_para_coletar:
                self.log_manual_insert("👥 Coletando 0041 - Produtos por Profissional...")
                try:
                    produtos_prof, produtos_raw = self.sistema_coleta.coletar_relatorio_0041(data_inicio, data_fim)
                    if produtos_prof:
                        profissionais['produtos'] = produtos_prof
                    if produtos_raw:
                        profissionais['produtos_raw'] = produtos_raw
                    if produtos_prof or produtos_raw:
                        self.log_manual_insert("✅ 0041 coletado (%d linhas de produto)" % len(produtos_raw or []))
                except Exception as e:
                    self.log_manual_insert(f"⚠️ 0041 erro (continuando): {e}")
                    logging.error(f"0041 manual falhou: {e}", exc_info=True)

            if '0051' in relatorios_para_coletar:
                self.log_manual_insert("📅 Coletando 0051 - Agendamentos...")
                try:
                    agend_raw = self.sistema_coleta.coletar_relatorio_0051(data_inicio, data_fim)
                    if agend_raw:
                        profissionais['agendamentos_raw'] = agend_raw
                        self.log_manual_insert(f"✅ 0051 coletado ({len(agend_raw)} agendamentos)")
                    else:
                        self.log_manual_insert("⚠️ 0051 retornou 0 agendamentos")
                except Exception as e:
                    self.log_manual_insert(f"⚠️ 0051 erro: {e}")
                    logging.error(f"0051 manual falhou: {e}", exc_info=True)
                    self.log_manual_insert(f"✅ 0051 coletado ({len(agend_raw)} agendamentos)")

            # Comandas Finalizadas — quem fechou e quanto entrou por comanda.
            # Depende do periodo, como os atendimentos.
            if 'comandas' in relatorios_para_coletar:
                try:
                    self.log_manual_insert("Coletando Comandas Finalizadas...")
                    cmds = self.sistema_coleta.coletar_comandas_finalizadas(data_inicio, data_fim)
                    if cmds:
                        profissionais['comandas_raw'] = cmds
                        self.log_manual_insert("Comandas Finalizadas: %d registros" % len(cmds))
                    else:
                        self.log_manual_insert("Comandas Finalizadas retornou 0 — ver o log")
                except Exception as e:
                    self.log_manual_insert("Comandas Finalizadas erro: %s" % e)
                    logging.error("Comandas manual falhou: %s" % e, exc_info=True)

            # 0033 - Tabela de Precos (a regua da conferencia de caixa).
            # Nao depende do mes escolhido: e a tabela vigente. Agora respeita a
            # caixinha da tela — antes rodava sempre, mesmo desmarcado.
            if '0033' in relatorios_para_coletar:
              try:
                self.log_manual_insert("Coletando 0033 (Tabela de Precos)...")
                precos_0033 = self.sistema_coleta.coletar_relatorio_0033()
                if precos_0033:
                    profissionais['tabela_precos'] = precos_0033
                    self.log_manual_insert("0033 coletado (%d servicos)" % len(precos_0033))
                else:
                    self.log_manual_insert("0033 retornou 0 servicos — ver o log para as colunas recebidas")
              except Exception as e:
                self.log_manual_insert("0033 erro: %s" % e)
                logging.error("0033 manual falhou: %s" % e, exc_info=True)

            dados_mes['profissionais'] = profissionais

            # Salvar na base + validar integridade
            if dados_mes:
                validacao = self.base_dados.substituir_mes(ano, mes, dados_mes)
                sucesso = True
                periodo_str = f"{MESES_PT[mes]}/{ano}"
                # Mostra popup com resultado da validação na thread principal
                if validacao:
                    self.root.after(0, lambda v=validacao, p=periodo_str:
                                    self.mostrar_resumo_pos_coleta(v, p))
                self.log_manual_insert(f"✅ Mês {periodo_str} salvo!")
            else:
                self.log_manual_insert("⚠️ Falha na coleta do mês")
                sucesso = False

            # Finalizar
            self.sistema_coleta.fechar_driver()
            self.root.after(0, lambda: self.progresso_manual.stop())

            if sucesso:
                self.log_manual_insert("\n✅ COLETA MANUAL CONCLUÍDA!")
                self.root.after(0, lambda: messagebox.showinfo("Sucesso",
                                                               f"Coleta do mês {MESES_PT[mes]}/{ano} concluída!"))

        except Exception as e:
            self.log_manual_insert(f"❌ Erro: {str(e)}")
            logging.error(f"Erro na coleta manual: {e}")
            self.root.after(0, lambda: self.progresso_manual.stop())
            self.root.after(0, lambda: messagebox.showerror("Erro", str(e)))
        finally:
            self.coleta_manual_ativa = False

    def log_manual_insert(self, mensagem):
        """Adiciona mensagem ao log manual"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.root.after(0, lambda: self.log_manual.insert(tk.END, f"[{timestamp}] {mensagem}\n"))
        self.root.after(0, lambda: self.log_manual.see(tk.END))
        print(f"[{timestamp}] {mensagem}")

    def parar_coleta_manual(self):
        """Para coleta manual"""
        self.coleta_manual_ativa = False
        self.log_manual.insert(tk.END, "⏹️ Coleta interrompida\n")

    def adicionar_profissional(self):
        """Adiciona novo profissional"""
        nome = self.nome_profissional.get().strip()
        apelido = self.apelido_profissional.get().strip()
        categoria = self.categoria_profissional.get().strip()

        if not nome:
            messagebox.showerror("Erro", "Nome é obrigatório!")
            return

        sucesso, msg = self.sistema_coleta.gerenciador_profissionais.adicionar_profissional(
            nome, apelido, categoria
        )

        if sucesso:
            messagebox.showinfo("Sucesso", msg)
            self.nome_profissional.delete(0, tk.END)
            self.apelido_profissional.delete(0, tk.END)
            self.categoria_profissional.set('')
            self.atualizar_lista_profissionais()
        else:
            messagebox.showerror("Erro", msg)

    def get_profissional_selecionado(self):
        """Retorna o índice e dados do profissional selecionado"""
        selection = self.tree_profissionais.selection()
        if not selection:
            return None, None, None

        item = self.tree_profissionais.item(selection[0])
        values = item['values']
        # values = [nome_completo, apelido, categoria]

        # Encontrar o índice no array de profissionais
        for i, prof in enumerate(self.sistema_coleta.gerenciador_profissionais.profissionais):
            if prof['nome_completo'] == values[0]:
                return i, prof, values

        return None, None, None

    def editar_profissional(self):
        """Edita profissional selecionado"""
        index, prof, values = self.get_profissional_selecionado()

        if index is None:
            messagebox.showerror("Erro", "Selecione um profissional!")
            return

        # Criar janela de edição
        janela = tk.Toplevel(self.root)
        janela.title("✏️ EDITAR PROFISSIONAL")
        janela.geometry("500x300")
        janela.configure(bg='#ffffff')
        janela.transient(self.root)
        janela.grab_set()

        # Frame principal
        frame = tk.Frame(janela, bg='#ffffff', padx=20, pady=20)
        frame.pack(fill='both', expand=True)

        tk.Label(frame, text="✏️ EDITAR PROFISSIONAL",
                 font=('Segoe UI', 16, 'bold'),
                 fg='#0f3460', bg='#ffffff').pack(pady=(0, 20))

        # Nome Completo
        tk.Label(frame, text="Nome Completo:", bg='#ffffff',
                 font=('Segoe UI', 10)).pack(anchor='w')
        nome_entry = tk.Entry(frame, width=50, font=('Segoe UI', 10))
        nome_entry.pack(fill='x', pady=(0, 10))
        nome_entry.insert(0, values[0])

        # Apelido
        tk.Label(frame, text="Apelido:", bg='#ffffff',
                 font=('Segoe UI', 10)).pack(anchor='w')
        apelido_entry = tk.Entry(frame, width=50, font=('Segoe UI', 10))
        apelido_entry.pack(fill='x', pady=(0, 10))
        apelido_entry.insert(0, values[1])

        # Categoria
        tk.Label(frame, text="Categoria:", bg='#ffffff',
                 font=('Segoe UI', 10)).pack(anchor='w')
        categoria_combo = ttk.Combobox(frame,
                                       values=self.sistema_coleta.gerenciador_profissionais.categorias,
                                       width=47)
        categoria_combo.pack(fill='x', pady=(0, 20))
        categoria_combo.set(values[2])

        # Botões
        btn_frame = tk.Frame(frame, bg='#ffffff')
        btn_frame.pack(pady=10)

        def salvar_edicao():
            nome = nome_entry.get().strip()
            apelido = apelido_entry.get().strip()
            categoria = categoria_combo.get().strip()

            if not nome:
                messagebox.showerror("Erro", "Nome é obrigatório!")
                return

            sucesso, msg = self.sistema_coleta.gerenciador_profissionais.editar_profissional(
                index, nome, apelido, categoria
            )

            if sucesso:
                messagebox.showinfo("Sucesso", msg)
                janela.destroy()
                self.atualizar_lista_profissionais()
            else:
                messagebox.showerror("Erro", msg)

        tk.Button(btn_frame, text="💾 SALVAR", command=salvar_edicao,
                  bg='#28a745', fg='white', font=('Segoe UI', 10, 'bold'),
                  padx=20, pady=5, cursor='hand2').pack(side='left', padx=5)

        tk.Button(btn_frame, text="❌ CANCELAR", command=janela.destroy,
                  bg='#dc3545', fg='white', font=('Segoe UI', 10, 'bold'),
                  padx=20, pady=5, cursor='hand2').pack(side='left', padx=5)

    def excluir_profissional(self):
        """Exclui profissional selecionado"""
        index, prof, values = self.get_profissional_selecionado()

        if index is None:
            messagebox.showerror("Erro", "Selecione um profissional!")
            return

        # Confirmar exclusão
        if not messagebox.askyesno("Confirmar Exclusão",
                                   f"Tem certeza que deseja excluir o profissional:\n\n"
                                   f"Nome: {values[0]}\n"
                                   f"Apelido: {values[1]}\n"
                                   f"Categoria: {values[2]}\n\n"
                                   "Esta ação não pode ser desfeita!"):
            return

        sucesso, msg = self.sistema_coleta.gerenciador_profissionais.excluir_profissional(index)

        if sucesso:
            messagebox.showinfo("Sucesso", msg)
            self.atualizar_lista_profissionais()
        else:
            messagebox.showerror("Erro", msg)

    def adicionar_categoria(self):
        """Adiciona nova categoria"""
        categoria = self.nova_categoria.get().strip()
        if not categoria:
            messagebox.showerror("Erro", "Digite uma categoria!")
            return

        sucesso, msg = self.sistema_coleta.gerenciador_profissionais.adicionar_categoria(categoria)

        if sucesso:
            messagebox.showinfo("Sucesso", msg)
            self.nova_categoria.delete(0, tk.END)
            # Atualizar combobox
            self.categoria_profissional['values'] = self.sistema_coleta.gerenciador_profissionais.categorias
        else:
            messagebox.showerror("Erro", msg)

    def excluir_categoria(self):
        """Exclui categoria selecionada"""
        categoria = self.categoria_profissional.get().strip()
        if not categoria:
            messagebox.showerror("Erro", "Selecione uma categoria!")
            return

        if messagebox.askyesno("Confirmar", f"Deseja excluir a categoria '{categoria}'?"):
            sucesso, msg = self.sistema_coleta.gerenciador_profissionais.excluir_categoria(categoria)
            if sucesso:
                messagebox.showinfo("Sucesso", msg)
                self.categoria_profissional['values'] = self.sistema_coleta.gerenciador_profissionais.categorias
                self.categoria_profissional.set('')
            else:
                messagebox.showerror("Erro", msg)

    def atualizar_lista_profissionais(self):
        """Atualiza a lista de profissionais na treeview"""
        # Limpar treeview
        for item in self.tree_profissionais.get_children():
            self.tree_profissionais.delete(item)

        # Adicionar profissionais
        for prof in self.sistema_coleta.gerenciador_profissionais.profissionais:
            self.tree_profissionais.insert('', 'end', values=(
                prof['nome_completo'],
                prof['apelido'],
                prof['categoria']
            ))

    def salvar_configuracoes(self):
        """Salva as configurações editadas"""
        try:
            # Atualizar timeouts
            for key, var in self.timeout_vars.items():
                try:
                    self.sistema_coleta.configuracoes_editaveis['timeouts'][key] = int(var.get())
                except:
                    pass

            # Atualizar URLs
            self.sistema_coleta.configuracoes_editaveis['urls']['login'] = self.url_vars['login'].get()

            for key, var in self.url_vars.items():
                if key.startswith('relatorio_'):
                    codigo = key.replace('relatorio_', '')
                    self.sistema_coleta.configuracoes_editaveis['urls']['relatorios'][codigo] = var.get()

            # Atualizar XPaths
            for key, var in self.xpath_vars.items():
                if key.startswith('login_'):
                    xpath_key = key.replace('login_', '')
                    self.sistema_coleta.configuracoes_editaveis['xpaths']['login'][xpath_key] = var.get()
                elif key.startswith('relatorio_'):
                    xpath_key = key.replace('relatorio_', '')
                    self.sistema_coleta.configuracoes_editaveis['xpaths']['relatorios'][xpath_key] = var.get()

            # Salvar
            self.sistema_coleta.salvar_configuracao()
            messagebox.showinfo("Sucesso", "Configurações salvas com sucesso!")

        except Exception as e:
            messagebox.showerror("Erro", f"Erro ao salvar: {str(e)}")

    def restaurar_configuracoes(self):
        """Restaura configurações padrão"""
        if messagebox.askyesno("Confirmar", "Restaurar configurações padrão?"):
            # Implementar restauração
            messagebox.showinfo("Info", "Funcionalidade em desenvolvimento")

    def atualizar_logs(self):
        """Atualiza a exibição dos logs carregando o arquivo e populando o cache."""
        try:
            linhas = []
            if os.path.exists('nodri_historico.log'):
                with open('nodri_historico.log', 'r', encoding='utf-8', errors='replace') as f:
                    linhas = [l.rstrip('\n') for l in f.readlines()]

            # Guarda todas as linhas no cache para o filtro
            if hasattr(self, '_log_linhas_todas'):
                self._log_linhas_todas = linhas

            self.logs_text.config(state='normal')
            self.logs_text.delete(1.0, tk.END)
            for linha in linhas:
                tag = self._tag_para_linha(linha) if hasattr(self, '_tag_para_linha') else 'info'
                self.logs_text.insert(tk.END, linha + '\n', tag)
            self.logs_text.config(state='disabled')
            self.logs_text.see(tk.END)

            if hasattr(self, '_log_contador_label'):
                self._log_contador_label.config(
                    text=f'{len(linhas)} linha(s) no log')
        except Exception as e:
            self.logs_text.config(state='normal')
            self.logs_text.insert(tk.END, f"Erro ao carregar logs: {str(e)}\n")
            self.logs_text.config(state='disabled')

    def limpar_logs(self):
        """Limpa a visualização dos logs"""
        self.logs_text.delete(1.0, tk.END)

    def abrir_pasta_logs(self):
        """Abre a pasta de logs"""
        pasta_atual = os.path.dirname(os.path.abspath(__file__))
        if sys.platform == "win32":
            os.startfile(pasta_atual)
        else:
            os.system(f'xdg-open "{pasta_atual}"')

    def configurar_aba_profissionais(self):
        """Configura a aba de gerenciamento de profissionais"""
        container = tk.Frame(self.aba_profissionais, bg='#ffffff', padx=20, pady=20)
        container.pack(fill='both', expand=True)

        tk.Label(container, text='👥 GERENCIAMENTO DE PROFISSIONAIS',
                 font=('Segoe UI', 18, 'bold'),
                 fg='#0f3460', bg='#ffffff').pack(pady=(0, 20))

        # Frame de cadastro
        cadastro_frame = tk.LabelFrame(container, text='➕ CADASTRAR NOVO PROFISSIONAL',
                                       font=('Segoe UI', 12, 'bold'),
                                       bg='#ffffff', fg='#0f3460',
                                       padx=15, pady=15)
        cadastro_frame.pack(fill='x', pady=(0, 20))

        tk.Label(cadastro_frame, text='Nome Completo:', bg='#ffffff',
                 font=('Segoe UI', 10)).grid(row=0, column=0, sticky='w', pady=5)
        self.nome_profissional = tk.Entry(cadastro_frame, width=30, font=('Segoe UI', 10))
        self.nome_profissional.grid(row=0, column=1, padx=10, pady=5)

        tk.Label(cadastro_frame, text='Apelido:', bg='#ffffff',
                 font=('Segoe UI', 10)).grid(row=0, column=2, sticky='w', pady=5)
        self.apelido_profissional = tk.Entry(cadastro_frame, width=15, font=('Segoe UI', 10))
        self.apelido_profissional.grid(row=0, column=3, padx=10, pady=5)

        tk.Label(cadastro_frame, text='Categoria:', bg='#ffffff',
                 font=('Segoe UI', 10)).grid(row=1, column=0, sticky='w', pady=5)
        self.categoria_profissional = ttk.Combobox(cadastro_frame,
                                                   values=self.sistema_coleta.gerenciador_profissionais.categorias,
                                                   width=20)
        self.categoria_profissional.grid(row=1, column=1, padx=10, pady=5)

        tk.Button(cadastro_frame, text='➕ ADICIONAR',
                  command=self.adicionar_profissional,
                  bg='#28a745', fg='white',
                  font=('Segoe UI', 10, 'bold'),
                  cursor='hand2').grid(row=1, column=2, columnspan=2, pady=10)

        # Frame de categorias
        categoria_frame = tk.LabelFrame(container, text='📋 GERENCIAR CATEGORIAS',
                                        font=('Segoe UI', 12, 'bold'),
                                        bg='#ffffff', fg='#0f3460',
                                        padx=15, pady=15)
        categoria_frame.pack(fill='x', pady=(0, 20))

        tk.Label(categoria_frame, text='Nova Categoria:', bg='#ffffff',
                 font=('Segoe UI', 10)).grid(row=0, column=0, sticky='w', pady=5)
        self.nova_categoria = tk.Entry(categoria_frame, width=20, font=('Segoe UI', 10))
        self.nova_categoria.grid(row=0, column=1, padx=10, pady=5)

        tk.Button(categoria_frame, text='➕ ADICIONAR CATEGORIA',
                  command=self.adicionar_categoria,
                  bg='#17a2b8', fg='white',
                  font=('Segoe UI', 10),
                  cursor='hand2').grid(row=0, column=2, padx=10, pady=5)

        tk.Button(categoria_frame, text='🗑️ EXCLUIR CATEGORIA',
                  command=self.excluir_categoria,
                  bg='#dc3545', fg='white',
                  font=('Segoe UI', 10),
                  cursor='hand2').grid(row=0, column=3, padx=10, pady=5)

        # Lista de profissionais
        lista_frame = tk.LabelFrame(container, text='📋 PROFISSIONAIS CADASTRADOS',
                                    font=('Segoe UI', 12, 'bold'),
                                    bg='#ffffff', fg='#0f3460',
                                    padx=15, pady=15)
        lista_frame.pack(fill='both', expand=True, pady=(0, 20))

        # Treeview
        colunas = ('Nome Completo', 'Apelido', 'Categoria')
        self.tree_profissionais = ttk.Treeview(lista_frame, columns=colunas, show='headings', height=10)

        for col in colunas:
            self.tree_profissionais.heading(col, text=col)
            self.tree_profissionais.column(col, width=200)

        scrollbar = ttk.Scrollbar(lista_frame, orient='vertical', command=self.tree_profissionais.yview)
        self.tree_profissionais.configure(yscrollcommand=scrollbar.set)

        self.tree_profissionais.pack(side='left', fill='both', expand=True)
        scrollbar.pack(side='right', fill='y')

        # No método configurar_aba_profissionais, depois de criar a treeview, adicione:
        self.tree_profissionais.bind('<Double-1>', lambda e: self.editar_profissional())

        # Botões de ação
        btn_frame = tk.Frame(lista_frame, bg='#ffffff')
        btn_frame.pack(fill='x', pady=10)

        tk.Button(btn_frame, text='✏️ EDITAR',
                  command=self.editar_profissional,
                  bg='#ffc107', fg='black',
                  font=('Segoe UI', 10),
                  cursor='hand2').pack(side='left', padx=5)

        tk.Button(btn_frame, text='🗑️ EXCLUIR',
                  command=self.excluir_profissional,
                  bg='#dc3545', fg='white',
                  font=('Segoe UI', 10),
                  cursor='hand2').pack(side='left', padx=5)

        tk.Button(btn_frame, text='🔄 ATUALIZAR LISTA',
                  command=self.atualizar_lista_profissionais,
                  bg='#17a2b8', fg='white',
                  font=('Segoe UI', 10),
                  cursor='hand2').pack(side='left', padx=5)

        tk.Button(btn_frame, text='📋 IMPORTAR EM MASSA',
                  command=self.abrir_importador_profissionais,
                  bg='#6610f2', fg='white',
                  font=('Segoe UI', 10, 'bold'),
                  padx=15, pady=5,
                  cursor='hand2').pack(side='left', padx=5)

        # Carregar lista inicial
        self.atualizar_lista_profissionais()

    def configurar_aba_configuracoes(self):
        """Configura a aba de configurações"""
        container = tk.Frame(self.aba_config, bg='#ffffff', padx=20, pady=20)
        container.pack(fill='both', expand=True)

        tk.Label(container, text='⚙️ CONFIGURAÇÕES DO SISTEMA',
                 font=('Segoe UI', 18, 'bold'),
                 fg='#0f3460', bg='#ffffff').pack(pady=(0, 20))

        # Notebook interno para organizar configurações
        config_notebook = ttk.Notebook(container)
        config_notebook.pack(fill='both', expand=True)

        # Aba Timeouts
        timeouts_frame = tk.Frame(config_notebook, bg='#ffffff', padx=15, pady=15)
        config_notebook.add(timeouts_frame, text='⏱️ TIMEOUTS')

        timeouts = self.sistema_coleta.configuracoes_editaveis['timeouts']

        self.timeout_vars = {}
        row = 0
        for key, value in timeouts.items():
            tk.Label(timeouts_frame, text=f'{key}:', bg='#ffffff',
                     font=('Segoe UI', 10)).grid(row=row, column=0, sticky='w', pady=5)

            var = tk.StringVar(value=str(value))
            self.timeout_vars[key] = var
            tk.Entry(timeouts_frame, textvariable=var, width=10,
                     font=('Segoe UI', 10)).grid(row=row, column=1, padx=10, pady=5)

            tk.Label(timeouts_frame, text='segundos', bg='#ffffff',
                     font=('Segoe UI', 9)).grid(row=row, column=2, sticky='w', pady=5)
            row += 1

        # Aba URLs
        urls_frame = tk.Frame(config_notebook, bg='#ffffff', padx=15, pady=15)
        config_notebook.add(urls_frame, text='🔗 URLs')

        self.url_vars = {}
        row = 0

        # URL Login
        tk.Label(urls_frame, text='Login:', bg='#ffffff',
                 font=('Segoe UI', 10, 'bold')).grid(row=row, column=0, sticky='w', pady=5)
        self.url_vars['login'] = tk.StringVar(value=self.sistema_coleta.configuracoes_editaveis['urls']['login'])
        tk.Entry(urls_frame, textvariable=self.url_vars['login'], width=60,
                 font=('Segoe UI', 9)).grid(row=row, column=1, padx=10, pady=5)
        row += 1

        # URLs Relatórios
        tk.Label(urls_frame, text='Relatórios:', bg='#ffffff',
                 font=('Segoe UI', 10, 'bold')).grid(row=row, column=0, sticky='w', pady=5)
        row += 1

        for codigo, url in self.sistema_coleta.configuracoes_editaveis['urls']['relatorios'].items():
            tk.Label(urls_frame, text=f'{codigo}:', bg='#ffffff',
                     font=('Segoe UI', 9)).grid(row=row, column=0, sticky='w', pady=2)

            var = tk.StringVar(value=url)
            self.url_vars[f'relatorio_{codigo}'] = var
            tk.Entry(urls_frame, textvariable=var, width=60,
                     font=('Segoe UI', 8)).grid(row=row, column=1, padx=10, pady=2)
            row += 1

        # Aba XPaths
        xpaths_frame = tk.Frame(config_notebook, bg='#ffffff', padx=15, pady=15)
        config_notebook.add(xpaths_frame, text='🔍 XPATHS')

        # Criar canvas com scroll para XPaths
        canvas = tk.Canvas(xpaths_frame, bg='#ffffff')
        scrollbar = ttk.Scrollbar(xpaths_frame, orient='vertical', command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg='#ffffff')

        scrollable_frame.bind('<Configure>', lambda e: canvas.configure(scrollregion=canvas.bbox('all')))
        canvas.create_window((0, 0), window=scrollable_frame, anchor='nw')
        canvas.configure(yscrollcommand=scrollbar.set)

        self.xpath_vars = {}
        row = 0

        # Login XPaths
        tk.Label(scrollable_frame, text='LOGIN:', bg='#ffffff',
                 font=('Segoe UI', 10, 'bold')).grid(row=row, column=0, sticky='w', pady=10)
        row += 1

        for key, xpath in self.sistema_coleta.configuracoes_editaveis['xpaths']['login'].items():
            tk.Label(scrollable_frame, text=f'{key}:', bg='#ffffff',
                     font=('Segoe UI', 9)).grid(row=row, column=0, sticky='w', pady=2)

            var = tk.StringVar(value=xpath)
            self.xpath_vars[f'login_{key}'] = var
            tk.Entry(scrollable_frame, textvariable=var, width=80,
                     font=('Segoe UI', 8)).grid(row=row, column=1, padx=10, pady=2)
            row += 1

        # Relatórios XPaths
        tk.Label(scrollable_frame, text='RELATÓRIOS:', bg='#ffffff',
                 font=('Segoe UI', 10, 'bold')).grid(row=row, column=0, sticky='w', pady=10)
        row += 1

        for key, xpath in self.sistema_coleta.configuracoes_editaveis['xpaths']['relatorios'].items():
            tk.Label(scrollable_frame, text=f'{key}:', bg='#ffffff',
                     font=('Segoe UI', 9)).grid(row=row, column=0, sticky='w', pady=2)

            var = tk.StringVar(value=xpath)
            self.xpath_vars[f'relatorio_{key}'] = var
            tk.Entry(scrollable_frame, textvariable=var, width=80,
                     font=('Segoe UI', 8)).grid(row=row, column=1, padx=10, pady=2)
            row += 1

        canvas.pack(side='left', fill='both', expand=True)
        scrollbar.pack(side='right', fill='y')

        # Botões de ação
        btn_frame = tk.Frame(container, bg='#ffffff')
        btn_frame.pack(fill='x', pady=20)

        tk.Button(btn_frame,
                  text='💾 SALVAR CONFIGURAÇÕES',
                  command=self.salvar_configuracoes,
                  bg='#28a745',
                  fg='white',
                  font=('Segoe UI', 12, 'bold'),
                  padx=30,
                  pady=10,
                  cursor='hand2').pack(side='left', padx=10)

        tk.Button(btn_frame,
                  text='🔄 RESTAURAR PADRÃO',
                  command=self.restaurar_configuracoes,
                  bg='#ffc107',
                  fg='black',
                  font=('Segoe UI', 12, 'bold'),
                  padx=30,
                  pady=10,
                  cursor='hand2').pack(side='left', padx=10)

    def configurar_aba_logs(self):
        """Configura a aba de logs com filtro inteligente"""
        FP = FONT_PRIMARY
        container = tk.Frame(self.aba_logs, bg='#ffffff', padx=20, pady=20)
        container.pack(fill='both', expand=True)

        tk.Label(container, text='📋 LOGS DO SISTEMA',
                 font=(FP, 18, 'bold'), fg='#0f3460', bg='#ffffff').pack(pady=(0, 10))

        # ── Filtros ───────────────────────────────────────────────────────
        filtro_frame = tk.Frame(container, bg='#f4f7fb', padx=10, pady=8, relief='groove')
        filtro_frame.pack(fill='x', pady=(0, 8))

        tk.Label(filtro_frame, text='Filtrar:', bg='#f4f7fb', font=(FP, 10, 'bold')).pack(side='left', padx=(0, 8))

        self._log_filtro_var = tk.StringVar(value='Todos')
        for opcao, cor in [('Todos', '#0f3460'), ('❌ Erros', '#dc3545'),
                           ('⚠️ Avisos', '#e67e22'), ('✅ Sucesso', '#28a745'),
                           ('ℹ️ Info', '#17a2b8')]:
            tk.Button(filtro_frame, text=opcao,
                      command=lambda o=opcao: self._filtrar_logs(o),
                      bg=cor, fg='white', font=(FP, 9, 'bold'),
                      padx=10, pady=3, cursor='hand2', relief='flat').pack(side='left', padx=3)

        # Busca por texto
        tk.Label(filtro_frame, text='  Buscar:', bg='#f4f7fb', font=(FP, 10)).pack(side='left', padx=(12, 4))
        self._log_busca_var = tk.StringVar()
        self._log_busca_entry = tk.Entry(filtro_frame, textvariable=self._log_busca_var,
                                         width=25, font=(FP, 10))
        self._log_busca_entry.pack(side='left', padx=4)
        self._log_busca_entry.bind('<Return>', lambda e: self._filtrar_logs('Busca'))
        tk.Button(filtro_frame, text='🔍',
                  command=lambda: self._filtrar_logs('Busca'),
                  bg='#6c757d', fg='white', font=(FP, 10),
                  padx=8, pady=3, cursor='hand2', relief='flat').pack(side='left', padx=2)

        # ── Botões de ação ────────────────────────────────────────────────
        controle_frame = tk.Frame(container, bg='#ffffff')
        controle_frame.pack(fill='x', pady=(0, 8))

        tk.Button(controle_frame, text='🔄 ATUALIZAR',
                  command=self.atualizar_logs,
                  bg='#17a2b8', fg='white', font=(FP, 10),
                  padx=20, pady=5, cursor='hand2', relief='flat').pack(side='left', padx=5)

        tk.Button(controle_frame, text='🗑️ LIMPAR',
                  command=self.limpar_logs,
                  bg='#dc3545', fg='white', font=(FP, 10),
                  padx=20, pady=5, cursor='hand2', relief='flat').pack(side='left', padx=5)

        tk.Button(controle_frame, text='📁 ABRIR PASTA',
                  command=self.abrir_pasta_logs,
                  bg='#6c757d', fg='white', font=(FP, 10),
                  padx=20, pady=5, cursor='hand2', relief='flat').pack(side='left', padx=5)

        tk.Button(controle_frame, text='💾 SALVAR LOG FILTRADO',
                  command=self._salvar_log_filtrado,
                  bg='#28a745', fg='white', font=(FP, 10),
                  padx=20, pady=5, cursor='hand2', relief='flat').pack(side='left', padx=5)

        # Contador
        self._log_contador_label = tk.Label(controle_frame,
            text='', bg='#ffffff', font=(FP, 9), fg='#555')
        self._log_contador_label.pack(side='right', padx=10)

        # ── Área de logs ──────────────────────────────────────────────────
        self.logs_text = scrolledtext.ScrolledText(container, height=28,
                                                   font=('Consolas', 10),
                                                   bg='#1e1e1e', fg='#00ff00',
                                                   wrap='none')
        self.logs_text.pack(fill='both', expand=True)

        # Scrollbar horizontal
        sb_h = ttk.Scrollbar(container, orient='horizontal', command=self.logs_text.xview)
        self.logs_text.configure(xscrollcommand=sb_h.set)
        sb_h.pack(fill='x')

        # Tags de cor por tipo
        self.logs_text.tag_config('error',   foreground='#ff5555', font=('Consolas', 10, 'bold'))
        self.logs_text.tag_config('success', foreground='#55ff55')
        self.logs_text.tag_config('warning', foreground='#ffff55')
        self.logs_text.tag_config('info',    foreground='#5599ff')
        self.logs_text.tag_config('destaque',background='#333300')

        self._log_linhas_todas = []  # cache de todas as linhas
        self.atualizar_logs()

    def _filtrar_logs(self, modo):
        """Filtra o conteúdo do log por tipo ou busca de texto."""
        busca = self._log_busca_var.get().strip().lower()
        linhas = self._log_linhas_todas

        if modo == 'Todos':
            filtradas = linhas
        elif '❌' in modo or 'Erro' in modo:
            filtradas = [l for l in linhas if any(p in l for p in ('ERROR', 'ERRO', '❌', 'Erro', 'FALHOU'))]
        elif '⚠️' in modo or 'Aviso' in modo:
            filtradas = [l for l in linhas if any(p in l for p in ('WARNING', 'AVISO', '⚠️', 'atenção'))]
        elif '✅' in modo or 'Sucesso' in modo:
            filtradas = [l for l in linhas if any(p in l for p in ('✅', 'OK', 'SUCESSO', 'concluíd', 'salvo'))]
        elif 'ℹ️' in modo or 'Info' in modo:
            filtradas = [l for l in linhas if any(p in l for p in ('INFO', 'ℹ️', '📋', '📅'))]
        elif modo == 'Busca' and busca:
            filtradas = [l for l in linhas if busca in l.lower()]
        else:
            filtradas = linhas

        self.logs_text.config(state='normal')
        self.logs_text.delete(1.0, tk.END)

        for linha in filtradas:
            tag = self._tag_para_linha(linha)
            # Destacar termo buscado
            if modo == 'Busca' and busca and busca in linha.lower():
                self.logs_text.insert(tk.END, linha + '\n', ('destaque', tag))
            else:
                self.logs_text.insert(tk.END, linha + '\n', tag)

        self.logs_text.config(state='disabled')
        self.logs_text.see(tk.END)
        total = len(filtradas)
        self._log_contador_label.config(
            text=f'{total} linha(s) exibida(s) de {len(linhas)} total')

    def _tag_para_linha(self, linha):
        if any(p in linha for p in ('ERROR', 'ERRO', '❌', 'FALHOU')):
            return 'error'
        if any(p in linha for p in ('WARNING', '⚠️', 'AVISO')):
            return 'warning'
        if any(p in linha for p in ('✅', 'OK', 'SUCESSO', 'concluíd')):
            return 'success'
        return 'info'

    def _salvar_log_filtrado(self):
        """Salva o conteúdo atual do log (já filtrado) em arquivo .txt"""
        destino = filedialog.asksaveasfilename(
            title='Salvar log filtrado',
            defaultextension='.txt',
            filetypes=[('Texto', '*.txt'), ('Todos', '*.*')])
        if not destino:
            return
        try:
            conteudo = self.logs_text.get(1.0, tk.END)
            with open(destino, 'w', encoding='utf-8') as f:
                f.write(conteudo)
            messagebox.showinfo('Salvo', f'Log salvo em:\n{destino}')
        except Exception as e:
            messagebox.showerror('Erro', f'Erro ao salvar: {e}')

    # ============================================================================
    # MÉTODOS PARA DASHBOARDS (CORREÇÃO DO ERRO)
    # ============================================================================

    def gerar_dashboard_profissional(self):
        """Gera dashboard para um profissional específico"""
        try:
            profissional = self.profissional_dashboard_var.get().strip()

            if not profissional:
                messagebox.showerror("Erro", "Selecione um profissional!")
                return

            # Determinar períodos com base na seleção
            tipo_periodo = self.tipo_periodo_var.get()
            periodos_selecionados = []

            if tipo_periodo == "multiplos":
                indices = self.periodos_listbox.curselection()
                if not indices:
                    messagebox.showerror("Erro", "Selecione pelo menos um período!")
                    return

                df_periodos = self.base_dados.df_geral.get('PERIODOS', pd.DataFrame())
                for idx in indices:
                    periodo_text = self.periodos_listbox.get(idx)
                    mes_nome, ano = periodo_text.split('/')
                    meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                             'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
                    mes_num = meses.index(mes_nome.strip()) + 1
                    ano_num = int(ano)
                    periodos_selecionados.append(f"{ano_num}_{mes_num}")

            # Usar o novo gerador - PASSANDO O GERENCIADOR DE PROFISSIONAIS
            gerador = GeradorDashboardProfissionalMulti(
                self.base_dados,
                self.sistema_coleta.gerenciador_profissionais  # ← ADICIONE ESTE PARÂMETRO
            )
            filename = gerador.gerar_dashboard_completo(
                profissionais_selecionados=[profissional],
                periodos_selecionados=periodos_selecionados if periodos_selecionados else None
            )

            if filename and os.path.exists(filename):
                webbrowser.open(f'file://{os.path.abspath(filename)}')
                messagebox.showinfo("Sucesso", f"Dashboard gerado para {profissional}!")
            else:
                messagebox.showerror("Erro", "Erro ao gerar dashboard")

        except Exception as e:
            messagebox.showerror("Erro", f"Erro ao gerar dashboard: {str(e)}")
            logging.error(f"Erro no dashboard profissional: {e}")

    def gerar_dashboard_profissional_periodo(self, profissional, ano, mes):
        """Gera dashboard para um profissional em um período específico"""
        try:
            # Criar um HTML específico para o profissional
            html_content = self._criar_html_profissional_periodo(profissional, ano, mes)

            # Salvar arquivo
            if not os.path.exists(PASTA_RELATORIOS):
                os.makedirs(PASTA_RELATORIOS)

            filename = f"{PASTA_RELATORIOS}/NODRI_PROFISSIONAL_{profissional}_{ano}_{mes}.html"
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(html_content)

            return filename

        except Exception as e:
            logging.error(f"Erro ao gerar dashboard período: {e}")
            return None

    def _criar_html_profissional_periodo(self, profissional, ano, mes):
        """Cria HTML para um profissional em um período"""

        # Buscar dados do profissional neste período
        dados_periodo = self.base_dados._extrair_dados_periodo(ano, mes)
        prof_dados = dados_periodo.get('profissionais', {}).get(profissional, {})

        # Valores padrão
        faturamento = prof_dados.get('pagamentos', {}).get('valor_a_pagar', 0)
        ticket = prof_dados.get('ticket', [{}])[0].get('ticket_medio', 0) if prof_dados.get('ticket') else 0
        preferencia = prof_dados.get('preferencia', {}).get('clientes_preferencia', 0)
        sem_preferencia = prof_dados.get('preferencia', {}).get('clientes_sem_preferencia', 0)
        dias = prof_dados.get('ocupacao', {}).get('dias_trabalhados', 0)
        ocupacao = prof_dados.get('ocupacao', {}).get('taxa_ocupacao', 0)
        taxa_retorno = prof_dados.get('taxa_retorno', 0)

        # Serviços
        servicos = prof_dados.get('servicos_detalhados', {})

        # Produtos
        produtos = prof_dados.get('produtos', 0)

        # Categoria
        categoria = prof_dados.get('categoria', 'N/A')

        # Template HTML simplificado
        html = f"""<!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>NODRI - {profissional} - {MESES_PT[mes]}/{ano}</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
        <style>
            body {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; }}
            .container {{ max-width: 1200px; margin: 0 auto; }}
            .header {{ background: #0f3460; color: white; padding: 30px; border-radius: 15px; margin-bottom: 30px; }}
            .card {{ background: white; border-radius: 15px; padding: 20px; margin-bottom: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }}
            .metric {{ text-align: center; padding: 15px; background: #f8f9fa; border-radius: 10px; }}
            .metric-value {{ font-size: 2rem; font-weight: bold; color: #0f3460; }}
            .metric-label {{ color: #666; font-size: 0.9rem; }}
            table {{ width: 100%; border-collapse: collapse; }}
            th {{ background: #0f3460; color: white; padding: 10px; }}
            td {{ padding: 10px; border-bottom: 1px solid #eee; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header text-center">
                <h1>👤 {profissional}</h1>
                <h3>{MESES_PT[mes]}/{ano} - {categoria}</h3>
            </div>

            <div class="row">
                <div class="col-md-4">
                    <div class="card metric">
                        <div class="metric-value">R$ {faturamento:,.2f}</div>
                        <div class="metric-label">Faturamento</div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card metric">
                        <div class="metric-value">R$ {ticket:,.2f}</div>
                        <div class="metric-label">Ticket Médio</div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card metric">
                        <div class="metric-value">{dias}</div>
                        <div class="metric-label">Dias Trabalhados</div>
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-4">
                    <div class="card metric">
                        <div class="metric-value">{preferencia}</div>
                        <div class="metric-label">Clientes com Preferência</div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card metric">
                        <div class="metric-value">{sem_preferencia}</div>
                        <div class="metric-label">Clientes sem Preferência</div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card metric">
                        <div class="metric-value">{taxa_retorno:.1f}%</div>
                        <div class="metric-label">Taxa de Retorno</div>
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-6">
                    <div class="card">
                        <h4>📊 Serviços Realizados</h4>
                        <table>
                            <thead>
                                <tr><th>Serviço</th><th>Quantidade</th><th>Valor</th></tr>
                            </thead>
                            <tbody>
            """

        # Adicionar serviços
        for servico, info in servicos.items():
            html += f"""
                                <tr>
                                    <td>{servico}</td>
                                    <td>{info.get('quantidade', 0)}</td>
                                    <td>R$ {info.get('valor', 0):,.2f}</td>
                                </tr>
                """

        if not servicos:
            html += """
                                <tr><td colspan="3" class="text-center">Nenhum serviço registrado</td></tr>
                """

        html += f"""
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="col-md-6">
                    <div class="card">
                        <h4>📦 Produtos</h4>
                        <div class="text-center" style="padding: 50px;">
                            <h2>{produtos}</h2>
                            <p>Total de produtos vendidos</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card text-center">
                <p>Taxa de Ocupação: <strong>{ocupacao:.1f}%</strong></p>
            </div>
        </div>
    </body>
    </html>
            """

        return html

    def gerar_dashboard_profissional_multiplos(self, profissional, indices_selecionados):
        """Gera dashboard para um profissional em múltiplos períodos"""
        try:
            # Coletar dados dos períodos selecionados
            df_periodos = self.base_dados.df_geral.get('PERIODOS', pd.DataFrame())
            periodos = []

            for idx in indices_selecionados:
                periodo_text = self.periodos_listbox.get(idx)
                mes_nome, ano = periodo_text.split('/')
                # Converter mês nome para número
                meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                         'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
                mes_num = meses.index(mes_nome.strip()) + 1
                ano_num = int(ano)

                dados = self.base_dados._extrair_dados_periodo(ano_num, mes_num)
                prof_dados = dados.get('profissionais', {}).get(profissional, {})

                if prof_dados:
                    periodos.append({
                        'periodo': f"{mes_nome}/{ano}",
                        'ano': ano_num,
                        'mes': mes_num,
                        'faturamento': prof_dados.get('pagamentos', {}).get('valor_a_pagar', 0),
                        'ticket': prof_dados.get('ticket', [{}])[0].get('ticket_medio', 0) if prof_dados.get(
                            'ticket') else 0,
                        'preferencia': prof_dados.get('preferencia', {}).get('clientes_preferencia', 0),
                        'dias': prof_dados.get('ocupacao', {}).get('dias_trabalhados', 0)
                    })

            if not periodos:
                return None

            # Template para múltiplos períodos
            html = self._criar_html_profissional_multiplos(profissional, periodos)

            filename = f"{PASTA_RELATORIOS}/NODRI_PROFISSIONAL_{profissional}_MULTIPLOS.html"
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(html)

            return filename

        except Exception as e:
            logging.error(f"Erro ao gerar dashboard múltiplos: {e}")
            return None

    def _criar_html_profissional_multiplos(self, profissional, periodos):
        """Cria HTML para múltiplos períodos de um profissional"""

        # Calcular totais
        total_faturamento = sum(p['faturamento'] for p in periodos)
        media_ticket = sum(p['ticket'] for p in periodos) / len(periodos)
        total_preferencia = sum(p['preferencia'] for p in periodos)
        total_dias = sum(p['dias'] for p in periodos)

        html = f"""<!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>NODRI - {profissional} - Múltiplos Períodos</title>
        <link href="https://cdn.jsdelivr.net/npm/chart.js" rel="stylesheet">
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
            body {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; }}
            .container {{ max-width: 1200px; margin: 0 auto; }}
            .header {{ background: #0f3460; color: white; padding: 30px; border-radius: 15px; margin-bottom: 30px; }}
            .card {{ background: white; border-radius: 15px; padding: 20px; margin-bottom: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }}
            .metric {{ text-align: center; padding: 20px; background: linear-gradient(135deg, #0f3460 0%, #1a1a2e 100%); color: white; border-radius: 10px; }}
            table {{ width: 100%; border-collapse: collapse; }}
            th {{ background: #0f3460; color: white; padding: 10px; }}
            td {{ padding: 10px; border-bottom: 1px solid #eee; }}
            .chart-container {{ height: 400px; margin-bottom: 30px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header text-center">
                <h1>👤 {profissional}</h1>
                <h3>Análise de Múltiplos Períodos</h3>
            </div>

            <div class="row">
                <div class="col-md-3">
                    <div class="metric">
                        <h2>R$ {total_faturamento:,.2f}</h2>
                        <p>Faturamento Total</p>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="metric">
                        <h2>R$ {media_ticket:,.2f}</h2>
                        <p>Ticket Médio</p>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="metric">
                        <h2>{total_preferencia}</h2>
                        <p>Total Preferência</p>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="metric">
                        <h2>{total_dias}</h2>
                        <p>Dias Trabalhados</p>
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-12">
                    <div class="card">
                        <h4>📊 Evolução do Faturamento</h4>
                        <div class="chart-container">
                            <canvas id="graficoFaturamento"></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <h4>📋 Detalhamento por Período</h4>
                <table>
                    <thead>
                        <tr>
                            <th>Período</th>
                            <th>Faturamento</th>
                            <th>Ticket Médio</th>
                            <th>Preferência</th>
                            <th>Dias</th>
                            <th>Crescimento</th>
                        </tr>
                    </thead>
                    <tbody>
            """

        # Adicionar períodos
        for i, p in enumerate(periodos):
            crescimento = 0
            if i > 0 and periodos[i - 1]['faturamento'] > 0:
                crescimento = ((p['faturamento'] - periodos[i - 1]['faturamento']) / periodos[i - 1][
                    'faturamento']) * 100

            cor_classe = "success" if crescimento > 0 else "danger" if crescimento < 0 else "warning"

            html += f"""
                        <tr>
                            <td><strong>{p['periodo']}</strong></td>
                            <td>R$ {p['faturamento']:,.2f}</td>
                            <td>R$ {p['ticket']:,.2f}</td>
                            <td>{p['preferencia']}</td>
                            <td>{p['dias']}</td>
                            <td><span class="badge bg-{cor_classe}">{crescimento:+.1f}%</span></td>
                        </tr>
                """

        html += """
                    </tbody>
                </table>
            </div>
        </div>

        <script>
            const periodos = ["""

        # Adicionar dados para gráfico
        for p in periodos:
            html += f"'{p['periodo']}',"

        html += """];
            const valores = ["""

        for p in periodos:
            html += f"{p['faturamento']},"

        html += """];

            new Chart(document.getElementById('graficoFaturamento'), {
                type: 'line',
                data: {
                    labels: periodos,
                    datasets: [{
                        label: 'Faturamento',
                        data: valores,
                        borderColor: '#0f3460',
                        tension: 0.1,
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { callback: v => 'R$ ' + v.toFixed(2) }
                        }
                    }
                }
            });
        </script>
    </body>
    </html>
            """

        return html

    def gerar_dashboard_todos_profissionais(self):
        """Desativado nesta versão."""
        messagebox.showinfo("Info", "Relatórios não disponíveis nesta versão.")

    def _gerar_dashboard_todos_profissionais_legado(self):
        """(legado desativado)"""
        try:
            filename = None

            if filename and os.path.exists(filename):
                webbrowser.open(f'file://{os.path.abspath(filename)}')
                messagebox.showinfo("Sucesso",
                                    "Dashboard de todos os profissionais gerado!\n\n"
                                    "Use a busca por nome na seção de profissionais.")
            else:
                messagebox.showerror("Erro", "Erro ao gerar dashboard")

        except Exception as e:
            messagebox.showerror("Erro", f"Erro ao gerar dashboard: {str(e)}")
            logging.error(f"Erro no dashboard todos profissionais: {e}")

    # ============================================================================
    # NOVOS MÉTODOS PARA COLETA DE FEEDBACK PROFISSIONAL
    # ============================================================================

    def configurar_aba_feedback(self):
        """Configura a aba de importação de feedback profissional com SCROLLBAR"""

        # ===== CRIAR CANVAS COM SCROLLBAR =====
        canvas = tk.Canvas(self.aba_feedback, bg='#ffffff')
        scrollbar = ttk.Scrollbar(self.aba_feedback, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg='#ffffff')

        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )

        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)

        # Container principal dentro do frame rolável
        container = tk.Frame(scrollable_frame, bg='#ffffff', padx=20, pady=20)
        container.pack(fill='both', expand=True)

        # TÍTULO
        tk.Label(container, text='📋 FEEDBACK PROFISSIONAL',
                 font=('Segoe UI', 18, 'bold'),
                 fg='#0f3460', bg='#ffffff').pack(pady=(0, 20))

        # ===== FRAME PARA EDITAR URL =====
        url_frame = tk.LabelFrame(container, text='🔗 URL DA PLANILHA DE FEEDBACK',
                                  font=('Segoe UI', 12, 'bold'),
                                  bg='#ffffff', fg='#0f3460',
                                  padx=15, pady=15)
        url_frame.pack(fill='x', pady=(0, 20))

        tk.Label(url_frame, text='URL:', bg='#ffffff',
                 font=('Segoe UI', 10)).grid(row=0, column=0, sticky='w', pady=5)

        self.feedback_url_var = tk.StringVar(value=self.coletor_feedback.url)
        url_entry = tk.Entry(url_frame, textvariable=self.feedback_url_var,
                             width=80, font=('Segoe UI', 9))
        url_entry.grid(row=0, column=1, padx=10, pady=5, sticky='ew')

        tk.Button(url_frame, text='💾 SALVAR URL',
                  command=self.alterar_url_feedback,
                  bg='#ffc107', fg='black',
                  font=('Segoe UI', 10, 'bold'),
                  padx=15, pady=5, cursor='hand2').grid(row=0, column=2, padx=10, pady=5)

        url_frame.columnconfigure(1, weight=1)

        # ===== FRAME DE STATUS =====
        status_frame = tk.LabelFrame(container, text='📊 STATUS DA IMPORTAÇÃO',
                                     font=('Segoe UI', 12, 'bold'),
                                     bg='#ffffff', fg='#0f3460',
                                     padx=15, pady=15)
        status_frame.pack(fill='x', pady=(0, 20))

        self.status_feedback_label = tk.Label(status_frame,
                                              text="⏳ Aguardando comando...",
                                              bg='#ffffff',
                                              font=('Segoe UI', 11),
                                              fg='#666')
        self.status_feedback_label.pack(anchor='w', pady=5)

        self.detalhes_feedback_label = tk.Label(status_frame,
                                                text="",
                                                bg='#ffffff',
                                                font=('Segoe UI', 10),
                                                fg='#28a745',
                                                justify='left')
        self.detalhes_feedback_label.pack(anchor='w', pady=5)

        # Barra de progresso
        self.progresso_feedback = ttk.Progressbar(status_frame,
                                                  length=600,
                                                  mode='indeterminate')
        self.progresso_feedback.pack(pady=10)

        # ===== INFORMAÇÕES DA PLANILHA =====
        info_frame = tk.LabelFrame(container, text='ℹ️ SOBRE A PLANILHA DE FEEDBACK',
                                   font=('Segoe UI', 12, 'bold'),
                                   bg='#ffffff', fg='#0f3460',
                                   padx=15, pady=15)
        info_frame.pack(fill='x', pady=(0, 20))

        info_text = """Esta planilha deve conter as colunas:
        • Carimbo de data/hora
        • PROFISSIONAL
        • POSITIVO OU NEGATIVO ?
        • O QUE HOUVE ?
        • DESCREVA O OCORRIDO!!

        Os dados serão salvos na aba FEEDBACK da base de dados."""

        tk.Label(info_frame, text=info_text,
                 bg='#ffffff', font=('Segoe UI', 10),
                 justify='left').pack(anchor='w', pady=10)

        # ===== ESTATÍSTICAS ATUAIS =====
        stats_frame = tk.LabelFrame(container, text='📊 ESTATÍSTICAS ATUAIS',
                                    font=('Segoe UI', 12, 'bold'),
                                    bg='#ffffff', fg='#0f3460',
                                    padx=15, pady=15)
        stats_frame.pack(fill='x', pady=(0, 20))

        df_feedback = self.base_dados.df_geral.get('FEEDBACK', pd.DataFrame())
        total_feedbacks = len(df_feedback) if not df_feedback.empty else 0

        if not df_feedback.empty:
            profissionais = df_feedback['profissional'].nunique()
            positivos = len(df_feedback[df_feedback['tipo'].str.contains('POSITIVO', na=False, case=False)])
            negativos = len(df_feedback[df_feedback['tipo'].str.contains('NEGATIVO', na=False, case=False)])
        else:
            profissionais = 0
            positivos = 0
            negativos = 0

        # Grid de estatísticas
        stats_grid = tk.Frame(stats_frame, bg='#ffffff')
        stats_grid.pack()

        tk.Label(stats_grid, text='📋 Total:', bg='#ffffff',
                 font=('Segoe UI', 10, 'bold')).grid(row=0, column=0, sticky='w', padx=10, pady=2)
        self.total_feedback_label = tk.Label(stats_grid, text=str(total_feedbacks), bg='#ffffff',
                                             font=('Segoe UI', 10))
        self.total_feedback_label.grid(row=0, column=1, sticky='w', padx=10, pady=2)

        tk.Label(stats_grid, text='👥 Profissionais:', bg='#ffffff',
                 font=('Segoe UI', 10, 'bold')).grid(row=0, column=2, sticky='w', padx=10, pady=2)
        self.profissionais_feedback_label = tk.Label(stats_grid, text=str(profissionais), bg='#ffffff',
                                                     font=('Segoe UI', 10))
        self.profissionais_feedback_label.grid(row=0, column=3, sticky='w', padx=10, pady=2)

        tk.Label(stats_grid, text='✅ Positivos:', bg='#ffffff',
                 font=('Segoe UI', 10, 'bold')).grid(row=1, column=0, sticky='w', padx=10, pady=2)
        self.positivos_feedback_label = tk.Label(stats_grid, text=str(positivos), bg='#ffffff',
                                                 font=('Segoe UI', 10), fg='#28a745')
        self.positivos_feedback_label.grid(row=1, column=1, sticky='w', padx=10, pady=2)

        tk.Label(stats_grid, text='❌ Negativos:', bg='#ffffff',
                 font=('Segoe UI', 10, 'bold')).grid(row=1, column=2, sticky='w', padx=10, pady=2)
        self.negativos_feedback_label = tk.Label(stats_grid, text=str(negativos), bg='#ffffff',
                                                 font=('Segoe UI', 10), fg='#dc3545')
        self.negativos_feedback_label.grid(row=1, column=3, sticky='w', padx=10, pady=2)

        # ===== BOTÕES DE AÇÃO =====
        btn_frame = tk.Frame(container, bg='#ffffff')
        btn_frame.pack(pady=20)

        # Botão principal de importação
        self.btn_importar_feedback = tk.Button(btn_frame,
                                               text='📥 IMPORTAR FEEDBACK (SOBRESCREVER)',
                                               command=self.importar_feedback_sobrescrever,
                                               bg='#dc3545',
                                               fg='white',
                                               font=('Segoe UI', 14, 'bold'),
                                               padx=30,
                                               pady=15,
                                               relief='flat',
                                               cursor='hand2',
                                               width=40)
        self.btn_importar_feedback.pack(pady=5)

        tk.Label(btn_frame,
                 text='⚠️ Esta opção APAGA todos os dados anteriores da aba FEEDBACK',
                 bg='#ffffff', fg='#dc3545',
                 font=('Segoe UI', 9)).pack()

        # Botão de teste
        tk.Button(btn_frame,
                  text='🧪 TESTAR CONEXÃO',
                  command=self.testar_conexao_feedback,
                  bg='#6c757d',
                  fg='white',
                  font=('Segoe UI', 12),
                  padx=20,
                  pady=10,
                  cursor='hand2',
                  width=20).pack(pady=10)

        # ===== LOG DA IMPORTAÇÃO =====
        log_frame = tk.LabelFrame(container, text='📋 LOG DA IMPORTAÇÃO',
                                  font=('Segoe UI', 12, 'bold'),
                                  bg='#ffffff', fg='#0f3460',
                                  padx=15, pady=15)
        log_frame.pack(fill='both', expand=True, pady=(0, 20))

        self.feedback_log = scrolledtext.ScrolledText(log_frame, height=12,
                                                      font=('Consolas', 10),
                                                      bg='#1e1e1e',
                                                      fg='#00ff00',
                                                      wrap=tk.WORD)
        self.feedback_log.pack(fill='both', expand=True)

        # Configurar tags de cores para o log
        self.feedback_log.tag_config('error', foreground='#ff5555')
        self.feedback_log.tag_config('success', foreground='#55ff55')
        self.feedback_log.tag_config('info', foreground='#ffffff')
        self.feedback_log.tag_config('warning', foreground='#ffff55')

        # ===== EMPACOTAR CANVAS E SCROLLBAR =====
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

    def alterar_url_feedback(self):
        """Altera a URL da planilha de feedback"""
        nova_url = self.feedback_url_var.get().strip()
        if not nova_url:
            messagebox.showerror("Erro", "Digite uma URL válida!")
            return

        # Validar se é uma URL do Google Sheets (opcional)
        if 'docs.google.com/spreadsheets' not in nova_url:
            if not messagebox.askyesno("Confirmar",
                                       "Esta não parece ser uma URL do Google Sheets.\n"
                                       "Deseja continuar mesmo assim?"):
                return

        self.coletor_feedback.set_url(nova_url)
        messagebox.showinfo("Sucesso", "✅ URL alterada com sucesso!\n\n"
                                       f"Nova URL: {nova_url}")

        # Log da alteração
        self.log_feedback(f"🔗 URL alterada para: {nova_url}")

    def importar_feedback_sobrescrever(self):
        """Importa feedback sobrescrevendo os dados anteriores"""

        # Verificar se já foi importado automaticamente
        if self.importacao_automatica_concluida:
            if not messagebox.askyesno("Confirmar",
                                       "A importação automática já foi realizada.\n"
                                       "Deseja importar novamente (sobrescrever)?"):
                return
        else:
            if not messagebox.askyesno("Confirmar",
                                       "⚠️ ATENÇÃO! ⚠️\n\n"
                                       "Isso irá APAGAR TODOS os dados anteriores da aba FEEDBACK\n"
                                       "e importar os novos dados da planilha.\n\n"
                                       "Tem certeza que deseja continuar?"):
                return

        # Desabilitar botão durante importação
        self.btn_importar_feedback.config(state='disabled', text='⏳ IMPORTANDO...')
        self.status_feedback_label.config(text="🔄 Iniciando importação...", fg='#17a2b8')
        self.progresso_feedback.start()

        # Limpar log
        self.feedback_log.delete(1.0, tk.END)
        self.log_feedback("🚀 INICIANDO IMPORTAÇÃO DE FEEDBACK")
        self.log_feedback(f"📤 URL: {self.coletor_feedback.url}")

        # Iniciar thread
        thread = threading.Thread(target=self.executar_importacao_feedback)
        thread.daemon = True
        thread.start()
        self.threads_ativas.append(thread)

    def executar_importacao_feedback(self):
        """Executa importação de feedback em thread - COM FEEDBACK DETALHADO"""
        try:
            self.log_feedback("📥 Baixando planilha do Google Sheets...")

            # Atualizar status
            self.root.after(0, lambda: self.status_feedback_label.config(
                text="📥 Baixando planilha...", fg='#17a2b8'))

            # Executar importação
            sucesso, qtd = self.coletor_feedback.coletar_e_salvar(sobrescrever=True)

            if sucesso:
                if qtd > 0:
                    self.log_feedback(f"✅ SUCESSO! {qtd} feedbacks importados!")

                    # Atualizar estatísticas na interface
                    self.root.after(0, self._atualizar_estatisticas_feedback)

                    # Mostrar exemplo do que foi importado
                    df = self.base_dados.df_geral.get('FEEDBACK', pd.DataFrame())
                    if not df.empty:
                        self.log_feedback("\n📋 EXEMPLO DO PRIMEIRO FEEDBACK IMPORTADO:")
                        primeira_linha = df.iloc[0]
                        self.log_feedback(f"   Profissional: {primeira_linha['profissional']}")
                        self.log_feedback(f"   Tipo: {primeira_linha['tipo']}")
                        self.log_feedback(f"   Comentário: {primeira_linha['comentario'][:100]}...")

                    self.root.after(0, lambda: self.status_feedback_label.config(
                        text=f"✅ Importação concluída! {qtd} feedbacks importados.",
                        fg='#28a745'))

                    self.root.after(0, lambda: messagebox.showinfo(
                        "Sucesso",
                        f"✅ {qtd} feedbacks importados com sucesso!\n\n"
                        f"📊 Verifique o log para detalhes."
                    ))
                else:
                    self.log_feedback("⚠️ Nenhum feedback encontrado na planilha!")
                    self.root.after(0, lambda: self.status_feedback_label.config(
                        text="⚠️ Nenhum feedback encontrado", fg='#ffc107'))

            else:
                self.log_feedback("❌ ERRO na importação! Verifique o log acima.")
                self.root.after(0, lambda: self.status_feedback_label.config(
                    text="❌ Erro na importação", fg='#dc3545'))

        except Exception as e:
            self.log_feedback(f"❌ Erro: {str(e)}")
            import traceback
            self.log_feedback(traceback.format_exc())
            self.root.after(0, lambda: self.status_feedback_label.config(
                text=f"❌ Erro: {str(e)[:50]}...", fg='#dc3545'))

        finally:
            # Reabilitar botão
            self.root.after(0, lambda: self.btn_importar_feedback.config(
                state='normal', text='📥 IMPORTAR FEEDBACK AGORA'))
            self.root.after(0, lambda: self.progresso_feedback.stop())

    def _atualizar_estatisticas_feedback(self):
        """Atualiza as estatísticas na interface"""
        df_feedback = self.base_dados.df_geral.get('FEEDBACK', pd.DataFrame())

        if not df_feedback.empty:
            total = len(df_feedback)
            profissionais = df_feedback['profissional'].nunique()
            positivos = len(df_feedback[df_feedback['tipo'].str.contains('POSITIVO', na=False, case=False)])
            negativos = len(df_feedback[df_feedback['tipo'].str.contains('NEGATIVO', na=False, case=False)])

            self.total_feedback_label.config(text=str(total))
            self.profissionais_feedback_label.config(text=str(profissionais))
            self.positivos_feedback_label.config(text=str(positivos))
            self.negativos_feedback_label.config(text=str(negativos))

            self.log_feedback(f"\n📊 ESTATÍSTICAS ATUAIS:")
            self.log_feedback(f"   Total: {total}")
            self.log_feedback(f"   Profissionais: {profissionais}")
            self.log_feedback(f"   Positivos: {positivos}")
            self.log_feedback(f"   Negativos: {negativos}")
        else:
            self.total_feedback_label.config(text="0")
            self.profissionais_feedback_label.config(text="0")
            self.positivos_feedback_label.config(text="0")
            self.negativos_feedback_label.config(text="0")

    def testar_conexao_feedback(self):
        """Testa a conexão com a planilha sem importar"""
        self.log_feedback("🧪 TESTANDO CONEXÃO COM A PLANILHA...")

        try:
            import requests
            response = requests.get(self.coletor_feedback.url)

            self.log_feedback(f"📊 Status Code: {response.status_code}")
            self.log_feedback(f"📦 Tamanho: {len(response.content)} bytes")

            if response.status_code == 200:
                self.log_feedback("✅ CONEXÃO OK! A planilha está acessível.")

                # Mostrar primeiros 200 caracteres do conteúdo
                content_preview = response.content[:200]
                self.log_feedback(f"\n🔍 Preview do conteúdo:")
                self.log_feedback(str(content_preview))
            else:
                self.log_feedback(f"❌ Erro {response.status_code}: {response.reason}")

        except Exception as e:
            self.log_feedback(f"❌ Erro na conexão: {str(e)}")

    def log_feedback(self, mensagem):
        """Adiciona mensagem ao log de feedback"""
        timestamp = datetime.now().strftime("%H:%M:%S")

        # Determinar a tag baseada no conteúdo
        if '✅' in mensagem or 'sucesso' in mensagem.lower():
            tag = 'success'
        elif '❌' in mensagem or 'erro' in mensagem.lower():
            tag = 'error'
        else:
            tag = 'info'

        self.root.after(0, lambda: self.feedback_log.insert(tk.END, f"[{timestamp}] {mensagem}\n", tag))
        self.root.after(0, lambda: self.feedback_log.see(tk.END))
        print(f"[{timestamp}] {mensagem}")

    # =========================================================================
    # HISTÓRICO DE COLETAS (persistência em JSON)
    # =========================================================================
    _ARQUIVO_HISTORICO_COLETAS = os.path.join(
        os.path.expanduser("~"), "AppData", "Roaming", "NODRI", "historico_coletas.json"
    )

    def _carregar_historico_coletas(self):
        try:
            if os.path.exists(self._ARQUIVO_HISTORICO_COLETAS):
                with open(self._ARQUIVO_HISTORICO_COLETAS, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception:
            pass
        return []

    def _salvar_historico_coletas(self):
        try:
            os.makedirs(os.path.dirname(self._ARQUIVO_HISTORICO_COLETAS), exist_ok=True)
            with open(self._ARQUIVO_HISTORICO_COLETAS, 'w', encoding='utf-8') as f:
                json.dump(self._historico_coletas[-500:], f, ensure_ascii=False, indent=2)
        except Exception as e:
            logging.warning(f"Não foi possível salvar histórico: {e}")

    def registrar_coleta_no_historico(self, tipo, periodos, resultados):
        """Registra uma coleta finalizada no histórico persistente."""
        entrada = {
            'data': datetime.now().strftime('%d/%m/%Y %H:%M'),
            'tipo': tipo,
            'periodos': periodos,
            'ok': sum(1 for r in resultados if r.get('status') == 'OK'),
            'falhou': sum(1 for r in resultados if r.get('status') == 'FALHOU'),
            'resultados': resultados,
        }
        self._historico_coletas.append(entrada)
        self._salvar_historico_coletas()
        # Atualiza a aba de histórico se já foi criada
        if hasattr(self, '_hist_coletas_tree'):
            self.root.after(0, self._atualizar_tabela_historico)

    # =========================================================================
    # ABA: AGENDAMENTO AUTOMÁTICO
    # =========================================================================
    def configurar_aba_agendamento(self):
        FP = FONT_PRIMARY
        container = tk.Frame(self.aba_agendamento, bg='#ffffff', padx=30, pady=20)
        container.pack(fill='both', expand=True)

        tk.Label(container, text='⏰ AGENDAMENTO AUTOMÁTICO',
                 font=(FP, 18, 'bold'), fg='#0f3460', bg='#ffffff').pack(pady=(0, 20))

        # ── Configurações do agendamento ──────────────────────────────────
        cfg_frame = tk.LabelFrame(container, text='🗓️ CONFIGURAR AGENDA',
                                  font=(FP, 12, 'bold'), bg='#ffffff', fg='#0f3460',
                                  padx=15, pady=15)
        cfg_frame.pack(fill='x', pady=(0, 20))

        # Tipo de periodicidade
        tk.Label(cfg_frame, text='Periodicidade:', bg='#ffffff', font=(FP, 10)).grid(
            row=0, column=0, sticky='w', pady=5)
        self._agenda_periodo_var = tk.StringVar(value='Diário')
        ttk.Combobox(cfg_frame, textvariable=self._agenda_periodo_var,
                     values=['Diário', 'Semanal', 'Mensal'],
                     state='readonly', width=14, font=(FP, 10)).grid(row=0, column=1, padx=10)

        # Hora
        tk.Label(cfg_frame, text='Horário (HH:MM):', bg='#ffffff', font=(FP, 10)).grid(
            row=0, column=2, sticky='w', pady=5, padx=(20, 0))
        self._agenda_hora_var = tk.StringVar(value='06:00')
        tk.Entry(cfg_frame, textvariable=self._agenda_hora_var, width=8,
                 font=(FP, 10)).grid(row=0, column=3, padx=10)

        # Dia da semana (para semanal)
        tk.Label(cfg_frame, text='Dia da semana:', bg='#ffffff', font=(FP, 10)).grid(
            row=1, column=0, sticky='w', pady=5)
        self._agenda_dia_semana_var = tk.StringVar(value='Segunda')
        ttk.Combobox(cfg_frame, textvariable=self._agenda_dia_semana_var,
                     values=['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'],
                     state='readonly', width=14, font=(FP, 10)).grid(row=1, column=1, padx=10)

        # Tipo de coleta
        tk.Label(cfg_frame, text='Tipo de coleta:', bg='#ffffff', font=(FP, 10)).grid(
            row=1, column=2, sticky='w', pady=5, padx=(20, 0))
        self._agenda_tipo_var = tk.StringVar(value='Mês atual')
        ttk.Combobox(cfg_frame, textvariable=self._agenda_tipo_var,
                     values=['Mês atual', 'Últimos 3 meses', 'Histórico completo'],
                     state='readonly', width=20, font=(FP, 10)).grid(row=1, column=3, padx=10)

        # ── Notificações ──────────────────────────────────────────────────
        notif_frame = tk.LabelFrame(container, text='🔔 NOTIFICAÇÕES',
                                    font=(FP, 12, 'bold'), bg='#ffffff', fg='#0f3460',
                                    padx=15, pady=15)
        notif_frame.pack(fill='x', pady=(0, 20))

        self._notif_popup_var = tk.BooleanVar(value=True)
        self._notif_som_var   = tk.BooleanVar(value=True)
        self._notif_log_var   = tk.BooleanVar(value=True)

        ttk.Checkbutton(notif_frame, text='Popup ao finalizar coleta',
                        variable=self._notif_popup_var).grid(row=0, column=0, sticky='w', padx=10)
        ttk.Checkbutton(notif_frame, text='Som ao finalizar',
                        variable=self._notif_som_var).grid(row=0, column=1, sticky='w', padx=10)
        ttk.Checkbutton(notif_frame, text='Gravar no log',
                        variable=self._notif_log_var).grid(row=0, column=2, sticky='w', padx=10)

        # ── Recoleta automática após falhas ───────────────────────────────
        retry_frame = tk.LabelFrame(container, text='🔁 RECOLETA AUTOMÁTICA DE FALHAS',
                                    font=(FP, 12, 'bold'), bg='#ffffff', fg='#0f3460',
                                    padx=15, pady=15)
        retry_frame.pack(fill='x', pady=(0, 20))

        self._auto_retry_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(retry_frame, text='Tentar automaticamente os que falharam após cada coleta',
                        variable=self._auto_retry_var).grid(row=0, column=0, sticky='w')

        tk.Label(retry_frame, text='Número de tentativas:', bg='#ffffff', font=(FP, 10)).grid(
            row=1, column=0, sticky='w', pady=5)
        self._max_retries_var = tk.StringVar(value='2')
        tk.Spinbox(retry_frame, from_=1, to=5, textvariable=self._max_retries_var,
                   width=5, font=(FP, 10)).grid(row=1, column=1, sticky='w', padx=10)

        # ── Turbo mode ────────────────────────────────────────────────────
        turbo_frame = tk.LabelFrame(container, text='⚡ MODO TURBO (COLETA PARALELA)',
                                    font=(FP, 12, 'bold'), bg='#ffffff', fg='#0f3460',
                                    padx=15, pady=15)
        turbo_frame.pack(fill='x', pady=(0, 20))

        self._modo_turbo_var = tk.BooleanVar(value=False)
        cb_turbo = ttk.Checkbutton(turbo_frame,
                        text='Ativar modo turbo — coleta vários relatórios em paralelo',
                        variable=self._modo_turbo_var,
                        state='disabled')
        cb_turbo.grid(row=0, column=0, sticky='w')

        tk.Label(turbo_frame,
                 text='🔒  Desativado — o site do salão é instável para múltiplas sessões simultâneas.\n'
                      '    Funcionalidade reservada para versão futura quando o sistema estiver estável.',
                 bg='#fff3cd', fg='#856404', font=(FP, 9),
                 justify='left', padx=8, pady=6, relief='groove').grid(
                 row=1, column=0, sticky='w', pady=6, padx=4)

        # ── Botões de controle ────────────────────────────────────────────
        btn_frame = tk.Frame(container, bg='#ffffff')
        btn_frame.pack(fill='x', pady=20)

        self._btn_agenda_iniciar = tk.Button(btn_frame, text='▶ ATIVAR AGENDAMENTO',
                    command=self.ativar_agendamento,
                    bg='#28a745', fg='white', font=(FP, 12, 'bold'),
                    padx=25, pady=10, cursor='hand2', relief='flat',
                    activebackground='#1e7e34')
        self._btn_agenda_iniciar.pack(side='left', padx=8)

        self._btn_agenda_parar = tk.Button(btn_frame, text='⏹ PARAR AGENDAMENTO',
                    command=self.parar_agendamento,
                    bg='#dc3545', fg='white', font=(FP, 12, 'bold'),
                    padx=25, pady=10, cursor='hand2', relief='flat',
                    activebackground='#c82333', state='disabled')
        self._btn_agenda_parar.pack(side='left', padx=8)

        tk.Button(btn_frame, text='🔔 TESTAR NOTIFICAÇÃO',
                  command=lambda: self.notificar_fim_coleta(0, 0, forcar=True),
                  bg='#6c757d', fg='white', font=(FP, 11),
                  padx=18, pady=10, cursor='hand2', relief='flat').pack(side='left', padx=8)

        tk.Button(btn_frame, text='🔄 VERIFICAR ATUALIZAÇÃO',
                  command=self.verificar_atualizacao,
                  bg='#17a2b8', fg='white', font=(FP, 11),
                  padx=18, pady=10, cursor='hand2', relief='flat').pack(side='left', padx=8)

        # ── Status do agendamento ─────────────────────────────────────────
        self._agenda_status_label = tk.Label(container,
            text='⏸  Agendamento desativado.',
            font=(FP, 11), fg='#6c757d', bg='#ffffff')
        self._agenda_status_label.pack(pady=10)

        # ── Multi-salão ───────────────────────────────────────────────────
        multi_frame = tk.LabelFrame(container, text='🏢 MULTI-SALÃO',
                                    font=(FP, 12, 'bold'), bg='#ffffff', fg='#0f3460',
                                    padx=15, pady=15)
        multi_frame.pack(fill='both', expand=True, pady=(0, 10))

        self._multi_salao_tree = ttk.Treeview(multi_frame,
            columns=('nome', 'url', 'email', 'ativo'), show='headings', height=5)
        self._multi_salao_tree.heading('nome',  text='Nome do Salão')
        self._multi_salao_tree.heading('url',   text='URL Login')
        self._multi_salao_tree.heading('email', text='E-mail')
        self._multi_salao_tree.heading('ativo', text='Ativo')
        self._multi_salao_tree.column('nome',  width=180)
        self._multi_salao_tree.column('url',   width=320)
        self._multi_salao_tree.column('email', width=200)
        self._multi_salao_tree.column('ativo', width=70, anchor='center')
        self._multi_salao_tree.pack(fill='both', expand=True, pady=(0, 8))

        multi_btn = tk.Frame(multi_frame, bg='#ffffff')
        multi_btn.pack(fill='x')

        tk.Button(multi_btn, text='➕ Adicionar salão',
                  command=self._adicionar_salao_multi,
                  bg='#0f3460', fg='white', font=(FP, 10),
                  padx=14, pady=5, cursor='hand2', relief='flat').pack(side='left', padx=4)
        tk.Button(multi_btn, text='🗑 Remover selecionado',
                  command=self._remover_salao_multi,
                  bg='#dc3545', fg='white', font=(FP, 10),
                  padx=14, pady=5, cursor='hand2', relief='flat').pack(side='left', padx=4)

        self._carregar_multi_salao_tree()

    # ── Agendamento: lógica ───────────────────────────────────────────────────
    def ativar_agendamento(self):
        hora_str = self._agenda_hora_var.get().strip()
        try:
            h, m = hora_str.split(':')
            int(h); int(m)
        except Exception:
            messagebox.showerror('Erro', 'Horário inválido. Use o formato HH:MM (ex: 06:00)')
            return

        self._agendamento_ativo = True
        self._btn_agenda_iniciar.config(state='disabled')
        self._btn_agenda_parar.config(state='normal')
        self._agenda_status_label.config(
            text=f'✅  Agendamento ativo — {self._agenda_periodo_var.get()} às {hora_str}',
            fg='#28a745')

        self._agendamento_thread = threading.Thread(
            target=self._loop_agendamento, daemon=True)
        self._agendamento_thread.start()
        logging.info(f'⏰ Agendamento ativado: {self._agenda_periodo_var.get()} às {hora_str}')

    def parar_agendamento(self):
        self._agendamento_ativo = False
        self._btn_agenda_iniciar.config(state='normal')
        self._btn_agenda_parar.config(state='disabled')
        self._agenda_status_label.config(
            text='⏸  Agendamento desativado.', fg='#6c757d')
        logging.info('⏹ Agendamento desativado.')

    def _loop_agendamento(self):
        """Thread que verifica a cada minuto se está na hora de coletar."""
        ultimo_dia_executado = None
        while self._agendamento_ativo:
            try:
                agora = datetime.now()
                hora_alvo = self._agenda_hora_var.get().strip()
                h_alvo, m_alvo = int(hora_alvo.split(':')[0]), int(hora_alvo.split(':')[1])
                periodo = self._agenda_periodo_var.get()
                dia_semana_map = {
                    'Segunda': 0, 'Terça': 1, 'Quarta': 2, 'Quinta': 3,
                    'Sexta': 4, 'Sábado': 5, 'Domingo': 6
                }

                hora_ok = agora.hour == h_alvo and agora.minute == m_alvo
                dia_ok  = True

                if periodo == 'Semanal':
                    alvo = dia_semana_map.get(self._agenda_dia_semana_var.get(), 0)
                    dia_ok = (agora.weekday() == alvo)
                elif periodo == 'Mensal':
                    dia_ok = (agora.day == 1)

                chave = agora.strftime('%Y-%m-%d %H:%M')
                if hora_ok and dia_ok and chave != ultimo_dia_executado:
                    ultimo_dia_executado = chave
                    logging.info(f'⏰ Disparando coleta agendada: {chave}')
                    self.root.after(0, self._executar_coleta_agendada)

                self._agenda_status_label.config(
                    text=f'✅  Agendamento ativo | próximo: {h_alvo:02d}:{m_alvo:02d} | agora: {agora.strftime("%H:%M")}',
                    fg='#28a745')

            except Exception as e:
                logging.warning(f'Erro no loop de agendamento: {e}')

            time.sleep(30)

    def _executar_coleta_agendada(self):
        """Inicia a coleta no contexto do UI thread (via root.after)."""
        tipo = self._agenda_tipo_var.get()
        email = self.sistema_coleta.config.get('email', '')
        senha = self.sistema_coleta.config.get('senha', '')

        if not email or not senha:
            logging.warning('Agendamento: email/senha não configurados.')
            return

        if tipo == 'Mês atual':
            agora = datetime.now()
            d_ini = agora.replace(day=1)
            d_fim = agora
            thread = threading.Thread(
                target=self.executar_coleta_historica,
                args=(email, senha, None, None),
                daemon=True)
            thread.start()
            self.threads_ativas.append(thread)
        else:
            # Para outros tipos, chama a coleta histórica normal
            if hasattr(self, 'email_historico'):
                self.email_historico.delete(0, tk.END)
                self.email_historico.insert(0, email)
                self.senha_historico.delete(0, tk.END)
                self.senha_historico.insert(0, senha)
            if hasattr(self, 'iniciar_coleta_historica'):
                self.iniciar_coleta_historica()

    # ── Multi-salão ───────────────────────────────────────────────────────────
    _ARQUIVO_MULTI_SALAO = os.path.join(
        os.path.expanduser("~"), "AppData", "Roaming", "NODRI", "multi_salao.json"
    )

    def _carregar_multi_salao_tree(self):
        try:
            for row in self._multi_salao_tree.get_children():
                self._multi_salao_tree.delete(row)
            dados = []
            if os.path.exists(self._ARQUIVO_MULTI_SALAO):
                with open(self._ARQUIVO_MULTI_SALAO, 'r', encoding='utf-8') as f:
                    dados = json.load(f)
            for s in dados:
                self._multi_salao_tree.insert('', 'end',
                    values=(s.get('nome',''), s.get('url',''), s.get('email',''),
                            '✅' if s.get('ativo', True) else '❌'))
        except Exception:
            pass

    def _adicionar_salao_multi(self):
        win = tk.Toplevel(self.root)
        win.title('➕ Adicionar Salão')
        win.geometry('500x280')
        win.configure(bg='#ffffff')
        win.grab_set()

        FP = FONT_PRIMARY
        campos = [('Nome do salão:', 'nome'), ('URL de login:', 'url'),
                  ('E-mail:', 'email'), ('Senha:', 'senha')]
        vars_ = {}
        for i, (label, key) in enumerate(campos):
            tk.Label(win, text=label, bg='#ffffff', font=(FP, 10)).grid(
                row=i, column=0, sticky='w', padx=20, pady=8)
            show = '*' if key == 'senha' else ''
            v = tk.StringVar()
            tk.Entry(win, textvariable=v, width=40, show=show, font=(FP, 10)).grid(
                row=i, column=1, padx=10, pady=8)
            vars_[key] = v

        def salvar():
            s = {k: v.get().strip() for k, v in vars_.items()}
            if not s['nome'] or not s['url']:
                messagebox.showerror('Erro', 'Nome e URL são obrigatórios.', parent=win)
                return
            dados = []
            if os.path.exists(self._ARQUIVO_MULTI_SALAO):
                with open(self._ARQUIVO_MULTI_SALAO, 'r', encoding='utf-8') as f:
                    dados = json.load(f)
            s['ativo'] = True
            dados.append(s)
            os.makedirs(os.path.dirname(self._ARQUIVO_MULTI_SALAO), exist_ok=True)
            with open(self._ARQUIVO_MULTI_SALAO, 'w', encoding='utf-8') as f:
                json.dump(dados, f, ensure_ascii=False, indent=2)
            self._carregar_multi_salao_tree()
            win.destroy()

        tk.Button(win, text='💾 Salvar', command=salvar,
                  bg='#28a745', fg='white', font=(FP, 11, 'bold'),
                  padx=20, pady=6, cursor='hand2', relief='flat').grid(
                  row=len(campos), column=0, columnspan=2, pady=15)

    def _remover_salao_multi(self):
        sel = self._multi_salao_tree.selection()
        if not sel:
            return
        item = self._multi_salao_tree.item(sel[0])
        nome = item['values'][0]
        if not messagebox.askyesno('Remover', f'Remover o salão "{nome}"?'):
            return
        dados = []
        if os.path.exists(self._ARQUIVO_MULTI_SALAO):
            with open(self._ARQUIVO_MULTI_SALAO, 'r', encoding='utf-8') as f:
                dados = json.load(f)
        dados = [s for s in dados if s.get('nome') != nome]
        with open(self._ARQUIVO_MULTI_SALAO, 'w', encoding='utf-8') as f:
            json.dump(dados, f, ensure_ascii=False, indent=2)
        self._carregar_multi_salao_tree()

    # =========================================================================
    # ABA: SAÚDE DOS DADOS (calendário heatmap)
    # =========================================================================
    def configurar_aba_saude_dados(self):
        FP = FONT_PRIMARY
        container = tk.Frame(self.aba_saude, bg='#ffffff', padx=20, pady=20)
        container.pack(fill='both', expand=True)

        tk.Label(container, text='📊 PAINEL DE SAÚDE DOS DADOS',
                 font=(FP, 18, 'bold'), fg='#0f3460', bg='#ffffff').pack(pady=(0, 5))
        tk.Label(container,
                 text='Visão mensal de quais períodos possuem dados coletados — Verde = OK  |  Vermelho = Falhou  |  Cinza = Não coletado',
                 font=(FP, 10), fg='#555', bg='#ffffff').pack(pady=(0, 20))

        btn_f = tk.Frame(container, bg='#ffffff')
        btn_f.pack(pady=(0, 15))
        tk.Button(btn_f, text='🔄 Atualizar calendário',
                  command=self._desenhar_calendario_saude,
                  bg='#0f3460', fg='white', font=(FP, 10, 'bold'),
                  padx=18, pady=6, cursor='hand2', relief='flat').pack(side='left', padx=8)
        tk.Button(btn_f, text='📋 Ver detalhes de integridade',
                  command=self.abrir_painel_integridade,
                  bg='#17a2b8', fg='white', font=(FP, 10, 'bold'),
                  padx=18, pady=6, cursor='hand2', relief='flat').pack(side='left', padx=8)

        # Canvas scrollável para o calendário
        outer = tk.Frame(container, bg='#ffffff')
        outer.pack(fill='both', expand=True)
        self._saude_canvas = tk.Canvas(outer, bg='#ffffff', highlightthickness=0)
        sb_y = ttk.Scrollbar(outer, orient='vertical', command=self._saude_canvas.yview)
        self._saude_canvas.configure(yscrollcommand=sb_y.set)
        self._saude_canvas.pack(side='left', fill='both', expand=True)
        sb_y.pack(side='right', fill='y')

        self._desenhar_calendario_saude()

    def _desenhar_calendario_saude(self):
        canvas = self._saude_canvas
        canvas.delete('all')
        FP = FONT_PRIMARY

        try:
            periodos_status = self.base_dados.obter_status_periodos()
        except Exception:
            periodos_status = []

        status_map = {}
        for p in periodos_status:
            status_map[(p.get('ano', 0), p.get('mes', 0))] = p.get('status_geral', 'FALHOU')

        anos = list(range(2019, datetime.now().year + 1))
        MESES_ABBR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
        COR = {'OK': '#27ae60', 'PARCIAL': '#f39c12', 'FALHOU': '#e74c3c', None: '#bdc3c7'}
        TEXTO_COR = {'OK': 'white', 'PARCIAL': '#333', 'FALHOU': 'white', None: '#666'}

        cel_w, cel_h = 68, 42
        marg_esq = 70
        marg_top = 40

        # Cabeçalho dos meses
        for j, m in enumerate(MESES_ABBR):
            x = marg_esq + j * cel_w + cel_w // 2
            canvas.create_text(x, marg_top - 18, text=m, font=(FP, 9, 'bold'), fill='#0f3460')

        for i, ano in enumerate(anos):
            y_base = marg_top + i * (cel_h + 6)
            canvas.create_text(marg_esq - 10, y_base + cel_h // 2,
                                text=str(ano), font=(FP, 9, 'bold'), fill='#0f3460', anchor='e')
            for j, mes in enumerate(range(1, 13)):
                x = marg_esq + j * cel_w
                st = status_map.get((ano, mes))
                # Não colorir meses futuros
                agora = datetime.now()
                if ano > agora.year or (ano == agora.year and mes > agora.month):
                    cor = '#f0f0f0'
                    txt_cor = '#ccc'
                    st_label = '—'
                else:
                    cor = COR.get(st, COR[None])
                    txt_cor = TEXTO_COR.get(st, TEXTO_COR[None])
                    st_label = st if st else '?'

                canvas.create_rectangle(x, y_base, x + cel_w - 4, y_base + cel_h,
                                        fill=cor, outline='#ddd')
                canvas.create_text(x + cel_w // 2 - 2, y_base + cel_h // 2,
                                   text=st_label[:6], font=(FP, 8), fill=txt_cor)

        total_h = marg_top + len(anos) * (cel_h + 6) + 40
        canvas.configure(scrollregion=(0, 0, marg_esq + 12 * cel_w + 20, total_h))

    # =========================================================================
    # ABA: HISTÓRICO DE COLETAS
    # =========================================================================
    def configurar_aba_historico_coletas(self):
        FP = FONT_PRIMARY
        container = tk.Frame(self.aba_historico_coletas, bg='#ffffff', padx=20, pady=20)
        container.pack(fill='both', expand=True)

        tk.Label(container, text='📈 HISTÓRICO DE COLETAS',
                 font=(FP, 18, 'bold'), fg='#0f3460', bg='#ffffff').pack(pady=(0, 20))

        # Filtros
        filtro_f = tk.Frame(container, bg='#ffffff')
        filtro_f.pack(fill='x', pady=(0, 10))

        tk.Label(filtro_f, text='Filtrar:', bg='#ffffff', font=(FP, 10)).pack(side='left')
        self._hist_filtro_var = tk.StringVar(value='Todos')
        ttk.Combobox(filtro_f, textvariable=self._hist_filtro_var,
                     values=['Todos', 'Apenas com falhas', 'Apenas OK'],
                     state='readonly', width=18, font=(FP, 10)).pack(side='left', padx=8)
        tk.Button(filtro_f, text='🔍 Filtrar',
                  command=self._atualizar_tabela_historico,
                  bg='#0f3460', fg='white', font=(FP, 10),
                  padx=12, pady=4, cursor='hand2', relief='flat').pack(side='left', padx=4)
        tk.Button(filtro_f, text='🗑 Limpar histórico',
                  command=self._limpar_historico_coletas,
                  bg='#dc3545', fg='white', font=(FP, 10),
                  padx=12, pady=4, cursor='hand2', relief='flat').pack(side='right', padx=4)

        # Tabela
        cols = ('data', 'tipo', 'periodos', 'ok', 'falhou')
        self._hist_coletas_tree = ttk.Treeview(container, columns=cols, show='headings', height=18)
        self._hist_coletas_tree.heading('data',     text='Data/Hora')
        self._hist_coletas_tree.heading('tipo',     text='Tipo')
        self._hist_coletas_tree.heading('periodos', text='Períodos')
        self._hist_coletas_tree.heading('ok',       text='✅ OK')
        self._hist_coletas_tree.heading('falhou',   text='❌ Falhou')
        self._hist_coletas_tree.column('data',     width=150)
        self._hist_coletas_tree.column('tipo',     width=160)
        self._hist_coletas_tree.column('periodos', width=250)
        self._hist_coletas_tree.column('ok',       width=80, anchor='center')
        self._hist_coletas_tree.column('falhou',   width=80, anchor='center')

        sb = ttk.Scrollbar(container, orient='vertical', command=self._hist_coletas_tree.yview)
        self._hist_coletas_tree.configure(yscrollcommand=sb.set)

        tree_frame = tk.Frame(container, bg='#ffffff')
        tree_frame.pack(fill='both', expand=True)
        self._hist_coletas_tree.pack(side='left', fill='both', expand=True)
        sb.pack(side='right', fill='y')

        # Colorir linhas
        self._hist_coletas_tree.tag_configure('ok_total', background='#d4edda')
        self._hist_coletas_tree.tag_configure('com_falha', background='#f8d7da')

        self._atualizar_tabela_historico()

    def _atualizar_tabela_historico(self):
        for row in self._hist_coletas_tree.get_children():
            self._hist_coletas_tree.delete(row)

        filtro = self._hist_filtro_var.get() if hasattr(self, '_hist_filtro_var') else 'Todos'
        for entrada in reversed(self._historico_coletas):
            ok     = entrada.get('ok', 0)
            falhou = entrada.get('falhou', 0)
            if filtro == 'Apenas com falhas' and falhou == 0:
                continue
            if filtro == 'Apenas OK' and falhou > 0:
                continue

            periodos_str = ', '.join(entrada.get('periodos', [])) if isinstance(
                entrada.get('periodos'), list) else str(entrada.get('periodos', ''))
            tag = 'ok_total' if falhou == 0 else 'com_falha'
            self._hist_coletas_tree.insert('', 'end',
                values=(entrada.get('data',''), entrada.get('tipo',''),
                        periodos_str[:60], ok, falhou), tags=(tag,))

    def _limpar_historico_coletas(self):
        if messagebox.askyesno('Confirmar', 'Apagar todo o histórico de coletas?'):
            self._historico_coletas.clear()
            self._salvar_historico_coletas()
            self._atualizar_tabela_historico()

    # =========================================================================
    # ABA: EXPORTAÇÃO PERSONALIZADA
    # =========================================================================
    def configurar_aba_exportar(self):
        FP = FONT_PRIMARY
        container = tk.Frame(self.aba_exportar, bg='#ffffff', padx=30, pady=20)
        container.pack(fill='both', expand=True)

        tk.Label(container, text='📤 EXPORTAÇÃO PERSONALIZADA',
                 font=(FP, 18, 'bold'), fg='#0f3460', bg='#ffffff').pack(pady=(0, 20))

        # ── Seleção de período ────────────────────────────────────────────
        per_f = tk.LabelFrame(container, text='📆 PERÍODO',
                              font=(FP, 12, 'bold'), bg='#ffffff', fg='#0f3460',
                              padx=15, pady=15)
        per_f.pack(fill='x', pady=(0, 15))

        MESES_NOMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                       'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
        ANOS_LISTA  = [str(a) for a in range(2019, datetime.now().year + 2)]

        tk.Label(per_f, text='De:', bg='#ffffff', font=(FP, 10)).grid(row=0, column=0, sticky='w')
        self._export_mes_ini = ttk.Combobox(per_f, values=MESES_NOMES, state='readonly', width=12)
        self._export_mes_ini.set('Janeiro')
        self._export_mes_ini.grid(row=0, column=1, padx=4)
        self._export_ano_ini = ttk.Combobox(per_f, values=ANOS_LISTA, state='readonly', width=7)
        self._export_ano_ini.set('2019')
        self._export_ano_ini.grid(row=0, column=2, padx=4)

        tk.Label(per_f, text='  Até:', bg='#ffffff', font=(FP, 10)).grid(row=0, column=3, sticky='w')
        self._export_mes_fim = ttk.Combobox(per_f, values=MESES_NOMES, state='readonly', width=12)
        self._export_mes_fim.set(MESES_NOMES[datetime.now().month - 1])
        self._export_mes_fim.grid(row=0, column=4, padx=4)
        self._export_ano_fim = ttk.Combobox(per_f, values=ANOS_LISTA, state='readonly', width=7)
        self._export_ano_fim.set(str(datetime.now().year))
        self._export_ano_fim.grid(row=0, column=5, padx=4)

        # ── Dados a exportar ──────────────────────────────────────────────
        dados_f = tk.LabelFrame(container, text='📋 RELATÓRIOS PARA EXPORTAR',
                                font=(FP, 12, 'bold'), bg='#ffffff', fg='#0f3460',
                                padx=15, pady=15)
        dados_f.pack(fill='x', pady=(0, 15))

        # Mapeamento: nome exibido → chave na base de dados
        self._export_opcoes = {
            '📈 Faturamento (0083)':        tk.BooleanVar(value=True),
            '👤 Clientes Novos (0017)':     tk.BooleanVar(value=True),
            '✂️ Serviços (0032)':           tk.BooleanVar(value=True),
            '📦 Produtos (0042)':           tk.BooleanVar(value=True),
            '📅 Fat. Diário (0088)':        tk.BooleanVar(value=True),
            '💰 Pagamentos (0123)':         tk.BooleanVar(value=True),
            '🎫 Ticket Médio (0021)':       tk.BooleanVar(value=True),
            '⭐ Preferência (0326)':        tk.BooleanVar(value=True),
            '⏰ Ocupação (0126)':           tk.BooleanVar(value=True),
            '🔧 Serviços Prof. (0031)':     tk.BooleanVar(value=True),
            '📦 Produtos Prof. (0041)':     tk.BooleanVar(value=True),
            '📅 Agendamentos (0051)':       tk.BooleanVar(value=True),
            '🧾 Comandas Finalizadas':      tk.BooleanVar(value=True),
            '🏷️ Tabela de Preços (0033)':   tk.BooleanVar(value=True),
        }
        for i, (nome, var) in enumerate(self._export_opcoes.items()):
            ttk.Checkbutton(dados_f, text=nome, variable=var).grid(
                row=i // 4, column=i % 4, sticky='w', padx=15, pady=5)

        sel_exp = tk.Frame(dados_f, bg='#ffffff')
        sel_exp.grid(row=3, column=0, columnspan=4, sticky='w', pady=(6, 0))
        tk.Button(sel_exp, text='✅ Marcar todos',
                  command=lambda: [v.set(True) for v in self._export_opcoes.values()],
                  bg='#d5f5e3', fg='#145a32', font=(FP, 9, 'bold'),
                  padx=12, pady=3, relief='flat', cursor='hand2').pack(side='left', padx=4)
        tk.Button(sel_exp, text='❌ Desmarcar todos',
                  command=lambda: [v.set(False) for v in self._export_opcoes.values()],
                  bg='#fadbd8', fg='#78281f', font=(FP, 9, 'bold'),
                  padx=12, pady=3, relief='flat', cursor='hand2').pack(side='left', padx=4)

        # ── Formato ───────────────────────────────────────────────────────
        fmt_f = tk.LabelFrame(container, text='📁 FORMATO DE SAÍDA',
                              font=(FP, 12, 'bold'), bg='#ffffff', fg='#0f3460',
                              padx=15, pady=15)
        fmt_f.pack(fill='x', pady=(0, 15))

        self._export_formato_var = tk.StringVar(value='Excel (.xlsx)')
        for fmt in ['Excel (.xlsx)', 'CSV (.csv)', 'PDF (relatório)']:
            ttk.Radiobutton(fmt_f, text=fmt, variable=self._export_formato_var,
                            value=fmt).pack(side='left', padx=20)

        # ── Comparativo de períodos ───────────────────────────────────────
        comp_f = tk.LabelFrame(container, text='📊 COMPARATIVO DE PERÍODOS',
                               font=(FP, 12, 'bold'), bg='#ffffff', fg='#0f3460',
                               padx=15, pady=15)
        comp_f.pack(fill='x', pady=(0, 15))

        MESES_N2 = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
        ANOS_L2  = [str(a) for a in range(2019, datetime.now().year + 2)]

        tk.Label(comp_f, text='Período A:', bg='#ffffff', font=(FP, 10)).grid(row=0, column=0, sticky='w')
        self._comp_mes_a = ttk.Combobox(comp_f, values=MESES_N2, state='readonly', width=11)
        self._comp_mes_a.set('Janeiro')
        self._comp_mes_a.grid(row=0, column=1, padx=4)
        self._comp_ano_a = ttk.Combobox(comp_f, values=ANOS_L2, state='readonly', width=7)
        self._comp_ano_a.set(str(datetime.now().year))
        self._comp_ano_a.grid(row=0, column=2, padx=4)

        tk.Label(comp_f, text='  Período B:', bg='#ffffff', font=(FP, 10)).grid(row=0, column=3, sticky='w')
        self._comp_mes_b = ttk.Combobox(comp_f, values=MESES_N2, state='readonly', width=11)
        self._comp_mes_b.set(MESES_N2[datetime.now().month - 1])
        self._comp_mes_b.grid(row=0, column=4, padx=4)
        self._comp_ano_b = ttk.Combobox(comp_f, values=ANOS_L2, state='readonly', width=7)
        self._comp_ano_b.set(str(datetime.now().year))
        self._comp_ano_b.grid(row=0, column=5, padx=4)

        tk.Button(comp_f, text='📊 GERAR COMPARATIVO',
                  command=self._gerar_comparativo_periodos,
                  bg='#17a2b8', fg='white', font=(FP, 10, 'bold'),
                  padx=16, pady=6, cursor='hand2', relief='flat').grid(row=0, column=6, padx=10)

        # ── Botões de exportação ──────────────────────────────────────────
        btn_f = tk.Frame(container, bg='#ffffff')
        btn_f.pack(fill='x', pady=20)

        tk.Button(btn_f, text='📤 EXPORTAR DADOS',
                  command=self._executar_exportacao,
                  bg='#28a745', fg='white', font=(FP, 13, 'bold'),
                  padx=30, pady=12, cursor='hand2', relief='flat').pack(side='left', padx=10)

        tk.Button(btn_f, text='📄 RELATÓRIO PDF DE AUDITORIA',
                  command=self._gerar_pdf_auditoria,
                  bg='#e74c3c', fg='white', font=(FP, 12, 'bold'),
                  padx=20, pady=12, cursor='hand2', relief='flat').pack(side='left', padx=10)

        tk.Button(btn_f, text='✅ VALIDAR DADOS PRÉ-UPLOAD',
                  command=self._validar_dados_pre_upload,
                  bg='#f39c12', fg='white', font=(FP, 12, 'bold'),
                  padx=20, pady=12, cursor='hand2', relief='flat').pack(side='left', padx=10)

    def _executar_exportacao(self):
        """Exporta dados filtrados no formato selecionado."""
        try:
            opcoes_sel = [nome for nome, var in self._export_opcoes.items() if var.get()]
            if not opcoes_sel:
                messagebox.showwarning('Atenção', 'Selecione ao menos um tipo de dado para exportar.')
                return

            formato = self._export_formato_var.get()
            destino = filedialog.asksaveasfilename(
                title='Salvar exportação como',
                defaultextension='.xlsx' if 'xlsx' in formato else '.csv' if 'csv' in formato else '.pdf',
                filetypes=[('Excel', '*.xlsx'), ('CSV', '*.csv'), ('PDF', '*.pdf'), ('Todos', '*.*')]
            )
            if not destino:
                return

            df_geral = self.base_dados.df_geral

            # Mapeamento: parte do nome exibido → chave na base de dados
            MAPA_EXPORT = {
                '0083': ('Faturamento',     'PROF_PAGAMENTOS'),
                '0017': ('Clientes Novos',  'TAXA_RETORNO_SALAO'),
                '0032': ('Serviços',        'PROF_SERVICOS'),
                '0042': ('Produtos',        'PROF_PRODUTOS'),
                '0088': ('Fat Diário',      'FATURAMENTO_DIARIO'),
                '0123': ('Pagamentos',      'PROF_PAGAMENTOS'),
                '0021': ('Ticket Médio',    'PROF_TICKET'),
                '0326': ('Preferência',     'PROF_PREFERENCIA'),
                '0126': ('Ocupação',        'PROF_OCUPACAO'),
                '0031': ('Serv Prof',       'PROF_SERVICOS'),
                '0041': ('Prod Prof',       'PROF_PRODUTOS'),
                '0051': ('Agendamentos',    'AGENDAMENTOS_RAW'),
                'comandas': ('Comandas Finalizadas', 'COMANDAS_RAW'),
                '0033': ('Tabela de Preços', 'TABELA_PRECOS'),
            }

            # Descobre quais códigos estão selecionados
            codigos_sel = set()
            for nome_op in opcoes_sel:
                for cod in MAPA_EXPORT:
                    # Sem caixa: os codigos antigos sao numeros ("0051") e
                    # casavam de qualquer jeito, mas o novo e uma palavra —
                    # e "comandas" nao existe dentro de "Comandas Finalizadas".
                    # A aba seria simplesmente ignorada na exportacao, calada.
                    if cod.lower() in nome_op.lower():
                        codigos_sel.add(cod)

            if 'xlsx' in formato:
                abas_exportadas = 0
                with pd.ExcelWriter(destino, engine='openpyxl') as writer:
                    abas_ja_exportadas = set()
                    for cod in codigos_sel:
                        nome_aba, chave_df = MAPA_EXPORT[cod]
                        # Evita duplicar abas com mesma chave
                        chave_unica = f'{nome_aba}_{chave_df}'
                        if chave_unica in abas_ja_exportadas:
                            continue
                        abas_ja_exportadas.add(chave_unica)
                        df = df_geral.get(chave_df, pd.DataFrame())
                        if not df.empty:
                            df.to_excel(writer, sheet_name=nome_aba[:31], index=False)
                            abas_exportadas += 1
                if abas_exportadas > 0:
                    messagebox.showinfo('Exportado',
                        f'✅ {abas_exportadas} aba(s) exportada(s) para:\n{destino}')
                else:
                    messagebox.showwarning('Sem dados',
                        'Nenhum dado coletado ainda para os relatórios selecionados.')

            elif 'csv' in formato:
                frames = []
                for cod in codigos_sel:
                    _, chave_df = MAPA_EXPORT[cod]
                    df = df_geral.get(chave_df, pd.DataFrame())
                    if not df.empty:
                        df['_relatorio'] = cod
                        frames.append(df)
                if frames:
                    pd.concat(frames, ignore_index=True).to_csv(
                        destino, index=False, encoding='utf-8-sig')
                    messagebox.showinfo('Exportado', f'✅ CSV salvo em:\n{destino}')
                else:
                    messagebox.showwarning('Sem dados', 'Nenhum dado disponível para exportar.')

            else:
                self._gerar_pdf_auditoria(destino=destino)

        except Exception as e:
            messagebox.showerror('Erro', f'Erro ao exportar: {e}')
            logging.error(f'Erro na exportação: {e}')

    def _gerar_comparativo_periodos(self):
        """Mostra janela com comparativo lado a lado de dois períodos."""
        try:
            MESES_IDX = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                         'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
            mes_a = MESES_IDX.index(self._comp_mes_a.get()) + 1
            ano_a = int(self._comp_ano_a.get())
            mes_b = MESES_IDX.index(self._comp_mes_b.get()) + 1
            ano_b = int(self._comp_ano_b.get())

            per_df = self.base_dados.df_geral.get('PERIODOS', pd.DataFrame())
            if per_df.empty:
                messagebox.showwarning('Sem dados', 'Nenhum dado de períodos disponível.')
                return

            MESES = ['','Jan','Fev','Mar','Abr','Mai','Jun',
                     'Jul','Ago','Set','Out','Nov','Dez']
            label_a = f'{MESES[mes_a]}/{ano_a}'
            label_b = f'{MESES[mes_b]}/{ano_b}'

            def filtrar(ano, mes):
                col_ano = 'ano' if 'ano' in per_df.columns else 'ANO'
                col_mes = 'mes' if 'mes' in per_df.columns else 'MES'
                if col_ano in per_df.columns and col_mes in per_df.columns:
                    return per_df[(per_df[col_ano] == ano) & (per_df[col_mes] == mes)]
                return pd.DataFrame()

            df_a = filtrar(ano_a, mes_a)
            df_b = filtrar(ano_b, mes_b)

            win = tk.Toplevel(self.root)
            win.title(f'📊 Comparativo: {label_a}  vs  {label_b}')
            win.geometry('900x500')
            win.configure(bg='#ffffff')
            FP = FONT_PRIMARY

            tk.Label(win, text=f'📊 COMPARATIVO DE PERÍODOS: {label_a} × {label_b}',
                     font=(FP, 14, 'bold'), fg='#0f3460', bg='#ffffff').pack(pady=15)

            frame_tabela = tk.Frame(win, bg='#ffffff')
            frame_tabela.pack(fill='both', expand=True, padx=20)

            cols = ('campo', label_a, label_b, 'variacao')
            tv = ttk.Treeview(frame_tabela, columns=cols, show='headings', height=18)
            for col in cols:
                tv.heading(col, text=col)
                tv.column(col, width=200, anchor='center')

            tv.tag_configure('positivo', foreground='#27ae60')
            tv.tag_configure('negativo', foreground='#e74c3c')

            metricas = [c for c in per_df.columns
                        if c not in ('ano','mes','ANO','MES','salao_id')]

            for col in metricas[:20]:
                try:
                    val_a = float(df_a[col].iloc[0]) if not df_a.empty and col in df_a.columns else 0
                    val_b = float(df_b[col].iloc[0]) if not df_b.empty and col in df_b.columns else 0
                    if val_a == 0 and val_b == 0:
                        continue
                    var = ((val_b - val_a) / val_a * 100) if val_a != 0 else 0
                    tag = 'positivo' if var >= 0 else 'negativo'
                    sinal = '+' if var >= 0 else ''
                    tv.insert('', 'end',
                        values=(col,
                                f'{val_a:,.2f}'.replace(',','.'),
                                f'{val_b:,.2f}'.replace(',','.'),
                                f'{sinal}{var:.1f}%'),
                        tags=(tag,))
                except Exception:
                    pass

            tv.pack(fill='both', expand=True)

        except Exception as e:
            messagebox.showerror('Erro', f'Erro no comparativo: {e}')

    def _validar_dados_pre_upload(self):
        """Compara dados do mês atual com o mês anterior e aponta anomalias."""
        try:
            per_df = self.base_dados.df_geral.get('PERIODOS', pd.DataFrame())
            if per_df.empty:
                messagebox.showwarning('Sem dados', 'Nenhum dado coletado para validar.')
                return

            col_ano = 'ano' if 'ano' in per_df.columns else 'ANO'
            col_mes = 'mes' if 'mes' in per_df.columns else 'MES'

            if col_ano not in per_df.columns:
                messagebox.showwarning('Dados', 'Estrutura de dados não reconhecida para validação.')
                return

            agora = datetime.now()
            mes_a = agora.month
            ano_a = agora.year
            mes_ant = mes_a - 1 if mes_a > 1 else 12
            ano_ant = ano_a if mes_a > 1 else ano_a - 1

            atual = per_df[(per_df[col_ano] == ano_a) & (per_df[col_mes] == mes_a)]
            anterior = per_df[(per_df[col_ano] == ano_ant) & (per_df[col_mes] == mes_ant)]

            alertas = []
            metricas_num = [c for c in per_df.select_dtypes(include='number').columns
                            if c not in (col_ano, col_mes)]

            for col in metricas_num[:15]:
                try:
                    v_a = float(atual[col].iloc[0]) if not atual.empty else 0
                    v_ant = float(anterior[col].iloc[0]) if not anterior.empty else 0
                    if v_ant == 0:
                        continue
                    variacao = (v_a - v_ant) / v_ant * 100
                    if abs(variacao) > 50:
                        direcao = '▲' if variacao > 0 else '▼'
                        alertas.append(f'{direcao} {col}: {variacao:+.1f}% vs mês anterior')
                except Exception:
                    pass

            if alertas:
                msg = ('⚠️ ANOMALIAS DETECTADAS:\n\n'
                       + '\n'.join(alertas[:20])
                       + '\n\nRecomenda-se revisar esses dados antes de fazer upload.')
            else:
                msg = '✅ Validação concluída — nenhuma anomalia significativa detectada nos dados.'

            messagebox.showinfo('Validação Pré-Upload', msg)

        except Exception as e:
            messagebox.showerror('Erro', f'Erro na validação: {e}')

    def _gerar_pdf_auditoria(self, destino=None):
        """Gera relatório PDF com resumo da última coleta."""
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.lib import colors
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
            from reportlab.lib.styles import getSampleStyleSheet
        except ImportError:
            messagebox.showinfo(
                'Dependência ausente',
                'Para gerar PDF é necessário instalar o pacote reportlab.\n\n'
                'Execute no terminal:\n    pip install reportlab\n\nDepois tente novamente.')
            return

        try:
            if not destino:
                destino = filedialog.asksaveasfilename(
                    title='Salvar PDF de auditoria',
                    defaultextension='.pdf',
                    filetypes=[('PDF', '*.pdf')])
            if not destino:
                return

            doc = SimpleDocTemplate(destino, pagesize=A4)
            styles = getSampleStyleSheet()
            elementos = []

            titulo = Paragraph('NODRI — Relatório de Auditoria de Coleta', styles['Title'])
            elementos.append(titulo)
            elementos.append(Spacer(1, 12))

            data_hora = Paragraph(f'Gerado em: {datetime.now().strftime("%d/%m/%Y %H:%M")}', styles['Normal'])
            elementos.append(data_hora)
            elementos.append(Spacer(1, 20))

            # Resumo do histórico
            if self._historico_coletas:
                ultima = self._historico_coletas[-1]
                resumo_data = [
                    ['Campo', 'Valor'],
                    ['Data da coleta', ultima.get('data', 'N/A')],
                    ['Tipo',          ultima.get('tipo', 'N/A')],
                    ['Total OK',      str(ultima.get('ok', 0))],
                    ['Total Falhou',  str(ultima.get('falhou', 0))],
                ]
                t = Table(resumo_data, colWidths=[200, 280])
                t.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f3460')),
                    ('TEXTCOLOR',  (0, 0), (-1, 0), colors.white),
                    ('FONTNAME',   (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('GRID',       (0, 0), (-1, -1), 0.5, colors.grey),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f0f4f8')]),
                ]))
                elementos.append(Paragraph('Última Coleta', styles['Heading2']))
                elementos.append(Spacer(1, 8))
                elementos.append(t)
                elementos.append(Spacer(1, 20))

            # Tabela de status dos períodos
            try:
                periodos = self.base_dados.obter_status_periodos()
                if periodos:
                    header = ['Período', 'Status', 'OK', 'Falhou']
                    rows = [header] + [
                        [p.get('periodo',''), p.get('status_geral',''),
                         str(p.get('ok',0)), str(p.get('falhou',0))]
                        for p in periodos[:40]
                    ]
                    t2 = Table(rows, colWidths=[130, 100, 60, 60])
                    t2.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f3460')),
                        ('TEXTCOLOR',  (0, 0), (-1, 0), colors.white),
                        ('FONTNAME',   (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('GRID',       (0, 0), (-1, -1), 0.5, colors.grey),
                        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f0f4f8')]),
                    ]))
                    elementos.append(Paragraph('Status dos Períodos', styles['Heading2']))
                    elementos.append(Spacer(1, 8))
                    elementos.append(t2)
            except Exception:
                pass

            doc.build(elementos)
            messagebox.showinfo('PDF gerado', f'✅ Relatório PDF salvo em:\n{destino}')
            webbrowser.open(f'file:///{os.path.abspath(destino)}')

        except Exception as e:
            messagebox.showerror('Erro', f'Erro ao gerar PDF: {e}')
            logging.error(f'Erro ao gerar PDF: {e}')

    # =========================================================================
    # NOTIFICAÇÃO AO FINALIZAR COLETA
    # =========================================================================
    def notificar_fim_coleta(self, total_ok: int, total_falhou: int, forcar: bool = False):
        """Emite popup e/ou som ao finalizar uma coleta."""
        notif_popup = forcar or (hasattr(self, '_notif_popup_var') and self._notif_popup_var.get())
        notif_som   = forcar or (hasattr(self, '_notif_som_var') and self._notif_som_var.get())

        if notif_som:
            try:
                import winsound
                for _ in range(3):
                    winsound.Beep(880, 200)
                    time.sleep(0.1)
            except Exception:
                pass

        if notif_popup:
            icone = '✅' if total_falhou == 0 else '⚠️'
            msg = (f'{icone} COLETA FINALIZADA\n\n'
                   f'  ✅  OK: {total_ok}\n'
                   f'  ❌  Falhou: {total_falhou}')
            if forcar:
                msg = '🔔 Teste de notificação funcionando!'
            messagebox.showinfo('Coleta Finalizada', msg)

    # =========================================================================
    # VERIFICAÇÃO DE ATUALIZAÇÃO
    # =========================================================================
    def verificar_atualizacao(self):
        """Verifica se há nova versão disponível (consulta o arquivo de config do servidor)."""
        VERSAO_ATUAL = '4.0'
        try:
            import urllib.request
            url_versao = 'https://raw.githubusercontent.com/nodri/coletor/main/versao.txt'
            with urllib.request.urlopen(url_versao, timeout=5) as resp:
                versao_remote = resp.read().decode('utf-8').strip()
            if versao_remote and versao_remote != VERSAO_ATUAL:
                messagebox.showinfo(
                    '🆕 Atualização disponível',
                    f'Nova versão disponível: {versao_remote}\n'
                    f'Versão atual: {VERSAO_ATUAL}\n\n'
                    'Entre em contato com o suporte para atualizar.')
            else:
                messagebox.showinfo(
                    '✅ Sistema atualizado',
                    f'Você já está na versão mais recente ({VERSAO_ATUAL}).')
        except Exception:
            messagebox.showinfo(
                'Verificação de atualização',
                f'Versão atual: {VERSAO_ATUAL}\n\n'
                'Não foi possível verificar online. Verifique sua conexão ou entre em contato com o suporte.')

    # =========================================================================
    # MODO SILENCIOSO / BANDEJA DO SISTEMA
    # =========================================================================
    def ativar_modo_bandeja(self):
        """Minimiza a janela para a bandeja do sistema (requer pystray + PIL)."""
        try:
            import pystray
            from PIL import Image, ImageDraw

            self.root.withdraw()

            # Ícone simples
            img = Image.new('RGB', (64, 64), color='#0f3460')
            d = ImageDraw.Draw(img)
            d.ellipse([10, 10, 54, 54], fill='#27ae60')
            d.text((20, 22), 'N', fill='white')

            def mostrar(icon, item):
                icon.stop()
                self.root.deiconify()

            menu = pystray.Menu(
                pystray.MenuItem('Abrir NODRI', mostrar),
                pystray.MenuItem('Sair', lambda i, it: self.fecha_sistema()),
            )
            icon = pystray.Icon('NODRI', img, 'NODRI Coletor', menu)
            threading.Thread(target=icon.run, daemon=True).start()

        except ImportError:
            messagebox.showinfo(
                'Modo Bandeja',
                'Para ativar o modo bandeja instale:\n    pip install pystray pillow\n\n'
                'Depois reinicie o programa.')
        except Exception as e:
            messagebox.showerror('Erro', f'Erro no modo bandeja: {e}')

    def fecha_sistema(self):
        """Fecha o sistema corretamente"""
        print("🛑 Fechando sistema...")

        # Fazer backup antes de sair
        self.gerenciador_backup.fazer_backup("pre_fechamento")

        # Fechar threads ativas
        for thread in self.threads_ativas:
            if thread and thread.is_alive():
                try:
                    thread.join(timeout=1)
                except:
                    pass

        # Fechar driver se existir
        if hasattr(self.sistema_coleta, 'driver') and self.sistema_coleta.driver:
            try:
                self.sistema_coleta.driver.quit()
            except:
                pass

        # Fechar a janela principal
        try:
            self.root.quit()
            self.root.destroy()
        except:
            pass

        print("✅ Sistema finalizado")
        sys.exit(0)


# ============================================================================
# FUNÇÃO PRINCIPAL
# ============================================================================

def abrir_gerenciador_saloes(root):
    """Tela de cadastro dos salões + escolha do modo de agendamento.
    Tudo é salvo no AppData; o Excel gerado continua indo para Downloads."""
    FP = FONT_PRIMARY
    cfg = carregar_saloes_cfg()

    win = tk.Toplevel(root)
    win.title("Salões e Agendamento Automático")
    win.configure(bg="#f4f7fb")
    win.geometry("1000x660")
    win.transient(root)

    tk.Label(win, text="🏢  SALÕES E AGENDAMENTO",
             font=(FP, 16, "bold"), fg="#0f3460", bg="#f4f7fb").pack(pady=(16, 2))
    tk.Label(win, text="Cadastre 10 ou mais salões. Cada um coleta no avec e implanta no NODRI sozinho.",
             font=(FP, 9), fg="#555", bg="#f4f7fb").pack(pady=(0, 10))

    # ── Lista de salões ──────────────────────────────────────────────────
    quadro = tk.Frame(win, bg="#f4f7fb"); quadro.pack(fill="both", expand=True, padx=16)
    cols = ("nome", "avec", "nodri", "horario", "ativo")
    tree = ttk.Treeview(quadro, columns=cols, show="headings", height=10)
    for c, t, w in (("nome", "Salão", 180), ("avec", "URL avec.beauty", 300),
                    ("nodri", "Login nodri", 140), ("horario", "Horário", 80),
                    ("ativo", "Ativo", 70)):
        tree.heading(c, text=t); tree.column(c, width=w, anchor="w")
    tree.pack(side="left", fill="both", expand=True)
    sb = ttk.Scrollbar(quadro, orient="vertical", command=tree.yview)
    tree.configure(yscrollcommand=sb.set); sb.pack(side="right", fill="y")

    def atualizar_lista():
        tree.delete(*tree.get_children())
        for s in cfg["saloes"]:
            tree.insert("", "end", iid=s["id"], values=(
                s.get("nome", ""), s.get("avec_url", ""), s.get("nodri_login", ""),
                s.get("horario", ""), "Sim" if s.get("ativo", True) else "Não"))

    def salao_selecionado():
        sel = tree.selection()
        if not sel:
            return None
        return next((s for s in cfg["saloes"] if s["id"] == sel[0]), None)

    # ── Formulário de um salão (janela filha) ────────────────────────────
    def form_salao(salao, novo):
        fw = tk.Toplevel(win); fw.title("Novo salão" if novo else "Editar salão")
        fw.configure(bg="white"); fw.geometry("560x560"); fw.transient(win); fw.grab_set()
        campos = {}

        def linha(lbl, chave, mostrar=None, r=0):
            tk.Label(fw, text=lbl, font=(FP, 10, "bold"), fg="#0f3460", bg="white")\
                .grid(row=r, column=0, sticky="w", padx=20, pady=(12, 0))
            e = tk.Entry(fw, width=52, font=(FP, 11), show=(mostrar or ""))
            e.grid(row=r + 1, column=0, sticky="ew", padx=20)
            e.insert(0, salao.get(chave, ""))
            campos[chave] = e

        linha("🏠  Nome do salão", "nome", r=0)
        linha("🔗  URL do avec.beauty", "avec_url", r=2)
        linha("📧  E-mail do avec", "avec_email", r=4)
        linha("🔒  Senha do avec", "avec_senha", "*", r=6)
        linha("👤  Login do NODRI", "nodri_login", r=8)
        linha("🔑  Senha do NODRI", "nodri_senha", "*", r=10)
        linha("⏰  Horário (modo horário) — ex: 06:00", "horario", r=12)

        ativo_var = tk.BooleanVar(value=salao.get("ativo", True))
        tk.Checkbutton(fw, text="Salão ativo (entra no agendamento)", variable=ativo_var,
                       bg="white", font=(FP, 10), fg="#333")\
            .grid(row=14, column=0, sticky="w", padx=20, pady=(14, 0))
        fw.columnconfigure(0, weight=1)

        def salvar_form():
            for k, e in campos.items():
                salao[k] = e.get().strip()
            salao["ativo"] = ativo_var.get()
            salao["horario"] = _normalizar_hora(salao.get("horario") or "06:00", "06:00")
            if not salao.get("nome"):
                messagebox.showwarning("Atenção", "Dê um nome ao salão.", parent=fw); return
            if novo:
                cfg["saloes"].append(salao)
            salvar_saloes_cfg(cfg)
            atualizar_lista()
            fw.destroy()

        tk.Button(fw, text="✅  Salvar salão", command=salvar_form, bg="#28a745",
                  fg="white", font=(FP, 12, "bold"), relief="flat", cursor="hand2",
                  padx=20, pady=10).grid(row=15, column=0, pady=18)

    def adicionar():
        form_salao(_salao_vazio(), novo=True)

    def editar():
        s = salao_selecionado()
        if not s:
            messagebox.showinfo("Info", "Selecione um salão na lista.", parent=win); return
        form_salao(s, novo=False)

    def excluir():
        s = salao_selecionado()
        if not s:
            messagebox.showinfo("Info", "Selecione um salão.", parent=win); return
        if messagebox.askyesno("Excluir", f"Remover o salão '{s.get('nome')}'?", parent=win):
            cfg["saloes"] = [x for x in cfg["saloes"] if x["id"] != s["id"]]
            salvar_saloes_cfg(cfg); atualizar_lista()

    def rodar_agora():
        s = salao_selecionado()
        if not s:
            messagebox.showinfo("Info", "Selecione um salão para testar.", parent=win); return
        lw = tk.Toplevel(win); lw.title(f"Rodando: {s.get('nome')}"); lw.geometry("720x420")
        lw.configure(bg="#0f1117")
        txt = scrolledtext.ScrolledText(lw, bg="#0f1117", fg="#d0d0d0",
                                        font=("Consolas", 9), wrap="word")
        txt.pack(fill="both", expand=True, padx=8, pady=8)

        def log(m):
            try:
                lw.after(0, lambda: (txt.insert("end", m + "\n"), txt.see("end")))
            except Exception:
                pass
            _log_auto(m)

        def tarefa():
            conf = cfg.get("agendamento", {}).get("xpath_confirmar_nodri", "")
            processar_salao(s, log=log, xpath_confirmar_nodri=conf)
            log("\n=== FIM DO TESTE ===")

        threading.Thread(target=tarefa, daemon=True).start()

    barra = tk.Frame(win, bg="#f4f7fb"); barra.pack(fill="x", padx=16, pady=8)
    for txt, cmd, cor in (("➕  Adicionar", adicionar, "#0f3460"),
                          ("✏️  Editar", editar, "#0f3460"),
                          ("🗑  Excluir", excluir, "#a03030"),
                          ("▶  Rodar agora (teste)", rodar_agora, "#1d9e75")):
        tk.Button(barra, text=txt, command=cmd, bg=cor, fg="white",
                  font=(FP, 10, "bold"), relief="flat", cursor="hand2",
                  padx=12, pady=7).pack(side="left", padx=(0, 8))

    # ── Modo de agendamento ──────────────────────────────────────────────
    ag = cfg.setdefault("agendamento", json.loads(json.dumps(AGENDAMENTO_PADRAO)))
    modo_frame = tk.LabelFrame(win, text="  Modo de agendamento  ", bg="#f4f7fb",
                               fg="#0f3460", font=(FP, 10, "bold"), padx=12, pady=10)
    modo_frame.pack(fill="x", padx=16, pady=(6, 4))

    modo_var = tk.StringVar(value=ag.get("modo", "ciclo"))
    ciclo = ag.setdefault("ciclo", dict(AGENDAMENTO_PADRAO["ciclo"]))
    v_int = tk.StringVar(value=str(ciclo.get("intervalo_min", 5)))
    v_ini = tk.StringVar(value=ciclo.get("janela_inicio", "07:00"))
    v_fim = tk.StringVar(value=ciclo.get("janela_fim", "22:00"))

    tk.Radiobutton(modo_frame, text="Ciclo (roda um, espera, próximo, em loop na janela)",
                   variable=modo_var, value="ciclo", bg="#f4f7fb", font=(FP, 10))\
        .grid(row=0, column=0, columnspan=6, sticky="w")
    tk.Label(modo_frame, text="Espera (min):", bg="#f4f7fb", font=(FP, 9))\
        .grid(row=1, column=0, sticky="e", padx=(24, 4), pady=4)
    tk.Entry(modo_frame, textvariable=v_int, width=6).grid(row=1, column=1, sticky="w")
    tk.Label(modo_frame, text="Janela:", bg="#f4f7fb", font=(FP, 9))\
        .grid(row=1, column=2, sticky="e", padx=(16, 4))
    tk.Entry(modo_frame, textvariable=v_ini, width=7).grid(row=1, column=3, sticky="w")
    tk.Label(modo_frame, text="até", bg="#f4f7fb", font=(FP, 9)).grid(row=1, column=4, padx=4)
    tk.Entry(modo_frame, textvariable=v_fim, width=7).grid(row=1, column=5, sticky="w")

    tk.Radiobutton(modo_frame, text="Horário por salão (cada um dispara no seu horário)",
                   variable=modo_var, value="horario", bg="#f4f7fb", font=(FP, 10))\
        .grid(row=2, column=0, columnspan=6, sticky="w", pady=(8, 0))

    # ── Tempos do processo NODRI (segundos) — igual aos TIMEOUTS do avec ──
    tp = ag.setdefault("nodri_tempos", dict(NODRI_TEMPOS_PADRAO))
    vt_elem = tk.StringVar(value=str(tp.get("timeout_elemento", 25)))
    vt_login = tk.StringVar(value=str(tp.get("apos_login", 6)))
    vt_passo = tk.StringVar(value=str(tp.get("entre_passos", 2)))
    vt_anexo = tk.StringVar(value=str(tp.get("apos_anexo", 3)))
    tempos_frame = tk.LabelFrame(win, text="  Tempos do NODRI (segundos)  ", bg="#f4f7fb",
                                 fg="#0f3460", font=(FP, 10, "bold"), padx=12, pady=8)
    tempos_frame.pack(fill="x", padx=16, pady=(4, 4))

    def _campo_tempo(lbl, var, col):
        tk.Label(tempos_frame, text=lbl, bg="#f4f7fb", font=(FP, 9))\
            .grid(row=0, column=col * 2, sticky="e", padx=(10, 4), pady=4)
        tk.Entry(tempos_frame, textvariable=var, width=6)\
            .grid(row=0, column=col * 2 + 1, sticky="w")

    _campo_tempo("Achar botão:", vt_elem, 0)
    _campo_tempo("Após entrar:", vt_login, 1)
    _campo_tempo("Entre passos:", vt_passo, 2)
    _campo_tempo("Após importar:", vt_anexo, 3)
    tk.Label(tempos_frame, text="(“Após importar” = espera depois de clicar em Importar Dados, antes de fechar. Ex: 120 = 2 min)",
             bg="#f4f7fb", fg="#6b7280", font=(FP, 8)).grid(row=1, column=0, columnspan=8, sticky="w", padx=10, pady=(4, 0))

    # ── Rodapé: salvar + ligar/desligar agendamento ──────────────────────
    def coletar_agendamento():
        ag["modo"] = modo_var.get()
        ag["ciclo"] = {"intervalo_min": int(v_int.get() or 5),
                       "janela_inicio": _normalizar_hora(v_ini.get().strip() or "07:00", "07:00"),
                       "janela_fim": _normalizar_hora(v_fim.get().strip() or "22:00", "22:00")}
        ag["nodri_tempos"] = {
            "timeout_elemento": int(vt_elem.get() or 25),
            "apos_login": int(vt_login.get() or 6),
            "entre_passos": float(vt_passo.get() or 2),
            "apos_anexo": int(vt_anexo.get() or 3),
        }
        cfg["agendamento"] = ag
        salvar_saloes_cfg(cfg)

    def salvar_tudo():
        try:
            coletar_agendamento()
            messagebox.showinfo("Salvo", "Configuração salva.", parent=win)
        except Exception as e:
            messagebox.showerror("Erro", str(e), parent=win)

    def ativar_agendamento():
        coletar_agendamento()
        if not saloes_ativos(cfg):
            messagebox.showwarning("Atenção", "Cadastre ao menos um salão ativo.", parent=win); return
        def tarefa():
            ok = atualizar_agendador_windows(cfg)
            win.after(0, lambda: messagebox.showinfo(
                "Agendamento",
                "Agendamento ativado no Windows!\nO programa vai abrir sozinho no horário."
                if ok else "Não consegui registrar no Windows. Veja o log.", parent=win))
        threading.Thread(target=tarefa, daemon=True).start()

    def desativar_agendamento():
        if messagebox.askyesno("Desativar", "Desligar o agendamento automático?", parent=win):
            remover_tarefas_windows()
            messagebox.showinfo("Agendamento", "Agendamento desligado.", parent=win)

    rod = tk.Frame(win, bg="#f4f7fb"); rod.pack(fill="x", padx=16, pady=(6, 14))
    tk.Button(rod, text="💾  Salvar configuração", command=salvar_tudo, bg="#0f3460",
              fg="white", font=(FP, 10, "bold"), relief="flat", cursor="hand2",
              padx=14, pady=8).pack(side="left")
    tk.Button(rod, text="⏰  Ativar agendamento no Windows", command=ativar_agendamento,
              bg="#28a745", fg="white", font=(FP, 10, "bold"), relief="flat",
              cursor="hand2", padx=14, pady=8).pack(side="left", padx=8)
    tk.Button(rod, text="⏸  Desativar", command=desativar_agendamento, bg="#a03030",
              fg="white", font=(FP, 10, "bold"), relief="flat", cursor="hand2",
              padx=14, pady=8).pack(side="left")

    atualizar_lista()


def _rodar_modo_automatico(argv) -> bool:
    """Modo automático (chamado pelo Agendador do Windows). Roda sem abrir a tela
    e encerra ao terminar. Retorna True se tratou algum comando --auto-*."""
    if "--auto-ciclo" in argv:
        _log_auto("===== Início: modo CICLO (Agendador) =====")
        rodar_ciclo()
        _log_auto("===== Fim: modo CICLO =====")
        return True
    if "--auto-todos" in argv:
        _log_auto("===== Início: TODOS os salões (Agendador) =====")
        rodar_todos()
        _log_auto("===== Fim: TODOS =====")
        return True
    if "--auto-salao" in argv:
        try:
            salao_id = argv[argv.index("--auto-salao") + 1]
        except Exception:
            salao_id = ""
        _log_auto(f"===== Início: salão {salao_id} (Agendador) =====")
        rodar_um_salao(salao_id)
        _log_auto(f"===== Fim: salão {salao_id} =====")
        return True
    return False


def main():
    """Função principal — com licença e wizard de primeiro acesso."""
    # Trabalha a partir do AppData (pasta gravável). Sem isso, quando o Agendador
    # do Windows abre o programa, a pasta atual é system32 e qualquer arquivo de
    # caminho relativo (backups etc.) daria "permissão negada".
    try:
        os.chdir(_PASTA_APPDATA_NODRI)
    except Exception:
        pass
    # Modo automático (Agendador do Windows): roda sem tela e sai.
    try:
        if _rodar_modo_automatico(sys.argv[1:]):
            return
    except Exception as e:
        try:
            _log_auto(f"❌ Erro no modo automático: {e}")
        except Exception:
            pass
        return

    try:
        root = tk.Tk()
        root.withdraw()   # esconde a janela principal até tudo ser configurado

        # ── 1. Wizard de primeiro acesso (URL do salão) ──────────────────────
        configurado = tela_primeiro_acesso(root)
        if not configurado:
            root.destroy()
            return

        # ── 2. Aplica URL do salão salva na config ───────────────────────────
        cfg_global = _carregar_config_global()
        url_salao  = cfg_global.get('url_salao', '')

        # ── 3. Abre interface principal ──────────────────────────────────────
        root.deiconify()
        root.minsize(980, 580)  # permite notebooks pequenos; rodapé de ações fica sempre visível
        try:
            root.state('')
        except Exception:
            pass

        app = InterfaceGraficaNodri(root)

        # Config remota do painel NODRI (aplica em memória; offline usa cache)
        try:
            aplicar_config_remota_async(app.sistema_coleta)
        except Exception:
            pass

        # Acesso discreto de SUPORTE (canto inferior esquerdo): liga/desliga a tela de bloqueio.
        try:
            _btb = tk.Button(root, text="⚙", font=("Segoe UI", 10), bd=0, relief="flat",
                             cursor="hand2", command=lambda: abrir_config_tela_bloqueio(root))
            _btb.place(relx=0.0, rely=1.0, anchor="sw", x=4, y=-2)
        except Exception:
            pass

        # Botão para abrir o cadastro de salões e o agendamento automático
        try:
            _bts = tk.Button(root, text="🏢  Salões e Agendamento", font=("Segoe UI", 9, "bold"),
                             bg="#0f3460", fg="white", bd=0, relief="flat", cursor="hand2",
                             padx=10, pady=4, command=lambda: abrir_gerenciador_saloes(root))
            _bts.place(relx=1.0, rely=1.0, anchor="se", x=-8, y=-6)
        except Exception:
            pass

        # Injeta URL, email e senha salvos no sistema de coleta
        if url_salao:
            app.sistema_coleta.configuracoes_editaveis['urls']['login'] = url_salao
        if cfg_global.get('email_padrao'):
            app.sistema_coleta.config['email'] = cfg_global['email_padrao']
        if cfg_global.get('senha_padrao'):
            app.sistema_coleta.config['senha'] = cfg_global['senha_padrao']

        root.title(
            f"NODRI v4.0  —  {cfg_global.get('nome_salao', SALAO_NOME_PADRAO)}"
        )

        root.protocol("WM_DELETE_WINDOW", app.fecha_sistema)
        root.mainloop()

    except Exception as e:
        import traceback
        error_msg = f"Erro ao iniciar: {str(e)}\n\n{traceback.format_exc()}"
        try:
            messagebox.showerror("Erro Fatal", error_msg)
        except Exception:
            print(error_msg)
            input("Pressione Enter para sair...")


if __name__ == "__main__":
    main()