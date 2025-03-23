const express = require('express');
const contractService = require('../../db-bll/contractService');
const router = express.Router();
const nodeService = require('../../eth-business/node-bll'); // schimbă calea dacă e diferită

function stringifyBigInt(obj) {
    return JSON.parse(
        JSON.stringify(obj, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        )
    );
}

router.get('/position/:username', async (req, res) => {
    try {
        const data = await nodeService.getPosition(req.params.username);
        res.json(stringifyBigInt(data));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/personalBestScore/:username', async (req, res) => {
    try {
        const data = await nodeService.getPersonalBestScore(req.params.username);
        res.json((stringifyBigInt(data)));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/personalBestPosition/:username', async (req, res) => {
    try {
        const data = await nodeService.getPersonalBestPosition(req.params.username);
        res.json((stringifyBigInt(data)));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/updateBestPositions/:username', async (req, res) => {
    try {
        const result = await nodeService.updateBestPositions(req.params.username);
        res.json((stringifyBigInt(data)));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/updateVelocity/:username', async (req, res) => {
    try {
        const globalContract = await contractService.getGlobalContract();
        if (!globalContract || !globalContract.address) {
            return res.status(404).json({ error: "Global contract not found" });
        }

        const result = await nodeService.updateVelocityAndPosition(req.params.username, globalContract.address);
        res.json(stringifyBigInt(result));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


router.get('/frozenCost/:username', async (req, res) => {   //astea nu merg 
    try {
        const data = await nodeService.getFrozenCost(req.params.username);
        res.json((stringifyBigInt(data)));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/objectiveFunction/:username', async (req, res) => {  //astea nu merg
    try {
        const data = await nodeService.getObjectiveFunctionResult(req.params.username);
        res.json((stringifyBigInt(data) ));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
