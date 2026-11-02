// One address for search engines: send the old pages.dev address to the real domain.
export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (url.hostname === "machinemadegod.pages.dev") {
    url.hostname = "machine-made-god.com";
    return Response.redirect(url.toString(), 301);
  }
  return next();
}
