import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { ActionsTab } from '../actions-tab/actions-tab';
import { FeaturesTab } from '../features-tab/features-tab';
import { InventoryTab } from '../inventory-tab/inventory-tab';
import { SpellsTab } from '../spells-tab/spells-tab';
import { NotesTab } from '../notes-tab/notes-tab';

@Component({
  selector: 'app-tabbed-panel',
  standalone: true,
  imports: [CommonModule, MatTabsModule, ActionsTab, FeaturesTab, InventoryTab, SpellsTab, NotesTab],
  templateUrl: './tabbed-panel.html',
  styleUrls: ['./tabbed-panel.scss']
})
export class TabbedPanel {}
