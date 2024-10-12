"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventTargetImpl = void 0;
class EventTargetImpl {
    constructor() {
        this.listeners = new Map();
    }
    /**
    * fire CustomEvent
    * @param {String} eventName name of event
    * @param {Object=} detail event's [detail]{@link https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail} property
    * @since 0.0.1
    */
    emit(type, detail = {}) {
        this.dispatchEvent({ type, detail, defaultPrevented: false });
    }
    on(type, callback) {
        this.addEventListener(type, callback);
    }
    addEventListener(type, callback) {
        let list = this.listeners.get(type);
        if (!list) {
            list = [];
            this.listeners.set(type, list);
        }
        list.push(callback);
    }
    removeEventListener(type, callback) {
        let stack = this.listeners.get(type);
        if (!stack)
            return;
        for (let i = 0, l = stack.length; i < l; i++) {
            if (stack[i] === callback) {
                stack.splice(i, 1);
                return;
            }
        }
    }
    dispatchEvent(event) {
        let list = this.listeners.get(event.type);
        if (!list)
            return true;
        let stack = list.slice();
        for (let i = 0, l = stack.length; i < l; i++) {
            stack[i].call(this, event.detail, event);
        }
        return !event.defaultPrevented;
    }
}
exports.EventTargetImpl = EventTargetImpl;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnQtdGFyZ2V0LWltcGwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi93YWxsZXQvZXZlbnQtdGFyZ2V0LWltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBRUEsTUFBYSxlQUFlO0lBSzNCO1FBQ0MsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFBO0lBQzNCLENBQUM7SUFFRDs7Ozs7TUFLRTtJQUNGLElBQUksQ0FBQyxJQUFXLEVBQUUsU0FBVyxFQUFFO1FBQzlCLElBQUksQ0FBQyxhQUFhLENBQUMsRUFBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLGdCQUFnQixFQUFDLEtBQUssRUFBQyxDQUFDLENBQUM7SUFDNUQsQ0FBQztJQUVELEVBQUUsQ0FBQyxJQUFXLEVBQUUsUUFBc0I7UUFDckMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUN0QyxDQUFDO0lBRUQsZ0JBQWdCLENBQUMsSUFBVyxFQUFFLFFBQXNCO1FBQ25ELElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3BDLElBQUksQ0FBQyxJQUFJLEVBQUU7WUFDVixJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ1YsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1NBQy9CO1FBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNyQixDQUFDO0lBRUQsbUJBQW1CLENBQUMsSUFBVyxFQUFFLFFBQXNCO1FBQ3RELElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxLQUFLO1lBQ1QsT0FBTztRQUVSLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDN0MsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssUUFBUSxFQUFDO2dCQUN6QixLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDbkIsT0FBTzthQUNQO1NBQ0Q7SUFDRixDQUFDO0lBRUQsYUFBYSxDQUFDLEtBQVc7UUFDeEIsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzFDLElBQUksQ0FBQyxJQUFJO1lBQ1IsT0FBTyxJQUFJLENBQUM7UUFFYixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFekIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUM3QyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQ3pDO1FBQ0QsT0FBTyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQztJQUNoQyxDQUFDO0NBQ0Q7QUF6REQsMENBeURDIiwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGRlY2xhcmUgdHlwZSBFdmVudCA9IHt0eXBlOnN0cmluZywgZGV0YWlsOmFueSwgZGVmYXVsdFByZXZlbnRlZDpib29sZWFufTtcbmV4cG9ydCBkZWNsYXJlIHR5cGUgRXZlbnRMaXN0ZW5lciA9IChkZXRhaWw6YW55LCBldmVudDpFdmVudCk9PnZvaWQ7XG5leHBvcnQgY2xhc3MgRXZlbnRUYXJnZXRJbXBse1xuXG5cdGxpc3RlbmVyczpNYXA8c3RyaW5nLCBFdmVudExpc3RlbmVyW10+O1xuXG5cblx0Y29uc3RydWN0b3IoKXtcblx0XHR0aGlzLmxpc3RlbmVycyA9IG5ldyBNYXAoKVxuXHR9XG5cblx0LyoqXG5cdCogZmlyZSBDdXN0b21FdmVudFxuXHQqIEBwYXJhbSB7U3RyaW5nfSBldmVudE5hbWUgbmFtZSBvZiBldmVudFxuXHQqIEBwYXJhbSB7T2JqZWN0PX0gZGV0YWlsIGV2ZW50J3MgW2RldGFpbF17QGxpbmsgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL0N1c3RvbUV2ZW50L2RldGFpbH0gcHJvcGVydHlcblx0KiBAc2luY2UgMC4wLjFcblx0Ki9cblx0ZW1pdCh0eXBlOnN0cmluZywgZGV0YWlsOmFueT17fSl7XG5cdFx0dGhpcy5kaXNwYXRjaEV2ZW50KHt0eXBlLCBkZXRhaWwsIGRlZmF1bHRQcmV2ZW50ZWQ6ZmFsc2V9KTtcblx0fVxuXG5cdG9uKHR5cGU6c3RyaW5nLCBjYWxsYmFjazpFdmVudExpc3RlbmVyKXtcblx0XHR0aGlzLmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgY2FsbGJhY2spXG5cdH1cblxuXHRhZGRFdmVudExpc3RlbmVyKHR5cGU6c3RyaW5nLCBjYWxsYmFjazpFdmVudExpc3RlbmVyKSB7XG5cdFx0bGV0IGxpc3QgPSB0aGlzLmxpc3RlbmVycy5nZXQodHlwZSk7XG5cdFx0aWYgKCFsaXN0KSB7XG5cdFx0XHRsaXN0ID0gW107XG5cdFx0XHR0aGlzLmxpc3RlbmVycy5zZXQodHlwZSwgbGlzdCk7XG5cdFx0fVxuXHRcdGxpc3QucHVzaChjYWxsYmFjayk7XG5cdH1cblxuXHRyZW1vdmVFdmVudExpc3RlbmVyKHR5cGU6c3RyaW5nLCBjYWxsYmFjazpFdmVudExpc3RlbmVyKSB7XG5cdFx0bGV0IHN0YWNrID0gdGhpcy5saXN0ZW5lcnMuZ2V0KHR5cGUpO1xuXHRcdGlmICghc3RhY2spXG5cdFx0XHRyZXR1cm47XG5cblx0XHRmb3IgKGxldCBpID0gMCwgbCA9IHN0YWNrLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuXHRcdFx0aWYgKHN0YWNrW2ldID09PSBjYWxsYmFjayl7XG5cdFx0XHRcdHN0YWNrLnNwbGljZShpLCAxKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGRpc3BhdGNoRXZlbnQoZXZlbnQ6RXZlbnQpe1xuXHRcdGxldCBsaXN0ID0gdGhpcy5saXN0ZW5lcnMuZ2V0KGV2ZW50LnR5cGUpO1xuXHRcdGlmICghbGlzdClcblx0XHRcdHJldHVybiB0cnVlO1xuXG5cdFx0bGV0IHN0YWNrID0gbGlzdC5zbGljZSgpO1xuXG5cdFx0Zm9yIChsZXQgaSA9IDAsIGwgPSBzdGFjay5sZW5ndGg7IGkgPCBsOyBpKyspIHtcblx0XHRcdHN0YWNrW2ldLmNhbGwodGhpcywgZXZlbnQuZGV0YWlsLCBldmVudCk7XG5cdFx0fVxuXHRcdHJldHVybiAhZXZlbnQuZGVmYXVsdFByZXZlbnRlZDtcblx0fVxufSJdfQ==