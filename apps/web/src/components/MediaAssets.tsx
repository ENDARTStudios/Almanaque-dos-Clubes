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
 * categoria (escudo genérico / objeto da posição: luva, caneleira, bola, chuteira),
 * arte original do projeto (ver `components/icons` e `docs/ICONES-AUTORAIS.md`). O
 * ícone é decorativo (`aria-hidden`); quem declara a lacuna em texto é o RÓTULO DE
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
      {/* T579 — a sigla só entra quando cabe. A `fontSize` é `size / 4.8` (24 px ⇒ 5 px), e
          numa lista de partidas o cartão tem 24-28 px: dois caracteres de 5 px não são
          rótulo, são mancha. Abaixo de 40 px vale só o ícone, que é o que se lê de fato. */}
      {size >= 40 ? (
        <span className="font-heading font-bold leading-none" style={{ fontSize: size / 4.8 }}>
          {name.slice(0, 2).toUpperCase()}
        </span>
      ) : null}
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
        <Image
          src={photoUrl}
          alt=""
          width={size}
          height={size}
          className="object-cover"
          unoptimized
        />
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

/* T579 (ITEM 19) — a `CountryFlag` que vivia aqui (PNG de `flagcdn.com`) foi REMOVIDA e
   substituída por `@/components/CountryFlag`. Motivo declarado: o asset era buscado de um CDN
   de terceiro, com a largura e a licença fora do nosso controle — e nenhuma tela a usava
   (componente morto, `tsc` não acusava porque era exportado). A nova é clicável, tem nome
   acessível com o país em texto e alvo de 24 px.
   T579b — a bandeira dessa `CountryFlag` deixou de ser emoji (que no Windows degrada para as
   duas letras regionais) e passou a ser SVG/PNG PRÓPRIO em `/flags/<iso2>.svg`, adquirido do
   Commons com licença auditada por arquivo (`apps/api/src/scripts/data/flags-provenance.json`). */
