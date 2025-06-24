// controllers/userController.js
const { connectMySQL } = require('../database');
const bcrypt = require('bcrypt');

const saltRounds = 10;

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
    // 1. Destructure all the expected fields from the request body.
    const { name, surname, email, phone, password } = req.body;

    // 2. Validate that the most critical fields are present.
    // IMPORTANT: We expect a plain-text 'password', not a pre-hashed one from the client.
    if (!email || !password || !name || !surname) {
        return res.status(400).json({ error: 'Name, surname, email, and password are required fields.' });
    }

    try {
        // 3. Hash the plain-text password received from the request.
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 4. Prepare the new user object for the database.
        // The database column should be named `password_hash` (or similar).
        const newUserForDB = {
            name,
            surname,
            email,
            phone,
            password_hash: hashedPassword // We store the hash we just created.
        };

        const conn = await connectMySQL();

        // 5. Insert the secure user object into the database.
        const [result] = await conn.query('INSERT INTO users SET ?', [newUserForDB]);
        const userId = result.insertId;

        res.status(201).json({ message: 'User created successfully', userId: userId });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'This email address is already in use.' });
        }
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

// exports.loginUser = async (req, res) => {
//     // 1. Get email and password from the request body
//     const { email, password } = req.body;

//     // Basic validation
//     if (!email || !password) {
//         return res.status(400).json({ error: 'Email and password are required.' });
//     }

//     try {
//         const conn = await connectMySQL();

//         // 2. Find the user in the database by their email address
//         const [users] = await conn.query('SELECT * FROM users WHERE email = ?', [email]);

//         // 3. Handle user not found
//         if (users.length === 0) {
//             // IMPORTANT: Use a generic error message for security.
//             // Do not reveal whether the email exists or not.
//             return res.status(401).json({ error: 'Invalid credentials.' });
//         }

//         const user = users[0];

//         // 4. Compare the provided password with the stored hash
//         const isMatch = await bcrypt.compare(password, user.password_hash);

//         // 5. Handle password not matching
//         if (!isMatch) {
//             // Use the same generic error message.
//             return res.status(401).json({ error: 'Invalid credentials.' });
//         }

//         // 6. If credentials are correct, generate a JWT
//         // The payload contains data you want to store in the token
//         const payload = {
//             userId: user.id,
//             email: user.email,
//             name: user.name
//             // You can add other non-sensitive data like a user role
//         };

//         // Sign the token with a secret key and set an expiration time
//         const token = jwt.sign(
//             payload,
//             process.env.JWT_SECRET, // Your secret key
//             { expiresIn: '1h' }     // Token expires in 1 hour
//         );

//         // 7. Send the token back to the client
//         res.status(200).json({
//             message: 'Login successful!',
//             token: token
//         });

//     } catch (error) {
//         console.error('Error during login:', error.message);
//         res.status(500).json({ error: 'Internal server error.' });
//     }
// };

exports.loginUser = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        const conn = await connectMySQL();
        const [users] = await conn.query('SELECT * FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        // --- CHANGE 1: Remove password hash before sending user data back ---
        // This is a critical security step. Never send password hashes to the client.
        delete user.password_hash;

        const payload = {
            userId: user.id,
            email: user.email,
            name: user.name
        };

        // --- CHANGE 2: Include the sanitized user object in the response ---
        res.status(200).json({
            message: 'Login successful!',
            user: user // The user object (without the password hash)
        });

    } catch (error) {
        console.error('Error during login:', error.message);
        res.status(500).json({ error: 'Internal server error.' });
    }
};