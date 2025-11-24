#!/usr/bin/env node
const {execSync} = require('child_process');
const {randomBytes} = require('crypto');
const readline = require('readline');

const getEnv = () => {
  try {
    return `preview-${process.env.USER || execSync('whoami').toString().trim()}`;
  } catch {
    return 'preview-local';
  }
};

const APP = process.env.APP_NAME || 'IronmanCountdown';
const ENV = process.env.ENVIRONMENT || getEnv();
const SECRET = process.env.SECRET_NAME || `${APP}/${ENV}/secrets`;

const aws = (cmd, silent = false) => {
  try {
    return execSync(cmd, {encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe']});
  } catch (e) {
    if (!silent) throw e;
    return null;
  }
};

const exists = () => aws(`aws secretsmanager describe-secret --secret-id ${SECRET}`, true) !== null;
const get = () => JSON.parse(aws(`aws secretsmanager get-secret-value --secret-id ${SECRET} --query SecretString --output text`));
const update = (data) => aws(`aws secretsmanager update-secret --secret-id ${SECRET} --secret-string '${JSON.stringify(data)}'`);
const create = (data) => aws(`aws secretsmanager create-secret --name ${SECRET} --secret-string '${JSON.stringify(data)}'`);

const ask = (q) => new Promise(resolve => {
  const rl = readline.createInterface({input: process.stdin, output: process.stdout});
  rl.question(q, (a) => { rl.close(); resolve(a); });
});

const mask = (v) => !v ? '***' : v.substring(0, 4) + '*'.repeat(Math.max(0, v.length - 4));

async function updateKey(key, val) {
  console.log(`\n${key}: ${mask(val)}`);
  if (val.startsWith('TBD')) return (await ask(`Enter value: `)).trim() || val;
  
  while (true) {
    const ans = (await ask('Keep current value? [Y/n] or [s]how: ')).toLowerCase();
    if (!ans || ans === 'y') return val;
    if (ans === 'n') return (await ask('New value: ')).trim() || val;
    if (ans === 's') console.log(`Full: ${val}`);
  }
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  const force = args.includes('--force');
  const plain = args.includes('--plain');
  
  if (!cmd || cmd === 'help') {
    console.log('\nCOMMANDS: init JSON [--force] | get [--plain] | set K V | update K | update-all | delete K\n');
    return;
  }
  
  switch (cmd) {
    case 'init':
      if (exists() && !force) throw new Error(`Secret exists. Use --force to overwrite.`);
      const data = JSON.parse(args[0]);
      for (const k in data) {
        if (data[k] === 'TBD') data[k] = `TBD_${randomBytes(10).toString('base64url')}`;
      }
      exists() ? update(data) : create(data);
      console.log(`✓ ${Object.keys(data).length} keys`);
      break;
      
    case 'get':
      for (const [k, v] of Object.entries(get())) console.log(`${k}: ${plain ? v : mask(v)}`);
      break;
      
    case 'set':
      const secrets = get();
      secrets[args[0]] = args[1];
      update(secrets);
      console.log(`✓ ${args[0]}`);
      break;
      
    case 'update':
      const s = get();
      const newVal = await updateKey(args[0], s[args[0]]);
      if (newVal !== s[args[0]]) { s[args[0]] = newVal; update(s); }
      break;
      
    case 'update-all':
      const all = get();
      const updated = {};
      for (const k of Object.keys(all)) updated[k] = await updateKey(k, all[k]);
      if (Object.keys(all).some(k => updated[k] !== all[k])) update(updated);
      break;
      
    case 'delete':
      const del = get();
      delete del[args[0]];
      update(del);
      console.log(`✓ Deleted`);
      break;
      
    default:
      console.error(`Unknown: ${cmd}`);
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });

