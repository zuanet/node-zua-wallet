"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.partialAddress = void 0;
// Takes in an address (regular or cashaddr format) and condenses it to display only the
// first 4 and last 4 characters
function partialAddress(address) {
    if (address === 'mined')
        return 'Mined';
    const suffix = address.includes(':') ? address.split(':')[1] : address;
    return `${suffix.slice(0, 4)}....${suffix.slice(-4)}`;
}
exports.partialAddress = partialAddress;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9ybWF0dGVycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3V0aWxzL2Zvcm1hdHRlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsd0ZBQXdGO0FBQ3hGLGdDQUFnQztBQUNoQyxTQUFnQixjQUFjLENBQUMsT0FBZTtJQUM1QyxJQUFJLE9BQU8sS0FBSyxPQUFPO1FBQUUsT0FBTyxPQUFPLENBQUM7SUFDeEMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO0lBQ3ZFLE9BQU8sR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUN4RCxDQUFDO0FBSkQsd0NBSUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBUYWtlcyBpbiBhbiBhZGRyZXNzIChyZWd1bGFyIG9yIGNhc2hhZGRyIGZvcm1hdCkgYW5kIGNvbmRlbnNlcyBpdCB0byBkaXNwbGF5IG9ubHkgdGhlXHJcbi8vIGZpcnN0IDQgYW5kIGxhc3QgNCBjaGFyYWN0ZXJzXHJcbmV4cG9ydCBmdW5jdGlvbiBwYXJ0aWFsQWRkcmVzcyhhZGRyZXNzOiBzdHJpbmcpIHtcclxuICBpZiAoYWRkcmVzcyA9PT0gJ21pbmVkJykgcmV0dXJuICdNaW5lZCc7XHJcbiAgY29uc3Qgc3VmZml4ID0gYWRkcmVzcy5pbmNsdWRlcygnOicpID8gYWRkcmVzcy5zcGxpdCgnOicpWzFdIDogYWRkcmVzcztcclxuICByZXR1cm4gYCR7c3VmZml4LnNsaWNlKDAsIDQpfS4uLi4ke3N1ZmZpeC5zbGljZSgtNCl9YDtcclxufVxyXG4iXX0=