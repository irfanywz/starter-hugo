// Store dark mode. Dipisah dari main.js supaya bisa dites tanpa browser.
export const STORAGE_KEY = 'theme';

function defaultStorage() {
    try {
        return globalThis.localStorage ?? null;
    } catch {
        return null; // akses storage bisa ditolak (mode privat, dll.)
    }
}

export function themeStore({ root = globalThis.document?.documentElement, storage = defaultStorage() } = {}) {
    return {
        isDark: root.classList.contains('dark'),
        toggle() {
            this.set(!this.isDark);
        },
        set(dark) {
            this.isDark = dark;
            root.classList.toggle('dark', dark);
            try {
                storage?.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
            } catch {
                /* abaikan: tema tetap berubah untuk sesi ini */
            }
        },
    };
}
