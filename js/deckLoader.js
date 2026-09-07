// ==========================================================================
// DECK LOADER MODULE
// Dynamically fetches deck manifest (decks.json), loads question JSONs,
// auto-infers icons & badges, and handles custom JSON drag-and-drop
// ==========================================================================

/**
 * Auto-infer a retro arcade icon for any deck based on title/id keywords
 */
export function inferDeckIcon(nameOrId) {
  const text = String(nameOrId || '').toLowerCase();
  if (/\bpython\b/.test(text)) return '🐍';
  if (/\b(postgres|postgresql|sql|sqlite|mysql|mariadb)\b/.test(text)) return '🐘';
  if (/\brust\b/.test(text)) return '🦀';
  if (/\b(javascript|js|node|nodejs)\b/.test(text)) return '🟨';
  if (/\b(typescript|ts)\b/.test(text)) return '🔷';
  if (/\b(golang|go)\b/.test(text)) return '🐹';
  if (/\b(java|jvm)\b/.test(text)) return '☕';
  if (/\b(c\+\+|cpp)\b/.test(text)) return '⚡';
  if (/\b(csharp|c#|\.net|dotnet)\b/.test(text)) return '🟣';
  if (/\bruby\b/.test(text)) return '💎';
  if (/\bphp\b/.test(text)) return '🐘';
  if (/\bswift\b/.test(text)) return '🐦';
  if (/\bkotlin\b/.test(text)) return '🎯';
  if (/\b(html|css|frontend|web)\b/.test(text)) return '🌐';
  if (/\b(linux|bash|shell|unix)\b/.test(text)) return '🐧';
  if (/\b(docker|kubernetes|k8s|container)\b/.test(text)) return '🐳';
  if (/\b(git|github)\b/.test(text)) return '🐙';
  if (/\b(aws|cloud|azure|gcp)\b/.test(text)) return '☁️';
  if (/\b(security|crypto|auth)\b/.test(text)) return '🔒';
  if (/\b(ai|ml|machine\s*learning|deep\s*learning)\b/.test(text)) return '🤖';
  if (/\b(algorithm|data\s*structures?)\b/.test(text)) return '📐';
  if (/\b(network|networking|http|tcp)\b/.test(text)) return '📡';
  return '💾';
}

// Global registry of available decks
export let DEFAULT_DECKS = [];

export class DeckLoader {
  constructor() {
    this.decks = [];
    this.currentDeck = null;
    this.deckMeta = null;
  }

  /**
   * Load the decks manifest (questions/decks.json) and any saved custom disks
   */
  async loadRegistry() {
    this.decks = [];

    // 1. Fetch built-in decks manifest
    try {
      const response = await fetch('./questions/decks.json');
      if (response.ok) {
        const list = await response.json();
        if (Array.isArray(list)) {
          this.decks = list.map(d => this.normalizeDeckMeta(d));
        }
      } else {
        console.warn(`[DeckLoader] ./questions/decks.json returned status ${response.status}`);
      }
    } catch (err) {
      console.warn('[DeckLoader] Could not load ./questions/decks.json:', err);
    }

    // 2. Fallback if decks.json was empty or could not be loaded
    if (this.decks.length === 0) {
      this.decks = [
        this.normalizeDeckMeta({
          id: 'postgresql',
          name: 'PostgreSQL Internals & Syntax',
          file: 'postgresql.json',
          icon: '🐘',
          category: 'Databases',
          badgeText: '⚡ POSTGRESQL QUERY EXAMPLE',
          description: '216 technical terms, lock modes, DQL, DDL, and MVCC mechanics'
        }),
        this.normalizeDeckMeta({
          id: 'python',
          name: 'Python Core & Advanced',
          file: 'python.json',
          icon: '🐍',
          category: 'Languages',
          badgeText: '⚡ PYTHON CODE EXAMPLE',
          description: '150 core questions covering built-ins, types, OOP, dunder methods, async & stdlib'
        }),
        this.normalizeDeckMeta({
          id: 'http_status_codes',
          name: 'HTTP Status Codes & Semantics',
          file: 'http_status_codes.json',
          icon: '🌐',
          category: 'Web & Networking',
          badgeText: '⚡ HTTP RESPONSE EXAMPLE',
          description: '60 questions covering 1xx-5xx status codes, headers & caching semantics'
        }),
        this.normalizeDeckMeta({
          id: 'design_patterns',
          name: 'Software Design Patterns',
          file: 'design_patterns.json',
          icon: '📐',
          category: 'Software Architecture',
          badgeText: '⚡ DESIGN PATTERN EXAMPLE',
          description: '60 questions covering Creational, Structural, Behavioral & Cloud patterns'
        })
      ];
    }

    // 3. Load user-imported custom decks from localStorage
    try {
      const savedCustom = localStorage.getItem('code_quiz_custom_decks');
      if (savedCustom) {
        const parsed = JSON.parse(savedCustom);
        if (Array.isArray(parsed)) {
          parsed.forEach(customDeck => {
            if (!this.decks.some(d => d.id === customDeck.id)) {
              this.decks.push(customDeck);
            }
          });
        }
      }
    } catch (e) {
      console.warn('[DeckLoader] Could not read custom decks from storage:', e);
    }

    // Update exported DEFAULT_DECKS reference
    DEFAULT_DECKS = this.decks;
    return this.decks;
  }

  /**
   * Normalize deck metadata ensuring all fields are populated
   */
  normalizeDeckMeta(d) {
    const id = d.id || (d.file ? d.file.replace(/\.json$/, '') : 'deck-' + Date.now());
    const name = d.name || id;
    const icon = d.icon || inferDeckIcon(name + ' ' + id);
    const category = d.category || 'General';
    const badgeText = d.badgeText || `⚡ ${name.toUpperCase()} EXAMPLE`;
    const url = d.url || (d.file ? `./questions/${d.file}` : null);
    const questionCount = d.questionCount || null;
    const description = d.description || `${name} quiz deck`;

    return {
      id,
      name,
      icon,
      category,
      badgeText,
      url,
      file: d.file || null,
      questionCount,
      description,
      isCustom: Boolean(d.isCustom),
      questions: d.questions || null
    };
  }

  /**
   * Get list of all available decks
   */
  getAvailableDecks() {
    return this.decks || [];
  }

  /**
   * Find deck metadata by ID
   */
  getDeckMeta(deckId) {
    return this.decks.find(d => d.id === deckId) || this.decks[0] || null;
  }

  /**
   * Load deck questions by deck ID (built-in or custom)
   */
  async loadDeck(deckId) {
    if (!this.decks || this.decks.length === 0) {
      await this.loadRegistry();
    }

    let meta = this.decks.find(d => d.id === deckId);
    if (!meta) {
      meta = this.decks[0];
    }
    if (!meta) {
      return { success: false, error: 'No quiz decks found in registry.' };
    }

    // If custom deck with questions stored inline in memory / localStorage
    if (meta.isCustom && Array.isArray(meta.questions) && meta.questions.length > 0) {
      this.currentDeck = meta.questions;
      this.deckMeta = meta;
      return { success: true, deck: meta.questions, meta };
    }

    // Built-in deck: fetch from questions file
    const url = meta.url || `./questions/${meta.file}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load deck from ${url} (${response.status})`);
      }
      const data = await response.json();
      this.validateDeck(data);
      this.currentDeck = data;
      meta.questionCount = data.length;
      this.deckMeta = meta;
      return { success: true, deck: data, meta };
    } catch (err) {
      console.error('[DeckLoader] Error loading deck:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Alias for backward compatibility
   */
  async loadDefaultDeck(deckId) {
    return this.loadDeck(deckId);
  }

  /**
   * Parse and validate custom JSON file content
   */
  parseCustomDeck(jsonString, fileName = 'Custom Deck') {
    try {
      const data = JSON.parse(jsonString);
      this.validateDeck(data);

      const cleanName = fileName.replace(/\.[^/.]+$/, "");
      const meta = this.normalizeDeckMeta({
        id: 'custom-' + Date.now(),
        name: cleanName,
        icon: inferDeckIcon(cleanName),
        category: 'Custom Decks',
        badgeText: `⚡ ${cleanName.toUpperCase()} EXAMPLE`,
        questionCount: data.length,
        description: `Custom disk containing ${data.length} questions`,
        isCustom: true,
        questions: data
      });

      this.currentDeck = data;
      this.deckMeta = meta;

      if (!this.decks) this.decks = [];
      this.decks.push(meta);
      DEFAULT_DECKS = this.decks;

      // Persist custom deck to localStorage
      try {
        const storedCustom = JSON.parse(localStorage.getItem('code_quiz_custom_decks') || '[]');
        storedCustom.push(meta);
        localStorage.setItem('code_quiz_custom_decks', JSON.stringify(storedCustom));
      } catch (e) {
        console.warn('[DeckLoader] Could not save custom deck to localStorage:', e);
      }

      return { success: true, deck: data, meta };
    } catch (err) {
      console.error('[DeckLoader] Error parsing custom deck:', err);
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
