import {PICO9918Config} from './pico9918-config';

export class PICO9918Diagnostics {

    private static readonly CHAR_WIDTH = 6;
    private static readonly CHAR_HEIGHT = 6;

    // Colors (RGB444 format from hardware converted to RGB888)
    // Hardware color values from diag.c converted to RGB888
    private static readonly LABEL_COLOR = 0xFFFF77;  // Aqua (0x0ff7 = R=7, G=F, B=F)
    private static readonly VALUE_COLOR = 0xFFFFFF;  // White (0x0fff = R=F, G=F, B=F)
    private static readonly UNITS_COLOR = 0x888888;  // Gray (0x0888 = R=8, G=8, B=8)
    private static readonly DARKEN_MASK = 0x333333;  // For background darkening

    // Actual PICO9918 font bitmap (1bpp, 128x32 pixels from font.png)
    // Extracted from bmp_font.c generated from src\res\font.png
    private static readonly FONT = new Uint8Array([
        0x00, 0x20, 0x50, 0x50, 0x78, 0xc8, 0x00, 0x20, 0xf8, 0xf8, 0x50, 0x20, 0x00, 0x00, 0x00, 0x08,
        0x00, 0x20, 0x50, 0xf8, 0xa0, 0xd0, 0x50, 0x20, 0x88, 0xf8, 0x20, 0x20, 0x00, 0x00, 0x00, 0x10,
        0x00, 0x20, 0x00, 0x50, 0x70, 0x20, 0xa8, 0x00, 0x88, 0xf8, 0x50, 0xf8, 0x00, 0xf8, 0x00, 0x20,
        0x00, 0x00, 0x00, 0xf8, 0x28, 0x58, 0xa8, 0x00, 0x88, 0xf8, 0x00, 0x20, 0x20, 0x00, 0x00, 0x40,
        0x00, 0x20, 0x00, 0x50, 0xf0, 0x98, 0xa8, 0x00, 0xf8, 0xf8, 0x00, 0x20, 0x40, 0x00, 0x20, 0x80,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x70, 0x20, 0x70, 0xf0, 0x90, 0xf8, 0x78, 0xf8, 0x70, 0x70, 0x00, 0x20, 0x10, 0x00, 0x40, 0x70,
        0x98, 0x60, 0x88, 0x08, 0x90, 0x80, 0x80, 0x10, 0x88, 0x88, 0x20, 0x20, 0x20, 0xf8, 0x20, 0x88,
        0xa8, 0x20, 0x30, 0x70, 0xf8, 0xf0, 0xf0, 0x20, 0x70, 0x78, 0x00, 0x00, 0x40, 0x00, 0x10, 0x30,
        0xc8, 0x20, 0x40, 0x08, 0x10, 0x08, 0x88, 0x40, 0x88, 0x08, 0x20, 0x00, 0x20, 0xf8, 0x20, 0x00,
        0x70, 0x70, 0xf8, 0xf0, 0x10, 0xf0, 0x70, 0x80, 0x70, 0xf0, 0x00, 0x00, 0x10, 0x00, 0x40, 0x20,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x70, 0x70, 0xf0, 0x70, 0xf0, 0xf8, 0xf8, 0x78, 0x88, 0x70, 0x38, 0x88, 0x80, 0x88, 0x88, 0x70,
        0x88, 0x88, 0x88, 0x88, 0x88, 0x80, 0x80, 0x80, 0x88, 0x20, 0x10, 0x90, 0x80, 0xd8, 0xc8, 0x88,
        0xb8, 0xf8, 0xf0, 0x80, 0x88, 0xf0, 0xf0, 0xb8, 0xf8, 0x20, 0x10, 0xe0, 0x80, 0xa8, 0xa8, 0x88,
        0x80, 0x88, 0x88, 0x88, 0x88, 0x80, 0x80, 0x88, 0x88, 0x20, 0x90, 0x90, 0x80, 0x88, 0x98, 0x88,
        0x78, 0x88, 0xf0, 0x70, 0xf0, 0xf8, 0x80, 0x78, 0x88, 0x70, 0x60, 0x88, 0xf8, 0x88, 0x88, 0x70,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0xf0, 0x70, 0xf0, 0x78, 0xf8, 0x88, 0x88, 0x88, 0x88, 0x88, 0xf8, 0x60, 0x80, 0x30, 0x60, 0x00,
        0x88, 0x88, 0x88, 0x80, 0x20, 0x88, 0x88, 0x88, 0x50, 0x50, 0x10, 0x40, 0x40, 0x10, 0x90, 0x00,
        0xf0, 0xa8, 0xf0, 0x70, 0x20, 0x88, 0x88, 0xa8, 0x20, 0x20, 0x20, 0x40, 0x20, 0x10, 0x60, 0x00,
        0x80, 0x90, 0x88, 0x08, 0x20, 0x88, 0x50, 0xd8, 0x50, 0x20, 0x40, 0x40, 0x10, 0x10, 0x00, 0x00,
        0x80, 0x68, 0x88, 0xf0, 0x20, 0x70, 0x20, 0x88, 0x88, 0x20, 0xf8, 0x60, 0x08, 0x30, 0x00, 0xf8,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ]);

    // Mode names
    private static readonly MODE_NAMES = [
        'GFX I',
        'GFX II',
        'TEXT',
        'MULTI',
        '80 COL'
    ];

    // Extended registers to display
    private static readonly EXT_REGS = [
        10, 11, 15, 19, 24, 25, 26, 27,
        28, 29, 30, 31, 32, 33, 34, 35,
        36, 37, 38, 48, 49, 50, 51, 54,
        55, 56, 57, 58, 59, 63
    ];

    private frameCount = 0;
    private lastFrameTime = 0;
    private frameTimeAccum = 0;
    private fpsAccum = 0;
    private fpsUpdateCount = 0;

    private currentFPS = '60.00';
    private currentFrameTime = '16.67';

    constructor() {
        this.lastFrameTime = performance.now();
    }

    update(frameNumber: number): void {
        this.frameCount = frameNumber;

        const now = performance.now();
        const frameTime = now - this.lastFrameTime;
        this.lastFrameTime = now;

        this.frameTimeAccum += frameTime;
        this.fpsAccum++;
        this.fpsUpdateCount++;

        // Update every 4 frames (similar to hardware)
        if (this.fpsUpdateCount >= 4) {
            const avgFrameTime = this.frameTimeAccum / this.fpsAccum;
            this.currentFrameTime = avgFrameTime.toFixed(3);
            this.currentFPS = (1000 / avgFrameTime).toFixed(2);

            this.frameTimeAccum = 0;
            this.fpsAccum = 0;
            this.fpsUpdateCount = 0;
        }
    }

    render(
        canvasContext: CanvasRenderingContext2D,
        config: PICO9918Config,
        registers: Uint8Array,
        isUnlocked: boolean,
        palette: number[][],
        canvasWidth: number,
        canvasHeight: number,
        isDoubledV: boolean
    ): void {
        if (!config.getValue(PICO9918Config.CONF_DIAG)) {
            return;  // Diagnostics disabled
        }

        const imageData = canvasContext.getImageData(0, 0, canvasWidth, canvasHeight);
        const pixels = new Uint32Array(imageData.data.buffer);

        let leftRow = 0;

        // Performance diagnostics
        if (config.getValue(PICO9918Config.CONF_DIAG_PERFORMANCE)) {
            this.renderLeftPanel(pixels, canvasWidth, canvasHeight, leftRow++, 'HWVER : ', 'V1.0+', '', isDoubledV);
            this.renderLeftPanel(pixels, canvasWidth, canvasHeight, leftRow++, 'FWVER : ', 'v1.0.3', '', isDoubledV);
            this.renderLeftPanel(pixels, canvasWidth, canvasHeight, leftRow++, 'CLOCK : ', '252.0', 'MHZ', isDoubledV);
            this.renderLeftPanel(pixels, canvasWidth, canvasHeight, leftRow++, 'FRAME : ', this.currentFrameTime, 'MS', isDoubledV);
            this.renderLeftPanel(pixels, canvasWidth, canvasHeight, leftRow++, 'FPS   : ', this.currentFPS, 'FPS', isDoubledV);
            this.renderLeftPanel(pixels, canvasWidth, canvasHeight, leftRow++, 'GPU   : ', '0.00', '%', isDoubledV);
            this.renderLeftPanel(pixels, canvasWidth, canvasHeight, leftRow++, 'TEMP  : ', '25.0', '^C', isDoubledV);
            leftRow++;  // Blank line
        }

        // Address diagnostics
        if (config.getValue(PICO9918Config.CONF_DIAG_ADDRESS)) {
            const mode = this.getDisplayMode(registers);
            const nameTable = ((registers[2] & 0x0f) << 10).toString(16).toUpperCase().padStart(4, '0');
            const colorTable = this.getColorTableAddress(registers, mode).toString(16).toUpperCase().padStart(4, '0');
            const patternTable = this.getPatternTableAddress(registers, mode).toString(16).toUpperCase().padStart(4, '0');
            const spriteAttrTable = ((registers[5] & 0x7f) << 7).toString(16).toUpperCase().padStart(4, '0');
            const spritePatternTable = ((registers[6] & 0x07) << 11).toString(16).toUpperCase().padStart(4, '0');

            this.renderLeftPanel(pixels, canvasWidth, canvasHeight, leftRow++, 'MODE  : ', PICO9918Diagnostics.MODE_NAMES[mode], '', isDoubledV);
            this.renderLeftPanel(pixels, canvasWidth, canvasHeight, leftRow++, 'NAME  : >', nameTable, '', isDoubledV);
            this.renderLeftPanel(pixels, canvasWidth, canvasHeight, leftRow++, 'COLOR : >', colorTable, '', isDoubledV);
            this.renderLeftPanel(pixels, canvasWidth, canvasHeight, leftRow++, 'PATT  : >', patternTable, '', isDoubledV);
            this.renderLeftPanel(pixels, canvasWidth, canvasHeight, leftRow++, 'SP ATR: >', spriteAttrTable, '', isDoubledV);
            this.renderLeftPanel(pixels, canvasWidth, canvasHeight, leftRow++, 'SP PAT: >', spritePatternTable, '', isDoubledV);
            leftRow++;  // Blank line
        }

        // Register diagnostics (right side)
        if (config.getValue(PICO9918Config.CONF_DIAG_REGISTERS)) {
            this.renderRegisters(pixels, canvasWidth, canvasHeight, registers, isUnlocked, isDoubledV);
        }

        // Palette diagnostics (bottom)
        if (config.getValue(PICO9918Config.CONF_DIAG_PALETTE)) {
            this.renderPalette(pixels, canvasWidth, canvasHeight, palette, isDoubledV);
        }

        canvasContext.putImageData(imageData, 0, 0);
    }

    private renderLeftPanel(
        pixels: Uint32Array,
        canvasWidth: number,
        canvasHeight: number,
        row: number,
        label: string,
        value: string,
        units: string,
        isDoubledV: boolean
    ): void {
        // In double-V mode (24/30 rows), each character row takes 12 pixels (doubled), otherwise 6
        const rowHeight = isDoubledV ? PICO9918Diagnostics.CHAR_HEIGHT * 2 : PICO9918Diagnostics.CHAR_HEIGHT;
        const y = row * rowHeight + 2;

        // Render each scanline of this row
        for (let scanline = 0; scanline < PICO9918Diagnostics.CHAR_HEIGHT; scanline++) {
            // When doubling, advance by 2 pixels per scanline; otherwise by 1
            let pixelRow = y + (isDoubledV ? scanline * 2 : scanline);

            let x = 4;
            x = this.renderTextScanline(pixels, canvasWidth, scanline, x, pixelRow, label, PICO9918Diagnostics.LABEL_COLOR);
            x = this.renderTextScanline(pixels, canvasWidth, scanline, x, pixelRow, value, PICO9918Diagnostics.VALUE_COLOR);
            x = this.renderTextScanline(pixels, canvasWidth, scanline, x, pixelRow, units, PICO9918Diagnostics.UNITS_COLOR);
            this.darkenBackgroundScanline(pixels, canvasWidth, x, pixelRow, 102);

            // In double-V mode (isDoubledV=true, 24/30 rows), repeat the scanline on the next pixel row
            if (isDoubledV) {
                let x2 = 4;
                x2 = this.renderTextScanline(pixels, canvasWidth, scanline, x2, pixelRow + 1, label, PICO9918Diagnostics.LABEL_COLOR);
                x2 = this.renderTextScanline(pixels, canvasWidth, scanline, x2, pixelRow + 1, value, PICO9918Diagnostics.VALUE_COLOR);
                x2 = this.renderTextScanline(pixels, canvasWidth, scanline, x2, pixelRow + 1, units, PICO9918Diagnostics.UNITS_COLOR);
                this.darkenBackgroundScanline(pixels, canvasWidth, x2, pixelRow + 1, 102);
            }
        }
    }

    private renderTextScanline(
        pixels: Uint32Array,
        canvasWidth: number,
        scanline: number,
        x: number,
        y: number,
        text: string,
        color: number
    ): number {
        let fontY = scanline;
        if (fontY < 0 || fontY >= PICO9918Diagnostics.CHAR_HEIGHT) return x;

        fontY <<= 1;  // Double for bitmap indexing (characters use 12 rows in 32-pixel bitmap)

        for (let i = 0; i < text.length; i++) {
            let charCode = text.charCodeAt(i);
            const c = charCode - 32;  // Adjust to font table (starts at ASCII 32 = space)

            // Get bitmap byte using hardware formula: font[(((c & 0x30) + fontY) << 3) + (c & 0xf)]
            const index = (((c & 0x30) + fontY) << 3) + (c & 0x0f);
            let bits = PICO9918Diagnostics.FONT[index] || 0;

            // Render 6 pixels for this character
            for (let col = 0; col < PICO9918Diagnostics.CHAR_WIDTH; col++) {
                const drawBit = (bits & 0x80) !== 0;
                const pixelIndex = y * canvasWidth + x;

                if (pixelIndex >= 0 && pixelIndex < pixels.length) {
                    if (drawBit) {
                        pixels[pixelIndex] = 0xFF000000 | color;
                    } else {
                        pixels[pixelIndex] = (pixels[pixelIndex] & 0xFF000000) |
                                            ((pixels[pixelIndex] >> 2) & PICO9918Diagnostics.DARKEN_MASK);
                    }
                }

                bits <<= 1;
                x++;
            }
        }

        return x;
    }

    private darkenBackgroundScanline(
        pixels: Uint32Array,
        canvasWidth: number,
        startX: number,
        y: number,
        endX: number
    ): void {
        for (let x = startX; x < endX; x++) {
            const pixelIndex = y * canvasWidth + x;
            if (pixelIndex >= 0 && pixelIndex < pixels.length) {
                pixels[pixelIndex] = (pixels[pixelIndex] & 0xFF000000) |
                                    ((pixels[pixelIndex] >> 2) & PICO9918Diagnostics.DARKEN_MASK);
            }
        }
    }

    private renderRegisters(
        pixels: Uint32Array,
        canvasWidth: number,
        canvasHeight: number,
        registers: Uint8Array,
        isUnlocked: boolean,
        isDoubledV: boolean
    ): void {
        const maxRegs = isUnlocked ? 8 + PICO9918Diagnostics.EXT_REGS.length : 8;
        const rowHeight = isDoubledV ? PICO9918Diagnostics.CHAR_HEIGHT * 2 : PICO9918Diagnostics.CHAR_HEIGHT;

        for (let i = 0; i < maxRegs; i++) {
            const regNum = i < 8 ? i : PICO9918Diagnostics.EXT_REGS[i - 8];
            const y = i * rowHeight + 2;
            const x = canvasWidth - (PICO9918Diagnostics.CHAR_WIDTH * 13);

            const regValue = registers[regNum];
            const highNibble = (regValue >> 4) & 0x0F;
            const lowNibble = regValue & 0x0F;

            // Register label (e.g., "R00:")
            const label = `R${regNum.toString().padStart(2, '0')}:`;

            // High nibble in binary (using parentheses for 0/1)
            const highBinary = this.nibbleToBinary(highNibble);

            // Low nibble in binary
            const lowBinary = this.nibbleToBinary(lowNibble);

            // Render each scanline
            for (let scanline = 0; scanline < PICO9918Diagnostics.CHAR_HEIGHT; scanline++) {
                // When doubling, advance by 2 pixels per scanline; otherwise by 1
                let pixelRow = y + (isDoubledV ? scanline * 2 : scanline);

                let xPos = this.renderTextScanline(pixels, canvasWidth, scanline, x, pixelRow, label, PICO9918Diagnostics.LABEL_COLOR);
                this.darkenBackgroundScanline(pixels, canvasWidth, xPos, pixelRow, xPos + 2);  // 2 pixel gap
                xPos += 2;
                xPos = this.renderTextScanline(pixels, canvasWidth, scanline, xPos, pixelRow, highBinary, PICO9918Diagnostics.VALUE_COLOR);
                this.darkenBackgroundScanline(pixels, canvasWidth, xPos, pixelRow, xPos + 2);  // 2 pixel gap
                xPos += 2;
                this.renderTextScanline(pixels, canvasWidth, scanline, xPos, pixelRow, lowBinary, PICO9918Diagnostics.VALUE_COLOR);

                // In double-V mode (isDoubledV=true, 24/30 rows), repeat the scanline on the next pixel row
                if (isDoubledV) {
                    let xPos2 = this.renderTextScanline(pixels, canvasWidth, scanline, x, pixelRow + 1, label, PICO9918Diagnostics.LABEL_COLOR);
                    this.darkenBackgroundScanline(pixels, canvasWidth, xPos2, pixelRow + 1, xPos2 + 2);
                    xPos2 += 2;
                    xPos2 = this.renderTextScanline(pixels, canvasWidth, scanline, xPos2, pixelRow + 1, highBinary, PICO9918Diagnostics.VALUE_COLOR);
                    this.darkenBackgroundScanline(pixels, canvasWidth, xPos2, pixelRow + 1, xPos2 + 2);
                    xPos2 += 2;
                    this.renderTextScanline(pixels, canvasWidth, scanline, xPos2, pixelRow + 1, lowBinary, PICO9918Diagnostics.VALUE_COLOR);
                }
            }
        }
    }

    private nibbleToBinary(nibble: number): string {
        // Use ( for 0 and ) for 1 to match hardware
        return ((nibble & 8) ? ')' : '(') +
               ((nibble & 4) ? ')' : '(') +
               ((nibble & 2) ? ')' : '(') +
               ((nibble & 1) ? ')' : '(');
    }

    private renderPalette(
        pixels: Uint32Array,
        canvasWidth: number,
        canvasHeight: number,
        palette: number[][],
        isDoubledV: boolean
    ): void {
        const rowHeight = isDoubledV ? PICO9918Diagnostics.CHAR_HEIGHT * 2 : PICO9918Diagnostics.CHAR_HEIGHT;
        const startY = canvasHeight - (4 * rowHeight) - 4;

        for (let paletteNum = 0; paletteNum < 4; paletteNum++) {
            const y = startY + (paletteNum * rowHeight);

            // Render palette label
            const label = `PALETTE ${paletteNum}:`;
            for (let scanline = 0; scanline < PICO9918Diagnostics.CHAR_HEIGHT; scanline++) {
                // When doubling, advance by 2 pixels per scanline; otherwise by 1
                let pixelRow = y + (isDoubledV ? scanline * 2 : scanline);
                this.renderTextScanline(pixels, canvasWidth, scanline, 4, pixelRow, label, PICO9918Diagnostics.LABEL_COLOR);

                // In double-V mode (isDoubledV=true, 24/30 rows), repeat the scanline on the next pixel row
                if (isDoubledV) {
                    this.renderTextScanline(pixels, canvasWidth, scanline, 4, pixelRow + 1, label, PICO9918Diagnostics.LABEL_COLOR);
                }
            }

            // Render color swatches (5 pixels tall to match hardware)
            const swatchStartX = 66;
            const swatchWidth = 31;  // Changed from 15 to 30
            const swatchHeight = 5;

            for (let colorNum = 0; colorNum < 16; colorNum++) {
                const paletteIndex = paletteNum * 16 + colorNum;
                if (paletteIndex >= palette.length) continue;

                const color = palette[paletteIndex];
                const rgb = 0xFF000000 | (color[0] << 16) | (color[1] << 8) | color[2];

                const swatchX = swatchStartX + (colorNum * (swatchWidth + 1));  // 1 pixel gap between swatches

                for (let row = 0; row < swatchHeight; row++) {
                    // When doubling, advance by 2 pixels per row; otherwise by 1
                    let pixelRow = y + (isDoubledV ? row * 2 : row);

                    for (let col = 0; col < swatchWidth; col++) {
                        const pixelIndex = pixelRow * canvasWidth + swatchX + col;
                        if (pixelIndex >= 0 && pixelIndex < pixels.length) {
                            pixels[pixelIndex] = rgb;
                        }
                    }

                    // In double-V mode (isDoubledV=true, 24/30 rows), repeat the scanline
                    if (isDoubledV) {
                        for (let col = 0; col < swatchWidth; col++) {
                            const pixelIndex2 = (pixelRow + 1) * canvasWidth + swatchX + col;
                            if (pixelIndex2 >= 0 && pixelIndex2 < pixels.length) {
                                pixels[pixelIndex2] = rgb;
                            }
                        }
                    }
                }
            }
        }
    }

    private getDisplayMode(registers: Uint8Array): number {
        const m1 = (registers[1] & 0x10) !== 0;
        const m2 = (registers[1] & 0x08) !== 0;
        const m3 = (registers[0] & 0x02) !== 0;
        const m4 = (registers[0] & 0x04) !== 0;

        if (m4) return 4;  // 80 column
        if (m1 && !m2 && !m3) return 1;  // Graphics II
        if (!m1 && m2 && !m3) return 0;  // Graphics I
        if (!m1 && !m2 && m3) return 2;  // Text
        if (!m1 && m2 && m3) return 3;  // Multicolor
        return 0;  // Default to Graphics I
    }

    private getColorTableAddress(registers: Uint8Array, mode: number): number {
        const mask = (mode === 1) ? 0x80 : 0xFF;  // Graphics II uses different mask
        return (registers[3] & mask) << 6;
    }

    private getPatternTableAddress(registers: Uint8Array, mode: number): number {
        const mask = (mode === 1) ? 0x04 : 0x07;  // Graphics II uses different mask
        return ((registers[4] & mask) << 11) & 0xFFFF;
    }
}
