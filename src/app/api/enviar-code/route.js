import { NextResponse } from 'next/server'
import { supabase } from '../../lib/supabaseClient'

export async function POST(req) {
  try {
    const { telefone } = await req.json()
    if (!telefone) return NextResponse.json({ ok: false, error: 'Telefone obrigatório' })

    const codigo = Math.floor(100000 + Math.random() * 900000).toString()
    const expires_at = new Date(Date.now() + 5 * 60 * 1000) // 5 minutos

    const { error: supaError } = await supabase.from('otp_codes').insert([
      { telefone, codigo, expires_at }
    ])
    if (supaError) {
      return NextResponse.json({ ok: false, error: 'Erro ao salvar código no banco' })
    }

    const botResp = await fetch('http://localhost:3001/enviar-codigo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefone, codigo }),
    })

    if (!botResp.ok) {
      return NextResponse.json({ ok: false, error: 'Erro ao enviar código pelo bot' })
    }

    return NextResponse.json({ ok: true, message: 'Código enviado!' })

  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message || 'Erro desconhecido' })
  }
}
