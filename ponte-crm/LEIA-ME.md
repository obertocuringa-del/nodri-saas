# Ponte CRM NODRI

Segura a sessão de WhatsApp de cada salão e carrega mensagem de um lado para o
outro. É a peça que falta para o CRM do NODRI funcionar.

## Por que ela existe

O NODRI roda na Vercel, que trabalha por **função efêmera**: o código acorda,
responde e morre em segundos. Isso é ótimo para servir uma tela e **impossível
para segurar uma sessão de WhatsApp**, que precisa de uma conexão viva 24 horas
por dia esperando mensagem chegar.

Por isso a sessão mora aqui, num processo que fica ligado. A ponte não tem
tela nem regra de negócio: estado da conversa, dono, prazo, SLA e motivo de
perda ficam no NODRI, onde se corrige com um deploy em vez de mexer em servidor.

## Escanear uma vez, e pronto

As credenciais da sessão ficam gravadas na pasta `sessoes/<id-do-salao>/`. A
ponte reabre a conexão sozinha usando o que está ali — **não é preciso escanear
de novo** a cada reinício.

Só volta a pedir o QR em dois casos: se o salão desconectar pelo celular
(Aparelhos conectados → sair), ou se clicar em desconectar no NODRI.

> **Importante em servidor na nuvem:** a pasta `sessoes` precisa ser um disco
> que sobrevive a reinício. Em plataformas com disco descartável (Railway, Fly,
> Render sem volume), aponte `CRM_SESSOES_DIR` para um volume — senão cada
> deploy apaga a sessão e o salão precisa escanear tudo de novo.

## Como ligar

```bash
cd ponte-crm
npm install
```

Depois defina as variáveis e rode:

```bash
CRM_PONTE_CHAVE="a-mesma-chave-do-vercel" npm start
```

No Windows (PowerShell):

```powershell
$env:CRM_PONTE_CHAVE = "a-mesma-chave-do-vercel"
npm start
```

## Variáveis

| Variável | Para quê | Padrão |
|---|---|---|
| `CRM_PONTE_CHAVE` | **Obrigatória.** A senha entre a ponte e o NODRI. Tem que ser idêntica à do Vercel | — |
| `NODRI_URL` | Endereço do NODRI | `https://www.nodri.com.br` |
| `CRM_SESSOES_DIR` | Onde gravar as sessões | `./sessoes` |
| `CRM_CICLO_MS` | Intervalo entre voltas do laço | `4000` |
| `LOG_LEVEL` | `warn`, `info`, `debug` | `warn` |

## No Vercel

Crie a variável de ambiente `CRM_PONTE_CHAVE` com o **mesmo valor** usado aqui,
em Production, Preview e Development. Sem ela, o NODRI recusa a ponte — e é
proposital: uma porta de serviço sem chave é uma porta aberta.

Gere um valor longo e aleatório. Por exemplo:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Como saber que está funcionando

1. Ligue a ponte. Ela imprime `ligando — NODRI em ...`
2. No NODRI, abra **Iniciar CRM** e clique em **Gerar o QR code**
3. Em poucos segundos a ponte imprime `QR gerado` e o código aparece na tela
4. Escaneie no celular: **WhatsApp → Aparelhos conectados → Conectar aparelho**
5. A ponte imprime `conectado como 55...` e a tela mostra **Conectado**

Se mandar uma mensagem para o número a partir de outro celular, ela aparece na
fila do CRM em poucos segundos.

## Grupos ficam de fora

O CRM é para conversa com cliente. Grupo da equipe, grupo de fornecedor e
status continuam só no celular. Trazer isso para a fila da recepção enterraria
o que importa debaixo do que não importa.

## O que esperar de problema

**A conexão cai de vez em quando.** É normal, e a ponte reabre sozinha. A tela
do NODRI mostra o selo mudando para "Conexão caiu" e depois voltando.

**Sem sinal da ponte por dois minutos**, o NODRI passa a mostrar "Conexão
caiu" mesmo que o banco ainda diga conectado. É de propósito: melhor o salão
saber na hora do que descobrir pelo cliente que ficou sem resposta.

**O celular precisa se conectar à internet pelo menos uma vez a cada duas
semanas**, ou o WhatsApp desliga os aparelhos vinculados. Num salão em
funcionamento isso nunca acontece.

**Risco de bloqueio.** Conectar um sistema próprio pelo QR não é um uso
previsto pelo WhatsApp. O risco é baixo neste desenho — não há disparo
automático, e a ponte dá um respiro de 1,2 segundo entre mensagens para manter
o ritmo parecido com o de uma pessoa digitando — mas **baixo não é zero**.
