// routes/enrollmentRoutes.js
const express = require('express');
const router = express.Router();
const enrollmentController = require('../controllers/enrollmentController');
const upload = require('../middleware/multerConfig');
const { isAuthenticated, isAdmin } = require('../middleware/authMiddleware');

router.get('/', enrollmentController.getAllEnrollments);
router.get('/:id', enrollmentController.getEnrollmentById);
// router.post('/', enrollmentController.createEnrollment);
router.put('/:id', isAuthenticated, enrollmentController.updateEnrollment);
router.delete('/:id', isAdmin, enrollmentController.deleteEnrollment);

router.get('/users/:id', isAuthenticated, enrollmentController.getEnrollmentsByUserId);

router.get('/events/:id', isAdmin, enrollmentController.getAllEnrollmentsByEventId);

router.post(
    '/enroll', 
    upload.single('picture'), 
    isAuthenticated,
    enrollmentController.createEnrollment 
);


// The authenticateToken middleware has been removed from this line
router.put('/:id/status', isAuthenticated, enrollmentController.updateEnrollmentStatus);

module.exports = router;