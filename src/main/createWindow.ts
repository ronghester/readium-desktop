// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END=

import * as debug_ from "debug";
import { app, BrowserWindow, Event, Menu, shell } from "electron";
import * as path from "path";
import { AppWindowType } from "readium-desktop/common/models/win";
import { getWindowBounds } from "readium-desktop/common/rectangle/window";
import { diMainGet } from "readium-desktop/main/di";
import {
    _PACKAGING, _RENDERER_LIBRARY_BASE_URL, _VSCODE_LAUNCH, IS_DEV,
} from "readium-desktop/preprocessor-directives";

import { setMenu } from "./menu";

// Logger
const debug = debug_("readium-desktop:createWindow");

// Global reference to the main window,
// so the garbage collector doesn't close it.
let mainWindow: BrowserWindow = null;

// Opens the main window, with a native menu bar.
export async function createWindow() {
    mainWindow = new BrowserWindow({
        ...(await getWindowBounds()),
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            devTools: IS_DEV,
            nodeIntegration: true, // Required to use IPC
            webSecurity: true,
            allowRunningInsecureContent: false,
        },
        icon: path.join(__dirname, "assets/icons/icon.png"),
    });

    if (IS_DEV) {
        const wc = mainWindow.webContents;
        wc.on("context-menu", (_ev, params) => {
            const { x, y } = params;
            const openDevToolsAndInspect = () => {
                const devToolsOpened = () => {
                    wc.off("devtools-opened", devToolsOpened);
                    wc.inspectElement(x, y);

                    setTimeout(() => {
                        if (wc.isDevToolsOpened()) {
                            wc.devToolsWebContents.focus();
                        }
                    }, 500);
                };
                wc.on("devtools-opened", devToolsOpened);
                wc.openDevTools({ activate: true, mode: "detach" });
            };
            Menu.buildFromTemplate([{
                click: () => {
                    const wasOpened = wc.isDevToolsOpened();
                    if (!wasOpened) {
                        openDevToolsAndInspect();
                    } else {
                        if (!wc.isDevToolsFocused()) {
                            // wc.toggleDevTools();
                            wc.closeDevTools();

                            setImmediate(() => {
                                openDevToolsAndInspect();
                            });
                        } else {
                            // right-click context menu normally occurs when focus
                            // is in BrowserWindow / WebView's WebContents,
                            // but some platforms (e.g. MacOS) allow mouse interaction
                            // when the window is in the background.
                            wc.inspectElement(x, y);
                        }
                    }
                },
                label: "Inspect element",
            }]).popup({window: mainWindow});
        });

        mainWindow.webContents.on("did-finish-load", () => {
            const {
                default: installExtension,
                REACT_DEVELOPER_TOOLS,
                REDUX_DEVTOOLS,
            } = require("electron-devtools-installer");

            [REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS].forEach((extension) => {
                installExtension(extension)
                    .then((name: string) => debug("Added Extension: ", name))
                    .catch((err: Error) => debug("An error occurred: ", err));
            });
        });

        if (_VSCODE_LAUNCH !== "true") {
            setTimeout(() => {
                mainWindow.webContents.openDevTools({ activate: true, mode: "detach" });
            }, 2000);
        }
    }

    const winRegistry = diMainGet("win-registry");
    const appWindow = winRegistry.registerWindow(mainWindow, AppWindowType.Library);

    // watch to record window rectangle position in the db
    appWindow.onWindowMoveResize.attach();

    let rendererBaseUrl = _RENDERER_LIBRARY_BASE_URL;

    if (rendererBaseUrl === "file://") {
        // dist/prod mode (without WebPack HMR Hot Module Reload HTTP server)
        rendererBaseUrl += path.normalize(path.join(__dirname, "index_library.html"));
    } else {
        // dev/debug mode (with WebPack HMR Hot Module Reload HTTP server)
        rendererBaseUrl += "index_library.html";
    }

    rendererBaseUrl = rendererBaseUrl.replace(/\\/g, "/");

    setMenu(mainWindow, false);

    // Redirect link to an external browser
    const handleRedirect = async (event: Event, url: string) => {
        if (url === mainWindow.webContents.getURL()) {
            return;
        }

        event.preventDefault();
        await shell.openExternal(url);
    };

    mainWindow.webContents.on("will-navigate", handleRedirect);
    mainWindow.webContents.on("new-window", handleRedirect);

    // Clear all cache to prevent weird behaviours
    // Fully handled in r2-navigator-js initSessions();
    // (including exit cleanup)
    // mainWindow.webContents.session.clearStorageData();

    mainWindow.on("closed", () => {
        // note that winRegistry still contains a reference to mainWindow, so won't necessarily be garbage-collected
        mainWindow = null;
    });

    process.nextTick(async () => {
        await mainWindow.loadURL(rendererBaseUrl);
    });
}

// On OS X it's common to re-create a window in the app when the dock icon is clicked and there are no other
// windows open.
app.on("activate", async () => {
    if (mainWindow === null) {
        await createWindow();
    }
});
