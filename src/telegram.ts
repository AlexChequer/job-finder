import { BOARD_URL } from './config.js';
import type { JobRecord, Level } from './types.js';

const TELEGRAM_API = 'https://api.telegram.org';

/** Human-readable label for each early-career level. */
const LEVEL_LABELS: Record<Level, string> = {
  estagio: 'Estágio',
  trainee: 'Trainee',
  aprendiz: 'Jovem Aprendiz',
  junior: 'Júnior',
  newgrad: 'Recém-formado',
};

/** Escape the characters Telegram's HTML parser treats specially. */
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Build the HTML message body for one job posting. */
export function formatJob(job: JobRecord): string {
  return [
    `🆕 <b>${escapeHtml(job.title)}</b>`,
    `🏢 ${escapeHtml(job.company)} · 💼 ${LEVEL_LABELS[job.level]} · 📍 ${escapeHtml(job.location)}`,
    `🔗 <a href="${escapeHtml(job.url)}">Ver vaga</a> · <a href="${BOARD_URL}">todas as vagas</a>`,
  ].join('\n');
}

/** Send one job posting to the configured Telegram chat. */
export async function sendJob(job: JobRecord): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    throw new Error('TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set');
  }
  const response = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: formatJob(job),
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Telegram sendMessage failed: ${response.status} ${detail}`);
  }
}
