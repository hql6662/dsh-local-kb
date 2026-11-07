// dsh-local-kb — Cordis Host entry.
// The heavy lifting lives in host/kb.js (read-only FTS5 layer + local API + `kb` tool).
import { apply as applyKb } from './host/kb.js';

export const name = 'dsh-local-kb';
export const inject = ['tools', 'webServer'];

export function apply(ctx) {
  applyKb(ctx);
}
