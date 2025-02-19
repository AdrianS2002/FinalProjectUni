let contract = require('./models/contract.js');
let ErrorHandling = require('../models/error-handling');
const {SqlError} = require("../models/db-errors");
const commons = require("../utils/commons");
const contractModel = require("./models/contract");

const sqlSelectByTypeAndOwner = "SELECT * FROM contracts where type like ? and owner like ? ";
const sqlAddContractWithOwner = "INSERT INTO contracts (name, address, owner, type) VALUES (?, ?, ?, ?)";

QueryContractByTypeAndOwner = (type, owner) => {
    return new Promise((resolve, reject) => {
        db.query(sqlSelectByTypeAndOwner, [type, owner], (err, contract) => {
            if(err){
                return reject(new SqlError("QueryContractByTypeAndOwner"));
            }
            try{
                return resolve(commons.getUnique(contract, "QueryContractByTypeAndOwner", "UUID"));
            }catch (e) {
                return reject(e);
            }
        })
    })
}

QueryInsertContract = (name, address, owner, type) => {
    let contract_id = commons.generateUUID();
    return new Promise((resolve, reject) => {
        db.query(sqlAddContractWithOwner, [contract_id, name, address, owner, type], (err, contract) => {
            if(err){
                reject(new SqlError("QueryInsertContract"));
            }
            try{
                return resolve(commons.getUnique(contract, contractModel.ContractDTO));
            }catch (e) {
                return reject(e);
            }
        })
    })
}



module.exports = {
    QueryInsertContract,
    QueryContractByTypeAndOwner
};
