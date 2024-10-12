"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheStore = void 0;
const indexed_db_1 = require("./indexed-db");
const tx_store_1 = require("./tx-store");
class CacheStore {
    constructor(wallet) {
        this.store = new Map();
        this.wallet = wallet;
        let { uid, network } = wallet;
        console.log("CacheStore:wallet:uid", uid);
        let sNetwork = tx_store_1.internalNames[network] || network;
        if (typeof indexedDB != "undefined")
            this.idb = new indexed_db_1.iDB({ storeName: "cache", dbName: "zua_" + uid + "_" + sNetwork });
    }
    setAddressIndexes(data) {
        let item = Object.assign({
            id: "address-indexes",
            ts: Date.now()
        }, data);
        this.set(item);
    }
    getAddressIndexes() {
        return this.get("address-indexes");
    }
    set(item, skipSave = false) {
        this.store.set(item.id, item);
        this.emitCache(item);
        if (!skipSave)
            this.save(item);
    }
    get(id) {
        return this.store.get(id);
    }
    save(item) {
        var _a;
        (_a = this.idb) === null || _a === void 0 ? void 0 : _a.set(item.id, JSON.stringify(item));
    }
    emitCache(item) {
        this.wallet.emit("wallet-cache", item);
    }
    restore() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.idb) {
                let entries = (yield this.idb.entries().catch((err) => {
                    console.log("cache-store: entries():error", err);
                })) || [];
                let length = entries.length;
                console.log("cache idb entries:", entries);
                let list = [];
                for (let i = 0; i < length; i++) {
                    let [key, cacheStr] = entries[i];
                    if (!cacheStr)
                        continue;
                    try {
                        let cacheItem = JSON.parse(cacheStr);
                        list.push(cacheItem);
                    }
                    catch (e) {
                        this.wallet.logger.error("CACHE parse error - 104:", cacheStr, e);
                    }
                }
                list.sort((a, b) => {
                    return a.ts - b.ts;
                }).map(o => {
                    this.set(o, true);
                });
            }
        });
    }
}
exports.CacheStore = CacheStore;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FjaGUtc3RvcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi93YWxsZXQvY2FjaGUtc3RvcmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQ0EsNkNBQWlDO0FBQ2pDLHlDQUF3QztBQWF4QyxNQUFhLFVBQVU7SUFLdEIsWUFBWSxNQUFhO1FBSHpCLFVBQUssR0FBK0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUk3QyxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixJQUFJLEVBQUMsR0FBRyxFQUFFLE9BQU8sRUFBQyxHQUFHLE1BQU0sQ0FBQztRQUN0QixPQUFPLENBQUMsR0FBRyxDQUFDLHVCQUF1QixFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQy9DLElBQUksUUFBUSxHQUFVLHdCQUFhLENBQUMsT0FBTyxDQUFDLElBQUUsT0FBTyxDQUFDO1FBQ3RELElBQUcsT0FBTyxTQUFTLElBQUksV0FBVztZQUNqQyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksZ0JBQUcsQ0FBQyxFQUFDLFNBQVMsRUFBQyxPQUFPLEVBQUUsTUFBTSxFQUFDLFFBQVEsR0FBQyxHQUFHLEdBQUMsR0FBRyxHQUFDLFFBQVEsRUFBQyxDQUFDLENBQUM7SUFDekUsQ0FBQztJQUVELGlCQUFpQixDQUFDLElBQTRCO1FBQzFDLElBQUksSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7WUFDckIsRUFBRSxFQUFFLGlCQUFpQjtZQUNyQixFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRTtTQUNqQixFQUFFLElBQUksQ0FBQyxDQUFDO1FBRVQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNsQixDQUFDO0lBQ0QsaUJBQWlCO1FBQ2IsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFzQyxDQUFBO0lBQzNFLENBQUM7SUFFSSxHQUFHLENBQUMsSUFBbUIsRUFBRSxRQUFRLEdBQUMsS0FBSztRQUM5QyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzlCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDckIsSUFBRyxDQUFDLFFBQVE7WUFDWCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLENBQUM7SUFFVSxHQUFHLENBQUMsRUFBUztRQUNqQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzlCLENBQUM7SUFFSixJQUFJLENBQUMsSUFBbUI7O1FBQ3ZCLE1BQUEsSUFBSSxDQUFDLEdBQUcsMENBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO0lBQzdDLENBQUM7SUFDRCxTQUFTLENBQUMsSUFBbUI7UUFDdEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFDSyxPQUFPOztZQUNaLElBQUcsSUFBSSxDQUFDLEdBQUcsRUFBQztnQkFDWCxJQUFJLE9BQU8sR0FBRyxDQUFBLE1BQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLEVBQUMsRUFBRTtvQkFDbkQsT0FBTyxDQUFDLEdBQUcsQ0FBQyw4QkFBOEIsRUFBRSxHQUFHLENBQUMsQ0FBQTtnQkFDakQsQ0FBQyxDQUFDLEtBQUUsRUFBRSxDQUFDO2dCQUNQLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7Z0JBQzVCLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLEVBQUUsT0FBTyxDQUFDLENBQUE7Z0JBQzFDLElBQUksSUFBSSxHQUFvQixFQUFFLENBQUM7Z0JBQy9CLEtBQUssSUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUMsR0FBQyxNQUFNLEVBQUMsQ0FBQyxFQUFFLEVBQUM7b0JBQzFCLElBQUksQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO29CQUNoQyxJQUFHLENBQUMsUUFBUTt3QkFDWCxTQUFTO29CQUNWLElBQUc7d0JBQ0YsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQTt3QkFDcEMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtxQkFDcEI7b0JBQUEsT0FBTSxDQUFDLEVBQUM7d0JBQ1IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLDBCQUEwQixFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQTtxQkFDakU7aUJBQ0Q7Z0JBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsRUFBRTtvQkFDakIsT0FBTyxDQUFDLENBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ2xCLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUEsRUFBRTtvQkFDVCxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtnQkFDbEIsQ0FBQyxDQUFDLENBQUE7YUFDRjtRQUNGLENBQUM7S0FBQTtDQUNEO0FBdEVELGdDQXNFQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7V2FsbGV0fSBmcm9tICcuL3dhbGxldCc7XG5pbXBvcnQge2lEQn0gZnJvbSAnLi9pbmRleGVkLWRiJztcbmltcG9ydCB7aW50ZXJuYWxOYW1lc30gZnJvbSAnLi90eC1zdG9yZSdcblxuZXhwb3J0IGludGVyZmFjZSBDYWNoZVN0b3JlSXRlbXtcbiAgICBpZDpzdHJpbmc7XG4gICAgdHM6bnVtYmVyO1xufVxuZXhwb3J0IGludGVyZmFjZSBDYWNoZUl0ZW1BZGRyZXNzSW5kZXhlc3tcbiAgICBpZD86c3RyaW5nO1xuICAgIHRzPzpudW1iZXI7XG4gICAgcmVjZWl2ZTpudW1iZXI7XG4gICAgY2hhbmdlOm51bWJlcjtcbn1cblxuZXhwb3J0IGNsYXNzIENhY2hlU3RvcmV7XG5cdHdhbGxldDpXYWxsZXQ7XG5cdHN0b3JlOk1hcDxzdHJpbmcsIENhY2hlU3RvcmVJdGVtPiA9IG5ldyBNYXAoKTtcblx0aWRiOmlEQnx1bmRlZmluZWQ7XG5cblx0Y29uc3RydWN0b3Iod2FsbGV0OldhbGxldCl7XG5cdFx0dGhpcy53YWxsZXQgPSB3YWxsZXQ7XG5cdFx0bGV0IHt1aWQsIG5ldHdvcmt9ID0gd2FsbGV0O1xuICAgICAgICBjb25zb2xlLmxvZyhcIkNhY2hlU3RvcmU6d2FsbGV0OnVpZFwiLCB1aWQpXG5cdFx0bGV0IHNOZXR3b3JrOnN0cmluZyA9IGludGVybmFsTmFtZXNbbmV0d29ya118fG5ldHdvcms7XG5cdFx0aWYodHlwZW9mIGluZGV4ZWREQiAhPSBcInVuZGVmaW5lZFwiKVxuXHRcdFx0dGhpcy5pZGIgPSBuZXcgaURCKHtzdG9yZU5hbWU6XCJjYWNoZVwiLCBkYk5hbWU6XCJrYXNwYV9cIit1aWQrXCJfXCIrc05ldHdvcmt9KTtcbiAgICB9XG5cbiAgICBzZXRBZGRyZXNzSW5kZXhlcyhkYXRhOkNhY2hlSXRlbUFkZHJlc3NJbmRleGVzKXtcbiAgICAgICAgbGV0IGl0ZW0gPSBPYmplY3QuYXNzaWduKHtcbiAgICAgICAgICAgIGlkOiBcImFkZHJlc3MtaW5kZXhlc1wiLFxuICAgICAgICAgICAgdHM6IERhdGUubm93KClcbiAgICAgICAgfSwgZGF0YSk7XG5cbiAgICAgICAgdGhpcy5zZXQoaXRlbSkgXG4gICAgfVxuICAgIGdldEFkZHJlc3NJbmRleGVzKCl7XG4gICAgICAgIHJldHVybiB0aGlzLmdldChcImFkZHJlc3MtaW5kZXhlc1wiKSBhcyBDYWNoZUl0ZW1BZGRyZXNzSW5kZXhlc3x1bmRlZmluZWRcbiAgICB9XG5cblx0cHJpdmF0ZSBzZXQoaXRlbTpDYWNoZVN0b3JlSXRlbSwgc2tpcFNhdmU9ZmFsc2Upe1xuXHRcdHRoaXMuc3RvcmUuc2V0KGl0ZW0uaWQsIGl0ZW0pO1xuXHRcdHRoaXMuZW1pdENhY2hlKGl0ZW0pO1xuXHRcdGlmKCFza2lwU2F2ZSlcblx0XHRcdHRoaXMuc2F2ZShpdGVtKTtcblx0fVxuXG4gICAgcHJpdmF0ZSBnZXQoaWQ6c3RyaW5nKXtcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RvcmUuZ2V0KGlkKTtcbiAgICB9XG5cblx0c2F2ZShpdGVtOkNhY2hlU3RvcmVJdGVtKXtcblx0XHR0aGlzLmlkYj8uc2V0KGl0ZW0uaWQsIEpTT04uc3RyaW5naWZ5KGl0ZW0pKVxuXHR9XG5cdGVtaXRDYWNoZShpdGVtOkNhY2hlU3RvcmVJdGVtKXtcbiAgICAgICAgdGhpcy53YWxsZXQuZW1pdChcIndhbGxldC1jYWNoZVwiLCBpdGVtKTtcblx0fVxuXHRhc3luYyByZXN0b3JlKCl7XG5cdFx0aWYodGhpcy5pZGIpe1xuXHRcdFx0bGV0IGVudHJpZXMgPSBhd2FpdCB0aGlzLmlkYi5lbnRyaWVzKCkuY2F0Y2goKGVycik9Pntcblx0XHRcdFx0Y29uc29sZS5sb2coXCJjYWNoZS1zdG9yZTogZW50cmllcygpOmVycm9yXCIsIGVycilcblx0XHRcdH0pfHxbXTtcblx0XHRcdGxldCBsZW5ndGggPSBlbnRyaWVzLmxlbmd0aDtcblx0XHRcdGNvbnNvbGUubG9nKFwiY2FjaGUgaWRiIGVudHJpZXM6XCIsIGVudHJpZXMpXG5cdFx0XHRsZXQgbGlzdDpDYWNoZVN0b3JlSXRlbVtdID0gW107XG5cdFx0XHRmb3IgKGxldCBpPTA7IGk8bGVuZ3RoO2krKyl7XG5cdFx0XHRcdGxldCBba2V5LCBjYWNoZVN0cl0gPSBlbnRyaWVzW2ldXG5cdFx0XHRcdGlmKCFjYWNoZVN0cilcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0dHJ5e1xuXHRcdFx0XHRcdGxldCBjYWNoZUl0ZW0gPSBKU09OLnBhcnNlKGNhY2hlU3RyKVxuXHRcdFx0XHRcdGxpc3QucHVzaChjYWNoZUl0ZW0pXG5cdFx0XHRcdH1jYXRjaChlKXtcblx0XHRcdFx0XHR0aGlzLndhbGxldC5sb2dnZXIuZXJyb3IoXCJDQUNIRSBwYXJzZSBlcnJvciAtIDEwNDpcIiwgY2FjaGVTdHIsIGUpXG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0bGlzdC5zb3J0KChhLCBiKT0+e1xuXHRcdFx0XHRyZXR1cm4gYS50cy1iLnRzO1xuXHRcdFx0fSkubWFwKG89Pntcblx0XHRcdFx0dGhpcy5zZXQobywgdHJ1ZSlcblx0XHRcdH0pXG5cdFx0fVxuXHR9XG59XG4iXX0=