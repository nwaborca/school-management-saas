'use client';

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Download or share receipt proof file across Web and Native Capacitor Android
 */
export async function downloadOrShareReceipt(
  fileSource: string,
  fileName: string = 'payment_receipt.pdf'
): Promise<void> {
  if (!fileSource) return;

  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    try {
      let base64Data = '';

      if (fileSource.startsWith('data:')) {
        base64Data = fileSource.split(',')[1] || '';
      } else if (fileSource.startsWith('blob:')) {
        // Fetch blob and convert to base64
        const resp = await fetch(fileSource);
        const blob = await resp.blob();
        base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1] || '');
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      if (base64Data) {
        const cleanName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const savedFile = await Filesystem.writeFile({
          path: cleanName,
          data: base64Data,
          directory: Directory.Cache,
        });

        // Trigger native share sheet or open intent
        await Share.share({
          title: 'Aegis Payment Receipt Proof',
          text: `Payment Receipt: ${fileName}`,
          url: savedFile.uri,
          dialogTitle: 'Save or Share Receipt',
        });
        return;
      }
    } catch (nativeErr) {
      console.warn('Native Capacitor share failed, falling back to window.open:', nativeErr);
    }
  }

  // Web Browser fallback
  if (fileSource.startsWith('http://') || fileSource.startsWith('https://')) {
    const a = document.createElement('a');
    a.href = fileSource;
    a.target = '_blank';
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else {
    // For blob / data URL on browser
    const a = document.createElement('a');
    a.href = fileSource;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
