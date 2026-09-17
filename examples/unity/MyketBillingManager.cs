using System;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Unity C# Bridge for Myket In-App Billing
/// </summary>
public class MyketBillingManager : MonoBehaviour
{
    [Header("Security Configuration")]
    [Tooltip("Base64 RSA Public Key from Myket Developer Console")]
    [SerializeField] private string myketRsaPublicKey = "YOUR_MYKET_RSA_PUBLIC_KEY";

    public static MyketBillingManager Instance { get; private set; }

    public event Action<bool> OnBillingSetupFinished;
    public event Action<string, string> OnPurchaseCompleted; // sku, purchaseToken
    public event Action<string> OnPurchaseFailed;
    public event Action<string, bool> OnConsumeFinished; // sku, success

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
        DontDestroyOnLoad(gameObject);
    }

    private void Start()
    {
        InitializeBilling();
    }

    public void InitializeBilling()
    {
#if UNITY_ANDROID && !UNITY_EDITOR
        try
        {
            MyketIAB.init(myketRsaPublicKey);
            MyketIAB.billingSupportedEvent += OnBillingSupported;
            MyketIAB.billingNotSupportedEvent += OnBillingNotSupported;
            MyketIAB.purchaseSucceededEvent += HandlePurchaseSucceeded;
            MyketIAB.purchaseFailedEvent += HandlePurchaseFailed;
            MyketIAB.consumePurchaseSucceededEvent += HandleConsumeSucceeded;
            MyketIAB.consumePurchaseFailedEvent += HandleConsumeFailed;
        }
        catch (Exception ex)
        {
            Debug.LogError($"[MyketBilling] Initialization exception: {ex.Message}");
            OnBillingSetupFinished?.Invoke(false);
        }
#else
        Debug.Log("[MyketBilling] Running in Unity Editor (Mock mode).");
        OnBillingSetupFinished?.Invoke(true);
#endif
    }

    public void Purchase(string sku, string developerPayload = "")
    {
#if UNITY_ANDROID && !UNITY_EDITOR
        MyketIAB.purchaseProduct(sku, developerPayload);
#else
        Debug.Log($"[Mock Myket] Purchasing {sku} with payload '{developerPayload}'");
        OnPurchaseCompleted?.Invoke(sku, "mock_token_" + Guid.NewGuid().ToString());
#endif
    }

    public void Consume(string sku)
    {
#if UNITY_ANDROID && !UNITY_EDITOR
        MyketIAB.consumeProduct(sku);
#else
        Debug.Log($"[Mock Myket] Consuming {sku}");
        OnConsumeFinished?.Invoke(sku, true);
#endif
    }

    private void OnBillingSupported()
    {
        Debug.Log("[MyketBilling] Service connected and supported.");
        OnBillingSetupFinished?.Invoke(true);
    }

    private void OnBillingNotSupported(string error)
    {
        Debug.LogError($"[MyketBilling] Service unsupported: {error}");
        OnBillingSetupFinished?.Invoke(false);
    }

    private void HandlePurchaseSucceeded(MyketPurchase purchase)
    {
        Debug.Log($"[MyketBilling] Purchase success: SKU={purchase.ProductId}, Token={purchase.Token}");
        OnPurchaseCompleted?.Invoke(purchase.ProductId, purchase.Token);
    }

    private void HandlePurchaseFailed(string error)
    {
        Debug.LogError($"[MyketBilling] Purchase failed: {error}");
        OnPurchaseFailed?.Invoke(error);
    }

    private void HandleConsumeSucceeded(MyketPurchase purchase)
    {
        Debug.Log($"[MyketBilling] Consumed SKU: {purchase.ProductId}");
        OnConsumeFinished?.Invoke(purchase.ProductId, true);
    }

    private void HandleConsumeFailed(string error)
    {
        Debug.LogError($"[MyketBilling] Consume failed: {error}");
        OnConsumeFinished?.Invoke("", false);
    }
}
