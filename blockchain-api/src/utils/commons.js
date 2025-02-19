const SqlErrors = require("../models/db-errors.js");
const user = require("../db-dao/models/account.js");
const uuid = require("uuid");

function generateUUID()
{
    return uuid.v4();
}

async function getSignerForUser(userAddress) {
    // const account = signers.find(acc => acc.toLowerCase() === userAddress.toLowerCase());
    //
    // if (!account) {
    //     throw new Error("Signer not found for the provided address");
    // }
    return await provider.getSigner(userAddress);
}

async function getDefaultSigner() {

}

function getUnique(list, method, name)
{
    if(list.length < 1){
        throw new SqlErrors.SqlNoResultError(method);
    }
    if(list.length > 1){
        throw new SqlErrors.SqlNotUniqueError(name, method);
    }
    return list[0];
}

function listToDTO(list, model)
{
    let dtoList=[]
    for(let i = 0; i<list.length; i++)
    {
        dtoList.push(model(list[i]))
    }
    return dtoList;
}

module.exports ={
    generateUUID,
    getUnique,
    listToDTO,
    getSignerForUser,
    getDefaultSigner
}