// storage.js — localStorage abstraction for character persistence

const STORAGE_KEY = 'dnd_characters';

/** Get all saved characters */
function getAllCharacters() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load characters:', e);
    return [];
  }
}

/** Get a single character by ID */
function getCharacter(id) {
  return getAllCharacters().find(c => c.id === id) || null;
}

/** Save a character (create or update) */
function saveCharacter(character) {
  const characters = getAllCharacters();
  const index = characters.findIndex(c => c.id === character.id);
  character.updatedAt = new Date().toISOString();

  if (index >= 0) {
    characters[index] = character;
  } else {
    character.createdAt = new Date().toISOString();
    characters.push(character);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
  } catch (e) {
    console.error('Failed to save:', e);
    throw new Error('Failed to save character. Storage might be full.');
  }
  return character;
}

/** Delete a character by ID */
function deleteCharacter(id) {
  const characters = getAllCharacters();
  const filtered = characters.filter(c => c.id !== id);
  if (filtered.length === characters.length) return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/** Export a character as JSON string */
function exportCharacter(id) {
  const character = getCharacter(id);
  return character ? JSON.stringify(character, null, 2) : null;
}

/** Export all characters as JSON string */
function exportAllCharacters() {
  return JSON.stringify(getAllCharacters(), null, 2);
}

/** Import a character from JSON string */
function importCharacter(jsonString) {
  try {
    const character = JSON.parse(jsonString);
    if (!character.id || !character.name) {
      throw new Error('Invalid character data');
    }
    return saveCharacter(character);
  } catch (e) {
    console.error('Failed to import:', e);
    throw new Error('Invalid character file.');
  }
}
