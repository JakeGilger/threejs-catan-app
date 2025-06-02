import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { MenuViewComponent } from './views/menu-view/menu-view.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

let COMPONENTS: any[] = [
  MenuViewComponent
]

// TODO: Add lazy loading and break forms into own module.
@NgModule({
  declarations: [
    AppComponent,
    ...COMPONENTS
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    BrowserAnimationsModule
  ],
  exports: [
    FormsModule,
    ReactiveFormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
