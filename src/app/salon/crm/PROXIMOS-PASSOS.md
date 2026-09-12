# CRM NODRI — o que está pronto e o que não está

Regra que vale para tudo: **o sistema marca sozinho, quem escreve é gente.**
Nenhuma mensagem sai sem alguém clicar em Enviar. Decidido em 11/09/2026 e é
o que separa "automatizado" de "número bloqueado pelo WhatsApp".

## Pronto e no ar

**Conexão**
- QR, sessão que sobrevive a reinício, reconexão sozinha
- Histórico do celular entra junto no pareamento
- O que o salão manda pelo celular também aparece no CRM

**A fila**
- Abas no topo: Preciso agir · Clientes novas · Sem resposta · Aguardando ·
  Follow-up · Pausadas · Agendadas · Não fechou · Todas
- "Preciso agir" (até 3 dias) separado de "Sem resposta" (o que ficou para trás)
- Nove botões de estado: Agendou · Confirmou · Desmarcou (com motivo) ·
  Aguardando cliente · Aguardando promoção · Follow-up amanhã · Pausar 7 dias ·
  Não fechou (com motivo) · Não li ainda
- Etiqueta de estado em toda conversa, inclusive na fila
- Relógio de espera em minutos de expediente, faixa de urgência na borda
- Trava de dono: duas recepcionistas não respondem a mesma cliente

**Automático (o relógio, a cada minuto)**
- Pausa que vence volta como follow-up
- Cliente que não responde por um dia de expediente vira follow-up
- Cliente nova detectada pelo telefone, cruzando com `atendimentos_raw`
- **Disparo em massa cai em "Aguardando promoção"**, separado da conversa de
  verdade -- mas só sai de "Aguardando cliente". Quem estava em Preciso agir,
  Follow-up ou Pausada NÃO se mexe: a lista de disparo é montada pelo
  relatório, sem olhar a fila, e mais cedo ou mais tarde pega junto uma
  cliente que ainda espera resposta
- **Agendado marcado sozinho** quando a cliente aparece no atendimento

**Responder**
- Anexo: foto, áudio, vídeo e documento, nos dois sentidos
- Preços em três toques (Serviço/Produto → categoria/marca → item)
  - SERVIÇO sai de salao_servicos, a MESMA tabela da "Tabela de preços" do
    link de promoções — e a observação vai junto com o preço, numa inserção só
  - PRODUTO sai do relatório de produtos vendidos (0041), não do catálogo da
    calculadora (aquele guarda o que o salão PAGA). Valor = maior unitário já
    cobrado, porque desconto só desce
- Mensagens prontas com atalho: `/oi` + Enter
- Gravar áudio direto na tela, sem passar pelo celular
- Responder citando uma mensagem
- Marcar conversa como não lida
- Aviso de mensagem nova: contador no título da aba + toque curto

**Medir**
- Painel: conversão, cliente nova x cliente da casa, motivos de perda,
  conversão por origem, tempo de resposta, quem espera agora
- Quem trabalhou a fila: respondeu, assumiu, agendou, fechou — por pessoa
- Origem da conversa (tráfego pago, indicação, Google…), editável

**Configurar** (`/salon/crm/config`)
- Mensagens prontas, motivos de "Não fechou", origens

**Ficha da cliente**
- Nome editável e observação que fica para sempre

## Não está pronto — e por quê

**Vários números de WhatsApp no mesmo salão.** Um canal por salão, e é a
única coisa da lista que eu não fiz de propósito. Não é código difícil: é
tirar o índice único de `crm_canais(salao_id)`, pendurar `canal_id` em
contato, conversa e mensagem, trocar a chave do mapa de sessões da ponte e
pôr um seletor na tela. O problema é que isso mexe na tabela que segura a
conexão que está **funcionando agora**, e mexer nela sem alguém por perto
para testar troca um ganho que ninguém pediu ainda por um risco de derrubar
o que já roda. Fica para quando o segundo número existir de verdade.

**Grupos.** Ficam de fora por decisão: o CRM é para conversa com cliente.
Trazer grupo de equipe e de fornecedor enterraria a fila.

## Armadilha conhecida

`atendimentos_raw` casa com o CRM pelo **celular**. Se o WhatsApp conectado
não for o da recepção, quase todo contato vira "cliente nova" e a conversão
mede a vida pessoal de quem conectou. Foi o que aconteceu no primeiro teste.
