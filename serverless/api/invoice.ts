/**
 * Vercel Serverless Function: Invoice Generation & Profiling
 * Route: /api/invoice
 * 
 * Accurately tracks cold-start vs warm-start latency using module-scoped instance caching.
 */

// Module-level scope persists across warm invocations of the same serverless container instance
let instanceStartTime = Date.now();
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
  generatedAt?: string;
}

export default async function handler(req: any, res: any) {
  const invocationStart = performance.now();
  const invokedAt = new Date().toISOString();
  invocationCount++;

  // Determine whether this container invocation is a cold start or warm start
  const isColdStart = !isWarm;
  const executionType = isColdStart ? 'COLD_START' : 'WARM_START';

  // Simulate or measure container initialization overhead on first cold run
  let initOverheadMs = 0;
  if (isColdStart) {
    initOverheadMs = Math.max(0, Date.now() - instanceStartTime);
    isWarm = true; // Mark container warm for subsequent invocations
  }

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    }

    const { tenantId, orderId, orderNumber, totalAmount, items } = (req.body || {}) as InvoiceRequest;

    if (!orderId || !tenantId) {
      return res.status(400).json({ error: 'tenantId and orderId are required' });
    }

    // PDF Generation simulation & buffer creation
    const renderStart = performance.now();
    const invoicePdfBuffer = generateInvoiceTextBuffer({
      tenantId,
      orderId,
      orderNumber: orderNumber || `ORD-${orderId.slice(0, 8)}`,
      totalAmount: totalAmount || 0,
      items: items || [],
      invokedAt,
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
      `[Serverless Invoice Execution] Type: ${executionType} | Count: #${invocationCount} | Duration: ${totalDurationMs}ms (Render: ${renderTimeMs}ms) | Order: ${orderNumber}`
    );

    return res.status(200).json({
      success: true,
      invoiceNumber: `INV-${orderNumber}`,
      orderId,
      tenantId,
      totalAmount,
      latency: telemetry,
      pdfDocument: {
        contentType: 'application/pdf',
        filename: `invoice-${orderNumber}.txt`,
        contentBase64: Buffer.from(invoicePdfBuffer).toString('base64'),
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

function generateInvoiceTextBuffer(data: any): string {
  return `
============================================================
              B2B SAAS ORDER MANAGEMENT INVOICE
============================================================
Invoice Number: INV-${data.orderNumber}
Tenant ID:      ${data.tenantId}
Order ID:       ${data.orderId}
Issue Date:     ${data.invokedAt}
------------------------------------------------------------
Status:         PAID / CONFIRMED
Total Amount:   $${Number(data.totalAmount).toFixed(2)}
------------------------------------------------------------
Thank you for your business.
Automated Serverless Invoice Dispatcher
============================================================
`.trim();
}
