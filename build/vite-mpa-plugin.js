import { extname } from "node:path";
import { loadSiteData, routeForPath } from "../scripts/lib/site-data.mjs";
import {
  renderLocalizedPage,
  renderNotFoundPage,
  renderRootPage,
} from "../src/templates/layout.mjs";

const developmentAssets = {
  script: "/src/scripts/main.js",
  styles: [],
};

function send(res, status, body, headers = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  for (const [name, value] of Object.entries(headers)) {
    res.setHeader(name, value);
  }
  res.end(body);
}

export function mpaDevelopment() {
  return {
    name: "residenz-aureum-mpa-development",
    apply: "serve",
    configureServer(server) {
      server.watcher.add(["src/content/**/*.json", "src/data/routes.json"]);
      server.watcher.on("change", (path) => {
        if (
          path.includes("src/content") ||
          path.endsWith("src/data/routes.json")
        ) {
          server.ws.send({ type: "full-reload" });
        }
      });

      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !["GET", "HEAD"].includes(req.method || "")) {
          next();
          return;
        }

        const url = new URL(req.url, "http://localhost");
        if (
          extname(url.pathname) ||
          url.pathname.startsWith("/@") ||
          url.pathname.startsWith("/src/")
        ) {
          next();
          return;
        }

        try {
          const siteData = await loadSiteData({ mode: "preview" });
          let html;
          let status = 200;

          if (url.pathname === "/") {
            html = renderRootPage({
              assets: developmentAssets,
              siteData,
            });
          } else {
            const match = routeForPath(siteData, url.pathname);
            if (match) {
              html = renderLocalizedPage({
                assets: developmentAssets,
                locale: match.locale,
                page: siteData.localizedContent[match.locale].pages[
                  match.route.id
                ],
                route: match.route,
                siteData,
              });
            } else {
              const withSlash = `${url.pathname}/`.replaceAll("//", "/");
              const redirectMatch = routeForPath(siteData, withSlash);
              if (redirectMatch) {
                res.statusCode = 308;
                res.setHeader("Location", withSlash);
                res.end();
                return;
              }

              const locale = url.pathname.startsWith("/fr/") ? "fr" : "de";
              html = renderNotFoundPage({
                assets: developmentAssets,
                locale,
                siteData,
              });
              status = 404;
            }
          }

          const transformed = await server.transformIndexHtml(
            url.pathname,
            html,
          );
          send(res, status, req.method === "HEAD" ? "" : transformed, {
            "Cache-Control": "no-store",
          });
        } catch (error) {
          server.config.logger.error(error.stack || error.message);
          next(error);
        }
      });
    },
  };
}
