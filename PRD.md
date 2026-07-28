# PRD — Refonte du site Residenz Aureum

> Document de référence produit pour concevoir et livrer le nouveau site bilingue de Residenz Aureum.

## Vue d’ensemble

| Élément | Décision |
| --- | --- |
| Statut | En construction — la gouvernance et les spécifications précèdent l’intégration applicative |
| Direction visuelle | Quiet Luxury V1 — référence officielle |
| Marché principal | Mülheim an der Ruhr, Allemagne |
| Langues | Allemand (`de`) et français (`fr`) |
| Front-end | HTML5 sémantique, CSS moderne, JavaScript ES modules |
| Formulaires | Endpoint serveur sécurisé + Resend |
| Priorités | Confiance, prise de rendez-vous, SEO local, accessibilité, performance |
| Référence desktop | [Quiet Luxury V1 desktop](01-quiet-luxury-desktop.png) |
| Référence mobile | [Quiet Luxury V1 mobile](01-quiet-luxury-mobile.png) |

## 1. Vision produit

Le nouveau site doit positionner Residenz Aureum comme une résidence seniors premium, chaleureuse et digne de confiance. L’expérience doit combiner la qualité perçue d’un établissement haut de gamme avec la clarté, l’humanité et la réassurance attendues par les familles.

Le site ne doit pas ressembler à un modèle générique de maison de retraite, à un site médical froid ni à une campagne d’hôtel de luxe déconnectée du soin.

### Proposition de valeur

> Un lieu de vie élégant et humain où confort, dignité, accompagnement personnalisé et vie sociale se rejoignent.

## 2. Objectifs

### Objectifs principaux

1. Générer des demandes qualifiées de visite et de renseignements.
2. Renforcer la confiance des familles avant le premier contact.
3. Améliorer la visibilité organique locale en allemand et en français.
4. Présenter clairement l’hébergement, l’accompagnement, les services et le processus d’admission.
5. Offrir une expérience fluide sur mobile, tablette et desktop.
6. Donner au client une identité visuelle propriétaire et durable.

### Objectifs secondaires

- Faciliter les appels téléphoniques depuis un mobile.
- Réduire les questions répétitives grâce à une FAQ complète.
- Mettre en valeur les photographies réelles de la résidence.
- Créer une base éditoriale extensible vers des guides et actualités.

### Hors périmètre initial

- Espace résident ou famille connecté.
- Paiement en ligne.
- Dossier médical ou transmission de données de santé.
- Réservation automatique d’une chambre.
- CRM complet ou base de données de prospects.
- Chatbot automatisé.

## 3. Publics cibles

| Public | Besoin principal | Frein principal | Action attendue |
| --- | --- | --- | --- |
| Enfant ou proche d’un senior | Comprendre rapidement la qualité de l’accompagnement | Peur de faire le mauvais choix | Demander une visite |
| Senior autonome ou semi-autonome | Se projeter dans un lieu agréable et respectueux | Crainte de perdre son indépendance | Découvrir les chambres et la vie quotidienne |
| Famille francophone en Allemagne | Accéder à une information claire dans sa langue | Difficultés linguistiques et administratives | Contacter un conseiller |
| Professionnel prescripteur | Vérifier les services et modalités d’admission | Informations incomplètes ou dispersées | Transmettre les coordonnées |
| Candidat au recrutement | Comprendre les valeurs et l’environnement de travail | Manque d’informations concrètes | Accéder au contact recrutement |

## 4. Principes produit

- **Humain avant promotionnel** : montrer des situations réelles, pas seulement des promesses.
- **Clarté avant abondance** : une idée principale par section.
- **Réassurance avant persuasion** : expliquer le fonctionnement, les personnes et le quotidien.
- **Preuves vérifiables uniquement** : aucun chiffre, label, certification ou témoignage non validé.
- **Mobile prioritaire** : le message, le CTA et la confiance doivent être visibles rapidement.
- **Bilingue natif** : chaque langue possède ses propres pages, métadonnées et contenus.
- **Progressive enhancement** : les contenus et formulaires restent utilisables sans animation.

## 5. Architecture de l’information

### Arborescence allemande

| URL | Page | Intention principale |
| --- | --- | --- |
| `/de/` | Startseite | Découverte et conversion |
| `/de/ueber-uns/` | Über uns | Mission, valeurs, équipe |
| `/de/zimmer-suiten/` | Zimmer & Suiten | Hébergement et confort |
| `/de/pflege-betreuung/` | Pflege & Betreuung | Accompagnement et sécurité |
| `/de/leistungen/` | Leistungen | Restauration, entretien, activités et services validés |
| `/de/leben-im-aureum/` | Leben im Aureum | Vie quotidienne, activités et communauté |
| `/de/aufnahme-anmeldung/` | Aufnahme & Anmeldung | Processus, documents et étapes |
| `/de/faq/` | Häufige Fragen | Réponses aux objections |
| `/de/kontakt-besichtigung/` | Kontakt & Besichtigung | Formulaire et coordonnées |
| `/de/ratgeber/` | Ratgeber | Guides SEO et aide aux familles |
| `/de/impressum/` | Impressum | Mentions légales |
| `/de/datenschutz/` | Datenschutz | Confidentialité |

### Arborescence française

| URL | Page | Intention principale |
| --- | --- | --- |
| `/fr/` | Accueil | Découverte et conversion |
| `/fr/a-propos/` | À propos | Mission, valeurs, équipe |
| `/fr/chambres-suites/` | Chambres & suites | Hébergement et confort |
| `/fr/soins-accompagnement/` | Soins & accompagnement | Accompagnement et sécurité |
| `/fr/services/` | Services | Restauration, entretien, activités et services validés |
| `/fr/vivre-a-aureum/` | Vivre à Aureum | Vie quotidienne, activités et communauté |
| `/fr/admission-inscription/` | Admission & inscription | Processus, documents et étapes |
| `/fr/faq/` | Questions fréquentes | Réponses aux objections |
| `/fr/contact-visite/` | Contact & visite | Formulaire et coordonnées |
| `/fr/conseils/` | Conseils | Guides SEO et aide aux familles |
| `/fr/mentions-legales/` | Mentions légales | Informations légales |
| `/fr/confidentialite/` | Confidentialité | Protection des données |

## 6. Parcours prioritaires

### Parcours A — Demande de visite

1. L’utilisateur arrive sur une page locale ou thématique.
2. Il comprend le positionnement et voit une photographie crédible.
3. Il consulte les chambres, l’accompagnement ou le quotidien.
4. Il clique sur « Besichtigung vereinbaren » ou « Planifier une visite ».
5. Le formulaire s’ouvre sur une page dédiée ou une section clairement ancrée.
6. Il reçoit un message de confirmation à l’écran puis un email dans sa langue.

### Parcours B — Réassurance d’une famille

1. L’utilisateur consulte « Pflege & Betreuung » ou « Soins & accompagnement ».
2. Il identifie les modalités réellement proposées.
3. Il consulte le processus d’admission et la FAQ.
4. Il appelle ou envoie une demande de renseignements.

### Parcours C — Utilisateur francophone

1. La racine détecte une préférence de navigateur française.
2. L’utilisateur est orienté vers `/fr/`.
3. Le sélecteur `DE / FR` reste visible.
4. Son choix explicite est mémorisé et prioritaire lors des visites suivantes.

## 7. Exigences fonctionnelles

| ID | Exigence | Priorité |
| --- | --- | --- |
| FR-001 | Chaque page publique possède une version allemande et française sur une URL distincte. | Must |
| FR-002 | La racine `/` détecte la langue du navigateur et oriente vers `/fr/` pour une préférence française, sinon `/de/`. | Must |
| FR-003 | Un choix manuel de langue reste toujours disponible et prime sur la détection automatique. | Must |
| FR-004 | Les contenus critiques restent lisibles et navigables sans JavaScript. | Must |
| FR-005 | Tous les CTA de visite convergent vers le même parcours de contact. | Must |
| FR-006 | Le site propose un formulaire général et un mode « demande de visite ». | Must |
| FR-007 | Les soumissions valides déclenchent un email interne via Resend. | Must |
| FR-008 | L’utilisateur reçoit un accusé de réception dans la langue de la page. | Must |
| FR-009 | Les erreurs de formulaire sont affichées près des champs et résumées en tête du formulaire. | Must |
| FR-010 | Les galeries sont navigables au clavier et utilisables au toucher. | Must |
| FR-011 | Les FAQ utilisent de vrais boutons accessibles et restent indexables. | Must |
| FR-012 | Le numéro de téléphone devient un lien `tel:` sur mobile. | Must |
| FR-013 | Les animations respectent `prefers-reduced-motion`. | Must |
| FR-014 | Les contenus peuvent être étendus sans modifier les composants. | Should |
| FR-015 | Un journal technique minimal permet de diagnostiquer les échecs d’envoi. | Should |

## 8. Stratégie multilingue

### Règles

- Une page contient une seule langue visible.
- Les routes allemandes et françaises sont indexables séparément.
- Le HTML porte `lang="de"` ou `lang="fr"`.
- Chaque paire de pages déclare `hreflang="de"`, `hreflang="fr"` et `hreflang="x-default"`.
- Le sélecteur change vers l’équivalent exact de la page, pas systématiquement vers l’accueil.
- La préférence explicite est mémorisée dans un stockage fonctionnel de premier niveau.
- Aucune redirection automatique ne doit se produire depuis `/de/*` ou `/fr/*`.
- La détection automatique est limitée à `/`, afin de préserver l’accès aux deux variantes.

Google recommande des URL distinctes pour chaque langue et avertit que des redirections automatiques peuvent empêcher l’exploration de certaines variantes. Le compromis retenu limite donc l’autodétection à la racine tout en exposant toutes les pages localisées dans la navigation, le sitemap et les annotations `hreflang`.

## 9. Stratégie de contenu

### Ton éditorial

| Allemand | Français |
| --- | --- |
| Chaleureux, précis, respectueux, vouvoiement `Sie` | Chaleureux, sobre, vouvoiement |
| Éviter les superlatifs non prouvés | Éviter le vocabulaire médical alarmant |
| Phrases concrètes et courtes | Traduction éditoriale, jamais mot à mot |
| Priorité à la dignité et à l’autonomie | Priorité à la confiance et à la clarté |

### Proposition de contenu — accueil allemand

**Sur-titre**

> Premium Seniorenresidenz in Mülheim an der Ruhr

**Titre principal**

> Ein Zuhause, das Würde, Nähe und Lebensfreude verbindet.

**Introduction**

> In der Residenz Aureum verbinden wir persönliches Wohnen mit verlässlicher Betreuung, stilvollem Komfort und einem Alltag voller Begegnungen.

**CTA**

- `Besichtigung vereinbaren`
- `Residenz entdecken`

**Sections**

1. `Mehr als ein Ort zum Wohnen`
2. `Betreuung, die zum Menschen passt`
3. `Zimmer mit Persönlichkeit`
4. `Gemeinschaft, die gut tut`
5. `In drei Schritten zur passenden Betreuung`
6. `Lernen Sie die Residenz persönlich kennen`

### Proposition de contenu — accueil français

**Sur-titre**

> Résidence seniors premium à Mülheim an der Ruhr

**Titre principal**

> Un lieu de vie où dignité, proximité et joie de vivre se rencontrent.

**Introduction**

> À la Residenz Aureum, nous réunissons un accompagnement fiable, un confort soigné et une vie quotidienne riche en échanges, dans le respect du rythme de chaque résident.

**CTA**

- `Planifier une visite`
- `Découvrir la résidence`

**Sections**

1. `Bien plus qu’un lieu où vivre`
2. `Un accompagnement adapté à chaque personne`
3. `Des chambres pensées comme de vrais espaces de vie`
4. `Une communauté qui fait du bien`
5. `Trois étapes vers un accompagnement adapté`
6. `Venez découvrir la résidence`

### Exigences par page

| Page | Contenus obligatoires |
| --- | --- |
| À propos | Histoire réelle, mission, valeurs, équipe dirigeante, photographies authentiques |
| Chambres & suites | Types réels, dimensions, équipements, accessibilité, galerie, disponibilité sans fausse promesse |
| Soins & accompagnement | Publics accueillis, organisation, présence, plan personnalisé, coordination et limites réelles |
| Services | Restauration, entretien, activités, bien-être et transport uniquement s’ils sont confirmés |
| Vie quotidienne | Exemple de journée, activités, espaces communs, événements et participation des proches |
| Admission | Étapes, interlocuteur, documents, délais indicatifs validés, financements ou organismes compétents |
| FAQ | Prix, visite, admission, mobilier, animaux, repas, visites des proches et urgences si applicables |
| Contact | Adresse complète, téléphone, email, horaires, carte, accès, stationnement et formulaire |

### Règles de crédibilité

- Les témoignages validés doivent être signés et autorisés ; les témoignages fictifs restent explicitement classés et signalés comme contenus de démonstration.
- Les années d’expérience, taux de satisfaction, chiffres et certifications non validés ne peuvent apparaître que comme mocks visiblement signalés, sans marque ni organisme réel.
- Identifier les contenus relus par un professionnel de l’accompagnement.
- Afficher la date de dernière mise à jour sur les guides.
- Ne jamais présenter une image IA comme photographie réelle de la résidence sans approbation client traçable pour cet asset.
- Ne pas demander de données médicales dans le formulaire public.


## 10. Exigences SEO

### SEO technique

- HTML rendu et indexable sans dépendre d’un rendu JavaScript côté client.
- Un `<title>` descriptif et unique par page et par langue.
- Une meta description unique et orientée intention.
- Une seule balise `<h1>` principale et une hiérarchie de titres logique.
- URL canoniques absolues.
- `hreflang` réciproques entre toutes les pages jumelles.
- Sitemap XML UTF-8 contenant les URL canoniques et leurs variantes linguistiques.
- `robots.txt` référençant le sitemap.
- Redirections `301` des anciennes URL vers leurs équivalents.
- Fil d’Ariane sur les pages internes.
- Open Graph et données sociales localisées.
- Images avec dimensions, `alt` localisé, formats AVIF/WebP et noms de fichiers descriptifs.

### SEO local

- Coordonnées NAP identiques sur toutes les pages et dans le Google Business Profile.
- Adresse réelle complète et numéro de téléphone validé.
- Horaires à jour.
- Contenus spécifiques à Mülheim an der Ruhr et à la zone réellement desservie.
- Données structurées JSON-LD `LocalBusiness` et, seulement si le statut le justifie, `MedicalOrganization`.
- Ne jamais ajouter de note, avis, certification ou autre mock aux données structurées.

### Clusters éditoriaux proposés

**Allemand**

- Seniorenresidenz in Mülheim an der Ruhr
- Seniorenbetreuung in Mülheim
- Pflege und Betreuung im Alter
- Besichtigung einer Seniorenresidenz
- Aufnahme und Anmeldung

**Français**

- résidence seniors à Mülheim an der Ruhr
- accompagnement des personnes âgées en Allemagne
- préparer une visite en résidence seniors
- admission en résidence seniors en Allemagne
- informations pour les familles francophones

> [!IMPORTANT]
> Les termes liés à un établissement médical, un EHPAD, un `Pflegeheim` ou un niveau de soins précis ne doivent être ciblés que si l’autorisation, le statut et les prestations de Residenz Aureum les rendent exacts.

### Contenus guides — phase suivante

1. Comment choisir une résidence seniors à Mülheim an der Ruhr.
2. Les questions à poser lors d’une visite.
3. Préparer l’entrée d’un proche en résidence.
4. Comprendre le plan d’accompagnement personnalisé.
5. Guide bilingue pour les familles francophones en Allemagne.

## 11. Formulaires et emails

### Modes

- `general` : demande générale.
- `visit` : demande de visite.

### Champs

| Champ | Requis | Règle |
| --- | --- | --- |
| Prénom | Oui | 1 à 80 caractères |
| Nom | Oui | 1 à 80 caractères |
| Email | Oui | Adresse valide, 254 caractères maximum |
| Téléphone | Non | Format humain accepté, 30 caractères maximum |
| Langue | Oui | `de` ou `fr`, définie par la page |
| Type de demande | Oui | `general` ou `visit` |
| Date souhaitée | Non | Date future, sans promesse de disponibilité |
| Moyen de contact préféré | Non | Email ou téléphone |
| Message | Oui | 20 à 3 000 caractères |
| Consentement confidentialité | Oui | Case non précochée |

### Comportement attendu

1. Validation client pour l’expérience utilisateur.
2. Validation serveur obligatoire.
3. Protection anti-spam et limitation de fréquence.
4. Envoi interne à l’adresse configurée.
5. Accusé de réception localisé envoyé à l’utilisateur.
6. État de succès clair sans vider le formulaire avant confirmation.
7. État d’erreur générique si Resend est indisponible, avec alternative téléphonique.

### Confidentialité

- Afficher une consigne demandant de ne pas transmettre de données médicales sensibles.
- Ne pas placer la clé Resend dans le navigateur.
- Ne journaliser ni message complet ni données personnelles en clair.
- Définir la durée de conservation avec le responsable juridique ou DPO.
- Faire valider les textes de consentement et de confidentialité avant mise en production.

## 12. Accessibilité et public senior

- Objectif WCAG 2.2 niveau AA.
- Taille de texte courante minimale visuelle de 16 px, cible de 18 px pour les contenus longs.
- Contraste texte/fond d’au moins 4,5:1.
- Cibles tactiles d’au moins 44 × 44 px lorsque possible.
- Navigation intégrale au clavier.
- Focus visible et jamais masqué par un header fixe.
- Libellés de formulaire permanents, pas uniquement des placeholders.
- Pas de carrousel automatique.
- Pas de texte essentiel intégré dans une image.
- Animations réduites ou supprimées avec `prefers-reduced-motion`.

## 13. Performance

### Objectifs mesurables

| Indicateur | Objectif |
| --- | --- |
| LCP | ≤ 2,5 s au 75e percentile |
| INP | ≤ 200 ms au 75e percentile |
| CLS | ≤ 0,1 au 75e percentile |
| Lighthouse Performance | ≥ 90 mobile, cible ≥ 95 |
| Lighthouse Accessibilité | ≥ 95, aucune erreur critique |
| Lighthouse SEO | 100 sur les pages indexables |
| JavaScript initial | ≤ 100 Ko compressé, hors polyfills conditionnels |
| Image hero mobile | Cible ≤ 250 Ko |

## 14. Mesure du succès

Les valeurs de départ doivent être relevées avant migration.

| KPI | Mesure |
| --- | --- |
| Demandes qualifiées | Soumissions valides par mois |
| Conversion visite | Demandes de visite / sessions des pages clés |
| Appels mobiles | Clics sur les liens `tel:` |
| Visibilité organique | Clics, impressions et requêtes dans Search Console |
| SEO local | Vues et actions du Google Business Profile |
| Qualité mobile | Core Web Vitals segmentés mobile/desktop |
| Usage linguistique | Répartition DE/FR et changements manuels |
| Qualité formulaire | Taux de complétion et erreurs par champ |

## 15. Critères d’acceptation

### Produit

- [ ] Toutes les pages prévues existent dans les deux langues.
- [ ] Chaque page allemande possède un équivalent français accessible depuis le sélecteur.
- [ ] La proposition de valeur et le CTA principal sont visibles rapidement sur mobile.
- [ ] La page d’accueil reprend fidèlement le langage Quiet Luxury V1 : barre de confiance desktop, header principal clair, hero texte/image scindé, encart `24/7 erreichbar` et bande de trois bénéfices.
- [ ] La version mobile conserve l’ordre et la personnalité de la V1 : message, CTA, photographie, encart de disponibilité puis bénéfices, sans masquer les visages ni gêner la lecture.
- [ ] Les photographies et affirmations ont été validées par le client.
- [ ] Aucun contenu fictif ou placeholder ne reste en production.

### SEO

- [ ] Les titres, descriptions, URL canoniques et `hreflang` sont uniques et valides.
- [ ] Le sitemap et le `robots.txt` sont accessibles.
- [ ] Les redirections depuis l’ancien site ont été testées.
- [ ] Les données structurées passent le Rich Results Test sans erreur critique.
- [ ] Les pages sont inspectables dans Search Console.

### Formulaires

- [ ] Les clés Resend restent exclusivement côté serveur.
- [ ] Les emails internes et accusés DE/FR sont testés.
- [ ] Les doubles soumissions ne produisent pas de doubles emails.
- [ ] Le spam simple, les requêtes cross-site et les charges invalides sont bloqués.
- [ ] Une alternative par téléphone est affichée lors d’un échec.

### Responsive et accessibilité

- [ ] Le site fonctionne de 320 px à 2 560 px sans débordement horizontal.
- [ ] Le clavier permet d’utiliser la navigation, les FAQ, la galerie et les formulaires.
- [ ] Le mode mouvement réduit a été vérifié.
- [ ] Les tests mobiles, tablettes et desktop sont validés.

## 16. Dépendances et points à confirmer

1. Adresse postale exacte.
2. Numéro de téléphone définitif.
3. Horaires d’accueil.
4. Statut juridique et médical exact de l’établissement.
5. Prestations réellement disponibles.
6. Capacité, types de chambres et informations tarifaires publiables.
7. Certifications ou labels vérifiables.
8. Photographies exploitables et droits à l’image.
9. Témoignages autorisés.
10. Adresse destinataire des formulaires.
11. Hébergeur et environnement des fonctions serveur.
12. Responsable de validation des traductions françaises.
13. Politique de conservation des demandes.

## 17. Références

- [Google — Gestion des sites multilingues](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)
- [Google — Contenus utiles et fiables](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google — Titres dans les résultats](https://developers.google.com/search/docs/appearance/title-link)
- [Google — Meta descriptions et extraits](https://developers.google.com/search/docs/appearance/snippet)
- [Google — Données structurées LocalBusiness](https://developers.google.com/search/docs/appearance/structured-data/local-business)
- [Google — Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals)
- [W3C — WCAG 2.2](https://www.w3.org/TR/WCAG22/)

## Documents associés

- [Spécifications techniques d’implémentation](STI.md)
- [Système de design](DESIGN.md)
