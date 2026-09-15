import time
import secrets
import base64
import requests
import jwt
from typing import Dict, Any, List, Optional
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.serialization import load_der_public_key

class CafeBazaarService:
    def __init__(self, package_name: str, api_secret_token: str, dynamic_price_secret: Optional[str] = None):
        self.package_name = package_name
        self.api_secret_token = api_secret_token
        self.dynamic_price_secret = dynamic_price_secret
        self.base_url = "https://pardakht.cafebazaar.ir/devapi/v2/api"
        self.headers = {
            "CAFEBAZAAR-PISHKHAN-API-SECRET": self.api_secret_token,
            "Content-Type": "application/json"
        }

    def validate_inapp_purchase(self, product_id: str, purchase_token: str) -> Dict[str, Any]:
        """
        Validates an in-app purchase using CafeBazaar REST API v2.
        """
        url = f"{self.base_url}/validate/{self.package_name}/inapp/{product_id}/purchases/{purchase_token}/"
        response = requests.get(url, headers=self.headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            return {
                "is_valid": data.get("purchaseState") == 0,
                "is_refunded": data.get("purchaseState") == 1,
                "is_consumed": data.get("consumptionState") == 0,
                "purchase_time_ms": data.get("purchaseTime"),
                "developer_payload": data.get("developerPayload"),
                "raw": data
            }
        elif response.status_code == 404:
            return {"is_valid": False, "error": "not_found", "raw": response.json()}
        else:
            response.raise_for_status()

    def consume_purchase(self, purchase_token: str) -> bool:
        """
        Consumes a purchase token on CafeBazaar servers.
        """
        url = f"{self.base_url}/consume/{self.package_name}/purchases/"
        response = requests.post(url, headers=self.headers, json={"token": purchase_token}, timeout=10)
        return response.status_code == 200

    def get_active_subscriptions(self, token: str) -> List[Dict[str, Any]]:
        """
        Gets all active subscriptions for the given user token.
        """
        url = f"{self.base_url}/applications/{self.package_name}/active-subscriptions/{token}/"
        response = requests.get(url, headers=self.headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            subs = data.get("subscriptions", [])
            now_ms = int(time.time() * 1000)
            
            result = []
            for sub in subs:
                valid_until_ms = sub.get("validUntilTimestampMsec", 0)
                result.append({
                    "sku": sub.get("sku"),
                    "auto_renewing": sub.get("autoRenewing"),
                    "valid_until_ms": valid_until_ms,
                    "is_expired": valid_until_ms <= now_ms,
                    "linked_token": sub.get("linkedSubscriptionToken"),
                    "raw": sub
                })
            return result
        elif response.status_code == 404:
            return []
        else:
            response.raise_for_status()

    def generate_dynamic_price_token(
        self,
        price_in_rials: int,
        sku: str,
        expires_in_seconds: int = 600,
        account_id: Optional[str] = None
    ) -> str:
        """
        Generates a signed JWT token for CafeBazaar Dynamic Pricing (تخفیف پویا).
        """
        if not self.dynamic_price_secret:
            raise ValueError("dynamic_price_secret is required for dynamic pricing tokens")

        payload = {
            "price": int(price_in_rials),
            "package_name": self.package_name,
            "sku": sku,
            "exp": int(time.time()) + expires_in_seconds,
            "nonce": secrets.token_hex(16)
        }

        if account_id:
            payload["account_id"] = account_id

        return jwt.encode(
            payload=payload,
            key=self.dynamic_price_secret,
            algorithm="HS256",
            headers={"typ": "JWT", "alg": "HS256"}
        )

    @staticmethod
    def verify_rsa_signature(purchase_json: str, signature_b64: str, rsa_public_key_b64: str) -> bool:
        """
        Verifies local RSA signature returned by client using Developer Public Key.
        """
        try:
            pub_key_bytes = base64.b64decode(rsa_public_key_b64)
            public_key = load_der_public_key(pub_key_bytes)
            
            sig_bytes = base64.b64decode(signature_b64)
            data_bytes = purchase_json.encode('utf-8')
            
            public_key.verify(
                sig_bytes,
                data_bytes,
                padding.PKCS1v15(),
                hashes.SHA1()
            )
            return True
        except Exception:
            return False
