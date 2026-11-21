# Migración de hosting (Vercel → otro proveedor)

Estado: el deploy en Vercel está **bloqueado por cuenta** (`402 Payment
Required / DEPLOYMENT_DISABLED`), no por código. Todo el código ya es portable:
no hay ninguna dependencia `@vercel/*` en `package.json`, y el dominio ya no
está hardcodeado (ver `src/lib/site-url.ts`).

Si Vercel se recupera (Billing → revisar tarjeta / ciclo mensual), no hay que
migrar nada: `npx vercel --prod --yes` restaura todo igual que antes.

---

## 1. Qué cambió en el código

| Antes | Ahora |
|---|---|
| Dominio hardcodeado en 9 archivos (25 refs) | `getBaseUrl()` / `absoluteUrl()` en `src/lib/site-url.ts` |
| Cron en `vercel.json` | Workflow `.github/workflows/cron-autopilot.yml` |
| — | `.env.example` documenta `NEXT_PUBLIC_APP_URL` y `CRON_SECRET` |

Resolución de la URL base (en este orden):

1. `NEXT_PUBLIC_APP_URL` (la que ya usaban los adapters sociales)
2. `APP_URL`
3. Fallback al dominio de Vercel (comportamiento idéntico al anterior si no
   hay env seteada)

`src/lib/bulkpublish/oauth-core.ts` resuelve su fallback **sin imports** a
propósito: es un módulo puro testeable con `node --test`.

---

## 2. Opciones gratuitas evaluadas

| Hosting | Cron gratis | ffmpeg (`execFile`) | Limitación principal |
|---|---|---|---|
| **Render Free** | ❌ (usan GitHub Actions) | ✅ | 512 MB RAM + spin-down a los 15 min |
| **Oracle Cloud Always Free** | ✅ (systemd timer) | ✅ | Requiere VM + nginx, más setup |
| Cloudflare Workers/Pages | — | ❌ | Sin `child_process` → rompe los reels |
| Netlify | ❌ | ✅ | Timeout de 10 s por request |
| Railway / Fly / Koyeb | — | ✅ | Solo trial, después de pago |

**Recomendación:** Render Free si querés salir andando en minutos (aceptando el
riesgo de 512 MB durante el render de video); Oracle Cloud Free VM (4 OCPU
ARM / 24 GB, siempre gratis) si querés rendimiento de verdad y no te molesta
mantener una VM.

---

## 3. Pasos de migración

### 3.1 Elegir la URL pública

Ejemplos:
- Render: `https://autopublicador.onrender.com`
- Oracle: `https://tudominio.com` o `https://<-ip>.nip.io`

### 3.2 Variables de entorno en el nuevo hosting

Copiar **todas** las env de Vercel (Settings → Environment Variables) y
agregar/actualizar:

```
NEXT_PUBLIC_APP_URL=<URL pública nueva>
APP_URL=<URL pública nueva>
CRON_SECRET=<mismo valor que usaba Vercel>
```

> `NEXT_PUBLIC_APP_URL` se inyecta en build: hay que **re-buildar** después de
> cambiarla.

### 3.3 Deploy

**Render (Web Service):**
- Build Command: `npm ci && npm run build`
- Start Command: `npm run start`
- Node: 20 o 22
- No hace falta Dockerfile

**Oracle Cloud (VM):**
```bash
# en la VM
git clone <repo> && cd autopublicador
npm ci && npm run build
# systemd: Restart=always, EnvironmentFile=/opt/autopublicador/.env
# nginx reverse proxy -> 127.0.0.1:3000 con proxy_read_timeout 1150s
```

### 3.4 Cron (reemplaza `vercel.json`)

GitHub Actions ya está en `.github/workflows/cron-autopilot.yml`
(`0 13 * * *` UTC = 10:00 ARG, igual que antes).

Configurar en el repo → **Settings → Secrets and variables → Actions**:

| Tipo | Nombre | Valor |
|---|---|---|
| Variable | `APP_BASE_URL` | URL pública del nuevo hosting |
| Secret | `CRON_SECRET` | igual al de la app |

> ⚠️ GitHub desactiva los `schedule` tras 60 días sin actividad en el repo.
> Un `git commit` periódico lo mantiene vivo.

`vercel.json` se puede dejar: es inofensivo si Vercel ya no hace deploy.

### 3.5 Callbacks OAuth (paso manual obligatorio)

El `redirect_uri` debe coincidir **byte a byte** con el registrado en cada
proveedor:

**Google / YouTube** (Client ID `197688740927-…apps.googleusercontent.com`)
→ [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
→ agregar como **Authorized redirect URI**:
```
<URL nueva>/api/auth/youtube/callback
```
Los refresh tokens existentes siguen válidos (están atados al `client_id`,
no al redirect URI): YouTube sigue publicando sin re-autorizar. Solo hace falta
registrar la URI nueva para un futuro re-login.

**Meta (Facebook/Instagram)** → Meta for Developers → tu app → Settings →
Basic → Valid OAuth Redirect URIs:
```
<URL nueva>/api/meta/callback
```

**BulkPublish** → si tenés `BULKPUBLISH_REDIRECT_URI` seteada, actualizarla;
si no, el fallback ahora sigue a `NEXT_PUBLIC_APP_URL` automáticamente.

### 3.6 Smoke test

```bash
curl -s -o /dev/null -w "%{http_code}\n" <URL nueva>/api/health
curl -s -H "Authorization: Bearer $CRON_SECRET" <URL nueva>/api/cron/autopilot
curl -s "<URL nueva>/api/admin/diag?test=ytstatus&secret=$CRON_SECRET"
```

Y verificar en GitHub Actions que el workflow `Autopilot diario` corrió verde.

---

## 4. Checklist

- [ ] Elegido hosting y URL pública
- [ ] Env copiadas + `NEXT_PUBLIC_APP_URL` / `APP_URL` / `CRON_SECRET` nuevas
- [ ] Deploy build+start OK, `/api/health` responde 200
- [ ] Google Cloud Console: redirect URI de YouTube actualizada
- [ ] Meta App: redirect URI actualizada
- [ ] GitHub Actions: `APP_BASE_URL` + `CRON_SECRET` configurados
- [ ] Primer cron manual (`workflow_dispatch`) verde
- [ ] YouTube sigue publicando (diag `test=ytstatus` → `ok: true`)
- [ ] CTA de los posts apunta a `https://quiniela-ia-two.vercel.app/`
      (es el sitio de la campaña, **no** cambia con la migración)
