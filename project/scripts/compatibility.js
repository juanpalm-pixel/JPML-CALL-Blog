// Compatibility layer for older browsers
// Adds basic support for optional chaining-like functionality

if (!window.OptionalChaining) {
    // Simple polyfill for the most basic cases of optional chaining
    window.OptionalChaining = {
        safe: function(fn) {
            try {
                return fn();
            } catch (e) {
                return null;
            }
        }
    };
}

// Console logging wrapper to prevent any potential loops
if (!window.SafeConsole) {
    window.SafeConsole = {
        log: console.log.bind(console),
        error: console.error.bind(console),
        warn: console.warn.bind(console),
        info: console.info.bind(console)
    };
}