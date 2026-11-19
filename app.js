import {
    scanBluetoothDevices,
    stopBluetoothScan,
    connectBluetoothDevice
} from "./bluetooth.js";

import { calculateDistance } from "./distance.js";

const scanButton = document.getElementById("scanButton");
const connectionStatus = document.getElementById("connectionStatus");
const devicesList = document.getElementById("devicesList");
const distanceElement = document.getElementById("distance");
const distanceStatus = document.getElementById("distanceStatus");
const speakButton = document.getElementById("speakButton");

let devices = new Map();
let selectedDevice = null;
let scanning = false;

scanButton.addEventListener("click", async () => {
    if (scanning) {
        await stopBluetoothScan();
        scanning = false;
        scanButton.textContent = "חפש התקני Bluetooth";
        connectionStatus.textContent = "הסריקה הופסקה";
        return;
    }

    try {
        devices.clear();
        scanning = true;

        scanButton.textContent = "עצור סריקה";
        connectionStatus.textContent = "מחפש התקני Bluetooth...";
        devicesList.innerHTML = "<p>מחפש התקנים בסביבה...</p>";

        await scanBluetoothDevices(handleDeviceFound);

    } catch (error) {
        scanning = false;
        scanButton.textContent = "חפש התקני Bluetooth";

        connectionStatus.textContent =
            "לא ניתן להפעיל Bluetooth";

        console.error(error);
    }
});

function handleDeviceFound(device) {
    if (!device.deviceId) return;

    const previous = devices.get(device.deviceId) || {};

    const updatedDevice = {
        ...previous,
        ...device
    };

    devices.set(device.deviceId, updatedDevice);

    if (
        selectedDevice &&
        selectedDevice.deviceId === device.deviceId
    ) {
        updateDistance(device.rssi);
    }

    renderDevices();
}

function renderDevices() {
    if (devices.size === 0) {
        devicesList.innerHTML =
            "<p>עדיין לא נמצאו התקנים</p>";
        return;
    }

    devicesList.innerHTML = "";

    devices.forEach(device => {
        const item = document.createElement("div");
        item.className = "device-item";

        const name = document.createElement("h3");
        name.textContent = device.name || "התקן ללא שם";

        const signal = document.createElement("p");
        signal.textContent =
            device.rssi != null
                ? `עוצמת אות: ${device.rssi}`
                : "עוצמת האות אינה זמינה";

        const button = document.createElement("button");
        button.textContent = "בחר והתחבר";

        button.addEventListener("click", () => {
            selectDevice(device);
        });

        item.append(name, signal, button);
        devicesList.appendChild(item);
    });
}

async function selectDevice(device) {
    try {
        connectionStatus.textContent = "מתחבר להתקן...";

        await connectBluetoothDevice(
            device.deviceId,
            () => {
                selectedDevice = null;
                distanceElement.textContent = "--";
                distanceStatus.textContent = "החיבור נותק";
                connectionStatus.textContent = "לא מחובר";
            }
        );

        selectedDevice = device;

        connectionStatus.textContent =
            `מחובר אל ${device.name || "ההתקן שנבחר"}`;

        updateDistance(device.rssi);

    } catch (error) {
        console.error(error);

        connectionStatus.textContent =
            "לא הצלחנו להתחבר להתקן";

        alert("לא ניתן להתחבר להתקן הזה. ייתכן שהוא אינו תומך בחיבור BLE.");
    }
}

function updateDistance(rssi) {
    const distance = calculateDistance(rssi);

    if (distance === null) {
        distanceElement.textContent = "--";
        distanceStatus.textContent =
            "אין מספיק מידע למדידת המרחק";
        return;
    }

    distanceElement.textContent =
        `כ-${distance.toFixed(1)}`;

    distanceStatus.textContent = "מטרים (הערכה בלבד)";
}

speakButton.addEventListener("click", () => {
    if (!selectedDevice) {
        alert("קודם צריך להתחבר להתקן");
        return;
    }

    const distance = distanceElement.textContent;

    if (distance === "--") {
        alert("עדיין אין נתוני מרחק");
        return;
    }

    const message = `המרחק המשוער מההתקן הוא ${distance} מטרים`;

    const speech = new SpeechSynthesisUtterance(message);
    speech.lang = "he-IL";
    speech.rate = 0.85;

    speechSynthesis.cancel();
    speechSynthesis.speak(speech);
});