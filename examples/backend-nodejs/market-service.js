/**
 * Unified Iranian Market Billing Backend Service (CafeBazaar & Myket)
 * 
 * Handles server-to-server purchase token validation and consumption for both
 * CafeBazaar Developer REST API v2 and Myket Developer Partner API.
 */

const crypto = require('crypto');

class MarketService {
  constructor(config = {}) {
    this.bazaarSecret = config.bazaarSecret || process.env.CAFEBAZAAR_PISHKHAN_API_SECRET;
    this.bazaarPackageName = config.bazaarPackageName || process.env.CAFEBAZAAR_PACKAGE_NAME;
    
    this.myketAccessToken = config.myketAccessToken || process.env.MYKET_ACCESS_TOKEN;
    this.myketPackageName = config.myketPackageName || process.env.MYKET_PACKAGE_NAME;

    this.bazaarBaseUrl = 'https://pardakht.cafebazaar.ir/devapi/v2/api';
    this.myketBaseUrl = 'https://developer.myket.ir/api/partners';
  }

  /**
   * Unified Verification Function
   * @param {Object} params
   * @param {'cafebazaar'|'myket'} params.store Target market
   * @param {string} params.sku Product SKU identifier
   * @param {string} params.token Purchase verification token
   * @param {string} [params.packageName] Optional override for app package name
   */
  async verifyPurchase({ store, sku, token, packageName }) {
    if (store === 'cafebazaar') {
      return await this.verifyCafeBazaarPurchase({ sku, token, packageName });
    } else if (store === 'myket') {
      return await this.verifyMyketPurchase({ sku, token, packageName });
    } else {
      throw new Error(`Unsupported market store: "${store}". Must be "cafebazaar" or "myket".`);
    }
  }

  /**
   * Unified Consumption Function
   * @param {Object} params
   * @param {'cafebazaar'|'myket'} params.store Target market
   * @param {string} params.sku Product SKU (required for Myket)
   * @param {string} params.token Purchase verification token
   * @param {string} [params.packageName] Optional override for app package name
   */
  async consumePurchase({ store, sku, token, packageName }) {
    if (store === 'cafebazaar') {
      return await this.consumeCafeBazaarPurchase({ token, packageName });
    } else if (store === 'myket') {
      return await this.consumeMyketPurchase({ sku, token, packageName });
    } else {
      throw new Error(`Unsupported market store: "${store}". Must be "cafebazaar" or "myket".`);
    }
  }

  // ---------------------------------------------------------------------------
  // CAFEBAZAAR REST API v2
  // ---------------------------------------------------------------------------

  async verifyCafeBazaarPurchase({ sku, token, packageName }) {
    const pkg = packageName || this.bazaarPackageName;
    if (!this.bazaarSecret) throw new Error('CAFEBAZAAR_PISHKHAN_API_SECRET is missing.');
    if (!pkg) throw new Error('Package name is missing for CafeBazaar.');

    const url = `${this.bazaarBaseUrl}/validate/${pkg}/inapp/${sku}/purchases/${token}/`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'CAFEBAZAAR-PISHKHAN-API-SECRET': this.bazaarSecret,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`CafeBazaar verification failed [HTTP ${response.status}]: ${errText}`);
    }

    const data = await response.json();
    return {
      isValid: data.purchaseState === 0,
      store: 'cafebazaar',
      sku,
      token,
      purchaseTime: data.purchaseTime,
      developerPayload: data.developerPayload || '',
      isConsumed: data.consumptionState === 0,
      raw: data
    };
  }

  async consumeCafeBazaarPurchase({ token, packageName }) {
    const pkg = packageName || this.bazaarPackageName;
    const url = `${this.bazaarBaseUrl}/consume/${pkg}/purchases/`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'CAFEBAZAAR-PISHKHAN-API-SECRET': this.bazaarSecret,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`CafeBazaar consumption failed [HTTP ${response.status}]: ${errText}`);
    }

    return true;
  }

  // ---------------------------------------------------------------------------
  // MYKET PARTNER REST API
  // ---------------------------------------------------------------------------

  async verifyMyketPurchase({ sku, token, packageName }) {
    const pkg = packageName || this.myketPackageName;
    if (!this.myketAccessToken) throw new Error('MYKET_ACCESS_TOKEN is missing.');
    if (!pkg) throw new Error('Package name is missing for Myket.');

    const url = `${this.myketBaseUrl}/applications/${pkg}/purchases/products/${sku}/verify`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Access-Token': this.myketAccessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tokenId: token })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Myket verification failed [HTTP ${response.status}]: ${errText}`);
    }

    const data = await response.json();
    return {
      isValid: data.purchaseState === 0,
      store: 'myket',
      sku,
      token,
      purchaseTime: data.purchaseTime,
      developerPayload: data.developerPayload || '',
      isConsumed: data.consumptionState === 0,
      raw: data
    };
  }

  async consumeMyketPurchase({ sku, token, packageName }) {
    const pkg = packageName || this.myketPackageName;
    const url = `${this.myketBaseUrl}/applications/${pkg}/purchases/products/${sku}/consume`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Access-Token': this.myketAccessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tokenId: token })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Myket consumption failed [HTTP ${response.status}]: ${errText}`);
    }

    return true;
  }

  // ---------------------------------------------------------------------------
  // SECURITY: REPLAY PROTECTION & DEVELOPER PAYLOAD
  // ---------------------------------------------------------------------------

  /**
   * Generates a tamper-proof cryptographic developer payload
   * @param {string} userId Unique user id in your database
   * @param {string} secret App internal HMAC secret key
   */
  generatePayload(userId, secret = process.env.PAYLOAD_SECRET || 'secret') {
    const timestamp = Date.now();
    const raw = `${userId}:${timestamp}`;
    const hmac = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    return `${raw}:${hmac}`;
  }

  /**
   * Verifies that developerPayload matches the current user session
   */
  verifyPayload(payload, userId, secret = process.env.PAYLOAD_SECRET || 'secret', maxAgeMs = 24 * 3600 * 1000) {
    if (!payload || !payload.includes(':')) return false;
    const parts = payload.split(':');
    if (parts.length !== 3) return false;

    const [pUserId, pTimestamp, pHmac] = parts;
    if (pUserId !== String(userId)) return false;

    const age = Date.now() - parseInt(pTimestamp, 10);
    if (age > maxAgeMs) return false;

    const expectedHmac = crypto.createHmac('sha256', secret).update(`${pUserId}:${pTimestamp}`).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(pHmac), Buffer.from(expectedHmac));
  }
}

module.exports = MarketService;
