/**
 * GameLoader - GameMaker HTML5 Runtime Loader
 *
 * Handles the initialization and loading of the GameMaker game engine.
 * Manages the loading screen, aspect ratio, and module setup.
 */

import '../types/gamemaker';
import { Audio } from '../utils/AudioHelper';

/**
 * Manifest structure for GameMaker runner
 */
export type RunnerManifest = {
    manifestFiles: string[];
    manifestFilesMD5: string[];
    mainJS?: string;
    unx?: string;
    index?: string;
    runner?: { version?: string; yyc?: boolean };
};

export default class GameLoader {
    private statusElement: HTMLElement;
    private progressElement: HTMLProgressElement;
    private spinnerElement: HTMLElement;
    private canvasElement: HTMLCanvasElement;
    private loadingElement: HTMLElement;
    private startButton: HTMLButtonElement;
    private startingHeight?: number;
    private startingWidth?: number;
    private startingAspect?: number;

    constructor() {
        this.statusElement = document.getElementById("status") as HTMLElement;
        this.progressElement = document.getElementById("progress") as HTMLProgressElement;
        this.spinnerElement = document.getElementById("spinner") as HTMLElement;
        this.canvasElement = document.getElementById("canvas") as HTMLCanvasElement;
        this.loadingElement = document.getElementById("loading") as HTMLElement;
        this.startButton = document.getElementById("start-investigation-btn") as HTMLButtonElement;

        this.canvasElement.addEventListener("click", () => {
            this.canvasElement.focus();
        });

        this.setupModule();
        this.setupResizeObserver();
        this.setupStartButton();
        this.loadGame();
    }

    private setupStartButton() {
        this.startButton.addEventListener("click", () => {
            console.log("[GameLoader] Start Investigation clicked");
            Audio.playMusic();

            this.loadingElement.classList.add("hidden");
            setTimeout(() => {
                this.loadingElement.style.display = "none";
            }, 500);
        });
    }

    private setupModule() {
        window.Module = {
            preRun: [],
            postRun: [],
            print: (text: string) => {
                console.log(text);
                if (text === "Entering main loop.") {
                    this.ensureAspectRatio();
                }
            },
            printErr: (text: string) => {
                console.error(text);
            },
            canvas: this.canvasElement,
            setStatus: (text: string) => {
                if (!window.Module.setStatus.last) {
                    window.Module.setStatus.last = { time: Date.now(), text: "" };
                }
                if (text === window.Module.setStatus.last.text) return;

                const m = text.match(/([^(]+)\((\d+(?:\.\d+)?)\/(\d+)\)/);
                const now = Date.now();
                if (m && now - window.Module.setStatus.last.time < 30) return;

                window.Module.setStatus.last.time = now;
                window.Module.setStatus.last.text = text;

                if (m) {
                    const val = parseInt(m[2]);
                    const max = parseInt(m[3]);
                    const percent = Math.round((val / max) * 100);

                    this.progressElement.value = val * 100;
                    this.progressElement.max = max * 100;
                    this.progressElement.hidden = false;
                    this.spinnerElement.hidden = false;
                    this.statusElement.innerHTML = `Loading: ${percent}%`;
                } else {
                    this.progressElement.value = 0;
                    this.progressElement.max = 0;
                    this.progressElement.hidden = true;
                    if (!text) this.spinnerElement.hidden = true;
                    this.statusElement.innerHTML = text;
                }
            }
        };
        window.Module.setStatus("Initializing Game...");
    }

    private ensureAspectRatio() {
        if (this.startingAspect) {
            console.log("[GameLoader] Engine ready, showing start button");
            this.statusElement.innerHTML = "Case Files Ready.";
            this.spinnerElement.hidden = true;
            this.progressElement.hidden = true;
            this.startButton.classList.remove("hidden");
        }
    }

    private setupResizeObserver() {
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (!this.startingWidth) {
                    this.startingWidth = width;
                    this.startingHeight = height;
                    this.startingAspect = width / height;
                }
            }
        });
        observer.observe(this.canvasElement);
    }

    private async loadGame() {
        try {
            if (window.manifestFiles && window.manifestFilesMD5) {
                const manifest: RunnerManifest = {
                    manifestFiles: window.manifestFiles().split(","),
                    manifestFilesMD5: window.manifestFilesMD5(),
                };
                console.log("Loading game with manifest:", manifest);
            }

            // Safety fallback: ensure loading screen shows start button eventually
            // Increased to 10 seconds per audit requirements
            setTimeout(() => {
                if (this.startButton.classList.contains("hidden") && this.loadingElement.style.display !== "none") {
                    console.log("[GameLoader] Timeout: Game engine failed to signal completion.");
                    this.statusElement.innerHTML = "Engine loading slowly... <button onclick=\"location.reload()\" style=\"color: #ff4500; background: none; border: 1px solid #ff4500; padding: 2px 5px; cursor: pointer; font-family: inherit;\">Retry?</button>";

                    // Allow another 5 seconds before showing button anyway
                    setTimeout(() => {
                        if (this.startButton.classList.contains("hidden") && this.loadingElement.style.display !== "none") {
                             this.ensureAspectRatio();
                        }
                    }, 5000);
                }
            }, 10000);
        } catch (e) {
            console.error("Failed to load manifest:", e);
            this.statusElement.innerHTML = "Error loading game engine.";
        }
    }
}
