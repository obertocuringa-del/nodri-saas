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

    def fechar_driver(self):
        """NÃO fecha o Chrome nem a aba (pedido do dono): só solta a conexão."""
        if self.driver:
            try:
                self.driver.service.stop()
            except Exception:
                pass
            self.driver = None


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
    # Caiu: login com o cadastro do CRM, com a paciência do robô original
    # (e mais uma tentativa, como a extensão faz).
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
        print(json.dumps({"ok": True, "arquivo": os.path.abspath(arq)}))
    except Exception as e:
        print(json.dumps({"ok": False, "erro": f"{type(e).__name__}: {e}"[:800]}))
    finally:
        if coleta is not None:
            coleta.fechar_driver()


if __name__ == "__main__":
    main()
