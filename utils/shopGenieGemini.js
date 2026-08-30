/*
  ShopGenie's language-model brain, powered by Google Gemini.

  The rule engine (shopGenieEngine.js) could only answer what it had been
  taught — anything outside its intent patterns came back as "I couldn't find
  anything matching that". This module hands the question to Gemini instead,
  with the store's own catalogue supplied as context.

  Gemini is used because its free tier costs nothing for a store of this size.

  Grounding: the model never invents a product. It is given the catalogue and
  asked to return product IDs; those IDs are resolved back against the real
  catalogue here, and anything that doesn't match a live product is dropped.
  So a hallucinated id yields no card rather than a fake one.

  If GEMINI_API_KEY is unset — or the call fails — the caller falls back to
  the rule engine, so the assistant keeps working either way.
*/
const { GoogleGenAI, Type } = require('@google/genai');

const {
  loadCatalog,
  decorate,
  cardFields,
  comparisonRow,
  HELP_KB
} = require('./shopGenieEngine');

/*
  Which model answers.

  The free tier caps each model at roughly 20 requests per DAY, and the cap is
  counted per model rather than per key. So instead of pinning one model and
  going dark for the rest of the day when it runs out, we walk a list: the
  first model that answers wins, and a model that is out of quota simply hands
  over to the next. Eight models means eight separate daily allowances.

  Best quality first — the list degrades gracefully from flash to flash-lite.

  The thinking setting is per model and is not interchangeable: the 3.6+ models
  reject thinkingBudget with a 400, and 3.7 rejects the MINIMAL level. Each
  entry therefore carries the shape that model actually accepts. All of these
  were verified against the live API rather than assumed.
*/
const MODEL_CHAIN = [
  { model: 'gemini-3.7-flash', thinking: { thinkingLevel: 'LOW' } },
  { model: 'gemini-3.6-flash', thinking: { thinkingLevel: 'MINIMAL' } },
  { model: 'gemini-3.5-flash', thinking: { thinkingBudget: 0 } },
  { model: 'gemini-flash-latest', thinking: { thinkingBudget: 0 } },
  { model: 'gemini-3.1-flash-lite', thinking: { thinkingBudget: 0 } },
  { model: 'gemini-3.5-flash-lite', thinking: { thinkingLevel: 'MINIMAL' } },
  { model: 'gemini-flash-lite-latest', thinking: { thinkingLevel: 'MINIMAL' } },
  { model: 'gemini-2.5-flash', thinking: { thinkingBudget: 0 } }
];

/*
  GEMINI_MODEL pins one model instead. Both thinking shapes are tried because
  which one a given model accepts is not something we can know in advance.
*/
const buildChain = () => {
  const pinned = process.env.GEMINI_MODEL;

  if (!pinned) {
    return MODEL_CHAIN;
  }

  return [
    { model: pinned, thinking: { thinkingLevel: 'LOW' } },
    { model: pinned, thinking: { thinkingBudget: 0 } }
  ];
};

/* Thinking tokens are drawn from this same budget, so it sits well above the
   length of any reply we actually want to show. */
const MAX_TOKENS = 2048;

/* How many earlier turns of the conversation to carry */
const HISTORY_TURNS = 10;

const TICKET_CATEGORIES = [
  'Order Issue',
  'Payment Issue',
  'Shipping Issue',
  'Refund Issue',
  'Account Issue',
  'None'
];

let client = null;

const isConfigured = () => Boolean(process.env.GEMINI_API_KEY);

const getClient = () => {
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  return client;
};

/*
  The shape every reply must take. Constraining the response means the server
  gets product IDs it can resolve rather than prose it would have to parse.
*/
const REPLY_SCHEMA = {
  type: Type.OBJECT,

  properties: {
    reply: {
      type: Type.STRING,
      description:
        'The answer to show the customer. Plain text, no markdown. Two short ' +
        'paragraphs at most. Do not list product names and prices here when ' +
        'productIds is non-empty — the page renders those as cards below.'
    },

    productIds: {
      type: Type.ARRAY,
      description:
        'IDs copied exactly from the CATALOGUE, for products worth showing ' +
        'as cards. Empty when the question is not about specific products. ' +
        'Never invent an ID.',
      items: { type: Type.STRING }
    },

    layout: {
      type: Type.STRING,
      description:
        'How to present the products. "table" when the customer is weighing ' +
        'options against each other — comparing, asking which is better, or ' +
        'asking about the difference between items. "cards" for everything ' +
        'else, including plain suggestions and single recommendations.',
      enum: ['cards', 'table']
    },

    raiseTicket: {
      type: Type.BOOLEAN,
      description:
        'True only when the customer has a problem that needs a human — a ' +
        'missing order, a failed payment, a refund that has not arrived.'
    },

    ticketCategory: {
      type: Type.STRING,
      description: 'Which queue the ticket belongs in. "None" when raiseTicket is false.',
      enum: TICKET_CATEGORIES
    }
  },

  /* Gemini emits keys in schema order only when told to */
  propertyOrdering: [
    'reply',
    'productIds',
    'layout',
    'raiseTicket',
    'ticketCategory'
  ],

  required: ['reply', 'productIds', 'layout', 'raiseTicket', 'ticketCategory']
};

/* Render the catalogue as compact text the model can quote IDs out of */
const renderCatalogue = ({ products, ratings }) =>
  products
    .map((p) => {
      const rating = ratings[String(p._id)];

      const parts = [
        `ID: ${p._id}`,
        `Name: ${p.name}`,
        `Price: ₹${p.price}`,
        `Category: ${p.category || 'Uncategorised'}`,
        p.stock > 0 ? `In stock (${p.stock})` : 'Out of stock',
        rating ? `Rated ${rating.avg}/5 from ${rating.count} review(s)` : 'No reviews yet'
      ];

      const blurb = p.shortDescription || p.description || '';

      return `${parts.join(' | ')}${blurb ? `\n  ${blurb}` : ''}`;
    })
    .join('\n\n');

/* The store's help answers, so support questions are answered from policy
   rather than from the model's general knowledge of how shops work */
const renderHelpKb = () =>
  HELP_KB.map((topic) => `- ${topic.answer.replace(/\n+/g, ' ')}`).join('\n');

const SHOPPING_ROLE = `You are ShopGenie, the shopping assistant for PoojaMart, a store selling devotional and puja items.

Help the customer find what suits them. Ask about their need, compare options, explain what an item is used for, and suggest what fits their budget. Recommend only products from the CATALOGUE above, and put their IDs in productIds so the page can show them as cards.

If nothing in the catalogue fits, say so plainly and suggest the closest thing that does — never invent a product.

When the customer is weighing options against each other — "compare these", "which is better", "what's the difference" — set layout to "table" and return at least two IDs. The page then shows them side by side, so keep the reply to a sentence or two of guidance and let the table carry the detail. Otherwise set layout to "cards".`;

const HELP_ROLE = `You are ShopGenie, the support assistant for PoojaMart, a store selling devotional and puja items.

Answer questions about orders, delivery, payment, refunds and accounts using the STORE HELP above. Keep productIds empty unless the customer is genuinely asking what to buy.

When something has gone wrong and needs a person to look at it, set raiseTicket to true and choose the matching category — the page then offers the customer a link to raise it.`;

const STYLE = `
Write the way a knowledgeable shopkeeper speaks: warm, direct, and brief. No markdown, no bullet symbols, no headings. Prices in rupees as ₹1,299, with no line break between the ₹ and the number.

Answer what was asked. Do not open with a restatement of the question, and do not close by offering four more things you could do.

If the customer asks for a specific number of items, return exactly that many IDs in productIds — not one more.`;

/*
  Build the system instruction.

  The catalogue goes first and is byte-identical on every request, which is
  what lets Gemini's implicit cache recognise the prefix and bill it at a
  discount. The role text differs by mode, so it sits after the catalogue —
  putting it first would change the prefix and lose the cache hit.
*/
const buildSystemInstruction = (catalogue, mode) => {
  const isHelp = mode === 'help';

  const reference = isHelp
    ? `CATALOGUE\n\n${catalogue}\n\nSTORE HELP\n\n${renderHelpKb()}`
    : `CATALOGUE\n\n${catalogue}`;

  return `${reference}\n\n${isHelp ? HELP_ROLE : SHOPPING_ROLE}\n${STYLE}`;
};

/*
  Turn the client's transcript into Gemini contents.

  Gemini calls the assistant role 'model', and requires the first turn to be
  from the user, so any leading model turns (the greeting the page shows on
  open) are dropped.
*/
const buildContents = (history, message) => {
  const turns = Array.isArray(history) ? history.slice(-HISTORY_TURNS) : [];

  const mapped = turns
    .filter((t) => t && typeof t.text === 'string' && t.text.trim())
    .map((t) => ({
      role: t.role === 'bot' || t.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: t.text }]
    }));

  while (mapped.length && mapped[0].role === 'model') {
    mapped.shift();
  }

  /* The page appends the new question to its transcript before sending, so
     the last history entry is usually this same message — don't send it twice. */
  const last = mapped[mapped.length - 1];

  if (last && last.role === 'user' && last.parts[0].text.trim() === message.trim()) {
    mapped.pop();
  }

  return [...mapped, { role: 'user', parts: [{ text: message }] }];
};

/*
  Tidy the model's prose.

  Gemini sometimes breaks a line mid-sentence — most visibly right before a
  ₹ price, which renders as a stray gap in the chat bubble. A newline that
  follows sentence-ending punctuation is a real paragraph break and is kept;
  any other newline is joined back into the sentence it belongs to.

  Paragraph breaks are parked on a sentinel first, so the rule that rejoins
  mid-sentence breaks cannot see them.
*/
const PARAGRAPH_MARK = '\u0000';

const tidyReply = (text) =>
  String(text)
    .replace(/\r\n/g, '\n')
    .replace(/([.!?])[ \t]*\n+[ \t]*/g, `$1${PARAGRAPH_MARK}`)
    .replace(/[ \t]*\n+[ \t]*/g, ' ')
    .split(PARAGRAPH_MARK)
    .join('\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

/*
  The free tier returns 503 when capacity is short, and 429 when the minute
  quota is hit. Both clear on their own, so a couple of quick retries save a
  needless drop to the rule engine. Someone is waiting on the reply, so the
  waits are deliberately short.
*/
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/*
  Which failures mean "ask a different model" rather than "give up".

  429 out of quota, 503 at capacity, 404 retired, 400 wrong thinking shape —
  all of these are about this particular model, and the next one may be fine.
  A bad API key (401/403) is not: every model would reject it identically, so
  walking the whole chain would only waste the customer's time.
*/
const isModelSpecific = (error) => [400, 404, 429, 500, 503].includes(error && error.status);

/* Capacity spikes clear in milliseconds, so a model worth using gets one
   second chance before we move down the list. */
const isCapacityBlip = (error) => (error && error.status) === 503;

/*
  Ask each model in turn until one answers. Throws only when the whole chain
  is exhausted, at which point the caller falls back to the rule engine.
*/
const generateWithFailover = async (config, contents) => {
  const gemini = getClient();

  const chain = buildChain();

  let lastError = null;

  for (let i = 0; i < chain.length; i++) {
    const entry = chain[i];

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await gemini.models.generateContent({
          model: entry.model,
          contents,
          config: { ...config, thinkingConfig: entry.thinking }
        });

        /* Worth knowing in the log when the first choice was unavailable */
        if (i > 0) {
          console.log(`ShopGenie: answered by ${entry.model} (fell back ${i})`);
        }

        return response;
      } catch (error) {
        lastError = error;

        if (!isModelSpecific(error)) {
          throw error;
        }

        if (!(isCapacityBlip(error) && attempt === 0)) {
          break;
        }

        await sleep(400);
      }
    }
  }

  throw lastError;
};

/*
  Answer one message. Throws on any failure so the caller can fall back to
  the rule engine rather than showing the customer an error.
*/
const respondWithAI = async (message, mode, history) => {
  const catalog = await loadCatalog();

  const response = await generateWithFailover(
    {
      systemInstruction: buildSystemInstruction(renderCatalogue(catalog), mode),

      maxOutputTokens: MAX_TOKENS,

      /* Structured output — the reply comes back as JSON matching the schema
         rather than prose we would have to parse. */
      responseMimeType: 'application/json',
      responseSchema: REPLY_SCHEMA

      /* thinkingConfig is supplied per model by generateWithFailover — the
         models disagree on which shape they accept. */
    },
    buildContents(history, message)
  );

  const text = response.text;

  if (!text) {
    /* Empty text means the answer was cut off or filtered rather than written */
    const reason =
      (response.candidates && response.candidates[0] && response.candidates[0].finishReason) ||
      'unknown';

    throw new Error(`Model returned no text (finishReason: ${reason})`);
  }

  const parsed = JSON.parse(text);

  /* Resolve IDs against the live catalogue. An ID the model invented simply
     matches nothing and disappears — it can never reach the customer.

     The cards are built by the rule engine's own cardFields() off decorated
     products, so they carry stock and rating like every other card the client
     renders. Building the shape here by hand is how they silently drift. */
  const decorated = decorate(catalog.products, catalog.ratings);

  const byId = new Map(decorated.map((p) => [String(p._id), p]));

  const matched = (parsed.productIds || [])
    .map((id) => byId.get(String(id)))
    .filter(Boolean)
    .slice(0, 6);

  /*
    A comparison is only a comparison with something to compare against — if
    the model asked for a table but only one product survived the ID check,
    a one-column table would be worse than a card. The client shows either
    the table or the cards, never both, so exactly one of these is filled.
  */
  const asTable = parsed.layout === 'table' && matched.length >= 2;

  const products = asTable ? [] : matched.map((p) => cardFields(p));

  const comparison = asTable ? matched.map((p) => comparisonRow(p)) : null;

  const raiseTicket =
    Boolean(parsed.raiseTicket) && parsed.ticketCategory !== 'None';

  return {
    reply: tidyReply(parsed.reply),

    products,

    comparison,

    support: raiseTicket
      ? { raiseTicket: true, category: parsed.ticketCategory }
      : null,

    openAssistant: false
  };
};

module.exports = {
  respondWithAI,
  isConfigured,
  tidyReply
};
