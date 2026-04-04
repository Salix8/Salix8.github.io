const container = document.getElementById('characters-container');
const exportAllBtn = document.getElementById('export-all');
const importFileInput = document.getElementById('import-file');

function init() {
  renderList();
  setupEventListeners();
}

function renderList() {
  const characters = getAllCharacters();

  if (characters.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📜</div>
        <h2 class="empty-state__text">You have no saved characters yet.</h2>
        <a href="../creator/" class="btn btn--primary">Create Character</a>
      </div>
    `;
    exportAllBtn.style.display = 'none';
    return;
  }

  exportAllBtn.style.display = 'inline-flex';

  // Sort by updatedAt descending
  characters.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  const grid = document.createElement('div');
  grid.className = 'characters-grid';

  grid.innerHTML = characters.map(char => {
    const raceClass = [char.race, char.class].filter(Boolean).join(' ');
    const desc = raceClass ? `Level ${char.level} ${raceClass}` : `Level ${char.level}`;
    const date = new Date(char.updatedAt).toLocaleDateString();

    return `
      <div class="char-list-card" data-id="${char.id}">
        <div class="char-list-card__header">
          <h3 class="char-list-card__name">${escapeHtml(char.name) || 'Unnamed'}</h3>
          <p class="char-list-card__meta">${escapeHtml(desc)}</p>
        </div>
        
        <div class="char-list-card__stats">
          <span class="char-list-card__stat">HP: ${char.hitPoints.max}</span>
          <span class="char-list-card__stat">AC: ${char.armorClass || (10 + Math.floor((char.attributes.dexterity - 10) / 2))}</span>
          <span class="char-list-card__stat">Updated: ${date}</span>
        </div>

        <div class="char-list-card__actions">
          <a href="../creator/?id=${char.id}" class="btn btn--outline" style="flex:1; justify-content:center">✏️ Edit</a>
          <button type="button" class="btn btn--outline btn-delete" style="flex:none" aria-label="Delete character">🗑️</button>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = '';
  container.appendChild(grid);
}

function setupEventListeners() {
  container.addEventListener('click', e => {
    if (e.target.closest('.btn-delete')) {
      const card = e.target.closest('.char-list-card');
      const id = card.dataset.id;
      
      if (confirm('Are you sure you want to delete this character?')) {
        deleteCharacter(id);
        showToast('Character deleted.');
        renderList();
      }
    }
  });

  exportAllBtn.addEventListener('click', () => {
    const jsonStr = exportAllCharacters();
    if (jsonStr === '[]') return;

    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().split('T')[0];
    a.download = `dnd_characters_backup_${date}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  });

  importFileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const json = event.target.result;
        // Check if array (backup) or single object (individual character)
        const parsed = JSON.parse(json);
        
        if (Array.isArray(parsed)) {
          let imported = 0;
          parsed.forEach(c => {
            if (c.id && c.name) {
              importCharacter(JSON.stringify(c));
              imported++;
            }
          });
          showToast(`Imported ${imported} characters successfully!`);
        } else {
          importCharacter(json);
          showToast(`Character "${parsed.name}" imported successfully!`);
        }
        
        renderList();
      } catch (err) {
        showToast('Failed to parse file. Make sure it is a valid D&D JSON backup.', 'error');
        console.error(err);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  });
}

/** Utility: Escape HTML for modules display */
function escapeHtml(unsafe) {
  return (unsafe || '').toString().replace(/[&<"']/g, function(m) {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '"': return '&quot;';
      default: return '&#039;';
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
