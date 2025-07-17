import { NextResponse } from 'next/server'
import { supabase } from '../../lib/supabaseClient'

export async function POST(req) {
  const { email, codigo } = await req.json()
  if (!email || !codigo) return NextResponse.json({ ok: false, error: 'Dados obrigatórios' })

  const { data, error } = await supabase
    .from('otp_codes')
    .select('*')
    .eq('email', email)
    .eq('codigo', codigo)
    .eq('usado', false)
    .gte('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: false })
    .limit(1)

  if (error || !data || !data.length) {
    return NextResponse.json({ ok: false, error: 'Código inválido ou expirado' })
  }

  return NextResponse.json({ ok: true })
}
