import { Injectable, signal, WritableSignal } from "@angular/core";
import { MaterialColors } from "../../constants/MaterialColors";

import { PlayerMetadata } from "../../interfaces/player-metadata";
import { StructureMetadata } from "../../interfaces/structure-metadata.interface";

@Injectable({
  providedIn: 'root'
})
export class GameStateService {
  public players: WritableSignal<PlayerMetadata[]> = signal<PlayerMetadata[]>([]);
  private structures: Set<StructureMetadata>;

  constructor() {
    // Sets default players to be those in a standard game of Catan.
    this.players.set(this.getDefaultPlayers());
    this.structures = new Set();
  }

  setPlayers(players: PlayerMetadata[]) {
    this.players.set(players);
  }

  getDefaultPlayers(): PlayerMetadata[] {
    return MaterialColors.getPlayerColorStrings(MaterialColors.DEFAULT_PLAYER_COLORS)
      .map((color: string, index: number) => {
      return {id: index, color: color, structures: new Set()};
    });
  }

  addStructure(structure: StructureMetadata, player: PlayerMetadata) {
    structure.ownerId = player.id;
    player.structures.add(structure);
    this.structures.add(structure);
  }
}
