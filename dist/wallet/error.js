"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//@ts-ignore
if (!Error.captureStackTrace && !self.__Error__) {
    //@ts-ignore
    self.__Error__ = self.Error;
    class Error {
        constructor(message) {
            this.message = message;
            //@ts-ignore
            this.stack = ((new self.__Error__(message)).stack + "").split("↵").join("\n");
        }
    }
    //@ts-ignore
    self.Error = Error;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi93YWxsZXQvZXJyb3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxZQUFZO0FBQ1osSUFBRyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUM7SUFDOUMsWUFBWTtJQUNaLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztJQUM1QixNQUFNLEtBQUs7UUFHVixZQUFZLE9BQWM7WUFDekIsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7WUFDdkIsWUFBWTtZQUNaLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzdFLENBQUM7S0FDRDtJQUVELFlBQVk7SUFDWixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztDQUNuQiIsInNvdXJjZXNDb250ZW50IjpbIi8vQHRzLWlnbm9yZVxyXG5pZighRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UgJiYgIXNlbGYuX19FcnJvcl9fKXtcclxuXHQvL0B0cy1pZ25vcmVcclxuXHRzZWxmLl9fRXJyb3JfXyA9IHNlbGYuRXJyb3I7XHJcblx0Y2xhc3MgRXJyb3J7XHJcblx0XHRzdGFjazpzdHJpbmc7XHJcblx0XHRtZXNzYWdlOnN0cmluZztcclxuXHRcdGNvbnN0cnVjdG9yKG1lc3NhZ2U6c3RyaW5nKSB7XHJcblx0XHRcdHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XHJcblx0XHRcdC8vQHRzLWlnbm9yZVxyXG5cdFx0XHR0aGlzLnN0YWNrID0gKChuZXcgc2VsZi5fX0Vycm9yX18obWVzc2FnZSkpLnN0YWNrK1wiXCIpLnNwbGl0KFwi4oa1XCIpLmpvaW4oXCJcXG5cIik7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvL0B0cy1pZ25vcmVcclxuXHRzZWxmLkVycm9yID0gRXJyb3I7XHJcbn1cclxuXHJcbmV4cG9ydCB7fTsiXX0=