import { NextResponse } from 'next/server'
import { supabase } from '../../lib/supabaseClient'

export async function POST(req) {
  const { telefone, codigo } = await req.json()
  if (!telefone || !codigo) return NextResponse.json({ ok: false, error: 'Dados obrigatórios' })

  // Apenas busca, não altera!
  const { data, error } = await supabase
    .from('otp_codes')
    .select('*')
    .eq('telefone', telefone)
    .eq('codigo', codigo)
    .eq('usado', false)
    .gte('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: false })
    .limit(1)

  if (error || !data || !data.length) {
    return NextResponse.json({ ok: false, error: 'Código inválido ou expirado' })
  }

  // Apenas retorna ok!
  return NextResponse.json({ ok: true })
}
