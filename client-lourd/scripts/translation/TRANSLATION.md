# Translation

## Introduction

Ce document explique comment nous gérons la traduction de l’application sur nos deux clients : **client lourd (Angular)** et **client léger (Android/Jetpack Compose)**.
Les **JSON Web** (`en.json`, `fr.json`) sont la **source de vérité**. Pour Android, nous générons automatiquement des `strings.xml` à partir de ces JSON.

---

## Principes & conventions

-   **Source de vérité** : `client-lourd/src/assets/i18n/en.json`, `.../fr.json`
-   **Clés** : en **kebab-case** (ex. `settings-page.apply`) et **structurées par contexte** :

    -   Page : `settings-page.*`, `login-page.*`
    -   Composant réutilisable : `header.*`, `dropdown.*`
    -   Général : `general.*`
    -   Données métier : `item-name.*`, `item-description.*`, `tile-description.*`

-   **Code de langage ISO 639**: les valeurs représentant les langues dans le code **DOIVENT** suivre le [Code de langage ISO639](https://en.wikipedia.org/wiki/List_of_ISO_639_language_codes). Donc 'fr' pour français et 'en' pour english. Côté client-lourd/serveur nous avons fait un `enum` Language contenant les codes 'fr' et 'en'. Pour le client-leger, je vous suggère de faire la même chose.

---

## Client lourd (Angular)

### Bibliothèque

Nous utilisons `@ngx-translate/core`. Les fichiers :

```
client-lourd/src/assets/i18n/en.json
client-lourd/src/assets/i18n/fr.json
```

Exemple d’implémentation dans un **composant réutilisable** `HeaderComponent` :

**`fr.json`**

```json
{
    "header": {
        "home": "Accueil"
    }
}
```

**`en.json`**

```json
{
    "header": {
        "home": "Home"
    }
}
```

**`header.component.ts`**

```ts
@Component({
    selector: 'app-header',
    standalone: true,
    imports: [TranslatePipe], //VOUS DEVEZ IMPORTER LE TranslatePipe pour que translate fonctionne
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {}
```

**`header.component.html`**

```html
<h1>{{ 'header.home' | translate }}</h1>
```

### Cas spéciaux

#### 1) Paramètres dans une phrase

Utilise les **paramètres** de `ngx-translate` :

**`fr.json`**

```json
{
    "greeting": "Bonjour {{name}} ! Vous avez {{count}} message(s)."
}
```

**`en.json`**

```json
{
    "greeting": "Hello {{name}}! You have {{count}} message(s)."
}
```

**Template**

```html
<p>{{ 'greeting' | translate:{ name: userName, count: messageCount } }}</p>
```

**Dans un `.ts` (synchrone)**

```ts
const text = this.translateService.instant('greeting', { name: userName, count: 3 });
```

#### 2) Pluriels

**`fr.json`**

```json
{
    "inbox": "{count, plural, =0 {Aucun message} one {# message} other {# messages}}"
}
```

**`en.json`**

```json
{
    "inbox": "{count, plural, =0 {No messages} one {# message} other {# messages}}"
}
```

**Template**

```html
<p>{{ 'inbox' | translate:{ count: messageCount } }}</p>
```

#### 3) Utiliser le service en `.ts`

Vous devez injecter le service TranslateService dans votre classe pour pouvoir utiliser les méthodes suivantes

-   **Synchrone** (préféré dans des helpers) : `translate.instant(key, params?)`
-   **Asynchrone** : `translate.get(key, params?).pipe(take(1)).subscribe(...)`

> Évite `subscribe` dans une fonction qui doit **retourner** une chaîne immédiatement (utilise `instant`).

---

## Client léger (Android / Jetpack Compose)

### Source & génération

Les JSON Web (`en.json`, `fr.json`) sont la source.
On génère des `strings.xml` Android via le script Node **(dans le repo client-lourd)** :

-   Script : `client-lourd/scripts/translation/i18n-generate.js`
-   Entrées : `client-lourd/src/assets/i18n/en.json`, `.../fr.json`
-   Sorties (ignorées par Git) :
    `client-lourd/scripts/translation/out/values/strings.xml`,
    `client-lourd/scripts/translation/out/values-en/strings.xml`

**Commande**

```bash
cd client-lourd
npm run i18n:android
```

Ensuite, **copie** les fichiers générés vers le client-leger :

**NB**: le `values/strings.xml` représente notre langue par défaut qui est le Français (fr) pour notre projet

> Les clés Android sont **aplaties** et **normalisées** (kebab/dot → underscore, minuscules), p. ex.
> `item-description.attribute-editor-1` → `item_description_attribute_editor_1`.

**NB**: À chaque fois qu'on souhaite ajoutée un nouveau texte côté client-léger, il faut passer par cette procédure -> _1. ajouter clé dans les fichiers json du client-lourd -> 2. Générer les fichiers .xml avec la commande `npm run i18n:android`_ ->3. Copie-colle vers client-léger

> Aussi tous les paramètres {{...}} sont transformés automatiquement en placeholders Android %1$s, %2$s, etc. (dans l’ordre d’apparition).

En effet, dans Jetpack Compose, vous récupérez des chaînes traduites avec des espaces réservés comme %1$sde votre strings.xmlfichiers de ressources utilisant le stringResourcefonction. Cette fonction vous permet d'insérer dynamiquement des valeurs dans vos chaînes traduites, assurant une bonne localisation.
Voici un exemple:

```xml
    <string name="greeting">Hello, %1$s!</string>
```

Récupérez et utilisez la chaîne dans votre Composable:

```kotlin
    import androidx.compose.material3.Text
    import androidx.compose.runtime.Composable
    import androidx.compose.ui.res.stringResource
    import com.yourpackage.R

    @Composable
    fun GreetingMessage(name: String) {
        Text(
            text = stringResource(R.string.greeting, name)
        )
    }
```

stringResource(R.string.welcome_message, userName, messageCount)récupère la chaîne et remplace les espaces réservés par les arguments fournis. L'ordre des arguments est important et correspond à la $1, $2, etc., dans le XML.

### Utilisation en Compose

```kotlin
Text(text = stringResource(R.string.item_description_attribute_editor_1))
```

> Les `\n` des JSON sont conservés dans `strings.xml` et rendus par Compose/Android.

**NOTE 8 OCTOBRE 2025 HUBERT:** Pour le moment, l'implémentation de la traduction est uniquement implémenté côté client-lourd. Je n'ai pas touché au client-léger. J'ai simplement crée un script pour générer les fichiers .xml. Il va falloir que quelqu'un "set-up" les fichiers côté client-léger. Quand je veux dire 'set-up', je veux dire juste 'drag-and-drop' les fichiers .xml générés par mon script au bon endroit. Chaque projet vient avec un fichier `strings.xml` par défaut donc ne soyez pas étonnés si le document en posséde déjà un. Pour comprendre comment gérer les fichiers strings.xml côté client-léger, je vous suggère de regarder cette vidéo: [Create an App in Different Languages using Jetpack Compose & Kotlin | Android App Tutorials](https://youtu.be/shrs4z9MmaU?si=C_rPwVa-Fchgq2gK)

### Clés venant du serveur (codes d’erreurs, etc.)

-   **Web** : on garde les **tirets** (`invalid-email`) dans les clés i18n web.
-   **Android** : les noms de ressources **n’acceptent pas** `-` ni `.` → le script convertit en `_`.

Il faudrait donc **implémenter** une méthode pour transformer ces clés venant du serveur

Exemple util côté Android si tu dois mapper dynamiquement :

```kotlin
fun toAndroidResName(webKey: String): String =
    webKey.lowercase().replace(Regex("[^a-z0-9_]+"), "_").replace(Regex("_+"), "_")
```

**Ceci va donc transformer une clé `invalid-email` -> `invalid_email`**

## Bonnes pratiques (checklist)

-   [ ] Clés i18n **courtes, stables, en kebab-case**, organisées par **page/composant/general**.
-   [ ] **Aucune** chaîne en dur dans les composants ciblés par la feature.
-   [ ] Pour l’affichage **multi-lignes**, stocker `\n` dans les JSON (Web) → compiler remplace par `<br>`.
-   [ ] Pour **paramètres** et **pluriels**, utiliser ICU (`{{var}}`, `{count, plural, ...}`).
-   [ ] Dans le code **TS**, préférer `translate.instant()` pour des helpers synchrones.
-   [ ] Générer les `strings.xml` **avant** d’intégrer côté Android, et **copier** dans le client-leger
-   [ ] Éviter les `%` littéraux dans les JSON ; si nécessaire pour Android, utiliser `%%`.

---

## Annexe — Exemples clés récurrentes

**Noms & descriptions d’items**

```json
{
    "item-name": {
        "conditionBased1": "Griffe de Survie",
        "attributeEditor1": "Plume du Faucon"
    },
    "item-description": {
        "conditionBased1": "- Nom: Griffe de Survie.\n- Type: Utilisation conditionnée.\n- Effet: Si la Vie <= 2, donne +2 Défense.\n",
        "attributeEditor1": "- Nom: Plume du Faucon.\n- Type: Modificateur d'attributs.\n- Effet: +1 Vitesse, +1 Attaque.\n"
    }
}
```

**Dialogues de confirmation**

```json
{
    "dialog": {
        "delete-channel": {
            "title": "Supprimer le canal ?",
            "text": "Cette action est irréversible. Voulez-vous continuer ?",
            "cancel-button-label": "Annuler",
            "confirm-button-label": "Supprimer"
        },
        "join-channel": {
            "title": "Rejoindre ?",
            "text": "Vous allez rejoindre ce canal. Vos nouveaux messages seront visibles par tous les membres.",
            "cancel-button-label": "Annuler",
            "confirm-button-label": "Rejoindre"
        },
        "leave-channel": {
            "title": "Quitter le canal ?",
            "text": "Vous allez quitter ce canal. Vous ne recevrez plus de messages, mais vous pourrez le rejoindre à nouveau.",
            "cancel-button-label": "Annuler",
            "confirm-button-label": "Quitter"
        }
    }
}
```
