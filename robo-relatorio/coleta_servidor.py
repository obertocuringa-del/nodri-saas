# -*- coding: utf-8 -*-
"""
Uma coleta de UM salão no servidor (28/09/2026).

Usa o PRÓPRIO código do robô do Windows (relatorio_original_windows.py) --
mesmos relatórios, mesmos tempos, mesmos XPaths, mesmo Excel. Só três coisas
mudam, e é tudo aqui:
  1. em vez de abrir um Chrome novo, conecta no Chrome do salão que o
     robo-avec já mantém aberto (porta em perfis/<id>/porta), numa ABA
     PRÓPRIA "Relatório", que não fecha e é reaproveitada na próxima vez;
  2. só faz login no Avec se a sessão caiu (a extensão mantém logado);
  3. no fim não fecha o Chrome nem entra no NODRI pela tela: devolve o Excel
     para o agendador entregar ao NODRI (que confere antes de aplicar).

É chamado pelo agendador.py com HOME apontando para a pasta do salão, para o
Excel e as configurações do robô ficarem separados por salão.

Entrada (variáveis de ambiente): SALAO_ID, PORTA, AVEC_URL, AVEC_EMAIL, AVEC_SENHA
Saída: imprime uma linha JSON {"ok":..., "arquivo":..., "erro":...}
"""
import json
import os
import sys
import time

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)

SALAO = os.environ["SALAO_ID"]
PORTA = int(os.environ["PORTA"])
AVEC_URL = os.environ.get("AVEC_URL", "").strip()
PERFIS = os.environ.get("ROBO_PERFIS", "/home/nodri/robo/perfis")
CHROMEDRIVER = os.environ.get("CHROMEDRIVER", "/home/nodri/robo/chromedriver-linux64/chromedriver")

# Os MESMOS tempos/XPaths que o dono ajustou no robô do Windows (config_padrao.json,
# tirado do config_nodri.json dele, SEM e-mail/senha). Precisa existir antes do
# import, porque o robô lê a configuração ao criar o coletor.
_CFG = os.path.join(os.path.expanduser("~"), "NodriSistema", "config_nodri.json")
if not os.path.exists(_CFG):
    os.makedirs(os.path.dirname(_CFG), exist_ok=True)
    import shutil
    shutil.copy(os.path.join(AQUI, "config_padrao.json"), _CFG)

# ── O "Enter" do robô ─────────────────────────────────────────────────────────
# No Windows o robô aperta Enter no TECLADO (pyautogui) entre os dois cliques em
# "Buscar" -- é o que fecha o aviso do Avec. No servidor não há teclado: este
# módulo faz o MESMO Enter pelo Chrome (aceita o aviso aberto; sem aviso, Enter
# na página). O código do robô continua chamando pyautogui.press('enter').
import types as _types
_DRIVER = {"d": None}


def _press(tecla, *a, **k):
    from selenium.webdriver.common.keys import Keys as _K
    from selenium.webdriver.common.action_chains import ActionChains as _AC
    d = _DRIVER["d"]
    if d is None or str(tecla).lower() not in ("enter", "return"):
        return
    try:
        d.switch_to.alert.accept()
        return
    except Exception:
        pass
    try:
        _AC(d).send_keys(_K.ENTER).perform()
    except Exception:
        pass


sys.modules["pyautogui"] = _types.SimpleNamespace(press=_press, hotkey=lambda *a, **k: None, FAILSAFE=False)

import relatorio_original_windows as R           # noqa: E402  (o robô de verdade)
from selenium import webdriver                    # noqa: E402
from selenium.webdriver.chrome.options import Options  # noqa: E402
from selenium.webdriver.chrome.service import Service  # noqa: E402
from selenium.webdriver.common.by import By      # noqa: E402

ARQ_ABA = os.path.join(PERFIS, SALAO, "aba_relatorio")


class ColetaNoServidor(R.SistemaColetaNodri):
    """O coletor do robô, conectado ao Chrome do salão em vez de abrir outro."""

    def iniciar_driver(self):
        opts = Options()
        opts.add_experimental_option("debuggerAddress", f"127.0.0.1:{PORTA}")
        self.driver = webdriver.Chrome(service=Service(CHROMEDRIVER), options=opts)
        self.driver.set_page_load_timeout(60)
        _DRIVER["d"] = self.driver
        # A aba "Relatório": a mesma de sempre, ou uma nova se sumiu.
        guardada = open(ARQ_ABA).read().strip() if os.path.exists(ARQ_ABA) else ""
        if guardada and guardada in self.driver.window_handles:
            self.driver.switch_to.window(guardada)
        else:
            self.driver.switch_to.new_window("tab")
            with open(ARQ_ABA, "w") as f:
                f.write(self.driver.current_window_handle)
        # Downloads desta aba vão para a pasta do salão (HOME/Downloads).
        os.makedirs(self.download_dir, exist_ok=True)
        try:
            self.driver.execute_cdp_cmd("Browser.setDownloadBehavior",
                                        {"behavior": "allow", "downloadPath": self.download_dir})
        except Exception:
            self.driver.execute_cdp_cmd("Page.setDownloadBehavior",
                                        {"behavior": "allow", "downloadPath": self.download_dir})
        return None

    def coletar_comandas_finalizadas(self, data_inicio, data_fim):
        """A tela de comandas do Avec exporta no máximo 500 linhas (no Windows
        também: 18/09 "a tela diz 593 e o arquivo trouxe 500"). Aqui o período
        é baixado EM PARTES pela MESMA rotina do robô: semana a semana, e a
        parte que vier incompleta é dividida ao meio até caber. A trava
        continua: se alguma parte não fechar, nada é enviado."""
        from datetime import datetime as _dt, timedelta as _td
        ini = _dt.strptime(data_inicio, "%d/%m/%Y")
        fim = _dt.strptime(data_fim, "%d/%m/%Y")
        hoje = _dt.now()
        if fim > hoje:
            fim = hoje.replace(hour=0, minute=0, second=0, microsecond=0)
        sup = super(ColetaNoServidor, self).coletar_comandas_finalizadas
        todas = []

        def parte(a, b):
            linhas = sup(a.strftime("%d/%m/%Y"), b.strftime("%d/%m/%Y"))
            esperados = self._registros_da_listagem()
            if not esperados or len(linhas) >= esperados:
                return linhas
            if a >= b:
                raise RuntimeError(f"comandas de {a:%d/%m} não fecharam ({len(linhas)} de {esperados})")
            meio = a + (b - a) / 2
            meio = meio.replace(hour=0, minute=0, second=0, microsecond=0)
            return parte(a, meio) + parte(meio + _td(days=1), b)

        try:
            a = ini
            while a <= fim:
                b = min(a + _td(days=6), fim)
                todas += parte(a, b)
                a = b + _td(days=1)
        except Exception as e:
            R.logging.error(f"Comandas em partes: {e}. Nada foi enviado.")
            return []
        R.logging.info(f"Comandas em partes: {len(todas)} comandas no total")
        return todas

    def fechar_driver(self):
        """NÃO fecha o Chrome nem a aba (pedido do dono): só solta a conexão."""
        if self.driver:
            try:
                self.driver.service.stop()
            except Exception:
                pass
            self.driver = None


# ── Vigia de cada relatório (pedido do dono, 28/09) ───────────────────────────
# Depois de CADA relatório baixado, compara o total que a tela do Avec mostra
# ("Mostrando 1 a N de M Registros") com as linhas do arquivo que chegou. Faltou
# linha -> anota; no fim a coleta vai para "Aguardando aprovação" no painel.
ALERTAS = []
# O robô lê estes direto da tela (não baixa arquivo): 28/09, o vigia acusava
# "arquivo trouxe 0" no 0083 (faturamento) e no 0017 (clientes novos).
LIDOS_DA_TELA = {"0083", "0017"}


def _linhas_do_arquivo(caminho):
    try:
        import pandas as pd
        if caminho.lower().endswith((".xlsx", ".xls")):
            return len(pd.read_excel(caminho, header=None).dropna(how="all"))
        return len(pd.read_csv(caminho, header=None, sep=None, engine="python").dropna(how="all"))
    except Exception:
        return None


def _vigiar(nome_metodo, codigo):
    original = getattr(R.SistemaColetaNodri, nome_metodo)

    def embrulho(self, *a, **k):
        """Baixa; confere com a tela; faltou linha -> baixa SÓ este relatório de
        novo (até 3 tentativas, com pausa). Só vira alerta se não bater nunca."""
        pasta = self.configuracoes_editaveis["caminhos"]["pasta_relatorios"]
        resultado, ultimo = None, ""
        for tentativa in (1, 2, 3):
            antes = set(os.listdir(pasta)) if os.path.isdir(pasta) else set()
            resultado = original(self, *a, **k)
            try:
                esperados = self._registros_da_listagem()
                novos = [os.path.join(pasta, f) for f in (set(os.listdir(pasta)) - antes)] if os.path.isdir(pasta) else []
                if not esperados or codigo in LIDOS_DA_TELA:
                    return resultado            # resumo, ou valor lido direto da tela: sem arquivo p/ conferir
                linhas = max((_linhas_do_arquivo(f) or 0) for f in novos) if novos else 0
                # o arquivo tem cabeçalho/total a mais; faltar é que é problema
                if linhas >= esperados:
                    R.logging.info(f"VIGIA {codigo}: ok na tentativa {tentativa} ({linhas} linhas, tela {esperados})")
                    return resultado
                ultimo = f"{codigo}: a tela do Avec diz {esperados} registros e o arquivo trouxe {linhas}"
                R.logging.warning(f"VIGIA {ultimo} -- tentativa {tentativa} de 3")
            except Exception as e:
                R.logging.warning(f"VIGIA {codigo}: não consegui conferir ({e})")
                return resultado
            time.sleep(20 * tentativa)
        ALERTAS.append(ultimo + " (mesmo depois de baixar 3 vezes).")
        return resultado
    setattr(R.SistemaColetaNodri, nome_metodo, embrulho)


for _nome in [n for n in dir(R.SistemaColetaNodri) if n.startswith("coletar_relatorio_")]:
    _vigiar(_nome, _nome.rsplit("_", 1)[-1])


def esta_no_login(driver) -> bool:
    """Campo de senha VISÍVEL = tela de login (mesma regra da extensão)."""
    try:
        return any(e.is_displayed() for e in driver.find_elements(By.CSS_SELECTOR, "input[type='password']"))
    except Exception:
        return False


def garantir_login(coleta) -> bool:
    """Entra no Avec só se precisar. Se já está logado (a extensão mantém), segue."""
    d = coleta.driver
    d.get("https://admin.avec.beauty/admin/relatorio/0051")
    time.sleep(6)
    fora = not d.current_url.startswith("https://admin.avec.beauty/")
    if not fora and not esta_no_login(d):
        return True
    # Caiu. Primeiro ESPERA a extensão relogar (ela confere a cada minuto, no
    # mesmo Chrome) -- pedido do dono, 28/09: os dois nunca logam juntos.
    for _ in range(6):
        time.sleep(20)
        d.get("https://admin.avec.beauty/admin/relatorio/0051")
        time.sleep(6)
        if d.current_url.startswith("https://admin.avec.beauty/") and not esta_no_login(d):
            return True
    # A extensão não resolveu em ~2,5 min: login com o cadastro do CRM, com a
    # paciência do robô original (e mais uma tentativa, como a extensão faz).
    for tentativa in (1, 2):
        if AVEC_URL:
            coleta.configuracoes_editaveis["urls"]["login"] = AVEC_URL
        coleta.fazer_login(os.environ.get("AVEC_EMAIL", ""), os.environ.get("AVEC_SENHA", ""))
        d.get("https://admin.avec.beauty/admin/relatorio/0051")
        time.sleep(8)
        if d.current_url.startswith("https://admin.avec.beauty/") and not esta_no_login(d):
            return True
        time.sleep(10 * tentativa)
    return False


def main():
    coleta = None
    try:
        base = R.BaseDadosNodri()          # base nova: só o mês atual
        coleta = ColetaNoServidor()
        coleta.set_base_dados(base)
        coleta.iniciar_driver()
        if not garantir_login(coleta):
            print(json.dumps({"ok": False, "erro": "Não consegui entrar no Avec (login recusado ou tela não saiu)."}))
            return
        ano, mes, di, dfim = R._periodo_mes_atual()
        dados = coleta.coletar_mes_completo(ano, mes, di, dfim)
        if dados:
            base.substituir_mes(ano, mes, dados)
        base.salvar()
        arq = base.arquivo if os.path.exists(base.arquivo) else R.ultimo_excel_downloads()
        if not arq or not os.path.exists(arq):
            print(json.dumps({"ok": False, "erro": "O Excel não foi gerado."}))
            return
        print(json.dumps({"ok": True, "arquivo": os.path.abspath(arq), "alertas": ALERTAS}))
    except Exception as e:
        print(json.dumps({"ok": False, "erro": f"{type(e).__name__}: {e}"[:800]}))
    finally:
        if coleta is not None:
            coleta.fechar_driver()


if __name__ == "__main__":
    main()
