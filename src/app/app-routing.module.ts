import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CatanViewComponent } from './views/catan-view/catan-view.component';

const routes: Routes = [
  {
    path: 'catan',
    component: CatanViewComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
