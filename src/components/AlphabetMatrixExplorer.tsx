import React, { useState, useMemo } from 'react';
import {
  DICTIONARIES,
  DictionaryId,
  formatByteAscii,
} from '../lib/emojiCodec';
import { Search, Plus, Binary, Copy, Check } from 'lucide-react';

interface AlphabetMatrixExplorerProps {
  dictionaryId: DictionaryId;
  onSelectDictionary: (id: DictionaryId) => void;
  onInsertByteOrEmoji: (byteVal: number, emoji: string) => void;
}

export const AlphabetMatrixExplorer: React.FC<AlphabetMatrixExplorerProps> = ({
  dictionaryId,
  onSelectDictionary,
  onInsertByteOrEmoji,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedByte, setSelectedByte] = useState<number>(0x41); // 'A' (65) por defecto
  const [copiedEmoji, setCopiedEmoji] = useState<boolean>(false);

  const activeDict = DICTIONARIES[dictionaryId];

  const entries = useMemo(() => {
    return activeDict.emojis.map((emoji, byteVal) => {
      const hex = byteVal.toString(16).toUpperCase().padStart(2, '0');
      const bin = byteVal.toString(2).padStart(8, '0');
      const ascii = formatByteAscii(byteVal);
      const cp = 'U+' + (emoji.codePointAt(0) || 0).toString(16).toUpperCase();
      return {
        byteVal,
        hex,
        bin,
        ascii,
        emoji,
        cp,
      };
    });
  }, [activeDict]);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (item) =>
        item.emoji.includes(q) ||
        item.hex.toLowerCase().includes(q.replace(/^0x/, '')) ||
        item.byteVal.toString() === q ||
        item.bin.includes(q) ||
        item.ascii.toLowerCase() === q ||
        item.cp.toLowerCase().includes(q)
    );
  }, [entries, searchQuery]);

  const currentEntry = entries[selectedByte] || entries[0];

  const toggleBit = (bitPosition: number) => {
    // bitPosition: 7 (MSB, 128) hasta 0 (LSB, 1)
    const mask = 1 << bitPosition;
    setSelectedByte((prev) => (prev ^ mask) & 0xff);
  };

  const handleCopyEmoji = (em: string) => {
    navigator.clipboard.writeText(em);
    setCopiedEmoji(true);
    setTimeout(() => setCopiedEmoji(false), 1500);
  };

  return (
    <section id="mapa-base256" className="scroll-mt-20 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <p className="text-xs font-medium text-rose-600 dark:text-rose-400 mb-1">
            03. Arquitectura Biyectiva de 8 Bits (2⁸ = 256 Estados)
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white text-balance">
            Matriz Completa del Alfabeto Base256 (0x00 – 0xFF)
          </h2>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
            Cada octeto (8 bits, valores de 0 a 255) posee una correspondencia matemática biyectiva 1:1 con un único punto de código Unicode. Haz clic en cualquier celda o conmuta los interruptores binarios para inspeccionar su codificación.
          </p>
        </div>

        {/* Selector de Diccionario */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 rounded-lg self-start shrink-0">
          {(Object.keys(DICTIONARIES) as DictionaryId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onSelectDictionary(id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                dictionaryId === id
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {DICTIONARIES[id].shortName}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Inspector Interactivo de 8 Bits (Columna Izquierda 4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3.5">
              <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-4xl select-all">
                {currentEntry.emoji}
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Octeto Seleccionado
                </div>
                <div className="text-xl font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                  0x{currentEntry.hex} · Dec {currentEntry.byteVal}
                </div>
                <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                  Unicode {currentEntry.cp} · ASCII: {currentEntry.ascii}
                </div>
              </div>
            </div>
          </div>

          {/* Conmutador interactivo de 8 bits */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Binary className="w-3.5 h-3.5 text-rose-500" />
                Registro Binario Interactivo (8 bits)
              </span>
              <span className="text-slate-500 dark:text-slate-400 font-mono">
                Clic para invertir bit
              </span>
            </div>

            <div className="grid grid-cols-8 gap-1.5">
              {[7, 6, 5, 4, 3, 2, 1, 0].map((bitPos) => {
                const isOn = ((selectedByte >> bitPos) & 1) === 1;
                const weight = 1 << bitPos;
                return (
                  <button
                    key={bitPos}
                    type="button"
                    onClick={() => toggleBit(bitPos)}
                    className={`py-2 px-1 rounded-lg border font-mono text-center transition-colors ${
                      isOn
                        ? 'bg-rose-600 border-rose-500 text-white font-bold'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400'
                    }`}
                  >
                    <div className="text-sm tabular-nums">{isOn ? '1' : '0'}</div>
                    <div className="text-[10px] opacity-75 tabular-nums mt-0.5">
                      {weight}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comparación de este mismo byte en los 3 diccionarios */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Equivalencia del byte 0x{currentEntry.hex} en los 3 diccionarios:
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(DICTIONARIES) as DictionaryId[]).map((dId) => {
                const em = DICTIONARIES[dId].emojis[selectedByte];
                const isCurrent = dId === dictionaryId;
                return (
                  <button
                    key={dId}
                    type="button"
                    onClick={() => onSelectDictionary(dId)}
                    className={`p-2 rounded-lg border text-center transition-colors ${
                      isCurrent
                        ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                        : 'bg-slate-50/50 dark:bg-slate-950/50 border-slate-200/70 dark:border-slate-800/70 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xl">{em}</div>
                    <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mt-1 truncate">
                      {DICTIONARIES[dId].shortName}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => onInsertByteOrEmoji(currentEntry.byteVal, currentEntry.emoji)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Insertar en Codificador
            </button>
            <button
              type="button"
              onClick={() => handleCopyEmoji(currentEntry.emoji)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {copiedEmoji ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copiar
                </>
              )}
            </button>
          </div>
        </div>

        {/* Matriz 16x16 Completa (Columna Derecha 8 cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por Hex (41, 0xFF), Decimal (65), Binario (01000001), carácter ASCII o Emoji..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
              />
            </div>
            <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
              Mostrando {filteredEntries.length} / 256 octetos
            </div>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                No se encontraron octetos que coincidan con «{searchQuery}».
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline"
              >
                Restablecer filtro
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-8 sm:grid-cols-16 gap-1 max-h-[420px] overflow-y-auto p-1">
              {filteredEntries.map((item) => {
                const isSelected = item.byteVal === selectedByte;
                return (
                  <button
                    key={item.byteVal}
                    type="button"
                    onClick={() => setSelectedByte(item.byteVal)}
                    title={`0x${item.hex} (${item.byteVal}) · ASCII: ${item.ascii} · ${item.bin}`}
                    className={`group flex flex-col items-center justify-center p-1.5 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-rose-600/15 border-rose-500 ring-1 ring-rose-500'
                        : 'bg-slate-50/70 dark:bg-slate-950/70 border-slate-200/60 dark:border-slate-800/70 hover:border-slate-400 dark:hover:border-slate-600'
                    }`}
                  >
                    <span className="text-lg leading-none">{item.emoji}</span>
                    <span
                      className={`text-[10px] font-mono tabular-nums mt-1 ${
                        isSelected
                          ? 'text-rose-600 dark:text-rose-400 font-bold'
                          : 'text-slate-500 dark:text-slate-500'
                      }`}
                    >
                      {item.hex}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
