/* =====================================================================
   DEINE SHOP-DATEN  –  nur diese Datei musst du bearbeiten!
   ---------------------------------------------------------------------
   • Text immer zwischen 'Anführungszeichen' lassen.
   • Nach jedem Eintrag ein Komma.
   • Fotos in den Ordner "bilder" legen und hier den Dateinamen eintragen.
   ===================================================================== */

const SHOP = {
  name: 'BELO VINTAGE',                         // Name deines Shops
  slogan: 'Handverlesene Vintage- & Streetwear-Pieces. Jedes Teil gibt es nur einmal.',
  marken: ['Nike', 'Adidas', 'Aelfric Eden', 'Carhartt', 'Ralph Lauren'],  // laufen im Banner durch
  instagram: 'benebln16',                         // nur der Name, ohne @
  email: 'belonix.business@icloud.com',        // Kontakt-Mail (wird im Footer angezeigt)

  // BEZAHLSYSTEM: hier die Web-App-URL aus Google Apps Script einfügen (endet auf /exec).
  // Solange das leer ist, läuft der Checkout im Demo-Modus (es wird nichts abgebucht).
  bestellURL: 'https://script.google.com/macros/s/AKfycbz59VvLjLv9jPttO4MF-IiUtoCr7q1EY1UeKk8hyI5CerolerWpojR1y95yPJ5dBXYw/exec',

  versandkosten: 4.99,                           // pro Bestellung in Euro
  versand: 'Versand mit DHL oder Hermes innerhalb von 1–2 Werktagen nach Zahlungseingang.',
  bezahlung: 'Direkt hier im Shop mit Karte, Apple Pay, Google Pay, Klarna oder Lastschrift – sicher verschlüsselt über Stripe.'
};

/* ---------------------------------------------------------------------
   ARTIKEL
   neu: true      -> zeigt das Schild "Neu reingekommen"
   verkauft: true -> Artikel bleibt sichtbar, ist aber als VERKAUFT markiert
   kategorie:     Hoodies, T-Shirts, Jacken, Hosen, Accessoires (oder eigene)
   Die folgenden Artikel sind BEISPIELE – ersetze sie durch deine echten.
   --------------------------------------------------------------------- */
const PRODUKTE = [
  {
    id: 'ae-racing-shirt-m',
    titel: 'Aelfric Eden Racing Zip Shirt',
    marke: 'Aelfric Eden',
    kategorie: 'Shirts',
    groesse: 'M',
    zustand: 'Neu mit Etikett – nie getragen',
    preis: 39,
    bilder: ['bilder/ae-racing-shirt-1.jpg', 'bilder/ae-racing-shirt-2.jpg', 'bilder/ae-racing-shirt-3.jpg', 'bilder/ae-racing-shirt-4.jpg', 'bilder/ae-racing-shirt-5.jpg', 'bilder/ae-racing-shirt-6.jpg', 'bilder/ae-racing-shirt-7.jpg'],
    masse: { 'Breite': 'ca. 62 cm', 'Länge': 'ca. 72 cm', 'Passform': 'Oversized' },
    beschreibung: 'Kurzarm-Racing-Shirt mit durchgehendem Reißverschluss und Stehkragen in Apricot/Creme. Gestickte Patches (1886, BWCX, AAA, Coke!), großer Aelfric-Eden-Schriftzug in Schwarz mit weinroten Streifen. Neu, original verpackt mit Hängeetikett.',
    neu: true,
    verkauft: false,
    vinted: ''
  },
  {
    id: 'ae-beststuff-jacke-m',
    titel: 'Aelfric Eden "Best Stuff" Racing Jacket',
    marke: 'Aelfric Eden',
    kategorie: 'Jacken',
    groesse: 'M',
    zustand: '8/10 – Vintage-Look, leichte Gebrauchsspuren',
    preis: 55,
    bilder: ['bilder/ae-beststuff-jacke-1.jpg', 'bilder/ae-beststuff-jacke-2.jpg', 'bilder/ae-beststuff-jacke-4.jpg', 'bilder/ae-beststuff-jacke-3.jpg', 'bilder/ae-beststuff-jacke-5.jpg'],
    masse: { 'Brustbreite': 'ca. 60 cm', 'Länge': 'ca. 78 cm', 'Passform': 'Boxy / cropped' },
    beschreibung: 'Racing-Jacke in Wildlederoptik mit Teddy-Futter und offenen Teddy-Kanten. Großer "BEST STUFF"-Print mit roten Streifen, Karo-Muster an den Ärmeln, Stehkragen mit Teddyfell, zwei Taschen. Leichte Gebrauchsspuren, passen zum Vintage-Look.',
    neu: true,
    verkauft: false,
    vinted: ''
  }
];
