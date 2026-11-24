// L'introduction d'une page de wiki (Fandom, wikis des franchises) : ce que le personnage est, pour en tirer une
// occupation quand l'infobox n'en donne pas. Partagé par le Pixeldle et l'Animedle / Weebdle.
import { cleanValue } from './wikipedia.js'

const MAX_INTRO_LENGTH = 1500

// « X is a Vietnam veteran who served… », « X was the princess of Guardia » : ce que le personnage est, sans la suite
export const WHAT_HE_IS = /\b(?:is|was|serves as|served as|works as|worked as)\s+(?:(?:a|an|the|one of the|also|currently|formerly|now)\s+)*([^.;:,()"]+)/i
const END_OF_ROLE = /\s(?:who|that|which|whose|in|from|for|with|at|on|to|by|introduced|debuting|appearing|created|built|first|known|named|and the)\s.*$/i
export const MAX_INTRO_SENTENCES = 2
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

// L'introduction d'une page : le texte avant la 1re section, sans l'infobox ni les modèles
export function introText(wikitext: string): string {
  const body = wikitext.replace(/<!--[\s\S]*?-->/g, '').replace(/<ref[^>]*\/>|<ref[\s\S]*?<\/ref>/gi, '').split(/\n==/)[0]!
  return cleanValue(body).slice(0, MAX_INTRO_LENGTH)
}
