import { addJob } from '../services/queue.js';

interface EmailJobData {
  type: 'welcome' | 'password-reset';
  email: string;
  name: string;
  token?: string;
}

export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  await addJob('email', 'welcome', { type: 'welcome', email, name } satisfies EmailJobData);
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  token: string,
): Promise<void> {
  await addJob('email', 'password-reset', {
    type: 'password-reset',
    email,
    name,
    token,
  } satisfies EmailJobData);
}
