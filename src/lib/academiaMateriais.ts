// ── Materiais para imprimir ─────────────────────────────────────────────────
//
// Os artigos da Academia explicam o que fazer. Estes são os documentos que a
// pessoa leva para a mesa: formulário em branco, para preencher à mão ou
// preencher no computador antes de imprimir.
//
// Cada um é o par prático de um artigo — e a razão de existirem separados é
// que ninguém imprime um artigo para usar de ficha. A ficha precisa de linha
// para escrever, quadro para assinar e espaço em branco.
//
// O corpo é HTML solto, montado com as classes do CSS de impressão da página
// (ver imprimirMaterial em /salon/academia/materiais). Sem dado de nenhum
// salão: o cabeçalho recebe a logo de quem está imprimindo.

export interface Material {
  id: string
  titulo: string
  descricao: string
  quando: string
  artigo?: string   // título do artigo da Academia que explica o uso
  corpo: string
}

const LINHA = '<div class="linha"></div>'
const LINHAS = (n: number) => LINHA.repeat(n)

export const MATERIAIS: Material[] = [
  {
    id: 'pop-em-branco',
    titulo: 'POP — Procedimento Operacional Padrão',
    descricao: 'Modelo em branco para escrever o passo a passo de uma tarefa do salão.',
    quando: 'Uma folha por tarefa. Comece pela abertura e pelo fechamento.',
    artigo: 'Como escrever o POP do seu salão',
    corpo: `
<h1>Procedimento Operacional Padrão</h1>
<table class="grade">
  <tr><td class="rot">Tarefa</td><td></td></tr>
  <tr><td class="rot">Responsável</td><td></td></tr>
  <tr><td class="rot">Quando acontece</td><td></td></tr>
  <tr><td class="rot">Revisado em</td><td></td></tr>
</table>

<h2>Passo a passo</h2>
<p class="sub">Uma ação por linha, na ordem em que acontece. Frase curta, começando por verbo.</p>
<table class="grade num">
  ${Array.from({ length: 12 }, (_, i) => `<tr><td class="n">${i + 1}</td><td></td></tr>`).join('')}
</table>

<h2>Como saber que ficou certo</h2>
<p class="sub">O resultado esperado, em uma frase. É o que permite conferir sem perguntar.</p>
${LINHAS(2)}

<h2>O que costuma dar errado</h2>
${LINHAS(2)}

<div class="assin">
  <div><div class="linha"></div><span>Responsável pela tarefa</span></div>
  <div><div class="linha"></div><span>Gestão</span></div>
</div>`,
  },

  {
    id: 'pauta-reuniao',
    titulo: 'Pauta de reunião de equipe',
    descricao: 'Formulário de uma página: números do mês, pendências da última e combinados novos.',
    quando: 'Uma por reunião. Leve preenchida na parte dos números.',
    artigo: 'Reunião de equipe: as pautas do ano inteiro',
    corpo: `
<h1>Reunião de equipe</h1>
<table class="grade">
  <tr><td class="rot">Data</td><td></td><td class="rot">Duração prevista</td><td></td></tr>
  <tr><td class="rot">Tema do mês</td><td colspan="3"></td></tr>
  <tr><td class="rot">Presentes</td><td colspan="3"></td></tr>
</table>

<h2>1. Os números do mês</h2>
<table class="grade">
  <tr><th>Indicador</th><th>Mês anterior</th><th>Este mês</th></tr>
  <tr><td class="rot">Faturamento</td><td></td><td></td></tr>
  <tr><td class="rot">Ticket médio</td><td></td><td></td></tr>
  <tr><td class="rot">Ocupação da agenda</td><td></td><td></td></tr>
  <tr><td class="rot">Clientes que voltaram</td><td></td><td></td></tr>
</table>

<h2>2. O que foi combinado na última — e o que aconteceu</h2>
<p class="sub">Sem este item, tudo o que se combina morre na porta.</p>
<table class="grade">
  <tr><th>Combinado</th><th>Quem</th><th>Feito?</th></tr>
  ${Array.from({ length: 4 }, () => '<tr><td></td><td></td><td></td></tr>').join('')}
</table>

<h2>3. Tema do mês</h2>
${LINHAS(5)}

<h2>4. Combinados novos</h2>
<table class="grade">
  <tr><th>O quê</th><th>Quem</th><th>Até quando</th></tr>
  ${Array.from({ length: 5 }, () => '<tr><td></td><td></td><td></td></tr>').join('')}
</table>

<h2>5. Uma volta: cada pessoa fala uma coisa que precisa</h2>
${LINHAS(4)}`,
  },

  {
    id: 'ficha-anamnese',
    titulo: 'Ficha de anamnese',
    descricao: 'Ficha de avaliação e histórico, com assinatura da cliente. Obrigatória em química.',
    quando: 'Na primeira visita. Depois só atualize.',
    artigo: 'Ficha de anamnese: o que perguntar e por quê',
    corpo: `
<h1>Ficha de anamnese</h1>
<table class="grade">
  <tr><td class="rot">Cliente</td><td colspan="3"></td></tr>
  <tr><td class="rot">Telefone</td><td></td><td class="rot">Nascimento</td><td></td></tr>
  <tr><td class="rot">Data</td><td></td><td class="rot">Profissional</td><td></td></tr>
</table>

<h2>Saúde</h2>
<table class="grade sn">
  <tr><th>Pergunta</th><th>Sim</th><th>Não</th><th>Qual / observação</th></tr>
  <tr><td>Alergia a produto, medicamento ou material</td><td></td><td></td><td></td></tr>
  <tr><td>Problema de pele ou couro cabeludo</td><td></td><td></td><td></td></tr>
  <tr><td>Gestante ou amamentando</td><td></td><td></td><td></td></tr>
  <tr><td>Medicação de uso contínuo</td><td></td><td></td><td></td></tr>
  <tr><td>Tratamento de saúde recente</td><td></td><td></td><td></td></tr>
</table>

<h2>Histórico do cabelo</h2>
<table class="grade sn">
  <tr><th>Pergunta</th><th>Sim</th><th>Não</th><th>Qual / quando</th></tr>
  <tr><td>Química nos últimos 12 meses</td><td></td><td></td><td></td></tr>
  <tr><td>Alisamento, progressiva ou relaxamento</td><td></td><td></td><td></td></tr>
  <tr><td>Henna, tintura de farmácia ou produto caseiro</td><td></td><td></td><td></td></tr>
  <tr><td>Já teve reação a algum procedimento</td><td></td><td></td><td></td></tr>
</table>
<p class="sub">A pergunta sobre produto caseiro é a que mais evita acidente de química. Não pule.</p>

<h2>Expectativa</h2>
${LINHAS(2)}

<h2>Teste de mecha</h2>
<table class="grade">
  <tr><td class="rot">Realizado em</td><td></td><td class="rot">Resultado</td><td></td></tr>
</table>

<h2>Orientação dada</h2>
<p class="sub">Registre também quando a orientação foi contrária ao que a cliente queria, e ela optou por seguir.</p>
${LINHAS(3)}

<div class="quadro">
Declaro que as informações acima são verdadeiras e que fui orientada sobre os
riscos e os resultados esperados do procedimento.
</div>

<div class="assin">
  <div><div class="linha"></div><span>Assinatura da cliente</span></div>
  <div><div class="linha"></div><span>Profissional responsável</span></div>
</div>`,
  },

  {
    id: 'termo-imagem',
    titulo: 'Termo de autorização de uso de imagem',
    descricao: 'Autorização para publicar foto e vídeo da cliente, com canais e prazo definidos.',
    quando: 'Antes de publicar qualquer antes e depois. Uma vez por cliente.',
    artigo: 'Direito de imagem: o antes e depois que dá problema',
    corpo: `
<h1>Autorização de uso de imagem</h1>
<table class="grade">
  <tr><td class="rot">Nome</td><td colspan="3"></td></tr>
  <tr><td class="rot">Documento</td><td></td><td class="rot">Telefone</td><td></td></tr>
</table>

<p>Autorizo o uso da minha imagem, em fotografia e vídeo, feitos neste
estabelecimento, para as finalidades assinaladas abaixo.</p>

<h2>Onde a imagem pode ser usada</h2>
<table class="grade sn">
  <tr><th>Canal</th><th>Autorizo</th><th>Não autorizo</th></tr>
  <tr><td>Redes sociais do estabelecimento</td><td></td><td></td></tr>
  <tr><td>Site e material impresso</td><td></td><td></td></tr>
  <tr><td>Anúncio pago</td><td></td><td></td></tr>
  <tr><td>Portfólio da profissional que atendeu</td><td></td><td></td></tr>
</table>
<p class="sub">Anúncio pago é diferente de publicação comum, e por isso vai em linha separada.</p>

<h2>Prazo</h2>
<table class="grade">
  <tr><td class="rot">Válido por</td><td></td><td class="rot">A partir de</td><td></td></tr>
</table>

<div class="quadro">
Esta autorização é gratuita. Posso revogá-la a qualquer momento, por escrito,
e o estabelecimento se compromete a retirar de circulação o material publicado
a partir do pedido.
</div>

<h2>Menor de idade</h2>
<p class="sub">Quando a pessoa fotografada for menor, a autorização é do responsável.</p>
<table class="grade">
  <tr><td class="rot">Responsável</td><td colspan="3"></td></tr>
  <tr><td class="rot">Documento</td><td></td><td class="rot">Parentesco</td><td></td></tr>
</table>

<div class="assin">
  <div><div class="linha"></div><span>Assinatura</span></div>
  <div><div class="linha"></div><span>Local e data</span></div>
</div>`,
  },

  {
    id: 'termo-entrega',
    titulo: 'Termo de entrega de material e uniforme',
    descricao: 'Registro do que foi entregue à profissional, com data e devolução.',
    quando: 'No primeiro dia. Sem ele, não há como descontar nada depois.',
    artigo: 'Organograma do salão: quem responde pelo quê',
    corpo: `
<h1>Entrega de material e uniforme</h1>
<table class="grade">
  <tr><td class="rot">Profissional</td><td colspan="3"></td></tr>
  <tr><td class="rot">Documento</td><td></td><td class="rot">Função</td><td></td></tr>
  <tr><td class="rot">Data de entrada</td><td></td><td class="rot">Vínculo</td><td></td></tr>
</table>

<h2>Itens entregues</h2>
<table class="grade">
  <tr><th>Item</th><th>Qtd</th><th>Entrega</th><th>Devolução</th><th>Estado</th></tr>
  ${Array.from({ length: 10 }, () => '<tr><td></td><td></td><td></td><td></td><td></td></tr>').join('')}
</table>

<h2>Equipamento de proteção</h2>
<table class="grade">
  <tr><th>EPI</th><th>Qtd</th><th>Data</th><th>Assinatura</th></tr>
  ${Array.from({ length: 4 }, () => '<tr><td></td><td></td><td></td><td></td></tr>').join('')}
</table>
<p class="sub">O registro de entrega de EPI é um dos itens verificados em fiscalização.</p>

<div class="quadro">
Declaro ter recebido os itens acima, em condição de uso, e me comprometo a
devolvê-los ao término da relação de trabalho, no mesmo estado, ressalvado o
desgaste natural.
</div>

<div class="assin">
  <div><div class="linha"></div><span>Profissional</span></div>
  <div><div class="linha"></div><span>Gestão</span></div>
</div>`,
  },

  {
    id: 'roteiro-entrevista',
    titulo: 'Roteiro de entrevista',
    descricao: 'As perguntas de postura e de rotina, com espaço para nota e conclusão.',
    quando: 'Em toda entrevista. Técnica se testa; o resto só sai se alguém perguntar.',
    artigo: 'Como contratar: divulgação de vagas e seleção',
    corpo: `
<h1>Roteiro de entrevista</h1>
<table class="grade">
  <tr><td class="rot">Candidata(o)</td><td colspan="3"></td></tr>
  <tr><td class="rot">Vaga</td><td></td><td class="rot">Data</td><td></td></tr>
  <tr><td class="rot">Entrevistador</td><td></td><td class="rot">Indicação de</td><td></td></tr>
</table>

<h2>Trajetória</h2>
<table class="grade q">
  <tr><td class="rot">Onde trabalhou antes e por quanto tempo</td><td></td></tr>
  <tr><td class="rot">Por que saiu do último lugar</td><td></td></tr>
  <tr><td class="rot">O que fazia melhor lá</td><td></td></tr>
</table>

<h2>Postura</h2>
<table class="grade q">
  <tr><td class="rot">O que você espera do espaço onde trabalha</td><td></td></tr>
  <tr><td class="rot">Como você lida com uma cliente insatisfeita</td><td></td></tr>
  <tr><td class="rot">O que você faz num dia sem agendamento</td><td></td></tr>
  <tr><td class="rot">Como prefere receber uma correção</td><td></td></tr>
</table>

<h2>Rotina e disponibilidade</h2>
<table class="grade q">
  <tr><td class="rot">Dias e horários disponíveis</td><td></td></tr>
  <tr><td class="rot">Situação do CNPJ, quando aplicável</td><td></td></tr>
  <tr><td class="rot">Pretende continuar estudando o quê</td><td></td></tr>
</table>

<h2>Avaliação</h2>
<table class="grade">
  <tr><th>Critério</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th></tr>
  <tr><td>Técnica demonstrada</td><td></td><td></td><td></td><td></td><td></td></tr>
  <tr><td>Comunicação</td><td></td><td></td><td></td><td></td><td></td></tr>
  <tr><td>Postura profissional</td><td></td><td></td><td></td><td></td><td></td></tr>
  <tr><td>Alinhamento com a casa</td><td></td><td></td><td></td><td></td><td></td></tr>
</table>

<h2>Conclusão</h2>
${LINHAS(3)}`,
  },

  {
    id: 'checklist-abertura',
    titulo: 'Check list de abertura e fechamento',
    descricao: 'A folha do dia: o que conferir antes de abrir a porta e antes de apagar a luz.',
    quando: 'Uma por dia, assinada por quem abriu e por quem fechou.',
    artigo: 'A rotina do gestor: o que olhar por dia, semana e mês',
    corpo: `
<h1>Abertura e fechamento</h1>
<table class="grade">
  <tr><td class="rot">Data</td><td></td><td class="rot">Abriu</td><td></td><td class="rot">Fechou</td><td></td></tr>
</table>

<h2>Abertura</h2>
<table class="grade ck">
  <tr><th>Feito</th><th>Item</th><th>Observação</th></tr>
  <tr><td></td><td>Luzes, música e climatização ligadas</td><td></td></tr>
  <tr><td></td><td>Recepção e área de espera organizadas</td><td></td></tr>
  <tr><td></td><td>Banheiro conferido e abastecido</td><td></td></tr>
  <tr><td></td><td>Café e água preparados</td><td></td></tr>
  <tr><td></td><td>Bancadas e estações limpas</td><td></td></tr>
  <tr><td></td><td>Toalhas limpas em quantidade</td><td></td></tr>
  <tr><td></td><td>Agenda do dia conferida, profissional por profissional</td><td></td></tr>
  <tr><td></td><td>Horários vagos marcados para trabalhar</td><td></td></tr>
  <tr><td></td><td>Caixa aberto com o fundo de troco conferido</td><td></td></tr>
  <tr><td></td><td>Material em falta anotado</td><td></td></tr>
</table>

<h2>Fechamento</h2>
<table class="grade ck">
  <tr><th>Feito</th><th>Item</th><th>Observação</th></tr>
  <tr><td></td><td>Todas as comandas do dia lançadas</td><td></td></tr>
  <tr><td></td><td>Caixa conferido contra o sistema</td><td></td></tr>
  <tr><td></td><td>Diferença de caixa registrada, se houver</td><td></td></tr>
  <tr><td></td><td>Agenda de amanhã revisada e confirmada</td><td></td></tr>
  <tr><td></td><td>Estações e lavatórios limpos</td><td></td></tr>
  <tr><td></td><td>Material esterilizado e guardado</td><td></td></tr>
  <tr><td></td><td>Lixo e descarte separados corretamente</td><td></td></tr>
  <tr><td></td><td>Equipamentos desligados da tomada</td><td></td></tr>
  <tr><td></td><td>Portas, janelas e alarme</td><td></td></tr>
</table>

<h2>Pendências para amanhã</h2>
${LINHAS(3)}

<div class="assin">
  <div><div class="linha"></div><span>Abertura</span></div>
  <div><div class="linha"></div><span>Fechamento</span></div>
</div>`,
  },

  {
    id: 'plano-desenvolvimento',
    titulo: 'Plano de desenvolvimento individual',
    descricao: 'O que a profissional precisa dominar, em quanto tempo, e o que muda quando dominar.',
    quando: 'Depois de cada avaliação. Um por profissional, revisado a cada trimestre.',
    artigo: 'Passo a passo para dar feedback individual',
    corpo: `
<h1>Plano de desenvolvimento</h1>
<table class="grade">
  <tr><td class="rot">Profissional</td><td colspan="3"></td></tr>
  <tr><td class="rot">Função hoje</td><td></td><td class="rot">Período</td><td></td></tr>
</table>

<h2>Onde ela está bem</h2>
<p class="sub">Comece por aqui. Plano que só lista falha não é seguido.</p>
${LINHAS(3)}

<h2>O que precisa desenvolver</h2>
<table class="grade">
  <tr><th>O quê</th><th>Como</th><th>Até quando</th><th>Feito</th></tr>
  ${Array.from({ length: 5 }, () => '<tr><td></td><td></td><td></td><td></td></tr>').join('')}
</table>

<h2>O que muda quando alcançar</h2>
<p class="sub">O próximo degrau, dito com clareza: função, faixa de comissão, tipo de serviço liberado.</p>
${LINHAS(3)}

<h2>Combinado de acompanhamento</h2>
<table class="grade">
  <tr><td class="rot">Próxima conversa em</td><td></td><td class="rot">Quem acompanha</td><td></td></tr>
</table>

<div class="assin">
  <div><div class="linha"></div><span>Profissional</span></div>
  <div><div class="linha"></div><span>Gestão</span></div>
</div>`,
  },
]
