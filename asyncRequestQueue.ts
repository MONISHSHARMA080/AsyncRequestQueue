
type functionToRunOnPromise<T, R> = (item: T) => Promise<R>
type resultArray<R> = returnType<R>[]
type returnType<R> = { result: R | null, error: Error | null }

class AsyncRequestQueue<T, R> {
  private PromiseQueue: T[];
  private concurrency: number;
  private results: resultArray<R>;
  private inProgressQueue: T[];
  private failedItems: { item: T, error: Error, indexNo: number }[];
  private promiseQueueGivenByUser: T[]

  /**
   * Create a new PromiseBatchProcessor
   * @param items Array of items to process
   * @param concurrency Maximum number of concurrent promises (default: 5)
   */
  constructor(
    items: T[],
    concurrency: number = 5
  ) {
    this.PromiseQueue = [...items];
    this.concurrency = concurrency;
    this.results = new Array(items.length);
    this.inProgressQueue = [];
    this.failedItems = [];
    this.promiseQueueGivenByUser = items
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

    if (this.PromiseQueue.length === 0 && this.inProgressQueue.length === 0) {
      // if at the end then return
      resolveFunc(this.results)
      return;
    }

    if (this.inProgressQueue.length >= this.concurrency || this.PromiseQueue.length === 0) {
      // if the concurrency limit is reached then return
      return
    }

    // processing the promise
    let promise = this.PromiseQueue.shift()
    if (promise === undefined || promise === null) {
      this.processNextFunc(functoRunOnPromise, resolveFunc)
      return
    }
    let indexOFPromise = this.promiseQueueGivenByUser.indexOf(promise)
    // add the promise to the processing queue
    this.addPromiseToProcessingArray(promise)

    const resPromise = this.processSingleItem(functoRunOnPromise, indexOFPromise, promise).finally(() => {
    // remove the item form the processing queue

      this.removePromiseFromProcessingArray(promise)

      // kickStart next func  if it is paused 
      this.processNextFunc(functoRunOnPromise, resolveFunc)
    })



    // after processing this promise recursively calling it 
    this.processNextFunc(functoRunOnPromise, resolveFunc)

  }

  private async processSingleItem(functoRunOnPromise: functionToRunOnPromise<T, R>, indexNumber: number, promiseToProcess: T): Promise<R | Error> {
    try {
      let res = await functoRunOnPromise(promiseToProcess)
      this.results[indexNumber].result = res
      this.results[indexNumber].error = null
      return res
    } catch (error) {
      let res = error instanceof Error ? error : new Error("error occurred in executing the func ->" + error)
      this.results[indexNumber].error = res
      this.results[indexNumber].result = null
      return res
    }
  }

  private async addPromiseToProcessingArray(promiseToProcess: T) {
    this.inProgressQueue.push(promiseToProcess)
  }

  private removePromiseFromProcessingArray(promiseToRemove: T) {
    // to do 
    let indexInArray = this.inProgressQueue.indexOf(promiseToRemove)
    if (indexInArray === -1) {
      console.error("the indes in array is -1 for the promise ->", promiseToRemove)
      return
    }

    this.inProgressQueue.splice(indexInArray, 1)

  }

}


async function main() {
  const queue = new AsyncRequestQueue<string>(1);

  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const promiseFunctions = [
    async () => {
      await delay(700);
      console.log("\n\n  primise 1 completed \n\n");
      return "A";
    }, // Takes 1 second
    async () => {
      await delay(600);
      console.log("\n\n  primise 2 completed \n\n");
      return "B";
    }, // Takes 1 second
    async () => {
      await delay(400);
      console.log("\n\n  primise 3 completed \n\n");
      return "C";
    }, // Takes 1 second
    async () => {
      await delay(320);
      console.log("\n\n  primise 4 completed \n\n");
      return "D";
    }, // Takes 1 second
    async () => {
      await delay(500);
      console.log("\n\n  primise 5 completed \n\n");
      return "E";
    }, // Takes 1 second
    async () => {
      await delay(100);
      console.log("\n\n  primise 6 completed \n\n");
      return "F";
    }, // Takes 1 second
    async () => {
      await delay(100);
      console.log("\n\n  primise 7 completed \n\n");
      return "G";
    }, // Takes 1 second
  ];

  queue.addToQueue(promiseFunctions);
  console.log("about to start processing promises");
  const result = await queue.processQueue();
  console.log("the result array is ->", result);
}

main();
