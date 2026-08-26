import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client para uso no browser (anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Client para uso no servidor com permissão total (service role)
//
// `cache: 'no-store'` em toda leitura, e a razão é concreta: o supabase-js usa
// `fetch` por baixo, e o Next 14 guarda o resultado de fetch no Data Cache.
// `export const dynamic = 'force-dynamic'` na rota NÃO resolve isso — ele
// desliga o cache da ROTA, não o do fetch. O sintoma é a tela salvar um valor
// novo e a rota continuar devolvendo o antigo indefinidamente; foi assim que a
// comissão do afiliado ficou em 40% na página pública depois de virar 45% no
// painel. Em sistema de vários salões isso é pior ainda: um dado guardado pode
// reaparecer para outra pessoa.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: {
    fetch: (url, opts = {}) => fetch(url, { ...opts, cache: 'no-store' }),
  },
})
