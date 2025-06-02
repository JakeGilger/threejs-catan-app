import { MathConstants } from './MathConstants';

export class ScaleConstants {
    static readonly BASE_SCALE: number = 1;

    static readonly INTERSECTION_PLANE_LIMIT = ScaleConstants.BASE_SCALE * 5000;
    // Defines the distance between the center of two adjacent hexes
    static readonly DISTANCE_BASELINE = ScaleConstants.BASE_SCALE * 12.8;
    static readonly DISTANCE_CENTER_TO_EDGE = ScaleConstants.DISTANCE_BASELINE / 2;
    // The Y distance offset between two hex rows
    static readonly DISTANCE_OFFSET_TILE = ScaleConstants.BASE_SCALE * (ScaleConstants.DISTANCE_BASELINE / 2) * MathConstants.SQRT_3;
    // The distance offset to reach an offset corner from the center of the hex (for example, UPPER_LEFT)
    static readonly DISTANCE_OFFSET_CORNER = ScaleConstants.BASE_SCALE * (ScaleConstants.DISTANCE_BASELINE / 2) / MathConstants.SQRT_3;

    static readonly TOKEN_TEXT_SCALE: number = ScaleConstants.BASE_SCALE * 0.2;
    static readonly TOKEN_PIP_DISTANCE: number = ScaleConstants.BASE_SCALE * 0.55;
    static readonly HEX_CORNER_RADIUS: number = ScaleConstants.BASE_SCALE * 7;
    static readonly HEX_HEIGHT: number = ScaleConstants.BASE_SCALE * 0.55;

    static readonly SHEEP_BOUNCE_HEIGHT: number = 0.5;
    static readonly SHEEP_BOUNCE_PERIOD: number = 0.005;
}
