'use client'

import { useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import {
  Users,
  UserCog,
  CalendarDays,
  LayoutGrid,
  LogOut,
} from 'lucide-react'

export default function AdminPage() {
  const router = useRouter()

  useEffect(() => {
    async function verificarAdmin() {
      const { data: userData } = await supabase.auth.getUser()
      const { data: perfil } = await supabase
        .from('users')
        .select('role')
        .eq('id', userData.user?.id)
        .single()

      if (perfil?.role !== 'admin') {
        router.push('/')
      }
    }
    verificarAdmin()
  }, [router])

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 via-fuchsia-200 to-white relative overflow-hidden">
      {/* Efeito de brilho/fundo animado */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-pink-300 opacity-30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-fuchsia-300 opacity-25 rounded-full blur-2xl" />
      </div>

      <div className="w-full max-w-md relative z-10 bg-white/90 backdrop-blur-2xl border-2 border-pink-100 shadow-2xl rounded-3xl px-6 py-10 flex flex-col items-center animate-fade-in">
        <h1 className="text-xl sm:text-2xl font-extrabold text-pink-700 mb-2 tracking-tight relative inline-block">
          Painel do Administrador
          <span className="block h-1 w-1/2 mx-auto bg-gradient-to-r from-pink-400 to-fuchsia-500 rounded-full mt-2 animate-pulse" />
        </h1>
        <p className="text-zinc-600 mb-7 text-base">Bem-vindo! Gerencie todos os recursos do sistema.</p>

        <div className="flex flex-col gap-4 w-full">
          <button
            onClick={() => router.push('/admin/servicos')}
            className="flex items-center gap-3 justify-center text-lg bg-gradient-to-r from-pink-100 to-white border border-pink-300 text-pink-700 font-semibold py-3 rounded-2xl shadow hover:from-pink-800 hover:to-fuchsia-900 hover:text-white hover:scale-105 transition-all"
          >
            <LayoutGrid size={24} /> Gerenciar Serviços
          </button>

          <button
            onClick={() => router.push('/admin/operador')}
            className="flex items-center gap-3 justify-center text-lg bg-gradient-to-r from-pink-100 to-white border border-pink-300 text-pink-700 font-semibold py-3 rounded-2xl shadow hover:from-pink-800 hover:to-fuchsia-900 hover:text-white hover:scale-105 transition-all"
          >
            <UserCog size={24} /> Gerenciar Operadores
          </button>

          <button
            onClick={() => router.push('/admin/agendamentos')}
            className="flex items-center gap-3 justify-center text-lg bg-gradient-to-r from-pink-100 to-white border border-pink-300 text-pink-700 font-semibold py-3 rounded-2xl shadow hover:from-pink-800 hover:to-fuchsia-900 hover:text-white hover:scale-105 transition-all"
          >
            <CalendarDays size={24} /> Meus Atendimentos
          </button>

          <button
            onClick={() => router.push('/admin/cliente')}
            className="flex items-center gap-3 justify-center text-lg bg-gradient-to-r from-pink-100 to-white border border-pink-300 text-pink-700 font-semibold py-3 rounded-2xl shadow hover:from-pink-800 hover:to-fuchsia-900 hover:text-white hover:scale-105 transition-all"
          >
            <Users size={24} /> Meus Clientes
          </button>

          <button
            onClick={async () => {
              await supabase.auth.signOut()
              router.push('/login')
            }}
            className="flex items-center gap-2 justify-center text-base mt-6 bg-gradient-to-r from-red-400 to-red-600 text-white font-semibold py-2 rounded-full border border-red-500 shadow hover:from-red-700 hover:to-red-900 hover:text-white hover:scale-105 hover:shadow-xl transition-all"
          >
            <LogOut size={20} /> Sair
          </button>

        </div>
      </div>

      {/* Animação fade-in */}
      <style jsx global>{`
        .animate-fade-in {
          animation: fadeIn 1s cubic-bezier(.44,1.7,.38,.97) both;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(60px);}
          to { opacity: 1; transform: translateY(0);}
        }
      `}</style>
    </main>
  )
}
