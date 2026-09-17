package ir.fitsme.billing

import android.app.Activity
import android.content.Context
import androidx.activity.result.ActivityResultRegistry
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

enum class MarketType {
    CAFEBAZAAR,
    MYKET,
    UNKNOWN
}

data class UnifiedPurchase(
    val orderId: String,
    val sku: String,
    val purchaseToken: String,
    val payload: String,
    val purchaseTime: Long,
    val isAutoRenewing: Boolean,
    val market: MarketType
)

sealed interface BillingState {
    object Idle : BillingState
    object Connecting : BillingState
    object Connected : BillingState
    data class Error(val message: String) : BillingState
}

/**
 * Common Interface for Store Billing Services
 */
interface MarketBillingService {
    val market: MarketType
    val state: StateFlow<BillingState>

    fun connect(onSuccess: () -> Unit, onError: (Throwable) -> Unit)
    fun launchPurchase(activity: Activity, sku: String, payload: String, dynamicToken: String? = null, onResult: (Result<UnifiedPurchase>) -> Unit)
    fun consume(token: String, sku: String, onResult: (Boolean) -> Unit)
    fun queryPurchases(onResult: (List<UnifiedPurchase>) -> Unit)
    fun disconnect()
}

/**
 * Unified Billing Repository
 * Provides a single, clean API for application ViewModels and UI layers.
 */
class MarketBillingRepository(
    private val context: Context,
    private val marketService: MarketBillingService
) {
    val marketType: MarketType get() = marketService.market
    val billingState: StateFlow<BillingState> get() = marketService.state

    private val _purchases = MutableStateFlow<List<UnifiedPurchase>>(emptyList())
    val purchases: StateFlow<List<UnifiedPurchase>> = _purchases.asStateFlow()

    fun startConnection() {
        marketService.connect(
            onSuccess = {
                refreshInventory()
            },
            onError = { err ->
                // Log and handle
            }
        )
    }

    fun refreshInventory() {
        marketService.queryPurchases { items ->
            _purchases.value = items
        }
    }

    fun buy(
        activity: Activity,
        sku: String,
        payload: String,
        dynamicToken: String? = null,
        onComplete: (Result<UnifiedPurchase>) -> Unit
    ) {
        marketService.launchPurchase(activity, sku, payload, dynamicToken) { result ->
            if (result.isSuccess) {
                refreshInventory()
            }
            onComplete(result)
        }
    }

    fun consume(token: String, sku: String, onComplete: (Boolean) -> Unit) {
        marketService.consume(token, sku) { success ->
            if (success) {
                refreshInventory()
            }
            onComplete(success)
        }
    }

    fun release() {
        marketService.disconnect()
    }
}
