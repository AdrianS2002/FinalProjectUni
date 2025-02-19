// const express = require('express');
// let router = express.Router();
//
// router.get('/block/:number', function (req, res, next) {
//     web3.eth.getBlock(parseInt(req.params.number)).then((block) => {
//         console.log(block);
//         res.send(block);
//     });
//
// });
//
// router.get('/tx/:hash', function (req, res, next) {
//     web3.eth.getTransactionReceipt(req.params.hash, function (err, receipt) {
//         res.send(receipt);
//     })
// });
//
// router.get('/accounts', function (req, res, next) {
//     console.log(web3.currentProvider);
//     web3.eth.isMining().then(console.log);
//     web3.eth.getAccounts().then((block) => {
//         res.send(block);
//     });
// });
//
//
// router.get('/provider', function (req, res, next) {
//     res.send(provider);
// });
//
//
// module.exports = router;
