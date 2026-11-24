// Outils AniList partagés par les scripts de l'Animedle (fetchAnime.ts) et du Weebdle (fetchWeebdle.ts)
import { normalize } from '../src/engine/search.js'
import { weaponOccupations } from './pixeldleTranslate.js'

const API = 'https://graphql.anilist.co'
// AniList limite à 30 requêtes par minute en ce moment : on y va doucement
export const DELAY_MS = 2500
const MAX_ATTEMPTS = 6

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Une requête GraphQL, avec reprise sur 429 (trop de requêtes) et erreurs serveur
export async function anilist<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query, variables }),
    }).catch((error: unknown) => error as Error)
    const retryable = response instanceof Error || response.status === 429 || response.status >= 500
    if (!retryable && response.ok)
      return (await response.json() as { data: T }).data
    if (!retryable || attempt === MAX_ATTEMPTS) {
      const detail = response instanceof Error ? response.message : `${response.status} : ${await response.text()}`
      throw new Error(`AniList ${JSON.stringify(variables)} : ${detail}`)
    }
    const retryAfter = response instanceof Error ? NaN : Number(response.headers.get('retry-after'))
    const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? (retryAfter + 1) * 1000 : 10_000 * attempt
    process.stdout.write(`\n  ${response instanceof Error ? response.message : response.status}, nouvel essai dans ${Math.round(wait / 1000)} s\n`)
    await sleep(wait)
  }
}

export const GENDERS: Record<string, string> = { Male: 'Homme', Female: 'Femme' }
export const GENRES: Record<string, string> = {
  'Action': 'Action', 'Adventure': 'Aventure', 'Comedy': 'Comédie', 'Drama': 'Drame', 'Ecchi': 'Ecchi',
  'Fantasy': 'Fantasy', 'Horror': 'Horreur', 'Mahou Shoujo': 'Magical girl', 'Mecha': 'Mecha', 'Music': 'Musique',
  'Mystery': 'Mystère', 'Psychological': 'Psychologique', 'Romance': 'Romance', 'Sci-Fi': 'Science-fiction',
  'Slice of Life': 'Tranche de vie', 'Sports': 'Sport', 'Supernatural': 'Surnaturel', 'Thriller': 'Thriller', 'Hentai': 'Hentai',
}

export interface CharacterName {
  full: string
  native: string | null
  alternative: string[]
}

const withoutSpoilers = (description: string | null) => (description ?? '').replace(/~!.*?(!~|$)/gs, '')
const count = (text: string, pattern: RegExp) => (text.match(pattern) ?? []).length

// Le sexe donné par AniList, sinon celui des pronoms de la description : au moins un, et deux fois plus
// que ceux de l'autre sexe. Testé sur les personnages du Weebdle dont on connaît le sexe : 0,8 % d'erreurs.
export function gender(value: string | null, description: string | null = null): string | null {
  if (value)
    return GENDERS[value] ?? 'Autre'
  const text = withoutSpoilers(description)
  const he = count(text, /\b(he|him|his|himself)\b/gi)
  const she = count(text, /\b(she|her|hers|herself)\b/gi)
  if (he >= 1 && he >= 2 * she)
    return 'Homme'
  if (she >= 1 && she >= 2 * he)
    return 'Femme'
  return null
}
export const genres = (values: string[]) => values.map(genre => GENRES[genre] ?? genre)

// La source de l'anime (champ source d'AniList). Les adaptations d'une œuvre coréenne ou chinoise restent à part
// (Manhwa, Manhua) ; un web novel, un one-shot ou un doujinshi rejoignent leur grande famille.
const SOURCES: Record<string, string | null> = {
  MANGA: 'Manga', ONE_SHOT: 'Manga', DOUJINSHI: 'Manga', WEB_MANGA: 'Manga', MANHWA: 'Manhwa', MANHUA: 'Manhua',
  LIGHT_NOVEL: 'Light novel', NOVEL: 'Roman', WEB_NOVEL: 'Roman', ORIGINAL: 'Original', VISUAL_NOVEL: 'Visual novel',
  VIDEO_GAME: 'Jeu vidéo', GAME: 'Jeu vidéo', MULTIMEDIA_PROJECT: 'Projet multimédia', PICTURE_BOOK: 'Livre illustré',
  LIVE_ACTION: 'Film', COMIC: 'Comics', CARD_GAME: 'Jeu de cartes', MUSIC: 'Musique', OTHER: null,
}
export const animeSource = (source: string | null) => source ? SOURCES[source] ?? null : null

// « JUJUTSU KAISEN Season 2 » → « JUJUTSU KAISEN », « Hunter x Hunter (2011) » → « Hunter x Hunter »
export function cleanTitle(title: string): string {
  return title
    .replace(/\s*\((TV|\d{4})\)$/i, '')
    .replace(/\s*(Season \d+|\d+(st|nd|rd|th) Season|(Second|Third|Final) Season|Part \d+)$/i, '')
    .trim()
}

// Une ligne « __Occupation:__ Teacher » ou « **Hair Color:** Black » de la description AniList.
// Sans les spoilers (~!...!~), les liens et le gras.
export function descriptionField(description: string | null, names: string[]): string | null {
  const pattern = new RegExp(String.raw`^\s*(?:__|\*\*)?\s*(?:${names.join('|')})\s*:?\s*(?:__|\*\*)?\s*:?\s*(.+)$`, 'i')
  for (const line of (description ?? '').split('\n')) {
    const found = pattern.exec(line)
    if (!found)
      continue
    const value = found[1]!
      .replace(/~!.*?(!~|$)/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/__|\*\*|<[^>]+>/g, '')
      .trim()
    if (value)
      return value
  }
  return null
}

// « 17-18 » → 17, « 1000+ » → 1000, « 17- » → 17. Sinon la ligne « Age: » de la description.
export function parseAge(age: string | null, description: string | null = null): number | null {
  const found = /\d+/.exec(age ?? '') ?? /^\d+/.exec(descriptionField(description, ['Age']) ?? '')
  return found ? Number(found[0]) : null
}

const MAX_OCCUPATION_LINE = 100

// Métiers courants cherchés dans le texte quand la description n'a pas de ligne « Occupation: »
const OCCUPATIONS = [
  'office worker', 'salaryman', 'police officer', 'policeman', 'manga artist', 'mangaka', 'student', 'teacher', 'professor',
  'doctor', 'nurse', 'scientist', 'researcher', 'lawyer', 'detective', 'reporter', 'journalist', 'writer', 'novelist', 'artist',
  'idol', 'singer', 'musician', 'actor', 'actress', 'model', 'chef', 'cook', 'maid', 'butler', 'servant', 'merchant', 'shopkeeper',
  'soldier', 'knight', 'samurai', 'ninja', 'warrior', 'swordsman', 'swordswoman', 'mercenary', 'assassin', 'hunter', 'pilot',
  'captain', 'commander', 'general', 'lieutenant', 'sergeant', 'officer', 'guard', 'spy', 'thief', 'pirate', 'adventurer',
  'mage', 'witch', 'wizard', 'sorcerer', 'sorceress', 'priest', 'priestess', 'nun', 'shrine maiden', 'cleric', 'healer', 'archer',
  'king', 'queen', 'prince', 'princess', 'emperor', 'empress', 'noble', 'lord', 'lady', 'president', 'hero', 'god', 'goddess',
]
// « Tatsumi is a young swordsman », « She works as a nurse » : le métier seul, sans les adjectifs.
// Pas « a model student » (élève modèle) ni « a lady killer ».
const OCCUPATION_IN_TEXT = new RegExp(String.raw`\b(?:is|was|works as|worked as|serves as) (?:a|an|the) (?:[a-z-]+ ){0,2}?(${OCCUPATIONS.join('|')})\b(?![ -](?:student|citizen|killer|luck))`, 'i')

// « Jujutsu Sorcerer, Teacher » → ["Jujutsu Sorcerer", "Teacher"]. Sinon le 1er métier courant du texte
// (« is a young nun » → ["Nun"]), moins sûr : à relire. En anglais, comme AniList : à trier à la main.
export function parseOccupation(description: string | null): string[] | null {
  const value = descriptionField(description, ['Occupations?', 'Professions?', 'Jobs?', 'Positions?'])
  // Au-delà, ce n'est plus une liste de métiers mais un paragraphe (« Position: Center, ... is insanely strong »)
  if (!value || value.length > MAX_OCCUPATION_LINE) {
    const found = OCCUPATION_IN_TEXT.exec(withoutSpoilers(description))
    return found ? [capitalize(found[1]!.toLowerCase())] : null
  }
  return splitOccupations(value)
}

// « Pirate (Captain), Student and formerly Knight » → ["Pirate", "Student", "Knight"]. Sert aussi pour Wikipédia (« et », « puis »).
export function splitOccupations(value: string): string[] | null {
  const list = value
    .replace(/~!|!~/g, '')
    .replace(/\s*\([^)]*\)/g, '')
    .split(/\s*(?:,|;|\/|\band\b|\bet\b|\bpuis\b|\bformerly\b|\bprevious(?:ly)?\b|\banciennement\b)\s*/i)
    .map(part => part.replace(/[.:!]+$/, '').trim())
    .filter(part => part.length > 1 && part.length <= 40)
    .map(capitalize)
  return list.length > 0 ? [...new Set(list)] : null
}

function capitalize(text: string): string {
  return text[0]!.toUpperCase() + text.slice(1)
}

// Les mots anglais (AniList, Wikipédia EN) et français (Wikipédia FR)
const HAIR_COLORS: [RegExp, string][] = [
  [/black|raven|ebony|noir/i, 'Noirs'], [/white|snow|blanc/i, 'Blancs'], [/silver|platinum|argent/i, 'Argentés'], [/gr[ae]y|gris/i, 'Gris'],
  [/blond|golden|gold|yellow|dor[ée]|jaune/i, 'Blonds'], [/brown|brunette|chestnut|auburn|\bbrun|ch[âa]tain/i, 'Bruns'], [/orange|ginger|roux|rousse/i, 'Roux'],
  [/\bred|crimson|scarlet|rouge/i, 'Rouges'], [/pink|\brose/i, 'Roses'], [/blue|cyan|teal|turquoise|bleu/i, 'Bleus'], [/green|\bvert/i, 'Verts'],
  [/purple|violet|lavender|lilac|mauve|pourpre/i, 'Violets'], [/bald|shaved|chauve/i, 'Chauve'],
]
const COLOR_WORDS = 'black|raven|ebony|white|snow|silver|platinum|gr[ae]y|blonde?|golden|gold|yellow|brown|brunette|chestnut|auburn|orange|ginger|red|crimson|scarlet|pink|blue|cyan|teal|turquoise|green|purple|violet|lavender|lilac'
// « black hair », « long silver hair », « black and white hair », « red-colored hair »
export const HAIR_IN_TEXT = new RegExp(String.raw`\b((?:${COLOR_WORDS})(?:[- ](?:and|or)?[- ]?(?:${COLOR_WORDS}))*)(?:[- ]colou?red)?,?(?:\s+[a-z-]+)?\s+hair\b`, 'i')

// Les couleurs citées, dans l'ordre du texte (« White with blue tips » → Blancs, Bleus)
export const hairColors = (text: string) => HAIR_COLORS
  .map(([pattern, color]) => ({ color, index: text.search(pattern) }))
  .filter(({ index }) => index >= 0)
  .sort((a, b) => a.index - b.index)
  .map(({ color }) => color)

// La couleur des cheveux : la ligne « Hair Color: » de la description, sinon la 1re « black hair » du texte.
// Rare sur AniList (quelques %) : le reste est à compléter à la main.
export function parseHair(description: string | null): string[] | null {
  const field = descriptionField(description, ['Hair Colou?rs?', 'Hair'])
  const fromField = field ? hairColors(field) : []
  if (fromField.length > 0)
    return fromField
  const found = HAIR_IN_TEXT.exec(withoutSpoilers(description))
  const fromText = found ? hairColors(found[1]!) : []
  return fromText.length > 0 ? fromText : null
}

// L'arme (ligne « Weapon: » de la description) dit comment le perso se bat : Épéiste, Tireur... (règles du Pixeldle)
export function parseWeapon(description: string | null): string[] | null {
  return weaponList(descriptionField(description, ['Weapons?', 'Armaments?']))
}

// La taille en cm : la ligne « Height: » de la description (« 173 cm (5'8") »)
export function parseHeight(description: string | null): number | null {
  return heightCm(descriptionField(description, ['Height']))
}

// « 173 cm (5'8") » → 173, « 1.72 m » → 172, « 5' 10½" » → 179, « 178 (5' 10") » → 178. La 1re taille donnée, celle
// du début de l'histoire (« 147 cm (pre-timeskip), 163 cm (post-timeskip) » → 147) : pas de spoil.
// Pas « (850), (854) » (les années des chapitres du wiki de L'Attaque des Titans), ni « Unknown ».
const MIN_CM = 5
const MAX_BARE_CM = 250
export function heightCm(value: string | null): number | null {
  // Une taille d'affichage (« 35px » : le champ height d'un modèle d'onglets), pas celle du perso
  if (!value || /\d\s*(?:px|em|%)/i.test(value))
    return null
  const cm = /(\d+(?:[.,]\d+)?)\s*cm\b/i.exec(value)
  if (cm)
    return valid(Number(cm[1]!.replace(',', '.')))
  const meters = /\b(\d(?:\.\d+)?)\s*m\b/.exec(value)
  if (meters)
    return valid(Number(meters[1]) * 100)
  const feet = /(\d)\s*['’′]\s*(\d+(?:\.\d+)?)?\s*(½)?/.exec(value)
  if (feet)
    return valid(Number(feet[1]) * 30.48 + (Number(feet[2] ?? 0) + (feet[3] ? 0.5 : 0)) * 2.54)
  const bare = /^\s*(?:around|about|approx\.?|~)?\s*(\d{2,3})\b(?!\))/i.exec(value)
  return bare && Number(bare[1]) <= MAX_BARE_CM ? valid(Number(bare[1])) : null
}
const valid = (cm: number) => cm >= MIN_CM ? Math.round(cm) : null

// L'espèce brute (« __Race:__ Human »), traduite plus tard (translateCharacterSpecies)
export function parseSpecies(description: string | null): string | null {
  return descriptionField(description, ['Race', 'Species'])
}

export function weaponList(value: string | null): string[] | null {
  const found = value ? weaponOccupations(value) : []
  return found.length > 0 ? found : null
}

// Les noms acceptés : nom complet dans les deux ordres, et les variantes qui contiennent son nom
// (« Satoru Gojo », « Monkey D. Luffy »). Pas les surnoms (« Master », « Zero »...) : écrits dans le salon,
// ils seraient pris pour des propositions.
export function nameVariants(name: CharacterName): string[] {
  const parts = name.full.split(' ')
  const keys = new Set(parts.map(normalize))
  const variants = name.alternative.filter(alt => alt.split(/\s+/).some(word => keys.has(normalize(word))))
  const reversed = parts.length > 1 ? [[...parts].reverse().join(' ')] : []
  return [...reversed, ...variants, ...(name.native ? [name.native] : [])]
}

// Prénom ou nom seul (« Luffy », « Gojou ») : accepté s'il n'appartient qu'à un seul personnage de la liste
export function uniqueNameParts(names: CharacterName[]): (name: CharacterName) => string[] {
  const owners = new Map<string, number>()
  for (const name of names) {
    for (const part of new Set(name.full.split(' ').map(normalize)))
      owners.set(part, (owners.get(part) ?? 0) + 1)
  }
  return name => {
    const parts = name.full.split(' ')
    return parts.length > 1 ? parts.filter(part => owners.get(normalize(part)) === 1) : []
  }
}

// Un alias d'une ou deux lettres (« C. », « zi », ou « d » pour « モンキー・D・ルフィ ») serait reconnu dès qu'on écrit
// cette lettre dans le salon : on ne le garde pas. Le nom complet reste accepté (« L Lawliet », « C.C. »).
// Les noms en japonais (vides une fois normalisés) ne gênent pas la recherche.
const MIN_ALIAS_LENGTH = 3
const usableAlias = (alias: string) => {
  const key = normalize(alias)
  return key === '' || key.length >= MIN_ALIAS_LENGTH
}

export function aliases(name: CharacterName, uniqueParts: (name: CharacterName) => string[]): string[] {
  return [...new Set([...nameVariants(name), ...uniqueParts(name)])].filter(usableAlias)
}

// « Cú  Chulainn » → « Cú Chulainn »
export const cleanName = (name: CharacterName): CharacterName => ({ ...name, full: name.full.replace(/\s+/g, ' ').trim() })
