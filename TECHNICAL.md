# Guide technique

Le site utilise Node.js 22.13 ou plus récent, npm, Vite et un Worker Cloudflare
ESM. Il reste multi-page : le contenu critique de chaque route est écrit dans
son propre document HTML pendant le build.

## Commandes

- `npm ci` installe exactement les versions du lockfile.
- `npm run dev` sert les routes DE/FR en développement.
- `npm run build:preview` crée une sortie non indexable qui autorise les pages
  en état `draft`.
- `npm run build:production` refuse tout contenu `draft`.
- `npm run check` exécute format, lint, tests, build preview et audits statiques.
- `npm run preview:worker` sert la dernière sortie avec le runtime Worker local.

`npm run build` est volontairement identique au build de production. Il doit
échouer tant que des contenus, notamment les pages légales, ne sont pas prêts.

## Sources et sorties

Le manifest `src/data/routes.json` relie les douze routes allemandes à leurs
équivalents français. Les fichiers `src/content/*/pages.json` suivent les
schémas JSON du dossier `schemas`. Vite compile et hashe les feuilles de style
et les modules ES ; le générateur écrit ensuite les pages, le sitemap et
`robots.txt`.

La livraison attendue par Sites est séparée :

- `dist/client` contient les documents et assets statiques ;
- `dist/server/index.js` contient le Worker Cloudflare ESM ;
- `dist/.openai/hosting.json` contient uniquement les bindings logiques.

Le Worker laisse les assets au binding `ASSETS` et réserve `/api/*` au code
serveur. Le binding D1 logique `DB` est déclaré pour l’idempotence et la
limitation persistante du futur formulaire ; aucune donnée métier n’est créée
par cette fondation.

## Environnements

Copier `.env.example` vers `.env.local`, qui est ignoré par Git, puis remplacer
uniquement les valeurs de l’environnement concerné. Les commandes Node locales
chargent ce fichier avec l’option native
`--env-file-if-exists=.env.local` ; son absence n’empêche donc ni l’installation
ni les contrôles reproductibles. Les secrets Resend et le secret de limitation
restent exclusivement côté Worker. La configuration hébergée est gérée par
Sites et ne doit jamais être copiée dans le dépôt.
