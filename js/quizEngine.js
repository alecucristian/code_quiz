// ==========================================================================
// QUIZ ENGINE MODULE
// Manages question shuffling, timer, arcade scoring & combo streak mechanics
// ==========================================================================

export class QuizEngine {
  constructor() {
    this.questions = [];
    this.currentIndex = 0;
    this.score = 0;
    this.streak = 0;
    this.maxStreak = 0;
    this.correctCount = 0;
    this.startTime = 0;
    this.elapsedMs = 0;
    this.timerInterval = null;
    this.questionStartTime = 0;
    this.isAnswerLocked = false;
    this.history = []; // Record user answers for review
  }

  /**
   * Initialize a new quiz session with filtered and shuffled questions
   */
  initSession(deck, category = 'ALL', roundSize = 10) {
    let filtered = deck;
    if (category && category !== 'ALL') {
      filtered = deck.filter(q => q.category === category);
    }

    // Fisher-Yates shuffle
    const shuffled = [...filtered];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Slice to round size
    if (roundSize !== 'ALL' && typeof roundSize === 'number' && roundSize > 0) {
      this.questions = shuffled.slice(0, roundSize);
    } else {
      this.questions = shuffled;
    }

    this.currentIndex = 0;
    this.score = 0;
    this.streak = 0;
    this.maxStreak = 0;
    this.correctCount = 0;
    this.elapsedMs = 0;
    this.isAnswerLocked = false;
    this.history = [];
  }

  /**
   * Start the live stopwatch timer
   */
  startTimer(onTick) {
    this.startTime = Date.now() - this.elapsedMs;
    this.questionStartTime = Date.now();
    
    if (this.timerInterval) clearInterval(this.timerInterval);
    
    this.timerInterval = setInterval(() => {
      this.elapsedMs = Date.now() - this.startTime;
      if (onTick) onTick(this.getFormattedTime());
    }, 100);
  }

  /**
   * Pause / stop the stopwatch
   */
  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * Get current formatted time: MM:SS.s
   */
  getFormattedTime(ms = this.elapsedMs) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
  }

  /**
   * Get current active question
   */
  getCurrentQuestion() {
    return this.questions[this.currentIndex] || null;
  }

  /**
   * Submit an answer choice ('a', 'b', 'c', or 'd')
   */
  submitAnswer(selectedOption) {
    if (this.isAnswerLocked) return null;
    this.isAnswerLocked = true;

    const current = this.getCurrentQuestion();
    if (!current) return null;

    const isCorrect = (selectedOption.toLowerCase() === current.answer.toLowerCase());
    const answerTimeMs = Date.now() - this.questionStartTime;

    let pointsAwarded = 0;
    let speedBonus = 0;
    let multiplier = 1.0;

    if (isCorrect) {
      this.correctCount++;
      this.streak++;
      if (this.streak > this.maxStreak) {
        this.maxStreak = this.streak;
      }

      // Base points
      const basePoints = 1000;

      // Speed bonus: Answers within 12s earn up to 1,000 bonus points
      if (answerTimeMs < 12000) {
        speedBonus = Math.floor((12000 - answerTimeMs) / 12);
      }

      // Combo streak multiplier
      if (this.streak >= 5) {
        multiplier = 2.0;
      } else if (this.streak === 4) {
        multiplier = 1.8;
      } else if (this.streak === 3) {
        multiplier = 1.5;
      } else if (this.streak === 2) {
        multiplier = 1.2;
      }

      pointsAwarded = Math.round((basePoints + speedBonus) * multiplier);
      this.score += pointsAwarded;
    } else {
      this.streak = 0;
    }

    const result = {
      isCorrect,
      selectedOption,
      correctAnswer: current.answer,
      pointsAwarded,
      speedBonus,
      multiplier,
      currentScore: this.score,
      currentStreak: this.streak,
      explanation: current.options[current.answer]
    };

    this.history.push({
      question: current,
      userAnswer: selectedOption,
      isCorrect,
      timeMs: answerTimeMs
    });

    return result;
  }

  /**
   * Advance to next question or complete round
   */
  nextQuestion() {
    this.isAnswerLocked = false;
    this.currentIndex++;
    this.questionStartTime = Date.now();
    return this.currentIndex < this.questions.length;
  }

  /**
   * Get final round summary statistics
   */
  getRoundSummary() {
    const total = this.questions.length;
    const accuracy = total > 0 ? Math.round((this.correctCount / total) * 100) : 0;
    return {
      score: this.score,
      correctCount: this.correctCount,
      totalQuestions: total,
      accuracy,
      maxStreak: this.maxStreak,
      elapsedMs: this.elapsedMs,
      timeFormatted: this.getFormattedTime(this.elapsedMs)
    };
  }
}
