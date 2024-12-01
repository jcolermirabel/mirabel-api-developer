require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');

const checkServiceRoutes = async () => {
    try {
        // Read the services routes file
        const routesPath = path.join(__dirname, '..', 'routes', 'services.js');
        const routesContent = await fs.readFile(routesPath, 'utf8');
        
        console.log('\nService Routes File Contents:');
        console.log(routesContent);
        
        // Also check for any encryption utils
        const encryptionPath = path.join(__dirname, '..', 'utils', 'encryption.js');
        try {
            const encryptionContent = await fs.readFile(encryptionPath, 'utf8');
            console.log('\nEncryption Utils File Contents:');
            console.log(encryptionContent);
        } catch (err) {
            console.log('\nNo encryption utils file found');
        }
        
        // Check for any middleware that might handle encryption
        const middlewarePath = path.join(__dirname, '..', 'middleware');
        const middlewareFiles = await fs.readdir(middlewarePath);
        
        console.log('\nMiddleware Files:');
        for (const file of middlewareFiles) {
            if (file.includes('crypt') || file.includes('service')) {
                const content = await fs.readFile(path.join(middlewarePath, file), 'utf8');
                console.log(`\n${file} contents:`);
                console.log(content);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    }
};

checkServiceRoutes(); 