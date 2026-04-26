import { Routes } from '@angular/router';

import { DndHub } from './pages/dnd-hub/dnd-hub';
import { CharacterList } from './pages/character-list/character-list';
import { CharacterCreator } from './pages/character-creator/character-creator';

export const routes: Routes = [
  { path: '', component: DndHub },
  { path: 'characters', component: CharacterList },
  { path: 'creator', component: CharacterCreator },
  { path: 'creator/:id', component: CharacterCreator },
];
