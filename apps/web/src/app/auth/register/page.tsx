'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/register', { email, password, name: name || undefined });
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar');
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 px-4">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md border border-border/50">
        <h1 className="text-3xl font-heading font-bold mb-2 text-center text-foreground">Criar Conta</h1>
        <p className="text-center text-foreground/60 mb-8 text-sm">Cadastre-se gratuitamente no Almanaque dos Clubes</p>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm border border-red-200">{error}</div>}
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-1.5">Nome</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full border border-border rounded-lg px-4 py-2.5 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-border rounded-lg px-4 py-2.5 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" required />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-1.5">Senha</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-border rounded-lg px-4 py-2.5 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" required minLength={8} />
        </div>
        <button type="submit" className="w-full bg-primary text-on-primary py-2.5 rounded-lg font-semibold hover:opacity-90 transition-all duration-200 cursor-pointer">
          Cadastrar
        </button>
        <p className="text-sm text-center mt-4 text-foreground/60">
          <a href="/auth/login" className="text-primary hover:underline cursor-pointer">Já tem conta? Faça login</a>
        </p>
      </form>
    </div>
  );
}
