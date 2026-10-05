import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeText,
  tokenize,
  jaccardSimilarity,
  levenshteinNormalized,
  textSimilarity,
  maxSimilarityVs,
  DUPLICATE_SIMILARITY_THRESHOLD,
} from '../shared/text-similarity.ts';

test('normalizeText pasa a minúsculas, quita acentos y puntuación', () => {
  assert.equal(normalizeText('¡Quiniela, Analyzed! — 2024'), 'quiniela analyzed 2024');
});

test('tokenize filtra stopwords y palabras cortas', () => {
  const tokens = tokenize('la quiniela de la ciudad es muy buena');
  assert.ok(tokens.has('quiniela'));
  assert.ok(tokens.has('ciudad'));
  assert.ok(!tokens.has('la'));
  assert.ok(!tokens.has('es'));
});

test('un texto idéntico tiene similitud 1', () => {
  const text = 'Los números más salientes de la quiniela ciudad este mes';
  assert.equal(textSimilarity(text, text), 1);
});

test('textos sin solaparse quedan por debajo del umbral', () => {
  const a = 'Recetas fáciles para el domingo con ingredientes de la verdulería';
  const b = 'Cómo configurar el router y mejorar la velocidad de tu internet';
  assert.ok(textSimilarity(a, b) < DUPLICATE_SIMILARITY_THRESHOLD);
});

test('un paráfrasis cercano supera el umbral (se marca como duplicado)', () => {
  const a = 'Los números más salientes de la quiniela ciudad este mes';
  const b = 'Los números más salientes de la quiniela ciudad de este mes';
  const result = maxSimilarityVs(b, [a]);
  assert.ok(result.isDuplicate, `esperaba duplicado, obtuve ${result.similarity}`);
  assert.equal(DUPLICATE_SIMILARITY_THRESHOLD, 0.75);
});

test('maxSimilarityVs devuelve 0 cuando no hay historial', () => {
  const result = maxSimilarityVs('algo completamente nuevo para publicar', []);
  assert.equal(result.similarity, 0);
  assert.equal(result.isDuplicate, false);
});

test('maxSimilarityVs corta apenas supera el umbral', () => {
  const existing = ['publicación repetida de prueba para comparar', 'otra publicación repetida de prueba'];
  const result = maxSimilarityVs('publicación repetida de prueba para comparar', existing);
  assert.ok(result.isDuplicate);
});

test('jaccardSimilarity maneja conjuntos vacíos', () => {
  assert.equal(jaccardSimilarity(new Set<string>(), new Set<string>()), 1);
  assert.equal(jaccardSimilarity(new Set(['a']), new Set<string>()), 0);
});

test('levenshteinNormalized: 1 para igual, cercano a 0 para cadenas distintas', () => {
  assert.equal(levenshteinNormalized('hola mundo', 'hola mundo'), 1);
  assert.ok(levenshteinNormalized('hola mundo', 'chau gente') < 0.3);
});
