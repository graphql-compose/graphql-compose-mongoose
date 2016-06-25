// flow-typed signature: c7f438528a77dbf9c0b35cf473abd5d4
// flow-typed version: 668d1ec92a/mocha_v2.4.x/flow_>=v0.22.x

type TestFunction = (() => void | Promise<mixed>) | ((done : () => void) => void);

declare var describe : {
    (name:string, spec:() => void): void;
    only(description:string, spec:() => void): void;
    skip(description:string, spec:() => void): void;
    timeout(ms:number): void;
};

declare var context : typeof describe;

declare var it : {
    (name:string, spec:TestFunction): void;
    only(description:string, spec:TestFunction): void;
    skip(description:string, spec:TestFunction): void;
    timeout(ms:number): void;
};

declare function before(method : TestFunction):void;
declare function beforeEach(method : TestFunction):void;
declare function after(method : TestFunction):void;
declare function afterEach(method : TestFunction):void;
