/**
 * Proxy do Balthazar → API da Anthropic.
 *
 * Existe para a chave nunca sair do servidor. O front manda system,
 * messages e tools; esta função só repassa e devolve a resposta crua.
 *
 * IMPORTANTE: o nome da variável de ambiente abaixo (ANTHROPIC_API_KEY)
 * precisa bater com a que já está configurada na Vercel. Se o projeto
 * usar outro nome, ajuste aqui.
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY não configurada' });
  }

  try {
    const { system, messages, tools } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages é obrigatório' });
    }

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1200,
        system,
        messages,
        tools: tools && tools.length ? tools : undefined,
      }),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      console.error('Anthropic respondeu erro:', data);
      return res.status(upstream.status).json(data);
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('Falha no proxy do Balthazar:', err);
    return res.status(500).json({ error: 'Falha ao falar com o Balthazar' });
  }
}
