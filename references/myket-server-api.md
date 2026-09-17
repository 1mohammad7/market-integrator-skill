# Myket Server-to-Server REST APIs

Complete specification of Myket's backend REST APIs for server-side purchase verification, item consumption, SKU management, and continuous delivery (CD).

---

## 1. Authentication & Security

All requests to the Myket Developer API require an API Access Token passed in the HTTP request header:

```http
X-Access-Token: <YOUR_MYKET_ACCESS_TOKEN>
Content-Type: application/json
```

### Obtaining the Access Token
1. Log in to the [Myket Developer Console](https://developer.myket.ir/).
2. Navigate to your Developer Account Settings -> API Tokens / دسترسی به API.
3. Generate an API token and store it securely in your backend environment variables (`MYKET_ACCESS_TOKEN`).
4. **NEVER** expose this token in client APKs, web bundles, or public git repositories.

---

## 2. Server-Side Purchase Verification API

Validates that a purchase token received from a mobile client is legitimate, paid, and currently valid.

### HTTP Request
```http
POST https://developer.myket.ir/api/partners/applications/{PACKAGE_NAME}/purchases/products/{SKU_ID}/verify
X-Access-Token: {ACCESS_TOKEN}
Content-Type: application/json

{
  "tokenId": "{TOKEN_ID}"
}
```

### URL Parameters
- `{PACKAGE_NAME}`: Android application package name (e.g. `ir.fitsme.app`).
- `{SKU_ID}`: Product SKU identifier (e.g. `coins_500` or `sub_monthly_vip`).

### Request Body
```json
{
  "tokenId": "3f82a9c1-4829-4d2a-b731-9f2d1e0a84b2"
}
```

### Response (200 OK)
```json
{
  "kind": "androidpublisher#productPurchase",
  "purchaseTime": 1492839267000,
  "developerPayload": "user_id_104928_ref_9921",
  "purchaseState": 0,
  "consumptionState": 1
}
```

### Field Definitions
| Field | Type | Description |
|---|---|---|
| `kind` | String | `androidpublisher#productPurchase` |
| `purchaseTime` | Long | Unix timestamp in milliseconds when purchase was finalized. |
| `developerPayload` | String | Custom payload string sent during the purchase. |
| `purchaseState` | Integer | `0` = Valid Purchase, `1` = Canceled / Refunded. |
| `consumptionState` | Integer | `0` = Consumed, `1` = Not Consumed (Yet to be consumed). |

> [!CRITICAL]
> Only grant in-app benefits if:
> 1. `response.status === 200`
> 2. `response.data.purchaseState === 0`
> 3. `response.data.developerPayload` matches your user session / database hash.

---

## 3. Server-Side Consumption API

Marks a consumable product as consumed on Myket servers. Once consumed, the user is permitted to buy the product again.

### HTTP Request
```http
POST https://developer.myket.ir/api/partners/applications/{PACKAGE_NAME}/purchases/products/{SKU_ID}/consume
X-Access-Token: {ACCESS_TOKEN}
Content-Type: application/json

{
  "tokenId": "{TOKEN_ID}"
}
```

### Request Body
```json
{
  "tokenId": "{TOKEN_ID}"
}
```

### Response (200 OK)
Returns HTTP status `200 OK` on successful consumption.

---

## 4. SKU Management API

Programmatically manage products in the Myket Developer Console without manual web UI entries.

### List All SKUs
```http
GET https://developer.myket.ir/api/partners/applications/{PACKAGE_NAME}/sku
X-Access-Token: {ACCESS_TOKEN}
```

### Create New SKU
```http
POST https://developer.myket.ir/api/partners/applications/{PACKAGE_NAME}/sku
X-Access-Token: {ACCESS_TOKEN}
Content-Type: application/json

{
  "sku": "gems_500",
  "title": "۵۰۰ الماس",
  "description": "بسته ۵۰۰ تایی الماس برای ارتقاء کاراکتر",
  "price": 500000,
  "type": "Consumable"
}
```

### Update Existing SKU
```http
PUT https://developer.myket.ir/api/partners/applications/{PACKAGE_NAME}/sku/{SKU_ID}
X-Access-Token: {ACCESS_TOKEN}
Content-Type: application/json

{
  "title": "۵۰۰ الماس (تخفیف ویژه)",
  "price": 400000
}
```

---

## 5. Developer Continuous Deployment (CD) API

Automate APK/AAB builds and releases directly from your CI/CD pipeline (e.g. GitHub Actions, GitLab CI, Fastlane).

- **Endpoints for Publishing:**
  - Create Release Draft
  - Upload APK / Multiple APKs (by ABI / Screen density)
  - Set Release Notes / Changelog
  - Trigger Gradual Rollout (e.g. 10%, 25%, 50%, 100%)
  - Finalize & Publish to Myket review queue

---

## 6. HTTP Error Codes & Troubleshooting

| HTTP Status | Error Code / Message | Probable Cause & Resolution |
|---|---|---|
| `400` | `BadRequest` | Malformed JSON body or invalid `tokenId` string format. |
| `401` | `Unauthorized` | `X-Access-Token` is missing, expired, or belongs to a different developer account. |
| `404` | `NotFound` | Package name, SKU ID, or Purchase Token does not exist on Myket servers. |
| `500` | `InternalError` | Temporary Myket server error. Implement exponential backoff retry (up to 3 times). |

### Sample Error Response:
```json
{
  "code": 500,
  "messageCode": "InternalError",
  "translatedMessage": "خطایی رخ داده است."
}
```
