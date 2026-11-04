import React, { useState } from 'react';
import { Copy, Check, GitBranch, Image as ImageIcon, FileText } from 'lucide-react';

export const EducationalGuideSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'theory' | 'comparison' | 'readme' | 'ghpages'>('readme');
  const [copiedWorkflow, setCopiedWorkflow] = useState(false);
  const [copiedCommands, setCopiedCommands] = useState(false);

  const ghActionsYaml = `name: Desplegar EmojiByte en GitHub Pages

on:
  push:
    branches: ["main", "master"]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  build_and_deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout del repositorio
        uses: actions/checkout@v4
      - name: Configurar Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - name: Instalar dependencias
        run: npm install
      - name: Compilar aplicación estática (dist/)
        run: npm run build
      - name: Configurar GitHub Pages
        uses: actions/configure-pages@v5
      - name: Subir artefacto estático dist/
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'
      - name: Publicar en GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4`;

  const gitPushCommands = `git init
git add .
git commit -m "feat: lanzamiento inicial de EmojiByte Base256"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/emojibyte-base256.git
git push -u origin main`;

  const handleCopyYaml = () => {
    navigator.clipboard.writeText(ghActionsYaml);
    setCopiedWorkflow(true);
    setTimeout(() => setCopiedWorkflow(false), 1800);
  };

  const handleCopyCommands = () => {
    navigator.clipboard.writeText(gitPushCommands);
    setCopiedCommands(true);
    setTimeout(() => setCopiedCommands(false), 1800);
  };

  return (
    <section id="laboratorio" className="scroll-mt-20 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <p className="text-xs font-medium text-rose-600 dark:text-rose-400 mb-1">
            04. Fundamentos Técnicos, Kit de Repositorio GitHub y Capturas
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white text-balance">
            Documentación, README con Capturas y GitHub Pages
          </h2>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
            El repositorio ya incluye <code className="font-mono text-xs">README.md</code> completo con capturas en alta resolución (<code className="font-mono text-xs">public/docs/screenshots/</code>), licencia <code className="font-mono text-xs">MIT</code>, <code className="font-mono text-xs">.nojekyll</code> y workflow automático <code className="font-mono text-xs">.github/workflows/deploy.yml</code>.
          </p>
        </div>

        {/* Selector de Pestaña */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 rounded-lg self-start shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('readme')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'readme'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            README.md y Capturas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('theory')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'theory'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Fundamentos y Seguridad
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('comparison')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'comparison'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Comparativa de Bases
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ghpages')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'ghpages'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Subir a GitHub Pages
          </button>
        </div>
      </div>

      {activeTab === 'readme' && (
        <div className="space-y-6">
          {/* Resumen de archivos preparados para GitHub */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-rose-500" />
                  Archivos del Repositorio Listos para GitHub
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Todos los archivos necesarios ya están creados en la raíz del proyecto para que al exportar o hacer <code className="font-mono">git push</code> el repositorio luzca completo y profesional.
                </p>
              </div>
              <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 shrink-0">
                ✓ README.md · ✓ LICENSE · ✓ .nojekyll · ✓ deploy.yml
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="space-y-2">
                <div className="text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-rose-500" />
                  <span>01-codificador-base256.svg</span>
                </div>
                <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950">
                  <img
                    src="docs/screenshots/01-codificador-base256.svg"
                    alt="Captura 1: Codificador Base256 e Inspector de Bytes"
                    referrerPolicy="no-referrer"
                    className="w-full h-auto block"
                  />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Captura 1 incluida en <code className="font-mono">README.md</code>: Estación de codificación biyectiva e inspector byte a byte.
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-rose-500" />
                  <span>02-comparador-hashes-sha256.svg</span>
                </div>
                <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950">
                  <img
                    src="docs/screenshots/02-comparador-hashes-sha256.svg"
                    alt="Captura 2: Comparador Gráfico de Hashes SHA-256"
                    referrerPolicy="no-referrer"
                    className="w-full h-auto block"
                  />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Captura 2 incluida en <code className="font-mono">README.md</code>: Comparador visual SHA-256 y Distancia de Hamming.
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-rose-500" />
                  <span>03-matriz-base256-8bits.svg</span>
                </div>
                <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950">
                  <img
                    src="docs/screenshots/03-matriz-base256-8bits.svg"
                    alt="Captura 3: Matriz Completa Base256 y Registro de 8 Bits"
                    referrerPolicy="no-referrer"
                    className="w-full h-auto block"
                  />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Captura 3 incluida en <code className="font-mono">README.md</code>: Matriz biyectiva 0x00–0xFF y conmutador de 8 bits.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'theory' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
            <div className="text-xs font-mono text-rose-600 dark:text-rose-400">
              01 · Función Biyectiva 1:1
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              ¿Cómo funciona Base256 con Emojis?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Cualquier dato informático (texto ASCII, cadenas UTF-8 con tildes o eñes, claves criptográficas o archivos binarios) se almacena en memoria como un arreglo de bytes (<code className="font-mono text-xs text-slate-800 dark:text-slate-200">Uint8Array</code>). Como un byte tiene exactamente <code className="font-mono text-xs">2⁸ = 256</code> valores posibles (<code className="font-mono text-xs">0x00</code> a <code className="font-mono text-xs">0xFF</code>), un alfabeto de 256 emoticonos permite representar <strong>1 byte completo en cada símbolo visual</strong> sin necesidad de caracteres de relleno (padding).
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
            <div className="text-xs font-mono text-rose-600 dark:text-rose-400">
              02 · Esteganografía y Filtrado
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Camuflaje en Conversaciones de Texto
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Dado que los caracteres alfanuméricos latinos (<code className="font-mono text-xs">a-z, A-Z, 0-9</code>) y los signos de puntuación son disjuntos respecto a los bloques Unicode de emoticonos (<code className="font-mono text-xs">U+1F300..U+1F9FF</code>), el decodificador actúa como un filtro selectivo: ignora automáticamente cualquier texto de cobertura y reconstruye el buffer de bytes únicamente a partir de los emoticonos del diccionario activo.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
            <div className="text-xs font-mono text-rose-600 dark:text-rose-400">
              03 · Codificación ≠ Cifrado
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Integridad CRC-8 y Clave de Paso
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Codificar en Base256 transforma la representación, pero no oculta la entropía si el receptor conoce el diccionario. Para dotar de confidencialidad al mensaje, EmojiByte incluye un <strong>cifrado por flujo XOR derivado de contraseña</strong> previo al mapeo y un octeto final de <strong>suma de verificación CRC-8</strong> (polinomio <code className="font-mono text-xs">0x07</code>) que detecta si algún emoji fue eliminado o alterado.
            </p>
          </div>
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
                    Comparación visual rápida de hashes y esteganografía en chats/redes.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'ghpages' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-rose-500" />
                  1. Subir el Repositorio a GitHub
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Ejecuta estos comandos en la raíz del proyecto descargado y activa <strong>GitHub Actions</strong> en <em>Settings → Pages</em>.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyCommands}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                {copiedCommands ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copiar Comandos Git
                  </>
                )}
              </button>
            </div>

            <pre className="p-4 bg-slate-950 text-slate-200 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
              <code>{gitPushCommands}</code>
            </pre>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  2. Workflow Incluido (.github/workflows/deploy.yml)
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Ya incluido en el proyecto: compila <code className="font-mono">./dist</code> y despliega automáticamente en cada <code className="font-mono">push</code>.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyYaml}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                {copiedWorkflow ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copiar YAML
                  </>
                )}
              </button>
            </div>

            <pre className="p-4 bg-slate-950 text-slate-200 rounded-lg font-mono text-xs max-h-56 overflow-y-auto leading-relaxed border border-slate-800">
              <code>{ghActionsYaml}</code>
            </pre>
          </div>
        </div>
      )}
    </section>
  );
};
