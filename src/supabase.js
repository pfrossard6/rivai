import { createClient } from '@supabase/supabase-js';

/**
 * Cliente do Supabase.
 *
 * Se as variáveis não estiverem configuradas (ambiente sem Supabase),
 * exporta null em vez de quebrar: o app cai no modo local, guardando
 * os dados só no navegador. Nada de tela branca por falta de chave.
 */

const url = process.env.REACT_APP_SUPABASE_URL;
const key = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const temNuvem = Boolean(url && key);

export const supabase = temNuvem ? createClient(url, key) : null;
