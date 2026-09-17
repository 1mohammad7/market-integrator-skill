# Multi-Store Architecture: Unified CafeBazaar & Myket Integration

Designing an Android or multiplatform application to seamlessly support both **CafeBazaar** and **Myket** without code duplication, merge conflicts, or fragile branching.

---

## 1. Comparison Matrix: CafeBazaar vs Myket

| Dimension | CafeBazaar | Myket |
|---|---|---|
| **Market Package** | `com.farsitel.bazaar` | `ir.mservices.market` |
| **Client Library** | Poolakey (`com.github.cafebazaar.Poolakey:poolakey:2.2.0`) | Myket IAB (`IabHelper` / `myket_iap` / `react-native-myket-iab`) |
| **Android Queries Action** | `ir.cafebazaar.pardakht.InAppBillingService.BIND` | `ir.mservices.market.InAppBillingService.BIND` |
| **Billing Permission** | `com.farsitel.bazaar.permission.PAY_THROUGH_BAZAAR` | `com.android.vending.BILLING` |
| **Server Validation URL** | `GET https://pardakht.cafebazaar.ir/devapi/v2/api/validate/<pkg>/inapp/<sku>/purchases/<token>/` | `POST https://developer.myket.ir/api/partners/applications/{pkg}/purchases/products/{sku}/verify` |
| **Server Auth Header** | `CAFEBAZAAR-PISHKHAN-API-SECRET: <SECRET>` | `X-Access-Token: <TOKEN>` |
| **Server Consumption** | `POST https://pardakht.cafebazaar.ir/devapi/v2/api/consume/<pkg>/purchases/` | `POST https://developer.myket.ir/api/partners/applications/{pkg}/purchases/products/{sku}/consume` |
| **Dynamic Pricing (JWT)** | Supported natively (`HS256/384/512`) | Not supported (uses dedicated discount SKUs) |
| **BNPL Installments** | SnappPay (automatic for >20,000 Tomans) | Market-specific wallet / banking gateways |
| **In-App Update SDK** | Supported via Intent / In-App Update | Supported via `MyketSupportHelper` AIDL & In-App Update SDK |
| **Rate App Intent** | `bazaar://details?id=<pkg>` | `myket://comment?id=<pkg>` |

---

## 2. Architecture Patterns

There are two primary ways to support both markets:

### Pattern A: Build Flavors (Recommended for Native Android)
Produces two distinct APKs: `app-bazaar-release.apk` and `app-myket-release.apk`. Each APK only bundles the dependencies and permissions required for that specific store.

```groovy
// In app/build.gradle
android {
    flavorDimensions "market"
    
    productFlavors {
        bazaar {
            dimension "market"
            buildConfigField "String", "MARKET_NAME", "\"cafebazaar\""
            manifestPlaceholders = [marketPermission: "com.farsitel.bazaar.permission.PAY_THROUGH_BAZAAR"]
        }
        myket {
            dimension "market"
            buildConfigField "String", "MARKET_NAME", "\"myket\""
            manifestPlaceholders = [marketPermission: "com.android.vending.BILLING"]
        }
    }
}

dependencies {
    bazaarImplementation 'com.github.cafebazaar.Poolakey:poolakey:2.2.0'
    // Myket helpers placed in src/myket/java
}
```

### Pattern B: Unified Single APK (Runtime Store Detection)
A single universal APK detects the source market at runtime using `PackageManager.getInstallerPackageName`:

```kotlin
fun detectInstalledMarket(context: Context): MarketType {
    val installer = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        context.packageManager.getInstallSourceInfo(context.packageName).installingPackageName
    } else {
        @Suppress("DEPRECATION")
        context.packageManager.getInstallerPackageName(context.packageName)
    }

    return when (installer) {
        "com.farsitel.bazaar" -> MarketType.CAFEBAZAAR
        "ir.mservices.market" -> MarketType.MYKET
        else -> {
            // Sideloaded or developer debug: fallback to whichever market is installed
            when {
                isPackageInstalled(context, "com.farsitel.bazaar") -> MarketType.CAFEBAZAAR
                isPackageInstalled(context, "ir.mservices.market") -> MarketType.MYKET
                else -> MarketType.UNKNOWN
            }
        }
    }
}
```

---

## 3. The Unified Billing Interface Pattern

Define a store-agnostic interface in your client app. Your UI code interacts **only** with this abstraction:

```kotlin
interface MarketBillingService {
    val marketName: String
    fun initialize(onReady: () -> Unit, onError: (Throwable) -> Unit)
    fun purchase(activity: Activity, sku: String, payload: String, dynamicToken: String? = null, onResult: (Result<UnifiedPurchase>) -> Unit)
    fun consume(token: String, onResult: (Boolean) -> Unit)
    fun queryPurchases(onResult: (List<UnifiedPurchase>) -> Unit)
    fun openStorePage(activity: Activity)
    fun openRatingDialog(activity: Activity)
    fun disconnect()
}

data class UnifiedPurchase(
    val orderId: String,
    val sku: String,
    val purchaseToken: String,
    val payload: String,
    val purchaseTime: Long,
    val market: String
)
```

---

## 4. Unified Backend Gateway Pattern

On your backend server, expose a single payment verification endpoint. The client sends its `store` identifier along with the token and SKU:

```
[Mobile Client (Bazaar or Myket)]
              |
              | POST /api/payments/verify
              | { store: "cafebazaar" | "myket", sku: "...", token: "...", payload: "..." }
              v
     [Your Backend Router]
         /           \
        /             \ (if myket)
(if bazaar)            \
      v                 v
[CafeBazaar API v2]   [Myket API]
      \                 /
       \               /
        v             v
   [Normalized Verification Entity]
   - Valid: true/false
   - Status: ACTIVE / CONSUMED / REFUNDED
   - Timestamp
```

### Universal Normalization Schema
```typescript
interface NormalizedPurchaseResult {
  isValid: boolean;
  store: 'cafebazaar' | 'myket';
  sku: string;
  token: string;
  purchaseTime: number; // UTC ms
  isConsumed: boolean;
  rawResponse: any;
}
```
This guarantees your database and business logic (e.g., granting credits, updating subscriptions) stay 100% agnostic to whether the user transacted on CafeBazaar or Myket.
