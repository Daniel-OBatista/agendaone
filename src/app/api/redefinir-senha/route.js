import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase Admin (para alterar senha)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Supabase público (consultas)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Função para padronizar o telefone
function formatarTelefone(telefone) {
  const apenasNumeros = telefone.replace(/\D/g, '')
  return apenasNumeros.startsWith('55') ? `+${apenasNumeros}` : `+55${apenasNumeros}`
}

export async function POST(req) {
  const { telefone, codigo, senha } = await req.json()

  if (!telefone || !codigo || !senha) {
    return NextResponse.json({ ok: false, error: 'Dados obrigatórios' })
  }

  const telefoneFormatado = formatarTelefone(telefone)

  // 1. Verifica o código OTP
  const { data: otpData, error: otpError } = await supabase
    .from('otp_codes')
    .select('*')
    .eq('telefone', telefoneFormatado)
    .eq('codigo', codigo)
    .eq('usado', false)
    .gte('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: false })
    .limit(1)

  if (otpError || !otpData?.length) {
    return NextResponse.json({ ok: false, error: 'Código inválido ou expirado' })
  }

  // 2. Busca o ID do usuário pelo telefone na tabela personalizada
  const { data: usuario, error: erroBusca } = await supabase
    .from('users')
    .select('id')
    .eq('telefone', telefoneFormatado)
    .single()

  if (erroBusca || !usuario?.id) {
    return NextResponse.json({ ok: false, error: 'Usuário não encontrado pelo telefone' })
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
