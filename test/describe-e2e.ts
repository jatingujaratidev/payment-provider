import * as fs from 'node:fs';
import * as path from 'node:path';
export function e2eSuite(name: string, fn: () => void): void {
  const flagPath = path.join(__dirname, '.e2e-db');
  const available =
    fs.existsSync(flagPath) && fs.readFileSync(flagPath, 'utf8').trim() === '1';
  (available ? describe : describe.skip)(name, fn);
}
