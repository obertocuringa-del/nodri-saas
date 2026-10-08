# NODRI — XML das Notas Fiscais

Baixa, num único `.zip`, os XMLs de todas as notas fiscais emitidas no Avec
num período. Quem manda é a tela **Financeiro → XML DAS NOTAS FISCAIS** do
NODRI; esta extensão é o braço que mexe no Avec.

## Instalar

1. Descompacte esta pasta num lugar que não vá ser apagado.
2. Abra `chrome://extensions`.
3. Ligue o **Modo do desenvolvedor** (canto superior direito).
4. **Carregar sem compactação** e aponte para a pasta descompactada.

A extensão **não se atualiza sozinha**: a cada versão nova é preciso baixar o
zip de novo e clicar em recarregar em `chrome://extensions`. A tela do NODRI
mostra a versão que está instalada.

## Como funciona

A tela do NODRI monta o pedido (tipo de nota, período, pausa) e manda pela
janela. A extensão:

1. Acha a aba do Avec na tela de Notas Fiscais — ou abre uma.
2. Preenche **Data Início** e **Data Fim**, marca **Emissão**, põe o status em
   **Emitidas** e o tipo de nota escolhido.
3. Clica em **Buscar** e espera o "processando" do Avec apagar.
4. Põe **500 por página** — depois de buscar, nunca antes: o Avec devolve o
   seletor para 10 a cada busca.
5. Lê a tabela e, para cada linha, **busca** o XML.
6. Monta o `.zip` e entrega.

## Duas decisões que valem explicar

**Buscar em vez de clicar no botão XML.** O link do XML aponta para
`consulta.invoicy.com.br` e abre **na mesma aba** — clicar nele tiraria a
página do ar no meio da fila. Buscando, o conteúdo vem para a mão: dá para
conferir se é mesmo um XML antes de contar como baixado, e não existe corrida
de download para dar errado. É por isso que o `background.js` precisa do
domínio do invoicy em `host_permissions`: um `fetch` feito de dentro da página
do Avec esbarraria no CORS.

**Nada é lido por número de coluna.** As colunas da tabela MUDAM conforme o
status: com "Emitidas" aparecem "Data de Emissão" e "Ação", que não existem em
"Não emitidas". Tudo aqui é achado pelo nome do cabeçalho.

## Se a conta não fechar

A extensão compara o que leu com o que o Avec diz ter ("Mostrando 1 a 57 de
57"). Se o 500 não tiver pegado e a tela mostrar só a primeira página, ela
**para e avisa** em vez de entregar um zip pela metade — nota fiscal que falta
ninguém descobre olhando o arquivo.
