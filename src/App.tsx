/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  DICTIONARIES,
  DICTIONARY_IDS,
  DictionaryId,
  CAMOUFLAGE_TEMPLATES,
  ENCRYPTION_OVERHEAD,
  PBKDF2_ITERATIONS,
  Spacing,
  decodeEmojisToBytes,
  decryptPayload,
  encodeBytesToEmojis,
  encryptPayload,
  parseHexInput,
  toHex,
  twitterWeightedLength,
} from './lib/emojiCodec';
import { HashComparatorLab } from './components/HashComparatorLab';
import { AlphabetMatrixExplorer } from './components/AlphabetMatrixExplorer';
import { EducationalGuideSection } from './components/EducationalGuideSection';
import {
  ArrowRightLeft,
  Copy,
  Check,
  Download,
  Upload,
  Lock,
  ShieldCheck,
  ShieldAlert,
  Sun,
  Moon,
  ExternalLink,
  RotateCcw,
  FileCode,
  MessageSquare,
  Shuffle,
  Loader2,
} from 'lucide-react';

type CodecDirection = 'encode' | 'decode';
type InputFormat = 'text' | 'hex' | 'binary';

/** Tamaño máximo de archivo que se codifica (cada byte es un emoji de 4 bytes UTF-8). */
const MAX_FILE_BYTES = 2048;
const THEME_KEY = 'eb_theme';

interface QuickSample {
  id: string;
  label: string;
  format: InputFormat;
  value: string;
  dictionary: DictionaryId;
  camouflageId: string;
}

const QUICK_SAMPLES: QuickSample[] = [
  {
    id: 'ghost',
    label: 'Mensaje oculto',
    format: 'text',
    value: 'Un Fantasma en el Sistema: Operación Silenciosa a las 23:00h',
    dictionary: 'standard',
    camouflageId: 'direct',
  },
  {
    id: 'social_camo',
    label: 'Camuflaje en chat',
    format: 'text',
    value: 'Clave de acceso WiFi invitados: Fantasma#2026!',
    dictionary: 'nature',
    camouflageId: 'chat_casual',
  },
  {
    id: 'hex_key',
    label: 'Objeto byte (hex)',
    format: 'hex',
    value: 'DE AD BE EF CA FE BA BE 46 41 4E 54 41 53 4D 41',
    dictionary: 'artifacts',
    camouflageId: 'fingerprint_grid',
  },
  {
    id: 'coords',
    label: 'Coordenadas UTF-8',
    format: 'text',
    value: '40°25′00″N 03°42′12″O · Nodo Central Madrid',
    dictionary: 'standard',
    camouflageId: 'twitter_post',
  },
];

function readStoredTheme(): boolean {
  try {
    return localStorage.getItem(THEME_KEY) !== 'light';
  } catch {
    return true;
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

type DecryptState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'ok'; plain: Uint8Array; source: Uint8Array; pass: string }
  | { status: 'auth_failed' | 'too_short'; source: Uint8Array; pass: string };

export default function App() {
  const [isDark, setIsDark] = useState<boolean>(readStoredTheme);
  const [direction, setDirection] = useState<CodecDirection>('encode');
  const [inputFormat, setInputFormat] = useState<InputFormat>('text');
  const [dictionaryId, setDictionaryId] = useState<DictionaryId>('standard');
  const [includeCRC8, setIncludeCRC8] = useState<boolean>(true);
  const [passphrase, setPassphrase] = useState<string>('');
  const [camouflageId, setCamouflageId] = useState<string>('direct');
  const [spacing, setSpacing] = useState<Spacing>('none');

  // Entradas para codificar
  const [textInput, setTextInput] = useState<string>(QUICK_SAMPLES[0].value);
  const [hexInput, setHexInput] = useState<string>(QUICK_SAMPLES[2].value);
  const [binaryFileBytes, setBinaryFileBytes] = useState<Uint8Array>(
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x49, 0x48, 0x44, 0x52])
  );
  const [binaryFileName, setBinaryFileName] = useState<string>('cabecera_png.bin');
  const [binaryFileTotal, setBinaryFileTotal] = useState<number>(12);

  // Entrada para decodificar
  const [emojiInput, setEmojiInput] = useState<string>('');
  const [autoDetectDict, setAutoDetectDict] = useState<boolean>(true);

  // Interacción e inspección
  const [highlightedStepIndex, setHighlightedStepIndex] = useState<number | null>(null);
  const [copiedOutput, setCopiedOutput] = useState<boolean>(false);
  const [logoLoadError, setLogoLoadError] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try {
      localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    } catch {
      /* almacenamiento no disponible: el tema solo dura esta visita */
    }
  }, [isDark]);

  // Una contraseña hecha solo de espacios cuenta como «sin contraseña».
  const activePass = passphrase.trim() ? passphrase : '';
  const encrypted = activePass !== '';

  // Bytes de origen en modo Codificar
  const sourceBytesInfo = useMemo(() => {
    if (inputFormat === 'text') return { bytes: new TextEncoder().encode(textInput), valid: true as const };
    if (inputFormat === 'hex') return parseHexInput(hexInput);
    return { bytes: binaryFileBytes, valid: true as const };
  }, [inputFormat, textInput, hexInput, binaryFileBytes]);

  // Cifrado AES-GCM (asíncrono, con una pequeña espera para no derivar la clave en cada pulsación)
  const [cipher, setCipher] = useState<{ source: Uint8Array; pass: string; bytes: Uint8Array } | null>(null);
  useEffect(() => {
    if (!encrypted || sourceBytesInfo.bytes.length === 0) return;
    let cancelled = false;
    const source = sourceBytesInfo.bytes;
    const timer = window.setTimeout(async () => {
      const bytes = await encryptPayload(source, activePass);
      if (!cancelled) setCipher({ source, pass: activePass, bytes });
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [encrypted, activePass, sourceBytesInfo.bytes]);

  const cipherReady =
    cipher !== null && cipher.source === sourceBytesInfo.bytes && cipher.pass === activePass;
  const encryptPending = encrypted && sourceBytesInfo.bytes.length > 0 && !cipherReady;
  const payloadToEncode = !encrypted
    ? sourceBytesInfo.bytes
    : cipherReady
    ? cipher!.bytes
    : new Uint8Array(0);

  const encodeResult = useMemo(
    () => encodeBytesToEmojis(payloadToEncode, { dictionaryId, includeCRC8, spacing, encrypted }),
    [payloadToEncode, dictionaryId, includeCRC8, spacing, encrypted]
  );

  // Salida con la plantilla de camuflaje elegida
  const camouflagedOutput = useMemo(() => {
    const tpl = CAMOUFLAGE_TEMPLATES.find((t) => t.id === camouflageId) ?? CAMOUFLAGE_TEMPLATES[0];
    return tpl.generate(encodeResult.emojis, spacing);
  }, [encodeResult, camouflageId, spacing]);

  // Decodificación (síncrona) y descifrado (asíncrono)
  const decodeResult = useMemo(
    () =>
      decodeEmojisToBytes(emojiInput, {
        dictionaryId,
        includeCRC8,
        autoDetectDictionary: autoDetectDict,
        encrypted,
      }),
    [emojiInput, dictionaryId, includeCRC8, autoDetectDict, encrypted]
  );

  const [decrypt, setDecrypt] = useState<DecryptState>({ status: 'idle' });
  useEffect(() => {
    const packed = decodeResult.payloadBytes;
    if (!encrypted || packed.length === 0) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const r = await decryptPayload(packed, activePass);
      if (cancelled) return;
      setDecrypt(
        r.ok
          ? { status: 'ok', plain: r.plain, source: packed, pass: activePass }
          : { status: r.reason, source: packed, pass: activePass }
      );
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [encrypted, activePass, decodeResult.payloadBytes]);

  const decryptCurrent =
    'source' in decrypt && decrypt.source === decodeResult.payloadBytes && decrypt.pass === activePass;
  const decryptStatus: 'none' | 'pending' | 'ok' | 'auth_failed' | 'too_short' = !encrypted ||
    decodeResult.payloadBytes.length === 0
    ? 'none'
    : decryptCurrent
    ? (decrypt.status as 'ok' | 'auth_failed' | 'too_short')
    : 'pending';

  const decodedBytes =
    decryptStatus === 'none'
      ? decodeResult.payloadBytes
      : decryptStatus === 'ok' && decrypt.status === 'ok'
      ? decrypt.plain
      : new Uint8Array(0);
  const decodedText = useMemo(() => new TextDecoder('utf-8', { fatal: false }).decode(decodedBytes), [decodedBytes]);
  const decodedHex = useMemo(() => toHex(decodedBytes), [decodedBytes]);

  const twitterCharWeight = useMemo(() => twitterWeightedLength(camouflagedOutput), [camouflagedOutput]);

  // Invertir dirección enviando el resultado actual a la entrada opuesta
  const handleSwapDirection = () => {
    if (direction === 'encode') {
      setEmojiInput(camouflagedOutput);
      setDirection('decode');
    } else {
      if (decodedBytes.length > 0) {
        setTextInput(decodedText);
        setHexInput(decodedHex);
      }
      setDirection('encode');
    }
  };

  const handleCopyPrimaryOutput = async () => {
    const ok = await copyText(direction === 'encode' ? camouflagedOutput : decodedText);
    if (!ok) return;
    setCopiedOutput(true);
    setTimeout(() => setCopiedOutput(false), 1800);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        setBinaryFileBytes(new Uint8Array(reader.result.slice(0, MAX_FILE_BYTES)));
        setBinaryFileTotal(reader.result.byteLength);
        setBinaryFileName(file.name);
        setInputFormat('binary');
        setDirection('encode');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleGenerateRandomBytes = () => {
    const rand = new Uint8Array(16);
    crypto.getRandomValues(rand);
    if (inputFormat === 'binary') {
      setBinaryFileBytes(rand);
      setBinaryFileTotal(rand.length);
      setBinaryFileName('aleatorio_16bytes.bin');
    } else {
      setHexInput(toHex(rand));
      setInputFormat('hex');
    }
  };

  const handleDownloadDecodedBytes = () => {
    if (decodedBytes.length === 0) return;
    const blob = new Blob([new Uint8Array(decodedBytes)], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'payload_decodificado.bin';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSimulateTamper = () => {
    const chars = Array.from(emojiInput);
    const dict = DICTIONARIES[decodeResult.detectedDictionaryId];
    for (let i = 0; i < chars.length; i++) {
      const currentVal = dict.reverseMap.get(chars[i]);
      if (currentVal !== undefined) {
        chars[i] = dict.emojis[(currentVal + 1) % 256];
        setEmojiInput(chars.join(''));
        return;
      }
    }
  };

  const handleInsertFromMatrix = (byteVal: number, emoji: string) => {
    const hex = byteVal.toString(16).toUpperCase().padStart(2, '0');
    if (direction === 'decode') {
      setEmojiInput((prev) => prev + emoji);
      return;
    }
    if (inputFormat === 'text') {
      if (byteVal >= 32 && byteVal <= 126) {
        setTextInput((prev) => prev + String.fromCharCode(byteVal));
      } else {
        // Un byte de control o ≥ 0x80 no se puede escribir como texto UTF-8:
        // se pasa a modo hexadecimal conservando lo escrito.
        const current = toHex(new TextEncoder().encode(textInput));
        setHexInput(current ? `${current} ${hex}` : hex);
        setInputFormat('hex');
      }
    } else if (inputFormat === 'hex') {
      setHexInput((prev) => (prev.trim() ? `${prev.trim()} ${hex}` : hex));
    } else {
      const next = new Uint8Array(binaryFileBytes.length + 1);
      next.set(binaryFileBytes, 0);
      next[binaryFileBytes.length] = byteVal;
      setBinaryFileBytes(next);
      setBinaryFileTotal(next.length);
    }
  };

  const activeSteps = direction === 'encode' ? encodeResult.steps : decodeResult.steps;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Bar Contract: 3 Zonas con gap-8 */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 sm:gap-8 px-4 sm:px-6 py-3.5">
          {/* Zona 1: Brand Title */}
          <a
            href="#codificador"
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 font-display"
          >
            EmojiByte Base256
          </a>

          {/* Zona 2: 4 enlaces de navegación en una línea */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
            <a
              href="#codificador"
              className="hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Codificador
            </a>
            <a
              href="#hashes"
              className="hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Hashes Visuales
            </a>
            <a
              href="#mapa-base256"
              className="hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Mapa Base256
            </a>
            <a
              href="#laboratorio"
              className="hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Fundamentos
            </a>
          </nav>

          {/* Zona 3: 1 Acción Principal (Enlace oficial a la web del autor) */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="https://www.unfantasmaenelsistema.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs"
            >
              <span className="hidden sm:inline">Un Fantasma en el Sistema</span>
              <span className="sm:hidden">Web</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-16">
        {/* Hero y Cabecera con Logo Oficial del Autor */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center border-b border-slate-200 dark:border-slate-800 pb-10">
          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-rose-600 dark:text-rose-400">
                Codificación Base256 y criptografía visual
              </span>
              <span aria-hidden="true">·</span>
              <span>Codificación Biyectiva 8-Bit (1 Byte = 1 Emoji)</span>
              <span aria-hidden="true">·</span>
              <span>100% Client-Side</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 dark:text-white text-balance leading-[1.12]">
              Codifica cadenas ASCII, UTF-8 y objetos byte en emoticonos.
            </h1>

            <p className="text-base text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              Cada byte se convierte en un emoji y vuelta, sin pérdidas. Camufla los emojis dentro de un mensaje de chat, protégelos con <strong>AES-256-GCM</strong> si quieres confidencialidad de verdad, detecta errores de copia con <strong>CRC-8</strong> y compara resúmenes <strong>SHA-256</strong> de forma gráfica. Todo ocurre en tu navegador: no se envía nada a ningún servidor.
            </p>

            {/* Barra de herramientas rápida: Selector de Ejemplos + Tema Claro/Oscuro */}
            <div className="pt-2 flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">
                Cargar ejemplo:
              </span>
              {QUICK_SAMPLES.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => {
                    setDirection('encode');
                    setInputFormat(sample.format);
                    setDictionaryId(sample.dictionary);
                    setCamouflageId(sample.camouflageId);
                    if (sample.format === 'text') setTextInput(sample.value);
                    if (sample.format === 'hex') setHexInput(sample.value);
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-500/60 dark:hover:border-rose-500/60 text-slate-700 dark:text-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  {sample.label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setIsDark((d) => !d)}
                className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-200/70 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
                title="Cambiar entre tema claro y oscuro"
              >
                {isDark ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>Modo Claro</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-slate-700" />
                    <span>Modo Oscuro</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Tarjeta de Marca con el Logo de Un Fantasma en el Sistema */}
          <div className="lg:col-span-4">
            <a
              href="https://www.unfantasmaenelsistema.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="group block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-500/60 dark:hover:border-rose-500/60 rounded-2xl p-5 transition-all shadow-xs"
            >
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-2 shrink-0 overflow-hidden">
                  {!logoLoadError && (
                    <img
                      src="assets/aistudio/icono_81a3db5b.png"
                      alt="Logo de Un Fantasma en el Sistema"
                      onError={() => setLogoLoadError(true)}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-rose-600 dark:text-rose-400">
                    Proyecto y Laboratorio
                  </div>
                  <div className="text-base font-bold text-slate-900 dark:text-white truncate mt-0.5 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                    Un Fantasma en el Sistema
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 truncate">
                    <span>unfantasmaenelsistema.com</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
                <span>Ciberseguridad · Esteganografía</span>
                <span className="text-slate-900 dark:text-slate-200 font-semibold">
                  Visitar Web →
                </span>
              </div>
            </a>
          </div>
        </section>

        {/* SECCIÓN 01: Estación de Codificación y Decodificación Biyectiva */}
        <section id="codificador" className="scroll-mt-20 space-y-6">
          {/* Barra Superior de Control del Codificador */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            {/* Selector de Operación: Codificar vs Decodificar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-1 sm:flex-none items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => setDirection('encode')}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs font-semibold rounded-md transition-colors sm:whitespace-nowrap ${
                    direction === 'encode'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Codificar (Bytes → Emojis)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!emojiInput.trim()) {
                      setEmojiInput(camouflagedOutput);
                    }
                    setDirection('decode');
                  }}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs font-semibold rounded-md transition-colors sm:whitespace-nowrap ${
                    direction === 'decode'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Decodificar (Emojis → Bytes)
                </button>
              </div>

              <button
                type="button"
                onClick={handleSwapDirection}
                title="Enviar salida actual a la entrada inversa"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Invertir Flujo</span>
              </button>
            </div>

            {/* Parámetros del Motor: Diccionario, CRC-8 y Clave de Paso */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Selector de Diccionario Base256 */}
              <div className="flex items-center gap-2 min-w-0 max-w-full">
                <label
                  htmlFor="dict-select"
                  className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap"
                >
                  Alfabeto:
                </label>
                <select
                  id="dict-select"
                  value={dictionaryId}
                  onChange={(e) => setDictionaryId(e.target.value as DictionaryId)}
                  className="min-w-0 max-w-full px-3 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                >
                  {DICTIONARY_IDS.map((id) => (
                    <option key={id} value={id}>
                      {DICTIONARIES[id].name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Checksum CRC-8 */}
              <label className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg cursor-pointer select-none whitespace-nowrap shrink-0">
                <input
                  type="checkbox"
                  checked={includeCRC8}
                  onChange={(e) => setIncludeCRC8(e.target.checked)}
                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                <span>Checksum CRC-8 (1 byte)</span>
              </label>

              {/* Contraseña opcional: AES-256-GCM con clave derivada por PBKDF2 */}
              <div className="relative flex items-center">
                {encryptPending || decryptStatus === 'pending' ? (
                  <Loader2 className="w-3.5 h-3.5 text-rose-500 absolute left-2.5 pointer-events-none animate-spin" />
                ) : (
                  <Lock
                    className={`w-3.5 h-3.5 absolute left-2.5 pointer-events-none ${
                      encrypted ? 'text-emerald-500' : 'text-slate-400'
                    }`}
                  />
                )}
                <input
                  type="password"
                  aria-label="Contraseña opcional para cifrar con AES-256-GCM"
                  title={`Opcional. Cifra con AES-256-GCM; la clave se deriva con PBKDF2-SHA256 (${PBKDF2_ITERATIONS.toLocaleString('es-ES')} iteraciones). Añade ${ENCRYPTION_OVERHEAD} bytes (sal, IV y etiqueta).`}
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Contraseña AES (opcional)"
                  autoComplete="new-password"
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 w-52 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                />
              </div>
            </div>
          </div>

          {/* Paneles Gemelos de Entrada y Salida */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* PANEL IZQUIERDO: ENTRADA */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
              {direction === 'encode' ? (
                <>
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        Entrada de Datos (Origen)
                      </span>

                      {/* Selector del tipo de entrada: Texto UTF-8 / Hex / Objeto Binario */}
                      <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setInputFormat('text')}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                            inputFormat === 'text'
                              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          Texto / ASCII
                        </button>
                        <button
                          type="button"
                          onClick={() => setInputFormat('hex')}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                            inputFormat === 'hex'
                              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          Hexadecimal
                        </button>
                        <button
                          type="button"
                          onClick={() => setInputFormat('binary')}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                            inputFormat === 'binary'
                              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          Archivo / Bytes
                        </button>
                      </div>
                    </div>

                    {inputFormat === 'text' && (
                      <textarea
                        rows={6}
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder="Escribe cualquier cadena ASCII o texto UTF-8 para convertir en emoticonos..."
                        className="w-full p-3.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/40 leading-relaxed"
                      />
                    )}

                    {inputFormat === 'hex' && (
                      <div className="space-y-2">
                        <textarea
                          rows={6}
                          value={hexInput}
                          onChange={(e) => setHexInput(e.target.value)}
                          placeholder="Introduce bytes en formato hexadecimal, p. ej.: 48 6F 6C 61 o 0xdeadbeef..."
                          className="w-full p-3.5 text-sm font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/40 leading-relaxed"
                        />
                        {'issue' in sourceBytesInfo && sourceBytesInfo.issue === 'chars' && (
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            ▲ Hay caracteres que no son hexadecimales; se han ignorado.
                          </p>
                        )}
                        {'issue' in sourceBytesInfo && sourceBytesInfo.issue === 'odd' && (
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            ▲ Número impar de dígitos: un byte son 2 dígitos hex, así que el último dígito suelto no se codifica.
                          </p>
                        )}
                      </div>
                    )}

                    {inputFormat === 'binary' && (
                      <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-800 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileCode className="w-5 h-5 text-rose-500" />
                            <div>
                              <div className="text-xs font-semibold text-slate-900 dark:text-white">
                                Objeto Uint8Array: {binaryFileName}
                              </div>
                              <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                                {binaryFileBytes.length} bytes cargados en el buffer
                              </div>
                              {binaryFileTotal > binaryFileBytes.length && (
                                <div className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                                  ▲ El archivo tiene {binaryFileTotal.toLocaleString('es-ES')} bytes: solo se codifican los primeros{' '}
                                  {MAX_FILE_BYTES.toLocaleString('es-ES')}. Lo que decodifiques será un fragmento, no el archivo completo.
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              ref={fileInputRef}
                              type="file"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-rose-500 transition-colors"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              Cargar Archivo
                            </button>
                          </div>
                        </div>

                        <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md font-mono text-xs text-slate-600 dark:text-slate-400 max-h-28 overflow-y-auto break-all">
                          {Array.from(binaryFileBytes)
                            .map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
                            .join(' ')}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Métricas del Buffer de Entrada */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    <div>
                      <span>Tamaño: {sourceBytesInfo.bytes.length} bytes</span>
                      <span className="mx-1.5">·</span>
                      <span>{sourceBytesInfo.bytes.length * 8} bits</span>
                      <span className="mx-1.5">·</span>
                      <span>Entropía: {encodeResult.shannonEntropy.toFixed(2)} bits/B</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleGenerateRandomBytes}
                        className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                      >
                        <Shuffle className="w-3.5 h-3.5" />
                        <span>16 Bytes Aleatorios</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (inputFormat === 'text') setTextInput('');
                          if (inputFormat === 'hex') setHexInput('');
                          if (inputFormat === 'binary') {
                            setBinaryFileBytes(new Uint8Array(0));
                            setBinaryFileTotal(0);
                          }
                        }}
                        className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Limpiar</span>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* MODO DECODIFICAR: ENTRADA DE EMOJIS O CONVERSACIÓN CAMUFLADA */
                <>
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        Secuencia de Emojis o Mensaje Camuflado
                      </span>

                      <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoDetectDict}
                          onChange={(e) => setAutoDetectDict(e.target.checked)}
                          className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                        />
                        <span>Auto-detectar alfabeto</span>
                      </label>
                    </div>

                    <textarea
                      rows={6}
                      value={emojiInput}
                      onChange={(e) => setEmojiInput(e.target.value)}
                      placeholder="Pega aquí la cadena de emoticonos o una conversación completa de chat/Twitter que contenga emojis ocultos..."
                      className="w-full p-3.5 text-base bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/40 leading-relaxed"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    <div>
                      <span>Emojis extraídos: {decodeResult.extractedEmojis.length}</span>
                      <span className="mx-1.5">·</span>
                      <span>Texto filtrado: {decodeResult.ignoredCharsCount} car.</span>
                      <span className="mx-1.5">·</span>
                      <span>
                        Alfabeto: {DICTIONARIES[decodeResult.detectedDictionaryId].shortName}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {includeCRC8 && decodeResult.extractedEmojis.length >= 2 && (
                        <button
                          type="button"
                          onClick={handleSimulateTamper}
                          className="text-amber-600 dark:text-amber-400 hover:underline"
                          title="Altera 1 emoticono para comprobar cómo el checksum CRC-8 detecta la corrupción"
                        >
                          Simular Corrupción (1 Emoji)
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setEmojiInput('')}
                        className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Limpiar</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* PANEL DERECHO: SALIDA */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
              {direction === 'encode' ? (
                <>
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        Salida Codificada en Emojis (Base256)
                      </span>

                      {/* Selector de Modo de Camuflaje / Formato */}
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                        <select
                          aria-label="Modo de camuflaje o formato de salida"
                          value={camouflageId}
                          onChange={(e) => setCamouflageId(e.target.value)}
                          className="px-2.5 py-1 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
                        >
                          {CAMOUFLAGE_TEMPLATES.map((tpl) => (
                            <option key={tpl.id} value={tpl.id}>
                              {tpl.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Espaciado cuando está en modo directo */}
                    {camouflageId === 'direct' && (
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Agrupación visual:</span>
                        <div className="flex items-center gap-2">
                          {(
                            [
                              ['none', 'Compacto'],
                              ['space', 'Espaciado'],
                              ['blocks4', 'Bloques de 4'],
                            ] as const
                          ).map(([val, label]) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setSpacing(val)}
                              className={`px-2 py-0.5 rounded font-mono text-[11px] ${
                                spacing === val
                                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                                  : 'hover:text-slate-900 dark:hover:text-white'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Área de Salida de Emojis */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg min-h-[148px] max-h-[220px] overflow-y-auto">
                      {encryptPending ? (
                        <div className="h-28 flex items-center justify-center gap-2 text-xs text-slate-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Derivando la clave y cifrando con AES-256-GCM…
                        </div>
                      ) : encodeResult.steps.length === 0 ? (
                        <div className="h-28 flex items-center justify-center text-xs text-slate-400">
                          Escribe texto o introduce bytes a la izquierda para generar emoticonos...
                        </div>
                      ) : camouflageId === 'direct' ? (
                        <div className="flex flex-wrap gap-1 leading-relaxed">
                          {encodeResult.steps.map((step) => (
                            <button
                              key={step.index}
                              type="button"
                              onMouseEnter={() => setHighlightedStepIndex(step.index)}
                              onMouseLeave={() => setHighlightedStepIndex(null)}
                              title={
                                step.isChecksum
                                  ? `Byte Checksum CRC-8: 0x${step.hex} (${step.emoji})`
                                  : `Byte #${step.index}: '${step.label}' → 0x${step.hex} (${step.byte}) → ${step.emoji}`
                              }
                              className={`px-1 py-0.5 text-xl rounded transition-transform ${
                                highlightedStepIndex === step.index
                                  ? 'scale-125 bg-rose-500/20 ring-1 ring-rose-500'
                                  : step.isChecksum
                                  ? 'bg-emerald-500/10 ring-1 ring-emerald-500/30'
                                  : 'hover:bg-slate-200/70 dark:hover:bg-slate-800'
                              }`}
                            >
                              {step.emoji}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800 dark:text-slate-200 leading-relaxed select-all">
                          {camouflagedOutput}
                        </pre>
                      )}
                    </div>
                  </div>

                  {/* Barra inferior de salida con contador X/Twitter y botón Copiar */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      <span>{encodeResult.steps.length} emoticonos</span>
                      {encrypted && cipherReady && (
                        <>
                          <span className="mx-1.5">·</span>
                          <span className="text-emerald-600 dark:text-emerald-400">
                            AES-GCM (+{ENCRYPTION_OVERHEAD} B)
                          </span>
                        </>
                      )}
                      {includeCRC8 && encodeResult.crc8Byte !== null && (
                        <>
                          <span className="mx-1.5">·</span>
                          <span className="text-emerald-600 dark:text-emerald-400">
                            CRC-8: 0x{encodeResult.crc8Byte.toString(16).toUpperCase().padStart(2, '0')}
                          </span>
                        </>
                      )}
                      <span className="mx-1.5">·</span>
                      <span
                        className={
                          twitterCharWeight > 280
                            ? 'text-amber-600 dark:text-amber-400 font-semibold'
                            : ''
                        }
                      >
                        Peso en X: {twitterCharWeight}/280
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEmojiInput(camouflagedOutput);
                          setDirection('decode');
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                      >
                        Probar Decodificación
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyPrimaryOutput}
                        disabled={encodeResult.steps.length === 0}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap shrink-0"
                      >
                        {copiedOutput ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar Salida</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* MODO DECODIFICAR: SALIDA DE TEXTO UTF-8 Y HEXADECIMAL */
                <>
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        Datos Reconstruidos (Texto UTF-8 y Objeto Byte)
                      </span>

                      {/* Estado de Verificación CRC-8 */}
                      {decodeResult.crcStatus === 'valid' && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck className="w-4 h-4" />
                          <span>CRC-8 Íntegro (0x{decodeResult.receivedCrcHex})</span>
                        </span>
                      )}
                      {decodeResult.crcStatus === 'invalid' && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
                          <ShieldAlert className="w-4 h-4" />
                          <span>
                            {decodeResult.expectedCrcHex
                              ? `Error CRC-8 (calculado 0x${decodeResult.expectedCrcHex}, recibido 0x${decodeResult.receivedCrcHex})`
                              : 'Error CRC-8 (faltan emojis: no hay datos + checksum)'}
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Estado del descifrado AES-GCM */}
                    {decryptStatus === 'pending' && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Derivando la clave y comprobando la etiqueta GCM…
                      </div>
                    )}
                    {decryptStatus === 'ok' && (
                      <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="w-4 h-4" />
                        Descifrado AES-256-GCM correcto: la contraseña es la buena y el mensaje no se ha modificado.
                      </div>
                    )}
                    {(decryptStatus === 'auth_failed' || decryptStatus === 'too_short') && (
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-500/10 text-xs font-medium text-rose-700 dark:text-rose-300">
                        <ShieldAlert className="w-4 h-4 shrink-0" />
                        <span>
                          {decryptStatus === 'too_short'
                            ? `No se puede descifrar: un mensaje cifrado tiene al menos ${ENCRYPTION_OVERHEAD} bytes (sal, IV y etiqueta). ¿Se cifró de verdad o falta parte del mensaje?`
                            : 'No se puede descifrar: la contraseña no es la correcta, el mensaje se ha alterado o no estaba cifrado. AES-GCM no entrega datos sin autenticar.'}
                        </span>
                      </div>
                    )}

                    {/* Cadena de Texto Decodificada */}
                    <div className="space-y-1.5">
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Cadena UTF-8 / ASCII Decodificada:
                      </div>
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg min-h-[84px] text-sm font-mono break-words whitespace-pre-wrap text-slate-900 dark:text-slate-100">
                        {decodedText || (
                          <span className="text-slate-400 font-sans text-xs">
                            Sin datos decodificados...
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Volcado Hexadecimal (Uint8Array) */}
                    <div className="space-y-1.5">
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Volcado Hexadecimal del Objeto Byte ({decodedBytes.length} bytes):
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-xs text-slate-600 dark:text-slate-300 max-h-24 overflow-y-auto break-all">
                        {decodedHex || '—'}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadDecodedBytes}
                      disabled={decodedBytes.length === 0}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descargar .bin ({decodedBytes.length} B)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyPrimaryOutput}
                      disabled={decodedBytes.length === 0}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      {copiedOutput ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Texto Decodificado</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* INSPECTOR PASO A PASO DE TRANSFORMACIÓN BYTE ↔ EMOJI */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  01. Inspector Educativo de Trazabilidad Byte ↔ Punto de Código Unicode
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Desglose en tiempo real de cada octeto en el buffer: Carácter ASCII → Binario (8 bits) → Índice Hex/Decimal → Emoticono Base256.
                </p>
              </div>
              <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                Mostrando {Math.min(activeSteps.length, 48)} de {activeSteps.length} octetos
              </div>
            </div>

            {activeSteps.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Introduce datos arriba para inspeccionar la tubería de codificación byte a byte.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-64 overflow-y-auto p-1">
                {activeSteps.slice(0, 48).map((step) => {
                  const isHighlighted = highlightedStepIndex === step.index;
                  return (
                    <div
                      key={step.index}
                      onMouseEnter={() => setHighlightedStepIndex(step.index)}
                      onMouseLeave={() => setHighlightedStepIndex(null)}
                      className={`p-2.5 rounded-lg border font-mono text-xs transition-all ${
                        isHighlighted
                          ? 'bg-rose-500/10 border-rose-500 ring-1 ring-rose-500'
                          : step.isChecksum
                          ? 'bg-emerald-500/5 border-emerald-500/40'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200/80 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>#{step.index}</span>
                        <span>{step.codePointHex}</span>
                      </div>
                      <div className="my-1.5 flex items-center justify-between">
                        <span className="text-2xl leading-none">{step.emoji}</span>
                        <div className="text-right">
                          <div className="font-bold text-slate-900 dark:text-white tabular-nums">
                            0x{step.hex}
                          </div>
                          <div
                            className={`text-[10px] ${
                              step.isChecksum
                                ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {step.label}
                          </div>
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums tracking-tight border-t border-slate-200/60 dark:border-slate-800 pt-1 flex justify-between">
                        <span>{step.binary}</span>
                        <span>{step.byte}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* SECCIÓN 02: Laboratorio de Comparación Visual de Hashes */}
        <HashComparatorLab dictionaryId={dictionaryId} />

        {/* SECCIÓN 03: Explorador de la Matriz Base256 (0x00 - 0xFF) */}
        <AlphabetMatrixExplorer
          dictionaryId={dictionaryId}
          onSelectDictionary={setDictionaryId}
          onInsertByteOrEmoji={handleInsertFromMatrix}
        />

        {/* SECCIÓN 04: Guía Educativa, Comparativa de Bases y Despliegue en GitHub Pages */}
        <EducationalGuideSection />
      </main>

      {/* Pie de Página Limpio con Logo y Enlace a Un Fantasma en el Sistema */}
      <footer className="mt-16 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3.5">
            {!logoLoadError && (
              <img
                src="assets/aistudio/icono_81a3db5b.png"
                alt="Un Fantasma en el Sistema"
                onError={() => setLogoLoadError(true)}
                className="w-9 h-9 object-contain"
              />
            )}
            <div className="text-xs text-slate-600 dark:text-slate-400">
              <div className="font-semibold text-slate-900 dark:text-white">
                EmojiByte — Codificador Base256 y Visualizador de Hashes
              </div>
              <div>
                Desarrollado para{' '}
                <a
                  href="https://www.unfantasmaenelsistema.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-rose-600 dark:text-rose-400 font-medium hover:underline"
                >
                  Un Fantasma en el Sistema
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-500 dark:text-slate-400">
            <a
              href="#codificador"
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Codificador
            </a>
            <a
              href="#hashes"
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Hashes SHA-256
            </a>
            <a
              href="#mapa-base256"
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Tabla 0x00–0xFF
            </a>
            <a
              href="https://www.unfantasmaenelsistema.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-slate-900 dark:text-white hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
            >
              <span>https://www.unfantasmaenelsistema.com/</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
