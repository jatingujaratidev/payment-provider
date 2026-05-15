import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}
  async findByEmail(email: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('u')
      .where('LOWER(u.email) = LOWER(:email)', { email })
      .getOne();
  }
  async save(user: User): Promise<User> {
    return this.users.save(user);
  }
  async findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }
}
