var express = require('express');
var validator = require('validator');
var _ = require('underscore');

var app = express();

app.use(express.bodyParser());

app.use(function(req, res, next) {
  res.set('Access-Control-Allow-Origin', '*');
  next();
});

app.post('/user', function(req, res, next) {
  var errors = {};
  if (!validator.isLength(req.body.first_name, 1, 10))
    errors.first_name = ['First name must be between 1 and 10 characters long.'];
  if (!validator.isLength(req.body.last_name, 1, 10))
    errors.last_name = ['Last name must be between 1 and 10 characters long.'];
  // if (!req.body.first_name.length && !req.body.last_name.length)
  //   errors.form = ['You must have a first or last name.'];
  if (!validator.isEmail(req.body.email))
    errors.email = ['Email is invalid.'];
  if (_.size(errors))
    return res.json(400, errors);
  setTimeout(function() {
    res.send(200);
  }, 500);
});

app.listen(9876);