// underscores survive `mini-svg-data-uri` and mean nothing in a regex
const TOKEN_DELIMITER = '___'

// not `var(--`: css allows whitespace after the parenthesis
export const VAR_CALL = 'var('

const ATTRIBUTE_RE = /([a-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi
const VAR_NAME_RE = /^--([a-z][\w-]*)$/i
const STYLE_ATTRIBUTE_RE = /\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi
const STYLE_ELEMENT_RE = /<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi

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

/** `defaults` has to be ordered as {@link sortVariableDefaults} returns it. */
export function resolveVariableTokens(template: string, defaults: Record<string, string>): string {
  let resolved = template

  // split/join, not `replace`: a `$&` in a default is literal text
  for (const [name, value] of Object.entries(defaults))
    resolved = resolved.split(variableToken(name)).join(value)

  return resolved
}

/** Longest name first, so `___a___` cannot shadow `___a____b___` when replaced. */
export function sortVariableDefaults(defaults: Map<string, string>): Record<string, string> {
  return Object.fromEntries(
    [...defaults].sort(([a], [b]) => b.length - a.length || a.localeCompare(b)),
  )
}

function findClosingParen(value: string, open: number): number {
  let depth = 0
  let quote = ''

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
      return index
  }

  return -1
}

function indexOfTopLevelComma(value: string): number {
  let depth = 0
  let quote = ''

  for (let index = 0; index < value.length; index++) {
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
    else if (char === ')')
      depth--
    else if (char === ',' && depth === 0)
      return index
  }

  return -1
}

function scanVarFunctions(value: string): { occurrences: VarOccurrence[], unbalanced: boolean } {
  const occurrences: VarOccurrence[] = []
  let index = value.indexOf(VAR_CALL)

  while (index !== -1) {
    const close = findClosingParen(value, index + 3)
    if (close === -1)
      return { occurrences, unbalanced: true }

    const inner = value.slice(index + 4, close)
    const comma = indexOfTopLevelComma(inner)

    occurrences.push({
      start: index,
      end: close + 1,
      name: (comma === -1 ? inner : inner.slice(0, comma)).trim(),
      fallback: (comma === -1 ? '' : inner.slice(comma + 1)).trim(),
    })

    // resume past the whole call so a nested var() is not visited twice
    index = value.indexOf(VAR_CALL, close + 1)
  }

  return { occurrences, unbalanced: false }
}

function hasStyleAttributeVariable(source: string): boolean {
  for (const match of source.matchAll(STYLE_ATTRIBUTE_RE)) {
    if ((match[1] ?? match[2] ?? '').includes(VAR_CALL))
      return true
  }

  return false
}

function hasStyleElementVariable(source: string): boolean {
  for (const match of source.matchAll(STYLE_ELEMENT_RE)) {
    if (match[1].includes(VAR_CALL))
      return true
  }

  return false
}

/**
 * A `var()` inside a `style` attribute or a `<style>` element, which OXVG cannot
 * optimize without aborting the process.
 */
export function hasStyleVariable(source: string): boolean {
  return source.includes(VAR_CALL)
    && (hasStyleAttributeVariable(source) || hasStyleElementVariable(source))
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
 * Attribute values and `<style>` element contents, in source order. CSS rules need no
 * parsing: replacing a `var()` with its token is textual, and which elements a selector
 * matches is the browser's problem once it renders.
 */
function collectVarSites(source: string): VarSite[] {
  const sites: VarSite[] = []
  const styleContents: Array<[number, number]> = []

  for (const match of source.matchAll(STYLE_ELEMENT_RE)) {
    // the content starts past the open tag, which the pattern forbids a `>` inside
    const start = match.index + match[0].indexOf('>') + 1
    styleContents.push([start, start + match[1].length])

    if (match[1].includes(VAR_CALL))
      sites.push({ start, value: match[1], label: '`<style>`' })
  }

  for (const match of source.matchAll(ATTRIBUTE_RE)) {
    const value = match[2] ?? match[3]

    if (!value.includes(VAR_CALL) || /^xmlns(?:$|:)/i.test(match[1]))
      continue

    // a css attribute selector inside `<style>` is not an attribute of the document
    if (styleContents.some(([start, end]) => match.index >= start && match.index < end))
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
  if (!source.includes(VAR_CALL))
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

      if (occurrence.fallback.includes(VAR_CALL))
        warnings.push(`The default of \`--${name}\` contains a nested \`var()\`, kept verbatim and not substituted at compile time.`)

      if (occurrence.fallback.includes('url('))
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
