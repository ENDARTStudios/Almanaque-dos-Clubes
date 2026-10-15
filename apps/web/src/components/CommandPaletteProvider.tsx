'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import CommandPalette from './CommandPalette';

/**
 * PROVEDOR DA PALETA DE COMANDO — monta a paleta uma vez e expõe como abri-la.
 *
 * Por que um contexto, e não um botão que renderiza o overlay: o atalho `⌘K`/`Ctrl+K` precisa
 * funcionar em QUALQUER rota, e a barra de navegação precisa do mesmo gatilho que o atalho. Duas
 * instâncias do overlay dariam duas buscas concorrentes e dois `aria-modal` na árvore.
 *
 * O atalho é registrado no `window` e ignora:
 *   - a tecla sem modificador (senão `k` digitado num campo abriria a paleta);
 *   - `Ctrl+K` no Windows/Linux e `⌘K` no Mac, aceitando os dois (`metaKey` OU `ctrlKey`), porque
 *     distinguir por plataforma erra em teclado externo e não há ganho em ser estrito;
 *   - quando a paleta já está aberta, para não reiniciar a busca por cima do que a pessoa digitou.
 *
 * `⌘K` também é o atalho do navegador para a barra de busca do Firefox, então o
 * `preventDefault` é obrigatório — sem ele o navegador rouba o foco e a paleta abre vazia.
 */

interface PaletteCtx {
  open: () => void;
  isOpen: boolean;
}

const Ctx = createContext<PaletteCtx | null>(null);

/** Hook de acesso. Fora do provedor devolve um no-op em vez de estourar: um `useContext` que
 *  lança obriga todo consumidor a viver dentro do provedor, e a navbar tem teste unitário. */
export function useCommandPalette(): PaletteCtx {
  return useContext(Ctx) ?? { open: () => {}, isOpen: false };
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);

  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ open, isOpen }), [open, isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <Ctx.Provider value={value}>
      {children}
      <CommandPalette open={isOpen} onClose={close} />
    </Ctx.Provider>
  );
}
