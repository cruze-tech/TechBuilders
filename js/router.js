(function (root) {
    class Router {
        constructor(initialRoute) {
            this.current = {
                name: initialRoute || 'splash',
                params: {}
            };
            this.history = [this.current];
            this.listeners = new Set();
        }

        onChange(listener) {
            this.listeners.add(listener);
            return () => this.listeners.delete(listener);
        }

        emit() {
            this.listeners.forEach((listener) => {
                listener(this.current);
            });
        }

        navigate(name, params) {
            this.current = {
                name,
                params: params || {}
            };
            this.history.push(this.current);
            this.emit();
        }

        replace(name, params) {
            this.current = {
                name,
                params: params || {}
            };
            this.history[this.history.length - 1] = this.current;
            this.emit();
        }

        back(fallbackRoute) {
            if (this.history.length > 1) {
                this.history.pop();
                this.current = this.history[this.history.length - 1];
                this.emit();
                return;
            }

            if (fallbackRoute) {
                this.replace(fallbackRoute, {});
            }
        }

        getCurrent() {
            return this.current;
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { Router };
    }

    root.Router = Router;
})(typeof window !== 'undefined' ? window : globalThis);
