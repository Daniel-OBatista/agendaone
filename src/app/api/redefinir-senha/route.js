import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
) 

export async function POST(req) {
  const { telefone, codigo, senha } = await req.json()
  if (!telefone || !codigo || !senha) {
    return NextResponse.json({ ok: false, error: 'Dados obrigatórios' })
  }

  // 1. Valide o código OTP
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

  // 2. Marque como usado
  await supabase
    .from('otp_codes')
    .update({ usado: true })
    .eq('id', data[0].id)

  // 3. Encontre o usuário pelo telefone
  const { data: users, error: userErr } = await supabase
    .from('users')
    .select('id')
    .eq('telefone', telefone)
    .limit(1)

  if (userErr || !users || !users.length) {
    return NextResponse.json({ ok: false, error: 'Usuário não encontrado' })
  }

  const userId = users[0].id

  // 4. Atualize a senha pelo Admin API (preferencialmente updateUserById)
  const { data: updateData, error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    { password: senha }
  )

  if (updateErr) {
    return NextResponse.json({ ok: false, error: 'Erro ao atualizar senha: ' + updateErr.message })
  }

  return NextResponse.json({ ok: true, message: 'Senha redefinida com sucesso!' })
}
