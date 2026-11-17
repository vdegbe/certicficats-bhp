# Certificats de Non-Infestation (BHP)

Application web (une seule page) qui génère les certificats de non-infestation en PDF, un par un ou en lot à partir de l'export twimm.
Le site publié (`index.html`) est **chiffré** : il faut un mot de passe pour l'ouvrir.

## Organisation du dépôt

| Dossier | Contenu |
|---|---|
| `src/` | Le code lisible : page (`template.html`, `style.css`) et logique (`js/`) |
| `assets/private.enc` | Données privées **chiffrées** : liste des sites, signature, fond du certificat, polices, adresse et jeton de l'historique partagé |
| `build/` | Scripts qui assemblent, chiffrent et écrivent `index.html` |
| `vendor/` | jsPDF (MIT), embarqué dans la page : plus de dépendance à internet |
| `test/` | Tests automatiques (données fictives uniquement) |
| `index.html` | **Généré** par `npm run build` : ne pas modifier à la main |

> Le dépôt est public : n'y mettez jamais le mot de passe, de vrais exports twimm, la signature ni la liste des sites en clair.

## Commandes

```bash
npm test                                   # tests de l'analyse du CSV et du chiffrement
SITE_PASSWORDS="mdp1,mdp2" npm run build  # régénère index.html
```

`SITE_PASSWORDS` : un ou plusieurs mots de passe séparés par des virgules. **Le premier doit ouvrir `assets/private.enc`**
(c'est le mot de passe « principal »). Chaque mot de passe ouvre la page ; pour retirer l'accès à une personne, relancez le build sans son mot de passe.
Un mot de passe retiré n'ouvre plus les nouvelles versions, mais reste valable pour les anciennes versions déjà publiées.

## Historique partagé

L'historique est stocké dans un Google Sheet, via un petit script Google Apps Script (onglet **Réglages** : « Copier le script »).

```bash
SITE_PASSWORDS="mdp1" npm run assets -- set-history "https://script.google.com/macros/s/…/exec"   # adresse du script déployé
SITE_PASSWORDS="mdp1" npm run assets -- new-token                                                    # change le jeton (puis redéployer le script)
SITE_PASSWORDS="mdp1" npm run build
```

Le jeton de l'historique est **distinct** du mot de passe du site et est inclus dans le script Google généré par l'application.

## Import twimm

Onglet **Import** : chargez l'export twimm (`.csv`). Chaque logement est classé *Prêt*, *À vérifier* ou *Déjà généré*, avec le motif.
Rien n'est ignoré silencieusement : les cas douteux (plusieurs logements, bilan avec infestation ou « déjà fait », numéro de module mal saisi, adresse ou étage incohérents) restent visibles et modifiables.

## Onglet « Carte » (tournées des techniciens)

- Entrée : export twimm (adresse du logement lue dans l'« Objet », étage/porte reconnus) ou adresses collées à la main.
- Le domicile du technicien est le départ et le retour. Il est mémorisé dans le navigateur uniquement (jamais dans l'historique partagé ni sur la fiche).
- Géocodage : Base Adresse Nationale (api-adresse.data.gouv.fr, gratuit, sans clé). Fond de carte : OpenStreetMap, via Leaflet (`vendor/leaflet.*`).
- Ordre des visites : plus proche voisin puis 2-opt (`src/js/32-map-core.js`, testé dans `test/map.test.mjs`). Distances par la route estimées à vol d'oiseau × 1,3.
- Liens « Y aller » (Google Maps, Waze) et tournée complète par parties de 9 étapes. Fiche imprimable (impression du navigateur → PDF).
- Les téléphones des locataires ne sont jamais repris dans la fiche ; la ligne « Contraintes » (contact gardien) l'est.
- Les tuiles OpenStreetMap conviennent à un usage interne léger ; au-delà, prévoir un fournisseur de tuiles dédié.
