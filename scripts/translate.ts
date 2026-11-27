// Traduction en français des indices récupérés en anglais (AniList, Wikipédia EN), faite à la fin des scripts
// de l'Animedle et du Weebdle. Le sexe et les cheveux sont déjà traduits à la lecture (GENDERS, hairColors) :
// il reste les occupations, traduites avec un dictionnaire puis des règles par mot-clé. Celles qui ne passent
// dans aucun restent telles quelles et sont listées à la fin du script : à ajouter ici si c'est générique,
// sinon à corriger perso par perso dans le fichier de corrections (data/*-manual.json). Après les corrections, l'arme
// du perso s'ajoute et les synonymes sont regroupés en familles (finishOccupations) : les corrections s'écrivent donc
// avec les valeurs regroupées (Étudiant, pas Lycéen).
import type { AttributeValue, Entry } from '../src/engine/types.js'
import { isSetEdit } from '../src/subjects/manual.js'
import { COMPANY_PRESIDENT, expandSpecies, translateSpecies } from './pixeldleTranslate.js'
import { OCCUPATION_FAMILIES, withFamilies } from './occupationFamilies.js'

// L'occupation exacte, clés en minuscules. null = pas une occupation, on la retire.
const OCCUPATIONS: Record<string, string | null> = {
  // École
  // « General Student » : un élève ordinaire (Xuan Ku, Immortal King), pas un général
  'student': 'Pupil', 'general student': 'Pupil', 'high school student': 'High schooler', 'first-year high school student': 'High schooler', 'middle school student': 'Middle schooler',
  'university student': 'Student', 'college student': 'Student', 'seimei university junior': 'Student',
  'principal': 'Principal', 'delving instructor': 'Instructor', 'student council president': 'Student council president',
  // Armée, police
  'general': 'General', 'briggs general': 'General', 'lieutenant': 'Lieutenant', 'sergeant': 'Sergeant', 'officer': 'Officer',
  'private': 'Soldier', 'admiral': 'Officer', 'commodore': 'Officer', 'ensign': 'Officer',
  'military officer': 'Officer', 'soldier': 'Soldier', 'corporal': 'Soldier', 'scout': 'Scout', 'guard': 'Guard', 'bodyguard': 'Bodyguard',
  'survey corps': 'Survey Corps', '104th training corps': 'Recruit', '104th trainees squad': 'Recruit',
  'police officer': 'Police officer', 'policeman': 'Police officer', 'spy': 'Spy', 'informant': 'Informant',
  'mercenary': 'Mercenary', 'assassin': 'Assassin',
  // Fantasy
  'knight': 'Knight', 'mage': 'Mage', 'magi': 'Mage', 'magician': 'Mage', 'wizard': 'Mage', 'sorcerer': 'Sorcerer',
  'sorceress': 'Witch', 'witch': 'Witch', 'jujutsu sorcerer': 'Exorcist', 'exorcist': 'Exorcist', 'curse user': 'Curse user',
  'adventurer': 'Adventurer', 'delver': 'Explorer', 'hunter': 'Hunter', 'fang hunter': 'Hunter', 'vampire hunter': 'Vampire hunter',
  'demon slayer': 'Demon Slayer', 'warrior': 'Warrior', 'warrior captain': 'Warrior', 'swordsman': 'Swordsman', 'swordswoman': 'Swordsman',
  'samurai': 'Samurai', 'ninja': 'Ninja', 'archer': 'Archer', 'healer': 'Healer', 'cleric': 'Cleric', 'priest': 'Priest', 'priestess': 'Priestess',
  'nun': 'Nun', 'monk': 'Monk', 'shrine maiden': 'Miko', 'miko': 'Miko', 'oracle': 'Oracle', 'fortune teller': 'Seer',
  'alchemist': 'Alchemist', 'state alchemist': 'Alchemist', 'herbalist': 'Herbalist', 'potion maker': 'Apothecary',
  'hero': 'Hero', 'pro hero': 'Pro hero', 'villain': 'Villain',
  'pirate': 'Pirate', 'space pirate': 'Space pirate', 'thief': 'Thief', 'criminal': 'Criminal', 'tueur en série': 'Serial killer',
  'god': 'God', 'goddess': 'Goddess', 'god of war': 'God', 'delivery god': 'God', 'god of calamity': 'God',
  // Yama, dieu de la mort et roi des Enfers bouddhiste (Yan Xiaoluo, Immortal King)
  'yama': 'God',
  // Noblesse
  'king': 'King', 'queen': 'Queen', 'prince': 'Prince', 'princess': 'Princess', 'emperor': 'Emperor', 'empress': 'Empress',
  'noble': 'Noble', 'lord': 'Lord', 'lady': 'Lady', 'earl of phantomhive': 'Count', 'president': 'President', 'diplomat': 'Diplomat',
  // Métiers
  'doctor': 'Doctor', 'psychiatrist': 'Psychiatrist', 'nurse': 'Nurse', 'veterinarian': 'Veterinarian',
  'scientist': 'Scientist', 'researcher': 'Researcher', 'scholar': 'Researcher', 'archaeologist': 'Archaeologist', 'oceanographer': 'Oceanographer',
  'marine explorer': 'Explorer', 'inventor': 'Inventor', 'engineer': 'Engineer', 'astronomer': 'Astronomer', 'astronaut': 'Astronaut',
  'mechanic': 'Mechanic', 'mechanics': 'Mechanic', 'automail mechanic': 'Mechanic', 'automail technician': 'Mechanic',
  'lawyer': 'Lawyer', 'editorial staff': 'Editor', 'communication specialist': 'Communications specialist',
  'writer': 'Writer', 'novelist': 'Writer', 'manga artist': 'Mangaka', 'mangaka': 'Mangaka', 'artist': 'Artist',
  'idol': 'Idol', 'singer': 'Singer', 'musician': 'Musician', 'rapper': 'Rapper', 'actor': 'Actor', 'actress': 'Actress',
  'model': 'Model', 'grand couturier': 'Tailor', 'dyeing craftsman': 'Artisan',
  'chef': 'Cook', 'cook': 'Cook', 'maid': 'Maid', 'butler': 'Butler', 'servant': 'Manservant',
  'merchant': 'Trader', 'merchant apprentice': 'Trader', 'leherl': 'Trader','tobacco store clerk': 'Salesperson', 'waitress': 'Waitress', 'waiter': 'Waiter',
  'office worker': 'Office worker', 'salaryman': 'Office worker', 'city hall clerk': 'Civil servant', 'clerk': 'Employee',
  'real estate agent': 'Real estate agent', 'truck driver': 'Trucker', 'housewife': 'Homemaker', 'guide': 'Guide',
  'part-time worker': 'Odd jobs', 'part-timer': 'Odd jobs', 'villager': 'Villager', 'farmer': 'Farmer',
  'blacksmith': 'Blacksmith', 'fisherman': 'Fisher', 'sailor': 'Sailor', 'navigator': 'Navigator', 'charcoal burner': 'Charcoal seller',
  'hikikomori': 'Unemployed',
  // Sport
  'middle blocker': 'Volleyball player', 'outside hitter': 'Volleyball player', 'setter': 'Volleyball player', 'libero': 'Volleyball player', 'athlete': 'Athlete',
  // Wikidata : déjà en français, ramené à notre vocabulaire
  'idole japonaise': 'Idol', 'femme de ménage': 'Maid', 'dame de compagnie': 'Maid', 'domestique': 'Manservant',
  'devil hunter': 'Demon hunter', 'chasseur de démon': 'Demon hunter', 'chasseur de monstre': 'Hunter',
  'tueur': 'Killer', 'meurtrier': 'Killer', 'thug': 'Thug', 'as de la gâchette': 'Marksman', 'terroriste': 'Terrorist',
  'piqueuse': 'Volleyball player', 'seiyū': 'Voice actor', 'travail à temps partiel': 'Odd jobs', 'travailleur': 'Employee',
  'livreur de pizza': 'Courier', 'coursier': 'Courier', 'écolier': 'Pupil', 'enseignant': 'Teacher', 'floral designer': 'Florist',
  'caissier': 'Salesperson', 'cosplayer-server': 'Waiter', 'neurologue': 'Doctor', 'pratiquant d\'arts martiaux': 'Martial artist',
  'personnalité politique': 'Politician', 'personnalité du monde des affaires': 'Businessperson', 'conseiller': 'Advisor',
  'monarque': 'Monarch', 'consort': 'Noble', 'membre de la famille royale': 'Noble', 'courtisane': 'Courtesan',
  'révolutionnaire': 'Revolutionary', 'justicier': 'Vigilante', 'philanthrope': 'Philanthropist', 'youtubeur': 'YouTuber',
  'voyageur dans le temps': 'Time traveler', 'tueur de masse': 'Killer', 'tueur à gages': 'Assassin', 'mob enforcer': 'Thug',
  'travailleur autonome': 'Freelancer', 'agriculteur': 'Farmer', 'modèle photo': 'Model', 'clairvoyant': 'Seer',
  'chasseur de fantômes': 'Exorcist', 'généticien': 'Scientist', 'cosplayeur': 'Cosplayer', 'boulanger': 'Baker',
  'chasseur de primes': 'Bounty hunter', 'lutteur': 'Wrestler', 'hacker': 'Hacker', 'hypnotiseur': 'Hypnotist',
  'militaire': 'Soldier', 'officier général': 'General', 'procureur': 'Lawyer', 'gourou': 'Cleric', 'dirigeant': 'Leader',
  'personnalité du monde de la mode': 'Model', 'orthésiste': 'Mechanic', 'chauffeur de maître': 'Driver',
  'bouteiller': 'Manservant', 'tortionnaire': 'Torturer',
  // Repérées en cumulant les sources (les valeurs intraduisibles d'une source suivante sont laissées de côté)
  'courtesan': 'Courtesan', 'terrorist': 'Terrorist', 'fashion model': 'Model', 'gravure model': 'Model',
  'apothecary': 'Apothecary', 'dyer': 'Artisan', 'archeoligist': 'Archaeologist', 'digger': 'Worker', 'hermit': 'Hermit',
  'martial artist': 'Martial artist', 'tobacconist': 'Salesperson', 'barista': 'Waiter', 'strategist': 'Strategist',
  'serving woman': 'Maid', 'sales position': 'Salesperson', 'rallyist': 'Pilot', 'driver': 'Driver', 'psychotherapist': 'Psychiatrist',
  // Death Parade : les arbitres (Decim, Ginti, Quin…), barmans à leurs heures ; le barman sert, comme le serveur
  'arbiter': 'Arbiter', 'bartender': 'Bartender',
  // Pas des occupations
  'test subject': null, 'normal person': null, 'sujet psi': null,
  // Assumé par la source : « Unknown » donne Inconnu, « None » donne Aucune. Rien de trouvé, c'est vide (validé avec FX).
  'unknown': 'Unknown', 'none': 'None',
}

// Sinon, le 1er mot-clé trouvé (en anglais ou en français) : « Owner of the Urahara Shop » → Commerçant.
// Les cas précis d'abord, puis les grandes familles de métiers. null : pas une occupation, on la retire.
const RULES: [RegExp, string | null][] = [
  // Avant les métiers du nom de l'entreprise (« President of Rude Mercenary Company » n'est pas un mercenaire)
  [COMPANY_PRESIDENT, 'Company president'],
  // Les Servants et les Masters de Fate : des esprits invoqués et leurs invocateurs, pas des domestiques ni des chefs
  [/-class servant|servant class|knight class|\bmaster of (?:\w+-class|saber|archer|lancer|rider|caster|assassin|berserker)\b/, null],
  [/yakuza|mafi|crime boss|\bgang|\bthug|enforcer|drug dealer|trafficker|underboss/, 'Mobster'],
  // L'élève d'une école, quelle qu'elle soit (« Student of Midgar Academy for Dark Knights » n'est pas un chevalier),
  // le domestique en chef (« Head servant of the Kirishiki family »), le garde du corps d'un prince
  [/^students? (?:of|at)\b/, 'Pupil'],
  [/^head (?:servant|maid|butler)\b/, 'Manservant'],
  // Le prof principal d'une classe (« Elite Class Head Teacher », Pan Shengcong à Immortal King) : un prof, pas un chef
  [/\bhead ?teacher\b/, 'Teacher'],
  [/\broyal (?:body)?guard/, 'Guard'],
  // L'aide de camp d'un officier, même dans une armée royale (Miller Greyler, Uncle from Another World) : pas un noble
  [/\badjutant\b/, 'Officer'],
  // Les piliers et disciples de Demon Slayer (« Water Hashira »)
  [/hashira|tsuguko|demon slayer/, 'Demon Slayer'],
  // Et les chasseurs d'esprits de The World God Only Knows (« Runaway Spirit Squad Agent », « Buddy - Spirit Capturing »)
  [/(?:devil|demon) hunter|chasseur de d[ée]mon|runaway spirit|spirit captur/, 'Demon hunter'],
  // « Idol » partout (« Roller-coaster Idol », Kanon) : une idole, pas seulement une célébrité
  [/\bidols?\b/, 'Idol'],
  // Les bibliothécaires, et le comité de la bibliothèque des lycées (Shiori, The World God Only Knows)
  [/librarian|library committee/, 'Librarian'],
  // Le club d'art du lycée (« Loop Art Club Member », Sora, The World God Only Knows) : une artiste
  [/\bart club\b/, 'Artist'],
  // Les démons de Chainsaw Man (« Wild Devil », « Contract Devil ») : ce qu'ils sont en guise de rôle (validé avec FX)
  [/\bdevils?$/, 'Demon'],
  // The World God Only Knows : « Track and Field Club Girl » (Ayumi), « Café Owner » (Mari, un Barman, donc aussi Serveur),
  // « Chauffeur of Mio Aoyama » (Morita), « Private Household Demon » (Elucia, qui tient la maison ; pas « household »
  // seul, souvent la maison noble qu'on sert ou dirige)
  [/\bathletics\b/, 'Athlete'],
  [/\b(?:caf[ée]|bar) owner\b/, 'Bartender'],
  [/\bchauffeur\b/, 'Driver'],
  [/^private household demon$/, 'Maid'],
  [/serial killer|mass murderer/, 'Serial killer'],
  [/magical ?☆?girl/, 'Magical girl'],
  // « Leader of the Phantom Troupe », « Commander of the Secret Mobile Corps », « CEO of Seventh Heaven », « Head of the Tendo Family »
  [/\b(?:leader|commander|master|chief|chieftain|commandant|responsable|führer|head|ceo|chairman|chair|director|executive|boss|founder|administrator|supervisor|overseer|mayor|governor|minister)\b/, 'Leader'],
  [/\bcaptain\b/, 'Captain'],
  [/\bguardians?\b/, 'Guardian'],
  [/shinigami|soul reaper|dieu de la mort|god of death/, 'Shinigami'],
  // « Pilote d'EVA », « Stamen » et « Pistil » (les pilotes de DARLING in the FRANXX)
  [/\bpilot|stamen|pistil/, 'Pilot'],
  [/surgeon|chirurgien/, 'Surgeon'],
  [/teacher|professor|housemaster|headmaster|instructor|lecturer|mentor|caretaker|tutor|\bcoach|trainer|principal/, 'Teacher'],
  [/detective|investigator|inspector/, 'Detective'],
  [/\bspy\b|espionage|counterintelligence|intelligence/, 'Spy'],
  [/\bagent\b/, 'Secret agent'],
  [/magazine|journalist|reporter|announcer/, 'Journalist'],
  // Le manager de quelqu'un (« Kanon's Manager », « Talent Manager », Ijichi l'« Assistant Manager » des exorcistes de
  // JUJUTSU KAISEN) l'assiste ; celui d'un lieu (« Store Manager ») le dirige
  [/'s manager\b|\b(?:assistant|talent|personal) manager\b/, 'Assistant'],
  [/\bmanager\b/, 'Manager'],
  // Le propriétaire d'un commerce seulement : pas « owner of the Giftia » (le maître d'un robot)
  [/\b(?:shop|shopkeeper|store|mart|restaurant|café|cafe|inn|bar)\b|^owner$/, 'Merchant'],
  // Les postes de Tower of God
  [/bearer|wave controller/, 'Fighter'],
  [/super-?h[ée]ro/, 'Superhero'],
  // Pas les Knightmare Frames de Code Geass
  [/\bknight(?!mare)|crusader|paladin/, 'Knight'],
  // Pas « one of the Devil King's Generals » : au service du roi
  [/\b(?:king|emperor|monarch|ruler|warlord|dictator|tyrant)\b(?!'s)/, 'King'],
  [/\b(?:queen|empress)\b(?!'s)/, 'Queen'],
  [/princess|heiress/, 'Princess'],
  [/\bprince\b|\bheir\b/, 'Prince'],
  [/royal guard/, 'Guard'],
  // « Lady » en titre seulement (« Lady of the Night Castle ») : « a proper young lady » (Kirari, Kakegurui) n'est pas noble
  [/\b(?:duke|duchess|lord|noble|royal|royalty|earl|baron|margrave|aristocrat)\b|^lady\b|\blady of\b/, 'Noble'],
  [/sniper|marksman|gunman|shooter|gâchette/, 'Marksman'],
  // « Magic swordman » aussi, sans s (Amyu)
  [/swords?(?:wo)?m[ae]n/, 'Swordsman'],
  [/exorcist/, 'Exorcist'],
  [/\bbull(?:y|ies)\b|delinquent/, 'Thug'],
  [/\b(?:soldier|combatant|warrior|warrrior|fighter|gladiator|duelist|raider|attacker|tank|spotter|initiator|mercenary|shinobi)s?\b/, 'Fighter'],
  [/\b(?:general|major|lieutenant|sergeant|colonel|officer)s?\b/, 'Officer'],
  [/\b(?:guard|bodyguard|gatekeeper|security|sentinel)s?\b/, 'Guard'],
  [/butler/, 'Butler'],
  // « Tamer », « Monster Tamer » (Ro Nny)
  [/\btamer\b/, 'Trainer'],
  // « the nanny of all the orphans of Zari Bars » (Sis)
  [/\bnann(?:y|ies)\b|babysitter/, 'Nanny'],
  [/\bmaid|handmaiden|lady-in-waiting|housekeeper/, 'Maid'],
  [/\b(?:servant|steward|retainer|attendant|valet)\b/, 'Manservant'],
  [/musician|vocalist|guitarist|drummer|bassist|pianist|composer|violinist|\bband\b|beatbox/, 'Musician'],
  // « TV personality », pas le caractère (« gained a different personality »)
  [/\b(?:idol|celebrity|influencer|youtuber|tiktoker|streamer|(?:tv|television|radio|media|internet|online) personality|talk show host|radio host|entertainer|actor|actress)\b/, 'Celebrity'],
  [/\bconsultant\b/, 'Advisor'],
  // Pas un rôle de jeu (« DoT Dealer », « Close-Range Dealer » : The First Descendant)
  [/merchant|trader|salesman|saleswoman|(?<!(?:dot|damage|utility|range|dps|burst|area|sub)[ -])dealer|businessman|businesswoman|broker|peddler/, 'Trader'],
  [/scientist|researcher|engineer|technician|analyst|programmer|botanist|pharmacist|chemist|physicist|inventor/, 'Scientist'],
  [/physician|doctor|nurse|medic|psychiatrist|counsel/, 'Doctor'],
  [/writer|author|editor|novelist|poet|mangaka/, 'Writer'],
  [/\b(?:slave|livestock)\b/, 'Slave'],
  [/prisoner|inmate/, 'Prisoner'],
  [/unemployed|\bneet\b|homeless/, 'Unemployed'],
  [/con ?-?artist|con ?man|hustler|thief|robber|swindler|pickpocket/, 'Thief'],
  [/killer|murderer|assassin|hitman|hitwoman/, 'Assassin'],
  [/magician|\bmage\b|magus|sorcerer|sorceress|witch|wizard|\bmagi\b|warlock/, 'Mage'],
  [/priest|bishop|monk|\bnun\b|miko|shrine|apostle|guru|cleric|religious/, 'Cleric'],
  [/athlete|player|runner|skater|gymnast|pitcher|racer|swimmer|boxer|wrestler/, 'Athlete'],
  [/farmer|farming|gardener|woodcutter|carpenter|\bbakers?\b|seamstress|tailor|hairdresser|florist|bartender|photographer|swordsmith|blacksmith|craftsman|artisan|\bcook\b|\bchef\b/, 'Artisan'],
  [/worker|clerk|cashier|employee|\bstaff\b|operator|receptionist|secretary|office lady|accountant|delivery|courier/, 'Employee'],
  [/assistant|\baide\b|sidekick|\bbuddy\b|right-hand|adviser|advisor|apprentice|subordinate|attaché/, 'Assistant'],
  [/traveler|traveller|nomad|wanderer/, 'Traveler'],
  [/\bpresident\b|representative|second-in-command/, 'Leader'],
  // Les Collectors de Gleipnir chassent les pièces de l'Alien
  [/\bhunter\b|\bcollectors?\b/, 'Hunter'],
  [/\bhero(?:ine)?\b|vassal weapon/, 'Hero'],
  [/supervillain|villain/, 'Villain'],
  [/waitress|waiter|hostess/, 'Waiter'],
  [/singer|vocals/, 'Singer'],
  [/astronaut|cosmonaut/, 'Astronaut'],
  [/politician|senator|ambassador|diplomat|chancellor|official|prelate/, 'Politician'],
  [/attorney|prosecutor|lawyer/, 'Lawyer'],
  [/firefighter/, 'Firefighter'],
  [/bandit/, 'Thief'],
  [/game (?:designer|planner|tester)|producer|promoter/, 'Employee'],
  [/house ?wife|house spouse/, 'Homemaker'],
  [/[ée]tudiant/, 'Student'],
  [/\bstudents?\b|schooler|freshman|pupil|high school|class representative|homeroom|classmates?/, 'Pupil'],
  // Le nom de l'école à la place du rôle (« Private Aichi Symbiosis Academy (Junior High Division) ») : un élève
  [/\b(?:academy|school|gakuen|gakuin)$/, 'Pupil'],
  // Pas des occupations : animaux, valeurs vides
  [/\bpet\b|housepet|familiar|\bspoilers?\b|^none$|^current$|^former$|^inc$|^npc$/, null],
  // Une appartenance à un groupe, pas un métier (« Member of the SSS », « 3rd Seat of the Seven Shadows »)
  [/\b(?:member|members|seat|crew|team|squad|council|cast|division|committee|corps|group)\b/, null],
]

// Nos anciennes valeurs françaises, que Wikipédia FR donne telles quelles (« Collégien », « Soldat ») : leur anglais
const FROM_FRENCH: Record<string, string> = {
  'étudiant': 'Student', 'combattant': 'Fighter', 'soldat': 'Soldier', 'magicien': 'Mage', 'épéiste': 'Swordsman',
  'scientifique': 'Scientist', 'criminel': 'Criminal', 'dirigeant': 'Leader', 'souverain': 'Royalty',
  'professeur': 'Teacher', 'artiste': 'Artist', 'chasseur de monstres': 'Monster hunter', 'tireur': 'Marksman',
  'pilote': 'Pilot', 'garde': 'Guard', 'aventurier': 'Adventurer', 'domestique': 'Servant', 'employé': 'Employee',
  'espion': 'Spy', 'commerçant': 'Merchant', 'musicien': 'Musician', 'médecin': 'Doctor', 'officier': 'Officer',
  'mercenaire': 'Mercenary', 'religieux': 'Cleric', 'chevalier': 'Knight', 'détective': 'Detective',
  'politicien': 'Politician', 'serveur': 'Waiter', 'justicier': 'Vigilante', 'héros': 'Hero',
  'révolutionnaire': 'Revolutionary', 'ouvrier': 'Worker', 'célébrité': 'Celebrity', 'chasseur': 'Hunter',
  "homme d'affaires": 'Businessperson', 'sportif': 'Athlete', 'voleur': 'Thief', 'policier': 'Police officer',
  'acteur': 'Actor', 'exorciste': 'Exorcist', 'survivant': 'Survivor', 'capitaine': 'Captain', 'chanteur': 'Singer',
  'conseiller': 'Advisor', 'super-héros': 'Superhero', 'écrivain': 'Writer', 'journaliste': 'Journalist',
  'chasseur de démons': 'Demon hunter', 'informaticien': 'Programmer', "tireur d'élite": 'Sniper', 'avocat': 'Lawyer',
  'mécanicien': 'Mechanic', 'mafieux': 'Mobster', 'lancier': 'Lancer', 'pourfendeur de démons': 'Demon Slayer',
  'cuisinier': 'Cook', 'chauffeur': 'Driver', 'président': 'President', 'terroriste': 'Terrorist', 'fermier': 'Farmer',
  'dresseur': 'Trainer', 'chasseur de primes': 'Bounty hunter', 'chasseur de trésor': 'Treasure hunter',
  'mannequin': 'Model', 'astronaute': 'Astronaut', 'chômeur': 'Unemployed', 'prédateur': 'Predator', 'idole': 'Idol',
  'érudit': 'Scholar', 'archéologue': 'Archaeologist', 'esclave': 'Slave', 'compagnon': 'Companion', 'marin': 'Sailor',
  'chasseur de vampires': 'Vampire hunter', 'femme au foyer': 'Homemaker', 'dieu': 'God', 'gérant': 'Manager',
  'alchimiste': 'Alchemist', 'voyou': 'Thug', 'artiste martial': 'Martial artist', 'éclaireur': 'Scout',
  'président du conseil des élèves': 'Student council president', 'barman': 'Bartender', 'ingénieur': 'Engineer',
  'petits boulots': 'Odd jobs', 'voyageur temporel': 'Time traveler', 'courtisane': 'Courtesan',
  'destructeur': 'Destroyer', 'tueur en série': 'Serial killer', 'volleyeur': 'Volleyball player',
  "bataillon d'exploration": 'Survey Corps', 'livreur': 'Courier', 'samouraï': 'Samurai', 'protecteur': 'Protector',
  'méchant': 'Villain', 'prisonnier': 'Prisoner', 'gardien': 'Guardian', 'psychiatre': 'Psychiatrist',
  'apothicaire': 'Apothecary', 'prostitué': 'Prostitute', 'voyant': 'Seer', 'arbitre': 'Arbiter',
  'inventeur': 'Inventor', 'sergent': 'Sergeant', 'utilisateur de fléaux': 'Curse user', 'informateur': 'Informant',
  'agent immobilier': 'Real estate agent', 'chirurgien': 'Surgeon', 'démon': 'Demon', 'pêcheur': 'Fisher',
  'bibliothécaire': 'Librarian', 'forgeron': 'Blacksmith', 'plombier': 'Plumber', 'sorceleur': 'Witcher',
  'charbonnier': 'Charcoal seller', 'astronome': 'Astronomer', 'diplomate': 'Diplomat',
  'philanthrope': 'Philanthropist', 'ermite': 'Hermit', 'navigateur': 'Navigator', 'fléau': 'Curse',
  "directeur d'école": 'Principal', 'vétérinaire': 'Veterinarian', 'retraité': 'Retiree', 'comte': 'Count',
  'tortionnaire': 'Torturer', 'doubleur': 'Voice actor', 'routier': 'Trucker', 'fleuriste': 'Florist',
  'spécialiste des communications': 'Communications specialist', 'indépendant': 'Freelancer', 'couturier': 'Tailor',
  'nourrice': 'Nanny', 'éditeur': 'Editor', 'youtubeur': 'YouTuber', 'pompier': 'Firefighter',
  'stratège': 'Strategist', 'cosplayeur': 'Cosplayer', 'lutteur': 'Wrestler', 'hypnotiseur': 'Hypnotist',
  'croque-mort': 'Undertaker', 'actrice': 'Actress', 'agent secret': 'Secret agent', 'athlète': 'Athlete',
  'boulanger': 'Baker', 'chef de clan': 'Clan leader', 'chercheur': 'Researcher', 'clerc': 'Cleric',
  'collégien': 'Middle schooler', 'dame': 'Lady', 'déesse': 'Goddess', 'empereur': 'Emperor',
  'employé de bureau': 'Office worker', 'explorateur': 'Explorer', 'fonctionnaire': 'Civil servant',
  'garde du corps': 'Bodyguard', 'guerrier': 'Warrior', 'général': 'General', 'herboriste': 'Herbalist',
  'héros professionnel': 'Pro hero', 'impératrice': 'Empress', 'infirmier': 'Nurse', 'instructeur': 'Instructor',
  'lycéen': 'High schooler', 'magicienne': 'Magician', 'majordome': 'Butler', 'marchand': 'Trader', 'moine': 'Monk',
  'monarque': 'Monarch', 'océanographe': 'Oceanographer', 'princesse': 'Princess', 'prêtre': 'Priest',
  'prêtresse': 'Priestess', 'rappeur': 'Rapper', 'recrue': 'Recruit', 'reine': 'Queen', 'religieuse': 'Nun',
  'roi': 'King', 'seigneur': 'Lord', 'servante': 'Maid', 'serveuse': 'Waitress', 'serviteur': 'Manservant',
  'soigneur': 'Healer', 'sorcier': 'Sorcerer', 'sorcière': 'Witch', 'tueur': 'Killer', 'vendeur': 'Salesperson',
  'inconnu': 'Unknown', 'aucune': 'None', 'villageois': 'Villager', 'voyageur': 'Traveler', 'élève': 'Pupil', "pirate de l'espace": 'Space pirate',
}

// Le nom français d'une de nos valeurs (la 1re de la table : la valeur finale plutôt qu'un synonyme regroupé). Pour les
// règles du Pixeldle, qui lisent le français de Wikidata : « Psychiatrist » → « psychiatre » → Doctor, comme avant
let frenchNames: Map<string, string> | undefined
export function frenchOccupation(english: string): string | undefined {
  frenchNames ??= new Map(Object.entries(FROM_FRENCH).reverse().map(([french, value]) => [value, french]))
  return frenchNames.get(english)
}

// Les occupations déjà traduites (corrections à la main, école, armes, titres) : gardées telles quelles si aucune règle
// ne les prend, et écrites exactement comme nos valeurs, majuscule comprise. Les sources aussi sont en anglais : leur
// « Editor » ou leur « Advisor » passent par les règles comme avant (Writer, Assistant)
let outputs: Set<string> | undefined
const isOurs = (value: string) => (outputs ??= new Set([...Object.values(OCCUPATIONS), ...RULES.map(([, english]) => english),
  ...Object.values(OCCUPATION_MERGES), ...Object.values(OCCUPATION_FAMILIES).flat()].flatMap(english => english ? [english] : []))).has(value)

// La traduction, null si ce n'est pas une occupation, undefined si on ne sait pas la traduire
export function translateOccupation(value: string): string | null | undefined {
  // « ・Slave », « Legendary Hero Former », « Former Attorney » → sans les puces ni « former »
  const key = value.toLowerCase().replace(/^[\s・*•-]+/, '').replace(/^former\s+|\s+former$/, '').trim()
  if (key in OCCUPATIONS)
    return OCCUPATIONS[key]
  if (key in FROM_FRENCH)
    return FROM_FRENCH[key]
  const rule = RULES.find(([pattern]) => pattern.test(key))?.[1]
  const plain = value.replace(/^[\s・*•-]+/, '').trim()
  if (rule === undefined && isOurs(plain))
    return plain
  // « One of the Three Beasts » : une appartenance à un groupe, pas un métier, sauf si le groupe en est un (« One of the Generals »)
  const group = key.match(/^one of the\s+(.+)$/)?.[1]
  if (group && rule === undefined)
    return translateOccupation(group) ?? null
  // « Leherl at the Gilberta Company » (Tuuli) : le métier, sans l'endroit où il l'exerce
  const job = key.match(/^(.+?)\s+at\s+(?:the\s+)?\S.*$/)?.[1]
  return job && rule === undefined ? translateOccupation(job) : rule
}

// --- Cumul des sources ---

// Les sources passent dans l'ordre (AniList, Wikidata, Fandom, Wikipédia). Occupation, espèce, cheveux et arme : chacune
// ajoute ses valeurs, on n'en a pas de plus fiable et ce sont des listes (validé avec FX). Venant d'une source suivante,
// une occupation qu'on ne sait pas traduire est laissée de côté (« Aub Alexandria's First Husband ») : seule la 1re
// garde la sienne, listée dans le récap pour être traduite. Sexe, âge et taille : la 1re source qui en a un.
const CUMULATIVE_KEYS = new Set(['occupation', 'species', 'hair', 'weapon'])
const isEmpty = (value: AttributeValue | undefined) => value === null || value === undefined

// Ce qu'une source ajoute aux attributs : les champs vides, et les valeurs en plus des champs cumulés
export function addedValues(current: Readonly<Record<string, AttributeValue>>, values: Readonly<Record<string, AttributeValue>>): Record<string, AttributeValue> {
  const added: Record<string, AttributeValue> = {}
  for (const [key, value] of Object.entries(values)) {
    const before = current[key]
    if (isEmpty(value))
      continue
    if (isEmpty(before)) {
      added[key] = value
      continue
    }
    if (!CUMULATIVE_KEYS.has(key) || !Array.isArray(before) || !Array.isArray(value))
      continue
    const extra = (value as string[]).filter(item => !before.includes(item) && (key !== 'occupation' || translateOccupation(item) !== undefined))
    if (extra.length > 0)
      added[key] = [...before, ...extra]
  }
  return added
}

// Les occupations des entrées traduites, et celles qui ne sont pas dans le dictionnaire (avec leur nombre).
// `corrected` : les personnages dont l'occupation est corrigée à la main (manualOccupations). Les valeurs que la
// correction retire restent telles quelles, pour qu'elle les trouve ; le reste est traduit (les sources cumulées
// ajoutent des valeurs en anglais), sans lister ce qui ne l'est pas : c'est déjà relu.
export function translateEntries(entries: Entry[], corrected: ReadonlyMap<string, ReadonlySet<string>> = new Map()): { entries: Entry[], untranslated: Map<string, number> } {
  const untranslated = new Map<string, number>()
  const translated = entries.map(entry => {
    const occupation = entry.attributes.occupation
    if (!Array.isArray(occupation))
      return entry
    const removed = corrected.get(entry.id)
    const values = (occupation as string[]).flatMap(value => {
      if (removed?.has(value))
        return [value]
      const french = translateOccupation(value)
      if (french === undefined && !removed)
        untranslated.set(value, (untranslated.get(value) ?? 0) + 1)
      return french === undefined ? [value] : french === null ? [] : [french]
    })
    const unique = [...new Set(values)]
    return { ...entry, attributes: { ...entry.attributes, occupation: unique.length > 0 ? unique : null } }
  })
  return { entries: translated, untranslated }
}

// --- Regroupement, après les corrections à la main ---

// Les quasi-synonymes : une seule valeur, rien de perdu (Lycéen et Étudiant, c'est pareil pour deviner ; Reine, le sexe le dit déjà)
const OCCUPATION_MERGES: Record<string, string> = {
  'Pupil': 'Student', 'High schooler': 'Student', 'Middle schooler': 'Student',
  'Warrior': 'Fighter', 'Killer': 'Assassin', 'Sniper': 'Marksman',
  'General': 'Officer', 'Lieutenant': 'Officer', 'Sergeant': 'Soldier', 'Recruit': 'Soldier', 'Bodyguard': 'Guard', 'Secret agent': 'Spy',
  'Mage': 'Mage', 'Magician': 'Mage', 'Sorcerer': 'Mage', 'Witch': 'Mage', 'Magical Girl': 'Magical girl',
  'Priest': 'Cleric', 'Priestess': 'Cleric', 'Nun': 'Cleric', 'Monk': 'Cleric', 'Cleric': 'Cleric',
  'King': 'Royalty', 'Queen': 'Royalty', 'Emperor': 'Royalty', 'Empress': 'Royalty', 'Monarch': 'Royalty',
  'Prince': 'Noble', 'Princess': 'Noble', 'Count': 'Noble', 'Lord': 'Noble', 'Lady': 'Noble', 'Goddess': 'God',
  'Pro hero': 'Superhero', 'Space pirate': 'Pirate',
  'Nurse': 'Doctor', 'Healer': 'Doctor', 'Researcher': 'Scientist', 'Explorer': 'Adventurer', 'Traveler': 'Adventurer',
  'Instructor': 'Teacher', 'Office worker': 'Employee', 'Civil servant': 'Employee', 'Trader': 'Merchant', 'Salesperson': 'Merchant',
  'Maid': 'Servant', 'Manservant': 'Servant', 'Butler': 'Servant', 'Waitress': 'Waiter', 'Baker': 'Cook',
  'Actress': 'Actor', 'Rapper': 'Singer',
}

const NO_REAL_OCCUPATION = new Set(['Unknown', 'None'])

// Les occupations finales : les synonymes regroupés, puis la famille ajoutée après la valeur précise, sans doublon
export function groupOccupations(values: readonly string[]): string[] | null {
  // Inconnu et Aucune s'effacent devant une vraie occupation (une arme, un titre)
  const real = values.filter(value => !NO_REAL_OCCUPATION.has(value))
  const merged = (real.length > 0 ? real : values).map(value => OCCUPATION_MERGES[value] ?? value)
  const grouped = withFamilies(merged)
  return grouped.length > 0 ? grouped : null
}

// Les armes et les titres ajoutés à l'occupation, au plus (comme au Pixeldle)
const MAX_WEAPONS = 2
const MAX_TITLES = 2

// Un perso mort sans aucune occupation : « Aucune » (validé avec FX). Seulement s'il n'a rien d'autre, et jamais
// « Mort » ou « Défunt » : ce serait un spoil affiché à chaque proposition.
const NO_OCCUPATION = 'None'

// À la fin, corrections comprises : les armes (comment le perso se bat) et les titres des infobox (attributs de travail
// « weapon », « titles » et « deceased ») rejoignent l'occupation, puis tout est regroupé. La famille liée par l'infobox
// (« relatives », lue par familySpecies) disparaît aussi.
export function finishOccupations(entries: Entry[]): Entry[] {
  return entries.map(entry => {
    const { weapon, titles, deceased, relatives: _relatives, ...attributes } = entry.attributes
    const extra = (value: unknown, max: number) => ((value as string[] | null | undefined) ?? []).slice(0, max)
    const occupation = [...(attributes.occupation as string[] | null) ?? [], ...extra(weapon, MAX_WEAPONS), ...extra(titles, MAX_TITLES)]
    const grouped = groupOccupations(occupation) ?? (deceased ? [NO_OCCUPATION] : null)
    return { ...entry, attributes: { ...attributes, occupation: grouped } }
  })
}

// Les ids dont le fichier de corrections touche l'occupation, avec les valeurs qu'il retire
export function manualOccupations(edit: Record<string, Record<string, unknown>>): Map<string, Set<string>> {
  return new Map(Object.entries(edit).filter(([, changes]) => 'occupation' in changes)
    .map(([id, changes]) => [id, new Set(isSetEdit(changes.occupation) ? changes.occupation.moins ?? [] : [])]))
}

// --- Espèce (Weebdle) ---

// Les espèces des animes, clés en minuscules, par-dessus la table du Pixeldle (translateSpecies). Les peuples d'un seul
// anime rejoignent une grande famille pour que les persos se croisent : les Spirals de Gurren Lagann sont des humains,
// les Giftias de Plastic Memories des androïdes. null = pas une espèce.
const ANIME_SPECIES: Record<string, string | null> = {
  'new human': 'Human', 'spiral': 'Human', 'immanity': 'Human', 'imanity': 'Human', 'evolved human': 'Human',
  'divine human': 'Human', 'caucasian': 'Human', 'beyondian': 'Human', 'gamer': 'Human', 'amazoness': 'Human',
  'pallum': 'Human', 'esper': 'Human', 'magus': 'Human', 'burst linker': 'Human', 'master': null, 'magician': 'Human',
  'giftia': 'Android', 'humanoid ai': 'Android', 'cyber girl': 'Android',
  'shiki': 'Vampire', 'real vampire': 'Vampire', 'artificial vampire': 'Vampire', 'lesser vampire': 'Vampire', 'vampiric thrall': 'Vampire',
  'devilman': 'Demon', 'succubus': 'Demon', 'fiend': 'Demon', 'fiend host': 'Demon', 'karma demon': 'Demon', 'demons': 'Demon', 'daemon': 'Demon',
  'grim reaper': 'Shinigami', 'shinigami': 'Shinigami', 'soul reaper': 'Shinigami',
  'seraph': 'Angel', 'flügel': 'Angel', 'jinrou': 'Werewolf', 'intelligent titan': 'Titan', 'titan': 'Titan',
  'pillar man': 'Pillar Man', 'life fibers': 'Life Fiber', 'chimera ant': 'Chimera Ant',
  'monster rat': 'Rat', 'filolial': 'Bird', 'crow': 'Bird', 'tanuki': 'Tanuki', 'japanese raccoon': 'Tanuki',
  'hobgoblin': 'Goblin', 'ghast': 'Undead', 'kamui': 'Life Fiber', 'boaz': 'Beastman', 'wanui': 'Beastman',
  'gorgon': 'Gorgon', 'medusa': 'Gorgon', 'dullahan': 'Undead', 'divine fighter': 'Demon', 'divine wolf': 'Wolf', 'merman': 'Mermaid', 'servant': 'Heroic Spirit',
  'shadow': 'Shadow', 'shadows': 'Shadow', 'nephilim': 'Half-demon', 'elder bairn': 'Monster', 'narehate': 'Narehate',
  'michaela': null, 'familiar': null, 'neighbor': null,
  // JUJUTSU KAISEN : les Incarnations sont des fléaux ou des exorcistes réincarnés dans un corps, pas une espèce
  'incarnation': null,
  // The Reincarnation of the Strongest Exorcist : les Trieyes sont un peuple de démons (Pirisralia)
  'trieye': 'Demon',
  // Les fées du folklore, gardées précises (les races d'ALO dans SAO, Kuro de Blue Exorcist, Ramiris) : Fée s'y ajoute
  // pour recouper (FOLKLORE_FAIRIES)
  'sylph': 'Sylph', 'salamander': 'Salamander', 'undine': 'Undine', 'spriggan': 'Spriggan', 'leprechaun': 'Leprechaun',
  'cait sith': 'Cait Sith', 'cat sídhe': 'Cait Sith', 'cat sidhe': 'Cait Sith', 'pixie': 'Pixie',
  // Les hybrides de Chainsaw Man sont des humains-démons (au Pixeldle, un hybride est mi-extraterrestre). Les Parasites de
  // DARLING in the FRANXX sont les pilotes, des humains (Parasyte n'est pas dans la liste du Weebdle).
  'hybrid': 'Half-demon', 'parasite': 'Human',
  // To Your Eternity : l'ours Kermode, un vrai ours (« spirit bear ») et pas un esprit
  'spirit bear': 'Bear',
  // Les esprits d'épée d'Immortal King (Jingke) : des esprits
  'spirit sword': 'Spirit', 'spirit swords': 'Spirit',
  'none': null, 'unknown': null, 'jewel': null, 'image fragment': null, 'immortal': null,
}
// La longue traîne, dans l'ordre (« human-turned beastman - tanuki » : homme-bête avant humain)
const ANIME_SPECIES_RULES: [RegExp, string][] = [
  // JUJUTSU KAISEN : les fléaux et les Death Paintings (mi-fléaux), et les Cursed Corpses, des poupées animées (Panda)
  [/\bcursed (?:spirit|womb)|^curses?$/, 'Curse'],
  [/cursed corpse/, 'Doll'],
  [/beast ?m[ae]n|beastkin|beast human|beast race|beast hybrid|therianthrope|werebeast|werecat|cat people|kitten human|felinoid/, 'Beastman'],
  // « Triple-Headed Snake » (Mitsumata, Ranking of Kings) : un serpent, donc aussi un Animal (expandSpecies). Après les
  // hommes-bêtes : « Beastman - Snake » (Boris Cliff, BNA) en est un
  [/\bsnakes?\b/, 'Snake'],
  [/\bhalf[- ]?(?:elf|alv)\b/, 'Half-elf'],
  [/\b(?:fairy|fairies|pixie|sylph|salamander|undine|spriggan|leprechaun|cait sith|cat s[ií]dhe)\b/, 'Fairy'],
  [/\bvampir/, 'Vampire'],
  [/\b(?:demon|devil|oni)\b/, 'Demon'],
  [/\bdragon/, 'Dragon'],
  [/\b(?:elf|elves|alv)\b/, 'Elf'],
  [/\b(?:angel|seraph)/, 'Angel'],
  [/\bshadows?\b/, 'Shadow'],
  [/\b(?:werewolf|jinrou)\b/, 'Werewolf'],
  [/\b(?:yokai|youkai|yōkai|ayakashi|kyouma)\b/, 'Yokai'],
  [/\bspirit\b/, 'Spirit'],
  [/\b(?:giant|gigantes)\b/, 'Giant'],
  // Old Deus : les dieux de No Game, No Life
  [/\b(?:god|goddess|deity|divine|deus)\b/, 'Deity'],
  [/\b(?:android|robot|ai)\b/, 'Robot'],
  [/\bhumans?\b/, 'Human'],
]
// « Reshy wolf », « Three-clawed owl » (To Your Eternity) : un animal précisé, lu sur son dernier mot (Loup, Hibou ; Animal
// s'y ajoute avec expandSpecies). Seulement un animal : « giant » ou « mage » au bout ne disent pas l'espèce.
function headAnimal(name: string): string | undefined {
  const french = translateSpecies(name.split(/[\s-]+/).at(-1)!)
  return french && expandSpecies(french)?.includes('Animal') ? french : undefined
}

// Un nom d'espèce exact, sans les règles par mot-clé : pour l'intro des pages, où « demon slayer » n'est pas un démon
export function exactSpecies(name: string): string | null | undefined {
  const key = name.toLowerCase().trim()
  return key in ANIME_SPECIES ? ANIME_SPECIES[key] : translateSpecies(key)
}

// « Human (formerly), Demon » → Humain, Démon : toutes les espèces du perso, même celles qu'il prend plus tard dans
// l'histoire (Mikaela, Seraph of the End : « Human (Formerly), Vampire (Formerly), Demon »). Un indice vaut mieux qu'un
// spoil évité (validé avec FX) ; seule la mort n'est jamais dite. Ce qu'on ne sait pas traduire est mis de côté
// (unknown), pas gardé en anglais : souvent une phrase (« most possibly an absolute monad »), à ajouter ici si ça revient.
export function translateCharacterSpecies(raw: string): { species: string[], unknown: string[] } {
  const species: string[] = []
  const unknown: string[] = []
  for (const part of raw.split(/\s*(?:,|;|\/|\n|&|\band\b|\bor\b|→|・)\s*/i).filter(part => part.trim())) {
    const key = part.toLowerCase().replace(/\s*\([^)]*\)?/g, '').replace(/\[[^\]]*\]/g, '').replace(/^[\s*•·-]+|[\s.:)]+$/g, '').trim()
    if (!key || /^\d+$/.test(key))
      continue
    // « Part 2: Vampire », « Elder Bairn by the end of the movie » : l'espèce seule
    const name = key.replace(/^part\s*\d+\s*:\s*/, '').replace(/\s+(?:by the end|at the end|in the end)\b.*$/, '')
    const french = name in ANIME_SPECIES ? ANIME_SPECIES[name] : translateSpecies(name) ?? ANIME_SPECIES_RULES.find(([pattern]) => pattern.test(name))?.[1] ?? headAnimal(name)
    if (french === undefined)
      unknown.push(part.trim())
    else if (french)
      species.push(french)
  }
  return { species: [...new Set(species)], unknown }
}

// Les fées du folklore : l'espèce précise, plus Fée (une créature magique bienveillante) pour recouper
const FOLKLORE_FAIRIES = new Set(['Sylph', 'Salamander', 'Undine', 'Spriggan', 'Leprechaun', 'Cait Sith', 'Pixie'])

// L'espèce des entrées (« species », les valeurs brutes des sources) traduite et dépliée (Demi-elfe = Humain + Elfe,
// un chat est aussi un Animal, une sylphe aussi une Fée), avec ce qui n'a pas pu l'être
export function translateSpeciesEntries(entries: Entry[]): { entries: Entry[], untranslated: Map<string, number> } {
  const untranslated = new Map<string, number>()
  const translated = entries.map(entry => {
    const raw = entry.attributes.species
    if (!Array.isArray(raw))
      return entry
    const found = (raw as string[]).map(translateCharacterSpecies)
    for (const value of found.flatMap(({ unknown }) => unknown))
      untranslated.set(value, (untranslated.get(value) ?? 0) + 1)
    // Les espèces de toutes les sources (addedValues), chacune parfois en plusieurs valeurs
    const species = [...new Set(found.flatMap(({ species }) => species).flatMap(name => FOLKLORE_FAIRIES.has(name) ? [name, 'Fairy'] : [name]))]
    return { ...entry, attributes: { ...entry.attributes, species: expandSpecies(species) } }
  })
  return { entries: translated, untranslated }
}

// --- Espèce de la famille ---

// Pas des espèces qu'on hérite : une Ombre copie une seule personne (Summer Time Rendering), une race d'ALO est un avatar
// de jeu (SAO). Fée reste héritable : c'est une famille d'espèces (une exception, comme la mère de Kirito, va à la main).
// Un esprit, un fantôme ou un mort-vivant non plus : c'est ce qui lui est arrivé (le père de Miko, Mieruko-chan), pas sa famille.
const NOT_INHERITED = new Set(['Shadow', 'Sylph', 'Salamander', 'Undine', 'Spriggan', 'Leprechaun', 'Cait Sith', 'Spirit', 'Ghost', 'Undead'])
// Pas un nom de famille : « Miranjo no Haha » (la mère de Miranjo), « Kage Haha »
const NOT_SURNAME = /^(?:haha|chichi|ani|ane|otouto|imouto|musume|musuko|sensei)$/i

// Le nom de famille d'un perso, pour regrouper ceux d'un même anime : le dernier mot d'un nom en plusieurs mots
function surname(name: string): string | null {
  const words = name.split(/\s+/)
  const last = words.at(-1)!
  return words.length >= 2 && !words.includes('no') && last.length >= 3 && !NOT_SURNAME.test(last) ? last : null
}

// Les espèces que tous ces persos ont en commun, sans celles qu'on n'hérite pas. null si aucun n'en a.
function commonSpecies(family: Entry[]): string[] | null {
  const known = family.filter(entry => Array.isArray(entry.attributes.species))
    .map(entry => (entry.attributes.species as string[]).filter(name => !NOT_INHERITED.has(name)))
  if (known.length === 0)
    return null
  const common = known.reduce((a, b) => a.filter(name => b.includes(name)))
  return common.length > 0 ? common : null
}

// Un nom comparable d'une source à l'autre : sans accents, mots dans le désordre (« Crane Mabel » = « Mabel Crane »)
const nameKey = (name: string) => name.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).sort().join(' ')

// Un perso sans espèce prend celles que tous les membres connus de sa famille (même anime, même nom) ont en commun,
// sauf celles qu'on n'hérite pas : Gly et Berta Lamprogue sont humains comme Blaise et Seika (validé avec FX). Sans
// nom de famille commun, la famille de sang que son infobox Fandom lie (« relatives » : Kyle et sa sœur Mabel Crane).
export function familySpecies(entries: Entry[]): { entries: Entry[], filled: string[] } {
  const families = new Map<string, Entry[]>()
  for (const entry of entries) {
    const name = surname(entry.name)
    if (name)
      families.set(`${entry.attributes.anime}|${name}`, [...families.get(`${entry.attributes.anime}|${name}`) ?? [], entry])
  }
  const filled: string[] = []
  const shared = new Map<Entry, string[]>()
  for (const family of families.values()) {
    const common = commonSpecies(family)
    if (!common)
      continue
    for (const entry of family.filter(entry => !Array.isArray(entry.attributes.species))) {
      shared.set(entry, common)
      filled.push(`${entry.name} (${entry.attributes.anime}) : ${common.join(', ')} ← ${family.filter(other => other !== entry).map(other => other.name).join(', ')}`)
    }
  }
  const byName = new Map(entries.flatMap(entry => [entry.name, ...entry.aliases ?? []].map(name => [`${entry.attributes.anime}|${nameKey(name)}`, entry] as const)))
  for (const entry of entries.filter(entry => !Array.isArray(entry.attributes.species) && !shared.has(entry))) {
    const relatives = ((entry.attributes.relatives as string[] | null | undefined) ?? [])
      .map(name => byName.get(`${entry.attributes.anime}|${nameKey(name)}`))
      .filter((relative): relative is Entry => relative !== undefined && relative !== entry)
    const common = commonSpecies(relatives)
    if (!common)
      continue
    shared.set(entry, common)
    filled.push(`${entry.name} (${entry.attributes.anime}) : ${common.join(', ')} ← ${relatives.map(other => other.name).join(', ')} (famille de l'infobox)`)
  }
  return { entries: entries.map(entry => shared.has(entry) ? { ...entry, attributes: { ...entry.attributes, species: shared.get(entry)! } } : entry), filled }
}
