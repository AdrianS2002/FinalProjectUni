var user = require('./models/account.js');
let ErrorHandling = require('../models/error-handling');
const {getUnique} = require("../utils/commons");
const {SqlError} = require("../models/db-errors");
const commons = require("../utils/commons");

const selectFromUserInnerJoinCredentials = "SELECT * FROM users inner join credentials on users.id = credentials.user_id ";
const sqlSelectByUsername = selectFromUserInnerJoinCredentials +
    "where credentials.username like ? ";
const selectAddressByUsernameInnerJoinCredentials = "SELECT u.address FROM users u inner join credentials on u.id = credentials.user_id where credentials.username like ? ";

async function queryCredentialsByUsername(username, callback) {
    try{
        let account = await QueryAccountByUsername(username)
        return Promise.resolve(user.CredentialsDTO(account));
    }catch (error)
    {
        return Promise.reject(error);
    }
}
QueryAccountByUsername = (username) => {
    return new Promise((resolve, reject) => {
        db.query(sqlSelectByUsername, [username], (err, account) => {
            if (err) {
                return reject(new SqlError("QueryAccountByUsername"));
            }
            try {
                return resolve(getUnique(account, "QueryAccountByUsername", "Username"));
            } catch (e) {
                return reject(e);
            }
        })
    })
}

QueryAccountAddressByUsername = (username) =>
{
    return new Promise((resolve, reject) => {
        db.query(selectAddressByUsernameInnerJoinCredentials, [username], (err, account) => {
            if (err) {
                console.log(err)
                return reject(new SqlError("QueryAccountAddressByUsername"));
            }
            try{
                return resolve(commons.getUnique(account, "QueryAccountAddressByUsername", "Username"));
            }catch (e) {
                return reject(e);
            }
        })
    })
}

module.exports = {
    QueryAccountByUsername,
    QueryAccountAddressByUsername,
};
