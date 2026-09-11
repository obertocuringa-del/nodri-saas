# CRM NODRI — o que falta, na ordem

Regra que vale para tudo aqui: **o sistema marca sozinho, quem escreve é
gente.** Nenhuma mensagem sai sem alguém clicar em Enviar. Foi decidido em
11/09/2026 e é o que separa "automatizado" de "número bloqueado pelo
WhatsApp".

## Feito

- [x] Conexão por QR, sessão que sobrevive a reinício
- [x] Histórico do celular entra junto no pareamento
- [x] Mensagem que o salão manda pelo celular também aparece
- [x] Disparo de lista não apaga a pergunta da cliente
- [x] Botão "Aguardando cliente"
- [x] "Sem conversão" mostra o motivo escolhido
- [x] Fila separada em "Preciso agir" (até 3 dias) e "Sem resposta"

## 1. O relógio — a automação de verdade

A recepção esquece. Então o sistema não pode depender dela para lembrar.
Uma rota `?acao=relogio` chamada pela ponte a cada minuto:

- **Follow-up sozinho**: respondeu e a cliente não voltou em X horas úteis →
  volta para a fila como Follow-up. X configurável.
- **Pausa volta sozinha** na data marcada.
- **Agendado sozinho**: a cliente aparece em `atendimentos_raw` depois da
  conversa → marca Agendado. É isto que faz a taxa de conversão se medir sem
  ninguém marcar nada.
- **Cliente nova sozinha**: contato sem nenhum atendimento no histórico →
  etiqueta automática.

Pedra no caminho: `atendimentos_raw` **não tem telefone**, só o nome da
cliente. O casamento é por nome normalizado, então vai pegar uma parte e
deixar outra de fora. O que não casar fica para ligação manual na tela — e
isso precisa estar visível, não escondido.

## 2. Configuração do CRM

Hoje não existe tela: mensagens prontas e motivos de perda são os de fábrica.
Precisa de uma aba de configuração para:

- editar/criar/apagar mensagens prontas
- editar/criar/apagar motivos de "Não fechou"
- o prazo do follow-up automático
- o corte de "Sem resposta" (hoje 3 dias, fixo)

## 3. Resposta em árvore

Clicar em "Responder preço" abre um caminho em vez de um texto pronto:

```
Preço → Serviço → [categoria] → [serviço com valor]
      → Produto → [marca] → [produto com valor]
      → Escrever à mão
```

Puxando dos catálogos que o NODRI já tem, para o preço nunca sair
desatualizado da boca da recepção.

## 4. Abas novas

- **Clientes novos**: primeira vez no salão, detectado sozinho (depende do 1)
- **Tráfego**: origem comercial da conversa. Marcação de um clique, com
  padrão sugerido para cliente nova que chegou sem indicação.

## 5. A cara da tela

Ficou funcional e feia. Depois que o comportamento estiver certo, refazer:
tipografia, respiro, a lista da esquerda, os balões, o painel da direita.
Deixar por último é de propósito — redesenhar em cima de regra que ainda vai
mudar é trabalho jogado fora.
