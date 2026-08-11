// underscores survive `mini-svg-data-uri` and mean nothing in a regex
const TOKEN_DELIMITER = '___'

// not `var(--`: css allows whitespace after the parenthesis
export const VAR_CALL = 'var('

const ATTRIBUTE_RE = /([a-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi
const VAR_NAME_RE = /^--([a-z][\w-]*)$/i

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

/** Parse `var(--name, default)` out of the attributes of an svg, `null` if none. */
export function extractSvgVariables(source: string): SvgVariablesResult | null {
  if (!source.includes(VAR_CALL))
    return null

  const defaults = new Map<string, string>()
  const warnings: string[] = []
  let template = ''
  let cursor = 0

  for (const match of source.matchAll(ATTRIBUTE_RE)) {
    const attribute = match[1]
    const raw = match[2] ?? match[3]

    if (!raw.includes(VAR_CALL))
      continue

    if (/^xmlns(?:$|:)/i.test(attribute))
      continue

    if (attribute.toLowerCase() === 'style') {
      warnings.push('`style` declarations are not supported, use a presentation attribute instead (e.g. `fill="var(--color, #fff)"`).')
      continue
    }

    // match[0] ends with the closing quote, so the value starts that far back
    const valueStart = match.index + match[0].length - raw.length - 1
    const { occurrences, unbalanced } = scanVarFunctions(raw)

    if (unbalanced)
      warnings.push(`Unbalanced \`var(\` in \`${attribute}\`, left as-is.`)

    for (const occurrence of occurrences) {
      const name = VAR_NAME_RE.exec(occurrence.name)?.[1]

      if (!name) {
        warnings.push(`Invalid variable name \`${occurrence.name}\` in \`${attribute}\`, left as-is. A name must start with a letter and contain only letters, digits, \`-\` and \`_\`.`)
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
