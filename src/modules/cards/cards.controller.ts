import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CardsService } from './cards.service';
import { AddCardDto } from './dto/add-card.dto';
import { ListCardsQueryDto } from './dto/list-cards-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { Card } from './card.entity';
@ApiTags('Cards')
@ApiBearerAuth()
@Controller('cards')
@UseGuards(JwtAuthGuard)
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a tokenized card' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 400 })
  @ApiResponse({ status: 401 })
  @ApiResponse({ status: 422, description: 'Invalid card number' })
  @ApiResponse({ status: 429 })
  @ApiResponse({ status: 500 })
  async add(
    @Req()
    req: Request & {
      user: JwtPayload;
    },
    @Body()
    dto: AddCardDto,
  ): Promise<Record<string, unknown>> {
    const card = await this.cardsService.addCard(req.user.sub, {
      cardholderName: dto.cardholder_name,
      cardNumber: dto.card_number,
      expiryMonth: dto.expiry_month,
      expiryYear: dto.expiry_year,
    });
    return this.mapCard(card);
  }
  @Get()
  @ApiOperation({ summary: 'List cards for the authenticated user' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 401 })
  @ApiResponse({ status: 429 })
  @ApiResponse({ status: 500 })
  async list(
    @Req()
    req: Request & {
      user: JwtPayload;
    },
    @Query()
    query: ListCardsQueryDto,
  ): Promise<{
    cards: Record<string, unknown>[];
    __pagination: {
      page: number;
      limit: number;
      total: number;
    };
  }> {
    const result = await this.cardsService.listCards(
      req.user.sub,
      query.page,
      query.limit,
    );
    return {
      cards: result.items.map((c) => this.mapCard(c)),
      __pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    };
  }
  @Get(':id')
  @ApiOperation({ summary: 'Get a single card' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 401 })
  @ApiResponse({ status: 404 })
  @ApiResponse({ status: 429 })
  @ApiResponse({ status: 500 })
  async getOne(
    @Req()
    req: Request & {
      user: JwtPayload;
    },
    @Param('id', new ParseUUIDPipe({ version: '4' }))
    id: string,
  ): Promise<Record<string, unknown>> {
    const card = await this.cardsService.getOwnedCard(req.user.sub, id);
    return this.mapCard(card);
  }
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a card' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 401 })
  @ApiResponse({ status: 404 })
  @ApiResponse({ status: 429 })
  @ApiResponse({ status: 500 })
  async remove(
    @Req()
    req: Request & {
      user: JwtPayload;
    },
    @Param('id', new ParseUUIDPipe({ version: '4' }))
    id: string,
  ): Promise<void> {
    await this.cardsService.softDelete(req.user.sub, id);
  }
  private mapCard(card: Card): Record<string, unknown> {
    return {
      id: card.id,
      token: card.token,
      cardholder_name: card.cardholderName,
      last_four: card.lastFour,
      card_brand: card.cardBrand,
      expiry_month: card.expiryMonth,
      expiry_year: card.expiryYear,
      is_active: card.isActive,
      created_at: card.createdAt,
    };
  }
}
