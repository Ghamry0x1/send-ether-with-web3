const express = require('express');
const router = express.Router();

router.get('/', function(req, res, next) {
  res.json('please use /api/v1 to make api calls');
});

module.exports = router;