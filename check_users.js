const { User } = require('./models');

async function checkUsers() {
    try {
        const users = await User.findAll();
        console.log('Users found:', users.map(u => ({ id: u.id, name: u.nome, email: u.email, role: u.role })));
    } catch (error) {
        console.error('Error:', error);
    }
}

checkUsers();
