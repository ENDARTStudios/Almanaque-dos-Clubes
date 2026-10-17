'use client';
import Link from 'next/link';
import { useI18n } from '@/i18n/Provider';
import { type Locale } from '@/i18n/config';
import LocaleFlag from '@/components/LocaleFlag';
import { Mail, Send } from 'lucide-react';
import { openCookieConsent } from '@/components/CookieConsentBanner';

export default function Footer() {
  const { t, locale, setLocale } = useI18n();

  const platformLinks = [
    { href: '/clubs', label: t('footer.platformClubs') },
    { href: '/players', label: t('footer.platformPlayers') },
    { href: '/competitions', label: t('footer.platformCompetitions') },
    { href: '/rankings', label: t('footer.platformRankings') },
    // T545 — o Navbar está bloqueado pela sessão paralela; o link entra aqui para a
    // seção não ficar órfã (o encaixe no Navbar entra quando ela mergear).
    { href: '/matches', label: t('footer.platformMatches') },
    { href: '/search', label: t('footer.platformSearch') },
  ];

  const aboutLinks = [
    { href: '/sobre', label: t('footer.aboutUs') },
    { href: '/planos', label: t('footer.plans') },
    { href: '/metodologia', label: t('footer.methodology') },
  ];

  const legalLinks = [
    { href: '/privacidade', label: t('footer.privacy') },
    { href: '/termos', label: t('footer.terms') },
    { href: '/cookies', label: t('footer.cookies') },
    { href: '/seguranca', label: t('footer.security') },
    { href: '/direitos-titular', label: t('footer.dataSubjectRights') },
    { href: '/direitos-autorais', label: t('footer.copyrightClaims') },
  ];

  return (
    <footer className="bg-muted text-foreground mt-auto border-t border-border">
      {/* T560 — o rodapé pulava o nível 2 do título.
          As três colunas titulam com `<h3>` ("Plataforma", "Sobre", "Legal"), e o rodapé não
          tinha nível 2 nenhum: numa página cujo conteúdo termina em `<h1>`, a árvore ia de H1
          para H3 direto. Isso aparecia em TODA página do site, porque o rodapé é global — e o
          detector de hierarquia acusa "skipped-heading" por isso.
          O `<h2>` do rodapé é o que faltava para os `<h3>` das colunas serem legítimos. É
          `sr-only` porque o rodapé não precisa de um título visível: a correção é semântica, não
          visual. */}
      <h2 className="sr-only">{t('footer.landmark')}</h2>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <span className="text-2xl font-heading font-bold text-foreground">ALMANAQUE</span>
            <p className="mt-2 text-sm text-foreground/80 max-w-xs">{t('footer.tagline')}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              {t('footer.platformTitle')}
            </h3>
            <ul className="space-y-2">
              {platformLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="inline-block min-h-[24px] py-1 text-sm text-foreground/80 hover:text-foreground transition-colors duration-200 cursor-pointer"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">{t('footer.aboutTitle')}</h3>
            <ul className="space-y-2">
              {aboutLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="inline-block min-h-[24px] py-1 text-sm text-foreground/80 hover:text-foreground transition-colors duration-200 cursor-pointer"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href="mailto:endart.studios+contato@gmail.com"
                  className="inline-flex min-h-[24px] items-center gap-1.5 py-1 text-sm text-foreground/80 hover:text-foreground transition-colors duration-200"
                >
                  <Mail className="w-3.5 h-3.5" /> {t('footer.contact')}
                </a>
              </li>
              <li>
                <a
                  href="https://t.me/AlmanaqueDosClubes"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[24px] items-center gap-1.5 py-1 text-sm text-foreground/80 hover:text-foreground transition-colors duration-200"
                >
                  <Send className="w-3.5 h-3.5" /> {t('footer.telegram')}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">{t('footer.legalTitle')}</h3>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="inline-block min-h-[24px] py-1 text-sm text-foreground/80 hover:text-foreground transition-colors duration-200 cursor-pointer"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <button
              onClick={openCookieConsent}
              className="inline-block min-h-[24px] py-1 mt-4 text-xs text-foreground/75 underline hover:text-foreground transition-colors duration-200 cursor-pointer"
            >
              {t('common.cookieBanner.footerManage')}
            </button>
            <div className="mt-6 flex items-center gap-2">
              {(['pt-br', 'en-us', 'es-es'] as Locale[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLocale(l)}
                  aria-label={l}
                  /* T579c — a CAIXA acompanha o formato real da bandeira. Antes era `w-6`
                     (24 px) e a bandeira de razão 1,9 (EUA) não cabia: o preflight
                     (`img { max-width: 100% }`) espremia a largura e o `object-contain`
                     letterboxava para **12,63 px** de altura, abaixo do piso de 16 px.
                     `min-w-6` mantém o alvo de toque (WCAG 2.2 · 2.5.8) e `px-1` deixa a
                     largura crescer até a bandeira — medido no navegador: caixa de
                     30,84–38,39 × 24 px (por bandeira), bandeira com 16 px de altura. */
                  className={`inline-flex h-6 min-w-6 items-center justify-center px-1 leading-none cursor-pointer ${locale === l ? 'opacity-100' : 'opacity-40 hover:opacity-70'} transition-opacity duration-150`}
                  title={l}
                >
                  <LocaleFlag locale={l} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-foreground/75">
          <span>{t('footer.copyright')}</span>
          <span className="text-center sm:text-right">
            END ART Studios · CNPJ 45.370.930/0001-75 · Osasco, SP — Brasil
          </span>
        </div>
      </div>
    </footer>
  );
}
