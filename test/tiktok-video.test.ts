import { test } from "node:test";
import assert from "node:assert/strict";
import { selectTikTokFrames } from "../src/lib/video/tiktok-frames.ts";

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
