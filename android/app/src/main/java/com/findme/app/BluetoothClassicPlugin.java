package com.findme.app;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "BluetoothClassic",
    permissions = {
        @Permission(
            alias = "nearbyDevices",
            strings = {
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.BLUETOOTH_CONNECT
            }
        ),
        @Permission(
            alias = "location",
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION
            }
        )
    }
)
public class BluetoothClassicPlugin extends Plugin {

    private BroadcastReceiver receiver;
    private boolean receiverRegistered = false;

    @PluginMethod
    public void startDiscovery(PluginCall call) {

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {

            if (getPermissionState("nearbyDevices")
                    != PermissionState.GRANTED) {

                requestPermissionForAlias(
                    "nearbyDevices",
                    call,
                    "nearbyPermissionCallback"
                );

                return;
            }

        } else {

            if (getPermissionState("location")
                    != PermissionState.GRANTED) {

                requestPermissionForAlias(
                    "location",
                    call,
                    "locationPermissionCallback"
                );

                return;
            }
        }

        startDiscoveryInternal(call);
    }

    @PermissionCallback
    private void nearbyPermissionCallback(PluginCall call) {
        if (getPermissionState("nearbyDevices")
                == PermissionState.GRANTED) {
            startDiscoveryInternal(call);
        } else {
            call.reject("הרשאת Bluetooth לא ניתנה");
        }
    }

    @PermissionCallback
    private void locationPermissionCallback(PluginCall call) {
        if (getPermissionState("location")
                == PermissionState.GRANTED) {
            startDiscoveryInternal(call);
        } else {
            call.reject("הרשאת מיקום לא ניתנה");
        }
    }

    private void startDiscoveryInternal(PluginCall call) {

        try {
            BluetoothAdapter adapter =
                BluetoothAdapter.getDefaultAdapter();

            if (adapter == null) {
                call.reject("המכשיר אינו תומך ב-Bluetooth");
                return;
            }

            if (!adapter.isEnabled()) {
                call.reject("Bluetooth כבוי");
                return;
            }

            if (adapter.isDiscovering()) {
                adapter.cancelDiscovery();
            }

            unregisterReceiver();

            receiver = new BroadcastReceiver() {

                @Override
                public void onReceive(
                    Context context,
                    Intent intent
                ) {

                    String action = intent.getAction();

                    if (BluetoothDevice.ACTION_FOUND.equals(action)) {

                        BluetoothDevice device =
                            intent.getParcelableExtra(
                                BluetoothDevice.EXTRA_DEVICE
                            );

                        if (device == null) return;

                        short rssi = intent.getShortExtra(
                            BluetoothDevice.EXTRA_RSSI,
                            Short.MIN_VALUE
                        );

                        JSObject result = new JSObject();

                        result.put("deviceId", device.getAddress());

                        String name = null;

                        try {
                            name = device.getName();
                        } catch (SecurityException ignored) {}

                        result.put("name", name);
                        result.put("rssi",
                            rssi == Short.MIN_VALUE ? JSObject.NULL : rssi
                        );

                        result.put("type", "classic");

                        notifyListeners("deviceFound", result);
                    }

                    if (BluetoothAdapter.ACTION_DISCOVERY_FINISHED
                            .equals(action)) {

                        notifyListeners(
                            "scanFinished",
                            new JSObject()
                        );

                        unregisterReceiver();
                    }
                }
            };

            IntentFilter filter = new IntentFilter();

            filter.addAction(BluetoothDevice.ACTION_FOUND);

            filter.addAction(
                BluetoothAdapter.ACTION_DISCOVERY_FINISHED
            );

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                getContext().registerReceiver(
                    receiver,
                    filter,
                    Context.RECEIVER_EXPORTED
                );
            } else {
                getContext().registerReceiver(receiver, filter);
            }

            receiverRegistered = true;

            boolean started = adapter.startDiscovery();

            if (!started) {
                unregisterReceiver();
                call.reject("לא ניתן להתחיל סריקת Bluetooth Classic");
                return;
            }

            JSObject response = new JSObject();
            response.put("started", true);

            call.resolve(response);

        } catch (Exception error) {

            unregisterReceiver();

            call.reject(
                "שגיאה בסריקת Bluetooth Classic: "
                + error.getMessage()
            );
        }
    }

    @PluginMethod
    public void stopDiscovery(PluginCall call) {

        try {
            BluetoothAdapter adapter =
                BluetoothAdapter.getDefaultAdapter();

            if (adapter != null && adapter.isDiscovering()) {
                adapter.cancelDiscovery();
            }

            unregisterReceiver();

            call.resolve();

        } catch (Exception error) {
            call.reject(error.getMessage());
        }
    }

    private void unregisterReceiver() {

        if (receiver != null && receiverRegistered) {

            try {
                getContext().unregisterReceiver(receiver);
            } catch (Exception ignored) {}

            receiverRegistered = false;
            receiver = null;
        }
    }
}