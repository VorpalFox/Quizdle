// L'introduction d'une page de wiki (Fandom, wikis des franchises) : ce que le personnage est, pour en tirer une
// occupation quand l'infobox n'en donne pas. Partagé par le Pixeldle et l'Animedle / Weebdle.
import { cleanValue } from './wikipedia.js'

const MAX_INTRO_LENGTH = 1500

// « X is a Vietnam veteran who served… », « X was the princess of Guardia » : ce que le personnage est, sans la suite
// « is considered by many to be one of the greatest warbosses » (Grimgor, Warhammer), « is regarded as » : comme « is »
export const WHAT_HE_IS = /\b(?:(?:is|was) (?:considered|regarded|seen)(?: by [^,.;]+?)? (?:to be|as)|is|was|serves as|served as|works as|worked as)\s+(?:(?:a|an|the|one of the|also|currently|formerly|now)\s+)*([^.;:,()"]+)/i
const END_OF_ROLE = /\s(?:who|that|which|whose|in|from|for|with|at|on|to|by|introduced|debuting|appearing|created|built|first|known|named|and the)\s.*$/i
export const MAX_INTRO_SENTENCES = 2
// Pas un métier : un rôle dans l'histoire ou le jeu (« major character », « final boss »), un lien de famille (« son of »),
// un mot qui en contient un autre (« genetically-engineered » n'est pas un ingénieur, « android model » pas un mannequin)
const FAMILY = 'son|daughter|wife|husband|brother|sister|child|father|mother|friend|cousin|niece|nephew|grandson|granddaughter|clone|descendant|ancestor|reincarnation'
const NOT_A_JOB = new RegExp(String.raw`\b(?:characters?|antagonists?|protagonists?|deuteragonists?|boss|bosses|villains?|companions?|npc|enem(?:y|ies)|all(?:y|ies)|sidekick|rival|nemesis|arch-?enemy|romance|players?|skins?|heroe?s?|heroines?|agent|member of the \w+ (?:clan|tribe)|(?:${FAMILY}) of|engineered|model\w*|mannequin|factor|animatronics?|king of the hill|threats?)\b|^(?:given|taught|seen|located|found|known|named|featured|released|voiced|born|killed|forced|recruited|sent|raised|captured|tasked|threatened)\b`, 'i')
// Un lien de famille au possessif (« Prince Lelouch's younger sister » n'est pas un prince) : après le découpage,
// « Ushio's younger sister and a high school student » garde l'élève
const POSSESSIVE_FAMILY = new RegExp(String.raw`['’]s (?:(?:younger|older|elder|little|big|twin|half|step)[- ])?(?:${FAMILY})\b`, 'i')

// Un 2e rôle, plus loin que la coupure : « a young girl from Sanguine Lotus and apprentice of the witch Ione » (Marie,
// The Witch and the Beast). En minuscule seulement, articles passés : dans « from Tokyo and Osaka » ou « son of the Pale
// King and the White Lady », Osaka et White Lady ne sont pas des rôles.
const ROLE_AFTER_AND = /\sand\s+(?:(?:a|an|the|also|currently|formerly|now)\s+)*(?!(?:a|an|the|also|currently|formerly|now)\s)([a-z][^.;:,()"]*)/
// Le vrai rôle après la virgule : « is a playable Agent in Zenless Zone Zero, and a Maid of Victoria Housekeeping »,
// « …, and the Chief of Section 6 ». Avec un article : la majuscule est alors un titre, pas un nom propre.
const ROLE_AFTER_COMMA_AND = /^\s*,\s*and\s+(?:a|an|the)\s+(?:(?:also|currently|formerly|now)\s+)?([^.;:,()"]+)/i

// Ce que l'introduction dit du personnage, phrase par phrase (« Vietnam veteran », « princess of Guardia »),
// pour en tirer une occupation. « ., » : la fin d'un paragraphe, recollé au suivant par cleanValue (« Rasmus is a
// character in Solasta II., He is a merchant in Tor Wen. »)
export function introRoles(intro: string): string[] {
  const sentences = intro.split(/(?<=[.!?])\s+/).slice(0, MAX_INTRO_SENTENCES).flatMap(sentence => sentence.split(/(?<=[.!?]),\s+/))
  return sentences.flatMap(sentence => {
    const found = WHAT_HE_IS.exec(sentence)
    const raw = found?.[1]
    if (!raw)
      return []
    const role = raw.replace(END_OF_ROLE, '').trim()
    const after = ROLE_AFTER_AND.exec(raw.slice(role.length))?.[1]?.replace(END_OF_ROLE, '').trim()
    const afterComma = ROLE_AFTER_COMMA_AND.exec(sentence.slice(found.index + found[0].length))?.[1]?.replace(END_OF_ROLE, '').trim().replace(/\s+of(?:\s+the)?$/i, '')
    // Le filtre avant le découpage : « son of King X and Queen Y » part en entier. Après un « and », pas un nom propre
    // (« … and the Emperor of Mankind » : l'Empereur n'est pas un rôle du Dieu-machine ; « Leader and Founder » reste)
    return [role, after, afterComma].filter((text): text is string => Boolean(text) && !NOT_A_JOB.test(text!))
      .flatMap(text => text.split(/\s+and\s+/).filter((part, index) => index === 0 || !/^the\s+\p{Lu}/u.test(part)))
  }).filter(role => !NOT_A_JOB.test(role) && !POSSESSIVE_FAMILY.test(role))
}

// L'introduction d'une page : le texte avant la 1re section, sans l'infobox ni les modèles
// Sans les images, même quand leur légende a un lien (« [[File:x.jpg|thumb|An image… [[Uru website]].]] », wiki de
// Myst) : sinon la fin de la légende passe pour la 1re phrase
export function introText(wikitext: string): string {
  const body = wikitext.replace(/<!--[\s\S]*?-->/g, '').replace(/<ref[^>]*\/>|<ref[\s\S]*?<\/ref>/gi, '')
    .replace(/\[\[\s*(?:file|image|fichier)\s*:[^[\]]*(?:\[\[[^\]]*\]\][^[\]]*)*\]\]/gi, '').split(/\n==/)[0]!
  return cleanValue(body).slice(0, MAX_INTRO_LENGTH)
}
