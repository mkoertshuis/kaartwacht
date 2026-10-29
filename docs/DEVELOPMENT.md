# Ontwikkelen aan Kaartwacht

Lees eerst de [projectafspraken](../AGENTS.md) en de [README](../README.md) voor het doel en de oefenvormen. Deze gids beschrijft de huidige code en hoe je wijzigingen controleert.

## Lokaal starten

Open `index.html` rechtstreeks in een moderne browser of gebruik Live Server. Voor een vaste lokale URL kun je vanuit de projectmap een eenvoudige server starten:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000; stop de server met Ctrl+C. De app heeft geen installatie, bundler, backend of buildstap. Node.js is alleen nodig voor de onderstaande codecontroles. Lettertypen worden via Google Fonts geladen; bij ontbrekende verbinding gebruikt CSS de opgegeven terugvallettertypen.

## Waar staat wat?

| Bestand | Verantwoordelijkheid |
| --- | --- |
| `index.html` | Paginastructuur, instellingen, dialogs en vaste containers voor kaarten en vragen. |
| `styles.css` | Kaarten, tafel, antwoordweergave, panelen en responsive indeling. |
| `training.js` | Spelregels, delen, handsortering, resterende kaarten, renoncebewijs, vraaggeneratie en antwoordcontrole. |
| `app.js` | Spelstatus, beurten, timers, knoppen, rendering, feedback en opslag van voortgang. |
| `training.test.js` | Geautomatiseerde tests voor de engine, inclusief volledige handen. |

`index.html` laadt klassieke scripts met `defer`: eerst `training.js`, daarna `app.js`. De engine stelt `Trainer` beschikbaar via `globalThis.Trainer` in de browser en via `module.exports` voor de Node-tests. Houd de engine onafhankelijk van DOM en lokale opslag.

## Kaarten en spelstatus

- Een kaart heeft de vorm `{ rank: '7', suit: 1 }`. `cardKey(card)` maakt daarvan `'1-7'`.
- De kleurindices zijn `0 = ♠`, `1 = ♥`, `2 = ♦`, `3 = ♣`. Verander deze indices niet voor een andere weergavevolgorde.
- `HAND_SUIT_ORDER = [3, 2, 0, 1]` is de standaardweergave ♣ ♦ ♠ ♥. Standaard staat de hoogste kaart eerst; `RANKS` loopt juist van `2` tot `A`. Gebruikersvoorkeuren wijzigen deze kleurindices en kaartsterkte niet.
- Spelers zijn `0 = Jij`, `1 = Links`, `2 = Overkant`, `3 = Rechts`. De beurt loopt met `(player + 1) % 4`.
- `game` in `app.js` bevat instellingen, vier `hands`, `trump`, `turn`, `phase`, de lopende `trick`, voltooide `history`, de huidige `question` en `response`, resultaten en vraagplanning.

Een afgeronde slag in `history` bewaart de speelvolgorde, ook als een andere speler uitkwam:

```js
{
  number: 1,
  plays: [
    { player: 0, card: { rank: '7', suit: 1 } },
    // De overige drie kaarten in de gespeelde volgorde.
  ],
  winner: 2,
}
```

De kaartinformatie voor vragen komt uit `history` en de eigen resterende hand. `remainingCards(..., 'all')` telt de eigen hand mee; `'others'` trekt die af. `knownVoids(history)` geeft per speler en kleur het nummer van de eerste slag met bewijs, of `null`. Alleen niet bekennen bewijst hier een renonce; onbekend betekent niet dat een speler de kleur nog heeft. Bekijk nooit de computerhanden om een geheugenvraag of bewijs te maken.

## Kaartvolgorde van de eigen hand

`Trainer.sortHand(cards, suitOrder = HAND_SUIT_ORDER, direction = 'desc')` retourneert een nieuwe gesorteerde array. `direction` is `desc` voor A → 2 of `asc` voor 2 → A. De sortering laat kaartobjecten en de aangeleverde array intact. `deal()` blijft de standaardvolgorde gebruiken; de interface past daarna de gebruikersvoorkeur toe.

`handOrder` in `app.js` heeft de vorm `{ suits: [3, 2, 0, 1], direction: 'desc' }`. `suits` is een permutatie van alle vier kleurindices. De sectie **Kaartvolgorde** in het menu bevat vier dropdowns met `data-hand-suit` voor positie 0–3 en de richtingkeuze `hand-rank-order`. Kiezen van een kleur die elders staat wisselt de twee posities om; alle 24 volgordes blijven bereikbaar zonder dubbele of ontbrekende kleuren. Het label `hand-order-label` bij de eigen hand toont de gekozen volgorde.

Een wijziging sorteert alleen `game.hands[0]` opnieuw en ververst de hand, het label en de sorteerbediening. Gebruik hiervoor geen `createRound()` en herplan geen lopende bot-timer. De huidige slag, vragen, antwoorden, geschiedenis, scores en beurt blijven behouden. Nieuwe handen krijgen dezelfde voorkeur. De bestaande modale pauze geldt ook terwijl deze instellingen worden bekeken.

## Spelfases en knoppen

| Fase | Gedrag en overgang |
| --- | --- |
| `brief` | Nieuwe hand en opdracht. `check-button` start via `startTrick()`. |
| `play` | `playCard()` accepteert een legale kaart van de speler aan de beurt; bots worden ingepland. Vier kaarten ronden de slag af naar `trick`. |
| `trick` | Winnaar en slag blijven zichtbaar. `check-button` opent een geplande vraag of begint de volgende slag. De winnaar komt uit. |
| `question` | Tafel en telhulp zijn verborgen. `check-button` beoordeelt een ingevuld antwoord via `submitAnswer()`. |
| `feedback` | Uitleg en optionele bewijsweergave. `next-button` gaat naar de volgende slag of, na de laatste slag, naar `done`. |
| `done` | Resultaten en alle gespeelde slagen. `next-button` maakt een nieuwe hand. |

`createRound()` wist de timer en maakt een nieuwe hand. Een andere oefenvorm of oefeninstelling kiezen doet dit ook. Kaartvolgorde aanpassen, alleen een paneel openen of het scherm draaien mag de hand niet vervangen.

`render()` schrijft `game.phase` naar `.table-panel[data-phase]`; CSS gebruikt dit onder meer om de lege tafel tijdens vragen, feedback en het resultaat te verbergen.

## Vraagplanning en antwoorden

Lengte en oefenvorm zijn afzonderlijke instellingen: 3, 5, 8, 10 of 13 slagen tegenover de modes `counts`, `cards`, `players`, `rebuild` en `table`. Je volgt 1, 2 of 4 kleuren. De gebruiker kiest deze leeropbouw zelf. Mode `table` zet vier kleuren en alle rangen aan, maar behoudt de gekozen lengte.

`askQuestion()` roept `Trainer.createQuestion()` aan. De eerste vraag komt na twee of drie slagen, bij een hand van drie slagen altijd na twee. Tussen vervolgvragen zitten één of twee slagen bij korte handen en twee of drie bij langere handen. Na de laatste slag volgt altijd een vraag. De gebruiker bevestigt het verdergaan na een slag met de knop.

| `question.kind` | Antwoord in `game.response` |
| --- | --- |
| `count` | Geheel getal, inclusief een geldige nul. |
| `recognize` | Boolean: `true` betekent dat de kaart nog over is. |
| `cards` | Array van kaartkeys; volgorde maakt niet uit. |
| `voids`, `canFollow` | Array van spelers met bewezen renonce, alleen tegenstanders 1–3. |
| `highest` | Boolean: is de eigen kaart de hoogste overgebleven van die kleur? Troef kan haar nog verslaan. |
| `rebuild` | Vier kaartkeys op spelerindex, dus `[Jij, Links, Overkant, Rechts]`. |

`responseReady()` houdt onbeantwoorde vragen tegen. Een lege selectie vraagt een expliciete klik op de knop voor geen kaarten of geen bewezen spelers. Reconstructie vereist vier unieke toewijzingen. `Trainer.evaluateQuestion()` controleert het antwoord; `skillFor()` koppelt het vraagtype aan opgeslagen vaardigheidsresultaten.

De gecombineerde UI-modus doorloopt in `askQuestion()` een reeks vraagtypen. Alleen als de engine zelf een type voor `table` moet kiezen, kiest zij willekeurig uit de kandidaten. Houd dit verschil in gedachten als je de afwisseling wijzigt.

Na een fout bewaart `game.retry` het type en eventueel de kleur voor de volgende vraag in dezelfde hand. `question.evidence` bevat relevante openbare slagen; na een fout worden die automatisch getoond als ze beschikbaar zijn. `review-button` kan de terugblik tonen of verbergen.

Als de gevolgde kleuren uitgespeeld zijn of een hoogste-kaartvraag geen geschikte eigen kaart heeft, valt de engine terug op een eerdere slag. Een herkenningsvraag zonder geschikte kaart buiten de eigen hand kan eveneens zo terugvallen. Na dertien slagen is de laatste vraag daardoor altijd `rebuild`.

De optionele telhulp verschijnt alleen in `play` en `trick`, zolang het aantal voltooide slagen kleiner is dan `Math.ceil(game.target / 2)`. Zij telt ook de al gespeelde kaarten van een lopende slag mee, zodat scope `others` blijft kloppen nadat een eigen kaart uit de hand verdwijnt.

## Timers, panelen en opslag

`scheduleBot()` plant één beurt met 350, 800 of 1300 ms vertraging. Een callback controleert nogmaals het actieve game-object, de fase, de speler en of een paneel openstaat. Bewaar deze controles: een timer van een vorige hand mag geen kaart in de nieuwe hand spelen.

`settings-dialog` en `info-dialog` zijn native modale dialogs. `openPanel()` wist de bot-timer. Na sluiten hervat `scheduleBot()` de beurt als er geen ander paneel openstaat. Sluiten werkt via de kruisknop, Escape en een klik die op de achtergrond begint én eindigt. Focus keert terug naar de opener; de rest van de pagina is tijdens een modal niet bedienbaar.

Voortgang staat onder `localStorage['kaartwacht-progress']`: `score`, `streak`, `best` en `skills` met `correct` en `attempts`. De kaartvolgorde staat apart onder `localStorage['kaartwacht-hand-order']` als het `handOrder`-object. Valideer bij inlezen JSON, de permutatie en de richting; ontbrekende of ongeldige voorkeuren krijgen de standaardinstellingen. Handen, oefeninstellingen en spelstatus zijn niet persistent. Zonder beschikbare opslag moet de app blijven werken. Gebruik voor herhaalbare opslagcontroles dezelfde URL en poort.

## DOM en responsive layout

De IDs in `index.html` zijn het contract met de `$()`-selecties in `app.js`. Controleer beide bestanden bij een wijziging. Een ontbrekend `keyboard-hint`-ID heeft eerder `render()` laten stoppen voordat de bot-timer werd ingepland. Een teststub die automatisch elk opgevraagd element verzint, vindt zo'n fout niet.

Kaart- en antwoordcontainers worden opnieuw gerenderd met `innerHTML`. Klik- en change-handlers zitten op hun vaste ouders (`hand`, `question-controls`, `focus-suits`); behoud eventdelegatie en toetsenbordfocus na een render.

De portrait-regels voor telefoons staan onderaan `styles.css`, bij maximaal 600 px breed. Ze gebruiken zeven handkolommen van minimaal 44 px, twee handrijen en een tafel die met `svh` de resterende schermhoogte benut. De stoelen staan daar in een grid met dezelfde spelerposities als op grotere schermen. Pas het hoogtebudget aan als kopteksten, kaartmaten of padding veranderen.

De sticky footer moet bereikbaar blijven zonder antwoorden te bedekken. De portrait-ouder gebruikt daarom `overflow: visible`; opnieuw `overflow: hidden` toevoegen kan het plakken aan de viewport verbreken. Langere vragen, telhulp en terugblikken mogen verticaal scrollen. Controleer ook de noord- en zuidkaarten op afknippen.

## Controles bij wijzigingen

Voor JavaScript- en enginewijzigingen zijn deze controles beschikbaar:

```sh
node --check app.js
node --check training.js
node training.test.js
```

De suite controleert delen, handsortering, legale kaarten, slagwinnaars, scope, renoncebewijs, vraagantwoorden en volledige handen. Bij sorteerwijzigingen horen controles voor alle kleurvolgordes, beide richtingen en het intact blijven van de invoer. De suite controleert de engine; er is geen browser- of DOM-testframework in de repo. Alleen documentatie wijzigen vraagt geen nieuwe spelsimulaties.

Controleer na relevante UI-, timer- of spelwijzigingen in de browser:

1. Start een hand, speel zelf een kaart en wacht tot Links, Overkant en Rechts spelen. Ga door naar een volgende slag en controleer dat de winnaar uitkomt.
2. Open menu of informatie terwijl een bot aan de beurt is. Er mogen geen kaarten verschijnen zolang het paneel openstaat; sluiten hervat dezelfde hand. Controleer kruisknop, Escape, achtergrondklik en toetsenbordfocus.
3. Probeer beide scopes, herkenningsvragen, kaartselectie en de expliciete lege selectie. Bij spelersvragen mag alleen zichtbaar niet bekennen als bewijs tellen.
4. Geef een fout antwoord, controleer uitleg en beschikbare bewijsweergave, en speel verder. Bouw ook een slag terug waarvan een andere speler uitkwam.
5. Speel een volledige hand van dertien slagen. Er moeten tussenvragen zijn; de laatste vraag gebruikt een eerdere slag. Controleer resultaat, nieuwe hand en opgeslagen voortgang na herladen.
6. Controleer met dertien eigen kaarten op 320×568, 360×640, 375×667 en 390×844, plus tablet 768×1024 en liggende stand. Geen horizontale overflow, overlappende kaarten of onbereikbare knoppen; antwoorden moeten ook onder een sticky footer aanklikbaar blijven.
7. Draai tijdens een hand tussen staand en liggend. Controleer dat de hand en slag behouden blijven, en kijk steeds naar consolefouten.
8. Wissel kleuren en sorteerrichting bij **Kaartvolgorde**. Controleer unieke kleuren, juiste rangvolgorde en het label. Wijzig dit ook tijdens een slag en een ingevulde geheugenvraag: kaarten, beurt, antwoorden en score blijven behouden. Controleer na sluiten dat de botbeurt verdergaat en na een nieuwe hand en herladen dat de voorkeur bewaard blijft. Controleer ook ontbrekende, ongeldige en onbeschikbare lokale opslag.

## Een functie uitbreiden

Voor een nieuw vraagtype werk je `createQuestion()` en `evaluateQuestion()` in de engine bij, met tests voor goede en foute antwoorden. Voeg in `app.js` de bediening, antwoordvalidatie, uitleg, bewijsweergave en `skillFor()`-koppeling toe; pas zo nodig de gecombineerde reeks aan. Houd opgeslagen vaardigheidsdata compatibel.

Voor een nieuwe oefeninstelling werk je HTML, `settings()`, de change-handler en eventuele zichtbaarheid in `renderSettings()` samen bij. Leg vast of zij een nieuwe hand start. Weergavevoorkeuren zoals kaartvolgorde hebben een eigen handler die de lopende hand behoudt. Houd bij gedragswijzigingen ook deze gids en de README actueel.
