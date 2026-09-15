package com.example.billing

import android.content.Context
import androidx.activity.result.ActivityResultRegistry
import ir.cafebazaar.poolakey.Payment
import ir.cafebazaar.poolakey.PaymentConnection
import ir.cafebazaar.poolakey.config.PaymentConfiguration
import ir.cafebazaar.poolakey.config.SecurityCheck
import ir.cafebazaar.poolakey.entity.PurchaseEntity
import ir.cafebazaar.poolakey.entity.PurchaseInfo
import ir.cafebazaar.poolakey.request.PurchaseRequest
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/**
 * Production-ready BillingRepository wrapping CafeBazaar's Poolakey SDK.
 * Handles lifecycle, reactive flows, coroutines, and error management.
 */
class BillingRepository(
    private val context: Context,
    private val rsaPublicKey: String
) {
    private val paymentConfig = PaymentConfiguration(
        localSecurityCheck = SecurityCheck.Enable(rsaPublicKey = rsaPublicKey)
    )
    private val payment = Payment(context = context, config = paymentConfig)
    private var paymentConnection: PaymentConnection? = null

    /**
     * Establish connection with CafeBazaar billing service.
     */
    suspend fun connect(): Result<Unit> = suspendCancellableCoroutine { continuation ->
        paymentConnection = payment.connect {
            connectionSucceed {
                if (continuation.isActive) continuation.resume(Result.success(Unit))
            }
            connectionFailed { throwable ->
                if (continuation.isActive) continuation.resume(Result.failure(throwable))
            }
            disconnected {
                // Handle background disconnection
            }
        }
    }

    /**
     * Purchase a consumable or non-consumable product.
     */
    fun purchase(
        activityResultRegistry: ActivityResultRegistry,
        productId: String,
        developerPayload: String,
        dynamicPriceToken: String? = null
    ): Flow<BillingPurchaseState> = callbackFlow {
        val request = PurchaseRequest(
            productId = productId,
            payload = developerPayload,
            dynamicPriceToken = dynamicPriceToken
        )

        payment.purchaseProduct(
            registry = activityResultRegistry,
            request = request
        ) {
            purchaseFlowBegan {
                trySend(BillingPurchaseState.Loading)
            }
            failedToBeginFlow { throwable ->
                trySend(BillingPurchaseState.Failed(throwable))
                close()
            }
            purchaseSucceed { purchaseEntity ->
                trySend(BillingPurchaseState.Success(purchaseEntity))
                close()
            }
            purchaseCanceled {
                trySend(BillingPurchaseState.Canceled)
                close()
            }
            purchaseFailed { throwable ->
                trySend(BillingPurchaseState.Failed(throwable))
                close()
            }
        }

        awaitClose { /* Cleanup */ }
    }

    /**
     * Subscribe to a recurring subscription plan.
     */
    fun subscribe(
        activityResultRegistry: ActivityResultRegistry,
        subscriptionSku: String,
        developerPayload: String,
        dynamicPriceToken: String? = null
    ): Flow<BillingPurchaseState> = callbackFlow {
        val request = PurchaseRequest(
            productId = subscriptionSku,
            payload = developerPayload,
            dynamicPriceToken = dynamicPriceToken
        )

        payment.subscribeProduct(
            registry = activityResultRegistry,
            request = request
        ) {
            purchaseFlowBegan {
                trySend(BillingPurchaseState.Loading)
            }
            failedToBeginFlow { throwable ->
                trySend(BillingPurchaseState.Failed(throwable))
                close()
            }
            purchaseSucceed { purchaseEntity ->
                trySend(BillingPurchaseState.Success(purchaseEntity))
                close()
            }
            purchaseCanceled {
                trySend(BillingPurchaseState.Canceled)
                close()
            }
            purchaseFailed { throwable ->
                trySend(BillingPurchaseState.Failed(throwable))
                close()
            }
        }

        awaitClose { }
    }

    /**
     * Consume a consumable product token so user can purchase it again.
     */
    suspend fun consume(purchaseToken: String): Result<Unit> = suspendCancellableCoroutine { cont ->
        payment.consumeProduct(purchaseToken) {
            consumeSucceed {
                if (cont.isActive) cont.resume(Result.success(Unit))
            }
            consumeFailed { throwable ->
                if (cont.isActive) cont.resume(Result.failure(throwable))
            }
        }
    }

    /**
     * Restore or query unconsumed consumable and non-consumable purchases.
     */
    suspend fun getPurchasedProducts(): Result<List<PurchaseInfo>> = suspendCancellableCoroutine { cont ->
        payment.getPurchasedProducts {
            querySucceed { list ->
                if (cont.isActive) cont.resume(Result.success(list))
            }
            queryFailed { throwable ->
                if (cont.isActive) cont.resume(Result.failure(throwable))
            }
        }
    }

    /**
     * Query user's active subscriptions.
     */
    suspend fun getSubscribedProducts(): Result<List<PurchaseInfo>> = suspendCancellableCoroutine { cont ->
        payment.getSubscribedProducts {
            querySucceed { list ->
                if (cont.isActive) cont.resume(Result.success(list))
            }
            queryFailed { throwable ->
                if (cont.isActive) cont.resume(Result.failure(throwable))
            }
        }
    }

    /**
     * Check if user is eligible for a Free Trial subscription.
     */
    suspend fun checkTrialSubscription(): Result<TrialInfo> = suspendCancellableCoroutine { cont ->
        payment.checkTrialSubscription {
            checkTrialSubscriptionSucceed { info ->
                if (cont.isActive) cont.resume(Result.success(TrialInfo(info.isAvailable, info.trialPeriodDays)))
            }
            checkTrialSubscriptionFailed { throwable ->
                if (cont.isActive) cont.resume(Result.failure(throwable))
            }
        }
    }

    /**
     * Disconnect from billing service. Call in Activity/Service onDestroy.
     */
    fun disconnect() {
        paymentConnection?.disconnect()
        paymentConnection = null
    }
}

sealed interface BillingPurchaseState {
    data object Loading : BillingPurchaseState
    data class Success(val purchaseEntity: PurchaseEntity) : BillingPurchaseState
    data object Canceled : BillingPurchaseState
    data class Failed(val error: Throwable) : BillingPurchaseState
}

data class TrialInfo(
    val isAvailable: Boolean,
    val trialPeriodDays: Int
)
