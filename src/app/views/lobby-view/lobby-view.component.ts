import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { take } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { GameStateService } from 'src/app/catan/services/game-state/game-state.service';

@Component({
  selector: 'ctn-lobby-view',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule
  ],
  templateUrl: './lobby-view.component.html',
  styleUrls: ['./lobby-view.component.scss']
})
export class LobbyViewComponent implements OnInit {

    lobbyId: string = '';

    protected gameState = inject(GameStateService);
    private activatedRoute = inject(ActivatedRoute);
    private router = inject(Router);

    ngOnInit() {
      this.activatedRoute.queryParams.pipe(take(1))
      .subscribe((params: Params) => {
        this.lobbyId = params["id"];
      });
      this.setNumPlayers(4);
    }

    setNumPlayers(numPlayers: number) {
    if (numPlayers > 0 && numPlayers <= 6) {
      let defaults = this.gameState.getDefaultPlayers();
      this.gameState.setPlayers(defaults.slice(0, numPlayers));
    } else {
      console.log("Invalid player count.");
    }
  }

  startGame() {
    this.router.navigate(["game"], {queryParams: { id: this.lobbyId }});
  }
}
