import {
    Client,
    Result,
    Receipt,
} from "@blockstack/clarity";

interface NameValuePair { rawResult: string; strings: string[]; }

function unwrapStrings(tuple: string): [string]|RegExpMatchArray {
  var names = tuple.match(/0x\w+/g) || [];
  for(let i=0; i<names.length; i++){
    names[i] = Buffer.from(names[i].substring(2), "hex").toString();
  }
  return names;
}

function logResult(result: NameValuePair) {
    if (result.rawResult.indexOf("0x") > -1) {
        console.log("Raw result: '" + result.rawResult + "' Dehexed: " + result.strings);
    } else {
        console.log("Raw result: '" + result.rawResult + "'");
    }
}
    
function logReceipt(receipt: Receipt) {
    console.log("Raw result: " + receipt);
}

async function performQuery(client: Client, name: string, args: string[]): Promise<NameValuePair> {
    const query = client.createQuery({
        method: { name, args },
    });
    const receipt = await client.submitQuery(query);
    const result = Result.unwrap(receipt);
    return {rawResult: result, strings: unwrapStrings(result)};
}

async function readFromContract(client: Client, method: string, args: string[], printResult?: boolean): Promise<any> {
    const res = await performQuery(client, method, args);
    if (printResult) logResult(res);
    return res
};

async function execMethod(client: Client, signature: string, method: string, args: string[], printResult?: boolean): Promise<Receipt> {
    const tx = client.createTransaction({
        method: {
            name: method,
            args: args,
        },
    });
    await tx.sign(signature);
    const receipt = await client.submitTransaction(tx);
    if (printResult) logReceipt(receipt);
    return receipt;
};

export {readFromContract, execMethod}
