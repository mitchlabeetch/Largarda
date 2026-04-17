import { describe, expect, it } from 'vitest';

import i18nConfig from '@/common/config/i18n-config.json';
import { SECTORS } from '@/common/ma/sector';

import enUS from '../../../src/renderer/services/i18n/locales/en-US/ma.json';
import frFR from '../../../src/renderer/services/i18n/locales/fr-FR/ma.json';
import jaJP from '../../../src/renderer/services/i18n/locales/ja-JP/ma.json';
import koKR from '../../../src/renderer/services/i18n/locales/ko-KR/ma.json';
import ruRU from '../../../src/renderer/services/i18n/locales/ru-RU/ma.json';
import trTR from '../../../src/renderer/services/i18n/locales/tr-TR/ma.json';
import ukUA from '../../../src/renderer/services/i18n/locales/uk-UA/ma.json';
import zhCN from '../../../src/renderer/services/i18n/locales/zh-CN/ma.json';
import zhTW from '../../../src/renderer/services/i18n/locales/zh-TW/ma.json';

type MaJson = {
  readonly sectors: Readonly<Record<string, string>>;
};

const LOCALES: ReadonlyArray<readonly [string, MaJson]> = [
  ['fr-FR', frFR],
  ['en-US', enUS],
  ['zh-CN', zhCN],
  ['zh-TW', zhTW],
  ['ja-JP', jaJP],
  ['ko-KR', koKR],
  ['tr-TR', trTR],
  ['ru-RU', ruRU],
  ['uk-UA', ukUA],
];

describe('ma.sectors i18n coverage', () => {
  it('covers every locale declared in the config', () => {
    const covered = LOCALES.map(([lang]) => lang).toSorted();
    expect(covered).toEqual(i18nConfig.supportedLanguages.toSorted());
  });

  for (const [lang, payload] of LOCALES) {
    it(`${lang} has a translation for every catalogue sector id`, () => {
      for (const sector of SECTORS) {
        const label = payload.sectors[sector.id];
        expect(label, `${lang}.sectors.${sector.id}`).toBeTypeOf('string');
        expect(label?.trim().length ?? 0).toBeGreaterThan(0);
      }
    });

    it(`${lang} does not ship stray sector ids beyond the catalogue`, () => {
      const catalogueIds = new Set(SECTORS.map((s) => s.id));
      for (const sectorKey of Object.keys(payload.sectors)) {
        expect(catalogueIds.has(sectorKey), `${lang}.sectors.${sectorKey}`).toBe(true);
      }
    });
  }
});
