# Kaartwacht

Kaartwacht is een oefenapp om tijdens slagenspellen zoals rikken het overzicht te leren houden. Het einddoel is dat je na iedere slag weet welke kaarten van elke kleur al gespeeld zijn, welke nog over zijn en van welke spelers bewezen is dat zij een kleur niet meer hebben.

## Doel en leeropbouw

Je kunt dit stap voor stap opbouwen: eerst aantallen van één kleur tellen, daarna exacte kaarten onthouden en herkennen wie geen kleur bekent. Vervolgens breid je uit naar twee en vier kleuren en combineer je deze vaardigheden tijdens een volledige hand van dertien slagen. Je kiest de oefenvorm, het aantal kleuren en de lengte zelf in het menu.

De app laat je zelf kaarten spelen en stelt tussendoor vragen uit je geheugen. Uitleg en terugblikken op eerdere slagen helpen je ontdekken wat je hebt gemist. Zo oefen je om de informatie uit voorgaande slagen bij te houden en toe te passen bij het verder spelen. De nadruk ligt op kaartgeheugen en spelinzicht.

## Gemaakt met AI

Deze app is met AI gegenereerd via OpenAI Codex. Het idee, de leerdoelen en de keuzes zijn door de maker aangedragen; de code, vormgeving, tests en documentatie zijn op basis van die instructies en feedback met AI ontwikkeld.

## Spelbasis

Je speelt met vier spelers en een spel van 52 kaarten. Iedere speler krijgt dertien kaarten, de troefkleur wordt willekeurig gekozen en jij komt de eerste slag uit. Kleur bekennen is verplicht; de hoogste troef wint, anders de hoogste kaart van de uitgekomen kleur. De winnaar komt de volgende slag uit. De computerspelers kiezen een willekeurige toegestane kaart. Bieden en teamscores maken geen deel uit van deze oefening.

## Starten

Open `index.html` in je browser. Er zijn geen installaties of buildstappen nodig. Je kunt ook Live Server gebruiken, of vanuit deze map:

```sh
python3 -m http.server 8000
```

Open vervolgens http://localhost:8000.

## Oefenen

De kaarttafel en je hand staan centraal. Open het menu linksboven (☰) voor de oefenvormen en instellingen. Met de infoknop rechtsboven (i) bekijk je je opdracht, spelregels en voortgang. De computerspelers wachten zolang een paneel open is. Sluit het paneel met ×, Escape of een klik buiten het paneel om verder te spelen.

- **Kleuren tellen:** houd 1, 2 of 4 gekozen kleuren bij en beantwoord tussendoor hoeveel kaarten er nog over zijn.
- **Kaarten onthouden:** herken of een kaart al gespeeld is, of selecteer zelf de resterende kaarten. Begin met A/K/Q/J en breid uit naar alle rangen.
- **Spelers volgen:** onthoud wie een kleur niet heeft bekend. Selecteer alleen spelers van wie je zeker weet dat zij die kleur niet meer hebben; voor de anderen is het onbekend.
- **Slag terugbouwen:** koppel vier kaarten uit een eerdere slag weer aan de juiste spelers.
- **Aan tafel:** combineer de vragen met toepassingen zoals bepalen of jouw kaart de hoogste overgebleven kaart van een kleur is en weten wie niet meer kan bekennen. Deze oefenvorm kiest standaard vier kleuren en alle rangen; de ingestelde lengte blijft behouden.

De lengte (3, 5, 8, 10 of 13 slagen) staat los van de oefenvorm en het aantal gevolgde kleuren. Voor een volledige gecombineerde oefening kies je zowel de oefenvorm **Aan tafel** als de lengte **Aan tafel · 13 slagen**. Een nieuwe kleurkeuze vervangt bij twee kleuren de oudste keuze. Oefeninstellingen wijzigen start een nieuwe hand; de kaartvolgorde kun je tijdens dezelfde hand aanpassen.

Vragen komen na volledige slagen; de tafel en eventuele telhulp zijn dan verborgen. Na je antwoord speel je dezelfde hand verder. Na een fout krijg je uitleg en, als er relevante eerdere slagen zijn, een terugblik. Zolang er vervolgvragen zijn, richt de volgende vraag zich op de gemiste vaardigheid.

Als alle gevolgde kleuren uitgespeeld zijn of er geen geschikte eigen kaart voor een hoogste-kaartvraag is, krijg je een terugbouwvraag over een eerdere slag. Dit kan ook vóór de laatste slag gebeuren. Na dertien slagen zijn alle kaarten gespeeld en gaat de laatste vraag daarom altijd over een eerdere slag.

Onder **Oefenopties** in het menu kies je of je eigen hand meetelt, stel je het speeltempo in en zet je tijdelijke telhulp aan. Die hulp verdwijnt halverwege de hand. Je eigen hand blijft zichtbaar. Tijdens een vraag verdwijnt de lege tafel om ruimte te maken voor de antwoorden. Voortgang per vaardigheid wordt op dit apparaat bewaard wanneer de browser lokale opslag toestaat.

Bij **Kaartvolgorde** in het menu bepaal je de volgorde van de vier kleuren en kies je hoog naar laag (A → 2) of laag naar hoog (2 → A). Standaard staat je hand op ♣ ♦ ♠ ♥, hoog naar laag. Kies je een kleur die al op een andere positie staat, dan wisselen die twee kleuren van plaats. Zo kun je alle 24 kleurvolgordes instellen. De keuze verandert alleen de weergave: je speelt dezelfde slag of vraag verder en de kaartsterkte blijft gelijk. Je voorkeur geldt ook voor nieuwe handen en wordt op dit apparaat bewaard wanneer lokale opslag beschikbaar is.

Op staande telefoons schaalt de tafel mee met de schermhoogte en passen de dertien handkaarten vanaf 320 pixels breed in twee rijen. De actieknoppen blijven onderaan bereikbaar; langere vragen en terugblikken kun je verticaal scrollen. Draaien tussen staand en liggend behoudt je lopende hand.

## Controleren

De app gebruikt geen Node.js tijdens het spelen. Met Node.js kun je de spelregels en vragen testen:

```sh
node training.test.js
```

## Verder ontwikkelen

Zie [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) voor de codeopbouw, spelfases en controles bij wijzigingen. De vaste afspraken voor AI-ontwikkelsessies staan in [AGENTS.md](AGENTS.md).
