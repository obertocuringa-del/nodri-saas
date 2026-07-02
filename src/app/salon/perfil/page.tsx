'use client'
import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Save, Loader2, User, Mail, Phone, Key, Eye, EyeOff, FileText, MapPin, Image as ImageIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function PerfilSalaoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSenha, setShowSenha] = useState(false)
  const [form, setForm] = useState({ nome: '', responsavel: '', email: '', telefone: '', nova_senha: '', confirmar_senha: '', cnpj: '', endereco: '', cidade: '', rg_responsavel: '' })
  const [logo, setLogo] = useState('')
  const logoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/salon/perfil').then(r => r.json()).then(salao => {
      setForm(p => ({ ...p, nome: salao.nome || '', responsavel: salao.responsavel || '', email: salao.email || '', telefone: salao.telefone || '', cnpj: salao.cnpj || '', endereco: salao.endereco || '', cidade: salao.cidade || '', rg_responsavel: salao.rg_responsavel || '' }))
      setLoading(false)
    }).catch(() => setLoading(false))
    // logo do salão (usada nas impressões no lugar da marca NODRI)
    fetch('/api/salon/grid?chave=logo_salao').then(r => r.ok ? r.json() : null).then(d => { if (d?.logo) setLogo(d.logo) }).catch(() => {})
  }, [])

  async function persistirLogo(novo: string) {
    setLogo(novo)
    try {
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave: 'logo_salao', doc: { logo: novo } }) })
      if (res.ok) toast.success(novo ? 'Logo salva! Ela sai em todas as impressões.' : 'Logo removida — volta a sair NODRI.')
      else toast.error('Erro ao salvar a logo')
    } catch { toast.error('Erro de conexão') }
  }

  function onLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    if (!f.type.startsWith('image/')) { toast.error('Selecione uma imagem'); return }
    if (f.size > 1.5 * 1024 * 1024) { toast.error('Imagem muito grande (máx. 1,5 MB)'); return }
    const reader = new FileReader()
    reader.onload = () => persistirLogo(String(reader.result || ''))
    reader.readAsDataURL(f)
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    if (form.nova_senha && form.nova_senha !== form.confirmar_senha) { toast.error('As senhas não coincidem'); return }
    if (form.nova_senha && form.nova_senha.length < 6) { toast.error('Senha mínima de 6 caracteres'); return }
    setSaving(true)
    const res = await fetch('/api/salon/perfil', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: form.nome, responsavel: form.responsavel, telefone: form.telefone, nova_senha: form.nova_senha || undefined, cnpj: form.cnpj, endereco: form.endereco, cidade: form.cidade, rg_responsavel: form.rg_responsavel }),
    })
    setSaving(false)
    if (res.ok) { toast.success('Perfil atualizado!'); setForm(p => ({ ...p, nova_senha: '', confirmar_senha: '' })) }
    else toast.error('Erro ao salvar')
  }

  return (
    <div className="min-h-screen bg-nodri-dark">
      <div className="sticky top-0 z-20 bg-nodri-surface border-b border-nodri-border px-5 py-3 flex items-center gap-3">
        <button onClick={() => router.push('/salon')} className="flex items-center gap-2 text-nodri-t2 hover:text-nodri-cyan transition-colors text-sm">
          <ArrowLeft size={16} /> Voltar ao painel
        </button>
        <div className="w-px h-5 bg-nodri-border" />
        <h1 className="font-syne font-bold text-[15px]">Meu Perfil</h1>
      </div>

      <div className="max-w-lg mx-auto px-5 py-8">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-nodri-cyan" /></div>
        ) : (
          <form onSubmit={handleSalvar} className="space-y-4">
            <div className="nodri-card p-5 space-y-4">
              <h2 className="font-syne font-bold text-[13px] text-nodri-cyan">Dados do Salão</h2>
              <div>
                <label className="text-[11px] text-nodri-t3 uppercase tracking-wider mb-1.5 block">Nome do Salão</label>
                <div className="relative">
                  <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nodri-t3" />
                  <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                    className="w-full bg-nodri-surface border border-nodri-border rounded-lg pl-8 pr-3 py-2.5 text-[13px] outline-none focus:border-nodri-cyan transition-colors" />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-nodri-t3 uppercase tracking-wider mb-1.5 block">Responsável</label>
                <div className="relative">
                  <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nodri-t3" />
                  <input value={form.responsavel} onChange={e => setForm(p => ({ ...p, responsavel: e.target.value }))}
                    className="w-full bg-nodri-surface border border-nodri-border rounded-lg pl-8 pr-3 py-2.5 text-[13px] outline-none focus:border-nodri-cyan transition-colors" />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-nodri-t3 uppercase tracking-wider mb-1.5 block">Email (não editável)</label>
                <div className="relative">
                  <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nodri-t3" />
                  <input value={form.email} disabled
                    className="w-full bg-nodri-card border border-nodri-border rounded-lg pl-8 pr-3 py-2.5 text-[13px] text-nodri-t3 cursor-not-allowed" />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-nodri-t3 uppercase tracking-wider mb-1.5 block">Telefone</label>
                <div className="relative">
                  <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nodri-t3" />
                  <input value={form.telefone} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-nodri-surface border border-nodri-border rounded-lg pl-8 pr-3 py-2.5 text-[13px] outline-none focus:border-nodri-cyan transition-colors" />
                </div>
              </div>
            </div>

            <div className="nodri-card p-5 space-y-4">
              <h2 className="font-syne font-bold text-[13px] text-nodri-cyan flex items-center gap-2"><ImageIcon size={14} /> Logo do Salão</h2>
              <p className="text-nodri-t3 text-[11px]">Sua logo substitui a marca NODRI em todas as impressões (listas, preços, documentos). Imagem até 1,5 MB.</p>
              <input ref={logoRef} type="file" accept="image/*" onChange={onLogoFile} className="hidden" />
              {logo ? (
                <div className="flex items-center gap-3 flex-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logo} alt="Logo do salão" style={{ maxHeight: 64, maxWidth: 200, objectFit: 'contain', background: '#fff', borderRadius: 10, padding: 6 }} />
                  <button type="button" onClick={() => logoRef.current?.click()}
                    className="px-4 py-2 rounded-lg border border-nodri-border text-nodri-cyan text-[12px] font-bold hover:border-nodri-cyan transition-colors">Trocar</button>
                  <button type="button" onClick={() => persistirLogo('')}
                    className="px-4 py-2 rounded-lg border border-nodri-red/40 text-nodri-red text-[12px] font-bold hover:bg-nodri-red/10 transition-colors">Remover</button>
                </div>
              ) : (
                <button type="button" onClick={() => logoRef.current?.click()}
                  className="w-full py-4 rounded-xl border-2 border-dashed border-nodri-border text-nodri-t2 text-[13px] font-bold hover:border-nodri-cyan hover:text-nodri-cyan transition-colors">
                  🖼️ Clique para anexar a logo do salão
                </button>
              )}
            </div>

            <div className="nodri-card p-5 space-y-4">
              <h2 className="font-syne font-bold text-[13px] text-nodri-cyan">Dados para Documentos (Distrato / Contrato)</h2>
              <p className="text-nodri-t3 text-[11px]">Esses dados preenchem automaticamente o Distrato e outros documentos.</p>
              <div>
                <label className="text-[11px] text-nodri-t3 uppercase tracking-wider mb-1.5 block">CNPJ do Salão</label>
                <div className="relative">
                  <FileText size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nodri-t3" />
                  <input value={form.cnpj} onChange={e => setForm(p => ({ ...p, cnpj: e.target.value }))}
                    placeholder="00.000.000/0001-00"
                    className="w-full bg-nodri-surface border border-nodri-border rounded-lg pl-8 pr-3 py-2.5 text-[13px] outline-none focus:border-nodri-cyan transition-colors" />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-nodri-t3 uppercase tracking-wider mb-1.5 block">RG do Responsável</label>
                <div className="relative">
                  <FileText size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nodri-t3" />
                  <input value={form.rg_responsavel} onChange={e => setForm(p => ({ ...p, rg_responsavel: e.target.value }))}
                    placeholder="0000000000"
                    className="w-full bg-nodri-surface border border-nodri-border rounded-lg pl-8 pr-3 py-2.5 text-[13px] outline-none focus:border-nodri-cyan transition-colors" />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-nodri-t3 uppercase tracking-wider mb-1.5 block">Cidade / Estado</label>
                <div className="relative">
                  <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nodri-t3" />
                  <input value={form.cidade} onChange={e => setForm(p => ({ ...p, cidade: e.target.value }))}
                    placeholder="Ex: BRASÍLIA, DF"
                    className="w-full bg-nodri-surface border border-nodri-border rounded-lg pl-8 pr-3 py-2.5 text-[13px] outline-none focus:border-nodri-cyan transition-colors" />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-nodri-t3 uppercase tracking-wider mb-1.5 block">Endereço Completo do Salão</label>
                <div className="relative">
                  <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nodri-t3" />
                  <input value={form.endereco} onChange={e => setForm(p => ({ ...p, endereco: e.target.value }))}
                    placeholder="Ex: EQN 110/111 NORTE BLOCO A LOJAS 14 E 15, PLAZA NORTE"
                    className="w-full bg-nodri-surface border border-nodri-border rounded-lg pl-8 pr-3 py-2.5 text-[13px] outline-none focus:border-nodri-cyan transition-colors" />
                </div>
              </div>
            </div>

            <div className="nodri-card p-5 space-y-4">
              <h2 className="font-syne font-bold text-[13px] text-nodri-cyan">Alterar Senha</h2>
              <p className="text-nodri-t3 text-[11px]">Deixe em branco para manter a senha atual.</p>
              <div>
                <label className="text-[11px] text-nodri-t3 uppercase tracking-wider mb-1.5 block">Nova Senha</label>
                <div className="relative">
                  <Key size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nodri-t3" />
                  <input type={showSenha ? 'text' : 'password'} value={form.nova_senha}
                    onChange={e => setForm(p => ({ ...p, nova_senha: e.target.value }))}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-nodri-surface border border-nodri-border rounded-lg pl-8 pr-9 py-2.5 text-[13px] outline-none focus:border-nodri-cyan transition-colors" />
                  <button type="button" onClick={() => setShowSenha(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-nodri-t3">
                    {showSenha ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-nodri-t3 uppercase tracking-wider mb-1.5 block">Confirmar Nova Senha</label>
                <div className="relative">
                  <Key size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nodri-t3" />
                  <input type={showSenha ? 'text' : 'password'} value={form.confirmar_senha}
                    onChange={e => setForm(p => ({ ...p, confirmar_senha: e.target.value }))}
                    placeholder="Repita a nova senha"
                    className="w-full bg-nodri-surface border border-nodri-border rounded-lg pl-8 pr-3 py-2.5 text-[13px] outline-none focus:border-nodri-cyan transition-colors" />
                </div>
              </div>
            </div>

            <button type="submit" disabled={saving}
              className="w-full py-3 bg-nodri-cyan text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 transition-all text-[14px]">
              {saving ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : <><Save size={16} /> Salvar Alterações</>}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
