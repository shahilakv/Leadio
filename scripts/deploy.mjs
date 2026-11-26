// Push src/ to Apps Script and update the existing web app deployment (URL stays the same).
// Usage: npm run deploy -- "optional description"
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const run = cmd => execSync(cmd, { stdio: 'inherit' });

if (!existsSync('.clasp.json')) {
  console.error('Missing .clasp.json. Copy .clasp.json.example and add your Script ID (README step 4).');
  process.exit(1);
}

run('npx clasp push -f');

if (!existsSync('.deploy.json')) {
  console.log('\nCode pushed. No .deploy.json yet, so the live web app was NOT updated.');
  console.log('Create the first deployment in the Apps Script editor, then save its ID in .deploy.json (README step 6).');
  process.exit(0);
}

const { deploymentId } = JSON.parse(readFileSync('.deploy.json', 'utf8'));
if (!/^[\w-]{10,}$/.test(deploymentId || '')) {
  console.error('.deploy.json has no valid deploymentId.');
  process.exit(1);
}
const desc = (process.argv.slice(2).join(' ') || `Update ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`).replace(/[^\w .:,-]/g, '');
run(`npx clasp deploy -i ${deploymentId} -d "${desc}"`);
console.log('\nLive app updated. Same URL as before.');
