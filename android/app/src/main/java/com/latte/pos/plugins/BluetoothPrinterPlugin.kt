package com.latte.pos.plugins

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothSocket
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.app.ActivityCompat
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import java.io.IOException
import java.io.OutputStream
import java.util.UUID

@CapacitorPlugin(
    name = "BluetoothPrinter",
    permissions = [
        Permission(
            strings = [
                Manifest.permission.BLUETOOTH,
                Manifest.permission.BLUETOOTH_ADMIN,
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.BLUETOOTH_SCAN
            ],
            alias = "bluetooth"
        )
    ]
)
class BluetoothPrinterPlugin : Plugin() {
    
    companion object {
        private const val TAG = "BluetoothPrinter"
        // Standard SPP UUID for Bluetooth serial communication
        private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
    }
    
    private var bluetoothAdapter: BluetoothAdapter? = null
    private var bluetoothSocket: BluetoothSocket? = null
    private var outputStream: OutputStream? = null
    private var connectedDevice: BluetoothDevice? = null
    
    override fun load() {
        super.load()
        val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        bluetoothAdapter = bluetoothManager?.adapter
        Log.d(TAG, "BluetoothPrinter plugin loaded")
    }
    
    @PluginMethod
    fun isAvailable(call: PluginCall) {
        val available = bluetoothAdapter != null && bluetoothAdapter!!.isEnabled
        val result = JSObject()
        result.put("available", available)
        call.resolve(result)
    }
    
    @PluginMethod
    fun requestPermissions(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            // Android 12+ requires BLUETOOTH_CONNECT and BLUETOOTH_SCAN
            if (ActivityCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                requestPermissionForAlias("bluetooth", call, "permissionCallback")
                return
            }
        }
        
        val result = JSObject()
        result.put("granted", true)
        call.resolve(result)
    }
    
    @PermissionCallback
    private fun permissionCallback(call: PluginCall) {
        val granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            ActivityCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
        
        val result = JSObject()
        result.put("granted", granted)
        call.resolve(result)
    }
    
    @PluginMethod
    fun getPairedDevices(call: PluginCall) {
        if (!checkBluetoothPermission(call)) return
        
        val devices = JSArray()
        
        try {
            val pairedDevices: Set<BluetoothDevice>? = bluetoothAdapter?.bondedDevices
            pairedDevices?.forEach { device ->
                val deviceObj = JSObject()
                deviceObj.put("name", device.name ?: "Unknown")
                deviceObj.put("address", device.address)
                deviceObj.put("paired", true)
                devices.put(deviceObj)
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "Security exception getting paired devices", e)
        }
        
        val result = JSObject()
        result.put("devices", devices)
        call.resolve(result)
    }
    
    @PluginMethod
    fun connect(call: PluginCall) {
        val address = call.getString("address")
        if (address == null) {
            call.reject("Address is required")
            return
        }
        
        if (!checkBluetoothPermission(call)) return
        
        // Disconnect existing connection first
        disconnect()
        
        try {
            val device = bluetoothAdapter?.getRemoteDevice(address)
            if (device == null) {
                returnError(call, "Appareil non trouvé")
                return
            }
            
            Log.d(TAG, "Connecting to ${device.name} ($address)")
            
            // Create socket and connect
            bluetoothSocket = device.createRfcommSocketToServiceRecord(SPP_UUID)
            bluetoothSocket?.connect()
            outputStream = bluetoothSocket?.outputStream
            connectedDevice = device
            
            Log.d(TAG, "Connected successfully")
            
            val result = JSObject()
            result.put("success", true)
            result.put("message", "Connecté à ${device.name}")
            call.resolve(result)
            
        } catch (e: IOException) {
            Log.e(TAG, "Connection failed", e)
            disconnect()
            returnError(call, "Échec de connexion: ${e.message}")
        } catch (e: SecurityException) {
            Log.e(TAG, "Security exception", e)
            returnError(call, "Permission Bluetooth refusée")
        }
    }
    
    @PluginMethod
    fun disconnect(call: PluginCall) {
        disconnect()
        val result = JSObject()
        result.put("success", true)
        result.put("message", "Déconnecté")
        call.resolve(result)
    }
    
    private fun disconnect() {
        try {
            outputStream?.close()
            bluetoothSocket?.close()
        } catch (e: IOException) {
            Log.e(TAG, "Error closing connection", e)
        } finally {
            outputStream = null
            bluetoothSocket = null
            connectedDevice = null
        }
    }
    
    @PluginMethod
    fun isConnected(call: PluginCall) {
        val connected = bluetoothSocket?.isConnected == true && outputStream != null
        val result = JSObject()
        result.put("connected", connected)
        if (connected && connectedDevice != null) {
            try {
                result.put("deviceName", connectedDevice!!.name)
            } catch (e: SecurityException) {
                result.put("deviceName", "Printer")
            }
        }
        call.resolve(result)
    }
    
    @PluginMethod
    fun printText(call: PluginCall) {
        val text = call.getString("text")
        if (text == null) {
            call.reject("Text is required")
            return
        }
        
        if (outputStream == null) {
            returnError(call, "Aucune imprimante connectée")
            return
        }
        
        try {
            // Convert text to bytes and send
            val bytes = text.toByteArray(Charsets.UTF_8)
            outputStream?.write(bytes)
            outputStream?.flush()
            
            Log.d(TAG, "Printed ${bytes.size} bytes of text")
            
            val result = JSObject()
            result.put("success", true)
            result.put("message", "Impression réussie")
            call.resolve(result)
            
        } catch (e: IOException) {
            Log.e(TAG, "Print failed", e)
            returnError(call, "Erreur d'impression: ${e.message}")
        }
    }
    
    @PluginMethod
    fun printRaw(call: PluginCall) {
        val dataArray = call.getArray("data")
        if (dataArray == null) {
            call.reject("Data is required")
            return
        }
        
        if (outputStream == null) {
            returnError(call, "Aucune imprimante connectée")
            return
        }
        
        try {
            // Convert JSArray to byte array
            val bytes = ByteArray(dataArray.length())
            for (i in 0 until dataArray.length()) {
                bytes[i] = dataArray.getInt(i).toByte()
            }
            
            outputStream?.write(bytes)
            outputStream?.flush()
            
            Log.d(TAG, "Printed ${bytes.size} raw bytes")
            
            val result = JSObject()
            result.put("success", true)
            result.put("message", "Impression réussie")
            call.resolve(result)
            
        } catch (e: IOException) {
            Log.e(TAG, "Print failed", e)
            returnError(call, "Erreur d'impression: ${e.message}")
        }
    }
    
    @PluginMethod
    fun feedPaper(call: PluginCall) {
        val lines = call.getInt("lines", 1) ?: 1
        
        if (outputStream == null) {
            returnError(call, "Aucune imprimante connectée")
            return
        }
        
        try {
            // ESC d n - Print and feed n lines
            val command = byteArrayOf(0x1B, 0x64, lines.toByte())
            outputStream?.write(command)
            outputStream?.flush()
            
            val result = JSObject()
            result.put("success", true)
            result.put("message", "OK")
            call.resolve(result)
            
        } catch (e: IOException) {
            Log.e(TAG, "Feed paper failed", e)
            returnError(call, "Erreur: ${e.message}")
        }
    }
    
    @PluginMethod
    fun cutPaper(call: PluginCall) {
        if (outputStream == null) {
            returnError(call, "Aucune imprimante connectée")
            return
        }
        
        try {
            // GS V 1 - Partial cut
            val command = byteArrayOf(0x1D, 0x56, 0x01)
            outputStream?.write(command)
            outputStream?.flush()
            
            val result = JSObject()
            result.put("success", true)
            result.put("message", "OK")
            call.resolve(result)
            
        } catch (e: IOException) {
            Log.e(TAG, "Cut paper failed", e)
            returnError(call, "Erreur: ${e.message}")
        }
    }
    
    private fun checkBluetoothPermission(call: PluginCall): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (ActivityCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                returnError(call, "Permission Bluetooth requise")
                return false
            }
        }
        
        if (bluetoothAdapter == null) {
            returnError(call, "Bluetooth non disponible")
            return false
        }
        
        if (!bluetoothAdapter!!.isEnabled) {
            returnError(call, "Bluetooth désactivé")
            return false
        }
        
        return true
    }
    
    private fun returnError(call: PluginCall, message: String) {
        val result = JSObject()
        result.put("success", false)
        result.put("message", message)
        call.resolve(result)
    }
}
