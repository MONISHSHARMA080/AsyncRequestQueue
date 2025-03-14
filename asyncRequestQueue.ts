type processResult<T, R> = {
  result: R | null;
  error: Error | null;
  ifErrorThenOriginalPromise: Promise<T> | null
};

type promiseArray<T> = Promise<T>[];
type resultArray<T, R> = processResult<T, R>[]
type funcToProcessIndividualPromise<T, R> = (value: Promise<T>) => Promise<R>


/** there are 2 generics cause, take for eg fetch if I have it then I have a promise that returns response but let's say I want 
 * it to return a thing in form of json  form the body, then I can do it 
 *
 * */
export class AsyncRequestQueue22<T, R> {
  private concurrencyLimit: number;
  private resultArray: resultArray<T, R>;
  private processingQueue: promiseArray<T>;
  private promiseQueue: promiseArray<T>;
  private promiseQueueSubmittedByUser: promiseArray<T>

  constructor(concurrencyLimit: number = 5) {
    if (concurrencyLimit <= 0) {
      throw "concurrency can't be <= 0";
    }
    this.concurrencyLimit = concurrencyLimit;
    this.resultArray = [];
    this.processingQueue = [];
  }

  public process(promiseArray: promiseArray<T>, funcToProcessIndividualPromise: funcToProcessIndividualPromise<T, R>): Promise<resultArray<T, R>> {
    return new Promise((resolve, reject) => {
      this.promiseQueue = [...promiseArray]; // Create a copy
      this.promiseQueueSubmittedByUser = promiseArray
      this.resultArray = new Array(promiseArray.length)
      console.log(`length of the array provided theby the user ->${promiseArray.length} and the processQueue -> ${ this.promiseQueue.length }`);
      

      this.processAll(resolve, funcToProcessIndividualPromise);
    })
  }

  private async processAll(resolveFunc: (value: resultArray<T, R>) => void, funcToProcessIndividualPromise: funcToProcessIndividualPromise<T, R>) {

    // if we have reached the end then
    if (this.promiseQueue.length === 0 && this.processingQueue.length === 0) {
      console.log(`length of the processqueue ->${this.promiseQueue.length}`);
      
      resolveFunc(this.resultArray)
    }

    // if we have reached the processing/concurrecy limit  then return or if we are at the last promise
    if (this.processingQueue.length >= this.concurrencyLimit || this.promiseQueue.length === 0) {
      return;
    }

    const promiseFromTheQueue = this.promiseQueue.shift()
    if (promiseFromTheQueue === undefined || promiseFromTheQueue === null) {
      return
    }
    //pushing it in to the processing queue
    this.processingQueue.push(promiseFromTheQueue)

    const indexOfThePromise = this.promiseQueueSubmittedByUser.indexOf(promiseFromTheQueue)


    this.processIndividualPromiseAndRemoveItFormTheProcessingQueue( promiseFromTheQueue,  funcToProcessIndividualPromise, indexOfThePromise).finally(()=>{
      console.log(`promise number ${indexOfThePromise} was completed  and now recursing `);
      this.processAll(resolveFunc, funcToProcessIndividualPromise)
    })
    this.processAll(resolveFunc, funcToProcessIndividualPromise)


  }

  /** process indvidual promises and then remove it form the  */
  private async processIndividualPromiseAndRemoveItFormTheProcessingQueue(promiseToProcess: Promise<T>, funcToProcessIndividualPromise: funcToProcessIndividualPromise<T, R>, 
    indexOfPromise: number) {
      
      
    try {
        let resultFormFunc = await funcToProcessIndividualPromise(promiseToProcess)
        console.log("<<result for the func is ->", resultFormFunc);
        
        this.resultArray[indexOfPromise] ={result:resultFormFunc, error: null, ifErrorThenOriginalPromise:null}
        this.removeFromTheProcessingQueue(promiseToProcess, indexOfPromise)
    } catch (error) {
        console.log(` error in individual item at index ${indexOfPromise} is  ->`, error);
        let errorInExecution = error instanceof Error? error : new Error("there is a error executing the function->",error)
        this.resultArray[indexOfPromise] ={result:null, error: errorInExecution, ifErrorThenOriginalPromise:promiseToProcess}
        this.removeFromTheProcessingQueue(promiseToProcess, indexOfPromise)
    }

      console.log(` what do we have at this destination -> ${ this.resultArray[indexOfPromise].result } `);
  }

  private removeFromTheProcessingQueue(promiseToProcess: Promise<T>, indexOfPromise: number ){
    let index =     this.processingQueue.indexOf(promiseToProcess)
    if (index < 0) {
      console.error("the index of promise in the processing queue is <0 (the promise was not there), the index of promise in the promsie queue was --> ", indexOfPromise)
      return
    }
    this.processingQueue.splice(index)
  }
}



