import { NextResponse } from 'next/server'
import { supabase } from '../../lib/supabaseClient'
import nodemailer from 'nodemailer'

// Configura seu provedor de e-mail em variáveis de ambiente
const transporter = nodemailer.createTransport({
  service: 'gmail', // ou outro serviço SMTP
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

export async function POST(req) {
  const { email } = await req.json()

  if (!email) return NextResponse.json({ ok: false, error: 'E-mail obrigatório' })

  const codigoGerado = Math.floor(100000 + Math.random() * 900000).toString()

  // 1. Salva o código no Supabase
  const { error } = await supabase.from('otp_codes').insert([
    {
      email,
      codigo: codigoGerado,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      usado: false,
    }
  ])

  if (error) {
    return NextResponse.json({ ok: false, error: error.message })
  }

  // 2. Envia o e-mail
    try {
      await transporter.sendMail({
        from: `"AgendaONE" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'AgendaOne - Código de verificação',
        text: `Olá!\n\nVocê solicitou um código de verificação para redefinição de senha no agendaONE.\n\nSeu código é: ${codigoGerado}\n\nSe você não solicitou, apenas ignore este e-mail.\n\nAtenciosamente,\nEquipe agendaONE`,
        html: `
          <div style="font-family: Arial, sans-serif; color:#333;">
            <h1 style="color:#d946ef; margin-bottom: 8px;">agendaONE</h1>
            <p>Você solicitou um código de verificação para acessar sua conta ou redefinir sua senha.</p>
            <p style="margin: 24px 0; font-size: 1.1rem;">
              <b>Seu código de verificação:</b>
            </p>
            <div style="font-size:2rem; font-weight:bold; background:#f9e8fd; padding:18px 32px; border-radius:16px; display:inline-block; letter-spacing:6px; color:#d946ef; margin-bottom:16px;">
              ${codigoGerado}
            </div>
            <p style="margin-top:24px;">Se você não fez essa solicitação, pode ignorar este e-mail.</p>
            <hr style="margin:32px 0;">
            <small style="color:#888;">Equipe agendaONE • Não responda este e-mail</small>
          </div>
        `,
      })
      return NextResponse.json({ ok: true, mensagem: 'Código enviado por e-mail!' })
    } catch (err) {
      console.error('Erro ao enviar e-mail:', err)
      return NextResponse.json({ ok: false, error: 'Erro ao enviar e-mail' })
    }

}
