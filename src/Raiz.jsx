import React, { useEffect, useState } from 'react';
import { supabase, temNuvem } from './supabase.js';
import BalthazarApp from './BalthazarApp.jsx';
import Sessao from './Sessao.jsx';

/**
 * Porta de entrada.
 *
 *  - Sem Supabase configurado: o app abre direto, guardando no navegador.
 *  - Com Supabase: pede login e só então entrega o app, com a sessão.
 */

export default function Raiz() {
  const [sessao, setSessao] = useState(null);
  const [carregando, setCarregando] = useState(temNuvem);

  useEffect(() => {
    if (!temNuvem) return undefined;

    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session || null);
      setCarregando(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_evento, nova) => {
      setSessao(nova || null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  if (carregando) return <div className="sessao carregando" />;
  if (temNuvem && !sessao) return <Sessao />;

  return <BalthazarApp sessao={sessao} />;
}
