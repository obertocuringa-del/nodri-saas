# NODRI — Feedback Avec (extensão do Chrome)

Lê o relatório **0051 – Clientes com agendamentos** do Avec de tempos em tempos
e entrega ao NODRI quem está com a comanda **paga/finalizada hoje**. O NODRI
enfileira o pedido de feedback e a ponte do CRM manda pelo WhatsApp — **uma
mensagem por celular por dia**.

## Instalar (uma vez, no Chrome da recepção)

1. `chrome://extensions` → ligue **Modo do desenvolvedor** (canto direito).
2. **Carregar sem compactação** → escolha esta pasta (`extensao-feedback-avec`).
3. Clique no ícone da extensão (ou em **Detalhes › Opções**) e preencha:
   - **Chave da extensão**: copie em NODRI › CRM › Configurar › *Automação de feedback*.
   - **E-mail e senha do Avec**: usados só se o Avec deslogar. Ficam neste
     computador, dentro do Chrome. Não vão para o NODRI.
4. **Salvar**. Depois, **Rodar um ciclo agora** para conferir: a caixa de
   saúde mostra quantas linhas leu.
5. No NODRI, ligue a automação no botão **Desligada — clique para ligar**.

## O que ela faz a cada volta

- Pergunta ao NODRI: está ligada? de quanto em quanto? que endereço? que dia é hoje?
- Usa **sempre a mesma aba** do Avec, aberta em segundo plano (não rouba o foco).
  Se alguém fechar, abre outra na volta seguinte.
- Se cair na tela de login, entra com o e-mail/senha das opções e volta ao relatório.
- Põe a data de hoje em Data Início / Data Fim, clica em Buscar, mostra 500 por
  página e lê a tabela.
- Manda as linhas ao NODRI. O NODRI filtra Status (Pago/Finalizado, configurável),
  tira repetidos por celular e enfileira as duas mensagens.

## Se parar

- NODRI › CRM › Configurar › Automação de feedback mostra **Extensão vista há X**.
  Mais de 5 minutos = o Chrome está fechado, o PC dormiu ou a extensão foi
  desativada.
- **Erro** na mesma caixa diz o motivo (login recusado, tela mudou, relatório
  incompleto). A mensagem nunca é mandada "no escuro": sem leitura, sem envio.
- A extensão **não se atualiza sozinha**: para pegar uma versão nova, baixe a
  pasta de novo e clique em recarregar em `chrome://extensions`.
