import express from 'express';

const app = express();
const port = Number(process.env.PORT ?? 8080);

app.get('/healthz', (_request, response) => {
  response.json({
    status: 'ok',
    service: '${{ values.name }}',
  });
});

app.get('/', (_request, response) => {
  response.json({
    name: '${{ values.name }}',
    owner: '${{ values.owner }}',
    description: '${{ values.description }}',
  });
});

app.listen(port, () => {
  console.log(`listening on ${port}`);
});
