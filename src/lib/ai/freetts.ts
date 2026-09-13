export interface TTSResult {
  audioUrl: string;
  duration?: number;
  format: string;
}

export async function textToSpeech(
  text: string,
  voice: string = 'es-AR-Standard-A',
  speed: number = 1.0
): Promise<TTSResult> {
  const apiKey = process.env.FREETTS_API_KEY;
  if (!apiKey) throw new Error('FREETTS_API_KEY not set');

  const response = await fetch('https://api.freetts.com/v1/text-to-speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      text,
      voice,
      speed,
      format: 'mp3',
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`FreeTTS API error ${response.status}: ${body}`);
  }

  const data = await response.json();

  return {
    audioUrl: data.audio_url || data.url,
    duration: data.duration,
    format: 'mp3',
  };
}

export const SPANISH_VOICES = [
  { id: 'es-AR-Standard-A', name: 'Argentina - Femenina', country: 'AR' },
  { id: 'es-AR-Standard-B', name: 'Argentina - Masculina', country: 'AR' },
  { id: 'es-MX-Standard-A', name: 'México - Femenina', country: 'MX' },
  { id: 'es-MX-Standard-B', name: 'México - Masculina', country: 'MX' },
  { id: 'es-ES-Standard-A', name: 'España - Femenina', country: 'ES' },
  { id: 'es-ES-Standard-B', name: 'España - Masculina', country: 'ES' },
  { id: 'es-CO-Standard-A', name: 'Colombia - Femenina', country: 'CO' },
  { id: 'es-CO-Standard-B', name: 'Colombia - Masculina', country: 'CO' },
];
