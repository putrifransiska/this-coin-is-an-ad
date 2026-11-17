// Renders logo/ad.svg to a PNG with resvg and a 64 px thumbnail preview.
// usage: NODE_PATH=<node_modules> node tools/render.mjs <in.svg> <out.png> [width]
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(process.env.NODE_PATH ? process.env.NODE_PATH + '/' : import.meta.url);
const { Resvg } = require('@resvg/resvg-js');
const [input, output, width = '1024'] = process.argv.slice(2);
const svg = readFileSync(input, 'utf8');
const render = (w) => new Resvg(svg, { fitTo: { mode: 'width', value: w }, font: { loadSystemFonts: true } }).render().asPng();
const png = render(Number(width));
writeFileSync(output, png);
writeFileSync(output.replace(/\.png$/, '.thumb.png'), render(64));
console.log(output, png.length, 'bytes');
