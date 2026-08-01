'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Plus, Trash2, Calculator, Loader2, Save, ChevronDown, ChevronUp, History, CheckCircle, ChevronLeft, ChevronRight, X, AlertTriangle } from 'lucide-react'
import { usePermissoes } from '@/lib/usePermissoes'
import { useGuardaSalvar } from '@/lib/guardaSalvar'
import { useAutoSalvar } from '@/lib/autoSalvar'
import LeitorBoleto from '@/components/salon/LeitorBoleto'
import { BoletoLido, formatarLinha } from '@/lib/boleto'

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
    titulo: 'Cadeiras/Postos por tipo',
    oque: 'Quantas cadeiras/postos existem, separados por tipo. Cada tipo tem um peso: cabeleireiro e estética valem 1 posto; manicure e maquiador valem meio posto (0,5), por gerarem menos faturamento.',
    como: 'Informe a quantidade de cada tipo. O sistema soma aplicando os pesos e chega aos "postos efetivos".',
    exemplo: '3 cabeleireiro (3,0) + 2 manicure (1,0) = 5 postos brutos, mas 4,0 postos efetivos.',
    porque: 'Divide o custo total pelos postos efetivos para saber quanto cada posto precisa gerar. Os pesos evitam superestimar a capacidade de postos que faturam menos.',
  },
  custoOpCad: {
    titulo: 'Custo Operacional para Aluguel',
    oque: 'O total de custos mensais do salão que precisa ser coberto pelo aluguel das cadeiras.',
    como: 'Se preencheu Receitas e Despesas, é preenchido automaticamente. Senão, some todas as despesas fixas mensais.',
    exemplo: 'Aluguel R$ 3.000 + Luz R$ 600 + Internet R$ 150 + ... = R$ 8.000 de custo total.',
    porque: 'O aluguel de cadeira precisa, no mínimo, cobrir os custos. O valor sugerido aplica a margem escolhida sobre o preço e acrescenta as taxas de depreciação (5%) e vacância (30%).',
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
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{borderColor:'#e8e6e0'}}>
              <h3 className="font-bold text-sm text-[#1a1a1a]">{info.titulo}</h3>
              <button onClick={() => setAberto(false)} className="p-1 rounded-lg hover:bg-white/10" style={{color:'#767069'}}><X size={16}/></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-xl p-3" style={{background:'#f5f4f0'}}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{color:'#5b4fcf'}}>O que é?</p>
                <p className="text-xs leading-relaxed" style={{color:'#3a3835'}}>{info.oque}</p>
              </div>
              <div className="rounded-xl p-3" style={{background:'#f5f4f0'}}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{color:'#059669'}}>Como preencher?</p>
                <p className="text-xs leading-relaxed" style={{color:'#3a3835'}}>{info.como}</p>
              </div>
              <div className="rounded-xl p-3" style={{background:'#5b4fcf15',border:'1px solid #5b4fcf30'}}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{color:'#7c6fe0'}}>Exemplo prático</p>
                <p className="text-xs leading-relaxed" style={{color:'#1a1a1a'}}>{info.exemplo}</p>
              </div>
              <div className="rounded-xl p-3" style={{background:'#10b98115',border:'1.5px solid #10b98160'}}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{color:'#059669'}}>Por que é importante?</p>
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
        style={{background:'#f59e0b20',color:'#b45309',border:'1px solid #f59e0b50'}}
        title="Campo usando valor padrão — clique para decidir">
        padrão
      </button>
      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.7)'}}>
          <div className="rounded-2xl border max-w-sm w-full shadow-2xl" style={{background:'#faf9f7',borderColor:'#f59e0b50'}}>
            <div className="px-5 py-4 border-b" style={{borderColor:'#e8e6e0'}}>
              <h3 className="font-bold text-sm text-[#1a1a1a] flex items-center gap-2">Campo usando valor padrão</h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="rounded-xl p-3" style={{background:'#f59e0b10',border:'1px solid #f59e0b30'}}>
                <p className="text-xs" style={{color:'#92400e'}}>
                  Este campo está usando o valor padrão: <strong>{padrao}</strong>
                </p>
                <p className="text-xs mt-1" style={{color:'#767069'}}>
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
                  style={{background:'#ffffff',color:'#767069',border:'1px solid #dedad4'}}>
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
// Guia das abas: nasce FECHADO, igual ao "Como preencher" da aba Receitas e
// Despesas. Aberto por padrão, ele empurrava o conteúdo útil pra fora da tela
// no celular — quem já sabe preencher nunca precisou dele.
function GuiaPassos({ passos }: { passos: {titulo: string, desc: string, ok: boolean, cor: string}[] }) {
  const [aberto, setAberto] = useState(false)
  return (
    <div className="rounded-2xl border overflow-hidden" style={{background:'#ffffff',borderColor:'#5b4fcf30'}}>
      <button onClick={()=>setAberto(a=>!a)} className="w-full flex items-center justify-between px-4 py-3">
        <span className="text-xs font-bold flex items-center gap-2" style={{color:'#5b4fcf'}}>
          {aberto ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
          Como preencher
        </span>
        <span className="text-[10px] flex-shrink-0" style={{color:'#767069'}}>{aberto?'fechar ✕':'abrir ▾'}</span>
      </button>
      {aberto && (
      <div className="grid gap-2 px-4 pb-4" style={{gridTemplateColumns:`repeat(${passos.length}, 1fr)`}}>
        {passos.map((p, i) => (
          <div key={i} className="rounded-xl p-3 border text-center" style={{
            background: p.ok ? `${p.cor}10` : '#faf9f7',
            borderColor: p.ok ? `${p.cor}40` : '#ffffff',
          }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-2"
              style={{background: p.ok ? p.cor : '#ffffff', color: p.ok ? 'white' : '#6b6860'}}>
              {p.ok ? '✓' : i+1}
            </div>
            <p className="text-[10px] font-bold mb-1" style={{color: p.ok ? p.cor : '#767069'}}>
              {p.titulo}
            </p>
            <p className="text-[9px] leading-tight" style={{color:'#6b6860'}}>{p.desc}</p>
          </div>
        ))}
      </div>
      )}
    </div>
  )
}

// ─── Componente ObsComProf ───────────────────────────────────────────────────
// Campo de observação: continua com digitação livre + botão que abre uma janela
// suspensa com todos os profissionais cadastrados. Ao clicar num nome, ele é
// inserido na observação (sem apagar o que já foi digitado).
function ObsComProf({ valor, onChange, profs }: {
  valor: string
  onChange: (v: string) => void
  profs: { id: string; nome: string }[]
}) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const btnRef = useRef<HTMLButtonElement>(null)
  // Posição fixa do menu (calculada a partir do botão) — evita que o card corte
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number; width: number }>({ left: 0, top: 0, width: 230 })
  const filtrados = busca.trim()
    ? profs.filter(p => p.nome.toLowerCase().includes(busca.trim().toLowerCase()))
    : profs
  const inserir = (nome: string) => {
    const atual = (valor || '').trim()
    onChange(atual ? `${atual} — ${nome}` : nome)
    setAberto(false)
    setBusca('')
  }
  const toggle = () => {
    if (aberto) { setAberto(false); return }
    const el = btnRef.current
    const larg = 230, alt = 280
    if (el) {
      const r = el.getBoundingClientRect()
      const winH = window.innerHeight, winW = window.innerWidth
      const espacoAbaixo = winH - r.bottom
      const abrirPraCima = espacoAbaixo < alt && r.top > espacoAbaixo
      const left = Math.max(8, Math.min(r.right - larg, winW - larg - 8))
      setPos(abrirPraCima
        ? { left, bottom: winH - r.top + 4, width: larg }
        : { left, top: r.bottom + 4, width: larg })
    }
    setAberto(true)
    setBusca('')
  }
  return (
    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 6, alignItems: 'center' }}>
      <input value={valor || ''} onChange={e => onChange(e.target.value)}
        placeholder="Observação (ex: de quem, referência, motivo)…"
        style={{ flex: 1, minWidth: 0, background: '#fff', border: '1px dashed #f59e0b80', borderRadius: 8, padding: '6px 10px', fontSize: 11.5, color: '#78350f', outline: 'none' }} />
      <button ref={btnRef} type="button" onClick={toggle} title="Escolher profissional cadastrado"
        style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, background: aberto ? '#f59e0b' : '#fff', border: '1px solid #f59e0b80', borderRadius: 8, padding: '6px 9px', fontSize: 11, color: aberto ? '#fff' : '#b45309', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
        👤 Profissional
      </button>
      {aberto && (
        <>
          <div onClick={() => setAberto(false)} style={{ position: 'fixed', inset: 0, zIndex: 9998 }} />
          <div style={{ position: 'fixed', left: pos.left, top: pos.top, bottom: pos.bottom, width: pos.width, maxHeight: 280, overflowY: 'auto', background: '#fff', border: '1px solid #f59e0b', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.18)', zIndex: 9999 }}>
            <div style={{ padding: 6, borderBottom: '1px solid #f3ede0', position: 'sticky', top: 0, background: '#fff' }}>
              <input autoFocus value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar profissional…"
                style={{ width: '100%', padding: '5px 8px', fontSize: 11.5, border: '1px solid #e8e6e0', borderRadius: 6, outline: 'none' }} />
            </div>
            {profs.length === 0 && (
              <div style={{ padding: '12px 10px', fontSize: 11, color: '#999', textAlign: 'center' }}>
                Nenhum profissional cadastrado
              </div>
            )}
            {profs.length > 0 && filtrados.length === 0 && (
              <div style={{ padding: '12px 10px', fontSize: 11, color: '#999', textAlign: 'center' }}>
                Nenhum resultado
              </div>
            )}
            {filtrados.map(p => (
              <button key={p.id} type="button" onClick={() => inserir(p.nome)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 12px', fontSize: 11.5, color: '#3a3835', background: 'transparent', border: 'none', borderBottom: '1px solid #f7f3ea', cursor: 'pointer' }}>
                {p.nome}
              </button>
            ))}
          </div>
        </>
      )}
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
interface DespesaItem { nome: string; valor: string; dica: string; editavel?: boolean; parcela?: string; obs?: string; grupo?: string; venc?: string; data?: string; cod?: string; pix?: string }

// Datas do lançamento (dd/mm/yyyy) <-> input type=date (yyyy-mm-dd)
const isoParaBR = (iso: string) => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}/${m[2]}/${m[1]}` : '' }
const brParaISO = (br: string) => { const m = String(br || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? `${m[3]}-${m[2]}-${m[1]}` : '' }
const hojeBRCalc = () => { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` }

// Mês sem nada salvo: zera o que é MOVIMENTO daquele mês (faturamento, listas
// de despesas, provisão, reserva). O que é configuração que se repete todo mês
// (metas, nº de cadeiras, área em m², % desejados) fica como está, senão o
// usuário teria que reconfigurar a cada mês novo.
const MES_VAZIO = {
  fat: '', invInicial: '', totalDeprec: '',
  despInd: [] as any[], extrasDespInd: [] as any[], extrasDiretas: [] as any[], extrasOutras: [] as any[],
  sal13: '', ferias: '', fgtsR: '',
  imposto: '', produto: '', rateio: '', taxaC: '',
  aquisicaoEq: '', distSocios: '', reservaEmerg: '', vlrProdEstoque: '',
}

// ─── Vencimento das despesas indiretas ──────────────────────────────────────
// Guardado em ISO 'YYYY-MM-DD' (mesmo formato que o parcelamento já gravava).
// Preenchido = a conta entra sozinha na fila de boletos do setor FINANCEIRO.
// Em branco = comportamento antigo, não vira boleto.
const GRID_IND = '1fr 100px 56px 62px 128px 52px'

// Cores das colunas do ranking. Uma por posicao, repetindo depois da 8a:
// serve pra separar uma barra da outra, nao pra classificar a despesa.
const CORES_BARRA = ['#e0567c', '#3b82f6', '#c026d3', '#84cc16', '#8b5cf6', '#f59e0b', '#06b6d4', '#ef4444']

// Mostra o código guardado embaixo da linha (o Financeiro copia por lá)
function LinhaCodigo({ cod, onLimpar }: { cod: string; onLimpar: () => void }) {
  return (
    <div style={{gridColumn:'1 / -1',display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:8,padding:'5px 9px'}}>
      <span style={{fontSize:9.5,fontWeight:800,color:'#15803d'}}>CÓDIGO DO BOLETO</span>
      <span style={{fontFamily:'ui-monospace,monospace',fontSize:10.5,color:'#374151',wordBreak:'break-all',flex:'1 1 200px'}}>{formatarLinha(cod)}</span>
      <button onClick={onLimpar} title="Remover o código desta linha" style={{background:'transparent',border:'none',cursor:'pointer',color:'#9ca3af',fontSize:10.5}}>remover</button>
    </div>
  )
}

// Botãozinho de código de barras que aparece em cada linha de despesa
function BtnCodigo({ tem, onClick }: { tem: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} title={tem ? 'Código do boleto guardado — clique para reler' : 'Escanear / colar o código do boleto'}
      className={tem ? '' : 'campo-vazio'}
      style={{ background: tem ? '#dcfce7' : 'transparent', border: tem ? '1px solid #86efac' : '1px solid #f59e0b40', borderRadius: 6, padding: '3px 4px', cursor: 'pointer', lineHeight: 1, color: tem ? '#15803d' : '#b45309' }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M4 5v14M8 5v14M12 5v14M16 5v10M20 5v14" />
      </svg>
    </button>
  )
}
const diasParaVenc = (venc: string): number | null => {
  const m = String(venc || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  const alvo = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const hj = new Date(); hj.setHours(0, 0, 0, 0)
  return Math.round((alvo.getTime() - hj.getTime()) / 86400000)
}
function CampoVenc({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
  const dias = diasParaVenc(valor)
  const cor = dias === null ? '#e8e6e0' : dias < 0 ? '#ef4444' : dias === 0 ? '#f59e0b' : '#10b981'
  return (
    <div className="nodri-venc-cel" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* campo-vazio: no celular o campo sem data perde borda e fundo, pra não
          virar uma caixinha competindo com o que importa na linha */}
      <input type="date" value={valor || ''} onChange={e => onChange(e.target.value)}
        onClick={e => { try { (e.currentTarget as any).showPicker?.() } catch { /* */ } }}
        title="Vencimento — com data preenchida, a conta entra na fila de boletos do FINANCEIRO"
        className={`w-full px-1 py-1.5 rounded-lg text-[11px] text-center focus:outline-none${valor ? '' : ' campo-vazio'}${dias !== null && dias < 0 ? ' venc-vencido' : ''}`}
        style={{ background: '#fff', border: `1.5px solid ${cor}`, color: '#78350f', fontWeight: valor ? 700 : 400, cursor: 'pointer' }} />
      {dias !== null && (
        <span style={{ fontSize: 9, textAlign: 'center', fontWeight: 700, color: cor }}>
          {dias < 0 ? `vencido ${Math.abs(dias)}d` : dias === 0 ? 'vence hoje' : `em ${dias}d`}
        </span>
      )}
    </div>
  )
}
interface Ingrediente  { id: number; nome: string; qtdEmb: string; qtdUsa: string; preco: string; unidade: string }
interface ServicoProd  { id: number; nomeServico: string; ingredientes: Ingrediente[] }
interface Servico      { id: number; nome: string; preco: string; rateioP: string; produto: string; imposto: string; produtoNome?: string }

// ─── Componente principal ────────────────────────────────────────────────────
export default function CalculadoraCusto() {
  // ── Histórico mensal ────────────────────────────────────────────────────────
  const hoje = new Date()
  const [anoSel,    setAnoSel]    = useState(hoje.getFullYear())
  const [mesSel,    setMesSel]    = useState(hoje.getMonth() + 1)
  // ── Por que esta tela não é renderizada no servidor ──────────────────────
  // Ela depende de "hoje" em vários pontos (mês selecionado, cor de vencimento).
  // O servidor roda em UTC e o navegador no fuso do salão: das 21h à meia-noite
  // os dois discordam do DIA, e no dia 31 discordam até do MÊS. Quando o HTML do
  // servidor não bate com o do navegador, o React joga fora a árvore inteira e
  // reconstrói — e o clique dado nesse meio-tempo se perde (era o "preciso
  // clicar duas vezes"). Renderizando só depois de montar, não há o que divergir.
  const [montado, setMontado] = useState(false)
  useEffect(() => { setMontado(true) }, [])
  const [salvando,  setSalvando]  = useState(false)
  const [savedMsg,  setSavedMsg]  = useState('')
  const [mesesComDados, setMesesComDados] = useState<{ano:number,mes:number}[]>([])
  const [carregando, setCarregando] = useState(false)
  // Alterações não salvas do mês (qualquer digitação nos campos marca como pendente)
  const [dirtyCalc, setDirtyCalc] = useState(false)
  const [pendenteFalho, setPendenteFalho] = useState<{ano:number,mes:number,dados:any}|null>(null)
  const [falhaSalvar, setFalhaSalvar] = useState('')   // ultimo erro de salvamento (inclusive do auto-save)
  useGuardaSalvar(dirtyCalc, 'Calculadora de Custo') // avisa "Deseja salvar?" antes de sair sem salvar
  useAutoSalvar(dirtyCalc, () => salvarMes(true))          // e salva sozinho de qualquer jeito

  // Aba ativa
  const [aba, setAba] = useState<'rd'|'pe'|'servicos'|'produto'|'catproduto'|'cadeira'|'metro'|'graficos'>('rd')

  // Permissões: cada parte da Calculadora é liberada por perfil (dono ve tudo)
  const { pode: podeCalc } = usePermissoes()
  const verAbasExtras = podeCalc('calc_abas_extras')
  const oculto = (mostra: boolean): React.CSSProperties => mostra ? {} : { display: 'none' }
  useEffect(() => { if (!verAbasExtras && aba !== 'rd') setAba('rd') }, [verAbasExtras, aba])

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
  const [modalCatalogoAberto, setModalCatalogoAberto] = useState(false)
  // ── Parcelamento (lança uma despesa em N meses de uma vez) ──
  const [parcAberto, setParcAberto]     = useState(false)
  const [parcDespesa, setParcDespesa]   = useState('')
  const [parcObs, setParcObs]           = useState('')
  const [parcLinhas, setParcLinhas]     = useState<{valor:string;venc:string;cod?:string}[]>([])
  const [parcSalvando, setParcSalvando] = useState(false)
  // Quantidade de parcelas como TEXTO: deixa apagar o campo pra digitar outro
  // número (com estado numérico o valor voltava pra 1 e travava no celular).
  const [parcQtd, setParcQtd] = useState('1')
  // Data do lançamento (quinzena) — o mesmo campo que existe na linha da lista.
  // Vazio = cada parcela usa a data do próprio vencimento.
  const [parcData, setParcData] = useState('')
  // Compra que você JÁ pagou (mercado, por exemplo): lança e a conta cai
  // direto na aba "Pagos" do Financeiro, em vez de ficar na fila a pagar.
  const [parcPago, setParcPago] = useState(false)
  // Chave PIX da conta (nota fiscal sem código de barras): o Financeiro copia
  // essa chave pra pagar no app do banco.
  const [parcPix, setParcPix] = useState('')
  // ── Leitor de código de boleto: quem pediu a leitura ──
  const [leitorAlvo, setLeitorAlvo] = useState<{lista:'fix'|'extra'|'parc'|'pixmodal'|'pixlinha'; idx:number} | null>(null)
  const [notasAbertas, setNotasAbertas] = useState<Set<string>>(new Set())
  const toggleNota = (k:string) => setNotasAbertas(prev=>{const s=new Set(prev); s.has(k)?s.delete(k):s.add(k); return s})
  const [reservaEmerg,  setReservaEmerg]  = useState('')
  const [totalReservaAcum, setTotalReservaAcum] = useState(0) // total acumulado de todos os meses
  const [mediaCustoOp, setMediaCustoOp] = useState(0) // média do custo operacional % de todos os meses
  const [mediaFat12, setMediaFat12] = useState(0) // média faturamento últimos 12 meses
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
  const [barraSel, setBarraSel] = useState(0)   // coluna escolhida no ranking de despesas
  const [acordeaoServ, setAcordeaoServ] = useState<string|null>(null)
  // Autocomplete: chave = "sId-iIdx", valor = texto digitado para sugestões
  const [autocompleteKey, setAutocompleteKey] = useState<string|null>(null)
  // Atualizar (feedback visual)
  const [atualizando, setAtualizando] = useState(false)
  // Histórico para comparativo mensal
  const [historicoMeses, setHistoricoMeses] = useState<any[]>([])
  // Profissionais cadastrados (para preencher observação sem digitar)
  const [profsLista, setProfsLista] = useState<{id:string,nome:string}[]>([])
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
  // Todos os cards de RD começam FECHADOS (PC e celular) — o usuário abre o que precisar
  const [secPassos,     setSecPassos]     = useState(false) // guia dos 4 passos: fechado por padrão
  const [secIndiretas,  setSecIndiretas]  = useState(false)
  const [secProvisao,   setSecProvisao]   = useState(false)
  const [secDiretas,    setSecDiretas]    = useState(false)
  const [secOutras,     setSecOutras]     = useState(false)
  const [secResultado,  setSecResultado]  = useState(false)
  const [secConfigServ, setSecConfigServ] = useState(false)
  const [secConfigRD,   setSecConfigRD]   = useState(false) // Configurações de RD começam fechadas
  const [secParamsPE,   setSecParamsPE]   = useState(false) // Parâmetros do PE começam fechados
  const [secResultPE,   setSecResultPE]   = useState(false) // Resultados do PE começam fechados
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
  // Diagnóstico & Recomendações por serviço (meta de lucro por atendimento)
  const [metaLucroServ, setMetaLucroServ] = useState('15')
  const [diagAbertos, setDiagAbertos] = useState<Set<number>>(new Set())
  const toggleDiag = (id:number) => setDiagAbertos(prev=>{const s=new Set(prev); s.has(id)?s.delete(id):s.add(id); return s})
  // Cards de serviço/produto recolhíveis (começam fechados)
  const [servAbertos, setServAbertos] = useState<Set<number>>(new Set())
  const toggleServCard = (id:number) => setServAbertos(prev=>{const s=new Set(prev); s.has(id)?s.delete(id):s.add(id); return s})
  const [prodAbertos, setProdAbertos] = useState<Set<number>>(new Set())
  const toggleProdCard = (id:number) => setProdAbertos(prev=>{const s=new Set(prev); s.has(id)?s.delete(id):s.add(id); return s})
  // Seletor de produto do catálogo no campo "Produto (R$)" de Calcular Serviços
  const [prodSelKey, setProdSelKey] = useState<number|null>(null)

  // ── Custo de Produto ─────────────────────────────────────────────────────
  const [servicosProd, setServicoProd] = useState<ServicoProd[]>([
    {id:1, nomeServico:'', ingredientes:[{id:1,nome:'',qtdEmb:'',qtdUsa:'',preco:'',unidade:'ml'}]}
  ])
  const [proxSP, setProxSP] = useState(2)

  // ── Aluguel de Cadeira ───────────────────────────────────────────────────
  const [numCad,    setNumCad]    = useState('')   // legado (compat com meses salvos antigos)
  // Postos por tipo, com pesos (igual à calc de referência): cabeleireiro/estética=1,0; manicure/maquiador=0,5
  const [cadCabel, setCadCabel] = useState('')
  const [cadManic, setCadManic] = useState('')
  const [cadEstet, setCadEstet] = useState('')
  const [cadMaqui, setCadMaqui] = useState('')
  const [custoOpCad,setCustoOpCad]= useState('')
  const [horasSemCad, setHorasSemCad] = useState('40')   // horas de funcionamento por semana
  const [margemCad,   setMargemCad]   = useState('35')   // margem % (25 a 55) — igual à calc de referência
  const [aluguelAtualCad, setAluguelAtualCad] = useState('') // aluguel que cobra hoje (p/ diagnóstico)

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
      despInd: despInd.map(d=>({nome:d.nome,valor:d.valor,obs:d.obs||'',venc:d.venc||'',cod:d.cod||''})),
      extrasDespInd: extrasDespInd.map(d=>({nome:d.nome,valor:d.valor,parcela:d.parcela||'',obs:d.obs||'',grupo:d.grupo||'',venc:d.venc||'',data:d.data||'',cod:d.cod||'',pix:d.pix||''})),
      extrasDiretas: extrasDiretas.map(d=>({nome:d.nome,valor:d.valor})),
      extrasOutras: extrasOutras.map(d=>({nome:d.nome,valor:d.valor})),
      sal13, ferias, fgtsR, imposto, produto, rateio, taxaC,
      aquisicaoEq, distSocios, reservaEmerg, vlrProdEstoque,
      areaM2, numProfs, margemPE, metaLucroPE, fatPEManual, simDespesa,
      taxaCartao, abatProd, custOpServ, taxaAntesRateio, prodAntesRateio, salaoParceiro, metaLucroServ,
      servicos, numCad, cadCabel, cadManic, cadEstet, cadMaqui, custoOpCad, horasSemCad, margemCad, aluguelAtualCad, mTotal, fatMinM2, mSala,
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
    if (d.despInd) setDespInd(DESPESAS_INDIRETAS.map((di,i)=>({...di,valor:d.despInd[i]?.valor||'',obs:(d.despInd[i] as any)?.obs||'',venc:(d.despInd[i] as any)?.venc||'',cod:(d.despInd[i] as any)?.cod||''})))
    if (d.extrasDespInd) setExtrasDespInd(d.extrasDespInd.map((x:any)=>({nome:x.nome,valor:x.valor,dica:'',parcela:x.parcela||'',obs:x.obs||'',grupo:x.grupo||'',venc:x.venc||'',data:x.data||'',cod:x.cod||'',pix:x.pix||''})))
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
    // OBS: Calcular Serviços e Custo de Produto (servicos, servicosProd, taxaCartao,
    // abatProd, custOpServ, flags, salaoParceiro, metaLucroServ) são GLOBAIS —
    // valem para todos os meses e são carregados/salvos via grid 'calc_servicos_global',
    // por isso NÃO são aplicados aqui ao trocar de mês.
    if (d.numCad !== undefined) setNumCad(d.numCad)
    if ((d as any).cadCabel !== undefined) setCadCabel((d as any).cadCabel)
    if ((d as any).cadManic !== undefined) setCadManic((d as any).cadManic)
    if ((d as any).cadEstet !== undefined) setCadEstet((d as any).cadEstet)
    if ((d as any).cadMaqui !== undefined) setCadMaqui((d as any).cadMaqui)
    if (d.custoOpCad !== undefined) setCustoOpCad(d.custoOpCad)
    if ((d as any).horasSemCad !== undefined) setHorasSemCad((d as any).horasSemCad)
    if ((d as any).margemCad !== undefined) setMargemCad((d as any).margemCad)
    if ((d as any).aluguelAtualCad !== undefined) setAluguelAtualCad((d as any).aluguelAtualCad)
    if (d.mTotal !== undefined) setMTotal(d.mTotal)
    if (d.fatMinM2 !== undefined) setFatMinM2(d.fatMinM2)
    if (d.mSala !== undefined) setMSala(d.mSala)
  }

  // ── Calcular Serviços + Custo de Produto: dados GLOBAIS (não mudam com o mês) ──
  const globalCarregado = useRef(false)
  function aplicarGlobais(d: any) {
    if (!d) return
    if (Array.isArray(d.servicos) && d.servicos.length) {
      setServicos(d.servicos)
      setProxServ(Math.max(...d.servicos.map((x:any)=>Number(x.id)||0)) + 1)
    }
    if (Array.isArray(d.servicosProd) && d.servicosProd.length) {
      setServicoProd(d.servicosProd)
      setProxSP(Math.max(...d.servicosProd.map((x:any)=>Number(x.id)||0)) + 1)
    }
    if (d.taxaCartao !== undefined) setTaxaCartao(d.taxaCartao)
    if (d.abatProd !== undefined) setAbatProd(d.abatProd)
    if (d.custOpServ !== undefined) setCustOpServ(d.custOpServ)
    if (d.taxaAntesRateio !== undefined) setTaxaAntesRateio(d.taxaAntesRateio)
    if (d.prodAntesRateio !== undefined) setProdAntesRateio(d.prodAntesRateio)
    if (d.salaoParceiro !== undefined) setSalaoParceiro(d.salaoParceiro)
    if (d.metaLucroServ !== undefined) setMetaLucroServ(d.metaLucroServ)
    if (d.modoCustoOp) setModoCustoOp(d.modoCustoOp)
  }
  useEffect(() => {
    fetch('/api/salon/grid?chave=calc_servicos_global', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(async (g: any) => {
        if (g) { aplicarGlobais(g); return }
        // Migração: primeira vez sem dado global — herda o que estava salvo no mês atual
        const r = await fetch(`/api/salon/calculadora?ano=${hoje.getFullYear()}&mes=${hoje.getMonth()+1}`, { credentials: 'include' })
          .then(x => x.ok ? x.json() : null).catch(() => null)
        if (r?.dados) aplicarGlobais(r.dados)
      })
      .catch(() => {})
      .finally(() => { globalCarregado.current = true })
  }, [])
  // Auto-save (com debounce) sempre que algo das duas abas mudar
  useEffect(() => {
    if (!globalCarregado.current) return
    const t = setTimeout(() => {
      fetch('/api/salon/grid', {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: 'calc_servicos_global', doc: {
          servicos, servicosProd, taxaCartao, abatProd, custOpServ,
          taxaAntesRateio, prodAntesRateio, salaoParceiro, metaLucroServ, modoCustoOp,
        }}),
      }).catch(() => {})
    }, 1200)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicos, servicosProd, taxaCartao, abatProd, custOpServ, taxaAntesRateio, prodAntesRateio, salaoParceiro, metaLucroServ, modoCustoOp])

  // Carrega os profissionais cadastrados (usado no seletor da observação)
  useEffect(() => {
    fetch('/api/profissionais?ativo=true&leve=1', { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then((lista:any) => {
        if (!Array.isArray(lista)) return
        const profs = lista
          .filter((p:any) => !p.is_departamento)
          .map((p:any) => ({ id: String(p.id), nome: (p.apelido || p.nome_completo || '').trim() }))
          .filter((p:any) => p.nome)
        setProfsLista(profs)
      })
      .catch(() => {})
  }, [])

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

          // Pré-preenche faturamento com média dos últimos 12 meses com dados
          const comFat = d.historico
            .filter((h:any) => (parseFloat(h.dados?.fat||'0')||0) > 0)
            .sort((a:any,b:any) => b.ano!==a.ano ? b.ano-a.ano : b.mes-a.mes)
            .slice(0, 12)
          if (comFat.length > 0) {
            const somaFat = comFat.reduce((s:number, h:any) => s + (parseFloat(h.dados?.fat||'0')||0), 0)
            const mediaFat = Math.round(somaFat / comFat.length)
            setMediaFat12(mediaFat)
          }
        }
      })
      .catch(() => {})
  }, [])

  // Faturamento médio REAL dos últimos 12 meses (a partir do mês anterior),
  // usando os dados de faturamento já importados. Pré-preenche o campo se vazio.
  useEffect(() => {
    fetch('/api/relatorios').then(r => r.ok ? r.json() : null).then((d: any) => {
      const rm: any[] = d?.resumo_mensal || []
      if (!rm.length) return
      const now = new Date()
      const curKey = now.getFullYear() * 100 + (now.getMonth() + 1) // exclui o mês atual (em curso)
      const meses = rm
        .filter(r => (r.ano * 100 + r.mes) < curKey && (Number(r.faturamento_total) || 0) > 0)
        .sort((a, b) => (b.ano * 100 + b.mes) - (a.ano * 100 + a.mes))
        .slice(0, 12)
      if (!meses.length) return
      const soma = meses.reduce((s, r) => s + (Number(r.faturamento_total) || 0), 0)
      const media = Math.round(soma / meses.length)
      if (media > 0) {
        setMediaFat12(media)
        setFat(prev => (prev && prev !== '0') ? prev : String(media)) // pré-preenche só se vazio
      }
    }).catch(() => {})
  }, [])

  // Carrega mês selecionado.
  // Como trocar de mês agora é instantâneo, dá pra clicar várias vezes seguidas
  // e as respostas voltarem fora de ordem. Cada pedido leva um número; só o
  // ÚLTIMO pode escrever na tela — senão o mês de agosto acabaria mostrando os
  // números de junho só porque junho demorou mais pra responder.
  const pedidoMes = useRef(0)
  useEffect(() => {
    const meu = ++pedidoMes.current
    setCarregando(true)
    setAnaliseIA(''); setErroIA('')
    fetch(`/api/salon/calculadora?ano=${anoSel}&mes=${mesSel}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (meu !== pedidoMes.current) return   // resposta atrasada: já pediram outro mês
        // Mês SEM nada salvo tem que limpar a tela. Antes ficava com os números
        // do mês anterior — parecia que a troca de mês não tinha funcionado e,
        // pior, um Salvar copiava o mês velho pro mês novo.
        aplicarDados((d?.dados && typeof d.dados === 'object') ? d.dados : (MES_VAZIO as any))
        setDirtyCalc(false)   // carregar não é edição do usuário
      })
      .catch(() => {})
      .finally(() => { if (meu === pedidoMes.current) setCarregando(false) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anoSel, mesSel])

  // Salva UM periodo especifico com os dados que recebeu. Nao usa anoSel/mesSel:
  // quem chama passa o mes -- e por isso da pra salvar o mes que esta saindo
  // DEPOIS que a tela ja trocou, sem risco de gravar no mes errado.
  async function salvarPeriodo(ano: number, mes: number, dados: any, silencioso: boolean): Promise<boolean> {
    try {
      const res = await fetch('/api/salon/calculadora', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ano, mes, dados }),
      })
      if (res.ok) {
        setFalhaSalvar(''); setPendenteFalho(null)
        setMesesComDados(prev => {
          const existe = prev.some(m=>m.ano===ano&&m.mes===mes)
          return existe ? prev : [...prev, {ano,mes}]
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
        return true
      } else {
        const e = await res.json().catch(() => ({} as any))
        const msg = e?.error || 'Não foi possível salvar. Tente novamente.'
        setFalhaSalvar(msg); setPendenteFalho({ ano, mes, dados })
        if (!silencioso) alert(msg)
        return false
      }
    } catch {
      setFalhaSalvar('Sem conexão com o servidor.')
      setPendenteFalho({ ano, mes, dados })
      if (!silencioso) alert('Erro de conexão ao salvar. Verifique a internet e tente novamente.')
      return false
    }
  }

  // Salva o mes que esta na tela (botao Salvar e auto-save)
  async function salvarMes(silencioso = false): Promise<boolean> {
    if (!silencioso) { setSalvando(true); setSavedMsg('') }
    const ok = await salvarPeriodo(anoSel, mesSel, coletarDados(), silencioso)
    if (ok) {
      setDirtyCalc(false)
      if (!silencioso) { setSavedMsg('Salvo!'); setTimeout(() => setSavedMsg(''), 3000) }
    }
    if (!silencioso) setSalvando(false)
    return ok
  }

  // Reenvia o que ficou pra tras quando o salvamento falhou
  async function reenviarPendente() {
    const pend = pendenteFalho
    if (!pend) return
    setSalvando(true)
    await salvarPeriodo(pend.ano, pend.mes, pend.dados, false)
    setSalvando(false)
  }

  // ── Abre o modal de parcelamento já com N linhas ──
  function abrirParcelamento() {
    setParcDespesa(''); setParcObs(''); setParcLinhas([{ valor: '', venc: '', cod: '' }])
    setParcQtd('1'); setParcData(''); setParcPago(false); setParcPix(''); setParcAberto(true)
  }
  function setParcN(qtd: number) {
    const q = Math.max(1, Math.min(48, qtd || 1))
    setParcLinhas(prev => {
      const arr = [...prev]
      while (arr.length < q) arr.push({ valor: '', venc: '', cod: '' })
      return arr.slice(0, q)
    })
  }

  // Empréstimo pede "de quem é" — mesmo seletor de profissional da lista
  const ehEmprestimoParc = /empr[eé]stimo/i.test(parcDespesa)

  // ── Aplica o que foi lido do código de barras na linha que pediu a leitura ──
  function aplicarLeitura(b: BoletoLido) {
    const alvo = leitorAlvo
    setLeitorAlvo(null)
    if (!alvo) return
    const valor = b.valor == null ? null : b.valor.toFixed(2)

    // ── Leitura pedida pelo campo de PIX ──────────────────────────────────
    // QR de Pix vira a chave (copia-e-cola). Se a pessoa apontar num boleto
    // por engano, não perde a leitura: manda pro código da 1ª parcela.
    if (alvo.lista === 'pixmodal') {
      if (b.tipo === 'pix') {
        setParcPix(b.linha)
        if (valor) setParcLinhas(prev => prev.map((l, i) => i === 0 && !l.valor ? { ...l, valor } : l))
      } else {
        setParcLinhas(prev => prev.map((l, i) => i !== 0 ? l : { valor: valor ?? l.valor, venc: b.venc || l.venc, cod: b.linha || l.cod }))
      }
      return
    }
    if (alvo.lista === 'pixlinha') {
      setExtrasDespInd(prev => prev.map((d, i) => i !== alvo.idx ? d : (
        b.tipo === 'pix' ? { ...d, pix: b.linha } : { ...d, valor: valor ?? d.valor, venc: b.venc || d.venc || '', cod: b.linha || d.cod || '' }
      )))
      setDirtyCalc(true)
      return
    }

    if (alvo.lista === 'parc') {
      setParcLinhas(prev => prev.map((l, i) => i !== alvo.idx ? l : {
        valor: valor ?? l.valor, venc: b.venc || l.venc, cod: b.linha || l.cod,
      }))
      return
    }
    const aplica = (d: DespesaItem): DespesaItem => ({
      ...d, valor: valor ?? d.valor, venc: b.venc || d.venc || '', cod: b.linha || d.cod || '',
    })
    if (alvo.lista === 'fix') setDespInd(prev => prev.map((d, i) => i === alvo.idx ? aplica(d) : d))
    else setExtrasDespInd(prev => prev.map((d, i) => i === alvo.idx ? aplica(d) : d))
    setDirtyCalc(true)
  }

  // ── Lança a despesa parcelada: cada parcela vai pro mês do seu vencimento ──
  // (soma ao que já existe no mês — nunca apaga). Salva tudo de uma vez.
  async function lancarParcelamento(abrirProximo = false) {
    const nome = parcDespesa.trim()
    const linhas = parcLinhas.filter(l => l.valor.trim() && l.venc)
    if (!nome) { alert('Escolha a despesa do catálogo.'); return }
    if (linhas.length === 0) { alert('Preencha valor e vencimento de pelo menos uma parcela.'); return }
    const N = linhas.length
    const grupo = `parc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const obs = parcObs.trim()

    const resumo = linhas.map((l, i) => {
      const [y, m] = l.venc.split('-').map(Number)
      return `• ${MESES_NOMES[m]}/${String(y).slice(2)} — R$ ${l.valor}  (${i + 1}/${N})`
    }).join('\n')
    // Todo boleto deve ter código de barras — avisa antes de deixar passar sem.
    // Se já está pago, não tem o que copiar depois: não enche o saco.
    const semCod = parcPago ? 0 : linhas.filter(l => !l.cod?.trim()).length
    const aviso = semCod > 0
      ? `\n\n⚠️ ${semCod} de ${N} parcela(s) SEM código de barras. Sem o código, o Financeiro não vai ter o que copiar pra pagar no banco.`
      : ''
    if (!confirm(`Lançar "${nome}" em ${N}x?\n\n${resumo}${aviso}\n\nCada parcela é SOMADA ao mês (nada é apagado) e já fica salva. Confirmar?`)) return

    setParcSalvando(true)
    try {
      // Agrupa parcelas por mês (caso caia mais de uma no mesmo mês)
      const porMes = new Map<string, { ano: number; mes: number; itens: DespesaItem[] }>()
      linhas.forEach((l, i) => {
        const [y, m] = l.venc.split('-').map(Number)
        const key = `${y}-${m}`
        if (!porMes.has(key)) porMes.set(key, { ano: y, mes: m, itens: [] })
        // data (quinzena): o que você preencheu ou, se vazio, o vencimento da parcela
        const dataQuinzena = parcData ? isoParaBR(parcData) : isoParaBR(l.venc)
        porMes.get(key)!.itens.push({ nome, valor: l.valor, dica: '', parcela: `${i + 1}/${N}`, obs, grupo, venc: l.venc, cod: l.cod || '', data: dataQuinzena, pix: parcPix.trim() })
      })

      for (const { ano, mes, itens } of porMes.values()) {
        if (ano === anoSel && mes === mesSel) {
          // Mês atual: soma no formulário aberto e salva o mês inteiro
          const base = coletarDados()
          const novo = { ...base, extrasDespInd: [...base.extrasDespInd, ...itens.map(it => ({ nome: it.nome, valor: it.valor, parcela: it.parcela || '', obs: it.obs || '', grupo: it.grupo || '', venc: it.venc || '', cod: it.cod || '', data: it.data || '', pix: it.pix || '' })) ] }
          await fetch('/api/salon/calculadora', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ano, mes, dados: novo }) })
          setExtrasDespInd(prev => [...prev, ...itens])
          setDirtyCalc(false)
        } else {
          // Outro mês: carrega o que já existe, SOMA e salva
          const r = await fetch(`/api/salon/calculadora?ano=${ano}&mes=${mes}`, { credentials: 'include' }).then(x => x.ok ? x.json() : { dados: null }).catch(() => ({ dados: null }))
          const base = (r?.dados && typeof r.dados === 'object') ? r.dados : {}
          const extras = Array.isArray(base.extrasDespInd) ? base.extrasDespInd : []
          const novo = { ...base, extrasDespInd: [...extras, ...itens.map(it => ({ nome: it.nome, valor: it.valor, parcela: it.parcela || '', obs: it.obs || '', grupo: it.grupo || '', venc: it.venc || '', cod: it.cod || '', data: it.data || '', pix: it.pix || '' })) ] }
          await fetch('/api/salon/calculadora', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ano, mes, dados: novo }) })
          setMesesComDados(prev => prev.some(mm => mm.ano === ano && mm.mes === mes) ? prev : [...prev, { ano, mes }])
        }
      }
      // "Já pago": acha o que acabou de ser lançado pelo GRUPO (id único deste
      // lançamento) e dá baixa. Assim a conta nasce direto na aba Pagos do
      // Financeiro, em vez de entrar na fila a pagar.
      let baixados = 0
      if (parcPago) {
        try {
          const lista = await fetch('/api/salon/boletos', { credentials: 'include' }).then(r => r.ok ? r.json() : null)
          const meus = (lista?.boletos || []).filter((b: any) => b.grupo === grupo)
          for (const b of meus) {
            const r = await fetch('/api/salon/boletos', {
              method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key: b.key, pago: true }),
            })
            if (r.ok) baixados++
          }
          if (!meus.length) alert('Lancei e salvei, mas não consegui marcar como pago automaticamente. Marque na fila do FINANCEIRO.')
        } catch {
          alert('Lancei e salvei, mas falhou marcar como pago. Marque na fila do FINANCEIRO.')
        }
      }

      if (abrirProximo) {
        // Limpa o formulário e mantém aberto, pra lançar vários seguidos.
        // O "já pago" continua marcado de propósito: quem lança compra paga
        // costuma lançar várias na sequência.
        setParcDespesa(''); setParcObs(''); setParcLinhas([{ valor: '', venc: '', cod: '' }]); setParcPix('')
      } else {
        setParcAberto(false)
      }
      setSavedMsg(parcPago && baixados > 0
        ? `${nome}: ${N} lançada(s) e já marcada(s) como PAGA(S)!`
        : `${nome}: ${N} parcela(s) lançada(s) e salva(s)!`)
      setTimeout(() => setSavedMsg(''), 4000)
    } catch {
      alert('Erro ao lançar as parcelas. Tente novamente.')
    } finally { setParcSalvando(false) }
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

  // ── Trocar de período ──────────────────────────────────────────────────────
  // Com auto-save ligado, perguntar "quer perder as alterações?" era pior que
  // inútil: se o salvamento falhava, o dirty ficava preso e a pergunta voltava
  // sempre, deixando o usuário travado no mês. Agora SALVA o mês atual antes de
  // sair; só pergunta se o salvamento falhar de verdade -- aí a escolha é real.
  // NAO e async de proposito: a troca tem que ser instantanea. O mes que esta
  // saindo e salvo em segundo plano, com os dados capturados AGORA -- esperar a
  // resposta da rede fazia a tela ficar parada e dava impressao de travamento.
  // Se esse salvamento falhar, o payload fica guardado em pendenteFalho e o
  // aviso na barra oferece "tentar de novo": nada se perde em silencio.
  function trocarPeriodo(novoAno: number, novoMes: number) {
    if (novoAno === anoSel && novoMes === mesSel) return
    if (dirtyCalc) { void salvarPeriodo(anoSel, mesSel, coletarDados(), true) }
    setDirtyCalc(false)
    setAnoSel(novoAno); setMesSel(novoMes)
  }
  function mesAnterior() {
    if (mesSel === 1) trocarPeriodo(anoSel - 1, 12)
    else trocarPeriodo(anoSel, mesSel - 1)
  }
  function mesProximo() {
    if (mesSel === 12) trocarPeriodo(anoSel + 1, 1)
    else trocarPeriodo(anoSel, mesSel + 1)
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

    // Fórmula da planilha FERRAMENTA FINANCEIRA DV (e do site com as flags desligadas):
    // Rateio R$ = (Preço - Cartão R$) × Rateio% - (Produto × Abatimento%)
    // O cartão é abatido da BASE antes de aplicar o %, e o produto é abatido do
    // rateio já calculado. Ex. planilha: (100-5)×50% - 10 = 37,50.
    // Com as flags desligadas: Rateio = Preço × Rateio% (igual ao site de precificação).
    const baseRateio = (preco - (taxaAntesRateio ? preco * taxC : 0)) * rP
    const abatProdR  = prodAntesRateio  ? prod * abat : 0
    const rateioR    = baseRateio - abatProdR

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
  // rP' = rateio efetivo (com cartão abatido da base, se flag ativa)
  // K = 1 - rP' - taxC - imp_eff - custOpPct   (coef. de preço no resultado)
  // F = prod × [1 - abat×(1-imp)]               (custo fixo do produto)
  function calcPrecoMinimo(s: Servico, targetLucro: number) {
    const rP   = n(s.rateioP) / 100
    const prod = n(s.produto)
    const imp  = n(s.imposto) / 100
    const taxC = n(taxaCartao) / 100
    const abat = prodAntesRateio ? n(abatProd) / 100 : 0
    const co   = custOpServN

    // Rateio efetivo sobre o preço (cartão abatido da base antes do %, se flag ativa)
    const rPEff = taxaAntesRateio ? rP * (1 - taxC) : rP
    // Coeficiente de P no resultado
    const K = 1 - rPEff - taxC - (salaoParceiro ? (1 - rPEff) * imp : imp) - co
    // Custo fixo (produto - parte do abatimento que gera custo fixo)
    const F = salaoParceiro ? prod * (1 - abat * (1 - imp)) : prod * (1 - abat)

    if (K - targetLucro <= 0) return null
    return F / (K - targetLucro)
  }

  // Recomendações de comissão (Diagnóstico por serviço, com meta de lucro por atendimento)
  // Opção A: comissão máxima em R$ no preço atual para atingir a meta
  // Opção B: novo preço mantendo a comissão do profissional fixa em R$
  function calcRecom(s: Servico) {
    const c = calcServ(s)
    if (!c) return null
    const preco = c.preco
    const prod  = n(s.produto)
    const imp   = n(s.imposto) / 100
    const taxC  = n(taxaCartao) / 100
    const abat  = prodAntesRateio ? n(abatProd) / 100 : 0
    const co    = custOpServN
    const meta  = Math.min(0.5, Math.max(0, n(metaLucroServ) / 100))
    const den   = 1 - taxC - imp - co - meta   // coeficiente comum às duas opções
    if (den <= 0) return { c, meta, impossivel: true } as any

    // Opção A — comissão máxima (R$) mantendo o preço atual:
    // resultado = preço − R − prod − cartão − imposto − custoOp = meta×preço
    const numA = preco * den - prod
    const comMaxR = salaoParceiro ? numA / (1 - imp) : numA
    // % equivalente para digitar no campo Rateio (inverte a fórmula do rateio)
    const baseRateioPct = preco * (1 - (taxaAntesRateio ? taxC : 0))
    const comMaxPctCampo = baseRateioPct > 0 ? (comMaxR + prod * abat) / baseRateioPct : 0
    const comMaxPctPreco = preco > 0 ? comMaxR / preco : 0

    // Opção B — novo preço mantendo a comissão atual em R$ (C = rateio atual)
    const C = c.rateioR
    const novoPreco = (prod + C * (salaoParceiro ? (1 - imp) : 1)) / den
    const lucroB = meta * novoPreco
    const comPctEqB = novoPreco > 0 ? C / novoPreco : 0
    const novoRateioPctCampo = novoPreco > 0
      ? (C + prod * abat) / (novoPreco * (1 - (taxaAntesRateio ? taxC : 0)))
      : 0
    const aumento = preco > 0 ? novoPreco / preco - 1 : 0
    // Sugestão de arredondamento (dezena abaixo) com lucro real recalculado
    const arred = Math.floor(novoPreco / 10) * 10
    let lucroArred = 0, pctArred = 0
    if (arred > 0 && arred !== Math.round(novoPreco)) {
      const impArred = salaoParceiro ? (arred - C) * imp : arred * imp
      lucroArred = arred - C - prod - arred * taxC - impArred - arred * co
      pctArred = lucroArred / arred
    }

    return { c, meta, impossivel: false, lucroAlvoAtual: meta * preco,
      comMaxR, comMaxPctCampo, comMaxPctPreco,
      C, novoPreco, lucroB, comPctEqB, novoRateioPctCampo, aumento,
      arred, lucroArred, pctArred }
  }

  function custoIngred(i: Ingrediente): number {
    const emb = n(i.qtdEmb), usa = n(i.qtdUsa), prec = n(i.preco)
    return emb > 0 ? (prec / emb) * usa : 0
  }

  // ── Aluguel de Cadeira (base de cálculo idêntica à calc dos criadores) ─────
  // Interface enxuta: um único valor de custo operacional total (não itemiza).
  const custoOpCadN = n(custoOpCad) || custoOp
  // Postos: brutos (soma simples) e efetivos (com pesos, igual à referência)
  const rawPostosCad  = n(cadCabel) + n(cadManic) + n(cadEstet) + n(cadMaqui)
  const efetPostosCad = n(cadCabel) * 1.0 + n(cadManic) * 0.5 + n(cadEstet) * 1.0 + n(cadMaqui) * 0.5
  // Fallback legado: meses salvos antes desta mudança só têm "numCad" (sem peso)
  const nCadeirasCad = efetPostosCad > 0 ? efetPostosCad : n(numCad)
  const custPorCad  = nCadeirasCad > 0 ? custoOpCadN / nCadeirasCad : 0   // custo base por cadeira (ponto de equilíbrio)
  const margemCadN  = Math.min(0.55, Math.max(0.25, (n(margemCad) || 35) / 100)) // margem 25%–55%
  const CAD_DEPREC  = 0.05  // taxa depreciação (5%)
  const CAD_VACANC  = 0.30  // taxa vacância (30%)
  const CAD_TAXAS   = 1 + CAD_DEPREC + CAD_VACANC  // multiplicador das taxas (1,35)
  const horasMesCad = (n(horasSemCad) || 40) * 4.3
  const custoHoraCad = (nCadeirasCad > 0 && horasMesCad > 0) ? custoOpCadN / (nCadeirasCad * horasMesCad) : 0
  const precoBaseCad = custPorCad / (1 - margemCadN)            // preço com margem sobre o preço
  const alugSuger    = precoBaseCad * CAD_TAXAS                 // Aluguel Limpo Sugerido (mensal)
  const precoHoraCad = (custoHoraCad / (1 - margemCadN)) * CAD_TAXAS  // preço por hora com margem + taxas
  const diariaCad    = precoHoraCad * 8                         // diária (8h)
  const aluguelAtualCadN = n(aluguelAtualCad)

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

  const todasDespesas = (() => {
    const linhas = [
      ...despInd.filter(d => n(d.valor) > 0).map(d => ({nome: d.nome, valor: n(d.valor), tipo: 'indireta'})),
      ...extrasDespInd.filter(d => n(d.valor) > 0).map(d => ({nome: d.nome, valor: n(d.valor), tipo: 'indireta'})),
      {nome: '13º Salário', valor: n(sal13), tipo: 'provisao'},
      {nome: 'Férias', valor: n(ferias), tipo: 'provisao'},
      {nome: 'FGTS Rescisório', valor: n(fgtsR), tipo: 'provisao'},
      {nome: 'Imposto', valor: n(imposto), tipo: 'direta'},
      {nome: 'Produto/Insumo', valor: n(produto), tipo: 'direta'},
      {nome: 'Rateio/Comissão', valor: n(rateio), tipo: 'direta'},
      {nome: 'Taxa de Cartão', valor: n(taxaC), tipo: 'direta'},
    ].filter(d => d.valor > 0)

    // Junta pelo nome ignorando maiuscula/acento: "Keune" e "KEUNE" sao a mesma
    // despesa. Guarda `qtd` pra tela poder dizer de quantos lancamentos veio.
    const chave = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    const mapa = new Map<string, {nome: string, valor: number, tipo: string, qtd: number}>()
    for (const l of linhas) {
      const k = chave(l.nome)
      const at = mapa.get(k)
      if (at) { at.valor += l.valor; at.qtd += 1 }
      else mapa.set(k, { nome: l.nome, valor: l.valor, tipo: l.tipo, qtd: 1 })
    }
    return Array.from(mapa.values()).sort((a, b) => b.valor - a.valor)
  })()

  const maxDespesa = todasDespesas[0]?.valor || 1
  const totalDespesasRank = todasDespesas.reduce((s, d) => s + d.valor, 0)

  function semaforoDespesa(nome: string, valor: number): {cor: string, label: string, icone: string} {
    const bench = BENCHMARKS[nome]
    if (!bench || !fatN) return {cor: '#767069', label: 'Sem benchmark', icone: '⚪'}
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

  // Marca o mês como não salvo a cada digitação — MENOS quando vem de <select>.
  // O select dispara 'input' ANTES do 'change'. Esse setState re-renderizava a
  // página no meio do caminho e o React, por ser campo controlado, devolvia o
  // select ao valor antigo; o 'change' então lia o valor velho e a escolha não
  // valia. Era o "preciso clicar duas vezes" em mês, ano, aba e despesa — e na
  // segunda vez funcionava só porque o dirty já era true e não re-renderizava.
  // Nenhum select desta tela depende daqui: os que editam dados do mês marcam
  // o dirty no próprio onChange.
  function marcarDigitacao(e: React.FormEvent) {
    if ((e.target as HTMLElement)?.tagName !== 'SELECT') setDirtyCalc(true)
  }

  // Até montar no navegador, servidor e cliente desenham exatamente isto —
  // sem data, sem divergência, sem árvore descartada. (ver nota em `montado`)
  if (!montado) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#f5f4f0'}}>
      <Loader2 size={26} className="animate-spin" style={{color:'#5b4fcf'}}/>
    </div>
  )

  return (
    <div className="min-h-screen nodri-sem-whats" style={{background:'#f5f4f0',color:'#1a1a1a'}}
      onInput={marcarDigitacao}>
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <a href="/salon" className="p-2 rounded-lg hover:bg-white/5" style={{color:'#767069'}}><ArrowLeft size={18}/></a>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-[#1a1a1a] flex items-center gap-2">
              <Calculator size={22} style={{color:'#5b4fcf'}}/>Calculadoras do Salão
            </h1>
            <p className="text-xs mt-0.5 nodri-sub-tela" style={{color:'#767069'}}>
              Metodologia profissional de gestão financeira — dados interligados entre as calculadoras
            </p>
          </div>
        </div>

        {/* Seletor de mês + Salvar */}
        <div className="nodri-periodo flex items-center gap-3 mb-6 p-3 rounded-xl border" style={{background:'#faf9f7',borderColor:'#e8e6e0'}}>
          <History size={15} style={{color:'#5b4fcf',flexShrink:0}}/>
          <span className="text-xs font-bold" style={{color:'#767069'}}>Período:</span>

          {/* Navegação mês */}
          <div className="flex items-center gap-1">
            <button onClick={mesAnterior} className="p-1 rounded hover:bg-white/5" style={{color:'#767069'}}><ChevronLeft size={14}/></button>
            <div className="flex items-center gap-1">
              <select value={mesSel} onChange={e=>trocarPeriodo(anoSel, Number(e.target.value))}
                className="text-xs font-bold px-2 py-1 rounded-lg focus:outline-none"
                style={{background:'#f5f4f0',color:'#1a1a1a',border:'1px solid #dedad4'}}>
                {MESES_NOMES.slice(1).map((nome,i)=>{
                  const m=i+1; const temDados=mesesComDados.some(x=>x.ano===anoSel&&x.mes===m)
                  return <option key={m} value={m}>{nome}{temDados?' ●':''}</option>
                })}
              </select>
              <select value={anoSel} onChange={e=>trocarPeriodo(Number(e.target.value), mesSel)}
                className="text-xs font-bold px-2 py-1 rounded-lg focus:outline-none"
                style={{background:'#f5f4f0',color:'#1a1a1a',border:'1px solid #dedad4'}}>
                {[anoSel-1,anoSel,anoSel+1].map(a=><option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <button onClick={mesProximo} className="p-1 rounded hover:bg-white/5" style={{color:'#767069'}}><ChevronRight size={14}/></button>
          </div>

          {carregando && <Loader2 size={13} className="animate-spin" style={{color:'#5b4fcf'}}/>}

          {/* Indicadores de meses salvos */}
          {mesesComDados.length > 0 && (
            <div className="flex-1 flex items-center gap-1 overflow-x-auto">
              {mesesComDados.slice(0,6).map(m=>(
                <button key={`${m.ano}-${m.mes}`}
                  onClick={()=>trocarPeriodo(m.ano, m.mes)}
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
            {savedMsg && <span className="text-xs flex items-center gap-1" style={{color:'#059669'}}><CheckCircle size={12}/>{savedMsg}</span>}
            {/* Salvamento falhando não pode mais passar despercebido: o auto-save
                é silencioso e, sem este selo, o mês inteiro podia ficar sem
                gravar sem ninguém notar. */}
            {!!falhaSalvar && (
              <button onClick={reenviarPendente} disabled={salvando || !pendenteFalho}
                className="text-[10px] font-bold flex items-center gap-1 px-2 py-1 rounded-lg"
                style={{background:'#fef2f2',color:'#b91c1c',border:'1px solid #fca5a5',cursor:pendenteFalho?'pointer':'default'}}
                title={falhaSalvar}>
                <AlertTriangle size={11}/>
                {pendenteFalho
                  ? `não salvou ${MESES_NOMES[pendenteFalho.mes]} — tentar de novo`
                  : 'não salvou'}
              </button>
            )}
            <button onClick={() => salvarMes()} disabled={salvando}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
              style={{background:'#5b4fcf',color:'white'}}>
              {salvando ? <Loader2 size={12} className="animate-spin"/> : <Save size={12}/>}
              <span className="no-mobile">Salvar {MESES_NOMES[mesSel]}</span>
              <span className="nodri-mob-only">Salvar</span>
            </button>
          </div>
        </div>

        {/* Abas — lista suspensa no celular */}
        <select value={aba} onChange={e=>setAba(e.target.value as any)}
          className="sm:hidden w-full mb-4 px-3 py-2.5 rounded-lg text-sm font-semibold text-[#1a1a1a]" style={{background:'#fff',border:'1px solid #dedad4',...oculto(verAbasExtras)}}>
          {ABAS.map(a=><option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
        {/* Abas (desktop) */}
        <div className="hidden sm:flex gap-1 mb-6 p-1 rounded-xl overflow-x-auto" style={{background:'#faf9f7',...oculto(verAbasExtras)}}>
          {ABAS.map(a=>(
            <button key={a.id} onClick={()=>setAba(a.id as any)}
              className="flex-shrink-0 py-2 px-2 sm:px-1 rounded-lg text-[10px] font-bold transition-all text-center min-w-[72px] sm:min-w-0 sm:flex-1"
              style={{background:aba===a.id?'#5b4fcf':'transparent',color:aba===a.id?'white':'#767069'}}>
              <div>{a.icon}</div><div className="mt-0.5 leading-tight">{a.label}</div>
            </button>
          ))}
        </div>

        {/* ════ ABA RECEITAS E DESPESAS ════ */}
        {aba==='rd' && (
          <div className="nodri-aba space-y-4">

            {/* Guia passo a passo */}
            <div className="rounded-2xl border overflow-hidden" style={{background:'#ffffff',borderColor:'#5b4fcf30',...oculto(podeCalc('calc_passos'))}}>
              <button onClick={()=>setSecPassos(p=>!p)} className="w-full flex items-center justify-between px-4 py-3 transition-colors" style={{background:'#ffffff'}}>
                <span className="text-xs font-bold flex items-center gap-2" style={{color:'#5b4fcf'}}>
                  {secPassos ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                  Como preencher
                </span>
                <span className="text-[10px] flex-shrink-0" style={{color:'#767069'}}>{secPassos?'fechar ✕':'abrir ▾'}</span>
              </button>
              {secPassos && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-4 pb-4">
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
                    <p className="text-[10px] font-bold mb-1" style={{color:p.ok?p.cor:'#767069'}}>Passo {p.n}: {p.titulo}</p>
                    <p className="text-[9px] leading-tight" style={{color:'#6b6860'}}>{p.desc}</p>
                  </div>
                ))}
              </div>
              )}
            </div>

            {/* Card configurações — recolhível (fechado por padrão), campos em coluna única */}
            <div className="rounded-2xl border overflow-hidden" style={{background:'#faf9f7',borderColor:'#5b4fcf40',...oculto(podeCalc('calc_config'))}}>
              <button onClick={()=>setSecConfigRD(p=>!p)} className="w-full flex items-center justify-between px-5 py-3 transition-colors"
                style={{background:'linear-gradient(135deg,#faf9f7,#efedfb)'}}>
                <div className="flex items-center gap-2 flex-wrap">
                  {secConfigRD ? <ChevronUp size={14} style={{color:'#5b4fcf'}}/> : <ChevronDown size={14} style={{color:'#5b4fcf'}}/>}
                  <span className="font-bold text-sm" style={{color:'#5b4fcf'}}>Configurações</span>
                  {fatN>0
                    ? <span className="text-[10px] px-2 py-0.5 rounded-full font-bold no-mobile" style={{background:'#5b4fcf',color:'#fff'}}>Faturamento {fmtR(fatN)} · Lucro {n(lucroD)||0}%</span>
                    : <AvisoDefault ativo={!fat||fat==='0'} padrao="não preenchido" onPreencher={()=>setSecConfigRD(true)} onManter={()=>{}}/>}
                </div>
                <span className="text-[10px] flex-shrink-0" style={{color:'#767069'}}>{secConfigRD?'fechar ✕':'abrir ▾'}</span>
              </button>
              {secConfigRD && (
              <div className="px-5 pb-6 pt-4 border-t" style={{borderColor:'#5b4fcf20'}}>
                <div className="max-w-xl mx-auto space-y-5">
                  {/* 1 — Faturamento */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{background:'#5b4fcf',color:'#fff'}}>1</span>
                      <label className="text-xs font-bold" style={{color:'#5b4fcf'}}>💰 Faturamento Mensal (R$)</label>
                      <InfoBtn id="faturamento"/>
                    </div>
                    <p className="text-xs mb-1.5 pl-7" style={{color:'#6b6860'}}>Quanto entra no caixa por mês. Pré-preenchido com a média real dos últimos 12 meses — pode editar.</p>
                    {mediaFat12 > 0 && !fat && (
                      <div className="flex items-center gap-2 mb-1.5 pl-7">
                        <span className="text-[10px]" style={{color:'#5b4fcf'}}>📊 Média calculada: <strong>R$ {mediaFat12.toLocaleString('pt-BR')}</strong></span>
                        <button onClick={()=>setFat(String(mediaFat12))}
                          className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                          style={{background:'#5b4fcf',color:'#fff'}}>Usar</button>
                      </div>
                    )}
                    <div className="relative pl-7">
                      <span className="absolute left-10 top-1/2 -translate-y-1/2 text-xs" style={{color:'#767069'}}>R$</span>
                      <input type="number" value={fat} onChange={e=>setFat(e.target.value)}
                        placeholder={mediaFat12 > 0 ? String(mediaFat12) : 'Ex: 50000'}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl text-[#1a1a1a] text-base font-bold focus:outline-none"
                        style={{background:'#fff',border:'1.5px solid #5b4fcf60'}}/>
                    </div>
                  </div>
                  {/* 2 — Custo Indireto / 3 — Lucro / 4 — Custo Direto (auto) */}
                  {[
                    {num:'2',l:'Custo Indireto Desejado (%)',v:custIndD,set:setCustIndD,c:'#f59e0b',dica:'Quanto no máximo você quer gastar com custos fixos. Recomendado: 30%.',auto:false,info:'custIndD'},
                    {num:'3',l:'Lucro Desejado (%)',v:lucroD,set:setLucroD,c:'#10b981',dica:'Quanto você quer que sobre de lucro no fim do mês. Recomendado: 15%.',auto:false,info:'lucroD'},
                    {num:'4',l:'Custo Direto Desejado (%)',v:custDirD,set:null,c:'#ef4444',dica:'O que sobra para comissões, produtos, imposto e cartão. Calculado automaticamente: 100% − Indireto − Lucro.',auto:true,info:'custDirD'},
                  ].map((f:any)=>(
                    <div key={f.l}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{background:f.c,color:'#fff'}}>{f.num}</span>
                        <label className="text-xs font-bold" style={{color:f.c}}>{f.l}</label>
                        {f.auto && <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold" style={{background:'#ef444425',color:'#ef4444'}}>= automático</span>}
                        <InfoBtn id={f.info}/>
                      </div>
                      <p className="text-xs mb-1.5 pl-7" style={{color:'#6b6860'}}>{f.dica}</p>
                      <div className="relative pl-7">
                        <input type="number" value={f.v} onChange={e=>f.set&&f.set(e.target.value)} readOnly={f.auto}
                          className="w-full pr-8 pl-3 py-2.5 rounded-xl text-sm font-bold text-[#1a1a1a] focus:outline-none"
                          style={{background:f.auto?'#f5f4f0':'#fff',border:`1.5px solid ${f.c}50`}}/>
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{color:'#767069'}}>%</span>
                      </div>
                    </div>
                  ))}
                  {/* 5 — Investimento Inicial */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{background:'#7c6fe0',color:'#fff'}}>5</span>
                      <label className="text-xs font-bold" style={{color:'#767069'}}>🏦 Investimento Inicial (R$)</label>
                      <InfoBtn id="invInicial"/>
                    </div>
                    <p className="text-xs mb-1.5 pl-7" style={{color:'#6b6860'}}>Tudo que você gastou para montar o salão.</p>
                    <div className="relative pl-7">
                      <span className="absolute left-10 top-1/2 -translate-y-1/2 text-xs" style={{color:'#767069'}}>R$</span>
                      <input type="number" value={invInicial} onChange={e=>setInvInicial(e.target.value)} placeholder="Ex: 100000"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl text-[#1a1a1a] text-sm font-bold focus:outline-none"
                        style={{background:'#fff',border:'1.5px solid #e8e6e0'}}/>
                    </div>
                  </div>
                  {/* 6 — Total a ser Depreciado */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{background:'#7c6fe0',color:'#fff'}}>6</span>
                      <label className="text-xs font-bold" style={{color:'#767069'}}>📉 Total a ser Depreciado (R$)</label>
                      <InfoBtn id="totalDeprec"/>
                    </div>
                    <p className="text-xs mb-1.5 pl-7" style={{color:'#6b6860'}}>
                      Equipamentos, móveis e reformas — dividido por 84 meses (7 anos)
                      {n(totalDeprec)>0 && <span style={{color:'#7c6fe0'}}> → {fmtR(depMensal)}/mês</span>}
                    </p>
                    <div className="relative pl-7">
                      <span className="absolute left-10 top-1/2 -translate-y-1/2 text-xs" style={{color:'#767069'}}>R$</span>
                      <input type="number" value={totalDeprec} onChange={e=>setTotalDeprec(e.target.value)} placeholder="Ex: 10000"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl text-[#1a1a1a] text-sm font-bold focus:outline-none"
                        style={{background:'#fff',border:'1.5px solid #e8e6e0'}}/>
                    </div>
                  </div>
                </div>
              </div>
              )}
            </div>

            {/* Despesas Indiretas */}
            <div className="rounded-2xl border overflow-hidden" style={{background: secIndiretas ? '#4a3728' : '#fffbf0',borderColor:'#f59e0b',...oculto(podeCalc('calc_desp_fixas'))}}>
              <button onClick={()=>setSecIndiretas(p=>!p)} className="nodri-cab-sec w-full flex items-center justify-between px-5 py-3 border-b transition-colors" style={{background:'linear-gradient(135deg,#fffbf0,#fef3c7)',borderColor:'#f59e0b'}}>
                <div className="flex items-center gap-2">
                  {secIndiretas ? <ChevronUp size={14} style={{color:'#b45309'}}/> : <ChevronDown size={14} style={{color:'#b45309'}}/>}
                  <span className="font-bold text-sm" style={{color:'#92400e'}}>Despesas Indiretas (Fixas)</span>
                  {totInd > 0 && <span className="text-xs px-2 py-0.5 rounded-full font-bold no-mobile" style={{background:'#f59e0b',color:'#fff'}}>{fmtR(totInd)}</span>}
                </div>
                <div className="nodri-cab-acoes flex items-center gap-2 flex-wrap justify-end" onClick={e=>e.stopPropagation()}>
                  {/* Lançar boleto fica AQUI (e não dentro da lista) pra você não
                      precisar abrir a lista inteira toda vez que for lançar. */}
                  <button onClick={abrirParcelamento}
                    className="nodri-btn-lancar flex items-center justify-center gap-2 rounded-xl font-extrabold"
                    style={{background:'linear-gradient(135deg,#5b4fcf,#7c3aed)',color:'#fff',border:'none',
                      fontSize:15,padding:'14px 22px',boxShadow:'0 4px 14px rgba(91,79,207,.35)'}}>
                    💳 Lançar boleto
                  </button>
                  <button onClick={()=>setShowCatDespesa(true)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                    style={{background:'#f59e0b20',color:'#b45309',border:'1px solid #f59e0b40'}}>
                    <Plus size={11}/> Gerenciar Catálogo
                  </button>
                  <span className="font-bold text-sm no-mobile" style={{color:'#b45309'}}>{fmtR(totInd)}</span>
                </div>
              </button>
              {!secIndiretas && (
                <div className="px-5 py-3 text-xs" style={{color:'#6b6860'}}>
                  Clique no cabeçalho para expandir e preencher as despesas fixas mensais.
                </div>
              )}
              {secIndiretas && <>
                {/* Cabeçalho colunas */}
                <div className="hidden sm:grid gap-2 px-5 py-2 text-[10px] font-bold uppercase tracking-wider border-b" style={{gridTemplateColumns:GRID_IND,color:'#f2d49c',borderColor:'#6b4f38',background:'#3d2d20'}}>
                  <div>Despesa</div>
                  <div className="text-center">Valor Mensal</div>
                  <div className="text-center">% Fat.</div>
                  <div className="text-center">Parcela</div>
                  <div className="text-center" title="Preenchendo o vencimento, a conta entra automaticamente na fila de boletos do setor FINANCEIRO.">📅 Vencimento</div>
                  <div/>
                </div>

                {/* Despesas fixas do catálogo padrão */}
                {despInd.map((d,i)=>{
                  const v=n(d.valor), pctV=fatN>0?(v/fatN*100):0
                  const cor=pctV>20?'#ef4444':pctV>10?'#f59e0b':'#10b981'
                  return(
                    <div key={i} className="grid linha-desp-mobile nodri-desp-card gap-2 px-5 py-2 items-center" style={{gridTemplateColumns:GRID_IND,borderBottom:'1px solid #f59e0b20',background: v>0 ? '#fffdf5' : '#fffefa'}}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold" onClick={()=>toggleNota('d'+i)}
                          style={{color:'#78350f',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:3}} title="Clique para abrir/fechar a observação">
                          <span style={{fontSize:8,color:'#b45309',transform:notasAbertas.has('d'+i)?'rotate(180deg)':'none',transition:'transform .15s'}}>▼</span>
                          {d.nome}
                        </span>
                        <InfoBtn id={d.nome==='Aluguel'?'aluguel':d.nome==='Energia Elétrica'?'energia':d.nome==='Água'?'agua':d.nome==='Contabilidade'?'contabilidade':''}/>
                        <button onClick={()=>toggleNota('d'+i)} title="Observação" className="no-mobile" style={{fontSize:11,lineHeight:1,padding:'1px 3px',border:'none',background:'transparent',cursor:'pointer',opacity:d.obs?1:0.45}}>📝</button>
                        {!notasAbertas.has('d'+i) && d.obs && (
                          <span onClick={()=>toggleNota('d'+i)} className="nodri-resumo-linha text-[9.5px]"
                            style={{color:'#9a7b3a',maxWidth:190,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',cursor:'pointer'}}>{d.obs}</span>
                        )}
                      </div>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px]" style={{color:'#b45309'}}>R$</span>
                        <input type="number" value={d.valor}
                          onChange={e=>{const nd=[...despInd];nd[i]={...nd[i],valor:e.target.value};setDespInd(nd)}}
                          placeholder="0"
                          className="w-full pl-6 pr-2 py-1.5 rounded-lg text-xs focus:outline-none"
                          style={{background:'#fff',border:`1.5px solid ${v>0?'#f59e0b':'#e8e6e0'}`,color:'#1a1a1a',fontWeight: v>0?600:400}}/>
                      </div>
                      <div className="text-xs text-center font-bold" style={{color:v>0?cor:'#dedad4'}}>
                        {v>0?`${pctV.toFixed(1)}%`:'—'}
                      </div>
                      <div>
                        <input value={d.parcela||''} onChange={e=>{const nd=[...despInd];nd[i]={...nd[i],parcela:e.target.value};setDespInd(nd)}}
                          placeholder="ex: 1/3" maxLength={5}
                          className={`w-full px-2 py-1.5 rounded-lg text-xs text-center focus:outline-none${d.parcela?'':' campo-vazio'}`}
                          style={{background:'#fff',border:'1.5px solid #e8e6e0',color:d.parcela?'#b45309':'#aaa',fontWeight:d.parcela?700:400}}/>
                      </div>
                      <CampoVenc valor={d.venc||''} onChange={val=>{const nd=[...despInd];nd[i]={...nd[i],venc:val};setDespInd(nd);setDirtyCalc(true)}}/>
                      <div className="flex justify-end">
                        <BtnCodigo tem={!!d.cod} onClick={()=>setLeitorAlvo({lista:'fix',idx:i})}/>
                      </div>
                      {notasAbertas.has('d'+i) && (
                        <ObsComProf valor={d.obs||''} profs={profsLista}
                          onChange={val=>{const nd=[...despInd];nd[i]={...nd[i],obs:val};setDespInd(nd)}}/>
                      )}
                      {d.cod && <LinhaCodigo cod={d.cod} onLimpar={()=>{const nd=[...despInd];nd[i]={...nd[i],cod:''};setDespInd(nd);setDirtyCalc(true)}}/>}
                    </div>
                  )
                })}

                {/* Extras do catálogo */}
                {extrasDespInd.map((d,i)=>{
                  const v=n(d.valor), pctV=fatN>0?(v/fatN*100):0
                  const cor=pctV>20?'#ef4444':pctV>10?'#f59e0b':'#10b981'
                  return(
                    <div key={i} className="grid linha-desp-mobile nodri-desp-card gap-2 px-5 py-2 items-center" style={{gridTemplateColumns:GRID_IND,borderBottom:'1px solid #f59e0b20',background:'#fffdf5'}}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Clicar no nome abre/fecha observação, profissional e data da
                            quinzena. A setinha existe pra deixar claro que é clicável. */}
                        <span className="text-xs font-semibold" onClick={()=>toggleNota('e'+i)}
                          style={{color:'#78350f',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:3}}
                          title="Clique para abrir/fechar observação, profissional e data">
                          <span style={{fontSize:8,color:'#b45309',transform:notasAbertas.has('e'+i)?'rotate(180deg)':'none',transition:'transform .15s'}}>▼</span>
                          {d.nome}
                        </span>
                        {/* no-mobile: selo e lápis somem no celular — repetiam em toda
                            linha e o nome já abre a observação ao ser clicado */}
                        {d.grupo
                          ? <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{background:'#dbeafe',color:'#1d4ed8'}}>💳 parcela {d.parcela}</span>
                          : <span className="no-mobile text-[9px] px-1.5 py-0.5 rounded-full" style={{background:'#f59e0b20',color:'#b45309'}}>catálogo</span>}
                        <button onClick={()=>toggleNota('e'+i)} title="Observação" className="no-mobile" style={{fontSize:11,lineHeight:1,padding:'1px 3px',border:'none',background:'transparent',cursor:'pointer',opacity:d.obs?1:0.45}}>📝</button>
                        {/* Fechado: mostra quem é e a data, sem ocupar linha */}
                        {!notasAbertas.has('e'+i) && (d.obs || d.data) && (
                          <span onClick={()=>toggleNota('e'+i)} className="nodri-resumo-linha text-[9.5px]"
                            style={{color:'#9a7b3a',maxWidth:190,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',cursor:'pointer'}}>
                            {[d.obs, d.data].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px]" style={{color:'#b45309'}}>R$</span>
                        <input type="number" value={d.valor} onChange={e=>{const nd=[...extrasDespInd];nd[i]={...nd[i],valor:e.target.value};setExtrasDespInd(nd)}}
                          placeholder="0"
                          className="w-full pl-6 pr-2 py-1.5 rounded-lg text-xs focus:outline-none"
                          style={{background:'#fff',border:`1.5px solid ${v>0?'#f59e0b':'#e8e6e0'}`,color:'#1a1a1a',fontWeight:v>0?600:400}}/>
                      </div>
                      <div className="text-xs text-center font-bold" style={{color:v>0?cor:'#dedad4'}}>
                        {v>0?`${pctV.toFixed(1)}%`:'—'}
                      </div>
                      <div>
                        <input value={d.parcela||''} onChange={e=>{const nd=[...extrasDespInd];nd[i]={...nd[i],parcela:e.target.value};setExtrasDespInd(nd)}}
                          placeholder="1/3" maxLength={5}
                          className={`w-full px-2 py-1.5 rounded-lg text-xs text-center focus:outline-none${d.parcela?'':' campo-vazio'}`}
                          style={{background:'#fff',border:'1.5px solid #e8e6e0',color:d.parcela?'#b45309':'#aaa',fontWeight:d.parcela?700:400}}/>
                      </div>
                      <CampoVenc valor={d.venc||''} onChange={val=>{const nd=[...extrasDespInd];nd[i]={...nd[i],venc:val};setExtrasDespInd(nd);setDirtyCalc(true)}}/>
                      <div className="flex justify-end items-center gap-1">
                        <BtnCodigo tem={!!d.cod} onClick={()=>setLeitorAlvo({lista:'extra',idx:i})}/>
                        <button onClick={()=>setExtrasDespInd(prev=>prev.filter((_,idx)=>idx!==i))} style={{color:'#ef4444'}}><Trash2 size={12}/></button>
                      </div>
                      {d.cod && <LinhaCodigo cod={d.cod} onLimpar={()=>{const nd=[...extrasDespInd];nd[i]={...nd[i],cod:''};setExtrasDespInd(nd);setDirtyCalc(true)}}/>}
                      {/* Observação / profissional / data da quinzena aparecem SÓ ao clicar
                          no nome (ou no 📝). Antes abriam sozinhas em toda despesa do
                          catálogo, porque o catálogo já grava a data do lançamento. */}
                      {notasAbertas.has('e'+i) && (
                        <>
                          <ObsComProf valor={d.obs||''} profs={profsLista}
                            onChange={val=>{const nd=[...extrasDespInd];nd[i]={...nd[i],obs:val};setExtrasDespInd(nd)}}/>
                          {/* PIX visível e editável DEPOIS do lançamento: antes, se a
                              chave não fosse digitada (ou fosse no campo errado),
                              não havia como ver nem corrigir por aqui. */}
                          <div style={{gridColumn:'1 / -1',display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                            <label style={{fontSize:11,fontWeight:700,color:'#6b21a8',whiteSpace:'nowrap'}}>💠 Chave PIX:</label>
                            <input value={d.pix||''} placeholder="CNPJ, telefone, e-mail ou chave aleatória"
                              onChange={e=>{const nd=[...extrasDespInd];nd[i]={...nd[i],pix:e.target.value};setExtrasDespInd(nd);setDirtyCalc(true)}}
                              style={{flex:'1 1 220px',minWidth:0,border:`1px solid ${d.pix?'#c4b5fd':'#e9d5ff'}`,borderRadius:8,padding:'5px 9px',fontSize:11.5,color:'#3a3835',background:d.pix?'#faf9ff':'#fff'}}/>
                            <button onClick={()=>setLeitorAlvo({lista:'pixlinha',idx:i})} title="Escanear QR Code do Pix (ou colar o copia-e-cola)"
                              style={{flexShrink:0,background:'#fff',border:'1px solid #a78bfa',borderRadius:8,padding:'5px 7px',cursor:'pointer',lineHeight:0,color:'#6b21a8'}}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                                <path d="M14 14h3v3h-3zM19 14h2M14 19h3M19 19h2"/>
                              </svg>
                            </button>
                            {d.pix && <span style={{fontSize:10,color:'#7c6fa8'}}>aparece no card do FINANCEIRO</span>}
                          </div>
                          <div style={{gridColumn:'1 / -1',display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                            <label style={{fontSize:11,fontWeight:700,color:'#78350f'}}>📅 Data do lançamento (para separar por quinzena):</label>
                            <input type="date" value={brParaISO(d.data||'')} onChange={e=>{const nd=[...extrasDespInd];nd[i]={...nd[i],data:isoParaBR(e.target.value)};setExtrasDespInd(nd);setDirtyCalc(true)}}
                              style={{border:'1px solid #f59e0b80',borderRadius:8,padding:'5px 9px',fontSize:11.5,color:'#78350f',background:'#fff'}}/>
                            {d.data && <span style={{fontSize:10.5,color:'#9a7b3a'}}>sem data = conta no “mês inteiro”</span>}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}

                {/* Botão adicionar + parcelar + modal catálogo */}
                <div className="px-5 py-3 border-t flex items-center gap-2 flex-wrap" style={{borderColor:'#f59e0b40',background:'#fef9ec'}}>
                  {despesasCatalogo.filter(c=>c.categoria==='indireta').length===0 && (
                    <span className="text-[10px]" style={{color:'#b45309'}}>⚠️ Cadastre despesas em <strong>Gerenciar Catálogo</strong> primeiro</span>
                  )}
                  <span className="text-[10px] w-full" style={{color:'#9a7b3a'}}>
                    Para lançar uma despesa nova, use o botão <strong>💳 Lançar boleto</strong> no cabeçalho desta seção — ele exige o <strong>Vencimento</strong>,
                    e com isso a conta entra sozinha na fila de <strong>Boletos</strong> do FINANCEIRO, onde você marca como paga.
                  </span>
                </div>
              </>}

              {/* Modal de lançamento — FORA do bloco que abre/fecha, senão o botão
                  do cabeçalho não funcionaria com a lista recolhida. */}
              <>
                {parcAberto && (
                  <div className="nodri-modal-overlay" style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>!parcSalvando&&setParcAberto(false)}>
                    <div className="nodri-modal-lanc" style={{background:'#fff',borderRadius:18,padding:24,width:'100%',maxWidth:940,maxHeight:'92vh',display:'flex',flexDirection:'column',gap:16,overflowY:'auto',border:'2px solid #f59e0b'}} onClick={e=>e.stopPropagation()}>
                      <div className="nodri-modal-head" style={{display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'2px solid #f3e8d0',paddingBottom:12}}>
                        <div style={{minWidth:0}}>
                          <h3 style={{fontSize:19,fontWeight:900,color:'#1a1a1a',margin:0}}>💳 Lançar boleto / despesa</h3>
                          <p className="no-mobile" style={{fontSize:12.5,color:'#767069',margin:'4px 0 0'}}>Cada parcela cai no mês do seu vencimento e entra na fila de <strong>Boletos</strong> do FINANCEIRO. Nada é apagado — tudo é somado ao mês.</p>
                        </div>
                        <button onClick={()=>!parcSalvando&&setParcAberto(false)} style={{background:'#faf9f7',border:'1.5px solid #e8e6e0',borderRadius:10,padding:7,cursor:'pointer',color:'#767069',lineHeight:0,flexShrink:0}}><X size={20}/></button>
                      </div>

                      {/* Duas colunas no computador, uma no celular */}
                      <div className="nodri-modal-2col" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,alignItems:'start'}}>

                        {/* ── COLUNA 1: o que é ── */}
                        <div style={{display:'flex',flexDirection:'column',gap:14}}>
                          <div style={{fontSize:11.5,fontWeight:900,color:'#b45309',textTransform:'uppercase',letterSpacing:.6,borderBottom:'2px solid #fde68a',paddingBottom:5}}>1 · A conta</div>

                          <div>
                            <label style={{fontSize:12.5,fontWeight:800,color:'#78350f',display:'block',marginBottom:5}}>Despesa *</label>
                            {/* SÓ do catálogo: digitar livre criava "DAVINES" e "DAVINE"
                                como se fossem empresas diferentes. */}
                            <select value={parcDespesa} onChange={e=>setParcDespesa(e.target.value)}
                              style={{width:'100%',border:'2px solid #f59e0b',borderRadius:10,padding:'12px 11px',fontSize:15,outline:'none',background:'#fff',color:parcDespesa?'#1a1a1a':'#9ca3af',cursor:'pointer',fontWeight:parcDespesa?700:400}}>
                              <option value="">— escolha a empresa cadastrada —</option>
                              {despesasCatalogo.filter(c=>c.categoria==='indireta').map(c=><option key={c.id} value={c.nome}>{c.nome}</option>)}
                            </select>
                            <span style={{fontSize:11,color:'#9a7b3a',display:'block',marginTop:4}}>
                              Não achou? Feche e cadastre em <strong>Gerenciar Catálogo</strong> — assim a mesma empresa nunca entra escrita de dois jeitos.
                            </span>
                          </div>

                          <div>
                            <label style={{fontSize:12.5,fontWeight:800,color:'#78350f',display:'block',marginBottom:5}}>
                              {ehEmprestimoParc ? 'De quem é o empréstimo? *' : 'Observação (opcional)'}
                            </label>
                            {ehEmprestimoParc
                              ? <ObsComProf valor={parcObs} onChange={setParcObs} profs={profsLista}/>
                              : <input value={parcObs} onChange={e=>setParcObs(e.target.value)} placeholder="ex: nota fiscal 1234, referência, motivo"
                                  style={{width:'100%',border:'2px solid #e8e6e0',borderRadius:10,padding:'12px 11px',fontSize:14,outline:'none'}}/>}
                          </div>

                          {ehEmprestimoParc && (
                            <div>
                              <label style={{fontSize:12.5,fontWeight:800,color:'#78350f',display:'block',marginBottom:5}}>🗓️ Data do lançamento (separar por quinzena)</label>
                              <input type="date" value={parcData} onChange={e=>setParcData(e.target.value)}
                                onClick={e=>{try{(e.currentTarget as any).showPicker?.()}catch{}}}
                                style={{width:'100%',border:'2px solid #e8e6e0',borderRadius:10,padding:'12px 11px',fontSize:14,outline:'none',cursor:'pointer'}}/>
                              <span style={{fontSize:11,color:'#9a7b3a'}}>Em branco, cada parcela usa a data do próprio vencimento.</span>
                            </div>
                          )}

                          {/* PIX da conta: nota fiscal sem código de barras */}
                          <div>
                            <label style={{fontSize:12.5,fontWeight:800,color:'#6b21a8',display:'block',marginBottom:5}}>💠 Chave PIX para pagar (opcional)</label>
                            <div style={{display:'flex',gap:8,alignItems:'center'}}>
                              <input value={parcPix} onChange={e=>setParcPix(e.target.value)} placeholder="CNPJ, telefone, e-mail ou chave aleatória"
                                style={{flex:1,minWidth:0,border:'2px solid #e9d5ff',borderRadius:10,padding:'12px 11px',fontSize:14,outline:'none',background:'#faf9ff'}}/>
                              {/* Lê o QR Code do Pix (copia-e-cola) — mesmo leitor do código de barras */}
                              <button onClick={()=>setLeitorAlvo({lista:'pixmodal',idx:0})} title="Escanear QR Code do Pix (ou colar o copia-e-cola)"
                                style={{flexShrink:0,background:'#fff',border:'2px solid #a78bfa',borderRadius:10,padding:'10px 11px',cursor:'pointer',lineHeight:0,color:'#6b21a8'}}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                                  <path d="M14 14h3v3h-3zM19 14h2M14 19h3M19 19h2"/>
                                </svg>
                              </button>
                            </div>
                            <span style={{fontSize:11,color:'#7c6fa8',display:'block',marginTop:4}}>
                              Use quando for <strong>nota fiscal sem código de barras</strong>. O Financeiro vê a chave e copia pra pagar no app do banco.
                            </span>
                          </div>
                        </div>

                        {/* ── COLUNA 2: como paga ── */}
                        <div style={{display:'flex',flexDirection:'column',gap:14}}>
                          <div style={{fontSize:11.5,fontWeight:900,color:'#b45309',textTransform:'uppercase',letterSpacing:.6,borderBottom:'2px solid #fde68a',paddingBottom:5}}>2 · Valores e vencimentos</div>

                          <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                            <label style={{fontSize:12.5,fontWeight:800,color:'#78350f'}}>Em quantas vezes?</label>
                            <input type="number" inputMode="numeric" min={1} max={48} value={parcQtd}
                              onChange={e=>{
                                const v = e.target.value
                                setParcQtd(v)                                   // aceita vazio enquanto digita
                                const nn = Number(v)
                                if (v.trim() && nn >= 1 && nn <= 48) setParcN(nn)
                              }}
                              onFocus={e=>e.currentTarget.select()}             // toca e já substitui
                              onBlur={()=>{ if (!parcQtd.trim() || Number(parcQtd) < 1) setParcQtd(String(parcLinhas.length)) }}
                              style={{width:88,border:'2px solid #f59e0b',borderRadius:10,padding:'11px 10px',fontSize:18,fontWeight:800,textAlign:'center',outline:'none'}}/>
                            <span style={{fontSize:11.5,color:'#767069',flex:1,minWidth:120}}>a numeração (1/{parcLinhas.length}, 2/{parcLinhas.length}…) é automática</span>
                          </div>

                          <div style={{display:'flex',flexDirection:'column',gap:10}}>
                            {parcLinhas.map((l,i)=>(
                              <div key={i} className="nodri-parc-linha" style={{display:'grid',gridTemplateColumns:'42px 46px minmax(0,1fr) minmax(0,1.15fr)',gap:8,alignItems:'center',background:l.cod?'#f0fdf4':'#fffbf0',border:`2px solid ${l.cod?'#86efac':'#fde68a'}`,borderRadius:12,padding:'11px 10px'}}>
                                <span style={{fontSize:13,fontWeight:900,color:'#b45309'}}>{i+1}/{parcLinhas.length}</span>
                                <button onClick={()=>setLeitorAlvo({lista:'parc',idx:i})}
                                  title={l.cod?'Código lido — clique para reler':'Escanear o código de barras deste boleto'}
                                  style={{background:l.cod?'#dcfce7':'#fff',border:`2px solid ${l.cod?'#16a34a':'#f59e0b'}`,borderRadius:10,padding:'9px 6px',cursor:'pointer',lineHeight:1,color:l.cod?'#15803d':'#b45309',display:'flex',justifyContent:'center'}}>
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <path d="M4 5v14M8 5v14M12 5v14M16 5v10M20 5v14"/>
                                  </svg>
                                </button>
                                <div style={{position:'relative',minWidth:0}}>
                                  <span style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',fontSize:12,fontWeight:700,color:'#b45309'}}>R$</span>
                                  <input type="number" inputMode="decimal" value={l.valor} onChange={e=>{const nd=[...parcLinhas];nd[i]={...nd[i],valor:e.target.value};setParcLinhas(nd)}} placeholder="valor"
                                    style={{width:'100%',minWidth:0,paddingLeft:30,paddingRight:6,paddingTop:11,paddingBottom:11,border:'2px solid #e8e6e0',borderRadius:10,fontSize:15,fontWeight:700,outline:'none'}}/>
                                </div>
                                <input type="date" value={l.venc} onChange={e=>{const nd=[...parcLinhas];nd[i]={...nd[i],venc:e.target.value};setParcLinhas(nd)}}
                                  onClick={e=>{try{(e.currentTarget as any).showPicker?.()}catch{}}}
                                  style={{width:'100%',minWidth:0,border:'2px solid #e8e6e0',borderRadius:10,padding:'10px 6px',fontSize:13.5,outline:'none',cursor:'pointer'}}/>
                                {!l.cod && (
                                  <div style={{gridColumn:'1 / -1',fontSize:11,color:'#b45309',display:'flex',alignItems:'center',gap:6}}>
                                    <span style={{fontSize:14}}>📷</span> Sem código de barras — toque no botão de barras pra ler o boleto
                                  </div>
                                )}
                                {l.cod && (
                                  <div style={{gridColumn:'1 / -1',display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                                    <span style={{fontSize:10.5,fontWeight:900,color:'#15803d'}}>LIDO DO CÓDIGO</span>
                                    <span style={{fontFamily:'ui-monospace,monospace',fontSize:11.5,color:'#374151',wordBreak:'break-all',flex:'1 1 180px'}}>{formatarLinha(l.cod)}</span>
                                    <button onClick={()=>{const nd=[...parcLinhas];nd[i]={...nd[i],cod:''};setParcLinhas(nd)}}
                                      style={{background:'transparent',border:'none',color:'#9ca3af',fontSize:11.5,cursor:'pointer'}}>remover</button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Compra já paga (mercado, feira, cartão na hora) */}
                      <button onClick={()=>setParcPago(p=>!p)} className="nodri-pago-card"
                        style={{display:'flex',alignItems:'center',gap:12,width:'100%',textAlign:'left',cursor:'pointer',
                          background:parcPago?'#f0fdf4':'#faf9f7',border:`2px solid ${parcPago?'#16a34a':'#e0ddd8'}`,
                          borderRadius:12,padding:'13px 14px'}}>
                        <span style={{width:26,height:26,borderRadius:8,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',
                          background:parcPago?'#16a34a':'#fff',border:`2px solid ${parcPago?'#16a34a':'#cbd5e1'}`,color:'#fff',fontSize:15,fontWeight:900}}>
                          {parcPago?'✓':''}
                        </span>
                        <span>
                          <span style={{display:'block',fontSize:14.5,fontWeight:800,color:parcPago?'#15803d':'#3a3835'}}>Marcar como pago</span>
                          <span style={{display:'block',fontSize:12,color:'#767069',marginTop:2}}>
                            {parcPago
                              ? 'Vai direto pra aba PAGOS do Financeiro — não entra na fila a pagar.'
                              : 'Marque se você JÁ pagou esta compra (ex.: mercado, pago na hora).'}
                          </span>
                        </span>
                      </button>

                      <div className="nodri-modal-acoes" style={{display:'flex',gap:10,justifyContent:'flex-end',flexWrap:'wrap',borderTop:'2px solid #f3e8d0',paddingTop:14}}>
                        <button onClick={()=>!parcSalvando&&setParcAberto(false)} style={{background:'transparent',border:'none',color:'#767069',fontSize:14,cursor:'pointer',padding:'12px 16px'}}>Cancelar</button>
                        <button onClick={()=>lancarParcelamento(true)} disabled={parcSalvando}
                          title="Salva este e já limpa o formulário pro próximo boleto"
                          style={{background:'#fff',color:'#b45309',border:'2px solid #f59e0b',borderRadius:10,padding:'12px 18px',fontSize:14,fontWeight:800,cursor:'pointer',opacity:parcSalvando?0.6:1}}>
                          <span className="no-mobile">Lançar e abrir próximo</span>
                          <span className="nodri-mob-only">+ próximo</span>
                        </button>
                        <button onClick={()=>lancarParcelamento(false)} disabled={parcSalvando}
                          style={{background:'#16a34a',color:'#fff',border:'none',borderRadius:10,padding:'12px 26px',fontSize:15.5,fontWeight:900,cursor:'pointer',opacity:parcSalvando?0.6:1,boxShadow:'0 3px 10px #16a34a40'}}>
                          {parcSalvando?'Lançando...':parcPago?'Lançar como pago':'Lançar'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Modal seletor de catálogo — SEM PORTA DE ENTRADA hoje: o botão
                    "Adicionar despesa do catálogo" foi retirado (jul/2026), porque
                    todo lançamento passa pelo "Lançar boleto" do cabeçalho, que exige
                    vencimento. Mantido aqui pra reativar em uma linha se precisar:
                    basta um botão chamando setModalCatalogoAberto(true). */}
                {modalCatalogoAberto && (
                  <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setModalCatalogoAberto(false)}>
                    <div style={{background:'#fff',borderRadius:'16px',padding:'24px',minWidth:'340px',maxWidth:'480px',width:'90%',maxHeight:'70vh',display:'flex',flexDirection:'column',gap:'12px'}} onClick={e=>e.stopPropagation()}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                        <h3 style={{fontSize:'15px',fontWeight:700,color:'#1a1a1a',margin:0}}>Selecionar do Catálogo</h3>
                        <button onClick={()=>setModalCatalogoAberto(false)} style={{background:'none',border:'none',cursor:'pointer',color:'#767069'}}><X size={18}/></button>
                      </div>
                      {despesasCatalogo.filter(c=>c.categoria==='indireta').length===0 ? (
                        <div style={{textAlign:'center',padding:'24px',color:'#b45309',fontSize:'13px'}}>
                          <p style={{marginBottom:'8px'}}>Nenhuma despesa indireta no catálogo.</p>
                          <p style={{fontSize:'11px',color:'#767069'}}>Vá em <strong>Gerenciar Catálogo</strong> para cadastrar.</p>
                        </div>
                      ) : (
                        <div style={{overflowY:'auto',display:'flex',flexDirection:'column',gap:'6px'}}>
                          {despesasCatalogo.filter(c=>c.categoria==='indireta').map(cat=>{
                            // Pode adicionar a mesma empresa mais de uma vez (ex.: 2 compras
                            // no mesmo mês da mesma empresa). Não bloqueia mais.
                            const jaAdicionada = extrasDespInd.some(e=>e.nome===cat.nome) || despInd.some(d=>d.nome===cat.nome)
                            return(
                              <button key={cat.id}
                                onClick={()=>{
                                  setExtrasDespInd(p=>[...p,{nome:cat.nome,valor:'',dica:cat.observacao||'',parcela:'',data:hojeBRCalc()}])
                                  setModalCatalogoAberto(false)
                                }}
                                style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',border:'1.5px solid',borderColor:'#f59e0b',borderRadius:'8px',background:'#fffbf0',cursor:'pointer'}}>
                                <span style={{fontSize:'13px',fontWeight:600,color:'#78350f'}}>{cat.nome}</span>
                                <span style={{fontSize:'11px',color:'#f59e0b',fontWeight:600}}>{jaAdicionada ? '+ Adicionar outra' : '+ Adicionar'}</span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Leitor de código de boleto (câmera no celular / colar no PC) */}
                <LeitorBoleto
                  aberto={!!leitorAlvo}
                  onFechar={()=>setLeitorAlvo(null)}
                  onLido={aplicarLeitura}
                  titulo={leitorAlvo?.lista==='parc' ? `Boleto da parcela ${(leitorAlvo.idx||0)+1}`
                    : (leitorAlvo?.lista==='pixmodal' || leitorAlvo?.lista==='pixlinha') ? 'QR Code do Pix (ou código do boleto)'
                    : 'Código do boleto desta despesa'}
                />
              </>
            </div>

            {/* Provisão */}
            <div className="rounded-2xl border overflow-hidden" style={{background:'#faf9f7',borderColor:'#e8e6e0',...oculto(podeCalc('calc_provisao'))}}>
              <button onClick={()=>setSecProvisao(p=>!p)} className="w-full flex items-center justify-between px-5 py-3 border-b hover:bg-white/2 transition-colors" style={{background:'#ffffff',borderColor:'#e8e6e0'}}>
                <div className="flex items-center gap-2">
                  {secProvisao ? <ChevronUp size={14} style={{color:'#7c6fe0'}}/> : <ChevronDown size={14} style={{color:'#7c6fe0'}}/>}
                  <div className="text-left">
                    <span className="font-bold text-sm" style={{color:'#7c6fe0'}}>Provisão Mensal</span>
                    <p className="text-[10px] mt-0.5" style={{color:'#767069'}}>✨ Automático a partir de <strong style={{color:'#7c6fe0'}}>Salários</strong></p>
                  </div>
                </div>
                <span className="font-bold text-sm" style={{color:'#7c6fe0'}}>{fmtR(totProvisao)}</span>
              </button>
              {secProvisao && <><div className="p-5">
                <div className="max-w-xl mx-auto space-y-5">
                {[
                  {num:'1',l:'13º Salário',v:sal13,set:setSal13,dica:'Todo mês, separe 1/12 dos salários para o 13º. Auto: Salários ÷ 12.',info:'sal13'},
                  {num:'2',l:'Férias',v:ferias,set:setFerias,dica:'Separe também a provisão de férias (salário + 1/3). Auto: Salários ÷ 36.',info:'ferias'},
                  {num:'3',l:'FGTS Rescisório',v:fgtsR,set:setFgtsR,dica:'Reserva para multa de 40% em caso de demissão. Auto: Salários × 4%.',info:'fgtsR'},
                ].map((f:any)=>(
                  <div key={f.l}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{background:'#7c6fe0',color:'#fff'}}>{f.num}</span>
                      <label className="text-xs font-bold" style={{color:'#7c6fe0'}}>{f.l}</label>
                      <InfoBtn id={f.info}/>
                    </div>
                    <p className="text-xs mb-1.5 pl-7" style={{color:'#6b6860'}}>{f.dica}</p>
                    <div className="relative pl-7">
                      <span className="absolute left-10 top-1/2 -translate-y-1/2 text-xs" style={{color:'#767069'}}>R$</span>
                      <input type="number" value={f.v} onChange={e=>f.set(e.target.value)} placeholder="0"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm font-bold text-[#1a1a1a] focus:outline-none"
                        style={{background:'#fff',border:'1.5px solid #7c6fe040'}}/>
                    </div>
                  </div>
                ))}
                </div>
              </div>
              {depMensal > 0 && (
                <div className="px-5 pb-3 flex items-center gap-2 text-xs" style={{color:'#767069'}}>
                  <span>📉 Depreciação mensal:</span>
                  <span className="font-bold" style={{color:'#7c6fe0'}}>{fmtR(depMensal)}</span>
                  <span style={{color:'#767069'}}>(inclusa no Custo Operacional)</span>
                </div>
              )}</>}
            </div>

            {/* Despesas Diretas */}
            <div className="rounded-2xl border overflow-hidden" style={{background:'#faf9f7',borderColor:'#e8e6e0',...oculto(podeCalc('calc_desp_variaveis'))}}>
              <button onClick={()=>setSecDiretas(p=>!p)} className="w-full flex items-center justify-between px-5 py-3 border-b hover:bg-white/2 transition-colors" style={{background:'#ffffff',borderColor:'#e8e6e0'}}>
                <div className="flex items-center gap-2">
                  {secDiretas ? <ChevronUp size={14} style={{color:'#ef4444'}}/> : <ChevronDown size={14} style={{color:'#ef4444'}}/>}
                  <span className="font-bold text-sm" style={{color:'#ef4444'}}>Despesas Diretas (Variáveis)</span>
                  {totDiretas > 0 && <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{background:'#ef444420',color:'#ef4444'}}>{fmtR(totDiretas)}</span>}
                </div>
                <span className="font-bold text-sm no-mobile" style={{color:'#ef4444'}}>{fmtR(totDiretas)}</span>
              </button>
              {secDiretas && <><div className="p-5">
                <div className="max-w-xl mx-auto space-y-5">
                {[
                  {num:'1',l:'Imposto (R$)',v:imposto,set:setImposto,dica:'Quanto pagou de imposto no mês (Simples Nacional ou seu regime).',info:'imposto'},
                  {num:'2',l:'Produto/Insumo (R$)',v:produto,set:setProduto,dica:'Total de produtos consumidos nos serviços do mês.',info:'produto'},
                  {num:'3',l:'Rateio/Comissão (R$)',v:rateio,set:setRateio,dica:'Total de comissões pagas aos profissionais.',info:'rateio'},
                  {num:'4',l:'Taxa de Cartão (R$)',v:taxaC,set:setTaxaC,dica:'Total cobrado pelas maquininhas no mês.',info:'taxaC'},
                ].map((f:any)=>(
                  <div key={f.l}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{background:'#ef4444',color:'#fff'}}>{f.num}</span>
                      <label className="text-xs font-bold" style={{color:'#ef4444'}}>{f.l}</label>
                      <InfoBtn id={f.info}/>
                    </div>
                    <p className="text-xs mb-1.5 pl-7" style={{color:'#6b6860'}}>{f.dica}</p>
                    <div className="relative pl-7">
                      <span className="absolute left-10 top-1/2 -translate-y-1/2 text-xs" style={{color:'#767069'}}>R$</span>
                      <input type="number" value={f.v} onChange={e=>f.set(e.target.value)} placeholder="0"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm font-bold text-[#1a1a1a] focus:outline-none"
                        style={{background:'#fff',border:'1.5px solid #ef444430'}}/>
                    </div>
                  </div>
                ))}
                {/* Extras Diretas */}
                {extrasDiretas.map((d,i)=>(
                  <div key={i} className="relative pl-7">
                    <span className="absolute left-0 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{background:'#ef444425',color:'#ef4444'}}>+</span>
                    <div className="flex items-center gap-1 mb-1">
                      <div className="flex-1 relative">
                        <input value={d.nome} onChange={e=>{const nd=[...extrasDiretas];nd[i]={...nd[i],nome:e.target.value};setExtrasDiretas(nd);setAutocomplDespesa(`dir-${i}`)}}
                          onFocus={()=>setAutocomplDespesa(`dir-${i}`)} onBlur={()=>setTimeout(()=>setAutocomplDespesa(null),200)}
                          placeholder="Nome da despesa" className="w-full px-2 py-1 rounded-lg text-xs text-[#1a1a1a] focus:outline-none"
                          style={{background:'#f5f4f0',border:'1px solid #ef444440'}}/>
                        {autocomplDespesa===`dir-${i}` && sugestoesDespesa(d.nome,'direta').length>0 && (
                          <div className="absolute top-full left-0 right-0 z-50 rounded-lg border shadow-xl" style={{background:'#faf9f7',borderColor:'#dedad4'}}>
                            {sugestoesDespesa(d.nome,'direta').map((s,si)=>(
                              <button key={si} onMouseDown={()=>{const nd=[...extrasDiretas];nd[i]={...nd[i],nome:s.nome};setExtrasDiretas(nd);setAutocomplDespesa(null)}}
                                className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 text-[#1a1a1a]" style={{borderBottom:'1px solid #e8e6e010'}}>{s.nome}</button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button onClick={()=>setExtrasDiretas(p=>p.filter((_,idx)=>idx!==i))} style={{color:'#6b6860'}}><Trash2 size={12}/></button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px]" style={{color:'#767069'}}>R$</span>
                      <input type="number" value={d.valor} onChange={e=>{const nd=[...extrasDiretas];nd[i]={...nd[i],valor:e.target.value};setExtrasDiretas(nd)}}
                        className="w-full pl-6 pr-2 py-1.5 rounded-lg text-xs text-[#1a1a1a] focus:outline-none" style={{background:'#f5f4f0',border:'1px solid #dedad4'}}/>
                    </div>
                  </div>
                ))}
                </div>
              </div>
              <div className="px-5 py-3 border-t" style={{borderColor:'#e8e6e0'}}>
                <button onClick={()=>setExtrasDiretas(p=>[...p,{nome:'',valor:'',dica:''}])}
                  className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg"
                  style={{background:'#ef444420',color:'#ef4444',border:'1px dashed #ef444440'}}>
                  <Plus size={12}/> Adicionar despesa direta
                </button>
              </div></>}
            </div>

            {/* Outras Despesas */}
            <div className="rounded-2xl border overflow-hidden" style={{background:'#faf9f7',borderColor:'#e8e6e0',...oculto(podeCalc('calc_outras_despesas'))}}>
              <button onClick={()=>setSecOutras(p=>!p)} className="w-full flex items-center justify-between px-5 py-3 border-b hover:bg-white/2 transition-colors" style={{background:'#ffffff',borderColor:'#e8e6e0'}}>
                <div className="flex items-center gap-2">
                  {secOutras ? <ChevronUp size={14} style={{color:'#0891b2'}}/> : <ChevronDown size={14} style={{color:'#0891b2'}}/>}
                  <span className="font-bold text-sm" style={{color:'#0891b2'}}>Outras Despesas / Gasto de Capital</span>
                  {totOutras > 0 && <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{background:'#06b6d420',color:'#0891b2'}}>{fmtR(totOutras)}</span>}
                </div>
                <span className="font-bold text-sm no-mobile" style={{color:'#0891b2'}}>{fmtR(totOutras)}</span>
              </button>
              {secOutras && <>
              <div className="p-5">
                <div className="max-w-xl mx-auto space-y-5">
                {[
                  {num:'1',l:'Aquisição de Equipamento (R$)',v:aquisicaoEq,set:setAquisicaoEq,dica:'Compras de equipamentos, móveis e utensílios feitas neste mês.',info:'aquisicaoEq'},
                  {num:'2',l:'Distribuição de Sócios (R$)',v:distSocios,set:setDistSocios,dica:'Retirada de lucros pelos sócios (diferente do pró-labore).',info:'distSocios'},
                ].map((f:any)=>(
                  <div key={f.l}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{background:'#0891b2',color:'#fff'}}>{f.num}</span>
                      <label className="text-xs font-bold" style={{color:'#0891b2'}}>{f.l}</label>
                      <InfoBtn id={f.info}/>
                    </div>
                    <p className="text-xs mb-1.5 pl-7" style={{color:'#6b6860'}}>{f.dica}</p>
                    <div className="relative pl-7">
                      <span className="absolute left-10 top-1/2 -translate-y-1/2 text-xs" style={{color:'#767069'}}>R$</span>
                      <input type="number" value={f.v} onChange={e=>f.set(e.target.value)} placeholder="0"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm font-bold text-[#1a1a1a] focus:outline-none"
                        style={{background:'#fff',border:'1.5px solid #06b6d430'}}/>
                    </div>
                  </div>
                ))}
                {/* Extras Outras */}
                {extrasOutras.map((d,i)=>(
                  <div key={i} className="relative pl-7">
                    <span className="absolute left-0 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{background:'#06b6d425',color:'#0891b2'}}>+</span>
                    <div className="flex items-center gap-1 mb-1">
                      <div className="flex-1 relative">
                        <input value={d.nome} onChange={e=>{const nd=[...extrasOutras];nd[i]={...nd[i],nome:e.target.value};setExtrasOutras(nd);setAutocomplDespesa(`out-${i}`)}}
                          onFocus={()=>setAutocomplDespesa(`out-${i}`)} onBlur={()=>setTimeout(()=>setAutocomplDespesa(null),200)}
                          placeholder="Nome da despesa" className="w-full px-2 py-1 rounded-lg text-xs text-[#1a1a1a] focus:outline-none"
                          style={{background:'#f5f4f0',border:'1px solid #06b6d440'}}/>
                        {autocomplDespesa===`out-${i}` && sugestoesDespesa(d.nome,'outras').length>0 && (
                          <div className="absolute top-full left-0 right-0 z-50 rounded-lg border shadow-xl" style={{background:'#faf9f7',borderColor:'#dedad4'}}>
                            {sugestoesDespesa(d.nome,'outras').map((s,si)=>(
                              <button key={si} onMouseDown={()=>{const nd=[...extrasOutras];nd[i]={...nd[i],nome:s.nome};setExtrasOutras(nd);setAutocomplDespesa(null)}}
                                className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 text-[#1a1a1a]" style={{borderBottom:'1px solid #e8e6e010'}}>{s.nome}</button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button onClick={()=>setExtrasOutras(p=>p.filter((_,idx)=>idx!==i))} style={{color:'#6b6860'}}><Trash2 size={12}/></button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px]" style={{color:'#767069'}}>R$</span>
                      <input type="number" value={d.valor} onChange={e=>{const nd=[...extrasOutras];nd[i]={...nd[i],valor:e.target.value};setExtrasOutras(nd)}}
                        className="w-full pl-6 pr-2 py-1.5 rounded-lg text-xs text-[#1a1a1a] focus:outline-none" style={{background:'#f5f4f0',border:'1px solid #dedad4'}}/>
                    </div>
                  </div>
                ))}
                </div>
              </div>
              <div className="px-5 py-3 border-t" style={{borderColor:'#e8e6e0'}}>
                <button onClick={()=>setExtrasOutras(p=>[...p,{nome:'',valor:'',dica:''}])}
                  className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg"
                  style={{background:'#06b6d420',color:'#0891b2',border:'1px dashed #06b6d440'}}>
                  <Plus size={12}/> Adicionar outra despesa
                </button>
              </div></>}
            </div>

            {/* Resultado */}
            {fatN > 0 && podeCalc('calc_resultado') && (
              <div className="space-y-3">
                {/* Resumo sempre visível */}
                <div className="rounded-2xl border overflow-hidden" style={{background:'#faf9f7',borderColor:'#10b98130'}}>
                  <button onClick={()=>setSecResultado(p=>!p)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/2 transition-colors">
                    <div className="flex items-center gap-3">
                      {secResultado ? <ChevronUp size={14} style={{color:'#059669'}}/> : <ChevronDown size={14} style={{color:'#059669'}}/>}
                      <span className="font-bold text-sm" style={{color:'#059669'}}>Resultado do Mês</span>
                    </div>
                    <div className="flex items-center gap-4 no-mobile">
                      <div className="text-right">
                        <p className="text-[10px]" style={{color:'#767069'}}>Resultado Operacional</p>
                        <p className="text-lg font-bold" style={{color:corRes(resultOp)}}>{fmtR(resultOp)} <span className="text-xs font-normal">({pctStr(resultOp,fatN)})</span></p>
                      </div>
                    </div>
                  </button>
                </div>
                {secResultado && <div className="space-y-3">
                <div className="max-w-xl mx-auto space-y-3">
                  {[
                    {num:'1',l:'Custo Operacional Total',v:custoOp,pct:pctStr(custoOp,fatN),c:'#f59e0b',dica:'Tudo que o salão gasta para funcionar: Indiretas + Provisão + Depreciação'},
                    {num:'2',l:'Margem Operacional',v:margOpR,pct:pctStr(margOpR,fatN),c:'#06b6d4',dica:'O que sobra do faturamento após pagar as Despesas Diretas'},
                    {num:'3',l:'Resultado Operacional',v:resultOp,pct:pctStr(resultOp,fatN),c:corRes(resultOp),dica:'Margem − Custo Operacional = o lucro real da operação'},
                    {num:'4',l:'Resultado Financeiro',v:resultFin,pct:pctStr(resultFin,fatN),c:corRes(resultFin),dica:'Resultado Op. − Outras Despesas + Depreciação = o que sobrou no caixa'},
                  ].map((c:any)=>(
                    <div key={c.num} className="rounded-xl p-4 border" style={{background:'#ffffff',borderColor:c.c+'30'}}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{background:c.c,color:'#fff'}}>{c.num}</span>
                        <p className="text-xs font-bold" style={{color:'#767069'}}>{c.l}</p>
                      </div>
                      <p className="text-[10px] mb-2 pl-7" style={{color:'#767069'}}>{c.dica}</p>
                      <p className="text-2xl font-bold pl-7" style={{color:c.c}}>{fmtR(c.v)} <span className="text-xs font-normal" style={{color:c.c+'99'}}>({c.pct} do faturamento)</span></p>
                    </div>
                  ))}
                  {[
                    {num:'5',l:'Ponto de Equilíbrio',v:fmtR(pe),c:'#10b981',dica:'Faturamento mínimo para cobrir tudo — abaixo disso é prejuízo'},
                    {num:'6',l:`Ponto de Equilíbrio c/ Lucro de ${lucroD}%`,v:fmtR(peLucro),c:'#7c6fe0',dica:'Quanto precisa faturar para cobrir custos E atingir o lucro desejado'},
                    {num:'7',l:'Rentabilidade',v:`${(rentab*100).toFixed(2)}%`,c:corRes(rentab),dica:'Resultado Operacional ÷ Investimento Inicial'},
                    {num:'8',l:'Capital de Giro Mínimo',v:fmtR(capGiro),c:'#06b6d4',dica:'Reserva ideal: Custo Operacional × 3 meses'},
                  ].map((c:any)=>(
                    <div key={c.num} className="rounded-xl p-4 border" style={{background:'#ffffff',borderColor:'#e8e6e0'}}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{background:c.c,color:'#fff'}}>{c.num}</span>
                        <p className="text-xs font-bold" style={{color:'#767069'}}>{c.l}</p>
                      </div>
                      <p className="text-[10px] mb-1 pl-7" style={{color:'#767069'}}>{c.dica}</p>
                      <p className="text-lg font-bold pl-7" style={{color:c.c}}>{c.v}</p>
                    </div>
                  ))}
                </div>

                {/* Verificação vs desejado */}
                <div className="rounded-xl p-4 border" style={{background:'#faf9f7',borderColor:'#e8e6e0'}}>
                  <p className="text-xs font-bold mb-3 text-center" style={{color:'#767069'}}>Realizado vs Desejado (Metodologia Recomendada)</p>
                  <div className="max-w-xl mx-auto grid grid-cols-1 gap-3">
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
                          <p className="text-[10px] mb-1" style={{color:'#767069'}}>{c.l}</p>
                          <div className="flex items-end gap-2">
                            <span className="text-base font-bold" style={{color:ok?c.c:'#ef4444'}}>{c.real.toFixed(1)}%</span>
                            <span className="text-[10px]" style={{color:'#6b6860'}}>{c.limite}: {c.desej}%</span>
                          </div>
                          <p className="text-[10px] mt-1" style={{color:ok?'#10b981':'#ef4444'}}>{status}</p>
                          <p className="text-[9px] mt-0.5" style={{color:'#767069'}}>{c.dica}</p>
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
                    <div key={f.l} className="rounded-xl p-4 border" style={{background:'#faf9f7',borderColor:'#e8e6e0'}}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <label className="text-xs font-bold" style={{color:'#767069'}}>{f.l}</label>
                        <InfoBtn id={f.info}/>
                      </div>
                      <p className="text-[10px] mb-2" style={{color:'#6b6860'}}>{f.dica}</p>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{color:'#767069'}}>R$</span>
                        <input type="number" value={f.v} onChange={e=>f.set(e.target.value)} placeholder="0"
                          className="w-full pl-9 pr-3 py-2 rounded-lg text-sm text-[#1a1a1a] focus:outline-none"
                          style={{background:'#f5f4f0',border:'1px solid #e8e6e0'}}/>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ══ RESUMO FINANCEIRO COMPLETO ══ */}
                <div className="rounded-2xl border overflow-hidden" style={{borderColor:'#5b4fcf50'}}>
                  <div className="px-5 py-4 border-b" style={{background:'linear-gradient(135deg,#ffffff,#faf9f7)',borderColor:'#e8e6e0'}}>
                    <h2 className="font-bold text-base text-[#1a1a1a] flex items-center gap-2">📊 Resumo da Situação Financeira — {MESES_NOMES[mesSel]}/{anoSel}</h2>
                    <p className="text-xs mt-1" style={{color:'#767069'}}>Tudo que você precisa saber sobre a saúde financeira do seu salão neste mês.</p>
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
                            <p className="text-sm mt-1" style={{color:'#767069'}}>{msg}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs" style={{color:'#767069'}}>Lucro do mês</p>
                            <p className="text-2xl font-bold" style={{color:cor}}>{fmtR(resultOp)}</p>
                            <p className="text-xs" style={{color:cor+'99'}}>{lucroReal.toFixed(1)}% do faturamento</p>
                          </div>
                        </div>
                      </div>
                    )
                  })()}

                  {/* O que entrou e o que saiu */}
                  <div className="p-5 border-b" style={{borderColor:'#e8e6e0'}}>
                    <p className="text-xs font-bold mb-4" style={{color:'#767069'}}>PARA ONDE FOI O SEU DINHEIRO</p>
                    <div className="space-y-3">
                      {/* Barra de faturamento */}
                      <div className="flex items-center gap-3">
                        <div className="w-32 text-xs text-right" style={{color:'#3a3835'}}>Faturamento</div>
                        <div className="flex-1 rounded-full h-6 relative overflow-hidden" style={{background:'#ffffff'}}>
                          <div className="h-6 rounded-full flex items-center px-3" style={{width:'100%',background:'#10b98130',border:'1px solid #10b98150'}}>
                            <span className="text-[10px] font-bold" style={{color:'#059669'}}>{fmtR(fatN)} = 100%</span>
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
                  <div className="p-5 border-b" style={{borderColor:'#e8e6e0'}}>
                    <p className="text-xs font-bold mb-4" style={{color:'#767069'}}>OS NÚMEROS QUE VOCÊ PRECISA SABER</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-xl p-4" style={{background:'#f5f4f0',border:'1px solid #e8e6e0'}}>
                        <p className="text-xs mb-1" style={{color:'#767069'}}>⚖️ Ponto de Equilíbrio</p>
                        <p className="text-xl font-bold" style={{color:'#059669'}}>{fmtR(pe)}</p>
                        <p className="text-[10px] mt-1" style={{color:'#6b6860'}}>É o mínimo que você precisa faturar para não ter prejuízo.</p>
                        <p className="text-[10px] mt-1 font-bold" style={{color:fatN>=pe&&pe>0?'#10b981':'#ef4444'}}>
                          {pe===0?'Preencha as despesas acima':fatN>=pe?`✅ Você está ${fmtR(fatN-pe)} ACIMA do equilíbrio`:`🚨 Falta ${fmtR(pe-fatN)} para cobrir todos os custos`}
                        </p>
                      </div>
                      <div className="rounded-xl p-4" style={{background:'#f5f4f0',border:'1px solid #e8e6e0'}}>
                        <p className="text-xs mb-1" style={{color:'#767069'}}>🎯 Para ter {lucroD}% de Lucro</p>
                        <p className="text-xl font-bold" style={{color:'#7c6fe0'}}>{fmtR(peLucro)}</p>
                        <p className="text-[10px] mt-1" style={{color:'#6b6860'}}>Faturamento necessário para atingir sua meta de lucro.</p>
                        <p className="text-[10px] mt-1 font-bold" style={{color:fatN>=peLucro&&peLucro>0?'#10b981':'#f59e0b'}}>
                          {peLucro===0?'—':fatN>=peLucro?`✅ Meta atingida!`:`Falta ${fmtR(peLucro-fatN)} para a meta`}
                        </p>
                      </div>
                      <div className="rounded-xl p-4" style={{background:'#f5f4f0',border:'1px solid #e8e6e0'}}>
                        <p className="text-xs mb-1" style={{color:'#767069'}}>💼 Retorno sobre Investimento</p>
                        <p className="text-xl font-bold" style={{color:rentab>0?'#10b981':'#ef4444'}}>{n(invInicial)>0?(rentab*100).toFixed(2)+'%':'—'}</p>
                        <p className="text-[10px] mt-1" style={{color:'#6b6860'}}>
                          {n(invInicial)>0?`Para cada R$100 investidos, você recuperou R$${(rentab*100).toFixed(2)}.`:'Informe o Investimento Inicial para calcular.'}
                        </p>
                      </div>
                      <div className="rounded-xl p-4" style={{background:'#f5f4f0',border:'1px solid #e8e6e0'}}>
                        <p className="text-xs mb-1" style={{color:'#767069'}}>🏦 Reserva de Emergência</p>
                        <div className="flex items-end gap-2 mt-1">
                          <p className="text-xl font-bold" style={{color:'#0891b2'}}>{fmtR(totalReservaAcum)}</p>
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
                        {n(reservaEmerg)>0&&<p className="text-[10px] mt-1" style={{color:'#767069'}}>Este mês você guardou: {fmtR(n(reservaEmerg))}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Diagnóstico dos custos */}
                  <div className="p-5 border-b" style={{borderColor:'#e8e6e0'}}>
                    <p className="text-xs font-bold mb-3" style={{color:'#767069'}}>DIAGNÓSTICO DOS SEUS CUSTOS</p>
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
                      <p className="text-xs font-bold mb-3" style={{color:'#767069'}}>O QUE FAZER AGORA</p>
                      <div className="space-y-2">
                        {resultOp < 0 && <div className="flex gap-2 p-3 rounded-xl" style={{background:'#ef444415',border:'1.5px solid #ef444460'}}><span>🚨</span><p className="text-xs" style={{color:'#dc2626'}}>Seus gastos estão maiores que sua receita. Revise urgentemente as despesas diretas e veja se é possível aumentar o faturamento.</p></div>}
                        {fatN < pe && pe > 0 && resultOp >= 0 && <div className="flex gap-2 p-3 rounded-xl" style={{background:'#f59e0b15',border:'1px solid #f59e0b30'}}><span>⚠️</span><p className="text-xs" style={{color:'#92400e'}}>Você está abaixo do ponto de equilíbrio. Tente aumentar o faturamento em {fmtR(pe-fatN)} ou reduzir os custos fixos.</p></div>}
                        {pe > 0 && fatN >= pe && fatN < peLucro && <div className="flex gap-2 p-3 rounded-xl" style={{background:'#5b4fcf15',border:'1px solid #5b4fcf30'}}><span>📈</span><p className="text-xs" style={{color:'#7c6fe0'}}>Você cobre os custos, mas ainda não atingiu sua meta de lucro. Falta {fmtR(peLucro-fatN)} de faturamento. Adicione mais clientes ou suba o ticket médio.</p></div>}
                        {peLucro > 0 && fatN >= peLucro && <div className="flex gap-2 p-3 rounded-xl" style={{background:'#10b98115',border:'1.5px solid #10b98160'}}><span>🏆</span><p className="text-xs" style={{color:'#059669'}}>Excelente! Você superou a meta de lucro. Agora pense em guardar parte do lucro na reserva de emergência e considere reinvestir no salão.</p></div>}
                        {totalReservaAcum < capGiro && capGiro > 0 && (
                          <div className="flex gap-2 p-3 rounded-xl" style={{background:'#06b6d415',border:'1px solid #06b6d430'}}>
                            <span>💰</span>
                            <div>
                              <p className="text-xs font-bold mb-1" style={{color:'#0891b2'}}>Reserva de Emergência: {fmtR(totalReservaAcum)} de {fmtR(capGiro)}</p>
                              <p className="text-xs" style={{color:'#0891b2'}}>
                                {totalReservaAcum === 0
                                  ? `Você ainda não tem reserva. Comece guardando pelo menos ${fmtR(Math.ceil(capGiro/12))}/mês. Use o campo "Quanto guardei de reserva este mês" abaixo.`
                                  : `Você já tem ${fmtR(totalReservaAcum)} acumulado — ótimo! Falta ${fmtR(capGiro-totalReservaAcum)}. Continue guardando ${fmtR(Math.ceil((capGiro-totalReservaAcum)/12))}/mês.`}
                              </p>
                            </div>
                          </div>
                        )}
                        {totalReservaAcum >= capGiro && capGiro > 0 && <div className="flex gap-2 p-3 rounded-xl" style={{background:'#10b98115',border:'1.5px solid #10b98160'}}><span>🏦</span><p className="text-xs" style={{color:'#059669'}}>✅ Sua reserva de emergência está completa! Você tem {fmtR(totalReservaAcum)} guardados — equivalente a {((totalReservaAcum/capGiro)*3).toFixed(1)} meses de custos.</p></div>}
                        <div className="flex gap-2 p-3 rounded-xl" style={{background:'#5b4fcf15',border:'1px solid #5b4fcf30'}}><span>📅</span><p className="text-xs" style={{color:'#7c6fe0'}}>Salve os dados deste mês clicando em <strong>"Salvar {MESES_NOMES[mesSel]}"</strong> no topo para comparar com os próximos meses.</p></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Botão Atualizar */}
                <button onClick={atualizar}
                  className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                  style={{background:atualizando?'#10b98120':'#ffffff',color:atualizando?'#10b981':'#767069',border:`1px solid ${atualizando?'#10b981':'#dedad4'}`}}>
                  {atualizando ? '✅ Tudo atualizado!' : '🔄 Atualizar Resultados'}
                </button>

                {/* Botão IA */}
                <div className="rounded-2xl border overflow-hidden" style={{borderColor:'#5b4fcf40'}}>
                  {!analiseIA&&!loadingIA&&!erroIA&&(
                    <button onClick={analisarIA} className="w-full py-4 font-bold text-sm flex items-center justify-center gap-2 transition-all hover:brightness-110"
                      style={{background:'linear-gradient(135deg,#5b4fcf20,#7c6fe020)',color:'#7c6fe0',border:'none'}}>
                      🤖 Quero a análise completa da NODRI IA
                      <span className="text-xs font-normal" style={{color:'#767069'}}>— opcional</span>
                    </button>
                  )}
                  {loadingIA&&(<div className="p-5 flex items-center gap-3" style={{background:'#faf9f7'}}><Loader2 size={18} className="animate-spin" style={{color:'#5b4fcf'}}/><span className="text-sm" style={{color:'#767069'}}>NODRI IA analisando...</span></div>)}
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
          <div className="nodri-aba space-y-4">
            <GuiaPassos passos={[
              {titulo:'Receitas e Despesas',desc:'Preencha a aba RD primeiro — os valores vêm de lá automaticamente',ok:custoOp>0&&fatN>0,cor:'#10b981'},
              {titulo:'Área e Profissionais',desc:'Informe a metragem do salão e quantos profissionais trabalham',ok:n(areaM2)>0&&n(numProfs)>0,cor:'#f59e0b'},
              {titulo:'Meta de Lucro',desc:'Defina qual % de lucro você quer alcançar',ok:n(metaLucroPE)>0||n(lucroD)>0,cor:'#7c6fe0'},
              {titulo:'Ver o PE',desc:'O Ponto de Equilíbrio aparece automaticamente abaixo',ok:PE_>0,cor:'#5b4fcf'},
            ]}/>
            {(custoOp>0||fatN>0) && (
              <div className="rounded-xl p-3" style={{background:'#5b4fcf15',border:'1px solid #5b4fcf30'}}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{color:'#7c6fe0'}}>Vem da aba Receitas e Despesas</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {r:'Custo Op.',   v:fmtR(custoOp)},
                    {r:'Margem',      v:`${(margOpPct*100).toFixed(1)}%`},
                    {r:'Faturamento', v:fmtR(fatN)},
                  ].map(x=>(
                    <div key={x.r} className="text-center rounded-lg py-2 px-1" style={{background:'#ffffff90'}}>
                      <p className="text-[9px] mb-0.5" style={{color:'#8b86a8'}}>{x.r}</p>
                      <p className="text-[11px] font-bold leading-tight" style={{color:'#5b4fcf'}}>{x.v}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="rounded-2xl border overflow-hidden" style={{background:'#faf9f7',borderColor:'#10b98140'}}>
              <button onClick={()=>setSecParamsPE(p=>!p)} className="w-full flex items-center justify-between px-5 py-3 transition-colors"
                style={{background:'linear-gradient(135deg,#faf9f7,#e9f9f2)'}}>
                <div className="flex items-center gap-2 flex-wrap">
                  {secParamsPE ? <ChevronUp size={14} style={{color:'#059669'}}/> : <ChevronDown size={14} style={{color:'#059669'}}/>}
                  <span className="font-bold text-sm" style={{color:'#059669'}}>Parâmetros</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold no-mobile" style={{background:'#10b981',color:'#fff'}}>Custo Op {fmtR(custoOpPE_)} · Meta {n(metaLucroPE)||n(lucroD)||15}%</span>
                </div>
                <span className="text-[10px] flex-shrink-0" style={{color:'#767069'}}>{secParamsPE?'fechar ✕':'abrir ▾'}</span>
              </button>
              {secParamsPE && (
              <div className="px-5 pb-6 pt-4 border-t" style={{borderColor:'#10b98120'}}>
                <div className="max-w-xl mx-auto space-y-5">
                {[
                  {num:'1',l:'Custo Operacional (R$)',v:simDespesa,set:setSimDespesa,ph:custoOp>0?custoOp.toFixed(2):'0',tipo:'R$',info:'custoOpCad',dica:'Quanto o salão gasta por mês para funcionar. Vem automático da aba Receitas e Despesas.'},
                  {num:'2',l:'Margem Operacional (%)',v:margemPE,set:setMargemPE,ph:margOpPct>0?(margOpPct*100).toFixed(1):'44',tipo:'%',info:'margemPE',dica:'O que sobra do faturamento após os custos diretos. Vem automático — referência do mercado: 44%.'},
                  {num:'3',l:'Meta Lucro (%)',v:metaLucroPE,set:setMetaLucroPE,ph:n(lucroD)>0?lucroD:'15',tipo:'%',info:'metaLucroPE',dica:'Quanto você quer lucrar. Recomendado: 15%.'},
                  {num:'4',l:'Área do Salão (M²)',v:areaM2,set:setAreaM2,ph:'100',tipo:'m²',info:'areaM2',dica:'A metragem total — para calcular quanto cada m² precisa gerar.'},
                  {num:'5',l:'Nº de Profissionais',v:numProfs,set:setNumProfs,ph:'3',tipo:'',info:'numProfs',dica:'Quantos atendem clientes — para calcular a meta individual.'},
                  {num:'6',l:'Faturamento Atual (R$)',v:fatPEManual,set:setFatPEManual,ph:fatN>0?fatN.toFixed(2):'0',tipo:'R$',info:'faturamento',dica:'Quanto o salão fatura hoje — para comparar com o Ponto de Equilíbrio.'},
                ].map((f:any)=>(
                  <div key={f.l}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{background:'#059669',color:'#fff'}}>{f.num}</span>
                      <label className="text-xs font-bold" style={{color:'#059669'}}>{f.l}</label>
                      <InfoBtn id={f.info}/>
                      {!f.v && f.ph && <AvisoDefault ativo={true} padrao={`usando ${f.ph} (automático)`} onPreencher={()=>{}} onManter={()=>{}}/>}
                    </div>
                    <p className="text-xs mb-1.5 pl-7" style={{color:'#6b6860'}}>{f.dica}</p>
                    <div className="relative pl-7">
                      {f.tipo==='R$'&&<span className="absolute left-10 top-1/2 -translate-y-1/2 text-xs" style={{color:'#767069'}}>R$</span>}
                      <input type="number" value={f.v} onChange={e=>f.set(e.target.value)} placeholder={f.ph}
                        className={`w-full ${f.tipo==='R$'?'pl-9':'pl-3'} ${f.tipo&&f.tipo!=='R$'?'pr-9':'pr-3'} py-2.5 rounded-xl text-sm font-bold text-[#1a1a1a] focus:outline-none`}
                        style={{background:'#fff',border:'1.5px solid #10b98130'}}/>
                      {f.tipo&&f.tipo!=='R$'&&<span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{color:'#767069'}}>{f.tipo}</span>}
                    </div>
                  </div>
                ))}
                </div>
              </div>
              )}
            </div>

            {/* Resultados PE — card recolhível (fechado por padrão), tudo em coluna única */}
            {custoOpPE_>0&&margPE_>0&&(
              <div className="rounded-2xl border overflow-hidden" style={{background:'#faf9f7',borderColor:'#10b98130'}}>
                <button onClick={()=>setSecResultPE(p=>!p)} className="w-full flex items-center justify-between px-5 py-4 transition-colors">
                  <div className="flex items-center gap-2 flex-wrap">
                    {secResultPE ? <ChevronUp size={14} style={{color:'#059669'}}/> : <ChevronDown size={14} style={{color:'#059669'}}/>}
                    <span className="font-bold text-sm" style={{color:'#059669'}}>Resultados do Ponto de Equilíbrio</span>
                  </div>
                  <div className="text-right flex-shrink-0 no-mobile">
                    <p className="text-[10px]" style={{color:'#767069'}}>Ponto de Equilíbrio</p>
                    <p className="text-lg font-bold" style={{color:'#10b981'}}>{fmtR(PE_)}</p>
                  </div>
                </button>
                {secResultPE && (
                <div className="px-5 pb-6 pt-4 border-t" style={{borderColor:'#10b98120'}}>
                  <div className="max-w-xl mx-auto space-y-3">
                    {[
                      {num:'1',l:'⚖️ Ponto de Equilíbrio',v:fmtR(PE_),sub:'Faturamento mínimo para cobrir todos os custos — abaixo disso é prejuízo',c:'#10b981',comparar:true},
                      {num:'2',l:`🎯 PE p/ Lucro de ${n(metaLucroPE)||n(lucroD)}%`,v:fmtR(PELucro_),sub:'Quanto precisa faturar para cobrir os custos E ter o lucro desejado',c:'#7c6fe0',comparar:false},
                    ].map((c:any)=>(
                      <div key={c.num} className="rounded-xl p-4 border" style={{background:'#ffffff',borderColor:`${c.c}30`}}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{background:c.c,color:'#fff'}}>{c.num}</span>
                          <p className="text-xs font-bold" style={{color:c.c}}>{c.l}</p>
                        </div>
                        <p className="text-[10px] mb-1 pl-7" style={{color:'#767069'}}>{c.sub}</p>
                        <p className="text-3xl font-bold pl-7" style={{color:c.c}}>{c.v}</p>
                        {c.comparar&&fatPE_>0&&<p className="text-xs mt-1 pl-7" style={{color:fatPE_>=PE_?'#10b981':'#ef4444'}}>{fatPE_>=PE_?`✅ Você fatura ${fmtR(fatPE_-PE_)} acima do PE`:`🚨 Falta ${fmtR(PE_-fatPE_)} para o PE`}</p>}
                      </div>
                    ))}
                    <div className="rounded-xl p-4 border" style={{background:'#ffffff',borderColor:'#e8e6e0'}}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{background:'#0891b2',color:'#fff'}}>3</span>
                        <p className="text-xs font-bold" style={{color:'#0891b2'}}>PE por Profissional ({profs_} profissionais)</p>
                      </div>
                      <div className="pl-7 space-y-2">
                        {[
                          {l:'PE por Profissional',v:fmtR(PEProf_)},
                          {l:'PE c/ Lucro por Prof.',v:fmtR(PEProfLucro_)},
                        ].map((c,i)=>(
                          <div key={i}>
                            <p className="text-[10px]" style={{color:'#767069'}}>{c.l} — cada profissional precisa gerar</p>
                            <p className="text-lg font-bold" style={{color:'#0891b2'}}>{c.v}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl p-4 border" style={{background:'#ffffff',borderColor:'#e8e6e0'}}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{background:'#b45309',color:'#fff'}}>4</span>
                        <p className="text-xs font-bold" style={{color:'#b45309'}}>PE por M² ({n(areaM2)||100} m²)</p>
                      </div>
                      <div className="pl-7 space-y-2">
                        {[
                          {l:'PE por M²',v:`${fmtR(PEM2_)}/m²`},
                          {l:'PE c/ Lucro por M²',v:`${fmtR(PEM2Lucro_)}/m²`},
                        ].map((c,i)=>(
                          <div key={i}>
                            <p className="text-[10px]" style={{color:'#767069'}}>{c.l} — cada m² precisa gerar</p>
                            <p className="text-lg font-bold" style={{color:'#b45309'}}>{c.v}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl p-4 text-xs space-y-1" style={{background:'#faf9f7',border:'1px solid #e8e6e0',color:'#767069'}}>
                      <p className="font-bold mb-1" style={{color:'#767069'}}>💡 Como funciona:</p>
                      <p>• <strong style={{color:'#1a1a1a'}}>PE</strong> = Custo Operacional ÷ Margem Operacional% — faturamento mínimo para não ter prejuízo</p>
                      <p>• <strong style={{color:'#1a1a1a'}}>PE c/ Lucro</strong> = Custo Op ÷ (Margem% − Meta Lucro%) — para cobrir E lucrar</p>
                      <p>• <strong style={{color:'#1a1a1a'}}>PE por Profissional</strong> = PE Total ÷ nº de profissionais — meta individual</p>
                      <p>• <strong style={{color:'#1a1a1a'}}>PE por M²</strong> = PE Total ÷ área do salão — eficiência do espaço</p>
                    </div>
                  </div>
                </div>
                )}
              </div>
            )}
            <button onClick={atualizar} className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
              style={{background:atualizando?'#10b98120':'#ffffff',color:atualizando?'#10b981':'#767069',border:`1px solid ${atualizando?'#10b981':'#dedad4'}`}}>
              {atualizando?'✅ Tudo atualizado!':'🔄 Atualizar Resultados'}
            </button>
          </div>
        )}

        {/* ════ ABA CALCULAR SERVIÇOS ════ */}
        {aba==='servicos' && (
          <div className="nodri-aba space-y-4">
            <GuiaPassos passos={[
              {titulo:'Parâmetros Globais',desc:'Configure taxa do cartão e custo operacional do seu salão',ok:n(taxaCartao)>0,cor:'#10b981'},
              {titulo:'Adicione Serviços',desc:'Nome, preço e percentual de rateio do profissional',ok:servicos.some(s=>s.nome&&n(s.preco)>0),cor:'#f59e0b'},
              {titulo:'Produto e Imposto',desc:'Custo do produto usado e % de imposto de cada serviço',ok:servicos.some(s=>n(s.imposto)>0),cor:'#7c6fe0'},
              {titulo:'Ver Resultado',desc:'Resultado líquido de cada serviço aparece automaticamente',ok:servicos.some(s=>n(s.preco)>0&&n(s.rateioP)>0),cor:'#5b4fcf'},
            ]}/>
            <div className="rounded-2xl border overflow-hidden" style={{background:'#faf9f7',borderColor:'#5b4fcf40'}}>
              <button onClick={()=>setSecConfigServ(p=>!p)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/2 transition-colors" style={{background:'#ffffff'}}>
                <div className="flex items-center gap-2">
                  {secConfigServ ? <ChevronUp size={14} style={{color:'#5b4fcf'}}/> : <ChevronDown size={14} style={{color:'#5b4fcf'}}/>}
                  <span className="font-bold text-sm" style={{color:'#5b4fcf'}}>Configurações do Cálculo</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full no-mobile" style={{background:'#5b4fcf20',color:'#7c6fe0'}}>Cartão {taxaCartao}% · CustoOp {(custOpServN*100).toFixed(0)}% · {salaoParceiro?'Salão Parceiro ✓':'Sem Parceiro'}</span>
                </div>
                <ChevronDown size={14} style={{color:'#6b6860'}}/>
              </button>
              {secConfigServ && <div className="p-5">
              <div className="max-w-xl mx-auto space-y-5 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{background:'#5b4fcf',color:'#fff'}}>1</span>
                    <label className="text-xs font-bold" style={{color:'#5b4fcf'}}>Taxa do Cartão (%)</label>
                    <InfoBtn id="taxaCartaoServ"/>
                    <AvisoDefault ativo={taxaCartao==='5'} padrao="5% (padrão)" onPreencher={()=>{}} onManter={()=>{}}/>
                  </div>
                  <p className="text-xs mb-1.5 pl-7" style={{color:'#6b6860'}}>Média das taxas das suas maquininhas. Recomendado: 5%.</p>
                  <div className="relative pl-7"><input type="number" value={taxaCartao} onChange={e=>setTaxaCartao(e.target.value)} className="w-full pr-9 pl-3 py-2.5 rounded-xl text-sm font-bold text-[#1a1a1a] focus:outline-none" style={{background:'#fff',border:'1.5px solid #5b4fcf30'}}/><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{color:'#767069'}}>%</span></div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{background:'#5b4fcf',color:'#fff'}}>2</span>
                    <label className="text-xs font-bold" style={{color:'#5b4fcf'}}>Abatimento do Produto (%)</label><InfoBtn id="abatProd"/>
                  </div>
                  <p className="text-xs mb-1.5 pl-7" style={{color:'#6b6860'}}>Quanto do custo do produto é descontado da comissão. Recomendado: 100%.</p>
                  <div className="relative pl-7"><input type="number" value={abatProd} onChange={e=>setAbatProd(e.target.value)} className="w-full pr-9 pl-3 py-2.5 rounded-xl text-sm font-bold text-[#1a1a1a] focus:outline-none" style={{background:'#fff',border:'1.5px solid #5b4fcf30'}}/><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{color:'#767069'}}>%</span></div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{background:'#5b4fcf',color:'#fff'}}>3</span>
                    <label className="text-xs font-bold" style={{color:'#5b4fcf'}}>Custo Operacional (%)</label><InfoBtn id="custOpServ"/>
                  </div>
                  {/* Seletor de modo */}
                  <div className="grid grid-cols-2 gap-2 mb-2 pl-7">
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
                      <p style={{color:'#767069',paddingLeft:'18px'}}>{n(custIndD)||30}% fixo — igual à planilha</p>
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
                      <p style={{color:'#767069',paddingLeft:'18px'}}>
                        {mediaCustoOp>0
                          ? `${(mediaCustoOp*100).toFixed(1)}% — média de ${qtdMesesMedia} ${qtdMesesMedia===1?'mês':'meses'}`
                          : fatN>0&&custoOp>0
                            ? `${(custoOp/fatN*100).toFixed(1)}% — mês atual`
                            : 'Preencha a aba RD'}
                      </p>
                    </button>
                  </div>
                  <p className="text-xs mb-1.5 pl-7" style={{color:'#6b6860'}}>
                    {modoCustoOp==='dani'
                      ? <>Usando <strong style={{color:'#7c6fe0'}}>{n(custIndD)||30}%</strong> — padrão recomendado do mercado</>
                      : mediaCustoOp > 0
                        ? <>Usando média de <strong style={{color:'#059669'}}>{qtdMesesMedia} {qtdMesesMedia===1?'mês':'meses'}</strong>: <strong style={{color:'#059669'}}>{(mediaCustoOp*100).toFixed(1)}%</strong></>
                        : fatN>0&&custoOp>0
                          ? <>Usando mês atual: <strong style={{color:'#059669'}}>{(custoOp/fatN*100).toFixed(1)}%</strong></>
                          : <>Preencha a aba RD para usar seu valor real</>}
                  </p>
                  <div className="relative pl-7">
                    <input type="number" value={custOpServ}
                      onChange={e=>setCustOpServ(e.target.value)}
                      placeholder={fatN>0&&custoOp>0?(custoOp/fatN*100).toFixed(1):'30'}
                      className="w-full pr-9 pl-3 py-2.5 rounded-xl text-sm font-bold text-[#1a1a1a] focus:outline-none"
                      style={{background:'#fff',border:'1.5px solid #5b4fcf30'}}/>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{color:'#767069'}}>%</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{background:'#5b4fcf',color:'#fff'}}>4</span>
                    <label className="text-xs font-bold" style={{color:'#5b4fcf'}}>Lei do Salão Parceiro</label>
                  </div>
                  <p className="text-xs mb-1.5 pl-7" style={{color:'#6b6860'}}>Com a lei, o imposto incide sobre a margem do salão, não sobre o preço total.</p>
                  <div className="pl-7">
                    <button onClick={()=>setSalaoParceiro(p=>!p)} className="w-full py-2.5 rounded-xl text-sm font-bold transition-all"
                      style={{background:salaoParceiro?'#10b981':'#ffffff',color:salaoParceiro?'white':'#767069',border:`1.5px solid ${salaoParceiro?'#10b981':'#dedad4'}`}}>
                      {salaoParceiro?'✅ SIM':'NÃO'}
                    </button>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{background:'#5b4fcf',color:'#fff'}}>5</span>
                    <label className="text-xs font-bold" style={{color:'#5b4fcf'}}>Regras do rateio</label>
                  </div>
                  <div className="pl-7 space-y-2 text-xs p-0">
                    <label className="flex items-center gap-2 cursor-pointer rounded-lg p-2.5" style={{background:'#f5f4f0'}}>
                      <input type="checkbox" checked={taxaAntesRateio} onChange={e=>setTaxaAntesRateio(e.target.checked)} className="accent-purple-500"/>
                      <span style={{color:'#3a3835'}}>Taxa do cartão deve ser abatida do valor antes de calcular o rateio</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer rounded-lg p-2.5" style={{background:'#f5f4f0'}}>
                      <input type="checkbox" checked={prodAntesRateio} onChange={e=>setProdAntesRateio(e.target.checked)} className="accent-purple-500"/>
                      <span style={{color:'#3a3835'}}>Valor do produto deve ser abatido do rateio</span>
                    </label>
                  </div>
                </div>
              </div>
              </div>}
            </div>

            {/* Barra de busca e ordenação */}
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{background:'#faf9f7',border:'1px solid #e8e6e0'}}>
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{color:'#767069'}}>🔍</span>
                <input value={buscaServico} onChange={e=>setBuscaServico(e.target.value)}
                  placeholder="Buscar serviço pelo nome..."
                  className="w-full pl-8 pr-3 py-2 rounded-lg text-xs text-[#1a1a1a] focus:outline-none"
                  style={{background:'#f5f4f0',border:'1px solid #dedad4'}}/>
              </div>
              <button onClick={()=>setOrdenarPorLucro(v=>!v)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all"
                style={{background:ordenarPorLucro?'#10b98120':'#ffffff',color:ordenarPorLucro?'#10b981':'#767069',border:`1px solid ${ordenarPorLucro?'#10b981':'#dedad4'}`}}>
                {ordenarPorLucro ? '📈 Mais lucrativo primeiro' : '🔤 Ordem original'}
              </button>
              {buscaServico && <button onClick={()=>setBuscaServico('')} className="text-xs px-2 py-1 rounded" style={{color:'#767069'}}>✕ limpar</button>}
            </div>

            {/* Lista de serviços — cards recolhíveis (fechados por padrão) */}
            <div className="rounded-2xl border overflow-hidden" style={{background:'#faf9f7',borderColor:'#e8e6e0'}}>
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
                const aberto=servAbertos.has(s.id)
                return(
                  <div key={s.id} className="border-b" style={{borderColor:'#e8e6e0'}}>
                    <button onClick={()=>toggleServCard(s.id)} className="w-full flex items-center justify-between gap-2 px-5 py-3 transition-colors" style={{background:'#ffffff'}}>
                      <div className="flex items-center gap-2 min-w-0">
                        {aberto ? <ChevronUp size={14} style={{color:'#5b4fcf',flexShrink:0}}/> : <ChevronDown size={14} style={{color:'#5b4fcf',flexShrink:0}}/>}
                        <span className="font-bold text-sm truncate" style={{color:'#1a1a1a'}}>{s.nome||'Novo serviço'}</span>
                        {c&&<span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0" style={{background:c.resultado>0?'#10b98120':'#ef444420',color:c.resultado>0?'#059669':'#ef4444'}}>{c.resultado>0?'✅ Lucrativo':'🚨 Prejuízo'}</span>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        {n(s.preco)>0&&<p className="text-xs font-bold" style={{color:'#5b4fcf'}}>{fmtR(n(s.preco))}</p>}
                        {c&&<p className="text-[10px]" style={{color:corRes(c.resultado)}}>Lucro: {fmtR(c.resultado)} ({(c.resultPct*100).toFixed(1)}%)</p>}
                      </div>
                    </button>
                    {aberto&&<>
                    <div className="px-5 py-4">
                      <div className="max-w-xl mx-auto space-y-4">
                        {[
                          {num:'1',k:'nome',l:'Nome do Serviço',ph:'Ex: Coloração longo',tipo:'texto',info:'',dica:'Como o serviço aparece na sua tabela.'},
                          {num:'2',k:'preco',l:'Preço (R$)',ph:'0',tipo:'R$',info:'precoServico',dica:'Quanto o cliente paga por este serviço.'},
                          {num:'3',k:'rateioP',l:'Rateio / Comissão (%)',ph:'50',tipo:'%',info:'rateioServico',dica:'Percentual que fica com o profissional.'},
                          {num:'4',k:'produto',l:'Produto (R$)',ph:'0',tipo:'R$',info:'produtoServico',dica:'Clique para escolher um produto do catálogo, ou digite o valor manualmente.'},
                          {num:'5',k:'imposto',l:'Imposto (%)',ph:'5',tipo:'%',info:'impostoServico',dica:'Alíquota de imposto sobre este serviço.'},
                        ].map((f:any)=>(
                          <div key={f.k}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{background:'#5b4fcf',color:'#fff'}}>{f.num}</span>
                              <label className="text-xs font-bold" style={{color:'#5b4fcf'}}>{f.l}</label>
                              {f.info&&<InfoBtn id={f.info}/>}
                            </div>
                            <p className="text-xs mb-1.5 pl-7" style={{color:'#6b6860'}}>{f.dica}</p>
                            <div className="relative pl-7">
                              {f.tipo==='R$'&&<span className="absolute left-10 top-1/2 -translate-y-1/2 text-xs" style={{color:'#767069'}}>R$</span>}
                              {f.tipo==='texto'
                                ? <input value={s.nome} onChange={e=>setServicos(p=>p.map(x=>x.id===s.id?{...x,nome:e.target.value}:x))}
                                    placeholder={f.ph} className="w-full px-3 py-2.5 rounded-xl text-sm font-bold text-[#1a1a1a] focus:outline-none"
                                    style={{background:'#fff',border:'1.5px solid #5b4fcf30'}}/>
                                : <input type="number" value={(s as any)[f.k]}
                                    onFocus={f.k==='produto'?()=>setProdSelKey(s.id):undefined}
                                    onBlur={f.k==='produto'?()=>setTimeout(()=>setProdSelKey(k=>k===s.id?null:k),200):undefined}
                                    onChange={e=>setServicos(p=>p.map(x=>x.id===s.id?{...x,[f.k]:e.target.value}:x))}
                                    placeholder={f.ph}
                                    className={`w-full ${f.tipo==='R$'?'pl-9':'pl-3'} ${f.tipo==='%'?'pr-9':'pr-3'} py-2.5 rounded-xl text-sm font-bold text-[#1a1a1a] focus:outline-none`}
                                    style={{background:'#fff',border:`1.5px solid ${n((s as any)[f.k])>0?'#5b4fcf40':'#e8e6e0'}`}}/>}
                              {f.tipo==='%'&&<span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{color:'#767069'}}>%</span>}
                              {/* Caixa de seleção: produtos do Catálogo de Produtos */}
                              {f.k==='produto' && prodSelKey===s.id && (
                                <div className="absolute left-7 right-0 top-full z-50 rounded-xl border overflow-hidden shadow-2xl mt-1"
                                  style={{background:'#fff',borderColor:'#5b4fcf50',maxHeight:'240px',overflowY:'auto'}}>
                                  {produtosCatalogo.length===0
                                    ? <div className="px-4 py-4 text-center">
                                        <p className="text-xs mb-1" style={{color:'#6b6860'}}>Nenhum produto cadastrado no catálogo.</p>
                                        <button onMouseDown={()=>{setAba('catproduto');setProdSelKey(null)}}
                                          className="text-xs font-bold" style={{color:'#5b4fcf'}}>
                                          Favor cadastrar — clique aqui para ir ao Catálogo de Produtos
                                        </button>
                                      </div>
                                    : <>
                                        <div className="px-3 py-1.5 border-b text-[10px] font-bold sticky top-0" style={{background:'#faf9f7',borderColor:'#e8e6e0',color:'#767069'}}>
                                          📦 Escolha um produto do catálogo ({produtosCatalogo.length})
                                        </div>
                                        {produtosCatalogo.map(p=>(
                                          <button key={p.id}
                                            onMouseDown={()=>{
                                              setServicos(prev=>prev.map(x=>x.id===s.id?{...x,produto:String(p.preco),produtoNome:p.nome}:x))
                                              setProdSelKey(null)
                                            }}
                                            className="w-full text-left px-3 py-2 flex items-center justify-between gap-2"
                                            style={{borderBottom:'1px solid #f5f4f0'}}>
                                            <span className="text-xs font-bold truncate" style={{color:'#1a1a1a'}}>{p.nome}{p.marca?<span className="font-normal text-[10px]" style={{color:'#b45309'}}> · {p.marca}</span>:null}</span>
                                            <span className="text-[10px] flex-shrink-0" style={{color:'#059669'}}>{fmtR(p.preco)}</span>
                                          </button>
                                        ))}
                                        <button onMouseDown={()=>{setAba('catproduto');setProdSelKey(null)}}
                                          className="w-full text-center px-3 py-2 text-[11px] font-bold" style={{color:'#5b4fcf',background:'#faf9f7'}}>
                                          + Não achou? Cadastrar novo produto no catálogo
                                        </button>
                                      </>}
                                </div>
                              )}
                            </div>
                            {/* Nome do produto escolhido (só exibição — o cálculo usa apenas o valor) */}
                            {f.k==='produto' && s.produtoNome && (
                              <div className="flex items-center gap-1.5 mt-1.5 pl-7">
                                <span className="text-[11px] px-2 py-1 rounded-lg font-bold" style={{background:'#5b4fcf12',color:'#5b4fcf',border:'1px solid #5b4fcf30'}}>
                                  📦 {s.produtoNome} — {fmtR(n(s.produto))}
                                </span>
                                <button onClick={()=>setServicos(p=>p.map(x=>x.id===s.id?{...x,produtoNome:''}:x))}
                                  title="Remover o nome (mantém o valor)" className="text-xs" style={{color:'#767069'}}>✕</button>
                              </div>
                            )}
                          </div>
                        ))}
                        <button onClick={()=>setServicos(p=>p.filter(x=>x.id!==s.id))}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg" style={{color:'#ef4444',border:'1px dashed #ef444440'}}>
                          <Trash2 size={12}/> Excluir este serviço
                        </button>
                      </div>
                    </div>
                    {c&&(
                      <div className="mx-4 mb-3 rounded-xl overflow-hidden border" style={{borderColor:'#e8e6e0'}}>
                        <div className="grid grid-cols-4 divide-x text-center py-2" style={{background:'#f5f4f0',borderColor:'#e8e6e0'}}>
                          {[
                            {l:'💸 Total de Despesas',sub:'Tudo que custa realizar este serviço',v:fmtR(c.total),p:`${(c.totalPct*100).toFixed(1)}%`,co:'#f59e0b'},
                            {l:'📊 Margem Operacional',sub:'O que sobrou após pagar comissão, produto, cartão e imposto',v:fmtR(c.margOp),p:`${(c.margOpPct*100).toFixed(1)}%`,co:'#06b6d4'},
                            {l:'🏢 Custo Operacional',sub:'Parte dos custos fixos do salão que este serviço cobre',v:fmtR(c.custoOpR),p:`${(c.custOpPct*100).toFixed(1)}%`,co:'#7c6fe0'},
                            {l:'🏆 Resultado Líquido',sub:'Seu lucro real após pagar absolutamente tudo',v:fmtR(c.resultado),p:`${(c.resultPct*100).toFixed(1)}%`,co:corRes(c.resultado)},
                          ].map((item,i)=>(
                            <div key={i} className="px-2 py-2">
                              <p className="text-[9px] font-bold mb-0.5" style={{color:'#767069'}}>{item.l}</p>
                              <p className="text-[8px] mb-1 leading-tight" style={{color:'#767069'}}>{item.sub}</p>
                              <p className="text-sm font-bold" style={{color:item.co}}>{item.v}</p>
                              <p className="text-[10px]" style={{color:item.co+'99'}}>{item.p} do preço</p>
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-4 text-center py-1.5 border-t text-[10px]" style={{background:'#faf9f7',borderColor:'#e8e6e0',color:'#767069'}}>
                          <div>Rateio: {fmtR(c.rateioR)}</div>
                          <div>Produto: {fmtR(c.prod)} | Cartão: {fmtR(c.cartaoR)}</div>
                          <div>Imposto: {fmtR(c.impostR)}</div>
                          <div style={{color:c.resultado>0?'#10b981':'#ef4444',fontWeight:'bold'}}>{c.resultado>0?'✅ Lucrativo':'🚨 Prejuízo'}</div>
                        </div>
                        <button onClick={()=>toggleDiag(s.id)}
                          className="w-full py-2 text-[11px] font-bold border-t transition-all"
                          style={{background:diagAbertos.has(s.id)?'#5b4fcf':'#5b4fcf12',color:diagAbertos.has(s.id)?'#fff':'#5b4fcf',borderColor:'#e8e6e0'}}>
                          💡 {diagAbertos.has(s.id)?'Ocultar':'Ver'} Diagnóstico da Comissão &amp; Recomendações
                        </button>
                        {diagAbertos.has(s.id) && (()=>{
                          const r: any = calcRecom(s)
                          if (!r) return null
                          const metaPct = (r.meta*100).toFixed(0)
                          return (
                            <div className="border-t p-4 space-y-3" style={{borderColor:'#e8e6e0',background:'#fff'}}>
                              {/* Status da comissão atual */}
                              {c.resultado < 0
                                ? <div className="rounded-xl p-3 text-xs font-bold" style={{background:'#ef444415',border:'1px solid #ef444450',color:'#b91c1c'}}>
                                    ⚠️ Sua comissão está gerando prejuízo para o salão! Perda de {fmtR(-c.resultado)} por atendimento (margem {(c.resultPct*100).toFixed(1)}%).
                                  </div>
                                : c.resultPct < r.meta
                                  ? <div className="rounded-xl p-3 text-xs font-bold" style={{background:'#f59e0b15',border:'1px solid #f59e0b50',color:'#92400e'}}>
                                      🟡 Lucro positivo ({fmtR(c.resultado)} · {(c.resultPct*100).toFixed(1)}%), mas abaixo da sua meta de {metaPct}%. Veja as opções abaixo.
                                    </div>
                                  : <div className="rounded-xl p-3 text-xs font-bold" style={{background:'#10b98115',border:'1px solid #10b98150',color:'#059669'}}>
                                      🎯 Meta atingida! Lucro de {fmtR(c.resultado)} ({(c.resultPct*100).toFixed(1)}%) por atendimento.
                                    </div>}
                              {/* Meta de lucro */}
                              <div className="rounded-xl p-3 border" style={{background:'#faf9f7',borderColor:'#5b4fcf30'}}>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-[11px] font-bold" style={{color:'#5b4fcf'}}>🎯 META DE LUCRO POR ATENDIMENTO</label>
                                  <span className="text-sm font-bold" style={{color:'#5b4fcf'}}>{metaPct}%</span>
                                </div>
                                <input type="range" min={0} max={50} step={1} value={n(metaLucroServ)||0} onChange={e=>setMetaLucroServ(e.target.value)}
                                  className="w-full" style={{accentColor:'#5b4fcf'}}/>
                                <div className="flex justify-between text-[9px]" style={{color:'#767069'}}>
                                  <span>Só não perder dinheiro (0%)</span><span style={{color:'#f59e0b',fontWeight:700}}>⭐ Saudável (15%)</span><span>50%</span>
                                </div>
                              </div>
                              {r.impossivel
                                ? <div className="rounded-xl p-3 text-xs" style={{background:'#ef444415',border:'1px solid #ef444450',color:'#b91c1c'}}>
                                    Meta impossível: custo operacional + imposto + cartão + meta ultrapassam 100% do preço. Reduza a meta ou os custos.
                                  </div>
                                : <>
                              {/* Recomendações A / B */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="rounded-xl p-3 border" style={{background:'#faf9f7',borderColor:'#e8e6e0'}}>
                                  <p className="text-[10px] font-bold mb-2" style={{color:'#767069'}}>OPÇÃO A · AJUSTAR COMISSÃO</p>
                                  {r.comMaxR < 0
                                    ? <p className="text-xs" style={{color:'#b91c1c'}}>Nem zerando a comissão a meta é atingida neste preço. Use a Opção B.</p>
                                    : <>
                                        <p className="text-[10px]" style={{color:'#767069'}}>Comissão Máxima no Preço de {fmtR(c.preco)}:</p>
                                        <p className="text-lg font-bold" style={{color:'#b45309'}}>{(r.comMaxPctPreco*100).toFixed(2)}% <span className="text-xs">({fmtR(r.comMaxR)})</span></p>
                                        <p className="text-[10px] mt-1" style={{color:'#6b6860'}}>Para aplicar, digite <strong>{(r.comMaxPctCampo*100).toFixed(1)}%</strong> no campo Rateio deste serviço.</p>
                                        {r.comMaxPctPreco < n(s.rateioP)/100 && (
                                          <p className="text-[10px] mt-2 rounded-lg p-2" style={{background:'#f59e0b15',color:'#92400e',border:'1px solid #f59e0b40'}}>
                                            ⚠️ Reduzir a comissão de forma brusca pode desmotivar o profissional e gerar debandada da equipe. Considere a Opção B (recomendada).
                                          </p>
                                        )}
                                      </>}
                                </div>
                                <div className="rounded-xl p-3 border-2" style={{background:'#5b4fcf08',borderColor:'#5b4fcf60'}}>
                                  <p className="text-[10px] font-bold mb-2" style={{color:'#5b4fcf'}}>⭐ OPÇÃO B · CORRIGIR O PREÇO (RECOMENDADA)</p>
                                  <p className="text-[10px]" style={{color:'#767069'}}>Novo Preço:</p>
                                  <p className="text-lg font-bold" style={{color:'#5b4fcf'}}>{fmtR(r.novoPreco)}</p>
                                  <div className="text-[10px] mt-1 space-y-0.5" style={{color:'#3a3835'}}>
                                    <p>Comissão do Profissional: <strong>{fmtR(r.C)}</strong> (mantida em R$)</p>
                                    <p>Comissão Percentual Equivalente: <strong>{(r.comPctEqB*100).toFixed(1)}%</strong></p>
                                    <p>Lucro Líquido do Salão: <strong style={{color:'#059669'}}>{fmtR(r.lucroB)}</strong> (Margem de {(r.meta*100).toFixed(1)}%)</p>
                                  </div>
                                  {r.arred > 0 && r.arred !== Math.round(r.novoPreco) && (
                                    <p className="text-[10px] mt-2 rounded-lg p-2" style={{background:'#10b98110',color:'#059669',border:'1px solid #10b98140'}}>
                                      💡 Sugestão de arredondamento: <strong>{fmtR(r.arred)}</strong> (lucro real estimado {(r.pctArred*100).toFixed(1)}%)
                                    </p>
                                  )}
                                  {r.aumento > 0.3 && (
                                    <p className="text-[10px] mt-2 rounded-lg p-2" style={{background:'#f59e0b15',color:'#92400e',border:'1px solid #f59e0b40'}}>
                                      ⚠️ Aumento de {(r.aumento*100).toFixed(0)}% no preço! Reajustes acima de 30% exigem cautela — avalie se o mercado suporta esse valor antes de aplicar.
                                    </p>
                                  )}
                                </div>
                              </div>
                              {/* Técnica das Três Opções */}
                              <div>
                                <p className="text-[10px] font-bold mb-2" style={{color:'#767069'}}>🤝 TÉCNICA DAS TRÊS OPÇÕES — apresente ao profissional e deixe que ele escolha:</p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <div className="rounded-xl p-3 border text-[10px] space-y-1" style={{background:'#faf9f7',borderColor:'#e8e6e0',color:'#3a3835'}}>
                                    <p className="font-bold" style={{color:'#767069'}}>1️⃣ Manter Tudo Igual</p>
                                    <p>Preço: <strong>{fmtR(c.preco)}</strong></p>
                                    <p>Comissão: <strong>{n(s.rateioP)}% ({fmtR(c.rateioR)})</strong></p>
                                    <p>Lucro do Salão: <strong style={{color:c.resultado>=0?'#059669':'#b91c1c'}}>{fmtR(c.resultado)} ({(c.resultPct*100).toFixed(1)}%)</strong></p>
                                  </div>
                                  <div className="rounded-xl p-3 border text-[10px] space-y-1" style={{background:'#faf9f7',borderColor:'#e8e6e0',color:'#3a3835'}}>
                                    <p className="font-bold" style={{color:'#767069'}}>2️⃣ Ajustar Comissão no Preço Atual</p>
                                    <p>Preço: <strong>{fmtR(c.preco)}</strong></p>
                                    <p>Comissão: <strong>{r.comMaxR>=0?`${(r.comMaxPctPreco*100).toFixed(1)}% (${fmtR(r.comMaxR)})`:'—'}</strong></p>
                                    <p>Lucro do Salão: <strong style={{color:'#059669'}}>{fmtR(r.lucroAlvoAtual)} ({metaPct}%)</strong></p>
                                  </div>
                                  <div className="rounded-xl p-3 border-2 text-[10px] space-y-1" style={{background:'#5b4fcf08',borderColor:'#5b4fcf60',color:'#3a3835'}}>
                                    <p className="font-bold" style={{color:'#5b4fcf'}}>3️⃣ Preço Corrigido ⭐ Recomendado</p>
                                    <p>Preço: <strong>{fmtR(r.novoPreco)}</strong></p>
                                    <p>Comissão: <strong>{(r.comPctEqB*100).toFixed(1)}% ({fmtR(r.C)})</strong></p>
                                    <p>Lucro do Salão: <strong style={{color:'#059669'}}>{fmtR(r.lucroB)} ({metaPct}%)</strong></p>
                                  </div>
                                </div>
                              </div>
                              </>}
                            </div>
                          )
                        })()}
                      </div>
                    )}
                    </>}
                  </div>
                )
              })}
              <div className="px-5 py-3 border-t" style={{borderColor:'#e8e6e0'}}>
                <button onClick={()=>{setServicos(p=>[...p,{id:proxServ,nome:'',preco:'',rateioP:'50',produto:'',imposto:'5'}]);setProxServ(p=>p+1);setServAbertos(prev=>new Set(prev).add(proxServ))}}
                  className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg"
                  style={{background:'#5b4fcf20',color:'#5b4fcf',border:'1px dashed #5b4fcf40'}}>
                  <Plus size={14}/> Adicionar serviço
                </button>
              </div>
            </div>

            <div className="rounded-xl p-4 text-xs space-y-1" style={{background:'#faf9f7',border:'1px solid #e8e6e0',color:'#767069'}}>
              <p className="font-bold mb-1" style={{color:'#767069'}}>💡 Fórmula do cálculo:</p>
              <p>• <strong style={{color:'#1a1a1a'}}>Rateio R$</strong> = (Preço − Cartão R$, se abatido antes) × Rateio% − (Produto × Abatimento%)</p>
              <p>• <strong style={{color:'#1a1a1a'}}>Imposto</strong>: Salão Parceiro → (Preço − Rateio) × Imp%. Normal → Preço × Imp%</p>
              <p>• <strong style={{color:'#1a1a1a'}}>Resultado</strong> = Preço − Total Despesas − Custo Operacional</p>
              <p style={{color:'#7c6fe0'}}>Verificado com a planilha: Preço R$100 | Rateio 50% | Produto R$10 | Cartão 5% | Imposto 8% → Rateio R$37,50 | Imposto R$5,00 | Total R$57,50 | Resultado R$12,50</p>
            </div>
          </div>
        )}

        {/* ════ ABA CUSTO DE PRODUTO ════ */}
        {aba==='produto' && (
          <div className="nodri-aba space-y-4">
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
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{background:'#faf9f7',border:'1px solid #e8e6e0'}}>
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{color:'#767069'}}>🔍</span>
                <input value={buscaProduto} onChange={e=>setBuscaProduto(e.target.value)}
                  placeholder="Buscar serviço pelo nome..."
                  className="w-full pl-8 pr-3 py-2 rounded-lg text-xs text-[#1a1a1a] focus:outline-none"
                  style={{background:'#f5f4f0',border:'1px solid #dedad4'}}/>
              </div>
              <button onClick={()=>setOrdenarPorLucro(v=>!v)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all"
                style={{background:ordenarPorLucro?'#10b98120':'#ffffff',color:ordenarPorLucro?'#10b981':'#767069',border:`1px solid ${ordenarPorLucro?'#10b981':'#dedad4'}`}}>
                {ordenarPorLucro ? '📈 Menor custo primeiro' : '🔤 Ordem original'}
              </button>
              {buscaProduto && <button onClick={()=>setBuscaProduto('')} className="text-xs px-2 py-1 rounded" style={{color:'#767069'}}>✕ limpar</button>}
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
                <div key={sp.id} className="rounded-2xl border overflow-hidden" style={{background:'#faf9f7',borderColor:'#e8e6e0'}}>
                  <button onClick={()=>toggleProdCard(sp.id)} className="w-full px-5 py-4 flex items-center justify-between gap-3 transition-colors" style={{background:'#ffffff'}}>
                    <div className="flex items-center gap-2 min-w-0">
                      {prodAbertos.has(sp.id) ? <ChevronUp size={14} style={{color:'#b45309',flexShrink:0}}/> : <ChevronDown size={14} style={{color:'#b45309',flexShrink:0}}/>}
                      <span className="text-lg">🧴</span>
                      <span className="font-bold text-sm truncate" style={{color:'#1a1a1a'}}>{sp.nomeServico||'Novo serviço'}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{background:'#f59e0b20',color:'#b45309'}}>{sp.ingredientes.filter(i=>i.nome).length} produto(s)</span>
                    </div>
                    {total>0&&<div className="text-right flex-shrink-0"><p className="text-[10px]" style={{color:'#767069'}}>Custo total</p><p className="font-bold text-lg" style={{color:'#b45309'}}>{fmtR(total)}</p></div>}
                  </button>
                  {prodAbertos.has(sp.id)&&<>
                  <div className="px-5 py-4 border-t" style={{borderColor:'#e8e6e0'}}>
                    <div className="max-w-xl mx-auto space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{background:'#b45309',color:'#fff'}}>1</span>
                          <label className="text-xs font-bold" style={{color:'#b45309'}}>Nome do Serviço</label>
                        </div>
                        <div className="pl-7">
                          <input value={sp.nomeServico}
                            onChange={e=>setServicoProd(p=>p.map(s=>s.id===sp.id?{...s,nomeServico:e.target.value}:s))}
                            placeholder="Ex: Coloração Longo"
                            className="w-full px-3 py-2.5 rounded-xl text-sm font-bold text-[#1a1a1a] focus:outline-none"
                            style={{background:'#fff',border:'1.5px solid #f59e0b40'}}/>
                        </div>
                      </div>
                  {sp.ingredientes.map((ing,idx)=>{
                    const custo=custoIngred(ing)
                    return(
                      <div key={idx} className="rounded-xl border p-3" style={{background:'#fffdf5',borderColor:'#f59e0b30'}}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[11px] font-bold" style={{color:'#b45309'}}>🧴 Produto {idx+1}</p>
                          <div className="flex items-center gap-2">
                            {custo>0&&<span className="text-xs font-bold" style={{color:'#f59e0b'}}>Custo/uso: {fmtR(custo)}</span>}
                            <button onClick={()=>removerIngrediente(sp.id,idx)} style={{color:'#ef4444'}}><Trash2 size={12}/></button>
                          </div>
                        </div>
                        <div className="space-y-3">
                        {/* Campo com autocomplete do catálogo */}
                        <div>
                          <label className="text-[11px] font-bold block mb-1" style={{color:'#767069'}}>Produto / Insumo <span style={{fontWeight:400}}>(busque no catálogo)</span></label>
                        <div className="relative">
                          <input value={ing.nome}
                            onChange={e=>{
                              atualizarIngrediente(sp.id,idx,'nome',e.target.value)
                              setAutocompleteKey(`${sp.id}-${idx}`)
                            }}
                            onFocus={()=>setAutocompleteKey(`${sp.id}-${idx}`)}
                            onBlur={()=>setTimeout(()=>setAutocompleteKey(null),200)}
                            placeholder="Ex: Tinta Color (buscar catálogo)"
                            className="w-full px-3 py-1.5 rounded-lg text-xs text-[#1a1a1a] focus:outline-none"
                            style={{background:'#f5f4f0',border:`1px solid ${autocompleteKey===`${sp.id}-${idx}`?'#5b4fcf':'#ffffff'}`}}/>
                          {/* Dropdown sugestões */}
                          {autocompleteKey===`${sp.id}-${idx}` && produtosCatalogo.length > 0 && (
                            <div className="absolute top-full left-0 right-0 z-50 rounded-xl border overflow-hidden shadow-2xl mt-1"
                              style={{background:'#faf9f7',borderColor:'#dedad4',maxHeight:'200px',overflowY:'auto'}}>
                              {/* Botão ver todos */}
                              <div className="px-3 py-1.5 border-b text-[10px] font-bold" style={{borderColor:'#e8e6e0',color:'#767069'}}>
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
                                  style={{borderBottom:'1px solid #e8e6e010'}}>
                                  <div>
                                    <span className="text-xs font-bold text-[#1a1a1a]">{p.nome}</span>
                                    {p.marca&&<span className="text-[10px] ml-2 px-1.5 py-0.5 rounded" style={{background:'#f59e0b20',color:'#b45309'}}>{p.marca}</span>}
                                  </div>
                                  <span className="text-[10px]" style={{color:'#059669'}}>R$ {p.preco} / {p.qtd_embalagem}{p.unidade}</span>
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
                        </div>
                        <div>
                          <label className="text-[11px] font-bold block mb-1" style={{color:'#767069'}}>Unidade</label>
                          <select value={ing.unidade} onChange={e=>atualizarIngrediente(sp.id,idx,'unidade',e.target.value)}
                            className="w-full px-3 py-2 rounded-lg text-xs text-[#1a1a1a] focus:outline-none" style={{background:'#fff',border:'1px solid #e8e6e0'}}>
                            {['ml','g','und','L','kg'].map(u=><option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 mb-1"><label className="text-[11px] font-bold" style={{color:'#767069'}}>Qtd na embalagem</label><InfoBtn id="qtdEmb"/></div>
                          <input type="number" value={ing.qtdEmb} onChange={e=>atualizarIngrediente(sp.id,idx,'qtdEmb',e.target.value)}
                            placeholder="Ex: 60" className="w-full px-3 py-2 rounded-lg text-xs text-[#1a1a1a] focus:outline-none" style={{background:'#fff',border:'1px solid #e8e6e0'}}/>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 mb-1"><label className="text-[11px] font-bold" style={{color:'#767069'}}>Preço da embalagem (R$)</label><InfoBtn id="precoEmb"/></div>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px]" style={{color:'#767069'}}>R$</span>
                            <input type="number" value={ing.preco} onChange={e=>atualizarIngrediente(sp.id,idx,'preco',e.target.value)}
                              placeholder="0" className="w-full pl-7 pr-2 py-2 rounded-lg text-xs text-[#1a1a1a] focus:outline-none" style={{background:'#fff',border:'1px solid #e8e6e0'}}/>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 mb-1"><label className="text-[11px] font-bold" style={{color:'#767069'}}>Qtd usada por serviço</label><InfoBtn id="qtdUsa"/></div>
                          <input type="number" value={ing.qtdUsa} onChange={e=>atualizarIngrediente(sp.id,idx,'qtdUsa',e.target.value)}
                            placeholder="Ex: 90" className="w-full px-3 py-2 rounded-lg text-xs text-[#1a1a1a] focus:outline-none" style={{background:'#fff',border:'1px solid #e8e6e0'}}/>
                        </div>
                        </div>
                      </div>
                    )
                  })}
                    </div>
                  </div>
                  <div className="px-5 py-3 flex items-center justify-between border-t" style={{borderColor:'#e8e6e0'}}>
                    <button onClick={()=>adicionarIngrediente(sp.id)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                      style={{background:'#f59e0b20',color:'#b45309',border:'1px dashed #f59e0b40'}}>
                      <Plus size={12}/> Adicionar produto
                    </button>
                    {total>0&&<div className="text-xs px-3 py-1.5 rounded-lg font-bold" style={{background:'#f59e0b20',color:'#b45309'}}>Total: {fmtR(total)}</div>}
                  </div>
                  </>}
                </div>
              )
            })}
            <button onClick={()=>{setServicoProd(p=>[...p,{id:proxSP,nomeServico:'',ingredientes:[{id:1,nome:'',qtdEmb:'',qtdUsa:'',preco:'',unidade:'ml'}]}]);setProxSP(p=>p+1);setProdAbertos(prev=>new Set(prev).add(proxSP))}}
              className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
              style={{background:'#5b4fcf20',color:'#5b4fcf',border:'1px dashed #5b4fcf40'}}>
              <Plus size={15}/> Adicionar outro serviço
            </button>
            <div className="rounded-xl p-4 text-xs space-y-1" style={{background:'#faf9f7',border:'1px solid #e8e6e0',color:'#767069'}}>
              <p className="font-bold mb-1" style={{color:'#767069'}}>💡 Fórmula:</p>
              <p>• Custo por uso = (Preço da embalagem ÷ Qtd da embalagem) × Qtd usada no serviço</p>
              <p style={{color:'#7c6fe0'}}>Ex: Tinta R$35,27 / 60g × 90g usados = <strong>R$52,91 de custo</strong></p>
            </div>
          </div>
        )}

        {/* ════ ABA ALUGUEL DE CADEIRA ════ */}
        {aba==='cadeira' && (
          <div className="nodri-aba space-y-4">
            <GuiaPassos passos={[
              {titulo:'Custo Operacional',desc:'Vem automático da aba RD. Se não preencheu, informe manualmente',ok:custoOp>0||n(custoOpCad)>0,cor:'#10b981'},
              {titulo:'Nº de Cadeiras',desc:'Quantas cadeiras ou postos de atendimento tem o salão',ok:rawPostosCad>0||n(numCad)>0,cor:'#f59e0b'},
              {titulo:'Ver Aluguel Sugerido',desc:'Valor mínimo e sugerido por cadeira aparecem automaticamente',ok:custPorCad>0,cor:'#5b4fcf'},
            ]}/>
            {custoOp>0&&<div className="rounded-xl p-3 text-xs" style={{background:'#5b4fcf15',border:'1px solid #5b4fcf30',color:'#7c6fe0'}}>✨ Custo operacional da aba Receitas e Despesas: <strong>{fmtR(custoOp)}</strong> — preenchido automaticamente</div>}
            <div className="rounded-2xl p-6 border" style={{background:'#faf9f7',borderColor:'#e8e6e0'}}>
              <h2 className="font-bold text-base mb-1" style={{color:'#b45309'}}>💺 Aluguel de Cadeira</h2>
              <p className="text-xs mb-5" style={{color:'#767069'}}>Quanto cobrar de aluguel por cadeira para cobrir custos e ter lucro.</p>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <label className="text-xs font-bold" style={{color:'#767069'}}>Custo Operacional Mensal Total (R$)</label>
                    <InfoBtn id="custoOpCad"/>
                    {custoOp>0 && !custoOpCad && <AvisoDefault ativo={true} padrao={`${fmtR(custoOp)} (mês atual — use média para mais precisão)`} onPreencher={()=>{}} onManter={()=>{}}/>}
                  </div>
                  <p className="text-xs mb-2" style={{color:'#6b6860'}}>
                    {mediaCustoOp>0&&fatN>0
                      ? <>Média de {qtdMesesMedia} meses: <strong style={{color:'#059669'}}>{fmtR(custoOp*(1))}</strong> — edite para usar a média histórica</>
                      : custoOp>0?'Usando mês atual — pode editar para colocar a média dos seus meses':'Preencha a aba Receitas e Despesas ou informe manualmente.'}
                  </p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{color:'#767069'}}>R$</span>
                    <input type="number" value={custoOpCad||(custoOp>0?String(Math.round(custoOp)):'')} onChange={e=>setCustoOpCad(e.target.value)}
                      placeholder={custoOp>0?custoOp.toFixed(2):'0,00'} className="w-full pl-10 pr-4 py-3 rounded-xl text-[#1a1a1a] focus:outline-none"
                      style={{background:'#f5f4f0',border:'1px solid #f59e0b60'}}/>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1"><label className="text-xs font-bold" style={{color:'#767069'}}>Cadeiras / Postos por tipo</label><InfoBtn id="numCad"/></div>
                  <p className="text-xs mb-2" style={{color:'#6b6860'}}>Manicure e maquiador contam como <strong>meio posto (0,5)</strong> por gerarem menos; cabeleireiro e estética contam como <strong>1</strong>.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {lbl:'Cabeleireiro (peso 1)', val:cadCabel, set:setCadCabel},
                      {lbl:'Estética (peso 1)',     val:cadEstet, set:setCadEstet},
                      {lbl:'Manicure (peso 0,5)',   val:cadManic, set:setCadManic},
                      {lbl:'Maquiador (peso 0,5)',  val:cadMaqui, set:setCadMaqui},
                    ].map((c,idx)=>(
                      <div key={idx}>
                        <label className="text-[11px] block mb-1" style={{color:'#6b6860'}}>{c.lbl}</label>
                        <input type="number" value={c.val} onChange={e=>c.set(e.target.value)} placeholder="0"
                          className="w-full px-3 py-2 rounded-xl text-[#1a1a1a] focus:outline-none" style={{background:'#f5f4f0',border:'1px solid #e8e6e0'}}/>
                      </div>
                    ))}
                  </div>
                  {rawPostosCad>0 && (
                    <p className="text-[11px] mt-2" style={{color:'#767069'}}>Total: <strong>{rawPostosCad}</strong> postos brutos × pesos = <strong style={{color:'#b45309'}}>{efetPostosCad.toLocaleString('pt-BR',{maximumFractionDigits:1})}</strong> postos efetivos</p>
                  )}
                  {rawPostosCad===0 && n(numCad)>0 && (
                    <p className="text-[11px] mt-2" style={{color:'#b45309'}}>Usando valor antigo salvo ({numCad} cadeiras). Preencha por tipo acima para aplicar os pesos.</p>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1"><label className="text-xs font-bold" style={{color:'#767069'}}>Horas de Funcionamento por Semana</label></div>
                  <p className="text-xs mb-2" style={{color:'#6b6860'}}>Usado para calcular o preço por hora e a diária.</p>
                  <input type="number" value={horasSemCad} onChange={e=>setHorasSemCad(e.target.value)} placeholder="Ex: 40"
                    className="w-full px-4 py-3 rounded-xl text-[#1a1a1a] focus:outline-none" style={{background:'#f5f4f0',border:'1px solid #e8e6e0'}}/>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold" style={{color:'#767069'}}>Ajustar Margem</label>
                    <span className="text-sm font-bold" style={{color:'#5b4fcf'}}>{Math.round(margemCadN*100)}%</span>
                  </div>
                  <p className="text-xs mb-2" style={{color:'#6b6860'}}>Margem de lucro sobre o preço (recomendado 35%, entre 25% e 55%).</p>
                  <input type="range" min={25} max={55} step={1} value={n(margemCad)||35} onChange={e=>setMargemCad(e.target.value)}
                    className="w-full" style={{accentColor:'#5b4fcf'}}/>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1"><label className="text-xs font-bold" style={{color:'#767069'}}>Aluguel que você cobra hoje (R$) <span style={{fontWeight:400}}>— opcional</span></label></div>
                  <p className="text-xs mb-2" style={{color:'#6b6860'}}>Se preencher, mostramos um diagnóstico comparando com o custo base.</p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{color:'#767069'}}>R$</span>
                    <input type="number" value={aluguelAtualCad} onChange={e=>setAluguelAtualCad(e.target.value)} placeholder="0,00"
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-[#1a1a1a] focus:outline-none" style={{background:'#f5f4f0',border:'1px solid #e8e6e0'}}/>
                  </div>
                </div>
              </div>
              {custPorCad>0&&(
                <div className="mt-6 space-y-3">
                  <div className="rounded-xl p-4 border" style={{background:'#f5f4f0',borderColor:'#f59e0b40'}}>
                    <p className="text-xs mb-1" style={{color:'#767069'}}>📊 Custo Base por Cadeira (ponto de equilíbrio)</p>
                    <p className="text-3xl font-bold" style={{color:'#b45309'}}>{fmtR(custPorCad)}</p>
                    <p className="text-xs mt-1" style={{color:'#6b6860'}}>Valor mínimo que cada cadeira precisa gerar só para cobrir os custos</p>
                  </div>
                  <div className="rounded-xl p-4 border" style={{background:'#f5f4f0',borderColor:'#10b98140'}}>
                    <div className="flex items-center gap-2 mb-1"><span>💰</span><p className="text-xs font-bold" style={{color:'#059669'}}>Aluguel Limpo Sugerido (mensal)</p><span className="text-xs px-2 py-0.5 rounded-full" style={{background:'#10b98120',color:'#059669'}}>margem {Math.round(margemCadN*100)}%</span></div>
                    <p className="text-3xl font-bold" style={{color:'#059669'}}>{fmtR(alugSuger)}</p>
                    <p className="text-xs mt-1" style={{color:'#6b6860'}}>Com margem sobre o preço + depreciação (5%) + vacância (30%)</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl p-4 border" style={{background:'#f5f4f0',borderColor:'#e8e6e0'}}>
                      <p className="text-[11px] mb-1" style={{color:'#767069'}}>Custo por Hora</p>
                      <p className="text-lg font-bold" style={{color:'#b45309'}}>{fmtR(custoHoraCad)}</p>
                    </div>
                    <div className="rounded-xl p-4 border" style={{background:'#f5f4f0',borderColor:'#5b4fcf40'}}>
                      <p className="text-[11px] mb-1" style={{color:'#767069'}}>Preço por Hora sugerido</p>
                      <p className="text-lg font-bold" style={{color:'#5b4fcf'}}>{fmtR(precoHoraCad)}</p>
                    </div>
                    <div className="rounded-xl p-4 border" style={{background:'#f5f4f0',borderColor:'#10b98140'}}>
                      <p className="text-[11px] mb-1" style={{color:'#767069'}}>Diária sugerida (8h)</p>
                      <p className="text-lg font-bold" style={{color:'#059669'}}>{fmtR(diariaCad)}</p>
                    </div>
                  </div>
                  {aluguelAtualCadN>0&&(
                    aluguelAtualCadN<custPorCad
                      ? <div className="rounded-xl p-4 text-xs" style={{background:'#ef444415',border:'1px solid #ef444450',color:'#b91c1c'}}>
                          <p className="font-bold mb-1">🔴 Risco financeiro</p>
                          <p>Seu aluguel atual de <strong>{fmtR(aluguelAtualCadN)}</strong> está <strong>abaixo</strong> do custo base de <strong>{fmtR(custPorCad)}</strong>. Você não está cobrindo os custos — reajuste o piso do aluguel.</p>
                        </div>
                      : <div className="rounded-xl p-4 text-xs" style={{background:'#10b98115',border:'1px solid #10b98150',color:'#059669'}}>
                          <p className="font-bold mb-1">🟢 Saudável</p>
                          <p>Seu aluguel atual de <strong>{fmtR(aluguelAtualCadN)}</strong> está <strong>acima</strong> do custo base de <strong>{fmtR(custPorCad)}</strong>. Sua operação cobre os custos.{alugSuger>aluguelAtualCadN && <> Ainda há espaço: o sugerido é <strong>{fmtR(alugSuger)}</strong>.</>}</p>
                        </div>
                  )}
                  <div className="rounded-xl p-4 text-xs space-y-1" style={{background:'#5b4fcf10',border:'1px solid #5b4fcf30',color:'#7c6fe0'}}>
                    <p><strong>💡 Resumo:</strong></p>
                    <p>• {nCadeirasCad.toLocaleString('pt-BR',{maximumFractionDigits:1})} postos efetivos × {fmtR(alugSuger)} = <strong>{fmtR(alugSuger*nCadeirasCad)}/mês arrecadado</strong></p>
                    <p>• Lucro estimado: <strong style={{color:'#059669'}}>{fmtR(alugSuger*nCadeirasCad-custoOpCadN)}/mês</strong></p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════ ABA FATURAMENTO POR M² ════ */}
        {aba==='metro' && (
          <div className="nodri-aba space-y-4">
            <GuiaPassos passos={[
              {titulo:'Faturamento Mínimo',desc:'Vem do Ponto de Equilíbrio automaticamente. Ou informe manualmente',ok:pe>0||n(fatMinM2)>0,cor:'#10b981'},
              {titulo:'Metragem do Salão',desc:'Área total do salão em metros quadrados',ok:n(mTotal)>0,cor:'#f59e0b'},
              {titulo:'Ver Resultado por M²',desc:'Faturamento necessário por metro quadrado aparece automaticamente',ok:fatPorM2>0,cor:'#5b4fcf'},
            ]}/>
            {pe>0&&<div className="rounded-xl p-3 text-xs" style={{background:'#5b4fcf15',border:'1px solid #5b4fcf30',color:'#7c6fe0'}}>✨ Ponto de equilíbrio da aba Receitas e Despesas: <strong>{fmtR(pe)}</strong> — preenchido automaticamente como faturamento mínimo</div>}
            <div className="rounded-2xl p-6 border" style={{background:'#faf9f7',borderColor:'#e8e6e0'}}>
              <h2 className="font-bold text-base mb-1" style={{color:'#0891b2'}}>📐 Faturamento por M²</h2>
              <p className="text-xs mb-5" style={{color:'#767069'}}>Quanto cada metro quadrado do salão precisa gerar para ser rentável.</p>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <label className="text-xs font-bold" style={{color:'#767069'}}>Faturamento Mínimo Necessário (R$)</label>
                    <InfoBtn id="fatMinM2"/>
                    {pe>0 && !fatMinM2 && <AvisoDefault ativo={true} padrao={`${fmtR(pe)} (mês atual — considere usar a média dos seus meses)`} onPreencher={()=>{}} onManter={()=>{}}/>}
                  </div>
                  <p className="text-xs mb-2" style={{color:'#6b6860'}}>{pe>0?'Ponto de equilíbrio do mês atual — pode editar para usar a média dos seus meses':'Preencha a aba Receitas e Despesas ou informe manualmente.'}</p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{color:'#767069'}}>R$</span>
                    <input type="number" value={fatMinM2||(pe>0?String(Math.round(pe)):'')} onChange={e=>setFatMinM2(e.target.value)}
                      placeholder={pe>0?pe.toFixed(2):'0,00'} className="w-full pl-10 pr-4 py-3 rounded-xl text-[#1a1a1a] focus:outline-none"
                      style={{background:'#f5f4f0',border:'1px solid #06b6d460'}}/>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1"><label className="text-xs font-bold" style={{color:'#767069'}}>Metragem Total do Salão (m²)</label><InfoBtn id="mTotal"/></div>
                  <input type="number" value={mTotal} onChange={e=>setMTotal(e.target.value)} placeholder="Ex: 80"
                    className="w-full px-4 py-3 rounded-xl text-[#1a1a1a] focus:outline-none" style={{background:'#f5f4f0',border:'1px solid #e8e6e0'}}/>
                </div>
              </div>
              {fatPorM2>0&&(
                <div className="mt-6 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl p-4 border" style={{background:'#f5f4f0',borderColor:'#06b6d440'}}>
                      <p className="text-xs mb-1" style={{color:'#767069'}}>📊 Faturamento por M² (P.E.)</p>
                      <p className="text-3xl font-bold" style={{color:'#0891b2'}}>{fmtR(fatPorM2)}/m²</p>
                      <p className="text-xs mt-1" style={{color:'#6b6860'}}>Meta mínima por m² para cobrir custos</p>
                    </div>
                    <div className="rounded-xl p-4 border" style={{background:'#f5f4f0',borderColor:'#10b98140'}}>
                      <div className="flex items-center gap-2 mb-1"><span>⭐</span><p className="text-xs font-bold" style={{color:'#059669'}}>Faturamento Sugerido por M²</p><span className="text-xs px-2 py-0.5 rounded-full" style={{background:'#10b98120',color:'#059669'}}>+50%</span></div>
                      <p className="text-3xl font-bold" style={{color:'#059669'}}>{fmtR(fatSugM2)}/m²</p>
                    </div>
                  </div>
                  <div className="rounded-xl p-4 border" style={{background:'#f5f4f0',borderColor:'#e8e6e0'}}>
                    <div className="flex items-center gap-1.5 mb-3"><p className="text-xs font-bold" style={{color:'#767069'}}>Calcular para um espaço específico:</p><InfoBtn id="mSala"/></div>
                    <div className="flex gap-2 items-center">
                      <input type="number" value={mSala} onChange={e=>setMSala(e.target.value)} placeholder="Ex: 15 m²"
                        className="flex-1 px-4 py-2.5 rounded-lg text-[#1a1a1a] text-sm focus:outline-none" style={{background:'#faf9f7',border:'1px solid #dedad4'}}/>
                      <span className="text-sm" style={{color:'#767069'}}>m²</span>
                    </div>
                    {fatSugSala>0&&(
                      <div className="mt-3 p-3 rounded-lg" style={{background:'#10b98115',border:'1.5px solid #10b98160'}}>
                        <p className="text-xs" style={{color:'#767069'}}>Faturamento sugerido para {mSala} m²:</p>
                        <p className="text-2xl font-bold mt-1" style={{color:'#059669'}}>{fmtR(fatSugSala)}/mês</p>
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
          <div className="nodri-aba space-y-5">

            {!fatN ? (
              <div className="rounded-2xl p-10 text-center border" style={{background:'#faf9f7',borderColor:'#e8e6e0'}}>
                <p className="text-4xl mb-3">📊</p>
                <p className="font-bold text-[#1a1a1a] mb-1">Nenhum dado ainda</p>
                <p className="text-sm" style={{color:'#767069'}}>Preencha o Faturamento e as Despesas na aba <strong style={{color:'#7c6fe0'}}>Receitas e Despesas</strong> para ver os gráficos.</p>
              </div>
            ) : (
              <>
                {/* Score de saúde financeira */}
                {scoreFinanceiro && (
                  <div className="rounded-2xl p-5 border" style={{background:'#faf9f7',borderColor:`${scoreFinanceiro.cor}30`}}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-xs font-bold mb-0.5" style={{color:'#767069'}}>SCORE DE SAÚDE FINANCEIRA</p>
                        <p className="text-2xl font-bold" style={{color:scoreFinanceiro.cor}}>{scoreFinanceiro.icone} {scoreFinanceiro.label}</p>
                        <p className="text-xs mt-1" style={{color:'#767069'}}>{scoreFinanceiro.sub}</p>
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
                    <div className="flex justify-between text-[10px] mt-1" style={{color:'#767069'}}>
                      <span>0 — Crítico</span><span>50 — Atenção</span><span>75 — Saudável</span><span>100</span>
                    </div>
                  </div>
                )}

                {/* Visão geral — barras horizontais de distribuição */}
                <div className="rounded-2xl border overflow-hidden" style={{background:'#faf9f7',borderColor:'#e8e6e0'}}>
                  <div className="px-5 py-3 border-b" style={{background:'#ffffff',borderColor:'#e8e6e0'}}>
                    <p className="font-bold text-sm" style={{color:'#1a1a1a'}}>Distribuição do Faturamento</p>
                    <p className="text-xs mt-0.5" style={{color:'#767069'}}>Para onde vai cada R$ que entra no salão</p>
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
                              <span className="text-xs w-12 text-right" style={{color:'#767069'}}>{pct.toFixed(1)}%</span>
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
                    <div className="pt-2 border-t" style={{borderColor:'#e8e6e0'}}>
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span style={{color:'#767069'}}>📊 Faturamento Total</span>
                        <span style={{color:'#1a1a1a'}}>{fmtR(fatN)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ranking de despesas — maiores custos */}
                <div className="rounded-2xl border overflow-hidden" style={{background:'#faf9f7',borderColor:'#e8e6e0'}}>
                  <div className="px-5 py-3 border-b" style={{background:'#ffffff',borderColor:'#e8e6e0'}}>
                    <p className="font-bold text-sm" style={{color:'#1a1a1a'}}>Ranking — O que mais consome seu caixa</p>
                    <p className="text-xs mt-0.5" style={{color:'#767069'}}>
                      Do maior para o menor — lançamentos da mesma despesa entram somados
                      {totalDespesasRank > 0 && <> · total <strong style={{color:'#1a1a1a'}}>{fmtR(totalDespesasRank)}</strong></>}
                    </p>
                  </div>
                  <div className="p-4">
                    {todasDespesas.length === 0 ? (
                      <p className="text-xs text-center py-4" style={{color:'#6b6860'}}>Preencha as despesas na aba Receitas e Despesas</p>
                    ) : (<>
                      {/* Colunas: a altura e o quanto a despesa pesa em relacao a maior.
                          Rola de lado quando ha muitas — espremer 15 colunas em 390px
                          deixaria cada uma com 20px e ilegivel. */}
                      <div className="overflow-x-auto pb-1" style={{WebkitOverflowScrolling:'touch'}}>
                        <div className="flex items-end gap-2" style={{height:200,minWidth:'min-content'}}>
                          {todasDespesas.map((d,idx)=>{
                            const alt = Math.max((d.valor/maxDespesa)*150, 6)
                            const cor = CORES_BARRA[idx % CORES_BARRA.length]
                            const sel = barraSel === idx
                            return (
                              <button key={idx} onClick={()=>setBarraSel(idx)}
                                title={`${d.nome} — ${fmtR(d.valor)}`}
                                className="flex flex-col items-center justify-end flex-shrink-0"
                                style={{width:62,height:'100%',background:'transparent',border:'none',cursor:'pointer',padding:0}}>
                                <span className="text-[10px] font-bold mb-1 whitespace-nowrap" style={{color: sel ? '#1a1a1a' : '#6b6860'}}>
                                  {fmtR(d.valor)}
                                </span>
                                <div style={{
                                  width:'100%', height:alt, background:cor, borderRadius:'4px 4px 0 0',
                                  opacity: sel ? 1 : .82,
                                  boxShadow: sel ? `0 0 0 2px #1a1a1a30` : 'none',
                                  transition:'height .4s ease, opacity .2s',
                                }}/>
                              </button>
                            )
                          })}
                        </div>
                        {/* Nomes numa faixa propria, alinhados com as colunas */}
                        <div className="flex gap-2 mt-1.5" style={{minWidth:'min-content'}}>
                          {todasDespesas.map((d,idx)=>(
                            <div key={idx} className="flex-shrink-0 text-center" style={{width:62}}>
                              <p className="text-[9px] font-bold leading-tight" style={{
                                color: barraSel===idx ? '#1a1a1a' : '#767069',
                                display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden',
                              }}>{d.nome}</p>
                              {d.qtd > 1 && <p className="text-[8px]" style={{color:'#9ca3af'}}>{d.qtd}x</p>}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Detalhe da coluna escolhida — evita poluir o grafico com texto */}
                      {(()=>{
                        const d = todasDespesas[Math.min(barraSel, todasDespesas.length-1)]
                        if (!d) return null
                        const pctFat = fatN > 0 ? (d.valor/fatN)*100 : 0
                        const sem = semaforoDespesa(d.nome, d.valor)
                        const cores: Record<string,string> = {indireta:'#f59e0b', provisao:'#7c6fe0', direta:'#ef4444'}
                        const cor = cores[d.tipo] || '#767069'
                        return (
                          <div className="rounded-xl p-3 mt-3" style={{background:'#f5f4f0',border:'1px solid #e8e6e0'}}>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-bold truncate" style={{color:'#1a1a1a'}}>{d.nome}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded flex-shrink-0" style={{background:`${cor}20`,color:cor}}>
                                {d.tipo === 'indireta' ? 'Indireta' : d.tipo === 'provisao' ? 'Provisão' : 'Direta'}
                              </span>
                            </div>
                            <p className="text-lg font-bold" style={{color:'#1a1a1a'}}>{fmtR(d.valor)}</p>
                            <div className="flex items-center justify-between gap-2 mt-1 flex-wrap">
                              <span className="text-[10px]" style={{color:sem.cor}}>{sem.icone} {sem.label}</span>
                              <span className="text-[10px]" style={{color:'#6b6860'}}>{pctFat.toFixed(1)}% do faturamento</span>
                            </div>
                            {d.qtd > 1 && (
                              <p className="text-[10px] mt-1" style={{color:'#4338ca'}}>
                                soma de {d.qtd} lançamentos deste mês
                              </p>
                            )}
                          </div>
                        )
                      })()}
                      <p className="text-[10px] text-center mt-2" style={{color:'#9ca3af'}}>Toque numa barra para ver os detalhes</p>
                    </>)}
                  </div>
                </div>

                {/* Realizado vs Meta */}
                <div className="rounded-2xl border overflow-hidden" style={{background:'#faf9f7',borderColor:'#e8e6e0'}}>
                  <div className="px-5 py-3 border-b" style={{background:'#ffffff',borderColor:'#e8e6e0'}}>
                    <p className="font-bold text-sm" style={{color:'#1a1a1a'}}>Realizado vs Meta (Metodologia Recomendada)</p>
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
                          <div className="flex justify-between text-[9px] mt-0.5 mb-1" style={{color:'#767069'}}>
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
                      <p className="text-sm font-bold" style={{color:'#059669'}}>Nenhum alerta crítico!</p>
                      <p className="text-xs mt-1" style={{color:'#767069'}}>Suas despesas estão dentro dos parâmetros saudáveis.</p>
                    </div>
                  )
                  return (
                    <div className="rounded-2xl border overflow-hidden" style={{background:'#faf9f7',borderColor:'#e8e6e0'}}>
                      <div className="px-5 py-3 border-b" style={{background:'#ffffff',borderColor:'#e8e6e0'}}>
                        <p className="font-bold text-sm" style={{color:'#ef4444'}}>Alertas — Ação Necessária</p>
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
                  <div className="rounded-2xl border overflow-hidden" style={{background:'#faf9f7',borderColor:'#e8e6e0'}}>
                    <div className="px-5 py-3 border-b" style={{background:'#ffffff',borderColor:'#e8e6e0'}}>
                      <p className="font-bold text-sm" style={{color:'#1a1a1a'}}>Evolução Mensal — últimos {historicoMeses.length} meses</p>
                      <p className="text-xs mt-0.5" style={{color:'#767069'}}>Comparativo de Faturamento, Custo e Resultado mês a mês</p>
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
                            <p className="text-xs font-bold mb-2" style={{color:'#767069'}}>{label}</p>
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
                          <div className="grid grid-cols-2 gap-3 pt-2 border-t" style={{borderColor:'#e8e6e0'}}>
                            <div className="rounded-xl p-3" style={{background:'#f5f4f0'}}>
                              <p className="text-[10px]" style={{color:'#767069'}}>Variação Faturamento (vs mês anterior)</p>
                              <p className="text-lg font-bold" style={{color:varFat>=0?'#10b981':'#ef4444'}}>{varFat>=0?'+':''}{varFat.toFixed(1)}%</p>
                            </div>
                            <div className="rounded-xl p-3" style={{background:'#f5f4f0'}}>
                              <p className="text-[10px]" style={{color:'#767069'}}>Variação Resultado (vs mês anterior)</p>
                              <p className="text-lg font-bold" style={{color:varRes>=0?'#10b981':'#ef4444'}}>{varRes>=0?'+':''}{varRes.toFixed(1)}%</p>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                )}
                {historicoMeses.length <= 1 && (
                  <div className="rounded-xl p-4 text-center" style={{background:'#faf9f7',border:'1px solid #e8e6e0'}}>
                    <p className="text-2xl mb-1">📅</p>
                    <p className="text-sm font-bold" style={{color:'#767069'}}>Comparativo mensal disponível com 2+ meses salvos</p>
                    <p className="text-xs mt-1" style={{color:'#767069'}}>Salve os dados deste mês e do próximo para ver a evolução</p>
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
                <div><label className="text-xs font-bold block mb-1" style={{color:'#767069'}}>Nome do Serviço *</label>
                  <input value={fsNome} onChange={e=>setFsNome(e.target.value)} placeholder="Ex: Coloração Completa"
                    className="w-full px-3 py-2 rounded-xl text-sm text-[#1a1a1a] focus:outline-none" style={{background:'#f5f4f0',border:'1px solid #dedad4'}}/></div>
                <div><label className="text-xs font-bold block mb-1" style={{color:'#767069'}}>Rateio Profissional (%)</label>
                  <input type="number" value={fsRateio} onChange={e=>setFsRateio(e.target.value)} placeholder="50"
                    className="w-full px-3 py-2 rounded-xl text-sm text-[#1a1a1a] focus:outline-none" style={{background:'#f5f4f0',border:'1px solid #dedad4'}}/></div>
                <div><label className="text-xs font-bold block mb-1" style={{color:'#767069'}}>Imposto (%)</label>
                  <input type="number" value={fsImposto} onChange={e=>setFsImposto(e.target.value)} placeholder="5"
                    className="w-full px-3 py-2 rounded-xl text-sm text-[#1a1a1a] focus:outline-none" style={{background:'#f5f4f0',border:'1px solid #dedad4'}}/></div>
                <div><label className="text-xs font-bold block mb-1" style={{color:'#767069'}}>Produto Padrão (R$)</label>
                  <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{color:'#767069'}}>R$</span>
                  <input type="number" value={fsProduto} onChange={e=>setFsProduto(e.target.value)} placeholder="0"
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-sm text-[#1a1a1a] focus:outline-none" style={{background:'#f5f4f0',border:'1px solid #dedad4'}}/></div></div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={()=>salvarServico(editandoServ||undefined)} disabled={!fsNome||salvandoCat}
                  className="px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
                  style={{background:'#5b4fcf',color:'white'}}>
                  {salvandoCat?'Salvando...':editandoServ?'Salvar alterações':'Cadastrar Serviço'}
                </button>
                {editandoServ&&<button onClick={()=>{setEditandoServ(null);setFsNome('');setFsRateio('50');setFsImposto('5');setFsProduto('0')}}
                  className="px-4 py-2 rounded-xl text-xs" style={{background:'#ffffff',color:'#767069'}}>Cancelar</button>}
                {msgCat&&<span className="text-xs font-bold" style={{color:'#059669'}}>{msgCat}</span>}
              </div>
            </div>
            {/* Lista */}
            <div className="rounded-2xl border overflow-hidden" style={{background:'#faf9f7',borderColor:'#e8e6e0'}}>
              <div className="flex items-center justify-between px-5 py-3 border-b" style={{background:'#ffffff',borderColor:'#e8e6e0'}}>
                <span className="font-bold text-sm text-[#1a1a1a]">Serviços Cadastrados ({servicosCatalogo.length})</span>
                <input value={buscarServico} onChange={e=>setBuscarServico(e.target.value)} placeholder="🔍 Buscar serviço..."
                  className="px-3 py-1.5 rounded-lg text-xs text-[#1a1a1a] focus:outline-none w-48" style={{background:'#f5f4f0',border:'1px solid #dedad4'}}/>
              </div>
              {servicosCatalogo.filter(s=>s.nome.toLowerCase().includes(buscarServico.toLowerCase())).length===0
                ? <p className="text-center py-8 text-sm" style={{color:'#6b6860'}}>Nenhum serviço cadastrado ainda</p>
                : servicosCatalogo.filter(s=>s.nome.toLowerCase().includes(buscarServico.toLowerCase())).map(s=>(
                  <div key={s.id} className="border-b" style={{borderColor:'#e8e6e010'}}>
                    <div className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-white/2"
                      onClick={()=>setAcordeaoServ(acordeaoServ===s.id?null:s.id)}>
                      <div className="flex items-center gap-3">
                        <span className="text-xs" style={{color:'#767069'}}>{acordeaoServ===s.id?'▼':'▶'}</span>
                        <span className="text-sm font-bold text-[#1a1a1a]">{s.nome}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs" style={{color:'#7c6fe0'}}>Rateio: {s.rateio_pct}%</span>
                        <span className="text-xs" style={{color:'#b45309'}}>Imposto: {s.imposto_pct}%</span>
                        <button onClick={e=>{e.stopPropagation();editarServico(s)}} className="text-xs px-2 py-1 rounded" style={{background:'#5b4fcf20',color:'#7c6fe0'}}>✏️ Editar</button>
                        <button onClick={e=>{e.stopPropagation();excluirServico(s.id)}} className="text-xs px-2 py-1 rounded" style={{background:'#ef444420',color:'#dc2626'}}>🗑️</button>
                      </div>
                    </div>
                    {acordeaoServ===s.id&&(
                      <div className="px-5 pb-3 grid grid-cols-3 gap-3">
                        {[{l:'Rateio',v:`${s.rateio_pct}%`},{l:'Imposto',v:`${s.imposto_pct}%`},{l:'Produto padrão',v:`R$ ${s.produto_padrao||0}`}].map((i,idx)=>(
                          <div key={idx} className="rounded-lg p-3 text-center" style={{background:'#f5f4f0'}}>
                            <p className="text-[10px]" style={{color:'#767069'}}>{i.l}</p>
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
          <div className="nodri-aba space-y-4">
            {/* Formulário cadastro */}
            <div className="rounded-2xl p-5 border" style={{background:'#faf9f7',borderColor:'#f59e0b40'}}>
              <h3 className="font-bold text-sm mb-4" style={{color:'#b45309'}}>{editandoProd?'✏️ Editar Produto':'➕ Cadastrar Novo Produto'}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                <div className="col-span-2"><label className="text-xs font-bold block mb-1" style={{color:'#767069'}}>Nome do Produto *</label>
                  <input value={fNome} onChange={e=>setFNome(e.target.value)} placeholder="Ex: Tinta Color Sem Amônia"
                    className="w-full px-3 py-2 rounded-xl text-sm text-[#1a1a1a] focus:outline-none" style={{background:'#f5f4f0',border:'1px solid #dedad4'}}/></div>
                <div><label className="text-xs font-bold block mb-1" style={{color:'#767069'}}>Marca</label>
                  <input value={fMarca} onChange={e=>setFMarca(e.target.value)} placeholder="Ex: Wella"
                    className="w-full px-3 py-2 rounded-xl text-sm text-[#1a1a1a] focus:outline-none" style={{background:'#f5f4f0',border:'1px solid #dedad4'}}/></div>
                <div><label className="text-xs font-bold block mb-1" style={{color:'#767069'}}>Unidade</label>
                  <select value={fUnid} onChange={e=>setFUnid(e.target.value)} className="w-full px-3 py-2 rounded-xl text-sm text-[#1a1a1a] focus:outline-none" style={{background:'#f5f4f0',border:'1px solid #dedad4'}}>
                    {['ml','g','und','L','kg','outros'].map(u=><option key={u} value={u}>{u}</option>)}</select></div>
                <div><label className="text-xs font-bold block mb-1" style={{color:'#767069'}}>Qtd da Embalagem</label>
                  <input type="number" value={fQtd} onChange={e=>setFQtd(e.target.value)} placeholder="Ex: 60"
                    className="w-full px-3 py-2 rounded-xl text-sm text-[#1a1a1a] focus:outline-none" style={{background:'#f5f4f0',border:'1px solid #dedad4'}}/></div>
                <div><label className="text-xs font-bold block mb-1" style={{color:'#767069'}}>Preço da Embalagem (R$)</label>
                  <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{color:'#767069'}}>R$</span>
                  <input type="number" value={fPreco} onChange={e=>setFPreco(e.target.value)} placeholder="Ex: 35,27"
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-sm text-[#1a1a1a] focus:outline-none" style={{background:'#f5f4f0',border:'1px solid #dedad4'}}/></div></div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={()=>salvarProduto(editandoProd||undefined)} disabled={!fNome||salvandoCat}
                  className="px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
                  style={{background:'#f59e0b',color:'#000'}}>
                  {salvandoCat?'Salvando...':editandoProd?'Salvar alterações':'Cadastrar Produto'}
                </button>
                {editandoProd&&<button onClick={()=>{setEditandoProd(null);setFNome('');setFMarca('');setFUnid('ml');setFQtd('');setFPreco('')}}
                  className="px-4 py-2 rounded-xl text-xs" style={{background:'#ffffff',color:'#767069'}}>Cancelar</button>}
                {msgCat&&<span className="text-xs font-bold" style={{color:'#059669'}}>{msgCat}</span>}
              </div>
            </div>
            {/* Lista */}
            <div className="rounded-2xl border overflow-hidden" style={{background:'#faf9f7',borderColor:'#e8e6e0'}}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3 border-b" style={{background:'#ffffff',borderColor:'#e8e6e0'}}>
                <span className="font-bold text-sm text-[#1a1a1a] whitespace-nowrap">Produtos Cadastrados ({produtosCatalogo.length})</span>
                <input value={buscarProduto} onChange={e=>setBuscarProduto(e.target.value)} placeholder="🔍 Buscar produto..."
                  className="px-3 py-1.5 rounded-lg text-xs text-[#1a1a1a] focus:outline-none w-full sm:w-48" style={{background:'#f5f4f0',border:'1px solid #dedad4'}}/>
              </div>
              {produtosCatalogo.filter(p=>p.nome.toLowerCase().includes(buscarProduto.toLowerCase())).length===0
                ? <p className="text-center py-8 text-sm" style={{color:'#6b6860'}}>Nenhum produto cadastrado ainda</p>
                : produtosCatalogo.filter(p=>p.nome.toLowerCase().includes(buscarProduto.toLowerCase())).map(p=>(
                  <div key={p.id} className="border-b" style={{borderColor:'#e8e6e010'}}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3 cursor-pointer hover:bg-white/2"
                      onClick={()=>setAcordeaoProd(acordeaoProd===p.id?null:p.id)}>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs" style={{color:'#767069'}}>{acordeaoProd===p.id?'▼':'▶'}</span>
                        <span className="text-sm font-bold text-[#1a1a1a]">{p.nome}</span>
                        {p.marca&&<span className="text-xs px-2 py-0.5 rounded-full" style={{background:'#f59e0b20',color:'#b45309'}}>{p.marca}</span>}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs whitespace-nowrap" style={{color:'#059669'}}>R$ {p.preco} / {p.qtd_embalagem}{p.unidade}</span>
                        <button onClick={e=>{e.stopPropagation();editarProduto(p);setAba('catproduto')}} className="text-xs px-2 py-1 rounded" style={{background:'#5b4fcf20',color:'#7c6fe0'}}>✏️ Editar</button>
                        <button onClick={e=>{e.stopPropagation();excluirProduto(p.id)}} className="text-xs px-2 py-1 rounded" style={{background:'#ef444420',color:'#dc2626'}}>🗑️</button>
                      </div>
                    </div>
                    {acordeaoProd===p.id&&(
                      <div className="px-5 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[{l:'Unidade',v:p.unidade},{l:'Qtd Embalagem',v:`${p.qtd_embalagem}${p.unidade}`},{l:'Preço',v:`R$ ${p.preco}`},{l:'Custo/unidade',v:`R$ ${p.qtd_embalagem>0?(p.preco/p.qtd_embalagem).toFixed(4):'-'}`}].map((i,idx)=>(
                          <div key={idx} className="rounded-lg p-3 text-center" style={{background:'#f5f4f0'}}>
                            <p className="text-[10px]" style={{color:'#767069'}}>{i.l}</p>
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
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{borderColor:'#e8e6e0'}}>
              <div>
                <h2 className="font-bold text-base" style={{color:'#b45309'}}>📋 Catálogo de Despesas</h2>
                <p className="text-xs mt-0.5" style={{color:'#767069'}}>Cadastre suas despesas para usar autocomplete em todos os campos</p>
              </div>
              <button onClick={()=>{setShowCatDespesa(false);setEditDespCat(null);setFdNome('');setFdCat('indireta');setFdObs('')}}
                className="p-2 rounded-lg hover:bg-white/5" style={{color:'#767069'}}><X size={18}/></button>
            </div>

            {/* Formulário */}
            <div className="px-6 py-4 border-b" style={{borderColor:'#e8e6e0',background:'#ffffff'}}>
              <p className="text-xs font-bold mb-3" style={{color:'#767069'}}>{editDespCat ? '✏️ Editando despesa' : '➕ Nova despesa'}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold mb-1 block" style={{color:'#767069'}}>NOME DA DESPESA</label>
                  <input value={fdNome} onChange={e=>setFdNome(e.target.value)} placeholder="Ex: Aluguel, Internet, Salários..."
                    className="w-full px-3 py-2 rounded-lg text-sm text-[#1a1a1a] focus:outline-none"
                    style={{background:'#faf9f7',border:'1px solid #dedad4'}}/>
                </div>
                <div>
                  <label className="text-[10px] font-bold mb-1 block" style={{color:'#767069'}}>CATEGORIA</label>
                  <select value={fdCat} onChange={e=>setFdCat(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm text-[#1a1a1a] focus:outline-none"
                    style={{background:'#faf9f7',border:'1px solid #dedad4'}}>
                    <option value="indireta">Indireta (fixa)</option>
                    <option value="direta">Direta</option>
                    <option value="outras">Outras / Capital</option>
                  </select>
                </div>
              </div>
              <div className="mt-3">
                <label className="text-[10px] font-bold mb-1 block" style={{color:'#767069'}}>OBSERVAÇÃO (opcional)</label>
                <input value={fdObs} onChange={e=>setFdObs(e.target.value)} placeholder="Descrição ou dica para esta despesa"
                  className="w-full px-3 py-2 rounded-lg text-sm text-[#1a1a1a] focus:outline-none"
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
                    className="px-4 py-2 rounded-lg text-sm" style={{background:'#ffffff',color:'#767069'}}>
                    Cancelar
                  </button>
                )}
                {despesasCatalogo.length === 0 && (
                  <button onClick={seedDespesas}
                    className="ml-auto px-4 py-2 rounded-lg text-xs" style={{background:'#ffffff',color:'#767069',border:'1px dashed #dedad4'}}>
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
                            <div key={d.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/3" style={{background:'#ffffff',border:'1px solid #e8e6e010'}}>
                              <div>
                                <span className="text-sm text-[#1a1a1a]">{d.nome}</span>
                                {d.observacao && <span className="ml-2 text-[10px]" style={{color:'#6b6860'}}>{d.observacao}</span>}
                              </div>
                              <div className="flex gap-2">
                                <button onClick={()=>{setEditDespCat(d);setFdNome(d.nome);setFdCat(d.categoria);setFdObs(d.observacao||'')}}
                                  className="p-1.5 rounded-lg hover:bg-white/5" style={{color:'#b45309'}} title="Editar">
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

