const express = require('express');
const router = express.Router(); //router object
const {createCategory} = require('../controllers/categoryController');



router.post('/createCategory',createCategory);


module.exports = router;


