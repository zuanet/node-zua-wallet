"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.UtxoSet = exports.COINBASE_CFM_COUNT = exports.CONFIRMATION_COUNT = exports.UnspentOutput = void 0;
const unspent_output_1 = require("./unspent-output");
Object.defineProperty(exports, "UnspentOutput", { enumerable: true, get: function () { return unspent_output_1.UnspentOutput; } });
const helper = __importStar(require("../utils/helper"));
// import * as api from './apiHelpers';
const wallet_1 = require("./wallet");
const event_target_impl_1 = require("./event-target-impl");
const ZUA = helper.ZUA;
exports.CONFIRMATION_COUNT = 10;
exports.COINBASE_CFM_COUNT = 100;
let seq = 0;
class UtxoSet extends event_target_impl_1.EventTargetImpl {
    constructor(wallet) {
        super();
        this.utxos = {
            confirmed: new Map(),
            pending: new Map(),
            used: new Map()
        };
        this.inUse = [];
        this.totalBalance = 0;
        this.availableBalance = 0;
        this.debug = false;
        this.utxoStorage = {};
        this.addressesUtxoSyncStatuses = new Map();
        this.wallet = wallet;
    }
    /**
     * Add UTXOs to UTXO set.
     * @param utxos Array of UTXOs from zua API.
     * @param address Address of UTXO owner.
     */
    add(utxos, address) {
        const utxoIds = [];
        this.logger.utxodebug("add utxos", utxos);
        const { blueScore } = this.wallet;
        utxos.forEach((utxo) => {
            const utxoId = utxo.transactionId + utxo.index.toString();
            const utxoInUse = this.inUse.includes(utxoId);
            const alreadyHaveIt = !!(this.utxos.confirmed.has(utxoId) || this.utxos.pending.has(utxoId));
            //console.log("utxo.scriptPubKey", utxo)
            //console.log("utxoInUse", {utxoInUse, alreadyHaveIt})
            if (!utxoInUse && !alreadyHaveIt /*&& utxo.isSpendable*/) {
                utxoIds.push(utxoId);
                let confirmed = (blueScore - utxo.blockDaaScore >= (utxo.isCoinbase ? exports.COINBASE_CFM_COUNT : exports.CONFIRMATION_COUNT));
                let unspentOutput = new unspent_output_1.UnspentOutput({
                    txid: utxo.transactionId,
                    address,
                    vout: utxo.index,
                    scriptPubKey: utxo.scriptPublicKey.scriptPublicKey,
                    scriptPublicKeyVersion: utxo.scriptPublicKey.version,
                    satoshis: +utxo.amount,
                    blockDaaScore: utxo.blockDaaScore,
                    isCoinbase: utxo.isCoinbase
                });
                //confirmed = confirmed || this.isOurChange(unspentOutput);
                //confirmed = /*confirmed || */this.isOurChange(unspentOutput);
                //if(confirmed){
                //	console.log("Change address: unspentOutput", blueScore-utxo.blockDaaScore, unspentOutput)
                //}
                let map = this.utxos[confirmed ? 'confirmed' : 'pending'];
                map.set(utxoId, unspentOutput);
                this.wallet.adjustBalance(confirmed, unspentOutput.satoshis);
            }
            else if (utxoInUse) {
                let unspentOutput = new unspent_output_1.UnspentOutput({
                    txid: utxo.transactionId,
                    address,
                    vout: utxo.index,
                    scriptPubKey: utxo.scriptPublicKey.scriptPublicKey,
                    scriptPublicKeyVersion: utxo.scriptPublicKey.version,
                    satoshis: +utxo.amount,
                    blockDaaScore: utxo.blockDaaScore,
                    isCoinbase: utxo.isCoinbase
                });
                this.utxos.used.set(utxoId, unspentOutput);
            }
        });
        if (utxoIds.length) {
            this.logger.utxodebug(`adding ${utxoIds.length} UTXO entries:\n`, utxoIds);
            this.logger.utxo(`incoming ${utxoIds.length} UTXO entries`);
        }
        this.wallet.txStore.addAddressUTXOs(address, utxos);
        return utxoIds;
    }
    get logger() {
        return this.wallet.logger;
    }
    remove(utxoIds) {
        this.release(utxoIds);
        let { blueScore } = this.wallet;
        let utxo;
        utxoIds.forEach(id => {
            utxo = this.utxos.confirmed.get(id);
            if (utxo) {
                this.utxos.confirmed.delete(id);
                this.wallet.adjustBalance(true, -utxo.satoshis);
            }
            utxo = this.utxos.pending.get(id);
            if (utxo) {
                this.utxos.pending.delete(id);
                this.wallet.adjustBalance(false, -utxo.satoshis);
                //duplicate tx issue handling
                if (utxo.blockDaaScore - blueScore < 70) {
                    let apiUTXO = {
                        transactionId: utxo.txId,
                        amount: utxo.satoshis,
                        scriptPublicKey: {
                            version: utxo.scriptPublicKeyVersion,
                            scriptPublicKey: utxo.scriptPubKey
                        },
                        blockDaaScore: utxo.blockDaaScore,
                        index: utxo.outputIndex,
                        isCoinbase: utxo.isCoinbase
                    };
                    this.wallet.txStore.removePendingUTXO(apiUTXO, utxo.address.toString());
                }
            }
        });
    }
    clearUsed() {
        this.inUse = [];
        this.utxos.used.clear();
        this.wallet.updateDebugInfo();
        this.wallet.emitCache();
    }
    clearMissing() {
        const { confirmed, pending, used } = this.utxos;
        let missing = this.inUse.filter(utxoId => {
            return !(confirmed.has(utxoId) || pending.has(utxoId) || used.has(utxoId));
        });
        if (!missing.length)
            return false;
        this.release(missing);
        return true;
    }
    release(utxoIdsToEnable) {
        // assigns new array without any utxoIdsToEnable
        this.inUse = this.inUse.filter((utxoId) => !utxoIdsToEnable.includes(utxoId));
        utxoIdsToEnable.forEach(utxoId => {
            this.utxos.used.delete(utxoId);
        });
        this.wallet.updateDebugInfo();
        this.wallet.emitCache();
        // this.updateUtxoBalance();
    }
    updateUtxoBalance() {
        const { blueScore } = this.wallet;
        [...this.utxos.pending.values()].forEach(utxo => {
            if (blueScore - utxo.blockDaaScore < (utxo.isCoinbase ? exports.COINBASE_CFM_COUNT : exports.CONFIRMATION_COUNT))
                return;
            this.utxos.pending.delete(utxo.txId + utxo.outputIndex);
            this.wallet.adjustBalance(false, -utxo.satoshis, false);
            this.utxos.confirmed.set(utxo.txId + utxo.outputIndex, utxo);
            this.wallet.adjustBalance(true, utxo.satoshis);
        });
    }
    clear() {
        this.utxos.confirmed.clear();
        this.utxos.pending.clear();
        this.utxos.used.clear();
        this.inUse = [];
        this.availableBalance = 0;
        this.utxoStorage = {};
        this.logger.info('UTXO set cleared.');
    }
    updateUsed(utxos) {
        utxos.forEach(utxo => {
            this.inUse.push(utxo.id);
            this.utxos.used.set(utxo.txId, utxo);
        });
        this.wallet.updateDebugInfo();
        this.wallet.emitCache();
    }
    /**
     * Naively select UTXOs.
     * @param txAmount Provide the amount that the UTXOs should cover.
     * @throws Error message if the UTXOs can't cover the `txAmount`
     */
    selectUtxos(txAmount) {
        const utxos = [];
        const utxoIds = [];
        let totalVal = 0;
        let list = [...this.utxos.confirmed.values()];
        list = list.filter((utxo) => {
            return !this.inUse.includes(utxo.id);
        });
        list.sort((a, b) => {
            return a.blockDaaScore - b.blockDaaScore || b.satoshis - a.satoshis || a.txId.localeCompare(b.txId) || a.outputIndex - b.outputIndex;
        });
        let mass = 0;
        for (const utxo of list) {
            //console.log("info",`UTXO ID: ${utxoId}  , UTXO: ${utxo}`);
            //if (!this.inUse.includes(utxoId)) {
            utxoIds.push(utxo.id);
            utxos.push(utxo);
            mass += utxo.mass;
            totalVal += utxo.satoshis;
            //}
            if (totalVal >= txAmount)
                break;
        }
        if (totalVal < txAmount)
            throw new Error(`Insufficient balance - need: ${ZUA(txAmount)} ZUA, available: ${ZUA(totalVal)} ZUA`);
        return {
            utxoIds,
            utxos,
            mass
        };
    }
    /**
     * Naively collect UTXOs.
     * @param maxCount Provide the max UTXOs count.
     */
    collectUtxos(maxCount = 10000) {
        const utxos = [];
        const utxoIds = [];
        let totalVal = 0;
        let list = [...this.utxos.confirmed.values()];
        list = list.filter((utxo) => {
            return !this.inUse.includes(utxo.id);
        });
        list.sort((a, b) => {
            return a.blockDaaScore - b.blockDaaScore || b.satoshis - a.satoshis || a.txId.localeCompare(b.txId) || a.outputIndex - b.outputIndex;
        });
        let maxMass = wallet_1.Wallet.MaxMassUTXOs;
        let mass = 0;
        for (const utxo of list) {
            if (utxos.length >= maxCount || mass + utxo.mass >= maxMass)
                break;
            utxoIds.push(utxo.id);
            utxos.push(utxo);
            totalVal += utxo.satoshis;
            mass += utxo.mass;
        }
        //console.log("maxMass:"+maxMass, "mass:"+mass)
        return {
            utxoIds,
            utxos,
            amount: totalVal,
            mass
        };
    }
    syncAddressesUtxos(addresses) {
        return __awaiter(this, void 0, void 0, function* () {
            const newAddresses = addresses.map(address => {
                if (this.addressesUtxoSyncStatuses.has(address))
                    return;
                this.addressesUtxoSyncStatuses.set(address, false);
                return address;
            }).filter(address => address);
            //in sync process addressDiscovery calls findUtxos
            if (!newAddresses.length || (this.wallet.syncInProggress && !this.wallet.options.disableAddressDerivation))
                return;
            yield this.wallet.findUtxos(newAddresses);
            if (!this.wallet.syncOnce)
                yield this.utxoSubscribe();
        });
    }
    utxoSubscribe() {
        return __awaiter(this, void 0, void 0, function* () {
            let addresses = [];
            this.addressesUtxoSyncStatuses.forEach((sent, address) => {
                //if(sent)
                //  return
                //  !!!FIXME prevent multiple address subscriptions
                //if(!this.addressesUtxoSyncStatuses.get(address)) {
                //this.addressesUtxoSyncStatuses.set(address, true);
                addresses.push(address);
                //}
            });
            if (!addresses.length)
                return addresses;
            //console.log(`[${this.wallet.network}] !!! +++++++++++++++ SUBSCRIBING TO ADDRESSES :)\n`,addresses);
            let utxoChangedRes = yield this.wallet.api.subscribeUtxosChanged(addresses, this.onUtxosChanged.bind(this))
                .catch((error) => {
                console.log(`[${this.wallet.network}] RPC ERROR in uxtoSync! while registering addresses:`, error, addresses);
                addresses.map(address => {
                    this.addressesUtxoSyncStatuses.set(address, false);
                });
            });
            //console.log("utxoSync:utxoChangedRes:", utxoChangedRes, "\n utxoSync addresses:", addresses)
            return addresses;
        });
    }
    onUtxosChanged(added, removed) {
        // console.log("onUtxosChanged:res", added, removed)
        added.forEach((utxos, address) => {
            //this.logger.log('info', `${address}: ${utxos.length} utxos found.+=+=+=+=+=+=+++++=======+===+====+====+====+`);
            if (!utxos.length)
                return;
            if (!this.utxoStorage[address]) {
                this.utxoStorage[address] = utxos;
            }
            else {
                let txid2Utxo = {};
                utxos.forEach(utxo => {
                    txid2Utxo[utxo.transactionId + utxo.index] = utxo;
                });
                let oldUtxos = this.utxoStorage[address].filter(utxo => {
                    return !txid2Utxo[utxo.transactionId + utxo.index];
                });
                this.utxoStorage[address] = [...oldUtxos, ...utxos];
            }
            this.add(utxos, address);
        });
        this.wallet.txStore.addFromUTXOs(added);
        let utxoIds = [];
        removed.forEach((utxos, address) => {
            let txid2Outpoint = {};
            utxos.forEach(utxo => {
                txid2Outpoint[utxo.transactionId + utxo.index] = utxo;
                utxoIds.push(utxo.transactionId + utxo.index);
            });
            if (!this.utxoStorage[address])
                return;
            this.utxoStorage[address] = this.utxoStorage[address].filter(utxo => {
                return !txid2Outpoint[utxo.transactionId + utxo.index];
            });
        });
        if (utxoIds.length)
            this.remove(utxoIds);
        const isActivityOnReceiveAddr = this.utxoStorage[this.wallet.receiveAddress] !== undefined;
        if (isActivityOnReceiveAddr)
            this.wallet.addressManager.receiveAddress.next();
        //this.updateUtxoBalance();
        this.wallet.emit("utxo-change", { added, removed });
    }
    isOur(utxo) {
        return (!!this.wallet.transactions[utxo.txId]) || this.isOurChange(utxo);
    }
    isOurChange(utxo) {
        return this.wallet.addressManager.isOurChange(String(utxo.address));
    }
    get count() {
        return this.utxos.confirmed.size + this.utxos.pending.size;
    }
    get confirmedCount() {
        return this.utxos.confirmed.size;
    }
}
exports.UtxoSet = UtxoSet;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXR4by5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3dhbGxldC91dHhvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSxxREFBK0M7QUFTdkMsOEZBVEEsOEJBQWEsT0FTQTtBQUxyQix3REFBMEM7QUFDMUMsdUNBQXVDO0FBQ3ZDLHFDQUFnQztBQUNoQywyREFBb0Q7QUFDcEQsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQztBQUVWLFFBQUEsa0JBQWtCLEdBQUcsRUFBRSxDQUFDO0FBQ3hCLFFBQUEsa0JBQWtCLEdBQUcsR0FBRyxDQUFDO0FBRXRDLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQztBQUNaLE1BQWEsT0FBUSxTQUFRLG1DQUFlO0lBd0IzQyxZQUFZLE1BQWM7UUFDekIsS0FBSyxFQUFFLENBQUM7UUF4QlQsVUFBSyxHQUlEO1lBQ0gsU0FBUyxFQUFFLElBQUksR0FBRyxFQUFFO1lBQ3BCLE9BQU8sRUFBRSxJQUFJLEdBQUcsRUFBRTtZQUNsQixJQUFJLEVBQUUsSUFBSSxHQUFHLEVBQUU7U0FDZixDQUFDO1FBRUYsVUFBSyxHQUFhLEVBQUUsQ0FBQztRQUVyQixpQkFBWSxHQUFHLENBQUMsQ0FBQztRQUVqQixxQkFBZ0IsR0FBRyxDQUFDLENBQUM7UUFDckIsVUFBSyxHQUFZLEtBQUssQ0FBQztRQUV2QixnQkFBVyxHQUFrQyxFQUFFLENBQUM7UUFJaEQsOEJBQXlCLEdBQTRCLElBQUksR0FBRyxFQUFFLENBQUM7UUFJOUQsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7SUFDdEIsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxHQUFHLENBQUMsS0FBaUIsRUFBRSxPQUFlO1FBQ3JDLE1BQU0sT0FBTyxHQUFhLEVBQUUsQ0FBQztRQUM3QixJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFD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LENBQUMsSUFBa0I7UUFDdkIsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3pFLENBQUM7SUFFRCxXQUFXLENBQUMsSUFBa0I7UUFDN0IsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO0lBQ3BFLENBQUM7SUFDRCxJQUFJLEtBQUs7UUFDUixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7SUFDNUQsQ0FBQztJQUVELElBQUksY0FBYztRQUNqQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQTtJQUNqQyxDQUFDO0NBQ0Q7QUE3WEQsMEJBNlhDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtBcGksUlBDfSBmcm9tICdjdXN0b20tdHlwZXMnO1xuaW1wb3J0IHtVbnNwZW50T3V0cHV0fSBmcm9tICcuL3Vuc3BlbnQtb3V0cHV0Jztcbi8vIEB0cy1pZ25vcmVcbmltcG9ydCAqIGFzIGthc3BhY29yZSBmcm9tICdAa2FzcGEvY29yZS1saWInO1xuaW1wb3J0ICogYXMgY3J5cHRvIGZyb20gJ2NyeXB0byc7XG5pbXBvcnQgKiBhcyBoZWxwZXIgZnJvbSAnLi4vdXRpbHMvaGVscGVyJztcbi8vIGltcG9ydCAqIGFzIGFwaSBmcm9tICcuL2FwaUhlbHBlcnMnO1xuaW1wb3J0IHtXYWxsZXR9IGZyb20gJy4vd2FsbGV0JztcbmltcG9ydCB7RXZlbnRUYXJnZXRJbXBsfSBmcm9tICcuL2V2ZW50LXRhcmdldC1pbXBsJztcbmNvbnN0IEtBUyA9IGhlbHBlci5LQVM7XG5leHBvcnQge1Vuc3BlbnRPdXRwdXR9O1xuZXhwb3J0IGNvbnN0IENPTkZJUk1BVElPTl9DT1VOVCA9IDEwO1xuZXhwb3J0IGNvbnN0IENPSU5CQVNFX0NGTV9DT1VOVCA9IDEwMDtcblxubGV0IHNlcSA9IDA7XG5leHBvcnQgY2xhc3MgVXR4b1NldCBleHRlbmRzIEV2ZW50VGFyZ2V0SW1wbCB7XG5cdHV0eG9zOiB7XG5cdFx0Y29uZmlybWVkOiBNYXAgPHN0cmluZywgVW5zcGVudE91dHB1dCA+O1xuXHRcdHBlbmRpbmc6IE1hcCA8c3RyaW5nLCBVbnNwZW50T3V0cHV0ID47XG5cdFx0dXNlZDpNYXAgPHN0cmluZywgVW5zcGVudE91dHB1dCA+O1xuXHR9ID0ge1xuXHRcdGNvbmZpcm1lZDogbmV3IE1hcCgpLFxuXHRcdHBlbmRpbmc6IG5ldyBNYXAoKSxcblx0XHR1c2VkOiBuZXcgTWFwKClcblx0fTtcblxuXHRpblVzZTogc3RyaW5nW10gPSBbXTtcblxuXHR0b3RhbEJhbGFuY2UgPSAwO1xuXG5cdGF2YWlsYWJsZUJhbGFuY2UgPSAwO1xuXHRkZWJ1ZzogYm9vbGVhbiA9IGZhbHNlO1xuXG5cdHV0eG9TdG9yYWdlOiBSZWNvcmQgPCBzdHJpbmcsIEFwaS5VdHhvW10gPiA9IHt9O1xuXG5cdHdhbGxldDogV2FsbGV0O1xuXG5cdGFkZHJlc3Nlc1V0eG9TeW5jU3RhdHVzZXM6IE1hcCA8IHN0cmluZywgYm9vbGVhbiA+ID0gbmV3IE1hcCgpO1xuXG5cdGNvbnN0cnVjdG9yKHdhbGxldDogV2FsbGV0KSB7XG5cdFx0c3VwZXIoKTtcblx0XHR0aGlzLndhbGxldCA9IHdhbGxldDtcblx0fVxuXG5cdC8qKlxuXHQgKiBBZGQgVVRYT3MgdG8gVVRYTyBzZXQuXG5cdCAqIEBwYXJhbSB1dHhvcyBBcnJheSBvZiBVVFhPcyBmcm9tIGthc3BhIEFQSS5cblx0ICogQHBhcmFtIGFkZHJlc3MgQWRkcmVzcyBvZiBVVFhPIG93bmVyLlxuXHQgKi9cblx0YWRkKHV0eG9zOiBBcGkuVXR4b1tdLCBhZGRyZXNzOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG5cdFx0Y29uc3QgdXR4b0lkczogc3RyaW5nW10gPSBbXTtcblx0XHR0aGlzLmxvZ2dlci51dHhvZGVidWcoXCJhZGQgdXR4b3NcIiwgdXR4b3MpXG5cdFx0Y29uc3Qge2JsdWVTY29yZX0gPSB0aGlzLndhbGxldDtcblx0XHR1dHhvcy5mb3JFYWNoKCh1dHhvKSA9PiB7XG5cdFx0XHRjb25zdCB1dHhvSWQgPSB1dHhvLnRyYW5zYWN0aW9uSWQgKyB1dHhvLmluZGV4LnRvU3RyaW5nKCk7XG5cdFx0XHRjb25zdCB1dHhvSW5Vc2UgPSB0aGlzLmluVXNlLmluY2x1ZGVzKHV0eG9JZCk7XG5cdFx0XHRjb25zdCBhbHJlYWR5SGF2ZUl0ID0gISEodGhpcy51dHhvcy5jb25maXJtZWQuaGFzKHV0eG9JZCkgfHwgdGhpcy51dHhvcy5wZW5kaW5nLmhhcyh1dHhvSWQpKTtcblx0XHRcdC8vY29uc29sZS5sb2coXCJ1dHhvLnNjcmlwdFB1YktleVwiLCB1dHhvKVxuXHRcdFx0Ly9jb25zb2xlLmxvZyhcInV0eG9JblVzZVwiLCB7dXR4b0luVXNlLCBhbHJlYWR5SGF2ZUl0fSlcblx0XHRcdGlmICghdXR4b0luVXNlICYmICFhbHJlYWR5SGF2ZUl0IC8qJiYgdXR4by5pc1NwZW5kYWJsZSovICkge1xuXHRcdFx0XHR1dHhvSWRzLnB1c2godXR4b0lkKTtcblx0XHRcdFx0bGV0IGNvbmZpcm1lZCA9IChibHVlU2NvcmUtdXR4by5ibG9ja0RhYVNjb3JlPj0gKHV0eG8uaXNDb2luYmFzZT8gQ09JTkJBU0VfQ0ZNX0NPVU5UIDogQ09ORklSTUFUSU9OX0NPVU5UKSk7XG5cdFx0XHRcdGxldCB1bnNwZW50T3V0cHV0ID0gbmV3IFVuc3BlbnRPdXRwdXQoe1xuXHRcdFx0XHRcdHR4aWQ6IHV0eG8udHJhbnNhY3Rpb25JZCxcblx0XHRcdFx0XHRhZGRyZXNzLFxuXHRcdFx0XHRcdHZvdXQ6IHV0eG8uaW5kZXgsXG5cdFx0XHRcdFx0c2NyaXB0UHViS2V5OiB1dHhvLnNjcmlwdFB1YmxpY0tleS5zY3JpcHRQdWJsaWNLZXksXG5cdFx0XHRcdFx0c2NyaXB0UHVibGljS2V5VmVyc2lvbjogdXR4by5zY3JpcHRQdWJsaWNLZXkudmVyc2lvbixcblx0XHRcdFx0XHRzYXRvc2hpczogK3V0eG8uYW1vdW50LFxuXHRcdFx0XHRcdGJsb2NrRGFhU2NvcmU6IHV0eG8uYmxvY2tEYWFTY29yZSxcblx0XHRcdFx0XHRpc0NvaW5iYXNlOiB1dHhvLmlzQ29pbmJhc2Vcblx0XHRcdFx0fSlcblx0XHRcdFx0Ly9jb25maXJtZWQgPSBjb25maXJtZWQgfHwgdGhpcy5pc091ckNoYW5nZSh1bnNwZW50T3V0cHV0KTtcblx0XHRcdFx0Ly9jb25maXJtZWQgPSAvKmNvbmZpcm1lZCB8fCAqL3RoaXMuaXNPdXJDaGFuZ2UodW5zcGVudE91dHB1dCk7XG5cdFx0XHRcdC8vaWYoY29uZmlybWVkKXtcblx0XHRcdFx0Ly9cdGNvbnNvbGUubG9nKFwiQ2hhbmdlIGFkZHJlc3M6IHVuc3BlbnRPdXRwdXRcIiwgYmx1ZVNjb3JlLXV0eG8uYmxvY2tEYWFTY29yZSwgdW5zcGVudE91dHB1dClcblx0XHRcdFx0Ly99XG5cdFx0XHRcdGxldCBtYXAgPSB0aGlzLnV0eG9zW2NvbmZpcm1lZD8nY29uZmlybWVkJzoncGVuZGluZyddO1xuXHRcdFx0XHRtYXAuc2V0KHV0eG9JZCwgdW5zcGVudE91dHB1dCk7XG5cdFx0XHRcdHRoaXMud2FsbGV0LmFkanVzdEJhbGFuY2UoY29uZmlybWVkLCB1bnNwZW50T3V0cHV0LnNhdG9zaGlzKTtcblx0XHRcdH1lbHNlIGlmKHV0eG9JblVzZSl7XG5cdFx0XHRcdGxldCB1bnNwZW50T3V0cHV0ID0gbmV3IFVuc3BlbnRPdXRwdXQoe1xuXHRcdFx0XHRcdHR4aWQ6IHV0eG8udHJhbnNhY3Rpb25JZCxcblx0XHRcdFx0XHRhZGRyZXNzLFxuXHRcdFx0XHRcdHZvdXQ6IHV0eG8uaW5kZXgsXG5cdFx0XHRcdFx0c2NyaXB0UHViS2V5OiB1dHhvLnNjcmlwdFB1YmxpY0tleS5zY3JpcHRQdWJsaWNLZXksXG5cdFx0XHRcdFx0c2NyaXB0UHVibGljS2V5VmVyc2lvbjogdXR4by5zY3JpcHRQdWJsaWNLZXkudmVyc2lvbixcblx0XHRcdFx0XHRzYXRvc2hpczogK3V0eG8uYW1vdW50LFxuXHRcdFx0XHRcdGJsb2NrRGFhU2NvcmU6IHV0eG8uYmxvY2tEYWFTY29yZSxcblx0XHRcdFx0XHRpc0NvaW5iYXNlOiB1dHhvLmlzQ29pbmJhc2Vcblx0XHRcdFx0fSlcblx0XHRcdFx0dGhpcy51dHhvcy51c2VkLnNldCh1dHhvSWQsIHVuc3BlbnRPdXRwdXQpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdGlmICh1dHhvSWRzLmxlbmd0aCkge1xuXHRcdFx0dGhpcy5sb2dnZXIudXR4b2RlYnVnKGBhZGRpbmcgJHt1dHhvSWRzLmxlbmd0aH0gVVRYTyBlbnRyaWVzOlxcbmAsIHV0eG9JZHMpO1xuXHRcdFx0dGhpcy5sb2dnZXIudXR4byhgaW5jb21pbmcgJHt1dHhvSWRzLmxlbmd0aH0gVVRYTyBlbnRyaWVzYCk7XG5cdFx0fVxuXHRcdHRoaXMud2FsbGV0LnR4U3RvcmUuYWRkQWRkcmVzc1VUWE9zKGFkZHJlc3MsIHV0eG9zKTtcblx0XHRyZXR1cm4gdXR4b0lkcztcblx0fVxuXG5cdGdldCBsb2dnZXIoKXtcblx0XHRyZXR1cm4gdGhpcy53YWxsZXQubG9nZ2VyXG5cdH1cblxuXHRyZW1vdmUodXR4b0lkczogc3RyaW5nW10pOiB2b2lkIHtcblx0XHR0aGlzLnJlbGVhc2UodXR4b0lkcyk7XG5cdFx0bGV0IHtibHVlU2NvcmV9ID0gdGhpcy53YWxsZXQ7XG5cdFx0bGV0IHV0eG87XG5cdFx0dXR4b0lkcy5mb3JFYWNoKGlkPT4ge1xuXHRcdFx0dXR4byA9IHRoaXMudXR4b3MuY29uZmlybWVkLmdldChpZCk7XG5cdFx0XHRpZih1dHhvKXtcblx0XHRcdFx0dGhpcy51dHhvcy5jb25maXJtZWQuZGVsZXRlKGlkKTtcblx0XHRcdFx0dGhpcy53YWxsZXQuYWRqdXN0QmFsYW5jZSh0cnVlLCAtdXR4by5zYXRvc2hpcyk7XG5cdFx0XHR9XG5cblx0XHRcdHV0eG8gPSB0aGlzLnV0eG9zLnBlbmRpbmcuZ2V0KGlkKTtcblx0XHRcdGlmKHV0eG8pe1xuXHRcdFx0XHR0aGlzLnV0eG9zLnBlbmRpbmcuZGVsZXRlKGlkKTtcblx0XHRcdFx0dGhpcy53YWxsZXQuYWRqdXN0QmFsYW5jZShmYWxzZSwgLXV0eG8uc2F0b3NoaXMpO1xuXG5cdFx0XHRcdC8vZHVwbGljYXRlIHR4IGlzc3VlIGhhbmRsaW5nXG5cdFx0XHRcdGlmKHV0eG8uYmxvY2tEYWFTY29yZS1ibHVlU2NvcmUgPCA3MCl7XG5cdFx0XHRcdFx0bGV0IGFwaVVUWE86QXBpLlV0eG8gPSB7XG5cdFx0XHRcdFx0XHR0cmFuc2FjdGlvbklkOiB1dHhvLnR4SWQsXG5cdFx0XHRcdFx0XHRhbW91bnQ6dXR4by5zYXRvc2hpcyxcblx0XHRcdFx0XHRcdHNjcmlwdFB1YmxpY0tleTp7XG5cdFx0XHRcdFx0XHRcdHZlcnNpb246dXR4by5zY3JpcHRQdWJsaWNLZXlWZXJzaW9uLFxuXHRcdFx0XHRcdFx0XHRzY3JpcHRQdWJsaWNLZXk6IHV0eG8uc2NyaXB0UHViS2V5XG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0YmxvY2tEYWFTY29yZTp1dHhvLmJsb2NrRGFhU2NvcmUsXG5cdFx0XHRcdFx0XHRpbmRleDp1dHhvLm91dHB1dEluZGV4LFxuXHRcdFx0XHRcdFx0aXNDb2luYmFzZTp1dHhvLmlzQ29pbmJhc2Vcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dGhpcy53YWxsZXQudHhTdG9yZS5yZW1vdmVQZW5kaW5nVVRYTyhhcGlVVFhPLCB1dHhvLmFkZHJlc3MudG9TdHJpbmcoKSlcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0Y2xlYXJVc2VkKCl7XG5cdFx0dGhpcy5pblVzZSA9IFtdO1xuXHRcdHRoaXMudXR4b3MudXNlZC5jbGVhcigpO1xuXHRcdHRoaXMud2FsbGV0LnVwZGF0ZURlYnVnSW5mbygpO1xuXHRcdHRoaXMud2FsbGV0LmVtaXRDYWNoZSgpO1xuXHR9XG5cblx0Y2xlYXJNaXNzaW5nKCk6Ym9vbGVhbntcblx0XHRjb25zdCB7Y29uZmlybWVkLCBwZW5kaW5nLCB1c2VkfSA9IHRoaXMudXR4b3M7XG5cdFx0bGV0IG1pc3NpbmcgPSB0aGlzLmluVXNlLmZpbHRlcih1dHhvSWQ9Pntcblx0XHRcdHJldHVybiAhKGNvbmZpcm1lZC5oYXModXR4b0lkKSB8fCBwZW5kaW5nLmhhcyh1dHhvSWQpIHx8IHVzZWQuaGFzKHV0eG9JZCkpXG5cdFx0fSlcblx0XHRpZighbWlzc2luZy5sZW5ndGgpXG5cdFx0XHRyZXR1cm4gZmFsc2Vcblx0XHR0aGlzLnJlbGVhc2UobWlzc2luZyk7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuXHRyZWxlYXNlKHV0eG9JZHNUb0VuYWJsZTogc3RyaW5nW10pOiB2b2lkIHtcblx0XHQvLyBhc3NpZ25zIG5ldyBhcnJheSB3aXRob3V0IGFueSB1dHhvSWRzVG9FbmFibGVcblx0XHR0aGlzLmluVXNlID0gdGhpcy5pblVzZS5maWx0ZXIoKHV0eG9JZCkgPT4gIXV0eG9JZHNUb0VuYWJsZS5pbmNsdWRlcyh1dHhvSWQpKTtcblx0XHR1dHhvSWRzVG9FbmFibGUuZm9yRWFjaCh1dHhvSWQ9Pntcblx0XHRcdHRoaXMudXR4b3MudXNlZC5kZWxldGUodXR4b0lkKTtcblx0XHR9KVxuXHRcdHRoaXMud2FsbGV0LnVwZGF0ZURlYnVnSW5mbygpO1xuXHRcdHRoaXMud2FsbGV0LmVtaXRDYWNoZSgpO1xuXHRcdC8vIHRoaXMudXBkYXRlVXR4b0JhbGFuY2UoKTtcblx0fVxuXG5cdHVwZGF0ZVV0eG9CYWxhbmNlKCk6IHZvaWQge1xuXHRcdGNvbnN0IHtibHVlU2NvcmV9ID0gdGhpcy53YWxsZXQ7XG5cdFx0Wy4uLnRoaXMudXR4b3MucGVuZGluZy52YWx1ZXMoKV0uZm9yRWFjaCh1dHhvPT57XG5cdFx0XHRpZihibHVlU2NvcmUtdXR4by5ibG9ja0RhYVNjb3JlIDwgKHV0eG8uaXNDb2luYmFzZT8gQ09JTkJBU0VfQ0ZNX0NPVU5UIDogQ09ORklSTUFUSU9OX0NPVU5UKSlcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR0aGlzLnV0eG9zLnBlbmRpbmcuZGVsZXRlKHV0eG8udHhJZCt1dHhvLm91dHB1dEluZGV4KTtcblx0XHRcdHRoaXMud2FsbGV0LmFkanVzdEJhbGFuY2UoZmFsc2UsIC11dHhvLnNhdG9zaGlzLCBmYWxzZSk7XG5cdFx0XHR0aGlzLnV0eG9zLmNvbmZpcm1lZC5zZXQodXR4by50eElkK3V0eG8ub3V0cHV0SW5kZXgsIHV0eG8pO1xuXHRcdFx0dGhpcy53YWxsZXQuYWRqdXN0QmFsYW5jZSh0cnVlLCB1dHhvLnNhdG9zaGlzKTtcblx0XHR9KVxuXHR9XG5cblx0Y2xlYXIoKTogdm9pZCB7XG5cdFx0dGhpcy51dHhvcy5jb25maXJtZWQuY2xlYXIoKTtcblx0XHR0aGlzLnV0eG9zLnBlbmRpbmcuY2xlYXIoKTtcblx0XHR0aGlzLnV0eG9zLnVzZWQuY2xlYXIoKTtcblx0XHR0aGlzLmluVXNlID0gW107XG5cdFx0dGhpcy5hdmFpbGFibGVCYWxhbmNlID0gMDtcblx0XHR0aGlzLnV0eG9TdG9yYWdlID0ge307XG5cdFx0dGhpcy5sb2dnZXIuaW5mbygnVVRYTyBzZXQgY2xlYXJlZC4nKTtcblx0fVxuXG5cdHVwZGF0ZVVzZWQodXR4b3M6VW5zcGVudE91dHB1dFtdKXtcblx0XHR1dHhvcy5mb3JFYWNoKHV0eG89Pntcblx0XHRcdHRoaXMuaW5Vc2UucHVzaCh1dHhvLmlkKTtcblx0XHRcdHRoaXMudXR4b3MudXNlZC5zZXQodXR4by50eElkLCB1dHhvKTtcblx0XHR9KVxuXHRcdHRoaXMud2FsbGV0LnVwZGF0ZURlYnVnSW5mbygpO1xuXHRcdHRoaXMud2FsbGV0LmVtaXRDYWNoZSgpO1xuXHR9XG5cblx0LyoqXG5cdCAqIE5haXZlbHkgc2VsZWN0IFVUWE9zLlxuXHQgKiBAcGFyYW0gdHhBbW91bnQgUHJvdmlkZSB0aGUgYW1vdW50IHRoYXQgdGhlIFVUWE9zIHNob3VsZCBjb3Zlci5cblx0ICogQHRocm93cyBFcnJvciBtZXNzYWdlIGlmIHRoZSBVVFhPcyBjYW4ndCBjb3ZlciB0aGUgYHR4QW1vdW50YFxuXHQgKi9cblx0c2VsZWN0VXR4b3ModHhBbW91bnQ6IG51bWJlcik6IHtcblx0XHR1dHhvSWRzOiBzdHJpbmdbXTtcblx0XHR1dHhvczogVW5zcGVudE91dHB1dFtdLFxuXHRcdG1hc3M6IG51bWJlclxuXHR9IHtcblx0XHRjb25zdCB1dHhvczogVW5zcGVudE91dHB1dFtdID0gW107XG5cdFx0Y29uc3QgdXR4b0lkczogc3RyaW5nW10gPSBbXTtcblx0XHRsZXQgdG90YWxWYWwgPSAwO1xuXHRcdGxldCBsaXN0ID0gWy4uLnRoaXMudXR4b3MuY29uZmlybWVkLnZhbHVlcygpXTtcblxuXHRcdGxpc3QgPSBsaXN0LmZpbHRlcigodXR4bykgPT4ge1xuXHRcdFx0cmV0dXJuICF0aGlzLmluVXNlLmluY2x1ZGVzKHV0eG8uaWQpO1xuXHRcdH0pO1xuXG5cdFx0bGlzdC5zb3J0KChhOiBVbnNwZW50T3V0cHV0LCBiOiBVbnNwZW50T3V0cHV0KTogbnVtYmVyID0+IHtcblx0XHRcdHJldHVybiBhLmJsb2NrRGFhU2NvcmUgLSBiLmJsb2NrRGFhU2NvcmUgfHwgYi5zYXRvc2hpcyAtIGEuc2F0b3NoaXMgfHwgYS50eElkLmxvY2FsZUNvbXBhcmUoYi50eElkKSB8fCBhLm91dHB1dEluZGV4IC0gYi5vdXRwdXRJbmRleDtcblx0XHR9KVxuXHRcdGxldCBtYXNzID0gMDtcblx0XHRmb3IgKGNvbnN0IHV0eG8gb2YgbGlzdCkge1xuXHRcdFx0Ly9jb25zb2xlLmxvZyhcImluZm9cIixgVVRYTyBJRDogJHt1dHhvSWR9ICAsIFVUWE86ICR7dXR4b31gKTtcblx0XHRcdC8vaWYgKCF0aGlzLmluVXNlLmluY2x1ZGVzKHV0eG9JZCkpIHtcblx0XHRcdFx0dXR4b0lkcy5wdXNoKHV0eG8uaWQpO1xuXHRcdFx0XHR1dHhvcy5wdXNoKHV0eG8pO1xuXHRcdFx0XHRtYXNzICs9IHV0eG8ubWFzcztcblx0XHRcdFx0dG90YWxWYWwgKz0gdXR4by5zYXRvc2hpcztcblx0XHRcdC8vfVxuXHRcdFx0aWYgKHRvdGFsVmFsID49IHR4QW1vdW50KSBicmVhaztcblx0XHR9XG5cdFx0aWYgKHRvdGFsVmFsIDwgdHhBbW91bnQpXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoYEluc3VmZmljaWVudCBiYWxhbmNlIC0gbmVlZDogJHtLQVModHhBbW91bnQpfSBLQVMsIGF2YWlsYWJsZTogJHtLQVModG90YWxWYWwpfSBLQVNgKTtcblxuXHRcdHJldHVybiB7XG5cdFx0XHR1dHhvSWRzLFxuXHRcdFx0dXR4b3MsXG5cdFx0XHRtYXNzXG5cdFx0fTtcblx0fVxuXG5cdC8qKlxuXHQgKiBOYWl2ZWx5IGNvbGxlY3QgVVRYT3MuXG5cdCAqIEBwYXJhbSBtYXhDb3VudCBQcm92aWRlIHRoZSBtYXggVVRYT3MgY291bnQuXG5cdCAqL1xuXHRjb2xsZWN0VXR4b3MobWF4Q291bnQ6IG51bWJlciA9IDEwMDAwKToge1xuXHRcdHV0eG9JZHM6IHN0cmluZ1tdO1xuXHRcdHV0eG9zOiBVbnNwZW50T3V0cHV0W10sXG5cdFx0YW1vdW50OiBudW1iZXIsXG5cdFx0bWFzczogbnVtYmVyXG5cdH0ge1xuXHRcdGNvbnN0IHV0eG9zOiBVbnNwZW50T3V0cHV0W10gPSBbXTtcblx0XHRjb25zdCB1dHhvSWRzOiBzdHJpbmdbXSA9IFtdO1xuXHRcdGxldCB0b3RhbFZhbCA9IDA7XG5cdFx0bGV0IGxpc3QgPSBbLi4udGhpcy51dHhvcy5jb25maXJtZWQudmFsdWVzKCldO1xuXG5cdFx0bGlzdCA9IGxpc3QuZmlsdGVyKCh1dHhvKSA9PiB7XG5cdFx0XHRyZXR1cm4gIXRoaXMuaW5Vc2UuaW5jbHVkZXModXR4by5pZCk7XG5cdFx0fSk7XG5cblx0XHRsaXN0LnNvcnQoKGE6IFVuc3BlbnRPdXRwdXQsIGI6IFVuc3BlbnRPdXRwdXQpOiBudW1iZXIgPT4ge1xuXHRcdFx0cmV0dXJuIGEuYmxvY2tEYWFTY29yZSAtIGIuYmxvY2tEYWFTY29yZSB8fCBiLnNhdG9zaGlzIC0gYS5zYXRvc2hpcyB8fCBhLnR4SWQubG9jYWxlQ29tcGFyZShiLnR4SWQpIHx8IGEub3V0cHV0SW5kZXggLSBiLm91dHB1dEluZGV4O1xuXHRcdH0pXG5cdFx0bGV0IG1heE1hc3MgPSBXYWxsZXQuTWF4TWFzc1VUWE9zO1xuXHRcdFxuXHRcdGxldCBtYXNzID0gMDtcblx0XHRmb3IgKGNvbnN0IHV0eG8gb2YgbGlzdCkge1xuXHRcdFx0aWYgKHV0eG9zLmxlbmd0aCA+PSBtYXhDb3VudCB8fCBtYXNzK3V0eG8ubWFzcyA+PSBtYXhNYXNzKVxuXHRcdFx0XHRicmVhaztcblx0XHRcdHV0eG9JZHMucHVzaCh1dHhvLmlkKTtcblx0XHRcdHV0eG9zLnB1c2godXR4byk7XG5cdFx0XHR0b3RhbFZhbCArPSB1dHhvLnNhdG9zaGlzO1xuXHRcdFx0bWFzcyArPSB1dHhvLm1hc3M7XG5cdFx0fVxuXHRcdC8vY29uc29sZS5sb2coXCJtYXhNYXNzOlwiK21heE1hc3MsIFwibWFzczpcIittYXNzKVxuXHRcdHJldHVybiB7XG5cdFx0XHR1dHhvSWRzLFxuXHRcdFx0dXR4b3MsXG5cdFx0XHRhbW91bnQ6IHRvdGFsVmFsLFxuXHRcdFx0bWFzc1xuXHRcdH07XG5cdH1cblxuXHRhc3luYyBzeW5jQWRkcmVzc2VzVXR4b3MoYWRkcmVzc2VzOiBzdHJpbmdbXSkge1xuXHRcdGNvbnN0IG5ld0FkZHJlc3NlcyA9IGFkZHJlc3Nlcy5tYXAoYWRkcmVzcyA9PiB7XG5cdFx0XHRpZiAodGhpcy5hZGRyZXNzZXNVdHhvU3luY1N0YXR1c2VzLmhhcyhhZGRyZXNzKSlcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR0aGlzLmFkZHJlc3Nlc1V0eG9TeW5jU3RhdHVzZXMuc2V0KGFkZHJlc3MsIGZhbHNlKTtcblx0XHRcdHJldHVybiBhZGRyZXNzO1xuXHRcdH0pLmZpbHRlcihhZGRyZXNzID0+IGFkZHJlc3MpIGFzIHN0cmluZ1tdO1xuXG5cdFx0Ly9pbiBzeW5jIHByb2Nlc3MgYWRkcmVzc0Rpc2NvdmVyeSBjYWxscyBmaW5kVXR4b3Ncblx0XHRpZiAoIW5ld0FkZHJlc3Nlcy5sZW5ndGggfHwgKHRoaXMud2FsbGV0LnN5bmNJblByb2dncmVzcyAmJiAhdGhpcy53YWxsZXQub3B0aW9ucy5kaXNhYmxlQWRkcmVzc0Rlcml2YXRpb24pKVxuXHRcdFx0cmV0dXJuXG5cblx0XHRhd2FpdCB0aGlzLndhbGxldC5maW5kVXR4b3MobmV3QWRkcmVzc2VzKTtcblxuXHRcdGlmKCF0aGlzLndhbGxldC5zeW5jT25jZSlcblx0XHRcdGF3YWl0IHRoaXMudXR4b1N1YnNjcmliZSgpO1xuXHR9XG5cblx0YXN5bmMgdXR4b1N1YnNjcmliZSgpOiBQcm9taXNlIDwgc3RyaW5nW10gPiB7XG5cdFx0bGV0IGFkZHJlc3Nlczogc3RyaW5nW10gPSBbXTtcblx0XHR0aGlzLmFkZHJlc3Nlc1V0eG9TeW5jU3RhdHVzZXMuZm9yRWFjaCgoc2VudCwgYWRkcmVzcykgPT4ge1xuXHRcdFx0Ly9pZihzZW50KVxuXHRcdFx0Ly8gIHJldHVyblxuXG5cdFx0XHQvLyAgISEhRklYTUUgcHJldmVudCBtdWx0aXBsZSBhZGRyZXNzIHN1YnNjcmlwdGlvbnNcblx0XHRcdC8vaWYoIXRoaXMuYWRkcmVzc2VzVXR4b1N5bmNTdGF0dXNlcy5nZXQoYWRkcmVzcykpIHtcblx0XHRcdC8vdGhpcy5hZGRyZXNzZXNVdHhvU3luY1N0YXR1c2VzLnNldChhZGRyZXNzLCB0cnVlKTtcblx0XHRcdGFkZHJlc3Nlcy5wdXNoKGFkZHJlc3MpO1xuXHRcdFx0Ly99XG5cdFx0fSk7XG5cblx0XHRpZiAoIWFkZHJlc3Nlcy5sZW5ndGgpXG5cdFx0XHRyZXR1cm4gYWRkcmVzc2VzO1xuXHRcdC8vY29uc29sZS5sb2coYFske3RoaXMud2FsbGV0Lm5ldHdvcmt9XSAhISEgKysrKysrKysrKysrKysrIFNVQlNDUklCSU5HIFRPIEFERFJFU1NFUyA6KVxcbmAsYWRkcmVzc2VzKTtcblx0XHRsZXQgdXR4b0NoYW5nZWRSZXMgPSBhd2FpdCB0aGlzLndhbGxldC5hcGkuc3Vic2NyaWJlVXR4b3NDaGFuZ2VkKGFkZHJlc3NlcywgdGhpcy5vblV0eG9zQ2hhbmdlZC5iaW5kKHRoaXMpKVxuXHRcdFx0LmNhdGNoKChlcnJvcjogUlBDLkVycm9yKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKGBbJHt0aGlzLndhbGxldC5uZXR3b3JrfV0gUlBDIEVSUk9SIGluIHV4dG9TeW5jISB3aGlsZSByZWdpc3RlcmluZyBhZGRyZXNzZXM6YCwgZXJyb3IsIGFkZHJlc3Nlcyk7XG5cdFx0XHRcdGFkZHJlc3Nlcy5tYXAoYWRkcmVzcyA9PiB7XG5cdFx0XHRcdFx0dGhpcy5hZGRyZXNzZXNVdHhvU3luY1N0YXR1c2VzLnNldChhZGRyZXNzLCBmYWxzZSk7XG5cdFx0XHRcdH0pXG5cdFx0XHR9KVxuXG5cdFx0Ly9jb25zb2xlLmxvZyhcInV0eG9TeW5jOnV0eG9DaGFuZ2VkUmVzOlwiLCB1dHhvQ2hhbmdlZFJlcywgXCJcXG4gdXR4b1N5bmMgYWRkcmVzc2VzOlwiLCBhZGRyZXNzZXMpXG5cdFx0cmV0dXJuIGFkZHJlc3Nlcztcblx0fVxuXG5cdG9uVXR4b3NDaGFuZ2VkKGFkZGVkOiBNYXAgPCBzdHJpbmcsIEFwaS5VdHhvW10gPiAsIHJlbW92ZWQ6IE1hcCA8IHN0cmluZywgUlBDLk91dHBvaW50W10gPiApIHtcblx0XHQvLyBjb25zb2xlLmxvZyhcIm9uVXR4b3NDaGFuZ2VkOnJlc1wiLCBhZGRlZCwgcmVtb3ZlZClcblx0XHRhZGRlZC5mb3JFYWNoKCh1dHhvcywgYWRkcmVzcykgPT4ge1xuXHRcdFx0Ly90aGlzLmxvZ2dlci5sb2coJ2luZm8nLCBgJHthZGRyZXNzfTogJHt1dHhvcy5sZW5ndGh9IHV0eG9zIGZvdW5kLis9Kz0rPSs9Kz0rPSsrKysrPT09PT09PSs9PT0rPT09PSs9PT09Kz09PT0rYCk7XG5cdFx0XHRpZiAoIXV0eG9zLmxlbmd0aClcblx0XHRcdFx0cmV0dXJuXG5cblx0XHRcdGlmICghdGhpcy51dHhvU3RvcmFnZVthZGRyZXNzXSkge1xuXHRcdFx0XHR0aGlzLnV0eG9TdG9yYWdlW2FkZHJlc3NdID0gdXR4b3M7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRsZXQgdHhpZDJVdHhvOiBSZWNvcmQgPCBzdHJpbmcsIEFwaS5VdHhvID4gPSB7fTtcblx0XHRcdFx0dXR4b3MuZm9yRWFjaCh1dHhvID0+IHtcblx0XHRcdFx0XHR0eGlkMlV0eG9bdXR4by50cmFuc2FjdGlvbklkICsgdXR4by5pbmRleF0gPSB1dHhvO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHRsZXQgb2xkVXR4b3MgPSB0aGlzLnV0eG9TdG9yYWdlW2FkZHJlc3NdLmZpbHRlcih1dHhvID0+IHtcblx0XHRcdFx0XHRyZXR1cm4gIXR4aWQyVXR4b1t1dHhvLnRyYW5zYWN0aW9uSWQgKyB1dHhvLmluZGV4XVxuXHRcdFx0XHR9KTtcblx0XHRcdFx0dGhpcy51dHhvU3RvcmFnZVthZGRyZXNzXSA9IFsuLi5vbGRVdHhvcywgLi4udXR4b3NdO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5hZGQodXR4b3MsIGFkZHJlc3MpO1xuXHRcdH0pXG5cblx0XHR0aGlzLndhbGxldC50eFN0b3JlLmFkZEZyb21VVFhPcyhhZGRlZCk7XG5cblx0XHRsZXQgdXR4b0lkczogc3RyaW5nW10gPSBbXTtcblx0XHRyZW1vdmVkLmZvckVhY2goKHV0eG9zLCBhZGRyZXNzKSA9PiB7XG5cdFx0XHRsZXQgdHhpZDJPdXRwb2ludDogUmVjb3JkIDwgc3RyaW5nLCBSUEMuT3V0cG9pbnQgPiA9IHt9O1xuXHRcdFx0dXR4b3MuZm9yRWFjaCh1dHhvID0+IHtcblx0XHRcdFx0dHhpZDJPdXRwb2ludFt1dHhvLnRyYW5zYWN0aW9uSWQgKyB1dHhvLmluZGV4XSA9IHV0eG87XG5cdFx0XHRcdHV0eG9JZHMucHVzaCh1dHhvLnRyYW5zYWN0aW9uSWQgKyB1dHhvLmluZGV4KTtcblx0XHRcdH0pXG5cdFx0XHRpZiAoIXRoaXMudXR4b1N0b3JhZ2VbYWRkcmVzc10pXG5cdFx0XHRcdHJldHVyblxuXHRcdFx0dGhpcy51dHhvU3RvcmFnZVthZGRyZXNzXSA9IHRoaXMudXR4b1N0b3JhZ2VbYWRkcmVzc10uZmlsdGVyKHV0eG8gPT4ge1xuXHRcdFx0XHRyZXR1cm4gIXR4aWQyT3V0cG9pbnRbdXR4by50cmFuc2FjdGlvbklkICsgdXR4by5pbmRleF1cblx0XHRcdH0pO1xuXHRcdH0pXG5cblx0XHRpZiAodXR4b0lkcy5sZW5ndGgpXG5cdFx0XHR0aGlzLnJlbW92ZSh1dHhvSWRzKTtcblxuXHRcdGNvbnN0IGlzQWN0aXZpdHlPblJlY2VpdmVBZGRyID1cblx0XHRcdHRoaXMudXR4b1N0b3JhZ2VbdGhpcy53YWxsZXQucmVjZWl2ZUFkZHJlc3NdICE9PSB1bmRlZmluZWQ7XG5cdFx0aWYgKGlzQWN0aXZpdHlPblJlY2VpdmVBZGRyKVxuXHRcdFx0dGhpcy53YWxsZXQuYWRkcmVzc01hbmFnZXIucmVjZWl2ZUFkZHJlc3MubmV4dCgpO1xuXG5cdFx0Ly90aGlzLnVwZGF0ZVV0eG9CYWxhbmNlKCk7XG5cdFx0dGhpcy53YWxsZXQuZW1pdChcInV0eG8tY2hhbmdlXCIsIHthZGRlZCwgcmVtb3ZlZH0pO1xuXHR9XG5cblx0aXNPdXIodXR4bzpVbnNwZW50T3V0cHV0KTogYm9vbGVhbntcblx0XHRyZXR1cm4gKCEhdGhpcy53YWxsZXQudHJhbnNhY3Rpb25zW3V0eG8udHhJZF0pIHx8IHRoaXMuaXNPdXJDaGFuZ2UodXR4bylcblx0fVxuXG5cdGlzT3VyQ2hhbmdlKHV0eG86VW5zcGVudE91dHB1dCk6Ym9vbGVhbntcblx0XHRyZXR1cm4gdGhpcy53YWxsZXQuYWRkcmVzc01hbmFnZXIuaXNPdXJDaGFuZ2UoU3RyaW5nKHV0eG8uYWRkcmVzcykpXG5cdH1cblx0Z2V0IGNvdW50KCk6bnVtYmVye1xuXHRcdHJldHVybiB0aGlzLnV0eG9zLmNvbmZpcm1lZC5zaXplICsgdGhpcy51dHhvcy5wZW5kaW5nLnNpemU7XG5cdH1cblxuXHRnZXQgY29uZmlybWVkQ291bnQoKTpudW1iZXJ7XG5cdFx0cmV0dXJuIHRoaXMudXR4b3MuY29uZmlybWVkLnNpemVcblx0fVxufVxuIl19