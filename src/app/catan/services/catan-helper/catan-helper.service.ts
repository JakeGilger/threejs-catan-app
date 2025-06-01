import { Injectable } from '@angular/core';
import { HexOffset, HexOffsetsToNumber } from "../../enums/hex-offset.enum";
import { XYPair } from "../../interfaces/xy-pair.interface";
import { MathConstants } from "../../constants/MathConstants";
import { ScaleConstants } from "../../constants/ScaleConstants"

@Injectable()
export class CatanHelperService {

  /* Returns the resource numbers in
   * order of probability. */
  public static getTokenNumbers(): number[] {
    return [
      6, 8, 5, 9, 4, 10, 3, 11, 2, 12
    ]
  }

  public static getNumPips(num: number) {
    return 6 - Math.abs(num - 7);
  }

  public static shuffle(array: any[]) {
    let counter = array.length;

    // While there are elements in the array
    while (counter > 0) {
      // Pick a random index
      let index = Math.floor(Math.random() * counter);
      counter--;

      // And swap the last element with it
      let temp = array[counter];
      array[counter] = array[index];
      array[index] = temp;
    }

    return array;
  }

  // Functions dealing with location coordinates

  public static calculateTilePosition(hexXCoord: number, hexYCoord: number): XYPair {
    let xPosition = (hexXCoord + hexYCoord / 2) * ScaleConstants.DISTANCE_BASELINE;
    // Reverse in order to have increasing y = going forward from the initial camera.
    let yPosition = -1 * hexYCoord * ScaleConstants.DISTANCE_OFFSET_TILE;
    return {x: xPosition, y: yPosition};
  }

  public static getAdjacentTileCoords(cornerXCoord: number, cornerYCoord: number): Map<HexOffset, XYPair> {
    let map = new Map();
    let rightHexXcoord = Math.ceil((cornerXCoord - cornerYCoord) / 2);
    if ((cornerXCoord + cornerYCoord) % 2 === 0) {
      // UPPER_LEFT, UPPER_RIGHT, and BOTTOM
      map.set(HexOffset.UPPER_LEFT, {x: rightHexXcoord - 1, y: cornerYCoord + 1});
      map.set(HexOffset.UPPER_RIGHT, {x: rightHexXcoord, y: cornerYCoord + 1});
      map.set(HexOffset.BOTTOM, {x: rightHexXcoord, y: cornerYCoord});
    } else {
      // LOWER_LEFT, LOWER_RIGHT, and TOP
      map.set(HexOffset.LOWER_LEFT, {x: rightHexXcoord - 1, y: cornerYCoord});
      map.set(HexOffset.LOWER_RIGHT, {x: rightHexXcoord, y: cornerYCoord});
      map.set(HexOffset.TOP, {x: rightHexXcoord - 1, y: cornerYCoord + 1});
    }
    return map;
  }

  public static getCornerCoords(hexXCoord: number, hexYCoord: number, offset: HexOffset): XYPair {
    let baseCoords = {x: hexXCoord * 2 + hexYCoord, y: hexYCoord};
    switch (offset) {
      case HexOffset.TOP:
        break;
      case HexOffset.UPPER_RIGHT:
        baseCoords.x++;
        break;
      case HexOffset.LOWER_RIGHT:
        baseCoords.x++;
        baseCoords.y--;
        break;
      case HexOffset.BOTTOM:
        baseCoords.y--;
        break;
      case HexOffset.LOWER_LEFT:
        baseCoords.x--;
        baseCoords.y--;
        break;
      case HexOffset.UPPER_LEFT:
        baseCoords.x--;
        break;
    }
    return baseCoords;
  }

  public static calculateCornerPosition(hexXCoord: number, hexYCoord: number, offset: HexOffset): XYPair {
    let position = this.calculateTilePosition(hexXCoord, hexYCoord);
    switch (offset) {
      case HexOffset.TOP:
        position.y = position.y - ScaleConstants.DISTANCE_OFFSET_CORNER * 2;
        break;
      case HexOffset.BOTTOM:
        position.y = position.y + ScaleConstants.DISTANCE_OFFSET_CORNER * 2;
        break;
      case HexOffset.UPPER_LEFT:
        position.x = position.x - (ScaleConstants.DISTANCE_BASELINE / 2);
        position.y = position.y - ScaleConstants.DISTANCE_OFFSET_CORNER;
        break;
      case HexOffset.LOWER_LEFT:
        position.x = position.x - (ScaleConstants.DISTANCE_BASELINE / 2);
        position.y = position.y + ScaleConstants.DISTANCE_OFFSET_CORNER;
        break;
      case HexOffset.UPPER_RIGHT:
        position.x = position.x + (ScaleConstants.DISTANCE_BASELINE / 2);
        position.y = position.y - ScaleConstants.DISTANCE_OFFSET_CORNER;
        break;
      case HexOffset.LOWER_RIGHT:
        position.x = position.x + (ScaleConstants.DISTANCE_BASELINE / 2);
        position.y = position.y + ScaleConstants.DISTANCE_OFFSET_CORNER;
        break;
    }
    return position;
  }

  public static calculateCornerPositionFromCoords(cornerXCoord: number, cornerYCoord: number): XYPair {
    let position;
    let adjacentTiles = this.getAdjacentTileCoords(cornerXCoord, cornerYCoord);
    let tile: XYPair;
    if (adjacentTiles.has(HexOffset.TOP)) {
      tile = (adjacentTiles.get(HexOffset.TOP) as XYPair);
      position = this.calculateCornerPosition(tile.x, tile.y, HexOffset.BOTTOM);
    } else {
      tile = (adjacentTiles.get(HexOffset.BOTTOM) as XYPair);
      position = this.calculateCornerPosition(tile.x, tile.y, HexOffset.TOP);
    }
    return position;
  }

  /* cOffset is the Corner offset (offset from the initial hex) and eOffset
   * is the Edge offset (relative to the specified cOffset)
   * For example, to access the left edge of a hex, you may either specify
   * cOffset: LOWER_LEFT, eOffset: TOP or cOffset: UPPER_LEFT, eOffset:BOTTOM */
  public static calculateEdgeLocation(hexXCoord: number, hexYCoord: number,
                               cOffset: HexOffset, eOffset: HexOffset):
  {pos: {x: number, y: number, rot: number}, coords: {x: number, y: number}} {
    let cornerPosition = this.calculateCornerPosition(hexXCoord, hexYCoord, cOffset);
    let coordinates = this.getCornerCoords(hexXCoord, hexYCoord, cOffset);
    let position = Object.assign({rot: 0}, cornerPosition);
    switch (eOffset) {
      case HexOffset.TOP:
        position.y = position.y - ScaleConstants.DISTANCE_OFFSET_CORNER;
        break;
      case HexOffset.BOTTOM:
        position.y = position.y + ScaleConstants.DISTANCE_OFFSET_CORNER;
        break;
      case HexOffset.UPPER_LEFT:
        position.x = position.x - (ScaleConstants.DISTANCE_BASELINE / 4);
        position.y = position.y - ScaleConstants.DISTANCE_OFFSET_CORNER / 2;
        break;
      case HexOffset.LOWER_LEFT:
        position.x = position.x - (ScaleConstants.DISTANCE_BASELINE / 4);
        position.y = position.y + ScaleConstants.DISTANCE_OFFSET_CORNER / 2;
        break;
      case HexOffset.UPPER_RIGHT:
        position.x = position.x + (ScaleConstants.DISTANCE_BASELINE / 4);
        position.y = position.y - ScaleConstants.DISTANCE_OFFSET_CORNER / 2;
        break;
      case HexOffset.LOWER_RIGHT:
        position.x = position.x + (ScaleConstants.DISTANCE_BASELINE / 4);
        position.y = position.y + ScaleConstants.DISTANCE_OFFSET_CORNER / 2;
        break;
    }
    let rotationAmt: number = HexOffsetsToNumber.get(eOffset)!;
    position.rot = MathConstants.NEG_PI_OVER_3 * rotationAmt;
    return {pos: position, coords: coordinates};
  }
}
