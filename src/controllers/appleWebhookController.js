const supabase = require('../config/supabase');

// Helper to decode Apple's secure JWS format
const decodeJWS = (token) => {
    try {
        return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    } catch (e) {
        return null;
    }
};

exports.handleAppleWebhook = async (req, res) => {
    try {
        const { signedPayload } = req.body;
        if (!signedPayload) return res.status(400).send('No payload');

        // 1. Decode the main notification
        const payload = decodeJWS(signedPayload);
        const notificationType = payload.notificationType;
        
        // 2. Decode the specific transaction info inside
        const transactionInfo = decodeJWS(payload.data.signedTransactionInfo);
        
        const originalTransactionId = transactionInfo.originalTransactionId;
        const expiresDate = new Date(transactionInfo.expiresDate).toISOString();

        console.log(`🍎 APPLE NOTIFICATION: ${notificationType} for ID: ${originalTransactionId}`);

        let updateData = {};

        // 3. Handle different Apple events
        switch (notificationType) {
            case 'SUBSCRIBED':
            case 'DID_RENEW':
            case 'RENEWAL_EXTENDED':
                // Payment successful
                updateData = { plan_active: true, plan_expires_at: expiresDate };
                break;

            case 'EXPIRED':
            case 'DID_FAIL_TO_RENEW':
            case 'REVOKED':
            case 'REFUND':
                // Payment failed or cancelled
                updateData = { plan_active: false };
                break;

            default:
                console.log(`ℹ️ Ignored type: ${notificationType}`);
                break;
        }

        // 4. Update the user in Supabase using the Original Transaction ID link
        if (Object.keys(updateData).length > 0) {
            const { error } = await supabase
                .from('users')
                .update(updateData)
                .eq('apple_original_transaction_id', originalTransactionId);

            if (error) console.error("❌ Webhook DB Error:", error.message);
            else console.log(`✅ Webhook: Updated user for Apple ID ${originalTransactionId}`);
        }

        // Always tell Apple we got the message
        return res.status(200).send('OK');

    } catch (err) {
        console.error("❌ Apple Webhook Critical Error:", err.message);
        return res.status(200).send('Error Handled'); 
    }
};
