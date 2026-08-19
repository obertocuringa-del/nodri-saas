# NODRI — Emissão de Guias do MEI (extensão do Chrome)

Automatiza a emissão das guias DAS dos profissionais cadastrados no NODRI.
O NODRI monta a fila; esta extensão dirige o PGMEI da Receita **no seu navegador,
com a sua sessão**, e baixa os PDFs já renomeados.

## Instalar

1. Abra `chrome://extensions`
2. Ligue **Modo do desenvolvedor** (canto superior direito)
3. Clique em **Carregar sem compactação**
4. Escolha esta pasta (`extensao-guias-mei`)
5. Volte ao NODRI, tela **Profissionais → CNPJ**, e clique em **Emitir todas as guias**.
   Deve aparecer *"✅ Extensão detectada"*.

### O endereço TEM que estar na lista

A extensão só se conecta nas páginas listadas em `manifest.json` → `content_scripts`
→ primeiro `matches`. Hoje estão liberados `www.nodri.com.br`, `nodri.com.br`,
`nodri-saas.vercel.app`, `nodri-saas-jsx4.vercel.app` e `localhost:3000`.

Se você abrir o NODRI por qualquer outro endereço, o botão fica **laranja**
("extensão não encontrada") mesmo com ela instalada e funcionando — o script
simplesmente não entra naquela página. Nesse caso, acrescente o endereço nessa
lista e recarregue a extensão.

**A cor do botão é o diagnóstico:** laranja = a página não enxerga a extensão;
roxo claro = conversando normalmente.

## Como usar

Na tela **CNPJ dos Profissionais**:

- **⚙️ Configurar emissão** — data de pagamento, anos a verificar, nome do arquivo,
  pasta de destino, intervalo entre profissionais e o endereço do PGMEI.
- **📄 Emitir todas as guias** — abre a fila. Entram apenas os profissionais com
  status **OK / Ativo** e CNPJ preenchido.

A extensão faz, para cada profissional: abre o PGMEI → preenche o CNPJ →
seleciona o ano → marca os meses em aberto → preenche a data de pagamento →
gera o DAS → baixa o PDF renomeado → registra no NODRI → vai para o próximo.

## O captcha

O PGMEI usa **hCaptcha invisível**: na maioria das vezes ele libera sem mostrar
nada e a fila roda sozinha do começo ao fim.

Quando a Receita resolver mostrar um desafio, a fila **pausa** e a linha do
profissional fica em *"Resolva o captcha na aba do PGMEI"*. Você resolve com a
mão e a fila continua.

A extensão **não tenta contornar o captcha** — isso violaria os termos de uso da
Receita. Se você notar desafios aparecendo com frequência, aumente o **intervalo
entre profissionais** na configuração.

## Antes de confiar 100%: a conferência

A configuração vem com **"Conferir os meses marcados antes de gerar"** ligada.
Antes de gerar cada guia aparece uma janela mostrando quais meses foram marcados
e o total. Você confirma (ou cancela para pular o profissional).

Deixe ligada nas primeiras rodadas. Serve para confirmar uma coisa que só o uso
real responde: **como o PGMEI mostra um mês que já foi pago.** Se meses pagos
aparecerem com valor na tabela, a regra de marcação precisa de ajuste — e é
melhor descobrir na conferência do que pagando um DAS duas vezes.

Depois que você validar, desligue a opção e a emissão fica sem nenhuma parada.

## Onde os arquivos caem

Dentro da pasta de Downloads do Chrome, no caminho configurado. Padrão:

```
Downloads/Guias MEI/2026-08/Katarina Sena - 08-2026.pdf
```

Marcadores aceitos no nome e na pasta: `{nome}`, `{cnpj}`, `{mes}`, `{ano}`.
Com guia consolidada de vários meses, `{mes}` vira o intervalo (ex.: `01a09`).

## Se parar de funcionar

O PGMEI é um site de terceiro, sem contrato. Se a Receita mudar a página, a
extensão pode quebrar. O que fazer:

- **Mudou só o endereço** → atualize em ⚙️ Configurar emissão → Avançado.
  Não precisa mexer em código.
- **Mudou o layout** → a fila vai acusar qual passo falhou (ex.: *"Botão
  Apurar/Gerar DAS não encontrado"*). Isso indica onde ajustar em `pgmei.js`.

Nada disso derruba o NODRI: o botão **Emitir Guia do MEI** individual de cada
card continua funcionando, e você volta ao fluxo manual enquanto isso.

Para depurar: `chrome://extensions` → **Service worker** (log do `background.js`)
e o console da aba do PGMEI (log do `pgmei.js`).

## Arquivos

| Arquivo | Função |
|---|---|
| `manifest.json` | Permissões e em quais sites cada script roda |
| `ponte.js` | Roda na página do NODRI; repassa mensagens (não usa o id da extensão) |
| `background.js` | Orquestra a fila, decide o próximo passo, nomeia e baixa os PDFs |
| `pgmei.js` | Roda no site da Receita; preenche campos e clica nos botões |

## Permissões e por quê

- `downloads` — baixar o PDF com o nome certo na pasta certa
- `storage` — guardar o estado da fila (o service worker do Chrome pode ser desligado no meio)
- `tabs` — abrir e reaproveitar a aba do PGMEI
- `host_permissions: receita.fazenda.gov.br` — único site que a extensão automatiza

A extensão não envia nada para servidor nenhum: ela só conversa entre a aba do
NODRI e a aba da Receita, dentro do seu navegador.
