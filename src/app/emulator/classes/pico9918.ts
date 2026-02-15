import {F18A} from './f18a';
import {F18AGPU} from './f18a-gpu';
import {PICO9918GPU} from './pico9918-gpu';
import {PICO9918Flash} from './pico9918-flash';
import {PICO9918Config} from './pico9918-config';
import {PICO9918Diagnostics} from './pico9918-diagnostics';
import {TI994A} from './ti994a';
import {WasmService} from '../../services/wasm.service';
import {Log} from '../../classes/log';
import {VDPType} from '../../classes/settings';

export class PICO9918 extends F18A {

    private flash: PICO9918Flash | null = null;
    private config: PICO9918Config | null = null;
    private diagnostics: PICO9918Diagnostics | null = null;

    constructor(canvas: HTMLCanvasElement, console: TI994A, wasmService: WasmService) {
        super(canvas, console, wasmService, false);
        this.isPico9918 = true;
    }

    override getType(): VDPType {
        return 'PICO9918';
    }

    protected override getSplashImagePath(): string {
        return 'assets/images/pico9918_bitmap_v1.0.3.png';
    }

    protected override getStatusRegister1Id(): number {
        return 0xE8;
    }

    protected override createGPU(): F18AGPU {
        return new PICO9918GPU(this);
    }

    protected override getCanvasSize(): { width: number, height: number } {
        return { width: 640, height: 480 };
    }

    protected override isDoubledH(): boolean {
        return this.screenMode !== F18A.MODE_TEXT_80;
    }

    override writeRegister(reg: number, value: number) {
        const oldDoubledV = this.isDoubledV();
        super.writeRegister(reg, value);

        switch (reg)
        {
          case 0:
            if (this.isDoubledV() !== oldDoubledV) {
                this.setDimensions(false);
            }
            break;

          case 50:
            if ((value & 0xc0) === 0xc0) {  // PICO9918 resets palette if 0x40 bit set
              this.resetPalette();
            }
            break;

          case 58:  // VR58: Config option read - update SR12
            // SR12 will return config[VR58] on next readStatus()
            // Handled in readStatus() case 12
            break;

          case 59:  // VR59: Config option write
            if (this.config && this.registers[58] >= 8) {
                const configIndex = this.registers[58];
                this.config.setValue(configIndex, value);
                // Apply config changes immediately if needed
                if (this.config.isConfigDirty()) {
                    this.applyConfig();
                    this.config.clearConfigDirty();
                }
            }
            break;

          case 0x3F:  // Flash operation (register 63)
            const isFirmware = (value & 0x40) !== 0;
            // Only handle data mode (not firmware updates)
            if (!isFirmware) {
                this.handleFlashOperation(value);
            }
            break;
        }
    }

    override readStatus(): number {
        // VR15 controls which status register is selected
        const statusRegNo = this.registers[15];

        // Handle SR12 for config
        if (statusRegNo === 12 && this.config) {
            const configIndex = this.registers[58];
            return this.config.getValue(configIndex);
        }

        // Fall back to parent implementation
        return super.readStatus();
    }

    private handleFlashOperation(flashReg: number) {
        if (!this.flash) {
            return; // Flash not initialized yet
        }

        const vramAddr = (flashReg & 0x3F) << 8;
        const isWrite = (flashReg & 0x80) !== 0;

        // Execute operation (synchronous)
        this.flash.executeOperation(vramAddr, isWrite, () => {
            // Completion callback - update status register 2 with flash status
            // F18A will combine this with GPU status (bit 7) automatically
            if (this.flash) {
                this.getRAM()[0xB000] = this.flash.getStatusByte();
            }
        });
    }

    private applyConfig(): void {
        if (!this.config) {
            return;
        }

        // Apply CRT scanlines to rendering (would need renderer support)
        // const scanlines = this.config.getValue(PICO9918Config.CONF_CRT_SCANLINES);
        // Note: Scanline rendering not currently implemented in js99er

        // Apply scanline sprite setting to VR30
        const scanlineSprites = this.config.getValue(PICO9918Config.CONF_SCANLINE_SPRITES);
        this.registers[30] = 1 << (scanlineSprites + 2);

        // Apply default palette from config
        for (let i = 0; i < 16; i++) {
            const paletteOffset = PICO9918Config.CONF_PALETTE_IDX_0 + (i * 2);
            const rgb = (this.config.getValue(paletteOffset) << 8) |
                        this.config.getValue(paletteOffset + 1);
            // Convert from big-endian RGB444 to palette format
            // Format: 0xf000 | 0x0RGB (4 bits per channel)
            const r = (rgb & 0x0f00) >> 8;
            const g = (rgb & 0x00f0) >> 4;
            const b = (rgb & 0x000f);
            // Scale 0-15 to 0-255 and update palette
            this.setPaletteEntry(i, r * 17, g * 17, b * 17);
        }

        // Update diagnostic flag
        const diagRegs = this.config.getValue(PICO9918Config.CONF_DIAG_REGISTERS);
        const diagPerf = this.config.getValue(PICO9918Config.CONF_DIAG_PERFORMANCE);
        const diagPal = this.config.getValue(PICO9918Config.CONF_DIAG_PALETTE);
        const diagAddr = this.config.getValue(PICO9918Config.CONF_DIAG_ADDRESS);
        const diagEnabled = diagRegs || diagPerf || diagPal || diagAddr;
        this.config.setValue(PICO9918Config.CONF_DIAG, diagEnabled ? 1 : 0);
    }

    protected override isDoubledV(): boolean {
        return (this.registers[0] & 0x08) === 0;
    }

    protected isExtendedRowMode(): boolean {
        // Extended row mode when bit 3 = 1 (not doubled)
        return !this.isDoubledV();
    }

    protected override getBaseRows(): number {
        if (this.isExtendedRowMode()) {
            // Extended mode: 48 rows (normal) or 60 rows (ROW30)
            return this.row30Enabled ? 60 : 48;
        }
        // Standard F18A mode: 24 or 30 rows
        return this.row30Enabled ? 30 : 24;
    }

    override getScanlineCount(): number {
        // Extended mode needs 480 scanlines (no vertical doubling)
        // Standard mode needs 240 scanlines (with vertical doubling)
        return this.isExtendedRowMode() ? 480 : 240;
    }

    protected override drawSplash() {
        if (!this.splashImage) {
            return;
        }
        const inset = 2;
        const drawH = this.splashImage.height;
        // Slide up: 1 pixel every 2 frames, using scaled height
        const slideFrames = drawH * 2;
        const holdUntil = 500;
        const slideDownEnd = holdUntil + slideFrames;

        let pixelsVisible: number;
        if (this.frameCounter < slideFrames) {
            // Sliding up: 1 pixel per 2 frames
            pixelsVisible = Math.floor(this.frameCounter / 2) + 1;
        } else if (this.frameCounter < holdUntil) {
            // Holding fully visible
            pixelsVisible = drawH;
        } else if (this.frameCounter < slideDownEnd) {
            // Sliding down: 1 pixel per 2 frames
            pixelsVisible = drawH - Math.floor((this.frameCounter - holdUntil) / 2);
        } else {
            return;
        }

        const x = inset;
        const y = this.canvasHeight - inset - pixelsVisible;
        this.canvasContext.drawImage(this.splashImage, x, y, this.splashImage.width, drawH);
    }

    override updateCanvas() {
        // Call parent to render VDP output and splash
        super.updateCanvas();

        // Render diagnostic overlays on top
        if (this.diagnostics && this.config) {
            this.diagnostics.update(this.frameCounter);
            this.diagnostics.render(
                this.canvasContext,
                this.config,
                this.registers,
                this.isUnlocked(),
                this.getPalette(),
                this.canvasWidth,
                this.canvasHeight,
                this.isDoubledV()
            );
        }
    }

    override reset() {
        super.reset();

        // Initialize config storage
        if (!this.config) {
            this.config = new PICO9918Config();
            this.config.readConfig();
        } else {
            this.config.readConfig();
        }

        // Apply initial config
        this.applyConfig();

        // Initialize diagnostics
        if (!this.diagnostics) {
            this.diagnostics = new PICO9918Diagnostics();
        }

        // Initialize flash storage (similar to F18AGPU pattern)
        if (!this.flash) {
            this.flash = new PICO9918Flash(() => this.getRAM(), (restored) => {
                if (restored) {
                    Log.getLog().info("PICO9918 flash restored");
                }
            });
        } else {
            this.flash.reset();
        }
    }

    override getState(): any {
        const state = super.getState();
        state.flash = this.flash ? this.flash.getState() : null;
        state.config = this.config ? this.config.getState() : null;
        return state;
    }

    override restoreState(state: any) {
        super.restoreState(state);
        if (state && state.flash && this.flash) {
            this.flash.restoreState(state.flash);
        }
        if (state && state.config && this.config) {
            this.config.restoreState(state.config);
        }
    }
}
