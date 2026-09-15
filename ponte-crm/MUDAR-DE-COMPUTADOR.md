# Mudar a ponte do CRM para outro computador

**A regra de ouro: só UMA ponte ligada por vez.** Duas no mesmo número derrubam
a sessão do WhatsApp e obrigam a escanear o QR de novo. Por isso o computador
velho sai do ar ANTES de o novo entrar.

## O que NÃO precisa refazer

Está tudo na nuvem e volta sozinho: conversas, pastas (Preciso agir, Listas,
Feedback, Confirmação…), mensagens prontas, motivos, origens, a configuração da
automação de feedback e **a lista de quem já recebeu feedback hoje**.

## O que só existe no computador

| Item | Onde |
|---|---|
| Sessão do WhatsApp (evita reescanear o QR) | `ponte-crm/sessoes/` |
| Chave da ponte | dentro do `ponte-crm/INICIAR-PONTE.bat` |
| Dependências | `ponte-crm/node_modules/` (recriável com `npm install`) |
| Chave + e-mail/senha do Avec da extensão | dentro do Chrome, nas Opções da extensão |

---

## Passo a passo

### 1. No computador NOVO — preparar (pode fazer com o velho ainda ligado)

1. Instalar o **Node.js** (versão 22 ou mais nova).
2. Instalar o **Google Chrome** e entrar no Avec nele.
3. Copiar a pasta **`nodri-repo` inteira** do computador velho (pen drive, rede
   ou nuvem). Copiar a pasta inteira é o caminho mais curto: ela já traz o
   `INICIAR-PONTE.bat` com a chave e a pasta `sessoes/`, então **não precisa
   escanear o QR de novo**.
   - Se preferir baixar do GitHub em vez de copiar, lembre que `sessoes/` e
     `INICIAR-PONTE.bat` **não vão no download**: crie o `.bat` a partir do
     `INICIAR-PONTE.exemplo.bat` e ponha a mesma `CRM_PONTE_CHAVE` do antigo.
     Nesse caminho você vai precisar escanear o QR uma vez.

### 2. Desligar o computador VELHO

1. Fechar a janela preta **"Ponte CRM NODRI"**.
2. Tirar do Inicializar do Windows: tecla Windows + R → `shell:startup` → apagar
   o atalho **Ponte CRM NODRI**.
3. Remover a extensão do Chrome antigo (`chrome://extensions`), para ela não
   ficar mandando o mesmo relatório em paralelo.

### 3. Ligar o computador NOVO

1. Abrir `ponte-crm\INICIAR-PONTE.bat` (dois cliques). Na primeira vez ele
   instala as dependências sozinho e demora um pouco.
2. Abrir o CRM no NODRI. Deve aparecer **"Conectado"** no topo.
   - Se aparecer o QR, escaneie: celular → WhatsApp → Aparelhos conectados →
     Conectar aparelho.
3. Pôr para iniciar junto com o Windows: Windows + R → `shell:startup` → criar
   atalho apontando para o `INICIAR-PONTE.bat`.

### 4. A extensão de feedback

1. `chrome://extensions` → ligar **Modo do desenvolvedor**.
2. **Carregar sem compactação** → escolher a pasta `extensao-feedback-avec`.
3. Clicar na extensão → **Opções** → preencher:
   - **Chave**: copiar em NODRI › CRM › Configurar › Automação de feedback.
   - **E-mail e senha do Avec** (ficam só neste computador, não vão para o NODRI).
4. **Salvar** → **Rodar um ciclo agora**.

### 5. Conferir que ficou tudo de pé

- CRM mostra **"Conectado"** e o número certo.
- Em Configurar › Automação de feedback: **"Extensão vista: há 1 min"**.
- Manda uma mensagem de teste para o próprio celular e vê se aparece no CRM.

---

## Cuidados

- **Não renomear nem mover a pasta `nodri-repo`** depois de pronto: o atalho do
  Inicializar e a extensão apontam para ela pelo caminho.
- O Chrome precisa estar **rodando** para a extensão funcionar. Se depois de
  reiniciar o PC a tela disser "Extensão vista: há muito tempo", deixe o Chrome
  aberto na recepção.
- A extensão **não se atualiza sozinha**: quando houver versão nova, copie a
  pasta de novo e clique em recarregar em `chrome://extensions`.
