interface Campaign {
  name: string;
  description: string;
  cta: string;
  url: string;
}

export async function generateLandingPage(campaign: Campaign): Promise<string> {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${campaign.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0f;
      color: #e2e8f0;
      min-height: 100vh;
    }
    .hero {
      min-height: 70vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 2rem;
      background: radial-gradient(ellipse at top, rgba(139,92,246,0.15) 0%, transparent 60%),
                  radial-gradient(ellipse at bottom right, rgba(217,70,239,0.1) 0%, transparent 50%);
    }
    .badge {
      display: inline-block;
      padding: 0.35rem 1rem;
      border-radius: 9999px;
      background: rgba(139,92,246,0.15);
      border: 1px solid rgba(139,92,246,0.3);
      color: #a78bfa;
      font-size: 0.8rem;
      font-weight: 500;
      margin-bottom: 1.5rem;
      letter-spacing: 0.05em;
    }
    h1 {
      font-size: clamp(2rem, 6vw, 3.5rem);
      font-weight: 700;
      line-height: 1.15;
      margin-bottom: 1rem;
      background: linear-gradient(135deg, #fff 0%, #c4b5fd 50%, #f0abfc 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .description {
      font-size: 1.15rem;
      color: #94a3b8;
      max-width: 600px;
      line-height: 1.6;
      margin-bottom: 2rem;
    }
    .cta-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.85rem 2rem;
      border-radius: 0.75rem;
      background: linear-gradient(135deg, #7c3aed, #d946ef);
      color: #fff;
      font-size: 1rem;
      font-weight: 600;
      text-decoration: none;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 4px 20px rgba(139,92,246,0.4);
    }
    .cta-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 30px rgba(139,92,246,0.5);
    }
    .form-section {
      max-width: 480px;
      margin: 0 auto;
      padding: 2rem;
    }
    .form-section h2 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: #fff;
    }
    .form-section p {
      color: #64748b;
      font-size: 0.9rem;
      margin-bottom: 1.5rem;
    }
    .form-group {
      margin-bottom: 1rem;
    }
    .form-group input {
      width: 100%;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.05);
      color: #e2e8f0;
      font-size: 0.95rem;
      outline: none;
      transition: border-color 0.2s;
    }
    .form-group input::placeholder { color: #475569; }
    .form-group input:focus { border-color: #8b5cf6; }
    .submit-btn {
      width: 100%;
      padding: 0.75rem;
      border-radius: 0.5rem;
      background: linear-gradient(135deg, #7c3aed, #d946ef);
      color: #fff;
      font-size: 0.95rem;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .submit-btn:hover { opacity: 0.9; }
    footer {
      text-align: center;
      padding: 2rem;
      color: #475569;
      font-size: 0.8rem;
      border-top: 1px solid rgba(255,255,255,0.05);
    }
    @media (max-width: 640px) {
      .hero { min-height: 60vh; padding: 1.5rem; }
      .form-section { padding: 1.5rem; }
    }
  </style>
</head>
<body>
  <section class="hero">
    <div class="badge">AUTO PUBLICADOR</div>
    <h1>${campaign.name}</h1>
    <p class="description">${campaign.description}</p>
    <a href="${campaign.url || '#form'}" class="cta-btn">${campaign.cta}</a>
  </section>

  <section id="form" class="form-section">
    <h2>Dejanos tu info</h2>
    <p>Unete y recibi acceso anticipado.</p>
    <form onsubmit="event.preventDefault(); this.querySelector('button').textContent='Enviado ✓'; this.querySelector('button').disabled=true;">
      <div class="form-group">
        <input type="text" placeholder="Tu nombre" required />
      </div>
      <div class="form-group">
        <input type="email" placeholder="Tu email" required />
      </div>
      <div class="form-group">
        <input type="tel" placeholder="Tu telefono (opcional)" />
      </div>
      <button type="submit" class="submit-btn">${campaign.cta}</button>
    </form>
  </section>

  <footer>Generado con Auto Publicador</footer>
</body>
</html>`;
}
