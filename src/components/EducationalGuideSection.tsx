import React, { useState } from 'react';
import { ENCRYPTION_OVERHEAD, PBKDF2_ITERATIONS } from '../lib/emojiCodec';

type GuideTab = 'theory' | 'security' | 'comparison';

const TABS: Array<[GuideTab, string]> = [
  ['theory', 'Cómo funciona'],
  ['security', 'Seguridad y límites'],
  ['comparison', 'Comparativa de bases'],
];

const Card: React.FC<{ kicker: string; title: string; children: React.ReactNode }> = ({ kicker, title, children }) => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
    <div className="text-xs font-mono text-rose-600 dark:text-rose-400">{kicker}</div>
    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
    <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed space-y-2">{children}</div>
  </div>
);

const Code: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <code className="font-mono text-xs text-slate-800 dark:text-slate-200">{children}</code>
);

export const EducationalGuideSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<GuideTab>('theory');

  return (
    <section id="laboratorio" className="scroll-mt-20 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <p className="text-xs font-medium text-rose-600 dark:text-rose-400 mb-1">04. Fundamentos</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white text-balance">
            Cómo funciona, qué protege y qué no
          </h2>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
            Codificar, comprobar la integridad y cifrar son tres cosas distintas. EmojiByte hace las tres, y aquí se explica qué aporta cada una.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 rounded-lg self-start shrink-0">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === id
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'theory' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card kicker="01 · Biyección 1:1" title="¿Cómo funciona Base256 con emojis?">
            <p>
              Cualquier dato (texto ASCII, texto UTF-8 con tildes o eñes, claves o archivos) está en memoria como una secuencia de bytes (<Code>Uint8Array</Code>). Un byte tiene exactamente <Code>2⁸ = 256</Code> valores (<Code>0x00</Code> a <Code>0xFF</Code>), así que con un alfabeto de 256 emojis cada byte se convierte en un solo emoji, sin relleno, y se puede deshacer sin perder nada.
            </p>
            <p>
              Los tres alfabetos no comparten ningún emoji. Por eso el decodificador sabe con qué alfabeto se escribió un mensaje solo con mirarlo.
            </p>
          </Card>

          <Card kicker="02 · Filtrado" title="Camuflaje en mensajes de texto">
            <p>
              Las letras, números y signos de puntuación no aparecen en ningún alfabeto, así que el decodificador se queda solo con los emojis del alfabeto activo y descarta el resto: el texto que rodea a los emojis no estorba.
            </p>
            <p>
              Si el texto de cobertura incluye por casualidad algún emoji del mismo alfabeto, se colará como un byte más. El CRC-8 (o la etiqueta de AES-GCM) lo detecta.
            </p>
          </Card>

          <Card kicker="03 · Codificación ≠ cifrado" title="CRC-8 y contraseña AES">
            <p>
              Codificar solo cambia la forma de escribir los datos: quien conozca el alfabeto (es público) lee el mensaje. Para que sea confidencial hay que poner contraseña: EmojiByte cifra con <strong>AES-256-GCM</strong> y deriva la clave con <strong>PBKDF2-SHA256</strong> ({PBKDF2_ITERATIONS.toLocaleString('es-ES')} iteraciones), con sal e IV aleatorios en cada mensaje.
            </p>
            <p>
              El byte final <strong>CRC-8</strong> (polinomio <Code>0x07</Code>) detecta errores al copiar y pegar. No protege contra manipulaciones: eso lo hace la etiqueta de AES-GCM.
            </p>
          </Card>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card kicker="Formato del mensaje cifrado" title={`Qué son los ${ENCRYPTION_OVERHEAD} emojis de más`}>
            <p>
              Con contraseña, el mensaje se envía como <Code>sal (16) ‖ IV (12) ‖ texto cifrado ‖ etiqueta (16)</Code> y, si está activado, un byte CRC-8 al final. El inspector byte a byte marca cada parte como <Code>SAL</Code>, <Code>IV</Code>, <Code>CIFR</Code> y <Code>TAG</Code>.
            </p>
            <p>
              La <strong>sal</strong> hace que la misma contraseña genere una clave distinta en cada mensaje, el <strong>IV</strong> no se repite nunca con la misma clave y la <strong>etiqueta</strong> de 128 bits garantiza que nadie ha cambiado ni un bit. Si la contraseña es incorrecta o el mensaje se ha tocado, AES-GCM no devuelve nada.
            </p>
          </Card>

          <Card kicker="Mal ejemplo" title="Por qué un «XOR con contraseña» no sirve">
            <p>
              Un cifrado casero que hace XOR de los datos con un flujo generado a partir de la contraseña (por ejemplo, un xorshift de 32 bits) tiene dos fallos graves: el estado interno solo tiene 2³² posibilidades, que se prueban por fuerza bruta en poco tiempo, y sin sal ni IV la misma contraseña produce siempre el mismo flujo.
            </p>
            <p>
              Con dos mensajes cifrados con la misma contraseña, hacer XOR entre ellos elimina la clave (el ataque de reutilización de clave, o «two-time pad»). Por eso aquí se usa AES-GCM de la Web Crypto API del navegador.
            </p>
          </Card>

          <Card kicker="Límites" title="Esto no es esteganografía indetectable">
            <p>
              Una ristra de 60 emojis en un mensaje llama la atención, y su distribución (casi uniforme si va cifrada) se distingue de cómo escribe una persona. El camuflaje sirve para entender la idea de canal encubierto, no para pasar desapercibido ante quien vigile.
            </p>
            <p>
              Algunas aplicaciones de mensajería añaden el selector <Code>U+FE0F</Code> o sustituyen emojis por imágenes. El decodificador ignora <Code>U+FE0F</Code>, pero si una app cambia un emoji por otro el mensaje se corrompe (y el CRC-8 lo avisa).
            </p>
          </Card>

          <Card kicker="Huellas visuales" title="Comparar hashes con emojis">
            <p>
              32 emojis se comparan antes que 64 caracteres hexadecimales, y el efecto avalancha hace que un cambio mínimo en la entrada cambie casi todos los emojis. Aun así hay emojis muy parecidos entre sí, así que la comparación visual es una ayuda: la verificación fiable es comparar el hash completo, como hace el laboratorio de hashes.
            </p>
            <p>
              Es la misma idea de los «randomart» de las claves SSH o los códigos de seguridad de Signal y WhatsApp.
            </p>
          </Card>
        </div>
      )}

      {activeTab === 'comparison' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-950/60">
                  <th className="py-3.5 px-5">Esquema de Codificación</th>
                  <th className="py-3.5 px-4 text-right">Tamaño Alfabeto</th>
                  <th className="py-3.5 px-4 text-right">Bits por Símbolo</th>
                  <th className="py-3.5 px-4 text-right">Símbolos para SHA-256 (32 B)</th>
                  <th className="py-3.5 px-4 text-right">Bytes UTF-8 en Red (32 B)</th>
                  <th className="py-3.5 px-5">Propósito Principal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70 text-sm">
                <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30">
                  <td className="py-3.5 px-5 font-medium text-slate-900 dark:text-white">
                    Binario (Base2)
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums">2</td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums">1 bit</td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums">256 símbolos</td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums">256 bytes</td>
                  <td className="py-3.5 px-5 text-xs text-slate-600 dark:text-slate-400">
                    Inspección lógica a nivel de registros y máscaras de bits.
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30">
                  <td className="py-3.5 px-5 font-medium text-slate-900 dark:text-white">
                    Hexadecimal (Base16)
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums">16</td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums">4 bits (1 nibble)</td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums">64 símbolos</td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums">64 bytes</td>
                  <td className="py-3.5 px-5 text-xs text-slate-600 dark:text-slate-400">
                    Volcados de memoria, direcciones MAC y hashes tradicionales.
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30">
                  <td className="py-3.5 px-5 font-medium text-slate-900 dark:text-white">
                    Base64 (RFC 4648)
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums">64 (+ &apos;=&apos;)</td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums">6 bits</td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums">44 símbolos</td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums">44 bytes</td>
                  <td className="py-3.5 px-5 text-xs text-slate-600 dark:text-slate-400">
                    Transporte de binarios en JSON, MIME y cabeceras HTTP.
                  </td>
                </tr>
                <tr className="bg-rose-500/5 dark:bg-rose-500/10">
                  <td className="py-3.5 px-5 font-semibold text-rose-700 dark:text-rose-300">
                    EmojiByte (Base256)
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-semibold tabular-nums text-rose-700 dark:text-rose-300">
                    256 emojis
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-semibold tabular-nums text-rose-700 dark:text-rose-300">
                    8 bits (1 byte)
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-semibold tabular-nums text-rose-700 dark:text-rose-300">
                    32 emoticonos
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                    128 bytes (4 B/emoji)
                  </td>
                  <td className="py-3.5 px-5 text-xs text-slate-700 dark:text-slate-300">
                    Comparación visual de hashes y camuflaje de datos en mensajes de texto.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};
