import { BadRequestException } from '@nestjs/common';

interface UnitDef {
  category: 'length' | 'area' | 'volume' | 'mass' | 'count';
  factorToBase: number; // Factor to convert this unit into the base unit of the category
}

const UNIT_DICTIONARY: Record<string, UnitDef> = {
  // Length (Base: meter)
  meter: { category: 'length', factorToBase: 1 },
  meters: { category: 'length', factorToBase: 1 },
  m: { category: 'length', factorToBase: 1 },
  centimeter: { category: 'length', factorToBase: 0.01 },
  centimeters: { category: 'length', factorToBase: 0.01 },
  cm: { category: 'length', factorToBase: 0.01 },
  millimeter: { category: 'length', factorToBase: 0.001 },
  millimeters: { category: 'length', factorToBase: 0.001 },
  mm: { category: 'length', factorToBase: 0.001 },
  foot: { category: 'length', factorToBase: 0.3048 },
  feet: { category: 'length', factorToBase: 0.3048 },
  ft: { category: 'length', factorToBase: 0.3048 },
  inch: { category: 'length', factorToBase: 0.0254 },
  inches: { category: 'length', factorToBase: 0.0254 },
  in: { category: 'length', factorToBase: 0.0254 },

  // Area (Base: square meter)
  sqm: { category: 'area', factorToBase: 1 },
  m2: { category: 'area', factorToBase: 1 },
  'square meter': { category: 'area', factorToBase: 1 },
  'square meters': { category: 'area', factorToBase: 1 },
  sqft: { category: 'area', factorToBase: 0.092903 },
  ft2: { category: 'area', factorToBase: 0.092903 },
  'square feet': { category: 'area', factorToBase: 0.092903 },

  // Volume (Base: liter)
  liter: { category: 'volume', factorToBase: 1 },
  liters: { category: 'volume', factorToBase: 1 },
  l: { category: 'volume', factorToBase: 1 },
  milliliter: { category: 'volume', factorToBase: 0.001 },
  milliliters: { category: 'volume', factorToBase: 0.001 },
  ml: { category: 'volume', factorToBase: 0.001 },

  // Mass (Base: kilogram)
  kilogram: { category: 'mass', factorToBase: 1 },
  kilograms: { category: 'mass', factorToBase: 1 },
  kg: { category: 'mass', factorToBase: 1 },
  gram: { category: 'mass', factorToBase: 0.001 },
  grams: { category: 'mass', factorToBase: 0.001 },
  g: { category: 'mass', factorToBase: 0.001 },

  // Count (Base: piece)
  piece: { category: 'count', factorToBase: 1 },
  pieces: { category: 'count', factorToBase: 1 },
  pc: { category: 'count', factorToBase: 1 },
  pcs: { category: 'count', factorToBase: 1 },
  unit: { category: 'count', factorToBase: 1 },
  units: { category: 'count', factorToBase: 1 },
  sheet: { category: 'count', factorToBase: 1 },
  sheets: { category: 'count', factorToBase: 1 },
  set: { category: 'count', factorToBase: 1 },
  sets: { category: 'count', factorToBase: 1 },
  pair: { category: 'count', factorToBase: 1 },
  pairs: { category: 'count', factorToBase: 1 },
  box: { category: 'count', factorToBase: 1 },
  boxes: { category: 'count', factorToBase: 1 },
  dozen: { category: 'count', factorToBase: 12 },
};

/**
 * Converts a quantity from an input unit to the target raw material unit of measurement.
 * E.g., converting 400 centimeters into meters => 4.0 meters.
 */
export function convertUnitQuantity(
  quantity: number,
  fromUnit: string | null | undefined,
  targetUnit: string,
): number {
  if (!fromUnit || fromUnit.trim() === '') {
    return quantity;
  }

  const normalizedFrom = fromUnit.trim().toLowerCase();
  const normalizedTarget = targetUnit.trim().toLowerCase();

  if (normalizedFrom === normalizedTarget) {
    return quantity;
  }

  const fromDef = UNIT_DICTIONARY[normalizedFrom];
  const targetDef = UNIT_DICTIONARY[normalizedTarget];

  if (!fromDef || !targetDef) {
    // If not in standard dictionary, allow if equal, else warn or assume 1:1 if units aren't defined
    if (normalizedFrom === normalizedTarget) {
      return quantity;
    }
    throw new BadRequestException(
      `Cannot convert custom unit "${fromUnit}" to raw material unit "${targetUnit}". Please supply quantity directly in "${targetUnit}".`,
    );
  }

  if (fromDef.category !== targetDef.category) {
    throw new BadRequestException(
      `Incompatible measurement units: cannot convert "${fromUnit}" (${fromDef.category}) to "${targetUnit}" (${targetDef.category}).`,
    );
  }

  // Calculate: (quantity * fromFactor) / targetFactor
  const quantityInBase = quantity * fromDef.factorToBase;
  const quantityInTarget = quantityInBase / targetDef.factorToBase;

  return Math.round(quantityInTarget * 1000) / 1000;
}
