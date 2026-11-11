const { bootstrapServer } = require('../dist/src/serverless');

let cachedServer;

module.exports = async (req, res) => {
  if (!cachedServer) {
    cachedServer = await bootstrapServer();
  }
  return cachedServer(req, res);
};
