const webpush = require('web-push');

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BMfXisPqHXuT66gM_US6VxRCdqn3stJX67xFil_mgUh-jA3HnLXkGxdnLat79jn4V3ytWWo3Bht4i_epCpCvisY';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'n1uhr_8kZ2HdM2Ln01HCpRch-rK3tDkuuWCQakvtGs4';
const VAPID_SUBJECT = 'mailto:contact@ayati.app';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const FIRESTORE_URL = 'https://firestore.googleapis.com/v1/projects/fatimti/databases/(default)/documents/push_subscriptions';

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Return public VAPID key
    if (req.method === 'GET') {
        return res.status(200).json({ publicKey: VAPID_PUBLIC_KEY });
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        const { action, user, to, subscription, title, body: msgBody, url } = body;

        // 1. Subscribe action — Save subscription to Firestore
        if (action === 'subscribe' && user && subscription) {
            const docData = {
                fields: {
                    user: { stringValue: user },
                    subscription: { stringValue: JSON.stringify(subscription) },
                    updatedAt: { integerValue: String(Date.now()) }
                }
            };

            const patchRes = await fetch(`${FIRESTORE_URL}/${user}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(docData)
            });

            if (!patchRes.ok) {
                const errText = await patchRes.text();
                console.warn('Firestore patch error:', errText);
            }

            return res.status(200).json({ success: true, message: 'Subscription saved' });
        }

        // 2. Send push action — Dispatch real lock-screen push via Apple APNs / WebPush
        if (action === 'send' && to) {
            const getRes = await fetch(`${FIRESTORE_URL}/${to}`);
            if (!getRes.ok) {
                return res.status(404).json({ error: `No subscription registered for user ${to}` });
            }

            const data = await getRes.json();
            const rawSub = data.fields?.subscription?.stringValue;
            if (!rawSub) {
                return res.status(404).json({ error: `Subscription data missing for ${to}` });
            }

            const targetSub = JSON.parse(rawSub);
            const payload = JSON.stringify({
                title: title || 'Ayati 💕',
                body: msgBody || 'You received new love!',
                url: url || '/',
                tag: 'ayati-' + Date.now()
            });

            await webpush.sendNotification(targetSub, payload);
            return res.status(200).json({ success: true, message: `Notification delivered to ${to}` });
        }

        return res.status(400).json({ error: 'Invalid action. Expected "subscribe" or "send"' });
    } catch (error) {
        console.error('Push API Error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
};
