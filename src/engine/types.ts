// Tout ce qu'il faut pour décrire un sujet de quiz. Le moteur ne connaît rien d'autre :
// un nouveau sujet = une liste d'attributs + une liste d'entrées, sans toucher au moteur ni au bot.

// null = l'entrée n'a pas cette valeur (ex : pas de 2e type, habitat inconnu)
export type AttributeValue = string | number | readonly string[] | null

// L'entrée ne peut pas avoir cette valeur (l'âge ou les cheveux d'un personnage immatériel), à ne pas confondre
// avec null (« ? », valeur inconnue). Une valeur comme une autre : juste si la cible l'a aussi, fausse sinon,
// même pour un nombre (ni plus grand ni plus petit). Même valeur que les cheveux d'un robot au Pixeldle (NO_HAIR).
export const NOT_APPLICABLE = 'N/A'

// Comment on compare la proposition à la cible :
// - exact  : juste ou faux (couleur, habitat...)
// - set    : liste de valeurs, partiellement juste si au moins une en commun (types...)
// - number : juste, ou plus grand / plus petit (taille, poids, génération...)
export type AttributeKind = 'exact' | 'set' | 'number'

export interface AttributeDef {
  key: string
  label: string
  kind: AttributeKind
  // affichage de la valeur (unité, séparateur...). Par défaut : valeur brute, « — » si vide
  format?: (value: AttributeValue) => string
  // ce qu'une correction à la main garde de l'ancienne valeur (la valeur par défaut d'un champ vidé, au Pixeldle).
  // Par défaut : la correction remplace tout, sauf les tags ajoutés par le script (Entry.added)
  onEdit?: (edited: AttributeValue, previous: AttributeValue) => AttributeValue
}

export interface Entry {
  id: string
  name: string
  // autres noms acceptés pour la proposition (nom anglais...)
  aliases?: readonly string[]
  image?: string
  attributes: Readonly<Record<string, AttributeValue>>
  // les tags propres au personnage ajoutés par le script de récupération à un champ multiple (l'occupation tirée de
  // l'arme au Pixeldle) : une correction à la main ne les retire pas
  added?: Readonly<Record<string, readonly string[]>>
}

export interface Subject {
  id: string
  name: string
  description: string
  attributes: readonly AttributeDef[]
  entries: readonly Entry[]
  // absent = essais illimités
  maxGuesses?: number
  // L'attribut qui distingue deux personnages du même nom (franchise, anime) : « Sam (The Last of Us) »
  universeKey?: string
}
