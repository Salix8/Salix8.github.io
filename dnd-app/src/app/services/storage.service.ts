import { Injectable } from '@angular/core';
import { Character, createCharacter } from '../models/character.model';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly STORAGE_KEY = 'dnd_characters';

  constructor() {}

  getAllCharacters(): Character[] {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('Error parsing characters from localStorage', e);
      return [];
    }
  }

  getCharacter(id: string): Character | null {
    const chars = this.getAllCharacters();
    const char = chars.find(c => c.id === id);
    return char || null;
  }

  saveCharacter(character: Character): Character {
    const chars = this.getAllCharacters();
    const index = chars.findIndex(c => c.id === character.id);
    
    const now = new Date().toISOString();
    const toSave = { ...character, updatedAt: now };

    if (index >= 0) {
      chars[index] = toSave;
    } else {
      toSave.createdAt = now;
      chars.push(toSave);
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(chars));
    return toSave;
  }

  deleteCharacter(id: string): boolean {
    const chars = this.getAllCharacters();
    const filtered = chars.filter(c => c.id !== id);
    if (filtered.length !== chars.length) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
      return true;
    }
    return false;
  }

  exportCharacter(id: string): string | null {
    const char = this.getCharacter(id);
    if (!char) return null;
    return JSON.stringify(char, null, 2);
  }

  importCharacter(jsonString: string): Character {
    try {
      const parsed = JSON.parse(jsonString);
      
      // Ensure basic structure exists
      const merged = createCharacter(parsed);
      
      // Give it a new ID so it doesn't overwrite existing if imported multiple times
      merged.id = crypto.randomUUID();
      merged.createdAt = new Date().toISOString();
      merged.updatedAt = merged.createdAt;
      
      this.saveCharacter(merged);
      return merged;
    } catch (e) {
      throw new Error('Invalid character JSON format');
    }
  }
}
