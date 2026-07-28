const jsonHeaders = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    headers: jsonHeaders,
    status,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return jsonResponse(
        {
          code: "NOT_FOUND",
          ok: false,
        },
        404,
      );
    }

    return env.ASSETS.fetch(request);
  },
};
