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

1. No Avec, abra **Financeiro › Comandas Finalizadas**, com o período incluindo
   o dia que você quer conferir (o filtro de data é o da própria tela)
2. No NODRI, abra a conferência daquele mesmo dia
3. Clique em **Buscar caixas no Avec**

O botão só aparece se a extensão estiver instalada.

## O que ela faz e o que ela não faz

**Faz:** lê a tabela que já está na tela e manda para o NODRI. Só fica com as
comandas do dia que você está conferindo; as dos outros dias do período são
descartadas.

**A única coisa que mexe na tela:** o seletor de *quantos por página*. A lista
mostra 10 de cada vez e o dia pode ter mais — ler só a primeira página traria
um caixa pela metade, que é pior que não ler. Ela põe no máximo, lê, e
**devolve ao valor anterior**.

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
| "O Avec não está aberto" | Abrir Financeiro › Comandas Finalizadas numa aba |
| "nenhuma está na tela certa" | Ir para Financeiro › Comandas Finalizadas |
| "nenhuma é de \<data\>" | Ampliar o período da tela para incluir o dia |
| "nenhuma tabela tem as colunas de comanda e valor" | Me mandar a lista de colunas que aparece junto |

## Se a extensão não estiver instalada

A conferência continua funcionando. O que ela não puder conferir vai para a
gaveta **NÃO CONFERIDO**, dizendo que o dado do caixa não chegou — nunca
aparecendo como se estivesse conferido.
