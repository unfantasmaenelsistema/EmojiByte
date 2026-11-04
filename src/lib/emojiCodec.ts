/**
 * Motor de Codificación Biyectiva Base256 con Emojis, Checksum CRC-8,
 * Camuflaje Esteganográfico y Visualización Criptográfica de Hashes.
 * Desarrollado para despliegue estático 100% cliente (GitHub Pages).
 */

export type DictionaryId = 'standard' | 'nature' | 'artifacts';

export interface DictionaryMeta {
  id: DictionaryId;
  name: string;
  shortName: string;
  description: string;
  useCase: string;
  emojis: string[];
  reverseMap: Map<string, number>;
}

/**
 * Genera una lista determinista de 256 emojis de punto de código único (sin ZWJ)
 * a partir de bloques Unicode seguros y ampliamente soportados en todas las plataformas.
 */
function buildVerified256Palette(seedRanges: Array<[number, number]>): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  // Puntos de código que no son emojis visuales claros o son modificadores de tono de piel
  const excluded = new Set<number>([
    0x1f3fb, 0x1f3fc, 0x1f3fd, 0x1f3fe, 0x1f3ff, // Modificadores Fitzpatrick
    0x1f549, 0x1f54a, 0x1f54b, 0x1f54c, 0x1f54d, 0x1f54e, 0x1f54f,
    0x1f6d0, 0x1f6d3, 0x1f6d4, 0x1f6d5, 0x1f6d6, 0x1f6d7,
  ]);

  for (const [start, end] of seedRanges) {
    for (let cp = start; cp <= end; cp++) {
      if (excluded.has(cp)) continue;
      const ch = String.fromCodePoint(cp);
      if (!seen.has(ch)) {
        seen.add(ch);
        result.push(ch);
        if (result.length === 256) return result;
      }
    }
  }

  // Relleno de seguridad si algún rango quedó corto
  for (let cp = 0x1f600; cp <= 0x1f64f && result.length < 256; cp++) {
    const ch = String.fromCodePoint(cp);
    if (!seen.has(ch)) {
      seen.add(ch);
      result.push(ch);
    }
  }
  return result.slice(0, 256);
}

// 1. Estándar Expresivo: Caras (1F600-1F64F), Gestos, Comida y Símbolos Vivos
const STANDARD_EMOJIS = buildVerified256Palette([
  [0x1f600, 0x1f64f], // 80 Emoticonos faciales clásicos
  [0x1f910, 0x1f92f], // 32 Caras suplementarias (🤔, 🤯, 🤠, 🥳...)
  [0x1f970, 0x1f976], // 7 Caras adicionales (🥰, 🥵, 🥶...)
  [0x1f440, 0x1f450], // 17 Ojos, manos y gestos
  [0x1f525, 0x1f52e], // 10 Fuego, linterna, bola de cristal, telescopio...
  [0x1f345, 0x1f37f], // 59 Frutas, comida y bebidas (🍅, 🍕, 🍔, 🍿...)
  [0x1f380, 0x1f393], // 20 Celebración (🎀, 🎁, 🎃, 🎄, 🎈, 🎓...)
  [0x1f680, 0x1f6a3], // 36 Transporte (🚀, 🚁, 🚂, ⛵...)
]);

// 2. Fauna, Flora y Clima: Animales, Plantas, Fenómenos Naturales y Cosmos
const NATURE_EMOJIS = buildVerified256Palette([
  [0x1f400, 0x1f43f], // 64 Animales clásicos (🐀, 🐉, 🐋, 🦊, 🐼...)
  [0x1f980, 0x1f9ae], // 47 Animales suplementarios (🦀, 🦁, 🦂, 🦄, 🦅, 🦉, 🦋...)
  [0x1f330, 0x1f344], // 21 Plantas, flores y setas (🌰, 🌱, 🌲, 🌵, 🌷, 🍄...)
  [0x1f300, 0x1f320], // 33 Clima, océano, fases lunares y cosmos (🌀, 🌈, 🌊, 🌋, 🌌, 🌙, 🌟...)
  [0x1f345, 0x1f360], // 28 Frutas y vegetales naturales
  [0x1f361, 0x1f37f], // 31 Dulces y bebidas para completar escenas
  [0x1f600, 0x1f630], // Relleno expresivo
]);

// 3. Artefactos, Cripto y Tecnología: Herramientas, Vehículos, Relojes y Símbolos
const ARTIFACTS_EMOJIS = buildVerified256Palette([
  [0x1f500, 0x1f53d], // 62 Símbolos técnicos, baterías, llaves, candados, fuego, cristales y geometría
  [0x1f4a0, 0x1f4ff], // 96 Bombilla, explosión, dinero, gráficas, discos, ordenadores, cámaras, satélites
  [0x1f680, 0x1f6c5], // 70 Cohetes, trenes, barcos, señales y controles
  [0x1f3a0, 0x1f3c4], // 37 Música, cine, videojuegos, dados, diana y trofeos
]);

function createDict(
  id: DictionaryId,
  name: string,
  shortName: string,
  description: string,
  useCase: string,
  emojis: string[]
): DictionaryMeta {
  const reverseMap = new Map<string, number>();
  emojis.forEach((em, idx) => {
    reverseMap.set(em, idx);
  });
  return { id, name, shortName, description, useCase, emojis, reverseMap };
}

export const DICTIONARIES: Record<DictionaryId, DictionaryMeta> = {
  standard: createDict(
    'standard',
    'Base256 Expresivo (Caras y Símbolos)',
    'Expresivo',
    'Alfabeto clásico de 256 emoticonos faciales, comida y transporte con máxima diferenciación visual.',
    'Ideal para codificación general, chats cotidianos y huellas visuales fáciles de recordar.',
    STANDARD_EMOJIS
  ),
  nature: createDict(
    'nature',
    'Base256 Orgánico (Fauna, Flora y Cosmos)',
    'Naturaleza',
    'Compuesto por 256 animales, plantas, fases lunares y elementos meteorológicos.',
    'Óptimo para esteganografía en publicaciones sobre viajes, naturaleza, gastronomía o estilo de vida.',
    NATURE_EMOJIS
  ),
  artifacts: createDict(
    'artifacts',
    'Base256 Técnico (Artefactos y Cripto)',
    'Artefactos',
    'Selección de 256 iconos de hardware, candados, llaves, satélites, discos y geometría.',
    'Diseñado para representar hashes SHA-256, firmas digitales, claves públicas y objetos binarios.',
    ARTIFACTS_EMOJIS
  ),
};

/**
 * Calcula un byte de suma de verificación CRC-8 (Polinomio 0x07: x^8 + x^2 + x + 1)
 * para detectar cualquier alteración o pérdida de emoticonos en tránsito.
 */
export function computeCRC8(bytes: Uint8Array): number {
  let crc = 0x00;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x80) !== 0) {
        crc = ((crc << 1) ^ 0x07) & 0xff;
      } else {
        crc = (crc << 1) & 0xff;
      }
    }
  }
  return crc;
}

/**
 * Cifrado simétrico ligero por flujo (Keystream derivado de frase de paso con FNV-1a + xorshift32)
 * para ofuscar los bytes antes de la codificación Base256 cuando se proporciona una clave.
 * Es completamente simétrico (XOR): aplicar la misma función cifra y descifra.
 */
export function applyKeystreamCipher(bytes: Uint8Array, passphrase: string): Uint8Array {
  if (!passphrase) return bytes;
  const passBytes = new TextEncoder().encode(passphrase);

  // Semilla dual de 32 bits mediante FNV-1a
  let h1 = 0x811c9dc5;
  let h2 = 0x1000193;
  for (let i = 0; i < passBytes.length; i++) {
    h1 ^= passBytes[i];
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 ^= passBytes[i] ^ (i * 0x9e3779b9);
    h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
  }
  if (h1 === 0) h1 = 0xdeadbeef;
  if (h2 === 0) h2 = 0x41c64e6d;

  const out = new Uint8Array(bytes.length);
  let state = (h1 ^ h2) >>> 0;
  for (let i = 0; i < bytes.length; i++) {
    // xorshift32 + mezcla posicional
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state = state >>> 0;
    const keyByte = ((state & 0xff) ^ ((state >>> 8) & 0xff) ^ (i & 0xff)) & 0xff;
    out[i] = bytes[i] ^ keyByte;
  }
  return out;
}

export interface ByteEmojiStep {
  index: number;
  rawByte: number; // Valor original antes de cifrar
  processedByte: number; // Valor tras cifrado (o igual a rawByte)
  hex: string;
  binary: string;
  asciiChar: string;
  emoji: string;
  codePointHex: string;
  isChecksum?: boolean;
}

export interface EncodeOptions {
  dictionaryId: DictionaryId;
  includeCRC8: boolean;
  passphrase?: string;
  spacing?: 'none' | 'space' | 'blocks4';
}

export interface EncodeResult {
  emojiString: string;
  rawBytes: Uint8Array;
  finalBytes: Uint8Array;
  steps: ByteEmojiStep[];
  crc8Byte: number | null;
  shannonEntropy: number;
  twitterWeightedLength: number;
}

/**
 * Calcula la entropía de Shannon (0.0 a 8.0 bits por byte) de un bloque de datos.
 */
export function calculateShannonEntropy(bytes: Uint8Array): number {
  if (bytes.length === 0) return 0;
  const counts = new Uint32Array(256);
  for (let i = 0; i < bytes.length; i++) {
    counts[bytes[i]]++;
  }
  let entropy = 0;
  const len = bytes.length;
  for (let i = 0; i < 256; i++) {
    if (counts[i] > 0) {
      const p = counts[i] / len;
      entropy -= p * Math.log2(p);
    }
  }
  return entropy;
}

/**
 * Representación legible de un byte en ASCII o etiqueta de control.
 */
export function formatByteAscii(b: number): string {
  if (b === 0x20) return 'SPC';
  if (b === 0x0a) return '\\n';
  if (b === 0x0d) return '\\r';
  if (b === 0x09) return '\\t';
  if (b >= 33 && b <= 126) return String.fromCharCode(b);
  return '·';
}

/**
 * Codifica cualquier Uint8Array a una secuencia de emojis Base256 con trazabilidad educativa completa.
 */
export function encodeBytesToEmojis(rawBytes: Uint8Array, options: EncodeOptions): EncodeResult {
  const dict = DICTIONARIES[options.dictionaryId];
  const cipheredBytes = options.passphrase
    ? applyKeystreamCipher(rawBytes, options.passphrase)
    : rawBytes;

  let crc8Byte: number | null = null;
  let finalBytes = cipheredBytes;

  if (options.includeCRC8 && rawBytes.length > 0) {
    crc8Byte = computeCRC8(cipheredBytes);
    finalBytes = new Uint8Array(cipheredBytes.length + 1);
    finalBytes.set(cipheredBytes, 0);
    finalBytes[cipheredBytes.length] = crc8Byte;
  }

  const steps: ByteEmojiStep[] = [];
  const emojiList: string[] = [];

  for (let i = 0; i < finalBytes.length; i++) {
    const isChecksum = options.includeCRC8 && i === finalBytes.length - 1;
    const processedByte = finalBytes[i];
    const rawByte = isChecksum ? processedByte : rawBytes[i];
    const emoji = dict.emojis[processedByte];
    const cp = emoji.codePointAt(0) || 0;

    steps.push({
      index: i,
      rawByte,
      processedByte,
      hex: processedByte.toString(16).toUpperCase().padStart(2, '0'),
      binary: processedByte.toString(2).padStart(8, '0'),
      asciiChar: isChecksum ? 'CRC8' : formatByteAscii(rawByte),
      emoji,
      codePointHex: 'U+' + cp.toString(16).toUpperCase(),
      isChecksum,
    });
    emojiList.push(emoji);
  }

  let emojiString = '';
  if (options.spacing === 'space') {
    emojiString = emojiList.join(' ');
  } else if (options.spacing === 'blocks4') {
    const chunks: string[] = [];
    for (let i = 0; i < emojiList.length; i += 4) {
      chunks.push(emojiList.slice(i, i + 4).join(''));
    }
    emojiString = chunks.join(' ');
  } else {
    emojiString = emojiList.join('');
  }

  // En X/Twitter cada emoji cuenta con peso 2
  const twitterWeightedLength =
    emojiList.length * 2 + (emojiString.length - emojiList.join('').length);

  return {
    emojiString,
    rawBytes,
    finalBytes,
    steps,
    crc8Byte,
    shannonEntropy: calculateShannonEntropy(finalBytes),
    twitterWeightedLength,
  };
}

export interface DecodeResult {
  success: boolean;
  decodedBytes: Uint8Array;
  decodedText: string;
  hexString: string;
  extractedEmojis: string[];
  ignoredCharsCount: number;
  detectedDictionaryId: DictionaryId;
  crcStatus: 'not_used' | 'valid' | 'invalid' | 'empty';
  expectedCrcHex?: string;
  receivedCrcHex?: string;
  steps: ByteEmojiStep[];
}

/**
 * Detecta automáticamente qué diccionario contiene la mayor proporción de emojis presentes en el texto.
 */
export function detectBestDictionary(
  input: string,
  preferredId: DictionaryId
): DictionaryId {
  const chars = Array.from(input);
  const scores: Record<DictionaryId, number> = {
    standard: 0,
    nature: 0,
    artifacts: 0,
  };

  for (const ch of chars) {
    if (DICTIONARIES.standard.reverseMap.has(ch)) scores.standard++;
    if (DICTIONARIES.nature.reverseMap.has(ch)) scores.nature++;
    if (DICTIONARIES.artifacts.reverseMap.has(ch)) scores.artifacts++;
  }

  const maxScore = Math.max(scores.standard, scores.nature, scores.artifacts);
  if (maxScore === 0 || scores[preferredId] === maxScore) {
    return preferredId;
  }
  if (scores.standard === maxScore) return 'standard';
  if (scores.nature === maxScore) return 'nature';
  return 'artifacts';
}

/**
 * Decodifica una cadena que contiene emoticonos (incluso mezclados con texto de camuflaje)
 * de vuelta a su objeto Uint8Array y cadena UTF-8.
 */
export function decodeEmojisToBytes(
  input: string,
  options: EncodeOptions & { autoDetectDictionary?: boolean }
): DecodeResult {
  const activeDictId = options.autoDetectDictionary
    ? detectBestDictionary(input, options.dictionaryId)
    : options.dictionaryId;
  const dict = DICTIONARIES[activeDictId];

  const chars = Array.from(input);
  const extractedEmojis: string[] = [];
  const rawIndexBytes: number[] = [];
  let ignoredCharsCount = 0;

  for (const ch of chars) {
    const byteVal = dict.reverseMap.get(ch);
    if (byteVal !== undefined) {
      extractedEmojis.push(ch);
      rawIndexBytes.push(byteVal);
    } else if (ch.trim().length > 0) {
      ignoredCharsCount++;
    }
  }

  if (rawIndexBytes.length === 0) {
    return {
      success: false,
      decodedBytes: new Uint8Array(0),
      decodedText: '',
      hexString: '',
      extractedEmojis: [],
      ignoredCharsCount,
      detectedDictionaryId: activeDictId,
      crcStatus: 'empty',
      steps: [],
    };
  }

  let payloadBytes = new Uint8Array(rawIndexBytes);
  let crcStatus: DecodeResult['crcStatus'] = 'not_used';
  let expectedCrcHex: string | undefined;
  let receivedCrcHex: string | undefined;

  if (options.includeCRC8) {
    if (payloadBytes.length < 2) {
      crcStatus = 'invalid';
    } else {
      const receivedCrc = payloadBytes[payloadBytes.length - 1];
      const dataPart = payloadBytes.slice(0, payloadBytes.length - 1);
      const computedCrc = computeCRC8(dataPart);
      expectedCrcHex = computedCrc.toString(16).toUpperCase().padStart(2, '0');
      receivedCrcHex = receivedCrc.toString(16).toUpperCase().padStart(2, '0');
      crcStatus = receivedCrc === computedCrc ? 'valid' : 'invalid';
      payloadBytes = dataPart;
    }
  }

  const decipheredBytes = options.passphrase
    ? applyKeystreamCipher(payloadBytes, options.passphrase)
    : payloadBytes;

  const steps: ByteEmojiStep[] = [];
  for (let i = 0; i < rawIndexBytes.length; i++) {
    const isChecksum = options.includeCRC8 && i === rawIndexBytes.length - 1;
    const processedByte = rawIndexBytes[i];
    const rawByte = isChecksum ? processedByte : decipheredBytes[i];
    const emoji = extractedEmojis[i];
    const cp = emoji.codePointAt(0) || 0;

    steps.push({
      index: i,
      rawByte,
      processedByte,
      hex: processedByte.toString(16).toUpperCase().padStart(2, '0'),
      binary: processedByte.toString(2).padStart(8, '0'),
      asciiChar: isChecksum ? 'CRC8' : formatByteAscii(rawByte),
      emoji,
      codePointHex: 'U+' + cp.toString(16).toUpperCase(),
      isChecksum,
    });
  }

  const hexString = Array.from(decipheredBytes)
    .map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
    .join(' ');

  const decodedText = new TextDecoder('utf-8', { fatal: false }).decode(decipheredBytes);

  return {
    success: crcStatus !== 'invalid',
    decodedBytes: decipheredBytes,
    decodedText,
    hexString,
    extractedEmojis,
    ignoredCharsCount,
    detectedDictionaryId: activeDictId,
    crcStatus,
    expectedCrcHex,
    receivedCrcHex,
    steps,
  };
}

/**
 * Convierte una cadena hexadecimal ("48 6F 6C 61" o "0x486f6c61") en Uint8Array.
 */
export function parseHexInput(hexStr: string): { bytes: Uint8Array; valid: boolean } {
  const cleaned = hexStr.replace(/0x/gi, '').replace(/[^0-9a-fA-F]/g, '');
  if (cleaned.length === 0) {
    return { bytes: new Uint8Array(0), valid: true };
  }
  const padded = cleaned.length % 2 !== 0 ? '0' + cleaned : cleaned;
  const out = new Uint8Array(padded.length / 2);
  for (let i = 0; i < padded.length; i += 2) {
    out[i / 2] = parseInt(padded.slice(i, i + 2), 16);
  }
  return { bytes: out, valid: /^[0-9a-fA-F\s,xX:-]*$/.test(hexStr) };
}

/**
 * Plantillas de camuflaje conversacional para ocultar emojis Base256 dentro de texto inocuo.
 */
export interface CamouflageTemplate {
  id: string;
  name: string;
  platform: string;
  generate: (emojis: string[]) => string;
}

export const CAMOUFLAGE_TEMPLATES: CamouflageTemplate[] = [
  {
    id: 'direct',
    name: 'Secuencia Pura (Sin Camuflaje)',
    platform: 'Estándar / Terminal',
    generate: (emojis) => emojis.join(''),
  },
  {
    id: 'chat_casual',
    name: 'Mensaje Casual de Chat / WhatsApp',
    platform: 'WhatsApp / Telegram',
    generate: (emojis) => {
      if (emojis.length === 0) return '';
      const frases = [
        '¡Hola! Qué día tan increíble por aquí',
        'Además estuvimos viendo todo esto',
        'Luego pasamos por el centro un rato',
        'Y al final terminamos comentando lo de ayer',
        '¡Nos vemos mañana sin falta!',
      ];
      const chunkSize = Math.max(1, Math.ceil(emojis.length / (frases.length - 1)));
      const parts: string[] = [];
      let idx = 0;
      for (let i = 0; i < frases.length - 1 && idx < emojis.length; i++) {
        const slice = emojis.slice(idx, idx + chunkSize).join('');
        parts.push(`${frases[i]} ${slice}.`);
        idx += chunkSize;
      }
      if (idx < emojis.length) {
        parts.push(emojis.slice(idx).join(''));
      }
      parts.push(frases[frases.length - 1]);
      return parts.join(' ');
    },
  },
  {
    id: 'twitter_post',
    name: 'Hilo / Post en X (Twitter)',
    platform: 'X / Bluesky / Mastodon',
    generate: (emojis) => {
      if (emojis.length === 0) return '';
      const mid = Math.ceil(emojis.length / 2);
      const firstHalf = emojis.slice(0, mid).join('');
      const secondHalf = emojis.slice(mid).join('');
      return `Resumen visual de la semana en el estudio ${firstHalf} ✨\n\nPróximos objetivos para el proyecto ${secondHalf} #dev #tech`;
    },
  },
  {
    id: 'fingerprint_grid',
    name: 'Matriz Criptográfica (Bloques 4×4)',
    platform: 'Verificación de Claves / Hashes',
    generate: (emojis) => {
      if (emojis.length === 0) return '';
      const rows: string[] = [];
      for (let i = 0; i < emojis.length; i += 8) {
        const left = emojis.slice(i, i + 4).join(' ');
        const right = emojis.slice(i + 4, i + 8).join(' ');
        rows.push(right ? `${left}   ${right}` : left);
      }
      return rows.join('\n');
    },
  },
];

/**
 * Calcula un hash criptográfico real usando Web Crypto API (SHA-1, SHA-256, SHA-384, SHA-512).
 */
export type HashAlgorithm = 'SHA-256' | 'SHA-512' | 'SHA-384' | 'SHA-1';

export async function computeCryptoHash(
  inputBytes: Uint8Array,
  algorithm: HashAlgorithm
): Promise<Uint8Array> {
  const buffer = await crypto.subtle.digest(algorithm, inputBytes);
  return new Uint8Array(buffer);
}

/**
 * Calcula la distancia de Hamming en bits entre dos arrays de bytes de igual longitud
 * (ideal para demostrar el Efecto Avalancha en hashes).
 */
export function computeBitHammingDistance(a: Uint8Array, b: Uint8Array): {
  differingBits: number;
  totalBits: number;
  percentage: number;
  differingBytes: number;
} {
  const len = Math.min(a.length, b.length);
  let differingBits = 0;
  let differingBytes = 0;
  for (let i = 0; i < len; i++) {
    const xor = a[i] ^ b[i];
    if (xor !== 0) differingBytes++;
    let v = xor;
    while (v > 0) {
      differingBits += v & 1;
      v >>= 1;
    }
  }
  const totalBits = len * 8;
  return {
    differingBits,
    totalBits,
    percentage: totalBits > 0 ? (differingBits / totalBits) * 100 : 0,
    differingBytes,
  };
}
