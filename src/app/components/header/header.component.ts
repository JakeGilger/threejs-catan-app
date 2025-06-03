import { Component, inject, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { TitleCasePipe } from '@angular/common';
import { ThemeService } from 'src/app/catan/services/theme/theme.service';

@Component({
  selector: 'ctn-header-component',
  standalone: true,
  imports: [
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    TitleCasePipe,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  protected themeService = inject(ThemeService);

  @Input("minimize") minimize: boolean = false;
}
