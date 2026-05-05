import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { FileOpener } from '@capacitor-community/file-opener';

/**
 * Saves and opens/shares a file on native platforms.
 * @param {Blob} blob The file blob
 * @param {string} fileName The name of the file
 * @param {string} mimeType The mime type (e.g. 'application/pdf', 'image/png')
 */
export const saveAndOpenFile = async (blob, fileName, mimeType) => {
    if (!Capacitor.isNativePlatform()) {
        // Fallback for web
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);
        return;
    }

    try {
        // Request permissions first
        try {
            await Filesystem.requestPermissions();
        } catch (pErr) {
            console.warn('Permission request failed or already granted:', pErr);
        }

        // Convert blob to base64
        const reader = new FileReader();
        const base64Data = await new Promise((resolve, reject) => {
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

        let fileUri = '';
        let savedSuccessfully = false;

        // On Android, try to save to the public Downloads folder or Documents
        if (Capacitor.getPlatform() === 'android') {
            // Try 1: Public Download folder
            try {
                const result = await Filesystem.writeFile({
                    path: fileName, // Just the name, directory handles the rest
                    data: base64Data,
                    directory: Directory.ExternalStorage, // Maps to public storage
                    recursive: true
                });
                fileUri = result.uri;
                savedSuccessfully = true;
            } catch (err) {
                console.warn('Error saving to ExternalStorage, trying Documents:', err);
                // Try 2: Documents folder
                try {
                    const result = await Filesystem.writeFile({
                        path: fileName,
                        data: base64Data,
                        directory: Directory.Documents,
                        recursive: true
                    });
                    fileUri = result.uri;
                    savedSuccessfully = true;
                } catch (err2) {
                    console.warn('Error saving to Documents, trying Cache:', err2);
                }
            }
        }

        // Fallback or iOS: Save to Cache (always works for opening)
        if (!savedSuccessfully) {
            const result = await Filesystem.writeFile({
                path: fileName,
                data: base64Data,
                directory: Directory.Cache,
            });
            fileUri = result.uri;
        }

        // Open the file immediately
        try {
            await FileOpener.open({
                filePath: fileUri,
                contentType: mimeType,
            });
        } catch (openErr) {
            console.error('FileOpener error:', openErr);
            // If opening fails, trigger Share dialog which allows "Save to device"
            // Notify user
            if (Capacitor.getPlatform() === 'android') {
                alert('El archivo se guardó en la carpeta de Descargas/Documentos. Se abrirá el menú para compartir por si deseas enviarlo.');
            }
            
            await Share.share({
                title: fileName,
                text: 'Archivo generado desde Ventas',
                url: fileUri,
                dialogTitle: 'Abrir o Guardar archivo',
            });
        }
    } catch (err) {
        console.error('Error saving/opening file:', err);
        alert('Error: ' + err.message);
        throw err;
    }
};
