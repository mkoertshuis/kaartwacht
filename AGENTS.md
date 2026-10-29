# Projectafspraken voor Kaartwacht

## Doel

Kaartwacht leert spelers informatie uit eerdere slagen bij te houden: aantallen per kleur, exacte resterende kaarten en spelers die bewezen een kleur niet meer hebben. De gebruiker bouwt zelf op van één naar twee en vier kleuren en van korte oefeningen naar een volledige hand van dertien slagen.

Lees [README.md](README.md) voor het productdoel en de huidige mogelijkheden. Lees [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) voor de architectuur, spelfases en ontwikkelcontroles. Leg blijvende afspraken in deze bestanden vast, zodat een volgende sessie zonder eerdere chat kan aansluiten.

## Product en bediening

- Houd de kaarten en de eigen hand centraal. Gebruik rangtekens en ♣ ♦ ♠ ♥ op kaarten; geef bediening toegankelijke namen.
- Houd de interface Nederlandstalig. Gebruik Engels voor committitels en commitbeschrijvingen.
- Gebruik **♣ ♦ ♠ ♥**, hoog naar laag binnen elke kleur, als standaard voor de eigen hand. Respecteer de gekozen kleurvolgorde en sorteerrichting van de gebruiker; iedere kleur moet precies één keer voorkomen.
- Een andere kaartvolgorde verandert alleen de weergave van de huidige hand. Behoud slag, vragen, antwoorden, scores en beurt; gebruik de voorkeur ook bij volgende handen en bewaar haar lokaal.
- Ondersteun telefoon, tablet en desktop. Op staande telefoons vanaf 320 pixels breed moeten dertien handkaarten in twee rijen passen en de speelknoppen bereikbaar blijven.
- Bewaar de koppeling tussen speler en tafelpositie: jij onderaan, Links links, Overkant bovenaan en Rechts rechts.
- Zet oefeningen en instellingen achter het hamburgermenu en opdracht en voortgang achter de infoknop.
- Pauzeer computerbeurten zolang een paneel openstaat; hervat dezelfde hand na sluiten.
- Houd de eigen hand zichtbaar tijdens vragen. Verberg de gespeelde slag en telhulp voordat een geheugenvraag wordt beantwoord.
- Houd oefenvorm, aantal gevolgde kleuren en aantal slagen afzonderlijk instelbaar. De oefenvorm `table` en de lengte `hard` zijn verschillende keuzes.

## Spel- en leerlogica

- Gebruik de bestaande spelbasis: 52 unieke kaarten, vier handen van dertien kaarten, kleur bekennen verplicht, troef boven de uitgekomen kleur en de slagwinnaar komt uit.
- Leid vraagantwoorden af uit gespeelde slagen en de eigen hand. Gebruik verborgen computerhanden niet als informatiebron voor vragen of renoncebewijs.
- Onderscheid bewezen geen kleur hebben van onbekend. Niet bekennen levert bewijs; een ontbrekende aanwijzing levert geen bewijs dat iemand die kleur nog heeft.
- Bewaak de betekenis van `scope`: `all` omvat de eigen hand; `others` trekt die ook af.
- Stel vragen na complete slagen en speel daarna dezelfde hand verder. Gebruik een eerdere slag als terugbouwvraag wanneer een resterende-kaartvraag niet meer geschikt is, waaronder na alle dertien slagen.
- Laat uitleg en terugblikken aansluiten op daadwerkelijk gespeelde slagen. Bewaar de speelvolgorde en de speler bij iedere kaart.

## Codeopbouw

- Houd de app rechtstreeks in de browser uitvoerbaar met gewone HTML, CSS en JavaScript. Er is momenteel geen buildstap of pakketinstallatie nodig.
- Plaats pure spelregels, vraaggeneratie en antwoordcontrole in `training.js`; plaats DOM, spelverloop, timers en opslag in `app.js`.
- Houd kleurindices vast (`0 = ♠`, `1 = ♥`, `2 = ♦`, `3 = ♣`) en pas weergavevolgorde toe met `Trainer.sortHand()`. Deze helper retourneert een nieuwe array en wijzigt de aangeleverde kaarten niet.
- Laad `training.js` vóór `app.js`, beide met `defer`. Behoud de browserexport `Trainer` en de CommonJS-export voor de bestaande tests.
- Werk HTML-id's en hun JavaScript-verwijzingen samen bij. Een ontbrekend element kan de renderfunctie en daarmee de volgende computerbeurt stoppen.
- Gebruik `game.phase` en het bijbehorende `data-phase` op `.table-panel` als uitgangspunt voor de faseafhankelijke interface.
- Annuleer oude timers bij een nieuwe hand en voorkom dat een achtergebleven callback een andere hand wijzigt.
- Laat bestaande lokale voortgang bruikbaar. Bewaar kaartvolgorde apart van scores, valideer ingelezen voorkeuren en houd oefenen mogelijk wanneer lokale opslag niet beschikbaar is.

## Controleren en documenteren

- Controleer bij wijzigingen aan spel- of vraaglogica met `node training.test.js` en voeg gerichte regressietests toe voor gewijzigd gedrag.
- Controleer gewijzigde JavaScript-bestanden met `node --check`.
- Controleer interfacewijzigingen in een echte browser. De tests in `training.test.js` controleren de engine; zij bewijzen niet dat DOM, timers of layout correct werken.
- Gebruik de browsercontroles en schermformaten uit [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md), vooral bij wijzigingen aan kaarten, panelen, beurten en portraitlayout.
- Voor wijzigingen die alleen documentatie betreffen, volstaan inhouds- en linkcontrole en `git diff --check`.
- Houd README en ontwikkeldocumentatie gelijk aan het uiteindelijke gedrag. Bewaar de vermelding van AI-generatie in de README.
- Behoud bestaande gebruikerswijzigingen en beperk aanpassingen tot de gevraagde taak. Maak commits wanneer de gebruiker daarom vraagt.
