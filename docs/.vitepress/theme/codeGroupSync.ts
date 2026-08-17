import { inBrowser, onContentUpdated } from 'vitepress'

const STORAGE_KEY = 'spritemap-docs-code-groups'

type Preferences = Record<string, string>

function labelsOf(group: Element) {
  return Array.from(group.querySelectorAll<HTMLLabelElement>('.tabs label'), label =>
    label.textContent?.trim() ?? '')
}

function keyOf(labels: string[]) {
  return JSON.stringify(labels)
}

function read(): Preferences {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    return stored && typeof stored === 'object' ? stored : {}
  }
  catch {
    return {}
  }
}

function write(preferences: Preferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
  }
  catch {}
}

function activate(group: Element, index: number) {
  const input = group.querySelectorAll<HTMLInputElement>('.tabs input')[index]
  const blocks = group.querySelector('.blocks')
  const next = blocks?.children[index]
  if (!input || !blocks || !next)
    return

  input.checked = true
  Array.from(blocks.children).forEach(block => block.classList.remove('active'))
  next.classList.add('active')
}

function apply(preferences: Preferences) {
  document.querySelectorAll('.vp-code-group').forEach((group) => {
    const labels = labelsOf(group)
    const index = labels.indexOf(preferences[keyOf(labels)])
    if (index !== -1)
      activate(group, index)
  })
}

export function useCodeGroupSync() {
  if (!inBrowser)
    return

  window.addEventListener('click', (event) => {
    const el = event.target as HTMLElement | null
    if (!el?.matches?.('.vp-code-group input'))
      return

    const group = el.closest('.vp-code-group')
    if (!group)
      return

    const inputs = Array.from(group.querySelectorAll<HTMLInputElement>('.tabs input'))
    const labels = labelsOf(group)
    const chosen = labels[inputs.indexOf(el as HTMLInputElement)]
    if (!chosen)
      return

    const preferences = { ...read(), [keyOf(labels)]: chosen }
    write(preferences)
    apply(preferences)
  })

  onContentUpdated(() => {
    const preferences = read()
    apply(preferences)

    // The callback can run before the new page's groups are in the DOM, and in
    // dev vitepress resets every group to its first tab from this same update,
    // so the choice has to be applied again once both have settled.
    setTimeout(() => apply(preferences))
  })
}
