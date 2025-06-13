const router = require('express').Router();
const applicationController = require('../controllers/applicationController');
const persistentAuth = require('../middleware/persistentAuth');

// All routes in this file are protected by the persistentAuth middleware
router.use(persistentAuth);

// POST /api/applications - Create a new application
router.post('/', applicationController.createApplication);

// GET /api/applications - Get all applications
router.get('/', applicationController.getAllApplications);

// GET /api/applications/:id - Get a single application by ID
router.get('/:id', applicationController.getApplicationById);

// PUT /api/applications/:id - Update an application by ID
router.put('/:id', applicationController.updateApplication);

// DELETE /api/applications/:id - Delete an application by ID
router.delete('/:id', applicationController.deleteApplication);

// POST /api/applications/:id/api-key - Generate a new API key
router.post('/:id/api-key', applicationController.generateApiKey);

module.exports = router; 