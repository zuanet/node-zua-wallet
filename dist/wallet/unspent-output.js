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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnspentOutput = void 0;
const zuacore = __importStar(require("@zua/core-lib"));
class UnspentOutput extends zuacore.Transaction.UnspentOutput {
    constructor(o) {
        super(o);
        this.blockDaaScore = o.blockDaaScore;
        this.scriptPublicKeyVersion = o.scriptPublicKeyVersion;
        this.id = this.txId + this.outputIndex;
        this.signatureOPCount = this.script.getSignatureOperationsCount();
        this.mass = this.signatureOPCount * zuacore.Transaction.MassPerSigOp;
        this.mass += 151 * zuacore.Transaction.MassPerTxByte; //standalone mass 
        this.isCoinbase = o.isCoinbase,
            this.scriptPubKey = o.scriptPubKey;
    }
}
exports.UnspentOutput = UnspentOutput;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5zcGVudC1vdXRwdXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi93YWxsZXQvdW5zcGVudC1vdXRwdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJEQUE2QztBQUU3QyxNQUFhLGFBQWMsU0FBUSxTQUFTLENBQUMsV0FBVyxDQUFDLGFBQWE7SUFRckUsWUFBWSxDQUFvQjtRQUMvQixLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDVCxJQUFJLENBQUMsYUFBYSxHQUFHLENBQUMsQ0FBQyxhQUFhLENBQUM7UUFDckMsSUFBSSxDQUFDLHNCQUFzQixHQUFHLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQztRQUN2RCxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQztRQUN2QyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQywyQkFBMkIsRUFBRSxDQUFDO1FBQ2xFLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixHQUFHLFNBQVMsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDO1FBQ3ZFLElBQUksQ0FBQyxJQUFJLElBQUcsR0FBRyxHQUFHLFNBQVMsQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLENBQUMsa0JBQWtCO1FBQ3pFLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLFVBQVU7WUFDOUIsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsWUFBWSxDQUFBO0lBQ25DLENBQUM7Q0FDRDtBQW5CRCxzQ0FtQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBrYXNwYWNvcmUgZnJvbSAnQGthc3BhL2NvcmUtbGliJztcclxuaW1wb3J0IHtVbnNwZW50T3V0cHV0SW5mb30gZnJvbSAnLi4vdHlwZXMvY3VzdG9tLXR5cGVzJztcclxuZXhwb3J0IGNsYXNzIFVuc3BlbnRPdXRwdXQgZXh0ZW5kcyBrYXNwYWNvcmUuVHJhbnNhY3Rpb24uVW5zcGVudE91dHB1dCB7XHJcblx0YmxvY2tEYWFTY29yZTogbnVtYmVyO1xyXG5cdHNjcmlwdFB1YmxpY0tleVZlcnNpb246IG51bWJlcjtcclxuXHRpZDpzdHJpbmc7XHJcblx0c2lnbmF0dXJlT1BDb3VudDpudW1iZXI7XHJcblx0bWFzczpudW1iZXI7XHJcblx0aXNDb2luYmFzZTpib29sZWFuO1xyXG5cdHNjcmlwdFB1YktleTpzdHJpbmc7XHJcblx0Y29uc3RydWN0b3IobzogVW5zcGVudE91dHB1dEluZm8pIHtcclxuXHRcdHN1cGVyKG8pO1xyXG5cdFx0dGhpcy5ibG9ja0RhYVNjb3JlID0gby5ibG9ja0RhYVNjb3JlO1xyXG5cdFx0dGhpcy5zY3JpcHRQdWJsaWNLZXlWZXJzaW9uID0gby5zY3JpcHRQdWJsaWNLZXlWZXJzaW9uO1xyXG5cdFx0dGhpcy5pZCA9IHRoaXMudHhJZCArIHRoaXMub3V0cHV0SW5kZXg7XHJcblx0XHR0aGlzLnNpZ25hdHVyZU9QQ291bnQgPSB0aGlzLnNjcmlwdC5nZXRTaWduYXR1cmVPcGVyYXRpb25zQ291bnQoKTtcclxuXHRcdHRoaXMubWFzcyA9IHRoaXMuc2lnbmF0dXJlT1BDb3VudCAqIGthc3BhY29yZS5UcmFuc2FjdGlvbi5NYXNzUGVyU2lnT3A7XHJcblx0XHR0aGlzLm1hc3MrPSAxNTEgKiBrYXNwYWNvcmUuVHJhbnNhY3Rpb24uTWFzc1BlclR4Qnl0ZTsgLy9zdGFuZGFsb25lIG1hc3MgXHJcblx0XHR0aGlzLmlzQ29pbmJhc2UgPSBvLmlzQ29pbmJhc2UsXHJcblx0XHR0aGlzLnNjcmlwdFB1YktleSA9IG8uc2NyaXB0UHViS2V5XHJcblx0fVxyXG59XHJcbiJdfQ==