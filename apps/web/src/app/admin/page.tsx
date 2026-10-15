import type { Metadata } from 'next';
import Link from 'next/link';

/**
 * HUB DE ADMINISTRAÇÃO — T559.
 *
 * Por que esta página passou a existir: as duas ferramentas de admin (`/admin/observability` e
 * `/admin/reports`) estavam listadas DENTRO de `/dashboard`, a área do usuário. O efeito era o
 * usuário comum ver "Observabilidade — Crons, fila e alertas (admin)" e "Moderação — Denúncias
 * pendentes (admin)" como se fossem recursos dele, ao lado de "Favoritos". Além de confuso, é
 * vazamento de arquitetura: expõe a existência de superfícies internas a quem não tem acesso.
 *
 * Não há gate de papel AQUI de propósito: as duas páginas de destino já aplicam o seu próprio
 * controle de acesso, e um gate duplicado seria uma segunda fonte de verdade que pode divergir.
 * Esta página é só um índice — ela não concede nada.
 */

export const metadata: Metadata = {
  title: 'Administração',
  description: 'Ferramentas internas do Almanaque dos Clubes.',
  // Índice interno não deve aparecer em busca.
  robots: { index: false, follow: false },
};

const FERRAMENTAS = [
  {
    href: '/admin/observability',
    titulo: 'Observabilidade',
    descricao: 'Crons, fila de ingestão e alertas.',
  },
  {
    href: '/admin/reports',
    titulo: 'Moderação',
    descricao: 'Denúncias e contribuições pendentes de revisão.',
  },
];

export default function AdminPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground mb-2">
        Administração
      </h1>
      <p className="text-ink-2 mb-8">
        Ferramentas internas. O acesso a cada uma é controlado na própria página.
      </p>

      <ul className="grid gap-4 sm:grid-cols-2">
        {FERRAMENTAS.map((f) => (
          <li key={f.href}>
            <Link
              href={f.href}
              className="block h-full rounded-xl border border-border bg-surface p-5 transition-colors duration-200 hover:border-primary"
            >
              <span className="block font-heading text-lg font-bold text-foreground">
                {f.titulo}
              </span>
              <span className="mt-1 block text-sm text-ink-2">{f.descricao}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
