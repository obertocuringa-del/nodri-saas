import type { Metadata } from 'next'

// ── FAQ público ─────────────────────────────────────────────────────────────
//
// Esta página existe por um motivo que as outras públicas não resolvem: tudo
// o que a NODRI escreve sobre gestão hoje está atrás de login. Quem ainda não
// é cliente — e o robô do Google, e o de quem responde pergunta com IA — não
// alcança nada disso.
//
// Três decisões de implementação, todas pelo mesmo motivo:
//
// 1. É SERVER COMPONENT. A página de funcionalidade é client-side, e por isso
//    o texto dela só existe depois que o JavaScript roda. Robô que não executa
//    script vê uma casca vazia. Aqui o HTML já sai pronto do servidor.
//
// 2. Usa <details>/<summary> em vez de accordion em React. É o acordeão nativo
//    do navegador: abre e fecha sem uma linha de JS, e o texto da resposta fica
//    no HTML mesmo fechado — que é o que importa para ser lido e indexado.
//
// 3. Emite JSON-LD do tipo FAQPage. É o que faz a pergunta aparecer como
//    resultado rico na busca. O bloco é gerado a partir da MESMA lista que
//    monta a tela, então os dois nunca divergem.

const MARINHO = '#0d2a56'
const CIANO = '#00b5d8'

export const metadata: Metadata = {
  title: 'Perguntas frequentes sobre gestão de salão de beleza',
  description:
    'Respostas diretas para as dúvidas mais comuns de quem administra salão: precificação, comissão, custo operacional, salão parceiro, estoque, agenda e abertura de salão.',
  alternates: { canonical: 'https://www.nodri.com.br/perguntas-frequentes' },
  openGraph: {
    title: 'Perguntas frequentes sobre gestão de salão de beleza',
    description:
      'Precificação, comissão, custo operacional, salão parceiro, estoque e agenda. Respostas diretas para quem administra salão.',
    url: 'https://www.nodri.com.br/perguntas-frequentes',
    type: 'article',
  },
}

interface Pergunta { q: string; a: string[] }
interface Bloco { titulo: string; perguntas: Pergunta[] }

const BLOCOS: Bloco[] = [
  {
    titulo: 'Dinheiro e preço',
    perguntas: [
      {
        q: 'Como calcular o preço de um serviço de salão de beleza?',
        a: [
          'O preço nasce do custo, nunca do preço do concorrente. Some o custo direto do serviço (produto usado na quantidade real, comissão, imposto e taxa de cartão) e o custo operacional proporcional ao tempo que aquele serviço ocupa a cadeira.',
          'Sobre esse total você aplica a margem que quer. A fórmula é preço igual a custo dividido por um menos a margem desejada — e não custo mais margem, que é o erro mais comum e sempre entrega um preço abaixo do necessário.',
        ],
      },
      {
        q: 'Qual a margem de lucro ideal de um salão de beleza?',
        a: [
          'Não existe número universal, mas serve de referência: abaixo de 10% o salão não suporta imprevisto; entre 10% e 20% é a faixa comum de salão organizado; acima de 20% costuma indicar bom controle de comissão e de ocupação.',
          'Mais importante que a margem geral é a margem por serviço. É comum um salão com 13% no total ter serviços com 35% e outros com 2% — e o dono não saber quais são quais.',
        ],
      },
      {
        q: 'Como calcular o ponto de equilíbrio do salão?',
        a: [
          'Ponto de equilíbrio é o faturamento em que o salão não ganha nem perde. A conta é o custo operacional mensal dividido pela margem de contribuição.',
          'Em atendimentos, divida os custos fixos mensais pelo ticket médio. Se os custos fixos são R$ 22.000 e o ticket médio é R$ 110, o salão precisa de 200 atendimentos por mês só para empatar.',
        ],
      },
      {
        q: 'Qual a diferença entre faturamento e lucro?',
        a: [
          'Faturamento é o valor total dos serviços prestados. Lucro é o que sobra depois de pagar produto, comissão, imposto, taxa de cartão, aluguel, energia, equipe fixa e a sua retirada.',
          'O mês em que mais dinheiro entrou pode ter sido o de menor resultado. Acompanhar só o faturamento é o motivo mais comum de um salão cheio fechar no vermelho.',
        ],
      },
      {
        q: 'Como calcular o custo operacional de um salão?',
        a: [
          'Custo operacional é tudo que o salão gasta para funcionar independentemente de quantas clientes atendeu: aluguel, energia, água, internet, contador, sistema, salário fixo, provisões trabalhistas e depreciação dos equipamentos.',
          'Ele não inclui produto nem comissão — esses variam com o atendimento e entram como custo direto. Separar os dois é o que permite calcular preço e comissão corretamente.',
        ],
      },
      {
        q: 'O que é depreciação e como calcular no salão?',
        a: [
          'Depreciação é a parcela do equipamento que foi consumida no mês. Cadeira, lavatório, secador e autoclave têm vida útil e um dia param — depreciar é guardar por mês o dinheiro da reposição.',
          'A conta prática: some o valor de tudo que você comprou em equipamento e mobiliário e divida pelos meses de vida útil estimada. Esse valor mensal entra no custo operacional.',
        ],
      },
      {
        q: 'Quanto o salão deve ter de reserva financeira?',
        a: [
          'A referência mais usada é de três a seis meses de custo operacional. Três meses cobre uma sequência de meses fracos; seis dá margem para uma reforma forçada, a saída de uma profissional ou uma queda prolongada.',
          'Reserva é diferente de capital de giro. Capital de giro é o dinheiro que faz o mês rodar; reserva é o que você não toca. Misturar os dois faz a reserva sumir sem ninguém perceber.',
        ],
      },
      {
        q: 'Como separar as finanças pessoais das do salão?',
        a: [
          'Duas contas: uma do negócio e uma sua. Todo recebimento entra na do negócio, toda despesa do salão sai dela, sem exceção.',
          'Depois defina um pró-labore fixo, com valor e data marcados, transferido todo mês. Enquanto o dinheiro for um bolo só, nenhum número do salão é confiável — nem o lucro, nem a margem, nem o custo.',
        ],
      },
    ],
  },
  {
    titulo: 'Equipe, comissão e contratação',
    perguntas: [
      {
        q: 'Qual a comissão ideal para cabeleireiro e manicure?',
        a: [
          'Não é um número de mercado: é o que a sua margem comporta. O teto sai de uma conta — o que sobra depois do custo direto precisa pagar o custo operacional e ainda deixar lucro.',
          'Uma porcentagem única para todos os serviços costuma ser injusta com o salão: um corte quase não tem produto, enquanto uma mecha tem pó, oxigenada, matização e duas horas de cadeira. Comissão por faixa de serviço resolve isso.',
        ],
      },
      {
        q: 'Como funciona a Lei do Salão Parceiro?',
        a: [
          'A Lei 13.352/2016 permite que salão e profissional atuem como parceiros, com contrato escrito. O salão retém a parte dele e repassa a cota-parte da profissional, que emite nota contra o salão.',
          'Para a parceria se sustentar, três coisas precisam existir juntas: contrato assinado, homologação quando exigida na sua região, e o histórico de notas emitidas mês a mês. Faltando isso, o que sobra se parece com salário informal.',
        ],
      },
      {
        q: 'Comissão ou aluguel de cadeira: qual é melhor?',
        a: [
          'Depende da ocupação. Na comissão, o salão controla preço, agenda e padrão, e a cliente é do salão — mas o risco da cadeira vazia é todo seu. No aluguel, a receita é previsível e o risco passa para a profissional, mas você perde controle sobre preço e padrão.',
          'A conta que decide: o aluguel só compensa se for maior do que a margem que aquela cadeira deixaria no modelo de comissão. Cadeira produtiva costuma render mais em comissão.',
        ],
      },
      {
        q: 'Como calcular quanto cobrar de aluguel de cadeira?',
        a: [
          'Comece pelo custo da cadeira: custo operacional total dividido pelo número de cadeiras. Some a depreciação do que você comprou e uma provisão de vacância — o tempo em que a cadeira fica vazia entre uma profissional e outra.',
          'Só então aplique a sua margem. Sem a vacância, a conta fecha no papel e não fecha no ano.',
        ],
      },
      {
        q: 'O profissional parceiro precisa emitir nota fiscal?',
        a: [
          'Sim. É a profissional quem emite nota contra o salão, referente ao serviço prestado a ele. O salão é o tomador.',
          'É comum o salão emitir no lugar dela para facilitar, e isso enfraquece justamente o que a nota deveria proteger. Se a relação for questionada, o conjunto de contrato, homologação e notas é o que sustenta a parceria.',
        ],
      },
      {
        q: 'O que pode caracterizar vínculo empregatício num salão?',
        a: [
          'Os elementos clássicos são pessoalidade, habitualidade, onerosidade e subordinação. Na prática, o que mais pesa é o controle: jornada imposta, controle de ponto, escala obrigatória, advertência por atraso e pagamento fixo mensal independente de produção.',
          'Ausência de contrato e de notas emitidas agrava bastante o quadro. Para o caso concreto, consulte um advogado trabalhista.',
        ],
      },
    ],
  },
  {
    titulo: 'Agenda, clientes e operação',
    perguntas: [
      {
        q: 'Como reduzir faltas e cancelamentos em cima da hora?',
        a: [
          'Confirmação individual na véspera, não no mesmo dia. Confirmação feita no dia só avisa que você vai perder o horário; feita na véspera, ainda dá tempo de repor.',
          'Para serviços longos ou de produto caro, sinal de agendamento. E tenha sempre uma lista curta de clientes que topam ser chamadas em cima da hora — é o que transforma buraco em atendimento.',
        ],
      },
      {
        q: 'Como aumentar o ticket médio do salão?',
        a: [
          'A cliente que já está na cadeira é a venda mais barata que existe: ela confia em quem está atendendo e tem tempo reservado. Uma sugestão ligada ao serviço que ela acabou de fazer, feita no momento do pagamento, rende mais que qualquer campanha.',
          'Elevar o ticket médio em 15% costuma dar mais resultado que trazer dez clientes novas — e não custa anúncio.',
        ],
      },
      {
        q: 'Como recuperar clientes que pararam de vir?',
        a: [
          'Cliente insatisfeita raramente reclama: ela só para de marcar. Levante quem não aparece há 60, 90 e 180 dias — essa lista já existe no seu histórico e quase nunca é usada.',
          'Mensagem individual, com o nome, o último serviço feito e um motivo real para voltar. Disparo igual para todo mundo tem resposta baixa e ainda derruba o número do salão.',
        ],
      },
      {
        q: 'Como controlar o estoque de produtos do salão?',
        a: [
          'Defina a gramagem por serviço: quantos gramas de cada produto um atendimento consome. Sem esse parâmetro, "está saindo muito produto" é reclamação, não diagnóstico.',
          'Some a isso uma contagem mensal. É ela que transforma uma diferença de estoque em pergunta objetiva no mês em que aconteceu, em vez de descoberta tardia.',
        ],
      },
      {
        q: 'O que a vigilância sanitária exige de um salão de beleza?',
        a: [
          'Os pontos mais cobrados são: licença sanitária e alvará vigentes, autoclave com manutenção e registro de cada ciclo, material esterilizado embalado e datado, descarte correto de perfurocortante, produtos com registro válido e dentro da validade, pia com água corrente e papel toalha na área de atendimento, e EPI entregue com registro assinado.',
          'A exigência exata varia por município. Ter o equipamento não comprova nada sem o registro dos ciclos.',
        ],
      },
    ],
  },
  {
    titulo: 'Abrir, comprar e vender salão',
    perguntas: [
      {
        q: 'Quanto custa abrir um salão de beleza?',
        a: [
          'O investimento tem quatro blocos: estrutura física (reforma, lavatórios, cadeiras, equipamentos), legalização (abertura da empresa, alvará, licença sanitária, bombeiros), estoque inicial e marca, e capital de giro.',
          'O quarto bloco é o que quase todo mundo esquece e o que mais derruba salão novo. Reserve o equivalente a seis meses de custo operacional: o salão não fatura no primeiro mês o que vai faturar no décimo.',
        ],
      },
      {
        q: 'Quanto vale um salão de beleza na hora de vender?',
        a: [
          'O valor não é o que você investiu: é o que o negócio gera. A base é o lucro mensal recorrente, já descontado um pró-labore de mercado para quem administra — se o dono trabalha de graça, o lucro está inflado.',
          'Sobre esse lucro aplica-se um múltiplo, que sobe conforme o salão depende menos do dono, tem contrato de aluguel longo, equipe estável e carteira de clientes registrada.',
        ],
      },
      {
        q: 'Posso ter um salão de beleza em casa?',
        a: [
          'Pode, desde que a zona permita, o condomínio autorize quando houver, e a empresa esteja aberta. A exigência sanitária é a mesma de um salão de rua.',
          'O risco de gestão é outro: sem aluguel separado, é comum concluir que o custo é quase zero. Continua existindo energia, água, produto, depreciação e o seu tempo. Estime a fração da casa usada no trabalho e trate essa fração como custo do negócio.',
        ],
      },
      {
        q: 'Preciso de contrato escrito com as profissionais?',
        a: [
          'Sim, em qualquer modelo. No regime de parceria, o contrato é o que sustenta a relação se ela for questionada. Em CLT, é obrigação.',
          'Separado do contrato, vale ter um documento de regras do espaço, assinado: horário, falta, uso de material, serviço entre a equipe e bloqueio de agenda. Regra combinada só na conversa é lembrada de forma diferente por cada pessoa.',
        ],
      },
    ],
  },
  {
    titulo: 'Sobre a NODRI',
    perguntas: [
      {
        q: 'O que é a NODRI?',
        a: [
          'A NODRI é um sistema de gestão para salões de beleza, barbearias e clínicas de estética. Ela cobre financeiro, precificação, comissão, estoque, agenda, equipe e relacionamento com o cliente em um lugar só.',
          'A ideia é que os números do salão existam sem ninguém precisar montá-los à mão todo mês.',
        ],
      },
      {
        q: 'A NODRI substitui um curso de gestão?',
        a: [
          'Não, e resolvem problemas diferentes. Curso entrega método: como se calcula um preço, o que é margem, como funciona um contrato de parceria. Sistema entrega o número: o seu custo, a sua margem, o seu resultado, atualizados sozinhos.',
          'Quem termina um bom curso ainda precisa somar produto, comissão, energia e tempo de cadeira, serviço por serviço, todo mês. É essa repetição que o sistema assume.',
        ],
      },
      {
        q: 'A NODRI serve para salão pequeno?',
        a: [
          'Serve, e é onde costuma fazer mais diferença. Salão pequeno é justamente o que não tem uma pessoa dedicada ao administrativo — a conta acaba sobrando para quem também atende.',
          'O sistema é organizado em módulos, então dá para começar pelo que aperta hoje e ativar o resto depois.',
        ],
      },
      {
        q: 'Como faço para conhecer a NODRI?',
        a: [
          'Fale com a gente pelo site: apresentamos o sistema, entendemos o momento do seu salão e mostramos o que faz sentido ativar primeiro.',
        ],
      },
    ],
  },
]

const TODAS = BLOCOS.flatMap(b => b.perguntas)

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: TODAS.map(p => ({
    '@type': 'Question',
    name: p.q,
    acceptedAnswer: { '@type': 'Answer', text: p.a.join(' ') },
  })),
}

export default function PerguntasFrequentesPage() {
  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', background: '#f7fafc', minHeight: '100vh', color: '#1a1a1a' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <style>{`
        .faq-item { background: #fff; border: 1px solid #e3e8f0; border-radius: 12px; margin-bottom: 10px; overflow: hidden; }
        .faq-item summary {
          cursor: pointer; padding: 18px 22px; font-weight: 700; font-size: 15.5px;
          color: ${MARINHO}; line-height: 1.45; list-style: none; display: flex;
          align-items: flex-start; gap: 12px;
        }
        .faq-item summary::-webkit-details-marker { display: none; }
        .faq-item summary::before {
          content: "+"; color: ${CIANO}; font-size: 20px; font-weight: 800;
          line-height: 1.1; flex-shrink: 0;
        }
        .faq-item[open] summary::before { content: "–"; }
        .faq-item summary:hover { background: #f7fafc; }
        .faq-resp { padding: 0 22px 20px 54px; }
        .faq-resp p { color: #4a5568; font-size: 14.5px; line-height: 1.7; margin: 0 0 10px; }
        .faq-resp p:last-child { margin-bottom: 0; }
        @media (max-width: 640px) {
          .faq-topo { gap: 8px !important; padding: 4px 12px !important; }
          .faq-topo img { height: 46px !important; margin: -4px 0 !important; }
          .faq-btn { padding: 9px 12px !important; font-size: 11px !important; white-space: nowrap; }
          .faq-item summary { font-size: 14.5px; padding: 15px 16px; }
          .faq-resp { padding: 0 16px 16px 40px; }
        }
      `}</style>

      <header className="faq-topo" style={{
        background: '#f2f7fb', borderBottom: '1px solid #e3e8f0',
        padding: '2px clamp(16px,4vw,44px)', display: 'flex', alignItems: 'center', gap: 14,
        flexWrap: 'wrap', position: 'sticky', top: 0, zIndex: 50,
      }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', marginRight: 'auto' }}>
          <img src="/logo-nodri.png" alt="NODRI" style={{ height: 'clamp(60px, 6.4vw, 84px)', width: 'auto', margin: '-12px 0' }} />
        </a>
        <a href="/#contato" className="faq-btn" style={{
          padding: '10px 22px', borderRadius: 10, textDecoration: 'none',
          border: `2px solid ${MARINHO}`, color: MARINHO, fontWeight: 800, fontSize: 13,
        }}>FALE CONOSCO</a>
        <a href="/login" className="faq-btn" style={{
          padding: '10px 22px', borderRadius: 10, textDecoration: 'none',
          background: MARINHO, color: '#fff', fontWeight: 800, fontSize: 13,
        }}>JÁ SOU CLIENTE</a>
      </header>

      <section style={{ background: '#fff', borderBottom: '1px solid #e3e8f0', padding: 'clamp(30px,4vw,54px) 20px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            display: 'inline-block', padding: '7px 16px', borderRadius: 999,
            background: '#e6f7fb', color: '#046b85', fontSize: 11.5, fontWeight: 800,
            letterSpacing: '.5px', marginBottom: 20, textTransform: 'uppercase',
          }}>Perguntas frequentes</div>

          <h1 style={{
            fontSize: 'clamp(26px,3.4vw,40px)', fontWeight: 900, lineHeight: 1.15,
            letterSpacing: '-1px', marginBottom: 16, color: MARINHO,
          }}>Dúvidas de quem administra salão</h1>

          <p style={{ color: '#4a5568', fontSize: 16, lineHeight: 1.7, maxWidth: 640, margin: '0 auto' }}>
            Precificação, comissão, custo operacional, salão parceiro, estoque e agenda.
            Respostas diretas, sem enrolação — do jeito que a pergunta chega.
          </p>
        </div>
      </section>

      <main style={{ maxWidth: 820, margin: '0 auto', padding: 'clamp(28px,4vw,44px) 20px 60px' }}>
        {BLOCOS.map(bloco => (
          <section key={bloco.titulo} style={{ marginBottom: 38 }}>
            <h2 style={{
              fontSize: 13, fontWeight: 800, color: '#046b85', textTransform: 'uppercase',
              letterSpacing: '1.2px', marginBottom: 14,
            }}>{bloco.titulo}</h2>

            {bloco.perguntas.map(p => (
              <details key={p.q} className="faq-item">
                <summary><h3 style={{ margin: 0, fontSize: 'inherit', fontWeight: 'inherit', color: 'inherit' }}>{p.q}</h3></summary>
                <div className="faq-resp">
                  {p.a.map((par, i) => <p key={i}>{par}</p>)}
                </div>
              </details>
            ))}
          </section>
        ))}

        <div style={{
          background: '#fff', border: '1px solid #e3e8f0', borderRadius: 16,
          padding: 'clamp(26px,3.5vw,40px)', textAlign: 'center', marginTop: 10,
        }}>
          <div style={{ width: 40, height: 3, borderRadius: 3, background: CIANO, margin: '0 auto 18px' }} />
          <h2 style={{ fontSize: 'clamp(20px,2.4vw,26px)', fontWeight: 900, color: MARINHO, marginBottom: 12, letterSpacing: '-.5px' }}>
            Sua dúvida não estava aqui?
          </h2>
          <p style={{ color: '#4a5568', fontSize: 15, lineHeight: 1.7, maxWidth: 520, margin: '0 auto 26px' }}>
            Fale com a gente. Respondemos sobre gestão de salão mesmo que você ainda não seja cliente.
          </p>
          <a href="/#contato" style={{
            display: 'inline-flex', alignItems: 'center', gap: 9,
            padding: '16px 36px', borderRadius: 12, textDecoration: 'none',
            background: MARINHO, color: '#fff', fontWeight: 800, fontSize: 15.5,
            boxShadow: '0 8px 26px rgba(13,42,86,.22)',
          }}>Falar com a NODRI →</a>
        </div>
      </main>
    </div>
  )
}
