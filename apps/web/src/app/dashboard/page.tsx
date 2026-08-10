import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Meu Painel',
  description: 'Área do usuário no Almanaque dos Clubes',
};

export default function DashboardPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground mb-2">Meu Painel</h1>
      <p className="text-foreground/60 mb-8">Gerencie sua conta e assinatura.</p>
      <div className="grid sm:grid-cols-3 gap-6">
        <Link href="/dashboard/subscription" className="bg-background rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-200 border border-border/50 cursor-pointer">
          <h2 className="text-lg font-heading font-semibold text-foreground">Assinatura</h2>
          <p className="text-sm text-foreground/60 mt-1">Verifique seu plano e histórico de cobranças.</p>
        </Link>
        <Link href="/dashboard/history" className="bg-background rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-200 border border-border/50 cursor-pointer">
          <h2 className="text-lg font-heading font-semibold text-foreground">Histórico</h2>
          <p className="text-sm text-foreground/60 mt-1">Acompanhe suas pesquisas e atividade recente.</p>
        </Link>
        <div className="bg-background rounded-xl p-6 shadow-md border border-border/50">
          <h2 className="text-lg font-heading font-semibold text-foreground">Perfil</h2>
          <p className="text-sm text-foreground/60 mt-1">Edite suas informações pessoais.</p>
        </div>
      </div>
    </div>
  );
}
