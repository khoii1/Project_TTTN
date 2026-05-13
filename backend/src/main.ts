import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

const normalizeOrigin = (origin: string): string =>
  origin
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\/+$/, '');

const parseCorsOrigins = (value?: string): string[] =>
  value
    ? value
        .split(',')
        .map(normalizeOrigin)
        .filter(Boolean)
    : [];

const isLocalDevOrigin = (origin: string): boolean =>
  /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);

const isSwaggerEnabled = (): boolean => {
  const configuredValue = process.env.ENABLE_SWAGGER?.trim().toLowerCase();

  if (configuredValue) {
    return configuredValue === 'true';
  }

  return process.env.NODE_ENV !== 'production';
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  const configuredCorsOrigins = parseCorsOrigins(process.env.CORS_ORIGIN);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = normalizeOrigin(origin);

      if (configuredCorsOrigins.length > 0) {
        return callback(null, configuredCorsOrigins.includes(normalizedOrigin));
      }

      return callback(null, isLocalDevOrigin(normalizedOrigin));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  if (isSwaggerEnabled()) {
    // Swagger setup
    const config = new DocumentBuilder()
      .setTitle('CRM API Guide')
      .setDescription(
        [
          'Salesforce-style CRM backend API.',
          '',
          'Recommended flow:',
          '1. Auth: register or login',
          '2. Leads: create a lead with sample data',
          '3. Convert lead: create account + contact + opportunity',
          '4. Accounts / Contacts / Opportunities: continue the sales flow',
          '5. Tasks / Notes / Cases: manage follow-up and support',
        ].join('\n')
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        docExpansion: 'list',
        persistAuthorization: true,
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 2,
        displayRequestDuration: true,
      },
      customSiteTitle: 'CRM API Guide',
    });
  }

  const port = process.env.PORT || process.env.API_PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  if (isSwaggerEnabled()) {
    console.log(`Swagger documentation: http://localhost:${port}/api/docs`);
  } else {
    console.log('Swagger documentation is disabled');
  }
}

bootstrap();
