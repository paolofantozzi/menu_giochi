const app = {
  data: gamesData,
  filters: {
    search: '',
    players: '',
    maxTime: ''
  },
  
  init() {
    this.container = document.getElementById('games-container');
    this.searchInput = document.getElementById('search-input');
    this.playersInput = document.getElementById('players-input');
    this.timeSelect = document.getElementById('time-select');
    this.resultsCount = document.getElementById('results-count');

    this.bindEvents();
    this.render();
  },

  bindEvents() {
    this.searchInput.addEventListener('input', (e) => {
      this.filters.search = e.target.value.toLowerCase();
      this.render();
    });

    this.playersInput.addEventListener('input', (e) => {
      this.filters.players = parseInt(e.target.value, 10) || '';
      this.render();
    });

    this.timeSelect.addEventListener('change', (e) => {
      this.filters.maxTime = parseInt(e.target.value, 10) || '';
      this.render();
    });
  },

  filterData() {
    return this.data.filter(game => {
      // Search
      if (this.filters.search && !game.name.toLowerCase().includes(this.filters.search)) {
        return false;
      }
      
      // Players
      if (this.filters.players) {
        if (game.minplayers > this.filters.players || game.maxplayers < this.filters.players) {
          return false;
        }
      }

      // Max Time
      if (this.filters.maxTime) {
        // If maxTime is 999, it means 120+ 
        if (this.filters.maxTime === 999) {
           if (game.maxplaytime < 120) return false;
        } else {
           if (game.maxplaytime > this.filters.maxTime) return false;
        }
      }

      return true;
    });
  },

  render() {
    const filtered = this.filterData();
    this.resultsCount.textContent = `${filtered.length} giochi trovati`;
    
    if (filtered.length === 0) {
      this.container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎲</div>
          <h3>Nessun gioco trovato</h3>
          <p>Prova a modificare i filtri di ricerca.</p>
        </div>
      `;
      return;
    }

    this.container.innerHTML = filtered.map(game => this.createCard(game)).join('');
    
    // Bind toggle events for expansions
    const cards = this.container.querySelectorAll('.game-card');
    cards.forEach(card => {
      const toggle = card.querySelector('.expansions-toggle');
      if (toggle) {
        toggle.addEventListener('click', (e) => {
          e.stopPropagation();
          const expansionsList = card.querySelector('.expansions-list');
          expansionsList.classList.toggle('active');
          toggle.textContent = expansionsList.classList.contains('active') 
            ? 'Nascondi espansioni' 
            : `Vedi ${game.expansions.length} espansion${game.expansions.length > 1 ? 'i' : 'e'}`;
        });
      }
    });
  },

  createCard(game) {
    const hasExpansions = game.expansions && game.expansions.length > 0;
    
    let expansionsHtml = '';
    if (hasExpansions) {
      expansionsHtml = `
        <div class="expansions">
          <button class="expansions-toggle">Vedi ${game.expansions.length} espansion${game.expansions.length > 1 ? 'i' : 'e'}</button>
          <div class="expansions-list">
            ${game.expansions.map(exp => `
              <div class="expansion-item">
                <span class="exp-name">${exp.name}</span>
                <span class="exp-details">${exp.minplayers}-${exp.maxplayers} <i class="icon-user"></i> · ${exp.maxplaytime}' <i class="icon-clock"></i></span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    return `
      <div class="game-card">
        <div class="game-header">
          <h2 class="game-title">${game.name}</h2>
          <span class="game-year">${game.year !== '0' ? game.year : ''}</span>
        </div>
        
        <div class="game-stats">
          <div class="stat-badge" title="Giocatori">
            <span class="stat-icon">👥</span>
            <span class="stat-value">${game.minplayers === game.maxplayers ? game.minplayers : `${game.minplayers} - ${game.maxplayers}`}</span>
          </div>
          <div class="stat-badge" title="Durata">
            <span class="stat-icon">⏱️</span>
            <span class="stat-value">${game.minplaytime === game.maxplaytime ? game.maxplaytime : `${game.minplaytime} - ${game.maxplaytime}`}'</span>
          </div>
          ${game.age && game.age !== '0' ? `<div class="stat-badge" title="Età consigliata"><span class="stat-icon">🎂</span><span class="stat-value">${game.age}</span></div>` : ''}
        </div>
        
        <div class="game-desc">
          ${game.best_players ? `<p><strong>Ideale per:</strong> ${game.best_players} giocatori</p>` : ''}
          ${game.language_dependence ? `<p><strong>Lingua:</strong> ${game.language_dependence}</p>` : ''}
        </div>
        
        ${expansionsHtml}
      </div>
    `;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
