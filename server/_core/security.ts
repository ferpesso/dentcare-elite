
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window as any);

/**
 * Sanitiza uma string de HTML para prevenir ataques XSS
 * @param html String HTML a ser sanitizada
 * @returns String sanitizada e segura
 */
export function sanitizeHtml(html: string): string {
  if (!html) return html;
  return DOMPurify.sanitize(html);
}

/**
 * Sanitiza recursivamente todas as strings de um objeto
 * @param obj Objeto a ser sanitizado
 * @returns Objeto com todas as strings sanitizadas
 */
export function sanitizeObject<T>(obj: T): T {
  if (typeof obj !== 'object' || obj === null) {
    if (typeof obj === 'string') {
      return sanitizeHtml(obj) as any;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item)) as any;
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeObject(value);
  }
  return sanitized;
}
