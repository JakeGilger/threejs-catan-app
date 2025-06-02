import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CatanViewComponent } from './views/catan-view/catan-view.component';
import { MenuViewComponent } from './views/menu-view/menu-view.component';
import { LobbyViewComponent } from './views/lobby-view/lobby-view.component';

const routes: Routes = [
  {
    path: 'game',
    component: CatanViewComponent
  },
  {
    path: 'lobby',
    component: LobbyViewComponent
  },
  {
    path: 'menu',
    component: MenuViewComponent
  },
  { path: '',   redirectTo: '/menu', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
