// Maps a free-text astrological question to the classical factors that answer
// it — the houses, significators (kārakas) and life-topic the sages assign to
// that matter. The Ask feature uses this to pull the RIGHT classical rules
// (Bhṛgu house results, Sārāvalī sign results, significations) for the question,
// so an answer is reasoned strictly from the classics rather than invented.

import type { PlanetName } from "./constants";

export interface Topic {
  key: string;
  label: string;
  /** Houses (bhāvas) the classics assign to this matter; first = primary. */
  houses: number[];
  /** Natural significators (kārakas). */
  karakas: PlanetName[];
  keywords: string[];
}

export const TOPICS: Topic[] = [
  {
    key: "marriage",
    label: "Marriage & relationships",
    houses: [7, 2, 11],
    karakas: ["Venus", "Jupiter"],
    keywords: [
      "marry", "marriage", "married", "spouse", "wife", "husband", "partner",
      "wedding", "relationship", "love", "romance", "girlfriend", "boyfriend",
      "divorce", "separation",
    ],
  },
  {
    key: "career",
    label: "Career & profession",
    houses: [10, 6, 2],
    karakas: ["Sun", "Saturn", "Mercury", "Jupiter"],
    keywords: [
      "career", "job", "profession", "work", "business", "employment",
      "promotion", "occupation", "service", "office", "boss", "startup",
      "profession", "salary hike",
    ],
  },
  {
    key: "wealth",
    label: "Wealth & finances",
    houses: [2, 11, 5, 9],
    karakas: ["Jupiter", "Venus"],
    keywords: [
      "wealth", "money", "rich", "finance", "financial", "income", "earning",
      "earn", "salary", "prosperity", "fund", "savings", "loan repay", "gain",
      "profit",
    ],
  },
  {
    key: "children",
    label: "Children & progeny",
    houses: [5, 9],
    karakas: ["Jupiter"],
    keywords: [
      "child", "children", "son", "daughter", "progeny", "kids", "pregnant",
      "pregnancy", "conceive", "baby", "fertility", "childbirth",
    ],
  },
  {
    key: "health",
    label: "Health & longevity",
    houses: [1, 6, 8],
    karakas: ["Sun", "Moon", "Saturn"],
    keywords: [
      "health", "disease", "illness", "sick", "ailment", "body", "medical",
      "longevity", "life span", "lifespan", "death", "surgery", "recover",
      "chronic",
    ],
  },
  {
    key: "education",
    label: "Education & learning",
    houses: [4, 5, 2],
    karakas: ["Mercury", "Jupiter"],
    keywords: [
      "education", "study", "studies", "exam", "degree", "college", "learning",
      "academic", "school", "student", "university", "qualification", "phd",
      "research",
    ],
  },
  {
    key: "foreign",
    label: "Foreign travel & relocation",
    houses: [12, 9, 7, 3],
    karakas: ["Rahu", "Moon"],
    keywords: [
      "foreign", "abroad", "travel", "overseas", "immigration", "visa",
      "settle abroad", "relocate", "migration", "green card", "onsite",
    ],
  },
  {
    key: "fortune",
    label: "Fortune, dharma & father",
    houses: [9, 5],
    karakas: ["Jupiter", "Sun"],
    keywords: [
      "luck", "fortune", "fortunate", "dharma", "father", "guru", "mentor",
      "blessing", "destiny", "success in life",
    ],
  },
  {
    key: "spirituality",
    label: "Spirituality & liberation",
    houses: [12, 9, 5],
    karakas: ["Jupiter", "Ketu"],
    keywords: [
      "spiritual", "moksha", "liberation", "enlighten", "meditation", "god",
      "devotion", "religious", "temple", "sadhana", "mantra", "renunciation",
    ],
  },
  {
    key: "property",
    label: "Property, home, vehicle & mother",
    houses: [4],
    karakas: ["Mars", "Moon", "Venus"],
    keywords: [
      "house", "home", "property", "land", "vehicle", "car", "real estate",
      "mother", "apartment", "flat", "own house",
    ],
  },
  {
    key: "siblings",
    label: "Siblings & courage",
    houses: [3, 11],
    karakas: ["Mars"],
    keywords: [
      "sibling", "brother", "sister", "courage", "co-born", "younger brother",
      "elder brother",
    ],
  },
  {
    key: "enemies",
    label: "Enemies, debts, disputes & obstacles",
    houses: [6, 8],
    karakas: ["Mars", "Saturn"],
    keywords: [
      "enemy", "enemies", "litigation", "court", "dispute", "obstacle", "debt",
      "loan", "lawsuit", "competitor", "rival", "case",
    ],
  },
  {
    key: "personality",
    label: "Personality & self",
    houses: [1],
    karakas: ["Sun", "Moon"],
    keywords: [
      "personality", "character", "nature", "myself", "who am i", "temperament",
      "my strengths", "my weakness", "about me",
    ],
  },
];

/** Whole-word (boundary-aware) test so "car" doesn't match "career". */
function hasKeyword(q: string, kw: string): boolean {
  const esc = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${esc}\\b`, "i").test(q);
}

/** Topics whose keywords appear in the question, most-relevant first (max 3). */
export function matchTopics(question: string): Topic[] {
  const q = question.toLowerCase();
  const scored = TOPICS.map((t) => ({
    t,
    n: t.keywords.filter((k) => hasKeyword(q, k)).length,
  })).filter((x) => x.n > 0);
  scored.sort((a, b) => b.n - a.n);
  return scored.slice(0, 3).map((x) => x.t);
}

/** Whether the question asks about TIMING (so we should foreground the daśā). */
export function isTimingQuestion(question: string): boolean {
  return /\b(when|what age|which year|how long|by when|timing|time frame|date|soon|next year)\b/i.test(
    question
  );
}

/** A few starter questions to show in the UI. */
export const SAMPLE_QUESTIONS = [
  "When will I get married?",
  "How is my career and will I get a promotion?",
  "Will I have children?",
  "How are my finances and wealth prospects?",
  "Will I travel or settle abroad?",
  "What does my chart say about my health?",
];
