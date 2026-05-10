// Coastal Brewing Co. — global coffee recipe library.
//
// Each entry honors the culture it comes from: spelling, ritual, vessel,
// and what's actually drunk in that place — not a sanitized "American
// coffee shop" version. Owner directive 2026-05-03: celebrates coffee
// styles from around the world so visitors can brew them at home if they
// can't visit.
//
// Per FOAI canon: never name the supplier; origin/farm/country/region
// are fine. Products link to the SKU in our catalog that pairs best.

export interface Recipe {
  slug: string;
  name: string;            // canonical, culturally-respected spelling
  also_known_as?: string;  // alternate transliterations or names
  origin: string;          // country / region
  origin_short: string;    // 1-line for cards
  difficulty: "easy" | "moderate" | "ritual";
  brew_time_min: number;   // active brew time
  total_time_min: number;  // including any preparation / steeping
  serves: string;          // "1-2 cups", "small group", etc.
  vessel: string;          // brewing vessel + serving cup
  beans: string;           // grind, roast, varietal recommendation
  about: string;           // 2-3 sentence cultural / historical context
  steps: string[];          // ordered brewing steps, plain language
  notes?: string[];        // small wisdoms — what makes it right
  pairing_sku: string;     // catalog SKU the recipe pairs best with
  pairing_label: string;   // human-readable pairing label
  tags: string[];          // for filtering / cross-linking
}

export const RECIPES: Recipe[] = [
  {
    slug: "saudi-cahwa",
    name: "Saudi Cahwa",
    also_known_as: "Qahwa, Arabic Coffee, قهوة عربية",
    origin: "Saudi Arabia / Arabian Peninsula",
    origin_short: "Arabian Peninsula — Saudi tradition",
    difficulty: "ritual",
    brew_time_min: 10,
    total_time_min: 15,
    serves: "small group",
    vessel: "dallah (long-spouted brass pot), small finjan cups",
    beans: "lightly roasted Arabica (often green-to-pale-gold), coarsely ground",
    about:
      "Cahwa is the heart of Saudi hospitality. The pot is offered first, before tea, before food, before conversation goes anywhere. The light roast lets cardamom be the headline; saffron and cloves are common, rose water on special occasions. Always served with dates.",
    steps: [
      "Boil ~3 cups (700 ml) of water in the dallah.",
      "Add 2-3 tablespoons of coarsely-ground light-roast Arabica. Lower heat. Simmer 10 minutes.",
      "Crush 6-8 green cardamom pods (heart of the recipe). Add to the pot. Simmer another 3-5 minutes.",
      "Optional: a few saffron threads and 1-2 whole cloves for richness; a drop of rose water to finish.",
      "Let the grounds settle. Pour through a small strainer or directly from the spout, leaving the grounds behind.",
      "Serve a third of a finjan at a time — never full. Refill on request. Always pair with fresh dates.",
    ],
    notes: [
      "Light roast is non-negotiable — dark-roast Cahwa is wrong. The cardamom needs the lighter coffee to come through.",
      "The host pours; the guest taps the cup or wiggles it side-to-side to signal 'no more, thank you.'",
      "Saudi Cahwa skews lighter on cardamom than Levantine variants; Gulf style is more about coffee, less about spice.",
    ],
    pairing_sku: "coastal-blend-12oz",
    pairing_label: "Coastal Blend (12oz) — light roast adjustment recommended",
    tags: ["arabian", "ritual", "spiced", "light-roast"],
  },

  {
    slug: "turkish-coffee",
    name: "Turkish Coffee",
    also_known_as: "Türk Kahvesi",
    origin: "Turkey, Balkans, Levant, North Africa",
    origin_short: "Turkey — UNESCO-listed brewing tradition",
    difficulty: "moderate",
    brew_time_min: 4,
    total_time_min: 6,
    serves: "1-2 cups",
    vessel: "cezve (small copper or brass pot), demitasse cups",
    beans: "Arabica, ground to a powder finer than espresso",
    about:
      "Turkish coffee is the only major brewing method that drinks the grounds along with the liquid. UNESCO-recognized since 2013 as part of Turkey's intangible cultural heritage. Sweetness is decided BEFORE brewing — there's no spoon at the table.",
    steps: [
      "Per cup: pour cold water into the cezve, then add 1 heaping teaspoon of ultra-fine coffee. Add sugar now if you want it (sade=none, az=little, orta=medium, şekerli=sweet).",
      "Stir once, gently, until the grounds wet evenly. Don't stir again.",
      "Heat slowly on low. Watch for the foam (köpük) to rise — DO NOT let it boil over. As foam crests, lift off heat.",
      "Spoon a little foam into each cup. Return cezve to heat for a second rise. Pour, foam-first, into cups.",
      "Let the grounds settle for 30 seconds before sipping. Sip the liquid; do not stir.",
    ],
    notes: [
      "Never boil. Boiling kills the foam, and a Turkish coffee without foam is considered a failed cup.",
      "Serve with a glass of water (drink first, to clean the palate) and Turkish delight or a single date.",
      "After drinking, invert the cup over the saucer — the dried grounds form a pattern read for fortunes (tasseography).",
    ],
    pairing_sku: "coastal-sumatra-fairtrade-12oz",
    pairing_label: "Coastal Sumatra Fairtrade (12oz) — grind to flour-fine",
    tags: ["turkish", "ritual", "fine-grind", "no-filter"],
  },

  {
    slug: "ethiopian-buna",
    name: "Ethiopian Buna (Coffee Ceremony)",
    also_known_as: "Bunna, ቡና",
    origin: "Ethiopia — birthplace of coffee",
    origin_short: "Ethiopia — the birthplace of coffee, served in three rounds",
    difficulty: "ritual",
    brew_time_min: 30,
    total_time_min: 60,
    serves: "small group, three rounds",
    vessel: "jebena (clay pot, narrow neck, round base), small cini cups",
    beans: "green Ethiopian Arabica, roasted on the spot",
    about:
      "The Ethiopian coffee ceremony — Buna — is a roasting, brewing, and serving ritual that takes about an hour. It happens at home, with guests, and runs three rounds: Abol (first, strongest), Tona (second), Baraka (third, the blessing). Frankincense burns alongside; popcorn or kollo (roasted barley) is often served.",
    steps: [
      "Wash green coffee beans in cold water. Roast them in a flat pan over open flame, shaking constantly, until dark brown and oils surface. The smoke is part of the ceremony.",
      "Walk the freshly-roasted beans around the room; guests cup the smoke toward themselves.",
      "Grind the beans by hand (mortar and pestle) to medium-coarse.",
      "Bring water to a boil in the jebena. Add the grounds, return to heat. Boil briefly, then remove and let settle.",
      "Pour from a height through a small filter (often horsehair) into the cini cups in a single continuous stream — no refills mid-pour.",
      "Serve Round 1 (Abol). Re-add water to the jebena, re-boil, serve Round 2 (Tona). Repeat for Round 3 (Baraka, the blessing). Each round is gentler than the last.",
    ],
    notes: [
      "The ceremony is the point. Don't rush it. Frankincense is traditional; popcorn or roasted barley snacks make it complete.",
      "Skipping the third round is rude — Baraka is the blessing on the household.",
      "If you can't roast green beans at home, use the freshest Ethiopian single-origin you can find and treat the brewing as ceremony anyway.",
    ],
    pairing_sku: "coastal-blend-12oz",
    pairing_label: "Coastal Blend (12oz) — Ethiopian single-origin recommended when available",
    tags: ["ethiopian", "ceremony", "roast-to-brew", "single-origin"],
  },

  {
    slug: "vietnamese-phin",
    name: "Vietnamese Phin Drip",
    also_known_as: "Cà Phê Sữa Đá (iced with condensed milk), Cà Phê Phin",
    origin: "Vietnam",
    origin_short: "Vietnam — slow-drip metal filter, often with condensed milk",
    difficulty: "easy",
    brew_time_min: 5,
    total_time_min: 7,
    serves: "1 cup",
    vessel: "phin filter (small metal pot with perforated insert), glass tumbler",
    beans: "Robusta-forward dark roast, medium-coarse grind",
    about:
      "Vietnam grows mostly Robusta — bolder, higher caffeine, more bitter than Arabica. The phin filter sits directly on the cup; coffee drips through slowly into a layer of sweetened condensed milk waiting at the bottom. Iced (đá) is the most popular form in Vietnam's heat.",
    steps: [
      "Add 2 tablespoons of sweetened condensed milk to the bottom of a glass.",
      "Set the phin filter on top of the glass. Add 2-3 tablespoons of coarse-ground dark roast.",
      "Settle the grounds with the inner press — gentle, not packed.",
      "Pour 1-2 tablespoons of hot (just-off-boil) water over the grounds to bloom. Wait 30 seconds.",
      "Top up with hot water to the brim of the phin. Cover. Let it drip for 4-5 minutes — drips should be slow and steady, not racing.",
      "When dripping stops, lift the phin, stir condensed milk into the coffee, and pour over a tall glass of ice (for cà phê sữa đá).",
    ],
    notes: [
      "If the drip is too fast, your grind is too coarse or the press isn't seated; if it's too slow (or won't drip), the grind is too fine.",
      "Real Vietnamese cà phê uses Robusta. Arabica works but the cup tastes lighter than the original.",
      "Drink it cold. Vietnam's climate made cà phê sữa đá the default for a reason.",
    ],
    pairing_sku: "coastal-sumatra-fairtrade-12oz",
    pairing_label: "Coastal Sumatra Fairtrade (12oz) — coarse grind, dark roast",
    tags: ["vietnamese", "iced", "robusta", "condensed-milk"],
  },

  {
    slug: "italian-espresso",
    name: "Italian Espresso",
    origin: "Italy",
    origin_short: "Italy — 25 seconds, 9 bar, 1.5 oz of crema-topped intensity",
    difficulty: "moderate",
    brew_time_min: 1,
    total_time_min: 5,
    serves: "1 shot",
    vessel: "espresso machine (9 bar pressure), demitasse cup",
    beans: "Italian dark roast or espresso blend, fine grind",
    about:
      "Espresso is Italian for 'pressed out' — high pressure, short contact, concentrated extraction. A proper shot is 1-2 oz pulled in 25-30 seconds with a golden crema on top. In Italy you drink it standing at the bar, in three sips, and you're back outside in two minutes.",
    steps: [
      "Grind 18-20 g of dark-roast espresso beans to a fine powder (consistency of fine table salt).",
      "Dose into the portafilter basket. Distribute evenly with a finger sweep or distribution tool.",
      "Tamp firmly and level — about 30 lb of pressure, perfectly horizontal.",
      "Lock into the group head. Start extraction immediately — do not let the puck sit.",
      "Pull for 25-30 seconds. You should see honey-thick streams converge into a single ribbon, then transition from dark to amber-blonde.",
      "Stop the shot when you see blonding. Total volume: 36-40 g of espresso (about 1.3-1.5 oz).",
    ],
    notes: [
      "Crema is the signature — golden-brown foam from CO2 trapped in the oils. No crema = stale beans, wrong grind, or under-extracted.",
      "An espresso is meant to be drunk in 30-60 seconds while warm. If you sip slowly, you're drinking it wrong.",
      "Italians drink cappuccino only at breakfast. Ordering one after 11am marks you as a tourist (it's fine; we just notice).",
    ],
    pairing_sku: "coastal-blend-12oz",
    pairing_label: "Coastal Blend (12oz) — Italian roast recommended for crema",
    tags: ["italian", "high-pressure", "fine-grind", "espresso"],
  },

  {
    slug: "pour-over-v60",
    name: "Pour-Over (Hario V60)",
    origin: "Japan / global",
    origin_short: "Japanese-origin pour-over — clean, articulate, single-origin showcase",
    difficulty: "easy",
    brew_time_min: 4,
    total_time_min: 6,
    serves: "1 cup",
    vessel: "Hario V60 dripper, paper filter, gooseneck kettle, server",
    beans: "single-origin medium roast, medium-fine grind (slightly finer than table salt)",
    about:
      "Pour-over showcases what a single-origin coffee actually tastes like — no espresso pressure, no immersion mush, just water moving through grounds at a controlled rate. The V60 (V-shape, 60° cone) is the standard. Most-articulate cup you can brew without electricity.",
    steps: [
      "Heat water to 200-205°F (93-96°C). Place a #02 paper filter in the V60 and rinse with hot water — discard the rinse water (it removes paper taste and pre-warms the dripper).",
      "Grind 18-22 g of medium-roast beans, medium-fine. Add to the filter. Make a shallow well in the center.",
      "Bloom: pour 40-50 g of water in a circular motion, just enough to wet all grounds. Wait 30 seconds — you'll see CO2 bubbling.",
      "Main pour 1: slowly pour to ~150 g total (water weight), spiraling outward then inward. Don't pour on the filter walls.",
      "Wait until the water level drops to the bed surface, then pour 2: bring to ~250 g.",
      "Final pour: bring to 300 g total. Total brew time should be 3:30-4:00. Lift the dripper. Swirl the server. Drink.",
    ],
    notes: [
      "If your brew is over in under 3 minutes, your grind is too coarse. If it's over 4:30, too fine.",
      "Use a scale. Eyeballing weights is the #1 reason home pour-over is inconsistent.",
      "A single-origin coffee shows itself best on a V60. House blends do fine but shine less.",
    ],
    pairing_sku: "coastal-colombia-fairtrade-12oz",
    pairing_label: "Coastal Colombia Fairtrade (12oz) — single-origin medium roast",
    tags: ["pour-over", "single-origin", "manual", "filter"],
  },
];

export function findRecipeBySlug(slug: string): Recipe | undefined {
  return RECIPES.find((r) => r.slug === slug);
}

export const RECIPE_TAGS = Array.from(
  new Set(RECIPES.flatMap((r) => r.tags))
).sort();
