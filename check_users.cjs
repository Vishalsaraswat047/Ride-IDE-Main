const db = require('better-sqlite3')('./apps/backend/data/ride.db'); console.log(db.prepare('SELECT count(*) as c FROM users').get()); console.log(db.prepare('SELECT email FROM users').all());
