import jsPDF from 'jspdf';
import { BingoCard } from '../types/bingo';
import { cardToMatrix } from './bingoEngine';

export interface PDFExportOptions {
  cardsPerPage: 1 | 2 | 4 | 6;
  companyName?: string;
  locationName?: string;
  showCutLines?: boolean;
  colorScheme?: 'classic-red' | 'navy' | 'emerald' | 'grayscale';
  fontSizeScale?: number;
}

export function exportBingoCardsToPDF(
  cards: BingoCard[],
  options: PDFExportOptions = {
    cardsPerPage: 4,
    companyName: 'RURAL BINGO SYSTEM',
    locationName: 'OFFICIAL FIXED CARD',
    showCutLines: true,
    colorScheme: 'classic-red',
  }
) {
  const doc = new jsPDF({
    orientation: options.cardsPerPage === 2 ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const { cardsPerPage, companyName, showCutLines, colorScheme } = options;

  // Color palette definitions
  let headerBg = [185, 28, 28]; // Red
  let headerText = [255, 255, 255];
  let borderColor = [30, 41, 59];
  let freeBg = [254, 240, 138];
  let freeText = [133, 77, 14];

  if (colorScheme === 'navy') {
    headerBg = [30, 58, 138];
  } else if (colorScheme === 'emerald') {
    headerBg = [6, 95, 70];
  } else if (colorScheme === 'grayscale') {
    headerBg = [50, 50, 50];
    freeBg = [230, 230, 230];
    freeText = [0, 0, 0];
  }

  const margin = 10;
  const printableWidth = pageWidth - margin * 2;
  const printableHeight = pageHeight - margin * 2;

  let cols = 1;
  let rows = 1;

  if (cardsPerPage === 1) {
    cols = 1;
    rows = 1;
  } else if (cardsPerPage === 2) {
    cols = 2;
    rows = 1;
  } else if (cardsPerPage === 4) {
    cols = 2;
    rows = 2;
  } else if (cardsPerPage === 6) {
    cols = 2;
    rows = 3;
  }

  const cardBoxWidth = printableWidth / cols;
  const cardBoxHeight = printableHeight / rows;

  const cardPadding = 4;
  const actualCardWidth = cardBoxWidth - cardPadding * 2;
  const actualCardHeight = cardBoxHeight - cardPadding * 2;

  cards.forEach((card, index) => {
    const pageIndex = Math.floor(index / cardsPerPage);
    const cardSlotIndex = index % cardsPerPage;

    if (index > 0 && cardSlotIndex === 0) {
      doc.addPage();
    }

    const colIndex = cardSlotIndex % cols;
    const rowIndex = Math.floor(cardSlotIndex / cols);

    const slotX = margin + colIndex * cardBoxWidth;
    const slotY = margin + rowIndex * cardBoxHeight;

    const cardX = slotX + cardPadding;
    const cardY = slotY + cardPadding;

    // Draw Cut Lines if requested
    if (showCutLines) {
      doc.setDrawColor(180, 180, 180);
      doc.setLineDashPattern([2, 2], 0);
      doc.rect(slotX, slotY, cardBoxWidth, cardBoxHeight);
      doc.setLineDashPattern([], 0); // reset dash
    }

    // Outer Card Border
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.6);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cardX, cardY, actualCardWidth, actualCardHeight, 2, 2, 'FD');

    // Header Band (Card ID & Organization)
    const headerHeight = Math.min(12, actualCardHeight * 0.12);
    doc.setFillColor(245, 247, 250);
    doc.rect(cardX, cardY, actualCardWidth, headerHeight, 'F');
    doc.setDrawColor(200, 205, 215);
    doc.line(cardX, cardY + headerHeight, cardX + actualCardWidth, cardY + headerHeight);

    // Organization & Card ID Text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(actualCardWidth > 100 ? 10 : 8);
    doc.setTextColor(50, 60, 75);
    doc.text((companyName || 'RURAL BINGO SYSTEM').toUpperCase(), cardX + 3, cardY + headerHeight * 0.65);

    doc.setFont('courier', 'bold');
    doc.setFontSize(actualCardWidth > 100 ? 11 : 9);
    doc.setTextColor(220, 38, 38);
    doc.text(card.cardId, cardX + actualCardWidth - 3, cardY + headerHeight * 0.65, { align: 'right' });

    // B-I-N-G-O Columns Header
    const gridTop = cardY + headerHeight + 2;
    const gridBottom = cardY + actualCardHeight - 6;
    const gridHeight = gridBottom - gridTop;
    const gridWidth = actualCardWidth - 4;
    const gridX = cardX + 2;

    const cellWidth = gridWidth / 5;
    const bingoHeaderHeight = Math.min(10, gridHeight * 0.16);
    const rowHeight = (gridHeight - bingoHeaderHeight) / 5;

    // Draw BINGO Letters Header
    const letters = ['B', 'I', 'N', 'G', 'O'];
    doc.setFillColor(headerBg[0], headerBg[1], headerBg[2]);
    doc.rect(gridX, gridTop, gridWidth, bingoHeaderHeight, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(bingoHeaderHeight * 2);
    doc.setTextColor(headerText[0], headerText[1], headerText[2]);

    letters.forEach((letter, i) => {
      const lx = gridX + i * cellWidth + cellWidth / 2;
      const ly = gridTop + bingoHeaderHeight * 0.72;
      doc.text(letter, lx, ly, { align: 'center' });
    });

    // Draw Grid Lines & Numbers
    const matrix = cardToMatrix(card);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.3);

    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const cx = gridX + c * cellWidth;
        const cy = gridTop + bingoHeaderHeight + r * rowHeight;
        const val = matrix[r][c];

        // Draw Cell Border
        doc.rect(cx, cy, cellWidth, rowHeight);

        // Center Free Cell styling
        if (val === 'FREE') {
          doc.setFillColor(freeBg[0], freeBg[1], freeBg[2]);
          doc.rect(cx + 0.3, cy + 0.3, cellWidth - 0.6, rowHeight - 0.6, 'F');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(Math.min(9, rowHeight * 1.6));
          doc.setTextColor(freeText[0], freeText[1], freeText[2]);
          doc.text('★ FREE ★', cx + cellWidth / 2, cy + rowHeight * 0.65, { align: 'center' });
        } else {
          // Regular number
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(Math.min(16, rowHeight * 2.1));
          doc.setTextColor(15, 23, 42);
          doc.text(String(val), cx + cellWidth / 2, cy + rowHeight * 0.68, { align: 'center' });
        }
      }
    }

    // Security Footer
    const footerY = cardY + actualCardHeight - 2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(120, 130, 145);
    doc.text(`FIXED PHYSICAL CARD • REUSABLE ACROSS GAMES • DO NOT DUPLICATE`, cardX + 3, footerY);
    doc.text(`CARD ID: ${card.cardId}`, cardX + actualCardWidth - 3, footerY, { align: 'right' });
  });

  const filename = `Bingo_Cards_${cards[0]?.cardId || 'Set'}_to_${cards[cards.length - 1]?.cardId || 'Batch'}.pdf`;
  doc.save(filename);
  return filename;
}
