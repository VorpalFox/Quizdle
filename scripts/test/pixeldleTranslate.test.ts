import { describe, expect, it } from 'vitest'
import { expandSpecies, franchiseWorld, hairOrNone, isRealPlace, mergeOccupations, occupationOrNone, weaponOccupations, placeCountry, translateDeveloper, translateGender, translateGenre, translateNationality, translateOccupation, translatePlace, translateSpecies, withWorld } from '../pixeldleTranslate.js'

describe('expandSpecies', () => {
  it('Animal_AjouteAnimal', () => {
    expect(expandSpecies('Renard')).toEqual(['Renard', 'Animal'])
    expect(expandSpecies(['Divinité', 'Loup'])).toEqual(['Divinité', 'Loup', 'Animal'])
  })

  it('EspeceComposee_SesDeuxParts', () => {
    expect(expandSpecies('Demi-elfe')).toEqual(['Humain', 'Elfe'])
    expect(expandSpecies('IA')).toEqual(['Robot'])
  })

  it('DejaDepliee_Inchangee', () => {
    expect(expandSpecies(['Renard', 'Animal'])).toEqual(['Renard', 'Animal'])
    expect(expandSpecies(['Humain', 'Humain'])).toEqual(['Humain'])
  })

  it('Vide_Null', () => {
    expect(expandSpecies(null)).toBeNull()
    expect(expandSpecies([])).toBeNull()
  })
})

describe('mergeOccupations', () => {
  it('QuasiSynonymes_Regroupes', () => {
    expect(mergeOccupations(['Tueur', 'Assassin', 'Élève'])).toEqual(['Assassin', 'Étudiant'])
  })

  it('Dieu_Retire', () => {
    expect(mergeOccupations(['Dieu'])).toBeNull()
  })
})

describe('weaponOccupations', () => {
  it('Armes_CommentIlSeBat', () => {
    expect(weaponOccupations('Buster Sword')).toEqual(['Épéiste'])
    expect(weaponOccupations('AK-47, Desert Eagle')).toEqual(['Tireur'])
    expect(weaponOccupations('Gunblade')).toEqual(['Épéiste', 'Tireur'])
    expect(weaponOccupations('Sniper rifle')).toEqual(["Tireur d'élite"])
  })

  it('PasUneArme_Rien', () => {
    expect(weaponOccupations('See equipment')).toEqual([])
  })
})

describe('occupationOrNone', () => {
  it('CreatureSansMetier_Aucune', () => {
    expect(occupationOrNone(null, ['Renard', 'Animal'])).toEqual(['Aucune'])
  })

  it('HumainSansMetier_Inconnu', () => {
    expect(occupationOrNone(null, ['Humain'])).toEqual(['Inconnu'])
    expect(occupationOrNone([], ['Elfe'])).toEqual(['Inconnu'])
  })

  it('MetierConnu_Garde', () => {
    expect(occupationOrNone(['Plombier'], ['Humain'])).toEqual(['Plombier'])
  })
})

describe('hairOrNone', () => {
  it('RobotSansCheveux_NA', () => {
    expect(hairOrNone(null, ['Robot'])).toEqual(['N/A'])
    expect(hairOrNone(null, ['Renard', 'Animal'])).toEqual(['N/A'])
  })

  it('HumainSansCheveux_Vide', () => {
    expect(hairOrNone(null, ['Humain'])).toBeNull()
    expect(hairOrNone(null, ['Humain', 'Mutant'])).toBeNull()
  })

  it('CheveuxConnus_Gardes', () => {
    expect(hairOrNone(['Bleus'], ['Robot'])).toEqual(['Bleus'])
  })
})

describe('translateSpecies', () => {
  it('ClassesDeFiction_NomCourt', () => {
    expect(translateSpecies('être humain de fiction')).toBe('Humain')
    expect(translateSpecies('anthropomorphic hedgehog')).toBe('Hérisson')
    expect(translateSpecies('renard anthropomorphe')).toBe('Renard')
    expect(translateSpecies('fée dans une œuvre de fiction')).toBe('Fée')
    expect(translateSpecies('elfe de la nuit')).toBe('Elfe')
    expect(translateSpecies('•Human')).toBe('Humain')
  })

  it('PeupleDUneFranchise_GardeTelQuel', () => {
    expect(translateSpecies('Hylien')).toBe('Hylien')
    expect(translateSpecies('Koopa')).toBe('Koopa')
  })

  it('PasUneEspece_NullOuInconnue', () => {
    expect(translateSpecies('deutéragoniste')).toBeNull()
    expect(translateSpecies('truc inconnu')).toBeUndefined()
  })
})

describe('translateGender', () => {
  it('PlusieursVersions_PasTranche', () => {
    expect(translateGender(['Male (3) Female (4)'])).toBeNull()
    expect(translateGender(['Left 4 Dead, Male, Left 4 Dead 2, Male or Female'])).toBeNull()
    expect(translateGender(['Yes'])).toBeNull()
  })

  it('AutresSexes_NosValeurs', () => {
    expect(translateGender(['genre déterminé par le joueur'])).toBe('Au choix')
    expect(translateGender(['femme trans'])).toBe('Femme')
    expect(translateGender(['sexe inconnu'])).toBeNull()
    expect(translateGender([])).toBeNull()
    expect(translateGender(['autre chose'])).toBeUndefined()
  })
})

describe('translateOccupation', () => {
  it('ValeurExacteDesInfobox_Dictionnaire', () => {
    expect(translateOccupation('Weaponsmith')).toBe('Ouvrier')
    expect(translateOccupation('· Weaponsmith')).toBe('Ouvrier')
    expect(translateOccupation('---- Confederate marshal')).toBe('Policier')
    expect(translateOccupation('Proprieter of the Mikaelsen Ranch')).toBe('Fermier')
  })

  it('RoleDansLHistoire_Retire', () => {
    expect(translateOccupation('Antagonist')).toBeNull()
    expect(translateOccupation('Companion')).toBeNull()
    expect(translateOccupation('God of chaos')).toBeNull()
  })

  it('OccupationsWikidata_NosFamilles', () => {
    expect(translateOccupation('Pratiquant d\'arts martiaux')).toBe('Combattant')
    expect(translateOccupation('Chasseur de primes')).toBe('Chasseur de primes')
    expect(translateOccupation('Chasseur de vampires')).toBe('Chasseur de monstres')
    expect(translateOccupation('Agent de sécurité')).toBe('Garde')
    expect(translateOccupation('Agent double')).toBe('Espion')
    expect(translateOccupation('Patron de bar')).toBe('Serveur')
    expect(translateOccupation('Plombier')).toBe('Plombier')
    expect(translateOccupation('Military impostor')).toBeNull()
  })

  it('OccupationsAnglaises_NosFamilles', () => {
    expect(translateOccupation('Bartender')).toBe('Serveur')
    expect(translateOccupation('Leader of the Horde')).toBe('Dirigeant')
    expect(translateOccupation('CEO of Wayne Enterprises')).toBe("Homme d'affaires")
    expect(translateOccupation('Gym Leader')).toBe('Dresseur')
    expect(translateOccupation('Chieftain of the Warsong clan')).toBe('Chef de clan')
    expect(translateOccupation('Charter Boat Captain')).toBe('Marin')
    expect(translateOccupation('General Manager at Dondoko Island')).toBe('Dirigeant')
    expect(translateOccupation('Ex-soldier')).toBe('Soldat')
    expect(translateOccupation('Head of Slytherin House')).toBe('Professeur')
    expect(translateOccupation('Legend')).toBeNull()
  })

  it('TraductionsDuWeebdle_NosFamilles', () => {
    expect(translateOccupation('Leader')).toBe('Dirigeant')
    expect(translateOccupation('Mage')).toBe('Magicien')
    expect(translateOccupation('Serviteur')).toBe('Domestique')
  })
})

describe('translateDeveloper', () => {
  it('DivisionsInternes_StudioConnu', () => {
    expect(translateDeveloper('Nintendo Entertainment Analysis and Development')).toBe('Nintendo')
    expect(translateDeveloper('Ubisoft Montréal')).toBe('Ubisoft')
    expect(translateDeveloper('Naughty Dog')).toBe('Naughty Dog')
  })
})

describe('translateGenre', () => {
  it('GenresWikidata_NosGenres', () => {
    expect(translateGenre('jeu de plateforme en 3D')).toBe('Plates-formes')
    expect(translateGenre('action-RPG')).toBe('Action-RPG')
    expect(translateGenre('jeu de rôle en ligne massivement multijoueur')).toBe('MMO')
    expect(translateGenre('jeu de combat motorisé')).toBe('Course')
    expect(translateGenre('science fiction horror')).toBe('Horreur')
  })

  it('Themes_Retires', () => {
    expect(translateGenre('jeu vidéo avec des personnages LGBT')).toBeNull()
    expect(translateGenre('jeu vidéo postapocalyptique')).toBeNull()
    expect(translateGenre('cozy game')).toBeNull()
    expect(translateGenre('inventory management video game')).toBeNull()
  })

  it('GenresDeNiche_RamenesOuGardes', () => {
    expect(translateGenre('simulateur de vol spatial')).toBe('Simulation')
    expect(translateGenre('jeu vidéo de pêche')).toBe('Simulation')
    expect(translateGenre('jeu de tir')).toBe('FPS')
    expect(translateGenre('Extraction shooter')).toBe('FPS')
    expect(translateGenre('jeu d\'aventure à la troisième personne')).toBe('Aventure')
    expect(translateGenre('jeu vidéo comprenant des éléments d\'énigme')).toBe('Réflexion')
    expect(translateGenre('Immersive sim')).toBe('Immersive sim')
    expect(translateGenre('monster-taming game')).toBe('Monster-taming')
    expect(translateGenre('walking simulator')).toBe('Walking simulator')
  })
})

describe('translateNationality', () => {
  it('PaysHistoriques_PaysActuel', () => {
    expect(translateNationality('République populaire de Chine')).toBe('China')
    expect(translateNationality('royaume de France')).toBe('France')
    expect(translateNationality('Hyrule')).toBe('Hyrule')
  })

  it('Anglais_Traduit', () => {
    expect(translateNationality('Swiss')).toBe('Switzerland')
    expect(translateNationality('Earth')).toBe('Earth')
  })
})

describe('placeCountry', () => {
  it('VilleReelle_SonPays', () => {
    expect(placeCountry('London')).toBe('United Kingdom')
    expect(placeCountry('The Bronx')).toBe('United States')
    expect(placeCountry('Japanese')).toBe('Japan')
  })

  it('LieuDeFiction_Null', () => {
    expect(placeCountry('Night City')).toBeNull()
  })
})

describe('translatePlace', () => {
  it('BruitAutourDuLieu_Retire', () => {
    expect(translatePlace('Likely Japan')).toEqual(['Japan'])
    expect(translatePlace('Raised on Zebes.')).toEqual(['Zebes'])
    expect(translatePlace('\u{E0067}\u{E0062}\u{E0073} Scottish')).toEqual(['United Kingdom'])
  })

  it('PasUnLieu_Retire', () => {
    expect(translatePlace('40-45 Years Old')).toEqual([])
    expect(translatePlace('Hideout')).toEqual([])
    expect(translatePlace('Abrahamic Mythology')).toEqual([])
    expect(translatePlace('*')).toEqual([])
  })

  it('PaysDHistoireEtGentiles_LeLieu', () => {
    expect(translatePlace('Russian Empire')).toEqual(['Russia'])
    expect(translatePlace('Japanese-Portuguese')).toEqual(['Japan', 'Portugal'])
    expect(translatePlace('Plegian')).toEqual(['Plegia'])
  })
})

describe('translatePlace, harmonisation', () => {
  it('EcrituresDUneVille_UneSeule', () => {
    expect(translatePlace('NYC')).toEqual(['New York', 'United States'])
    expect(translatePlace('New York City')).toEqual(['New York', 'United States'])
    expect(translatePlace('The Bronx')).toEqual(['Bronx', 'United States'])
  })

  it('PrefixeOuLogement_LieuSeulOuRetire', () => {
    expect(translatePlace('Town of Onett')).toEqual(['Onett'])
    expect(translatePlace('1276 Fig Leaf Lane')).toEqual([])
    expect(translatePlace('Jackie\'s Garage')).toEqual([])
    expect(translatePlace('Giant\'s Deep')).toEqual(['Giant\'s Deep'])
  })
})

describe('translatePlace, noms à garder', () => {
  it('VillageOuCiteDansLeNom_Garde', () => {
    expect(translatePlace('Village of Dragons')).toEqual(['Village of Dragons'])
    expect(translatePlace('City of Light')).toEqual(['City of Light'])
  })

  it('LibellesFrancaisDeWikidata_EnAnglais', () => {
    expect(translatePlace('Japon')).toEqual(['Japan'])
    expect(translatePlace('Témérie')).toEqual(['Temeria'])
  })
})

describe('isRealPlace', () => {
  it('PaysVilleAstre_Reels', () => {
    expect(isRealPlace('United States')).toBe(true)
    expect(isRealPlace('Soviet Union')).toBe(true)
    expect(isRealPlace('Mars')).toBe(true)
  })

  it('LieuDeFiction_PasReel', () => {
    expect(isRealPlace('Hyrule')).toBe(false)
    expect(isRealPlace('Night City')).toBe(false)
  })
})

describe('franchiseWorld', () => {
  it('MajoriteDansUnLieuReel_Reel', () => {
    expect(franchiseWorld([['United States'], ['Japan'], ['Arcadia Bay'], null])).toBe('real')
  })

  it('AucunLieuReel_AutreMonde', () => {
    expect(franchiseWorld([['Hyrule'], ['Termina'], ['Hyrule'], null])).toBe('other')
  })

  it('MelangeOuTropPeu_NeSaitPas', () => {
    expect(franchiseWorld([['Mushroom Kingdom'], ['Brooklyn', 'United States'], ['Mushroom Kingdom']])).toBeNull()
    expect(franchiseWorld([['Hyrule'], ['Termina']])).toBeNull()
    expect(franchiseWorld([null, null])).toBeNull()
  })
})

describe('withWorld', () => {
  it('PlaceDansNotreMonde_AjouteMondeReel', () => {
    expect(withWorld(['Boston', 'United States'], ['Humain'], null)).toEqual(['Boston', 'United States', 'Monde réel'])
    expect(withWorld(['Hyrule'], ['Hylien'], 'other')).toEqual(['Hyrule'])
  })

  it('SansLieu_LeMondeDeLaFranchise', () => {
    expect(withWorld(null, ['Humain'], 'real')).toEqual(['Monde réel'])
    expect(withWorld([], ['Hylien'], 'other')).toEqual(['Inconnu'])
    expect(withWorld(null, ['Humain'], null)).toBeNull()
  })

  it('VenuDAilleursDansLeMondeReel_Inconnu', () => {
    expect(withWorld(null, ['Démon'], 'real')).toEqual(['Inconnu'])
    expect(withWorld(null, ['Sangheili'], 'real')).toEqual(['Inconnu'])
    expect(withWorld(null, ['Renard', 'Animal'], 'real')).toEqual(['Monde réel'])
  })

  it('FranchiseDeLEspace_AjouteLostInTheGalaxy', () => {
    expect(withWorld(['Earth'], ['Humain'], 'other', true)).toEqual(['Earth', 'Monde réel', 'Lost in the Galaxy'])
    expect(withWorld(null, ['Humain'], 'other', true)).toEqual(['Inconnu', 'Lost in the Galaxy'])
    expect(withWorld(null, ['Humain'], null, true)).toEqual(['Lost in the Galaxy'])
  })
})
