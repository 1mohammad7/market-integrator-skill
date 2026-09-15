# CafeBazaar IAB Concepts & Product Models

## 1. Overview of Digital Products in CafeBazaar

CafeBazaar In-App Billing (IAB) manages digital transactions directly through the CafeBazaar Android app. All products must be created and configured in the **CafeBazaar Developer Console** (پیشخان توسعه‌دهندگان بازار) under the `پرداخت درون‌برنامه‌ای` (In-App Billing) tab.

---

## 2. Product Categories

### A. Consumable Products (محصولات مصرفی)
- **Concept:** Products that can be purchased repeatedly by the user (e.g. game coins, energy refills, AI tokens, workout boosts).
- **Consumption Requirement:** Once purchased, the product is in an "owned" state in Bazaar's database. The app **MUST** consume the product via `consumeProduct` (SDK) or `POST /consume` (REST API) before Bazaar will permit the user to purchase it again.
- **Unconsumed Lockout:** If an app fails to consume the purchase, subsequent attempts to buy the same SKU return `BILLING_RESPONSE_RESULT_ITEM_ALREADY_OWNED (7)`.
- **Fulfillment Rule:** Always deliver the digital asset to the user in your database **only after** the consumption request has succeeded (or confirm consumption immediately after).

### B. Non-Consumable Products (محصولات غیرمصرفی)
- **Concept:** One-time purchases with a permanent lifetime effect on the user's account (e.g. "Remove Ads", "Unlock Pro Features", "Lifetime Gym Plan").
- **Consumption Prohibition:** **NEVER** call `consumeProduct` on a non-consumable item.
- **Persistence:** Because the item remains permanently registered in Bazaar's database under the user's CafeBazaar account, calling `getPurchasedProducts()` or `getPurchases` on fresh installs or different devices restores the purchase automatically without repurchasing.

### C. Auto-Renewing Subscriptions (اشتراک دوره‌ای)
- **Billing Cycles:** 30 days, 60 days, 90 days, 180 days, 365 days.
- **Test Subscriptions:** 5-minute cycle products for fast testing during development.
- **Wallet Auto-Renewal:** Bazaar deducts renewal fees automatically from the user's CafeBazaar digital wallet on the expiration date.
- **Low Balance SMS Workflow:** If the user's wallet has insufficient funds, CafeBazaar sends SMS reminders to the user's mobile number:
  - **5 days** prior to expiration
  - **3 days** prior to expiration
  - **1 day** prior to expiration
- **Single Subscription per App Rule:** A user can only hold **one active subscription** per app at a time.
  - **Upgrades / Plan Changes:** If a user purchases a higher tier (e.g. Silver to Gold), the new subscription activates immediately, and the remaining days of the previous plan are added / credited to the new period.
- **Price Change Handling:**
  - If a developer changes the price of an existing subscription SKU, existing active subscribers receive an SMS from Bazaar asking for approval.
  - If approved, renewal occurs at the new price.
  - Best Practice: To keep legacy prices for existing users, create a new SKU with the new price for new users.
- **Non-consumable nature:** Subscriptions are strictly non-consumable.

### D. Free Trial Subscriptions (اشتراک آزمایشی رایگان)
- **Duration:** 1 to 30 days configurable in Developer Console.
- **Eligibility:** Available only to users who have **never before subscribed** to any plan in your app.
- **Lifetime Restriction:** Maximum of 1 free trial per user account in the app's history.
- **Automatic Conversion:** When the trial ends, Bazaar converts the subscription into a standard paid subscription by deducting the first period's fee from the user's wallet.
- **Verification:** Query `checkTrialSubscription` before rendering trial CTAs.

---

## 3. Product SKU (Stock Keeping Unit) Guidelines

When registering a product in the CafeBazaar console:
- **SKU Format:** Must begin with a lowercase Latin letter (`a-z`) or digit (`0-9`). Allowed characters: `a-z`, `0-9`, `_`, `.`.
- **Immutability:** Once created, an SKU cannot be modified, deleted, or re-used.
- **Title:** Recommended <= 25 characters for clean dialog rendering.
- **Description:** Clear explanation shown in the Bazaar checkout modal.
- **Price:** In **Iranian Rials (IRR)**. Must fall within minimum and maximum limits defined in the developer contract.

---

## 4. Lifecycle State Machine

```
[Create Product in Console]
            |
            v
[App Queries SKU Details: getSkuDetails]
            |
            v
[Initiate Purchase: purchaseProduct / subscribeProduct]
            |
            v
      [Checkout Dialog]
      /               \
[Cancelled]        [Paid]
      |               |
      v               v
 [Error/Cancel]   [purchaseSucceed: Token + OrderId + Signature]
                      |
                      v
             [Validate on Backend via REST API v2]
                      |
       +--------------+---------------+
       |                              |
[Consumable]                   [Non-Consumable / Sub]
       |                              |
[consumeProduct / API]         [Store entitlement in DB]
       |                              |
[Credit Coins/Gems in DB]             v
       |                          [Fulfill Pro]
       v
   [Done]
```
