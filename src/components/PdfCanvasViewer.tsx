'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';

interface PdfCanvasViewerProps {
  src: string; // Blob URL, Data URI, or HTTPS URL
  fileName?: string;
  zoomLevel?: number;
}

export function PdfCanvasViewer({ src, fileName = 'document.pdf', zoomLevel = 1 }: PdfCanvasViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadAndRender() {
      if (!src) return;
      setLoading(true);
      setError(null);

      try {
        // Load pdf.js from cdnjs dynamically if not already on window
        if (!(window as any).pdfjsLib) {
          await new Promise<void>((resolve, reject) => {
            const existingScript = document.getElementById('pdfjs-cdn-script');
            if (existingScript) {
              existingScript.addEventListener('load', () => resolve());
              existingScript.addEventListener('error', () => reject(new Error('Failed to load PDF script')));
              return;
            }

            const script = document.createElement('script');
            script.id = 'pdfjs-cdn-script';
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load PDF script from CDN'));
            document.head.appendChild(script);
          });
        }

        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) {
          throw new Error('PDF.js library could not be initialized.');
        }

        pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        const loadingTask = pdfjsLib.getDocument(src);
        const pdf = await loadingTask.promise;

        if (isCancelled) return;

        const container = containerRef.current;
        if (!container) return;

        container.innerHTML = '';

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          if (isCancelled) return;

          const defaultViewport = page.getViewport({ scale: 1 });
          const containerWidth = container.clientWidth || 360;
          const scale = ((containerWidth - 24) / defaultViewport.width) * zoomLevel;
          const viewport = page.getViewport({ scale: Math.max(0.6, scale) });

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) continue;

          canvas.height = viewport.height;
          canvas.width = viewport.width;
          canvas.className = 'rounded-lg shadow-sm border border-slate-200 bg-white mb-3 max-w-full';

          container.appendChild(canvas);

          await page.render({
            canvasContext: context,
            viewport,
          }).promise;
        }

        if (!isCancelled) {
          setLoading(false);
        }
      } catch (err: any) {
        console.warn('PDF canvas render note:', err);
        if (!isCancelled) {
          setError(err?.message || 'Could not render PDF preview directly.');
          setLoading(false);
        }
      }
    }

    loadAndRender();

    return () => {
      isCancelled = true;
    };
  }, [src, zoomLevel]);

  return (
    <div className="w-full h-full flex flex-col items-center overflow-y-auto p-3 bg-slate-50 relative min-h-[300px]">
      {loading && (
        <div className="flex flex-col items-center justify-center p-8 text-center space-y-2 my-auto">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-700">Rendering PDF Document ({fileName})...</p>
          <p className="text-[10px] text-slate-400">Loading in-app canvas pages</p>
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center p-6 text-center space-y-2 my-auto bg-white rounded-xl border border-slate-200 max-w-xs shadow-sm">
          <FileText className="w-10 h-10 text-blue-600 mx-auto" />
          <p className="text-xs font-bold text-slate-800">{fileName}</p>
          <p className="text-[11px] text-slate-500">PDF Document Proof Attached</p>
        </div>
      )}

      <div
        ref={containerRef}
        className={`w-full flex flex-col items-center ${loading ? 'hidden' : 'block'}`}
      />
    </div>
  );
}
