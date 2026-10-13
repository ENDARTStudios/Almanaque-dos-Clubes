'use client';

/**
 * T523-kits — diagrama de uniforme composto por PEÇAS (como o template
 * {{CamisaFutebol}} da Wikipédia): linha de mangas+corpo, calção e meião. Cada
 * célula tem cor de fundo e, quando a fonte tem o arquivo verificado, o padrão
 * por cima. Alternativa: `image` = foto/render único (curado).
 */
export interface KitPartView {
  pattern: string | null;
  color: string | null;
  file: string | null;
  fileUrl: string | null;
  license: string | null;
}

export interface KitEntryView {
  season: string | null;
  type: string;
  label: string;
  parts?: {
    leftarm: KitPartView;
    body: KitPartView;
    rightarm: KitPartView;
    shorts: KitPartView;
    socks: KitPartView;
  };
  image?: { url: string; sourceUrl: string; license: string };
  sourceUrl: string;
}

function Part({
  part,
  width,
  height,
  border,
}: {
  part: KitPartView;
  width: string;
  height: string;
  border?: string;
}) {
  const style: React.CSSProperties = {
    width,
    height,
    backgroundColor: part.color ? `#${part.color}` : 'transparent',
    backgroundImage: part.fileUrl ? `url(${part.fileUrl})` : undefined,
    backgroundSize: '100% 100%',
    ...(border ? { border: `1px solid #${border}` } : {}),
  };
  return <div style={style} aria-hidden="true" />;
}

export default function KitDiagram({ kit }: { kit: KitEntryView }) {
  if (kit.image) {
    return (
      <figure className="inline-block text-center" data-testid="kit-figure">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={kit.image.url} alt={kit.label} className="h-40 w-auto rounded object-contain" />
        <figcaption className="mt-1 text-xs text-foreground/70">
          <a
            href={kit.image.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            {kit.image.license}
          </a>
        </figcaption>
      </figure>
    );
  }
  const p = kit.parts;
  if (!p) return null;
  const arm = p.leftarm.color ?? p.rightarm.color ?? p.body.color;
  return (
    <figure className="inline-block text-center" data-testid="kit-figure">
      <div className="mx-auto w-[84px]">
        <div className="flex">
          <Part part={p.leftarm} width="28px" height="52px" border={arm ?? undefined} />
          <Part part={p.body} width="28px" height="52px" border={p.body.color ?? undefined} />
          <Part part={p.rightarm} width="28px" height="52px" border={arm ?? undefined} />
        </div>
        <div className="flex justify-center">
          <Part part={p.shorts} width="42px" height="30px" border={p.shorts.color ?? undefined} />
        </div>
        <div className="flex justify-center">
          <Part part={p.socks} width="26px" height="26px" border={p.socks.color ?? undefined} />
        </div>
      </div>
      <figcaption className="mt-1 text-xs text-foreground/70">
        <a
          href={kit.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          {kit.season ?? '—'}
        </a>
      </figcaption>
    </figure>
  );
}
