import { registerAs } from '@nestjs/config';
export default registerAs('app', () => ({
  name: process.env.APP_NAME ?? 'payment-provider',
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  metricsApiKey: (process.env.METRICS_API_KEY ?? '').trim(),
}));
