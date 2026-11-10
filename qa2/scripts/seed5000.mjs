// Inserts 5,000 synthetic leads into the CURRENT org A (the one in accounts.json), not an older one.
import fs from 'fs';
import { sql, orgOf } from './lib.mjs';
const acc = JSON.parse(fs.readFileSync('accounts.json'));
const orgId = await orgOf(acc.A.email);
const before = (await sql('select count(*)::int n from leads where organization_id=$1', [orgId]))[0].n;
let q = fs.readFileSync(new URL('./seed-5000.sql', import.meta.url), 'utf8');
q = q.replace("WHERE u.email LIKE 'qa-a-%' LIMIT 1", `WHERE u.email = '${acc.A.email.replace(/'/g, "''")}' LIMIT 1`);
if (!q.includes(acc.A.email)) throw new Error('could not target the current org');
await sql(q);
const after = (await sql('select count(*)::int n from leads where organization_id=$1', [orgId]))[0].n;
console.log(`org ${orgId}: ${before} -> ${after} leads`);
