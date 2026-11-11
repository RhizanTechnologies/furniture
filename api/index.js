const { bootstrapServer } = require('../apps/api/dist/src/serverless');

let cachedServer;

module.exports = async (req, res) => {
  if (!cachedServer) {
    cachedServer = await bootstrapServer();
  }
  return cachedServer(req, res);
};
