import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  findProhibitedClaims,
  hasProhibitedClaim,
  PROHIBITED_CLAIMS,
} from '../shared/prohibited-claims.ts';
import { checkPublicationSafety } from '../src/lib/ai/publication-safety.ts';

const LEGIT =
  'Mirá los números más salientes del sorteo de anoche y compará con el histórico. Análisis estadístico, no garantiza resultados.';

test('bloquea la promesa de ganancia garantizada', () => {
  const claims = findProhibitedClaims('Jugá con nosotros y ganás seguro siempre');
  assert.ok(claims.length > 0, 'esperaba detectar promesa de ganancia');
});

test('bloquea el porcentaje de usuarios inventado (caso real de la campaña)', () => {
  const claims = findProhibitedClaims(
    'La marca informó que 23% de nuestros usuarios ya ganaron con sus pronósticos.'
  );
  assert.ok(claims.length > 0, 'esperaba detectar estadística no verificable');
  assert.ok(claims.includes('estadística de ganancias no verificable'));
});

test('bloquea dinero fácil, "no podés perder" y garantías de resultados', () => {
  assert.ok(hasProhibitedClaim('Generá dinero fácil desde tu casa'));
  assert.ok(hasProhibitedClaim('Con este método no podés perder nunca'));
  assert.ok(hasProhibitedClaim('Garantizamos ganancias a 30 días'));
});

test('permite análisis estadístico legítimo', () => {
  const claims = findProhibitedClaims(LEGIT);
  assert.deepEqual(claims, []);
  assert.equal(hasProhibitedClaim(LEGIT), false);
});

test('los patterns no son sensibles al estado de lastIndex (usa /i, no /g)', () => {
  const text = 'Ganar plata sin hacer nada, según esta publicidad engañosa';
  for (const claim of PROHIBITED_CLAIMS) {
    claim.pattern.test('texto neutral');
  }
  assert.ok(findProhibitedClaims(text).length > 0);
});

test('checkPublicationSafety aprueba contenido normal', async () => {
  const result = await checkPublicationSafety(
    'piece-1',
    'Los números que más salieron este mes',
    LEGIT,
    'instagram',
    []
  );
  assert.equal(result.approved, true);
  assert.equal(result.checks.claims.pass, true);
});

test('checkPublicationSafety bloquea una promesa prohibida', async () => {
  const result = await checkPublicationSafety(
    'piece-2',
    'Ganá seguro con estos pronósticos',
    'El 80% de nuestros usuarios ya ganó plata con nuestro sistema infalible.',
    'instagram',
    []
  );
  assert.equal(result.approved, false);
  assert.equal(result.checks.claims.pass, false);
  assert.ok(result.reason?.includes('Promesa prohibida'));
  assert.ok(result.safetyScore < 70, `score ${result.safetyScore}`);
});

test('checkPublicationSafety bloquea duplicados con el umbral único (0.75)', async () => {
  const existing = [`${'Los números más salientes del sorteo'} ${LEGIT}`];
  const result = await checkPublicationSafety(
    'piece-3',
    'Los números más salientes del sorteo',
    LEGIT,
    'instagram',
    existing
  );
  assert.equal(result.approved, false);
  assert.equal(result.checks.duplicate.pass, false);
});

test('"sorteo" y "ganador" no se consideran spam (términos del nicho)', async () => {
  const result = await checkPublicationSafety(
    'piece-4',
    'Resultados del sorteo',
    'Mirá quién fue el ganador del sorteo de anoche y qué números salieron en la quiniela de la ciudad.',
    'instagram',
    []
  );
  assert.equal(result.checks.spamRisk.pass, true);
  assert.equal(result.approved, true);
});
