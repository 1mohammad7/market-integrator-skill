# Dynamic Pricing (تخفیف پویا) JWT Specification

## 1. Overview

**Dynamic Pricing (تخفیف پویا)** enables developers to sell any existing In-App Billing product or subscription at a custom discounted price without defining multiple duplicate SKUs in the CafeBazaar console.

### Key Rules:
1. **Initial Purchase Discount Only on Subscriptions:** For subscriptions, the discounted price is billed for the first cycle. Automatic renewals bill at the regular panel price.
2. **Client Version:** Requires CafeBazaar app version **13.3.0 or higher** and the **Poolakey** library.
3. **Server-Side Generation Mandatory:** The secret key must never reside on mobile clients. JWT generation must occur on the backend server.
4. **Single-Use Tokens:** Each JWT token is consumed upon checkout initiation.

---

## 2. JWT Structure & Claims

- **Header:**
  ```json
  {
    "alg": "HS256",
    "typ": "JWT"
  }
  ```
  *(Supported algorithms: `HS256`, `HS384`, `HS512`)*

- **Payload Schema:**
  ```json
  {
    "price": 500000,
    "package_name": "com.example.fitme",
    "sku": "premium_monthly",
    "exp": 1740240000,
    "account_id": "bazaar_user_acc_id_optional",
    "nonce": "unique_random_string_optional"
  }
  ```

### Claims Definition:

| Claim | Type | Required | Description |
|---|---|---|---|
| `price` | Number (Integer) | **Yes** | The discounted price in **Rials (IRR)**. Must be $\le$ the registered price in the Bazaar console. |
| `package_name` | String | **Yes** | The application package name. |
| `sku` | String | **Yes** | The product or subscription SKU. |
| `exp` | Number (Integer) | **Yes** | Expiration timestamp in **UTC Unix Timestamp (seconds)**. |
| `account_id` | String | No | Unique CafeBazaar Account ID of the user (requires Login with Bazaar). |
| `nonce` | String | No | Cryptographic random string to ensure unique token generation for identical parameters. |

---

## 3. Server-Side Token Generation Examples

### A. Node.js (jsonwebtoken)
```javascript
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function generateDynamicPriceToken({
  priceInRials,
  packageName,
  sku,
  expiresInSeconds = 600, // 10 minutes valid
  accountId = null,
  secretKey
}) {
  const payload = {
    price: Math.floor(priceInRials),
    package_name: packageName,
    sku: sku,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    nonce: crypto.randomBytes(16).toString('hex')
  };

  if (accountId) {
    payload.account_id = accountId;
  }

  return jwt.sign(payload, secretKey, {
    algorithm: 'HS256',
    header: { typ: 'JWT', alg: 'HS256' }
  });
}

module.exports = { generateDynamicPriceToken };
```

### B. Python (PyJWT)
```python
import time
import secrets
import jwt

def generate_dynamic_price_token(
    price_in_rials: int,
    package_name: str,
    sku: str,
    secret_key: str,
    expires_in_seconds: int = 600,
    account_id: str = None
) -> str:
    payload = {
        "price": int(price_in_rials),
        "package_name": package_name,
        "sku": sku,
        "exp": int(time.time()) + expires_in_seconds,
        "nonce": secrets.token_hex(16)
    }
    
    if account_id:
        payload["account_id"] = account_id
        
    token = jwt.encode(
        payload=payload,
        key=secret_key,
        algorithm="HS256",
        headers={"typ": "JWT", "alg": "HS256"}
    )
    
    return token
```

---

## 4. Error Code Reference (کدهای خطای تخفیف پویا)

If an error occurs during checkout with Dynamic Pricing, CafeBazaar returns one of the following numeric error codes:

| Error Code | Description | Meaning & Resolution |
|---|---|---|
| **1** | Internal Server Error | Error on CafeBazaar server. Contact Bazaar developer support with JWT and user details. |
| **2** | Malformed JWT | The JWT token structure is invalid (check Base64URL encoding). |
| **3** | Unsupported Algorithm | Algorithm is not `HS256`, `HS384`, or `HS512`. |
| **4** | Invalid / Tampered Signature | Signature does not match secret key or payload was modified. |
| **5** | Token Expired | The `exp` timestamp is in the past. Generate a fresh token. |
| **6** | Missing Mandatory Field | One of `price`, `package_name`, `sku`, or `exp` is missing. |
| **7** | `account_id` Mismatch | The user's CafeBazaar account does not match the `account_id` claim in JWT. |
| **8** | Product SKU Not Found | SKU does not exist in the Developer Console. |
| **9** | Package Name Not Found | Package name does not match the app. |
| **10** | Price Exceeds Panel Price | The `price` claim is greater than the registered base price of the SKU in console. |
| **11** | Token Already Used | Token was already used in a prior transaction. Tokens are single-use. |
| **12** | Invalid Price | Price is invalid (e.g. negative number or zero). |
| **13** | Invalid `sku` Type | `sku` must be a JSON String. |
| **14** | Invalid `package_name` Type | `package_name` must be a JSON String. |
| **15** | Invalid `price` Type | `price` must be a JSON Number (Integer). |
| **16** | Invalid Claim Type | One or more JWT claims have invalid types. |

---

## 5. Security Checklist for Dynamic Pricing
- [x] Sign tokens **strictly on backend**. Never bundle secret keys in APKs.
- [x] Always include `nonce` with cryptographically secure randomness (`SecureRandom` / `crypto.randomBytes`).
- [x] Set short expiration windows (`exp` = 5 to 15 minutes max).
- [x] Bind `account_id` when targeted discounting is desired (prevents token sharing between users).
- [x] In case of leaked secret key: Revoke key immediately in CafeBazaar console (note: invalidates all previously generated tokens).
