// pm2 do robô do Avec. O xvfb-run dá uma tela virtual: os Chromes abrem como
// Chrome normal (não "headless"), que é o que o Avec espera ver.
// A chave de serviço vem do .env da ponte (mesma CRM_PONTE_CHAVE).
const fs = require('fs')
const env = {}
for (const linha of fs.readFileSync('/home/nodri/ponte/.env', 'utf8').split('\n')) {
  const m = linha.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/)
  if (m && ['CRM_PONTE_CHAVE', 'NODRI_URL'].includes(m[1])) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

module.exports = {
  apps: [{
    name: 'robo-avec',
    cwd: '/home/nodri/robo',
    script: '/usr/bin/xvfb-run',
    args: ['-a', '-s', '-screen 0 1366x900x24', 'node', '/home/nodri/robo/index.mjs'],
    interpreter: 'none',
    env: { ...env, TZ: 'America/Sao_Paulo', LANG: 'pt_BR.UTF-8' },
    // Uma vez por dia os Chromes nascem de novo: memória limpa, sem reiniciar o servidor.
    cron_restart: '0 5 * * *',
    max_memory_restart: '3G',
    kill_timeout: 15000,
  }],
}
