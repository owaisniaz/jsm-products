import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import mongoose from 'mongoose';

const logger = new Logger('DatabaseModule');
mongoose.set('strictQuery', true);

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>(
          'MONGODB_URI'),
        connectionFactory: (connection) => {
          logger.log('Database connected successfully');
          return connection;
        },
      }),
    }),
  ],
})
export class DatabaseModule {}