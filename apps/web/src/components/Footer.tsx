import Link from 'next/link';

const footerSections = [
  { title: 'Plataforma', links: [{ href: '/clubs', label: 'Clubes' }, { href: '/players', label: 'Jogadores' }, { href: '/rankings', label: 'Rankings' }, { href: '/search', label: 'Busca Avançada' }] },
  { title: 'Sobre', links: [{ href: '#', label: 'Sobre nós' }, { href: '#', label: 'Planos' }, { href: '#', label: 'API' }, { href: '#', label: 'Blog' }] },
  { title: 'Legal', links: [{ href: '#', label: 'Privacidade' }, { href: '#', label: 'Termos' }, { href: '#', label: 'Segurança' }] },
];

export default function Footer() {
  return (
    <footer className="bg-foreground text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <span className="text-2xl font-heading font-bold text-primary">ALMANAQUE</span>
            <p className="mt-2 text-sm text-white/60 max-w-xs">
              A história completa do futebol mundial ao seu alcance. Clubes, jogadores, competições e rankings auditáveis.
            </p>
          </div>
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-white/80 mb-3">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-white/50 hover:text-white transition-colors duration-200 cursor-pointer">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 pt-8 border-t border-white/10 text-center text-sm text-white/40">
          © {new Date().getFullYear()} Almanaque dos Clubes. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
