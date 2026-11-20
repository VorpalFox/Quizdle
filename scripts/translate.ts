// Traduction en français des indices récupérés en anglais (AniList, Wikipédia EN), faite à la fin des scripts
// de l'Animedle et du Weebdle. Le sexe et les cheveux sont déjà traduits à la lecture (GENDERS, hairColors) :
// il reste les occupations, traduites avec un dictionnaire puis des règles par mot-clé. Celles qui ne passent
// dans aucun restent telles quelles et sont listées à la fin du script : à ajouter ici si c'est générique,
// sinon à corriger perso par perso dans le fichier de corrections (data/*-manual.json).
import type { Entry } from '../src/engine/types.js'

// L'occupation exacte, clés en minuscules. null = pas une occupation, on la retire.
const OCCUPATIONS: Record<string, string | null> = {
  // École
  'student': 'Élève', 'high school student': 'Lycéen', 'first-year high school student': 'Lycéen', 'middle school student': 'Collégien',
  'university student': 'Étudiant', 'college student': 'Étudiant', 'seimei university junior': 'Étudiant',
  'principal': 'Directeur d\'école', 'delving instructor': 'Instructeur', 'student council president': 'Président du conseil des élèves',
  // Armée, police
  'general': 'Général', 'briggs general': 'Général', 'lieutenant': 'Lieutenant', 'sergeant': 'Sergent', 'officer': 'Officier',
  'military officer': 'Officier', 'soldier': 'Soldat', 'scout': 'Éclaireur', 'guard': 'Garde', 'bodyguard': 'Garde du corps',
  'survey corps': 'Bataillon d\'exploration', '104th training corps': 'Recrue', '104th trainees squad': 'Recrue',
  'police officer': 'Policier', 'policeman': 'Policier', 'spy': 'Espion', 'informant': 'Informateur',
  'mercenary': 'Mercenaire', 'assassin': 'Assassin',
  // Fantasy
  'knight': 'Chevalier', 'mage': 'Mage', 'magi': 'Mage', 'magician': 'Magicien', 'wizard': 'Magicien', 'sorcerer': 'Sorcier',
  'sorceress': 'Sorcière', 'witch': 'Sorcière', 'jujutsu sorcerer': 'Exorciste', 'exorcist': 'Exorciste', 'curse user': 'Utilisateur de fléaux',
  'adventurer': 'Aventurier', 'delver': 'Explorateur', 'hunter': 'Chasseur', 'fang hunter': 'Chasseur', 'vampire hunter': 'Chasseur de vampires',
  'demon slayer': 'Pourfendeur de démons', 'warrior': 'Guerrier', 'warrior captain': 'Guerrier', 'swordsman': 'Épéiste', 'swordswoman': 'Épéiste',
  'samurai': 'Samouraï', 'ninja': 'Ninja', 'archer': 'Archer', 'healer': 'Soigneur', 'cleric': 'Clerc', 'priest': 'Prêtre', 'priestess': 'Prêtresse',
  'nun': 'Religieuse', 'monk': 'Moine', 'shrine maiden': 'Miko', 'oracle': 'Oracle', 'fortune teller': 'Voyant',
  'alchemist': 'Alchimiste', 'state alchemist': 'Alchimiste d\'État', 'herbalist': 'Herboriste', 'potion maker': 'Apothicaire',
  'hero': 'Héros', 'pro hero': 'Héros professionnel', 'villain': 'Méchant',
  'pirate': 'Pirate', 'space pirate': 'Pirate de l\'espace', 'thief': 'Voleur', 'criminal': 'Criminel', 'tueur en série': 'Tueur en série',
  'god': 'Dieu', 'goddess': 'Déesse', 'god of war': 'Dieu', 'delivery god': 'Dieu', 'god of calamity': 'Dieu',
  // Noblesse
  'king': 'Roi', 'queen': 'Reine', 'prince': 'Prince', 'princess': 'Princesse', 'emperor': 'Empereur', 'empress': 'Impératrice',
  'noble': 'Noble', 'lord': 'Seigneur', 'lady': 'Dame', 'earl of phantomhive': 'Comte', 'president': 'Président', 'diplomat': 'Diplomate',
  // Métiers
  'doctor': 'Médecin', 'psychiatrist': 'Psychiatre', 'nurse': 'Infirmier', 'veterinarian': 'Vétérinaire',
  'scientist': 'Scientifique', 'researcher': 'Chercheur', 'archaeologist': 'Archéologue', 'oceanographer': 'Océanographe',
  'marine explorer': 'Explorateur', 'inventor': 'Inventeur', 'engineer': 'Ingénieur', 'astronomer': 'Astronome', 'astronaut': 'Astronaute',
  'mechanic': 'Mécanicien', 'mechanics': 'Mécanicien', 'automail mechanic': 'Mécanicien', 'automail technician': 'Mécanicien',
  'lawyer': 'Avocat', 'editorial staff': 'Éditeur', 'communication specialist': 'Spécialiste des communications',
  'writer': 'Écrivain', 'novelist': 'Écrivain', 'manga artist': 'Mangaka', 'mangaka': 'Mangaka', 'artist': 'Artiste',
  'idol': 'Idole', 'singer': 'Chanteur', 'musician': 'Musicien', 'rapper': 'Rappeur', 'actor': 'Acteur', 'actress': 'Actrice',
  'model': 'Mannequin', 'grand couturier': 'Couturier', 'dyeing craftsman': 'Artisan',
  'chef': 'Cuisinier', 'cook': 'Cuisinier', 'maid': 'Servante', 'butler': 'Majordome', 'servant': 'Serviteur',
  'merchant': 'Marchand', 'merchant apprentice': 'Marchand', 'tobacco store clerk': 'Vendeur', 'waitress': 'Serveuse', 'waiter': 'Serveur',
  'office worker': 'Employé de bureau', 'salaryman': 'Employé de bureau', 'city hall clerk': 'Fonctionnaire', 'clerk': 'Employé',
  'real estate agent': 'Agent immobilier', 'truck driver': 'Routier', 'housewife': 'Femme au foyer', 'guide': 'Guide',
  'part-time worker': 'Petits boulots', 'part-timer': 'Petits boulots', 'villager': 'Villageois', 'farmer': 'Fermier',
  'blacksmith': 'Forgeron', 'fisherman': 'Pêcheur', 'sailor': 'Marin', 'navigator': 'Navigateur', 'charcoal burner': 'Charbonnier',
  'hikikomori': 'Chômeur',
  // Sport
  'middle blocker': 'Volleyeur', 'outside hitter': 'Volleyeur', 'setter': 'Volleyeur', 'libero': 'Volleyeur', 'athlete': 'Athlète',
  // Wikidata : déjà en français, ramené à notre vocabulaire
  'idole japonaise': 'Idole', 'femme de ménage': 'Servante', 'dame de compagnie': 'Servante', 'domestique': 'Serviteur',
  'devil hunter': 'Chasseur de démons', 'chasseur de démon': 'Chasseur de démons', 'chasseur de monstre': 'Chasseur',
  'tueur': 'Tueur', 'meurtrier': 'Tueur', 'thug': 'Voyou', 'as de la gâchette': 'Tireur', 'terroriste': 'Terroriste',
  'piqueuse': 'Volleyeur', 'seiyū': 'Doubleur', 'travail à temps partiel': 'Petits boulots', 'travailleur': 'Employé',
  'livreur de pizza': 'Livreur', 'coursier': 'Livreur', 'écolier': 'Élève', 'enseignant': 'Professeur', 'floral designer': 'Fleuriste',
  'caissier': 'Vendeur', 'cosplayer-server': 'Serveur', 'neurologue': 'Médecin', 'pratiquant d\'arts martiaux': 'Artiste martial',
  'personnalité politique': 'Politicien', 'personnalité du monde des affaires': 'Homme d\'affaires', 'conseiller': 'Conseiller',
  'monarque': 'Monarque', 'consort': 'Noble', 'membre de la famille royale': 'Noble', 'courtisane': 'Courtisane',
  'révolutionnaire': 'Révolutionnaire', 'justicier': 'Justicier', 'philanthrope': 'Philanthrope', 'youtubeur': 'Youtubeur',
  'voyageur dans le temps': 'Voyageur temporel', 'tueur de masse': 'Tueur', 'tueur à gages': 'Assassin', 'mob enforcer': 'Voyou',
  'travailleur autonome': 'Indépendant', 'agriculteur': 'Fermier', 'modèle photo': 'Mannequin', 'clairvoyant': 'Voyant',
  'chasseur de fantômes': 'Exorciste', 'généticien': 'Scientifique', 'cosplayeur': 'Cosplayeur', 'boulanger': 'Boulanger',
  'chasseur de primes': 'Chasseur de primes', 'lutteur': 'Lutteur', 'hacker': 'Hacker', 'hypnotiseur': 'Hypnotiseur',
  // Pas des occupations
  'unknown': null, 'test subject': null, 'sujet psi': null,
}

// Sinon, le 1er mot-clé trouvé (en anglais ou en français) : « Owner of the Urahara Shop » → Commerçant
const RULES: [RegExp, string][] = [
  // « Leader of the Phantom Troupe », « Commander of the Secret Mobile Corps », « Gilberta company's master »
  [/\b(?:leader|commander|master|chief|commandant|responsable|führer)\b/, 'Leader'],
  [/\bcaptain\b/, 'Capitaine'],
  [/\bguardian\b/, 'Gardien'],
  [/shinigami|soul reaper|dieu de la mort|god of death/, 'Shinigami'],
  // « Pilote d'EVA », « Stamen » et « Pistil » (les pilotes de DARLING in the FRANXX)
  [/\bpilot|stamen|pistil/, 'Pilote'],
  [/surgeon|chirurgien/, 'Chirurgien'],
  [/teacher|professor|housemaster|headmaster/, 'Professeur'],
  [/detective/, 'Détective'],
  [/\bagent\b/, 'Agent secret'],
  [/magazine|journalist|reporter/, 'Journaliste'],
  [/\bmanager\b/, 'Gérant'],
  [/\b(?:owner|shop|shopkeeper)\b/, 'Commerçant'],
  // Les postes de Tower of God
  [/bearer|wave controller/, 'Combattant'],
  [/super-?h[ée]ro/, 'Super-héros'],
  [/[ée]tudiant/, 'Étudiant'],
  [/\bstudent\b/, 'Élève'],
]

// Les occupations déjà en français (Wikipédia FR, corrections à la main) : on les garde telles quelles
const FRENCH = new Set([...Object.values(OCCUPATIONS), ...RULES.map(([, french]) => french)].flatMap(french => french ? [french.toLowerCase()] : []))

// La traduction, null si ce n'est pas une occupation, undefined si on ne sait pas la traduire
export function translateOccupation(value: string): string | null | undefined {
  const key = value.toLowerCase()
  if (key in OCCUPATIONS)
    return OCCUPATIONS[key]
  if (FRENCH.has(key))
    return value
  return RULES.find(([pattern]) => pattern.test(key))?.[1]
}

// Les occupations des entrées traduites, et celles qui ne sont pas dans le dictionnaire (avec leur nombre).
// `fixedIds` : les personnages dont l'occupation est corrigée à la main, rien à traduire.
export function translateEntries(entries: Entry[], fixedIds: ReadonlySet<string> = new Set()): { entries: Entry[], untranslated: Map<string, number> } {
  const untranslated = new Map<string, number>()
  const translated = entries.map(entry => {
    const occupation = entry.attributes.occupation
    if (!Array.isArray(occupation) || fixedIds.has(entry.id))
      return entry
    const values = (occupation as string[]).flatMap(value => {
      const french = translateOccupation(value)
      if (french === undefined)
        untranslated.set(value, (untranslated.get(value) ?? 0) + 1)
      return french === undefined ? [value] : french === null ? [] : [french]
    })
    const unique = [...new Set(values)]
    return { ...entry, attributes: { ...entry.attributes, occupation: unique.length > 0 ? unique : null } }
  })
  return { entries: translated, untranslated }
}

// Les ids dont le fichier de corrections remplace l'occupation
export function fixedOccupationIds(edit: Record<string, Record<string, unknown>>): Set<string> {
  return new Set(Object.entries(edit).filter(([, changes]) => 'occupation' in changes).map(([id]) => id))
}
