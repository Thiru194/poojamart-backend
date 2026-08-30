/* Exercises shopGenieEngine against the real catalog backup, with the
   mongoose models stubbed so no database is needed. */

const path = require('path');
const fs = require('fs');

const BACKEND = path.join(__dirname, '..');

const raw = JSON.parse(
  fs.readFileSync(
    path.join(BACKEND, 'backups/catalog-backup-2026-07-05T18-39-18.json'),
    'utf8'
  )
);

const products = (Array.isArray(raw) ? raw : raw.products).map((p) => ({
  ...p,
  _id: String(p._id)
}));

/* Fabricate some reviews so rating paths are exercised */
const reviews = [];
products.forEach((p, i) => {
  if (i % 3 === 0) return; // leave a third unrated
  const n = 1 + (i % 5);
  for (let k = 0; k < n; k++) {
    reviews.push({ productId: p._id, rating: 3 + ((i + k) % 3) });
  }
});

function stub(relPath, exportsObj) {
  const resolved = require.resolve(path.join(BACKEND, relPath));
  require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports: exportsObj };
}

stub('models/ProductModel.js', {
  find: () => ({ select: () => ({ lean: async () => products }) })
});

stub('models/ReviewModel.js', {
  aggregate: async () => {
    const byId = {};
    reviews.forEach((r) => {
      (byId[r.productId] = byId[r.productId] || []).push(r.rating);
    });
    return Object.entries(byId).map(([id, rs]) => ({
      _id: id,
      avg: rs.reduce((a, b) => a + b, 0) / rs.length,
      count: rs.length
    }));
  }
});

const engine = require(path.join(BACKEND, 'utils/shopGenieEngine.js'));

const SHOPPING = [
  'hi',
  'best value laptops under 60000',
  'cheapest headphones',
  'show me mobiles between 20k and 40k',
  'i need a good camera',
  'cost efficient power banks',
  'premium televisions',
  'best rated smart watches',
  'do you have oneplus 13r',
  'compare oneplus 13r and iphone 15 pro max',
  'oneplus 13r vs samsung galaxy s24 ultra',
  'compare something nonexistent and another fake',
  'laptops under 5000',
  'quantum flux capacitor',
  'my payment failed',
  'thanks'
];

const HELP = [
  'hello',
  'where is my order',
  'i want to cancel my order',
  'money got deducted but order failed',
  'how do i get a refund',
  'which payment methods do you accept',
  'i cant login to my account',
  'my order is damaged',
  'how long does delivery take',
  'is cod available',
  'i want to talk to a human',
  'suggest me a good laptop',
  'what is the meaning of life',
  'thank you'
];

(async () => {
  let failures = 0;

  const run = async (label, list, mode) => {
    console.log('\n=========== ' + label + ' ===========');
    for (const q of list) {
      try {
        const r = await engine.respond(q, mode);
        const flags = [
          r.products.length ? `products:${r.products.length}` : '',
          r.comparison ? `comparison:${r.comparison.length}` : '',
          r.support ? `ticket:${r.support.category}` : '',
          r.openAssistant ? 'openAssistant' : ''
        ]
          .filter(Boolean)
          .join(' ');

        if (!r.reply || !r.reply.trim()) {
          failures++;
          console.log(`\n[EMPTY REPLY] > ${q}`);
          continue;
        }

        console.log(`\n> ${q}${flags ? '   [' + flags + ']' : ''}`);
        console.log(
          r.reply
            .split('\n')
            .map((l) => '  ' + l)
            .join('\n')
        );
      } catch (e) {
        failures++;
        console.log(`\n[THREW] > ${q}\n  ${e.stack.split('\n').slice(0, 3).join('\n  ')}`);
      }
    }
  };

  await run('SHOPPING', SHOPPING, 'shopping');
  await run('HELP', HELP, 'help');

  console.log('\n\n=== unit checks ===');
  /* compare range only — parseBudget also returns the text it matched */
  const range = (q) => {
    const b = engine.parseBudget(q);
    return b ? JSON.stringify({ min: b.min, max: b.max }) : String(b);
  };

  const checks = [
    ['under 20k', () => range('under 20k'), '{"min":null,"max":20000}'],
    ['between 20k and 40k', () => range('phones between 20k and 40k'), '{"min":20000,"max":40000}'],
    ['above 1.5 lakh', () => range('above 1.5 lakh'), '{"min":150000,"max":null}'],
    ['lakh consumed whole', () => engine.parseBudget('above 1.5 lakh').matched, 'above 1.5 lakh'],
    ['around 30000', () => range('around 30000'), '{"min":24000,"max":36000}'],
    ['no budget', () => range('nice laptops'), 'null'],
    ['cat: phone', () => engine.detectCategory('cheap phone', ['Mobiles', 'Laptops']), 'Mobiles'],
    ['cat: smartwatch', () => engine.detectCategory('best smartwatch', ['Smart Watches', 'Mobiles']), 'Smart Watches'],
    ['sort: cost efficient', () => engine.detectSort('cost efficient laptops'), 'value'],
    ['sort: cheapest', () => engine.detectSort('cheapest tv'), 'cheap'],
    ['sort: best rated', () => engine.detectSort('best rated tv'), 'rating'],
    ['sort: none', () => String(engine.detectSort('laptops under 50000')), 'null']
  ];

  /* Regressions found in manual review */
  const topic = (m) => {
    const r = engine.matchHelpTopic(m);
    return r ? r.entry.id : 'none';
  };

  checks.push(
    ['sort: bare good -> rating', () => engine.detectSort('i need a good camera'), 'rating'],
    ['sort: best value stays value', () => engine.detectSort('best value camera'), 'value'],
    ['kb: money got deducted', () => topic('money got deducted but order failed'), 'payment-failed'],
    ['kb: talk to a human', () => topic('i want to talk to a human'), 'ticket-how'],
    ['kb: payment methods not problem', () => topic('which payment methods do you accept'), 'payment-methods'],
    ['kb: refunds plural', () => topic('how do refunds work'), 'refund'],
    ['kb: cod not inside code', () => topic('what is my discount code'), 'offers'],
    ['kb: unknown -> none', () => topic('what is the meaning of life'), 'none']
  );

  /* Headers and fallbacks must stay grammatical whatever the category name */
  const firstLine = async (q) =>
    (await engine.respond(q, 'shopping')).reply.split('\n')[0];

  const singleHit = await firstLine('show me mobiles between 20k and 40k');
  const noHit = (await engine.respond('best value laptops under 60000', 'shopping')).reply;

  checks.push(
    ['header: singular match', () => singleHit, '1 match for mobiles between ₹20,000 and ₹40,000:'],
    ['fallback: singular category', () => /Our cheapest laptop:/.test(noHit), 'true']
  );

  checks.forEach(([name, fn, expected]) => {
    let got;
    try {
      got = String(fn());
    } catch (e) {
      got = 'THREW ' + e.message;
    }
    const ok = got === expected;
    if (!ok) failures++;
    console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}  -> ${got}${ok ? '' : `   (expected ${expected})`}`);
  });

  console.log('\n' + (failures ? `${failures} FAILURE(S)` : 'all good'));
  process.exit(failures ? 1 : 0);
})();
