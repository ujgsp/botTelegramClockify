export default {
  async fetch(request, env, ctx) {
    if (request.method === 'GET') {
      return Response.json({ status: 'ok', service: 'clockify-telegram-proxy', version: '1.1' });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const body = await request.text();

    // GAS Web App redirects POST to googleusercontent and becomes unusable for Telegram.
    // Use GET bridge instead: GAS doGet reads ?update=<telegram update JSON>.
    const separator = env.GAS_WEBAPP_URL.includes('?') ? '&' : '?';
    const bridgeUrl = env.GAS_WEBAPP_URL + separator + 'update=' + encodeURIComponent(body);

    ctx.waitUntil(
      fetch(bridgeUrl, { method: 'GET' }).catch(() => null)
    );

    // Return immediately so Telegram never retries/duplicates.
    return new Response('ok', { status: 200 });
  }
};
