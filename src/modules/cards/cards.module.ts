import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Card } from './card.entity';
import { CardsRepository } from './cards.repository';
import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';
@Module({
  imports: [TypeOrmModule.forFeature([Card])],
  controllers: [CardsController],
  providers: [CardsRepository, CardsService],
  exports: [CardsService, CardsRepository],
})
export class CardsModule {}
