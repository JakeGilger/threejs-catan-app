import { Injectable } from "@angular/core";
import { MaterialColors } from "../../constants/MaterialColors";

import { HexMetadata } from "../../interfaces/hex-metadata.interface";
import { PlayerMetadata } from "../../interfaces/player-metadata";
import { StructureMetadata } from "../../interfaces/structure-metadata.interface";

@Injectable({
  providedIn: 'root'
})
export class GameStateService {
  private structures: Set<StructureMetadata>;
  players: PlayerMetadata[];

  constructor() {
    // Sets default players to be those in a standard game of Catan.
    this.players = this.getDefaultPlayers();
    this.structures = new Set();
  }

  setPlayers(players: PlayerMetadata[]) {
    this.players = players;
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
