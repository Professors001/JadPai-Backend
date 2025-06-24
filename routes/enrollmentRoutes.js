// routes/enrollmentRoutes.js
const express = require('express');
const router = express.Router();
const enrollmentController = require('../controllers/enrollmentController');
const upload = require('../middleware/multerConfig');

router.get('/', enrollmentController.getAllEnrollments);
router.get('/:id', enrollmentController.getEnrollmentById);
// router.post('/', enrollmentController.createEnrollment);
router.put('/:id', enrollmentController.updateEnrollment);
router.delete('/:id', enrollmentController.deleteEnrollment);

router.get('/users/:id', enrollmentController.getEnrollmentsByUserId);

router.get('/events/:id', enrollmentController.getAllEnrollmentsByEventId);

router.post(
    '/enroll', 
    upload.single('picture'), 
    enrollmentController.createEnrollment
);

module.exports = router;