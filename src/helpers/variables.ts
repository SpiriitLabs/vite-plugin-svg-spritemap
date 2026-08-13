import type { Options } from '@/types'

// underscores survive `mini-svg-data-uri` and mean nothing in a regex
const TOKEN_DELIMITER = '___'

/**
 * Not `var(--`: css allows whitespace after the parenthesis. Case-insensitive
 * because a css function name is, and left-guarded because a function token is an
 * identifier immediately followed by `(`, so `mavar(` is not a call. Missing a
 * `VAR(` is not cosmetic: it takes the icon past the OXVG mitigations and into an
 * abort. Keep it free of the `g` flag so `.test()` stays stateless.
 */
export const VAR_CALL_RE: RegExp = /(?<![\w-])var\(/i
const VAR_CALL_SCAN_RE = new RegExp(VAR_CALL_RE.source, 'gi')
const URL_CALL_RE = /(?<![\w-])url\(/i

const ATTRIBUTE_RE = /([a-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi
const COMMENT_RE = /<!--[\s\S]*?-->/g
const VAR_NAME_RE = /^--([a-z][\w-]*)$/i
const TOKEN_RE = new RegExp(`${TOKEN_DELIMITER}([a-z][\\w-]*)${TOKEN_DELIMITER}`, 'gi')
export const STYLE_ELEMENT_RE: RegExp = /<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi

interface VarOccurrence {
  start: number
  end: number
  name: string
  fallback: string
}

export interface SvgVariablesResult {
  /** Variable name without its `--` prefix, to its default value. */
  defaults: Map<string, string>
  /** `source` with every supported `var(...)` replaced by its `___name___` token */
  template: string
  warnings: string[]
}

export function variableToken(name: string): string {
  return `${TOKEN_DELIMITER}${name}${TOKEN_DELIMITER}`
}

/** Whether the emitted spritemap bakes the defaults in rather than keeping the `var()`. */
export function resolvesSpritemap(variables: Options['variables']): boolean {
  return variables !== false && variables.spritemap === 'resolve'
}

/**
 * One pass, so a substituted value is never itself scanned for tokens and the
 * order of `defaults` does not matter. A function replacement also keeps a `$&`
 * in a default literal.
 */
export function resolveVariableTokens(template: string, defaults: Record<string, string>): string {
  return template.replace(TOKEN_RE, (token, name) => {
    // a name may collide with a prototype member (`--constructor`), which is
    // never a string and so never mistaken for a default
    const value = defaults[name]
    return typeof value === 'string' ? value : token
  })
}

/**
 * Longest name first, so `___a___` cannot shadow `___a____b___` when replaced.
 * The scss/styl/less mixins substitute one name at a time and rely on this.
 */
export function sortVariableDefaults(defaults: Map<string, string>): Record<string, string> {
  return Object.fromEntries(
    [...defaults].sort(([a], [b]) => b.length - a.length || a.localeCompare(b)),
  )
}

/**
 * Walk a `var(` from its opening paren to the matching one, reporting the first
 * comma that separates the name from the default along the way. Both indexes are
 * absolute; `close` is -1 when the call is never closed.
 */
function scanCall(value: string, open: number): { close: number, comma: number } {
  let depth = 0
  let quote = ''
  let comma = -1

  for (let index = open; index < value.length; index++) {
    const char = value[index]

    if (quote) {
      if (char === quote)
        quote = ''
      continue
    }

    if (char === '"' || char === '\'')
      quote = char
    else if (char === '(')
      depth++
    else if (char === ')' && --depth === 0)
      return { close: index, comma }
    else if (char === ',' && depth === 1 && comma === -1)
      comma = index
  }

  return { close: -1, comma }
}

function scanVarFunctions(value: string): { occurrences: VarOccurrence[], unbalanced: boolean } {
  const occurrences: VarOccurrence[] = []
  VAR_CALL_SCAN_RE.lastIndex = 0

  for (let match = VAR_CALL_SCAN_RE.exec(value); match; match = VAR_CALL_SCAN_RE.exec(value)) {
    // the lookbehind is zero-width, so the match ends on the opening parenthesis
    const open = match.index + match[0].length - 1
    const { close, comma } = scanCall(value, open)
    if (close === -1)
      return { occurrences, unbalanced: true }

    occurrences.push({
      start: match.index,
      end: close + 1,
      name: value.slice(open + 1, comma === -1 ? close : comma).trim(),
      fallback: comma === -1 ? '' : value.slice(comma + 1, close).trim(),
    })

    // resume past the whole call so a nested var() is not visited twice
    VAR_CALL_SCAN_RE.lastIndex = close + 1
  }

  return { occurrences, unbalanced: false }
}

/** A stretch of `source` a `var()` may live in, in source order. */
interface VarSite {
  /** Offset of `value` in the source, so an occurrence maps back to it. */
  start: number
  value: string
  /** Names the site in a warning. */
  label: string
}

/**
 * Attribute values and `<style>` element contents, in source order. A `<style>` is
 * scanned as one stretch of text: its rules need no parsing, replacing a `var()` with
 * its token is textual, and which elements a selector matches is the browser's problem
 * once it renders.
 */
function collectVarSites(source: string): VarSite[] {
  const sites: VarSite[] = []
  // ranges an attribute match cannot be a real attribute in. A commented-out one is
  // only reachable with both optimizers off, since either strips comments first
  const skipped: Array<[number, number]> = [...source.matchAll(COMMENT_RE)]
    .map(match => [match.index, match.index + match[0].length])

  const isSkipped = (index: number): boolean =>
    skipped.some(([start, end]) => index >= start && index < end)

  for (const match of source.matchAll(STYLE_ELEMENT_RE)) {
    // the content starts past the open tag, which the pattern forbids a `>` inside
    const start = match.index + match[0].indexOf('>') + 1
    skipped.push([start, start + match[1].length])

    if (!isSkipped(match.index) && VAR_CALL_RE.test(match[1]))
      sites.push({ start, value: match[1], label: '`<style>`' })
  }

  for (const match of source.matchAll(ATTRIBUTE_RE)) {
    const value = match[2] ?? match[3]

    if (!VAR_CALL_RE.test(value) || /^xmlns(?:$|:)/i.test(match[1]))
      continue

    // a css attribute selector inside `<style>` is not an attribute either
    if (isSkipped(match.index))
      continue

    sites.push({
      // match[0] ends with the closing quote, so the value starts that far back
      start: match.index + match[0].length - value.length - 1,
      value,
      label: `\`${match[1]}\``,
    })
  }

  return sites.sort((a, b) => a.start - b.start)
}

/** Parse `var(--name, default)` out of the attributes and styles of an svg. */
export function extractSvgVariables(source: string): SvgVariablesResult | null {
  if (!VAR_CALL_RE.test(source))
    return null

  const defaults = new Map<string, string>()
  const warnings: string[] = []
  let template = ''
  let cursor = 0

  for (const site of collectVarSites(source)) {
    const valueStart = site.start
    const { occurrences, unbalanced } = scanVarFunctions(site.value)

    if (unbalanced)
      warnings.push(`Unbalanced \`var(\` in ${site.label}, left as-is.`)

    for (const occurrence of occurrences) {
      const name = VAR_NAME_RE.exec(occurrence.name)?.[1]

      if (!name) {
        warnings.push(`Invalid variable name \`${occurrence.name}\` in ${site.label}, left as-is. A name must start with a letter and contain only letters, digits, \`-\` and \`_\`.`)
        continue
      }

      if (VAR_CALL_RE.test(occurrence.fallback))
        warnings.push(`The default of \`--${name}\` contains a nested \`var()\`, kept verbatim and not substituted at compile time.`)

      if (URL_CALL_RE.test(occurrence.fallback))
        warnings.push(`The default of \`--${name}\` contains \`url()\`, which cannot be safely inlined into a data uri.`)

      const previous = defaults.get(name)
      if (typeof previous === 'undefined' || previous === '')
        defaults.set(name, occurrence.fallback)
      else if (occurrence.fallback !== '' && occurrence.fallback !== previous)
        warnings.push(`Conflicting defaults for \`--${name}\`: \`${previous}\` then \`${occurrence.fallback}\`. \`${previous}\` is used.`)

      template += source.slice(cursor, valueStart + occurrence.start) + variableToken(name)
      cursor = valueStart + occurrence.end
    }
  }

  return {
    defaults,
    template: template + source.slice(cursor),
    warnings: [...new Set(warnings)],
  }
}
