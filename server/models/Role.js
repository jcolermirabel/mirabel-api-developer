const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define parameter schema
const parameterSchema = new Schema({
  name: String,
  type: String,
  maxLength: Number,
  precision: Number,
  scale: Number,
  isOutput: Boolean,
  isNullable: Boolean,
  parameterId: Number
});

// Define procedure schema
const procedureSchema = new Schema({
  name: String,
  schema: String,
  definition: String,
  created: Date,
  modified: Date
});

// Define schema info schema
const schemaInfoSchema = new Schema({
  lastUpdated: Date,
  procedure: procedureSchema,
  parameters: [parameterSchema]
});

// Define permission schema
const permissionSchema = new Schema({
  service: {
    type: Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },
  objectName: {
    type: String,
    required: true
  },
  objectType: {
    type: String,
    enum: ['tables', 'views', 'procedures'],
    required: true
  },
  actions: {
    GET: { type: Boolean, default: false },
    POST: { type: Boolean, default: false },
    PUT: { type: Boolean, default: false },
    PATCH: { type: Boolean, default: false },
    DELETE: { type: Boolean, default: false }
  },
  requester: {
    type: String,
    enum: ['API', 'UI'],
    required: true
  },
  schema: schemaInfoSchema
});

// Define role schema
const roleSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  permissions: [permissionSchema],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Role', roleSchema); 