const db = require('../db-dao/database');

// Get all users with credentials and roles
async function getAllUsers() {
    const [users] = await db.query(`
        SELECT u.id, u.address, u.passphrase, c.username, c.password AS user_password, ur.role 
        FROM users u
        JOIN credentials c ON c.user_id = u.id
        JOIN user_role ur ON ur.user = u.id
    `);
    return users;
}

// Get single user by ID
async function getUserById(id) {
    const [users] = await db.query(`
        SELECT u.id, u.address, u.passphrase, c.username, c.password AS user_password, ur.role 
        FROM users u
        JOIN credentials c ON c.user_id = u.id
        JOIN user_role ur ON ur.user = u.id
        WHERE u.id = ?
    `, [id]);
    return users[0];
}

// Add new user with role
async function createUser({ username, password, address, passphrase, role }) {
    const [userResult] = await db.query(
        'INSERT INTO users (address, passphrase, sKey) VALUES (?, ?, ?)', [address, passphrase, '']
    );
    const userId = userResult.insertId;

    await db.query(
        'INSERT INTO credentials (user_id, username, password) VALUES (?, ?, ?)', 
        [userId, username, password]
    );

    await db.query(
        'INSERT INTO user_role (user, role) VALUES (?, ?)', 
        [userId, role]
    );
    return userId;
}

// Update user fields (partial update)
async function updateUser(id, data) {
    const currentUser = await getUserById(id);
    if (!currentUser) throw new Error('User not found');

    const updatedAddress = data.address || currentUser.address;
    const updatedPassphrase = data.passphrase || currentUser.passphrase;
    const updatedUsername = data.username || currentUser.username;
    const updatedPassword = data.password || currentUser.user_password;
    const updatedRole = data.role || currentUser.role;

    await db.query(
        'UPDATE users SET address=?, passphrase=? WHERE id=?',
        [updatedAddress, updatedPassphrase, id]
    );

    await db.query(
        'UPDATE credentials SET username=?, password=? WHERE user_id=?',
        [updatedUsername, updatedPassword, id]
    );

    await db.query(
        'UPDATE user_role SET role=? WHERE user=?',
        [updatedRole, id]
    );
}

// Delete user by ID
async function deleteUser(id) {
    await db.query('DELETE FROM user_role WHERE user=?', [id]);
    await db.query('DELETE FROM credentials WHERE user_id=?', [id]);
    await db.query('DELETE FROM users WHERE id=?', [id]);
}

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser
};
