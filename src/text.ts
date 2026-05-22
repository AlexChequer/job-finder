/** Strip HTML tags and decode common entities into plain, single-spaced text. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Cut text to at most `max` characters. */
export function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) : text;
}
