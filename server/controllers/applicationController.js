const Application = require('../models/Application');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Generate a secure, prefixed API key
const generateSecureApiKey = () => {
  const identifier = `mira_dev_${crypto.randomBytes(8).toString('hex')}`;
  const secret = crypto.randomBytes(32).toString('hex');
  const apiKey = `${identifier}.${secret}`;
  return { apiKey, identifier };
};

// @desc    Create a new application
// @route   POST /api/applications
// @access  Private
exports.createApplication = async (req, res) => {
  try {
    const { name, description, defaultRole, isActive } = req.body;

    const { apiKey, identifier } = generateSecureApiKey();
    const hashedApiKey = await bcrypt.hash(apiKey, 10);

    const application = new Application({
      name,
      description,
      defaultRole,
      apiKey: hashedApiKey,
      apiKeyIdentifier: identifier,
      isActive,
      createdBy: req.user.userId // Assuming persistentAuth sets req.user
    });

    await application.save();

    const populatedApp = await Application.findById(application._id)
      .populate('defaultRole', 'name')
      .populate('createdBy', 'email');

    // IMPORTANT: Return the plaintext key only at this stage
    res.status(201).json({ application: populatedApp, newApiKey: apiKey });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create application', error: error.message });
  }
};

// @desc    Generate a new API Key for an application
// @route   POST /api/applications/:id/api-key
// @access  Private
exports.generateApiKey = async (req, res) => {
  try {
    const { apiKey, identifier } = generateSecureApiKey();
    const hashedApiKey = await bcrypt.hash(apiKey, 10);

    const application = await Application.findByIdAndUpdate(
      req.params.id,
      {
        apiKey: hashedApiKey,
        apiKeyIdentifier: identifier
      },
      { new: true }
    );

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // IMPORTANT: Return the plaintext key only at this stage
    res.status(200).json({ message: 'API Key generated successfully', newApiKey: apiKey });
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate API key', error: error.message });
  }
};


// @desc    Get all applications
// @route   GET /api/applications
// @access  Private
exports.getAllApplications = async (req, res) => {
  try {
    const applications = await Application.find()
      .populate('defaultRole', 'name')
      .populate('createdBy', 'email');
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch applications' });
  }
};

// @desc    Get a single application
// @route   GET /api/applications/:id
// @access  Private
exports.getApplicationById = async (req, res) => {
    try {
        const application = await Application.findById(req.params.id)
            .populate('defaultRole', 'name')
            .populate('createdBy', 'email');
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }
        res.json(application);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch application' });
    }
};

// @desc    Update an application
// @route   PUT /api/applications/:id
// @access  Private
exports.updateApplication = async (req, res) => {
  try {
    const { name, description, defaultRole, isActive } = req.body;

    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { name, description, defaultRole, isActive },
      { new: true }
    )
    .populate('defaultRole', 'name')
    .populate('createdBy', 'email');

    if (!application) {
        return res.status(404).json({ message: 'Application not found' });
    }

    res.json(application);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update application' });
  }
};

// @desc    Delete an application
// @route   DELETE /api/applications/:id
// @access  Private
exports.deleteApplication = async (req, res) => {
  try {
    const application = await Application.findByIdAndDelete(req.params.id);
    if (!application) {
        return res.status(404).json({ message: 'Application not found' });
    }
    res.json({ message: 'Application deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete application' });
  }
}; 