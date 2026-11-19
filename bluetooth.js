import { BleClient, ScanMode } from "@capacitor-community/bluetooth-le";
import { registerPlugin } from "@capacitor/core";

const BluetoothClassic = registerPlugin("BluetoothClassic");

let initialized = false;
let bleScanning = false;
let classicScanning = false;
let scanTimer = null;
let finishCallback = null;

let classicDeviceListener = null;
let classicFinishedListener = null;

export async function initializeBluetooth() {
    if (initialized) return;

    await BleClient.initialize();
    initialized = true;
}

async function removeClassicListeners() {
    if (classicDeviceListener) {
        await classicDeviceListener.remove();
        classicDeviceListener = null;
    }

    if (classicFinishedListener) {
        await classicFinishedListener.remove();
        classicFinishedListener = null;
    }
}

export async function scanBluetoothDevices(
    onDeviceFound,
    onScanFinished,
    duration = 15000
) {
    await initializeBluetooth();

    if (bleScanning || classicScanning) {
        await stopBluetoothScan("restart");
    }

    finishCallback = onScanFinished;

    try {
        const enabled = await BleClient.isEnabled();

        if (!enabled) {
            await BleClient.requestEnable();
        }

        // BLE scan
        await BleClient.requestLEScan(
            {
                allowDuplicates: true,
                scanMode: ScanMode.SCAN_MODE_LOW_LATENCY
            },
            result => {
                if (!result.device) return;

                onDeviceFound({
                    deviceId: result.device.deviceId,
                    name: result.device.name || null,
                    rssi: result.rssi ?? null,
                    type: "ble"
                });
            }
        );

        bleScanning = true;

        // Bluetooth Classic listeners
        await removeClassicListeners();

        classicDeviceListener =
            await BluetoothClassic.addListener(
                "deviceFound",
                device => {
                    onDeviceFound(device);
                }
            );

        classicFinishedListener =
            await BluetoothClassic.addListener(
                "scanFinished",
                () => {
                    classicScanning = false;
                }
            );

        // Bluetooth Classic scan
        classicScanning = true;

        await BluetoothClassic.startDiscovery();

        scanTimer = setTimeout(() => {
            stopBluetoothScan("timeout");
        }, duration);

    } catch (error) {
        console.error("Bluetooth scan failed:", error);

        await stopBluetoothScan("error");

        throw error;
    }
}

export async function stopBluetoothScan(reason = "manual") {
    if (scanTimer) {
        clearTimeout(scanTimer);
        scanTimer = null;
    }

    if (bleScanning) {
        try {
            await BleClient.stopLEScan();
        } catch (error) {
            console.error("BLE stop error:", error);
        }

        bleScanning = false;
    }

    if (classicScanning) {
        try {
            await BluetoothClassic.stopDiscovery();
        } catch (error) {
            console.error("Classic stop error:", error);
        }

        classicScanning = false;
    }

    await removeClassicListeners();

    const callback = finishCallback;
    finishCallback = null;

    if (callback) {
        callback(reason);
    }
}

export async function connectBluetoothDevice(deviceId, onDisconnect) {
    await initializeBluetooth();

    await BleClient.connect(
        deviceId,
        disconnectedDeviceId => {
            if (onDisconnect) {
                onDisconnect(disconnectedDeviceId);
            }
        }
    );

    return true;
}

export async function disconnectBluetoothDevice(deviceId) {
    await BleClient.disconnect(deviceId);
}