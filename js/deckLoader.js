// ==========================================================================
// DECK LOADER MODULE
// Handles fetching bundled decks (postgresql.json) and parsing custom JSON
// ==========================================================================

export const DEFAULT_DECKS = [
  {
    id: 'postgresql',
    name: 'PostgreSQL Internals & Syntax',
    url: './questions/postgresql.json',
    description: '216 technical terms, lock modes, DQL, DDL, and MVCC mechanics'
  }
];

export class DeckLoader {
  constructor() {
    this.currentDeck = null;
    this.deckMeta = null;
  }

  /**
   * Load a default deck by URL
   */
  async loadDefaultDeck(deckId = 'postgresql') {
    const meta = DEFAULT_DECKS.find(d => d.id === deckId) || DEFAULT_DECKS[0];
    try {
      const response = await fetch(meta.url);
      if (!response.ok) {
        throw new Error(`Failed to load deck from ${meta.url} (${response.status})`);
      }
      const data = await response.json();
      this.validateDeck(data);
      this.currentDeck = data;
      this.deckMeta = meta;
      return { success: true, deck: data, meta };
    } catch (err) {
      console.error('Error loading default deck:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Parse and validate custom JSON file content
   */
  parseCustomDeck(jsonString, fileName = 'Custom Deck') {
    try {
      const data = JSON.parse(jsonString);
      this.validateDeck(data);
      
      const meta = {
        id: 'custom-' + Date.now(),
        name: fileName.replace(/\.[^/.]+$/, ""),
        url: null,
        description: `Custom deck with ${data.length} questions`
      };

      this.currentDeck = data;
      this.deckMeta = meta;
      return { success: true, deck: data, meta };
    } catch (err) {
      console.error('Error parsing custom deck:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Validate that loaded JSON conforms to quiz format
   */
  validateDeck(data) {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Deck must be a non-empty JSON array of question objects.');
    }

    const first = data[0];
    if (!first.title && !first['Keywords & Phrases'] && !first.question) {
      throw new Error('Each question item must contain a "title" or "question" field.');
    }

    if (!first.options || typeof first.options !== 'object') {
      throw new Error('Each question item must contain an "options" object with choices (a, b, c, d).');
    }

    if (!first.answer) {
      throw new Error('Each question item must define an "answer" field (e.g. "a", "b", "c", "d").');
    }

    // Normalize items if needed
    data.forEach(item => {
      if (!item.title && item['Keywords & Phrases']) {
        item.title = item['Keywords & Phrases'];
      }
      if (!item.category && item['Functional Category']) {
        item.category = item['Functional Category'];
      }
      if (!item.category) {
        item.category = 'General';
      }
    });
  }

  /**
   * Extract unique categories from current deck
   */
  getCategories() {
    if (!this.currentDeck) return [];
    const set = new Set();
    this.currentDeck.forEach(item => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set).sort();
  }
}
