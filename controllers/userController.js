// controllers/userController.js
const { connectMySQL } = require('../database');

exports.getAllUsers = async (req, res) => {
    try {
        const conn = await connectMySQL();
        const [results] = await conn.query('SELECT * FROM users');
        res.json(results);
    } catch (error) {
        console.error('Error fetching users:', error.message);
        res.status(500).json({ error: 'Error fetching users' });
    }
};

exports.getUserById = async (req, res) => {
    const id = req.params.id;
    try {
        const conn = await connectMySQL();
        const [results] = await conn.query('SELECT * FROM users WHERE id = ?', [id]);
        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(results[0]);
    } catch (error) {
        console.error('Error fetching user:', error.message);
        res.status(500).json({ error: 'Error fetching user' });
    }
};

exports.createUser = async (req, res) => {
    const newUser = req.body;
    if (!newUser || Object.keys(newUser).length === 0) {
        return res.status(400).json({ error: 'User data is missing in the request body.' });
    }
    try {
        const conn = await connectMySQL();
        const [result] = await conn.query('INSERT INTO users SET ?', [newUser]);
        const userId = result.insertId;
        res.status(201).json({ message: 'User created successfully', userId: userId });
    } catch (error) {
        console.error('Error creating user:', error.message);
        res.status(500).json({ error: 'Error creating user' });
    }
};

exports.updateUser = async (req, res) => {
    const userId = req.params.id;
    const userDataToUpdate = req.body;
    if (!userDataToUpdate || Object.keys(userDataToUpdate).length === 0) {
        return res.status(400).json({ error: 'No update data provided in the request body.' });
    }
    try {
        const conn = await connectMySQL();
        const [result] = await conn.query('UPDATE users SET ? WHERE id = ?', [userDataToUpdate, userId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: `User with ID ${userId} not found.` });
        }
        res.status(200).json({ message: `User with ID ${userId} updated successfully.` });
    } catch (error) {
        console.error('Error updating user:', error.message);
        res.status(500).json({ error: 'Error updating user' });
    }
};

exports.deleteUser = async (req, res) => {
    const userId = req.params.id;
    try {
        const conn = await connectMySQL();
        const [result] = await conn.query('DELETE FROM users WHERE id = ?', [userId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: `User with ID ${userId} not found.` });
        }
        res.status(200).json({ message: `User with ID ${userId} deleted successfully.` });
    } catch (error) {
        console.error('Error deleting user:', error.message);
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ error: 'Cannot delete this user because they are referenced in other records (e.g., events or enrollments).' });
        }
        res.status(500).json({ error: 'Error deleting user' });
    }
};