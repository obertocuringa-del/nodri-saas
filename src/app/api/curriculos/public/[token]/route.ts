import { NextRequest, NextResponse } from 'next/server'
import { getDocPorToken, vagasDoDoc, EXPERIENCIAS, ESTADOS_BR } from '@/lib/curriculos'

// GET público: valida o token e devolve as opções do formulário.
// O link é único do NODRI (não pertence mais a um salão), então as vagas vêm da
// lista global — o que qualquer salão acrescentar aparece aqui na hora.
export async function GET(_: NextRequest, { params }: { params: { token: string } }) {
  const doc = await getDocPorToken(params.token)
  if (!doc) return NextResponse.json({ error: 'Link inválido' }, { status: 404 })
  return NextResponse.json({
    salao_nome: 'NODRI',
    vagas: vagasDoDoc(doc),
    experiencias: EXPERIENCIAS,
    estados: ESTADOS_BR,
  })
}
