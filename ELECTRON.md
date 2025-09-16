# Utilisation d'Electron dans un projet de LOG2990

## Introduction

Ce document vise à être un guide rapide de l'intégration d'Electron dans un projet existant d'Angular. Ce document assume que votre projet suit la structure donnée en LOG2990. Il se peut que vous ayez à effectuer des étapes supplémentaires pour pouvoir faire l'intégration, notamment si vous mettez à jour la version d'Angular à Angular 19 ou plus (à date du 12 août 2025).

## Electron

[Electron](https://www.electronjs.org/) est un cadriciel (_framework_) qui permet de développer des applications interactives de bureau (_desktop GUI application_) en combinant des technologies du Web. Electron utilise l'engin de rendu de Chromium (Blink),NodeJS et l'engin JavaScript V8. Ces technologies permettent d'avoir un projet facilement portable qui demande peu de modifications pour être déployé sur une nouvelle plateforme. Présentement Electron est capable de créer des applications sur Windows, Linux et macOS.

Un grand nombre d'applications connues utilisent Electron pour leurs clients de bureau : Visual Studio Code, Discord, Twitch, Slack. Une liste exhaustive est disponible [ici](https://www.electronjs.org/apps).

Note : à cause de sa dépendance à V8 et Blink qui doivent être présents dans le produit final, les exécutables créés avec Electron ont tendance d'avoir une plus grande taille qu'une application native.

## Configuration initiale

Avant de commencer, il se peut que vous vouliez mettre à jour votre version d'Angular. Ceci n'est pas obligatoire, mais permet de bénéficier des nouvelles fonctionnalités introduites dans les nouvelles versions d'Angular (18 et plus). Pour faire la mise à jour, vous pouvez suivre le guide généré par Angular, disponible [ici](https://angular.dev/update-guide). Assurez-vous de mettre les bonnes versions de début et fin.

### Librairies à ajouter

Vous aurez besoin de 2 librairies pour votre projet :

-   `electron` : permet de développer une application [Electron](https://www.npmjs.com/package/electron).
-   `electron/packager` : permet de créer un exécutable à partir de votre application Electron. Il existe d'autres alternatives ([electron-forge](https://github.com/electron/forge) qui utilise `electron-packager` et [electron-builder](https://github.com/electron-userland/electron-builder) par exemple).

Dans les 2 cas, assurez-vous d'installer les paquets npm comme des dépendances de développement en faisant `npm install --save-dev electron @electron/packager`. Ceci minimisera la taille de vos exécutables.

### Modifications du projet

Vous aurez à modifier quelques fichiers de votre projet pour pouvoir utiliser Electron.

#### main.js

Afin de pouvoir lancer votre application avec Electron, il faut construire une fenêtre de navigateur et charger l'HTML de l'application dans la fenêtre. Ceci est fait à l'aide du fichier `main.js` fourni. Vous devez mettre ce fichier à la racine de votre projet (à côté de votre `package.json`) et l'inclure dans votre configuration (voir la section plus bas).

La configuration passée dans l'objet `BrowserWindow` permets de configurer la fenêtre de votre exécutable (taille, accès à Node, etc). Par défaut, votre application sera lancée dans un mode fenêtré de taille `800x1000` pixels que vous pouvez modifier au besoin. Les outils de développement seront ouverts par défaut. Pour plus de détails, référez-vous à la [documentation](https://www.electronjs.org/docs/api/browser-window) d'Electron sur le sujet.

Assurez-vous que le chemin vers votre application Angular compilée est bien configuré dans le paramètre `pathname` dans la fonction `loadURL`. Normalement, ce paramètre doit être `path.join(__dirname, '/dist/client/index.html')`, sinon utilisez la même valeur que la variable `outputPath` dans `angular.json`.

#### package.json

Premièrement, vous devez rajouter une nouvelle entrée pour pointer vers le fichier `main` d'Electron (disponible sur Moodle). Vous n'avez qu'à ajouter `"main": "main.js",` dans votre `package.json` (après `version` par exemple). Assurez-vous de donner le bon nom de fichier à votre propriété `main`. Ce fichier présente une configuration minimaliste pour vous aider à commencer le projet. Vous aurez surement à le modifier durant le projet pour répondre à des besoins supplémentaires.

Voici 2 scripts qu'on vous propose pour vous aider à développer et déployer. Vous pouvez les ajouter dans l'objet `"scripts"` et les lancer en faisant `npm run myScript`.

-   Compiler le projet et le lancer dans Electron: `"start:electron": "ng build --configuration=development --base-href ./ && electron ."` Ceci va compiler le projet dans le repertoire spécifié dans la variable ` outputPath` dans `angular.json` (normalement `/dist/client/`) et le lancer dans une fenêtre séparée d'Electron. Notez que ceci utilise la configuration en mode _dev_ et utilisera donc `environment.ts` pour les variables d'environnement.

-   Compiler le projet en mode production et créer un exécutable : `"build:electron": "ng build --base-href ./ && electron-packager . --asar --ignore=/node_modules --ignore=/.angular --ignore=/e2e --ignore=/src --overwrite --out=./build"` Ceci est composé de 2 étapes :
    -   `ng build` compile votre projet en mode production (optimisé, minifié et fait pour être servi par un serveur HTTP par exemple). Le fichier `environment.prod.ts` sera utilisé pour les variables d'environnement.
    -   `electron-packager ... ` permet de faire le paquetage et la production d'un exécutable. Le script donné génère un exécutable et les librairies nécessaires pour Windows et Linux dans le répertoire `/build`. On vous recommande de voir la [documentation de l'outil](https://electron.github.io/electron-packager/main/interfaces/electronpackager.options.html) pour des paramètres supplémentaires si vous voulez des fonctionnalités plus ponctuelles pour une plateforme spécifique. `--asar` permet de générer une archive asar qui contient certains fichiers nécessaires. `--ignore=X` permet d'ignorer certains fichiers lors de la création de l'exécutable final : attention à ne pas inclure les répertoires `node_modules` et `.angular` qui peuvent avoir une taille de plusieurs centaines de Mo. Finalement `--overwrite` permet de réécrire sur des fichiers déjà existants dans le répertoire spécifié par `--out`.

**Note:** si vous avez des chemins relatifs pour des assets (ex : `src = '../../assets/someIcon.png'`) dans votre HTML ou TS, ceux-ci causeront probablement des erreurs. Vous devez modifier les chemins pour pointer vers le dossier `assets` de votre _build_ qui est situé au même niveau que votre code, c'est-à-dire `src = './assets/someIcon.png'` .

## Ressources supplémentaires

La [documentation](https://www.electronjs.org/docs/latest/) d'Electron offre plusieurs tutoriels sur le fonctionnement de l'outil. Electron offre la possibilité d'avoir plusieurs processus en même temps, comme un navigateur web moderne. Ceci peut être très utile dans le cas de plusieurs fenêtres différentes faisant partie de la même application.

La section [Inter-Process Communication(IPC)](https://www.electronjs.org/docs/latest/tutorial/ipc) explique comment travailler avec les processus d'Electron.

## Alternatives

Une alternative possible à Electron est le projet [Tauri](https://tauri.app/) qui est plus récent et basé sur le langage Rust et le _web renderer_ du système (`WebKitGTK` pour Linux, `WebView2` pour Windows et `WebKit` pour macOS).

Les exécutables produits par Tauri sont plus petits puisqu'ils n'ont pas besoin de contenir une distribution de Chromium complète avec eux. De manière générale, les applications produites par Tauri sont également moins demandantes en ressources. À noter que Tauri est un projet plus jeune et possède moins de documentation et de support que Electron.
