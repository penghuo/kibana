/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type FontValue = typeof fonts[number]['value'];
export type FontLabel = typeof fonts[number]['label'];

export interface Font {
  label: FontLabel;
  value: FontValue;
}

/**
 * This function allows one to create a strongly-typed font for inclusion in
 * the font collection.  As a result, the values and labels are known to the
 * type system, preventing one from specifying a non-existent font at build
 * time.
 */
function createFont<
  RawFont extends { value: RawFontValue; label: RawFontLabel },
  RawFontValue extends string,
  RawFontLabel extends string
>(font: RawFont) {
  return font;
}

export const americanTypewriter = createFont({
  label: 'American Typewriter',
  value: "'American Typewriter', 'Courier New', Courier, Monaco, mono",
});

export const arial = createFont({ label: 'Arial', value: 'Arial, sans-serif' });

export const baskerville = createFont({
  label: 'Baskerville',
  value: "Baskerville, Georgia, Garamond, 'Times New Roman', Times, serif",
});

export const bookAntiqua = createFont({
  label: 'Book Antiqua',
  value: "'Book Antiqua', Georgia, Garamond, 'Times New Roman', Times, serif",
});

export const brushScript = createFont({
  label: 'Brush Script',
  value: "'Brush Script MT', 'Comic Sans', sans-serif",
});

export const chalkboard = createFont({
  label: 'Chalkboard',
  value: "Chalkboard, 'Comic Sans', sans-serif",
});

export const didot = createFont({
  label: 'Didot',
  value: "Didot, Georgia, Garamond, 'Times New Roman', Times, serif",
});

export const futura = createFont({
  label: 'Futura',
  value: 'Futura, Impact, Helvetica, Arial, sans-serif',
});

export const gillSans = createFont({
  label: 'Gill Sans',
  value:
    "'Gill Sans', 'Lucida Grande', 'Lucida Sans Unicode', Verdana, Helvetica, Arial, sans-serif",
});

export const helveticaNeue = createFont({
  label: 'Helvetica Neue',
  value: "'Helvetica Neue', Helvetica, Arial, sans-serif",
});

export const hoeflerText = createFont({
  label: 'Hoefler Text',
  value: "'Hoefler Text', Garamond, Georgia, 'Times New Roman', Times, serif",
});

export const lucidaGrande = createFont({
  label: 'Lucida Grande',
  value: "'Lucida Grande', 'Lucida Sans Unicode', Lucida, Verdana, Helvetica, Arial, sans-serif",
});

export const myriad = createFont({
  label: 'Myriad',
  value: 'Myriad, Helvetica, Arial, sans-serif',
});

export const openSans = createFont({
  label: 'Open Sans',
  value: "'Open Sans', Helvetica, Arial, sans-serif",
});

export const optima = createFont({
  label: 'Optima',
  value: "Optima, 'Lucida Grande', 'Lucida Sans Unicode', Verdana, Helvetica, Arial, sans-serif",
});

export const palatino = createFont({
  label: 'Palatino',
  value: "Palatino, 'Book Antiqua', Georgia, Garamond, 'Times New Roman', Times, serif",
});

export const fonts = [
  americanTypewriter,
  arial,
  baskerville,
  bookAntiqua,
  brushScript,
  chalkboard,
  didot,
  futura,
  gillSans,
  helveticaNeue,
  hoeflerText,
  lucidaGrande,
  myriad,
  openSans,
  optima,
  palatino,
];