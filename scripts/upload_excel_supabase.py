"""
Script: upload_excel_supabase.py
Lê o arquivo base_dados_nodri.xlsx e faz upload completo ao Supabase
incluindo PROF_TICKET, PROF_PREFERENCIA, PROF_OCUPACAO, PROF_SERVICOS, PROF_PRODUTOS

Como usar:
  py -3 upload_excel_supabase.py --arquivo "F:\base_dados_nodri.xlsx" --url https://www.nodri.com.br --token SEU_TOKEN
"""

import sys
import json
import math
import argparse
import requests
from collections import defaultdict

def instalar_pandas():
    import subprocess
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'pandas', 'openpyxl', '--quiet'])

try:
    import pandas as pd
except ImportError:
    print("Instalando pandas...")
    instalar_pandas()
    import pandas as pd

def safe_val(v):
    """Converte NaN/inf para None"""
    if v is None:
        return None
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v

def ler_excel(arquivo):
    print(f"Lendo {arquivo}...")
    xl = pd.ExcelFile(arquivo)
    sheets = {}
    for aba in xl.sheet_names:
        try:
            df = xl.parse(aba)
            # Limpar NaN
            df = df.where(pd.notnull(df), None)
            sheets[aba] = df
        except Exception as e:
            print(f"  Aviso: erro ao ler aba {aba}: {e}")
    print(f"  {len(sheets)} abas lidas")
    return sheets

def agrupar_por_periodo(df, colunas_dados, col_prof='profissional'):
    """Agrupa linhas por (ano, mes) e retorna dict {(ano,mes): [lista_de_items]}"""
    resultado = defaultdict(list)
    for _, row in df.iterrows():
        ano = safe_val(row.get('ano'))
        mes = safe_val(row.get('mes'))
        if not ano or not mes:
            continue
        item = {}
        if col_prof and col_prof in row:
            item[col_prof] = safe_val(row.get(col_prof)) or ''
        for col in colunas_dados:
            if col in row:
                item[col] = safe_val(row.get(col))
        resultado[(int(ano), int(mes))].append(item)
    return resultado

def montar_periodos(sheets):
    """Monta a estrutura de períodos com todos os dados dos profissionais"""
    periodos_df = sheets.get('PERIODOS', pd.DataFrame())
    pagamentos_df = sheets.get('PROF_PAGAMENTOS', pd.DataFrame())
    ticket_df = sheets.get('PROF_TICKET', pd.DataFrame())
    pref_df = sheets.get('PROF_PREFERENCIA', pd.DataFrame())
    ocup_df = sheets.get('PROF_OCUPACAO', pd.DataFrame())
    serv_df = sheets.get('PROF_SERVICOS', pd.DataFrame())
    prod_df = sheets.get('PROF_PRODUTOS', pd.DataFrame())
    resumo_df = sheets.get('RESUMO_MENSAL', pd.DataFrame())

    # Agrupar cada aba por período
    pag_por_periodo  = agrupar_por_periodo(pagamentos_df, ['categoria','valor_a_pagar','desconto'])
    tick_por_periodo = agrupar_por_periodo(ticket_df, ['ticket_medio'])
    pref_por_periodo = agrupar_por_periodo(pref_df, ['clientes_preferencia','clientes_sem_preferencia'])
    ocup_por_periodo = agrupar_por_periodo(ocup_df, ['dias_trabalhados','taxa_ocupacao'])
    serv_por_periodo = agrupar_por_periodo(serv_df, ['servico','quantidade','valor'])
    prod_por_periodo = agrupar_por_periodo(prod_df, ['quantidade'])

    resumo_por_periodo = {}
    for _, row in resumo_df.iterrows():
        ano = safe_val(row.get('ano'))
        mes = safe_val(row.get('mes'))
        if ano and mes:
            resumo_por_periodo[(int(ano), int(mes))] = {
                k: safe_val(v) for k, v in row.items() if k not in ('ano','mes')
            }

    periodos = []
    for _, row in periodos_df.iterrows():
        ano = safe_val(row.get('ano'))
        mes = safe_val(row.get('mes'))
        if not ano or not mes:
            continue
        chave = (int(ano), int(mes))
        periodos.append({
            'ano': int(ano),
            'mes': int(mes),
            'data_inicio': str(row.get('data_inicio','') or ''),
            'data_fim': str(row.get('data_fim','') or ''),
            'resumo_mensal': [resumo_por_periodo[chave]] if chave in resumo_por_periodo else [],
            'prof_pagamentos':  pag_por_periodo.get(chave, []),
            'prof_ticket':      tick_por_periodo.get(chave, []),
            'prof_preferencia': pref_por_periodo.get(chave, []),
            'prof_ocupacao':    ocup_por_periodo.get(chave, []),
            'prof_servicos':    serv_por_periodo.get(chave, []),
            'prof_produtos':    prod_por_periodo.get(chave, []),
            'faturamento_diario': [],
            'servicos': [],
            'produtos': [],
            'metas': [],
        })

    return periodos

def montar_feedbacks(sheets):
    df = sheets.get('FEEDBACK', pd.DataFrame())
    feedbacks = []
    for _, row in df.iterrows():
        feedbacks.append({
            'ano': safe_val(row.get('ano')),
            'mes': safe_val(row.get('mes')),
            'profissional': str(safe_val(row.get('profissional')) or ''),
            'tipo': str(safe_val(row.get('tipo')) or ''),
            'oque_houve': str(safe_val(row.get('oque_houve')) or ''),
            'comentario': str(safe_val(row.get('comentario')) or ''),
            'data': str(safe_val(row.get('data')) or ''),
        })
    return feedbacks

def upload_em_lotes(url_base, token, periodos, feedbacks, tamanho_lote=6):
    headers = {'Content-Type': 'application/json', 'Cookie': f'nodri_token={token}'}
    url = f"{url_base.rstrip('/')}/api/relatorios/importar"
    total = len(periodos)
    erros = []

    print(f"\nUpload de {total} períodos em lotes de {tamanho_lote}...")

    for i in range(0, total, tamanho_lote):
        lote = periodos[i:i+tamanho_lote]
        anos_meses = [(p['ano'], p['mes']) for p in lote]
        print(f"  Enviando {anos_meses}...", end=' ')

        payload = {
            'periodos_dados': lote,
            'feedbacks': feedbacks if i == 0 else []  # feedbacks só no primeiro lote
        }

        try:
            res = requests.post(url, json=payload, headers=headers, timeout=60)
            if res.ok:
                print(f"✅ OK ({res.status_code})")
            else:
                print(f"❌ Erro {res.status_code}: {res.text[:200]}")
                erros.append(f"Lote {i}: {res.text[:100]}")
        except Exception as e:
            print(f"❌ Exceção: {e}")
            erros.append(str(e))

    if erros:
        print(f"\n⚠ {len(erros)} erros:")
        for e in erros:
            print(f"  - {e}")
    else:
        print(f"\n✅ Upload completo! {total} períodos enviados.")

def main():
    parser = argparse.ArgumentParser(description='Upload Excel → Supabase (nodri)')
    parser.add_argument('--arquivo', default='F:\\base_dados_nodri.xlsx', help='Caminho do Excel')
    parser.add_argument('--url', default='https://www.nodri.com.br', help='URL do sistema')
    parser.add_argument('--token', required=True, help='Token JWT do cookie nodri_token')
    parser.add_argument('--lote', type=int, default=6, help='Períodos por lote (padrão 6)')
    args = parser.parse_args()

    sheets = ler_excel(args.arquivo)

    print("Montando períodos...")
    periodos = montar_periodos(sheets)
    print(f"  {len(periodos)} períodos encontrados")

    print("Montando feedbacks...")
    feedbacks = montar_feedbacks(sheets)
    print(f"  {len(feedbacks)} feedbacks encontrados")

    upload_em_lotes(args.url, args.token, periodos, feedbacks, args.lote)

if __name__ == '__main__':
    main()
