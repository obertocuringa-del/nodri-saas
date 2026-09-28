// pm2 do robô do relatório. Chave de serviço do .env da ponte (mesma CRM_PONTE_CHAVE).
const fs = require('fs')
const env = {}
for (const linha of fs.readFileSync('/home/nodri/ponte/.env', 'utf8').split('\n')) {
  const m = linha.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/)
  if (m && ['CRM_PONTE_CHAVE', 'NODRI_URL'].includes(m[1])) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
module.exports = {
  apps: [{
    name: 'robo-relatorio',
    cwd: '/home/nodri/robo-relatorio',
    script: '/home/nodri/robo/pyenv/bin/python',
    args: ['-u', '/home/nodri/robo-relatorio/agendador.py'],
    interpreter: 'none',
    env: { ...env, TZ: 'America/Sao_Paulo', LANG: 'pt_BR.UTF-8', MPLBACKEND: 'Agg' },
    kill_timeout: 20000,
  }],
}
