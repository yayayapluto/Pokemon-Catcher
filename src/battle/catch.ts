import {
  CATCH_CHANCE_MAX,
  CATCH_CHANCE_MIN,
  CATCH_FACTOR,
  CATCH_HP_WEIGHT,
  CATCH_RATE_DIVISOR,
  RUN_BASE_CHANCE,
  RUN_CHANCE_MAX,
  RUN_CHANCE_MIN,
  RUN_SPEED_DIVISOR,
} from '../constants.ts';
import { clamp } from '../utils/math.ts';

export function catchChance(wildHp: number, wildMaxHp: number, captureRate: number): number {
  if (wildMaxHp <= 0) {
    throw new RangeError('wildMaxHp harus lebih dari 0');
  }
  const hpFactor = 1 - CATCH_HP_WEIGHT * (wildHp / wildMaxHp);
  const scaled = hpFactor * (captureRate / CATCH_RATE_DIVISOR) * CATCH_FACTOR;
  return clamp(scaled, CATCH_CHANCE_MIN, CATCH_CHANCE_MAX);
}

export function runChance(playerSpeed: number, wildSpeed: number): number {
  const scaled = RUN_BASE_CHANCE + (playerSpeed - wildSpeed) / RUN_SPEED_DIVISOR;
  return clamp(scaled, RUN_CHANCE_MIN, RUN_CHANCE_MAX);
}
