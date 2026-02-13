import {F18AGPU} from './f18a-gpu';
import {F18A} from './f18a';

export class PICO9918GPU extends F18AGPU {

    constructor(f18a: F18A) {
        super(f18a);
    }

    override writeMemoryByte(addr: number, b: number) {
        this.vdpRAM[addr] = b;
        switch (addr & 0xF000) {
            // PRAM
            case 0x5000:
                if (addr < 0x5080) super.writeMemoryByte(addr, b);
                break;
            // VREG
            case 0x6000:
                if (addr < 0x6040) super.writeMemoryByte(addr, b);
                break;
            // DMA
            case 0x8000:
                if (addr <= 0x8008) super.writeMemoryByte(addr, b);
                break;
        }        
        
    }

    override readMemoryByte(addr: number): number {
        switch (addr & 0xF000) {
            // PRAM
            case 0x5000:
                if (addr < 0x5080) return super.readMemoryByte(addr);
                break;
            // VREG
            case 0x6000:
                if (addr < 0x6040) return super.readMemoryByte(addr);
                break;
            // Scanline and blanking
            case 0x7000:
                if (addr < 0x7002) return super.readMemoryByte(addr);
                break;
        }
        return this.vdpRAM[addr];
    }
}
