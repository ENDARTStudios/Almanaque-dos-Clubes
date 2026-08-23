/**
 * Mailer transacional provider-agnostic (T342).
 *
 * Transportes:
 * - MockMailTransport: captura emails em memória (testes/CI) — nunca envia.
 * - QueueMailTransport: enfileira na fila BullMQ `email` (provider real é o
 *   worker Resend com dry-run quando não há API key).
 *
 * Segurança:
 * - Nenhum log de token, código ou corpo de email neste módulo.
 * - Token viaja no job da fila apenas de forma transitória (necessário para
 *   montar o link); nunca é persistido em banco em texto plano (o store de
 *   tokens usa hash — ver email-verification.service.ts e
 *   password-reset.service.ts).
 */
import { addJob } from '../../services/queue.js';
import { renderPasswordResetEmail, renderVerificationEmail } from './mail-template.service.js';

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  queue?: { type: string; data: Record<string, unknown> };
}

export interface MailTransport {
  send(mail: MailMessage): Promise<void>;
}

/**
 * Transporte de teste: captura emails em memória, sem envio real.
 */
export class MockMailTransport implements MailTransport {
  readonly sent: MailMessage[] = [];

  async send(mail: MailMessage): Promise<void> {
    this.sent.push(mail);
  }
}

/**
 * Transporte de produção: enfileira na fila `email` do BullMQ.
 */
export class QueueMailTransport implements MailTransport {
  async send(mail: MailMessage): Promise<void> {
    if (!mail.queue) {
      throw new Error('QueueMailTransport requer metadados de fila');
    }
    await addJob('email', mail.queue.type, {
      type: mail.queue.type,
      ...mail.queue.data,
    });
  }
}

const DEFAULT_APP_URL = 'https://almanaquedosclubes.com';

function appUrl(): string {
  return process.env.APP_URL ?? DEFAULT_APP_URL;
}

class MailerService {
  private transport: MailTransport = new QueueMailTransport();

  /** Injeção de transporte (testes usam MockMailTransport). */
  setTransport(transport: MailTransport): void {
    this.transport = transport;
  }

  async sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
    const verifyLink = `${appUrl()}/auth/verify-email/${token}`;
    const rendered = renderVerificationEmail({ name, email, verifyLink });
    await this.transport.send({
      to: email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      queue: { type: 'verify-email', data: { email, name, token } },
    });
  }

  async sendPasswordResetEmail(email: string, name: string, token: string): Promise<void> {
    const resetLink = `${appUrl()}/auth/reset-password/${token}`;
    const rendered = renderPasswordResetEmail({ name, email, resetLink });
    await this.transport.send({
      to: email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      queue: { type: 'password-reset', data: { email, name, token } },
    });
  }
}

export const mailerService = new MailerService();
