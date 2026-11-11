const { bootstrapServer } = require('../apps/api/dist/src/serverless');

let cachedServer;

// Export for serverless function execution
module.exports = async (req, res) => {
  if (!cachedServer) {
    cachedServer = await bootstrapServer();
  }
  return cachedServer(req, res);
};

// Also support standalone server if executed directly by node
if (require.main === module) {
  bootstrapServer().then((app) => {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`Furniture Business ERP API listening on port ${port}`);
    });
  });
}
