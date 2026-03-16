
/**
 * Parses an ISO 8601 duration string (e.g., P1DT7H54M, PT1M30S, PT1H, PT45S)
 * into total seconds.
 */
export function parseISO8601Duration(duration: string): number {
    // Regex to capture Days (D), Hours (H), Minutes (M), and Seconds (S)
    const match = duration.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const days = parseInt(match[1] || '0', 10);
    const hours = parseInt(match[2] || '0', 10);
    const minutes = parseInt(match[3] || '0', 10);
    const seconds = parseInt(match[4] || '0', 10);

    return days * 86400 + hours * 3600 + minutes * 60 + seconds;
}
