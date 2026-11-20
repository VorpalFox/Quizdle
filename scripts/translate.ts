// Traduction en français des indices récupérés en anglais (AniList, Wikipédia EN), faite à la fin des scripts
// de l'Animedle et du Weebdle. Le sexe et les cheveux sont déjà traduits à la lecture (GENDERS, hairColors) :
// il reste les occupations, traduites avec un dictionnaire. Celles qui n'y sont pas restent telles quelles
// et sont listées à la fin du script : à ajouter ici, ou à corriger à la main.
import type { Entry } from '../src/engine/types.js'

// Clés en minuscules. null = pas une occupation, on la retire.
const OCCUPATIONS: Record<string, string | null> = {
  // École
  'student': 'Élève', 'first-grade student': 'Élève', 'high school student': 'Lycéen', 'middle school student': 'Collégien',
  'university student': 'Étudiant', 'college student': 'Étudiant', 'seimei university junior': 'Étudiant',
  'teacher': 'Professeur', 'middle school teacher': 'Professeur', 'history teacher': 'Professeur', 'homeroom teacher': 'Professeur',
  'professor': 'Professeur', 'college professor': 'Professeur', 'principal': 'Directeur d\'école', 'delving instructor': 'Instructeur',
  'student council president': 'Président du conseil des élèves',
  // Armée, police
  'captain': 'Capitaine', 'commander': 'Commandant', 'vice commander': 'Commandant en second', '13th commander': 'Commandant',
  'general': 'Général', 'briggs general': 'Général', 'lieutenant': 'Lieutenant', 'sergeant': 'Sergent', 'officer': 'Officier',
  'military officer': 'Officier', 'soldier': 'Soldat', 'scout': 'Éclaireur', 'guard': 'Garde', 'bodyguard': 'Garde du corps',
  'survey corps': 'Bataillon d\'exploration', '104th training corps': 'Recrue', '104th trainees squad': 'Recrue',
  'police officer': 'Policier', 'policeman': 'Policier', 'detective': 'Détective', 'spy': 'Espion', 'informant': 'Informateur',
  'intelligence agent': 'Agent de renseignement', 'counterintelligence agent': 'Agent de renseignement',
  'pilot': 'Pilote', 'mercenary': 'Mercenaire', 'assassin': 'Assassin',
  // Fantasy
  'knight': 'Chevalier', 'mage': 'Mage', 'magi': 'Mage', 'magician': 'Magicien', 'wizard': 'Magicien', 'sorcerer': 'Sorcier',
  'sorceress': 'Sorcière', 'witch': 'Sorcière', 'jujutsu sorcerer': 'Exorciste', 'exorcist': 'Exorciste',
  'adventurer': 'Aventurier', 'delver': 'Explorateur', 'hunter': 'Chasseur', 'fang hunter': 'Chasseur', 'demon slayer': 'Pourfendeur de démons',
  'warrior': 'Guerrier', 'warrior captain': 'Guerrier', 'swordsman': 'Épéiste', 'swordswoman': 'Épéiste', 'samurai': 'Samouraï',
  'ninja': 'Ninja', 'archer': 'Archer', 'healer': 'Soigneur', 'cleric': 'Clerc', 'priest': 'Prêtre', 'priestess': 'Prêtresse',
  'nun': 'Religieuse', 'monk': 'Moine', 'shrine maiden': 'Miko', 'oracle': 'Oracle', 'fortune teller': 'Voyant',
  'alchemist': 'Alchimiste', 'state alchemist': 'Alchimiste d\'État', 'herbalist': 'Herboriste', 'potion maker': 'Apothicaire',
  'hero': 'Héros', 'pro hero': 'Héros professionnel', 'superhero': 'Super-héros', 'villain': 'Méchant',
  'pirate': 'Pirate', 'space pirate': 'Pirate de l\'espace', 'thief': 'Voleur', 'criminal': 'Criminel',
  'god': 'Dieu', 'goddess': 'Déesse', 'god of war': 'Dieu', 'delivery god': 'Dieu', 'god of calamity': 'Dieu',
  // Noblesse
  'king': 'Roi', 'queen': 'Reine', 'prince': 'Prince', 'princess': 'Princesse', 'emperor': 'Empereur', 'empress': 'Impératrice',
  'noble': 'Noble', 'lord': 'Seigneur', 'lady': 'Dame', 'earl of phantomhive': 'Comte', 'president': 'Président',
  'lizardmen chief': 'Chef', 'diplomat': 'Diplomate',
  // Métiers
  'doctor': 'Médecin', 'surgeon': 'Chirurgien', 'psychiatrist': 'Psychiatre', 'nurse': 'Infirmier',
  'scientist': 'Scientifique', 'researcher': 'Chercheur', 'archaeologist': 'Archéologue', 'oceanographer': 'Océanographe',
  'marine explorer': 'Explorateur', 'inventor': 'Inventeur', 'engineer': 'Ingénieur',
  'mechanic': 'Mécanicien', 'mechanics': 'Mécanicien', 'automail mechanic': 'Mécanicien', 'automail technician': 'Mécanicien',
  'lawyer': 'Avocat', 'reporter': 'Journaliste', 'journalist': 'Journaliste', 'editorial staff': 'Éditeur',
  'writer': 'Écrivain', 'novelist': 'Écrivain', 'manga artist': 'Mangaka', 'mangaka': 'Mangaka', 'artist': 'Artiste',
  'idol': 'Idole', 'singer': 'Chanteur', 'musician': 'Musicien', 'rapper': 'Rappeur', 'actor': 'Acteur', 'actress': 'Actrice',
  'model': 'Mannequin', 'grand couturier': 'Couturier', 'dyeing craftsman': 'Artisan',
  'chef': 'Cuisinier', 'cook': 'Cuisinier', 'maid': 'Servante', 'butler': 'Majordome', 'servant': 'Serviteur',
  'merchant': 'Marchand', 'merchant apprentice': 'Marchand', 'shopkeeper': 'Commerçant', 'tobacco store clerk': 'Vendeur',
  'office worker': 'Employé de bureau', 'salaryman': 'Employé de bureau', 'city hall clerk': 'Fonctionnaire', 'clerk': 'Employé',
  'real estate agent': 'Agent immobilier', 'truck driver': 'Routier', 'housewife': 'Femme au foyer', 'guide': 'Guide',
  'part-time worker': 'Petits boulots', 'part-timer': 'Petits boulots', 'villager': 'Villageois', 'farmer': 'Fermier',
  'blacksmith': 'Forgeron', 'fisherman': 'Pêcheur', 'sailor': 'Marin', 'navigator': 'Navigateur', 'charcoal burner': 'Charbonnier',
  'waitress': 'Serveuse', 'waiter': 'Serveur', 'veterinarian': 'Vétérinaire', 'astronomer': 'Astronome', 'astronaut': 'Astronaute',
  'vampire hunter': 'Chasseur de vampires', 'communication specialist': 'Spécialiste des communications',
  'first-year high school student': 'Lycéen', 'student at u.a. high school': 'Élève', 'student at tokyo jujutsu high': 'Élève',
  'captain of the black bulls': 'Capitaine', '2nd division soul reaper captain': 'Capitaine', 'curse user': 'Utilisateur de fléaux',
  // Sport
  'middle blocker': 'Volleyeur', 'outside hitter': 'Volleyeur', 'setter': 'Volleyeur', 'libero': 'Volleyeur', 'athlete': 'Athlète',
  // Pas des occupations
  'unknown': null, 'test subject': null,
}

// La traduction, sinon la valeur telle quelle. undefined = pas dans le dictionnaire.
export function translateOccupation(value: string): string | null | undefined {
  return OCCUPATIONS[value.toLowerCase()]
}

// Les occupations des entrées traduites, et celles qui ne sont pas dans le dictionnaire (avec leur nombre)
export function translateEntries(entries: Entry[]): { entries: Entry[], untranslated: Map<string, number> } {
  const untranslated = new Map<string, number>()
  const translated = entries.map(entry => {
    const occupation = entry.attributes.occupation
    if (!Array.isArray(occupation))
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
