// routes/eventRoutes.js
const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { isAuthenticated, isAdmin } = require('../middleware/authMiddleware');

router.get('/', eventController.getAllEvents);
router.get('/:id', eventController.getEventById);
router.post('/', isAdmin, eventController.createEvent);
router.put('/:id', isAdmin, eventController.updateEvent);
router.delete('/:id', isAdmin, eventController.deleteEvent);

router.get('/users/:id/not_attending', isAuthenticated, eventController.getAllEventsThatUserNotAttending);

module.exports = router;