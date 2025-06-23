// controllers/enrollmentController.js
const { connectMySQL } = require('../database');

exports.getAllEnrollments = async (req, res) => {
    try {
        const conn = await connectMySQL();
        const [results] = await conn.query('SELECT * FROM enrollments');
        res.json(results);
    } catch (error) {
        console.error('Error fetching enrollments:', error.message);
        res.status(500).json({ error: 'Error fetching enrollments' });
    }
};

exports.getEnrollmentById = async (req, res) => {
    const { id } = req.params;
    try {
        const conn = await connectMySQL();
        const [results] = await conn.query('SELECT * FROM enrollments WHERE id = ?', [id]);
        if (results.length === 0) {
            return res.status(404).json({ error: 'Enrollment not found' });
        }
        res.json(results[0]);
    } catch (error) {
        console.error('Error fetching enrollment:', error.message);
        res.status(500).json({ error: 'Error fetching enrollment' });
    }
};

exports.createEnrollment = async (req, res) => {
    const newEnrollment = req.body;
    if (!newEnrollment || Object.keys(newEnrollment).length === 0) {
        return res.status(400).json({ error: 'Enrollment data is missing in the request body.' });
    }
    try {
        const conn = await connectMySQL();
        const [result] = await conn.query('INSERT INTO enrollments SET ?', [newEnrollment]);
        const enrollmentId = result.insertId;
        res.status(201).json({ message: 'Enrollment created successfully', enrollmentId: enrollmentId });
    } catch (error) {
        console.error('Error creating enrollment:', error.message);
        res.status(500).json({ error: 'Error creating enrollment' });
    }
};

exports.updateEnrollment = async (req, res) => {
    const { id } = req.params;
    const dataToUpdate = req.body;

    if (Object.keys(dataToUpdate).length === 0) {
        return res.status(400).json({ error: 'No update data provided.' });
    }

    try {
        const conn = await connectMySQL();
        const [result] = await conn.query('UPDATE enrollments SET ? WHERE id = ?', [dataToUpdate, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: `Enrollment with ID ${id} not found.` });
        }
        res.status(200).json({ message: `Enrollment with ID ${id} updated successfully.` });
    } catch (error) {
        console.error('Error updating enrollment:', error.message);
        res.status(500).json({ error: 'Error updating enrollment' });
    }
};

exports.deleteEnrollment = async (req, res) => {
    const { id } = req.params;
    try {
        const conn = await connectMySQL();
        const [result] = await conn.query('DELETE FROM enrollments WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: `Enrollment with ID ${id} not found.` });
        }
        res.status(200).json({ message: `Enrollment with ID ${id} deleted successfully.` });
    } catch (error) {
        console.error('Error deleting enrollment:', error.message);
        res.status(500).json({ error: 'Error deleting enrollment' });
    }
};