const { bootstrapServer } = require('../dist/src/serverless');

let cachedServer;

module.exports = async (req, res) => {
  if (!cachedServer) {
    cachedServer = await bootstrapServer();
  }
  return cachedServer(req, res);
};

if (require.main === module) {
  bootstrapServer().then((app) => {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`Furniture Business ERP API listening on port ${port}`);
    });
  });
}
