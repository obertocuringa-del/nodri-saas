# NODRI — Conferência de Caixa

Extensão do Chrome que lê o **histórico de caixa do Avec** e entrega ao NODRI o
que só aquela tela sabe: quem fechou cada comanda, quanto entrou por ela e em
que forma de pagamento.

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

1. No Avec, abra **Financeiro › Caixa › Histórico** no dia que você quer conferir
2. No NODRI, abra a conferência daquele mesmo dia
3. Clique em **Buscar caixas no Avec**

O botão só aparece se a extensão estiver instalada.

## O que ela faz e o que ela não faz

**Faz:** lê a tabela que já está na tela e manda para o NODRI.

**Não faz:** não navega sozinha, não muda filtro, não muda data, não clica em
nada dentro do Avec, não grava nada no Avec. Se a tela aberta não for a do
caixa, ela **avisa e para** — em vez de sair clicando para achar.

## Quando não der certo

Ela nunca inventa dado. Se não reconhecer a tela, a mensagem diz o que ela
encontrou (os títulos das colunas que viu). Me manda essa mensagem: com ela o
ajuste sai numa rodada, sem chute.

Três mensagens possíveis:

| Mensagem | O que fazer |
|---|---|
| "O Avec não está aberto" | Abrir o histórico de caixa numa aba |
| "nenhuma está na tela de caixa" | Ir para Financeiro › Caixa › Histórico |
| "nenhuma tabela tinha as colunas de comanda e valor" | Me mandar a lista de colunas que aparece junto |

## Se a extensão não estiver instalada

A conferência continua funcionando. O que ela não puder conferir vai para a
gaveta **NÃO CONFERIDO**, dizendo que o dado do caixa não chegou — nunca
aparecendo como se estivesse conferido.
