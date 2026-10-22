// Wikimedia Commons photos per species id (shown in the species card carousel).
// Species without an entry here get the main Wikipedia image of their scientific name at runtime
// (see src/api/wikimedia.ts), with author and licence read from Wikimedia Commons.
import type { SpeciesImage } from '../types';

export const SPECIES_GALLERY_IMAGES: Record<string, SpeciesImage[]> = {
  'gorgone-med': [
    { title: 'Gorgone rouge', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Paramuricea_clavata_C%C3%B4te_bleue.jpg/1280px-Paramuricea_clavata_C%C3%B4te_bleue.jpg', alt: 'Gorgone rouge sur la Côte Bleue', artist: 'FredD', license: 'CC BY-SA 4.0' },
    { title: 'Nécrose', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Paramuricea_clavata_%28Risso%2C_1826%29_5.jpg/1280px-Paramuricea_clavata_%28Risso%2C_1826%29_5.jpg', alt: 'Détail des ramifications de la gorgone', artist: 'Parent Géry', license: 'CC BY-SA 3.0' }
  ],
  'grande-nacre': [
    { title: 'Grande Nacre', src: 'https://upload.wikimedia.org/wikipedia/commons/0/02/Pinnidae_-_Pinna_nobilis.jpg', alt: 'Grande nacre (Pinna nobilis)', artist: 'Hectonichus', license: 'CC BY-SA 3.0' }
  ],
  'eponge-med': [
    { title: 'Eponge', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Bath_sponge_Spongia_officinalis_Greece.jpg/1280px-Bath_sponge_Spongia_officinalis_Greece.jpg', alt: 'Spongia officinalis', artist: 'E. Voultsiadou', license: 'CC BY-SA 2.5' }
  ],
  'posidonie': [
    { title: 'Posidonie', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Posidonia_oceanica_%28L%29.jpg/1280px-Posidonia_oceanica_%28L%29.jpg', alt: 'Herbier dense de Posidonie', artist: 'Frédéric Ducarme', license: 'CC BY-SA 4.0' },
    { title: 'Herbier', src: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Posidonia_2_Alberto_Romeo.jpg', alt: 'Vue sous-marine de la prairie', artist: 'Alberto Romeo', license: 'CC BY-SA 2.5' }
  ],
  'moules-thau': [
    { title: 'Etang de Thau', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Parcs_%C3%A0_hu%C3%AEtres_dans_l%27%C3%A9tang_de_Thau_-_Bouzigues.jpg/1280px-Parcs_%C3%A0_hu%C3%AEtres_dans_l%27%C3%A9tang_de_Thau_-_Bouzigues.jpg', alt: 'Parcs conchylicoles sur l’Étang de Thau', artist: 'Christian Ferrer', license: 'CC BY-SA 4.0' },
    { title: 'Mytilus', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Mytilus_galloprovincialis_01.jpg/1280px-Mytilus_galloprovincialis_01.jpg', alt: 'Moule de Méditerranée', artist: 'H. Zell', license: 'CC BY-SA 3.0' }
  ],
  'huitres-moules': [
    { title: 'Moules Bretagne', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Magallana_gigas_-_Mytilus_edulis_-_Centre_Ostr%C3%A9icole_-_Leucate.jpg/1280px-Magallana_gigas_-_Mytilus_edulis_-_Centre_Ostr%C3%A9icole_-_Leucate.jpg', alt: 'Moules et Huîtres', artist: 'H. Zell', license: 'CC BY-SA 3.0' }
  ],
  'bulot-manche': [
      { 
        title: 'Buccinum undatum', 
        src: 'https://upload.wikimedia.org/wikipedia/commons/2/23/Buccinum_undatum.jpg', 
        alt: 'Bulot vivant (Buccinum undatum)', 
        artist: 'A.H. Cheadle', 
        license: 'CC BY-SA 3.0' 
      },
      { 
        title: 'Coquille', 
        src: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Buccinum_undatum_01.JPG', 
        alt: 'Coquille vide de Bulot', 
        artist: 'Georges Jansoone', 
        license: 'Public Domain' 
      }
    ],
  'laminaires-bretagne': [
    { title: 'Croissance', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Croissance_des_laminaires_-_Plong%C3%A9e_de_mesure_des_stipes_de_Laminaria_hyperborea_%28Ifremer_00794-90612%29.jpg/1280px-Croissance_des_laminaires_-_Plong%C3%A9e_de_mesure_des_stipes_de_Laminaria_hyperborea_%28Ifremer_00794-90612%29.jpg', alt: 'Plongeur Ifremer mesurant une laminaire', artist: 'Ifremer', license: 'CC BY 4.0' }
  ],
  'pieuvre-manche': [
    { title: 'Poulpe', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Pulpo_com%C3%BAn_%28Octopus_vulgaris%29%2C_franja_marina_Teno-Rasca%2C_Tenerife%2C_Espa%C3%B1a%2C_2022-01-08%2C_DD_53.jpg/1280px-Pulpo_com%C3%BAn_%28Octopus_vulgaris%29%2C_franja_marina_Teno-Rasca%2C_Tenerife%2C_Espa%C3%B1a%2C_2022-01-08%2C_DD_53.jpg', alt: 'Pieuvre commune (Octopus vulgaris)', artist: 'Diego Delso', license: 'CC BY-SA 4.0' }
  ],
  'plancton-global': [
    { title: 'Bloom', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Phytoplankton_blooms_in_the_North_Sea.jpg/1280px-Phytoplankton_blooms_in_the_North_Sea.jpg', alt: 'Bloom phytoplanctonique vu de l’espace', artist: 'Copernicus Sentinel-3', license: 'Attribution' }
  ],
  'corail-rouge': [
    { title: 'Corail Rouge', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Corallium_rubrum_%28Linnaeus%2C_1758%29_11.jpg/1280px-Corallium_rubrum_%28Linnaeus%2C_1758%29_11.jpg', alt: 'Corallium rubrum', artist: 'Géry PARENT', license: 'CC BY-SA 3.0' }
  ]
};
