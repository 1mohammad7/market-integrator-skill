"""
Unified Market Billing Service in Python (FastAPI / Requests)
Supports both CafeBazaar Developer REST API v2 and Myket Developer Partner API.
"""

import os
import hmac
import time
import hashlib
from typing import Optional, Dict, Any
import httpx
from pydantic import BaseModel

class VerifyRequest(BaseModel):
    store: str  # "cafebazaar" | "myket"
    sku: str
    token: str
    payload: Optional[str] = None
    user_id: Optional[str] = None

class UnifiedPurchaseResult(BaseModel):
    is_valid: bool
    store: str
    sku: str
    token: str
    purchase_time: int
    is_consumed: bool
    developer_payload: str
    raw: Dict[str, Any]

class MarketService:
    def __init__(
        self,
        bazaar_secret: Optional[str] = None,
        bazaar_package: Optional[str] = None,
        myket_token: Optional[str] = None,
        myket_package: Optional[str] = None,
    ):
        self.bazaar_secret = bazaar_secret or os.getenv("CAFEBAZAAR_PISHKHAN_API_SECRET", "")
        self.bazaar_package = bazaar_package or os.getenv("CAFEBAZAAR_PACKAGE_NAME", "")
        self.myket_token = myket_token or os.getenv("MYKET_ACCESS_TOKEN", "")
        self.myket_package = myket_package or os.getenv("MYKET_PACKAGE_NAME", "")

        self.bazaar_base_url = "https://pardakht.cafebazaar.ir/devapi/v2/api"
        self.myket_base_url = "https://developer.myket.ir/api/partners"

    async def verify_purchase(
        self, store: str, sku: str, token: str, package_name: Optional[str] = None
    ) -> UnifiedPurchaseResult:
        if store == "cafebazaar":
            return await self._verify_cafebazaar(sku, token, package_name)
        elif store == "myket":
            return await self._verify_myket(sku, token, package_name)
        else:
            raise ValueError(f"Unsupported store: {store}. Expected 'cafebazaar' or 'myket'.")

    async def _verify_cafebazaar(self, sku: str, token: str, package_name: Optional[str]) -> UnifiedPurchaseResult:
        pkg = package_name or self.bazaar_package
        url = f"{self.bazaar_base_url}/validate/{pkg}/inapp/{sku}/purchases/{token}/"
        headers = {
            "CAFEBAZAAR-PISHKHAN-API-SECRET": self.bazaar_secret,
            "Accept": "application/json",
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            data = resp.json()

            return UnifiedPurchaseResult(
                is_valid=(data.get("purchaseState") == 0),
                store="cafebazaar",
                sku=sku,
                token=token,
                purchase_time=data.get("purchaseTime", 0),
                is_consumed=(data.get("consumptionState") == 0),
                developer_payload=data.get("developerPayload", ""),
                raw=data,
            )

    async def _verify_myket(self, sku: str, token: str, package_name: Optional[str]) -> UnifiedPurchaseResult:
        pkg = package_name or self.myket_package
        url = f"{self.myket_base_url}/applications/{pkg}/purchases/products/{sku}/verify"
        headers = {
            "X-Access-Token": self.myket_token,
            "Content-Type": "application/json",
        }
        body = {"tokenId": token}

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, headers=headers, json=body)
            resp.raise_for_status()
            data = resp.json()

            return UnifiedPurchaseResult(
                is_valid=(data.get("purchaseState") == 0),
                store="myket",
                sku=sku,
                token=token,
                purchase_time=data.get("purchaseTime", 0),
                is_consumed=(data.get("consumptionState") == 0),
                developer_payload=data.get("developerPayload", ""),
                raw=data,
            )

    async def consume_purchase(self, store: str, sku: str, token: str, package_name: Optional[str] = None) -> bool:
        if store == "cafebazaar":
            pkg = package_name or self.bazaar_package
            url = f"{self.bazaar_base_url}/consume/{pkg}/purchases/"
            headers = {"CAFEBAZAAR-PISHKHAN-API-SECRET": self.bazaar_secret}
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, headers=headers, json={"token": token})
                res.raise_for_status()
                return True
        elif store == "myket":
            pkg = package_name or self.myket_package
            url = f"{self.myket_base_url}/applications/{pkg}/purchases/products/{sku}/consume"
            headers = {"X-Access-Token": self.myket_token}
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, headers=headers, json={"tokenId": token})
                res.raise_for_status()
                return True
        return False
