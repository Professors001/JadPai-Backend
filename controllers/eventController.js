// controllers/eventController.js
const { connectMySQL } = require('../database');

exports.getAllEvents = async (req, res) => {
    // This single query gets all events and their respective confirmed counts.
    const sqlQuery = `
        SELECT
            e.*,
            (SELECT COUNT(*) 
             FROM enrollments 
             WHERE event_id = e.id AND status = 'confirmed'
            ) AS confirmed_count
        FROM
            events AS e
        ORDER BY
            e.id DESC; -- Optional: order by most recent events
    `;

    try {
        const conn = await connectMySQL();
        const [results] = await conn.query(sqlQuery);

        // The result set is already perfectly formatted.
        res.json(results);

    } catch (error) {
        console.error('Error fetching events:', error.message);
        res.status(500).json({ error: 'Error fetching events' });
    }
};

exports.getEventById = async (req, res) => {
    const { id } = req.params;

    // A single, efficient query to get event details and the confirmed count.
    const sqlQuery = `
        SELECT
            e.*,
            (SELECT COUNT(*) 
             FROM enrollments 
             WHERE event_id = e.id AND status = 'confirmed'
            ) AS confirmed_count
        FROM
            events AS e
        WHERE
            e.id = ?;
    `;

    try {
        const conn = await connectMySQL();
        const [results] = await conn.query(sqlQuery, [id]);

        if (results.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // The result is already in the correct format, no transformation needed.
        res.json(results[0]);

    } catch (error) {
        console.error('Error fetching event:', error.message);
        res.status(500).json({ error: 'Error fetching event' });
    }
};

exports.createEvent = async (req, res) => {
    const newEvent = req.body;
    if (!newEvent || Object.keys(newEvent).length === 0) {
        return res.status(400).json({ error: 'Event data is missing in the request body.' });
    }
    try {
        const conn = await connectMySQL();
        const [result] = await conn.query('INSERT INTO events SET ?', [newEvent]);
        const eventId = result.insertId;
        res.status(201).json({ message: 'Event created successfully', eventId: eventId });
    } catch (error) {
        console.error('Error creating event:', error.message);
        res.status(500).json({ error: 'Error creating event' });
    }
};

exports.updateEvent = async (req, res) => {
    const eventId = req.params.id;
    const eventDataToUpdate = req.body;
    if (!eventDataToUpdate || Object.keys(eventDataToUpdate).length === 0) {
        return res.status(400).json({ error: 'No update data provided in the request body.' });
    }
    try {
        const conn = await connectMySQL();
        const [result] = await conn.query('UPDATE events SET ? WHERE id = ?', [eventDataToUpdate, eventId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: `Event with ID ${eventId} not found.` });
        }
        res.status(200).json({ message: `Event with ID ${eventId} updated successfully.` });
    } catch (error) {
        console.error('Error updating user:', error.message);
        res.status(500).json({ error: 'Error updating event' });
    }
};

exports.deleteEvent = async (req, res) => {
    const eventId = req.params.id;
    try {
        const conn = await connectMySQL();
        const [result] = await conn.query('DELETE FROM events WHERE id = ?', [eventId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: `Event with ID ${eventId} not found.` });
        }
        res.status(200).json({ message: `Event with ID ${eventId} deleted successfully.` });
    } catch (error) {
        console.error('Error deleting event:', error.message);
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ error: 'Cannot delete this event because they are referenced in other records.' });
        }
        res.status(500).json({ error: 'Error deleting event' });
    }
};

exports.getAllEventsThatUserNotAttending = async (req, res) => {
    const userId = req.params.id;
    try {
        const conn = await connectMySQL();
        const [results] = await conn.query(
            'SELECT * FROM events WHERE id NOT IN (SELECT event_id FROM enrollments WHERE user_id = ?) ORDER BY id DESC', 
            [userId]
        );
        res.json(results);
    } catch (error) {
        console.error('Error fetching events:', error.message);
        res.status(500).json({ error: 'Error fetching events' });
    }
};