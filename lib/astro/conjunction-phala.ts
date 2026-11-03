// Sārāvalī Ch. 15 "Conjunctions of Two Planets" — the result of any two of the
// seven grahas sharing a house. Verbatim from Kalyāṇa Varma's Sārāvalī (verses
// 2-22, the 21 pairwise combinations of Sun…Saturn). Nodes are not covered by
// this chapter, so Rāhu/Ketu pairs return nothing (no fabrication).
//
// Keyed by the unordered pair in canonical (CONJ_ORDER) order.

import type { PlanetName } from "./constants";

const CONJ_ORDER: PlanetName[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

function pairKey(a: PlanetName, b: PlanetName): string {
  const ia = CONJ_ORDER.indexOf(a), ib = CONJ_ORDER.indexOf(b);
  return ia <= ib ? `${a}|${b}` : `${b}|${a}`;
}

const CONJUNCTION_PHALA: Record<string, string> = {
  "Sun|Moon": "One, who has the Sun and Moon together will be at the disposal of his wife (or females), immodest, be a metallurgist (can be interpreted also, as able to deceive), will be quite wealthy and be an expert in sale of intoxicants.",
  "Sun|Mars": "Should the Sun and Mars be in one House the native will be splendourous, valorous, dull witted, strong, be a liar, be sinful, disposed to kill (or torture) and be fierce.",
  "Sun|Mercury": "If the Sun and Mercury are in one House, the native will be in service, will have unsteady wealth, be sweet in speech, will have fame and money, be noble, dear to king and good people and will possess strength, beauty and learning.",
  "Sun|Jupiter": "If the Sun and Jupiter be together, one will be virtuous, be a minister of king, will gain through friends, be with good mind and be a preceptor.",
  "Sun|Venus": "If the Sun and Venus be together, one will be skillful in use of weapons, be mighty, weak-sighted in old age, will be able to amuse the public and will have abundant money earned through women.",
  "Sun|Saturn": "If the Sun and Saturn are together, the native will be a metallurgist, be virtuous, mindful of his own duties, will lose his wife and son, will have the qualities suitable to his race, will be pure, but not so upright.",
  "Moon|Mars": "One, who has the Moon and Mars together, will be valorous, brave in war, be a boxer, will suffer bloody imbalances, or diseases, will manufacture articles of mud, skin and minerals and will be an artisan and a metallurgist.",
  "Moon|Mercury": "One, who has the Moon Mercury combination will be expert in poems and fables, be wealthy, amiable to his wife, beautiful, smiling-faced and will be endowed with distinct virtues.",
  "Moon|Jupiter": "One with Jupiter and the Moon together will be firm in friendship, modest, respectful towards his relatives, wealthy, virtuous and regardful of Gods and the wise.",
  "Moon|Venus": "Should the Moon and Venus be together, the native will be endowed with flowers, incense and clothes, will know to perform duties (kriya also means rites), be dear to his race, very lazy and expert in buying and selling.",
  "Moon|Saturn": "Should the Moon and Saturn be together, the native will possess a decayed wife, be dear to public, will breed elephants and horses, be devoid of virtues, be under the control of others, unwealthy and defeated.",
  "Mars|Mercury": "If Mars and Mercury are together at birth, the native will have unlucky wife, little wealth, will work with gold and iron, be an architect, will keep a wicked widow and be expert in making medicines.",
  "Mars|Jupiter": "If Mars and Jupiter be together at birth, the native will be an artisan, Vedic expert, intelligent, expert in speech, wise and fond of using weapons.",
  "Mars|Venus": "One, who had Mars and Venus together at birth will be worshipped, be chief among his men, be a mathematician (or an astrologer) and be fond of gambling, untruth etc.",
  "Mars|Saturn": "If Mars and Saturn be together, one will be a metallurgist, be expert in jugglery, be deceitful, skillful in thieving, troubled by weapons and poison and be fond of quarrels.",
  "Mercury|Jupiter": "One, who has Mercury and Jupiter together will be a noted dancer, scholar, singer and instrumentalist. He will be wise and happy.",
  "Mercury|Venus": "Should Mercury and Venus be together at birth, the native will be abundantly rich, a politician, an artisan, will study Vedas, be good in speech, will know to sing, make fun and like scents and flowers.",
  "Mercury|Saturn": "One, who has Mercury and Saturn together at birth, will contract debts, be proud, deceiving, an able poet, intent on moving, expert and will possess auspicious speech.",
  "Jupiter|Venus": "One, who has Jupiter and Venus together at birth will live by education and arguments, will follow a highly virtuous path, will have accurate conception, or notion (of things) and will have a supreme wife.",
  "Jupiter|Saturn": "A native, who has Jupiter and Saturn together at birth will be heroic, will have plenty of wealth, will be chief of the city (mayor etc.), famous and will be the head of an assembly, a village, or an association.",
  "Venus|Saturn": "If Venus and Saturn are together at birth, one will be expert in breaking wood, be a barber, painter, or sculptor, boxer, be intent on wandering and be owner of quadrupeds.",
};

/** Sārāvalī Ch. 15 result for two grahas sharing a house, or undefined if the
 *  pair is a node pair / not covered by the chapter. */
export function conjunctionPhala(a: PlanetName, b: PlanetName): string | undefined {
  if (a === b) return undefined;
  return CONJUNCTION_PHALA[pairKey(a, b)];
}

export { CONJ_ORDER };
