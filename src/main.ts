import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppLoggerService } from './common/logging/logger.service';
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(AppLoggerService);
  app.useLogger(logger);
  const config = app.get(ConfigService);
  const appCfg = config.get<{
    port: number;
    nodeEnv: string;
  }>('app');
  const nodeEnv = appCfg?.nodeEnv ?? 'development';
  app.use(helmet());
  const allowedOrigins = (config.get<string>('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  if (nodeEnv !== 'production') {
    const swagger = new DocumentBuilder()
      .setTitle('Payment Provider API')
      .setDescription('PCI-aware payment provider reference implementation')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swagger);
    SwaggerModule.setup('api/docs', app, document);
  }
  const port = appCfg?.port ?? 3000;
  await app.listen(port, () => {
    console.log(`Server started on PORT:${port}...`);
  });
}
bootstrap().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
