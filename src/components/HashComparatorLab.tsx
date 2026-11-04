import React, { useState, useEffect } from 'react';
import {
  DICTIONARIES,
  DictionaryId,
  HashAlgorithm,
  computeCryptoHash,
  computeBitHammingDistance,
  encodeBytesToEmojis,
} from '../lib/emojiCodec';
import { Copy, Check, RefreshCw, ShieldAlert, ShieldCheck, ArrowLeftRight } from 'lucide-react';

interface HashComparatorLabProps {
  dictionaryId: DictionaryId;
}

interface HashPreset {
  id: string;
  label: string;
  description: string;
  inputA: string;
  inputB: string;
}

const HASH_PRESETS: HashPreset[] = [
  {
    id: 'avalanche',
    label: 'Efecto Avalancha (1 carácter)',
    description: 'Cambiar una sola letra minúscula por mayúscula altera ~50% de los bits y todos los emoticonos del hash.',
    inputA: 'Transferir 1000 EUR a la cuenta ES91-2100-0418-4502',
    inputB: 'Transferir 1000 EUR a la cuenta ES91-2100-0418-4503',
  },
  {
    id: 'identical',
    label: 'Verificación Íntegra (Idénticos)',
    description: 'Dos archivos o mensajes idénticos producen exactamente la misma secuencia gráfica de 32 emoticonos.',
    inputA: 'sha256sum: linux-kernel-6.12-x86_64.iso [OFICIAL]',
    inputB: 'sha256sum: linux-kernel-6.12-x86_64.iso [OFICIAL]',
  },
  {
    id: 'homoglyph',
    label: 'Detección de Ataque Homoglifo',
    description: 'Un atacante sustituye una "a" latina (0x61) por una "а" cirílica (U+0430). El texto parece igual, pero el hash visual cambia por completo.',
    inputA: 'https://www.unfantasmaenelsistema.com/auth',
    inputB: 'https://www.unfаntasmaenelsistema.com/auth',
  },
];

export const HashComparatorLab: React.FC<HashComparatorLabProps> = ({ dictionaryId }) => {
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>('SHA-256');
  const [inputA, setInputA] = useState<string>(HASH_PRESETS[0].inputA);
  const [inputB, setInputB] = useState<string>(HASH_PRESETS[0].inputB);
  const [hashBytesA, setHashBytesA] = useState<Uint8Array>(new Uint8Array(0));
  const [hashBytesB, setHashBytesB] = useState<Uint8Array>(new Uint8Array(0));
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hoveredByteIndex, setHoveredByteIndex] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const run = async () => {
      const enc = new TextEncoder();
      const bytesA = enc.encode(inputA);
      const bytesB = enc.encode(inputB);
      const [hA, hB] = await Promise.all([
        computeCryptoHash(bytesA, algorithm),
        computeCryptoHash(bytesB, algorithm),
      ]);
      if (active) {
        setHashBytesA(hA);
        setHashBytesB(hB);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [inputA, inputB, algorithm]);

  const encodedA = encodeBytesToEmojis(hashBytesA, {
    dictionaryId,
    includeCRC8: false,
    spacing: 'none',
  });
  const encodedB = encodeBytesToEmojis(hashBytesB, {
    dictionaryId,
    includeCRC8: false,
    spacing: 'none',
  });

  const hamming = computeBitHammingDistance(hashBytesA, hashBytesB);
  const isIdentical =
    hashBytesA.length > 0 &&
    hashBytesA.length === hashBytesB.length &&
    hamming.differingBits === 0;

  const hexA = Array.from(hashBytesA)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const hexB = Array.from(hashBytesB)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <section id="hashes" className="scroll-mt-20 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <p className="text-xs font-medium text-rose-600 dark:text-rose-400 mb-1">
            02. Huellas Digitales Criptográficas y Efecto Avalancha
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white text-balance">
            Visualizador y Comparador Gráfico de Hashes
          </h2>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
            Comparar 64 caracteres hexadecimales a simple vista es propenso a errores humanos (ataques de colisión parcial de prefijo/sufijo). Al codificar cada byte del resumen criptográfico en un emoticono único (Base256), un hash SHA-256 de 32 bytes se reduce a 32 iconos altamente distinguibles.
          </p>
        </div>

        {/* Selector de Algoritmo */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 rounded-lg self-start shrink-0">
          {(['SHA-256', 'SHA-512', 'SHA-384', 'SHA-1'] as HashAlgorithm[]).map((alg) => (
            <button
              key={alg}
              type="button"
              onClick={() => setAlgorithm(alg)}
              className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                algorithm === alg
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {alg}
            </button>
          ))}
        </div>
      </div>

      {/* Escenarios de Demostración */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">
            Casos de estudio:
          </span>
          {HASH_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                setInputA(preset.inputA);
                setInputB(preset.inputB);
              }}
              className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setInputB(inputA)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/70 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          Igualar Entrada B con A
        </button>
      </div>

      {/* Entradas A y B y Comparativa */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Panel A */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="hash-input-a"
                className="text-sm font-semibold text-slate-900 dark:text-white"
              >
                Mensaje o Referencia A (Original)
              </label>
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {new TextEncoder().encode(inputA).length} bytes entrada · {hashBytesA.length * 8} bits hash
              </span>
            </div>
            <textarea
              id="hash-input-a"
              rows={2}
              value={inputA}
              onChange={(e) => setInputA(e.target.value)}
              placeholder="Escribe cualquier texto, clave o suma de control..."
              className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
            />
          </div>

          {/* Huella Emoji A */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Huella Visual Base256 ({hashBytesA.length} emoticonos · Diccionario {DICTIONARIES[dictionaryId].shortName})
              </span>
              <button
                type="button"
                onClick={() => handleCopy(encodedA.emojiString, 'emojiA')}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                {copiedId === 'emojiA' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copiar Emojis
                  </>
                )}
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-lg">
              <div className="flex flex-wrap gap-1.5">
                {encodedA.steps.map((step, idx) => {
                  const matchesB =
                    hashBytesB.length > idx && hashBytesA[idx] === hashBytesB[idx];
                  const isHovered = hoveredByteIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onMouseEnter={() => setHoveredByteIndex(idx)}
                      onMouseLeave={() => setHoveredByteIndex(null)}
                      title={`Byte #${idx} · Hex: 0x${step.hex} · Bin: ${step.binary}`}
                      className={`w-8 h-8 flex items-center justify-center text-lg rounded-md transition-transform ${
                        isHovered ? 'scale-115 ring-2 ring-rose-500 z-10' : ''
                      } ${
                        matchesB
                          ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30'
                          : 'bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/30'
                      }`}
                    >
                      {step.emoji}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Digest Hexadecimal ({hexA.length} nibbles)</span>
                <button
                  type="button"
                  onClick={() => handleCopy(hexA, 'hexA')}
                  className="hover:text-slate-900 dark:hover:text-white font-mono"
                >
                  {copiedId === 'hexA' ? 'Copiado' : 'Copiar Hex'}
                </button>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800/80 rounded-md font-mono text-xs break-all leading-relaxed text-slate-600 dark:text-slate-400">
                {Array.from(hashBytesA).map((b, idx) => {
                  const matchesB = hashBytesB.length > idx && b === hashBytesB[idx];
                  const hexByte = b.toString(16).padStart(2, '0');
                  return (
                    <span
                      key={idx}
                      onMouseEnter={() => setHoveredByteIndex(idx)}
                      onMouseLeave={() => setHoveredByteIndex(null)}
                      className={`inline-block px-0.5 rounded-xs cursor-default ${
                        hoveredByteIndex === idx
                          ? 'bg-rose-500 text-white font-semibold'
                          : matchesB
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-rose-700 dark:text-rose-400 font-semibold'
                      }`}
                    >
                      {hexByte}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Panel B */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="hash-input-b"
                className="text-sm font-semibold text-slate-900 dark:text-white"
              >
                Mensaje o Referencia B (Comparación)
              </label>
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {new TextEncoder().encode(inputB).length} bytes entrada · {hashBytesB.length * 8} bits hash
              </span>
            </div>
            <textarea
              id="hash-input-b"
              rows={2}
              value={inputB}
              onChange={(e) => setInputB(e.target.value)}
              placeholder="Modifica un carácter para observar el efecto avalancha..."
              className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
            />
          </div>

          {/* Huella Emoji B */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Huella Visual Base256 ({hashBytesB.length} emoticonos · Diccionario {DICTIONARIES[dictionaryId].shortName})
              </span>
              <button
                type="button"
                onClick={() => handleCopy(encodedB.emojiString, 'emojiB')}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                {copiedId === 'emojiB' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copiar Emojis
                  </>
                )}
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-lg">
              <div className="flex flex-wrap gap-1.5">
                {encodedB.steps.map((step, idx) => {
                  const matchesA =
                    hashBytesA.length > idx && hashBytesA[idx] === hashBytesB[idx];
                  const isHovered = hoveredByteIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onMouseEnter={() => setHoveredByteIndex(idx)}
                      onMouseLeave={() => setHoveredByteIndex(null)}
                      title={`Byte #${idx} · Hex: 0x${step.hex} · Bin: ${step.binary}`}
                      className={`w-8 h-8 flex items-center justify-center text-lg rounded-md transition-transform ${
                        isHovered ? 'scale-115 ring-2 ring-rose-500 z-10' : ''
                      } ${
                        matchesA
                          ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30'
                          : 'bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/30'
                      }`}
                    >
                      {step.emoji}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Digest Hexadecimal ({hexB.length} nibbles)</span>
                <button
                  type="button"
                  onClick={() => handleCopy(hexB, 'hexB')}
                  className="hover:text-slate-900 dark:hover:text-white font-mono"
                >
                  {copiedId === 'hexB' ? 'Copiado' : 'Copiar Hex'}
                </button>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800/80 rounded-md font-mono text-xs break-all leading-relaxed text-slate-600 dark:text-slate-400">
                {Array.from(hashBytesB).map((b, idx) => {
                  const matchesA = hashBytesA.length > idx && b === hashBytesA[idx];
                  const hexByte = b.toString(16).padStart(2, '0');
                  return (
                    <span
                      key={idx}
                      onMouseEnter={() => setHoveredByteIndex(idx)}
                      onMouseLeave={() => setHoveredByteIndex(null)}
                      className={`inline-block px-0.5 rounded-xs cursor-default ${
                        hoveredByteIndex === idx
                          ? 'bg-rose-500 text-white font-semibold'
                          : matchesA
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-rose-700 dark:text-rose-400 font-semibold'
                      }`}
                    >
                      {hexByte}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Diagnóstico de Integridad y Distancia de Hamming */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
          <div className="flex items-start gap-3 md:col-span-2">
            {isIdentical ? (
              <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {isIdentical
                  ? '▲ COINCIDENCIA CRIPTOGRÁFICA EXACTA (100% ÍNTEGRO)'
                  : '▼ DIVERGENCIA DETECTADA — EFECTO AVALANCHA ACTIVO'}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {isIdentical
                  ? 'Ambos bloques generan el mismo resumen binario y exactamente la misma matriz de emoticonos.'
                  : `De ${hashBytesA.length} bytes totales, ${hamming.differingBytes} emoticonos han mutado. En una función hash ideal, cualquier cambio altera ~50% de los bits.`}
              </p>
            </div>
          </div>

          <div className="border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-3 md:pt-0 md:pl-5">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Distancia de Hamming (Bits)
            </div>
            <div className="text-lg font-mono font-bold tabular-nums text-slate-900 dark:text-white mt-0.5">
              {hamming.differingBits} / {hamming.totalBits} bits ({hamming.percentage.toFixed(1)}%)
            </div>
          </div>

          <div className="border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-3 md:pt-0 md:pl-5">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Emoticonos Alterados (Bytes)
            </div>
            <div className="text-lg font-mono font-bold tabular-nums text-slate-900 dark:text-white mt-0.5">
              {hamming.differingBytes} / {hashBytesA.length} iconos
            </div>
          </div>
        </div>

        {/* Inspector del byte bajo el cursor */}
        {hoveredByteIndex !== null &&
          hashBytesA.length > hoveredByteIndex &&
          hashBytesB.length > hoveredByteIndex && (
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <span className="text-slate-500 dark:text-slate-400">
                Inspeccionando posición de byte #{hoveredByteIndex}:
              </span>
              <span className="text-slate-800 dark:text-slate-200">
                A: {encodedA.steps[hoveredByteIndex]?.emoji} (0x
                {encodedA.steps[hoveredByteIndex]?.hex} · {encodedA.steps[hoveredByteIndex]?.binary})
              </span>
              <span className="text-slate-400">vs</span>
              <span className="text-slate-800 dark:text-slate-200">
                B: {encodedB.steps[hoveredByteIndex]?.emoji} (0x
                {encodedB.steps[hoveredByteIndex]?.hex} · {encodedB.steps[hoveredByteIndex]?.binary})
              </span>
              <span className="text-rose-600 dark:text-rose-400">
                XOR: 0b
                {(hashBytesA[hoveredByteIndex] ^ hashBytesB[hoveredByteIndex])
                  .toString(2)
                  .padStart(8, '0')}
              </span>
            </div>
          )}
      </div>
    </section>
  );
};
