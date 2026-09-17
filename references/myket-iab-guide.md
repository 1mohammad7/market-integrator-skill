# Myket In-App Billing (خرید درون‌برنامه‌ای مایکت) - Comprehensive Guide

This guide covers complete client-side integration of **Myket In-App Billing (IAB)** across **Android (Kotlin/Java)**, **Flutter**, **React Native**, and **Unity**.

---

## 1. Core Architecture & Concepts

Myket IAB utilizes Android IPC via AIDL (`com.android.vending.billing.IInAppBillingService` or `ir.mservices.market.billing.IMyketBillingService`). The client app binds to Myket's billing service (`ir.mservices.market`).

### Manifest Setup & Permissions

Add permissions to your `AndroidManifest.xml`:
```xml
<!-- In-App Billing Permission for Myket -->
<uses-permission android:name="com.android.vending.BILLING" />

<!-- Android 11+ (API 30+) Package Visibility Queries -->
<queries>
    <package android:name="ir.mservices.market" />
    <intent>
        <action android:name="ir.mservices.market.InAppBillingService.BIND" />
    </intent>
</queries>
```

### Proguard / R8 Rules

Add to `proguard-rules.pro`:
```proguard
-keep class com.android.vending.billing.** { *; }
-keep class ir.mservices.market.** { *; }
```

---

## 2. Android Kotlin / Java Integration

### Option A: Standard AIDL / Helper Classes
Myket provides helper classes (`IabHelper`, `Purchase`, `Inventory`, `Security`) that implement the standard Android billing AIDL:

1. **Obtain RSA Public Key:**
   Get your application's Public RSA Key from the Myket Developer Panel under **برنامه‌ها -> [نام برنامه] -> پرداخت درون‌برنامه‌ای**.

2. **Initialize Helper:**
```kotlin
import com.example.util.IabHelper
import com.example.util.IabResult
import com.example.util.Purchase
import com.example.util.Inventory

class MyketBillingManager(
    private val activity: Activity,
    private val base64PublicKey: String
) {
    private var mHelper: IabHelper? = null

    fun initialize(onSetupComplete: (Boolean, String?) -> Unit) {
        mHelper = IabHelper(activity, base64PublicKey)
        // Enable debug logging during development
        mHelper?.enableDebugLogging(true, "MyketBilling")
        
        mHelper?.startSetup { result: IabResult ->
            if (!result.isSuccess) {
                onSetupComplete(false, "Billing setup failed: ${result.message}")
                return@startSetup
            }
            if (mHelper == null) return@startSetup
            onSetupComplete(true, null)
        }
    }

    // Query User Inventory on startup to detect unconsumed items or active subscriptions
    fun queryPurchases(onSuccess: (Inventory) -> Unit, onError: (String) -> Unit) {
        mHelper?.queryInventoryAsync(true, null, null) { result, inventory ->
            if (result.isFailure) {
                onError("Failed to query inventory: ${result.message}")
                return@queryInventoryAsync
            }
            onSuccess(inventory)
        }
    }

    // Launch Purchase Flow
    fun launchPurchase(
        sku: String,
        requestCode: Int,
        developerPayload: String,
        onPurchaseFinished: (IabResult, Purchase?) -> Unit
    ) {
        mHelper?.launchPurchaseFlow(
            activity,
            sku,
            requestCode,
            { result, purchase -> onPurchaseFinished(result, purchase) },
            developerPayload
        )
    }

    // Launch Subscription Flow
    fun launchSubscription(
        sku: String,
        requestCode: Int,
        developerPayload: String,
        onPurchaseFinished: (IabResult, Purchase?) -> Unit
    ) {
        mHelper?.launchSubscriptionPurchaseFlow(
            activity,
            sku,
            requestCode,
            { result, purchase -> onPurchaseFinished(result, purchase) },
            developerPayload
        )
    }

    // Consume Consumable Purchase
    fun consumePurchase(purchase: Purchase, onConsumed: (Boolean, String?) -> Unit) {
        mHelper?.consumeAsync(purchase) { p, result ->
            if (result.isSuccess) {
                onConsumed(true, null)
            } else {
                onConsumed(false, result.message)
            }
        }
    }

    // Forward onActivityResult
    fun handleActivityResult(requestCode: Int, resultCode: Int, data: Intent?): Boolean {
        return mHelper?.handleActivityResult(requestCode, resultCode, data) ?: false
    }

    fun dispose() {
        mHelper?.dispose()
        mHelper = null
    }
}
```

### Purchase Data Structure (`Purchase` Object)
| Field | Type | Description |
|---|---|---|
| `mItemType` | String | Item type (`inapp` or `subs`) |
| `mOrderId` | String | Order/Invoice ID |
| `mPackageName` | String | Application package name |
| `mSku` | String | Registered product SKU ID |
| `mPurchaseTime` | Long | Timestamp of purchase (ms) |
| `mPurchaseState` | Int | `0` = purchased, `1` = canceled/refunded |
| `mDeveloperPayload`| String | Custom developer payload string |
| `mToken` | String | Unique purchase verification token |
| `mOriginalJson` | String | Raw JSON string returned from Myket |
| `mSignature` | String | RSA signature of `mOriginalJson` |
| `mIsAutoRenewing`| Boolean | True if subscription auto-renews |

---

## 3. Flutter Integration

Use the official or community Myket Flutter IAP plugin (`myket_iap` / `flutter_poolakey` multi-flavor):

```yaml
dependencies:
  flutter:
    sdk: flutter
  myket_iap: ^1.2.0
```

```dart
import 'package:myket_iap/myket_iap.dart';

class MyketService {
  static const String rsaKey = "YOUR_MYKET_RSA_PUBLIC_KEY";

  Future<void> initBilling() async {
    final bool isReady = await MyketIap.init(rsaPublicKey: rsaKey);
    if (!isReady) throw Exception("Failed to initialize Myket billing");
  }

  Future<PurchaseResult> buy(String sku, {String payload = ""}) async {
    return await MyketIap.purchase(sku: sku, developerPayload: payload);
  }

  Future<bool> consume(String purchaseToken) async {
    return await MyketIap.consume(purchaseToken: purchaseToken);
  }
}
```

---

## 4. React Native Integration

Package: `react-native-myket-iab`

### Installation
```bash
npm install react-native-myket-iab --save
```

### Usage
```javascript
import React, { useEffect } from 'react';
import { NativeModules, Alert } from 'react-native';
import MyketBilling from 'react-native-myket-iab';

const MYKET_PUBLIC_KEY = "YOUR_MYKET_RSA_PUBLIC_KEY";

export async function setupMyket() {
  try {
    await MyketBilling.init(MYKET_PUBLIC_KEY);
    console.log("Myket Billing connected successfully");
  } catch (err) {
    console.error("Failed to connect to Myket:", err);
  }
}

export async function purchaseProduct(sku, payload = "") {
  try {
    const purchase = await MyketBilling.purchase(sku, payload);
    // Send to backend server for verification
    const verified = await verifyOnBackend(purchase.token, sku);
    if (verified && purchase.itemType === 'inapp') {
      await MyketBilling.consumePurchase(purchase);
    }
    return purchase;
  } catch (err) {
    Alert.alert("خطا در خرید", err.message);
    throw err;
  }
}
```

---

## 5. Unity Integration

Myket provides Unity packages supporting both **Unity with Gradle** (recommended for modern Unity 2020+) and traditional Unity packages.

1. Import `MyketIAB.unitypackage`.
2. Ensure `mainTemplate.gradle` has the Myket queries and billing permissions.
3. Use the C# billing bridge:
```csharp
using UnityEngine;
using System.Collections.Generic;

public class MyketBillingManager : MonoBehaviour {
    private const string RSA_KEY = "YOUR_MYKET_RSA_PUBLIC_KEY";

    void Start() {
        MyketIAB.init(RSA_KEY);
        MyketIAB.billingSupportedEvent += OnBillingSupported;
        MyketIAB.billingNotSupportedEvent += OnBillingNotSupported;
        MyketIAB.purchaseSucceededEvent += OnPurchaseSucceeded;
        MyketIAB.purchaseFailedEvent += OnPurchaseFailed;
    }

    void OnBillingSupported() {
        Debug.Log("Myket Billing Supported");
        // Query inventory
        MyketIAB.queryInventory(new string[] { "gem_100", "vip_pass" });
    }

    void OnBillingNotSupported(string error) {
        Debug.LogError("Myket Billing Error: " + error);
    }

    public void BuyProduct(string sku, string payload = "") {
        MyketIAB.purchaseProduct(sku, payload);
    }

    void OnPurchaseSucceeded(MyketPurchase purchase) {
        Debug.Log("Purchase succeeded: " + purchase.OrderId + " Token: " + purchase.Token);
        // Verify on server, then consume if consumable
        MyketIAB.consumeProduct(purchase.ProductId);
    }

    void OnPurchaseFailed(string error) {
        Debug.LogError("Purchase failed: " + error);
    }
}
```

---

## 6. Startup Inventory Sync & Zombie Purchase Recovery

Just like CafeBazaar, if a user's network cuts off or the app crashes after payment completes in Myket's checkout dialog before consumption or server verification:
1. The user has been charged by the bank.
2. The product remains unconsumed in Myket's database.
3. Future purchase attempts will fail with `BILLING_RESPONSE_RESULT_ITEM_ALREADY_OWNED (7)`.

**Solution:** Always query inventory (`queryInventoryAsync`) on every app startup. Iterate over `getAllPurchases()`, send any unfulfilled tokens to your backend, fulfill the items, and consume them immediately.
