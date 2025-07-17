import { NextResponse } from 'next/server'
import { supabase } from '../../lib/supabaseClient'

function formatarTelefone(telefone) {
  telefone = telefone.replace(/\D/g, '')
  telefone = telefone.startsWith('55') ? telefone : `55${telefone}`
  return `+${telefone}`
}

export async function POST(req) {
  const { telefone } = await req.json()

  if (!telefone) return NextResponse.json({ ok: false, error: 'Telefone obrigatório' })

  const telefoneCompleto = formatarTelefone(telefone)
  const codigoGerado = Math.floor(100000 + Math.random() * 900000).toString()

  // 1. Salva o código no Supabase
  const { error } = await supabase.from('otp_codes').insert([
    {
      telefone: telefoneCompleto,
      codigo: codigoGerado,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      usado: false,
    }
  ])

  if (error) {
    return NextResponse.json({ ok: false, error: error.message })
  }

  // 2. Envia via WhatsApp chamando seu BOT local (porta 3001)
  try {
    const numeroSemPrefixo = telefoneCompleto.replace('+', '') // ex: 5516992689921

    await fetch('http://localhost:3001/enviar-codigo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telefone: numeroSemPrefixo, // sem + no início
        codigo: codigoGerado,
      }),
    })

    return NextResponse.json({ ok: true, mensagem: 'Código enviado com sucesso!' })
  } catch (err) {
    console.error('Erro ao chamar o bot do WhatsApp:', err)
    return NextResponse.json({ ok: false, error: 'Erro ao enviar mensagem via WhatsApp' })
  }
}
