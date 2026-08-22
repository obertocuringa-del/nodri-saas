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
<blockquote>"Olá, (Nome)! Seu agendamento foi realizado com sucesso. Data: [Data] Horário: [Horário] Procedimento: [Serviço] Profissional: [Nome] Qualquer dúvida estamos à disposição. Equipe [Nome do Salão]"</blockquote>

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
<blockquote>"Olá, (Nome)! Tudo bem? Meu nome é (nome da recepcionista), sou o recepcionista do [Nome do Salão] que será responsável pelo seu agendamento."</blockquote>
<ol start="3">
  <li>Se NÃO tiver nome:</li>
</ol>
<blockquote>"Olá! Meu nome é (nome da recepcionista), sou o recepcionista do [Nome do Salão] que será responsável pelo seu atendimento. Poderia me informar seu nome e sobrenome?"</blockquote>
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
<blockquote>"(Nome da cliente), sou (nome da recepcionista) e estou finalizando seu atendimento. Seu agendamento foi realizado para: Data: [Data] Horário: [Horário] Serviços: [Lista de Serviços] Profissional: [Nome] Gostaria de agendar algo mais?"</blockquote>

<h2>9. Envio da Confirmação e Lembrete</h2>
<ul>
  <li>Enviar a mensagem de confirmação imediatamente.</li>
  <li>Um dia antes do atendimento, enviar a confirmação novamente:</li>
</ul>
<blockquote>"Olá, (Nome)! Passando para confirmar seu agendamento de amanhã às [Horário]. Estamos te aguardando!"</blockquote>

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
<blockquote>"(Nome da cliente), sou (nome da recepcionista) e estou finalizando seu atendimento por telefone. Seu agendamento foi realizado para: Data: [Data] Horário: [Horário] Serviços: [Lista de Serviços] Profissional: [Nome] Gostaria de agendar algo mais?"</blockquote>
<p>Um dia antes do atendimento, enviar a confirmação novamente:</p>
<blockquote>"Olá, (Nome)! Passando para confirmar seu agendamento de amanhã às [Horário]. Estamos aguardando você."</blockquote>

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
<blockquote>"Olá (Nome)! Tudo bem?<br/><br/>O [Nome do Salão] busca oferecer serviços de qualidade aos clientes. Gostaríamos de saber como foi a sua experiência no salão. Sua opinião é importante para nortear nossas ações em busca de um atendimento cada vez melhor.<br/><br/>Agradecemos a colaboração!<br/><br/>Caso não queira se identificar, mande seu feedback pelo link:<br/>[Link da Pesquisa]"</blockquote>
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

const PRO_TRATAMENTOS_HTML = `
<h1>Procedimento Operacional Padrão (POP)</h1>
<p style="color:#6b6880;font-size:15px;margin:-4px 0 16px;font-weight:600">POP-PRO-006 — Tratamentos Capilares (Lavatório)</p>

<h2>1. Identificação</h2>
<div style="${META}">
  <p style="margin:0"><strong>Código:</strong> POP-PRO-006 &nbsp;·&nbsp; <strong>Versão:</strong> 1.0 &nbsp;·&nbsp; <strong>Setor:</strong> Profissionais (Lavatório / Auxiliar de Cabeleireiro)</p>
  <p style="margin:8px 0 0"><strong>Responsável:</strong> <span style="${FIELD}"></span> (Profissional do Lavatório)</p>
  <p style="margin:8px 0 0"><strong>Data de Emissão:</strong> ___/___/______ &nbsp;·&nbsp; <strong>Última Revisão:</strong> ___/___/______ &nbsp;·&nbsp; <strong>Próxima Revisão:</strong> ___/___/______</p>
</div>

<h2>2. Objetivo</h2>
<p>Padronizar a execução dos <strong>tratamentos capilares</strong> no lavatório, garantindo diagnóstico correto da necessidade do cabelo, indicação da terapia capilar adequada, aplicação dos produtos conforme o passo a passo da linha, resultado técnico consistente e a construção de um <strong>cronograma capilar</strong> que fideliza a cliente.</p>

<h2>3. Campo de Aplicação</h2>
<p>Este procedimento aplica-se a todos os profissionais responsáveis pela execução de tratamentos capilares no lavatório.</p>

<h2>4. Diferenciais do Tratamento Capilar</h2>
<div style="${BOX}">
  <div style="${BOXH}">O que diferencia este serviço</div>
  <ul>
    <li><strong>Produtos específicos</strong> — selecionados conforme a necessidade identificada na avaliação.</li>
    <li><strong>Tempo de execução de 10 a 15 minutos</strong> — respeitando os tempos de pausa da marca.</li>
    <li><strong>Pode ter um shampoo a mais</strong> — aplicação de um 3º shampoo quando o cabelo exigir.</li>
    <li><strong>Passo a passo da linha</strong> — quando o produto for de uma linha profissional com protocolo próprio, seguir a sequência indicada pelo fabricante.</li>
    <li><strong>Indicação de terapia capilar ou cronograma</strong> — o tratamento não termina no atendimento: a cliente sai sabendo qual é o próximo passo.</li>
  </ul>
</div>

<h2>5. Responsabilidades</h2>
<h3>Profissional do Lavatório</h3>
<ul>
  <li>Cumprir integralmente este POP.</li>
  <li>Realizar avaliação capilar detalhada e informar as necessidades.</li>
  <li>Indicar a terapia capilar adequada à necessidade identificada.</li>
  <li>Oferecer o cronograma capilar quando indicado.</li>
  <li>Selecionar e aplicar corretamente os produtos.</li>
  <li>Seguir o passo a passo e os tempos de pausa da linha utilizada.</li>
  <li>Zelar pela segurança e bem-estar da cliente.</li>
  <li>Orientar sobre a manutenção em casa.</li>
  <li>Manter o lavatório limpo e organizado.</li>
</ul>
<h3>Cabeleireiro / Profissional Principal</h3>
<ul>
  <li>Aguardar a cliente ser preparada.</li>
  <li>Realizar o procedimento principal.</li>
  <li>Reforçar a indicação do cronograma capilar.</li>
</ul>
<h3>Recepção</h3>
<ul>
  <li>Confirmar o agendamento.</li>
  <li>Registrar o cronograma capilar e agendar as próximas sessões.</li>
  <li>Recepcionar e acomodar a cliente.</li>
</ul>
<h3>Gerência</h3>
<ul>
  <li>Fiscalizar o cumprimento deste POP.</li>
  <li>Treinar continuamente a equipe nas linhas de tratamento.</li>
  <li>Garantir a disponibilidade dos produtos.</li>
  <li>Acompanhar os indicadores de adesão ao cronograma e ticket médio.</li>
</ul>

<h2>6. Materiais Necessários</h2>
<h3>Equipamentos</h3>
<ul style="${CHECK}">
  <li>☐ Lavatório (cadeira e pia).</li>
  <li>☐ Toalhas limpas.</li>
  <li>☐ Capa de proteção.</li>
  <li>☐ Robe ou avental.</li>
  <li>☐ Touca descartável ou touca térmica.</li>
  <li>☐ Pentes e escovas.</li>
  <li>☐ Tigela e pincel de aplicação (quando a linha exigir).</li>
  <li>☐ Cronômetro ou timer (obrigatório para os tempos de pausa).</li>
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
  <li>☐ Ampolas e produtos de linha profissional (passo a passo).</li>
  <li>☐ Óleos e finalizadores.</li>
</ul>

<h2>7. Biossegurança e Higiene</h2>
<h3>Antes do Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Higienizar corretamente as mãos.</li>
  <li>☐ Manter uniforme limpo.</li>
  <li>☐ Manter cabelos presos.</li>
  <li>☐ Conferir a limpeza do lavatório.</li>
  <li>☐ Organizar todos os produtos e materiais.</li>
  <li>☐ Verificar a validade dos produtos.</li>
  <li>☐ Conferir o passo a passo da linha que será utilizada.</li>
  <li>☐ Preparar toalhas limpas.</li>
</ul>
<h3>Durante o Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Manter o lavatório organizado.</li>
  <li>☐ Não utilizar telefone celular.</li>
  <li>☐ Não consumir alimentos.</li>
  <li>☐ Evitar respingos no rosto da cliente.</li>
  <li>☐ Manter a temperatura da água adequada.</li>
  <li>☐ Nunca reduzir os tempos de pausa indicados pela marca.</li>
</ul>
<h3>Após o Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Descartar corretamente os materiais descartáveis.</li>
  <li>☐ Fechar e guardar os produtos corretamente.</li>
  <li>☐ Higienizar o lavatório.</li>
  <li>☐ Higienizar as mãos.</li>
  <li>☐ Preparar o lavatório para a próxima cliente.</li>
</ul>

<h2>8. Procedimento Operacional</h2>

<h3>PARTE A — Início do Atendimento</h3>
<p><strong>1. Apresentação do Profissional</strong> — sempre iniciar o atendimento de frente para a cliente, demonstrando simpatia, cordialidade e profissionalismo.</p>
<blockquote>"Olá (Nome da cliente), meu nome é (Nome do Profissional) e hoje eu serei o(a) responsável pelo seu atendimento."</blockquote>
<p><strong>2. Confirmação do Serviço</strong></p>
<blockquote>"A senhora irá fazer um tratamento hoje, correto?"</blockquote>
<p><strong>3. Identificação da Necessidade</strong></p>
<blockquote>"O que a senhora pensou para hoje?" · "A senhora possui alguma preferência ou alguma foto de referência?"</blockquote>
<p><strong>4. Ponderações e Orientações</strong> — após ouvir atentamente a cliente, explicar de forma clara e profissional o que é possível fazer e o que não é recomendado:</p>
<ul style="${CHECK}">
  <li>☐ O que é possível realizar.</li>
  <li>☐ O que não é recomendado realizar.</li>
  <li>☐ As limitações técnicas do tratamento.</li>
  <li>☐ O resultado esperado e em quantas sessões.</li>
  <li>☐ Os cuidados necessários para preservar a saúde do cabelo.</li>
</ul>
<blockquote>"Baseado no que a senhora deseja, é possível fazer [explicar o que dá para fazer]."</blockquote>
<blockquote>"Não recomendamos [explicar o que não é recomendado] porque [explicar o motivo]."</blockquote>
<blockquote>"Com uma sessão a senhora já vai sentir diferença, mas o resultado completo vem com [X] sessões."</blockquote>
<p><strong>Nenhum procedimento deverá ser iniciado antes que a cliente compreenda e concorde com o serviço que será realizado.</strong></p>

<h3>PARTE B — Avaliação Capilar e Diagnóstico</h3>
<p><strong>5. Cliente vai para o lavatório</strong> — conduzir a cliente, ajudá-la a se acomodar confortavelmente e verificar se ela está confortável.</p>
<p><strong>6. Avaliação do Cabelo e Informação das Necessidades</strong></p>
<ul style="${CHECK}">
  <li>☐ Observar o estado geral do cabelo.</li>
  <li>☐ Verificar o tipo de cabelo (liso, ondulado, cacheado, crespo).</li>
  <li>☐ Verificar a porosidade do cabelo.</li>
  <li>☐ Verificar a elasticidade e a resistência do fio.</li>
  <li>☐ Verificar se há ressecamento, opacidade ou pontas duplas.</li>
  <li>☐ Verificar se há química (coloração, descoloração, alisamento).</li>
  <li>☐ Verificar o couro cabeludo (oleosidade, caspa, sensibilidade).</li>
  <li>☐ Perguntar sobre os cuidados atuais e a frequência de tratamentos.</li>
  <li>☐ Informar à cliente as necessidades identificadas.</li>
</ul>
<blockquote>"Percebi que seu cabelo está [descrever a condição]. Isso indica que ele está precisando de [hidratação/nutrição/reconstrução]."</blockquote>
<p><strong>7. Indicação da Terapia Capilar</strong> — indicar o tratamento conforme a necessidade identificada.</p>
<table style="${TBL}">
  <tr><th style="${TH}">O que foi identificado</th><th style="${TH}">Terapia indicada</th><th style="${TH}">O que ela devolve ao fio</th></tr>
  <tr><td style="${TD}">Cabelo ressecado, sem maciez, opaco</td><td style="${TD}">Hidratação</td><td style="${TD}">Água</td></tr>
  <tr><td style="${TD}">Cabelo seco, poroso, sem brilho, quebradiço nas pontas</td><td style="${TD}">Nutrição</td><td style="${TD}">Lipídios (óleos)</td></tr>
  <tr><td style="${TD}">Cabelo elástico, frágil, quebrando, com química recente</td><td style="${TD}">Reconstrução</td><td style="${TD}">Massa (proteínas / queratina)</td></tr>
  <tr><td style="${TD}">Cabelo com química recente e cutícula aberta</td><td style="${TD}">Cauterização / selagem</td><td style="${TD}">Selamento da cutícula</td></tr>
  <tr><td style="${TD}">Couro cabeludo oleoso ou com caspa</td><td style="${TD}">Tratamento do couro cabeludo</td><td style="${TD}">Equilíbrio do couro</td></tr>
</table>
<p><strong>8. Oferta do Cronograma Capilar</strong> — quando a necessidade não se resolve em uma sessão, oferecer o cronograma.</p>
<blockquote>"A senhora gostaria de fazer uma terapia capilar hoje, ou prefere que eu monte um cronograma para tratar seu cabelo ao longo das próximas semanas?"</blockquote>
<blockquote>"Uma sessão já melhora bastante, mas seu cabelo pede um cronograma para recuperar de verdade. Posso montar para a senhora?"</blockquote>
<div style="${BOX}">
  <div style="${BOXH}">Exemplo de cronograma (ajustar conforme a avaliação e a linha utilizada)</div>
  <table style="${TBL}">
    <tr><th style="${TH}">Semana</th><th style="${TH}">Cabelo ressecado</th><th style="${TH}">Cabelo com química</th></tr>
    <tr><td style="${TD}">1ª</td><td style="${TD}">Hidratação</td><td style="${TD}">Reconstrução</td></tr>
    <tr><td style="${TD}">2ª</td><td style="${TD}">Nutrição</td><td style="${TD}">Hidratação</td></tr>
    <tr><td style="${TD}">3ª</td><td style="${TD}">Hidratação</td><td style="${TD}">Nutrição</td></tr>
    <tr><td style="${TD}">4ª</td><td style="${TD}">Reconstrução</td><td style="${TD}">Hidratação</td></tr>
  </table>
  <p style="margin:8px 0 0">Encaminhar a cliente à recepção para <strong>deixar as próximas sessões já agendadas</strong>.</p>
</div>
<p><strong>9. Informar os Produtos Utilizados</strong> — informar todos os produtos que serão utilizados e a função de cada um.</p>
<blockquote>"Hoje vou utilizar o Shampoo [nome] para [função], e a máscara de [tratamento] que vai [benefício]."</blockquote>
<p><strong>10. Experiência Sensorial</strong> — deixar a cliente sentir o cheiro dos produtos.</p>
<blockquote>"Antes de começar, gostaria que a senhora sentisse o cheiro dos produtos que vou utilizar."</blockquote>

<h3>PARTE C — Execução do Tratamento</h3>
<p><strong>11. Preparação</strong></p>
<ul style="${CHECK}">
  <li>☐ Verificar a temperatura da água (morna, agradável).</li>
  <li>☐ Posicionar a cliente corretamente no lavatório.</li>
  <li>☐ Colocar a capa de proteção.</li>
  <li>☐ Soltar um pouco o cabelo da raiz e desembaraçar suavemente.</li>
</ul>
<p><strong>12. Aplicação do 1º Shampoo</strong> — objetivo: remover impurezas e oleosidade, preparando o fio para receber o tratamento.</p>
<ul style="${CHECK}">
  <li>☐ Aplicar o 1º shampoo em todo o cabelo.</li>
  <li>☐ Emulsionar bem o produto.</li>
  <li>☐ Massagear suavemente o couro cabeludo.</li>
  <li>☐ Enxaguar completamente.</li>
</ul>
<p><strong>13. Aplicação do 2º Shampoo + Massagem de 10 a 15 Minutos</strong></p>
<ul style="${CHECK}">
  <li>☐ Aplicar o 2º shampoo (específico para o tipo de cabelo).</li>
  <li>☐ Realizar a massagem no couro cabeludo por <strong>10 a 15 minutos</strong>, cronometrados.</li>
  <li>☐ Utilizar movimentos circulares, firmes e constantes, com as polpas dos dedos.</li>
  <li>☐ Verificar com a cliente se a pressão está agradável.</li>
  <li>☐ Enxaguar completamente.</li>
</ul>
<p><strong>14. Aplicação do 3º Shampoo</strong> (somente quando o cabelo exigir) — avaliar a necessidade, aplicar e enxaguar completamente.</p>
<p><strong>15. Tempo de Pausa</strong> — aguardar o tempo de pausa recomendado pela marca, utilizando o cronômetro.</p>
<p><strong>16. Aplicação do Tratamento</strong> — aplicar o condicionador, a máscara <strong>ou o passo a passo completo da linha</strong>, conforme a terapia indicada.</p>
<ul style="${CHECK}">
  <li>☐ Remover o excesso de água antes de aplicar (o fio absorve melhor).</li>
  <li>☐ Aplicar mecha a mecha, do comprimento às pontas.</li>
  <li>☐ Evitar a raiz (a menos que o produto indique o contrário).</li>
  <li>☐ Quando a linha tiver passo a passo, seguir a sequência exata do fabricante.</li>
  <li>☐ Utilizar a touca térmica quando a linha indicar.</li>
  <li>☐ Respeitar o tempo de pausa de cada etapa, com cronômetro.</li>
  <li>☐ Enxaguar completamente.</li>
</ul>
<blockquote>"Agora vou aplicar a máscara de [tratamento]. Vamos aguardar [X] minutos para ela agir profundamente."</blockquote>
<p><strong>É proibido reduzir os tempos de pausa indicados pela marca para acelerar o atendimento.</strong></p>

<h3>PARTE D — Finalização do Tratamento</h3>
<p><strong>17. Finalização</strong></p>
<ul style="${CHECK}">
  <li>☐ Enxaguar completamente todos os produtos.</li>
  <li>☐ Verificar se não há resíduos de shampoo, condicionador ou máscara.</li>
  <li>☐ Fazer a touca com a toalha para proteger o cabelo.</li>
</ul>
<blockquote>"Finalizamos o tratamento. O cabelo está preparado para o próximo procedimento."</blockquote>
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
<p><strong>20. Mostrar o Resultado e Orientar a Manutenção</strong></p>
<ul style="${CHECK}">
  <li>☐ Mostrar à cliente a diferença no fio (maciez, brilho, toque).</li>
  <li>☐ Explicar quanto tempo o resultado costuma durar.</li>
  <li>☐ Orientar sobre os cuidados em casa.</li>
  <li>☐ Informar a data ideal da próxima sessão do cronograma.</li>
  <li>☐ Oferecer os produtos de manutenção para levar para casa.</li>
</ul>
<blockquote>"Sinta como ficou o fio. Percebe a diferença no toque?"</blockquote>
<blockquote>"Para manter esse resultado, o ideal é voltar em [X] dias para a próxima etapa do cronograma."</blockquote>
<p><strong>21. Chamar o Profissional Principal</strong> — informar obrigatoriamente:</p>
<ul style="${CHECK}">
  <li>☐ Nome da cliente.</li>
  <li>☐ Procedimentos agendados.</li>
  <li>☐ Tratamento realizado e produtos utilizados.</li>
  <li>☐ Cronograma indicado (se houver).</li>
  <li>☐ Observações sobre o cabelo da cliente.</li>
</ul>
<blockquote>"[Nome do Cabeleireiro], a cliente [Nome da Cliente] está pronta. Foi feita uma [tratamento] com [produtos]. Indiquei cronograma de [X] sessões."</blockquote>

<h3>PARTE E — Organização Pós-Atendimento</h3>
<p><strong>22. Limpeza e Organização do Lavatório</strong></p>
<ul style="${CHECK}">
  <li>☐ Organizar completamente o lavatório.</li>
  <li>☐ Fechar e guardar os produtos corretamente.</li>
  <li>☐ Descartar corretamente os resíduos.</li>
  <li>☐ Higienizar toda a pia e a cadeira.</li>
  <li>☐ Higienizar as mãos.</li>
  <li>☐ Preparar o lavatório para a próxima cliente.</li>
</ul>
<p><strong>23. Registro no Sistema</strong></p>
<ul style="${CHECK}">
  <li>☐ Registrar o tratamento realizado.</li>
  <li>☐ Registrar os produtos utilizados.</li>
  <li>☐ Registrar o cronograma indicado e as sessões previstas.</li>
  <li>☐ Registrar os produtos vendidos (se houver).</li>
  <li>☐ Registrar o diagnóstico capilar para consulta na próxima visita.</li>
</ul>

<h2>9. Indicadores de Qualidade</h2>
<p>A gerência deverá acompanhar mensalmente:</p>
<ul style="${CHECK}">
  <li>☐ Número de tratamentos realizados.</li>
  <li>☐ Conversão de higienização em tratamento capilar.</li>
  <li>☐ Percentual de clientes que aderiram ao cronograma.</li>
  <li>☐ Percentual de retorno para a 2ª sessão do cronograma.</li>
  <li>☐ Vendas de produtos de manutenção.</li>
  <li>☐ Índice de satisfação com o resultado.</li>
  <li>☐ Tempo médio de execução.</li>
  <li>☐ Conformidade com os tempos de pausa das marcas.</li>
</ul>

<h2>10. Checklist de Auditoria</h2>
<div style="${BOX}">
  <div style="${BOXH}">Apresentação</div>
  <ul style="${CHECK}">
    <li>☐ Apresentou-se de frente para a cliente, com nome.</li>
    <li>☐ Confirmou o serviço (tratamento).</li>
    <li>☐ Perguntou o que a cliente desejava.</li>
    <li>☐ Perguntou se havia preferência ou referência.</li>
    <li>☐ Fez as ponderações do que dá e do que não dá para fazer.</li>
    <li>☐ Informou o resultado esperado e em quantas sessões.</li>
  </ul>
  <div style="${BOXH}">Avaliação e Diagnóstico</div>
  <ul style="${CHECK}">
    <li>☐ Realizou avaliação capilar detalhada.</li>
    <li>☐ Informou as necessidades identificadas.</li>
    <li>☐ Indicou a terapia adequada à necessidade.</li>
    <li>☐ Ofereceu o cronograma capilar.</li>
    <li>☐ Informou os produtos que seriam utilizados.</li>
    <li>☐ Deixou a cliente sentir o cheiro dos produtos.</li>
  </ul>
  <div style="${BOXH}">Execução</div>
  <ul style="${CHECK}">
    <li>☐ Soltou o cabelo da raiz.</li>
    <li>☐ Aplicou o 1º shampoo corretamente.</li>
    <li>☐ Aplicou o 2º shampoo + massagem de 10 a 15 minutos.</li>
    <li>☐ Aplicou o 3º shampoo quando necessário.</li>
    <li>☐ Removeu o excesso de água antes de aplicar o tratamento.</li>
    <li>☐ Aplicou mecha a mecha, do comprimento às pontas.</li>
    <li>☐ Seguiu o passo a passo da linha.</li>
    <li>☐ Respeitou todos os tempos de pausa.</li>
    <li>☐ Enxaguou completamente.</li>
  </ul>
  <div style="${BOXH}">Finalização e Fidelização</div>
  <ul style="${CHECK}">
    <li>☐ Fez a touca.</li>
    <li>☐ Levou a cliente para a cadeira e secou com a toalha.</li>
    <li>☐ Preparou para o procedimento (capa, robe, penteado).</li>
    <li>☐ Mostrou o resultado à cliente.</li>
    <li>☐ Orientou sobre a manutenção em casa.</li>
    <li>☐ Informou a data da próxima sessão.</li>
    <li>☐ Ofereceu os produtos de manutenção.</li>
    <li>☐ Chamou o profissional principal.</li>
  </ul>
  <div style="${BOXH}">Organização</div>
  <ul style="${CHECK}">
    <li>☐ Organizou e higienizou o lavatório.</li>
    <li>☐ Guardou os produtos corretamente.</li>
    <li>☐ Registrou o tratamento e o cronograma no sistema.</li>
  </ul>
</div>
`.trim()

const PRO_SECAGEM_HTML = `
<h1>Procedimento Operacional Padrão (POP)</h1>
<p style="color:#6b6880;font-size:15px;margin:-4px 0 16px;font-weight:600">POP-PRO-007 — Secagem</p>

<h2>1. Identificação</h2>
<div style="${META}">
  <p style="margin:0"><strong>Código:</strong> POP-PRO-007 &nbsp;·&nbsp; <strong>Versão:</strong> 1.0 &nbsp;·&nbsp; <strong>Setor:</strong> Profissionais (Cabeleireiro / Auxiliar)</p>
  <p style="margin:8px 0 0"><strong>Responsável:</strong> <span style="${FIELD}"></span></p>
  <p style="margin:8px 0 0"><strong>Data de Emissão:</strong> ___/___/______ &nbsp;·&nbsp; <strong>Última Revisão:</strong> ___/___/______ &nbsp;·&nbsp; <strong>Próxima Revisão:</strong> ___/___/______</p>
</div>

<h2>2. Objetivo</h2>
<p>Padronizar o serviço de <strong>secagem</strong>, garantindo a proteção do fio contra o calor, técnica correta de manuseio do secador, acabamento alinhado e com brilho, cuidado especial com a franja e validação do resultado pela cliente.</p>

<h2>3. Campo de Aplicação</h2>
<p>Este procedimento aplica-se a todos os profissionais responsáveis pelo serviço de secagem.</p>

<h2>4. Fluxo do Atendimento</h2>
<div style="${BOX}">
  <div style="${BOXH}">Atenção ao ponto de partida</div>
  <p style="margin:0"><strong>Cliente chega com o cabelo sujo:</strong> realizar a higienização no lavatório (PARTE B) e seguir o fluxo completo.</p>
  <p style="margin:8px 0 0"><strong>Cliente já chega com o cabelo limpo:</strong> <strong>pular a PARTE B</strong> e ir direto para a preparação do procedimento (PARTE C).</p>
</div>

<h2>5. Materiais Necessários</h2>
<h3>Equipamentos</h3>
<ul style="${CHECK}">
  <li>☐ Secador com bico direcionador.</li>
  <li>☐ Escovas (conforme o resultado desejado).</li>
  <li>☐ Pentes.</li>
  <li>☐ Presilhas para separar as mechas.</li>
  <li>☐ Toalhas limpas.</li>
  <li>☐ Capa de proteção.</li>
  <li>☐ Robe ou avental.</li>
  <li>☐ Espelho de mão (para mostrar o resultado).</li>
</ul>
<h3>Produtos</h3>
<ul style="${CHECK}">
  <li>☐ Shampoo 1 e Shampoo 2.</li>
  <li>☐ Condicionador.</li>
  <li>☐ <strong>Protetor térmico</strong> (obrigatório).</li>
  <li>☐ Leave-in.</li>
  <li>☐ Óleo ou sérum finalizador.</li>
  <li>☐ Produtos de fixação ou controle de frizz.</li>
</ul>

<h2>6. Biossegurança e Segurança</h2>
<h3>Antes do Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Higienizar corretamente as mãos.</li>
  <li>☐ Manter uniforme limpo e cabelos presos.</li>
  <li>☐ Conferir a limpeza da estação.</li>
  <li>☐ Higienizar escovas e pentes entre as clientes.</li>
  <li>☐ Verificar o estado do secador (fio, tomada, filtro traseiro limpo).</li>
  <li>☐ Organizar todos os produtos e verificar a validade.</li>
</ul>
<h3>Durante o Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Manter a estação organizada.</li>
  <li>☐ Não utilizar telefone celular.</li>
  <li>☐ Não consumir alimentos.</li>
  <li>☐ <strong>Nunca aproximar o secador do couro cabeludo</strong> — risco de queimadura.</li>
  <li>☐ Não direcionar o ar quente para o rosto, os olhos ou as orelhas da cliente.</li>
  <li>☐ Perguntar à cliente se a temperatura está agradável.</li>
  <li>☐ Não secar sem antes aplicar o protetor térmico.</li>
</ul>
<h3>Após o Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Desligar e guardar o secador.</li>
  <li>☐ Limpar escovas e pentes.</li>
  <li>☐ Recolher os cabelos do chão e da cadeira.</li>
  <li>☐ Higienizar a estação e as mãos.</li>
  <li>☐ Preparar a estação para a próxima cliente.</li>
</ul>

<h2>7. Procedimento Operacional</h2>

<h3>PARTE A — Início do Atendimento</h3>
<p><strong>1. Apresentação do Profissional</strong> — sempre iniciar o atendimento de frente para a cliente, demonstrando simpatia, cordialidade e profissionalismo.</p>
<blockquote>"Olá (Nome da cliente), meu nome é (Nome do Profissional) e hoje eu serei o(a) responsável pelo seu atendimento."</blockquote>
<p><strong>2. Confirmação do Serviço</strong></p>
<blockquote>"A senhora irá secar o cabelo hoje, correto?"</blockquote>
<p><strong>3. Identificação da Necessidade</strong></p>
<blockquote>"O que a senhora pensou para hoje?" · "A senhora possui alguma preferência ou alguma foto de referência?"</blockquote>
<p><strong>4. Ponderações e Orientações</strong> — após ouvir atentamente a cliente, explicar de forma clara e profissional:</p>
<ul style="${CHECK}">
  <li>☐ O que é possível realizar.</li>
  <li>☐ O que não é recomendado realizar.</li>
  <li>☐ As limitações técnicas do procedimento (tipo, comprimento e condição do fio).</li>
  <li>☐ Quanto tempo o resultado tende a durar.</li>
  <li>☐ Os cuidados necessários para preservar a saúde do cabelo.</li>
</ul>
<blockquote>"Baseado no que a senhora deseja, é possível fazer [explicar o que dá para fazer]."</blockquote>
<blockquote>"Não recomendamos [explicar o que não é recomendado] porque [explicar o motivo]."</blockquote>
<p><strong>Nenhum procedimento deverá ser iniciado antes que a cliente compreenda e concorde com o serviço que será realizado.</strong></p>
<p><strong>5. Verificar o ponto de partida</strong> — perguntar se a cliente já veio com o cabelo lavado.</p>
<blockquote>"A senhora já veio com o cabelo limpo, ou vamos passar pelo lavatório antes?"</blockquote>
<p><strong>Se a cliente já estiver com o cabelo limpo, seguir direto para a PARTE C.</strong></p>

<h3>PARTE B — Higienização no Lavatório</h3>
<p style="color:#6b6880"><em>Executar somente quando a cliente não chega com o cabelo limpo.</em></p>
<p><strong>6. Avaliação do Cabelo e Informação das Necessidades</strong></p>
<ul style="${CHECK}">
  <li>☐ Observar o estado geral do cabelo.</li>
  <li>☐ Verificar o tipo de cabelo (liso, ondulado, cacheado, crespo).</li>
  <li>☐ Verificar a porosidade do cabelo.</li>
  <li>☐ Verificar se há ressecamento, danos ou pontas duplas.</li>
  <li>☐ Verificar se há química (coloração, descoloração, alisamento).</li>
  <li>☐ Verificar o couro cabeludo (oleosidade, caspa, sensibilidade).</li>
  <li>☐ Informar à cliente as necessidades identificadas.</li>
</ul>
<p><strong>7. Oferta de Tratamento</strong> — perguntar se a cliente deseja realizar algum tratamento de acordo com a necessidade identificada.</p>
<blockquote>"A senhora gostaria de fazer um tratamento de [hidratação/nutrição/reconstrução] de acordo com a necessidade do seu cabelo?"</blockquote>
<p><strong>8. Informar os Produtos e Experiência Sensorial</strong> — informar todos os produtos que serão utilizados e deixar a cliente sentir o cheiro.</p>
<blockquote>"Hoje vou utilizar o Shampoo [nome] para [função] e o Condicionador [nome]. Gostaria de sentir o cheiro antes de começarmos?"</blockquote>
<p><strong>9. Execução da Higienização</strong></p>
<ul style="${CHECK}">
  <li>☐ Verificar a temperatura da água (morna, agradável).</li>
  <li>☐ Soltar um pouco o cabelo da raiz e desembaraçar suavemente.</li>
  <li>☐ Aplicar o 1º shampoo, emulsionar bem e enxaguar completamente.</li>
  <li>☐ Aplicar o 2º shampoo + massagem no couro cabeludo por 3 minutos.</li>
  <li>☐ Enxaguar completamente.</li>
  <li>☐ Aguardar o tempo de pausa recomendado pela marca.</li>
  <li>☐ Aplicar o condicionador no comprimento e nas pontas, evitando a raiz.</li>
  <li>☐ Aguardar o tempo recomendado pela marca.</li>
  <li>☐ Enxaguar completamente, sem deixar resíduos.</li>
</ul>
<p><strong>10. Finalização da Higienização</strong> — fazer a touca com a toalha e conduzir a cliente até a cadeira.</p>

<h3>PARTE C — Preparação para a Secagem</h3>
<p><strong>11. Preparação da Cliente</strong></p>
<ul style="${CHECK}">
  <li>☐ Ajudar a cliente a se sentar confortavelmente.</li>
  <li>☐ Remover a touca de toalha.</li>
  <li>☐ Secar com a toalha, retirando o excesso de água.</li>
  <li>☐ Colocar a capa de proteção.</li>
  <li>☐ Colocar o robe ou avental.</li>
  <li>☐ Verificar se a cliente está confortável.</li>
</ul>
<div style="${BOX}">
  <p style="margin:0"><strong>Ao secar com a toalha:</strong> pressionar e absorver, <strong>nunca esfregar</strong>. Esfregar abre a cutícula, gera frizz e quebra o fio.</p>
</div>
<p><strong>12. Aplicação dos Produtos Finalizadores</strong></p>
<ul style="${CHECK}">
  <li>☐ Desembaraçar o cabelo com pente de dentes largos, das pontas para a raiz.</li>
  <li>☐ Aplicar o <strong>protetor térmico</strong> em todo o comprimento — <strong>obrigatório antes de qualquer calor</strong>.</li>
  <li>☐ Aplicar leave-in ou finalizador conforme o tipo de cabelo.</li>
  <li>☐ Distribuir bem o produto, mecha a mecha.</li>
  <li>☐ Evitar excesso de produto na raiz.</li>
</ul>
<blockquote>"Vou aplicar um protetor térmico antes de secar. Ele protege o fio do calor e evita o ressecamento."</blockquote>
<p><strong>13. Penteia e alinha o cabelo</strong> — pentear, alinhar e separar o cabelo em seções com presilhas, de baixo para cima.</p>

<h3>PARTE D — Execução da Secagem</h3>
<p><strong>14. Pré-secagem</strong></p>
<ul style="${CHECK}">
  <li>☐ Encaixar o bico direcionador no secador.</li>
  <li>☐ Ajustar a temperatura conforme o tipo e a condição do fio.</li>
  <li>☐ Pré-secar o cabelo até cerca de 70% a 80%, antes de iniciar a escova.</li>
  <li>☐ Manter o secador a uma distância segura do couro cabeludo.</li>
  <li>☐ Perguntar à cliente se a temperatura está agradável.</li>
</ul>
<table style="${TBL}">
  <tr><th style="${TH}">Condição do fio</th><th style="${TH}">Temperatura recomendada</th></tr>
  <tr><td style="${TD}">Cabelo saudável, sem química</td><td style="${TD}">Média a quente</td></tr>
  <tr><td style="${TD}">Cabelo com química (coloração, alisamento)</td><td style="${TD}">Média</td></tr>
  <tr><td style="${TD}">Cabelo descolorido, fino ou danificado</td><td style="${TD}">Baixa</td></tr>
  <tr><td style="${TD}">Finalização (últimos minutos)</td><td style="${TD}">Ar frio, para selar e fixar</td></tr>
</table>
<p><strong>15. Secagem por Seções</strong></p>
<ul style="${CHECK}">
  <li>☐ Trabalhar mecha a mecha, começando pela nuca e subindo.</li>
  <li>☐ Manter as demais seções presas com presilhas.</li>
  <li>☐ Direcionar o fluxo de ar <strong>da raiz para as pontas</strong>, acompanhando a escova.</li>
  <li>☐ Manter o secador em movimento, sem concentrar o calor em um só ponto.</li>
  <li>☐ Secar cada mecha completamente antes de passar para a próxima.</li>
  <li>☐ Não deixar nenhuma região úmida.</li>
</ul>
<div style="${BOX}">
  <p style="margin:0">Direcionar o ar <strong>da raiz para as pontas</strong> fecha a cutícula, e é isso que dá brilho e reduz o frizz. Ar direcionado no sentido contrário abre a cutícula e deixa o cabelo armado.</p>
</div>
<p><strong>16. Ar Frio Final</strong> — nos últimos minutos, passar o ar frio em todo o cabelo para selar a cutícula e fixar o resultado.</p>

<h3>PARTE E — Franja e Acabamento</h3>
<p><strong>17. Franja</strong> — a franja exige atenção especial: seca mais rápido que o restante e marca com facilidade.</p>
<ul style="${CHECK}">
  <li>☐ Verificar se a cliente tem franja e qual o caimento desejado.</li>
  <li>☐ Utilizar temperatura mais baixa na franja.</li>
  <li>☐ Secar com escova pequena, no sentido do caimento desejado.</li>
  <li>☐ Ajustar o caimento antes que a franja esfrie por completo.</li>
  <li>☐ Finalizar a franja com ar frio para fixar.</li>
  <li>☐ Confirmar com a cliente se o caimento ficou como ela gosta.</li>
</ul>
<blockquote>"A senhora prefere a franja mais para o lado, ou mais para a frente?"</blockquote>
<p><strong>18. Acabamento Final</strong></p>
<ul style="${CHECK}">
  <li>☐ Pentear e alinhar todo o cabelo.</li>
  <li>☐ Verificar se não há mechas úmidas.</li>
  <li>☐ Verificar se não há frizz ou fios armados.</li>
  <li>☐ Verificar a simetria e o caimento.</li>
  <li>☐ Aplicar óleo, sérum ou finalizador, se necessário — com moderação.</li>
  <li>☐ Ajustar a repartição conforme a preferência da cliente.</li>
</ul>

<h3>PARTE F — Validação e Finalização</h3>
<p><strong>19. Validação da Cliente</strong> — apresentar o resultado e perguntar obrigatoriamente:</p>
<blockquote>"A senhora gostou do resultado?"</blockquote>
<blockquote>"Existe algum detalhe que gostaria que ajustássemos?"</blockquote>
<p>Utilizar o espelho de mão para mostrar a parte de trás. <strong>Caso a cliente solicite qualquer ajuste, este deverá ser realizado imediatamente.</strong> O atendimento somente poderá ser encerrado após a aprovação da cliente.</p>
<p><strong>20. Orientações de Manutenção</strong></p>
<ul style="${CHECK}">
  <li>☐ Explicar quanto tempo o resultado tende a durar.</li>
  <li>☐ Orientar sobre como preservar em casa.</li>
  <li>☐ Oferecer os produtos utilizados para venda.</li>
  <li>☐ Oferecer o reagendamento da próxima secagem.</li>
</ul>
<blockquote>"Para manter esse resultado por mais tempo, evite [orientação]. Gostaria de já deixar sua próxima secagem agendada?"</blockquote>
<p><strong>21. Encerramento</strong></p>
<ul>
  <li><strong>Se a secagem for o último serviço:</strong> retirar a capa, agradecer a preferência, acompanhar a cliente até a recepção.</li>
  <li><strong>Se houver outro procedimento na sequência:</strong> chamar o profissional principal, informando nome da cliente, procedimentos agendados, produtos utilizados e observações sobre o cabelo.</li>
</ul>
<blockquote>"Foi um prazer atender você, (Nome)! Espero vê-la em breve."</blockquote>
<blockquote>"[Nome do Cabeleireiro], a cliente [Nome] está pronta. O cabelo está seco e alinhado."</blockquote>

<h3>PARTE G — Organização Pós-Atendimento</h3>
<p><strong>22. Limpeza e Registro</strong></p>
<ul style="${CHECK}">
  <li>☐ Desligar e guardar o secador.</li>
  <li>☐ Limpar as escovas e os pentes.</li>
  <li>☐ Recolher os cabelos do chão e da cadeira.</li>
  <li>☐ Higienizar a estação.</li>
  <li>☐ Guardar os produtos corretamente.</li>
  <li>☐ Registrar o serviço e os produtos no sistema.</li>
  <li>☐ Registrar os produtos vendidos (se houver).</li>
</ul>

<h2>8. Indicadores de Qualidade</h2>
<p>A gerência deverá acompanhar mensalmente:</p>
<ul style="${CHECK}">
  <li>☐ Tempo médio de secagem.</li>
  <li>☐ Número de retrabalhos (cliente pediu ajuste após finalizar).</li>
  <li>☐ Número de reclamações.</li>
  <li>☐ Índice de satisfação da cliente.</li>
  <li>☐ Percentual de reagendamento.</li>
  <li>☐ Conversão de secagem em tratamento capilar.</li>
  <li>☐ Vendas de produtos finalizadores.</li>
  <li>☐ Uso do protetor térmico em 100% dos atendimentos.</li>
</ul>

<h2>9. Checklist de Auditoria</h2>
<div style="${BOX}">
  <div style="${BOXH}">Apresentação</div>
  <ul style="${CHECK}">
    <li>☐ Apresentou-se de frente para a cliente, com nome.</li>
    <li>☐ Confirmou o serviço (secagem).</li>
    <li>☐ Perguntou o que a cliente desejava.</li>
    <li>☐ Perguntou se havia preferência ou referência.</li>
    <li>☐ Fez as ponderações do que dá e do que não dá para fazer.</li>
    <li>☐ Verificou se a cliente já veio com o cabelo limpo.</li>
  </ul>
  <div style="${BOXH}">Lavatório (quando aplicável)</div>
  <ul style="${CHECK}">
    <li>☐ Realizou avaliação capilar e informou as necessidades.</li>
    <li>☐ Perguntou se deseja tratamento.</li>
    <li>☐ Informou os produtos e deixou sentir o cheiro.</li>
    <li>☐ Aplicou o 1º shampoo.</li>
    <li>☐ Aplicou o 2º shampoo + massagem de 3 minutos.</li>
    <li>☐ Respeitou os tempos de pausa.</li>
    <li>☐ Aplicou o condicionador e enxaguou completamente.</li>
  </ul>
  <div style="${BOXH}">Preparação</div>
  <ul style="${CHECK}">
    <li>☐ Secou com a toalha sem esfregar.</li>
    <li>☐ Colocou capa e robe.</li>
    <li>☐ Desembaraçou das pontas para a raiz.</li>
    <li>☐ Aplicou o protetor térmico.</li>
    <li>☐ Aplicou o leave-in ou finalizador.</li>
    <li>☐ Penteou, alinhou e separou em seções.</li>
  </ul>
  <div style="${BOXH}">Secagem</div>
  <ul style="${CHECK}">
    <li>☐ Utilizou o bico direcionador.</li>
    <li>☐ Ajustou a temperatura à condição do fio.</li>
    <li>☐ Pré-secou antes de iniciar a escova.</li>
    <li>☐ Trabalhou mecha a mecha.</li>
    <li>☐ Direcionou o ar da raiz para as pontas.</li>
    <li>☐ Manteve distância segura do couro cabeludo.</li>
    <li>☐ Perguntou se a temperatura estava agradável.</li>
    <li>☐ Finalizou com ar frio.</li>
  </ul>
  <div style="${BOXH}">Franja e Acabamento</div>
  <ul style="${CHECK}">
    <li>☐ Perguntou o caimento desejado da franja.</li>
    <li>☐ Usou temperatura mais baixa na franja.</li>
    <li>☐ Ajustou o caimento antes de esfriar.</li>
    <li>☐ Verificou se não havia mechas úmidas.</li>
    <li>☐ Verificou frizz, simetria e caimento.</li>
    <li>☐ Ajustou a repartição conforme a preferência.</li>
  </ul>
  <div style="${BOXH}">Finalização</div>
  <ul style="${CHECK}">
    <li>☐ Mostrou o resultado com o espelho de mão.</li>
    <li>☐ Perguntou se a cliente gostou.</li>
    <li>☐ Perguntou se havia ajustes.</li>
    <li>☐ Realizou os ajustes imediatamente.</li>
    <li>☐ Orientou sobre a manutenção.</li>
    <li>☐ Ofereceu produtos e reagendamento.</li>
    <li>☐ Organizou a estação e registrou no sistema.</li>
  </ul>
</div>
`.trim()

const PRO_MODELAGEM_HTML = `
<h1>Procedimento Operacional Padrão (POP)</h1>
<p style="color:#6b6880;font-size:15px;margin:-4px 0 16px;font-weight:600">POP-PRO-008 — Modelagem</p>

<h2>1. Identificação</h2>
<div style="${META}">
  <p style="margin:0"><strong>Código:</strong> POP-PRO-008 &nbsp;·&nbsp; <strong>Versão:</strong> 1.0 &nbsp;·&nbsp; <strong>Setor:</strong> Profissionais (Cabeleireiro / Auxiliar)</p>
  <p style="margin:8px 0 0"><strong>Responsável:</strong> <span style="${FIELD}"></span></p>
  <p style="margin:8px 0 0"><strong>Data de Emissão:</strong> ___/___/______ &nbsp;·&nbsp; <strong>Última Revisão:</strong> ___/___/______ &nbsp;·&nbsp; <strong>Próxima Revisão:</strong> ___/___/______</p>
</div>

<h2>2. Objetivo</h2>
<p>Padronizar o serviço de <strong>modelagem</strong>, garantindo o entendimento exato do resultado desejado pela cliente, a proteção do fio contra o calor, técnica correta no uso das ferramentas térmicas, fixação e durabilidade do formato, simetria e validação do resultado.</p>

<h2>3. Campo de Aplicação</h2>
<p>Este procedimento aplica-se a todos os profissionais responsáveis pelo serviço de modelagem.</p>

<h2>4. Fluxo do Atendimento</h2>
<div style="${BOX}">
  <div style="${BOXH}">Atenção ao ponto de partida</div>
  <p style="margin:0"><strong>Cliente chega com o cabelo sujo:</strong> realizar a higienização no lavatório (PARTE B) e seguir o fluxo completo.</p>
  <p style="margin:8px 0 0"><strong>Cliente já chega com o cabelo limpo:</strong> <strong>pular a PARTE B</strong> e ir direto para a preparação do procedimento (PARTE C).</p>
</div>

<h2>5. Materiais Necessários</h2>
<h3>Equipamentos</h3>
<ul style="${CHECK}">
  <li>☐ Secador com bico direcionador.</li>
  <li>☐ Modelador ou babyliss (diâmetros variados).</li>
  <li>☐ Prancha.</li>
  <li>☐ Escovas (conforme o resultado desejado).</li>
  <li>☐ Pentes.</li>
  <li>☐ Presilhas para separar as mechas.</li>
  <li>☐ Toalhas limpas.</li>
  <li>☐ Capa de proteção.</li>
  <li>☐ Robe ou avental.</li>
  <li>☐ Espelho de mão (para mostrar o resultado).</li>
</ul>
<h3>Produtos</h3>
<ul style="${CHECK}">
  <li>☐ Shampoo 1 e Shampoo 2.</li>
  <li>☐ Condicionador.</li>
  <li>☐ <strong>Protetor térmico</strong> (obrigatório).</li>
  <li>☐ Leave-in.</li>
  <li>☐ Mousse, creme ou spray modelador.</li>
  <li>☐ Óleo ou sérum finalizador.</li>
  <li>☐ Spray fixador.</li>
</ul>

<h2>6. Higiene e Segurança</h2>
<h3>Antes do Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Higienizar corretamente as mãos.</li>
  <li>☐ Manter uniforme limpo e cabelos presos.</li>
  <li>☐ Conferir a limpeza da estação.</li>
  <li>☐ Higienizar escovas e pentes entre as clientes.</li>
  <li>☐ Limpar as placas da prancha e do modelador (resíduo de produto queima o fio).</li>
  <li>☐ Verificar o estado dos equipamentos (fio, tomada, aquecimento uniforme).</li>
  <li>☐ Organizar todos os produtos e verificar a validade.</li>
</ul>
<h3>Durante o Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Manter a estação organizada.</li>
  <li>☐ Não utilizar telefone celular.</li>
  <li>☐ Não consumir alimentos.</li>
  <li>☐ <strong>Nunca encostar a ferramenta quente no couro cabeludo, no rosto ou nas orelhas.</strong></li>
  <li>☐ Apoiar a ferramenta sempre em base térmica, nunca sobre a bancada.</li>
  <li>☐ Não deixar a ferramenta quente ao alcance da cliente.</li>
  <li>☐ Perguntar à cliente se a temperatura está agradável.</li>
  <li>☐ <strong>Nunca usar ferramenta térmica sem protetor térmico.</strong></li>
  <li>☐ <strong>Nunca usar prancha ou modelador em cabelo úmido.</strong></li>
</ul>
<h3>Após o Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Desligar os equipamentos da tomada.</li>
  <li>☐ Aguardar o resfriamento antes de guardar.</li>
  <li>☐ Limpar escovas, pentes e placas.</li>
  <li>☐ Recolher os cabelos do chão e da cadeira.</li>
  <li>☐ Higienizar a estação e as mãos.</li>
  <li>☐ Preparar a estação para a próxima cliente.</li>
</ul>

<h2>7. Procedimento Operacional</h2>

<h3>PARTE A — Início do Atendimento</h3>
<p><strong>1. Apresentação do Profissional</strong> — sempre iniciar o atendimento de frente para a cliente, demonstrando simpatia, cordialidade e profissionalismo.</p>
<blockquote>"Olá (Nome da cliente), meu nome é (Nome do Profissional) e hoje eu serei o(a) responsável pelo seu atendimento."</blockquote>
<p><strong>2. Confirmação do Serviço</strong></p>
<blockquote>"A senhora irá modelar o cabelo hoje, correto?"</blockquote>
<p><strong>3. Identificação da Necessidade</strong></p>
<blockquote>"O que a senhora pensou para hoje?" · "A senhora possui alguma preferência ou alguma foto de referência?"</blockquote>
<p><strong>4. Ponderações e Orientações</strong> — após ouvir atentamente a cliente, explicar de forma clara e profissional:</p>
<ul style="${CHECK}">
  <li>☐ O que é possível realizar.</li>
  <li>☐ O que não é recomendado realizar.</li>
  <li>☐ As limitações técnicas (tipo, comprimento, densidade e condição do fio).</li>
  <li>☐ Quanto tempo a modelagem tende a durar.</li>
  <li>☐ Os cuidados necessários para preservar a saúde do cabelo.</li>
</ul>
<blockquote>"Baseado no que a senhora deseja, é possível fazer [explicar o que dá para fazer]."</blockquote>
<blockquote>"Não recomendamos [explicar o que não é recomendado] porque [explicar o motivo]."</blockquote>
<p><strong>Quando a referência não for possível no cabelo da cliente, explicar o motivo e apresentar uma alternativa antes de iniciar.</strong> Nenhum procedimento deverá ser iniciado antes que a cliente compreenda e concorde com o serviço que será realizado.</p>
<p><strong>5. Verificar o ponto de partida</strong> — perguntar se a cliente já veio com o cabelo lavado.</p>
<blockquote>"A senhora já veio com o cabelo limpo, ou vamos passar pelo lavatório antes?"</blockquote>
<p><strong>Se a cliente já estiver com o cabelo limpo, seguir direto para a PARTE C.</strong></p>

<h3>PARTE B — Higienização no Lavatório</h3>
<p style="color:#6b6880"><em>Executar somente quando a cliente não chega com o cabelo limpo.</em></p>
<p><strong>6. Avaliação do Cabelo e Informação das Necessidades</strong></p>
<ul style="${CHECK}">
  <li>☐ Observar o estado geral do cabelo.</li>
  <li>☐ Verificar o tipo de cabelo (liso, ondulado, cacheado, crespo).</li>
  <li>☐ Verificar a porosidade do cabelo.</li>
  <li>☐ Verificar se há ressecamento, danos ou pontas duplas.</li>
  <li>☐ Verificar se há química (coloração, descoloração, alisamento).</li>
  <li>☐ Verificar o couro cabeludo (oleosidade, caspa, sensibilidade).</li>
  <li>☐ Informar à cliente as necessidades identificadas.</li>
</ul>
<p><strong>7. Oferta de Tratamento</strong> — perguntar se a cliente deseja realizar algum tratamento de acordo com a necessidade identificada.</p>
<blockquote>"A senhora gostaria de fazer um tratamento de [hidratação/nutrição/reconstrução] de acordo com a necessidade do seu cabelo?"</blockquote>
<p><strong>8. Informar os Produtos e Experiência Sensorial</strong> — informar todos os produtos que serão utilizados e deixar a cliente sentir o cheiro.</p>
<p><strong>9. Execução da Higienização</strong></p>
<ul style="${CHECK}">
  <li>☐ Verificar a temperatura da água (morna, agradável).</li>
  <li>☐ Soltar um pouco o cabelo da raiz e desembaraçar suavemente.</li>
  <li>☐ Aplicar o 1º shampoo, emulsionar bem e enxaguar completamente.</li>
  <li>☐ Aplicar o 2º shampoo + massagem no couro cabeludo por 3 minutos.</li>
  <li>☐ Enxaguar completamente.</li>
  <li>☐ Aguardar o tempo de pausa recomendado pela marca.</li>
  <li>☐ Aplicar o condicionador no comprimento e nas pontas, evitando a raiz.</li>
  <li>☐ Aguardar o tempo recomendado pela marca.</li>
  <li>☐ Enxaguar completamente, sem deixar resíduos.</li>
</ul>
<div style="${BOX}">
  <p style="margin:0">Para modelagem, <strong>não aplicar condicionador ou máscara na raiz</strong> e evitar excesso no comprimento. Cabelo pesado demais não segura o formato.</p>
</div>
<p><strong>10. Finalização da Higienização</strong> — fazer a touca com a toalha e conduzir a cliente até a cadeira.</p>

<h3>PARTE C — Definição da Modelagem e Preparação</h3>
<p><strong>11. Preparação da Cliente</strong></p>
<ul style="${CHECK}">
  <li>☐ Ajudar a cliente a se sentar confortavelmente.</li>
  <li>☐ Remover a touca de toalha.</li>
  <li>☐ Secar com a toalha, retirando o excesso de água (pressionar, nunca esfregar).</li>
  <li>☐ Colocar a capa de proteção.</li>
  <li>☐ Colocar o robe ou avental.</li>
</ul>
<p><strong>12. Verificar Como a Cliente Gosta e Como Quer a Modelagem</strong> — antes de qualquer produto ou ferramenta, alinhar exatamente o resultado esperado.</p>
<ul style="${CHECK}">
  <li>☐ Perguntar qual tipo de modelagem deseja.</li>
  <li>☐ Perguntar o volume desejado (natural, médio ou bastante volume).</li>
  <li>☐ Perguntar o lado da repartição.</li>
  <li>☐ Perguntar se prefere o movimento mais solto ou mais marcado.</li>
  <li>☐ Perguntar se costuma prender o cabelo depois.</li>
  <li>☐ Observar a foto de referência, quando houver.</li>
  <li>☐ Confirmar em voz alta o que será feito, antes de começar.</li>
</ul>
<blockquote>"A senhora prefere as ondas mais soltas e naturais, ou mais marcadas?"</blockquote>
<blockquote>"De que lado a senhora costuma repartir o cabelo?"</blockquote>
<blockquote>"Então vamos fazer [descrever a modelagem], com a repartição do lado [X] e volume [natural/médio/alto]. É isso mesmo?"</blockquote>
<table style="${TBL}">
  <tr><th style="${TH}">Modelagem desejada</th><th style="${TH}">Ferramenta indicada</th><th style="${TH}">Observação</th></tr>
  <tr><td style="${TD}">Ondas soltas / praia</td><td style="${TD}">Modelador de maior diâmetro</td><td style="${TD}">Alternar o sentido das mechas dá naturalidade</td></tr>
  <tr><td style="${TD}">Cachos definidos</td><td style="${TD}">Modelador de menor diâmetro</td><td style="${TD}">Mechas mais finas, formato mais firme</td></tr>
  <tr><td style="${TD}">Ondas na prancha</td><td style="${TD}">Prancha</td><td style="${TD}">Movimento contínuo, sem parar na mecha</td></tr>
  <tr><td style="${TD}">Escova modelada com movimento</td><td style="${TD}">Secador + escova redonda</td><td style="${TD}">Resultado mais leve e natural</td></tr>
  <tr><td style="${TD}">Liso modelado com pontas viradas</td><td style="${TD}">Prancha ou escova</td><td style="${TD}">Definir se as pontas viram para dentro ou para fora</td></tr>
  <tr><td style="${TD}">Volume na raiz</td><td style="${TD}">Secador + escova ou modelador</td><td style="${TD}">Trabalhar a raiz antes do comprimento</td></tr>
</table>
<p><strong>13. Aplicação dos Produtos</strong></p>
<ul style="${CHECK}">
  <li>☐ Desembaraçar com pente de dentes largos, das pontas para a raiz.</li>
  <li>☐ Aplicar o <strong>protetor térmico</strong> em todo o comprimento — <strong>obrigatório</strong>.</li>
  <li>☐ Aplicar leave-in, mousse ou creme modelador conforme o resultado desejado.</li>
  <li>☐ Distribuir bem o produto, mecha a mecha.</li>
  <li>☐ Não exagerar na quantidade — excesso pesa e desmancha a modelagem.</li>
  <li>☐ Evitar produto na raiz quando o objetivo for volume.</li>
</ul>
<p><strong>14. Secagem Prévia</strong> — <strong>a modelagem com ferramenta térmica só pode ser feita com o cabelo 100% seco.</strong></p>
<ul style="${CHECK}">
  <li>☐ Secar completamente o cabelo com o secador.</li>
  <li>☐ Direcionar o ar da raiz para as pontas.</li>
  <li>☐ Conferir se não restou nenhuma mecha úmida, principalmente na nuca.</li>
</ul>
<p><strong>15. Penteia e alinha o cabelo</strong> — pentear, definir a repartição combinada e separar o cabelo em seções com presilhas, de baixo para cima.</p>

<h3>PARTE D — Execução da Modelagem</h3>
<p><strong>16. Ajuste da Ferramenta</strong></p>
<ul style="${CHECK}">
  <li>☐ Selecionar a ferramenta e o diâmetro conforme o resultado combinado.</li>
  <li>☐ Ajustar a temperatura conforme a condição do fio.</li>
  <li>☐ Aguardar o aquecimento completo antes de iniciar.</li>
  <li>☐ Testar em uma mecha da nuca antes de trabalhar as áreas visíveis.</li>
</ul>
<table style="${TBL}">
  <tr><th style="${TH}">Condição do fio</th><th style="${TH}">Temperatura recomendada</th></tr>
  <tr><td style="${TD}">Cabelo saudável, sem química, grosso</td><td style="${TD}">Alta</td></tr>
  <tr><td style="${TD}">Cabelo com coloração</td><td style="${TD}">Média</td></tr>
  <tr><td style="${TD}">Cabelo fino, descolorido ou danificado</td><td style="${TD}">Baixa</td></tr>
</table>
<p><strong>17. Execução por Seções</strong></p>
<ul style="${CHECK}">
  <li>☐ Trabalhar mecha a mecha, começando pela nuca e subindo.</li>
  <li>☐ Manter as demais seções presas com presilhas.</li>
  <li>☐ Manter a espessura das mechas uniforme (mechas desiguais geram formatos desiguais).</li>
  <li>☐ Não iniciar a ferramenta colada à raiz.</li>
  <li>☐ Respeitar o tempo de permanência da ferramenta na mecha.</li>
  <li>☐ Não repassar a ferramenta várias vezes na mesma mecha.</li>
  <li>☐ Seguir o sentido combinado com a cliente.</li>
  <li>☐ Conferir a simetria entre os dois lados durante a execução.</li>
</ul>
<div style="${BOX}">
  <p style="margin:0"><strong>Deixar a mecha esfriar antes de mexer.</strong> É ao esfriar que o fio fixa o formato. Pentear ou soltar a mecha ainda quente desmancha a modelagem e reduz a durabilidade.</p>
</div>
<p><strong>18. Abertura e Definição</strong></p>
<ul style="${CHECK}">
  <li>☐ Aguardar todo o cabelo esfriar antes de mexer.</li>
  <li>☐ Soltar e abrir o movimento com os dedos, conforme o resultado desejado.</li>
  <li>☐ Usar o pente ou a escova apenas quando a cliente quiser um resultado mais solto.</li>
  <li>☐ Ajustar o volume da raiz.</li>
  <li>☐ Conferir se o movimento ficou uniforme dos dois lados.</li>
</ul>

<h3>PARTE E — Acabamento e Fixação</h3>
<p><strong>19. Acabamento Final</strong></p>
<ul style="${CHECK}">
  <li>☐ Ajustar a repartição conforme combinado.</li>
  <li>☐ Verificar a simetria e o caimento.</li>
  <li>☐ Verificar se não há mechas sem modelagem.</li>
  <li>☐ Verificar frizz ou fios armados.</li>
  <li>☐ Aplicar óleo ou sérum nas pontas, com moderação.</li>
  <li>☐ Aplicar spray fixador conforme a durabilidade desejada.</li>
  <li>☐ Aplicar o fixador à distância, sem encharcar.</li>
</ul>
<blockquote>"Vou aplicar um fixador para a modelagem durar mais. A senhora prefere uma fixação mais leve ou mais firme?"</blockquote>

<h3>PARTE F — Validação e Finalização</h3>
<p><strong>20. Validação da Cliente</strong> — apresentar o resultado e perguntar obrigatoriamente:</p>
<blockquote>"A senhora gostou do resultado?"</blockquote>
<blockquote>"Existe algum detalhe que gostaria que ajustássemos?"</blockquote>
<p>Utilizar o espelho de mão para mostrar a parte de trás e as laterais. <strong>Caso a cliente solicite qualquer ajuste, este deverá ser realizado imediatamente.</strong> O atendimento somente poderá ser encerrado após a aprovação da cliente.</p>
<p><strong>21. Orientações de Manutenção</strong></p>
<ul style="${CHECK}">
  <li>☐ Explicar quanto tempo a modelagem tende a durar.</li>
  <li>☐ Orientar como dormir para preservar o formato.</li>
  <li>☐ Orientar sobre umidade, chuva e transpiração.</li>
  <li>☐ Oferecer os produtos utilizados para venda.</li>
  <li>☐ Oferecer o reagendamento.</li>
</ul>
<blockquote>"Para durar mais, evite umidade e passe a mão o mínimo possível. Gostaria de já deixar seu próximo horário agendado?"</blockquote>
<p><strong>22. Encerramento</strong></p>
<ul>
  <li><strong>Se a modelagem for o último serviço:</strong> retirar a capa, agradecer a preferência e acompanhar a cliente até a recepção.</li>
  <li><strong>Se houver outro procedimento na sequência:</strong> chamar o profissional principal, informando nome da cliente, procedimentos agendados, produtos utilizados e observações sobre o cabelo.</li>
</ul>
<blockquote>"Foi um prazer atender você, (Nome)! Espero vê-la em breve."</blockquote>

<h3>PARTE G — Organização Pós-Atendimento</h3>
<p><strong>23. Limpeza e Registro</strong></p>
<ul style="${CHECK}">
  <li>☐ Desligar os equipamentos da tomada.</li>
  <li>☐ Aguardar o resfriamento antes de guardar.</li>
  <li>☐ Limpar as escovas, os pentes e as placas.</li>
  <li>☐ Recolher os cabelos do chão e da cadeira.</li>
  <li>☐ Higienizar a estação.</li>
  <li>☐ Guardar os produtos corretamente.</li>
  <li>☐ Registrar o serviço e os produtos no sistema.</li>
  <li>☐ Registrar os produtos vendidos (se houver).</li>
</ul>

<h2>8. Indicadores de Qualidade</h2>
<p>A gerência deverá acompanhar mensalmente:</p>
<ul style="${CHECK}">
  <li>☐ Tempo médio de modelagem.</li>
  <li>☐ Número de retrabalhos (cliente pediu ajuste após finalizar).</li>
  <li>☐ Número de reclamações sobre durabilidade.</li>
  <li>☐ Índice de satisfação da cliente.</li>
  <li>☐ Percentual de reagendamento.</li>
  <li>☐ Conversão de modelagem em tratamento capilar.</li>
  <li>☐ Vendas de produtos finalizadores e fixadores.</li>
  <li>☐ Uso do protetor térmico em 100% dos atendimentos.</li>
</ul>

<h2>9. Checklist de Auditoria</h2>
<div style="${BOX}">
  <div style="${BOXH}">Apresentação</div>
  <ul style="${CHECK}">
    <li>☐ Apresentou-se de frente para a cliente, com nome.</li>
    <li>☐ Confirmou o serviço (modelagem).</li>
    <li>☐ Perguntou o que a cliente desejava.</li>
    <li>☐ Perguntou se havia preferência ou referência.</li>
    <li>☐ Fez as ponderações do que dá e do que não dá para fazer.</li>
    <li>☐ Verificou se a cliente já veio com o cabelo limpo.</li>
  </ul>
  <div style="${BOXH}">Lavatório (quando aplicável)</div>
  <ul style="${CHECK}">
    <li>☐ Realizou avaliação capilar e informou as necessidades.</li>
    <li>☐ Perguntou se deseja tratamento.</li>
    <li>☐ Informou os produtos e deixou sentir o cheiro.</li>
    <li>☐ Aplicou o 1º shampoo.</li>
    <li>☐ Aplicou o 2º shampoo + massagem de 3 minutos.</li>
    <li>☐ Respeitou os tempos de pausa.</li>
    <li>☐ Aplicou o condicionador e enxaguou completamente.</li>
  </ul>
  <div style="${BOXH}">Definição da Modelagem</div>
  <ul style="${CHECK}">
    <li>☐ Perguntou qual tipo de modelagem desejava.</li>
    <li>☐ Perguntou o volume desejado.</li>
    <li>☐ Perguntou o lado da repartição.</li>
    <li>☐ Perguntou se prefere o movimento solto ou marcado.</li>
    <li>☐ Confirmou em voz alta o que seria feito.</li>
  </ul>
  <div style="${BOXH}">Preparação</div>
  <ul style="${CHECK}">
    <li>☐ Secou com a toalha sem esfregar.</li>
    <li>☐ Colocou capa e robe.</li>
    <li>☐ Desembaraçou das pontas para a raiz.</li>
    <li>☐ Aplicou o protetor térmico.</li>
    <li>☐ Aplicou o modelador sem exagerar na quantidade.</li>
    <li>☐ Secou o cabelo completamente antes da ferramenta.</li>
    <li>☐ Penteou, definiu a repartição e separou em seções.</li>
  </ul>
  <div style="${BOXH}">Execução</div>
  <ul style="${CHECK}">
    <li>☐ Selecionou a ferramenta e o diâmetro corretos.</li>
    <li>☐ Ajustou a temperatura à condição do fio.</li>
    <li>☐ Trabalhou mecha a mecha, da nuca para cima.</li>
    <li>☐ Manteve a espessura das mechas uniforme.</li>
    <li>☐ Não encostou a ferramenta no couro cabeludo.</li>
    <li>☐ Não repassou a ferramenta várias vezes na mesma mecha.</li>
    <li>☐ Deixou as mechas esfriarem antes de mexer.</li>
    <li>☐ Conferiu a simetria durante a execução.</li>
  </ul>
  <div style="${BOXH}">Acabamento e Finalização</div>
  <ul style="${CHECK}">
    <li>☐ Abriu o movimento com os dedos.</li>
    <li>☐ Ajustou o volume da raiz e a repartição.</li>
    <li>☐ Verificou simetria, caimento e mechas sem modelagem.</li>
    <li>☐ Aplicou o fixador à distância.</li>
    <li>☐ Mostrou o resultado com o espelho de mão.</li>
    <li>☐ Perguntou se a cliente gostou e se havia ajustes.</li>
    <li>☐ Realizou os ajustes imediatamente.</li>
    <li>☐ Orientou sobre a manutenção e ofereceu reagendamento.</li>
    <li>☐ Organizou a estação e registrou no sistema.</li>
  </ul>
</div>
`.trim()

const PRO_CHAPINHA_HTML = `
<h1>Procedimento Operacional Padrão (POP)</h1>
<p style="color:#6b6880;font-size:15px;margin:-4px 0 16px;font-weight:600">POP-PRO-009 — Chapinha</p>

<h2>1. Identificação</h2>
<div style="${META}">
  <p style="margin:0"><strong>Código:</strong> POP-PRO-009 &nbsp;·&nbsp; <strong>Versão:</strong> 1.0 &nbsp;·&nbsp; <strong>Setor:</strong> Profissionais (Cabeleireiro / Auxiliar)</p>
  <p style="margin:8px 0 0"><strong>Responsável:</strong> <span style="${FIELD}"></span></p>
  <p style="margin:8px 0 0"><strong>Data de Emissão:</strong> ___/___/______ &nbsp;·&nbsp; <strong>Última Revisão:</strong> ___/___/______ &nbsp;·&nbsp; <strong>Próxima Revisão:</strong> ___/___/______</p>
</div>

<h2>2. Objetivo</h2>
<p>Padronizar o serviço de <strong>chapinha</strong>, garantindo a proteção do fio contra o calor, temperatura adequada à condição do cabelo, técnica correta de deslizamento das placas, acabamento liso, alinhado e com brilho, e validação do resultado pela cliente — <strong>sem comprometer a saúde do fio</strong>.</p>

<h2>3. Campo de Aplicação</h2>
<p>Este procedimento aplica-se a todos os profissionais responsáveis pelo serviço de chapinha.</p>

<h2>4. Fluxo do Atendimento</h2>
<div style="${BOX}">
  <div style="${BOXH}">Atenção ao ponto de partida</div>
  <p style="margin:0"><strong>Cliente chega com o cabelo sujo:</strong> realizar a higienização no lavatório (PARTE B) e seguir o fluxo completo.</p>
  <p style="margin:8px 0 0"><strong>Cliente já chega com o cabelo limpo:</strong> <strong>pular a PARTE B</strong> e ir direto para a preparação do procedimento (PARTE C).</p>
</div>

<h2>5. Materiais Necessários</h2>
<h3>Equipamentos</h3>
<ul style="${CHECK}">
  <li>☐ Prancha (chapinha) com controle de temperatura.</li>
  <li>☐ Secador com bico direcionador.</li>
  <li>☐ Escovas.</li>
  <li>☐ Pentes de dentes finos e largos.</li>
  <li>☐ Presilhas para separar as mechas.</li>
  <li>☐ Base térmica para apoiar a prancha.</li>
  <li>☐ Toalhas limpas.</li>
  <li>☐ Capa de proteção.</li>
  <li>☐ Robe ou avental.</li>
  <li>☐ Espelho de mão (para mostrar o resultado).</li>
</ul>
<h3>Produtos</h3>
<ul style="${CHECK}">
  <li>☐ Shampoo 1 e Shampoo 2.</li>
  <li>☐ Condicionador.</li>
  <li>☐ <strong>Protetor térmico</strong> (obrigatório).</li>
  <li>☐ Leave-in.</li>
  <li>☐ Óleo ou sérum finalizador.</li>
  <li>☐ Spray de brilho ou anti-frizz.</li>
</ul>

<h2>6. Higiene e Segurança</h2>
<h3>Antes do Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Higienizar corretamente as mãos.</li>
  <li>☐ Manter uniforme limpo e cabelos presos.</li>
  <li>☐ Conferir a limpeza da estação.</li>
  <li>☐ Higienizar escovas e pentes entre as clientes.</li>
  <li>☐ <strong>Limpar as placas da prancha</strong> — resíduo acumulado queima o fio e marca o cabelo.</li>
  <li>☐ Verificar se as placas aquecem de forma uniforme e não estão lascadas.</li>
  <li>☐ Verificar o estado do fio e da tomada.</li>
  <li>☐ Organizar todos os produtos e verificar a validade.</li>
</ul>
<h3>Durante o Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Manter a estação organizada.</li>
  <li>☐ Não utilizar telefone celular.</li>
  <li>☐ Não consumir alimentos.</li>
  <li>☐ <strong>Nunca passar a chapinha em cabelo úmido</strong> — a água ferve dentro do fio e provoca quebra.</li>
  <li>☐ <strong>Nunca usar a chapinha sem protetor térmico.</strong></li>
  <li>☐ Nunca encostar a placa no couro cabeludo, no rosto ou nas orelhas.</li>
  <li>☐ Apoiar a prancha sempre em base térmica, nunca sobre a bancada.</li>
  <li>☐ Não deixar a prancha quente ao alcance da cliente.</li>
  <li>☐ Perguntar à cliente se a temperatura está agradável.</li>
</ul>
<h3>Após o Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Desligar a prancha da tomada.</li>
  <li>☐ Aguardar o resfriamento antes de guardar.</li>
  <li>☐ Limpar as placas, as escovas e os pentes.</li>
  <li>☐ Recolher os cabelos do chão e da cadeira.</li>
  <li>☐ Higienizar a estação e as mãos.</li>
  <li>☐ Preparar a estação para a próxima cliente.</li>
</ul>

<h2>7. Procedimento Operacional</h2>

<h3>PARTE A — Início do Atendimento</h3>
<p><strong>1. Apresentação do Profissional</strong> — sempre iniciar o atendimento de frente para a cliente, demonstrando simpatia, cordialidade e profissionalismo.</p>
<blockquote>"Olá (Nome da cliente), meu nome é (Nome do Profissional) e hoje eu serei o(a) responsável pelo seu atendimento."</blockquote>
<p><strong>2. Confirmação do Serviço</strong></p>
<blockquote>"A senhora irá fazer chapinha hoje, correto?"</blockquote>
<p><strong>3. Identificação da Necessidade</strong></p>
<blockquote>"O que a senhora pensou para hoje?" · "A senhora possui alguma preferência ou alguma foto de referência?"</blockquote>
<p><strong>4. Ponderações e Orientações</strong> — após ouvir atentamente a cliente, explicar de forma clara e profissional:</p>
<ul style="${CHECK}">
  <li>☐ O que é possível realizar.</li>
  <li>☐ O que não é recomendado realizar.</li>
  <li>☐ As limitações técnicas (tipo, densidade e condição do fio).</li>
  <li>☐ Quanto tempo o liso tende a durar.</li>
  <li>☐ Os cuidados necessários para preservar a saúde do cabelo.</li>
</ul>
<blockquote>"Baseado no que a senhora deseja, é possível fazer [explicar o que dá para fazer]."</blockquote>
<blockquote>"Não recomendamos [explicar o que não é recomendado] porque [explicar o motivo]."</blockquote>
<div style="${BOX}">
  <div style="${BOXH}">Quando o fio não permite</div>
  <p style="margin:0">Se o cabelo estiver <strong>muito danificado, quebradiço ou com descoloração recente</strong>, informar a cliente com clareza e propor uma alternativa — temperatura mais baixa, tratamento antes, ou outro dia. <strong>Não realizar o procedimento em condições que comprometam o fio.</strong> Comunicar a gerência quando houver recusa técnica.</p>
</div>
<blockquote>"Seu cabelo está bastante sensibilizado. Se passarmos a chapinha hoje, o risco de quebra é alto. Recomendo fazermos um tratamento primeiro. Posso te explicar?"</blockquote>
<p><strong>Nenhum procedimento deverá ser iniciado antes que a cliente compreenda e concorde com o serviço que será realizado.</strong></p>
<p><strong>5. Verificar o ponto de partida</strong> — perguntar se a cliente já veio com o cabelo lavado.</p>
<blockquote>"A senhora já veio com o cabelo limpo, ou vamos passar pelo lavatório antes?"</blockquote>
<p><strong>Se a cliente já estiver com o cabelo limpo, seguir direto para a PARTE C.</strong></p>

<h3>PARTE B — Higienização no Lavatório</h3>
<p style="color:#6b6880"><em>Executar somente quando a cliente não chega com o cabelo limpo.</em></p>
<p><strong>6. Avaliação do Cabelo e Informação das Necessidades</strong></p>
<ul style="${CHECK}">
  <li>☐ Observar o estado geral do cabelo.</li>
  <li>☐ Verificar o tipo de cabelo (liso, ondulado, cacheado, crespo).</li>
  <li>☐ Verificar a porosidade e a elasticidade do fio.</li>
  <li>☐ Verificar se há ressecamento, danos ou pontas duplas.</li>
  <li>☐ Verificar se há química (coloração, descoloração, alisamento).</li>
  <li>☐ Verificar o couro cabeludo (oleosidade, caspa, sensibilidade).</li>
  <li>☐ Informar à cliente as necessidades identificadas.</li>
</ul>
<p><strong>7. Oferta de Tratamento</strong> — perguntar se a cliente deseja realizar algum tratamento de acordo com a necessidade identificada.</p>
<blockquote>"A senhora gostaria de fazer um tratamento de [hidratação/nutrição/reconstrução] de acordo com a necessidade do seu cabelo?"</blockquote>
<p><strong>8. Informar os Produtos e Experiência Sensorial</strong> — informar todos os produtos que serão utilizados e deixar a cliente sentir o cheiro.</p>
<p><strong>9. Execução da Higienização</strong></p>
<ul style="${CHECK}">
  <li>☐ Verificar a temperatura da água (morna, agradável).</li>
  <li>☐ Soltar um pouco o cabelo da raiz e desembaraçar suavemente.</li>
  <li>☐ Aplicar o 1º shampoo, emulsionar bem e enxaguar completamente.</li>
  <li>☐ Aplicar o 2º shampoo + massagem no couro cabeludo por 3 minutos.</li>
  <li>☐ Enxaguar completamente.</li>
  <li>☐ Aguardar o tempo de pausa recomendado pela marca.</li>
  <li>☐ Aplicar o condicionador no comprimento e nas pontas, evitando a raiz.</li>
  <li>☐ Aguardar o tempo recomendado pela marca.</li>
  <li>☐ Enxaguar completamente, sem deixar resíduos.</li>
</ul>
<p><strong>10. Finalização da Higienização</strong> — fazer a touca com a toalha e conduzir a cliente até a cadeira.</p>

<h3>PARTE C — Definição do Resultado e Preparação</h3>
<p><strong>11. Preparação da Cliente</strong></p>
<ul style="${CHECK}">
  <li>☐ Ajudar a cliente a se sentar confortavelmente.</li>
  <li>☐ Remover a touca de toalha.</li>
  <li>☐ Secar com a toalha, retirando o excesso de água (pressionar, nunca esfregar).</li>
  <li>☐ Colocar a capa de proteção.</li>
  <li>☐ Colocar o robe ou avental.</li>
</ul>
<p><strong>12. Verificar Como a Cliente Gosta e Como Quer o Resultado</strong></p>
<ul style="${CHECK}">
  <li>☐ Perguntar se prefere o liso totalmente reto ou com movimento nas pontas.</li>
  <li>☐ Perguntar se as pontas devem virar para dentro ou ficar retas.</li>
  <li>☐ Perguntar o lado da repartição.</li>
  <li>☐ Perguntar se quer volume na raiz ou o liso desde a raiz.</li>
  <li>☐ Observar a foto de referência, quando houver.</li>
  <li>☐ Confirmar em voz alta o que será feito, antes de começar.</li>
</ul>
<blockquote>"A senhora prefere o liso bem reto, ou com as pontas viradas para dentro?"</blockquote>
<blockquote>"Então vamos fazer [descrever o resultado], com a repartição do lado [X]. É isso mesmo?"</blockquote>
<p><strong>13. Aplicação dos Produtos</strong></p>
<ul style="${CHECK}">
  <li>☐ Desembaraçar com pente de dentes largos, das pontas para a raiz.</li>
  <li>☐ Aplicar o <strong>protetor térmico</strong> em todo o comprimento — <strong>obrigatório</strong>.</li>
  <li>☐ Aplicar leave-in ou finalizador conforme o tipo de cabelo.</li>
  <li>☐ Distribuir bem o produto, mecha a mecha.</li>
  <li>☐ Não exagerar na quantidade — excesso de produto queima na placa e deixa o fio pesado.</li>
</ul>
<p><strong>14. Secagem Completa e Modelagem Prévia</strong></p>
<ul style="${CHECK}">
  <li>☐ Secar completamente o cabelo com o secador.</li>
  <li>☐ Direcionar o ar da raiz para as pontas.</li>
  <li>☐ Modelar com a escova, já alinhando o fio.</li>
  <li>☐ <strong>Conferir se não restou nenhuma mecha úmida</strong>, principalmente na nuca e nas laterais.</li>
</ul>
<div style="${BOX}">
  <p style="margin:0"><strong>O cabelo precisa estar 100% seco antes da chapinha.</strong> Passar a placa em fio úmido faz a água ferver dentro da fibra e provoca quebra imediata — o estalo ao passar a prancha é o sinal.</p>
</div>
<p><strong>15. Penteia e alinha o cabelo</strong> — pentear, definir a repartição combinada e separar o cabelo em seções com presilhas, de baixo para cima.</p>

<h3>PARTE D — Execução da Chapinha</h3>
<p><strong>16. Ajuste da Temperatura</strong> — a temperatura deve ser definida pela condição do fio, nunca por hábito.</p>
<table style="${TBL}">
  <tr><th style="${TH}">Condição do fio</th><th style="${TH}">Temperatura recomendada</th></tr>
  <tr><td style="${TD}">Cabelo virgem, grosso e resistente</td><td style="${TD}">Alta</td></tr>
  <tr><td style="${TD}">Cabelo com coloração, saudável</td><td style="${TD}">Média</td></tr>
  <tr><td style="${TD}">Cabelo fino</td><td style="${TD}">Baixa a média</td></tr>
  <tr><td style="${TD}">Cabelo descolorido, sensibilizado ou quebradiço</td><td style="${TD}">Baixa</td></tr>
</table>
<ul style="${CHECK}">
  <li>☐ Aguardar o aquecimento completo da prancha antes de iniciar.</li>
  <li>☐ Testar em uma mecha da nuca antes de trabalhar as áreas visíveis.</li>
  <li>☐ Perguntar à cliente se a temperatura está agradável.</li>
</ul>
<p><strong>17. Execução por Seções</strong></p>
<ul style="${CHECK}">
  <li>☐ Trabalhar mecha a mecha, começando pela nuca e subindo.</li>
  <li>☐ Manter as demais seções presas com presilhas.</li>
  <li>☐ Utilizar <strong>mechas finas</strong> — mecha grossa não alisa por igual e obriga a repassar.</li>
  <li>☐ Pentear cada mecha antes de passar a placa.</li>
  <li>☐ Iniciar a placa a uma distância segura da raiz.</li>
  <li>☐ <strong>Deslizar a prancha em movimento contínuo, sem parar na mecha.</strong></li>
  <li>☐ Manter a pressão firme e constante.</li>
  <li>☐ <strong>No máximo 1 a 2 passadas por mecha.</strong></li>
  <li>☐ Não repassar a placa repetidamente para "melhorar" o resultado.</li>
  <li>☐ Definir o acabamento das pontas conforme o combinado.</li>
  <li>☐ Conferir a simetria entre os dois lados durante a execução.</li>
</ul>
<div style="${BOX}">
  <p style="margin:0"><strong>Parar a prancha sobre a mecha marca o fio e queima.</strong> Se uma mecha não alisou, o problema é a espessura ou a temperatura — não a quantidade de passadas.</p>
</div>
<p><strong>18. Resfriamento</strong> — aguardar o cabelo esfriar antes de pentear ou ajustar. É ao esfriar que o fio fixa o formato.</p>

<h3>PARTE E — Acabamento e Finalização</h3>
<p><strong>19. Acabamento Final</strong></p>
<ul style="${CHECK}">
  <li>☐ Ajustar a repartição conforme combinado.</li>
  <li>☐ Verificar se não há mechas sem alisar, principalmente na nuca.</li>
  <li>☐ Verificar se não há marcas de placa no fio.</li>
  <li>☐ Verificar frizz e fios armados.</li>
  <li>☐ Verificar a simetria e o caimento.</li>
  <li>☐ Aplicar óleo, sérum ou spray de brilho nas pontas, com moderação.</li>
  <li>☐ Não aplicar produto pesado na raiz.</li>
</ul>

<h3>PARTE F — Validação e Encerramento</h3>
<p><strong>20. Validação da Cliente</strong> — apresentar o resultado e perguntar obrigatoriamente:</p>
<blockquote>"A senhora gostou do resultado?"</blockquote>
<blockquote>"Existe algum detalhe que gostaria que ajustássemos?"</blockquote>
<p>Utilizar o espelho de mão para mostrar a parte de trás e as laterais. <strong>Caso a cliente solicite qualquer ajuste, este deverá ser realizado imediatamente.</strong> O atendimento somente poderá ser encerrado após a aprovação da cliente.</p>
<p><strong>21. Orientações de Manutenção</strong></p>
<ul style="${CHECK}">
  <li>☐ Explicar quanto tempo o liso tende a durar.</li>
  <li>☐ Orientar sobre umidade, chuva e transpiração.</li>
  <li>☐ Orientar como dormir para preservar o resultado.</li>
  <li>☐ Reforçar a importância do protetor térmico em casa.</li>
  <li>☐ Orientar sobre a frequência segura de uso da chapinha.</li>
  <li>☐ Oferecer os produtos utilizados para venda.</li>
  <li>☐ Oferecer o reagendamento e o tratamento de manutenção.</li>
</ul>
<blockquote>"Para manter a saúde do fio, o ideal é intercalar a chapinha com tratamentos. Gostaria de já deixar agendado?"</blockquote>
<p><strong>22. Encerramento</strong></p>
<ul>
  <li><strong>Se a chapinha for o último serviço:</strong> retirar a capa, agradecer a preferência e acompanhar a cliente até a recepção.</li>
  <li><strong>Se houver outro procedimento na sequência:</strong> chamar o profissional principal, informando nome da cliente, procedimentos agendados, produtos utilizados, temperatura usada e observações sobre o cabelo.</li>
</ul>
<blockquote>"Foi um prazer atender você, (Nome)! Espero vê-la em breve."</blockquote>

<h3>PARTE G — Organização Pós-Atendimento</h3>
<p><strong>23. Limpeza e Registro</strong></p>
<ul style="${CHECK}">
  <li>☐ Desligar a prancha da tomada.</li>
  <li>☐ Aguardar o resfriamento antes de guardar.</li>
  <li>☐ Limpar as placas, as escovas e os pentes.</li>
  <li>☐ Recolher os cabelos do chão e da cadeira.</li>
  <li>☐ Higienizar a estação.</li>
  <li>☐ Guardar os produtos corretamente.</li>
  <li>☐ Registrar o serviço e os produtos no sistema.</li>
  <li>☐ Registrar observações sobre a condição do fio para a próxima visita.</li>
</ul>

<h2>8. Indicadores de Qualidade</h2>
<p>A gerência deverá acompanhar mensalmente:</p>
<ul style="${CHECK}">
  <li>☐ Tempo médio de chapinha.</li>
  <li>☐ Número de retrabalhos (cliente pediu ajuste após finalizar).</li>
  <li>☐ Número de reclamações sobre quebra, marca de placa ou durabilidade.</li>
  <li>☐ Índice de satisfação da cliente.</li>
  <li>☐ Percentual de reagendamento.</li>
  <li>☐ Conversão de chapinha em tratamento capilar.</li>
  <li>☐ Vendas de protetor térmico e finalizadores.</li>
  <li>☐ Uso do protetor térmico em 100% dos atendimentos.</li>
</ul>

<h2>9. Checklist de Auditoria</h2>
<div style="${BOX}">
  <div style="${BOXH}">Apresentação</div>
  <ul style="${CHECK}">
    <li>☐ Apresentou-se de frente para a cliente, com nome.</li>
    <li>☐ Confirmou o serviço (chapinha).</li>
    <li>☐ Perguntou o que a cliente desejava.</li>
    <li>☐ Perguntou se havia preferência ou referência.</li>
    <li>☐ Fez as ponderações do que dá e do que não dá para fazer.</li>
    <li>☐ Avaliou se a condição do fio permitia o procedimento.</li>
    <li>☐ Verificou se a cliente já veio com o cabelo limpo.</li>
  </ul>
  <div style="${BOXH}">Lavatório (quando aplicável)</div>
  <ul style="${CHECK}">
    <li>☐ Realizou avaliação capilar e informou as necessidades.</li>
    <li>☐ Perguntou se deseja tratamento.</li>
    <li>☐ Informou os produtos e deixou sentir o cheiro.</li>
    <li>☐ Aplicou o 1º shampoo.</li>
    <li>☐ Aplicou o 2º shampoo + massagem de 3 minutos.</li>
    <li>☐ Respeitou os tempos de pausa.</li>
    <li>☐ Aplicou o condicionador e enxaguou completamente.</li>
  </ul>
  <div style="${BOXH}">Preparação</div>
  <ul style="${CHECK}">
    <li>☐ Perguntou como a cliente queria o resultado.</li>
    <li>☐ Confirmou em voz alta o que seria feito.</li>
    <li>☐ Secou com a toalha sem esfregar.</li>
    <li>☐ Aplicou o protetor térmico.</li>
    <li>☐ Secou o cabelo 100% antes da prancha.</li>
    <li>☐ Conferiu se não havia mechas úmidas.</li>
    <li>☐ Penteou, definiu a repartição e separou em seções.</li>
  </ul>
  <div style="${BOXH}">Execução</div>
  <ul style="${CHECK}">
    <li>☐ Limpou as placas antes de iniciar.</li>
    <li>☐ Ajustou a temperatura à condição do fio.</li>
    <li>☐ Testou em uma mecha da nuca.</li>
    <li>☐ Trabalhou mecha a mecha, da nuca para cima.</li>
    <li>☐ Utilizou mechas finas.</li>
    <li>☐ Deslizou a prancha sem parar na mecha.</li>
    <li>☐ Fez no máximo 1 a 2 passadas por mecha.</li>
    <li>☐ Não encostou a placa no couro cabeludo.</li>
    <li>☐ Apoiou a prancha em base térmica.</li>
    <li>☐ Conferiu a simetria durante a execução.</li>
  </ul>
  <div style="${BOXH}">Finalização</div>
  <ul style="${CHECK}">
    <li>☐ Aguardou o cabelo esfriar antes de pentear.</li>
    <li>☐ Verificou mechas sem alisar e marcas de placa.</li>
    <li>☐ Aplicou finalizador com moderação.</li>
    <li>☐ Mostrou o resultado com o espelho de mão.</li>
    <li>☐ Perguntou se a cliente gostou e se havia ajustes.</li>
    <li>☐ Realizou os ajustes imediatamente.</li>
    <li>☐ Orientou sobre manutenção e frequência segura.</li>
    <li>☐ Ofereceu produtos e reagendamento.</li>
    <li>☐ Organizou a estação e registrou no sistema.</li>
  </ul>
</div>
`.trim()

const PRO_BABYLISS_HTML = `
<h1>Procedimento Operacional Padrão (POP)</h1>
<p style="color:#6b6880;font-size:15px;margin:-4px 0 16px;font-weight:600">POP-PRO-010 — Babyliss</p>

<h2>1. Identificação</h2>
<div style="${META}">
  <p style="margin:0"><strong>Código:</strong> POP-PRO-010 &nbsp;·&nbsp; <strong>Versão:</strong> 1.0 &nbsp;·&nbsp; <strong>Setor:</strong> Profissionais (Cabeleireiro / Auxiliar)</p>
  <p style="margin:8px 0 0"><strong>Responsável:</strong> <span style="${FIELD}"></span></p>
  <p style="margin:8px 0 0"><strong>Data de Emissão:</strong> ___/___/______ &nbsp;·&nbsp; <strong>Última Revisão:</strong> ___/___/______ &nbsp;·&nbsp; <strong>Próxima Revisão:</strong> ___/___/______</p>
</div>

<h2>2. Objetivo</h2>
<p>Padronizar o serviço de <strong>babyliss</strong>, garantindo o entendimento exato do tipo de cacho desejado, a proteção do fio contra o calor, uniformidade e simetria dos cachos, fixação e durabilidade do resultado, e validação pela cliente.</p>

<h2>3. Campo de Aplicação</h2>
<p>Este procedimento aplica-se a todos os profissionais responsáveis pelo serviço de babyliss.</p>

<h2>4. Fluxo do Atendimento</h2>
<div style="${BOX}">
  <div style="${BOXH}">Atenção ao ponto de partida</div>
  <p style="margin:0"><strong>Cliente chega com o cabelo sujo:</strong> realizar a higienização no lavatório (PARTE B) e seguir o fluxo completo.</p>
  <p style="margin:8px 0 0"><strong>Cliente já chega com o cabelo limpo:</strong> <strong>pular a PARTE B</strong> e ir direto para a preparação do procedimento (PARTE C).</p>
</div>

<h2>5. Materiais Necessários</h2>
<h3>Equipamentos</h3>
<ul style="${CHECK}">
  <li>☐ Babyliss / modelador com controle de temperatura.</li>
  <li>☐ Ponteiras de diâmetros variados.</li>
  <li>☐ Secador com bico direcionador.</li>
  <li>☐ Escovas.</li>
  <li>☐ Pentes de dentes largos.</li>
  <li>☐ Presilhas para separar as mechas.</li>
  <li>☐ Presilhas ou grampos para prender os cachos enquanto esfriam.</li>
  <li>☐ Base térmica para apoiar o babyliss.</li>
  <li>☐ Toalhas limpas.</li>
  <li>☐ Capa de proteção.</li>
  <li>☐ Robe ou avental.</li>
  <li>☐ Espelho de mão (para mostrar o resultado).</li>
</ul>
<h3>Produtos</h3>
<ul style="${CHECK}">
  <li>☐ Shampoo 1 e Shampoo 2.</li>
  <li>☐ Condicionador.</li>
  <li>☐ <strong>Protetor térmico</strong> (obrigatório).</li>
  <li>☐ Leave-in.</li>
  <li>☐ Mousse ou spray modelador.</li>
  <li>☐ Óleo ou sérum finalizador.</li>
  <li>☐ Spray fixador.</li>
</ul>

<h2>6. Higiene e Segurança</h2>
<h3>Antes do Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Higienizar corretamente as mãos.</li>
  <li>☐ Manter uniforme limpo e cabelos presos.</li>
  <li>☐ Conferir a limpeza da estação.</li>
  <li>☐ Higienizar escovas e pentes entre as clientes.</li>
  <li>☐ Limpar a ponteira do babyliss — resíduo de produto queima o fio.</li>
  <li>☐ Verificar se o aquecimento está uniforme e o revestimento não está danificado.</li>
  <li>☐ Verificar o estado do fio e da tomada.</li>
  <li>☐ Organizar todos os produtos e verificar a validade.</li>
</ul>
<h3>Durante o Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Manter a estação organizada.</li>
  <li>☐ Não utilizar telefone celular.</li>
  <li>☐ Não consumir alimentos.</li>
  <li>☐ <strong>Nunca usar o babyliss em cabelo úmido</strong> — a água ferve dentro do fio e provoca quebra.</li>
  <li>☐ <strong>Nunca usar o babyliss sem protetor térmico.</strong></li>
  <li>☐ Nunca encostar a ponteira no couro cabeludo, no rosto, nas orelhas ou no pescoço.</li>
  <li>☐ Apoiar o babyliss sempre em base térmica, nunca sobre a bancada.</li>
  <li>☐ Não deixar o babyliss quente ao alcance da cliente.</li>
  <li>☐ Perguntar à cliente se a temperatura está agradável.</li>
</ul>
<h3>Após o Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Desligar o babyliss da tomada.</li>
  <li>☐ Aguardar o resfriamento antes de guardar.</li>
  <li>☐ Limpar a ponteira, as escovas e os pentes.</li>
  <li>☐ Recolher os cabelos do chão e da cadeira.</li>
  <li>☐ Higienizar a estação e as mãos.</li>
  <li>☐ Preparar a estação para a próxima cliente.</li>
</ul>

<h2>7. Procedimento Operacional</h2>

<h3>PARTE A — Início do Atendimento</h3>
<p><strong>1. Apresentação do Profissional</strong> — sempre iniciar o atendimento de frente para a cliente, demonstrando simpatia, cordialidade e profissionalismo.</p>
<blockquote>"Olá (Nome da cliente), meu nome é (Nome do Profissional) e hoje eu serei o(a) responsável pelo seu atendimento."</blockquote>
<p><strong>2. Confirmação do Serviço</strong></p>
<blockquote>"A senhora irá fazer um babyliss hoje, correto?"</blockquote>
<p><strong>3. Identificação da Necessidade</strong></p>
<blockquote>"O que a senhora pensou para hoje?" · "A senhora possui alguma preferência ou alguma foto de referência?"</blockquote>
<p><strong>4. Ponderações e Orientações</strong> — após ouvir atentamente a cliente, explicar de forma clara e profissional:</p>
<ul style="${CHECK}">
  <li>☐ O que é possível realizar.</li>
  <li>☐ O que não é recomendado realizar.</li>
  <li>☐ As limitações técnicas (tipo, comprimento, densidade e condição do fio).</li>
  <li>☐ Quanto tempo o cacho tende a durar.</li>
  <li>☐ Os cuidados necessários para preservar a saúde do cabelo.</li>
</ul>
<blockquote>"Baseado no que a senhora deseja, é possível fazer [explicar o que dá para fazer]."</blockquote>
<blockquote>"Não recomendamos [explicar o que não é recomendado] porque [explicar o motivo]."</blockquote>
<div style="${BOX}">
  <p style="margin:0">Quando a referência não for possível no cabelo da cliente — por comprimento, densidade ou condição do fio — <strong>explicar o motivo e apresentar uma alternativa antes de iniciar</strong>. Cabelo muito curto, muito fino ou muito liso segura menos o cacho: informar isso <strong>antes</strong>, não depois.</p>
</div>
<p><strong>Nenhum procedimento deverá ser iniciado antes que a cliente compreenda e concorde com o serviço que será realizado.</strong></p>
<p><strong>5. Verificar o ponto de partida</strong> — perguntar se a cliente já veio com o cabelo lavado.</p>
<blockquote>"A senhora já veio com o cabelo limpo, ou vamos passar pelo lavatório antes?"</blockquote>
<p><strong>Se a cliente já estiver com o cabelo limpo, seguir direto para a PARTE C.</strong></p>

<h3>PARTE B — Higienização no Lavatório</h3>
<p style="color:#6b6880"><em>Executar somente quando a cliente não chega com o cabelo limpo.</em></p>
<p><strong>6. Avaliação do Cabelo e Informação das Necessidades</strong></p>
<ul style="${CHECK}">
  <li>☐ Observar o estado geral do cabelo.</li>
  <li>☐ Verificar o tipo de cabelo (liso, ondulado, cacheado, crespo).</li>
  <li>☐ Verificar a porosidade e a elasticidade do fio.</li>
  <li>☐ Verificar se há ressecamento, danos ou pontas duplas.</li>
  <li>☐ Verificar se há química (coloração, descoloração, alisamento).</li>
  <li>☐ Verificar o couro cabeludo (oleosidade, caspa, sensibilidade).</li>
  <li>☐ Informar à cliente as necessidades identificadas.</li>
</ul>
<p><strong>7. Oferta de Tratamento</strong> — perguntar se a cliente deseja realizar algum tratamento de acordo com a necessidade identificada.</p>
<blockquote>"A senhora gostaria de fazer um tratamento de [hidratação/nutrição/reconstrução] de acordo com a necessidade do seu cabelo?"</blockquote>
<p><strong>8. Informar os Produtos e Experiência Sensorial</strong> — informar todos os produtos que serão utilizados e deixar a cliente sentir o cheiro.</p>
<p><strong>9. Execução da Higienização</strong></p>
<ul style="${CHECK}">
  <li>☐ Verificar a temperatura da água (morna, agradável).</li>
  <li>☐ Soltar um pouco o cabelo da raiz e desembaraçar suavemente.</li>
  <li>☐ Aplicar o 1º shampoo, emulsionar bem e enxaguar completamente.</li>
  <li>☐ Aplicar o 2º shampoo + massagem no couro cabeludo por 3 minutos.</li>
  <li>☐ Enxaguar completamente.</li>
  <li>☐ Aguardar o tempo de pausa recomendado pela marca.</li>
  <li>☐ Aplicar o condicionador no comprimento e nas pontas, evitando a raiz.</li>
  <li>☐ Aguardar o tempo recomendado pela marca.</li>
  <li>☐ Enxaguar completamente, sem deixar resíduos.</li>
</ul>
<div style="${BOX}">
  <p style="margin:0">Para babyliss, <strong>não aplicar condicionador ou máscara na raiz</strong> e evitar excesso no comprimento. Cabelo pesado demais não segura o cacho.</p>
</div>
<p><strong>10. Finalização da Higienização</strong> — fazer a touca com a toalha e conduzir a cliente até a cadeira.</p>

<h3>PARTE C — Definição do Babyliss e Preparação</h3>
<p><strong>11. Preparação da Cliente</strong></p>
<ul style="${CHECK}">
  <li>☐ Ajudar a cliente a se sentar confortavelmente.</li>
  <li>☐ Remover a touca de toalha.</li>
  <li>☐ Secar com a toalha, retirando o excesso de água (pressionar, nunca esfregar).</li>
  <li>☐ Colocar a capa de proteção.</li>
  <li>☐ Colocar o robe ou avental.</li>
</ul>
<p><strong>12. Verificar Como a Cliente Gosta e Como Quer o Babyliss</strong> — antes de qualquer produto ou ferramenta, alinhar exatamente o resultado esperado.</p>
<ul style="${CHECK}">
  <li>☐ Perguntar o tamanho do cacho desejado (aberto, médio ou bem marcado).</li>
  <li>☐ Perguntar se prefere o resultado mais solto e natural ou mais definido.</li>
  <li>☐ Perguntar o lado da repartição.</li>
  <li>☐ Perguntar o volume desejado na raiz.</li>
  <li>☐ Perguntar se quer as pontas cacheadas ou mais retas.</li>
  <li>☐ Observar a foto de referência, quando houver.</li>
  <li>☐ Confirmar em voz alta o que será feito, antes de começar.</li>
</ul>
<blockquote>"A senhora prefere o cacho mais aberto e natural, ou mais marcado?"</blockquote>
<blockquote>"Então vamos fazer [descrever o resultado], com a repartição do lado [X] e volume [natural/médio/alto]. É isso mesmo?"</blockquote>
<table style="${TBL}">
  <tr><th style="${TH}">Resultado desejado</th><th style="${TH}">Diâmetro da ponteira</th><th style="${TH}">Observação</th></tr>
  <tr><td style="${TD}">Ondas soltas e naturais</td><td style="${TD}">Maior</td><td style="${TD}">Mechas mais grossas, movimento leve</td></tr>
  <tr><td style="${TD}">Cachos médios</td><td style="${TD}">Médio</td><td style="${TD}">Mechas médias e uniformes</td></tr>
  <tr><td style="${TD}">Cachos bem marcados</td><td style="${TD}">Menor</td><td style="${TD}">Mechas finas, exige mais tempo</td></tr>
  <tr><td style="${TD}">Efeito praia / desconstruído</td><td style="${TD}">Maior</td><td style="${TD}">Alternar o sentido e deixar as pontas livres</td></tr>
</table>
<p><strong>13. Aplicação dos Produtos</strong></p>
<ul style="${CHECK}">
  <li>☐ Desembaraçar com pente de dentes largos, das pontas para a raiz.</li>
  <li>☐ Aplicar o <strong>protetor térmico</strong> em todo o comprimento — <strong>obrigatório</strong>.</li>
  <li>☐ Aplicar leave-in, mousse ou modelador conforme o resultado desejado.</li>
  <li>☐ Distribuir bem o produto, mecha a mecha.</li>
  <li>☐ Não exagerar na quantidade — excesso pesa e desmancha o cacho.</li>
  <li>☐ Evitar produto na raiz quando o objetivo for volume.</li>
</ul>
<p><strong>14. Secagem Completa</strong> — <strong>o babyliss só pode ser usado com o cabelo 100% seco.</strong></p>
<ul style="${CHECK}">
  <li>☐ Secar completamente o cabelo com o secador.</li>
  <li>☐ Direcionar o ar da raiz para as pontas.</li>
  <li>☐ Conferir se não restou nenhuma mecha úmida, principalmente na nuca.</li>
</ul>
<p><strong>15. Penteia e alinha o cabelo</strong> — pentear, definir a repartição combinada e separar o cabelo em seções com presilhas, de baixo para cima.</p>

<h3>PARTE D — Execução do Babyliss</h3>
<p><strong>16. Ajuste da Ferramenta</strong></p>
<ul style="${CHECK}">
  <li>☐ Selecionar o diâmetro da ponteira conforme o resultado combinado.</li>
  <li>☐ Ajustar a temperatura conforme a condição do fio.</li>
  <li>☐ Aguardar o aquecimento completo antes de iniciar.</li>
  <li>☐ Testar em uma mecha da nuca antes de trabalhar as áreas visíveis.</li>
  <li>☐ Perguntar à cliente se a temperatura está agradável.</li>
</ul>
<table style="${TBL}">
  <tr><th style="${TH}">Condição do fio</th><th style="${TH}">Temperatura recomendada</th></tr>
  <tr><td style="${TD}">Cabelo virgem, grosso e resistente</td><td style="${TD}">Alta</td></tr>
  <tr><td style="${TD}">Cabelo com coloração, saudável</td><td style="${TD}">Média</td></tr>
  <tr><td style="${TD}">Cabelo fino</td><td style="${TD}">Baixa a média</td></tr>
  <tr><td style="${TD}">Cabelo descolorido, sensibilizado ou quebradiço</td><td style="${TD}">Baixa</td></tr>
</table>
<p><strong>17. Execução por Seções</strong></p>
<ul style="${CHECK}">
  <li>☐ Trabalhar mecha a mecha, começando pela nuca e subindo.</li>
  <li>☐ Manter as demais seções presas com presilhas.</li>
  <li>☐ <strong>Manter a espessura das mechas uniforme</strong> — mechas desiguais geram cachos desiguais.</li>
  <li>☐ Pentear cada mecha antes de enrolar.</li>
  <li>☐ Não iniciar a ponteira colada à raiz.</li>
  <li>☐ Enrolar a mecha no sentido combinado.</li>
  <li>☐ Não sobrepor o cabelo sobre si mesmo na ponteira.</li>
  <li>☐ Respeitar o tempo de permanência — contar os segundos, sempre igual em todas as mechas.</li>
  <li>☐ Soltar a mecha com cuidado, preservando o formato do cacho.</li>
  <li>☐ Conferir a simetria entre os dois lados durante a execução.</li>
</ul>
<div style="${BOX}">
  <div style="${BOXH}">Dois pontos que definem a durabilidade</div>
  <p style="margin:0"><strong>Tempo igual em todas as mechas:</strong> contar os segundos. Mechas com tempos diferentes resultam em cachos com formatos e durações diferentes.</p>
  <p style="margin:8px 0 0"><strong>Prender o cacho enquanto esfria:</strong> ao soltar da ponteira, enrolar o cacho sobre si mesmo e prender com presilha até esfriar por completo. É ao esfriar que o fio fixa o formato — essa é a diferença entre um babyliss que dura horas e um que dura o dia inteiro.</p>
</div>
<p><strong>18. Alternância do Sentido</strong> — para um resultado mais natural, alternar o sentido do enrolamento entre as mechas. Para um resultado mais uniforme e alinhado, manter todas no mesmo sentido. <strong>Definir isso com a cliente antes de começar.</strong></p>

<h3>PARTE E — Abertura, Acabamento e Fixação</h3>
<p><strong>19. Abertura dos Cachos</strong></p>
<ul style="${CHECK}">
  <li>☐ <strong>Aguardar todos os cachos esfriarem completamente</strong> antes de soltar as presilhas.</li>
  <li>☐ Soltar as presilhas com cuidado.</li>
  <li>☐ Abrir e afrouxar os cachos com os dedos, conforme o resultado desejado.</li>
  <li>☐ Não pentear os cachos quando a cliente quiser um resultado definido.</li>
  <li>☐ Usar escova ou pente apenas quando o resultado desejado for bem solto.</li>
  <li>☐ Ajustar o volume da raiz.</li>
</ul>
<p><strong>20. Acabamento Final</strong></p>
<ul style="${CHECK}">
  <li>☐ Ajustar a repartição conforme combinado.</li>
  <li>☐ Verificar se não há mechas sem cacho.</li>
  <li>☐ Verificar a uniformidade dos cachos.</li>
  <li>☐ Verificar a simetria entre os dois lados.</li>
  <li>☐ Verificar frizz e fios armados.</li>
  <li>☐ Aplicar óleo ou sérum nas pontas, com moderação.</li>
  <li>☐ Aplicar spray fixador à distância, sem encharcar.</li>
</ul>
<blockquote>"Vou aplicar um fixador para os cachos durarem mais. A senhora prefere uma fixação mais leve ou mais firme?"</blockquote>

<h3>PARTE F — Validação e Encerramento</h3>
<p><strong>21. Validação da Cliente</strong> — apresentar o resultado e perguntar obrigatoriamente:</p>
<blockquote>"A senhora gostou do resultado?"</blockquote>
<blockquote>"Existe algum detalhe que gostaria que ajustássemos?"</blockquote>
<p>Utilizar o espelho de mão para mostrar a parte de trás e as laterais. <strong>Caso a cliente solicite qualquer ajuste, este deverá ser realizado imediatamente.</strong> O atendimento somente poderá ser encerrado após a aprovação da cliente.</p>
<p><strong>22. Orientações de Manutenção</strong></p>
<ul style="${CHECK}">
  <li>☐ Explicar quanto tempo os cachos tendem a durar.</li>
  <li>☐ Orientar a passar a mão o mínimo possível.</li>
  <li>☐ Orientar sobre umidade, chuva e transpiração.</li>
  <li>☐ Orientar como dormir para preservar o formato.</li>
  <li>☐ Oferecer os produtos utilizados para venda.</li>
  <li>☐ Oferecer o reagendamento.</li>
</ul>
<blockquote>"Para durar mais, evite passar a mão no cabelo e umidade. Gostaria de já deixar seu próximo horário agendado?"</blockquote>
<p><strong>23. Encerramento</strong></p>
<ul>
  <li><strong>Se o babyliss for o último serviço:</strong> retirar a capa, agradecer a preferência e acompanhar a cliente até a recepção.</li>
  <li><strong>Se houver outro procedimento na sequência:</strong> chamar o profissional principal, informando nome da cliente, procedimentos agendados, produtos utilizados e observações sobre o cabelo.</li>
</ul>
<blockquote>"Foi um prazer atender você, (Nome)! Espero vê-la em breve."</blockquote>

<h3>PARTE G — Organização Pós-Atendimento</h3>
<p><strong>24. Limpeza e Registro</strong></p>
<ul style="${CHECK}">
  <li>☐ Desligar o babyliss da tomada.</li>
  <li>☐ Aguardar o resfriamento antes de guardar.</li>
  <li>☐ Limpar a ponteira, as escovas e os pentes.</li>
  <li>☐ Recolher os cabelos do chão e da cadeira.</li>
  <li>☐ Higienizar a estação.</li>
  <li>☐ Guardar os produtos corretamente.</li>
  <li>☐ Registrar o serviço e os produtos no sistema.</li>
  <li>☐ Registrar os produtos vendidos (se houver).</li>
</ul>

<h2>8. Indicadores de Qualidade</h2>
<p>A gerência deverá acompanhar mensalmente:</p>
<ul style="${CHECK}">
  <li>☐ Tempo médio de babyliss.</li>
  <li>☐ Número de retrabalhos (cliente pediu ajuste após finalizar).</li>
  <li>☐ Número de reclamações sobre durabilidade dos cachos.</li>
  <li>☐ Índice de satisfação da cliente.</li>
  <li>☐ Percentual de reagendamento.</li>
  <li>☐ Conversão de babyliss em tratamento capilar.</li>
  <li>☐ Vendas de finalizadores e fixadores.</li>
  <li>☐ Uso do protetor térmico em 100% dos atendimentos.</li>
</ul>

<h2>9. Checklist de Auditoria</h2>
<div style="${BOX}">
  <div style="${BOXH}">Apresentação</div>
  <ul style="${CHECK}">
    <li>☐ Apresentou-se de frente para a cliente, com nome.</li>
    <li>☐ Confirmou o serviço (babyliss).</li>
    <li>☐ Perguntou o que a cliente desejava.</li>
    <li>☐ Perguntou se havia preferência ou referência.</li>
    <li>☐ Fez as ponderações do que dá e do que não dá para fazer.</li>
    <li>☐ Verificou se a cliente já veio com o cabelo limpo.</li>
  </ul>
  <div style="${BOXH}">Lavatório (quando aplicável)</div>
  <ul style="${CHECK}">
    <li>☐ Realizou avaliação capilar e informou as necessidades.</li>
    <li>☐ Perguntou se deseja tratamento.</li>
    <li>☐ Informou os produtos e deixou sentir o cheiro.</li>
    <li>☐ Aplicou o 1º shampoo.</li>
    <li>☐ Aplicou o 2º shampoo + massagem de 3 minutos.</li>
    <li>☐ Respeitou os tempos de pausa.</li>
    <li>☐ Aplicou o condicionador sem pesar o fio.</li>
  </ul>
  <div style="${BOXH}">Definição e Preparação</div>
  <ul style="${CHECK}">
    <li>☐ Perguntou o tamanho do cacho desejado.</li>
    <li>☐ Perguntou se queria mais solto ou mais definido.</li>
    <li>☐ Perguntou o lado da repartição e o volume.</li>
    <li>☐ Confirmou em voz alta o que seria feito.</li>
    <li>☐ Aplicou o protetor térmico.</li>
    <li>☐ Secou o cabelo 100% antes da ferramenta.</li>
    <li>☐ Penteou, definiu a repartição e separou em seções.</li>
  </ul>
  <div style="${BOXH}">Execução</div>
  <ul style="${CHECK}">
    <li>☐ Selecionou o diâmetro correto da ponteira.</li>
    <li>☐ Ajustou a temperatura à condição do fio.</li>
    <li>☐ Testou em uma mecha da nuca.</li>
    <li>☐ Trabalhou mecha a mecha, da nuca para cima.</li>
    <li>☐ Manteve a espessura das mechas uniforme.</li>
    <li>☐ Enrolou no sentido combinado.</li>
    <li>☐ Manteve o mesmo tempo de permanência em todas as mechas.</li>
    <li>☐ Prendeu os cachos com presilha para esfriar.</li>
    <li>☐ Não encostou a ponteira no couro cabeludo.</li>
    <li>☐ Apoiou o babyliss em base térmica.</li>
    <li>☐ Conferiu a simetria durante a execução.</li>
  </ul>
  <div style="${BOXH}">Acabamento e Finalização</div>
  <ul style="${CHECK}">
    <li>☐ Aguardou os cachos esfriarem antes de soltar as presilhas.</li>
    <li>☐ Abriu os cachos com os dedos.</li>
    <li>☐ Verificou uniformidade, simetria e mechas sem cacho.</li>
    <li>☐ Aplicou o fixador à distância.</li>
    <li>☐ Mostrou o resultado com o espelho de mão.</li>
    <li>☐ Perguntou se a cliente gostou e se havia ajustes.</li>
    <li>☐ Realizou os ajustes imediatamente.</li>
    <li>☐ Orientou sobre a manutenção e ofereceu reagendamento.</li>
    <li>☐ Organizou a estação e registrou no sistema.</li>
  </ul>
</div>
`.trim()

const PRO_PENTEADO_HTML = `
<h1>Procedimento Operacional Padrão (POP)</h1>
<p style="color:#6b6880;font-size:15px;margin:-4px 0 16px;font-weight:600">POP-PRO-011 — Penteado</p>

<h2>1. Identificação</h2>
<div style="${META}">
  <p style="margin:0"><strong>Código:</strong> POP-PRO-011 &nbsp;·&nbsp; <strong>Versão:</strong> 1.0 &nbsp;·&nbsp; <strong>Setor:</strong> Profissionais (Cabeleireiro / Assistente)</p>
  <p style="margin:8px 0 0"><strong>Responsável:</strong> <span style="${FIELD}"></span></p>
  <p style="margin:8px 0 0"><strong>Data de Emissão:</strong> ___/___/______ &nbsp;·&nbsp; <strong>Última Revisão:</strong> ___/___/______ &nbsp;·&nbsp; <strong>Próxima Revisão:</strong> ___/___/______</p>
</div>

<h2>2. Objetivo</h2>
<p>Padronizar o serviço de <strong>penteado</strong>, garantindo o entendimento exato do resultado desejado, a correta orientação do assistente durante toda a preparação, a construção de uma base adequada, firmeza e durabilidade do penteado, conforto da cliente e acompanhamento até a saída do salão.</p>

<h2>3. Campo de Aplicação</h2>
<p>Este procedimento aplica-se ao profissional responsável pelo penteado e ao assistente que auxilia na preparação e no acompanhamento.</p>

<h2>4. Fluxo do Atendimento</h2>
<div style="${BOX}">
  <div style="${BOXH}">Atenção à composição da equipe</div>
  <p style="margin:0"><strong>Sem assistente:</strong> o profissional executa todas as etapas e segue direto para o lavatório (PARTE C).</p>
  <p style="margin:8px 0 0"><strong>Com assistente:</strong> o profissional deve <strong>orientar o assistente antes de iniciar</strong> (PARTE B) — como quer a preparação e qual produto será utilizado em todo o processo, do lavatório até a preparação final.</p>
</div>

<h2>5. Responsabilidades</h2>
<h3>Profissional Responsável pelo Penteado</h3>
<ul>
  <li>Cumprir integralmente este POP.</li>
  <li>Alinhar com a cliente o resultado desejado antes de iniciar.</li>
  <li>Fazer as ponderações do que é possível e do que não é recomendado.</li>
  <li>Orientar o assistente sobre a preparação e os produtos.</li>
  <li>Executar o penteado.</li>
  <li>Garantir firmeza, simetria e conforto.</li>
  <li>Validar o resultado com a cliente.</li>
</ul>
<h3>Assistente</h3>
<ul>
  <li>Seguir exatamente a orientação do profissional responsável.</li>
  <li>Utilizar apenas os produtos indicados por ele.</li>
  <li>Executar o lavatório e a preparação conforme orientado.</li>
  <li>Comunicar ao profissional qualquer alteração ou dificuldade.</li>
  <li><strong>Permanecer no salão até a cliente ir embora</strong>, auxiliando no que for necessário.</li>
</ul>
<h3>Gerência</h3>
<ul>
  <li>Fiscalizar o cumprimento deste POP.</li>
  <li>Garantir a escala de assistentes para os atendimentos de penteado.</li>
  <li>Treinar continuamente a equipe.</li>
</ul>

<h2>6. Materiais Necessários</h2>
<h3>Equipamentos</h3>
<ul style="${CHECK}">
  <li>☐ Secador com bico direcionador.</li>
  <li>☐ Babyliss / modelador (quando necessário).</li>
  <li>☐ Prancha (quando necessário).</li>
  <li>☐ Escovas e pentes de dentes finos (para texturizar).</li>
  <li>☐ Presilhas para separar as mechas.</li>
  <li>☐ Grampos e ganchos em quantidade suficiente.</li>
  <li>☐ Elásticos.</li>
  <li>☐ Tela ou rede (quando necessário).</li>
  <li>☐ Enchimento ou base (quando necessário).</li>
  <li>☐ Base térmica para apoiar as ferramentas.</li>
  <li>☐ Toalhas limpas, capa de proteção e robe.</li>
  <li>☐ Espelho de mão.</li>
</ul>
<h3>Produtos</h3>
<ul style="${CHECK}">
  <li>☐ Shampoo 1 e Shampoo 2.</li>
  <li>☐ Condicionador.</li>
  <li>☐ <strong>Protetor térmico</strong> (obrigatório quando houver ferramenta térmica).</li>
  <li>☐ Leave-in.</li>
  <li>☐ Mousse ou spray texturizador.</li>
  <li>☐ Pomada, cera ou pasta modeladora.</li>
  <li>☐ Spray fixador.</li>
  <li>☐ Spray de brilho.</li>
</ul>

<h2>7. Higiene e Segurança</h2>
<h3>Antes do Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Higienizar corretamente as mãos.</li>
  <li>☐ Manter uniforme limpo e cabelos presos.</li>
  <li>☐ Conferir a limpeza da estação.</li>
  <li>☐ Higienizar escovas e pentes entre as clientes.</li>
  <li>☐ Separar grampos e elásticos limpos, em quantidade suficiente.</li>
  <li>☐ Verificar o estado dos equipamentos térmicos.</li>
  <li>☐ Organizar todos os produtos e verificar a validade.</li>
</ul>
<h3>Durante o Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Manter a estação organizada.</li>
  <li>☐ Não utilizar telefone celular.</li>
  <li>☐ Não consumir alimentos.</li>
  <li>☐ Não usar ferramenta térmica em cabelo úmido nem sem protetor térmico.</li>
  <li>☐ Nunca encostar a ferramenta quente no couro cabeludo, no rosto ou nas orelhas.</li>
  <li>☐ Apoiar as ferramentas em base térmica.</li>
  <li>☐ <strong>Não deixar grampos na boca</strong> — utilizar sempre um recipiente ou pulseira porta-grampos.</li>
  <li>☐ Perguntar à cliente, ao longo do processo, se algum ponto está apertando ou incomodando.</li>
</ul>
<h3>Após o Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Desligar os equipamentos e aguardar o resfriamento.</li>
  <li>☐ Limpar escovas, pentes e ferramentas.</li>
  <li>☐ Recolher grampos e elásticos do chão e da bancada.</li>
  <li>☐ Recolher os cabelos do chão e da cadeira.</li>
  <li>☐ Higienizar a estação e as mãos.</li>
  <li>☐ Preparar a estação para a próxima cliente.</li>
</ul>

<h2>8. Procedimento Operacional</h2>

<h3>PARTE A — Início do Atendimento</h3>
<p><strong>1. Apresentação do Profissional</strong> — sempre iniciar o atendimento de frente para a cliente, demonstrando simpatia, cordialidade e profissionalismo.</p>
<blockquote>"Olá (Nome da cliente), meu nome é (Nome do Profissional) e hoje eu serei o(a) responsável pelo seu atendimento."</blockquote>
<p><strong>2. Confirmação do Serviço</strong></p>
<blockquote>"A senhora irá fazer um penteado hoje, correto?"</blockquote>
<p><strong>3. Identificação da Necessidade</strong></p>
<blockquote>"O que a senhora pensou para hoje?" · "A senhora possui alguma preferência ou alguma foto de referência?"</blockquote>
<p><strong>Perguntas específicas do penteado:</strong></p>
<ul style="${CHECK}">
  <li>☐ Qual é a ocasião?</li>
  <li>☐ Quantas horas o penteado precisa durar?</li>
  <li>☐ Vai usar algum acessório, véu ou tiara?</li>
  <li>☐ Como é o decote ou a gola da roupa?</li>
  <li>☐ Prefere o penteado preso, semipreso ou solto?</li>
  <li>☐ Prefere um resultado mais estruturado ou mais desconstruído?</li>
</ul>
<blockquote>"Para qual ocasião é o penteado, e por quantas horas a senhora precisa que ele dure?"</blockquote>
<blockquote>"A senhora vai usar véu, tiara ou algum acessório? Se sim, precisamos deixar a base preparada para ele."</blockquote>
<p><strong>4. Ponderações e Orientações</strong> — após ouvir atentamente a cliente, explicar de forma clara e profissional:</p>
<ul style="${CHECK}">
  <li>☐ O que é possível realizar.</li>
  <li>☐ O que não é recomendado realizar.</li>
  <li>☐ As limitações técnicas (comprimento, densidade, textura e condição do fio).</li>
  <li>☐ Se será necessário enchimento, aplique ou acessório para chegar ao resultado.</li>
  <li>☐ Quanto tempo o penteado tende a durar.</li>
</ul>
<blockquote>"Baseado no que a senhora deseja, é possível fazer [explicar o que dá para fazer]."</blockquote>
<blockquote>"Não recomendamos [explicar o que não é recomendado] porque [explicar o motivo]."</blockquote>
<div style="${BOX}">
  <p style="margin:0">Quando a referência não for possível no cabelo da cliente, <strong>explicar o motivo e apresentar uma alternativa antes de iniciar</strong>. Penteado é o serviço em que a frustração aparece só no final — o alinhamento tem que ser feito no começo.</p>
</div>
<p><strong>Nenhum procedimento deverá ser iniciado antes que a cliente compreenda e concorde com o resultado que será realizado.</strong></p>

<h3>PARTE B — Orientação ao Assistente</h3>
<p style="color:#6b6880"><em>Executar somente quando houver assistente. Sem assistente, seguir direto para a PARTE C.</em></p>
<p><strong>5. Briefing do Assistente</strong> — antes de a cliente ir para o lavatório, o profissional responsável deverá orientar o assistente sobre <strong>toda a preparação</strong>, do lavatório até a entrega na cadeira.</p>
<ul style="${CHECK}">
  <li>☐ Informar qual é o penteado que será executado.</li>
  <li>☐ Informar quais produtos utilizar no lavatório.</li>
  <li>☐ Informar se deve ou não aplicar condicionador, e onde.</li>
  <li>☐ Informar quais produtos finalizadores aplicar e em qual quantidade.</li>
  <li>☐ Informar como quer a preparação: secagem, modelagem ou babyliss.</li>
  <li>☐ Informar o sentido, o volume e a repartição desejados.</li>
  <li>☐ Informar se o cabelo deve ficar mais liso ou mais texturizado.</li>
  <li>☐ Informar o que <strong>não</strong> deve ser feito.</li>
  <li>☐ Confirmar se o assistente entendeu antes de liberar.</li>
</ul>
<blockquote>"Vamos fazer um [penteado]. No lavatório, usa o [shampoo] e o [condicionador] só no comprimento — não pode pesar a raiz. Depois seca com [produto] e faz [modelagem/babyliss] no sentido [X]. Qualquer dúvida, me chama antes de continuar."</blockquote>
<div style="${BOX}">
  <p style="margin:0"><strong>O assistente não decide produto nem preparação por conta própria.</strong> Toda alteração deve ser comunicada ao profissional responsável antes de ser executada.</p>
</div>

<h3>PARTE C — Higienização no Lavatório</h3>
<p><strong>6. Avaliação do Cabelo e Informação das Necessidades</strong></p>
<ul style="${CHECK}">
  <li>☐ Observar o estado geral do cabelo.</li>
  <li>☐ Verificar o tipo de cabelo (liso, ondulado, cacheado, crespo).</li>
  <li>☐ Verificar a porosidade e a densidade do fio.</li>
  <li>☐ Verificar se há ressecamento, danos ou pontas duplas.</li>
  <li>☐ Verificar se há química.</li>
  <li>☐ Verificar o couro cabeludo (oleosidade, caspa, sensibilidade).</li>
  <li>☐ Informar à cliente as necessidades identificadas.</li>
</ul>
<p><strong>7. Oferta de Tratamento</strong> — perguntar se a cliente deseja realizar algum tratamento de acordo com a necessidade identificada.</p>
<blockquote>"A senhora gostaria de fazer um tratamento de [hidratação/nutrição/reconstrução] de acordo com a necessidade do seu cabelo?"</blockquote>
<p><strong>8. Informar os Produtos e Experiência Sensorial</strong> — informar todos os produtos que serão utilizados e deixar a cliente sentir o cheiro.</p>
<p><strong>9. Execução da Higienização</strong></p>
<ul style="${CHECK}">
  <li>☐ Verificar a temperatura da água (morna, agradável).</li>
  <li>☐ Soltar um pouco o cabelo da raiz e desembaraçar suavemente.</li>
  <li>☐ Aplicar o 1º shampoo, emulsionar bem e enxaguar completamente.</li>
  <li>☐ Aplicar o 2º shampoo + massagem no couro cabeludo por 3 minutos.</li>
  <li>☐ Enxaguar completamente.</li>
  <li>☐ Aguardar o tempo de pausa recomendado pela marca.</li>
  <li>☐ Aplicar o condicionador conforme a orientação do profissional responsável.</li>
  <li>☐ Aguardar o tempo recomendado pela marca.</li>
  <li>☐ Enxaguar completamente, sem deixar resíduos.</li>
</ul>
<div style="${BOX}">
  <p style="margin:0">Para penteado, <strong>não aplicar condicionador ou máscara na raiz</strong>. Cabelo escorregadio não segura grampo e o penteado cai. Quando o profissional indicar, o condicionador deve ser aplicado somente nas pontas — ou dispensado.</p>
</div>
<p><strong>10. Finalização da Higienização</strong> — fazer a touca com a toalha e conduzir a cliente até a cadeira.</p>

<h3>PARTE D — Preparação da Base</h3>
<p><strong>11. Preparação da Cliente</strong></p>
<ul style="${CHECK}">
  <li>☐ Ajudar a cliente a se sentar confortavelmente.</li>
  <li>☐ Remover a touca de toalha.</li>
  <li>☐ Secar com a toalha, retirando o excesso de água (pressionar, nunca esfregar).</li>
  <li>☐ Colocar a capa de proteção.</li>
  <li>☐ Colocar o robe ou avental.</li>
</ul>
<p><strong>12. Aplicação dos Produtos Finalizadores</strong> — conforme a orientação do profissional responsável.</p>
<ul style="${CHECK}">
  <li>☐ Desembaraçar com pente de dentes largos, das pontas para a raiz.</li>
  <li>☐ Aplicar o protetor térmico quando houver ferramenta térmica.</li>
  <li>☐ Aplicar mousse, texturizador ou leave-in conforme o penteado.</li>
  <li>☐ Distribuir bem o produto, mecha a mecha.</li>
</ul>
<p><strong>13. Penteia e alinha o cabelo</strong> — pentear, alinhar e definir a repartição.</p>
<p><strong>14. Modelagem ou Secagem</strong> — executar conforme o penteado escolhido (POP-PRO-007 ou POP-PRO-008), no sentido e volume orientados.</p>
<p><strong>15. Babyliss (quando necessário)</strong> — executar conforme o POP-PRO-010, para dar textura e sustentação ao penteado.</p>
<ul style="${CHECK}">
  <li>☐ Conferir se o cabelo está 100% seco.</li>
  <li>☐ Aguardar o cabelo esfriar completamente antes de iniciar o penteado.</li>
</ul>
<div style="${BOX}">
  <p style="margin:0"><strong>Cabelo quente não segura penteado.</strong> É preciso esperar esfriar por completo antes de começar a montar — caso contrário, o penteado cede nas primeiras horas.</p>
</div>

<h3>PARTE E — Execução do Penteado</h3>
<p><strong>16. Definição da Estrutura</strong></p>
<ul style="${CHECK}">
  <li>☐ Confirmar em voz alta o penteado que será executado.</li>
  <li>☐ Definir a repartição e o ponto de apoio do penteado.</li>
  <li>☐ Separar o cabelo em seções com presilhas.</li>
  <li>☐ Posicionar o enchimento ou a base, quando houver.</li>
  <li>☐ Posicionar o acessório ou o véu na altura combinada, antes de fechar a estrutura.</li>
</ul>
<p><strong>17. Montagem</strong></p>
<ul style="${CHECK}">
  <li>☐ Texturizar as mechas quando o penteado exigir sustentação.</li>
  <li>☐ Montar por seções, fixando cada parte antes de passar para a próxima.</li>
  <li>☐ Utilizar grampos na quantidade necessária, sempre escondidos.</li>
  <li>☐ Cruzar os grampos nos pontos de maior sustentação.</li>
  <li>☐ Testar a firmeza de cada seção antes de seguir.</li>
  <li>☐ Conferir a simetria entre os dois lados durante a execução.</li>
  <li>☐ Verificar o resultado de todos os ângulos: frente, laterais e nuca.</li>
  <li>☐ Perguntar à cliente se algum ponto está apertando.</li>
  <li>☐ Mostrar o andamento à cliente em pontos-chave, antes de finalizar.</li>
</ul>
<blockquote>"Está apertando em algum ponto? Se estiver, me avise agora, que eu ajusto."</blockquote>
<blockquote>"Olha como está ficando por aqui. É essa a ideia que a senhora tinha?"</blockquote>
<div style="${BOX}">
  <p style="margin:0"><strong>Consultar a cliente durante a execução, não só no final.</strong> Refazer um penteado inteiro custa muito mais caro do que ajustar no meio do caminho.</p>
</div>

<h3>PARTE F — Acabamento, Fixação e Validação</h3>
<p><strong>18. Acabamento</strong></p>
<ul style="${CHECK}">
  <li>☐ Ajustar os fios soltos conforme o resultado desejado.</li>
  <li>☐ Verificar se não há grampo aparecendo.</li>
  <li>☐ Verificar se não há falhas ou pontos irregulares.</li>
  <li>☐ Conferir a simetria e o caimento.</li>
  <li>☐ Ajustar o acessório ou o véu.</li>
  <li>☐ Aplicar spray de brilho, quando desejado.</li>
</ul>
<p><strong>19. Fixação</strong></p>
<ul style="${CHECK}">
  <li>☐ Aplicar o fixador em camadas, à distância.</li>
  <li>☐ Não encharcar o penteado.</li>
  <li>☐ Proteger o rosto da cliente ao aplicar.</li>
  <li>☐ Reforçar a fixação nos pontos de maior movimento.</li>
</ul>
<p><strong>20. Validação da Cliente</strong> — apresentar o resultado e perguntar obrigatoriamente:</p>
<blockquote>"A senhora gostou do resultado?"</blockquote>
<blockquote>"Existe algum detalhe que gostaria que ajustássemos?"</blockquote>
<blockquote>"Está confortável? Não está apertando em nenhum lugar?"</blockquote>
<p>Utilizar o espelho de mão para mostrar a parte de trás e as laterais. <strong>Caso a cliente solicite qualquer ajuste, este deverá ser realizado imediatamente.</strong> O atendimento somente poderá ser encerrado após a aprovação da cliente.</p>

<h3>PARTE G — Acompanhamento e Encerramento</h3>
<p><strong>21. Permanência do Assistente</strong> — o assistente deverá <strong>permanecer no salão até a cliente ir embora</strong>, disponível para:</p>
<ul style="${CHECK}">
  <li>☐ Auxiliar em ajustes de última hora.</li>
  <li>☐ Ajudar a cliente a vestir a roupa sem desmanchar o penteado.</li>
  <li>☐ Auxiliar na colocação do véu ou do acessório.</li>
  <li>☐ Retocar a fixação, se necessário.</li>
  <li>☐ Acompanhar a cliente até a recepção.</li>
</ul>
<p><strong>22. Orientações de Manutenção</strong></p>
<ul style="${CHECK}">
  <li>☐ Explicar como preservar o penteado ao longo do evento.</li>
  <li>☐ Orientar sobre o que evitar (passar a mão, umidade, vento).</li>
  <li>☐ Entregar alguns grampos extras à cliente.</li>
  <li>☐ Oferecer o fixador para retoque.</li>
  <li>☐ Oferecer o reagendamento.</li>
</ul>
<blockquote>"Vou te dar alguns grampos extras, caso precise de um retoque durante o evento."</blockquote>
<p><strong>23. Encerramento</strong> — retirar a capa com cuidado para não desmanchar o penteado, agradecer a preferência e acompanhar a cliente até a recepção.</p>
<blockquote>"Foi um prazer atender você, (Nome)! Aproveite muito o seu dia."</blockquote>

<h3>PARTE H — Organização Pós-Atendimento</h3>
<p><strong>24. Limpeza e Registro</strong></p>
<ul style="${CHECK}">
  <li>☐ Desligar os equipamentos e aguardar o resfriamento.</li>
  <li>☐ Limpar as escovas, os pentes e as ferramentas.</li>
  <li>☐ Recolher grampos e elásticos do chão e da bancada.</li>
  <li>☐ Recolher os cabelos do chão e da cadeira.</li>
  <li>☐ Higienizar a estação.</li>
  <li>☐ Guardar os produtos corretamente.</li>
  <li>☐ Registrar o serviço e os produtos no sistema.</li>
  <li>☐ Registrar o penteado executado para consulta em atendimentos futuros.</li>
</ul>

<h2>9. Indicadores de Qualidade</h2>
<p>A gerência deverá acompanhar mensalmente:</p>
<ul style="${CHECK}">
  <li>☐ Tempo médio de penteado.</li>
  <li>☐ Número de retrabalhos (penteado refeito).</li>
  <li>☐ Número de reclamações sobre durabilidade ou desconforto.</li>
  <li>☐ Índice de satisfação da cliente.</li>
  <li>☐ Cumprimento da orientação ao assistente.</li>
  <li>☐ Permanência do assistente até a saída da cliente.</li>
  <li>☐ Percentual de reagendamento.</li>
  <li>☐ Vendas de produtos de fixação.</li>
</ul>

<h2>10. Checklist de Auditoria</h2>
<div style="${BOX}">
  <div style="${BOXH}">Apresentação</div>
  <ul style="${CHECK}">
    <li>☐ Apresentou-se de frente para a cliente, com nome.</li>
    <li>☐ Confirmou o serviço (penteado).</li>
    <li>☐ Perguntou o que a cliente desejava.</li>
    <li>☐ Perguntou se havia preferência ou referência.</li>
    <li>☐ Perguntou a ocasião e a duração necessária.</li>
    <li>☐ Perguntou sobre acessório, véu e decote da roupa.</li>
    <li>☐ Fez as ponderações do que dá e do que não dá para fazer.</li>
  </ul>
  <div style="${BOXH}">Orientação ao Assistente (quando houver)</div>
  <ul style="${CHECK}">
    <li>☐ Informou qual penteado seria executado.</li>
    <li>☐ Informou os produtos do lavatório.</li>
    <li>☐ Informou os produtos finalizadores e a quantidade.</li>
    <li>☐ Informou como queria a preparação (secagem, modelagem, babyliss).</li>
    <li>☐ Informou sentido, volume e repartição.</li>
    <li>☐ Informou o que não deveria ser feito.</li>
    <li>☐ Confirmou se o assistente entendeu.</li>
  </ul>
  <div style="${BOXH}">Lavatório e Preparação</div>
  <ul style="${CHECK}">
    <li>☐ Realizou avaliação capilar e informou as necessidades.</li>
    <li>☐ Perguntou se deseja tratamento.</li>
    <li>☐ Informou os produtos e deixou sentir o cheiro.</li>
    <li>☐ Aplicou o 1º e o 2º shampoo + massagem de 3 minutos.</li>
    <li>☐ Aplicou o condicionador conforme orientado, sem pesar a raiz.</li>
    <li>☐ Aplicou os finalizadores orientados.</li>
    <li>☐ Executou a secagem, modelagem ou babyliss conforme orientado.</li>
    <li>☐ Aguardou o cabelo esfriar antes de montar.</li>
  </ul>
  <div style="${BOXH}">Execução</div>
  <ul style="${CHECK}">
    <li>☐ Confirmou em voz alta o penteado a ser executado.</li>
    <li>☐ Definiu a repartição e o ponto de apoio.</li>
    <li>☐ Posicionou acessório ou véu antes de fechar a estrutura.</li>
    <li>☐ Montou por seções, fixando antes de prosseguir.</li>
    <li>☐ Manteve os grampos escondidos.</li>
    <li>☐ Testou a firmeza de cada seção.</li>
    <li>☐ Conferiu a simetria e todos os ângulos.</li>
    <li>☐ Perguntou se algum ponto estava apertando.</li>
    <li>☐ Mostrou o andamento à cliente antes de finalizar.</li>
  </ul>
  <div style="${BOXH}">Finalização e Acompanhamento</div>
  <ul style="${CHECK}">
    <li>☐ Verificou grampos aparecendo, falhas e simetria.</li>
    <li>☐ Aplicou o fixador em camadas, protegendo o rosto.</li>
    <li>☐ Mostrou o resultado com o espelho de mão.</li>
    <li>☐ Perguntou se a cliente gostou e se estava confortável.</li>
    <li>☐ Realizou os ajustes imediatamente.</li>
    <li>☐ Entregou grampos extras.</li>
    <li>☐ Orientou sobre a manutenção durante o evento.</li>
    <li>☐ O assistente permaneceu até a cliente ir embora.</li>
    <li>☐ Organizou a estação e registrou no sistema.</li>
  </ul>
</div>
`.trim()

const PRO_PIGMENTACAO_HTML = `
<h1>Procedimento Operacional Padrão (POP)</h1>
<p style="color:#6b6880;font-size:15px;margin:-4px 0 16px;font-weight:600">POP-PRO-012 — Pigmentação</p>

<h2>1. Identificação</h2>
<div style="${META}">
  <p style="margin:0"><strong>Código:</strong> POP-PRO-012 &nbsp;·&nbsp; <strong>Versão:</strong> 1.0 &nbsp;·&nbsp; <strong>Setor:</strong> Profissionais (Cabeleireiro / Assistente)</p>
  <p style="margin:8px 0 0"><strong>Responsável:</strong> <span style="${FIELD}"></span></p>
  <p style="margin:8px 0 0"><strong>Data de Emissão:</strong> ___/___/______ &nbsp;·&nbsp; <strong>Última Revisão:</strong> ___/___/______ &nbsp;·&nbsp; <strong>Próxima Revisão:</strong> ___/___/______</p>
</div>

<h2>2. Objetivo</h2>
<p>Padronizar o serviço de <strong>pigmentação</strong>, garantindo a avaliação prévia da cliente e do fio, a realização dos testes de segurança, a aplicação uniforme do produto, o cumprimento do tempo de pausa, a remoção correta, o registro da fórmula utilizada e o acompanhamento da cliente até a saída do salão.</p>

<h2>3. Campo de Aplicação</h2>
<p>Este procedimento aplica-se ao profissional responsável pela pigmentação e ao assistente que auxilia na aplicação e no acompanhamento.</p>

<h2>4. Definição da Rota</h2>
<div style="${BOX}">
  <div style="${BOXH}">Este POP tem duas rotas — definir qual será usada antes de iniciar</div>
  <p style="margin:0"><strong>ROTA A — Lavar antes da aplicação:</strong> lavatório → secagem → aplicação da pigmentação → pausa → lavatório de remoção → finalização.</p>
  <p style="margin:8px 0 0"><strong>ROTA B — Lavar depois da aplicação:</strong> preparação → aplicação da pigmentação → pausa → lavatório de remoção → finalização.</p>
  <p style="margin:8px 0 0">A escolha depende da orientação do fabricante do produto e da avaliação do profissional. <strong>Seguir sempre a instrução da marca utilizada.</strong></p>
</div>
<div style="${BOX}">
  <div style="${BOXH}">Composição da equipe</div>
  <p style="margin:0"><strong>Com assistente:</strong> o assistente aplica a tinta, sob orientação do profissional responsável.</p>
  <p style="margin:8px 0 0"><strong>Sem assistente:</strong> o próprio profissional aplica a tinta.</p>
  <p style="margin:8px 0 0">Havendo assistente, ele deverá <strong>dar suporte até a cliente ir embora</strong>.</p>
</div>

<h2>5. Responsabilidades</h2>
<h3>Profissional Responsável</h3>
<ul>
  <li>Cumprir integralmente este POP.</li>
  <li>Realizar a anamnese e os testes de segurança.</li>
  <li>Definir a fórmula, a proporção e o tempo de pausa.</li>
  <li>Orientar o assistente sobre a aplicação.</li>
  <li>Acompanhar e conferir a aplicação.</li>
  <li>Controlar o tempo de pausa.</li>
  <li>Registrar a fórmula utilizada.</li>
  <li>Validar o resultado com a cliente.</li>
</ul>
<h3>Assistente</h3>
<ul>
  <li>Aplicar a tinta conforme a orientação do profissional responsável.</li>
  <li>Não alterar produto, proporção ou tempo por conta própria.</li>
  <li>Comunicar imediatamente qualquer reação, ardência ou irregularidade.</li>
  <li><strong>Dar suporte até a cliente ir embora.</strong></li>
</ul>
<h3>Gerência</h3>
<ul>
  <li>Fiscalizar o cumprimento deste POP.</li>
  <li>Garantir a disponibilidade dos produtos e dos materiais de proteção.</li>
  <li>Treinar continuamente a equipe.</li>
  <li>Manter o registro das fórmulas e das ocorrências.</li>
</ul>

<h2>6. Materiais Necessários</h2>
<h3>Equipamentos e Materiais</h3>
<ul style="${CHECK}">
  <li>☐ Tigela e pincel de aplicação (não metálicos).</li>
  <li>☐ Balança ou medidor para a proporção correta.</li>
  <li>☐ Cronômetro ou timer (obrigatório).</li>
  <li>☐ Pente de ponta fina para as divisões.</li>
  <li>☐ Presilhas para separar as mechas.</li>
  <li>☐ <strong>Luvas para a aplicação do produto químico.</strong></li>
  <li>☐ Capa impermeável.</li>
  <li>☐ Toalhas escuras.</li>
  <li>☐ Algodão.</li>
  <li>☐ Creme de barreira para a linha do couro cabeludo.</li>
  <li>☐ Touca (quando a marca indicar).</li>
  <li>☐ Espelho de mão.</li>
  <li>☐ Ficha de registro da fórmula.</li>
</ul>
<h3>Produtos</h3>
<ul style="${CHECK}">
  <li>☐ Coloração / pigmentação.</li>
  <li>☐ Oxidante na volumagem indicada.</li>
  <li>☐ Shampoo pós-coloração (sem sal, pH ácido).</li>
  <li>☐ Condicionador.</li>
  <li>☐ Máscara ou passo a passo da linha.</li>
  <li>☐ Protetor térmico e finalizadores.</li>
  <li>☐ Removedor de mancha de pele.</li>
</ul>

<h2>7. Segurança e Cuidados</h2>
<div style="${BOX}">
  <div style="${BOXH}">Antes de qualquer aplicação</div>
  <ul style="${CHECK}">
    <li>☐ Realizar o <strong>teste de sensibilidade (teste de toque)</strong> conforme a instrução do fabricante, no prazo indicado por ele.</li>
    <li>☐ Realizar o <strong>teste de mecha</strong> quando houver dúvida sobre o resultado ou sobre a resistência do fio.</li>
    <li>☐ Conferir a validade dos produtos.</li>
    <li>☐ Seguir a proporção exata indicada pelo fabricante.</li>
    <li>☐ Preparar a mistura somente no momento da aplicação.</li>
  </ul>
</div>
<h3>Anamnese Obrigatória</h3>
<ul style="${CHECK}">
  <li>☐ A senhora já teve alguma reação alérgica a tintura?</li>
  <li>☐ Tem alergia a algum produto ou cosmético?</li>
  <li>☐ Qual foi a última química realizada e há quanto tempo?</li>
  <li>☐ Já usou henna ou produtos com metais no cabelo?</li>
  <li>☐ Tem alguma ferida, irritação ou coceira no couro cabeludo?</li>
  <li>☐ Está gestante ou amamentando?</li>
  <li>☐ Faz uso de algum medicamento ou tratamento em curso?</li>
</ul>
<div style="${BOX}">
  <p style="margin:0"><strong>Não realizar o procedimento</strong> quando houver histórico de reação alérgica ao produto, ferida ou irritação no couro cabeludo, ou suspeita de henna/metais no fio. Nesses casos, informar a cliente, comunicar a gerência e registrar a recusa técnica.</p>
</div>
<h3>Durante o Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Manter a estação organizada e ventilada.</li>
  <li>☐ Não utilizar telefone celular.</li>
  <li>☐ Não consumir alimentos.</li>
  <li>☐ Utilizar luvas durante todo o manuseio do produto.</li>
  <li>☐ Não deixar o produto entrar em contato com os olhos.</li>
  <li>☐ Perguntar à cliente, ao longo da pausa, se está sentindo ardência ou incômodo.</li>
  <li>☐ <strong>Em caso de ardência, coceira intensa ou vermelhidão, remover o produto imediatamente</strong> e comunicar a gerência.</li>
  <li>☐ Não aplicar calor sem indicação do fabricante.</li>
</ul>
<h3>Após o Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Descartar corretamente os resíduos do produto.</li>
  <li>☐ Lavar a tigela e o pincel imediatamente.</li>
  <li>☐ Higienizar a estação, a pia e a cadeira.</li>
  <li>☐ Higienizar as mãos.</li>
  <li>☐ Preparar a estação para a próxima cliente.</li>
</ul>

<h2>8. Procedimento Operacional</h2>

<h3>PARTE A — Início do Atendimento</h3>
<p><strong>1. Apresentação do Profissional</strong> — sempre iniciar o atendimento de frente para a cliente, demonstrando simpatia, cordialidade e profissionalismo.</p>
<blockquote>"Olá (Nome da cliente), meu nome é (Nome do Profissional) e hoje eu serei o(a) responsável pelo seu atendimento."</blockquote>
<p><strong>2. Confirmação do Serviço</strong></p>
<blockquote>"A senhora irá pigmentar hoje, correto?"</blockquote>
<p><strong>3. Identificação da Necessidade</strong></p>
<blockquote>"O que a senhora pensou para hoje?" · "A senhora possui alguma preferência ou alguma foto de referência?"</blockquote>
<p><strong>4. Anamnese</strong> — aplicar todas as perguntas do item 7 antes de qualquer procedimento.</p>
<p><strong>5. Ponderações e Orientações</strong> — após ouvir atentamente a cliente e avaliar o cabelo, explicar de forma clara e profissional:</p>
<ul style="${CHECK}">
  <li>☐ O que é possível realizar.</li>
  <li>☐ O que não é recomendado realizar.</li>
  <li>☐ As limitações técnicas — cor de base, química anterior e condição do fio.</li>
  <li>☐ Quantas sessões serão necessárias para chegar ao resultado desejado.</li>
  <li>☐ Quanto tempo a cor tende a durar.</li>
  <li>☐ A necessidade de manutenção e de cuidados específicos.</li>
</ul>
<blockquote>"Baseado no que a senhora deseja, é possível fazer [explicar o que dá para fazer]."</blockquote>
<blockquote>"Não recomendamos [explicar o que não é recomendado] porque [explicar o motivo]."</blockquote>
<blockquote>"Para chegar exatamente nessa referência, vamos precisar de [X] sessões. Hoje conseguimos chegar em [resultado]."</blockquote>
<p><strong>Nenhum procedimento deverá ser iniciado antes que a cliente compreenda e concorde com o resultado que será realizado.</strong></p>
<p><strong>6. Definição da Rota</strong> — definir, conforme a orientação do fabricante, se o cabelo será lavado <strong>antes</strong> (Rota A) ou <strong>depois</strong> (Rota B) da aplicação, e informar a cliente.</p>

<h3>PARTE B — Orientação ao Assistente</h3>
<p style="color:#6b6880"><em>Executar somente quando houver assistente.</em></p>
<p><strong>7. Briefing do Assistente</strong></p>
<ul style="${CHECK}">
  <li>☐ Informar a fórmula e a proporção exatas.</li>
  <li>☐ Informar a volumagem do oxidante.</li>
  <li>☐ Informar por onde começar a aplicação e em qual sentido.</li>
  <li>☐ Informar se deve ou não aplicar na raiz e no comprimento.</li>
  <li>☐ Informar o tempo de pausa.</li>
  <li>☐ Informar quais produtos usar no lavatório de remoção.</li>
  <li>☐ Informar o que <strong>não</strong> deve ser feito.</li>
  <li>☐ Confirmar se o assistente entendeu antes de liberar.</li>
</ul>
<div style="${BOX}">
  <p style="margin:0"><strong>O assistente não altera fórmula, proporção nem tempo por conta própria.</strong> Qualquer dúvida ou alteração deve ser comunicada ao profissional responsável antes de prosseguir.</p>
</div>

<h3>PARTE C — Higienização Prévia (somente na ROTA A)</h3>
<p style="color:#6b6880"><em>Executar somente quando o protocolo exigir lavar antes da aplicação.</em></p>
<p><strong>8. Avaliação do Cabelo e Informação das Necessidades</strong> — observar o estado geral, o tipo e a porosidade do fio, verificar danos, química anterior e a condição do couro cabeludo, e informar à cliente as necessidades identificadas.</p>
<p><strong>9. Informar os Produtos e Experiência Sensorial</strong> — informar todos os produtos que serão utilizados e deixar a cliente sentir o cheiro.</p>
<p><strong>10. Execução da Higienização</strong></p>
<ul style="${CHECK}">
  <li>☐ Verificar a temperatura da água (morna, agradável).</li>
  <li>☐ Soltar um pouco o cabelo da raiz e desembaraçar suavemente.</li>
  <li>☐ Aplicar o 1º shampoo, emulsionar bem e enxaguar completamente.</li>
  <li>☐ Aplicar o 2º shampoo + massagem no couro cabeludo por 3 minutos.</li>
  <li>☐ Enxaguar completamente.</li>
  <li>☐ Aguardar o tempo de pausa recomendado pela marca.</li>
  <li>☐ Aplicar o condicionador no comprimento e nas pontas, evitando a raiz.</li>
  <li>☐ Aguardar o tempo recomendado pela marca.</li>
  <li>☐ Enxaguar completamente, sem deixar resíduos.</li>
</ul>
<div style="${BOX}">
  <p style="margin:0"><strong>Massagem suave no couro cabeludo.</strong> Antes de aplicar química, não esfregar nem arranhar o couro — a fricção sensibiliza e aumenta a ardência durante a pausa.</p>
</div>
<p><strong>11. Finalização</strong> — fazer a touca com a toalha, conduzir a cliente até a cadeira, secar com a toalha, pentear, alinhar e <strong>secar o cabelo completamente</strong> antes da aplicação.</p>

<h3>PARTE D — Preparação para a Aplicação</h3>
<p><strong>12. Preparação da Cliente</strong></p>
<ul style="${CHECK}">
  <li>☐ Colocar o robe ou avental.</li>
  <li>☐ Colocar a capa impermeável.</li>
  <li>☐ Posicionar a toalha escura sobre os ombros.</li>
  <li>☐ Aplicar creme de barreira na linha do couro cabeludo, na testa, nas orelhas e na nuca.</li>
  <li>☐ Retirar brincos e acessórios, quando necessário.</li>
  <li>☐ Verificar se a cliente está confortável.</li>
</ul>
<p><strong>13. Penteia e alinha o cabelo</strong> — pentear, desembaraçar e dividir o cabelo em quatro seções com o pente de ponta fina.</p>
<p><strong>14. Preparo da Mistura</strong></p>
<ul style="${CHECK}">
  <li>☐ Conferir a fórmula definida pelo profissional responsável.</li>
  <li>☐ Medir o produto e o oxidante na proporção exata da marca.</li>
  <li>☐ Utilizar tigela e pincel não metálicos.</li>
  <li>☐ Misturar até obter consistência homogênea.</li>
  <li>☐ Preparar somente no momento da aplicação.</li>
  <li>☐ Calçar as luvas antes de iniciar.</li>
</ul>

<h3>PARTE E — Aplicação da Pigmentação</h3>
<p><strong>15. Aplicação</strong> — executada pelo assistente sob orientação, ou pelo próprio profissional.</p>
<ul style="${CHECK}">
  <li>☐ Iniciar pela região definida pelo profissional responsável.</li>
  <li>☐ Trabalhar em mechas finas e uniformes.</li>
  <li>☐ Aplicar o produto de forma homogênea, sem falhas.</li>
  <li>☐ Respeitar a ordem definida entre raiz e comprimento.</li>
  <li>☐ Não deixar produto acumulado nem escorrendo.</li>
  <li>☐ Limpar imediatamente qualquer respingo na pele.</li>
  <li>☐ Conferir se todas as seções foram cobertas, inclusive a nuca e as laterais.</li>
  <li>☐ O profissional responsável deve conferir a aplicação antes de iniciar a contagem.</li>
</ul>
<p><strong>16. Tempo de Pausa</strong> — em média <strong>30 minutos</strong>, sempre conforme a indicação da marca.</p>
<ul style="${CHECK}">
  <li>☐ Iniciar o cronômetro somente após a conferência da aplicação.</li>
  <li>☐ Registrar o horário de início.</li>
  <li>☐ Acompanhar a cliente durante a pausa.</li>
  <li>☐ Perguntar se está sentindo ardência ou incômodo.</li>
  <li>☐ Verificar a evolução da cor quando a marca permitir.</li>
  <li>☐ <strong>Não ultrapassar o tempo indicado pelo fabricante.</strong></li>
  <li>☐ Oferecer bebida e garantir o conforto durante a espera.</li>
</ul>
<blockquote>"Vou deixar agir por [X] minutos. Qualquer ardência ou incômodo, me chame na hora, por favor."</blockquote>

<h3>PARTE F — Lavatório de Remoção</h3>
<p><strong>17. Avaliação e Oferta de Tratamento</strong></p>
<ul style="${CHECK}">
  <li>☐ Realizar a avaliação do cabelo e informar as necessidades.</li>
  <li>☐ Oferecer terapia capilar ou cronograma de acordo com a necessidade.</li>
  <li>☐ Informar todos os produtos que serão utilizados.</li>
  <li>☐ Deixar a cliente sentir o cheiro dos produtos.</li>
</ul>
<blockquote>"Depois de uma química, o cabelo pede uma reposição. A senhora gostaria que eu montasse um cronograma para manter a cor e a saúde do fio?"</blockquote>
<p><strong>18. Remoção do Produto</strong></p>
<ul style="${CHECK}">
  <li>☐ <strong>Emulsionar o produto com um pouco de água antes de enxaguar</strong>, massageando suavemente.</li>
  <li>☐ Utilizar água morna, nunca quente.</li>
  <li>☐ Enxaguar até a água sair limpa.</li>
  <li>☐ Aplicar o 1º shampoo (pós-coloração) e enxaguar.</li>
  <li>☐ Aplicar o 2º shampoo + massagem no couro cabeludo por <strong>10 a 15 minutos</strong>.</li>
  <li>☐ Enxaguar completamente.</li>
  <li>☐ Aguardar o tempo de pausa recomendado pela marca.</li>
  <li>☐ Aplicar o condicionador, a máscara <strong>ou o passo a passo completo da linha</strong>.</li>
  <li>☐ Aguardar o tempo recomendado pela marca.</li>
  <li>☐ Enxaguar completamente, sem deixar resíduos.</li>
  <li>☐ Verificar se não restou pigmento na pele, nas orelhas ou na nuca.</li>
  <li>☐ Remover manchas da pele com o produto adequado.</li>
</ul>
<p><strong>19. Finalização da Higienização</strong> — fazer a touca com a toalha e conduzir a cliente até a cadeira.</p>

<h3>PARTE G — Finalização</h3>
<p><strong>20. Preparação</strong></p>
<ul style="${CHECK}">
  <li>☐ Secar com a toalha, retirando o excesso de água (pressionar, nunca esfregar).</li>
  <li>☐ Colocar a capa de proteção e o robe.</li>
  <li>☐ Aplicar o protetor térmico e os finalizadores.</li>
  <li>☐ Pentear e alinhar o cabelo.</li>
</ul>
<p><strong>21. Modelagem ou Secagem</strong> — finalizar conforme o POP-PRO-007 (Secagem) ou POP-PRO-008 (Modelagem).</p>
<p><strong>22. Validação da Cliente</strong> — apresentar o resultado e perguntar obrigatoriamente:</p>
<blockquote>"A senhora gostou do resultado?"</blockquote>
<blockquote>"Existe algum detalhe que gostaria que ajustássemos?"</blockquote>
<p>Utilizar o espelho de mão para mostrar a parte de trás e as laterais. <strong>O atendimento somente poderá ser encerrado após a aprovação da cliente.</strong></p>
<p><strong>23. Orientações de Manutenção</strong></p>
<ul style="${CHECK}">
  <li>☐ Orientar a aguardar o tempo indicado antes da próxima lavagem.</li>
  <li>☐ Orientar o uso de shampoo sem sal e produtos para cabelos coloridos.</li>
  <li>☐ Orientar sobre sol, piscina e mar.</li>
  <li>☐ Informar a data ideal da manutenção da cor e da raiz.</li>
  <li>☐ Oferecer os produtos de manutenção para venda.</li>
  <li>☐ Oferecer o reagendamento da manutenção e do cronograma.</li>
</ul>
<blockquote>"Para a cor durar mais, use shampoo sem sal e evite água muito quente. A manutenção da raiz costuma ser em [X] dias — posso já deixar agendado?"</blockquote>

<h3>PARTE H — Registro, Acompanhamento e Organização</h3>
<p><strong>24. Registro da Fórmula</strong> — obrigatório em todo atendimento de pigmentação.</p>
<ul style="${CHECK}">
  <li>☐ Registrar a cor e a numeração utilizadas.</li>
  <li>☐ Registrar a volumagem do oxidante e a proporção.</li>
  <li>☐ Registrar o tempo de pausa efetivo.</li>
  <li>☐ Registrar o resultado obtido e as observações.</li>
  <li>☐ Registrar qualquer reação ou intercorrência.</li>
  <li>☐ Registrar o serviço e os produtos vendidos no sistema.</li>
</ul>
<div style="${BOX}">
  <p style="margin:0"><strong>O registro da fórmula é o que permite repetir ou corrigir a cor na próxima visita.</strong> Sem ele, cada atendimento recomeça do zero e o resultado fica inconsistente.</p>
</div>
<p><strong>25. Acompanhamento pelo Assistente</strong> — havendo assistente, ele deverá dar suporte até a cliente ir embora, auxiliando no que for necessário e acompanhando-a até a recepção.</p>
<p><strong>26. Organização</strong></p>
<ul style="${CHECK}">
  <li>☐ Descartar corretamente os resíduos do produto.</li>
  <li>☐ Lavar a tigela e o pincel imediatamente.</li>
  <li>☐ Limpar as escovas e os pentes.</li>
  <li>☐ Recolher os cabelos do chão e da cadeira.</li>
  <li>☐ Higienizar a estação, a pia e a cadeira.</li>
  <li>☐ Guardar os produtos corretamente.</li>
  <li>☐ Preparar a estação para a próxima cliente.</li>
</ul>

<h2>9. Indicadores de Qualidade</h2>
<p>A gerência deverá acompanhar mensalmente:</p>
<ul style="${CHECK}">
  <li>☐ Registro da fórmula em 100% dos atendimentos.</li>
  <li>☐ Realização do teste de sensibilidade quando indicado.</li>
  <li>☐ Número de correções de cor.</li>
  <li>☐ Número de reclamações sobre o resultado.</li>
  <li>☐ Número de reações ou intercorrências.</li>
  <li>☐ Índice de satisfação da cliente.</li>
  <li>☐ Percentual de retorno para manutenção.</li>
  <li>☐ Adesão ao cronograma capilar pós-química.</li>
  <li>☐ Vendas de produtos para cabelos coloridos.</li>
</ul>

<h2>10. Checklist de Auditoria</h2>
<div style="${BOX}">
  <div style="${BOXH}">Apresentação e Segurança</div>
  <ul style="${CHECK}">
    <li>☐ Apresentou-se de frente para a cliente, com nome.</li>
    <li>☐ Confirmou o serviço (pigmentação).</li>
    <li>☐ Perguntou o que a cliente desejava e se havia referência.</li>
    <li>☐ Realizou a anamnese completa.</li>
    <li>☐ Verificou alergias, química anterior e couro cabeludo.</li>
    <li>☐ Realizou o teste de sensibilidade quando indicado.</li>
    <li>☐ Realizou o teste de mecha quando havia dúvida.</li>
    <li>☐ Fez as ponderações e informou quantas sessões seriam necessárias.</li>
    <li>☐ Definiu a rota (lavar antes ou depois) conforme a marca.</li>
  </ul>
  <div style="${BOXH}">Orientação ao Assistente (quando houver)</div>
  <ul style="${CHECK}">
    <li>☐ Informou a fórmula, a proporção e a volumagem.</li>
    <li>☐ Informou por onde começar e em qual sentido.</li>
    <li>☐ Informou o tempo de pausa.</li>
    <li>☐ Informou o que não deveria ser feito.</li>
    <li>☐ Confirmou se o assistente entendeu.</li>
  </ul>
  <div style="${BOXH}">Preparação e Aplicação</div>
  <ul style="${CHECK}">
    <li>☐ Colocou capa impermeável, robe e toalha escura.</li>
    <li>☐ Aplicou creme de barreira na linha do couro.</li>
    <li>☐ Dividiu o cabelo em seções.</li>
    <li>☐ Mediu o produto na proporção exata.</li>
    <li>☐ Usou tigela e pincel não metálicos.</li>
    <li>☐ Preparou a mistura na hora da aplicação.</li>
    <li>☐ Utilizou luvas durante todo o manuseio.</li>
    <li>☐ Aplicou em mechas finas e uniformes, sem falhas.</li>
    <li>☐ Limpou os respingos na pele imediatamente.</li>
    <li>☐ O profissional conferiu a aplicação antes de iniciar a contagem.</li>
  </ul>
  <div style="${BOXH}">Pausa e Remoção</div>
  <ul style="${CHECK}">
    <li>☐ Cronometrou o tempo de pausa.</li>
    <li>☐ Perguntou sobre ardência ou incômodo durante a pausa.</li>
    <li>☐ Não ultrapassou o tempo do fabricante.</li>
    <li>☐ Emulsionou antes de enxaguar.</li>
    <li>☐ Usou água morna, nunca quente.</li>
    <li>☐ Aplicou o shampoo pós-coloração.</li>
    <li>☐ Aplicou o 2º shampoo + massagem de 10 a 15 minutos.</li>
    <li>☐ Aplicou a máscara ou o passo a passo da linha.</li>
    <li>☐ Removeu as manchas da pele.</li>
    <li>☐ Ofereceu terapia capilar ou cronograma.</li>
  </ul>
  <div style="${BOXH}">Finalização e Registro</div>
  <ul style="${CHECK}">
    <li>☐ Aplicou protetor térmico e finalizadores.</li>
    <li>☐ Finalizou com secagem ou modelagem.</li>
    <li>☐ Mostrou o resultado com o espelho de mão.</li>
    <li>☐ Perguntou se a cliente gostou e se havia ajustes.</li>
    <li>☐ Orientou sobre a manutenção da cor.</li>
    <li>☐ Ofereceu produtos e reagendamento.</li>
    <li>☐ <strong>Registrou a fórmula utilizada.</strong></li>
    <li>☐ O assistente deu suporte até a cliente ir embora.</li>
    <li>☐ Lavou a tigela e o pincel e organizou a estação.</li>
  </ul>
</div>
`.trim()

// ── POP-PRO-013 · Ganhar Habilidade ────────────────────────────────────────
// Documento informativo (sem modelo de avaliação — não abre o botão "Avaliar").
// Fica disponível para TODAS as categorias: entra nos três setores.
const CHECKD = 'list-style:none;padding-left:0;margin:6px 0 16px;line-height:1.65'
const HAB = (n: number, titulo: string, modelos: string, curso: string, pontos: [string, string][]) => `
<h3>${n}. ${titulo}</h3>
<div style="${BOX}">
  <p style="margin:0"><strong>Quantidade de modelos:</strong> ${modelos}</p>
  <p style="margin:8px 0 0"><strong>Curso:</strong> ${curso}</p>
</div>
<p style="margin:10px 0 2px"><strong>Pontos de avaliação:</strong></p>
<ul style="${CHECKD}">
${pontos.map(([t, dsc]) => `  <li>☐ <strong>${t}</strong><br><span style="color:#6b6880">${dsc}</span></li>`).join('\n')}
</ul>`

const PRO_GANHAR_HABILIDADE_HTML = `
<h1>Procedimento Operacional Padrão (POP)</h1>
<p style="color:#6b6880;font-size:15px;margin:-4px 0 16px;font-weight:600">POP-PRO-013 — Ganhar Habilidade (Liberação de Habilidade)</p>

<h2>1. Identificação</h2>
<div style="${META}">
  <p style="margin:0"><strong>Código:</strong> POP-PRO-013 &nbsp;·&nbsp; <strong>Versão:</strong> 1.0 &nbsp;·&nbsp; <strong>Setor:</strong> Todos os profissionais</p>
  <p style="margin:8px 0 0"><strong>Responsável:</strong> Diretora Técnica</p>
  <p style="margin:8px 0 0"><strong>Data de Emissão:</strong> ___/___/______ &nbsp;·&nbsp; <strong>Última Revisão:</strong> ___/___/______ &nbsp;·&nbsp; <strong>Próxima Revisão:</strong> ___/___/______</p>
</div>

<h2>2. Finalidade</h2>
<p>Garantir que os profissionais do salão estejam devidamente qualificados para executar determinados serviços, assegurando a excelência nos atendimentos. Esse processo envolve a avaliação técnica do profissional, a certificação de sua aptidão e a autorização para a realização do serviço em clientes.</p>

<h2>3. Fluxo do Processo</h2>

<p><strong>0. Solicitação da habilidade</strong> — o profissional interessado deve manifestar o desejo de obter uma nova habilidade e seguir os critérios estabelecidos para sua liberação.</p>

<p><strong>1. Tem disponibilidade e espaço físico para executar esse procedimento no salão?</strong></p>
<div style="${BOX}">
  <p style="margin:0"><strong>1.1 SIM:</strong> Caso haja espaço físico e compatibilidade com o perfil do salão, o profissional deve consultar a Diretora Técnica da área. Ela indicará o curso mais adequado para seu desenvolvimento profissional e técnico. Após a conclusão, o profissional deverá apresentar o certificado impresso à Diretora Técnica.</p>
  <p style="margin:10px 0 0"><strong>1.2 NÃO:</strong> Se não houver espaço físico disponível ou se o curso não estiver alinhado com o perfil do salão, a habilidade não poderá ser adquirida no momento.</p>
</div>

<p><strong>2. Definição da quantidade de modelos</strong> — a Diretora Técnica definirá a quantidade de modelos necessários e os diferentes tipos de execução que o profissional deverá realizar para demonstrar sua aptidão. Esse processo garante que o profissional esteja preparado para oferecer o serviço com excelência e segurança.</p>

<p><strong>3. Calendário de produção</strong> — nessa etapa, o profissional deverá cumprir as datas e a quantidade de modelos previamente estabelecidas para a avaliação prática.</p>
<div style="${BOX}">
  <p style="margin:0"><strong>Observação:</strong> Para garantir a organização interna do salão, caso o profissional não apresente as modelos dentro das datas estipuladas ou não complete a quantidade exigida até a última data prevista, será necessária uma reunião entre o profissional e a Diretora Técnica. Durante essa reunião, será definido um novo calendário, porém esse agendamento dependerá da disponibilidade da Diretora Técnica. Isso significa que o novo cronograma poderá ser ajustado imediatamente ou poderá levar algumas semanas ou até meses para ser remarcado.</p>
</div>

<p><strong>4. Teste conforme a quantidade e as técnicas solicitadas</strong> — o profissional realizará o teste conforme a quantidade e as técnicas exigidas.</p>
<div style="${BOX}">
  <p style="margin:0"><strong>4.1 NÃO:</strong> Se o profissional não for aprovado pela Diretora Técnica, será solicitado que retome o processo:</p>
  <ol style="margin:8px 0 0 22px">
    <li>Fazer o curso de capacitação + apresentação do certificado.</li>
    <li>Trazer modelos pré-estabelecidas pela Diretora Técnica.</li>
    <li>Fazer novo teste.</li>
  </ol>
  <p style="margin:10px 0 0"><strong>Observação:</strong> O processo de capacitação será repetido até que o profissional seja considerado apto para executar o serviço com qualidade e segurança.</p>
</div>

<p><strong>5. Conferência de material</strong> — se o profissional for aprovado no teste, será verificado se ele possui todos os materiais necessários para a execução da habilidade.</p>
<div style="${BOX}">
  <p style="margin:0"><strong>5.1 SIM:</strong> Habilidade liberada temporariamente por três meses, para avaliação do desempenho técnico.</p>
  <p style="margin:10px 0 0"><strong>5.2 NÃO:</strong> O profissional deve aguardar até apresentar o material completo à Diretora Técnica.</p>
</div>

<p><strong>6. Habilidade temporária — 3 meses</strong></p>
<div style="${BOX}">
  <p style="margin:0"><strong>6.1 SIM:</strong> Se o profissional passar três meses sem reclamações de clientes, a habilidade será concedida de forma definitiva.</p>
  <p style="margin:10px 0 0"><strong>6.2 NÃO:</strong> Se houver recorrência de feedbacks negativos, a habilidade será retirada, e o profissional precisará reiniciar o processo.</p>
</div>

<h2>4. Cursos Necessários e Modelos por Habilidade</h2>
${HAB(1, 'MECHAS', '5 (1 loira global, 1 iluminado, 1 retoque de raiz, 1 correção de cor, 1 mechas desfiadas)', 'Colorimetria e técnicas avançadas de mechas; Color Creator.', [
  ['Quantidade e diversidade de modelos', 'Avaliar se há variedade nas técnicas de mechas do momento (ex.: esfumar raiz etc.).'],
  ['Precisão na aplicação', 'Verificar se as mechas estão bem distribuídas e aplicadas com precisão nas seções de cabelo.'],
  ['Distribuição e uniformidade da cor', 'Analisar se as mechas estão bem distribuídas e sem manchas.'],
  ['Resultado da correção de cor', 'Avaliar se as mechas corrigem ou equilibram a cor de forma eficaz.'],
  ['Tempo de processamento adequado', 'Verificar se o tempo de exposição do produto é adequado ao tipo de cabelo e à técnica aplicada.'],
  ['Controle da temperatura da ferramenta', 'Garantir que as ferramentas (secador, chapinha, etc.) estejam na temperatura correta para não danificar o cabelo.'],
  ['Cuidados durante a aplicação de descoloração', 'Avaliar o uso de produtos de proteção durante a aplicação.'],
  ['Controle do impacto do processo no cabelo', 'Verificar o impacto do processo de descoloração no cabelo, se ele se manteve saudável.'],
  ['Técnica de acabamento das mechas', 'Avaliar o acabamento das mechas, a saúde do cabelo e a finalização.'],
])}
${HAB(2, 'PIGMENTAÇÃO', '5 (3 correção de cor, 1 retoque de raiz exceto preto ou castanho, 1 tonalizar cobertura de brancos)', 'Pigmentação avançada e neutralização de cores.', [
  ['Quantidade e diversidade de cores utilizadas', 'Avaliar se há variedade nas cores e se foram utilizadas as técnicas corretas de pigmentação.'],
  ['Precisão na aplicação da pigmentação', 'Verificar se a aplicação da cor foi feita com precisão, sem manchas ou falhas.'],
  ['Cobertura e uniformidade da cor', 'Analisar se a cor foi distribuída de maneira uniforme e se cobre completamente o cabelo, sem falhas.'],
  ['Resultado da correção de cor', 'Avaliar se a pigmentação corrige ou equilibra a cor de forma eficaz, deixando o cabelo com aparência natural.'],
  ['Tempo de processamento adequado', 'Verificar o tempo de ação da coloração de acordo com o fabricante.'],
  ['Controle da temperatura da ferramenta', 'Garantir que as ferramentas estejam na temperatura correta para não interferir no resultado da pigmentação.'],
  ['Uso de produtos de proteção durante a aplicação', 'Avaliar se foi utilizado algum produto de proteção.'],
  ['Durabilidade da cor', 'Analisar se a cor aplicada se manteve vibrante e intensa por um período satisfatório após o processo.'],
  ['Acabamento da pigmentação', 'Avaliar o acabamento final da cor, se o cabelo apresenta brilho, suavidade e uma aparência saudável.'],
])}
${HAB(3, 'BARBA', '5 (1 barba completa e modelada, 1 barba degradê/fade beard, 1 barba lenhador/full beard, 1 barba baixa/designer beard, 1 barba com navalha + toalha quente)', 'Técnicas de barbearia e design de barba.', [
  ['Forma e contorno da barba', 'Avaliar se o formato da barba foi feito de acordo com o estilo solicitado e se o contorno está bem definido.'],
  ['Simetria e equilíbrio', 'Verificar se ambos os lados da barba estão simétricos e equilibrados, sem falhas ou desníveis.'],
  ['Aparência geral da barba', 'Analisar se a barba está bem aparada e com um acabamento natural, sem áreas desleixadas.'],
  ['Textura e maciez', 'Avaliar se a textura da barba está macia ao toque, livre de aspereza ou fios ressecados.'],
  ['Uso adequado de produtos de cuidados', 'Verificar se foram utilizados produtos adequados para o tipo de barba, como óleos ou cremes de hidratação.'],
  ['Manutenção do comprimento e volume', 'Avaliar se o comprimento e o volume foram mantidos de acordo com o desejado, sem excessos ou falta de densidade.'],
  ['Precisão no corte', 'Verificar se o corte foi feito com precisão, respeitando os detalhes e evitando imperfeições visíveis.'],
  ['Evitação de irritação na pele', 'Avaliar se o processo de aparar e modelar a barba foi feito de maneira a evitar irritações ou cortes na pele.'],
  ['Hidratação e cuidados com a pele', 'Verificar se a pele foi devidamente hidratada durante e após o processo, para evitar ressecamento ou desconforto.'],
])}
${HAB(4, 'CORTE', '30 femininos (corte reto/blunt cut, corte em camadas/repicado ou long layers, chanel clássico ou assimétrico, long bob ou short bob, corte pixie/joãozinho) e 30 masculinos (corte clássico, buzz cut ou militar)', 'Técnicas de corte (clássico, moderno e texturizado).', [
  ['Análise do formato do rosto e estilo pessoal', 'Avaliar se o corte foi escolhido levando em consideração o formato do rosto do cliente e seu estilo pessoal.'],
  ['Simetria do corte', 'Verificar se o corte está simétrico, sem desníveis ou irregularidades.'],
  ['Precisão no corte das listras ou camadas', 'Avaliar se as listras ou camadas foram cortadas com precisão, sem transições abruptas ou linhas desiguais.'],
  ['Adequação ao tipo de cabelo', 'Analisar se o corte foi feito considerando o tipo de cabelo (liso, cacheado, crespo, ondulado), facilitando o estilo e a manutenção.'],
  ['Texturização do cabelo', 'Verificar se a texturização foi feita de forma equilibrada, conferindo volume e movimento natural ao corte.'],
  ['Finalização do corte', 'Avaliar a finalização do corte, se as pontas estão bem acabadas e o cabelo com um aspecto saudável.'],
  ['Resultado de ajustes e correções', 'Analisar a eficácia dos ajustes e correções durante o corte, se ele ficou perfeito ao final das alterações.'],
  ['Equilíbrio entre estilo e praticidade', 'Verificar se o corte consegue equilibrar o estilo desejado com a praticidade para o cliente no dia a dia.'],
])}
${HAB(5, 'DEPILAÇÃO', '4 (depilação completa de perna, depilação de buço, depilação de virilha, depilação de axilas)', 'Depilação corporal completa; depilação facial (sobrancelha, buço, etc.); depilação com cera quente e fria; depilação a laser; depilação de áreas sensíveis (virilha e axilas).', [
  ['Escolha do método de depilação adequado', 'Verificar se o método foi escolhido corretamente, considerando o tipo de pele e pelos da cliente (cera, lâmina, laser, etc.).'],
  ['Higiene e preparação da pele', 'Avaliar se a pele foi bem higienizada antes do procedimento, com o uso de produtos adequados para evitar infecções.'],
  ['Temperatura da cera ou produto utilizado', 'Verificar se a cera ou o produto está na temperatura correta para evitar queimaduras ou desconforto.'],
  ['Aplicação e remoção da cera', 'Analisar se a cera foi aplicada uniformemente e removida com a técnica correta, sem causar dor excessiva ou irritações.'],
  ['Evitar quebra ou fratura dos pelos', 'Avaliar se os pelos foram removidos pela raiz sem causar quebras ou fraturas, o que pode resultar em pelos encravados.'],
  ['Cuidados pós-depilação', 'Verificar se os cuidados pós-depilação foram realizados corretamente, com produtos calmantes e hidratantes para evitar irritações e vermelhidão.'],
  ['Precisão no contorno', 'Avaliar a precisão do contorno no local da depilação, como nas sobrancelhas ou na linha do biquíni, para garantir um resultado simétrico e bem-feito.'],
  ['Conforto durante o procedimento', 'Verificar se o cliente se sentiu confortável durante o processo, com o mínimo de dor ou desconforto possível.'],
  ['Segurança e cuidados com a pele sensível', 'Avaliar se o processo foi realizado de maneira segura, sem reações adversas, especialmente em áreas de pele mais sensível.'],
])}
${HAB(6, 'MASSAGEM', '6 (drenagem linfática corporal completa, massagem relaxante nas costas e ombros, massagem modeladora — abdômen, coxas e glúteos, reflexologia nos pés, massagem terapêutica para alívio de tensão)', 'Drenagem linfática; massagem relaxante; massagem modeladora; reflexologia; massagem terapêutica.', [
  ['Escolha da técnica adequada', 'Verificar se a técnica de massagem foi escolhida de acordo com as necessidades do cliente (relaxante, terapêutica, drenagem linfática, etc.).'],
  ['Ambiente confortável', 'Avaliar se o ambiente está adequado, com iluminação suave, temperatura agradável e sem ruídos excessivos.'],
  ['Higiene e preparação do espaço', 'Verificar se o espaço está limpo e organizado, com toalhas e roupas de cama higienizadas e os produtos prontos para uso.'],
  ['Postura e técnica do profissional', 'Avaliar se o profissional está utilizando a postura correta e a técnica adequada, garantindo a eficácia e o conforto do cliente.'],
  ['Pressão aplicada', 'Verificar se a pressão está adequada às preferências e necessidades do cliente, sem causar dor excessiva ou desconforto.'],
  ['Tempo de duração da sessão', 'Avaliar se o tempo está adequado ao tipo de massagem e às necessidades do cliente, proporcionando relaxamento sem pressa.'],
  ['Uso de óleos ou cremes', 'Verificar se os óleos ou cremes são apropriados para o tipo de massagem e a pele do cliente, além de estarem em boas condições de uso.'],
  ['Comunicação durante o procedimento', 'Avaliar se o profissional manteve boa comunicação, verificando constantemente se o cliente está confortável e se a pressão está adequada.'],
  ['Relaxamento e bem-estar do cliente', 'Verificar se o cliente parece relaxado e confortável, com sinais de alívio da tensão muscular — e sempre perguntar se está bem.'],
  ['Cuidados pós-massagem', 'Avaliar se o profissional forneceu orientações adequadas após a massagem, como recomendação de hidratação ou alongamentos, caso necessário.'],
])}
${HAB(7, 'BROW LAMINATION', '10 (2 brow lamination completo — desembaraço e alinhamento, 2 design de sobrancelha com brow lamination, 2 hidratação e nutrição de sobrancelhas, 2 correção de sobrancelha desalinhada, 2 brow lamination com tintura)', 'Brow lamination; design de sobrancelhas; hidratação e nutrição para sobrancelhas; alisamento de sobrancelhas; correção de sobrancelhas desalinhadas.', [
  ['Avaliação da estrutura das sobrancelhas', 'Verificar se o formato e o estado das sobrancelhas foram avaliados corretamente para determinar a técnica mais adequada para a laminação.'],
  ['Escolha dos produtos adequados', 'Avaliar se os produtos são de boa qualidade, específicos para sobrancelhas e adequados ao tipo de pele e pelo do cliente (produtos aprovados pela Anvisa).'],
  ['Preparo da pele e sobrancelhas', 'Verificar se a pele foi adequadamente limpa e preparada antes da aplicação, garantindo que os pelos fiquem livres de impurezas.'],
  ['Aplicação do produto de laminação', 'Avaliar se o produto foi aplicado de maneira uniforme e precisa, respeitando a direção do crescimento dos pelos e evitando o contato com a pele.'],
  ['Tempo de processamento adequado', 'Verificar se o tempo de exposição foi respeitado conforme as instruções do fabricante, considerando o tipo de pelo do cliente.'],
  ['Uso de protetor de pele', 'Garantir que um protetor de pele (como vaselina) tenha sido utilizado para evitar irritação ou queimaduras durante a aplicação.'],
  ['Fixação do resultado', 'Verificar se os pelos ficaram bem fixados e alinhados, proporcionando um efeito natural e uniforme de sobrancelhas mais volumosas e definidas.'],
  ['Hidratação pós-procedimento', 'Avaliar se houve aplicação de hidratante ou óleo nutritivo para garantir que os pelos fiquem saudáveis e com brilho após a laminação.'],
  ['Instruções de cuidados pós-procedimento', 'Verificar se foram passadas as orientações corretas, como evitar água nas sobrancelhas nas primeiras horas e o uso de produtos específicos para manutenção.'],
])}
${HAB(8, 'DESPIGMENTAÇÃO DE SOBRANCELHA / REMOÇÃO DE TATUAGEM', '10 (2 despigmentação com laser, 2 despigmentação com ácido, 2 remoção de tatuagem de sobrancelha, 2 correção de sobrancelha com despigmentação, 2 despigmentação com técnica de clareamento)', 'Despigmentação de sobrancelha; remoção de pigmento em sobrancelhas; correção de sobrancelha; design de sobrancelha e despigmentação; remoção de tatuagens de sobrancelha.', [
  ['Avaliação da tatuagem ou pigmentação', 'Verificar o tipo de tatuagem ou pigmentação (cor, profundidade e técnica) para escolher o método adequado de remoção.'],
  ['Escolha do método de remoção', 'Avaliar se foi escolhido o método correto (laser, peeling químico, remoção mecânica, etc.) para o tipo de pigmentação presente.'],
  ['Anamnese e avaliação da saúde da pele', 'Certificar-se de que foi realizada avaliação da saúde da pele, considerando histórico de reações alérgicas ou problemas de cicatrização.'],
  ['Proteção da pele ao redor das sobrancelhas', 'Verificar se foi utilizado um protetor de pele (como vaselina ou outra barreira) para evitar danos ou irritações na área ao redor.'],
  ['Aplicação adequada do produto/procedimento', 'Avaliar se foi aplicado corretamente, respeitando as instruções e o cuidado com a área — sempre higienizar a pele antes de iniciar.'],
  ['Ajuste de intensidade do tratamento', 'Verificar se a intensidade foi ajustada de acordo com o grau de pigmentação e o tipo de pele, para evitar danos ou excessos.'],
  ['Uso de equipamentos de segurança', 'Garantir que foram utilizados todos os equipamentos de segurança necessários, como óculos de proteção quando realizado com laser.'],
  ['Monitoramento do processo de remoção', 'Acompanhar atentamente a resposta da pele para ajustar a técnica ou interromper, se necessário, a fim de evitar efeitos adversos.'],
  ['Cuidados pós-procedimento', 'Avaliar se foram fornecidas instruções adequadas, como uso de cremes calmantes e a proibição de exposição solar nas primeiras semanas.'],
  ['Acompanhamento de resultados e sessões adicionais', 'Verificar a necessidade de sessões adicionais e o acompanhamento dos resultados, para garantir remoção segura e eficaz.'],
])}
${HAB(9, 'LIMPEZA DE PELE', '10 (2 limpeza completa, 2 limpeza com extração, 2 limpeza com máscaras nutritivas, 2 limpeza hidratante, 2 limpeza profunda com tecnologia — ultrassom, etc.)', 'Limpeza de pele completa; limpeza com extração; limpeza com máscaras faciais; limpeza profunda; limpeza com tecnologia (ultrassom, dermaroller, etc.).', [
  ['Avaliação do tipo de pele', 'Verificar o tipo de pele da cliente (seca, oleosa, mista, sensível) para escolher os produtos e técnicas mais adequados.'],
  ['Higienização inicial da pele', 'Certificar-se de que a pele foi higienizada com demaquilante e sabonete específico para remover maquiagem, impurezas e oleosidade excessiva.'],
  ['Esfoliação', 'Avaliar se a esfoliação foi feita de maneira adequada, com esfoliante suave, removendo células mortas sem causar irritação ou dano.'],
  ['Aplicação de tônico', 'Garantir que um tônico adequado foi aplicado para equilibrar o pH da pele e preparar para os próximos passos.'],
  ['Extração de comedões', 'Avaliar a execução correta da extração de cravos, quando necessário, com técnicas e ferramentas esterilizadas para evitar lesões ou infecções.'],
  ['Aplicação de máscara facial', 'Verificar se a máscara foi escolhida conforme a necessidade da pele (hidratante, purificante, calmante) e aplicada uniformemente, seguindo o tempo de pausa do produto.'],
  ['Massagem facial', 'Avaliar a aplicação de massagem facial suave, estimulando a circulação sanguínea e promovendo o relaxamento durante o procedimento.'],
  ['Uso de produtos calmantes', 'Verificar se produtos calmantes e hidratantes foram aplicados após a limpeza — utilizar alta frequência após a extração da máscara.'],
  ['Proteção solar', 'Garantir que um protetor solar adequado foi aplicado ao final, especialmente se houver exposição ao sol após o procedimento.'],
  ['Orientações pós-tratamento', 'Certificar-se de que foram passadas as instruções corretas, como evitar produtos agressivos ou exposição ao sol por período determinado.'],
])}
${HAB(10, 'LASH LIFTING', '10 (2 lash lifting completo — curvatura e alinhamento, 2 lash lifting com tintura, 2 permanente de cílios, 2 lash lifting para cílios curvados, 2 lash lifting para cílios naturais)', 'Lash lifting completo; alongamento e curvatura de cílios; permanente de cílios; lash lifting com tintura; técnicas avançadas de lash lifting.', [
  ['Avaliação dos cílios naturais', 'Verificar o comprimento, a espessura e a curvatura dos cílios naturais para determinar a técnica e o produto mais adequados.'],
  ['Seleção do curvex (papel de lifting)', 'Garantir que o curvex escolhido seja adequado ao comprimento e à curvatura dos cílios, garantindo um efeito natural.'],
  ['Preparação dos cílios', 'Certificar-se de que os cílios foram limpos e desengordurados para garantir a aderência adequada dos produtos.'],
  ['Aplicação do gel de lifting', 'Avaliar se o gel foi aplicado corretamente na base dos cílios, respeitando o tempo de processamento, sem causar danos.'],
  ['Fixação e distribuição correta dos cílios', 'Verificar se os cílios estão corretamente posicionados no curvex, sem sobreposição, para garantir curvatura uniforme e natural.'],
  ['Tempo de processamento adequado', 'Garantir que o tempo de ação do gel foi seguido conforme o tipo de cílio, sem ultrapassar o recomendado, para evitar danos.'],
  ['Aplicação do gel de fixação', 'Avaliar a aplicação do gel de fixação, que deve ser precisa, para manter a curvatura de maneira duradoura.'],
  ['Hidratação dos cílios após o procedimento', 'Verificar se foi aplicada camada de produto hidratante ou nutritivo, para garantir a saúde e o brilho dos fios.'],
  ['Finalização e teste de curvatura', 'Garantir que a curvatura final esteja de acordo com o desejado, com cílios bem levantados, mas naturais.'],
  ['Orientações pós-procedimento', 'Fornecer orientações claras sobre os cuidados, como evitar exposição à água, calor e maquiagem por período determinado.'],
])}
${HAB(11, 'SOBRANCELHAS', '25 (5 design completo, 5 design com henna, 5 design com microblading, 5 correção de sobrancelhas assimétricas, 5 design com fios — técnica manual)', 'Design de sobrancelha; design com henna; microblading; design com fios; correção de sobrancelhas assimétricas.', [
  ['Avaliação do formato natural das sobrancelhas', 'Verificar o formato natural e identificar as áreas que precisam de ajustes para um design harmonioso e proporcional.'],
  ['Definição do design das sobrancelhas', 'Avaliar se o design foi escolhido de acordo com o formato do rosto da cliente, respeitando preferências e características naturais.'],
  ['Uso de medidas para proporção', 'Garantir que o design seja simétrico, utilizando medidas para assegurar proporcionalidade e equilíbrio entre ambas as sobrancelhas.'],
  ['Preparação da área', 'Certificar-se de que a área foi higienizada corretamente antes do procedimento, removendo sujeira ou resíduos de maquiagem.'],
  ['Escolha e aplicação da técnica de depilação', 'Avaliar a técnica escolhida (pinça, cera, linha) e garantir que foi aplicada de maneira cuidadosa e eficaz, sem desconforto excessivo.'],
  ['Cuidados ao remover pelos', 'Garantir que os pelos sejam removidos de forma suave, respeitando a direção natural do crescimento, para evitar danos ou irritações.'],
  ['Preenchimento e correção (caso necessário)', 'Avaliar se o preenchimento com lápis, pó ou pomada foi feito de maneira natural, sem exageros, corrigindo falhas.'],
  ['Uso de produtos de fixação', 'Verificar se foi aplicado gel ou fixador para manter os fios no lugar e garantir sobrancelhas bem definidas durante o dia.'],
  ['Orientações pós-procedimento', 'Fornecer orientações sobre cuidados, como evitar toque excessivo, exposição ao sol e uso de maquiagem nas primeiras horas.'],
])}
${HAB(12, 'FIBRA DE VIDRO OU SERVIÇOS EM GEL', 'Pode ser feita na própria unha da profissional, podendo também ser apenas 2 unhas de cada procedimento (2 aplicação de fibra de vidro, 2 unhas de gel com alongamento, manutenção de unhas de gel, 2 aplicação de gel para cobertura, 2 unhas de gel com design artístico, 2 manutenção de unhas de fibra de vidro)', 'Aplicação de fibra de vidro; unhas de gel; unhas de gel com alongamento; técnicas avançadas em gel; manutenção de unhas de fibra de vidro e gel.', [
  ['Escolha da técnica adequada', 'Verificar se a escolha entre fibra de vidro ou gel foi feita de acordo com o tipo de unha e as necessidades da cliente (força, comprimento, aparência).'],
  ['Preparação das unhas naturais', 'Avaliar se as unhas foram preparadas adequadamente, com remoção de cutículas, lixamento e desidratação, para garantir boa aderência.'],
  ['Aplicação da base', 'Certificar-se de que a base foi aplicada de maneira uniforme e sem excessos, criando uma camada firme.'],
  ['Aplicação da fibra de vidro ou gel', 'Verificar se a aplicação foi precisa, sem bolhas de ar, com espessura correta e cobertura completa.'],
  ['Modelagem e espessura das unhas', 'Avaliar a espessura após a aplicação, garantindo que não fiquem nem muito finas nem grossas demais, mantendo equilíbrio e naturalidade.'],
  ['Controle de tempo de cura (UV/LED)', 'Garantir que o tempo de cura foi adequado para cada camada, evitando unhas mal fixadas ou danificadas.'],
  ['Acabamento liso e uniforme', 'Verificar se o acabamento ficou liso, sem irregularidades ou rachaduras, com superfície de aparência natural.'],
  ['Correção de imperfeições (caso necessário)', 'Avaliar se foram feitas correções em falhas de aplicação ou espessura, garantindo unhas perfeitas antes da finalização.'],
  ['Lixamento e modelagem final', 'Verificar se o lixamento e a modelagem final foram feitos corretamente, com o formato desejado e bordas suaves.'],
  ['Orientações pós-procedimento', 'Oferecer orientações sobre cuidados, como evitar uso excessivo de produtos de limpeza e contato com água quente por períodos prolongados.'],
])}
${HAB(13, 'MANICURE / PEDICURE', '6 (1 manicure completa, 1 pedicure completa, 1 manicure artística, 1 pedicure artística, 1 unhas decoradas, 1 cuidados especiais para unhas — hidratantes e tratamentos)', 'Manicure e pedicure completa; unhas artísticas; unhas decoradas; cuidados especiais para unhas; biossegurança.', [
  ['Avaliação da saúde das unhas', 'Verificar se as unhas estão saudáveis, sem sinais de infecção, fungos ou outros problemas. Caso necessário, orientar a cliente sobre cuidados médicos.'],
  ['Limpeza e higienização das mãos/pés', 'Certificar-se de que mãos e pés foram higienizados adequadamente antes de iniciar, para garantir um serviço seguro e sem contaminação.'],
  ['Remoção de esmalte anterior (se houver)', 'Avaliar se o esmalte antigo foi removido completamente sem danificar a superfície das unhas, com removedores adequados.'],
  ['Cuidados com as cutículas', 'Avaliar a técnica utilizada para empurrar ou remover as cutículas, garantindo que não ocorra lesão ou irritação — devem ser tratadas de forma suave.'],
  ['Forma e comprimento das unhas', 'Avaliar se as unhas foram aparadas conforme o desejo da cliente, mantendo formato e comprimento adequados, sem quebras ou irregularidades.'],
  ['Esfoliação das mãos/pés', 'Verificar se foi realizada esfoliação suave para remover células mortas e deixar a pele mais macia e renovada, especialmente nos pés.'],
  ['Hidratação da pele', 'Garantir que a pele das mãos e pés foi hidratada adequadamente após a esfoliação, com cremes ou óleos específicos.'],
  ['Preparação das unhas para o esmalte', 'Avaliar se as unhas foram bem preparadas, incluindo limpeza da superfície, remoção de resíduos e aplicação de base (se necessário).'],
  ['Aplicação do esmalte', 'Verificar se o esmalte foi aplicado de forma uniforme, sem falhas, bolhas ou excesso, em camadas finas para garantir durabilidade.'],
  ['Secagem adequada', 'Garantir que o esmalte secou adequadamente, sem marcas ou borrões, respeitando o tempo de secagem.'],
  ['Finalização do serviço', 'Avaliar se a finalização foi feita com aplicação de top coat para brilho e proteção, garantindo que as unhas estejam secas ao toque.'],
  ['Orientações pós-procedimento', 'Oferecer orientações sobre cuidados, como evitar contato com produtos químicos agressivos e manter as unhas hidratadas.'],
])}
${HAB(14, 'PLÁSTICA DOS PÉS', '4 (tratamento de rachaduras e hidratação profunda)', 'Cuidados podológicos.', [
  ['Higienização inicial dos pés', 'Avaliar se os pés foram corretamente higienizados antes do início, para garantir que o processo seja realizado de forma limpa e segura.'],
  ['Avaliação das condições da pele', 'Verificar a condição geral da pele, observando ressecamento, rachaduras, calos ou outras anomalias que possam afetar o tratamento.'],
  ['Esfoliação dos pés', 'Garantir que foi realizada esfoliação eficaz para remover células mortas, deixando a pele mais suave e preparada para a hidratação.'],
  ['Tratamento de calos e calosidades', 'Avaliar se as áreas de calos foram tratadas corretamente, com produtos específicos ou raspagem suave, sem causar danos.'],
  ['Hidratação profunda', 'Verificar se a hidratação foi aplicada de forma eficaz, com produtos específicos para pés secos, que promovam maciez e restauração da pele.'],
  ['Massagem relaxante nos pés', 'Avaliar a técnica de massagem aplicada para relaxamento, estimulando a circulação e promovendo alívio de tensões.'],
  ['Aplicação de máscara hidratante ou revitalizante', 'Garantir que uma máscara específica foi aplicada para revitalização da pele, com hidratação profunda das áreas ressecadas.'],
  ['Proteção das unhas e cutículas', 'Verificar se houve cuidado especial para evitar danos às unhas e cutículas, mantendo a saúde e a aparência.'],
  ['Finalização e cuidados pós-procedimento', 'Avaliar se a finalização foi bem executada, com os pés de aparência saudável e macia, e produtos que selam a hidratação.'],
  ['Orientações pós-tratamento', 'Oferecer orientações claras, como evitar ambientes muito quentes ou agressivos e a importância de continuar a hidratação em casa.'],
])}
${HAB(15, 'SPA DAS MÃOS / SPA DOS PÉS', '2 (protocolos de SPA e finalização)', 'Técnicas de hidratação e relaxamento.', [
  ['Higienização inicial', 'Garantir que mãos e pés sejam devidamente higienizados antes do procedimento, com sabonetes e produtos adequados.'],
  ['Avaliação das condições da pele', 'Verificar a saúde da pele das mãos e dos pés, observando ressecamento, rachaduras, calos ou outras imperfeições.'],
  ['Esfoliação', 'Avaliar se a esfoliação foi bem realizada em mãos e pés, removendo células mortas e deixando a pele mais suave.'],
  ['Hidratação profunda', 'Avaliar a aplicação de cremes ou máscaras hidratantes específicas, proporcionando hidratação intensa e restauradora.'],
  ['Cuidados com as cutículas', 'Verificar se as cutículas foram tratadas com cuidado, sem causar danos, com hidratação e remoção adequada quando necessário.'],
  ['Massagem relaxante', 'Verificar a execução de massagem relaxante nas mãos, pulsos, pés e tornozelos, proporcionando alívio de tensões e bem-estar.'],
  ['Tratamento de calos e calosidades', 'Verificar se as áreas de calos foram tratadas de forma eficaz, com técnicas suaves e sem causar desconforto.'],
  ['Aplicação de máscara ou óleo revitalizante', 'Garantir que a máscara ou óleo revitalizante foi aplicado corretamente, hidratando e rejuvenescendo a pele.'],
  ['Proteção das unhas', 'Garantir que as unhas das mãos e dos pés foram tratadas corretamente, com atenção especial para evitar danos durante o processo.'],
  ['Finalização e cuidados pós-procedimento', 'Avaliar a finalização com creme protetor ou óleo para manter a hidratação, e as orientações sobre cuidados pós-tratamento.'],
])}
${HAB(16, 'MAQUIAGEM', '14 (2 maquiagem básica, 2 para noivas, 2 para eventos — dia e noite, 2 artística, 2 de correção de imperfeições, 2 para pele negra e morena, 2 de olhos — esfumado, cut crease, etc.)', 'Maquiagem básica; maquiagem profissional; para noivas; para eventos; artística; de correção de imperfeições; para pele negra e morena.', [
  ['Preparação da pele', 'Verificar se a pele foi devidamente limpa, tonificada e hidratada antes de aplicar a maquiagem.'],
  ['Escolha da base adequada', 'Avaliar se a base foi escolhida de acordo com o tom de pele, textura e necessidades da cliente (matificante, hidratante, etc.).'],
  ['Aplicação da base', 'Verificar se a base foi aplicada de forma uniforme, sem marcas, com cobertura natural e duradoura.'],
  ['Corretivo e contorno', 'Avaliar o uso adequado de corretivo para cobrir imperfeições e o contorno para realçar os traços faciais, sem excessos.'],
  ['Sombra e delineado', 'Verificar se a aplicação das sombras e do delineado está bem executada, com cores harmonizadas e linha bem definida.'],
  ['Aplicação de blush e iluminador', 'Avaliar o uso adequado do blush e do iluminador para dar vida ao rosto, com acabamento saudável e iluminado.'],
  ['Preenchimento das sobrancelhas', 'Garantir que as sobrancelhas foram preenchidas e modeladas corretamente, respeitando o formato natural do rosto.'],
  ['Máscara de cílios', 'Verificar se a máscara foi aplicada de forma eficaz, sem borrões, proporcionando volume e definição.'],
  ['Acabamento da maquiagem', 'Avaliar o acabamento final, garantindo que não haja linhas visíveis, manchas ou falhas.'],
  ['Fixação e durabilidade', 'Verificar se a maquiagem está bem fixada e se a durabilidade é satisfatória, sem necessidade de retoques constantes.'],
])}
${HAB(17, 'MODELAGEM', '20 (2 escova básica, 2 escova modeladora, 2 escova de volume, 2 escova para cabelos cacheados, 2 escova para cabelos afro, 4 escova para cabelos curtos, 2 escova para cabelos lisos, 2 escova para cabelos ondulados, 2 escova babyliss)', 'Escova básica; escova modeladora; técnica de uso de produtos finalizadores.', [
  ['Análise do formato do rosto', 'Avaliar se foi feito um estudo do formato do rosto da cliente para escolher o estilo de modelagem mais adequado.'],
  ['Escolha do estilo de modelagem', 'Verificar se o estilo escolhido está alinhado com o desejo da cliente e suas características faciais.'],
  ['Uso de ferramentas apropriadas', 'Garantir que as ferramentas usadas foram adequadas ao tipo de cabelo, sobrancelha ou barba.'],
  ['Manutenção da saúde do cabelo', 'Verificar se a modelagem foi realizada sem prejudicar a saúde dos fios.'],
  ['Respeito ao estilo pessoal da cliente', 'Garantir que a modelagem foi realizada de acordo com o gosto e as preferências da cliente, respeitando suas características pessoais.'],
  ['Finalização e toque final', 'Garantir que a modelagem foi finalizada com o toque adequado, com fixador, pomada ou outro produto para o acabamento desejado.'],
])}
${HAB(18, 'NUTRIÇÕES', '10 (2 nutrição capilar básica, 2 nutrição capilar profunda, tratamento de nutrição para cabelos danificados, 2 nutrição com foco em hidratação, 2 nutrição para cabelos ressecados, 2 tratamento nutritivo com máscaras profundas)', 'Tratamentos capilares intensivos.', [
  ['Análise das necessidades do cabelo', 'Verificar se foi feita análise detalhada das necessidades específicas do cabelo para escolher o tratamento mais adequado.'],
  ['Escolha do produto apropriado', 'Garantir que o produto seja adequado ao tipo de cabelo ou pele (seco, danificado, oleoso, com processo químico, etc.).'],
  ['Aplicação uniforme do produto', 'Avaliar se o produto foi aplicado de forma uniforme em toda a área de tratamento, garantindo que todos os fios recebam a quantidade necessária.'],
  ['Tempo de ação do produto', 'Verificar se o tempo de ação foi respeitado conforme o produto, permitindo que os ingredientes penetrem e nutram adequadamente.'],
  ['Controle de quantidade de produto usado', 'Verificar se a quantidade utilizada foi adequada, evitando excessos ou falta de produto durante o tratamento.'],
  ['Uso de equipamentos adicionais (se necessário)', 'Avaliar se, no uso de equipamentos ou vapor, foi feito de forma correta e sem prejudicar a integridade do cabelo ou da pele.'],
  ['Compreensão dos resultados esperados', 'Garantir que o tratamento foi realizado com o objetivo de melhorar a saúde do cabelo ou da pele, proporcionando brilho, maciez e hidratação.'],
  ['Avaliação da textura após o tratamento', 'Analisar a melhora na textura após o tratamento, verificando se houve aumento de brilho e suavidade.'],
  ['Recomendação de cuidados pós-tratamento', 'Garantir que o profissional forneceu recomendações claras para a manutenção em casa com produtos adequados, evitando danos.'],
])}
${HAB(19, 'TERAPIA CAPILAR', '12 (2 para cabelos danificados, 2 para queda de cabelo, 2 para cabelos oleosos, 2 para cabelos secos, 2 com máscaras e ampolas, 2 com uso de tecnologias — laser, LED, etc.)', 'Terapias para couro cabeludo e fios.', [
  ['Análise do tipo de cabelo e do problema capilar', 'Avaliar se foi realizada análise detalhada do tipo de cabelo e se os problemas específicos (queda, quebra, ressecamento) foram identificados corretamente.'],
  ['Escolha da terapia adequada', 'Verificar se a terapia escolhida é a mais indicada para o problema identificado, considerando os ativos e ingredientes do tratamento.'],
  ['Higienização inicial do cabelo', 'Avaliar se o processo de higienização antes da aplicação foi adequado, com produtos específicos para o tipo de cabelo.'],
  ['Aplicação do produto de forma uniforme', 'Garantir que o produto foi aplicado de forma uniforme em todo o couro cabeludo e fios, respeitando as áreas afetadas.'],
  ['Massagem e estímulo no couro cabeludo', 'Verificar se a massagem foi realizada corretamente para estimular a circulação e facilitar a penetração do produto.'],
  ['Uso de equipamentos para potencializar a terapia', 'Avaliar se, quando necessário, foram utilizados equipamentos como toucas térmicas, vapor ou infravermelho.'],
  ['Tempo de ação do produto', 'Garantir que o tempo de ação foi respeitado, permitindo que os ativos agissem da melhor forma no cabelo e no couro cabeludo.'],
  ['Avaliação do resultado imediato', 'Analisar se houve melhora visível na textura, brilho, maciez e saúde geral do cabelo após o tratamento.'],
  ['Recomendações pós-tratamento', 'Verificar se foram fornecidas orientações adequadas para cuidados em casa, com produtos específicos ou hábitos para manter os resultados.'],
  ['Acompanhamento e resultados a longo prazo', 'Avaliar se foi sugerida uma programação de sessões para continuar o tratamento, com monitoramento contínuo dos resultados.'],
])}
${HAB(20, 'PENTEADO', '16 (2 penteado básico, 2 para noivas, 2 para festas, 2 com tranças, 2 com coque, 2 para cabelos cacheados, 2 para cabelos lisos e ondulados, 2 para cabelos longos e curtos)', 'Penteado básico; para noivas; para festas e eventos; com tranças; com coque; para cabelos cacheados; para cabelos lisos e ondulados.', [
  ['Análise do tipo de cabelo e estilo desejado', 'Avaliar se o profissional considerou o tipo de cabelo e as preferências do cliente para definir o estilo de penteado.'],
  ['Hidratação e preparação do cabelo', 'Verificar se o cabelo foi devidamente hidratado e preparado antes do penteado, saudável, brilhante e sem frizz.'],
  ['Escolha dos produtos adequados', 'Garantir que os produtos usados (fixadores, sprays, mousses, géis) são adequados ao tipo de cabelo e ao estilo desejado — saber as quantidades e formas de aplicar.'],
  ['Execução da técnica de penteado', 'Avaliar se a técnica foi executada corretamente (tranças, coques, ondas, cachos), respeitando a estrutura do cabelo e o estilo escolhido.'],
  ['Precaução com a fixação', 'Verificar se o penteado foi fixado corretamente, sem pesar o cabelo, e se o uso de grampos ou presilhas não danificou o fio.'],
  ['Volume e textura', 'Avaliar a criação de volume ou textura necessária, garantindo um efeito natural e bem equilibrado.'],
  ['Finalização e toque final', 'Verificar se o penteado recebeu acabamento adequado, com produtos que garantem brilho, leveza e toque natural.'],
  ['Ajuste ao formato do rosto e estilo do cliente', 'Avaliar se o penteado foi personalizado para o formato do rosto e o estilo da cliente, considerando corte de cabelo e tipo de evento.'],
  ['Conforto e segurança', 'Garantir que o penteado não cause desconforto, como apertar demais ou gerar tensão no couro cabeludo, e que os acessórios estejam bem fixados.'],
])}
${HAB(21, 'REALINHAMENTO', '4 modelos — avaliação em alinhamento, raiz, coloração e chapinha', 'Técnicas de realinhamento capilar; coloração intermediário.', [
  ['Análise do tipo de cabelo e necessidade do realinhamento', 'Avaliar se foi feita análise detalhada do tipo de cabelo e identificada a necessidade (redução de volume, eliminação de frizz, selagem de cutículas).'],
  ['Escolha do produto adequado', 'Verificar se o produto é adequado para o tipo de cabelo e atende às expectativas do cliente, seja alisamento, redução de volume ou tratamento.'],
  ['Preparação do cabelo', 'Avaliar se o cabelo foi adequadamente lavado e tratado antes da aplicação, com os fios limpos e sem resíduos de outros produtos.'],
  ['Aplicação do produto', 'Verificar se o produto foi aplicado de maneira uniforme, respeitando o tempo de pausa necessário para garantir a eficácia do tratamento.'],
  ['Controle do tempo de ação do produto', 'Avaliar se o tempo de ação foi seguido conforme as instruções do fabricante, para evitar danos e garantir o melhor resultado.'],
  ['Uso de ferramentas adequadas', 'Garantir que foram utilizadas as ferramentas corretas (pente, escova, chapinha) e que as temperaturas foram controladas.'],
  ['Técnica de escovação e prensagem', 'Avaliar se a escovação e a prensagem foram feitas de maneira precisa, com a quantidade correta de mechas e o cuidado necessário.'],
  ['Acabamento e brilho', 'Verificar se o cabelo ficou com acabamento liso, sem frizz e com brilho natural, refletindo um visual saudável e hidratado.'],
  ['Conforto durante o procedimento', 'Verificar se o cliente se sentiu confortável, sem irritações no couro cabeludo ou desconforto pela temperatura ou tempo de exposição.'],
])}
`.trim()

const PRO_HENNA_HTML = `
<h1>Procedimento Operacional Padrão (POP)</h1>
<p style="color:#6b6880;font-size:15px;margin:-4px 0 16px;font-weight:600">POP-PRO-014 — Henna Capilar</p>

<h2>1. Identificação</h2>
<div style="${META}">
  <p style="margin:0"><strong>Código:</strong> POP-PRO-014 &nbsp;·&nbsp; <strong>Versão:</strong> 1.0 &nbsp;·&nbsp; <strong>Setor:</strong> Profissionais (Cabeleireiro / Auxiliar)</p>
  <p style="margin:8px 0 0"><strong>Responsável:</strong> <span style="${FIELD}"></span></p>
  <p style="margin:8px 0 0"><strong>Data de Emissão:</strong> ___/___/______ &nbsp;·&nbsp; <strong>Última Revisão:</strong> ___/___/______ &nbsp;·&nbsp; <strong>Próxima Revisão:</strong> ___/___/______</p>
</div>

<h2>2. Objetivo</h2>
<p>Padronizar o serviço de <strong>henna capilar</strong>, garantindo a avaliação prévia do fio, a realização dos testes de segurança, a aplicação uniforme do produto no lavatório, o cumprimento do tempo de pausa, a remoção correta e o registro do produto utilizado.</p>

<h2>3. Campo de Aplicação</h2>
<p>Este procedimento aplica-se a todos os profissionais responsáveis pela aplicação de henna capilar.</p>

<h2>4. Diferencial do Procedimento</h2>
<div style="${BOX}">
  <p style="margin:0"><strong>A aplicação do produto é feita no próprio lavatório</strong> — a cliente não passa pela cadeira antes. Isso agiliza o atendimento e evita respingos pelo salão, já que a henna mancha com facilidade.</p>
  <p style="margin:8px 0 0">Por isso, toda a avaliação capilar, a oferta de tratamento e a apresentação dos produtos acontecem <strong>com a cliente já acomodada no lavatório</strong>, antes de aplicar.</p>
</div>

<h2>5. Materiais Necessários</h2>
<h3>Equipamentos e Materiais</h3>
<ul style="${CHECK}">
  <li>☐ Tigela e pincel de aplicação (não metálicos).</li>
  <li>☐ Cronômetro ou timer (obrigatório).</li>
  <li>☐ Pente de ponta fina para as divisões.</li>
  <li>☐ Presilhas para separar as mechas.</li>
  <li>☐ <strong>Luvas para o manuseio do produto</strong> (a henna mancha a pele e as unhas).</li>
  <li>☐ Capa impermeável.</li>
  <li>☐ Toalhas escuras.</li>
  <li>☐ Algodão.</li>
  <li>☐ Creme de barreira para a linha do couro cabeludo.</li>
  <li>☐ Touca (quando a marca indicar).</li>
  <li>☐ Espelho de mão.</li>
  <li>☐ Ficha de registro do produto utilizado.</li>
</ul>
<h3>Produtos</h3>
<ul style="${CHECK}">
  <li>☐ Henna capilar.</li>
  <li>☐ Shampoo 1 e Shampoo 2.</li>
  <li>☐ Condicionador.</li>
  <li>☐ Máscara de hidratação, nutrição ou reconstrução.</li>
  <li>☐ Protetor térmico e finalizadores.</li>
  <li>☐ Removedor de mancha de pele.</li>
</ul>

<h2>6. Segurança e Cuidados</h2>
<div style="${BOX}">
  <div style="${BOXH}">Antes de qualquer aplicação</div>
  <ul style="${CHECK}">
    <li>☐ Realizar o <strong>teste de sensibilidade (teste de toque)</strong> conforme a instrução do fabricante, no prazo indicado por ele.</li>
    <li>☐ Realizar o <strong>teste de mecha</strong> — a henna reage de forma diferente em cada base e o resultado não é previsível só pela embalagem.</li>
    <li>☐ Conferir a validade do produto.</li>
    <li>☐ Preparar a mistura somente no momento da aplicação, conforme a proporção da marca.</li>
  </ul>
</div>
<h3>Anamnese Obrigatória</h3>
<ul style="${CHECK}">
  <li>☐ A senhora já teve alguma reação alérgica a henna ou tintura?</li>
  <li>☐ Tem alergia a algum produto ou cosmético?</li>
  <li>☐ Qual foi a última química realizada e há quanto tempo?</li>
  <li>☐ Pretende fazer coloração, descoloração ou alisamento nos próximos meses?</li>
  <li>☐ Tem alguma ferida, irritação ou coceira no couro cabeludo?</li>
  <li>☐ Está gestante ou amamentando?</li>
</ul>
<div style="${BOX}">
  <div style="${BOXH}">Aviso obrigatório à cliente</div>
  <p style="margin:0">A henna se deposita no fio e <strong>pode interferir em processos químicos futuros</strong> — coloração, descoloração e alisamento podem apresentar resultado imprevisível ou comprometer a fibra. A cliente deve ser informada disso <strong>antes</strong> da aplicação, e o uso da henna deve ficar registrado na ficha para consulta em atendimentos futuros.</p>
  <p style="margin:8px 0 0"><strong>Não realizar o procedimento</strong> quando houver histórico de reação alérgica ao produto ou ferida/irritação no couro cabeludo. Nesses casos, informar a cliente, comunicar a gerência e registrar a recusa técnica.</p>
</div>
<h3>Durante o Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Manter o lavatório organizado.</li>
  <li>☐ Não utilizar telefone celular.</li>
  <li>☐ Não consumir alimentos.</li>
  <li>☐ Utilizar luvas durante todo o manuseio do produto.</li>
  <li>☐ Não deixar o produto entrar em contato com os olhos.</li>
  <li>☐ Evitar respingos no rosto e na roupa da cliente.</li>
  <li>☐ Perguntar à cliente, ao longo da pausa, se está sentindo ardência ou incômodo.</li>
  <li>☐ <strong>Em caso de ardência, coceira intensa ou vermelhidão, remover o produto imediatamente</strong> e comunicar a gerência.</li>
</ul>
<h3>Após o Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Descartar corretamente os resíduos do produto.</li>
  <li>☐ Lavar a tigela e o pincel imediatamente (a henna mancha).</li>
  <li>☐ Higienizar o lavatório, a pia e a cadeira.</li>
  <li>☐ Higienizar as mãos.</li>
  <li>☐ Preparar o lavatório para a próxima cliente.</li>
</ul>

<h2>7. Procedimento Operacional</h2>

<h3>PARTE A — Início do Atendimento</h3>
<p><strong>1. Apresentação do Profissional</strong> — sempre iniciar o atendimento de frente para a cliente, demonstrando simpatia, cordialidade e profissionalismo.</p>
<blockquote>"Olá (Nome da cliente), meu nome é (Nome do Profissional) e hoje eu serei o(a) responsável pelo seu atendimento."</blockquote>
<p><strong>2. Confirmação do Serviço</strong></p>
<blockquote>"A senhora irá aplicar a henna hoje, correto?"</blockquote>
<p><strong>3. Identificação da Necessidade</strong></p>
<blockquote>"O que a senhora pensou para hoje?" · "A senhora possui alguma preferência ou alguma foto de referência?"</blockquote>
<p><strong>4. Anamnese</strong> — aplicar todas as perguntas do item 6 antes de qualquer procedimento.</p>
<p><strong>5. Ponderações e Orientações</strong> — após ouvir atentamente a cliente e avaliar o cabelo, explicar de forma clara e profissional:</p>
<ul style="${CHECK}">
  <li>☐ O que é possível realizar.</li>
  <li>☐ O que não é recomendado realizar.</li>
  <li>☐ As limitações técnicas — cor de base, química anterior e condição do fio.</li>
  <li>☐ Que a henna pode interferir em químicas futuras.</li>
  <li>☐ Quanto tempo a cor tende a durar e como fazer a manutenção.</li>
</ul>
<blockquote>"Baseado no que a senhora deseja, é possível fazer [explicar o que dá para fazer]."</blockquote>
<blockquote>"Não recomendamos [explicar o que não é recomendado] porque [explicar o motivo]."</blockquote>
<p><strong>Nenhum procedimento deverá ser iniciado antes que a cliente compreenda e concorde com o resultado que será realizado.</strong></p>

<h3>PARTE B — Cliente vai para o Lavatório</h3>
<p><strong>6. Acomodação</strong> — conduzir a cliente até o lavatório, ajudá-la a se acomodar confortavelmente, ajustar a cadeira e verificar se está confortável.</p>
<p><strong>7. Avaliação do Cabelo e Informação das Necessidades</strong></p>
<ul style="${CHECK}">
  <li>☐ Observar o estado geral do cabelo.</li>
  <li>☐ Verificar o tipo de cabelo (liso, ondulado, cacheado, crespo).</li>
  <li>☐ Verificar a porosidade do cabelo.</li>
  <li>☐ Verificar se há ressecamento, danos ou pontas duplas.</li>
  <li>☐ Verificar se há química (coloração, descoloração, alisamento).</li>
  <li>☐ Verificar o couro cabeludo (oleosidade, caspa, sensibilidade, lesões).</li>
  <li>☐ Informar à cliente as necessidades identificadas.</li>
</ul>
<blockquote>"Percebi que seu cabelo está [descrever a condição]. Para melhorar a saúde do seu cabelo, recomendamos [sugerir tratamento]."</blockquote>
<p><strong>8. Oferta de Tratamento</strong> — perguntar se a cliente deseja realizar algum tratamento de acordo com a necessidade identificada.</p>
<blockquote>"A senhora gostaria de fazer um tratamento de [hidratação/nutrição/reconstrução] de acordo com a necessidade do seu cabelo?"</blockquote>
<p><strong>9. Informar os Produtos Utilizados</strong> — informar todos os produtos que serão utilizados e a função de cada um.</p>
<blockquote>"Hoje vou utilizar a henna [nome], o Shampoo [nome] para [função] e o Condicionador [nome]."</blockquote>
<p><strong>10. Experiência Sensorial</strong> — deixar a cliente sentir o cheiro dos produtos.</p>
<blockquote>"Antes de começar, gostaria que a senhora sentisse o cheiro dos produtos que vou utilizar."</blockquote>

<h3>PARTE C — Aplicação da Henna</h3>
<p><strong>11. Preparação da Cliente</strong></p>
<ul style="${CHECK}">
  <li>☐ Colocar a capa impermeável.</li>
  <li>☐ Posicionar a toalha escura sobre os ombros.</li>
  <li>☐ Aplicar creme de barreira na linha do couro cabeludo, na testa, nas orelhas e na nuca.</li>
  <li>☐ Retirar brincos e acessórios, quando necessário.</li>
  <li>☐ Desembaraçar e dividir o cabelo em seções com o pente de ponta fina.</li>
</ul>
<p><strong>12. Preparo da Mistura</strong></p>
<ul style="${CHECK}">
  <li>☐ Conferir a proporção indicada pela marca.</li>
  <li>☐ Utilizar tigela e pincel não metálicos.</li>
  <li>☐ Misturar até obter consistência homogênea.</li>
  <li>☐ Preparar somente no momento da aplicação.</li>
  <li>☐ Calçar as luvas antes de iniciar.</li>
</ul>
<p><strong>13. Aplicação</strong> — realizada com a cliente já no lavatório.</p>
<ul style="${CHECK}">
  <li>☐ Trabalhar em mechas finas e uniformes.</li>
  <li>☐ Aplicar o produto de forma homogênea, sem falhas.</li>
  <li>☐ Respeitar a ordem definida entre raiz e comprimento.</li>
  <li>☐ Não deixar produto acumulado nem escorrendo.</li>
  <li>☐ Limpar imediatamente qualquer respingo na pele.</li>
  <li>☐ Conferir se todas as seções foram cobertas, inclusive a nuca e as laterais.</li>
  <li>☐ Colocar a touca quando a marca indicar.</li>
</ul>
<p><strong>14. Tempo de Pausa</strong> — aguardar o tempo indicado pela marca, cronometrado.</p>
<ul style="${CHECK}">
  <li>☐ Iniciar o cronômetro somente após conferir a aplicação.</li>
  <li>☐ Registrar o horário de início.</li>
  <li>☐ Acompanhar a cliente durante a pausa.</li>
  <li>☐ Perguntar se está sentindo ardência ou incômodo.</li>
  <li>☐ <strong>Não ultrapassar o tempo indicado pelo fabricante.</strong></li>
  <li>☐ Oferecer bebida e garantir o conforto durante a espera.</li>
</ul>
<blockquote>"Vou deixar agir por [X] minutos. Qualquer ardência ou incômodo, me chame na hora, por favor."</blockquote>

<h3>PARTE D — Remoção do Produto e Higienização</h3>
<p><strong>15. Remoção</strong></p>
<ul style="${CHECK}">
  <li>☐ Enxaguar com água morna, nunca quente, até a água sair limpa.</li>
  <li>☐ Aplicar o 1º shampoo, emulsionar bem e enxaguar completamente.</li>
  <li>☐ Aplicar o 2º shampoo + massagem no couro cabeludo por <strong>10 minutos</strong>.</li>
  <li>☐ Enxaguar completamente.</li>
  <li>☐ Verificar se não restou resíduo de henna no cabelo, na pele, nas orelhas ou na nuca.</li>
  <li>☐ Remover manchas da pele com o produto adequado.</li>
</ul>
<p><strong>16. Condicionador ou Máscara</strong></p>
<ul style="${CHECK}">
  <li>☐ Aguardar o tempo de pausa recomendado pela marca.</li>
  <li>☐ Aplicar o condicionador ou a máscara no comprimento e nas pontas, evitando a raiz.</li>
  <li>☐ Aguardar o tempo recomendado pela marca.</li>
  <li>☐ Enxaguar completamente, sem deixar resíduos.</li>
</ul>
<p><strong>17. Finalização da Higienização</strong> — fazer a touca com a toalha e conduzir a cliente até a cadeira.</p>

<h3>PARTE E — Finalização</h3>
<p><strong>18. Preparação</strong></p>
<ul style="${CHECK}">
  <li>☐ Secar com a toalha, retirando o excesso de água (pressionar, nunca esfregar).</li>
  <li>☐ Colocar a capa de proteção e o robe.</li>
  <li>☐ Aplicar o protetor térmico e os finalizadores.</li>
  <li>☐ Pentear e alinhar o cabelo.</li>
</ul>
<p><strong>19. Modelagem ou Secagem</strong> — finalizar conforme o POP-PRO-007 (Secagem) ou POP-PRO-008 (Modelagem).</p>
<p><strong>20. Validação da Cliente</strong> — apresentar o resultado e perguntar obrigatoriamente:</p>
<blockquote>"A senhora gostou do resultado?"</blockquote>
<blockquote>"Existe algum detalhe que gostaria que ajustássemos?"</blockquote>
<p>Utilizar o espelho de mão para mostrar a parte de trás e as laterais. <strong>O atendimento somente poderá ser encerrado após a aprovação da cliente.</strong></p>
<p><strong>21. Orientações de Manutenção</strong></p>
<ul style="${CHECK}">
  <li>☐ Orientar a aguardar o tempo indicado antes da próxima lavagem.</li>
  <li>☐ Orientar o uso de shampoo sem sal.</li>
  <li>☐ Orientar sobre sol, piscina e mar.</li>
  <li>☐ Reforçar que a henna pode interferir em químicas futuras.</li>
  <li>☐ Informar a data ideal da manutenção.</li>
  <li>☐ Oferecer os produtos de manutenção para venda e o reagendamento.</li>
</ul>

<h3>PARTE F — Registro e Organização</h3>
<p><strong>22. Registro</strong> — obrigatório em todo atendimento com henna.</p>
<ul style="${CHECK}">
  <li>☐ Registrar a marca e o tom da henna utilizada.</li>
  <li>☐ Registrar o tempo de pausa efetivo.</li>
  <li>☐ Registrar o resultado obtido e as observações.</li>
  <li>☐ <strong>Registrar na ficha que a cliente usou henna</strong>, para consulta antes de qualquer química futura.</li>
  <li>☐ Registrar qualquer reação ou intercorrência.</li>
  <li>☐ Registrar o serviço e os produtos vendidos no sistema.</li>
</ul>
<p><strong>23. Organização</strong></p>
<ul style="${CHECK}">
  <li>☐ Descartar corretamente os resíduos do produto.</li>
  <li>☐ Lavar a tigela e o pincel imediatamente.</li>
  <li>☐ Higienizar o lavatório, a pia e a cadeira.</li>
  <li>☐ Recolher os cabelos do chão.</li>
  <li>☐ Guardar os produtos corretamente.</li>
  <li>☐ Preparar o lavatório para a próxima cliente.</li>
</ul>

<h2>8. Indicadores de Qualidade</h2>
<p>A gerência deverá acompanhar mensalmente:</p>
<ul style="${CHECK}">
  <li>☐ Registro do uso de henna na ficha em 100% dos atendimentos.</li>
  <li>☐ Realização do teste de mecha e do teste de sensibilidade.</li>
  <li>☐ Número de correções ou reclamações sobre o resultado.</li>
  <li>☐ Número de reações ou intercorrências.</li>
  <li>☐ Índice de satisfação da cliente.</li>
  <li>☐ Percentual de retorno para manutenção.</li>
  <li>☐ Conversão de henna em tratamento capilar.</li>
  <li>☐ Tempo médio de execução.</li>
</ul>

<h2>9. Checklist de Auditoria</h2>
<div style="${BOX}">
  <div style="${BOXH}">Apresentação e Segurança</div>
  <ul style="${CHECK}">
    <li>☐ Apresentou-se de frente para a cliente, com nome.</li>
    <li>☐ Confirmou o serviço (henna).</li>
    <li>☐ Perguntou o que a cliente desejava e se havia referência.</li>
    <li>☐ Realizou a anamnese completa.</li>
    <li>☐ Realizou o teste de sensibilidade e o teste de mecha.</li>
    <li>☐ Avisou que a henna pode interferir em químicas futuras.</li>
    <li>☐ Fez as ponderações do que dá e do que não dá para fazer.</li>
  </ul>
  <div style="${BOXH}">Lavatório e Avaliação</div>
  <ul style="${CHECK}">
    <li>☐ Acomodou a cliente confortavelmente no lavatório.</li>
    <li>☐ Realizou a avaliação capilar e informou as necessidades.</li>
    <li>☐ Ofereceu tratamento conforme a necessidade.</li>
    <li>☐ Informou todos os produtos que seriam utilizados.</li>
    <li>☐ Deixou a cliente sentir o cheiro dos produtos.</li>
  </ul>
  <div style="${BOXH}">Aplicação</div>
  <ul style="${CHECK}">
    <li>☐ Colocou capa impermeável e toalha escura.</li>
    <li>☐ Aplicou creme de barreira na linha do couro.</li>
    <li>☐ Dividiu o cabelo em seções.</li>
    <li>☐ Preparou a mistura na hora, em tigela não metálica.</li>
    <li>☐ Utilizou luvas durante todo o manuseio.</li>
    <li>☐ Aplicou em mechas finas e uniformes, sem falhas.</li>
    <li>☐ Limpou os respingos na pele imediatamente.</li>
    <li>☐ Cronometrou o tempo de pausa e não ultrapassou o do fabricante.</li>
    <li>☐ Perguntou sobre ardência durante a pausa.</li>
  </ul>
  <div style="${BOXH}">Remoção e Finalização</div>
  <ul style="${CHECK}">
    <li>☐ Enxaguou com água morna até sair limpa.</li>
    <li>☐ Aplicou o 1º shampoo.</li>
    <li>☐ Aplicou o 2º shampoo + massagem de 10 minutos.</li>
    <li>☐ Aplicou o condicionador ou a máscara respeitando os tempos.</li>
    <li>☐ Removeu as manchas da pele.</li>
    <li>☐ Fez a touca e levou a cliente para a cadeira.</li>
    <li>☐ Preparou para o procedimento (capa, robe, penteado).</li>
    <li>☐ Finalizou com secagem ou modelagem.</li>
    <li>☐ Mostrou o resultado e perguntou se a cliente gostou.</li>
    <li>☐ <strong>Registrou o uso da henna na ficha.</strong></li>
    <li>☐ Lavou a tigela e o pincel e organizou o lavatório.</li>
  </ul>
</div>
`.trim()

const PRO_MECHAS_HTML = `
<h1>Procedimento Operacional Padrão (POP)</h1>
<p style="color:#6b6880;font-size:15px;margin:-4px 0 16px;font-weight:600">POP-PRO-015 — Mechas</p>

<h2>1. Identificação</h2>
<div style="${META}">
  <p style="margin:0"><strong>Código:</strong> POP-PRO-015 &nbsp;·&nbsp; <strong>Versão:</strong> 1.0 &nbsp;·&nbsp; <strong>Setor:</strong> Profissionais (Cabeleireiro / Auxiliar)</p>
  <p style="margin:8px 0 0"><strong>Responsável:</strong> <span style="${FIELD}"></span></p>
  <p style="margin:8px 0 0"><strong>Data de Emissão:</strong> ___/___/______ &nbsp;·&nbsp; <strong>Última Revisão:</strong> ___/___/______ &nbsp;·&nbsp; <strong>Próxima Revisão:</strong> ___/___/______</p>
</div>

<h2>2. Objetivo</h2>
<p>Padronizar o serviço de <strong>mechas</strong>, garantindo a avaliação prévia do fio, o teste de mecha obrigatório, a aplicação uniforme da descoloração, o controle do tempo de ação, a remoção correta, o esfumado e a tonalização quando indicados, preservando a saúde do cabelo e registrando a fórmula utilizada.</p>

<h2>3. Campo de Aplicação</h2>
<p>Este procedimento aplica-se a todos os profissionais responsáveis pela realização de mechas.</p>

<h2>4. Visão Geral do Fluxo e Tempos</h2>
<div style="${BOX}">
  <div style="${BOXH}">Este é um serviço longo — combinar a duração com a cliente antes de iniciar</div>
  <table style="${TBL}">
    <tr><th style="${TH}">Etapa</th><th style="${TH}">Tempo médio</th></tr>
    <tr><td style="${TD}">Teste de mecha</td><td style="${TD}">30 minutos</td></tr>
    <tr><td style="${TD}">Higienização de preparação</td><td style="${TD}">Conforme o fluxo</td></tr>
    <tr><td style="${TD}">Aplicação do produto das mechas</td><td style="${TD}">1 hora</td></tr>
    <tr><td style="${TD}">Tempo de ação e reaplicação</td><td style="${TD}">1 a 2 horas</td></tr>
    <tr><td style="${TD}">Remoção, esfumar e tonalização</td><td style="${TD}">Conforme o resultado</td></tr>
    <tr><td style="${TD}">Finalização (modelagem ou secagem)</td><td style="${TD}">Conforme o serviço</td></tr>
  </table>
</div>

<h2>5. Materiais Necessários</h2>
<h3>Equipamentos e Materiais</h3>
<ul style="${CHECK}">
  <li>☐ Tigela e pincel de aplicação (não metálicos).</li>
  <li>☐ Balança ou medidor para a proporção correta.</li>
  <li>☐ Papel alumínio, papel filme ou touca de mechas.</li>
  <li>☐ Cronômetro ou timer (obrigatório).</li>
  <li>☐ Pente de ponta fina para as divisões.</li>
  <li>☐ Presilhas para separar as mechas.</li>
  <li>☐ <strong>Luvas para o manuseio dos produtos químicos.</strong></li>
  <li>☐ Capa impermeável e toalhas escuras.</li>
  <li>☐ Algodão e creme de barreira para a linha do couro cabeludo.</li>
  <li>☐ Secador, escovas e prancha.</li>
  <li>☐ Espelho de mão.</li>
  <li>☐ Ficha de registro da fórmula.</li>
</ul>
<h3>Produtos</h3>
<ul style="${CHECK}">
  <li>☐ Pó descolorante.</li>
  <li>☐ Oxidante na volumagem indicada.</li>
  <li>☐ Aditivos de proteção do fio (quando utilizados).</li>
  <li>☐ Tonalizante / matizador.</li>
  <li>☐ Shampoo pós-química (sem sal, pH ácido).</li>
  <li>☐ Condicionador, máscara ou passo a passo da linha.</li>
  <li>☐ Protetor térmico e finalizadores.</li>
  <li>☐ Removedor de mancha de pele.</li>
</ul>

<h2>6. Segurança e Cuidados</h2>
<div style="${BOX}">
  <div style="${BOXH}">Antes de qualquer aplicação</div>
  <ul style="${CHECK}">
    <li>☐ Realizar o <strong>teste de mecha</strong> — obrigatório: a descoloração reage conforme a base, a química anterior e a saúde do fio.</li>
    <li>☐ Realizar o <strong>teste de sensibilidade</strong> quando a linha do tonalizante indicar.</li>
    <li>☐ Conferir a validade dos produtos.</li>
    <li>☐ Seguir a proporção exata indicada pelo fabricante.</li>
    <li>☐ Preparar a mistura somente no momento da aplicação.</li>
  </ul>
</div>
<h3>Anamnese Obrigatória</h3>
<ul style="${CHECK}">
  <li>☐ Qual foi a última química realizada e há quanto tempo?</li>
  <li>☐ Já usou henna ou produtos com metais no cabelo?</li>
  <li>☐ Já teve reação alérgica a coloração ou descolorante?</li>
  <li>☐ Tem alguma ferida, irritação ou coceira no couro cabeludo?</li>
  <li>☐ O cabelo já quebrou ou "borrachudou" em algum processo anterior?</li>
  <li>☐ Está gestante ou amamentando?</li>
</ul>
<div style="${BOX}">
  <p style="margin:0"><strong>Não realizar o procedimento</strong> quando houver histórico de reação alérgica, ferida ou irritação no couro cabeludo, ou suspeita de henna/metais no fio (risco de reação e quebra). Nesses casos, informar a cliente, comunicar a gerência e registrar a recusa técnica.</p>
</div>
<h3>Durante o Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Manter a estação organizada e ventilada.</li>
  <li>☐ Utilizar luvas durante todo o manuseio do produto.</li>
  <li>☐ Não deixar o produto entrar em contato com os olhos.</li>
  <li>☐ Acompanhar a evolução da descoloração de perto — <strong>nunca abandonar a cliente durante o tempo de ação</strong>.</li>
  <li>☐ Perguntar à cliente, ao longo da pausa, se está sentindo ardência ou incômodo.</li>
  <li>☐ <strong>Em caso de ardência, coceira intensa ou vermelhidão, remover o produto imediatamente</strong> e comunicar a gerência.</li>
  <li>☐ Interromper o processo se o fio apresentar sinal de fragilidade excessiva (elasticidade anormal).</li>
</ul>
<h3>Após o Atendimento</h3>
<ul style="${CHECK}">
  <li>☐ Descartar corretamente os resíduos do produto.</li>
  <li>☐ Lavar a tigela e o pincel imediatamente.</li>
  <li>☐ Higienizar a estação, o lavatório e a cadeira.</li>
  <li>☐ Higienizar as mãos.</li>
  <li>☐ Preparar a estação para a próxima cliente.</li>
</ul>

<h2>7. Procedimento Operacional</h2>

<h3>PARTE A — Início do Atendimento</h3>
<p><strong>1. Apresentação do Profissional</strong> — sempre iniciar o atendimento de frente para a cliente, demonstrando simpatia, cordialidade e profissionalismo.</p>
<blockquote>"Olá (Nome da cliente), meu nome é (Nome do Profissional) e hoje eu serei o(a) responsável pelo seu atendimento."</blockquote>
<p><strong>2. Confirmação do Serviço</strong></p>
<blockquote>"A senhora irá fazer as mechas hoje, correto?"</blockquote>
<p><strong>3. Identificação da Necessidade</strong></p>
<blockquote>"O que a senhora pensou para hoje?" · "A senhora possui alguma preferência ou alguma foto de referência?"</blockquote>
<p><strong>4. Anamnese</strong> — aplicar todas as perguntas do item 6 antes de qualquer procedimento.</p>
<p><strong>5. Ponderações e Orientações</strong> — após ouvir atentamente a cliente e avaliar o cabelo, explicar de forma clara e profissional:</p>
<ul style="${CHECK}">
  <li>☐ O que é possível realizar.</li>
  <li>☐ O que não é recomendado realizar.</li>
  <li>☐ As limitações técnicas — cor de base, química anterior e condição do fio.</li>
  <li>☐ Quantas sessões serão necessárias para chegar ao resultado desejado.</li>
  <li>☐ A duração aproximada do atendimento de hoje.</li>
  <li>☐ Os cuidados de manutenção após o processo.</li>
</ul>
<blockquote>"Para chegar exatamente nessa referência, vamos precisar de [X] sessões. Hoje conseguimos chegar em [resultado], e o atendimento leva em torno de [tempo]."</blockquote>
<p><strong>Nenhum procedimento deverá ser iniciado antes que a cliente compreenda e concorde com o resultado que será realizado.</strong></p>

<h3>PARTE B — Teste de Mecha (tempo médio: 30 minutos)</h3>
<p>O teste de mecha é obrigatório e define a viabilidade e o tempo de ação do processo.</p>
<ol>
  <li>Faz uma avaliação do cabelo da cliente e informa as necessidades.</li>
  <li>Informa todos os produtos que serão utilizados.</li>
  <li>Deixa a cliente sentir o cheiro dos produtos.</li>
</ol>
<ul style="${CHECK}">
  <li>☐ Separar uma mecha discreta (na nuca ou por baixo).</li>
  <li>☐ Preparar a mistura na proporção da marca.</li>
  <li>☐ Aplicar e acompanhar a reação do fio ao longo do tempo.</li>
  <li>☐ Avaliar o ponto de clareamento alcançado e a resistência do fio.</li>
  <li>☐ Definir a volumagem, o tempo de ação e a viabilidade do resultado desejado.</li>
</ul>
<div style="${BOX}">
  <p style="margin:0">Se o teste indicar risco de quebra ou que o resultado não é possível com segurança, <strong>informar a cliente e propor uma alternativa</strong> (menos clareamento, mais sessões, tratamento antes). Não prosseguir em condições que comprometam o fio.</p>
</div>

<h3>PARTE C — Higienização de Preparação</h3>
<ul style="${CHECK}">
  <li>☐ Aplicar o 1º shampoo, emulsionar bem e enxaguar completamente.</li>
  <li>☐ Aplicar o 2º shampoo + massagem no couro cabeludo por 10 minutos.</li>
  <li>☐ Enxaguar completamente.</li>
  <li>☐ Aguardar o tempo de pausa recomendado pela marca.</li>
  <li>☐ Aplicar o condicionador ou a máscara conforme a necessidade.</li>
  <li>☐ Aguardar o tempo recomendado e enxaguar completamente.</li>
  <li>☐ Fazer a touca com a toalha e conduzir a cliente até a cadeira.</li>
</ul>
<p><strong>Preparação para o procedimento:</strong> colocar a capa e o robe, pentear e alinhar o cabelo, e <strong>secar completamente com o secador</strong> antes da aplicação das mechas.</p>

<h3>PARTE D — Aplicação das Mechas (tempo médio: 1 hora)</h3>
<ul style="${CHECK}">
  <li>☐ Aplicar creme de barreira na linha do couro, orelhas e nuca.</li>
  <li>☐ Dividir o cabelo em seções com o pente de ponta fina.</li>
  <li>☐ Preparar a mistura (pó + oxidante) na proporção exata da marca, em tigela não metálica.</li>
  <li>☐ Calçar as luvas antes de iniciar.</li>
  <li>☐ Selecionar as mechas conforme a técnica combinada, mantendo espessura uniforme.</li>
  <li>☐ Aplicar o produto de forma homogênea, sem encostar na raiz além do combinado.</li>
  <li>☐ Isolar cada mecha (papel alumínio, filme ou touca), evitando contato entre elas.</li>
  <li>☐ Limpar imediatamente qualquer respingo na pele.</li>
  <li>☐ Conferir se todas as seções foram cobertas, inclusive nuca e laterais.</li>
</ul>

<h3>PARTE E — Tempo de Ação e Reaplicação (tempo médio: 1 a 2 horas)</h3>
<ul style="${CHECK}">
  <li>☐ Iniciar o cronômetro após concluir a aplicação.</li>
  <li>☐ Registrar o horário de início.</li>
  <li>☐ Acompanhar a evolução do clareamento de perto, sem abandonar a cliente.</li>
  <li>☐ Reaplicar o produto nas áreas que precisarem, conforme a evolução.</li>
  <li>☐ Perguntar à cliente se está sentindo ardência ou incômodo.</li>
  <li>☐ <strong>Não ultrapassar o tempo máximo indicado pelo fabricante.</strong></li>
  <li>☐ Interromper imediatamente se o fio apresentar fragilidade excessiva.</li>
</ul>

<h3>PARTE F — Remoção do Produto</h3>
<ul style="${CHECK}">
  <li>☐ Retirar o papel/filme e enxaguar com água morna, nunca quente, até a água sair limpa.</li>
  <li>☐ Aplicar o 1º shampoo, emulsionar bem e enxaguar completamente.</li>
  <li>☐ Aplicar o 2º shampoo + massagem no couro cabeludo por 10 minutos.</li>
  <li>☐ Enxaguar completamente.</li>
  <li>☐ Aguardar o tempo de pausa recomendado pela marca.</li>
  <li>☐ Aplicar o condicionador ou a máscara conforme a necessidade.</li>
  <li>☐ Aguardar o tempo recomendado e enxaguar sem deixar resíduos.</li>
  <li>☐ Desembaraçar com cuidado (o fio está mais sensível após a descoloração).</li>
  <li>☐ Fazer a touca e conduzir a cliente até a cadeira.</li>
</ul>

<h3>PARTE G — Esfumar</h3>
<p>Na cadeira, realizar o esfumado da raiz para suavizar a transição e naturalizar o resultado, conforme a técnica combinada com a cliente.</p>
<ul style="${CHECK}">
  <li>☐ Avaliar a necessidade e a intensidade do esfumado.</li>
  <li>☐ Aplicar o produto na raiz de forma esfumada, sem marcar linha.</li>
  <li>☐ Controlar o tempo de ação e acompanhar a evolução.</li>
</ul>

<h3>PARTE H — Lavatório: Remoção e Tonalização (quando indicada)</h3>
<p>Retornar ao lavatório para retirar o produto do esfumado. Nesta etapa também pode ser feita a tonalização/matização.</p>
<ol>
  <li>Faz uma avaliação do cabelo da cliente e informa as necessidades.</li>
  <li>Pergunta se a mesma deseja fazer algum tratamento de acordo com a necessidade.</li>
  <li>Informa todos os produtos que serão utilizados.</li>
  <li>Deixa a cliente sentir o cheiro dos produtos.</li>
</ol>
<ul style="${CHECK}">
  <li>☐ Aplicar o tonalizante/matizador quando indicado, respeitando o tempo do fabricante.</li>
  <li>☐ Enxaguar até a água sair limpa.</li>
  <li>☐ Aplicar o 1º shampoo, emulsionar bem e enxaguar completamente.</li>
  <li>☐ Aplicar o 2º shampoo + massagem no couro cabeludo por 10 minutos.</li>
  <li>☐ Enxaguar completamente.</li>
  <li>☐ Aguardar o tempo de pausa recomendado pela marca.</li>
  <li>☐ Aplicar o condicionador ou a máscara conforme a necessidade.</li>
  <li>☐ Aguardar o tempo recomendado e enxaguar sem deixar resíduos.</li>
  <li>☐ Verificar se não restou produto na pele, nas orelhas ou na nuca; remover manchas.</li>
  <li>☐ Fazer a touca e conduzir a cliente até a cadeira.</li>
</ul>

<h3>PARTE I — Finalização</h3>
<ul style="${CHECK}">
  <li>☐ Secar com a toalha, retirando o excesso de água (pressionar, nunca esfregar).</li>
  <li>☐ Colocar a capa de proteção e o robe.</li>
  <li>☐ Aplicar o protetor térmico e os finalizadores.</li>
  <li>☐ Pentear e alinhar o cabelo.</li>
</ul>
<p><strong>Modelagem ou Secagem</strong> — finalizar conforme o POP-PRO-007 (Secagem) ou POP-PRO-008 (Modelagem).</p>
<p><strong>Validação da Cliente</strong> — apresentar o resultado e perguntar obrigatoriamente:</p>
<blockquote>"A senhora gostou do resultado?"</blockquote>
<blockquote>"Existe algum detalhe que gostaria que ajustássemos?"</blockquote>
<p>Utilizar o espelho de mão para mostrar a parte de trás e as laterais. <strong>O atendimento somente poderá ser encerrado após a aprovação da cliente.</strong></p>
<p><strong>Orientações de Manutenção</strong></p>
<ul style="${CHECK}">
  <li>☐ Orientar o uso de shampoo sem sal e produtos para cabelos com química.</li>
  <li>☐ Recomendar o cronograma capilar para manter a saúde do fio.</li>
  <li>☐ Orientar sobre o matizador de manutenção em casa (quando indicado).</li>
  <li>☐ Orientar sobre sol, piscina e mar.</li>
  <li>☐ Informar a data ideal da manutenção da raiz.</li>
  <li>☐ Oferecer os produtos de manutenção e o reagendamento.</li>
</ul>

<h3>PARTE J — Registro e Organização</h3>
<ul style="${CHECK}">
  <li>☐ Registrar a volumagem, a proporção e o pó utilizado.</li>
  <li>☐ Registrar o tom do tonalizante e o tempo de ação efetivo.</li>
  <li>☐ Registrar o resultado obtido e as observações.</li>
  <li>☐ Registrar qualquer reação ou intercorrência.</li>
  <li>☐ Registrar o serviço e os produtos vendidos no sistema.</li>
  <li>☐ Lavar a tigela e o pincel, higienizar a estação e o lavatório.</li>
</ul>

<h2>8. Indicadores de Qualidade</h2>
<p>A gerência deverá acompanhar mensalmente:</p>
<ul style="${CHECK}">
  <li>☐ Realização do teste de mecha em 100% dos atendimentos.</li>
  <li>☐ Registro da fórmula em 100% dos atendimentos.</li>
  <li>☐ Número de correções de cor.</li>
  <li>☐ Número de casos de quebra ou danos ao fio.</li>
  <li>☐ Número de reclamações sobre o resultado.</li>
  <li>☐ Índice de satisfação da cliente.</li>
  <li>☐ Percentual de retorno para manutenção.</li>
  <li>☐ Adesão ao cronograma capilar pós-química.</li>
</ul>

<h2>9. Checklist de Auditoria</h2>
<div style="${BOX}">
  <div style="${BOXH}">Apresentação e Segurança</div>
  <ul style="${CHECK}">
    <li>☐ Apresentou-se de frente para a cliente, com nome.</li>
    <li>☐ Confirmou o serviço (mechas).</li>
    <li>☐ Perguntou o que a cliente desejava e se havia referência.</li>
    <li>☐ Realizou a anamnese completa (henna, química anterior, alergia, couro).</li>
    <li>☐ Realizou o teste de mecha.</li>
    <li>☐ Informou quantas sessões e a duração do atendimento.</li>
    <li>☐ Fez as ponderações do que dá e do que não dá para fazer.</li>
  </ul>
  <div style="${BOXH}">Preparação e Aplicação</div>
  <ul style="${CHECK}">
    <li>☐ Fez a higienização de preparação (1º e 2º shampoo + massagem).</li>
    <li>☐ Secou o cabelo completamente antes da aplicação.</li>
    <li>☐ Aplicou creme de barreira na linha do couro.</li>
    <li>☐ Preparou a mistura na proporção exata, em tigela não metálica.</li>
    <li>☐ Utilizou luvas durante todo o manuseio.</li>
    <li>☐ Manteve espessura uniforme das mechas.</li>
    <li>☐ Aplicou de forma homogênea e isolou as mechas.</li>
    <li>☐ Limpou os respingos na pele imediatamente.</li>
  </ul>
  <div style="${BOXH}">Ação, Remoção e Esfumar</div>
  <ul style="${CHECK}">
    <li>☐ Cronometrou o tempo de ação e acompanhou de perto.</li>
    <li>☐ Reaplicou nas áreas necessárias.</li>
    <li>☐ Não ultrapassou o tempo do fabricante.</li>
    <li>☐ Removeu com água morna e fez a higienização.</li>
    <li>☐ Desembaraçou com cuidado.</li>
    <li>☐ Realizou o esfumar sem marcar linha.</li>
  </ul>
  <div style="${BOXH}">Tonalização e Finalização</div>
  <ul style="${CHECK}">
    <li>☐ Fez a avaliação e ofereceu tratamento no lavatório.</li>
    <li>☐ Aplicou o tonalizante respeitando o tempo (quando indicado).</li>
    <li>☐ Removeu as manchas da pele.</li>
    <li>☐ Aplicou protetor térmico e finalizou com secagem ou modelagem.</li>
    <li>☐ Mostrou o resultado e perguntou se a cliente gostou.</li>
    <li>☐ Orientou sobre a manutenção e o cronograma.</li>
    <li>☐ Registrou a fórmula utilizada.</li>
    <li>☐ Lavou a tigela e o pincel e organizou a estação.</li>
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
        { id: 'pop-pro-006', titulo: 'POP-PRO-006 · Tratamentos Capilares (Lavatório)', texto: PRO_TRATAMENTOS_HTML },
        { id: 'pop-pro-007', titulo: 'POP-PRO-007 · Secagem', texto: PRO_SECAGEM_HTML },
        { id: 'pop-pro-008', titulo: 'POP-PRO-008 · Modelagem', texto: PRO_MODELAGEM_HTML },
        { id: 'pop-pro-009', titulo: 'POP-PRO-009 · Chapinha', texto: PRO_CHAPINHA_HTML },
        { id: 'pop-pro-010', titulo: 'POP-PRO-010 · Babyliss', texto: PRO_BABYLISS_HTML },
        { id: 'pop-pro-011', titulo: 'POP-PRO-011 · Penteado', texto: PRO_PENTEADO_HTML },
        { id: 'pop-pro-012', titulo: 'POP-PRO-012 · Pigmentação', texto: PRO_PIGMENTACAO_HTML },
        { id: 'pop-pro-013', titulo: 'POP-PRO-013 · Ganhar Habilidade', texto: PRO_GANHAR_HABILIDADE_HTML },
        { id: 'pop-pro-014', titulo: 'POP-PRO-014 · Henna Capilar', texto: PRO_HENNA_HTML },
        { id: 'pop-pro-015', titulo: 'POP-PRO-015 · Mechas', texto: PRO_MECHAS_HTML },
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
