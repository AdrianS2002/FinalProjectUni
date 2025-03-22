const express = require('express');
const router = express.Router();
const contractService = require('../db-bll/contractService');

router.get('/', async (req, res) => {
    const contracts = await contractService.getContracts();
    res.send(contracts);
});

router.get('/:id', async (req, res) => {
    const contract = await contractService.getContractById(req.params.id);
    if (!contract) {
        return res.status(404).send({ error: 'Contract not found' });
    }
    res.send(contract);
});

router.post('/', async (req, res) => {
    const contractId = await contractService.addContract(req.body);
    res.status(201).send({ message: 'Contract created', contractId });
});

router.put('/:id', async (req, res) => {
    await contractService.updateContract(req.params.id, req.body);
    res.send({ message: 'Contract updated' });
});

router.delete('/:id', async (req, res) => {
    await contractService.deleteContract(req.params.id);
    res.send({ message: 'Contract deleted' });
});

module.exports = router;
