import {F18A} from './f18a';
import {F18AGPU} from './f18a-gpu';
import {PICO9918GPU} from './pico9918-gpu';
import {TI994A} from './ti994a';
import {WasmService} from '../../services/wasm.service';
import {VDPType} from '../../classes/settings';

export class PICO9918 extends F18A {

    constructor(canvas: HTMLCanvasElement, console: TI994A, wasmService: WasmService) {
        super(canvas, console, wasmService);
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

    protected override shouldDoublePixels(): boolean {
        return true;
    }

    protected override drawSplash() {
        if (!this.splashImage) {
            return;
        }
        const inset = 2;
        const drawW = this.splashImage.width;
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
}
