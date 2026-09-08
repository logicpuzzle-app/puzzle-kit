import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Compile only in memory: verify that embedded sources describe the shipped
// JavaScript, declarations, and both sets of mappings, without an upstream checkout.
const directory = resolve(dirname(fileURLToPath(import.meta.url)), '../solver');
const sourceRoot = resolve(directory, '.verification/src');
const outputRoot = resolve(directory, '.verification/dist');
const sources = new Map();
const maps = new Map();
for (const name of readdirSync(directory, { recursive: true }).filter(name => name.endsWith('.map')).sort()) {
  const map = JSON.parse(readFileSync(resolve(directory, name), 'utf8'));
  assert.equal(map.version, 3, name);
  assert.equal(map.sourceRoot, '', name);
  assert.equal(map.sources.length, 1, name);
  assert.equal(map.sourcesContent?.length, 1, `${name}: missing embedded source`);
  assert.equal(typeof map.sourcesContent[0], 'string', name);
  const sourceName = name.replace(/\.(?:js|d\.ts)\.map$/, '.ts');
  assert.equal(map.sources[0], `solver-kit:///src/${sourceName.split(sep).join('/')}`, name);
  const path = resolve(sourceRoot, sourceName);
  if (sources.has(path)) assert.equal(sources.get(path), map.sourcesContent[0], `${name}: sources disagree`);
  sources.set(path, map.sourcesContent[0]);
  maps.set(name, map);
}
const artifacts = readdirSync(directory, { recursive: true }).filter(name => /\.(js|d\.ts)$/.test(name));
assert(artifacts.length > 0, 'No solver artifacts found');
assert.equal(maps.size, artifacts.length, 'Every artifact must have a map');
for (const name of artifacts) {
  assert(maps.has(`${name}.map`), `${name}: missing map`);
  assert(readFileSync(resolve(directory, name), 'utf8').endsWith(`//# sourceMappingURL=${name.split(sep).at(-1)}.map`), `${name}: invalid map reference`);
}

const options = {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler, lib: ['lib.es2022.d.ts'],
  rootDir: sourceRoot, outDir: outputRoot, declaration: true, declarationMap: true,
  sourceMap: true, strict: true, esModuleInterop: true, skipLibCheck: true,
  forceConsistentCasingInFileNames: true, resolveJsonModule: true,
  isolatedModules: true, noUnusedLocals: true, noUnusedParameters: true,
  noImplicitReturns: true, noFallthroughCasesInSwitch: true,
};
const host = ts.createCompilerHost(options);
const disk = { ...host };
host.fileExists = path => sources.has(path) || disk.fileExists(path);
host.readFile = path => sources.get(path) ?? disk.readFile(path);
host.directoryExists = path => [...sources.keys()].some(source => source.startsWith(`${path}${sep}`)) || disk.directoryExists(path);
host.getSourceFile = (path, version, onError) => sources.has(path)
  ? ts.createSourceFile(path, sources.get(path), version)
  : disk.getSourceFile(path, version, onError);
const output = new Map();
host.writeFile = (path, contents) => output.set(relative(outputRoot, path), contents);
const program = ts.createProgram([...sources.keys()], options, host);
const diagnostics = ts.getPreEmitDiagnostics(program);
assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
  getCurrentDirectory: ts.sys.getCurrentDirectory,
  getCanonicalFileName: name => name,
  getNewLine: () => '\n',
}));
assert.equal(program.emit().emitSkipped, false, 'Source verification did not emit');
assert.equal(output.size, artifacts.length + maps.size, 'Unexpected emitted artifacts');
for (const name of artifacts) {
  assert.equal(output.get(name), readFileSync(resolve(directory, name), 'utf8'), `${name}: embedded source does not reproduce artifact`);
  const { sourcesContent: _content, sources: _paths, ...actual } = maps.get(`${name}.map`);
  const { sources: _generatedPaths, ...expected } = JSON.parse(output.get(`${name}.map`));
  assert.deepEqual(actual, expected, `${name}: embedded source does not reproduce mappings`);
}
console.log(`Solver sourcemaps: ${sources.size} embedded sources reproduce ${artifacts.length} artifacts and ${maps.size} maps.`);
