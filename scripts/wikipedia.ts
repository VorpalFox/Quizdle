// Complète les indices qu'AniList n'a pas donnés (sexe, âge, occupation, cheveux) avec l'infobox de la page Wikipédia
// du personnage : FR d'abord (déjà en français), puis EN. Seuls les gros personnages ont une page, mais c'est gratuit :
// 50 titres par requête, et les réponses sont gardées dans .cache/wikipedia/ (hors git).
// Pour tout retélécharger : supprimer .cache/wikipedia/.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { normalize } from '../src/engine/search.js'
import type { AttributeValue, Entry } from '../src/engine/types.js'
import { hairColors, sleep, splitOccupations, type CharacterName } from './anilist.js'
import { addedValues } from './translate.js'
import { addUnknowns, isUnknownValue, UNKNOWN_KEYS, unknownKeys } from './unknownValues.js'
import { infoboxAge } from './wikiText.js'

const LANGUAGES = ['fr', 'en'] as const
type Language = typeof LANGUAGES[number]

const TITLES_PER_REQUEST = 50
// Wikipédia limite vite les requêtes enchaînées : une par seconde suffit
const DELAY_MS = 1000
const MAX_ATTEMPTS = 5
// On ne garde que le début de la page (infobox et intro) : assez pour vérifier l'anime
const MAX_CACHED_LENGTH = 20_000
// Un titre de série plus court risque de trouver n'importe quoi (« Re » pour Re:Zero)
const MIN_TITLE_KEY = 5

const cacheDir = new URL('../.cache/wikipedia/', import.meta.url)
const cacheFile = (language: Language) => new URL(`${language}.json`, cacheDir)

// {{Infobox Personnage (fiction)}} en FR, {{Infobox character}} ou {{Infobox animanga character}} en EN
const INFOBOX = /\{\{\s*infobox\s+(?:personnage|character|animanga character|fictional character)\b/i

// Les noms des champs de l'infobox, en FR et en EN
const FIELDS = {
  gender: ['sexe', 'genre', 'gender', 'sex'],
  occupation: ['activité', 'profession', 'métier', 'occupation', 'occupations'],
  hair: ['cheveux', 'hair', 'hair color', 'hair colour', 'hair_color', 'haircolor'],
  age: ['âge', 'age'],
} as const

const GENDERS: Record<string, string> = {
  masculin: 'Male', homme: 'Male', male: 'Male', garcon: 'Male', man: 'Male',
  feminin: 'Female', femme: 'Female', female: 'Female', femelle: 'Female', fille: 'Female', woman: 'Female',
}

export interface WikiTarget {
  entry: Entry
  name: CharacterName
  // titres de l'anime (anglais, romaji...) : la page doit en citer un, sinon c'est un homonyme
  animeTitles: string[]
  // la page Fandom imposée à la main (« fandom » des corrections), éventuellement avec une section
  fandomPage?: string
}

export interface WikiReport {
  entries: Entry[]
  // personnages complétés, avec ce qui a été ajouté
  filled: string[]
}

// --- Lecture du wikitexte ---

// Les champs de la 1re infobox de personnage : { sexe: 'Masculin', cheveux: 'Noir', ... }, nettoyés
export function infoboxFields(wikitext: string): Record<string, string> | null {
  const text = wikitext
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<ref[^>]*\/>|<ref[\s\S]*?<\/ref>/gi, '')
  const start = text.search(INFOBOX)
  if (start < 0)
    return null

  // Découpe sur les « | » du 1er niveau : ceux des liens et des modèles imbriqués ne comptent pas
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (let i = start; i < text.length; i++) {
    const pair = text.slice(i, i + 2)
    if (pair === '{{' || pair === '[[') {
      depth++
      current += pair
      i++
    } else if (pair === '}}' || pair === ']]') {
      depth--
      if (depth === 0) {
        parts.push(current)
        break
      }
      current += pair
      i++
    } else if (text[i] === '|' && depth === 1) {
      parts.push(current)
      current = ''
    } else {
      current += text[i]
    }
  }

  const fields: Record<string, string> = {}
  for (const part of parts.slice(1)) {
    const equal = part.indexOf('=')
    if (equal < 0)
      continue
    const value = cleanValue(part.slice(equal + 1))
    if (value)
      fields[part.slice(0, equal).trim().toLowerCase()] = value
  }
  return fields
}

// « [[Hikikomori]] », « {{Plainlist|* Pirate * Captain}} », « Male<br>Female » → texte simple, séparé par des virgules
export function cleanValue(value: string): string {
  let text = value
    // « Male[[Category:Male]] » (wiki de Ranking of Kings) : la catégorie n'est pas une valeur
    .replace(/\[\[\s*category\s*:[^\]]*\]\]/gi, '')
    // Un saut de ligne sépare deux valeurs (« Twinleaf Town<hr />Sandgem Town », « New Zealand\nAustralia »)
    .replace(/<(?:br|hr)\s*\/?>/gi, ', ')
    .replace(/\s*\n+\s*(?=[^\s*])/g, ', ')
    .replace(/<[^>]+>/g, '')
    .replace(/\{\{\s*nihongo\s*\|([^|}]*)[^}]*\}\}/gi, '$1')
    .replace(/\{\{\s*(?:plainlist|flatlist|ubl|unbulleted list|hlist|liste horizontale)\s*\|/gi, '{{|')
  // Les listes : on garde leur contenu. Les autres modèles (références, notes...) partent.
  for (let previous = ''; previous !== text;) {
    previous = text
    text = text
      .replace(/\{\{\|([^{}]*)\}\}/g, (_, items: string) => items.replace(/\|/g, ', '))
      .replace(/\{\{[^{}]*\}\}/g, '')
  }
  return text
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/\[https?:\/\/\S+\s*([^\]]*)\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/\n\s*\*\s*/g, ', ')
    .replace(/^\s*\*\s*/, '')
    .replace(/\s+/g, ' ')
    .replace(/(?:\s*,\s*)+/g, ', ')
    .replace(/^[\s,]+|[\s,]+$/g, '')
}

const field = (fields: Record<string, string>, names: readonly string[]) =>
  names.map(name => fields[name]).find(value => value !== undefined) ?? null

export function wikiGender(value: string | null): string | null {
  return value ? GENDERS[normalize(value.split(',')[0]!)] ?? null : null
}

// Les wikis décrivent parfois les cheveux en détail (« White, with light blue tips and green streaks ») :
// on garde les 2 premières couleurs citées
const MAX_HAIR_COLORS = 2

export function wikiHair(value: string | null): string[] | null {
  const colors = value ? hairColors(value).slice(0, MAX_HAIR_COLORS) : []
  return colors.length > 0 ? colors : null
}

// La page parle-t-elle de cet anime ? Un des titres doit apparaître dans la page, ou commencer par un de ses liens
// (« [[Re:Zero]] » pour « Re:ZERO -Starting Life in Another World- »).
export function mentionsAnime(wikitext: string, animeTitles: string[]): boolean {
  const titles = animeTitles.map(normalize).filter(key => key.length >= MIN_TITLE_KEY)
  const page = normalize(wikitext)
  if (titles.some(title => page.includes(title)))
    return true
  const links = [...wikitext.matchAll(/\[\[([^\]|]+)(?:\|([^\]]*))?\]\]|''([^']+)''/g)]
    .flatMap(match => match.slice(1).filter(Boolean).map(text => normalize(text!)))
    .filter(key => key.length >= MIN_TITLE_KEY)
  return links.some(link => titles.some(title => title.startsWith(link)))
}

// --- Récupération ---

// Les titres à essayer : nom complet dans les deux ordres, et sans voyelles longues (« Gojou » → « Gojo »)
export function pageTitles(name: CharacterName): string[] {
  const parts = name.full.split(' ')
  const orders = parts.length > 1 ? [name.full, [...parts].reverse().join(' ')] : [name.full]
  const short = orders.map(title => title.replace(/ou\b/g, 'o').replace(/uu/g, 'u').replace(/oo/g, 'o'))
  return [...new Set([...orders, ...short])].filter(title => !/[#<>[\]{}|]/.test(title))
}

type Cache = Record<string, string | null>

async function readCache(language: Language): Promise<Cache> {
  const text = await readFile(cacheFile(language), 'utf8').catch(() => null)
  return text ? JSON.parse(text) as Cache : {}
}

interface QueryResponse {
  query?: {
    normalized?: { from: string, to: string }[]
    redirects?: { from: string, to: string }[]
    pages: { title: string, missing?: boolean, revisions?: { slots: { main: { content: string } } }[] }[]
  }
}

// Le début (section 0) de chaque page, en suivant les redirections. null = pas de page.
async function fetchBatch(language: Language, titles: string[]): Promise<Cache> {
  const body = new URLSearchParams({
    action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', rvsection: '0',
    redirects: '1', format: 'json', formatversion: '2', titles: titles.join('|'),
  })
  const data = await wikipedia(language, body)
  const renamed = new Map([...data.query?.normalized ?? [], ...data.query?.redirects ?? []].map(({ from, to }) => [from, to]))
  const pages = new Map((data.query?.pages ?? []).map(page => [page.title, page.revisions?.[0]?.slots.main.content ?? null]))
  const resolve = (title: string) => {
    let current = title
    for (let hops = 0; renamed.has(current) && hops < 3; hops++)
      current = renamed.get(current)!
    return current
  }
  return Object.fromEntries(titles.map(title => [title, pages.get(resolve(title))?.slice(0, MAX_CACHED_LENGTH) ?? null]))
}

// Une requête à l'API, avec reprise quand Wikipédia nous freine (429, ou une page d'erreur à la place du JSON)
async function wikipedia(language: Language, body: URLSearchParams): Promise<QueryResponse> {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(`https://${language}.wikipedia.org/w/api.php`, {
      method: 'POST',
      headers: { 'User-Agent': 'quizdle-data/1.0', 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    }).catch((error: unknown) => error as Error)
    const text = response instanceof Error ? null : await response.text()
    if (text && !(response instanceof Error) && response.ok && text.startsWith('{'))
      return JSON.parse(text) as QueryResponse
    if (attempt === MAX_ATTEMPTS) {
      const detail = response instanceof Error ? response.message : `${response.status} : ${text?.slice(0, 200)}`
      throw new Error(`Wikipédia ${language} : ${detail}`)
    }
    const wait = 15_000 * attempt
    process.stdout.write(`\n  Wikipédia ${language} nous freine, nouvel essai dans ${wait / 1000} s\n`)
    await sleep(wait)
  }
}

// Les pages de tous ces titres : depuis le cache, sinon par lots de 50 (cache enregistré après chaque lot)
async function fetchPages(language: Language, titles: string[]): Promise<Cache> {
  const cache = await readCache(language)
  const missing = [...new Set(titles)].filter(title => !(title in cache))
  for (let i = 0; i < missing.length; i += TITLES_PER_REQUEST) {
    process.stdout.write(`\rWikipédia ${language} : ${Math.min(i + TITLES_PER_REQUEST, missing.length)}/${missing.length} titres`)
    Object.assign(cache, await fetchBatch(language, missing.slice(i, i + TITLES_PER_REQUEST)))
    await writeFile(cacheFile(language), JSON.stringify(cache))
    await sleep(DELAY_MS)
  }
  if (missing.length > 0)
    console.log()
  return cache
}

// --- Complément ---

// Complète les champs vides de chaque personnage et ajoute aux listes (addedValues). Les valeurs d'AniList (et les
// corrections à la main, appliquées après) priment pour le sexe et l'âge.
export async function completeFromWikipedia(targets: WikiTarget[]): Promise<WikiReport> {
  await mkdir(cacheDir, { recursive: true })
  const caches = new Map<Language, Cache>()
  for (const language of LANGUAGES)
    caches.set(language, await fetchPages(language, targets.flatMap(({ name }) => pageTitles(name))))

  const filled: string[] = []
  const completed = new Map<Entry, Entry>()
  for (const { entry, name, animeTitles } of targets) {
    const found: Record<string, AttributeValue> = {}
    const unknowns: string[] = []
    for (const language of LANGUAGES) {
      const fields = infoboxOf(caches.get(language)!, pageTitles(name), animeTitles)
      if (!fields)
        continue
      const raw = Object.fromEntries(Object.entries(FIELDS).map(([key, names]) => [key, field(fields, names)])) as Record<keyof typeof FIELDS, string | null>
      // « Unknown » ne remplit rien : juste la marque, « Inconnu » à la fin si aucune source n'a mieux (unknownValues.ts)
      unknowns.push(...unknownKeys(raw))
      const values: Record<keyof typeof FIELDS, AttributeValue> = {
        gender: wikiGender(raw.gender),
        occupation: isUnknownValue(raw.occupation) ? null : splitOccupations(raw.occupation ?? ''),
        hair: wikiHair(raw.hair),
        age: infoboxAge(raw.age),
      }
      Object.assign(found, addedValues({ ...entry.attributes, ...found }, values))
    }
    const unknown = addUnknowns(entry.attributes, unknowns)
    if (unknown)
      found[UNKNOWN_KEYS] = unknown
    if (Object.keys(found).length === 0)
      continue
    completed.set(entry, { ...entry, attributes: { ...entry.attributes, ...found } })
    filled.push(`${entry.name} : ${Object.entries(found).map(([key, value]) => `${key} ${JSON.stringify(value)}`).join(', ')}`)
  }
  return { entries: targets.map(({ entry }) => completed.get(entry) ?? entry), filled }
}

// L'infobox de la 1re page trouvée qui parle bien de cet anime
function infoboxOf(cache: Cache, titles: string[], animeTitles: string[]): Record<string, string> | null {
  for (const title of titles) {
    const wikitext = cache[title]
    if (!wikitext || !mentionsAnime(wikitext, animeTitles))
      continue
    const fields = infoboxFields(wikitext)
    if (fields)
      return fields
  }
  return null
}
