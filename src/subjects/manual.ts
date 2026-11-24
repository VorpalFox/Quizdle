// Les corrections faites à la main : data/anime-manual.json (Animedle), data/weebdle-manual.json (Weebdle) et data/pixeldle-manual.json (Pixeldle).
// Appliquées par les scripts de récupération à chaque génération, et par le bot au chargement des données
// (une correction faite avec /quizdebug survit donc à un redémarrage). Les scripts ne les modifient jamais.
// Ne pas modifier data/<sujet>.json à la main : les scripts les réécrivent, les corrections vont ici.
// Les ids : AniList (anilist.co/character/<id>) pour l'Animedle et le Weebdle, QID Wikidata ou « wiki-<franchise>-<nom> »
// pour le Pixeldle (tous dans les récaps). Ce qui ne colle pas (id inconnu, attribut mal écrit) est signalé à la fin du script.
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { type AttributeValue, type Entry, NOT_APPLICABLE } from '../engine/types.js'

export interface Manual {
  // ids des personnages à retirer. Au Weebdle et au Pixeldle, sa place revient au suivant du tirage ; à l'Animedle,
  // il n'est pas remplacé.
  exclude: string[]
  // id → champs à corriger : name, aliases, image, ou un attribut (gender, hair...). Un attribut à plusieurs valeurs
  // prend les valeurs à ajouter et à retirer ({ "plus": [...], "moins": [...] }, voir SetEdit), les autres sont remplacés.
  // Les clés en « _ » sont ignorées (« _nom » pour s'y retrouver, « _raison » pour la retrouver). Un personnage corrigé
  // est toujours gardé, même s'il n'avait pas été tiré : pour ajouter un personnage de la source, il suffit de le corriger.
  edit: Record<string, Record<string, unknown>>
  // personnages complets à ajouter, absents de la source. « edit » ne s'applique pas à eux : les modifier ici.
  add: Entry[]
  // Pixeldle : titre de la franchise → réglages de la recherche dans son wiki (voir scripts/pixeldleWikiCharacters.ts)
  wikis?: Record<string, WikiSettings>
  // Pixeldle : titre de la franchise → valeurs par défaut des attributs vides (espèce « Humain » d'une franchise réaliste…),
  // avant les corrections de « edit »
  defaults?: Record<string, Record<string, AttributeValue>>
}

export interface WikiSettings {
  // pages à prendre d'abord, avant le classement par longueur
  preferred?: string[]
  // pages à lire en plus de la catégorie (personnages qui n'y sont pas rangés), prises en premier
  pages?: string[]
  // pages qui présentent plusieurs personnages, une infobox chacun (« Characters » de Sundered), prises en premier
  listPages?: string[]
  // nombre de personnages au plus, quand le wiki n'en a pas plus de vrais
  limit?: number
  // catégorie des personnages, quand ce n'est ni « Characters » ni une des autres essayées
  category?: string
}

// Le fichier de corrections de chaque sujet qui en a un (data/ à la racine, même chemin depuis src/subjects et dist/subjects)
const MANUAL_FILES: Record<string, string> = { animedle: 'anime-manual.json', weebdle: 'weebdle-manual.json', pixeldle: 'pixeldle-manual.json' }

export const hasManual = (subjectId: string) => subjectId in MANUAL_FILES
export const manualSubjectIds = Object.keys(MANUAL_FILES)

// « data/weebdle-manual.json »
export function manualFileName(subjectId: string): string {
  const name = MANUAL_FILES[subjectId]
  if (!name)
    throw new Error(`Le sujet ${subjectId} n'a pas de fichier de corrections`)
  return `data/${name}`
}

export function manualFile(subjectId: string): URL {
  return new URL(`../../${manualFileName(subjectId)}`, import.meta.url)
}

export function readManual(file: URL): Manual {
  const manual = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) as Partial<Manual> : {}
  return { exclude: (manual.exclude ?? []).map(String), edit: manual.edit ?? {}, add: manual.add ?? [], ...manual.wikis ? { wikis: manual.wikis } : {}, ...manual.defaults ? { defaults: manual.defaults } : {} }
}

// Écrit dans un fichier temporaire puis renomme : pas de fichier à moitié écrit si le bot s'arrête pile à ce moment
export function writeManual(file: URL, manual: Manual): void {
  const temp = new URL(`${file.href}.tmp`)
  writeFileSync(temp, `${JSON.stringify(manual, null, 1)}\n`)
  renameSync(temp, file)
}

const ENTRY_FIELDS = new Set(['name', 'aliases', 'image'])

// La correction d'un attribut à plusieurs valeurs : les valeurs à ajouter et celles à retirer. Les autres restent, dont
// les tags ajoutés par les scripts (Monde réel, l'occupation tirée de l'arme...) : la liste n'a rien d'autre à retenir.
export interface SetEdit {
  plus?: string[]
  moins?: string[]
}

// Les valeurs d'un champ vide (« Inconnu », « Aucune » pour l'occupation d'un animal, « N/A », « Au choix » pour un
// avatar) : une vraie valeur ajoutée les remplace
const PLACEHOLDERS = new Set(['Inconnu', 'Aucune', NOT_APPLICABLE, 'Au choix'])

export const isSetEdit = (value: unknown): value is SetEdit => typeof value === 'object' && value !== null && !Array.isArray(value)

const asList = (value: AttributeValue | undefined) => Array.isArray(value) ? value.map(String) : value === null || value === undefined ? [] : [String(value)]

export function applySetEdit(current: AttributeValue | undefined, edit: SetEdit): AttributeValue {
  const plus = edit.plus ?? []
  const moins = new Set(edit.moins ?? [])
  const kept = asList(current).filter(value => !moins.has(value) && !(plus.length > 0 && PLACEHOLDERS.has(value) && !plus.includes(value)))
  const result = [...kept, ...plus.filter(value => !kept.includes(value))]
  return result.length > 0 ? result : null
}

// Ajoute une correction à celle déjà faite : une valeur ajoutée n'est plus à retirer, et inversement
export function mergeSetEdits(before: SetEdit | undefined, next: SetEdit): SetEdit {
  const plus = [...new Set([...(before?.plus ?? []).filter(value => !next.moins?.includes(value)), ...next.plus ?? []])]
  const moins = [...new Set([...(before?.moins ?? []).filter(value => !next.plus?.includes(value)), ...next.moins ?? []])]
  return { ...plus.length > 0 ? { plus } : {}, ...moins.length > 0 ? { moins } : {} }
}

// Applique un jeu de champs (ceux d'une ligne de « edit ») à une entrée, sur place : une correction faite pendant
// que le bot tourne touche aussi la réponse du jour et les parties en cours, qui pointent sur le même objet.
// Renvoie les clés qui ne sont ni un champ ni un attribut.
export function editEntry(entry: Entry, changes: Record<string, unknown>, attributeKeys: readonly string[]): string[] {
  const unknown: string[] = []
  const mutable = entry as { -readonly [K in keyof Entry]: Entry[K] }
  const attributes: Record<string, AttributeValue> = { ...entry.attributes }
  for (const [key, value] of Object.entries(changes)) {
    if (key.startsWith('_'))
      continue
    if (ENTRY_FIELDS.has(key))
      (mutable as Record<string, unknown>)[key] = value
    else if (attributeKeys.includes(key))
      attributes[key] = isSetEdit(value) ? applySetEdit(attributes[key], value) : value as AttributeValue
    else
      unknown.push(key)
  }
  mutable.attributes = attributes
  return unknown
}

// Applique les corrections à des entrées. Renvoie aussi ce qui ne colle pas (id inconnu, attribut inconnu...).
// Sans effet si les corrections sont déjà appliquées : le bot peut repasser sur un fichier généré par les scripts.
// Les scripts l'appliquent avant leurs enrichissements (qui en profitent : « Japan » ajouté donne « Monde réel »), puis
// à la fin (finishManual) : un enrichissement ne remet pas une valeur retirée.
export function applyManual(entries: Entry[], manual: Manual, attributeKeys: readonly string[]): { entries: Entry[], warnings: string[] } {
  const warnings: string[] = []
  const ids = new Set(entries.map(entry => entry.id))
  const excluded = new Set(manual.exclude)

  for (const id of Object.keys(manual.edit)) {
    if (!ids.has(id))
      warnings.push(`edit : l'id ${id} n'est pas dans les personnages gardés (retiré, ou pas encore tiré)`)
    else if (excluded.has(id))
      warnings.push(`edit : l'id ${id} est aussi dans exclude, il reste retiré`)
  }

  const kept = entries.filter(entry => !excluded.has(entry.id)).map(entry => {
    const changes = manual.edit[entry.id]
    if (!changes)
      return entry
    const copy: Entry = { ...entry }
    for (const key of editEntry(copy, changes, attributeKeys))
      warnings.push(`edit ${entry.id} (${entry.name}) : « ${key} » n'est pas un attribut (${attributeKeys.join(', ')})`)
    for (const [key, value] of Object.entries(changes)) {
      if (attributeKeys.includes(key) && Array.isArray(value))
        warnings.push(`edit ${entry.id} (${entry.name}) : « ${key} » remplace toute la liste, à écrire { "plus": [...], "moins": [...] }`)
    }
    return copy
  })

  const added = manual.add.filter(entry => !ids.has(entry.id) && !excluded.has(entry.id))
  for (const entry of added) {
    for (const key of Object.keys(entry.attributes ?? {})) {
      if (!attributeKeys.includes(key))
        warnings.push(`add ${entry.id} (${entry.name}) : « ${key} » n'est pas un attribut`)
    }
  }
  return { entries: [...kept, ...added], warnings }
}

// La 2e passe des scripts, à la fin : les corrections seules (les retraits et les ajouts ont déjà été faits)
export function finishManual(entries: Entry[], manual: Manual, attributeKeys: readonly string[]): Entry[] {
  return applyManual(entries, { ...manual, exclude: [], add: [] }, attributeKeys).entries
}
