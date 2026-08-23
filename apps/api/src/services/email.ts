import { addJob } from '../services/queue.js';

interface EmailJobData {
  type: 'welcome';
  email: string;
  name: string;
}

export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  await addJob('email', 'welcome', { type: 'welcome', email, name } satisfies EmailJobData);
}
