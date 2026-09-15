# Poolakey SDK Integration Guide (Android & Kotlin)

## 1. Introduction

**Poolakey** is CafeBazaar's official modern In-App Billing library for Android, built with **Kotlin** and supporting ReactiveX principles. It simplifies IPC communication with the CafeBazaar app, handles security checks with public RSA keys, and provides clean callback and coroutine interfaces.

---

## 2. Dependencies & Build Configuration

### A. Repository Settings
Ensure JitPack is included in your `settings.gradle.kts` (or root `build.gradle`):

```kotlin
// settings.gradle.kts
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        maven { url = java.net.URI("https://jitpack.io") }
    }
}
```

### B. App Module Dependencies
```kotlin
// app/build.gradle.kts
dependencies {
    implementation("com.github.cafebazaar.Poolakey:poolakey:2.2.0") // Verify latest version on GitHub
}
```

### C. Android Manifest Configuration
Ensure billing permissions are declared (Poolakey manifest merger includes this automatically, but explicitly declaring is recommended):

```xml
<!-- AndroidManifest.xml -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="com.farsitel.bazaar.permission.PAY_THROUGH_BAZAAR" />
</manifest>
```

### D. Proguard / R8 Rules
```proguard
# proguard-rules.pro
-keep class com.android.vending.billing.** { *; }
-keep class com.github.cafebazaar.poolakey.** { *; }
-keepattributes *Annotation*
```

---

## 3. Core API Components

### A. Initialization & Security Setup
```kotlin
import ir.cafebazaar.poolakey.Payment
import ir.cafebazaar.poolakey.config.PaymentConfiguration
import ir.cafebazaar.poolakey.config.SecurityCheck

// 1. Configure RSA Security Check (Public key from CafeBazaar Developer Console)
val securityCheck = SecurityCheck.Enable(
    rsaPublicKey = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..."
)

// 2. Initialize Payment Configuration
val paymentConfig = PaymentConfiguration(
    localSecurityCheck = securityCheck
)

// 3. Create Payment Instance (Keep as singleton or repository member)
val payment = Payment(
    context = applicationContext,
    config = paymentConfig
)
```

---

## 4. Connection Lifecycle

Connection to the CafeBazaar client app must be established before executing queries or purchases, and must be cleaned up in `onDestroy()` to prevent memory leaks.

```kotlin
import ir.cafebazaar.poolakey.PaymentConnection

private var paymentConnection: PaymentConnection? = null

fun connectToBazaar(
    onSuccess: () -> Unit,
    onError: (Throwable) -> Unit
) {
    paymentConnection = payment.connect {
        connectionSucceed {
            // Connected to CafeBazaar billing service
            onSuccess()
        }
        connectionFailed { throwable ->
            // Bazaar app not installed, outdated, or background service unavailable
            onError(throwable)
        }
        disconnected {
            // Connection dropped unexpectedly (e.g. Bazaar process killed)
        }
    }
}

fun disconnect() {
    paymentConnection?.disconnect()
    paymentConnection = null
}
```

---

## 5. Initiating Purchases & Subscriptions

### A. Standard Consumable / Non-Consumable Purchase
```kotlin
import androidx.activity.result.ActivityResultRegistry
import ir.cafebazaar.poolakey.request.PurchaseRequest
import ir.cafebazaar.poolakey.entity.PurchaseEntity

fun buyProduct(
    activityResultRegistry: ActivityResultRegistry,
    productId: String,
    developerPayload: String,
    dynamicPriceToken: String? = null,
    onSuccess: (PurchaseEntity) -> Unit,
    onCanceled: () -> Unit,
    onFailure: (Throwable) -> Unit
) {
    val request = PurchaseRequest(
        productId = productId,
        payload = developerPayload,
        dynamicPriceToken = dynamicPriceToken // Optional JWT for dynamic discount
    )

    payment.purchaseProduct(
        registry = activityResultRegistry,
        request = request
    ) {
        purchaseFlowBegan {
            // Bazaar checkout dialog is displaying
        }
        failedToBeginFlow { throwable ->
            // Could not open checkout dialog (e.g. SKU invalid or missing permission)
            onFailure(throwable)
        }
        purchaseSucceed { purchaseEntity ->
            // Purchase completed successfully by user
            // purchaseEntity contains: orderId, purchaseToken, payload, purchaseTime, etc.
            onSuccess(purchaseEntity)
        }
        purchaseCanceled {
            // User closed the dialog or cancelled payment
            onCanceled()
        }
        purchaseFailed { throwable ->
            // Bank gateway error or fraud check rejection
            onFailure(throwable)
        }
    }
}
```

### B. Subscription Purchase
```kotlin
fun subscribePlan(
    activityResultRegistry: ActivityResultRegistry,
    subscriptionSku: String,
    developerPayload: String,
    dynamicPriceToken: String? = null,
    onSuccess: (PurchaseEntity) -> Unit,
    onFailure: (Throwable) -> Unit
) {
    val request = PurchaseRequest(
        productId = subscriptionSku,
        payload = developerPayload,
        dynamicPriceToken = dynamicPriceToken
    )

    payment.subscribeProduct(
        registry = activityResultRegistry,
        request = request
    ) {
        purchaseFlowBegan { }
        failedToBeginFlow { throwable -> onFailure(throwable) }
        purchaseSucceed { entity -> onSuccess(entity) }
        purchaseCanceled { }
        purchaseFailed { throwable -> onFailure(throwable) }
    }
}
```

---

## 6. Consuming Consumables

```kotlin
fun consumeItem(
    purchaseToken: String,
    onSuccess: () -> Unit,
    onError: (Throwable) -> Unit
) {
    payment.consumeProduct(purchaseToken) {
        consumeSucceed {
            // Product consumed in Bazaar. User can purchase again.
            onSuccess()
        }
        consumeFailed { throwable ->
            // Failed to consume (e.g., token already consumed or user not logged into Bazaar)
            onError(throwable)
        }
    }
}
```

---

## 7. Querying Owned Products & Subscriptions

> [!IMPORTANT]
> The user must be logged into their CafeBazaar account on the device. If the user is logged out, query callbacks will trigger `queryFailed`.

### A. Query Owned Purchases (Non-consumables + unconsumed consumables)
```kotlin
fun restorePurchases(
    onSuccess: (List<ir.cafebazaar.poolakey.entity.PurchaseInfo>) -> Unit,
    onError: (Throwable) -> Unit
) {
    payment.getPurchasedProducts {
        querySucceed { purchasedList ->
            // List of active purchases
            onSuccess(purchasedList)
        }
        queryFailed { throwable ->
            onError(throwable)
        }
    }
}
```

### B. Query Subscribed Products
```kotlin
fun restoreSubscriptions(
    onSuccess: (List<ir.cafebazaar.poolakey.entity.PurchaseInfo>) -> Unit,
    onError: (Throwable) -> Unit
) {
    payment.getSubscribedProducts {
        querySucceed { subscriptionList ->
            onSuccess(subscriptionList)
        }
        queryFailed { throwable ->
            onError(throwable)
        }
    }
}
```

### C. Check Free Trial Subscription Eligibility
```kotlin
fun checkTrialEligibility(
    onResult: (isAvailable: Boolean, trialDays: Int) -> Unit,
    onError: (Throwable) -> Unit
) {
    payment.checkTrialSubscription {
        checkTrialSubscriptionSucceed { trialInfo ->
            onResult(trialInfo.isAvailable, trialInfo.trialPeriodDays)
        }
        checkTrialSubscriptionFailed { throwable ->
            onError(throwable)
        }
    }
}
```

---

## 8. Unity Integration (2020+)

Poolakey provides a Unity C# plugin for multiplatform game projects.

```csharp
using UnityEngine;
using System.Threading.Tasks;
using CafeBazaar.Poolakey; // Ensure Poolakey Unity package is imported

public class UnityBazaarBilling : MonoBehaviour
{
    private Payment payment;

    async void Start()
    {
        var config = new PaymentConfiguration("YOUR_RSA_PUBLIC_KEY");
        payment = new Payment(config);

        var connectResult = await payment.Connect();
        if (connectResult.status == Status.Success)
        {
            Debug.Log("Connected to CafeBazaar Billing");
            CheckExistingPurchases();
        }
    }

    public async void BuyCoinPack(string sku)
    {
        var purchaseResult = await payment.Purchase(sku);
        if (purchaseResult.status == Status.Success)
        {
            string token = purchaseResult.data.purchaseToken;
            // 1. Verify token with your backend server
            // 2. Consume token:
            var consumeResult = await payment.Consume(token);
            if (consumeResult.status == Status.Success)
            {
                Debug.Log("Consumed and fulfilled successfully!");
            }
        }
    }
}
```
