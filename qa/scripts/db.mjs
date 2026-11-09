import pg from 'pg';
const c = new pg.Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' });
await c.connect();
const q = process.argv[2];
const r = await c.query(q);
console.table(r.rows);
await c.end();
