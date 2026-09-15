# Troubleshooting & Exhaustive FAQs

## Frequently Asked Questions (FAQ)

### General & Conceptual
1. **Q: What is CafeBazaar In-App Billing (IAB)?**  
   **A:** A native billing framework that allows Android applications to sell digital goods, virtual currencies, unlocked content, and subscriptions directly within the app using CafeBazaar's secure checkout and wallet infrastructure.
2. **Q: Can I sell physical goods or physical services via IAB?**  
   **A:** No. CafeBazaar IAB is strictly for digital goods and services consumed in-app. Physical items with real-world delivery are prohibited.
3. **Q: Do I need a separate merchant account?**  
   **A:** No. Your existing CafeBazaar Developer Account is sufficient.
4. **Q: What devices are supported?**  
   **A:** Any device running Android 2.3+ with the CafeBazaar app installed.

---

### Product Management & SKUs
5. **Q: Can I change an SKU after creating it?**  
   **A:** No. Product SKUs (identifiers) are immutable once created. Titles, descriptions, and prices can be updated, but the SKU string cannot.
6. **Q: Can one app sell products belonging to another app?**  
   **A:** No. Products registered under Package A are strictly isolated and cannot be purchased from Package B.
7. **Q: What is the difference between Consumable and Non-Consumable products?**  
   **A:** Consumables can be purchased repeatedly and must be explicitly consumed via `consumeProduct` / API before they can be purchased again. Non-consumables are bought once, grant lifetime access, and must never be consumed.

---

### Subscriptions & Free Trials
8. **Q: Can a user have multiple active subscriptions simultaneously in one app?**  
   **A:** No. A user can only hold one active subscription plan per app at a time. If they upgrade (e.g. Bronze to Gold), the previous subscription is superseded and remaining days are credited/transferred.
9. **Q: What happens if a user's wallet has insufficient funds during auto-renewal?**  
   **A:** CafeBazaar sends SMS reminders to the user 5 days, 3 days, and 1 day prior to expiration. If funds are not added, the subscription expires and is not renewed.
10. **Q: How does Free Trial work?**  
    **A:** Developers can offer a 1–30 day trial. It is only accessible to first-time users who have never had any subscription in your app before. Each user gets at most one free trial in their lifetime.
11. **Q: How do I test subscriptions quickly without waiting 30 days?**  
    **A:** CafeBazaar allows creating 5-minute test subscriptions in the Developer Console specifically for development and QA testing.
12. **Q: How do I handle subscription price changes for existing users?**  
    **A:** If you alter the price of an existing subscription SKU, active users receive an SMS to approve the new price for their next renewal. If you wish to grandfather old users, create a new SKU with the higher price and show it only to new users.
13. **Q: What happens on refund of a subscription?**  
    **A:** The subscription is immediately terminated and removed from `active-subscriptions`. Ensure your app revokes access immediately upon detecting refund status (`purchaseState == 1`).

---

### Dynamic Pricing (تخفیف پویا)
14. **Q: Can Dynamic Pricing be used on subscriptions?**  
    **A:** Yes! The discount applies to the initial purchase only; subsequent auto-renewals bill at the standard console SKU price.
15. **Q: What does error "dynamic price not supported" mean?**  
    **A:** The user's CafeBazaar app version is older than `13.3.0`.
16. **Q: Where should the JWT secret key be kept?**  
    **A:** Strictly on your backend server. Never bundle it inside the Android client APK.

---

### SnappPay BNPL (خرید اعتباری)
17. **Q: Do I need to update my SDK or publish a new APK to support SnappPay?**  
    **A:** No. SnappPay BNPL is activated at the CafeBazaar checkout layer automatically for transactions over 20,000 Tomans.
18. **Q: Does SnappPay charge extra fees to users?**  
    **A:** No. End-users pay 0% extra fees or interest.
19. **Q: How can I disable SnappPay for my app if desired?**  
    **A:** Submit a support ticket to CafeBazaar developer support specifying your package name.

---

## Diagnostic Checklist

| Issue | Likely Cause | Solution |
|---|---|---|
| `BILLING_RESPONSE_RESULT_ITEM_ALREADY_OWNED (7)` | Consumable item was not consumed after previous purchase. | Call `consumeProduct` with the stored purchase token or query unconsumed items via `getPurchasedProducts`. |
| `BILLING_RESPONSE_RESULT_ITEM_UNAVAILABLE (4)` | SKU mismatch or product disabled in console. | Check SKU spelling and verify active status in Developer Console. |
| `BILLING_RESPONSE_RESULT_DEVELOPER_ERROR (5)` | Manifest missing permission, package name mismatch, or unsigned APK. | Ensure `PAY_THROUGH_BAZAAR` permission is present and package name matches console. |
| `queryFailed` on `getPurchasedProducts` | User is not logged into CafeBazaar on the device. | Prompt user to open CafeBazaar and sign into their account. |
| REST API returns `404 not_found` | Invalid purchase token or fake transaction attempt. | Reject transaction and flag potential fraudulent attempt. |
