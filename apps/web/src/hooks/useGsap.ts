'use client';
import { useEffect, useRef, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * WS-C-12 — rede de segurança das animações de entrada.
 *
 * `gsap.fromTo(..., { opacity: 0 })` deixa o conteúdo escondido até o ScrollTrigger
 * disparar. Isso quebra em três situações reais: captura de tela em página inteira
 * (o Playwright não rola o viewport → a seção nunca "entra"), `prefers-reduced-motion`
 * ligado e qualquer ambiente sem o ciclo de rolagem. O conteúdo é a fonte da verdade:
 * passado `REVEAL_TIMEOUT_MS`, todo alvo que ainda estiver com opacidade ~0 é revelado.
 */
const REVEAL_TIMEOUT_MS = 2000;

/**
 * WS-C-12 / motion-craft — a regra de `prefers-reduced-motion` do `globals.css` zera
 * `animation-duration` e `transition-duration`, e isso **não alcança GSAP**: ele escreve
 * `opacity`/`transform` inline, então o movimento continuaria acontecendo (e o conteúdo
 * continuaria escondido por 2 s). Movimento reduzido é menos e mais gentil, não zero:
 * a animação pula direto para o estado final — o conteúdo aparece, o deslocamento sai.
 */
const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Estado final das animações de entrada, aplicado sem transição. */
function settle(targets: gsap.TweenTarget, extra?: gsap.TweenVars): void {
  gsap.set(targets, { opacity: 1, y: 0, clearProps: 'transform', ...extra });
}

function revealStuck(root: Element | null, selector: string): void {
  const targets: Element[] = selector
    ? Array.from(root?.querySelectorAll(selector) ?? [])
    : root
      ? [root]
      : [];
  const stuck = targets.filter((el) => Number(getComputedStyle(el).opacity) < 0.05);
  if (stuck.length === 0) return;
  if (prefersReducedMotion()) {
    settle(stuck);
    return;
  }
  gsap.to(stuck, { opacity: 1, y: 0, duration: 0.3, overwrite: 'auto' });
}

function useRevealFallback(
  ref: RefObject<HTMLElement | null>,
  selector: string,
  depsKey: string,
): void {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    // Trade-off consciente (registrado, não acidental): este é um timer, não estado do
    // ScrollTrigger, então ele também dispara para alvo ABAIXO da dobra — nesse caso o alvo
    // chega ao scroll já visível e o stagger não roda. A escolha é de propósito: sem rede de
    // segurança o conteúdo fica INVISÍVEL em captura de página inteira, em aba de fundo e em
    // qualquer ambiente sem ciclo de rolagem (foi um defeito real do T532). Conteúdo é a
    // fonte da verdade; animação é enfeite. Um gate por viewport reintroduziria o risco.
    const id = window.setTimeout(() => revealStuck(root, selector), REVEAL_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [ref, selector, depsKey]);
}

export function useGsapFadeIn(
  ref: RefObject<HTMLElement | null>,
  options?: { delay?: number; y?: number },
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      settle(el);
      return;
    }
    const tween = gsap.fromTo(el, { opacity: 0, y: options?.y ?? 30 }, {
      opacity: 1, y: 0, duration: 0.6, delay: options?.delay ?? 0,
      ease: 'power4.out',
      scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' },
    });
    // Mate APENAS o que este efeito criou. O código anterior fazia
    // `ScrollTrigger.getAll().forEach((t) => t.kill())`, que destrói TODOS os ScrollTriggers da
    // página: quando qualquer componente desmontava, a animação de QUALQUER outro elemento
    // (o navbar, por exemplo) era morta no meio do tween e ficava congelada no estado parcial
    // — medido no navbar de /clubs: `opacity: 0.1339` + `translate3d(0, 26px, 0)`
    // permanentes, deixando a barra translúcida sobre o corpo branco. Defeito de escopo de
    // limpeza, não de animação.
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [ref, options?.delay, options?.y]);

  useRevealFallback(ref, '', JSON.stringify([options?.delay, options?.y]));
}

export function useGsapCounter(ref: RefObject<HTMLElement | null>, target: number, suffix?: string) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      el.textContent = `${target}${suffix ?? ''}`;
      return;
    }
    const tween = gsap.fromTo(el, { textContent: 0 }, {
      textContent: target, duration: 2, ease: 'power4.out',
      snap: { textContent: 1 },
      scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none none' },
      onUpdate: () => { el.textContent = `${Math.round(Number(el.textContent))}${suffix ?? ''}`; },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [ref, target, suffix]);
}

export function useGsapStagger(ref: RefObject<HTMLElement | null>, childSelector: string) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      settle(el.querySelectorAll(childSelector));
      return;
    }
    const tween = gsap.fromTo(el.querySelectorAll(childSelector), { opacity: 0, y: 20 }, {
      opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power4.out',
      scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [ref, childSelector]);

  useRevealFallback(ref, childSelector, childSelector);
}

export function useGsapHover(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Hover que move é gated: em toque o hover dispara falso, e movimento reduzido
    // pede que o elemento não se desloque. O par `(hover: hover) and (pointer: fine)`
    // é o gate que a régua exige — `(hover: hover)` sozinho deixa passar ponteiro híbrido.
    if (
      prefersReducedMotion() ||
      !window.matchMedia('(hover: hover) and (pointer: fine)').matches
    ) {
      return;
    }
    const handleEnter = () => gsap.to(el, { scale: 1.03, duration: 0.2, ease: 'power4.out' });
    const handleLeave = () => gsap.to(el, { scale: 1, duration: 0.2, ease: 'power4.out' });
    el.addEventListener('mouseenter', handleEnter);
    el.addEventListener('mouseleave', handleLeave);
    return () => { el.removeEventListener('mouseenter', handleEnter); el.removeEventListener('mouseleave', handleLeave); };
  }, [ref]);
}
