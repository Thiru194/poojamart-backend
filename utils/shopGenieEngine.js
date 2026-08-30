/*
  ShopGenie's brain — rules and catalog data, no language model.

  Every reply here is assembled from the store's own database and the
  knowledge base below, so a conversation costs nothing but a Mongo read.
  The trade-off is that it only understands what it has been taught: the
  intent patterns, category synonyms and help topics in this file ARE the
  assistant's vocabulary. Teaching it something new means adding to them.
*/

const Product = require('../models/ProductModel');

const Review = require('../models/ReviewModel');

/* The catalog changes rarely but is read on every message, so it is held
   briefly in memory. An admin's edit shows up within this window. */
const CACHE_MS = Number(process.env.SHOPGENIE_CACHE_MS) || 60000;

let cache = { at: 0, products: [], ratings: {} };

async function loadCatalog() {
  const now = Date.now();

  if (cache.at && now - cache.at < CACHE_MS && cache.products.length) {
    return cache;
  }

  const products = await Product.find()
    .select(
      'name category price image stock shortDescription description highlights topSale'
    )
    .lean();

  const ratingRows = await Review.aggregate([
    {
      $group: {
        _id: '$productId',
        avg: { $avg: '$rating' },
        count: { $sum: 1 }
      }
    }
  ]);

  const ratings = {};

  ratingRows.forEach((r) => {
    ratings[String(r._id)] = {
      avg: Math.round(r.avg * 10) / 10,
      count: r.count
    };
  });

  cache = { at: now, products, ratings };

  return cache;
}

/* Admin product writes can call this to drop the cache immediately */
function invalidateCatalog() {
  cache = { at: 0, products: [], ratings: {} };
}

/* ---------------------------------------------------------------- text -- */

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[₹,]/g, '')
    .replace(/[^a-z0-9\s.+-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* Words that carry no product meaning — dropped before keyword matching so
   "show me some good phones" searches for "phones", not for "show". */
const STOPWORDS = new Set(
  ('a an the is are am do does did i me my we you your can could would will ' +
    'want need looking look for find get give show tell suggest recommend ' +
    'search please help hi hello hey ok okay yes no thanks thank and or but ' +
    'with without in on of to from at by any some all more most any there ' +
    'here what which who how why when where product products item items ' +
    'something anything everything stuff good nice best top ' +
    'compare comparison vs versus difference better between ' +
    'thing things buy purchase order shop store price prices cost costs rs ' +
    'rupees inr have has had be been it its this that these those about ' +
    'available availability stock range list options option pls plz')
    .split(' ')
    .filter(Boolean)
);

function tokenize(text) {
  return normalize(text)
    .split(' ')
    .filter((t) => t && t.length > 1 && !STOPWORDS.has(t));
}

function formatINR(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN');
}

/* Category names are stored plural ("Laptops") but read better singular when
   pointing at one product. Multi-word names ("Idols & Statues") are left
   alone — naive stemming mangles them. */
function singularize(word) {
  const w = String(word || '');

  if (/[\s&]/.test(w)) return w;
  if (/(ch|sh|s|x|z)es$/i.test(w)) return w.slice(0, -2);
  if (/[^s]s$/i.test(w)) return w.slice(0, -1);

  return w;
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
}

/* ------------------------------------------------------------- numbers -- */

/*
  Turns the ways people actually write money into a number:
  "20k" "20,000" "₹20000" "1.5 lakh" "2l" all land on the same value.
*/
function parseAmount(raw, unit) {
  let n = parseFloat(String(raw).replace(/,/g, ''));

  if (!isFinite(n)) return null;

  const u = (unit || '').toLowerCase();

  if (u === 'k') n *= 1000;
  else if (u === 'l' || u.startsWith('lakh') || u.startsWith('lac')) n *= 100000;
  else if (u.startsWith('cr')) n *= 10000000;

  return Math.round(n);
}

/* Unit alternatives are longest-first: regex alternation takes the first
   match, so a leading "l" would consume just the "l" of "lakh" and leave
   "akh" behind as a stray search keyword. */
const AMT = '([0-9][0-9,]*\\.?[0-9]*)\\s*(lakhs?|lacs?|crores?|crs?|k|l)?';

/*
  Returns the price range plus the exact text it came from. The caller strips
  that text before keyword matching — stripping every number instead would
  turn "oneplus 13r" into "oneplus r".
*/
function parseBudget(text) {
  const t = normalize(text);

  /* between 20k and 40k / 20000 - 40000 / 20k to 40k */
  let m =
    t.match(new RegExp(`between\\s+${AMT}\\s*(?:and|to|-)\\s*${AMT}`)) ||
    t.match(new RegExp(`${AMT}\\s*(?:to|-)\\s*${AMT}`));

  if (m) {
    const a = parseAmount(m[1], m[2]);
    const b = parseAmount(m[3], m[4]);

    if (a && b) {
      return {
        min: Math.min(a, b),
        max: Math.max(a, b),
        matched: m[0]
      };
    }
  }

  /* around 30k — treated as a ±20% band */
  m = t.match(new RegExp(`(?:around|about|near|approx\\.?|roughly)\\s+${AMT}`));

  if (m) {
    const a = parseAmount(m[1], m[2]);

    if (a) {
      return {
        min: Math.round(a * 0.8),
        max: Math.round(a * 1.2),
        matched: m[0]
      };
    }
  }

  /* under 20k / below / less than / within / upto / < */
  m = t.match(
    new RegExp(
      `(?:under|below|less than|lesser than|within|upto|up to|max|maximum|cheaper than|<=?)\\s*${AMT}`
    )
  );

  if (m) {
    const a = parseAmount(m[1], m[2]);
    if (a) return { min: null, max: a, matched: m[0] };
  }

  /* above 50k / over / more than / starting from / > */
  m = t.match(
    new RegExp(
      `(?:above|over|more than|greater than|atleast|at least|minimum|min|starting (?:from|at)|>=?)\\s*${AMT}`
    )
  );

  if (m) {
    const a = parseAmount(m[1], m[2]);
    if (a) return { min: a, max: null, matched: m[0] };
  }

  return null;
}

/* --------------------------------------------------------- categories --- */

/*
  Maps what shoppers type onto the catalog's own category names.

  Keys are the NORMALIZED category name — lowercase, punctuation stripped —
  so "Incense & Dhoop" is keyed as "incense dhoop". A category with no entry
  here still matches on its own name; these only add the words shoppers use
  that the category name itself does not contain.

  Both the spiritual and the electronics catalogs are covered, since entries
  for categories the store does not stock simply never match.
*/
const CATEGORY_SYNONYMS = {
  /* spiritual store */
  'puja essentials': [
    'puja',
    'pooja',
    'prayer',
    'worship',
    'ritual',
    'thali',
    'kalash',
    'diya',
    'diyas',
    'lamp',
    'lamps',
    'aarti',
    'arti',
    'camphor',
    'kumkum',
    'chandan',
    'tilak',
    'essentials'
  ],
  'incense dhoop': [
    'incense',
    'dhoop',
    'agarbatti',
    'agarbathi',
    'agarbatthi',
    'sambrani',
    'loban',
    'fragrance',
    'perfume',
    'sticks',
    'cones',
    'nag champa',
    'sandalwood'
  ],
  'idols statues': [
    'idol',
    'idols',
    'statue',
    'statues',
    'murti',
    'murthi',
    'moorti',
    'deity',
    'god',
    'bronze',
    'ganesh',
    'ganesha',
    'lakshmi',
    'hanuman',
    'buddha',
    'nataraja',
    'krishna',
    'shiva'
  ],

  /* electronics store */
  mobiles: ['mobile', 'phone', 'phones', 'smartphone', 'smartphones', 'cell'],
  laptops: ['laptop', 'notebook', 'macbook', 'ultrabook', 'chromebook'],
  headphones: [
    'headphone',
    'earphone',
    'earphones',
    'earbud',
    'earbuds',
    'headset',
    'tws',
    'airpods'
  ],
  speakers: ['speaker', 'soundbar', 'boombox', 'audio'],
  'smart watches': [
    'smartwatch',
    'smartwatches',
    'watch',
    'watches',
    'wearable',
    'band'
  ],
  televisions: ['tv', 'tvs', 'television', 'led', 'oled', 'smart tv'],
  cameras: ['camera', 'dslr', 'mirrorless', 'camcorder', 'gopro'],
  keyboards: ['keyboard', 'keypad', 'mechanical keyboard'],
  mice: ['mouse', 'mice', 'trackpad'],
  monitors: ['monitor', 'display', 'screen'],
  printers: ['printer', 'printing', 'scanner'],
  tablets: ['tablet', 'tab', 'ipad'],
  'power banks': ['power bank', 'powerbank', 'battery pack', 'charger'],
  fitness: ['fitness', 'gym', 'treadmill', 'dumbbell', 'yoga', 'workout'],
  gaming: ['gaming', 'console', 'playstation', 'ps5', 'xbox', 'controller'],
  accessories: ['accessory', 'accessories', 'cable', 'case', 'cover', 'stand'],
  electronics: ['electronics', 'electronic', 'gadget', 'gadgets']
};

function detectCategory(text, categories) {
  const t = ' ' + normalize(text) + ' ';

  let best = null;

  categories.forEach((cat) => {
    /* normalized, so "Incense & Dhoop" is compared as "incense dhoop" —
       the raw name with its ampersand can never appear in normalized text */
    const key = normalize(cat);

    /* the category's own name, singular or plural */
    const names = [key];

    if (key.endsWith('s')) names.push(key.slice(0, -1));
    else names.push(key + 's');

    const synonyms = CATEGORY_SYNONYMS[key] || [];

    [...names, ...synonyms].forEach((word) => {
      if (t.includes(' ' + word + ' ')) {
        /* longer matches win: "smart watches" beats "watch" */
        if (!best || word.length > best.length) {
          best = { category: cat, length: word.length };
        }
      }
    });
  });

  return best ? best.category : null;
}

/* -------------------------------------------------------------- intent -- */

const SORT_WORDS = {
  cheap: [
    'cheap',
    'cheapest',
    'budget',
    'affordable',
    'inexpensive',
    'economical',
    'lowest',
    'low price',
    'low cost',
    'least expensive'
  ],
  value: [
    'value for money',
    'best value',
    'value',
    'cost efficient',
    'cost-efficient',
    'cost effective',
    'cost-effective',
    'worth it',
    'worth buying',
    'vfm',
    'bang for',
    'best deal',
    'best buy',
    'good deal'
  ],
  premium: [
    'premium',
    'expensive',
    'costliest',
    'high end',
    'high-end',
    'flagship',
    'luxury',
    'top end',
    'best quality'
  ],
  rating: [
    'best rated',
    'top rated',
    'highest rated',
    'best reviewed',
    'most reviewed',
    'popular',
    'best selling',
    'bestselling',
    'trending'
  ]
};

/* Longest first, so "cheapest" is consumed before the shorter "cheap" can
   eat its prefix and leave "est" behind. */
const SORT_WORD_RE = new RegExp(
  '\\b(' +
    Object.values(SORT_WORDS)
      .flat()
      .sort((a, b) => b.length - a.length)
      .map(escapeRegex)
      .join('|') +
    ')\\b',
  'g'
);

function detectSort(text) {
  const t = ' ' + normalize(text) + ' ';

  /* Check the multi-word intents first so "best rated" is not read as
     the bare "best" fallback below. */
  for (const key of ['rating', 'value', 'premium', 'cheap']) {
    if (SORT_WORDS[key].some((w) => t.includes(' ' + w))) {
      return key;
    }
  }

  /*
    A bare "best"/"good" ranks by rating, not by value. Value ranking rewards
    being cheap for its category, which inside a broad category means a ₹5,000
    tripod outranks every actual camera — not what someone asking for "a good
    camera" wants. They have to say "best value" to get that ranking.
  */
  if (/\b(best|good|nice|top|recommend|suggest)\b/.test(t)) return 'rating';

  return null;
}

function isCompareIntent(text) {
  const t = normalize(text);

  return (
    /\bcompare\b/.test(t) ||
    /\bvs\.?\b/.test(t) ||
    /\bversus\b/.test(t) ||
    /\bdifference between\b/.test(t) ||
    /\bwhich (?:one )?is better\b/.test(t)
  );
}

function isGreeting(text) {
  return /^(hi|hey|hello|hii+|yo|good\s*(morning|afternoon|evening)|namaste)\b/.test(
    normalize(text)
  );
}

function isThanks(text) {
  return /^(thanks|thank you|thx|ty|great|awesome|nice|cool|ok|okay|got it|bye|goodbye)\b/.test(
    normalize(text)
  );
}

/* ------------------------------------------------------------ matching -- */

/* "diyas" has to find "Brass Diya", so each word is tried both ways */
function wordVariants(tok) {
  if (tok.endsWith('s') && tok.length > 3) return [tok, tok.slice(0, -1)];
  return [tok, tok + 's'];
}

/* How well a product answers a set of query words. Name hits count most,
   because that is what people actually type. */
function scoreProduct(product, tokens) {
  if (!tokens.length) return 0;

  const name = normalize(product.name);
  const category = normalize(product.category);
  const blurb = normalize(
    [product.shortDescription, product.description, (product.highlights || []).join(' ')].join(' ')
  );

  let score = 0;
  let hits = 0;

  tokens.forEach((tok) => {
    let hit = false;

    const variants = wordVariants(tok);

    const inName = variants.find((v) => name.includes(v));

    if (inName) {
      score += new RegExp(`\\b${escapeRegex(inName)}\\b`).test(name) ? 5 : 3;
      hit = true;
    }

    if (variants.some((v) => category.includes(v))) {
      score += 2;
      hit = true;
    }

    if (variants.some((v) => blurb.includes(v))) {
      score += 1;
      hit = true;
    }

    if (hit) hits += 1;
  });

  /* Reward matching most of what was asked for, not just one word of it */
  score *= 0.5 + hits / tokens.length;

  return score;
}

/* Resolve a free-text fragment ("oneplus 13r") to one catalog product */
function matchProductByName(fragment, products) {
  const frag = normalize(fragment);

  if (!frag) return null;

  const fragTokens = frag.split(' ').filter(Boolean);

  let best = null;

  products.forEach((p) => {
    const name = normalize(p.name);

    let score = 0;

    if (name === frag) score = 1000;
    else if (name.includes(frag)) score = 500 + frag.length;
    else if (frag.includes(name)) score = 400 + name.length;
    else {
      const nameTokens = name.split(' ').filter(Boolean);

      /* plural-tolerant, so "buddha idols" reaches "Meditating Buddha Idol" */
      const shared = fragTokens.filter((t) =>
        wordVariants(t).some((v) => nameTokens.includes(v))
      ).length;

      if (shared) {
        /* needs to cover a real share of the name, so "pro" alone does not
           match every product with "Pro" in it */
        score = (shared / Math.max(nameTokens.length, fragTokens.length)) * 100;
        if (score < 40) score = 0;
      }
    }

    if (score && (!best || score > best.score)) {
      best = { product: p, score };
    }
  });

  return best ? best.product : null;
}

/* Pull the product names out of "compare A and B" / "A vs B" */
function extractCompareTargets(text, products) {
  let t = String(text || '')
    .replace(/^\s*(please\s+)?(can you\s+)?(compare|difference between|which is better between|which one is better)\b/i, ' ')
    .replace(/\b(which (?:one )?is better|difference between|compare)\b/gi, ' ')
    .replace(/\?/g, ' ');

  const parts = t
    .split(/\s+(?:vs\.?|versus|and|or|with)\s+|,/i)
    .map((s) => s.trim())
    .filter((s) => s && s.length > 1);

  const found = [];
  const usedIds = new Set();

  parts.forEach((part) => {
    const p = matchProductByName(part, products);

    if (p && !usedIds.has(String(p._id))) {
      usedIds.add(String(p._id));
      found.push(p);
    }
  });

  return found;
}

/* --------------------------------------------------------------- value -- */

/*
  "Cost efficient" made concrete: how well rated a product is, weighed
  against how its price compares with the middle of its own category. A
  well-reviewed product priced below its category's median scores highest.
  Unrated products sit at a neutral 3.5 so they are neither buried nor
  favoured over things customers have actually rated.
*/
function medianOf(numbers) {
  if (!numbers.length) return 0;

  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function decorate(products, ratings) {
  const medianByCategory = {};

  products.forEach((p) => {
    (medianByCategory[p.category] = medianByCategory[p.category] || []).push(
      p.price
    );
  });

  Object.keys(medianByCategory).forEach((c) => {
    medianByCategory[c] = medianOf(medianByCategory[c]);
  });

  return products.map((p) => {
    const r = ratings[String(p._id)];
    const rating = r ? r.avg : null;
    const ratingCount = r ? r.count : 0;

    const median = medianByCategory[p.category] || p.price;

    /* capped so a single very cheap item cannot dominate on price alone */
    const priceEdge = Math.min(median / Math.max(p.price, 1), 2.5);

    const ratingScore = (rating == null ? 3.5 : rating) / 5;

    return {
      ...p,
      rating,
      ratingCount,
      categoryMedian: median,
      valueScore: Math.round(ratingScore * priceEdge * 1000) / 1000
    };
  });
}

/* ------------------------------------------------------------- replies -- */

/*
  Results are returned as structured rows, not as a numbered list inside the
  reply text. The client renders them as cards — price, rating and stock are
  far more legible as their own fields than as "— ₹999 · ★4 · in stock"
  crammed into a sentence, and the text stays short.
*/
function cardFields(p, extra) {
  return {
    _id: p._id,
    name: p.name,
    price: p.price,
    image: p.image,
    category: p.category,
    blurb: (p.shortDescription || '').trim(),
    rating: p.rating == null ? null : p.rating,
    ratingCount: p.ratingCount || 0,
    stock: p.stock,
    ...(extra || {})
  };
}

/*
  One row of the side-by-side table. The client renders these as columns, so
  a row carries the fuller description and highlights that a card leaves out.
*/
function comparisonRow(p) {
  return {
    _id: p._id,
    name: p.name,
    image: p.image,
    category: p.category || '',
    description: p.shortDescription || p.description || '',
    highlights: p.highlights || [],
    stock: p.stock,
    price: p.price,
    rating: p.rating,
    ratingCount: p.ratingCount
  };
}

/* What to call the top result, given how the list was ranked */
const TOP_BADGE = {
  cheap: 'Cheapest',
  value: 'Best value',
  premium: 'Most premium',
  rating: 'Top rated'
};

const SORT_LABEL = {
  cheap: 'most affordable',
  value: 'best value',
  premium: 'most premium',
  rating: 'best rated'
};

function sortProducts(list, sort) {
  const items = [...list];

  if (sort === 'cheap') {
    items.sort((a, b) => a.price - b.price);
  } else if (sort === 'premium') {
    items.sort((a, b) => b.price - a.price);
  } else if (sort === 'rating') {
    items.sort(
      (a, b) =>
        (b.rating || 0) - (a.rating || 0) ||
        b.ratingCount - a.ratingCount ||
        a.price - b.price
    );
  } else {
    items.sort((a, b) => b.valueScore - a.valueScore || a.price - b.price);
  }

  return items;
}

/* ------------------------------------------------------------ shopping -- */

/*
  The shared filter pipeline: budget, category, keywords, ranking. Both the
  search path and the "compare a whole shelf" path run through it, so the two
  always agree on what a phrase means.

  status:
    'ok'           - `ordered` holds the matches, best first
    'no-match'     - they named something we do not stock
    'empty-filter' - the category/budget combination has nothing in it
*/
function findMatches(message, products, categories) {
  const budget = parseBudget(message);
  const sort = detectSort(message);
  const category = detectCategory(message, categories);

  /* Sort and budget words are instructions, not product keywords, so they
     come out before keyword matching. Whole words only — a plain substring
     strip turns "cheapest" into "est" and then searches for that. */
  let cleaned = normalize(message);

  if (budget && budget.matched) {
    cleaned = cleaned.split(budget.matched).join(' ');
  }

  cleaned = cleaned
    .replace(SORT_WORD_RE, ' ')
    .replace(
      /\b(under|below|less than|within|upto|up to|above|over|more than|between|around|about|near|approx|roughly|and|to|max|maximum|min|minimum|atleast|at least|best|good|top)\b/g,
      ' '
    );

  const tokens = tokenize(cleaned);

  let pool = products;

  if (category) {
    pool = pool.filter((p) => p.category === category);
  }

  if (budget) {
    pool = pool.filter(
      (p) =>
        (budget.min == null || p.price >= budget.min) &&
        (budget.max == null || p.price <= budget.max)
    );
  }

  /* Keyword narrowing, but only when the words actually hit something */
  let scored = pool;
  let rankedByRelevance = false;

  if (tokens.length) {
    const withScores = pool
      .map((p) => ({ p, s: scoreProduct(p, tokens) }))
      .filter((x) => x.s > 0);

    if (withScores.length) {
      withScores.sort((a, b) => b.s - a.s);
      scored = withScores.map((x) => x.p);
      rankedByRelevance = true;
    } else if (!category) {
      /*
        They named something we do not stock. Say so — a budget in the same
        sentence is not a reason to answer a different question by listing
        everything under that price.
      */
      return { status: 'no-match', category, budget, sort, tokens, ordered: [] };
    }
    /* With a category we can still answer; the leftover words were noise. */
  }

  if (!scored.length) {
    return { status: 'empty-filter', category, budget, sort, tokens, ordered: [] };
  }

  /* Relevance already ordered the list when keywords matched; an explicit
     sort request overrides it. Anything else falls back to the value
     ranking, so a plain category browse is never in raw database order. */
  const ordered =
    sort || !rankedByRelevance ? sortProducts(scored, sort) : scored;

  return { status: 'ok', category, budget, sort, tokens, ordered };
}

async function handleShopping(message) {
  const { products: raw, ratings } = await loadCatalog();

  const products = decorate(raw, ratings);

  const categories = [...new Set(products.map((p) => p.category))];

  if (isGreeting(message)) {
    const ex = examples(products, categories);

    return {
      reply:
        `Hi! I'm ShopGenie 🧞 I can find products and compare them for you.\n\n` +
        `Try:\n` +
        `• "best value ${ex.category} under ${ex.budget}"\n` +
        `• "cheapest ${ex.otherCategory}"\n` +
        `• "compare ${ex.productA} and ${ex.productB}"\n\n` +
        `We stock: ${categories.slice(0, 8).join(', ')}${categories.length > 8 ? '…' : ''}`,
      products: []
    };
  }

  if (isThanks(message)) {
    return {
      reply: "Happy to help! Ask me for anything else you're looking for. 🧞",
      products: []
    };
  }

  /* Support questions belong in the help chat, not here */
  const support = matchHelpTopic(message);

  if (support && support.entry.strong && !detectCategory(message, categories)) {
    return {
      reply:
        `That's a support question rather than a product one — the 💬 Help chat at the bottom-right can sort it out.\n\n` +
        support.entry.answer,
      products: []
    };
  }

  /* ---- compare ---- */
  if (isCompareIntent(message)) {
    const targets = extractCompareTargets(message, products);

    if (targets.length >= 2) {
      return buildComparison(targets.slice(0, 4), products);
    }

    if (targets.length === 1) {
      return {
        reply:
          `I found "${targets[0].name}" but need a second product to compare it with.\n` +
          `Try: "compare ${targets[0].name} and <another product>".`,
        products: [cardFields(targets[0])]
      };
    }

    /*
      They asked to compare but named no product we stock — "compare idols",
      "compare the cheapest incense". Run it through the same filters a search
      would use and compare whatever comes back, so any compare request that
      can produce a table does.
    */
    const found = findMatches(message, products, categories);

    if (found.status === 'ok' && found.ordered.length >= 2) {
      /* Take the best matches, then lay the table out cheapest-first — a
         price-ordered table is far easier to read across than one in
         relevance order. Explicitly named products keep the user's order. */
      const shelf = found.ordered
        .slice(0, 4)
        .sort((a, b) => a.price - b.price);

      return buildComparison(shelf, products, {
        intro: buildSearchHeader({
          count: Math.min(found.ordered.length, 4),
          shown: Math.min(found.ordered.length, 4),
          sort: found.sort,
          category: found.category,
          budget: found.budget,
          query: found.tokens.join(' ')
        }).replace(/^(\d+) match(es)? for /, 'Comparing the top ')
      });
    }

    const ex = examples(products, categories);

    return {
      reply:
        `I couldn't match those to products in our catalog. Use the exact product names — for example:\n` +
        `"compare ${ex.productA} and ${ex.productB}".\n\n` +
        `You can also compare a whole shelf: "compare ${ex.category}".`,
      products: []
    };
  }

  /* ---- search ---- */
  const found = findMatches(message, products, categories);

  if (found.status === 'no-match') {
    return noMatchReply(message, products, categories);
  }

  if (found.status === 'empty-filter') {
    return emptyFilterReply(
      found.category,
      found.budget,
      products,
      categories
    );
  }

  const { ordered, category, budget, sort, tokens } = found;

  const top = ordered.slice(0, 4);

  const header = buildSearchHeader({
    count: ordered.length,
    shown: top.length,
    sort,
    category,
    budget,
    /* what to call the search when no category was named */
    query: tokens.join(' ')
  });

  const notes = [];

  if (sort === 'value') {
    const b = top[0];

    if (b && b.price < b.categoryMedian) {
      const pct = Math.round((1 - b.price / b.categoryMedian) * 100);

      if (pct >= 5) {
        notes.push(
          `${b.name} is the pick here — ${pct}% below the typical ${b.category} price${b.rating != null ? ` and rated ★${b.rating}` : ''}.`
        );
      }
    }
  }

  if (top.length >= 2) {
    notes.push(`Ask me to "compare ${top[0].name} and ${top[1].name}" for a side-by-side.`);
  }

  return {
    reply: [header, notes.join('\n')].filter(Boolean).join('\n\n'),
    products: top.map((p, i) =>
      cardFields(p, {
        rank: i + 1,
        badge: i === 0 && top.length > 1 ? TOP_BADGE[sort] || 'Best value' : null
      })
    )
  };
}

/* Phrased as a count so it stays grammatical whatever the category is
   called — "Here is the Mobiles between…" does not. */
function buildSearchHeader({ count, shown, sort, category, budget, query }) {
  const what = category
    ? category.toLowerCase()
    : query
      ? `"${query}"`
      : 'products';

  const qualifier = sort ? SORT_LABEL[sort] + ' ' : '';

  let range = '';

  if (budget) {
    if (budget.min != null && budget.max != null) {
      range = ` between ${formatINR(budget.min)} and ${formatINR(budget.max)}`;
    } else if (budget.max != null) {
      range = ` under ${formatINR(budget.max)}`;
    } else {
      range = ` above ${formatINR(budget.min)}`;
    }
  }

  const more = count > shown ? ` — showing the top ${shown}` : '';

  return `${count} match${count === 1 ? '' : 'es'} for ${qualifier}${what}${range}${more}:`;
}

/*
  Every example the assistant offers is built from the store's real catalog.
  Hard-coded ones ("laptops under ₹60,000") are actively misleading when the
  shop sells ₹129 incense, and they go stale the moment the catalog changes.
*/
function examples(products, categories) {
  const prices = products.map((p) => p.price);

  const mid = medianOf(prices) || 1000;

  /* round up to something a person would actually type */
  const step = mid >= 50000 ? 10000 : mid >= 5000 ? 1000 : 100;
  const budget = Math.max(step, Math.ceil((mid * 1.5) / step) * step);

  const inFirst = products.filter((p) => p.category === categories[0]);

  const pair = (inFirst.length >= 2 ? inFirst : products).slice(0, 2);

  return {
    category: (categories[0] || 'products').toLowerCase(),
    otherCategory: (categories[1] || categories[0] || 'products').toLowerCase(),
    budget: formatINR(budget),
    productA: pair[0] ? pair[0].name : 'product A',
    productB: pair[1] ? pair[1].name : 'product B'
  };
}

function noMatchReply(message, products, categories) {
  const ex = examples(products, categories);

  return {
    reply:
      `I couldn't find anything matching that in our catalog.\n\n` +
      `I can search by category, budget or name — for example:\n` +
      `• "${ex.category} under ${ex.budget}"\n` +
      `• "cheapest ${ex.otherCategory}"\n` +
      `• "best value ${ex.category}"\n\n` +
      `Categories: ${categories.join(', ')}`,
    products: []
  };
}

function emptyFilterReply(category, budget, products, categories) {
  const pool = category
    ? products.filter((p) => p.category === category)
    : products;

  if (!pool.length) {
    return noMatchReply('', products, categories);
  }

  const what = (category || 'products').toLowerCase();

  let constraint = '';
  let label;
  let suggestion;

  if (budget && budget.max != null) {
    /* they asked cheaper than we stock — offer the cheapest we have */
    constraint = ` under ${formatINR(budget.max)}`;
    label = 'cheapest';
    suggestion = [...pool].sort((a, b) => a.price - b.price)[0];
  } else if (budget) {
    /* asked dearer than we stock — offer the most expensive */
    constraint = ` above ${formatINR(budget.min)}`;
    label = 'most premium';
    suggestion = [...pool].sort((a, b) => b.price - a.price)[0];
  } else {
    label = 'best-value';
    suggestion = [...pool].sort((a, b) => b.valueScore - a.valueScore)[0];
  }

  return {
    reply:
      `We don't have any ${what}${constraint} right now.\n\n` +
      `Our ${label} ${category ? singularize(category.toLowerCase()) : 'option'}: ${suggestion.name} at ${formatINR(suggestion.price)}.`,
    products: [cardFields(suggestion)]
  };
}

/* ---------------------------------------------------------- comparison -- */

function buildComparison(targets, allProducts, { intro } = {}) {
  const names = targets.map((p) => p.name);

  const cheapest = [...targets].sort((a, b) => a.price - b.price)[0];
  const dearest = [...targets].sort((a, b) => b.price - a.price)[0];

  const rated = targets.filter((p) => p.rating != null);

  const bestRated = rated.length
    ? [...rated].sort((a, b) => b.rating - a.rating)[0]
    : null;

  const bestValue = [...targets].sort((a, b) => b.valueScore - a.valueScore)[0];

  const lines = [intro || `Comparing ${names.join(' and ')}:`];

  if (cheapest._id !== dearest._id) {
    const gap = dearest.price - cheapest.price;

    lines.push(
      `• Cheaper: ${cheapest.name} at ${formatINR(cheapest.price)} — ${formatINR(gap)} less than ${dearest.name}.`
    );
  } else {
    lines.push(`• Both are priced the same at ${formatINR(cheapest.price)}.`);
  }

  if (bestRated && rated.length > 1) {
    lines.push(
      `• Better rated: ${bestRated.name} at ★${bestRated.rating} from ${bestRated.ratingCount} review${bestRated.ratingCount === 1 ? '' : 's'}.`
    );
  } else if (bestRated) {
    lines.push(
      `• Only ${bestRated.name} has reviews so far — ★${bestRated.rating}.`
    );
  }

  if (bestValue._id !== cheapest._id) {
    lines.push(
      `• Best value: ${bestValue.name} — the rating justifies the price better here.`
    );
  } else {
    lines.push(`• Best value: ${bestValue.name}.`);
  }

  const outOfStock = targets.filter((p) => p.stock <= 0);

  if (outOfStock.length) {
    lines.push(
      `• Out of stock: ${outOfStock.map((p) => p.name).join(', ')}.`
    );
  }

  const comparison = targets.map(comparisonRow);

  return {
    reply: lines.join('\n'),
    products: [],
    comparison
  };
}

/* ------------------------------------------------------------- help KB -- */

/*
  The support assistant's whole vocabulary. Each topic lists the words that
  should trigger it; `strong` marks a topic as a real problem rather than a
  how-to, which is what decides whether a ticket is offered. `ticket` is the
  category the ticket form gets pre-filled with, and must be one of the five
  the Help page offers.
*/
const HELP_KB = [
  {
    id: 'track-order',
    keywords: ['track', 'tracking', 'where is my order', 'order status', 'shipped', 'dispatch', 'delivery status', 'reached'],
    answer:
      'You can track an order from the Orders page — it shows real-time status updates from Confirmed through to Delivered.\n\nOpen Orders from the menu, find the order, and the current stage is shown on the card.',
    ticket: null
  },
  {
    id: 'late-delivery',
    keywords: ['late', 'delayed', 'not delivered', 'still not received', 'not received', 'taking too long', 'missing order', 'not arrived'],
    answer:
      "Sorry about the delay. Check the Orders page first — if the status hasn't moved in a while, raise a Shipping Issue ticket and our team will chase it up for you.",
    ticket: 'Shipping Issue',
    strong: true
  },
  {
    id: 'cancel-order',
    keywords: ['cancel', 'cancellation', 'cancel my order', 'dont want', "don't want"],
    answer:
      'To cancel: open the Orders page, click "Cancel Order" on the order and pick a reason.\n\nCancellation is possible until the order goes Out For Delivery. After that, accept the delivery and request a refund instead.',
    ticket: null
  },
  {
    id: 'refund',
    keywords: ['refund', 'money back', 'return', 'returns', 'replace', 'replacement', 'exchange'],
    answer:
      'Refunds are requested from the Orders page — open the order and submit a refund request.\n\nOnce approved, the amount goes back to the original payment method. If a refund is stuck or overdue, raise a Refund Issue ticket.',
    ticket: 'Refund Issue',
    strong: true
  },
  {
    id: 'payment-methods',
    keywords: ['payment method', 'payment options', 'how can i pay', 'which payment', 'accept', 'upi', 'net banking', 'credit card', 'debit card'],
    answer:
      'We accept UPI, Debit Card, Credit Card, Net Banking and Cash on Delivery.',
    ticket: null
  },
  {
    id: 'payment-failed',
    keywords: ['payment failed', 'payment issue', 'money deducted', 'amount deducted', 'deducted', 'debited', 'charged twice', 'double charge', 'transaction failed', 'payment not working', 'payment stuck'],
    answer:
      "If money was deducted but the order didn't confirm, it is normally auto-reversed by your bank within 5-7 working days.\n\nRaise a Payment Issue ticket with the transaction reference and we'll track it from our side.",
    ticket: 'Payment Issue',
    strong: true
  },
  {
    id: 'cod',
    keywords: ['cod', 'cash on delivery', 'pay on delivery'],
    answer:
      'Yes, Cash on Delivery is available — pick COD at checkout and pay the courier when the order arrives.',
    ticket: null
  },
  {
    id: 'shipping-cost',
    keywords: ['shipping charge', 'delivery charge', 'shipping cost', 'delivery fee', 'free delivery', 'free shipping'],
    answer:
      'Delivery is free on all orders — the total you see at checkout is the total you pay.',
    ticket: null
  },
  {
    id: 'delivery-time',
    keywords: ['how long', 'delivery time', 'how many days', 'when will i get', 'when will it arrive', 'eta'],
    answer:
      'Most orders arrive within 3-5 working days. The Orders page shows the current stage of each order as it moves.',
    ticket: null
  },
  {
    id: 'change-address',
    keywords: ['change address', 'wrong address', 'update address', 'edit address', 'change my address'],
    answer:
      "An address can't be edited once an order is placed. If it hasn't shipped yet, cancel it from the Orders page and reorder with the right address — otherwise raise an Order Issue ticket quickly and we'll try to catch it.",
    ticket: 'Order Issue',
    strong: true
  },
  {
    id: 'wrong-damaged',
    keywords: ['wrong item', 'wrong product', 'damaged', 'broken', 'defective', 'not working', 'faulty', 'missing item'],
    answer:
      "Sorry about that. Raise an Order Issue ticket with the order id and what arrived — a photo helps — and we'll arrange a replacement or refund.",
    ticket: 'Order Issue',
    strong: true
  },
  {
    id: 'login',
    keywords: ['login', 'log in', 'sign in', 'cant login', "can't login", 'password', 'forgot password', 'reset password', 'locked out'],
    answer:
      'Use "Forgot Password" on the login screen to get a reset link by email.\n\nIf that link never arrives, check spam first, then raise an Account Issue ticket.',
    ticket: 'Account Issue',
    strong: true
  },
  {
    id: 'account',
    keywords: ['account', 'profile', 'my details', 'update profile', 'change email', 'change phone', 'delete account'],
    answer:
      'Profile details are editable from your account page. For anything you cannot change there — email address or account deletion — raise an Account Issue ticket.',
    ticket: 'Account Issue',
    strong: true
  },
  {
    id: 'invoice',
    keywords: ['invoice', 'bill', 'receipt', 'gst'],
    answer:
      'The invoice for a delivered order is available from the Orders page, on the order details.',
    ticket: null
  },
  {
    id: 'warranty',
    keywords: ['warranty', 'guarantee', 'service centre', 'service center'],
    answer:
      'Warranty is handled by the brand and the duration is listed on the product page. Keep the invoice from your Orders page — it is your proof of purchase.',
    ticket: null
  },
  {
    id: 'offers',
    keywords: ['offer', 'offers', 'coupon', 'discount', 'promo', 'promo code', 'deal'],
    answer:
      'Live offers show on the product and cart pages, and any applicable discount is applied at checkout automatically.',
    ticket: null
  },
  {
    id: 'ticket-how',
    keywords: ['raise ticket', 'raise a ticket', 'support ticket', 'contact support', 'talk to human', 'human', 'talk to someone', 'speak to someone', 'real person', 'customer care', 'customer support', 'complaint', 'agent', 'executive'],
    answer:
      'To raise a ticket: open the Help page, choose the issue category, add a subject and description, and submit.\n\nReplies from our team appear under "My Tickets".',
    ticket: 'Order Issue'
  },
  {
    id: 'ticket-status',
    keywords: ['my ticket', 'ticket status', 'my tickets', 'ticket reply', 'any update on my ticket'],
    answer:
      'Open "My Tickets" to see every ticket you have raised, its status, and any reply from our support team.',
    ticket: null
  },
  {
    id: 'contact',
    keywords: ['email', 'phone number', 'call', 'contact', 'reach you', 'helpline'],
    answer:
      'You can reach us at support@shopease.com or +91 9876543210. Raising a ticket from the Help page is usually fastest — it goes straight to the team with your order details attached.',
    ticket: null
  }
];

/*
  Best-matching help topic, or null.

  Matching is on whole words rather than raw substrings, because people put
  words in the middle of a phrase — "money GOT deducted" has to reach the
  same topic as "money deducted". A phrase matches when all of its words are
  present anywhere in the message; appearing contiguously just scores higher.
  Word-level matching also stops "cod" from matching inside "code".
*/
function wordSet(text) {
  const words = new Set();

  normalize(text)
    .split(' ')
    .filter(Boolean)
    .forEach((w) => {
      words.add(w);

      /* crude singular/plural so "refunds" reaches the "refund" topic */
      if (w.endsWith('s') && w.length > 3) words.add(w.slice(0, -1));
      else words.add(w + 's');
    });

  return words;
}

function matchHelpTopic(message) {
  const t = normalize(message);
  const words = wordSet(message);

  let best = null;

  HELP_KB.forEach((entry) => {
    let score = 0;

    entry.keywords.forEach((kw) => {
      const k = normalize(kw);
      const parts = k.split(' ').filter(Boolean);

      if (!parts.every((p) => words.has(p))) return;

      /* more words matched = more specific topic = better match */
      const s =
        k.replace(/\s/g, '').length + parts.length * 4 + (t.includes(k) ? 6 : 0);

      score = Math.max(score, s);
    });

    if (score && (!best || score > best.score)) {
      best = { entry, score };
    }
  });

  return best;
}

/* Shopping questions asked in the help chat get handed to the assistant */
function looksLikeShopping(message) {
  const t = normalize(message);

  return (
    isCompareIntent(t) ||
    /\b(buy|recommend|suggest|looking for|show me|which product|best|cheap|cheapest|under \d|price of)\b/.test(
      t
    )
  );
}

async function handleHelp(message) {
  if (isGreeting(message)) {
    return {
      reply:
        "Hi! I'm ShopGenie Support 🧞 I can help with orders, payments, shipping, refunds and account issues.\n\nWhat's gone wrong?",
      products: []
    };
  }

  if (isThanks(message)) {
    return {
      reply: 'Glad that helped! Anything else I can sort out?',
      products: []
    };
  }

  const match = matchHelpTopic(message);

  if (match) {
    const { entry } = match;

    return {
      reply: entry.answer,
      products: [],
      support: entry.ticket ? { raiseTicket: true, category: entry.ticket } : null
    };
  }

  /* Product questions belong in the shopping assistant */
  if (looksLikeShopping(message)) {
    return {
      reply:
        'For finding and comparing products, our AI Shopping Assistant is the right place — it can search the catalog by budget and compare items side by side.',
      products: [],
      openAssistant: true
    };
  }

  /* Nothing matched: offer the topics we do cover, and a ticket */
  return {
    reply:
      "I couldn't match that to a topic I know. I can help with:\n" +
      '• Order tracking, cancellation and delivery\n' +
      '• Payments, refunds and returns\n' +
      '• Login and account problems\n\n' +
      "If it's something else, raise a ticket and a human will pick it up.",
    products: [],
    support: { raiseTicket: true, category: 'Order Issue' }
  };
}

/* --------------------------------------------------------------- entry -- */

async function respond(message, mode) {
  const result =
    mode === 'help' ? await handleHelp(message) : await handleShopping(message);

  return {
    reply: result.reply,
    products: result.products || [],
    comparison: result.comparison || null,
    support: result.support || null,
    openAssistant: !!result.openAssistant
  };
}

module.exports = {
  respond,
  invalidateCatalog,
  /* the AI path reuses this cache rather than reading the catalog twice */
  loadCatalog,
  /* ...and these, so its cards and tables carry the same fields the client
     expects. Rebuilding either shape by hand is how they drift apart. */
  decorate,
  cardFields,
  comparisonRow,
  /* exported for tests / tuning */
  parseBudget,
  detectCategory,
  detectSort,
  matchHelpTopic,
  HELP_KB
};
