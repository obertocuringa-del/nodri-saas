# A extensão do Avec — onde ela roda e como atualizar

Esta é a extensão do Chrome que lê os relatórios do Avec. É ela que faz o
feedback, a confirmação do dia seguinte, o aviso ao profissional e a marcação
de "Confirmado" na agenda. O NODRI não lê o Avec: ele diz o que fazer, e ela faz.

## Onde ela roda

No **servidor** (2.25.250.201), em `/home/nodri/robo/extensao`, dentro de um
Chrome que o `robo-avec` mantém aberto numa tela virtual. O computador do salão
pode ficar desligado — foi para isso que o servidor foi comprado.

Qual dos dois lê o Avec é decidido pelo campo `no_servidor`, em `salao_config`,
chave `crm_robo_avec`. Ligado: o servidor lê e a extensão do salão fica parada.
Desligado: o contrário. Só um dos dois lê, nunca os dois — senão brigam pela
mesma aba.

## Esta pasta NÃO é publicada

Até 01/10/2026 esta extensão existia **só no servidor**: foi copiada à mão em
26/09 e não estava em lugar nenhum no git. Uma reinstalação do servidor levaria
o trabalho junto. A cópia mora aqui agora para não se perder.

O `scripts/publicar-servidor.sh` **não** mexe nesta pasta, de propósito: a
extensão tem o seu próprio ritmo de atualização (o `robo-avec` fecha e reabre o
Chrome sozinho quando vê a versão do `manifest.json` mudar) e um PUBLICAR no
meio de uma leitura do Avec estragaria a leitura.

## Como atualizar

1. Edite os arquivos **aqui**.
2. Suba a versão no `manifest.json` — é ela que faz o robô trocar o Chrome.
3. Copie para o servidor:

```bash
scp -i ~/.ssh/nodri_servidor extensao-avec/background.js extensao-avec/manifest.json root@2.25.250.201:/home/nodri/robo/extensao/
ssh -i ~/.ssh/nodri_servidor root@2.25.250.201 'chown -R nodri:nodri /home/nodri/robo/extensao'
```

4. Em até um minuto o log do robô mostra `Chrome fechado (extensão nova X.Y.Z)`
   seguido de `Chrome aberto`. Confira com:

```bash
ssh -i ~/.ssh/nodri_servidor root@2.25.250.201 'tail -3 /home/nodri/.pm2/logs/robo-avec-out.log'
```

## Como saber se ela está trabalhando

O jeito certo é olhar **só as chamadas que saem do próprio servidor** — a
máquina do salão também tem a extensão instalada e fica perguntando a cada
minuto, mesmo parada. Misturar as duas foi o que atrasou o diagnóstico de
01/10/2026:

```bash
ssh -i ~/.ssh/nodri_servidor root@2.25.250.201 \
  'grep "automacao/extensao" /var/log/nginx/access.log | grep "^2.25.250.201" | tail -20 | awk "{print \$4, \$6, \$9}"'
```

Uma volta sadia aparece como `GET 200` e, logo depois, `POST 200`. GET sem POST
atrás é volta que começou e não terminou.

## O que foi consertado em 01/10/2026 (1.5.0 → 1.5.5)

O salão passou o dia sem enviar nada, com a tela dizendo "extensão vista agora".
Quatro coisas no mesmo arquivo:

- **`perguntar` esperava para sempre.** `chrome.tabs.sendMessage` só chama de
  volta quando a aba responde ou a porta fecha. Content script que atende, diz
  "respondo depois" e morre no meio deixa essa espera pendurada — e com ela a
  volta inteira, sem erro e sem registro. Era a única espera sem prazo do
  arquivo. Agora tem 10 s (30 s para ler o relatório, que é mais demorado).
- **`nodri()` não tinha prazo no fetch.** NODRI fora do ar segurava a volta.
  Agora 25 s.
- **O Chrome matava a extensão no meio do serviço.** O service worker é
  encerrado depois de ~30 s sem chamada de sistema, e esperar aba responder não
  conta. `manterAcordado()` faz uma chamada barata a cada 20 s enquanto a volta
  corre, e para assim que ela acaba.
- **A trava `rodando` não destravava.** Ela só voltava a `false` no `finally`,
  que nunca rodava quando a volta ficava pendurada. Agora uma volta parada há
  mais de 5 minutos é dada como perdida.

**Ainda não está no ponto.** Depois disso a extensão passou a completar voltas,
mas uma a cada ~10 minutos em vez de a cada 30 segundos. O alarme é de 30 s, e
alguma coisa ainda segura a volta entre uma e outra. O próximo passo é descobrir
o quê — e a dificuldade é que o console do service worker não é capturável de
fora pelo puppeteer; o caminho que funciona é gravar o passo em
`chrome.storage.local` e ler de lá.
