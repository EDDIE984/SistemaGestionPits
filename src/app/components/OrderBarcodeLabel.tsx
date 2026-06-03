const CODE39_PATTERNS: Record<string, string> = {
  '0': 'nnnwwnwnn',
  '1': 'wnnwnnnnw',
  '2': 'nnwwnnnnw',
  '3': 'wnwwnnnnn',
  '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn',
  '6': 'nnwwwnnnn',
  '7': 'nnnwnnwnw',
  '8': 'wnnwnnwnn',
  '9': 'nnwwnnwnn',
  A: 'wnnnnwnnw',
  B: 'nnwnnwnnw',
  C: 'wnwnnwnnn',
  D: 'nnnnwwnnw',
  E: 'wnnnwwnnn',
  F: 'nnwnwwnnn',
  G: 'nnnnnwwnw',
  H: 'wnnnnwwnn',
  I: 'nnwnnwwnn',
  J: 'nnnnwwwnn',
  K: 'wnnnnnnww',
  L: 'nnwnnnnww',
  M: 'wnwnnnnwn',
  N: 'nnnnwnnww',
  O: 'wnnnwnnwn',
  P: 'nnwnwnnwn',
  Q: 'nnnnnnwww',
  R: 'wnnnnnwwn',
  S: 'nnwnnnwwn',
  T: 'nnnnwnwwn',
  U: 'wwnnnnnnw',
  V: 'nwwnnnnnw',
  W: 'wwwnnnnnn',
  X: 'nwnnwnnnw',
  Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn',
  '-': 'nwnnnnwnw',
  '*': 'nwnnwnwnn',
};

interface BarcodeBar {
  width: number;
  x: number;
}

interface BarcodeLayout {
  bars: BarcodeBar[];
  width: number;
}

const BARCODE_HEIGHT = 72;

function getBarcodeLayout(value: string): BarcodeLayout {
  const encodedValue = `*${value.trim().toUpperCase()}*`;
  const bars: BarcodeBar[] = [];
  let x = 10;

  for (const char of encodedValue) {
    const pattern = CODE39_PATTERNS[char];
    if (!pattern) throw new Error(`Caracter no compatible con Code 39: ${char}`);

    pattern.split('').forEach((size, index) => {
      const width = size === 'w' ? 5 : 2;
      if (index % 2 === 0) bars.push({ x, width });
      x += width;
    });
    x += 2;
  }

  return { bars, width: x + 8 };
}

function barcodeSvgMarkup(value: string) {
  const layout = getBarcodeLayout(value);
  const bars = layout.bars
    .map((bar) => `<rect x="${bar.x}" y="0" width="${bar.width}" height="${BARCODE_HEIGHT}" />`)
    .join('');

  return `<svg viewBox="0 0 ${layout.width} ${BARCODE_HEIGHT}" role="img" aria-label="Codigo de barras ${escapeHtml(value)}" xmlns="http://www.w3.org/2000/svg">${bars}</svg>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[char] ?? char);
}

export function printOrderBarcode(numeroOrden: string) {
  const printWindow = window.open('', '_blank', 'width=620,height=460');
  if (!printWindow) {
    window.alert('Permite las ventanas emergentes del navegador para imprimir la etiqueta.');
    return;
  }

  const safeNumeroOrden = escapeHtml(numeroOrden);
  printWindow.document.write(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Etiqueta ${safeNumeroOrden}</title>
        <style>
          @page { size: auto; margin: 8mm; }
          * { box-sizing: border-box; }
          body { margin: 0; color: #111827; font-family: Arial, sans-serif; }
          .label { width: 92mm; border: 1px solid #d1d5db; padding: 6mm; text-align: center; }
          .eyebrow { margin: 0 0 2mm; color: #4b5563; font-size: 9pt; font-weight: 700; letter-spacing: 1.5px; }
          svg { display: block; width: 100%; height: 20mm; fill: #111827; }
          .number { margin: 2mm 0 0; font-size: 16pt; font-weight: 700; letter-spacing: 1px; }
          .hint { margin: 1mm 0 0; color: #6b7280; font-size: 8pt; }
        </style>
      </head>
      <body>
        <main class="label">
          <p class="eyebrow">PITS · ORDEN DE TRABAJO</p>
          ${barcodeSvgMarkup(numeroOrden)}
          <p class="number">${safeNumeroOrden}</p>
          <p class="hint">Escanea para identificar la orden</p>
        </main>
        <script>
          window.addEventListener('load', () => {
            window.focus();
            window.print();
          });
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

export function OrderBarcodeLabel({ numeroOrden }: { numeroOrden: string }) {
  const layout = getBarcodeLayout(numeroOrden);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 text-center shadow-sm">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
        PITS · Orden de trabajo
      </p>
      <svg
        className="mx-auto h-[72px] w-full max-w-[360px] fill-gray-950"
        viewBox={`0 0 ${layout.width} ${BARCODE_HEIGHT}`}
        role="img"
        aria-label={`Codigo de barras ${numeroOrden}`}
      >
        {layout.bars.map((bar) => (
          <rect key={`${bar.x}-${bar.width}`} x={bar.x} y="0" width={bar.width} height={BARCODE_HEIGHT} />
        ))}
      </svg>
      <p className="mt-3 text-lg font-semibold tracking-wider text-gray-950">{numeroOrden}</p>
      <p className="mt-1 text-xs text-gray-500">Escanea para identificar la orden</p>
    </div>
  );
}
