import PDFDocument from 'pdfkit';

// Module-level container state
const instanceStartTime = performance.now();
let invocationCount = 0;
let isWarm = false;

export interface InvoiceData {
  tenantId: string;
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  items?: Array<{
    productName?: string;
    name?: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  customer?: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };
}

export async function generateInvoicePdf(data: InvoiceData) {
  const invocationStart = performance.now();
  const invokedAt = new Date().toISOString();
  invocationCount++;

  const isColdStart = !isWarm;
  const executionType = isColdStart ? 'COLD_START' : 'WARM_START';

  let initOverheadMs = 0;
  if (isColdStart) {
    initOverheadMs = performance.now() - instanceStartTime;
    isWarm = true;
  }

  const renderStart = performance.now();
  const pdfBuffer = await buildBinaryPdf(data, executionType, invokedAt);
  const renderTimeMs = Number((performance.now() - renderStart).toFixed(2));

  const totalDurationMs = Number((performance.now() - invocationStart).toFixed(2));
  const completedAt = new Date().toISOString();

  return {
    success: true,
    invoiceNumber: `INV-${data.orderNumber}`,
    orderId: data.orderId,
    tenantId: data.tenantId,
    totalAmount: data.totalAmount,
    latency: {
      executionType,
      coldStart: isColdStart,
      invocationCount,
      initOverheadMs: Number(initOverheadMs.toFixed(2)),
      renderTimeMs,
      totalDurationMs,
      invokedAt,
      completedAt,
    },
    pdfDocument: {
      contentType: 'application/pdf',
      filename: `invoice-${data.orderNumber}.pdf`,
      sizeBytes: pdfBuffer.length,
      contentBase64: pdfBuffer.toString('base64'),
    },
  };
}

function buildBinaryPdf(data: InvoiceData, executionType: string, invokedAt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // Header Banner
      doc.rect(0, 0, 595.28, 70).fill('#0f172a');
      doc.fillColor('#ffffff').fontSize(20).text('OMNIORDER B2B SAAS', 40, 25, { bold: true } as any);
      doc.fontSize(9).fillColor('#38bdf8').text('SERVERLESS INVOICE ENGINE', 40, 48);

      // Order Info
      doc.fillColor('#0f172a').fontSize(14).text(`INVOICE: INV-${data.orderNumber}`, 40, 90);
      doc.fontSize(9).fillColor('#64748b');
      doc.text(`Issue Date: ${new Date(invokedAt).toLocaleString()}`, 40, 110);
      doc.text(`Tenant ID: ${data.tenantId}`, 40, 122);
      doc.text(`Order ID: ${data.orderId}`, 40, 134);

      // Bill To Box
      doc.rect(360, 90, 195, 60).fill('#f8fafc').stroke('#e2e8f0');
      doc.fillColor('#0f172a').fontSize(10).text('Bill To:', 370, 98);
      doc.fontSize(9).fillColor('#334155').text(data.customer?.name || 'Valued Client', 370, 112);
      doc.text(data.customer?.email || 'N/A', 370, 124);

      // Table Header
      let y = 175;
      doc.rect(40, y, 515, 22).fill('#f1f5f9');
      doc.fillColor('#334155').fontSize(9).text('SKU', 48, y + 6);
      doc.text('Item Description', 140, y + 6);
      doc.text('Qty', 350, y + 6);
      doc.text('Unit Price', 410, y + 6);
      doc.text('Subtotal', 490, y + 6);

      // Line Items
      y += 24;
      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          doc.fillColor('#0f172a').fontSize(8.5).text(item.sku || 'N/A', 48, y);
          doc.text(item.name || item.productName || 'Catalog Product', 140, y, { width: 200 });
          doc.text(String(item.quantity || 1), 350, y);
          doc.text(`$${Number(item.unitPrice || 0).toFixed(2)}`, 410, y);
          doc.text(`$${Number(item.subtotal || 0).toFixed(2)}`, 490, y);
          y += 20;
        }
      }

      // Divider & Grand Total
      doc.moveTo(40, y + 5).lineTo(555, y + 5).strokeColor('#cbd5e1').stroke();
      y += 15;
      doc.rect(360, y, 195, 30).fill('#0ea5e9');
      doc.fillColor('#ffffff').fontSize(11).text('Grand Total:', 375, y + 9);
      doc.fontSize(12).text(`$${Number(data.totalAmount).toFixed(2)}`, 470, y + 8, { bold: true } as any);

      // Telemetry Stamp
      y += 50;
      doc.rect(40, y, 515, 35).fill('#f8fafc').stroke('#e2e8f0');
      doc.fillColor('#64748b').fontSize(7.5);
      doc.text(`Serverless Execution Profile: ${executionType} | Container Timestamp: ${invokedAt}`, 48, y + 8);
      doc.text('Certified authentic serverless invoice dispatched by OmniOrder Event Stream.', 48, y + 20);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
