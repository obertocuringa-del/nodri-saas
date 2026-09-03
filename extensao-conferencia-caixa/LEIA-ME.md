# NODRI — Conferência de Caixa

Extensão do Chrome que lê a tela **Financeiro › Comandas Finalizadas** do Avec
e entrega ao NODRI o que só aquela tela sabe: quem fechou cada comanda e quanto
entrou por ela.

## Por que ela existe

O relatório que o robô já importa (0031) traz os **itens lançados**: serviço,
valor, profissional, cliente. Ele não traz o caixa nem a forma de pagamento —
conferi, esse dado não existe em relatório numerado nenhum.

Sem isso a conferência só sabe o que foi **lançado**. Com isso ela passa a saber
o que foi **recebido**. A diferença entre as duas é exatamente o que se procura
numa conferência de caixa.

## Instalar

1. Abra `chrome://extensions`
2. Ligue **Modo do desenvolvedor** (canto superior direito)
3. **Carregar sem compactação** → escolha esta pasta

A extensão **não se atualiza sozinha**. Quando eu mandar uma versão nova, é
repetir o passo 3 (ou clicar em recarregar no card dela).

## Usar

1. Deixe uma aba do **Avec logada** (qualquer tela dele serve)
2. No NODRI, abra a conferência do dia que você quer conferir
3. Clique em **Buscar caixas no Avec**

Só isso. A extensão abre sozinha uma aba em segundo plano na tela de Comandas
Finalizadas, põe a data do dia, lê e **fecha a aba**. A tela que você estava
usando não é tocada.

O botão só aparece se a extensão estiver instalada.

## O que ela faz e o que ela não faz

**Faz:** lê a tabela que já está na tela e manda para o NODRI. Só fica com as
comandas do dia que você está conferindo; as dos outros dias do período são
descartadas.

**O que ela mexe:** na aba que ela mesma abriu, preenche os dois campos de
data, clica em *Buscar*, ajusta o *quantos por página* e percorre as páginas.
Depois fecha a aba.

**No que ela nunca encosta:** os botões de cada linha da tabela — editar,
imprimir e **excluir**. É justamente por eles existirem ali que a extensão só
toca em controles nomeados, nunca em algo dentro do corpo da tabela.

No fim, ela **confere se leu tudo**: o número de registros que a listagem diz
ter tem de bater com o que foi lido. Se não bater, ela se recusa a entregar e
pede para você reduzir o período — em vez de mandar um caixa incompleto, onde
as comandas que faltaram apareceriam como dinheiro que não entrou.

Como ela mesma põe o período no dia, a lista costuma caber numa página só e a
leitura é imediata.

## Se o Avec mudar o endereço da tela

O endereço **não está dentro da extensão**. Ele fica no NODRI, em
*Conferência automática › Regras*, no campo **Endereço das Comandas
Finalizadas no Avec**. Mudou lá, vale em todas as máquinas — sem reinstalar
extensão em nenhuma.

**Não faz:** não navega sozinha, não muda o filtro de data, não grava nada no
Avec. Se a tela aberta não for a certa, ela **avisa e para**.

## Por que esta tela, e não o Histórico de Caixas

O Histórico de Caixas mostra responsável, abertura, fechamento e os **totais por
forma de pagamento** — e nenhum número de comanda. Sem comanda não há como
confrontar o que foi lançado com o que entrou, que é a conferência inteira.

Comandas Finalizadas traz tudo numa tabela só: comanda, cliente, caixa
responsável e valor.

O que fica de fora: a **forma de pagamento por comanda**. Ela existe no Avec,
mas só dentro dos quadros que abrem ao clicar em "Cartão Crédito" no Histórico
de Caixas — um quadro por forma, por caixa. Nenhuma regra da conferência
depende dela, então ficou para depois.

## Quando não der certo

Ela nunca inventa dado. Se não reconhecer a tela, a mensagem diz o que ela
encontrou (os títulos das colunas que viu). Me manda essa mensagem: com ela o
ajuste sai numa rodada, sem chute.

As mensagens possíveis:

| Mensagem | O que fazer |
|---|---|
| "O Avec não está aberto" | Deixar uma aba do Avec logada |
| "sua sessão do Avec ainda está ativa?" | Entrar de novo no Avec |
| "nenhuma é de \<data\>" | Conferir o endereço da tela nas Regras |
| "nenhuma tabela tem as colunas de comanda e valor" | Me mandar a lista de colunas que aparece junto |

## Se a extensão não estiver instalada

A conferência continua funcionando. O que ela não puder conferir vai para a
gaveta **NÃO CONFERIDO**, dizendo que o dado do caixa não chegou — nunca
aparecendo como se estivesse conferido.
