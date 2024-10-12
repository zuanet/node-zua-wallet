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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
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
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Wallet = exports.COINBASE_CFM_COUNT = exports.CONFIRMATION_COUNT = exports.COMPOUND_UTXO_MAX_COUNT = exports.zuacore = void 0;
const Mnemonic = require('bitcore-mnemonic');
const zuacore = __importStar(require("@zua/core-lib"));
exports.zuacore = zuacore;
const helper = __importStar(require("../utils/helper"));
__exportStar(require("./storage"), exports);
__exportStar(require("./error"), exports);
const crypto_1 = require("./crypto");
const ZUA = helper.ZUA;
const logger_1 = require("../utils/logger");
const address_manager_1 = require("./address-manager");
const utxo_1 = require("./utxo");
Object.defineProperty(exports, "CONFIRMATION_COUNT", { enumerable: true, get: function () { return utxo_1.CONFIRMATION_COUNT; } });
Object.defineProperty(exports, "COINBASE_CFM_COUNT", { enumerable: true, get: function () { return utxo_1.COINBASE_CFM_COUNT; } });
const tx_store_1 = require("./tx-store");
const cache_store_1 = require("./cache-store");
const api_1 = require("./api");
const config_json_1 = require("../config.json");
const event_target_impl_1 = require("./event-target-impl");
const BALANCE_CONFIRMED = Symbol();
const BALANCE_PENDING = Symbol();
const BALANCE_TOTAL = Symbol();
const COMPOUND_UTXO_MAX_COUNT = 500;
exports.COMPOUND_UTXO_MAX_COUNT = COMPOUND_UTXO_MAX_COUNT;
const SompiPerZua = 100000000;
// MaxSompi is the maximum transaction amount allowed in sompi.
const MaxSompi = 21000000 * SompiPerZua;
/** Class representing an HDWallet with derivable child addresses */
class Wallet extends event_target_impl_1.EventTargetImpl {
    /** Create a wallet.
     * @param walletSave (optional)
     * @param walletSave.privKey Saved wallet's private key.
     * @param walletSave.seedPhrase Saved wallet's seed phrase.
     */
    constructor(privKey, seedPhrase, networkOptions, options = {}) {
        super();
        this.disableBalanceNotifications = false;
        /**
         * Current network.
         */
        this.network = 'zua';
        /**
         * Default fee
         */
        this.defaultFee = 1; //per byte
        this.subnetworkId = "0000000000000000000000000000000000000000"; //hex string
        this.last_tx_ = '';
        /**
         * Current API endpoint for selected network
         */
        this.apiEndpoint = 'localhost:16210';
        this.blueScore = -1;
        this.syncVirtualSelectedParentBlueScoreStarted = false;
        this.syncInProggress = false;
        /* eslint-disable */
        this.pendingInfo = {
            transactions: {},
            get amount() {
                const transactions = Object.values(this.transactions);
                if (transactions.length === 0)
                    return 0;
                return transactions.reduce((prev, cur) => prev + cur.amount + cur.fee, 0);
            },
            add(id, tx) {
                this.transactions[id] = tx;
            }
        };
        /**
         * Transactions sorted by hash.
         */
        this.transactions = {};
        /**
         * Transaction arrays keyed by address.
         */
        this.transactionsStorage = {};
        this[_a] = 0;
        this[_b] = 0;
        this[_c] = 0;
        /**
         * Emit wallet balance.
         */
        this.lastBalanceNotification = { available: 0, pending: 0 };
        this.debugInfo = { inUseUTXOs: { satoshis: 0, count: 0 } };
        this.lastAddressNotification = {};
        //UTXOsPollingStarted:boolean = false;
        this.emitedUTXOs = new Set();
        this.loggerLevel = 0;
        this.logger = logger_1.CreateLogger('ZuaWallet');
        this.api = new api_1.ZuaAPI();
        //@ts-ignore
        //postMessage({error:new ApiError("test") })
        let defaultOpt = {
            skipSyncBalance: false,
            syncOnce: false,
            addressDiscoveryExtent: 150,
            logLevel: 'info',
            disableAddressDerivation: false,
            checkGRPCFlags: false,
            minimumRelayTransactionFee: 1000,
            updateTxTimes: true
        };
        // console.log("CREATING WALLET FOR NETWORK", this.network);
        this.options = Object.assign(Object.assign({}, defaultOpt), options);
        //this.options.addressDiscoveryExtent = 500;
        this.setLogLevel(this.options.logLevel);
        this.network = networkOptions.network;
        this.defaultFee = networkOptions.defaultFee || this.defaultFee;
        if (networkOptions.rpc)
            this.api.setRPC(networkOptions.rpc);
        if (privKey && seedPhrase) {
            this.HDWallet = new zuacore.HDPrivateKey(privKey);
            this.mnemonic = seedPhrase;
        }
        else {
            const temp = new Mnemonic(Mnemonic.Words.ENGLISH);
            this.mnemonic = temp.toString();
            this.HDWallet = new zuacore.HDPrivateKey(temp.toHDPrivateKey().toString());
        }
        this.uid = this.createUID();
        this.utxoSet = new utxo_1.UtxoSet(this);
        this.txStore = new tx_store_1.TXStore(this);
        this.cacheStore = new cache_store_1.CacheStore(this);
        //this.utxoSet.on("balance-update", this.updateBalance.bind(this));
        this.addressManager = new address_manager_1.AddressManager(this.HDWallet, this.network);
        if (this.options.disableAddressDerivation)
            this.addressManager.receiveAddress.next();
        //this.initAddressManager();
        //this.sync(this.options.syncOnce);
        this.connectSignal = helper.Deferred();
        this.api.on("connect", () => {
            this.onApiConnect();
        });
        this.api.on("disconnect", () => {
            this.onApiDisconnect();
        });
    }
    static ZUA(v) {
        return ZUA(v);
    }
    static initRuntime() {
        return zuacore.initRuntime();
    }
    /**
     * Converts a mnemonic to a new wallet.
     * @param seedPhrase The 12 word seed phrase.
     * @returns new Wallet
     */
    static fromMnemonic(seedPhrase, networkOptions, options = {}) {
        if (!networkOptions || !networkOptions.network)
            throw new Error(`fromMnemonic(seedPhrase,networkOptions): missing network argument`);
        const privKey = new Mnemonic(seedPhrase.trim()).toHDPrivateKey().toString();
        const wallet = new this(privKey, seedPhrase, networkOptions, options);
        return wallet;
    }
    /**
     * Creates a new Wallet from encrypted wallet data.
     * @param password the password the user encrypted their seed phrase with
     * @param encryptedMnemonic the encrypted seed phrase from local storage
     * @throws Will throw "Incorrect password" if password is wrong
     */
    static import(password, encryptedMnemonic, networkOptions, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const decrypted = yield crypto_1.Crypto.decrypt(password, encryptedMnemonic);
            const savedWallet = JSON.parse(decrypted);
            const myWallet = new this(savedWallet.privKey, savedWallet.seedPhrase, networkOptions, options);
            return myWallet;
        });
    }
    get balance() {
        return {
            available: this[BALANCE_CONFIRMED],
            pending: this[BALANCE_PENDING],
            total: this[BALANCE_CONFIRMED] + this[BALANCE_PENDING]
        };
    }
    /**
     * Set by addressManager
     */
    get receiveAddress() {
        return this.addressManager.receiveAddress.current.address;
    }
    get changeAddress() {
        return this.addressManager.changeAddress.current.address;
    }
    createUID() {
        const { privateKey } = this.HDWallet.deriveChild(`m/44'/972/0'/1'/0'`);
        let address = privateKey.toAddress(this.network).toString().split(":")[1];
        return helper.createHash(address);
    }
    onApiConnect() {
        return __awaiter(this, void 0, void 0, function* () {
            this.connectSignal.resolve();
            let { connected } = this;
            this.connected = true;
            this.logger.info("gRPC connected");
            this.emit("api-connect");
            if (this.syncSignal && connected !== undefined) { //if sync was called
                this.logger.info("starting wallet re-sync ...");
                yield this.sync(this.syncOnce);
            }
        });
    }
    onApiDisconnect() {
        this.connected = false;
        this.syncVirtualSelectedParentBlueScoreStarted = false;
        this.logger.verbose("gRPC disconnected");
        this.emit("api-disconnect");
    }
    update(syncOnce = true) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.sync(syncOnce);
        });
    }
    waitOrSync() {
        if (this.syncSignal)
            return this.syncSignal;
        return this.sync();
    }
    sync(syncOnce = undefined) {
        return __awaiter(this, void 0, void 0, function* () {
            this.syncSignal = helper.Deferred();
            yield this.connectSignal;
            if (syncOnce === undefined)
                syncOnce = this.options.syncOnce;
            syncOnce = !!syncOnce;
            this.syncInProggress = true;
            this.emit("sync-start");
            yield this.txStore.restore();
            yield this.cacheStore.restore();
            const ts0 = Date.now();
            this.logger.info(`sync ... starting wallet sync`); // ${syncOnce?'(monitoring disabled)':''}`);
            //this.logger.info(`sync ............ started, syncOnce:${syncOnce}`)
            //if last time syncOnce was OFF we have subscriptions to utxo-change
            if (this.syncOnce === false && syncOnce) {
                throw new Error("Wallet sync process already running.");
            }
            this.syncOnce = syncOnce;
            this.initAddressManager();
            yield this.initBlueScoreSync(syncOnce)
                .catch(e => {
                this.logger.info("syncVirtualSelectedParentBlueScore:error", e);
            });
            if (this.options.disableAddressDerivation) {
                this.logger.warn('sync ... running with address discovery disabled');
                this.utxoSet.syncAddressesUtxos([this.receiveAddress]);
            }
            else {
                yield this.addressDiscovery(this.options.addressDiscoveryExtent)
                    .catch(e => {
                    this.logger.info("addressDiscovery:error", e);
                });
            }
            this.syncInProggress = false;
            if (!syncOnce)
                yield this.utxoSet.utxoSubscribe();
            const ts1 = Date.now();
            const delta = ((ts1 - ts0) / 1000).toFixed(1);
            this.logger.info(`sync ... ${this.utxoSet.count} UTXO entries found`);
            this.logger.info(`sync ... indexed ${this.addressManager.receiveAddress.counter} receive and ${this.addressManager.changeAddress.counter} change addresses`);
            this.logger.info(`sync ... finished (sync done in ${delta} seconds)`);
            this.emit("sync-finish");
            const { available, pending, total } = this.balance;
            this.emit("ready", {
                available, pending, total,
                confirmedUtxosCount: this.utxoSet.confirmedCount
            });
            this.emitBalance();
            this.emitAddress();
            this.txStore.emitTxs();
            this.syncSignal.resolve();
            if (!this.utxoSet.clearMissing())
                this.updateDebugInfo();
        });
    }
    getVirtualSelectedParentBlueScore() {
        return this.api.getVirtualSelectedParentBlueScore();
    }
    getVirtualDaaScore() {
        return this.api.getVirtualDaaScore();
    }
    initBlueScoreSync(once = false) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.syncVirtualSelectedParentBlueScoreStarted)
                return;
            this.syncVirtualSelectedParentBlueScoreStarted = true;
            let r = yield this.getVirtualDaaScore();
            let { virtualDaaScore: blueScore } = r;
            console.log("getVirtualSelectedParentBlueScore :result", r);
            this.blueScore = blueScore;
            this.emit("blue-score-changed", { blueScore });
            this.utxoSet.updateUtxoBalance();
            if (once) {
                this.syncVirtualSelectedParentBlueScoreStarted = false;
                return;
            }
            this.api.subscribeVirtualDaaScoreChanged((result) => {
                let { virtualDaaScore } = result;
                //console.log("subscribeVirtualSelectedParentBlueScoreChanged:result", result)
                this.blueScore = virtualDaaScore;
                this.emit("blue-score-changed", {
                    blueScore: virtualDaaScore
                });
                this.utxoSet.updateUtxoBalance();
            }).then(r => {
                console.log("subscribeVirtualDaaScoreChanged:responce", r);
            }, e => {
                console.log("subscribeVirtualDaaScoreChanged:error", e);
            });
        });
    }
    initAddressManager() {
        if (this.addressManagerInitialized)
            return;
        this.addressManagerInitialized = true;
        this.addressManager.on("new-address", detail => {
            if (!this.syncInProggress) {
                this.emitAddress();
            }
            //console.log("new-address", detail)
            if (this.options.skipSyncBalance)
                return;
            //console.log("new-address:detail", detail)
            const { address, type } = detail;
            this.utxoSet.syncAddressesUtxos([address]);
        });
        if (!this.receiveAddress) {
            this.addressManager.receiveAddress.next();
        }
    }
    startUpdatingTransactions(version = undefined) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.txStore.startUpdatingTransactions(version);
        });
    }
    /**
     * Set rpc provider
     * @param rpc
     */
    setRPC(rpc) {
        this.api.setRPC(rpc);
    }
    /*
    setStorageType(type:StorageType){
        this.storage.setType(type);
    }
    setStorageFolder(folder:string){
        this.storage.setFolder(folder);
    }
    setStorageFileName(fileName:string){
        this.storage.setFileName(fileName);
    }
    */
    /*
    _storage: typeof storageClasses.Storage|undefined;

    setStoragePassword(password: string) {
        if (!this.storage)
            throw new Error("Please init storage")
        this.storage.setPassword(password);
    }
    get storage(): typeof storageClasses.Storage | undefined {
        return this._storage;
    }

    openFileStorage(fileName: string, password: string, folder: string = '') {
        let storage = CreateStorage();
        if (folder)
            storage.setFolder(folder);
        storage.setFileName(fileName);
        storage.setPassword(password);
        this._storage = storage;
    }
    */
    /**
     * Queries API for address[] UTXOs. Adds tx to transactions storage. Also sorts the entire transaction set.
     * @param addresses
     */
    findUtxos(addresses, debug = false) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.verbose(`scanning UTXO entries for ${addresses.length} addresses`);
            const utxosMap = yield this.api.getUtxosByAddresses(addresses);
            const addressesWithUTXOs = [];
            const txID2Info = new Map();
            if (debug) {
                utxosMap.forEach((utxos, address) => {
                    // utxos.sort((b, a)=> a.index-b.index)
                    utxos.map(t => {
                        let info = txID2Info.get(t.transactionId);
                        if (!info) {
                            info = {
                                utxos: [],
                                address
                            };
                            txID2Info.set(t.transactionId, info);
                        }
                        info.utxos.push(t);
                    });
                });
            }
            utxosMap.forEach((utxos, address) => {
                // utxos.sort((b, a)=> a.index-b.index)
                this.logger.verbose(`${address} - ${utxos.length} UTXO entries found`);
                if (utxos.length !== 0) {
                    this.disableBalanceNotifications = true;
                    this.utxoSet.utxoStorage[address] = utxos;
                    this.utxoSet.add(utxos, address);
                    addressesWithUTXOs.push(address);
                    this.disableBalanceNotifications = false;
                    this.emitBalance();
                }
            });
            const isActivityOnReceiveAddr = this.utxoSet.utxoStorage[this.receiveAddress] !== undefined;
            if (isActivityOnReceiveAddr) {
                this.addressManager.receiveAddress.next();
            }
            return {
                addressesWithUTXOs,
                txID2Info
            };
        });
    }
    adjustBalance(isConfirmed, amount, notify = true) {
        const { available, pending } = this.balance;
        if (isConfirmed) {
            this[BALANCE_CONFIRMED] += amount;
        }
        else {
            this[BALANCE_PENDING] += amount;
        }
        this[BALANCE_TOTAL] = this[BALANCE_CONFIRMED] + this[BALANCE_PENDING];
        if (notify === false)
            return;
        const { available: _available, pending: _pending } = this.balance;
        if (!this.syncInProggress && !this.disableBalanceNotifications && (available != _available || pending != _pending))
            this.emitBalance();
    }
    emitBalance() {
        const { available, pending, total } = this.balance;
        const { available: _available, pending: _pending } = this.lastBalanceNotification;
        if (available == _available && pending == _pending)
            return;
        this.lastBalanceNotification = { available, pending };
        this.logger.debug(`balance available: ${available} pending: ${pending}`);
        this.emit("balance-update", {
            available,
            pending,
            total,
            confirmedUtxosCount: this.utxoSet.confirmedCount
        });
    }
    updateDebugInfo() {
        let inUseUTXOs = { satoshis: 0, count: 0 };
        let { confirmed, pending, used } = this.utxoSet.utxos || {};
        this.utxoSet.inUse.map(utxoId => {
            var _d, _e, _f;
            inUseUTXOs.satoshis += ((_d = confirmed.get(utxoId)) === null || _d === void 0 ? void 0 : _d.satoshis) ||
                ((_e = pending.get(utxoId)) === null || _e === void 0 ? void 0 : _e.satoshis) ||
                ((_f = used.get(utxoId)) === null || _f === void 0 ? void 0 : _f.satoshis) || 0;
        });
        inUseUTXOs.count = this.utxoSet.inUse.length;
        this.debugInfo = { inUseUTXOs };
        this.emit("debug-info", { debugInfo: this.debugInfo });
    }
    clearUsedUTXOs() {
        this.utxoSet.clearUsed();
    }
    emitCache() {
        let { cache } = this;
        this.emit("state-update", { cache });
    }
    emitAddress() {
        const receive = this.receiveAddress;
        const change = this.changeAddress;
        let { receive: _receive, change: _change } = this.lastAddressNotification;
        if (receive == _receive && change == _change)
            return;
        this.lastAddressNotification = { receive, change };
        this.emit("new-address", {
            receive, change
        });
    }
    /**
     * Updates the selected network
     * @param network name of the network
     */
    updateNetwork(network) {
        return __awaiter(this, void 0, void 0, function* () {
            this.demolishWalletState(network.prefix);
            this.network = network.prefix;
            this.apiEndpoint = network.apiBaseUrl;
        });
    }
    demolishWalletState(networkPrefix = this.network) {
        this.utxoSet.clear();
        this.addressManager = new address_manager_1.AddressManager(this.HDWallet, networkPrefix);
        //this.pendingInfo.transactions = {};
        this.transactions = {};
        this.transactionsStorage = {};
    }
    scanMoreAddresses(count = 100, debug = false, receiveStart = -1, changeStart = -1) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.syncInProggress)
                return { error: "Sync in progress", code: "SYNC-IN-PROGRESS" };
            if (receiveStart < 0)
                receiveStart = this.addressManager.receiveAddress.counter;
            if (changeStart < 0)
                changeStart = this.addressManager.changeAddress.counter;
            this.syncInProggress = true;
            this.emit("scan-more-addresses-started", { receiveStart, changeStart });
            let error = false;
            let res = yield this.addressDiscovery(this.options.addressDiscoveryExtent, debug, receiveStart, changeStart, count)
                .catch(e => {
                this.logger.info("addressDiscovery:error", e);
                error = e;
            });
            this.syncInProggress = false;
            if (!this.syncOnce)
                this.utxoSet.utxoSubscribe();
            this.emit("scan-more-addresses-ended", { error });
            if (error)
                return { error, code: "ADDRESS-DISCOVERY" };
            let { highestIndex = null, endPoints = null } = res || {};
            this.logger.info("scanMoreAddresses:highestIndex", highestIndex);
            this.logger.info("scanMoreAddresses:endPoints", endPoints);
            this.emit("scan-more-addresses-ended", {
                receiveFinal: this.addressManager.receiveAddress.counter - 1,
                changeFinal: this.addressManager.changeAddress.counter - 1
            });
            return {
                code: "SUCCESS",
                receive: {
                    start: receiveStart,
                    end: (endPoints === null || endPoints === void 0 ? void 0 : endPoints.receive) || receiveStart + count,
                    final: this.addressManager.receiveAddress.counter - 1
                },
                change: {
                    start: changeStart,
                    end: (endPoints === null || endPoints === void 0 ? void 0 : endPoints.change) || changeStart + count,
                    final: this.addressManager.changeAddress.counter - 1
                }
            };
        });
    }
    /**
     * Derives receiveAddresses and changeAddresses and checks their transactions and UTXOs.
     * @param threshold stop discovering after `threshold` addresses with no activity
     */
    addressDiscovery(threshold = 64, debug = false, receiveStart = 0, changeStart = 0, count = 0) {
        var _d;
        return __awaiter(this, void 0, void 0, function* () {
            let addressList = [];
            let debugInfo = null;
            this.logger.info(`sync ... running address discovery, threshold:${threshold}`);
            const cacheIndexes = (_d = this.cacheStore.getAddressIndexes()) !== null && _d !== void 0 ? _d : { receive: 0, change: 0 };
            this.logger.info(`sync ...cacheIndexes: receive:${cacheIndexes.receive}, change:${cacheIndexes.change}`);
            let highestIndex = {
                receive: this.addressManager.receiveAddress.counter - 1,
                change: this.addressManager.changeAddress.counter - 1
            };
            let endPoints = {
                receive: 0,
                change: 0
            };
            let maxOffset = {
                receive: receiveStart + count,
                change: changeStart + count
            };
            const doDiscovery = (n, deriveType, offset) => __awaiter(this, void 0, void 0, function* () {
                this.logger.info(`sync ... scanning ${offset} - ${offset + n} ${deriveType} addresses`);
                this.emit("sync-progress", {
                    start: offset,
                    end: offset + n,
                    addressType: deriveType
                });
                const derivedAddresses = this.addressManager.getAddresses(n, deriveType, offset);
                const addresses = derivedAddresses.map((obj) => obj.address);
                addressList = [...addressList, ...addresses];
                this.logger.verbose(`${deriveType}: address data for derived indices ${derivedAddresses[0].index}..${derivedAddresses[derivedAddresses.length - 1].index}`);
                // if (this.loggerLevel > 0)
                // 	this.logger.verbose("addressDiscovery: findUtxos for addresses::", addresses)
                const { addressesWithUTXOs, txID2Info } = yield this.findUtxos(addresses, debug);
                if (!debugInfo)
                    debugInfo = txID2Info;
                if (addressesWithUTXOs.length === 0) {
                    // address discovery complete
                    const lastAddressIndexWithTx = highestIndex[deriveType]; //offset - (threshold - n) - 1;
                    this.logger.verbose(`${deriveType}: address discovery complete`);
                    this.logger.verbose(`${deriveType}: last activity on address #${lastAddressIndexWithTx}`);
                    this.logger.verbose(`${deriveType}: no activity from ${offset}..${offset + n}`);
                    if (offset >= maxOffset[deriveType] && offset >= cacheIndexes[deriveType]) {
                        endPoints[deriveType] = offset + n;
                        return lastAddressIndexWithTx;
                    }
                }
                // else keep doing discovery
                const index = derivedAddresses
                    .filter((obj) => addressesWithUTXOs.includes(obj.address))
                    .reduce((prev, cur) => Math.max(prev, cur.index), highestIndex[deriveType]);
                highestIndex[deriveType] = index;
                return doDiscovery(n, deriveType, offset + n);
            });
            const highestReceiveIndex = yield doDiscovery(threshold, 'receive', receiveStart);
            const highestChangeIndex = yield doDiscovery(threshold, 'change', changeStart);
            this.addressManager.receiveAddress.advance(highestReceiveIndex + 1);
            this.addressManager.changeAddress.advance(highestChangeIndex + 1);
            this.logger.verbose(`receive address index: ${highestReceiveIndex}; change address index: ${highestChangeIndex}`, `receive-address-index: ${this.addressManager.receiveAddress.counter}; change address index: ${this.addressManager.changeAddress.counter}`);
            if (!this.syncOnce && !this.syncInProggress)
                yield this.utxoSet.utxoSubscribe();
            this.runStateChangeHooks();
            let addressIndexes = {
                receive: Math.max(cacheIndexes.receive, this.addressManager.receiveAddress.counter),
                change: Math.max(cacheIndexes.change, this.addressManager.changeAddress.counter)
            };
            this.logger.info(`sync ...new cache: receive:${addressIndexes.receive}, change:${addressIndexes.change}`);
            this.cacheStore.setAddressIndexes(addressIndexes);
            this.emit("sync-end", addressIndexes);
            return { highestIndex, endPoints, debugInfo };
        });
    }
    // TODO: convert amount to sompis aka satoshis
    // TODO: bn
    /**
     * Compose a serialized, signed transaction
     * @param obj
     * @param obj.toAddr To address in cashaddr format (e.g. zuatest:qq0d6h0prjm5mpdld5pncst3adu0yam6xch4tr69k2)
     * @param obj.amount Amount to send in sompis (100000000 (1e8) sompis in 1 ZUA)
     * @param obj.fee Fee for miners in sompis
     * @param obj.changeAddrOverride Use this to override automatic change address derivation
     * @throws if amount is above `Number.MAX_SAFE_INTEGER`
     */
    composeTx({ toAddr, amount, fee = config_json_1.DEFAULT_FEE, changeAddrOverride, skipSign = false, privKeysInfo = false, compoundingUTXO = false, compoundingUTXOMaxCount = COMPOUND_UTXO_MAX_COUNT }) {
        // TODO: bn!
        amount = parseInt(amount);
        fee = parseInt(fee);
        // if (this.loggerLevel > 0) {
        // 	for (let i = 0; i < 100; i++)
        // 		console.log('Wallet transaction request for', amount, typeof amount);
        // }
        //if (!Number.isSafeInteger(amount)) throw new Error(`Amount ${amount} is too large`);
        let utxos, utxoIds, mass;
        if (compoundingUTXO) {
            ({ utxos, utxoIds, amount, mass } = this.utxoSet.collectUtxos(compoundingUTXOMaxCount));
        }
        else {
            ({ utxos, utxoIds, mass } = this.utxoSet.selectUtxos(amount + fee));
        }
        //if(mass > Wallet.MaxMassUTXOs){
        //	throw new Error(`Maximum number of inputs (UTXOs) reached. Please reduce this transaction amount.`);
        //}
        const privKeys = utxos.reduce((prev, cur) => {
            return [this.addressManager.all[String(cur.address)], ...prev];
        }, []);
        this.logger.info("utxos.length", utxos.length);
        const changeAddr = changeAddrOverride || this.addressManager.changeAddress.next();
        try {
            const tx = new zuacore.Transaction()
                .from(utxos)
                .to(toAddr, amount)
                .setVersion(0)
                .fee(fee)
                .change(changeAddr);
            if (!skipSign)
                tx.sign(privKeys, zuacore.crypto.Signature.SIGHASH_ALL, 'schnorr');
            //window.txxxx = tx;
            return {
                tx: tx,
                id: tx.id,
                rawTx: tx.toString(),
                utxoIds,
                amount,
                fee,
                utxos,
                toAddr,
                privKeys: privKeysInfo ? privKeys : []
            };
        }
        catch (e) {
            console.log("composeTx:error", e);
            // !!! FIXME
            if (!changeAddrOverride)
                this.addressManager.changeAddress.reverse();
            throw e;
        }
    }
    minimumRequiredTransactionRelayFee(mass) {
        let minimumFee = (mass * this.options.minimumRelayTransactionFee) / 1000;
        if (minimumFee == 0 && this.options.minimumRelayTransactionFee > 0) {
            minimumFee = this.options.minimumRelayTransactionFee;
        }
        // Set the minimum fee to the maximum possible value if the calculated
        // fee is not in the valid range for monetary amounts.
        if (minimumFee > MaxSompi) {
            minimumFee = MaxSompi;
        }
        return minimumFee;
    }
    /*
    validateAddress(addr:string):boolean{
        let address = new zuacore.Address(addr);
        return address.type == "pubkey";
    }
    */
    /**
     * Estimate transaction fee. Returns transaction data.
     * @param txParams
     * @param txParams.toAddr To address in cashaddr format (e.g. zuatest:qq0d6h0prjm5mpdld5pncst3adu0yam6xch4tr69k2)
     * @param txParams.amount Amount to send in sompis (100000000 (1e8) sompis in 1 ZUA)
     * @param txParams.fee Fee for miners in sompis
     * @throws `FetchError` if endpoint is down. API error message if tx error. Error if amount is too large to be represented as a javascript number.
     */
    estimateTransaction(txParamsArg) {
        return __awaiter(this, void 0, void 0, function* () {
            let address = this.addressManager.changeAddress.current.address;
            if (!address) {
                address = this.addressManager.changeAddress.next();
            }
            txParamsArg.changeAddrOverride = address;
            return this.composeTxAndNetworkFeeInfo(txParamsArg);
        });
    }
    composeTxAndNetworkFeeInfo(txParamsArg) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.waitOrSync();
            if (!txParamsArg.fee)
                txParamsArg.fee = 0;
            this.logger.info(`tx ... sending to ${txParamsArg.toAddr}`);
            this.logger.info(`tx ... amount: ${ZUA(txParamsArg.amount)} user fee: ${ZUA(txParamsArg.fee)} max data fee: ${ZUA(txParamsArg.networkFeeMax || 0)}`);
            //if(!this.validateAddress(txParamsArg.toAddr)){
            //	throw new Error("Invalid address")
            //}
            let txParams = Object.assign({}, txParamsArg);
            const networkFeeMax = txParams.networkFeeMax || 0;
            let calculateNetworkFee = !!txParams.calculateNetworkFee;
            let inclusiveFee = !!txParams.inclusiveFee;
            const { skipSign = true, privKeysInfo = false } = txParams;
            txParams.skipSign = skipSign;
            txParams.privKeysInfo = privKeysInfo;
            //console.log("calculateNetworkFee:", calculateNetworkFee, "inclusiveFee:", inclusiveFee)
            let data = this.composeTx(txParams);
            let { txSize, mass } = data.tx.getMassAndSize();
            let dataFee = this.minimumRequiredTransactionRelayFee(mass);
            const priorityFee = txParamsArg.fee;
            if (txParamsArg.compoundingUTXO) {
                inclusiveFee = true;
                calculateNetworkFee = true;
                txParamsArg.amount = data.amount;
                txParams.amount = data.amount;
                txParams.compoundingUTXO = false;
            }
            const txAmount = txParamsArg.amount;
            let amountRequested = txParamsArg.amount + priorityFee;
            let amountAvailable = data.utxos.map(utxo => utxo.satoshis).reduce((a, b) => a + b, 0);
            this.logger.verbose(`tx ... need data fee: ${ZUA(dataFee)} total needed: ${ZUA(amountRequested + dataFee)}`);
            this.logger.verbose(`tx ... available: ${ZUA(amountAvailable)} in ${data.utxos.length} UTXOs`);
            if (networkFeeMax && dataFee > networkFeeMax) {
                throw new Error(`Fee max is ${networkFeeMax} but the minimum fee required for this transaction is ${ZUA(dataFee)} ZUA`);
            }
            if (calculateNetworkFee) {
                do {
                    //console.log(`insufficient data fees... incrementing by ${dataFee}`);
                    txParams.fee = priorityFee + dataFee;
                    if (inclusiveFee) {
                        txParams.amount = txAmount - txParams.fee;
                    }
                    this.logger.verbose(`tx ... insufficient data fee for transaction size of ${txSize} bytes`);
                    this.logger.verbose(`tx ... need data fee: ${ZUA(dataFee)} for ${data.utxos.length} UTXOs`);
                    this.logger.verbose(`tx ... rebuilding transaction with additional inputs`);
                    let utxoLen = data.utxos.length;
                    this.logger.debug(`final fee ${txParams.fee}`);
                    data = this.composeTx(txParams);
                    ({ txSize, mass } = data.tx.getMassAndSize());
                    dataFee = this.minimumRequiredTransactionRelayFee(mass);
                    if (data.utxos.length != utxoLen)
                        this.logger.verbose(`tx ... aggregating: ${data.utxos.length} UTXOs`);
                } while ((!networkFeeMax || txParams.fee <= networkFeeMax) && txParams.fee < dataFee + priorityFee);
                if (networkFeeMax && txParams.fee > networkFeeMax)
                    throw new Error(`Maximum network fee exceeded; need: ${ZUA(dataFee)} ZUA maximum is: ${ZUA(networkFeeMax)} ZUA`);
            }
            else if (dataFee > priorityFee) {
                throw new Error(`Minimum fee required for this transaction is ${ZUA(dataFee)} ZUA`);
            }
            else if (inclusiveFee) {
                txParams.amount -= txParams.fee;
                data = this.composeTx(txParams);
            }
            data.dataFee = dataFee;
            data.totalAmount = txParams.fee + txParams.amount;
            data.txSize = txSize;
            data.note = txParamsArg.note || "";
            return data;
        });
    }
    /**
     * Build a transaction. Returns transaction info.
     * @param txParams
     * @param txParams.toAddr To address in cashaddr format (e.g. zuatest:qq0d6h0prjm5mpdld5pncst3adu0yam6xch4tr69k2)
     * @param txParams.amount Amount to send in sompis (100000000 (1e8) sompis in 1 ZUA)
     * @param txParams.fee Fee for miners in sompis
     * @throws `FetchError` if endpoint is down. API error message if tx error. Error if amount is too large to be represented as a javascript number.
     */
    buildTransaction(txParamsArg, debug = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const ts0 = Date.now();
            txParamsArg.skipSign = true;
            txParamsArg.privKeysInfo = true;
            const data = yield this.composeTxAndNetworkFeeInfo(txParamsArg);
            const { id, tx, utxos, utxoIds, amount, toAddr, fee, dataFee, totalAmount, txSize, note, privKeys } = data;
            const ts_0 = Date.now();
            tx.sign(privKeys, zuacore.crypto.Signature.SIGHASH_ALL, 'schnorr');
            const { mass: txMass } = tx.getMassAndSize();
            this.logger.info("txMass", txMass);
            if (txMass > Wallet.MaxMassAcceptedByBlock) {
                throw new Error(`Transaction size/mass limit reached. Please reduce this transaction amount. (Mass: ${txMass})`);
            }
            const ts_1 = Date.now();
            //const rawTx = tx.toString();
            const ts_2 = Date.now();
            this.logger.info(`tx ... required data fee: ${ZUA(dataFee)} (${utxos.length} UTXOs)`); // (${ZUA(txParamsArg.fee)}+${ZUA(dataFee)})`);
            //this.logger.verbose(`tx ... final fee: ${ZUA(dataFee+txParamsArg.fee)} (${ZUA(txParamsArg.fee)}+${ZUA(dataFee)})`);
            this.logger.info(`tx ... resulting total: ${ZUA(totalAmount)}`);
            //console.log(utxos);
            if (debug || this.loggerLevel > 0) {
                this.logger.debug("submitTransaction: estimateTx", data);
                this.logger.debug("sendTx:utxos", utxos);
                this.logger.debug("::utxos[0].script::", utxos[0].script);
                //console.log("::utxos[0].address::", utxos[0].address)
            }
            const { nLockTime: lockTime, version } = tx;
            if (debug || this.loggerLevel > 0)
                this.logger.debug("composeTx:tx", "txSize:", txSize);
            const ts_3 = Date.now();
            const inputs = tx.inputs.map((input) => {
                if (debug || this.loggerLevel > 0) {
                    this.logger.debug("input.script.inspect", input.script.inspect());
                }
                return {
                    previousOutpoint: {
                        transactionId: input.prevTxId.toString("hex"),
                        index: input.outputIndex
                    },
                    signatureScript: input.script.toBuffer().toString("hex"),
                    sequence: input.sequenceNumber,
                    sigOpCount: 1
                };
            });
            const ts_4 = Date.now();
            const outputs = tx.outputs.map((output) => {
                return {
                    amount: output.satoshis,
                    scriptPublicKey: {
                        scriptPublicKey: output.script.toBuffer().toString("hex"),
                        version: 0
                    }
                };
            });
            const ts_5 = Date.now();
            //const payloadStr = "0000000000000000000000000000000";
            //const payload = Buffer.from(payloadStr).toString("base64");
            //console.log("payload-hex:", Buffer.from(payloadStr).toString("hex"))
            //@ ts-ignore
            //const payloadHash = zuacore.crypto.Hash.sha256sha256(Buffer.from(payloadStr));
            const rpcTX = {
                transaction: {
                    version,
                    inputs,
                    outputs,
                    lockTime,
                    //payload:'f00f00000000000000001976a914784bf4c2562f38fe0c49d1e0538cee4410d37e0988ac',
                    payloadHash: '0000000000000000000000000000000000000000000000000000000000000000',
                    //payloadHash:'afe7fc6fe3288e79f9a0c05c22c1ead2aae29b6da0199d7b43628c2588e296f9',
                    //
                    subnetworkId: this.subnetworkId,
                    fee,
                    //gas: 0
                }
            };
            //const rpctx = JSON.stringify(rpcTX, null, "  ");
            const ts1 = Date.now();
            this.logger.info(`tx ... generation time ${((ts1 - ts0) / 1000).toFixed(2)} sec`);
            if (debug || this.loggerLevel > 0) {
                this.logger.debug(`rpcTX ${JSON.stringify(rpcTX, null, "  ")}`);
                this.logger.debug(`rpcTX ${JSON.stringify(rpcTX)}`);
            }
            const ts_6 = Date.now();
            this.logger.info(`time in msec`, {
                "total": ts_6 - ts0,
                "estimate-transaction": ts_0 - ts0,
                "tx.sign": ts_1 - ts_0,
                "tx.toString": ts_2 - ts_1,
                //"ts_3-ts_2": ts_3-ts_2,
                "tx.inputs.map": ts_4 - ts_3,
                "tx.outputs.map": ts_5 - ts_4,
                //"ts_6-ts_5": ts_6-ts_5
            });
            if (txParamsArg.skipUTXOInUseMark !== true) {
                this.utxoSet.updateUsed(utxos);
            }
            //const rpctx = JSON.stringify(rpcTX, null, "  ");
            //console.log("rpcTX", rpcTX)
            //console.log("\n\n########rpctx\n", rpctx+"\n\n\n")
            //if(amount/1e8 > 3)
            //	throw new Error("TODO XXXXXX")
            return Object.assign(Object.assign({}, data), { rpcTX });
        });
    }
    /**
     * Send a transaction. Returns transaction id.
     * @param txParams
     * @param txParams.toAddr To address in cashaddr format (e.g. zuatest:qq0d6h0prjm5mpdld5pncst3adu0yam6xch4tr69k2)
     * @param txParams.amount Amount to send in sompis (100000000 (1e8) sompis in 1 ZUA)
     * @param txParams.fee Fee for miners in sompis
     * @throws `FetchError` if endpoint is down. API error message if tx error. Error if amount is too large to be represented as a javascript number.
     */
    submitTransaction(txParamsArg, debug = false) {
        return __awaiter(this, void 0, void 0, function* () {
            txParamsArg.skipUTXOInUseMark = true;
            let reverseChangeAddress = false;
            if (!txParamsArg.changeAddrOverride) {
                txParamsArg.changeAddrOverride = this.addressManager.changeAddress.next();
                reverseChangeAddress = true;
            }
            const { rpcTX, utxoIds, amount, toAddr, note, utxos } = yield this.buildTransaction(txParamsArg, debug);
            //console.log("rpcTX:", rpcTX)
            //throw new Error("TODO : XXXX")
            try {
                const ts = Date.now();
                let txid = yield this.api.submitTransaction(rpcTX);
                const ts3 = Date.now();
                this.logger.info(`tx ... submission time ${((ts3 - ts) / 1000).toFixed(2)} sec`);
                this.logger.info(`txid: ${txid}`);
                if (!txid) {
                    if (reverseChangeAddress)
                        this.addressManager.changeAddress.reverse();
                    return null; // as TxResp;
                }
                this.utxoSet.inUse.push(...utxoIds);
                this.txStore.add({
                    in: false, ts, id: txid, amount, address: toAddr, note,
                    blueScore: this.blueScore,
                    tx: rpcTX.transaction,
                    myAddress: this.addressManager.isOur(toAddr),
                    isCoinbase: false,
                    version: 2
                });
                this.updateDebugInfo();
                this.emitCache();
                /*
                this.pendingInfo.add(txid, {
                    rawTx: tx.toString(),
                    utxoIds,
                    amount,
                    to: toAddr,
                    fee
                });
                */
                const resp = {
                    txid,
                    //rpctx
                };
                return resp;
            }
            catch (e) {
                if (reverseChangeAddress)
                    this.addressManager.changeAddress.reverse();
                if (typeof e.setExtraDebugInfo == "function") {
                    let mass = 0;
                    let satoshis = 0;
                    let list = utxos.map(tx => {
                        var _d;
                        mass += tx.mass;
                        satoshis += tx.satoshis;
                        return Object.assign({}, tx, {
                            address: tx.address.toString(),
                            script: (_d = tx.script) === null || _d === void 0 ? void 0 : _d.toString()
                        });
                    });
                    //86500,00000000
                    let info = {
                        mass,
                        satoshis,
                        utxoCount: list.length,
                        utxos: list
                    };
                    e.setExtraDebugInfo(info);
                }
                throw e;
            }
        });
    }
    /*
    * Compound UTXOs by re-sending funds to itself
    */
    compoundUTXOs(txCompoundOptions = {}, debug = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const { UTXOMaxCount = COMPOUND_UTXO_MAX_COUNT, networkFeeMax = 0, fee = 0, useLatestChangeAddress = false } = txCompoundOptions;
            //let toAddr = this.addressManager.changeAddress.next()
            let toAddr = this.addressManager.changeAddress.atIndex[0];
            //console.log("compoundUTXOs: to address:", toAddr, "useLatestChangeAddress:"+useLatestChangeAddress)
            if (useLatestChangeAddress) {
                toAddr = this.addressManager.changeAddress.current.address;
            }
            if (!toAddr) {
                toAddr = this.addressManager.changeAddress.next();
            }
            let txParamsArg = {
                toAddr,
                changeAddrOverride: toAddr,
                amount: -1,
                fee,
                networkFeeMax,
                compoundingUTXO: true,
                compoundingUTXOMaxCount: UTXOMaxCount
            };
            try {
                let res = yield this.submitTransaction(txParamsArg, debug);
                if (!(res === null || res === void 0 ? void 0 : res.txid))
                    this.addressManager.changeAddress.reverse();
                return res;
            }
            catch (e) {
                this.addressManager.changeAddress.reverse();
                throw e;
            }
        });
    }
    /*
    undoPendingTx(id: string): void {
        const {	utxoIds	} = this.pendingInfo.transactions[id];
        delete this.pendingInfo.transactions[id];
        this.utxoSet.release(utxoIds);
        this.addressManager.changeAddress.reverse();
        this.runStateChangeHooks();
    }
    */
    /**
     * After we see the transaction in the API results, delete it from our pending list.
     * @param id The tx hash
     */
    /*
   deletePendingTx(id: string): void {
       // undo + delete old utxos
       const {	utxoIds } = this.pendingInfo.transactions[id];
       delete this.pendingInfo.transactions[id];
       this.utxoSet.remove(utxoIds);
   }
   */
    runStateChangeHooks() {
        //this.utxoSet.updateUtxoBalance();
        //this.updateBalance();
    }
    startUTXOsPolling() {
        //if (this.UTXOsPollingStarted)
        //	return
        //this.UTXOsPollingStarted = true;
        this.emitUTXOs();
    }
    emitUTXOs() {
        let chunks = helper.chunks([...this.utxoSet.utxos.confirmed.values()], 100);
        chunks = chunks.concat(helper.chunks([...this.utxoSet.utxos.pending.values()], 100));
        let send = () => {
            let utxos = chunks.pop();
            if (!utxos)
                return;
            utxos = utxos.map(tx => {
                return Object.assign({}, tx, {
                    address: tx.address.toString()
                });
            });
            this.emit("utxo-sync", { utxos });
            helper.dpc(200, send);
        };
        send();
    }
    get cache() {
        return {
            //pendingTx: this.pendingInfo.transactions,
            utxos: {
                //utxoStorage: this.utxoSet.utxoStorage,
                inUse: this.utxoSet.inUse,
            },
            //transactionsStorage: this.transactionsStorage,
            addresses: {
                receiveCounter: this.addressManager.receiveAddress.counter,
                changeCounter: this.addressManager.changeAddress.counter,
            }
        };
    }
    restoreCache(cache) {
        //this.pendingInfo.transactions = cache.pendingTx;
        //this.utxoSet.utxoStorage = cache.utxos.utxoStorage;
        this.utxoSet.inUse = cache.utxos.inUse;
        /*
        Object.entries(this.utxoSet.utxoStorage).forEach(([addr, utxos]: [string, Api.Utxo[]]) => {
            this.utxoSet.add(utxos, addr);
        });
        this.transactionsStorage = cache.transactionsStorage;
        this.addressManager.getAddresses(cache.addresses.receiveCounter + 1, 'receive');
        this.addressManager.getAddresses(cache.addresses.changeCounter + 1, 'change');
        this.addressManager.receiveAddress.advance(cache.addresses.receiveCounter - 1);
        this.addressManager.changeAddress.advance(cache.addresses.changeCounter);
        //this.transactions = txParser(this.transactionsStorage, Object.keys(this.addressManager.all));
        this.runStateChangeHooks();
        */
    }
    /**
     * Generates encrypted wallet data.
     * @param password user's chosen password
     * @returns Promise that resolves to object-like string. Suggested to store as string for .import().
     */
    export(password) {
        return __awaiter(this, void 0, void 0, function* () {
            const savedWallet = {
                privKey: this.HDWallet.toString(),
                seedPhrase: this.mnemonic
            };
            return crypto_1.Crypto.encrypt(password, JSON.stringify(savedWallet));
        });
    }
    setLogLevel(level) {
        this.logger.setLevel(level);
        this.loggerLevel = level != 'none' ? 2 : 0;
        zuacore.setDebugLevel(level ? 1 : 0);
    }
}
exports.Wallet = Wallet;
_a = BALANCE_CONFIRMED, _b = BALANCE_PENDING, _c = BALANCE_TOTAL;
Wallet.Mnemonic = Mnemonic;
Wallet.passwordHandler = crypto_1.Crypto;
Wallet.Crypto = crypto_1.Crypto;
Wallet.zuacore = zuacore;
Wallet.COMPOUND_UTXO_MAX_COUNT = COMPOUND_UTXO_MAX_COUNT;
Wallet.MaxMassAcceptedByBlock = 100000;
Wallet.MaxMassUTXOs = 100000;
//Wallet.MaxMassAcceptedByBlock -
//zuacore.Transaction.EstimatedStandaloneMassWithoutInputs;
// TODO - integrate with Zuacore-lib
Wallet.networkTypes = {
    zua: { port: 46005, network: 'zua', name: 'mainnet' },
    zuatest: { port: 16210, network: 'zuatest', name: 'testnet' },
    zuasim: { port: 16510, network: 'zuasim', name: 'simnet' },
    zuadev: { port: 16610, network: 'zuadev', name: 'devnet' }
};
Wallet.networkAliases = {
    mainnet: 'zua',
    testnet: 'zuatest',
    devnet: 'zuadev',
    simnet: 'zuasim'
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2FsbGV0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vd2FsbGV0L3dhbGxldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQzdDLDJEQUE2QztBQW1DckMsOEJBQVM7QUFsQ2pCLHdEQUEwQztBQUUxQyw0Q0FBMEI7QUFDMUIsMENBQXdCO0FBQ3hCLHFDQUFnQztBQUNoQyxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDO0FBU3ZCLDRDQUFxRDtBQUNyRCx1REFBaUQ7QUFDakQsaUNBQXNGO0FBa0IxQyxtR0FsQloseUJBQWtCLE9Ba0JZO0FBQUUsbUdBbEJaLHlCQUFrQixPQWtCWTtBQWpCbEYseUNBQW1DO0FBQ25DLCtDQUF5QztBQUN6QywrQkFBeUM7QUFDekMsZ0RBQTJEO0FBQzNELDJEQUFvRDtBQUdwRCxNQUFNLGlCQUFpQixHQUFHLE1BQU0sRUFBRSxDQUFDO0FBQ25DLE1BQU0sZUFBZSxHQUFHLE1BQU0sRUFBRSxDQUFDO0FBQ2pDLE1BQU0sYUFBYSxHQUFHLE1BQU0sRUFBRSxDQUFDO0FBQy9CLE1BQU0sdUJBQXVCLEdBQUcsR0FBRyxDQUFDO0FBT2pCLDBEQUF1QjtBQUwxQyxNQUFNLGFBQWEsR0FBRyxTQUFXLENBQUE7QUFFakMsK0RBQStEO0FBQy9ELE1BQU0sUUFBUSxHQUFHLFFBQVUsR0FBRyxhQUFhLENBQUE7QUFJM0Msb0VBQW9FO0FBQ3BFLE1BQU0sTUFBTyxTQUFRLG1DQUFlO0lBOEpuQzs7OztPQUlHO0lBQ0gsWUFBWSxPQUFlLEVBQUUsVUFBa0IsRUFBRSxjQUE4QixFQUFFLFVBQXlCLEVBQUU7UUFDM0csS0FBSyxFQUFFLENBQUM7UUFwR1QsZ0NBQTJCLEdBQVksS0FBSyxDQUFDO1FBb0I3Qzs7V0FFRztRQUNILFlBQU8sR0FBWSxPQUFPLENB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QUUsVUFBVTtJQUNsQixNQUFNLEVBQUUsVUFBVTtDQUNsQixDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgTW5lbW9uaWMgPSByZXF1aXJlKCdiaXRjb3JlLW1uZW1vbmljJyk7XG5pbXBvcnQgKiBhcyBrYXNwYWNvcmUgZnJvbSAnQGthc3BhL2NvcmUtbGliJztcbmltcG9ydCAqIGFzIGhlbHBlciBmcm9tICcuLi91dGlscy9oZWxwZXInO1xuaW1wb3J0IHtTdG9yYWdlLCBTdG9yYWdlVHlwZX0gZnJvbSAnLi9zdG9yYWdlJztcbmV4cG9ydCAqIGZyb20gJy4vc3RvcmFnZSc7XG5leHBvcnQgKiBmcm9tICcuL2Vycm9yJztcbmltcG9ydCB7Q3J5cHRvfSBmcm9tICcuL2NyeXB0byc7XG5jb25zdCBLQVMgPSBoZWxwZXIuS0FTO1xuXG5pbXBvcnQge1xuXHROZXR3b3JrLCBOZXR3b3JrT3B0aW9ucywgU2VsZWN0ZWROZXR3b3JrLCBXYWxsZXRTYXZlLCBBcGksIFR4U2VuZCwgVHhSZXNwLFxuXHRQZW5kaW5nVHJhbnNhY3Rpb25zLCBXYWxsZXRDYWNoZSwgSVJQQywgUlBDLCBXYWxsZXRPcHRpb25zLFx0V2FsbGV0T3B0LFxuXHRUeEluZm8sIENvbXBvc2VUeEluZm8sIEJ1aWxkVHhSZXN1bHQsIFR4Q29tcG91bmRPcHRpb25zLCBEZWJ1Z0luZm8sXG5cdFNjYW5lTW9yZVJlc3VsdFxufSBmcm9tICcuLi90eXBlcy9jdXN0b20tdHlwZXMnO1xuXG5pbXBvcnQge0NyZWF0ZUxvZ2dlciwgTG9nZ2VyfSBmcm9tICcuLi91dGlscy9sb2dnZXInO1xuaW1wb3J0IHtBZGRyZXNzTWFuYWdlcn0gZnJvbSAnLi9hZGRyZXNzLW1hbmFnZXInO1xuaW1wb3J0IHtVbnNwZW50T3V0cHV0LCBVdHhvU2V0LCBDT05GSVJNQVRJT05fQ09VTlQsIENPSU5CQVNFX0NGTV9DT1VOVH0gZnJvbSAnLi91dHhvJztcbmltcG9ydCB7VFhTdG9yZX0gZnJvbSAnLi90eC1zdG9yZSc7XG5pbXBvcnQge0NhY2hlU3RvcmV9IGZyb20gJy4vY2FjaGUtc3RvcmUnO1xuaW1wb3J0IHtLYXNwYUFQSSwgQXBpRXJyb3J9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7REVGQVVMVF9GRUUsREVGQVVMVF9ORVRXT1JLfSBmcm9tICcuLi9jb25maWcuanNvbic7XG5pbXBvcnQge0V2ZW50VGFyZ2V0SW1wbH0gZnJvbSAnLi9ldmVudC10YXJnZXQtaW1wbCc7XG5cblxuY29uc3QgQkFMQU5DRV9DT05GSVJNRUQgPSBTeW1ib2woKTtcbmNvbnN0IEJBTEFOQ0VfUEVORElORyA9IFN5bWJvbCgpO1xuY29uc3QgQkFMQU5DRV9UT1RBTCA9IFN5bWJvbCgpO1xuY29uc3QgQ09NUE9VTkRfVVRYT19NQVhfQ09VTlQgPSA1MDA7XG5cbmNvbnN0IFNvbXBpUGVyS2FzcGEgPSAxMDBfMDAwXzAwMFxuXG4vLyBNYXhTb21waSBpcyB0aGUgbWF4aW11bSB0cmFuc2FjdGlvbiBhbW91bnQgYWxsb3dlZCBpbiBzb21waS5cbmNvbnN0IE1heFNvbXBpID0gMjFfMDAwXzAwMCAqIFNvbXBpUGVyS2FzcGFcblxuZXhwb3J0IHtrYXNwYWNvcmUsIENPTVBPVU5EX1VUWE9fTUFYX0NPVU5ULCBDT05GSVJNQVRJT05fQ09VTlQsIENPSU5CQVNFX0NGTV9DT1VOVH07XG5cbi8qKiBDbGFzcyByZXByZXNlbnRpbmcgYW4gSERXYWxsZXQgd2l0aCBkZXJpdmFibGUgY2hpbGQgYWRkcmVzc2VzICovXG5jbGFzcyBXYWxsZXQgZXh0ZW5kcyBFdmVudFRhcmdldEltcGwge1xuXG5cdHN0YXRpYyBNbmVtb25pYzogdHlwZW9mIE1uZW1vbmljID0gTW5lbW9uaWM7XG5cdHN0YXRpYyBwYXNzd29yZEhhbmRsZXIgPSBDcnlwdG87XG5cdHN0YXRpYyBDcnlwdG8gPSBDcnlwdG87XG5cdHN0YXRpYyBrYXNwYWNvcmU9a2FzcGFjb3JlO1xuXHRzdGF0aWMgQ09NUE9VTkRfVVRYT19NQVhfQ09VTlQ9Q09NUE9VTkRfVVRYT19NQVhfQ09VTlQ7XG5cdHN0YXRpYyBNYXhNYXNzQWNjZXB0ZWRCeUJsb2NrID0gMTAwMDAwO1xuXHRzdGF0aWMgTWF4TWFzc1VUWE9zID0gMTAwMDAwO1xuXHQvL1dhbGxldC5NYXhNYXNzQWNjZXB0ZWRCeUJsb2NrIC1cblx0Ly9rYXNwYWNvcmUuVHJhbnNhY3Rpb24uRXN0aW1hdGVkU3RhbmRhbG9uZU1hc3NXaXRob3V0SW5wdXRzO1xuXG5cdC8vIFRPRE8gLSBpbnRlZ3JhdGUgd2l0aCBLYXNwYWNvcmUtbGliXG5cdHN0YXRpYyBuZXR3b3JrVHlwZXM6IE9iamVjdCA9IHtcblx0XHRrYXNwYTogeyBwb3J0OiAxNjExMCwgbmV0d29yazogJ2thc3BhJywgbmFtZSA6ICdtYWlubmV0JyB9LFxuXHRcdGthc3BhdGVzdDogeyBwb3J0OiAxNjIxMCwgbmV0d29yazogJ2thc3BhdGVzdCcsIG5hbWUgOiAndGVzdG5ldCcgfSxcblx0XHRrYXNwYXNpbToge1x0cG9ydDogMTY1MTAsIG5ldHdvcms6ICdrYXNwYXNpbScsIG5hbWUgOiAnc2ltbmV0JyB9LFxuXHRcdGthc3BhZGV2OiB7XHRwb3J0OiAxNjYxMCwgbmV0d29yazogJ2thc3BhZGV2JywgbmFtZSA6ICdkZXZuZXQnIH1cblx0fVxuXG5cdHN0YXRpYyBuZXR3b3JrQWxpYXNlczogT2JqZWN0ID0ge1xuXHRcdG1haW5uZXQ6ICdrYXNwYScsXG5cdFx0dGVzdG5ldDogJ2thc3BhdGVzdCcsXG5cdFx0ZGV2bmV0OiAna2FzcGFkZXYnLFxuXHRcdHNpbW5ldDogJ2thc3Bhc2ltJ1xuXHR9XG5cblxuXHRzdGF0aWMgS0FTKHY6bnVtYmVyKTogc3RyaW5nIHtcblx0XHRyZXR1cm4gS0FTKHYpO1xuXHR9XG5cblxuXHRzdGF0aWMgaW5pdFJ1bnRpbWUoKSB7XG5cdFx0cmV0dXJuIGthc3BhY29yZS5pbml0UnVudGltZSgpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGEgbW5lbW9uaWMgdG8gYSBuZXcgd2FsbGV0LlxuXHQgKiBAcGFyYW0gc2VlZFBocmFzZSBUaGUgMTIgd29yZCBzZWVkIHBocmFzZS5cblx0ICogQHJldHVybnMgbmV3IFdhbGxldFxuXHQgKi9cblx0c3RhdGljIGZyb21NbmVtb25pYyhzZWVkUGhyYXNlOiBzdHJpbmcsIG5ldHdvcmtPcHRpb25zOiBOZXR3b3JrT3B0aW9ucywgb3B0aW9uczogV2FsbGV0T3B0aW9ucyA9IHt9KTogV2FsbGV0IHtcblx0XHRpZiAoIW5ldHdvcmtPcHRpb25zIHx8ICFuZXR3b3JrT3B0aW9ucy5uZXR3b3JrKVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKGBmcm9tTW5lbW9uaWMoc2VlZFBocmFzZSxuZXR3b3JrT3B0aW9ucyk6IG1pc3NpbmcgbmV0d29yayBhcmd1bWVudGApO1xuXHRcdGNvbnN0IHByaXZLZXkgPSBuZXcgTW5lbW9uaWMoc2VlZFBocmFzZS50cmltKCkpLnRvSERQcml2YXRlS2V5KCkudG9TdHJpbmcoKTtcblx0XHRjb25zdCB3YWxsZXQgPSBuZXcgdGhpcyhwcml2S2V5LCBzZWVkUGhyYXNlLCBuZXR3b3JrT3B0aW9ucywgb3B0aW9ucyk7XG5cdFx0cmV0dXJuIHdhbGxldDtcblx0fVxuXG5cdC8qKlxuXHQgKiBDcmVhdGVzIGEgbmV3IFdhbGxldCBmcm9tIGVuY3J5cHRlZCB3YWxsZXQgZGF0YS5cblx0ICogQHBhcmFtIHBhc3N3b3JkIHRoZSBwYXNzd29yZCB0aGUgdXNlciBlbmNyeXB0ZWQgdGhlaXIgc2VlZCBwaHJhc2Ugd2l0aFxuXHQgKiBAcGFyYW0gZW5jcnlwdGVkTW5lbW9uaWMgdGhlIGVuY3J5cHRlZCBzZWVkIHBocmFzZSBmcm9tIGxvY2FsIHN0b3JhZ2Vcblx0ICogQHRocm93cyBXaWxsIHRocm93IFwiSW5jb3JyZWN0IHBhc3N3b3JkXCIgaWYgcGFzc3dvcmQgaXMgd3Jvbmdcblx0ICovXG5cdHN0YXRpYyBhc3luYyBpbXBvcnQgKHBhc3N3b3JkOiBzdHJpbmcsIGVuY3J5cHRlZE1uZW1vbmljOiBzdHJpbmcsIG5ldHdvcmtPcHRpb25zOiBOZXR3b3JrT3B0aW9ucywgb3B0aW9uczogV2FsbGV0T3B0aW9ucyA9IHt9KTogUHJvbWlzZSA8IFdhbGxldCA+IHtcblx0XHRjb25zdCBkZWNyeXB0ZWQgPSBhd2FpdCBDcnlwdG8uZGVjcnlwdChwYXNzd29yZCwgZW5jcnlwdGVkTW5lbW9uaWMpO1xuXHRcdGNvbnN0IHNhdmVkV2FsbGV0ID0gSlNPTi5wYXJzZShkZWNyeXB0ZWQpIGFzIFdhbGxldFNhdmU7XG5cdFx0Y29uc3QgbXlXYWxsZXQgPSBuZXcgdGhpcyhzYXZlZFdhbGxldC5wcml2S2V5LCBzYXZlZFdhbGxldC5zZWVkUGhyYXNlLCBuZXR3b3JrT3B0aW9ucywgb3B0aW9ucyk7XG5cdFx0cmV0dXJuIG15V2FsbGV0O1xuXHR9XG5cblx0SERXYWxsZXQ6IGthc3BhY29yZS5IRFByaXZhdGVLZXk7XG5cdGRpc2FibGVCYWxhbmNlTm90aWZpY2F0aW9uczogYm9vbGVhbiA9IGZhbHNlO1xuXHRnZXQgYmFsYW5jZSgpOiB7YXZhaWxhYmxlOiBudW1iZXIsIHBlbmRpbmc6bnVtYmVyLCB0b3RhbDpudW1iZXJ9IHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0YXZhaWxhYmxlOiB0aGlzW0JBTEFOQ0VfQ09ORklSTUVEXSxcblx0XHRcdHBlbmRpbmc6IHRoaXNbQkFMQU5DRV9QRU5ESU5HXSxcblx0XHRcdHRvdGFsOiB0aGlzW0JBTEFOQ0VfQ09ORklSTUVEXSArIHRoaXNbQkFMQU5DRV9QRU5ESU5HXVxuXHRcdH1cblx0fVxuXG5cdC8qKlxuXHQgKiBTZXQgYnkgYWRkcmVzc01hbmFnZXJcblx0ICovXG5cdGdldCByZWNlaXZlQWRkcmVzcygpIHtcblx0XHRyZXR1cm4gdGhpcy5hZGRyZXNzTWFuYWdlci5yZWNlaXZlQWRkcmVzcy5jdXJyZW50LmFkZHJlc3M7XG5cdH1cblxuXHRnZXQgY2hhbmdlQWRkcmVzcygpIHtcblx0XHRyZXR1cm4gdGhpcy5hZGRyZXNzTWFuYWdlci5jaGFuZ2VBZGRyZXNzLmN1cnJlbnQuYWRkcmVzcztcblx0fVxuXG5cdC8qKlxuXHQgKiBDdXJyZW50IG5ldHdvcmsuXG5cdCAqL1xuXHRuZXR3b3JrOiBOZXR3b3JrID0gJ2thc3BhJztcblxuXHRhcGk6IEthc3BhQVBJOyAvL25ldyBLYXNwYUFQSSgpO1xuXG5cdC8qKiBcblx0ICogRGVmYXVsdCBmZWVcblx0ICovXG5cblx0ZGVmYXVsdEZlZTogbnVtYmVyID0gMTsgLy9wZXIgYnl0ZVxuXG5cdHN1Ym5ldHdvcmtJZDogc3RyaW5nID0gXCIwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwXCI7IC8vaGV4IHN0cmluZ1xuXG5cdGxhc3RfdHhfOnN0cmluZyA9ICcnO1xuXHQvKipcblx0ICogQ3VycmVudCBBUEkgZW5kcG9pbnQgZm9yIHNlbGVjdGVkIG5ldHdvcmtcblx0ICovXG5cdGFwaUVuZHBvaW50ID0gJ2xvY2FsaG9zdDoxNjIxMCc7XG5cblx0LyoqXG5cdCAqIEEgMTIgd29yZCBtbmVtb25pYy5cblx0ICovXG5cdG1uZW1vbmljOiBzdHJpbmc7XG5cblx0dXR4b1NldDogVXR4b1NldDtcblxuXHRhZGRyZXNzTWFuYWdlcjogQWRkcmVzc01hbmFnZXI7XG5cblx0Ymx1ZVNjb3JlOiBudW1iZXIgPSAtMTtcblxuXHRzeW5jVmlydHVhbFNlbGVjdGVkUGFyZW50Qmx1ZVNjb3JlU3RhcnRlZDpib29sZWFuID0gZmFsc2U7XG5cdHN5bmNJblByb2dncmVzczpib29sZWFuID0gZmFsc2U7XG5cblx0LyogZXNsaW50LWRpc2FibGUgKi9cblx0cGVuZGluZ0luZm86IFBlbmRpbmdUcmFuc2FjdGlvbnMgPSB7XG5cdFx0dHJhbnNhY3Rpb25zOiB7fSxcblx0XHRnZXQgYW1vdW50KCkge1xuXHRcdFx0Y29uc3QgdHJhbnNhY3Rpb25zID0gT2JqZWN0LnZhbHVlcyh0aGlzLnRyYW5zYWN0aW9ucyk7XG5cdFx0XHRpZiAodHJhbnNhY3Rpb25zLmxlbmd0aCA9PT0gMCkgcmV0dXJuIDA7XG5cdFx0XHRyZXR1cm4gdHJhbnNhY3Rpb25zLnJlZHVjZSgocHJldiwgY3VyKSA9PiBwcmV2ICsgY3VyLmFtb3VudCArIGN1ci5mZWUsIDApO1xuXHRcdH0sXG5cdFx0YWRkKFxuXHRcdFx0aWQ6IHN0cmluZyxcblx0XHRcdHR4OiB7XG5cdFx0XHRcdHRvOiBzdHJpbmc7XG5cdFx0XHRcdHV0eG9JZHM6IHN0cmluZ1tdO1xuXHRcdFx0XHRyYXdUeDogc3RyaW5nO1xuXHRcdFx0XHRhbW91bnQ6IG51bWJlcjtcblx0XHRcdFx0ZmVlOiBudW1iZXJcblx0XHRcdH1cblx0XHQpIHtcblx0XHRcdHRoaXMudHJhbnNhY3Rpb25zW2lkXSA9IHR4O1xuXHRcdH1cblx0fTtcblx0LyoqXG5cdCAqIFRyYW5zYWN0aW9ucyBzb3J0ZWQgYnkgaGFzaC5cblx0ICovXG5cdHRyYW5zYWN0aW9uczpSZWNvcmQ8c3RyaW5nLCB7IHJhd1R4OiBzdHJpbmc7IHV0eG9JZHM6IHN0cmluZ1tdOyBhbW91bnQ6IG51bWJlcjsgdG86IHN0cmluZzsgZmVlOiBudW1iZXI7IH0+ID0ge307XG5cblx0LyoqXG5cdCAqIFRyYW5zYWN0aW9uIGFycmF5cyBrZXllZCBieSBhZGRyZXNzLlxuXHQgKi9cblx0dHJhbnNhY3Rpb25zU3RvcmFnZTogUmVjb3JkIDwgc3RyaW5nLCBBcGkuVHJhbnNhY3Rpb25bXSA+ID0ge307XG5cblxuXHRvcHRpb25zOiBXYWxsZXRPcHQ7XG5cdGNvbm5lY3RTaWduYWw6aGVscGVyLkRlZmVycmVkUHJvbWlzZTtcblx0dHhTdG9yZTpUWFN0b3JlO1xuXHRjYWNoZVN0b3JlOkNhY2hlU3RvcmU7XG5cblx0dWlkOnN0cmluZztcblxuXHQvKiogQ3JlYXRlIGEgd2FsbGV0LlxuXHQgKiBAcGFyYW0gd2FsbGV0U2F2ZSAob3B0aW9uYWwpXG5cdCAqIEBwYXJhbSB3YWxsZXRTYXZlLnByaXZLZXkgU2F2ZWQgd2FsbGV0J3MgcHJpdmF0ZSBrZXkuXG5cdCAqIEBwYXJhbSB3YWxsZXRTYXZlLnNlZWRQaHJhc2UgU2F2ZWQgd2FsbGV0J3Mgc2VlZCBwaHJhc2UuXG5cdCAqL1xuXHRjb25zdHJ1Y3Rvcihwcml2S2V5OiBzdHJpbmcsIHNlZWRQaHJhc2U6IHN0cmluZywgbmV0d29ya09wdGlvbnM6IE5ldHdvcmtPcHRpb25zLCBvcHRpb25zOiBXYWxsZXRPcHRpb25zID0ge30pIHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMubG9nZ2VyID0gQ3JlYXRlTG9nZ2VyKCdLYXNwYVdhbGxldCcpO1xuXHRcdHRoaXMuYXBpID0gbmV3IEthc3BhQVBJKCk7XG5cdFx0Ly9AdHMtaWdub3JlXG5cdFx0Ly9wb3N0TWVzc2FnZSh7ZXJyb3I6bmV3IEFwaUVycm9yKFwidGVzdFwiKSB9KVxuXHRcdGxldCBkZWZhdWx0T3B0ID0ge1xuXHRcdFx0c2tpcFN5bmNCYWxhbmNlOiBmYWxzZSxcblx0XHRcdHN5bmNPbmNlOiBmYWxzZSxcblx0XHRcdGFkZHJlc3NEaXNjb3ZlcnlFeHRlbnQ6MTUwLFxuXHRcdFx0bG9nTGV2ZWw6J2luZm8nLFxuXHRcdFx0ZGlzYWJsZUFkZHJlc3NEZXJpdmF0aW9uOmZhbHNlLFxuXHRcdFx0Y2hlY2tHUlBDRmxhZ3M6ZmFsc2UsXG5cdFx0XHRtaW5pbXVtUmVsYXlUcmFuc2FjdGlvbkZlZToxMDAwLFxuXHRcdFx0dXBkYXRlVHhUaW1lczp0cnVlXG5cdFx0fTtcblx0XHQvLyBjb25zb2xlLmxvZyhcIkNSRUFUSU5HIFdBTExFVCBGT1IgTkVUV09SS1wiLCB0aGlzLm5ldHdvcmspO1xuXHRcdHRoaXMub3B0aW9ucyA9IHsuLi5kZWZhdWx0T3B0LFx0Li4ub3B0aW9uc307XG5cdFx0Ly90aGlzLm9wdGlvbnMuYWRkcmVzc0Rpc2NvdmVyeUV4dGVudCA9IDUwMDtcblx0XHR0aGlzLnNldExvZ0xldmVsKHRoaXMub3B0aW9ucy5sb2dMZXZlbCk7IFxuXG5cdFx0dGhpcy5uZXR3b3JrID0gbmV0d29ya09wdGlvbnMubmV0d29yaztcblx0XHR0aGlzLmRlZmF1bHRGZWUgPSBuZXR3b3JrT3B0aW9ucy5kZWZhdWx0RmVlIHx8IHRoaXMuZGVmYXVsdEZlZTtcblx0XHRpZiAobmV0d29ya09wdGlvbnMucnBjKVxuXHRcdFx0dGhpcy5hcGkuc2V0UlBDKG5ldHdvcmtPcHRpb25zLnJwYyk7XG5cblxuXHRcdGlmIChwcml2S2V5ICYmIHNlZWRQaHJhc2UpIHtcblx0XHRcdHRoaXMuSERXYWxsZXQgPSBuZXcga2FzcGFjb3JlLkhEUHJpdmF0ZUtleShwcml2S2V5KTtcblx0XHRcdHRoaXMubW5lbW9uaWMgPSBzZWVkUGhyYXNlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjb25zdCB0ZW1wID0gbmV3IE1uZW1vbmljKE1uZW1vbmljLldvcmRzLkVOR0xJU0gpO1xuXHRcdFx0dGhpcy5tbmVtb25pYyA9IHRlbXAudG9TdHJpbmcoKTtcblx0XHRcdHRoaXMuSERXYWxsZXQgPSBuZXcga2FzcGFjb3JlLkhEUHJpdmF0ZUtleSh0ZW1wLnRvSERQcml2YXRlS2V5KCkudG9TdHJpbmcoKSk7XG5cdFx0fVxuXG5cdFx0dGhpcy51aWQgPSB0aGlzLmNyZWF0ZVVJRCgpO1xuXG5cdFx0dGhpcy51dHhvU2V0ID0gbmV3IFV0eG9TZXQodGhpcyk7XG5cdFx0dGhpcy50eFN0b3JlID0gbmV3IFRYU3RvcmUodGhpcyk7XG5cdFx0dGhpcy5jYWNoZVN0b3JlID0gbmV3IENhY2hlU3RvcmUodGhpcyk7XG5cdFx0Ly90aGlzLnV0eG9TZXQub24oXCJiYWxhbmNlLXVwZGF0ZVwiLCB0aGlzLnVwZGF0ZUJhbGFuY2UuYmluZCh0aGlzKSk7XG5cdFx0XG5cdFx0dGhpcy5hZGRyZXNzTWFuYWdlciA9IG5ldyBBZGRyZXNzTWFuYWdlcih0aGlzLkhEV2FsbGV0LCB0aGlzLm5ldHdvcmspO1xuXHRcdGlmKHRoaXMub3B0aW9ucy5kaXNhYmxlQWRkcmVzc0Rlcml2YXRpb24pXG5cdFx0XHR0aGlzLmFkZHJlc3NNYW5hZ2VyLnJlY2VpdmVBZGRyZXNzLm5leHQoKTtcblx0XHQvL3RoaXMuaW5pdEFkZHJlc3NNYW5hZ2VyKCk7XG5cdFx0Ly90aGlzLnN5bmModGhpcy5vcHRpb25zLnN5bmNPbmNlKTtcblx0XHR0aGlzLmNvbm5lY3RTaWduYWwgPSBoZWxwZXIuRGVmZXJyZWQoKTtcblx0XHR0aGlzLmFwaS5vbihcImNvbm5lY3RcIiwgKCk9Pntcblx0XHRcdHRoaXMub25BcGlDb25uZWN0KClcblx0XHR9KVxuXHRcdHRoaXMuYXBpLm9uKFwiZGlzY29ubmVjdFwiLCAoKT0+e1xuXHRcdFx0dGhpcy5vbkFwaURpc2Nvbm5lY3QoKTtcblx0XHR9KVxuXHR9XG5cblx0Y3JlYXRlVUlEKCl7XG5cdFx0Y29uc3Qge3ByaXZhdGVLZXl9ID0gdGhpcy5IRFdhbGxldC5kZXJpdmVDaGlsZChgbS80NCcvOTcyLzAnLzEnLzAnYCk7XG5cdFx0bGV0IGFkZHJlc3MgPSBwcml2YXRlS2V5LnRvQWRkcmVzcyh0aGlzLm5ldHdvcmspLnRvU3RyaW5nKCkuc3BsaXQoXCI6XCIpWzFdXG5cdFx0cmV0dXJuIGhlbHBlci5jcmVhdGVIYXNoKGFkZHJlc3MpO1xuXHR9XG5cblx0YXN5bmMgb25BcGlDb25uZWN0KCl7XG5cdFx0dGhpcy5jb25uZWN0U2lnbmFsLnJlc29sdmUoKTtcblx0XHRsZXQge2Nvbm5lY3RlZH0gPSB0aGlzO1xuXHRcdHRoaXMuY29ubmVjdGVkID0gdHJ1ZTtcblx0XHR0aGlzLmxvZ2dlci5pbmZvKFwiZ1JQQyBjb25uZWN0ZWRcIik7XG5cdFx0dGhpcy5lbWl0KFwiYXBpLWNvbm5lY3RcIik7XG5cdFx0aWYodGhpcy5zeW5jU2lnbmFsICYmIGNvbm5lY3RlZCE9PXVuZGVmaW5lZCkgey8vaWYgc3luYyB3YXMgY2FsbGVkXG5cdFx0XHR0aGlzLmxvZ2dlci5pbmZvKFwic3RhcnRpbmcgd2FsbGV0IHJlLXN5bmMgLi4uXCIpO1xuXHRcdFx0YXdhaXQgdGhpcy5zeW5jKHRoaXMuc3luY09uY2UpO1xuXHRcdH1cblx0XHRcblx0fVxuXG5cdGNvbm5lY3RlZDpib29sZWFufHVuZGVmaW5lZDtcblx0b25BcGlEaXNjb25uZWN0KCkge1xuXHRcdHRoaXMuY29ubmVjdGVkID0gZmFsc2U7XG5cdFx0dGhpcy5zeW5jVmlydHVhbFNlbGVjdGVkUGFyZW50Qmx1ZVNjb3JlU3RhcnRlZCA9IGZhbHNlO1xuXHRcdHRoaXMubG9nZ2VyLnZlcmJvc2UoXCJnUlBDIGRpc2Nvbm5lY3RlZFwiKTtcblx0XHR0aGlzLmVtaXQoXCJhcGktZGlzY29ubmVjdFwiKTtcblx0fVxuXG5cdGFzeW5jIHVwZGF0ZShzeW5jT25jZTpib29sZWFuPXRydWUpe1xuXHRcdGF3YWl0IHRoaXMuc3luYyhzeW5jT25jZSk7XG5cdH1cblxuXHRzeW5jT25jZTpib29sZWFufHVuZGVmaW5lZDtcblx0c3luY1NpZ25hbDogaGVscGVyLkRlZmVycmVkUHJvbWlzZXx1bmRlZmluZWQ7XG5cdHdhaXRPclN5bmMoKXtcblx0XHRpZih0aGlzLnN5bmNTaWduYWwpXG5cdFx0XHRyZXR1cm4gdGhpcy5zeW5jU2lnbmFsO1xuXHRcdHJldHVybiB0aGlzLnN5bmMoKTtcblx0fVxuXHRhc3luYyBzeW5jKHN5bmNPbmNlOmJvb2xlYW58dW5kZWZpbmVkPXVuZGVmaW5lZCl7XG5cdFx0dGhpcy5zeW5jU2lnbmFsID0gaGVscGVyLkRlZmVycmVkKCk7XG5cdFx0YXdhaXQgdGhpcy5jb25uZWN0U2lnbmFsO1xuXHRcdGlmKHN5bmNPbmNlID09PSB1bmRlZmluZWQpXG5cdFx0XHRzeW5jT25jZSA9IHRoaXMub3B0aW9ucy5zeW5jT25jZTtcblx0XHRzeW5jT25jZSA9ICEhc3luY09uY2U7XG5cblx0XHR0aGlzLnN5bmNJblByb2dncmVzcyA9IHRydWU7XG5cdFx0dGhpcy5lbWl0KFwic3luYy1zdGFydFwiKTtcblx0XHRhd2FpdCB0aGlzLnR4U3RvcmUucmVzdG9yZSgpO1xuXHRcdGF3YWl0IHRoaXMuY2FjaGVTdG9yZS5yZXN0b3JlKCk7XG5cdFx0Y29uc3QgdHMwID0gRGF0ZS5ub3coKTtcblx0XHR0aGlzLmxvZ2dlci5pbmZvKGBzeW5jIC4uLiBzdGFydGluZyB3YWxsZXQgc3luY2ApOy8vICR7c3luY09uY2U/Jyhtb25pdG9yaW5nIGRpc2FibGVkKSc6Jyd9YCk7XG5cdFx0Ly90aGlzLmxvZ2dlci5pbmZvKGBzeW5jIC4uLi4uLi4uLi4uLiBzdGFydGVkLCBzeW5jT25jZToke3N5bmNPbmNlfWApXG5cblx0XHQvL2lmIGxhc3QgdGltZSBzeW5jT25jZSB3YXMgT0ZGIHdlIGhhdmUgc3Vic2NyaXB0aW9ucyB0byB1dHhvLWNoYW5nZVxuXHRcdGlmKHRoaXMuc3luY09uY2UgPT09IGZhbHNlICYmIHN5bmNPbmNlKXtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIldhbGxldCBzeW5jIHByb2Nlc3MgYWxyZWFkeSBydW5uaW5nLlwiKVxuXHRcdH1cblxuXHRcdHRoaXMuc3luY09uY2UgPSBzeW5jT25jZTtcblx0XHR0aGlzLmluaXRBZGRyZXNzTWFuYWdlcigpO1xuXG5cdFx0YXdhaXQgdGhpcy5pbml0Qmx1ZVNjb3JlU3luYyhzeW5jT25jZSlcblx0ICAgIC5jYXRjaChlPT57XG5cdCAgICAgICAgdGhpcy5sb2dnZXIuaW5mbyhcInN5bmNWaXJ0dWFsU2VsZWN0ZWRQYXJlbnRCbHVlU2NvcmU6ZXJyb3JcIiwgZSlcblx0ICAgIH0pXG5cdFx0XG5cdFx0aWYodGhpcy5vcHRpb25zLmRpc2FibGVBZGRyZXNzRGVyaXZhdGlvbil7XG5cdFx0XHR0aGlzLmxvZ2dlci53YXJuKCdzeW5jIC4uLiBydW5uaW5nIHdpdGggYWRkcmVzcyBkaXNjb3ZlcnkgZGlzYWJsZWQnKTtcblx0XHRcdHRoaXMudXR4b1NldC5zeW5jQWRkcmVzc2VzVXR4b3MoW3RoaXMucmVjZWl2ZUFkZHJlc3NdKTtcblx0XHR9ZWxzZXtcblx0XHQgICAgYXdhaXQgdGhpcy5hZGRyZXNzRGlzY292ZXJ5KHRoaXMub3B0aW9ucy5hZGRyZXNzRGlzY292ZXJ5RXh0ZW50KVxuXHRcdCAgICAuY2F0Y2goZT0+e1xuXHRcdCAgICAgICAgdGhpcy5sb2dnZXIuaW5mbyhcImFkZHJlc3NEaXNjb3Zlcnk6ZXJyb3JcIiwgZSlcblx0XHQgICAgfSlcblx0ICAgIH1cblxuXHQgICAgdGhpcy5zeW5jSW5Qcm9nZ3Jlc3MgPSBmYWxzZTtcblx0ICAgIGlmKCFzeW5jT25jZSlcblx0XHRcdGF3YWl0IHRoaXMudXR4b1NldC51dHhvU3Vic2NyaWJlKCk7XG5cblx0XHRjb25zdCB0czEgPSBEYXRlLm5vdygpO1xuXHRcdGNvbnN0IGRlbHRhID0gKCh0czEtdHMwKS8xMDAwKS50b0ZpeGVkKDEpO1xuXHQgICAgdGhpcy5sb2dnZXIuaW5mbyhgc3luYyAuLi4gJHt0aGlzLnV0eG9TZXQuY291bnR9IFVUWE8gZW50cmllcyBmb3VuZGApO1xuXHRcdHRoaXMubG9nZ2VyLmluZm8oYHN5bmMgLi4uIGluZGV4ZWQgJHt0aGlzLmFkZHJlc3NNYW5hZ2VyLnJlY2VpdmVBZGRyZXNzLmNvdW50ZXJ9IHJlY2VpdmUgYW5kICR7dGhpcy5hZGRyZXNzTWFuYWdlci5jaGFuZ2VBZGRyZXNzLmNvdW50ZXJ9IGNoYW5nZSBhZGRyZXNzZXNgKTtcblx0ICAgIHRoaXMubG9nZ2VyLmluZm8oYHN5bmMgLi4uIGZpbmlzaGVkIChzeW5jIGRvbmUgaW4gJHtkZWx0YX0gc2Vjb25kcylgKTtcblx0XHR0aGlzLmVtaXQoXCJzeW5jLWZpbmlzaFwiKTtcblx0XHRjb25zdCB7YXZhaWxhYmxlLCBwZW5kaW5nLCB0b3RhbH0gPSB0aGlzLmJhbGFuY2U7XG5cdFx0dGhpcy5lbWl0KFwicmVhZHlcIiwge1xuXHRcdFx0YXZhaWxhYmxlLHBlbmRpbmcsIHRvdGFsLFxuXHRcdFx0Y29uZmlybWVkVXR4b3NDb3VudDogdGhpcy51dHhvU2V0LmNvbmZpcm1lZENvdW50XG5cdFx0fSk7XG5cdCAgICB0aGlzLmVtaXRCYWxhbmNlKCk7XG5cdCAgICB0aGlzLmVtaXRBZGRyZXNzKCk7XG5cdCAgICB0aGlzLnR4U3RvcmUuZW1pdFR4cygpO1xuXHQgICAgdGhpcy5zeW5jU2lnbmFsLnJlc29sdmUoKTtcblx0XHRpZighdGhpcy51dHhvU2V0LmNsZWFyTWlzc2luZygpKVxuXHRcdFx0dGhpcy51cGRhdGVEZWJ1Z0luZm8oKTtcblx0fVxuXG5cdGdldFZpcnR1YWxTZWxlY3RlZFBhcmVudEJsdWVTY29yZSgpIHtcblx0XHRyZXR1cm4gdGhpcy5hcGkuZ2V0VmlydHVhbFNlbGVjdGVkUGFyZW50Qmx1ZVNjb3JlKCk7XG5cdH1cblxuXHRnZXRWaXJ0dWFsRGFhU2NvcmUoKSB7XG5cdFx0cmV0dXJuIHRoaXMuYXBpLmdldFZpcnR1YWxEYWFTY29yZSgpO1xuXHR9XG5cblx0YXN5bmMgaW5pdEJsdWVTY29yZVN5bmMob25jZTpib29sZWFuID0gZmFsc2UpIHtcblx0XHRpZih0aGlzLnN5bmNWaXJ0dWFsU2VsZWN0ZWRQYXJlbnRCbHVlU2NvcmVTdGFydGVkKVxuXHRcdFx0cmV0dXJuO1xuXHRcdHRoaXMuc3luY1ZpcnR1YWxTZWxlY3RlZFBhcmVudEJsdWVTY29yZVN0YXJ0ZWQgPSB0cnVlO1xuXHRcdGxldCByID0gYXdhaXQgdGhpcy5nZXRWaXJ0dWFsRGFhU2NvcmUoKTtcblx0XHRsZXQge3ZpcnR1YWxEYWFTY29yZTpibHVlU2NvcmV9ID0gcjtcblx0XHRjb25zb2xlLmxvZyhcImdldFZpcnR1YWxTZWxlY3RlZFBhcmVudEJsdWVTY29yZSA6cmVzdWx0XCIsIHIpXG5cdFx0dGhpcy5ibHVlU2NvcmUgPSBibHVlU2NvcmU7XG5cdFx0dGhpcy5lbWl0KFwiYmx1ZS1zY29yZS1jaGFuZ2VkXCIsIHtibHVlU2NvcmV9KVxuXHRcdHRoaXMudXR4b1NldC51cGRhdGVVdHhvQmFsYW5jZSgpO1xuXG5cdFx0aWYob25jZSkge1xuXHRcdFx0dGhpcy5zeW5jVmlydHVhbFNlbGVjdGVkUGFyZW50Qmx1ZVNjb3JlU3RhcnRlZCA9IGZhbHNlO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR0aGlzLmFwaS5zdWJzY3JpYmVWaXJ0dWFsRGFhU2NvcmVDaGFuZ2VkKChyZXN1bHQpID0+IHtcblx0XHRcdGxldCB7dmlydHVhbERhYVNjb3JlfSA9IHJlc3VsdDtcblx0XHRcdC8vY29uc29sZS5sb2coXCJzdWJzY3JpYmVWaXJ0dWFsU2VsZWN0ZWRQYXJlbnRCbHVlU2NvcmVDaGFuZ2VkOnJlc3VsdFwiLCByZXN1bHQpXG5cdFx0XHR0aGlzLmJsdWVTY29yZSA9IHZpcnR1YWxEYWFTY29yZTtcblx0XHRcdHRoaXMuZW1pdChcImJsdWUtc2NvcmUtY2hhbmdlZFwiLCB7XG5cdFx0XHRcdGJsdWVTY29yZTogdmlydHVhbERhYVNjb3JlXG5cdFx0XHR9KVxuXHRcdFx0dGhpcy51dHhvU2V0LnVwZGF0ZVV0eG9CYWxhbmNlKCk7XG5cdFx0fSkudGhlbihyPT57XG5cdFx0XHRjb25zb2xlLmxvZyhcInN1YnNjcmliZVZpcnR1YWxEYWFTY29yZUNoYW5nZWQ6cmVzcG9uY2VcIiwgcilcblx0XHR9LCBlPT57XG5cdFx0XHRjb25zb2xlLmxvZyhcInN1YnNjcmliZVZpcnR1YWxEYWFTY29yZUNoYW5nZWQ6ZXJyb3JcIiwgZSlcblx0XHR9KVxuXHR9XG5cblx0YWRkcmVzc01hbmFnZXJJbml0aWFsaXplZDpib29sZWFufHVuZGVmaW5lZDtcblx0aW5pdEFkZHJlc3NNYW5hZ2VyKCkge1xuXHRcdGlmKHRoaXMuYWRkcmVzc01hbmFnZXJJbml0aWFsaXplZClcblx0XHRcdHJldHVyblxuXHRcdHRoaXMuYWRkcmVzc01hbmFnZXJJbml0aWFsaXplZCA9IHRydWU7XG5cblx0XHR0aGlzLmFkZHJlc3NNYW5hZ2VyLm9uKFwibmV3LWFkZHJlc3NcIiwgZGV0YWlsID0+IHtcblx0XHRcdGlmKCF0aGlzLnN5bmNJblByb2dncmVzcyl7XG5cdFx0XHRcdHRoaXMuZW1pdEFkZHJlc3MoKTtcblx0XHRcdH1cblx0XHRcdC8vY29uc29sZS5sb2coXCJuZXctYWRkcmVzc1wiLCBkZXRhaWwpXG5cdFx0XHRpZiAodGhpcy5vcHRpb25zLnNraXBTeW5jQmFsYW5jZSlcblx0XHRcdFx0cmV0dXJuXG5cblx0XHRcdC8vY29uc29sZS5sb2coXCJuZXctYWRkcmVzczpkZXRhaWxcIiwgZGV0YWlsKVxuXHRcdFx0Y29uc3Qge1x0YWRkcmVzcywgdHlwZSB9ID0gZGV0YWlsO1xuXHRcdFx0dGhpcy51dHhvU2V0LnN5bmNBZGRyZXNzZXNVdHhvcyhbYWRkcmVzc10pO1xuXHRcdH0pXG5cdFx0aWYoIXRoaXMucmVjZWl2ZUFkZHJlc3Mpe1xuXHRcdFx0dGhpcy5hZGRyZXNzTWFuYWdlci5yZWNlaXZlQWRkcmVzcy5uZXh0KCk7XG5cdFx0fVxuXHR9XG5cblx0YXN5bmMgc3RhcnRVcGRhdGluZ1RyYW5zYWN0aW9ucyh2ZXJzaW9uOnVuZGVmaW5lZHxudW1iZXI9dW5kZWZpbmVkKTpQcm9taXNlPGJvb2xlYW4+e1xuXHRcdHJldHVybiBhd2FpdCB0aGlzLnR4U3RvcmUuc3RhcnRVcGRhdGluZ1RyYW5zYWN0aW9ucyh2ZXJzaW9uKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBTZXQgcnBjIHByb3ZpZGVyXG5cdCAqIEBwYXJhbSBycGNcblx0ICovXG5cdHNldFJQQyhycGM6IElSUEMpIHtcblx0XHR0aGlzLmFwaS5zZXRSUEMocnBjKTtcblx0fVxuXG5cdC8qXG5cdHNldFN0b3JhZ2VUeXBlKHR5cGU6U3RvcmFnZVR5cGUpe1xuXHRcdHRoaXMuc3RvcmFnZS5zZXRUeXBlKHR5cGUpO1xuXHR9XG5cdHNldFN0b3JhZ2VGb2xkZXIoZm9sZGVyOnN0cmluZyl7XG5cdFx0dGhpcy5zdG9yYWdlLnNldEZvbGRlcihmb2xkZXIpO1xuXHR9XG5cdHNldFN0b3JhZ2VGaWxlTmFtZShmaWxlTmFtZTpzdHJpbmcpe1xuXHRcdHRoaXMuc3RvcmFnZS5zZXRGaWxlTmFtZShmaWxlTmFtZSk7XG5cdH1cblx0Ki9cblx0Lypcblx0X3N0b3JhZ2U6IHR5cGVvZiBzdG9yYWdlQ2xhc3Nlcy5TdG9yYWdlfHVuZGVmaW5lZDtcblxuXHRzZXRTdG9yYWdlUGFzc3dvcmQocGFzc3dvcmQ6IHN0cmluZykge1xuXHRcdGlmICghdGhpcy5zdG9yYWdlKVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiUGxlYXNlIGluaXQgc3RvcmFnZVwiKVxuXHRcdHRoaXMuc3RvcmFnZS5zZXRQYXNzd29yZChwYXNzd29yZCk7XG5cdH1cblx0Z2V0IHN0b3JhZ2UoKTogdHlwZW9mIHN0b3JhZ2VDbGFzc2VzLlN0b3JhZ2UgfCB1bmRlZmluZWQge1xuXHRcdHJldHVybiB0aGlzLl9zdG9yYWdlO1xuXHR9XG5cblx0b3BlbkZpbGVTdG9yYWdlKGZpbGVOYW1lOiBzdHJpbmcsIHBhc3N3b3JkOiBzdHJpbmcsIGZvbGRlcjogc3RyaW5nID0gJycpIHtcblx0XHRsZXQgc3RvcmFnZSA9IENyZWF0ZVN0b3JhZ2UoKTtcblx0XHRpZiAoZm9sZGVyKVxuXHRcdFx0c3RvcmFnZS5zZXRGb2xkZXIoZm9sZGVyKTtcblx0XHRzdG9yYWdlLnNldEZpbGVOYW1lKGZpbGVOYW1lKTtcblx0XHRzdG9yYWdlLnNldFBhc3N3b3JkKHBhc3N3b3JkKTtcblx0XHR0aGlzLl9zdG9yYWdlID0gc3RvcmFnZTtcblx0fVxuXHQqL1xuXG5cdC8qKlxuXHQgKiBRdWVyaWVzIEFQSSBmb3IgYWRkcmVzc1tdIFVUWE9zLiBBZGRzIHR4IHRvIHRyYW5zYWN0aW9ucyBzdG9yYWdlLiBBbHNvIHNvcnRzIHRoZSBlbnRpcmUgdHJhbnNhY3Rpb24gc2V0LlxuXHQgKiBAcGFyYW0gYWRkcmVzc2VzXG5cdCAqL1xuXHRhc3luYyBmaW5kVXR4b3MoYWRkcmVzc2VzOiBzdHJpbmdbXSwgZGVidWcgPSBmYWxzZSk6IFByb21pc2UgPCB7XG5cdFx0dHhJRDJJbmZvOiBNYXAgPCBzdHJpbmcsXG5cdFx0e1xuXHRcdFx0dXR4b3M6IEFwaS5VdHhvW10sXG5cdFx0XHRhZGRyZXNzOiBzdHJpbmdcblx0XHR9ID4gLFxuXHRcdGFkZHJlc3Nlc1dpdGhVVFhPczogc3RyaW5nW11cblx0fSA+IHtcblx0XHR0aGlzLmxvZ2dlci52ZXJib3NlKGBzY2FubmluZyBVVFhPIGVudHJpZXMgZm9yICR7YWRkcmVzc2VzLmxlbmd0aH0gYWRkcmVzc2VzYCk7XG5cblx0XHRjb25zdCB1dHhvc01hcCA9IGF3YWl0IHRoaXMuYXBpLmdldFV0eG9zQnlBZGRyZXNzZXMoYWRkcmVzc2VzKVxuXG5cdFx0Y29uc3QgYWRkcmVzc2VzV2l0aFVUWE9zOiBzdHJpbmdbXSA9IFtdO1xuXHRcdGNvbnN0IHR4SUQySW5mbyA9IG5ldyBNYXAoKTtcblxuXHRcdGlmIChkZWJ1Zykge1xuXHRcdFx0dXR4b3NNYXAuZm9yRWFjaCgodXR4b3MsIGFkZHJlc3MpID0+IHtcblx0XHRcdFx0Ly8gdXR4b3Muc29ydCgoYiwgYSk9PiBhLmluZGV4LWIuaW5kZXgpXG5cdFx0XHRcdHV0eG9zLm1hcCh0ID0+IHtcblx0XHRcdFx0XHRsZXQgaW5mbyA9IHR4SUQySW5mby5nZXQodC50cmFuc2FjdGlvbklkKTtcblx0XHRcdFx0XHRpZiAoIWluZm8pIHtcblx0XHRcdFx0XHRcdGluZm8gPSB7XG5cdFx0XHRcdFx0XHRcdHV0eG9zOiBbXSxcblx0XHRcdFx0XHRcdFx0YWRkcmVzc1xuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdHR4SUQySW5mby5zZXQodC50cmFuc2FjdGlvbklkLCBpbmZvKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aW5mby51dHhvcy5wdXNoKHQpO1xuXHRcdFx0XHR9KVxuXHRcdFx0fSlcblx0XHR9XG5cblx0XHR1dHhvc01hcC5mb3JFYWNoKCh1dHhvcywgYWRkcmVzcykgPT4ge1xuXHRcdFx0Ly8gdXR4b3Muc29ydCgoYiwgYSk9PiBhLmluZGV4LWIuaW5kZXgpXG5cdFx0XHR0aGlzLmxvZ2dlci52ZXJib3NlKGAke2FkZHJlc3N9IC0gJHt1dHhvcy5sZW5ndGh9IFVUWE8gZW50cmllcyBmb3VuZGApO1xuXHRcdFx0aWYgKHV0eG9zLmxlbmd0aCAhPT0gMCkge1xuICAgICAgICBcdFx0dGhpcy5kaXNhYmxlQmFsYW5jZU5vdGlmaWNhdGlvbnMgPSB0cnVlO1xuXHRcdFx0XHR0aGlzLnV0eG9TZXQudXR4b1N0b3JhZ2VbYWRkcmVzc10gPSB1dHhvcztcblx0XHRcdFx0dGhpcy51dHhvU2V0LmFkZCh1dHhvcywgYWRkcmVzcyk7XG5cdFx0XHRcdGFkZHJlc3Nlc1dpdGhVVFhPcy5wdXNoKGFkZHJlc3MpO1xuXHRcdFx0XHR0aGlzLmRpc2FibGVCYWxhbmNlTm90aWZpY2F0aW9ucyA9IGZhbHNlO1xuXHRcdFx0XHR0aGlzLmVtaXRCYWxhbmNlKCk7XG4gICAgICBcdFx0fVxuXHRcdH0pXG5cblx0XHRjb25zdCBpc0FjdGl2aXR5T25SZWNlaXZlQWRkciA9XG5cdFx0XHR0aGlzLnV0eG9TZXQudXR4b1N0b3JhZ2VbdGhpcy5yZWNlaXZlQWRkcmVzc10gIT09IHVuZGVmaW5lZDtcblx0XHRpZiAoaXNBY3Rpdml0eU9uUmVjZWl2ZUFkZHIpIHtcblx0XHRcdHRoaXMuYWRkcmVzc01hbmFnZXIucmVjZWl2ZUFkZHJlc3MubmV4dCgpO1xuXHRcdH1cblx0XHRyZXR1cm4ge1xuXHRcdFx0YWRkcmVzc2VzV2l0aFVUWE9zLFxuXHRcdFx0dHhJRDJJbmZvXG5cdFx0fTtcblx0fVxuXG5cdFtCQUxBTkNFX0NPTkZJUk1FRF06bnVtYmVyID0gMDtcblx0W0JBTEFOQ0VfUEVORElOR106bnVtYmVyID0gMDtcblx0W0JBTEFOQ0VfVE9UQUxdOm51bWJlciA9IDA7XG5cdGFkanVzdEJhbGFuY2UoaXNDb25maXJtZWQ6Ym9vbGVhbiwgYW1vdW50Om51bWJlciwgbm90aWZ5OmJvb2xlYW49dHJ1ZSl7XG5cdFx0Y29uc3Qge2F2YWlsYWJsZSwgcGVuZGluZ30gPSB0aGlzLmJhbGFuY2U7XG5cdFx0aWYoaXNDb25maXJtZWQpe1xuXHRcdFx0dGhpc1tCQUxBTkNFX0NPTkZJUk1FRF0gKz0gYW1vdW50O1xuXHRcdH1lbHNle1xuXHRcdFx0dGhpc1tCQUxBTkNFX1BFTkRJTkddICs9IGFtb3VudDtcblx0XHR9XG5cblx0XHR0aGlzW0JBTEFOQ0VfVE9UQUxdID0gdGhpc1tCQUxBTkNFX0NPTkZJUk1FRF0gKyB0aGlzW0JBTEFOQ0VfUEVORElOR107XG5cblx0XHRpZihub3RpZnk9PT1mYWxzZSlcblx0XHRcdHJldHVyblxuXHRcdGNvbnN0IHthdmFpbGFibGU6X2F2YWlsYWJsZSwgcGVuZGluZzpfcGVuZGluZ30gPSB0aGlzLmJhbGFuY2U7XG5cdFx0aWYoIXRoaXMuc3luY0luUHJvZ2dyZXNzICYmICF0aGlzLmRpc2FibGVCYWxhbmNlTm90aWZpY2F0aW9ucyAmJiAoYXZhaWxhYmxlIT1fYXZhaWxhYmxlIHx8IHBlbmRpbmchPV9wZW5kaW5nKSlcblx0XHRcdHRoaXMuZW1pdEJhbGFuY2UoKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBFbWl0IHdhbGxldCBiYWxhbmNlLlxuXHQgKi9cblx0bGFzdEJhbGFuY2VOb3RpZmljYXRpb246e2F2YWlsYWJsZTpudW1iZXIsIHBlbmRpbmc6bnVtYmVyfSA9IHthdmFpbGFibGU6MCwgcGVuZGluZzowfVxuXHRlbWl0QmFsYW5jZSgpOiB2b2lkIHtcblx0XHRjb25zdCB7YXZhaWxhYmxlLCBwZW5kaW5nLCB0b3RhbH0gPSB0aGlzLmJhbGFuY2U7XG5cdFx0Y29uc3Qge2F2YWlsYWJsZTpfYXZhaWxhYmxlLCBwZW5kaW5nOl9wZW5kaW5nfSA9IHRoaXMubGFzdEJhbGFuY2VOb3RpZmljYXRpb247XG5cdFx0aWYoYXZhaWxhYmxlPT1fYXZhaWxhYmxlICYmIHBlbmRpbmc9PV9wZW5kaW5nKVxuXHRcdFx0cmV0dXJuXG5cdFx0dGhpcy5sYXN0QmFsYW5jZU5vdGlmaWNhdGlvbiA9IHthdmFpbGFibGUsIHBlbmRpbmd9O1xuXHRcdHRoaXMubG9nZ2VyLmRlYnVnKGBiYWxhbmNlIGF2YWlsYWJsZTogJHthdmFpbGFibGV9IHBlbmRpbmc6ICR7cGVuZGluZ31gKTtcblx0XHR0aGlzLmVtaXQoXCJiYWxhbmNlLXVwZGF0ZVwiLCB7XG5cdFx0XHRhdmFpbGFibGUsXG5cdFx0XHRwZW5kaW5nLFxuXHRcdFx0dG90YWwsXG5cdFx0XHRjb25maXJtZWRVdHhvc0NvdW50OiB0aGlzLnV0eG9TZXQuY29uZmlybWVkQ291bnRcblx0XHR9KTtcblx0fVxuXG5cdGRlYnVnSW5mbzpEZWJ1Z0luZm8gPSB7aW5Vc2VVVFhPczp7c2F0b3NoaXM6MCwgY291bnQ6MH19O1xuXHR1cGRhdGVEZWJ1Z0luZm8oKXtcblx0XHRsZXQgaW5Vc2VVVFhPcyA9IHtzYXRvc2hpczowLCBjb3VudDowfTtcblx0XHRsZXQge2NvbmZpcm1lZCwgcGVuZGluZywgdXNlZH0gPSB0aGlzLnV0eG9TZXQudXR4b3N8fHt9O1xuXHRcdHRoaXMudXR4b1NldC5pblVzZS5tYXAodXR4b0lkID0+IHtcblx0XHRcdGluVXNlVVRYT3Muc2F0b3NoaXMgKz0gY29uZmlybWVkLmdldCh1dHhvSWQpPy5zYXRvc2hpcyB8fFxuXHRcdFx0XHRwZW5kaW5nLmdldCh1dHhvSWQpPy5zYXRvc2hpcyB8fFxuXHRcdFx0XHR1c2VkLmdldCh1dHhvSWQpPy5zYXRvc2hpcyB8fCAwO1xuXHRcdH0pO1xuXHRcdGluVXNlVVRYT3MuY291bnQgPSB0aGlzLnV0eG9TZXQuaW5Vc2UubGVuZ3RoO1xuXHRcdHRoaXMuZGVidWdJbmZvID0ge2luVXNlVVRYT3N9O1xuXHRcdHRoaXMuZW1pdChcImRlYnVnLWluZm9cIiwge2RlYnVnSW5mbzp0aGlzLmRlYnVnSW5mb30pO1xuXHR9XG5cblx0Y2xlYXJVc2VkVVRYT3MoKXtcblx0XHR0aGlzLnV0eG9TZXQuY2xlYXJVc2VkKCk7XG5cdH1cblxuXHRlbWl0Q2FjaGUoKXtcblx0XHRsZXQge2NhY2hlfSA9IHRoaXM7XG5cdFx0dGhpcy5lbWl0KFwic3RhdGUtdXBkYXRlXCIsIHtjYWNoZX0pO1xuXHR9XG5cblx0bGFzdEFkZHJlc3NOb3RpZmljYXRpb246e3JlY2VpdmU/OnN0cmluZywgY2hhbmdlPzpzdHJpbmd9ID0ge307XG5cdGVtaXRBZGRyZXNzKCl7XG5cdFx0Y29uc3QgcmVjZWl2ZSA9IHRoaXMucmVjZWl2ZUFkZHJlc3M7XG5cdFx0Y29uc3QgY2hhbmdlID0gdGhpcy5jaGFuZ2VBZGRyZXNzO1xuXHRcdGxldCB7cmVjZWl2ZTpfcmVjZWl2ZSwgY2hhbmdlOl9jaGFuZ2V9PSB0aGlzLmxhc3RBZGRyZXNzTm90aWZpY2F0aW9uXG5cdFx0aWYocmVjZWl2ZSA9PSBfcmVjZWl2ZSAmJiBjaGFuZ2UgPT0gX2NoYW5nZSlcblx0XHRcdHJldHVyblxuXHRcdHRoaXMubGFzdEFkZHJlc3NOb3RpZmljYXRpb24gPSB7cmVjZWl2ZSwgY2hhbmdlfTtcblx0XHR0aGlzLmVtaXQoXCJuZXctYWRkcmVzc1wiLCB7XG5cdFx0XHRyZWNlaXZlLCBjaGFuZ2Vcblx0XHR9KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBVcGRhdGVzIHRoZSBzZWxlY3RlZCBuZXR3b3JrXG5cdCAqIEBwYXJhbSBuZXR3b3JrIG5hbWUgb2YgdGhlIG5ldHdvcmtcblx0ICovXG5cdGFzeW5jIHVwZGF0ZU5ldHdvcmsobmV0d29yazogU2VsZWN0ZWROZXR3b3JrKTogUHJvbWlzZSA8IHZvaWQgPiB7XG5cdFx0dGhpcy5kZW1vbGlzaFdhbGxldFN0YXRlKG5ldHdvcmsucHJlZml4KTtcblx0XHR0aGlzLm5ldHdvcmsgPSBuZXR3b3JrLnByZWZpeDtcblx0XHR0aGlzLmFwaUVuZHBvaW50ID0gbmV0d29yay5hcGlCYXNlVXJsO1xuXHR9XG5cblx0ZGVtb2xpc2hXYWxsZXRTdGF0ZShuZXR3b3JrUHJlZml4OiBOZXR3b3JrID0gdGhpcy5uZXR3b3JrKTogdm9pZCB7XG5cdFx0dGhpcy51dHhvU2V0LmNsZWFyKCk7XG5cdFx0dGhpcy5hZGRyZXNzTWFuYWdlciA9IG5ldyBBZGRyZXNzTWFuYWdlcih0aGlzLkhEV2FsbGV0LCBuZXR3b3JrUHJlZml4KTtcblx0XHQvL3RoaXMucGVuZGluZ0luZm8udHJhbnNhY3Rpb25zID0ge307XG5cdFx0dGhpcy50cmFuc2FjdGlvbnMgPSB7fTtcblx0XHR0aGlzLnRyYW5zYWN0aW9uc1N0b3JhZ2UgPSB7fTtcblx0fVxuXG5cdGFzeW5jIHNjYW5Nb3JlQWRkcmVzc2VzKGNvdW50PTEwMCwgZGVidWc9ZmFsc2UsIHJlY2VpdmVTdGFydD0tMSwgY2hhbmdlU3RhcnQ9LTEpOiBQcm9taXNlPFNjYW5lTW9yZVJlc3VsdD57XG5cdFx0aWYgKHRoaXMuc3luY0luUHJvZ2dyZXNzKVxuXHRcdFx0cmV0dXJuIHtlcnJvcjogXCJTeW5jIGluIHByb2dyZXNzXCIsIGNvZGU6XCJTWU5DLUlOLVBST0dSRVNTXCJ9O1xuXG5cdFx0aWYocmVjZWl2ZVN0YXJ0IDwgMClcblx0XHRcdHJlY2VpdmVTdGFydCA9IHRoaXMuYWRkcmVzc01hbmFnZXIucmVjZWl2ZUFkZHJlc3MuY291bnRlclxuXG5cdFx0aWYoY2hhbmdlU3RhcnQgPCAwKVxuXHRcdFx0Y2hhbmdlU3RhcnQgPSB0aGlzLmFkZHJlc3NNYW5hZ2VyLmNoYW5nZUFkZHJlc3MuY291bnRlclxuXG5cdFx0dGhpcy5zeW5jSW5Qcm9nZ3Jlc3MgPSB0cnVlO1xuXHRcdHRoaXMuZW1pdChcInNjYW4tbW9yZS1hZGRyZXNzZXMtc3RhcnRlZFwiLCB7cmVjZWl2ZVN0YXJ0LCBjaGFuZ2VTdGFydH0pXG5cdFx0bGV0IGVycm9yID0gZmFsc2U7XG5cdFx0bGV0IHJlcyA9IGF3YWl0IHRoaXMuYWRkcmVzc0Rpc2NvdmVyeSh0aGlzLm9wdGlvbnMuYWRkcmVzc0Rpc2NvdmVyeUV4dGVudCwgZGVidWcsIHJlY2VpdmVTdGFydCwgY2hhbmdlU3RhcnQsIGNvdW50KVxuXHRcdC5jYXRjaChlPT57XG5cdFx0XHR0aGlzLmxvZ2dlci5pbmZvKFwiYWRkcmVzc0Rpc2NvdmVyeTplcnJvclwiLCBlKVxuXHRcdFx0ZXJyb3IgPSBlO1xuXHRcdH0pXG5cblx0XHR0aGlzLnN5bmNJblByb2dncmVzcyA9IGZhbHNlO1xuXHRcdGlmKCF0aGlzLnN5bmNPbmNlKVxuXHRcdFx0dGhpcy51dHhvU2V0LnV0eG9TdWJzY3JpYmUoKTtcblx0XHR0aGlzLmVtaXQoXCJzY2FuLW1vcmUtYWRkcmVzc2VzLWVuZGVkXCIsIHtlcnJvcn0pXG5cblx0XHRpZihlcnJvcilcblx0XHRcdHJldHVybiB7ZXJyb3IsIGNvZGU6XCJBRERSRVNTLURJU0NPVkVSWVwifTtcblxuXHRcdGxldCB7aGlnaGVzdEluZGV4PW51bGwsIGVuZFBvaW50cz1udWxsfSA9IHJlc3x8e307XG5cdFx0dGhpcy5sb2dnZXIuaW5mbyhcInNjYW5Nb3JlQWRkcmVzc2VzOmhpZ2hlc3RJbmRleFwiLCBoaWdoZXN0SW5kZXgpXG5cdFx0dGhpcy5sb2dnZXIuaW5mbyhcInNjYW5Nb3JlQWRkcmVzc2VzOmVuZFBvaW50c1wiLCBlbmRQb2ludHMpXG5cblx0XHR0aGlzLmVtaXQoXCJzY2FuLW1vcmUtYWRkcmVzc2VzLWVuZGVkXCIsIHtcblx0XHRcdHJlY2VpdmVGaW5hbDp0aGlzLmFkZHJlc3NNYW5hZ2VyLnJlY2VpdmVBZGRyZXNzLmNvdW50ZXItMSxcblx0XHRcdGNoYW5nZUZpbmFsOnRoaXMuYWRkcmVzc01hbmFnZXIuY2hhbmdlQWRkcmVzcy5jb3VudGVyLTFcblx0XHR9KVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGNvZGU6XCJTVUNDRVNTXCIsXG5cdFx0XHRyZWNlaXZlOntcblx0XHRcdFx0c3RhcnQ6cmVjZWl2ZVN0YXJ0LFxuXHRcdFx0XHRlbmQ6IGVuZFBvaW50cz8ucmVjZWl2ZXx8cmVjZWl2ZVN0YXJ0K2NvdW50LFxuXHRcdFx0XHRmaW5hbDp0aGlzLmFkZHJlc3NNYW5hZ2VyLnJlY2VpdmVBZGRyZXNzLmNvdW50ZXItMVxuXHRcdFx0fSxcblx0XHRcdGNoYW5nZTp7XG5cdFx0XHRcdHN0YXJ0OmNoYW5nZVN0YXJ0LFxuXHRcdFx0XHRlbmQ6IGVuZFBvaW50cz8uY2hhbmdlfHxjaGFuZ2VTdGFydCtjb3VudCxcblx0XHRcdFx0ZmluYWw6dGhpcy5hZGRyZXNzTWFuYWdlci5jaGFuZ2VBZGRyZXNzLmNvdW50ZXItMVxuXHRcdFx0fVxuXHRcdH07XG5cdH1cblxuXHQvKipcblx0ICogRGVyaXZlcyByZWNlaXZlQWRkcmVzc2VzIGFuZCBjaGFuZ2VBZGRyZXNzZXMgYW5kIGNoZWNrcyB0aGVpciB0cmFuc2FjdGlvbnMgYW5kIFVUWE9zLlxuXHQgKiBAcGFyYW0gdGhyZXNob2xkIHN0b3AgZGlzY292ZXJpbmcgYWZ0ZXIgYHRocmVzaG9sZGAgYWRkcmVzc2VzIHdpdGggbm8gYWN0aXZpdHlcblx0ICovXG5cdGFzeW5jIGFkZHJlc3NEaXNjb3ZlcnkodGhyZXNob2xkID0gNjQsIGRlYnVnID0gZmFsc2UsIHJlY2VpdmVTdGFydD0wLCBjaGFuZ2VTdGFydD0wLCBjb3VudD0wKTogUHJvbWlzZSA8e1xuXHRcdGRlYnVnSW5mbzogTWFwIDxzdHJpbmcsIHt1dHhvczogQXBpLlV0eG9bXSwgYWRkcmVzczogc3RyaW5nfT58bnVsbDtcblx0XHRoaWdoZXN0SW5kZXg6e3JlY2VpdmU6bnVtYmVyLCBjaGFuZ2U6bnVtYmVyfSxcblx0XHRlbmRQb2ludHM6e3JlY2VpdmU6bnVtYmVyLCBjaGFuZ2U6bnVtYmVyfVxuXHR9PiB7XG5cdFx0bGV0IGFkZHJlc3NMaXN0OiBzdHJpbmdbXSA9IFtdO1xuXHRcdGxldCBkZWJ1Z0luZm86IE1hcCA8IHN0cmluZywge3V0eG9zOiBBcGkuVXR4b1tdLCBhZGRyZXNzOiBzdHJpbmd9ID4gfCBudWxsID0gbnVsbDtcblxuXHRcdHRoaXMubG9nZ2VyLmluZm8oYHN5bmMgLi4uIHJ1bm5pbmcgYWRkcmVzcyBkaXNjb3ZlcnksIHRocmVzaG9sZDoke3RocmVzaG9sZH1gKTtcblx0XHRjb25zdCBjYWNoZUluZGV4ZXMgPSB0aGlzLmNhY2hlU3RvcmUuZ2V0QWRkcmVzc0luZGV4ZXMoKT8/e3JlY2VpdmU6MCwgY2hhbmdlOjB9XG5cdFx0dGhpcy5sb2dnZXIuaW5mbyhgc3luYyAuLi5jYWNoZUluZGV4ZXM6IHJlY2VpdmU6JHtjYWNoZUluZGV4ZXMucmVjZWl2ZX0sIGNoYW5nZToke2NhY2hlSW5kZXhlcy5jaGFuZ2V9YCk7XG5cdFx0bGV0IGhpZ2hlc3RJbmRleCA9IHtcblx0XHRcdHJlY2VpdmU6dGhpcy5hZGRyZXNzTWFuYWdlci5yZWNlaXZlQWRkcmVzcy5jb3VudGVyLTEsXG5cdFx0XHRjaGFuZ2U6dGhpcy5hZGRyZXNzTWFuYWdlci5jaGFuZ2VBZGRyZXNzLmNvdW50ZXItMVxuXHRcdH1cblx0XHRsZXQgZW5kUG9pbnRzID0ge1xuXHRcdFx0cmVjZWl2ZTowLFxuXHRcdFx0Y2hhbmdlOjBcblx0XHR9XG5cdFx0bGV0IG1heE9mZnNldCA9IHtcblx0XHRcdHJlY2VpdmU6IHJlY2VpdmVTdGFydCArIGNvdW50LFxuXHRcdFx0Y2hhbmdlOiBjaGFuZ2VTdGFydCArIGNvdW50XG5cdFx0fVxuXG5cdFx0Y29uc3QgZG9EaXNjb3ZlcnkgPSBhc3luYyhcblx0XHRcdG46bnVtYmVyLCBkZXJpdmVUeXBlOidyZWNlaXZlJ3wnY2hhbmdlJywgb2Zmc2V0Om51bWJlclxuXHRcdCk6IFByb21pc2UgPG51bWJlcj4gPT4ge1xuXG5cdFx0XHR0aGlzLmxvZ2dlci5pbmZvKGBzeW5jIC4uLiBzY2FubmluZyAke29mZnNldH0gLSAke29mZnNldCtufSAke2Rlcml2ZVR5cGV9IGFkZHJlc3Nlc2ApO1xuXHRcdFx0dGhpcy5lbWl0KFwic3luYy1wcm9ncmVzc1wiLCB7XG5cdFx0XHRcdHN0YXJ0Om9mZnNldCxcblx0XHRcdFx0ZW5kOm9mZnNldCtuLFxuXHRcdFx0XHRhZGRyZXNzVHlwZTpkZXJpdmVUeXBlXG5cdFx0XHR9KVxuXHRcdFx0Y29uc3QgZGVyaXZlZEFkZHJlc3NlcyA9IHRoaXMuYWRkcmVzc01hbmFnZXIuZ2V0QWRkcmVzc2VzKG4sIGRlcml2ZVR5cGUsIG9mZnNldCk7XG5cdFx0XHRjb25zdCBhZGRyZXNzZXMgPSBkZXJpdmVkQWRkcmVzc2VzLm1hcCgob2JqKSA9PiBvYmouYWRkcmVzcyk7XG5cdFx0XHRhZGRyZXNzTGlzdCA9IFsuLi5hZGRyZXNzTGlzdCwgLi4uYWRkcmVzc2VzXTtcblx0XHRcdHRoaXMubG9nZ2VyLnZlcmJvc2UoXG5cdFx0XHRcdGAke2Rlcml2ZVR5cGV9OiBhZGRyZXNzIGRhdGEgZm9yIGRlcml2ZWQgaW5kaWNlcyAke2Rlcml2ZWRBZGRyZXNzZXNbMF0uaW5kZXh9Li4ke2Rlcml2ZWRBZGRyZXNzZXNbZGVyaXZlZEFkZHJlc3Nlcy5sZW5ndGgtMV0uaW5kZXh9YFxuXHRcdFx0KTtcblx0XHRcdC8vIGlmICh0aGlzLmxvZ2dlckxldmVsID4gMClcblx0XHRcdC8vIFx0dGhpcy5sb2dnZXIudmVyYm9zZShcImFkZHJlc3NEaXNjb3Zlcnk6IGZpbmRVdHhvcyBmb3IgYWRkcmVzc2VzOjpcIiwgYWRkcmVzc2VzKVxuXHRcdFx0Y29uc3Qge2FkZHJlc3Nlc1dpdGhVVFhPcywgdHhJRDJJbmZvfSA9IGF3YWl0IHRoaXMuZmluZFV0eG9zKGFkZHJlc3NlcywgZGVidWcpO1xuXHRcdFx0aWYgKCFkZWJ1Z0luZm8pXG5cdFx0XHRcdGRlYnVnSW5mbyA9IHR4SUQySW5mbztcblx0XHRcdGlmIChhZGRyZXNzZXNXaXRoVVRYT3MubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdC8vIGFkZHJlc3MgZGlzY292ZXJ5IGNvbXBsZXRlXG5cdFx0XHRcdGNvbnN0IGxhc3RBZGRyZXNzSW5kZXhXaXRoVHggPSBoaWdoZXN0SW5kZXhbZGVyaXZlVHlwZV07Ly9vZmZzZXQgLSAodGhyZXNob2xkIC0gbikgLSAxO1xuXHRcdFx0XHR0aGlzLmxvZ2dlci52ZXJib3NlKGAke2Rlcml2ZVR5cGV9OiBhZGRyZXNzIGRpc2NvdmVyeSBjb21wbGV0ZWApO1xuXHRcdFx0XHR0aGlzLmxvZ2dlci52ZXJib3NlKGAke2Rlcml2ZVR5cGV9OiBsYXN0IGFjdGl2aXR5IG9uIGFkZHJlc3MgIyR7bGFzdEFkZHJlc3NJbmRleFdpdGhUeH1gKTtcblx0XHRcdFx0dGhpcy5sb2dnZXIudmVyYm9zZShgJHtkZXJpdmVUeXBlfTogbm8gYWN0aXZpdHkgZnJvbSAke29mZnNldH0uLiR7b2Zmc2V0ICsgbn1gKTtcblx0XHRcdFx0aWYob2Zmc2V0ID49IG1heE9mZnNldFtkZXJpdmVUeXBlXSAmJiBvZmZzZXQgPj0gY2FjaGVJbmRleGVzW2Rlcml2ZVR5cGVdKXtcblx0XHRcdFx0XHRlbmRQb2ludHNbZGVyaXZlVHlwZV0gPSBvZmZzZXQrbjtcblx0XHRcdFx0XHRyZXR1cm4gbGFzdEFkZHJlc3NJbmRleFdpdGhUeDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0Ly8gZWxzZSBrZWVwIGRvaW5nIGRpc2NvdmVyeVxuXHRcdFx0Y29uc3QgaW5kZXggPVxuXHRcdFx0XHRkZXJpdmVkQWRkcmVzc2VzXG5cdFx0XHRcdC5maWx0ZXIoKG9iaikgPT4gYWRkcmVzc2VzV2l0aFVUWE9zLmluY2x1ZGVzKG9iai5hZGRyZXNzKSlcblx0XHRcdFx0LnJlZHVjZSgocHJldiwgY3VyKSA9PiBNYXRoLm1heChwcmV2LCBjdXIuaW5kZXgpLCBoaWdoZXN0SW5kZXhbZGVyaXZlVHlwZV0pO1xuXHRcdFx0aGlnaGVzdEluZGV4W2Rlcml2ZVR5cGVdID0gaW5kZXg7XG5cdFx0XHRyZXR1cm4gZG9EaXNjb3ZlcnkobiwgZGVyaXZlVHlwZSwgb2Zmc2V0ICsgbik7XG5cdFx0fTtcblx0XHRjb25zdCBoaWdoZXN0UmVjZWl2ZUluZGV4ID0gYXdhaXQgZG9EaXNjb3ZlcnkodGhyZXNob2xkLCAncmVjZWl2ZScsIHJlY2VpdmVTdGFydCk7XG5cdFx0Y29uc3QgaGlnaGVzdENoYW5nZUluZGV4ID0gYXdhaXQgZG9EaXNjb3ZlcnkodGhyZXNob2xkLCAnY2hhbmdlJywgY2hhbmdlU3RhcnQpO1xuXHRcdHRoaXMuYWRkcmVzc01hbmFnZXIucmVjZWl2ZUFkZHJlc3MuYWR2YW5jZShoaWdoZXN0UmVjZWl2ZUluZGV4ICsgMSk7XG5cdFx0dGhpcy5hZGRyZXNzTWFuYWdlci5jaGFuZ2VBZGRyZXNzLmFkdmFuY2UoaGlnaGVzdENoYW5nZUluZGV4ICsgMSk7XG5cdFx0dGhpcy5sb2dnZXIudmVyYm9zZShcblx0XHRcdGByZWNlaXZlIGFkZHJlc3MgaW5kZXg6ICR7aGlnaGVzdFJlY2VpdmVJbmRleH07IGNoYW5nZSBhZGRyZXNzIGluZGV4OiAke2hpZ2hlc3RDaGFuZ2VJbmRleH1gLFxuXHRcdFx0YHJlY2VpdmUtYWRkcmVzcy1pbmRleDogJHt0aGlzLmFkZHJlc3NNYW5hZ2VyLnJlY2VpdmVBZGRyZXNzLmNvdW50ZXJ9OyBjaGFuZ2UgYWRkcmVzcyBpbmRleDogJHt0aGlzLmFkZHJlc3NNYW5hZ2VyLmNoYW5nZUFkZHJlc3MuY291bnRlcn1gXG5cdFx0KTtcblxuXHRcdGlmKCF0aGlzLnN5bmNPbmNlICYmICF0aGlzLnN5bmNJblByb2dncmVzcylcblx0XHRcdGF3YWl0IHRoaXMudXR4b1NldC51dHhvU3Vic2NyaWJlKCk7XG5cblx0XHR0aGlzLnJ1blN0YXRlQ2hhbmdlSG9va3MoKTtcblx0XHRsZXQgYWRkcmVzc0luZGV4ZXMgPSB7XG5cdFx0XHRyZWNlaXZlOk1hdGgubWF4KGNhY2hlSW5kZXhlcy5yZWNlaXZlLCB0aGlzLmFkZHJlc3NNYW5hZ2VyLnJlY2VpdmVBZGRyZXNzLmNvdW50ZXIpLFxuXHRcdFx0Y2hhbmdlOk1hdGgubWF4KGNhY2hlSW5kZXhlcy5jaGFuZ2UsIHRoaXMuYWRkcmVzc01hbmFnZXIuY2hhbmdlQWRkcmVzcy5jb3VudGVyKVxuXHRcdH1cblx0XHR0aGlzLmxvZ2dlci5pbmZvKGBzeW5jIC4uLm5ldyBjYWNoZTogcmVjZWl2ZToke2FkZHJlc3NJbmRleGVzLnJlY2VpdmV9LCBjaGFuZ2U6JHthZGRyZXNzSW5kZXhlcy5jaGFuZ2V9YCk7XG5cdFx0dGhpcy5jYWNoZVN0b3JlLnNldEFkZHJlc3NJbmRleGVzKGFkZHJlc3NJbmRleGVzKVxuXHRcdHRoaXMuZW1pdChcInN5bmMtZW5kXCIsIGFkZHJlc3NJbmRleGVzKVxuXHRcdHJldHVybiB7aGlnaGVzdEluZGV4LCBlbmRQb2ludHMsIGRlYnVnSW5mb307XG5cdH1cblxuXHQvLyBUT0RPOiBjb252ZXJ0IGFtb3VudCB0byBzb21waXMgYWthIHNhdG9zaGlzXG5cdC8vIFRPRE86IGJuXG5cdC8qKlxuXHQgKiBDb21wb3NlIGEgc2VyaWFsaXplZCwgc2lnbmVkIHRyYW5zYWN0aW9uXG5cdCAqIEBwYXJhbSBvYmpcblx0ICogQHBhcmFtIG9iai50b0FkZHIgVG8gYWRkcmVzcyBpbiBjYXNoYWRkciBmb3JtYXQgKGUuZy4ga2FzcGF0ZXN0OnFxMGQ2aDBwcmptNW1wZGxkNXBuY3N0M2FkdTB5YW02eGNoNHRyNjlrMilcblx0ICogQHBhcmFtIG9iai5hbW91bnQgQW1vdW50IHRvIHNlbmQgaW4gc29tcGlzICgxMDAwMDAwMDAgKDFlOCkgc29tcGlzIGluIDEgS0FTKVxuXHQgKiBAcGFyYW0gb2JqLmZlZSBGZWUgZm9yIG1pbmVycyBpbiBzb21waXNcblx0ICogQHBhcmFtIG9iai5jaGFuZ2VBZGRyT3ZlcnJpZGUgVXNlIHRoaXMgdG8gb3ZlcnJpZGUgYXV0b21hdGljIGNoYW5nZSBhZGRyZXNzIGRlcml2YXRpb25cblx0ICogQHRocm93cyBpZiBhbW91bnQgaXMgYWJvdmUgYE51bWJlci5NQVhfU0FGRV9JTlRFR0VSYFxuXHQgKi9cblx0Y29tcG9zZVR4KHtcblx0XHR0b0FkZHIsXG5cdFx0YW1vdW50LFxuXHRcdGZlZSA9IERFRkFVTFRfRkVFLFxuXHRcdGNoYW5nZUFkZHJPdmVycmlkZSxcblx0XHRza2lwU2lnbiA9IGZhbHNlLFxuXHRcdHByaXZLZXlzSW5mbyA9IGZhbHNlLFxuXHRcdGNvbXBvdW5kaW5nVVRYTyA9IGZhbHNlLFxuXHRcdGNvbXBvdW5kaW5nVVRYT01heENvdW50ID0gQ09NUE9VTkRfVVRYT19NQVhfQ09VTlRcblx0fTogVHhTZW5kKTogQ29tcG9zZVR4SW5mbyB7XG5cdFx0Ly8gVE9ETzogYm4hXG5cdFx0YW1vdW50ID0gcGFyc2VJbnQoYW1vdW50IGFzIGFueSk7XG5cdFx0ZmVlID0gcGFyc2VJbnQoZmVlIGFzIGFueSk7XG5cdFx0Ly8gaWYgKHRoaXMubG9nZ2VyTGV2ZWwgPiAwKSB7XG5cdFx0Ly8gXHRmb3IgKGxldCBpID0gMDsgaSA8IDEwMDsgaSsrKVxuXHRcdC8vIFx0XHRjb25zb2xlLmxvZygnV2FsbGV0IHRyYW5zYWN0aW9uIHJlcXVlc3QgZm9yJywgYW1vdW50LCB0eXBlb2YgYW1vdW50KTtcblx0XHQvLyB9XG5cdFx0Ly9pZiAoIU51bWJlci5pc1NhZmVJbnRlZ2VyKGFtb3VudCkpIHRocm93IG5ldyBFcnJvcihgQW1vdW50ICR7YW1vdW50fSBpcyB0b28gbGFyZ2VgKTtcblx0XHRsZXQgdXR4b3MsIHV0eG9JZHMsIG1hc3M7XG5cdFx0aWYoY29tcG91bmRpbmdVVFhPKXtcblx0XHRcdCh7dXR4b3MsIHV0eG9JZHMsIGFtb3VudCwgbWFzc30gPSB0aGlzLnV0eG9TZXQuY29sbGVjdFV0eG9zKGNvbXBvdW5kaW5nVVRYT01heENvdW50KSk7XG5cdFx0fWVsc2V7XG5cdFx0XHQoe3V0eG9zLCB1dHhvSWRzLCBtYXNzfSA9IHRoaXMudXR4b1NldC5zZWxlY3RVdHhvcyhhbW91bnQgKyBmZWUpKTtcblx0XHR9XG5cdFx0Ly9pZihtYXNzID4gV2FsbGV0Lk1heE1hc3NVVFhPcyl7XG5cdFx0Ly9cdHRocm93IG5ldyBFcnJvcihgTWF4aW11bSBudW1iZXIgb2YgaW5wdXRzIChVVFhPcykgcmVhY2hlZC4gUGxlYXNlIHJlZHVjZSB0aGlzIHRyYW5zYWN0aW9uIGFtb3VudC5gKTtcblx0XHQvL31cblx0XHRjb25zdCBwcml2S2V5cyA9IHV0eG9zLnJlZHVjZSgocHJldjogc3RyaW5nW10sIGN1cjpVbnNwZW50T3V0cHV0KSA9PiB7XG5cdFx0XHRyZXR1cm4gW3RoaXMuYWRkcmVzc01hbmFnZXIuYWxsW1N0cmluZyhjdXIuYWRkcmVzcyldLCAuLi5wcmV2XSBhcyBzdHJpbmdbXTtcblx0XHR9LCBbXSk7XG5cblx0XHR0aGlzLmxvZ2dlci5pbmZvKFwidXR4b3MubGVuZ3RoXCIsIHV0eG9zLmxlbmd0aClcblxuXHRcdGNvbnN0IGNoYW5nZUFkZHIgPSBjaGFuZ2VBZGRyT3ZlcnJpZGUgfHwgdGhpcy5hZGRyZXNzTWFuYWdlci5jaGFuZ2VBZGRyZXNzLm5leHQoKTtcblx0XHR0cnkge1xuXHRcdFx0Y29uc3QgdHg6IGthc3BhY29yZS5UcmFuc2FjdGlvbiA9IG5ldyBrYXNwYWNvcmUuVHJhbnNhY3Rpb24oKVxuXHRcdFx0XHQuZnJvbSh1dHhvcylcblx0XHRcdFx0LnRvKHRvQWRkciwgYW1vdW50KVxuXHRcdFx0XHQuc2V0VmVyc2lvbigwKVxuXHRcdFx0XHQuZmVlKGZlZSlcblx0XHRcdFx0LmNoYW5nZShjaGFuZ2VBZGRyKVxuXHRcdFx0aWYoIXNraXBTaWduKVxuXHRcdFx0XHR0eC5zaWduKHByaXZLZXlzLCBrYXNwYWNvcmUuY3J5cHRvLlNpZ25hdHVyZS5TSUdIQVNIX0FMTCwgJ3NjaG5vcnInKTtcblxuXHRcdFx0Ly93aW5kb3cudHh4eHggPSB0eDtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdHR4OiB0eCxcblx0XHRcdFx0aWQ6IHR4LmlkLFxuXHRcdFx0XHRyYXdUeDogdHgudG9TdHJpbmcoKSxcblx0XHRcdFx0dXR4b0lkcyxcblx0XHRcdFx0YW1vdW50LFxuXHRcdFx0XHRmZWUsXG5cdFx0XHRcdHV0eG9zLFxuXHRcdFx0XHR0b0FkZHIsXG5cdFx0XHRcdHByaXZLZXlzOiBwcml2S2V5c0luZm8/cHJpdktleXM6W11cblx0XHRcdH07XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0Y29uc29sZS5sb2coXCJjb21wb3NlVHg6ZXJyb3JcIiwgZSlcblx0XHRcdC8vICEhISBGSVhNRVxuXHRcdFx0aWYoIWNoYW5nZUFkZHJPdmVycmlkZSlcblx0XHRcdFx0dGhpcy5hZGRyZXNzTWFuYWdlci5jaGFuZ2VBZGRyZXNzLnJldmVyc2UoKTtcblx0XHRcdHRocm93IGU7XG5cdFx0fVxuXHR9XG5cblx0bWluaW11bVJlcXVpcmVkVHJhbnNhY3Rpb25SZWxheUZlZShtYXNzOm51bWJlcik6bnVtYmVye1xuXHRcdGxldCBtaW5pbXVtRmVlID0gKG1hc3MgKiB0aGlzLm9wdGlvbnMubWluaW11bVJlbGF5VHJhbnNhY3Rpb25GZWUpIC8gMTAwMFxuXG5cdFx0aWYgKG1pbmltdW1GZWUgPT0gMCAmJiB0aGlzLm9wdGlvbnMubWluaW11bVJlbGF5VHJhbnNhY3Rpb25GZWUgPiAwKSB7XG5cdFx0XHRtaW5pbXVtRmVlID0gdGhpcy5vcHRpb25zLm1pbmltdW1SZWxheVRyYW5zYWN0aW9uRmVlXG5cdFx0fVxuXG5cdFx0Ly8gU2V0IHRoZSBtaW5pbXVtIGZlZSB0byB0aGUgbWF4aW11bSBwb3NzaWJsZSB2YWx1ZSBpZiB0aGUgY2FsY3VsYXRlZFxuXHRcdC8vIGZlZSBpcyBub3QgaW4gdGhlIHZhbGlkIHJhbmdlIGZvciBtb25ldGFyeSBhbW91bnRzLlxuXHRcdGlmIChtaW5pbXVtRmVlID4gTWF4U29tcGkpIHtcblx0XHRcdG1pbmltdW1GZWUgPSBNYXhTb21waVxuXHRcdH1cblxuXHRcdHJldHVybiBtaW5pbXVtRmVlXG5cdH1cblxuXHQvKlxuXHR2YWxpZGF0ZUFkZHJlc3MoYWRkcjpzdHJpbmcpOmJvb2xlYW57XG5cdFx0bGV0IGFkZHJlc3MgPSBuZXcga2FzcGFjb3JlLkFkZHJlc3MoYWRkcik7XG5cdFx0cmV0dXJuIGFkZHJlc3MudHlwZSA9PSBcInB1YmtleVwiO1xuXHR9XG5cdCovXG5cblx0LyoqXG5cdCAqIEVzdGltYXRlIHRyYW5zYWN0aW9uIGZlZS4gUmV0dXJucyB0cmFuc2FjdGlvbiBkYXRhLlxuXHQgKiBAcGFyYW0gdHhQYXJhbXNcblx0ICogQHBhcmFtIHR4UGFyYW1zLnRvQWRkciBUbyBhZGRyZXNzIGluIGNhc2hhZGRyIGZvcm1hdCAoZS5nLiBrYXNwYXRlc3Q6cXEwZDZoMHByam01bXBkbGQ1cG5jc3QzYWR1MHlhbTZ4Y2g0dHI2OWsyKVxuXHQgKiBAcGFyYW0gdHhQYXJhbXMuYW1vdW50IEFtb3VudCB0byBzZW5kIGluIHNvbXBpcyAoMTAwMDAwMDAwICgxZTgpIHNvbXBpcyBpbiAxIEtBUylcblx0ICogQHBhcmFtIHR4UGFyYW1zLmZlZSBGZWUgZm9yIG1pbmVycyBpbiBzb21waXNcblx0ICogQHRocm93cyBgRmV0Y2hFcnJvcmAgaWYgZW5kcG9pbnQgaXMgZG93bi4gQVBJIGVycm9yIG1lc3NhZ2UgaWYgdHggZXJyb3IuIEVycm9yIGlmIGFtb3VudCBpcyB0b28gbGFyZ2UgdG8gYmUgcmVwcmVzZW50ZWQgYXMgYSBqYXZhc2NyaXB0IG51bWJlci5cblx0ICovXG5cdGFzeW5jIGVzdGltYXRlVHJhbnNhY3Rpb24odHhQYXJhbXNBcmc6IFR4U2VuZCk6IFByb21pc2UgPCBUeEluZm8gPiB7XG5cdFx0bGV0IGFkZHJlc3MgPSB0aGlzLmFkZHJlc3NNYW5hZ2VyLmNoYW5nZUFkZHJlc3MuY3VycmVudC5hZGRyZXNzO1xuXHRcdGlmKCFhZGRyZXNzKXtcblx0XHRcdGFkZHJlc3MgPSB0aGlzLmFkZHJlc3NNYW5hZ2VyLmNoYW5nZUFkZHJlc3MubmV4dCgpO1xuXHRcdH1cblx0XHR0eFBhcmFtc0FyZy5jaGFuZ2VBZGRyT3ZlcnJpZGUgPSBhZGRyZXNzO1xuXHRcdHJldHVybiB0aGlzLmNvbXBvc2VUeEFuZE5ldHdvcmtGZWVJbmZvKHR4UGFyYW1zQXJnKTtcblx0fVxuXHRhc3luYyBjb21wb3NlVHhBbmROZXR3b3JrRmVlSW5mbyh0eFBhcmFtc0FyZzogVHhTZW5kKTogUHJvbWlzZSA8IFR4SW5mbyA+e1xuXHRcdGF3YWl0IHRoaXMud2FpdE9yU3luYygpO1xuXHRcdGlmKCF0eFBhcmFtc0FyZy5mZWUpXG5cdFx0XHR0eFBhcmFtc0FyZy5mZWUgPSAwO1xuXHRcdHRoaXMubG9nZ2VyLmluZm8oYHR4IC4uLiBzZW5kaW5nIHRvICR7dHhQYXJhbXNBcmcudG9BZGRyfWApXG5cdFx0dGhpcy5sb2dnZXIuaW5mbyhgdHggLi4uIGFtb3VudDogJHtLQVModHhQYXJhbXNBcmcuYW1vdW50KX0gdXNlciBmZWU6ICR7S0FTKHR4UGFyYW1zQXJnLmZlZSl9IG1heCBkYXRhIGZlZTogJHtLQVModHhQYXJhbXNBcmcubmV0d29ya0ZlZU1heHx8MCl9YClcblxuXHRcdC8vaWYoIXRoaXMudmFsaWRhdGVBZGRyZXNzKHR4UGFyYW1zQXJnLnRvQWRkcikpe1xuXHRcdC8vXHR0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIGFkZHJlc3NcIilcblx0XHQvL31cblxuXHRcdGxldCB0eFBhcmFtcyA6IFR4U2VuZCA9IHsgLi4udHhQYXJhbXNBcmcgfSBhcyBUeFNlbmQ7XG5cdFx0Y29uc3QgbmV0d29ya0ZlZU1heCA9IHR4UGFyYW1zLm5ldHdvcmtGZWVNYXggfHwgMDtcblx0XHRsZXQgY2FsY3VsYXRlTmV0d29ya0ZlZSA9ICEhdHhQYXJhbXMuY2FsY3VsYXRlTmV0d29ya0ZlZTtcblx0XHRsZXQgaW5jbHVzaXZlRmVlID0gISF0eFBhcmFtcy5pbmNsdXNpdmVGZWU7XG5cdFx0Y29uc3Qge3NraXBTaWduPXRydWUsIHByaXZLZXlzSW5mbz1mYWxzZX0gPSB0eFBhcmFtcztcblx0XHR0eFBhcmFtcy5za2lwU2lnbiA9IHNraXBTaWduO1xuXHRcdHR4UGFyYW1zLnByaXZLZXlzSW5mbyA9IHByaXZLZXlzSW5mbztcblxuXHRcdC8vY29uc29sZS5sb2coXCJjYWxjdWxhdGVOZXR3b3JrRmVlOlwiLCBjYWxjdWxhdGVOZXR3b3JrRmVlLCBcImluY2x1c2l2ZUZlZTpcIiwgaW5jbHVzaXZlRmVlKVxuXG5cdFx0bGV0IGRhdGEgPSB0aGlzLmNvbXBvc2VUeCh0eFBhcmFtcyk7XG5cdFx0XG5cdFx0bGV0IHt0eFNpemUsIG1hc3N9ID0gZGF0YS50eC5nZXRNYXNzQW5kU2l6ZSgpO1xuXHRcdGxldCBkYXRhRmVlID0gdGhpcy5taW5pbXVtUmVxdWlyZWRUcmFuc2FjdGlvblJlbGF5RmVlKG1hc3MpO1xuXHRcdGNvbnN0IHByaW9yaXR5RmVlID0gdHhQYXJhbXNBcmcuZmVlO1xuXG5cdFx0aWYodHhQYXJhbXNBcmcuY29tcG91bmRpbmdVVFhPKXtcblx0XHRcdGluY2x1c2l2ZUZlZSA9IHRydWU7XG5cdFx0XHRjYWxjdWxhdGVOZXR3b3JrRmVlID0gdHJ1ZTtcblx0XHRcdHR4UGFyYW1zQXJnLmFtb3VudCA9IGRhdGEuYW1vdW50O1xuXHRcdFx0dHhQYXJhbXMuYW1vdW50ID0gZGF0YS5hbW91bnQ7XG5cdFx0XHR0eFBhcmFtcy5jb21wb3VuZGluZ1VUWE8gPSBmYWxzZTtcblx0XHR9XG5cblx0XHRjb25zdCB0eEFtb3VudCA9IHR4UGFyYW1zQXJnLmFtb3VudDtcblx0XHRsZXQgYW1vdW50UmVxdWVzdGVkID0gdHhQYXJhbXNBcmcuYW1vdW50K3ByaW9yaXR5RmVlO1xuXG5cdFx0bGV0IGFtb3VudEF2YWlsYWJsZSA9IGRhdGEudXR4b3MubWFwKHV0eG89PnV0eG8uc2F0b3NoaXMpLnJlZHVjZSgoYSxiKT0+YStiLDApO1xuXHRcdHRoaXMubG9nZ2VyLnZlcmJvc2UoYHR4IC4uLiBuZWVkIGRhdGEgZmVlOiAke0tBUyhkYXRhRmVlKX0gdG90YWwgbmVlZGVkOiAke0tBUyhhbW91bnRSZXF1ZXN0ZWQrZGF0YUZlZSl9YClcblx0XHR0aGlzLmxvZ2dlci52ZXJib3NlKGB0eCAuLi4gYXZhaWxhYmxlOiAke0tBUyhhbW91bnRBdmFpbGFibGUpfSBpbiAke2RhdGEudXR4b3MubGVuZ3RofSBVVFhPc2ApXG5cblx0XHRpZihuZXR3b3JrRmVlTWF4ICYmIGRhdGFGZWUgPiBuZXR3b3JrRmVlTWF4KSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoYEZlZSBtYXggaXMgJHtuZXR3b3JrRmVlTWF4fSBidXQgdGhlIG1pbmltdW0gZmVlIHJlcXVpcmVkIGZvciB0aGlzIHRyYW5zYWN0aW9uIGlzICR7S0FTKGRhdGFGZWUpfSBLQVNgKTtcblx0XHR9XG5cblx0XHRpZihjYWxjdWxhdGVOZXR3b3JrRmVlKXtcblx0XHRcdGRvIHtcblx0XHRcdFx0Ly9jb25zb2xlLmxvZyhgaW5zdWZmaWNpZW50IGRhdGEgZmVlcy4uLiBpbmNyZW1lbnRpbmcgYnkgJHtkYXRhRmVlfWApO1xuXHRcdFx0XHR0eFBhcmFtcy5mZWUgPSBwcmlvcml0eUZlZStkYXRhRmVlO1xuXHRcdFx0XHRpZihpbmNsdXNpdmVGZWUpe1xuXHRcdFx0XHRcdHR4UGFyYW1zLmFtb3VudCA9IHR4QW1vdW50LXR4UGFyYW1zLmZlZTtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLmxvZ2dlci52ZXJib3NlKGB0eCAuLi4gaW5zdWZmaWNpZW50IGRhdGEgZmVlIGZvciB0cmFuc2FjdGlvbiBzaXplIG9mICR7dHhTaXplfSBieXRlc2ApO1xuXHRcdFx0XHR0aGlzLmxvZ2dlci52ZXJib3NlKGB0eCAuLi4gbmVlZCBkYXRhIGZlZTogJHtLQVMoZGF0YUZlZSl9IGZvciAke2RhdGEudXR4b3MubGVuZ3RofSBVVFhPc2ApO1xuXHRcdFx0XHR0aGlzLmxvZ2dlci52ZXJib3NlKGB0eCAuLi4gcmVidWlsZGluZyB0cmFuc2FjdGlvbiB3aXRoIGFkZGl0aW9uYWwgaW5wdXRzYCk7XG5cdFx0XHRcdGxldCB1dHhvTGVuID0gZGF0YS51dHhvcy5sZW5ndGg7XG5cdFx0XHRcdHRoaXMubG9nZ2VyLmRlYnVnKGBmaW5hbCBmZWUgJHt0eFBhcmFtcy5mZWV9YCk7XG5cdFx0XHRcdGRhdGEgPSB0aGlzLmNvbXBvc2VUeCh0eFBhcmFtcyk7XG5cdFx0XHRcdCh7dHhTaXplLCBtYXNzfSA9IGRhdGEudHguZ2V0TWFzc0FuZFNpemUoKSk7XG5cdFx0XHRcdGRhdGFGZWUgPSB0aGlzLm1pbmltdW1SZXF1aXJlZFRyYW5zYWN0aW9uUmVsYXlGZWUobWFzcyk7XG5cdFx0XHRcdGlmKGRhdGEudXR4b3MubGVuZ3RoICE9IHV0eG9MZW4pXG5cdFx0XHRcdFx0dGhpcy5sb2dnZXIudmVyYm9zZShgdHggLi4uIGFnZ3JlZ2F0aW5nOiAke2RhdGEudXR4b3MubGVuZ3RofSBVVFhPc2ApO1xuXG5cdFx0XHR9IHdoaWxlKCghbmV0d29ya0ZlZU1heCB8fCB0eFBhcmFtcy5mZWUgPD0gbmV0d29ya0ZlZU1heCkgJiYgdHhQYXJhbXMuZmVlIDwgZGF0YUZlZStwcmlvcml0eUZlZSk7XG5cblx0XHRcdGlmKG5ldHdvcmtGZWVNYXggJiYgdHhQYXJhbXMuZmVlID4gbmV0d29ya0ZlZU1heClcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKGBNYXhpbXVtIG5ldHdvcmsgZmVlIGV4Y2VlZGVkOyBuZWVkOiAke0tBUyhkYXRhRmVlKX0gS0FTIG1heGltdW0gaXM6ICR7S0FTKG5ldHdvcmtGZWVNYXgpfSBLQVNgKTtcblxuXHRcdH1lbHNlIGlmKGRhdGFGZWUgPiBwcmlvcml0eUZlZSl7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoYE1pbmltdW0gZmVlIHJlcXVpcmVkIGZvciB0aGlzIHRyYW5zYWN0aW9uIGlzICR7S0FTKGRhdGFGZWUpfSBLQVNgKTtcblx0XHR9ZWxzZSBpZihpbmNsdXNpdmVGZWUpe1xuXHRcdFx0dHhQYXJhbXMuYW1vdW50IC09IHR4UGFyYW1zLmZlZTtcblx0XHRcdGRhdGEgPSB0aGlzLmNvbXBvc2VUeCh0eFBhcmFtcyk7XG5cdFx0fVxuXG5cdFx0ZGF0YS5kYXRhRmVlID0gZGF0YUZlZTtcblx0XHRkYXRhLnRvdGFsQW1vdW50ID0gdHhQYXJhbXMuZmVlK3R4UGFyYW1zLmFtb3VudDtcblx0XHRkYXRhLnR4U2l6ZSA9IHR4U2l6ZTtcblx0XHRkYXRhLm5vdGUgPSB0eFBhcmFtc0FyZy5ub3RlfHxcIlwiO1xuXG5cdFx0cmV0dXJuIGRhdGEgYXMgVHhJbmZvXG5cdH1cblxuXHQvKipcblx0ICogQnVpbGQgYSB0cmFuc2FjdGlvbi4gUmV0dXJucyB0cmFuc2FjdGlvbiBpbmZvLlxuXHQgKiBAcGFyYW0gdHhQYXJhbXNcblx0ICogQHBhcmFtIHR4UGFyYW1zLnRvQWRkciBUbyBhZGRyZXNzIGluIGNhc2hhZGRyIGZvcm1hdCAoZS5nLiBrYXNwYXRlc3Q6cXEwZDZoMHByam01bXBkbGQ1cG5jc3QzYWR1MHlhbTZ4Y2g0dHI2OWsyKVxuXHQgKiBAcGFyYW0gdHhQYXJhbXMuYW1vdW50IEFtb3VudCB0byBzZW5kIGluIHNvbXBpcyAoMTAwMDAwMDAwICgxZTgpIHNvbXBpcyBpbiAxIEtBUylcblx0ICogQHBhcmFtIHR4UGFyYW1zLmZlZSBGZWUgZm9yIG1pbmVycyBpbiBzb21waXNcblx0ICogQHRocm93cyBgRmV0Y2hFcnJvcmAgaWYgZW5kcG9pbnQgaXMgZG93bi4gQVBJIGVycm9yIG1lc3NhZ2UgaWYgdHggZXJyb3IuIEVycm9yIGlmIGFtb3VudCBpcyB0b28gbGFyZ2UgdG8gYmUgcmVwcmVzZW50ZWQgYXMgYSBqYXZhc2NyaXB0IG51bWJlci5cblx0ICovXG5cdGFzeW5jIGJ1aWxkVHJhbnNhY3Rpb24odHhQYXJhbXNBcmc6IFR4U2VuZCwgZGVidWcgPSBmYWxzZSk6IFByb21pc2UgPCBCdWlsZFR4UmVzdWx0ID4ge1xuXHRcdGNvbnN0IHRzMCA9IERhdGUubm93KCk7XG5cdFx0dHhQYXJhbXNBcmcuc2tpcFNpZ24gPSB0cnVlO1xuXHRcdHR4UGFyYW1zQXJnLnByaXZLZXlzSW5mbyA9IHRydWU7XG5cdFx0Y29uc3QgZGF0YSA9IGF3YWl0IHRoaXMuY29tcG9zZVR4QW5kTmV0d29ya0ZlZUluZm8odHhQYXJhbXNBcmcpO1xuXHRcdGNvbnN0IHsgXG5cdFx0XHRpZCwgdHgsIHV0eG9zLCB1dHhvSWRzLCBhbW91bnQsIHRvQWRkcixcblx0XHRcdGZlZSwgZGF0YUZlZSwgdG90YWxBbW91bnQsIHR4U2l6ZSwgbm90ZSwgcHJpdktleXNcblx0XHR9ID0gZGF0YTtcblxuXHRcdGNvbnN0IHRzXzAgPSBEYXRlLm5vdygpO1xuXHRcdHR4LnNpZ24ocHJpdktleXMsIGthc3BhY29yZS5jcnlwdG8uU2lnbmF0dXJlLlNJR0hBU0hfQUxMLCAnc2Nobm9ycicpO1xuXHRcdGNvbnN0IHttYXNzOnR4TWFzc30gPSB0eC5nZXRNYXNzQW5kU2l6ZSgpO1xuXHRcdHRoaXMubG9nZ2VyLmluZm8oXCJ0eE1hc3NcIiwgdHhNYXNzKVxuXHRcdGlmKHR4TWFzcyA+IFdhbGxldC5NYXhNYXNzQWNjZXB0ZWRCeUJsb2NrKXtcblx0XHRcdHRocm93IG5ldyBFcnJvcihgVHJhbnNhY3Rpb24gc2l6ZS9tYXNzIGxpbWl0IHJlYWNoZWQuIFBsZWFzZSByZWR1Y2UgdGhpcyB0cmFuc2FjdGlvbiBhbW91bnQuIChNYXNzOiAke3R4TWFzc30pYCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgdHNfMSA9IERhdGUubm93KCk7XG5cdFx0Ly9jb25zdCByYXdUeCA9IHR4LnRvU3RyaW5nKCk7XG5cdFx0Y29uc3QgdHNfMiA9IERhdGUubm93KCk7XG5cblxuXHRcdHRoaXMubG9nZ2VyLmluZm8oYHR4IC4uLiByZXF1aXJlZCBkYXRhIGZlZTogJHtLQVMoZGF0YUZlZSl9ICgke3V0eG9zLmxlbmd0aH0gVVRYT3MpYCk7Ly8gKCR7S0FTKHR4UGFyYW1zQXJnLmZlZSl9KyR7S0FTKGRhdGFGZWUpfSlgKTtcblx0XHQvL3RoaXMubG9nZ2VyLnZlcmJvc2UoYHR4IC4uLiBmaW5hbCBmZWU6ICR7S0FTKGRhdGFGZWUrdHhQYXJhbXNBcmcuZmVlKX0gKCR7S0FTKHR4UGFyYW1zQXJnLmZlZSl9KyR7S0FTKGRhdGFGZWUpfSlgKTtcblx0XHR0aGlzLmxvZ2dlci5pbmZvKGB0eCAuLi4gcmVzdWx0aW5nIHRvdGFsOiAke0tBUyh0b3RhbEFtb3VudCl9YCk7XG5cblxuXHRcdC8vY29uc29sZS5sb2codXR4b3MpO1xuXG5cdFx0aWYgKGRlYnVnIHx8IHRoaXMubG9nZ2VyTGV2ZWwgPiAwKSB7XG5cdFx0XHR0aGlzLmxvZ2dlci5kZWJ1ZyhcInN1Ym1pdFRyYW5zYWN0aW9uOiBlc3RpbWF0ZVR4XCIsIGRhdGEpXG5cdFx0XHR0aGlzLmxvZ2dlci5kZWJ1ZyhcInNlbmRUeDp1dHhvc1wiLCB1dHhvcylcblx0XHRcdHRoaXMubG9nZ2VyLmRlYnVnKFwiOjp1dHhvc1swXS5zY3JpcHQ6OlwiLCB1dHhvc1swXS5zY3JpcHQpXG5cdFx0XHQvL2NvbnNvbGUubG9nKFwiOjp1dHhvc1swXS5hZGRyZXNzOjpcIiwgdXR4b3NbMF0uYWRkcmVzcylcblx0XHR9XG5cblx0XHRjb25zdCB7bkxvY2tUaW1lOiBsb2NrVGltZSwgdmVyc2lvbiB9ID0gdHg7XG5cblx0XHRpZiAoZGVidWcgfHwgdGhpcy5sb2dnZXJMZXZlbCA+IDApXG5cdFx0XHR0aGlzLmxvZ2dlci5kZWJ1ZyhcImNvbXBvc2VUeDp0eFwiLCBcInR4U2l6ZTpcIiwgdHhTaXplKVxuXG5cdFx0Y29uc3QgdHNfMyA9IERhdGUubm93KCk7XG5cdFx0Y29uc3QgaW5wdXRzOiBSUEMuVHJhbnNhY3Rpb25JbnB1dFtdID0gdHguaW5wdXRzLm1hcCgoaW5wdXQ6IGthc3BhY29yZS5UcmFuc2FjdGlvbi5JbnB1dCkgPT4ge1xuXHRcdFx0aWYgKGRlYnVnIHx8IHRoaXMubG9nZ2VyTGV2ZWwgPiAwKSB7XG5cdFx0XHRcdHRoaXMubG9nZ2VyLmRlYnVnKFwiaW5wdXQuc2NyaXB0Lmluc3BlY3RcIiwgaW5wdXQuc2NyaXB0Lmluc3BlY3QoKSlcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0cHJldmlvdXNPdXRwb2ludDoge1xuXHRcdFx0XHRcdHRyYW5zYWN0aW9uSWQ6IGlucHV0LnByZXZUeElkLnRvU3RyaW5nKFwiaGV4XCIpLFxuXHRcdFx0XHRcdGluZGV4OiBpbnB1dC5vdXRwdXRJbmRleFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaWduYXR1cmVTY3JpcHQ6IGlucHV0LnNjcmlwdC50b0J1ZmZlcigpLnRvU3RyaW5nKFwiaGV4XCIpLFxuXHRcdFx0XHRzZXF1ZW5jZTogaW5wdXQuc2VxdWVuY2VOdW1iZXIsXG5cdFx0XHRcdHNpZ09wQ291bnQ6MVxuXHRcdFx0fTtcblx0XHR9KVxuXHRcdGNvbnN0IHRzXzQgPSBEYXRlLm5vdygpO1xuXHRcdGNvbnN0IG91dHB1dHM6IFJQQy5UcmFuc2FjdGlvbk91dHB1dFtdID0gdHgub3V0cHV0cy5tYXAoKG91dHB1dDoga2FzcGFjb3JlLlRyYW5zYWN0aW9uLk91dHB1dCkgPT4ge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0YW1vdW50OiBvdXRwdXQuc2F0b3NoaXMsXG5cdFx0XHRcdHNjcmlwdFB1YmxpY0tleToge1xuXHRcdFx0XHRcdHNjcmlwdFB1YmxpY0tleTogb3V0cHV0LnNjcmlwdC50b0J1ZmZlcigpLnRvU3RyaW5nKFwiaGV4XCIpLFxuXHRcdFx0XHRcdHZlcnNpb246IDBcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cdFx0Y29uc3QgdHNfNSA9IERhdGUubm93KCk7XG5cblx0XHQvL2NvbnN0IHBheWxvYWRTdHIgPSBcIjAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDBcIjtcblx0XHQvL2NvbnN0IHBheWxvYWQgPSBCdWZmZXIuZnJvbShwYXlsb2FkU3RyKS50b1N0cmluZyhcImJhc2U2NFwiKTtcblx0XHQvL2NvbnNvbGUubG9nKFwicGF5bG9hZC1oZXg6XCIsIEJ1ZmZlci5mcm9tKHBheWxvYWRTdHIpLnRvU3RyaW5nKFwiaGV4XCIpKVxuXHRcdC8vQCB0cy1pZ25vcmVcblx0XHQvL2NvbnN0IHBheWxvYWRIYXNoID0ga2FzcGFjb3JlLmNyeXB0by5IYXNoLnNoYTI1NnNoYTI1NihCdWZmZXIuZnJvbShwYXlsb2FkU3RyKSk7XG5cdFx0Y29uc3QgcnBjVFg6IFJQQy5TdWJtaXRUcmFuc2FjdGlvblJlcXVlc3QgPSB7XG5cdFx0XHR0cmFuc2FjdGlvbjoge1xuXHRcdFx0XHR2ZXJzaW9uLFxuXHRcdFx0XHRpbnB1dHMsXG5cdFx0XHRcdG91dHB1dHMsXG5cdFx0XHRcdGxvY2tUaW1lLFxuXHRcdFx0XHQvL3BheWxvYWQ6J2YwMGYwMDAwMDAwMDAwMDAwMDAwMTk3NmE5MTQ3ODRiZjRjMjU2MmYzOGZlMGM0OWQxZTA1MzhjZWU0NDEwZDM3ZTA5ODhhYycsXG5cdFx0XHRcdHBheWxvYWRIYXNoOiAnMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMCcsXG5cdFx0XHRcdC8vcGF5bG9hZEhhc2g6J2FmZTdmYzZmZTMyODhlNzlmOWEwYzA1YzIyYzFlYWQyYWFlMjliNmRhMDE5OWQ3YjQzNjI4YzI1ODhlMjk2ZjknLFxuXHRcdFx0XHQvL1xuXHRcdFx0XHRzdWJuZXR3b3JrSWQ6IHRoaXMuc3VibmV0d29ya0lkLCAvL0J1ZmZlci5mcm9tKHRoaXMuc3VibmV0d29ya0lkLCBcImhleFwiKS50b1N0cmluZyhcImJhc2U2NFwiKSxcblx0XHRcdFx0ZmVlLFxuXHRcdFx0XHQvL2dhczogMFxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vY29uc3QgcnBjdHggPSBKU09OLnN0cmluZ2lmeShycGNUWCwgbnVsbCwgXCIgIFwiKTtcblxuXHRcdGNvbnN0IHRzMSA9IERhdGUubm93KCk7XG5cdFx0dGhpcy5sb2dnZXIuaW5mbyhgdHggLi4uIGdlbmVyYXRpb24gdGltZSAkeygodHMxLXRzMCkvMTAwMCkudG9GaXhlZCgyKX0gc2VjYClcblxuXHRcdGlmIChkZWJ1ZyB8fCB0aGlzLmxvZ2dlckxldmVsID4gMCkge1xuXHRcdFx0dGhpcy5sb2dnZXIuZGVidWcoYHJwY1RYICR7SlNPTi5zdHJpbmdpZnkocnBjVFgsIG51bGwsIFwiICBcIil9YClcblx0XHRcdHRoaXMubG9nZ2VyLmRlYnVnKGBycGNUWCAke0pTT04uc3RyaW5naWZ5KHJwY1RYKX1gKVxuXHRcdH1cblxuXHRcdGNvbnN0IHRzXzYgPSBEYXRlLm5vdygpO1xuXG5cdFx0dGhpcy5sb2dnZXIuaW5mbyhgdGltZSBpbiBtc2VjYCwge1xuXHRcdFx0XCJ0b3RhbFwiOiB0c182LXRzMCxcblx0XHRcdFwiZXN0aW1hdGUtdHJhbnNhY3Rpb25cIjogdHNfMC10czAsXG5cdFx0XHRcInR4LnNpZ25cIjogdHNfMS10c18wLFxuXHRcdFx0XCJ0eC50b1N0cmluZ1wiOiB0c18yLXRzXzEsXG5cdFx0XHQvL1widHNfMy10c18yXCI6IHRzXzMtdHNfMixcblx0XHRcdFwidHguaW5wdXRzLm1hcFwiOiB0c180LXRzXzMsXG5cdFx0XHRcInR4Lm91dHB1dHMubWFwXCI6IHRzXzUtdHNfNCxcblx0XHRcdC8vXCJ0c182LXRzXzVcIjogdHNfNi10c181XG5cdFx0fSlcblxuXHRcdGlmKHR4UGFyYW1zQXJnLnNraXBVVFhPSW5Vc2VNYXJrICE9PSB0cnVlKXtcblx0XHRcdHRoaXMudXR4b1NldC51cGRhdGVVc2VkKHV0eG9zKTtcblx0XHR9XG5cblx0XHQvL2NvbnN0IHJwY3R4ID0gSlNPTi5zdHJpbmdpZnkocnBjVFgsIG51bGwsIFwiICBcIik7XG5cdFx0Ly9jb25zb2xlLmxvZyhcInJwY1RYXCIsIHJwY1RYKVxuXHRcdC8vY29uc29sZS5sb2coXCJcXG5cXG4jIyMjIyMjI3JwY3R4XFxuXCIsIHJwY3R4K1wiXFxuXFxuXFxuXCIpXG5cdFx0Ly9pZihhbW91bnQvMWU4ID4gMylcblx0XHQvL1x0dGhyb3cgbmV3IEVycm9yKFwiVE9ETyBYWFhYWFhcIilcblx0XHRyZXR1cm4gey4uLmRhdGEsIHJwY1RYfVxuXHR9XG5cblx0LyoqXG5cdCAqIFNlbmQgYSB0cmFuc2FjdGlvbi4gUmV0dXJucyB0cmFuc2FjdGlvbiBpZC5cblx0ICogQHBhcmFtIHR4UGFyYW1zXG5cdCAqIEBwYXJhbSB0eFBhcmFtcy50b0FkZHIgVG8gYWRkcmVzcyBpbiBjYXNoYWRkciBmb3JtYXQgKGUuZy4ga2FzcGF0ZXN0OnFxMGQ2aDBwcmptNW1wZGxkNXBuY3N0M2FkdTB5YW02eGNoNHRyNjlrMilcblx0ICogQHBhcmFtIHR4UGFyYW1zLmFtb3VudCBBbW91bnQgdG8gc2VuZCBpbiBzb21waXMgKDEwMDAwMDAwMCAoMWU4KSBzb21waXMgaW4gMSBLQVMpXG5cdCAqIEBwYXJhbSB0eFBhcmFtcy5mZWUgRmVlIGZvciBtaW5lcnMgaW4gc29tcGlzXG5cdCAqIEB0aHJvd3MgYEZldGNoRXJyb3JgIGlmIGVuZHBvaW50IGlzIGRvd24uIEFQSSBlcnJvciBtZXNzYWdlIGlmIHR4IGVycm9yLiBFcnJvciBpZiBhbW91bnQgaXMgdG9vIGxhcmdlIHRvIGJlIHJlcHJlc2VudGVkIGFzIGEgamF2YXNjcmlwdCBudW1iZXIuXG5cdCAqL1xuXHRhc3luYyBzdWJtaXRUcmFuc2FjdGlvbih0eFBhcmFtc0FyZzogVHhTZW5kLCBkZWJ1ZyA9IGZhbHNlKTogUHJvbWlzZSA8IFR4UmVzcCB8IG51bGwgPiB7XG5cdFx0dHhQYXJhbXNBcmcuc2tpcFVUWE9JblVzZU1hcmsgPSB0cnVlO1xuXG5cdFx0bGV0IHJldmVyc2VDaGFuZ2VBZGRyZXNzID0gZmFsc2U7XG5cdFx0aWYoIXR4UGFyYW1zQXJnLmNoYW5nZUFkZHJPdmVycmlkZSl7XG5cdFx0XHR0eFBhcmFtc0FyZy5jaGFuZ2VBZGRyT3ZlcnJpZGUgPSB0aGlzLmFkZHJlc3NNYW5hZ2VyLmNoYW5nZUFkZHJlc3MubmV4dCgpO1xuXHRcdFx0cmV2ZXJzZUNoYW5nZUFkZHJlc3MgPSB0cnVlO1xuXHRcdH1cblxuXHRcdGNvbnN0IHtcblx0XHRcdHJwY1RYLCB1dHhvSWRzLCBhbW91bnQsIHRvQWRkciwgbm90ZSwgdXR4b3Ncblx0XHR9ID0gYXdhaXQgdGhpcy5idWlsZFRyYW5zYWN0aW9uKHR4UGFyYW1zQXJnLCBkZWJ1Zyk7XG5cblx0XHQvL2NvbnNvbGUubG9nKFwicnBjVFg6XCIsIHJwY1RYKVxuXHRcdC8vdGhyb3cgbmV3IEVycm9yKFwiVE9ETyA6IFhYWFhcIilcblx0XHR0cnkge1xuXHRcdFx0Y29uc3QgdHMgPSBEYXRlLm5vdygpO1xuXHRcdFx0bGV0IHR4aWQ6IHN0cmluZyA9IGF3YWl0IHRoaXMuYXBpLnN1Ym1pdFRyYW5zYWN0aW9uKHJwY1RYKTtcblx0XHRcdGNvbnN0IHRzMyA9IERhdGUubm93KCk7XG5cdFx0XHR0aGlzLmxvZ2dlci5pbmZvKGB0eCAuLi4gc3VibWlzc2lvbiB0aW1lICR7KCh0czMtdHMpLzEwMDApLnRvRml4ZWQoMil9IHNlY2ApO1xuXHRcdFx0dGhpcy5sb2dnZXIuaW5mbyhgdHhpZDogJHt0eGlkfWApO1xuXHRcdFx0aWYoIXR4aWQpe1xuXHRcdFx0XHRpZihyZXZlcnNlQ2hhbmdlQWRkcmVzcylcblx0XHRcdFx0XHR0aGlzLmFkZHJlc3NNYW5hZ2VyLmNoYW5nZUFkZHJlc3MucmV2ZXJzZSgpO1xuXHRcdFx0XHRyZXR1cm4gbnVsbDsvLyBhcyBUeFJlc3A7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMudXR4b1NldC5pblVzZS5wdXNoKC4uLnV0eG9JZHMpO1xuXHRcdFx0dGhpcy50eFN0b3JlLmFkZCh7XG5cdFx0XHRcdGluOmZhbHNlLCB0cywgaWQ6dHhpZCwgYW1vdW50LCBhZGRyZXNzOnRvQWRkciwgbm90ZSxcblx0XHRcdFx0Ymx1ZVNjb3JlOiB0aGlzLmJsdWVTY29yZSxcblx0XHRcdFx0dHg6cnBjVFgudHJhbnNhY3Rpb24sXG5cdFx0XHRcdG15QWRkcmVzczogdGhpcy5hZGRyZXNzTWFuYWdlci5pc091cih0b0FkZHIpLFxuXHRcdFx0XHRpc0NvaW5iYXNlOiBmYWxzZSxcblx0XHRcdFx0dmVyc2lvbjoyXG5cdFx0XHR9KVxuXHRcdFx0dGhpcy51cGRhdGVEZWJ1Z0luZm8oKTtcblx0XHRcdHRoaXMuZW1pdENhY2hlKClcblx0XHRcdC8qXG5cdFx0XHR0aGlzLnBlbmRpbmdJbmZvLmFkZCh0eGlkLCB7XG5cdFx0XHRcdHJhd1R4OiB0eC50b1N0cmluZygpLFxuXHRcdFx0XHR1dHhvSWRzLFxuXHRcdFx0XHRhbW91bnQsXG5cdFx0XHRcdHRvOiB0b0FkZHIsXG5cdFx0XHRcdGZlZVxuXHRcdFx0fSk7XG5cdFx0XHQqL1xuXHRcdFx0Y29uc3QgcmVzcDogVHhSZXNwID0ge1xuXHRcdFx0XHR0eGlkLFxuXHRcdFx0XHQvL3JwY3R4XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gcmVzcDtcblx0XHR9IGNhdGNoIChlOmFueSkge1xuXHRcdFx0aWYocmV2ZXJzZUNoYW5nZUFkZHJlc3MpXG5cdFx0XHRcdHRoaXMuYWRkcmVzc01hbmFnZXIuY2hhbmdlQWRkcmVzcy5yZXZlcnNlKCk7XG5cdFx0XHRpZiAodHlwZW9mIGUuc2V0RXh0cmFEZWJ1Z0luZm8gPT0gXCJmdW5jdGlvblwiKXtcblx0XHRcdFx0bGV0IG1hc3MgPSAwO1xuXHRcdFx0XHRsZXQgc2F0b3NoaXMgPSAwO1xuXHRcdFx0XHRsZXQgbGlzdCA9IHV0eG9zLm1hcCh0eD0+e1xuXHRcdFx0XHRcdG1hc3MgKz0gdHgubWFzcztcblx0XHRcdFx0XHRzYXRvc2hpcyArPSB0eC5zYXRvc2hpcztcblx0XHRcdFx0XHRyZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgdHgsIHtcblx0XHRcdFx0XHRcdGFkZHJlc3M6dHguYWRkcmVzcy50b1N0cmluZygpLFxuXHRcdFx0XHRcdFx0c2NyaXB0OnR4LnNjcmlwdD8udG9TdHJpbmcoKVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0pO1xuXHRcdFx0XHQvLzg2NTAwLDAwMDAwMDAwXG5cdFx0XHRcdGxldCBpbmZvID0ge1xuXHRcdFx0XHRcdG1hc3MsXG5cdFx0XHRcdFx0c2F0b3NoaXMsXG5cdFx0XHRcdFx0dXR4b0NvdW50OiBsaXN0Lmxlbmd0aCxcblx0XHRcdFx0XHR1dHhvczogbGlzdFxuXHRcdFx0XHR9XG5cdFx0XHRcdGUuc2V0RXh0cmFEZWJ1Z0luZm8oaW5mbylcblx0XHRcdH1cblx0XHRcdHRocm93IGU7XG5cdFx0fVxuXHR9XG5cblx0Lypcblx0KiBDb21wb3VuZCBVVFhPcyBieSByZS1zZW5kaW5nIGZ1bmRzIHRvIGl0c2VsZlxuXHQqL1x0XG5cdGFzeW5jIGNvbXBvdW5kVVRYT3ModHhDb21wb3VuZE9wdGlvbnM6VHhDb21wb3VuZE9wdGlvbnM9e30sIGRlYnVnPWZhbHNlKTpQcm9taXNlPFR4UmVzcHxudWxsPiB7XG5cdFx0Y29uc3Qge1xuXHRcdFx0VVRYT01heENvdW50PUNPTVBPVU5EX1VUWE9fTUFYX0NPVU5ULFxuXHRcdFx0bmV0d29ya0ZlZU1heD0wLFxuXHRcdFx0ZmVlPTAsXG5cdFx0XHR1c2VMYXRlc3RDaGFuZ2VBZGRyZXNzPWZhbHNlXG5cdFx0fSA9IHR4Q29tcG91bmRPcHRpb25zO1xuXG5cdFx0Ly9sZXQgdG9BZGRyID0gdGhpcy5hZGRyZXNzTWFuYWdlci5jaGFuZ2VBZGRyZXNzLm5leHQoKVxuXG5cdFx0bGV0IHRvQWRkciA9IHRoaXMuYWRkcmVzc01hbmFnZXIuY2hhbmdlQWRkcmVzcy5hdEluZGV4WzBdO1xuXHRcdC8vY29uc29sZS5sb2coXCJjb21wb3VuZFVUWE9zOiB0byBhZGRyZXNzOlwiLCB0b0FkZHIsIFwidXNlTGF0ZXN0Q2hhbmdlQWRkcmVzczpcIit1c2VMYXRlc3RDaGFuZ2VBZGRyZXNzKVxuXHRcdGlmICh1c2VMYXRlc3RDaGFuZ2VBZGRyZXNzKXtcblx0XHRcdHRvQWRkciA9IHRoaXMuYWRkcmVzc01hbmFnZXIuY2hhbmdlQWRkcmVzcy5jdXJyZW50LmFkZHJlc3M7XG5cdFx0fVxuXHRcdGlmKCF0b0FkZHIpe1xuXHRcdFx0dG9BZGRyID0gdGhpcy5hZGRyZXNzTWFuYWdlci5jaGFuZ2VBZGRyZXNzLm5leHQoKTtcblx0XHR9XG5cblx0XHRsZXQgdHhQYXJhbXNBcmcgPSB7XG5cdFx0XHR0b0FkZHIsXG5cdFx0XHRjaGFuZ2VBZGRyT3ZlcnJpZGU6dG9BZGRyLFxuXHRcdFx0YW1vdW50OiAtMSxcblx0XHRcdGZlZSxcblx0XHRcdG5ldHdvcmtGZWVNYXgsXG5cdFx0XHRjb21wb3VuZGluZ1VUWE86dHJ1ZSxcblx0XHRcdGNvbXBvdW5kaW5nVVRYT01heENvdW50OlVUWE9NYXhDb3VudFxuXHRcdH1cblx0XHR0cnkge1xuXHRcdFx0bGV0IHJlcyA9IGF3YWl0IHRoaXMuc3VibWl0VHJhbnNhY3Rpb24odHhQYXJhbXNBcmcsIGRlYnVnKTtcblx0XHRcdGlmKCFyZXM/LnR4aWQpXG5cdFx0XHRcdHRoaXMuYWRkcmVzc01hbmFnZXIuY2hhbmdlQWRkcmVzcy5yZXZlcnNlKClcblx0XHRcdHJldHVybiByZXM7XG5cdFx0fWNhdGNoKGUpe1xuXHRcdFx0dGhpcy5hZGRyZXNzTWFuYWdlci5jaGFuZ2VBZGRyZXNzLnJldmVyc2UoKTtcblx0XHRcdHRocm93IGU7XG5cdFx0fVxuXHR9XG5cblx0Lypcblx0dW5kb1BlbmRpbmdUeChpZDogc3RyaW5nKTogdm9pZCB7XG5cdFx0Y29uc3Qge1x0dXR4b0lkc1x0fSA9IHRoaXMucGVuZGluZ0luZm8udHJhbnNhY3Rpb25zW2lkXTtcblx0XHRkZWxldGUgdGhpcy5wZW5kaW5nSW5mby50cmFuc2FjdGlvbnNbaWRdO1xuXHRcdHRoaXMudXR4b1NldC5yZWxlYXNlKHV0eG9JZHMpO1xuXHRcdHRoaXMuYWRkcmVzc01hbmFnZXIuY2hhbmdlQWRkcmVzcy5yZXZlcnNlKCk7XG5cdFx0dGhpcy5ydW5TdGF0ZUNoYW5nZUhvb2tzKCk7XG5cdH1cblx0Ki9cblxuXHQvKipcblx0ICogQWZ0ZXIgd2Ugc2VlIHRoZSB0cmFuc2FjdGlvbiBpbiB0aGUgQVBJIHJlc3VsdHMsIGRlbGV0ZSBpdCBmcm9tIG91ciBwZW5kaW5nIGxpc3QuXG5cdCAqIEBwYXJhbSBpZCBUaGUgdHggaGFzaFxuXHQgKi9cblx0IC8qXG5cdGRlbGV0ZVBlbmRpbmdUeChpZDogc3RyaW5nKTogdm9pZCB7XG5cdFx0Ly8gdW5kbyArIGRlbGV0ZSBvbGQgdXR4b3Ncblx0XHRjb25zdCB7XHR1dHhvSWRzIH0gPSB0aGlzLnBlbmRpbmdJbmZvLnRyYW5zYWN0aW9uc1tpZF07XG5cdFx0ZGVsZXRlIHRoaXMucGVuZGluZ0luZm8udHJhbnNhY3Rpb25zW2lkXTtcblx0XHR0aGlzLnV0eG9TZXQucmVtb3ZlKHV0eG9JZHMpO1xuXHR9XG5cdCovXG5cblx0cnVuU3RhdGVDaGFuZ2VIb29rcygpOiB2b2lkIHtcblx0XHQvL3RoaXMudXR4b1NldC51cGRhdGVVdHhvQmFsYW5jZSgpO1xuXHRcdC8vdGhpcy51cGRhdGVCYWxhbmNlKCk7XG5cdH1cblxuXHQvL1VUWE9zUG9sbGluZ1N0YXJ0ZWQ6Ym9vbGVhbiA9IGZhbHNlO1xuXHRlbWl0ZWRVVFhPczpTZXQ8c3RyaW5nPiA9IG5ldyBTZXQoKVxuXHRzdGFydFVUWE9zUG9sbGluZygpe1xuXHRcdC8vaWYgKHRoaXMuVVRYT3NQb2xsaW5nU3RhcnRlZClcblx0XHQvL1x0cmV0dXJuXG5cdFx0Ly90aGlzLlVUWE9zUG9sbGluZ1N0YXJ0ZWQgPSB0cnVlO1xuXHRcdHRoaXMuZW1pdFVUWE9zKCk7XG5cdH1cblxuXHRlbWl0VVRYT3MoKXtcblx0XHRsZXQgY2h1bmtzID0gaGVscGVyLmNodW5rcyhbLi4udGhpcy51dHhvU2V0LnV0eG9zLmNvbmZpcm1lZC52YWx1ZXMoKV0sIDEwMCk7XG5cdFx0Y2h1bmtzID0gY2h1bmtzLmNvbmNhdChoZWxwZXIuY2h1bmtzKFsuLi50aGlzLnV0eG9TZXQudXR4b3MucGVuZGluZy52YWx1ZXMoKV0sIDEwMCkpO1xuXG5cdFx0bGV0IHNlbmQgPSAoKT0+e1xuXHRcdFx0bGV0IHV0eG9zID0gY2h1bmtzLnBvcCgpO1xuXHRcdFx0aWYgKCF1dHhvcylcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR1dHhvcyA9IHV0eG9zLm1hcCh0eD0+e1xuXHRcdFx0XHRyZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgdHgsIHtcblx0XHRcdFx0XHRhZGRyZXNzOnR4LmFkZHJlc3MudG9TdHJpbmcoKVxuXHRcdFx0XHR9KVxuXHRcdFx0fSlcblx0XHRcdHRoaXMuZW1pdChcInV0eG8tc3luY1wiLCB7dXR4b3N9KVxuXG5cdFx0XHRoZWxwZXIuZHBjKDIwMCwgc2VuZClcblx0XHR9XG5cblx0XHRzZW5kKCk7XG5cdH1cblxuXHRnZXQgY2FjaGUoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdC8vcGVuZGluZ1R4OiB0aGlzLnBlbmRpbmdJbmZvLnRyYW5zYWN0aW9ucyxcblx0XHRcdHV0eG9zOiB7XG5cdFx0XHRcdC8vdXR4b1N0b3JhZ2U6IHRoaXMudXR4b1NldC51dHhvU3RvcmFnZSxcblx0XHRcdFx0aW5Vc2U6IHRoaXMudXR4b1NldC5pblVzZSxcblx0XHRcdH0sXG5cdFx0XHQvL3RyYW5zYWN0aW9uc1N0b3JhZ2U6IHRoaXMudHJhbnNhY3Rpb25zU3RvcmFnZSxcblx0XHRcdGFkZHJlc3Nlczoge1xuXHRcdFx0XHRyZWNlaXZlQ291bnRlcjogdGhpcy5hZGRyZXNzTWFuYWdlci5yZWNlaXZlQWRkcmVzcy5jb3VudGVyLFxuXHRcdFx0XHRjaGFuZ2VDb3VudGVyOiB0aGlzLmFkZHJlc3NNYW5hZ2VyLmNoYW5nZUFkZHJlc3MuY291bnRlcixcblx0XHRcdH1cblx0XHR9O1xuXHR9XG5cblx0cmVzdG9yZUNhY2hlKGNhY2hlOiBXYWxsZXRDYWNoZSk6IHZvaWQge1xuXHRcdC8vdGhpcy5wZW5kaW5nSW5mby50cmFuc2FjdGlvbnMgPSBjYWNoZS5wZW5kaW5nVHg7XG5cdFx0Ly90aGlzLnV0eG9TZXQudXR4b1N0b3JhZ2UgPSBjYWNoZS51dHhvcy51dHhvU3RvcmFnZTtcblx0XHR0aGlzLnV0eG9TZXQuaW5Vc2UgPSBjYWNoZS51dHhvcy5pblVzZTtcblx0XHQvKlxuXHRcdE9iamVjdC5lbnRyaWVzKHRoaXMudXR4b1NldC51dHhvU3RvcmFnZSkuZm9yRWFjaCgoW2FkZHIsIHV0eG9zXTogW3N0cmluZywgQXBpLlV0eG9bXV0pID0+IHtcblx0XHRcdHRoaXMudXR4b1NldC5hZGQodXR4b3MsIGFkZHIpO1xuXHRcdH0pO1xuXHRcdHRoaXMudHJhbnNhY3Rpb25zU3RvcmFnZSA9IGNhY2hlLnRyYW5zYWN0aW9uc1N0b3JhZ2U7XG5cdFx0dGhpcy5hZGRyZXNzTWFuYWdlci5nZXRBZGRyZXNzZXMoY2FjaGUuYWRkcmVzc2VzLnJlY2VpdmVDb3VudGVyICsgMSwgJ3JlY2VpdmUnKTtcblx0XHR0aGlzLmFkZHJlc3NNYW5hZ2VyLmdldEFkZHJlc3NlcyhjYWNoZS5hZGRyZXNzZXMuY2hhbmdlQ291bnRlciArIDEsICdjaGFuZ2UnKTtcblx0XHR0aGlzLmFkZHJlc3NNYW5hZ2VyLnJlY2VpdmVBZGRyZXNzLmFkdmFuY2UoY2FjaGUuYWRkcmVzc2VzLnJlY2VpdmVDb3VudGVyIC0gMSk7XG5cdFx0dGhpcy5hZGRyZXNzTWFuYWdlci5jaGFuZ2VBZGRyZXNzLmFkdmFuY2UoY2FjaGUuYWRkcmVzc2VzLmNoYW5nZUNvdW50ZXIpO1xuXHRcdC8vdGhpcy50cmFuc2FjdGlvbnMgPSB0eFBhcnNlcih0aGlzLnRyYW5zYWN0aW9uc1N0b3JhZ2UsIE9iamVjdC5rZXlzKHRoaXMuYWRkcmVzc01hbmFnZXIuYWxsKSk7XG5cdFx0dGhpcy5ydW5TdGF0ZUNoYW5nZUhvb2tzKCk7XG5cdFx0Ki9cblx0fVxuXG5cdC8qKlxuXHQgKiBHZW5lcmF0ZXMgZW5jcnlwdGVkIHdhbGxldCBkYXRhLlxuXHQgKiBAcGFyYW0gcGFzc3dvcmQgdXNlcidzIGNob3NlbiBwYXNzd29yZFxuXHQgKiBAcmV0dXJucyBQcm9taXNlIHRoYXQgcmVzb2x2ZXMgdG8gb2JqZWN0LWxpa2Ugc3RyaW5nLiBTdWdnZXN0ZWQgdG8gc3RvcmUgYXMgc3RyaW5nIGZvciAuaW1wb3J0KCkuXG5cdCAqL1xuXHRhc3luYyBleHBvcnQgKHBhc3N3b3JkOiBzdHJpbmcpOiBQcm9taXNlIDwgc3RyaW5nID4ge1xuXHRcdGNvbnN0IHNhdmVkV2FsbGV0OiBXYWxsZXRTYXZlID0ge1xuXHRcdFx0cHJpdktleTogdGhpcy5IRFdhbGxldC50b1N0cmluZygpLFxuXHRcdFx0c2VlZFBocmFzZTogdGhpcy5tbmVtb25pY1xuXHRcdH07XG5cdFx0cmV0dXJuIENyeXB0by5lbmNyeXB0KHBhc3N3b3JkLCBKU09OLnN0cmluZ2lmeShzYXZlZFdhbGxldCkpO1xuXHR9XG5cblxuXHRsb2dnZXI6IExvZ2dlcjtcblx0bG9nZ2VyTGV2ZWw6IG51bWJlciA9IDA7XG5cdHNldExvZ0xldmVsKGxldmVsOiBzdHJpbmcpIHtcblx0XHR0aGlzLmxvZ2dlci5zZXRMZXZlbChsZXZlbCk7XG5cdFx0dGhpcy5sb2dnZXJMZXZlbCA9IGxldmVsIT0nbm9uZSc/MjowO1xuXHRcdGthc3BhY29yZS5zZXREZWJ1Z0xldmVsKGxldmVsPzE6MCk7XG5cdH1cbn1cblxuZXhwb3J0IHtXYWxsZXR9Il19