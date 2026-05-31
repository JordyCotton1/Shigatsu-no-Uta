import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY en las variables de entorno.');
}

// Creo el cliente de Supabase con las variables publicas para que toda la app use la misma conexion.
export const supabase = createClient(supabaseUrl, supabasePublishableKey);
