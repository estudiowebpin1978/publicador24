import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateFingerprint,
  detectDuplicates,
  type ContentFingerprint,
} from '../src/lib/content/duplicate-detector.ts';

const BASE = {
  text: 'Los números más salientes de la quiniela ciudad este mes para analizar',
  caption: 'Mirá el análisis completo de la quiniela ciudad, con datos históricos y tendencias.',
  hashtags: ['#quiniela', '#ciudad', '#analisis'],
};

test('la huella es estable para el mismo contenido', () => {
  const a = calculateFingerprint(BASE);
  const b = calculateFingerprint({ ...BASE });
  assert.equal(a.combined_hash, b.combined_hash);
  assert.ok(a.text_hash.length > 0);
  assert.ok(a.caption_hash);
  assert.ok(a.hashtags_hash);
});

test('huellas distintas para contenidos distintos', () => {
  const a = calculateFingerprint(BASE);
  const b = calculateFingerprint({
    ...BASE,
    text: 'Cómo arreglar la pileta de natación antes del verano en Rosario',
  });
  assert.notEqual(a.combined_hash, b.combined_hash);
});

test('conserva el texto y los hashtags originales (normalizados) para comparar', () => {
  const fp = calculateFingerprint({ ...BASE, text: 'Quiniela Análisis ¡YA!' });
  assert.equal(fp._original_text, 'quiniela analisis ya');
  assert.deepEqual(fp._original_hashtags, ['quiniela', 'ciudad', 'analisis']);
});

test('sin historial no hay duplicado', () => {
  const result = detectDuplicates({ ...BASE, existing_fingerprints: [] });
  assert.equal(result.is_duplicate, false);
  assert.equal(result.similarity_score, 0);
});

test('mismo contenido exacto → duplicado con score 1', () => {
  const existing: ContentFingerprint[] = [calculateFingerprint(BASE)];
  const result = detectDuplicates({ ...BASE, existing_fingerprints: existing });
  assert.equal(result.is_duplicate, true);
  assert.equal(result.similarity_score, 1);
});

test('contenido de otra campaña no se marca como duplicado', () => {
  const existing: ContentFingerprint[] = [calculateFingerprint(BASE)];
  const result = detectDuplicates({
    text: 'Cómo arreglar la pileta de natación antes del verano en Rosario',
    caption: 'Guía práctica con 5 pasos para limpiar el agua y evitar algas todo el verano.',
    hashtags: ['#pileta', '#verano', '#rosario'],
    existing_fingerprints: existing,
  });
  assert.equal(result.is_duplicate, false);
  assert.ok(result.similarity_score < 0.75, `score ${result.similarity_score}`);
});

test('mismo texto con distinta imagen → duplicado (la imagen no salva)', () => {
  const existing: ContentFingerprint[] = [calculateFingerprint({ ...BASE, media_hash: 'imagen-vieja' })];
  const result = detectDuplicates({ ...BASE, media_hash: 'imagen-nueva', existing_fingerprints: existing });
  assert.equal(result.is_duplicate, true);
  assert.ok(result.similarity_score >= 0.75, `score ${result.similarity_score}`);
});

test('el umbral se puede bajar para control más estricto', () => {
  const existing: ContentFingerprint[] = [calculateFingerprint(BASE)];
  const result = detectDuplicates({
    ...BASE,
    text: 'Los números más salientes de la quiniela ciudad este mes',
    existing_fingerprints: existing,
    similarity_threshold: 0.5,
  });
  assert.equal(result.is_duplicate, true);
});
