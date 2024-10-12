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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Crypto = void 0;
const crypto_js_1 = __importDefault(require("crypto-js"));
const JsonFormatter = (passSalt) => {
    return {
        stringify: function (cipherParams) {
            let data = [crypto_js_1.default.enc.Hex.stringify(cipherParams.ciphertext)];
            if (cipherParams.iv) {
                data.push(cipherParams.iv.toString());
            }
            else {
                data.push("");
            }
            if (cipherParams.salt) {
                data.push(cipherParams.salt.toString());
            }
            else {
                data.push("");
            }
            data.push(passSalt);
            return Crypto.toHexCode(data);
        },
        parse: function (hexCode) {
            //console.log("hexCode", hexCode)
            let [ct, iv, salt] = Crypto.parseHexCode(hexCode);
            let cipherParams = crypto_js_1.default.lib.CipherParams.create({
                ciphertext: crypto_js_1.default.enc.Hex.parse(ct)
            });
            if (iv) {
                cipherParams.iv = crypto_js_1.default.enc.Hex.parse(iv);
            }
            if (salt) {
                cipherParams.salt = crypto_js_1.default.enc.Hex.parse(salt);
            }
            return cipherParams;
        }
    };
};
class Crypto {
    static encrypt(passphrase, data) {
        return __awaiter(this, void 0, void 0, function* () {
            let { key, salt } = this.createKey(passphrase);
            //console.log("key, salt", {key, salt})
            return crypto_js_1.default.AES.encrypt(data, key, {
                mode: crypto_js_1.default.mode.CFB,
                padding: crypto_js_1.default.pad.AnsiX923,
                format: JsonFormatter(salt)
            }).toString();
        });
    }
    static decrypt(passphrase, data) {
        return __awaiter(this, void 0, void 0, function* () {
            let [ct, iv, salt, passSalt] = this.parseHexCode(data);
            let { key } = this.createKey(passphrase, passSalt);
            return crypto_js_1.default.AES.decrypt(data, key, {
                mode: crypto_js_1.default.mode.CFB,
                padding: crypto_js_1.default.pad.AnsiX923,
                format: JsonFormatter(passSalt)
            }).toString(crypto_js_1.default.enc.Utf8);
        });
    }
    static createKey(passphrase, saltStr = '') {
        let salt = saltStr ? crypto_js_1.default.enc.Hex.parse(saltStr) : crypto_js_1.default.lib.WordArray.random(128 / 8);
        return {
            key: crypto_js_1.default.PBKDF2(passphrase, salt, {
                keySize: 512 / 32,
                iterations: 1000
            }).toString(crypto_js_1.default.enc.Hex),
            salt: salt.toString(crypto_js_1.default.enc.Hex)
        };
    }
    static parseHexCode(hexCode) {
        let data = [];
        do {
            let l = parseInt(hexCode.substr(0, 5), 10);
            let c = hexCode.substr(5, l);
            data.push(c);
            hexCode = hexCode.substr(5 + l);
        } while (hexCode.length);
        return data;
        /*
        let words = CryptoJS.enc.Hex.parse(hexCode);
        return CryptoJS.enc.Utf8.stringify(words).split(",")
        */
    }
    static toHexCode(data) {
        return data.map(d => {
            return (d.length + "").padStart(5, '0') + d;
        }).join('');
        /*
        let words = CryptoJS.enc.Utf8.parse(data.join(","));
        let hex = CryptoJS.enc.Hex.stringify(words);
        //console.log("stringify:", data, "=>", words, "=>", hex)*/
    }
}
exports.Crypto = Crypto;
/*
const test = async()=>{
    const pass = "#drfgt Sf @33 gfdg dfg dfg";
    const data = "rfasdsdsvfgfgfg dsfsdf sdf sdf sdfsdf sdf sdf sf sdgdfg dfg dfg dfgfdgdf gsfd gdfs gsfd gsfd gdf gfdgfdgsdfrete rgdf dfgdfg";
    let encrypted = await Crypto.encrypt(pass, data)
    .catch((e:any)=>{
        console.log("error", e)
    })
    console.log("encrypted:", encrypted)
    if(!encrypted)
        return
    let decrypted = await Crypto.decrypt(pass, encrypted)
    //.catch((e:any)=>{
    //	console.log("error", e)
    //})
    console.log("decrypted:", decrypted==data, decrypted)
};

test().catch((e:any)=>{
    console.log("error", e)
})
*/
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3J5cHRvLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vd2FsbGV0L2NyeXB0by50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSwwREFBaUM7QUFFakMsTUFBTSxhQUFhLEdBQUcsQ0FBQyxRQUFlLEVBQUMsRUFBRTtJQUN4QyxPQUFPO1FBQ04sU0FBUyxFQUFFLFVBQVMsWUFBc0M7WUFDekQsSUFBSSxJQUFJLEdBQUcsQ0FBQyxtQkFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO1lBQ2hFLElBQUksWUFBWSxDQUFDLEVBQUUsRUFBRTtnQkFDcEIsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7YUFDdEM7aUJBQUk7Z0JBQ0osSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUNkO1lBQ0QsSUFBSSxZQUFZLENBQUMsSUFBSSxFQUFFO2dCQUN0QixJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQzthQUN4QztpQkFBSTtnQkFDSixJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQ2Q7WUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBRXBCLE9BQU8sTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMvQixDQUFDO1FBQ0QsS0FBSyxFQUFFLFVBQVMsT0FBYztZQUM3QixpQ0FBaUM7WUFDakMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUVqRCxJQUFJLFlBQVksR0FBRyxtQkFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsTUFBTSxD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LE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQzNDLElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzdCLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDYixPQUFPLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUM7U0FDOUIsUUFBTSxPQUFPLENBQUMsTUFBTSxFQUFFO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDO1FBQ1o7OztVQUdFO0lBQ0gsQ0FBQztJQUVELE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBYTtRQUM3QixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBLEVBQUU7WUFDbEIsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsR0FBQyxDQUFDLENBQUM7UUFDekMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ1o7OzttRUFHMkQ7SUFDNUQsQ0FBQztDQUNEO0FBeERELHdCQXdEQztBQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7RUFxQkUiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgQ3J5cHRvSlMgZnJvbSAnY3J5cHRvLWpzJztcclxuXHJcbmNvbnN0IEpzb25Gb3JtYXR0ZXIgPSAocGFzc1NhbHQ6c3RyaW5nKT0+IHtcclxuXHRyZXR1cm4ge1xyXG5cdFx0c3RyaW5naWZ5OiBmdW5jdGlvbihjaXBoZXJQYXJhbXM6Q3J5cHRvSlMubGliLkNpcGhlclBhcmFtcykge1xyXG5cdFx0XHRsZXQgZGF0YSA9IFtDcnlwdG9KUy5lbmMuSGV4LnN0cmluZ2lmeShjaXBoZXJQYXJhbXMuY2lwaGVydGV4dCldXHJcblx0XHRcdGlmIChjaXBoZXJQYXJhbXMuaXYpIHtcclxuXHRcdFx0XHRkYXRhLnB1c2goY2lwaGVyUGFyYW1zLml2LnRvU3RyaW5nKCkpO1xyXG5cdFx0XHR9ZWxzZXtcclxuXHRcdFx0XHRkYXRhLnB1c2goXCJcIik7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKGNpcGhlclBhcmFtcy5zYWx0KSB7XHJcblx0XHRcdFx0ZGF0YS5wdXNoKGNpcGhlclBhcmFtcy5zYWx0LnRvU3RyaW5nKCkpO1xyXG5cdFx0XHR9ZWxzZXtcclxuXHRcdFx0XHRkYXRhLnB1c2goXCJcIik7XHJcblx0XHRcdH1cclxuXHRcdFx0ZGF0YS5wdXNoKHBhc3NTYWx0KTtcclxuXHJcblx0XHRcdHJldHVybiBDcnlwdG8udG9IZXhDb2RlKGRhdGEpO1xyXG5cdFx0fSxcclxuXHRcdHBhcnNlOiBmdW5jdGlvbihoZXhDb2RlOnN0cmluZyl7XHJcblx0XHRcdC8vY29uc29sZS5sb2coXCJoZXhDb2RlXCIsIGhleENvZGUpXHJcblx0XHRcdGxldCBbY3QsIGl2LCBzYWx0XSA9IENyeXB0by5wYXJzZUhleENvZGUoaGV4Q29kZSlcclxuXHJcblx0XHRcdGxldCBjaXBoZXJQYXJhbXMgPSBDcnlwdG9KUy5saWIuQ2lwaGVyUGFyYW1zLmNyZWF0ZSh7XHJcblx0XHRcdFx0Y2lwaGVydGV4dDogQ3J5cHRvSlMuZW5jLkhleC5wYXJzZShjdClcclxuXHRcdFx0fSk74oCLXHJcblx0XHRcdGlmIChpdikge1xyXG5cdFx0XHRcdGNpcGhlclBhcmFtcy5pdiA9IENyeXB0b0pTLmVuYy5IZXgucGFyc2UoaXYpO1xyXG5cdFx0XHR94oCLXHJcblx0XHRcdGlmIChzYWx0KSB7XHJcblx0XHRcdFx0Y2lwaGVyUGFyYW1zLnNhbHQgPSBDcnlwdG9KUy5lbmMuSGV4LnBhcnNlKHNhbHQpO1xyXG5cdFx0XHR94oCLXHJcblx0XHRcdHJldHVybiBjaXBoZXJQYXJhbXM7XHJcblx0XHR9XHJcblx0fVx0XHJcbn07XHJcblxyXG5leHBvcnQgY2xhc3MgQ3J5cHRvIHtcclxuXHRzdGF0aWMgYXN5bmMgZW5jcnlwdChwYXNzcGhyYXNlOiBzdHJpbmcsIGRhdGE6IHN0cmluZykge1xyXG5cdFx0bGV0IHtrZXksIHNhbHR9ID0gdGhpcy5jcmVhdGVLZXkocGFzc3BocmFzZSk7XHJcblx0XHQvL2NvbnNvbGUubG9nKFwia2V5LCBzYWx0XCIsIHtrZXksIHNhbHR9KVxyXG5cdFx0cmV0dXJuIENyeXB0b0pTLkFFUy5lbmNyeXB0KGRhdGEsIGtleSwge1xyXG5cdFx0XHRtb2RlOiBDcnlwdG9KUy5tb2RlLkNGQixcclxuXHRcdFx0cGFkZGluZzogQ3J5cHRvSlMucGFkLkFuc2lYOTIzLFxyXG5cdFx0XHRmb3JtYXQ6IEpzb25Gb3JtYXR0ZXIoc2FsdClcclxuXHRcdH0pLnRvU3RyaW5nKClcclxuXHR9XHJcblxyXG5cdHN0YXRpYyBhc3luYyBkZWNyeXB0KHBhc3NwaHJhc2U6IHN0cmluZywgZGF0YTogc3RyaW5nKSB7XHJcblx0XHRsZXQgW2N0LCBpdiwgc2FsdCwgcGFzc1NhbHRdID0gdGhpcy5wYXJzZUhleENvZGUoZGF0YSk7XHJcblx0XHRsZXQge2tleX0gPSB0aGlzLmNyZWF0ZUtleShwYXNzcGhyYXNlLCBwYXNzU2FsdCk7XHJcblx0XHRyZXR1cm4gQ3J5cHRvSlMuQUVTLmRlY3J5cHQoZGF0YSwga2V5LCB7XHJcblx0XHRcdG1vZGU6IENyeXB0b0pTLm1vZGUuQ0ZCLFxyXG5cdFx0XHRwYWRkaW5nOiBDcnlwdG9KUy5wYWQuQW5zaVg5MjMsXHJcblx0XHRcdGZvcm1hdDogSnNvbkZvcm1hdHRlcihwYXNzU2FsdClcclxuXHRcdH0pLnRvU3RyaW5nKENyeXB0b0pTLmVuYy5VdGY4KVxyXG5cdH1cclxuXHJcblx0c3RhdGljIGNyZWF0ZUtleShwYXNzcGhyYXNlOiBzdHJpbmcsIHNhbHRTdHI6c3RyaW5nPScnKSB7XHJcblx0XHRsZXQgc2FsdCA9IHNhbHRTdHI/Q3J5cHRvSlMuZW5jLkhleC5wYXJzZShzYWx0U3RyKTpDcnlwdG9KUy5saWIuV29yZEFycmF5LnJhbmRvbSgxMjggLyA4KTtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdGtleTogQ3J5cHRvSlMuUEJLREYyKHBhc3NwaHJhc2UsIHNhbHQsIHtcclxuXHRcdFx0XHRrZXlTaXplOiA1MTIgLyAzMixcclxuXHRcdFx0XHRpdGVyYXRpb25zOiAxMDAwXHJcblx0XHRcdH0pLnRvU3RyaW5nKENyeXB0b0pTLmVuYy5IZXgpLFxyXG5cdFx0XHRzYWx0OnNhbHQudG9TdHJpbmcoQ3J5cHRvSlMuZW5jLkhleClcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHN0YXRpYyBwYXJzZUhleENvZGUoaGV4Q29kZTpzdHJpbmcpe1xyXG5cdFx0bGV0IGRhdGEgPSBbXTtcclxuXHRcdGRve1xyXG5cdFx0XHRsZXQgbCA9IHBhcnNlSW50KGhleENvZGUuc3Vic3RyKDAsIDUpLCAxMCk7XHJcblx0XHRcdGxldCBjID0gaGV4Q29kZS5zdWJzdHIoNSwgbCk7XHJcblx0XHRcdGRhdGEucHVzaChjKTtcclxuXHRcdFx0aGV4Q29kZSA9IGhleENvZGUuc3Vic3RyKDUrbCk7XHJcblx0XHR9d2hpbGUoaGV4Q29kZS5sZW5ndGgpO1xyXG5cdFx0cmV0dXJuIGRhdGE7XHJcblx0XHQvKlxyXG5cdFx0bGV0IHdvcmRzID0gQ3J5cHRvSlMuZW5jLkhleC5wYXJzZShoZXhDb2RlKTtcclxuXHRcdHJldHVybiBDcnlwdG9KUy5lbmMuVXRmOC5zdHJpbmdpZnkod29yZHMpLnNwbGl0KFwiLFwiKVxyXG5cdFx0Ki9cclxuXHR9XHJcblxyXG5cdHN0YXRpYyB0b0hleENvZGUoZGF0YTpzdHJpbmdbXSl7XHJcblx0XHRyZXR1cm4gZGF0YS5tYXAoZD0+e1xyXG5cdFx0XHRyZXR1cm4gKGQubGVuZ3RoK1wiXCIpLnBhZFN0YXJ0KDUsICcwJykrZDtcclxuXHRcdH0pLmpvaW4oJycpO1xyXG5cdFx0LypcclxuXHRcdGxldCB3b3JkcyA9IENyeXB0b0pTLmVuYy5VdGY4LnBhcnNlKGRhdGEuam9pbihcIixcIikpO1xyXG5cdFx0bGV0IGhleCA9IENyeXB0b0pTLmVuYy5IZXguc3RyaW5naWZ5KHdvcmRzKTtcclxuXHRcdC8vY29uc29sZS5sb2coXCJzdHJpbmdpZnk6XCIsIGRhdGEsIFwiPT5cIiwgd29yZHMsIFwiPT5cIiwgaGV4KSovXHJcblx0fVxyXG59XHJcblxyXG4vKlxyXG5jb25zdCB0ZXN0ID0gYXN5bmMoKT0+e1xyXG5cdGNvbnN0IHBhc3MgPSBcIiNkcmZndCBTZiBAMzMgZ2ZkZyBkZmcgZGZnXCI7XHJcblx0Y29uc3QgZGF0YSA9IFwicmZhc2RzZHN2ZmdmZ2ZnIGRzZnNkZiBzZGYgc2RmIHNkZnNkZiBzZGYgc2RmIHNmIHNkZ2RmZyBkZmcgZGZnIGRmZ2ZkZ2RmIGdzZmQgZ2RmcyBnc2ZkIGdzZmQgZ2RmIGdmZGdmZGdzZGZyZXRlIHJnZGYgZGZnZGZnXCI7XHJcblx0bGV0IGVuY3J5cHRlZCA9IGF3YWl0IENyeXB0by5lbmNyeXB0KHBhc3MsIGRhdGEpXHJcblx0LmNhdGNoKChlOmFueSk9PntcclxuXHRcdGNvbnNvbGUubG9nKFwiZXJyb3JcIiwgZSlcclxuXHR9KVxyXG5cdGNvbnNvbGUubG9nKFwiZW5jcnlwdGVkOlwiLCBlbmNyeXB0ZWQpXHJcblx0aWYoIWVuY3J5cHRlZClcclxuXHRcdHJldHVyblxyXG5cdGxldCBkZWNyeXB0ZWQgPSBhd2FpdCBDcnlwdG8uZGVjcnlwdChwYXNzLCBlbmNyeXB0ZWQpXHJcblx0Ly8uY2F0Y2goKGU6YW55KT0+e1xyXG5cdC8vXHRjb25zb2xlLmxvZyhcImVycm9yXCIsIGUpXHJcblx0Ly99KVxyXG5cdGNvbnNvbGUubG9nKFwiZGVjcnlwdGVkOlwiLCBkZWNyeXB0ZWQ9PWRhdGEsIGRlY3J5cHRlZClcclxufTtcclxuXHJcbnRlc3QoKS5jYXRjaCgoZTphbnkpPT57XHJcblx0Y29uc29sZS5sb2coXCJlcnJvclwiLCBlKVxyXG59KVxyXG4qL1xyXG5cclxuXHJcblxyXG4iXX0=