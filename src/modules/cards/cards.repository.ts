import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Card } from './card.entity';
@Injectable()
export class CardsRepository {
  constructor(
    @InjectRepository(Card)
    private readonly cards: Repository<Card>,
  ) {}
  async save(card: Card): Promise<Card> {
    return this.cards.save(card);
  }
  async findActiveByToken(token: string): Promise<Card | null> {
    return this.cards.findOne({ where: { token, isActive: true } });
  }
  async findOwnedByUser(userId: string, cardId: string): Promise<Card | null> {
    return this.cards.findOne({ where: { id: cardId, userId } });
  }
  async listForUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{
    items: Card[];
    total: number;
  }> {
    const qb = this.cards
      .createQueryBuilder('c')
      .where('c.user_id = :userId', { userId })
      .orderBy('c.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }
}
