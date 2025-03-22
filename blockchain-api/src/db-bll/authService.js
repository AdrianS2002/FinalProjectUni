const db = require('../db-dao/database');

async function registerUser(username, password, address, passphrase) {
    const [userResult] = await db.query(
        'INSERT INTO users (address, passphrase, sKey) VALUES (?, ?, ?)', 
        [address, passphrase, '']
    );
    const userId = userResult.insertId;

    await db.query(
        'INSERT INTO credentials (user_id, username, password) VALUES (?, ?, ?)', 
        [userId, username, password]
    );

    await db.query(
        'INSERT INTO user_role (user, role) VALUES (?, ?)', 
        [userId, '2']
    ); // Default role: USER

    return userId;
}

async function loginUser(username, password) {
    const [rows] = await db.query(
        'SELECT c.password, c.user_id FROM credentials c WHERE c.username = ?', 
        [username]
    );
    if (rows.length === 0) throw new Error('User not found');

    if (rows[0].password !== password) throw new Error('Invalid password');

    return { userId: rows[0].user_id };
}

module.exports = {
    registerUser,
    loginUser
};
