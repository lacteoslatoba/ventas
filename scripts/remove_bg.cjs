const { Jimp } = require('jimp');

async function removeWhiteBackground() {
    try {
        const imagePath = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\2991b7be-01df-4f87-ad9e-147a60ffde7a\\media__1778518628243.jpg';
        const outputPath = 'C:\\Users\\Admin\\Documents\\APPS\\Mar de Hielo\\public\\logo.png';
        const pwaPath = 'C:\\Users\\Admin\\Documents\\APPS\\Mar de Hielo\\public\\pwa-logo.png';
        const applePath = 'C:\\Users\\Admin\\Documents\\APPS\\Mar de Hielo\\public\\apple-touch-icon.png';

        const image = await Jimp.read(imagePath);
        
        // Convert white to transparent
        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
            const r = this.bitmap.data[idx + 0];
            const g = this.bitmap.data[idx + 1];
            const b = this.bitmap.data[idx + 2];
            
            if (r > 240 && g > 240 && b > 240) {
                const whiteness = Math.min(r, g, b);
                if (whiteness > 245) {
                    this.bitmap.data[idx + 3] = 0;
                } else {
                    this.bitmap.data[idx + 3] = 255 - ((whiteness - 240) * 17);
                }
            }
        });

        await image.write(outputPath);
        console.log('Saved to', outputPath);
        
        await image.write(pwaPath);
        await image.write(applePath);
        console.log('Saved PWA icons');
        
    } catch (error) {
        console.error('Error processing image:', error);
    }
}

removeWhiteBackground();
