
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    
    // Limpar o cookie do token
    cookieStore.set('nodri_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
      expires: new Date(0)
    })
    
    // Limpar também qualquer cookie de sessão adicional
    cookieStore.set('nodri_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    })
    
    return NextResponse.json({ 
      success: true, 
      message: 'Logout realizado com sucesso' 
    })
    
  } catch (error) {
    console.error('Erro ao fazer logout:', error)
    return NextResponse.json(
      { success: false, message: 'Erro ao fazer logout' },
      { status: 500 }
    )
  }
}

// Também aceita GET para compatibilidade
export async function GET(request: NextRequest) {
  return POST(request)
}
