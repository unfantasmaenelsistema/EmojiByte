import { describe, expect, it } from 'vitest';
import {
  CAMOUFLAGE_TEMPLATES,
  DICTIONARIES,
  DICTIONARY_IDS,
  ENCRYPTION_OVERHEAD,
  computeBitHammingDistance,
  computeCRC8,
  computeCryptoHash,
  decodeEmojisToBytes,
  decryptPayload,
  detectBestDictionary,
  encodeBytesToEmojis,
  encryptPayload,
  parseHexInput,
  toHex,
  twitterWeightedLength,
} from './emojiCodec';

const enc = new TextEncoder();
const dec = new TextDecoder();
const ALL_BYTES = Uint8Array.from({ length: 256 }, (_, i) => i);

describe('alfabetos', () => {
  it.each(DICTIONARY_IDS)('%s: 256 emojis distintos, de un solo punto de código y con presentación emoji', (id) => {
    const { emojis } = DICTIONARIES[id];
    expect(emojis).toHaveLength(256);
    expect(new Set(emojis).size).toBe(256);
    for (const e of emojis) {
      expect(Array.from(e)).toHaveLength(1);
      expect(/\p{Emoji_Presentation}/u.test(e)).toBe(true);
      expect(/\p{Emoji_Modifier}/u.test(e)).toBe(false);
    }
  });

  it('los tres alfabetos son disjuntos', () => {
    const seen = new Map<string, string>();
    for (const id of DICTIONARY_IDS) {
      for (const e of DICTIONARIES[id].emojis) {
        expect(seen.get(e), `${e} repetido en ${id}`).toBeUndefined();
        seen.set(e, id);
      }
    }
    expect(seen.size).toBe(768);
  });

  it('la tabla no cambia sin querer (rompería los mensajes ya codificados)', async () => {
    for (const [id, expected] of [
      ['standard', 'U+1F600', 'U+1F3B5'],
      ['nature', 'U+1F400', 'U+1F9C4'],
      ['artifacts', 'U+1F4A0', 'U+1F559'],
    ] as const) {
      const e = DICTIONARIES[id as keyof typeof DICTIONARIES].emojis;
      expect('U+' + e[0].codePointAt(0)!.toString(16).toUpperCase()).toBe(expected);
    }
    const digest = await computeCryptoHash(
      enc.encode(DICTIONARY_IDS.map((id) => DICTIONARIES[id].emojis.join('')).join('|')),
      'SHA-256'
    );
    expect(toHex(digest, '')).toMatchInlineSnapshot(`"BCE34A87430996EB85260A4C6B7E793E0087F428E92D298AC183D79A7E138F95"`);
  });
});

describe('CRC-8', () => {
  it('vector de comprobación CRC-8/SMBUS: "123456789" → 0xF4', () => {
    expect(computeCRC8(enc.encode('123456789'))).toBe(0xf4);
  });
});

describe('codificar ↔ decodificar', () => {
  it.each(DICTIONARY_IDS)('%s: ida y vuelta de los 256 valores con CRC', (id) => {
    const r = encodeBytesToEmojis(ALL_BYTES, { dictionaryId: id, includeCRC8: true });
    expect(r.emojis).toHaveLength(257);
    const d = decodeEmojisToBytes(r.emojiString, { dictionaryId: 'standard', includeCRC8: true, autoDetectDictionary: true });
    expect(d.detectedDictionaryId).toBe(id);
    expect(d.crcStatus).toBe('valid');
    expect(Array.from(d.payloadBytes)).toEqual(Array.from(ALL_BYTES));
  });

  it('texto UTF-8 con tildes, eñes y símbolos', () => {
    const msg = '40°25′00″N 03°42′12″O · Ñandú';
    const r = encodeBytesToEmojis(enc.encode(msg), { dictionaryId: 'nature', includeCRC8: false });
    const d = decodeEmojisToBytes(r.emojiString, { dictionaryId: 'nature', includeCRC8: false });
    expect(dec.decode(d.payloadBytes)).toBe(msg);
  });

  it.each(CAMOUFLAGE_TEMPLATES.map((t) => t.id))('plantilla %s: el texto de cobertura se ignora', (tplId) => {
    const tpl = CAMOUFLAGE_TEMPLATES.find((t) => t.id === tplId)!;
    const r = encodeBytesToEmojis(enc.encode('Operación a las 23:00h'), { dictionaryId: 'standard', includeCRC8: true });
    const camo = tpl.generate(r.emojis, 'blocks4');
    const d = decodeEmojisToBytes(camo, { dictionaryId: 'artifacts', includeCRC8: true, autoDetectDictionary: true });
    expect(d.crcStatus).toBe('valid');
    expect(dec.decode(d.payloadBytes)).toBe('Operación a las 23:00h');
  });

  it('tolera selectores de variación U+FE0F añadidos por apps de chat y no los cuenta como texto', () => {
    const r = encodeBytesToEmojis(enc.encode('Hola'), { dictionaryId: 'artifacts', includeCRC8: true });
    const withVs = r.emojis.join('️') + '️';
    const d = decodeEmojisToBytes(withVs, { dictionaryId: 'artifacts', includeCRC8: true });
    expect(dec.decode(d.payloadBytes)).toBe('Hola');
    expect(d.ignoredCharsCount).toBe(0);
  });

  it('el CRC-8 detecta un emoji cambiado', () => {
    const r = encodeBytesToEmojis(enc.encode('Mensaje íntegro'), { dictionaryId: 'standard', includeCRC8: true });
    const dict = DICTIONARIES.standard;
    const tampered = [...r.emojis];
    tampered[3] = dict.emojis[(dict.reverseMap.get(tampered[3])! + 1) % 256];
    const d = decodeEmojisToBytes(tampered.join(''), { dictionaryId: 'standard', includeCRC8: true });
    expect(d.crcStatus).toBe('invalid');
  });

  it('la autodetección no se confunde con emojis de otros alfabetos en el texto de cobertura', () => {
    const r = encodeBytesToEmojis(enc.encode('abcdefgh'), { dictionaryId: 'artifacts', includeCRC8: false });
    const camo = `🐶🌵 ${r.emojiString} 😀`;
    expect(detectBestDictionary(camo, 'standard')).toBe('artifacts');
  });
});

describe('AES-256-GCM con PBKDF2', () => {
  it('ida y vuelta con la contraseña correcta y sal/IV distintos en cada cifrado', async () => {
    const plain = enc.encode('Clave WiFi invitados: Fantasma#2026!');
    const a = await encryptPayload(plain, 'correcta horse');
    const b = await encryptPayload(plain, 'correcta horse');
    expect(a.length).toBe(plain.length + ENCRYPTION_OVERHEAD);
    expect(toHex(a)).not.toBe(toHex(b));
    const r = await decryptPayload(a, 'correcta horse');
    expect(r.ok && dec.decode(r.plain)).toBe('Clave WiFi invitados: Fantasma#2026!');
  });

  it('contraseña incorrecta o un bit alterado → falla la autenticación', async () => {
    const packed = await encryptPayload(enc.encode('secreto'), 'uno');
    expect(await decryptPayload(packed, 'dos')).toEqual({ ok: false, reason: 'auth_failed' });
    const flipped = new Uint8Array(packed);
    flipped[30] ^= 0x01;
    expect(await decryptPayload(flipped, 'uno')).toEqual({ ok: false, reason: 'auth_failed' });
    expect(await decryptPayload(packed.slice(0, 20), 'uno')).toEqual({ ok: false, reason: 'too_short' });
  });

  it('cadena completa: cifrar → emojis → camuflaje → decodificar → descifrar', async () => {
    const packed = await encryptPayload(enc.encode('Punto de encuentro: biblioteca'), 'aula-2026');
    const r = encodeBytesToEmojis(packed, { dictionaryId: 'nature', includeCRC8: true, encrypted: true });
    expect(r.steps[0].label).toBe('SAL');
    expect(r.steps[16].label).toBe('IV');
    expect(r.steps[r.steps.length - 2].label).toBe('TAG');
    expect(r.steps[r.steps.length - 1].label).toBe('CRC8');
    const camo = CAMOUFLAGE_TEMPLATES[1].generate(r.emojis);
    const d = decodeEmojisToBytes(camo, { dictionaryId: 'standard', includeCRC8: true, autoDetectDictionary: true, encrypted: true });
    expect(d.crcStatus).toBe('valid');
    const out = await decryptPayload(d.payloadBytes, 'aula-2026');
    expect(out.ok && dec.decode(out.plain)).toBe('Punto de encuentro: biblioteca');
  });
});

describe('utilidades', () => {
  it('parseHexInput acepta formatos habituales y avisa de errores', () => {
    expect(toHex(parseHexInput('48 6F 6C 61').bytes)).toBe('48 6F 6C 61');
    expect(toHex(parseHexInput('0xde,0xad:be-ef').bytes)).toBe('DE AD BE EF');
    expect(parseHexInput('ABC')).toMatchObject({ valid: false, issue: 'odd' });
    expect(toHex(parseHexInput('ABC').bytes)).toBe('AB');
    expect(parseHexInput('48 zz 6F')).toMatchObject({ valid: false, issue: 'chars' });
  });

  it('peso en X: emoji = 2, latín = 1, comillas tipográficas y primas = 1', () => {
    expect(twitterWeightedLength('Hola')).toBe(4);
    expect(twitterWeightedLength('😀🐶')).toBe(4);
    expect(twitterWeightedLength('✨')).toBe(2);
    expect(twitterWeightedLength('40°25′00″N')).toBe(10);
    expect(twitterWeightedLength('❤️')).toBe(2);
  });

  it('SHA-256 real y distancia de Hamming', async () => {
    const h = await computeCryptoHash(enc.encode('abc'), 'SHA-256');
    expect(toHex(h, '').toLowerCase()).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(computeBitHammingDistance(Uint8Array.of(0xff, 0x00), Uint8Array.of(0x0f, 0x00))).toEqual({
      differingBits: 4,
      totalBits: 16,
      percentage: 25,
      differingBytes: 1,
    });
  });
});
