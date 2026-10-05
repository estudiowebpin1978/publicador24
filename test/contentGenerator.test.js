const { ContentGenerator } = require('../src/contentGenerator');

describe('Content Generator Tests', () => {
  test('Generates content in multiple languages', async () => {
    const generator = new ContentGenerator();
    const result = await generator.generate({
      language: 'es',
      topic: 'SEO'
    });
    expect(result).toContain('optimización');
  });

  test('SEO metadata generation', () => {
    const generator = new ContentGenerator();
    const metadata = generator.generateSEO({
      title: 'Multilingual SEO',
      keywords: ['SEO', 'multilingüe']
    });
    expect(metadata).toContain('keywords=SEO,multilingüe');
  });
});