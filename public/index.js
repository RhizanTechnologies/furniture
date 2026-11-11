// Vercel NestJS Serverless Entrypoint
const { NestFactory } = require('@nestjs/core');
const { bootstrapServer } = require('../apps/api/dist/src/serverless');

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
      console.log(`NestJS server listening on port ${port}`);
    });
  });
}
