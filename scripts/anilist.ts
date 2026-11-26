// Outils AniList partagés par les scripts de l'Animedle (fetchAnime.ts) et du Weebdle (fetchWeebdle.ts)
import { normalize } from '../src/engine/search.js'
import { weaponOccupations } from './pixeldleTranslate.js'
import { translateOccupation } from './translate.js'
import { isUnknownValue, unknownKeys } from './unknownValues.js'

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

export const GENDERS: Record<string, string> = { Male: 'Male', Female: 'Female' }
export const GENRES: Record<string, string> = {
  'Action': 'Action', 'Adventure': 'Adventure', 'Comedy': 'Comedy', 'Drama': 'Drama', 'Ecchi': 'Ecchi',
  'Fantasy': 'Fantasy', 'Horror': 'Horror', 'Mahou Shoujo': 'Magical girl', 'Mecha': 'Mecha', 'Music': 'Music',
  'Mystery': 'Mystery', 'Psychological': 'Psychological', 'Romance': 'Romance', 'Sci-Fi': 'Sci-Fi',
  'Slice of Life': 'Slice of Life', 'Sports': 'Sports', 'Supernatural': 'Supernatural', 'Thriller': 'Thriller', 'Hentai': 'Hentai',
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
    return GENDERS[value] ?? 'Other'
  const text = withoutSpoilers(description)
  const he = count(text, /\b(he|him|his|himself)\b/gi)
  const she = count(text, /\b(she|her|hers|herself)\b/gi)
  if (he >= 1 && he >= 2 * she)
    return 'Male'
  if (she >= 1 && she >= 2 * he)
    return 'Female'
  return null
}
export const genres = (values: string[]) => values.map(genre => GENRES[genre] ?? genre)

// La source de l'anime (champ source d'AniList). Les adaptations d'une œuvre coréenne ou chinoise restent à part
// (Manhwa, Manhua) ; un web novel, un one-shot ou un doujinshi rejoignent leur grande famille.
const SOURCES: Record<string, string | null> = {
  MANGA: 'Manga', ONE_SHOT: 'Manga', DOUJINSHI: 'Manga', WEB_MANGA: 'Manga', MANHWA: 'Manhwa', MANHUA: 'Manhua',
  LIGHT_NOVEL: 'Light novel', NOVEL: 'Novel', WEB_NOVEL: 'Novel', ORIGINAL: 'Original', VISUAL_NOVEL: 'Visual novel',
  VIDEO_GAME: 'Video game', GAME: 'Video game', MULTIMEDIA_PROJECT: 'Multimedia project', PICTURE_BOOK: 'Picture book',
  LIVE_ACTION: 'Live action', COMIC: 'Comic', CARD_GAME: 'Card game', MUSIC: 'Music', OTHER: null,
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

// Les noms des lignes de la description, par indice
const DESCRIPTION_FIELDS = {
  age: ['Age'],
  occupation: ['Occupations?', 'Professions?', 'Jobs?', 'Positions?'],
  hair: ['Hair Colou?rs?', 'Hair'],
  species: ['Race', 'Species'],
  height: ['Height'],
}

// « 17-18 » → 17, « 1000+ » → 1000, « 17- » → 17. Sinon la ligne « Age: » de la description.
export function parseAge(age: string | null, description: string | null = null): number | null {
  const found = /\d+/.exec(age ?? '') ?? /^\d+/.exec(descriptionField(description, DESCRIPTION_FIELDS.age) ?? '')
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
  // Paprika : « He's the bartender », « A gifted psychiatrist », « Chiba's research assistant »
  'bartender', 'waiter', 'waitress', 'psychiatrist', 'psychotherapist', 'research assistant', 'bodyguard',
]
// « Tatsumi is a young swordsman », « She works as a nurse » : le métier seul, sans les adjectifs.
// Pas « a model student » (élève modèle) ni « a lady killer ».
// « She's the commanding officer » (Abelia) compte comme « she is ». Pas un autre perso : « Sharrkan, who is a
// swordsman » (Yamuraiha), « Her father is the president » (Itsuki Sumeragi). Mais « a woman who works as a maid »
// (sans virgule) parle bien du perso.
const OCCUPATION_IN_TEXT = new RegExp(String.raw`(?<!,\s*who\s)(?<!\b(?:his|her|their)\s+\w+\s)(?:\b(?:is|was|works as|worked as|serves as)|\b(?:he|she)['’]s) (?:a|an|the) (?:[a-z-]+ ){0,2}?(${OCCUPATIONS.join('|')})\b(?![ -](?:student|citizen|killer|luck))`, 'gi')
// Le métier en tout début de description, sans verbe : « A sergeant in the police force » (Jeff Enker). Pas « lady » ni
// « lord », qui décrivent la personne (« An elderly lady who works as a clerk », « A former drug lord »), ni « hero »,
// un rôle dans l'histoire (« The hero of the first game »).
const NOT_AT_START = new Set(['lady', 'lord', 'hero'])
const OCCUPATION_AT_START = new RegExp(String.raw`^\s*(?:a|an|the) (?:[a-z-]+ ){0,2}?(${OCCUPATIONS.filter(job => !NOT_AT_START.has(job)).join('|')})\b(?![ -](?:student|citizen|killer|luck))`, 'i')
// « One of the soldiers in Hamdo's army » (Tabool), au pluriel. Pas les titres : « One of the Four Ramen Emperors »
// est un surnom de groupe (Saburo Odajima)
const NOT_ONE_OF = new Set([...NOT_AT_START, 'king', 'queen', 'prince', 'princess', 'emperor', 'empress', 'noble', 'president', 'god', 'goddess'])
const ONE_OF_THE = new RegExp(String.raw`^\s*one of the (?:[a-z-]+ ){0,2}?(${OCCUPATIONS.filter(job => !NOT_ONE_OF.has(job)).join('|')})s?\b`, 'i')
// « Hiling's bodyguard », « Kurapika's nen teacher » : un possessif en tout début, puis le métier. Pas « Hyakkimaru is
// the central character of Tezuka's samurai story » (un verbe avant), ni « Shougen's Model Dolphin Initiator ».
const POSSESSIVE = new RegExp(String.raw`^\s*([^.,;]{1,50}?)['’]s (?:[a-z-]+ ){0,2}?(${OCCUPATIONS.filter(job => job !== 'model').join('|')})\b(?![ -](?:student|citizen|killer|luck))`, 'i')
// « King Bosse's second wife, current Queen » (Hiling) : « current / former X » après une virgule, dans la 1re phrase
const CURRENT = new RegExp(String.raw`^[^.]*?,\s*(?:the\s+)?(?:current|former|reigning)\s+(${OCCUPATIONS.join('|')})\b`, 'i')

// Ces tournures en début de description, sans les liens Markdown (« [Hiling](https://anilist.co/...)'s bodyguard »)
function occupationAtStart(text: string): string | null {
  const plainText = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  const possessive = POSSESSIVE.exec(plainText)
  const fromPossessive = possessive && !/\b(?:is|was|are|were)\b/i.test(possessive[1]!) ? possessive[2]! : null
  return OCCUPATION_AT_START.exec(plainText)?.[1] ?? ONE_OF_THE.exec(plainText)?.[1] ?? fromPossessive ?? CURRENT.exec(plainText)?.[1] ?? null
}

// « Jujutsu Sorcerer, Teacher » → ["Jujutsu Sorcerer", "Teacher"]. Sinon les métiers courants du texte, tous
// (« She's a first-year student… is the president » → Student, President), moins sûrs : à relire. En anglais, comme
// AniList : à trier à la main.
export function parseOccupation(description: string | null): string[] | null {
  const value = descriptionField(description, DESCRIPTION_FIELDS.occupation)
  // Au-delà, ce n'est plus une liste de métiers mais un paragraphe (« Position: Center, ... is insanely strong »).
  // « Unknown » : la marque d'anilistUnknowns, le texte peut encore dire mieux.
  if (!value || value.length > MAX_OCCUPATION_LINE || isUnknownValue(value)) {
    const found = [...withoutSpoilers(description).matchAll(OCCUPATION_IN_TEXT)].map(match => capitalize(match[1]!.toLowerCase()))
    return found.length > 0 ? [...new Set(found)] : null
  }
  return splitOccupations(value)
}

// Sans occupation dans la description (parseOccupation) : moins sûr, il ne compte pas pour choisir les persos (hasInfo),
// sinon des figurants prennent la place des persos connus. Les autres sources s'y ajoutent (addedValues).
export function parseOccupationAtStart(description: string | null): string[] | null {
  const found = occupationAtStart(withoutSpoilers(description))
  return found ? [capitalize(found.toLowerCase())] : null
}

// « Pirate (Captain), Student and formerly Knight » → ["Pirate", "Student", "Knight"]. Sert aussi pour Wikipédia (« et », « puis »).
export function splitOccupations(value: string): string[] | null {
  const list = value
    .replace(/~!|!~/g, '')
    // « Private Aichi Symbiosis Academy (Student) » : le rôle dans l'organisation, pas son nom
    .replace(ORGANIZATION_ROLE, (match, role: string) => translateOccupation(role.trim()) ? role : match)
    .replace(/\s*\([^)]*\)/g, '')
    // « Track and Field Club Girl » (Ayumi, The World God Only Knows) : l'athlétisme, pas deux métiers
    .replace(/\btrack and field\b/gi, 'athletics')
    // « Magical swordsman », « Magic swordman » (Zolmnem et Amyu, The Reincarnation of the Strongest Exorcist) : mage et épéiste
    .replace(/\bmagic(?:al)?\s+swords?(?:wo)?m[ae]n\b/gi, 'mage, swordsman')
    .split(/\s*(?:,|;|\/|\band\b|\bet\b|\bpuis\b|\bformerly\b|\bprevious(?:ly)?\b|\banciennement\b)\s*/i)
    // « Buddy - Spirit Capturing » (Keima) : deux rôles, si chacun se traduit (pas « Student - Class C »)
    .flatMap(part => {
      const roles = part.split(/\s+-\s+/)
      return roles.length > 1 && roles.every(role => translateOccupation(role.trim())) ? roles : [part]
    })
    .map(part => part.replace(/[.:!]+$/, '').trim())
    // Au-delà de 40 caractères, une phrase plutôt qu'un métier, sauf si on sait la traduire (« Chairman of the Institute
    // for Psychiatric Research », Inui dans Paprika)
    .filter(part => part.length > 1 && (part.length <= MAX_OCCUPATION_LENGTH || translateOccupation(part) !== undefined))
    .map(capitalize)
  return list.length > 0 ? [...new Set(list)] : null
}

const MAX_OCCUPATION_LENGTH = 40
// Le nom finit par le mot d'organisation, et la parenthèse est un rôle connu : pas « Middle School Student (Aincrad Arc) »
const ORGANIZATION_ROLE = /[^,;/\n()]*\b(?:academy|school|institute|university|college|association|guild|agency|company|corps|army)\s*\(([^)]+)\)/gi

function capitalize(text: string): string {
  return text[0]!.toUpperCase() + text.slice(1)
}

// Les mots anglais (AniList, Wikipédia EN) et français (Wikipédia FR)
const HAIR_COLORS: [RegExp, string][] = [
  [/black|raven|ebony|noir/i, 'Black'], [/white|snow|blanc/i, 'White'], [/silver|platinum|argent/i, 'Silver'], [/gr[ae]y|gris/i, 'Grey'],
  [/blond|golden|gold|yellow|flax|dor[ée]|jaune/i, 'Blond'], [/brown|brunette|chestnut|auburn|\bbrun|ch[âa]tain/i, 'Brown'], [/orange|ginger|roux|rousse/i, 'Ginger'],
  [/\bred|crimson|scarlet|rouge/i, 'Red'], [/pink|\brose/i, 'Pink'], [/blue|cyan|teal|turquoise|bleu/i, 'Blue'], [/green|\bvert/i, 'Green'],
  [/purple|violet|lavender|lilac|mauve|pourpre/i, 'Purple'], [/bald|shaved|chauve/i, 'Bald'],
]
export const COLOR_WORDS = 'black|raven|ebony|white|snow|silver|platinum|gr[ae]y|blonde?|golden|gold|yellow|brown|brunette|chestnut|auburn|orange|ginger|red|crimson|scarlet|pink|blue|cyan|teal|turquoise|green|purple|violet|lavender|lilac|flax(?:en)?'
// « black hair », « long silver hair », « black and white hair », « red-colored hair ». Pas un accessoire (« a red hair
// tie », Blaze the Cat). Entre la couleur et « hair », un mot quelconque, ou plusieurs s'ils décrivent des cheveux
// (« a black and white wavy, shoulder length hair », Victor Ashford) : pas « black coat, long hair ».
const HAIR_ACCESSORY = String.raw`(?![- ]?(?:ties?|bands?|clips?|pins?|ornaments?|accessor(?:y|ies)|pieces?|bows?|ribbons?|dye)\b)`
const HAIR_ADJECTIVES = 'long|short|wavy|curly|straight|messy|spiky|spikey|thick|thin|silky|braided|flowing|shaggy|unkempt|tousled|fluffy|cropped|layered|loose|neat|slicked(?:-back)?|medium|(?:shoulder|waist|chin|neck|ear)(?:[- ]length)?|length'
export const HAIR_IN_TEXT = new RegExp(String.raw`\b((?:${COLOR_WORDS})(?:[- ](?:and|or)?[- ]?(?:${COLOR_WORDS}))*)(?:[- ]colou?red)?(?:,?\s+(?:${HAIR_ADJECTIVES})\b)*,?(?:\s+[a-z-]+)?[\s-]+hair\b${HAIR_ACCESSORY}`, 'i')
// « dark hair », « short, dark hair » dans un texte : noirs (validé avec FX, quitte à compter quelques bruns foncés :
// Nabuca, Reg, Bertolt…). En dernier recours, si le texte ne cite aucune vraie couleur (Pauline a « dark hair » avant
// « brown hair »). Pas une nuance en « -ish » (« dark reddish hair »), ni un champ d'infobox (« Dark Gunmetal », Arata).
export const DARK_HAIR_IN_TEXT = new RegExp(String.raw`\bdark,?(?:\s+(?![a-z]+ish\b)[a-z-]+)?\s+hair\b${HAIR_ACCESSORY}`, 'i')
export const DARK_HAIR = 'Black'

// Les couleurs citées, dans l'ordre du texte (« White with blue tips » → White, Blue)
export const hairColors = (text: string) => HAIR_COLORS
  .map(([pattern, color]) => ({ color, index: text.search(pattern) }))
  .filter(({ index }) => index >= 0)
  .sort((a, b) => a.index - b.index)
  .map(({ color }) => color)

// Les mèches qui suivent « … hair » : « short white hair with light green streaks » (Lily Everhart), « brown hair
// with blonde streaks » (Marcus Dryden). Seulement des mèches, pointes ou reflets, juste derrière : pas « blue hair
// with a red ribbon ».
const TRAILING_HAIR = new RegExp(String.raw`^,?\s+with\s+(?:(?:a|an|some|several|various|few|two|thin|thick|small|light|dark|bright|pale|deep|faint|subtle|vivid)\s+)*((?:${COLOR_WORDS})(?:[- ](?:and|or)?[- ]?(?:${COLOR_WORDS}))*)(?:[- ]colou?red)?[\s-]+(?:streaks?|tips?|highlights?|strands?|ends|stripes?|locks|accents?|tint|undertones?)\b`, 'i')
export const trailingHair = (after: string) => {
  const found = TRAILING_HAIR.exec(after)
  return found ? hairColors(found[1]!) : []
}

// La couleur des cheveux : la ligne « Hair Color: » de la description, sinon la 1re « black hair » du texte.
// Rare sur AniList (quelques %) : le reste est à compléter à la main.
export function parseHair(description: string | null): string[] | null {
  const field = descriptionField(description, DESCRIPTION_FIELDS.hair)
  const fromField = field ? hairColors(field) : []
  if (fromField.length > 0)
    return fromField
  const text = withoutSpoilers(description)
  const found = HAIR_IN_TEXT.exec(text)
  const fromText = found ? [...new Set([...hairColors(found[1]!), ...trailingHair(text.slice(found.index + found[0].length))])].slice(0, 2) : []
  if (fromText.length > 0)
    return fromText
  return DARK_HAIR_IN_TEXT.test(text) ? [DARK_HAIR] : null
}

// L'arme (ligne « Weapon: » de la description) dit comment le perso se bat : Épéiste, Tireur... (règles du Pixeldle)
export function parseWeapon(description: string | null): string[] | null {
  return weaponList(descriptionField(description, ['Weapons?', 'Armaments?']))
}

// La taille en cm : la ligne « Height: » de la description (« 173 cm (5'8") »)
export function parseHeight(description: string | null): number | null {
  return heightCm(descriptionField(description, DESCRIPTION_FIELDS.height))
}

// « 173 cm (5'8") » → 173, « 1.72 m » → 172, « 5' 10½" » → 179, « 178 (5' 10") » → 178. La 1re taille donnée, celle
// du début de l'histoire (« 147 cm (pre-timeskip), 163 cm (post-timeskip) » → 147), celle qu'on voit le plus.
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

// L'espèce brute (« __Race:__ Human »), traduite plus tard (translateCharacterSpecies). « Unknown » : la marque
// d'anilistUnknowns, Wikidata ou Fandom peuvent encore la donner.
export function parseSpecies(description: string | null): string | null {
  const value = descriptionField(description, DESCRIPTION_FIELDS.species)
  return isUnknownValue(value) ? null : value
}

// Les lignes de la description qui disent « Unknown » (« __Age:__ Unknown ») : « Inconnu » à la fin, si aucune autre
// source n'a mieux (unknownValues.ts)
export function anilistUnknowns(age: string | null, description: string | null): string[] | null {
  const raw = Object.fromEntries(Object.entries(DESCRIPTION_FIELDS).map(([key, names]) => [key, descriptionField(description, names)]))
  const keys = unknownKeys({ ...raw, age: age ?? raw.age })
  return keys.length > 0 ? keys : null
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

// Weebdle et Animedle : le nom de famille (le dernier des deux mots chez AniList, « Motoharu Tsuchimikado ») même partagé.
// Plusieurs persos le portent : le bot liste les homonymes au lieu de jouer. Pas au-delà de deux mots (« Monkey D. Luffy »).
export function withFamilyName(uniqueParts: (name: CharacterName) => string[]): (name: CharacterName) => string[] {
  return name => {
    const parts = name.full.split(' ')
    return parts.length === 2 ? [...uniqueParts(name), parts[1]!] : uniqueParts(name)
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
