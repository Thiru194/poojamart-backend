const { respond } = require('../utils/shopGenieEngine');

const gemini = require('../utils/shopGenieGemini');

const claude = require('../utils/shopGenieAI');

/*
  ShopGenie answers in two ways.

  Preferred: a language model grounded in our own catalogue. It understands
  questions nobody wrote a rule for, and holds a conversation across turns.
  Gemini is the default because its free tier costs nothing at our volume;
  Claude is used instead if its key is the one that's configured.

  Fallback: the rule engine in utils/shopGenieEngine.js. It only understands
  the intent patterns it was taught, but it costs nothing and never fails, so
  it covers the cases where no model can run — no API key configured, the
  API is down, or the reply came back unusable.

  Two modes:
    'shopping' - full-page assistant: compare & suggest products.
    'help'     - floating chatbot: support / ticket raising only.
*/

/* Whichever provider has a key wins; Gemini first since it is the free one */
const activeProvider = () => {
  if (gemini.isConfigured()) return { name: 'Gemini', respondWithAI: gemini.respondWithAI };

  if (claude.isConfigured()) return { name: 'Claude', respondWithAI: claude.respondWithAI };

  return null;
};

const chatWithAI = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: 'Message is required'
      });
    }

    const mode = req.body.mode === 'help' ? 'help' : 'shopping';

    const provider = activeProvider();

    if (provider) {
      try {
        const answer = await provider.respondWithAI(message, mode, history);

        return res.json(answer);
      } catch (error) {
        /* Logged, not surfaced — the customer gets the rule engine's answer
           instead of an error, and we still see why the model didn't run. */
        console.log(`ShopGenie ${provider.name} unavailable, using rules:`, error.message);
      }
    }

    const result = await respond(message, mode);

    res.json(result);
  } catch (error) {
    console.log('ShopGenie error:', error.message);

    res.status(500).json({
      error: 'Assistant is unavailable right now. Please try again.'
    });
  }
};

module.exports = {
  chatWithAI,
  activeProvider
};
