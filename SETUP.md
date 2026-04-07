# AutoApply Chile — Guía de Configuración

## Paso 1: Supabase

1. Ve a https://supabase.com y crea un proyecto nuevo (elige región "South America")
2. Ve a **SQL Editor** y pega el contenido de `supabase/migrations/001_initial_schema.sql` → Ejecutar
3. Ve a **Settings → API** y copia:
   - `URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` → `SUPABASE_SERVICE_ROLE_KEY`
4. Ve a **Authentication → URL Configuration** y agrega:
   - Site URL: `https://tu-app.vercel.app`
   - Redirect URLs: `https://tu-app.vercel.app/auth/callback`

## Paso 2: APIs externas

**Anthropic (Claude):**
- https://console.anthropic.com → API Keys → Create key
- Copia como `ANTHROPIC_API_KEY`

**RapidAPI (JSearch):**
- https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
- Crea cuenta → Subscribe al plan Free → Copia tu API Key
- Copia como `RAPIDAPI_KEY`

**Resend (emails):**
- https://resend.com → Create API Key
- Agrega y verifica tu dominio (o usa el dominio de prueba `onboarding@resend.dev` para testing)
- Copia como `RESEND_API_KEY`
- Configura `RESEND_FROM_EMAIL=AutoApply Chile <noreply@tudominio.cl>`

## Paso 3: Variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto con:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
RAPIDAPI_KEY=xxxx
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=AutoApply Chile <noreply@tudominio.cl>
CRON_SECRET=inventa_cualquier_string_largo_y_seguro_aqui
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Paso 4: Probar en local

```bash
cd frontend
npm run dev
```

Abre http://localhost:3000

## Paso 5: Deploy en Vercel

1. Instala Vercel CLI: `npm i -g vercel`
2. `vercel login`
3. `vercel` (sigue el wizard, elige el directorio `frontend/`)
4. En el dashboard de Vercel → Settings → Environment Variables → agrega TODAS las variables del .env.local
5. Re-deploy: `vercel --prod`

## Cómo funciona el Cron

El archivo `vercel.json` configura el cron para ejecutarse a las 12:00 UTC (9:00 AM Chile en verano).
Vercel llama automáticamente a `/api/cron/daily-apply` con el header `Authorization: Bearer {CRON_SECRET}`.

Para testear el cron manualmente:
```bash
curl -H "Authorization: Bearer TU_CRON_SECRET" https://tu-app.vercel.app/api/cron/daily-apply
```

## Estructura de la app

```
/              → Landing (si no estás logueado)
/auth/login    → Login
/auth/register → Registro
/profile/setup → Onboarding (subir CV + preferencias)
/dashboard     → Ver postulaciones enviadas
/jobs          → Ver trabajos disponibles + postular manualmente
```
