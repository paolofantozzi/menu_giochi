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

    this.modal = document.getElementById('expansion-modal');
    this.modalBody = document.getElementById('modal-body');
    this.closeModalBtn = document.getElementById('close-modal');

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

    this.closeModalBtn.addEventListener('click', () => {
      this.closeModal();
    });

    window.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.closeModal();
      }
    });
  },

  closeModal() {
    this.modal.classList.remove('active');
  },

  openModal(expansion) {
    this.modalBody.innerHTML = this.createCard(expansion, true);
    this.modal.classList.add('active');
  },

  filterData() {
    return this.data.filter(game => {
      game.expansionMatchNotice = null; // Reset per ogni render

      // Search
      if (this.filters.search && !game.name.toLowerCase().includes(this.filters.search)) {
        // Fallback: cerca anche nelle espansioni se non trova nel gioco base
        const searchMatchInExpansions = game.expansions && game.expansions.some(exp => exp.name.toLowerCase().includes(this.filters.search));
        if (!searchMatchInExpansions) {
          return false;
        }
      }
      
      let baseMatch = true;

      // Players
      if (this.filters.players) {
        if (game.minplayers > this.filters.players || game.maxplayers < this.filters.players) {
          baseMatch = false;
        }
      }

      // Max Time
      if (this.filters.maxTime) {
        // If maxTime is 999, it means 120+ 
        if (this.filters.maxTime === 999) {
           if (game.maxplaytime < 120) baseMatch = false;
        } else {
           if (game.maxplaytime > this.filters.maxTime) baseMatch = false;
        }
      }

      if (baseMatch) {
        return true;
      }

      // Se il gioco base non matcha i filtri di giocatori/tempo, controlliamo le espansioni
      let matchingExpansions = [];
      if (game.expansions && game.expansions.length > 0) {
        for (const exp of game.expansions) {
          let expMatches = true;

          if (this.filters.players) {
            // Se l'espansione non ha dati sui giocatori (0), usiamo i dati del gioco base
            const minP = exp.minplayers || game.minplayers;
            const maxP = exp.maxplayers || game.maxplayers;
            
            if (minP > this.filters.players || maxP < this.filters.players) {
              expMatches = false;
            }
          }

          if (this.filters.maxTime) {
             const maxT = exp.maxplaytime || game.maxplaytime;
             if (this.filters.maxTime === 999) {
               if (maxT < 120) expMatches = false;
             } else {
               if (maxT > this.filters.maxTime) expMatches = false;
             }
          }

          if (expMatches) {
            matchingExpansions.push(exp);
          }
        }
      }

      if (matchingExpansions.length > 0) {
        const expNames = matchingExpansions.map(e => `<strong>${e.name}</strong>`).join(', ');
        game.expansionMatchNotice = `Incluso grazie all'espansione: ${expNames}`;
        return true;
      }

      return false;
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
    cards.forEach((card, index) => {
      const game = filtered[index];
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

      const expansionItems = card.querySelectorAll('.expansion-item');
      if (expansionItems.length > 0) {
        expansionItems.forEach((item, expIndex) => {
          item.addEventListener('click', () => {
            this.openModal(game.expansions[expIndex]);
          });
        });
      }
    });
  },

  createCard(game, isModal = false) {
    const hasExpansions = !isModal && game.expansions && game.expansions.length > 0;
    
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

    const categories = game.categories ? game.categories.split(',').map(c => c.trim()).slice(0, 3) : [];
    const mechanics = game.mechanics ? game.mechanics.split(',').map(m => m.trim()).slice(0, 3) : [];
    
    let tagsHtml = '';
    if (categories.length || mechanics.length) {
      tagsHtml = `
        <div class="game-tags">
          ${categories.map(c => `<span class="tag category">${c}</span>`).join('')}
          ${mechanics.map(m => `<span class="tag mechanic">${m}</span>`).join('')}
        </div>
      `;
    }

    const expansionNoticeHtml = game.expansionMatchNotice ? `
      <div class="expansion-notice">
        <span class="notice-icon">⚠️</span> 
        <span>${game.expansionMatchNotice}</span>
      </div>
    ` : '';

    const imageHtml = game.image_url ? 
      `<div class="game-image-container"><img class="game-image" src="${game.image_url}" alt="Cover di ${game.name}" loading="lazy"></div>` : 
      (game.thumbnail_url ? `<div class="game-image-container"><img class="game-image" src="${game.thumbnail_url}" alt="Cover di ${game.name}" loading="lazy"></div>` : 
      `<div class="game-image-container placeholder"><div class="empty-icon">🎲</div></div>`);

    return `
      <div class="game-card">
        <div class="game-content">
          ${imageHtml}
          <div class="game-details">
            <div class="game-header">
              <h2 class="game-title">${game.name}</h2>
              <span class="game-year">${game.year && game.year !== '0' ? game.year : ''}</span>
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
            
            ${tagsHtml}
            
            ${expansionNoticeHtml}
            
            <div class="game-desc">
              ${game.best_players ? `<p><strong>Ideale per:</strong> ${game.best_players} giocatori</p>` : ''}
              ${game.language_dependence ? `<p><strong>Lingua:</strong> ${game.language_dependence}</p>` : ''}
            </div>
            
            ${game.description ? `<div class="game-description">${game.description}</div>` : ''}
          </div>
        </div>
        
        ${expansionsHtml}
      </div>
    `;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
