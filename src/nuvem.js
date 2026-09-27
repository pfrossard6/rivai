import { supabase, temNuvem } from './supabase.js';

/**
 * Estado do app na nuvem.
 *
 * Uma linha por usuário na tabela `estado`: { user_id, dados, atualizado_em }.
 * O app inteiro continua trabalhando com o mesmo objeto de estado — só o
 * lugar onde ele dorme mudou.
 */

const TABELA = 'estado';

/** Lê o estado guardado. Devolve null quando não há nada salvo ainda. */
export async function lerEstado(userId) {
  if (!temNuvem || !userId) return null;
  const { data, error } = await supabase
    .from(TABELA)
    .select('dados')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('Nuvem: falha ao ler o estado —', error.message);
    return null;
  }
  return data ? data.dados : null;
}

/** Grava o estado inteiro. Devolve true quando deu certo. */
export async function gravarEstado(userId, dados) {
  if (!temNuvem || !userId) return false;
  const { error } = await supabase
    .from(TABELA)
    .upsert({ user_id: userId, dados, atualizado_em: new Date().toISOString() }, { onConflict: 'user_id' });

  if (error) {
    console.warn('Nuvem: falha ao gravar o estado —', error.message);
    return false;
  }
  return true;
}
