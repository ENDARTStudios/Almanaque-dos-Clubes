import Image from 'next/image';
import {
  ClubCrestGenericDark,
  PlayerPositionIcon,
  PLAYER_POSITION_ICON,
  type PlayerPositionKey,
} from '@/components/icons';

/**
 * T502 / W1+W2+W3 — elementos visuais do acervo: ESCUDO (clube/seleção) e
 * FOTO (jogador). Honestidade: sem mídia no acervo → placeholder com a sigla
 * (nunca uma imagem inventada).
 *
 * T576 — sem mídia, o placeholder passa a mostrar também o ícone AUTORAL da
 * categoria (escudo genérico / figura genérica da posição), arte original do
 * projeto (ver `components/icons` e `docs/ICONES-AUTORAIS.md`). O ícone é
 * decorativo (`aria-hidden`); quem declara a lacuna em texto é o RÓTULO DE
 * ILUSTRAÇÃO da página (`i18n/wsIcons.ts`), ao lado do nome — o ícone nunca se
 * apresenta como escudo, foto ou troféu oficial.
 */

const SIGLA_BG = 'bg-primary/10 text-primary-ink';

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
        className="shrink-0 rounded-2xl bg-background border border-border/50 flex items-center justify-center overflow-hidden"
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
      className={`shrink-0 rounded-2xl ${SIGLA_BG} flex flex-col items-center justify-center gap-0.5`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <ClubCrestGenericDark size={Math.round(size * 0.42)} />
      <span className="font-heading font-bold leading-none" style={{ fontSize: size / 4.8 }}>
        {name.slice(0, 2).toUpperCase()}
      </span>
    </span>
  );
}

export function PlayerPhoto({
  photoUrl,
  name,
  position,
  size = 96,
}: {
  photoUrl?: string | null;
  name: string;
  /** Posição do domínio (`GOALKEEPER`…). Sem ela, o placeholder fica só com a sigla. */
  position?: string | null;
  size?: number;
}) {
  if (photoUrl) {
    return (
      <span
        data-testid="player-photo"
        className="shrink-0 rounded-2xl bg-background border border-border/50 flex items-center justify-center overflow-hidden"
        style={{ width: size, height: size }}
      >
        <Image src={photoUrl} alt="" width={size} height={size} className="object-cover" unoptimized />
      </span>
    );
  }
  const positionKey = position?.trim().toUpperCase();
  const hasPositionIcon = positionKey ? positionKey in PLAYER_POSITION_ICON : false;
  return (
    <span
      data-testid="player-photo-fallback"
      className={`shrink-0 rounded-2xl ${SIGLA_BG} flex flex-col items-center justify-center gap-0.5`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {hasPositionIcon && (
        <PlayerPositionIcon
          position={positionKey as PlayerPositionKey}
          size={Math.round(size * 0.46)}
        />
      )}
      <span
        className="font-heading font-bold leading-none"
        style={{ fontSize: hasPositionIcon ? size / 4.8 : size / 3 }}
      >
        {name.slice(0, 2).toUpperCase()}
      </span>
    </span>
  );
}

/** Bandeira do país (flagcdn, domínio público) com sigla honesta de fallback. */
export function CountryFlag({ iso2, name }: { iso2?: string | null; name?: string | null }) {
  if (!iso2 || !/^[A-Za-z]{2}$/.test(iso2)) {
    return <span className="text-xs text-foreground/70">{name ?? '—'}</span>;
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
