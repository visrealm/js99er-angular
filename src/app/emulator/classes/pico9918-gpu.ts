import {F18AGPU} from './f18a-gpu';
import {F18A} from './f18a';

export class PICO9918GPU extends F18AGPU {

    constructor(f18a: F18A) {
        super(f18a);
    }

    override writeMemoryByte(addr: number, b: number) {
        const bank = addr & 0xF000;
        if (bank === 0x9000 || bank === 0xC000 || bank === 0xD000 || bank === 0xE000) {
            // PICO9918: previously-unused ranges now access full 64K VRAM
            this.vdpRAM[addr] = b;
        } else {
            super.writeMemoryByte(addr, b);
        }
    }

    override readMemoryByte(addr: number): number {
        const bank = addr & 0xF000;
        if (bank === 0x9000 || bank === 0xC000 || bank === 0xD000 || bank === 0xE000) {
            // PICO9918: previously-unused ranges now access full 64K VRAM
            return this.vdpRAM[addr];
        } else {
            return super.readMemoryByte(addr);
        }
    }
}
