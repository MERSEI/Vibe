import { describe, it, expect } from 'vitest';
import { translations } from '../../src/utils/i18n';

describe('translations', () => {
  it('has English and Russian locales', () => {
    expect(translations).toHaveProperty('en');
    expect(translations).toHaveProperty('ru');
  });

  it('English and Russian have the same keys', () => {
    const enKeys = Object.keys(translations.en).sort();
    const ruKeys = Object.keys(translations.ru).sort();
    expect(enKeys).toEqual(ruKeys);
  });

  it('no empty values in English', () => {
    Object.entries(translations.en).forEach(([key, value]) => {
      expect(value, `Key "${key}" is empty`).toBeTruthy();
    });
  });

  it('no empty values in Russian', () => {
    Object.entries(translations.ru).forEach(([key, value]) => {
      expect(value, `Key "${key}" is empty`).toBeTruthy();
    });
  });

  it('includes critical UI strings', () => {
    const requiredKeys = ['editor', 'agents', 'rag', 'debug'];
    requiredKeys.forEach((key) => {
      expect(translations.en).toHaveProperty(key);
    });
  });
});
