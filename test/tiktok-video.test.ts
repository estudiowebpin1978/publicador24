import { test } from "node:test";
import assert from "node:assert/strict";
import { selectTikTokFrames, planTikTokVideo } from "../src/lib/video/tiktok-frames.ts";

test("selectTikTokFrames prefiere la imagen propia de la campaña", () => {
  const frames = selectTikTokFrames(
    "https://host/propia.png",
    "https://host/ia.png",
    ["https://host/propia.png", "https://host/otra.png"]
  );
  assert.equal(frames[0], "https://host/propia.png");
});

test("selectTikTokFrames usa la imagen generada cuando no hay propia", () => {
  const frames = selectTikTokFrames("", "https://host/ia.png", []);
  assert.deepEqual(frames, ["https://host/ia.png"]);
});

test("selectTikTokFrames completa con el resto de assets de la campaña", () => {
  const frames = selectTikTokFrames("", "", [
    "https://host/a.png",
    "https://host/b.png",
    "https://host/a.png",
  ]);
  assert.deepEqual(frames, ["https://host/a.png", "https://host/b.png"]);
});

test("selectTikTokFrames devuelve [] sin ningún asset (caller debe omitir el post)", () => {
  assert.deepEqual(selectTikTokFrames("", "", []), []);
  assert.deepEqual(selectTikTokFrames("", "", ["", ""]), []);
});

test("selectTikTokFrames no duplica la propia cuando también está en la campaña", () => {
  const frames = selectTikTokFrames(
    "https://host/propia.png",
    "https://host/propia.png",
    ["https://host/propia.png"]
  );
  assert.deepEqual(frames, ["https://host/propia.png"]);
});

test("planTikTokVideo usa 3 frames de 2s cuando hay assets suficientes", () => {
  const plan = planTikTokVideo(["a.png", "b.png", "c.png", "d.png"]);
  assert.equal(plan.frames.length, 3);
  assert.equal(plan.secondsPerImage, 2);
  assert.equal(plan.seconds, 6);
});

test("planTikTokVideo estira el único frame para no quedar en un video de 2s", () => {
  const plan = planTikTokVideo(["a.png"]);
  assert.equal(plan.frames.length, 1);
  assert.equal(plan.secondsPerImage, 6);
  assert.equal(plan.seconds, 6);
});

test("planTikTokVideo descarta entradas vacías y no baja de 6 segundos", () => {
  const plan = planTikTokVideo(["", "a.png", "b.png"]);
  assert.deepEqual(plan.frames, ["a.png", "b.png"]);
  assert.equal(plan.secondsPerImage, 3);
  assert.equal(plan.seconds, 6);
});

test("planTikTokVideo sin imágenes no arma video", () => {
  const plan = planTikTokVideo([]);
  assert.deepEqual(plan.frames, []);
  assert.equal(plan.seconds, 0);
});
