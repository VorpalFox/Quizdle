// Complète les personnages du Pixeldle avec l'infobox de leur page sur les wikis de leur franchise (voir pixeldleWikis.ts) :
// sexe, espèce, nationalité, occupation, cheveux. Les wikis sont interrogés dans l'ordre choisi pour la franchise :
// chacun ne remplit que les champs restés vides.
// La page d'un personnage : son lien Fandom de Wikidata (P6262) vers ce wiki s'il existe, sinon son nom anglais, son
// nom, ses alias. 50 titres par requête, réponses gardées dans .cache/pixeldle/pages/ (hors git).
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { normalize } from '../src/engine/search.js'
import type { AttributeValue, Entry } from '../src/engine/types.js'
import { sleep, splitOccupations } from './anilist.js'
import { templateFields } from './fandom.js'
import { translateOccupation as englishOccupation } from './translate.js'
import { cleanValue, wikiGender, wikiHair } from './wikipedia.js'
import { translateGender, translateOccupation, translatePlace, translateSpecies, weaponOccupations } from './pixeldleTranslate.js'
import type { FranchiseWikis, Wiki } from './pixeldleWikis.js'

const USER_AGENT = 'quizdle-data/1.0'
const TITLES_PER_REQUEST = 50
const DELAY_MS = 500
const MAX_ATTEMPTS = 5
// On ne garde que le début de la page : l'infobox est en haut
const MAX_CACHED_LENGTH = 15_000
const MAX_TITLES = 6
// Les lieux d'un personnage : ville, région, pays, monde
const MAX_PLACES = 4

// Les noms des champs, en minuscules et sans « _ ». Dans l'ordre : le 1er présent gagne.
const FIELDS = {
  gender: ['gender', 'sex', 'sexe', 'genre', 'pronoun', 'pronouns'],
  species: ['species', 'race', 'espèce', 'species/race', 'kind', 'creature'],
  // Les champs « pays » : la nationalité, le pays, la région ou le monde d'origine
  nationality: ['nationality', 'nation', 'citizenship', 'country', 'homeland', 'homeworld', 'home world', 'homeworlds', 'homeworld(s)', 'homeworld(s):', 'homeplanet', 'home planet', 'planet', 'nation of origin', 'country of origin', 'region'],
  // Les champs « lieu » : une ville réelle est ramenée à son pays (CITIES dans pixeldleTranslate.ts)
  place: ['originplace', 'origin', 'hometown', 'home', 'birthplace', 'place of birth', 'born in', 'town', 'residence', 'residency'],
  // La naissance : une date, parfois suivie du lieu (« October 25, 1379, Vigrid »)
  birth: ['born', 'birth'],
  // Où on croise le personnage : en dernier recours, faute de mieux (« Diamond City », « Snowdin »)
  location: ['location', 'located in', 'world'],
  occupation: ['occupation', 'occupations', 'occupation(s)', 'occupation:', 'profession', 'professions', 'job', 'jobs', 'career', 'role'],
  // Le grade ou la classe, faute d'occupation
  rank: ['rank', 'class', 'position'],
  // Le comportement d'une créature envers le joueur (« Hostile » sur le wiki Minecraft)
  behavior: ['behavior', 'behaviour', 'temperament', 'disposition', 'aggression', 'hostility'],
  // Les armes : comment le personnage se bat (Épéiste, Tireur…), ajouté à son occupation
  weapon: ['weapon', 'weapons', 'weapon(s)', 'equipment', 'armament'],
  hair: ['hair', 'hair color', 'hair colour', 'haircolor', 'hair colors', 'haircolour', 'cheveux'],
} as const
export type EnrichKey = Exclude<keyof typeof FIELDS, 'place' | 'birth' | 'location' | 'rank' | 'behavior'>
const PREDATOR = 'Prédateur'
const HOSTILE = /^(?:hostile|aggressive|predatory)/i
const MAX_LOCATIONS = 2
// Ce qui date une naissance, pas un lieu : « circa », « 19th Century », « October 25 », une année
const NOT_BIRTHPLACE = /\d|\b(?:circa|c\.|centur(?:y|ies)|before|after|between|early|late|mid|unknown|january|february|march|april|may|june|july|august|september|october|november|december)\b/i
export const ENRICH_KEYS: EnrichKey[] = ['gender', 'species', 'nationality', 'occupation', 'hair']

// Un champ en anglais sans valeur utile
const EMPTY = /^(?:unknown|none|n\/a|varies|various|unnamed|\?+|-+|—|tba|tbd)$/i

const cacheDir = new URL('../.cache/pixeldle/pages/', import.meta.url)
const cacheName = (api: string) => new URL(`${api.replace(/^https?:\/\//, '').replace(/[^a-z0-9.-]+/gi, '_')}.json`, cacheDir)

type Pages = Record<string, string | null>

export async function request(api: string, params: Record<string, string>): Promise<any | null> {
  const url = `${api}?${new URLSearchParams({ ...params, format: 'json', formatversion: '2' })}`
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } }).catch(() => null)
    const text = response ? await response.text() : ''
    if (response?.ok && text.startsWith('{'))
      return JSON.parse(text)
    if (response?.status === 404)
      return null
    if (attempt === MAX_ATTEMPTS) {
      console.log(`\n  ${api} : ${response?.status ?? 'pas de réponse'}, abandonné`)
      return null
    }
    const wait = 15_000 * attempt
    process.stdout.write(`\n  ${new URL(api).host} nous freine (${response?.status ?? 'réseau'}), nouvel essai dans ${wait / 1000} s\n`)
    await sleep(wait)
  }
}

// Le début de ces pages (section 0), en suivant les redirections, depuis le cache ou par lots de 50
export async function fetchPages(api: string, titles: string[]): Promise<Pages> {
  const file = cacheName(api)
  const cache = JSON.parse(await readFile(file, 'utf8').catch(() => '{}')) as Pages
  const missing = [...new Set(titles)].filter(title => !(title in cache))
  for (let i = 0; i < missing.length; i += TITLES_PER_REQUEST) {
    const batch = missing.slice(i, i + TITLES_PER_REQUEST)
    const data = await request(api, { action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', rvsection: '0', redirects: '1', titles: batch.join('|') })
    if (!data)
      break
    const renamed = new Map<string, string>([...data.query?.normalized ?? [], ...data.query?.redirects ?? []].map(({ from, to }: { from: string, to: string }) => [from, to]))
    const pages = new Map<string, string | null>((data.query?.pages ?? []).map((page: any) => [page.title, page.revisions?.[0]?.slots?.main?.content ?? null]))
    for (const title of batch) {
      let current = title
      for (let hops = 0; renamed.has(current) && hops < 3; hops++)
        current = renamed.get(current)!
      cache[title] = pages.get(current)?.slice(0, MAX_CACHED_LENGTH) ?? null
    }
    await writeFile(file, JSON.stringify(cache))
    await sleep(DELAY_MS)
  }
  return cache
}

// Les champs de la 1re infobox de la page qui a au moins un champ qu'on cherche
export function infobox(wikitext: string): Record<string, string> | null {
  const text = stripImages(wikitext.replace(/<!--[\s\S]*?-->/g, '').replace(/<ref[^>]*\/>|<ref[\s\S]*?<\/ref>/gi, ''))
  const wanted = Object.values(FIELDS).flat() as string[]
  for (const match of text.matchAll(/\{\{\s*[^|{}\n]*(?:infobox|character|char\b|charbox|charinfo|person|npc|champion|bio|hero|villain|summary)[^|{}\n]*/gi)) {
    const fields = templateFields(text, match.index!)
    if (wanted.some(name => fields[name]))
      return fields
  }
  // Une infobox au nom propre au wiki (« {{Forgotling », « {{Yo-kai ») : reconnue à son champ sexe ou espèce
  const core = [...FIELDS.gender, ...FIELDS.species].filter(name => name !== 'genre')
  for (const match of text.matchAll(/\{\{\s*[^|{}\n]+/g)) {
    const fields = templateFields(text, match.index!)
    if (core.some(name => fields[name]))
      return fields
  }
  return null
}

// Les images et les drapeaux devant les valeurs (« [[File:Flag of Japan.svg|border|25px]] Japanese », « {{flag|ch}} Swiss ») :
// sans ça, cleanValue garde la légende de l'image (« Border|25px Japan », « 20px Human »)
export function stripImages(text: string): string {
  return text
    .replace(/\[\[\s*(?:file|image|fichier)\s*:[^[\]]*(?:\[\[[^\]]*\]\][^[\]]*)*\]\]/gi, '')
    .replace(/\{\{\s*(?:flag|flagicon|flagdeco|flag icon)\s*\|[^{}]*\}\}/gi, '')
}

// Mortal Kombat découpe ses valeurs par chronologie (« 1st Timeline: Edenian, 3rd Timeline: Human ») : on retire les
// préfixes, la 1re valeur reste
export function stripTimelines(value: string): string {
  return value.replace(/[^,:]*timelines?\s*:\s*/gi, '').replace(/(?:\s*,\s*)+/g, ', ').replace(/^[\s,]+|[\s,]+$/g, '')
}

const present = (fields: Record<string, string>, names: readonly string[]) =>
  names.map(name => fields[name] === undefined ? undefined : stripTimelines(fields[name]!)).filter((value): value is string => Boolean(value) && !EMPTY.test(value!))

const first = (fields: Record<string, string>, names: readonly string[]) => present(fields, names)[0] ?? null

// Le 1er élément d'une liste, sans parenthèses : « Human (formerly), Vampire » → Human
const firstItem = (value: string) => value.replace(/\s*\([^)]*\)/g, '').split(/\s*(?:,|;|\/|\bor\b)\s*/)[0]!.trim()

// « She/Her », « m », « Male (formerly) »
export function parseGender(value: string): string | null | undefined {
  const known = wikiGender(firstItem(value))
  if (known)
    return known
  const key = value.toLowerCase().trim()
  if (/player|customi[sz]able|\bchoice\b|chosen|^determin|user[- ]defined/.test(key))
    return 'Au choix'
  if (/^unspecified|^not specified|^dependent/.test(key))
    return null
  // Sans sexe (robots, objets, entités) : « N/A (Programmed as male) », « Genderless, referred to as female », même si on
  // en parle au masculin ou au féminin. « Autre » est pour les personnages non-binaires.
  if (/^(?:n\/a|none|genderless|sexless|no gender|not applicable|asexual|it\b)/.test(key))
    return 'Aucun'
  if (/referred to as (?:female|"?she)|feminine programm?ing|female persona/.test(key))
    return 'Femme'
  if (/referred to as (?:male|"?he\b)|masculine personality|male programm?ing/.test(key))
    return 'Homme'
  if (/^(?:f|she|her|feminine|girl|lady)\b/.test(key))
    return 'Femme'
  if (/^(?:m|he|him|masculine|boy)\b/.test(key))
    return 'Homme'
  if (/^(?:they|agender|non-?binary|x\b|x-gender|intersex)\b/.test(key))
    return 'Autre'
  // La valeur entière d'abord : « Left 4 Dead, Male, Left 4 Dead 2, Male or Female » n'est pas tranché
  return translateGender([value, firstItem(value)])
}

export function parseSpecies(value: string): string | null | undefined {
  const item = firstItem(value)
  return item ? translateSpecies(item) : null
}

// Les lieux d'une valeur. « Dragon Age II: » (un jeu, sans lieu derrière) est retiré ; « Koopa Kingdom: 48 Lava
// Cul-De-Sac » garde ce qui précède les « : »
// « B-K: Spiral Mountain » (le jeu en abrégé devant) → Spiral Mountain ; « # Wailing Dunes » → Wailing Dunes
const parts = (value: string) => value.replace(/\s*\([^)]*\)/g, '').split(/\s*(?:,|;|\/|\bor\b)\s*/)
  .filter(part => !part.trim().endsWith(':'))
  .map(part => part.replace(/^[\s#*]+/, '').replace(/^[A-Z0-9-]{1,5}:\s*/, '').split(':')[0]!.trim()).filter(Boolean)

// Un champ « pays » ou « lieu » : tous ses lieux, pour donner un max d'indices (« Pallet Town, Kanto » : les deux ;
// « Arcadia Bay, Oregon, United States » → Arcadia Bay, Oregon, États-Unis)
export function parsePlaces(value: string): string[] {
  const places = parts(value).filter(place => place.length <= 40 && !EMPTY.test(place))
  return [...new Set(places.flatMap(translatePlace))]
}

// Le lieu d'une date de naissance : « October 25, 1379, Vigrid » → Vigrid, « circa, 1852 » → rien
export function birthPlaces(value: string): string[] {
  return parsePlaces(parts(value).filter(part => !NOT_BIRTHPLACE.test(part)).join(', '))
}

// Nos règles d'abord, sur la valeur anglaise (« Bartender » → Serveur), puis le dictionnaire du Weebdle, dont la
// traduction repasse par nos règles pour rejoindre nos familles. undefined : pas traduite (laissée de côté).
export function parseOccupation(raw: string): string | null | undefined {
  const ours = translateOccupation(raw)
  if (ours !== undefined)
    return ours
  const french = englishOccupation(raw)
  return french === null || french === undefined ? french : translateOccupation(french) ?? french
}

export function parseOccupations(value: string): string[] {
  return (splitOccupations(value) ?? []).map(parseOccupation).filter((value): value is string => typeof value === 'string')
}

export interface EnrichTarget {
  entry: Entry
  franchise: string
  // P6262 : « mario:Luigi », « fr.mario:Luigi »
  fandomLinks: string[]
  // Les noms à essayer, dans l'ordre : nom anglais, nom, alias
  names: string[]
}

export interface EnrichReport {
  entries: Entry[]
  // par wiki : personnages trouvés, champs remplis
  byWiki: Map<string, { found: number, filled: Record<string, number> }>
  // les valeurs que les tables ne savent pas traduire, par indice
  untranslated: Map<string, string[]>
  // les champs des infobox rencontrées (pour ajouter des noms dans FIELDS)
  fieldNames: Map<string, number>
  details: string[]
  // les pages qui sont peut-être celles d'un autre personnage
  doubtful: string[]
  // id → texte de la 1re page trouvée
  pageTexts: Map<string, string>
  // id → le wiki et le titre de cette page, pour la relire en entier (cheveux)
  pageRefs: Map<string, { api: string, title: string }>
}

// Les franchises dont le wiki couvre d'autres séries (Megami Tensei pour Persona) : un nom peut y être celui d'un
// personnage d'une autre série. Avec les autres noms de la franchise que ses pages citent à la place de son titre.
const SHARED_WIKIS: Record<string, string[]> = {
  'Persona': [],
  'Tales of': [],
  'Like a Dragon': ['Yakuza'],
  'Hogwarts Legacy': ['Harry Potter', 'Hogwarts', 'Wizarding World'],
  'The King of Fighters': ['King of Fighters', 'KOF', 'Fatal Fury', 'Art of Fighting', 'Samurai Shodown', 'Psycho Soldier', 'Ikari'],
  'Metaphor: ReFantazio': ['Metaphor'],
}

// La page parle-t-elle de la franchise ? Son titre, ou un de ses autres noms
export function mentionsFranchise(page: string, franchise: string): boolean {
  const text = normalize(page)
  return [franchise, ...SHARED_WIKIS[franchise] ?? []].some(name => text.includes(normalize(name)))
}

const isEmpty = (value: AttributeValue | undefined) => value === null || value === undefined

// Les lieux déjà là, plus ceux du wiki qui manquent (sans tenir compte de la casse) : [["nationality", lieux]] s'il y
// en a de nouveaux, [] sinon
export function morePlaces(current: AttributeValue | undefined, found: string[]): [string, string[]][] {
  const known = isEmpty(current) ? [] : Array.isArray(current) ? current as string[] : [String(current)]
  const keys = new Set(known.map(normalize))
  const added = found.filter(place => !keys.has(normalize(place)))
  return added.length > 0 ? [['nationality', [...known, ...added].slice(0, MAX_PLACES)]] : []
}

const wikiLabel = (wiki: Wiki) => wiki.api.includes('.fandom.com') ? wiki.id : new URL(wiki.api).host

// Le nom de la page sur ce wiki d'après les liens Fandom de Wikidata (« mario:Luigi » pour mario.fandom.com)
function linkedTitle(wiki: Wiki, links: string[]): string | null {
  if (!wiki.api.includes('.fandom.com'))
    return null
  const link = links.find(value => value.split(':')[0]!.toLowerCase() === wiki.id.toLowerCase())
  return link ? decodeURIComponent(link.split(':').slice(1).join(':')).replace(/_/g, ' ') : null
}

// Une page d'homonymie (« Alena » sur le wiki Dragon Quest) : ses liens « Alena (…) », ceux qui citent la franchise
// d'abord (« Alena (Dragon Quest IV) »), puis « (character) », sans les adaptations (manga, anime, film…)
const MAX_DISAMBIGUATION_TITLES = 3
const ADAPTATION = /manga|anime|film|movie|tv|series|comic|novel|book|card|item|weapon|location/i
export function disambiguationTitles(page: string, name: string, franchise: string): string[] {
  if (!/\{\{\s*disambig|may refer to/i.test(page))
    return []
  const links = [...page.matchAll(/\[\[([^\]|#]+)(?:\|[^\]]*)?\]\]/g)].map(match => match[1]!.trim().replace(/_/g, ' '))
  const rank = (qualifier: string) => mentionsFranchise(qualifier, franchise) ? 0 : /character/i.test(qualifier) ? 1 : 2
  return [...new Set(links)]
    .map(title => ({ title, match: /^(.+?)\s*\(([^)]+)\)\s*$/.exec(title) }))
    .filter(({ match }) => match !== null && normalize(match[1]!) === normalize(name) && !ADAPTATION.test(match[2]!))
    .map(({ title, match }) => ({ title, qualifier: match![2]! }))
    .sort((a, b) => rank(a.qualifier) - rank(b.qualifier))
    .map(({ title }) => title)
    .slice(0, MAX_DISAMBIGUATION_TITLES)
}

function titlesFor(target: EnrichTarget, wiki: Wiki): string[] {
  const linked = linkedTitle(wiki, target.fandomLinks)
  const names = target.names.filter(name => /[a-z]/i.test(name) && name.length >= 2 && !/[#<>[\]{}|]/.test(name))
  return [...new Set([...(linked ? [linked] : []), ...names])].slice(0, MAX_TITLES)
}

// Les valeurs trouvées dans une infobox, null si la valeur n'est pas utile, undefined si on ne sait pas la traduire
export function infoboxValues(fields: Record<string, string>, untranslated: Map<string, string[]>): Partial<Record<EnrichKey, AttributeValue>> {
  const note = (key: string, raw: string) => untranslated.set(key, [...untranslated.get(key) ?? [], raw])
  const result: Partial<Record<EnrichKey, AttributeValue>> = {}

  const gender = first(fields, FIELDS.gender)
  if (gender) {
    // Pas reconnu : gardé tel quel
    const parsed = parseGender(gender)
    if (parsed === undefined) {
      note('gender', gender)
      result.gender = firstItem(gender)
    } else if (parsed) {
      result.gender = parsed
    }
  }
  const species = first(fields, FIELDS.species)
  if (species) {
    const parsed = parseSpecies(species)
    if (parsed === undefined) {
      note('species', firstItem(species))
      result.species = firstItem(species)
    } else if (parsed) {
      result.species = parsed
    }
  }
  // Tous les champs « pays » et « lieu » s'additionnent : « Pallet Town » (hometown) et « Kanto » (region)
  // Le lieu de naissance d'abord, puis les champs « lieu » et « pays ». Sinon, en dernier recours, là où on le croise.
  const raw = [...present(fields, FIELDS.place), ...present(fields, FIELDS.nationality)]
  const found = [...present(fields, FIELDS.birth).flatMap(birthPlaces), ...raw.flatMap(parsePlaces)]
  const places = [...new Set(found.length > 0 ? found : present(fields, FIELDS.location).flatMap(parsePlaces).slice(0, MAX_LOCATIONS))].slice(0, MAX_PLACES)
  if (places.length > 0)
    result.nationality = places
  const occupation = first(fields, FIELDS.occupation)
  if (occupation) {
    const parsed = parseOccupations(occupation)
    for (const raw of splitOccupations(occupation) ?? []) {
      if (parseOccupation(raw) === undefined)
        note('occupation', raw)
    }
    if (parsed.length > 0)
      result.occupation = [...new Set(parsed)].slice(0, 3)
  }
  // Sans champ occupation : le grade ou la classe (« Commander », « Mage »), seulement ce qu'on sait traduire
  const rank = occupation ? null : first(fields, FIELDS.rank)
  const ranks = rank ? parseOccupations(rank) : []
  if (ranks.length > 0)
    result.occupation = [...new Set(ranks)].slice(0, 2)
  // Une créature hostile au joueur, sans métier : Prédateur
  const behavior = first(fields, FIELDS.behavior)
  if (!result.occupation && behavior && HOSTILE.test(firstItem(behavior)))
    result.occupation = [PREDATOR]
  const weapons = [...new Set(present(fields, FIELDS.weapon).flatMap(weaponOccupations))]
  if (weapons.length > 0)
    result.weapon = weapons
  const hair = first(fields, FIELDS.hair)
  if (hair) {
    const parsed = wikiHair(hair)
    if (parsed)
      result.hair = parsed
  }
  return result
}

export async function enrichFromWikis(targets: EnrichTarget[], wikis: Map<string, FranchiseWikis>): Promise<EnrichReport> {
  await mkdir(cacheDir, { recursive: true })
  const current = new Map(targets.map(target => [target, target.entry]))
  const byWiki: EnrichReport['byWiki'] = new Map()
  const untranslated = new Map<string, string[]>()
  const fieldNames = new Map<string, number>()
  const details: string[] = []
  const doubtful: string[] = []
  const pageTexts = new Map<string, string>()
  const pageRefs = new Map<string, { api: string, title: string }>()

  // Passe par passe : 1er wiki de chaque franchise, puis le 2e pour ce qui reste vide, etc.
  const maxOrder = Math.max(0, ...[...wikis.values()].map(({ order }) => order.length))
  for (let rank = 0; rank < maxOrder; rank++) {
    const byApi = new Map<string, { wiki: Wiki, targets: EnrichTarget[] }>()
    for (const target of targets) {
      const wiki = wikis.get(target.franchise)?.order[rank]
      // Au 1er wiki, toujours : la nationalité s'additionne (le pays de Wikidata, la ville et la région du wiki)
      if (!wiki || rank > 0 && !ENRICH_KEYS.some(key => isEmpty(current.get(target)!.attributes[key])))
        continue
      const group = byApi.get(wiki.api) ?? { wiki, targets: [] }
      group.targets.push(target)
      byApi.set(wiki.api, group)
    }
    let done = 0
    for (const { wiki, targets: group } of byApi.values()) {
      process.stdout.write(`\rWikis, passe ${rank + 1} : ${++done}/${byApi.size} (${wikiLabel(wiki)})`.padEnd(80))
      const firstPages = await fetchPages(wiki.api, group.flatMap(target => titlesFor(target, wiki)))
      // Pas d'infobox, mais une page d'homonymie : on essaie ses liens vers le bon personnage
      const followed = new Map<EnrichTarget, string[]>()
      for (const target of group) {
        const titles = titlesFor(target, wiki)
        if (titles.some(title => firstPages[title] && infobox(firstPages[title]!)))
          continue
        const more = titles.flatMap(title => firstPages[title] ? disambiguationTitles(firstPages[title]!, title, target.franchise) : [])
        if (more.length > 0)
          followed.set(target, more)
      }
      const pages = followed.size > 0 ? await fetchPages(wiki.api, [...followed.values()].flat()) : firstPages
      const stats = byWiki.get(wikiLabel(wiki)) ?? { found: 0, filled: {} }
      byWiki.set(wikiLabel(wiki), stats)
      for (const target of group) {
        const titles = [...titlesFor(target, wiki), ...followed.get(target) ?? []]
        const title = titles.find(title => pages[title] && infobox(pages[title]!))
        if (!title)
          continue
        const fields = infobox(pages[title]!)!
        const linked = title === linkedTitle(wiki, target.fandomLinks)
        stats.found++
        for (const name of Object.keys(fields))
          fieldNames.set(name, (fieldNames.get(name) ?? 0) + 1)
        const entry = current.get(target)!
        // La 1re page trouvée : pour y chercher le jeu du personnage quand Wikidata n'en donne pas
        if (!pageTexts.has(entry.id)) {
          pageTexts.set(entry.id, pages[title]!)
          pageRefs.set(entry.id, { api: wiki.api, title })
        }
        const added = Object.fromEntries(Object.entries(infoboxValues(fields, untranslated)).flatMap(([key, value]) => {
          if (isEmpty(value))
            return []
          if (key === 'nationality')
            return morePlaces(entry.attributes.nationality, value as string[])
          return isEmpty(entry.attributes[key]) ? [[key, value]] : []
        }))
        if (Object.keys(added).length === 0)
          continue
        for (const key of Object.keys(added))
          stats.filled[key] = (stats.filled[key] ?? 0) + 1
        current.set(target, { ...entry, attributes: { ...entry.attributes, ...added } })
        const filled = Object.entries(added).map(([key, value]) => `${key} ${JSON.stringify(value)}`).join(', ')
        details.push(`${entry.name} (${target.franchise}, ${wikiLabel(wiki)}, page « ${title} »${linked ? ', lien Wikidata' : ''}) : ${filled}`)
        // Peut-être un autre personnage : sur un wiki partagé, une page qui ne cite pas la franchise ; ailleurs, une page
        // trouvée par un alias (« Terra-Xehanort » pour Xehanort), qui ne cite pas non plus la franchise
        const shared = target.franchise in SHARED_WIKIS
        const byAlias = !target.names.slice(0, 2).includes(title)
        if (!linked && (shared || byAlias) && !mentionsFranchise(pages[title]!, target.franchise))
          doubtful.push(`${entry.name} (${target.franchise}) → « ${title} » sur ${wikiLabel(wiki)} : ${filled}`)
      }
    }
    if (byApi.size > 0)
      console.log()
  }
  return { entries: targets.map(target => current.get(target)!), byWiki, untranslated, fieldNames, details, doubtful, pageTexts, pageRefs }
}
