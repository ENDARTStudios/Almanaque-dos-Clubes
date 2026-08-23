import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/services/queue.js', () => ({
  addJob: vi.fn().mockResolvedValue({ id: 'job-1' }),
}));

import { addJob } from '../../../src/services/queue.js';
import {
  mailerService,
  MockMailTransport,
  QueueMailTransport,
} from '../../../src/modules/mailer/mailer.service.js';
import { escapeHtml } from '../../../src/modules/mailer/mail-template.service.js';

describe('MailerService com MockMailTransport', () => {
  let transport: MockMailTransport;

  beforeEach(() => {
    transport = new MockMailTransport();
    mailerService.setTransport(transport);
    vi.mocked(addJob).mockClear();
  });

  it('envia email de verificação pelo transporte mock, sem envio real', async () => {
    await mailerService.sendVerificationEmail('ana@example.com', 'Ana', 'tok-123');
    expect(transport.sent).toHaveLength(1);
    expect(transport.sent[0].to).toBe('ana@example.com');
    expect(transport.sent[0].html).toContain('tok-123');
    expect(vi.mocked(addJob)).not.toHaveBeenCalled();
  });

  it('não registra token nem corpo completo em logs', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await mailerService.sendVerificationEmail('ana@example.com', 'Ana', 'super-secret-token');
    const logged = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(logged).not.toContain('super-secret-token');
    expect(logged).not.toContain('<!DOCTYPE');
    expect(transport.sent).toHaveLength(1);
  });

  it('escapa HTML no nome do destinatário', async () => {
    await mailerService.sendVerificationEmail(
      'ana@example.com',
      '<script>alert(1)</script>',
      'tok',
    );
    const html = transport.sent[0].html;
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('rejeita email inválido antes de qualquer envio', async () => {
    await expect(
      mailerService.sendVerificationEmail('email-invalido', 'Ana', 'tok'),
    ).rejects.toThrow();
    expect(transport.sent).toHaveLength(0);
  });
});

describe('MailerService com QueueMailTransport', () => {
  beforeEach(() => {
    vi.mocked(addJob).mockClear();
  });

  it('enfileira job de reset com tipo e payload (token apenas transitório)', async () => {
    mailerService.setTransport(new QueueMailTransport());
    await mailerService.sendPasswordResetEmail('ana@example.com', 'Ana', 'tok-reset');
    expect(addJob).toHaveBeenCalledWith('email', 'password-reset', {
      type: 'password-reset',
      email: 'ana@example.com',
      name: 'Ana',
      token: 'tok-reset',
    });
  });
});

describe('escapeHtml', () => {
  it('escapa caracteres críticos de HTML', () => {
    expect(escapeHtml(`<a href="x" onmouseover='y'>&`)).toBe(
      '&lt;a href=&quot;x&quot; onmouseover=&#39;y&#39;&gt;&amp;',
    );
  });
});
