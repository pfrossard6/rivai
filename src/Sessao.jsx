import React, { useState } from 'react';
import { supabase } from './supabase.js';
import { Mark, Rivers } from './balthazar/Marks.jsx';
import './balthazar.css';

/**
 * Entrada: e-mail e senha.
 *
 * Mesma linguagem do modo voz — azul profundo, monóculo, dourado.
 * Serve para entrar e para criar conta; o Supabase decide o resto.
 */

export default function Sessao() {
  const [modo, setModo] = useState('entrar');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState(null);
  const [aviso, setAviso] = useState(null);

  async function enviar(e) {
    e.preventDefault();
    if (!email.trim() || !senha) return;
    setOcupado(true);
    setErro(null);
    setAviso(null);

    try {
      if (modo === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: senha });
        if (error) throw error;
        if (data?.user && !data.session) {
          setAviso('Conta criada. Confirme o e-mail e volte para entrar.');
        }
      }
    } catch (err) {
      setErro(traduz(err.message));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="sessao">
      <Rivers />
      <form className="ss-caixa" onSubmit={enviar}>
        <div className="ss-marca">
          <Mark size={96} onDeep />
        </div>
        <p className="ss-nome">
          Riv<span className="d">.</span>AI
        </p>
        <p className="ss-tag">o rumo certo, sem ruído</p>

        <label className="ss-campo">
          <span>e-mail</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            placeholder="voce@exemplo.com"
            required
          />
        </label>

        <label className="ss-campo">
          <span>senha</span>
          <input
            type="password"
            autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
            value={senha}
            onChange={(ev) => setSenha(ev.target.value)}
            placeholder="mínimo de 6 caracteres"
            minLength={6}
            required
          />
        </label>

        {erro && <p className="ss-erro">{erro}</p>}
        {aviso && <p className="ss-aviso">{aviso}</p>}

        <button className="ss-entrar" type="submit" disabled={ocupado}>
          {ocupado ? 'um instante…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
        </button>

        <button
          className="ss-troca"
          type="button"
          onClick={() => {
            setModo(modo === 'entrar' ? 'criar' : 'entrar');
            setErro(null);
            setAviso(null);
          }}
        >
          {modo === 'entrar' ? 'criar uma conta' : 'já tenho conta'}
        </button>
      </form>
    </div>
  );
}

function traduz(msg) {
  const m = String(msg || '').toLowerCase();
  if (m.includes('invalid login')) return 'E-mail ou senha não conferem.';
  if (m.includes('already registered')) return 'Esse e-mail já tem conta. Entre com ele.';
  if (m.includes('password')) return 'A senha precisa de pelo menos 6 caracteres.';
  if (m.includes('signups not allowed')) return 'A criação de contas está desligada neste projeto.';
  return msg;
}
