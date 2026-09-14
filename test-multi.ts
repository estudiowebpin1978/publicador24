// Test multi-provider system with env vars from .env.local
import { readFileSync } from "fs";
import { join } from "path";

// Load .env.local
const envPath = join(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
envContent.split("\n").forEach((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
});

import { generateTextWithFallback } from "./src/lib/ai/multi-provider";
import { generateImageWithFallback } from "./src/lib/ai/multi-image";

async function main() {
  console.log("=== MULTI-PROVIDER TEST ===\n");
  console.log(`GROQ_API_KEY: ${process.env.GROQ_API_KEY ? "SET" : "NOT SET"}`);
  console.log(`OPENROUTER_API_KEY: ${process.env.OPENROUTER_API_KEY ? "SET" : "NOT SET"}\n`);

  // Test 1: Text generation
  console.log("Test 1: Text generation (Groq → OpenRouter)");
  try {
    const result = await generateTextWithFallback(
      "Generá un hook para Instagram sobre quiniela IA en 10 palabras",
      "Sos un experto en copywriting"
    );
    console.log(`  Provider: ${result.provider}`);
    console.log(`  Model: ${result.model}`);
    console.log(`  Text: ${result.text.substring(0, 150)}`);
    console.log(`  Tokens: ${result.tokens_used}`);
  } catch (error) {
    console.log(`  Error: ${error.message}`);
  }

  // Test 2: Image generation
  console.log("\nTest 2: Image generation (Pollinations)");
  try {
    const result = await generateImageWithFallback(
      "smartphone showing winning lottery numbers, neon purple, celebration",
      "1:1"
    );
    console.log(`  Provider: ${result.provider}`);
    console.log(`  URL: ${result.url.substring(0, 80)}...`);
    console.log(`  Size: ${result.width}x${result.height}`);
  } catch (error) {
    console.log(`  Error: ${error.message}`);
  }

  console.log("\n=== TEST COMPLETE ===");
}

main();
