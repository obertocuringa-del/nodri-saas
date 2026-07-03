// Conteúdos padrão de páginas (POPs, guias). Aparecem na página do salão
// e já vêm preenchidos no Editor de Páginas do admin para editar e salvar.
// Chave = slug da página (/conteudo/<slug>). Some quando o admin salva a sua versão.

const META = 'background:#faf9f7;border:1px solid #e8e6e0;border-left:4px solid #5b4fcf;border-radius:10px;padding:12px 16px;margin:0 0 18px'
const BOX = 'background:#f6f4ff;border:1px solid #e0dbff;border-radius:10px;padding:10px 14px;margin:14px 0'
const TEMPO = 'display:inline-block;background:#eef2ff;border:1px solid #c9d2ff;color:#3b3a86;border-radius:999px;padding:3px 12px;font-size:12px;font-weight:600;margin:6px 0 0'
const CHECK = 'list-style:none;padding-left:0;margin:6px 0;line-height:2'

const MANICURE_HTML = `
<h1>POP — Atendimento de Manicure</h1>
<div style="${META}">
  <p style="margin:0"><strong>Código:</strong> POP-MAN-001 &nbsp;·&nbsp; <strong>Versão:</strong> 1.0 &nbsp;·&nbsp; <strong>Setor:</strong> Manicure</p>
  <p style="margin:6px 0 0"><strong>Responsável:</strong> Gerência Técnica</p>
  <p style="margin:6px 0 0"><strong>Objetivo:</strong> Padronizar o atendimento de manicure, garantindo excelência no atendimento, biossegurança, qualidade técnica e uma experiência diferenciada para todas as clientes.</p>
</div>

<h2>1. Apresentação da Profissional</h2>
<h3>Objetivo</h3>
<p>Criar conexão com a cliente, entender sua expectativa e transmitir segurança.</p>
<p>A profissional deverá se posicionar de frente para a cliente, sorrir, manter contato visual e cumprimentá-la cordialmente.</p>
<p><strong>Padrão de atendimento:</strong></p>
<blockquote>"Olá, Ana! Seja bem-vinda. Meu nome é Maria e hoje serei a responsável pelo seu atendimento."</blockquote>
<p>Em seguida:</p>
<ul>
  <li>Confirmar o serviço agendado.</li>
  <li>Perguntar:
    <ul>
      <li>"Hoje iremos realizar o serviço de mãos, correto?"</li>
      <li>"O que você pensou para hoje?"</li>
      <li>"Tem alguma cor ou foto de referência?"</li>
    </ul>
  </li>
  <li>Ouvir atentamente a cliente.</li>
  <li>Fazer as orientações necessárias, explicando o que é possível realizar e quais limitações técnicas podem existir.</li>
</ul>
<p><span style="${TEMPO}">⏱ Tempo estimado: 2 minutos</span></p>

<h2>2. Preparação</h2>
<h3>Objetivo</h3>
<p>Garantir biossegurança e transmitir confiança antes do início do atendimento.</p>
<h3>Aparência da Profissional</h3>
<p>Antes de iniciar:</p>
<ul>
  <li>Uniforme limpo.</li>
  <li>Cabelo preso.</li>
  <li>Mãos higienizadas.</li>
  <li>Aparência organizada.</li>
  <li>Não utilizar celular durante o atendimento.</li>
</ul>
<h3>Equipamentos de Proteção</h3>
<ul>
  <li>Colocar um par de luvas descartáveis novas.</li>
  <li>Utilizar máscara limpa, quando necessário.</li>
</ul>
<h3>Materiais</h3>
<p>Apresentar para a cliente:</p>
<ul>
  <li>Kit descartável lacrado.</li>
  <li>Alicates esterilizados.</li>
  <li>Materiais limpos e organizados.</li>
</ul>
<p><strong>Nunca utilizar materiais sem esterilização ou sem identificação.</strong></p>
<p><span style="${TEMPO}">⏱ Tempo estimado: 3 minutos</span></p>

<h2>3. Execução do Procedimento</h2>
<h3>Objetivo</h3>
<p>Executar o procedimento de forma técnica e padronizada. Seguir rigorosamente esta sequência:</p>
<ol>
  <li>Remover completamente o esmalte anterior.</li>
  <li>Cortar as unhas (quando necessário).</li>
  <li>Lixar e definir o formato.</li>
  <li>Aplicar luvas ou botinhas amolecedoras (quando aplicável).</li>
  <li>Realizar a cuticulagem.</li>
  <li>Limpar resíduos.</li>
  <li>Aplicar a base.</li>
  <li>Esmaltar conforme escolha da cliente.</li>
  <li>Limpar os cantos.</li>
  <li>Aplicar spray secante ou óleo secante.</li>
</ol>
<p>Durante todo o procedimento:</p>
<ul>
  <li>Confirmar se a cliente está confortável.</li>
  <li>Manter postura profissional.</li>
  <li>Evitar conversas inadequadas.</li>
  <li>Não utilizar celular.</li>
  <li>Manter bancada limpa e organizada.</li>
</ul>
<p><span style="${TEMPO}">⏱ Tempo estimado: 35 a 50 minutos</span></p>

<h2>4. Controle de Qualidade</h2>
<p>Antes da finalização, verificar obrigatoriamente:</p>
<div style="${BOX}">
  <ul style="${CHECK}">
    <li>☐ Formato uniforme das unhas.</li>
    <li>☐ Comprimento alinhado.</li>
    <li>☐ Cutículas bem finalizadas.</li>
    <li>☐ Esmaltação uniforme.</li>
    <li>☐ Sem manchas.</li>
    <li>☐ Sem bolhas.</li>
    <li>☐ Sem borrões.</li>
    <li>☐ Cantos limpos.</li>
    <li>☐ Cobertura completa.</li>
    <li>☐ Secagem adequada.</li>
  </ul>
</div>
<p>Caso exista qualquer imperfeição, realizar o ajuste antes de apresentar o resultado à cliente.</p>

<h2>5. Validação da Cliente</h2>
<p>Mostrar o resultado final. Perguntar:</p>
<blockquote>"Gostou do resultado? Há algum detalhe que gostaria que ajustássemos?"</blockquote>
<p>Caso haja qualquer observação, realizar o ajuste imediatamente. Somente considerar o atendimento finalizado após a aprovação da cliente.</p>

<h2>6. Reagendamento</h2>
<p>Antes da cliente deixar o salão, perguntar:</p>
<blockquote>"Gostaria de deixar seu próximo atendimento agendado? Assim garantimos o melhor horário para você."</blockquote>
<p>Caso a cliente aceite:</p>
<ul>
  <li>Registrar o agendamento.</li>
  <li>Confirmar data e horário.</li>
</ul>
<p>Caso não aceite: informar que será um prazer recebê-la novamente.</p>

<h2>7. Finalização</h2>
<p>A profissional deverá:</p>
<ul>
  <li>Orientar sobre os cuidados para aumentar a durabilidade da esmaltação.</li>
  <li>Organizar completamente a estação de trabalho.</li>
  <li>Descartar corretamente os materiais utilizados.</li>
  <li>Encaminhar os instrumentos para esterilização.</li>
  <li>Agradecer a preferência.</li>
</ul>
<p><strong>Padrão de despedida:</strong></p>
<blockquote>"Muito obrigada pela preferência! Foi um prazer atendê-la. Esperamos você novamente. Tenha um excelente dia!"</blockquote>

<h2>8. Não Conformidades</h2>
<p>Caso ocorra qualquer uma das situações abaixo, comunicar imediatamente a gerência:</p>
<ul>
  <li>Cliente sofreu algum corte.</li>
  <li>Instrumento caiu no chão.</li>
  <li>Material apresentou defeito.</li>
  <li>Esmalte vencido.</li>
  <li>Cliente demonstrou insatisfação.</li>
  <li>Falta de materiais.</li>
  <li>Atraso superior ao tempo previsto.</li>
</ul>
<p>Registrar a ocorrência conforme procedimento interno.</p>

<h2>9. Indicadores de Qualidade</h2>
<p>A equipe deverá acompanhar mensalmente:</p>
<ul>
  <li>Tempo médio do atendimento.</li>
  <li>Índice de retrabalho.</li>
  <li>Número de reclamações.</li>
  <li>Percentual de reagendamentos.</li>
  <li>Avaliação de satisfação da cliente.</li>
  <li>Venda de serviços complementares.</li>
</ul>

<h2>✔ 10. Checklist Obrigatório</h2>
<div style="${BOX}">
  <h3 style="margin-top:0">Atendimento</h3>
  <ul style="${CHECK}">
    <li>☐ Cumprimentou e se apresentou.</li>
    <li>☐ Confirmou o serviço.</li>
    <li>☐ Entendeu a expectativa da cliente.</li>
    <li>☐ Orientou sobre possibilidades e limitações.</li>
  </ul>
  <h3>Biossegurança</h3>
  <ul style="${CHECK}">
    <li>☐ Luvas novas.</li>
    <li>☐ Máscara limpa (quando aplicável).</li>
    <li>☐ Kit lacrado apresentado.</li>
    <li>☐ Alicates esterilizados apresentados.</li>
  </ul>
  <h3>Procedimento</h3>
  <ul style="${CHECK}">
    <li>☐ Removeu o esmalte.</li>
    <li>☐ Cortou as unhas (quando necessário).</li>
    <li>☐ Lixou.</li>
    <li>☐ Cuticulagem.</li>
    <li>☐ Aplicou base.</li>
    <li>☐ Esmaltou.</li>
    <li>☐ Limpou os cantos.</li>
    <li>☐ Aplicou spray ou óleo secante.</li>
  </ul>
  <h3>Controle de Qualidade</h3>
  <ul style="${CHECK}">
    <li>☐ Conferiu acabamento.</li>
    <li>☐ Corrigiu imperfeições.</li>
    <li>☐ Cliente aprovou o resultado.</li>
  </ul>
  <h3>Encerramento</h3>
  <ul style="${CHECK}">
    <li>☐ Ofereceu reagendamento.</li>
    <li>☐ Orientou sobre os cuidados.</li>
    <li>☐ Agradeceu a cliente.</li>
    <li>☐ Organizou a estação de trabalho.</li>
    <li>☐ Encaminhou os materiais para esterilização.</li>
  </ul>
</div>
`.trim()

export const CONTEUDO_DEFAULTS: Record<string, { titulo: string; conteudo: { texto: string } }> = {
  manicure: { titulo: 'POP — Atendimento de Manicure', conteudo: { texto: MANICURE_HTML } },
}
