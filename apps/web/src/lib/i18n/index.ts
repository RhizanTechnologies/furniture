import { Language, TranslationDictionary, SUPPORTED_LANGUAGES } from './types';
import { en } from './en';
import { am } from './am';
import { om } from './om';

export * from './types';
export { en, am, om };

export const dictionaries: Record<Language, TranslationDictionary> = {
  en,
  am,
  om,
};

/**
 * Access a nested translation value safely using dot notation, e.g. "common.save" or "orders.title".
 * Returns fallback if not found.
 */
export function translateKey(lang: Language, path: string, fallback?: string): string {
  const dict = dictionaries[lang] || dictionaries.en;
  const parts = path.split('.');

  let current: any = dict;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      current = undefined;
      break;
    }
  }

  if (typeof current === 'string') {
    return current;
  }

  // Fallback to English dictionary if not in current
  if (lang !== 'en') {
    let fallbackCurrent: any = dictionaries.en;
    for (const part of parts) {
      if (fallbackCurrent && typeof fallbackCurrent === 'object' && part in fallbackCurrent) {
        fallbackCurrent = fallbackCurrent[part];
      } else {
        fallbackCurrent = undefined;
        break;
      }
    }
    if (typeof fallbackCurrent === 'string') {
      return fallbackCurrent;
    }
  }

  return fallback || path;
}

/**
 * Helper to translate known standard stage names dynamically in Amharic & Afaan Oromoo
 */
export function getTranslatedStageName(stageName: string, lang: Language): string {
  const lower = stageName.toLowerCase();
  const dict = dictionaries[lang] || dictionaries.en;

  if (lower.includes('deposit') || lower.includes('prepayment') || lower.includes('ቅድመ')) {
    return dict.stages.depositReceived;
  }
  if (lower.includes('wood') || lower.includes('framing') || lower.includes('እንጨት')) {
    return dict.stages.woodworkFraming;
  }
  if (lower.includes('carving') || lower.includes('assembly') || lower.includes('መገጣጠም')) {
    return dict.stages.carvingAssembly;
  }
  if (lower.includes('paint') || lower.includes('varnish') || lower.includes('finishing') || lower.includes('ቀለም')) {
    return dict.stages.paintingPolishing;
  }
  if (lower.includes('upholstery') || lower.includes('cushion') || lower.includes('foam') || lower.includes('ስፖንጅ')) {
    return dict.stages.upholsteryCushioning;
  }
  if (lower.includes('quality') || lower.includes('inspect') || lower.includes('ጥራት')) {
    return dict.stages.qualityCheck;
  }
  if (lower.includes('deliver') || lower.includes('fulfill') || lower.includes('ርክክብ') || lower.includes('ተረክቧል')) {
    return dict.stages.delivered;
  }

  return stageName;
}

/**
 * Helper to translate furniture category labels
 */
export function getTranslatedCategory(category: string, lang: Language): string {
  const lower = category.toLowerCase();
  const dict = dictionaries[lang] || dictionaries.en;

  if (lower.includes('living') || lower.includes('sofa') || lower.includes('ሳሎን')) {
    return dict.showroom.livingRoom;
  }
  if (lower.includes('bed') || lower.includes('መኝታ')) {
    return dict.showroom.bedroom;
  }
  if (lower.includes('dining') || lower.includes('table') || lower.includes('መመገቢያ')) {
    return dict.showroom.dining;
  }
  if (lower.includes('office') || lower.includes('desk') || lower.includes('ቢሮ')) {
    return dict.showroom.office;
  }

  return category;
}
