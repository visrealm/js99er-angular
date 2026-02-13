import {Log} from '../../classes/log';
import {Database} from '../../classes/database';

export class PICO9918Flash {

    static FILE_NAME = "pico9918flash";
    static MAX_BLOCKS = 256;
    static BLOCK_SIZE = 256;
    static GUID_SIZE = 16;
    static NAME_SIZE = 16;
    static PAYLOAD_SIZE = 220;

    // Status codes (matching flash.c)
    static FLASH_STATUS_IDLE = 0;
    static FLASH_STATUS_VALIDATING = 1;
    static FLASH_STATUS_ERASING = 2;
    static FLASH_STATUS_WRITING = 3;

    // Error codes (matching flash.c)
    static FLASH_ERROR_OK = 0;
    static FLASH_ERROR_HEADER = 1;
    static FLASH_ERROR_FULL = 2;
    static FLASH_ERROR_SIZE = 3;
    static FLASH_ERROR_VERIFY = 4;
    static FLASH_ERROR_BUSY = 5;

    private flashStorage: Uint8Array | null;
    private updated: boolean;
    private database: Database;
    private statusByte: number;
    private getVdpRAM: () => Uint8Array;
    private log = Log.getLog();

    constructor(getVdpRAM: () => Uint8Array, callback: (result: boolean) => void) {
        this.flashStorage = null;
        this.updated = false;
        this.statusByte = 0x00; // Initial: idle status (bit 7 reserved for GPU in F18A)
        this.getVdpRAM = getVdpRAM;

        const that = this;
        this.database = new Database(function (success) {
            if (success) {
                that.restore(callback);
            } else if (callback) {
                callback(false);
            }
        });
    }

    reset() {
        if (this.updated) {
            this.updated = false;
            this.save();
        }
        this.statusByte = 0x00; // Idle status (bit 7 reserved for GPU)
    }

    executeOperation(vramAddr: number, isWrite: boolean, callback: () => void) {
        // Defensive check for vdpRAM at entry
        const vdpRAM = this.getVdpRAM();
        if (!vdpRAM) {
            this.log.error("PICO9918Flash.executeOperation: vdpRAM is undefined at entry!");
            this.setStatusError(PICO9918Flash.FLASH_ERROR_VERIFY);
            this.setStatusCode(PICO9918Flash.FLASH_STATUS_IDLE);
            callback();
            return;
        }

        // Lazy initialize storage
        if (!this.flashStorage) {
            this.flashStorage = new Uint8Array(PICO9918Flash.MAX_BLOCKS * PICO9918Flash.BLOCK_SIZE);
            // Initialize all blocks as empty (set block ID to max value as marker)
            for (let i = 0; i < PICO9918Flash.MAX_BLOCKS; i++) {
                const view = new DataView(this.flashStorage.buffer, i * PICO9918Flash.BLOCK_SIZE, 4);
                view.setUint32(0, 0xFFFFFFFF, true);
            }
        }

        // Execute immediately (synchronously)
        try {
            this.setStatusCode(PICO9918Flash.FLASH_STATUS_VALIDATING);

            if (isWrite) {
                this.handleWrite(vramAddr);
            } else {
                this.handleRead(vramAddr);
            }
        } catch (e) {
            this.log.error("PICO9918 flash operation failed: " + e);
            this.setStatusError(PICO9918Flash.FLASH_ERROR_VERIFY);
            this.setStatusCode(PICO9918Flash.FLASH_STATUS_IDLE);
        } finally {
            callback();
        }
    }

    private handleRead(vramAddr: number) {
        const vdpRAM = this.getVdpRAM();
        const result = this.findBlock(vramAddr);

        if (!result.found) {
            if (result.isEmpty) {
                // Block not found, but we have an empty slot - set block ID hint
                this.log.info(`PICO9918 flash READ: Block not found at VRAM >${vramAddr.toString(16).padStart(4, '0').toUpperCase()}, suggesting block ID ${result.blockIndex}`);
                const vramView = new DataView(vdpRAM.buffer, vramAddr, 4);
                vramView.setUint32(0, result.blockIndex, true);
                this.setStatusError(PICO9918Flash.FLASH_ERROR_OK);
                this.setStatusCode(PICO9918Flash.FLASH_STATUS_IDLE);
                return;
            } else {
                // Storage full
                this.log.info(`PICO9918 flash READ: Storage full, block not found at VRAM >${vramAddr.toString(16).padStart(4, '0').toUpperCase()}`);
                this.setStatusError(PICO9918Flash.FLASH_ERROR_FULL);
                this.setStatusCode(PICO9918Flash.FLASH_STATUS_IDLE);
                return;
            }
        }

        // Copy block from storage to VRAM (skip first 4 bytes = block ID)
        this.log.info(`PICO9918 flash READ: Block ${result.blockIndex} -> VRAM >${vramAddr.toString(16).padStart(4, '0').toUpperCase()}`);
        const storageOffset = result.blockIndex * PICO9918Flash.BLOCK_SIZE;
        const sourceData = new Uint8Array(
            this.flashStorage!.buffer,
            storageOffset + 4,
            252
        );
        const destData = new Uint8Array(vdpRAM.buffer, vramAddr + 4, 252);
        destData.set(sourceData);

        this.setStatusError(PICO9918Flash.FLASH_ERROR_OK);
        this.setStatusCode(PICO9918Flash.FLASH_STATUS_IDLE);
    }

    private handleWrite(vramAddr: number) {
        const vdpRAM = this.getVdpRAM();
        const result = this.findBlock(vramAddr);

        if (!result.found && !result.isEmpty) {
            // Storage full
            this.log.info(`PICO9918 flash WRITE: Storage full at VRAM >${vramAddr.toString(16).padStart(4, '0').toUpperCase()}`);
            this.setStatusError(PICO9918Flash.FLASH_ERROR_FULL);
            this.setStatusCode(PICO9918Flash.FLASH_STATUS_IDLE);
            return;
        }

        this.setStatusCode(PICO9918Flash.FLASH_STATUS_ERASING);

        // Get block index (found or new allocation)
        const blockIndex = result.blockIndex;
        const storageOffset = blockIndex * PICO9918Flash.BLOCK_SIZE;

        // Update block ID hint in VRAM
        const vramView = new DataView(vdpRAM.buffer, vramAddr, 4);
        vramView.setUint32(0, blockIndex, true);

        this.setStatusCode(PICO9918Flash.FLASH_STATUS_WRITING);

        // Copy entire 256-byte block from VRAM to storage
        this.log.info(`PICO9918 flash WRITE: VRAM >${vramAddr.toString(16).padStart(4, '0').toUpperCase()} -> Block ${blockIndex} ${result.found ? '(update)' : '(new)'}`);
        const sourceData = new Uint8Array(vdpRAM.buffer, vramAddr, PICO9918Flash.BLOCK_SIZE);
        const destData = new Uint8Array(this.flashStorage!.buffer, storageOffset, PICO9918Flash.BLOCK_SIZE);
        destData.set(sourceData);

        this.updated = true;
        this.setStatusError(PICO9918Flash.FLASH_ERROR_OK);
        this.setStatusCode(PICO9918Flash.FLASH_STATUS_IDLE);
    }

    private findBlock(vramAddr: number): { found: boolean, blockIndex: number, isEmpty: boolean } {
        const vdpRAM = this.getVdpRAM();

        // Defensive checks
        if (!vdpRAM) {
            this.log.error("PICO9918Flash: vdpRAM is undefined!");
            throw new Error("vdpRAM is undefined");
        }
        if (!this.flashStorage) {
            this.log.error("PICO9918Flash: flashStorage is undefined!");
            throw new Error("flashStorage is undefined");
        }

        // Read block ID hint and GUID from VRAM
        const vramView = new DataView(vdpRAM.buffer, vramAddr, PICO9918Flash.BLOCK_SIZE);
        const blockIdHint = vramView.getUint32(0, true);
        const vramGuid = new Uint8Array(vdpRAM.buffer, vramAddr + 4, PICO9918Flash.GUID_SIZE);

        let emptyBlockIndex = -1;

        // 1. Try direct index lookup first (optimization)
        if (blockIdHint < PICO9918Flash.MAX_BLOCKS) {
            const blockAddr = blockIdHint * PICO9918Flash.BLOCK_SIZE;
            const storageView = new DataView(this.flashStorage!.buffer, blockAddr, 4);
            const storedId = storageView.getUint32(0, true);

            if (storedId === blockIdHint) {
                // Valid block with matching ID, check GUID
                if (this.guidsMatch(blockAddr + 4, vramGuid)) {
                    return { found: true, blockIndex: blockIdHint, isEmpty: false };
                }
            } else if (storedId === 0xFFFFFFFF && emptyBlockIndex === -1) {
                // Track as potential empty slot
                emptyBlockIndex = blockIdHint;
            }
        }

        // 2. Fall back to linear search
        for (let i = 0; i < PICO9918Flash.MAX_BLOCKS; i++) {
            const blockAddr = i * PICO9918Flash.BLOCK_SIZE;
            const storageView = new DataView(this.flashStorage!.buffer, blockAddr, 4);
            const storedId = storageView.getUint32(0, true);

            if (storedId === i) {
                // Valid block, check GUID match
                if (this.guidsMatch(blockAddr + 4, vramGuid)) {
                    return { found: true, blockIndex: i, isEmpty: false };
                }
            } else if (storedId === 0xFFFFFFFF && emptyBlockIndex === -1) {
                // Track first empty slot
                emptyBlockIndex = i;
            }
        }

        // 3. Not found
        return {
            found: false,
            blockIndex: emptyBlockIndex,
            isEmpty: emptyBlockIndex !== -1
        };
    }

    private guidsMatch(storageOffset: number, vramGuid: Uint8Array): boolean {
        const storageGuid = new Uint8Array(
            this.flashStorage!.buffer,
            storageOffset,
            PICO9918Flash.GUID_SIZE
        );

        for (let i = 0; i < PICO9918Flash.GUID_SIZE; i++) {
            if (storageGuid[i] !== vramGuid[i]) {
                return false;
            }
        }
        return true;
    }

    private setStatusCode(status: number) {
        this.statusByte = (this.statusByte & ~0x03) | (status & 0x03);
    }

    private setStatusError(error: number) {
        this.statusByte = (this.statusByte & ~0x1C) | ((error & 0x07) << 2);
    }

    private setStatusRetry(retry: number) {
        this.statusByte = (this.statusByte & ~0x60) | ((retry & 0x03) << 5);
    }

    getStatusByte(): number {
        // Mask out bit 7 - it's reserved for GPU status in F18A
        return this.statusByte & 0x7F;
    }

    save() {
        if (this.database.isSupported() && this.flashStorage) {
            const that = this;
            this.database.putBinaryFile(PICO9918Flash.FILE_NAME, this.flashStorage, function (success) {
                if (success) {
                    that.log.info("PICO9918 flash saved");
                }
            });
        }
    }

    restore(callback: (result: boolean) => void) {
        if (this.database.isSupported()) {
            this.database.getBinaryFile(PICO9918Flash.FILE_NAME, (result) => {
                if (result !== false) {
                    const file = result as Uint8Array;
                    this.flashStorage = new Uint8Array(PICO9918Flash.MAX_BLOCKS * PICO9918Flash.BLOCK_SIZE);
                    for (let i = 0; i < file.length && i < this.flashStorage.length; i++) {
                        this.flashStorage[i] = file[i];
                    }
                    this.log.info("PICO9918 flash restored (" + file.length + " bytes)");
                } else {
                    this.log.info("PICO9918 flash - no existing data");
                }
                if (callback) {
                    callback(result && true);
                }
            });
        } else if (callback) {
            callback(false);
        }
    }

    getState(): any {
        return {
            updated: this.updated,
            statusByte: this.statusByte
        };
    }

    restoreState(state: any) {
        this.updated = state.updated;
        this.statusByte = state.statusByte;
    }
}
