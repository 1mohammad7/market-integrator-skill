---
name: market-integrator
description: Complete end-to-end integration guide and agent command toolkit for Iranian Android App Stores (CafeBazaar & Myket). Covers In-App Billing (IAB), Poolakey, Myket IAB, Unified Multi-Store Architecture, Developer REST APIs, Subscriptions, Dynamic Pricing JWT, SnappPay BNPL, In-App Updates, and cognitive agent integration workflows.
---

# Market Integrator (راهنمای جامع اتصال به بازارهای ایرانی: کافه‌بازار و مایکت)

Comprehensive expert skill and developer toolkit for integrating Iranian Android app stores (**CafeBazaar** and **Myket**) into Android applications (Kotlin/Java, Capacitor, Flutter, React Native, Unity) and backend services (Node.js/Express, Python/FastAPI).

Covers the complete lifecycle of app store publishing and monetization:
- **In-App Billing (IAB):** Consumables, Non-Consumables, Auto-Renewing Subscriptions, and Free Trials.
- **Client SDKs:** Poolakey (CafeBazaar), Myket IAB (`IabHelper`, Flutter, React Native, Unity).
- **Multi-Store Architecture:** Unified billing interfaces, Gradle build flavors, and runtime installer detection.
- **Backend REST APIs:** CafeBazaar REST API v2 and Myket Partner Payment & Consumption API.
- **Store Services:** In-app updates, version check services, store intents (rate/details), and CD deployment.
- **Advanced Monetization:** Server-signed Dynamic Pricing JWTs and SnappPay BNPL installments.
- **Agent Skill Commands:** Interactive cognitive protocols for inspecting and integrating stores into any existing codebase.

---

## Table of Contents

1. [Skill Commands & Agent Protocols](#skill-commands--agent-protocols)
2. [Agent Integration Workflow (`integrate`)](#agent-integration-workflow-integrate)
3. [Market Comparison Matrix](#market-comparison-matrix)
4. [Architecture & Core Concepts](#architecture--core-concepts)
5. [Monetization Matrix & Product Types](#monetization-matrix--product-types)
6. [Client-Side Integration](#client-side-integration)
   - [CafeBazaar (Poolakey SDK)](#1-cafebazaar-poolakey-sdk)
   - [Myket (IabHelper & Plugins)](#2-myket-iab-helper--plugins)
   - [Unified Multi-Store Pattern](#3-unified-multi-store-pattern)
7. [Backend Server Verification APIs](#backend-server-verification-apis)
   - [CafeBazaar REST API v2](#1-cafebazaar-rest-api-v2)
   - [Myket Partner API](#2-myket-partner-api)
   - [Unified Backend Verification Service](#3-unified-backend-verification-service)
8. [Store Services & Intents](#store-services--intents)
   - [Version Check & In-App Updates](#1-version-check--in-app-updates)
   - [Store Intents (Rating, Comment, App Page)](#2-store-intents-rating-comment-app-page)
   - [Multi-APK & Gradual Rollouts](#3-multi-apk--gradual-rollouts)
9. [Advanced Features (Bazaar Dynamic Pricing & SnappPay)](#advanced-features)
10. [Security & Anti-Fraud Best Practices](#security--anti-fraud-best-practices)
11. [Error Codes & Diagnostics](#error-codes--diagnostics)
12. [Skill Resource Index](#skill-resource-index)

---

## Skill Commands & Agent Protocols

When collaborating on Iranian app store integrations, the agent uses the following skill commands to guide its execution:

| Command | Category | Description | Primary Reference |
|---|---|---|---|
| `integrate [store] [platform]` | Full-Stack | Inspects existing app and wires full-stack client & server store integration | [references/multi-store-architecture.md](references/multi-store-architecture.md) |
| `setup-iab [store]` | Client | Implements client-side in-app billing manager and lifecycle listeners | [references/myket-iab-guide.md](references/myket-iab-guide.md) & [references/poolakey-android-guide.md](references/poolakey-android-guide.md) |
| `setup-backend [framework]` | Backend | Implements server-to-server purchase verification and consumption routes | [references/myket-server-api.md](references/myket-server-api.md) & [references/server-rest-api-v2.md](references/server-rest-api-v2.md) |
| `setup-updates [store]` | Auxiliary | Adds In-App Update SDK or Version Check service to keep users updated | [references/myket-services-and-intents.md](references/myket-services-and-intents.md) |
| `audit-store-readiness` | Quality / Sec | Audits manifests, queries, Proguard rules, secrets, and anti-replay indices | [references/security-anti-fraud.md](references/security-anti-fraud.md) |

---

## Agent Integration Workflow (`integrate`)

When the user asks to **integrate an app store into an existing app**, the agent executes this 6-phase adaptive protocol instead of relying on rigid one-size-fits-all scripts:

```
+-----------------------------------------------------------------------------------+
|                            COGNITIVE AGENT PROTOCOL                               |
|                                                                                   |
|  [Phase 1: Project Discovery]  ---> Inspect stack (Android/Capacitor/RN/Flutter)  |
|                                     Extract package name, build system & backend  |
|               |                                                                   |
|               v                                                                   |
|  [Phase 2: Strategy Selection] ---> Choose Target: CafeBazaar, Myket, or Dual     |
|                                     Select Pattern: Build Flavors vs Single APK   |
|               |                                                                   |
|               v                                                                   |
|  [Phase 3: Client Integration] ---> Add <queries> & permissions to Manifest       |
|                                     Configure Proguard keep rules                 |
|                                     Generate idiomatic Billing Repository         |
|                                     Implement startup unconsumed purchases sync   |
|               |                                                                   |
|               v                                                                   |
|  [Phase 4: Backend Gateway]    ---> Scaffold /api/payments/verify endpoint        |
|                                     Implement HMAC developerPayload validation    |
|                                     Enforce unique (store, token) in database     |
|                                     Call Store verification & consumption APIs    |
|               |                                                                   |
|               v                                                                   |
|  [Phase 5: Store Intents]      ---> Wire up rating & update intents with web fallbacks
|               |                                                                   |
|               v                                                                   |
|  [Phase 6: Pre-Flight Audit]   ---> Verify 0 client secrets, Proguard enabled     |
|                                     Deliver sandbox verification checklist        |
+-----------------------------------------------------------------------------------+
```

### Phase 1: Project Discovery & Architecture Audit
1. Inspect project root to detect frontend / mobile framework:
   - **Native Android:** Check `app/build.gradle` or `build.gradle.kts`. Determine if Kotlin Coroutines/Flows or Java is used.
   - **Capacitor / Hybrid:** Check `capacitor.config.ts|json` and `android/app/...`.
   - **React Native / Flutter / Unity:** Check `package.json`, `pubspec.yaml`, or Unity Assets.
   - **Backend:** Detect Express, NestJS, Fastify, FastAPI, Django, etc.
2. Read the application `package_name` (e.g. `ir.fitsme.app`).

### Phase 2: Target Market Strategy
- **Single Store:** Target either `cafebazaar` or `myket`.
- **Dual Store (Recommended):** Support both market stores in a unified architecture:
  - *Pattern A (Build Flavors):* For apps with distinct store branding or strict binary isolation (`bazaarRelease`, `myketRelease`).
  - *Pattern B (Runtime Installer Detection):* Single universal binary detecting `PackageManager.getInstallerPackageName()`.

### Phase 3: Client Implementation
- **Manifest Updates:** Add required `<queries>` for `com.farsitel.bazaar` and/or `ir.mservices.market`, along with billing permissions.
- **Proguard Rules:** Add `-keep class com.android.vending.billing.** { *; }` and store-specific SDK keeps.
- **Billing Repository:** Create an idiomatic billing manager tailored to the detected tech stack (e.g., Kotlin coroutines flow, Capacitor bridge).
- **Startup Inventory Sync:** Ensure `queryPurchases()` runs on app boot to recover unconsumed "zombie" purchases.

### Phase 4: Backend Verification Gateway
- Implement `/api/payments/verify` accepting `{ store, sku, token, payload, userId }`.
- Validate `developerPayload` against user session using HMAC to prevent tampering.
- Prevent replay attacks by checking if `token` exists in database before fulfillment.
- Call CafeBazaar or Myket REST API out-of-band.
- Automatically consume consumable purchases upon fulfillment.

### Phase 5: Auxiliary Services
- Add rate/comment intent dialogs (`bazaar://details?id=...` and `myket://comment?id=...`) with web browser fallback URLs.
- Integrate In-App Update or Version Check service (`MyketSupportHelper`).

### Phase 6: Pre-Flight Audit
- Verify that **no developer API secrets, private keys, or tokens** are included in client-side code or git commits.
- Print an actionable testing checklist (Developer Console configuration, test accounts, sandbox validation).

---

## Market Comparison Matrix

| Dimension | CafeBazaar (کافه‌بازار) | Myket (مایکت) |
|---|---|---|
| **Market Package** | `com.farsitel.bazaar` | `ir.mservices.market` |
| **Primary Client SDK** | Poolakey (`com.github.cafebazaar.Poolakey:poolakey:2.2.0`) | Myket IAB (`IabHelper` / `myket_iap` / `react-native-myket-iab`) |
| **Android Manifest Queries** | `ir.cafebazaar.pardakht.InAppBillingService.BIND` | `ir.mservices.market.InAppBillingService.BIND` |
| **Billing Permission** | `com.farsitel.bazaar.permission.PAY_THROUGH_BAZAAR` | `com.android.vending.BILLING` |
| **Server Validation Method** | `GET /devapi/v2/api/validate/<pkg>/inapp/<sku>/purchases/<token>/` | `POST /api/partners/applications/{pkg}/purchases/products/{sku}/verify` |
| **Server Auth Header** | `CAFEBAZAAR-PISHKHAN-API-SECRET: <SECRET>` | `X-Access-Token: <TOKEN>` |
| **Server Consumption** | `POST /devapi/v2/api/consume/<pkg>/purchases/` | `POST /api/partners/applications/{pkg}/purchases/products/{sku}/consume` |
| **Dynamic Pricing (تخفیف پویا)** | Supported natively via Backend-Signed JWT (`HS256`) | Not supported (uses dedicated discount SKUs) |
| **BNPL Installments** | SnappPay (automatic for purchases >20,000 Tomans) | Market wallet / banking gateways |
| **In-App Update Support** | Store Intent / In-App Update | `MyketSupportHelper` AIDL & In-App Update SDK |
| **Rate App Intent** | `bazaar://details?id=<pkg>` | `myket://comment?id=<pkg>` |

---

## Architecture & Core Concepts

Both CafeBazaar and Myket utilize Android Inter-Process Communication (IPC) via AIDL. The mobile client binds to the local store application, which renders the payment UI and communicates with payment gateways. Validations and entitlements must be verified out-of-band by your secure backend server.

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT DEVICE                                     |
|                                                                                   |
|   +--------------------------+               +--------------------------------+   |
|   |   Your Android App       |   IPC (AIDL)  |   CafeBazaar / Myket Client    |   |
|   |  (Unified Billing Repo)  | <===========> |    (Payment Flow & Wallet)     |   |
|   +--------------------------+               +--------------------------------+   |
|                 |                                             |                   |
+-----------------|---------------------------------------------|-------------------+
                  | HTTPS (Token, SKU, Store)                   | HTTPS
                  v                                             v
+------------------------------------+         +------------------------------------+
|        Your Backend Server         |  REST   |      Market Billing Servers        |
|   - Universal Verification Router  | ======> |  - pardakht.cafebazaar.ir          |
|   - Replay Prevention (DB Index)   | (API)   |  - developer.myket.ir              |
|   - Entitlement Provisioning       |         |                                    |
+------------------------------------+         +------------------------------------+
```

### Essential Android Manifest Setup:
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Billing permissions -->
    <uses-permission android:name="com.farsitel.bazaar.permission.PAY_THROUGH_BAZAAR" />
    <uses-permission android:name="com.android.vending.BILLING" />

    <!-- Android 11+ (API 30+) Package Queries -->
    <queries>
        <!-- CafeBazaar -->
        <package android:name="com.farsitel.bazaar" />
        <intent>
            <action android:name="ir.cafebazaar.pardakht.InAppBillingService.BIND" />
        </intent>
        <!-- Myket -->
        <package android:name="ir.mservices.market" />
        <intent>
            <action android:name="ir.mservices.market.InAppBillingService.BIND" />
        </intent>
    </queries>
</manifest>
```

### Proguard / R8 Configuration:
```proguard
# Preserve AIDL Billing interfaces
-keep class com.android.vending.billing.** { *; }
-keep class com.github.cafebazaar.poolakey.** { *; }
-keep class ir.mservices.market.** { *; }
```

---

## Monetization Matrix & Product Types

| Product Type | Persian Term | Multi-Purchase? | Must Consume? | Persists Across Reinstalls? | Examples |
|---|---|---|---|---|---|
| **Consumable** | محصولات مصرفی | Yes (Unlimited) | **Yes** (`consumePurchase`) | No (consumed immediately) | Coins, gems, fuels, credits, extra lives |
| **Non-Consumable** | محصولات غیرمصرفی | No (Once per account) | **No** (Never consume!) | **Yes** (`getPurchases`) | Remove Ads, Lifetime Pro, Full Version Unlock |
| **Subscription** | اشتراک دوره‌ای | 1 Active per app | **No** (Cannot consume) | **Yes** (during valid period) | 30/60/90/180/365-day access, VIP club |
| **Trial Subscription** | اشتراک آزمایشی | Once per user lifetime | **No** | **Yes** (converts to paid) | 1 to 30 days free trial for new subscribers |

> [!IMPORTANT]
> **Zombie Purchases & App Startup Sync:** If a user pays but the app crashes before consumption, the store records the product as owned. Future attempts will fail with `BILLING_RESPONSE_RESULT_ITEM_ALREADY_OWNED (7)`.
> **Rule:** On every app launch, query all unconsumed items, validate with your backend, fulfill the order, and consume them immediately.

---

## Client-Side Integration

### 1. CafeBazaar (Poolakey SDK)

**Gradle Dependency:**
```groovy
implementation 'com.github.cafebazaar.Poolakey:poolakey:2.2.0'
```

**Kotlin Implementation:**
```kotlin
class BazaarBillingManager(private val context: Context, private val registry: ActivityResultRegistry) {
    private val security = SecurityCheck.Enable(rsaPublicKey = "YOUR_BAZAAR_RSA_KEY")
    private val payment = Payment(context = context, config = PaymentConfiguration(localSecurityCheck = security))
    private var connection: PaymentConnection? = null

    fun connect(onReady: () -> Unit) {
        connection = payment.connect {
            connectionSucceed { onReady() }
            connectionFailed { /* handle */ }
        }
    }

    fun buy(sku: String, payload: String, dynamicToken: String? = null, onResult: (Result<PurchaseEntity>) -> Unit) {
        val req = PurchaseRequest(productId = sku, payload = payload, dynamicPriceToken = dynamicToken)
        payment.purchaseProduct(registry, req) {
            purchaseSucceed { entity -> onResult(Result.success(entity)) }
            purchaseFailed { err -> onResult(Result.failure(err)) }
            purchaseCanceled { onResult(Result.failure(Exception("CANCELED"))) }
        }
    }

    fun consume(token: String, onDone: (Boolean) -> Unit) {
        payment.consumeProduct(token) {
            consumeSucceed { onDone(true) }
            consumeFailed { onDone(false) }
        }
    }
}
```

---

### 2. Myket (IabHelper & Plugins)

See complete implementation in [`references/myket-iab-guide.md`](references/myket-iab-guide.md).

**Android Kotlin / Java:**
```kotlin
val helper = IabHelper(activity, "YOUR_MYKET_RSA_PUBLIC_KEY")
helper.startSetup { result ->
    if (result.isSuccess) {
        // Query inventory on launch
        helper.queryInventoryAsync(true, null, null) { invResult, inventory ->
            // Process unconsumed items
        }
    }
}

// Purchase flow
helper.launchPurchaseFlow(activity, sku, RC_REQUEST, { res, purchase ->
    if (res.isSuccess && purchase != null) {
        // Send purchase.token to your server, then consume:
        helper.consumeAsync(purchase) { p, consumeRes -> }
    }
}, developerPayload)
```

**React Native (`react-native-myket-iab`):**
```javascript
import MyketBilling from 'react-native-myket-iab';

await MyketBilling.init("MYKET_RSA_PUBLIC_KEY");
const purchase = await MyketBilling.purchase("gem_100", payload);
await verifyOnBackend('myket', purchase.token, "gem_100");
await MyketBilling.consumePurchase(purchase);
```

**Flutter (`myket_iap`):**
```dart
import 'package:myket_iap/myket_iap.dart';

await MyketIap.init(rsaPublicKey: "MYKET_RSA_PUBLIC_KEY");
final result = await MyketIap.purchase(sku: "gem_100", developerPayload: payload);
await MyketIap.consume(purchaseToken: result.token);
```

---

### 3. Unified Multi-Store Pattern

To support both stores in one app:
1. **Build Flavors (Separate APKs):** Define `bazaar` and `myket` flavors in `build.gradle`.
2. **Runtime Store Detection (Single APK):**
```kotlin
fun detectMarket(context: Context): MarketType {
    val installer = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        context.packageManager.getInstallSourceInfo(context.packageName).installingPackageName
    } else {
        @Suppress("DEPRECATION")
        context.packageManager.getInstallerPackageName(context.packageName)
    }

    return when (installer) {
        "com.farsitel.bazaar" -> MarketType.CAFEBAZAAR
        "ir.mservices.market" -> MarketType.MYKET
        else -> if (isInstalled(context, "com.farsitel.bazaar")) MarketType.CAFEBAZAAR else MarketType.MYKET
    }
}
```
See complete implementation in [`examples/android-kotlin/multi-store/MarketBillingRepository.kt`](examples/android-kotlin/multi-store/MarketBillingRepository.kt).

---

## Backend Server Verification APIs

### 1. CafeBazaar REST API v2
- **Header:** `CAFEBAZAAR-PISHKHAN-API-SECRET: <SECRET>`
- **Validate:** `GET https://pardakht.cafebazaar.ir/devapi/v2/api/validate/<pkg>/inapp/<sku>/purchases/<token>/`
- **Consume:** `POST https://pardakht.cafebazaar.ir/devapi/v2/api/consume/<pkg>/purchases/` (`body: {"token": "<token>"}`)
- **Subscriptions:** `GET https://pardakht.cafebazaar.ir/devapi/v2/api/applications/<pkg>/active-subscriptions/<token>/`

### 2. Myket Partner API
- **Header:** `X-Access-Token: <TOKEN>`, `Content-Type: application/json`
- **Verify:** `POST https://developer.myket.ir/api/partners/applications/{pkg}/purchases/products/{sku}/verify` (`body: {"tokenId": "<token>"}`)
- **Consume:** `POST https://developer.myket.ir/api/partners/applications/{pkg}/purchases/products/{sku}/consume` (`body: {"tokenId": "<token>"}`)

### 3. Unified Backend Verification Service
See full Node.js implementation in [`examples/backend-nodejs/market-service.js`](examples/backend-nodejs/market-service.js) and Python in [`examples/backend-python/market_service.py`](examples/backend-python/market_service.py).

```javascript
const MarketService = require('./market-service');
const marketService = new MarketService();

// Single endpoint for both stores
app.post('/api/payments/verify', async (req, res) => {
  const { store, sku, token, payload, userId } = req.body;
  
  // 1. Verify developer payload (anti-tamper)
  if (!marketService.verifyPayload(payload, userId)) {
    return res.status(403).json({ error: 'Invalid payload' });
  }

  // 2. Query Store API
  const result = await marketService.verifyPurchase({ store, sku, token });
  if (result.isValid) {
    // 3. Grant credits in DB
    await grantCredits(userId, sku);
    
    // 4. Consume if consumable
    if (!result.isConsumed) {
      await marketService.consumePurchase({ store, sku, token });
    }
    return res.json({ success: true });
  }
  res.status(400).json({ error: 'Invalid purchase' });
});
```

---

## Store Services & Intents

### 1. Version Check & In-App Updates
- **Myket:** Use `MyketSupportHelper` (`IMyketSupportService.aidl`) to check `getAppUpdateStateAsync()`. Retrieves available version code and description.
- **CafeBazaar:** Use standard update intents or in-app update workflows.

### 2. Store Intents (Rating, Comment, App Page)
Always wrap intent calls in a try/catch and fallback to web URLs:

```java
public static void openAppPage(Context context, String market) {
    String uri = market.equals("myket") 
        ? "myket://details?id=" + context.getPackageName()
        : "bazaar://details?id=" + context.getPackageName();
    String pkg = market.equals("myket") ? "ir.mservices.market" : "com.farsitel.bazaar";
    
    try {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(uri));
        intent.setPackage(pkg);
        context.startActivity(intent);
    } catch (ActivityNotFoundException e) {
        String webUrl = market.equals("myket")
            ? "https://myket.ir/app/" + context.getPackageName()
            : "https://cafebazaar.ir/app/" + context.getPackageName();
        context.startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(webUrl)));
    }
}
```

### 3. Multi-APK & Gradual Rollouts
- Both stores support uploading separate APKs partitioned by **CPU Architecture (ABI)**: `arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64`.
- Higher `versionCode` values must be assigned to 64-bit packages.
- Releases can be published gradually to 10%, 25%, 50%, and 100% of users.

---

## Advanced Features

### 1. Dynamic Pricing JWT (CafeBazaar Only)
Allows server-signed dynamic discounts on existing SKUs without panel modifications:
- Algorithm: `HS256`, `HS384`, or `HS512`.
- Claims: `price` (in Rials), `package_name`, `sku`, `exp`, `nonce`.
- Secret: Configured in CafeBazaar Developer Console.
- Full guide: [`references/dynamic-pricing-jwt.md`](references/dynamic-pricing-jwt.md).

### 2. SnappPay BNPL (CafeBazaar Only)
- Automatic 1-installment and 4-installment credit checkout for purchases >20,000 Tomans.
- Zero client code changes.
- Payout and commission formula guide: [`references/snapppay-bnpl.md`](references/snapppay-bnpl.md).

---

## Security & Anti-Fraud Best Practices

1. **Server Validation Mandatory:** Never grant digital goods solely based on on-device callbacks.
2. **Replay Protection:** Store used `token` strings in a unique database index. Reject any duplicate submissions.
3. **Payload Binding:** Always pass a cryptographic `developerPayload` (`HMAC(userId + timestamp, secret)`) during checkout and verify it on your server.
4. **No Secrets in APK:** Never embed Developer API Secrets, Access Tokens, or JWT private keys in the Android APK.
5. **Obfuscation:** Obfuscate release builds with Proguard/R8.

---

## Error Codes & Diagnostics

### Standard Billing Client Codes (AIDL)
| Code | Constant | Meaning & Action |
|---|---|---|
| `0` | `BILLING_RESPONSE_RESULT_OK` | Success. |
| `1` | `BILLING_RESPONSE_RESULT_USER_CANCELED` | User canceled payment dialog. |
| `3` | `BILLING_RESPONSE_RESULT_BILLING_UNAVAILABLE` | Store app outdated or billing unsupported. |
| `4` | `BILLING_RESPONSE_RESULT_ITEM_UNAVAILABLE` | SKU not registered in developer console. |
| `5` | `BILLING_RESPONSE_RESULT_DEVELOPER_ERROR` | Manifest missing billing permission, wrong package name, or misconfigured signature. |
| `6` | `BILLING_RESPONSE_RESULT_ERROR` | Fatal transaction error or gateway failure. |
| `7` | `BILLING_RESPONSE_RESULT_ITEM_ALREADY_OWNED` | Consumable item not consumed. Must consume before re-purchasing. |
| `8` | `BILLING_RESPONSE_RESULT_ITEM_NOT_OWNED` | Attempted to consume an unowned item. |

---

## Skill Resource Index

- **Guides & Specifications:**
  - [`references/multi-store-architecture.md`](references/multi-store-architecture.md) - Unified architecture, build flavors, runtime detection.
  - [`references/myket-iab-guide.md`](references/myket-iab-guide.md) - Complete Myket IAB client guide (Android, Flutter, RN, Unity).
  - [`references/myket-server-api.md`](references/myket-server-api.md) - Myket server-to-server REST API specification.
  - [`references/myket-services-and-intents.md`](references/myket-services-and-intents.md) - Version checking, in-app updates, store intents.
  - [`references/poolakey-android-guide.md`](references/poolakey-android-guide.md) - CafeBazaar Poolakey Android guide.
  - [`references/server-rest-api-v2.md`](references/server-rest-api-v2.md) - CafeBazaar REST API v2 endpoints and curl references.
  - [`references/dynamic-pricing-jwt.md`](references/dynamic-pricing-jwt.md) - Dynamic Pricing JWT generation & error codes.
  - [`references/snapppay-bnpl.md`](references/snapppay-bnpl.md) - SnappPay settlement and payout models.
  - [`references/security-anti-fraud.md`](references/security-anti-fraud.md) - Anti-fraud, RSA validation, replay protection.
  - [`references/troubleshooting-and-faqs.md`](references/troubleshooting-and-faqs.md) - Frequently asked questions.

- **Production Boilerplates:**
  - [`examples/android-kotlin/multi-store/MarketBillingRepository.kt`](examples/android-kotlin/multi-store/MarketBillingRepository.kt) - Multi-store Kotlin billing repository.
  - [`examples/backend-nodejs/market-service.js`](examples/backend-nodejs/market-service.js) - Unified Node.js backend validation service.
  - [`examples/backend-nodejs/unified-server-routes.js`](examples/backend-nodejs/unified-server-routes.js) - Unified Express.js payment routes.
  - [`examples/backend-python/market_service.py`](examples/backend-python/market_service.py) - Unified Python FastAPI service.
  - [`examples/unity/BazaarBillingManager.cs`](examples/unity/BazaarBillingManager.cs) - Unity C# script for CafeBazaar.
  - [`examples/unity/MyketBillingManager.cs`](examples/unity/MyketBillingManager.cs) - Unity C# script for Myket.
