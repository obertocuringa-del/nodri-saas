// Tela de opções: guarda a chave e o acesso do Avec no chrome.storage.local
// deste computador. Nada daqui sai para o NODRI além da chave.
const $ = id => document.getElementById(id)

async function carregar() {
  const d = await chrome.storage.local.get(['chave', 'email', 'senha', 'saude'])
  $('chave').value = d.chave || ''
  $('email').value = d.email || ''
  $('senha').value = d.senha || ''
  mostrarSaude(d.saude)
}

function mostrarSaude(s) {
  if (!s) { $('saude').textContent = 'Ainda não rodou nenhum ciclo.'; return }
  const linhas = [
    `Último ciclo: ${s.em ? new Date(s.em).toLocaleString('pt-BR') : '—'}`,
    `Situação: ${s.texto || '—'}`,
  ]
  if (s.lidas !== undefined) linhas.push(`Linhas lidas: ${s.lidas} · pagas hoje: ${s.elegiveis ?? '—'} · enviadas: ${s.enviadas ?? '—'}`)
  if (s.erro) linhas.push(`Erro: ${s.erro}`)
  $('saude').textContent = linhas.join('\n')
}

$('salvar').addEventListener('click', async () => {
  await chrome.storage.local.set({
    chave: $('chave').value.trim(),
    email: $('email').value.trim(),
    senha: $('senha').value,
  })
  $('aviso').textContent = 'Salvo. A extensão usa a configuração na próxima volta.'
  chrome.runtime.sendMessage({ tipo: 'reagendar' }, () => { void chrome.runtime.lastError })
})

$('testar').addEventListener('click', () => {
  $('aviso').textContent = 'Rodando…'
  chrome.runtime.sendMessage({ tipo: 'rodar-agora' }, () => { void chrome.runtime.lastError })
})

chrome.storage.onChanged.addListener(m => { if (m.saude) mostrarSaude(m.saude.newValue) })
carregar()
