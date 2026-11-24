// Récupération Wikidata du Pixeldle : les jeux de chaque franchise, les personnages qui y sont reliés, et les infos des uns
// et des autres. Tout passe par SPARQL : l'API w/api.php freine après quelques requêtes. Réponses gardées dans
// .cache/pixeldle/ (hors git), enregistrées après chaque lot : un script interrompu reprend où il en était, une relance
// ne refait aucune requête. Pour tout retélécharger : supprimer le dossier.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { sleep } from './anilist.js'

const SPARQL = 'https://query.wikidata.org/sparql'
const USER_AGENT = 'quizdle-data/1.0'
const DELAY_MS = 500
const MAX_ATTEMPTS = 5
const ITEMS_PER_REQUEST = 200
// Les requêtes qui remontent les sous-classes (P279*) sont plus lourdes : des lots plus petits
const CLASSES_PER_REQUEST = 80

const VIDEO_GAME = 'Q7889'
const FICTIONAL_CHARACTER = 'Q95074'
const FICTIONAL_SPECIES = 'Q21192438'

// Les propriétés gardées sur un personnage
export const CHARACTER_PROPERTIES = {
  gender: 'P21',
  instanceOf: 'P31',
  nationality: 'P27',
  // lieu de naissance et de résidence : des lieux de plus pour la nationalité (Gensokyo, Kaer Morhen)
  birthplace: 'P19',
  residence: 'P551',
  occupation: 'P106',
  hair: 'P1884',
  firstAppearance: 'P4584',
  image: 'P18',
  fandom: 'P6262',
  franchise: 'P8345',
} as const
type CharacterProperty = keyof typeof CHARACTER_PROPERTIES

// Comment le personnage est relié à la franchise : P8345 (franchise), P1441 (présent dans l'œuvre), P674 (personnages
// du jeu), P4584 (1re apparition)
export type LinkKind = 'franchise' | 'work' | 'cast' | 'first'

export interface FranchiseData {
  // les jeux : ceux de la série (P179, sur deux niveaux : Mario Kart dans Mario), ceux de la franchise (P8345),
  // et l'élément lui-même si c'est un jeu (Elden Ring, Hollow Knight...)
  games: string[]
  // un lien par (personnage, jeu ou franchise, sorte de lien)
  links: { character: string, via: string, kind: LinkKind }[]
  // les classes (P31) de chaque élément relié : pour ne garder que les personnages
  types: Record<string, string[]>
}

export interface Character {
  id: string
  // mul : le nom commun à toutes les langues, que Wikidata met de plus en plus à la place du fr et de l'en (Atlus)
  labels: { fr?: string, en?: string, mul?: string }
  aliases: string[]
  // nombre de Wikipédias (et autres projets) qui ont une page dessus : la popularité
  sitelinks: number
  frwiki?: string
  enwiki?: string
  claims: Partial<Record<CharacterProperty, string[]>>
}

export interface Game {
  id: string
  isGame: boolean
  year: number | null
  developers: string[]
  genres: string[]
  // les séries, franchises et ensembles dont il fait partie (P179, P8345, P361, sur deux niveaux) : un film ou un dessin
  // animé de la franchise (Sonic 2, le film) n'en fait pas un invité
  parents: string[]
  sitelinks: number
}

export interface ClassInfo {
  // sous-classe de « personnage de fiction » (Q95074) : ses éléments sont des personnages
  character: boolean
  // une espèce de fiction (Hylien, Goron...) : donne l'espèce du personnage
  species: boolean
}

type Row = Record<string, string>

const cacheDir = new URL('../.cache/pixeldle/', import.meta.url)

async function readCache<T>(name: string): Promise<Record<string, T>> {
  const text = await readFile(new URL(`${name}.json`, cacheDir), 'utf8').catch(() => null)
  return text ? JSON.parse(text) as Record<string, T> : {}
}

const writeCache = (name: string, value: unknown) => writeFile(new URL(`${name}.json`, cacheDir), JSON.stringify(value))

// « http://www.wikidata.org/entity/Q42 » → Q42, « http://www.wikidata.org/prop/direct/P21 » → P21
const shortId = (value: string) => value.replace(/^http:\/\/www\.wikidata\.org\/(?:entity|prop\/direct)\//, '')

// Une requête SPARQL, avec reprise quand Wikidata nous freine (429, 5xx, ou une page d'erreur à la place du JSON)
export async function sparql(query: string): Promise<Row[]> {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(SPARQL, {
      method: 'POST',
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ query }),
    }).catch((error: unknown) => error as Error)
    const text = response instanceof Error ? null : await response.text()
    if (text && !(response instanceof Error) && response.ok && text.startsWith('{')) {
      await sleep(DELAY_MS)
      const json = JSON.parse(text) as { results: { bindings: Record<string, { value: string }>[] } }
      return json.results.bindings.map(binding => Object.fromEntries(Object.entries(binding).map(([key, { value }]) => [key, shortId(value)])))
    }
    const detail = response instanceof Error ? response.message : `${response.status} ${text?.slice(0, 200)}`
    if (attempt === MAX_ATTEMPTS)
      throw new Error(`Wikidata SPARQL : ${detail}`)
    const wait = 15_000 * attempt
    process.stdout.write(`\n  Wikidata nous freine (${detail.slice(0, 60)}), nouvel essai dans ${wait / 1000} s\n`)
    await sleep(wait)
  }
}

const values = (ids: readonly string[]) => ids.map(id => `wd:${id}`).join(' ')

function chunks<T>(list: readonly T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < list.length; i += size)
    result.push(list.slice(i, i + size))
  return result
}

// Les éléments pas encore en cache, récupérés par lots et enregistrés après chaque lot
async function cached<T>(name: string, ids: Iterable<string>, size: number, fetchBatch: (ids: string[]) => Promise<Record<string, T>>): Promise<Record<string, T>> {
  const cache = await readCache<T>(name)
  const missing = [...new Set(ids)].filter(id => !(id in cache))
  const batches = chunks(missing, size)
  for (const [index, batch] of batches.entries()) {
    process.stdout.write(`\rWikidata ${name} : ${index + 1}/${batches.length} lots`.padEnd(60))
    Object.assign(cache, await fetchBatch(batch))
    await writeCache(name, cache)
  }
  if (batches.length > 0)
    console.log()
  return cache
}

// --- Franchises ---

// `extraGames` : les jeux que Wikidata ne relie pas à la franchise (American McGee's Alice pour Alice: Madness Returns)
async function fetchFranchise(id: string, extraGames: string[]): Promise<FranchiseData> {
  const games = [...new Set([...(await sparql(`SELECT DISTINCT ?game WHERE {
    { VALUES ?game { wd:${id} } ?game wdt:P31/wdt:P279* wd:${VIDEO_GAME} }
    UNION { ?game wdt:P179 wd:${id} }
    UNION { ?game wdt:P179/wdt:P179 wd:${id} }
    UNION { ?game wdt:P8345 wd:${id} . ?game wdt:P31/wdt:P279* wd:${VIDEO_GAME} }
  }`)).map(row => row.game!), ...extraGames])]

  // La franchise elle-même, puis ses jeux par lots
  const rows: Row[] = await sparql(`SELECT DISTINCT ?character ?via ?kind ?type WHERE {
    VALUES ?via { wd:${id} }
    { ?character wdt:P8345 ?via . BIND("franchise" AS ?kind) } UNION { ?character wdt:P1441 ?via . BIND("work" AS ?kind) }
    OPTIONAL { ?character wdt:P31 ?type }
  }`)
  for (const batch of chunks(games, ITEMS_PER_REQUEST)) {
    rows.push(...await sparql(`SELECT DISTINCT ?character ?via ?kind ?type WHERE {
      VALUES ?via { ${values(batch)} }
      { ?character wdt:P1441 ?via . BIND("work" AS ?kind) }
      UNION { ?via wdt:P674 ?character . BIND("cast" AS ?kind) }
      UNION { ?character wdt:P4584 ?via . BIND("first" AS ?kind) }
      OPTIONAL { ?character wdt:P31 ?type }
    }`))
  }

  const links = new Map<string, FranchiseData['links'][number]>()
  const types: Record<string, string[]> = {}
  for (const { character, via, kind, type } of rows) {
    // les jeux de la série eux-mêmes (un remake « présent dans » l'original) ne sont pas des personnages
    if (!character || !/^Q\d+$/.test(character) || games.includes(character) || character === id)
      continue
    links.set(`${character} ${via} ${kind}`, { character, via: via!, kind: kind as LinkKind })
    if (type && /^Q\d+$/.test(type))
      types[character] = [...new Set([...types[character] ?? [], type])]
  }
  return { games, links: [...links.values()], types }
}

// Les données de chaque franchise, depuis le cache ou Wikidata (cache enregistré après chaque franchise)
export async function fetchFranchises(franchises: { title: string, wikidataId: string, games?: string[] }[]): Promise<Record<string, FranchiseData>> {
  await mkdir(cacheDir, { recursive: true })
  const cache = await readCache<FranchiseData>('franchises')
  for (const [index, { title, wikidataId, games = [] }] of franchises.entries()) {
    // En cache, sauf si on a ajouté des jeux à la main depuis
    if (wikidataId in cache && games.every(game => cache[wikidataId]!.games.includes(game)))
      continue
    process.stdout.write(`\rFranchises : ${index + 1}/${franchises.length} (${title})`.padEnd(70))
    cache[wikidataId] = await fetchFranchise(wikidataId, games)
    await writeCache('franchises', cache)
  }
  console.log()
  return cache
}

// --- Classes, personnages, jeux, noms ---

export function fetchClasses(ids: Iterable<string>): Promise<Record<string, ClassInfo>> {
  return cached('classes', ids, CLASSES_PER_REQUEST, async batch => {
    const rows = await sparql(`SELECT ?class ?character ?species WHERE {
      VALUES ?class { ${values(batch)} }
      BIND(EXISTS { ?class wdt:P279* wd:${FICTIONAL_CHARACTER} } AS ?character)
      BIND(EXISTS { ?class wdt:P31/wdt:P279* wd:${FICTIONAL_SPECIES} } AS ?species)
    }`)
    return Object.fromEntries(rows.map(row => [row.class!, { character: row.character === 'true', species: row.species === 'true' }]))
  })
}

// « https://fr.wikipedia.org/wiki/Link_(personnage) » → « Link (personnage) »
const articleTitle = (url: string | undefined) => url ? decodeURIComponent(url.split('/wiki/')[1] ?? '').replace(/_/g, ' ') : undefined

export function fetchCharacters(ids: Iterable<string>): Promise<Record<string, Character>> {
  return cached('characters', ids, ITEMS_PER_REQUEST, async batch => {
    const characters: Record<string, Character> = Object.fromEntries(batch.map(id => [id, { id, labels: {}, aliases: [], sitelinks: 0, claims: {} }]))
    const properties = Object.fromEntries(Object.entries(CHARACTER_PROPERTIES).map(([key, property]) => [property, key as CharacterProperty]))
    const claims = await sparql(`SELECT ?item ?property ?value WHERE {
      VALUES ?item { ${values(batch)} }
      VALUES ?property { ${Object.values(CHARACTER_PROPERTIES).map(property => `wdt:${property}`).join(' ')} }
      ?item ?property ?value
    }`)
    for (const { item, property, value } of claims) {
      const key = properties[property!]
      const list = (characters[item!]!.claims[key!] ??= [])
      if (!list.includes(value!))
        list.push(value!)
    }
    const names = await sparql(`SELECT ?item ?kind ?language ?name WHERE {
      VALUES ?item { ${values(batch)} }
      { ?item rdfs:label ?name . BIND("label" AS ?kind) } UNION { ?item skos:altLabel ?name . BIND("alias" AS ?kind) }
      FILTER(LANG(?name) IN ("fr", "en", "mul"))
      BIND(LANG(?name) AS ?language)
    }`)
    for (const { item, kind, language, name } of names) {
      const character = characters[item!]!
      if (kind === 'label')
        character.labels[language as 'fr' | 'en' | 'mul'] = name!
      else if (!character.aliases.includes(name!))
        character.aliases.push(name!)
    }
    const links = await sparql(`SELECT ?item ?sitelinks ?fr ?en WHERE {
      VALUES ?item { ${values(batch)} }
      ?item wikibase:sitelinks ?sitelinks .
      OPTIONAL { ?fr schema:about ?item ; schema:isPartOf <https://fr.wikipedia.org/> }
      OPTIONAL { ?en schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> }
    }`)
    for (const { item, sitelinks, fr, en } of links) {
      const character = characters[item!]!
      character.sitelinks = Number(sitelinks)
      character.frwiki = articleTitle(fr)
      character.enwiki = articleTitle(en)
    }
    return characters
  })
}

export function fetchGames(ids: Iterable<string>): Promise<Record<string, Game>> {
  return cached('games', ids, ITEMS_PER_REQUEST, async batch => {
    const games: Record<string, Game> = Object.fromEntries(batch.map(id => [id, { id, isGame: false, year: null, developers: [], genres: [], parents: [], sitelinks: 0 }]))
    const claims = await sparql(`SELECT ?item ?property ?value WHERE {
      VALUES ?item { ${values(batch)} }
      VALUES ?property { wdt:P577 wdt:P178 wdt:P136 }
      ?item ?property ?value
    }`)
    for (const { item, property, value } of claims) {
      const game = games[item!]!
      if (property === 'P577') {
        const year = Number(value!.slice(0, 4))
        if (year > 1900 && (game.year === null || year < game.year))
          game.year = year
      } else {
        const list = property === 'P178' ? game.developers : game.genres
        if (/^Q\d+$/.test(value!) && !list.includes(value!))
          list.push(value!)
      }
    }
    const parents = await sparql(`SELECT DISTINCT ?item ?parent WHERE {
      VALUES ?item { ${values(batch)} }
      ?item (wdt:P179|wdt:P8345|wdt:P361)/(wdt:P179|wdt:P8345|wdt:P361)? ?parent
    }`)
    for (const { item, parent } of parents) {
      if (/^Q\d+$/.test(parent!))
        games[item!]!.parents.push(parent!)
    }
    const info = await sparql(`SELECT ?item ?sitelinks ?isGame WHERE {
      VALUES ?item { ${values(batch)} }
      OPTIONAL { ?item wikibase:sitelinks ?sitelinks }
      BIND(EXISTS { ?item wdt:P31/wdt:P279* wd:${VIDEO_GAME} } AS ?isGame)
    }`)
    for (const { item, sitelinks, isGame } of info) {
      games[item!]!.sitelinks = Number(sitelinks ?? 0)
      games[item!]!.isGame = isGame === 'true'
    }
    return games
  })
}

// Le nom FR (sinon EN) de chaque élément. null : aucun des deux.
export function fetchLabels(ids: Iterable<string>): Promise<Record<string, string | null>> {
  return cached('labels', ids, ITEMS_PER_REQUEST, async batch => {
    const rows = await sparql(`SELECT ?item ?fr ?en ?mul WHERE {
      VALUES ?item { ${values(batch)} }
      OPTIONAL { ?item rdfs:label ?fr FILTER(LANG(?fr) = "fr") }
      OPTIONAL { ?item rdfs:label ?en FILTER(LANG(?en) = "en") }
      OPTIONAL { ?item rdfs:label ?mul FILTER(LANG(?mul) = "mul") }
    }`)
    const labels: Record<string, string | null> = Object.fromEntries(batch.map(id => [id, null]))
    for (const { item, fr, en, mul } of rows)
      labels[item!] = fr ?? en ?? mul ?? null
    return labels
  })
}

// Le nom anglais d'abord : pour les lieux de naissance et de résidence, que la nationalité garde en anglais (London, pas Londres)
export function fetchEnglishLabels(ids: Iterable<string>): Promise<Record<string, string | null>> {
  return cached('labels-en', ids, ITEMS_PER_REQUEST, async batch => {
    const rows = await sparql(`SELECT ?item ?fr ?en ?mul WHERE {
      VALUES ?item { ${values(batch)} }
      OPTIONAL { ?item rdfs:label ?fr FILTER(LANG(?fr) = "fr") }
      OPTIONAL { ?item rdfs:label ?en FILTER(LANG(?en) = "en") }
      OPTIONAL { ?item rdfs:label ?mul FILTER(LANG(?mul) = "mul") }
    }`)
    const labels: Record<string, string | null> = Object.fromEntries(batch.map(id => [id, null]))
    for (const { item, fr, en, mul } of rows)
      labels[item!] = en ?? mul ?? fr ?? null
    return labels
  })
}

// Tous les noms FR et EN de chaque élément, alias compris : pour reconnaître un jeu cité par un wiki (« Far Cry 3 »)
export function fetchNames(ids: Iterable<string>): Promise<Record<string, string[]>> {
  return cached('names', ids, ITEMS_PER_REQUEST, async batch => {
    const rows = await sparql(`SELECT ?item ?name WHERE {
      VALUES ?item { ${values(batch)} }
      { ?item rdfs:label ?name } UNION { ?item skos:altLabel ?name }
      FILTER(LANG(?name) IN ("fr", "en", "mul"))
    }`)
    const names: Record<string, string[]> = Object.fromEntries(batch.map(id => [id, []]))
    for (const { item, name } of rows) {
      if (name && !names[item!]!.includes(name))
        names[item!]!.push(name)
    }
    return names
  })
}

// Le wiki Fandom que Wikidata donne à un élément (P4073 : « zelda », « fr.zelda »)
export function fetchFandomWikiIds(ids: Iterable<string>): Promise<Record<string, string[]>> {
  return cached('fandom-wiki-ids', ids, ITEMS_PER_REQUEST, async batch => {
    const rows = await sparql(`SELECT ?item ?wiki WHERE {
      VALUES ?item { ${values(batch)} }
      ?item wdt:P4073 ?wiki
    }`)
    const wikis: Record<string, string[]> = Object.fromEntries(batch.map(id => [id, []]))
    for (const { item, wiki } of rows)
      wikis[item!]!.push(wiki!)
    return wikis
  })
}
