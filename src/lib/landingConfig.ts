import { supabaseAdmin } from './supabase'
import { LANDING_PADRAO } from './landingDefaults'

// ── Textos da vitrine, lidos NO SERVIDOR ────────────────────────────────────
//
// A página montava com os textos do código e só depois o navegador buscava os
// salvos e trocava. Dava para ver o texto antigo piscar a cada atualização —
// e o Google, que não espera o JavaScript, lia justamente a versão errada.
//
// Lendo aqui, a página já nasce com o texto certo.
// ── Textos aposentados ───────────────────────────────────────────────────────
//
// Estes textos foram salvos no painel numa versão anterior da vitrine e têm
// dois problemas que custavam venda:
//
//   • O título mandava "PARE DE GASTAR" e a linha de baixo prometia "faturar
//     mais". São promessas opostas na mesma tela: quem chega em três segundos
//     não descobre se o produto economiza ou faz ganhar, e vai embora.
//   • O texto de abertura descrevia a NODRI como automatizador de WhatsApp —
//     que é o que TODO concorrente também faz. Apresentada assim, ela entra na
//     comparação por preço e perde para qualquer agenda de trinta reais.
//
// Em vez de apagar do banco (o que destruiria o texto sem volta), a leitura
// simplesmente IGNORA estes valores exatos e deixa o padrão do código aparecer.
//
// A comparação é por texto EXATO, e isso é a proteção: no momento em que
// alguém escrever qualquer outra coisa no painel — inclusive voltar a escrever
// este mesmo texto de propósito — a correspondência deixa de bater e o que foi
// escrito passa a valer. Nada aqui prende ninguém.
const TEXTOS_APOSENTADOS: Record<string, string[]> = {
  hero_titulo: [
    'PARE DE GASTAR AGORA!\nComece a faturar mais com o que você já tem.',
    'PARE DE GASTAR AGORA!\nComece a faturar mais com o que você já tem. ',
  ],
  hero_subtitulo: [
    'Automatize confirmações, envio de mensagens, relatórios e muito mais. Tudo integrado diretamente ao seu WhatsApp.',
  ],
  // Endereço que nunca foi o do salão: o correto é o gmail, e era este que
  // aparecia no rodapé como contato oficial.
  footer_email: ['contato@nodri.com.br'],
}

// Os três destaques do topo também são os antigos: nomeavam recurso
// ("Financeiro real") em vez da capacidade que o dono ganha. Como são lista, a
// comparação é pelo conteúdo inteiro — mexeu em qualquer palavra, deixa de
// bater e o que foi escrito vale.
const DESTAQUES_APOSENTADOS = JSON.stringify([
  { titulo: 'Financeiro real', desc: 'Custo, lucro e preço certo por serviço' },
  { titulo: 'Equipe medida', desc: 'Metas, comissões e desempenho de cada um' },
  { titulo: 'Alertas que importam', desc: 'Cliente sumindo e queda de faturamento' },
])

// As quatro dores salvas no painel são exatamente as quatro primeiras do
// código, e nenhuma delas fala de preço ou de custo — que é o assunto mais
// doloroso do setor e o terreno mais forte da NODRI. O código passou a ter
// oito; enquanto o valor salvo fosse considerado, as quatro novas nunca
// apareceriam, porque o que vem do banco substitui a lista inteira.
//
// Mesma proteção dos outros: a comparação é pelo conteúdo exato. No instante
// em que alguém mexer nas dores pelo editor da vitrine, deixa de bater e o que
// foi escrito passa a valer.
const DORES_APOSENTADAS = JSON.stringify([
  { titulo: 'O mês fecha e você não sabe se sobrou', desc: 'O dinheiro entra e sai, mas ninguém consegue dizer quanto o salão deu de lucro de verdade — nem quanto custa manter a porta aberta.' },
  { titulo: 'Você não sabe qual profissional dá lucro', desc: 'Todo mundo parece ocupado. Mas quem realmente traz resultado, quem só ocupa cadeira e quem está caindo mês a mês? Sem número, é achismo.' },
  { titulo: 'Cliente some e ninguém percebe', desc: 'Aquela cliente que vinha todo mês parou de aparecer. Você só percebe quando ela já está em outro salão há meio ano.' },
  { titulo: 'Tudo depende de você estar presente', desc: 'Se você viaja ou adoece, a rotina desmonta. Nada está escrito, tudo está na sua cabeça e no caderno da recepção.' },
])

function normalizaDestaques(v: any): string {
  if (!Array.isArray(v)) return ''
  return JSON.stringify(v.map((d: any) => ({ titulo: String(d?.titulo ?? '').trim(), desc: String(d?.desc ?? '').trim() })))
}

export function semTextosAposentados(salvo: Record<string, any>): Record<string, any> {
  const saida: Record<string, any> = { ...salvo }
  for (const [chave, antigos] of Object.entries(TEXTOS_APOSENTADOS)) {
    const valor = saida[chave]
    if (typeof valor === 'string' && antigos.some(a => a.trim() === valor.trim())) {
      delete saida[chave]
    }
  }
  if (saida.destaques && normalizaDestaques(saida.destaques) === DESTAQUES_APOSENTADOS) {
    delete saida.destaques
  }
  // Reaproveita normalizaDestaques: dor e destaque têm o mesmo formato
  // (titulo + desc), então a normalização serve para os dois.
  if (saida.dores && normalizaDestaques(saida.dores) === DORES_APOSENTADAS) {
    delete saida.dores
  }
  return saida
}

export async function lerLandingConfig(): Promise<Record<string, any>> {
  try {
    const { data } = await supabaseAdmin
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'landing_config')
      .maybeSingle()

    const salvo = (data as any)?.valor
    const limpo = semTextosAposentados(salvo && typeof salvo === 'object' ? salvo : {})
    return { ...LANDING_PADRAO, ...limpo }
  } catch {
    // Banco fora do ar não pode derrubar a vitrine: ela abre com os textos do
    // código, que são sempre válidos.
    return { ...LANDING_PADRAO }
  }
}
