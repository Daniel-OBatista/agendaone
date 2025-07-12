'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Home, Search } from 'lucide-react'

type Usuario = {
  id: string
  nome: string
  email: string
  telefone?: string
  role: string
}

export default function ClientesAdminPage() {
  const router = useRouter()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [erro, setErro] = useState('')

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
        return
      }

      fetchUsuarios()
    }

    async function fetchUsuarios() {
      const { data, error } = await supabase
        .from('users')
        .select('id, nome, email, telefone, role')
        .neq('role', 'admin') // opcional: filtrar só clientes

      if (error) setErro(error.message)
      else setUsuarios(data as Usuario[])
    }

    verificarAdmin()
  }, [router])

  return (
    <main className="p-6 max-w-4xl mx-auto bg-pink-50 min-h-screen">
    <div className="mb-4">
        <button
          onClick={() => router.push('/admin')}
          className="flex items-center gap-2 text-white bg-pink-500 px-3 py-1.5 rounded-md hover:bg-pink-600 text-sm"
        >
          <Home size={18} />
          Início do Admin
        </button>
      </div>    
      <h1 className="text-2xl font-bold text-pink-700 mb-6">👥 Meus Clientes</h1>

      {erro && <p className="text-red-500 mb-4">{erro}</p>}

      <table className="w-full border-collapse bg-white shadow-sm rounded overflow-hidden">
        <thead className="bg-pink-100 text-pink-800">
          <tr>
            <th className="p-3 text-left">Nome</th>
            <th className="p-3 text-left">Email</th>
            <th className="p-3 text-left">Telefone</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((user) => (
            <tr key={user.id} className="border-t hover:bg-pink-50">
              <td className="p-3">{user.nome}</td>
              <td className="p-3">{user.email}</td>
              <td className="p-3">{user.telefone || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
