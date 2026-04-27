/// <reference types="vite/client" />

// Allow Vite's ?worker&inline import syntax
declare module "*?worker&inline" {
  const workerConstructor: {
    new (): Worker;
  };
  export default workerConstructor;
}
