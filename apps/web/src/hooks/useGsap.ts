'use client';
import { useEffect, useRef, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function useGsapFadeIn(ref: RefObject<HTMLElement | null>, options?: { delay?: number; y?: number }) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    gsap.fromTo(el, { opacity: 0, y: options?.y ?? 30 }, {
      opacity: 1, y: 0, duration: 0.6, delay: options?.delay ?? 0,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' },
    });
    return () => { ScrollTrigger.getAll().forEach((t) => t.kill()); };
  }, [ref, options?.delay, options?.y]);
}

export function useGsapCounter(ref: RefObject<HTMLElement | null>, target: number, suffix?: string) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    gsap.fromTo(el, { textContent: 0 }, {
      textContent: target, duration: 2, ease: 'power2.out',
      snap: { textContent: 1 },
      scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none none' },
      onUpdate: () => { el.textContent = `${Math.round(Number(el.textContent))}${suffix ?? ''}`; },
    });
    return () => { ScrollTrigger.getAll().forEach((t) => t.kill()); };
  }, [ref, target, suffix]);
}

export function useGsapStagger(ref: RefObject<HTMLElement | null>, childSelector: string) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    gsap.fromTo(el.querySelectorAll(childSelector), { opacity: 0, y: 20 }, {
      opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' },
    });
    return () => { ScrollTrigger.getAll().forEach((t) => t.kill()); };
  }, [ref, childSelector]);
}

export function useGsapHover(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleEnter = () => gsap.to(el, { scale: 1.03, duration: 0.2, ease: 'power2.out' });
    const handleLeave = () => gsap.to(el, { scale: 1, duration: 0.2, ease: 'power2.out' });
    el.addEventListener('mouseenter', handleEnter);
    el.addEventListener('mouseleave', handleLeave);
    return () => { el.removeEventListener('mouseenter', handleEnter); el.removeEventListener('mouseleave', handleLeave); };
  }, [ref]);
}
