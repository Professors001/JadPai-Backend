// controllers/userController.js
const { connectMySQL } = require('../database');
const bcrypt = require('bcrypt');
const { OAuth2Client } = require('google-auth-library');

const saltRounds = 10;
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Verify Google ID token
async function verifyGoogleToken(token) {
    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        return ticket.getPayload();
    } catch (error) {
        console.error('Token verification failed:', error);
        return null;
    }
}

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
        // Check if a new password is being provided in the update data
        if (userDataToUpdate.password) {
            // Hash the new password
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(userDataToUpdate.password, saltRounds);
            
            // Assign the hashed password to the correct `password_hash` field
            userDataToUpdate.password_hash = hashedPassword;
            
            // IMPORTANT: Remove the plain-text 'password' property so it doesn't
            // try to update a column that doesn't exist.
            delete userDataToUpdate.password;
        }

        const conn = await connectMySQL();
        const [updateResult] = await conn.query('UPDATE users SET ? WHERE id = ?', [userDataToUpdate, userId]);

        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ message: `User with ID ${userId} not found.` });
        }

        // After updating, refetch the user's data to return the updated profile
        const [userRows] = await conn.query('SELECT id, name, surname, email, phone, role FROM users WHERE id = ?', [userId]);

        if (userRows.length === 0) {
            return res.status(404).json({ message: 'User not found after update.' });
        }

        // Return the updated user object, which the frontend expects
        res.status(200).json({ 
            message: `User with ID ${userId} updated successfully.`,
            user: userRows[0] 
        });

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

// NEW: Google OAuth Login
exports.googleLogin = async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ error: 'Google token is required.' });
    }

    try {
        // Verify the token with Google
        const payload = await verifyGoogleToken(token);
        
        if (!payload) {
            return res.status(401).json({ error: 'Invalid Google token.' });
        }

        const { sub: googleId, email, name, picture, email_verified } = payload;

        if (!email_verified) {
            return res.status(401).json({ error: 'Google email not verified.' });
        }

        const conn = await connectMySQL();

        // Check if user already exists with this Google ID
        let [existingUsers] = await conn.query('SELECT * FROM users WHERE google_id = ?', [googleId]);
        
        if (existingUsers.length > 0) {
            // User exists with Google ID, log them in
            const user = existingUsers[0];
            delete user.password_hash; // Remove password hash before sending
            
            return res.status(200).json({
                message: 'Google login successful!',
                user: user
            });
        }

        // Check if user exists with same email (for linking accounts)
        [existingUsers] = await conn.query('SELECT * FROM users WHERE email = ?', [email]);
        
        if (existingUsers.length > 0) {
            // User exists with same email, link Google account
            const userId = existingUsers[0].id;
            await conn.query('UPDATE users SET google_id = ? WHERE id = ?', [googleId, userId]);
            
            // Fetch updated user
            const [updatedUsers] = await conn.query('SELECT * FROM users WHERE id = ?', [userId]);
            const user = updatedUsers[0];
            delete user.password_hash;
            
            return res.status(200).json({
                message: 'Google account linked and login successful!',
                user: user
            });
        }

        // Create new user from Google data
        const nameParts = name ? name.split(' ') : ['', ''];
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const newUser = {
            name: firstName,
            surname: lastName,
            email: email,
            google_id: googleId,
            role: 'user' // Default role
        };

        const [result] = await conn.query('INSERT INTO users SET ?', [newUser]);
        const userId = result.insertId;

        // Fetch the created user
        const [createdUsers] = await conn.query('SELECT * FROM users WHERE id = ?', [userId]);
        const user = createdUsers[0];
        delete user.password_hash;

        res.status(201).json({
            message: 'Google user created and login successful!',
            user: user
        });

    } catch (error) {
        console.error('Error during Google login:', error.message);
        res.status(500).json({ error: 'Internal server error during Google login.' });
    }
};