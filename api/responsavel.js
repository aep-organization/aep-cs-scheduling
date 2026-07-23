/* ==========================================================================
   Vercel Serverless Function — proxy do webhook de responsáveis (n8n)
   A URL do webhook fica só aqui (env var no servidor), nunca no navegador.
   Repassa email/cpf ao n8n e devolve a resposta como veio. Nunca loga PII.
   ========================================================================== */

const TIMEOUT_MS = 8000;

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const webhookUrl = process.env.WEBHOOK_RESPONSAVEL_URL;
  if (!webhookUrl) {
    res.status(500).json({
      error: true,
      message: 'WEBHOOK_RESPONSAVEL_URL não configurada no ambiente do servidor.'
    });
    return;
  }

  const email = typeof req.query.email === 'string' ? req.query.email : '';
  const cpf = typeof req.query.cpf === 'string' ? req.query.cpf : '';

  let target;
  try {
    target = new URL(webhookUrl);
  } catch (err) {
    res.status(500).json({ error: true, message: 'WEBHOOK_RESPONSAVEL_URL inválida.' });
    return;
  }
  if (email) target.searchParams.set('email', email);
  if (cpf) target.searchParams.set('cpf', cpf);

  const controller = new AbortController();
  const timer = setTimeout(function () {
    controller.abort();
  }, TIMEOUT_MS);

  try {
    const upstream = await fetch(target.toString(), { signal: controller.signal });
    clearTimeout(timer);

    if (!upstream.ok) {
      console.error('[api/responsavel] webhook retornou status ' + upstream.status);
      res.status(502).json({ error: true, message: 'O webhook retornou um erro.' });
      return;
    }

    const data = await upstream.json();
    res.status(200).json(data);
  } catch (err) {
    clearTimeout(timer);
    console.error('[api/responsavel] falha ao consultar o webhook: ' + (err && err.name));
    res.status(502).json({ error: true, message: 'Falha ao consultar o webhook.' });
  }
};
