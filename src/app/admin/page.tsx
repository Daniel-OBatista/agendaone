'use client'

import { useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'

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
    <main className="min-h-screen bg-pink-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white p-6 rounded shadow text-center">
        <h1 className="text-2xl font-bold text-pink-700 mb-6">Painel do Administrador</h1>

        <div className="flex flex-col gap-4">
          <button
            onClick={() => router.push('/admin/servicos')}
            className="bg-pink-500 text-white py-3 rounded hover:bg-pink-600"
          >
            Gerenciar Serviços
          </button>

          <button
            onClick={() => router.push('/admin/operador')}
            className="bg-white border border-pink-500 text-pink-600 py-3 rounded hover:bg-pink-100"
          >
            Gerenciar Operadores
          </button>

          <button
            onClick={() => router.push('/admin/agendamentos')}
            className="bg-white border border-pink-500 text-pink-600 py-3 rounded hover:bg-pink-100"
          >
            Meus atendimentos
          </button>
          <button
            onClick={() => router.push('/admin/cliente')}
            className="bg-white border border-pink-500 text-pink-600 py-3 rounded hover:bg-pink-100"
          >
            Meus Clientes
          </button>

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
      </div>
    </main>
  )
}
