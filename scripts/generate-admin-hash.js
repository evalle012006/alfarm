const bcrypt = require('bcryptjs');

// Generate hash for 'admin123'
const password = 'admin123';
const hash = bcrypt.hashSync(password, 10);

console.log('\n===========================================');
console.log('AlFarm Resort - Admin Password Hash Generator');
console.log('===========================================\n');
console.log('Password:', password);
console.log('Hash:', hash);
console.log('\nUse this hash in your database INSERT statement:');
console.log(`INSERT INTO users (email, password, first_name, last_name, role)`);
console.log(`VALUES ('admin@alfarm.com', '${hash}', 'Admin', 'User', 'root');`);
console.log('\n===========================================\n');
