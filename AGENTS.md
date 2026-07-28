# AGENTS.md — Residenz Aureum

Ce fichier définit les règles durables de travail pour tous les agents et contributeurs du dépôt. Il s’applique à l’ensemble du projet, sauf instruction plus proche et plus spécifique dans un sous-dossier.

## 1. Mission et état du projet

Residenz Aureum est une refonte bilingue allemand/français d’un site de résidence seniors à Mülheim an der Ruhr. Le produit doit inspirer confiance, faciliter les demandes de visite et rester accessible à un public senior.

État actuel :

- le projet est en construction active à partir d’une base greenfield ;
- le code applicatif, le manifeste npm et les pipelines exécutables deviennent les sources de vérité à mesure de leur intégration ;
- `PRD.md`, `DESIGN.md`, `STI.md` et les deux maquettes Quiet Luxury V1 décrivent la cible planifiée ;
- le site public existant sert uniquement à inventorier les anciennes routes et les contenus à migrer.

Ne jamais présenter une architecture, une commande, une intégration ou un comportement planifié comme déjà implémenté. Après le bootstrap applicatif, le code, les manifests et les configurations exécutables deviennent les sources de vérité opérationnelles.

## 2. Sources de vérité et arbitrage

Appliquer les sources dans cet ordre :

1. instruction explicite et actuelle du client ou de l’utilisateur ;
2. présent `AGENTS.md` pour le workflow et les dérogations approuvées ;
3. `PRD.md` pour le produit, le contenu et les critères d’acceptation ;
4. `DESIGN.md` pour le système visuel et l’accessibilité ;
5. `STI.md` pour l’architecture, la sécurité, le SEO, les performances et les tests ;
6. `01-quiet-luxury-desktop.png` et `01-quiet-luxury-mobile.png` pour l’intention raster ;
7. le site public existant, uniquement pour l’inventaire de migration.

En cas de conflit de conception, arbitrer dans l’ordre suivant :

1. accessibilité ;
2. clarté et conversion ;
3. responsive ;
4. cohérence du système ;
5. fidélité pixel.

Les décisions client suivantes remplacent explicitement les règles contraires des documents initiaux :

- les nouveaux visuels raster de production sont générés par IA et livrés uniquement en WebP ;
- les chiffres, témoignages, certifications et autres preuves fictives peuvent apparaître en production uniquement comme contenus de démonstration visiblement signalés.

Documenter dans la pull request toute nouvelle dérogation ou ambiguïté. Ne jamais résoudre silencieusement une divergence qui modifie une promesse, un contenu réglementé, la sécurité ou l’architecture.

## 3. Équipe senior et orchestration

Chaque tâche du projet est exécutée par une équipe orchestrée :

- un lead conserve le contexte, définit le plan, attribue les périmètres et intègre le résultat ;
- au moins un spécialiste traite le domaine concerné ;
- un reviewer indépendant vérifie le travail sans être l’auteur principal ;
- une tâche substantielle mobilise au moins deux spécialistes avant la revue finale.

Agents projet disponibles :

| Agent | Responsabilité |
| --- | --- |
| `product_content` | Exigences, contenus DE/FR, mocks, validation client et SEO éditorial |
| `design_a11y` | Quiet Luxury V1, responsive, accessibilité et QA visuelle |
| `frontend_performance` | HTML/CSS/JS, génération statique, performance et SEO technique |
| `backend_security` | API contact, Resend, validation serveur, anti-spam et secrets |
| `qa_reviewer` | Revue indépendante, tests, risques, régressions et conformité |

Règles d’orchestration :

- déléguer uniquement des sous-tâches concrètes, bornées et indépendantes ;
- attribuer des périmètres de fichiers non chevauchants aux agents écrivains ;
- préférer les agents en lecture seule pour l’exploration, l’audit et la revue ;
- ne jamais laisser deux agents modifier simultanément le même fichier ;
- demander à chaque agent un handoff contenant hypothèses, fichiers concernés, vérifications, risques et décisions ouvertes ;
- faire relire tout changement fonctionnel, visuel, de contenu ou d’infrastructure par `qa_reviewer` ou un reviewer équivalent ;
- le lead relit les diffs, exécute les gates finales et reste responsable du résultat livré.

Dans un worktree partagé, seul le lead change de branche, indexe, committe, pousse, crée une pull request ou fusionne. Un agent ne peut effectuer ces opérations que dans un worktree isolé explicitement attribué par le lead.

## 4. Architecture produit cible

Conserver l’architecture prévue tant qu’une décision formelle ne la remplace pas :

- site multi-page statique, pas de SPA ;
- HTML5 sémantique pré-généré avec le contenu SEO critique dans le document initial ;
- CSS natif moderne, mobile-first, organisé par couches ;
- JavaScript en ES modules et progressive enhancement ;
- Node.js LTS avec Vite ou pipeline statique équivalent ;
- fonction serverless Node.js pour `POST /api/contact` ;
- SDK Resend uniquement côté serveur ;
- pages distinctes `/de/*` et `/fr/*`, liées par un manifest canonique ;
- composants et templates partagés, mais un document localisé complet par URL.

Ne pas ajouter de framework client lourd, de CMS, de bibliothèque d’animation, de service tiers ou de dépendance de production sans justification documentée et validation du lead.

Le build devra échouer lorsqu’une traduction obligatoire manque, lorsqu’une paire DE/FR est cassée ou lorsqu’une route n’est pas couverte par le manifest. Générer canoniques, `hreflang`, sitemap et navigation depuis les mêmes données de routes.

Tant que `package.json` n’existe pas, aucune commande npm ne doit être présentée comme exécutable. Après sa création, ses scripts et le lockfile deviennent l’unique contrat pour installer, construire, tester, formater et auditer le projet. Le gestionnaire par défaut est npm.

## 5. Contenus bilingues et mocks

Chaque page publique possède une variante allemande et française :

- une seule langue visible par page ;
- attribut `lang`, métadonnées, canonical, Open Graph et texte alternatif alignés sur la locale ;
- sélecteur de langue vers l’équivalent exact de la page ;
- traduction éditoriale, jamais traduction mot à mot ;
- contenu essentiel présent sans JavaScript.

Toute donnée de confiance appartient à l’un des états suivants :

- `validated` : donnée fournie ou approuvée par le client avec une trace vérifiable ;
- `mock` : contenu fictif utilisé pour la composition, la démonstration ou les tests.

Sont notamment concernés : chiffres, capacité, prix, horaires, disponibilité, téléphone, adresse, prestations, niveaux de soins, témoignages, noms de personnes, certifications, labels, avis et récompenses.

Règles obligatoires pour `mock` :

- stocker le statut dans la source structurée, pas seulement dans une convention visuelle ;
- afficher au plus près du bloc concerné `Contenu provisoire de démonstration` en français et `Vorläufiger Demo-Inhalt` en allemand ;
- pour une série homogène, un avertissement adjacent au titre de section peut couvrir tous les éléments ;
- utiliser des identités manifestement fictives pour les témoignages et ne jamais employer le logo ou le nom d’une certification réelle ;
- exclure les mocks du JSON-LD, des notes structurées, des métadonnées promotionnelles et des affirmations juridiques ou médicales ;
- conserver un inventaire généré ou vérifiable des mocks encore publiés ;
- lier leur remplacement à l’issue GitHub de validation du contenu.

Le passage de `mock` à `validated` exige une preuve d’approbation client liée dans la pull request. La suppression du badge seul ne constitue jamais une validation.

Ne jamais demander de données médicales dans le formulaire public. Ne jamais publier un placeholder silencieux, une information copiée du site existant ou une promesse non classée.

## 6. Design, responsive et accessibilité

Quiet Luxury V1 est la direction obligatoire :

- surfaces ivoire, verts profonds, sauge et accents or champagne ;
- DM Serif Display pour les titres et Manrope pour le corps et l’interface, auto-hébergées après vérification des licences ;
- grille éditoriale, espace généreux, lignes fines et mouvement discret ;
- priorité visuelle : message, photographie, action principale, preuves ;
- aucune esthétique clinique, SaaS, ostentatoire, infantilisante ou génériquement hôtelière.

La page d’accueil conserve les signatures de la V1 :

- barre de confiance et header principal sur desktop ;
- hero texte/image scindé, CTA principal, encart de disponibilité et bande de trois bénéfices ;
- sur mobile : message, CTA, image, encart puis panneau vertical de bénéfices ;
- aucun chevauchement sur les visages, aucun débordement horizontal et aucun texte essentiel intégré dans une image.

Exigences non négociables :

- WCAG 2.2 AA ;
- navigation complète au clavier et focus visible ;
- reflow à 320 CSS px et zoom à 200 % ;
- cibles tactiles de 44 × 44 px lorsque possible ;
- labels permanents, erreurs associées aux champs et résumé d’erreurs focusable ;
- aucun carrousel automatique, scroll hijacking ou animation essentielle ;
- respect de `prefers-reduced-motion` ;
- contraste et ordre DOM cohérents.

Valider au minimum les largeurs 375, 768, 1 024, 1 440 et 1 920 px, dans les deux langues, avec textes français longs.

## 7. Images et médias

Tous les nouveaux visuels raster de production générés par IA sont au format `.webp`.

Exceptions :

- `01-quiet-luxury-desktop.png` ;
- `01-quiet-luxury-mobile.png`.

Ces deux PNG sont des références de design conservées à la racine et ne doivent pas être copiées dans les médias publics. Les SVG sont réservés aux logos et pictogrammes véritablement vectoriels.

Pour chaque image IA :

- utiliser un nom descriptif en kebab-case ;
- produire les variantes responsives utiles, sans agrandissement artificiel ;
- renseigner dimensions, ratio, point focal et textes alternatifs DE/FR ;
- conserver la provenance, le prompt, la date de génération, les dimensions, le point focal, les textes alternatifs DE/FR et le statut d’approbation dans `assets/media/ai-assets.json` ;
- réserver `fetchpriority="high"` et le préchargement à l’unique image LCP ;
- charger paresseusement les médias hors ligne de flottaison ;
- viser au plus 250 Ko pour le hero mobile et 450 Ko pour le hero desktop.

Une image IA ne peut être présentée comme représentation de la résidence, d’une chambre, d’un résident ou d’un membre de l’équipe qu’après approbation explicite du client pour cet asset. Une image en attente d’approbation reste hors production. La preview privée peut servir un asset générique `pending` uniquement depuis `public/media/preview/`, avec un avertissement visible ; le build production doit refuser et exclure ce dossier.

Aucun hotlink ni nouveau fichier raster de production `.png`, `.jpg`, `.jpeg`, `.gif` ou `.avif` n’est accepté. Si un outil génère un autre format, le convertir en WebP avant de l’ajouter au dépôt.

## 8. Sécurité, données et formulaires

- Ne jamais committer de secret, token, clé API, donnée personnelle, message de formulaire réel ou donnée médicale.
- Ignorer tous les `.env*`, sauf `.env.example` avec valeurs manifestement factices.
- Garder `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_CONTACT_TO`, `CONTACT_ALLOWED_ORIGINS` et le futur `RESEND_WEBHOOK_SECRET` côté serveur.
- Utiliser des valeurs distinctes par environnement et des permissions minimales.
- Ne jamais exposer de secret, stack trace, destinataire interne ou détail Resend dans le navigateur ou les logs.
- Valider côté serveur par allowlist, longueur, type et origine ; échapper le HTML des emails et générer une version texte.
- Conserver honeypot, idempotence, rate limiting persistant et protection cross-site.
- Ne pas journaliser le message complet ni les données personnelles en clair.
- Ne pas ajouter une intégration tierce à la CSP, aux cookies ou aux formulaires sans audit sécurité, performance et confidentialité.

En cas de secret exposé, arrêter le travail concerné, prévenir le lead, révoquer et remplacer la clé avant toute autre action. Toute réécriture d’historique doit être explicitement coordonnée.

## 9. Git et GitHub

Le dépôt public canonique est `urbainmorel/residenz-aureum`. La branche de référence est `main`.

L’unique commit direct autorisé sur `main` est le bootstrap initial de la gouvernance, réalisé avant l’activation des protections. Ensuite :

- une tâche ou issue correspond à une branche courte créée depuis un `main` à jour ;
- préfixes autorisés : `feat/`, `fix/`, `docs/`, `chore/`, `refactor/`, `test/` ;
- nom de branche court en kebab-case ;
- toute modification passe par une pull request ;
- ouvrir une draft PR dès qu’une première unité cohérente est poussée ;
- utiliser uniquement le squash merge puis supprimer la branche ;
- la fusion exige les checks verts, les conversations résolues, une revue IA indépendante tracée et la décision du propriétaire.

Avant de travailler :

1. exécuter `git status --short --branch` ;
2. confirmer la branche et le périmètre ;
3. inspecter les diffs préexistants ;
4. considérer toute modification existante comme appartenant à l’utilisateur.

Ne jamais écraser, stasher, déplacer ou inclure des changements étrangers sans autorisation. Ne jamais utiliser `git reset --hard`, `git checkout --`, `git clean -fd`, un force-push ou une commande destructive équivalente.

Indexer uniquement les chemins de la tâche. Éviter `git add .` et `git add -A` dans un worktree non propre. Examiner `git diff` et `git diff --cached` avant commit, puis `git status` après commit.

Utiliser Conventional Commits avec un sujet anglais, impératif et sans point final :

- `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `perf:`, `build:` ou `ci:`.

Chaque commit doit être atomique, réversible, exempt de secret et limité au périmètre annoncé.

La pull request décrit :

- problème et solution ;
- impacts produit et techniques ;
- fichiers ou comportements concernés ;
- tests exécutés et résultats ;
- risques, décisions ouvertes et rollback ;
- captures desktop/mobile pour tout changement visuel ;
- inventaire des mocks et images IA ajoutés ou validés.

## 10. Vérification et revue

Utiliser exclusivement les scripts présents dans `package.json` dès qu’il existe. Ne pas inventer une commande ni contourner une CI rouge en désactivant un test, une règle ou un seuil.

Selon le changement, vérifier :

- formatage, lint, tests unitaires et build de production ;
- validation des contenus et paires DE/FR ;
- intégration de l’API contact et erreurs Resend ;
- navigation clavier, menu mobile, formulaires, FAQ et galerie ;
- accessibilité automatisée et manuelle ;
- canonical, `hreflang`, sitemap, robots, données structurées et liens ;
- régressions visuelles aux largeurs de référence ;
- budgets HTML, CSS, JavaScript, polices et images ;
- absence de médias raster non-WebP dans les répertoires publics ;
- absence de secrets et de données personnelles.

Toute PR visuelle compare desktop et mobile aux maquettes Quiet Luxury V1. Toute PR de contenu vérifie les deux langues, le statut `mock|validated` et les exclusions SEO. Toute PR backend inclut les cas invalides, abusifs et indisponibilité fournisseur.

## 11. Déploiement

- Local sert au développement et aux tests.
- Preview sert à la revue design, contenu, mocks, formulaires et validation client des images.
- Production part uniquement d’un commit validé de `main`.
- Ne jamais inventer un fournisseur d’hébergement ou un workflow de production avant décision explicite.
- Les déploiements futurs doivent être immuables, avec une version précédente restaurable sans reconstruction.
- Aucun agent ne déploie en production ou ne modifie un domaine, un secret ou un environnement sans cible explicitement validée.

## 12. Définition de terminé

Une tâche est terminée lorsque :

- le périmètre et les sources de vérité ont été respectés ;
- aucun changement étranger n’a été altéré ;
- les versions DE/FR concernées restent cohérentes ;
- mocks et images IA portent leur statut et leur traçabilité ;
- aucun secret, donnée médicale ou contenu silencieusement fictif n’est présent ;
- les tests et gates applicables sont verts ;
- un reviewer indépendant a rendu un avis sans blocage ;
- le diff, la documentation et la pull request décrivent fidèlement le résultat ;
- le lead a vérifié Git et le comportement final.
