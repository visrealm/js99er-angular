import {Log} from '../../classes/log';

export class PICO9918Config {

    static STORAGE_KEY = "pico9918config";
    static CONFIG_BYTES = 256;

    // Config indices (from config.h)
    static CONF_PICO_MODEL = 0;
    static CONF_HW_VERSION = 1;
    static CONF_SW_VERSION = 2;
    static CONF_SW_PATCH_VERSION = 3;
    static CONF_CLOCK_TESTED = 4;
    static CONF_DISP_DRIVER = 5;
    static CONF_FLASH_STATUS = 6;
    static CONF_CRT_SCANLINES = 8;
    static CONF_SCANLINE_SPRITES = 9;
    static CONF_CLOCK_PRESET_ID = 10;
    static CONF_DIAG = 16;
    static CONF_DIAG_REGISTERS = 17;
    static CONF_DIAG_PERFORMANCE = 18;
    static CONF_DIAG_PALETTE = 19;
    static CONF_DIAG_ADDRESS = 20;
    static CONF_PALETTE_IDX_0 = 128;
    static CONF_SAVE_TO_FLASH = 255;

    // Default palette (original 9918A colors in RGB444 format)
    private static readonly DEFAULT_PALETTE = [
        "000", //  0 Transparent
        "000", //  1 Black
        "2C3", //  2 Medium Green
        "5D6", //  3 Light Green
        "54F", //  4 Dark Blue
        "76F", //  5 Light Blue
        "D54", //  6 Dark Red
        "4EF", //  7 Cyan
        "F54", //  8 Medium Red
        "F76", //  9 Light Red
        "DC3", // 10 Dark Yellow
        "ED6", // 11 Light Yellow
        "2B2", // 12 Dark Green
        "C5C", // 13 Magenta
        "CCC", // 14 Gray
        "FFF"  // 15 White
    ];

    private config: Uint8Array;
    private configDirty: boolean = false;
    private log = Log.getLog();

    constructor() {
        this.config = new Uint8Array(PICO9918Config.CONFIG_BYTES);
    }

    readConfig(): void {
        try {
            const stored = localStorage.getItem(PICO9918Config.STORAGE_KEY);
            if (stored) {
                // Decode base64 string
                const decoded = atob(stored);
                const bytes = new Uint8Array(decoded.length);
                for (let i = 0; i < decoded.length; i++) {
                    bytes[i] = decoded.charCodeAt(i);
                }

                // Validate stored config
                if (this.isValidConfig(bytes)) {
                    this.config.set(bytes);
                    this.log.info("PICO9918 config loaded from localStorage");
                    return;
                }
            }
        } catch (e) {
            this.log.error("PICO9918 config read error: " + e);
        }

        // Initialize defaults if no valid config found
        this.initializeDefaults();
        this.log.info("PICO9918 config initialized with defaults");
    }

    writeConfig(): void {
        try {
            // Convert to binary string
            let binary = '';
            for (let i = 0; i < this.config.length; i++) {
                binary += String.fromCharCode(this.config[i]);
            }
            // Encode as base64
            const encoded = btoa(binary);
            localStorage.setItem(PICO9918Config.STORAGE_KEY, encoded);
            this.log.info("PICO9918 config saved to localStorage");
        } catch (e) {
            this.log.error("PICO9918 config write error: " + e);
        }
    }

    private isValidConfig(config: Uint8Array): boolean {
        if (config.length < PICO9918Config.CONFIG_BYTES) {
            return false;
        }

        // Validate critical values
        return config[PICO9918Config.CONF_PICO_MODEL] === 2 &&  // RP2350
               config[PICO9918Config.CONF_CLOCK_PRESET_ID] <= 2 &&
               config[PICO9918Config.CONF_CRT_SCANLINES] <= 1 &&
               config[PICO9918Config.CONF_SCANLINE_SPRITES] <= 3 &&
               config[PICO9918Config.CONF_PALETTE_IDX_0] === 0x00 &&
               (config[PICO9918Config.CONF_PALETTE_IDX_0 + 2] & 0xf0) === 0xf0;
    }

    private initializeDefaults(): void {
        // Clear all config
        this.config.fill(0);

        // Set read-only values
        this.config[PICO9918Config.CONF_PICO_MODEL] = 2;      // RP2350
        this.config[PICO9918Config.CONF_HW_VERSION] = 0x10;   // v1.x
        this.config[PICO9918Config.CONF_SW_VERSION] = 0x10;   // v1.0
        this.config[PICO9918Config.CONF_SW_PATCH_VERSION] = 3; // v1.0.3
        this.config[PICO9918Config.CONF_DISP_DRIVER] = 0;     // VGA

        // Set default user settings
        this.config[PICO9918Config.CONF_CLOCK_TESTED] = 0;
        this.config[PICO9918Config.CONF_CRT_SCANLINES] = 0;
        this.config[PICO9918Config.CONF_SCANLINE_SPRITES] = 0;
        this.config[PICO9918Config.CONF_CLOCK_PRESET_ID] = 0;

        // Initialize default palette (RGB444 format, big-endian)
        // Format: 0xfRGB where f=alpha (0xf), R/G/B are 4-bit values
        this.config[PICO9918Config.CONF_PALETTE_IDX_0] = 0x00;      // Color 0 is always 0x0000
        this.config[PICO9918Config.CONF_PALETTE_IDX_0 + 1] = 0x00;

        for (let i = 1; i < 16; i++) {
            const colorStr = PICO9918Config.DEFAULT_PALETTE[i];
            const r = parseInt(colorStr.charAt(0), 16);
            const g = parseInt(colorStr.charAt(1), 16);
            const b = parseInt(colorStr.charAt(2), 16);

            // Convert to big-endian RGB444 with alpha
            // Byte 0: 0xfR (alpha=0xf, red in low nibble)
            // Byte 1: 0xGB (green in high nibble, blue in low nibble)
            const rgb = 0xf000 | (r << 8) | (g << 4) | b;
            const offset = PICO9918Config.CONF_PALETTE_IDX_0 + (i * 2);
            this.config[offset] = (rgb >> 8) & 0xff;      // High byte (0xfR)
            this.config[offset + 1] = rgb & 0xff;         // Low byte (0xGB)
        }
    }

    getValue(index: number): number {
        if (index < 0 || index >= PICO9918Config.CONFIG_BYTES) {
            return 0;
        }
        return this.config[index];
    }

    setValue(index: number, value: number): void {
        if (index < 0 || index >= PICO9918Config.CONFIG_BYTES) {
            return;
        }

        // Prevent modification of read-only values
        if (index === PICO9918Config.CONF_PICO_MODEL ||
            index === PICO9918Config.CONF_HW_VERSION ||
            index === PICO9918Config.CONF_SW_VERSION ||
            index === PICO9918Config.CONF_DISP_DRIVER) {
            this.log.warn("PICO9918 config: Attempt to modify read-only value at index " + index);
            return;
        }

        // Special handling for CONF_SAVE_TO_FLASH
        if (index === PICO9918Config.CONF_SAVE_TO_FLASH && value === 1) {
            this.writeConfig();
            this.config[index] = 0;  // Reset flag after save
            return;
        }

        this.config[index] = value & 0xff;
        this.configDirty = true;
    }

    isConfigDirty(): boolean {
        return this.configDirty;
    }

    clearConfigDirty(): void {
        this.configDirty = false;
    }

    getState(): any {
        return {
            config: Array.from(this.config),
            configDirty: this.configDirty
        };
    }

    restoreState(state: any): void {
        if (state.config) {
            this.config.set(new Uint8Array(state.config));
        }
        this.configDirty = state.configDirty || false;
    }
}
