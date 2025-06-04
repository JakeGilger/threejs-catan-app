import { Injectable } from "@angular/core";
import { MaterialColors } from "../../constants/MaterialColors";

import { PlayerMetadata } from "../../interfaces/player-metadata";
import { StructureMetadata } from "../../interfaces/structure-metadata.interface";
import { Observable, ReplaySubject, Subject } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class GameStateService {
  private players: Subject<PlayerMetadata[]> = new ReplaySubject<PlayerMetadata[]>(1);
  private structures: Set<StructureMetadata> = new Set<StructureMetadata>();

  constructor() {
    console.log("running service constructor");
    // Sets default players to be those in a standard game of Catan.
    this.players.next(this.getDefaultPlayers());
  }

  getPlayers(): Observable<PlayerMetadata[]> {
    return this.players.asObservable();
  }

  setPlayers(players: PlayerMetadata[]) {
    console.log("setting players to: " + JSON.stringify(players));
    this.players.next(players);
  }

  getDefaultPlayers(): PlayerMetadata[] {
    return MaterialColors.getPlayerColorStrings(MaterialColors.DEFAULT_PLAYER_COLORS)
      .map((color: string, index: number) => {
      return {id: index + 1, color: color, structures: new Set()};
    });
  }

  addStructure(structure: StructureMetadata, player: PlayerMetadata) {
    structure.ownerId = player.id;
    player.structures.add(structure);
    this.structures.add(structure);
  }
}
