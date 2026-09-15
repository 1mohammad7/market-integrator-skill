---
name: cafebazaar-integrator
description: Complete end-to-end integration guide and toolkit for CafeBazaar In-App Billing (IAB), Poolakey SDK (Kotlin & Unity), Developer REST API v2, Subscriptions, Dynamic Pricing JWT, SnappPay BNPL, and Server-Side Security Verification.
---

# CafeBazaar Integrator (پرداخت درون‌برنامه‌ای بازار)

Comprehensive expert skill for integrating CafeBazaar In-App Billing (IAB) into Android applications (Kotlin/Java, Unity) and backend services (Node.js, Python, Go, Java). Covers the full lifecycle of digital product monetization: Consumables, Non-Consumables, Auto-Renewing Subscriptions, Free Trials, Server-Signed Dynamic Pricing (JWT), SnappPay BNPL (Buy Now Pay Later), and Server-Side REST API v2 validation.

---

## Table of Contents

1. [Architecture & Core Concepts](#architecture--core-concepts)
2. [Product Types & Monetization Matrix](#product-types--monetization-matrix)
3. [Integration Workflows](#integration-workflows)
   - [Consumable Purchase & Consumption](#1-consumable-flow-coins-credits-gems)
   - [Non-Consumable Flow](#2-non-consumable-flow-remove-ads-pro-unlock)
   - [Auto-Renewing Subscriptions & Free Trial](#3-subscription-flow-monthly--yearly)
   - [Dynamic Pricing (تخفیف پویا) with JWT](#4-dynamic-pricing-flow-jwt)
   - [SnappPay BNPL (خرید اعتباری اسنپ‌پی)](#5-snapppay-bnpl-overview)
4. [Client SDK Integration (Poolakey)](#client-sdk-integration-poolakey)
5. [Backend Server REST API v2](#backend-server-rest-api-v2)
6. [Security, Verification & Anti-Fraud](#security-verification--anti-fraud)
7. [Error Handling & Diagnostic Reference](#error-handling--diagnostic-reference)
8. [Skill Resource Index](#skill-resource-index)

---

## Architecture & Core Concepts

CafeBazaar In-App Billing utilizes an IPC (Inter-Process Communication) model via Android AIDL (`IInAppBillingService.aidl`). The client application communicates directly with the local CafeBazaar client app, which handles secure network transactions with CafeBazaar servers, UI dialogs, bank gateways, and wallet deductions.

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT DEVICE                                     |
|                                                                                   |
|   +--------------------------+               +--------------------------------+   |
|   |   Your Android App       |   IPC (AIDL)  |      CafeBazaar App            |   |
|   |  (Poolakey / BillingCore)| <===========> |    (Payment Flow & Wallet)     |   |
|   +--------------------------+               +--------------------------------+   |
|                 |                                             |                   |
+-----------------|---------------------------------------------|-------------------+
                  | HTTPS (Receipt / Token)                     | HTTPS (Bazaar Internal)
                  v                                             v
+------------------------------------+         +------------------------------------+
|        Your Backend Server         |  REST   |      CafeBazaar Servers            |
|   - Purchase Validation            | ======> |  - https://pardakht.cafebazaar.ir  |
|   - Dynamic Price JWT Generation   | (API v2)|  - Payment settlement & receipt db |
|   - Content Provisioning           |         |                                    |
+------------------------------------+         +------------------------------------+
```

### Key Rules:
1. **Digital Only:** IAB is strictly for digital goods and services delivered inside the app. Physical products and real-world services are prohibited.
2. **Device Compatibility:** Android 2.3+ (API 9+) with CafeBazaar client app installed (covers >90% active devices in Iran).
3. **No Direct Client-to-Bazaar Server Calls:** The mobile client never makes direct HTTP requests to Bazaar billing servers; all client communication is mediated by the CafeBazaar app.
4. **Server Validation Mandatory:** Never grant digital goods solely based on on-device callbacks. Validate the purchase token against CafeBazaar Developer REST API v2 from your secure backend.

---

## Product Types & Monetization Matrix

| Product Type | Persian Term | Multi-Purchase? | Must Consume? | Persists Across Reinstalls? | Examples |
|---|---|---|---|---|---|
| **Consumable** | محصولات مصرفی | Yes (Unlimited) | **Yes** (`consumePurchase`) | No (consumed immediately) | Coins, gems, fuels, credits, extra lives |
| **Non-Consumable** | محصولات غیرمصرفی | No (Once per account) | **No** (Never consume!) | **Yes** (`getPurchases`) | Remove Ads, Lifetime Pro, Full Version Unlock |
| **Subscription** | اشتراک دوره‌ای | 1 Active per app | **No** (Cannot consume) | **Yes** (during valid period) | 30/60/90/180/365-day access, VIP club |
| **Trial Subscription** | اشتراک آزمایشی | Once per user lifetime | **No** | **Yes** (converts to paid) | 1 to 30 days free trial for new subscribers |

---

## Integration Workflows

### 1. Consumable Flow (Coins, Credits, Gems)

```
[User Clicks Buy] -> [Poolakey: purchaseProduct]
      |
      v
[CafeBazaar Dialog Opens -> User Pays]
      |
      v
[purchaseSucceed callback -> Obtain PurchaseEntity & purchaseToken]
      |
      v
[Send purchaseToken to Backend Server]
      |
      v
[Backend: GET /devapi/v2/api/validate/... -> Verify purchaseState == 0]
      |
      v
[Backend or Client: POST /devapi/v2/api/consume/... -> Consume token]
      |
      v
[Backend increments user coins in database & returns success to client]
```

> [!IMPORTANT]
> Always consume consumable purchases after fulfillment! If an item is unconsumed, CafeBazaar flags the user as the current owner and blocks subsequent purchase attempts with `BILLING_RESPONSE_RESULT_ITEM_ALREADY_OWNED (7)`.
> 
> **App Startup Sync:** On every app launch, query `getPurchasedProducts()`. If unconsumed consumables exist (e.g. user paid but app crashed before consumption), validate and consume them immediately.

---

### 2. Non-Consumable Flow (Remove Ads, Pro Unlock)

1. Check current ownership on startup via `payment.getPurchasedProducts { ... }` or backend server query.
2. If owned (`purchaseState == 0`), unlock features.
3. If user purchases, receive `purchaseSucceed`, validate token on backend, store entitlement in backend DB.
4. **NEVER call `consumeProduct` on non-consumables!**

---

### 3. Subscription Flow (Monthly / Yearly)

1. **Periods:** 30, 60, 90, 180, 365 days (plus 5-minute test subscriptions for development).
2. **Single Active Subscription Rule:** Each user account can only hold **one** active subscription per application at a time.
   - If a user upgrades (e.g., Silver to Gold), the new subscription activates immediately and remaining duration is preserved/extended according to policy.
3. **Auto-Renewal & Low Wallet Balance Notifications:**
   - Auto-renewed automatically from the user's CafeBazaar wallet.
   - If wallet balance is insufficient, CafeBazaar sends SMS reminders to the user at **5 days, 3 days, and 1 day** prior to expiration.
4. **Free Trial (اشتراک آزمایشی):**
   - Duration: 1 to 30 days.
   - Eligibility: Only users who have **never** previously subscribed to any plan in the app are eligible (checked via `checkTrialSubscription`).
   - Each user can only claim a free trial **once in a lifetime**.
5. **App Startup Verification:**
   - Call `getSubscribedProducts()` or verify with backend API `/active-subscriptions/<token>/` on **every app launch** to catch cancellations, wallet expirations, price changes, or refunds.

---

### 4. Dynamic Pricing Flow (تخفیف پویا - JWT)

Dynamic pricing allows selling an existing SKU at a discounted price (e.g. for promotions, user segmentation, flash sales) without creating duplicate SKUs in the console.

```
[Client requests discount] ---> [Your Backend Server]
                                       |
                                       v
                     [Generates & Signs JWT (HS256/384/512)]
                     Claims: price, package_name, sku, exp, nonce
                                       |
                                       v
[Client receives JWT] <----------------+
      |
      v
[Poolakey: PurchaseRequest(productId, dynamicPriceToken = jwtToken)]
      |
      v
[CafeBazaar App verifies JWT signature against Developer Console Secret]
      |
      v
[User pays discounted price]
```

#### JWT Claims Specification:
| Claim | Type | Required? | Description |
|---|---|---|---|
| `price` | Number | **Yes** | Discounted price in **Rials** (must be <= registered SKU price in panel). |
| `package_name` | String | **Yes** | Application package name (e.g., `com.example.app`). |
| `sku` | String | **Yes** | Product SKU identifier. |
| `exp` | Number | **Yes** | Expiration Unix Timestamp in UTC seconds. |
| `account_id` | String | Optional | CafeBazaar unique account ID (if using Login with Bazaar). |
| `nonce` | String | Optional | Cryptographically random unique string to prevent replay attacks. |

> [!CAUTION]
> - Never sign or store the Dynamic Pricing Secret key on the mobile client! JWTs must be generated strictly on your backend.
> - On subscriptions, the dynamic discount applies **only to the initial billing cycle**. Subsequent automatic renewals bill at the regular panel price.
> - Minimum CafeBazaar client version required: `13.3.0+`.

---

### 5. SnappPay BNPL (خرید اعتباری اسنپ‌پی)

- **Default Activation:** Automatically enabled on CafeBazaar for all apps using IAB for purchases over **20,000 Tomans (200,000 Rials)**.
- **Zero Client / SDK Changes:** Transparent to the app code. Handled entirely inside CafeBazaar checkout dialog.
- **End-User Cost:** 0% interest or extra charge to the user.
- **Payment Options:**
  1. **Single Installment (تک قسط):** User pays next month.
  2. **Four Installments (چهار قسط):** User pays across 4 monthly installments.

#### Commission & Payout Calculation Formula (1,000,000 Tomans Example):

$$\text{SnappPay Fee (inc. 10\% VAT)} = \text{Product Price} \times \text{Rate} \times 1.10$$

| Payment Mode | Base Fee Rate | With 10% VAT | Net Base Amount | 10% General VAT | Bazaar Share (15% tier) | Developer Payout (85% tier) | Bazaar Share (30% tier) | Developer Payout (70% tier) |
|---|---|---|---|---|---|---|---|---|
| **1 Installment** | 4.5% | 49,500 T | 950,500 T | 95,050 T | 128,318 T | **727,133 T** | 256,635 T | **598,815 T** |
| **4 Installments** | 9.0% | 99,000 T | 901,000 T | 90,100 T | 121,635 T | **689,265 T** | 243,270 T | **567,630 T** |

*Note: Settleable funds are automatically credited to the developer's CafeBazaar balance under standard payout schedules.*

---

## Client SDK Integration (Poolakey)

### 1. Gradle Setup

```groovy
// In project-level build.gradle or settings.gradle
repositories {
    google()
    mavenCentral()
    maven { url 'https://jitpack.io' }
}

// In app-level build.gradle
dependencies {
    implementation 'com.github.cafebazaar.Poolakey:poolakey:2.2.0' // Use latest release
}
```

### 2. Proguard / R8 Configuration

Add the following keep rules to `proguard-rules.pro`:
```proguard
# Keep In-App Billing AIDL interface
-keep class com.android.vending.billing.** { *; }
-keep class com.github.cafebazaar.poolakey.** { *; }
```

### 3. Complete Kotlin Manager

See full boilerplate in [`examples/android-kotlin/BillingRepository.kt`](references/poolakey-android-guide.md).

```kotlin
class BillingManager(private val context: Context, private val activityResultRegistry: ActivityResultRegistry) {
    private val securityCheck = SecurityCheck.Enable(rsaPublicKey = "YOUR_BAZAAR_RSA_PUBLIC_KEY")
    private val paymentConfig = PaymentConfiguration(localSecurityCheck = securityCheck)
    private val payment = Payment(context = context, config = paymentConfig)
    private var paymentConnection: PaymentConnection? = null

    fun connect(onConnected: () -> Unit, onFailed: (Throwable) -> Unit) {
        paymentConnection = payment.connect {
            connectionSucceed { onConnected() }
            connectionFailed { throwable -> onFailed(throwable) }
            disconnected { /* Handle disconnect/reconnect */ }
        }
    }

    fun buyProduct(sku: String, payload: String, dynamicToken: String? = null, onResult: (Result<PurchaseEntity>) -> Unit) {
        val request = PurchaseRequest(
            productId = sku,
            payload = payload,
            dynamicPriceToken = dynamicToken
        )
        payment.purchaseProduct(
            registry = activityResultRegistry,
            request = request
        ) {
            purchaseFlowBegan { /* UI loader */ }
            failedToBeginFlow { throwable -> onResult(Result.failure(throwable)) }
            purchaseSucceed { entity -> onResult(Result.success(entity)) }
            purchaseCanceled { onResult(Result.failure(Exception("USER_CANCELED"))) }
            purchaseFailed { throwable -> onResult(Result.failure(throwable)) }
        }
    }

    fun consume(token: String, onComplete: (Boolean) -> Unit) {
        payment.consumeProduct(token) {
            consumeSucceed { onComplete(true) }
            consumeFailed { onComplete(false) }
        }
    }

    fun onDestroy() {
        paymentConnection?.disconnect()
    }
}
```

---

## Backend Server REST API v2

All server API requests require the header:
```http
CAFEBAZAAR-PISHKHAN-API-SECRET: <YOUR_API_TOKEN_FROM_PANEL>
```
*Generated from: CafeBazaar Console -> Application -> API پیشخان بازار (must be created from Publisher account).*
*Rate Limit: 50,000 requests/day per developer.*

### 1. Validate In-App Purchase
`GET https://pardakht.cafebazaar.ir/devapi/v2/api/validate/<package_name>/inapp/<product_id>/purchases/<purchase_token>/`

**Response (200 OK):**
```json
{
   "consumptionState": 1,
   "purchaseState": 0,
   "kind": "androidpublisher#inappPurchase",
   "developerPayload": "user_id_98234",
   "purchaseTime": 1740236400000
}
```
- `purchaseState`: `0` = Valid purchase, `1` = Refunded.
- `consumptionState`: `0` = Consumed, `1` = Unconsumed.

### 2. Consume Purchase (Server-Side)
`POST https://pardakht.cafebazaar.ir/devapi/v2/api/consume/<package_name>/purchases/`  
**Body:** `{"token": "<purchase_token>"}`

### 3. Check Active Subscriptions
`GET https://pardakht.cafebazaar.ir/devapi/v2/api/applications/<package_name>/active-subscriptions/<token>/`

**Response (200 OK):**
```json
{
  "subscriptions": [
    {
      "kind": "androidpublisher#subscriptionPurchase",
      "initiationTimestampMsec": 1740236400000,
      "validUntilTimestampMsec": 1742828400000,
      "autoRenewing": true,
      "linkedSubscriptionToken": "sub_token_xyz",
      "sku": "vip_monthly"
    }
  ]
}
```
*Always verify: `validUntilTimestampMsec > System.currentTimeMillis()`.*

### 4. Cancel Subscription
`GET/POST https://pardakht.cafebazaar.ir/devapi/v2/api/applications/<package_name>/subscriptions/<subscription_id>/purchases/<purchase_token>/cancel/`

### 5. Refund Purchase (Within 7 Days)
`POST https://pardakht.cafebazaar.ir/devapi/v2/api/refund/<package_name>/purchases/<purchase_token>/`

---

## Security, Verification & Anti-Fraud

1. **Payload User Binding:** Always send a cryptographic `developerPayload` (e.g. `HMAC(userId + timestamp, secret)`) with every purchase request and verify it on your backend before fulfilling the order.
2. **Server-Side Token Validation:** Do not trust client-side claims. Query the CafeBazaar REST API v2 from your backend server to confirm `purchaseState == 0`.
3. **Prevent Replay Attacks:** Store used `purchaseToken` values and JWT `nonce` values in a unique database index. Reject any duplicate attempts.
4. **Obfuscation:** Obfuscate your Android code using Proguard/R8. Never store the developer API secret or raw JWT private key in the APK.

---

## Error Handling & Diagnostic Reference

### Client AIDL / Response Codes
| Code | Constant | Meaning & Action |
|---|---|---|
| `0` | `BILLING_RESPONSE_RESULT_OK` | Success. |
| `1` | `BILLING_RESPONSE_RESULT_USER_CANCELED` | User closed dialog or cancelled bank gateway. |
| `3` | `BILLING_RESPONSE_RESULT_BILLING_UNAVAILABLE` | Bazaar app outdated or billing not supported on device. |
| `4` | `BILLING_RESPONSE_RESULT_ITEM_UNAVAILABLE` | SKU not found in Bazaar panel or inactive. |
| `5` | `BILLING_RESPONSE_RESULT_DEVELOPER_ERROR` | Manifest missing billing permission, wrong package name, or unconfigured app. |
| `6` | `BILLING_RESPONSE_RESULT_ERROR` | Fatal transaction error or gateway timeout. |
| `7` | `BILLING_RESPONSE_RESULT_ITEM_ALREADY_OWNED` | Consumable item was not consumed. Must consume before re-buying. |
| `8` | `BILLING_RESPONSE_RESULT_ITEM_NOT_OWNED` | Attempted to consume an item that is not owned by user. |

### Dynamic Pricing JWT Error Codes
| Code | Error Description | Cause / Resolution |
|---|---|---|
| `1` | Bazaar internal error | Send JWT token + user details to Bazaar developer support. |
| `2` | Malformed JWT structure | Check base64url encoding and 3-segment structure (`header.payload.sig`). |
| `3` | Unsupported algorithm | Use `HS256`, `HS384`, or `HS512`. |
| `4` | Tampered token signature | Secret key mismatch or modified payload. |
| `5` | Token expired | `exp` timestamp has passed. |
| `6` | Missing mandatory field | Ensure `price`, `package_name`, `sku`, `exp` are present. |
| `7` | `account_id` mismatch | Token was generated for a different Bazaar account ID. |
| `8` | Product SKU not found | Verify SKU in Developer Panel. |
| `9` | Package name not found | Check bundle ID / package name spelling. |
| `10` | `price` > panel price | Discount price cannot exceed registered panel price. |
| `11` | Token already used | Tokens are single-use; generate fresh token with new `nonce`. |
| `12` | Invalid price value | Price must be positive integer in Rials. |
| `13-16`| Type mismatch in claims | Ensure correct JSON types (`price`: number, `sku`: string, etc.). |

---

## Skill Resource Index

Detailed in-depth guides and ready-to-run code implementations included in this skill:

- **Guides & References:**
  - [`references/iab-concepts-and-products.md`](references/iab-concepts-and-products.md) - Product lifecycle, test subscriptions (5 min), upgrade rules.
  - [`references/poolakey-android-guide.md`](references/poolakey-android-guide.md) - Complete Android Kotlin integration, reactive flows, Unity bridge.
  - [`references/server-rest-api-v2.md`](references/server-rest-api-v2.md) - Full REST API v2 endpoints, curl examples, responses, error tables.
  - [`references/dynamic-pricing-jwt.md`](references/dynamic-pricing-jwt.md) - Node.js/Python generators, full error mapping (1-16).
  - [`references/snapppay-bnpl.md`](references/snapppay-bnpl.md) - Payout calculations, VAT breakdown, settlement workflows.
  - [`references/security-anti-fraud.md`](references/security-anti-fraud.md) - Anti-fraud, RSA validation, replay protection.
  - [`references/troubleshooting-and-faqs.md`](references/troubleshooting-and-faqs.md) - Exhaustive FAQ answering all common developer questions.

- **Production Boilerplates:**
  - [`examples/android-kotlin/BillingRepository.kt`](examples/android-kotlin/BillingRepository.kt) - Android Kotlin repository.
  - [`examples/backend-nodejs/cafebazaar-service.js`](examples/backend-nodejs/cafebazaar-service.js) - Complete Node.js / Express backend service.
  - [`examples/backend-python/cafebazaar_service.py`](examples/backend-python/cafebazaar_service.py) - Complete Python / FastAPI backend service.
  - [`examples/unity/BazaarBillingManager.cs`](examples/unity/BazaarBillingManager.cs) - Unity C# script.
