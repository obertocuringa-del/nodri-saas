# NODRI SaaS — Sistema de Gestão de Salões de Beleza

Sistema SaaS multi-tenant completo para gerenciamento de salões de beleza.

---

## Stack

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Banco de dados**: Supabase (PostgreSQL)
- **Auth**: JWT em cookie httpOnly
- **Deploy**: Vercel

---

## Como rodar — Passo a Passo

### 1. Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta
2. Clique em **New Project**
3. Escolha nome, senha e região (preferencialmente São Paulo)
4. Aguarde o projeto inicializar (~2 min)

### 2. Executar o banco de dados

1. No painel do Supabase, vá em **SQL Editor**
2. Clique em **New Query**
3. Cole o conteúdo de `supabase/migrations/001_schema.sql`
4. Clique em **Run**

### 3. Copiar as chaves do Supabase

1. Vá em **Project Settings → API**
2. Copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` → `SUPABASE_SERVICE_ROLE_KEY`

### 4. Configurar variáveis de ambiente

```bash
cp .env.example .env.local
# Edite .env.local com suas chaves do Supabase
```

### 5. Instalar dependências e rodar

```bash
npm install
npm run dev
```

Acesse: http://localhost:3000

---

## Login inicial

| Campo | Valor |
|-------|-------|
| Email | admin@nodri.com.br |
| Senha | NodriAdmin@2024 |

> ⚠️ Troque a senha do admin após o primeiro login!

---

## Deploy na Vercel

1. Suba o projeto no GitHub
2. Acesse [vercel.com](https://vercel.com) → **New Project**
3. Importe o repositório
4. Em **Environment Variables**, adicione todas as variáveis do `.env.example`
5. Clique em **Deploy**

---

## Estrutura do Projeto

```
nodri-saas/
├── src/
│   ├── app/
│   │   ├── login/          # Tela de login
│   │   ├── admin/          # Painel Admin Master
│   │   ├── salon/          # Painel do Salão (cliente)
│   │   └── api/            # API Routes
│   │       ├── auth/       # Login / Logout
│   │       ├── salons/     # CRUD de salões + módulos
│   │       └── notifications/
│   ├── components/
│   │   ├── admin/          # Componentes do painel admin
│   │   └── salon/          # Componentes do painel salão
│   ├── lib/
│   │   ├── supabase.ts     # Cliente Supabase
│   │   └── auth.ts         # JWT + bcrypt
│   ├── types/              # TypeScript types
│   └── middleware.ts       # Proteção de rotas
└── supabase/
    └── migrations/
        └── 001_schema.sql  # Schema completo do banco
```

---

## Como cadastrar um novo salão

1. Faça login como Admin Master
2. Clique em **Novo Salão**
3. Preencha os dados + senha de acesso
4. O salão já pode fazer login com email + senha
5. Clique em **Módulos** para habilitar o que o plano permite

---

## Fluxo do sistema

```
Cliente acessa URL → Login → Painel do Salão
                                    ↓
                            Vê módulos ativos → Clica Abrir
                            Vê módulos bloqueados → Clica Ativar (contato)

Admin acessa URL → Login → Painel Master
                                ↓
                        Gerencia salões, módulos, notificações
```

 
.
