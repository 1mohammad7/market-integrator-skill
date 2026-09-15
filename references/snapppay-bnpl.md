# SnappPay BNPL (خرید اعتباری اسنپ‌پی) Integration & Economics

## 1. Overview

**SnappPay BNPL (Buy Now Pay Later / خرید اعتباری اسنپ‌پی)** is integrated into CafeBazaar's In-App Billing infrastructure. It allows users to split purchases into installments or pay next month without paying any interest or surcharge.

### Key Characteristics:
- **Default Status:** Enabled by default on CafeBazaar for all apps with In-App Billing.
- **Minimum Transaction Amount:** > **20,000 Tomans (200,000 Rials)**.
- **Developer Work Required:** **Zero code or SDK changes**. Handled seamlessly inside Bazaar checkout.
- **End-User Cost:** Free (0% interest, no penalty if paid on time).

---

## 2. Payment Modes

1. **Single Installment (پرداخت تک‌قسط):** User pays total balance at the end of the current month.
2. **Four Installments (پرداخت چهار قسط):** User pays 1/4th immediately and remaining 3/4th in equal monthly installments.

---

## 3. Commission Structure & Revenue Calculation

SnappPay charges a base commission for underwriting credit risk and processing installments. The deduction workflow occurs as follows:

```
[Gross Transaction Amount]
          |
          v
[Deduct SnappPay Fee + 10% VAT on Fee]
          |
          v
[Deduct 10% Value Added Tax (VAT) on Remaining Base]
          |
          v
[Deduct CafeBazaar Commission (15% or 30%)]
          |
          v
[Net Developer Payout (Credited to Settleable Balance)]
```

### Fee Matrix

| Payment Option | Base SnappPay Rate | VAT on Fee (10%) | Total SnappPay Cut |
|---|---|---|---|
| **Single Installment (تک قسط)** | 4.5% | +0.45% | **4.95%** |
| **Four Installments (چهار قسط)** | 9.0% | +0.90% | **9.90%** |

---

## 4. Worked Numerical Examples (1,000,000 Tomans Transaction)

### Example 1: Single Installment (تک قسط)

- **Gross Amount:** 1,000,000 Tomans
- **SnappPay Fee (inc. VAT):** $1,000,000 \times 4.95\% = 49,500\text{ Tomans}$
- **Net Base:** $1,000,000 - 49,500 = 950,500\text{ Tomans}$
- **VAT (10% on Net Base):** 95,050 Tomans
- **Base for Bazaar / Dev Split:** $950,500 - 95,050 = 855,450\text{ Tomans}$

#### Dev Tier Comparison:
1. **Tier A (Developer Share 85% / Bazaar Share 15% - Annual Revenue < 1B Toman):**
   - Bazaar Commission (15%): 128,318 Tomans
   - **Net Developer Payout:** **727,133 Tomans**
2. **Tier B (Developer Share 70% / Bazaar Share 30% - Annual Revenue >= 1B Toman):**
   - Bazaar Commission (30%): 256,635 Tomans
   - **Net Developer Payout:** **598,815 Tomans**

---

### Example 2: Four Installments (چهار قسط)

- **Gross Amount:** 1,000,000 Tomans
- **SnappPay Fee (inc. VAT):** $1,000,000 \times 9.90\% = 99,000\text{ Tomans}$
- **Net Base:** $1,000,000 - 99,000 = 901,000\text{ Tomans}$
- **VAT (10% on Net Base):** 90,100 Tomans
- **Base for Bazaar / Dev Split:** $901,000 - 90,100 = 810,900\text{ Tomans}$

#### Dev Tier Comparison:
1. **Tier A (85% Dev / 15% Bazaar):**
   - Bazaar Commission (15%): 121,635 Tomans
   - **Net Developer Payout:** **689,265 Tomans**
2. **Tier B (70% Dev / 30% Bazaar):**
   - Bazaar Commission (30%): 243,270 Tomans
   - **Net Developer Payout:** **567,630 Tomans**

---

## 5. Settlement & Deactivation

- **Settlement Timeline:** Identical to standard CafeBazaar payouts. No delay or withholding for multi-month installments; the developer receives full payout upon initial settlement cycle.
- **Refund Handling:** Handled via standard CafeBazaar refund API within the 7-day refund window.
- **Deactivation (Opt-Out):**
  - If a developer desires to disable SnappPay BNPL for an app, submit a support ticket in the Developer Console specifying the app package name.
