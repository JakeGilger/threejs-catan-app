import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap, Params, Router } from '@angular/router';
import { Subject, take, takeUntil } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { GameStateService } from 'src/app/catan/services/game-state/game-state.service';
import { PlayerMetadata } from 'src/app/catan/interfaces/player-metadata';

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
  private ngUnsub: Subject<void> = new Subject();

  numPlayerSlots: number = 6;

  lobbyId: string | null = '';
  players: PlayerMetadata[] = [];
  
  protected gameState = inject(GameStateService);
  private activatedRoute = inject(ActivatedRoute);
  private router = inject(Router);
  
  ngOnInit() {
    this.activatedRoute.paramMap
    .subscribe((params: ParamMap) => {
      this.lobbyId = params.get("id");
    });
    this.players = this.gameState.getDefaultPlayers();
  }
  
  
  ngOnDestroy() {
    this.ngUnsub.next();
    this.ngUnsub.complete();
  }
  
  setNumPlayers(numPlayers: number) {
    this.numPlayerSlots = numPlayers;
    let defaultPlayers = this.gameState.getDefaultPlayers();
    if(numPlayers > 0 && numPlayers <= defaultPlayers.length) {
      this.players = defaultPlayers.slice(0,numPlayers);
    }
  }
  
  startGame() {
    this.gameState.setPlayers(this.players);
    this.router.navigate(["game", this.lobbyId]);
  }
}
