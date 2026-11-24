// Les personnages des franchises que Wikidata connaît mal (moins de 4 personnages) : pris dans la catégorie
// « Characters » du wiki de la franchise (voir pixeldleWikis.ts), sous-catégories comprises.
// Seules les pages dont on connaît le sexe sont gardées (pas les espèces, lieux, objets, jeux) : celui de l'infobox,
// sinon celui des pronoms du texte (« he », « she »), beaucoup de petits wikis n'ayant pas de champ « gender ».
// Classement : la longueur de la page, les personnages importants ont les plus longues.
// Les listes de pages et leurs longueurs sont gardées dans .cache/pixeldle/categories/ (hors git).
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { normalize } from '../src/engine/search.js'
import type { AttributeValue } from '../src/engine/types.js'
import { fetchPages, infobox, infoboxValues, request, type EnrichKey } from './pixeldleEnrich.js'
import { cleanValue } from './wikipedia.js'
import { DEVELOPMENT, textHair } from './wikiText.js'
import type { WikiSettings } from '../src/subjects/manual.js'
import type { Wiki } from './pixeldleWikis.js'

// Les catégories essayées, dans l'ordre : la 1re qui existe est parcourue
const ROOT_CATEGORIES = ['Characters', 'NPCs', 'Personnages', 'Character', 'People']
const MAX_DEPTH = 2
const MAX_CATEGORIES = 80
const MAX_PAGES = 2000
// Pages lues (les plus longues d'abord) pour trouver les personnages à garder : quelques-unes n'ont pas d'infobox
const READ_FACTOR = 4
const TITLES_PER_REQUEST = 50

// Les sous-catégories qui ne sont pas des personnages : images, doubleurs, contenu coupé...
const SKIPPED_CATEGORY = /image|\bart\b|artwork|concept|gallery|galleries|screenshot|stub|quote|audio|sound|voice|actor|cast\b|template|disambig|\bcut\b|unused|mentioned|cosmetic|skin|outfit|costume|stat|achievement|redirect|by (?:voice|actor)|real[- ]world|developer|crew/i
// Les pages qui ne sont pas un personnage
const SKIPPED_PAGE = /^(?:list of|characters?\b)|\bcharacters$|\((?:disambiguation|anime|manga|film|movie|tv series|comics?|netflix|dmc|reincarnation)\)$|\/|:/i
// Les valeurs de sexe d'un personnage. Une autre (« Survival horror » : le champ « genre » d'un jeu) écarte la page.
const GENDERS = new Set(['Homme', 'Femme', 'Autre', 'Aucun', 'Au choix'])
// Assez de pronoms, et nettement plus de l'un que de l'autre
const MIN_PRONOUNS = 3
const PRONOUN_RATIO = 3
const PRONOUN_TEXT_LENGTH = 3000

// Les réglages propres à une franchise (pages prioritaires, plafond, catégorie) : « wikis » dans data/pixeldle-manual.json

// L'infobox d'une espèce donne l'espèce du personnage (« {{Yo-kai » : un Yo-kai)
const TEMPLATE_SPECIES: Record<string, string> = { 'yo-kai': 'Yōkai' }

function templateSpecies(wikitext: string): string | null {
  for (const [, name] of wikitext.matchAll(/\{\{\s*([^|{}\n]+?)\s*(?=[|\n}])/g)) {
    const species = TEMPLATE_SPECIES[name!.toLowerCase()]
    if (species)
      return species
    // L'infobox d'un personnage passe avant : un humain qui devient Yo-kai plus bas dans sa page reste humain
    if (/infobox|character|char\b|npc|person/i.test(name!))
      return null
  }
  return null
}

const cacheDir = new URL('../.cache/pixeldle/categories/', import.meta.url)
const cacheName = (api: string) => new URL(`${api.replace(/^https?:\/\//, '').replace(/[^a-z0-9.-]+/gi, '_')}.json`, cacheDir)

interface CategoryCache {
  root: string | null
  // page → longueur en octets
  pages: Record<string, number>
}

export interface WikiCharacter {
  title: string
  name: string
  length: number
  values: Partial<Record<EnrichKey, AttributeValue>>
  // les jeux cités par l'infobox : la 1re apparition d'abord, sinon toutes les apparitions. En dernier recours,
  // l'introduction de la page (« Skorge is the secondary antagonist of Gears of War 2 »).
  games: { first: string[], all: string[], intro?: string[] }
}

const MAX_INTRO_LENGTH = 1500

// « X is a Vietnam veteran who served… », « X was the princess of Guardia » : ce que le personnage est, sans la suite
const WHAT_HE_IS = /\b(?:is|was|serves as|served as|works as|worked as)\s+(?:(?:a|an|the|one of the|also|currently|formerly|now)\s+)*([^.;:,()"]+)/i
const END_OF_ROLE = /\s(?:who|that|which|whose|in|from|for|with|at|on|to|by|introduced|debuting|appearing|created|built|first|known|named|and the)\s.*$/i
const MAX_INTRO_SENTENCES = 2
// Pas un métier : un rôle dans l'histoire ou le jeu (« major character », « final boss »), un lien de famille (« son of »),
// un mot qui en contient un autre (« genetically-engineered » n'est pas un ingénieur, « android model » pas un mannequin)
const NOT_A_JOB = /\b(?:characters?|antagonists?|protagonists?|deuteragonists?|boss|bosses|villains?|companions?|npc|enem(?:y|ies)|all(?:y|ies)|sidekick|rival|romance|players?|skins?|heroe?s?|agent|member of the \w+ (?:clan|tribe)|(?:son|daughter|wife|husband|brother|sister|child|father|mother|friend|cousin|niece|nephew|grandson|granddaughter|clone|descendant|ancestor|reincarnation) of|engineered|model\w*|mannequin|factor|animatronics?|king of the hill|threats?)\b|^(?:given|taught|seen|located|found|known|named|featured|released|voiced)\b/i

// Ce que l'introduction dit du personnage, phrase par phrase (« Vietnam veteran », « princess of Guardia »),
// pour en tirer une occupation
export function introRoles(intro: string): string[] {
  const sentences = intro.split(/(?<=[.!?])\s+/).slice(0, MAX_INTRO_SENTENCES)
  return sentences.flatMap(sentence => {
    const role = WHAT_HE_IS.exec(sentence)?.[1]?.replace(END_OF_ROLE, '').trim()
    // Le filtre avant le découpage : « son of King X and Queen Y » part en entier
    return role && !NOT_A_JOB.test(role) ? role.split(/\s+and\s+/) : []
  }).filter(role => !NOT_A_JOB.test(role))
}

// Un compagnon ou un assistant, quand l'introduction le dit (« Epona is Link's horse », « Dog is Alyx's pet robot »,
// « ADA is the AI assistant ») : la fonction du personnage, pas un rôle d'histoire comme « possible companion »
const COMPANION = /'s\s+(?:[\w-]+\s+){0,3}(?:companion|sidekick|pet|steed|horse|mount|partner|dog|wolf|familiar)\b|\b(?:companion|sidekick|pet|steed|familiar) of\b/i
// « a "guide" », « as their guide », « Milton Library Assistant » : le nom, pas le verbe (« she will guide Stella »)
const ASSISTANT = /\b(?:a|an|the|their|his|her|its)\s+(?:[\w-]+\s+){0,2}["“]?(?:assistant|guide)\b|\b[A-Z]\w+ (?:Assistant|Guide)\b/
const NOT_ASSISTANT = /\bassistant (?:manager|director|professor)|guidebook/i

export function introFunction(intro: string, name = ''): 'Compagnon' | 'Assistant' | null {
  const sentences = intro.split(/(?<=[.!?])\s+/).slice(0, MAX_INTRO_SENTENCES)
  if (/^(?:assistant|guide)$/i.test(name) || sentences.some(sentence => ASSISTANT.test(sentence) && !NOT_ASSISTANT.test(sentence)))
    return 'Assistant'
  const roles = sentences.map(sentence => WHAT_HE_IS.exec(sentence)?.[1] ?? '')
  if (roles.some(role => COMPANION.test(role) && !/\b(?:possible|potential|recruitable|romance)/i.test(role)))
    return 'Compagnon'
  return null
}

// Le camp d'une entité (dieu, démon, ange) d'après son introduction : le dernier indice du début du texte gagne
// (« deuteragonist-turned-final antagonist » : hostile)
const ALIGNMENT_LENGTH = 300
const HOSTILE_HINT = /\b(?:antagonists?|villains?|final boss|evils?|destruction|destroy\w*|calamity|corrupt\w*|hatred|plague)\b/gi
const FRIENDLY_HINT = /\b(?:protagonists?|deuteragonists?|heroe?s?|ally|allies|saved|protectors?|guardians?|benevolent|good personality|patron)\b/gi

export function introAlignment(intro: string): 'hostile' | 'friendly' | null {
  const text = intro.slice(0, ALIGNMENT_LENGTH).replace(/neither good nor evil/gi, '')
  const last = (pattern: RegExp) => Math.max(-1, ...[...text.matchAll(pattern)].map(match => match.index!))
  const hostile = last(HOSTILE_HINT)
  const friendly = last(FRIENDLY_HINT)
  if (hostile < 0 && friendly < 0)
    return null
  return hostile > friendly ? 'hostile' : 'friendly'
}


export { DEVELOPMENT, textHair }

// L'introduction d'une page : le texte avant la 1re section, sans l'infobox ni les modèles
export function introText(wikitext: string): string {
  const body = wikitext.replace(/<!--[\s\S]*?-->/g, '').replace(/<ref[^>]*\/>|<ref[\s\S]*?<\/ref>/gi, '').split(/\n==/)[0]!
  return cleanValue(body).slice(0, MAX_INTRO_LENGTH)
}

const FIRST_GAME_FIELDS = ['first appearance', 'firstappearance', 'first appearances', 'first', 'debut', 'first game', 'introduced in', 'première apparition']
const GAMES_FIELDS = ['appearances', 'appearance', 'appears in', 'appearsin', 'games', 'game', 'apparitions']

const gameItems = (fields: Record<string, string> | null, names: string[]) =>
  names.flatMap(name => fields?.[name]?.split(/\s*(?:,|;|\n|•)\s*/) ?? []).map(item => item.replace(/\s*\([^)]*\)/g, '').replace(/['"*]/g, '').trim()).filter(Boolean)

// En minuscules, sans accents ni ponctuation sauf les « : » : « Dying Light 2: Stay Human » → « dying light 2: stay human »
// Sans apostrophes : « Mirror's Edge » est souvent écrit « Mirrors Edge » une fois l'italique ('') retiré
const words = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9:]+/g, ' ').replace(/\s*:/g, ':').trim()
// Les abréviations des wikis pour les jeux (« WL3 » sur le wiki de Wasteland)
const GAME_ABBREVIATIONS: Record<string, string> = {
  WL1: 'Wasteland', WL2: 'Wasteland 2', WL3: 'Wasteland 3',
  // Le modèle {{Games|…}} en haut des pages (les autres codes sont des romans et des BD)
  GOW1: 'Gears of War', GOW2: 'Gears of War 2', GOW3: 'Gears of War 3', GOWJ: 'Gears of War: Judgment', GOW4: 'Gears of War 4',
  G5: 'Gears 5', GOW5: 'Gears 5', TACTICS: 'Gears Tactics',
  Bio: 'BioShock', Bio2: 'BioShock 2', BioI: 'BioShock Infinite',
  III: 'Grand Theft Auto III', VC: 'Grand Theft Auto: Vice City', SA: 'Grand Theft Auto: San Andreas', LCS: 'Grand Theft Auto: Liberty City Stories',
}

// Les jeux du modèle {{Games|GOW1|GOW2}} ou {{Games|III=y|VC=y}}, en haut des pages de certains wikis
export function templateGames(wikitext: string): string[] {
  const items = wikitext.match(/\{\{\s*Games\s*\|([^}]*)\}\}/i)?.[1]?.split('|') ?? []
  return items.map(item => item.split('=')[0]!.trim()).filter(code => GAME_ABBREVIATIONS[code])
}
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Le 1er jeu cité parmi ceux de la franchise (`games` : leurs noms et leur année), null si aucun n'est reconnu. Le jeu
// entier, pour en prendre aussi le studio et les genres. Les titres sont cherchés dans le texte, souvent collés une fois
// les liens retirés (« Dying Light 2 Stay Human Dying Light: The Beast ») : « Dying Light » ne compte pas suivi d'un
// numéro ou d'un sous-titre (« 2 », « : The Beast »).
export function citedGame<T extends { names: string[], year: number | null }>(cited: WikiCharacter['games'], games: T[]): T | null {
  // `subtitles` : en dernier recours, « XCOM 2 » compte dans « XCOM 2: War of the Chosen » (une extension)
  const gameOf = (items: string[], subtitles: boolean) => {
    let text = ` ${items.map(item => GAME_ABBREVIATIONS[item] ?? item).map(words).join(' , ')} `
    const after = subtitles ? '(?![a-z0-9]|\\s+(?:\\d|[ivx]+\\b))' : '(?![a-z0-9]|:|\\s+(?:\\d|[ivx]+\\b))'
    // Les titres les plus longs d'abord, retirés du texte une fois trouvés : « Mirror's Edge » ne compte pas dans
    // « Mirror's Edge Catalyst »
    const titles = games.flatMap(game => game.names.map(name => ({ key: words(name), game })))
      .filter(({ key }) => key.length >= 3).toSorted((a, b) => b.key.length - a.key.length)
    const found: T[] = []
    for (const { key, game } of titles) {
      const replaced = text.replace(new RegExp(`(?<![a-z0-9:])${escape(key)}${after}`, 'g'), ' , ')
      if (replaced !== text && game.year)
        found.push(game)
      text = replaced
    }
    return found.toSorted((a, b) => a.year! - b.year!)[0] ?? null
  }
  // L'introduction en dernier : le plus ancien jeu cité, jamais avant le 1er jeu de la série (l'année par défaut)
  const intro = cited.intro ?? []
  return gameOf(cited.first, false) ?? gameOf(cited.all, false) ?? gameOf(cited.first, true) ?? gameOf(cited.all, true) ?? gameOf(intro, false)
}

// Les jeux cités par une page : l'infobox (1re apparition, apparitions), le modèle {{Games}}, l'introduction
export function pageGames(wikitext: string, fields: Record<string, string> | null = infobox(wikitext)): WikiCharacter['games'] {
  return {
    first: gameItems(fields, FIRST_GAME_FIELDS),
    all: [...gameItems(fields, GAMES_FIELDS), ...templateGames(wikitext)],
    intro: [introText(wikitext)],
  }
}

export function citedYear(cited: WikiCharacter['games'], games: { names: string[], year: number | null }[]): number | null {
  return citedGame(cited, games)?.year ?? null
}

// « Bayonetta (character) » → Bayonetta
// « BE2:Man » → Man (pages préfixées par le jeu, sur le wiki de Breathedge)
export const characterName = (title: string) => title.replace(/^[A-Z0-9]{2,5}:(?=\S)/, '').replace(/\s*\([^)]*\)\s*$/, '').trim()

export const isCharacterCategory = (title: string) => !SKIPPED_CATEGORY.test(title.replace(/^[^:]+:/, ''))
export const isCharacterPage = (title: string) => !SKIPPED_PAGE.test(title)

// Le sexe d'après les pronoms anglais du texte, sans les modèles, liens de fichiers et références
export function pronounGender(wikitext: string): 'Homme' | 'Femme' | null {
  let text = wikitext.replace(/<!--[\s\S]*?-->/g, '').replace(/<ref[^>]*\/>|<ref[\s\S]*?<\/ref>/gi, '')
  for (let i = 0; i < 3; i++)
    text = text.replace(/\{\{[^{}]*\}\}/g, '')
  // Le début du texte seulement : plus loin, la page parle souvent d'autres personnages
  text = text.replace(/\[\[(?:file|image):[^\]]*\]\]/gi, '').trim().slice(0, PRONOUN_TEXT_LENGTH)
  const count = (pattern: RegExp) => text.match(pattern)?.length ?? 0
  const male = count(/\b(?:he|him|his|himself)\b/gi)
  const female = count(/\b(?:she|her|hers|herself)\b/gi)
  // Un groupe (« The Employees are... they ») n'est pas un personnage
  if (count(/\b(?:they|them|their|themselves)\b/gi) >= Math.max(male, female))
    return null
  if (male >= MIN_PRONOUNS && male >= female * PRONOUN_RATIO)
    return 'Homme'
  if (female >= MIN_PRONOUNS && female >= male * PRONOUN_RATIO)
    return 'Femme'
  return null
}

async function members(api: string, category: string): Promise<{ pages: string[], categories: string[] }> {
  const pages: string[] = []
  const categories: string[] = []
  let next: string | undefined
  do {
    const data = await request(api, { action: 'query', list: 'categorymembers', cmtitle: `Category:${category}`, cmlimit: '500', cmnamespace: '0|14', ...next ? { cmcontinue: next } : {} })
    for (const { ns, title } of data?.query?.categorymembers ?? [])
      (ns === 14 ? categories : pages).push(title)
    next = data?.continue?.cmcontinue
  } while (next && pages.length < MAX_PAGES)
  return { pages, categories }
}

async function lengths(api: string, titles: string[]): Promise<Record<string, number>> {
  const result: Record<string, number> = {}
  for (let i = 0; i < titles.length; i += TITLES_PER_REQUEST) {
    const data = await request(api, { action: 'query', prop: 'info', titles: titles.slice(i, i + TITLES_PER_REQUEST).join('|') })
    for (const page of data?.query?.pages ?? []) {
      if (!page.missing)
        result[page.title] = page.length ?? 0
    }
  }
  return result
}

// Toutes les pages de la catégorie des personnages et de ses sous-catégories, avec leur longueur
async function characterPages(wiki: Wiki, category?: string): Promise<CategoryCache> {
  // Une catégorie choisie à la main a son propre cache
  const file = category ? new URL(cacheName(wiki.api).href.replace(/\.json$/, `.${category.replace(/[^a-z0-9]+/gi, '_')}.json`)) : cacheName(wiki.api)
  const cached = JSON.parse(await readFile(file, 'utf8').catch(() => 'null')) as CategoryCache | null
  if (cached)
    return cached
  let root: string | null = null
  const seen = new Set<string>()
  const titles = new Set<string>()
  for (const name of category ? [category] : ROOT_CATEGORIES) {
    const first = await members(wiki.api, name)
    if (first.pages.length === 0 && first.categories.length === 0)
      continue
    root = name
    let level = [{ name, ...first }]
    for (let depth = 0; level.length > 0 && depth <= MAX_DEPTH; depth++) {
      const nextLevel: typeof level = []
      for (const { pages, categories } of level) {
        for (const page of pages)
          titles.add(page)
        for (const category of categories) {
          const sub = category.replace(/^[^:]+:/, '')
          if (depth === MAX_DEPTH || seen.has(sub) || seen.size >= MAX_CATEGORIES || !isCharacterCategory(category) || titles.size >= MAX_PAGES)
            continue
          seen.add(sub)
          nextLevel.push({ name: sub, ...await members(wiki.api, sub) })
        }
      }
      level = nextLevel
    }
    break
  }
  const result = { root, pages: await lengths(wiki.api, [...titles].filter(isCharacterPage)) }
  await mkdir(cacheDir, { recursive: true })
  await writeFile(file, JSON.stringify(result))
  return result
}

// Le même personnage, nommé autrement par Wikidata ou un autre wiki : tous les mots de l'un sont dans l'autre
// (« Rockwell » et « Edmund Rockwell », « Corvo » et « Corvo Attano »). Pas entre les pages d'un même wiki, où ce sont
// des personnages différents (« Goal » et « Lady Goal » dans Deponia).
export function sameCharacter(a: string, b: string): boolean {
  const words = (name: string) => name.split(/[\s\-_.,'"]+/).map(normalize).filter(Boolean)
  const [short, long] = [words(a), words(b)].toSorted((x, y) => x.length - y.length)
  return short!.length > 0 && short!.every(word => long!.includes(word))
}

// La page entière (le cache des pages n'a que le début) : pour compter les pronoms quand le début est trop court
// (« Henry is the main character in Firewatch. », puis des sections)
const MAX_FULL_LENGTH = 30_000
export async function fullPages(api: string, titles: string[]): Promise<Record<string, string | null>> {
  const file = new URL(cacheName(api).href.replace(/\.json$/, '.full.json'))
  const cache = JSON.parse(await readFile(file, 'utf8').catch(() => '{}')) as Record<string, string | null>
  const missing = titles.filter(title => !(title in cache))
  for (let i = 0; i < missing.length; i += TITLES_PER_REQUEST) {
    const batch = missing.slice(i, i + TITLES_PER_REQUEST)
    const data = await request(api, { action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', titles: batch.join('|') })
    const pages = new Map<string, string>((data?.query?.pages ?? []).map((page: any) => [page.title, page.revisions?.[0]?.slots?.main?.content ?? null]))
    for (const title of batch)
      cache[title] = pages.get(title)?.slice(0, MAX_FULL_LENGTH) ?? null
  }
  if (missing.length > 0) {
    await mkdir(cacheDir, { recursive: true })
    await writeFile(file, JSON.stringify(cache))
  }
  return cache
}

// Jusqu'à `max` personnages du wiki, les plus longues pages d'abord, sans ceux déjà là (`known` : leurs noms et alias)
export async function wikiCharacters(wiki: Wiki, max: number, known: Set<string>, untranslated: Map<string, string[]>, skip: (name: string) => boolean = () => false, settings: WikiSettings = {}): Promise<{ root: string | null, found: number, chosen: WikiCharacter[] }> {
  const { root, pages: categoryPages } = await characterPages(wiki, settings.category)
  // Les pages données à la main (hors de la catégorie) passent en premier
  const pages = { ...categoryPages, ...settings.pages?.length ? await lengths(wiki.api, settings.pages) : {} }
  const preferred = [...settings.pages ?? [], ...settings.preferred ?? []]
  const rank = (title: string) => preferred.includes(title) ? preferred.indexOf(title) : preferred.length
  const sorted = Object.entries(pages).toSorted((a, b) => rank(a[0]) - rank(b[0]) || b[1] - a[1] || a[0].localeCompare(b[0]))
    // Une page donnée à la main n'est écartée que sur le nom exact (plus bas) : l'alias « Rune » d'Amicia de Rune
    // écarterait Hugo de Rune
    .filter(([title]) => preferred.includes(title) || ![...known].some(name => sameCharacter(name, characterName(title))))
  const chosen: WikiCharacter[] = []
  const names = new Set([...known].map(normalize))
  for (let start = 0; start < sorted.length && chosen.length < max; start += max * READ_FACTOR) {
    const batch = sorted.slice(start, start + max * READ_FACTOR)
    const texts = await fetchPages(wiki.api, batch.map(([title]) => title))
    // Les pages sans sexe dans l'infobox ni dans les pronoms du début : lues en entier. Un début vide (la page
    // commence par une section, « == Introduction == ») aussi.
    const short = batch.map(([title]) => title).filter(title => texts[title] !== undefined && !infobox(texts[title]!)?.gender && !pronounGender(texts[title]!))
    const full = short.length > 0 ? await fullPages(wiki.api, short) : {}
    for (const [title, length] of batch) {
      const text = texts[title] || full[title]
      const name = characterName(title)
      if (!text || names.has(normalize(name)) || skip(name))
        continue
      const fields = infobox(text)
      // Les valeurs non traduites ne comptent que pour les pages gardées (pas le « genre » d'un jeu)
      const pageUntranslated = new Map<string, string[]>()
      const values = fields ? infoboxValues(fields, pageUntranslated) : {}
      // Un personnage a un sexe (« Aucun » pour un robot) ; une espèce, un lieu ou un objet non
      if (values.gender !== undefined && !GENDERS.has(String(values.gender)))
        continue
      values.gender ??= pronounGender(text) ?? (full[title] ? pronounGender(full[title]!) : null)
      values.species ??= templateSpecies(text)
      // Une page choisie à la main est gardée même sans sexe trouvé (à compléter avec edit)
      if (!values.gender && !preferred.includes(title))
        continue
      for (const [key, list] of pageUntranslated)
        untranslated.set(key, [...untranslated.get(key) ?? [], ...list])
      names.add(normalize(name))
      chosen.push({ title, name, length, values, games: { ...pageGames(text, fields), intro: [introText(full[title] || text)] } })
      if (chosen.length === max)
        break
    }
  }
  return { root, found: Object.keys(pages).length, chosen }
}
