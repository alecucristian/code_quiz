// ==========================================================================
// APP CONTROLLER
// Wires together views, user interactions, deck loading, and gameplay loop
// ==========================================================================

import { DeckLoader } from './deckLoader.js';
import { QuizEngine } from './quizEngine.js';
import { HighscoreManager } from './highscores.js';
import { ArcadeAudio } from './audio.js';

class App {
  constructor() {
    this.deckLoader = new DeckLoader();
    this.quizEngine = new QuizEngine();
    this.highscores = new HighscoreManager();
    this.audio = new ArcadeAudio();

    this.advanceTimeout = null;
    this.currentPendingResult = null;

    this.initElements();
    this.initEventListeners();
    this.initPWA();
    this.boot();
  }

  initElements() {
    // Views
    this.views = {
      menu: document.getElementById('view-menu'),
      quiz: document.getElementById('view-quiz'),
      results: document.getElementById('view-results'),
      leaderboard: document.getElementById('view-leaderboard')
    };

    // Global / Top Controls
    this.btnCrtToggle = document.getElementById('btn-crt-toggle');
    this.btnAudioToggle = document.getElementById('btn-audio-toggle');
    this.btnNavScores = document.getElementById('btn-nav-scores');
    this.btnNavHome = document.getElementById('btn-nav-home');

    // Sync Audio toggle button state
    if (this.btnAudioToggle) {
      const isMuted = this.audio.isMuted;
      this.btnAudioToggle.textContent = isMuted ? '🔇' : '🔊';
      this.btnAudioToggle.classList.toggle('active', !isMuted);
    }

    // Menu View Elements
    this.selectDeck = document.getElementById('select-deck');
    this.selectCategory = document.getElementById('select-category');
    this.deckChipTrigger = document.getElementById('deck-chip-trigger');
    this.deckChipIcon = document.getElementById('deck-chip-icon');
    this.deckNameDisplay = document.getElementById('deck-name-display');
    this.deckCountDisplay = document.getElementById('deck-count-display');
    this.btnStartGame = document.getElementById('btn-start-game');
    this.btnOpenDiskLoader = document.getElementById('btn-open-disk-loader');
    this.btnBrowseDecks = document.getElementById('btn-browse-decks');
    this.roundSizeInputs = document.querySelectorAll('input[name="round-size"]');
    this.gameModeInputs = document.querySelectorAll('input[name="game-mode"]');

    // Custom Deck Dialog / Browser
    this.dialogDiskLoader = document.getElementById('dialog-disk-loader');
    this.btnCloseDialog = document.getElementById('btn-close-dialog');
    this.searchDeckInput = document.getElementById('search-deck-input');
    this.btnClearDeckSearch = document.getElementById('btn-clear-deck-search');
    this.deckCategoryFilters = document.getElementById('deck-category-filters');
    this.deckSearchEmpty = document.getElementById('deck-search-empty');
    this.dropZone = document.getElementById('drop-zone');
    this.fileInput = document.getElementById('file-input');
    this.builtinDiskButtons = document.getElementById('builtin-disk-buttons');
    this.activeBrowserCategory = 'ALL';

    // Quiz View Elements
    this.hudScore = document.getElementById('hud-score');
    this.hudTime = document.getElementById('hud-time');
    this.hudRound = document.getElementById('hud-round');
    this.hudStreak = document.getElementById('hud-streak');
    this.questionCategory = document.getElementById('question-category');
    this.questionModeBadge = document.getElementById('question-mode-badge');
    this.questionTitle = document.getElementById('question-title');
    this.optionsContainer = document.getElementById('options-container');
    this.feedbackContainer = document.getElementById('feedback-container');

    // Results View Elements
    this.resultsBadge = document.getElementById('results-badge');
    this.statFinalScore = document.getElementById('stat-final-score');
    this.statFinalAccuracy = document.getElementById('stat-final-accuracy');
    this.statFinalTime = document.getElementById('stat-final-time');
    this.statFinalStreak = document.getElementById('stat-final-streak');
    this.formHighscore = document.getElementById('form-highscore');
    this.inputPlayerName = document.getElementById('input-player-name');
    this.btnPlayAgain = document.getElementById('btn-play-again');
    this.btnResultsHome = document.getElementById('btn-results-home');

    // Leaderboard View Elements
    this.tableLeaderboardBody = document.getElementById('leaderboard-tbody');
    this.btnClearScores = document.getElementById('btn-clear-scores');
    this.btnLeaderboardBack = document.getElementById('btn-leaderboard-back');
  }

  initEventListeners() {
    // CRT toggle
    this.btnCrtToggle.addEventListener('click', () => {
      document.body.classList.toggle('crt-disabled');
      const isDisabled = document.body.classList.contains('crt-disabled');
      this.btnCrtToggle.textContent = isDisabled ? '📺' : '📺';
      this.btnCrtToggle.classList.toggle('active', !isDisabled);
      localStorage.setItem('code_quiz_crt_pref', isDisabled ? 'off' : 'on');
    });

    // Audio toggle
    if (this.btnAudioToggle) {
      this.btnAudioToggle.addEventListener('click', () => {
        const isUnmuted = this.audio.toggleMute();
        this.btnAudioToggle.textContent = isUnmuted ? '🔊' : '🔇';
        this.btnAudioToggle.classList.toggle('active', isUnmuted);
        if (isUnmuted) {
          this.audio.playBlip();
          if (this.views.quiz.classList.contains('active') && !this.audio.bgmPlaying) {
            this.audio.startBgm();
          }
        } else {
          this.audio.stopBgm();
        }
      });
    }

    // Navigation
    this.btnNavScores.addEventListener('click', () => {
      this.audio.playBlip();
      this.showLeaderboard();
    });
    this.btnNavHome.addEventListener('click', () => {
      this.audio.playBlip();
      this.audio.stopBgm();
      this.showView('menu');
    });
    this.btnLeaderboardBack.addEventListener('click', () => {
      this.audio.playBlip();
      this.showView('menu');
    });
    this.btnResultsHome.addEventListener('click', () => {
      this.audio.playBlip();
      this.showView('menu');
    });
    this.btnPlayAgain.addEventListener('click', () => {
      this.audio.playBlip();
      this.startQuiz();
    });

    // Disk Loader & Deck Browser Triggers
    if (this.btnOpenDiskLoader) {
      this.btnOpenDiskLoader.addEventListener('click', () => this.openDeckBrowser());
    }
    if (this.btnBrowseDecks) {
      this.btnBrowseDecks.addEventListener('click', () => this.openDeckBrowser());
    }
    if (this.deckChipTrigger) {
      this.deckChipTrigger.addEventListener('click', () => this.openDeckBrowser());
      this.deckChipTrigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.openDeckBrowser();
        }
      });
    }

    if (this.btnCloseDialog) {
      this.btnCloseDialog.addEventListener('click', () => {
        this.dialogDiskLoader.close();
      });
    }

    // Deck Search Input & Clear
    if (this.searchDeckInput) {
      this.searchDeckInput.addEventListener('input', (e) => {
        const query = e.target.value;
        if (this.btnClearDeckSearch) {
          this.btnClearDeckSearch.style.display = query ? 'block' : 'none';
        }
        this.renderDeckCards(this.activeBrowserCategory, query);
      });
    }

    if (this.btnClearDeckSearch) {
      this.btnClearDeckSearch.addEventListener('click', () => {
        this.searchDeckInput.value = '';
        this.btnClearDeckSearch.style.display = 'none';
        this.searchDeckInput.focus();
        this.renderDeckCards(this.activeBrowserCategory, '');
      });
    }

    // File Drop & Select
    this.dropZone.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.handleCustomFile(file);
    });

    ['dragenter', 'dragover'].forEach(name => {
      this.dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        this.dropZone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      this.dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        this.dropZone.classList.remove('dragover');
      });
    });

    this.dropZone.addEventListener('drop', (e) => {
      const file = e.dataTransfer.files[0];
      if (file) this.handleCustomFile(file);
    });

    // Deck Selector Dropdown
    if (this.selectDeck) {
      this.selectDeck.addEventListener('change', async (e) => {
        if (e.target.value) {
          this.audio.playBlip();
          await this.loadDeck(e.target.value);
        }
      });
    }

    // Start Quiz
    this.btnStartGame.addEventListener('click', () => this.startQuiz());

    // High Score Submission
    this.formHighscore.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitHighScore();
    });

    // Clear Scores
    this.btnClearScores.addEventListener('click', () => {
      if (confirm('RESET ALL LEADERBOARD HIGH SCORES? THIS CANNOT BE UNDONE.')) {
        this.highscores.clearScores();
        this.highscores.renderTable(this.tableLeaderboardBody);
      }
    });

    // Keyboard Shortcuts (A, B, C, D to answer in quiz view)
    window.addEventListener('keydown', (e) => {
      if (!this.views.quiz.classList.contains('active')) return;
      if (this.quizEngine.isAnswerLocked) {
        if (e.key === 'Enter' || e.key === ' ') {
          this.advanceNextQuestion();
        }
        return;
      }

      const key = e.key.toLowerCase();
      if (['a', 'b', 'c', 'd'].includes(key)) {
        const btn = document.querySelector(`.option-btn[data-choice="${key}"]`);
        if (btn) btn.click();
      }
    });
  }

  async boot() {
    // Restore CRT preference
    const crtPref = localStorage.getItem('code_quiz_crt_pref');
    if (crtPref === 'off') {
      document.body.classList.add('crt-disabled');
      this.btnCrtToggle.textContent = '📺';
      this.btnCrtToggle.classList.remove('active');
    }

    try {
      // Load dynamic deck registry from manifest (questions/decks.json) + custom disks
      await this.deckLoader.loadRegistry();
      this.populateDeckOptions();
      this.renderDeckBrowserFilters();
      this.renderDeckCards('ALL', '');

      // Restore last active deck or default to first available deck
      const available = this.deckLoader.getAvailableDecks();
      const savedDeckId = localStorage.getItem('code_quiz_active_deck') || (available[0] ? available[0].id : 'postgresql');
      if (savedDeckId) {
        await this.loadDeck(savedDeckId);
      }
    } catch (err) {
      console.error('[App] Error during boot:', err);
      this.populateDeckOptions();
    }
  }

  openDeckBrowser() {
    this.audio.playBlip();
    if (this.searchDeckInput) {
      this.searchDeckInput.value = '';
      if (this.btnClearDeckSearch) this.btnClearDeckSearch.style.display = 'none';
    }
    this.activeBrowserCategory = 'ALL';
    this.renderDeckBrowserFilters();
    this.renderDeckCards('ALL', '');

    if (typeof this.dialogDiskLoader.showModal === 'function') {
      this.dialogDiskLoader.showModal();
    } else {
      this.dialogDiskLoader.setAttribute('open', '');
    }

    setTimeout(() => {
      if (this.searchDeckInput) this.searchDeckInput.focus();
    }, 100);
  }

  populateDeckOptions() {
    if (!this.selectDeck) return;
    this.selectDeck.innerHTML = '';
    const decks = this.deckLoader.getAvailableDecks();

    // Group decks by category
    const categories = {};
    decks.forEach(deck => {
      const cat = deck.category || 'General';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(deck);
    });

    const sortedCategories = Object.keys(categories).sort();
    sortedCategories.forEach(cat => {
      const group = document.createElement('optgroup');
      group.label = `── ${cat.toUpperCase()} ──`;
      categories[cat].forEach(deck => {
        const opt = document.createElement('option');
        opt.value = deck.id;
        const qCount = deck.questionCount ? ` (${deck.questionCount} Qs)` : '';
        opt.textContent = `${deck.icon || '💾'} ${deck.name}${qCount}`;
        group.appendChild(opt);
      });
      this.selectDeck.appendChild(group);
    });
  }

  renderDeckBrowserFilters() {
    if (!this.deckCategoryFilters) return;
    this.deckCategoryFilters.innerHTML = '';
    const decks = this.deckLoader.getAvailableDecks();

    const cats = new Set(['ALL']);
    decks.forEach(d => {
      if (d.category) cats.add(d.category);
    });

    cats.forEach(cat => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `deck-filter-chip ${cat === this.activeBrowserCategory ? 'active' : ''}`;
      chip.textContent = cat.toUpperCase();
      chip.addEventListener('click', () => {
        this.audio.playBlip();
        this.activeBrowserCategory = cat;
        this.renderDeckBrowserFilters();
        const query = this.searchDeckInput ? this.searchDeckInput.value : '';
        this.renderDeckCards(cat, query);
      });
      this.deckCategoryFilters.appendChild(chip);
    });
  }

  renderDeckCards(category = 'ALL', searchQuery = '') {
    if (!this.builtinDiskButtons) return;
    this.builtinDiskButtons.innerHTML = '';

    let decks = this.deckLoader.getAvailableDecks();
    const activeDeckId = this.deckLoader.deckMeta?.id;

    if (category && category !== 'ALL') {
      decks = decks.filter(d => d.category === category);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      decks = decks.filter(d => {
        return (
          d.name.toLowerCase().includes(q) ||
          (d.description && d.description.toLowerCase().includes(q)) ||
          (d.category && d.category.toLowerCase().includes(q)) ||
          (d.id && d.id.toLowerCase().includes(q))
        );
      });
    }

    if (this.deckSearchEmpty) {
      this.deckSearchEmpty.style.display = decks.length === 0 ? 'block' : 'none';
    }

    decks.forEach(deck => {
      const card = document.createElement('div');
      card.className = `deck-card ${deck.id === activeDeckId ? 'active' : ''}`;
      card.role = 'button';
      card.tabIndex = 0;

      const qCountText = deck.questionCount ? `${deck.questionCount} Qs` : 'DECK';
      card.innerHTML = `
        <div class="deck-card-icon">${deck.icon || '💾'}</div>
        <div class="deck-card-info">
          <div class="deck-card-title-row">
            <span class="deck-card-name">${escapeHtml(deck.name)}</span>
            <span class="deck-card-badge">${qCountText}</span>
          </div>
          <div class="deck-card-desc">
            <span class="deck-card-tag">[${escapeHtml(deck.category || 'General')}]</span>
            <span>${escapeHtml(deck.description || '')}</span>
          </div>
        </div>
      `;

      const onSelect = async () => {
        this.audio.playBlip();
        this.dialogDiskLoader.close();
        await this.loadDeck(deck.id);
      };

      card.addEventListener('click', onSelect);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      });

      this.builtinDiskButtons.appendChild(card);
    });
  }

  async loadDeck(deckId) {
    this.deckNameDisplay.textContent = 'LOADING DISK...';
    this.deckCountDisplay.textContent = '';
    const result = await this.deckLoader.loadDeck(deckId);
    if (result.success) {
      localStorage.setItem('code_quiz_active_deck', deckId);
      this.updateDeckUI();
      // Keep browser cards active class in sync
      if (this.builtinDiskButtons) {
        this.builtinDiskButtons.querySelectorAll('.deck-card').forEach(c => {
          c.classList.remove('active');
        });
      }
    } else {
      this.deckNameDisplay.textContent = 'ERROR LOADING DECK';
      alert('Failed to load quiz deck: ' + result.error);
    }
  }

  handleCustomFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = this.deckLoader.parseCustomDeck(e.target.result, file.name);
      if (result.success) {
        this.dialogDiskLoader.close();
        this.populateDeckOptions();
        this.renderDeckBrowserFilters();
        this.updateDeckUI();
        alert(`SUCCESS: Loaded ${result.deck.length} questions from "${file.name}"!`);
      } else {
        alert('ERROR parsing JSON file: ' + result.error);
      }
    };
    reader.readAsText(file);
  }

  updateDeckUI() {
    const meta = this.deckLoader.deckMeta;
    const deck = this.deckLoader.currentDeck;
    if (!meta || !deck) return;

    if (this.deckChipIcon) {
      this.deckChipIcon.textContent = meta.icon || '💾';
    }
    this.deckNameDisplay.textContent = meta.name.toUpperCase();
    this.deckCountDisplay.textContent = `(${deck.length} Qs)`;

    // Sync Deck Selector dropdown
    if (this.selectDeck) {
      if (![...this.selectDeck.options].some(o => o.value === meta.id)) {
        const opt = document.createElement('option');
        opt.value = meta.id;
        const icon = meta.icon || '💾';
        opt.textContent = `${icon} ${meta.name.toUpperCase()} (${deck.length} Qs)`;
        this.selectDeck.appendChild(opt);
      }
      this.selectDeck.value = meta.id;
    }

    // Populate categories
    const categories = this.deckLoader.getCategories();
    this.selectCategory.innerHTML = '<option value="ALL">★ ALL CATEGORIES ★</option>';
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      this.selectCategory.appendChild(opt);
    });
  }

  showView(name) {
    if (name !== 'quiz') {
      this.audio.stopBgm();
    }
    Object.values(this.views).forEach(el => el.classList.remove('active'));
    if (this.views[name]) {
      this.views[name].classList.add('active');
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  getSelectedRoundSize() {
    let size = 10;
    this.roundSizeInputs.forEach(input => {
      if (input.checked) {
        size = input.value === 'ALL' ? 'ALL' : Number(input.value);
      }
    });
    return size;
  }

  getSelectedGameMode() {
    let mode = 'standard';
    this.gameModeInputs.forEach(input => {
      if (input.checked) {
        mode = input.value;
      }
    });
    return mode;
  }

  startQuiz() {
    const category = this.selectCategory.value;
    const roundSize = this.getSelectedRoundSize();
    const gameMode = this.getSelectedGameMode();
    const deck = this.deckLoader.currentDeck;

    if (!deck || deck.length === 0) {
      alert('No questions available in the current deck!');
      return;
    }

    this.quizEngine.initSession(deck, category, roundSize, gameMode);
    
    if (this.quizEngine.questions.length === 0) {
      alert(`No questions found under category "${category}"! Please select another category.`);
      return;
    }

    this.showView('quiz');
    this.renderQuestion();
    this.audio.startBgm();
    this.quizEngine.startTimer((formattedTime) => {
      this.hudTime.textContent = formattedTime;
    });
  }

  renderQuestion() {
    const q = this.quizEngine.getCurrentQuestion();
    if (!q) {
      this.finishQuiz();
      return;
    }

    // Update HUD
    const total = this.quizEngine.questions.length;
    const currentNum = this.quizEngine.currentIndex + 1;
    this.hudRound.textContent = `${String(currentNum).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
    this.hudScore.textContent = this.quizEngine.score.toLocaleString();
    this.hudStreak.textContent = `x${this.quizEngine.streak}`;
    this.hudStreak.classList.toggle('fire', this.quizEngine.streak >= 3);

    // Mode badge
    if (this.questionModeBadge) {
      const isSpeedrun = (this.quizEngine.mode === 'speedrun');
      this.questionModeBadge.textContent = isSpeedrun ? '⚡ SPEEDRUN MODE' : '📖 STANDARD MODE';
      this.questionModeBadge.className = `question-mode-badge ${isSpeedrun ? 'speedrun' : 'standard'}`;
    }

    // Question content
    this.questionCategory.textContent = q.category.toUpperCase();
    this.questionTitle.textContent = q.title;
    this.feedbackContainer.innerHTML = '';
    if (this.viewQuiz) {
      this.viewQuiz.classList.remove('is-answered');
    }

    // Render Option Cards
    this.optionsContainer.innerHTML = '';
    const choices = ['a', 'b', 'c', 'd'];
    choices.forEach(choice => {
      const text = q.options[choice];
      if (!text) return;

      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.dataset.choice = choice;
      btn.innerHTML = `
        <span class="option-letter">${choice.toUpperCase()}</span>
        <span class="option-text">${escapeHtml(text)}</span>
      `;

      btn.addEventListener('click', () => this.handleAnswerSelect(choice));
      this.optionsContainer.appendChild(btn);
    });
  }

  handleAnswerSelect(choice) {
    if (this.quizEngine.isAnswerLocked) return;

    this.audio.playOptionSelect();

    const result = this.quizEngine.submitAnswer(choice);
    if (!result) return;

    // Sound effect on answer
    if (result.isCorrect) {
      if (result.currentStreak >= 2) {
        this.audio.playCombo(result.currentStreak);
      } else {
        this.audio.playCorrect();
      }
    } else {
      this.audio.playWrong();
    }

    this.currentPendingResult = result;

    // Highlight options
    const buttons = this.optionsContainer.querySelectorAll('.option-btn');
    buttons.forEach(btn => {
      btn.disabled = true;
      const c = btn.dataset.choice.toLowerCase();
      const contentCol = btn.querySelector('.option-text') || btn;

      if (c === result.correctAnswer.toLowerCase()) {
        btn.classList.add('correct');
        if (!result.isCorrect) {
          const tag = document.createElement('div');
          tag.className = 'choice-tag correct-tag';
          tag.textContent = '★ CORRECT DEFINITION';
          contentCol.appendChild(tag);
        }
      } else if (c === choice.toLowerCase() && !result.isCorrect) {
        btn.classList.add('wrong');
        const tag = document.createElement('div');
        tag.className = 'choice-tag wrong-tag';
        tag.textContent = '✖ YOUR ANSWER';
        contentCol.appendChild(tag);
      }
    });

    // Update Score & Streak in HUD
    this.hudScore.textContent = result.currentScore.toLocaleString();
    this.hudStreak.textContent = `x${result.currentStreak}`;
    this.hudStreak.classList.toggle('fire', result.currentStreak >= 3);

    // Render Feedback Banner
    this.renderFeedbackBanner(result);

    // Clear any existing timeout
    if (this.advanceTimeout) {
      clearTimeout(this.advanceTimeout);
      this.advanceTimeout = null;
    }

    // Auto-advance behavior based on Game Mode:
    if (this.quizEngine.mode === 'speedrun') {
      // SPEEDRUN MODE: Auto-advance after answering!
      // (800ms for correct, 1300ms for wrong so player registers the result)
      const delay = result.isCorrect ? 800 : 1300;
      this.advanceTimeout = setTimeout(() => {
        this.advanceNextQuestion();
      }, delay);
    } else {
      // STANDARD MODE: NEVER auto-advance!
      // Whether correct or wrong, player MUST press CONTINUE >> or [Enter]/[Space]
      // to advance, ensuring all the time needed to study definitions & code examples.
    }
  }

  getExampleBadgeText() {
    const meta = this.deckLoader.deckMeta;
    if (!meta) return '⚡ CODE EXAMPLE';
    if (meta.badgeText) return meta.badgeText;
    return `⚡ ${meta.name.toUpperCase()} EXAMPLE`;
  }

  renderFeedbackBanner(result) {
    const isCorrect = result.isCorrect;
    const banner = document.createElement('div');
    banner.className = `feedback-banner ${isCorrect ? 'correct' : 'wrong'}`;

    if (this.viewQuiz) {
      this.viewQuiz.classList.add('is-answered');
    }

    const badgeText = this.getExampleBadgeText();
    const exampleSnippet = result.postanswer ? `
      <div class="code-example-box sql-example-box">
        <div class="code-example-header sql-example-header">
          <span class="code-example-badge sql-example-badge">${badgeText}</span>
        </div>
        <pre class="code-example-code sql-example-code"><code>${escapeHtml(result.postanswer)}</code></pre>
      </div>
    ` : '';

    const isSpeedrun = (this.quizEngine.mode === 'speedrun');
    const buttonLabel = isSpeedrun ? 'NEXT &gt;&gt; [AUTO]' : 'CONTINUE &gt;&gt; [ENTER]';
    const buttonClass = isSpeedrun 
      ? 'btn-advance' 
      : (isCorrect ? 'btn-advance btn-continue-action' : 'btn-advance btn-continue-wrong');

    if (isCorrect) {
      let bonusText = `+${result.pointsAwarded.toLocaleString()} PTS`;
      if (result.multiplier > 1.0) {
        bonusText += ` (${result.multiplier}x COMBO!)`;
      }
      banner.innerHTML = `
        <div class="feedback-header-row">
          <div class="feedback-title-meta">
            <span class="feedback-status-title">★ CORRECT! ★</span>
            <span class="feedback-bonus">${bonusText}</span>
          </div>
          <button class="${buttonClass}" id="btn-advance-now">${buttonLabel}</button>
        </div>
        ${exampleSnippet}
      `;
    } else {
      banner.innerHTML = `
        <div class="feedback-header-row">
          <div class="feedback-title-meta">
            <span class="feedback-status-title wrong">✖ INCORRECT</span>
            <span class="feedback-subtext">CORRECT: [${result.correctAnswer.toUpperCase()}]</span>
          </div>
          <button class="${buttonClass}" id="btn-advance-now">${buttonLabel}</button>
        </div>
        ${exampleSnippet}
      `;
    }

    this.feedbackContainer.innerHTML = '';
    this.feedbackContainer.appendChild(banner);

    const btnAdvance = banner.querySelector('#btn-advance-now');
    if (btnAdvance) {
      btnAdvance.addEventListener('click', () => {
        if (this.advanceTimeout) clearTimeout(this.advanceTimeout);
        this.advanceNextQuestion();
      });
    }
  }

  advanceNextQuestion() {
    this.audio.playBlip();

    if (this.advanceTimeout) {
      clearTimeout(this.advanceTimeout);
      this.advanceTimeout = null;
    }

    if (this.viewQuiz) {
      this.viewQuiz.classList.remove('is-answered');
    }

    const hasMore = this.quizEngine.nextQuestion();
    if (hasMore) {
      this.renderQuestion();
    } else {
      this.finishQuiz();
    }
  }

  finishQuiz() {
    if (this.viewQuiz) {
      this.viewQuiz.classList.remove('is-answered');
    }
    this.audio.stopBgm();
    this.quizEngine.stopTimer();
    const summary = this.quizEngine.getRoundSummary();

    // Setup Results view
    if (summary.accuracy >= 70) {
      this.resultsBadge.className = 'results-badge victory';
      this.resultsBadge.textContent = '★ MISSION ACCOMPLISHED ★';
      this.audio.playVictory();
    } else {
      this.resultsBadge.className = 'results-badge game-over';
      this.resultsBadge.textContent = '☠ GAME OVER ☠';
      this.audio.playGameOver();
    }

    this.statFinalScore.textContent = summary.score.toLocaleString();
    this.statFinalAccuracy.textContent = `${summary.correctCount}/${summary.totalQuestions} (${summary.accuracy}%)`;
    this.statFinalTime.textContent = summary.timeFormatted;
    this.statFinalStreak.textContent = `x${summary.maxStreak}`;

    // Reset input
    this.inputPlayerName.value = '';
    this.showView('results');

    // Focus input
    setTimeout(() => {
      this.inputPlayerName.focus();
    }, 200);
  }

  submitHighScore() {
    const name = this.inputPlayerName.value.trim() || 'AAA';
    const summary = this.quizEngine.getRoundSummary();
    const meta = this.deckLoader.deckMeta;
    const category = this.selectCategory.value;

    this.highscores.addScore({
      name,
      score: summary.score,
      correctCount: summary.correctCount,
      totalQuestions: summary.totalQuestions,
      accuracy: summary.accuracy,
      timeFormatted: summary.timeFormatted,
      timeMs: summary.elapsedMs,
      deckName: meta ? meta.name : 'Custom',
      category: category === 'ALL' ? 'ALL' : category,
      mode: summary.mode
    });

    this.showLeaderboard();
  }

  showLeaderboard() {
    this.highscores.renderTable(this.tableLeaderboardBody);
    this.showView('leaderboard');
  }

  initPWA() {
    this.btnPwaInstall = document.getElementById('btn-pwa-install');
    this.deferredInstallPrompt = null;

    // Register Service Worker for offline capability
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('./sw.js')
          .then((reg) => {
            console.log('[PWA] Service Worker registered successfully, scope:', reg.scope);
            // Check server for updates on every app launch
            reg.update();
          })
          .catch((err) => {
            console.warn('[PWA] Service Worker registration failed:', err);
          });
      });

      // Reload page cleanly when new Service Worker takes control
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          console.log('[PWA] New service worker active, refreshing page...');
          window.location.reload();
        }
      });
    }

    // Capture browser install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      if (this.btnPwaInstall) {
        this.btnPwaInstall.classList.remove('hidden');
      }
    });

    if (this.btnPwaInstall) {
      this.btnPwaInstall.addEventListener('click', async () => {
        if (!this.deferredInstallPrompt) return;
        this.audio.playBeep();
        this.deferredInstallPrompt.prompt();
        const choice = await this.deferredInstallPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          console.log('[PWA] User accepted installation prompt');
        }
        this.deferredInstallPrompt = null;
        this.btnPwaInstall.classList.add('hidden');
      });
    }

    window.addEventListener('appinstalled', () => {
      console.log('[PWA] Code Quiz installed to home screen / device');
      if (this.btnPwaInstall) {
        this.btnPwaInstall.classList.add('hidden');
      }
    });
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Bootstrap application on DOM ready or immediately if already loaded
function initApp() {
  if (!window.app) {
    window.app = new App();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
