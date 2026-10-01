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

    this.modal = document.getElementById('detail-modal');
    this.modalContent = this.modal.querySelector('.modal-content');
    this.modalBody = document.getElementById('modal-body');
    this.closeModalBtn = document.getElementById('close-modal');

    // Pila di navigazione della modale (gioco -> espansione)
    this.modalStack = [];

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

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.classList.contains('active')) {
        this.closeModal();
      }
    });
  },

  // --- Traduzioni ---------------------------------------------------------

  translate(dict, value) {
    if (!value) return '';
    return dict[value] || value;
  },

  // Le liste di BGG sono separate da virgole, ma alcune voci contengono a loro
  // volta una virgola: le mettiamo al riparo prima di dividere la stringa.
  translateList(raw, dict) {
    if (!raw) return [];
    const compounds = Object.keys(dict).filter(k => k.indexOf(',') !== -1);
    let safe = raw;
    compounds.forEach((key, i) => {
      safe = safe.split(key).join('@@' + i + '@@');
    });
    return safe
      .split(',')
      .map(v => v.trim())
      .filter(Boolean)
      .map(v => v.replace(/@@(\d+)@@/g, (_, i) => compounds[i]))
      .map(v => this.translate(dict, v));
  },

  description(game) {
    return TR_DESCRIPTIONS[game.name] || game.description || '';
  },

  // --- Modale -------------------------------------------------------------

  closeModal() {
    this.modal.classList.remove('active');
    this.modalStack = [];
    document.body.classList.remove('modal-open');
  },

  openModal(item, parent) {
    this.modalStack = parent ? [parent, item] : [item];
    this.renderModal();
    this.modal.classList.add('active');
    document.body.classList.add('modal-open');
  },

  renderModal() {
    const item = this.modalStack[this.modalStack.length - 1];
    const parent = this.modalStack.length > 1 ? this.modalStack[this.modalStack.length - 2] : null;
    this.modalBody.innerHTML = this.createDetail(item, parent);
    this.modalContent.scrollTop = 0;

    const backBtn = this.modalBody.querySelector('.modal-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.modalStack.pop();
        this.renderModal();
      });
    }

    this.modalBody.querySelectorAll('.expansion-item').forEach((el, index) => {
      el.addEventListener('click', () => {
        this.modalStack.push(item.expansions[index]);
        this.renderModal();
      });
    });
  },

  // --- Filtri -------------------------------------------------------------

  filterData() {
    return this.data.filter(game => {
      game.expansionMatchNotice = null; // Reset per ogni render

      // Ricerca
      if (this.filters.search && !game.name.toLowerCase().includes(this.filters.search)) {
        // Fallback: cerca anche nelle espansioni se non trova nel gioco base
        const searchMatchInExpansions = game.expansions && game.expansions.some(exp => exp.name.toLowerCase().includes(this.filters.search));
        if (!searchMatchInExpansions) {
          return false;
        }
      }

      let baseMatch = true;

      // Giocatori
      if (this.filters.players) {
        if (game.minplayers > this.filters.players || game.maxplayers < this.filters.players) {
          baseMatch = false;
        }
      }

      // Durata massima
      if (this.filters.maxTime) {
        // Se maxTime vale 999 significa oltre 120 minuti
        if (this.filters.maxTime === 999) {
           if (game.maxplaytime < 120) baseMatch = false;
        } else {
           if (game.maxplaytime > this.filters.maxTime) baseMatch = false;
        }
      }

      if (baseMatch) {
        return true;
      }

      // Se il gioco base non soddisfa i filtri di giocatori/tempo, controlliamo le espansioni
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
    this.resultsCount.textContent = filtered.length === 1
      ? '1 gioco trovato'
      : `${filtered.length} giochi trovati`;

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

    const cards = this.container.querySelectorAll('.game-card');
    cards.forEach((card, index) => {
      const game = filtered[index];

      card.addEventListener('click', () => {
        this.openModal(game);
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.openModal(game);
        }
      });

      card.querySelectorAll('.quick-link').forEach(link => {
        link.addEventListener('click', (e) => e.stopPropagation());
        link.addEventListener('keydown', (e) => e.stopPropagation());
      });

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

      card.querySelectorAll('.expansion-item').forEach((item, expIndex) => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openModal(game.expansions[expIndex], game);
        });
      });
    });
  },

  // --- Blocchi HTML riutilizzabili ----------------------------------------

  imageHtml(game, extraClass) {
    const src = game.image_url || game.thumbnail_url;
    const cls = 'game-image-container' + (extraClass ? ' ' + extraClass : '');
    return src
      ? `<div class="${cls}"><img class="game-image" src="${src}" alt="Copertina di ${game.name}" loading="lazy"></div>`
      : `<div class="${cls} placeholder"><div class="empty-icon">🎲</div></div>`;
  },

  statsHtml(game) {
    const players = game.minplayers === game.maxplayers
      ? game.minplayers
      : `${game.minplayers} - ${game.maxplayers}`;
    const time = game.minplaytime === game.maxplaytime
      ? game.maxplaytime
      : `${game.minplaytime} - ${game.maxplaytime}`;

    return `
      <div class="game-stats">
        <div class="stat-badge" title="Giocatori">
          <span class="stat-icon">👥</span>
          <span class="stat-value">${players}</span>
        </div>
        <div class="stat-badge" title="Durata">
          <span class="stat-icon">⏱️</span>
          <span class="stat-value">${time}'</span>
        </div>
        ${game.age && game.age !== '0' ? `<div class="stat-badge" title="Età consigliata"><span class="stat-icon">🎂</span><span class="stat-value">${game.age}</span></div>` : ''}
      </div>
    `;
  },

  tagsHtml(game, limit) {
    let categories = this.translateList(game.categories, TR_CATEGORIES);
    let mechanics = this.translateList(game.mechanics, TR_MECHANICS);
    if (limit) {
      categories = categories.slice(0, limit);
      mechanics = mechanics.slice(0, limit);
    }
    if (!categories.length && !mechanics.length) return '';
    return `
      <div class="game-tags">
        ${categories.map(c => `<span class="tag category">${c}</span>`).join('')}
        ${mechanics.map(m => `<span class="tag mechanic">${m}</span>`).join('')}
      </div>
    `;
  },

  // Nelle descrizioni di BGG gli a capo separano i paragrafi.
  descriptionHtml(game) {
    const text = this.description(game);
    if (!text) return '';
    return text
      .split(/\n+/)
      .map(p => p.trim())
      .filter(Boolean)
      .map(p => `<p>${p}</p>`)
      .join('');
  },

  expansionsListHtml(game) {
    return game.expansions.map(exp => {
      const players = (exp.minplayers || exp.maxplayers)
        ? `👥 ${exp.minplayers}-${exp.maxplayers}`
        : '';
      const time = exp.maxplaytime ? `⏱️ ${exp.maxplaytime}'` : '';
      const details = [players, time].filter(Boolean).join(' · ');
      return `
        <div class="expansion-item" title="Clicca per i dettagli dell'espansione">
          <span class="exp-name">${exp.name}</span>
          <span class="exp-details">${details}</span>
        </div>
      `;
    }).join('');
  },

  // Collegamenti a istruzioni in italiano e video tutorial
  youtubeUrl(id) {
    return `https://www.youtube.com/watch?v=${id}`;
  },

  quickLinksHtml(game) {
    const rule = game.rules && game.rules[0];
    const video = game.videos && game.videos[0];
    if (!rule && !video) return '';
    return `
      <div class="quick-links">
        ${rule ? `<a class="quick-link" href="${rule.url}" target="_blank" rel="noopener" title="Istruzioni in italiano">📖 Istruzioni</a>` : ''}
        ${video ? `<a class="quick-link" href="${this.youtubeUrl(video.id)}" target="_blank" rel="noopener" title="${video.title.replace(/"/g, '&quot;')}">▶ Video tutorial</a>` : ''}
      </div>
    `;
  },

  resourcesHtml(game) {
    const rules = game.rules || [];
    const videos = game.videos || [];
    const extra = game.links || [];
    const searchName = encodeURIComponent(game.name.replace(/\(.*?\)/g, '').trim());
    const bggFiles = game.bgg_id ? `https://boardgamegeek.com/boardgame/${game.bgg_id}/files` : null;

    const ruleRows = rules.concat(extra).map(r => `
      <a class="resource-row" href="${r.url}" target="_blank" rel="noopener">
        <span class="resource-icon">${rules.includes(r) ? '📖' : '🔗'}</span>
        <span class="resource-title">${r.title}</span>
        <span class="resource-go">Apri &rarr;</span>
      </a>
    `).join('');

    const videoCards = videos.map(v => `
      <a class="video-card" href="${this.youtubeUrl(v.id)}" target="_blank" rel="noopener">
        <span class="video-thumb">
          <img src="https://i.ytimg.com/vi/${v.id}/mqdefault.jpg" alt="" loading="lazy">
          <span class="video-play">▶</span>
        </span>
        <span class="video-title">${v.title}</span>
        <span class="video-channel">${v.channel}</span>
      </a>
    `).join('');

    return `
      <section class="detail-section">
        <h3 class="detail-section-title">Istruzioni in italiano</h3>
        ${ruleRows ? `<div class="resource-list">${ruleRows}</div>` : '<p class="resource-empty">Nessuna istruzione in italiano trovata finora.</p>'}
        ${bggFiles ? `<a class="resource-more" href="${bggFiles}" target="_blank" rel="noopener">Altri file su BoardGameGeek &rarr;</a>` : ''}
      </section>

      <section class="detail-section">
        <h3 class="detail-section-title">Video tutorial</h3>
        ${videoCards ? `<div class="video-grid">${videoCards}</div>` : '<p class="resource-empty">Nessun video tutorial selezionato.</p>'}
        <a class="resource-more" href="https://www.youtube.com/results?search_query=${searchName}+tutorial" target="_blank" rel="noopener">Cerca altri tutorial su YouTube &rarr;</a>
        <a class="resource-more" href="https://www.youtube.com/@MissMeeple/search?query=${searchName}" target="_blank" rel="noopener">Cerca sul canale Miss Meeple &rarr;</a>
      </section>
    `;
  },

  // --- Scheda in elenco ---------------------------------------------------

  createCard(game) {
    const hasExpansions = game.expansions && game.expansions.length > 0;

    const expansionsHtml = hasExpansions ? `
      <div class="expansions">
        <button class="expansions-toggle">Vedi ${game.expansions.length} espansion${game.expansions.length > 1 ? 'i' : 'e'}</button>
        <div class="expansions-list">
          ${this.expansionsListHtml(game)}
        </div>
      </div>
    ` : '';

    const expansionNoticeHtml = game.expansionMatchNotice ? `
      <div class="expansion-notice">
        <span class="notice-icon">⚠️</span>
        <span>${game.expansionMatchNotice}</span>
      </div>
    ` : '';

    const description = this.description(game);

    return `
      <div class="game-card" role="button" tabindex="0" title="Clicca per vedere tutti i dettagli">
        <div class="game-content">
          ${this.imageHtml(game)}
          <div class="game-details">
            <div class="game-header">
              <h2 class="game-title">${game.name}</h2>
              <span class="game-year">${game.year && game.year !== '0' ? game.year : ''}</span>
            </div>

            ${this.statsHtml(game)}

            ${this.tagsHtml(game, 3)}

            ${expansionNoticeHtml}

            <div class="game-desc">
              ${game.best_players ? `<p><strong>Ideale con:</strong> ${game.best_players} giocatori</p>` : ''}
              ${game.language_dependence ? `<p><strong>Lingua:</strong> ${this.translate(TR_LANGUAGE_DEPENDENCE, game.language_dependence)}</p>` : ''}
            </div>

            ${description ? `<div class="game-description">${description}</div>` : ''}

            ${this.quickLinksHtml(game)}

            <span class="card-hint">Clicca per la scheda completa</span>
          </div>
        </div>

        ${expansionsHtml}
      </div>
    `;
  },

  // --- Scheda completa nella modale ---------------------------------------

  createDetail(game, parent) {
    const categories = this.translateList(game.categories, TR_CATEGORIES);
    const mechanics = this.translateList(game.mechanics, TR_MECHANICS);
    const hasExpansions = game.expansions && game.expansions.length > 0;

    const players = (game.minplayers || game.maxplayers)
      ? (game.minplayers === game.maxplayers ? `${game.minplayers}` : `da ${game.minplayers} a ${game.maxplayers}`)
      : null;
    const playtime = (game.minplaytime || game.maxplaytime)
      ? (game.minplaytime === game.maxplaytime ? `${game.maxplaytime} minuti` : `da ${game.minplaytime} a ${game.maxplaytime} minuti`)
      : null;

    const infoRows = [
      ['Tipo', game.itemtype === 'expansion' ? 'Espansione' : 'Gioco base'],
      ['Anno di pubblicazione', game.year && game.year !== '0' ? game.year : null],
      ['Numero di giocatori', players],
      ['Numero ideale di giocatori', game.best_players || null],
      ['Durata', playtime],
      ['Età consigliata', game.age && game.age !== '0' ? game.age : null],
      ['Dipendenza dalla lingua', this.translate(TR_LANGUAGE_DEPENDENCE, game.language_dependence) || null],
      ['Espansioni', hasExpansions ? `${game.expansions.length}` : null]
    ].filter(row => row[1]);

    const descriptionHtml = this.descriptionHtml(game);

    return `
      <article class="game-detail">
        ${parent ? `<button class="modal-back">&larr; Torna a ${parent.name}</button>` : ''}

        <div class="detail-hero">
          ${this.imageHtml(game, 'detail-image')}
          <div class="detail-heading">
            <h2 class="detail-title">${game.name}</h2>
            ${game.itemtype === 'expansion' ? '<span class="detail-badge">Espansione</span>' : ''}
            ${this.statsHtml(game)}
          </div>
        </div>

        <section class="detail-section">
          <h3 class="detail-section-title">Dati del gioco</h3>
          <dl class="detail-table">
            ${infoRows.map(row => `
              <div class="detail-row">
                <dt>${row[0]}</dt>
                <dd>${row[1]}</dd>
              </div>
            `).join('')}
          </dl>
        </section>

        ${categories.length ? `
          <section class="detail-section">
            <h3 class="detail-section-title">Categorie</h3>
            <div class="game-tags">
              ${categories.map(c => `<span class="tag category">${c}</span>`).join('')}
            </div>
          </section>
        ` : ''}

        ${mechanics.length ? `
          <section class="detail-section">
            <h3 class="detail-section-title">Meccaniche</h3>
            <div class="game-tags">
              ${mechanics.map(m => `<span class="tag mechanic">${m}</span>`).join('')}
            </div>
          </section>
        ` : ''}

        ${this.resourcesHtml(game)}

        ${descriptionHtml ? `
          <section class="detail-section">
            <h3 class="detail-section-title">Descrizione</h3>
            <div class="detail-description">${descriptionHtml}</div>
          </section>
        ` : ''}

        ${hasExpansions ? `
          <section class="detail-section">
            <h3 class="detail-section-title">Espansioni (${game.expansions.length})</h3>
            <div class="expansions-list active">
              ${this.expansionsListHtml(game)}
            </div>
          </section>
        ` : ''}
      </article>
    `;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
