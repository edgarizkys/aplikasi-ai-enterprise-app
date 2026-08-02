const paymentService = require('../services/paymentService');

exports.createQris = async (req, res) => {
    try {
        const { orderId, amount, customerInfo } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }
        const result = await paymentService.createQrisTransaction(orderId || Date.now(), amount, customerInfo);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.createVa = async (req, res) => {
    try {
        const { orderId, amount, bank } = req.body;
        const result = await paymentService.createVirtualAccountTransaction(orderId || Date.now(), amount, bank || 'BCA');
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.handleWebhook = async (req, res) => {
    try {
        const signature = req.headers['x-callback-signature'] || req.headers['x-signature'];
        const isValid = paymentService.verifyWebhookSignature(req.body, signature);
        if (!isValid) {
            return res.status(403).json({ error: 'Invalid Payment Webhook Signature' });
        }
        console.log('[PAYMENT WEBHOOK VERIFIED]', req.body);
        res.json({ success: true, message: 'Webhook Processed' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
