// ==========================================================================
// APP CONTROLLER
// Wires together views, user interactions, deck loading, and gameplay loop
// ==========================================================================

import { DeckLoader } from './deckLoader.js';
import { QuizEngine } from './quizEngine.js';
import { HighscoreManager } from './highscores.js';

class App {
  constructor() {
    this.deckLoader = new DeckLoader();
    this.quizEngine = new QuizEngine();
    this.highscores = new HighscoreManager();

    this.advanceTimeout = null;
    this.currentPendingResult = null;

    this.initElements();
    this.initEventListeners();
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
    this.btnNavScores = document.getElementById('btn-nav-scores');
    this.btnNavHome = document.getElementById('btn-nav-home');

    // Menu View Elements
    this.selectCategory = document.getElementById('select-category');
    this.deckNameDisplay = document.getElementById('deck-name-display');
    this.deckCountDisplay = document.getElementById('deck-count-display');
    this.btnStartGame = document.getElementById('btn-start-game');
    this.btnOpenDiskLoader = document.getElementById('btn-open-disk-loader');
    this.roundSizeInputs = document.querySelectorAll('input[name="round-size"]');

    // Custom Deck Dialog
    this.dialogDiskLoader = document.getElementById('dialog-disk-loader');
    this.btnCloseDialog = document.getElementById('btn-close-dialog');
    this.dropZone = document.getElementById('drop-zone');
    this.fileInput = document.getElementById('file-input');

    // Quiz View Elements
    this.hudScore = document.getElementById('hud-score');
    this.hudTime = document.getElementById('hud-time');
    this.hudRound = document.getElementById('hud-round');
    this.hudStreak = document.getElementById('hud-streak');
    this.questionCategory = document.getElementById('question-category');
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
      this.btnCrtToggle.textContent = isDisabled ? '📺 CRT: OFF' : '📺 CRT: ON';
      this.btnCrtToggle.classList.toggle('active', !isDisabled);
      localStorage.setItem('code_quiz_crt_pref', isDisabled ? 'off' : 'on');
    });

    // Navigation
    this.btnNavScores.addEventListener('click', () => this.showLeaderboard());
    this.btnNavHome.addEventListener('click', () => this.showView('menu'));
    this.btnLeaderboardBack.addEventListener('click', () => this.showView('menu'));
    this.btnResultsHome.addEventListener('click', () => this.showView('menu'));
    this.btnPlayAgain.addEventListener('click', () => this.startQuiz());

    // Disk Loader Dialog
    this.btnOpenDiskLoader.addEventListener('click', () => {
      if (typeof this.dialogDiskLoader.showModal === 'function') {
        this.dialogDiskLoader.showModal();
      } else {
        this.dialogDiskLoader.setAttribute('open', '');
      }
    });

    this.btnCloseDialog.addEventListener('click', () => {
      this.dialogDiskLoader.close();
    });

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
      this.btnCrtToggle.textContent = '📺 CRT: OFF';
      this.btnCrtToggle.classList.remove('active');
    }

    // Load default PostgreSQL deck
    await this.loadDeck('postgresql');
  }

  async loadDeck(deckId) {
    this.deckNameDisplay.textContent = 'LOADING DISK...';
    const result = await this.deckLoader.loadDefaultDeck(deckId);
    if (result.success) {
      this.updateDeckUI();
    } else {
      this.deckNameDisplay.textContent = 'ERROR LOADING DECK';
      alert('Failed to load default questions deck: ' + result.error);
    }
  }

  handleCustomFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = this.deckLoader.parseCustomDeck(e.target.result, file.name);
      if (result.success) {
        this.dialogDiskLoader.close();
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
    this.deckNameDisplay.textContent = meta.name.toUpperCase();
    this.deckCountDisplay.textContent = `${deck.length} QUESTIONS AVAILABLE`;

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

  startQuiz() {
    const category = this.selectCategory.value;
    const roundSize = this.getSelectedRoundSize();
    const deck = this.deckLoader.currentDeck;

    if (!deck || deck.length === 0) {
      alert('No questions available in the current deck!');
      return;
    }

    this.quizEngine.initSession(deck, category, roundSize);
    
    if (this.quizEngine.questions.length === 0) {
      alert(`No questions found under category "${category}"! Please select another category.`);
      return;
    }

    this.showView('quiz');
    this.renderQuestion();
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

    // Question content
    this.questionCategory.textContent = q.category.toUpperCase();
    this.questionTitle.textContent = q.title;
    this.feedbackContainer.innerHTML = '';

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

    const result = this.quizEngine.submitAnswer(choice);
    if (!result) return;

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

    // Only auto-advance if the answer was CORRECT!
    // When WRONG: Do NOT auto-advance so player has unlimited time to read the correct answer.
    if (result.isCorrect) {
      this.advanceTimeout = setTimeout(() => {
        this.advanceNextQuestion();
      }, 1600);
    }
  }

  renderFeedbackBanner(result) {
    const isCorrect = result.isCorrect;
    const banner = document.createElement('div');
    banner.className = `feedback-banner ${isCorrect ? 'correct' : 'wrong'}`;

    if (isCorrect) {
      let bonusText = `+${result.pointsAwarded.toLocaleString()} PTS`;
      if (result.multiplier > 1.0) {
        bonusText += ` (${result.multiplier}x COMBO!)`;
      }
      banner.innerHTML = `
        <div>
          <span>★ CORRECT! ★</span>
          <span class="feedback-bonus">${bonusText}</span>
        </div>
        <button class="btn-advance" id="btn-advance-now">NEXT &gt;&gt;</button>
      `;
    } else {
      banner.innerHTML = `
        <div>
          <div>✖ INCORRECT — REVIEW ANSWER BELOW</div>
          <span class="feedback-subtext">CORRECT CHOICE IS [${result.correctAnswer.toUpperCase()}]. TAKE YOUR TIME TO READ.</span>
        </div>
        <button class="btn-advance btn-continue-wrong" id="btn-advance-now">CONTINUE &gt;&gt; [ENTER]</button>
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
    if (this.advanceTimeout) {
      clearTimeout(this.advanceTimeout);
      this.advanceTimeout = null;
    }

    const hasMore = this.quizEngine.nextQuestion();
    if (hasMore) {
      this.renderQuestion();
    } else {
      this.finishQuiz();
    }
  }

  finishQuiz() {
    this.quizEngine.stopTimer();
    const summary = this.quizEngine.getRoundSummary();

    // Setup Results view
    if (summary.accuracy >= 70) {
      this.resultsBadge.className = 'results-badge victory';
      this.resultsBadge.textContent = '★ MISSION ACCOMPLISHED ★';
    } else {
      this.resultsBadge.className = 'results-badge game-over';
      this.resultsBadge.textContent = '☠ GAME OVER ☠';
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
      category: category === 'ALL' ? 'ALL' : category
    });

    this.showLeaderboard();
  }

  showLeaderboard() {
    this.highscores.renderTable(this.tableLeaderboardBody);
    this.showView('leaderboard');
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

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
