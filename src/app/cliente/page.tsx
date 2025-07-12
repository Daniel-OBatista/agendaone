'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'

export default function ClientePage() {
  const router = useRouter()

  useEffect(() => {
    async function verificarCliente() {
      const { data: userData } = await supabase.auth.getUser()
      const { data: perfil } = await supabase
        .from('users')
        .select('role')
        .eq('id', userData.user?.id)
        .single()
  
      if (perfil?.role !== 'cliente') {
        router.push('/')
      }
    }
    verificarCliente()
  }, [router]) 

  return (
    <main className="p-8 max-w-md mx-auto text-center">
      <h1 className="text-2xl font-bold text-pink-700 mb-6">Área do Cliente</h1>

      <div className="flex flex-col gap-4">
        <button
          onClick={() => router.push('/cliente/agendar')}
          className="bg-pink-500 text-white py-3 rounded hover:bg-pink-600"
        >
          Agendar Novo Serviço
        </button>

        <button
          onClick={() => router.push('/cliente/agendamentos')}
          className="bg-white border border-pink-500 text-pink-600 py-3 rounded hover:bg-pink-100"
        >
          Ver Meus Agendamentos
        </button>

        {/* ✅ Botão de logout */}
        <button
          onClick={async () => {
            await supabase.auth.signOut()
            router.push('/login')
          }}
          className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400 mt-4"
        >
          Sair
        </button>
      </div>
    </main>
  )
}
