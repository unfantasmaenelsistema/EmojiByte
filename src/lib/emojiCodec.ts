/**
 * Motor de codificación biyectiva Base256 con emojis, suma de verificación CRC-8,
 * cifrado AES-256-GCM opcional (clave derivada con PBKDF2), plantillas de camuflaje
 * y visualización de hashes. Todo se ejecuta en el navegador (GitHub Pages).
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
 * Rangos fijos de puntos de código de cada alfabeto. Son constantes a propósito:
 * el emisor y el receptor deben obtener exactamente la misma tabla, así que la
 * paleta no puede depender de los datos Unicode del navegador que la ejecute.
 *
 * Reglas que cumplen (las comprueban los tests):
 *  - 256 puntos de código por alfabeto, sin repetidos.
 *  - Los tres alfabetos son disjuntos: un emoji pertenece a un solo alfabeto,
 *    así la autodetección nunca es ambigua.
 *  - Todos tienen presentación emoji por defecto (Emoji_Presentation): se ven en
 *    color sin necesitar el selector de variación U+FE0F. Quedan fuera los que se
 *    pintan como texto (👁 🍽 🐿 🌶 📽) o que no son emoji (U+1F4FE), y los
 *    modificadores de tono de piel.
 */
const PALETTE_RANGES: Record<DictionaryId, Array<[number, number]>> = {
  // Caras, gestos, personas, corazones y fiesta
  standard: [
    [0x1f600, 0x1f64f], // 80 caras clásicas
    [0x1f910, 0x1f92f], // 32 caras suplementarias
    [0x1f970, 0x1f971], // 🥰 🥱
    [0x1f973, 0x1f976], // 🥳 🥴 🥵 🥶
    [0x1f97a, 0x1f97a], // 🥺
    [0x1f440, 0x1f440], // 👀
    [0x1f442, 0x1f49f], // 94 cuerpo, ropa, personas, corazones
    [0x1f380, 0x1f393], // 20 celebración
    [0x1f3a0, 0x1f3b5], // 22 feria, cine y música
  ],
  // Fauna, flora, clima y gastronomía
  nature: [
    [0x1f400, 0x1f43e], // 63 animales
    [0x1f980, 0x1f9a2], // 35 animales suplementarios
    [0x1f9a5, 0x1f9aa], // 6 animales (Unicode 12)
    [0x1f9ae, 0x1f9ae], // 🦮
    [0x1f330, 0x1f335], // 6 plantas
    [0x1f337, 0x1f344], // 14 flores, hojas y setas
    [0x1f300, 0x1f320], // 33 clima, océano, luna y cosmos
    [0x1f345, 0x1f37c], // 56 frutas, comida y bebida
    [0x1f37e, 0x1f37f], // 🍾 🍿
    [0x1f950, 0x1f96f], // 32 comida suplementaria
    [0x1f9c0, 0x1f9c2], // 🧀 🧁 🧂
    [0x1f32d, 0x1f32f], // 🌭 🌮 🌯
    [0x1f9c3, 0x1f9c4], // 🧃 🧄
  ],
  // Objetos, tecnología, símbolos, transporte y relojes
  artifacts: [
    [0x1f4a0, 0x1f4fc], // 93 oficina, dinero, informática y comunicación
    [0x1f4ff, 0x1f4ff], // 📿
    [0x1f500, 0x1f53d], // 62 símbolos técnicos, candados y llaves
    [0x1f680, 0x1f6c5], // 70 transporte y señales
    [0x1f3b6, 0x1f3c4], // 15 música, juegos y deporte
    [0x1f3c6, 0x1f3ca], // 5 trofeo y deporte
    [0x1f550, 0x1f559], // 10 relojes
  ],
};

function buildPalette(id: DictionaryId): string[] {
  const out: string[] = [];
  for (const [start, end] of PALETTE_RANGES[id]) {
    for (let cp = start; cp <= end; cp++) out.push(String.fromCodePoint(cp));
  }
  if (out.length !== 256 || new Set(out).size !== 256) {
    throw new Error(`El alfabeto ${id} debe tener 256 emojis distintos (tiene ${out.length}).`);
  }
  return out;
}

function createDict(
  id: DictionaryId,
  name: string,
  shortName: string,
  description: string,
  useCase: string
): DictionaryMeta {
  const emojis = buildPalette(id);
  const reverseMap = new Map<string, number>();
  emojis.forEach((em, idx) => reverseMap.set(em, idx));
  return { id, name, shortName, description, useCase, emojis, reverseMap };
}

export const DICTIONARIES: Record<DictionaryId, DictionaryMeta> = {
  standard: createDict(
    'standard',
    'Base256 Expresivo (caras, personas y fiesta)',
    'Expresivo',
    'Caras, gestos, personas, corazones, celebración y música.',
    'Uso general: mensajes de chat cotidianos y huellas fáciles de recordar.'
  ),
  nature: createDict(
    'nature',
    'Base256 Orgánico (fauna, flora y comida)',
    'Naturaleza',
    'Animales, plantas, clima, cosmos, frutas y comida.',
    'Publicaciones sobre viajes, naturaleza, gastronomía o estilo de vida.'
  ),
  artifacts: createDict(
    'artifacts',
    'Base256 Técnico (objetos y símbolos)',
    'Artefactos',
    'Informática, oficina, candados, llaves, símbolos, transporte y relojes.',
    'Representar hashes, claves públicas y objetos binarios.'
  ),
};

export const DICTIONARY_IDS = Object.keys(DICTIONARIES) as DictionaryId[];

/**
 * CRC-8 (polinomio 0x07: x⁸ + x² + x + 1, valor inicial 0x00, sin reflejar; la
 * variante CRC-8/SMBUS). Detecta errores accidentales de transcripción, NO
 * manipulaciones: quien altere el mensaje puede recalcularlo.
 */
export function computeCRC8(bytes: Uint8Array): number {
  let crc = 0x00;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x80 ? ((crc << 1) ^ 0x07) & 0xff : (crc << 1) & 0xff;
    }
  }
  return crc;
}

/* ------------------------------------------------------------------------- */
/* Cifrado autenticado AES-256-GCM con clave derivada de contraseña (PBKDF2)   */
/* ------------------------------------------------------------------------- */

export const PBKDF2_ITERATIONS = 600_000; // recomendación OWASP para PBKDF2-HMAC-SHA256
export const SALT_LENGTH = 16;
export const IV_LENGTH = 12;
export const GCM_TAG_LENGTH = 16;
/** Bytes que el cifrado añade al mensaje: sal + IV + etiqueta de autenticación. */
export const ENCRYPTION_OVERHEAD = SALT_LENGTH + IV_LENGTH + GCM_TAG_LENGTH;

async function deriveAesKey(passphrase: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Cifra con AES-256-GCM. Devuelve sal (16) ‖ IV (12) ‖ texto cifrado ‖ etiqueta (16).
 * Sal e IV son aleatorios en cada llamada: cifrar dos veces el mismo texto con la
 * misma contraseña produce emojis distintos.
 */
export async function encryptPayload(plain: Uint8Array, passphrase: string): Promise<Uint8Array> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveAesKey(passphrase, salt);
  const sealed = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new Uint8Array(plain))
  );
  const out = new Uint8Array(SALT_LENGTH + IV_LENGTH + sealed.length);
  out.set(salt, 0);
  out.set(iv, SALT_LENGTH);
  out.set(sealed, SALT_LENGTH + IV_LENGTH);
  return out;
}

export type DecryptResult =
  | { ok: true; plain: Uint8Array }
  | { ok: false; reason: 'too_short' | 'auth_failed' };

/** Descifra el formato de encryptPayload. Si la contraseña es incorrecta o un solo bit ha cambiado, la etiqueta GCM no cuadra. */
export async function decryptPayload(packed: Uint8Array, passphrase: string): Promise<DecryptResult> {
  if (packed.length < ENCRYPTION_OVERHEAD) return { ok: false, reason: 'too_short' };
  const salt = new Uint8Array(packed.slice(0, SALT_LENGTH));
  const iv = new Uint8Array(packed.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH));
  const sealed = new Uint8Array(packed.slice(SALT_LENGTH + IV_LENGTH));
  try {
    const key = await deriveAesKey(passphrase, salt);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, sealed);
    return { ok: true, plain: new Uint8Array(plain) };
  } catch {
    return { ok: false, reason: 'auth_failed' };
  }
}

/** Qué parte del paquete cifrado ocupa el byte i (para el inspector). */
export function encryptedSegmentLabel(i: number, payloadLength: number): string {
  if (i < SALT_LENGTH) return 'SAL';
  if (i < SALT_LENGTH + IV_LENGTH) return 'IV';
  if (i >= payloadLength - GCM_TAG_LENGTH) return 'TAG';
  return 'CIFR';
}

/* ------------------------------------------------------------------------- */
/* Codificación y decodificación                                               */
/* ------------------------------------------------------------------------- */

export interface ByteEmojiStep {
  index: number;
  byte: number;
  hex: string;
  binary: string;
  /** Carácter ASCII del byte, o la parte del paquete (SAL, IV, CIFR, TAG, CRC8). */
  label: string;
  emoji: string;
  codePointHex: string;
  isChecksum: boolean;
}

export type Spacing = 'none' | 'space' | 'blocks4';

export interface EncodeOptions {
  dictionaryId: DictionaryId;
  includeCRC8: boolean;
  spacing?: Spacing;
  /** Indica que los bytes ya vienen cifrados (cambia las etiquetas del inspector). */
  encrypted?: boolean;
}

export interface EncodeResult {
  emojiString: string;
  emojis: string[];
  payloadBytes: Uint8Array;
  finalBytes: Uint8Array;
  steps: ByteEmojiStep[];
  crc8Byte: number | null;
  shannonEntropy: number;
}

/** Entropía de Shannon (0.0 a 8.0 bits por byte). */
export function calculateShannonEntropy(bytes: Uint8Array): number {
  if (bytes.length === 0) return 0;
  const counts = new Uint32Array(256);
  for (let i = 0; i < bytes.length; i++) counts[bytes[i]]++;
  let entropy = 0;
  for (let i = 0; i < 256; i++) {
    if (counts[i] > 0) {
      const p = counts[i] / bytes.length;
      entropy -= p * Math.log2(p);
    }
  }
  return entropy;
}

/** Representación legible de un byte en ASCII o etiqueta de control. */
export function formatByteAscii(b: number): string {
  if (b === 0x20) return 'SPC';
  if (b === 0x0a) return '\\n';
  if (b === 0x0d) return '\\r';
  if (b === 0x09) return '\\t';
  if (b >= 33 && b <= 126) return String.fromCharCode(b);
  return '·';
}

export function toHex(bytes: Uint8Array, separator = ' '): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
    .join(separator);
}

function makeStep(index: number, byte: number, emoji: string, label: string, isChecksum: boolean): ByteEmojiStep {
  return {
    index,
    byte,
    hex: byte.toString(16).toUpperCase().padStart(2, '0'),
    binary: byte.toString(2).padStart(8, '0'),
    label,
    emoji,
    codePointHex: 'U+' + (emoji.codePointAt(0) || 0).toString(16).toUpperCase(),
    isChecksum,
  };
}

export function joinEmojis(emojis: string[], spacing: Spacing = 'none'): string {
  if (spacing === 'space') return emojis.join(' ');
  if (spacing === 'blocks4') {
    const chunks: string[] = [];
    for (let i = 0; i < emojis.length; i += 4) chunks.push(emojis.slice(i, i + 4).join(''));
    return chunks.join(' ');
  }
  return emojis.join('');
}

/** Codifica bytes (en claro o ya cifrados) a emojis Base256, con CRC-8 opcional al final. */
export function encodeBytesToEmojis(payloadBytes: Uint8Array, options: EncodeOptions): EncodeResult {
  const dict = DICTIONARIES[options.dictionaryId];
  let crc8Byte: number | null = null;
  let finalBytes = payloadBytes;

  if (options.includeCRC8 && payloadBytes.length > 0) {
    crc8Byte = computeCRC8(payloadBytes);
    finalBytes = new Uint8Array(payloadBytes.length + 1);
    finalBytes.set(payloadBytes, 0);
    finalBytes[payloadBytes.length] = crc8Byte;
  }

  const steps: ByteEmojiStep[] = [];
  const emojis: string[] = [];
  for (let i = 0; i < finalBytes.length; i++) {
    const isChecksum = crc8Byte !== null && i === finalBytes.length - 1;
    const byte = finalBytes[i];
    const emoji = dict.emojis[byte];
    const label = isChecksum
      ? 'CRC8'
      : options.encrypted
      ? encryptedSegmentLabel(i, payloadBytes.length)
      : formatByteAscii(byte);
    steps.push(makeStep(i, byte, emoji, label, isChecksum));
    emojis.push(emoji);
  }

  return {
    emojiString: joinEmojis(emojis, options.spacing),
    emojis,
    payloadBytes,
    finalBytes,
    steps,
    crc8Byte,
    shannonEntropy: calculateShannonEntropy(payloadBytes),
  };
}

export interface ExtractResult {
  emojis: string[];
  bytes: number[];
  /** Caracteres visibles que no pertenecen al alfabeto (texto de cobertura). */
  ignoredCharsCount: number;
}

/**
 * Separa los emojis del alfabeto del resto del texto. Los espacios y los
 * selectores de variación (U+FE0E/U+FE0F, que algunas apps de chat añaden) no
 * cuentan como texto de cobertura.
 */
export function extractAlphabetEmojis(input: string, dictionaryId: DictionaryId): ExtractResult {
  const dict = DICTIONARIES[dictionaryId];
  const emojis: string[] = [];
  const bytes: number[] = [];
  let ignoredCharsCount = 0;
  for (const ch of Array.from(input)) {
    const byteVal = dict.reverseMap.get(ch);
    if (byteVal !== undefined) {
      emojis.push(ch);
      bytes.push(byteVal);
    } else if (!/^[\s︎️‍]$/u.test(ch)) {
      ignoredCharsCount++;
    }
  }
  return { emojis, bytes, ignoredCharsCount };
}

/** Elige el alfabeto que contiene más emojis del texto (los alfabetos son disjuntos). */
export function detectBestDictionary(input: string, preferredId: DictionaryId): DictionaryId {
  const scores: Record<DictionaryId, number> = { standard: 0, nature: 0, artifacts: 0 };
  for (const ch of Array.from(input)) {
    for (const id of DICTIONARY_IDS) {
      if (DICTIONARIES[id].reverseMap.has(ch)) scores[id]++;
    }
  }
  const maxScore = Math.max(...DICTIONARY_IDS.map((id) => scores[id]));
  if (maxScore === 0 || scores[preferredId] === maxScore) return preferredId;
  return DICTIONARY_IDS.find((id) => scores[id] === maxScore) ?? preferredId;
}

export interface DecodeResult {
  /** Bytes tras quitar el CRC-8 (aún cifrados si se usó contraseña). */
  payloadBytes: Uint8Array;
  extractedEmojis: string[];
  ignoredCharsCount: number;
  detectedDictionaryId: DictionaryId;
  crcStatus: 'not_used' | 'valid' | 'invalid' | 'empty';
  expectedCrcHex?: string;
  receivedCrcHex?: string;
  steps: ByteEmojiStep[];
}

export interface DecodeOptions {
  dictionaryId: DictionaryId;
  includeCRC8: boolean;
  autoDetectDictionary?: boolean;
  encrypted?: boolean;
}

/** Recupera los bytes de una cadena con emojis, aunque estén mezclados con texto de camuflaje. */
export function decodeEmojisToBytes(input: string, options: DecodeOptions): DecodeResult {
  const activeDictId = options.autoDetectDictionary
    ? detectBestDictionary(input, options.dictionaryId)
    : options.dictionaryId;
  const { emojis, bytes, ignoredCharsCount } = extractAlphabetEmojis(input, activeDictId);

  if (bytes.length === 0) {
    return {
      payloadBytes: new Uint8Array(0),
      extractedEmojis: [],
      ignoredCharsCount,
      detectedDictionaryId: activeDictId,
      crcStatus: 'empty',
      steps: [],
    };
  }

  const all = new Uint8Array(bytes);
  let payloadBytes = all;
  let crcStatus: DecodeResult['crcStatus'] = 'not_used';
  let expectedCrcHex: string | undefined;
  let receivedCrcHex: string | undefined;
  let hasChecksum = false;

  if (options.includeCRC8) {
    if (all.length < 2) {
      crcStatus = 'invalid';
    } else {
      hasChecksum = true;
      const receivedCrc = all[all.length - 1];
      payloadBytes = all.slice(0, all.length - 1);
      const computedCrc = computeCRC8(payloadBytes);
      expectedCrcHex = computedCrc.toString(16).toUpperCase().padStart(2, '0');
      receivedCrcHex = receivedCrc.toString(16).toUpperCase().padStart(2, '0');
      crcStatus = receivedCrc === computedCrc ? 'valid' : 'invalid';
    }
  }

  const steps = Array.from(all).map((byte, i) => {
    const isChecksum = hasChecksum && i === all.length - 1;
    const label = isChecksum
      ? 'CRC8'
      : options.encrypted
      ? encryptedSegmentLabel(i, payloadBytes.length)
      : formatByteAscii(byte);
    return makeStep(i, byte, emojis[i], label, isChecksum);
  });

  return {
    payloadBytes,
    extractedEmojis: emojis,
    ignoredCharsCount,
    detectedDictionaryId: activeDictId,
    crcStatus,
    expectedCrcHex,
    receivedCrcHex,
    steps,
  };
}

/** Convierte "48 6F 6C 61", "0x48,0x6f" o "486f6c61" en bytes. */
export function parseHexInput(hexStr: string): {
  bytes: Uint8Array;
  valid: boolean;
  issue?: 'chars' | 'odd';
} {
  const cleaned = hexStr.replace(/0x/gi, '').replace(/[^0-9a-fA-F]/g, '');
  const charsOk = /^(?:0x|[0-9a-fA-F\s,:-])*$/i.test(hexStr);
  const usable = cleaned.length % 2 === 0 ? cleaned : cleaned.slice(0, -1);
  const out = new Uint8Array(usable.length / 2);
  for (let i = 0; i < usable.length; i += 2) out[i / 2] = parseInt(usable.slice(i, i + 2), 16);
  if (!charsOk) return { bytes: out, valid: false, issue: 'chars' };
  if (cleaned.length % 2 !== 0) return { bytes: out, valid: false, issue: 'odd' };
  return { bytes: out, valid: true };
}

/**
 * Longitud ponderada de X (twitter-text v3): pesan 1 los puntos de código de
 * U+0000–U+10FF, U+2000–U+200D, U+2010–U+201F y U+2032–U+2037; el resto
 * (emojis, CJK…) pesa 2. Los modificadores invisibles de una secuencia emoji
 * (U+FE0F, ZWJ) no suman. No contempla URLs (X las cuenta como 23).
 */
export function twitterWeightedLength(text: string): number {
  let weight = 0;
  for (const ch of Array.from(text)) {
    const cp = ch.codePointAt(0) || 0;
    if (cp === 0xfe0f || cp === 0xfe0e || cp === 0x200d) continue;
    const light =
      cp <= 0x10ff ||
      (cp >= 0x2000 && cp <= 0x200d) ||
      (cp >= 0x2010 && cp <= 0x201f) ||
      (cp >= 0x2032 && cp <= 0x2037);
    weight += light ? 1 : 2;
  }
  return weight;
}

/* ------------------------------------------------------------------------- */
/* Plantillas de camuflaje                                                     */
/* ------------------------------------------------------------------------- */

export interface CamouflageTemplate {
  id: string;
  name: string;
  platform: string;
  generate: (emojis: string[], spacing?: Spacing) => string;
}

export const CAMOUFLAGE_TEMPLATES: CamouflageTemplate[] = [
  {
    id: 'direct',
    name: 'Secuencia pura (sin camuflaje)',
    platform: 'Estándar / terminal',
    generate: (emojis, spacing) => joinEmojis(emojis, spacing),
  },
  {
    id: 'chat_casual',
    name: 'Mensaje casual de chat',
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
        parts.push(`${frases[i]} ${emojis.slice(idx, idx + chunkSize).join('')}.`);
        idx += chunkSize;
      }
      if (idx < emojis.length) parts.push(emojis.slice(idx).join(''));
      parts.push(frases[frases.length - 1]);
      return parts.join(' ');
    },
  },
  {
    id: 'twitter_post',
    name: 'Publicación en X / Bluesky',
    platform: 'X / Bluesky / Mastodon',
    generate: (emojis) => {
      if (emojis.length === 0) return '';
      const mid = Math.ceil(emojis.length / 2);
      return `Resumen visual de la semana en el estudio ${emojis.slice(0, mid).join('')} ✨\n\nPróximos objetivos para el proyecto ${emojis
        .slice(mid)
        .join('')} #dev #tech`;
    },
  },
  {
    id: 'fingerprint_grid',
    name: 'Matriz de verificación (bloques de 4)',
    platform: 'Verificación de claves / hashes',
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

/* ------------------------------------------------------------------------- */
/* Hashes                                                                      */
/* ------------------------------------------------------------------------- */

export type HashAlgorithm = 'SHA-256' | 'SHA-512' | 'SHA-384' | 'SHA-1';

/** Resumen criptográfico real con la Web Crypto API. */
export async function computeCryptoHash(inputBytes: Uint8Array, algorithm: HashAlgorithm): Promise<Uint8Array> {
  const buffer = await crypto.subtle.digest(algorithm, new Uint8Array(inputBytes));
  return new Uint8Array(buffer);
}

/** Distancia de Hamming en bits entre dos bloques de igual longitud (efecto avalancha). */
export function computeBitHammingDistance(
  a: Uint8Array,
  b: Uint8Array
): { differingBits: number; totalBits: number; percentage: number; differingBytes: number } {
  const len = Math.min(a.length, b.length);
  let differingBits = 0;
  let differingBytes = 0;
  for (let i = 0; i < len; i++) {
    let v = a[i] ^ b[i];
    if (v !== 0) differingBytes++;
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
