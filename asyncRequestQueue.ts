
type functionToRunOnPromise<T, R> = (item: Promise<T>) => R
type resultArray<R> = returnType<R>[]
type returnType<R> = { result: R | null, error: Error | null }

export class AsyncRequestQueue<T, R> {
  private PromiseQueue: Promise<T>[];
  private concurrency: number;
  private results: resultArray<R>;
  private inProgressQueue: Promise<T>[];
  private failedItems: { item: Promise<T>, error: Error, indexNo: number }[];
  private promiseQueueGivenByUser: Promise<T>[]

  /**
   * Create a new PromiseBatchProcessor
   * @param items Array of items to process
   * @param concurrency Maximum number of concurrent promises (default: 5)
   */
  constructor(
    items: Promise<T>[],
    concurrency: number = 5
  ) {
    this.PromiseQueue = [...items];
    this.concurrency = concurrency;
    this.results = new Array(items.length);
    this.inProgressQueue = [];
    this.failedItems = new Array(items.length);
    this.promiseQueueGivenByUser = items

    if (concurrency < 1) {
      throw "concurrency can't be less than 1 ";
    }
  }

  async process(functionToRunOnPromise: functionToRunOnPromise<T, R>): Promise<resultArray<R>> {
    return new Promise((resolve, reject) => {

      // batch prcess the promises here
      // type 1) where you take the number of queue and then Promise.all the split array this is an easy approach but require creation of new arrays 
      // type 2) I am going to take the result array and recursively call it to process it 
      this.processNextFunc(functionToRunOnPromise, resolve)
    })
  }

  private async processNextFunc(functoRunOnPromise: functionToRunOnPromise<T, R>, resolveFunc: (value: resultArray<R>) => void) {

    console.log("\n\n\n\n\n\n\n\n");

    if (this.PromiseQueue.length === 0 && this.inProgressQueue.length === 0) {
      // if at the end then return
      console.log("at the end length of the promise queue and returning as we are at the end");

      resolveFunc(this.results)
      return;
    }

    if (this.inProgressQueue.length >= this.concurrency || this.PromiseQueue.length === 0) {
      // if the concurrency limit is reached then return
      console.log("waiting as wegoing for another one reached the concurrency limit");
      return
    }

    // processing the promise
    let promise = this.PromiseQueue.shift()
    if (promise === undefined || promise === null) {
      console.log("the promise is undefined ");
      this.processNextFunc(functoRunOnPromise, resolveFunc)
      return
    }
    let indexOFPromise = this.promiseQueueGivenByUser.indexOf(promise)
    // add the promise to the processing queue
    this.addPromiseToProcessingArray(promise)

    const resPromise = this.processSingleItem(functoRunOnPromise, indexOFPromise, promise)
      .catch((errorFromPromise) => {
        console.log(`the promise throws and caught it in the .catch block -> ${errorFromPromise}`);

        this.results[indexOFPromise] = { result: null, error: errorFromPromise instanceof Error ? errorFromPromise : new Error(String(errorFromPromise)) };
      })
      .finally(() => {
        // remove the item form the processing queue
        console.log(`the promise no ${indexOFPromise} finished and going for another one `);


        this.removePromiseFromProcessingArray(promise)

        // kickStart next func  if it is paused 
        this.processNextFunc(functoRunOnPromise, resolveFunc)
      })



    // after processing this promise recursively calling it 
    this.processNextFunc(functoRunOnPromise, resolveFunc)

  }

  private async processSingleItem(functoRunOnPromise: functionToRunOnPromise<T, R>, indexNumber: number, promiseToProcess: Promise<T>): Promise<R | Error> {
    console.log(`processing the promise at ${indexNumber}`);

    try {
      let res = await functoRunOnPromise(promiseToProcess)

      this.results[indexNumber] = { result: res, error: null }
      return res
    } catch (error) {
      console.log(`the error at the promise index ${indexNumber} and caught it in the processSingleItem() --->>>`, error);
      let res = error instanceof Error ? error : new Error("error occurred in executing the func ->" + error)
      this.results[indexNumber] = { result: null, error: res }
      // adding it to the failed items array so that I can later retry     


      this.failedItems[indexNumber] = { item: promiseToProcess, error: res, indexNo: indexNumber }
      return res
    }
  }

  private async addPromiseToProcessingArray(promiseToProcess: Promise<T>) {
    console.log("adding the promise to the progress array");

    this.inProgressQueue.push(promiseToProcess)
  }

  private removePromiseFromProcessingArray(promiseToRemove: Promise<T>) {
    // to do 
    let indexInArray = this.inProgressQueue.indexOf(promiseToRemove)
    if (indexInArray === -1) {
      console.error("the indes in array is -1 for the promise ->", promiseToRemove)
      return
    }
    console.log("removing the promise form the processing array");


    this.inProgressQueue.splice(indexInArray, 1)

  }

}

