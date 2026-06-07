'use client'

import { useState } from 'react'
import { ArrowLeft, Plus, Trash2, Calculator, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmtR = (v: number) => `R$ ${(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const n = (s: string) => parseFloat((s||'0').replace(',','.')) || 0
const pctStr = (v: number, t: number) => t > 0 ? `${((v/t)*100).toFixed(1)}%` : '—'

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
  // Aba ativa
  const [aba, setAba] = useState<'rd'|'pe'|'servicos'|'produto'|'cadeira'|'metro'>('rd')

  // ── Receitas e Despesas ──────────────────────────────────────────────────
  const [fat,      setFat]      = useState('')
  const [custIndD, setCustIndD] = useState('30')   // % custo indireto desejado
  const [custDirD, setCustDirD] = useState('55')   // % custo direto desejado
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
  const [vlrProdEstoque,setVlrProdEstoque]= useState('')

  // Cálculos Receitas e Despesas
  const fatN       = n(fat)
  const depMensal  = n(totalDeprec) > 0 ? n(totalDeprec) / 60 : 0
  const totInd     = despInd.reduce((s,d)=>s+n(d.valor),0) + extrasDespInd.reduce((s,d)=>s+n(d.valor),0)
  const totProvisao= n(sal13) + n(ferias) + n(fgtsR)
  const custoOp    = totInd + totProvisao + depMensal
  const totDiretas = n(imposto) + n(produto) + n(rateio) + n(taxaC)
  const margOpR    = fatN - totDiretas
  const margOpPct  = fatN > 0 ? margOpR / fatN : 0
  const resultOp   = margOpR - custoOp
  const resultOpPct= fatN > 0 ? resultOp / fatN : 0
  const totOutras  = n(aquisicaoEq) + n(distSocios)
  const resultFin  = resultOp - totOutras
  const rentab     = fatN > 0 ? resultFin / fatN : 0
  const pe         = margOpPct > 0 ? custoOp / margOpPct : 0
  const peLucro    = (margOpPct - n(lucroD)/100) > 0 ? custoOp / (margOpPct - n(lucroD)/100) : 0
  const capGiro    = custoOp > 0 ? (custoOp / 30) * 30 : 0 // simplificado

  // ── Ponto de Equilíbrio detalhado ───────────────────────────────────────
  const [areaM2,     setAreaM2]     = useState('100')
  const [numProfs,   setNumProfs]   = useState('3')
  const [margemPE,   setMargemPE]   = useState('')  // % margem op (puxa do RD se vazio)
  const [metaLucroPE,setMetaLucroPE] = useState('') // % lucro (puxa do RD se vazio)
  const [fatPEManual,setFatPEManual] = useState('') // faturamento (puxa do RD se vazio)
  const [simDespesa, setSimDespesa]  = useState('') // simulador de despesa

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
  const [servicos,    setServicos]    = useState<Servico[]>([{id:1,nome:'',preco:'',rateioP:'',produto:'',imposto:''}])
  const [proxServ,    setProxServ]    = useState(2)
  const [taxaCartao,  setTaxaCartao]  = useState('5')
  const [abatProd,    setAbatProd]    = useState('100')  // % abatimento produto
  const [custOpServ,  setCustOpServ]  = useState('')     // % custo op (puxa do RD)
  const [taxaAntesRateio, setTaxaAntesRateio] = useState(true)
  const [prodAntesRateio, setProdAntesRateio] = useState(true)
  const [salaoParceiro,   setSalaoParceiro]   = useState(true)

  const custOpServN = n(custOpServ)/100 || (fatN > 0 && custoOp > 0 ? custoOp/fatN : 0.30)

  function calcServ(s: Servico) {
    const preco = n(s.preco)
    if (!preco) return null
    const rP    = n(s.rateioP) / 100
    const prod  = n(s.produto)
    const imp   = n(s.imposto) / 100
    const taxC  = n(taxaCartao) / 100
    const abat  = n(abatProd) / 100

    // Fórmula exata da planilha DV:
    // Rateio R$ = (Preço × Rateio%) - IF(taxaAntesRateio, Preço×Rateio%×Taxa, 0) - IF(prodAntesRateio, Produto×Abatimento, 0)
    const baseRateio = preco * rP
    const abatTaxa   = taxaAntesRateio ? baseRateio * taxC : 0
    const abatProdR  = prodAntesRateio  ? prod * abat      : 0
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

  // ── Custo de Produto ─────────────────────────────────────────────────────
  const [servicosProd, setServicoProd] = useState<ServicoProd[]>([
    {id:1, nomeServico:'', ingredientes:[{id:1,nome:'',qtdEmb:'',qtdUsa:'',preco:'',unidade:'ml'}]}
  ])
  const [proxSP, setProxSP] = useState(2)

  function custoIngred(i: Ingrediente): number {
    const emb = n(i.qtdEmb), usa = n(i.qtdUsa), prec = n(i.preco)
    return emb > 0 ? (prec / emb) * usa : 0
  }

  // ── Aluguel de Cadeira ───────────────────────────────────────────────────
  const [numCad,    setNumCad]    = useState('')
  const [custoOpCad,setCustoOpCad]= useState('')

  const custoOpCadN = n(custoOpCad) || custoOp
  const custPorCad  = n(numCad) > 0 ? custoOpCadN / n(numCad) : 0
  const alugSuger   = custPorCad * 1.5

  // ── Faturamento por M² ───────────────────────────────────────────────────
  const [mTotal,  setMTotal]  = useState('')
  const [fatMinM2,setFatMinM2]= useState('')
  const [mSala,   setMSala]   = useState('')

  const fatMinM2N   = n(fatMinM2) || pe
  const fatPorM2    = n(mTotal) > 0 ? fatMinM2N / n(mTotal) : 0
  const fatSugM2    = fatPorM2 * 1.5
  const fatSugSala  = n(mSala) > 0 ? fatSugM2 * n(mSala) : 0

  // ── IA ───────────────────────────────────────────────────────────────────
  const [analiseIA,  setAnaliseIA]  = useState('')
  const [loadingIA,  setLoadingIA]  = useState(false)
  const [erroIA,     setErroIA]     = useState('')

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
1. 🔍 DIAGNÓSTICO (margem saudável: >20%, atenção: 10-20%, crítica: <10%)
2. ⚡ TOP 3 CUSTOS PARA REDUZIR com ação específica e impacto em R$
3. 📊 BENCHMARKS: Aluguel máx 10%, Salários 35-45%, Produtos 8-12%, Marketing 3-5%
4. 💡 3 AÇÕES PRÁTICAS com impacto estimado
5. 🎯 META: faturamento ideal para margem de 25%

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
    {id:'rd',     label:'Receitas e Despesas', icon:'📊'},
    {id:'pe',     label:'Ponto de Equilíbrio', icon:'⚖️'},
    {id:'servicos',label:'Calcular Serviços',  icon:'💇'},
    {id:'produto', label:'Custo de Produto',   icon:'🧴'},
    {id:'cadeira', label:'Aluguel de Cadeira', icon:'💺'},
    {id:'metro',   label:'Faturamento por M²', icon:'📐'},
  ] as const

  return (
    <div className="min-h-screen" style={{background:'#0a0f1a',color:'#e2e8f0'}}>
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <a href="/salon" className="p-2 rounded-lg hover:bg-white/5" style={{color:'#94a3b8'}}><ArrowLeft size={18}/></a>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Calculator size={22} style={{color:'#7c5cfc'}}/>Calculadoras do Salão
            </h1>
            <p className="text-xs mt-0.5" style={{color:'#64748b'}}>
              Baseado na metodologia Dra. Dani Venâncio — dados interligados entre as calculadoras
            </p>
          </div>
        </div>

        {/* Abas */}
        <div className="grid grid-cols-6 gap-1 mb-6 p-1 rounded-xl" style={{background:'#111827'}}>
          {ABAS.map(a=>(
            <button key={a.id} onClick={()=>setAba(a.id as any)}
              className="py-2 px-1 rounded-lg text-[10px] font-bold transition-all text-center"
              style={{background:aba===a.id?'#7c5cfc':'transparent',color:aba===a.id?'white':'#64748b'}}>
              <div>{a.icon}</div><div className="mt-0.5 leading-tight">{a.label}</div>
            </button>
          ))}
        </div>

        {/* ════ ABA RECEITAS E DESPESAS ════ */}
        {aba==='rd' && (
          <div className="space-y-4">

            {/* Card configurações */}
            <div className="rounded-2xl p-5 border" style={{background:'#111827',borderColor:'#7c5cfc40'}}>
              <h3 className="font-bold text-sm mb-4" style={{color:'#7c5cfc'}}>⚙️ Configurações</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs font-bold block mb-1" style={{color:'#94a3b8'}}>💰 Faturamento Mensal (R$)</label>
                  <p className="text-xs mb-1" style={{color:'#475569'}}>Média dos últimos 12 meses ÷ 12</p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{color:'#64748b'}}>R$</span>
                    <input type="number" value={fat} onChange={e=>setFat(e.target.value)} placeholder="Ex: 50000"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl text-white text-base font-bold focus:outline-none"
                      style={{background:'#0a0f1a',border:'1px solid #7c5cfc60'}}/>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {l:'Custo Indireto Desejado',v:custIndD,set:setCustIndD,c:'#f59e0b',dica:'Padrão DV: 30%'},
                    {l:'Custo Direto Desejado',v:custDirD,set:setCustDirD,c:'#ef4444',dica:'Padrão DV: 55%'},
                    {l:'Lucro Desejado',v:lucroD,set:setLucroD,c:'#10b981',dica:'Padrão DV: 15%'},
                  ].map(f=>(
                    <div key={f.l}>
                      <label className="text-[10px] font-bold block mb-1" style={{color:f.c}}>{f.l}</label>
                      <p className="text-[9px] mb-1" style={{color:'#475569'}}>{f.dica}</p>
                      <div className="relative">
                        <input type="number" value={f.v} onChange={e=>f.set(e.target.value)}
                          className="w-full pr-6 pl-2 py-1.5 rounded-lg text-xs text-white focus:outline-none"
                          style={{background:'#0a0f1a',border:`1px solid ${f.c}40`}}/>
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px]" style={{color:'#64748b'}}>%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold block mb-1" style={{color:'#94a3b8'}}>🏦 Investimento Inicial (R$)</label>
                  <p className="text-xs mb-1" style={{color:'#475569'}}>Valor total investido no negócio</p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{color:'#64748b'}}>R$</span>
                    <input type="number" value={invInicial} onChange={e=>setInvInicial(e.target.value)} placeholder="Ex: 100000"
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-white text-sm focus:outline-none"
                      style={{background:'#0a0f1a',border:'1px solid #1e293b'}}/>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1" style={{color:'#94a3b8'}}>📉 Total a ser Depreciado (R$)</label>
                  <p className="text-xs mb-1" style={{color:'#475569'}}>
                    Equipamentos, móveis, reformas — dividido por 60 meses (5 anos)
                    {n(totalDeprec)>0 && <span style={{color:'#a78bfa'}}> → {fmtR(depMensal)}/mês</span>}
                  </p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{color:'#64748b'}}>R$</span>
                    <input type="number" value={totalDeprec} onChange={e=>setTotalDeprec(e.target.value)} placeholder="Ex: 10000"
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-white text-sm focus:outline-none"
                      style={{background:'#0a0f1a',border:'1px solid #1e293b'}}/>
                  </div>
                </div>
              </div>
            </div>

            {/* Despesas Indiretas */}
            <div className="rounded-2xl border overflow-hidden" style={{background:'#111827',borderColor:'#1e293b'}}>
              <div className="flex items-center justify-between px-5 py-3 border-b" style={{background:'#0d1525',borderColor:'#1e293b'}}>
                <span className="font-bold text-sm" style={{color:'#f59e0b'}}>📋 Despesas Indiretas</span>
                <span className="font-bold text-sm" style={{color:'#f59e0b'}}>{fmtR(totInd)}</span>
              </div>
              <div className="grid grid-cols-12 gap-2 px-5 py-2 text-[10px] font-bold uppercase tracking-wider border-b" style={{color:'#475569',borderColor:'#1e293b20'}}>
                <div className="col-span-5">Despesa</div>
                <div className="col-span-3">Valor Mensal (R$)</div>
                <div className="col-span-2">% Fat.</div>
                <div className="col-span-2">Dica</div>
              </div>
              {despInd.map((d,i)=>{
                const v=n(d.valor), pctV=fatN>0?(v/fatN*100):0
                const cor=pctV>20?'#ef4444':pctV>10?'#f59e0b':'#10b981'
                return(
                  <div key={i} className="grid grid-cols-12 gap-2 px-5 py-2 items-center hover:bg-white/2" style={{borderBottom:'1px solid #1e293b10'}}>
                    <div className="col-span-5 text-xs" style={{color:'#cbd5e1'}}>{d.nome}</div>
                    <div className="col-span-3">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px]" style={{color:'#64748b'}}>R$</span>
                        <input type="number" value={d.valor}
                          onChange={e=>{const nd=[...despInd];nd[i]={...nd[i],valor:e.target.value};setDespInd(nd)}}
                          placeholder="0"
                          className="w-full pl-6 pr-2 py-1 rounded-lg text-xs text-white focus:outline-none"
                          style={{background:'#0a0f1a',border:`1px solid ${v>0?'#33415560':'#1e293b'}`}}/>
                      </div>
                    </div>
                    <div className="col-span-2 text-xs text-center" style={{color:v>0?cor:'#334155'}}>
                      {v>0?`${pctV.toFixed(1)}%`:'—'}
                    </div>
                    <div className="col-span-2 text-[10px]" style={{color:'#475569'}}>{d.dica}</div>
                  </div>
                )
              })}
              {/* Extras */}
              {extrasDespInd.map((d,i)=>(
                <div key={i} className="grid grid-cols-12 gap-2 px-5 py-2 items-center" style={{borderBottom:'1px solid #1e293b10'}}>
                  <div className="col-span-5">
                    <input value={d.nome} onChange={e=>{const nd=[...extrasDespInd];nd[i]={...nd[i],nome:e.target.value};setExtrasDespInd(nd)}}
                      placeholder="Nome da despesa"
                      className="w-full px-2 py-1 rounded-lg text-xs text-white focus:outline-none"
                      style={{background:'#0a0f1a',border:'1px solid #334155'}}/>
                  </div>
                  <div className="col-span-3">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px]" style={{color:'#64748b'}}>R$</span>
                      <input type="number" value={d.valor} onChange={e=>{const nd=[...extrasDespInd];nd[i]={...nd[i],valor:e.target.value};setExtrasDespInd(nd)}}
                        className="w-full pl-6 pr-2 py-1 rounded-lg text-xs text-white focus:outline-none"
                        style={{background:'#0a0f1a',border:'1px solid #334155'}}/>
                    </div>
                  </div>
                  <div className="col-span-2"/>
                  <div className="col-span-2 flex justify-end">
                    <button onClick={()=>setExtrasDespInd(prev=>prev.filter((_,idx)=>idx!==i))} style={{color:'#475569'}}><Trash2 size={12}/></button>
                  </div>
                </div>
              ))}
              <div className="px-5 py-3 border-t" style={{borderColor:'#1e293b'}}>
                <button onClick={()=>setExtrasDespInd(p=>[...p,{nome:'',valor:'',dica:''}])}
                  className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg"
                  style={{background:'#f59e0b20',color:'#f59e0b',border:'1px dashed #f59e0b40'}}>
                  <Plus size={12}/> Adicionar despesa
                </button>
              </div>
            </div>

            {/* Provisão */}
            <div className="rounded-2xl border overflow-hidden" style={{background:'#111827',borderColor:'#1e293b'}}>
              <div className="flex items-center justify-between px-5 py-3 border-b" style={{background:'#0d1525',borderColor:'#1e293b'}}>
                <span className="font-bold text-sm" style={{color:'#a78bfa'}}>📅 Provisão Mensal</span>
                <span className="font-bold text-sm" style={{color:'#a78bfa'}}>{fmtR(totProvisao)}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 p-5">
                {[
                  {l:'13º Salário',v:sal13,set:setSal13,dica:'Salário anual ÷ 12'},
                  {l:'Férias',v:ferias,set:setFerias,dica:'(Salário × 1/3) ÷ 12'},
                  {l:'FGTS Rescisório',v:fgtsR,set:setFgtsR,dica:'Provisão p/ eventual demissão'},
                ].map(f=>(
                  <div key={f.l}>
                    <label className="text-xs font-bold block mb-1" style={{color:'#a78bfa'}}>{f.l}</label>
                    <p className="text-[10px] mb-1" style={{color:'#475569'}}>{f.dica}</p>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{color:'#64748b'}}>R$</span>
                      <input type="number" value={f.v} onChange={e=>f.set(e.target.value)} placeholder="0"
                        className="w-full pl-8 pr-2 py-2 rounded-lg text-sm text-white focus:outline-none"
                        style={{background:'#0a0f1a',border:'1px solid #1e293b'}}/>
                    </div>
                  </div>
                ))}
              </div>
              {depMensal > 0 && (
                <div className="px-5 pb-3 flex items-center gap-2 text-xs" style={{color:'#64748b'}}>
                  <span>📉 Depreciação mensal:</span>
                  <span className="font-bold" style={{color:'#a78bfa'}}>{fmtR(depMensal)}</span>
                  <span style={{color:'#334155'}}>(inclusa no Custo Operacional)</span>
                </div>
              )}
            </div>

            {/* Despesas Diretas */}
            <div className="rounded-2xl border overflow-hidden" style={{background:'#111827',borderColor:'#1e293b'}}>
              <div className="flex items-center justify-between px-5 py-3 border-b" style={{background:'#0d1525',borderColor:'#1e293b'}}>
                <span className="font-bold text-sm" style={{color:'#ef4444'}}>📌 Despesas Diretas</span>
                <span className="font-bold text-sm" style={{color:'#ef4444'}}>{fmtR(totDiretas)}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 p-5">
                {[
                  {l:'Imposto (R$)',v:imposto,set:setImposto,dica:'Simples Nacional ou regime tributário do mês'},
                  {l:'Produto/Insumo (R$)',v:produto,set:setProduto,dica:'Total de produtos consumidos nos serviços'},
                  {l:'Rateio/Comissão (R$)',v:rateio,set:setRateio,dica:'Comissões pagas aos profissionais'},
                  {l:'Taxa de Cartão (R$)',v:taxaC,set:setTaxaC,dica:'Total cobrado pelas maquininhas no mês'},
                ].map(f=>(
                  <div key={f.l}>
                    <label className="text-xs font-bold block mb-1" style={{color:'#ef4444'}}>{f.l}</label>
                    <p className="text-[10px] mb-1" style={{color:'#475569'}}>{f.dica}</p>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{color:'#64748b'}}>R$</span>
                      <input type="number" value={f.v} onChange={e=>f.set(e.target.value)} placeholder="0"
                        className="w-full pl-8 pr-2 py-2 rounded-lg text-sm text-white focus:outline-none"
                        style={{background:'#0a0f1a',border:'1px solid #1e293b'}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Outras Despesas */}
            <div className="rounded-2xl border overflow-hidden" style={{background:'#111827',borderColor:'#1e293b'}}>
              <div className="px-5 py-3 border-b" style={{background:'#0d1525',borderColor:'#1e293b'}}>
                <span className="font-bold text-sm" style={{color:'#06b6d4'}}>💸 Outras Despesas / Gasto de Capital</span>
              </div>
              <div className="grid grid-cols-2 gap-4 p-5">
                {[
                  {l:'Aquisição de Equipamento (R$)',v:aquisicaoEq,set:setAquisicaoEq,dica:'Compra de equipamentos, móveis, utensílios'},
                  {l:'Distribuição de Sócios (R$)',v:distSocios,set:setDistSocios,dica:'Retirada de lucros pelos sócios'},
                ].map(f=>(
                  <div key={f.l}>
                    <label className="text-xs font-bold block mb-1" style={{color:'#06b6d4'}}>{f.l}</label>
                    <p className="text-[10px] mb-1" style={{color:'#475569'}}>{f.dica}</p>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{color:'#64748b'}}>R$</span>
                      <input type="number" value={f.v} onChange={e=>f.set(e.target.value)} placeholder="0"
                        className="w-full pl-8 pr-2 py-2 rounded-lg text-sm text-white focus:outline-none"
                        style={{background:'#0a0f1a',border:'1px solid #1e293b'}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resultado */}
            {fatN > 0 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {l:'Custo Operacional Total',v:custoOp,pct:pctStr(custoOp,fatN),c:'#f59e0b',dica:'Indiretas + Provisão + Depreciação'},
                    {l:'Margem Operacional',v:margOpR,pct:pctStr(margOpR,fatN),c:'#06b6d4',dica:'Faturamento − Despesas Diretas'},
                    {l:'Resultado Operacional',v:resultOp,pct:pctStr(resultOp,fatN),c:corRes(resultOp),dica:'Margem − Custo Operacional'},
                    {l:'Resultado Financeiro',v:resultFin,pct:pctStr(resultFin,fatN),c:corRes(resultFin),dica:'Resultado Op. − Outras Despesas'},
                  ].map((c,i)=>(
                    <div key={i} className="rounded-xl p-4 border" style={{background:'#0d1525',borderColor:'#1e293b'}}>
                      <p className="text-xs mb-0.5" style={{color:'#64748b'}}>{c.l}</p>
                      <p className="text-[10px] mb-2" style={{color:'#334155'}}>{c.dica}</p>
                      <p className="text-2xl font-bold" style={{color:c.c}}>{fmtR(c.v)}</p>
                      <p className="text-xs mt-1" style={{color:c.c+'99'}}>{c.pct} do faturamento</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    {l:'Ponto de Equilíbrio',v:fmtR(pe),c:'#10b981',dica:'Faturamento mínimo para cobrir tudo'},
                    {l:`PE c/ Lucro de ${lucroD}%`,v:fmtR(peLucro),c:'#a78bfa',dica:'Para cobrir custos + lucro desejado'},
                    {l:'Rentabilidade',v:`${(rentab*100).toFixed(2)}%`,c:corRes(rentab),dica:'Resultado / Faturamento'},
                    {l:'Capital de Giro Mínimo',v:fmtR(capGiro),c:'#06b6d4',dica:'Reserva para 30 dias de operação'},
                  ].map((c,i)=>(
                    <div key={i} className="rounded-xl p-4 border text-center" style={{background:'#0d1525',borderColor:'#1e293b'}}>
                      <p className="text-[10px] mb-1" style={{color:'#64748b'}}>{c.l}</p>
                      <p className="text-lg font-bold" style={{color:c.c}}>{c.v}</p>
                      <p className="text-[9px] mt-1" style={{color:'#334155'}}>{c.dica}</p>
                    </div>
                  ))}
                </div>

                {/* Verificação vs desejado */}
                <div className="rounded-xl p-4 border" style={{background:'#111827',borderColor:'#1e293b'}}>
                  <p className="text-xs font-bold mb-3" style={{color:'#94a3b8'}}>📊 Realizado vs Desejado (Metodologia DV)</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      {l:'Custo Indireto',real:fatN>0?custoOp/fatN*100:0,desej:n(custIndD),c:'#f59e0b'},
                      {l:'Custo Direto',real:fatN>0?totDiretas/fatN*100:0,desej:n(custDirD),c:'#ef4444'},
                      {l:'Lucro',real:fatN>0?resultOp/fatN*100:0,desej:n(lucroD),c:'#10b981'},
                    ].map(c=>{
                      const ok=c.real>=c.desej*0.9&&c.real<=c.desej*1.1
                      return(
                        <div key={c.l} className="rounded-lg p-3 border" style={{background:'#0a0f1a',borderColor:ok?'#10b98130':'#ef444430'}}>
                          <p className="text-[10px] mb-1" style={{color:'#64748b'}}>{c.l}</p>
                          <div className="flex items-end gap-2">
                            <span className="text-base font-bold" style={{color:c.c}}>{c.real.toFixed(1)}%</span>
                            <span className="text-[10px]" style={{color:'#475569'}}>meta: {c.desej}%</span>
                          </div>
                          <p className="text-[10px] mt-1" style={{color:ok?'#10b981':'#ef4444'}}>
                            {ok?'✅ Dentro da meta':'⚠️ Fora da meta'}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Extras */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {l:'🚨 Reserva de Emergência',v:reservaEmerg,set:setReservaEmerg,dica:'Valor atual em reserva de emergência'},
                    {l:'📦 Valor de Produtos em Estoque',v:vlrProdEstoque,set:setVlrProdEstoque,dica:'Valor total do estoque atual'},
                  ].map(f=>(
                    <div key={f.l} className="rounded-xl p-4 border" style={{background:'#111827',borderColor:'#1e293b'}}>
                      <label className="text-xs font-bold block mb-1" style={{color:'#94a3b8'}}>{f.l}</label>
                      <p className="text-[10px] mb-2" style={{color:'#475569'}}>{f.dica}</p>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{color:'#64748b'}}>R$</span>
                        <input type="number" value={f.v} onChange={e=>f.set(e.target.value)} placeholder="0"
                          className="w-full pl-9 pr-3 py-2 rounded-lg text-sm text-white focus:outline-none"
                          style={{background:'#0a0f1a',border:'1px solid #1e293b'}}/>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Botão IA */}
                <div className="rounded-2xl border overflow-hidden" style={{borderColor:'#7c5cfc40'}}>
                  {!analiseIA&&!loadingIA&&!erroIA&&(
                    <button onClick={analisarIA} className="w-full py-4 font-bold text-sm flex items-center justify-center gap-2 transition-all hover:brightness-110"
                      style={{background:'linear-gradient(135deg,#7c5cfc20,#a78bfa20)',color:'#a78bfa',border:'none'}}>
                      🤖 Quero a análise completa da NODRI IA
                      <span className="text-xs font-normal" style={{color:'#64748b'}}>— opcional</span>
                    </button>
                  )}
                  {loadingIA&&(<div className="p-5 flex items-center gap-3" style={{background:'#111827'}}><Loader2 size={18} className="animate-spin" style={{color:'#7c5cfc'}}/><span className="text-sm" style={{color:'#94a3b8'}}>NODRI IA analisando...</span></div>)}
                  {erroIA&&(<div className="p-5 flex items-center justify-between" style={{background:'#111827'}}><span className="text-sm" style={{color:'#ef4444'}}>⚠️ {erroIA}</span><button onClick={analisarIA} className="text-xs px-3 py-1.5 rounded-lg" style={{background:'#7c5cfc',color:'white'}}>Tentar novamente</button></div>)}
                  {analiseIA&&(<div className="p-6" style={{background:'#111827'}}><h3 className="font-bold text-sm mb-4" style={{color:'#7c5cfc'}}>🤖 Análise da NODRI IA</h3><div className="text-sm leading-relaxed" style={{color:'#cbd5e1'}} dangerouslySetInnerHTML={{__html:analiseIA.replace(/\*\*(.*?)\*\*/g,'<strong style="color:#e2e8f0">$1</strong>').replace(/\n/g,'<br/>')}}/></div>)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════ ABA PONTO DE EQUILÍBRIO ════ */}
        {aba==='pe' && (
          <div className="space-y-4">
            {(custoOp>0||fatN>0) && (
              <div className="rounded-xl p-3 text-xs flex items-center gap-2" style={{background:'#7c5cfc15',border:'1px solid #7c5cfc30',color:'#a78bfa'}}>
                ✨ Dados da aba Receitas e Despesas: Custo Op. <strong>{fmtR(custoOp)}</strong> | Margem <strong>{(margOpPct*100).toFixed(1)}%</strong> | Faturamento <strong>{fmtR(fatN)}</strong>
              </div>
            )}
            <div className="rounded-2xl p-5 border" style={{background:'#111827',borderColor:'#10b98140'}}>
              <h3 className="font-bold text-sm mb-4" style={{color:'#10b981'}}>⚙️ Parâmetros</h3>
              <div className="grid grid-cols-4 gap-3">
                {[
                  {l:'Custo Operacional (R$)',v:simDespesa,set:setSimDespesa,ph:custoOp>0?custoOp.toFixed(2):'0',tipo:'R$'},
                  {l:'Margem Operacional (%)',v:margemPE,set:setMargemPE,ph:margOpPct>0?(margOpPct*100).toFixed(1):'44',tipo:'%'},
                  {l:'Meta Lucro (%)',v:metaLucroPE,set:setMetaLucroPE,ph:n(lucroD)>0?lucroD:'15',tipo:'%'},
                  {l:'Área do Salão (M²)',v:areaM2,set:setAreaM2,ph:'100',tipo:'m²'},
                  {l:'Nº de Profissionais',v:numProfs,set:setNumProfs,ph:'3',tipo:''},
                  {l:'Faturamento Atual (R$)',v:fatPEManual,set:setFatPEManual,ph:fatN>0?fatN.toFixed(2):'0',tipo:'R$'},
                ].map(f=>(
                  <div key={f.l}>
                    <label className="text-xs font-bold block mb-1" style={{color:'#94a3b8'}}>{f.l}</label>
                    <div className="relative">
                      {f.tipo==='R$'&&<span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px]" style={{color:'#64748b'}}>R$</span>}
                      <input type="number" value={f.v} onChange={e=>f.set(e.target.value)} placeholder={f.ph}
                        className={`w-full ${f.tipo==='R$'?'pl-7':'pl-3'} ${f.tipo&&f.tipo!=='R$'?'pr-7':'pr-3'} py-2 rounded-lg text-xs text-white focus:outline-none`}
                        style={{background:'#0a0f1a',border:'1px solid #1e293b'}}/>
                      {f.tipo&&f.tipo!=='R$'&&<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px]" style={{color:'#64748b'}}>{f.tipo}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resultados PE */}
            {custoOpPE_>0&&margPE_>0&&(
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    {l:'⚖️ Ponto de Equilíbrio',v:fmtR(PE_),sub:'Faturamento mínimo para cobrir todos os custos',c:'#10b981'},
                    {l:`🎯 PE p/ Lucro de ${n(metaLucroPE)||n(lucroD)}%`,v:fmtR(PELucro_),sub:'Para cobrir custos E ter o lucro desejado',c:'#a78bfa'},
                  ].map((c,i)=>(
                    <div key={i} className="rounded-2xl p-5 border" style={{background:'#0d1525',borderColor:`${c.c}30`}}>
                      <p className="text-xs font-bold mb-1" style={{color:c.c}}>{c.l}</p>
                      <p className="text-3xl font-bold mt-2" style={{color:c.c}}>{c.v}</p>
                      <p className="text-xs mt-2" style={{color:'#475569'}}>{c.sub}</p>
                      {fatPE_>0&&<p className="text-xs mt-1" style={{color:fatPE_>=PE_?'#10b981':'#ef4444'}}>{fatPE_>=PE_?`✅ Você fatura ${fmtR(fatPE_-PE_)} acima do PE`:`🚨 Falta ${fmtR(PE_-fatPE_)} para o PE`}</p>}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl p-4 border" style={{background:'#111827',borderColor:'#1e293b'}}>
                    <p className="text-xs font-bold mb-3" style={{color:'#06b6d4'}}>👤 PE por Profissional ({profs_} profissionais)</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        {l:'PE por Profissional',v:fmtR(PEProf_)},
                        {l:'PE c/ Lucro por Prof.',v:fmtR(PEProfLucro_)},
                      ].map((c,i)=>(
                        <div key={i}>
                          <p className="text-[10px]" style={{color:'#64748b'}}>{c.l}</p>
                          <p className="text-lg font-bold" style={{color:'#06b6d4'}}>{c.v}</p>
                          <p className="text-[9px]" style={{color:'#334155'}}>cada profissional precisa gerar</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl p-4 border" style={{background:'#111827',borderColor:'#1e293b'}}>
                    <p className="text-xs font-bold mb-3" style={{color:'#f59e0b'}}>📐 PE por M² ({n(areaM2)||100} m²)</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        {l:'PE por M²',v:`${fmtR(PEM2_)}/m²`},
                        {l:'PE c/ Lucro por M²',v:`${fmtR(PEM2Lucro_)}/m²`},
                      ].map((c,i)=>(
                        <div key={i}>
                          <p className="text-[10px]" style={{color:'#64748b'}}>{c.l}</p>
                          <p className="text-lg font-bold" style={{color:'#f59e0b'}}>{c.v}</p>
                          <p className="text-[9px]" style={{color:'#334155'}}>cada m² precisa gerar</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl p-4 text-xs space-y-1" style={{background:'#111827',border:'1px solid #1e293b',color:'#64748b'}}>
                  <p className="font-bold mb-1" style={{color:'#94a3b8'}}>💡 Como funciona:</p>
                  <p>• <strong style={{color:'#e2e8f0'}}>PE</strong> = Custo Operacional ÷ Margem Operacional% — faturamento mínimo para não ter prejuízo</p>
                  <p>• <strong style={{color:'#e2e8f0'}}>PE c/ Lucro</strong> = Custo Op ÷ (Margem% − Meta Lucro%) — para cobrir E lucrar</p>
                  <p>• <strong style={{color:'#e2e8f0'}}>PE por Profissional</strong> = PE Total ÷ nº de profissionais — meta individual</p>
                  <p>• <strong style={{color:'#e2e8f0'}}>PE por M²</strong> = PE Total ÷ área do salão — eficiência do espaço</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════ ABA CALCULAR SERVIÇOS ════ */}
        {aba==='servicos' && (
          <div className="space-y-4">
            <div className="rounded-2xl p-5 border" style={{background:'#111827',borderColor:'#7c5cfc40'}}>
              <h3 className="font-bold text-sm mb-3" style={{color:'#7c5cfc'}}>⚙️ Parâmetros Globais</h3>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="text-xs font-bold block mb-1" style={{color:'#94a3b8'}}>Taxa do Cartão (%)</label>
                  <p className="text-[10px] mb-1" style={{color:'#475569'}}>Média das maquininhas. Padrão DV: 5%</p>
                  <div className="relative"><input type="number" value={taxaCartao} onChange={e=>setTaxaCartao(e.target.value)} className="w-full pr-6 pl-3 py-2 rounded-lg text-sm text-white focus:outline-none" style={{background:'#0a0f1a',border:'1px solid #334155'}}/><span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs" style={{color:'#64748b'}}>%</span></div>
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1" style={{color:'#94a3b8'}}>Abatimento do Produto (%)</label>
                  <p className="text-[10px] mb-1" style={{color:'#475569'}}>% do produto abatido do rateio. Padrão DV: 100%</p>
                  <div className="relative"><input type="number" value={abatProd} onChange={e=>setAbatProd(e.target.value)} className="w-full pr-6 pl-3 py-2 rounded-lg text-sm text-white focus:outline-none" style={{background:'#0a0f1a',border:'1px solid #334155'}}/><span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs" style={{color:'#64748b'}}>%</span></div>
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1" style={{color:'#94a3b8'}}>Custo Operacional (%)</label>
                  <p className="text-[10px] mb-1" style={{color:'#475569'}}>
                    {fatN>0&&custoOp>0?<>Da aba RD: <strong style={{color:'#a78bfa'}}>{(custoOp/fatN*100).toFixed(1)}%</strong></>:'Informe ou calcule na aba RD'}
                  </p>
                  <div className="relative">
                    <input type="number" value={custOpServ}
                      onChange={e=>setCustOpServ(e.target.value)}
                      placeholder={fatN>0&&custoOp>0?(custoOp/fatN*100).toFixed(1):'30'}
                      className="w-full pr-6 pl-3 py-2 rounded-lg text-sm text-white focus:outline-none"
                      style={{background:'#0a0f1a',border:'1px solid #334155'}}/>
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs" style={{color:'#64748b'}}>%</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1" style={{color:'#94a3b8'}}>Lei do Salão Parceiro</label>
                  <p className="text-[10px] mb-1" style={{color:'#475569'}}>Imposto incide sobre a margem, não o preço total</p>
                  <button onClick={()=>setSalaoParceiro(p=>!p)} className="w-full py-2 rounded-lg text-sm font-bold transition-all"
                    style={{background:salaoParceiro?'#10b981':'#1e293b',color:salaoParceiro?'white':'#64748b',border:`1px solid ${salaoParceiro?'#10b981':'#334155'}`}}>
                    {salaoParceiro?'✅ SIM':'NÃO'}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs p-3 rounded-lg" style={{background:'#0a0f1a',color:'#64748b'}}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={taxaAntesRateio} onChange={e=>setTaxaAntesRateio(e.target.checked)} className="accent-purple-500"/>
                  <span style={{color:'#cbd5e1'}}>✅ Taxa do cartão deve ser abatida do valor antes de calcular o rateio</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={prodAntesRateio} onChange={e=>setProdAntesRateio(e.target.checked)} className="accent-purple-500"/>
                  <span style={{color:'#cbd5e1'}}>✅ Valor do produto deve ser abatido do rateio</span>
                </label>
              </div>
            </div>

            {/* Tabela de serviços */}
            <div className="rounded-2xl border overflow-hidden" style={{background:'#111827',borderColor:'#1e293b'}}>
              <div className="grid gap-2 px-5 py-3 text-[10px] font-bold uppercase tracking-wider border-b"
                style={{background:'#0d1525',borderColor:'#1e293b',color:'#475569',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 20px'}}>
                <div>Serviço</div><div>Preço (R$)</div><div>Rateio (%)</div><div>Produto (R$)</div><div>Imposto (%)</div><div></div>
              </div>
              {servicos.map(s=>{
                const c=calcServ(s)
                return(
                  <div key={s.id}>
                    <div className="grid gap-2 px-5 py-3 items-center" style={{gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 20px'}}>
                      <input value={s.nome} onChange={e=>setServicos(p=>p.map(x=>x.id===s.id?{...x,nome:e.target.value}:x))}
                        placeholder="Ex: Coloração longo" className="px-3 py-2 rounded-lg text-sm text-white focus:outline-none" style={{background:'#0a0f1a',border:'1px solid #1e293b'}}/>
                      {[
                        {k:'preco' as const,ph:'0',pre:'R$'},
                        {k:'rateioP' as const,ph:'50',suf:'%'},
                        {k:'produto' as const,ph:'0',pre:'R$'},
                        {k:'imposto' as const,ph:'5',suf:'%'},
                      ].map(f=>(
                        <div key={f.k} className="relative">
                          {f.pre&&<span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px]" style={{color:'#64748b'}}>{f.pre}</span>}
                          <input type="number" value={(s as any)[f.k]}
                            onChange={e=>setServicos(p=>p.map(x=>x.id===s.id?{...x,[f.k]:e.target.value}:x))}
                            placeholder={f.ph}
                            className={`w-full ${f.pre?'pl-7':'pl-3'} ${f.suf?'pr-6':'pr-2'} py-2 rounded-lg text-sm text-white focus:outline-none`}
                            style={{background:'#0a0f1a',border:`1px solid ${n((s as any)[f.k])>0?'#7c5cfc40':'#1e293b'}`}}/>
                          {f.suf&&<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px]" style={{color:'#64748b'}}>{f.suf}</span>}
                        </div>
                      ))}
                      <button onClick={()=>setServicos(p=>p.filter(x=>x.id!==s.id))} style={{color:'#475569'}}><Trash2 size={13}/></button>
                    </div>
                    {c&&(
                      <div className="mx-4 mb-3 rounded-xl overflow-hidden border" style={{borderColor:'#1e293b'}}>
                        <div className="grid grid-cols-4 divide-x text-center py-2" style={{background:'#0a0f1a',borderColor:'#1e293b'}}>
                          {[
                            {l:'Total Despesas',v:fmtR(c.total),p:`${(c.totalPct*100).toFixed(1)}%`,co:'#f59e0b'},
                            {l:'Margem Operacional',v:fmtR(c.margOp),p:`${(c.margOpPct*100).toFixed(1)}%`,co:'#06b6d4'},
                            {l:'Custo Operacional',v:fmtR(c.custoOpR),p:`${(c.custOpPct*100).toFixed(1)}%`,co:'#a78bfa'},
                            {l:'RESULTADO LÍQUIDO',v:fmtR(c.resultado),p:`${(c.resultPct*100).toFixed(1)}%`,co:corRes(c.resultado)},
                          ].map((item,i)=>(
                            <div key={i} className="px-2 py-1">
                              <p className="text-[9px] uppercase tracking-wider mb-0.5" style={{color:'#475569'}}>{item.l}</p>
                              <p className="text-sm font-bold" style={{color:item.co}}>{item.v}</p>
                              <p className="text-[10px]" style={{color:item.co+'99'}}>{item.p}</p>
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-4 text-center py-1.5 border-t text-[10px]" style={{background:'#111827',borderColor:'#1e293b',color:'#64748b'}}>
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
              <div className="px-5 py-3 border-t" style={{borderColor:'#1e293b'}}>
                <button onClick={()=>{setServicos(p=>[...p,{id:proxServ,nome:'',preco:'',rateioP:'',produto:'',imposto:''}]);setProxServ(p=>p+1)}}
                  className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg"
                  style={{background:'#7c5cfc20',color:'#7c5cfc',border:'1px dashed #7c5cfc40'}}>
                  <Plus size={14}/> Adicionar serviço
                </button>
              </div>
            </div>

            <div className="rounded-xl p-4 text-xs space-y-1" style={{background:'#111827',border:'1px solid #1e293b',color:'#64748b'}}>
              <p className="font-bold mb-1" style={{color:'#94a3b8'}}>💡 Fórmula exata (Planilha Dra. Dani Venâncio):</p>
              <p>• <strong style={{color:'#e2e8f0'}}>Rateio R$</strong> = (Preço × Rateio%) − (Preço × Rateio% × Taxa_Cartão%) − (Produto × Abatimento%)</p>
              <p>• <strong style={{color:'#e2e8f0'}}>Imposto</strong>: Salão Parceiro → (Preço − Rateio) × Imp%. Normal → Preço × Imp%</p>
              <p>• <strong style={{color:'#e2e8f0'}}>Resultado</strong> = Preço − Total Despesas − Custo Operacional</p>
              <p style={{color:'#a78bfa'}}>Exemplo: Preço R$100 | Rateio 50% | Produto R$10 | Cartão 5% | Imposto 5% → Rateio R$37,50 | Resultado R$14,38</p>
            </div>
          </div>
        )}

        {/* ════ ABA CUSTO DE PRODUTO ════ */}
        {aba==='produto' && (
          <div className="space-y-4">
            <div className="rounded-xl p-3 text-xs" style={{background:'#7c5cfc15',border:'1px solid #7c5cfc30',color:'#a78bfa'}}>
              ✨ Calcule o custo exato de cada insumo por serviço. Use o total em <strong>💇 Calcular Serviços</strong> → campo "Produto (R$)".
            </div>
            {servicosProd.map(sp=>{
              const total=sp.ingredientes.reduce((s,i)=>s+custoIngred(i),0)
              return(
                <div key={sp.id} className="rounded-2xl border overflow-hidden" style={{background:'#111827',borderColor:'#1e293b'}}>
                  <div className="px-5 py-4 flex items-center gap-3 border-b" style={{background:'#0d1525',borderColor:'#1e293b'}}>
                    <span className="text-lg">🧴</span>
                    <input value={sp.nomeServico}
                      onChange={e=>setServicoProd(p=>p.map(s=>s.id===sp.id?{...s,nomeServico:e.target.value}:s))}
                      placeholder="Nome do serviço (ex: Coloração Longo)"
                      className="flex-1 bg-transparent text-white font-bold text-sm focus:outline-none"
                      style={{borderBottom:'1px solid #334155'}}/>
                    {total>0&&<div className="text-right flex-shrink-0"><p className="text-[10px]" style={{color:'#64748b'}}>Custo total</p><p className="font-bold text-lg" style={{color:'#f59e0b'}}>{fmtR(total)}</p></div>}
                  </div>
                  <div className="grid gap-2 px-5 py-2 text-[10px] font-bold uppercase tracking-wider border-b"
                    style={{background:'#0a0f1a',borderColor:'#1e293b',color:'#475569',gridTemplateColumns:'2fr 0.7fr 1fr 1fr 1fr 1fr 20px'}}>
                    <div>Produto/Insumo</div><div>Un.</div><div>Qtd embalagem</div><div>Preço embalagem</div><div>Qtd usada</div><div>Custo/uso</div><div></div>
                  </div>
                  {sp.ingredientes.map((ing,idx)=>{
                    const custo=custoIngred(ing)
                    return(
                      <div key={idx} className="grid gap-2 px-5 py-2 items-center hover:bg-white/2"
                        style={{borderBottom:'1px solid #1e293b10',gridTemplateColumns:'2fr 0.7fr 1fr 1fr 1fr 1fr 20px'}}>
                        <input value={ing.nome} onChange={e=>atualizarIngrediente(sp.id,idx,'nome',e.target.value)} placeholder="Ex: Tinta Color"
                          className="px-3 py-1.5 rounded-lg text-xs text-white focus:outline-none" style={{background:'#0a0f1a',border:'1px solid #1e293b'}}/>
                        <select value={ing.unidade} onChange={e=>atualizarIngrediente(sp.id,idx,'unidade',e.target.value)}
                          className="px-2 py-1.5 rounded-lg text-xs text-white focus:outline-none" style={{background:'#0a0f1a',border:'1px solid #1e293b'}}>
                          {['ml','g','und','L','kg'].map(u=><option key={u} value={u}>{u}</option>)}
                        </select>
                        <input type="number" value={ing.qtdEmb} onChange={e=>atualizarIngrediente(sp.id,idx,'qtdEmb',e.target.value)}
                          placeholder="Ex: 60" className="px-3 py-1.5 rounded-lg text-xs text-white focus:outline-none" style={{background:'#0a0f1a',border:'1px solid #1e293b'}}/>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px]" style={{color:'#64748b'}}>R$</span>
                          <input type="number" value={ing.preco} onChange={e=>atualizarIngrediente(sp.id,idx,'preco',e.target.value)}
                            placeholder="0" className="w-full pl-7 pr-2 py-1.5 rounded-lg text-xs text-white focus:outline-none" style={{background:'#0a0f1a',border:'1px solid #1e293b'}}/>
                        </div>
                        <input type="number" value={ing.qtdUsa} onChange={e=>atualizarIngrediente(sp.id,idx,'qtdUsa',e.target.value)}
                          placeholder="Ex: 90" className="px-3 py-1.5 rounded-lg text-xs text-white focus:outline-none" style={{background:'#0a0f1a',border:'1px solid #1e293b'}}/>
                        <div className="text-xs font-bold text-center" style={{color:custo>0?'#f59e0b':'#334155'}}>{custo>0?fmtR(custo):'—'}</div>
                        <button onClick={()=>removerIngrediente(sp.id,idx)} style={{color:'#475569'}}><Trash2 size={12}/></button>
                      </div>
                    )
                  })}
                  <div className="px-5 py-3 flex items-center justify-between border-t" style={{borderColor:'#1e293b'}}>
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
              style={{background:'#7c5cfc20',color:'#7c5cfc',border:'1px dashed #7c5cfc40'}}>
              <Plus size={15}/> Adicionar outro serviço
            </button>
            <div className="rounded-xl p-4 text-xs space-y-1" style={{background:'#111827',border:'1px solid #1e293b',color:'#64748b'}}>
              <p className="font-bold mb-1" style={{color:'#94a3b8'}}>💡 Fórmula:</p>
              <p>• Custo por uso = (Preço da embalagem ÷ Qtd da embalagem) × Qtd usada no serviço</p>
              <p style={{color:'#a78bfa'}}>Ex: Tinta R$35,27 / 60g × 90g usados = <strong>R$52,91 de custo</strong></p>
            </div>
          </div>
        )}

        {/* ════ ABA ALUGUEL DE CADEIRA ════ */}
        {aba==='cadeira' && (
          <div className="space-y-4">
            {custoOp>0&&<div className="rounded-xl p-3 text-xs" style={{background:'#7c5cfc15',border:'1px solid #7c5cfc30',color:'#a78bfa'}}>✨ Custo operacional da aba Receitas e Despesas: <strong>{fmtR(custoOp)}</strong> — preenchido automaticamente</div>}
            <div className="rounded-2xl p-6 border" style={{background:'#111827',borderColor:'#1e293b'}}>
              <h2 className="font-bold text-base mb-1" style={{color:'#f59e0b'}}>💺 Aluguel de Cadeira</h2>
              <p className="text-xs mb-5" style={{color:'#64748b'}}>Quanto cobrar de aluguel por cadeira para cobrir custos e ter lucro.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold block mb-1" style={{color:'#94a3b8'}}>Custo Operacional Mensal Total (R$)</label>
                  <p className="text-xs mb-2" style={{color:'#475569'}}>{custoOp>0?'Preenchido automaticamente — pode editar.':'Preencha a aba Receitas e Despesas ou informe manualmente.'}</p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{color:'#94a3b8'}}>R$</span>
                    <input type="number" value={custoOpCad||(custoOp>0?String(Math.round(custoOp)):'')} onChange={e=>setCustoOpCad(e.target.value)}
                      placeholder={custoOp>0?custoOp.toFixed(2):'0,00'} className="w-full pl-10 pr-4 py-3 rounded-xl text-white focus:outline-none"
                      style={{background:'#0a0f1a',border:'1px solid #f59e0b60'}}/>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1" style={{color:'#94a3b8'}}>Número de Cadeiras / Postos</label>
                  <p className="text-xs mb-2" style={{color:'#475569'}}>Quantas cadeiras ou postos de atendimento tem o salão?</p>
                  <input type="number" value={numCad} onChange={e=>setNumCad(e.target.value)} placeholder="Ex: 10"
                    className="w-full px-4 py-3 rounded-xl text-white focus:outline-none" style={{background:'#0a0f1a',border:'1px solid #1e293b'}}/>
                </div>
              </div>
              {custPorCad>0&&(
                <div className="mt-6 space-y-3">
                  <div className="rounded-xl p-4 border" style={{background:'#0a0f1a',borderColor:'#f59e0b40'}}>
                    <p className="text-xs mb-1" style={{color:'#64748b'}}>📊 Custo por Cadeira (ponto de equilíbrio)</p>
                    <p className="text-3xl font-bold" style={{color:'#f59e0b'}}>{fmtR(custPorCad)}</p>
                    <p className="text-xs mt-1" style={{color:'#475569'}}>Valor que cada cadeira precisa gerar para cobrir os custos</p>
                  </div>
                  <div className="rounded-xl p-4 border" style={{background:'#0a0f1a',borderColor:'#10b98140'}}>
                    <div className="flex items-center gap-2 mb-1"><span>⭐</span><p className="text-xs font-bold" style={{color:'#10b981'}}>Aluguel Sugerido por Cadeira</p><span className="text-xs px-2 py-0.5 rounded-full" style={{background:'#10b98120',color:'#10b981'}}>+50% lucro</span></div>
                    <p className="text-3xl font-bold" style={{color:'#10b981'}}>{fmtR(alugSuger)}</p>
                    <p className="text-xs mt-1" style={{color:'#475569'}}>Valor recomendado com margem de lucro de 50%</p>
                  </div>
                  <div className="rounded-xl p-4 text-xs space-y-1" style={{background:'#7c5cfc10',border:'1px solid #7c5cfc30',color:'#a78bfa'}}>
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
            {pe>0&&<div className="rounded-xl p-3 text-xs" style={{background:'#7c5cfc15',border:'1px solid #7c5cfc30',color:'#a78bfa'}}>✨ Ponto de equilíbrio da aba Receitas e Despesas: <strong>{fmtR(pe)}</strong> — preenchido automaticamente como faturamento mínimo</div>}
            <div className="rounded-2xl p-6 border" style={{background:'#111827',borderColor:'#1e293b'}}>
              <h2 className="font-bold text-base mb-1" style={{color:'#06b6d4'}}>📐 Faturamento por M²</h2>
              <p className="text-xs mb-5" style={{color:'#64748b'}}>Quanto cada metro quadrado do salão precisa gerar para ser rentável.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold block mb-1" style={{color:'#94a3b8'}}>Faturamento Mínimo Necessário (R$)</label>
                  <p className="text-xs mb-2" style={{color:'#475569'}}>{pe>0?'Ponto de equilíbrio calculado automaticamente — pode editar.':'Preencha a aba Receitas e Despesas ou informe manualmente.'}</p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{color:'#94a3b8'}}>R$</span>
                    <input type="number" value={fatMinM2||(pe>0?String(Math.round(pe)):'')} onChange={e=>setFatMinM2(e.target.value)}
                      placeholder={pe>0?pe.toFixed(2):'0,00'} className="w-full pl-10 pr-4 py-3 rounded-xl text-white focus:outline-none"
                      style={{background:'#0a0f1a',border:'1px solid #06b6d460'}}/>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1" style={{color:'#94a3b8'}}>Metragem Total do Salão (m²)</label>
                  <input type="number" value={mTotal} onChange={e=>setMTotal(e.target.value)} placeholder="Ex: 80"
                    className="w-full px-4 py-3 rounded-xl text-white focus:outline-none" style={{background:'#0a0f1a',border:'1px solid #1e293b'}}/>
                </div>
              </div>
              {fatPorM2>0&&(
                <div className="mt-6 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl p-4 border" style={{background:'#0a0f1a',borderColor:'#06b6d440'}}>
                      <p className="text-xs mb-1" style={{color:'#64748b'}}>📊 Faturamento por M² (P.E.)</p>
                      <p className="text-3xl font-bold" style={{color:'#06b6d4'}}>{fmtR(fatPorM2)}/m²</p>
                      <p className="text-xs mt-1" style={{color:'#475569'}}>Meta mínima por m² para cobrir custos</p>
                    </div>
                    <div className="rounded-xl p-4 border" style={{background:'#0a0f1a',borderColor:'#10b98140'}}>
                      <div className="flex items-center gap-2 mb-1"><span>⭐</span><p className="text-xs font-bold" style={{color:'#10b981'}}>Faturamento Sugerido por M²</p><span className="text-xs px-2 py-0.5 rounded-full" style={{background:'#10b98120',color:'#10b981'}}>+50%</span></div>
                      <p className="text-3xl font-bold" style={{color:'#10b981'}}>{fmtR(fatSugM2)}/m²</p>
                    </div>
                  </div>
                  <div className="rounded-xl p-4 border" style={{background:'#0a0f1a',borderColor:'#1e293b'}}>
                    <p className="text-xs font-bold mb-3" style={{color:'#94a3b8'}}>📏 Calcular para um espaço específico:</p>
                    <div className="flex gap-2 items-center">
                      <input type="number" value={mSala} onChange={e=>setMSala(e.target.value)} placeholder="Ex: 15 m²"
                        className="flex-1 px-4 py-2.5 rounded-lg text-white text-sm focus:outline-none" style={{background:'#111827',border:'1px solid #334155'}}/>
                      <span className="text-sm" style={{color:'#64748b'}}>m²</span>
                    </div>
                    {fatSugSala>0&&(
                      <div className="mt-3 p-3 rounded-lg" style={{background:'#10b98115',border:'1px solid #10b98130'}}>
                        <p className="text-xs" style={{color:'#64748b'}}>Faturamento sugerido para {mSala} m²:</p>
                        <p className="text-2xl font-bold mt-1" style={{color:'#10b981'}}>{fmtR(fatSugSala)}/mês</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
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
