import { BleClient, ScanMode } from "@capacitor-community/bluetooth-le";

let initialized = false;
let scanning = false;

export async function initializeBluetooth() {
    if (initialized) return;

    await BleClient.initialize();
    initialized = true;
}

export async function scanBluetoothDevices(onDeviceFound) {
    await initializeBluetooth();

    if (scanning) {
        await stopBluetoothScan();
    }

    const enabled = await BleClient.isEnabled();

    if (!enabled) {
        await BleClient.requestEnable();
    }

    scanning = true;

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
    } catch (error) {
        scanning = false;
        throw error;
    }
}

export async function stopBluetoothScan() {
    if (!scanning) return;

    await BleClient.stopLEScan();
    scanning = false;
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