import {AfterViewInit, Component, ElementRef, Input, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import {Subscription} from "rxjs";
import {TI994A} from "../../emulator/classes/ti994a";
import {ConsoleEvent, ConsoleEventType} from "../../classes/console-event";
import {EventDispatcherService} from "../../services/event-dispatcher.service";
import {saveAs} from 'file-saver';
import { faDownload } from '@fortawesome/free-solid-svg-icons';
import {F18A} from "../../emulator/classes/f18a";

@Component({
    selector: 'graphics',
    templateUrl: './graphics.component.html',
    styleUrls: ['./graphics.component.css'],
    standalone: false
})
export class GraphicsComponent implements OnInit, AfterViewInit, OnChanges {

    @Input() visible: boolean;

    private ti994A: TI994A;
    private timerHandle: number | null;
    private eventSubscription: Subscription;
    private paletteCanvas: HTMLCanvasElement;
    private tileCanvasTop: HTMLCanvasElement;
    private tileCanvasMiddle: HTMLCanvasElement;
    private tileCanvasBottom: HTMLCanvasElement;
    private spriteCanvas: HTMLCanvasElement;
    private nameTable1Canvas: HTMLCanvasElement;
    private nameTable2Canvas: HTMLCanvasElement;

    tileCanvasTopVisible = true;
    tileCanvasMiddleVisible = false;
    tileCanvasBottomVisible = false;
    spriteCanvasVisible = true;
    nameTable1CanvasVisible = false;
    nameTable2CanvasVisible = false;
    bitmapMode = false;
    multiplePages = false;
    hasT2Layer = false;
    isF18A = false;
    dumpRAMIcon = faDownload;

    constructor(
        private element: ElementRef,
        private eventDispatcherService: EventDispatcherService,
    ) {}

    ngOnInit() {
        this.eventSubscription = this.eventDispatcherService.subscribe(this.onEvent.bind(this));
    }

    startUpdate() {
        if (!this.timerHandle) {
            this.timerHandle = window.setInterval(this.updateView.bind(this), 200);
        }
    }

    stopUpdate() {
        if (this.timerHandle) {
            window.clearInterval(this.timerHandle);
            this.timerHandle = null;
        }
    }

    ngAfterViewInit() {
        this.paletteCanvas = this.element.nativeElement.querySelector('#palette-canvas');
        this.tileCanvasTop = this.element.nativeElement.querySelector('#tile-canvas-top');
        this.tileCanvasMiddle = this.element.nativeElement.querySelector('#tile-canvas-middle');
        this.tileCanvasBottom = this.element.nativeElement.querySelector('#tile-canvas-bottom');
        this.spriteCanvas = this.element.nativeElement.querySelector('#sprite-canvas');
        this.nameTable1Canvas = this.element.nativeElement.querySelector('#name-table1-canvas');
        this.nameTable2Canvas = this.element.nativeElement.querySelector('#name-table2-canvas');
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'].currentValue) {
            this.updateView();
        }
    }

    private onEvent(event: ConsoleEvent) {
        switch (event.type) {
            case ConsoleEventType.READY:
                this.ti994A = event.data;
                break;
            case ConsoleEventType.STARTED:
                this.startUpdate();
                break;
            case ConsoleEventType.STOPPED:
                this.stopUpdate();
                this.updateView();
                break;
        }
    }

    setTileCanvasTopVisible(visible: boolean) {
        this.tileCanvasTopVisible = visible;
        this.updateView();
    }

    setTileCanvasMiddleVisible(visible: boolean) {
        this.tileCanvasMiddleVisible = visible;
        this.updateView();
    }

    setTileCanvasBottomVisible(visible: boolean) {
        this.tileCanvasBottomVisible = visible;
        this.updateView();
    }

    setSpriteCanvasVisible(visible: boolean) {
        this.spriteCanvasVisible = visible;
        this.updateView();
    }

    setNameTable1CanvasVisible(visible: boolean) {
        this.nameTable1CanvasVisible = visible;
        this.updateView();
    }
    setNameTable2CanvasVisible(visible: boolean) {
        this.nameTable2CanvasVisible = visible;
        this.updateView();
    }

    updateView() {
        if (this.visible && this.ti994A) {
            const vdp = this.ti994A.getVDP();
            this.bitmapMode = vdp.isBitmapMode();
            this.multiplePages = vdp.hasMultiplePages();
            this.hasT2Layer = vdp.hasTileLayer2();
            this.isF18A = vdp instanceof F18A;
            vdp.drawPaletteImage(this.paletteCanvas);
            if (this.tileCanvasTopVisible) {
                vdp.drawTilePatternImage(this.tileCanvasTop, 0, true);
            }
            if (this.tileCanvasMiddleVisible) {
                vdp.drawTilePatternImage(this.tileCanvasMiddle, 1, true);
            }
            if (this.tileCanvasBottomVisible) {
                vdp.drawTilePatternImage(this.tileCanvasBottom, 2, true);
            }
            if (this.spriteCanvasVisible) {
                vdp.drawSpritePatternImage(this.spriteCanvas, true);
            }
            if (this.nameTable1CanvasVisible) {
                this.nameTable1Canvas = this.element.nativeElement.querySelector('#name-table1-canvas');
                if (this.nameTable1Canvas) {
                    vdp.drawNameTableImage(this.nameTable1Canvas, 1);
                }
            }
            if (this.nameTable2CanvasVisible) {
                this.nameTable2Canvas = this.element.nativeElement.querySelector('#name-table2-canvas');
                if (this.nameTable2Canvas) {
                    vdp.drawNameTableImage(this.nameTable2Canvas, 2);
                }
            }
        }
    }

    dumpRAM() {
        const output = new Uint8Array(0x4008);
        const vdp = this.ti994A.getVDP();
        const vdpRAM = vdp.getRAM();
        for (let i = 0; i < 0x4000; i++) {
            output[i] = vdpRAM[i];
        }
        for (let r = 0; r < 8; r++) {
            output[0x4000 + r] = vdp.getRegister(r);
        }
        const blob = new Blob([output], { type: "application/octet-stream" });
        saveAs(blob, this.dumpFileName("vdpram"));
    }

    // As dumpRAM, but with all 64 VDP registers and the 64 palette registers appended:
    // 0x0000-0x3fff: VDP RAM, 0x4000-0x403f: VR0-VR63, 0x4040-0x40bf: palette as 2 bytes per
    // entry in native F18A format (0x0R, 0xGB)
    dumpRAMFull() {
        const vdp = this.ti994A.getVDP();
        if (!(vdp instanceof F18A)) {
            return;
        }
        const output = new Uint8Array(0x40c0);
        const vdpRAM = vdp.getRAM();
        for (let i = 0; i < 0x4000; i++) {
            output[i] = vdpRAM[i];
        }
        for (let r = 0; r < 64; r++) {
            output[0x4000 + r] = vdp.getRegister(r);
        }
        const palette = vdp.getPalette();
        for (let i = 0; i < 64; i++) {
            const paletteEntry = palette[i];
            output[0x4040 + (i << 1)] = Math.floor(paletteEntry[0] / 17);
            output[0x4041 + (i << 1)] = (Math.floor(paletteEntry[1] / 17) << 4) | Math.floor(paletteEntry[2] / 17);
        }
        const blob = new Blob([output], { type: "application/octet-stream" });
        saveAs(blob, this.dumpFileName("vdpramfull"));
    }

    // Prefix the dump with the name of the loaded software, e.g. "Parsec_vdpram.bin"
    private dumpFileName(suffix: string): string {
        const softwareName = this.ti994A.getSoftwareName();
        const baseName = softwareName ? softwareName.replace(/[^\w.-]+/g, "_").replace(/^_+|_+$/g, "") : "";
        return (baseName ? baseName + "_" : "") + suffix + ".bin";
    }
}
