import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyJWT } from '@/lib/auth'
import { cookies } from 'next/headers'

const ARTIGOS = [
  // ─── FINANCEIRO ───────────────────────────────────────────────────────────
  {
    categoria: 'financeiro', emoji: '⚖️', ordem: 1,
    titulo: 'Como calcular o ponto de equilíbrio do seu salão',
    resumo: 'Descubra quantos atendimentos você precisa fazer para não ter prejuízo.',
    conteudo: `O ponto de equilíbrio é o número mínimo de atendimentos que seu salão precisa realizar para cobrir todos os custos fixos sem gerar lucro nem prejuízo.

## Fórmula simples

**Ponto de equilíbrio = Custos fixos mensais ÷ Ticket médio**

Exemplo:
• Custos fixos: R$28.000
• Ticket médio: R$140
• Ponto de equilíbrio: 200 atendimentos

Isso significa que seu salão precisa de **200 atendimentos por mês** antes de começar a lucrar.

## O que entra nos custos fixos

• Aluguel
• Salários e pró-labore
• Energia, água, internet
• Contador
• Sistemas e ferramentas
• Outros custos que não mudam com o volume

## Como usar esse número

1. Compare com sua média atual de atendimentos
2. Se estiver abaixo: foco em aumentar ocupação e ticket
3. Se estiver acima: você já está lucrando — meta é maximizar a diferença
4. Revise mensalmente — custos fixos mudam

## Armadilha comum

Salão cheio não significa salão lucrativo. Se o ticket médio for baixo, você pode atender muito e ainda não cobrir os custos. Por isso ticket médio e ponto de equilíbrio andam juntos.

## Ação imediata

Calcule agora: some todos os seus custos fixos do mês e divida pelo seu ticket médio. Esse número é sua meta mínima de atendimentos.`
  },
  {
    categoria: 'financeiro', emoji: '💼', ordem: 2,
    titulo: 'Capital de Giro, Reserva Financeira e Depreciação',
    resumo: 'Três conceitos que a maioria dos gestores confunde — entenda a diferença.',
    conteudo: `Um dos erros mais comuns na gestão de salões é misturar esses três conceitos. Cada um tem uma função diferente e usa um dinheiro diferente.

## Capital de Giro

É o dinheiro que mantém o dia a dia funcionando.

**Para que serve:**
• Pagar comissões no fechamento do mês
• Cobrir contas antes de receber pelo cartão
• Comprar produtos e insumos
• Pagar despesas operacionais

**Onde fica:** conta corrente, disponível a qualquer momento

**Meta:** ter pelo menos 2 meses de custos fixos em capital de giro

**Erro fatal:** usar o capital de giro para pagar dívidas ou fazer reformas

## Reserva Financeira

É o escudo de emergência do negócio.

**Para que serve:**
• Queda brusca de faturamento
• Saída inesperada de profissional estratégico
• Crise econômica, pandemia, imprevistos graves
• Meses fracos (janeiro/fevereiro)

**Onde fica:** aplicação (rendendo), separada do movimento do salão

**Meta:** 3 a 6 meses de custos fixos em reserva

**Regra de ouro:** reserva só se usa em emergência real — não para pagar conta do mês

## Depreciação

É o fundo para repor e modernizar equipamentos.

**Para que serve:**
• Trocar cadeiras quando deteriorarem
• Substituir secadores, lavatórios, aparelhos estéticos
• Reformas planejadas da estrutura

**Como calcular:**
Valor do equipamento ÷ anos de vida útil = valor mensal a reservar

**Exemplo:**
• Cadeira R$3.000, vida útil 5 anos → reservar R$50/mês por cadeira
• Secador R$600, vida útil 2 anos → reservar R$25/mês

**Consequência de ignorar:** equipamento quebra, não tem dinheiro para trocar, salão para ou toma empréstimo

## Resumo visual

| | Capital de Giro | Reserva | Depreciação |
|---|---|---|---|
| Uso | Dia a dia | Emergências | Reposição |
| Acesso | Imediato | Raramente | Planejado |
| Onde | Conta corrente | Aplicação | Aplicação separada |`
  },
  {
    categoria: 'financeiro', emoji: '💰', ordem: 3,
    titulo: 'Como precificar serviços corretamente',
    resumo: 'Precificar olhando só para o concorrente é o caminho para trabalhar no prejuízo.',
    conteudo: `A maioria dos salões precifica errado: olha para o concorrente ou para o que "parece razoável". O resultado é trabalhar muito sem lucro.

## A fórmula correta

**Preço mínimo = Custo do produto + Hora do profissional + Rateio dos fixos + Margem**

### Exemplo: Mechas

• Produto usado: R$80
• Tempo: 3 horas
• Custo/hora da profissional: R$40
• Rateio de custos fixos por hora: R$15
• Total de custo: R$80 + (3 × R$55) = R$245
• Margem de lucro 30%: R$245 × 1,30 = **R$318,50**

Preço mínimo para não ter prejuízo: **R$318,50**

## Como calcular o custo/hora do profissional

1. Pegue o custo total do profissional no mês (salário + encargos ou comissão média)
2. Divida pelas horas trabalhadas no mês
3. Esse é o custo/hora

## Como calcular o rateio dos fixos por hora

1. Some todos os custos fixos do mês
2. Divida pelas horas de atendimento total do salão
3. Esse é o custo fixo por hora de atendimento

## Margem mínima saudável

• Serviços simples (manicure, escova): 25-30%
• Serviços técnicos (coloração, mechas): 30-40%
• Tratamentos e estética: 35-50%

## Sinais de que sua precificação está errada

• Faturamento bom mas pouco sobra no final do mês
• Profissional ganha bem mas o salão não lucra
• Você tem medo de aumentar o preço por achar que vai perder clientes
• O preço do produto subiu mas você não repassou`
  },
  {
    categoria: 'financeiro', emoji: '📊', ordem: 4,
    titulo: 'Reforma Tributária: o que muda para o seu salão em 2026',
    resumo: 'Split Payment começa em 2026. Salão sem contabilidade atualizada vai pagar mais imposto.',
    conteudo: `A Reforma Tributária começa a impactar os salões a partir de 2026 com o Split Payment — e quem não se preparar vai ter surpresas desagradáveis.

## O que é o Split Payment

A partir de 2026, no momento em que o cliente pagar (cartão, Pix), o imposto é automaticamente separado e transferido ao governo antes de o dinheiro chegar à conta do salão.

**O que isso muda na prática:**
• Qualquer erro na classificação fiscal = perda financeira imediata
• Notas fiscais emitidas errado geram inconsistências instantâneas
• Não adianta "resolver depois" — o imposto já foi retido

## O que revisar agora (antes de 2026)

**1. Enquadramento tributário**
• Você está no MEI, Simples Nacional ou Lucro Presumido?
• O enquadramento atual ainda é o mais vantajoso para o seu faturamento?
• Muitos salões crescem e ficam no MEI além do limite — isso gera multa retroativa

**2. Pendências fiscais**
• Declarações atrasadas precisam ser regularizadas agora
• Débitos tributários em aberto geram bloqueios automáticos no Split Payment

**3. Documentação**
• Notas fiscais emitidas corretamente?
• Histórico financeiro disponível para o contador?

## Ação imediata

1. Agende uma reunião com seu contador especializado em beleza
2. Peça revisão completa do enquadramento tributário
3. Regularize pendências antes de dezembro de 2025
4. Entenda como o Split Payment vai afetar seu fluxo de caixa

## Por que isso importa para sua reserva

Com o Split Payment, o dinheiro que chega à sua conta já vem com o imposto retido. Isso muda o fluxo de caixa. Sua reserva e capital de giro precisam ser recalculados considerando essa mudança.`
  },
  {
    categoria: 'financeiro', emoji: '💳', ordem: 5,
    titulo: 'Como estruturar comissionamento que funciona',
    resumo: 'O modelo certo de comissão incentiva produtividade sem destruir a margem.',
    conteudo: `O modelo de comissionamento é uma das decisões mais estratégicas do salão. Errar aqui cria profissionais acomodados ou margem negativa.

## Os principais modelos

### 1. Porcentagem fixa (mais comum)
• 40% a 50% sobre o faturamento do profissional
• Simples, transparente, fácil de calcular
• Problema: não incentiva crescimento — quem produz pouco ou muito recebe a mesma alíquota

### 2. Comissão progressiva (mais estratégico)
• Faturamento até R$5.000: 40%
• De R$5.001 a R$8.000: 43%
• Acima de R$8.000: 47%
• Quanto mais produz, maior a alíquota
• Incentiva o profissional a crescer porque cada real a mais vale mais para ele

### 3. Fixo + variável
• Salário fixo menor + comissão variável sobre produção
• Garante estabilidade para o profissional
• Mantém incentivo para crescer
• Ideal para profissionais novos que ainda estão construindo carteira

## O que não fazer

• Comissão só fixa: profissional não tem incentivo para produzir mais
• Comissão acima de 55%: salão fica sem margem para cobrir custos fixos
• Mudar o modelo sem aviso: gera conflito e perda de confiança

## Como calcular se a comissão é sustentável

**Teste de viabilidade:**
1. Pegue o faturamento de um profissional no mês
2. Calcule a comissão
3. Subtraia os insumos usados (produtos)
4. O que sobra é a contribuição para cobrir os custos fixos
5. Se a contribuição não cobre a parte proporcional dos fixos: comissão está alta demais

## Bônus por resultado

Além da comissão base, criar bônus por:
• Metas de faturamento batidas
• Taxa de fidelização acima de 55%
• Serviços extras vendidos
• Zero ocorrências negativas no mês`
  },

  // ─── MARKETING ────────────────────────────────────────────────────────────
  {
    categoria: 'marketing', emoji: '📣', ordem: 1,
    titulo: '6 estratégias para atrair clientes todos os meses',
    resumo: 'Divulgação de salão vai muito além de post bonito no Instagram.',
    conteudo: `Depender só de um canal para atrair clientes é arriscado. Salões que crescem usam pelo menos 3 dessas estratégias simultaneamente.

## 1. Treinamento da equipe (a mais poderosa)

Boca a boca ainda é a forma mais poderosa de divulgação.

Quando o cliente é bem tratado, ele volta e indica. Quando indica, traz alguém com o mesmo perfil.

**Ação:** investir em atendimento de excelência, processos claros e encantamento — isso se transforma em marketing gratuito.

## 2. Google Meu Negócio

Buscas por salão no Google cresceram mais de 800% nos últimos anos.

**Como usar estrategicamente:**
• Fotos atualizadas do salão e dos serviços
• Solicitar avaliações a cada cliente satisfeito
• Responder TODAS as avaliações (positivas e negativas)
• Manter horários e telefone corretos

**Resultado:** aparecer quando alguém busca "salão perto de mim"

## 3. Fachada que atrai

A fachada é o primeiro anúncio do seu salão.

**Checklist:**
• Iluminação adequada (especialmente à noite)
• Nome visível e limpo
• Vitrine ou entrada que desperta curiosidade
• Organização vista de fora

## 4. Instagram com estratégia

Instagram é o cartão de visita do salão — mas postar por postar não traz cliente.

**O que funciona:**
• Antes e depois (resultado visual)
• Processo do serviço (bastidores)
• Depoimentos reais de clientes
• Stories diários mostrando agenda disponível

## 5. Estrutura física que comunica

O espaço comunica qualidade antes mesmo do atendimento começar.

**Pontos de atenção:**
• Limpeza impecável — sempre
• Organização das bancadas e produtos
• Cheiro agradável
• Música e temperatura adequadas

## 6. Parcerias locais

Buscar comércios e empresas com o mesmo público.

**Exemplos:**
• Academia próxima → cliente que cuida da saúde também cuida da beleza
• Clínica odontológica → mesmo perfil de cuidado pessoal
• Empresa local → desconto corporativo para funcionários

**Como estruturar:** ofereça benefício mútuo — você divulga o parceiro, ele divulga você`
  },
  {
    categoria: 'marketing', emoji: '🔄', ordem: 2,
    titulo: 'Como reativar clientes inativos sem dar desconto',
    resumo: '80 clientes inativos = R$8.000 a R$24.000 de faturamento esperando para ser recuperado.',
    conteudo: `Cliente inativo é o ativo mais subaproveitado do salão. Ele já conhece seu trabalho, já confiou uma vez — custa 5x menos reativar do que conquistar alguém novo.

## A estratégia correta: valor, não desconto

Desconto treina o cliente a esperar por promoção. Valor agregado resolve uma dor real.

### Em vez de:
"Venha com 20% de desconto esta semana"

### Use:
"Sentimos sua falta! Como presente de retorno, sua próxima visita inclui hidratação capilar de cortesia"

## Segmentação por tempo de ausência

### 60 a 90 dias (cliente morno)
• Mensagem personalizada via WhatsApp
• Mencionar o nome e o último serviço feito
• Oferecer bônus de valor (serviço extra, não desconto)
• Tom: "Sentimos sua falta"

**Exemplo:** "Oi [nome]! Faz um tempinho que não te vemos por aqui. Sua [coloração] deve estar precisando de reforço. Que tal agendar? Na sua volta você ganha uma hidratação de presente. 💜"

### 90 a 180 dias (cliente frio)
• Mensagem mais direta com benefício claro
• Oferecer algo de valor real
• Criar leve urgência ("vagas limitadas esta semana")

### Mais de 180 dias (cliente perdido)
• Desconto pontual pode fazer sentido aqui
• Ou bônus significativo
• Mensagem mais pessoal, quase de reativação de relacionamento

## Taxa de conversão esperada

Com mensagens personalizadas e bem escritas:
• 60-90 dias: 25-40% retornam
• 90-180 dias: 15-25% retornam
• +180 dias: 5-15% retornam

## Rotina recomendada

Toda semana, a recepção verifica clientes que completam 60 dias sem visita e envia mensagem. Isso deve ser parte da rotina — não uma ação emergencial quando o mês está fraco.`
  },
  {
    categoria: 'marketing', emoji: '📅', ordem: 3,
    titulo: 'Cronograma de postagens: como parar de postar por postar',
    resumo: 'Stories são sua bancada de vendas. Use com intenção, não no improviso.',
    conteudo: `A diferença entre o salão que atrai clientes pelo Instagram e o que "está lá mas não funciona" é uma só: intenção estratégica nas postagens.

## O princípio fundamental

Stories são a bancada de vendas do salão.

É ali que o cliente:
• Vê o serviço
• Entende o valor
• Cria conexão
• Decide agendar

Por isso, expor o que o salão tem a oferecer todos os dias, de forma intencional, é obrigatório.

## Por que você precisa de um cronograma

Sem cronograma:
• "Não sei o que postar hoje" → não posta
• Post aleatório sem estratégia → não engaja
• Semanas sem conteúdo → seguidores esquecem

Com cronograma:
• Sabe exatamente o que postar cada dia
• Mantém consistência sem esforço mental
• Cada post tem uma função clara

## Estrutura semanal sugerida

**Segunda:** Resultado da semana (antes e depois)
**Terça:** Processo de serviço (vídeo de atendimento)
**Quarta:** Dica técnica ou cuidado em casa
**Quinta:** Depoimento ou avaliação de cliente
**Sexta:** Serviços disponíveis no fim de semana
**Sábado:** Bastidores do movimento do salão
**Domingo:** Motivação ou bastidores de rotina

## O que nunca pode faltar

• **Horários disponíveis:** postar toda vez que tiver vaga
• **Resultado:** antes e depois é o conteúdo que mais converte
• **Depoimento real:** prova social que nenhum anúncio pago substitui
• **CTA:** todo post deve convidar para ação ("agende pelo link", "chama no direct")

## Constância > Perfeição

Um post simples todo dia supera um post perfeito uma vez por semana. O algoritmo e os clientes recompensam consistência.`
  },
  {
    categoria: 'marketing', emoji: '💡', ordem: 4,
    titulo: 'Os 4 focos de todo marketing que dá resultado',
    resumo: 'Antes de pensar em post ou promoção, você precisa saber exatamente onde quer chegar.',
    conteudo: `Marketing sem objetivo é desperdício de tempo e dinheiro. Todo marketing eficiente parte de um dos 4 focos abaixo.

## Foco 1: Aumentar o Ticket Médio

Fazer o cliente comprar mais na mesma visita.

**Ações:**
• Venda consultiva durante o atendimento
• Upsell (serviço melhor que o planejado)
• Cross-sell (serviço complementar)
• Venda de produto para casa
• Combos com valor percebido maior

**Meta clara:** aumentar o ticket médio em R$X por cliente

## Foco 2: Atrair Novos Clientes

Expandir a base e conquistar quem ainda não conhece o salão.

**Ações:**
• Google Meu Negócio ativo
• Indicação estruturada (cliente que indica ganha bônus)
• Parcerias locais
• Tráfego pago (Instagram Ads, Google Ads)

**Meta clara:** atrair X novos clientes por mês

## Foco 3: Fidelizar os Atuais

Fazer o cliente voltar com frequência e criar vínculo.

**Ações:**
• Programa de retorno (agendar na saída)
• Mensagem de aniversário
• Reativação de inativos
• Experiência memorável que gera boca a boca

**Meta clara:** taxa de retorno acima de 55%

## Foco 4: Motivar a Equipe (Endomarketing)

Equipe engajada entrega melhor, vende mais e atende com mais energia.

**Ações:**
• Campanhas internas com premiação
• Reconhecimento público de desempenho
• Metas coletivas com recompensa
• Comunicação clara de resultados

**Meta clara:** equipe conhece as metas e está motivada para bater

## Como escolher o foco certo

Se o salão está vazio → Foco 2 (atrair)
Se o salão está cheio mas não sobra dinheiro → Foco 1 (ticket)
Se os clientes não voltam → Foco 3 (fidelizar)
Se a equipe está desmotivada → Foco 4 (endomarketing)

Nunca tentar fazer os 4 ao mesmo tempo com recursos limitados. Escolha um, execute bem, depois avança para o próximo.`
  },
  {
    categoria: 'marketing', emoji: '🎯', ordem: 5,
    titulo: 'Campanhas para datas sazonais — como planejar',
    resumo: 'Dezembro, Dia das Mães, Dia da Mulher: como transformar datas em faturamento real.',
    conteudo: `Datas sazonais são as maiores oportunidades de faturamento do ano — e os salões que se preparam com antecedência saem muito na frente dos que improvisan.

## Datas mais fortes para salões

• **Maio** — Dia das Mães (maior data do ano)
• **Dezembro** — Natal e festas de fim de ano
• **Junho** — Dia dos Namorados
• **Março** — Dia da Mulher
• **Janeiro** — Carnaval (para salões de figurino e fantasia)

## Fórmula para campanhas que funcionam

### 1. Antecipação (15-20 dias antes)
Anunciar antes de todo mundo. Quem comunica primeiro tem mais tempo para preencher agenda.

### 2. Urgência real
"Vagas limitadas" só funciona se for verdade. Defina um número real de vagas para a campanha e comunique o esgotamento progressivo.

### 3. Combos em vez de descontos
Em vez de "20% off em qualquer serviço":
→ "Combo Dia das Mães: corte + hidratação + escova por R$X"

O combo tem valor percebido maior e margem melhor que desconto.

### 4. Pós-campanha
O maior erro: não aproveitar o pico para gerar recorrência.
Na saída de cada cliente, agendar o próximo atendimento.

## Estrutura de comunicação

• **D-20:** teaser nas redes ("algo especial vem aí")
• **D-15:** lançamento da campanha com detalhes
• **D-7:** urgência ("últimas vagas")
• **D-3:** último aviso
• **No dia:** stories ao vivo do movimento

## O que não fazer

• Aguardar a data para começar a divulgar
• Dar desconto sem criar percepção de valor
• Não ter número claro de vagas da campanha
• Não fazer pós-venda com agendamento de retorno`
  },

  // ─── EQUIPE ───────────────────────────────────────────────────────────────
  {
    categoria: 'equipe', emoji: '🤝', ordem: 1,
    titulo: 'Manual de Integração do Novo Profissional',
    resumo: 'Os primeiros 90 dias definem se o profissional fica ou vai embora.',
    conteudo: `A integração mal feita é a principal causa de rotatividade nos primeiros 3 meses. Um profissional que não se sente acolhido vai embora — e leva junto o tempo que você investiu na seleção.

## Por que a integração importa tanto

• Profissional integrado produz até 50% mais rápido
• Reduz rotatividade nos primeiros 3 meses em até 60%
• Cria alinhamento cultural desde o início
• Evita conflitos por falta de clareza de regras

## As 7 etapas do processo

### Etapa 1: Preparação (D-1)
**Responsável: Gerente**
• Comunicar a equipe sobre a chegada
• Escolher e orientar o padrinho/madrinha
• Preparar bancada: limpeza, iluminação, espaço para produtos
• Deixar florzinha e cartão de boas-vindas escrito à mão

*Detalhe que faz diferença: o cartão escrito à mão mostra que foi pensado, não automatizado.*

### Etapa 2: Primeiro dia
**Responsável: Gerente + Recepcionista**
• Gerente: apresentação formal à equipe
• Recepcionista: tour pelo salão
• Gerente: apresentar valores, regras e cultura da casa
• Entregar e explicar o "Compromisso com o Cliente"

### Etapa 3: Treinamento técnico (D2 a D7)
**Responsável: Gerente + Padrinho**
• Gerente: testes práticos e alinhamento técnico
• Padrinho: acompanha atendimentos e treinos
• Recepcionista: ensina o sistema de agendamento

### Etapa 4: Plano de performance (D3)
**Responsável: Gerente**
• Conversar sobre expectativas dos 3 primeiros meses
• Criar plano de marketing conjunto
• Definir metas iniciais claras e mensuráveis

### Etapa 5: Acompanhamento contínuo
• Reuniões semanais de 10-15 minutos
• Relato quinzenal do padrinho
• Avaliação formal ao completar 90 dias

### Etapa 6: Pertencimento
• Incluir nas comunicações internas do salão
• Post de boas-vindas nas redes sociais
• Celebrar pequenas conquistas publicamente

### Etapa 7: Avaliação final (D90)
• Conversa estruturada sobre desempenho
• Alinhamento de expectativas para os próximos 6 meses
• Decisão sobre continuidade com dados na mão

## O papel do padrinho/madrinha

Escolha um profissional experiente, engajado com a cultura, para ser referência do novo.
O padrinho responde dúvidas do dia a dia sem precisar do gerente e acolhe o novo de igual para igual.`
  },
  {
    categoria: 'equipe', emoji: '💬', ordem: 2,
    titulo: 'Passo a passo para dar feedback individual',
    resumo: 'Feedback mal dado cria ressentimento. Feedback bem dado transforma.',
    conteudo: `Dar feedback é a habilidade mais importante — e mais evitada — na gestão de equipe. A maioria dos gestores evita porque não sabe como fazer. Este passo a passo resolve isso.

## O princípio base

Feedback eficaz é ancorado nos valores e regras da empresa, não na opinião pessoal do gestor. Quando você faz isso, o profissional entende que não é pessoal — é um padrão que vale para todos.

## Os 6 passos

### Passo 1: ACOLHIMENTO
Comece mostrando reconhecimento.

*"Quero conversar contigo porque valorizo muito o seu trabalho e sei o quanto você soma aqui."*

**Por quê:** mostra que a conversa não é uma bronca, é uma oportunidade de crescimento.

### Passo 2: EXPOR O FATO (sem julgamento)
Descreva o que aconteceu de forma objetiva, com data e contexto.

*"Notei que na semana passada você fechou a agenda em um dia de maior movimento."*

**Por quê:** fato é irrefutável. Julgamento gera defesa.

### Passo 3: IMPACTO
Explique como aquilo afetou o salão, a equipe ou o cliente.

*"Isso prejudicou a distribuição de clientes, sobrecarregou os colegas e pode ter impactado seu faturamento do dia."*

**Por quê:** conecta o comportamento ao resultado — tira o foco da pessoa e coloca no impacto.

### Passo 4: ALINHAMENTO DE EXPECTATIVA
Reforce como deve ser, conectando à regra ou valor da empresa.

*"Nossa regra é manter a agenda aberta nos dias de maior movimento para que todos possam atender e o cliente seja sempre bem acolhido."*

**Por quê:** mostra que não é uma exigência pessoal — é um padrão que vale para todos.

### Passo 5: CAMINHO E APOIO
Ofereça suporte ou alternativa prática.

*"Sempre que precisar de um ajuste, me avise com antecedência. A gente organiza juntos sem prejudicar ninguém."*

**Por quê:** demonstra parceria, não punição.

### Passo 6: ENCERRAMENTO POSITIVO
Finalize valorizando e incentivando.

*"Confio em você e sei que, alinhando esse ponto, a gente fortalece ainda mais a equipe."*

**Por quê:** a pessoa sai motivada, entendendo que é sobre evolução — não sobre punição.

## Regras de ouro

• **Sempre em particular** — nunca expor em público
• **Sempre no mesmo dia ou no máximo no dia seguinte** — feedback tardio perde impacto
• **Foco no comportamento, não no caráter** — "você fechou a agenda" e não "você é irresponsável"
• **Uma coisa por vez** — não acumular feedback de semanas em uma conversa`
  },
  {
    categoria: 'equipe', emoji: '⚔️', ordem: 3,
    titulo: 'Como resolver conflitos na equipe',
    resumo: 'Conflito ignorado vira cultura. Conflito resolvido vira maturidade.',
    conteudo: `Conflitos no salão são inevitáveis. O problema não é o conflito — é o gestor que ignora ou que reage sem método.

## Os conflitos mais comuns em salões

• Profissional fechando agenda sem avisar
• Fofoca na cozinha ou nos corredores
• Reclamação da gestão nos bastidores
• Comentários negativos sobre clientes na frente da equipe
• Percepção de favoritismo na distribuição de clientes
• Desentendimento sobre divisão de comissão ou espaço

Esses comportamentos parecem pequenos mas custam caro: cliente insatisfeito, equipe dividida, gestor exausto.

## O método de resolução em 5 etapas

### 1. Clareza do papel do líder
Se a equipe não sabe quem decide sobre agenda, todo mundo decide por conta própria.

**Ação:** definir claramente quem tem autoridade sobre o quê — e comunicar isso de forma aberta.

### 2. Regras claras e documentadas
Fofoca existe onde não há regra sobre como se comunicar.

**Ação:** estabelecer no manual interno: "Problemas não se resolvem no bastidor — se resolvem em conversa com o líder."

### 3. Feedback imediato e privado
Citar o comportamento, o impacto e a expectativa (modelo do feedback individual).

**Ação:** conversa individual, sem audiência, sem julgamento — com firmeza e amorosidade.

### 4. Reforço da cultura em reuniões
A própria equipe deve corrigir comportamentos fora da linha quando a cultura está clara.

**Ação:** reforçar em reuniões os valores e o que não é aceitável. Usar exemplos genéricos, não apontar pessoas.

### 5. Treinamento
Muitas falhas não são de má vontade — são de falta de preparo.

**Ação:** criar simulações de atendimento, treinar recepção em como lidar com clientes difíceis, mostrar na prática como resolver situações comuns.

## Quando o conflito persiste

Se após feedback estruturado e prazo definido o comportamento não muda:
1. Reunião formal com documentação
2. Metas de comportamento com prazo e consequência clara
3. Se não resolver: avaliação de continuidade com base nos 6 eixos de performance

**Nunca:** tolerar indefinidamente em nome da "paz" — conflito ignorado contamina toda a equipe.`
  },
  {
    categoria: 'equipe', emoji: '🚀', ordem: 4,
    titulo: 'Como motivar a equipe sem aumentar salário',
    resumo: 'Dinheiro não é o único motivador — e às vezes nem é o principal.',
    conteudo: `Pesquisas de comportamento organizacional mostram que após um salário razoável, outros fatores motivam mais que aumento. No salão, isso se aplica completamente.

## O que motiva além do salário

### 1. Reconhecimento
O ser humano precisa de reconhecimento tanto quanto de dinheiro.

**Ações práticas:**
• "Melhor profissional do mês" com critério claro e divulgação para a equipe
• Reconhecimento público nas reuniões ("quero destacar que X fez algo incrível esta semana")
• Post nas redes do salão celebrando conquistas da equipe

### 2. Autonomia
Dar poder de decisão dentro de um escopo definido.

**Ações práticas:**
• Deixar a profissional sugerir mudanças na sua bancada
• Consultar a equipe antes de mudar processos que afetam o dia a dia
• Criar um projeto liderado por uma profissional destaque

### 3. Desenvolvimento
Investir no crescimento gera lealdade.

**Ações práticas:**
• Subsidiar parcialmente um curso que a profissional quer fazer
• Organizar treinamento interno liderado por quem é referência técnica
• Criar plano de desenvolvimento individual com metas de carreira

### 4. Campanhas internas com premiação

**Exemplos que funcionam:**
• Desafio de venda de combos: quem vende mais X combos no mês ganha R$Y
• Ranking de serviços extras: a cada 10 serviços extras vendidos → R$50 no bolso
• Indicação de clientes novos: cliente novo que menciona o profissional → bônus
• Meta coletiva: equipe bate a meta do mês → churrasco pago pelo salão

**Regra de ouro:** critério justo, comunicação clara, premiação real e imediata.

### 5. Pertencimento
Profissional que se sente parte do projeto não vai embora por qualquer oferta.

**Ações práticas:**
• Compartilhar metas e resultados com a equipe
• Celebrar conquistas do salão junto (mês recorde, cliente especial)
• Perguntar a opinião antes de tomar decisões que afetam todos

## O que NÃO motiva

• Promessas sem prazo definido
• Reconhecimento apenas quando algo dá errado
• Metas impossíveis que ninguém acredita
• Premiação que nunca chega`
  },
  {
    categoria: 'equipe', emoji: '📋', ordem: 5,
    titulo: 'Como contratar: divulgação de vagas e seleção',
    resumo: 'Contratação não pode ser reação ao desespero. Precisa ser processo.',
    conteudo: `O maior erro na contratação é o desespero. Quando o salão está sem profissional e precisa de alguém para amanhã, a tendência é contratar qualquer um — e isso quase sempre termina em demissão rápida.

## O primeiro passo é mental

Antes de escrever a vaga, escreva no papel as qualidades que você quer no profissional.

Exemplo para manicure:
"Quero uma profissional organizada, com bom acabamento, que se comunique bem com as clientes e com a equipe, pontual, responsável e que saiba trabalhar em grupo."

Isso parece simples, mas muda completamente o filtro na seleção. E muda a energia com que você divulga — quem acredita que vai encontrar um bom profissional, encontra.

## Como divulgar a vaga

**Canais que funcionam:**
• Instagram e stories do próprio salão
• Grupos de beleza da cidade no WhatsApp
• Indicação de profissionais da equipe atual
• Grupos de Facebook da área
• Anúncios simples no Instagram Ads

**Frequência:** divulgar constantemente, não só no desespero. Manter banco de profissionais interessados mesmo sem vaga aberta. Quando aparecer alguém bom, às vezes vale abrir uma vaga não planejada.

## O que avaliar na seleção

**Técnico:**
• Teste prático no serviço que vai realizar
• Portfólio real (não só fotos escolhidas)
• Experiência anterior documentada

**Comportamental:**
• Como reage a uma situação de conflito com cliente?
• O que faria se chegasse atrasada?
• Como se sente sobre trabalhar em equipe?

**Cultural:**
• Ela conhece e respeita os valores que você listou?
• A postura dela no dia da entrevista já comunica algo?

## Período de experiência

90 dias com acompanhamento estruturado (o Manual de Integração).
Avaliação formal ao final com decisão clara de continuidade.

Não deixar passar de 90 dias sem conversa formal — estender indefinidamente cria relação sem clareza para os dois lados.`
  },
  {
    categoria: 'equipe', emoji: '🌟', ordem: 6,
    titulo: 'Missão, Visão e Valores: como criar a cultura do seu salão',
    resumo: 'Sem cultura definida, cada profissional segue sua própria regra.',
    conteudo: `Muitos gestores acham que missão, visão e valores são coisa de grande empresa. Na prática, são a base que transforma um grupo de profissionais em um time.

## Por que isso importa no salão

Sem cultura definida:
• Cada profissional age como quer
• Conflitos surgem por falta de parâmetro claro
• O gestor decide tudo na base do "bom senso" — que muda de dia para dia
• Novos profissionais não sabem como se comportar

Com cultura definida:
• Regras são claras e valem para todos igualmente
• Feedback é ancorado em valores, não em opinião
• A equipe se auto-regula
• Contratação fica mais fácil (você sabe exatamente quem não encaixa)

## Missão: para que o salão existe?

Uma frase simples que guia as principais decisões.

**Exemplos:**
• "Transformar como nossas clientes se sentem ao se olhar no espelho"
• "Ser o salão onde a cliente sai mais confiante do que entrou"
• "Cuidar da beleza com técnica, carinho e respeito"

**Como usar:** quando surgir dúvida sobre uma decisão, perguntar: "Isso está alinhado com nossa missão?"

## Valores inegociáveis

O que o salão não abre mão — independente do profissional, do movimento, do dia.

**Exemplos de valores:**
• Pontualidade: respeitamos o tempo da cliente e dos colegas
• Qualidade: nunca entregamos menos do que o nosso melhor
• Transparência: clientes e equipe merecem informação verdadeira
• Desenvolvimento: aprender é parte do trabalho

**Como usar:** quando houver conflito, pergunta: "Esse comportamento está alinhado com nossos valores?"

## Regras de convivência

Podem ser construídas junto com a equipe — o que gera mais adesão.

**Exemplos:**
• Problemas com colegas se resolvem em conversa — não nos bastidores
• Atraso é comunicado com no mínimo 1 hora de antecedência
• Nenhum profissional comenta assuntos internos com clientes
• Todos participam das reuniões e treinamentos agendados

## Como implementar

1. Escreva a missão, valores e regras principais
2. Apresente para a equipe em reunião — explique o porquê de cada um
3. Afixe em local visível na área interna
4. Use nos feedbacks: "Isso vai contra nosso valor de pontualidade"
5. Reforce nas reuniões mensais — cultura se constrói com repetição`
  },
  {
    categoria: 'equipe', emoji: '🔄', ordem: 7,
    titulo: 'Troca de serviços entre profissionais: como organizar',
    resumo: 'Troca pode fortalecer a equipe — ou criar confusão financeira. Depende das regras.',
    conteudo: `A troca de serviços entre profissionais é uma prática saudável quando tem regra clara. Sem regra, o que era para ser leve vira confusão — e o salão paga conta que não é dele.

## Por que permitir trocas

• Fortalece o vínculo entre profissionais
• Gera senso de parceria e comunidade
• Profissional que cuida de si mesmo produz com mais autoestima
• Custo zero quando feito corretamente

## As regras que funcionam

### Regra 1: Profissional usa o próprio produto

Se cada uma usa seu próprio produto:
• Troca direta, sem envolvimento do salão
• Não entra caixa, não gera comissão para ninguém
• Cada uma paga seu próprio custo

*Exemplo: "Eu faço sua escova, você faz minha mão." Cada uma usa seu shampoo, seu esmalte.*

### Regra 2: Serviço usa produto do salão

Se o serviço usa shampoo, toalha, condicionador, produto de tratamento, coloração do salão:
• Esse custo não pode ser invisível
• Criar tabela interna com preço de custo para serviços que usam estrutura do salão
• Valor é descontado de quem usou — mesmo sendo troca

*Exemplo de tabela interna:*
• Lavação simples: R$8 (inclui shampoo + condicionador + toalha)
• Tratamento simples: R$15
• Coloração: custo do produto real

### Regra 3: Dias e horários definidos

• Definir dias e horários específicos para serviços entre profissionais
• Evita que a troca ocupe horário de cliente
• Protege a agenda produtiva de todos

## O que comunicar para a equipe

"A troca é livre quando vocês usam o próprio material. Quando usam produto ou estrutura do salão, há um valor de custo que é descontado. Isso mantém justiça e o salão financeiramente saudável para todos."

## Sinais de que as trocas estão descontroladas

• Consumo de produto não explicado pelo atendimento de clientes
• Profissionais fazendo serviço entre si em horário de pico
• Disputa sobre quem "deve" o quê para quem`
  },

  // ─── ATENDIMENTO ──────────────────────────────────────────────────────────
  {
    categoria: 'atendimento', emoji: '🎯', ordem: 1,
    titulo: 'Venda consultiva: como vender sem parecer chato',
    resumo: 'A venda que vem de um desejo que o cliente revelou não parece venda — parece cuidado.',
    conteudo: `Venda que parece venda afasta. Venda consultiva fideliza — porque parte da necessidade real do cliente.

## O que é venda consultiva

É o processo de identificar o que o cliente realmente precisa (e às vezes não sabe) antes de oferecer qualquer coisa.

**A sequência:**
Pergunta → Escuta com atenção → Leitura da necessidade → Indicação com empatia

## Por que funciona melhor que oferta direta

Quando você oferece algo sem perguntar:
→ O cliente sente que está sendo vendido
→ A resposta padrão é "não, obrigada"

Quando você pergunta e escuta primeiro:
→ O cliente revela o próprio problema
→ Você indica a solução para o problema dele
→ A resposta natural é "sim, quero"

## As 3 histórias que ilustram isso

### História 1 — "Minhas unhas vivem descamando"
**Pergunta:** "Tem algo nas suas unhas que te incomoda?"
**Cliente:** "Eu passo esmalte hoje, amanhã já tá saindo."
**Leitura:** cliente frustrada com durabilidade — unhas fracas
**Indicação:** "Isso é bem comum quando a unha tá sem força. Posso aplicar uma base fortalecedora agora. Em um mês já dá pra sentir diferença. Quer que eu mostre como é?"

### História 2 — "Não gosto de usar luva"
**Pergunta:** "Você costuma usar luva pra lavar louça?"
**Cliente:** "Não. Detesto, me atrapalha demais."
**Leitura:** exposta a produto químico — unhas e cutículas ressecadas
**Indicação:** "Isso é uma das coisas que mais resseca as unhas. Posso fazer uma hidratação nutritiva enquanto o esmalte seca. Dura 5 minutos. Quer sentir agora?"

### História 3 — "Tenho casamento no sábado"
**Pergunta:** "Tem algum evento especial vindo aí?"
**Cliente:** "Sim, tenho um casamento sábado à noite."
**Leitura:** oportunidade para gel, nail art ou acabamento especial
**Indicação:** "Ai que delícia! A gente pode fazer esmaltação em gel com glitter discreto. Fica linda nas fotos e dura intacta até o evento. Posso te mostrar dois modelos?"

## Perguntas que abrem brecha para venda (cabelo)

**Para entender desejos:**
• "O que mais te incomoda no seu cabelo atualmente?"
• "Se pudesse mudar uma coisa no visual, o que seria?"
• "Tem alguma parte do cabelo que sempre te dá mais trabalho?"

**Para revelar hábitos:**
• "Quando foi a última vez que fez um tratamento mais profundo?"
• "Qual o maior desafio com seu cabelo em casa?"
• "Você sente que os produtos que usa estão entregando resultado?"

**Para criar desejo:**
• "Já viu alguma tendência que te chamou atenção ultimamente?"
• "Você gostaria que seu cabelo durasse mais bonito entre os atendimentos?"
• "Tem algum evento especial vindo aí?"

## Perguntas para manicure

**Para entender dores:**
• "Você sente que suas unhas quebram com facilidade?"
• "Sente dificuldade para manter as unhas bonitas no dia a dia?"
• "Suas cutículas costumam ressecar muito?"

**Para criar desejo:**
• "Já pensou em fazer uma esmaltação em gel para mais durabilidade?"
• "Sabia que tem um tratamento para fortalecer as unhas em poucas semanas?"
• "Você gostaria de um acabamento mais natural ou mais glamouroso?"`
  },
  {
    categoria: 'atendimento', emoji: '💆', ordem: 2,
    titulo: 'Recepção que vende: ações práticas para o dia a dia',
    resumo: 'A recepção é o motor de faturamento do salão — não só a porta de entrada.',
    conteudo: `A recepcionista que só agenda e confirma horário está deixando muito dinheiro na mesa. Com ações simples e diárias, a recepção pode ser o maior motor de crescimento do faturamento.

## Por que a recepção é estratégica

• Primeiro e último contato com o cliente
• Gerencia a agenda — que é onde o dinheiro nasce
• Pode aumentar ticket médio antes do atendimento começar
• Pode reativar clientes inativos diariamente
• Pode gerar encaixes em horários que seriam perdidos

## Ações para aumentar ticket médio

• Ao confirmar horário: "Você gostaria de aproveitar e incluir um tratamento? Temos vagas no mesmo dia"
• Ao receber o cliente: apresentar serviço complementar enquanto aguarda
• Ao finalizar: "Tem interesse em agendar o próximo já? Posso incluir um combo especial"
• Oferecer kit home care: "Esse produto é o que a [profissional] usou no seu cabelo hoje — quer levar?"

## Ações para aumentar ocupação

• Confirmação de agenda toda semana (segunda ou terça) com mensagem personalizada — reduz no-show em até 30%
• Ao perceber cancelamento: ligar para a lista de espera antes de a vaga esfriar
• Postar nos stories toda vaga disponível que surgir
• Toda segunda: enviar mensagem para clientes que não aparecem há 60 dias
• Criar lista de espera ativa para horários nobres

## Ações para aumentar fidelização

• Ao final de todo atendimento: "Vou agendar seu retorno já? Em quanto tempo costuma fazer?"
• Anotar informações pessoais: "Você mencionou que tem uma formatura em julho — vou marcar para te contatar antes"
• Enviar mensagem no aniversário com convite para agendar
• Conhecer as clientes pelo nome — e usá-lo sempre

## Campanha interna para a recepção

Criar métricas claras e premiação real:
• Meta de encaixes por mês: X encaixes gerados = bônus R$Y
• Taxa de confirmação: abaixo de Z% no-show = prêmio
• Serviços extras vendidos: ranking mensal com premiação

Recepção motivada por resultado vende mais — e o salão cresce junto.`
  },
  {
    categoria: 'atendimento', emoji: '💎', ordem: 3,
    titulo: 'Como criar experiência memorável no atendimento',
    resumo: 'Cliente que volta e indica não é aquela que teve o melhor resultado — é a que teve a melhor experiência.',
    conteudo: `Resultado técnico impecável é o mínimo esperado. O que transforma uma boa cliente em fã do salão é a experiência completa — o que ela sente do momento que entra até o momento que sai.

## O que os clientes mais valorizam (além do resultado)

Pesquisas sobre o que fideliza clientes de salão mostram:

1. **Pontualidade** — não ter que esperar
2. **Atenção exclusiva** — profissional presente, não no celular
3. **Ser lembrada como pessoa** — não como mais um atendimento
4. **Limpeza e organização** — ambiente que transmite profissionalismo
5. **Consistência** — resultado igual toda vez
6. **Facilidade de agendamento** — agendar deve ser simples

## Os momentos que fazem diferença

### Acolhimento
• Chamá-la pelo nome logo que entra
• "Oi [nome], estava te esperando! Pode sentar aqui."
• Oferecer café, água, chá antes de perguntar o que ela quer
• A cliente precisa sentir que foi esperada com carinho

### Durante o atendimento
• Explicar o que está fazendo e por quê
• Perguntar sobre ela — mas ouvir de verdade
• Não ficar no celular enquanto atende
• Atenção ao conforto: temperatura, posição, música

### Recomendações personalizadas
• "Para o seu tipo de cabelo, recomendo fazer hidratação a cada 3 semanas"
• "Notei que suas cutículas estão ressecadas — esse óleo vai ajudar em casa"
• Não é venda: é cuidado com resultado

### Saída
• Mostrar o resultado com carinho
• Sugerir o próximo passo
• Agendar o retorno na saída (taxa de retorno aumenta 40%)
• "Que saudade que eu vou sentir até a próxima!"

## O que quebra a experiência

• Profissional no celular durante o atendimento
• Falar de outros clientes na presença da que está sendo atendida
• Ambiente sujo ou desorganizado
• Espera longa sem comunicação
• Não lembrar o nome ou histórico da cliente
• Resultado diferente do que foi combinado

## A experiência começa antes de ela chegar

• Confirmação de agendamento que parece pessoal (não automática)
• Facilidade para agendar e reagendar
• Resposta rápida no WhatsApp (máximo 2h)
• Ambiente limpo e organizado quando ela chega`
  },
  {
    categoria: 'atendimento', emoji: '😔', ordem: 4,
    titulo: 'Como lidar com cliente insatisfeita',
    resumo: 'Cliente que reclama e é bem atendida tem 70% mais chance de continuar fiel do que quem nunca reclamou.',
    conteudo: `Uma reclamação bem tratada pode ser a experiência que mais fideliza uma cliente. O erro está em ignorar, justificar ou pedir para ela entender.

## Por que reclamação é oportunidade

• Cliente que reclama ainda quer ser atendida — ela está te dando uma chance
• Cliente que sai em silêncio nunca mais volta e ainda fala mal
• Cliente bem atendida na reclamação fideliza mais do que quem nunca teve problema

## O protocolo passo a passo

### Passo 1: Escutar sem interromper
Deixe a cliente falar tudo. Não tente explicar, justificar ou defender enquanto ela fala.

Por quê: a cliente precisa ser ouvida antes de qualquer solução. Interromper aumenta a frustração.

### Passo 2: Validar o sentimento
"Entendo que você ficou frustrada. É natural que isso te incomode."

Por quê: validar não é concordar que você errou — é reconhecer que o sentimento dela é legítimo.

### Passo 3: Pedir desculpas sem justificar
"Sinto muito que a experiência não foi o que você esperava."

Por quê: justificar ("mas você pediu X", "mas o produto estava assim") é defender o salão, não resolver o problema.

### Passo 4: Identificar o que pode ser feito
"O que posso fazer para resolver isso para você?"

Ou propor diretamente: "Posso [refazer, ajustar, devolver, fazer diferente]. Qual prefere?"

### Passo 5: Resolver e registrar
• Resolver o mais rápido possível
• Registrar o que aconteceu e o que foi feito (evita repetir)
• Se houver erro do salão: refazer sem custo

### Passo 6: Acompanhar depois
• Mensagem de WhatsApp 2-3 dias depois: "Como ficou? Você ficou satisfeita com como resolvemos?"
• Esse contato transforma o episódio negativo em prova de cuidado

## O que NUNCA fazer

• Discutir com a cliente na frente de outras pessoas
• Questionar se o problema é real
• Dizer "mas eu avisei que podia ficar assim"
• Ignorar e esperar ela se acalmar sozinha
• Não oferecer nenhuma solução concreta

## Quando a reclamação é nas redes sociais

• Responder em até 24h — sempre
• Tom profissional e empático, não defensivo
• "Ficamos tristes com sua experiência. Por favor, nos chame no WhatsApp para resolver."
• Resolver em privado — a resolução pode ser pública depois (com autorização)
• Nunca responder de forma agressiva — o público lê isso`
  },

  // ─── OPERAÇÃO ─────────────────────────────────────────────────────────────
  {
    categoria: 'operacao', emoji: '🧴', ordem: 1,
    titulo: '5 passos para organizar o estoque do seu salão',
    resumo: 'Estoque é dinheiro. Controlar é obrigação — não diferencial.',
    conteudo: `Produto vencido na gaveta, profissional que "não tem produto", compra duplicada por falta de controle — tudo isso é prejuízo direto que pode ser eliminado com um processo simples.

## Por que organizar o estoque importa

• Produto parado = dinheiro imobilizado
• Produto vencido = prejuízo direto
• Produto sem controle = custo impossível de calcular
• Com controle: você sabe o que tem, o que precisar e o que está gerando perda

## Passo 1: Reúna tudo em um lugar

Junte TODOS os produtos: nas bancadas, nos armários, nos lavatórios, nas gavetas.

Coloque tudo sobre uma mesa — visão completa do que realmente existe.

Essa etapa revela:
• Produtos que ninguém sabia que existiam
• Produtos vencidos ou prestes a vencer
• Duplicatas desnecessárias

## Passo 2: Separe por categorias

• Tintas e oxidantes
• Shampoos e condicionadores
• Tratamentos e máscaras
• Esmaltes e produtos de nail
• Produtos de estética
• Descartáveis

Para cada categoria, identifique produtos de **baixo giro** (vendem/usam pouco). Eles precisam de ação:
• Usar nos próximos atendimentos com prioridade
• Criar descarte controlado dos vencidos
• Não recomprar enquanto tiver estoque

## Passo 3: Crie sistema de acesso controlado

• Espaço fechado e identificado para armazenamento
• Responsável designado pelo estoque
• Acesso apenas para pessoas autorizadas

Isso reduz perdas por uso excessivo, roubo e falta de registro.

## Passo 4: Registre entradas e saídas

Planilha simples ou sistema de gestão com:
• Nome do produto
• Quantidade em estoque
• Data de entrada
• Saída (quem retirou e para qual atendimento)
• Quantidade mínima (ponto de reposição)

Quando chegar no mínimo: pedido automático de reposição.

## Passo 5: PEPS — Primeiro que Entra, Primeiro que Sai

Ao receber produto novo:
• Coloca ATRÁS dos produtos antigos
• Usa PRIMEIRO os mais velhos

Isso elimina produto vencendo enquanto o novo está fechado.

## Frequência de revisão

• Checagem semanal rápida: conferir o que está perto do mínimo
• Inventário mensal completo: contar tudo e comparar com o registro
• Resultado do inventário: mostra exatamente quanto está sendo consumido por atendimento`
  },
  {
    categoria: 'operacao', emoji: '📅', ordem: 2,
    titulo: 'Como montar uma grade de horários eficiente',
    resumo: 'Agenda bem estruturada aumenta faturamento sem contratar mais ninguém.',
    conteudo: `A grade de horários é onde o faturamento nasce ou morre. Uma agenda mal estruturada cria buraco onde deveria ter cliente.

## O erro mais comum

Distribuir horários de forma igual para todos os profissionais, independente do serviço, do tempo real de atendimento ou do perfil de cliente.

O resultado: profissional ociosa enquanto a da ao lado não para, cliente esperando, salão parecendo desorganizado.

## Como montar a grade corretamente

### 1. Mapeie a duração real dos serviços
Não o tempo ideal — o tempo real, incluindo preparo, finalização e breve pausa entre atendimentos.

Exemplo:
• Manicure completa: 50min (não 45)
• Coloração simples: 2h30 (não 2h)
• Escova: 45min (não 30)

### 2. Reserve margem entre serviços técnicos
Após coloração ou mechas: 10-15min de folga
Evita que atraso em um atendimento contamine todos os seguintes.

### 3. Distribua serviços longos no meio do dia
Colorações, mechas, realinhamentos: meio do dia (10h-16h)
Serviços rápidos (manicure, sobrancelha): horários de abertura e fechamento

Por quê: serviços longos no final do dia atrasam o fechamento. Serviços rápidos com horário claro dão fluidez.

### 4. Horários de pico para serviços de maior valor
Sexta à tarde, sábado de manhã: priorizar serviços de maior ticket
Não desperdiçar horário nobre com serviços de baixo valor

### 5. Use sobreposição de tempos
Durante coloração em processamento (produto atuando):
→ Profissional faz sobrancelha de outra cliente
→ Ou manicure de quem está esperando
→ Ou inicia próxima coloração

Isso aumenta o faturamento por hora sem contratar ninguém.

## Sinais de que a grade está ruim

• Profissional fica parada mais de 30min entre atendimentos
• Atrasos em cadeia todos os dias
• Clientes esperando além do esperado regularmente
• Horário de fechamento ultrapassado com frequência

## Revise a grade mensalmente

O que funciona no verão pode não funcionar no inverno. O que funciona com 5 profissionais pode precisar de ajuste com 7.`
  },
  {
    categoria: 'operacao', emoji: '🚫', ordem: 3,
    titulo: 'Como reduzir no-show e cancelamentos em cima da hora',
    resumo: 'No-show é dinheiro jogado fora. Com processo simples, cai até 70%.',
    conteudo: `No-show (cliente que não aparece) e cancelamento em cima da hora são os maiores destruidores de faturamento invisível. O horário fica vazio, o profissional fica ocioso e não tem como recuperar.

## O impacto real

Se um profissional tem 8 atendimentos por dia e 1 por semana não aparece:
• 4 no-shows por mês
• Com ticket médio de R$150 = R$600 de perda mensal
• Anualizado: R$7.200 por profissional

Para um salão com 8 profissionais: **R$57.600/ano em receita perdida.**

## As causas mais comuns

• Cliente esqueceu o horário
• Emergência real (acontece)
• Preferiu cancelar mas teve vergonha de ligar
• Não sente consequência por não aparecer

## O sistema que reduz no-show em até 70%

### 1. Confirmação automática 48h antes
"Oi [nome]! Lembrei de te avisar do seu horário de [serviço] amanhã às [hora] com [profissional]. Confirma? Responda SIM ou me avise se precisar reagendar. 💜"

### 2. Lembrete 2h antes
"Oi [nome], a gente está te esperando daqui a pouquinho! Nos vemos às [hora]. 😊"

### 3. Lista de espera ativa
Sempre que tiver horário nobre (sexta à tarde, sábado) com vaga em aberto:
• Manter lista de clientes que pediram horário mas não tinha vaga
• Contato imediato quando surgir cancelamento

### 4. Política clara de cancelamento
Definir e comunicar na hora do agendamento:
"Cancelamentos com menos de 24h não garantem reembolso de sinal" (se aplicável)

Ou mais simples: "Se precisar cancelar, avise com pelo menos 24h — assim consigo encaixar outra cliente. 💜"

### 5. Sinal para horários de alta demanda
Para horários concorridos (sextas à tarde, véspera de festas):
• Cobrar sinal de 30-50% do valor
• Sinal não reembolsável em cancelamento tardio

## O que fazer quando o no-show acontece

1. Ligar imediatamente após o horário (não esperar)
2. "Oi [nome], estava te esperando aqui! Está tudo bem? Posso reagendar para esta semana?"
3. Tom: preocupação, não cobrança
4. Registrar para identificar clientes recorrentes no padrão`
  },
  {
    categoria: 'operacao', emoji: '💡', ordem: 4,
    titulo: 'Iluminação no salão: guia completo por tipo de serviço',
    resumo: 'A iluminação certa valoriza o trabalho do profissional e a experiência do cliente.',
    conteudo: `Iluminação errada é o inimigo silencioso do salão. Uma coloração feita com luz amarela pode parecer diferente na luz natural. Um corte com sombra no rosto pode parecer assimétrico.

## Por tipo de serviço

### Cortes e coloração
**Problema:** luz direta de cima cria sombras no rosto e nos cabelos — dificulta a visualização da cor real.

**Solução:** iluminação lateral ou traseira, que distribui a luz uniformemente sem criar sombras duras.

**Temperatura de cor:** branca neutra (4000K) para enxergar as cores reais do cabelo.

### Maquiagem
**Iluminação frontal** é essencial. Ela elimina sombras no rosto e permite ver como a maquiagem vai parecer na luz natural.

**Posicionamento:** luzes nas laterais do espelho (Hollywood style) ou tira de LED na frente.

**Temperatura de cor:** branca (5000K-6000K) para ver cores verdadeiras.

### Manicure e pedicure
**Luz focalizada** sobre as mãos e pés — permite precisão no trabalho.

**Opções:** lâmpada de mesa articulada ou spot direcionável.

**Benefício:** profissional trabalha com mais precisão, menos erro, menos retrabalho.

### Área de spa, massagem e estética
**Iluminação suave e quente** (2700K-3000K) — transmite calma e relaxamento.

Evitar luz branca e direta nessas áreas: cria sensação de consultório médico, não de spa.

## Combinando tipos de iluminação

O segredo está no equilíbrio:
• **Luz branca:** garante visibilidade e precisão técnica
• **Luz quente:** torna o ambiente convidativo e acolhedor

Salão ideal combina os dois — área de trabalho com luz técnica, área de espera e circulação com luz mais aconchegante.

## Paredes e móveis

Paredes e móveis escuros absorvem a luz — o salão fica mais fechado e o profissional precisa de mais potência luminosa.

**Recomendação:** tons claros e neutros (branco, creme, cinza claro) para refletir a luz e ampliar o espaço visualmente.

## Luz natural

Sempre que possível, aproveitar:
• Janelas amplas voltadas para norte ou leste (luz mais suave)
• Claraboias para aumentar luminosidade
• Cortinas translúcidas para filtrar excesso sem bloquear

Luz natural valoriza a cor real do cabelo e da pele — é a referência perfeita para coloração.

## Checklist da iluminação ideal

• Área de corte: iluminação lateral ou traseira, luz branca neutra
• Espelho de coloração: sem sombra direta de cima
• Área de manicure: spot focado, luz branca
• Área de estética/spa: luz quente, dimmer para controlar intensidade
• Recepção: combinação de luz quente (aconchego) e branca (funcionalidade)
• Fachada: iluminação externa para o salão aparecer à noite`
  },
  {
    categoria: 'operacao', emoji: '📊', ordem: 5,
    titulo: 'Como calcular produtividade real por hora trabalhada',
    resumo: 'Faturamento alto não significa alta produtividade. Saiba quem realmente usa melhor o tempo.',
    conteudo: `Dois profissionais podem ter faturamentos diferentes mas produtividade por hora completamente distinta. Saber quem usa melhor o tempo é essencial para decisões de gestão.

## A fórmula

**Produtividade/hora = Faturamento do mês ÷ (dias trabalhados × horas por dia)**

### Exemplo:
• Profissional A: faturou R$10.000, trabalhou 20 dias × 8h = 160h → R$62,50/hora
• Profissional B: faturou R$8.000, trabalhou 15 dias × 8h = 120h → R$66,67/hora

**A Profissional B é mais produtiva por hora**, mesmo faturando menos no total.

## Por que isso importa

Sem esse cálculo, você pode:
• Pressionar a profissional errada para trabalhar mais
• Deixar de reconhecer quem usa bem o tempo
• Tomar decisão de contratação baseada em faturamento bruto

## Como usar os dados

### Comparativo entre profissionais
• Faça o cálculo para todos do mesmo cargo
• Compare: quem está acima da média? Quem está abaixo?
• Profissional com baixa produtividade/hora pode ter muitos horários vagos — investigar por quê

### Para definir metas mais justas
Em vez de meta de faturamento igual para todos:
→ Meta de produtividade/hora para cada profissional
→ Quem trabalha mais dias pode ter meta de faturamento maior — mas produtividade/hora é o critério justo

### Para calcular valor da hora de atendimento
Essa produtividade real é a base para:
• Precificação correta dos serviços
• Análise de viabilidade de contratar mais um profissional

## Indicadores que complementam

• **Taxa de ocupação:** % do tempo disponível em que houve atendimento. Meta: 70-85%.
• **Ticket médio:** faturamento ÷ número de atendimentos. Deve crescer ao longo do tempo.
• **Faturamento por m²:** faturamento total ÷ área do salão. Mede eficiência do espaço.

## Frequência de análise

• Mensal: calcular para todos os profissionais
• Trimestral: tendência de crescimento ou queda
• Comparar com o histórico do mesmo profissional — mais útil que comparar entre pessoas diferentes`
  },
]

export async function POST(req: NextRequest) {
  try {
    const token = cookies().get('nodri_token')?.value
    const payload = token ? await verifyJWT(token) : null
    if (!payload || payload.role !== 'master') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Remove existentes e insere novos
    await supabaseAdmin.from('academia_artigos').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const { data, error } = await supabaseAdmin.from('academia_artigos').insert(ARTIGOS).select()
    if (error) throw error

    return NextResponse.json({ ok: true, inseridos: data?.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ total: ARTIGOS.length, categorias: [...new Set(ARTIGOS.map(a => a.categoria))] })
}
