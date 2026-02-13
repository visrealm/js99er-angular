import {F18A} from './f18a';
import {F18AGPU} from './f18a-gpu';
import {PICO9918GPU} from './pico9918-gpu';
import {PICO9918Flash} from './pico9918-flash';
import {TI994A} from './ti994a';
import {WasmService} from '../../services/wasm.service';
import {Log} from '../../classes/log';
import {VDPType} from '../../classes/settings';

export class PICO9918 extends F18A {

    private flash: PICO9918Flash | null = null;

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

          case 0x3F:  // Flash operation (register 63)
            const isFirmware = (value & 0x40) !== 0;
            // Only handle data mode (not firmware updates)
            if (!isFirmware) {
                this.handleFlashOperation(value);
            }
            break;
        }
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

    protected override isDoubledV(): boolean {
        return (this.registers[0] & 0x08) === 0;
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

    override reset() {
        super.reset();

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
        return state;
    }

    override restoreState(state: any) {
        super.restoreState(state);
        if (state && state.flash && this.flash) {
            this.flash.restoreState(state.flash);
        }
    }
}
