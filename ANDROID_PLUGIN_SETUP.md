# Configuration du Plugin Bluetooth Printer pour Android

Ce guide explique comment configurer le plugin d'impression Bluetooth ESC/POS dans votre projet Android.

## Étapes d'installation

### 1. Ajouter le plugin à MainActivity

Après avoir exécuté `npx cap add android`, ouvrez le fichier suivant dans Android Studio :

```
android/app/src/main/java/com/latte/pos/MainActivity.kt
```

Modifiez-le pour enregistrer le plugin :

```kotlin
package com.latte.pos

import android.os.Bundle
import com.getcapacitor.BridgeActivity
import com.latte.pos.plugins.BluetoothPrinterPlugin

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(BluetoothPrinterPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
```

### 2. Copier le fichier du plugin

Copiez le fichier `BluetoothPrinterPlugin.kt` dans votre projet Android :

```
android/app/src/main/java/com/latte/pos/plugins/BluetoothPrinterPlugin.kt
```

**Note:** Créez le dossier `plugins` s'il n'existe pas.

### 3. Ajouter les permissions dans AndroidManifest.xml

Ouvrez `android/app/src/main/AndroidManifest.xml` et ajoutez ces permissions :

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    
    <!-- Bluetooth permissions -->
    <uses-permission android:name="android.permission.BLUETOOTH" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
    
    <!-- ... reste du manifest -->
</manifest>
```

### 4. Synchroniser le projet

Après ces modifications :

```bash
npm run build
npx cap sync
npx cap open android
```

## Utilisation

### Dans les paramètres de l'app (pour connecter une imprimante)

```typescript
import { BluetoothPrinter } from '@/plugins/bluetooth-printer';

// Demander les permissions
const { granted } = await BluetoothPrinter.requestPermissions();

// Lister les appareils appairés
const { devices } = await BluetoothPrinter.getPairedDevices();

// Se connecter à une imprimante
const result = await BluetoothPrinter.connect({ address: devices[0].address });
```

### Pour imprimer

```typescript
import { getPrintClient } from '@/printing/printClient';

const client = getPrintClient();
const result = await client.printReceipt(receiptText);
```

## Dépannage

### "Permission Bluetooth requise"
Assurez-vous d'avoir appelé `requestPermissions()` avant d'utiliser le Bluetooth.

### "Aucune imprimante connectée"
1. Appairez d'abord l'imprimante dans les paramètres Bluetooth d'Android
2. Connectez-vous via l'app avec `BluetoothPrinter.connect()`

### L'impression ne sort pas
- Vérifiez que l'imprimante est bien ESC/POS compatible
- Certaines imprimantes nécessitent un appairage avec code PIN (généralement 1234 ou 0000)
