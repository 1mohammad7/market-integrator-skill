# Market Integrator Skill (کافه‌بازار و مایکت)

[![Antigravity Skill](https://img.shields.io/badge/Antigravity-Skill-blueviolet.svg)](#)
[![CafeBazaar API](https://img.shields.io/badge/CafeBazaar-REST%20API%20v2-22c55e.svg)](https://developers.cafebazaar.ir/)
[![Myket API](https://img.shields.io/badge/Myket-Partner%20API-0ea5e9.svg)](https://developer.myket.ir/)
[![Poolakey SDK](https://img.shields.io/badge/Poolakey-v2.2.0-blue.svg)](https://github.com/cafebazaar/Poolakey)
[![Platforms](https://img.shields.io/badge/Platforms-Android%20%7C%20Capacitor%20%7C%20Flutter%20%7C%20React%20Native%20%7C%20Unity%20%7C%20Node.js%20%7C%20Python-orange.svg)](#)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An end-to-end integration toolkit, production-ready boilerplate library, and specialized AI Agent skill for implementing **CafeBazaar** and **Myket** In-App Billing (IAB), In-App Updates, Developer REST APIs, Dynamic Pricing JWT, and SnappPay BNPL in modern mobile applications (Android Kotlin/Java, Capacitor, Flutter, React Native, Unity) and backend services (Node.js & Python).

---

## 📖 Table of Contents

- [Overview](#overview)
- [Skill Commands & Agent Protocols](#skill-commands--agent-protocols)
- [Market Comparison Matrix](#market-comparison-matrix)
- [Architecture](#architecture)
- [Monetization & Product Types](#monetization--product-types)
- [Repository Structure](#repository-structure)
- [Multi-Store Integration Guides](#multi-store-integration-guides)
  - [1. Android Native (Kotlin/Java)](#1-android-native-kotlinjava)
  - [2. Unified Backend REST Service (Node.js Express)](#2-unified-backend-rest-service-nodejs-express)
  - [3. Unified Backend REST Service (Python FastAPI)](#3-unified-backend-rest-service-python-fastapi)
  - [4. Unity (C#)](#4-unity-c)
  - [5. React Native & Flutter](#5-react-native--flutter)
- [Security & Anti-Fraud Best Practices](#security--anti-fraud-best-practices)
- [References & In-Depth Documentation](#references--in-depth-documentation)

---

## Overview

Monetizing Android applications in Iran requires integrating with the two dominant app stores: **CafeBazaar** (>45M users) and **Myket** (>25M users). While both utilize Android IPC (AIDL) under the hood, their client SDKs, manifest package queries, permissions, server REST API endpoints, and authentication schemes differ.

This skill equips AI agents and developers with:
1. **Adaptive Agent Protocols:** Cognitive skill commands (`integrate`, `setup-iab`, `setup-backend`) that intelligently inspect the project stack, detect architecture, and wire store integration idiomatic to the app.
2. **Unified Client & Server Abstractions:** Write code once; let the unified repository and backend router handle store-specific details.
3. **AI Agent Skill (`SKILL.md`):** Ready-to-load instructions enabling Antigravity and AI coding agents to autonomously implement, diagnose, and maintain Iranian app store integrations.

---

## Skill Commands & Agent Protocols

| Command | Category | Action | Primary Reference |
|---|---|---|---|
| `integrate [store] [platform]` | Full-Stack | Inspects existing app and wires full-stack client & server store integration | [references/multi-store-architecture.md](references/multi-store-architecture.md) |
| `setup-iab [store]` | Client | Implements client-side in-app billing manager and lifecycle listeners | [references/myket-iab-guide.md](references/myket-iab-guide.md) & [references/poolakey-android-guide.md](references/poolakey-android-guide.md) |
| `setup-backend [framework]` | Backend | Implements server-to-server purchase verification and consumption routes | [references/myket-server-api.md](references/myket-server-api.md) & [references/server-rest-api-v2.md](references/server-rest-api-v2.md) |
| `setup-updates [store]` | Auxiliary | Adds In-App Update SDK or Version Check service to keep users updated | [references/myket-services-and-intents.md](references/myket-services-and-intents.md) |
| `audit-store-readiness` | Quality / Sec | Audits manifests, queries, Proguard rules, secrets, and anti-replay indices | [references/security-anti-fraud.md](references/security-anti-fraud.md) |

---

## Market Comparison Matrix

| Feature | CafeBazaar (کافه‌بازار) | Myket (مایکت) |
|---|---|---|
| **Package Name** | `com.farsitel.bazaar` | `ir.mservices.market` |
| **Client Library** | Poolakey (`com.github.cafebazaar.Poolakey:poolakey:2.2.0`) | Myket IAB (`IabHelper` / `myket_iap` / `react-native-myket-iab`) |
| **Android Query Action** | `ir.cafebazaar.pardakht.InAppBillingService.BIND` | `ir.mservices.market.InAppBillingService.BIND` |
| **Billing Permission** | `com.farsitel.bazaar.permission.PAY_THROUGH_BAZAAR` | `com.android.vending.BILLING` |
| **Server Validation Endpoint**| `GET /devapi/v2/api/validate/<pkg>/inapp/<sku>/purchases/<token>/` | `POST /api/partners/applications/{pkg}/purchases/products/{sku}/verify` |
| **Server Auth Header** | `CAFEBAZAAR-PISHKHAN-API-SECRET: <SECRET>` | `X-Access-Token: <TOKEN>` |
| **Server Consumption** | `POST /devapi/v2/api/consume/<pkg>/purchases/` | `POST /api/partners/applications/{pkg}/purchases/products/{sku}/consume` |
| **Dynamic Pricing (تخفیف پویا)**| Supported natively via Backend JWT (`HS256`) | Not supported (uses dedicated discount SKUs) |
| **BNPL Installments** | SnappPay (automatic for purchases >20,000 Tomans) | Market wallet / bank gateways |
| **In-App Update SDK** | Supported via Intent / In-App Update | `MyketSupportHelper` AIDL & In-App Update SDK |
| **Rate App Intent** | `bazaar://details?id=<pkg>` | `myket://comment?id=<pkg>` |

---

## Architecture

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT DEVICE                                     |
|                                                                                   |
|   +--------------------------+               +--------------------------------+   |
|   |   Your Mobile App        |   IPC (AIDL)  |   CafeBazaar / Myket Client    |   |
|   |  (Unified Billing Repo)  | <===========> |    (Payment Flow & Wallet)     |   |
|   +--------------------------+               +--------------------------------+   |
|                 |                                             |                   |
+-----------------|---------------------------------------------|-------------------+
                  | HTTPS (Token, SKU, Store)                   | HTTPS
                  v                                             v
+------------------------------------+         +------------------------------------+
|        Your Backend Server         |  REST   |      Market Billing Servers        |
|   - Unified Verification Router    | ======> |  - pardakht.cafebazaar.ir          |
|   - Replay Prevention (DB Index)   | (API)   |  - developer.myket.ir              |
|   - Entitlement Provisioning       |         |                                    |
+------------------------------------+         +------------------------------------+
```

---

## Monetization & Product Types

| Product Type | Persian Term | Multi-Purchase? | Must Consume? | Reinstall Persistence | Common Examples |
|:---|:---|:---:|:---:|:---:|:---|
| **Consumable** | محصولات مصرفی | ✅ Unlimited | ✅ **Mandatory** (`consumePurchase`) | ❌ No (consumed immediately) | Coins, gems, credits, hints |
| **Non-Consumable** | محصولات غیرمصرفی | ❌ Once / account | ❌ **Never consume** | ✅ Yes (`getPurchasedProducts`) | Remove Ads, Lifetime Pro |
| **Subscription** | اشتراک دوره‌ای | ❌ 1 active plan / app | ❌ Cannot consume | ✅ Yes (during valid period) | 30/60/90/180/365-day access |
| **Free Trial** | اشتراک آزمایشی | ❌ Once in user lifetime | ❌ Cannot consume | ✅ Converts to paid | 1 to 30 days trial period |

---

## Repository Structure

```
.
├── SKILL.md                                 # Complete Agent Skill Definition & Workflow Guide
├── README.md                                # Project overview and developer reference
├── examples/                                # Production-ready code implementations
│   ├── android-kotlin/
│   │   ├── BillingRepository.kt             # Poolakey Kotlin wrapper
│   │   └── multi-store/
│   │       └── MarketBillingRepository.kt   # Unified dual-store Kotlin repository
│   ├── backend-nodejs/
│   │   ├── market-service.js                # Unified CafeBazaar & Myket validation service
│   │   ├── unified-server-routes.js         # Unified Express.js payment routes
│   │   ├── cafebazaar-service.js            # Dedicated CafeBazaar service
│   │   └── server-routes-example.js         # CafeBazaar Express routes
│   ├── backend-python/
│   │   ├── market_service.py                # Unified FastAPI service (Bazaar & Myket)
│   │   └── cafebazaar_service.py            # Dedicated CafeBazaar Python service
│   └── unity/
│       ├── BazaarBillingManager.cs          # Unity C# script for CafeBazaar
│       └── MyketBillingManager.cs           # Unity C# script for Myket
└── references/                              # In-depth technical specifications
    ├── multi-store-architecture.md          # Multi-store build flavors & runtime detection
    ├── myket-iab-guide.md                   # Myket client integration guide (Android, Flutter, RN, Unity)
    ├── myket-server-api.md                  # Myket server-to-server REST API specification
    ├── myket-services-and-intents.md        # Myket version checks, in-app updates, and intents
    ├── poolakey-android-guide.md            # Poolakey Android guide
    ├── server-rest-api-v2.md                # CafeBazaar REST API v2 endpoints
    ├── dynamic-pricing-jwt.md               # CafeBazaar Dynamic Pricing JWT generator
    ├── snapppay-bnpl.md                     # SnappPay BNPL calculations & payouts
    ├── security-anti-fraud.md               # Anti-fraud, RSA validation & replay protection
    └── troubleshooting-and-faqs.md          # Exhaustive developer troubleshooting guide
```

---

## Security & Anti-Fraud Best Practices

1. **Always Validate Tokens Server-Side:** Never deliver paid features solely on client-side callbacks.
2. **Replay Protection:** Store processed tokens in a database table with a `UNIQUE` index constraint on `(store, token)`.
3. **Bind Developer Payload:** Generate a server-signed payload `HMAC(userId + timestamp, secret)` and verify it before granting benefits.
4. **Obfuscate Code:** Enable Proguard/R8 on production APKs to prevent tampering with billing classes.
5. **Never Commit Secrets:** Store `CAFEBAZAAR_PISHKHAN_API_SECRET` and `MYKET_ACCESS_TOKEN` only in backend environment variables.

---

## References & In-Depth Documentation

- [Multi-Store Architecture Guide](references/multi-store-architecture.md)
- [Myket In-App Billing Guide](references/myket-iab-guide.md)
- [Myket Server REST API Reference](references/myket-server-api.md)
- [Myket Services, Updates & Intents](references/myket-services-and-intents.md)
- [CafeBazaar Poolakey Android Guide](references/poolakey-android-guide.md)
- [CafeBazaar Server REST API v2](references/server-rest-api-v2.md)
- [Dynamic Pricing JWT Specification](references/dynamic-pricing-jwt.md)
- [SnappPay BNPL Settlement & Commission](references/snapppay-bnpl.md)
- [Security & Anti-Fraud Patterns](references/security-anti-fraud.md)
- [Troubleshooting & FAQs](references/troubleshooting-and-faqs.md)
