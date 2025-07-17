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
  const { email, codigo, senha } = await req.json()
  if (!email || !codigo || !senha) {
    return NextResponse.json({ ok: false, error: 'Dados obrigatórios' })
  }

  // 1. Verifica o código OTP
  const { data: otpData, error: otpError } = await supabase
    .from('otp_codes')
    .select('*')
    .eq('email', email)
    .eq('codigo', codigo)
    .eq('usado', false)
    .gte('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: false })
    .limit(1)

  if (otpError || !otpData?.length) {
    return NextResponse.json({ ok: false, error: 'Código inválido ou expirado' })
  }

  // 2. Busca o ID do usuário pelo email na tabela personalizada
  const { data: usuario, error: erroBusca } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (erroBusca || !usuario?.id) {
    return NextResponse.json({ ok: false, error: 'Usuário não encontrado pelo e-mail' })
  }

  const idDoUsuario = usuario.id

  // 3. Atualiza a senha no Auth usando o ID
  const { error: erroAtualizacao } = await supabaseAdmin.auth.admin.updateUserById(idDoUsuario, {
    password: senha,
  })

  if (erroAtualizacao) {
    return NextResponse.json({ ok: false, error: 'Erro ao atualizar senha: ' + erroAtualizacao.message })
  }

  // 4. Marca o código como usado
  await supabase
    .from('otp_codes')
    .update({ usado: true })
    .eq('id', otpData[0].id)

  return NextResponse.json({ ok: true, message: 'Senha redefinida com sucesso!' })
}
