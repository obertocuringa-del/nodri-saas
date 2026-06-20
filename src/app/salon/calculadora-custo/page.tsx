'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Trash2, Calculator, Loader2, Save, ChevronDown, ChevronUp, History, CheckCircle, ChevronLeft, ChevronRight, X } from 'lucide-react'

const MESES_NOMES = ['','Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmtR = (v: number) => `R$ ${(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const n = (s: string) => parseFloat((s||'0').replace(',','.')) || 0
const pctStr = (v: number, t: number) => t > 0 ? `${((v/t)*100).toFixed(1)}%` : '—'

// ─── Dicionário de informações ───────────────────────────────────────────────
const INFO: Record<string, {titulo: string, oque: string, como: string, exemplo: string, porque: string}> = {
  faturamento: {
    titulo: 'Faturamento Mensal',
    oque: 'É todo o dinheiro que entrou no caixa do seu salão no mês — serviços + produtos vendidos. É o total antes de pagar qualquer despesa.',
    como: 'Some tudo que você recebeu: dinheiro, cartão, Pix, transferência. Use a média dos últimos 3 meses para um número mais fiel.',
    exemplo: 'Você fez R$ 48.000 em serviços + R$ 2.000 em produtos = R$ 50.000 de faturamento.',
    porque: 'É o ponto de partida de tudo. Sem saber quanto entra, não dá para saber se o salão está ganhando ou perdendo dinheiro.',
  },
  custIndD: {
    titulo: 'Custo Indireto Desejado (%)',
    oque: 'É o máximo que você quer gastar com contas fixas (aluguel, água, luz, etc.) em relação ao que entra.',
    como: 'A especialista Especialistas recomendam 30%. Isso significa: de cada R$ 100 que entra, no máximo R$ 30 devem ir para custos fixos.',
    exemplo: 'Faturamento R$ 50.000 × 30% = R$ 15.000 máximo em custos fixos.',
    porque: 'Se gastar mais que isso em custos fixos, sobra pouco para pagar os profissionais e ter lucro.',
  },
  custDirD: {
    titulo: 'Custo Direto Desejado (%)',
    oque: 'É o máximo que você quer gastar com o que é pago diretamente pelos serviços: imposto, produtos usados, comissões e taxa do cartão.',
    como: 'O recomendado é 55%. Significa que R$ 55 de cada R$ 100 vão para esses custos.',
    exemplo: 'Faturamento R$ 50.000 × 55% = R$ 27.500 em custos diretos.',
    porque: 'Controlar esse percentual garante que cada serviço prestado realmente vale a pena financeiramente.',
  },
  lucroD: {
    titulo: 'Lucro Desejado (%)',
    oque: 'É a porcentagem do faturamento que você quer guardar como lucro do negócio, depois de pagar tudo.',
    como: 'O recomendado é 15%. Se faturar R$ 50.000, o objetivo é lucrar R$ 7.500.',
    exemplo: 'R$ 50.000 × 15% = R$ 7.500 de lucro líquido no mês.',
    porque: 'Sem meta de lucro, o salão trabalha muito e não sobra nada. Esse número é o seu salário como dono do negócio.',
  },
  invInicial: {
    titulo: 'Investimento Inicial',
    oque: 'É tudo que você gastou para montar o salão: reforma, equipamentos, móveis, decoração, estoque inicial.',
    como: 'Some todos os gastos feitos antes de abrir as portas. Se não lembra tudo, estime o valor mais próximo possível.',
    exemplo: 'Reforma R$ 30.000 + cadeiras R$ 15.000 + equipamentos R$ 20.000 + estoque R$ 5.000 = R$ 70.000.',
    porque: 'Saber quanto investiu ajuda a calcular se o negócio já se pagou e quando você vai recuperar esse dinheiro.',
  },
  totalDeprec: {
    titulo: 'Total a ser Depreciado',
    oque: 'Equipamentos e móveis se desgastam com o tempo e perdem valor. Depreciar é reconhecer esse custo mês a mês.',
    como: 'Coloque o valor de tudo que vai se desgastar: secadores, cadeiras, espelhos, lavatórios. O sistema divide por 60 meses (5 anos) automaticamente.',
    exemplo: 'Equipamentos R$ 30.000 ÷ 60 meses = R$ 500/mês de depreciação.',
    porque: 'Sem calcular depreciação, quando os equipamentos quebrarem você não terá dinheiro para repor. É como guardar um pouquinho todo mês para a reposição.',
  },
  aluguel: {
    titulo: 'Aluguel',
    oque: 'O valor mensal que você paga pelo espaço do salão.',
    como: 'Se o imóvel é seu, mesmo assim coloque o valor que pagaria de aluguel para um espaço igual. Isso é importante para saber o custo real.',
    exemplo: 'Você paga R$ 4.000/mês de aluguel.',
    porque: 'O aluguel deve ser no máximo 10% do faturamento. Se você fatura R$ 40.000, o aluguel ideal é até R$ 4.000. Acima disso, compromete o lucro.',
  },
  energia: {
    titulo: 'Energia Elétrica',
    oque: 'A conta de luz do salão — secadores, prancha, ar condicionado, iluminação.',
    como: 'Use o valor da última fatura ou a média dos últimos 3 meses.',
    exemplo: 'Conta de luz média de R$ 800/mês.',
    porque: 'Salão de beleza consome muita energia. Trocar lâmpadas para LED e desligar equipamentos no horário vazio pode economizar 30%.',
  },
  agua: {
    titulo: 'Água',
    oque: 'A conta de água usada nos lavatórios, banheiro e limpeza.',
    como: 'Use o valor da conta de água do salão. Se dividir com residência, estime só a parte do salão (normalmente 70%).',
    exemplo: 'Conta total R$ 300, parte do salão R$ 210.',
    porque: 'Salões usam muita água em lavagens. Torneiras com temporizador e aproveitamento de água podem reduzir esse custo.',
  },
  contabilidade: {
    titulo: 'Contabilidade',
    oque: 'O valor pago ao contador todo mês para cuidar das notas, impostos e folha de pagamento.',
    como: 'Coloque o honorário mensal do seu contador.',
    exemplo: 'R$ 500/mês para o contador.',
    porque: 'É uma despesa obrigatória para quem tem CNPJ. Um bom contador pode economizar muito mais do que cobra em impostos.',
  },
  sal13: {
    titulo: '13o Salário (Provisão Mensal)',
    oque: 'Todo mês você deve separar 1/12 do salário de cada funcionário para pagar o 13º em dezembro.',
    como: 'Some o salário bruto de todos os funcionários e divida por 12.',
    exemplo: '2 funcionários com R$ 2.000 cada = R$ 4.000 ÷ 12 = R$ 333/mês de provisão.',
    porque: 'Se não guardar todo mês, em dezembro vai ter que pagar tudo de uma vez e pode faltar dinheiro no caixa.',
  },
  ferias: {
    titulo: 'Férias (Provisão Mensal)',
    oque: 'Todo mês você deve separar o valor equivalente às férias de cada funcionário (salário + 1/3).',
    como: 'Salário bruto × 1,333 ÷ 12 por funcionário.',
    exemplo: 'Funcionário com R$ 2.000: R$ 2.000 × 1,333 ÷ 12 = R$ 222/mês.',
    porque: 'Férias são direito do funcionário. Guardar todo mês evita surpresas quando chegar a época.',
  },
  fgtsR: {
    titulo: 'FGTS Rescisório (Provisão)',
    oque: 'Uma reserva para cobrir a multa de 40% do FGTS caso precise demitir um funcionário sem justa causa.',
    como: 'Calcule 3,5% a 4% do salário bruto de cada funcionário CLT por mês.',
    exemplo: 'Funcionário com R$ 2.000: R$ 2.000 × 4% = R$ 80/mês de provisão.',
    porque: 'Se demitir sem provisão, terá que pagar uma multa grande de uma vez só. Guardar todo mês protege o caixa.',
  },
  imposto: {
    titulo: 'Imposto',
    oque: 'O valor de imposto que seu salão pagou no mês — Simples Nacional, ISS, etc.',
    como: 'Use o boleto do Simples Nacional do mês ou pergunte ao seu contador o valor exato.',
    exemplo: 'Faturamento R$ 50.000 no Simples Nacional (6%) = R$ 3.000 de imposto.',
    porque: 'Imposto é obrigação legal. Saber o valor exato evita surpresas e ajuda a precificar os serviços corretamente.',
  },
  produto: {
    titulo: 'Produto/Insumo',
    oque: 'O total gasto com produtos usados nos serviços: tintas, químicas, shampoos, etc.',
    como: 'Some as notas fiscais de compra de produtos do mês ou use o valor do seu estoque consumido.',
    exemplo: 'Comprou R$ 3.000 em tintas, R$ 800 em hidratação, R$ 500 em outros = R$ 4.300.',
    porque: 'Produto é custo direto — quanto mais serviços fizer, mais gasta. O ideal é ficar entre 8% e 12% do faturamento.',
  },
  rateio: {
    titulo: 'Rateio/Comissão',
    oque: 'O valor pago aos profissionais como comissão pelos serviços que realizaram.',
    como: 'Some todas as comissões pagas no mês a todos os profissionais.',
    exemplo: '3 cabeleireiros com R$ 5.000 de comissão cada = R$ 15.000.',
    porque: 'É geralmente o maior custo de um salão. Entender esse número ajuda a definir o percentual de rateio ideal para o negócio.',
  },
  taxaC: {
    titulo: 'Taxa de Cartão',
    oque: 'O total cobrado pelas maquininhas de cartão no mês (débito + crédito + Pix com taxa).',
    como: 'Some os relatórios de todas as suas maquininhas. Geralmente entre 1,5% e 5% por transação.',
    exemplo: 'Vendeu R$ 40.000 no cartão com taxa média de 3% = R$ 1.200 de taxa.',
    porque: 'Muitos donos esquecem essa despesa. Ela pode representar R$ 1.000 a R$ 3.000/mês em salões médios.',
  },
  aquisicaoEq: {
    titulo: 'Aquisição de Equipamento',
    oque: 'Compras de equipamentos, móveis ou utensílios feitas no mês.',
    como: 'Coloque apenas compras feitas NESSE mês (não o total investido na abertura).',
    exemplo: 'Comprou uma cadeira nova por R$ 1.500.',
    porque: 'Equipamentos são investimentos de capital — separá-los das despesas operacionais dá uma visão mais clara do resultado real do mês.',
  },
  distSocios: {
    titulo: 'Distribuição de Sócios',
    oque: 'O valor retirado do caixa pelos sócios como distribuição de lucro (diferente do pró-labore).',
    como: 'Coloque o valor total retirado pelos sócios neste mês como distribuição de lucro.',
    exemplo: '2 sócios retiraram R$ 3.000 cada = R$ 6.000.',
    porque: 'Importante separar do pró-labore (salário do sócio). Distribuição só deve acontecer quando há lucro real confirmado.',
  },
  reservaEmerg: {
    titulo: 'Reserva de Emergência',
    oque: 'Dinheiro guardado em poupança ou conta separada para emergências do salão.',
    como: 'Coloque o saldo atual que você tem separado para emergências.',
    exemplo: 'R$ 15.000 guardados na poupança do salão.',
    porque: 'O ideal é ter de 3 a 6 meses de custo operacional guardado. Para R$ 15.000/mês de custo, a reserva ideal é R$ 45.000 a R$ 90.000.',
  },
  vlrProdEstoque: {
    titulo: 'Valor de Produtos em Estoque',
    oque: 'Quanto vale tudo o que você tem em produtos no estoque hoje.',
    como: 'Faça um inventário dos produtos e some o custo de cada um.',
    exemplo: 'R$ 8.000 em tintas + R$ 2.000 em outros produtos = R$ 10.000 em estoque.',
    porque: 'Estoque parado é dinheiro parado. O ideal é ter estoque para 30-45 dias. Mais que isso, está sobrando capital investido sem necessidade.',
  },
  taxaCartaoServ: {
    titulo: 'Taxa do Cartão (Global)',
    oque: 'A porcentagem média que as maquininhas cobram sobre cada venda no cartão.',
    como: 'Veja nas suas maquininhas a taxa por modalidade. Use a média: (crédito + débito) ÷ 2.',
    exemplo: 'Débito 1,5% + Crédito 3,5% ÷ 2 = 2,5% de média. Se a maioria paga no crédito, use 3,5%.',
    porque: 'Esse percentual é descontado de cada serviço antes de calcular o rateio do profissional.',
  },
  abatProd: {
    titulo: 'Abatimento do Produto (%)',
    oque: 'É o quanto do custo do produto é descontado da base de cálculo do rateio do profissional.',
    como: 'O recomendado é 100% — significa que o custo do produto é totalmente abatido antes de calcular a comissão.',
    exemplo: 'Serviço R$ 100, produto R$ 20, rateio 50%: com 100% abatimento → comissão sobre R$ 80 = R$ 40.',
    porque: 'Sem abater o produto, o profissional recebe comissão sobre o custo do material também — o que é injusto para o salão.',
  },
  custOpServ: {
    titulo: 'Custo Operacional (%)',
    oque: 'Percentual do faturamento gasto com custos fixos do salão (aluguel, luz, água, etc.).',
    como: 'Se preencheu a aba Receitas e Despesas, esse valor é calculado automaticamente. Se não, use 30% como referência.',
    exemplo: 'Custo operacional R$ 15.000 ÷ Faturamento R$ 50.000 = 30%.',
    porque: 'Esse percentual é descontado de cada serviço para mostrar o resultado real — quanto sobra depois de pagar todas as contas fixas.',
  },
  salaoParceiro: {
    titulo: 'Lei do Salão Parceiro',
    oque: 'Lei 13.352/2016 que permite que cabeleireiros sejam parceiros (autônomos) e não funcionários CLT do salão.',
    como: 'Se seus profissionais assinam contrato de parceria, marque SIM. Isso muda como o imposto é calculado.',
    exemplo: 'Com Salão Parceiro: imposto sobre R$ 50 (margem) e não sobre R$ 100 (preço cheio) = economia real de imposto.',
    porque: 'Pode reduzir significativamente a carga tributária do salão. Consulte seu contador para formalizar.',
  },
  numCad: {
    titulo: 'Número de Cadeiras/Postos',
    oque: 'Quantas cadeiras ou postos de atendimento existem no seu salão.',
    como: 'Conte todas as cadeiras ativas — de corte, coloração, manicure, maquiagem, etc.',
    exemplo: '3 cadeiras de corte + 2 de manicure + 1 de maquiagem = 6 postos.',
    porque: 'Divide o custo total igualmente entre as cadeiras para saber quanto cada posto precisa gerar para o salão ser lucrativo.',
  },
  custoOpCad: {
    titulo: 'Custo Operacional para Aluguel',
    oque: 'O total de custos mensais do salão que precisa ser coberto pelo aluguel das cadeiras.',
    como: 'Se preencheu Receitas e Despesas, é preenchido automaticamente. Senão, some todas as despesas fixas mensais.',
    exemplo: 'Aluguel R$ 3.000 + Luz R$ 600 + Internet R$ 150 + ... = R$ 8.000 de custo total.',
    porque: 'O aluguel de cadeira precisa, no mínimo, cobrir os custos. O valor sugerido acrescenta 50% de margem.',
  },
  mTotal: {
    titulo: 'Metragem Total do Salão (m²)',
    oque: 'A área total do seu salão em metros quadrados.',
    como: 'Meça ou consulte o contrato de aluguel. Inclua todas as áreas: atendimento, lavabo, estoque, banheiro.',
    exemplo: 'Salão de 10m × 8m = 80m².',
    porque: 'Divide o faturamento necessário pela área para saber se cada metro quadrado está sendo bem aproveitado.',
  },
  fatMinM2: {
    titulo: 'Faturamento Mínimo Necessário',
    oque: 'O valor mínimo que o salão precisa faturar para não ter prejuízo (Ponto de Equilíbrio).',
    como: 'Se preencheu Receitas e Despesas, é calculado automaticamente. Senão, some todas as despesas mensais.',
    exemplo: 'Se os custos totais são R$ 22.000 e a margem é 44%, o PE é R$ 50.000.',
    porque: 'Abaixo desse valor, o salão está operando no prejuízo. Acima, começa a ter lucro.',
  },
  mSala: {
    titulo: 'Área de um Espaço Específico (m²)',
    oque: 'A metragem de uma sala ou área específica que você quer analisar separadamente.',
    como: 'Mede o comprimento × largura da área específica.',
    exemplo: 'Sala de manicure de 4m × 3m = 12m².',
    porque: 'Ajuda a decidir se vale a pena ter aquele espaço — ele precisa gerar o faturamento sugerido para se pagar.',
  },
  areaM2: {
    titulo: 'Área Total do Salão (m²)',
    oque: 'A área em metros quadrados usada para calcular o ponto de equilíbrio por metro quadrado.',
    como: 'Use a metragem total do salão.',
    exemplo: 'Salão de 80m².',
    porque: 'Mostra a eficiência do espaço — quanto cada metro quadrado está gerando de receita.',
  },
  numProfs: {
    titulo: 'Número de Profissionais',
    oque: 'Quantos profissionais trabalham no salão (sócios + funcionários + parceiros).',
    como: 'Conte todos que atendem clientes ativamente.',
    exemplo: '1 dona + 2 cabeleireiros + 1 manicure = 4 profissionais.',
    porque: 'Divide a meta do salão entre os profissionais para saber quanto cada um precisa produzir.',
  },
  margemPE: {
    titulo: 'Margem Operacional (%)',
    oque: 'É a porcentagem que sobra do faturamento depois de pagar os custos diretos (produto, comissão, imposto, cartão).',
    como: 'Se preencheu Receitas e Despesas, é calculado automaticamente. A referência do mercado é 44-45%.',
    exemplo: 'Faturamento R$ 50.000 - Custos diretos R$ 27.500 = R$ 22.500 de margem = 45%.',
    porque: 'É essa margem que precisa cobrir todos os custos fixos e ainda gerar lucro.',
  },
  metaLucroPE: {
    titulo: 'Meta de Lucro (%)',
    oque: 'O percentual de lucro que você quer alcançar no mês.',
    como: 'Use a mesma meta da aba Receitas e Despesas (recomendado: 15%).',
    exemplo: 'Meta 15% × R$ 50.000 = R$ 7.500 de lucro desejado.',
    porque: 'Com essa meta, o sistema calcula quanto você PRECISA faturar para alcançar o lucro desejado.',
  },
  precoServico: {
    titulo: 'Preço do Serviço',
    oque: 'O valor cobrado do cliente por esse serviço.',
    como: 'Use o preço cheio que o cliente paga, sem desconto.',
    exemplo: 'Coloração completa: R$ 250.',
    porque: 'É o ponto de partida para calcular quanto sobra depois de pagar profissional, produto, imposto e cartão.',
  },
  rateioServico: {
    titulo: 'Rateio/Comissão do Serviço (%)',
    oque: 'A porcentagem do valor do serviço que vai para o profissional que realizou.',
    como: 'Use o percentual combinado com o profissional.',
    exemplo: 'Serviço R$ 250 com rateio 50% = R$ 125 para o profissional.',
    porque: 'É geralmente o maior custo de cada serviço. Ajustar esse percentual tem o maior impacto na lucratividade.',
  },
  produtoServico: {
    titulo: 'Produto Usado no Serviço (R$)',
    oque: 'O custo dos produtos usados para realizar esse serviço específico.',
    como: 'Use a aba "Custo de Produto" para calcular o valor exato e coloque aqui.',
    exemplo: 'Coloração usa R$ 45 em tinta + R$ 8 em oxidante = R$ 53 de produto.',
    porque: 'Sem somar o custo do produto, o serviço parece mais lucrativo do que realmente é.',
  },
  impostoServico: {
    titulo: 'Imposto sobre o Serviço (%)',
    oque: 'A alíquota de imposto que incide sobre esse serviço.',
    como: 'Consulte seu contador. No Simples Nacional pode variar de 4,5% a 19,5% dependendo do faturamento.',
    exemplo: 'Serviço R$ 250 × 6% de imposto = R$ 15 de imposto.',
    porque: 'O imposto é um custo real — sem incluí-lo, o resultado do serviço aparece maior do que realmente é.',
  },
  qtdEmb: {
    titulo: 'Quantidade da Embalagem',
    oque: 'Quanto produto tem na embalagem que você compra (em ml, g ou unidades).',
    como: 'Olhe na embalagem do produto e anote a quantidade total.',
    exemplo: 'Tinta em tubo de 60g → coloque 60.',
    porque: 'Serve para calcular o custo por grama/ml e assim saber exatamente quanto cada uso custa.',
  },
  precoEmb: {
    titulo: 'Preço da Embalagem',
    oque: 'Quanto você pagou pela embalagem desse produto.',
    como: 'Use o valor da nota fiscal ou o preço de compra com seu fornecedor.',
    exemplo: 'Tubo de tinta R$ 35,27.',
    porque: 'Junto com a quantidade da embalagem, calcula o custo por grama — a base para saber o custo real de cada serviço.',
  },
  qtdUsa: {
    titulo: 'Quantidade Usada por Serviço',
    oque: 'Quanto desse produto você usa para realizar um serviço.',
    como: 'Meça na prática ou estime com base na sua experiência.',
    exemplo: 'Para coloração longo usa 90g de tinta.',
    porque: 'Fórmula: (preço ÷ qtd embalagem) × qtd usada = custo por serviço. Pequenas variações aqui mudam muito o custo final.',
  },
}

// ─── Componente InfoBtn ──────────────────────────────────────────────────────
function InfoBtn({ id, className }: { id: string; className?: string }) {
  const [aberto, setAberto] = useState(false)
  const info = INFO[id]
  if (!info) return null
  return (
    <>
      <button
        onClick={e => { e.stopPropagation(); setAberto(true) }}
        className={`flex-shrink-0 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center transition-all hover:scale-110 ${className||''}`}
        style={{background:'#5b4fcf30',color:'#7c6fe0',border:'1px solid #5b4fcf50'}}
        title={info.titulo}
      >i</button>
      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.7)'}}>
          <div className="rounded-2xl border max-w-md w-full shadow-2xl" style={{background:'#faf9f7',borderColor:'#5b4fcf50'}}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{borderColor:'#ffffff'}}>
              <h3 className="font-bold text-sm text-white">{info.titulo}</h3>
              <button onClick={() => setAberto(false)} className="p-1 rounded-lg hover:bg-white/10" style={{color:'#9e9b94'}}><X size={16}/></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-xl p-3" style={{background:'#f5f4f0'}}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{color:'#5b4fcf'}}>O que é?</p>
                <p className="text-xs leading-relaxed" style={{color:'#3a3835'}}>{info.oque}</p>
              </div>
              <div className="rounded-xl p-3" style={{background:'#f5f4f0'}}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{color:'#10b981'}}>Como preencher?</p>
                <p className="text-xs leading-relaxed" style={{color:'#3a3835'}}>{info.como}</p>
              </div>
              <div className="rounded-xl p-3" style={{background:'#5b4fcf15',border:'1px solid #5b4fcf30'}}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{color:'#7c6fe0'}}>Exemplo prático</p>
                <p className="text-xs leading-relaxed" style={{color:'#1a1a1a'}}>{info.exemplo}</p>
              </div>
              <div className="rounded-xl p-3" style={{background:'#10b98115',border:'1px solid #10b98130'}}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{color:'#10b981'}}>Por que é importante?</p>
                <p className="text-xs leading-relaxed" style={{color:'#3a3835'}}>{info.porque}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Componente AvisoDefault ────────────────────────────────────────────────
// Mostra badge laranja quando campo está usando valor padrão
function AvisoDefault({ ativo, padrao, onPreencher, onManter }: {
  ativo: boolean
  padrao: string
  onPreencher: () => void
  onManter: () => void
}) {
  const [aberto, setAberto] = useState(false)
  if (!ativo) return null
  return (
    <>
      <button
        onClick={e => { e.stopPropagation(); setAberto(true) }}
        className="flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold animate-pulse"
        style={{background:'#f59e0b20',color:'#f59e0b',border:'1px solid #f59e0b50'}}
        title="Campo usando valor padrão — clique para decidir">
        padrão
      </button>
      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.7)'}}>
          <div className="rounded-2xl border max-w-sm w-full shadow-2xl" style={{background:'#faf9f7',borderColor:'#f59e0b50'}}>
            <div className="px-5 py-4 border-b" style={{borderColor:'#ffffff'}}>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">Campo usando valor padrão</h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="rounded-xl p-3" style={{background:'#f59e0b10',border:'1px solid #f59e0b30'}}>
                <p className="text-xs" style={{color:'#fbbf24'}}>
                  Este campo está usando o valor padrão: <strong>{padrao}</strong>
                </p>
                <p className="text-xs mt-1" style={{color:'#9e9b94'}}>
                  Para um resultado mais preciso, preencha com os dados reais do seu salão.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { setAberto(false); onPreencher() }}
                  className="py-2.5 rounded-xl text-xs font-bold"
                  style={{background:'#5b4fcf',color:'white'}}>
                  Quero preencher
                </button>
                <button onClick={() => { setAberto(false); onManter() }}
                  className="py-2.5 rounded-xl text-xs font-bold"
                  style={{background:'#ffffff',color:'#9e9b94',border:'1px solid #dedad4'}}>
                  Manter padrão
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Componente GuiaPassos ───────────────────────────────────────────────────
function GuiaPassos({ passos }: { passos: {titulo: string, desc: string, ok: boolean, cor: string}[] }) {
  return (
    <div className="rounded-2xl p-4 border mb-4" style={{background:'#0d1525',borderColor:'#5b4fcf30'}}>
      <p className="text-xs font-bold mb-3" style={{color:'#5b4fcf'}}>Como preencher — siga os passos em ordem:</p>
      <div className="grid gap-2" style={{gridTemplateColumns:`repeat(${passos.length}, 1fr)`}}>
        {passos.map((p, i) => (
          <div key={i} className="rounded-xl p-3 border text-center" style={{
            background: p.ok ? `${p.cor}10` : '#faf9f7',
            borderColor: p.ok ? `${p.cor}40` : '#ffffff',
          }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-2"
              style={{background: p.ok ? p.cor : '#ffffff', color: p.ok ? 'white' : '#6b6860'}}>
              {p.ok ? '✓' : i+1}
            </div>
            <p className="text-[10px] font-bold mb-1" style={{color: p.ok ? p.cor : '#9e9b94'}}>
              {p.titulo}
            </p>
            <p className="text-[9px] leading-tight" style={{color:'#6b6860'}}>{p.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Constantes ─────────────────────────────────────────────────────────────
const DESPESAS_INDIRETAS = [
  {nome:'Aluguel',          dica:'Se imóvel próprio, considere o valor de mercado + condomínio.'},
  {nome:'Água',             dica:'Consumo da empresa: banheiros, limpeza, cozinha.'},
  {nome:'Contabilidade',    dica:'Honorários do contador, declarações, folha de pagamento.'},
  {nome:'Condomínio',       dica:'Taxa de condomínio separada do aluguel, se houver.'},
  {nome:'Despesas Bancárias',dica:'Taxas, manutenção de conta, maquininhas. Negocie sempre!'},
  {nome:'Devolução Cliente',dica:'Estornos e devoluções de pagamentos de clientes.'},
  {nome:'Energia Elétrica', dica:'Equipamentos, iluminação, ar condicionado. LED reduz muito.'},
  {nome:'Estacionamento',   dica:'Aluguel de vagas ou manobrista para clientes/equipe.'},
  {nome:'Decoração/Manutenção',dica:'Pintura, móveis, reparos, reformas, plantas.'},
  {nome:'Internet/Telefone',dica:'Internet comercial, telefone fixo, celulares corporativos.'},
  {nome:'Sistema/Software', dica:'Sistema de gestão, Office, antivírus, apps especializados.'},
  {nome:'Limpeza e Higiene',dica:'Detergentes, desinfetantes, papel higiênico, álcool gel.'},
  {nome:'IPTU',             dica:'Imposto predial proporcional ao período.'},
  {nome:'Marketing e Publicidade',dica:'Facebook Ads, Google, panfletos, influencers.'},
  {nome:'Material de Escritório',dica:'Papel, canetas, impressões, toners, pastas.'},
  {nome:'Mimos para Clientes',dica:'Cafezinho, água, balas, lembrancinhas. Cliente mimado volta!'},
  {nome:'Mimos para Profissionais',dica:'Confraternizações, pizzas, presentes, incentivos.'},
  {nome:'Uniformes',        dica:'Aventais, camisetas, uniformes da equipe.'},
  {nome:'Pró-labore',       dica:'Sua remuneração como sócio/proprietário.'},
  {nome:'Salários',         dica:'Salários dos colaboradores CLT.'},
  {nome:'FGTS',             dica:'8% sobre o salário bruto de cada colaborador CLT.'},
  {nome:'Taxa Certificado Digital',dica:'Certificado digital da empresa (anual ÷ 12).'},
  {nome:'Seguro',           dica:'Seguro do estabelecimento, equipamentos ou responsabilidade civil.'},
]

// ─── Tipos ──────────────────────────────────────────────────────────────────
interface DespesaItem { nome: string; valor: string; dica: string; editavel?: boolean }
interface Ingrediente  { id: number; nome: string; qtdEmb: string; qtdUsa: string; preco: string; unidade: string }
interface ServicoProd  { id: number; nomeServico: string; ingredientes: Ingrediente[] }
interface Servico      { id: number; nome: string; preco: string; rateioP: string; produto: string; imposto: string }

// ─── Componente principal ────────────────────────────────────────────────────
export default function CalculadoraCusto() {
  // ── Histórico mensal ────────────────────────────────────────────────────────
  const hoje = new Date()
  const [anoSel,    setAnoSel]    = useState(hoje.getFullYear())
  const [mesSel,    setMesSel]    = useState(hoje.getMonth() + 1)
  const [salvando,  setSalvando]  = useState(false)
  const [savedMsg,  setSavedMsg]  = useState('')
  const [mesesComDados, setMesesComDados] = useState<{ano:number,mes:number}[]>([])
  const [carregando, setCarregando] = useState(false)

  // Aba ativa
  const [aba, setAba] = useState<'rd'|'pe'|'servicos'|'produto'|'catproduto'|'cadeira'|'metro'|'graficos'>('rd')

  // ── Receitas e Despesas ──────────────────────────────────────────────────
  const [fat,      setFat]      = useState('')
  const [custIndD, setCustIndD] = useState('30')   // % custo indireto desejado
  const [custDirD, setCustDirD] = useState('')   // % custo direto — calculado automaticamente
  const [lucroD,   setLucroD]   = useState('15')   // % lucro desejado
  const [invInicial,setInvInicial] = useState('')  // investimento inicial
  const [totalDeprec,setTotalDeprec] = useState('') // total a depreciar
  const [despInd, setDespInd]   = useState<DespesaItem[]>(
    DESPESAS_INDIRETAS.map(d => ({...d, valor:''}))
  )
  // Provisão
  const [sal13,  setSal13]  = useState('') // 13º salário mensal
  const [ferias, setFerias] = useState('') // férias mensal
  const [fgtsR,  setFgtsR]  = useState('') // FGTS rescisório mensal
  // Despesas diretas
  const [imposto, setImposto] = useState('')
  const [produto, setProduto] = useState('')
  const [rateio,  setRateio]  = useState('')
  const [taxaC,   setTaxaC]   = useState('')
  // Outras despesas
  const [aquisicaoEq, setAquisicaoEq] = useState('')
  const [distSocios,  setDistSocios]  = useState('')
  // Campos extras
  const [extrasDespInd, setExtrasDespInd] = useState<DespesaItem[]>([])
  const [reservaEmerg,  setReservaEmerg]  = useState('')
  const [totalReservaAcum, setTotalReservaAcum] = useState(0) // total acumulado de todos os meses
  const [mediaCustoOp, setMediaCustoOp] = useState(0) // média do custo operacional % de todos os meses
  const [qtdMesesMedia, setQtdMesesMedia] = useState(0) // quantos meses foram usados na média
  const [modoCustoOp, setModoCustoOp] = useState<'dani'|'real'>('real') // modo de cálculo do custo operacional

  // ── Catálogos ─────────────────────────────────────────────────────────────
  interface ProdutoCatalogo { id:string; nome:string; marca:string; unidade:string; qtd_embalagem:number; preco:number }
  interface ServicoCatalogo { id:string; nome:string; rateio_pct:number; imposto_pct:number; produto_padrao:number }
  const [produtosCatalogo, setProdutosCatalogo] = useState<ProdutoCatalogo[]>([])
  const [servicosCatalogo, setServicosCatalogo] = useState<ServicoCatalogo[]>([])
  const [buscarProduto, setBuscarProduto] = useState('')
  const [buscarServico, setBuscarServico] = useState('')
  const [editandoProd, setEditandoProd] = useState<string|null>(null)
  const [editandoServ, setEditandoServ] = useState<string|null>(null)
  const [salvandoCat, setSalvandoCat] = useState(false)
  const [msgCat, setMsgCat] = useState('')
  // Form cadastro produto
  const [fNome, setFNome] = useState(''); const [fMarca, setFMarca] = useState('')
  const [fUnid, setFUnid] = useState('ml'); const [fQtd, setFQtd] = useState('')
  const [fPreco, setFPreco] = useState('')
  // Form cadastro serviço
  const [fsNome, setFsNome] = useState(''); const [fsRateio, setFsRateio] = useState('50')
  const [fsImposto, setFsImposto] = useState('5'); const [fsProduto, setFsProduto] = useState('0')
  // Accordion aberto
  const [acordeaoProd, setAcordeaoProd] = useState<string|null>(null)
  const [acordeaoServ, setAcordeaoServ] = useState<string|null>(null)
  // Autocomplete: chave = "sId-iIdx", valor = texto digitado para sugestões
  const [autocompleteKey, setAutocompleteKey] = useState<string|null>(null)
  // Atualizar (feedback visual)
  const [atualizando, setAtualizando] = useState(false)
  // Histórico para comparativo mensal
  const [historicoMeses, setHistoricoMeses] = useState<any[]>([])
  // Catálogo de despesas
  interface DespesaCat { id:string; nome:string; categoria:string; observacao?:string }
  const [despesasCatalogo, setDespesasCatalogo] = useState<DespesaCat[]>([])
  const [sugestoesPadrao, setSugestoesPadrao] = useState<{nome:string,categoria:string}[]>([])
  const [autocomplDespesa, setAutocomplDespesa] = useState<string|null>(null)
  // Extras para Despesas Diretas e Outras Despesas
  const [extrasDiretas, setExtrasDiretas] = useState<DespesaItem[]>([])
  const [extrasOutras, setExtrasOutras] = useState<DespesaItem[]>([])
  // Gerenciar catálogo de despesas
  const [showCatDespesa, setShowCatDespesa] = useState(false)
  // Seções colapsáveis
  const [secIndiretas,  setSecIndiretas]  = useState(true)
  const [secProvisao,   setSecProvisao]   = useState(false)
  const [secDiretas,    setSecDiretas]    = useState(true)
  const [secOutras,     setSecOutras]     = useState(false)
  const [secResultado,  setSecResultado]  = useState(true)
  const [secConfigServ, setSecConfigServ] = useState(false)
  const [editDespCat, setEditDespCat] = useState<DespesaCat|null>(null)
  const [fdNome, setFdNome] = useState(''); const [fdCat, setFdCat] = useState('indireta'); const [fdObs, setFdObs] = useState('')
  const [vlrProdEstoque,setVlrProdEstoque]= useState('')

  // ── Ponto de Equilíbrio ──────────────────────────────────────────────────
  const [areaM2,     setAreaM2]     = useState('100')
  const [numProfs,   setNumProfs]   = useState('3')
  const [margemPE,   setMargemPE]   = useState('')
  const [metaLucroPE,setMetaLucroPE] = useState('')
  const [fatPEManual,setFatPEManual] = useState('')
  const [simDespesa, setSimDespesa]  = useState('')

  // ── Calcular Serviços ────────────────────────────────────────────────────
  const [servicos,    setServicos]    = useState<Servico[]>([{id:1,nome:'',preco:'',rateioP:'50',produto:'',imposto:'5'}])
  const [buscaServico, setBuscaServico] = useState('')
  const [buscaProduto, setBuscaProduto] = useState('')
  const [ordenarPorLucro, setOrdenarPorLucro] = useState(true)
  const [proxServ,    setProxServ]    = useState(2)
  const [taxaCartao,  setTaxaCartao]  = useState('5')
  const [abatProd,    setAbatProd]    = useState('100')
  const [custOpServ,  setCustOpServ]  = useState('')
  const [taxaAntesRateio, setTaxaAntesRateio] = useState(true)
  const [prodAntesRateio, setProdAntesRateio] = useState(true)
  const [salaoParceiro,   setSalaoParceiro]   = useState(true)

  // ── Custo de Produto ─────────────────────────────────────────────────────
  const [servicosProd, setServicoProd] = useState<ServicoProd[]>([
    {id:1, nomeServico:'', ingredientes:[{id:1,nome:'',qtdEmb:'',qtdUsa:'',preco:'',unidade:'ml'}]}
  ])
  const [proxSP, setProxSP] = useState(2)

  // ── Aluguel de Cadeira ───────────────────────────────────────────────────
  const [numCad,    setNumCad]    = useState('')
  const [custoOpCad,setCustoOpCad]= useState('')

  // ── Faturamento por M² ───────────────────────────────────────────────────
  const [mTotal,  setMTotal]  = useState('')
  const [fatMinM2,setFatMinM2]= useState('')
  const [mSala,   setMSala]   = useState('')

  // ── IA ───────────────────────────────────────────────────────────────────
  const [analiseIA,  setAnaliseIA]  = useState('')
  const [loadingIA,  setLoadingIA]  = useState(false)
  const [erroIA,     setErroIA]     = useState('')

  // ── Funções de serializar/desserializar todos os campos ─────────────────────
  function coletarDados() {
    return {
      fat, custIndD, custDirD, lucroD, invInicial, totalDeprec,
      despInd: despInd.map(d=>({nome:d.nome,valor:d.valor})),
      extrasDespInd: extrasDespInd.map(d=>({nome:d.nome,valor:d.valor})),
      extrasDiretas: extrasDiretas.map(d=>({nome:d.nome,valor:d.valor})),
      extrasOutras: extrasOutras.map(d=>({nome:d.nome,valor:d.valor})),
      sal13, ferias, fgtsR, imposto, produto, rateio, taxaC,
      aquisicaoEq, distSocios, reservaEmerg, vlrProdEstoque,
      areaM2, numProfs, margemPE, metaLucroPE, fatPEManual, simDespesa,
      taxaCartao, abatProd, custOpServ, taxaAntesRateio, prodAntesRateio, salaoParceiro,
      servicos, numCad, custoOpCad, mTotal, fatMinM2, mSala,
      servicosProd,
    }
  }

  function aplicarDados(d: ReturnType<typeof coletarDados>) {
    if (!d) return
    if (d.fat !== undefined) setFat(d.fat)
    if (d.custIndD !== undefined) setCustIndD(d.custIndD)
    if (d.custDirD !== undefined) setCustDirD(d.custDirD)
    if (d.lucroD !== undefined) setLucroD(d.lucroD)
    if (d.invInicial !== undefined) setInvInicial(d.invInicial)
    if (d.totalDeprec !== undefined) setTotalDeprec(d.totalDeprec)
    if (d.despInd) setDespInd(DESPESAS_INDIRETAS.map((di,i)=>({...di,valor:d.despInd[i]?.valor||''})))
    if (d.extrasDespInd) setExtrasDespInd(d.extrasDespInd.map((x:any)=>({nome:x.nome,valor:x.valor,dica:''})))
    if ((d as any).extrasDiretas) setExtrasDiretas((d as any).extrasDiretas.map((x:any)=>({nome:x.nome,valor:x.valor,dica:''})))
    if ((d as any).extrasOutras) setExtrasOutras((d as any).extrasOutras.map((x:any)=>({nome:x.nome,valor:x.valor,dica:''})))
    if (d.sal13 !== undefined) setSal13(d.sal13)
    if (d.ferias !== undefined) setFerias(d.ferias)
    if (d.fgtsR !== undefined) setFgtsR(d.fgtsR)
    if (d.imposto !== undefined) setImposto(d.imposto)
    if (d.produto !== undefined) setProduto(d.produto)
    if (d.rateio !== undefined) setRateio(d.rateio)
    if (d.taxaC !== undefined) setTaxaC(d.taxaC)
    if (d.aquisicaoEq !== undefined) setAquisicaoEq(d.aquisicaoEq)
    if (d.distSocios !== undefined) setDistSocios(d.distSocios)
    if (d.reservaEmerg !== undefined) setReservaEmerg(d.reservaEmerg)
    if (d.vlrProdEstoque !== undefined) setVlrProdEstoque(d.vlrProdEstoque)
    if (d.areaM2 !== undefined) setAreaM2(d.areaM2)
    if (d.numProfs !== undefined) setNumProfs(d.numProfs)
    if (d.margemPE !== undefined) setMargemPE(d.margemPE)
    if (d.metaLucroPE !== undefined) setMetaLucroPE(d.metaLucroPE)
    if (d.fatPEManual !== undefined) setFatPEManual(d.fatPEManual)
    if (d.simDespesa !== undefined) setSimDespesa(d.simDespesa)
    if (d.taxaCartao !== undefined) setTaxaCartao(d.taxaCartao)
    if (d.abatProd !== undefined) setAbatProd(d.abatProd)
    if (d.custOpServ !== undefined) setCustOpServ(d.custOpServ)
    if (d.taxaAntesRateio !== undefined) setTaxaAntesRateio(d.taxaAntesRateio)
    if (d.prodAntesRateio !== undefined) setProdAntesRateio(d.prodAntesRateio)
    if (d.salaoParceiro !== undefined) setSalaoParceiro(d.salaoParceiro)
    if (d.servicos) setServicos(d.servicos)
    if (d.numCad !== undefined) setNumCad(d.numCad)
    if (d.custoOpCad !== undefined) setCustoOpCad(d.custoOpCad)
    if (d.mTotal !== undefined) setMTotal(d.mTotal)
    if (d.fatMinM2 !== undefined) setFatMinM2(d.fatMinM2)
    if (d.mSala !== undefined) setMSala(d.mSala)
    if (d.servicosProd) setServicoProd(d.servicosProd)
  }

  // Carrega lista de meses com dados, soma reserva e calcula média do custo operacional
  useEffect(() => {
    fetch('/api/salon/calculadora', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.historico) {
          setMesesComDados(d.historico.map((h:any)=>({ano:h.ano,mes:h.mes})))

          // Soma reserva acumulada
          const totalAcum = d.historico.reduce((soma:number, h:any) => {
            return soma + (parseFloat(h.dados?.reservaEmerg || '0') || 0)
          }, 0)
          setTotalReservaAcum(totalAcum)

          // Calcula média do Custo Operacional % de todos os meses com faturamento
          const mesesValidos = d.historico.filter((h:any) => {
            const fat = parseFloat(h.dados?.fat || '0') || 0
            return fat > 0
          })

          if (mesesValidos.length > 0) {
            const somaRatios = mesesValidos.reduce((soma:number, h:any) => {
              const dados = h.dados || {}
              const fatN = parseFloat(dados.fat || '0') || 0
              // Recalcula custoOp do mês: indiretas + provisão + depreciação
              const totInd = (dados.despInd || []).reduce((s:number, d:any) => s + (parseFloat(d.valor||'0')||0), 0)
                           + (dados.extrasDespInd || []).reduce((s:number, d:any) => s + (parseFloat(d.valor||'0')||0), 0)
              const totProv = (parseFloat(dados.sal13||'0')||0) + (parseFloat(dados.ferias||'0')||0) + (parseFloat(dados.fgtsR||'0')||0)
              const dep = (parseFloat(dados.totalDeprec||'0')||0) / 84
              const custoOpMes = totInd + totProv + dep
              return soma + (fatN > 0 ? custoOpMes / fatN : 0)
            }, 0)

            const media = somaRatios / mesesValidos.length
            setMediaCustoOp(media)
            setQtdMesesMedia(mesesValidos.length)
          }
        }
      })
      .catch(() => {})
  }, [])

  // Carrega mês selecionado
  useEffect(() => {
    setCarregando(true)
    setAnaliseIA(''); setErroIA('')
    fetch(`/api/salon/calculadora?ano=${anoSel}&mes=${mesSel}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.dados) aplicarDados(d.dados) })
      .catch(() => {})
      .finally(() => setCarregando(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anoSel, mesSel])

  async function salvarMes() {
    setSalvando(true); setSavedMsg('')
    try {
      const res = await fetch('/api/salon/calculadora', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ano: anoSel, mes: mesSel, dados: coletarDados() }),
      })
      if (res.ok) {
        setSavedMsg('Salvo!')
        setMesesComDados(prev => {
          const existe = prev.some(m=>m.ano===anoSel&&m.mes===mesSel)
          return existe ? prev : [...prev, {ano:anoSel,mes:mesSel}]
        })
        // Recalcula totais após salvar
        fetch('/api/salon/calculadora', { credentials: 'include' })
          .then(r => r.json())
          .then(d => {
            if (d.historico) {
              // Reserva acumulada
              const total = d.historico.reduce((s:number,h:any) => s + (parseFloat(h.dados?.reservaEmerg||'0')||0), 0)
              setTotalReservaAcum(total)
              // Média custo operacional
              const validos = d.historico.filter((h:any) => (parseFloat(h.dados?.fat||'0')||0) > 0)
              if (validos.length > 0) {
                const soma = validos.reduce((s:number,h:any) => {
                  const dados = h.dados||{}
                  const f = parseFloat(dados.fat||'0')||0
                  const ind = (dados.despInd||[]).reduce((x:number,di:any)=>x+(parseFloat(di.valor||'0')||0),0)
                           + (dados.extrasDespInd||[]).reduce((x:number,di:any)=>x+(parseFloat(di.valor||'0')||0),0)
                  const prov = (parseFloat(dados.sal13||'0')||0)+(parseFloat(dados.ferias||'0')||0)+(parseFloat(dados.fgtsR||'0')||0)
                  const dep = (parseFloat(dados.totalDeprec||'0')||0)/84
                  return s + (f>0?(ind+prov+dep)/f:0)
                }, 0)
                setMediaCustoOp(soma/validos.length)
                setQtdMesesMedia(validos.length)
              }
            }
          }).catch(()=>{})
        setTimeout(() => setSavedMsg(''), 3000)
      }
    } finally { setSalvando(false) }
  }

  // ── Custo Direto Desejado automático = 100% - Indireto - Lucro (fórmula DV: =1-E5-M5) ──
  useEffect(() => {
    const automatico = (100 - n(custIndD) - n(lucroD)).toFixed(1)
    setCustDirD(automatico)
  }, [custIndD, lucroD])

  // ── Provisões automáticas a partir dos Salários (fórmulas metodologia recomendada) ──
  // 13º = Salários ÷ 12 (0.083333)
  // Férias = Salários ÷ 36 (0.027778) — apenas o 1/3 constitucional mensal
  // FGTS Rescisório = Salários × 4% (0.04)
  useEffect(() => {
    const salIdx = despInd.findIndex(d => d.nome === 'Salários')
    const salVal = salIdx >= 0 ? n(despInd[salIdx].valor) : 0
    if (salVal > 0) {
      setSal13(String(Math.round(salVal / 12)))
      setFerias(String(Math.round(salVal / 36)))
      setFgtsR(String(Math.round(salVal * 0.04)))
    }
  }, [despInd])

  // Carrega catálogo de despesas
  useEffect(() => {
    fetch('/api/salon/despesas-catalogo', { credentials:'include' })
      .then(r=>r.json())
      .then(d=>{
        if(d.despesas?.length>0) setDespesasCatalogo(d.despesas)
        if(d.sugestoes?.length>0) setSugestoesPadrao(d.sugestoes)
      }).catch(()=>{})
  }, [])

  async function seedDespesas() {
    const res = await fetch('/api/salon/despesas-catalogo', { method:'POST', credentials:'include',
      headers:{'Content-Type':'application/json'}, body:JSON.stringify({seed:true}) })
    if(res.ok) { const d = await res.json(); setDespesasCatalogo(d.despesas||[]); setSugestoesPadrao([]) }
  }

  async function salvarDespCat(editar?: string) {
    const url = editar ? `/api/salon/despesas-catalogo/${editar}` : '/api/salon/despesas-catalogo'
    const method = editar ? 'PUT' : 'POST'
    const res = await fetch(url, { method, credentials:'include',
      headers:{'Content-Type':'application/json'}, body:JSON.stringify({nome:fdNome,categoria:fdCat,observacao:fdObs}) })
    if(res.ok) {
      const d = await res.json()
      if(editar) setDespesasCatalogo(p=>p.map(x=>x.id===editar?d.despesa:x).sort((a,b)=>a.nome.localeCompare(b.nome)))
      else setDespesasCatalogo(p=>[...p,d.despesa].sort((a,b)=>a.nome.localeCompare(b.nome)))
      setFdNome(''); setFdCat('indireta'); setFdObs(''); setEditDespCat(null)
    }
  }

  async function excluirDespCat(id: string) {
    if(!confirm('Excluir esta despesa do catálogo?')) return
    await fetch(`/api/salon/despesas-catalogo/${id}`, { method:'DELETE', credentials:'include' })
    setDespesasCatalogo(p=>p.filter(x=>x.id!==id))
  }

  // Autocomplete de despesa — retorna lista filtrada pelo texto
  function sugestoesDespesa(texto: string, categoria?: string) {
    const todas = despesasCatalogo.length > 0 ? despesasCatalogo : sugestoesPadrao.map(s=>({...s,id:'',observacao:''}))
    return todas
      .filter(d => (!categoria || d.categoria === categoria))
      .filter(d => !texto || d.nome.toLowerCase().includes(texto.toLowerCase()))
      .slice(0, 8)
  }

  // Carrega catálogos e histórico ao iniciar
  useEffect(() => {
    fetch('/api/salon/produtos-catalogo', { credentials:'include' })
      .then(r=>r.json()).then(d=>{ if(d.produtos) setProdutosCatalogo(d.produtos) }).catch(()=>{})
    fetch('/api/salon/servicos-catalogo', { credentials:'include' })
      .then(r=>r.json()).then(d=>{ if(d.servicos) setServicosCatalogo(d.servicos) }).catch(()=>{})
    // Carrega histórico para comparativo mensal
    fetch('/api/salon/calculadora', { credentials:'include' })
      .then(r=>r.json())
      .then(d=>{
        if(d.historico) {
          const processado = d.historico
            .filter((h:any)=>(parseFloat(h.dados?.fat||'0')||0)>0)
            .map((h:any)=>{
              const dados = h.dados||{}
              const fatM = parseFloat(dados.fat||'0')||0
              const ind = (dados.despInd||[]).reduce((s:number,d:any)=>s+(parseFloat(d.valor||'0')||0),0)
                        + (dados.extrasDespInd||[]).reduce((s:number,d:any)=>s+(parseFloat(d.valor||'0')||0),0)
              const prov = (parseFloat(dados.sal13||'0')||0)+(parseFloat(dados.ferias||'0')||0)+(parseFloat(dados.fgtsR||'0')||0)
              const dep = (parseFloat(dados.totalDeprec||'0')||0)/84
              const custoOpM = ind+prov+dep
              const dirM = (parseFloat(dados.imposto||'0')||0)+(parseFloat(dados.produto||'0')||0)+(parseFloat(dados.rateio||'0')||0)+(parseFloat(dados.taxaC||'0')||0)
              const margM = fatM-dirM
              const resultM = margM-custoOpM
              return { ano:h.ano, mes:h.mes, fat:fatM, custoOp:custoOpM, dir:dirM, resultado:resultM, rentab:fatM>0?resultM/fatM:0 }
            })
            .sort((a:any,b:any)=> a.ano!==b.ano?a.ano-b.ano:a.mes-b.mes)
          setHistoricoMeses(processado)
        }
      }).catch(()=>{})
  }, [])

  async function salvarProduto(editar?: string) {
    setSalvandoCat(true); setMsgCat('')
    try {
      const body = { nome:fNome, marca:fMarca, unidade:fUnid, qtd_embalagem:parseFloat(fQtd)||0, preco:parseFloat(fPreco)||0 }
      const url = editar ? `/api/salon/produtos-catalogo/${editar}` : '/api/salon/produtos-catalogo'
      const method = editar ? 'PUT' : 'POST'
      const res = await fetch(url, { method, credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
      if(res.ok) {
        const d = await res.json()
        if(editar) setProdutosCatalogo(p=>p.map(x=>x.id===editar?d.produto:x).sort((a,b)=>a.nome.localeCompare(b.nome)))
        else setProdutosCatalogo(p=>[...p, d.produto].sort((a,b)=>a.nome.localeCompare(b.nome)))
        setFNome(''); setFMarca(''); setFUnid('ml'); setFQtd(''); setFPreco('')
        setEditandoProd(null); setMsgCat('✅ Produto salvo!')
        setTimeout(()=>setMsgCat(''),3000)
      }
    } finally { setSalvandoCat(false) }
  }

  async function excluirProduto(id: string) {
    if(!confirm('Excluir este produto do catálogo?')) return
    await fetch(`/api/salon/produtos-catalogo/${id}`, { method:'DELETE', credentials:'include' })
    setProdutosCatalogo(p=>p.filter(x=>x.id!==id))
  }

  function editarProduto(p: ProdutoCatalogo) {
    setFNome(p.nome); setFMarca(p.marca||''); setFUnid(p.unidade); setFQtd(String(p.qtd_embalagem)); setFPreco(String(p.preco))
    setEditandoProd(p.id)
  }

  async function salvarServico(editar?: string) {
    setSalvandoCat(true); setMsgCat('')
    try {
      const body = { nome:fsNome, rateio_pct:parseFloat(fsRateio)||50, imposto_pct:parseFloat(fsImposto)||5, produto_padrao:parseFloat(fsProduto)||0 }
      const url = editar ? `/api/salon/servicos-catalogo/${editar}` : '/api/salon/servicos-catalogo'
      const method = editar ? 'PUT' : 'POST'
      const res = await fetch(url, { method, credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
      if(res.ok) {
        const d = await res.json()
        if(editar) setServicosCatalogo(p=>p.map(x=>x.id===editar?d.servico:x).sort((a,b)=>a.nome.localeCompare(b.nome)))
        else setServicosCatalogo(p=>[...p, d.servico].sort((a,b)=>a.nome.localeCompare(b.nome)))
        setFsNome(''); setFsRateio('50'); setFsImposto('5'); setFsProduto('0')
        setEditandoServ(null); setMsgCat('✅ Serviço salvo!')
        setTimeout(()=>setMsgCat(''),3000)
      }
    } finally { setSalvandoCat(false) }
  }

  async function excluirServico(id: string) {
    if(!confirm('Excluir este serviço do catálogo?')) return
    await fetch(`/api/salon/servicos-catalogo/${id}`, { method:'DELETE', credentials:'include' })
    setServicosCatalogo(p=>p.filter(x=>x.id!==id))
  }

  function editarServico(s: ServicoCatalogo) {
    setFsNome(s.nome); setFsRateio(String(s.rateio_pct)); setFsImposto(String(s.imposto_pct)); setFsProduto(String(s.produto_padrao))
    setEditandoServ(s.id)
  }

  function atualizar() {
    setAtualizando(true)
    setTimeout(()=>setAtualizando(false), 800)
  }

  function mesAnterior() {
    if (mesSel === 1) { setMesSel(12); setAnoSel(a=>a-1) }
    else setMesSel(m=>m-1)
  }
  function mesProximo() {
    if (mesSel === 12) { setMesSel(1); setAnoSel(a=>a+1) }
    else setMesSel(m=>m+1)
  }

  // Cálculos Receitas e Despesas
  const fatN       = n(fat)
  const depMensal  = n(totalDeprec) > 0 ? n(totalDeprec) / 84 : 0
  const totInd     = despInd.reduce((s,d)=>s+n(d.valor),0) + extrasDespInd.reduce((s,d)=>s+n(d.valor),0)
  const totProvisao= n(sal13) + n(ferias) + n(fgtsR)
  const custoOp    = totInd + totProvisao + depMensal
  const totDiretas = n(imposto) + n(produto) + n(rateio) + n(taxaC) + extrasDiretas.reduce((s,d)=>s+n(d.valor),0)
  const margOpR    = fatN - totDiretas
  const margOpPct  = fatN > 0 ? margOpR / fatN : 0
  const resultOp   = margOpR - custoOp
  const resultOpPct= fatN > 0 ? resultOp / fatN : 0
  const totOutras  = n(aquisicaoEq) + n(distSocios) + extrasOutras.reduce((s,d)=>s+n(d.valor),0)
  // Fórmula DV linha 132: =ResultOp - OutrasDespesas + Depreciacao (depreciação é custo não-caixa, soma de volta)
  const resultFin  = resultOp - totOutras + depMensal
  // Fórmula DV linha 139: =ResultadoOperacao / Investimento_Inicial (ROI sobre o capital investido)
  const rentab     = n(invInicial) > 0 ? resultOp / n(invInicial) : 0
  const pe         = margOpPct > 0 ? custoOp / margOpPct : 0
  const peLucro    = (margOpPct - n(lucroD)/100) > 0 ? custoOp / (margOpPct - n(lucroD)/100) : 0
  // Fórmula DV linha 141: =CustoOp * 3 (3 meses de reserva)
  const capGiro    = custoOp * 3

  // ── Ponto de Equilíbrio detalhado ───────────────────────────────────────
  const fatPE_  = n(fatPEManual)  || fatN
  const margPE_ = n(margemPE)/100 || margOpPct
  const metaPE_ = n(metaLucroPE)/100 || n(lucroD)/100
  const custoOpPE_ = custoOp > 0 ? custoOp : n(simDespesa)
  const area_   = n(areaM2) || 100
  const profs_  = n(numProfs) || 1

  const PE_          = margPE_ > 0 ? custoOpPE_ / margPE_ : 0
  const PELucro_     = (margPE_ - metaPE_) > 0 ? custoOpPE_ / (margPE_ - metaPE_) : 0
  const PEProf_      = profs_ > 0 ? PE_ / profs_ : 0
  const PEProfLucro_ = profs_ > 0 ? PELucro_ / profs_ : 0
  const PEM2_        = area_ > 0 ? PE_ / area_ : 0
  const PEM2Lucro_   = area_ > 0 ? PELucro_ / area_ : 0

  // ── Calcular Serviços ────────────────────────────────────────────────────
  // Modo Recomendado: usa 30% fixo (igual à metodologia recomendada)
  // Modo Real: usa média histórica dos meses salvos (ou mês atual, ou 30% se sem dados)
  const custOpServN = n(custOpServ)/100 || (
    modoCustoOp === 'dani'
      ? (n(custIndD)/100 || 0.30)
      : (mediaCustoOp || (fatN > 0 && custoOp > 0 ? custoOp/fatN : n(custIndD)/100 || 0.30))
  )

  function calcServ(s: Servico) {
    const preco = n(s.preco)
    if (!preco) return null
    const rP    = n(s.rateioP) / 100
    const prod  = n(s.produto)
    const imp   = n(s.imposto) / 100
    const taxC  = n(taxaCartao) / 100
    const abat  = n(abatProd) / 100

    // Fórmula correta metodologia recomendada (verificada na célula E14 — PIGMENTAÇÃO):
    // Rateio R$ = (Preço × Rateio%) - (Preço × Taxa_Cartão) - (Produto × Abatimento%)
    // O valor TOTAL do cartão é descontado do rateio (não só a fração proporcional ao rateio%)
    // Planilha usa =C14*G14 (preço×taxa), não =C14*D14*G14 (preço×rateio%×taxa)
    const baseRateio = preco * rP
    const abatTaxa   = taxaAntesRateio ? preco * taxC : 0
    const abatProdR  = prodAntesRateio  ? prod * abat : 0
    const rateioR    = baseRateio - abatTaxa - abatProdR

    const cartaoR    = preco * taxC
    // Imposto: salão parceiro = (Preço - Rateio) × Imp%; senão Preço × Imp%
    const impostR    = salaoParceiro ? (preco - rateioR) * imp : preco * imp
    const total      = rateioR + prod + cartaoR + impostR
    const margOp     = preco - total
    const custoOpR   = preco * custOpServN
    const resultado  = preco - total - custoOpR

    return {preco,rateioR,prod,cartaoR,impostR,total,
            totalPct:total/preco,margOp,margOpPct:margOp/preco,
            custoOpR,custOpPct:custOpServN,resultado,resultPct:resultado/preco}
  }

  // Calcula preço mínimo para atingir lucro desejado
  // Fórmula: P = F / (K - targetLucro)
  // K = 1 - rP - (1-rP+taxC)×imp - custOpPct  (coef. de preço no resultado)
  // F = prod × [1 - abat×(1-imp)]              (custo fixo do produto)
  function calcPrecoMinimo(s: Servico, targetLucro: number) {
    const rP   = n(s.rateioP) / 100
    const prod = n(s.produto)
    const imp  = n(s.imposto) / 100
    const taxC = n(taxaCartao) / 100
    const abat = n(abatProd) / 100
    const co   = custOpServN

    // Coeficiente de P no resultado (com salão parceiro e flags ativas)
    const K = 1 - rP - (salaoParceiro ? (1 - rP + taxC) * imp : imp) - co
    // Custo fixo (produto - parte do abatimento que gera custo fixo)
    const F = prod * (1 - abat * (1 - imp))

    if (K - targetLucro <= 0) return null
    return F / (K - targetLucro)
  }

  function custoIngred(i: Ingrediente): number {
    const emb = n(i.qtdEmb), usa = n(i.qtdUsa), prec = n(i.preco)
    return emb > 0 ? (prec / emb) * usa : 0
  }

  // ── Aluguel de Cadeira ───────────────────────────────────────────────────
  const custoOpCadN = n(custoOpCad) || custoOp
  const custPorCad  = n(numCad) > 0 ? custoOpCadN / n(numCad) : 0
  const alugSuger   = custPorCad * 1.5

  // ── Faturamento por M² ───────────────────────────────────────────────────
  const fatMinM2N   = n(fatMinM2) || pe
  const fatPorM2    = n(mTotal) > 0 ? fatMinM2N / n(mTotal) : 0
  const fatSugM2    = fatPorM2 * 1.5
  const fatSugSala  = n(mSala) > 0 ? fatSugM2 * n(mSala) : 0

  async function analisarIA() {
    setLoadingIA(true); setErroIA(''); setAnaliseIA('')
    try {
      const detalhe = despInd.filter(d=>n(d.valor)>0).map(d=>`- ${d.nome}: ${fmtR(n(d.valor))}`).join('\n')
      const prompt = `Você é a NODRI IA, especialista em gestão financeira de salões.

RECEITAS E DESPESAS DO SALÃO:
- Faturamento: ${fmtR(fatN)}
- Total Despesas Indiretas: ${fmtR(totInd)}
- Provisão (13º+Férias+FGTS): ${fmtR(totProvisao)}
- Depreciação: ${fmtR(depMensal)}/mês
- Custo Operacional Total: ${fmtR(custoOp)} (${pctStr(custoOp,fatN)} do fat.)
- Despesas Diretas: ${fmtR(totDiretas)}
- Margem Operacional: ${fmtR(margOpR)} (${(margOpPct*100).toFixed(1)}%)
- Resultado Operacional: ${fmtR(resultOp)} (${(resultOpPct*100).toFixed(1)}%)
- Ponto de Equilíbrio: ${fmtR(pe)}
- Rentabilidade: ${(rentab*100).toFixed(2)}%

Custos desejados: Indireto ${custIndD}% | Direto ${custDirD}% | Lucro ${lucroD}%

CUSTOS DETALHADOS:
${detalhe}

Analise com:
1. DIAGNÓSTICO (margem saudável: >20%, atenção: 10-20%, crítica: <10%)
2. TOP 3 CUSTOS PARA REDUZIR com ação específica e impacto em R$
3. BENCHMARKS: Aluguel máx 10%, Salários 35-45%, Produtos 8-12%, Marketing 3-5%
4. 3 AÇÕES PRÁTICAS com impacto estimado
5. META: faturamento ideal para margem de 25%

Use números reais. Seja direto.`

      const res = await fetch('/api/ia/chat',{method:'POST',credentials:'include',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({mensagens:[{role:'user',content:prompt}],modo:'calculadora'})})
      if(!res.ok){setErroIA('Servidor sobrecarregado. Tente novamente.');return}
      const reader=res.body!.getReader(); const dec=new TextDecoder('utf-8',{fatal:false})
      let buf='',txt=''
      while(true){
        const {done,value}=await reader.read(); if(done)break
        buf+=dec.decode(value,{stream:true})
        const lines=buf.split('\n'); buf=lines.pop()||''
        for(const line of lines){
          if(!line.startsWith('data:'))continue
          try{const d=JSON.parse(line.slice(5).trim()); if(d.token){txt+=d.token;setAnaliseIA(txt)}}catch{}
        }
      }
    } catch{setErroIA('Erro de conexão. Tente novamente.')}
    finally{setLoadingIA(false)}
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  const corRes = (v:number) => v >= 0 ? '#10b981' : '#ef4444'

  const ABAS = [
    {id:'rd',        label:'Receitas e Despesas', icon:''},
    {id:'pe',        label:'Ponto de Equilíbrio', icon:''},
    {id:'servicos',  label:'Calcular Serviços',   icon:''},
    {id:'produto',   label:'Custo de Produto',    icon:''},
    {id:'catproduto',label:'Catálogo Produtos',   icon:''},
    {id:'cadeira',   label:'Aluguel de Cadeira',  icon:''},
    {id:'metro',     label:'Faturamento por M²',  icon:''},
    {id:'graficos',  label:'Gráficos',            icon:''},
  ] as const

  // ── Dados para gráficos ──────────────────────────────────────────────────
  const BENCHMARKS: Record<string, number> = {
    'Aluguel': 10, 'Energia Elétrica': 3, 'Salários': 40, 'Pró-labore': 10,
    'Marketing e Publicidade': 5, 'Limpeza e Higiene': 2, 'Internet/Telefone': 1,
    'Sistema/Software': 1, 'Contabilidade': 2, 'FGTS': 3,
  }

  const todasDespesas = [
    ...despInd.filter(d => n(d.valor) > 0).map(d => ({nome: d.nome, valor: n(d.valor), tipo: 'indireta'})),
    ...extrasDespInd.filter(d => n(d.valor) > 0).map(d => ({nome: d.nome, valor: n(d.valor), tipo: 'indireta'})),
    {nome: '13º Salário', valor: n(sal13), tipo: 'provisao'},
    {nome: 'Férias', valor: n(ferias), tipo: 'provisao'},
    {nome: 'FGTS Rescisório', valor: n(fgtsR), tipo: 'provisao'},
    {nome: 'Imposto', valor: n(imposto), tipo: 'direta'},
    {nome: 'Produto/Insumo', valor: n(produto), tipo: 'direta'},
    {nome: 'Rateio/Comissão', valor: n(rateio), tipo: 'direta'},
    {nome: 'Taxa de Cartão', valor: n(taxaC), tipo: 'direta'},
  ].filter(d => d.valor > 0).sort((a, b) => b.valor - a.valor)

  const maxDespesa = todasDespesas[0]?.valor || 1

  function semaforoDespesa(nome: string, valor: number): {cor: string, label: string, icone: string} {
    const bench = BENCHMARKS[nome]
    if (!bench || !fatN) return {cor: '#9e9b94', label: 'Sem benchmark', icone: '⚪'}
    const pct = (valor / fatN) * 100
    if (pct > bench * 1.2) return {cor: '#ef4444', label: `${pct.toFixed(1)}% — Acima do limite (máx ${bench}%)`, icone: '🔴'}
    if (pct > bench * 0.9) return {cor: '#f59e0b', label: `${pct.toFixed(1)}% — No limite (ref ${bench}%)`, icone: '🟡'}
    return {cor: '#10b981', label: `${pct.toFixed(1)}% — Saudável (ref ${bench}%)`, icone: '🟢'}
  }

  const scoreFinanceiro = (() => {
    if (!fatN) return null
    let pts = 100
    if (resultOp < 0) pts -= 40
    else if (resultOp / fatN < 0.05) pts -= 20
    else if (resultOp / fatN < 0.10) pts -= 10
    if (custoOp / fatN > n(custIndD) / 100 * 1.2) pts -= 15
    if (totDiretas / fatN > n(custDirD) / 100 * 1.2) pts -= 15
    if (fatN < pe) pts -= 20
    pts = Math.max(0, Math.min(100, pts))
    if (pts >= 75) return {score: pts, label: 'Saudável', cor: '#10b981', icone: '🟢', sub: 'Parabéns! Suas finanças estão bem controladas.'}
    if (pts >= 50) return {score: pts, label: 'Atenção', cor: '#f59e0b', icone: '🟡', sub: 'Há pontos de melhoria importantes. Veja os alertas abaixo.'}
    return {score: pts, label: 'Crítico', cor: '#ef4444', icone: '🔴', sub: 'Situação exige ação imediata. Priorize reduzir custos.'}
  })()

  return (
    <div className="min-h-screen" style={{background:'#f5f4f0',color:'#1a1a1a'}}>
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <a href="/salon" className="p-2 rounded-lg hover:bg-white/5" style={{color:'#9e9b94'}}><ArrowLeft size={18}/></a>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Calculator size={22} style={{color:'#5b4fcf'}}/>Calculadoras do Salão
            </h1>
            <p className="text-xs mt-0.5" style={{color:'#9e9b94'}}>
              Metodologia profissional de gestão financeira — dados interligados entre as calculadoras
            </p>
          </div>
        </div>

        {/* Seletor de mês + Salvar */}
        <div className="flex items-center gap-3 mb-6 p-3 rounded-xl border" style={{background:'#faf9f7',borderColor:'#ffffff'}}>
          <History size={15} style={{color:'#5b4fcf',flexShrink:0}}/>
          <span className="text-xs font-bold" style={{color:'#9e9b94'}}>Período:</span>

          {/* Navegação mês */}
          <div className="flex items-center gap-1">
            <button onClick={mesAnterior} className="p-1 rounded hover:bg-white/5" style={{color:'#9e9b94'}}><ChevronLeft size={14}/></button>
            <div className="flex items-center gap-1">
              <select value={mesSel} onChange={e=>setMesSel(Number(e.target.value))}
                className="text-xs font-bold px-2 py-1 rounded-lg focus:outline-none"
                style={{background:'#f5f4f0',color:'#1a1a1a',border:'1px solid #dedad4'}}>
                {MESES_NOMES.slice(1).map((nome,i)=>{
                  const m=i+1; const temDados=mesesComDados.some(x=>x.ano===anoSel&&x.mes===m)
                  return <option key={m} value={m}>{nome}{temDados?' ●':''}</option>
                })}
              </select>
              <select value={anoSel} onChange={e=>setAnoSel(Number(e.target.value))}
                className="text-xs font-bold px-2 py-1 rounded-lg focus:outline-none"
                style={{background:'#f5f4f0',color:'#1a1a1a',border:'1px solid #dedad4'}}>
                {[anoSel-1,anoSel,anoSel+1].map(a=><option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <button onClick={mesProximo} className="p-1 rounded hover:bg-white/5" style={{color:'#9e9b94'}}><ChevronRight size={14}/></button>
          </div>

          {carregando && <Loader2 size={13} className="animate-spin" style={{color:'#5b4fcf'}}/>}

          {/* Indicadores de meses salvos */}
          {mesesComDados.length > 0 && (
            <div className="flex-1 flex items-center gap-1 overflow-x-auto">
              {mesesComDados.slice(0,6).map(m=>(
                <button key={`${m.ano}-${m.mes}`}
                  onClick={()=>{setAnoSel(m.ano);setMesSel(m.mes)}}
                  className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold transition-all"
                  style={{
                    background: m.ano===anoSel&&m.mes===mesSel ? '#5b4fcf' : '#5b4fcf20',
                    color: m.ano===anoSel&&m.mes===mesSel ? 'white' : '#5b4fcf',
                  }}>
                  {MESES_NOMES[m.mes].slice(0,3)}/{String(m.ano).slice(2)}
                </button>
              ))}
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            {savedMsg && <span className="text-xs flex items-center gap-1" style={{color:'#10b981'}}><CheckCircle size={12}/>{savedMsg}</span>}
            <button onClick={salvarMes} disabled={salvando}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
              style={{background:'#5b4fcf',color:'white'}}>
              {salvando ? <Loader2 size={12} className="animate-spin"/> : <Save size={12}/>}
              Salvar {MESES_NOMES[mesSel]}
            </button>
          </div>
        </div>

        {/* Abas */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl overflow-x-auto" style={{background:'#faf9f7'}}>
          {ABAS.map(a=>(
            <button key={a.id} onClick={()=>setAba(a.id as any)}
              className="flex-shrink-0 py-2 px-2 sm:px-1 rounded-lg text-[10px] font-bold transition-all text-center min-w-[72px] sm:min-w-0 sm:flex-1"
              style={{background:aba===a.id?'#5b4fcf':'transparent',color:aba===a.id?'white':'#9e9b94'}}>
              <div>{a.icon}</div><div className="mt-0.5 leading-tight">{a.label}</div>
            </button>
          ))}
        </div>

        {/* ════ ABA RECEITAS E DESPESAS ════ */}
        {aba==='rd' && (
          <div className="space-y-4">

            {/* Guia passo a passo */}
            <div className="rounded-2xl p-4 border" style={{background:'#0d1525',borderColor:'#5b4fcf30'}}>
              <p className="text-xs font-bold mb-3" style={{color:'#5b4fcf'}}>📋 Como preencher — siga os 4 passos em ordem:</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  {n:'1',titulo:'Faturamento',desc:'Quanto entrou no caixa este mês (dinheiro + cartão + Pix)',ok:fatN>0,cor:'#10b981'},
                  {n:'2',titulo:'Despesas Fixas',desc:'Aluguel, luz, água, salários e todos os gastos que sempre têm',ok:totInd>0,cor:'#f59e0b'},
                  {n:'3',titulo:'Despesas Variáveis',desc:'Imposto, produtos usados, comissões e taxa do cartão deste mês',ok:totDiretas>0,cor:'#ef4444'},
                  {n:'4',titulo:'Veja o Resultado',desc:'Role até o final — seu lucro, ponto de equilíbrio e situação aparecem automaticamente',ok:fatN>0&&totInd>0&&totDiretas>0,cor:'#5b4fcf'},
                ].map(p=>(
                  <div key={p.n} className="rounded-xl p-3 border text-center" style={{background:p.ok?`${p.cor}10`:'#faf9f7',borderColor:p.ok?p.cor+'40':'#ffffff'}}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-2"
                      style={{background:p.ok?p.cor:'#ffffff',color:p.ok?'white':'#6b6860'}}>
                      {p.ok?'✓':p.n}
                    </div>
                    <p className="text-[10px] font-bold mb-1" style={{color:p.ok?p.cor:'#9e9b94'}}>Passo {p.n}: {p.titulo}</p>
                    <p className="text-[9px] leading-tight" style={{color:'#6b6860'}}>{p.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Card configurações */}
            <div className="rounded-2xl p-5 border" style={{background:'#faf9f7',borderColor:'#5b4fcf40'}}>
              <h3 className="font-bold text-sm mb-4" style={{color:'#5b4fcf'}}>⚙️ Configurações</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <label className="text-xs font-bold" style={{color:'#9e9b94'}}>💰 Faturamento Mensal (R$)</label>
                    <InfoBtn id="faturamento"/>
                    <AvisoDefault ativo={!fat||fat==='0'} padrao="não preenchido" onPreencher={()=>{}} onManter={()=>{}}/>
                  </div>
                  <p className="text-xs mb-1" style={{color:'#6b6860'}}>Média dos últimos 12 meses ÷ 12</p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{color:'#9e9b94'}}>R$</span>
                    <input type="number" value={fat} onChange={e=>setFat(e.target.value)} placeholder="Ex: 50000"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl text-white text-base font-bold focus:outline-none"
                      style={{background:'#f5f4f0',border:'1px solid #5b4fcf60'}}/>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {l:'Custo Indireto Desejado',v:custIndD,set:setCustIndD,c:'#f59e0b',dica:'Recomendado: 30%',auto:false,info:'custIndD'},
                    {l:'Custo Direto Desejado',v:custDirD,set:null,c:'#ef4444',dica:'Calculado: 100% − Indireto − Lucro',auto:true,info:'custDirD'},
                    {l:'Lucro Desejado',v:lucroD,set:setLucroD,c:'#10b981',dica:'Recomendado: 15%',auto:false,info:'lucroD'},
                  ].map((f:any)=>(
                    <div key={f.l}>
                      <div className="flex items-center gap-1 mb-1">
                        <label className="text-[10px] font-bold" style={{color:f.c}}>{f.l}</label>
                        {f.auto && <span className="text-[8px] px-1 rounded font-bold" style={{background:'#ef444425',color:'#ef4444'}}>=auto</span>}
                        <InfoBtn id={f.info}/>
                      </div>
                      <p className="text-[9px] mb-1" style={{color:'#6b6860'}}>{f.dica}</p>
                      <div className="relative">
                        <input type="number" value={f.v} onChange={e=>f.set&&f.set(e.target.value)} readOnly={f.auto}
                          className="w-full pr-6 pl-2 py-1.5 rounded-lg text-xs text-white focus:outline-none"
                          style={{background:'#f5f4f0',border:`1px solid ${f.c}40`}}/>
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px]" style={{color:'#9e9b94'}}>%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1"><label className="text-xs font-bold" style={{color:'#9e9b94'}}>🏦 Investimento Inicial (R$)</label><InfoBtn id="invInicial"/></div>
                  <p className="text-xs mb-1" style={{color:'#6b6860'}}>Valor total investido no negócio</p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{color:'#9e9b94'}}>R$</span>
                    <input type="number" value={invInicial} onChange={e=>setInvInicial(e.target.value)} placeholder="Ex: 100000"
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-white text-sm focus:outline-none"
                      style={{background:'#f5f4f0',border:'1px solid #ffffff'}}/>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1"><label className="text-xs font-bold" style={{color:'#9e9b94'}}>📉 Total a ser Depreciado (R$)</label><InfoBtn id="totalDeprec"/></div>
                  <p className="text-xs mb-1" style={{color:'#6b6860'}}>
                    Equipamentos, móveis, reformas — dividido por 84 meses (7 anos) — padrão recomendado
                    {n(totalDeprec)>0 && <span style={{color:'#7c6fe0'}}> → {fmtR(depMensal)}/mês</span>}
                  </p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{color:'#9e9b94'}}>R$</span>
                    <input type="number" value={totalDeprec} onChange={e=>setTotalDeprec(e.target.value)} placeholder="Ex: 10000"
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-white text-sm focus:outline-none"
                      style={{background:'#f5f4f0',border:'1px solid #ffffff'}}/>
                  </div>
                </div>
              </div>
            </div>

            {/* Despesas Indiretas */}
            <div className="rounded-2xl border overflow-hidden" style={{background:'#faf9f7',borderColor:'#ffffff'}}>
              <button onClick={()=>setSecIndiretas(p=>!p)} className="w-full flex items-center justify-between px-5 py-3 border-b hover:bg-white/2 transition-colors" style={{background:'#0d1525',borderColor:'#ffffff'}}>
                <div className="flex items-center gap-2">
                  {secIndiretas ? <ChevronUp size={14} style={{color:'#f59e0b'}}/> : <ChevronDown size={14} style={{color:'#f59e0b'}}/>}
                  <span className="font-bold text-sm" style={{color:'#f59e0b'}}>📋 Despesas Indiretas (Fixas)</span>
                  {!secIndiretas && totInd > 0 && <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{background:'#f59e0b20',color:'#f59e0b'}}>{fmtR(totInd)}</span>}
                </div>
                <div className="flex items-center gap-3" onClick={e=>e.stopPropagation()}>
                  <button onClick={()=>setShowCatDespesa(true)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                    style={{background:'#f59e0b20',color:'#f59e0b',border:'1px solid #f59e0b40'}}>
                    <Plus size={11}/> Gerenciar Catálogo
                  </button>
                  <span className="font-bold text-sm" style={{color:'#f59e0b'}}>{fmtR(totInd)}</span>
                </div>
              </button>
              {!secIndiretas && (
                <div className="px-5 py-3 text-xs" style={{color:'#6b6860'}}>
                  Clique no cabeçalho para expandir e preencher as despesas fixas mensais.
                </div>
              )}
              {secIndiretas && <><div className="grid grid-cols-12 gap-2 px-5 py-2 text-[10px] font-bold uppercase tracking-wider border-b" style={{color:'#6b6860',borderColor:'#ffffff20'}}>
                <div className="col-span-5">Despesa</div>
                <div className="col-span-3">Valor Mensal (R$)</div>
                <div className="col-span-2">% Fat.</div>
                <div className="col-span-2">Dica</div>
              </div>
              {despInd.map((d,i)=>{
                const v=n(d.valor), pctV=fatN>0?(v/fatN*100):0
                const cor=pctV>20?'#ef4444':pctV>10?'#f59e0b':'#10b981'
                return(
                  <div key={i} className="grid grid-cols-12 gap-2 px-5 py-2 items-center hover:bg-white/2" style={{borderBottom:'1px solid #ffffff10'}}>
                    <div className="col-span-5 flex items-center gap-1.5">
                      <span className="text-xs" style={{color:'#3a3835'}}>{d.nome}</span>
                      <InfoBtn id={d.nome==='Aluguel'?'aluguel':d.nome==='Energia Elétrica'?'energia':d.nome==='Água'?'agua':d.nome==='Contabilidade'?'contabilidade':''}/>
                    </div>
                    <div className="col-span-3">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px]" style={{color:'#9e9b94'}}>R$</span>
                        <input type="number" value={d.valor}
                          onChange={e=>{const nd=[...despInd];nd[i]={...nd[i],valor:e.target.value};setDespInd(nd)}}
                          placeholder="0"
                          className="w-full pl-6 pr-2 py-1 rounded-lg text-xs text-white focus:outline-none"
                          style={{background:'#f5f4f0',border:`1px solid ${v>0?'#dedad460':'#ffffff'}`}}/>
                      </div>
                    </div>
                    <div className="col-span-2 text-xs text-center" style={{color:v>0?cor:'#dedad4'}}>
                      {v>0?`${pctV.toFixed(1)}%`:'—'}
                    </div>
                    <div className="col-span-2 text-[10px]" style={{color:'#6b6860'}}>{d.dica}</div>
                  </div>
                )
              })}
              {/* Extras */}
              {extrasDespInd.map((d,i)=>(
                <div key={i} className="grid grid-cols-12 gap-2 px-5 py-2 items-center" style={{borderBottom:'1px solid #ffffff10'}}>
                  <div className="col-span-5 relative">
                    <input value={d.nome} onChange={e=>{const nd=[...extrasDespInd];nd[i]={...nd[i],nome:e.target.value};setExtrasDespInd(nd);setAutocomplDespesa(`ind-${i}`)}}
                      onFocus={()=>setAutocomplDespesa(`ind-${i}`)} onBlur={()=>setTimeout(()=>setAutocomplDespesa(null),200)}
                      placeholder="Nome da despesa"
                      className="w-full px-2 py-1 rounded-lg text-xs text-white focus:outline-none"
                      style={{background:'#f5f4f0',border:'1px solid #dedad4'}}/>
                    {autocomplDespesa===`ind-${i}` && sugestoesDespesa(d.nome,'indireta').length>0 && (
                      <div className="absolute top-full left-0 right-0 z-50 rounded-lg border shadow-xl" style={{background:'#faf9f7',borderColor:'#dedad4'}}>
                        {sugestoesDespesa(d.nome,'indireta').map((s,si)=>(
                          <button key={si} onMouseDown={()=>{const nd=[...extrasDespInd];nd[i]={...nd[i],nome:s.nome};setExtrasDespInd(nd);setAutocomplDespesa(null)}}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 text-white" style={{borderBottom:'1px solid #ffffff10'}}>{s.nome}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="col-span-3">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px]" style={{color:'#9e9b94'}}>R$</span>
                      <input type="number" value={d.valor} onChange={e=>{const nd=[...extrasDespInd];nd[i]={...nd[i],valor:e.target.value};setExtrasDespInd(nd)}}
                        className="w-full pl-6 pr-2 py-1 rounded-lg text-xs text-white focus:outline-none"
                        style={{background:'#f5f4f0',border:'1px solid #dedad4'}}/>
                    </div>
                  </div>
                  <div className="col-span-2"/>
                  <div className="col-span-2 flex justify-end">
                    <button onClick={()=>setExtrasDespInd(prev=>prev.filter((_,idx)=>idx!==i))} style={{color:'#6b6860'}}><Trash2 size={12}/></button>
                  </div>
                </div>
              ))}
              <div className="px-5 py-3 border-t" style={{borderColor:'#ffffff'}}>
                <button onClick={()=>setExtrasDespInd(p=>[...p,{nome:'',valor:'',dica:''}])}
                  className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg"
                  style={{background:'#f59e0b20',color:'#f59e0b',border:'1px dashed #f59e0b40'}}>
                  <Plus size={12}/> Adicionar despesa
                </button>
              </div></>}
            </div>

            {/* Provisão */}
            <div className="rounded-2xl border overflow-hidden" style={{background:'#faf9f7',borderColor:'#ffffff'}}>
              <button onClick={()=>setSecProvisao(p=>!p)} className="w-full flex items-center justify-between px-5 py-3 border-b hover:bg-white/2 transition-colors" style={{background:'#0d1525',borderColor:'#ffffff'}}>
                <div className="flex items-center gap-2">
                  {secProvisao ? <ChevronUp size={14} style={{color:'#7c6fe0'}}/> : <ChevronDown size={14} style={{color:'#7c6fe0'}}/>}
                  <div className="text-left">
                    <span className="font-bold text-sm" style={{color:'#7c6fe0'}}>📅 Provisão Mensal</span>
                    <p className="text-[10px] mt-0.5" style={{color:'#9e9b94'}}>✨ Automático a partir de <strong style={{color:'#7c6fe0'}}>Salários</strong></p>
                  </div>
                </div>
                <span className="font-bold text-sm" style={{color:'#7c6fe0'}}>{fmtR(totProvisao)}</span>
              </button>
              {secProvisao && <><div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5">
                {[
                  {l:'13º Salário',v:sal13,set:setSal13,dica:'Auto: Salários ÷ 12',info:'sal13'},
                  {l:'Férias',v:ferias,set:setFerias,dica:'Auto: Salários ÷ 36 (1/3 mensal)',info:'ferias'},
                  {l:'FGTS Rescisório',v:fgtsR,set:setFgtsR,dica:'Auto: Salários × 4%',info:'fgtsR'},
                ].map((f:any)=>(
                  <div key={f.l}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <label className="text-xs font-bold" style={{color:'#7c6fe0'}}>{f.l}</label>
                      <InfoBtn id={f.info}/>
                    </div>
                    <p className="text-[10px] mb-1" style={{color:'#6b6860'}}>{f.dica}</p>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{color:'#9e9b94'}}>R$</span>
                      <input type="number" value={f.v} onChange={e=>f.set(e.target.value)} placeholder="0"
                        className="w-full pl-8 pr-2 py-2 rounded-lg text-sm text-white focus:outline-none"
                        style={{background:'#f5f4f0',border:'1px solid #ffffff'}}/>
                    </div>
                  </div>
                ))}
              </div>
              {depMensal > 0 && (
                <div className="px-5 pb-3 flex items-center gap-2 text-xs" style={{color:'#9e9b94'}}>
                  <span>📉 Depreciação mensal:</span>
                  <span className="font-bold" style={{color:'#7c6fe0'}}>{fmtR(depMensal)}</span>
                  <span style={{color:'#dedad4'}}>(inclusa no Custo Operacional)</span>
                </div>
              )}</>}
            </div>

            {/* Despesas Diretas */}
            <div className="rounded-2xl border overflow-hidden" style={{background:'#faf9f7',borderColor:'#ffffff'}}>
              <button onClick={()=>setSecDiretas(p=>!p)} className="w-full flex items-center justify-between px-5 py-3 border-b hover:bg-white/2 transition-colors" style={{background:'#0d1525',borderColor:'#ffffff'}}>
                <div className="flex items-center gap-2">
                  {secDiretas ? <ChevronUp size={14} style={{color:'#ef4444'}}/> : <ChevronDown size={14} style={{color:'#ef4444'}}/>}
                  <span className="font-bold text-sm" style={{color:'#ef4444'}}>📌 Despesas Diretas (Variáveis)</span>
                  {!secDiretas && totDiretas > 0 && <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{background:'#ef444420',color:'#ef4444'}}>{fmtR(totDiretas)}</span>}
                </div>
                <span className="font-bold text-sm" style={{color:'#ef4444'}}>{fmtR(totDiretas)}</span>
              </button>
              {secDiretas && <><div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5">
                {[
                  {l:'Imposto (R$)',v:imposto,set:setImposto,dica:'Simples Nacional ou regime tributário do mês',info:'imposto'},
                  {l:'Produto/Insumo (R$)',v:produto,set:setProduto,dica:'Total de produtos consumidos nos serviços',info:'produto'},
                  {l:'Rateio/Comissão (R$)',v:rateio,set:setRateio,dica:'Comissões pagas aos profissionais',info:'rateio'},
                  {l:'Taxa de Cartão (R$)',v:taxaC,set:setTaxaC,dica:'Total cobrado pelas maquininhas no mês',info:'taxaC'},
                ].map((f:any)=>(
                  <div key={f.l}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <label className="text-xs font-bold" style={{color:'#ef4444'}}>{f.l}</label>
                      <InfoBtn id={f.info}/>
                    </div>
                    <p className="text-[10px] mb-1" style={{color:'#6b6860'}}>{f.dica}</p>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{color:'#9e9b94'}}>R$</span>
                      <input type="number" value={f.v} onChange={e=>f.set(e.target.value)} placeholder="0"
                        className="w-full pl-8 pr-2 py-2 rounded-lg text-sm text-white focus:outline-none"
                        style={{background:'#f5f4f0',border:'1px solid #ffffff'}}/>
                    </div>
                  </div>
                ))}
                {/* Extras Diretas */}
                {extrasDiretas.map((d,i)=>(
                  <div key={i} className="relative">
                    <div className="flex items-center gap-1 mb-1">
                      <div className="flex-1 relative">
                        <input value={d.nome} onChange={e=>{const nd=[...extrasDiretas];nd[i]={...nd[i],nome:e.target.value};setExtrasDiretas(nd);setAutocomplDespesa(`dir-${i}`)}}
                          onFocus={()=>setAutocomplDespesa(`dir-${i}`)} onBlur={()=>setTimeout(()=>setAutocomplDespesa(null),200)}
                          placeholder="Nome da despesa" className="w-full px-2 py-1 rounded-lg text-xs text-white focus:outline-none"
                          style={{background:'#f5f4f0',border:'1px solid #ef444440'}}/>
                        {autocomplDespesa===`dir-${i}` && sugestoesDespesa(d.nome,'direta').length>0 && (
                          <div className="absolute top-full left-0 right-0 z-50 rounded-lg border shadow-xl" style={{background:'#faf9f7',borderColor:'#dedad4'}}>
                            {sugestoesDespesa(d.nome,'direta').map((s,si)=>(
                              <button key={si} onMouseDown={()=>{const nd=[...extrasDiretas];nd[i]={...nd[i],nome:s.nome};setExtrasDiretas(nd);setAutocomplDespesa(null)}}
                                className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 text-white" style={{borderBottom:'1px solid #ffffff10'}}>{s.nome}</button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button onClick={()=>setExtrasDiretas(p=>p.filter((_,idx)=>idx!==i))} style={{color:'#6b6860'}}><Trash2 size={12}/></button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px]" style={{color:'#9e9b94'}}>R$</span>
                      <input type="number" value={d.valor} onChange={e=>{const nd=[...extrasDiretas];nd[i]={...nd[i],valor:e.target.value};setExtrasDiretas(nd)}}
                        className="w-full pl-6 pr-2 py-1.5 rounded-lg text-xs text-white focus:outline-none" style={{background:'#f5f4f0',border:'1px solid #dedad4'}}/>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t" style={{borderColor:'#ffffff'}}>
                <button onClick={()=>setExtrasDiretas(p=>[...p,{nome:'',valor:'',dica:''}])}
                  className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg"
                  style={{background:'#ef444420',color:'#ef4444',border:'1px dashed #ef444440'}}>
                  <Plus size={12}/> Adicionar despesa direta
                </button>
              </div></>}
            </div>

            {/* Outras Despesas */}
            <div className="rounded-2xl border overflow-hidden" style={{background:'#faf9f7',borderColor:'#ffffff'}}>
              <button onClick={()=>setSecOutras(p=>!p)} className="w-full flex items-center justify-between px-5 py-3 border-b hover:bg-white/2 transition-colors" style={{background:'#0d1525',borderColor:'#ffffff'}}>
                <div className="flex items-center gap-2">
                  {secOutras ? <ChevronUp size={14} style={{color:'#06b6d4'}}/> : <ChevronDown size={14} style={{color:'#06b6d4'}}/>}
                  <span className="font-bold text-sm" style={{color:'#06b6d4'}}>💸 Outras Despesas / Gasto de Capital</span>
                  {!secOutras && totOutras > 0 && <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{background:'#06b6d420',color:'#06b6d4'}}>{fmtR(totOutras)}</span>}
                </div>
                <span className="font-bold text-sm" style={{color:'#06b6d4'}}>{fmtR(totOutras)}</span>
              </button>
              {secOutras && <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5">
                {[
                  {l:'Aquisição de Equipamento (R$)',v:aquisicaoEq,set:setAquisicaoEq,dica:'Compra de equipamentos, móveis, utensílios',info:'aquisicaoEq'},
                  {l:'Distribuição de Sócios (R$)',v:distSocios,set:setDistSocios,dica:'Retirada de lucros pelos sócios',info:'distSocios'},
                ].map((f:any)=>(
                  <div key={f.l}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <label className="text-xs font-bold" style={{color:'#06b6d4'}}>{f.l}</label>
                      <InfoBtn id={f.info}/>
                    </div>
                    <p className="text-[10px] mb-1" style={{color:'#6b6860'}}>{f.dica}</p>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{color:'#9e9b94'}}>R$</span>
                      <input type="number" value={f.v} onChange={e=>f.set(e.target.value)} placeholder="0"
                        className="w-full pl-8 pr-2 py-2 rounded-lg text-sm text-white focus:outline-none"
                        style={{background:'#f5f4f0',border:'1px solid #ffffff'}}/>
                    </div>
                  </div>
                ))}
                {/* Extras Outras */}
                {extrasOutras.map((d,i)=>(
                  <div key={i} className="relative">
                    <div className="flex items-center gap-1 mb-1">
                      <div className="flex-1 relative">
                        <input value={d.nome} onChange={e=>{const nd=[...extrasOutras];nd[i]={...nd[i],nome:e.target.value};setExtrasOutras(nd);setAutocomplDespesa(`out-${i}`)}}
                          onFocus={()=>setAutocomplDespesa(`out-${i}`)} onBlur={()=>setTimeout(()=>setAutocomplDespesa(null),200)}
                          placeholder="Nome da despesa" className="w-full px-2 py-1 rounded-lg text-xs text-white focus:outline-none"
                          style={{background:'#f5f4f0',border:'1px solid #06b6d440'}}/>
                        {autocomplDespesa===`out-${i}` && sugestoesDespesa(d.nome,'outras').length>0 && (
                          <div className="absolute top-full left-0 right-0 z-50 rounded-lg border shadow-xl" style={{background:'#faf9f7',borderColor:'#dedad4'}}>
                            {sugestoesDespesa(d.nome,'outras').map((s,si)=>(
                              <button key={si} onMouseDown={()=>{const nd=[...extrasOutras];nd[i]={...nd[i],nome:s.nome};setExtrasOutras(nd);setAutocomplDespesa(null)}}
                                className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 text-white" style={{borderBottom:'1px solid #ffffff10'}}>{s.nome}</button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button onClick={()=>setExtrasOutras(p=>p.filter((_,idx)=>idx!==i))} style={{color:'#6b6860'}}><Trash2 size={12}/></button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px]" style={{color:'#9e9b94'}}>R$</span>
                      <input type="number" value={d.valor} onChange={e=>{const nd=[...extrasOutras];nd[i]={...nd[i],valor:e.target.value};setExtrasOutras(nd)}}
                        className="w-full pl-6 pr-2 py-1.5 rounded-lg text-xs text-white focus:outline-none" style={{background:'#f5f4f0',border:'1px solid #dedad4'}}/>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t" style={{borderColor:'#ffffff'}}>
                <button onClick={()=>setExtrasOutras(p=>[...p,{nome:'',valor:'',dica:''}])}
                  className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg"
                  style={{background:'#06b6d420',color:'#06b6d4',border:'1px dashed #06b6d440'}}>
                  <Plus size={12}/> Adicionar outra despesa
                </button>
              </div></>}
            </div>

            {/* Resultado */}
            {fatN > 0 && (
              <div className="space-y-3">
                {/* Resumo sempre visível */}
                <div className="rounded-2xl border overflow-hidden" style={{background:'#faf9f7',borderColor:'#10b98130'}}>
                  <button onClick={()=>setSecResultado(p=>!p)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/2 transition-colors">
                    <div className="flex items-center gap-3">
                      {secResultado ? <ChevronUp size={14} style={{color:'#10b981'}}/> : <ChevronDown size={14} style={{color:'#10b981'}}/>}
                      <span className="font-bold text-sm" style={{color:'#10b981'}}>📊 Resultado do Mês</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[10px]" style={{color:'#9e9b94'}}>Resultado Operacional</p>
                        <p className="text-lg font-bold" style={{color:corRes(resultOp)}}>{fmtR(resultOp)} <span className="text-xs font-normal">({pctStr(resultOp,fatN)})</span></p>
                      </div>
                    </div>
                  </button>
                </div>
                {secResultado && <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {l:'Custo Operacional Total',v:custoOp,pct:pctStr(custoOp,fatN),c:'#f59e0b',dica:'Indiretas + Provisão + Depreciação'},
                    {l:'Margem Operacional',v:margOpR,pct:pctStr(margOpR,fatN),c:'#06b6d4',dica:'Faturamento − Despesas Diretas'},
                    {l:'Resultado Operacional',v:resultOp,pct:pctStr(resultOp,fatN),c:corRes(resultOp),dica:'Margem − Custo Operacional'},
                    {l:'Resultado Financeiro',v:resultFin,pct:pctStr(resultFin,fatN),c:corRes(resultFin),dica:'Resultado Op. − Outras Despesas + Depreciação'},
                  ].map((c,i)=>(
                    <div key={i} className="rounded-xl p-4 border" style={{background:'#0d1525',borderColor:'#ffffff'}}>
                      <p className="text-xs mb-0.5" style={{color:'#9e9b94'}}>{c.l}</p>
                      <p className="text-[10px] mb-2" style={{color:'#dedad4'}}>{c.dica}</p>
                      <p className="text-2xl font-bold" style={{color:c.c}}>{fmtR(c.v)}</p>
                      <p className="text-xs mt-1" style={{color:c.c+'99'}}>{c.pct} do faturamento</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {l:'Ponto de Equilíbrio',v:fmtR(pe),c:'#10b981',dica:'Faturamento mínimo para cobrir tudo'},
                    {l:`PE c/ Lucro de ${lucroD}%`,v:fmtR(peLucro),c:'#7c6fe0',dica:'Para cobrir custos + lucro desejado'},
                    {l:'Rentabilidade',v:`${(rentab*100).toFixed(2)}%`,c:corRes(rentab),dica:'Resultado Op. / Investimento Inicial'},
                    {l:'Capital de Giro Mínimo',v:fmtR(capGiro),c:'#06b6d4',dica:'Custo Operacional × 3 meses'},
                  ].map((c,i)=>(
                    <div key={i} className="rounded-xl p-4 border text-center" style={{background:'#0d1525',borderColor:'#ffffff'}}>
                      <p className="text-[10px] mb-1" style={{color:'#9e9b94'}}>{c.l}</p>
                      <p className="text-lg font-bold" style={{color:c.c}}>{c.v}</p>
                      <p className="text-[9px] mt-1" style={{color:'#dedad4'}}>{c.dica}</p>
                    </div>
                  ))}
                </div>

                {/* Verificação vs desejado */}
                <div className="rounded-xl p-4 border" style={{background:'#faf9f7',borderColor:'#ffffff'}}>
                  <p className="text-xs font-bold mb-3" style={{color:'#9e9b94'}}>📊 Realizado vs Desejado (Metodologia Recomendada)</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      // Para CUSTOS: quanto MENOS, melhor. Ok = abaixo ou igual à meta
                      {l:'Custo Indireto',real:fatN>0?custoOp/fatN*100:0,desej:n(custIndD),c:'#f59e0b',tipo:'custo',
                        limite:'máx',dica:'Quanto menor, melhor. Meta é o LIMITE máximo.'},
                      {l:'Custo Direto',real:fatN>0?totDiretas/fatN*100:0,desej:n(custDirD),c:'#ef4444',tipo:'custo',
                        limite:'máx',dica:'Quanto menor, melhor. Meta é o LIMITE máximo.'},
                      // Para LUCRO: quanto MAIS, melhor. Ok = igual ou acima da meta
                      {l:'Lucro',real:fatN>0?resultOp/fatN*100:0,desej:n(lucroD),c:'#10b981',tipo:'lucro',
                        limite:'mín',dica:'Quanto maior, melhor. Meta é o MÍNIMO desejado.'},
                    ].map((c:any)=>{
                      // Custo: ok se MENOR OU IGUAL à meta (gastar menos é ótimo)
                      // Lucro: ok se MAIOR OU IGUAL à meta (lucrar mais é ótimo)
                      const ok = c.tipo==='custo' ? c.real <= c.desej : c.real >= c.desej
                      const otimo = c.tipo==='custo' ? c.real <= c.desej*0.8 : c.real >= c.desej*1.5
                      const status = ok
                        ? (otimo
                          ? (c.tipo==='custo' ? '🎉 Excelente! Bem abaixo do limite' : '🏆 Excepcional! Muito acima da meta')
                          : (c.tipo==='custo' ? '✅ Dentro do limite' : '✅ Meta atingida'))
                        : (c.tipo==='custo' ? '⚠️ Acima do limite máximo' : '⚠️ Abaixo da meta mínima')
                      const corBorda = ok ? '#10b98130' : '#ef444430'
                      return(
                        <div key={c.l} className="rounded-lg p-3 border" style={{background:'#f5f4f0',borderColor:corBorda}}>
                          <p className="text-[10px] mb-1" style={{color:'#9e9b94'}}>{c.l}</p>
                          <div className="flex items-end gap-2">
                            <span className="text-base font-bold" style={{color:ok?c.c:'#ef4444'}}>{c.real.toFixed(1)}%</span>
                            <span className="text-[10px]" style={{color:'#6b6860'}}>{c.limite}: {c.desej}%</span>
                          </div>
                          <p className="text-[10px] mt-1" style={{color:ok?'#10b981':'#ef4444'}}>{status}</p>
                          <p className="text-[9px] mt-0.5" style={{color:'#dedad4'}}>{c.dica}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Extras */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {l:'🚨 Quanto guardei de reserva ESTE MÊS',v:reservaEmerg,set:setReservaEmerg,dica:'O que você separou/guardou especificamente este mês',info:'reservaEmerg'},
                    {l:'📦 Valor de Produtos em Estoque',v:vlrProdEstoque,set:setVlrProdEstoque,dica:'Valor total do estoque atual',info:'vlrProdEstoque'},
                  ].map((f:any)=>(
                    <div key={f.l} className="rounded-xl p-4 border" style={{background:'#faf9f7',borderColor:'#ffffff'}}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <label className="text-xs font-bold" style={{color:'#9e9b94'}}>{f.l}</label>
                        <InfoBtn id={f.info}/>
                      </div>
                      <p className="text-[10px] mb-2" style={{color:'#6b6860'}}>{f.dica}</p>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{color:'#9e9b94'}}>R$</span>
                        <input type="number" value={f.v} onChange={e=>f.set(e.target.value)} placeholder="0"
                          className="w-full pl-9 pr-3 py-2 rounded-lg text-sm text-white focus:outline-none"
                          style={{background:'#f5f4f0',border:'1px solid #ffffff'}}/>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ══ RESUMO FINANCEIRO COMPLETO ══ */}
                <div className="rounded-2xl border overflow-hidden" style={{borderColor:'#5b4fcf50'}}>
                  <div className="px-5 py-4 border-b" style={{background:'linear-gradient(135deg,#0d1525,#faf9f7)',borderColor:'#ffffff'}}>
                    <h2 className="font-bold text-base text-white flex items-center gap-2">📊 Resumo da Situação Financeira — {MESES_NOMES[mesSel]}/{anoSel}</h2>
                    <p className="text-xs mt-1" style={{color:'#9e9b94'}}>Tudo que você precisa saber sobre a saúde financeira do seu salão neste mês.</p>
                  </div>

                  {/* Semáforo geral */}
                  {(() => {
                    const lucroReal = fatN > 0 ? resultOp / fatN * 100 : 0
                    const acimaPE = fatN >= pe && pe > 0
                    let cor = '#10b981', icone = '🟢', titulo = 'SAUDÁVEL', msg = 'Parabéns! O salão está lucrando e acima do ponto de equilíbrio.'
                    if (!acimaPE || lucroReal < 0) { cor='#ef4444'; icone='🔴'; titulo='ATENÇÃO URGENTE'; msg='O salão está operando abaixo do ponto de equilíbrio. Os gastos superam a receita.' }
                    else if (lucroReal < 10) { cor='#f59e0b'; icone='🟡'; titulo='ATENÇÃO'; msg='O salão cobre os custos, mas a margem de lucro está baixa. É hora de revisar os gastos.' }
                    return (
                      <div className="p-5 border-b" style={{background:`${cor}08`,borderColor:`${cor}30`}}>
                        <div className="flex items-center gap-4">
                          <div className="text-4xl">{icone}</div>
                          <div className="flex-1">
                            <p className="text-lg font-bold" style={{color:cor}}>Situação: {titulo}</p>
                            <p className="text-sm mt-1" style={{color:'#9e9b94'}}>{msg}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs" style={{color:'#9e9b94'}}>Lucro do mês</p>
                            <p className="text-2xl font-bold" style={{color:cor}}>{fmtR(resultOp)}</p>
                            <p className="text-xs" style={{color:cor+'99'}}>{lucroReal.toFixed(1)}% do faturamento</p>
                          </div>
                        </div>
                      </div>
                    )
                  })()}

                  {/* O que entrou e o que saiu */}
                  <div className="p-5 border-b" style={{borderColor:'#ffffff'}}>
                    <p className="text-xs font-bold mb-4" style={{color:'#9e9b94'}}>💰 PARA ONDE FOI O SEU DINHEIRO</p>
                    <div className="space-y-3">
                      {/* Barra de faturamento */}
                      <div className="flex items-center gap-3">
                        <div className="w-32 text-xs text-right" style={{color:'#3a3835'}}>Faturamento</div>
                        <div className="flex-1 rounded-full h-6 relative overflow-hidden" style={{background:'#ffffff'}}>
                          <div className="h-6 rounded-full flex items-center px-3" style={{width:'100%',background:'#10b98130',border:'1px solid #10b98150'}}>
                            <span className="text-[10px] font-bold" style={{color:'#10b981'}}>{fmtR(fatN)} = 100%</span>
                          </div>
                        </div>
                      </div>
                      {[
                        {l:'Despesas Diretas',v:totDiretas,c:'#ef4444',desc:'Comissões, produtos, imposto, cartão'},
                        {l:'Despesas Fixas',v:custoOp,c:'#f59e0b',desc:'Aluguel, luz, salários, provisões, depreciação'},
                        {l:'Outras Despesas',v:n(aquisicaoEq)+n(distSocios),c:'#06b6d4',desc:'Equipamentos, distribuição de sócios'},
                        {l:'LUCRO LÍQUIDO',v:Math.max(0,resultOp-totOutras),c:'#5b4fcf',desc:'O que sobrou para você depois de tudo'},
                      ].filter(i=>i.v>0).map((item,idx)=>{
                        const pct = fatN > 0 ? (item.v/fatN)*100 : 0
                        return (
                          <div key={idx} className="flex items-center gap-3">
                            <div className="w-32 text-xs text-right" style={{color:'#3a3835'}}>{item.l}</div>
                            <div className="flex-1 rounded-full h-6 relative overflow-hidden" style={{background:'#ffffff'}}>
                              <div className="h-6 rounded-full flex items-center px-3 transition-all" style={{width:`${Math.max(pct,3)}%`,background:`${item.c}25`,border:`1px solid ${item.c}50`}}>
                                <span className="text-[10px] font-bold whitespace-nowrap" style={{color:item.c}}>{fmtR(item.v)} ({pct.toFixed(1)}%)</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      {resultOp < 0 && (
                        <div className="flex items-center gap-3">
                          <div className="w-32 text-xs text-right" style={{color:'#ef4444'}}>PREJUÍZO</div>
                          <div className="flex-1 rounded-full h-6 flex items-center px-3" style={{background:'#ef444415',border:'1px solid #ef444440'}}>
                            <span className="text-[10px] font-bold" style={{color:'#ef4444'}}>🚨 {fmtR(Math.abs(resultOp))} de prejuízo neste mês</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Números-chave em linguagem simples */}
                  <div className="p-5 border-b" style={{borderColor:'#ffffff'}}>
                    <p className="text-xs font-bold mb-4" style={{color:'#9e9b94'}}>🎯 OS NÚMEROS QUE VOCÊ PRECISA SABER</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-xl p-4" style={{background:'#f5f4f0',border:'1px solid #ffffff'}}>
                        <p className="text-xs mb-1" style={{color:'#9e9b94'}}>⚖️ Ponto de Equilíbrio</p>
                        <p className="text-xl font-bold" style={{color:'#10b981'}}>{fmtR(pe)}</p>
                        <p className="text-[10px] mt-1" style={{color:'#6b6860'}}>É o mínimo que você precisa faturar para não ter prejuízo.</p>
                        <p className="text-[10px] mt-1 font-bold" style={{color:fatN>=pe&&pe>0?'#10b981':'#ef4444'}}>
                          {pe===0?'Preencha as despesas acima':fatN>=pe?`✅ Você está ${fmtR(fatN-pe)} ACIMA do equilíbrio`:`🚨 Falta ${fmtR(pe-fatN)} para cobrir todos os custos`}
                        </p>
                      </div>
                      <div className="rounded-xl p-4" style={{background:'#f5f4f0',border:'1px solid #ffffff'}}>
                        <p className="text-xs mb-1" style={{color:'#9e9b94'}}>🎯 Para ter {lucroD}% de Lucro</p>
                        <p className="text-xl font-bold" style={{color:'#7c6fe0'}}>{fmtR(peLucro)}</p>
                        <p className="text-[10px] mt-1" style={{color:'#6b6860'}}>Faturamento necessário para atingir sua meta de lucro.</p>
                        <p className="text-[10px] mt-1 font-bold" style={{color:fatN>=peLucro&&peLucro>0?'#10b981':'#f59e0b'}}>
                          {peLucro===0?'—':fatN>=peLucro?`✅ Meta atingida!`:`Falta ${fmtR(peLucro-fatN)} para a meta`}
                        </p>
                      </div>
                      <div className="rounded-xl p-4" style={{background:'#f5f4f0',border:'1px solid #ffffff'}}>
                        <p className="text-xs mb-1" style={{color:'#9e9b94'}}>💼 Retorno sobre Investimento</p>
                        <p className="text-xl font-bold" style={{color:rentab>0?'#10b981':'#ef4444'}}>{n(invInicial)>0?(rentab*100).toFixed(2)+'%':'—'}</p>
                        <p className="text-[10px] mt-1" style={{color:'#6b6860'}}>
                          {n(invInicial)>0?`Para cada R$100 investidos, você recuperou R$${(rentab*100).toFixed(2)}.`:'Informe o Investimento Inicial para calcular.'}
                        </p>
                      </div>
                      <div className="rounded-xl p-4" style={{background:'#f5f4f0',border:'1px solid #ffffff'}}>
                        <p className="text-xs mb-1" style={{color:'#9e9b94'}}>🏦 Reserva de Emergência</p>
                        <div className="flex items-end gap-2 mt-1">
                          <p className="text-xl font-bold" style={{color:'#06b6d4'}}>{fmtR(totalReservaAcum)}</p>
                          <p className="text-[10px] mb-0.5" style={{color:'#6b6860'}}>acumulado</p>
                        </div>
                        <p className="text-[10px] mt-1" style={{color:'#6b6860'}}>Meta ideal: {fmtR(capGiro)} (3 meses de custos)</p>
                        {/* Barra de progresso */}
                        {capGiro > 0 && (
                          <div className="mt-2">
                            <div className="w-full rounded-full h-2" style={{background:'#ffffff'}}>
                              <div className="h-2 rounded-full transition-all" style={{width:`${Math.min((totalReservaAcum/capGiro)*100,100)}%`,background:'#06b6d4'}}/>
                            </div>
                            <p className="text-[10px] mt-1 font-bold" style={{color:totalReservaAcum>=capGiro?'#10b981':'#06b6d4'}}>
                              {totalReservaAcum>=capGiro
                                ? '✅ Reserva completa!'
                                : `${((totalReservaAcum/capGiro)*100).toFixed(0)}% da meta — falta ${fmtR(capGiro-totalReservaAcum)}`}
                            </p>
                          </div>
                        )}
                        {n(reservaEmerg)>0&&<p className="text-[10px] mt-1" style={{color:'#dedad4'}}>Este mês você guardou: {fmtR(n(reservaEmerg))}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Diagnóstico dos custos */}
                  <div className="p-5 border-b" style={{borderColor:'#ffffff'}}>
                    <p className="text-xs font-bold mb-3" style={{color:'#9e9b94'}}>🔍 DIAGNÓSTICO DOS SEUS CUSTOS</p>
                    <div className="space-y-2">
                      {[
                        {nome:'Aluguel',valor:n(despInd.find(d=>d.nome==='Aluguel')?.valor||'0'),limite:10,dica:'O ideal é até 10% do faturamento.'},
                        {nome:'Salários',valor:n(despInd.find(d=>d.nome==='Salários')?.valor||'0'),limite:40,dica:'O ideal é entre 35% e 45%.'},
                        {nome:'Rateio/Comissão',valor:n(rateio),limite:50,dica:'Geralmente 40% a 55% do faturamento em comissões.'},
                        {nome:'Produto/Insumo',valor:n(produto),limite:12,dica:'O ideal é entre 8% e 12% do faturamento.'},
                        {nome:'Marketing',valor:n(despInd.find(d=>d.nome==='Marketing e Publicidade')?.valor||'0'),limite:5,dica:'Invista entre 3% e 5% do faturamento.'},
                      ].filter(c=>c.valor>0&&fatN>0).map((c,i)=>{
                        const pct = (c.valor/fatN)*100
                        const ok = pct <= c.limite
                        return (
                          <div key={i} className="flex items-center gap-3 p-2 rounded-lg" style={{background:'#f5f4f0'}}>
                            <span className="text-xs w-3">{ok?'✅':'⚠️'}</span>
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-0.5">
                                <span className="text-xs font-bold" style={{color:'#3a3835'}}>{c.nome}</span>
                                <span className="text-xs font-bold" style={{color:ok?'#10b981':'#f59e0b'}}>{fmtR(c.valor)} ({pct.toFixed(1)}%)</span>
                              </div>
                              <p className="text-[9px]" style={{color:'#6b6860'}}>{c.dica} {ok?'':'Você está acima.'}</p>
                            </div>
                          </div>
                        )
                      })}
                      {fatN===0&&<p className="text-xs text-center py-3" style={{color:'#6b6860'}}>Preencha o faturamento e as despesas para ver o diagnóstico.</p>}
                    </div>
                  </div>

                  {/* Próximos passos */}
                  {fatN > 0 && (
                    <div className="p-5">
                      <p className="text-xs font-bold mb-3" style={{color:'#9e9b94'}}>💡 O QUE FAZER AGORA</p>
                      <div className="space-y-2">
                        {resultOp < 0 && <div className="flex gap-2 p-3 rounded-xl" style={{background:'#ef444415',border:'1px solid #ef444430'}}><span>🚨</span><p className="text-xs" style={{color:'#fca5a5'}}>Seus gastos estão maiores que sua receita. Revise urgentemente as despesas diretas e veja se é possível aumentar o faturamento.</p></div>}
                        {fatN < pe && pe > 0 && resultOp >= 0 && <div className="flex gap-2 p-3 rounded-xl" style={{background:'#f59e0b15',border:'1px solid #f59e0b30'}}><span>⚠️</span><p className="text-xs" style={{color:'#fbbf24'}}>Você está abaixo do ponto de equilíbrio. Tente aumentar o faturamento em {fmtR(pe-fatN)} ou reduzir os custos fixos.</p></div>}
                        {pe > 0 && fatN >= pe && fatN < peLucro && <div className="flex gap-2 p-3 rounded-xl" style={{background:'#5b4fcf15',border:'1px solid #5b4fcf30'}}><span>📈</span><p className="text-xs" style={{color:'#7c6fe0'}}>Você cobre os custos, mas ainda não atingiu sua meta de lucro. Falta {fmtR(peLucro-fatN)} de faturamento. Adicione mais clientes ou suba o ticket médio.</p></div>}
                        {peLucro > 0 && fatN >= peLucro && <div className="flex gap-2 p-3 rounded-xl" style={{background:'#10b98115',border:'1px solid #10b98130'}}><span>🏆</span><p className="text-xs" style={{color:'#059669'}}>Excelente! Você superou a meta de lucro. Agora pense em guardar parte do lucro na reserva de emergência e considere reinvestir no salão.</p></div>}
                        {totalReservaAcum < capGiro && capGiro > 0 && (
                          <div className="flex gap-2 p-3 rounded-xl" style={{background:'#06b6d415',border:'1px solid #06b6d430'}}>
                            <span>💰</span>
                            <div>
                              <p className="text-xs font-bold mb-1" style={{color:'#67e8f9'}}>Reserva de Emergência: {fmtR(totalReservaAcum)} de {fmtR(capGiro)}</p>
                              <p className="text-xs" style={{color:'#67e8f9'}}>
                                {totalReservaAcum === 0
                                  ? `Você ainda não tem reserva. Comece guardando pelo menos ${fmtR(Math.ceil(capGiro/12))}/mês. Use o campo "Quanto guardei de reserva este mês" abaixo.`
                                  : `Você já tem ${fmtR(totalReservaAcum)} acumulado — ótimo! Falta ${fmtR(capGiro-totalReservaAcum)}. Continue guardando ${fmtR(Math.ceil((capGiro-totalReservaAcum)/12))}/mês.`}
                              </p>
                            </div>
                          </div>
                        )}
                        {totalReservaAcum >= capGiro && capGiro > 0 && <div className="flex gap-2 p-3 rounded-xl" style={{background:'#10b98115',border:'1px solid #10b98130'}}><span>🏦</span><p className="text-xs" style={{color:'#059669'}}>✅ Sua reserva de emergência está completa! Você tem {fmtR(totalReservaAcum)} guardados — equivalente a {((totalReservaAcum/capGiro)*3).toFixed(1)} meses de custos.</p></div>}
                        <div className="flex gap-2 p-3 rounded-xl" style={{background:'#5b4fcf15',border:'1px solid #5b4fcf30'}}><span>📅</span><p className="text-xs" style={{color:'#7c6fe0'}}>Salve os dados deste mês clicando em <strong>"Salvar {MESES_NOMES[mesSel]}"</strong> no topo para comparar com os próximos meses.</p></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Botão Atualizar */}
                <button onClick={atualizar}
                  className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                  style={{background:atualizando?'#10b98120':'#ffffff',color:atualizando?'#10b981':'#9e9b94',border:`1px solid ${atualizando?'#10b981':'#dedad4'}`}}>
                  {atualizando ? '✅ Tudo atualizado!' : '🔄 Atualizar Resultados'}
                </button>

                {/* Botão IA */}
                <div className="rounded-2xl border overflow-hidden" style={{borderColor:'#5b4fcf40'}}>
                  {!analiseIA&&!loadingIA&&!erroIA&&(
                    <button onClick={analisarIA} className="w-full py-4 font-bold text-sm flex items-center justify-center gap-2 transition-all hover:brightness-110"
                      style={{background:'linear-gradient(135deg,#5b4fcf20,#7c6fe020)',color:'#7c6fe0',border:'none'}}>
                      🤖 Quero a análise completa da NODRI IA
                      <span className="text-xs font-normal" style={{color:'#9e9b94'}}>— opcional</span>
                    </button>
                  )}
                  {loadingIA&&(<div className="p-5 flex items-center gap-3" style={{background:'#faf9f7'}}><Loader2 size={18} className="animate-spin" style={{color:'#5b4fcf'}}/><span className="text-sm" style={{color:'#9e9b94'}}>NODRI IA analisando...</span></div>)}
                  {erroIA&&(<div className="p-5 flex items-center justify-between" style={{background:'#faf9f7'}}><span className="text-sm" style={{color:'#ef4444'}}>⚠️ {erroIA}</span><button onClick={analisarIA} className="text-xs px-3 py-1.5 rounded-lg" style={{background:'#5b4fcf',color:'white'}}>Tentar novamente</button></div>)}
                  {analiseIA&&(<div className="p-6" style={{background:'#faf9f7'}}><h3 className="font-bold text-sm mb-4" style={{color:'#5b4fcf'}}>🤖 Análise da NODRI IA</h3><div className="text-sm leading-relaxed" style={{color:'#3a3835'}} dangerouslySetInnerHTML={{__html:analiseIA.replace(/\*\*(.*?)\*\*/g,'<strong style="color:#1a1a1a">$1</strong>').replace(/\n/g,'<br/>')}}/></div>)}
                </div>
              </div>}
            </div>
            )}
          </div>
        )}

        {/* ════ ABA PONTO DE EQUILÍBRIO ════ */}
        {aba==='pe' && (
          <div className="space-y-4">
            <GuiaPassos passos={[
              {titulo:'Receitas e Despesas',desc:'Preencha a aba RD primeiro — os valores vêm de lá automaticamente',ok:custoOp>0&&fatN>0,cor:'#10b981'},
              {titulo:'Área e Profissionais',desc:'Informe a metragem do salão e quantos profissionais trabalham',ok:n(areaM2)>0&&n(numProfs)>0,cor:'#f59e0b'},
              {titulo:'Meta de Lucro',desc:'Defina qual % de lucro você quer alcançar',ok:n(metaLucroPE)>0||n(lucroD)>0,cor:'#7c6fe0'},
              {titulo:'Ver o PE',desc:'O Ponto de Equilíbrio aparece automaticamente abaixo',ok:PE_>0,cor:'#5b4fcf'},
            ]}/>
            {(custoOp>0||fatN>0) && (
              <div className="rounded-xl p-3 text-xs flex items-center gap-2" style={{background:'#5b4fcf15',border:'1px solid #5b4fcf30',color:'#7c6fe0'}}>
                ✨ Dados da aba Receitas e Despesas: Custo Op. <strong>{fmtR(custoOp)}</strong> | Margem <strong>{(margOpPct*100).toFixed(1)}%</strong> | Faturamento <strong>{fmtR(fatN)}</strong>
              </div>
            )}
            <div className="rounded-2xl p-5 border" style={{background:'#faf9f7',borderColor:'#10b98140'}}>
              <h3 className="font-bold text-sm mb-4" style={{color:'#10b981'}}>⚙️ Parâmetros</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {l:'Custo Operacional (R$)',v:simDespesa,set:setSimDespesa,ph:custoOp>0?custoOp.toFixed(2):'0',tipo:'R$',info:'custoOpCad'},
                  {l:'Margem Operacional (%)',v:margemPE,set:setMargemPE,ph:margOpPct>0?(margOpPct*100).toFixed(1):'44',tipo:'%',info:'margemPE'},
                  {l:'Meta Lucro (%)',v:metaLucroPE,set:setMetaLucroPE,ph:n(lucroD)>0?lucroD:'15',tipo:'%',info:'metaLucroPE'},
                  {l:'Área do Salão (M²)',v:areaM2,set:setAreaM2,ph:'100',tipo:'m²',info:'areaM2'},
                  {l:'Nº de Profissionais',v:numProfs,set:setNumProfs,ph:'3',tipo:'',info:'numProfs'},
                  {l:'Faturamento Atual (R$)',v:fatPEManual,set:setFatPEManual,ph:fatN>0?fatN.toFixed(2):'0',tipo:'R$',info:'faturamento'},
                ].map((f:any)=>(
                  <div key={f.l}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <label className="text-xs font-bold" style={{color:'#9e9b94'}}>{f.l}</label>
                      <InfoBtn id={f.info}/>
                      {!f.v && f.ph && <AvisoDefault ativo={true} padrao={`usando ${f.ph} (automático)`} onPreencher={()=>{}} onManter={()=>{}}/>}
                    </div>
                    <div className="relative">
                      {f.tipo==='R$'&&<span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px]" style={{color:'#9e9b94'}}>R$</span>}
                      <input type="number" value={f.v} onChange={e=>f.set(e.target.value)} placeholder={f.ph}
                        className={`w-full ${f.tipo==='R$'?'pl-7':'pl-3'} ${f.tipo&&f.tipo!=='R$'?'pr-7':'pr-3'} py-2 rounded-lg text-xs text-white focus:outline-none`}
                        style={{background:'#f5f4f0',border:'1px solid #ffffff'}}/>
                      {f.tipo&&f.tipo!=='R$'&&<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px]" style={{color:'#9e9b94'}}>{f.tipo}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resultados PE */}
            {custoOpPE_>0&&margPE_>0&&(
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    {l:'⚖️ Ponto de Equilíbrio',v:fmtR(PE_),sub:'Faturamento mínimo para cobrir todos os custos',c:'#10b981'},
                    {l:`🎯 PE p/ Lucro de ${n(metaLucroPE)||n(lucroD)}%`,v:fmtR(PELucro_),sub:'Para cobrir custos E ter o lucro desejado',c:'#7c6fe0'},
                  ].map((c,i)=>(
                    <div key={i} className="rounded-2xl p-5 border" style={{background:'#0d1525',borderColor:`${c.c}30`}}>
                      <p className="text-xs font-bold mb-1" style={{color:c.c}}>{c.l}</p>
                      <p className="text-3xl font-bold mt-2" style={{color:c.c}}>{c.v}</p>
                      <p className="text-xs mt-2" style={{color:'#6b6860'}}>{c.sub}</p>
                      {fatPE_>0&&<p className="text-xs mt-1" style={{color:fatPE_>=PE_?'#10b981':'#ef4444'}}>{fatPE_>=PE_?`✅ Você fatura ${fmtR(fatPE_-PE_)} acima do PE`:`🚨 Falta ${fmtR(PE_-fatPE_)} para o PE`}</p>}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-2xl p-4 border" style={{background:'#faf9f7',borderColor:'#ffffff'}}>
                    <p className="text-xs font-bold mb-3" style={{color:'#06b6d4'}}>👤 PE por Profissional ({profs_} profissionais)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        {l:'PE por Profissional',v:fmtR(PEProf_)},
                        {l:'PE c/ Lucro por Prof.',v:fmtR(PEProfLucro_)},
                      ].map((c,i)=>(
                        <div key={i}>
                          <p className="text-[10px]" style={{color:'#9e9b94'}}>{c.l}</p>
                          <p className="text-lg font-bold" style={{color:'#06b6d4'}}>{c.v}</p>
                          <p className="text-[9px]" style={{color:'#dedad4'}}>cada profissional precisa gerar</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl p-4 border" style={{background:'#faf9f7',borderColor:'#ffffff'}}>
                    <p className="text-xs font-bold mb-3" style={{color:'#f59e0b'}}>📐 PE por M² ({n(areaM2)||100} m²)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        {l:'PE por M²',v:`${fmtR(PEM2_)}/m²`},
                        {l:'PE c/ Lucro por M²',v:`${fmtR(PEM2Lucro_)}/m²`},
                      ].map((c,i)=>(
                        <div key={i}>
                          <p className="text-[10px]" style={{color:'#9e9b94'}}>{c.l}</p>
                          <p className="text-lg font-bold" style={{color:'#f59e0b'}}>{c.v}</p>
                          <p className="text-[9px]" style={{color:'#dedad4'}}>cada m² precisa gerar</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl p-4 text-xs space-y-1" style={{background:'#faf9f7',border:'1px solid #ffffff',color:'#9e9b94'}}>
                  <p className="font-bold mb-1" style={{color:'#9e9b94'}}>💡 Como funciona:</p>
                  <p>• <strong style={{color:'#1a1a1a'}}>PE</strong> = Custo Operacional ÷ Margem Operacional% — faturamento mínimo para não ter prejuízo</p>
                  <p>• <strong style={{color:'#1a1a1a'}}>PE c/ Lucro</strong> = Custo Op ÷ (Margem% − Meta Lucro%) — para cobrir E lucrar</p>
                  <p>• <strong style={{color:'#1a1a1a'}}>PE por Profissional</strong> = PE Total ÷ nº de profissionais — meta individual</p>
                  <p>• <strong style={{color:'#1a1a1a'}}>PE por M²</strong> = PE Total ÷ área do salão — eficiência do espaço</p>
                </div>
              </div>
            )}
            <button onClick={atualizar} className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
              style={{background:atualizando?'#10b98120':'#ffffff',color:atualizando?'#10b981':'#9e9b94',border:`1px solid ${atualizando?'#10b981':'#dedad4'}`}}>
              {atualizando?'✅ Tudo atualizado!':'🔄 Atualizar Resultados'}
            </button>
          </div>
        )}

        {/* ════ ABA CALCULAR SERVIÇOS ════ */}
        {aba==='servicos' && (
          <div className="space-y-4">
            <GuiaPassos passos={[
              {titulo:'Parâmetros Globais',desc:'Configure taxa do cartão e custo operacional do seu salão',ok:n(taxaCartao)>0,cor:'#10b981'},
              {titulo:'Adicione Serviços',desc:'Nome, preço e percentual de rateio do profissional',ok:servicos.some(s=>s.nome&&n(s.preco)>0),cor:'#f59e0b'},
              {titulo:'Produto e Imposto',desc:'Custo do produto usado e % de imposto de cada serviço',ok:servicos.some(s=>n(s.imposto)>0),cor:'#7c6fe0'},
              {titulo:'Ver Resultado',desc:'Resultado líquido de cada serviço aparece automaticamente',ok:servicos.some(s=>n(s.preco)>0&&n(s.rateioP)>0),cor:'#5b4fcf'},
            ]}/>
            <div className="rounded-2xl border overflow-hidden" style={{background:'#faf9f7',borderColor:'#5b4fcf40'}}>
              <button onClick={()=>setSecConfigServ(p=>!p)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/2 transition-colors" style={{background:'#0d1525'}}>
                <div className="flex items-center gap-2">
                  {secConfigServ ? <ChevronUp size={14} style={{color:'#5b4fcf'}}/> : <ChevronDown size={14} style={{color:'#5b4fcf'}}/>}
                  <span className="font-bold text-sm" style={{color:'#5b4fcf'}}>⚙️ Configurações do Cálculo</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{background:'#5b4fcf20',color:'#7c6fe0'}}>Cartão {taxaCartao}% · CustoOp {(custOpServN*100).toFixed(0)}% · {salaoParceiro?'Salão Parceiro ✓':'Sem Parceiro'}</span>
                </div>
                <ChevronDown size={14} style={{color:'#6b6860'}}/>
              </button>
              {secConfigServ && <div className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <label className="text-xs font-bold" style={{color:'#9e9b94'}}>Taxa do Cartão (%)</label>
                    <InfoBtn id="taxaCartaoServ"/>
                    <AvisoDefault ativo={taxaCartao==='5'} padrao="5% (padrão)" onPreencher={()=>{}} onManter={()=>{}}/>
                  </div>
                  <p className="text-[10px] mb-1" style={{color:'#6b6860'}}>Média das maquininhas. Recomendado: 5%</p>
                  <div className="relative"><input type="number" value={taxaCartao} onChange={e=>setTaxaCartao(e.target.value)} className="w-full pr-6 pl-3 py-2 rounded-lg text-sm text-white focus:outline-none" style={{background:'#f5f4f0',border:'1px solid #dedad4'}}/><span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs" style={{color:'#9e9b94'}}>%</span></div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1"><label className="text-xs font-bold" style={{color:'#9e9b94'}}>Abatimento do Produto (%)</label><InfoBtn id="abatProd"/></div>
                  <p className="text-[10px] mb-1" style={{color:'#6b6860'}}>% do produto abatido do rateio. Recomendado: 100%</p>
                  <div className="relative"><input type="number" value={abatProd} onChange={e=>setAbatProd(e.target.value)} className="w-full pr-6 pl-3 py-2 rounded-lg text-sm text-white focus:outline-none" style={{background:'#f5f4f0',border:'1px solid #dedad4'}}/><span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs" style={{color:'#9e9b94'}}>%</span></div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-2"><label className="text-xs font-bold" style={{color:'#9e9b94'}}>Custo Operacional (%)</label><InfoBtn id="custOpServ"/></div>
                  {/* Seletor de modo */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button onClick={()=>setModoCustoOp('dani')}
                      className="py-2 px-3 rounded-xl text-[10px] font-bold text-left transition-all"
                      style={{
                        background: modoCustoOp==='dani' ? '#5b4fcf20' : '#f5f4f0',
                        border: `1px solid ${modoCustoOp==='dani' ? '#5b4fcf' : '#ffffff'}`,
                        color: modoCustoOp==='dani' ? '#7c6fe0' : '#6b6860',
                      }}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <div className="w-3 h-3 rounded-full border-2 flex items-center justify-center" style={{borderColor: modoCustoOp==='dani'?'#5b4fcf':'#dedad4'}}>
                          {modoCustoOp==='dani' && <div className="w-1.5 h-1.5 rounded-full" style={{background:'#5b4fcf'}}/>}
                        </div>
                        <span>Padrão Recomendado</span>
                      </div>
                      <p style={{color:'#9e9b94',paddingLeft:'18px'}}>{n(custIndD)||30}% fixo — igual à planilha</p>
                    </button>
                    <button onClick={()=>setModoCustoOp('real')}
                      className="py-2 px-3 rounded-xl text-[10px] font-bold text-left transition-all"
                      style={{
                        background: modoCustoOp==='real' ? '#10b98120' : '#f5f4f0',
                        border: `1px solid ${modoCustoOp==='real' ? '#10b981' : '#ffffff'}`,
                        color: modoCustoOp==='real' ? '#10b981' : '#6b6860',
                      }}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <div className="w-3 h-3 rounded-full border-2 flex items-center justify-center" style={{borderColor: modoCustoOp==='real'?'#10b981':'#dedad4'}}>
                          {modoCustoOp==='real' && <div className="w-1.5 h-1.5 rounded-full" style={{background:'#10b981'}}/>}
                        </div>
                        <span>Meu salão (real)</span>
                      </div>
                      <p style={{color:'#9e9b94',paddingLeft:'18px'}}>
                        {mediaCustoOp>0
                          ? `${(mediaCustoOp*100).toFixed(1)}% — média de ${qtdMesesMedia} ${qtdMesesMedia===1?'mês':'meses'}`
                          : fatN>0&&custoOp>0
                            ? `${(custoOp/fatN*100).toFixed(1)}% — mês atual`
                            : 'Preencha a aba RD'}
                      </p>
                    </button>
                  </div>
                  <p className="text-[10px] mb-1" style={{color:'#6b6860'}}>
                    {modoCustoOp==='dani'
                      ? <>Usando <strong style={{color:'#7c6fe0'}}>{n(custIndD)||30}%</strong> — padrão recomendado do mercado</>
                      : mediaCustoOp > 0
                        ? <>Usando média de <strong style={{color:'#10b981'}}>{qtdMesesMedia} {qtdMesesMedia===1?'mês':'meses'}</strong>: <strong style={{color:'#10b981'}}>{(mediaCustoOp*100).toFixed(1)}%</strong></>
                        : fatN>0&&custoOp>0
                          ? <>Usando mês atual: <strong style={{color:'#10b981'}}>{(custoOp/fatN*100).toFixed(1)}%</strong></>
                          : <>Preencha a aba RD para usar seu valor real</>}
                  </p>
                  <div className="relative">
                    <input type="number" value={custOpServ}
                      onChange={e=>setCustOpServ(e.target.value)}
                      placeholder={fatN>0&&custoOp>0?(custoOp/fatN*100).toFixed(1):'30'}
                      className="w-full pr-6 pl-3 py-2 rounded-lg text-sm text-white focus:outline-none"
                      style={{background:'#f5f4f0',border:'1px solid #dedad4'}}/>
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs" style={{color:'#9e9b94'}}>%</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1" style={{color:'#9e9b94'}}>Lei do Salão Parceiro</label>
                  <p className="text-[10px] mb-1" style={{color:'#6b6860'}}>Imposto incide sobre a margem, não o preço total</p>
                  <button onClick={()=>setSalaoParceiro(p=>!p)} className="w-full py-2 rounded-lg text-sm font-bold transition-all"
                    style={{background:salaoParceiro?'#10b981':'#ffffff',color:salaoParceiro?'white':'#9e9b94',border:`1px solid ${salaoParceiro?'#10b981':'#dedad4'}`}}>
                    {salaoParceiro?'✅ SIM':'NÃO'}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs p-3 rounded-lg" style={{background:'#f5f4f0',color:'#9e9b94'}}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={taxaAntesRateio} onChange={e=>setTaxaAntesRateio(e.target.checked)} className="accent-purple-500"/>
                  <span style={{color:'#3a3835'}}>✅ Taxa do cartão deve ser abatida do valor antes de calcular o rateio</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={prodAntesRateio} onChange={e=>setProdAntesRateio(e.target.checked)} className="accent-purple-500"/>
                  <span style={{color:'#3a3835'}}>✅ Valor do produto deve ser abatido do rateio</span>
                </label>
              </div>
              </div>}
            </div>

            {/* Barra de busca e ordenação */}
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{background:'#faf9f7',border:'1px solid #ffffff'}}>
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{color:'#9e9b94'}}>🔍</span>
                <input value={buscaServico} onChange={e=>setBuscaServico(e.target.value)}
                  placeholder="Buscar serviço pelo nome..."
                  className="w-full pl-8 pr-3 py-2 rounded-lg text-xs text-white focus:outline-none"
                  style={{background:'#f5f4f0',border:'1px solid #dedad4'}}/>
              </div>
              <button onClick={()=>setOrdenarPorLucro(v=>!v)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all"
                style={{background:ordenarPorLucro?'#10b98120':'#ffffff',color:ordenarPorLucro?'#10b981':'#9e9b94',border:`1px solid ${ordenarPorLucro?'#10b981':'#dedad4'}`}}>
                {ordenarPorLucro ? '📈 Mais lucrativo primeiro' : '🔤 Ordem original'}
              </button>
              {buscaServico && <button onClick={()=>setBuscaServico('')} className="text-xs px-2 py-1 rounded" style={{color:'#9e9b94'}}>✕ limpar</button>}
            </div>

            {/* Tabela de serviços */}
            <div className="rounded-2xl border overflow-hidden" style={{background:'#faf9f7',borderColor:'#ffffff'}}>
              <div className="grid gap-2 px-5 py-3 text-[10px] font-bold uppercase tracking-wider border-b"
                style={{background:'#0d1525',borderColor:'#ffffff',color:'#6b6860',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 20px'}}>
                <div>Serviço</div>
                <div className="flex items-center gap-1">Preço (R$)<InfoBtn id="precoServico"/></div>
                <div className="flex items-center gap-1">Rateio (%)<InfoBtn id="rateioServico"/></div>
                <div className="flex items-center gap-1">Produto (R$)<InfoBtn id="produtoServico"/></div>
                <div className="flex items-center gap-1">Imposto (%)<InfoBtn id="impostoServico"/></div>
                <div></div>
              </div>
              {[...servicos]
                .filter(s=>!buscaServico||s.nome.toLowerCase().includes(buscaServico.toLowerCase()))
                .sort((a,b)=>{
                  if(!ordenarPorLucro) return 0
                  const ca=calcServ(a), cb=calcServ(b)
                  if(!ca&&!cb) return 0
                  if(!ca) return 1
                  if(!cb) return -1
                  return cb.resultPct-ca.resultPct
                })
                .map(s=>{
                const c=calcServ(s)
                return(
                  <div key={s.id}>
                    <div className="grid gap-2 px-5 py-3 items-center" style={{gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 20px'}}>
                      <input value={s.nome} onChange={e=>setServicos(p=>p.map(x=>x.id===s.id?{...x,nome:e.target.value}:x))}
                        placeholder="Ex: Coloração longo" className="px-3 py-2 rounded-lg text-sm text-white focus:outline-none" style={{background:'#f5f4f0',border:'1px solid #ffffff'}}/>
                      {[
                        {k:'preco' as const,ph:'0',pre:'R$',aviso:false,padrao:''},
                        {k:'rateioP' as const,ph:'50',suf:'%',aviso:!(s as any).rateioP,padrao:'50% (padrão)'},
                        {k:'produto' as const,ph:'0',pre:'R$',aviso:false,padrao:''},
                        {k:'imposto' as const,ph:'5',suf:'%',aviso:!(s as any).imposto,padrao:'5% (padrão)'},
                      ].map((f:any)=>(
                        <div key={f.k} className="relative">
                          {f.aviso && (
                            <div className="absolute -top-2 left-0 z-10">
                              <AvisoDefault ativo={true} padrao={f.padrao} onPreencher={()=>{}} onManter={()=>{}}/>
                            </div>
                          )}
                          {f.pre&&<span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px]" style={{color:'#9e9b94'}}>{f.pre}</span>}
                          <input type="number" value={(s as any)[f.k]}
                            onChange={e=>setServicos(p=>p.map(x=>x.id===s.id?{...x,[f.k]:e.target.value}:x))}
                            placeholder={f.ph}
                            className={`w-full ${f.pre?'pl-7':'pl-3'} ${f.suf?'pr-6':'pr-2'} py-2 rounded-lg text-sm text-white focus:outline-none`}
                            style={{background:'#f5f4f0',border:`1px solid ${f.aviso?'#f59e0b40':n((s as any)[f.k])>0?'#5b4fcf40':'#ffffff'}`}}/>
                          {f.suf&&<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px]" style={{color:'#9e9b94'}}>{f.suf}</span>}
                        </div>
                      ))}
                      <button onClick={()=>setServicos(p=>p.filter(x=>x.id!==s.id))} style={{color:'#6b6860'}}><Trash2 size={13}/></button>
                    </div>
                    {c&&(
                      <div className="mx-4 mb-3 rounded-xl overflow-hidden border" style={{borderColor:'#ffffff'}}>
                        <div className="grid grid-cols-4 divide-x text-center py-2" style={{background:'#f5f4f0',borderColor:'#ffffff'}}>
                          {[
                            {l:'💸 Total de Despesas',sub:'Tudo que custa realizar este serviço',v:fmtR(c.total),p:`${(c.totalPct*100).toFixed(1)}%`,co:'#f59e0b'},
                            {l:'📊 Margem Operacional',sub:'O que sobrou após pagar comissão, produto, cartão e imposto',v:fmtR(c.margOp),p:`${(c.margOpPct*100).toFixed(1)}%`,co:'#06b6d4'},
                            {l:'🏢 Custo Operacional',sub:'Parte dos custos fixos do salão que este serviço cobre',v:fmtR(c.custoOpR),p:`${(c.custOpPct*100).toFixed(1)}%`,co:'#7c6fe0'},
                            {l:'🏆 Resultado Líquido',sub:'Seu lucro real após pagar absolutamente tudo',v:fmtR(c.resultado),p:`${(c.resultPct*100).toFixed(1)}%`,co:corRes(c.resultado)},
                          ].map((item,i)=>(
                            <div key={i} className="px-2 py-2">
                              <p className="text-[9px] font-bold mb-0.5" style={{color:'#9e9b94'}}>{item.l}</p>
                              <p className="text-[8px] mb-1 leading-tight" style={{color:'#dedad4'}}>{item.sub}</p>
                              <p className="text-sm font-bold" style={{color:item.co}}>{item.v}</p>
                              <p className="text-[10px]" style={{color:item.co+'99'}}>{item.p} do preço</p>
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-4 text-center py-1.5 border-t text-[10px]" style={{background:'#faf9f7',borderColor:'#ffffff',color:'#9e9b94'}}>
                          <div>Rateio: {fmtR(c.rateioR)}</div>
                          <div>Produto: {fmtR(c.prod)} | Cartão: {fmtR(c.cartaoR)}</div>
                          <div>Imposto: {fmtR(c.impostR)}</div>
                          <div style={{color:c.resultado>0?'#10b981':'#ef4444',fontWeight:'bold'}}>{c.resultado>0?'✅ Lucrativo':'🚨 Prejuízo'}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              <div className="px-5 py-3 border-t" style={{borderColor:'#ffffff'}}>
                <button onClick={()=>{setServicos(p=>[...p,{id:proxServ,nome:'',preco:'',rateioP:'50',produto:'',imposto:'5'}]);setProxServ(p=>p+1)}}
                  className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg"
                  style={{background:'#5b4fcf20',color:'#5b4fcf',border:'1px dashed #5b4fcf40'}}>
                  <Plus size={14}/> Adicionar serviço
                </button>
              </div>
            </div>

            <div className="rounded-xl p-4 text-xs space-y-1" style={{background:'#faf9f7',border:'1px solid #ffffff',color:'#9e9b94'}}>
              <p className="font-bold mb-1" style={{color:'#9e9b94'}}>💡 💡 Fórmula do cálculo:</p>
              <p>• <strong style={{color:'#1a1a1a'}}>Rateio R$</strong> = (Preço × Rateio%) − (Preço × Taxa_Cartão%) − (Produto × Abatimento%)</p>
              <p>• <strong style={{color:'#1a1a1a'}}>Imposto</strong>: Salão Parceiro → (Preço − Rateio) × Imp%. Normal → Preço × Imp%</p>
              <p>• <strong style={{color:'#1a1a1a'}}>Resultado</strong> = Preço − Total Despesas − Custo Operacional</p>
              <p style={{color:'#7c6fe0'}}>Verificado com PIGMENTAÇÃO da planilha: Preço R$280 | Rateio 44% | Produto R$70 | Cartão 5% | Imposto 5% → Rateio R$39,20 | Total R$135,24 | Resultado R$60,76</p>
            </div>
          </div>
        )}

        {/* ════ ABA CUSTO DE PRODUTO ════ */}
        {aba==='produto' && (
          <div className="space-y-4">
            <GuiaPassos passos={[
              {titulo:'Nome do Serviço',desc:'Ex: Coloração, Hidratação, Escova',ok:servicosProd.some(s=>s.nomeServico.trim().length>0),cor:'#10b981'},
              {titulo:'Adicione Produtos',desc:'Liste cada produto usado neste serviço',ok:servicosProd.some(s=>s.ingredientes.some(i=>i.nome.trim().length>0)),cor:'#f59e0b'},
              {titulo:'Qtd e Preço',desc:'Quantidade da embalagem, preço pago e quanto usa por serviço',ok:servicosProd.some(s=>s.ingredientes.some(i=>n(i.qtdEmb)>0&&n(i.preco)>0&&n(i.qtdUsa)>0)),cor:'#7c6fe0'},
              {titulo:'Ver Custo Total',desc:'O custo exato do produto por serviço aparece automaticamente',ok:servicosProd.some(s=>s.ingredientes.some(i=>n(i.qtdEmb)>0&&n(i.preco)>0&&n(i.qtdUsa)>0)),cor:'#5b4fcf'},
            ]}/>
            <div className="rounded-xl p-3 text-xs" style={{background:'#5b4fcf15',border:'1px solid #5b4fcf30',color:'#7c6fe0'}}>
              ✨ Calcule o custo exato de cada insumo por serviço. Use o total em <strong>💇 Calcular Serviços</strong> → campo "Produto (R$)".
            </div>

            {/* Busca + ordenação */}
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{background:'#faf9f7',border:'1px solid #ffffff'}}>
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{color:'#9e9b94'}}>🔍</span>
                <input value={buscaProduto} onChange={e=>setBuscaProduto(e.target.value)}
                  placeholder="Buscar serviço pelo nome..."
                  className="w-full pl-8 pr-3 py-2 rounded-lg text-xs text-white focus:outline-none"
                  style={{background:'#f5f4f0',border:'1px solid #dedad4'}}/>
              </div>
              <button onClick={()=>setOrdenarPorLucro(v=>!v)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all"
                style={{background:ordenarPorLucro?'#10b98120':'#ffffff',color:ordenarPorLucro?'#10b981':'#9e9b94',border:`1px solid ${ordenarPorLucro?'#10b981':'#dedad4'}`}}>
                {ordenarPorLucro ? '📈 Menor custo primeiro' : '🔤 Ordem original'}
              </button>
              {buscaProduto && <button onClick={()=>setBuscaProduto('')} className="text-xs px-2 py-1 rounded" style={{color:'#9e9b94'}}>✕ limpar</button>}
            </div>

            {[...servicosProd]
              .filter(sp=>!buscaProduto||sp.nomeServico.toLowerCase().includes(buscaProduto.toLowerCase()))
              .sort((a,b)=>{
                if(!ordenarPorLucro) return 0
                const totA=a.ingredientes.reduce((s,i)=>s+custoIngred(i),0)
                const totB=b.ingredientes.reduce((s,i)=>s+custoIngred(i),0)
                return totA-totB // menor custo primeiro = mais lucrativo
              })
              .map(sp=>{
              const total=sp.ingredientes.reduce((s,i)=>s+custoIngred(i),0)
              return(
                <div key={sp.id} className="rounded-2xl border overflow-hidden" style={{background:'#faf9f7',borderColor:'#ffffff'}}>
                  <div className="px-5 py-4 flex items-center gap-3 border-b" style={{background:'#0d1525',borderColor:'#ffffff'}}>
                    <span className="text-lg">🧴</span>
                    <input value={sp.nomeServico}
                      onChange={e=>setServicoProd(p=>p.map(s=>s.id===sp.id?{...s,nomeServico:e.target.value}:s))}
                      placeholder="Nome do serviço (ex: Coloração Longo)"
                      className="flex-1 bg-transparent text-white font-bold text-sm focus:outline-none"
                      style={{borderBottom:'1px solid #dedad4'}}/>
                    {total>0&&<div className="text-right flex-shrink-0"><p className="text-[10px]" style={{color:'#9e9b94'}}>Custo total</p><p className="font-bold text-lg" style={{color:'#f59e0b'}}>{fmtR(total)}</p></div>}
                  </div>
                  <div className="grid gap-2 px-5 py-2 text-[10px] font-bold uppercase tracking-wider border-b"
                    style={{background:'#f5f4f0',borderColor:'#ffffff',color:'#6b6860',gridTemplateColumns:'2fr 0.7fr 1fr 1fr 1fr 1fr 20px'}}>
                    <div>Produto/Insumo</div><div>Un.</div>
                    <div className="flex items-center gap-1">Qtd embalagem<InfoBtn id="qtdEmb"/></div>
                    <div className="flex items-center gap-1">Preço embalagem<InfoBtn id="precoEmb"/></div>
                    <div className="flex items-center gap-1">Qtd usada<InfoBtn id="qtdUsa"/></div>
                    <div>Custo/uso</div><div></div>
                  </div>
                  {sp.ingredientes.map((ing,idx)=>{
                    const custo=custoIngred(ing)
                    return(
                      <div key={idx} className="grid gap-2 px-5 py-2 items-center hover:bg-white/2"
                        style={{borderBottom:'1px solid #ffffff10',gridTemplateColumns:'2fr 0.7fr 1fr 1fr 1fr 1fr 20px'}}>
                        {/* Campo com autocomplete do catálogo */}
                        <div className="relative">
                          <input value={ing.nome}
                            onChange={e=>{
                              atualizarIngrediente(sp.id,idx,'nome',e.target.value)
                              setAutocompleteKey(`${sp.id}-${idx}`)
                            }}
                            onFocus={()=>setAutocompleteKey(`${sp.id}-${idx}`)}
                            onBlur={()=>setTimeout(()=>setAutocompleteKey(null),200)}
                            placeholder="Ex: Tinta Color (buscar catálogo)"
                            className="w-full px-3 py-1.5 rounded-lg text-xs text-white focus:outline-none"
                            style={{background:'#f5f4f0',border:`1px solid ${autocompleteKey===`${sp.id}-${idx}`?'#5b4fcf':'#ffffff'}`}}/>
                          {/* Dropdown sugestões */}
                          {autocompleteKey===`${sp.id}-${idx}` && produtosCatalogo.length > 0 && (
                            <div className="absolute top-full left-0 right-0 z-50 rounded-xl border overflow-hidden shadow-2xl mt-1"
                              style={{background:'#faf9f7',borderColor:'#dedad4',maxHeight:'200px',overflowY:'auto'}}>
                              {/* Botão ver todos */}
                              <div className="px-3 py-1.5 border-b text-[10px] font-bold" style={{borderColor:'#ffffff',color:'#9e9b94'}}>
                                📦 {produtosCatalogo.filter(p=>!ing.nome||p.nome.toLowerCase().includes(ing.nome.toLowerCase())).length} produto(s) — clique para selecionar
                              </div>
                              {produtosCatalogo
                                .filter(p=>!ing.nome||p.nome.toLowerCase().includes(ing.nome.toLowerCase()))
                                .map(p=>(
                                <button key={p.id}
                                  onMouseDown={()=>{
                                    // Ao selecionar, preenche todos os campos automaticamente
                                    setServicoProd(prev=>prev.map(s=>s.id===sp.id?{...s,ingredientes:s.ingredientes.map((i,iIdx)=>
                                      iIdx===idx?{...i,nome:p.nome,unidade:p.unidade,qtdEmb:String(p.qtd_embalagem),preco:String(p.preco)}:i
                                    )}:s))
                                    setAutocompleteKey(null)
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center justify-between"
                                  style={{borderBottom:'1px solid #ffffff10'}}>
                                  <div>
                                    <span className="text-xs font-bold text-white">{p.nome}</span>
                                    {p.marca&&<span className="text-[10px] ml-2 px-1.5 py-0.5 rounded" style={{background:'#f59e0b20',color:'#f59e0b'}}>{p.marca}</span>}
                                  </div>
                                  <span className="text-[10px]" style={{color:'#10b981'}}>R$ {p.preco} / {p.qtd_embalagem}{p.unidade}</span>
                                </button>
                              ))}
                              {produtosCatalogo.filter(p=>!ing.nome||p.nome.toLowerCase().includes(ing.nome.toLowerCase())).length===0&&(
                                <div className="px-3 py-3 text-center">
                                  <p className="text-xs" style={{color:'#6b6860'}}>Nenhum produto encontrado</p>
                                  <button onMouseDown={()=>setAba('catproduto')} className="text-xs mt-1 font-bold" style={{color:'#5b4fcf'}}>
                                    + Cadastrar no Catálogo
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <select value={ing.unidade} onChange={e=>atualizarIngrediente(sp.id,idx,'unidade',e.target.value)}
                          className="px-2 py-1.5 rounded-lg text-xs text-white focus:outline-none" style={{background:'#f5f4f0',border:'1px solid #ffffff'}}>
                          {['ml','g','und','L','kg'].map(u=><option key={u} value={u}>{u}</option>)}
                        </select>
                        <input type="number" value={ing.qtdEmb} onChange={e=>atualizarIngrediente(sp.id,idx,'qtdEmb',e.target.value)}
                          placeholder="Ex: 60" className="px-3 py-1.5 rounded-lg text-xs text-white focus:outline-none" style={{background:'#f5f4f0',border:'1px solid #ffffff'}}/>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px]" style={{color:'#9e9b94'}}>R$</span>
                          <input type="number" value={ing.preco} onChange={e=>atualizarIngrediente(sp.id,idx,'preco',e.target.value)}
                            placeholder="0" className="w-full pl-7 pr-2 py-1.5 rounded-lg text-xs text-white focus:outline-none" style={{background:'#f5f4f0',border:'1px solid #ffffff'}}/>
                        </div>
                        <input type="number" value={ing.qtdUsa} onChange={e=>atualizarIngrediente(sp.id,idx,'qtdUsa',e.target.value)}
                          placeholder="Ex: 90" className="px-3 py-1.5 rounded-lg text-xs text-white focus:outline-none" style={{background:'#f5f4f0',border:'1px solid #ffffff'}}/>
                        <div className="text-xs font-bold text-center" style={{color:custo>0?'#f59e0b':'#dedad4'}}>{custo>0?fmtR(custo):'—'}</div>
                        <button onClick={()=>removerIngrediente(sp.id,idx)} style={{color:'#6b6860'}}><Trash2 size={12}/></button>
                      </div>
                    )
                  })}
                  <div className="px-5 py-3 flex items-center justify-between border-t" style={{borderColor:'#ffffff'}}>
                    <button onClick={()=>adicionarIngrediente(sp.id)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                      style={{background:'#f59e0b20',color:'#f59e0b',border:'1px dashed #f59e0b40'}}>
                      <Plus size={12}/> Adicionar produto
                    </button>
                    {total>0&&<div className="text-xs px-3 py-1.5 rounded-lg font-bold" style={{background:'#f59e0b20',color:'#f59e0b'}}>Total: {fmtR(total)}</div>}
                  </div>
                </div>
              )
            })}
            <button onClick={()=>{setServicoProd(p=>[...p,{id:proxSP,nomeServico:'',ingredientes:[{id:1,nome:'',qtdEmb:'',qtdUsa:'',preco:'',unidade:'ml'}]}]);setProxSP(p=>p+1)}}
              className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
              style={{background:'#5b4fcf20',color:'#5b4fcf',border:'1px dashed #5b4fcf40'}}>
              <Plus size={15}/> Adicionar outro serviço
            </button>
            <div className="rounded-xl p-4 text-xs space-y-1" style={{background:'#faf9f7',border:'1px solid #ffffff',color:'#9e9b94'}}>
              <p className="font-bold mb-1" style={{color:'#9e9b94'}}>💡 Fórmula:</p>
              <p>• Custo por uso = (Preço da embalagem ÷ Qtd da embalagem) × Qtd usada no serviço</p>
              <p style={{color:'#7c6fe0'}}>Ex: Tinta R$35,27 / 60g × 90g usados = <strong>R$52,91 de custo</strong></p>
            </div>
          </div>
        )}

        {/* ════ ABA ALUGUEL DE CADEIRA ════ */}
        {aba==='cadeira' && (
          <div className="space-y-4">
            <GuiaPassos passos={[
              {titulo:'Custo Operacional',desc:'Vem automático da aba RD. Se não preencheu, informe manualmente',ok:custoOp>0||n(custoOpCad)>0,cor:'#10b981'},
              {titulo:'Nº de Cadeiras',desc:'Quantas cadeiras ou postos de atendimento tem o salão',ok:n(numCad)>0,cor:'#f59e0b'},
              {titulo:'Ver Aluguel Sugerido',desc:'Valor mínimo e sugerido por cadeira aparecem automaticamente',ok:custPorCad>0,cor:'#5b4fcf'},
            ]}/>
            {custoOp>0&&<div className="rounded-xl p-3 text-xs" style={{background:'#5b4fcf15',border:'1px solid #5b4fcf30',color:'#7c6fe0'}}>✨ Custo operacional da aba Receitas e Despesas: <strong>{fmtR(custoOp)}</strong> — preenchido automaticamente</div>}
            <div className="rounded-2xl p-6 border" style={{background:'#faf9f7',borderColor:'#ffffff'}}>
              <h2 className="font-bold text-base mb-1" style={{color:'#f59e0b'}}>💺 Aluguel de Cadeira</h2>
              <p className="text-xs mb-5" style={{color:'#9e9b94'}}>Quanto cobrar de aluguel por cadeira para cobrir custos e ter lucro.</p>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <label className="text-xs font-bold" style={{color:'#9e9b94'}}>Custo Operacional Mensal Total (R$)</label>
                    <InfoBtn id="custoOpCad"/>
                    {custoOp>0 && !custoOpCad && <AvisoDefault ativo={true} padrao={`${fmtR(custoOp)} (mês atual — use média para mais precisão)`} onPreencher={()=>{}} onManter={()=>{}}/>}
                  </div>
                  <p className="text-xs mb-2" style={{color:'#6b6860'}}>
                    {mediaCustoOp>0&&fatN>0
                      ? <>Média de {qtdMesesMedia} meses: <strong style={{color:'#10b981'}}>{fmtR(custoOp*(1))}</strong> — edite para usar a média histórica</>
                      : custoOp>0?'Usando mês atual — pode editar para colocar a média dos seus meses':'Preencha a aba Receitas e Despesas ou informe manualmente.'}
                  </p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{color:'#9e9b94'}}>R$</span>
                    <input type="number" value={custoOpCad||(custoOp>0?String(Math.round(custoOp)):'')} onChange={e=>setCustoOpCad(e.target.value)}
                      placeholder={custoOp>0?custoOp.toFixed(2):'0,00'} className="w-full pl-10 pr-4 py-3 rounded-xl text-white focus:outline-none"
                      style={{background:'#f5f4f0',border:'1px solid #f59e0b60'}}/>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1"><label className="text-xs font-bold" style={{color:'#9e9b94'}}>Número de Cadeiras / Postos</label><InfoBtn id="numCad"/></div>
                  <p className="text-xs mb-2" style={{color:'#6b6860'}}>Quantas cadeiras ou postos de atendimento tem o salão?</p>
                  <input type="number" value={numCad} onChange={e=>setNumCad(e.target.value)} placeholder="Ex: 10"
                    className="w-full px-4 py-3 rounded-xl text-white focus:outline-none" style={{background:'#f5f4f0',border:'1px solid #ffffff'}}/>
                </div>
              </div>
              {custPorCad>0&&(
                <div className="mt-6 space-y-3">
                  <div className="rounded-xl p-4 border" style={{background:'#f5f4f0',borderColor:'#f59e0b40'}}>
                    <p className="text-xs mb-1" style={{color:'#9e9b94'}}>📊 Custo por Cadeira (ponto de equilíbrio)</p>
                    <p className="text-3xl font-bold" style={{color:'#f59e0b'}}>{fmtR(custPorCad)}</p>
                    <p className="text-xs mt-1" style={{color:'#6b6860'}}>Valor que cada cadeira precisa gerar para cobrir os custos</p>
                  </div>
                  <div className="rounded-xl p-4 border" style={{background:'#f5f4f0',borderColor:'#10b98140'}}>
                    <div className="flex items-center gap-2 mb-1"><span>⭐</span><p className="text-xs font-bold" style={{color:'#10b981'}}>Aluguel Sugerido por Cadeira</p><span className="text-xs px-2 py-0.5 rounded-full" style={{background:'#10b98120',color:'#10b981'}}>+50% lucro</span></div>
                    <p className="text-3xl font-bold" style={{color:'#10b981'}}>{fmtR(alugSuger)}</p>
                    <p className="text-xs mt-1" style={{color:'#6b6860'}}>Valor recomendado com margem de lucro de 50%</p>
                  </div>
                  <div className="rounded-xl p-4 text-xs space-y-1" style={{background:'#5b4fcf10',border:'1px solid #5b4fcf30',color:'#7c6fe0'}}>
                    <p><strong>💡 Resumo:</strong></p>
                    <p>• {n(numCad)} cadeiras × {fmtR(alugSuger)} = <strong>{fmtR(alugSuger*n(numCad))}/mês arrecadado</strong></p>
                    <p>• Lucro estimado: <strong style={{color:'#10b981'}}>{fmtR(alugSuger*n(numCad)-custoOpCadN)}/mês</strong></p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════ ABA FATURAMENTO POR M² ════ */}
        {aba==='metro' && (
          <div className="space-y-4">
            <GuiaPassos passos={[
              {titulo:'Faturamento Mínimo',desc:'Vem do Ponto de Equilíbrio automaticamente. Ou informe manualmente',ok:pe>0||n(fatMinM2)>0,cor:'#10b981'},
              {titulo:'Metragem do Salão',desc:'Área total do salão em metros quadrados',ok:n(mTotal)>0,cor:'#f59e0b'},
              {titulo:'Ver Resultado por M²',desc:'Faturamento necessário por metro quadrado aparece automaticamente',ok:fatPorM2>0,cor:'#5b4fcf'},
            ]}/>
            {pe>0&&<div className="rounded-xl p-3 text-xs" style={{background:'#5b4fcf15',border:'1px solid #5b4fcf30',color:'#7c6fe0'}}>✨ Ponto de equilíbrio da aba Receitas e Despesas: <strong>{fmtR(pe)}</strong> — preenchido automaticamente como faturamento mínimo</div>}
            <div className="rounded-2xl p-6 border" style={{background:'#faf9f7',borderColor:'#ffffff'}}>
              <h2 className="font-bold text-base mb-1" style={{color:'#06b6d4'}}>📐 Faturamento por M²</h2>
              <p className="text-xs mb-5" style={{color:'#9e9b94'}}>Quanto cada metro quadrado do salão precisa gerar para ser rentável.</p>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <label className="text-xs font-bold" style={{color:'#9e9b94'}}>Faturamento Mínimo Necessário (R$)</label>
                    <InfoBtn id="fatMinM2"/>
                    {pe>0 && !fatMinM2 && <AvisoDefault ativo={true} padrao={`${fmtR(pe)} (mês atual — considere usar a média dos seus meses)`} onPreencher={()=>{}} onManter={()=>{}}/>}
                  </div>
                  <p className="text-xs mb-2" style={{color:'#6b6860'}}>{pe>0?'Ponto de equilíbrio do mês atual — pode editar para usar a média dos seus meses':'Preencha a aba Receitas e Despesas ou informe manualmente.'}</p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{color:'#9e9b94'}}>R$</span>
                    <input type="number" value={fatMinM2||(pe>0?String(Math.round(pe)):'')} onChange={e=>setFatMinM2(e.target.value)}
                      placeholder={pe>0?pe.toFixed(2):'0,00'} className="w-full pl-10 pr-4 py-3 rounded-xl text-white focus:outline-none"
                      style={{background:'#f5f4f0',border:'1px solid #06b6d460'}}/>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1"><label className="text-xs font-bold" style={{color:'#9e9b94'}}>Metragem Total do Salão (m²)</label><InfoBtn id="mTotal"/></div>
                  <input type="number" value={mTotal} onChange={e=>setMTotal(e.target.value)} placeholder="Ex: 80"
                    className="w-full px-4 py-3 rounded-xl text-white focus:outline-none" style={{background:'#f5f4f0',border:'1px solid #ffffff'}}/>
                </div>
              </div>
              {fatPorM2>0&&(
                <div className="mt-6 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl p-4 border" style={{background:'#f5f4f0',borderColor:'#06b6d440'}}>
                      <p className="text-xs mb-1" style={{color:'#9e9b94'}}>📊 Faturamento por M² (P.E.)</p>
                      <p className="text-3xl font-bold" style={{color:'#06b6d4'}}>{fmtR(fatPorM2)}/m²</p>
                      <p className="text-xs mt-1" style={{color:'#6b6860'}}>Meta mínima por m² para cobrir custos</p>
                    </div>
                    <div className="rounded-xl p-4 border" style={{background:'#f5f4f0',borderColor:'#10b98140'}}>
                      <div className="flex items-center gap-2 mb-1"><span>⭐</span><p className="text-xs font-bold" style={{color:'#10b981'}}>Faturamento Sugerido por M²</p><span className="text-xs px-2 py-0.5 rounded-full" style={{background:'#10b98120',color:'#10b981'}}>+50%</span></div>
                      <p className="text-3xl font-bold" style={{color:'#10b981'}}>{fmtR(fatSugM2)}/m²</p>
                    </div>
                  </div>
                  <div className="rounded-xl p-4 border" style={{background:'#f5f4f0',borderColor:'#ffffff'}}>
                    <div className="flex items-center gap-1.5 mb-3"><p className="text-xs font-bold" style={{color:'#9e9b94'}}>📏 Calcular para um espaço específico:</p><InfoBtn id="mSala"/></div>
                    <div className="flex gap-2 items-center">
                      <input type="number" value={mSala} onChange={e=>setMSala(e.target.value)} placeholder="Ex: 15 m²"
                        className="flex-1 px-4 py-2.5 rounded-lg text-white text-sm focus:outline-none" style={{background:'#faf9f7',border:'1px solid #dedad4'}}/>
                      <span className="text-sm" style={{color:'#9e9b94'}}>m²</span>
                    </div>
                    {fatSugSala>0&&(
                      <div className="mt-3 p-3 rounded-lg" style={{background:'#10b98115',border:'1px solid #10b98130'}}>
                        <p className="text-xs" style={{color:'#9e9b94'}}>Faturamento sugerido para {mSala} m²:</p>
                        <p className="text-2xl font-bold mt-1" style={{color:'#10b981'}}>{fmtR(fatSugSala)}/mês</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════ ABA GRÁFICOS ════ */}
        {aba==='graficos' && (
          <div className="space-y-5">

            {!fatN ? (
              <div className="rounded-2xl p-10 text-center border" style={{background:'#faf9f7',borderColor:'#ffffff'}}>
                <p className="text-4xl mb-3">📊</p>
                <p className="font-bold text-white mb-1">Nenhum dado ainda</p>
                <p className="text-sm" style={{color:'#9e9b94'}}>Preencha o Faturamento e as Despesas na aba <strong style={{color:'#7c6fe0'}}>Receitas e Despesas</strong> para ver os gráficos.</p>
              </div>
            ) : (
              <>
                {/* Score de saúde financeira */}
                {scoreFinanceiro && (
                  <div className="rounded-2xl p-5 border" style={{background:'#faf9f7',borderColor:`${scoreFinanceiro.cor}30`}}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-xs font-bold mb-0.5" style={{color:'#9e9b94'}}>SCORE DE SAÚDE FINANCEIRA</p>
                        <p className="text-2xl font-bold" style={{color:scoreFinanceiro.cor}}>{scoreFinanceiro.icone} {scoreFinanceiro.label}</p>
                        <p className="text-xs mt-1" style={{color:'#9e9b94'}}>{scoreFinanceiro.sub}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-5xl font-bold" style={{color:scoreFinanceiro.cor}}>{scoreFinanceiro.score}</p>
                        <p className="text-xs" style={{color:'#6b6860'}}>/100 pontos</p>
                      </div>
                    </div>
                    {/* Barra do score */}
                    <div className="w-full rounded-full h-3" style={{background:'#ffffff'}}>
                      <div className="h-3 rounded-full transition-all duration-700"
                        style={{width:`${scoreFinanceiro.score}%`, background:`linear-gradient(90deg, #ef4444, #f59e0b, ${scoreFinanceiro.cor})`}}/>
                    </div>
                    <div className="flex justify-between text-[10px] mt-1" style={{color:'#dedad4'}}>
                      <span>0 — Crítico</span><span>50 — Atenção</span><span>75 — Saudável</span><span>100</span>
                    </div>
                  </div>
                )}

                {/* Visão geral — barras horizontais de distribuição */}
                <div className="rounded-2xl border overflow-hidden" style={{background:'#faf9f7',borderColor:'#ffffff'}}>
                  <div className="px-5 py-3 border-b" style={{background:'#0d1525',borderColor:'#ffffff'}}>
                    <p className="font-bold text-sm" style={{color:'#1a1a1a'}}>💰 Distribuição do Faturamento</p>
                    <p className="text-xs mt-0.5" style={{color:'#9e9b94'}}>Para onde vai cada R$ que entra no salão</p>
                  </div>
                  <div className="p-5 space-y-3">
                    {[
                      {l:'Despesas Diretas', v:totDiretas, c:'#ef4444', ico:'📌'},
                      {l:'Custo Operacional', v:custoOp, c:'#f59e0b', ico:'⚙️'},
                      {l:'Resultado Operacional', v:Math.max(0,resultOp), c:'#10b981', ico:'💵'},
                      {l:'Outras Despesas', v:n(aquisicaoEq)+n(distSocios), c:'#06b6d4', ico:'💸'},
                      resultFin < 0 ? {l:'Prejuízo', v:Math.abs(resultFin), c:'#ef4444', ico:'🚨'} : {l:'Lucro Final', v:resultFin, c:'#7c6fe0', ico:'🏆'},
                    ].filter(i=>i.v>0).map((item,idx)=>{
                      const pct = fatN > 0 ? (item.v/fatN)*100 : 0
                      return (
                        <div key={idx}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold" style={{color:'#3a3835'}}>{item.ico} {item.l}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold" style={{color:item.c}}>{fmtR(item.v)}</span>
                              <span className="text-xs w-12 text-right" style={{color:'#9e9b94'}}>{pct.toFixed(1)}%</span>
                            </div>
                          </div>
                          <div className="w-full rounded-full h-4 relative" style={{background:'#ffffff'}}>
                            <div className="h-4 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                              style={{width:`${Math.min(pct,100)}%`, background:`${item.c}30`, border:`1px solid ${item.c}60`}}>
                              {pct > 8 && <span className="text-[9px] font-bold" style={{color:item.c}}>{pct.toFixed(1)}%</span>}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {/* Barra total */}
                    <div className="pt-2 border-t" style={{borderColor:'#ffffff'}}>
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span style={{color:'#9e9b94'}}>📊 Faturamento Total</span>
                        <span style={{color:'#1a1a1a'}}>{fmtR(fatN)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ranking de despesas — maiores custos */}
                <div className="rounded-2xl border overflow-hidden" style={{background:'#faf9f7',borderColor:'#ffffff'}}>
                  <div className="px-5 py-3 border-b" style={{background:'#0d1525',borderColor:'#ffffff'}}>
                    <p className="font-bold text-sm" style={{color:'#1a1a1a'}}>🩸 Ranking — O que mais consome seu caixa</p>
                    <p className="text-xs mt-0.5" style={{color:'#9e9b94'}}>Ordenado do maior para o menor</p>
                  </div>
                  <div className="p-5 space-y-2">
                    {todasDespesas.length === 0 ? (
                      <p className="text-xs text-center py-4" style={{color:'#6b6860'}}>Preencha as despesas na aba Receitas e Despesas</p>
                    ) : todasDespesas.map((d,idx)=>{
                      const pctMax = (d.valor/maxDespesa)*100
                      const pctFat = fatN > 0 ? (d.valor/fatN)*100 : 0
                      const sem = semaforoDespesa(d.nome, d.valor)
                      const cores: Record<string,string> = {indireta:'#f59e0b', provisao:'#7c6fe0', direta:'#ef4444'}
                      const cor = cores[d.tipo] || '#9e9b94'
                      return (
                        <div key={idx} className="rounded-xl p-3" style={{background:'#f5f4f0',border:'1px solid #ffffff'}}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold w-5 text-center" style={{color:'#6b6860'}}>#{idx+1}</span>
                              <span className="text-xs font-bold" style={{color:'#1a1a1a'}}>{d.nome}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded" style={{background:`${cor}20`,color:cor}}>
                                {d.tipo === 'indireta' ? 'Indireta' : d.tipo === 'provisao' ? 'Provisão' : 'Direta'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px]">{sem.icone}</span>
                              <span className="text-xs font-bold" style={{color:cor}}>{fmtR(d.valor)}</span>
                            </div>
                          </div>
                          {/* Barra proporcional ao maior */}
                          <div className="w-full rounded-full h-2.5 mb-1" style={{background:'#ffffff'}}>
                            <div className="h-2.5 rounded-full transition-all duration-500"
                              style={{width:`${pctMax}%`, background:`linear-gradient(90deg, ${cor}80, ${cor})`}}/>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px]" style={{color:sem.cor}}>{sem.label}</span>
                            <span className="text-[10px]" style={{color:'#6b6860'}}>{pctFat.toFixed(1)}% do faturamento</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Realizado vs Meta */}
                <div className="rounded-2xl border overflow-hidden" style={{background:'#faf9f7',borderColor:'#ffffff'}}>
                  <div className="px-5 py-3 border-b" style={{background:'#0d1525',borderColor:'#ffffff'}}>
                    <p className="font-bold text-sm" style={{color:'#1a1a1a'}}>🎯 Realizado vs Meta (Metodologia Recomendada)</p>
                  </div>
                  <div className="p-5 space-y-4">
                    {[
                      // Custos: meta é o LIMITE MÁXIMO — ficar ABAIXO é ótimo
                      {l:'Custo Indireto', sub:'Limite máx', real:fatN>0?custoOp/fatN*100:0, meta:n(custIndD), c:'#f59e0b', tipo:'custo'},
                      {l:'Custo Direto',   sub:'Limite máx', real:fatN>0?totDiretas/fatN*100:0, meta:n(custDirD), c:'#ef4444', tipo:'custo'},
                      // Lucro: meta é o MÍNIMO DESEJADO — ficar ACIMA é ótimo
                      {l:'Lucro',          sub:'Meta mín', real:fatN>0?resultOp/fatN*100:0, meta:n(lucroD), c:'#10b981', tipo:'lucro'},
                    ].map((item:any,idx:number)=>{
                      // Custo: ok = abaixo ou igual ao limite máximo
                      // Lucro: ok = igual ou acima da meta mínima
                      const ok = item.tipo==='custo' ? item.real <= item.meta : item.real >= item.meta
                      // Para barra: custo vai de 0 até meta*2; lucro vai de 0 até meta*2
                      const escala = item.meta * 2
                      const pctBarra = Math.min((item.real / escala) * 100, 100)
                      const pctMeta  = 50 // meta sempre no meio da barra
                      const emoji = ok ? '✅' : '⚠️'
                      const textoStatus = item.tipo==='custo'
                        ? (item.real <= item.meta * 0.7 ? '🎉 Excelente! Bem abaixo do limite' : ok ? '✅ Dentro do limite' : '⚠️ Acima do limite máximo')
                        : (item.real >= item.meta * 2 ? '🏆 Excepcional!' : ok ? '✅ Meta atingida' : '⚠️ Abaixo da meta')
                      return (
                        <div key={idx}>
                          <div className="flex items-center justify-between mb-1">
                            <div>
                              <span className="text-xs font-bold" style={{color:'#3a3835'}}>{item.l}</span>
                              <span className="text-[9px] ml-2" style={{color:'#6b6860'}}>{item.sub}: {item.meta}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold" style={{color:ok?item.c:'#ef4444'}}>{item.real.toFixed(1)}%</span>
                              <span className="text-xs">{emoji}</span>
                            </div>
                          </div>
                          <div className="w-full rounded-full h-3 relative" style={{background:'#ffffff'}}>
                            <div className="absolute top-0 bottom-0 w-0.5 z-10" style={{left:`${pctMeta}%`, background:'#ffffff50'}}/>
                            <div className="h-3 rounded-full transition-all duration-500"
                              style={{width:`${pctBarra}%`, background:ok?`${item.c}80`:'#ef444480', border:`1px solid ${ok?item.c:'#ef4444'}`}}/>
                          </div>
                          <div className="flex justify-between text-[9px] mt-0.5 mb-1" style={{color:'#dedad4'}}>
                            <span>0%</span>
                            <span style={{color:'#ffffff60'}}>▲ {item.sub} {item.meta}%</span>
                            <span>{escala.toFixed(0)}%</span>
                          </div>
                          <p className="text-[10px]" style={{color:ok?'#10b981':'#ef4444'}}>{textoStatus}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Alertas críticos */}
                {(() => {
                  const alertas: {msg: string, cor: string, icone: string}[] = []
                  if (fatN < pe) alertas.push({msg:`Faturando ${fmtR(pe-fatN)} ABAIXO do ponto de equilíbrio — operando no prejuízo`, cor:'#ef4444', icone:'🚨'})
                  if (resultOp < 0) alertas.push({msg:`Resultado operacional negativo: ${fmtR(resultOp)} — custos maiores que receitas`, cor:'#ef4444', icone:'🔴'})
                  if (n(despInd.find(d=>d.nome==='Aluguel')?.valor||'0') / fatN > 0.12) alertas.push({msg:`Aluguel acima de 12% do faturamento — considere renegociar`, cor:'#f59e0b', icone:'⚠️'})
                  if (n(despInd.find(d=>d.nome==='Salários')?.valor||'0') / fatN > 0.45) alertas.push({msg:`Folha salarial acima de 45% — avaliar produtividade da equipe`, cor:'#f59e0b', icone:'⚠️'})
                  if (fatN > 0 && n(produto) / fatN > 0.15) alertas.push({msg:`Gasto com produtos acima de 15% — rever fornecedores ou desperdício`, cor:'#f59e0b', icone:'⚠️'})
                  if (alertas.length === 0) return (
                    <div className="rounded-2xl p-4 border text-center" style={{background:'#10b98110',borderColor:'#10b98130'}}>
                      <p className="text-2xl mb-1">🎉</p>
                      <p className="text-sm font-bold" style={{color:'#10b981'}}>Nenhum alerta crítico!</p>
                      <p className="text-xs mt-1" style={{color:'#9e9b94'}}>Suas despesas estão dentro dos parâmetros saudáveis.</p>
                    </div>
                  )
                  return (
                    <div className="rounded-2xl border overflow-hidden" style={{background:'#faf9f7',borderColor:'#ffffff'}}>
                      <div className="px-5 py-3 border-b" style={{background:'#0d1525',borderColor:'#ffffff'}}>
                        <p className="font-bold text-sm" style={{color:'#ef4444'}}>🚨 Alertas — Ação Necessária</p>
                      </div>
                      <div className="p-4 space-y-2">
                        {alertas.map((a,i)=>(
                          <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{background:`${a.cor}10`,border:`1px solid ${a.cor}30`}}>
                            <span className="text-base flex-shrink-0">{a.icone}</span>
                            <p className="text-xs leading-relaxed" style={{color:a.cor}}>{a.msg}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {/* Comparativo Mês a Mês */}
                {historicoMeses.length > 1 && (
                  <div className="rounded-2xl border overflow-hidden" style={{background:'#faf9f7',borderColor:'#ffffff'}}>
                    <div className="px-5 py-3 border-b" style={{background:'#0d1525',borderColor:'#ffffff'}}>
                      <p className="font-bold text-sm" style={{color:'#1a1a1a'}}>📅 Evolução Mensal — últimos {historicoMeses.length} meses</p>
                      <p className="text-xs mt-0.5" style={{color:'#9e9b94'}}>Comparativo de Faturamento, Custo e Resultado mês a mês</p>
                    </div>
                    <div className="p-5 space-y-4">
                      {/* Faturamento */}
                      {[
                        {label:'💰 Faturamento', key:'fat', cor:'#10b981'},
                        {label:'⚙️ Custo Operacional', key:'custoOp', cor:'#f59e0b'},
                        {label:'💵 Resultado', key:'resultado', cor:'#5b4fcf'},
                      ].map(({label,key,cor})=>{
                        const maxVal = Math.max(...historicoMeses.map((m:any)=>Math.abs(m[key]||0)),1)
                        return (
                          <div key={key}>
                            <p className="text-xs font-bold mb-2" style={{color:'#9e9b94'}}>{label}</p>
                            <div className="flex items-end gap-1" style={{height:'60px'}}>
                              {historicoMeses.map((m:any,i:number)=>{
                                const val = m[key]||0
                                const pct = Math.min(Math.abs(val)/maxVal*100,100)
                                const negativo = val < 0
                                return (
                                  <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                                    <div className="text-[8px] font-bold" style={{color:negativo?'#ef4444':cor}}>{fmtR(val).replace('R$ ','R$')}</div>
                                    <div className="w-full rounded-t-sm transition-all"
                                      style={{height:`${pct}%`,background:negativo?'#ef444460':`${cor}60`,border:`1px solid ${negativo?'#ef4444':cor}`,minHeight:'4px'}}/>
                                    <div className="text-[7px]" style={{color:'#6b6860'}}>{MESES_NOMES[m.mes].slice(0,3)}/{String(m.ano).slice(2)}</div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                      {/* Tendência */}
                      {historicoMeses.length >= 2 && (()=>{
                        const ult = historicoMeses[historicoMeses.length-1]
                        const ant = historicoMeses[historicoMeses.length-2]
                        const varFat = ant.fat>0?((ult.fat-ant.fat)/ant.fat*100):0
                        const varRes = ant.resultado!==0?((ult.resultado-ant.resultado)/Math.abs(ant.resultado)*100):0
                        return (
                          <div className="grid grid-cols-2 gap-3 pt-2 border-t" style={{borderColor:'#ffffff'}}>
                            <div className="rounded-xl p-3" style={{background:'#f5f4f0'}}>
                              <p className="text-[10px]" style={{color:'#9e9b94'}}>Variação Faturamento (vs mês anterior)</p>
                              <p className="text-lg font-bold" style={{color:varFat>=0?'#10b981':'#ef4444'}}>{varFat>=0?'+':''}{varFat.toFixed(1)}%</p>
                            </div>
                            <div className="rounded-xl p-3" style={{background:'#f5f4f0'}}>
                              <p className="text-[10px]" style={{color:'#9e9b94'}}>Variação Resultado (vs mês anterior)</p>
                              <p className="text-lg font-bold" style={{color:varRes>=0?'#10b981':'#ef4444'}}>{varRes>=0?'+':''}{varRes.toFixed(1)}%</p>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                )}
                {historicoMeses.length <= 1 && (
                  <div className="rounded-xl p-4 text-center" style={{background:'#faf9f7',border:'1px solid #ffffff'}}>
                    <p className="text-2xl mb-1">📅</p>
                    <p className="text-sm font-bold" style={{color:'#9e9b94'}}>Comparativo mensal disponível com 2+ meses salvos</p>
                    <p className="text-xs mt-1" style={{color:'#9e9b94'}}>Salve os dados deste mês e do próximo para ver a evolução</p>
                  </div>
                )}

              </>
            )}

            {/* Botão Exportar PDF */}
            {fatN > 0 && (
              <button onClick={()=>window.print()}
                className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                style={{background:'#5b4fcf20',color:'#7c6fe0',border:'1px solid #5b4fcf40'}}>
                🖨️ Exportar / Imprimir Relatório PDF
              </button>
            )}
          </div>
        )}

        {/* ════ ABA CATÁLOGO DE SERVIÇOS (removida) ════ */}
        {false && (
          <div className="space-y-4">
            {/* Formulário cadastro */}
            <div className="rounded-2xl p-5 border" style={{background:'#faf9f7',borderColor:'#5b4fcf40'}}>
              <h3 className="font-bold text-sm mb-4" style={{color:'#5b4fcf'}}>{editandoServ?'✏️ Editar Serviço':'➕ Cadastrar Novo Serviço'}</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div><label className="text-xs font-bold block mb-1" style={{color:'#9e9b94'}}>Nome do Serviço *</label>
                  <input value={fsNome} onChange={e=>setFsNome(e.target.value)} placeholder="Ex: Coloração Completa"
                    className="w-full px-3 py-2 rounded-xl text-sm text-white focus:outline-none" style={{background:'#f5f4f0',border:'1px solid #dedad4'}}/></div>
                <div><label className="text-xs font-bold block mb-1" style={{color:'#9e9b94'}}>Rateio Profissional (%)</label>
                  <input type="number" value={fsRateio} onChange={e=>setFsRateio(e.target.value)} placeholder="50"
                    className="w-full px-3 py-2 rounded-xl text-sm text-white focus:outline-none" style={{background:'#f5f4f0',border:'1px solid #dedad4'}}/></div>
                <div><label className="text-xs font-bold block mb-1" style={{color:'#9e9b94'}}>Imposto (%)</label>
                  <input type="number" value={fsImposto} onChange={e=>setFsImposto(e.target.value)} placeholder="5"
                    className="w-full px-3 py-2 rounded-xl text-sm text-white focus:outline-none" style={{background:'#f5f4f0',border:'1px solid #dedad4'}}/></div>
                <div><label className="text-xs font-bold block mb-1" style={{color:'#9e9b94'}}>Produto Padrão (R$)</label>
                  <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{color:'#9e9b94'}}>R$</span>
                  <input type="number" value={fsProduto} onChange={e=>setFsProduto(e.target.value)} placeholder="0"
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-sm text-white focus:outline-none" style={{background:'#f5f4f0',border:'1px solid #dedad4'}}/></div></div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={()=>salvarServico(editandoServ||undefined)} disabled={!fsNome||salvandoCat}
                  className="px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
                  style={{background:'#5b4fcf',color:'white'}}>
                  {salvandoCat?'Salvando...':editandoServ?'Salvar alterações':'Cadastrar Serviço'}
                </button>
                {editandoServ&&<button onClick={()=>{setEditandoServ(null);setFsNome('');setFsRateio('50');setFsImposto('5');setFsProduto('0')}}
                  className="px-4 py-2 rounded-xl text-xs" style={{background:'#ffffff',color:'#9e9b94'}}>Cancelar</button>}
                {msgCat&&<span className="text-xs font-bold" style={{color:'#10b981'}}>{msgCat}</span>}
              </div>
            </div>
            {/* Lista */}
            <div className="rounded-2xl border overflow-hidden" style={{background:'#faf9f7',borderColor:'#ffffff'}}>
              <div className="flex items-center justify-between px-5 py-3 border-b" style={{background:'#0d1525',borderColor:'#ffffff'}}>
                <span className="font-bold text-sm text-white">📋 Serviços Cadastrados ({servicosCatalogo.length})</span>
                <input value={buscarServico} onChange={e=>setBuscarServico(e.target.value)} placeholder="🔍 Buscar serviço..."
                  className="px-3 py-1.5 rounded-lg text-xs text-white focus:outline-none w-48" style={{background:'#f5f4f0',border:'1px solid #dedad4'}}/>
              </div>
              {servicosCatalogo.filter(s=>s.nome.toLowerCase().includes(buscarServico.toLowerCase())).length===0
                ? <p className="text-center py-8 text-sm" style={{color:'#6b6860'}}>Nenhum serviço cadastrado ainda</p>
                : servicosCatalogo.filter(s=>s.nome.toLowerCase().includes(buscarServico.toLowerCase())).map(s=>(
                  <div key={s.id} className="border-b" style={{borderColor:'#ffffff10'}}>
                    <div className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-white/2"
                      onClick={()=>setAcordeaoServ(acordeaoServ===s.id?null:s.id)}>
                      <div className="flex items-center gap-3">
                        <span className="text-xs" style={{color:'#9e9b94'}}>{acordeaoServ===s.id?'▼':'▶'}</span>
                        <span className="text-sm font-bold text-white">{s.nome}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs" style={{color:'#7c6fe0'}}>Rateio: {s.rateio_pct}%</span>
                        <span className="text-xs" style={{color:'#f59e0b'}}>Imposto: {s.imposto_pct}%</span>
                        <button onClick={e=>{e.stopPropagation();editarServico(s)}} className="text-xs px-2 py-1 rounded" style={{background:'#5b4fcf20',color:'#7c6fe0'}}>✏️ Editar</button>
                        <button onClick={e=>{e.stopPropagation();excluirServico(s.id)}} className="text-xs px-2 py-1 rounded" style={{background:'#ef444420',color:'#f87171'}}>🗑️</button>
                      </div>
                    </div>
                    {acordeaoServ===s.id&&(
                      <div className="px-5 pb-3 grid grid-cols-3 gap-3">
                        {[{l:'Rateio',v:`${s.rateio_pct}%`},{l:'Imposto',v:`${s.imposto_pct}%`},{l:'Produto padrão',v:`R$ ${s.produto_padrao||0}`}].map((i,idx)=>(
                          <div key={idx} className="rounded-lg p-3 text-center" style={{background:'#f5f4f0'}}>
                            <p className="text-[10px]" style={{color:'#9e9b94'}}>{i.l}</p>
                            <p className="text-sm font-bold" style={{color:'#1a1a1a'}}>{i.v}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ════ ABA CATÁLOGO DE PRODUTOS ════ */}
        {aba==='catproduto' && (
          <div className="space-y-4">
            {/* Formulário cadastro */}
            <div className="rounded-2xl p-5 border" style={{background:'#faf9f7',borderColor:'#f59e0b40'}}>
              <h3 className="font-bold text-sm mb-4" style={{color:'#f59e0b'}}>{editandoProd?'✏️ Editar Produto':'➕ Cadastrar Novo Produto'}</h3>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="col-span-2"><label className="text-xs font-bold block mb-1" style={{color:'#9e9b94'}}>Nome do Produto *</label>
                  <input value={fNome} onChange={e=>setFNome(e.target.value)} placeholder="Ex: Tinta Color Sem Amônia"
                    className="w-full px-3 py-2 rounded-xl text-sm text-white focus:outline-none" style={{background:'#f5f4f0',border:'1px solid #dedad4'}}/></div>
                <div><label className="text-xs font-bold block mb-1" style={{color:'#9e9b94'}}>Marca</label>
                  <input value={fMarca} onChange={e=>setFMarca(e.target.value)} placeholder="Ex: Wella"
                    className="w-full px-3 py-2 rounded-xl text-sm text-white focus:outline-none" style={{background:'#f5f4f0',border:'1px solid #dedad4'}}/></div>
                <div><label className="text-xs font-bold block mb-1" style={{color:'#9e9b94'}}>Unidade</label>
                  <select value={fUnid} onChange={e=>setFUnid(e.target.value)} className="w-full px-3 py-2 rounded-xl text-sm text-white focus:outline-none" style={{background:'#f5f4f0',border:'1px solid #dedad4'}}>
                    {['ml','g','und','L','kg','outros'].map(u=><option key={u} value={u}>{u}</option>)}</select></div>
                <div><label className="text-xs font-bold block mb-1" style={{color:'#9e9b94'}}>Qtd da Embalagem</label>
                  <input type="number" value={fQtd} onChange={e=>setFQtd(e.target.value)} placeholder="Ex: 60"
                    className="w-full px-3 py-2 rounded-xl text-sm text-white focus:outline-none" style={{background:'#f5f4f0',border:'1px solid #dedad4'}}/></div>
                <div><label className="text-xs font-bold block mb-1" style={{color:'#9e9b94'}}>Preço da Embalagem (R$)</label>
                  <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{color:'#9e9b94'}}>R$</span>
                  <input type="number" value={fPreco} onChange={e=>setFPreco(e.target.value)} placeholder="Ex: 35,27"
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-sm text-white focus:outline-none" style={{background:'#f5f4f0',border:'1px solid #dedad4'}}/></div></div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={()=>salvarProduto(editandoProd||undefined)} disabled={!fNome||salvandoCat}
                  className="px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
                  style={{background:'#f59e0b',color:'#000'}}>
                  {salvandoCat?'Salvando...':editandoProd?'Salvar alterações':'Cadastrar Produto'}
                </button>
                {editandoProd&&<button onClick={()=>{setEditandoProd(null);setFNome('');setFMarca('');setFUnid('ml');setFQtd('');setFPreco('')}}
                  className="px-4 py-2 rounded-xl text-xs" style={{background:'#ffffff',color:'#9e9b94'}}>Cancelar</button>}
                {msgCat&&<span className="text-xs font-bold" style={{color:'#10b981'}}>{msgCat}</span>}
              </div>
            </div>
            {/* Lista */}
            <div className="rounded-2xl border overflow-hidden" style={{background:'#faf9f7',borderColor:'#ffffff'}}>
              <div className="flex items-center justify-between px-5 py-3 border-b" style={{background:'#0d1525',borderColor:'#ffffff'}}>
                <span className="font-bold text-sm text-white">📦 Produtos Cadastrados ({produtosCatalogo.length})</span>
                <input value={buscarProduto} onChange={e=>setBuscarProduto(e.target.value)} placeholder="🔍 Buscar produto..."
                  className="px-3 py-1.5 rounded-lg text-xs text-white focus:outline-none w-48" style={{background:'#f5f4f0',border:'1px solid #dedad4'}}/>
              </div>
              {produtosCatalogo.filter(p=>p.nome.toLowerCase().includes(buscarProduto.toLowerCase())).length===0
                ? <p className="text-center py-8 text-sm" style={{color:'#6b6860'}}>Nenhum produto cadastrado ainda</p>
                : produtosCatalogo.filter(p=>p.nome.toLowerCase().includes(buscarProduto.toLowerCase())).map(p=>(
                  <div key={p.id} className="border-b" style={{borderColor:'#ffffff10'}}>
                    <div className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-white/2"
                      onClick={()=>setAcordeaoProd(acordeaoProd===p.id?null:p.id)}>
                      <div className="flex items-center gap-3">
                        <span className="text-xs" style={{color:'#9e9b94'}}>{acordeaoProd===p.id?'▼':'▶'}</span>
                        <span className="text-sm font-bold text-white">{p.nome}</span>
                        {p.marca&&<span className="text-xs px-2 py-0.5 rounded-full" style={{background:'#f59e0b20',color:'#f59e0b'}}>{p.marca}</span>}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs" style={{color:'#10b981'}}>R$ {p.preco} / {p.qtd_embalagem}{p.unidade}</span>
                        <button onClick={e=>{e.stopPropagation();editarProduto(p);setAba('catproduto')}} className="text-xs px-2 py-1 rounded" style={{background:'#5b4fcf20',color:'#7c6fe0'}}>✏️ Editar</button>
                        <button onClick={e=>{e.stopPropagation();excluirProduto(p.id)}} className="text-xs px-2 py-1 rounded" style={{background:'#ef444420',color:'#f87171'}}>🗑️</button>
                      </div>
                    </div>
                    {acordeaoProd===p.id&&(
                      <div className="px-5 pb-3 grid grid-cols-4 gap-3">
                        {[{l:'Unidade',v:p.unidade},{l:'Qtd Embalagem',v:`${p.qtd_embalagem}${p.unidade}`},{l:'Preço',v:`R$ ${p.preco}`},{l:'Custo/unidade',v:`R$ ${p.qtd_embalagem>0?(p.preco/p.qtd_embalagem).toFixed(4):'-'}`}].map((i,idx)=>(
                          <div key={idx} className="rounded-lg p-3 text-center" style={{background:'#f5f4f0'}}>
                            <p className="text-[10px]" style={{color:'#9e9b94'}}>{i.l}</p>
                            <p className="text-sm font-bold" style={{color:'#1a1a1a'}}>{i.v}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

      </div>

      {/* Modal Catálogo de Despesas */}
      {showCatDespesa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.75)'}}>
          <div className="rounded-2xl border w-full max-w-2xl shadow-2xl flex flex-col" style={{background:'#faf9f7',borderColor:'#f59e0b50',maxHeight:'90vh'}}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{borderColor:'#ffffff'}}>
              <div>
                <h2 className="font-bold text-base" style={{color:'#f59e0b'}}>📋 Catálogo de Despesas</h2>
                <p className="text-xs mt-0.5" style={{color:'#9e9b94'}}>Cadastre suas despesas para usar autocomplete em todos os campos</p>
              </div>
              <button onClick={()=>{setShowCatDespesa(false);setEditDespCat(null);setFdNome('');setFdCat('indireta');setFdObs('')}}
                className="p-2 rounded-lg hover:bg-white/5" style={{color:'#9e9b94'}}><X size={18}/></button>
            </div>

            {/* Formulário */}
            <div className="px-6 py-4 border-b" style={{borderColor:'#ffffff',background:'#0d1525'}}>
              <p className="text-xs font-bold mb-3" style={{color:'#9e9b94'}}>{editDespCat ? '✏️ Editando despesa' : '➕ Nova despesa'}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold mb-1 block" style={{color:'#9e9b94'}}>NOME DA DESPESA</label>
                  <input value={fdNome} onChange={e=>setFdNome(e.target.value)} placeholder="Ex: Aluguel, Internet, Salários..."
                    className="w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none"
                    style={{background:'#faf9f7',border:'1px solid #dedad4'}}/>
                </div>
                <div>
                  <label className="text-[10px] font-bold mb-1 block" style={{color:'#9e9b94'}}>CATEGORIA</label>
                  <select value={fdCat} onChange={e=>setFdCat(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none"
                    style={{background:'#faf9f7',border:'1px solid #dedad4'}}>
                    <option value="indireta">Indireta (fixa)</option>
                    <option value="direta">Direta</option>
                    <option value="outras">Outras / Capital</option>
                  </select>
                </div>
              </div>
              <div className="mt-3">
                <label className="text-[10px] font-bold mb-1 block" style={{color:'#9e9b94'}}>OBSERVAÇÃO (opcional)</label>
                <input value={fdObs} onChange={e=>setFdObs(e.target.value)} placeholder="Descrição ou dica para esta despesa"
                  className="w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none"
                  style={{background:'#faf9f7',border:'1px solid #dedad4'}}/>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={()=>salvarDespCat(editDespCat?.id)} disabled={!fdNome.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-40"
                  style={{background:'#f59e0b',color:'#000'}}>
                  <Save size={14}/> {editDespCat ? 'Salvar alteração' : 'Adicionar'}
                </button>
                {editDespCat && (
                  <button onClick={()=>{setEditDespCat(null);setFdNome('');setFdCat('indireta');setFdObs('')}}
                    className="px-4 py-2 rounded-lg text-sm" style={{background:'#ffffff',color:'#9e9b94'}}>
                    Cancelar
                  </button>
                )}
                {despesasCatalogo.length === 0 && (
                  <button onClick={seedDespesas}
                    className="ml-auto px-4 py-2 rounded-lg text-xs" style={{background:'#ffffff',color:'#9e9b94',border:'1px dashed #dedad4'}}>
                    Pré-popular com despesas padrão
                  </button>
                )}
              </div>
            </div>

            {/* Lista */}
            <div className="overflow-y-auto flex-1 px-6 py-4">
              {despesasCatalogo.length === 0 ? (
                <p className="text-center py-8 text-sm" style={{color:'#6b6860'}}>Nenhuma despesa cadastrada ainda. Adicione acima ou clique em "Pré-popular".</p>
              ) : (
                <>
                  {(['indireta','direta','outras'] as const).map(cat=>{
                    const itens = despesasCatalogo.filter(d=>d.categoria===cat)
                    if(!itens.length) return null
                    const catLabel = cat==='indireta'?'📋 Indiretas (fixas)':cat==='direta'?'📌 Diretas':'💸 Outras / Capital'
                    const catCor = cat==='indireta'?'#f59e0b':cat==='direta'?'#ef4444':'#06b6d4'
                    return (
                      <div key={cat} className="mb-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{color:catCor}}>{catLabel}</p>
                        <div className="space-y-1">
                          {itens.map(d=>(
                            <div key={d.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/3" style={{background:'#0d1525',border:'1px solid #ffffff10'}}>
                              <div>
                                <span className="text-sm text-white">{d.nome}</span>
                                {d.observacao && <span className="ml-2 text-[10px]" style={{color:'#6b6860'}}>{d.observacao}</span>}
                              </div>
                              <div className="flex gap-2">
                                <button onClick={()=>{setEditDespCat(d);setFdNome(d.nome);setFdCat(d.categoria);setFdObs(d.observacao||'')}}
                                  className="p-1.5 rounded-lg hover:bg-white/5" style={{color:'#f59e0b'}} title="Editar">
                                  <Save size={12}/>
                                </button>
                                <button onClick={()=>excluirDespCat(d.id)}
                                  className="p-1.5 rounded-lg hover:bg-white/5" style={{color:'#ef4444'}} title="Excluir">
                                  <Trash2 size={12}/>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )

  // Funções auxiliares de custo de produto
  function adicionarIngrediente(sId: number) {
    setServicoProd(p=>p.map(s=>s.id===sId?{...s,ingredientes:[...s.ingredientes,{id:s.ingredientes.length+1,nome:'',qtdEmb:'',qtdUsa:'',preco:'',unidade:'ml'}]}:s))
  }
  function atualizarIngrediente(sId: number, iIdx: number, campo: keyof Ingrediente, val: string) {
    setServicoProd(p=>p.map(s=>s.id===sId?{...s,ingredientes:s.ingredientes.map((ing,idx)=>idx===iIdx?{...ing,[campo]:val}:ing)}:s))
  }
  function removerIngrediente(sId: number, iIdx: number) {
    setServicoProd(p=>p.map(s=>s.id===sId?{...s,ingredientes:s.ingredientes.filter((_,idx)=>idx!==iIdx)}:s))
  }
}
