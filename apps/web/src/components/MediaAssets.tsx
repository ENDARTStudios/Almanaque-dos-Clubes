import Image from 'next/image';

/**
 * T502 / W1+W2+W3 — elementos visuais do acervo: ESCUDO (clube/seleção) e
 * FOTO (jogador). Honestidade: sem mídia no acervo → placeholder com a sigla
 * (nunca uma imagem inventada).
 */

const SIGLA_BG = 'bg-primary/10 text-primary';

export function ClubCrest({
  logoUrl,
  name,
  size = 80,
}: {
  logoUrl?: string | null;
  name: string;
  size?: number;
}) {
  if (logoUrl) {
    return (
      <span
        data-testid="club-crest"
        className="shrink-0 rounded-2xl bg-white border border-border/50 flex items-center justify-center overflow-hidden"
        style={{ width: size, height: size }}
      >
        <Image
          src={logoUrl}
          alt=""
          width={size - 12}
          height={size - 12}
          className="object-contain"
          unoptimized
        />
      </span>
    );
  }
  return (
    <span
      data-testid="club-crest-fallback"
      className={`shrink-0 rounded-2xl ${SIGLA_BG} flex items-center justify-center font-heading font-bold`}
      style={{ width: size, height: size, fontSize: size / 2.6 }}
      aria-hidden="true"
    >
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

export function PlayerPhoto({
  photoUrl,
  name,
  size = 96,
}: {
  photoUrl?: string | null;
  name: string;
  size?: number;
}) {
  if (photoUrl) {
    return (
      <span
        data-testid="player-photo"
        className="shrink-0 rounded-2xl bg-white border border-border/50 flex items-center justify-center overflow-hidden"
        style={{ width: size, height: size }}
      >
        <Image src={photoUrl} alt="" width={size} height={size} className="object-cover" unoptimized />
      </span>
    );
  }
  return (
    <span
      data-testid="player-photo-fallback"
      className={`shrink-0 rounded-2xl ${SIGLA_BG} flex items-center justify-center font-heading font-bold`}
      style={{ width: size, height: size, fontSize: size / 3 }}
      aria-hidden="true"
    >
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

/** Bandeira do país (flagcdn, domínio público) com sigla honesta de fallback. */
export function CountryFlag({ iso2, name }: { iso2?: string | null; name?: string | null }) {
  if (!iso2 || !/^[A-Za-z]{2}$/.test(iso2)) {
    return <span className="text-xs text-foreground/50">{name ?? '—'}</span>;
  }
  const cc = iso2.toLowerCase();
  return (
    <span className="inline-flex items-center gap-1.5" data-testid="country-flag">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://flagcdn.com/20x15/${cc}.png`}
        srcSet={`https://flagcdn.com/40x30/${cc}.png 2x`}
        width={20}
        height={15}
        alt=""
        className="rounded-sm border border-border/40"
        loading="lazy"
      />
      <span className="text-xs text-foreground/70">{name ?? iso2.toUpperCase()}</span>
    </span>
  );
}
