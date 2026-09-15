# Security, Anti-Fraud & Verification Architecture

## 1. Threat Models & Attack Vectors

When implementing In-App Billing, client devices are fundamentally untrusted environments. Common attack vectors include:
1. **Lucky Patcher / Freedom / Emulated Billing Services:** Local apps intercepting AIDL intent calls and returning fake `BILLING_RESPONSE_RESULT_OK` with fake signatures.
2. **Receipt Replay Attacks:** Sending a valid `purchaseToken` from one user's account to credit a different user's account or multiple accounts.
3. **Decompilation & Constant Substitution:** Decompiling APK, replacing developer RSA public key with attacker's key, and repackaging.
4. **Unconsumed State Exploits:** Exploiting network timeouts between payment completion and consumption.

---

## 2. Multi-Layer Defense Architecture

```
Layer 1: Android Client (Poolakey RSA Check + Proguard Obfuscation)
                         |
                         v
Layer 2: Cryptographic Developer Payload (Bound to User ID + HMAC)
                         |
                         v
Layer 3: Backend REST API v2 Verification (Direct S2S Query to CafeBazaar)
                         |
                         v
Layer 4: Idempotent Database Transaction & Replay Prevention Store
```

---

## 3. Developer Payload Security (Crucial)

Always generate a cryptographically verifiable `developerPayload` on your backend server before initiating checkout:

```kotlin
// Example format: "userId:timestamp:signature"
val payload = "user_74921:1740236400:a1b2c3d4..."
```

### Backend Generation & Verification:
```javascript
const crypto = require('crypto');

function createDeveloperPayload(userId, serverSecret) {
  const timestamp = Date.now();
  const data = `${userId}:${timestamp}`;
  const hmac = crypto.createHmac('sha256', serverSecret).update(data).digest('hex');
  return `${data}:${hmac}`;
}

function verifyDeveloperPayload(payloadString, expectedUserId, serverSecret, maxAgeMs = 3600000) {
  const parts = payloadString.split(':');
  if (parts.length !== 3) return false;
  const [userId, timestampStr, hmac] = parts;
  
  if (userId !== expectedUserId) return false;
  
  const timestamp = parseInt(timestampStr, 10);
  if (Date.now() - timestamp > maxAgeMs) return false; // Token expired
  
  const expectedHmac = crypto.createHmac('sha256', serverSecret).update(`${userId}:${timestampStr}`).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac));
}
```

---

## 4. Server-Side RSA Signature Verification

In addition to querying the REST API, you can verify the raw `INAPP_DATA_SIGNATURE` returned from the client using the Developer Public RSA Key:

```python
import base64
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.serialization import load_der_public_key

def verify_bazaar_rsa_signature(purchase_json_data: str, signature_b64: str, rsa_public_key_b64: str) -> bool:
    try:
        public_key_bytes = base64.b64decode(rsa_public_key_b64)
        public_key = load_der_public_key(public_key_bytes)
        
        signature = base64.b64decode(signature_b64)
        data_bytes = purchase_json_data.encode('utf-8')
        
        public_key.verify(
            signature,
            data_bytes,
            padding.PKCS1v15(),
            hashes.SHA1()
        )
        return True
    except Exception as e:
        return False
```

---

## 5. Database Schema for Replay & Idempotency

Ensure your database enforces uniqueness on `purchase_token` and `order_id`:

```sql
CREATE TABLE in_app_purchases (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    order_id VARCHAR(64) NOT NULL UNIQUE,
    purchase_token VARCHAR(255) NOT NULL UNIQUE,
    sku VARCHAR(64) NOT NULL,
    purchase_time BIGINT NOT NULL,
    consumption_state INT DEFAULT 1,
    purchase_state INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 6. Proguard & Code Hardening

Add these rules to `proguard-rules.pro` to protect billing code and prevent reverse-engineering of endpoints:

```proguard
-keep class com.android.vending.billing.** { *; }
-keep class com.github.cafebazaar.poolakey.** { *; }

# Repackage & obfuscate internal classes
-repackageclasses ''
-allowaccessmodification
-optimizations !code/simplification/arithmetic,!field/*,!class/merging/*
```
