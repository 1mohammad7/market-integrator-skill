const axios = require('axios');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * CafeBazaar Backend Service for REST API v2 & Dynamic Pricing JWT.
 */
class CafeBazaarService {
  /**
   * @param {Object} config
   * @param {string} config.packageName - App package name (e.g. "com.example.fitme")
   * @param {string} config.apiSecretToken - CAFEBAZAAR-PISHKHAN-API-SECRET token from developer console
   * @param {string} [config.dynamicPriceSecret] - Secret key for signing Dynamic Pricing JWTs
   */
  constructor({ packageName, apiSecretToken, dynamicPriceSecret }) {
    if (!packageName || !apiSecretToken) {
      throw new Error('CafeBazaarService requires packageName and apiSecretToken');
    }
    this.packageName = packageName;
    this.apiSecretToken = apiSecretToken;
    this.dynamicPriceSecret = dynamicPriceSecret;
    this.baseUrl = 'https://pardakht.cafebazaar.ir/devapi/v2/api';

    this.http = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'CAFEBAZAAR-PISHKHAN-API-SECRET': this.apiSecretToken,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
  }

  /**
   * Validates an In-App Purchase token against CafeBazaar servers.
   * @param {string} productId - SKU of the purchased item
   * @param {string} purchaseToken - Token returned by the client
   * @returns {Promise<{ isValid: boolean, isConsumed: boolean, isRefunded: boolean, purchaseTime: number, developerPayload: string, raw: Object }>}
   */
  async validateInAppPurchase(productId, purchaseToken) {
    try {
      const url = `/validate/${this.packageName}/inapp/${productId}/purchases/${purchaseToken}/`;
      const response = await this.http.get(url);
      const data = response.data;

      // purchaseState: 0 = OK, 1 = Refunded
      // consumptionState: 0 = Consumed, 1 = Unconsumed
      return {
        isValid: data.purchaseState === 0,
        isRefunded: data.purchaseState === 1,
        isConsumed: data.consumptionState === 0,
        purchaseTime: data.purchaseTime,
        developerPayload: data.developerPayload,
        raw: data
      };
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return {
          isValid: false,
          isRefunded: false,
          isConsumed: false,
          error: error.response.data?.error || 'not_found',
          errorDescription: error.response.data?.error_description || 'Purchase not found'
        };
      }
      throw error;
    }
  }

  /**
   * Consumes an In-App Purchase token on CafeBazaar servers.
   * @param {string} purchaseToken
   * @returns {Promise<boolean>}
   */
  async consumePurchase(purchaseToken) {
    try {
      const url = `/consume/${this.packageName}/purchases/`;
      await this.http.post(url, { token: purchaseToken });
      return true;
    } catch (error) {
      if (error.response) {
        const errData = error.response.data;
        throw new Error(`Failed to consume purchase: ${errData.error} (${errData.error_description})`);
      }
      throw error;
    }
  }

  /**
   * Checks the user's active subscriptions using any recent purchase/subscription token.
   * @param {string} purchaseToken - Any purchase token from the user
   * @returns {Promise<Array<{ sku: string, autoRenewing: boolean, validUntil: Date, isExpired: boolean, linkedToken: string }>>}
   */
  async getActiveSubscriptions(purchaseToken) {
    try {
      const url = `/applications/${this.packageName}/active-subscriptions/${purchaseToken}/`;
      const response = await this.http.get(url);
      const subs = response.data.subscriptions || [];

      const now = Date.now();
      return subs.map((sub) => ({
        sku: sub.sku,
        autoRenewing: sub.autoRenewing,
        initiationTime: new Date(sub.initiationTimestampMsec),
        validUntil: new Date(sub.validUntilTimestampMsec),
        isExpired: sub.validUntilTimestampMsec <= now,
        linkedToken: sub.linkedSubscriptionToken,
        raw: sub
      }));
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return []; // No active subscription found
      }
      throw error;
    }
  }

  /**
   * Checks status of a specific subscription.
   * @param {string} subscriptionSku
   * @param {string} purchaseToken
   */
  async getSubscriptionStatus(subscriptionSku, purchaseToken) {
    try {
      const url = `/applications/${this.packageName}/subscriptions/${subscriptionSku}/purchases/${purchaseToken}`;
      const response = await this.http.get(url);
      const data = response.data;
      const now = Date.now();

      return {
        autoRenewing: data.autoRenewing,
        validUntil: new Date(data.validUntilTimestampMsec),
        isExpired: data.validUntilTimestampMsec <= now,
        linkedToken: data.linkedSubscriptionToken,
        raw: data
      };
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Cancels subscription auto-renewal.
   * @param {string} subscriptionSku
   * @param {string} purchaseToken
   */
  async cancelSubscription(subscriptionSku, purchaseToken) {
    const url = `/applications/${this.packageName}/subscriptions/${subscriptionSku}/purchases/${purchaseToken}/cancel/`;
    const response = await this.http.post(url);
    return response.status === 200;
  }

  /**
   * Requests a refund for a purchase within 7 days.
   * @param {string} purchaseToken
   */
  async refundPurchase(purchaseToken) {
    const url = `/refund/${this.packageName}/purchases/${purchaseToken}/`;
    const response = await this.http.post(url);
    return response.data;
  }

  /**
   * Generates a signed Dynamic Pricing JWT token.
   * @param {Object} params
   * @param {number} params.priceInRials - Discounted price in Rials (must be <= registered console price)
   * @param {string} params.sku - Product SKU
   * @param {number} [params.expiresInSeconds=600] - Token expiration in seconds (default 10 mins)
   * @param {string} [params.accountId] - Optional Bazaar user account ID
   * @returns {string} Signed JWT token
   */
  generateDynamicPriceToken({ priceInRials, sku, expiresInSeconds = 600, accountId = null }) {
    if (!this.dynamicPriceSecret) {
      throw new Error('dynamicPriceSecret is required to generate dynamic pricing tokens');
    }

    const payload = {
      price: Math.floor(priceInRials),
      package_name: this.packageName,
      sku: sku,
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
      nonce: crypto.randomBytes(16).toString('hex')
    };

    if (accountId) {
      payload.account_id = accountId;
    }

    return jwt.sign(payload, this.dynamicPriceSecret, {
      algorithm: 'HS256',
      header: {
        typ: 'JWT',
        alg: 'HS256'
      }
    });
  }
}

module.exports = CafeBazaarService;
