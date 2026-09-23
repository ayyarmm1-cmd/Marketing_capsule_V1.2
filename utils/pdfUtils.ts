import type jsPDF from 'jspdf';

export type CanvasToPdfPaginatedOptions = {
  pageWidthMm?: number;
  pageHeightMm?: number;
  /** Top margin on the first PDF page (template may already include padding). */
  firstPageTopMm?: number;
  /** Top margin on continuation pages so rows are not flush with the page edge. */
  continuationTopMm?: number;
  /** Bottom margin on non-final pages to reduce awkward row splits. */
  pageBottomMm?: number;
  /**
   * Canvas Y (px) below which page breaks are not allowed — keeps summary/footer on one page.
   * Use with html2canvas `scale` (multiply DOM offset by scale).
   */
  protectTailBelowCanvasPx?: number;
};

/** DOM offset of an element inside `root`, scaled for html2canvas output coordinates. */
export function getProtectTailCanvasPx(
  root: HTMLElement,
  selector: string,
  scale: number
): number | undefined {
  const protectEl = root.querySelector(selector);
  if (!(protectEl instanceof HTMLElement)) return undefined;
  const rootRect = root.getBoundingClientRect();
  const protectRect = protectEl.getBoundingClientRect();
  return Math.max(0, Math.round((protectRect.top - rootRect.top) * scale));
}

/**
 * Renders an html2canvas canvas across multiple A4 pages with readable margins.
 * Uses per-page image slices (not full-image offset) so continuation pages always
 * receive the configured top margin.
 */
export function addCanvasToPdfPaginated(
  pdf: InstanceType<typeof jsPDF>,
  canvas: HTMLCanvasElement,
  options: CanvasToPdfPaginatedOptions = {}
): void {
  const pageWidthMm = options.pageWidthMm ?? 210;
  const pageHeightMm = options.pageHeightMm ?? 297;
  const firstPageTopMm = options.firstPageTopMm ?? 0;
  const continuationTopMm = options.continuationTopMm ?? 15;
  const pageBottomMm = options.pageBottomMm ?? 10;

  const pxPerMm = canvas.width / pageWidthMm;
  let sourceYPx = 0;
  let pageIndex = 0;

  while (sourceYPx < canvas.height - 0.5) {
    if (pageIndex > 0) {
      pdf.addPage();
    }

    const topMarginMm = pageIndex === 0 ? firstPageTopMm : continuationTopMm;
    const remainingPx = canvas.height - sourceYPx;
    const isLastPage = remainingPx <= (pageHeightMm - topMarginMm) * pxPerMm + 0.5;

    let drawableMm = isLastPage
      ? pageHeightMm - topMarginMm
      : pageHeightMm - topMarginMm - pageBottomMm;
    let slicePx = Math.min(Math.floor(drawableMm * pxPerMm), Math.ceil(remainingPx));

    const tailProtectPx = options.protectTailBelowCanvasPx;
    if (
      tailProtectPx != null &&
      tailProtectPx > sourceYPx &&
      sourceYPx + slicePx > tailProtectPx &&
      remainingPx > tailProtectPx - sourceYPx
    ) {
      const sliceBeforeTail = tailProtectPx - sourceYPx;
      if (sliceBeforeTail > 0 && sliceBeforeTail < slicePx) {
        slicePx = sliceBeforeTail;
      }
    }

    if (slicePx <= 0) break;

    drawableMm = slicePx / pxPerMm;

    const sliceHeightMm = slicePx / pxPerMm;
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = slicePx;
    const ctx = sliceCanvas.getContext('2d');
    if (!ctx) break;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    ctx.drawImage(
      canvas,
      0,
      sourceYPx,
      canvas.width,
      slicePx,
      0,
      0,
      canvas.width,
      slicePx
    );

    pdf.addImage(
      sliceCanvas.toDataURL('image/png'),
      'PNG',
      0,
      topMarginMm,
      pageWidthMm,
      sliceHeightMm
    );

    sourceYPx += slicePx;
    pageIndex += 1;
  }
}
