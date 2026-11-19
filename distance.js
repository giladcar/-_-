const REFERENCE_RSSI = -59;
const ENVIRONMENT_FACTOR = 2.2;

export function calculateDistance(rssi) {
    if (
        rssi === null ||
        rssi === undefined ||
        !Number.isFinite(rssi) ||
        rssi >= 0
    ) {
        return null;
    }

    const distance = Math.pow(
        10,
        (REFERENCE_RSSI - rssi) /
        (10 * ENVIRONMENT_FACTOR)
    );

    return Math.max(0, Math.min(distance, 100));
}