# Myket Services, Intents, and Publishing Features

This reference covers auxiliary Myket developer services: Version Check Service, In-App Updates, Standard Store Intents, Multiple APK Publishing, and Gradual Version Rollout.

---

## 1. Check Version Update Service (بررسی به‌روز بودن برنامه)

Allows your app to query Myket servers via IPC (AIDL) to check whether a newer compatible version is available for the user's specific device, retrieve its `versionCode` and changelog, and prompt the user to update.

### Setup & Helper Files
Download `MyketUpdateHelper.zip` which includes:
- `IMyketSupportService.aidl`
- `util/MyketSupportHelper.java` and related classes.

Place AIDL files in `src/main/aidl/` (for Android Studio Gradle projects) or package directory.

### Implementation Example (Java / Kotlin)

```java
MyketSupportHelper mMyketHelper = new MyketSupportHelper(this);

// 1. Initialize and bind to Myket service
mMyketHelper.startSetup(new MyketSupportHelper.OnMyketSetupFinishedListener() {
    @Override
    public void onMyketSetupFinished(MyketResult result) {
        if (!result.isSuccess()) {
            Log.e("MyketUpdate", "Failed to connect to Myket update service: " + result.getMessage());
            return;
        }

        // 2. Query update status asynchronously
        mMyketHelper.getAppUpdateStateAsync(new MyketSupportHelper.CheckAppUpdateListener() {
            @Override
            public void onCheckAppUpdateFinished(MyketResult result, Update update) {
                if (!result.isSuccess() || update == null) {
                    return;
                }

                if (update.isUpdateAvailable()) {
                    // Newer version exists!
                    String changelog = update.getDescription();
                    long latestVersionCode = update.getVersionCode();

                    // Prompt user with dialog and redirect to Myket app page
                    showUpdateDialog(changelog);
                } else {
                    Log.d("MyketUpdate", "App is already on the latest version.");
                }
            }
        });
    }
});
```

### Update Object Structure
- `update.isUpdateAvailable()`: Returns `true` if an update compatible with this device is available.
- `update.getDescription()`: Persian / localized changelog and release notes entered in the panel.
- `update.getVersionCode()`: Version code of the available release.

---

## 2. In-App Update SDK (به‌روزرسانی درون‌برنامه‌ای مایکت)

For a frictionless user experience, Myket provides an In-App Update SDK that performs download and installation directly inside the running app without switching to the Myket market interface.

- **Flexible Update:** Downloads APK in the background while the user continues interacting with the app. Once downloaded, asks the user to restart.
- **Immediate Update:** Full-screen blocking UI for critical security or protocol-breaking releases where older versions cannot function.

---

## 3. Standard Myket Store Intents

Redirect users from inside your application directly to Myket's native client for reviews, ratings, and discovering other apps.

> [!NOTE]
> Always wrap intent launches in a `try-catch (ActivityNotFoundException e)` or fallback to web URLs (`https://myket.ir/app/{PACKAGE_NAME}`) if the Myket client app is not installed on the user's device.

### 1. Rate & Comment Intent (ثبت نظر و امتیاز)
Opens the rating and review submission dialog for your application in Myket:
```java
try {
    Intent intent = new Intent(Intent.ACTION_VIEW);
    intent.setData(Uri.parse("myket://comment?id=" + getPackageName()));
    intent.setPackage("ir.mservices.market");
    startActivity(intent);
} catch (ActivityNotFoundException e) {
    // Fallback: Open web browser
    Intent browserIntent = new Intent(Intent.ACTION_VIEW, 
        Uri.parse("https://myket.ir/app/" + getPackageName()));
    startActivity(browserIntent);
}
```

### 2. Open Application Page in Myket (صفحه مشخصات برنامه)
Navigates the user to the app's store profile:
```java
try {
    Intent intent = new Intent(Intent.ACTION_VIEW);
    intent.setData(Uri.parse("myket://details?id=" + getPackageName()));
    intent.setPackage("ir.mservices.market");
    startActivity(intent);
} catch (ActivityNotFoundException e) {
    Intent browserIntent = new Intent(Intent.ACTION_VIEW, 
        Uri.parse("https://myket.ir/app/" + getPackageName()));
    startActivity(browserIntent);
}
```

### 3. Open Developer Apps List (لیست برنامه‌های توسعه‌دهنده)
Displays all published applications by your developer account:
```java
try {
    Intent intent = new Intent(Intent.ACTION_VIEW);
    intent.setData(Uri.parse("myket://developer/" + DEVELOPER_PACKAGE_OR_ID));
    intent.setPackage("ir.mservices.market");
    startActivity(intent);
} catch (ActivityNotFoundException e) {
    // Fallback to web
}
```

---

## 4. Multi-APK Support (بارگذاری چند بسته در یک انتشار)

Myket allows uploading multiple APKs under the same release to optimize APK download size and performance across heterogeneous device architectures.

### Segmentation Dimensions:
1. **CPU Architecture (ABI):** `arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64`.
2. **Screen Density (DPI):** `ldpi`, `mdpi`, `hdpi`, `xhdpi`, `xxhdpi`.
3. **Android API Level:** Targeting legacy vs modern Android OS versions.

### Version Code Numbering Best Practice:
To ensure Google Play and Myket deliver the right APK to devices capable of multiple configurations (e.g. 64-bit devices can also run 32-bit binaries), assign higher `versionCode` values to more specific/advanced architectures:

```groovy
// Example: versionCode calculation in build.gradle
def abiCodes = ['armeabi-v7a': 1, 'arm64-v8a': 2, 'x86': 3, 'x86_64': 4]
// Base version: 1.0.0 (versionCode 1000)
// arm64-v8a final versionCode: 1000 * 10 + 2 = 10002
// armeabi-v7a final versionCode: 1000 * 10 + 1 = 10001
```

---

## 5. Gradual Rollout (انتشار تدریجی نسخه)

Reduce release risks by publishing new app versions to a controlled percentage of your active Myket user base:

1. **Rollout Tiers:** Choose percentage targets (e.g. 10%, 25%, 50%, 100%).
2. **Crash & ANR Monitoring:** Monitor telemetry, user ratings, and backend error rates during early tiers.
3. **Halt Rollout:** If a critical bug is detected, pause the rollout immediately in the Myket Developer Console to prevent new users from downloading the buggy build.
4. **Emergency Hotfix:** If halted, you can upload a new hotfix build with an incremented `versionCode` and begin a fresh rollout.
