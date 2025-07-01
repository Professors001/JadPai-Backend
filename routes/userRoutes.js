// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { isAuthenticated, isAdmin } = require('../middleware/authMiddleware');

router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.post('/', userController.createUser);
router.put('/:id', isAuthenticated, userController.updateUser);
router.delete('/:id', isAdmin, userController.deleteUser);

router.post('/auth', userController.loginUser);

router.post('/auth/google', userController.googleLogin);

module.exports = router;