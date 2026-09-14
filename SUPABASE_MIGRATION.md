# MIGRACION: Convex → Supabase
# Proyecto: publicador24
# Usuario: estudion

## Datos actuales en Convex (NO ROMPER):
- Proyecto: Quiniela IA (p57bv3cbz0wmgyqkb0b98jsfz98ecskh) - ACTIVO
- Campaña: Quiniela IA - Captacion (jx76ajaazt538hfdq43psnd7a98edyyj) - ACTIVE
- Content pack: k971kr0tjc7rr13f991ehvqqe18ed6t2
- Content pieces: 6 (3 Instagram + 3 TikTok)
- User: test@publicador24.netlify.app

## Migracion paso a paso (sin romper Convex):

1. Configurar Supabase con las tablas equivalentes
2. Migrar datos de Convex → Supabase
3. Actualizar .env.local con keys de Supabase
4. Configurar Vercel con variables
5. Configurar cron-job.org

## Tablas a crear en Supabase:
- projects (id, name, description, website, status, created_at)
- campaigns (id, project_id, name, objective, status, autopilot_level, ...)
- content_packs (id, campaign_id, name, status, ...)
- content_pieces (id, pack_id, campaign_id, hook, body, platform, status, ...)
- users (id, email, name, created_at)

## NOTA IMPORTANTE:
No eliminar datos de Convex. Solo duplicar en Supabase.
La app seguira funcionando con Convex mientras se prueba Supabase.
