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

## Sauvegarde de l'historique

Onglet **Réglages** → *Exporter l'historique (CSV)* : fichier lisible dans Excel, dont la dernière colonne (`donnees`) permet une restauration sans perte.
*Restaurer depuis un fichier de sauvegarde* ajoute les certificats absents de l'historique (ceux qui y sont déjà sont ignorés ; une ligne retouchée à la main est reconstruite depuis les colonnes lisibles).
L'application rappelle de sauvegarder au bout de 30 jours. À faire chaque mois, et à garder dans un dossier de l'entreprise.

## Si twimm change son export

À l'import, les colonnes sont contrôlées : une colonne indispensable absente (N° twimm, Objet) bloque l'import avec la liste des colonnes lues ; une colonne utile absente est signalée avec sa conséquence ; et si presque tous les logements sont « à vérifier » pour le même motif, un avertissement indique que le format a sans doute changé.
Pour adapter la lecture : ajouter un export récent **anonymisé** dans `test/`, corriger `src/js/20-import-core.js`, lancer `npm test`.

## Import twimm

Onglet **Import** : chargez l'export twimm (`.csv`). Chaque logement est classé *Prêt*, *À vérifier* ou *Déjà généré*, avec le motif.
Rien n'est ignoré silencieusement : les cas douteux (plusieurs logements, bilan avec infestation ou « déjà fait », numéro de module mal saisi, adresse ou étage incohérents) restent visibles et modifiables.

## Suivi : annuler / remplacer, certificats oubliés, envois par site

- **Annuler / Remplacer** (onglet Historique) : l'historique partagé ne perd jamais de ligne. Une annulation ajoute une ligne `<réf>~ANNUL` (motif obligatoire) ; un remplacement ajoute un certificat portant `remplace=<réf remplacée>`, sous la clé `<réf>~R2`, `~R3`… si la référence existe déjà. Aucun changement du script Google n'est nécessaire.
- **À faire** : chaque import twimm mémorise (sur l'appareil) les logements sans certificat. La liste se vide toute seule quand le certificat est généré, et un certificat annulé y revient. « Les traiter dans Import » reprend la liste dans l'écran de génération en lot.
- **Envois** : certificats en vigueur regroupés par site (période au choix), ZIP par site ou global, liste à copier. Le suivi « envoyé » reste sur l'appareil.

## Mail Outlook et certificats « à vérifier »

- Boutons **Mail** (Nouveau, Import, Historique, Envois par site) : téléchargent un brouillon `.eml` (texte prêt, PDF joint). Double-clic : Outlook l'ouvre comme un message à envoyer ; il reste à saisir le destinataire. Un lien `mailto:` ne pourrait pas joindre le PDF.
- Import : un logement « à vérifier » sans erreur bloquante se passe en « Prêt » avec **Marquer prêt** ; après **Modifier → Appliquer**, il passe automatiquement en « Prêt » si tout est correct.

## Signature des mails

Réglages → « Ma signature pour les mails » : texte + logo, enregistrés **sur l'appareil** (chacun la sienne). Ils sont ajoutés à chaque brouillon `.eml` ; le logo est une image intégrée au message (pas une pièce jointe).
