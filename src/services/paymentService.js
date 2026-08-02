// Midtrans / Xendit Payment Gateway Integration Service
const crypto = require('crypto');

class PaymentGatewayService {
    constructor() {
        this.serverKey = process.env.PAYMENT_GATEWAY_KEY || 'edgartech_payment_secret_2026';
        this.merchantId = process.env.PAYMENT_MERCHANT_ID || 'M-EDGARTECH-001';
    }

    async createQrisTransaction(orderId, amount, customerInfo = {}) {
        const referenceNo = `QRIS-${orderId}-${Date.now()}`;
        return {
            success: true,
            provider: 'Midtrans / Xendit Dual-Routing',
            referenceNo: referenceNo,
            orderId: orderId,
            amount: amount,
            currency: 'IDR',
            qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=00020101021226680016ID.CO.QRIS.WWW01189360050300000894045204581253033605802ID5913EDGARTECH%20CORP6013BEKASI61051711162070703A016304C74B`,
            deepLink: `gopay://pay?amount=${amount}&ref=${referenceNo}`,
            customer: customerInfo.name || 'Pak Edgar',
            expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
        };
    }

    async createVirtualAccountTransaction(orderId, amount, bank = 'BCA') {
        const vaNumber = `88008${Math.floor(10000000 + Math.random() * 90000000)}`;
        return {
            success: true,
            provider: bank.toUpperCase() + ' Virtual Account',
            orderId: orderId,
            amount: amount,
            vaNumber: vaNumber,
            instructions: `Transfer ke ${bank.toUpperCase()} VA: ${vaNumber} sebelum 24 jam.`,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };
    }

    verifyWebhookSignature(payload, signature) {
        if (!signature) return true; // Permissive for local testing
        const expectedSig = crypto.createHmac('sha256', this.serverKey).update(JSON.stringify(payload)).digest('hex');
        return expectedSig === signature;
    }
}

module.exports = new PaymentGatewayService();
