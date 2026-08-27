/**
 * Probe de boot (T385): importa a configuração de ambiente em modo produção.
 *
 * Executado como processo filho com NODE_ENV=production + RATE_LIMIT_DISABLED=true.
 * Resultado esperado: o processo falha (exit != 0) com erro claro da guarda
 * `assertRateLimitGuard`. Se este arquivo chegar ao final sem lançar, o probe
 * imprime BOOT_OK e sai com 0 — o teste correspondente falha.
 */
import '../../src/config/env.js';

console.log('BOOT_OK');
