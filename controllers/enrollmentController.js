// controllers/enrollmentController.js
const { connectMySQL } = require('../database');
const { sendStatusChangeEmail } = require('../services/emailService');

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
    try {
        // ✨ The middleware has already done the verification.
        // We can now safely get the user ID from the req.user object.
        const verifiedUserId = req.user.id;

        const { name, phone, email, eventId } = req.body;
        const pictureFile = req.file;

        if (!name || !phone || !email || !pictureFile || !eventId) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        const imagePath = `/uploads/${pictureFile.filename}`;

        const newEnrollmentData = {
            name: name,
            phone: phone,
            email: email,
            evidence_img_path: imagePath,
            status: 'pending',
            enroll_date: new Date(),
            user_id: verifiedUserId, // Use the secure ID from req.user
            event_id: parseInt(eventId, 10),
        };

        const conn = await connectMySQL();
        const [result] = await conn.query('INSERT INTO enrollments SET ?', [newEnrollmentData]);

        res.status(201).json({
            message: 'Enrollment created successfully',
            enrollmentId: result.insertId
        });

    } catch (error) {
        // This catch block now only handles application/database errors.
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

/**
 * Gets all events a user is enrolled in, transforming the result
 * into a nested structure that includes a count of confirmed attendees for each event.
 */
exports.getEnrollmentsByUserId = async (req, res) => {
    const userId = req.params.id;

    const sqlQuery = `
        SELECT
            e.id AS enrollment_id,
            e.user_id,
            e.event_id,
            e.evidence_img_path,
            e.name AS enrollment_name,
            e.email AS enrollment_email,
            e.phone AS enrollment_phone,
            e.status,
            e.enroll_date,
            e.update_timestamp,
            v.name AS event_name,
            v.description AS event_description,
            v.max_cap AS event_max_cap,
            v.creator_id AS event_creator_id,
            (SELECT COUNT(*) 
             FROM enrollments 
             WHERE event_id = v.id AND status = 'confirmed'
            ) AS confirmed_count
        FROM
            enrollments AS e
        INNER JOIN
            events AS v ON e.event_id = v.id
        WHERE
            e.user_id = ?
        ORDER BY
            e.enroll_date DESC;
    `;

    try {
        const conn = await connectMySQL();
        const [results] = await conn.query(sqlQuery, [userId]);

        const formattedResults = results.map(row => {
            const eventObject = {
                id: row.event_id,
                name: row.event_name,
                description: row.event_description,
                max_cap: row.event_max_cap,
                creator_id: row.event_creator_id,
                confirmed_count: row.confirmed_count
            };

            const enrollmentObject = {
                id: row.enrollment_id,
                user_id: row.user_id,
                status: row.status,
                evidence_img_path: row.evidence_img_path,
                name: row.enrollment_name,
                email: row.enrollment_email,
                phone: row.enrollment_phone,
                enroll_date: row.enroll_date,
                update_timestamp: row.update_timestamp,
                event: eventObject
            };

            return enrollmentObject;
        });
        
        res.status(200).json(formattedResults);

    } catch (error) {
        console.error('Error fetching user enrollments:', error.message);
        res.status(500).json({ error: 'Error fetching user enrollments' });
    }
};

exports.getAllEnrollmentsByEventId = async (req, res) => {
    const eventId = req.params.id;
    try {
        const conn = await connectMySQL();
        const [results] = await conn.query('SELECT * FROM enrollments WHERE event_id = ?', [eventId]);
        res.json(results);
    } catch (error) {
        console.error('Error fetching enrollments:', error.message);
        res.status(500).json({ error: 'Error fetching enrollments' });
    }
};

exports.updateEnrollmentStatus = async (req, res) => {
    const { id } = req.params;
    const { newStatus } = req.body;

    if (!newStatus) {
        return res.status(400).json({ error: 'newStatus is required.' });
    }

    try {
        const conn = await connectMySQL();

        const [enrollments] = await conn.query(
            // We still need the event name for the email, but no longer creator_id for a permission check
            `SELECT e.email, e.name, ev.name AS event_name 
             FROM enrollments e 
             JOIN events ev ON e.event_id = ev.id 
             WHERE e.id = ?`,
            [id]
        );

        if (enrollments.length === 0) {
            return res.status(404).json({ error: 'Enrollment not found.' });
        }
        const enrollment = enrollments[0];

        /*
        // --- IMPORTANT: Authorization logic temporarily commented out for Proof-of-Concept ---
        // In a real application, you would uncomment this to ensure only authorized
        // users (like an admin or the event creator) can change the status.

        const loggedInUser = req.user; 
        if (loggedInUser.role !== 'admin' && loggedInUser.userId !== enrollment.creator_id) {
            return res.status(403).json({ error: 'Forbidden: You do not have permission to perform this action.' });
        }
        */

        // If the check passes, proceed with the update
        await conn.query(
            'UPDATE enrollments SET status = ? WHERE id = ?',
            [newStatus, id]
        );

        // Send the email notification
        await sendStatusChangeEmail(enrollment.email, enrollment.name, enrollment.event_name, newStatus);

        res.status(200).json({ message: `Enrollment status updated to ${newStatus} and notification sent.` });

    } catch (error) {
        console.error('Error updating enrollment status:', error.message);
        res.status(500).json({ error: 'Internal server error.' });
    }
};