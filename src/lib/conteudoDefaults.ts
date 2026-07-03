// Conteúdos padrão de páginas (POPs, guias). Aparecem na página do salão
// e já vêm preenchidos no Editor de Páginas do admin para editar e salvar.
// Chave = slug da página (/conteudo/<slug>). Some quando o admin salva a sua versão.

const META = 'background:#faf9f7;border:1px solid #e8e6e0;border-left:4px solid #5b4fcf;border-radius:10px;padding:12px 16px;margin:0 0 18px'
const BOX = 'background:#f6f4ff;border:1px solid #e0dbff;border-radius:10px;padding:10px 14px;margin:14px 0'

const MANICURE_HTML = `
<h1>POP — Atendimento de Manicure</h1>
<div style="${META}">
  <p style="margin:0"><strong>Código:</strong> POP-MAN-001 &nbsp;·&nbsp; <strong>Setor:</strong> Manicure</p>
  <p style="margin:6px 0 0"><strong>Objetivo:</strong> Padronizar o atendimento, garantindo qualidade, segurança, higiene e excelência na experiência da cliente.</p>
</div>

<h2>1. Recepção e Apresentação</h2>
<p>Ao receber a cliente, a profissional deverá se posicionar de frente, cumprimentá-la cordialmente e se apresentar.</p>
<blockquote>"Olá, Ana! Seja bem-vinda. Meu nome é Maria e hoje serei a responsável pelo seu atendimento."</blockquote>
<p>Em seguida:</p>
<ul>
  <li>Confirmar o serviço agendado.</li>
  <li>Perguntar qual o resultado desejado.</li>
  <li>Identificar preferências de cor, formato ou acabamento.</li>
  <li>Solicitar, se houver, fotos de referência.</li>
  <li>Explicar de forma profissional o que é possível realizar e orientar sobre eventuais limitações técnicas.</li>
</ul>

<h2>2. Preparação</h2>
<h3>Higienização e EPIs</h3>
<ul>
  <li>Colocar um par de luvas descartáveis novas.</li>
  <li>Colocar máscara limpa e nova (quando aplicável).</li>
</ul>
<h3>Materiais</h3>
<p>Apresentar à cliente:</p>
<ul>
  <li>Kit de materiais lacrado.</li>
  <li>Alicates devidamente esterilizados.</li>
  <li>Demais materiais organizados e higienizados.</li>
</ul>

<h2>3. Execução do Procedimento</h2>
<p>Seguir obrigatoriamente a seguinte sequência:</p>
<ol>
  <li>Remover completamente o esmalte anterior.</li>
  <li>Cortar as unhas (quando solicitado).</li>
  <li>Lixar e modelar o formato desejado.</li>
  <li>Colocar luvas ou botinhas amolecedoras, quando necessário.</li>
  <li>Realizar a cuticulagem.</li>
  <li>Limpar completamente resíduos.</li>
  <li>Aplicar a base.</li>
  <li>Aplicar o esmalte conforme a escolha da cliente.</li>
  <li>Realizar a limpeza dos cantos.</li>
  <li>Aplicar spray secante ou óleo secante, conforme o procedimento.</li>
</ol>

<h2>4. Controle de Qualidade</h2>
<p>Antes de finalizar o atendimento, a profissional deverá verificar:</p>
<ul>
  <li>Uniformidade da esmaltação.</li>
  <li>Cobertura completa.</li>
  <li>Acabamento dos cantos.</li>
  <li>Formato das unhas.</li>
  <li>Ausência de resíduos.</li>
  <li>Ausência de borrões.</li>
  <li>Secagem adequada.</li>
</ul>
<p>Caso identifique qualquer imperfeição, realizar imediatamente o ajuste necessário.</p>

<h2>5. Validação com a Cliente</h2>
<p>Apresentar o resultado final à cliente e perguntar:</p>
<blockquote>"Gostou do resultado? Há algum detalhe que gostaria que eu ajustasse?"</blockquote>
<p>Caso haja solicitação, realizar os ajustes antes da finalização.</p>

<h2>6. Reagendamento</h2>
<p>Antes da saída da cliente, perguntar:</p>
<blockquote>"Gostaria de deixar seu próximo atendimento já agendado? Assim conseguimos garantir o melhor horário para você."</blockquote>
<p>Realizar o agendamento, quando houver interesse.</p>

<h2>7. Finalização</h2>
<p>A profissional deverá:</p>
<ul>
  <li>Orientar sobre os cuidados após o procedimento.</li>
  <li>Agradecer pela preferência.</li>
  <li>Despedir-se cordialmente.</li>
</ul>
<blockquote>"Foi um prazer atendê-la. Muito obrigada pela preferência! Esperamos vê-la novamente em breve. Tenha um excelente dia!"</blockquote>

<h2>✔ Checklist do Procedimento</h2>
<div style="${BOX}">
  <ul style="list-style:none;padding-left:0;margin:0;line-height:2">
    <li>☐ Cumprimentou e se apresentou.</li>
    <li>☐ Confirmou o serviço.</li>
    <li>☐ Identificou as expectativas da cliente.</li>
    <li>☐ Orientou sobre possibilidades e limitações.</li>
    <li>☐ Higienizou as mãos.</li>
    <li>☐ Utilizou luvas novas.</li>
    <li>☐ Utilizou máscara limpa.</li>
    <li>☐ Apresentou o kit lacrado.</li>
    <li>☐ Apresentou os alicates esterilizados.</li>
    <li>☐ Removeu o esmalte.</li>
    <li>☐ Cortou as unhas (quando necessário).</li>
    <li>☐ Lixou e modelou.</li>
    <li>☐ Realizou a cuticulagem.</li>
    <li>☐ Aplicou a base.</li>
    <li>☐ Esmaltou.</li>
    <li>☐ Fez a limpeza dos cantos.</li>
    <li>☐ Aplicou spray ou óleo secante.</li>
    <li>☐ Conferiu a qualidade do serviço.</li>
    <li>☐ Confirmou a satisfação da cliente.</li>
    <li>☐ Ofereceu o reagendamento.</li>
    <li>☐ Agradeceu e finalizou o atendimento.</li>
  </ul>
</div>
`.trim()

export const CONTEUDO_DEFAULTS: Record<string, { titulo: string; conteudo: { texto: string } }> = {
  manicure: { titulo: 'POP — Atendimento de Manicure', conteudo: { texto: MANICURE_HTML } },
}
