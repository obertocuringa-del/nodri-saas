// Conteúdos padrão de páginas (POPs, guias). Aparecem na página do salão
// e já vêm preenchidos no Editor de Páginas do admin para editar e salvar.
// Chave = slug da página (/conteudo/<slug>). Some quando o admin salva a sua versão.

const META = 'background:#f7f6fb;border:1px solid #e6e3f2;border-left:4px solid #5b4fcf;border-radius:12px;padding:16px 20px;margin:0 0 8px'
const BOX = 'background:#f8f7fc;border:1px solid #e9e6f4;border-radius:12px;padding:14px 18px;margin:12px 0'
const TEMPO = 'display:inline-block;background:#eef2ff;border:1px solid #cdd6ff;color:#3b3a86;border-radius:999px;padding:4px 14px;font-size:12px;font-weight:600'
const CHECK = 'list-style:none;padding-left:0;margin:6px 0;line-height:2.1'
const BOXH = 'color:#3b2e7a;font-size:13px;font-weight:700;margin:12px 0 4px;text-transform:uppercase;letter-spacing:.4px'
const FIELD = 'display:inline-block;border-bottom:1px solid #b9b4d6;min-width:200px;height:14px'

const MANICURE_HTML = `
<h1>Procedimento Operacional Padrão (POP)</h1>
<p style="color:#6b6880;font-size:15px;margin:-4px 0 16px;font-weight:600">POP-MAN-001 — Atendimento de Manicure</p>

<h2>1. Identificação</h2>
<div style="${META}">
  <p style="margin:0"><strong>Código:</strong> POP-MAN-001 &nbsp;·&nbsp; <strong>Versão:</strong> 1.0 &nbsp;·&nbsp; <strong>Setor:</strong> Manicure</p>
  <p style="margin:8px 0 0"><strong>Responsável:</strong> <span style="${FIELD}"></span></p>
  <p style="margin:8px 0 0"><strong>Data de Emissão:</strong> ___/___/______ &nbsp;·&nbsp; <strong>Última Revisão:</strong> ___/___/______ &nbsp;·&nbsp; <strong>Próxima Revisão:</strong> ___/___/______</p>
</div>

<h2>2. Objetivo</h2>
<p>Padronizar o atendimento de manicure, garantindo excelência no atendimento, segurança, biossegurança, qualidade técnica e uma experiência única para todas as clientes.</p>

<h2>3. Campo de Aplicação</h2>
<p>Este procedimento aplica-se a todas as profissionais responsáveis pelos serviços de manicure.</p>

<h2>4. Responsabilidades</h2>
<h3>Profissional</h3>
<p>É responsabilidade da profissional:</p>
<ul>
  <li>Cumprir integralmente este POP.</li>
  <li>Manter postura ética e profissional.</li>
  <li>Zelar pela segurança da cliente.</li>
  <li>Cumprir todas as normas de biossegurança.</li>
  <li>Garantir a qualidade técnica do serviço.</li>
  <li>Manter sua estação limpa e organizada.</li>
</ul>
<h3>Recepção</h3>
<ul>
  <li>Confirmar o agendamento.</li>
  <li>Recepcionar a cliente.</li>
  <li>Registrar reagendamentos.</li>
  <li>Informar à gerência qualquer ocorrência.</li>
</ul>
<h3>Gerência</h3>
<ul>
  <li>Fiscalizar o cumprimento deste POP.</li>
  <li>Treinar continuamente a equipe.</li>
  <li>Realizar auditorias periódicas.</li>
</ul>

<h2>5. Materiais Necessários</h2>
<h3>EPIs</h3>
<ul>
  <li>Luvas descartáveis.</li>
  <li>Máscara.</li>
  <li>Avental.</li>
</ul>
<h3>Materiais</h3>
<ul>
  <li>Kit descartável lacrado.</li>
  <li>Alicates esterilizados.</li>
  <li>Lixas.</li>
  <li>Palito.</li>
  <li>Espátula.</li>
  <li>Algodão.</li>
  <li>Removedor de esmalte.</li>
  <li>Base.</li>
  <li>Esmaltes.</li>
  <li>Spray secante ou óleo secante.</li>
  <li>Toalha limpa.</li>
  <li>Lixeira.</li>
</ul>

<h2>6. Biossegurança</h2>
<h3>Antes do Atendimento</h3>
<p>A profissional deverá:</p>
<ul>
  <li>Higienizar corretamente as mãos.</li>
  <li>Manter uniforme limpo.</li>
  <li>Manter cabelos presos.</li>
  <li>Utilizar luvas descartáveis novas.</li>
  <li>Utilizar máscara limpa.</li>
  <li>Conferir a limpeza da bancada.</li>
  <li>Conferir se todos os instrumentos estão esterilizados.</li>
  <li>Conferir validade da esterilização.</li>
  <li>Organizar todos os materiais antes do atendimento.</li>
</ul>
<p><strong>É proibido iniciar o atendimento utilizando materiais sem esterilização.</strong></p>
<h3>Durante o Atendimento</h3>
<ul>
  <li>Manter a bancada organizada.</li>
  <li>Não utilizar telefone celular.</li>
  <li>Não consumir alimentos.</li>
  <li>Trocar as luvas sempre que necessário.</li>
  <li>Evitar contaminação cruzada.</li>
</ul>
<h3>Após o Atendimento</h3>
<ul>
  <li>Descartar corretamente os materiais descartáveis.</li>
  <li>Encaminhar os instrumentos para esterilização.</li>
  <li>Higienizar toda a bancada.</li>
  <li>Higienizar as mãos.</li>
  <li>Preparar a estação para a próxima cliente.</li>
</ul>

<h2>7. Script de Atendimento</h2>
<p>A profissional deverá sempre iniciar o atendimento de frente para a cliente, demonstrando simpatia, cordialidade e profissionalismo.</p>
<h3>Apresentação</h3>
<blockquote>"Olá, Ana! Seja bem-vinda. Meu nome é Maria e hoje serei a profissional responsável pelo seu atendimento."</blockquote>
<p>Em seguida perguntar:</p>
<blockquote>"A senhora irá fazer as mãos hoje, correto?"</blockquote>
<p>Depois perguntar:</p>
<blockquote>"O que a senhora pensou para hoje?"</blockquote>
<p>Em seguida:</p>
<blockquote>"A senhora possui alguma preferência ou alguma foto de referência?"</blockquote>
<p>Após ouvir atentamente a cliente, a profissional deverá explicar de forma clara e profissional:</p>
<ul>
  <li>O que é possível realizar.</li>
  <li>O que não é recomendado realizar.</li>
  <li>As limitações técnicas do procedimento.</li>
  <li>Os cuidados necessários para preservar a saúde das unhas.</li>
</ul>
<p>Nenhum procedimento deverá ser iniciado antes que a cliente compreenda e concorde com o serviço que será realizado.</p>

<h2>8. Preparação para o Procedimento</h2>
<p>Antes de iniciar o atendimento, a profissional deverá:</p>
<div style="${BOX}">
  <div style="${BOXH}">Equipamentos de Proteção</div>
  <ul style="${CHECK}">
    <li>☐ Colocar um par de luvas descartáveis novas.</li>
    <li>☐ Colocar máscara limpa e nova.</li>
  </ul>
  <div style="${BOXH}">Materiais</div>
  <ul style="${CHECK}">
    <li>☐ Apresentar à cliente que o kit descartável está lacrado.</li>
    <li>☐ Apresentar os alicates esterilizados.</li>
    <li>☐ Organizar todos os materiais sobre a bancada.</li>
  </ul>
</div>
<p>Somente após estas etapas o procedimento poderá ser iniciado.</p>

<h2>9. Execução do Procedimento</h2>
<p>Executar exatamente na seguinte ordem:</p>
<ol>
  <li>Remover completamente o esmalte anterior.</li>
  <li>Lixar e cortar as unhas conforme a necessidade e preferência da cliente.</li>
  <li>Colocar a luva ou a botinha amolecedora (quando necessário).</li>
  <li>Realizar a cuticulagem.</li>
  <li>Aplicar a base.</li>
  <li>Realizar a esmaltação.</li>
  <li>Limpar cuidadosamente todos os cantos.</li>
  <li>Aplicar spray secante ou óleo secante.</li>
</ol>

<h2>10. Controle de Qualidade</h2>
<p>Antes de apresentar o resultado para a cliente, a profissional deverá verificar cuidadosamente:</p>
<div style="${BOX}">
  <ul style="${CHECK}">
    <li>☐ Uniformidade da esmaltação.</li>
    <li>☐ Cobertura completa.</li>
    <li>☐ Comprimento uniforme.</li>
    <li>☐ Formato correto.</li>
    <li>☐ Cutículas bem acabadas.</li>
    <li>☐ Cantos limpos.</li>
    <li>☐ Ausência de borrões.</li>
    <li>☐ Ausência de bolhas.</li>
    <li>☐ Ausência de resíduos.</li>
    <li>☐ Secagem adequada.</li>
  </ul>
</div>
<p>Caso exista qualquer detalhe passível de ajuste, a correção deverá ser realizada antes da apresentação à cliente.</p>

<h2>11. Validação da Cliente</h2>
<p>Após concluir o procedimento, apresentar o resultado à cliente. Perguntar obrigatoriamente:</p>
<blockquote>"A senhora gostou do resultado?"</blockquote>
<p>Em seguida:</p>
<blockquote>"Existe algum detalhe que gostaria que ajustássemos?"</blockquote>
<p>Caso a cliente solicite qualquer ajuste, este deverá ser realizado imediatamente. O atendimento somente poderá ser encerrado após a aprovação da cliente.</p>

<h2>12. Reagendamento</h2>
<p>Antes da saída da cliente, perguntar obrigatoriamente:</p>
<blockquote>"A senhora deseja deixar seu próximo atendimento já agendado?"</blockquote>
<p>Caso a cliente aceite:</p>
<ul>
  <li>Registrar o agendamento.</li>
  <li>Confirmar data e horário.</li>
</ul>
<p>Caso a cliente não aceite: agradecer normalmente pela preferência.</p>

<h2>13. Finalização</h2>
<p>Ao finalizar o atendimento, a profissional deverá:</p>
<ul>
  <li>Orientar sobre os cuidados para aumentar a durabilidade do serviço.</li>
  <li>Organizar completamente a estação de trabalho.</li>
  <li>Encaminhar os instrumentos para esterilização.</li>
  <li>Descartar corretamente todos os resíduos.</li>
</ul>
<p>Finalizar dizendo:</p>
<blockquote>"Muito obrigada pela preferência! Foi um prazer atendê-la. Esperamos revê-la em breve. Tenha um excelente dia!"</blockquote>

<h2>14. Não Conformidades</h2>
<p>Comunicar imediatamente à gerência quando ocorrer:</p>
<ul>
  <li>Corte na cliente.</li>
  <li>Sangramento.</li>
  <li>Reação alérgica.</li>
  <li>Instrumento sem esterilização.</li>
  <li>Material vencido.</li>
  <li>Reclamação da cliente.</li>
  <li>Falta de material.</li>
  <li>Quebra de equipamento.</li>
  <li>Atraso superior ao previsto.</li>
</ul>
<p>Registrar a ocorrência conforme procedimento interno.</p>

<h2>15. Indicadores de Qualidade</h2>
<p>A gerência deverá acompanhar:</p>
<ul>
  <li>Tempo médio do atendimento.</li>
  <li>Número de retrabalhos.</li>
  <li>Número de reclamações.</li>
  <li>Índice de satisfação da cliente.</li>
  <li>Percentual de reagendamentos.</li>
  <li>Vendas adicionais realizadas.</li>
</ul>

<h2>16. Checklist de Auditoria</h2>
<div style="${BOX}">
  <div style="${BOXH}">Atendimento</div>
  <ul style="${CHECK}">
    <li>☐ Cumprimentou a cliente.</li>
    <li>☐ Apresentou-se.</li>
    <li>☐ Confirmou o serviço.</li>
    <li>☐ Perguntou o que a cliente desejava.</li>
    <li>☐ Perguntou se havia preferência.</li>
    <li>☐ Perguntou se havia referência.</li>
    <li>☐ Explicou o que é possível fazer.</li>
    <li>☐ Explicou o que não é recomendado.</li>
  </ul>
  <div style="${BOXH}">Biossegurança</div>
  <ul style="${CHECK}">
    <li>☐ Utilizou luvas novas.</li>
    <li>☐ Utilizou máscara limpa.</li>
    <li>☐ Apresentou kit lacrado.</li>
    <li>☐ Apresentou alicates esterilizados.</li>
    <li>☐ Bancada limpa.</li>
  </ul>
  <div style="${BOXH}">Procedimento</div>
  <ul style="${CHECK}">
    <li>☐ Removeu o esmalte.</li>
    <li>☐ Lixou e cortou.</li>
    <li>☐ Colocou luva ou botinha.</li>
    <li>☐ Realizou a cuticulagem.</li>
    <li>☐ Aplicou a base.</li>
    <li>☐ Esmaltou.</li>
    <li>☐ Limpou os cantos.</li>
    <li>☐ Aplicou spray ou óleo secante.</li>
  </ul>
  <div style="${BOXH}">Controle de Qualidade</div>
  <ul style="${CHECK}">
    <li>☐ Conferiu todo o acabamento.</li>
    <li>☐ Corrigiu imperfeições.</li>
    <li>☐ Perguntou se a cliente gostou.</li>
    <li>☐ Perguntou se havia necessidade de ajustes.</li>
  </ul>
  <div style="${BOXH}">Encerramento</div>
  <ul style="${CHECK}">
    <li>☐ Ofereceu reagendamento.</li>
    <li>☐ Orientou sobre os cuidados.</li>
    <li>☐ Organizou a bancada.</li>
    <li>☐ Encaminhou os instrumentos para esterilização.</li>
    <li>☐ Agradeceu pela preferência.</li>
  </ul>
</div>

<h2>17. Critérios para Considerar o Serviço Concluído</h2>
<p>O atendimento somente poderá ser considerado concluído quando:</p>
<ul>
  <li>A cliente aprovar o resultado final.</li>
  <li>Todos os critérios de qualidade forem atendidos.</li>
  <li>Não houver necessidade de ajustes.</li>
  <li>O reagendamento tiver sido oferecido.</li>
  <li>Os instrumentos forem encaminhados para esterilização.</li>
  <li>A bancada estiver limpa e organizada.</li>
  <li>O atendimento for encerrado com cordialidade e agradecimento.</li>
</ul>
`.trim()

// ─── POPs da Recepção (mesmo formato/fonte do POP de Manicure) ───────────────

const REC_VENDAS = (perguntas: string[]) => `
<h2>6. Técnicas de Vendas e Fidelização (Obrigatórias)</h2>
<p>A recepcionista deverá atuar como <strong>consultora de beleza</strong>, buscando identificar oportunidades de novos serviços e garantir o retorno da cliente.</p>
<h3>Durante o Agendamento</h3>
<ul style="${CHECK}">
  <li>☐ Verificar se a cliente possui outros procedimentos em atraso.</li>
  <li>☐ Sugerir procedimentos complementares ao serviço solicitado.</li>
</ul>
<div style="${BOX}">
  <p style="${BOXH}">Exemplos de complementos</p>
  <ul>
    <li><strong>Escova</strong> → Oferecer hidratação ou nutrição.</li>
    <li><strong>Coloração</strong> → Oferecer cauterização ou reconstrução.</li>
    <li><strong>Manicure</strong> → Oferecer pedicure.</li>
    <li><strong>Design de sobrancelhas</strong> → Oferecer cílios.</li>
    <li><strong>Corte</strong> → Oferecer tratamento capilar.</li>
  </ul>
</div>
<h3>Perguntas Obrigatórias</h3>
${perguntas.map(p => `<blockquote>${p}</blockquote>`).join('\n')}
`.trim()

const REC_RECUPERACAO = `
<p>Caso <strong>NÃO</strong> haja disponibilidade (Recuperação de Agenda), a recepcionista deverá oferecer, nesta ordem:</p>
<ul style="${CHECK}">
  <li>☐ Outro horário.</li>
  <li>☐ Outra data.</li>
  <li>☐ Outro profissional.</li>
  <li>☐ Registrar o interesse da cliente para uma lista de espera.</li>
</ul>
<blockquote>"Neste horário não tenho disponibilidade com a profissional escolhida, porém tenho outra profissional altamente qualificada que poderá atendê-la. Gostaria que eu verificasse?"</blockquote>
`.trim()

const REC_CADASTRO = `
<p><strong>Cadastro:</strong> verificar se o cliente já possui cadastro. Caso não possua, cadastrar: <strong>Nome completo, Telefone, Data de nascimento e E-mail</strong> (quando possível). Registrar obrigatoriamente: <strong>"Como conheceu o salão?"</strong>.</p>
`.trim()

const REC_IDENT = (codigo: string, objetivo: string) => `
<h1>Procedimento Operacional Padrão (POP)</h1>
<p style="color:#6b6880;font-size:15px;margin:-4px 0 16px;font-weight:600">${codigo}</p>

<h2>1. Identificação</h2>
<div style="${META}">
  <p style="margin:0"><strong>Código:</strong> ${codigo.split(' — ')[0]} &nbsp;·&nbsp; <strong>Versão:</strong> 1.0 &nbsp;·&nbsp; <strong>Setor:</strong> Recepção</p>
  <p style="margin:8px 0 0"><strong>Responsável:</strong> <span style="${FIELD}"></span></p>
  <p style="margin:8px 0 0"><strong>Data de Emissão:</strong> ___/___/______ &nbsp;·&nbsp; <strong>Última Revisão:</strong> ___/___/______ &nbsp;·&nbsp; <strong>Próxima Revisão:</strong> ___/___/______</p>
</div>

<h2>2. Objetivo</h2>
<p>${objetivo}</p>

<h2>3. Campo de Aplicação</h2>
<p>Aplica-se a todos os recepcionistas do salão.</p>

<h2>4. Responsabilidades</h2>
<h3>Recepcionista</h3>
<ul>
  <li>Recepcionar/atender cordialmente o cliente.</li>
  <li>Realizar cadastro e atualização cadastral.</li>
  <li>Efetuar agendamentos.</li>
  <li>Aplicar técnicas de vendas e fidelização.</li>
  <li>Realizar reagendamentos preventivos.</li>
  <li>Encaminhar confirmações e lembretes.</li>
  <li>Divulgar campanhas vigentes.</li>
</ul>
<h3>Gerência</h3>
<ul>
  <li>Fiscalizar o cumprimento deste POP.</li>
  <li>Treinar continuamente a equipe.</li>
  <li>Acompanhar os indicadores de conversão.</li>
</ul>
`.trim()

const REC_INDICADORES = (itens: string[]) => `
<h2>10. Indicadores de Qualidade (Acompanhamento da Gerência)</h2>
<p>A gerência deverá acompanhar mensalmente:</p>
<ul style="${CHECK}">
${itens.map(i => `  <li>☐ ${i}</li>`).join('\n')}
</ul>
`.trim()

const REC_PRESENCIAL_HTML = `
${REC_IDENT('POP-REC-001 — Atendimento Presencial (Primeiro Contato)',
  'Padronizar o atendimento presencial realizado pela recepção, garantindo excelência no acolhimento, organização dos agendamentos, aplicação de técnicas de vendas, fidelização e máxima satisfação dos clientes.')}

<h2>5. Procedimento Operacional</h2>
<p><strong>Cliente chega ao salão:</strong></p>
<ol>
  <li>A recepcionista levanta-se imediatamente para recepcionar o cliente.</li>
  <li>Saudação obrigatória:</li>
</ol>
<blockquote>"Olá, bom dia! Seja muito bem-vindo(a) ao [Nome do Salão]. Meu nome é (nome da recepcionista). Como posso ajudar?"</blockquote>
<ol start="3">
  <li>O cliente solicita informações, orçamento ou agendamento.</li>
  <li>${REC_CADASTRO}</li>
  <li><strong>Identificação da necessidade</strong> — perguntar:
    <ul>
      <li>"Qual procedimento deseja realizar?"</li>
      <li>"Possui profissional de preferência?"</li>
      <li>"Possui disponibilidade de dias e horários?"</li>
    </ul>
  </li>
  <li><strong>Consulta da agenda:</strong> verificar disponibilidade com o profissional e horário solicitados.</li>
  <li>Caso haja disponibilidade: realizar o agendamento.</li>
</ol>
${REC_RECUPERACAO}
<p><strong>Confirmação</strong> — confirmar obrigatoriamente:</p>
<ul style="${CHECK}">
  <li>☐ Procedimento.</li>
  <li>☐ Profissional.</li>
  <li>☐ Data.</li>
  <li>☐ Horário.</li>
</ul>

${REC_VENDAS([
  '"Gostaria de aproveitar sua visita para realizar mais algum procedimento?"',
  '"Tem interesse em conhecer nossos tratamentos capilares?"',
  '"Posso verificar uma condição especial para fazer os dois procedimentos no mesmo dia?"',
])}
<h3>Identificação de Oportunidades</h3>
<p>A recepcionista deverá observar: clientes que realizam apenas um serviço; clientes sem retorno há mais de 45 dias; clientes que nunca realizaram tratamentos; clientes que compram serviços, mas não produtos. Sempre que possível, apresentar uma sugestão adequada ao perfil da cliente.</p>

<h2>7. Técnicas de Reagendamento</h2>
<p>Antes de encerrar qualquer atendimento ou agendamento, a recepcionista deverá oferecer o próximo horário.</p>
<blockquote>"Gostaria de já deixar sua próxima visita agendada para garantir o melhor horário?"</blockquote>
<div style="${BOX}">
  <p style="${BOXH}">Exemplos</p>
  <ul>
    <li><strong>Cabelo:</strong> "Normalmente recomendamos seu retorno em aproximadamente 30 dias. Posso deixar reservado?"</li>
    <li><strong>Unhas:</strong> "Posso deixar sua próxima manutenção agendada para daqui a 15 dias?"</li>
    <li><strong>Coloração:</strong> "Seu retoque costuma acontecer em cerca de 30 dias. Já gostaria de garantir sua vaga?"</li>
  </ul>
  <p style="${BOXH}">Benefícios que podem ser destacados</p>
  <ul>
    <li>Garantia do profissional preferido.</li>
    <li>Melhores horários disponíveis.</li>
    <li>Organização da rotina da cliente.</li>
    <li>Evita filas e espera.</li>
  </ul>
</div>

<h2>8. Envio da Confirmação</h2>
<p>Enviar imediatamente pelo WhatsApp.</p>
<blockquote>"Olá, (Nome)! Seu agendamento foi realizado com sucesso. 📅 Data: [Data] ⏰ Horário: [Horário] 💇 Procedimento: [Serviço] 👩‍🎨 Profissional: [Nome] Qualquer dúvida estamos à disposição. Equipe [Nome do Salão] 🧡"</blockquote>

<h2>9. Finalização</h2>
<blockquote>"Agradecemos sua preferência. Será um prazer recebê-lo(a). Tenha um excelente dia!"</blockquote>

${REC_INDICADORES([
  'Taxa de conversão de contatos em agendamentos.',
  'Taxa de comparecimento.',
  'Percentual de reagendamento.',
  'Ticket médio por cliente.',
  'Vendas adicionais realizadas.',
  'Número de clientes recuperadas.',
  'Taxa de ocupação da agenda.',
  'Agendamentos realizados por recepcionista.',
  'Índice de satisfação dos clientes.',
])}
`.trim()

const REC_WHATSAPP_HTML = `
${REC_IDENT('POP-REC-002 — Atendimento via WhatsApp (Primeiro Contato)',
  'Padronizar o atendimento realizado pelo WhatsApp, garantindo rapidez, conversão em agendamento, aplicação de técnicas de vendas e excelência na experiência do cliente.')}

<h2>5. Procedimento Operacional</h2>
<p><strong>Cliente entra em contato:</strong></p>
<ol>
  <li>Verificar se o nome do cliente aparece no perfil do WhatsApp.</li>
  <li>Se tiver nome:</li>
</ol>
<blockquote>"Olá, (Nome)! Tudo bem? 😃 Meu nome é (nome da recepcionista), sou o recepcionista do [Nome do Salão] que será responsável pelo seu agendamento. ✨"</blockquote>
<ol start="3">
  <li>Se NÃO tiver nome:</li>
</ol>
<blockquote>"Olá! Meu nome é (nome da recepcionista), sou o recepcionista do [Nome do Salão] que será responsável pelo seu atendimento 😊. Poderia me informar seu nome e sobrenome? ✨"</blockquote>
<ol start="4">
  <li>A recepcionista desenvolve a conversa para entender a necessidade.</li>
  <li>${REC_CADASTRO}</li>
  <li><strong>Identificação da necessidade</strong> — perguntar:
    <ul>
      <li>"Qual procedimento deseja realizar?"</li>
      <li>"Possui profissional de preferência?"</li>
      <li>"Qual a sua disponibilidade de dias e horários?"</li>
    </ul>
  </li>
  <li><strong>Consulta da agenda:</strong> verificar disponibilidade com o profissional e horário solicitados.</li>
  <li>Caso haja disponibilidade: realizar o agendamento.</li>
</ol>
${REC_RECUPERACAO}

${REC_VENDAS([
  '"Além desse serviço, gostaria de aproveitar sua visita para realizar mais algum procedimento?"',
  '"Tem interesse em conhecer nossos tratamentos capilares?"',
])}

<h2>7. Técnicas de Reagendamento</h2>
<p>Antes de encerrar qualquer atendimento ou agendamento, a recepcionista deverá oferecer o próximo horário.</p>
<blockquote>"Quando finalizar esse procedimento, posso deixar sua próxima manutenção pré-agendada para garantir sua vaga."</blockquote>

<h2>8. Finalização</h2>
<p>Mensagem obrigatória:</p>
<blockquote>"✨ (Nome da cliente), sou (nome da recepcionista) e estou finalizando seu atendimento. Seu agendamento foi realizado para: 📅 Data: [Data] ⏰ Horário: [Horário] 💇 Serviços: [Lista de Serviços] 👩‍🎨 Profissional: [Nome] Gostaria de agendar algo mais? ✨🧡"</blockquote>

<h2>9. Envio da Confirmação e Lembrete</h2>
<ul>
  <li>Enviar a mensagem de confirmação imediatamente.</li>
  <li>Um dia antes do atendimento, enviar a confirmação novamente:</li>
</ul>
<blockquote>"Olá, (Nome)! Passando para confirmar seu agendamento de amanhã às [Horário]. Estamos te aguardando! 🧡"</blockquote>

${REC_INDICADORES([
  'Taxa de conversão de WhatsApp.',
  'Percentual de reagendamento.',
  'Vendas adicionais.',
  'Ticket médio por cliente.',
  'Número de clientes recuperadas.',
  'Agendamentos realizados por recepcionista.',
  'Tempo médio de resposta no WhatsApp.',
])}
`.trim()

const REC_TELEFONE_HTML = `
${REC_IDENT('POP-REC-003 — Atendimento Telefônico (Primeiro Contato)',
  'Padronizar os atendimentos realizados por telefone, garantindo cordialidade, agilidade, conversão em agendamento, aplicação de técnicas de vendas e fidelização.')}

<h2>5. Procedimento Operacional</h2>
<p><strong>Cliente liga para o salão:</strong></p>
<ol>
  <li><strong>Atender obrigatoriamente até o terceiro toque.</strong></li>
  <li>Saudação padrão:</li>
</ol>
<blockquote>"[Nome do Salão], (Nome da Recepcionista), bom dia! Como posso ajudar?"</blockquote>
<ol start="3">
  <li>${REC_CADASTRO}</li>
  <li><strong>Identificação da necessidade</strong> — perguntar:
    <ul>
      <li>"Qual procedimento deseja realizar?"</li>
      <li>"Possui profissional de preferência?"</li>
      <li>"Qual a sua disponibilidade de dias e horários?"</li>
    </ul>
  </li>
  <li><strong>Consulta da agenda:</strong> verificar disponibilidade com o profissional e horário solicitados.</li>
  <li>Caso haja disponibilidade: realizar o agendamento.</li>
</ol>
${REC_RECUPERACAO}
<p><strong>Confirmação final</strong> — confirmar obrigatoriamente por telefone:</p>
<ul style="${CHECK}">
  <li>☐ Procedimento.</li>
  <li>☐ Data.</li>
  <li>☐ Horário.</li>
  <li>☐ Profissional.</li>
</ul>

${REC_VENDAS([
  '"Além desse procedimento, existe algum outro serviço que gostaria de aproveitar para fazer no mesmo dia?"',
  '"Tem interesse em conhecer nossos tratamentos capilares?"',
])}

<h2>7. Técnicas de Reagendamento</h2>
<p>Antes de encerrar qualquer atendimento ou agendamento, a recepcionista deverá oferecer o próximo horário.</p>
<blockquote>"Após esse atendimento, posso deixar sua próxima manutenção previamente reservada para garantir sua agenda."</blockquote>

<h2>8. Encerramento da Ligação</h2>
<blockquote>"Perfeito, seu horário está reservado. Será um prazer recebê-la no [Nome do Salão]."</blockquote>

<h2>9. Envio da Confirmação e Lembrete</h2>
<p>Enviar a mensagem de confirmação via WhatsApp imediatamente após a ligação:</p>
<blockquote>"✨ (Nome da cliente), sou (nome da recepcionista) e estou finalizando seu atendimento por telefone. Seu agendamento foi realizado para: 📅 Data: [Data] ⏰ Horário: [Horário] 💇 Serviços: [Lista de Serviços] 👩‍🎨 Profissional: [Nome] Gostaria de agendar algo mais? ✨🧡"</blockquote>
<p>Um dia antes do atendimento, enviar a confirmação novamente:</p>
<blockquote>"Olá, (Nome)! Passando para confirmar seu agendamento de amanhã às [Horário]. Estamos aguardando você. 🧡"</blockquote>

${REC_INDICADORES([
  'Taxa de conversão de contatos em agendamentos.',
  'Percentual de reagendamento.',
  'Vendas adicionais.',
  'Ticket médio por cliente.',
  'Número de clientes recuperadas.',
  'Agendamentos realizados por recepcionista.',
  'Tempo médio de atendimento telefônico.',
])}
`.trim()

// Tabelas simples (frases padrão / oportunidades)
const TBL = 'width:100%;border-collapse:collapse;margin:10px 0;font-size:13.5px'
const TH = 'background:#f7f6fb;color:#3b2e7a;text-align:left;padding:8px 12px;border:1px solid #e6e3f2;font-weight:700'
const TD = 'padding:8px 12px;border:1px solid #e6e3f2;vertical-align:top'

const REC_CHEGADA_HTML = `
<h1>Procedimento Operacional Padrão (POP)</h1>
<p style="color:#6b6880;font-size:15px;margin:-4px 0 16px;font-weight:600">POP-REC-006 — Atendimento Presencial (Chegada do Cliente)</p>

<h2>1. Identificação</h2>
<div style="${META}">
  <p style="margin:0"><strong>Código:</strong> POP-REC-006 &nbsp;·&nbsp; <strong>Versão:</strong> 1.0 &nbsp;·&nbsp; <strong>Setor:</strong> Recepção</p>
  <p style="margin:8px 0 0"><strong>Responsável:</strong> <span style="${FIELD}"></span></p>
  <p style="margin:8px 0 0"><strong>Data de Emissão:</strong> ___/___/______ &nbsp;·&nbsp; <strong>Última Revisão:</strong> ___/___/______ &nbsp;·&nbsp; <strong>Próxima Revisão:</strong> ___/___/______</p>
</div>

<h2>2. Objetivo</h2>
<p>Padronizar o atendimento presencial no momento da chegada do cliente, garantindo um acolhimento humanizado, organização do fluxo de atendimento, conforto durante a espera, e identificação de oportunidades de vendas adicionais e fidelização.</p>

<h2>3. Campo de Aplicação</h2>
<p>Aplica-se a todos os recepcionistas do salão, no momento em que o cliente chega para seu atendimento.</p>

<h2>4. Responsabilidades</h2>
<h3>Recepcionista</h3>
<ul>
  <li>Recepcionar o cliente com cordialidade e entusiasmo.</li>
  <li>Identificar o cliente e localizar seu agendamento.</li>
  <li>Acomodar o cliente confortavelmente.</li>
  <li>Oferecer bebidas e cardápio.</li>
  <li>Comunicar o profissional sobre a chegada do cliente.</li>
  <li>Acompanhar o fluxo do atendimento.</li>
  <li>Identificar oportunidades de vendas adicionais.</li>
  <li>Verificar procedimentos em atraso.</li>
  <li>Divulgar campanhas vigentes.</li>
</ul>
<h3>Gerência</h3>
<ul>
  <li>Fiscalizar o cumprimento deste POP.</li>
  <li>Treinar continuamente a equipe.</li>
  <li>Acompanhar os indicadores de satisfação e conversão.</li>
</ul>

<h2>5. Materiais Necessários</h2>
<ul style="${CHECK}">
  <li>☐ Cardápio de bebidas (café, chá, água, capuccino, etc.).</li>
  <li>☐ Bebidas disponíveis (café, chá, água, capuccino, etc.).</li>
  <li>☐ Sistema de agendamento/comanda (digital ou físico).</li>
  <li>☐ Lista de profissionais e suas áreas.</li>
  <li>☐ Material de divulgação de campanhas.</li>
  <li>☐ Produtos para demonstração (se disponível).</li>
</ul>

<h2>6. Procedimento Operacional</h2>
<p><strong>Cliente chega ao salão:</strong></p>
<ol>
  <li>A recepcionista levanta-se imediatamente para recepcionar o cliente.</li>
  <li>Saudação obrigatória:</li>
</ol>
<blockquote>"Olá, bom dia! Seja muito bem-vindo(a) ao [Nome do Salão]. No que podemos ajudar?"</blockquote>
<h3>Identificação do Cliente</h3>
<blockquote>"Qual é o seu nome, por favor?" · "A senhora tem agendamento conosco hoje?"</blockquote>
<h3>Cliente COM agendamento</h3>
<ul>
  <li>Localizar o agendamento no sistema.</li>
  <li>Abrir a comanda do cliente (digital ou física).</li>
  <li>Verificar os serviços agendados.</li>
  <li>Confirmar com o cliente:</li>
</ul>
<blockquote>"Confirmando, a senhora veio para [serviço] com [profissional], correto?"</blockquote>
<h3>Cliente SEM agendamento (Espontâneo)</h3>
<ul>
  <li>Verificar disponibilidade na agenda.</li>
  <li>Aplicar técnicas de recuperação de agenda (POP-REC-001).</li>
  <li>Tentar encaixar o cliente.</li>
  <li>Caso não seja possível, oferecer outro horário/data/profissional.</li>
</ul>
<h3>Acomodação do Cliente</h3>
<ul>
  <li>Conduzir o cliente à área de espera ou ao local onde será atendido.</li>
  <li>Oferecer bebidas:</li>
</ul>
<blockquote>"Enquanto aguarda, gostaria de um café, chá, água ou capuccino?"</blockquote>
<ul>
  <li>Entregar o cardápio de bebidas e apresentar as opções disponíveis.</li>
  <li>Oferecer algo diferenciado (ex.: capuccino especial, chá aromatizado).</li>
</ul>
<p>Garantir que o cliente esteja confortável:</p>
<ul style="${CHECK}">
  <li>☐ Assento disponível.</li>
  <li>☐ Revistas/rede social disponível.</li>
  <li>☐ Temperatura ambiente agradável.</li>
  <li>☐ Wi-Fi disponível (informar senha se necessário).</li>
</ul>

<h2>7. Comunicação com o Profissional</h2>
<p>A recepcionista deverá comunicar <strong>imediatamente</strong> o profissional sobre a chegada do cliente, informando obrigatoriamente: <strong>nome do cliente, procedimentos agendados e local onde o cliente está acomodado</strong>.</p>
<blockquote>"[Nome do Profissional], o(a) cliente [Nome do Cliente] chegou para [serviço]. Ela está acomodada na [área de espera/estação]."</blockquote>

<h2>8. Acompanhamento do Atendimento</h2>
<p>A recepcionista que acomodou o cliente é a responsável por acompanhar todo o procedimento. Verificar durante o atendimento:</p>
<ul style="${CHECK}">
  <li>☐ Se o cliente deixou de fazer algum serviço.</li>
  <li>☐ Se algum procedimento está em atraso (ex.: faz 45 dias que não faz hidratação).</li>
  <li>☐ Se o cliente demonstrou interesse em algum serviço ou produto.</li>
  <li>☐ Se há alguma campanha vigente que se aplique ao perfil do cliente.</li>
</ul>

<h2>9. Técnicas de Vendas e Identificação de Oportunidades (Durante a Espera)</h2>
<h3>A. Identificação de Procedimentos em Atraso</h3>
<p>A recepcionista deverá verificar no sistema o histórico do cliente:</p>
<ul style="${CHECK}">
  <li>☐ Última visita.</li>
  <li>☐ Procedimentos realizados.</li>
  <li>☐ Procedimentos que NUNCA foram realizados.</li>
  <li>☐ Procedimentos que estão em atraso (ex.: hidratação há mais de 30 dias).</li>
</ul>
<h3>B. Perguntas Obrigatórias Durante a Espera</h3>
<blockquote>"Percebi que já faz [X] dias que a senhora não faz um tratamento capilar. Gostaria de aproveitar hoje para fazer uma hidratação/nutrição?"</blockquote>
<blockquote>"Enquanto aguarda, posso te mostrar nossa nova linha de produtos? Temos um shampoo específico para seu tipo de cabelo."</blockquote>
<blockquote>"Aproveitando que você está aqui, temos uma campanha especial para quem faz [serviço A] + [serviço B]. Gostaria de conhecer?"</blockquote>
<blockquote>"Sabe que seu retoque de coloração já está na hora? Podemos já deixar agendado para daqui a 30 dias."</blockquote>
<h3>C. Sugestões Durante a Espera</h3>
<table style="${TBL}">
  <tr><th style="${TH}">Serviço Agendado</th><th style="${TH}">Oportunidade de Venda</th></tr>
  <tr><td style="${TD}">Escova</td><td style="${TD}">Hidratação, Nutrição, Tratamento capilar</td></tr>
  <tr><td style="${TD}">Coloração</td><td style="${TD}">Cauterização, Reconstrução, Retoque agendado</td></tr>
  <tr><td style="${TD}">Corte</td><td style="${TD}">Tratamento capilar, Hidratação</td></tr>
  <tr><td style="${TD}">Manicure</td><td style="${TD}">Pedicure, Esmaltação em gel</td></tr>
  <tr><td style="${TD}">Pedicure</td><td style="${TD}">Manicure, Esfoliação nos pés</td></tr>
  <tr><td style="${TD}">Design de sobrancelhas</td><td style="${TD}">Cílios (extensão ou coloração), Henna</td></tr>
  <tr><td style="${TD}">Cílios</td><td style="${TD}">Design de sobrancelhas</td></tr>
  <tr><td style="${TD}">Tratamento capilar</td><td style="${TD}">Corte, Escova, Coloração</td></tr>
</table>
<h3>D. Divulgação de Campanhas</h3>
<blockquote>"Estamos com uma promoção especial: [descrição da campanha]. Gostaria de aproveitar?"</blockquote>
<blockquote>"Este mês temos um combo de [serviços] com desconto especial. Posso te explicar?"</blockquote>

<h2>10. Finalização da Chegada</h2>
<p>Após acomodar o cliente e comunicar o profissional, a recepcionista deverá:</p>
<ul style="${CHECK}">
  <li>☐ Registrar a chegada no sistema.</li>
  <li>☐ Marcar o cliente como "em atendimento".</li>
  <li>☐ Informar a gerência se houver alguma oportunidade identificada.</li>
  <li>☐ Acompanhar discretamente o fluxo do atendimento.</li>
</ul>

<h2>11. Frases de Encerramento da Chegada</h2>
<blockquote>"Em breve o(a) [Profissional] irá te atender. Fique à vontade!"</blockquote>
<blockquote>"Qualquer coisa, estou aqui para ajudar. Aproveite enquanto espera para dar uma olhada em nosso cardápio de serviços."</blockquote>
<blockquote>"Se precisar de algo, é só me chamar."</blockquote>
`.trim()

const REC_FINALIZACAO_HTML = `
<h1>Procedimento Operacional Padrão (POP)</h1>
<p style="color:#6b6880;font-size:15px;margin:-4px 0 16px;font-weight:600">POP-REC-007 — Atendimento Presencial (Finalização do Procedimento)</p>

<h2>1. Identificação</h2>
<div style="${META}">
  <p style="margin:0"><strong>Código:</strong> POP-REC-007 &nbsp;·&nbsp; <strong>Versão:</strong> 1.0 &nbsp;·&nbsp; <strong>Setor:</strong> Recepção</p>
  <p style="margin:8px 0 0"><strong>Responsável:</strong> <span style="${FIELD}"></span></p>
  <p style="margin:8px 0 0"><strong>Data de Emissão:</strong> ___/___/______ &nbsp;·&nbsp; <strong>Última Revisão:</strong> ___/___/______ &nbsp;·&nbsp; <strong>Próxima Revisão:</strong> ___/___/______</p>
</div>

<h2>2. Objetivo</h2>
<p>Padronizar o atendimento presencial no momento da finalização do procedimento, garantindo uma experiência de fechamento com excelência, conferência correta dos serviços, aplicação de técnicas de vendas para aumento de ticket médio, fidelização através do reagendamento, e coleta de feedback para melhoria contínua.</p>

<h2>3. Campo de Aplicação</h2>
<p>Aplica-se a todos os recepcionistas do salão, no momento em que o cliente finaliza seu procedimento e se dirige ao caixa/recepção para pagamento.</p>

<h2>4. Responsabilidades</h2>
<h3>Recepcionista</h3>
<ul>
  <li>Recepcionar o cliente com cordialidade.</li>
  <li>Identificar o cliente e localizar sua comanda.</li>
  <li>Conferir todos os procedimentos realizados.</li>
  <li>Verificar lançamentos com o profissional (se necessário).</li>
  <li>Apresentar o valor total com clareza.</li>
  <li>Registrar a forma de pagamento.</li>
  <li>Emitir nota fiscal com CPF (se solicitado).</li>
  <li>Entregar cupom para estacionamento (se aplicável).</li>
  <li>Aplicar técnicas de vendas para serviços adicionais.</li>
  <li>Oferecer reagendamento preventivo.</li>
  <li>Enviar mensagem de feedback no dia seguinte.</li>
  <li>Registrar indicadores de venda.</li>
</ul>
<h3>Gerência</h3>
<ul>
  <li>Fiscalizar o cumprimento deste POP.</li>
  <li>Treinar continuamente a equipe.</li>
  <li>Acompanhar os indicadores de conversão e ticket médio.</li>
</ul>

<h2>5. Materiais Necessários</h2>
<ul style="${CHECK}">
  <li>☐ Sistema de comanda/agendamento.</li>
  <li>☐ Leitor de cartão/Máquina de cartão.</li>
  <li>☐ Nota fiscal eletrônica (sistema).</li>
  <li>☐ Cupom de estacionamento (se aplicável).</li>
  <li>☐ Material de divulgação de campanhas.</li>
  <li>☐ Produtos para venda (exibição).</li>
  <li>☐ Lista de preços atualizada.</li>
  <li>☐ Modelo de mensagem de feedback.</li>
</ul>

<h2>6. Procedimento Operacional</h2>
<p><strong>Cliente finaliza o serviço e se dirige à recepção:</strong></p>
<ol>
  <li>A recepcionista levanta-se (se possível) para atender o cliente.</li>
  <li>Saudação obrigatória:</li>
</ol>
<blockquote>"Olá, tudo bem? Qual é o seu nome, por favor?"</blockquote>
<h3>Abertura da Comanda</h3>
<p>Localizar a comanda do cliente no sistema e verificar se todos os serviços foram lançados corretamente. Verificar se há:</p>
<ul style="${CHECK}">
  <li>☐ Serviços adicionais realizados (ex.: o profissional ofereceu algo a mais).</li>
  <li>☐ Produtos adicionais lançados (ex.: shampoo, condicionador, etc.).</li>
  <li>☐ Descontos ou cortesias aplicados.</li>
</ul>
<h3>Conferência dos Procedimentos com o Cliente</h3>
<blockquote>"Conferindo aqui, a senhora realizou os seguintes serviços hoje: [listar serviços]. Está correto?"</blockquote>
<ul>
  <li><strong>Caso o cliente confirme:</strong> prosseguir para o pagamento.</li>
  <li><strong>Caso o cliente questione ou tenha dúvida:</strong></li>
</ul>
<blockquote>"Com licença, vou verificar esses lançamentos com o profissional e já volto."</blockquote>
<p>Dirigir-se ao profissional para confirmar os serviços realizados; retornar ao cliente e explicar ou corrigir o lançamento.</p>
<h3>Apresentação do Valor</h3>
<blockquote>"O valor total do seu atendimento hoje ficou R$ [valor]."</blockquote>
<p>Se o cliente demonstrar surpresa, explicar detalhadamente os valores de cada serviço:</p>
<blockquote>"O valor é composto por [serviço A] R$ [valor] + [serviço B] R$ [valor]..."</blockquote>
<h3>Forma de Pagamento</h3>
<blockquote>"Qual será a forma de pagamento? Aceitamos dinheiro, cartão de crédito, débito e Pix."</blockquote>
<ul>
  <li><strong>Se cartão:</strong> perguntar se é crédito ou débito ("Será crédito ou débito?"), registrar o valor e finalizar a venda.</li>
  <li><strong>Se dinheiro:</strong> confirmar o valor recebido e devolver o troco com agilidade e cortesia.</li>
  <li><strong>Se Pix:</strong> apresentar o QR Code ("Aqui está o QR Code para pagamento via Pix.").</li>
</ul>
<h3>Perguntas Obrigatórias no Momento do Pagamento</h3>
<p><strong>A. Nota Fiscal:</strong></p>
<blockquote>"Gostaria de incluir o CPF na Nota Fiscal?"</blockquote>
<p>Se sim: "Poderia me informar seu CPF, por favor?" e registrar no sistema. Se não: prosseguir sem nota.</p>
<p><strong>B. Cupom de Estacionamento (se aplicável):</strong></p>
<blockquote>"A senhora precisa do cupom de estacionamento?"</blockquote>
<p>Se sim: "Aqui está o cupom para liberar na saída."</p>

<h2>7. Técnicas de Vendas e Aumento de Ticket Médio no Momento do Pagamento</h2>
<h3>A. Venda de Produtos (Cross-Selling)</h3>
<p>A recepcionista deverá oferecer produtos antes de finalizar a venda.</p>
<blockquote>"Gostaria de levar o shampoo/condicionador que usamos em seu atendimento? Ele é específico para seu tipo de cabelo."</blockquote>
<blockquote>"Temos um kit de manutenção que vai ajudar seu resultado a durar muito mais. Posso te mostrar?"</blockquote>
<blockquote>"Aproveite que está aqui e conheça nossos produtos com preço especial para clientes."</blockquote>
<blockquote>"O óleo finalizador que usamos hoje é excelente para manter o brilho. Gostaria de levar?"</blockquote>
<h3>B. Oferta de Serviços Futuros (Up-Selling)</h3>
<blockquote>"Para a próxima visita, gostaria de incluir um tratamento diferenciado?"</blockquote>
<blockquote>"Sabe que temos uma promoção especial para quem faz [serviço A] + [serviço B]? Gostaria de agendar para a próxima visita?"</blockquote>
<blockquote>"A senhora já conhece nosso tratamento de [serviço]? Ele é excelente e tem feito muito sucesso."</blockquote>
<h3>C. Ofertas Combinadas (Bundle)</h3>
<blockquote>"Temos um combo especial: [serviço A] + [serviço B] por apenas R$ XXX. Gostaria de agendar para a próxima visita?"</blockquote>
<blockquote>"Se levar este produto hoje, ganha um [brinde ou desconto] no próximo serviço."</blockquote>

<h2>8. Finalização da Venda</h2>
<ul>
  <li>Registrar o pagamento no sistema.</li>
  <li>Entregar o comprovante (se solicitado).</li>
  <li>Agradecer o pagamento.</li>
</ul>

<h2>9. Técnicas de Fidelização e Reagendamento</h2>
<h3>A. Reagendamento Imediato</h3>
<p>Antes do cliente sair, a recepcionista deverá oferecer o próximo horário.</p>
<blockquote>"A senhora gostaria de agendar uma próxima visita?"</blockquote>
<div style="${BOX}">
  <p style="${BOXH}">Exemplos por serviço</p>
  <ul>
    <li><strong>Cabelo (corte/coloração):</strong> "Normalmente recomendamos seu retorno em aproximadamente 30 dias. Posso deixar reservado?"</li>
    <li><strong>Cabelo (hidratação/tratamento):</strong> "A manutenção do tratamento é recomendada a cada 15 dias. Posso agendar a próxima?"</li>
    <li><strong>Unhas (manicure):</strong> "Posso deixar sua próxima manutenção agendada para daqui a 15 dias?"</li>
    <li><strong>Sobrancelhas:</strong> "Recomendamos a manutenção em 30 dias. Já gostaria de garantir sua vaga?"</li>
    <li><strong>Coloração (retoque):</strong> "Seu retoque costuma acontecer em cerca de 30 dias. Já gostaria de garantir sua vaga?"</li>
  </ul>
</div>
<h3>B. Benefícios a Serem Destacados</h3>
<ul style="${CHECK}">
  <li>☐ Garantia do profissional preferido.</li>
  <li>☐ Melhores horários disponíveis.</li>
  <li>☐ Organização da rotina da cliente.</li>
  <li>☐ Evita filas e espera.</li>
  <li>☐ Condições especiais para quem reagenda.</li>
</ul>

<h2>10. Encerramento do Atendimento</h2>
<blockquote>"Muito obrigado pela sua visita, (Nome)! Foi um prazer atender você hoje. Esperamos vê-la em breve."</blockquote>
<ul>
  <li><strong>Se agendou:</strong> "Não se esqueça: seu próximo agendamento já está reservado para [Data/Horário] com [Profissional]."</li>
  <li><strong>Se não agendou:</strong> "Quando decidir voltar, é só nos chamar. Estaremos à disposição!"</li>
</ul>
<blockquote>"Tenha um excelente dia! Até a próxima."</blockquote>

<h2>11. Pós-Atendimento (Dia Seguinte)</h2>
<h3>A. Envio de Mensagem de Feedback</h3>
<p>No dia seguinte ao atendimento, a recepcionista deverá enviar a mensagem padrão de feedback.</p>
<blockquote>"Olá (Nome)! Tudo bem?<br/><br/>O [Nome do Salão] busca oferecer serviços de qualidade aos clientes. Gostaríamos de saber como foi a sua experiência no salão. Sua opinião é importante para nortear nossas ações em busca de um atendimento cada vez melhor. 🧡🎋<br/><br/>Agradecemos a colaboração!<br/><br/>Caso não queira se identificar, mande seu feedback pelo link:<br/>[Link da Pesquisa]"</blockquote>
<h3>B. Agendamento Online (se disponível)</h3>
<blockquote>"Lembre-se que você pode agendar online pelo site:<br/>[Link do Agendamento]"</blockquote>

<h2>12. Indicadores de Qualidade (Acompanhamento da Gerência)</h2>
<p>A gerência deverá acompanhar mensalmente:</p>
<ul style="${CHECK}">
  <li>☐ Percentual de reagendamento (pós-serviço).</li>
  <li>☐ Ticket médio por cliente.</li>
  <li>☐ Vendas de produtos adicionais.</li>
  <li>☐ Vendas de serviços adicionais (up-selling).</li>
  <li>☐ Número de clientes que compraram combos/bundles.</li>
  <li>☐ Índice de satisfação do cliente (pesquisa de feedback).</li>
  <li>☐ Taxa de retorno de pesquisas de satisfação.</li>
  <li>☐ Número de clientes que utilizaram agendamento online.</li>
  <li>☐ Percentual de CPF incluído na nota fiscal (controle fiscal).</li>
  <li>☐ Reclamações ou dúvidas sobre valores.</li>
</ul>

<h2>13. Checklist de Auditoria (Chegada do Cliente — POP-REC-006)</h2>
<ul style="${CHECK}">
  <li>☐ Recepcionista levantou para recepcionar.</li>
  <li>☐ Cumprimentou o cliente cordialmente.</li>
  <li>☐ Identificou o cliente e localizou agendamento.</li>
  <li>☐ Abriu a comanda corretamente.</li>
  <li>☐ Acomodou o cliente com conforto.</li>
  <li>☐ Ofereceu café, água, chá ou capuccino.</li>
  <li>☐ Entregou o cardápio de bebidas.</li>
  <li>☐ Comunicou o profissional (nome, serviço, local).</li>
  <li>☐ Acompanhou o atendimento.</li>
  <li>☐ Verificou procedimentos em atraso.</li>
  <li>☐ Aplicou técnicas de vendas (complementares).</li>
  <li>☐ Divulgou campanhas vigentes.</li>
  <li>☐ Registrou a chegada no sistema.</li>
</ul>

<h2>14. Checklist de Auditoria (Finalização — POP-REC-007)</h2>
<h3>Conferência e Pagamento</h3>
<ul style="${CHECK}">
  <li>☐ Recepcionista atendeu com cordialidade.</li>
  <li>☐ Identificou o cliente.</li>
  <li>☐ Abriu a comanda.</li>
  <li>☐ Conferiu procedimentos com o cliente.</li>
  <li>☐ Na dúvida, confirmou com o profissional.</li>
  <li>☐ Apresentou o valor total com clareza.</li>
  <li>☐ Perguntou a forma de pagamento.</li>
  <li>☐ Perguntou se deseja CPF na nota.</li>
  <li>☐ Perguntou se deseja cupom de estacionamento.</li>
  <li>☐ Finalizou a venda corretamente.</li>
</ul>
<h3>Técnicas de Vendas e Fidelização</h3>
<ul style="${CHECK}">
  <li>☐ Ofereceu produtos complementares.</li>
  <li>☐ Ofereceu serviços futuros.</li>
  <li>☐ Ofereceu combos/pacotes.</li>
  <li>☐ Ofereceu reagendamento preventivo.</li>
  <li>☐ Destacou benefícios do reagendamento.</li>
  <li>☐ Agradeceu e encerrou com cordialidade.</li>
</ul>
<h3>Pós-Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Enviou mensagem de feedback no dia seguinte.</li>
  <li>☐ Incluiu link de agendamento online.</li>
  <li>☐ Registrou indicadores no sistema.</li>
</ul>

<h2>15. Frases e Scripts Complementares</h2>
<h3>A. Para Clientes com Agendamento</h3>
<table style="${TBL}">
  <tr><th style="${TH}">Situação</th><th style="${TH}">Frase Padrão</th></tr>
  <tr><td style="${TD}">Chegada</td><td style="${TD}">"Olá, (Nome)! Seja bem-vinda! Vou abrir sua comanda e já avisar a [Profissional]."</td></tr>
  <tr><td style="${TD}">Oferecendo bebida</td><td style="${TD}">"Enquanto aguarda, posso oferecer um café, chá, água ou capuccino?"</td></tr>
  <tr><td style="${TD}">Comunicando profissional</td><td style="${TD}">"[Profissional], a [Cliente] chegou para [serviço]. Ela está acomodada na área de espera."</td></tr>
  <tr><td style="${TD}">Identificando oportunidade</td><td style="${TD}">"Percebi que já faz 45 dias que a senhora não faz um tratamento capilar. Gostaria de aproveitar hoje?"</td></tr>
</table>
<h3>B. Para Clientes sem Agendamento</h3>
<table style="${TBL}">
  <tr><th style="${TH}">Situação</th><th style="${TH}">Frase Padrão</th></tr>
  <tr><td style="${TD}">Chegada</td><td style="${TD}">"Olá! A senhora tem agendamento conosco hoje?"</td></tr>
  <tr><td style="${TD}">Agenda cheia</td><td style="${TD}">"Hoje não temos disponibilidade com a [Profissional], mas tenho outra profissional altamente qualificada que pode atendê-la. Gostaria que eu verificasse?"</td></tr>
  <tr><td style="${TD}">Sem horário</td><td style="${TD}">"Temos um horário amanhã às [horário], gostaria de agendar?"</td></tr>
</table>
<h3>C. Para Clientes com Dúvida no Pagamento</h3>
<table style="${TBL}">
  <tr><th style="${TH}">Situação</th><th style="${TH}">Frase Padrão</th></tr>
  <tr><td style="${TD}">Dúvida no valor</td><td style="${TD}">"Com licença, vou verificar esses lançamentos com a [Profissional] e já volto."</td></tr>
  <tr><td style="${TD}">Cliente questiona</td><td style="${TD}">"O valor é composto por [serviço A] R$ [valor] + [serviço B] R$ [valor]. Está correto?"</td></tr>
  <tr><td style="${TD}">Cliente quer parcelar</td><td style="${TD}">"Aceitamos parcelamento em [X] vezes no cartão de crédito. Gostaria de parcelar?"</td></tr>
</table>
`.trim()

const PRO_ATENDIMENTO_HTML = `
<h1>Procedimento Operacional Padrão (POP)</h1>
<p style="color:#6b6880;font-size:15px;margin:-4px 0 16px;font-weight:600">POP-PRO-001 — Atendimento do Profissional (Execução e Finalização do Serviço)</p>

<h2>1. Identificação</h2>
<div style="${META}">
  <p style="margin:0"><strong>Código:</strong> POP-PRO-001 &nbsp;·&nbsp; <strong>Versão:</strong> 1.0 &nbsp;·&nbsp; <strong>Setor:</strong> Profissionais (Manicure, Cabeleireiro, Esteticista, etc.)</p>
  <p style="margin:8px 0 0"><strong>Responsável:</strong> <span style="${FIELD}"></span></p>
  <p style="margin:8px 0 0"><strong>Data de Emissão:</strong> ___/___/______ &nbsp;·&nbsp; <strong>Última Revisão:</strong> ___/___/______ &nbsp;·&nbsp; <strong>Próxima Revisão:</strong> ___/___/______</p>
</div>

<h2>2. Objetivo</h2>
<p>Padronizar o atendimento do profissional durante a execução do serviço e finalização, garantindo excelência técnica, segurança, biossegurança, aplicação de técnicas de vendas para aumento de ticket médio, fidelização através do reagendamento e uma experiência única para o cliente.</p>

<h2>3. Campo de Aplicação</h2>
<p>Aplica-se a todos os profissionais responsáveis pelos serviços do salão (manicure, cabeleireiro, esteticista, designer de sobrancelhas, etc.).</p>

<h2>4. Responsabilidades</h2>
<h3>Profissional</h3>
<ul>
  <li>Cumprir integralmente este POP.</li>
  <li>Manter postura ética e profissional.</li>
  <li>Zelar pela segurança e bem-estar do cliente.</li>
  <li>Cumprir todas as normas de biossegurança.</li>
  <li>Garantir a qualidade técnica do serviço.</li>
  <li>Aplicar técnicas de vendas (up-selling e cross-selling).</li>
  <li>Oferecer reagendamento preventivo.</li>
  <li>Manter sua estação limpa e organizada.</li>
  <li>Realizar lançamento dos serviços no sistema.</li>
  <li>Acompanhar o cliente até a recepção.</li>
  <li>Oferecer produtos para venda.</li>
</ul>
<h3>Recepção</h3>
<ul>
  <li>Confirmar o agendamento.</li>
  <li>Recepcionar o cliente.</li>
  <li>Acomodar o cliente.</li>
  <li>Registrar reagendamentos.</li>
  <li>Informar à gerência qualquer ocorrência.</li>
</ul>
<h3>Gerência</h3>
<ul>
  <li>Fiscalizar o cumprimento deste POP.</li>
  <li>Treinar continuamente a equipe.</li>
  <li>Realizar auditorias periódicas.</li>
  <li>Acompanhar os indicadores de conversão e ticket médio.</li>
</ul>

<h2>5. Materiais Necessários</h2>
<h3>EPIs</h3>
<ul style="${CHECK}">
  <li>☐ Luvas descartáveis novas.</li>
  <li>☐ Máscara limpa.</li>
  <li>☐ Avental.</li>
  <li>☐ Touca (se necessário).</li>
</ul>
<h3>Materiais (Manicure)</h3>
<ul style="${CHECK}">
  <li>☐ Kit descartável lacrado.</li>
  <li>☐ Alicates esterilizados.</li>
  <li>☐ Lixas.</li>
  <li>☐ Palito.</li>
  <li>☐ Espátula.</li>
  <li>☐ Algodão.</li>
  <li>☐ Removedor de esmalte.</li>
  <li>☐ Base.</li>
  <li>☐ Esmaltes.</li>
  <li>☐ Spray secante ou óleo secante.</li>
  <li>☐ Toalha limpa.</li>
  <li>☐ Lixeira.</li>
</ul>
<h3>Materiais (Cabelo)</h3>
<ul style="${CHECK}">
  <li>☐ Kit descartável lacrado (toalha, capa).</li>
  <li>☐ Tesouras esterilizadas.</li>
  <li>☐ Pentes e escovas.</li>
  <li>☐ Produtos químicos (tintas, descolorantes, etc.).</li>
  <li>☐ Produtos de tratamento (máscaras, óleos, etc.).</li>
  <li>☐ Toalhas limpas.</li>
  <li>☐ Lixeira.</li>
</ul>
<h3>Materiais (Sobrancelhas/Cílios)</h3>
<ul style="${CHECK}">
  <li>☐ Kit descartável lacrado.</li>
  <li>☐ Pinças esterilizadas.</li>
  <li>☐ Tesouras esterilizadas.</li>
  <li>☐ Produtos específicos (henna, coloração, etc.).</li>
  <li>☐ Toalhas limpas.</li>
  <li>☐ Lixeira.</li>
</ul>

<h2>6. Biossegurança</h2>
<h3>Antes do Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Higienizar corretamente as mãos.</li>
  <li>☐ Manter uniforme limpo.</li>
  <li>☐ Manter cabelos presos.</li>
  <li>☐ Utilizar luvas descartáveis novas.</li>
  <li>☐ Utilizar máscara limpa.</li>
  <li>☐ Conferir a limpeza da bancada.</li>
  <li>☐ Conferir se todos os instrumentos estão esterilizados.</li>
  <li>☐ Conferir validade da esterilização.</li>
  <li>☐ Organizar todos os materiais antes do atendimento.</li>
  <li>☐ Verificar se o kit descartável está lacrado.</li>
</ul>
<h3>Durante o Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Manter a bancada organizada.</li>
  <li>☐ Não utilizar telefone celular.</li>
  <li>☐ Não consumir alimentos.</li>
  <li>☐ Trocar as luvas sempre que necessário.</li>
  <li>☐ Evitar contaminação cruzada.</li>
</ul>
<h3>Após o Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Descartar corretamente os materiais descartáveis.</li>
  <li>☐ Encaminhar os instrumentos para esterilização.</li>
  <li>☐ Higienizar toda a bancada.</li>
  <li>☐ Higienizar as mãos.</li>
  <li>☐ Preparar a estação para a próxima cliente.</li>
</ul>

<h2>7. Procedimento Operacional</h2>

<h3>PARTE A — Início do Atendimento</h3>
<p><strong>Profissional é chamado pela recepção</strong> — recebe a informação: nome do cliente, procedimentos agendados e local onde o cliente está acomodado; e se dirige ao cliente.</p>
<p><strong>1. Apresentação do Profissional</strong> — sempre iniciar o atendimento de frente para o cliente, demonstrando simpatia, cordialidade e profissionalismo.</p>
<blockquote>"Olá (Nome do cliente), meu nome é (Nome do Profissional) e hoje eu serei o(a) responsável pelo seu atendimento."</blockquote>
<p><strong>2. Confirmação do Serviço</strong></p>
<blockquote>"A senhora irá fazer [serviço] hoje, correto?"</blockquote>
<p><strong>3. Identificação da Necessidade</strong></p>
<blockquote>"O que a senhora pensou para hoje?"</blockquote>
<blockquote>"A senhora possui alguma preferência ou alguma foto de referência?"</blockquote>
<p><strong>4. Ponderações e Orientações</strong> — após ouvir atentamente o cliente, explicar de forma clara e profissional:</p>
<ul style="${CHECK}">
  <li>☐ O que é possível realizar.</li>
  <li>☐ O que não é recomendado realizar.</li>
  <li>☐ As limitações técnicas do procedimento.</li>
  <li>☐ Os cuidados necessários para preservar a saúde (unhas, cabelo, pele, etc.).</li>
</ul>
<blockquote>"Baseado no que a senhora deseja, é possível fazer [explicar o que dá para fazer]."</blockquote>
<blockquote>"Não recomendamos [explicar o que não é recomendado] porque [explicar o motivo]."</blockquote>
<blockquote>"Para manter o resultado por mais tempo, é importante [explicar os cuidados]."</blockquote>
<p><strong>Nenhum procedimento deverá ser iniciado antes que o cliente compreenda e concorde com o serviço que será realizado.</strong></p>

<h3>PARTE B — Preparação do Profissional e Materiais</h3>
<p><strong>5. Preparação para o Procedimento</strong></p>
<p><strong>A. Equipamentos de Proteção (EPIs):</strong></p>
<ul style="${CHECK}">
  <li>☐ Colocar um par de luvas descartáveis novas.</li>
  <li>☐ Colocar máscara limpa e nova.</li>
  <li>☐ Colocar avental (se necessário).</li>
  <li>☐ Colocar touca (se necessário).</li>
</ul>
<p><strong>B. Materiais:</strong></p>
<ul style="${CHECK}">
  <li>☐ Apresentar ao cliente que o kit descartável está lacrado.</li>
  <li>☐ Apresentar os alicates/instrumentos esterilizados.</li>
  <li>☐ Organizar todos os materiais sobre a bancada.</li>
  <li>☐ Verificar se todos os produtos estão dentro da validade.</li>
</ul>
<p><strong>C. Frases Obrigatórias ao Apresentar Materiais:</strong></p>
<blockquote>"Todos os nossos instrumentos são esterilizados para sua segurança."</blockquote>
<blockquote>"Este kit descartável é lacrado e utilizado exclusivamente para você."</blockquote>
<blockquote>"Os alicates foram esterilizados em autoclave e estão prontos para uso."</blockquote>
<p><strong>Somente após estas etapas o procedimento poderá ser iniciado.</strong></p>

<h3>PARTE C — Execução do Procedimento</h3>
<p><strong>6. Execução do Serviço (Exemplo: Manicure)</strong> — executar na seguinte ordem:</p>
<ul style="${CHECK}">
  <li>☐ Remover completamente o esmalte anterior.</li>
  <li>☐ Lixar e cortar as unhas conforme a necessidade e preferência do cliente.</li>
  <li>☐ Colocar a luva ou a botinha amolecedora (quando necessário).</li>
  <li>☐ Realizar a cuticulagem.</li>
  <li>☐ Aplicar a base.</li>
  <li>☐ Realizar a esmaltação.</li>
  <li>☐ Limpar cuidadosamente todos os cantos.</li>
  <li>☐ Aplicar spray secante ou óleo secante.</li>
</ul>
<p><strong>7. Execução do Serviço (Exemplo: Cabelo)</strong> — executar na seguinte ordem:</p>
<ul style="${CHECK}">
  <li>☐ Lavar o cabelo com shampoo adequado.</li>
  <li>☐ Aplicar condicionador ou máscara (se necessário).</li>
  <li>☐ Realizar o corte/modelagem.</li>
  <li>☐ Realizar coloração/descoloração (se aplicável).</li>
  <li>☐ Aplicar tratamento (hidratação, nutrição, reconstrução).</li>
  <li>☐ Finalizar com secagem e escova/modelagem.</li>
  <li>☐ Aplicar produtos finalizadores (óleos, sprays, etc.).</li>
</ul>
<p><strong>8. Técnicas de Vendas Durante a Execução (Up-Selling e Cross-Selling)</strong></p>
<p><strong>A. Oferecimento de Serviços Complementares:</strong></p>
<blockquote>"Percebi que seu cabelo está precisando de uma hidratação profunda. Gostaria de incluir hoje?"</blockquote>
<blockquote>"Já que estamos fazendo a coloração, recomendo uma reconstrução para selar a cutícula e prolongar a cor. O que acha?"</blockquote>
<blockquote>"Suas unhas ficariam ainda mais bonitas com uma esmaltação em gel. Gostaria de experimentar?"</blockquote>
<blockquote>"Enquanto fazemos o design de sobrancelhas, podemos fazer seus cílios também. Fica um resultado incrível!"</blockquote>
<p><strong>B. Sugestões por Tipo de Serviço:</strong></p>
<table style="${TBL}">
  <tr><th style="${TH}">Serviço Agendado</th><th style="${TH}">Sugestão de Serviço Complementar</th></tr>
  <tr><td style="${TD}">Escova</td><td style="${TD}">Hidratação, Nutrição, Tratamento capilar</td></tr>
  <tr><td style="${TD}">Coloração</td><td style="${TD}">Cauterização, Reconstrução, Hidratação profunda</td></tr>
  <tr><td style="${TD}">Corte</td><td style="${TD}">Tratamento capilar, Escova modeladora</td></tr>
  <tr><td style="${TD}">Manicure</td><td style="${TD}">Pedicure, Esmaltação em gel</td></tr>
  <tr><td style="${TD}">Pedicure</td><td style="${TD}">Manicure, Esfoliação nos pés</td></tr>
  <tr><td style="${TD}">Design de sobrancelhas</td><td style="${TD}">Cílios (extensão ou coloração), Henna</td></tr>
  <tr><td style="${TD}">Cílios</td><td style="${TD}">Design de sobrancelhas</td></tr>
  <tr><td style="${TD}">Tratamento capilar</td><td style="${TD}">Corte, Escova, Coloração</td></tr>
</table>
<p><strong>C. Ofertas de Produtos (Cross-Selling) Durante o Atendimento:</strong></p>
<blockquote>"Estou usando um shampoo específico para seu tipo de cabelo. Ele está disponível para venda. Gostaria de levar?"</blockquote>
<blockquote>"Este óleo finalizador que estou usando é excelente para manter o brilho. Posso te mostrar onde encontrar."</blockquote>
<blockquote>"Para manter o resultado, recomendo usar em casa a máscara de hidratação que aplicamos hoje. Temos disponível."</blockquote>
<blockquote>"Este esmalte que escolhemos é de altíssima qualidade e está disponível para compra. Gostaria de levar?"</blockquote>

<h3>PARTE D — Controle de Qualidade</h3>
<p><strong>9. Verificação do Resultado</strong> — antes de apresentar o resultado para o cliente, verificar cuidadosamente:</p>
<p><strong>Manicure:</strong></p>
<ul style="${CHECK}">
  <li>☐ Uniformidade da esmaltação.</li>
  <li>☐ Cobertura completa.</li>
  <li>☐ Comprimento uniforme.</li>
  <li>☐ Formato correto.</li>
  <li>☐ Cutículas bem acabadas.</li>
  <li>☐ Cantos limpos.</li>
  <li>☐ Ausência de borrões.</li>
  <li>☐ Ausência de bolhas.</li>
  <li>☐ Ausência de resíduos.</li>
  <li>☐ Secagem adequada.</li>
</ul>
<p><strong>Cabelo:</strong></p>
<ul style="${CHECK}">
  <li>☐ Corte uniforme e simétrico.</li>
  <li>☐ Coloração homogênea.</li>
  <li>☐ Hidratação/nutrição visível.</li>
  <li>☐ Modelagem perfeita.</li>
  <li>☐ Ausência de fios soltos.</li>
  <li>☐ Finalização adequada.</li>
</ul>
<p><strong>Sobrancelhas/Cílios:</strong></p>
<ul style="${CHECK}">
  <li>☐ Simetria perfeita.</li>
  <li>☐ Design adequado ao rosto.</li>
  <li>☐ Coloração uniforme.</li>
  <li>☐ Ausência de falhas.</li>
  <li>☐ Cílios alinhados e volumosos.</li>
</ul>
<p><strong>Caso exista qualquer detalhe passível de ajuste, a correção deverá ser realizada ANTES da apresentação ao cliente.</strong></p>
<p><strong>10. Validação do Cliente</strong> — após concluir o procedimento, apresentar o resultado ao cliente e perguntar obrigatoriamente:</p>
<blockquote>"A senhora gostou do resultado?"</blockquote>
<blockquote>"Existe algum detalhe que gostaria que ajustássemos?"</blockquote>
<p>Caso o cliente solicite qualquer ajuste, este deverá ser realizado <strong>imediatamente</strong>. O atendimento somente poderá ser encerrado após a aprovação do cliente.</p>

<h3>PARTE E — Finalização do Atendimento</h3>
<p><strong>11. Finalização (Antes de Liberar o Cliente da Cadeira)</strong> — o profissional deverá pedir 1 minuto ao cliente para realizar os lançamentos.</p>
<p><strong>A. Lançamento no Sistema:</strong></p>
<ul style="${CHECK}">
  <li>☐ Registrar todos os serviços realizados.</li>
  <li>☐ Registrar produtos utilizados.</li>
  <li>☐ Registrar produtos vendidos (se houver).</li>
  <li>☐ Verificar se há descontos ou cortesias.</li>
  <li>☐ Salvar o lançamento no sistema.</li>
</ul>
<p><strong>B. Oferta de Produtos (Vitrine/Exposição)</strong> — levar o cliente até a vitrine ou área de exposição de produtos.</p>
<blockquote>"Agora vou te mostrar os produtos que utilizei durante seu atendimento."</blockquote>
<blockquote>"Para manter o resultado em casa, recomendo levar [produto específico]. Ele é ideal para seu tipo de [cabelo/unha/pele]."</blockquote>
<blockquote>"Este shampoo e condicionador são os mesmos que usei hoje. Eles vão prolongar o resultado do seu tratamento."</blockquote>
<blockquote>"Temos um kit de manutenção com [produtos]. Gostaria de conhecer?"</blockquote>
<blockquote>"Se a senhora já tem alguns produtos em casa, posso sugerir um complemento que vai potencializar o resultado."</blockquote>
<p>Oferecer o Kit Home Care ou Complemento:</p>
<blockquote>"Posso montar um kit com os produtos essenciais para você cuidar em casa. O que acha?"</blockquote>
<p><strong>C. Acompanhamento até a Recepção</strong> — durante o caminho: destacar os benefícios do serviço realizado, reforçar a importância dos cuidados em casa e perguntar se o cliente tem dúvidas sobre manutenção.</p>
<p><strong>D. Despedida do Cliente:</strong></p>
<blockquote>"Foi um prazer atender você, (Nome)! Espero vê-la em breve."</blockquote>
<blockquote>"Não esqueça dos cuidados que te expliquei para manter o resultado."</blockquote>
<blockquote>"Se precisar de algo, estou à disposição."</blockquote>
<p>Aguardar o cliente ser atendido pela recepção para finalização.</p>
<p><strong>12. Técnicas de Reagendamento (Realizada pelo Profissional)</strong> — antes de liberar o cliente da cadeira, oferecer o próximo horário.</p>
<blockquote>"A senhora gostaria de deixar seu próximo atendimento já agendado?"</blockquote>
<div style="${BOX}">
  <p style="${BOXH}">Exemplos por serviço</p>
  <ul>
    <li><strong>Cabelo (corte/coloração):</strong> "Normalmente recomendamos seu retorno em aproximadamente 30 dias. Posso deixar reservado?"</li>
    <li><strong>Cabelo (hidratação/tratamento):</strong> "A manutenção do tratamento é recomendada a cada 15 dias. Posso agendar a próxima?"</li>
    <li><strong>Unhas (manicure):</strong> "Posso deixar sua próxima manutenção agendada para daqui a 15 dias?"</li>
    <li><strong>Sobrancelhas:</strong> "Recomendamos a manutenção em 30 dias. Já gostaria de garantir sua vaga?"</li>
    <li><strong>Coloração (retoque):</strong> "Seu retoque costuma acontecer em cerca de 30 dias. Já gostaria de garantir sua vaga?"</li>
  </ul>
  <p style="${BOXH}">Benefícios que podem ser destacados</p>
  <ul>
    <li>Garantia do profissional preferido.</li>
    <li>Melhores horários disponíveis.</li>
    <li>Organização da rotina do cliente.</li>
    <li>Evita filas e espera.</li>
  </ul>
</div>
<p><strong>Caso o cliente aceite:</strong> levar o cliente até a recepção, informar à recepcionista que o cliente deseja reagendar e aguardar o registro do agendamento.</p>
<p><strong>Caso o cliente não aceite:</strong> agradecer normalmente pela preferência.</p>
<blockquote>"Tudo bem! Quando decidir voltar, é só nos chamar. Estaremos à disposição."</blockquote>

<h3>PARTE F — Organização Pós-Atendimento</h3>
<p><strong>13. Limpeza e Organização da Estação</strong> — após liberar o cliente:</p>
<ul style="${CHECK}">
  <li>☐ Organizar completamente a estação de trabalho.</li>
  <li>☐ Encaminhar os instrumentos para esterilização.</li>
  <li>☐ Descartar corretamente todos os resíduos.</li>
  <li>☐ Higienizar toda a bancada.</li>
  <li>☐ Higienizar as mãos.</li>
  <li>☐ Preparar a estação para a próxima cliente.</li>
</ul>

<h2>14. Técnicas de Vendas e Aumento de Ticket Médio (Resumo para o Profissional)</h2>
<h3>A. Identificação de Oportunidades</h3>
<ul style="${CHECK}">
  <li>☐ Verificar se o cliente possui outros procedimentos em atraso.</li>
  <li>☐ Sugerir procedimentos complementares ao serviço solicitado.</li>
  <li>☐ Observar clientes que realizam apenas um serviço.</li>
  <li>☐ Observar clientes sem retorno há mais de 45 dias.</li>
  <li>☐ Observar clientes que nunca realizaram tratamentos.</li>
  <li>☐ Observar clientes que compram serviços, mas não produtos.</li>
</ul>
<h3>B. Perguntas Obrigatórias</h3>
<blockquote>"Gostaria de aproveitar sua visita para realizar mais algum procedimento?"</blockquote>
<blockquote>"Tem interesse em conhecer nossos tratamentos capilares?"</blockquote>
<blockquote>"Posso verificar uma condição especial para fazer os dois procedimentos no mesmo dia?"</blockquote>
<blockquote>"Gostaria de levar os produtos que utilizei hoje para cuidar em casa?"</blockquote>
<h3>C. Frases para Aumento de Ticket Médio</h3>
<blockquote>"Para um resultado ainda melhor, recomendo adicionar [serviço complementar]. O que acha?"</blockquote>
<blockquote>"Estamos com um combo especial de [serviço A] + [serviço B] por apenas R$ XXX. Gostaria de agendar para a próxima visita?"</blockquote>
<blockquote>"Se levar este produto hoje, o resultado do seu tratamento vai durar muito mais tempo."</blockquote>

<h2>15. Indicadores de Qualidade (Acompanhamento da Gerência)</h2>
<p>A gerência deverá acompanhar mensalmente:</p>
<ul style="${CHECK}">
  <li>☐ Tempo médio do atendimento.</li>
  <li>☐ Número de retrabalhos.</li>
  <li>☐ Número de reclamações.</li>
  <li>☐ Índice de satisfação do cliente.</li>
  <li>☐ Percentual de reagendamentos (realizados pelo profissional).</li>
  <li>☐ Vendas adicionais de serviços (up-selling) realizadas pelo profissional.</li>
  <li>☐ Vendas de produtos (cross-selling) realizadas pelo profissional.</li>
  <li>☐ Ticket médio por cliente (por profissional).</li>
  <li>☐ Percentual de clientes que compraram produtos na vitrine.</li>
  <li>☐ Número de clientes recuperadas.</li>
  <li>☐ Conformidade com as normas de biossegurança.</li>
</ul>

<h2>16. Checklist de Auditoria (Atendimento do Profissional)</h2>
<h3>Apresentação</h3>
<ul style="${CHECK}">
  <li>☐ Cumprimentou o cliente.</li>
  <li>☐ Apresentou-se com nome.</li>
  <li>☐ Confirmou o serviço.</li>
  <li>☐ Perguntou o que o cliente desejava.</li>
  <li>☐ Perguntou se havia preferência ou referência.</li>
  <li>☐ Explicou o que é possível fazer.</li>
  <li>☐ Explicou o que não é recomendado.</li>
  <li>☐ Explicou os cuidados necessários.</li>
</ul>
<h3>Biossegurança</h3>
<ul style="${CHECK}">
  <li>☐ Utilizou luvas novas.</li>
  <li>☐ Utilizou máscara limpa.</li>
  <li>☐ Utilizou avental (se necessário).</li>
  <li>☐ Apresentou kit lacrado.</li>
  <li>☐ Apresentou instrumentos esterilizados.</li>
  <li>☐ Bancada limpa e organizada.</li>
</ul>
<h3>Execução (Manicure)</h3>
<ul style="${CHECK}">
  <li>☐ Removeu o esmalte.</li>
  <li>☐ Lixou e cortou.</li>
  <li>☐ Colocou luva ou botinha.</li>
  <li>☐ Realizou a cuticulagem.</li>
  <li>☐ Aplicou a base.</li>
  <li>☐ Esmaltou.</li>
  <li>☐ Limpou os cantos.</li>
  <li>☐ Aplicou spray ou óleo secante.</li>
</ul>
<h3>Controle de Qualidade</h3>
<ul style="${CHECK}">
  <li>☐ Conferiu todo o acabamento.</li>
  <li>☐ Corrigiu imperfeições.</li>
  <li>☐ Perguntou se o cliente gostou.</li>
  <li>☐ Perguntou se havia necessidade de ajustes.</li>
</ul>
<h3>Vendas e Fidelização</h3>
<ul style="${CHECK}">
  <li>☐ Ofereceu serviços complementares durante o atendimento.</li>
  <li>☐ Ofereceu produtos para venda.</li>
  <li>☐ Levou o cliente até a vitrine.</li>
  <li>☐ Sugeriu kit home care ou complemento.</li>
  <li>☐ Ofereceu reagendamento.</li>
  <li>☐ Destacou benefícios do reagendamento.</li>
</ul>
<h3>Finalização</h3>
<ul style="${CHECK}">
  <li>☐ Lançou os serviços no sistema.</li>
  <li>☐ Acompanhou o cliente até a recepção.</li>
  <li>☐ Despediu-se com cordialidade.</li>
  <li>☐ Organizou a bancada.</li>
  <li>☐ Encaminhou instrumentos para esterilização.</li>
  <li>☐ Agradeceu pela preferência.</li>
</ul>

<h2>17. Critérios para Considerar o Serviço Concluído</h2>
<p>O atendimento somente poderá ser considerado concluído quando:</p>
<ul style="${CHECK}">
  <li>☐ O cliente aprovar o resultado final.</li>
  <li>☐ Todos os critérios de qualidade forem atendidos.</li>
  <li>☐ Não houver necessidade de ajustes.</li>
  <li>☐ Os serviços forem lançados no sistema.</li>
  <li>☐ O reagendamento tiver sido oferecido.</li>
  <li>☐ Os produtos tiverem sido oferecidos.</li>
  <li>☐ O cliente for acompanhado até a recepção.</li>
  <li>☐ Os instrumentos forem encaminhados para esterilização.</li>
  <li>☐ A bancada estiver limpa e organizada.</li>
  <li>☐ O atendimento for encerrado com cordialidade e agradecimento.</li>
</ul>

<h2>18. Frases e Scripts Complementares</h2>
<h3>A. Apresentação</h3>
<table style="${TBL}">
  <tr><th style="${TH}">Situação</th><th style="${TH}">Frase Padrão</th></tr>
  <tr><td style="${TD}">Chegada do cliente</td><td style="${TD}">"Olá (Nome), meu nome é [Profissional] e hoje eu serei o(a) responsável pelo seu atendimento."</td></tr>
  <tr><td style="${TD}">Confirmando serviço</td><td style="${TD}">"A senhora irá fazer [serviço] hoje, correto?"</td></tr>
  <tr><td style="${TD}">Perguntando preferência</td><td style="${TD}">"O que a senhora pensou para hoje? Tem alguma foto de referência?"</td></tr>
</table>
<h3>B. Ponderações</h3>
<table style="${TBL}">
  <tr><th style="${TH}">Situação</th><th style="${TH}">Frase Padrão</th></tr>
  <tr><td style="${TD}">O que dá para fazer</td><td style="${TD}">"Baseado no que a senhora deseja, é possível fazer [explicar]."</td></tr>
  <tr><td style="${TD}">O que não é recomendado</td><td style="${TD}">"Não recomendamos [explicar] porque [motivo]."</td></tr>
  <tr><td style="${TD}">Cuidados necessários</td><td style="${TD}">"Para manter o resultado por mais tempo, é importante [explicar cuidados]."</td></tr>
</table>
<h3>C. Preparação e Materiais</h3>
<table style="${TBL}">
  <tr><th style="${TH}">Situação</th><th style="${TH}">Frase Padrão</th></tr>
  <tr><td style="${TD}">Apresentando kit</td><td style="${TD}">"Este kit descartável é lacrado e utilizado exclusivamente para você."</td></tr>
  <tr><td style="${TD}">Apresentando instrumentos</td><td style="${TD}">"Todos os nossos instrumentos são esterilizados para sua segurança."</td></tr>
  <tr><td style="${TD}">Alicates esterilizados</td><td style="${TD}">"Os alicates foram esterilizados em autoclave e estão prontos para uso."</td></tr>
</table>
<h3>D. Vendas Durante o Atendimento</h3>
<table style="${TBL}">
  <tr><th style="${TH}">Situação</th><th style="${TH}">Frase Padrão</th></tr>
  <tr><td style="${TD}">Serviço complementar</td><td style="${TD}">"Percebi que seu cabelo está precisando de uma hidratação. Gostaria de incluir hoje?"</td></tr>
  <tr><td style="${TD}">Produto em uso</td><td style="${TD}">"Estou usando um shampoo específico para seu tipo de cabelo. Está disponível para venda."</td></tr>
  <tr><td style="${TD}">Kit home care</td><td style="${TD}">"Posso montar um kit com os produtos essenciais para você cuidar em casa."</td></tr>
</table>
<h3>E. Validação e Finalização</h3>
<table style="${TBL}">
  <tr><th style="${TH}">Situação</th><th style="${TH}">Frase Padrão</th></tr>
  <tr><td style="${TD}">Perguntando se gostou</td><td style="${TD}">"A senhora gostou do resultado?"</td></tr>
  <tr><td style="${TD}">Oferecendo ajuste</td><td style="${TD}">"Existe algum detalhe que gostaria que ajustássemos?"</td></tr>
  <tr><td style="${TD}">Reagendamento</td><td style="${TD}">"A senhora gostaria de deixar seu próximo atendimento já agendado?"</td></tr>
</table>
<h3>F. Despedida</h3>
<table style="${TBL}">
  <tr><th style="${TH}">Situação</th><th style="${TH}">Frase Padrão</th></tr>
  <tr><td style="${TD}">Despedida</td><td style="${TD}">"Foi um prazer atender você, (Nome)! Espero vê-la em breve."</td></tr>
  <tr><td style="${TD}">Cuidados</td><td style="${TD}">"Não esqueça dos cuidados que te expliquei para manter o resultado."</td></tr>
  <tr><td style="${TD}">Disponibilidade</td><td style="${TD}">"Se precisar de algo, estou à disposição."</td></tr>
</table>
`.trim()

const PRO_PEDICURE_HTML = `
<h1>Procedimento Operacional Padrão (POP)</h1>
<p style="color:#6b6880;font-size:15px;margin:-4px 0 16px;font-weight:600">POP-PRO-002 — Atendimento de Pedicure (Execução e Finalização do Serviço)</p>

<h2>1. Identificação</h2>
<div style="${META}">
  <p style="margin:0"><strong>Código:</strong> POP-PRO-002 &nbsp;·&nbsp; <strong>Versão:</strong> 1.0 &nbsp;·&nbsp; <strong>Setor:</strong> Profissionais (Pedicure)</p>
  <p style="margin:8px 0 0"><strong>Responsável:</strong> <span style="${FIELD}"></span></p>
  <p style="margin:8px 0 0"><strong>Data de Emissão:</strong> ___/___/______ &nbsp;·&nbsp; <strong>Última Revisão:</strong> ___/___/______ &nbsp;·&nbsp; <strong>Próxima Revisão:</strong> ___/___/______</p>
</div>

<h2>2. Objetivo</h2>
<p>Padronizar o atendimento de pedicure, garantindo excelência no serviço, segurança, biossegurança, qualidade técnica, aplicação de técnicas de vendas para aumento de ticket médio, fidelização através do reagendamento e uma experiência única para todas as clientes.</p>

<h2>3. Campo de Aplicação</h2>
<p>Este procedimento aplica-se a todas as profissionais responsáveis pelos serviços de pedicure.</p>

<h2>4. Responsabilidades</h2>
<h3>Profissional</h3>
<ul>
  <li>Cumprir integralmente este POP.</li>
  <li>Manter postura ética e profissional.</li>
  <li>Zelar pela segurança e bem-estar da cliente.</li>
  <li>Cumprir todas as normas de biossegurança.</li>
  <li>Garantir a qualidade técnica do serviço.</li>
  <li>Aplicar técnicas de vendas (up-selling e cross-selling).</li>
  <li>Oferecer reagendamento preventivo.</li>
  <li>Manter sua estação limpa e organizada.</li>
  <li>Realizar lançamento dos serviços no sistema.</li>
  <li>Acompanhar a cliente até a recepção.</li>
  <li>Oferecer produtos para venda.</li>
</ul>
<h3>Recepção</h3>
<ul>
  <li>Confirmar o agendamento.</li>
  <li>Recepcionar a cliente.</li>
  <li>Acomodar a cliente.</li>
  <li>Registrar reagendamentos.</li>
  <li>Informar à gerência qualquer ocorrência.</li>
</ul>
<h3>Gerência</h3>
<ul>
  <li>Fiscalizar o cumprimento deste POP.</li>
  <li>Treinar continuamente a equipe.</li>
  <li>Realizar auditorias periódicas.</li>
  <li>Acompanhar os indicadores de conversão e ticket médio.</li>
</ul>

<h2>5. Materiais Necessários</h2>
<h3>EPIs</h3>
<ul style="${CHECK}">
  <li>☐ Luvas descartáveis novas.</li>
  <li>☐ Máscara limpa.</li>
  <li>☐ Avental.</li>
  <li>☐ Touca (se necessário).</li>
</ul>
<h3>Materiais</h3>
<ul style="${CHECK}">
  <li>☐ Kit descartável lacrado (toalha, papel, etc.).</li>
  <li>☐ Alicates esterilizados.</li>
  <li>☐ Lixas (para unhas e pés).</li>
  <li>☐ Palito.</li>
  <li>☐ Espátula.</li>
  <li>☐ Algodão.</li>
  <li>☐ Removedor de esmalte.</li>
  <li>☐ Base.</li>
  <li>☐ Esmaltes.</li>
  <li>☐ Spray secante ou óleo secante.</li>
  <li>☐ Creme hidratante para os pés.</li>
  <li>☐ Esfoliante para os pés.</li>
  <li>☐ Pedra-pomes ou lixa para calos.</li>
  <li>☐ Toalha limpa.</li>
  <li>☐ Bacia com água morna (se aplicável).</li>
  <li>☐ Lixeira.</li>
</ul>

<h2>6. Biossegurança</h2>
<h3>Antes do Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Higienizar corretamente as mãos.</li>
  <li>☐ Manter uniforme limpo.</li>
  <li>☐ Manter cabelos presos.</li>
  <li>☐ Utilizar luvas descartáveis novas.</li>
  <li>☐ Utilizar máscara limpa.</li>
  <li>☐ Conferir a limpeza da bancada.</li>
  <li>☐ Conferir se todos os instrumentos estão esterilizados.</li>
  <li>☐ Conferir validade da esterilização.</li>
  <li>☐ Organizar todos os materiais antes do atendimento.</li>
  <li>☐ Verificar se o kit descartável está lacrado.</li>
  <li>☐ Preparar a bacia com água morna (se necessário).</li>
</ul>
<h3>Durante o Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Manter a bancada organizada.</li>
  <li>☐ Não utilizar telefone celular.</li>
  <li>☐ Não consumir alimentos.</li>
  <li>☐ Trocar as luvas sempre que necessário.</li>
  <li>☐ Evitar contaminação cruzada.</li>
  <li>☐ Manter os pés da cliente apoiados e confortáveis.</li>
</ul>
<h3>Após o Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Descartar corretamente os materiais descartáveis.</li>
  <li>☐ Encaminhar os instrumentos para esterilização.</li>
  <li>☐ Higienizar toda a bancada e a cadeira.</li>
  <li>☐ Higienizar as mãos.</li>
  <li>☐ Preparar a estação para a próxima cliente.</li>
</ul>

<h2>7. Procedimento Operacional</h2>

<h3>PARTE A — Início do Atendimento</h3>
<p><strong>Profissional é chamado pela recepção</strong> — recebe a informação: nome da cliente, procedimentos agendados e local onde a cliente está acomodada; e se dirige à cliente.</p>
<p><strong>1. Apresentação do Profissional</strong> — sempre iniciar o atendimento de frente para a cliente, demonstrando simpatia, cordialidade e profissionalismo.</p>
<blockquote>"Olá (Nome da cliente), meu nome é (Nome do Profissional) e hoje eu serei o(a) responsável pelo seu atendimento."</blockquote>
<p><strong>2. Confirmação do Serviço</strong></p>
<blockquote>"A senhora irá fazer o seu pé hoje, correto?"</blockquote>
<p><strong>3. Identificação da Necessidade</strong></p>
<blockquote>"O que a senhora pensou para hoje?"</blockquote>
<blockquote>"A senhora possui alguma preferência ou alguma foto de referência?"</blockquote>
<blockquote>"Tem alguma cor de esmalte em mente?"</blockquote>
<p><strong>4. Ponderações e Orientações</strong> — após ouvir atentamente a cliente, explicar de forma clara e profissional:</p>
<ul style="${CHECK}">
  <li>☐ O que é possível realizar.</li>
  <li>☐ O que não é recomendado realizar.</li>
  <li>☐ As limitações técnicas do procedimento.</li>
  <li>☐ Os cuidados necessários para preservar a saúde dos pés.</li>
</ul>
<blockquote>"Baseado no que a senhora deseja, é possível fazer [explicar o que dá para fazer]."</blockquote>
<blockquote>"Não recomendamos [explicar o que não é recomendado] porque [explicar o motivo]."</blockquote>
<blockquote>"Para manter o resultado por mais tempo e manter a saúde dos seus pés, é importante [explicar os cuidados]."</blockquote>
<p><strong>Nenhum procedimento deverá ser iniciado antes que a cliente compreenda e concorde com o serviço que será realizado.</strong></p>

<h3>PARTE B — Preparação do Profissional e Materiais</h3>
<p><strong>5. Preparação para o Procedimento</strong></p>
<p><strong>A. Equipamentos de Proteção (EPIs):</strong></p>
<ul style="${CHECK}">
  <li>☐ Colocar um par de luvas descartáveis novas.</li>
  <li>☐ Colocar máscara limpa e nova.</li>
  <li>☐ Colocar avental (se necessário).</li>
  <li>☐ Colocar touca (se necessário).</li>
</ul>
<p><strong>B. Materiais:</strong></p>
<ul style="${CHECK}">
  <li>☐ Apresentar à cliente que o kit descartável está lacrado.</li>
  <li>☐ Apresentar os alicates e instrumentos esterilizados.</li>
  <li>☐ Organizar todos os materiais sobre a bancada.</li>
  <li>☐ Verificar se todos os produtos estão dentro da validade.</li>
  <li>☐ Preparar a bacia com água morna (se aplicável).</li>
</ul>
<p><strong>C. Frases Obrigatórias ao Apresentar Materiais:</strong></p>
<blockquote>"Todos os nossos instrumentos são esterilizados para sua segurança."</blockquote>
<blockquote>"Este kit descartável é lacrado e utilizado exclusivamente para você."</blockquote>
<blockquote>"Os alicates foram esterilizados em autoclave e estão prontos para uso."</blockquote>
<p><strong>Somente após estas etapas o procedimento poderá ser iniciado.</strong></p>

<h3>PARTE C — Execução do Procedimento</h3>
<p><strong>6. Execução do Serviço</strong> — executar na seguinte ordem:</p>
<p><strong>A. Remoção do Esmalte Anterior:</strong></p>
<ul style="${CHECK}">
  <li>☐ Remover completamente o esmalte anterior de todas as unhas dos pés.</li>
  <li>☐ Utilizar removedor de esmalte e algodão.</li>
  <li>☐ Limpar cuidadosamente todos os cantos.</li>
</ul>
<p><strong>B. Lixar e Cortar as Unhas:</strong></p>
<ul style="${CHECK}">
  <li>☐ Cortar as unhas retas, sem arredondar os cantos (para evitar unha encravada).</li>
  <li>☐ Lixar as unhas conforme a necessidade e preferência da cliente.</li>
  <li>☐ Verificar se o comprimento está uniforme.</li>
</ul>
<p><strong>C. Lixar ou Esfoliar os Pés:</strong></p>
<ul style="${CHECK}">
  <li>☐ Utilizar pedra-pomes ou lixa específica para calos.</li>
  <li>☐ Remover calosidades e peles mortas.</li>
  <li>☐ Esfoliar os pés com esfoliante específico (se aplicável).</li>
  <li>☐ Massagear suavemente os pés para remover as células mortas.</li>
  <li>☐ Enxaguar os pés com água morna.</li>
</ul>
<p><strong>D. Colocar a Luva ou a Botinha Amolecedora:</strong></p>
<ul style="${CHECK}">
  <li>☐ Colocar a luva ou botinha amolecedora (quando necessário).</li>
  <li>☐ Aguardar o tempo recomendado para amolecer a cutícula.</li>
</ul>
<p><strong>E. Cuticulagem:</strong></p>
<ul style="${CHECK}">
  <li>☐ Realizar a cuticulagem com cuidado.</li>
  <li>☐ Empurrar a cutícula com espátula.</li>
  <li>☐ Remover o excesso de cutícula com alicate específico.</li>
  <li>☐ Evitar cortes ou ferimentos.</li>
</ul>
<p><strong>F. Aplicar a Base:</strong></p>
<ul style="${CHECK}">
  <li>☐ Aplicar a base em todas as unhas.</li>
  <li>☐ Aguardar a secagem completa.</li>
</ul>
<p><strong>G. Pintar e Limpar:</strong></p>
<ul style="${CHECK}">
  <li>☐ Realizar a esmaltação com a cor escolhida.</li>
  <li>☐ Aplicar duas camadas finas (se necessário).</li>
  <li>☐ Limpar cuidadosamente todos os cantos.</li>
  <li>☐ Aguardar a secagem entre camadas.</li>
</ul>
<p><strong>H. Spray Secante ou Óleo:</strong></p>
<ul style="${CHECK}">
  <li>☐ Aplicar spray secante ou óleo secante para acelerar a secagem.</li>
  <li>☐ Aguardar o tempo necessário.</li>
</ul>
<p><strong>7. Técnicas de Vendas Durante a Execução (Up-Selling e Cross-Selling)</strong></p>
<p><strong>A. Oferecimento de Serviços Complementares:</strong></p>
<blockquote>"Percebi que seus pés estão precisando de uma hidratação profunda. Gostaria de incluir hoje uma hidratação com creme específico?"</blockquote>
<blockquote>"Já que estamos fazendo a pedicure, posso fazer uma esfoliação nos pés para remover as células mortas e deixar seus pés ainda mais macios. O que acha?"</blockquote>
<blockquote>"Suas unhas ficariam ainda mais bonitas com uma esmaltação em gel. Gostaria de experimentar?"</blockquote>
<blockquote>"Aproveitando que estamos cuidando dos seus pés, podemos agendar sua manicure também para manter as mãos e pés combinando?"</blockquote>
<p><strong>B. Sugestões de Serviços Complementares:</strong></p>
<table style="${TBL}">
  <tr><th style="${TH}">Serviço Agendado</th><th style="${TH}">Sugestão de Serviço Complementar</th></tr>
  <tr><td style="${TD}">Pedicure</td><td style="${TD}">Manicure, Esfoliação nos pés, Hidratação profunda</td></tr>
  <tr><td style="${TD}">Pedicure</td><td style="${TD}">Esmaltação em gel, Massagem relaxante nos pés</td></tr>
  <tr><td style="${TD}">Pedicure</td><td style="${TD}">Aplicação de creme hidratante com óleos essenciais</td></tr>
  <tr><td style="${TD}">Pedicure</td><td style="${TD}">Tratamento para pés ressecados</td></tr>
</table>
<p><strong>C. Ofertas de Produtos (Cross-Selling) Durante o Atendimento:</strong></p>
<blockquote>"Estou usando um creme hidratante específico para os pés. Ele está disponível para venda e é excelente para manter a maciez. Gostaria de levar?"</blockquote>
<blockquote>"Este esmalte que escolhemos é de altíssima qualidade e está disponível para compra. Gostaria de levar também?"</blockquote>
<blockquote>"Para manter o resultado em casa, recomendo levar o kit de cuidados para os pés que temos disponível."</blockquote>
<blockquote>"Este óleo secante que estou usando é maravilhoso para finalizar. Posso te mostrar onde encontrar."</blockquote>
<p><strong>D. Identificação de Oportunidades:</strong></p>
<ul style="${CHECK}">
  <li>☐ Verificar se a cliente possui outros procedimentos em atraso (ex.: não faz pedicure há mais de 15 dias).</li>
  <li>☐ Verificar se a cliente nunca fez tratamento para pés (esfoliação, hidratação, etc.).</li>
  <li>☐ Verificar se a cliente compra serviços, mas não produtos.</li>
  <li>☐ Oferecer sempre uma sugestão adequada ao perfil da cliente.</li>
</ul>

<h3>PARTE D — Controle de Qualidade</h3>
<p><strong>8. Verificação do Resultado</strong> — antes de apresentar o resultado para a cliente, verificar cuidadosamente:</p>
<ul style="${CHECK}">
  <li>☐ Uniformidade da esmaltação.</li>
  <li>☐ Cobertura completa em todas as unhas.</li>
  <li>☐ Comprimento uniforme das unhas.</li>
  <li>☐ Formato correto (retas, sem cantos arredondados).</li>
  <li>☐ Cutículas bem acabadas e sem excessos.</li>
  <li>☐ Cantos limpos e sem resíduos de esmalte.</li>
  <li>☐ Ausência de borrões.</li>
  <li>☐ Ausência de bolhas.</li>
  <li>☐ Ausência de resíduos de removedor.</li>
  <li>☐ Secagem adequada.</li>
  <li>☐ Pele dos pés macia e hidratada (se foi feita esfoliação/hidratação).</li>
  <li>☐ Ausência de calosidades ou peles soltas.</li>
</ul>
<p><strong>Caso exista qualquer detalhe passível de ajuste, a correção deverá ser realizada ANTES da apresentação à cliente.</strong></p>
<p><strong>9. Validação da Cliente</strong> — após concluir o procedimento, apresentar o resultado à cliente e perguntar obrigatoriamente:</p>
<blockquote>"A senhora gostou do resultado?"</blockquote>
<blockquote>"Existe algum detalhe que gostaria que ajustássemos?"</blockquote>
<p>Caso a cliente solicite qualquer ajuste, este deverá ser realizado <strong>imediatamente</strong>. O atendimento somente poderá ser encerrado após a aprovação da cliente.</p>

<h3>PARTE E — Finalização do Atendimento</h3>
<p><strong>10. Finalização (Antes de Liberar a Cliente da Cadeira)</strong> — o profissional deverá pedir 1 minuto à cliente para realizar os lançamentos.</p>
<p><strong>A. Lançamento no Sistema:</strong></p>
<ul style="${CHECK}">
  <li>☐ Registrar todos os serviços realizados.</li>
  <li>☐ Registrar produtos utilizados.</li>
  <li>☐ Registrar produtos vendidos (se houver).</li>
  <li>☐ Verificar se há descontos ou cortesias.</li>
  <li>☐ Salvar o lançamento no sistema.</li>
</ul>
<p><strong>B. Oferta de Produtos (Vitrine/Exposição)</strong> — levar a cliente até a vitrine ou área de exposição de produtos.</p>
<blockquote>"Agora vou te mostrar os produtos que utilizei durante seu atendimento."</blockquote>
<blockquote>"Para manter o resultado em casa, recomendo levar [produto específico]. Ele é ideal para manter seus pés sempre macios e hidratados."</blockquote>
<blockquote>"Este creme hidratante para os pés é o mesmo que usei hoje. Ele vai prolongar a sensação de maciez."</blockquote>
<blockquote>"Temos um kit de cuidados para os pés com [produtos]. Gostaria de conhecer?"</blockquote>
<blockquote>"Se a senhora já tem alguns produtos em casa, posso sugerir um complemento que vai potencializar o resultado, como um esfoliante específico."</blockquote>
<p>Oferecer o Kit Home Care ou Complemento:</p>
<blockquote>"Posso montar um kit com os produtos essenciais para você cuidar dos seus pés em casa. O que acha?"</blockquote>
<p><strong>C. Acompanhamento até a Recepção</strong> — durante o caminho: destacar os benefícios do serviço realizado, reforçar a importância dos cuidados em casa para manter os pés bonitos e saudáveis e perguntar se a cliente tem dúvidas sobre manutenção.</p>
<p><strong>D. Despedida da Cliente:</strong></p>
<blockquote>"Foi um prazer atender você, (Nome)! Espero vê-la em breve."</blockquote>
<blockquote>"Não esqueça dos cuidados que te expliquei para manter o resultado."</blockquote>
<blockquote>"Se precisar de algo, estou à disposição."</blockquote>
<p>Aguardar a cliente ser atendida pela recepção para finalização.</p>
<p><strong>11. Técnicas de Reagendamento (Realizada pelo Profissional)</strong> — antes de liberar a cliente da cadeira, oferecer o próximo horário.</p>
<blockquote>"A senhora gostaria de deixar seu próximo atendimento já agendado?"</blockquote>
<div style="${BOX}">
  <p style="${BOXH}">Exemplos por serviço</p>
  <ul>
    <li><strong>Pedicure:</strong> "Recomendamos a manutenção da pedicure a cada 15 dias. Posso deixar reservado para você?"</li>
    <li><strong>Pedicure + Esfoliação:</strong> "Para manter seus pés sempre macios, recomendamos a esfoliação a cada 30 dias. Já gostaria de agendar?"</li>
    <li><strong>Esmaltação em gel:</strong> "O esmalte em gel dura cerca de 3 semanas. Posso deixar sua manutenção agendada para daqui a 20 dias?"</li>
  </ul>
  <p style="${BOXH}">Benefícios que podem ser destacados</p>
  <ul>
    <li>Garantia do profissional preferido.</li>
    <li>Melhores horários disponíveis.</li>
    <li>Organização da rotina da cliente.</li>
    <li>Evita filas e espera.</li>
    <li>Garantia de que seus pés estarão sempre bonitos e cuidados.</li>
  </ul>
</div>
<p><strong>Caso a cliente aceite:</strong> levar a cliente até a recepção, informar à recepcionista que a cliente deseja reagendar e aguardar o registro do agendamento.</p>
<p><strong>Caso a cliente não aceite:</strong> agradecer normalmente pela preferência.</p>
<blockquote>"Tudo bem! Quando decidir voltar, é só nos chamar. Estaremos à disposição."</blockquote>

<h3>PARTE F — Organização Pós-Atendimento</h3>
<p><strong>12. Limpeza e Organização da Estação</strong> — após liberar a cliente:</p>
<ul style="${CHECK}">
  <li>☐ Organizar completamente a estação de trabalho.</li>
  <li>☐ Encaminhar os instrumentos para esterilização.</li>
  <li>☐ Descartar corretamente todos os resíduos.</li>
  <li>☐ Higienizar toda a bancada e a cadeira.</li>
  <li>☐ Higienizar as mãos.</li>
  <li>☐ Preparar a estação para a próxima cliente.</li>
</ul>

<h2>13. Técnicas de Vendas e Aumento de Ticket Médio (Resumo para o Profissional)</h2>
<h3>A. Identificação de Oportunidades</h3>
<ul style="${CHECK}">
  <li>☐ Verificar se a cliente possui outros procedimentos em atraso.</li>
  <li>☐ Sugerir procedimentos complementares ao serviço solicitado.</li>
  <li>☐ Observar clientes que realizam apenas um serviço.</li>
  <li>☐ Observar clientes sem retorno há mais de 15 dias.</li>
  <li>☐ Observar clientes que nunca realizaram tratamentos para os pés.</li>
  <li>☐ Observar clientes que compram serviços, mas não produtos.</li>
</ul>
<h3>B. Perguntas Obrigatórias</h3>
<blockquote>"Gostaria de aproveitar sua visita para realizar a manicure também?"</blockquote>
<blockquote>"Tem interesse em conhecer nossos tratamentos para os pés?"</blockquote>
<blockquote>"Posso verificar uma condição especial para fazer os dois procedimentos no mesmo dia?"</blockquote>
<blockquote>"Gostaria de levar os produtos que utilizei hoje para cuidar dos seus pés em casa?"</blockquote>
<h3>C. Frases para Aumento de Ticket Médio</h3>
<blockquote>"Para um resultado ainda melhor, recomendo adicionar uma esfoliação e hidratação profunda. O que acha?"</blockquote>
<blockquote>"Estamos com um combo especial de Pedicure + Manicure por apenas R$ XXX. Gostaria de agendar para a próxima visita?"</blockquote>
<blockquote>"Se levar este creme hidratante hoje, o resultado do seu atendimento vai durar muito mais tempo."</blockquote>

<h2>14. Indicadores de Qualidade (Acompanhamento da Gerência)</h2>
<p>A gerência deverá acompanhar mensalmente:</p>
<ul style="${CHECK}">
  <li>☐ Tempo médio do atendimento de pedicure.</li>
  <li>☐ Número de retrabalhos.</li>
  <li>☐ Número de reclamações.</li>
  <li>☐ Índice de satisfação da cliente.</li>
  <li>☐ Percentual de reagendamentos (realizados pelo profissional).</li>
  <li>☐ Vendas adicionais de serviços (up-selling) realizadas pelo profissional.</li>
  <li>☐ Vendas de produtos (cross-selling) realizadas pelo profissional.</li>
  <li>☐ Ticket médio por cliente (por profissional).</li>
  <li>☐ Percentual de clientes que compraram produtos na vitrine.</li>
  <li>☐ Número de clientes recuperadas.</li>
  <li>☐ Conformidade com as normas de biossegurança.</li>
</ul>

<h2>15. Checklist de Auditoria (Atendimento de Pedicure)</h2>
<h3>Apresentação</h3>
<ul style="${CHECK}">
  <li>☐ Cumprimentou a cliente.</li>
  <li>☐ Apresentou-se com nome.</li>
  <li>☐ Confirmou o serviço (pedicure).</li>
  <li>☐ Perguntou o que a cliente desejava.</li>
  <li>☐ Perguntou se havia preferência ou referência.</li>
  <li>☐ Explicou o que é possível fazer.</li>
  <li>☐ Explicou o que não é recomendado.</li>
  <li>☐ Explicou os cuidados necessários.</li>
</ul>
<h3>Biossegurança</h3>
<ul style="${CHECK}">
  <li>☐ Utilizou luvas novas.</li>
  <li>☐ Utilizou máscara limpa.</li>
  <li>☐ Utilizou avental (se necessário).</li>
  <li>☐ Apresentou kit lacrado.</li>
  <li>☐ Apresentou instrumentos esterilizados.</li>
  <li>☐ Bancada limpa e organizada.</li>
  <li>☐ Bacia com água morna preparada (se aplicável).</li>
</ul>
<h3>Execução</h3>
<ul style="${CHECK}">
  <li>☐ Removeu o esmalte.</li>
  <li>☐ Lixou e cortou as unhas corretamente.</li>
  <li>☐ Lixou ou esfoliou os pés.</li>
  <li>☐ Colocou luva ou botinha amolecedora.</li>
  <li>☐ Realizou a cuticulagem.</li>
  <li>☐ Aplicou a base.</li>
  <li>☐ Esmaltou.</li>
  <li>☐ Limpou os cantos.</li>
  <li>☐ Aplicou spray ou óleo secante.</li>
  <li>☐ Hidratou os pés (se aplicável).</li>
</ul>
<h3>Controle de Qualidade</h3>
<ul style="${CHECK}">
  <li>☐ Conferiu todo o acabamento.</li>
  <li>☐ Corrigiu imperfeições.</li>
  <li>☐ Perguntou se a cliente gostou.</li>
  <li>☐ Perguntou se havia necessidade de ajustes.</li>
</ul>
<h3>Vendas e Fidelização</h3>
<ul style="${CHECK}">
  <li>☐ Ofereceu serviços complementares durante o atendimento.</li>
  <li>☐ Ofereceu produtos para venda.</li>
  <li>☐ Levou a cliente até a vitrine.</li>
  <li>☐ Sugeriu kit home care ou complemento.</li>
  <li>☐ Ofereceu reagendamento.</li>
  <li>☐ Destacou benefícios do reagendamento.</li>
</ul>
<h3>Finalização</h3>
<ul style="${CHECK}">
  <li>☐ Lançou os serviços no sistema.</li>
  <li>☐ Acompanhou a cliente até a recepção.</li>
  <li>☐ Despediu-se com cordialidade.</li>
  <li>☐ Organizou a bancada.</li>
  <li>☐ Encaminhou instrumentos para esterilização.</li>
  <li>☐ Agradeceu pela preferência.</li>
</ul>

<h2>16. Critérios para Considerar o Serviço Concluído</h2>
<p>O atendimento somente poderá ser considerado concluído quando:</p>
<ul style="${CHECK}">
  <li>☐ A cliente aprovar o resultado final.</li>
  <li>☐ Todos os critérios de qualidade forem atendidos.</li>
  <li>☐ Não houver necessidade de ajustes.</li>
  <li>☐ Os serviços forem lançados no sistema.</li>
  <li>☐ O reagendamento tiver sido oferecido.</li>
  <li>☐ Os produtos tiverem sido oferecidos.</li>
  <li>☐ A cliente for acompanhada até a recepção.</li>
  <li>☐ Os instrumentos forem encaminhados para esterilização.</li>
  <li>☐ A bancada estiver limpa e organizada.</li>
  <li>☐ O atendimento for encerrado com cordialidade e agradecimento.</li>
</ul>

<h2>17. Frases e Scripts Complementares</h2>
<h3>A. Apresentação</h3>
<table style="${TBL}">
  <tr><th style="${TH}">Situação</th><th style="${TH}">Frase Padrão</th></tr>
  <tr><td style="${TD}">Chegada da cliente</td><td style="${TD}">"Olá (Nome), meu nome é [Profissional] e hoje eu serei o(a) responsável pelo seu atendimento."</td></tr>
  <tr><td style="${TD}">Confirmando serviço</td><td style="${TD}">"A senhora irá fazer o seu pé hoje, correto?"</td></tr>
  <tr><td style="${TD}">Perguntando preferência</td><td style="${TD}">"O que a senhora pensou para hoje? Tem alguma cor de esmalte em mente?"</td></tr>
</table>
<h3>B. Ponderações</h3>
<table style="${TBL}">
  <tr><th style="${TH}">Situação</th><th style="${TH}">Frase Padrão</th></tr>
  <tr><td style="${TD}">O que dá para fazer</td><td style="${TD}">"Baseado no que a senhora deseja, é possível fazer [explicar]."</td></tr>
  <tr><td style="${TD}">O que não é recomendado</td><td style="${TD}">"Não recomendamos [explicar] porque [motivo]."</td></tr>
  <tr><td style="${TD}">Cuidados necessários</td><td style="${TD}">"Para manter o resultado por mais tempo, é importante [explicar cuidados]."</td></tr>
</table>
<h3>C. Preparação e Materiais</h3>
<table style="${TBL}">
  <tr><th style="${TH}">Situação</th><th style="${TH}">Frase Padrão</th></tr>
  <tr><td style="${TD}">Apresentando kit</td><td style="${TD}">"Este kit descartável é lacrado e utilizado exclusivamente para você."</td></tr>
  <tr><td style="${TD}">Apresentando instrumentos</td><td style="${TD}">"Todos os nossos instrumentos são esterilizados para sua segurança."</td></tr>
  <tr><td style="${TD}">Alicates esterilizados</td><td style="${TD}">"Os alicates foram esterilizados em autoclave e estão prontos para uso."</td></tr>
</table>
<h3>D. Vendas Durante o Atendimento</h3>
<table style="${TBL}">
  <tr><th style="${TH}">Situação</th><th style="${TH}">Frase Padrão</th></tr>
  <tr><td style="${TD}">Serviço complementar</td><td style="${TD}">"Percebi que seus pés estão precisando de uma hidratação profunda. Gostaria de incluir hoje?"</td></tr>
  <tr><td style="${TD}">Produto em uso</td><td style="${TD}">"Estou usando um creme hidratante específico para os pés. Está disponível para venda."</td></tr>
  <tr><td style="${TD}">Kit home care</td><td style="${TD}">"Posso montar um kit com os produtos essenciais para você cuidar dos pés em casa."</td></tr>
  <tr><td style="${TD}">Combo</td><td style="${TD}">"Temos um combo especial de Pedicure + Manicure. Gostaria de agendar para a próxima visita?"</td></tr>
</table>
<h3>E. Validação e Finalização</h3>
<table style="${TBL}">
  <tr><th style="${TH}">Situação</th><th style="${TH}">Frase Padrão</th></tr>
  <tr><td style="${TD}">Perguntando se gostou</td><td style="${TD}">"A senhora gostou do resultado?"</td></tr>
  <tr><td style="${TD}">Oferecendo ajuste</td><td style="${TD}">"Existe algum detalhe que gostaria que ajustássemos?"</td></tr>
  <tr><td style="${TD}">Reagendamento</td><td style="${TD}">"A senhora gostaria de deixar seu próximo atendimento já agendado?"</td></tr>
</table>
<h3>F. Despedida</h3>
<table style="${TBL}">
  <tr><th style="${TH}">Situação</th><th style="${TH}">Frase Padrão</th></tr>
  <tr><td style="${TD}">Despedida</td><td style="${TD}">"Foi um prazer atender você, (Nome)! Espero vê-la em breve."</td></tr>
  <tr><td style="${TD}">Cuidados</td><td style="${TD}">"Não esqueça dos cuidados que te expliquei para manter o resultado."</td></tr>
  <tr><td style="${TD}">Disponibilidade</td><td style="${TD}">"Se precisar de algo, estou à disposição."</td></tr>
</table>
<h3>G. Orientações para a Cliente (Cuidados em Casa)</h3>
<div style="${BOX}">
  <ul>
    <li>"Evite andar descalça em locais úmidos para manter a saúde dos seus pés."</li>
    <li>"Aplique creme hidratante todos os dias, principalmente antes de dormir."</li>
    <li>"Use meias de algodão para manter a hidratação."</li>
    <li>"Não corte as unhas dos pés arredondadas, mantenha-as retas para evitar unhas encravadas."</li>
    <li>"Faça a manutenção a cada 15 dias para manter seus pés sempre bonitos e saudáveis."</li>
  </ul>
</div>
`.trim()

const PRO_LAVATORIO_HTML = `
<h1>Procedimento Operacional Padrão (POP)</h1>
<p style="color:#6b6880;font-size:15px;margin:-4px 0 16px;font-weight:600">POP-PRO-003 — Atendimento de Higienização Capilar (Lavatório)</p>

<h2>1. Identificação</h2>
<div style="${META}">
  <p style="margin:0"><strong>Código:</strong> POP-PRO-003 &nbsp;·&nbsp; <strong>Versão:</strong> 1.0 &nbsp;·&nbsp; <strong>Setor:</strong> Profissionais (Lavatório / Auxiliar de Cabeleireiro)</p>
  <p style="margin:8px 0 0"><strong>Responsável:</strong> <span style="${FIELD}"></span> (Profissional do Lavatório)</p>
  <p style="margin:8px 0 0"><strong>Data de Emissão:</strong> ___/___/______ &nbsp;·&nbsp; <strong>Última Revisão:</strong> ___/___/______ &nbsp;·&nbsp; <strong>Próxima Revisão:</strong> ___/___/______</p>
</div>

<h2>2. Objetivo</h2>
<p>Padronizar o atendimento de higienização capilar no lavatório, garantindo excelência no serviço, avaliação precisa das necessidades do cabelo, aplicação correta dos produtos, conforto da cliente, técnicas de vendas para aumento de ticket médio e uma experiência sensorial única.</p>

<h2>3. Campo de Aplicação</h2>
<p>Este procedimento aplica-se a todos os profissionais responsáveis pelos serviços de higienização capilar no lavatório.</p>

<h2>4. Responsabilidades</h2>
<h3>Profissional do Lavatório</h3>
<ul>
  <li>Cumprir integralmente este POP.</li>
  <li>Manter postura ética e profissional.</li>
  <li>Zelar pela segurança e bem-estar da cliente.</li>
  <li>Realizar avaliação capilar detalhada.</li>
  <li>Aplicar corretamente os produtos.</li>
  <li>Garantir conforto durante todo o procedimento.</li>
  <li>Aplicar técnicas de vendas (up-selling e cross-selling).</li>
  <li>Oferecer tratamentos complementares.</li>
  <li>Manter o lavatório limpo e organizado.</li>
</ul>
<h3>Cabeleireiro / Profissional Principal</h3>
<ul>
  <li>Aguardar a cliente ser preparada.</li>
  <li>Realizar o procedimento principal (corte, coloração, escova, etc.).</li>
  <li>Aplicar técnicas de vendas durante o atendimento.</li>
</ul>
<h3>Recepção</h3>
<ul>
  <li>Confirmar o agendamento.</li>
  <li>Recepcionar e acomodar a cliente.</li>
  <li>Registrar reagendamentos.</li>
</ul>
<h3>Gerência</h3>
<ul>
  <li>Fiscalizar o cumprimento deste POP.</li>
  <li>Treinar continuamente a equipe.</li>
  <li>Realizar auditorias periódicas.</li>
  <li>Acompanhar os indicadores de conversão e ticket médio.</li>
</ul>

<h2>5. Materiais Necessários</h2>
<h3>Equipamentos</h3>
<ul style="${CHECK}">
  <li>☐ Lavatório (cadeira e pia).</li>
  <li>☐ Toalhas limpas.</li>
  <li>☐ Capa de proteção.</li>
  <li>☐ Robe ou avental.</li>
  <li>☐ Touca descartável.</li>
  <li>☐ Pentes e escovas.</li>
  <li>☐ Cronômetro ou timer.</li>
</ul>
<h3>Produtos</h3>
<ul style="${CHECK}">
  <li>☐ Shampoo 1 (limpeza profunda).</li>
  <li>☐ Shampoo 2 (específico para o tipo de cabelo).</li>
  <li>☐ Condicionador.</li>
  <li>☐ Máscara de hidratação.</li>
  <li>☐ Máscara de nutrição.</li>
  <li>☐ Máscara de reconstrução.</li>
  <li>☐ Óleos e finalizadores.</li>
  <li>☐ Produtos para demonstração (cheiros).</li>
</ul>

<h2>6. Biossegurança e Higiene</h2>
<h3>Antes do Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Higienizar corretamente as mãos.</li>
  <li>☐ Manter uniforme limpo.</li>
  <li>☐ Manter cabelos presos.</li>
  <li>☐ Utilizar máscara limpa.</li>
  <li>☐ Conferir a limpeza do lavatório.</li>
  <li>☐ Organizar todos os produtos e materiais.</li>
  <li>☐ Verificar a validade dos produtos.</li>
  <li>☐ Preparar toalhas limpas.</li>
</ul>
<h3>Durante o Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Manter o lavatório organizado.</li>
  <li>☐ Não utilizar telefone celular.</li>
  <li>☐ Não consumir alimentos.</li>
  <li>☐ Evitar respingos no rosto da cliente.</li>
  <li>☐ Manter a temperatura da água adequada.</li>
</ul>
<h3>Após o Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Descartar corretamente os materiais descartáveis.</li>
  <li>☐ Higienizar o lavatório.</li>
  <li>☐ Higienizar as mãos.</li>
  <li>☐ Preparar o lavatório para a próxima cliente.</li>
</ul>

<h2>7. Procedimento Operacional</h2>

<h3>PARTE A — Início do Atendimento</h3>
<p><strong>Profissional é chamado pela recepção</strong> — recebe a informação: nome da cliente, procedimentos agendados e local onde a cliente está acomodada. Em seguida, dirige-se à cliente.</p>
<p><strong>1. Apresentação do Profissional</strong> — sempre iniciar o atendimento de frente para a cliente, demonstrando simpatia, cordialidade e profissionalismo.</p>
<blockquote>"Olá (Nome da cliente), meu nome é (Nome do Profissional) e hoje eu serei o(a) responsável pela higienização do seu cabelo."</blockquote>
<p><strong>2. Confirmação do Serviço</strong></p>
<blockquote>"A senhora irá fazer a higienização do seu cabelo hoje, correto?"</blockquote>
<p><strong>3. Identificação da Necessidade</strong></p>
<blockquote>"O que a senhora pensou para hoje?" · "A senhora possui alguma preferência ou alguma foto de referência?" · "Tem algum produto ou cheiro preferido?"</blockquote>
<p><strong>4. Ponderações e Orientações</strong> — após ouvir atentamente a cliente, explicar de forma clara e profissional:</p>
<ul style="${CHECK}">
  <li>☐ O que é possível realizar.</li>
  <li>☐ O que não é recomendado realizar.</li>
  <li>☐ As limitações técnicas do procedimento.</li>
  <li>☐ Os cuidados necessários para preservar a saúde do cabelo.</li>
</ul>
<blockquote>"Baseado no que a senhora deseja, é possível fazer [explicar o que dá para fazer]."</blockquote>
<blockquote>"Não recomendamos [explicar o que não é recomendado] porque [explicar o motivo]."</blockquote>
<blockquote>"Para manter o resultado por mais tempo, é importante [explicar os cuidados]."</blockquote>
<p><strong>Nenhum procedimento deverá ser iniciado antes que a cliente compreenda e concorde com o serviço que será realizado.</strong></p>

<h3>PARTE B — Avaliação Capilar</h3>
<p><strong>5. Cliente vai para o lavatório</strong></p>
<ul>
  <li>Conduzir a cliente até o lavatório.</li>
  <li>Ajudar a cliente a se acomodar confortavelmente.</li>
  <li>Ajustar a cadeira para a posição correta.</li>
  <li>Colocar a capa de proteção (se necessário).</li>
  <li>Verificar se a cliente está confortável.</li>
</ul>
<p><strong>6. Avaliação do Cabelo</strong> — realizar uma avaliação detalhada:</p>
<ul style="${CHECK}">
  <li>☐ Observar o estado geral do cabelo.</li>
  <li>☐ Verificar o tipo de cabelo (liso, ondulado, cacheado, crespo).</li>
  <li>☐ Verificar a porosidade do cabelo.</li>
  <li>☐ Verificar se há ressecamento.</li>
  <li>☐ Verificar se há danos ou pontas duplas.</li>
  <li>☐ Verificar se há química (coloração, descoloração, etc.).</li>
  <li>☐ Verificar o couro cabeludo (oleosidade, caspa, etc.).</li>
  <li>☐ Perguntar sobre os cuidados atuais da cliente.</li>
</ul>
<p><strong>7. Informar as Necessidades</strong> — após a avaliação, informar a cliente sobre o que foi identificado.</p>
<blockquote>"Percebi que seu cabelo está [descrever a condição: ressecado, com pontas duplas, com pouca hidratação]."</blockquote>
<blockquote>"Seu couro cabeludo está [descrever a condição, ex.: com um pouco de oleosidade]."</blockquote>
<blockquote>"Para melhorar a saúde do seu cabelo, recomendamos [sugerir tratamento]."</blockquote>
<p><strong>8. Técnicas de Vendas — Oferta de Tratamentos</strong></p>
<blockquote>"A senhora gostaria de fazer um tratamento de [hidratação/nutrição/reconstrução] de acordo com a necessidade do seu cabelo?"</blockquote>
<blockquote>"Percebi que seu cabelo está precisando de uma hidratação profunda. Podemos incluir hoje?"</blockquote>
<blockquote>"Temos um tratamento específico para [tipo de cabelo] que vai deixar seu cabelo ainda mais bonito. Gostaria de conhecer?"</blockquote>
<p><strong>9. Informar os Produtos Utilizados</strong></p>
<blockquote>"Hoje vou utilizar o Shampoo [nome] para [função], o Condicionador [nome] para [função], e um tratamento de [nome]."</blockquote>
<blockquote>"Este shampoo é específico para [tipo de cabelo] e vai ajudar a [benefício]."</blockquote>
<p><strong>10. Experiência Sensorial</strong> — deixar a cliente sentir o cheiro dos produtos.</p>
<blockquote>"Antes de começar, gostaria que a senhora sentisse o cheiro do shampoo que vou utilizar."</blockquote>
<blockquote>"Este produto tem um aroma maravilhoso de [descrever o cheiro]. O que acha?"</blockquote>
<blockquote>"Temos outras opções de cheiros. A senhora prefere algum em específico?"</blockquote>
<p><strong>11. Soltar um pouco o cabelo da raiz</strong> — soltar o cabelo da raiz para facilitar a aplicação dos produtos, verificar se não há nós ou embaraços e desembaraçar suavemente com os dedos ou pente.</p>

<h3>PARTE C — Execução da Higienização</h3>
<p><strong>12. Preparação do Lavatório</strong></p>
<ul style="${CHECK}">
  <li>☐ Verificar a temperatura da água (morna, agradável).</li>
  <li>☐ Posicionar a cliente corretamente no lavatório.</li>
  <li>☐ Verificar se a cliente está confortável.</li>
  <li>☐ Colocar a capa de proteção.</li>
</ul>
<p><strong>13. Aplicação do 1º Shampoo</strong> — objetivo: remover impurezas e oleosidade.</p>
<ul style="${CHECK}">
  <li>☐ Aplicar o 1º shampoo em todo o cabelo.</li>
  <li>☐ Massagear suavemente o couro cabeludo.</li>
  <li>☐ Emulsionar bem o produto.</li>
  <li>☐ Enxaguar completamente.</li>
</ul>
<blockquote>"Vamos começar com o primeiro shampoo para fazer uma limpeza profunda e remover as impurezas."</blockquote>
<p><strong>14. Aplicação do 2º Shampoo</strong> — objetivo: limpeza específica para o tipo de cabelo.</p>
<ul style="${CHECK}">
  <li>☐ Aplicar o 2º shampoo (específico para o tipo de cabelo).</li>
  <li>☐ Massagear o couro cabeludo por 3 minutos.</li>
  <li>☐ Enxaguar completamente.</li>
</ul>
<blockquote>"Agora vamos aplicar o segundo shampoo, específico para seu tipo de cabelo."</blockquote>
<blockquote>"Vou fazer uma massagem no couro cabeludo por 3 minutos para estimular a circulação e garantir uma limpeza profunda. Essa massagem também ajuda a relaxar e aliviar o estresse."</blockquote>
<p><strong>15. Aplicação do Condicionador</strong></p>
<ul style="${CHECK}">
  <li>☐ Aplicar o condicionador no comprimento e nas pontas do cabelo.</li>
  <li>☐ Evitar a raiz (a menos que indicado).</li>
  <li>☐ Aguardar o tempo recomendado pela marca.</li>
  <li>☐ Enxaguar completamente.</li>
</ul>
<blockquote>"Vamos aplicar o condicionador para hidratar e desembaraçar seu cabelo. Vamos aguardar alguns minutos para ele agir."</blockquote>
<p><strong>16. Aplicação de Tratamento</strong> (se ofertado e aceito)</p>
<ul style="${CHECK}">
  <li>☐ Aplicar a máscara de tratamento (hidratação, nutrição ou reconstrução).</li>
  <li>☐ Aguardar o tempo recomendado pela marca.</li>
  <li>☐ Enxaguar completamente.</li>
</ul>
<blockquote>"Agora vamos aplicar a máscara de [hidratação/nutrição/reconstrução] que falamos. Vamos aguardar [X] minutos para o tratamento agir profundamente."</blockquote>
<p><strong>17. Finalização da Higienização</strong></p>
<ul style="${CHECK}">
  <li>☐ Enxaguar completamente todos os produtos.</li>
  <li>☐ Verificar se não há resíduos de shampoo, condicionador ou máscara.</li>
  <li>☐ Fazer a touca com a toalha para proteger o cabelo.</li>
</ul>
<blockquote>"Finalizamos a higienização. O cabelo está limpo e preparado para o próximo procedimento."</blockquote>
<p><strong>18. Levar para a Cadeira</strong> — conduzir a cliente até a cadeira do profissional principal.</p>
<ul style="${CHECK}">
  <li>☐ Ajudar a cliente a se sentar.</li>
  <li>☐ Remover a touca de toalha.</li>
  <li>☐ Secar com a toalha, retirando o excesso de água.</li>
  <li>☐ Preparar para o procedimento que a cliente irá fazer.</li>
</ul>
<p><strong>19. Preparação para o Procedimento Principal</strong></p>
<ul style="${CHECK}">
  <li>☐ Colocar a capa de proteção.</li>
  <li>☐ Colocar o robe ou avental.</li>
  <li>☐ Pentear e alinhar o cabelo.</li>
  <li>☐ Verificar se a cliente está confortável.</li>
</ul>
<blockquote>"Seu cabelo está pronto para o procedimento. O(A) [Cabeleireiro] vai te atender em instantes. Fique à vontade."</blockquote>
<p><strong>20. Chamar o Profissional Principal</strong> — informar obrigatoriamente:</p>
<ul style="${CHECK}">
  <li>☐ Nome da cliente.</li>
  <li>☐ Procedimentos agendados.</li>
  <li>☐ Tratamentos realizados no lavatório.</li>
  <li>☐ Observações sobre o cabelo da cliente.</li>
</ul>
<blockquote>"[Nome do Cabeleireiro], a cliente [Nome da Cliente] está pronta. O cabelo está [descrição, ex.: hidratado, preparado para coloração]."</blockquote>

<h3>PARTE D — Técnicas de Vendas Durante o Lavatório</h3>
<p><strong>21. Identificação de Oportunidades</strong> — durante o procedimento, identificar oportunidades de venda.</p>
<p><strong>A. Sugestões de Tratamentos:</strong></p>
<table style="${TBL}">
  <tr><th style="${TH}">Condição do Cabelo</th><th style="${TH}">Tratamento Sugerido</th></tr>
  <tr><td style="${TD}">Cabelo ressecado</td><td style="${TD}">Hidratação profunda</td></tr>
  <tr><td style="${TD}">Cabelo sem brilho</td><td style="${TD}">Nutrição</td></tr>
  <tr><td style="${TD}">Cabelo quimicamente danificado</td><td style="${TD}">Reconstrução</td></tr>
  <tr><td style="${TD}">Cabelo opaco e sem vida</td><td style="${TD}">Hidratação + Nutrição</td></tr>
  <tr><td style="${TD}">Cabelo frágil e quebradiço</td><td style="${TD}">Reconstrução + Hidratação</td></tr>
  <tr><td style="${TD}">Cabelo com pontas duplas</td><td style="${TD}">Corte + Tratamento</td></tr>
  <tr><td style="${TD}">Cabelo com química recente</td><td style="${TD}">Cauterização</td></tr>
</table>
<p><strong>B. Perguntas Obrigatórias:</strong></p>
<blockquote>"Percebi que seu cabelo está precisando de uma hidratação profunda. Gostaria de incluir hoje?"</blockquote>
<blockquote>"Seu cabelo ficaria ainda mais bonito com uma nutrição. O que acha?"</blockquote>
<blockquote>"Temos um tratamento de reconstrução que vai devolver a força do seu cabelo. Gostaria de experimentar?"</blockquote>
<blockquote>"Além de hidratar, podemos fazer uma cauterização para selar a cutícula. Gostaria de conhecer?"</blockquote>
<p><strong>C. Sugestões de Produtos (Cross-Selling):</strong></p>
<blockquote>"Este shampoo e condicionador que estou usando são específicos para seu tipo de cabelo. Estão disponíveis para venda."</blockquote>
<blockquote>"A máscara de hidratação que apliquei hoje é excelente para manter o resultado em casa. Gostaria de levar?"</blockquote>
<blockquote>"Para potencializar o tratamento, recomendo levar o shampoo e condicionador da mesma linha."</blockquote>

<h3>PARTE E — Organização Pós-Atendimento</h3>
<p><strong>22. Limpeza e Organização do Lavatório</strong> — após liberar a cliente:</p>
<ul style="${CHECK}">
  <li>☐ Organizar completamente o lavatório.</li>
  <li>☐ Descartar corretamente os resíduos.</li>
  <li>☐ Higienizar toda a pia e a cadeira.</li>
  <li>☐ Higienizar as mãos.</li>
  <li>☐ Preparar o lavatório para a próxima cliente.</li>
</ul>
<p><strong>23. Registro no Sistema</strong></p>
<ul style="${CHECK}">
  <li>☐ Registrar os serviços realizados no lavatório.</li>
  <li>☐ Registrar os produtos utilizados.</li>
  <li>☐ Registrar os produtos vendidos (se houver).</li>
  <li>☐ Registrar os tratamentos realizados.</li>
</ul>

<h2>8. Indicadores de Qualidade</h2>
<p>A gerência deverá acompanhar mensalmente:</p>
<ul style="${CHECK}">
  <li>☐ Tempo médio de higienização.</li>
  <li>☐ Número de reclamações sobre o lavatório.</li>
  <li>☐ Índice de satisfação da cliente (conforto, experiência).</li>
  <li>☐ Vendas adicionais de tratamentos (up-selling) realizadas no lavatório.</li>
  <li>☐ Vendas de produtos (cross-selling) realizadas no lavatório.</li>
  <li>☐ Ticket médio por cliente (impacto do lavatório).</li>
  <li>☐ Conformidade com as normas de biossegurança.</li>
</ul>

<h2>9. Checklist de Auditoria</h2>
<div style="${BOX}">
  <div style="${BOXH}">Apresentação</div>
  <ul style="${CHECK}">
    <li>☐ Cumprimentou a cliente.</li>
    <li>☐ Apresentou-se com nome.</li>
    <li>☐ Confirmou o serviço (higienização).</li>
    <li>☐ Perguntou o que a cliente desejava.</li>
    <li>☐ Perguntou se havia preferência ou referência.</li>
    <li>☐ Explicou o que é possível fazer.</li>
    <li>☐ Explicou o que não é recomendado.</li>
    <li>☐ Explicou os cuidados necessários.</li>
  </ul>
  <div style="${BOXH}">Avaliação</div>
  <ul style="${CHECK}">
    <li>☐ Realizou avaliação capilar detalhada.</li>
    <li>☐ Informou as necessidades identificadas.</li>
    <li>☐ Perguntou se deseja tratamento.</li>
    <li>☐ Informou os produtos que serão utilizados.</li>
    <li>☐ Deixou a cliente sentir o cheiro dos produtos.</li>
    <li>☐ Soltou o cabelo da raiz.</li>
  </ul>
  <div style="${BOXH}">Execução</div>
  <ul style="${CHECK}">
    <li>☐ Aplicou o 1º shampoo corretamente.</li>
    <li>☐ Aplicou o 2º shampoo + massagem de 3 minutos.</li>
    <li>☐ Aguardou o tempo de pausa.</li>
    <li>☐ Aplicou o condicionador.</li>
    <li>☐ Aguardou o tempo recomendado.</li>
    <li>☐ Aplicou tratamento (se ofertado e aceito).</li>
    <li>☐ Enxaguou completamente.</li>
  </ul>
  <div style="${BOXH}">Finalização</div>
  <ul style="${CHECK}">
    <li>☐ Fez a touca.</li>
    <li>☐ Levou a cliente para a cadeira.</li>
    <li>☐ Secou com a toalha.</li>
    <li>☐ Preparou para o procedimento (capa, robe, penteado).</li>
    <li>☐ Penteou e alinhou o cabelo.</li>
    <li>☐ Chamou o profissional principal.</li>
  </ul>
  <div style="${BOXH}">Vendas e Fidelização</div>
  <ul style="${CHECK}">
    <li>☐ Ofereceu tratamentos complementares.</li>
    <li>☐ Ofereceu produtos para venda.</li>
    <li>☐ Informou sobre os benefícios dos produtos.</li>
    <li>☐ Registrou serviços e produtos no sistema.</li>
  </ul>
  <div style="${BOXH}">Organização</div>
  <ul style="${CHECK}">
    <li>☐ Organizou o lavatório.</li>
    <li>☐ Higienizou a pia e a cadeira.</li>
    <li>☐ Descartou os resíduos corretamente.</li>
    <li>☐ Preparou para a próxima cliente.</li>
  </ul>
</div>

<h2>10. Frases e Scripts Complementares</h2>
<h3>A. Apresentação</h3>
<table style="${TBL}">
  <tr><th style="${TH}">Situação</th><th style="${TH}">Frase Padrão</th></tr>
  <tr><td style="${TD}">Chegada da cliente</td><td style="${TD}">"Olá (Nome), meu nome é [Profissional] e hoje eu serei o(a) responsável pela higienização do seu cabelo."</td></tr>
  <tr><td style="${TD}">Confirmando o serviço</td><td style="${TD}">"A senhora irá fazer a higienização hoje, correto?"</td></tr>
  <tr><td style="${TD}">Perguntando a preferência</td><td style="${TD}">"O que a senhora pensou para hoje? Tem alguma preferência?"</td></tr>
</table>
<h3>B. Avaliação e Ponderações</h3>
<table style="${TBL}">
  <tr><th style="${TH}">Situação</th><th style="${TH}">Frase Padrão</th></tr>
  <tr><td style="${TD}">Avaliação</td><td style="${TD}">"Percebi que seu cabelo está [descrever a condição]."</td></tr>
  <tr><td style="${TD}">Necessidade</td><td style="${TD}">"Para melhorar a saúde do seu cabelo, recomendamos [sugerir tratamento]."</td></tr>
  <tr><td style="${TD}">Oferta de tratamento</td><td style="${TD}">"Percebi que seu cabelo está precisando de uma hidratação. Gostaria de incluir hoje?"</td></tr>
</table>
<h3>C. Produtos</h3>
<table style="${TBL}">
  <tr><th style="${TH}">Situação</th><th style="${TH}">Frase Padrão</th></tr>
  <tr><td style="${TD}">Informando produtos</td><td style="${TD}">"Hoje vou utilizar o Shampoo [nome] para [função]."</td></tr>
  <tr><td style="${TD}">Experiência sensorial</td><td style="${TD}">"Antes de começar, gostaria que a senhora sentisse o cheiro do shampoo."</td></tr>
  <tr><td style="${TD}">Venda de produtos</td><td style="${TD}">"Este shampoo e condicionador estão disponíveis para venda. Gostaria de levar?"</td></tr>
</table>
<h3>D. Execução</h3>
<table style="${TBL}">
  <tr><th style="${TH}">Situação</th><th style="${TH}">Frase Padrão</th></tr>
  <tr><td style="${TD}">1º shampoo</td><td style="${TD}">"Vamos começar com o primeiro shampoo para fazer uma limpeza profunda."</td></tr>
  <tr><td style="${TD}">2º shampoo</td><td style="${TD}">"Agora vamos aplicar o segundo shampoo, específico para seu tipo de cabelo."</td></tr>
  <tr><td style="${TD}">Massagem</td><td style="${TD}">"Vou fazer uma massagem no couro cabeludo por 3 minutos."</td></tr>
  <tr><td style="${TD}">Condicionador</td><td style="${TD}">"Vamos aplicar o condicionador para hidratar e desembaraçar seu cabelo."</td></tr>
</table>
<h3>E. Finalização</h3>
<table style="${TBL}">
  <tr><th style="${TH}">Situação</th><th style="${TH}">Frase Padrão</th></tr>
  <tr><td style="${TD}">Finalizando</td><td style="${TD}">"Finalizamos a higienização. O cabelo está limpo e preparado."</td></tr>
  <tr><td style="${TD}">Preparação</td><td style="${TD}">"Seu cabelo está pronto para o procedimento."</td></tr>
  <tr><td style="${TD}">Chamando o profissional</td><td style="${TD}">"[Cabeleireiro], a cliente [Nome] está pronta."</td></tr>
</table>
`.trim()

const PRO_LAVATORIO_ESPECIAL_HTML = `
<h1>Procedimento Operacional Padrão (POP)</h1>
<p style="color:#6b6880;font-size:15px;margin:-4px 0 16px;font-weight:600">POP-PRO-004 — Atendimento de Higienização Especial (Lavatório)</p>

<h2>1. Identificação</h2>
<div style="${META}">
  <p style="margin:0"><strong>Código:</strong> POP-PRO-004 &nbsp;·&nbsp; <strong>Versão:</strong> 1.0 &nbsp;·&nbsp; <strong>Setor:</strong> Profissionais (Lavatório / Auxiliar de Cabeleireiro)</p>
  <p style="margin:8px 0 0"><strong>Responsável:</strong> <span style="${FIELD}"></span> (Profissional do Lavatório)</p>
  <p style="margin:8px 0 0"><strong>Data de Emissão:</strong> ___/___/______ &nbsp;·&nbsp; <strong>Última Revisão:</strong> ___/___/______ &nbsp;·&nbsp; <strong>Próxima Revisão:</strong> ___/___/______</p>
</div>

<h2>2. Objetivo</h2>
<p>Padronizar o atendimento de <strong>higienização especial</strong> no lavatório, um serviço diferenciado que utiliza produtos específicos, massagem prolongada e maior tempo de execução, garantindo uma experiência sensorial premium, relaxamento, avaliação capilar detalhada e resultado superior ao da higienização comum.</p>

<h2>3. Campo de Aplicação</h2>
<p>Este procedimento aplica-se a todos os profissionais responsáveis pelos serviços de higienização especial no lavatório.</p>

<h2>4. Diferenciais da Higienização Especial</h2>
<div style="${BOX}">
  <div style="${BOXH}">O que diferencia este serviço da higienização comum</div>
  <ul>
    <li><strong>Produtos específicos</strong> — selecionados conforme a necessidade identificada na avaliação.</li>
    <li><strong>Tempo de execução de 10 a 15 minutos</strong> — o serviço não deve ser apressado.</li>
    <li><strong>Pode ter um shampoo a mais</strong> — aplicação de um 3º shampoo quando o cabelo exigir.</li>
    <li><strong>A cliente pode trazer os próprios produtos</strong> — devem ser utilizados conforme a orientação dela.</li>
    <li><strong>Massagem de 10 minutos</strong> no couro cabeludo (na higienização comum são 3 minutos).</li>
  </ul>
</div>
<table style="${TBL}">
  <tr><th style="${TH}">Etapa</th><th style="${TH}">Higienização Comum</th><th style="${TH}">Higienização Especial</th></tr>
  <tr><td style="${TD}">Produtos</td><td style="${TD}">Linha padrão do salão</td><td style="${TD}">Produtos específicos ou os da própria cliente</td></tr>
  <tr><td style="${TD}">Quantidade de shampoos</td><td style="${TD}">2 shampoos</td><td style="${TD}">2 shampoos (+ 1 adicional quando necessário)</td></tr>
  <tr><td style="${TD}">Massagem</td><td style="${TD}">3 minutos</td><td style="${TD}">10 minutos</td></tr>
  <tr><td style="${TD}">Tempo total</td><td style="${TD}">Conforme o fluxo</td><td style="${TD}">De 10 a 15 minutos</td></tr>
  <tr><td style="${TD}">Finalização</td><td style="${TD}">Condicionador</td><td style="${TD}">Condicionador ou máscara, conforme a necessidade</td></tr>
</table>

<h2>5. Responsabilidades</h2>
<h3>Profissional do Lavatório</h3>
<ul>
  <li>Cumprir integralmente este POP.</li>
  <li>Manter postura ética e profissional.</li>
  <li>Zelar pela segurança e bem-estar da cliente.</li>
  <li>Realizar avaliação capilar detalhada.</li>
  <li>Selecionar e aplicar corretamente os produtos específicos.</li>
  <li>Respeitar o tempo mínimo de execução do serviço.</li>
  <li>Executar a massagem de 10 minutos com técnica adequada.</li>
  <li>Garantir conforto durante todo o procedimento.</li>
  <li>Oferecer tratamentos complementares.</li>
  <li>Manter o lavatório limpo e organizado.</li>
</ul>
<h3>Cabeleireiro / Profissional Principal</h3>
<ul>
  <li>Aguardar a cliente ser preparada.</li>
  <li>Realizar o procedimento principal (corte, coloração, escova, etc.).</li>
</ul>
<h3>Recepção</h3>
<ul>
  <li>Confirmar o agendamento da higienização especial.</li>
  <li>Recepcionar e acomodar a cliente.</li>
  <li>Reservar o tempo adequado na agenda.</li>
</ul>
<h3>Gerência</h3>
<ul>
  <li>Fiscalizar o cumprimento deste POP.</li>
  <li>Treinar continuamente a equipe.</li>
  <li>Garantir a disponibilidade dos produtos específicos.</li>
  <li>Acompanhar os indicadores de satisfação e ticket médio.</li>
</ul>

<h2>6. Materiais Necessários</h2>
<h3>Equipamentos</h3>
<ul style="${CHECK}">
  <li>☐ Lavatório (cadeira e pia).</li>
  <li>☐ Toalhas limpas.</li>
  <li>☐ Capa de proteção.</li>
  <li>☐ Robe ou avental.</li>
  <li>☐ Touca descartável.</li>
  <li>☐ Pentes e escovas.</li>
  <li>☐ Cronômetro ou timer (obrigatório para a massagem e as pausas).</li>
</ul>
<h3>Produtos</h3>
<ul style="${CHECK}">
  <li>☐ Shampoo 1 (limpeza profunda).</li>
  <li>☐ Shampoo 2 (específico para o tipo de cabelo).</li>
  <li>☐ Shampoo 3 (adicional, quando o cabelo exigir).</li>
  <li>☐ Condicionador.</li>
  <li>☐ Máscara de hidratação.</li>
  <li>☐ Máscara de nutrição.</li>
  <li>☐ Máscara de reconstrução.</li>
  <li>☐ Óleos e finalizadores.</li>
  <li>☐ Produtos trazidos pela cliente (quando houver).</li>
</ul>

<h2>7. Biossegurança e Higiene</h2>
<h3>Antes do Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Higienizar corretamente as mãos.</li>
  <li>☐ Manter uniforme limpo.</li>
  <li>☐ Manter cabelos presos.</li>
  <li>☐ Manter as unhas curtas e sem asperezas (a massagem é prolongada).</li>
  <li>☐ Utilizar máscara limpa.</li>
  <li>☐ Conferir a limpeza do lavatório.</li>
  <li>☐ Organizar todos os produtos e materiais.</li>
  <li>☐ Verificar a validade dos produtos.</li>
  <li>☐ Preparar toalhas limpas.</li>
</ul>
<h3>Durante o Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Manter o lavatório organizado.</li>
  <li>☐ Não utilizar telefone celular.</li>
  <li>☐ Não consumir alimentos.</li>
  <li>☐ Evitar respingos no rosto da cliente.</li>
  <li>☐ Manter a temperatura da água adequada.</li>
  <li>☐ Não conversar em excesso durante a massagem (preservar o relaxamento).</li>
</ul>
<h3>Após o Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Descartar corretamente os materiais descartáveis.</li>
  <li>☐ Higienizar o lavatório.</li>
  <li>☐ Higienizar as mãos.</li>
  <li>☐ Devolver à cliente os produtos que ela trouxe.</li>
  <li>☐ Preparar o lavatório para a próxima cliente.</li>
</ul>

<h2>8. Procedimento Operacional</h2>

<h3>PARTE A — Início do Atendimento</h3>
<p><strong>1. Apresentação do Profissional</strong> — sempre iniciar o atendimento de frente para a cliente, demonstrando simpatia, cordialidade e profissionalismo.</p>
<blockquote>"Olá (Nome da cliente), meu nome é (Nome do Profissional) e hoje eu serei o(a) responsável pelo seu atendimento."</blockquote>
<p><strong>2. Confirmação do Serviço</strong></p>
<blockquote>"A senhora irá fazer a higienização especial hoje, correto?"</blockquote>
<p><strong>3. Identificação da Necessidade</strong></p>
<blockquote>"O que a senhora pensou para hoje?" · "A senhora possui alguma preferência ou alguma foto de referência?" · "A senhora trouxe algum produto que gostaria que eu utilizasse?"</blockquote>
<p><strong>4. Ponderações e Orientações</strong> — após ouvir atentamente a cliente, explicar de forma clara e profissional o que é possível fazer e o que não é recomendado:</p>
<ul style="${CHECK}">
  <li>☐ O que é possível realizar.</li>
  <li>☐ O que não é recomendado realizar.</li>
  <li>☐ As limitações técnicas do procedimento.</li>
  <li>☐ Os cuidados necessários para preservar a saúde do cabelo.</li>
</ul>
<blockquote>"Baseado no que a senhora deseja, é possível fazer [explicar o que dá para fazer]."</blockquote>
<blockquote>"Não recomendamos [explicar o que não é recomendado] porque [explicar o motivo]."</blockquote>
<p><strong>Nenhum procedimento deverá ser iniciado antes que a cliente compreenda e concorde com o serviço que será realizado.</strong></p>

<h3>PARTE B — Avaliação Capilar</h3>
<p><strong>5. Cliente vai para o lavatório</strong> — conduzir a cliente, ajudá-la a se acomodar confortavelmente, ajustar a cadeira e verificar se ela está confortável.</p>
<p><strong>6. Avaliação do Cabelo e Informação das Necessidades</strong></p>
<ul style="${CHECK}">
  <li>☐ Observar o estado geral do cabelo.</li>
  <li>☐ Verificar o tipo de cabelo (liso, ondulado, cacheado, crespo).</li>
  <li>☐ Verificar a porosidade do cabelo.</li>
  <li>☐ Verificar se há ressecamento, danos ou pontas duplas.</li>
  <li>☐ Verificar se há química (coloração, descoloração, etc.).</li>
  <li>☐ Verificar o couro cabeludo (oleosidade, caspa, sensibilidade).</li>
  <li>☐ Informar à cliente as necessidades identificadas.</li>
</ul>
<blockquote>"Percebi que seu cabelo está [descrever a condição]. Para melhorar a saúde do seu cabelo, recomendamos [sugerir tratamento]."</blockquote>
<p><strong>7. Oferta de Tratamento</strong> — perguntar se a cliente deseja realizar algum tratamento de acordo com a necessidade identificada.</p>
<blockquote>"A senhora gostaria de fazer um tratamento de [hidratação/nutrição/reconstrução] de acordo com a necessidade do seu cabelo?"</blockquote>
<p><strong>8. Informar os Produtos Utilizados</strong> — informar todos os produtos que serão utilizados e a função de cada um.</p>
<blockquote>"Hoje vou utilizar o Shampoo [nome] para [função], o Condicionador [nome] para [função], e um tratamento de [nome]."</blockquote>
<p><strong>Caso a cliente tenha trazido os próprios produtos:</strong> conferir com ela quais devem ser utilizados e em qual ordem.</p>
<blockquote>"Vou utilizar os produtos que a senhora trouxe. Confirmando: primeiro o [produto], depois o [produto], correto?"</blockquote>
<p><strong>9. Experiência Sensorial</strong> — deixar a cliente sentir o cheiro dos produtos.</p>
<blockquote>"Antes de começar, gostaria que a senhora sentisse o cheiro do shampoo que vou utilizar. Temos outras opções de aroma, caso prefira."</blockquote>

<h3>PARTE C — Execução da Higienização Especial</h3>
<p><strong>10. Preparação</strong></p>
<ul style="${CHECK}">
  <li>☐ Verificar a temperatura da água (morna, agradável).</li>
  <li>☐ Posicionar a cliente corretamente no lavatório.</li>
  <li>☐ Colocar a capa de proteção.</li>
  <li>☐ Soltar um pouco o cabelo da raiz e desembaraçar suavemente.</li>
</ul>
<p><strong>11. Aplicação do 1º Shampoo</strong> — objetivo: remover impurezas e oleosidade.</p>
<ul style="${CHECK}">
  <li>☐ Aplicar o 1º shampoo em todo o cabelo.</li>
  <li>☐ Emulsionar bem o produto.</li>
  <li>☐ Massagear suavemente o couro cabeludo.</li>
  <li>☐ Enxaguar completamente.</li>
</ul>
<p><strong>12. Aplicação do 2º Shampoo + Massagem de 10 Minutos</strong> — esta é a etapa central do serviço especial.</p>
<ul style="${CHECK}">
  <li>☐ Aplicar o 2º shampoo (específico para o tipo de cabelo).</li>
  <li>☐ Realizar a massagem no couro cabeludo por <strong>10 minutos</strong>, cronometrados.</li>
  <li>☐ Utilizar movimentos circulares, firmes e constantes, com as polpas dos dedos.</li>
  <li>☐ Cobrir toda a extensão do couro cabeludo (nuca, laterais e topo).</li>
  <li>☐ Verificar com a cliente se a pressão está agradável.</li>
  <li>☐ Enxaguar completamente.</li>
</ul>
<blockquote>"Agora vou fazer uma massagem de 10 minutos no couro cabeludo. Ela estimula a circulação, potencializa a limpeza e ajuda muito no relaxamento. Fique à vontade para fechar os olhos."</blockquote>
<blockquote>"A pressão está boa para a senhora, ou prefere um pouco mais suave?"</blockquote>
<p><strong>13. Aplicação do 3º Shampoo</strong> (somente quando o cabelo exigir)</p>
<ul style="${CHECK}">
  <li>☐ Avaliar se o cabelo necessita de uma limpeza adicional.</li>
  <li>☐ Aplicar o 3º shampoo.</li>
  <li>☐ Enxaguar completamente.</li>
</ul>
<p><strong>14. Tempo de Pausa</strong> — aguardar o tempo de pausa recomendado pela marca do produto, utilizando o cronômetro.</p>
<p><strong>15. Aplicação do Condicionador ou Máscara</strong></p>
<ul style="${CHECK}">
  <li>☐ Escolher entre condicionador ou máscara conforme a necessidade identificada.</li>
  <li>☐ Aplicar no comprimento e nas pontas, evitando a raiz (a menos que indicado).</li>
  <li>☐ Aguardar o tempo recomendado pela marca.</li>
  <li>☐ Enxaguar completamente.</li>
</ul>
<p><strong>16. Tempo Total do Serviço</strong> — a higienização especial deve durar <strong>de 10 a 15 minutos</strong>. O serviço não deve ser apressado nem interrompido.</p>

<h3>PARTE D — Finalização da Higienização Especial</h3>
<p><strong>17. Finalização</strong></p>
<ul style="${CHECK}">
  <li>☐ Enxaguar completamente todos os produtos.</li>
  <li>☐ Verificar se não há resíduos de shampoo, condicionador ou máscara.</li>
  <li>☐ Fazer a touca com a toalha para proteger o cabelo.</li>
</ul>
<blockquote>"Finalizamos a higienização especial. O cabelo está limpo e preparado para o próximo procedimento."</blockquote>
<p><strong>18. Levar para a Cadeira</strong></p>
<ul style="${CHECK}">
  <li>☐ Conduzir a cliente até a cadeira do profissional principal.</li>
  <li>☐ Ajudar a cliente a se sentar.</li>
  <li>☐ Remover a touca de toalha.</li>
  <li>☐ Secar com a toalha, retirando o excesso de água.</li>
</ul>
<p><strong>19. Preparação para o Procedimento Principal</strong></p>
<ul style="${CHECK}">
  <li>☐ Colocar a capa de proteção.</li>
  <li>☐ Colocar o robe ou avental.</li>
  <li>☐ Pentear e alinhar o cabelo.</li>
  <li>☐ Verificar se a cliente está confortável.</li>
</ul>
<blockquote>"Seu cabelo está pronto para o procedimento. O(A) [Cabeleireiro] vai te atender em instantes. Fique à vontade."</blockquote>
<p><strong>20. Chamar o Profissional Principal</strong> — informar obrigatoriamente:</p>
<ul style="${CHECK}">
  <li>☐ Nome da cliente.</li>
  <li>☐ Procedimentos agendados.</li>
  <li>☐ Produtos e tratamentos utilizados no lavatório.</li>
  <li>☐ Observações sobre o cabelo da cliente.</li>
</ul>
<blockquote>"[Nome do Cabeleireiro], a cliente [Nome da Cliente] está pronta. Foi feita a higienização especial com [produtos/tratamento]. O cabelo está [descrição]."</blockquote>

<h3>PARTE E — Organização Pós-Atendimento</h3>
<p><strong>21. Limpeza e Organização do Lavatório</strong></p>
<ul style="${CHECK}">
  <li>☐ Organizar completamente o lavatório.</li>
  <li>☐ Descartar corretamente os resíduos.</li>
  <li>☐ Higienizar toda a pia e a cadeira.</li>
  <li>☐ Devolver à cliente os produtos que ela trouxe.</li>
  <li>☐ Higienizar as mãos.</li>
  <li>☐ Preparar o lavatório para a próxima cliente.</li>
</ul>
<p><strong>22. Registro no Sistema</strong></p>
<ul style="${CHECK}">
  <li>☐ Registrar a higienização especial.</li>
  <li>☐ Registrar os produtos utilizados.</li>
  <li>☐ Registrar os tratamentos realizados.</li>
  <li>☐ Registrar os produtos vendidos (se houver).</li>
</ul>

<h2>9. Indicadores de Qualidade</h2>
<p>A gerência deverá acompanhar mensalmente:</p>
<ul style="${CHECK}">
  <li>☐ Tempo médio da higienização especial (meta: 10 a 15 minutos).</li>
  <li>☐ Cumprimento da massagem de 10 minutos.</li>
  <li>☐ Índice de satisfação da cliente (conforto, relaxamento, experiência).</li>
  <li>☐ Número de reclamações sobre o lavatório.</li>
  <li>☐ Conversão de higienização comum em higienização especial.</li>
  <li>☐ Vendas de tratamentos a partir da avaliação capilar.</li>
  <li>☐ Ticket médio por cliente.</li>
  <li>☐ Conformidade com as normas de biossegurança.</li>
</ul>

<h2>10. Checklist de Auditoria</h2>
<div style="${BOX}">
  <div style="${BOXH}">Apresentação</div>
  <ul style="${CHECK}">
    <li>☐ Apresentou-se de frente para a cliente, com nome.</li>
    <li>☐ Confirmou o serviço (higienização especial).</li>
    <li>☐ Perguntou o que a cliente desejava.</li>
    <li>☐ Perguntou se havia preferência ou referência.</li>
    <li>☐ Fez as ponderações do que dá e do que não dá para fazer.</li>
  </ul>
  <div style="${BOXH}">Avaliação</div>
  <ul style="${CHECK}">
    <li>☐ Realizou avaliação capilar e informou as necessidades.</li>
    <li>☐ Perguntou se deseja tratamento conforme a necessidade.</li>
    <li>☐ Informou todos os produtos que seriam utilizados.</li>
    <li>☐ Deixou a cliente sentir o cheiro dos produtos.</li>
    <li>☐ Confirmou o uso dos produtos trazidos pela cliente (quando houver).</li>
  </ul>
  <div style="${BOXH}">Execução</div>
  <ul style="${CHECK}">
    <li>☐ Soltou o cabelo da raiz.</li>
    <li>☐ Aplicou o 1º shampoo corretamente.</li>
    <li>☐ Aplicou o 2º shampoo + massagem de 10 minutos.</li>
    <li>☐ Aplicou o 3º shampoo quando necessário.</li>
    <li>☐ Respeitou o tempo de pausa da marca.</li>
    <li>☐ Aplicou o condicionador ou a máscara.</li>
    <li>☐ Cumpriu o tempo de execução de 10 a 15 minutos.</li>
    <li>☐ Enxaguou completamente.</li>
  </ul>
  <div style="${BOXH}">Finalização</div>
  <ul style="${CHECK}">
    <li>☐ Fez a touca.</li>
    <li>☐ Levou a cliente para a cadeira.</li>
    <li>☐ Secou com a toalha.</li>
    <li>☐ Preparou para o procedimento (capa, robe, penteado).</li>
    <li>☐ Penteou e alinhou o cabelo.</li>
    <li>☐ Chamou o profissional principal.</li>
  </ul>
  <div style="${BOXH}">Organização</div>
  <ul style="${CHECK}">
    <li>☐ Organizou e higienizou o lavatório.</li>
    <li>☐ Devolveu os produtos da cliente.</li>
    <li>☐ Registrou o serviço no sistema.</li>
  </ul>
</div>
`.trim()

const PRO_SHIATSU_HTML = `
<h1>Procedimento Operacional Padrão (POP)</h1>
<p style="color:#6b6880;font-size:15px;margin:-4px 0 16px;font-weight:600">POP-PRO-005 — Shiatsu Capilar (Lavatório)</p>

<h2>1. Identificação</h2>
<div style="${META}">
  <p style="margin:0"><strong>Código:</strong> POP-PRO-005 &nbsp;·&nbsp; <strong>Versão:</strong> 1.0 &nbsp;·&nbsp; <strong>Setor:</strong> Profissionais (Lavatório / Auxiliar de Cabeleireiro)</p>
  <p style="margin:8px 0 0"><strong>Responsável:</strong> <span style="${FIELD}"></span> (Profissional do Lavatório)</p>
  <p style="margin:8px 0 0"><strong>Data de Emissão:</strong> ___/___/______ &nbsp;·&nbsp; <strong>Última Revisão:</strong> ___/___/______ &nbsp;·&nbsp; <strong>Próxima Revisão:</strong> ___/___/______</p>
</div>

<h2>2. Objetivo</h2>
<p>Padronizar o atendimento de <strong>shiatsu capilar</strong>, serviço de maior valor agregado do lavatório, que une a higienização à <strong>massagem terapêutica</strong> por pressão em pontos do couro cabeludo, promovendo relaxamento profundo, alívio da tensão, estímulo da circulação e uma experiência sensorial diferenciada.</p>

<h2>3. Campo de Aplicação</h2>
<p>Este procedimento aplica-se a todos os profissionais do lavatório capacitados para a execução do shiatsu capilar.</p>

<h2>4. Diferenciais do Shiatsu Capilar</h2>
<div style="${BOX}">
  <div style="${BOXH}">O que diferencia este serviço</div>
  <ul>
    <li><strong>Massagem terapêutica de 15 a 25 minutos</strong> — por pressão em pontos do couro cabeludo, e não apenas fricção.</li>
    <li><strong>Produtos específicos</strong> — selecionados conforme a necessidade identificada na avaliação.</li>
    <li><strong>Pode ter um shampoo a mais</strong> — aplicação de um 3º shampoo quando o cabelo exigir.</li>
    <li><strong>A cliente pode trazer os próprios produtos</strong> — devem ser utilizados conforme a orientação dela.</li>
    <li><strong>Ambiente e ritmo próprios</strong> — silêncio, pressão constante e sem interrupções.</li>
  </ul>
</div>
<table style="${TBL}">
  <tr><th style="${TH}">Etapa</th><th style="${TH}">Higienização Comum</th><th style="${TH}">Higienização Especial</th><th style="${TH}">Shiatsu Capilar</th></tr>
  <tr><td style="${TD}">Massagem</td><td style="${TD}">3 minutos</td><td style="${TD}">10 minutos</td><td style="${TD}"><strong>15 a 25 minutos (terapêutica)</strong></td></tr>
  <tr><td style="${TD}">Técnica</td><td style="${TD}">Fricção durante a lavagem</td><td style="${TD}">Movimentos circulares</td><td style="${TD}">Pressão em pontos + movimentos circulares</td></tr>
  <tr><td style="${TD}">Produtos</td><td style="${TD}">Linha padrão</td><td style="${TD}">Específicos ou da cliente</td><td style="${TD}">Específicos ou da cliente</td></tr>
  <tr><td style="${TD}">Shampoos</td><td style="${TD}">2</td><td style="${TD}">2 (+1 se necessário)</td><td style="${TD}">2 (+1 se necessário)</td></tr>
  <tr><td style="${TD}">Objetivo principal</td><td style="${TD}">Limpeza</td><td style="${TD}">Limpeza + relaxamento</td><td style="${TD}">Terapêutico: alívio de tensão e relaxamento profundo</td></tr>
</table>

<h2>5. Responsabilidades</h2>
<h3>Profissional do Lavatório</h3>
<ul>
  <li>Cumprir integralmente este POP.</li>
  <li>Estar capacitado para a execução da técnica de shiatsu capilar.</li>
  <li>Verificar as contraindicações antes de iniciar.</li>
  <li>Zelar pela segurança e bem-estar da cliente.</li>
  <li>Realizar avaliação capilar detalhada.</li>
  <li>Respeitar o tempo mínimo de execução do serviço.</li>
  <li>Executar a massagem com pressão adequada e constante.</li>
  <li>Garantir conforto e relaxamento durante todo o procedimento.</li>
  <li>Manter o lavatório limpo e organizado.</li>
</ul>
<h3>Cabeleireiro / Profissional Principal</h3>
<ul>
  <li>Aguardar a cliente ser preparada.</li>
  <li>Realizar o procedimento principal.</li>
</ul>
<h3>Recepção</h3>
<ul>
  <li>Confirmar o agendamento do shiatsu capilar.</li>
  <li>Reservar o tempo adequado na agenda (serviço de 15 a 25 minutos).</li>
  <li>Recepcionar e acomodar a cliente.</li>
</ul>
<h3>Gerência</h3>
<ul>
  <li>Fiscalizar o cumprimento deste POP.</li>
  <li>Capacitar e reciclar a equipe na técnica.</li>
  <li>Garantir a disponibilidade dos produtos específicos.</li>
  <li>Acompanhar os indicadores de satisfação e ticket médio.</li>
</ul>

<h2>6. Materiais Necessários</h2>
<h3>Equipamentos</h3>
<ul style="${CHECK}">
  <li>☐ Lavatório (cadeira e pia) com apoio de pescoço confortável.</li>
  <li>☐ Toalhas limpas.</li>
  <li>☐ Toalha ou apoio extra para o pescoço.</li>
  <li>☐ Capa de proteção.</li>
  <li>☐ Robe ou avental.</li>
  <li>☐ Touca descartável.</li>
  <li>☐ Pentes e escovas.</li>
  <li>☐ Cronômetro ou timer (obrigatório).</li>
</ul>
<h3>Produtos</h3>
<ul style="${CHECK}">
  <li>☐ Shampoo 1 (limpeza profunda).</li>
  <li>☐ Shampoo 2 (específico para o tipo de cabelo).</li>
  <li>☐ Shampoo 3 (adicional, quando o cabelo exigir).</li>
  <li>☐ Condicionador.</li>
  <li>☐ Máscara de hidratação, nutrição ou reconstrução.</li>
  <li>☐ Óleos e finalizadores.</li>
  <li>☐ Produtos trazidos pela cliente (quando houver).</li>
</ul>

<h2>7. Contraindicações e Cuidados</h2>
<div style="${BOX}">
  <div style="${BOXH}">Perguntar à cliente antes de iniciar</div>
  <ul style="${CHECK}">
    <li>☐ Possui alguma lesão, ferida ou irritação no couro cabeludo?</li>
    <li>☐ Realizou algum procedimento químico ou cirúrgico recente na cabeça?</li>
    <li>☐ Tem sensibilidade, dor no pescoço, na coluna cervical ou nos ombros?</li>
    <li>☐ Sente enxaqueca, tontura ou labirintite com frequência?</li>
    <li>☐ Está gestante?</li>
    <li>☐ Tem alergia a algum produto?</li>
  </ul>
  <p style="margin:8px 0 0"><strong>Havendo qualquer uma dessas condições, não iniciar o procedimento sem antes consultar a gerência.</strong> Em caso de dor, desconforto, tontura ou mal-estar durante a massagem, interromper imediatamente e comunicar a gerência.</p>
</div>

<h2>8. Biossegurança e Higiene</h2>
<h3>Antes do Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Higienizar corretamente as mãos.</li>
  <li>☐ Manter uniforme limpo.</li>
  <li>☐ Manter cabelos presos.</li>
  <li>☐ Manter as unhas curtas e sem asperezas (a massagem é longa e por pressão).</li>
  <li>☐ Retirar anéis, pulseiras e relógio.</li>
  <li>☐ Utilizar máscara limpa.</li>
  <li>☐ Conferir a limpeza do lavatório.</li>
  <li>☐ Organizar todos os produtos e verificar a validade.</li>
  <li>☐ Preparar toalhas limpas e o apoio de pescoço.</li>
</ul>
<h3>Durante o Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Manter o lavatório organizado.</li>
  <li>☐ Não utilizar telefone celular.</li>
  <li>☐ Não consumir alimentos.</li>
  <li>☐ Evitar respingos no rosto da cliente.</li>
  <li>☐ Manter a temperatura da água adequada.</li>
  <li>☐ Manter silêncio durante a massagem (preservar o relaxamento).</li>
  <li>☐ Não interromper a massagem para atender outras demandas.</li>
</ul>
<h3>Após o Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Descartar corretamente os materiais descartáveis.</li>
  <li>☐ Higienizar o lavatório.</li>
  <li>☐ Higienizar as mãos.</li>
  <li>☐ Devolver à cliente os produtos que ela trouxe.</li>
  <li>☐ Preparar o lavatório para a próxima cliente.</li>
</ul>

<h2>9. Procedimento Operacional</h2>

<h3>PARTE A — Início do Atendimento</h3>
<p><strong>1. Apresentação do Profissional</strong> — sempre iniciar o atendimento de frente para a cliente, demonstrando simpatia, cordialidade e profissionalismo.</p>
<blockquote>"Olá (Nome da cliente), meu nome é (Nome do Profissional) e hoje eu serei o(a) responsável pelo seu atendimento."</blockquote>
<p><strong>2. Confirmação do Serviço</strong></p>
<blockquote>"A senhora irá fazer o shiatsu capilar hoje, correto?"</blockquote>
<p><strong>3. Identificação da Necessidade</strong></p>
<blockquote>"O que a senhora pensou para hoje?" · "A senhora possui alguma preferência ou alguma foto de referência?" · "A senhora trouxe algum produto que gostaria que eu utilizasse?"</blockquote>
<p><strong>4. Verificação das Contraindicações</strong> — aplicar as perguntas do item 7 antes de qualquer procedimento.</p>
<blockquote>"Antes de começarmos, preciso te fazer algumas perguntas rápidas: a senhora tem alguma sensibilidade no couro cabeludo, dor no pescoço ou costuma sentir tontura?"</blockquote>
<p><strong>5. Ponderações e Orientações</strong> — após ouvir atentamente a cliente, explicar de forma clara e profissional o que é possível fazer e o que não é recomendado:</p>
<ul style="${CHECK}">
  <li>☐ O que é possível realizar.</li>
  <li>☐ O que não é recomendado realizar.</li>
  <li>☐ As limitações técnicas do procedimento.</li>
  <li>☐ Os cuidados necessários para preservar a saúde do cabelo.</li>
</ul>
<blockquote>"Baseado no que a senhora deseja, é possível fazer [explicar o que dá para fazer]."</blockquote>
<blockquote>"Não recomendamos [explicar o que não é recomendado] porque [explicar o motivo]."</blockquote>
<p><strong>Nenhum procedimento deverá ser iniciado antes que a cliente compreenda e concorde com o serviço que será realizado.</strong></p>

<h3>PARTE B — Avaliação Capilar</h3>
<p><strong>6. Cliente vai para o lavatório</strong> — conduzir a cliente, ajudá-la a se acomodar confortavelmente, ajustar a cadeira e o apoio do pescoço, e verificar se ela está confortável.</p>
<blockquote>"O apoio do pescoço está confortável para a senhora? Precisa que eu ajuste?"</blockquote>
<p><strong>7. Avaliação do Cabelo e Informação das Necessidades</strong></p>
<ul style="${CHECK}">
  <li>☐ Observar o estado geral do cabelo.</li>
  <li>☐ Verificar o tipo de cabelo (liso, ondulado, cacheado, crespo).</li>
  <li>☐ Verificar a porosidade do cabelo.</li>
  <li>☐ Verificar se há ressecamento, danos ou pontas duplas.</li>
  <li>☐ Verificar se há química (coloração, descoloração, etc.).</li>
  <li>☐ Verificar o couro cabeludo (oleosidade, caspa, sensibilidade, lesões).</li>
  <li>☐ Informar à cliente as necessidades identificadas.</li>
</ul>
<blockquote>"Percebi que seu cabelo está [descrever a condição]. Para melhorar a saúde do seu cabelo, recomendamos [sugerir tratamento]."</blockquote>
<p><strong>8. Oferta de Tratamento</strong> — perguntar se a cliente deseja realizar algum tratamento de acordo com a necessidade identificada.</p>
<blockquote>"A senhora gostaria de fazer um tratamento de [hidratação/nutrição/reconstrução] de acordo com a necessidade do seu cabelo?"</blockquote>
<p><strong>9. Informar os Produtos Utilizados</strong> — informar todos os produtos que serão utilizados e a função de cada um.</p>
<blockquote>"Hoje vou utilizar o Shampoo [nome] para [função], o Condicionador [nome] para [função], e um tratamento de [nome]."</blockquote>
<p><strong>Caso a cliente tenha trazido os próprios produtos:</strong> conferir com ela quais devem ser utilizados e em qual ordem.</p>
<p><strong>10. Experiência Sensorial</strong> — deixar a cliente sentir o cheiro dos produtos.</p>
<blockquote>"Antes de começar, gostaria que a senhora sentisse o cheiro do shampoo que vou utilizar. Temos outras opções de aroma, caso prefira."</blockquote>

<h3>PARTE C — Execução do Shiatsu Capilar</h3>
<p><strong>11. Preparação</strong></p>
<ul style="${CHECK}">
  <li>☐ Verificar a temperatura da água (morna, agradável).</li>
  <li>☐ Posicionar a cliente corretamente, com a cervical apoiada.</li>
  <li>☐ Colocar a capa de proteção.</li>
  <li>☐ Soltar um pouco o cabelo da raiz e desembaraçar suavemente.</li>
</ul>
<p><strong>12. Aplicação do 1º Shampoo</strong> — objetivo: remover impurezas e oleosidade.</p>
<ul style="${CHECK}">
  <li>☐ Aplicar o 1º shampoo em todo o cabelo.</li>
  <li>☐ Emulsionar bem o produto.</li>
  <li>☐ Massagear suavemente o couro cabeludo.</li>
  <li>☐ Enxaguar completamente.</li>
</ul>
<p><strong>13. Aplicação do 2º Shampoo + Shiatsu de 15 a 25 Minutos</strong> — esta é a etapa central do serviço.</p>
<ul style="${CHECK}">
  <li>☐ Aplicar o 2º shampoo (específico para o tipo de cabelo).</li>
  <li>☐ Iniciar o cronômetro.</li>
  <li>☐ Executar a massagem por <strong>15 a 25 minutos</strong>.</li>
  <li>☐ Aplicar pressão com as polpas dos dedos, sem usar as unhas.</li>
  <li>☐ Manter pressão firme, constante e ritmada.</li>
  <li>☐ Percorrer toda a extensão do couro cabeludo.</li>
  <li>☐ Verificar com a cliente se a pressão está agradável.</li>
  <li>☐ Manter silêncio durante a execução.</li>
  <li>☐ Enxaguar completamente ao final.</li>
</ul>
<div style="${BOX}">
  <div style="${BOXH}">Sequência sugerida das regiões</div>
  <table style="${TBL}">
    <tr><th style="${TH}">Ordem</th><th style="${TH}">Região</th><th style="${TH}">Observação</th></tr>
    <tr><td style="${TD}">1</td><td style="${TD}">Linha frontal (testa até o topo)</td><td style="${TD}">Pressão suave, em pontos sequenciais</td></tr>
    <tr><td style="${TD}">2</td><td style="${TD}">Topo da cabeça (coroa)</td><td style="${TD}">Movimentos circulares lentos</td></tr>
    <tr><td style="${TD}">3</td><td style="${TD}">Laterais e região das têmporas</td><td style="${TD}">Pressão leve — região sensível</td></tr>
    <tr><td style="${TD}">4</td><td style="${TD}">Região atrás das orelhas</td><td style="${TD}">Movimentos lentos e firmes</td></tr>
    <tr><td style="${TD}">5</td><td style="${TD}">Nuca e base do crânio</td><td style="${TD}">Onde a tensão costuma se concentrar</td></tr>
    <tr><td style="${TD}">6</td><td style="${TD}">Retorno ao topo, finalizando</td><td style="${TD}">Reduzir a pressão gradualmente</td></tr>
  </table>
</div>
<blockquote>"Agora vou iniciar o shiatsu. São de 15 a 25 minutos de massagem. Ela alivia a tensão, estimula a circulação e relaxa profundamente. Fique à vontade para fechar os olhos e não precisa conversar."</blockquote>
<blockquote>"A pressão está boa para a senhora, ou prefere um pouco mais suave?"</blockquote>
<p><strong>14. Aplicação do 3º Shampoo</strong> (somente quando o cabelo exigir) — avaliar a necessidade, aplicar e enxaguar completamente.</p>
<p><strong>15. Tempo de Pausa</strong> — aguardar o tempo de pausa recomendado pela marca do produto, utilizando o cronômetro.</p>
<p><strong>16. Aplicação do Condicionador ou Máscara</strong></p>
<ul style="${CHECK}">
  <li>☐ Escolher entre condicionador ou máscara conforme a necessidade identificada.</li>
  <li>☐ Aplicar no comprimento e nas pontas, evitando a raiz (a menos que indicado).</li>
  <li>☐ Aguardar o tempo recomendado pela marca.</li>
  <li>☐ Enxaguar completamente.</li>
</ul>

<h3>PARTE D — Finalização do Shiatsu</h3>
<p><strong>17. Finalização</strong></p>
<ul style="${CHECK}">
  <li>☐ Enxaguar completamente todos os produtos.</li>
  <li>☐ Verificar se não há resíduos de shampoo, condicionador ou máscara.</li>
  <li>☐ Avisar a cliente que a massagem terminou, antes de movimentá-la.</li>
  <li>☐ Erguer a cliente lentamente (após o relaxamento, pode haver tontura leve).</li>
  <li>☐ Fazer a touca com a toalha para proteger o cabelo.</li>
</ul>
<blockquote>"Finalizamos o shiatsu. Vou te ajudar a levantar devagar, sem pressa."</blockquote>
<p><strong>18. Levar para a Cadeira</strong></p>
<ul style="${CHECK}">
  <li>☐ Conduzir a cliente até a cadeira do profissional principal.</li>
  <li>☐ Ajudar a cliente a se sentar.</li>
  <li>☐ Remover a touca de toalha.</li>
  <li>☐ Secar com a toalha, retirando o excesso de água.</li>
</ul>
<p><strong>19. Preparação para o Procedimento Principal</strong></p>
<ul style="${CHECK}">
  <li>☐ Colocar a capa de proteção.</li>
  <li>☐ Colocar o robe ou avental.</li>
  <li>☐ Pentear e alinhar o cabelo.</li>
  <li>☐ Verificar se a cliente está confortável.</li>
</ul>
<blockquote>"Seu cabelo está pronto para o procedimento. O(A) [Cabeleireiro] vai te atender em instantes. Fique à vontade."</blockquote>
<p><strong>20. Chamar o Profissional Principal</strong> — informar obrigatoriamente:</p>
<ul style="${CHECK}">
  <li>☐ Nome da cliente.</li>
  <li>☐ Procedimentos agendados.</li>
  <li>☐ Produtos e tratamentos utilizados no lavatório.</li>
  <li>☐ Observações sobre o cabelo e o couro cabeludo da cliente.</li>
</ul>
<blockquote>"[Nome do Cabeleireiro], a cliente [Nome da Cliente] está pronta. Foi feito o shiatsu capilar com [produtos/tratamento]. O cabelo está [descrição]."</blockquote>

<h3>PARTE E — Organização Pós-Atendimento</h3>
<p><strong>21. Limpeza e Organização do Lavatório</strong></p>
<ul style="${CHECK}">
  <li>☐ Organizar completamente o lavatório.</li>
  <li>☐ Descartar corretamente os resíduos.</li>
  <li>☐ Higienizar toda a pia e a cadeira.</li>
  <li>☐ Devolver à cliente os produtos que ela trouxe.</li>
  <li>☐ Higienizar as mãos.</li>
  <li>☐ Preparar o lavatório para a próxima cliente.</li>
</ul>
<p><strong>22. Registro no Sistema</strong></p>
<ul style="${CHECK}">
  <li>☐ Registrar o shiatsu capilar.</li>
  <li>☐ Registrar os produtos utilizados.</li>
  <li>☐ Registrar os tratamentos realizados.</li>
  <li>☐ Registrar os produtos vendidos (se houver).</li>
  <li>☐ Registrar qualquer observação relevante sobre o couro cabeludo.</li>
</ul>

<h2>10. Indicadores de Qualidade</h2>
<p>A gerência deverá acompanhar mensalmente:</p>
<ul style="${CHECK}">
  <li>☐ Tempo médio do shiatsu capilar (meta: 15 a 25 minutos).</li>
  <li>☐ Cumprimento do tempo mínimo de massagem.</li>
  <li>☐ Índice de satisfação da cliente (relaxamento, pressão, conforto).</li>
  <li>☐ Número de reclamações ou intercorrências durante a massagem.</li>
  <li>☐ Conversão de higienização em shiatsu capilar.</li>
  <li>☐ Recorrência do serviço (clientes que repetem).</li>
  <li>☐ Ticket médio por cliente.</li>
  <li>☐ Conformidade com as normas de biossegurança.</li>
</ul>

<h2>11. Checklist de Auditoria</h2>
<div style="${BOX}">
  <div style="${BOXH}">Apresentação</div>
  <ul style="${CHECK}">
    <li>☐ Apresentou-se de frente para a cliente, com nome.</li>
    <li>☐ Confirmou o serviço (shiatsu capilar).</li>
    <li>☐ Perguntou o que a cliente desejava.</li>
    <li>☐ Perguntou se havia preferência ou referência.</li>
    <li>☐ Verificou as contraindicações.</li>
    <li>☐ Fez as ponderações do que dá e do que não dá para fazer.</li>
  </ul>
  <div style="${BOXH}">Avaliação</div>
  <ul style="${CHECK}">
    <li>☐ Realizou avaliação capilar e informou as necessidades.</li>
    <li>☐ Perguntou se deseja tratamento conforme a necessidade.</li>
    <li>☐ Informou todos os produtos que seriam utilizados.</li>
    <li>☐ Deixou a cliente sentir o cheiro dos produtos.</li>
    <li>☐ Confirmou o uso dos produtos trazidos pela cliente (quando houver).</li>
  </ul>
  <div style="${BOXH}">Execução</div>
  <ul style="${CHECK}">
    <li>☐ Ajustou o apoio do pescoço e confirmou o conforto.</li>
    <li>☐ Soltou o cabelo da raiz.</li>
    <li>☐ Aplicou o 1º shampoo corretamente.</li>
    <li>☐ Aplicou o 2º shampoo + shiatsu de 15 a 25 minutos.</li>
    <li>☐ Manteve pressão firme e constante, sem usar as unhas.</li>
    <li>☐ Percorreu todas as regiões do couro cabeludo.</li>
    <li>☐ Confirmou com a cliente se a pressão estava agradável.</li>
    <li>☐ Manteve o silêncio durante a massagem.</li>
    <li>☐ Aplicou o 3º shampoo quando necessário.</li>
    <li>☐ Respeitou o tempo de pausa da marca.</li>
    <li>☐ Aplicou o condicionador ou a máscara.</li>
    <li>☐ Enxaguou completamente.</li>
  </ul>
  <div style="${BOXH}">Finalização</div>
  <ul style="${CHECK}">
    <li>☐ Avisou o fim da massagem e ergueu a cliente lentamente.</li>
    <li>☐ Fez a touca.</li>
    <li>☐ Levou a cliente para a cadeira.</li>
    <li>☐ Secou com a toalha.</li>
    <li>☐ Preparou para o procedimento (capa, robe, penteado).</li>
    <li>☐ Penteou e alinhou o cabelo.</li>
    <li>☐ Chamou o profissional principal.</li>
  </ul>
  <div style="${BOXH}">Organização</div>
  <ul style="${CHECK}">
    <li>☐ Organizou e higienizou o lavatório.</li>
    <li>☐ Devolveu os produtos da cliente.</li>
    <li>☐ Registrou o serviço no sistema.</li>
  </ul>
</div>
`.trim()

export type ConteudoDoc = { id: string; titulo: string; texto: string }
export const CONTEUDO_DEFAULTS: Record<string, { titulo: string; conteudo: { texto?: string; docs?: ConteudoDoc[] } }> = {
  manicure: {
    titulo: 'Processos — Manicure',
    conteudo: {
      docs: [
        { id: 'pop-man-001', titulo: 'POP-MAN-001 · Atendimento de Manicure', texto: MANICURE_HTML },
        { id: 'pop-pro-001', titulo: 'POP-PRO-001 · Atendimento do Profissional', texto: PRO_ATENDIMENTO_HTML },
        { id: 'pop-pro-002', titulo: 'POP-PRO-002 · Atendimento de Pedicure', texto: PRO_PEDICURE_HTML },
      ],
    },
  },
  cabelereiro: {
    titulo: 'Processos — Cabeleireiro',
    conteudo: {
      docs: [
        { id: 'pop-pro-003', titulo: 'POP-PRO-003 · Higienização Capilar (Lavatório)', texto: PRO_LAVATORIO_HTML },
        { id: 'pop-pro-004', titulo: 'POP-PRO-004 · Higienização Especial (Lavatório)', texto: PRO_LAVATORIO_ESPECIAL_HTML },
        { id: 'pop-pro-005', titulo: 'POP-PRO-005 · Shiatsu Capilar (Lavatório)', texto: PRO_SHIATSU_HTML },
        { id: 'pop-pro-001', titulo: 'POP-PRO-001 · Atendimento do Profissional', texto: PRO_ATENDIMENTO_HTML },
      ],
    },
  },
  recepcao: {
    titulo: 'Processos da Recepção',
    conteudo: {
      docs: [
        { id: 'pop-rec-001', titulo: 'POP-REC-001 · Atendimento Presencial', texto: REC_PRESENCIAL_HTML },
        { id: 'pop-rec-002', titulo: 'POP-REC-002 · Atendimento via WhatsApp', texto: REC_WHATSAPP_HTML },
        { id: 'pop-rec-003', titulo: 'POP-REC-003 · Atendimento Telefônico', texto: REC_TELEFONE_HTML },
        { id: 'pop-rec-006', titulo: 'POP-REC-006 · Chegada do Cliente', texto: REC_CHEGADA_HTML },
        { id: 'pop-rec-007', titulo: 'POP-REC-007 · Finalização do Procedimento', texto: REC_FINALIZACAO_HTML },
      ],
    },
  },
}
