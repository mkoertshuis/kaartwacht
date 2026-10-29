# Kaartwacht

Kaartentellen oefenen door slagen te spelen met vier spelers en een spel van 52 kaarten. Kleur bekennen is verplicht; de hoogste troef wint, anders de hoogste kaart van de uitgekomen kleur. De winnaar komt uit. De computerspelers kiezen een willekeurige toegestane kaart. Bieden en teamscores maken geen deel uit van deze oefening.

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
- **Aan tafel:** combineer de vragen met toepassingen zoals je hoogste kaart herkennen en weten wie niet meer kan bekennen.

De lengte (3, 5, 8, 10 of 13 slagen) staat los van het aantal gevolgde kleuren. Een nieuwe kleurkeuze vervangt bij twee kleuren de oudste keuze. Instellingen wijzigen start een nieuwe hand.

Vragen komen na volledige slagen; de tafel en eventuele telhulp zijn dan verborgen. Na je antwoord speel je dezelfde hand verder. Na een fout toont de terugblik de relevante kaarten en komt de vaardigheid opnieuw terug zolang er slagen over zijn. Na een volledige hand zijn alle kaarten gespeeld: de laatste vraag gaat daarom over een eerdere slag.

Onder **Oefenopties** in het menu kies je of je eigen hand meetelt, stel je het speeltempo in en zet je tijdelijke telhulp aan. Die hulp verdwijnt halverwege de hand. Je eigen hand blijft zichtbaar en gesorteerd op ♣ ♦ ♠ ♥, hoog naar laag. Tijdens een vraag verdwijnt de lege tafel om ruimte te maken voor de antwoorden. Voortgang per vaardigheid wordt op dit apparaat bewaard wanneer de browser lokale opslag toestaat.

## Controleren

De app gebruikt geen Node.js tijdens het spelen. Met Node.js kun je de spelregels en vragen testen:

```sh
node training.test.js
```
