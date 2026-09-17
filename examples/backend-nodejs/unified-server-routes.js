/**
 * Express.js Routes for Unified Market Billing Verification & Consumption
 */

const express = require('express');
const MarketService = require('./market-service');

const router = express.Router();
const marketService = new MarketService();

// Mock database for replay prevention and user credits
const processedTokens = new Set();
const userCredits = new Map();

/**
 * POST /api/payments/verify
 * Request body: { store: 'cafebazaar'|'myket', sku, token, payload, userId }
 */
router.post('/verify', async (req, res) => {
  try {
    const { store, sku, token, payload, userId } = req.body;

    if (!store || !sku || !token || !userId) {
      return res.status(400).json({ error: 'Missing required parameters: store, sku, token, userId' });
    }

    // 1. Prevent Replay Attack
    const tokenKey = `${store}:${token}`;
    if (processedTokens.has(tokenKey)) {
      return res.status(409).json({ error: 'Purchase token has already been processed.' });
    }

    // 2. Validate Developer Payload
    const isValidPayload = marketService.verifyPayload(payload, userId);
    if (!isValidPayload) {
      return res.status(403).json({ error: 'Invalid or expired developer payload.' });
    }

    // 3. Verify Purchase with the respective App Store
    const result = await marketService.verifyPurchase({ store, sku, token });

    if (!result.isValid) {
      return res.status(402).json({ error: 'Purchase is invalid or has been refunded.', details: result });
    }

    // 4. Mark Token as processed
    processedTokens.add(tokenKey);

    // 5. Grant in-game / in-app items (e.g. 500 coins)
    const current = userCredits.get(userId) || 0;
    userCredits.set(userId, current + 500);

    // 6. Automatically consume consumable item if not yet consumed
    if (!result.isConsumed) {
      try {
        await marketService.consumePurchase({ store, sku, token });
        result.isConsumed = true;
      } catch (consumeErr) {
        console.warn(`[AutoConsume] Warning: Server consumption failed for ${store}:`, consumeErr.message);
      }
    }

    return res.json({
      success: true,
      store: result.store,
      sku: result.sku,
      newBalance: userCredits.get(userId),
      isConsumed: result.isConsumed
    });

  } catch (error) {
    console.error('[PaymentVerify Error]:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/payments/payload
 * Generates an authenticated payload for a user session before starting checkout
 */
router.get('/payload', (req, res) => {
  const userId = req.query.userId || req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const payload = marketService.generatePayload(userId);
  return res.json({ payload });
});

module.exports = router;
