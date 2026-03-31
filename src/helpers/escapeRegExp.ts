const escapeRegExpPattern = /[.*+?^${}()|[\]\\]/g

export function escapeRegExp(text: string): string {
  return text.replace(escapeRegExpPattern, '\\$&')
}
