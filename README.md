# CafeBazaar Integrator Skill (پرداخت درون‌برنامه‌ای بازار)

[![Antigravity Skill](https://img.shields.io/badge/Antigravity-Skill-blueviolet.svg)](#)
[![CafeBazaar API](https://img.shields.io/badge/CafeBazaar-REST%20API%20v2-22c55e.svg)](https://developers.cafebazaar.ir/)
[![Poolakey SDK](https://img.shields.io/badge/Poolakey-v2.2.0-blue.svg)](https://github.com/cafebazaar/Poolakey)
[![Platforms](https://img.shields.io/badge/Platforms-Android%20%7C%20Unity%20%7C%20Node.js%20%7C%20Python-orange.svg)](#)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An end-to-end integration guide, boilerplate library, and specialized AI Agent skill for implementing **CafeBazaar In-App Billing (IAB)**, **Poolakey SDK**, **Developer REST API v2**, **Dynamic Pricing (تخفیف پویا)**, and **SnappPay BNPL (خرید اعتباری اسنپ‌پی)** in modern Android (Kotlin), Unity, and backend applications (Node.js & Python).

---

## 📖 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Monetization & Product Types](#monetization--product-types)
- [Repository Structure](#repository-structure)
- [Quick Start](#quick-start)
  - [1. Using as an Antigravity / Agent Skill](#1-using-as-an-antigravity--agent-skill)
  - [2. Android Kotlin (Poolakey 2.2+)](#2-android-kotlin-poolakey-22)
  - [3. Backend REST API v2 (Node.js)](#3-backend-rest-api-v2-nodejs)
  - [4. Backend REST API v2 (Python FastAPI)](#4-backend-rest-api-v2-python-fastapi)
  - [5. Dynamic Pricing JWT (تخفیف پویا)](#5-dynamic-pricing-jwt-تخفیف-پویا)
  - [6. SnappPay BNPL (خرید اعتباری اسنپ‌پی)](#6-snapppay-bnpl-خرید-اعتباری-اسنپ‌پی)
- [Security & Anti-Fraud Best Practices](#security--anti-fraud-best-practices)
- [Diagnostic & Error Codes](#diagnostic--error-codes)
- [Common Pitfalls & FAQs](#common-pitfalls--faqs)
- [References & Documentation](#references--documentation)

---

## Overview

Integrating in-app payments in Iran through CafeBazaar requires orchestrating client-side AIDL communication via Poolakey SDK, securing server-side receipt validation through CafeBazaar Developer REST API v2, managing auto-renewing subscriptions, generating cryptographically signed Dynamic Pricing JWT tokens, and handling BNPL installment flows via SnappPay.

This repository serves two purposes:
1. **Production-Ready Codebase:** Tested boilerplates for Android Kotlin, Unity C#, Node.js Express, and Python FastAPI.
2. **AI Skill Specification:** A ready-to-load skill (`SKILL.md`) for Antigravity and AI coding agents to autonomously design, implement, and debug CafeBazaar billing flows.

---

## Architecture

CafeBazaar IAB employs an Inter-Process Communication (AIDL) model on Android: the client application connects to the local CafeBazaar app, which interfaces with bank payment gateways and CafeBazaar billing servers. Entitlements and receipts are then verified out-of-band by your secure backend server.

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT DEVICE                                     |
|                                                                                   |
|   +--------------------------+               +--------------------------------+   |
|   |   Your Android App       |   IPC (AIDL)  |      CafeBazaar App            |   |
|   |  (Poolakey / BillingRepo)| <===========> |    (Payment Flow & Wallet)     |   |
|   +--------------------------+               +--------------------------------+   |
|                 |                                             |                   |
+-----------------|---------------------------------------------|-------------------+
                  | HTTPS (Receipt Token & Payload)             | HTTPS (Bazaar Internal)
                  v                                             v
+------------------------------------+         +------------------------------------+
|        Your Backend Server         |  REST   |      CafeBazaar Servers            |
|   - Purchase Token Validation      | ======> |  - https://pardakht.cafebazaar.ir  |
|   - Dynamic Pricing JWT Signer     | (API v2)|  - Payment settlement & receipts   |
|   - Entitlement Provisioning       |         |                                    |
+------------------------------------+         +------------------------------------+
```

---

## Monetization & Product Types

| Product Type | Persian Term | Multi-Purchase? | Must Consume? | Reinstall Persistence | Common Examples |
|:---|:---|:---:|:---:|:---:|:---|
| **Consumable** | محصولات مصرفی | ✅ Unlimited | ✅ **Mandatory** (`consumePurchase`) | ❌ No (consumed immediately) | Coins, gems, credits, hints |
| **Non-Consumable** | محصولات غیرمصرفی | ❌ Once / account | ❌ **Never consume** | ✅ Yes (`getPurchasedProducts`) | Remove Ads, Lifetime Pro |
| **Subscription** | اشتراک دوره‌ای | ❌ 1 active plan / app | ❌ Cannot consume | ✅ Yes (during valid period) | 30/60/90/180/365-day access |
| **Free Trial** | اشتراک آزمایشی | ❌ Once in user lifetime | ❌ Cannot consume | ✅ Converts to paid | 1 to 30 days trial period |

> [!IMPORTANT]
> **Consumable Consumption Rule:** Unconsumed items remain registered as owned by the user. If you do not consume a consumable item after granting it, any subsequent purchase attempt will fail with error `BILLING_RESPONSE_RESULT_ITEM_ALREADY_OWNED (7)`.

---

## Repository Structure

```
.
├── SKILL.md                                 # Complete Agent Skill Definition & Workflow Guide
├── README.md                                # Project overview and developer reference
├── examples/                                # Production-ready code implementations
│   ├── android-kotlin/
│   │   ├── BillingRepository.kt             # Coroutine Flow & Lifecycle-aware Poolakey wrapper
│   │   └── build.gradle.kts                 # Gradle dependencies & Proguard keep rules
│   ├── backend-nodejs/
│   │   ├── cafebazaar-service.js            # Node.js service for REST API v2 & Dynamic Pricing JWT
│   │   └── server-routes-example.js         # Express.js endpoints for purchase validation
│   ├── backend-python/
│   │   └── cafebazaar_service.py            # Python / FastAPI service with RSA & JWT verification
│   └── unity/
│       └── BazaarBillingManager.cs          # Unity C# billing bridge script
└── references/                              # In-depth technical specifications
    ├── dynamic-pricing-jwt.md               # Dynamic Pricing claims, signatures & error map (1-16)
    ├── iab-concepts-and-products.md         # Product lifecycle, 5-min test subscriptions & upgrades
    ├── poolakey-android-guide.md            # Android SDK integration, queries & AIDL error table
    ├── security-anti-fraud.md               # Server-side validation, payload signing & replay defense
    ├── server-rest-api-v2.md                # Developer REST API v2 endpoints, curl & payloads
    ├── snapppay-bnpl.md                     # SnappPay BNPL overview, VAT & payout calculations
    └── troubleshooting-and-faqs.md          # Comprehensive FAQ & diagnostic solutions
```

---

## Quick Start

### 1. Using as an Antigravity / Agent Skill

To enable your coding assistant to use this skill, ensure the directory is registered in your skills path:
- **Project-level:** `<your_project>/.agents/skills/cafebazaar-integrator/`
- **User-level:** `~/.gemini/config/skills/cafebazaar-integrator/`

The agent automatically consults [`SKILL.md`](SKILL.md) and the [`references/`](references/) directory when tasked with CafeBazaar billing integrations.

---

### 2. Android Kotlin (Poolakey 2.2+)

#### Gradle Configuration

In your `settings.gradle` or root `build.gradle.kts`:
```kotlin
repositories {
    google()
    mavenCentral()
    maven { url = uri("https://jitpack.io") }
}
```

In your module `build.gradle.kts`:
```kotlin
dependencies {
    implementation("com.github.cafebazaar.Poolakey:poolakey:2.2.0")
}
```

#### Proguard Keep Rules (`proguard-rules.pro`)
```proguard
-keep class com.android.vending.billing.** { *; }
-keep class com.github.cafebazaar.poolakey.** { *; }
```

#### Purchase Flow Snippet
Use [`BillingRepository.kt`](examples/android-kotlin/BillingRepository.kt) for a clean coroutine flow implementation:

```kotlin
val billingRepo = BillingRepository(context, rsaPublicKey = "YOUR_BAZAAR_RSA_PUBLIC_KEY")

// 1. Connect on startup
lifecycleScope.launch {
    billingRepo.connect().onSuccess {
        Log.d("Billing", "Connected to CafeBazaar")
    }
}

// 2. Launch purchase
billingRepo.purchase(
    activityResultRegistry = activityResultRegistry,
    productId = "gold_coin_100",
    developerPayload = "secure_user_nonce"
).collect { state ->
    when (state) {
        is BillingPurchaseState.Loading -> showProgress()
        is BillingPurchaseState.Success -> sendTokenToBackend(state.purchaseEntity.purchaseToken)
        is BillingPurchaseState.Canceled -> showUserCanceled()
        is BillingPurchaseState.Failed -> showError(state.throwable)
    }
}
```

---

### 3. Backend REST API v2 (Node.js)

All calls to CafeBazaar REST API v2 require your publisher secret header:
```http
CAFEBAZAAR-PISHKHAN-API-SECRET: <YOUR_API_TOKEN_FROM_BAZAAR_PANEL>
```

Using [`cafebazaar-service.js`](examples/backend-nodejs/cafebazaar-service.js):

```javascript
const CafeBazaarService = require('./examples/backend-nodejs/cafebazaar-service');

const bazaar = new CafeBazaarService({
  packageName: 'com.example.app',
  apiSecretToken: process.env.BAZAAR_PISHKHAN_API_SECRET,
  dynamicPriceSecret: process.env.BAZAAR_DYNAMIC_PRICE_SECRET
});

// Validate purchase token
const result = await bazaar.validateInAppPurchase('coins_100', purchaseToken);
if (result.isValid && !result.isRefunded) {
  // Grant coins to user in DB
  await grantUserCoins(userId, 100);

  // Consume token if it is a consumable
  await bazaar.consumePurchase(purchaseToken);
}
```

---

### 4. Backend REST API v2 (Python FastAPI)

Using [`cafebazaar_service.py`](examples/backend-python/cafebazaar_service.py):

```python
from examples.backend_python.cafebazaar_service import CafeBazaarService

bazaar = CafeBazaarService(
    package_name="com.example.app",
    api_secret_token="YOUR_BAZAAR_PISHKHAN_API_SECRET",
    dynamic_price_secret="YOUR_DYNAMIC_PRICE_SECRET"
)

# Validate purchase
validation = bazaar.validate_inapp_purchase(product_id="coins_100", purchase_token="TOKEN_XYZ")
if validation.get("is_valid") and not validation.get("is_refunded"):
    # 1. Credit balance in DB
    # 2. Consume if consumable:
    bazaar.consume_purchase("TOKEN_XYZ")
```

---

### 5. Dynamic Pricing JWT (تخفیف پویا)

Dynamic Pricing lets you sell an SKU at a reduced price (e.g. customized discounts or flash sales) without creating duplicate products in the Developer Console.

1. Generate a signed JWT on your backend (**never on mobile**):
```javascript
const dynamicToken = bazaar.generateDynamicPriceToken({
  priceInRials: 500000,          // 50,000 Tomans
  sku: 'diamond_pack_1',
  expiresInSeconds: 600,         // 10 minutes
  accountId: userBazaarAccountId // optional
});
```

2. Pass `dynamicPriceToken` into `PurchaseRequest` on Android:
```kotlin
val request = PurchaseRequest(
    productId = "diamond_pack_1",
    payload = "user_123",
    dynamicPriceToken = dynamicToken
)
payment.purchaseProduct(registry, request) { ... }
```

Detailed claims, algorithms (`HS256/384/512`), and error code table (1–16) are documented in [`references/dynamic-pricing-jwt.md`](references/dynamic-pricing-jwt.md).

---

### 6. SnappPay BNPL (خرید اعتباری اسنپ‌پی)

- **Default Activation:** Enabled automatically for in-app billing transactions $\ge$ 20,000 Tomans (200,000 Rials).
- **Zero Client Code Changes:** The CafeBazaar checkout dialog automatically presents SnappPay installment options to eligible users.
- **User Cost:** 0% interest or surcharge to the end user.
- **Payment Types:**
  - **Single Installment (تک قسط):** User pays next month.
  - **Four Installments (چهار قسط):** User pays over 4 monthly installments.

#### Payout & Fee Structure (Sample 1,000,000 Tomans Item):
$$\text{SnappPay Fee (inc. 10\% VAT)} = \text{Product Price} \times \text{Fee Rate} \times 1.10$$

| Mode | Base Fee | With 10% VAT | Net Base Amount | Bazaar (15% Tier) | Dev Payout (85% Tier) | Bazaar (30% Tier) | Dev Payout (70% Tier) |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **1 Installment** | 4.5% | 49,500 T | 950,500 T | 128,318 T | **727,133 T** | 256,635 T | **598,815 T** |
| **4 Installments** | 9.0% | 99,000 T | 901,000 T | 121,635 T | **689,265 T** | 243,270 T | **567,630 T** |

Full settlement schedules and VAT details: [`references/snapppay-bnpl.md`](references/snapppay-bnpl.md).

---

## Security & Anti-Fraud Best Practices

1. **Mandatory Server Validation:** Never fulfill purchases directly from on-device callbacks (`purchaseSucceed`). A compromised APK can spoof billing responses. Always verify `purchaseToken` against REST API v2.
2. **Cryptographic `developerPayload`:** Bind every purchase request to a user ID via a hashed payload (`HMAC-SHA256(userId + timestamp, serverSecret)`). Confirm this payload in the API response before crediting items.
3. **Replay Attack Defense:** Store `purchaseToken` and JWT `nonce` values in a unique database index. Reject any token that has already been fulfilled.
4. **App Startup Reconciliation:** Call `getPurchasedProducts()` on every application launch to recover purchases interrupted by network failures or crashes before consumption.
5. **No Embedded Secrets:** Never bundle `CAFEBAZAAR-PISHKHAN-API-SECRET` or your Dynamic Pricing secret inside the client APK.

For threat models and RSA verification, see [`references/security-anti-fraud.md`](references/security-anti-fraud.md).

---

## Diagnostic & Error Codes

### Client AIDL Response Codes
| Code | Constant | Meaning & Recommended Action |
|:---:|:---|:---|
| `0` | `BILLING_RESPONSE_RESULT_OK` | Success. |
| `1` | `BILLING_RESPONSE_RESULT_USER_CANCELED` | User exited checkout dialog or cancelled payment. |
| `3` | `BILLING_RESPONSE_RESULT_BILLING_UNAVAILABLE` | CafeBazaar app is outdated or billing service is disabled. |
| `4` | `BILLING_RESPONSE_RESULT_ITEM_UNAVAILABLE` | SKU does not exist in Developer Console or is set to inactive. |
| `5` | `BILLING_RESPONSE_RESULT_DEVELOPER_ERROR` | Manifest missing billing permission, wrong signature, or invalid parameters. |
| `6` | `BILLING_RESPONSE_RESULT_ERROR` | Internal error or bank gateway timeout. |
| `7` | `BILLING_RESPONSE_RESULT_ITEM_ALREADY_OWNED` | Consumable item was not consumed. Must consume before re-purchasing. |
| `8` | `BILLING_RESPONSE_RESULT_ITEM_NOT_OWNED` | Attempted to consume an item not owned by this account. |

### Dynamic Pricing JWT Errors
| Code | Error Description | Solution |
|:---:|:---|:---|
| `2` | Malformed JWT | Verify 3-part base64url structure (`header.payload.signature`). |
| `3` | Unsupported algorithm | Use `HS256`, `HS384`, or `HS512`. |
| `4` | Signature mismatch | Ensure JWT secret matches the key configured in Bazaar Developer Console. |
| `5` | Token expired | Increase token lifetime or regenerate before opening checkout dialog. |
| `6` | Missing mandatory claim | Check presence of `price`, `package_name`, `sku`, and `exp`. |
| `10` | Discount price > panel price | `price` (in Rials) must be strictly $\le$ base price registered in console. |
| `11` | Token already used | Dynamic pricing tokens are single-use; ensure unique `nonce` per transaction. |

---

## Common Pitfalls & FAQs

### Q: Why does the purchase fail with `ITEM_ALREADY_OWNED (7)`?
**Cause:** A previous consumable purchase completed payment, but your app or server failed to call `consumeProduct` / `POST /consume/`.  
**Fix:** Run `queryPurchases` on app launch, validate unconsumed tokens with your backend, and consume them immediately.

### Q: How do I test recurring subscriptions without waiting 30 days?
**Solution:** Configure a **5-Minute Test Subscription** in the CafeBazaar Developer Console. In test mode, subscriptions renew every 5 minutes and auto-expire after 6 renewal cycles (30 minutes total).

### Q: Can a user have multiple active subscriptions?
**No.** CafeBazaar enforces a **single active subscription per app** policy. Upgrading to a new tier immediately replaces the active tier and preserves/extends remaining days according to Bazaar subscription rules.

### Q: What is the Developer REST API v2 rate limit?
CafeBazaar permits up to **50,000 requests/day per developer account**. Cache active subscription status on your backend and re-verify only when subscription tokens near expiration.

---

## References & Documentation

- [CafeBazaar Developer Portal](https://developers.cafebazaar.ir/)
- [CafeBazaar In-App Billing Documentation](https://developers.cafebazaar.ir/fa/docs/iab/)
- [Poolakey Android SDK GitHub Repository](https://github.com/cafebazaar/Poolakey)
- [In-Depth Skill References](references/)
  - [IAB Concepts & Lifecycles](references/iab-concepts-and-products.md)
  - [Poolakey Android Guide](references/poolakey-android-guide.md)
  - [Server REST API v2 Reference](references/server-rest-api-v2.md)
  - [Dynamic Pricing JWT Guide](references/dynamic-pricing-jwt.md)
  - [SnappPay BNPL Integration](references/snapppay-bnpl.md)
  - [Security & Anti-Fraud Guide](references/security-anti-fraud.md)
  - [Troubleshooting & FAQs](references/troubleshooting-and-faqs.md)

---

## License

This project and skill toolkit are released under the [MIT License](LICENSE).
