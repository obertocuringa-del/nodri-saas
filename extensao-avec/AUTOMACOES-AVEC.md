# Automações do Avec — o que cada uma faz, passo a passo

Uma extensão só, várias tarefas. Cada tarefa tem o **seu próprio relógio** e o
**seu próprio liga/desliga** no NODRI (CRM › Configurar). Quem manda no relógio é
o NODRI: a extensão só pergunta "tem tarefa pra mim?". Assim dá para mudar
horário e intervalo sem tocar no computador da recepção.

A regra que vale para todas: **a extensão não decide nada.** Ela lê o Avec e
executa o que o NODRI mandou. Quem escolhe é o NODRI.

---

## Tarefa 1 — Feedback pós-pagamento  *(no ar desde 14/09/2026)*

- **Quando:** a cada 30–60 s (configurável)
- **Lê:** relatório **0051**, data de hoje, 500 por página
- **Filtra:** status **Pago / Finalizado** (configurável) do dia
- **Manda:** 2 mensagens, **uma vez por TELEFONE por dia** (nunca por nome)
- Detalhes em `../src/lib/crmAutomacao.ts`

---

## Tarefa 2 — Confirmação do agendamento  *(a construir)*

### Como dispara
A cliente responde no WhatsApp algo que vale como confirmação ("confirmo",
"ok", "pode agendar" — a lista é editável no CRM).

**Trava obrigatória:** a palavra só conta se a conversa estiver na pasta
**Confirmação** — ou seja, se a última coisa que o salão mandou foi mesmo um
pedido de confirmação. Senão um "ok" respondendo a *"hoje não tenho encaixe"*
confirmaria um agendamento que ela não confirmou.

### Passo a passo no Avec

1. **Achar pela planilha, não pelo quadro.** Baixar o relatório **0051** do dia
   do agendamento. A linha dá: `Data · Hora · Cliente · Celular · Profissional ·
   Serviço · Status`.
   - Casar pelo **telefone** (único). Nome repete.
   - O quadro da agenda pagina de 12 em 12 profissionais (o salão tem 19) e
     corta o nome nos bloquinhos — varrer ele é frágil.
2. **Se o status já for "Confirmado", pular.** Não mexer.
3. Abrir a **agenda no dia certo** — conferir **mês** e **dia** (setinha do
   calendário para trocar de mês). Clicar em **Hoje** antes, para a agenda
   recarregar e voltar a uma data conhecida.
4. Ir na **coluna daquele profissional**, clicando a setinha `❯` se ele estiver
   na segunda página.
5. Clicar no **horário** → abre o modal **Reserva**.
6. **Conferir o `Celular:` do modal contra o telefone da planilha.**
   Se não bater, **não salvar** — devolver o caso para a recepção.
7. **Status → `Confirmado`** (botão azul) → **Salvar**.
8. Se aparecer a caixa **"todos os agendamentos / apenas esse"** → **TODOS**.
   - Ela só abre quando a cliente tem outros agendamentos **no mesmo dia, com
     outros profissionais**. Com um profissional só, salva direto e a caixa nem
     aparece — por isso a extensão PROCURA a caixa, não espera por ela.
   - Texto conferido em 15/09/2026: *"O cliente possui outros agendamentos para
     esse dia, deseja confirmar todos os agendamentos desta data?"*
   - **Não alcança recorrência** (era a dúvida): é só daquela data. Então TODOS
     é seguro e é o certo — a cliente confirmou o dia, não um profissional.

### Status disponíveis no modal
`Agendado · Confirmado · Aguardando · Em Atendimento · Finalizado · Pago ·
Cancelado · Faltou`

---

## Tarefa 3 — Avisar o profissional quando a comanda abre  *(a construir)*

- **Quando:** a cada ~30 s
- **Lê:** as **Comandas Abertas** do dia
- **Manda:** WhatsApp para o **profissional** (não para a cliente):
  > "Vera, sua cliente das 11h, Maria Rita — pé, mão e modelagem — já chegou."
- **Uma vez por comanda** (mesma trava do feedback, por id da comanda)
- **Precisa:** telefone de cada profissional cadastrado no NODRI
- Risco de bloqueio baixo: vai para a equipe, poucos números conhecidos

---

## Tarefa 4 — Agendar pela conversa  *(a construir, a mais delicada)*

Escreve na agenda. Roteiro ditado pelo dono em 14/09/2026:

1. Clicar em **Hoje** (reseta e atualiza a agenda)
2. Acertar o **mês** na setinha, depois o **dia** — nunca assumir o mês corrente
3. Clicar no horário, na coluna do profissional
4. No modal, trocar o buscador de **Nome → Telefone**
5. Digitar `61` + `9` + número — **sem o 9 não encontra**
6. **Esperar** o nome carregar (precisa de pausa)
7. Se "nenhum cliente encontrado" → **PARAR e chamar a recepção**
   (decisão: não cadastrar cliente sozinha — cadastro errado é chato de limpar)
8. **Serviço** (digitar) · **Adicionar serviço** para os demais
9. **Observações:** quem agendou (rastro)
10. **Início/Fim** pelo tempo do serviço cadastrado no NODRI
    (`servicos_tempos`: trabalha · pausa · trabalha)
11. **Salvar**

**Nunca marcar "Forçar Encaixe".** Se não couber, avisar.

---

## O que é do NODRI e o que é do Avec

| Dado | Fonte |
|---|---|
| Preço do serviço | **NODRI** (`salao_servicos`, via `/api/crm/precos`) |
| Tempo do procedimento | **NODRI** (`salao_config` → `servicos_tempos`) |
| Quem faz o quê | **NODRI** (`profissionais.servicos_habilitados`) |
| Horário livre / bloqueio / folga | **Avec** (só a agenda tem o quadro completo) |
| Agendamentos e status | **Avec** (relatório 0051) |

A IA **interpreta** a mensagem da cliente. A IA **não inventa dado**: preço,
horário e duração vêm sempre das fontes acima.
