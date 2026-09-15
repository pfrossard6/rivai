/**
 * Voz do Balthazar → ElevenLabs.
 *
 * Recebe { text } e devolve o áudio em mp3. A chave fica só no servidor.
 * Variáveis: ELEVENLABS_API_KEY (obrigatória) e ELEVENLABS_VOICE_ID
 * (opcional; o padrão é a voz Matheus escolhida pelo Pedro).
 *
 * Custo: a ElevenLabs cobra por caractere, então o texto é cortado
 * em 600 caracteres. O app só manda respostas curtas.
 */

const VOZ_PADRAO = 'oArP4WehPe3qjqvCwHNo';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' });
  }

  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    return res.status(503).json({ error: 'Voz não configurada' });
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID || VOZ_PADRAO;
  const text = String((req.body || {}).text || '').trim().slice(0, 600);
  if (!text) {
    return res.status(400).json({ error: 'text é obrigatório' });
  }

  try {
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': key,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.71,
            style: 0.72,
            use_speaker_boost: true,
            speed: 1.2,
          },
        }),
      }
    );

    if (!upstream.ok) {
      const detalhe = await upstream.text();
      console.error('ElevenLabs respondeu erro:', upstream.status, detalhe);
      return res.status(upstream.status).json({ error: 'Falha ao gerar a voz' });
    }

    const audio = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(audio);
  } catch (err) {
    console.error('Falha na voz do Balthazar:', err);
    return res.status(500).json({ error: 'Falha ao gerar a voz' });
  }
}
