// Traditional nakṣatra attributes — deity (devatā), symbol, śakti (the power the
// nakṣatra confers, per the Taittirīya Brāhmaṇa), gaṇa and yoni. These are
// ancient, public-domain facts; the archetype lines are original one-sentence
// syntheses of those attributes (not drawn from any modern copyrighted text).

import { NAKSHATRAS, SIGN_LORDS, SIGNS, NAKSHATRA_ARC, type PlanetName } from "./constants";
import { vargaSign } from "./varga";

export interface NakshatraAttr {
  deity: string;
  symbol: string;
  shakti: string;    // the power it grants
  archetype: string; // original one-line synthesis
}

// Index 0 = Aśvinī … 26 = Revatī (aligned with constants.NAKSHATRAS).
export const NAK_ATTR: NakshatraAttr[] = [
  { deity: "Aśvinī Kumāras (twin horse-headed physicians)", symbol: "a horse's head", shakti: "the power to heal swiftly and set things in motion", archetype: "The Healer — quick, pioneering, restless to begin and to mend." },
  { deity: "Yama (lord of death and dharma)", symbol: "the yoni (womb / vessel)", shakti: "the power to cleanse, bear and carry away", archetype: "The Bearer — endures pressure, transforms through restraint and sacrifice." },
  { deity: "Agni (the fire)", symbol: "a razor or flame", shakti: "the power to burn away impurity", archetype: "The Purifier — sharp, critical, radiant, cutting to what is true." },
  { deity: "Brahmā / Prajāpati (the creator)", symbol: "an ox-cart or chariot", shakti: "the power to make things grow", archetype: "The Nurturer — fertile, sensual, drawn to beauty, comfort and growth." },
  { deity: "Soma (the Moon)", symbol: "a deer's head", shakti: "the power to give fulfilment", archetype: "The Seeker — curious, gentle, ever searching for the pleasing and the new." },
  { deity: "Rudra (the storm)", symbol: "a teardrop or diamond", shakti: "the power to strive through storms", archetype: "The Striver — intense effort amid upheaval, breakthrough after tears." },
  { deity: "Aditi (the boundless mother)", symbol: "a quiver of arrows", shakti: "the power to gain and renew abundance", archetype: "The Renewer — return, second chances, generous expansion after loss." },
  { deity: "Bṛhaspati (the guru of the gods)", symbol: "a cow's udder or lotus", shakti: "the power to nourish and give spiritual strength", archetype: "The Nourisher — caring, dutiful, the most auspicious for support and blessing." },
  { deity: "the Nāgas (serpents)", symbol: "a coiled serpent", shakti: "the power to poison or to embrace", archetype: "The Mystic-Coiler — hypnotic, penetrating, wise in hidden and instinctive things." },
  { deity: "the Pitṛs (ancestors)", symbol: "a royal throne", shakti: "the power to leave the body and honour the lineage", archetype: "The Ancestor — regal, traditional, carrying the authority of forebears." },
  { deity: "Bhaga (god of delight and fortune)", symbol: "the front legs of a bed", shakti: "the power of procreation and rest", archetype: "The Reveller — warm, creative, loving pleasure, leisure and romance." },
  { deity: "Aryaman (patron of union and contracts)", symbol: "the back legs of a bed", shakti: "the power of prosperity through union", archetype: "The Patron — generous, noble, building lasting bonds and alliances." },
  { deity: "Savitṛ (the inspiring Sun)", symbol: "an open hand", shakti: "the power to gain what is sought and hold it in hand", archetype: "The Craftsman — skilful, dexterous, materialising intent through the hands." },
  { deity: "Tvaṣṭṛ / Viśvakarma (the celestial artisan)", symbol: "a bright jewel or pearl", shakti: "the power to accumulate merit and create beauty", archetype: "The Artist — brilliant, design-minded, drawn to form, colour and craft." },
  { deity: "Vāyu (the wind)", symbol: "a young sprout swaying in the wind", shakti: "the power to scatter and move independently", archetype: "The Free-Mover — independent, adaptable, self-made, bending but not breaking." },
  { deity: "Indra-Agni (power and fire)", symbol: "a triumphal archway / potter's wheel", shakti: "the power to achieve many goals", archetype: "The Achiever — determined, goal-hungry, forceful in pursuit of purpose." },
  { deity: "Mitra (god of friendship)", symbol: "a lotus or staff", shakti: "the power of worship and balance", archetype: "The Devotee — friendly, cooperative, thriving through devotion and relationship." },
  { deity: "Indra (king of the gods)", symbol: "an earring or umbrella", shakti: "the power to rise and to conquer", archetype: "The Elder-Warrior — courageous, senior, protective, tested by responsibility." },
  { deity: "Nirṛti (goddess of dissolution)", symbol: "a bunch of tied roots / elephant goad", shakti: "the power to ruin so as to reach the root", archetype: "The Root-Seeker — investigative, uprooting, dissolving in order to rebuild." },
  { deity: "the Waters / Varuṇa (Āpaḥ)", symbol: "a winnowing fan or tusk", shakti: "the power of invigoration", archetype: "The Invincible-Idealist — proud, buoyant, undefeated in conviction." },
  { deity: "the Viśvadevas (the universal gods)", symbol: "an elephant's tusk / planks of a bed", shakti: "the power of unchallengeable, lasting victory", archetype: "The Steadfast — patient, ethical, builder of durable, permanent success." },
  { deity: "Viṣṇu (the preserver)", symbol: "an ear or three footprints", shakti: "the power to connect through listening", archetype: "The Listener — receptive, learned, connecting knowledge across people." },
  { deity: "the eight Vasus (elemental gods)", symbol: "a drum or flute", shakti: "the power of abundance and fame", archetype: "The Performer — rhythmic, wealthy, musical, drawn to acclaim and prosperity." },
  { deity: "Varuṇa (lord of the cosmic ocean)", symbol: "an empty circle / a hundred stars", shakti: "the power to heal and to veil", archetype: "The Mystic-Healer — solitary, secretive, mending through the unseen." },
  { deity: "Aja Ekapāda (the one-footed goat)", symbol: "the front of a funeral cot / a sword", shakti: "the power of spiritual fire", archetype: "The Ascetic-Fire — intense, idealistic, transformative even to the point of extremes." },
  { deity: "Ahir Budhnya (the serpent of the deep)", symbol: "the back of a funeral cot / twins", shakti: "the power of raising up from the depths", archetype: "The Deep-Wise — calm, mystical, compassionate, rising from stillness." },
  { deity: "Pūṣan (the nourisher, guide of travellers)", symbol: "a fish or drum", shakti: "the power of nourishment and safe passage", archetype: "The Guardian — kind, protective, guiding self and others safely to the far shore." },
];

// Nāma-akṣara — the traditional naming syllable for each of the 4 pādas of every
// nakṣatra (the standard Pañcāṅga set used for choosing a birth-name). Public-domain.
const NAMA_AKSHARA: string[][] = [
  ["Chu", "Che", "Cho", "La"],       // Aśvinī
  ["Li", "Lu", "Le", "Lo"],          // Bharaṇī
  ["A", "I", "U", "E"],              // Kṛttikā
  ["O", "Va", "Vi", "Vu"],           // Rohiṇī
  ["Ve", "Vo", "Ka", "Ki"],          // Mṛgaśira
  ["Ku", "Gha", "Ṅa", "Chha"],       // Ārdrā
  ["Ke", "Ko", "Ha", "Hi"],          // Punarvasu
  ["Hu", "He", "Ho", "Ḍa"],          // Puṣya
  ["Ḍi", "Ḍu", "Ḍe", "Ḍo"],          // Āśleṣā
  ["Ma", "Mi", "Mu", "Me"],          // Maghā
  ["Mo", "Ṭa", "Ṭi", "Ṭu"],          // Pūrva Phalgunī
  ["Ṭe", "Ṭo", "Pa", "Pi"],          // Uttara Phalgunī
  ["Pu", "Sha", "Ṇa", "Ṭha"],        // Hasta
  ["Pe", "Po", "Ra", "Ri"],          // Chitrā
  ["Ru", "Re", "Ro", "Ta"],          // Svātī
  ["Ti", "Tu", "Te", "To"],          // Viśākhā
  ["Na", "Ni", "Nu", "Ne"],          // Anurādhā
  ["No", "Ya", "Yi", "Yu"],          // Jyeṣṭhā
  ["Ye", "Yo", "Bha", "Bhi"],        // Mūla
  ["Bhu", "Dha", "Pha", "Ḍha"],      // Pūrva Āṣāḍhā
  ["Bhe", "Bho", "Ja", "Ji"],        // Uttara Āṣāḍhā
  ["Ju", "Je", "Jo", "Gha"],         // Śravaṇa
  ["Ga", "Gi", "Gu", "Ge"],          // Dhaniṣṭhā
  ["Go", "Sa", "Si", "Su"],          // Śatabhiṣā
  ["Se", "So", "Da", "Di"],          // Pūrva Bhādrapada
  ["Du", "Tha", "Jha", "Ña"],        // Uttara Bhādrapada
  ["De", "Do", "Cha", "Chi"],        // Revatī
];

// Puruṣārtha (primary life-aim) per nakṣatra — the widely-published traditional
// assignment (0 Dharma, 1 Artha, 2 Kāma, 3 Mokṣa). Some lineages differ on a few
// stars; this is the common version.
const PURUSHARTHA_LABEL = ["Dharma (purpose / duty)", "Artha (prosperity / means)", "Kāma (desire / pleasure)", "Mokṣa (liberation)"];
const NAK_PURUSHARTHA = [
  0, 1, 2, 3, 3, 2, 1, 0, 0, // Aśvinī … Āśleṣā
  1, 2, 3, 3, 2, 1, 0, 0, 1, // Maghā … Jyeṣṭhā
  2, 3, 3, 1, 0, 0, 1, 2, 3, // Mūla … Revatī
];

const GANA_LABEL = ["Deva (divine)", "Manuṣya (human)", "Rākṣasa (demonic/intense)"];
const NAK_GANA = [0, 1, 2, 1, 0, 1, 0, 0, 2, 2, 1, 1, 0, 2, 0, 2, 0, 2, 2, 1, 1, 0, 2, 2, 1, 1, 0];
const YONI_ANIMALS = ["Horse", "Elephant", "Sheep", "Serpent", "Dog", "Cat", "Rat", "Cow", "Buffalo", "Tiger", "Deer", "Monkey", "Mongoose", "Lion"];
const NAK_YONI = [0, 1, 2, 3, 3, 4, 5, 2, 5, 6, 6, 7, 8, 9, 8, 9, 10, 10, 4, 11, 12, 11, 13, 0, 13, 7, 1];

// Guṇa derived transparently from the nakṣatra's ruling planet (Sāttvika:
// Sun/Moon/Jupiter; Rājasika: Mercury/Venus; Tāmasika: Mars/Saturn/nodes).
const LORD_GUNA: Record<PlanetName, string> = {
  Sun: "Sāttvika", Moon: "Sāttvika", Jupiter: "Sāttvika",
  Mercury: "Rājasika", Venus: "Rājasika",
  Mars: "Tāmasika", Saturn: "Tāmasika", Rahu: "Tāmasika", Ketu: "Tāmasika",
};

export interface NakshatraProfile extends NakshatraAttr {
  index: number;
  gana: string;
  yoni: string;
  guna: string;        // via ruling planet
  purushartha: string; // primary life-aim (common assignment)
}

/** Full traditional profile for a nakṣatra (0-26). */
export function nakshatraProfile(index: number): NakshatraProfile {
  const i = ((index % 27) + 27) % 27;
  return {
    index: i,
    ...NAK_ATTR[i],
    gana: GANA_LABEL[NAK_GANA[i]],
    yoni: YONI_ANIMALS[NAK_YONI[i]],
    guna: LORD_GUNA[NAKSHATRAS[i].lord as PlanetName],
    purushartha: PURUSHARTHA_LABEL[NAK_PURUSHARTHA[i]],
  };
}

export interface PadaDetail {
  pada: number;         // 1-4
  syllable: string;     // nāma-akṣara
  navamsaSign: string;  // D9 sign this pāda falls in
  navamsaLord: string;
}

/** Traditional detail for one pāda (quarter) of a nakṣatra: its naming syllable
 *  and the Navāṁśa (D9) sign it occupies (each pāda = exactly one navāṁśa). */
export function padaDetail(nakIndex: number, pada: number): PadaDetail {
  const i = ((nakIndex % 27) + 27) % 27;
  const p = Math.min(4, Math.max(1, pada));
  // Longitude at the middle of this pāda → its Navāṁśa sign.
  const lon = i * NAKSHATRA_ARC + (p - 1) * (NAKSHATRA_ARC / 4) + NAKSHATRA_ARC / 8;
  const sign = Math.floor(lon / 30);
  const navSign = vargaSign(sign, lon - sign * 30, 9);
  return {
    pada: p,
    syllable: NAMA_AKSHARA[i][p - 1],
    navamsaSign: SIGNS[navSign],
    navamsaLord: SIGN_LORDS[navSign],
  };
}
