import { defineConfig } from 'tsup';
import fs from 'fs';
import path from 'path';

const srcFolder = path.resolve(__dirname, 'src');

export default defineConfig({
  entry: fs.readdirSync(srcFolder).map((name) => 'src/' + name),
  outDir: 'dist',
  bundle: false,
  format: ['esm'],
  tsconfig: './tsconfig.json',
  target: 'node14',
  minify: false,
  clean: true,
  dts: true,
});
