import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { Card } from './card.entity';
import { CardsRepository } from './cards.repository';
import {
  encryptAes256Gcm,
  sha256KeyMaterial,
} from '../../common/utils/encryption.util';
import { isValidLuhn } from '../../common/utils/luhn.util';
import { detectCardBrand } from '../../common/utils/card-brand.util';
import { sanitizeString } from '../../common/utils/string-sanitize.util';
import { ErrorCodes } from '../../common/errors/error-codes';
import {
  CARDS_LIMIT_DEFAULT,
  CARDS_LIMIT_MAX,
  CARDS_PAGE_DEFAULT,
} from '../../common/constants/app.constants';
import { AppLoggerService } from '../../common/logging/logger.service';
function digitsOnly(pan: string): string {
  return pan.replace(/\D/g, '');
}
function isCardExpired(month: string, year: string, now: Date): boolean {
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  if (Number.isNaN(m) || Number.isNaN(y)) {
    return true;
  }
  const expEnd = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
  return now > expEnd;
}
@Injectable()
export class CardsService {
  constructor(
    private readonly cardsRepository: CardsRepository,
    private readonly config: ConfigService,
    private readonly logger: AppLoggerService,
  ) {}
  async addCard(
    userId: string,
    input: {
      cardholderName: string;
      cardNumber: string;
      expiryMonth: string;
      expiryYear: string;
    },
  ): Promise<Card> {
    const pan = digitsOnly(input.cardNumber);
    if (!isValidLuhn(pan)) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_CARD_NUMBER,
        message: 'Card number failed Luhn validation',
      });
    }
    const key = sha256KeyMaterial(
      this.config.getOrThrow<string>('CARD_ENCRYPTION_KEY'),
    );
    const encrypted = encryptAes256Gcm(key, pan);
    const token = randomBytes(32).toString('hex');
    const card = new Card();
    card.userId = userId;
    card.token = token;
    card.cardholderName = sanitizeString(input.cardholderName);
    card.lastFour = pan.slice(-4);
    card.cardBrand = detectCardBrand(pan);
    card.expiryMonth = input.expiryMonth.padStart(2, '0').slice(0, 2);
    card.expiryYear = input.expiryYear.slice(-4).padStart(4, '0');
    card.encryptedCardNumber = encrypted.ciphertext;
    card.encryptionIv = encrypted.iv;
    card.encryptionTag = encrypted.tag;
    card.isActive = true;
    const saved = await this.cardsRepository.save(card);
    this.logger.log('Card added', {
      eventType: 'CARD_ADDED',
      userId,
      metadata: { cardId: saved.id },
    });
    return saved;
  }
  async listCards(
    userId: string,
    page: number = CARDS_PAGE_DEFAULT,
    limit: number = CARDS_LIMIT_DEFAULT,
  ): Promise<{
    items: Card[];
    page: number;
    limit: number;
    total: number;
  }> {
    const safeLimit = Math.min(Math.max(limit, 1), CARDS_LIMIT_MAX);
    const safePage = Math.max(page, 1);
    const { items, total } = await this.cardsRepository.listForUser(
      userId,
      safePage,
      safeLimit,
    );
    return { items, page: safePage, limit: safeLimit, total };
  }
  async getOwnedCard(userId: string, cardId: string): Promise<Card> {
    const card = await this.cardsRepository.findOwnedByUser(userId, cardId);
    if (!card) {
      throw new NotFoundException({
        code: ErrorCodes.CARD_NOT_FOUND,
        message: 'Card not found',
      });
    }
    return card;
  }
  async softDelete(userId: string, cardId: string): Promise<void> {
    const card = await this.getOwnedCard(userId, cardId);
    if (!card.isActive) {
      return;
    }
    card.isActive = false;
    await this.cardsRepository.save(card);
    this.logger.log('Card deleted', {
      eventType: 'CARD_DELETED',
      userId,
      metadata: { cardId },
    });
  }
  assertCardPayable(card: Card, userId: string): void {
    if (card.userId !== userId) {
      throw new BadRequestException({
        code: ErrorCodes.CARD_NOT_OWNED_BY_USER,
        message: 'Card does not belong to the authenticated user',
      });
    }
    if (!card.isActive) {
      throw new BadRequestException({
        code: ErrorCodes.CARD_NOT_FOUND,
        message: 'Card inactive',
      });
    }
    if (isCardExpired(card.expiryMonth, card.expiryYear, new Date())) {
      throw new BadRequestException({
        code: ErrorCodes.CARD_EXPIRED,
        message: 'Card is expired',
      });
    }
  }
  async getActiveByTokenForUser(token: string, userId: string): Promise<Card> {
    const card = await this.cardsRepository.findActiveByToken(token);
    if (!card || card.userId !== userId) {
      throw new NotFoundException({
        code: ErrorCodes.CARD_NOT_FOUND,
        message: 'Card not found',
      });
    }
    return card;
  }
}
