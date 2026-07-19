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

export type ConteudoDoc = { id: string; titulo: string; texto: string }
export const CONTEUDO_DEFAULTS: Record<string, { titulo: string; conteudo: { texto?: string; docs?: ConteudoDoc[] } }> = {
  manicure: { titulo: 'POP — Atendimento de Manicure', conteudo: { texto: MANICURE_HTML } },
  recepcao: {
    titulo: 'Processos da Recepção',
    conteudo: {
      docs: [
        { id: 'pop-rec-001', titulo: 'POP-REC-001 · Atendimento Presencial', texto: REC_PRESENCIAL_HTML },
        { id: 'pop-rec-002', titulo: 'POP-REC-002 · Atendimento via WhatsApp', texto: REC_WHATSAPP_HTML },
        { id: 'pop-rec-003', titulo: 'POP-REC-003 · Atendimento Telefônico', texto: REC_TELEFONE_HTML },
      ],
    },
  },
}
