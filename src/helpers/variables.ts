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

/**
 * A `url()` pointing anywhere but at a fragment. A `url(#gradient)` resolves against
 * the icon's own document, so it survives inlining: the reference goes through the
 * optimizer with the rest of the source and `cleanupIds` renames it along with the
 * element it points at. Anything else is an external file a data uri cannot load.
 */
const EXTERNAL_URL_CALL_RE = /(?<![\w-])url\((?!\s*(?:['"]\s*)?#)/i

const ATTRIBUTE_RE = /([a-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi
const TAG_NAME_RE = /^<\s*([a-z_:][\w:.-]*)/i
const STYLE_CLOSE_RE = /<\/style\s*>/i
const VAR_NAME_RE = /^--([a-z][\w-]*)$/i
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

/**
 * Longest name first, so a shorter token can never shadow a longer one. Ties break on
 * code points rather than `localeCompare`, whose collation would make the generated
 * stylesheet depend on the host locale. Names are unique, so no pair ever compares equal.
 */
function byTokenLength(a: string, b: string): number {
  return b.length - a.length || (a < b ? -1 : 1)
}

/** Whether the emitted spritemap bakes the defaults in rather than keeping the `var()`. */
export function resolvesSpritemap(variables: Options['variables']): boolean {
  return variables !== false && variables.spritemap === 'resolve'
}

/**
 * One pass, so a substituted value is never itself scanned for tokens and the
 * order of `defaults` does not matter. A function replacement also keeps a `$&`
 * in a default literal.
 *
 * The pattern is built from the names themselves, longest first, so two adjacent
 * tokens (`___a______b___`) read as `a` then `b` rather than as one greedy
 * `a______b` name that matches nothing.
 */
export function resolveVariableTokens(template: string, defaults: Record<string, string>): string {
  const names = Object.keys(defaults).sort(byTokenLength)

  if (!names.length)
    return template

  const alternation = names.map(name => name.replace(/[$()*+.?[\\\]^{|}]/g, '\\$&')).join('|')
  const pattern = new RegExp(`${TOKEN_DELIMITER}(${alternation})${TOKEN_DELIMITER}`, 'g')

  return template.replace(pattern, (_, name: string) => defaults[name])
}

/**
 * Longest name first, so `___a___` cannot shadow `___a____b___` when replaced.
 * The scss/styl/less mixins substitute one name at a time and rely on this.
 */
export function sortVariableDefaults(defaults: Map<string, string>): Record<string, string> {
  return Object.fromEntries([...defaults].sort(([a], [b]) => byTokenLength(a, b)))
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
      // a css string escapes its own delimiter, so `"a\")b"` closes on the last quote
      if (char === '\\')
        index++
      else if (char === quote)
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

/** End of the markup that opens at `open`, past its `>`. A quoted value may hold one. */
function scanMarkup(source: string, open: number): number {
  let quote = ''

  for (let index = open + 1; index < source.length; index++) {
    const char = source[index]

    if (quote) {
      if (char === quote)
        quote = ''
    }
    else if (char === '"' || char === '\'') {
      quote = char
    }
    else if (char === '>') {
      return index + 1
    }
  }

  return source.length
}

/** Index past `close`, or the end of the source when it never comes. */
function scanTo(source: string, from: number, close: string): number {
  const index = source.indexOf(close, from)
  return index === -1 ? source.length : index + close.length
}

/**
 * Attribute values and `<style>` element contents, in source order. The source is
 * walked once rather than matched for attributes anywhere, so text that merely reads
 * like one (`<desc>fill="var(--x, red)"</desc>`), a commented-out attribute and a css
 * attribute selector are all left alone. A `<style>` is taken as one stretch of text:
 * its rules need no parsing, replacing a `var()` with its token is textual, and which
 * elements a selector matches is the browser's problem once it renders.
 */
function collectVarSites(source: string): VarSite[] {
  const sites: VarSite[] = []
  let cursor = 0

  while (cursor < source.length) {
    const open = source.indexOf('<', cursor)
    if (open === -1)
      break

    if (source.startsWith('<!--', open)) {
      cursor = scanTo(source, open + 4, '-->')
      continue
    }

    if (source.startsWith('<![CDATA[', open)) {
      cursor = scanTo(source, open + 9, ']]>')
      continue
    }

    const end = scanMarkup(source, open)
    const tag = source.slice(open, end)
    cursor = end

    for (const match of tag.matchAll(ATTRIBUTE_RE)) {
      const value = match[2] ?? match[3]

      if (!VAR_CALL_RE.test(value) || /^xmlns(?:$|:)/i.test(match[1]))
        continue

      sites.push({
        // match[0] ends with the closing quote, so the value starts that far back
        start: open + match.index + match[0].length - value.length - 1,
        value,
        label: `\`${match[1]}\``,
      })
    }

    if (TAG_NAME_RE.exec(tag)?.[1].toLowerCase() !== 'style' || tag.endsWith('/>'))
      continue

    const close = STYLE_CLOSE_RE.exec(source.slice(end))
    const content = source.slice(end, close ? end + close.index : source.length)
    cursor = close ? end + close.index + close[0].length : source.length

    if (VAR_CALL_RE.test(content))
      sites.push({ start: end, value: content, label: '`<style>`' })
  }

  return sites
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
        warnings.push(`The default of \`--${name}\` contains a nested \`var()\`. It is kept as the default, but the inner name is not a variable of its own and cannot be overridden.`)

      if (EXTERNAL_URL_CALL_RE.test(occurrence.fallback))
        warnings.push(`The default of \`--${name}\` contains an external \`url()\`, which a data uri cannot load. Only a \`url(#id)\` reference to the icon's own content survives inlining.`)

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
