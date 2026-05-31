# Despliegue seguro

No subas `.env` al repositorio. La app se conecta a Supabase usando variables de entorno del hosting.

## Variables necesarias

Configura estas variables en Vercel, Netlify, Render u otro hosting:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu_publishable_key
VITE_ADMIN_EMAIL=correo-admin@example.com
```

## Importante

- Usa solo la key `publishable` o `anon public` de Supabase.
- Nunca pongas `service_role` en un frontend.
- La seguridad real debe estar en Supabase con RLS activado.
- `.env.example` sirve como plantilla sin secretos.
- `.env` queda solo en tu maquina local y esta ignorado por Git.

## En Vercel

1. Abre tu proyecto en Vercel.
2. Ve a `Settings` -> `Environment Variables`.
3. Agrega las tres variables de arriba.
4. Ejecuta un nuevo deploy.

## En Netlify

1. Abre tu sitio en Netlify.
2. Ve a `Site configuration` -> `Environment variables`.
3. Agrega las tres variables de arriba.
4. Ejecuta un nuevo deploy.
