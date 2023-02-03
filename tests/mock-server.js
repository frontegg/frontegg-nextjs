const express = require('express');
const app = express();

const delay = (timeout = 200) => new Promise((resolve) => setTimeout(resolve, timeout));
app.use(function (req, res, next) {
  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', `http://localhost:3000`);

  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,x-frontegg-source');

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader('Access-Control-Allow-Credentials', true);

  // Pass to next layer of middleware

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
  } else {
    next();
  }
});
let idCounter = 0;
app.post('/frontegg/middleware-test', async (req, res, next) => {
  const userAgent = req.headers['user-agent'];
  console.log('got request from: ', userAgent);
  await delay();
  res.json({
    userAgent,
    id: idCounter++,
  });
});

app.listen(3001, () => {
  console.log('Server running on port 3001');
});
