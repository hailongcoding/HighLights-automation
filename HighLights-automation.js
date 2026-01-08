// ==UserScript==
// @name         Auto Read Book - HighLights Library
// @namespace    http://tampermonkey.net/
// @version      Beta1.0
// @description  Random book → rapid pages → Yes → Cancel → Exit (Works for Library, Phonics, and Magazines) - ULTRA FAST
// @author       sigma
// @match        https://library.highlights.com/library*
// @match        https://library.highlights.com/library/level*
// @match        https://library.highlights.com/library/phonics*
// @match        https://library.highlights.com/library/magazines*
// @match        https://library.highlights.com/public_html*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    console.log('[TM] Script running:', location.pathname);

    /* ===============================
       DISABLE "LEAVE PAGE" CONFIRMATION
    =============================== */
    window.onbeforeunload = null;
    window.addEventListener('beforeunload', function(e) {
        e.preventDefault();
        delete e['returnValue'];
    }, true);

    /* ===============================
       FAIL-SAFE: Auto-refresh if stuck
    =============================== */
    let lastActivity = Date.now();
    const STUCK_TIMEOUT = 30000; // 30 SECONDS - Give enough time to complete book

    setInterval(() => {
        if (Date.now() - lastActivity > STUCK_TIMEOUT) {
            console.warn('[TM] FAIL-SAFE: Stuck detected, FORCE RELOADING...');
            location.reload();
        }
    }, 5000); // Check every 5 seconds

    function updateActivity() {
        lastActivity = Date.now();
    }

    /* ===============================
       ERROR RECOVERY
    =============================== */
    window.addEventListener('error', function(e) {
        console.error('[TM] Error caught:', e.message);
        setTimeout(() => {
            console.warn('[TM] Recovering from error, reloading...');
            location.reload();
        }, 3000);
    });

    /* ===============================
       AUTO-RELOAD on specific pages
    =============================== */
    const shouldAutoReload = location.pathname.includes('/public_html') ||
                             location.pathname.includes('/level') ||
                             location.pathname.includes('/phonics');

    if (shouldAutoReload) {
        console.log('[TM] Auto-reload enabled for this page');
        setTimeout(() => {
            const booksFound = document.querySelectorAll('#datalist li.book, #aPhonicsList li, .hv-menu').length;
            if (booksFound === 0) {
                console.warn('[TM] No books found, reloading...');
                location.reload();
            }
        }, 5000);
    }

    /* ===============================
       DETECT MODE
    =============================== */
    const isPhonicsMode = location.pathname.includes('/phonics');
    const isMagazineMode = location.pathname.includes('/magazines');
    const mode = isPhonicsMode ? 'PHONICS' : isMagazineMode ? 'MAGAZINES' : 'LIBRARY';
    console.log('[TM] Mode:', mode);

    /* ===============================
       STATE
    =============================== */
    let bookClicked = false;
    let sliderDone = false;
    let nextClicked = false;
    let yesClicked = false;
    let cancelClicked = false;
    let exitClicked = false;
    let dailyPopupClosed = false;
    let currentItemType = null;

    /* ===============================
       1. RANDOM BOOK
    =============================== */
    function autoClickBook() {
        if (bookClicked) return;

        updateActivity();

        if (isMagazineMode) {
            // MAGAZINES MODE
            const magazines = [...document.querySelectorAll('.hv-menu')];
            console.log('[TM][MAGAZINES] Found magazines:', magazines.length);

            if (!magazines.length) return;

            const valid = magazines
                .map(m => {
                    const readBtn = m.querySelector('.icn-read.read');
                    return readBtn ? { element: m, readBtn } : null;
                })
                .filter(Boolean);

            if (!valid.length) {
                console.warn('[TM][MAGAZINES] No valid magazine → refresh page');
                location.reload();
                return;
            }

            bookClicked = true;
            currentItemType = 'magazine';
            console.log('[TM][MAGAZINES] Clicking RANDOM magazine');
            const target = valid[Math.floor(Math.random() * valid.length)];
            target.readBtn.click();

        } else if (isPhonicsMode) {
            // PHONICS
            const books = [...document.querySelectorAll('#aPhonicsList li')];
            console.log('[TM][PHONICS] Found books:', books.length);
            if (!books.length) return;

            const valid = books
                .map(b => b.querySelector('li.icn-read, button.icn-read'))
                .filter(Boolean);

            if (!valid.length) {
                console.warn('[TM][PHONICS] No READ button found → refresh page');
                location.reload();
                return;
            }

            bookClicked = true;
            currentItemType = 'book';
            const target = valid[Math.floor(Math.random() * valid.length)];
            console.log('[TM][PHONICS] Clicking RANDOM book');
            target.click();

        } else {
            // LIBRARY - books and magazines together
            const books = [...document.querySelectorAll('#datalist li.book')];
            const magazines = [...document.querySelectorAll('.hv-menu')];

            console.log('[TM][LIBRARY] Found books:', books.length, '| magazines:', magazines.length);

            if (!books.length && !magazines.length) return;

            // Get valid books
            const validBooks = books.filter(b =>
                !b.querySelector('.book_info.book-finish') &&
                b.querySelector('li.icn-read.read')
            ).map(b => ({
                element: b,
                readBtn: b.querySelector('li.icn-read.read'),
                type: 'book'
            }));

            // Get valid magazines
            const validMagazines = magazines
                .map(m => {
                    const readBtn = m.querySelector('.icn-read.read');
                    return readBtn ? { element: m, readBtn, type: 'magazine' } : null;
                })
                .filter(Boolean);

            const valid = [...validBooks, ...validMagazines];

            if (!valid.length) {
                console.warn('[TM][LIBRARY] No valid items → refresh page');
                location.reload();
                return;
            }

            bookClicked = true;
            const selected = valid[Math.floor(Math.random() * valid.length)];
            currentItemType = selected.type;
            console.log('[TM][LIBRARY] Clicking RANDOM', selected.type);
            selected.readBtn.click();
        }
    }

    /* ===============================
       2. SLIDER
    =============================== */
    function dragSliderToEnd() {
        if (sliderDone) return;

        const slider = document.querySelector('.rangeslider');
        const handle = document.querySelector('.rangeslider__handle');
        if (!slider || !handle) return;

        sliderDone = true;
        updateActivity();
        console.log('[TM] Dragging slider FAST');

        setTimeout(() => {
            const r = slider.getBoundingClientRect();
            const y = r.top + r.height / 2;

            handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + 5, clientY: y }));
            handle.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: r.right - 5, clientY: y }));
            handle.dispatchEvent(new PointerEvent('pointerup',   { bubbles: true, clientX: r.right - 5, clientY: y }));

            console.log('[TM] Slider done');
        }, 200); // BLAZINGLY FAST - 200ms
    }

    /* ===============================
       3. NEXT 
    =============================== */
    function clickNextButton() {
        if (!sliderDone || nextClicked) return;

        const btn = document.querySelector('.rightCornerBtn');
        if (!btn) return;

        nextClicked = true;
        updateActivity();
        console.log('[TM] Wait 1s → NEXT');

        setTimeout(() => {
            btn.click();
            updateActivity();
            console.log('[TM] NEXT clicked');
        }, 1000); // VERY FAST - 1 second instead of 3
    }

    /* ===============================
       4. YES 
    =============================== */
    function clickYesButton() {
        if (!nextClicked || yesClicked) return;

        updateActivity();

        const yesBtn = document.querySelector('button[name="fastBtn"].btn-click.btn-cyan');
        if (!yesBtn) return;

        yesClicked = true;
        console.log('[TM] BOOK: YES clicked');
        yesBtn.click();
    }

    /* ===============================
       5. CANCEL 
    =============================== */
    function clickCancelButton() {
        if (!yesClicked || cancelClicked) return;

        updateActivity();

        const btn = document.querySelector('button[name="cancelBtn"].btn-click.btn-gray');
        if (!btn) return;

        cancelClicked = true;
        console.log('[TM] BOOK: CANCEL clicked');
        btn.click();
    }

    /* ===============================
       6. EXIT HOME 
    =============================== */
    function autoExitHome() {
        if (!cancelClicked || exitClicked) return;

        const btn = document.querySelector('#btn-exit.exit.act');
        if (!btn) return;

        exitClicked = true;
        updateActivity();
        console.log('[TM] Wait 1s → EXIT');

        setTimeout(() => {
            btn.click();
            updateActivity();
            console.log('[TM] EXIT clicked - reloading...');

            // Auto-reload IMMEDIATELY after exit
            setTimeout(() => {
                location.reload();
            }, 1000);
        }, 1000); // BLAZINGLY FAST - 1 second!
    }

    /* ===============================
       OBSERVER
    =============================== */
    const observer = new MutationObserver(() => {
        closeDailyPopup();
        autoClickBook();
        dragSliderToEnd();
        clickNextButton();    // This now does rapid clicking
        clickYesButton();     // Handles both YES and OK
        clickCancelButton();
        autoExitHome();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
    });

})();
