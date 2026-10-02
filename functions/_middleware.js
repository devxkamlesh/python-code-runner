export async function onRequest(context) {
  const response = await context.next();
  const url = new URL(context.request.url);

  // Set noindex header on preview and staging subdomains
  if (url.hostname.endsWith('.pages.dev') || url.hostname.endsWith('.workers.dev')) {
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return newResponse;
  }

  return response;
}
