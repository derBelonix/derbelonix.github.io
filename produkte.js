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
  instagram: 'deinname',                         // nur der Name, ohne @
  email: 'benischmitzstevens@icloud.com',        // Kontakt-Mail (wird im Footer angezeigt)

  // BEZAHLSYSTEM: hier die Web-App-URL aus Google Apps Script einfügen (endet auf /exec).
  // Solange das leer ist, läuft der Checkout im Demo-Modus (es wird nichts abgebucht).
  bestellURL: '',

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
    id: 'ae-hoodie-01',
    titel: 'Aelfric Eden Washed Hoodie',
    marke: 'Aelfric Eden',
    kategorie: 'Hoodies',
    groesse: 'L',
    zustand: '9/10 – kaum getragen',
    preis: 45,
    bilder: ['bilder/hoodie-aelfric.svg', 'bilder/hoodie-aelfric-2.svg'],
    masse: { 'Brustbreite': '64 cm', 'Länge': '72 cm' },
    beschreibung: 'Oversized Fit, schwerer Baumwollstoff, Washed-Optik. Keine Flecken, keine Löcher.',
    neu: true,
    verkauft: false,
    vinted: ''
  },
  {
    id: 'nike-wind-01',
    titel: 'Nike Windbreaker 90s',
    marke: 'Nike',
    kategorie: 'Jacken',
    groesse: 'M',
    zustand: '8/10 – leichte Gebrauchsspuren',
    preis: 55,
    bilder: ['bilder/nike-windbreaker.svg', 'bilder/nike-windbreaker-2.svg'],
    masse: { 'Brustbreite': '61 cm', 'Länge': '70 cm' },
    beschreibung: 'Echter 90er-Windbreaker mit Netzfutter. Reißverschluss läuft einwandfrei.',
    neu: true,
    verkauft: false,
    vinted: ''
  },
  {
    id: 'adi-track-01',
    titel: 'Adidas Track Pants Vintage',
    marke: 'Adidas',
    kategorie: 'Hosen',
    groesse: 'S',
    zustand: '8/10',
    preis: 35,
    bilder: ['bilder/adidas-trackpants.svg', 'bilder/adidas-trackpants-2.svg'],
    masse: { 'Bundweite': '36 cm', 'Länge': '102 cm' },
    beschreibung: 'Klassische Three-Stripes-Trackpants mit Druckknöpfen am Saum.',
    neu: false,
    verkauft: false,
    vinted: ''
  },
  {
    id: 'nike-tee-01',
    titel: 'Nike Center Swoosh Tee',
    marke: 'Nike',
    kategorie: 'T-Shirts',
    groesse: 'XL',
    zustand: '7/10 – Print leicht verblasst',
    preis: 22,
    bilder: ['bilder/nike-tee.svg'],
    masse: { 'Brustbreite': '60 cm', 'Länge': '75 cm' },
    beschreibung: 'Vintage-Tee mit verblasstem Print, genau der richtige Used-Look.',
    neu: false,
    verkauft: true,
    vinted: ''
  },
  {
    id: 'adi-jacke-01',
    titel: 'Adidas Originals Trackjacket',
    marke: 'Adidas',
    kategorie: 'Jacken',
    groesse: 'L',
    zustand: '9/10',
    preis: 48,
    bilder: ['bilder/adidas-jacke.svg'],
    masse: { 'Brustbreite': '59 cm', 'Länge': '68 cm' },
    beschreibung: 'Weinrote Trackjacket, gestickte Logos, sehr guter Zustand.',
    neu: false,
    verkauft: false,
    vinted: ''
  },
  {
    id: 'ae-tee-01',
    titel: 'Aelfric Eden Graphic Tee',
    marke: 'Aelfric Eden',
    kategorie: 'T-Shirts',
    groesse: 'M',
    zustand: '10/10 – neu ohne Etikett',
    preis: 25,
    bilder: ['bilder/aelfric-tee.svg'],
    masse: { 'Brustbreite': '58 cm', 'Länge': '71 cm' },
    beschreibung: 'Boxy Fit mit großem Backprint. Nie getragen.',
    neu: false,
    verkauft: false,
    vinted: ''
  },
  {
    id: 'nike-cap-01',
    titel: 'Nike Vintage Cap',
    marke: 'Nike',
    kategorie: 'Accessoires',
    groesse: 'One Size',
    zustand: '8/10',
    preis: 18,
    bilder: ['bilder/nike-cap.svg'],
    masse: {},
    beschreibung: 'Verstellbar, ausgewaschenes Braun.',
    neu: false,
    verkauft: false,
    vinted: ''
  }
];
