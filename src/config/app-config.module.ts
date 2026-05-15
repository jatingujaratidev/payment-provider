import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './app.config';
import databaseConfig from './database.config';
import jwtConfig from './jwt.config';
import throttlerConfig from './throttler.config';
import { validationSchema } from './env.validation';
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, throttlerConfig],
      validationSchema,
      validationOptions: { abortEarly: false, allowUnknown: true },
    }),
  ],
  exports: [ConfigModule],
})
export class AppConfigModule {}
