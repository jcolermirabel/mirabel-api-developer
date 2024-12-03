const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const databaseObjectSchema = new Schema({
  serviceId: {
    type: Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },
  objects: [{
    path: String  // Stores paths like '/table/DEV_24602_07242024_tblInvoice'
  }]
});

// Add indexes
databaseObjectSchema.index({ serviceId: 1 });
databaseObjectSchema.index({ 'objects.path': 1 });

module.exports = mongoose.model('DatabaseObject', databaseObjectSchema); 