// Tout ce qu'il faut pour décrire un sujet de quiz. Le moteur ne connaît rien d'autre :
// un nouveau sujet = une liste d'attributs + une liste d'entrées, sans toucher au moteur ni au bot.

// null = l'entrée n'a pas cette valeur (ex : pas de 2e type, habitat inconnu)
export type AttributeValue = string | number | readonly string[] | null

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
}

export interface Entry {
  id: string
  name: string
  // autres noms acceptés pour la proposition (nom anglais...)
  aliases?: readonly string[]
  image?: string
  attributes: Readonly<Record<string, AttributeValue>>
}

export interface Subject {
  id: string
  name: string
  description: string
  attributes: readonly AttributeDef[]
  entries: readonly Entry[]
  // absent = essais illimités
  maxGuesses?: number
}
