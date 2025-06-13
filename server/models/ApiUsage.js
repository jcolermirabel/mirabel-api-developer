const mongoose = require('mongoose');

const apiUsageSchema = new mongoose.Schema({
  connectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Connection',
    required: true
  },
  endpoint: {
    type: String,
    required: true
  },
  component: {
    type: String,
    required: true
  },
  databasename: {
    type: String,
    required: false
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  method: {
    type: String,
    required: true,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  },
  statusCode: {
    type: Number,
    required: true
  }
});

apiUsageSchema.index({ connectionId: 1, timestamp: 1 });
apiUsageSchema.index({ databasename: 1 });
apiUsageSchema.index({ component: 1 });
apiUsageSchema.index({ timestamp: 1 });

const ApiUsage = mongoose.model('ApiUsage', apiUsageSchema);

module.exports = ApiUsage; 