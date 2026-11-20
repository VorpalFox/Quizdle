import type { AttributeDef, AttributeKind, AttributeValue, Entry } from './types.js'

// higher / lower : la valeur de la cible est plus grande / plus petite que celle proposée
// unknown : la cible n'a pas de valeur pour cet indice, on ne peut rien en dire
export type Feedback = 'correct' | 'partial' | 'wrong' | 'higher' | 'lower' | 'unknown'

export interface AttributeResult {
  attribute: AttributeDef
  value: AttributeValue
  feedback: Feedback
  // les valeurs proposées que la cible a aussi (attributs « set ») : mises en avant à l'affichage
  common: readonly (string | number)[]
}

export function compareValues(kind: AttributeKind, guess: AttributeValue, target: AttributeValue): Feedback {
  if (asList(target).length === 0)
    return 'unknown'
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
    const targetValue = target.attributes[attribute.key] ?? null
    // le bon perso : tout est juste, même ses indices vides
    const feedback = guess.id === target.id ? 'correct' : compareValues(attribute.kind, value, targetValue)
    return { attribute, value, feedback, common: commonValues(attribute.kind, value, targetValue) }
  })
}

export function formatValue(attribute: AttributeDef, value: AttributeValue): string {
  if (attribute.format)
    return attribute.format(value)
  if (value === null || (Array.isArray(value) && value.length === 0))
    return '—'
  return Array.isArray(value) ? value.join(' / ') : String(value)
}

export function commonValues(kind: AttributeKind, guess: AttributeValue, target: AttributeValue): (string | number)[] {
  if (kind !== 'set')
    return []
  const targetSet = new Set(asList(target))
  return asList(guess).filter(value => targetSet.has(value))
}

function asList(value: AttributeValue): readonly (string | number)[] {
  if (value === null)
    return []
  return Array.isArray(value) ? value : [value as string | number]
}
