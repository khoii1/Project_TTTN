import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

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

  // Enable CORS
  app.enableCors();

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

  const port = process.env.API_PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
