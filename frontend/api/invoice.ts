/**
 * Vercel Serverless Function: Real PDF Invoice Generation & Latency Profiling
 * Route: /api/invoice
 * 
 * Accurately measures container cold-start vs warm-start latencies
 * Generates an actual, valid binary PDF document using PDFKit.
 */

import PDFDocument from 'pdfkit';

// Module-level scope persists across warm invocations of the same serverless instance
const instanceInitTime = performance.now();
let invocationCount = 0;
let isWarm = false;

interface InvoiceRequest {
  tenantId: string;
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  items?: Array<{
    name: string;
    sku: string;
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

export default async function handler(req: any, res: any) {
  const invocationStart = performance.now();
  const invokedAt = new Date().toISOString();
  invocationCount++;

  // Determine whether this invocation is a cold start or warm start
  const isColdStart = !isWarm;
  const executionType = isColdStart ? 'COLD_START' : 'WARM_START';

  // Measure initialization overhead on the first cold container run
  let initOverheadMs = 0;
  if (isColdStart) {
    initOverheadMs = performance.now() - instanceInitTime;
    isWarm = true; // Container is now warm for subsequent requests
  }

  try {
    if (req.method === 'GET') {
      return res.status(200).json({
        status: 'healthy',
        service: 'Vercel Serverless PDF Invoice Generator',
        executionType,
        isWarm,
        invocationCount,
        initOverheadMs: Number(initOverheadMs.toFixed(2)),
      });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed. Use POST or GET.' });
    }

    const { tenantId, orderId, orderNumber, totalAmount, items, customer } = (req.body || {}) as InvoiceRequest;

    if (!orderId || !tenantId) {
      return res.status(400).json({ error: 'tenantId and orderId are required' });
    }

    // Generate REAL binary PDF
    const renderStart = performance.now();
    const pdfBuffer = await generateActualPdf({
      tenantId,
      orderId,
      orderNumber: orderNumber || `ORD-${orderId.slice(0, 8)}`,
      totalAmount: totalAmount || 0,
      items: items || [],
      customer: customer || { name: 'Valued Client', email: 'billing@client.com' },
      invokedAt,
      executionType,
    });
    const renderTimeMs = Number((performance.now() - renderStart).toFixed(2));

    const totalDurationMs = Number((performance.now() - invocationStart).toFixed(2));
    const completedAt = new Date().toISOString();

    const telemetry = {
      executionType,
      coldStart: isColdStart,
      invocationCount,
      initOverheadMs: Number(initOverheadMs.toFixed(2)),
      renderTimeMs,
      totalDurationMs,
      invokedAt,
      completedAt,
    };

    console.log(
      `[Serverless Invoice] Type: ${executionType} | #${invocationCount} | Total: ${totalDurationMs}ms (Render: ${renderTimeMs}ms) | Order: ${orderNumber}`
    );

    // If download query param is passed, stream PDF directly
    if (req.query?.download === 'true') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=invoice-${orderNumber}.pdf`);
      return res.status(200).send(pdfBuffer);
    }

    // Return JSON with telemetry and Base64 PDF
    return res.status(200).json({
      success: true,
      invoiceNumber: `INV-${orderNumber}`,
      orderId,
      tenantId,
      totalAmount,
      latency: telemetry,
      pdfDocument: {
        contentType: 'application/pdf',
        filename: `invoice-${orderNumber}.pdf`,
        sizeBytes: pdfBuffer.length,
        contentBase64: pdfBuffer.toString('base64'),
      },
    });
  } catch (error: any) {
    const errorDurationMs = Number((performance.now() - invocationStart).toFixed(2));
    console.error(`[Serverless Error] ${error.message} (${errorDurationMs}ms)`);
    return res.status(500).json({
      success: false,
      error: error.message,
      durationMs: errorDurationMs,
    });
  }
}

/**
 * Builds an actual binary PDF document using PDFKit
 */
function generateActualPdf(data: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // Header Banner
      doc.rect(0, 0, 595.28, 70).fill('#0f172a'); // slate-900
      doc.fillColor('#ffffff').fontSize(20).text('OMNIORDER B2B SAAS', 40, 25, { bold: true } as any);
      doc.fontSize(9).fillColor('#38bdf8').text('SERVERLESS INVOICE GENERATOR', 40, 48);

      // Invoice Details Block
      doc.fillColor('#0f172a').fontSize(14).text(`INVOICE: INV-${data.orderNumber}`, 40, 90);
      doc.fontSize(9).fillColor('#64748b');
      doc.text(`Issue Date: ${new Date(data.invokedAt).toLocaleString()}`, 40, 110);
      doc.text(`Tenant ID: ${data.tenantId}`, 40, 122);
      doc.text(`Order ID: ${data.orderId}`, 40, 134);

      // Client Info Block
      doc.rect(360, 90, 195, 60).fill('#f8fafc').stroke('#e2e8f0');
      doc.fillColor('#0f172a').fontSize(10).text('Bill To:', 370, 98);
      doc.fontSize(9).fillColor('#334155').text(data.customer?.name || 'Enterprise Customer', 370, 112);
      doc.text(data.customer?.email || 'N/A', 370, 124);

      // Table Header
      let y = 175;
      doc.rect(40, y, 515, 22).fill('#f1f5f9');
      doc.fillColor('#334155').fontSize(9).text('SKU', 48, y + 6);
      doc.text('Item Description', 140, y + 6);
      doc.text('Qty', 350, y + 6);
      doc.text('Unit Price', 410, y + 6);
      doc.text('Subtotal', 490, y + 6);

      // Items
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
      } else {
        doc.fillColor('#64748b').fontSize(8.5).text('Standard Order Items Batch', 48, y);
        doc.text('1', 350, y);
        doc.text(`$${Number(data.totalAmount).toFixed(2)}`, 410, y);
        doc.text(`$${Number(data.totalAmount).toFixed(2)}`, 490, y);
        y += 20;
      }

      // Divider & Grand Total
      doc.moveTo(40, y + 5).lineTo(555, y + 5).strokeColor('#cbd5e1').stroke();
      y += 15;
      doc.rect(360, y, 195, 30).fill('#0ea5e9'); // brand-500
      doc.fillColor('#ffffff').fontSize(11).text('Grand Total:', 375, y + 9);
      doc.fontSize(12).text(`$${Number(data.totalAmount).toFixed(2)}`, 470, y + 8, { bold: true } as any);

      // Telemetry Stamp
      y += 50;
      doc.rect(40, y, 515, 35).fill('#f8fafc').stroke('#e2e8f0');
      doc.fillColor('#64748b').fontSize(7.5);
      doc.text(`Serverless Execution Profile: ${data.executionType} | Container Latency: ${data.invokedAt}`, 48, y + 8);
      doc.text('Certified authentic serverless invoice dispatched by OmniOrder Event Stream.', 48, y + 20);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
