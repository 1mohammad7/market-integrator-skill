const express = require('express');
const router = express.Router();
const CafeBazaarService = require('./cafebazaar-service');

const bazaarService = new CafeBazaarService({
  packageName: process.env.BAZAAR_PACKAGE_NAME || 'com.example.fitme',
  apiSecretToken: process.env.BAZAAR_API_SECRET_TOKEN,
  dynamicPriceSecret: process.env.BAZAAR_DYNAMIC_PRICE_SECRET
});

/**
 * Endpoint to request a Dynamic Pricing Token (e.g. for targeted 20% discount)
 */
router.post('/api/billing/discount-token', async (req, res) => {
  try {
    const { sku, discountPriceRials } = req.body;
    const userId = req.user?.id; // Authenticated user ID

    // Security check: Validate if user is eligible for promotion in DB
    const token = bazaarService.generateDynamicPriceToken({
      priceInRials: discountPriceRials,
      sku: sku,
      expiresInSeconds: 900 // 15 mins
    });

    return res.json({ success: true, dynamicPriceToken: token });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Endpoint to verify and fulfill a consumable purchase (e.g. 500 Coins)
 */
router.post('/api/billing/verify-consumable', async (req, res) => {
  const { sku, purchaseToken, developerPayload } = req.body;
  const userId = req.user?.id;

  try {
    // 1. Verify token with CafeBazaar REST API v2
    const validation = await bazaarService.validateInAppPurchase(sku, purchaseToken);

    if (!validation.isValid) {
      return res.status(400).json({ success: false, message: 'Invalid or fraudulent transaction' });
    }

    if (validation.isRefunded) {
      return res.status(400).json({ success: false, message: 'Transaction has been refunded' });
    }

    // 2. Consume the token on Bazaar servers so user can buy again
    await bazaarService.consumePurchase(purchaseToken);

    // 3. Fulfill the purchase in your database (e.g. add coins/credits)
    // await db.users.incrementCoins(userId, 500);
    // await db.purchases.record({ userId, sku, purchaseToken, orderId: validation.raw.orderId });

    return res.json({
      success: true,
      message: 'Purchase verified and fulfilled successfully'
    });
  } catch (error) {
    console.error('Consumable verification failed:', error);
    return res.status(500).json({ success: false, message: 'Verification error' });
  }
});

/**
 * Endpoint to check and sync subscription status
 */
router.post('/api/billing/sync-subscription', async (req, res) => {
  const { purchaseToken } = req.body;
  const userId = req.user?.id;

  try {
    const activeSubs = await bazaarService.getActiveSubscriptions(purchaseToken);
    const hasActiveSub = activeSubs.some((sub) => !sub.isExpired);

    if (hasActiveSub) {
      const currentSub = activeSubs.find((sub) => !sub.isExpired);
      // await db.users.updateSubscription(userId, {
      //   isPro: true,
      //   tier: currentSub.sku,
      //   expiresAt: currentSub.validUntil,
      //   autoRenewing: currentSub.autoRenewing
      // });
      return res.json({ success: true, isSubscribed: true, subscription: currentSub });
    } else {
      // await db.users.updateSubscription(userId, { isPro: false });
      return res.json({ success: true, isSubscribed: false });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
