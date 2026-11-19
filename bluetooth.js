import { BleClient, ScanMode } from "@capacitor-community/bluetooth-le";

let initialized = false;
let scanning = false;
let scanTimer = null;
let scanFinishedCallback = null;

export async function initializeBluetooth() {
    if (initialized) return;

    await BleClient.initialize();
    initialized = true;
}

export async function scanBluetoothDevices(
    onDeviceFound,
    onScanFinished,
    duration = 15000
) {
    await initializeBluetooth();

    if (scanning) {
        await stopBluetoothScan();
    }

    const enabled = await BleClient.isEnabled();

    if (!enabled) {
        await BleClient.requestEnable();
    }

    try {
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
                    rssi: result.rssi ?? null
                });
            }
        );

        scanning = true;
        scanFinishedCallback = onScanFinished;

        scanTimer = setTimeout(() => {
            stopBluetoothScan("timeout");
        }, duration);

    } catch (error) {
        scanning = false;
        throw error;
    }
}

export async function stopBluetoothScan(reason = "manual") {
    if (scanTimer) {
        clearTimeout(scanTimer);
        scanTimer = null;
    }

    if (!scanning) return;

    scanning = false;

    try {
        await BleClient.stopLEScan();
    } finally {
        const callback = scanFinishedCallback;
        scanFinishedCallback = null;

        if (callback) {
            callback(reason);
        }
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