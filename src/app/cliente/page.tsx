'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'
import { User, LogOut, CalendarPlus, ListChecks } from 'lucide-react'

export default function ClientePage() {
  const router = useRouter()
  const [nome, setNome] = useState('')

  useEffect(() => {
    async function verificarCliente() {
      const { data: userData } = await supabase.auth.getUser()
      const { data: perfil } = await supabase
        .from('users')
        .select('role, nome')
        .eq('id', userData.user?.id)
        .single()

      if (perfil?.role !== 'cliente') {
        router.push('/')
      } else {
        setNome(perfil?.nome || '')
      }
    }
    verificarCliente()
  }, [router])

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white/70 backdrop-blur-lg border border-white/40 ring-2 ring-pink-200 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6 animate-fade-in">
        <div className="flex flex-col items-center gap-2 w-full">
          <User className="text-pink-600" size={38} />
          <h1 className="text-3xl font-bold text-pink-700 tracking-wide drop-shadow-sm">
            Área do Cliente
          </h1>
          {nome && (
            <span className="bg-pink-100 text-pink-700 font-semibold px-4 py-1 rounded-full mt-1 text-sm shadow-sm border border-pink-300 animate-bounce-short">
              Olá, {nome}!
            </span>
          )}
        </div>

        <div className="flex flex-col gap-4 w-full mt-3">
          <button
            onClick={() => router.push('/cliente/agendar')}
            className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-pink-500 to-fuchsia-600 hover:from-pink-600 hover:to-fuchsia-700 py-3 rounded-full text-white font-bold text-lg shadow-lg ring-2 ring-pink-300 transition-transform hover:scale-105 active:scale-98"
          >
            <CalendarPlus size={22} />
            Agendar Novo Serviço
          </button>

          <button
            onClick={() => router.push('/cliente/agendamentos')}
            className="flex items-center justify-center gap-2 w-full bg-white/90 border-2 border-pink-400 text-pink-700 py-3 rounded-full font-semibold text-lg shadow hover:bg-pink-50 hover:scale-105 transition-all ring-2 ring-pink-100"
          >
            <ListChecks size={22} />
            Ver Meus Agendamentos
          </button>
        </div>

        <button
          onClick={async () => {
            await supabase.auth.signOut()
            router.push('/login')
          }}
          className="flex items-center justify-center gap-2 mt-6 w-full bg-gray-100 text-gray-600 hover:bg-gray-300 py-2.5 rounded-full font-medium shadow ring-1 ring-gray-200 transition-all hover:scale-105"
        >
          <LogOut size={20} />
          Sair
        </button>
      </div>

      {/* Estilo fade-in animação */}
      <style jsx global>{`
        .animate-fade-in {
          animation: fadeIn 0.8s cubic-bezier(.48,1.62,.44,.91) both;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(30px);}
          to { opacity: 1; transform: translateY(0);}
        }
        .animate-bounce-short {
          animation: bounceShort 1.4s;
        }
        @keyframes bounceShort {
          0%, 100% { transform: translateY(0);}
          20% { transform: translateY(-6px);}
          40% { transform: translateY(-2px);}
          60% { transform: translateY(-3px);}
          80% { transform: translateY(-1px);}
        }
      `}</style>
    </main>
  )
}
