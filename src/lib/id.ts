/** Lightweight unique id without extra deps (cuid-like). */
export function createId(): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  const rand2 = Math.random().toString(36).slice(2, 10);
  return `${time}${rand}${rand2}`;
}
