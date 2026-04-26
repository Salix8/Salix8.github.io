import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { StorageService } from '../../services/storage.service';
import { ToastService } from '../../services/toast.service';
import { Character } from '../../models/character.model';
import { calcAC } from '../../utils/dnd-math';

@Component({
  selector: 'app-character-list',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './character-list.html',
  styleUrls: ['./character-list.scss']
})
export class CharacterList implements OnInit {
  characters: Character[] = [];

  constructor(
    private storage: StorageService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.loadCharacters();
  }

  loadCharacters() {
    this.characters = this.storage.getAllCharacters()
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  getSubtitle(char: Character): string {
    const raceClass = [char.race, char.class].filter(Boolean).join(' ');
    return raceClass ? `Level ${char.level} ${raceClass}` : `Level ${char.level}`;
  }

  getAC(char: Character): number {
    return calcAC(char);
  }

  deleteCharacter(id: string) {
    if (confirm('Are you sure you want to delete this character?')) {
      if (this.storage.deleteCharacter(id)) {
        this.toast.show('Character deleted.', 'success');
        this.loadCharacters();
      }
    }
  }

  exportAll() {
    if (this.characters.length === 0) return;
    
    const jsonStr = JSON.stringify(this.characters, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().split('T')[0];
    a.download = `dnd_characters_backup_${date}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  importFile(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const parsed = JSON.parse(json);
        
        if (Array.isArray(parsed)) {
          let imported = 0;
          parsed.forEach(c => {
            if (c.id && c.name) {
              this.storage.importCharacter(JSON.stringify(c));
              imported++;
            }
          });
          this.toast.show(`Imported ${imported} characters successfully!`, 'success');
        } else {
          this.storage.importCharacter(json);
          this.toast.show(`Character "${parsed.name}" imported successfully!`, 'success');
        }
        
        this.loadCharacters();
      } catch (err) {
        this.toast.show('Failed to parse file. Make sure it is a valid D&D JSON backup.', 'error');
        console.error(err);
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  }
}
