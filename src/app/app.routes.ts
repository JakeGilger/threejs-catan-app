import { Routes } from '@angular/router';
import { CatanViewComponent } from './views/catan-view/catan-view.component';
import { MenuViewComponent } from './views/menu-view/menu-view.component';
import { LobbyViewComponent } from './views/lobby-view/lobby-view.component';

export const routes: Routes = [
  {
    path: 'game',
    children: [{
      path: ':id',
      component: CatanViewComponent
    }]
  },
  {
    path: 'lobby',
    children: [{
      path: ':id',
      component: LobbyViewComponent
    }]
  },
  {
    path: 'menu',
    component: MenuViewComponent
  },
  { path: '',   redirectTo: '/menu', pathMatch: 'full' }
];
