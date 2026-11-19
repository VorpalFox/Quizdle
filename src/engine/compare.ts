import type { AttributeDef, AttributeKind, AttributeValue, Entry } from './types.js'

// higher / lower : la valeur de la cible est plus grande / plus petite que celle proposée
export type Feedback = 'correct' | 'partial' | 'wrong' | 'higher' | 'lower'

export interface AttributeResult {
  attribute: AttributeDef
  value: AttributeValue
  feedback: Feedback
}

export function compareValues(kind: AttributeKind, guess: AttributeValue, target: AttributeValue): Feedback {
  switch (kind) {
    case 'exact':
      return guess === target ? 'correct' : 'wrong'
    case 'set': {
      const guessSet = new Set(asList(guess))
      const targetSet = new Set(asList(target))
      const common = [...guessSet].filter(value => targetSet.has(value)).length
      if (common === guessSet.size && common === targetSet.size)
        return 'correct'
      return common > 0 ? 'partial' : 'wrong'
    }
    case 'number':
      if (guess === target)
        return 'correct'
      if (typeof guess !== 'number' || typeof target !== 'number')
        return 'wrong'
      return target > guess ? 'higher' : 'lower'
  }
}

export function compareEntries(attributes: readonly AttributeDef[], guess: Entry, target: Entry): AttributeResult[] {
  return attributes.map(attribute => {
    const value = guess.attributes[attribute.key] ?? null
    return { attribute, value, feedback: compareValues(attribute.kind, value, target.attributes[attribute.key] ?? null) }
  })
}

export function formatValue(attribute: AttributeDef, value: AttributeValue): string {
  if (attribute.format)
    return attribute.format(value)
  if (value === null || (Array.isArray(value) && value.length === 0))
    return '—'
  return Array.isArray(value) ? value.join(' / ') : String(value)
}

function asList(value: AttributeValue): readonly (string | number)[] {
  if (value === null)
    return []
  return Array.isArray(value) ? value : [value as string | number]
}
