import { NextResponse } from 'next/server'
import { supabase } from '../../lib/supabaseClient'

function formatarTelefone(telefone) {
  telefone = telefone.replace(/\D/g, '')
  telefone = telefone.startsWith('55') ? telefone : `55${telefone}`
  return `+${telefone}`
}

export async function POST(req) {
  const { telefone, codigo } = await req.json()
  if (!telefone || !codigo) return NextResponse.json({ ok: false, error: 'Dados obrigatórios' })

  // ✅ Padroniza o telefone
  const telefoneFormatado = formatarTelefone(telefone)

  const { data, error } = await supabase
    .from('otp_codes')
    .select('*')
    .eq('telefone', telefoneFormatado)
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
