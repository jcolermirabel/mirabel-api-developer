require('dotenv').config();
const mongoose = require('mongoose');
const Service = require('../models/Service');
const CryptoJS = require('crypto-js');

const checkServiceDecryption = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get the service
        const service = await Service.findOne({ name: 'icoler' });
        if (!service) {
            console.error('Service not found');
            return;
        }

        console.log('\nService details:');
        console.log('Name:', service.name);
        console.log('Host:', service.host);
        console.log('Port:', service.port);
        console.log('Database:', service.database);
        console.log('Username:', service.username);
        console.log('Encrypted password:', service.password);

        // Try to get the decryption method from the service model
        console.log('\nAttempting to use service model decryption...');
        if (typeof service.decryptPassword === 'function') {
            try {
                const decrypted = service.decryptPassword();
                console.log('Decrypted using model method:', decrypted);
            } catch (e) {
                console.error('Model decryption failed:', e);
            }
        }

        // Check if there's a utility function being used
        if (service.password.includes(':')) {
            const [encrypted, iv] = service.password.split(':');
            console.log('\nEncrypted parts:');
            console.log('Encrypted:', encrypted);
            console.log('IV:', iv);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

checkServiceDecryption(); 