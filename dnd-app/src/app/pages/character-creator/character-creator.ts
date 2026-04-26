import { Component, OnInit, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { CharacterService } from '../../services/character.service';
import { StorageService } from '../../services/storage.service';
import { ThemeService } from '../../services/theme.service';
import { ToastService } from '../../services/toast.service';
import { CharHeader } from '../../components/char-header/char-header';
import { AbilitiesRow } from '../../components/abilities-row/abilities-row';
import { CombatStats } from '../../components/combat-stats/combat-stats';
import { SkillsSection } from '../../components/skills-section/skills-section';
import { CompetenciesSection } from '../../components/competencies-section/competencies-section';
import { TabbedPanel } from '../../components/tabbed-panel/tabbed-panel';
import { SecondaryStats } from '../../components/secondary-stats/secondary-stats';
import { UnitConverter } from '../../components/unit-converter/unit-converter';
import { SettingsPanel } from './settings-dialogs';
import { createCharacter } from '../../models/character.model';

@Component({
  selector: 'app-character-creator',
  standalone: true,
  imports: [
    CommonModule, RouterModule, MatIconModule, MatButtonModule, MatDialogModule,
    CharHeader, AbilitiesRow, CombatStats, SkillsSection, CompetenciesSection,
    TabbedPanel, SecondaryStats, UnitConverter, SettingsPanel
  ],
  templateUrl: './character-creator.html',
  styleUrls: ['./character-creator.scss']
})
export class CharacterCreator implements OnInit {
  characterService = inject(CharacterService);
  isNew = true;
  settingsOpen = false;
  converterOpen = false;
  settingsPanelOpen = false;

  constructor(
    private route: ActivatedRoute,
    private storageService: StorageService,
    private themeService: ThemeService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        const char = this.storageService.getCharacter(id);
        if (char) {
          this.characterService.loadCharacter(char);
          this.isNew = false;
        } else {
          this.toast.show('Character not found. Creating a new one.', 'error');
          this.characterService.loadCharacter(createCharacter());
        }
      } else {
        this.characterService.loadCharacter(createCharacter());
      }
      
      this.themeService.applyTheme(this.characterService.character().theme);
    });
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: Event) {
    const target = event.target as HTMLElement;
    if (this.settingsOpen && !target.closest('.settings-wrapper')) {
      this.settingsOpen = false;
    }
  }

  toggleSettingsMenu() {
    this.settingsOpen = !this.settingsOpen;
  }

  save() {
    const char = this.characterService.character();
    this.storageService.saveCharacter(char);
    this.toast.show('Character saved successfully!', 'success');
  }

  shortRest() {
    if (confirm('Take a short rest? This will recover Short Rest abilities.')) {
      const char = this.characterService.character();
      const modules = char.modules.map(m => {
        if (m.usesRecharge && (m.usesRecharge === 'Short Rest' || m.usesRecharge === 'short_rest')) {
          return { ...m, usesCurrent: m.usesMax };
        }
        return m;
      });
      this.characterService.updateCharacter({ modules });
      this.toast.show('Short rest complete. Abilities recovered.', 'success');
    }
  }

  longRest() {
    if (confirm('Take a long rest? This will recover HP, half hit dice, and all abilities.')) {
      const char = this.characterService.character();
      
      const hitPoints = { ...char.hitPoints, current: char.hitPoints.max, temporary: 0 };
      const hdSpent = Math.max(0, (char.hitDiceSpent || 0) - Math.max(1, Math.floor(char.level / 2)));
      
      const modules = char.modules.map(m => {
        if (m.usesRecharge && (m.usesRecharge === 'Short Rest' || m.usesRecharge === 'short_rest' ||
            m.usesRecharge === 'Long Rest' || m.usesRecharge === 'long_rest')) {
          return { ...m, usesCurrent: m.usesMax };
        }
        return m;
      });

      this.characterService.updateCharacter({ hitPoints, hitDiceSpent: hdSpent, modules });
      this.toast.show('Long rest complete. Fully recovered!', 'success');
    }
  }

  openSettings() {
    this.settingsPanelOpen = true;
    this.settingsOpen = false; // close the dropdown
  }

  openConverter() {
    this.converterOpen = true;
  }
}
