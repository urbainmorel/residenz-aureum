# Contribuer à Residenz Aureum

Ce dépôt porte la refonte bilingue du site Residenz Aureum selon la direction Quiet Luxury V1. Toute contribution doit respecter [AGENTS.md](AGENTS.md), puis les spécifications produit, design et techniques.

## État actuel

Le projet est en phase de gouvernance initiale. Aucun code applicatif ni script npm n’existe encore. Ne documentez et n’exécutez que des commandes réellement présentes dans le dépôt.

## Workflow d’équipe

Chaque tâche mobilise un lead, au moins un spécialiste et un reviewer indépendant. Le lead attribue des périmètres non chevauchants, intègre les résultats et reste seul responsable des opérations Git dans le worktree partagé.

Avant toute modification :

```powershell
git status --short --branch
```

Inspectez les changements existants et considérez-les comme appartenant à leur auteur. Ne les écrasez pas, ne les stashez pas et ne les incluez pas dans votre commit.

## Branches et commits

Créez une branche courte depuis `main` :

- `feat/nom-court`
- `fix/nom-court`
- `docs/nom-court`
- `chore/nom-court`
- `refactor/nom-court`
- `test/nom-court`

Utilisez Conventional Commits en anglais :

```text
feat: add localized contact page
fix: prevent duplicate contact submissions
docs: clarify mock content policy
```

Un commit doit rester atomique, réversible et limité à la tâche. Indexez explicitement les chemins concernés et examinez `git diff --cached` avant de committer.

## Pull requests

Ouvrez une draft pull request dès qu’une première unité cohérente est disponible. Complétez le modèle fourni et indiquez :

- l’objectif et la solution ;
- les impacts produit et techniques ;
- les tests exécutés ;
- les risques et le rollback ;
- les captures desktop/mobile pour les changements visuels ;
- les mocks ou images IA ajoutés, remplacés ou approuvés ;
- le résultat de la revue IA indépendante.

La fusion utilise exclusivement le squash merge. Tous les checks doivent être verts et toutes les conversations résolues. Le propriétaire du dépôt conserve la décision finale de fusion.

## Contenus de démonstration

Tout chiffre, témoignage, label, certification ou fait non validé porte le statut `mock` dans sa source.

En production, le bloc affiche :

- français : `Contenu provisoire de démonstration` ;
- allemand : `Vorläufiger Demo-Inhalt`.

Les mocks sont exclus du JSON-LD, des avis structurés, des métadonnées promotionnelles et de toute affirmation juridique ou médicale. Leur remplacement est suivi dans l’issue GitHub dédiée.

## Images

Les nouveaux visuels raster générés par IA sont exclusivement en WebP. Les deux PNG à la racine sont des maquettes de référence et ne sont pas des médias publics.

Chaque asset publié doit comporter une traçabilité, des dimensions, un point focal, des textes alternatifs DE/FR et une approbation client explicite s’il représente la résidence ou ses personnes.

## Vérifications

Tant qu’aucun `package.json` n’existe, le workflow GitHub `governance` constitue le contrôle automatisé disponible. Après le bootstrap applicatif, utilisez uniquement les scripts déclarés dans `package.json`.

Avant de demander une revue :

1. exécutez les vérifications applicables ;
2. relisez les deux langues concernées ;
3. contrôlez l’accessibilité et le responsive des changements visuels ;
4. vérifiez l’absence de secrets et de médias interdits ;
5. demandez une revue indépendante ;
6. documentez le résultat dans la pull request.
