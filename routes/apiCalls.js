const express = require('express');
const router = express.Router();

router.get('/jj', async (req, res) => {
    res.send('hola ke ase');

});


router.get('/ja', async (req, res) => {
    res.send('hola ke ase otra vez');

});



module.exports = router;