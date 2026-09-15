# CafeBazaar Developer REST API v2 Specification

## 1. Overview & Setup

The **CafeBazaar Developer REST API v2** allows server-to-server validation, purchase status inquiries, subscription life-cycle checks, remote consumption, and refunds without relying on the mobile client.

### Key Details:
- **Base URL:** `https://pardakht.cafebazaar.ir/devapi/v2/api/`
- **Authentication Header:** `CAFEBAZAAR-PISHKHAN-API-SECRET: <SECRET_TOKEN>`
- **Token Generation:** Generated inside CafeBazaar Developer Console under:  
  `My Apps -> [Select App] -> API پیشخان بازار -> دریافت توکن جدید (Generate New Token)`.
  *Must be generated using the primary Publisher account.*
- **Rate Limit:** 50,000 requests per day per developer account. Contact Bazaar developer support for quota increases.

---

## 2. API Endpoints Reference

### A. Validate In-App Purchase (بررسی وضعیت خرید درون‌برنامه‌ای)
Checks the purchase state, consumption state, and developer payload of a non-consumable or consumable item.

- **HTTP Method:** `GET`
- **URL:** `https://pardakht.cafebazaar.ir/devapi/v2/api/validate/<package_name>/inapp/<product_id>/purchases/<purchase_token>/`
- **Parameters:**
  - `<package_name>`: Application package name (e.g. `com.example.fitme`).
  - `<product_id>`: Product SKU registered in console.
  - `<purchase_token>`: Purchase token returned by client SDK.

#### cURL Example:
```bash
curl -X GET "https://pardakht.cafebazaar.ir/devapi/v2/api/validate/com.example.fitme/inapp/coins_100/purchases/abc123tokenxyz/" \
     -H "CAFEBAZAAR-PISHKHAN-API-SECRET: your_api_secret_token_here"
```

#### Success Response (200 OK):
```json
{
   "consumptionState": 1,
   "purchaseState": 0,
   "kind": "androidpublisher#inappPurchase",
   "developerPayload": "user_id_4821",
   "purchaseTime": 1740236400000
}
```

#### Field Meanings:
| Field | Type | Description |
|---|---|---|
| `purchaseState` | Integer | `0` = Normal / Valid Purchase, `1` = Refunded (مرجوع شده). |
| `consumptionState` | Integer | `0` = Consumed (مصرف شده), `1` = Unconsumed (مصرف نشده). |
| `kind` | String | Always `"androidpublisher#inappPurchase"`. |
| `developerPayload` | String | Payload sent during purchase initiation. |
| `purchaseTime` | Long | Timestamp in milliseconds since Unix epoch (Jan 1, 1970 UTC). |

#### Error Responses:
| HTTP Code | JSON Error Response | Meaning |
|---|---|---|
| `404` | `{"error": "not_found", "error_description": "The requested purchase is not found!"}` | Purchase does not exist (potential fraud/tampering). |
| `404` | `{"error": "invalid_value", "error_description": "Package name is invalid"}` | Package name not found or mismatch. |
| `404` | `{"error": "invalid_value", "error_description": "Product is not found"}` | SKU does not exist under this package. |

---

### B. Consume In-App Purchase via Server (مصرف خرید درون‌برنامه‌ای)
Allows backend server to consume a purchase directly.

- **HTTP Method:** `POST`
- **URL:** `https://pardakht.cafebazaar.ir/devapi/v2/api/consume/<package_name>/purchases/`
- **Headers:**
  - `CAFEBAZAAR-PISHKHAN-API-SECRET: <SECRET_TOKEN>`
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "token": "<purchase_token>"
}
```

#### cURL Example:
```bash
curl -X POST "https://pardakht.cafebazaar.ir/devapi/v2/api/consume/com.example.fitme/purchases/" \
     -H "CAFEBAZAAR-PISHKHAN-API-SECRET: your_api_secret_token_here" \
     -H "Content-Type: application/json" \
     -d '{"token": "abc123tokenxyz"}'
```

#### Success Response: `200 OK`
```json
{}
```

#### Error Responses:
| HTTP Code | Error Key | Description | Cause |
|---|---|---|---|
| `400` | `already_consumed` | The purchase has already been consumed. | Already consumed previously. |
| `400` | `is_subscription` | Can not consume subscription. | Attempted to consume a subscription SKU. |
| `400` | `is_refunded` | The purchase has been refunded. | Cannot consume refunded transaction. |
| `404` | `not_found` | The requested purchase is not found! | Token not found. |
| `404` | `invalid_value` | Invalid token! | Malformed purchase token. |

---

### C. Check User's Active Subscriptions (بررسی اشتراک فعال)
Queries all currently active subscriptions associated with a given purchase token of a user.

- **HTTP Method:** `GET`
- **URL:** `https://pardakht.cafebazaar.ir/devapi/v2/api/applications/<package_name>/active-subscriptions/<token>/`
- **Parameters:**
  - `<package_name>`: Application package name.
  - `<token>`: Any purchase token from the user (can be initial purchase token or renewal token).

#### cURL Example:
```bash
curl -X GET "https://pardakht.cafebazaar.ir/devapi/v2/api/applications/com.example.fitme/active-subscriptions/user_token_123/" \
     -H "CAFEBAZAAR-PISHKHAN-API-SECRET: your_api_secret_token_here"
```

#### Success Response (200 OK):
```json
{
  "subscriptions": [
    {
      "kind": "androidpublisher#subscriptionPurchase",
      "initiationTimestampMsec": 1740236400000,
      "validUntilTimestampMsec": 1742828400000,
      "autoRenewing": true,
      "linkedSubscriptionToken": "linked_sub_token_abc",
      "sku": "premium_monthly_30d"
    }
  ]
}
```

> [!IMPORTANT]
> **Server-side Active Verification Rule:** Always compare `validUntilTimestampMsec` against current UTC timestamp (`Date.now()`). If `validUntilTimestampMsec < Date.now()`, the subscription has expired.

#### Error Responses:
| HTTP Code | Error Key | Description | Cause |
|---|---|---|---|
| `404` | `not_found` | no subscription found! | User has no active subscriptions. |
| `404` | `not_found` | token not found! | Invalid or unknown token. |

---

### D. Check Specific Subscription Status
- **HTTP Method:** `GET`
- **URL:** `https://pardakht.cafebazaar.ir/devapi/v2/api/applications/<package_name>/subscriptions/<subscription_id>/purchases/<purchase_token>`

#### Success Response (200 OK):
```json
{
  "kind": "androidpublisher#subscriptionPurchase",
  "initiationTimestampMsec": 1740236400000,
  "validUntilTimestampMsec": 1742828400000,
  "autoRenewing": true,
  "linkedSubscriptionToken": "YYNaa3I0uquyEA8X"
}
```

---

### E. Cancel Subscription (لغو تمدید خودکار اشتراک)
Cancels the auto-renewal of a subscription. The user retains access until `validUntilTimestampMsec`.

- **HTTP Method:** `GET` or `POST`
- **URL:** `https://pardakht.cafebazaar.ir/devapi/v2/api/applications/<package_name>/subscriptions/<subscription_id>/purchases/<purchase_token>/cancel/`

#### Success Response (200 OK):
```json
{}
```

#### Error Responses:
| HTTP Code | Error Key | Description | Cause |
|---|---|---|---|
| `400` | `invalid_value` | Subscription has been cancelled before | Already cancelled. |
| `400` | `invalid_value` | Subscription has been expired | Subscription is already past its end date. |
| `404` | `not_found` | The requested subscription is not found | SKU or token not found. |

---

### F. Refund In-App Purchase or Subscription (استرداد وجه)
Executes a refund for an in-app product or subscription. Must be executed within **7 days** of purchase date.

- **HTTP Method:** `POST`
- **URL:** `https://pardakht.cafebazaar.ir/devapi/v2/api/refund/<package_name>/purchases/<purchase_token>/`

#### Success Response (200 OK):
```json
{
   "consumptionState": 1,
   "purchaseState": 1,
   "kind": "androidpublisher#inappPurchase",
   "developerPayload": "user_id_4821",
   "purchaseTime": 1740236400000
}
```
*Notice: `purchaseState` switches to `1` (Refunded).*

#### Error Responses:
| HTTP Code | Error Key | Description |
|---|---|---|
| `400` | `bad_request` | Previously Refunded |
| `404` | `not_found` | The requested purchase is not found! |
