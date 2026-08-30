/*
  ShopGenie's language-model brain.

  The rule engine (shopGenieEngine.js) could only answer what it had been
  taught — anything outside its intent patterns came back as "I couldn't find
  anything matching that". This module hands the question to Claude instead,
  with the store's own catalogue supplied as context.

  Grounding: the model never invents a product. It is given the catalogue and
  asked to return product IDs; those IDs are resolved back against the real
  catalogue here, and anything that doesn't match a live product is dropped.
  So a hallucinated id yields no card rather than a fake one.

  If ANTHROPIC_API_KEY is unset — or the call fails — the caller falls back to
  the rule engine, so the assistant keeps working either way.
*/
const AnthropicModule = require('@anthropic-ai/sdk');

const Anthropic = AnthropicModule.default || AnthropicModule;

const {
  loadCatalog,
  decorate,
  cardFields,
  comparisonRow,
  HELP_KB
} = require('./shopGenieEngine');

const MODEL = 'claude-opus-5';

/* A chat reply is short, but thinking shares this budget on Claude Opus 5,
   so it needs headroom above the visible answer. */
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

const isConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

const getClient = () => {
  if (!client) {
    client = new Anthropic();
  }

  return client;
};

/*
  The shape every reply must take. Constraining the response means the server
  gets product IDs it can resolve rather than prose it would have to parse.
*/
const REPLY_SCHEMA = {
  type: 'object',

  properties: {
    reply: {
      type: 'string',
      description:
        'The answer to show the customer. Plain text, no markdown. Two short ' +
        'paragraphs at most. Do not list product names and prices here when ' +
        'productIds is non-empty — the page renders those as cards below.'
    },

    productIds: {
      type: 'array',
      description:
        'IDs copied exactly from the CATALOGUE, for products worth showing ' +
        'as cards. Empty when the question is not about specific products. ' +
        'Never invent an ID.',
      items: { type: 'string' }
    },

    layout: {
      type: 'string',
      description:
        'How to present the products. "table" when the customer is weighing ' +
        'options against each other — comparing, asking which is better, or ' +
        'asking about the difference between items. "cards" for everything else.',
      enum: ['cards', 'table']
    },

    raiseTicket: {
      type: 'boolean',
      description:
        'True only when the customer has a problem that needs a human — a ' +
        'missing order, a failed payment, a refund that has not arrived.'
    },

    ticketCategory: {
      type: 'string',
      description: 'Which queue the ticket belongs in. "None" when raiseTicket is false.',
      enum: TICKET_CATEGORIES
    }
  },

  required: ['reply', 'productIds', 'layout', 'raiseTicket', 'ticketCategory'],

  additionalProperties: false
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
Write the way a knowledgeable shopkeeper speaks: warm, direct, and brief. No markdown, no bullet symbols, no headings. Prices in rupees as ₹1,299.

Answer what was asked. Do not open with a restatement of the question, and do not close by offering four more things you could do.`;

/*
  Build the system prompt.

  The catalogue block is cached: it is identical on every request, so after
  the first call it is billed at cache-read rates instead of being re-read in
  full. The role block sits after it, uncached, because it differs by mode —
  putting it second keeps the cached prefix intact.
*/
const buildSystem = (catalogue, mode) => {
  const isHelp = mode === 'help';

  const reference = isHelp
    ? `CATALOGUE\n\n${catalogue}\n\nSTORE HELP\n\n${renderHelpKb()}`
    : `CATALOGUE\n\n${catalogue}`;

  return [
    {
      type: 'text',
      text: reference,
      cache_control: { type: 'ephemeral' }
    },
    {
      type: 'text',
      text: `${isHelp ? HELP_ROLE : SHOPPING_ROLE}\n${STYLE}`
    }
  ];
};

/*
  Turn the client's transcript into API messages.

  The API requires the first message to be from the user, so any leading
  assistant turns (the greeting the page shows on open) are dropped.
*/
const buildMessages = (history, message) => {
  const turns = Array.isArray(history) ? history.slice(-HISTORY_TURNS) : [];

  const mapped = turns
    .filter((t) => t && typeof t.text === 'string' && t.text.trim())
    .map((t) => ({
      role: t.role === 'bot' || t.role === 'assistant' ? 'assistant' : 'user',
      content: t.text
    }));

  while (mapped.length && mapped[0].role === 'assistant') {
    mapped.shift();
  }

  /* The page appends the new question to its transcript before sending, so
     the last history entry is usually this same message — don't send it twice. */
  const last = mapped[mapped.length - 1];

  if (last && last.role === 'user' && last.content.trim() === message.trim()) {
    mapped.pop();
  }

  return [...mapped, { role: 'user', content: message }];
};

const extractJson = (response) => {
  const block = response.content.find((b) => b.type === 'text');

  if (!block) {
    throw new Error('Model returned no text block');
  }

  return JSON.parse(block.text);
};

/*
  Answer one message. Throws on any failure so the caller can fall back to
  the rule engine rather than showing the customer an error.
*/
const respondWithAI = async (message, mode, history) => {
  const catalog = await loadCatalog();

  const response = await getClient().messages.create({
    model: MODEL,

    max_tokens: MAX_TOKENS,

    /* Chat replies are short and latency matters, so the model thinks
       lightly rather than not at all — disabling thinking outright on this
       model has its own failure modes. */
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: REPLY_SCHEMA }
    },

    system: buildSystem(renderCatalogue(catalog), mode),

    messages: buildMessages(history, message)
  });

  if (response.stop_reason === 'refusal') {
    throw new Error('Model declined the request');
  }

  const parsed = extractJson(response);

  /* Resolve IDs against the live catalogue. An ID the model invented simply
     matches nothing and disappears — it can never reach the customer. */
  const decorated = decorate(catalog.products, catalog.ratings);

  const byId = new Map(decorated.map((p) => [String(p._id), p]));

  const matched = (parsed.productIds || [])
    .map((id) => byId.get(String(id)))
    .filter(Boolean)
    .slice(0, 6);

  /* a one-column table is worse than a card, so a table needs two survivors */
  const asTable = parsed.layout === 'table' && matched.length >= 2;

  const products = asTable ? [] : matched.map((p) => cardFields(p));

  const comparison = asTable ? matched.map((p) => comparisonRow(p)) : null;

  const raiseTicket =
    Boolean(parsed.raiseTicket) && parsed.ticketCategory !== 'None';

  return {
    reply: parsed.reply,

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
  isConfigured
};
