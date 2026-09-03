// ==========================================================================
// HIGHSCORES MODULE
// Handles local storage persistence and rendering of top arcade scores
// ==========================================================================

const STORAGE_KEY = 'code_quiz_arcade_highscores';

export class HighscoreManager {
  constructor() {
    this.scores = this.loadScores();
  }

  /**
   * Load scores from browser localStorage
   */
  loadScores() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('Could not read highscores from localStorage:', e);
      return [];
    }
  }

  /**
   * Add a new player score and persist to localStorage
   */
  addScore({ name, score, correctCount, totalQuestions, accuracy, timeFormatted, timeMs, deckName, category, mode }) {
    const entry = {
      id: 'score_' + Date.now(),
      name: (name || 'AAA').trim().toUpperCase().slice(0, 12),
      score: Number(score) || 0,
      correctCount: Number(correctCount) || 0,
      totalQuestions: Number(totalQuestions) || 0,
      accuracy: Number(accuracy) || 0,
      timeFormatted: timeFormatted || '00:00.0',
      timeMs: Number(timeMs) || 0,
      deckName: deckName || 'PostgreSQL',
      category: category || 'ALL',
      mode: (mode || 'standard').toUpperCase(),
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    };

    this.scores.push(entry);

    // Sort by Score DESC, then Time ASC
    this.scores.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.timeMs - b.timeMs;
    });

    // Retain top 50
    this.scores = this.scores.slice(0, 50);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.scores));
    } catch (e) {
      console.warn('Could not persist highscores:', e);
    }

    return entry;
  }

  /**
   * Clear all stored highscores
   */
  clearScores() {
    this.scores = [];
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Could not clear highscores:', e);
    }
  }

  /**
   * Render the leaderboard into a table body element
   */
  renderTable(tbodyElement) {
    if (!tbodyElement) return;
    tbodyElement.innerHTML = '';

    if (this.scores.length === 0) {
      tbodyElement.innerHTML = `
        <tr>
          <td colspan="6" class="empty-leaderboard-msg">
            NO HIGH SCORES RECORDED YET.<br>PLAY A ROUND TO CLAIM THE #1 SPOT!
          </td>
        </tr>
      `;
      return;
    }

    this.scores.forEach((item, index) => {
      const tr = document.createElement('tr');
      const rank = index + 1;
      let medal = `#${rank}`;
      if (rank === 1) medal = '🥇 1ST';
      else if (rank === 2) medal = '🥈 2ND';
      else if (rank === 3) medal = '🥉 3RD';

      const modeBadge = item.mode === 'SPEEDRUN' 
        ? '<span class="mode-tag mode-speedrun" title="Speedrun Mode">⚡ RUN</span>' 
        : '<span class="mode-tag mode-standard" title="Standard Mode">📖 STD</span>';

      tr.innerHTML = `
        <td class="rank-cell">${medal}</td>
        <td class="player-cell">${escapeHtml(item.name)}</td>
        <td class="score-cell">${item.score.toLocaleString()}</td>
        <td>${item.correctCount}/${item.totalQuestions} (${item.accuracy}%)</td>
        <td class="time-cell">${item.timeFormatted}</td>
        <td>${escapeHtml(item.category)} ${modeBadge}</td>
      `;
      tbodyElement.appendChild(tr);
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
