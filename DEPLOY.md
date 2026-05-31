# Despliegue seguro

No subas `.env` al repositorio. La app se conecta a Supabase usando variables de entorno del hosting.

## Variables necesarias

Configura estas variables en Vercel, Netlify, Render u otro hosting:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu_publishable_key
VITE_SITE_URL=https://tu-sitio.netlify.app
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
3. Agrega las variables de arriba.
4. Ejecuta un nuevo deploy.

## En Netlify

1. Abre tu sitio en Netlify.
2. Ve a `Site configuration` -> `Environment variables`.
3. Agrega las variables de arriba.
4. Ejecuta un nuevo deploy.

## Configurar Supabase

Ejecuta `docs/supabase-setup.sql` en el SQL Editor de Supabase. Ese archivo no contiene claves secretas; solo crea tablas, policies RLS, bucket de Storage y permisos.

En Supabase, ve a `Authentication` -> `URL Configuration` y configura:

- `Site URL`: `https://tu-sitio.netlify.app`
- `Redirect URLs`: `https://tu-sitio.netlify.app/**`
- Para desarrollo local tambien puedes agregar: `http://localhost:5173/**`

Para convertir un usuario en administrador:

```sql
update public.profiles
set role = 'admin'
where email = 'correo-admin@example.com';
```
