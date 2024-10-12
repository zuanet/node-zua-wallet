"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.iDB = exports.createStore = exports.promisifyRequest = void 0;
function promisifyRequest(request) {
    return new Promise((resolve, reject) => {
        // @ts-ignore - file size hacks
        request.oncomplete = request.onsuccess = () => resolve(request.result);
        // @ts-ignore - file size hacks
        request.onabort = request.onerror = () => reject(request.error);
    });
}
exports.promisifyRequest = promisifyRequest;
function createStore(dbName, storeNames, version) {
    //console.log("createStore", dbName, storeNames, version)
    const request = indexedDB.open(dbName, version);
    request.onupgradeneeded = () => {
        const db = request.result;
        let list = db.objectStoreNames;
        storeNames.forEach(storeName => {
            console.log("createStore", storeName, list.contains(storeName), list);
            if (!list.contains(storeName)) {
                let result = db.createObjectStore(storeName);
                console.log("db.createObjectStore:", result);
            }
        });
    };
    const dbp = promisifyRequest(request);
    return {
        dbName,
        getUseStore(storeName) {
            return (txMode, callback) => dbp.then((db) => callback(db.transaction(storeName, txMode).objectStore(storeName)));
        }
    };
}
exports.createStore = createStore;
class iDB {
    constructor(options) {
        let { storeName, dbName } = options;
        const version = 4;
        iDB.buildDB(dbName, version);
        this.defaultGetStoreFunc = iDB.getOrCreateStore(storeName, dbName, version);
    }
    static getOrCreateStore(storeName, dbName, version) {
        let store = this.stores.find(s => s.dbName == dbName);
        if (store)
            return store.getUseStore(storeName);
        return createStore(dbName, [storeName], version).getUseStore(storeName);
    }
    static buildDB(dbName, version = 1, storeNames = ["tx", "cache"]) {
        let store = this.stores.find(s => s.dbName == dbName);
        //console.log("iDB.buildDB - A", dbName, version, storeNames)
        if (!store) {
            //console.log("iDB.buildDB - B", storeNames)
            this.stores.push(createStore(dbName, storeNames, version));
        }
    }
    /**
     * Get a value by its key.
     *
     * @param key
     * @param customStore Method to get a custom store. Use with caution (see the docs).
     */
    get(key, customStore = this.defaultGetStoreFunc) {
        return customStore('readonly', (store) => promisifyRequest(store.get(key)));
    }
    /**
     * Set a value with a key.
     *
     * @param key
     * @param value
     * @param customStore Method to get a custom store. Use with caution (see the docs).
     */
    set(key, value, customStore = this.defaultGetStoreFunc) {
        return customStore('readwrite', (store) => {
            store.put(value, key);
            return promisifyRequest(store.transaction);
        });
    }
    /**
     * Set multiple values at once. This is faster than calling set() multiple times.
     * It's also atomic – if one of the pairs can't be added, none will be added.
     *
     * @param entries Array of entries, where each entry is an array of `[key, value]`.
     * @param customStore Method to get a custom store. Use with caution (see the docs).
     */
    setMany(entries, customStore = this.defaultGetStoreFunc) {
        return customStore('readwrite', (store) => {
            entries.forEach((entry) => store.put(entry[1], entry[0]));
            return promisifyRequest(store.transaction);
        });
    }
    /**
     * Get multiple values by their keys
     *
     * @param keys
     * @param customStore Method to get a custom store. Use with caution (see the docs).
     */
    getMany(keys, customStore = this.defaultGetStoreFunc) {
        return customStore('readonly', (store) => Promise.all(keys.map((key) => promisifyRequest(store.get(key)))));
    }
    /**
     * Update a value. This lets you see the old value and update it as an atomic operation.
     *
     * @param key
     * @param updater A callback that takes the old value and returns a new value.
     * @param customStore Method to get a custom store. Use with caution (see the docs).
     */
    update(key, updater, customStore = this.defaultGetStoreFunc) {
        return customStore('readwrite', (store) => 
        // Need to create the promise manually.
        // If I try to chain promises, the transaction closes in browsers
        // that use a promise polyfill (IE10/11).
        new Promise((resolve, reject) => {
            store.get(key).onsuccess = function () {
                try {
                    store.put(updater(this.result), key);
                    resolve(promisifyRequest(store.transaction));
                }
                catch (err) {
                    reject(err);
                }
            };
        }));
    }
    /**
     * Delete a particular key from the store.
     *
     * @param key
     * @param customStore Method to get a custom store. Use with caution (see the docs).
     */
    del(key, customStore = this.defaultGetStoreFunc) {
        return customStore('readwrite', (store) => {
            store.delete(key);
            return promisifyRequest(store.transaction);
        });
    }
    /**
     * Clear all values in the store.
     *
     * @param customStore Method to get a custom store. Use with caution (see the docs).
     */
    clear(customStore = this.defaultGetStoreFunc) {
        return customStore('readwrite', (store) => {
            store.clear();
            return promisifyRequest(store.transaction);
        });
    }
    eachCursor(customStore, callback) {
        return customStore('readonly', (store) => {
            // This would be store.getAllKeys(), but it isn't supported by Edge or Safari.
            // And openKeyCursor isn't supported by Safari.
            let req = store.openCursor();
            req.onsuccess = function () {
                //console.log("store.openCursor.onsuccess", this)
                if (!this.result)
                    return;
                callback(this.result);
                this.result.continue();
            };
            req.onerror = function (e) {
                console.log("store.openCursor.onerror", e, this);
            };
            return promisifyRequest(store.transaction);
        });
    }
    /**
     * Get all keys in the store.
     *
     * @param customStore Method to get a custom store. Use with caution (see the docs).
     */
    keys(customStore = this.defaultGetStoreFunc) {
        const items = [];
        return this.eachCursor(customStore, (cursor) => items.push(cursor.key)).then(() => items);
    }
    /**
     * Get all values in the store.
     *
     * @param customStore Method to get a custom store. Use with caution (see the docs).
     */
    values(customStore = this.defaultGetStoreFunc) {
        const items = [];
        return this.eachCursor(customStore, (cursor) => items.push(cursor.value)).then(() => items);
    }
    /**
     * Get all entries in the store. Each entry is an array of `[key, value]`.
     *
     * @param customStore Method to get a custom store. Use with caution (see the docs).
     */
    entries(customStore = this.defaultGetStoreFunc) {
        const items = [];
        return this.eachCursor(customStore, (cursor) => items.push([cursor.key, cursor.value])).then(() => items);
    }
}
exports.iDB = iDB;
iDB.stores = [];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXhlZC1kYi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3dhbGxldC9pbmRleGVkLWRiLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLFNBQWdCLGdCQUFnQixDQUMvQixPQUEwQztJQUUxQyxPQUFPLElBQUksT0FBTyxDQUFRLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQzdDLCtCQUErQjtRQUMvQixPQUFPLENBQUMsVUFBVSxHQUFHLE9BQU8sQ0FBQyxTQUFTLEdBQUcsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN2RSwrQkFBK0I7UUFDL0IsT0FBTyxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxHQUFHLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDakUsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDO0FBVEQsNENBU0M7QUFFRCxTQUFnQixXQUFXLENBQUMsTUFBYyxFQUFFLFVBQW9CLEVBQUUsT0FBYztJQUMvRSx5REFBeUQ7SUFDekQsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDaEQsT0FBTyxDQUFDLGVBQWUsR0FBRyxHQUFHLEVBQUU7UUFDOUIsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztRQUMxQixJQUFJLElBQUksR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUM7UUFDL0IsVUFBVSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUEsRUFBRTtZQUM3QixPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUNyRSxJQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsRUFBQztn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TyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsbUJBQW1CO1FBQzdDLE1BQU0sS0FBSyxHQUF5QixFQUFFLENBQUM7UUFFdkMsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQzlDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUN0QyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNyQixDQUFDOztBQTlNRixrQkErTUM7QUE3TU8sVUFBTSxHQUF1QixFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB2ZXJzaW9uIH0gZnJvbSBcIm9zXCI7XG5cbmV4cG9ydCBmdW5jdGlvbiBwcm9taXNpZnlSZXF1ZXN0IDwgVCA9IHVuZGVmaW5lZCA+IChcblx0cmVxdWVzdDogSURCUmVxdWVzdCA8IFQgPiB8IElEQlRyYW5zYWN0aW9uLFxuKTogUHJvbWlzZSA8IFQgPiB7XG5cdHJldHVybiBuZXcgUHJvbWlzZSA8IFQgPiAoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdC8vIEB0cy1pZ25vcmUgLSBmaWxlIHNpemUgaGFja3Ncblx0XHRyZXF1ZXN0Lm9uY29tcGxldGUgPSByZXF1ZXN0Lm9uc3VjY2VzcyA9ICgpID0+IHJlc29sdmUocmVxdWVzdC5yZXN1bHQpO1xuXHRcdC8vIEB0cy1pZ25vcmUgLSBmaWxlIHNpemUgaGFja3Ncblx0XHRyZXF1ZXN0Lm9uYWJvcnQgPSByZXF1ZXN0Lm9uZXJyb3IgPSAoKSA9PiByZWplY3QocmVxdWVzdC5lcnJvcik7XG5cdH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU3RvcmUoZGJOYW1lOiBzdHJpbmcsIHN0b3JlTmFtZXM6IHN0cmluZ1tdLCB2ZXJzaW9uOm51bWJlcik6IENyZWF0ZVN0b3JlUmVzdWx0IHtcblx0Ly9jb25zb2xlLmxvZyhcImNyZWF0ZVN0b3JlXCIsIGRiTmFtZSwgc3RvcmVOYW1lcywgdmVyc2lvbilcblx0Y29uc3QgcmVxdWVzdCA9IGluZGV4ZWREQi5vcGVuKGRiTmFtZSwgdmVyc2lvbik7XG5cdHJlcXVlc3Qub251cGdyYWRlbmVlZGVkID0gKCkgPT4ge1xuXHRcdGNvbnN0IGRiID0gcmVxdWVzdC5yZXN1bHQ7XG5cdFx0bGV0IGxpc3QgPSBkYi5vYmplY3RTdG9yZU5hbWVzO1xuXHRcdHN0b3JlTmFtZXMuZm9yRWFjaChzdG9yZU5hbWU9Pntcblx0XHRcdGNvbnNvbGUubG9nKFwiY3JlYXRlU3RvcmVcIiwgc3RvcmVOYW1lLCBsaXN0LmNvbnRhaW5zKHN0b3JlTmFtZSksIGxpc3QpXG5cdFx0XHRpZighbGlzdC5jb250YWlucyhzdG9yZU5hbWUpKXtcblx0XHRcdFx0bGV0IHJlc3VsdCA9IGRiLmNyZWF0ZU9iamVjdFN0b3JlKHN0b3JlTmFtZSlcblx0XHRcdFx0Y29uc29sZS5sb2coXCJkYi5jcmVhdGVPYmplY3RTdG9yZTpcIiwgcmVzdWx0KVxuXHRcdFx0fVxuXHRcdH0pXG5cdH07XG5cblx0Y29uc3QgZGJwID0gcHJvbWlzaWZ5UmVxdWVzdChyZXF1ZXN0KTtcblxuXHRyZXR1cm4ge1xuXHRcdGRiTmFtZSxcblx0XHRnZXRVc2VTdG9yZShzdG9yZU5hbWU6c3RyaW5nKXtcblx0XHRcdHJldHVybiA8VD4odHhNb2RlOklEQlRyYW5zYWN0aW9uTW9kZSwgY2FsbGJhY2s6Q2FsbGJhY2s8VD4pPT5kYnAudGhlbigoZGIpID0+XG5cdFx0XHRcdGNhbGxiYWNrKGRiLnRyYW5zYWN0aW9uKHN0b3JlTmFtZSwgdHhNb2RlKS5vYmplY3RTdG9yZShzdG9yZU5hbWUpKSxcblx0XHRcdClcblx0XHR9XG5cdCB9XG59XG5cbmV4cG9ydCB0eXBlIENhbGxiYWNrPFQ+ID0gKHN0b3JlOiBJREJPYmplY3RTdG9yZSkgPT4gVCB8IFByb21pc2VMaWtlIDwgVCA+O1xuXG5leHBvcnQgdHlwZSBDcmVhdGVTdG9yZVJlc3VsdCA9IHtcblx0ZGJOYW1lOnN0cmluZyxcblx0Z2V0VXNlU3RvcmUoc3RvcmVOYW1lOiBzdHJpbmcpOlVzZVN0b3JlXG59XG5cbmV4cG9ydCB0eXBlIFVzZVN0b3JlID0gPCBUID4gKFxuXHR0eE1vZGU6IElEQlRyYW5zYWN0aW9uTW9kZSxcblx0Y2FsbGJhY2s6IChzdG9yZTogSURCT2JqZWN0U3RvcmUpID0+IFQgfCBQcm9taXNlTGlrZSA8IFQgPiAsXG4pID0+IFByb21pc2UgPCBUID4gO1xuXG5cblxuZXhwb3J0IGNsYXNzIGlEQntcblxuXHRzdGF0aWMgc3RvcmVzOkNyZWF0ZVN0b3JlUmVzdWx0W10gPSBbXTtcblxuXHRzdGF0aWMgZ2V0T3JDcmVhdGVTdG9yZShzdG9yZU5hbWU6c3RyaW5nLCBkYk5hbWU6c3RyaW5nLCB2ZXJzaW9uOm51bWJlcik6VXNlU3RvcmV7XG5cdFx0bGV0IHN0b3JlID0gdGhpcy5zdG9yZXMuZmluZChzPT5zLmRiTmFtZSA9PSBkYk5hbWUpO1xuXHRcdGlmKHN0b3JlKVxuXHRcdFx0cmV0dXJuIHN0b3JlLmdldFVzZVN0b3JlKHN0b3JlTmFtZSk7XG5cdFx0cmV0dXJuIGNyZWF0ZVN0b3JlKGRiTmFtZSwgW3N0b3JlTmFtZV0sIHZlcnNpb24pLmdldFVzZVN0b3JlKHN0b3JlTmFtZSk7XG5cdH1cblxuXHRzdGF0aWMgYnVpbGREQihkYk5hbWU6c3RyaW5nLCB2ZXJzaW9uPTEsIHN0b3JlTmFtZXM9W1widHhcIiwgXCJjYWNoZVwiXSl7XG5cdFx0bGV0IHN0b3JlID0gdGhpcy5zdG9yZXMuZmluZChzPT5zLmRiTmFtZSA9PSBkYk5hbWUpO1xuXHRcdC8vY29uc29sZS5sb2coXCJpREIuYnVpbGREQiAtIEFcIiwgZGJOYW1lLCB2ZXJzaW9uLCBzdG9yZU5hbWVzKVxuXHRcdGlmKCFzdG9yZSl7XG5cdFx0XHQvL2NvbnNvbGUubG9nKFwiaURCLmJ1aWxkREIgLSBCXCIsIHN0b3JlTmFtZXMpXG5cdFx0XHR0aGlzLnN0b3Jlcy5wdXNoKGNyZWF0ZVN0b3JlKGRiTmFtZSwgc3RvcmVOYW1lcywgdmVyc2lvbikpXG5cdFx0fVxuXHR9XG5cblx0ZGVmYXVsdEdldFN0b3JlRnVuYzogVXNlU3RvcmU7XG5cdGNvbnN0cnVjdG9yKG9wdGlvbnM6e3N0b3JlTmFtZTpzdHJpbmcsIGRiTmFtZTpzdHJpbmd9KXtcblx0XHRsZXQge3N0b3JlTmFtZSwgZGJOYW1lfSA9IG9wdGlvbnM7XG5cdFx0Y29uc3QgdmVyc2lvbiA9IDQ7XG5cdFx0aURCLmJ1aWxkREIoZGJOYW1lLCB2ZXJzaW9uKTtcblx0XHR0aGlzLmRlZmF1bHRHZXRTdG9yZUZ1bmMgPSBpREIuZ2V0T3JDcmVhdGVTdG9yZShzdG9yZU5hbWUsIGRiTmFtZSwgdmVyc2lvbik7XG5cdH1cblxuXHQvKipcblx0ICogR2V0IGEgdmFsdWUgYnkgaXRzIGtleS5cblx0ICpcblx0ICogQHBhcmFtIGtleVxuXHQgKiBAcGFyYW0gY3VzdG9tU3RvcmUgTWV0aG9kIHRvIGdldCBhIGN1c3RvbSBzdG9yZS4gVXNlIHdpdGggY2F1dGlvbiAoc2VlIHRoZSBkb2NzKS5cblx0ICovXG5cdGdldDxUPWFueT4oa2V5OiBJREJWYWxpZEtleSwgY3VzdG9tU3RvcmUgPSB0aGlzLmRlZmF1bHRHZXRTdG9yZUZ1bmMpOiBQcm9taXNlIDwgVCB8IHVuZGVmaW5lZCA+IHtcblx0XHRyZXR1cm4gY3VzdG9tU3RvcmUoJ3JlYWRvbmx5JywgKHN0b3JlKSA9PiBwcm9taXNpZnlSZXF1ZXN0KHN0b3JlLmdldChrZXkpKSk7XG5cdH1cblxuXHQvKipcblx0ICogU2V0IGEgdmFsdWUgd2l0aCBhIGtleS5cblx0ICpcblx0ICogQHBhcmFtIGtleVxuXHQgKiBAcGFyYW0gdmFsdWVcblx0ICogQHBhcmFtIGN1c3RvbVN0b3JlIE1ldGhvZCB0byBnZXQgYSBjdXN0b20gc3RvcmUuIFVzZSB3aXRoIGNhdXRpb24gKHNlZSB0aGUgZG9jcykuXG5cdCAqL1xuXHRzZXQoXG5cdFx0a2V5OiBJREJWYWxpZEtleSxcblx0XHR2YWx1ZTogYW55LFxuXHRcdGN1c3RvbVN0b3JlID0gdGhpcy5kZWZhdWx0R2V0U3RvcmVGdW5jXG5cdCk6IFByb21pc2UgPCB2b2lkID4ge1xuXHRcdHJldHVybiBjdXN0b21TdG9yZSgncmVhZHdyaXRlJywgKHN0b3JlKSA9PiB7XG5cdFx0XHRzdG9yZS5wdXQodmFsdWUsIGtleSk7XG5cdFx0XHRyZXR1cm4gcHJvbWlzaWZ5UmVxdWVzdChzdG9yZS50cmFuc2FjdGlvbik7XG5cdFx0fSk7XG5cdH1cblxuXHQvKipcblx0ICogU2V0IG11bHRpcGxlIHZhbHVlcyBhdCBvbmNlLiBUaGlzIGlzIGZhc3RlciB0aGFuIGNhbGxpbmcgc2V0KCkgbXVsdGlwbGUgdGltZXMuXG5cdCAqIEl0J3MgYWxzbyBhdG9taWMg4oCTIGlmIG9uZSBvZiB0aGUgcGFpcnMgY2FuJ3QgYmUgYWRkZWQsIG5vbmUgd2lsbCBiZSBhZGRlZC5cblx0ICpcblx0ICogQHBhcmFtIGVudHJpZXMgQXJyYXkgb2YgZW50cmllcywgd2hlcmUgZWFjaCBlbnRyeSBpcyBhbiBhcnJheSBvZiBgW2tleSwgdmFsdWVdYC5cblx0ICogQHBhcmFtIGN1c3RvbVN0b3JlIE1ldGhvZCB0byBnZXQgYSBjdXN0b20gc3RvcmUuIFVzZSB3aXRoIGNhdXRpb24gKHNlZSB0aGUgZG9jcykuXG5cdCAqL1xuXHRzZXRNYW55KFxuXHRcdGVudHJpZXM6IFtJREJWYWxpZEtleSwgYW55XVtdLFxuXHRcdGN1c3RvbVN0b3JlID0gdGhpcy5kZWZhdWx0R2V0U3RvcmVGdW5jLFxuXHQpOiBQcm9taXNlIDwgdm9pZCA+IHtcblx0XHRyZXR1cm4gY3VzdG9tU3RvcmUoJ3JlYWR3cml0ZScsIChzdG9yZSkgPT4ge1xuXHRcdFx0ZW50cmllcy5mb3JFYWNoKChlbnRyeSkgPT4gc3RvcmUucHV0KGVudHJ5WzFdLCBlbnRyeVswXSkpO1xuXHRcdFx0cmV0dXJuIHByb21pc2lmeVJlcXVlc3Qoc3RvcmUudHJhbnNhY3Rpb24pO1xuXHRcdH0pO1xuXHR9XG5cblx0LyoqXG5cdCAqIEdldCBtdWx0aXBsZSB2YWx1ZXMgYnkgdGhlaXIga2V5c1xuXHQgKlxuXHQgKiBAcGFyYW0ga2V5c1xuXHQgKiBAcGFyYW0gY3VzdG9tU3RvcmUgTWV0aG9kIHRvIGdldCBhIGN1c3RvbSBzdG9yZS4gVXNlIHdpdGggY2F1dGlvbiAoc2VlIHRoZSBkb2NzKS5cblx0ICovXG5cdGdldE1hbnkoXG5cdFx0a2V5czogSURCVmFsaWRLZXlbXSxcblx0XHRjdXN0b21TdG9yZSA9IHRoaXMuZGVmYXVsdEdldFN0b3JlRnVuYyxcblx0KTogUHJvbWlzZSA8IGFueVtdID4ge1xuXHRcdHJldHVybiBjdXN0b21TdG9yZSgncmVhZG9ubHknLCAoc3RvcmUpID0+XG5cdFx0XHRQcm9taXNlLmFsbChrZXlzLm1hcCgoa2V5KSA9PiBwcm9taXNpZnlSZXF1ZXN0KHN0b3JlLmdldChrZXkpKSkpLFxuXHRcdCk7XG5cdH1cblxuXHQvKipcblx0ICogVXBkYXRlIGEgdmFsdWUuIFRoaXMgbGV0cyB5b3Ugc2VlIHRoZSBvbGQgdmFsdWUgYW5kIHVwZGF0ZSBpdCBhcyBhbiBhdG9taWMgb3BlcmF0aW9uLlxuXHQgKlxuXHQgKiBAcGFyYW0ga2V5XG5cdCAqIEBwYXJhbSB1cGRhdGVyIEEgY2FsbGJhY2sgdGhhdCB0YWtlcyB0aGUgb2xkIHZhbHVlIGFuZCByZXR1cm5zIGEgbmV3IHZhbHVlLlxuXHQgKiBAcGFyYW0gY3VzdG9tU3RvcmUgTWV0aG9kIHRvIGdldCBhIGN1c3RvbSBzdG9yZS4gVXNlIHdpdGggY2F1dGlvbiAoc2VlIHRoZSBkb2NzKS5cblx0ICovXG5cdHVwZGF0ZSA8IFQgPSBhbnkgPiAoXG5cdFx0a2V5OiBJREJWYWxpZEtleSxcblx0XHR1cGRhdGVyOiAob2xkVmFsdWU6IFQgfCB1bmRlZmluZWQpID0+IFQsXG5cdFx0Y3VzdG9tU3RvcmUgPSB0aGlzLmRlZmF1bHRHZXRTdG9yZUZ1bmMsXG5cdCk6IFByb21pc2UgPCB2b2lkID4ge1xuXHRcdHJldHVybiBjdXN0b21TdG9yZShcblx0XHRcdCdyZWFzd3JpdGUnLFxuXHRcdFx0KHN0b3JlKSA9PlxuXHRcdFx0Ly8gTmVlZCB0byBjcmVhdGUgdGhlIHByb21pc2UgbWFudWFsbHkuXG5cdFx0XHQvLyBJZiBJIHRyeSB0byBjaGFpbiBwcm9taXNlcywgdGhlIHRyYW5zYWN0aW9uIGNsb3NlcyBpbiBicm93c2Vyc1xuXHRcdFx0Ly8gdGhhdCB1c2UgYSBwcm9taXNlIHBvbHlmaWxsIChJRTEwLzExKS5cblx0XHRcdG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRcdFx0c3RvcmUuZ2V0KGtleSkub25zdWNjZXNzID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdHN0b3JlLnB1dCh1cGRhdGVyKHRoaXMucmVzdWx0KSwga2V5KTtcblx0XHRcdFx0XHRcdHJlc29sdmUocHJvbWlzaWZ5UmVxdWVzdChzdG9yZS50cmFuc2FjdGlvbikpO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKGVycikge1xuXHRcdFx0XHRcdFx0cmVqZWN0KGVycik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9O1xuXHRcdFx0fSksXG5cdFx0KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBEZWxldGUgYSBwYXJ0aWN1bGFyIGtleSBmcm9tIHRoZSBzdG9yZS5cblx0ICpcblx0ICogQHBhcmFtIGtleVxuXHQgKiBAcGFyYW0gY3VzdG9tU3RvcmUgTWV0aG9kIHRvIGdldCBhIGN1c3RvbSBzdG9yZS4gVXNlIHdpdGggY2F1dGlvbiAoc2VlIHRoZSBkb2NzKS5cblx0ICovXG5cdGRlbChcblx0XHRrZXk6IElEQlZhbGlkS2V5LFxuXHRcdGN1c3RvbVN0b3JlID0gdGhpcy5kZWZhdWx0R2V0U3RvcmVGdW5jLFxuXHQpOiBQcm9taXNlIDwgdm9pZCA+IHtcblx0XHRyZXR1cm4gY3VzdG9tU3RvcmUoJ3JlYWR3cml0ZScsIChzdG9yZSkgPT4ge1xuXHRcdFx0c3RvcmUuZGVsZXRlKGtleSk7XG5cdFx0XHRyZXR1cm4gcHJvbWlzaWZ5UmVxdWVzdChzdG9yZS50cmFuc2FjdGlvbik7XG5cdFx0fSk7XG5cdH1cblxuXHQvKipcblx0ICogQ2xlYXIgYWxsIHZhbHVlcyBpbiB0aGUgc3RvcmUuXG5cdCAqXG5cdCAqIEBwYXJhbSBjdXN0b21TdG9yZSBNZXRob2QgdG8gZ2V0IGEgY3VzdG9tIHN0b3JlLiBVc2Ugd2l0aCBjYXV0aW9uIChzZWUgdGhlIGRvY3MpLlxuXHQgKi9cblx0Y2xlYXIoY3VzdG9tU3RvcmUgPSB0aGlzLmRlZmF1bHRHZXRTdG9yZUZ1bmMpOiBQcm9taXNlIDwgdm9pZCA+IHtcblx0XHRyZXR1cm4gY3VzdG9tU3RvcmUoJ3JlYWR3cml0ZScsIChzdG9yZSkgPT4ge1xuXHRcdFx0c3RvcmUuY2xlYXIoKTtcblx0XHRcdHJldHVybiBwcm9taXNpZnlSZXF1ZXN0KHN0b3JlLnRyYW5zYWN0aW9uKTtcblx0XHR9KTtcblx0fVxuXG5cdGVhY2hDdXJzb3IoXG5cdFx0Y3VzdG9tU3RvcmU6IFVzZVN0b3JlLFxuXHRcdGNhbGxiYWNrOiAoY3Vyc29yOiBJREJDdXJzb3JXaXRoVmFsdWUpID0+IHZvaWQsXG5cdCk6IFByb21pc2UgPCB2b2lkID4ge1xuXHRcdHJldHVybiBjdXN0b21TdG9yZSgncmVhZG9ubHknLCAoc3RvcmUpID0+IHtcblx0XHRcdC8vIFRoaXMgd291bGQgYmUgc3RvcmUuZ2V0QWxsS2V5cygpLCBidXQgaXQgaXNuJ3Qgc3VwcG9ydGVkIGJ5IEVkZ2Ugb3IgU2FmYXJpLlxuXHRcdFx0Ly8gQW5kIG9wZW5LZXlDdXJzb3IgaXNuJ3Qgc3VwcG9ydGVkIGJ5IFNhZmFyaS5cblx0XHRcdGxldCByZXEgPSBzdG9yZS5vcGVuQ3Vyc29yKCk7XG5cdFx0XHRyZXEub25zdWNjZXNzID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coXCJzdG9yZS5vcGVuQ3Vyc29yLm9uc3VjY2Vzc1wiLCB0aGlzKVxuXHRcdFx0XHRpZiAoIXRoaXMucmVzdWx0KVxuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0Y2FsbGJhY2sodGhpcy5yZXN1bHQpO1xuXHRcdFx0XHR0aGlzLnJlc3VsdC5jb250aW51ZSgpO1xuXHRcdFx0fTtcblx0XHRcdHJlcS5vbmVycm9yID0gZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRjb25zb2xlLmxvZyhcInN0b3JlLm9wZW5DdXJzb3Iub25lcnJvclwiLCBlLCB0aGlzKVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHByb21pc2lmeVJlcXVlc3Qoc3RvcmUudHJhbnNhY3Rpb24pO1xuXHRcdH0pO1xuXHR9XG5cblx0LyoqXG5cdCAqIEdldCBhbGwga2V5cyBpbiB0aGUgc3RvcmUuXG5cdCAqXG5cdCAqIEBwYXJhbSBjdXN0b21TdG9yZSBNZXRob2QgdG8gZ2V0IGEgY3VzdG9tIHN0b3JlLiBVc2Ugd2l0aCBjYXV0aW9uIChzZWUgdGhlIGRvY3MpLlxuXHQgKi9cblx0a2V5cyhjdXN0b21TdG9yZSA9IHRoaXMuZGVmYXVsdEdldFN0b3JlRnVuYyk6IFByb21pc2UgPCBJREJWYWxpZEtleVtdID4ge1xuXHRcdGNvbnN0IGl0ZW1zOiBJREJWYWxpZEtleVtdID0gW107XG5cblx0XHRyZXR1cm4gdGhpcy5lYWNoQ3Vyc29yKGN1c3RvbVN0b3JlLCAoY3Vyc29yKSA9PiBpdGVtcy5wdXNoKGN1cnNvci5rZXkpKS50aGVuKFxuXHRcdFx0KCkgPT4gaXRlbXMsXG5cdFx0KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBHZXQgYWxsIHZhbHVlcyBpbiB0aGUgc3RvcmUuXG5cdCAqXG5cdCAqIEBwYXJhbSBjdXN0b21TdG9yZSBNZXRob2QgdG8gZ2V0IGEgY3VzdG9tIHN0b3JlLiBVc2Ugd2l0aCBjYXV0aW9uIChzZWUgdGhlIGRvY3MpLlxuXHQgKi9cblx0dmFsdWVzKGN1c3RvbVN0b3JlID0gdGhpcy5kZWZhdWx0R2V0U3RvcmVGdW5jKTogUHJvbWlzZSA8IElEQlZhbGlkS2V5W10gPiB7XG5cdFx0Y29uc3QgaXRlbXM6IGFueVtdID0gW107XG5cblx0XHRyZXR1cm4gdGhpcy5lYWNoQ3Vyc29yKGN1c3RvbVN0b3JlLCAoY3Vyc29yKSA9PiBpdGVtcy5wdXNoKGN1cnNvci52YWx1ZSkpLnRoZW4oXG5cdFx0XHQoKSA9PiBpdGVtcyxcblx0XHQpO1xuXHR9XG5cblx0LyoqXG5cdCAqIEdldCBhbGwgZW50cmllcyBpbiB0aGUgc3RvcmUuIEVhY2ggZW50cnkgaXMgYW4gYXJyYXkgb2YgYFtrZXksIHZhbHVlXWAuXG5cdCAqXG5cdCAqIEBwYXJhbSBjdXN0b21TdG9yZSBNZXRob2QgdG8gZ2V0IGEgY3VzdG9tIHN0b3JlLiBVc2Ugd2l0aCBjYXV0aW9uIChzZWUgdGhlIGRvY3MpLlxuXHQgKi9cblx0ZW50cmllcyhjdXN0b21TdG9yZSA9IHRoaXMuZGVmYXVsdEdldFN0b3JlRnVuYyk6IFByb21pc2UgPCBbSURCVmFsaWRLZXksIGFueV1bXSA+IHtcblx0XHRjb25zdCBpdGVtczogW0lEQlZhbGlkS2V5LCBhbnldW10gPSBbXTtcblxuXHRcdHJldHVybiB0aGlzLmVhY2hDdXJzb3IoY3VzdG9tU3RvcmUsIChjdXJzb3IpID0+XG5cdFx0XHRpdGVtcy5wdXNoKFtjdXJzb3Iua2V5LCBjdXJzb3IudmFsdWVdKSxcblx0XHQpLnRoZW4oKCkgPT4gaXRlbXMpO1xuXHR9XG59Il19